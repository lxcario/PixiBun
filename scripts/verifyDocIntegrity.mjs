/** Selected structural/source contracts and local links; not prose truth certification. */
import fs from 'node:fs';
import path from 'node:path';
import { ownedMarkdown, publishableProjectFiles, validateMarkdownLinks, sourceContracts, testInventory } from './docContracts.mjs';
const root = process.cwd();
const errors = [];
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const fail = message => errors.push(message);
try {
  const phases = [...read('TASKS.md').matchAll(/^## Phase ([\d.]+[a-z]?)/gm)].map(m => m[1]);
  if (!phases.length || new Set(phases).size !== phases.length) fail('TASKS.md phase headers missing or duplicated');
  const sections = [...read('ARCHITECTURE.md').matchAll(/^## (\d+)\.\s+/gm)].map(m => Number(m[1]));
  if (!sections.length || sections.some((n,i) => n !== i+1)) fail('ARCHITECTURE.md numbered sections are not monotonic');
  const historical = new Set(['src/lib/audio/lofiRadio.ts', 'src/lib/audio/tracks.ts', 'src/lib/audio/spectralFlux.ts', 'tests/audioOnsetDetection.test.ts', 'src/components/layout/inspector/VolumetricOpticsSection.tsx', 'tests/e2e/volumetricVisualProof.spec.ts', 'src/components/landing/PixelDitherCurtain.tsx', 'src/components/landing/AtelierDeskScene.tsx']);
  const paths = new Set([...read('CHANGELOG.md').matchAll(/`((?:src|tests)\/[^`]+)`/g)].map(m => m[1].trim()).filter(p => !p.endsWith('/')));
  let existing = 0, approvedHistory = 0;
  for (const file of paths) {
    if (fs.existsSync(path.join(root,file))) existing++;
    else if (historical.has(file)) approvedHistory++;
    else fail('CHANGELOG.md cites missing non-historical path: ' + file);
  }
  console.log('Changelog paths: ' + existing + ' existing, ' + approvedHistory + ' approved removed historical references.');
  if (read('CHANGELOG.md').includes('<500 lines')) fail('Obsolete viewport line-count phrase remains');
  const pkg = JSON.parse(read('package.json'));
  const version = read('CHANGELOG.md').match(/^##\s+\[v?(\d+\.\d+\.\d+)\]/m)?.[1];
  if (version !== pkg.version) fail('Package/changelog version mismatch');
  const docs = ownedMarkdown(root);
  const publishable = publishableProjectFiles(root);
  const archivedRoots = ['docs/research/evidence/', 'artifacts/', 'audit/'];
  const archivedReports = new Set(['LOGS.md', 'PIXIBUN_AUDIT_RESULTS+DEEP.md', 'PIXIBUN_AUDIT_RESULTS.md', 'PIXIBUN_DEEP_DIVE.md', 'PIXIBUN_UX_AUDIT.md', 'PIXIBUN_UX_CHANGELOG.md', 'PIXIBUN_UX_IMPLEMENTATION_PLAN.md']);
  let sourceBytes = 0;
  for (const file of publishable) {
    if (archivedRoots.some(folder => file.startsWith(folder)) || archivedReports.has(file)) fail('Local archive must not be published in the source checkout: ' + file);
    sourceBytes += fs.statSync(path.join(root, file)).size;
  }
  const sourceBudget = 40 * 1024 * 1024;
  if (sourceBytes > sourceBudget) fail('Source checkout exceeds the 40 MiB budget; archive generated evidence or review intentional assets before changing the budget.');
  console.log('Source checkout: ' + (sourceBytes / 1024 / 1024).toFixed(2) + ' MiB / 40 MiB budget, ' + publishable.length + ' publishable files.');
  const links = validateMarkdownLinks(root, docs, new Set(publishable));
  errors.push(...links.errors);
  console.log('Local links/headings: ' + links.checked + ' destinations across ' + docs.length + ' owned Markdown files.');
  for (const [file, actual] of [['docs/generated/test-inventory.json', testInventory(root)], ['docs/generated/source-contracts.json', sourceContracts(root)]]) {
    if (!fs.existsSync(file) || JSON.stringify(JSON.parse(read(file))) !== JSON.stringify(actual)) fail(file + ' is stale; run npm run docs:inventory');
  }
  console.log('Runner enumeration and selected tool/encoder/runtime contracts checked; enumeration is not a verdict.');
  if (/\| \*\*Audio Engine\*\*/.test(read('README.md'))) fail('README advertises removed audio engine');
  if (/N for Rivet|Space\+Drag for Pan|Z\/Ctrl\+Z for Undo/.test(read('SKILL.md'))) fail('Retired/incorrect shortcut instruction remains');
} catch (error) { fail(error.message); }
if (errors.length) { for (const error of errors) console.error(error); process.exitCode = 1; }
else console.log('Selected documentation checks passed. Narrative accuracy and qualification require review.');
