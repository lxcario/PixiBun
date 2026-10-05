// Read-only source catalogue. Import edges are approximate static text matches,
// not a TypeScript program analysis or a claim that every line was reviewed.
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, relative, dirname } from 'node:path';
import { createHash } from 'node:crypto';
const root = resolve('.');
async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const batches = await Promise.all(entries.map(e => e.isDirectory() ? walk(resolve(dir, e.name)) : [resolve(dir, e.name)]));
  return batches.flat();
}
const paths = (await walk(resolve(root, 'src'))).filter(p => /\.(tsx?|css)$/.test(p)).sort();
const known = new Set(paths);
function target(path, specifier) {
  if (!specifier.startsWith('@/') && !specifier.startsWith('.')) return null;
  const base = specifier.startsWith('@/') ? resolve(root, 'src', specifier.slice(2)) : resolve(dirname(path), specifier);
  return [base, ...['.ts', '.tsx', '.css', '/index.ts', '/index.tsx'].map(ext => base + ext)].find(p => known.has(p));
}
const files = await Promise.all(paths.map(async path => {
  const bytes = await readFile(path); const source = bytes.toString('utf8');
  const specs = [...source.matchAll(/(?:from\s*|import\s*\(\s*|import\s*)['"]([^'"]+)['"]/g)].map(m => m[1]);
  return { path: relative(root, path).replaceAll('\\', '/'), lines: source.split('\n').length,
    bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'),
    imports: [...new Set(specs.map(s => target(path, s)).filter(Boolean).map(p => relative(root, p).replaceAll('\\', '/')))].sort() };
}));
const groups = {};
for (const f of files) {
  const key = f.path.startsWith('src/lib/') ? f.path.split('/').slice(0, 3).join('/') : f.path.split('/').slice(0, 2).join('/');
  groups[key] ??= { files: 0, lines: 0 }; groups[key].files++; groups[key].lines += f.lines;
}
const result = { revision: 'f18f4e47d299685d7fdf23de158ae082a883483d', date: '2026-10-05',
  scope: 'All src TS/TSX/CSS files catalogued; targeted review and probes are described in the report.',
  fileCount: files.length, totalLines: files.reduce((n, f) => n + f.lines, 0), groups,
  largest: [...files].sort((a,b) => b.lines-a.lines).slice(0, 15).map(({path,lines}) => ({path,lines})), files };
await writeFile(resolve(root, 'docs/research/evidence/2026-10-05-deep-audit/source-inventory.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({fileCount:result.fileCount,totalLines:result.totalLines,groups,largest:result.largest},null,2));
