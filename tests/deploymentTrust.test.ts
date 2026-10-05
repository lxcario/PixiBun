import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { data, Evaluator, Lexer, Parser } from '@actions/expressions';
import { isCurrentDeploymentCandidate } from '../scripts/checkDeploymentCandidate.mjs';

interface WorkflowStep {
  name: string;
  id?: string;
  uses?: string;
  if?: string;
  run?: string;
  env?: Record<string, string>;
  with?: Record<string, unknown>;
}
interface DeployWorkflow {
  on: { workflow_run: { workflows: string[]; types: string[]; branches: string[] } };
  permissions: Record<string, string>;
  jobs: { deploy: { if: string; 'timeout-minutes': number; concurrency: { group: string; queue: string; 'cancel-in-progress': boolean }; steps: WorkflowStep[] } };
}
// ESLint already supplies this YAML parser; do not reinterpret workflow syntax as text.
const yaml = createRequire(import.meta.url)('js-yaml') as { load(source: string): unknown };
const workflow = yaml.load(readFileSync('.github/workflows/deploy.yml', 'utf8')) as DeployWorkflow;

function context(value: unknown): data.ExpressionData {
  if (value === null || value === undefined) return new data.Null();
  if (typeof value === 'string') return new data.StringData(value);
  if (typeof value === 'boolean') return new data.BooleanData(value);
  const dictionary = new data.Dictionary();
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) dictionary.add(key, context(child));
  return dictionary;
}
function evaluate(expression: string, values: Record<string, unknown>): boolean {
  const source = expression.trim().replace(/^\$\{\{\s*/, '').replace(/\s*\}\}$/, '');
  const tokens = new Lexer(source).lex().tokens;
  const expressionTree = new Parser(tokens, Object.keys(values), []).parse();
  return new Evaluator(expressionTree, context(values) as data.Dictionary).evaluate().coerceString() === 'true';
}
const trustedRun = {
  conclusion: 'success', event: 'push', head_branch: 'main', head_repository: { full_name: 'lxcario/PixiBun' },
};

describe('Production deployment trust boundary', () => {
  it.each([
    ['trusted main push', {}, true],
    ['fork PR with main branch', { event: 'pull_request', head_repository: { full_name: 'attacker/PixiBun' } }, false],
    ['same-repository PR with main branch', { event: 'pull_request' }, false],
    ['fork push with main branch', { head_repository: { full_name: 'attacker/PixiBun' } }, false],
    ['other branch', { head_branch: 'feature' }, false],
    ['failed CI', { conclusion: 'failure' }, false],
    ['cancelled CI', { conclusion: 'cancelled' }, false],
    ['manual workflow', { event: 'workflow_dispatch' }, false],
    ['missing originating event', { event: undefined }, false],
    ['missing conclusion', { conclusion: undefined }, false],
    ['missing branch', { head_branch: undefined }, false],
    ['missing repository', { head_repository: undefined }, false],
    ['empty repository identity', { head_repository: { full_name: '' } }, false],
  ])('admits %s only when trusted', (_name, changes, expected) => {
    expect(evaluate(workflow.jobs.deploy.if, {
      github: { repository: 'lxcario/PixiBun', event: { workflow_run: { ...trustedRun, ...changes as object } } },
    })).toBe(expected);
  });

  it('refuses a missing workflow run', () => {
    expect(evaluate(workflow.jobs.deploy.if, { github: { repository: 'lxcario/PixiBun', event: {} } })).toBe(false);
  });

  it('checks out the verified commit without retaining Git credentials', () => {
    expect(workflow.on.workflow_run).toEqual({ workflows: ['CI'], types: ['completed'], branches: ['main'] });
    expect(workflow.permissions).toEqual({ contents: 'read' });
    const checkout = workflow.jobs.deploy.steps.find(step => step.uses?.startsWith('actions/checkout@'))!;
    expect(checkout.with?.ref).toBe('${{ github.event.workflow_run.head_sha }}');
    expect(checkout.with?.['persist-credentials']).toBe(false);
  });

  it('skips every Vercel command when credentials are missing', () => {
    const commands = workflow.jobs.deploy.steps.filter(step => /(?:^|\s)vercel(?:\s|@)/.test(step.run ?? ''));
    expect(commands).toHaveLength(4);
    for (const step of commands) {
      expect(evaluate(step.if!, { steps: { check_creds: { outputs: { has_creds: 'false' } } } })).toBe(false);
      expect(evaluate(step.if!, { steps: { check_creds: { outputs: { has_creds: 'true' } }, candidate: { outputs: { current: 'true' } }, promotion: { outputs: { current: 'true' } } } })).toBe(true);
    }
  });

  it('serializes production jobs without interrupting an active remote deployment', () => {
    expect(workflow.jobs.deploy.concurrency).toEqual({ group: 'vercel-production', queue: 'max', 'cancel-in-progress': false });
  });

  it.each(['false', undefined])('blocks every Vercel command for stale or unverified candidates (%s)', current => {
    for (const step of workflow.jobs.deploy.steps.filter(step => /(?:^|\s)vercel(?:\s|@)/.test(step.run ?? ''))) {
      expect(evaluate(step.if!, { steps: { check_creds: { outputs: { has_creds: 'true' } }, candidate: { outputs: { current } }, promotion: { outputs: { current: 'true' } } } })).toBe(false);
    }
  });

  it('checks again after building and blocks promotion if main moved or the recheck failed', () => {
    const steps = workflow.jobs.deploy.steps, first = steps.findIndex(step => step.id === 'candidate'), second = steps.findIndex(step => step.id === 'promotion');
    expect(first).toBeLessThan(steps.findIndex(step => step.run === 'vercel build --prod'));
    expect(second).toBeGreaterThan(steps.findIndex(step => step.run === 'vercel build --prod'));
    const deploy = steps.findIndex(step => step.run === 'vercel deploy --prebuilt --prod');
    expect(second).toBeLessThan(deploy);
    for (const index of [first, second]) {
      expect(steps[index].run).toBe('node scripts/checkDeploymentCandidate.mjs');
      expect(steps[index].env).toEqual({ GITHUB_TOKEN: '${{ github.token }}', DEPLOY_CANDIDATE_SHA: '${{ github.event.workflow_run.head_sha }}' });
    }
    for (const current of ['false', undefined]) expect(evaluate(steps[deploy].if!, { steps: {
      check_creds: { outputs: { has_creds: 'true' } }, candidate: { outputs: { current: 'true' } }, promotion: { outputs: { current } },
    } })).toBe(false);
  });

  it('passes Vercel secrets through step environments and the checked-out SHA to the build', () => {
    const commands = workflow.jobs.deploy.steps.filter(step => step.run?.startsWith('vercel '));
    expect(commands).toHaveLength(3);
    for (const step of commands) {
      expect(step.run).not.toMatch(/--token|\$\{\{\s*secrets\./);
      expect(step.env).toMatchObject({
        VERCEL_TOKEN: '${{ secrets.VERCEL_TOKEN }}', VERCEL_ORG_ID: '${{ secrets.VERCEL_ORG_ID }}',
        VERCEL_PROJECT_ID: '${{ secrets.VERCEL_PROJECT_ID }}',
      });
    }
    expect(commands.find(step => step.run === 'vercel build --prod')?.env?.VERCEL_GIT_COMMIT_SHA)
      .toBe('${{ github.event.workflow_run.head_sha }}');
  });
});

describe('current main deployment eligibility', () => {
  const sha = 'a'.repeat(40), newer = 'b'.repeat(40);
  function fetcher(body: unknown, status = 200): typeof fetch { return async () => new Response(JSON.stringify(body), { status }); }
  const ref = (head: string) => ({ ref: 'refs/heads/main', object: { type: 'commit', sha: head } });
  const options = { repository: 'lxcario/PixiBun', candidateSha: sha, token: 'fixture-token' };
  it('admits only current main, including a commit that becomes stale while building', async () => {
    expect(await isCurrentDeploymentCandidate({ ...options, fetchImpl: fetcher(ref(sha)) })).toBe(true);
    expect(await isCurrentDeploymentCandidate({ ...options, fetchImpl: fetcher(ref(newer)) })).toBe(false);
  });
  it.each([403, 404, 500])('fails closed on HTTP %s', async status => {
    await expect(isCurrentDeploymentCandidate({ ...options, fetchImpl: fetcher({}, status) })).rejects.toThrow(/Cannot verify/);
  });
  it.each([{}, { ref: 'refs/heads/other', object: { type: 'commit', sha } }, ref('short'), { ref: 'refs/heads/main', object: { type: 'tag', sha } }])('fails closed on a malformed reference %j', async body => {
    await expect(isCurrentDeploymentCandidate({ ...options, fetchImpl: fetcher(body) })).rejects.toThrow(/invalid reference/);
  });
  it('bounds the authenticated request and refuses redirects', async () => {
    const fetchImpl: typeof fetch = async (input, init) => {
      expect(input).toBe('https://api.github.com/repos/lxcario/PixiBun/git/ref/heads/main');
      expect(init?.redirect).toBe('error'); expect(init?.signal).toBeInstanceOf(AbortSignal);
      expect(init?.cache).toBe('no-store');
      return new Response(JSON.stringify(ref(sha)));
    };
    expect(await isCurrentDeploymentCandidate({ ...options, fetchImpl })).toBe(true);
  });
  it('propagates network failure instead of declaring a candidate current', async () => {
    await expect(isCurrentDeploymentCandidate({ ...options, fetchImpl: async () => { throw new Error('network unavailable'); } })).rejects.toThrow('network unavailable');
  });
});
