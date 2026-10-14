import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { unexpectedStudioAccessibilityFindings } from '../helpers/studioAccessibilityFindings';
import { STUDIO_THEMES } from '../../src/lib/theme/registry';

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

interface ThemeCombo {
  name: string;
  studioTheme: string;
  colorScheme: 'dark' | 'light';
}

// Every registered theme, at night and by day.
const THEMES: ThemeCombo[] = STUDIO_THEMES.flatMap(theme => [
  { name: `${theme.name} Night`, studioTheme: theme.id, colorScheme: 'dark' as const },
  { name: `${theme.name} Day`, studioTheme: theme.id, colorScheme: 'light' as const },
]);

test.describe('Rendered Browser Accessibility Audits for Every Theme', () => {
  for (const theme of THEMES) {
    test.describe(`${theme.name} Theme Accessibility Suite`, () => {
      test.beforeEach(async ({ page }) => {
        // The saved choice is the real path: /theme.js applies it before paint and ThemeSync keeps it.
        await page.addInitScript(({ studioTheme, colorScheme }) => {
          localStorage.setItem('pixibun-studio-theme', studioTheme);
          localStorage.setItem('pixibun-color-scheme', colorScheme);
        }, { studioTheme: theme.studioTheme, colorScheme: theme.colorScheme });
        await page.goto('/studio');
        await page.waitForLoadState('domcontentloaded');
        await expect(page.locator('div[role="application"]')).toBeVisible();
        await expect(page.locator('html')).toHaveAttribute('data-studio-theme', theme.studioTheme);
        await expect(page.locator('html')).toHaveAttribute('data-color-scheme', theme.colorScheme);

        // Allow theme CSS variables to propagate and animations to settle
        await page.waitForTimeout(300);
      });

      test(`shell and blank canvas record accessibility findings and the requested compact dock tradeoff under ${theme.name}`, async ({ page }, info) => {
        const canvas = page.getByTestId('main-composite-canvas');
        await expect(canvas).toBeVisible();

        await page.getByRole('button', { name: 'Studio options' }).click();
        await expect(page.getByRole('dialog', { name: 'Studio options' })).toBeInViewport();
        const studioResults = await new AxeBuilder({ page }).include('[role="dialog"]').withTags(WCAG_TAGS).analyze();
        expect(studioResults.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')).toEqual([]);
        await page.keyboard.press('Escape');

        const results = await new AxeBuilder({ page })
          .withTags(WCAG_TAGS)
          .analyze();

        expect(await unexpectedStudioAccessibilityFindings(page, results.violations, info)).toEqual([]);
      });

      test(`right inspector tabs meet WCAG standards under ${theme.name}`, async ({ page }) => {
        const inspector = page.getByTestId('right-inspector');
        await expect(inspector).toBeVisible();

        // Check Layers tab
        const layersTab = page.getByTestId('tab-layers');
        await layersTab.click();
        await page.waitForTimeout(150);

        let results = await new AxeBuilder({ page })
          .include('[data-testid="right-inspector"]')
          .withTags(WCAG_TAGS)
          .analyze();
        let blocking = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
        expect(blocking).toEqual([]);

        // Check Palette tab
        const paletteTab = page.getByTestId('tab-palette');
        await paletteTab.click();
        await page.waitForTimeout(150);

        results = await new AxeBuilder({ page })
          .include('[data-testid="right-inspector"]')
          .withTags(WCAG_TAGS)
          .analyze();
        blocking = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
        expect(blocking).toEqual([]);

        // Check AI / PixiTools tab
        const aiTab = page.getByTestId('tab-ai');
        await aiTab.click();
        await page.waitForTimeout(150);

        results = await new AxeBuilder({ page })
          .include('[data-testid="right-inspector"]')
          .withTags(WCAG_TAGS)
          .analyze();
        blocking = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
        expect(blocking).toEqual([]);

        // Include the open lighting controls, not only the task chooser.
        await page.getByTestId('pixitools-task-lighting').click();
        await expect(page.getByRole('button', { name: 'Preview lighting', exact: true })).toBeVisible();
        results = await new AxeBuilder({ page })
          .include('[data-testid="right-inspector"]')
          .withTags(WCAG_TAGS)
          .analyze();
        blocking = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
        expect(blocking).toEqual([]);
      });

      test(`export modal dialog meets WCAG standards under ${theme.name}`, async ({ page }) => {
        const exportBtn = page.getByRole('button', { name: /Export drawing|Export/i }).or(page.getByTestId('export-button'));
        await expect(exportBtn.first()).toBeVisible();
        await exportBtn.first().click();

        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible({ timeout: 10000 });
        await page.waitForTimeout(300);

        const results = await new AxeBuilder({ page })
          .include('dialog[open], [role="dialog"]')
          .withTags(WCAG_TAGS)
          .analyze();

        const blocking = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
        expect(blocking).toEqual([]);

        await page.keyboard.press('Escape');
        await expect(dialog).not.toBeVisible();
      });

      test(`projects gallery modal meets WCAG standards under ${theme.name}`, async ({ page }) => {
        await page.getByTestId('file-menu-button').click();
        const fileResults = await new AxeBuilder({ page }).include('[role="menu"]').withTags(WCAG_TAGS).analyze();
        expect(fileResults.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')).toEqual([]);
        const galleryBtn = page.getByRole('menuitem', { name: 'Projects', exact: true });
        await expect(galleryBtn.first()).toBeVisible();
        await galleryBtn.first().click();

        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible({ timeout: 10000 });
        await page.waitForTimeout(300);

        const results = await new AxeBuilder({ page })
          .include('dialog[open], [role="dialog"]')
          .withTags(WCAG_TAGS)
          .analyze();

        const blocking = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
        expect(blocking).toEqual([]);

        await page.keyboard.press('Escape');
        await expect(dialog).not.toBeVisible();
      });

      test(`toast alert notification meets WCAG standards under ${theme.name}`, async ({ page }) => {
        const saveBtn = page.getByRole('button', { name: /Save now|Save/i });
        await expect(saveBtn.first()).toBeVisible();
        await saveBtn.first().click();

        const toast = page.locator('[data-testid="save-affirmation-toast"], [data-testid="studio-toast"]');
        await expect(toast).toBeVisible({ timeout: 5000 });
        await page.waitForTimeout(150);

        const results = await new AxeBuilder({ page })
          .include('[data-testid="save-affirmation-toast"], [data-testid="studio-toast"]')
          .withTags(WCAG_TAGS)
          .analyze();

        const blocking = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
        expect(blocking).toEqual([]);
      });
    });
  }
});
