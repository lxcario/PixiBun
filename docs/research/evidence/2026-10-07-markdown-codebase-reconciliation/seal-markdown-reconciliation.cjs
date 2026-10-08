const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
const target = 'docs/research/evidence/2026-10-07-markdown-codebase-reconciliation';
const sources = [
 'artifacts/pixibun-markdown-census.json',
 'artifacts/pixibun-markdown-reconciliation.json',
 'artifacts/pixibun-markdown-source-integrity.json',
 'artifacts/pixibun-markdown-prior-evidence-integrity.json',
 'artifacts/pixibun-markdown-reconciliation-docs.log',
 'artifacts/pixibun-markdown-reconciliation-diff.log',
 'artifacts/pixibun-markdown-reconciliation-docs-sandbox-failure.log',
 'artifacts/pixibun-markdown-reconciliation-diff-before.log',
 'artifacts/markdown-reconciliation.cjs',
 'artifacts/markdown-closure-integrity.cjs',
 'artifacts/seal-markdown-reconciliation.cjs'
];
if (process.argv.includes('--stage')) {
 if (fs.existsSync(target)) throw Error('New evidence directory already exists');
 fs.mkdirSync(target,{recursive:true});
 for(const source of sources.slice(0,4)) fs.copyFileSync(source,path.join(target,path.basename(source)));
 fs.writeFileSync(`${target}/manifest.json`,JSON.stringify({status:'unsealed pending final documentation checks'},null,2)+'\n');
 console.log('Prepared new documentation evidence directory.');
} else {
 const existing = JSON.parse(fs.readFileSync(`${target}/manifest.json`,'utf8'));
 if (!existing.status?.startsWith('unsealed')) throw Error('Refusing to overwrite sealed evidence');
 const files = sources.map(source => {
  const bytes = fs.readFileSync(source);
  const name = path.basename(source);
  fs.writeFileSync(path.join(target,name),bytes);
  return {path:name,source,bytes:bytes.length,sha256:hash(bytes)};
 });
 const integrity = JSON.parse(fs.readFileSync(sources[2],'utf8'));
 const prior = JSON.parse(fs.readFileSync(sources[3],'utf8'));
 const census = JSON.parse(fs.readFileSync(sources[1],'utf8'));
 const docsLog = fs.readFileSync(sources[4],'utf8').replace(/^\uFEFF/,'');
 const links = docsLog.match(/Local links\/headings: (\d+) destinations across (\d+) owned Markdown files/);
 if (!docsLog.includes('Selected documentation checks passed.') || !links) throw Error('Documentation check did not pass');
 if(integrity.changedInputs.length || integrity.changedBuildFiles.length || prior.archives.some(x=>x.changed.length)) throw Error('Integrity changes remain');
 const manifest = {recordedAt:new Date().toISOString(),status:'sealed',revision:census.baseRevision,dirtyWorkingTree:true,
  runtime:'Node 22.23.3',buildId:integrity.buildId,
  scope:census.scope,method:census.method,
  verdicts:{markdownFiles:census.count,localDestinations:Number(links[1]),ownedMarkdownFiles:Number(links[2]),docs:'passed',
    sourceInputsUnchanged:integrity.checkedInputs,buildFilesUnchanged:integrity.checkedBuildFiles,
    previousMotionEvidenceFilesUnchanged:prior.checkedFiles,
    codeAndBrowserRuns:'not repeated for documentation-only pass; preceding hardening scope retained',
    testsprite:'preceding hardening blocked; no new external run'},
  privacy:'Private/generated records inventoried by metadata only; no transcript content or signed service media included.',files};
 fs.writeFileSync(`${target}/manifest.json`,JSON.stringify(manifest,null,2)+'\n');
 console.log(JSON.stringify(manifest.verdicts,null,2));
}
