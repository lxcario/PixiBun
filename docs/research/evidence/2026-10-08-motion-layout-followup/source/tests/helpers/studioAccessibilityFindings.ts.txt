import type { Page, TestInfo } from '@playwright/test';
import type { Result } from 'axe-core';
import { writeFile } from 'node:fs/promises';

/** Record the explicitly requested compact dock limitation; never claim conformance. */
export async function unexpectedStudioAccessibilityFindings(page: Page, violations: Result[], info: TestInfo, options: { all?: boolean; label?: string } = {}) {
  const findings = options.all ? violations : violations.filter(issue => issue.impact === 'serious' || issue.impact === 'critical');
  await writeFile(info.outputPath(`${options.label ?? 'accessibility-findings'}.json`), JSON.stringify(findings, null, 2));
  const accepted = new Set<string>();
  for (const issue of findings.filter(issue => issue.id === 'target-size')) for (const node of issue.nodes) {
    const selector = node.target.length === 1 && typeof node.target[0] === 'string' ? node.target[0] : null;
    if (selector && await page.locator(selector).evaluate(element => Boolean(element.closest('[data-testid="toolbar-color-dock"]')) && /^(?:Primary color |Secondary color |Quick color |Swap colors \(X\)$|Reset default black and white colors \(Shift\+D\)$|Quick Swatches Flyout$)/.test(element.getAttribute('aria-label') ?? ''))) accepted.add(selector);
  }
  return findings.filter(issue => issue.id !== 'target-size' || issue.nodes.some(node => node.target.length !== 1 || !accepted.has(String(node.target[0]))));
}
