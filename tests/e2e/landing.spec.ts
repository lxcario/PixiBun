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

    await expect(page.getByText(/take a Godot kit into your game/)).toBeVisible();
    await expect(page.getByText(/native Godot 4 & Unity exports/)).toHaveCount(0);

    // Navigation must remain responsive while the default lighting demo animates.
    const orbit = page.getByTitle('Toggle automatic orbital rotation', { exact: true });
    const light = page.getByRole('slider', { name: /Interactive 2.5D Light Direction Gizmo/ });
    const preview = page.locator('canvas[aria-label^="2.5D Photometrically shaded"]');
    const pixels = () => preview.evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL());
    await expect(orbit).toHaveText('⏸ Orbit');
    const initialPixels = await pixels();
    await expect.poll(pixels).not.toBe(initialPixels);

    await orbit.click();
    await expect(orbit).toHaveText('▶ Auto-Orbit');
    await light.press('Home');
    await expect(light).toHaveAttribute('aria-valuenow', '0');
    await light.press('ArrowRight');
    await expect(light).toHaveAttribute('aria-valuenow', '15');
    await orbit.click();
    await expect(orbit).toHaveText('⏸ Orbit');
    const resumedPixels = await pixels();
    await expect.poll(pixels).not.toBe(resumedPixels);

    await page.getByRole('link', { name: 'Playground', exact: true }).click();
    await expect(page).toHaveURL(/\/playground$/, { timeout: 15000 });
    await expect(page.getByRole('button', { name: 'Return to drawing', exact: true })).toBeVisible();

    // Verify no unhandled console errors during landing and the route transition.
    expect(consoleErrors).toHaveLength(0);
  });

  test('passes automated WCAG 2.2 accessibility scan via axe', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    // Dismiss introductory curtain if active
    const curtain = page.locator('div[role="button"][aria-label*="Skip introductory"]');
    if (await curtain.isVisible()) {
      try {
        await curtain.click({ timeout: 2000 });
      } catch {
        await page.keyboard.press('Escape');
      }
    }
    // Wait for entrance animations to settle completely to ensure 100% contrast opacity
    await page.waitForTimeout(1100);

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
