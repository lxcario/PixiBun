const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = process.cwd();
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const read = file => JSON.parse(fs.readFileSync(file,'utf8'));
const snapshot = read('artifacts/piximotion-hardening-compiled-inputs-final.json');
const compare = entries => Object.entries(entries).map(([file,expected]) => {
  const exists = fs.existsSync(file);
  const actual = exists ? hash(fs.readFileSync(file)) : null;
  return {path:file, expected, actual, unchanged:actual===expected};
});
const inputs = compare(snapshot.files);
const buildFiles = compare(snapshot.buildFiles);
const sourceIntegrity = {checkedAt:new Date().toISOString(), checkedInputs:inputs.length,
  changedInputs:inputs.filter(x=>!x.unchanged), checkedBuildFiles:buildFiles.length,
  changedBuildFiles:buildFiles.filter(x=>!x.unchanged), buildId:fs.readFileSync('.next/BUILD_ID','utf8').trim()};
const archives = [
  '2026-10-06-piximotion-foundations', '2026-10-06-piximotion-readiness',
  '2026-10-07-piximotion-phase4', '2026-10-07-piximotion-phase5',
  '2026-10-07-piximotion-cross-phase-hardening'
].map(name => {
  const archive = `docs/research/evidence/${name}`;
  const manifest = read(`${archive}/manifest.json`);
  const files = (manifest.files || manifest.artifacts).map(entry => {
    const normalizedPath = entry.path.replaceAll('\\','/');
    const file = normalizedPath.startsWith(archive+'/') ? path.resolve(normalizedPath) : path.resolve(archive,normalizedPath);
    if (!file.startsWith(path.resolve(archive)+path.sep)) throw Error('Archive path escape');
    const actual = fs.existsSync(file) ? hash(fs.readFileSync(file)) : null;
    return {path:entry.path, expected:entry.sha256, actual, unchanged:actual===entry.sha256};
  });
  return {archive, checked:files.length, changed:files.filter(x=>!x.unchanged),
    manifestSha256:hash(fs.readFileSync(`${archive}/manifest.json`))};
});
fs.writeFileSync('artifacts/pixibun-markdown-source-integrity.json',JSON.stringify(sourceIntegrity,null,2)+'\n');
fs.writeFileSync('artifacts/pixibun-markdown-prior-evidence-integrity.json',JSON.stringify({checkedAt:new Date().toISOString(),checkedFiles:archives.reduce((n,x)=>n+x.checked,0),archives},null,2)+'\n');
console.log(JSON.stringify({sourceIntegrity,archives},null,2));
if (sourceIntegrity.changedInputs.length || sourceIntegrity.changedBuildFiles.length || archives.some(x=>x.changed.length)) process.exitCode=1;
