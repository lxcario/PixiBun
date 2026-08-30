import { test, expect } from '@playwright/test';

test.describe('Studio Workbench & Drawing Interactions', () => {
  test('loads Studio workspace, renders canvas stage and panels', async ({ page }) => {
    await page.goto('/studio');
    await page.waitForLoadState('domcontentloaded');

    // Canvas stage is present with accessibility role
    const stage = page.locator('div[role="application"]');
    await expect(stage).toBeVisible();

    // Verify key studio UI regions
    await expect(page.getByTitle(/Start a New Blank Drawing/i)).toBeVisible();
    await expect(page.getByTitle(/Atelier Guide, Diagnostics & Shortcuts/i)).toBeVisible();
    await expect(page.getByTitle(/Export PNG, GIF, or Spritesheet/i)).toBeVisible();
  });

  test('opens Guide and Shortcuts modal via hotkey and button', async ({ page }) => {
    await page.goto('/studio');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('div[role="application"]')).toBeVisible();
    await page.waitForTimeout(300);

    // Open via Guide button
    const guideBtn = page.getByRole('button', { name: /Atelier Guide, Diagnostics and Shortcuts|Guide/i });
    await guideBtn.click();

    await expect(page.getByText(/Atelier Guide & Shortcuts/i)).toBeVisible();

    // Close dialog using Close dialog button
    const closeBtn = page.getByRole('button', { name: 'Close dialog' });
    await closeBtn.click();
    await expect(page.getByText(/Atelier Guide & Shortcuts/i)).not.toBeVisible();

    // Open via '?' keypress
    await page.keyboard.press('?');
    await expect(page.getByText(/Atelier Guide & Shortcuts/i)).toBeVisible();
  });

  test('handles canvas stroke drawing and undo/redo', async ({ page }) => {
    await page.goto('/studio');
    await page.waitForLoadState('domcontentloaded');

    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();

    const box = await canvas.boundingBox();
    if (box) {
      // Simulate drawing stroke on canvas
      await page.mouse.move(box.x + 50, box.y + 50);
      await page.mouse.down();
      await page.mouse.move(box.x + 80, box.y + 80);
      await page.mouse.up();
    }

    // Trigger Undo via Ctrl+Z
    await page.keyboard.press('Control+z');

    // Trigger Redo via Ctrl+Y
    await page.keyboard.press('Control+y');
  });
});
