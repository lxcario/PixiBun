/** Seal or verify the compiled files exercised by a production browser run. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const [mode, manifestArg, receiptFlag, receiptArg] = process.argv.slice(2);
if (!['--seal', '--verify'].includes(mode) || !manifestArg ||
    (mode === '--seal' ? receiptFlag : receiptFlag !== '--receipt' || !receiptArg)) {
  throw Error('Usage: --seal new-manifest.json OR --verify manifest.json --receipt new-receipt.json');
}
const root = fs.realpathSync(process.cwd());
function evidencePath(arg, mustBeNew) {
  const filename = path.resolve(arg);
  if (!filename.startsWith(path.join(root, 'artifacts') + path.sep) || (mustBeNew && fs.existsSync(filename))) {
    throw Error('Evidence must stay under artifacts and cannot overwrite existing output.');
  }
  return filename;
}
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const files = [];
function collect(relative) {
  const filename = path.join(root, '.next', relative);
  const stat = fs.lstatSync(filename);
  if (stat.isSymbolicLink()) throw Error('Compiled symlinks are not supported.');
  if (stat.isDirectory()) for (const child of fs.readdirSync(filename)) collect(`${relative}/${child}`);
  else if (stat.isFile()) files.push({ path: relative, bytes: stat.size, sha256: sha(fs.readFileSync(filename)) });
}
for (const relative of ['server', 'static', 'BUILD_ID']) collect(relative);
files.sort((a, b) => a.path.localeCompare(b.path));
const current = { buildId: fs.readFileSync('.next/BUILD_ID', 'utf8').trim(), files,
  manifestSha256: sha(files.map(file => `${file.sha256}  ${file.path}\n`).join('')) };
const manifest = evidencePath(manifestArg, mode === '--seal');
let output, data;
if (mode === '--seal') {
  output = manifest;
  data = { ...current, timestamp: new Date().toISOString(), revision: process.env.GITHUB_SHA ?? null };
} else {
  const original = JSON.parse(fs.readFileSync(manifest, 'utf8'));
  const expected = new Map(original.files.map(file => [file.path, file]));
  const actual = new Map(current.files.map(file => [file.path, file]));
  const changed = [...new Set([...expected.keys(), ...actual.keys()])].filter(name =>
    expected.get(name)?.sha256 !== actual.get(name)?.sha256 || expected.get(name)?.bytes !== actual.get(name)?.bytes);
  const passed = changed.length === 0 && current.buildId === original.buildId && current.manifestSha256 === original.manifestSha256;
  output = evidencePath(receiptArg, true);
  data = { timestamp: new Date().toISOString(), passed, buildId: current.buildId,
    filesCompared: files.length, manifestSha256: current.manifestSha256, changed };
  if (!passed) process.exitCode = 1;
}
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify(data, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ output: path.relative(root, output), files: files.length, buildId: current.buildId, passed: data.passed ?? true }));
