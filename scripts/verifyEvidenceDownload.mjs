/** Compare an isolated artifact download with the original pre-upload index. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function safeRelative(value) {
  if (typeof value !== 'string' || !value || value.includes('\\') || value.includes(':') || value.startsWith('/') || value.split('/').some(part => !part || part === '.' || part === '..')) throw Error('Unsafe evidence path.');
  return value;
}

export function verifyEvidenceDownload({ index, directory, stripPrefix = '', downloadedIndex }) {
  const original = fs.readFileSync(index);
  const manifest = JSON.parse(original);
  if (manifest.schema !== 1 || !Array.isArray(manifest.files) || !manifest.files.length) throw Error('Unsupported evidence index.');
  if (stripPrefix) safeRelative(stripPrefix.replace(/\/$/, ''));
  const root = fs.realpathSync(directory);
  const expected = new Map();
  for (const file of manifest.files) {
    safeRelative(file.path);
    if (!file.path.startsWith(stripPrefix)) throw Error('Indexed path lacks the explicit archive prefix.');
    const relative = safeRelative(file.path.slice(stripPrefix.length));
    if (expected.has(relative) || !Number.isSafeInteger(file.bytes) || file.bytes < 0 || !/^[a-f0-9]{64}$/.test(file.sha256)) throw Error('Invalid or duplicate evidence entry.');
    expected.set(relative, { bytes: file.bytes, sha256: file.sha256 });
  }
  downloadedIndex = safeRelative(downloadedIndex);
  if (expected.has(downloadedIndex)) throw Error('Index cannot be an indexed data file.');
  expected.set(downloadedIndex, { bytes: original.length, sha256: hash(original) });
  const actual = new Map();
  function collect(folder) {
    for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) throw Error('Symlink in evidence download.');
      const filename = path.join(folder, entry.name);
      if (entry.isDirectory()) collect(filename);
      else if (entry.isFile()) {
        const bytes = fs.readFileSync(filename);
        actual.set(path.relative(root, filename).split(path.sep).join('/'), { bytes: bytes.length, sha256: hash(bytes) });
      } else throw Error('Unsupported evidence entry.');
    }
  }
  collect(root);
  const failures = [];
  for (const [name, wanted] of expected) {
    const found = actual.get(name);
    if (!found) failures.push({ path: name, reason: 'missing' });
    else if (wanted.bytes !== found.bytes || wanted.sha256 !== found.sha256) failures.push({ path: name, reason: 'changed' });
  }
  for (const name of actual.keys()) if (!expected.has(name)) failures.push({ path: name, reason: 'extra' });
  const aggregate = hash(manifest.files.map(file => `${file.sha256}  ${file.path}\n`).join(''));
  if (aggregate !== manifest.fileManifestSha256) failures.push({ path: downloadedIndex, reason: 'invalid aggregate' });
  return { schema: 1, verifiedAt: new Date().toISOString(), passed: failures.length === 0, filesIndexed: manifest.files.length,
    downloadedIndexVerified: !failures.some(item => item.path === downloadedIndex), archivePrefixRemoved: stripPrefix,
    fileManifestSha256: aggregate, failures };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const option = name => args.includes(name) ? args[args.indexOf(name) + 1] : undefined;
  const receipt = option('--receipt');
  if (!receipt || fs.existsSync(receipt)) throw Error('A new receipt path is required.');
  const result = verifyEvidenceDownload({ index: option('--index'), directory: option('--download'), stripPrefix: option('--strip-prefix') ?? '', downloadedIndex: option('--downloaded-index') });
  const output = path.resolve(receipt);
  const root = fs.realpathSync(option('--download'));
  if (output === root || output.startsWith(root + path.sep)) throw Error('Receipt must be outside the isolated download.');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
  console.log(`Artifact retrieval ${result.passed ? 'verified' : 'FAILED'}: ${result.filesIndexed} indexed files; ${result.failures.length} mismatches.`);
  if (!result.passed) process.exitCode = 1;
}
