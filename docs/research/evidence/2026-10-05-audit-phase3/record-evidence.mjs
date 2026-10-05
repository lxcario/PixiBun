import { readdir, readFile, writeFile, access, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const directory = 'docs/research/evidence/2026-10-05-audit-phase3';
async function walk(path) {
  return (await Promise.all((await readdir(path, { withFileTypes: true })).map(e => e.isDirectory() ? walk(`${path}/${e.name}`) : [`${path}/${e.name}`]))).flat();
}
const retained = [
  ['workspaceConsistency-compi-c2cf8-eyboard-and-full-zoom-range-webkit', 'webkit-navigator'],
  ['workspaceConsistency-compi-ae77f-tivation-clears-its-preview-webkit', 'webkit-dither'],
];
for (const [source, name] of retained) for (const [file, extension] of [['test-failed-1.png', 'png'], ['error-context.md', 'md'], ['trace.zip', 'zip']]) {
  await copyFile(`artifacts/playwright-production-3116/${source}/${file}`, `${directory}/${name}-diagnostic.${extension}`);
}
const hash = async path => { const bytes = await readFile(path); return { path, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') }; };
const paths = [...(await walk('src')).filter(p => /\.(tsx?|css)$/.test(p)),
  ...(await walk('.next/static/chunks')).filter(p => /\.(js|css)$/.test(p)),
  ...(await walk('.next/server/chunks')).filter(p => /\.js$/.test(p)),
  'tests/workspaceConsistency.test.tsx', 'tests/production/workspaceConsistency.spec.ts',
  'tests/artworkIdentity.test.tsx', 'tests/production/artworkIdentity.spec.ts',
  'tests/strokeConsistency.test.tsx', 'tests/galleryRename.test.tsx', 'tests/production/strokeAndGallery.spec.ts',
  'scripts/docContracts.mjs', 'package.json', 'package-lock.json', 'next.config.ts', 'tsconfig.json', 'vitest.config.mjs', 'playwright.production.config.ts',
  '.next/BUILD_ID', '.next/build-manifest.json', '.next/server/app/studio/page.js', '.next/required-server-files.json',
  'docs/current-status.md', 'docs/README.md', 'docs/generated/test-inventory.json', 'docs/generated/source-contracts.json',
  'docs/contracts/shortcuts.md', 'docs/guides/artist-workspace.md', 'docs/guides/drawing-tools.md', 'docs/research/2026-10-05-audit-phase3.md'];
const inputs = await Promise.all(paths.map(hash));
const previous = JSON.parse(await readFile('docs/research/evidence/2026-10-05-audit-phase2/manifest.json', 'utf8'));
const originals = new Map(previous.inputs.filter(f => f.path.startsWith('src/')).map(f => [f.path, f.sha256]));
const source = inputs.filter(f => f.path.startsWith('src/'));
const gate = await readFile(`${directory}/quality-followup.log`, 'utf8');
const final = await readFile(`${directory}/compiled-final.log`, 'utf8');
const combined = await readFile(`${directory}/compiled-browser.log`, 'utf8');
if (!gate.includes('ALL 5 QUALITY GATES PASSED') || !/Tests\s+1809 passed/.test(gate) || !final.includes('21 passed') || !combined.includes('37 passed')) throw Error('Expected terminal local verdicts missing.');
let finalChecks = { status: 'pending' };
try {
  await access(`${directory}/final-checks.log`);
  const checks = await readFile(`${directory}/final-checks.log`, 'utf8');
  if (!checks.includes('ALL 4 QUALITY GATES PASSED') || !/Tests\s+1809 passed/.test(checks)) throw Error('Final four-stage gate is incomplete.');
  finalChecks = { status: 'passed', unitTests: 1809, unitSuites: 177, typecheck: true, lint: true, documentation: true };
} catch (error) { if (error.code !== 'ENOENT') throw error; }
const artifacts = await Promise.all((await walk(directory)).filter(path => !path.endsWith('/manifest.json')).map(hash));
await writeFile(`${directory}/manifest.json`, JSON.stringify({ date: '2026-10-05', baseRevision: previous.baseRevision,
  scope: 'Uncommitted Phase 3 on Phase 1/2; local checks only; external plans unregistered', runtime: 'Node 22.23.3',
  buildId: (await readFile('.next/BUILD_ID', 'utf8')).trim(),
  phase2Comparison: { unchanged: source.filter(f => originals.get(f.path) === f.sha256).length, changed: source.filter(f => originals.has(f.path) && originals.get(f.path) !== f.sha256).map(f => f.path), added: source.filter(f => !originals.has(f.path)).map(f => f.path) },
  checks: {
    initialGate: { passed: true, tests: 1807, suites: 177, seconds: 108.43, build: '2WhrSMhK4SQHxylZPrLzm' },
    hardenedGate: { passed: true, tests: 1809, suites: 177, seconds: 143.97, build: 'HrbYpy2cOp4e4Br5zM0eY' },
    initialChromium: { passed: 2, failed: 4, port: 3115, notes: 'Fixture selector/menu-path/CSS precision failures retained in log' },
    combined: { passed: 37, failed: 2, phase1And2Passed: 21, phase3Passed: 16, port: 3116, build: '2WhrSMhK4SQHxylZPrLzm' },
    webkitFollowup: { passed: 2, failed: 0, seconds: 24.4, port: 3117 },
    finalCompiled: { passed: 21, failed: 0, port: 3118, projects: ['chromium', 'firefox', 'webkit'], workers: 1, retries: 0 },
    finalChecks,
    external: { plans: 2, offlineLint: '2/2 valid', registered: 0, runs: 0, connectionsOpened: 0, status: 'awaiting confirmation' },
  }, inputs, artifacts }, null, 2) + '\n');
console.log('Recorded Phase 3 source/build/evidence hashes and explicit execution scopes.');
