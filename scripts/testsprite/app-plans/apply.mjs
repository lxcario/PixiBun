#!/usr/bin/env node
// Publish rendered App plans to the TestSprite project. Dry run unless --apply.
//
//   node scripts/testsprite/app-plans/render.mjs --check
//   node scripts/testsprite/app-plans/apply.mjs                 print what would change
//   node scripts/testsprite/app-plans/apply.mjs --apply [KEY…]  replace plan steps + description
//
// Before replacing anything it saves each test's current definition (plan steps and
// description) under out/before/, so the previous plan can be restored with `test plan put`.
// Stored Python code is never touched: the CLI replay path keeps its own scripts.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, 'out');
const apply = process.argv.includes('--apply');
const only = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const env = { ...process.env, TESTSPRITE_NO_SKILL_WARNING: '1' };
// Run the CLI's own entry with node, never through a shell, so long descriptions stay one argument.
const entry = process.env.TESTSPRITE_CLI_JS
  ?? join(execFileSync('npm', ['root', '-g'], { shell: process.platform === 'win32' }).toString().trim(), '@testsprite', 'testsprite-cli', 'dist', 'index.js');

const cli = (args) => JSON.parse(execFileSync(process.execPath, [entry, '--output', 'json', ...args], { env, maxBuffer: 1 << 26 }).toString());

const plans = JSON.parse(readFileSync(join(out, 'plans.json'), 'utf8')).filter((p) => !only.length || only.includes(p.key));
mkdirSync(join(out, 'before'), { recursive: true });

for (const plan of plans) {
  const current = cli(['test', 'get', plan.id]);
  if (current.name !== plan.title) {
    console.log(`! ${plan.key}: server name "${current.name}" differs from spec title; skipped`);
    continue;
  }
  writeFileSync(join(out, 'before', `${plan.id}.json`), `${JSON.stringify({ description: current.description, planSteps: current.planSteps }, null, 2)}\n`);
  console.log(`${apply ? 'apply' : 'would apply'} ${plan.key}: ${current.planSteps.length} → ${plan.steps} steps`);
  if (!apply) continue;
  cli(['test', 'plan', 'put', plan.id, '--steps', join(out, `${plan.key}.steps.json`), '--expected-step-count', String(current.planSteps.length)]);
  cli(['test', 'update', plan.id, '--description', plan.description]);
  const after = cli(['test', 'get', plan.id]);
  const expected = JSON.parse(readFileSync(join(out, `${plan.key}.steps.json`), 'utf8')).planSteps;
  const same = after.planSteps.length === expected.length && after.planSteps.every((s, i) => s.description === expected[i].description);
  console.log(`  read back: ${same ? 'matches' : 'DIFFERS'}`);
}
