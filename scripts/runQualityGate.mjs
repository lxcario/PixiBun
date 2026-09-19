#!/usr/bin/env node
/**
 * scripts/runQualityGate.mjs
 * 
 * 🛡️ PixiBun Atelier — Autonomous Local CI/CD Quality Gate Runner
 * 
 * Executes sequential release-grade quality verification stages with fail-fast semantics:
 *   Stage 1: Documentation Integrity & Invariant Audit (verify:docs)
 *   Stage 2: Strict Static Typecheck (tsc --noEmit)
 *   Stage 3: Lint and accessibility rules (eslint)
 *   Stage 4: Comprehensive Unit & Invariant Test Suite (vitest run)
 *   Stage 5: [Optional / --with-build] Production Bundle Verification (next build)
 * 
 * Runtime depends on hardware and suite size. Passing these checks is not
 * proof that every feature, browser or deployment works.
 */

import { spawnSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import process from 'node:process';

const args = process.argv.slice(2);
const withBuild = args.includes('--with-build') || args.includes('--full');

const COLOR = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(msg = '') {
  console.log(msg);
}

function printHeader() {
  log('');
  log(`${COLOR.bold}${COLOR.cyan}╔═════════════════════════════════════════════════════════════════════════╗${COLOR.reset}`);
  log(`${COLOR.bold}${COLOR.cyan}║             🛡️  PIXIBUN ATELIER — LOCAL CI/CD QUALITY GATE              ║${COLOR.reset}`);
  log(`${COLOR.bold}${COLOR.cyan}╚═════════════════════════════════════════════════════════════════════════╝${COLOR.reset}`);
  log(`${COLOR.dim}Running zero-cost local verification suite before release / push...${COLOR.reset}`);
  log('');
}

const stages = [
  {
    name: 'Stage 1: Documentation & Sync Invariant Audit',
    command: 'npm',
    args: ['run', 'verify:docs'],
    description: 'Validates phase uniqueness, section monotonicity, test counters, and version parity.',
  },
  {
    name: 'Stage 2: Static Type Safety Invariant (0 Errors)',
    command: 'npm',
    args: ['run', 'typecheck'],
    description: 'Enforces strict TypeScript compilation without type-stripping.',
  },
  { name: 'Stage 3: Lint and accessibility rules', command: 'npm', args: ['run', 'lint'], description: 'Checks source and test lint rules.' },
  {
    name: 'Stage 4: Unit & Defensive Invariant Test Suite',
    command: 'npm',
    args: ['test'],
    description: 'Executes all Vitest test suites (pure TS algorithms, safety invariants, ISOBMFF, Wang autotile).',
  },
];

if (withBuild) {
  stages.push({
    name: 'Stage 5: Next.js Production Compilation & Bundling',
    command: 'npm',
    args: ['run', 'build'],
    description: 'Validates complete Next.js static generation, route trees, and bundle chunks.',
  });
}

async function runGate() {
  printHeader();
  const overallStart = performance.now();
  let passedStages = 0;

  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i];
    const stageNum = i + 1;
    log(`${COLOR.bold}${COLOR.magenta}[${stageNum}/${stages.length}] ${stage.name}${COLOR.reset}`);
    log(`${COLOR.dim}  ↳ ${stage.description}${COLOR.reset}`);

    const stageStart = performance.now();
    const result = spawnSync(stage.command, stage.args, {
      stdio: 'inherit',
      shell: true,
      env: process.env,
    });
    const stageDuration = ((performance.now() - stageStart) / 1000).toFixed(2);

    if (result.status !== 0) {
      log('');
      log(`${COLOR.bold}${COLOR.red}❌ FAILED: ${stage.name} (exited with code ${result.status}) [${stageDuration}s]${COLOR.reset}`);
      log(`${COLOR.yellow}⚠️  Quality Gate intercepted a failure. Push/Release blocked.${COLOR.reset}`);
      log('');
      process.exit(result.status ?? 1);
    }

    log(`${COLOR.green}✓ ${stage.name} PASSED in ${stageDuration}s${COLOR.reset}`);
    log('');
    passedStages++;
  }

  const totalDuration = ((performance.now() - overallStart) / 1000).toFixed(2);
  log(`${COLOR.bold}${COLOR.green}═════════════════════════════════════════════════════════════════════════${COLOR.reset}`);
  log(`${COLOR.bold}${COLOR.green}🎉 ALL ${passedStages} QUALITY GATES PASSED SUCCESSFULLY (${totalDuration}s)${COLOR.reset}`);
  log(`${COLOR.dim}Configured checks passed. Browser, accessibility and performance evidence are separate.${COLOR.reset}`);
  log(`${COLOR.bold}${COLOR.green}═════════════════════════════════════════════════════════════════════════${COLOR.reset}`);
  log('');
  process.exit(0);
}

runGate().catch((err) => {
  console.error('Fatal gate error:', err);
  process.exit(1);
});
