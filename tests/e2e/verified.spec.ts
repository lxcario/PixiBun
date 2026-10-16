import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';
import { STUDIO_THEMES } from '../../src/lib/theme/registry';

const ledger = JSON.parse(fs.readFileSync('docs/testsprite/loop-ledger.json', 'utf8')) as { entries: unknown[] };

test.describe('/verified', () => {
  test('shows the loop, the counts and the committed ledger without errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto('/verified');
    await expect(page).toHaveTitle(/How PixiBun is tested/);
    await expect(page.getByRole('heading', { level: 1, name: 'Tested on every pull request.' })).toBeVisible();
    await expect(page.getByTestId('verified-loop-steps').getByRole('listitem')).toHaveCount(5);
    await expect(page.getByTestId('verified-prs-checked')).toContainText(String(ledger.entries.length));

    if (ledger.entries.length === 0) await expect(page.getByTestId('loop-ledger-empty')).toBeVisible();
    else await expect(page.getByTestId('loop-ledger-row')).toHaveCount(ledger.entries.length);

    const nav = page.getByRole('navigation', { name: 'More about testing' });
    await expect(nav.getByRole('link', { name: 'README: Tested on every pull request' })).toHaveAttribute('href', /#tested-on-every-pull-request$/);
    await nav.getByRole('link', { name: /Our pledge/ }).click();
    await expect(page).toHaveURL(/\/pledge$/);
    await page.getByRole('link', { name: 'How PixiBun is tested →' }).click();
    await expect(page).toHaveURL(/\/verified$/);

    expect(consoleErrors).toHaveLength(0);
  });

  test('fits a phone screen without sideways scrolling', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/verified');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });

  for (const theme of STUDIO_THEMES) {
    for (const colorScheme of ['dark', 'light'] as const) {
      test(`passes an automated WCAG 2.2 AA scan in ${theme.name} ${colorScheme === 'dark' ? 'Night' : 'Day'}`, async ({ page }) => {
        await page.addInitScript(({ studioTheme, scheme }) => {
          localStorage.setItem('pixibun-studio-theme', studioTheme);
          localStorage.setItem('pixibun-color-scheme', scheme);
        }, { studioTheme: theme.id, scheme: colorScheme });
        await page.goto('/verified');
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        await expect(page.locator('html')).toHaveAttribute('data-studio-theme', theme.id);
        await expect(page.locator('html')).toHaveAttribute('data-color-scheme', colorScheme);
        const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
        expect(results.violations.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(' ')).join(', ')}`)).toEqual([]);
      });
    }
  }
});
