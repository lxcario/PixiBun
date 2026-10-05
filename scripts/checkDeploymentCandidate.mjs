import { appendFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Read the current production branch; unavailable or malformed answers fail closed.
 * @param {{repository: string, candidateSha: string, token: string, apiUrl?: string, fetchImpl?: typeof fetch}} options
 */
export async function isCurrentDeploymentCandidate({ repository, candidateSha, token, apiUrl = 'https://api.github.com', fetchImpl = fetch }) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository) || !/^[a-f0-9]{40}$/i.test(candidateSha) || !token) {
    throw new Error('Missing or invalid deployment candidate configuration.');
  }
  const base = new URL(apiUrl);
  if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash) {
    throw new Error('Invalid GitHub API URL.');
  }
  const response = await fetchImpl(`${base.href.replace(/\/$/, '')}/repos/${repository}/git/ref/heads/main`, {
    headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2026-03-10' },
    redirect: 'error', signal: AbortSignal.timeout(10_000), cache: 'no-store',
  });
  if (!response.ok) throw new Error(`Cannot verify the main branch (HTTP ${response.status}).`);
  const reference = await response.json();
  if (reference?.ref !== 'refs/heads/main' || reference?.object?.type !== 'commit' || !/^[a-f0-9]{40}$/i.test(reference?.object?.sha ?? '')) {
    throw new Error('Cannot verify the main branch: invalid reference response.');
  }
  return reference.object.sha.toLowerCase() === candidateSha.toLowerCase();
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const current = await isCurrentDeploymentCandidate({ repository: process.env.GITHUB_REPOSITORY ?? '',
      candidateSha: process.env.DEPLOY_CANDIDATE_SHA ?? '', token: process.env.GITHUB_TOKEN ?? '', apiUrl: process.env.GITHUB_API_URL });
    if (!process.env.GITHUB_OUTPUT) throw new Error('Missing workflow output path.');
    await appendFile(process.env.GITHUB_OUTPUT, `current=${current}\n`);
    console.log(current ? 'Deployment candidate matches main.' : 'Skipping stale deployment candidate: main has moved.');
  } catch {
    // Do not print fetch errors, which can include request data and credentials.
    console.error('Deployment candidate verification failed. Production deployment is blocked.');
    process.exitCode = 1;
  }
}
