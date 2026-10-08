const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), cp = require('node:child_process'), ts = require('typescript');
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
const original = JSON.parse(cp.execFileSync('git', ['show', 'HEAD:tsconfig.json'], { encoding: 'utf8' }));
const current = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'));
if (JSON.stringify(original.compilerOptions) !== JSON.stringify(current.compilerOptions) || JSON.stringify(original.include) !== JSON.stringify(current.include)) throw Error('Strict compiler options or active include changed');
const parse = config => ts.parseJsonConfigFileContent(config, ts.sys, process.cwd());
const before = parse(original), after = parse(current); if (before.errors.length || after.errors.length) throw Error('Invalid configuration');
const a = new Set(before.fileNames), b = new Set(after.fileNames);
const relative = p => path.relative(process.cwd(), p).replaceAll('\\', '/');
const removed = [...a].filter(p => !b.has(p)).map(relative), added = [...b].filter(p => !a.has(p)).map(relative);
if (!removed.length || removed.some(p => !p.startsWith('docs/research/evidence/')) || added.length) throw Error('Active compiler inputs changed outside the archive');
const admission = { recordedAt: new Date().toISOString(), strict: current.compilerOptions.strict, activeInputs: after.fileNames.length, currentSourceInputs: after.fileNames.filter(p => relative(p).startsWith('src/')).length, currentTestInputs: after.fileNames.filter(p => relative(p).startsWith('tests/')).length, removed, added, priorConfigSHA256: hash(Buffer.from(cp.execFileSync('git', ['show', 'HEAD:tsconfig.json']))), finalConfigSHA256: hash(fs.readFileSync('tsconfig.json')), applicationBuildUnchanged: JSON.parse(fs.readFileSync('artifacts/publication-docs-integrity.json')).changed.length === 0 };
fs.writeFileSync('artifacts/publication-archive-compiler-inputs.json', JSON.stringify(admission, null, 2) + '\n');
const root = 'docs/research/evidence/2026-10-08-publication-typecheck-boundary';
if (fs.existsSync(root)) throw Error('Refusing to replace boundary evidence');
const files = []; fs.mkdirSync(root);
for (const name of ['publication-push-typecheck-blocked.log', 'publication-archive-boundary-typecheck.log', 'publication-archive-compiler-inputs.json', 'publication-docs-integrity.json', 'publication-sealed-index-integrity.json', 'publication-staged-screen.json', 'publication-archive-boundary.cjs']) {
  const source = 'artifacts/' + name, bytes = fs.readFileSync(source); fs.writeFileSync(path.join(root, name), bytes); files.push({ path: name, source, bytes: bytes.length, sha256: hash(bytes) });
}
fs.writeFileSync(path.join(root, 'manifest.json'), JSON.stringify({ recordedAt: new Date().toISOString(), status: 'sealed', priorReviewCommit: cp.execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), scope: 'Configuration-only compiler admission repair after preserved pre-push refusal; unchanged browser-tested application/build; final hook/push receipt is separate', compiler: admission, files }, null, 2) + '\n');
console.log(JSON.stringify(admission));
