import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { data, Evaluator, Lexer, Parser } from '@actions/expressions';
import {
  admit, AUTOFIX_LABEL, composeCommitMessage, countAutofixAttempts, decideAdmission, failedTestSpriteCheck,
  gitHubClient, MAX_AUTOFIX_ATTEMPTS, relay, reviewFixPatch,
} from '../scripts/testspriteAutofix.mjs';

interface WorkflowStep {
  name: string;
  id?: string;
  uses?: string;
  if?: string;
  run?: string;
  env?: Record<string, string>;
  with?: Record<string, unknown>;
}
interface WorkflowJob {
  if?: string;
  needs?: string | string[];
  permissions: Record<string, string>;
  outputs?: Record<string, string>;
  steps: WorkflowStep[];
}
interface AutofixWorkflow {
  on: Record<string, unknown>;
  permissions: Record<string, string>;
  concurrency: { group: string; 'cancel-in-progress': boolean };
  jobs: Record<'relay' | 'admit' | 'fix' | 'publish', WorkflowJob>;
}
// ESLint already supplies this YAML parser; do not reinterpret workflow syntax as text.
const yaml = createRequire(import.meta.url)('js-yaml') as { load(source: string): unknown };
const workflow = yaml.load(readFileSync('.github/workflows/testsprite-autofix.yml', 'utf8')) as AutofixWorkflow;
const { relay: relayJob, admit: admitJob, fix: fixJob, publish: publishJob } = workflow.jobs;

function context(value: unknown): data.ExpressionData {
  if (value === null || value === undefined) return new data.Null();
  if (typeof value === 'string') return new data.StringData(value);
  if (typeof value === 'boolean') return new data.BooleanData(value);
  if (typeof value === 'number') return new data.NumberData(value);
  const dictionary = new data.Dictionary();
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) dictionary.add(key, context(child));
  return dictionary;
}
function evaluate(expression: string, values: Record<string, unknown>): string {
  const source = expression.trim().replace(/^\$\{\{\s*/, '').replace(/\s*\}\}$/, '');
  const tokens = new Lexer(source).lex().tokens;
  const expressionTree = new Parser(tokens, Object.keys(values), []).parse();
  return new Evaluator(expressionTree, context(values) as data.Dictionary).evaluate().coerceString();
}
const step = (job: WorkflowJob, id: string) => job.steps.find(candidate => candidate.id === id)!;
const SHA = 'a'.repeat(40), NEWER = 'b'.repeat(40), REPO = 'lxcario/PixiBun';
const failedCheck = { conclusion: 'failure', name: 'TestSprite', app: { slug: 'testsprite' }, head_sha: SHA, details_url: 'https://www.testsprite.com/runs/r1' };

describe('TestSprite autofix workflow triggers', () => {
  it.each([
    ['failed TestSprite check run', 'check_run', { check_run: failedCheck }, 'true'],
    ['case-insensitive check name', 'check_run', { check_run: { ...failedCheck, name: 'testsprite/pr' } }, 'true'],
    ['passed check run', 'check_run', { check_run: { ...failedCheck, conclusion: 'success' } }, 'false'],
    ['timed-out check run', 'check_run', { check_run: { ...failedCheck, conclusion: 'timed_out' } }, 'false'],
    ['another checker', 'check_run', { check_run: { ...failedCheck, name: 'CI / validate' } }, 'false'],
    ['check from our own Actions job', 'check_run', { check_run: { ...failedCheck, app: { slug: 'github-actions' } } }, 'false'],
    ['failed TestSprite status', 'status', { state: 'failure', context: 'TestSprite' }, 'true'],
    ['pending TestSprite status', 'status', { state: 'pending', context: 'TestSprite' }, 'false'],
    ['errored TestSprite status', 'status', { state: 'error', context: 'TestSprite' }, 'false'],
    ['another status', 'status', { state: 'failure', context: 'Vercel' }, 'false'],
    ['manual dispatch', 'workflow_dispatch', {}, 'false'],
    ['missing check payload', 'check_run', {}, 'false'],
  ])('relays a %s only when it is a failed TestSprite verdict', (_name, eventName, event, expected) => {
    expect(evaluate(relayJob.if!, { github: { event_name: eventName, event } })).toBe(expected);
  });

  it('repairs only from workflow_dispatch, which the relay and maintainers start', () => {
    expect(Object.keys(workflow.on).sort()).toEqual(['check_run', 'status', 'workflow_dispatch']);
    expect(workflow.on.check_run).toEqual({ types: ['completed'] });
    for (const eventName of ['check_run', 'status', 'pull_request', 'push']) expect(evaluate(admitJob.if!, { github: { event_name: eventName } })).toBe('false');
    expect(evaluate(admitJob.if!, { github: { event_name: 'workflow_dispatch' } })).toBe('true');
    expect(fixJob.needs).toBe('admit');
    expect(publishJob.needs).toEqual(['admit', 'fix']);
  });

  it('serializes runs per pull request so the next run counts the previous commit', () => {
    expect(workflow.concurrency['cancel-in-progress']).toBe(false);
    expect(evaluate(workflow.concurrency.group.replace(/^testsprite-autofix-/, ''), { inputs: { pr: 12 }, github: { run_id: '9' } })).toBe('12');
  });
});

describe('TestSprite autofix workflow guards', () => {
  it.each([
    ['both secrets', 'true', 'true', 'true'],
    ['missing secrets', 'false', 'true', 'false'],
    ['refused guards', 'true', 'false', 'false'],
    ['skipped guards', 'true', undefined, 'false'],
  ])('admits only with %s', (_name, ready, admitted, expected) => {
    expect(evaluate(admitJob.outputs!.admit, { steps: { secrets: { outputs: { ready } }, guards: { outputs: { admit: admitted } } } })).toBe(expected);
  });

  it('checks both secrets without exposing their values', () => {
    for (const job of [relayJob, admitJob]) {
      const check = step(job, 'secrets');
      expect(check.env).toEqual({ HAS_KEYS: "${{ secrets.TESTSPRITE_API_KEY != '' && secrets.ANTHROPIC_API_KEY != '' }}" });
      for (const later of job.steps.slice(job.steps.indexOf(check) + 1)) {
        expect(evaluate(later.if!, { steps: { secrets: { outputs: { ready: 'false' } }, relay: { outputs: { dispatch: 'true' } } } })).toBe('false');
      }
    }
    expect(evaluate(fixJob.if!, { needs: { admit: { outputs: { admit: 'false' } } } })).toBe('false');
    expect(evaluate(publishJob.if!, { needs: { fix: { outputs: { changed: '' } } } })).toBe('false');
  });

  it('uses least-privilege permissions and gives write access only to the job that runs no pull request code', () => {
    expect(workflow.permissions).toEqual({});
    expect(relayJob.permissions).toEqual({ actions: 'write', contents: 'read', 'pull-requests': 'read' });
    expect(admitJob.permissions).toEqual({ checks: 'read', contents: 'read', 'pull-requests': 'read', statuses: 'read' });
    expect(fixJob.permissions).toEqual({ contents: 'read', 'pull-requests': 'read' });
    expect(publishJob.permissions).toEqual({ contents: 'write' });
    expect(publishJob.steps.some(candidate => /\bnpm\b|\bnode_modules\b|npx /.test(candidate.run ?? ''))).toBe(false);
  });

  it('never interpolates event data into shell scripts', () => {
    for (const job of Object.values(workflow.jobs)) for (const candidate of job.steps) expect(candidate.run ?? '').not.toContain('${{');
  });

  it('keeps Git credentials only in the publishing checkout', () => {
    for (const job of Object.values(workflow.jobs)) {
      for (const checkout of job.steps.filter(candidate => candidate.uses?.startsWith('actions/checkout@'))) {
        const publishing = job === publishJob && checkout.with?.ref !== undefined;
        expect(checkout.with?.['persist-credentials']).toBe(publishing);
      }
    }
  });

  it('scopes each secret to the step that needs it', () => {
    const uses = (secret: string) => Object.values(workflow.jobs).flatMap(job => job.steps)
      .filter(candidate => JSON.stringify(candidate).includes(`secrets.${secret}`)).map(candidate => candidate.id ?? candidate.name);
    expect(uses('ANTHROPIC_API_KEY')).toEqual(['secrets', 'secrets', 'Repair the root cause with Claude']);
    expect(uses('TESTSPRITE_API_KEY')).toEqual(['secrets', 'secrets', 'bundles']);
  });

  it('reviews with the default-branch guard, not the repaired tree', () => {
    for (const job of [fixJob, publishJob]) {
      const trusted = job.steps.findIndex(candidate => candidate.with?.path === 'trusted');
      const head = job.steps.findIndex(candidate => candidate.with?.ref === '${{ needs.admit.outputs.head_sha }}');
      expect(job.steps[trusted].with?.ref).toBeUndefined();
      expect(trusted).toBeLessThan(head);
      expect(job.steps[trusted + 1].run).toContain('rm -rf trusted');
      for (const candidate of job.steps.filter(entry => entry.run?.includes('testspriteAutofix.mjs') && !entry.run.startsWith('cp '))) {
        expect(candidate.run).toMatch(/node "\$RUNNER_TEMP\/testspriteAutofix\.mjs" (review|message)/);
      }
    }
  });
});

describe('TestSprite autofix repair and publish steps', () => {
  const claude = fixJob.steps.find(candidate => candidate.uses?.startsWith('anthropics/claude-code-action@'))!;

  it('downloads every failed test bundle with the pinned CLI', () => {
    expect(fixJob.steps.some(candidate => candidate.run === 'npm install --global @testsprite/testsprite-cli@0.14.0')).toBe(true);
    const bundles = step(fixJob, 'bundles').run!;
    expect(bundles).toContain('testsprite --output json test list --project "$project" --status failed');
    expect(bundles).toContain('testsprite test failure get "$id" --out ".testsprite/failure/$id"');
    const upload = fixJob.steps[fixJob.steps.indexOf(step(fixJob, 'bundles')) + 1];
    // Actions are pinned to full commit SHAs, never moving tags.
    expect(upload.uses).toMatch(/^actions\/upload-artifact@[0-9a-f]{40}$/);
    expect(upload.with?.path).toContain('.testsprite/failure/');
  });

  it('gives Claude a read-only token, no push tools and the root-cause contract', () => {
    expect(claude.uses).toMatch(/^anthropics\/claude-code-action@[0-9a-f]{40}$/);
    expect(claude.with?.github_token).toBe('${{ github.token }}');
    const prompt = String(claude.with?.prompt);
    expect(prompt).toMatch(/Never weaken, delete, skip or loosen a correct assertion/);
    expect(prompt).toContain('npm run gate');
    expect(prompt).toContain('Do not commit or push');
    const args = String(claude.with?.claude_args);
    expect(args).toContain('--disallowedTools "Bash(git commit:*),Bash(git push:*)');
    expect(/--allowedTools "([^"]+)"/.exec(args)![1]).not.toMatch(/git (push|commit)|Bash\(\*\)|Bash,/);
  });

  it('reruns the gate itself and pushes one commit that links the failing run', () => {
    const order = ['review', 'Rerun the quality gate on the fix', 'Compose the commit message'].map(name => fixJob.steps.findIndex(candidate => candidate.id === name || candidate.name === name));
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(fixJob.steps[order[1]].run).toBe('npm run gate');
    expect(evaluate(fixJob.steps[order[1]].if!, { steps: { review: { outputs: { changed: 'false' } } } })).toBe('false');
    const push = publishJob.steps.at(-1)!.run!;
    expect(push.match(/git commit/g)).toHaveLength(1);
    expect(push).toContain('git push origin "HEAD:refs/heads/$HEAD_REF"');
    expect(push).not.toMatch(/--force|\s-f\s|\+HEAD/);
  });
});

const pull = (changes: Record<string, unknown> = {}) => ({
  number: 7, state: 'open', labels: [{ name: AUTOFIX_LABEL }],
  head: { sha: SHA, ref: 'feature/canvas', repo: { full_name: REPO } }, base: { repo: { full_name: REPO } }, ...changes,
});
const humanCommit = { commit: { message: 'Add readout' }, author: { login: 'lxcario' } };
const botCommit = { commit: { message: 'Fix export\n\nTestSprite-Autofix-Attempt: 1/2' }, author: { login: 'github-actions[bot]' } };

describe('autofix admission', () => {
  it('admits an opted-in same-repository pull request at its current head', () => {
    expect(decideAdmission({ repository: REPO, pull: pull(), commits: [humanCommit], expectedHeadSha: SHA }))
      .toEqual({ admit: true, reason: 'admitted', pr: 7, headRef: 'feature/canvas', headSha: SHA, attempt: 1 });
  });

  it.each([
    ['fork pull request', { head: { sha: SHA, ref: 'main', repo: { full_name: 'attacker/PixiBun' } } }, /fork/],
    ['deleted fork', { head: { sha: SHA, ref: 'main', repo: null } }, /fork/],
    ['foreign base', { base: { repo: { full_name: 'other/PixiBun' } } }, /fork/],
    ['missing label', { labels: [{ name: 'bug' }] }, /label autofix-loop/],
    ['no labels', { labels: undefined }, /label/],
    ['closed pull request', { state: 'closed' }, /not open/],
    ['option-like branch', { head: { sha: SHA, ref: '--upload-pack=x', repo: { full_name: REPO } } }, /unexpected head/],
    ['traversing branch', { head: { sha: SHA, ref: 'a/../b', repo: { full_name: REPO } } }, /unexpected head/],
    ['malformed head', { head: { sha: 'short', ref: 'x', repo: { full_name: REPO } } }, /unexpected head/],
  ])('refuses a %s', (_name, changes, reason) => {
    const decision = decideAdmission({ repository: REPO, pull: pull(changes), commits: [] });
    expect(decision.admit).toBe(false);
    expect(decision.reason).toMatch(reason);
  });

  it('refuses a check for an older commit, missing history and missing pull requests', () => {
    expect(decideAdmission({ repository: REPO, pull: pull(), commits: [], expectedHeadSha: NEWER }).reason).toMatch(/older commit/);
    expect(decideAdmission({ repository: REPO, pull: pull(), commits: undefined as never }).admit).toBe(false);
    expect(decideAdmission({ repository: REPO, pull: null, commits: [] }).admit).toBe(false);
  });

  it(`stops after ${MAX_AUTOFIX_ATTEMPTS} automatic attempts`, () => {
    const claudeCommit = { commit: { message: 'Repair' }, author: { login: 'claude[bot]' } };
    expect(countAutofixAttempts([humanCommit, botCommit, claudeCommit, { commit: { message: 'x' } }])).toBe(2);
    expect(decideAdmission({ repository: REPO, pull: pull(), commits: [humanCommit, botCommit] })).toMatchObject({ admit: true, attempt: 2 });
    expect(decideAdmission({ repository: REPO, pull: pull(), commits: [botCommit, claudeCommit] }).reason).toMatch(/attempt limit/);
    const pushedWithToken = { commit: { message: 'Fix\n\nTestSprite-Autofix-Attempt: 2/2' }, author: { login: 'lxcario' } };
    expect(decideAdmission({ repository: REPO, pull: pull(), commits: [botCommit, pushedWithToken] }).admit).toBe(false);
  });

  it('reads the failed verdict and its link from either event shape', () => {
    expect(failedTestSpriteCheck('check_run', { action: 'completed', check_run: failedCheck })).toEqual({ sha: SHA, runUrl: 'https://www.testsprite.com/runs/r1' });
    expect(failedTestSpriteCheck('status', { state: 'failure', context: 'TestSprite', sha: SHA, target_url: 'javascript:alert(1)' })).toEqual({ sha: SHA, runUrl: '' });
    expect(failedTestSpriteCheck('check_run', { action: 'created', check_run: failedCheck })).toBeNull();
    expect(failedTestSpriteCheck('check_run', { action: 'completed', check_run: { ...failedCheck, app: { slug: 'github-actions' } } })).toBeNull();
    expect(failedTestSpriteCheck('push', {})).toBeNull();
  });
});

describe('autofix GitHub lookups', () => {
  type Routes = Record<string, unknown>;
  const getter = (routes: Routes) => async (path: string) => {
    if (!(path in routes)) throw new Error(`unexpected ${path}`);
    return routes[path];
  };
  const commitsPath = '/pulls/7/commits?per_page=100&page=1';
  const event = { action: 'completed', check_run: failedCheck };

  it('relays the admitted pull request behind a failed check', async () => {
    const get = getter({ [`/commits/${SHA}/pulls`]: [{ number: 7 }], '/pulls/7': pull(), [commitsPath]: [humanCommit] });
    expect(await relay({ eventName: 'check_run', payload: event, repository: REPO, get }))
      .toEqual({ dispatch: true, pr: 7, headSha: SHA, runUrl: 'https://www.testsprite.com/runs/r1', reason: 'admitted' });
  });

  it('does not relay unlabelled pull requests or unrelated events', async () => {
    const get = getter({ [`/commits/${SHA}/pulls`]: [{ number: 7 }], '/pulls/7': pull({ labels: [] }), [commitsPath]: [] });
    expect(await relay({ eventName: 'check_run', payload: event, repository: REPO, get })).toMatchObject({ dispatch: false, reason: '#7: label autofix-loop is not set' });
    expect(await relay({ eventName: 'status', payload: { state: 'success' }, repository: REPO, get: getter({}) })).toMatchObject({ dispatch: false });
  });

  it('pages commit history so long pull requests cannot hide earlier attempts', async () => {
    const filler = Array.from({ length: 100 }, () => humanCommit);
    const get = getter({ '/pulls/7': pull(), [commitsPath]: filler, '/pulls/7/commits?per_page=100&page=2': [botCommit, botCommit] });
    expect(await admit({ repository: REPO, get, prNumber: '7', runUrl: 'https://www.testsprite.com/runs/r1' })).toMatchObject({ admit: false, reason: expect.stringMatching(/attempt limit/) });
  });

  it('finds the failing run link for a manual dispatch, falling back to the checks page', async () => {
    const withStatus = getter({
      '/pulls/7': pull(), [commitsPath]: [], [`/commits/${SHA}/check-runs?per_page=100`]: { check_runs: [{ name: 'TestSprite', app: { slug: 'github-actions' }, conclusion: 'failure', details_url: 'https://evil.example' }] },
      [`/commits/${SHA}/status`]: { statuses: [{ context: 'TestSprite', state: 'failure', target_url: 'https://www.testsprite.com/runs/r2' }] },
    });
    expect(await admit({ repository: REPO, get: withStatus, prNumber: '7' })).toMatchObject({ admit: true, runUrl: 'https://www.testsprite.com/runs/r2' });
    const none = getter({ '/pulls/7': pull(), [commitsPath]: [], [`/commits/${SHA}/check-runs?per_page=100`]: { check_runs: [] }, [`/commits/${SHA}/status`]: { statuses: [] } });
    expect(await admit({ repository: REPO, get: none, prNumber: '7' })).toMatchObject({ runUrl: `https://github.com/${REPO}/pull/7/checks` });
  });

  it.each(['0', '-1', '1.5', 'abc', ''])('refuses pull request number %j without a request', async prNumber => {
    expect(await admit({ repository: REPO, get: getter({}), prNumber })).toMatchObject({ admit: false });
  });

  it('fails closed on HTTP errors and refuses redirects', async () => {
    const failing = gitHubClient({ repository: REPO, token: 't', fetchImpl: async () => new Response('{}', { status: 502 }) });
    await expect(failing('/pulls/7')).rejects.toThrow(/HTTP 502/);
    const inspected = gitHubClient({ repository: REPO, token: 't', fetchImpl: async (input, init) => {
      expect(input).toBe(`https://api.github.com/repos/${REPO}/pulls/7`);
      expect(init?.redirect).toBe('error');
      expect(init?.signal).toBeInstanceOf(AbortSignal);
      return new Response('{"number":7}');
    } });
    expect(await inspected('/pulls/7')).toEqual({ number: 7 });
    expect(() => gitHubClient({ repository: 'bad repo', token: 't' })).toThrow();
    expect(() => gitHubClient({ repository: REPO, token: '' })).toThrow();
  });
});

describe('autofix patch review', () => {
  const diff = (path: string, body: string, header = '') => `diff --git a/${path} b/${path}\n${header}index 1..2 100644\n--- a/${path}\n+++ b/${path}\n@@ -1,3 +1,3 @@\n${body}\n`;

  it('accepts an application fix that adds a regression test', () => {
    const patch = diff('src/lib/export.ts', '-  return frames;\n+  return frames.filter(Boolean);')
      + diff('tests/export.test.ts', ' it("keeps frames", () => {\n+  expect(exportFrames([null])).toEqual([]);');
    expect(reviewFixPatch(patch)).toEqual({ files: ['src/lib/export.ts', 'tests/export.test.ts'], violations: [] });
  });

  it('treats an empty diff as no change', () => {
    expect(reviewFixPatch('')).toEqual({ files: [], violations: [] });
  });

  it.each([
    ['removed expectation', diff('tests/export.test.ts', '-  expect(frames).toHaveLength(2);\n+  // flaky')],
    ['loosened matcher', diff('tests/e2e/studio.spec.ts', "-  await expect(page.getByText('Saved')).toBeVisible();\n+  await page.waitForTimeout(500);")],
    ['removed assert call', diff('src/lib/frames.test.ts', '-  assert.equal(count, 2);')],
    ['skipped test', diff('tests/export.test.ts', "+it.skip('keeps frames', () => {")],
    ['focused test', diff('tests/export.test.ts', "+describe.only('export', () => {")],
    ['fixme test', diff('tests/e2e/studio.spec.ts', "+test.fixme('saves', async () => {")],
    ['deleted test file', diff('tests/export.test.ts', '-it("x", () => {})', 'deleted file mode 100644\n')],
    ['renamed test file', 'diff --git a/tests/export.test.ts b/tests/old/export.ts\nsimilarity index 100%\nrename from tests/export.test.ts\nrename to tests/old/export.ts\n'],
    ['workflow change', diff('.github/workflows/testsprite-autofix.yml', '-  if: x\n+  if: true')],
    ['TestSprite PRD change', diff('docs/testsprite/PRD.md', '-Undo restores the stroke.\n+Undo may restore the stroke.')],
    ['gate change', diff('scripts/runQualityGate.mjs', '-  stages,\n+  []')],
    ['guard change', diff('scripts/testspriteAutofix.mjs', '-export const MAX_AUTOFIX_ATTEMPTS = 2;\n+export const MAX_AUTOFIX_ATTEMPTS = 99;')],
    ['package script change', diff('package.json', '-    "test": "vitest run",\n+    "test": "true",')],
    ['coverage threshold change', diff('vitest.config.ts', '-      lines: 80,\n+      lines: 0,')],
    ['failure bundle commit', diff('.testsprite/failure/t1/meta.json', '+{}')],
  ])('refuses a %s', (_name, patch) => {
    expect(reviewFixPatch(patch).violations.length).toBeGreaterThan(0);
  });

  it('ignores diff headers and markdown rules outside hunks', () => {
    const patch = diff('src/lib/notes.ts', '-// --- expect nothing here? no: application code may change freely\n+// note');
    expect(reviewFixPatch(patch).violations).toEqual([]);
  });
});

describe('autofix commit message', () => {
  it('links the failing run and marks the attempt', () => {
    const message = composeCommitMessage({
      summary: '# Keep empty frames out of GIF export\n\nRoot cause: nulls reached the encoder.', runUrl: 'https://www.testsprite.com/runs/r1',
      failedTests: ['tst_1', 'bad id;rm', 'tst_2'], attempt: 1,
    });
    expect(message).toBe([
      'Keep empty frames out of GIF export', '', 'Root cause: nulls reached the encoder.', '',
      'Failing TestSprite run: https://www.testsprite.com/runs/r1', 'Failed TestSprite tests: tst_1, tst_2',
      'TestSprite-Autofix-Attempt: 1/2',
    ].join('\n'));
    expect(countAutofixAttempts([{ commit: { message } }])).toBe(1);
  });

  it('falls back to a default subject and refuses unsafe links', () => {
    const message = composeCommitMessage({ summary: '', runUrl: 'http://example.com', failedTests: [], attempt: 2 });
    expect(message.split('\n')[0]).toBe('Fix failing TestSprite tests');
    expect(message).toContain('Failing TestSprite run: unavailable');
    expect(composeCommitMessage({ summary: 'x'.repeat(100), runUrl: '', failedTests: [], attempt: 1 }).split('\n')[0]).toHaveLength(72);
  });
});
