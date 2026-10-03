import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { data, Evaluator, Lexer, Parser } from '@actions/expressions';

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
  jobs: { deploy: { if: string; 'timeout-minutes': number; steps: WorkflowStep[] } };
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
      expect(evaluate(step.if!, { steps: { check_creds: { outputs: { has_creds: 'true' } } } })).toBe(true);
    }
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
