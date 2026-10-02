const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const records = [];
for (const name of ['2026-10-02', '2026-10-02-remediation', ...[2, 3, 4, 5].map(n => `2026-10-02-feature-repairs-phase${n}`)]) {
  const folder = `docs/research/evidence/${name}`;
  const manifest = JSON.parse(fs.readFileSync(`${folder}/manifest.json`));
  for (const entry of manifest) {
    if (sha(fs.readFileSync(path.join(folder, entry.path))) !== entry.sha256) throw new Error(`Changed old evidence: ${folder}/${entry.path}`);
  }
  records.push({ directory: folder, unchangedFiles: manifest.length });
}
const tracked = cp.execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(p => p.endsWith('.png'));
for (const file of tracked) {
  if (sha(cp.execFileSync('git', ['show', `HEAD:${file}`], { maxBuffer: 64 * 1024 * 1024 })) !== sha(fs.readFileSync(file))) throw new Error(`Changed tracked image: ${file}`);
}
for (const folder of ['docs/assets/readme/2026-10-02', 'docs/assets/screenshots/2026-10-02-docs',
  ...['2026-10-02-feature-guide', ...[1, 2, 3, 4, 5].map(n => `2026-10-02-feature-repairs-phase${n}`), '2026-10-02-feature-repairs-phase5-welcome'].map(n => `docs/assets/screenshots/${n}`)]) {
  const metadata = JSON.parse(fs.readFileSync(`${folder}/run.json`));
  const captures = metadata.captures ?? metadata.images;
  for (const capture of captures) if (sha(fs.readFileSync(path.join(folder, capture.path ?? capture.file))) !== capture.sha256) throw new Error(`Changed capture: ${folder}`);
  records.push({ directory: folder, matchingCaptureHashes: captures.length });
}
const snapshot = JSON.parse(fs.readFileSync('artifacts/feature-repairs/phase6-source-final.json'));
for (const file of snapshot.files) if (sha(fs.readFileSync(file.path)) !== file.sha256) throw new Error(`Changed frozen source: ${file.path}`);
fs.writeFileSync('artifacts/feature-repairs/phase6-integrity.json', JSON.stringify({
  kind: 'hash-integrity-not-workflow-verdict', sourceFilesUnchanged: snapshot.files.length, trackedPngsUnchanged: tracked.length, records,
}, null, 2) + '\n');
console.log(`Verified ${snapshot.files.length} frozen source files, ${tracked.length} tracked PNGs, six previous sealed sets and nine capture checkpoints.`);
