import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Landing Page & Accessibility', () => {
  test('renders landing page, hero, and interactive features without console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveTitle(/PixiBun/);

    // Verify presence of call to action leading to Studio
    const studioCta = page.getByRole('link', { name: /OPEN THE ATELIER|Enter the Atelier/i }).first();
    await expect(studioCta).toBeVisible();

    // Verify no unhandled console errors during landing load
    expect(consoleErrors).toHaveLength(0);
  });

  test('passes automated WCAG 2.2 accessibility scan via axe', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    // Dismiss introductory curtain if active
    const curtain = page.locator('div[role="button"][aria-label*="Skip introductory"]');
    if (await curtain.isVisible()) {
      await curtain.click();
    }
    await page.waitForTimeout(500);

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
