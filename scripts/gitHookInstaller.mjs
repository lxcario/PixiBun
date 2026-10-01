import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const marker = '# pixibun-managed-pre-push-v1';
const hook = `#!/bin/sh
${marker}
# Checks the current working tree; bypassable with git push --no-verify.
npm run gate
exit $?
`;

/** Preserve unrelated hooks; resolve worktree and core.hooksPath layouts via Git. */
export function installGitHook(rootDir = process.cwd()) {
  let hookPath;
  try {
    hookPath = execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-path', 'hooks/pre-push'], {
      cwd: rootDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch {
    return { status: 'skipped', reason: 'No Git checkout available.' };
  }
  hookPath = path.resolve(rootDir, hookPath);
  if (fs.existsSync(hookPath)) {
    const existing = fs.readFileSync(hookPath, 'utf8');
    if (!existing.includes(marker) && !existing.includes('# PixiBun Atelier — Pre-Push Autonomous Quality Gate')) {
      return { status: 'preserved', path: hookPath, reason: 'Existing pre-push hook preserved. Add npm run gate to it manually if wanted.' };
    }
  }
  fs.mkdirSync(path.dirname(hookPath), { recursive: true });
  fs.writeFileSync(hookPath, hook, { mode: 0o755 });
  fs.chmodSync(hookPath, 0o755);
  return { status: 'installed', path: hookPath };
}
