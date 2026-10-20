/** Copy verification output before indexing; live cancelled workers may still write originals. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const allowed = ['artifacts', 'test-results', 'playwright-report', 'lhci-reports', 'coverage'];
const inside = (parent, child) => child.startsWith(parent + path.sep);
const refuseName = name => ['.git', 'node_modules', '.testsprite', '.env'].includes(name) || name.startsWith('.env.');

export function snapshotVerificationEvidence({ root: suppliedRoot = process.cwd(), sources, output }) {
  const root = fs.realpathSync(suppliedRoot);
  const destination = path.resolve(root, output);
  if (!sources?.length || !inside(path.join(root, 'artifacts'), destination) || fs.existsSync(destination)) {
    throw Error('A new snapshot directory under artifacts and explicit sources are required.');
  }
  function checkPath(filename) {
    const relative = path.relative(root, filename);
    if (!relative || relative.startsWith('..' + path.sep) || path.isAbsolute(relative)) throw Error('Evidence path escapes root.');
    let current = root;
    for (const part of relative.split(path.sep)) {
      if (refuseName(part)) throw Error('Credential/configuration directory refused.');
      current = path.join(current, part);
      if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink()) throw Error('Symlinks are not evidence files.');
    }
  }
  checkPath(destination);
  const directories = sources.map(source => path.resolve(root, source));
  for (const directory of directories) {
    if (!allowed.some(base => directory === path.join(root, base) || inside(path.join(root, base), directory))) throw Error('Source must be a verification-output directory.');
    if (directory === destination || inside(directory, destination) || inside(destination, directory)) throw Error('Snapshot must not overlap its sources.');
    checkPath(directory);
  }
  // Validate every entry before copying anything, including hidden trace files.
  const files = new Set();
  const missingSources = [];
  function collect(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) throw Error('Symlinks are not evidence files.');
      if (refuseName(entry.name)) throw Error('Credential/configuration directory refused.');
      const filename = path.join(directory, entry.name);
      if (entry.isDirectory()) collect(filename);
      else if (entry.isFile()) files.add(filename);
      else throw Error('Unsupported evidence entry.');
    }
  }
  for (const directory of directories) {
    if (!fs.existsSync(directory)) { missingSources.push(path.relative(root, directory)); continue; }
    if (!fs.statSync(directory).isDirectory()) throw Error('Evidence source must be a directory.');
    collect(directory);
  }
  if (!files.size) throw Error('No evidence files were produced.');
  fs.mkdirSync(destination, { recursive: true });
  for (const filename of [...files].sort()) {
    const target = path.join(destination, path.relative(root, filename));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(filename, target, fs.constants.COPYFILE_EXCL);
  }
  const receipt = { schema: 1, capturedAt: new Date().toISOString(), revision: process.env.GITHUB_SHA ?? null,
    runId: process.env.GITHUB_RUN_ID ?? null, filesCopied: files.size, missingSources,
    scope: 'Stable copied bytes for custody verification. This does not certify test completion or a globally atomic source snapshot; interrupted tests retain their original verdicts.' };
  fs.mkdirSync(path.join(destination, 'artifacts'), { recursive: true });
  fs.writeFileSync(path.join(destination, 'artifacts', 'snapshot-capture.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
  return receipt;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const sources = args.flatMap((arg, i) => arg === '--source' ? [args[i + 1]] : []);
  const output = args[args.indexOf('--output') + 1];
  if (!args.includes('--output') || !output || sources.some(source => !source)) throw Error('Required: --source directory (repeatable) --output new-snapshot-directory');
  const receipt = snapshotVerificationEvidence({ sources, output });
  console.log(`Captured ${receipt.filesCopied} evidence files; test completion is not implied.`);
}
