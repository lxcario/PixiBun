import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { data, Evaluator, Lexer, Parser } from '@actions/expressions';

interface WorkflowStep { name: string; uses?: string; run?: string; with?: Record<string, unknown> }
interface PreviewWorkflow {
  on: { pull_request: { branches: string[]; types: string[] } };
  permissions: Record<string, string>;
  jobs: { preview: { if: string; env: Record<string, string>; steps: WorkflowStep[] } };
}
// ESLint already supplies this YAML parser; do not reinterpret workflow syntax as text.
const yaml = createRequire(import.meta.url)('js-yaml') as { load(source: string): unknown };
const workflow = yaml.load(readFileSync('.github/workflows/preview.yml', 'utf8')) as PreviewWorkflow;

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

describe('Preview deployment trust boundary', () => {
  it.each([
    ['same-repository PR with previews enabled', 'vercel-cli', 'lxcario/PixiBun', true],
    ['fork PR with previews enabled', 'vercel-cli', 'attacker/PixiBun', false],
    ['same-repository PR with previews disabled', undefined, 'lxcario/PixiBun', false],
    ['other preview mode', 'git-integration', 'lxcario/PixiBun', false],
    ['missing head repository', 'vercel-cli', undefined, false],
  ])('admits %s only when trusted', (_name, mode, head, expected) => {
    expect(evaluate(workflow.jobs.preview.if, {
      vars: mode === undefined ? {} : { PREVIEW_DEPLOY: mode },
      github: {
        repository: 'lxcario/PixiBun',
        event: { pull_request: { head: { repo: head === undefined ? {} : { full_name: head } } } },
      },
    })).toBe(expected);
  });

  it('builds the PR head without retaining Git credentials and with least permissions', () => {
    expect(workflow.on.pull_request.branches).toEqual(['main']);
    expect(workflow.permissions).toEqual({ contents: 'read', deployments: 'write' });
    const checkout = workflow.jobs.preview.steps.find(step => step.uses?.startsWith('actions/checkout@'))!;
    expect(checkout.with?.ref).toBe('${{ github.event.pull_request.head.sha }}');
    expect(checkout.with?.['persist-credentials']).toBe(false);
  });

  it('publishes the stable alias TestSprite targets and never a production deployment', () => {
    expect(workflow.jobs.preview.env.PREVIEW_ALIAS).toBe('pixibun-pr-${{ github.event.pull_request.number }}.vercel.app');
    const commands = workflow.jobs.preview.steps.map(step => step.run ?? '').join('\n');
    expect(commands).not.toMatch(/--prod\b/);
    expect(commands).toContain('--environment=preview');
  });
});
