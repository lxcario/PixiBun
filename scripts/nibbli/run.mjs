import { spawn, spawnSync } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { appendFile, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const workspace = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const root = path.join(workspace, 'artifacts/nibbli/runs', randomUUID());
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--headed') continue;
  if (/^--(?:project|grep)=.+/.test(args[i])) continue;
  if (['--project', '--grep'].includes(args[i]) && args[i + 1] && !args[i + 1].startsWith('--')) { i++; continue; }
  throw new Error('Nibbli accepts only --project, --grep and --headed. Expectations, retry policy and snapshots cannot be weakened by its runner.');
}
await mkdir(root, { recursive: true });
const npmCli = process.env.npm_execpath;
if (!npmCli || Number(process.versions.node.split('.')[0]) !== 22) throw new Error('Run npm run nibbli:test using the repository\'s Node 22 runtime.');
const ignored = spawnSync('git', ['check-ignore', '--quiet', '--no-index', path.relative(workspace, root)], { cwd: workspace });
if (ignored.status !== 0) throw new Error('Nibbli evidence must remain ignored by Git.');
await writeFile(path.join(root, 'run-start.json'), JSON.stringify({ startedAt: new Date().toISOString(), args, scope: 'Nibbli developer tooling' }, null, 2));
async function recordOutcome(outcome) {
  await writeFile(path.join(root, 'outcome.json'), JSON.stringify(outcome, null, 2), { flag: 'wx' });
  await appendFile(path.join(workspace, 'artifacts/nibbli/experience-index.jsonl'), JSON.stringify({
    time: new Date().toISOString(), run: path.relative(workspace, root).replaceAll('\\', '/'),
    ...outcome, strategyStatus: 'candidate-needs-review', modelTraining: false,
  }) + '\n');
}

// Keep compilation/server/test diagnostics in the same immutable run directory.
async function execute(arguments_, logName, extraEnv = {}) {
  const log = createWriteStream(path.join(root, logName), { flags: 'wx' });
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, arguments_, { cwd: workspace,
      stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, ...extraEnv } });
    log.on('error', error => { child.kill(); reject(error); });
    child.stdout.on('data', bytes => { process.stdout.write(bytes); log.write(bytes); });
    child.stderr.on('data', bytes => { process.stderr.write(bytes); log.write(bytes); });
    child.on('error', error => { log.end(); reject(error); });
    child.on('close', (status, signal) => log.end(() => resolve({ status, signal })));
  });
}

async function inputFingerprint() {
  const inventory = spawnSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: workspace, encoding: 'utf8' });
  if (inventory.status !== 0) throw new Error('Cannot identify candidate inputs.');
  const files = [...new Set(inventory.stdout.split('\0').filter(name => /^(src\/|public\/|tests\/|scripts\/|docs\/guides\/nibbli\.md$|.*\.config\.(?:ts|mjs)$|package(?:-lock)?\.json$|tsconfig\.json$|\.nvmrc$)/.test(name)))].sort();
  const entries = [];
  for (const file of files) {
    try {
      const bytes = await readFile(path.join(workspace, file));
      entries.push({ file, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
    } catch (error) { if (error.code !== 'ENOENT') throw error; entries.push({ file, deleted: true }); }
  }
  return { sha256: createHash('sha256').update(JSON.stringify(entries)).digest('hex'), entries };
}

async function buildFingerprint() {
  const entries = [];
  async function visit(directory) {
    for (const item of (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      const target = path.join(directory, item.name);
      if (item.isSymbolicLink()) throw new Error('Unexpected link in compiled build.');
      if (item.isDirectory()) await visit(target);
      else if (item.isFile()) {
        const bytes = await readFile(target);
        entries.push({ file: path.relative(workspace, target).replaceAll('\\', '/'), bytes: bytes.length,
          sha256: createHash('sha256').update(bytes).digest('hex') });
      }
    }
  }
  const buildId = (await readFile(path.join(workspace, '.next/BUILD_ID'), 'utf8')).trim();
  await visit(path.join(workspace, '.next/server'));
  await visit(path.join(workspace, '.next/static'));
  return { buildId, sha256: createHash('sha256').update(JSON.stringify(entries)).digest('hex'), entries };
}

const before = await inputFingerprint();
const revision = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: workspace, encoding: 'utf8' }).stdout.trim();
const dirty = spawnSync('git', ['status', '--porcelain'], { cwd: workspace, encoding: 'utf8' }).stdout;
await writeFile(path.join(root, 'inputs-before.json'), JSON.stringify(before, null, 2));
console.log(`Nibbli evidence: ${root}`);
const build = await execute([npmCli, 'run', 'build'], 'build.log');
if (build.status !== 0) {
  await recordOutcome({ verdict: 'failed', stage: 'build', exitCode: build.status });
  process.exit(build.status ?? 1);
}
const afterBuild = await inputFingerprint();
const compiled = await buildFingerprint();
await writeFile(path.join(root, 'inputs-after-build.json'), JSON.stringify(afterBuild, null, 2));
await writeFile(path.join(root, 'build-before.json'), JSON.stringify(compiled, null, 2));
if (before.sha256 !== afterBuild.sha256) {
  await recordOutcome({ verdict: 'inconclusive', reason: 'Candidate inputs changed during compilation.' });
  process.exit(1);
}
await writeFile(path.join(root, 'candidate.json'), JSON.stringify({ revision, dirty, inputSha256: before.sha256,
  buildId: compiled.buildId, buildSha256: compiled.sha256, runtime: process.version,
  projectExportProfile: 'Browser-download fallback with save-picker capability disabled; native OS picker unqualified.',
  scope: 'Local Nibbli journeys; no release or physical-device qualification.' }, null, 2));
const result = await execute([path.join(workspace, 'node_modules/@playwright/test/cli.js'),
  'test', '--config', 'playwright.nibbli.config.ts', ...args], 'browser.log', { NIBBLI_RUN_ROOT: root });
const after = await inputFingerprint();
const compiledAfter = await buildFingerprint();
await writeFile(path.join(root, 'inputs-after.json'), JSON.stringify(after, null, 2));
await writeFile(path.join(root, 'build-after.json'), JSON.stringify(compiledAfter, null, 2));
const unchanged = before.sha256 === after.sha256 && compiled.sha256 === compiledAfter.sha256 && compiled.buildId === compiledAfter.buildId;
const results = JSON.parse(await readFile(path.join(root, 'browser-results.json'), 'utf8'));
const complete = results.stats.expected + results.stats.unexpected > 0 && !results.stats.skipped && !results.stats.flaky;
const verdict = !unchanged || !complete ? 'inconclusive' : result.status === 0 ? 'passed' : 'failed';
await recordOutcome({ verdict, exitCode: result.status, unchanged, stats: results.stats,
  inputSha256: before.sha256, buildSha256: compiled.sha256, buildId: compiled.buildId,
  reason: !unchanged ? 'Source or compiled build changed; pixel checks do not qualify a frozen candidate.'
    : !complete ? 'No completed coverage, or skipped/flaky cases require investigation.' : undefined });
console.log(`Nibbli ${verdict}. Retained evidence: ${root}`);
process.exit(verdict === 'passed' ? 0 : 1);
