#!/usr/bin/env node
/**
 * scripts/installGitHooks.mjs
 * 
 * Installs or updates the PixiBun local pre-push git hook.
 * Guarantees that no push can leave the developer workstation
 * without passing the Quality Gate (docs, typecheck, vitest).
 */

import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const gitDir = path.join(rootDir, '.git');
const hooksDir = path.join(gitDir, 'hooks');
const prePushFile = path.join(hooksDir, 'pre-push');

if (!fs.existsSync(gitDir)) {
  console.log('ℹ️  .git directory not found (skipping hook installation).');
  process.exit(0);
}

if (!fs.existsSync(hooksDir)) {
  fs.mkdirSync(hooksDir, { recursive: true });
}

const prePushScript = `#!/bin/sh
# PixiBun Atelier — Pre-Push Autonomous Quality Gate
# Intercepts 'git push' to ensure 0 broken code leaves the local workstation.

echo ""
echo "=========================================================================="
echo "🛡️  PIXIBUN QUALITY GATE: Validating commit invariants before push..."
echo "=========================================================================="

npm run gate
GATE_STATUS=$?

if [ $GATE_STATUS -ne 0 ]; then
  echo ""
  echo "❌ Push blocked! Quality Gate failed (exit code $GATE_STATUS)."
  echo "⚠️  Please fix the type, test, or documentation errors before pushing."
  echo ""
  exit 1
fi

echo "✅ Quality Gate passed. Proceeding with remote push."
echo ""
exit 0
`;

try {
  fs.writeFileSync(prePushFile, prePushScript, { mode: 0o755, encoding: 'utf8' });
  // Ensure executable permissions if on POSIX
  try {
    fs.chmodSync(prePushFile, 0o755);
  } catch {
    // Ignore on Windows
  }
  console.log('✅ PixiBun local Git pre-push hook installed successfully at .git/hooks/pre-push');
} catch (err) {
  console.error('❌ Failed to install Git hook:', err);
  process.exit(1);
}
