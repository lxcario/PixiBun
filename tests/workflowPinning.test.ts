import { readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

// ESLint already supplies this YAML parser; do not reinterpret workflow syntax as text.
const yaml = createRequire(import.meta.url)('js-yaml') as { load(source: string): unknown };
type Workflow = { permissions?: unknown; jobs: Record<string, { steps?: { uses?: string }[]; 'timeout-minutes'?: number }> };
const workflows = readdirSync('.github/workflows').filter(name => /\.ya?ml$/.test(name))
  .map(name => [name, yaml.load(readFileSync(`.github/workflows/${name}`, 'utf8')) as Workflow] as const);

describe('GitHub workflows', () => {
  it.each(workflows)('%s pins every action to a full commit SHA', (_name, workflow) => {
    const uses = Object.values(workflow.jobs).flatMap(job => job.steps ?? []).flatMap(step => step.uses ? [step.uses] : []);
    expect(uses.length).toBeGreaterThan(0);
    for (const action of uses) expect(action).toMatch(/^[\w.-]+\/[\w.-]+(\/[\w./-]+)?@[0-9a-f]{40}$/);
  });
  it.each(workflows)('%s declares token permissions and bounds every job', (_name, workflow) => {
    expect(workflow.permissions).toBeDefined();
    for (const [job, definition] of Object.entries(workflow.jobs)) expect(definition['timeout-minutes'], job).toBeGreaterThan(0);
  });
});
