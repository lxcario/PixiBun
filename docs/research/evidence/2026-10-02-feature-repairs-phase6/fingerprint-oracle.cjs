const fs = require('node:fs');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const paths = cp.execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z', '--',
  'src', 'tests', 'scripts', 'package.json', 'package-lock.json', 'next.config.ts', 'playwright.config.ts',
  'playwright.production.config.ts', 'AGENTS.md'], { encoding: 'utf8' }).split('\0').filter(Boolean);
const files = [...new Set(paths)].sort().filter(p => fs.statSync(p).isFile())
  .map(path => ({ path, sha256: sha(fs.readFileSync(path)) }));
const previous = JSON.parse(fs.readFileSync('docs/research/evidence/2026-10-02-feature-repairs-phase5/source-final.json', 'utf8'));
const changedFiles = files.filter(f => previous.files.find(b => b.path === f.path)?.sha256 !== f.sha256);
fs.writeFileSync('artifacts/feature-repairs/phase6-source-final.json', JSON.stringify({
  kind: 'working-tree-fingerprints-not-execution-verdict', baseRevision: cp.execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), files,
}, null, 2) + '\n');
fs.writeFileSync('artifacts/feature-repairs/phase6-source-changes.json', JSON.stringify({ comparedWith: 'phase 5 frozen source', changedFiles }, null, 2) + '\n');
console.log(`Frozen ${files.length} source/test/config files; ${changedFiles.length} changes from phase 5.`);
