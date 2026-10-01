#!/usr/bin/env node
/** Convenience working-tree check; Git hooks can be bypassed. */
import { installGitHook } from './gitHookInstaller.mjs';
try {
  const result = installGitHook();
  console.log(result.status + ': ' + (result.path ?? result.reason));
  if (result.reason && result.path) console.log(result.reason);
} catch (error) {
  console.error('Failed to install the local Git hook:', error);
  process.exitCode = 1;
}
