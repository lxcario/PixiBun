#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const targetUrl = process.env.TARGET_URL || process.argv[2];
const testIdsRaw = process.env.TEST_IDS || process.argv[3] || '59fc51e1-ce16-4ad1-9ea4-392dcca93fd7 1165bc74-c877-4d9f-a3ad-ad58dd3f6729';
const outputDir = resolve(process.env.RESULTS_DIR || './test-results');

if (!targetUrl) {
  console.error('::error title=Configuration Error::TARGET_URL is required.');
  process.exit(1);
}

const testIds = testIdsRaw.trim().split(/\s+/).filter(Boolean);
if (testIds.length === 0) {
  console.error('::error title=Configuration Error::No test IDs provided.');
  process.exit(1);
}

mkdirSync(outputDir, { recursive: true });

console.log(`Replaying ${testIds.length} stored Python test(s) against ${targetUrl}:`);
testIds.forEach((id, idx) => console.log(`  [${idx + 1}/${testIds.length}] ${id}`));

const aggregate = {
  total: testIds.length,
  passed: 0,
  failed: 0,
  skipped: 0,
  timedOut: 0,
  runs: []
};

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function run() {
  let anyFailed = false;

  for (let i = 0; i < testIds.length; i++) {
    const testId = testIds[i];
    const summaryFile = resolve(outputDir, `summary-${testId}.json`);
    console.log(`\n==================================================`);
    console.log(`[${i + 1}/${testIds.length}] Running TestSprite replay for: ${testId}`);
    console.log(`==================================================\n`);

    const args = [
      'test', 'run', testId,
      '--target-url', targetUrl,
      '--no-auto-heal',
      '--wait',
      '--timeout', '600',
      '--gh-output',
      '--summary-file', summaryFile
    ];

    const testspriteBin = process.env.TESTSPRITE_BIN || (process.platform === 'win32' ? 'testsprite.cmd' : 'testsprite');
    let result;
    const maxRetries = 30;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      result = spawnSync(testspriteBin, args, { stdio: 'inherit', env: process.env });

      // Code 11: rate limit or in-flight cap hit (e.g. concurrent App batch execution)
      if (result.status === 11 && attempt < maxRetries) {
        console.warn(`\n[in-flight cap / throttle] Exit code 11 received. Waiting 30s for queue to drain (retry ${attempt}/${maxRetries})...\n`);
        await sleep(30000);
        continue;
      }
      break;
    }

    if (existsSync(summaryFile)) {
      try {
        const summary = JSON.parse(readFileSync(summaryFile, 'utf8'));
        if (Array.isArray(summary.runs)) {
          aggregate.runs.push(...summary.runs);
        }
        aggregate.passed += (summary.passed || 0);
        aggregate.failed += (summary.failed || 0);
        aggregate.skipped += (summary.skipped || 0);
        aggregate.timedOut += (summary.timedOut || 0);
      } catch (e) {
        console.warn(`Could not parse summary file for ${testId}:`, e.message);
      }
    } else {
      aggregate.runs.push({
        testId,
        status: result.status === 0 ? 'passed' : 'failed',
        error: `Command exited with code ${result.status}`
      });
      if (result.status === 0) aggregate.passed++;
      else aggregate.failed++;
    }

    if (result.status !== 0) {
      anyFailed = true;
      console.error(`\n::error title=Test Replay Failed::Test ${testId} exited with code ${result.status}`);
    }
  }

  const aggregateFile = resolve(outputDir, 'summary.json');
  writeFileSync(aggregateFile, JSON.stringify(aggregate, null, 2), 'utf8');
  console.log(`\nWrote aggregate summary to: ${aggregateFile}`);

  process.exit(anyFailed ? 1 : 0);
}

run().catch(err => {
  console.error('Fatal replay suite error:', err);
  process.exit(1);
});
