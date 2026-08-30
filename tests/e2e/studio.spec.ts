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

    const guideBtn = page.getByRole('button', { name: /Atelier Guide, Diagnostics and Shortcuts|Guide/i });
    await expect(guideBtn).toBeVisible();
    await page.waitForTimeout(400);
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

  test('handles canvas stroke drawing and undo/redo with pixel verification', async ({ page }) => {
    await page.goto('/studio');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('div[role="application"]')).toBeVisible();

    // Wait for initial Dexie / store hydration to settle
    await page.waitForTimeout(500);

    const canvas = page.locator('canvas[data-testid="main-composite-canvas"]');
    await expect(canvas).toBeVisible();

    const undoBtn = page.getByTitle(/Undo \(Ctrl\+Z\)/i);
    const redoBtn = page.getByTitle(/Redo \(Ctrl\+Y\)/i);

    // Initial state: undo and redo should be disabled on fresh canvas
    await expect(undoBtn).toBeDisabled();
    await expect(redoBtn).toBeDisabled();

    // Sample baseline pixel at coordinate (16, 16)
    const getPixel = async (x: number, y: number): Promise<[number, number, number, number]> => {
      return await page.evaluate(({ x, y }) => {
        const cvs = document.querySelector('canvas[data-testid="main-composite-canvas"]') as HTMLCanvasElement;
        const ctx = cvs?.getContext('2d', { willReadFrequently: true });
        if (!ctx) return [0, 0, 0, 0];
        const p = ctx.getImageData(x, y, 1, 1).data;
        return [p[0], p[1], p[2], p[3]];
      }, { x, y });
    };

    const baselinePixel = await getPixel(16, 16);

    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      // Draw stroke covering pixel (16, 16)
      const targetX = box.x + (box.width / 32) * 16.5;
      const targetY = box.y + (box.height / 32) * 16.5;

      await page.mouse.move(targetX, targetY);
      await page.mouse.down();
      await page.mouse.move(targetX + 5, targetY + 5);
      await page.mouse.up();
    }

    // Wait for composite render and store updates
    await page.waitForTimeout(100);

    // Verify Undo is enabled and Redo is disabled
    await expect(undoBtn).toBeEnabled();
    await expect(redoBtn).toBeDisabled();

    // Verify pixel has been drawn
    const strokedPixel = await getPixel(16, 16);
    expect(strokedPixel[3]).toBeGreaterThan(0);
    expect(strokedPixel).not.toEqual(baselinePixel);

    // Trigger Undo via Ctrl+Z
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(100);

    // Verify undo restored baseline pixel and enabled redo
    const undonePixel = await getPixel(16, 16);
    expect(undonePixel).toEqual(baselinePixel);
    await expect(undoBtn).toBeDisabled();
    await expect(redoBtn).toBeEnabled();

    // Trigger Redo via Ctrl+Y
    await page.keyboard.press('Control+y');
    await page.waitForTimeout(100);

    // Verify redo reapplied the stroked pixel
    const redonePixel = await getPixel(16, 16);
    expect(redonePixel).toEqual(strokedPixel);
    await expect(undoBtn).toBeEnabled();
    await expect(redoBtn).toBeDisabled();
  });
});

