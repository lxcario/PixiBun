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
    const studioCta = page.getByRole('link', { name: /OPEN THE DESK/i }).first();
    await expect(studioCta).toBeVisible();

    await expect(page.getByText(/APNG and a Godot kit, ready to drop into a project/)).toBeVisible();
    await expect(page.getByText(/native Godot 4 & Unity exports/)).toHaveCount(0);

    // The bench: one sprite, four engines, one stage canvas that redraws when something on it changes.
    const stage = page.getByRole('img', { name: /^Bun on the bench, / });
    const readout = page.locator('#engine-showcase').getByText(/^[☀↻] /);
    const pixels = () => stage.evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL());
    const tool = (name: string) => page.getByRole('radiogroup', { name: 'Tool' }).getByRole('radio', { name: new RegExp(`^${name}`) });
    await stage.scrollIntoViewIfNeeded();
    await expect(tool('Draw')).toHaveAttribute('aria-checked', 'true');
    await expect(stage).toHaveAccessibleName(/Draw tool/);

    // Draw: keyboard painting edits the sprite and enables Start over.
    const undo = page.getByRole('button', { name: 'Undo every edit to Bun' });
    await expect(undo).toBeDisabled();
    const beforePaint = await pixels();
    await stage.press('ArrowRight');
    await stage.press(' ');
    await expect(undo).toBeEnabled();
    await expect.poll(pixels).not.toBe(beforePaint);

    // Light: the lamp swings in, then arrow keys move it in 15° steps and the stage relights.
    await tool('Light').click();
    await expect(stage).toHaveAccessibleName(/Light tool/);
    await expect(readout).toHaveText('☀ 315° · up 50°');
    const beforeLamp = await pixels();
    await stage.press('ArrowRight');
    await expect(readout).toHaveText('☀ 330° · up 50°');
    await expect.poll(pixels).not.toBe(beforeLamp);
    const gold = page.getByRole('button', { name: 'Gold', exact: true });
    await expect(gold).toHaveAttribute('aria-pressed', 'false');
    const beforeGold = await pixels();
    await gold.click();
    await expect(gold).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(pixels).not.toBe(beforeGold);

    // Turn: number keys switch tools; snaps and arrows set the RotSprite angle.
    await stage.press('3');
    await expect(tool('Turn')).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByText('plain turn', { exact: true })).toBeVisible();
    const beforeTurn = await pixels();
    await page.getByRole('button', { name: '45°', exact: true }).click();
    await expect(readout).toHaveText('↻ 45°');
    await expect.poll(pixels).not.toBe(beforeTurn);
    await stage.press('ArrowRight');
    await expect(readout).toHaveText('↻ 50°');

    // Hop: the edited sprite loops on its own and the GIF export is offered.
    await tool('Hop').click();
    await expect(stage).toHaveAccessibleName(/Hop tool/);
    await expect(page.getByRole('button', { name: 'Save GIF', exact: true })).toBeVisible();
    const hopFrame = await pixels();
    await expect.poll(pixels).not.toBe(hopFrame);

    // Navigation must remain responsive while the hop animates.
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
