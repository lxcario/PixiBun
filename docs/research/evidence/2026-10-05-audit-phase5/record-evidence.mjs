import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const directory = 'docs/research/evidence/2026-10-05-audit-phase5';
const walk = async path => (await Promise.all((await readdir(path, { withFileTypes: true })).map(entry => entry.isDirectory() ? walk(`${path}/${entry.name}`) : [`${path}/${entry.name}`]))).flat();
const hash = async path => { const bytes = await readFile(path); return { path, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') }; };
const previous = JSON.parse(await readFile('docs/research/evidence/2026-10-05-audit-phase4/manifest.json', 'utf8'));
const originals = new Map(previous.inputs.filter(file => file.path.startsWith('src/')).map(file => [file.path, file.sha256]));
const paths = [...(await walk('src')).filter(path => /\.(tsx?|css)$/.test(path)),
  ...(await walk('.next/static/chunks')).filter(path => /\.(js|css)$/.test(path)),
  ...(await walk('.next/server/chunks')).filter(path => /\.js$/.test(path)),
  '.github/workflows/deploy.yml', 'scripts/checkDeploymentCandidate.mjs',
  'tests/projectTimestamps.test.tsx', 'tests/coDrawClipboard.test.tsx', 'tests/deploymentTrust.test.ts',
  'tests/galleryRename.test.tsx', 'tests/auditPersistence.test.ts', 'tests/production/projectDatesAndClipboard.spec.ts',
  'tests/production/artworkIdentity.spec.ts', 'tests/production/strokeAndGallery.spec.ts',
  'package.json', 'package-lock.json', 'next.config.ts', 'tsconfig.json', 'vitest.config.mjs', 'playwright.production.config.ts',
  '.next/BUILD_ID', '.next/build-manifest.json', '.next/server/app/studio/page.js', '.next/required-server-files.json',
  'docs/current-status.md', 'docs/README.md', 'docs/generated/test-inventory.json', 'docs/contracts/storage.md',
  'docs/contracts/security-boundaries.md', 'docs/guides/deployment.md', 'docs/research/2026-10-05-audit-phase5.md'];
const inputs = await Promise.all(paths.map(hash)), source = inputs.filter(file => file.path.startsWith('src/'));
for (const file of previous.artifacts) if ((await hash(file.path)).sha256 !== file.sha256) throw new Error(`Earlier evidence changed: ${file.path}`);
const gate = await readFile(`${directory}/gate.log`, 'utf8'), compiled = await readFile(`${directory}/compiled-final.log`, 'utf8');
const deployment = await readFile(`${directory}/deployment-followup.log`, 'utf8');
const docs = await readFile(`${directory}/closing-docs.log`, 'utf8');
if (!gate.includes('ALL 5 QUALITY GATES PASSED') || !/Tests\s+1845 passed/.test(gate) || !compiled.includes('29 passed') || !compiled.includes('1 skipped') || !/Tests\s+31 passed/.test(deployment) || !docs.includes('Selected documentation checks passed.')) throw new Error('Terminal evidence is incomplete');
for (const file of ['closing-types.log', 'closing-lint.log']) if ((await readFile(`${directory}/${file}`, 'utf8')).trim()) throw new Error(`Closing check contains diagnostics: ${file}`);
for (const file of ['backup-plan-lint.log', 'clipboard-plan-lint.log']) if (!(await readFile(`${directory}/${file}`, 'utf8')).includes('1/1 valid')) throw new Error(`Invalid review plan: ${file}`);
const measurements = {};
for (const path of (await walk(directory)).filter(path => /\/dates-.*\.json$/.test(path))) measurements[path.split('/').at(-1)] = JSON.parse(await readFile(path, 'utf8'));
const artifacts = await Promise.all((await walk(directory)).filter(path => !path.endsWith('/manifest.json')).map(hash));
const manifest = { date: '2026-10-05', baseRevision: previous.baseRevision,
  scope: 'Uncommitted Phase 5 on Phases 1–4; external verification pending review', runtime: 'Node 22.23.3',
  buildId: (await readFile('.next/BUILD_ID', 'utf8')).trim(),
  phase4Comparison: { unchanged: source.filter(file => originals.get(file.path) === file.sha256).length,
    changed: source.filter(file => originals.has(file.path) && originals.get(file.path) !== file.sha256).map(file => file.path),
    added: source.filter(file => !originals.has(file.path)).map(file => file.path), preservedEvidenceArtifacts: previous.artifacts.length },
  checks: { initialFocused: { passed: 47, failed: 1, cause: 'Duplicate record treated as an ID in test fixture' },
    correctedFocused: { passed: 74, suites: 5 }, gate: { passed: true, tests: 1845, suites: 180, seconds: 65.33 },
    finalQueueFollowup: { passed: 31, suites: 1, applicationBuildUnchanged: true },
    initialCompiled: { interrupted: true, recordedPasses: 3, recordedFailures: 1, cause: 'Native file picker left enabled in download fixture', port: 3128 },
    finalCompiled: { passed: 29, skipped: 1, failed: 0, phase5Passed: 8, previousPhaseRegressionsPassed: 21,
      secondsApproximate: 180, port: 3129, workers: 1, retries: 0, browsers: ['chromium', 'firefox', 'webkit'], skip: 'Windows WebKit runtime lacks WebRTC invite generation' },
    closing: { docs: true, types: true, lint: true }, offlineReviewPlans: { passed: 2, externalRuns: 0 } },
  externalVerification: { existingBackupCase: 'fb41a04b-2a0c-4340-9cd6-dea694f0c348', existingCasesInspected: 17,
    pending: ['Existing backup plan extension', 'New clipboard plan', 'Temporary loopback connection and execution'], created: 0, updated: 0, connectionsOpened: 0, runs: 0 },
  measurements, inputs, artifacts };
await writeFile(`${directory}/manifest.json`, JSON.stringify(manifest, null, 2));
console.log(JSON.stringify({ buildId: manifest.buildId, phase4Comparison: manifest.phase4Comparison, finalCompiled: manifest.checks.finalCompiled }, null, 2));
