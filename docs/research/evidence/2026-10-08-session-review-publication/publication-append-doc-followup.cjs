const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const root = 'docs/research/evidence/2026-10-08-session-review-publication';
const digest = b => crypto.createHash('sha256').update(b).digest('hex');
const read = p => JSON.parse(fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, ''));
const m = read(path.join(root, 'manifest.json'));
if (m.status !== 'pending-final-documentation-check') throw Error('Only the pending archive may receive follow-up evidence');
for (const f of m.files) if (digest(fs.readFileSync(path.join(root, f.path))) !== f.sha256) throw Error('Original capture changed: ' + f.path);
const prior = read('artifacts/publication-complete-fingerprint.json'), final = read('artifacts/publication-docs-fingerprint.json');
const a = new Map([...prior.files, ...prior.build].map(f => [f.path, f.sha256])), b = new Map([...final.files, ...final.build].map(f => [f.path, f.sha256]));
const delta = { recordedAt: new Date().toISOString(), changed: [...a.keys()].filter(p => b.get(p) !== a.get(p)), added: [...b.keys()].filter(p => !a.has(p)), removed: [...a.keys()].filter(p => !b.has(p)), buildId: final.buildId, sourceInputs: final.files.length, buildFiles: final.build.length };
if (delta.changed.join() !== 'scripts/docContracts.mjs' || delta.added.length || delta.removed.length) throw Error('Unexpected documentation follow-up delta');
fs.writeFileSync('artifacts/publication-doc-tooling-delta.json', JSON.stringify(delta, null, 2) + '\n');
for (const name of ['publication-docs-before-buffer-fix.log', 'publication-doc-buffer-unit.log', 'publication-doc-buffer-lint.log', 'publication-docs-fingerprint.json', 'publication-docs-integrity.json', 'publication-doc-tooling-delta.json', 'publication-final-markdown-census.json', 'publication-append-doc-followup.cjs']) {
  const source = 'artifacts/' + name, destination = path.join(root, name);
  if (fs.existsSync(destination)) throw Error('Refusing to replace archive entry: ' + name);
  const bytes = fs.readFileSync(source); fs.writeFileSync(destination, bytes);
  m.files.push({ path: name, source, bytes: bytes.length, sha256: digest(bytes) });
}
m.finalSourceFingerprint = 'publication-docs-fingerprint.json';
m.documentationToolingFollowup = { delta: 'publication-doc-tooling-delta.json', reason: 'Expanded retained file list exceeded default buffer; bounded 20 MiB discovery budget; application and build unchanged' };
fs.writeFileSync(path.join(root, 'manifest.json'), JSON.stringify(m, null, 2) + '\n');
console.log(JSON.stringify({ files: m.files.length, finalSourceFingerprint: m.finalSourceFingerprint, delta }));
