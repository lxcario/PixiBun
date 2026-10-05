import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const directory = 'docs/research/evidence/2026-10-05-audit-phase1';
async function walk(path) {
  const entries = await readdir(path, {withFileTypes:true});
  return (await Promise.all(entries.map(e => e.isDirectory() ? walk(`${path}/${e.name}`) : [`${path}/${e.name}`]))).flat();
}
const paths = [...(await walk('src')).filter(p => /\.(tsx?|css)$/.test(p)),
  'tests/artworkIdentity.test.tsx','tests/production/artworkIdentity.spec.ts',
  '.next/BUILD_ID','.next/build-manifest.json','.next/server/app/studio/page.js','.next/required-server-files.json'];
const inputs = await Promise.all(paths.map(async path => { const bytes = await readFile(path); return {path,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')}; }));
const before = JSON.parse(await readFile('docs/research/evidence/2026-10-05-deep-audit/source-inventory.json','utf8'));
const originals = new Map(before.files.map(file => [file.path,file.sha256]));
const source = inputs.filter(f => f.path.startsWith('src/'));
await writeFile(`${directory}/manifest.json`, JSON.stringify({ date:'2026-10-05',baseRevision:before.revision,scope:'Uncommitted phase 1; local evidence only',
  runtime:'Node 22.23.3',buildId:(await readFile('.next/BUILD_ID','utf8')).trim(),
  baselineComparison:{unchanged:source.filter(f=> originals.get(f.path)===f.sha256).length,changed:source.filter(f=> originals.has(f.path)&&originals.get(f.path)!==f.sha256).map(f=>f.path),added:source.filter(f=>!originals.has(f.path)).map(f=>f.path)},
  checks:{qualityGate:{passed:true,unitTests:1777,unitSuites:174,seconds:130.23},compiled:{passed:9,projects:['chromium','firefox','webkit'],port:3112,workers:1,retries:0},external:{plans:2,lint:'2/2 valid',registered:0,runs:0,status:'awaiting confirmation'}},inputs },null,2)+'\n');
console.log('Recorded phase 1 input/build hashes and scoped local verdicts.');
