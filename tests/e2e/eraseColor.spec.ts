import { expect, test, type Page } from '@playwright/test';

async function importGreenSheet(page: Page) {
  await page.goto('/studio');
  const canvas = page.getByTestId('main-composite-canvas');
  await expect(canvas).toBeVisible();
  await expect.poll(() => page.evaluate(() => Boolean((window as Window & { __studioStore?: unknown }).__studioStore))).toBe(true);
  const base64 = await page.evaluate(() => {
    const sheet = document.createElement('canvas');
    sheet.width = 64;
    sheet.height = 32;
    const ctx = sheet.getContext('2d')!;
    ctx.fillStyle = '#14d228';
    ctx.fillRect(0, 0, 32, 32);
    ctx.fillStyle = '#19cd2c';
    ctx.fillRect(32, 0, 32, 32);
    ctx.fillStyle = '#ff3030';
    ctx.fillRect(12, 12, 8, 8);
    ctx.fillStyle = '#3030ff';
    ctx.fillRect(44, 12, 8, 8);
    ctx.fillStyle = '#024313';
    ctx.fillRect(1, 1, 1, 1);
    ctx.fillStyle = '#121d1a';
    ctx.fillRect(3, 1, 1, 1);
    ctx.fillStyle = '#d3f1d8';
    ctx.fillRect(4, 4, 1, 1);
    ctx.fillStyle = '#121d1a';
    ctx.fillRect(4, 1, 1, 1);
    ctx.fillStyle = '#1b4534';
    ctx.fillRect(5, 1, 1, 1);
    ctx.fillStyle = '#14202c';
    ctx.fillRect(6, 1, 1, 1);
    return sheet.toDataURL('image/png').split(',')[1];
  });
  await page.locator('input[type=file]').first().setInputFiles({
    name: 'characters_sheet.png', mimeType: 'image/png', buffer: Buffer.from(base64, 'base64'),
  });
  const dialog = page.getByRole('dialog', { name: 'Import Image' });
  await dialog.getByRole('spinbutton', { name: 'Frame cell width in pixels' }).fill('32');
  await dialog.getByRole('spinbutton', { name: 'Frame cell height in pixels' }).fill('32');
  await dialog.getByRole('spinbutton', { name: 'Start X in pixels' }).fill('0');
  await dialog.getByRole('spinbutton', { name: 'Start Y in pixels' }).fill('0');
  await dialog.getByRole('spinbutton', { name: 'Gap X in pixels' }).fill('0');
  await dialog.getByRole('spinbutton', { name: 'Gap Y in pixels' }).fill('0');
  await expect(dialog.getByText('2 cols × 1 rows = 2 total frames')).toBeVisible();
  await dialog.getByRole('button', { name: 'Replace Frames' }).click();
  await dialog.getByRole('button', { name: 'Slice & Import Frames' }).click();
  await expect(dialog).toBeHidden();
  await expect.poll(() => page.evaluate(() => (window as Window & { __studioStore?: { getState: () => { frames: unknown[] } } }).__studioStore!.getState().frames.length)).toBe(2);
  return canvas;
}

async function pixel(page: Page, x: number, y: number) {
  return page.getByTestId('main-composite-canvas').evaluate((canvas: HTMLCanvasElement, point: [number, number]) =>
    Array.from(canvas.getContext('2d')!.getImageData(point[0], point[1], 1, 1).data), [x, y] as [number, number]);
}

async function clickPixel(page: Page, x: number, y: number) {
  const stage = await page.locator('#center-canvas-area').boundingBox();
  expect(stage).not.toBeNull();
  await page.mouse.click(stage!.x + (x + 0.5) * stage!.width / 32, stage!.y + (y + 0.5) * stage!.height / 32);
}

async function thumbnailPixel(page: Page, frameIndex: number, x: number, y: number) {
  return page.getByTestId(`frame-thumbnail-${frameIndex}`).evaluate((canvas: HTMLCanvasElement, point: [number, number]) =>
    Array.from(canvas.getContext('2d')!.getImageData(point[0], point[1], 1, 1).data), [x, y] as [number, number]);
}

test('Erase Sampled Color removes green across animation frames and undo restores both', async ({ page }) => {
  await importGreenSheet(page);
  await page.getByTestId('erase-color-tool').click();
  await expect(page.getByRole('slider', { name: 'Erase Color tolerance' })).toHaveValue('24');
  const scopeBtn = page.getByRole('button', { name: 'Erase Color frame scope' });
  await expect(scopeBtn).toHaveAttribute('aria-pressed', 'false');
  await scopeBtn.click();
  await expect(scopeBtn).toContainText('All frames');
  await expect(scopeBtn).toHaveAttribute('aria-pressed', 'true');
  await clickPixel(page, 2, 2);
  await expect.poll(() => pixel(page, 2, 2)).toEqual([0, 0, 0, 0]);
  expect(await pixel(page, 15, 15)).toEqual([255, 48, 48, 255]);

  // Both timeline thumbnails must update immediately without switching frames
  await expect.poll(() => thumbnailPixel(page, 0, 2, 2)).toEqual([0, 0, 0, 0]);
  await expect.poll(() => thumbnailPixel(page, 1, 2, 2)).toEqual([0, 0, 0, 0]);

  await page.evaluate(() => (window as Window & { __studioStore?: { getState: () => { setActiveFrame: (index: number) => void } } }).__studioStore!.getState().setActiveFrame(1));
  await expect.poll(() => pixel(page, 2, 2)).toEqual([0, 0, 0, 0]);
  expect(await pixel(page, 15, 15)).toEqual([48, 48, 255, 255]);

  await page.getByTestId('undo-button').click();
  await page.evaluate(() => (window as Window & { __studioStore?: { getState: () => { setActiveFrame: (index: number) => void } } }).__studioStore!.getState().setActiveFrame(0));
  await expect.poll(() => pixel(page, 2, 2)).toEqual([20, 210, 40, 255]);
  await page.evaluate(() => (window as Window & { __studioStore?: { getState: () => { setActiveFrame: (index: number) => void } } }).__studioStore!.getState().setActiveFrame(1));
  await expect.poll(() => pixel(page, 2, 2)).toEqual([25, 205, 44, 255]);

  // Both thumbnails must be restored after undo
  await expect.poll(() => thumbnailPixel(page, 0, 2, 2)).toEqual([20, 210, 40, 255]);
  await expect.poll(() => thumbnailPixel(page, 1, 2, 2)).toEqual([25, 205, 44, 255]);

  await page.getByTestId('redo-button').click();
  await expect.poll(() => pixel(page, 2, 2)).toEqual([0, 0, 0, 0]);
  await expect.poll(() => thumbnailPixel(page, 0, 2, 2)).toEqual([0, 0, 0, 0]);
  await expect.poll(() => thumbnailPixel(page, 1, 2, 2)).toEqual([0, 0, 0, 0]);
});

test('Erase Sampled Color skips a locked frame layer', async ({ page }) => {
  await importGreenSheet(page);
  await page.evaluate(() => {
    const state = (window as Window & { __studioStore?: { getState: () => { frames: Array<{ layers: Array<{ id: string }> }>; toggleLayerLock: (id: string) => void; setActiveFrame: (index: number) => void } } }).__studioStore!.getState();
    state.setActiveFrame(1);
    state.toggleLayerLock(state.frames[1].layers[0].id);
    state.setActiveFrame(0);
  });
  await page.getByTestId('erase-color-tool').click();
  await page.getByRole('button', { name: 'Erase Color frame scope' }).click();
  await clickPixel(page, 2, 2);
  await expect.poll(() => pixel(page, 2, 2)).toEqual([0, 0, 0, 0]);
  await page.evaluate(() => (window as Window & { __studioStore?: { getState: () => { setActiveFrame: (index: number) => void } } }).__studioStore!.getState().setActiveFrame(1));
  await expect.poll(() => pixel(page, 2, 2)).toEqual([25, 205, 44, 255]);
});

test('Default color family clears pale spill, repairs dark green outline pixels, and has a distinct icon', async ({ page }) => {
  await importGreenSheet(page);
  await page.getByTestId('erase-color-tool').click();
  await expect(page.getByRole('button', { name: 'Erase Color family mode' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Erase Color matching mode' })).toContainText('All matches');
  const icons = await page.evaluate(() => [
    document.querySelector('[data-testid="eraser-tool"] svg')?.innerHTML,
    document.querySelector('[data-testid="erase-color-tool"] svg')?.innerHTML,
  ]);
  expect(icons[0]).toBeTruthy();
  expect(icons[1]).toBeTruthy();
  expect(icons[1]).not.toBe(icons[0]);
  await clickPixel(page, 2, 2);
  await expect.poll(() => pixel(page, 1, 1)).toEqual([0, 0, 0, 0]);
  expect(await pixel(page, 4, 4)).toEqual([0, 0, 0, 0]);
  expect(await pixel(page, 5, 1)).toEqual([20, 32, 44, 255]);
  expect(await pixel(page, 3, 1)).toEqual([18, 29, 26, 255]);
  expect(await pixel(page, 15, 15)).toEqual([255, 48, 48, 255]);
});

test('Erase Sampled Color with All Frames scope clears matching color across animation frames', async ({ page }) => {
  await page.goto('/studio');
  const canvas = page.getByTestId('main-composite-canvas');
  await expect(canvas).toBeVisible();
  await expect.poll(() => page.evaluate(() => Boolean((window as Window & { __studioStore?: unknown }).__studioStore))).toBe(true);

  // Select pen tool
  await page.getByTestId('pen-tool').click();

  // Set orange drawing color
  await page.evaluate(() => {
    (window as Window & { __studioStore?: { getState: () => { setPrimaryColor: (c: string) => void } } }).__studioStore!.getState().setPrimaryColor('#ff8800');
  });

  // Draw orange mark on center of frame 1 (16, 16)
  await clickPixel(page, 16, 16);
  await expect.poll(() => pixel(page, 16, 16)).toEqual([255, 136, 0, 255]);
  await expect.poll(() => thumbnailPixel(page, 0, 16, 16)).toEqual([255, 136, 0, 255]);

  // Click Add blank frame button in timeline to create frame 2
  await page.getByTestId('add-frame-button').click();
  await expect.poll(() => page.evaluate(() => (window as Window & { __studioStore?: { getState: () => { activeFrameIndex: number } } }).__studioStore!.getState().activeFrameIndex)).toBe(1);

  // Draw orange mark on frame 2 at the same location
  await clickPixel(page, 16, 16);
  await expect.poll(() => pixel(page, 16, 16)).toEqual([255, 136, 0, 255]);
  await expect.poll(() => thumbnailPixel(page, 1, 16, 16)).toEqual([255, 136, 0, 255]);

  // Select Erase Color tool in left toolbar
  await page.getByTestId('erase-color-tool').click();

  // Click the frame scope button in the tool options rail to switch from This frame to All frames
  const scopeButton = page.getByRole('button', { name: 'Erase Color frame scope' });
  await expect(scopeButton).toContainText('This frame');
  await scopeButton.click();
  await expect(scopeButton).toContainText('All frames');
  await expect(scopeButton).toHaveAttribute('aria-pressed', 'true');

  // Click on the orange mark in the center of the canvas
  await clickPixel(page, 16, 16);

  // Verify orange mark on frame 2 is erased to transparent canvas
  await expect.poll(() => pixel(page, 16, 16)).toEqual([0, 0, 0, 0]);

  // Timeline thumbnail for frame 2 must be transparent
  await expect.poll(() => thumbnailPixel(page, 1, 16, 16)).toEqual([0, 0, 0, 0]);

  // Timeline thumbnail for frame 1 must ALSO be transparent immediately
  await expect.poll(() => thumbnailPixel(page, 0, 16, 16)).toEqual([0, 0, 0, 0]);

  // Select frame 1 in the bottom timeline
  await page.getByRole('button', { name: /Frame 1/i }).click();
  await expect.poll(() => page.evaluate(() => (window as Window & { __studioStore?: { getState: () => { activeFrameIndex: number } } }).__studioStore!.getState().activeFrameIndex)).toBe(0);

  // Verify the orange mark on frame 1 was also removed across the animation timeline
  await expect.poll(() => pixel(page, 16, 16)).toEqual([0, 0, 0, 0]);
});
