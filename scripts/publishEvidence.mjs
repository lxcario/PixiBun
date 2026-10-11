import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const option = name => args[args.indexOf(name) + 1];
if (!['--source', '--destination', '--run'].every(name => args.includes(name))) throw Error('Required: --source, --destination, --run');
const root = fs.realpathSync(process.cwd());
const source = fs.realpathSync(option('--source'));
const allowedSourceRoots = ['test-results', 'artifacts'].filter(p => fs.existsSync(p)).map(p => fs.realpathSync(p));
if (!allowedSourceRoots.some(p => source.startsWith(p + path.sep) || source === p)) throw Error('Source must be a project test-results or artifacts directory');
const destination = path.resolve(option('--destination'));
const artifactsRoot = path.join(root, 'artifacts');
const evidenceRoot = path.join(artifactsRoot, 'evidence-archive');
for (const parent of [artifactsRoot, evidenceRoot]) {
  if (fs.existsSync(parent) && fs.realpathSync(parent) !== parent) throw Error('Symlink evidence parent refused');
}
if (path.dirname(destination) !== evidenceRoot || fs.existsSync(destination)) throw Error('Destination must be a new immediate child of artifacts/evidence-archive');
try {
  execFileSync('git', ['check-ignore', '--quiet', '--', destination], { stdio: 'pipe' });
} catch {
  throw Error('Evidence destination must be ignored by Git');
}
const run = JSON.parse(fs.readFileSync(option('--run'), 'utf8'));
for (const field of ['command', 'runtime', 'browser', 'viewport', 'revision', 'verdict']) if (!run[field]) throw Error(`Missing run metadata: ${field}`);
const files = [];
function collect(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) throw Error('Symlink source refused');
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) collect(file);
    else if (entry.name.endsWith('.png')) files.push(file);
  }
}
collect(source);
if (!files.length) throw Error('No PNG captures in selected run');
const hashes = files.map(file => ({ path: path.relative(source, file).replaceAll('\\', '/'), sha256: crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') }));
const changes = execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim();
fs.mkdirSync(evidenceRoot, { recursive: true });
fs.mkdirSync(destination); // never overwrite an archived run
for (const file of files) { const dest = path.join(destination, path.relative(source, file)); fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.copyFileSync(file, dest); }
fs.writeFileSync(path.join(destination, 'manifest.json'), JSON.stringify({ publishedAt: new Date().toISOString(), run, dirtyWorkingTree: !!changes, workingTreeChanges: changes.split('\n').filter(Boolean), captures: hashes }, null, 2) + '\n');
console.log(`Archived ${files.length} captures locally with hashes. Original evidence unchanged.`);
