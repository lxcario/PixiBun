import { appendFile, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Guards for .github/workflows/testsprite-autofix.yml. The workflow runs this file from a
 * trusted default-branch checkout, never from the pull request it is repairing.
 */
export const AUTOFIX_LABEL = 'autofix-loop';
export const MAX_AUTOFIX_ATTEMPTS = 2;
export const ATTEMPT_TRAILER = 'TestSprite-Autofix-Attempt';
/** Commits by these accounts are automatic attempts even without the trailer. */
export const AUTOFIX_BOTS = ['claude[bot]', 'github-actions[bot]'];

const SHA = /^[a-f0-9]{40}$/i;
const REPOSITORY = /^[\w.-]+\/[\w.-]+$/;
const SAFE_REF = /^(?!-)(?!.*\.\.)[\w./-]{1,200}$/;
const TESTSPRITE = /testsprite/i;

/** The failed TestSprite verdict carried by a check_run or status event, or null. */
export function failedTestSpriteCheck(eventName, payload) {
  if (eventName === 'check_run') {
    const run = payload?.check_run;
    if (payload?.action !== 'completed' || run?.conclusion !== 'failure' || !TESTSPRITE.test(run?.name ?? '')) return null;
    // Our own Actions jobs mention TestSprite too; only another app's verdict counts.
    if (!run?.app?.slug || run.app.slug === 'github-actions' || !SHA.test(run?.head_sha ?? '')) return null;
    return { sha: run.head_sha.toLowerCase(), runUrl: safeUrl(run.details_url) || safeUrl(run.html_url) };
  }
  if (eventName === 'status') {
    if (payload?.state !== 'failure' || !TESTSPRITE.test(payload?.context ?? '') || !SHA.test(payload?.sha ?? '')) return null;
    return { sha: payload.sha.toLowerCase(), runUrl: safeUrl(payload.target_url) };
  }
  return null;
}

/** Only plain https links reach outputs and commit messages. */
export function safeUrl(value) {
  if (typeof value !== 'string' || value.length > 500 || /\s/.test(value)) return '';
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : '';
  } catch {
    return '';
  }
}

/** Previous automatic attempts on the pull request: trailer-marked or bot-authored commits. */
export function countAutofixAttempts(commits) {
  const trailer = new RegExp(`^${ATTEMPT_TRAILER}:`, 'mi');
  return (commits ?? []).filter(commit => trailer.test(commit?.commit?.message ?? '')
    || AUTOFIX_BOTS.includes(commit?.author?.login ?? '') || AUTOFIX_BOTS.includes(commit?.committer?.login ?? '')).length;
}

/**
 * Decide whether one pull request may receive an automatic repair. Every missing or unexpected
 * value refuses.
 * @param {{repository: string, pull: any, commits: any[], expectedHeadSha?: string}} options
 */
export function decideAdmission({ repository, pull, commits, expectedHeadSha = '' }) {
  const refuse = reason => ({ admit: false, reason });
  if (!REPOSITORY.test(repository ?? '')) return refuse('invalid repository');
  if (!pull || !Number.isInteger(pull.number) || pull.number < 1) return refuse('no pull request');
  if (pull.state !== 'open') return refuse('pull request is not open');
  const same = name => typeof name === 'string' && name.toLowerCase() === repository.toLowerCase();
  if (!same(pull.head?.repo?.full_name) || !same(pull.base?.repo?.full_name)) return refuse('fork pull requests are never repaired automatically');
  if (!(pull.labels ?? []).some(label => label?.name === AUTOFIX_LABEL)) return refuse(`label ${AUTOFIX_LABEL} is not set`);
  const headSha = pull.head?.sha ?? '', headRef = pull.head?.ref ?? '';
  if (!SHA.test(headSha) || !SAFE_REF.test(headRef)) return refuse('unexpected head reference');
  if (expectedHeadSha && expectedHeadSha.toLowerCase() !== headSha.toLowerCase()) return refuse('the failed check is for an older commit');
  if (!Array.isArray(commits)) return refuse('commit history unavailable');
  const previous = countAutofixAttempts(commits);
  if (previous >= MAX_AUTOFIX_ATTEMPTS) return refuse(`automatic attempt limit (${MAX_AUTOFIX_ATTEMPTS}) reached`);
  return { admit: true, reason: 'admitted', pr: pull.number, headRef, headSha: headSha.toLowerCase(), attempt: previous + 1 };
}

const PROTECTED = [
  /^\.github\//, /^\.testsprite\//, /^\.claude\//, /^\.mcp\.json$/, /^docs\/testsprite\//, /^testsprite_tests\//,
  /^scripts\/runQualityGate\.mjs$/, /^scripts\/testspriteAutofix\.mjs$/, /^package(-lock)?\.json$/,
  /^(vitest|playwright)[\w.-]*\.config\.[cm]?[jt]s$/, /^eslint\.config\.[cm]?js$/, /^tsconfig[\w.-]*\.json$/,
];
const TEST_FILE = /(^|\/)(tests|e2e)\/|\.(test|spec)\.[cm]?[jt]sx?$/;
const ASSERTION = /\b(expect|assert)\b|\.to[A-Z]\w*\s*\(/;
const DISABLED = /\.(skip|only|fixme|todo)\s*\(|\bx(it|describe|test)\s*\(/;

/** Refuse fixes that touch the checker, the gate or the PRD, delete tests, remove assertions or disable tests. */
export function reviewFixPatch(patch) {
  const violations = [], files = [];
  for (const block of (patch ?? '').split(/^(?=diff --git )/m).filter(part => part.startsWith('diff --git '))) {
    const header = /^diff --git a\/(.+?) b\/(.+)$/m.exec(block);
    if (!header) { violations.push('unreadable diff header'); continue; }
    const paths = [...new Set([header[1], header[2]])];
    files.push(header[2]);
    for (const path of paths) if (PROTECTED.some(pattern => pattern.test(path))) violations.push(`${path}: protected path`);
    if (!paths.some(path => TEST_FILE.test(path))) continue;
    if (/^deleted file mode/m.test(block)) violations.push(`${header[1]}: test file deleted`);
    if (/^rename from /m.test(block)) violations.push(`${header[1]}: test file renamed`);
    let inHunk = false;
    for (const line of block.split('\n')) {
      if (line.startsWith('@@')) { inHunk = true; continue; }
      if (!inHunk) continue;
      if (line.startsWith('-') && ASSERTION.test(line)) violations.push(`${header[1]}: assertion removed: ${line.slice(1, 120).trim()}`);
      if (line.startsWith('+') && DISABLED.test(line)) violations.push(`${header[2]}: test disabled or focused: ${line.slice(1, 120).trim()}`);
    }
  }
  return { files, violations };
}

/** Commit message: the agent's summary, then the failing run and the attempt trailer. */
export function composeCommitMessage({ summary, runUrl, failedTests, attempt }) {
  const lines = String(summary ?? '').replace(/\r/g, '').split('\n');
  const first = (lines.shift() ?? '').replace(/^#+\s*/, '').replace(/[^\x20-\x7e]/g, '').trim();
  const subject = first ? first.slice(0, 72) : 'Fix failing TestSprite tests';
  const body = lines.join('\n').trim().slice(0, 4000);
  const tests = (failedTests ?? []).filter(id => /^[\w.-]{1,100}$/.test(id));
  return [
    subject, '', ...(body ? [body, ''] : []),
    `Failing TestSprite run: ${safeUrl(runUrl) || 'unavailable'}`,
    ...(tests.length ? [`Failed TestSprite tests: ${tests.join(', ')}`] : []),
    `${ATTEMPT_TRAILER}: ${attempt}/${MAX_AUTOFIX_ATTEMPTS}`,
  ].join('\n');
}

/** A bounded GitHub REST client; any HTTP failure or redirect fails closed. */
export function gitHubClient({ repository, token, apiUrl = 'https://api.github.com', fetchImpl = fetch }) {
  if (!REPOSITORY.test(repository ?? '') || !token) throw new Error('Missing or invalid GitHub configuration.');
  const base = new URL(apiUrl);
  if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash) throw new Error('Invalid GitHub API URL.');
  return async path => {
    const response = await fetchImpl(`${base.href.replace(/\/$/, '')}/repos/${repository}${path}`, {
      headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2026-03-10' },
      redirect: 'error', signal: AbortSignal.timeout(15_000), cache: 'no-store',
    });
    if (!response.ok) throw new Error(`GitHub request failed (HTTP ${response.status}).`);
    return response.json();
  };
}

async function pullCommits(get, number) {
  const commits = [];
  for (let page = 1; page <= 3; page += 1) {
    const batch = await get(`/pulls/${number}/commits?per_page=100&page=${page}`);
    if (!Array.isArray(batch)) throw new Error('Invalid commit list.');
    commits.push(...batch);
    if (batch.length < 100) break;
  }
  return commits;
}

/** Relay: the admitted pull request whose current head failed the TestSprite check, if any. */
export async function relay({ eventName, payload, repository, get }) {
  const failure = failedTestSpriteCheck(eventName, payload);
  if (!failure) return { dispatch: false, reason: 'not a failed TestSprite check' };
  const pulls = await get(`/commits/${failure.sha}/pulls`);
  if (!Array.isArray(pulls)) throw new Error('Invalid pull request list.');
  let reason = 'no open pull request for this commit';
  for (const candidate of pulls) {
    if (!Number.isInteger(candidate?.number)) continue;
    const pull = await get(`/pulls/${candidate.number}`);
    const decision = decideAdmission({ repository, pull, commits: await pullCommits(get, candidate.number), expectedHeadSha: failure.sha });
    if (decision.admit) return { dispatch: true, pr: decision.pr, headSha: decision.headSha, runUrl: failure.runUrl, reason: decision.reason };
    reason = `#${candidate.number}: ${decision.reason}`;
  }
  return { dispatch: false, reason };
}

/** The failing TestSprite check or status for a commit, for manual runs. */
export async function findTestSpriteRunUrl({ get, sha }) {
  const checks = await get(`/commits/${sha}/check-runs?per_page=100`);
  const run = (checks?.check_runs ?? []).find(check => TESTSPRITE.test(check?.name ?? '') && check?.app?.slug !== 'github-actions' && check?.conclusion === 'failure');
  if (run) return safeUrl(run.details_url) || safeUrl(run.html_url);
  const combined = await get(`/commits/${sha}/status`);
  const status = (combined?.statuses ?? []).find(entry => TESTSPRITE.test(entry?.context ?? '') && entry?.state === 'failure');
  return status ? safeUrl(status.target_url) : '';
}

/** Admit: re-apply every guard at execution time for one pull request number. */
export async function admit({ repository, get, prNumber, expectedHeadSha = '', runUrl = '' }) {
  const number = Number(prNumber);
  if (!Number.isInteger(number) || number < 1) return { admit: false, reason: 'invalid pull request number' };
  if (expectedHeadSha && !SHA.test(expectedHeadSha)) return { admit: false, reason: 'invalid expected head' };
  const pull = await get(`/pulls/${number}`);
  const decision = decideAdmission({ repository, pull, commits: await pullCommits(get, number), expectedHeadSha });
  if (!decision.admit) return decision;
  const link = safeUrl(runUrl) || await findTestSpriteRunUrl({ get, sha: decision.headSha }) || `https://github.com/${repository}/pull/${number}/checks`;
  return { ...decision, runUrl: link };
}

async function output(values) {
  if (!process.env.GITHUB_OUTPUT) throw new Error('Missing workflow output path.');
  const lines = Object.entries(values).map(([key, value]) => `${key}=${String(value ?? '').replace(/[\r\n]/g, ' ')}`);
  await appendFile(process.env.GITHUB_OUTPUT, `${lines.join('\n')}\n`);
}

async function main([command, file]) {
  const env = process.env, repository = env.GITHUB_REPOSITORY ?? '';
  if (command === 'review') {
    const { files, violations } = reviewFixPatch(await readFile(file, 'utf8'));
    for (const violation of violations) console.error(`::error title=Autofix refused::${violation}`);
    if (violations.length) throw new Error('The proposed fix weakens the checker or its assertions.');
    await output({ changed: files.length > 0 });
    console.log(files.length ? `Reviewed ${files.length} changed file(s).` : 'No changes proposed.');
    return;
  }
  if (command === 'message') {
    let summary = '';
    try { summary = await readFile(env.SUMMARY_FILE ?? '', 'utf8'); } catch { /* fall back to the default subject */ }
    await writeFile(file, composeCommitMessage({ summary, runUrl: env.RUN_URL, failedTests: (env.FAILED_TESTS ?? '').split(','), attempt: env.ATTEMPT }));
    return;
  }
  const get = gitHubClient({ repository, token: env.GITHUB_TOKEN ?? '', apiUrl: env.GITHUB_API_URL });
  if (command === 'relay') {
    const payload = JSON.parse(await readFile(env.GITHUB_EVENT_PATH ?? '', 'utf8'));
    const result = await relay({ eventName: env.GITHUB_EVENT_NAME, payload, repository, get });
    await output({ dispatch: result.dispatch, pr: result.pr, head_sha: result.headSha, run_url: result.runUrl });
    console.log(result.dispatch ? `Relaying #${result.pr} to the autofix run.` : `Not relaying: ${result.reason}.`);
    return;
  }
  if (command === 'admit') {
    const result = await admit({ repository, get, prNumber: env.PR_NUMBER, expectedHeadSha: env.EXPECTED_HEAD_SHA, runUrl: env.RUN_URL });
    await output({ admit: result.admit, pr: result.pr, head_ref: result.headRef, head_sha: result.headSha, attempt: result.attempt, run_url: result.runUrl });
    console.log(result.admit ? `Admitted #${result.pr}, attempt ${result.attempt}/${MAX_AUTOFIX_ATTEMPTS}.` : `::notice title=Autofix skipped::${result.reason}`);
    return;
  }
  throw new Error('Usage: testspriteAutofix.mjs relay | admit | review <patch> | message <file>');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    await main(process.argv.slice(2));
  } catch (error) {
    // GitHub errors are summarized by status only; never print request data or credentials.
    console.error(error instanceof Error ? error.message : 'Autofix guard failed.');
    process.exitCode = 1;
  }
}
