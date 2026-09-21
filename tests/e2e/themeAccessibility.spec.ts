import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

interface ThemeCombo {
  name: string;
  studioTheme: 'atelier' | 'cozy-classic';
  colorScheme: 'dark' | 'light';
}

const THEMES: ThemeCombo[] = [
  { name: 'Atelier Dark', studioTheme: 'atelier', colorScheme: 'dark' },
  { name: 'Atelier Light', studioTheme: 'atelier', colorScheme: 'light' },
  { name: 'Cozy Classic Dark', studioTheme: 'cozy-classic', colorScheme: 'dark' },
  { name: 'Cozy Classic Light', studioTheme: 'cozy-classic', colorScheme: 'light' },
];

test.describe('Four-Theme Rendered Browser Accessibility Audits', () => {
  for (const theme of THEMES) {
    test.describe(`${theme.name} Theme Accessibility Suite`, () => {
      test.beforeEach(async ({ page }) => {
        await page.goto('/studio');
        await page.waitForLoadState('domcontentloaded');
        await expect(page.locator('div[role="application"]')).toBeVisible();

        // Allow React hydration to complete
        await page.waitForTimeout(1100);

        // Apply theme attributes synchronously to DOM
        await page.evaluate(
          ({ studioTheme, colorScheme }) => {
            const root = document.documentElement;
            root.setAttribute('data-studio-theme', studioTheme);
            root.setAttribute('data-color-scheme', colorScheme);
            root.setAttribute('data-theme', colorScheme);
            if (colorScheme === 'light') {
              root.classList.add('light');
              root.classList.remove('dark');
              root.style.colorScheme = 'light';
            } else {
              root.classList.add('dark');
              root.classList.remove('light');
              root.style.colorScheme = 'dark';
            }
          },
          { studioTheme: theme.studioTheme, colorScheme: theme.colorScheme }
        );

        // Allow theme CSS variables to propagate and animations to settle
        await page.waitForTimeout(300);
      });

      test(`shell and blank canvas meet WCAG standards under ${theme.name}`, async ({ page }) => {
        const canvas = page.getByTestId('main-composite-canvas');
        await expect(canvas).toBeVisible();

        const results = await new AxeBuilder({ page })
          .withTags(WCAG_TAGS)
          .analyze();

        const blockingViolations = results.violations.filter(
          (v) => v.impact === 'critical' || v.impact === 'serious'
        );
        expect(blockingViolations).toEqual([]);
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
        const galleryBtn = page.getByRole('button', { name: /Projects Gallery|Projects/i }).or(page.getByTestId('gallery-button'));
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
