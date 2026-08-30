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

  test('onion skin ghosts never pollute eyedropper and empty picks are no-ops', async ({ page }) => {
    await page.goto('/studio');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('div[role="application"]')).toBeVisible();
    await page.waitForTimeout(500);

    const canvas = page.locator('canvas[data-testid="main-composite-canvas"]');
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;

    // 1. Draw a stroke on Frame 1 at (16, 16)
    const targetX = box.x + (box.width / 32) * 16.5;
    const targetY = box.y + (box.height / 32) * 16.5;
    await page.mouse.move(targetX, targetY);
    await page.mouse.down();
    await page.mouse.move(targetX + 4, targetY + 4);
    await page.mouse.up();
    await page.waitForTimeout(100);

    // Sample drawn pixel color on Frame 1
    const frame1Pixel = await page.evaluate(({ x, y }) => {
      const cvs = document.querySelector('canvas[data-testid="main-composite-canvas"]') as HTMLCanvasElement;
      const ctx = cvs?.getContext('2d', { willReadFrequently: true });
      if (!ctx) return [0, 0, 0, 0];
      const p = ctx.getImageData(x, y, 1, 1).data;
      return [p[0], p[1], p[2], p[3]];
    }, { x: 16, y: 16 });
    expect(frame1Pixel[3]).toBeGreaterThan(0);

    // 2. Add a new blank frame (Frame 2)
    const addFrameBtn = page.getByTitle(/Add Blank Frame/i);
    await addFrameBtn.click();
    await page.waitForTimeout(200);

    // 3. Enable Onion Skinning
    const onionBtn = page.getByTitle(/Toggle Onion Skinning/i);
    await onionBtn.click();
    await page.waitForTimeout(200);

    // Verify onion skin canvas has ghost pixels at (16, 16)
    const ghostPixelAlpha = await page.evaluate(({ x, y }) => {
      const cvs = document.querySelector('canvas[data-testid="onion-skin-canvas"]') as HTMLCanvasElement;
      const ctx = cvs?.getContext('2d', { willReadFrequently: true });
      if (!ctx) return 0;
      const p = ctx.getImageData(x, y, 1, 1).data;
      return p[3];
    }, { x: 16, y: 16 });
    expect(ghostPixelAlpha).toBeGreaterThan(0);

    // Verify main canvas on Frame 2 is empty at (16, 16)
    const frame2MainPixel = await page.evaluate(({ x, y }) => {
      const cvs = document.querySelector('canvas[data-testid="main-composite-canvas"]') as HTMLCanvasElement;
      const ctx = cvs?.getContext('2d', { willReadFrequently: true });
      if (!ctx) return [0, 0, 0, 0];
      const p = ctx.getImageData(x, y, 1, 1).data;
      return [p[0], p[1], p[2], p[3]];
    }, { x: 16, y: 16 });
    expect(frame2MainPixel[3]).toBe(0);

    // 4. Capture current primary color title
    const colorWell = page.locator('button[title*="Primary Color"]');
    const initialTitle = await colorWell.getAttribute('title');

    // 5. Select Eyedropper tool
    const eyedropperBtn = page.getByTitle(/Eyedropper \(I\)/i);
    await eyedropperBtn.click();
    await page.waitForTimeout(100);

    // 6. Click at (16, 16) where the ghost sits on the underlay canvas, but Frame 2 is empty
    await page.mouse.click(targetX, targetY);
    await page.waitForTimeout(100);

    // Assert primary color remains unchanged (no-op on empty pixel, NOT polluted by ghost)
    await expect(colorWell).toHaveAttribute('title', initialTitle || '');

    // 7. Click on an unpainted empty pixel at (4, 4)
    const emptyX = box.x + (box.width / 32) * 4.5;
    const emptyY = box.y + (box.height / 32) * 4.5;
    await page.mouse.click(emptyX, emptyY);
    await page.waitForTimeout(100);

    // Assert primary color still unchanged
    await expect(colorWell).toHaveAttribute('title', initialTitle || '');
  });

  test('timeline renders real thumbnails for frames', async ({ page }) => {
    await page.goto('/studio');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('div[role="application"]')).toBeVisible();
    await page.waitForTimeout(500);

    const canvas = page.locator('canvas[data-testid="main-composite-canvas"]');
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;

    // Verify thumbnail canvas for frame 0 is present
    const thumb0 = page.locator('canvas[data-testid="frame-thumbnail-0"]');
    await expect(thumb0).toBeVisible();

    // Draw stroke on frame 0
    const targetX = box.x + (box.width / 32) * 16.5;
    const targetY = box.y + (box.height / 32) * 16.5;
    await page.mouse.move(targetX, targetY);
    await page.mouse.down();
    await page.mouse.move(targetX + 6, targetY + 6);
    await page.mouse.up();
    await page.waitForTimeout(150);

    // Verify frame 0 thumbnail contains painted pixel data
    const thumb0PaintedCount = await page.evaluate(() => {
      const cvs = document.querySelector('canvas[data-testid="frame-thumbnail-0"]') as HTMLCanvasElement;
      if (!cvs) return 0;
      const ctx = cvs.getContext('2d', { willReadFrequently: true });
      if (!ctx) return 0;
      const img = ctx.getImageData(0, 0, cvs.width, cvs.height);
      let painted = 0;
      for (let i = 3; i < img.data.length; i += 4) {
        if (img.data[i] > 0) painted++;
      }
      return painted;
    });
    expect(thumb0PaintedCount).toBeGreaterThan(0);

    // Add a second frame
    const addFrameBtn = page.getByTitle(/Add Blank Frame/i);
    await addFrameBtn.click();
    await page.waitForTimeout(200);

    const thumb1 = page.locator('canvas[data-testid="frame-thumbnail-1"]');
    await expect(thumb1).toBeVisible();

    // Draw stroke on frame 1
    const targetX1 = box.x + (box.width / 32) * 8.5;
    const targetY1 = box.y + (box.height / 32) * 8.5;
    await page.mouse.move(targetX1, targetY1);
    await page.mouse.down();
    await page.mouse.move(targetX1 + 4, targetY1 + 4);
    await page.mouse.up();
    await page.waitForTimeout(150);

    // Verify frame 1 thumbnail contains painted pixel data
    const thumb1PaintedCount = await page.evaluate(() => {
      const cvs = document.querySelector('canvas[data-testid="frame-thumbnail-1"]') as HTMLCanvasElement;
      if (!cvs) return 0;
      const ctx = cvs.getContext('2d', { willReadFrequently: true });
      if (!ctx) return 0;
      const img = ctx.getImageData(0, 0, cvs.width, cvs.height);
      let painted = 0;
      for (let i = 3; i < img.data.length; i += 4) {
        if (img.data[i] > 0) painted++;
      }
      return painted;
    });
    expect(thumb1PaintedCount).toBeGreaterThan(0);
  });

  test('PixiBud AI renders volumetric optics non-destructively to tagged output layer', async ({ page }) => {
    await page.goto('/studio');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('div[role="application"]')).toBeVisible();
    await page.waitForTimeout(500);

    const canvas = page.locator('canvas[data-testid="main-composite-canvas"]');
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;

    // 1. Draw a block on the active layer
    const targetX = box.x + (box.width / 32) * 16.5;
    const targetY = box.y + (box.height / 32) * 16.5;
    await page.mouse.move(targetX, targetY);
    await page.mouse.down();
    await page.mouse.move(targetX + 8, targetY + 8);
    await page.mouse.up();
    await page.waitForTimeout(150);

    // 2. Switch to PixiBud AI tab
    const aiTabBtn = page.getByRole('button', { name: /PixiBud AI/i });
    await aiTabBtn.click();
    await page.waitForTimeout(150);

    // 3. Select Gemstone preset
    const gemBtn = page.getByRole('button', { name: /💎 Gem/i });
    await expect(gemBtn).toBeVisible();
    await gemBtn.click();
    await page.waitForTimeout(100);

    // 4. Click Render Volumetric Optics
    const renderBtn = page.getByRole('button', { name: /Render Volumetric Optics/i });
    await expect(renderBtn).toBeVisible();
    await renderBtn.click();
    await page.waitForTimeout(200);

    // 5. Switch back to Layers tab
    const layersTabBtn = page.getByRole('button', { name: /Layers/i });
    await layersTabBtn.click();
    await page.waitForTimeout(150);

    // 6. Assert non-destructive output layer 'Optics (gemstone)' exists
    await expect(page.locator('text=Optics (gemstone)')).toBeVisible();
  });
});

