import { spawn, spawnSync } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildFingerprint, inputFingerprint } from './fingerprints.mjs';
import { artistOptions } from './artistOptions.mjs';
const workspace = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { mode, workflow, copy, flip, rotate, browserArgs } = artistOptions(process.argv.slice(2));
const root = path.join(workspace, `artifacts/nibbli/${workflow}-runs`, randomUUID());
if (Number(process.versions.node.split('.')[0]) !== 22 || !process.env.npm_execpath) throw new Error('Use npm run nibbli:artist with Node 22');
if (spawnSync('git', ['check-ignore', '--quiet', '--no-index', path.relative(workspace, root)], { cwd: workspace }).status) throw new Error('Artist evidence must be ignored');
await mkdir(root, { recursive: true });
async function record(outcome) {
  await writeFile(path.join(root, 'outcome.json'), JSON.stringify(outcome, null, 2), { flag: 'wx' });
  await appendFile(path.join(workspace, 'artifacts/nibbli/experience-index.jsonl'), JSON.stringify({ time: new Date().toISOString(), run: path.relative(workspace, root).replaceAll('\\', '/'), ...outcome, mode, workflow, modelTraining: false }) + '\n');
}
async function execute(args, logName, extraEnv = {}) {
  const log = createWriteStream(path.join(root, logName), { flags: 'wx' });
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { cwd: workspace, env: { ...process.env, ...extraEnv }, stdio: ['ignore', 'pipe', 'pipe'] });
    log.on('error', error => { child.kill(); reject(error); });
    child.stdout.on('data', bytes => { process.stdout.write(bytes); log.write(bytes); }); child.stderr.on('data', bytes => { process.stderr.write(bytes); log.write(bytes); });
    child.on('error', error => { log.end(); reject(error); }); child.on('close', (code, signal) => log.end(() => resolve({ code, signal })));
  });
}
const before = await inputFingerprint(workspace);
await writeFile(path.join(root, 'inputs-before.json'), JSON.stringify(before, null, 2), { flag: 'wx' });
await writeFile(path.join(root, 'run-start.json'), JSON.stringify({ time: new Date().toISOString(), mode, workflow, copy, flip, rotate, browserArgs, maxCorrections: 3, maxUsd: 0, modelConnected: false }), { flag: 'wx' });
console.log(`Nibbli ${workflow} evidence: ${root}`);
const built = await execute([process.env.npm_execpath, 'run', 'build'], 'build.log');
if (built.code) { await record({ verdict: 'failed', stage: 'build', ...built }); process.exit(1); }
const compiled = await buildFingerprint(workspace), afterBuild = await inputFingerprint(workspace);
await writeFile(path.join(root, 'build-before.json'), JSON.stringify(compiled, null, 2), { flag: 'wx' });
if (before.sha256 !== afterBuild.sha256) { await record({ verdict: 'inconclusive', reason: 'Source changed during build' }); process.exit(1); }
await writeFile(path.join(root, 'candidate.json'), JSON.stringify({ inputSha256: before.sha256, buildId: compiled.buildId, buildSha256: compiled.sha256, runtime: process.version, mode,
  revision: spawnSync('git', ['rev-parse', 'HEAD'], { cwd: workspace, encoding: 'utf8' }).stdout.trim(), scope: 'Local Artist tooling; mock and conversation are not autonomous model qualification.' }, null, 2), { flag: 'wx' });
console.log(`Conversation inbox: ${path.join(root, 'inbox')} (used only in --conversation mode)`);
const result = await execute([path.join(workspace, 'node_modules/@playwright/test/cli.js'), 'test', '--config', `playwright.${workflow}.config.ts`, ...browserArgs], 'browser.log', { NIBBLI_ARTIST_ROOT: root, NIBBLI_ARTIST_MODE: mode });
const after = await inputFingerprint(workspace), compiledAfter = await buildFingerprint(workspace);
await writeFile(path.join(root, 'inputs-after.json'), JSON.stringify(after, null, 2), { flag: 'wx' });
await writeFile(path.join(root, 'build-after.json'), JSON.stringify(compiledAfter, null, 2), { flag: 'wx' });
const unchanged = before.sha256 === after.sha256 && compiled.sha256 === compiledAfter.sha256;
const results = JSON.parse(await readFile(path.join(root, 'browser-results.json'))), stats = results.stats;
const complete = stats.expected > 0 && !stats.skipped && !stats.flaky && !stats.unexpected;
const verdict = !unchanged ? 'inconclusive' : result.code === 0 && complete ? 'passed' : 'failed';
await record({ verdict, unchanged, mode, stats, ...result, inputSha256: before.sha256, buildId: compiled.buildId, buildSha256: compiled.sha256 });
console.log(`${workflow} ${verdict}: ${root}`); process.exit(verdict === 'passed' ? 0 : 1);
