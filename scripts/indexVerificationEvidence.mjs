/** Hash future CI evidence for an immutable remote artifact; never copies it into Git. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const args = process.argv.slice(2);
const sources = args.flatMap((value, i) => value === '--source' ? [args[i + 1]] : []);
const outputArg = args[args.indexOf('--output') + 1];
if (!sources.length || !args.includes('--output') || !outputArg) throw Error('Required: --source directory (repeatable) --output new-index.json');
const root = fs.realpathSync(process.cwd());
const output = path.resolve(outputArg);
if (!output.startsWith(path.join(root, 'artifacts') + path.sep) || fs.existsSync(output)) throw Error('Output must be a new file under artifacts.');
const allowed = ['artifacts', 'test-results', 'playwright-report', 'lhci-reports', 'coverage'];
const files = [];
function collect(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) throw Error('Symlinks are not evidence files.');
    if (['.git', '.env', '.env.local', 'node_modules', '.testsprite'].includes(entry.name) || entry.name.startsWith('.env.')) throw Error('Credential/configuration directory refused.');
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) collect(filename);
    else if (entry.isFile()) {
      const bytes = fs.readFileSync(filename);
      files.push({ path: path.relative(root, filename).replaceAll('\\', '/'), bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex') });
    }
  }
}
for (const source of sources) {
  const directory = path.resolve(source);
  if (!allowed.some(base => directory === path.join(root, base) || directory.startsWith(path.join(root, base) + path.sep))) throw Error('Source must be a project verification-output directory.');
  if (!fs.existsSync(directory)) continue; // An earlier failed stage may not have generated later evidence.
  if (fs.realpathSync(directory) !== directory) throw Error('Symlink source refused.');
  collect(directory);
}
if (!files.length) throw Error('No evidence files were produced.');
files.sort((a, b) => a.path.localeCompare(b.path));
const manifest = {
  schema: 1, createdAt: new Date().toISOString(),
  revision: process.env.GITHUB_SHA ?? null, runId: process.env.GITHUB_RUN_ID ?? null, runtime: process.version,
  storage: { provider: 'GitHub Actions immutable artifact', retentionDays: 90, permanentArchive: false },
  files, totalBytes: files.reduce((sum, file) => sum + file.bytes, 0),
  fileManifestSha256: crypto.createHash('sha256').update(files.map(file => `${file.sha256}  ${file.path}\n`).join('')).digest('hex'),
};
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify(manifest, null, 2) + '\n');
console.log(`Indexed ${files.length} files; 90-day remote retention is configured, and requires a successful artifact upload.`);
