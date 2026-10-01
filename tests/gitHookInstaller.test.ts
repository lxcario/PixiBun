import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';
import { installGitHook } from '../scripts/gitHookInstaller.mjs';

const roots: string[] = [];
function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), 'pixibun-hook-')); roots.push(root);
  const git = (...args: string[]) => execFileSync('git', args, { cwd: root, stdio: 'pipe' });
  git('init');
  return { root, git };
}
afterEach(() => {
  for (const root of roots.splice(0)) {
    if (path.dirname(path.resolve(root)) !== path.resolve(tmpdir()) || !path.basename(root).startsWith('pixibun-hook-')) {
      throw new Error('Unexpected hook fixture cleanup path');
    }
    rmSync(root, { recursive: true, force: true });
  }
});

describe('non-destructive Git hook installer', () => {
  it('respects core.hooksPath and preserves an unrelated hook byte for byte', () => {
    const { root, git } = fixture();
    git('config', 'core.hooksPath', 'custom-hooks');
    mkdirSync(path.join(root, 'custom-hooks'));
    const hookPath = path.join(root, 'custom-hooks', 'pre-push');
    const original = '#!/bin/sh\nprintf custom\n'; writeFileSync(hookPath, original);
    expect(installGitHook(root).status).toBe('preserved');
    expect(readFileSync(hookPath, 'utf8')).toBe(original);
  });
  it('installs idempotently in a linked worktree with a .git file', () => {
    const { root, git } = fixture();
    git('-c', 'user.name=Hook Test', '-c', 'user.email=hook-test@example.invalid', 'commit', '--allow-empty', '-m', 'fixture');
    const checkout = path.join(root, 'linked');
    git('worktree', 'add', '--detach', checkout);
    const first = installGitHook(checkout);
    expect(first.status).toBe('installed');
    expect(first.path).toBe(path.join(root, '.git', 'hooks', 'pre-push'));
    const bytes = readFileSync(first.path!, 'utf8');
    expect(installGitHook(checkout).status).toBe('installed');
    expect(readFileSync(first.path!, 'utf8')).toBe(bytes);
  });
});
