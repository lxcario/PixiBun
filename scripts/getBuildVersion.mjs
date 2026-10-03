import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const COMMIT_SHA = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i;
const CACHE_ID = /^[a-z0-9][a-z0-9._+-]{0,191}$/i;

/**
 * Production builds require a stable identity, including in Git-less archives.
 * Only this non-secret cache tag is exposed through Next's build-time env config.
 * @param {{env?: Record<string, string | undefined>, packageVersion?: string, readCommit?: () => string, developmentId?: () => string}} options
 */
export function getBuildVersion({
  env = process.env,
  packageVersion = JSON.parse(readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')).version,
  readCommit = () => execFileSync('git', ['rev-parse', 'HEAD'], { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(),
  developmentId = randomUUID,
} = {}) {
  const override = env.SW_CACHE_VERSION?.trim();
  if (override) {
    if (!CACHE_ID.test(override)) throw new Error('SW_CACHE_VERSION must be a cache tag of 1–192 letters, numbers, dots, underscores, plus signs or hyphens.');
    return override;
  }
  if (typeof packageVersion !== 'string' || !CACHE_ID.test(packageVersion)) {
    throw new Error('A valid package version is required for the service-worker build identity.');
  }
  const deploymentCommit = env.VERCEL_GIT_COMMIT_SHA?.trim();
  if (deploymentCommit) {
    if (!COMMIT_SHA.test(deploymentCommit)) throw new Error('VERCEL_GIT_COMMIT_SHA must identify the full deployment commit.');
    return `v${packageVersion}-${deploymentCommit.toLowerCase()}`;
  }
  try {
    const commit = readCommit().trim();
    if (COMMIT_SHA.test(commit)) return `v${packageVersion}-${commit.toLowerCase()}`;
  } catch {
    // A source archive may not include Git. Production must not reuse "local".
  }
  if (env.NODE_ENV === 'production') {
    throw new Error('Cannot determine a production build identity. Set a release-specific SW_CACHE_VERSION or provide VERCEL_GIT_COMMIT_SHA.');
  }
  return `v${packageVersion}-development-${developmentId()}`;
}
