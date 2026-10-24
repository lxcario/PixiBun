#!/usr/bin/env node
import { readFileSync, appendFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

export function renderStepSummary(summaryPath, stepSummaryEnvPath) {
  const fullSummaryPath = resolve(summaryPath);
  if (!existsSync(fullSummaryPath)) return;

  const summary = JSON.parse(readFileSync(fullSummaryPath, 'utf8'));
  const runs = summary.runs || [];

  const lines = [
    '### TestSprite Stored Python Replay Results',
    '',
    '| Metric | Value |',
    '| :--- | :--- |',
    `| **Total Tests** | \`${summary.total ?? runs.length}\` |`,
    `| **Passed** | :white_check_mark: \`${summary.passed ?? 0}\` |`,
    `| **Failed** | :x: \`${summary.failed ?? 0}\` |`,
    `| **Skipped / Blocked** | :warning: \`${(summary.skipped ?? 0) + (summary.timedOut ?? 0)}\` |`,
    '',
    '#### Test Execution Breakdown',
    ''
  ];

  if (runs.length === 0) {
    lines.push('_No individual test runs reported._');
  } else {
    for (const r of runs) {
      const name = r.title || r.testName || r.testId || 'Unknown Test';
      const statusIcon = r.status === 'passed' ? ':white_check_mark: **Passed**' : `:x: **${r.status}**`;
      const timeStr = r.durationMs ? ` (${(r.durationMs / 1000).toFixed(1)}s)` : '';
      const execLink = r.executionUrl ? ` — [TestSprite Trace](${r.executionUrl})` : '';
      lines.push(`- **${name}**: ${statusIcon}${timeStr}${execLink}`);
      if (r.error) {
        lines.push(`  > :stop_sign: ${r.error}`);
      }
    }
  }
  lines.push('');

  const output = lines.join('\n');
  if (stepSummaryEnvPath && existsSync(stepSummaryEnvPath)) {
    appendFileSync(stepSummaryEnvPath, output, 'utf8');
  }
  process.stdout.write(output);
}

if (process.argv[1] && process.argv[1].endsWith('generate-step-summary.mjs')) {
  const input = process.argv[2] || './test-results/summary.json';
  const summaryDest = process.env.GITHUB_STEP_SUMMARY || process.argv[3];
  renderStepSummary(input, summaryDest);
}
