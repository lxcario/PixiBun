import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const directory = 'docs/research/evidence/2026-10-05-audit-phase2';
async function walk(path) {
  const entries = await readdir(path, { withFileTypes: true });
  return (await Promise.all(entries.map(e => e.isDirectory() ? walk(`${path}/${e.name}`) : [`${path}/${e.name}`]))).flat();
}
const paths = [...(await walk('src')).filter(p => /\.(tsx?|css)$/.test(p)),
  'tests/strokeConsistency.test.tsx', 'tests/galleryRename.test.tsx', 'tests/production/strokeAndGallery.spec.ts',
  'tests/artworkIdentity.test.tsx', 'tests/production/artworkIdentity.spec.ts',
  'package.json', 'package-lock.json', 'next.config.ts', 'tsconfig.json', 'vitest.config.mjs', 'playwright.production.config.ts',
  '.next/BUILD_ID', '.next/build-manifest.json', '.next/server/app/studio/page.js', '.next/required-server-files.json'];
const inputs = await Promise.all(paths.map(async path => { const bytes = await readFile(path); return { path, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') }; }));
const previous = JSON.parse(await readFile('docs/research/evidence/2026-10-05-audit-phase1/manifest.json', 'utf8'));
const originals = new Map(previous.inputs.filter(file => file.path.startsWith('src/')).map(file => [file.path, file.sha256]));
const source = inputs.filter(file => file.path.startsWith('src/'));
const gate = await readFile(`${directory}/quality-gate.log`, 'utf8');
const first = await readFile(`${directory}/compiled-browser.log`, 'utf8');
const followup = await readFile(`${directory}/compiled-followup.log`, 'utf8');
if (!gate.includes('ALL 5 QUALITY GATES PASSED') || !/Tests\s+1797 passed/.test(gate) || !/20 passed/.test(first) || !/12 passed/.test(followup)) throw new Error('Expected terminal local verdicts are missing.');
const artifacts = await Promise.all((await walk(directory)).filter(path => !path.endsWith('/manifest.json')).map(async path => {
  const bytes = await readFile(path); return { path, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
}));
await writeFile(`${directory}/manifest.json`, JSON.stringify({ date: '2026-10-05', baseRevision: previous.baseRevision, scope: 'Uncommitted phase 2; local verification, external cases unregistered',
  runtime: 'Node 22.23.3', buildId: (await readFile('.next/BUILD_ID', 'utf8')).trim(),
  phase1Comparison: { unchanged: source.filter(f => originals.get(f.path) === f.sha256).length, changed: source.filter(f => originals.has(f.path) && originals.get(f.path) !== f.sha256).map(f => f.path), added: source.filter(f => !originals.has(f.path)).map(f => f.path) },
  checks: { qualityGate: { passed: true, unitTests: 1797, unitSuites: 176, seconds: 92.32 },
    initialCompiled: { passed: 20, failed: 1, phase1Passed: 9, phase2Passed: 11, phase2Failed: 1, port: 3113, secondsApproximate: 162 },
    phase2Followup: { passed: 12, failed: 0, port: 3114, projects: ['chromium', 'firefox', 'webkit'], workers: 1, retries: 0 },
    external: { plans: 2, lint: '2/2 valid', registered: 0, runs: 0, status: 'awaiting confirmation' } }, inputs, artifacts }, null, 2) + '\n');
console.log('Recorded Phase 2 inputs, build and retained evidence hashes.');
