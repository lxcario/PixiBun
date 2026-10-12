import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
export async function inputFingerprint(workspace) {
  const inventory = spawnSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: workspace, encoding: 'utf8' });
  if (inventory.status) throw new Error('Cannot identify candidate inputs');
  const files = [...new Set(inventory.stdout.split('\0').filter(name => /^(src\/|public\/|tests\/|scripts\/|docs\/guides\/nibbli.*\.md$|.*\.config\.(?:ts|mjs)$|package(?:-lock)?\.json$|tsconfig\.json$|\.nvmrc$)/.test(name)))].sort();
  const entries = [];
  for (const file of files) {
    try { const bytes = await readFile(path.join(workspace, file)); entries.push({ file, bytes: bytes.length, sha256: sha(bytes) }); }
    catch (error) { if (error.code !== 'ENOENT') throw error; entries.push({ file, deleted: true }); }
  }
  return { sha256: sha(JSON.stringify(entries)), entries };
}
export async function buildFingerprint(workspace) {
  const entries = [];
  async function visit(directory) {
    for (const item of (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      const target = path.join(directory, item.name);
      if (item.isSymbolicLink()) throw new Error('Unexpected compiled link');
      if (item.isDirectory()) await visit(target);
      else if (item.isFile()) { const bytes = await readFile(target); entries.push({ file: path.relative(workspace, target).replaceAll('\\', '/'), bytes: bytes.length, sha256: sha(bytes) }); }
    }
  }
  await visit(path.join(workspace, '.next/server')); await visit(path.join(workspace, '.next/static'));
  return { buildId: (await readFile(path.join(workspace, '.next/BUILD_ID'), 'utf8')).trim(), sha256: sha(JSON.stringify(entries)), entries };
}
