import { spawnSync } from 'node:child_process';

// Separate processes keep coverage instrumentation out and measure serially.
for (const script of ['scripts/benchmarkRotSprite.mjs', 'scripts/benchmarkInteractions.mjs']) {
  const result = spawnSync(process.execPath, [script], { stdio: 'inherit', env: process.env });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
