#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

function escapeXml(unsafe) {
  if (unsafe == null) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function convertSummaryToJunit(summaryPath, junitPath) {
  const fullSummaryPath = resolve(summaryPath);
  if (!existsSync(fullSummaryPath)) {
    console.warn(`Summary file not found at ${fullSummaryPath}, skipping JUnit XML generation.`);
    return;
  }

  const raw = readFileSync(fullSummaryPath, 'utf8');
  let summary;
  try {
    summary = JSON.parse(raw);
  } catch (err) {
    console.error(`Failed to parse summary JSON from ${fullSummaryPath}:`, err);
    return;
  }

  const runs = summary.runs || [];
  let testcaseNodes = '';

  for (const r of runs) {
    const timeSec = ((r.durationMs || 0) / 1000).toFixed(2);
    const testName = escapeXml(r.title || r.testName || r.testId || 'Unknown Test');
    const testId = escapeXml(r.testId || '');
    let childNode = '';

    if (r.status === 'failed') {
      const msg = escapeXml(r.error || 'Test run failed');
      childNode = `\n      <failure message="${msg}">${msg}</failure>`;
    } else if (r.status === 'blocked' || r.status === 'skipped') {
      const msg = escapeXml(r.status || 'Test skipped');
      childNode = `\n      <skipped message="${msg}"/>`;
    }

    testcaseNodes += `    <testcase classname="testsprite.replay" name="${testName}" id="${testId}" time="${timeSec}">${childNode}</testcase>\n`;
  }

  const total = summary.total ?? runs.length;
  const failures = summary.failed ?? 0;
  const skipped = (summary.skipped ?? 0) + (summary.timedOut ?? 0);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites>
  <testsuite name="testsprite-stored-replay" tests="${total}" failures="${failures}" errors="0" skipped="${skipped}">
${testcaseNodes}  </testsuite>
</testsuites>
`;

  writeFileSync(resolve(junitPath), xml, 'utf8');
  console.log(`Wrote JUnit XML report to: ${resolve(junitPath)}`);
}

// CLI execution
if (process.argv[1] && process.argv[1].endsWith('generate-junit-xml.mjs')) {
  const input = process.argv[2] || './test-results/summary.json';
  const output = process.argv[3] || './test-results/junit.xml';
  convertSummaryToJunit(input, output);
}
