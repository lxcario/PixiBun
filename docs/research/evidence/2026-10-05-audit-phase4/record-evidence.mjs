import { readdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const directory = 'docs/research/evidence/2026-10-05-audit-phase4';
const walk = async path => (await Promise.all((await readdir(path, { withFileTypes: true })).map(entry => entry.isDirectory() ? walk(`${path}/${entry.name}`) : [`${path}/${entry.name}`]))).flat();
const hash = async path => { const bytes = await readFile(path); return { path, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') }; };
for (const [port, prefix, browser, name] of [
  [3119, 'memoryPaths-compiled-timel', 'chromium', 'sandbox-launch'],
  [3122, 'memoryPaths-compiled-timel', 'chromium', 'baseline-unfitted'],
  [3123, 'memoryPaths-compiled-timel', 'chromium', 'baseline-extra-close'],
  [3124, 'memoryPaths-compiled-timel', 'chromium', 'combined-global-encoder-count'],
  [3124, 'memoryPaths-compiled-timel', 'webkit', 'combined-png-representation'],
  [3124, 'memoryPaths-compiled-small', 'webkit', 'webkit-preview-rounding'],
  [3125, 'memoryPaths-compiled-timel', 'webkit', 'webkit-import-reference'],
  [3126, 'memoryPaths-compiled-timel', 'webkit', 'webkit-hardcoded-color'],
]) {
  const root = `artifacts/playwright-production-${port}`;
  const folder = (await readdir(root)).find(path => path.startsWith(prefix) && path.endsWith(browser));
  if (!folder) throw new Error(`Missing retained diagnostic ${name}`);
  for (const [file, extension] of [['test-failed-1.png', 'png'], ['error-context.md', 'md'], ['trace.zip', 'zip']]) {
    try { await copyFile(`${root}/${folder}/${file}`, `${directory}/${name}.${extension}`); }
    catch (error) { if (error.code !== 'ENOENT' || file === 'error-context.md') throw error; }
  }
}
const paths = [...(await walk('src')).filter(path => /\.(tsx?|css)$/.test(path)),
  ...(await walk('.next/static/chunks')).filter(path => /\.(js|css)$/.test(path)),
  ...(await walk('.next/server/chunks')).filter(path => /\.js$/.test(path)),
  'tests/memoryPaths.test.tsx', 'tests/production/memoryPaths.spec.ts', 'tests/components/ExportModal.test.tsx',
  'tests/artworkIdentity.test.tsx', 'tests/production/artworkIdentity.spec.ts',
  'tests/strokeConsistency.test.tsx', 'tests/galleryRename.test.tsx', 'tests/production/strokeAndGallery.spec.ts',
  'package.json', 'package-lock.json', 'next.config.ts', 'tsconfig.json', 'vitest.config.mjs', 'playwright.production.config.ts',
  '.next/BUILD_ID', '.next/build-manifest.json', '.next/server/app/studio/page.js', '.next/required-server-files.json',
  'docs/current-status.md', 'docs/README.md', 'docs/generated/test-inventory.json', 'docs/generated/source-contracts.json',
  'docs/contracts/rendering.md', 'docs/contracts/storage.md', 'docs/contracts/exports.md', 'docs/research/2026-10-05-audit-phase4.md'];
const inputs = await Promise.all(paths.map(hash));
const previous = JSON.parse(await readFile('docs/research/evidence/2026-10-05-audit-phase3/manifest.json', 'utf8'));
const originals = new Map(previous.inputs.filter(file => file.path.startsWith('src/')).map(file => [file.path, file.sha256]));
const source = inputs.filter(file => file.path.startsWith('src/'));
const gate = await readFile(`${directory}/quality-followup.log`, 'utf8');
const compiled = await readFile(`${directory}/compiled-complete.log`, 'utf8');
const finalChecks = await readFile(`${directory}/final-checks.log`, 'utf8');
const lint = await readFile(`${directory}/plan-lint.log`, 'utf8');
if (!gate.includes('ALL 5 QUALITY GATES PASSED') || !/Tests\s+1819 passed/.test(gate) || !compiled.includes('30 passed') || !finalChecks.includes('Phase 4 closing checks passed') || !lint.includes('1/1 valid')) throw new Error('Terminal local evidence is incomplete');
const measurements = {};
for (const name of ['baseline-chromium', 'combined-after-chromium', 'after-chromium', 'after-firefox', 'after-webkit']) measurements[name] = JSON.parse(await readFile(`${directory}/${name}.json`, 'utf8'));
const artifacts = await Promise.all((await walk(directory)).filter(path => !path.endsWith('/manifest.json')).map(hash));
await writeFile(`${directory}/manifest.json`, JSON.stringify({ date: '2026-10-05', baseRevision: previous.baseRevision,
  scope: 'Uncommitted Phase 4 on Phases 1–3; local checks only; new external plan unregistered', runtime: 'Node 22.23.3',
  buildId: (await readFile('.next/BUILD_ID', 'utf8')).trim(),
  phase3Comparison: { unchanged: source.filter(file => originals.get(file.path) === file.sha256).length,
    changed: source.filter(file => originals.has(file.path) && originals.get(file.path) !== file.sha256).map(file => file.path),
    added: source.filter(file => !originals.has(file.path)).map(file => file.path) },
  checks: { initialGate: { passed: true, tests: 1819, suites: 178, seconds: 107.71, buildId: 'A1QZlZZgNtS4vk97e1ZbA' },
    nativePreviewGate: { passed: true, tests: 1819, suites: 178, seconds: 80.84, buildId: 'tIMHMeMaTtlXiNuuXWfFE' },
    initialCompiled: { passed: 24, failed: 3, previousPhaseRegressionsPassed: 21, port: 3124 },
    previewFollowup: { passed: 5, failed: 1, port: 3125 }, expandedFollowup: { passed: 8, failed: 1, gifCancellationPassed: 3, port: 3126 },
    finalCompiled: { passed: 30, failed: 0, phase4: 9, previousPhaseRegressions: 21, port: 3127, workers: 1, retries: 0, browsers: ['chromium', 'firefox', 'webkit'] },
    finalChecks: { documentation: true, types: true, lint: true },
    external: { existingCases: 17, drafts: 1, offlineLint: '1/1 valid', registered: 0, runs: 0, connectionsOpened: 0, status: 'awaiting confirmation' } },
  qualification: { physicalRamMeasured: false, gpuMemoryMeasured: false, durationSamples: 'single runner-observed timings; not percentile latency', encoderLimit: 'two per preparation job, not globally' },
  measurements, inputs, artifacts }, null, 2) + '\n');
console.log('Recorded final Phase 4 source/build hashes, measurements and retained diagnostics.');
