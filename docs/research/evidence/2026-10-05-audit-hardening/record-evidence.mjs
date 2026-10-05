import { readdir, readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const directory = 'docs/research/evidence/2026-10-05-audit-hardening';
const walk = async path => (await Promise.all((await readdir(path, { withFileTypes: true })).map(entry => entry.isDirectory() ? walk(`${path}/${entry.name}`) : [`${path}/${entry.name}`]))).flat();
const hash = async path => { const bytes = await readFile(path); return { path, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') }; };
const log = name => readFile(`${directory}/${name}`, 'utf8');
const terminal = async (name, total) => {
  const text = await log(name), passed = Number(text.match(/^\s*(\d+) passed \(/m)?.[1] ?? 0), skipped = Number(text.match(/^\s*(\d+) skipped\s*$/m)?.[1] ?? 0);
  if (!passed || passed + skipped !== total || /^\s*\d+ failed\s*$/m.test(text) || /\d+ did not run/.test(text) || /\d+ errors? (?:was|were) not a part of any test/.test(text)) throw new Error(`Incomplete browser verdict: ${name}`);
  return { passed, skipped, failed: 0, total, workers: 1, retries: 0, browsers: ['chromium', 'firefox', 'webkit'], secondsOrMinutes: text.match(/^\s*\d+ passed \(([^)]+)\)/m)?.[1] };
};
const gate = await log('gate-completed.log');
if (!gate.includes('ALL 5 QUALITY GATES PASSED') || !/Tests\s+1862 passed/.test(gate) || !/Test Files\s+181 passed/.test(gate)) throw new Error('Final gate is incomplete');
const compiled = await terminal('compiled-terminal.log', 213), cycleCompiled = await terminal('cycle-compiled-qualified.log', 12), cycleDevelopment = await terminal('cycle-development-terminal.log', 12);
for (const name of ['closing-types.log', 'closing-lint.log']) if ((await log(name)).trim()) throw new Error(`Closing diagnostics: ${name}`);
if (!(await log('closing-docs.log')).includes('Selected documentation checks passed.')) throw new Error('Final documentation verdict is missing');
const build = JSON.parse(await readFile(`${directory}/build-inputs.json`, 'utf8'));
for (const input of build.inputs) if ((await hash(input.path)).sha256 !== input.sha256) throw new Error(`Application/build changed after qualification: ${input.path}`);
const previous = JSON.parse(await readFile('docs/research/evidence/2026-10-05-audit-phase5/manifest.json', 'utf8'));
const originalSource = new Map(previous.inputs.filter(file => file.path.startsWith('src/')).map(file => [file.path, file.sha256]));
const currentSource = build.inputs.filter(file => file.path.startsWith('src/'));
const preserved = [];
for (let phase = 2; phase <= 5; phase++) {
  const path = `docs/research/evidence/2026-10-05-audit-phase${phase}/manifest.json`, manifest = JSON.parse(await readFile(path, 'utf8'));
  for (const artifact of manifest.artifacts) if ((await hash(artifact.path)).sha256 !== artifact.sha256) throw new Error(`Earlier evidence changed: ${artifact.path}`);
  const report = manifest.inputs.find(input => input.path === `docs/research/2026-10-05-audit-phase${phase}.md`);
  if (report && (await hash(report.path)).sha256 !== report.sha256) throw new Error(`Historical report changed: ${report.path}`);
  preserved.push({ phase, artifacts: manifest.artifacts.length, manifest: await hash(path), reportHashVerified: !!report });
}
const followupRoot = 'artifacts/playwright-hardening-followups', productionRoot = 'artifacts/playwright-production-3137', developmentRoot = 'artifacts/playwright-cycle-hardening';
for (const root of [followupRoot, developmentRoot]) {
  const outputs = (await walk(root)).filter(path => /\/fire-(3|5|8|15)fps\.(png|gif)$/.test(path));
  if (outputs.length !== 24 || outputs.filter(path => path.endsWith('.png')).length !== 12 || outputs.filter(path => path.endsWith('.gif')).length !== 12) {
    throw new Error(`Missing qualified palette downloads: ${root}`);
  }
}
await mkdir(`${directory}/qualified-browser-artifacts`, { recursive: true });
for (const root of [followupRoot, productionRoot, developmentRoot]) {
  for (const path of await walk(root)) {
    if (!/\.(png|gif|json|zip|md)$/.test(path)) continue;
    const destination = `${directory}/qualified-browser-artifacts/${root.split('/').at(-1)}/${path.slice(root.length + 1)}`;
    await mkdir(destination.slice(0, destination.lastIndexOf('/')), { recursive: true });
    await copyFile(path, destination);
  }
}
const extraInputs = [...await walk('tests'), 'vitest.config.mjs', 'playwright.production.config.ts', 'playwright.config.ts',
  '.github/workflows/deploy.yml', 'scripts/checkDeploymentCandidate.mjs', 'scripts/runQualityGate.mjs',
  'scripts/docContracts.mjs', 'docs/generated/test-inventory.json', 'docs/current-status.md', 'docs/README.md',
  'docs/contracts/storage.md', 'docs/contracts/exports.md', 'docs/contracts/rendering.md',
  'docs/guides/artwork-safety.md', 'docs/guides/artist-workspace.md', 'docs/guides/drawing-tools.md',
  'docs/research/2026-10-05-audit-hardening.md'];
const inputs = [...build.inputs, ...await Promise.all(extraInputs.map(hash))];
const measurements = {};
for (const path of (await walk(`${directory}/qualified-browser-artifacts`)).filter(path => /\/(after-|dates-).*\.json$/.test(path))) measurements[path] = JSON.parse(await readFile(path, 'utf8'));
const diagnostics = {};
for (const name of ['compiled-full.log', 'compiled-complete.log', 'compiled-final.log', 'compiled-core-final.log', 'compiled-qualified.log', 'cycle-compiled-final.log', 'cycle-development-final.log', 'cycle-development-qualified.log']) {
  const text = await log(name);
  diagnostics[name] = { recordedPasses: (text.match(/^\s*ok\s+\d+\s+\[(chromium|firefox|webkit)\]/gm) ?? []).length, recordedFailures: (text.match(/^\s*x\s+\d+\s+\[(chromium|firefox|webkit)\]/gm) ?? []).length, recordedSkips: (text.match(/^\s*-\s+\d+\s+\[(chromium|firefox|webkit)\]/gm) ?? []).length, terminal: /^\s*\d+ passed \(/m.test(text), finalApplicationQualification: false };
}
const artifacts = await Promise.all((await walk(directory)).filter(path => !path.endsWith('/manifest.json') && !path.endsWith('/record-evidence.log')).map(hash));
const manifest = { date: '2026-10-05', baseRevision: previous.baseRevision, scope: 'Uncommitted final local hardening on audit Phases 1–5', runtime: 'Node 22.23.3', buildId: build.buildId,
  phase5SourceComparison: { unchanged: currentSource.filter(file => originalSource.get(file.path) === file.sha256).length,
    changed: currentSource.filter(file => originalSource.has(file.path) && originalSource.get(file.path) !== file.sha256).map(file => file.path),
    added: currentSource.filter(file => !originalSource.has(file.path)).map(file => file.path), pointerSourceRestored: currentSource.find(file => file.path.endsWith('/useViewportPointerEvents.ts'))?.sha256 === originalSource.get('src/hooks/viewport/useViewportPointerEvents.ts') },
  preservedPriorEvidence: preserved,
  checks: { gate: { passed: true, tests: 1862, suites: 181, seconds: Number(gate.match(/ALL 5 QUALITY GATES PASSED SUCCESSFULLY \(([\d.]+)s\)/)?.[1]) },
    compiledFull: compiled, paletteCompiled: { ...cycleCompiled, parsedFiles: 24, apngDecodedFiles: 12, gifTimingCheckedFiles: 12, scope: 'Portable fixture in the compiled build; eight APNG/GIF outputs per browser' },
    paletteDevelopment: { ...cycleDevelopment, parsedFiles: 24, apngDecodedFiles: 12, gifTimingCheckedFiles: 12, scope: 'Existing local development server, development store fixture' },
    closing: { docs: true, types: true, lint: true }, diagnostics },
  externalVerification: { service: 'TestSprite', userChoice: 'Keep this phase local', createdCases: 0, updatedCases: 0, connectionsOpened: 0, serviceRuns: 0 },
  limitations: ['Controlled native file adapters do not qualify OS pickers or disk durability', 'Memory estimates exclude browser/GPU/codec internals and all retained caller JSON', 'Palette unrolling is synchronous after its initial yield', 'No complete development-editor inventory execution or physical-device/artist study', 'No source publication, remote CI, deployment or release approval'],
  measurements, inputs, artifacts };
await writeFile(`${directory}/manifest.json`, JSON.stringify(manifest, null, 2));
console.log(JSON.stringify({ buildId: manifest.buildId, checks: manifest.checks, phase5SourceComparison: manifest.phase5SourceComparison, preservedArtifacts: preserved.reduce((n, phase) => n + phase.artifacts, 0), artifactCount: artifacts.length }, null, 2));
