import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { unexpectedStudioAccessibilityFindings } from '../helpers/studioAccessibilityFindings';

for (const studio of ['atelier', 'cozy-classic'] as const) {
  for (const scheme of ['dark', 'light'] as const) {
    test(`compiled ${studio} ${scheme} keeps controls reachable and records the requested compact dock accessibility tradeoff`, async ({ page }, info) => {
      await page.setViewportSize({ width: 1920, height: 900 });
      await page.goto('/studio');
      await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
      await page.getByRole('button', { name: 'Studio options', exact: true }).click();
      await page.getByTestId(`theme-option-${studio}`).click();
      await page.getByTestId(`scheme-option-${scheme}`).click();
      await page.keyboard.press('Escape');
      await expect(page.locator('html')).toHaveAttribute('data-studio-theme', studio);
      await expect(page.locator('html')).toHaveAttribute('data-color-scheme', scheme);
      const header = page.getByRole('banner');
      await header.getByRole('button', { name: /^Rename project/ }).click();
      await header.getByRole('textbox').fill('A long project title for compact controls');
      await header.getByRole('textbox').press('Enter');

      for (const width of [1920, 1280, 1024]) {
        await page.setViewportSize({ width, height: 900 });
        await expect.poll(() => header.evaluate(element => {
          const bounds = element.getBoundingClientRect();
          const boxes = Array.from(element.querySelectorAll<HTMLElement>('button, input:not([type="file"]), select, a'))
            .filter(control => control.getClientRects().length > 0).map(control => control.getBoundingClientRect());
          return bounds.height === 48 && boxes.every(box => box.width >= 24 && box.height >= 24 && box.left >= bounds.left && box.right <= bounds.right && box.top >= bounds.top && box.bottom <= bounds.bottom)
            && boxes.every((box, index) => boxes.slice(index + 1).every(other => Math.min(box.right, other.right) - Math.max(box.left, other.left) <= 1 || Math.min(box.bottom, other.bottom) - Math.max(box.top, other.top) <= 1));
        }), `${studio}/${scheme} controls fit without overlap at ${width}px`).toBe(true);
      }

      await page.getByLabel('Workspace layout', { exact: true }).selectOption('lighting');
      await expect(page.getByRole('region', { name: 'Pinned color panel', exact: true })).toBeVisible();
      const result = await new AxeBuilder({ page }).include('header').include('aside').include('[aria-label="Pinned color panel"]')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      expect(await unexpectedStudioAccessibilityFindings(page, result.violations, info)).toEqual([]);
      await page.getByTestId('tab-palette').click();
      await expect(page.getByRole('region', { name: 'Pinned color panel', exact: true })).toHaveCount(1);
      await page.getByRole('button', { name: 'Unpin color panel', exact: true }).click();
      await expect(page.getByRole('region', { name: 'Pinned color panel', exact: true })).toHaveCount(0);
      await expect(page.getByRole('region', { name: 'Palette color picker', exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Pin color panel', exact: true }).click();
      await page.getByTestId('tab-layers').click();
      await expect(page.getByRole('region', { name: 'Pinned color panel', exact: true })).toBeVisible();
      await page.reload();
      await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
      await expect(page.getByRole('region', { name: 'Pinned color panel', exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Unpin color panel', exact: true }).click();
      await expect(page.getByRole('region', { name: 'Pinned color panel', exact: true })).toHaveCount(0);
    });
  }
}
