import { expect, test, type Page } from '@playwright/test';

async function pixel(page: Page, x: number, y: number) {
  return page.getByTestId('main-composite-canvas').evaluate((canvas: HTMLCanvasElement, point: [number, number]) =>
    Array.from(canvas.getContext('2d')!.getImageData(point[0], point[1], 1, 1).data), [x, y] as [number, number]);
}

test('PixiTools scans before cleanup, cleans matching animation layers, and undo restores the source', async ({ page }) => {
  await page.goto('/studio');
  await expect(page.getByTestId('main-composite-canvas')).toBeVisible();
  await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  const base64 = await page.evaluate(() => {
    const sheet = document.createElement('canvas');
    sheet.width = 64;
    sheet.height = 32;
    const ctx = sheet.getContext('2d')!;
    for (const start of [0, 32]) {
      ctx.fillStyle = '#f5f5f5';
      ctx.fillRect(start + 8, 8, 16, 16);
      ctx.fillStyle = '#121c29';
      ctx.fillRect(start + 8, 8, 16, 2);
      ctx.fillStyle = 'rgba(120,120,120,0.2)';
      ctx.fillRect(start + 2, 2, 1, 1);
      ctx.fillStyle = '#121c29';
      ctx.fillRect(start + 3, 3, 1, 1);
    }
    return sheet.toDataURL('image/png').split(',')[1];
  });
  await page.locator('input[type=file]').first().setInputFiles({
    name: 'cleanup_sheet.png', mimeType: 'image/png', buffer: Buffer.from(base64, 'base64'),
  });
  const dialog = page.getByRole('dialog', { name: 'Import Image' });
  await dialog.getByRole('button', { name: 'Sprite Sheet Slicer' }).click();
  for (const [label, value] of [
    ['Frame cell width in pixels', '32'], ['Frame cell height in pixels', '32'],
    ['Start X in pixels', '0'], ['Start Y in pixels', '0'],
    ['Gap X in pixels', '0'], ['Gap Y in pixels', '0'],
  ]) await dialog.getByRole('spinbutton', { name: label }).fill(value);
  await expect(dialog.getByText('2 cols × 1 rows = 2 total frames')).toBeVisible();
  await dialog.getByRole('button', { name: 'Replace Frames' }).click();
  await dialog.getByRole('button', { name: 'Slice & Import Frames' }).click();
  await expect(dialog).toBeHidden();
  await expect.poll(() => pixel(page, 2, 2)).toEqual([120, 120, 120, 51]);

  await page.getByRole('button', { name: 'PixiTools' }).click();
  await page.getByRole('button', { name: 'Clean & Polish' }).click();
  const section = page.getByRole('button', { name: 'Pixel Cleanup & RotSprite (Atelier Assistants & Ramps)' });
  if (await section.getAttribute('aria-expanded') === 'false') await section.click();
  await page.getByRole('button', { name: 'Cleanup frame scope' }).click();
  await expect(page.getByRole('button', { name: 'Cleanup thin dark lines' })).toHaveAttribute('aria-pressed', 'false');
  const apply = page.getByRole('button', { name: 'Apply analyzed artwork cleanup' });
  await expect(apply).toBeDisabled();
  await page.getByRole('button', { name: 'Scan artwork for cleanup' }).click();
  await expect(page.getByText(/Found \d+ pixels in 2 frames/)).toBeVisible();
  await expect(page.getByRole('img', { name: 'Before artwork cleanup thumbnail' })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Preview artwork cleanup thumbnail' })).toBeVisible();
  await expect(apply).toBeEnabled();
  expect(await pixel(page, 2, 2)).toEqual([120, 120, 120, 51]);
  await apply.click();
  await expect.poll(() => pixel(page, 2, 2)).toEqual([0, 0, 0, 0]);
  expect((await pixel(page, 12, 12))[3]).toBe(255);
  await page.evaluate(() => (window as Window & { __studioStore?: { getState: () => { setActiveFrame: (index: number) => void } } }).__studioStore!.getState().setActiveFrame(1));
  await expect.poll(() => pixel(page, 2, 2)).toEqual([0, 0, 0, 0]);
  await page.getByTestId('undo-button').click();
  await expect.poll(() => pixel(page, 2, 2)).toEqual([120, 120, 120, 51]);
  await page.evaluate(() => (window as Window & { __studioStore?: { getState: () => { setActiveFrame: (index: number) => void } } }).__studioStore!.getState().setActiveFrame(0));
  await expect.poll(() => pixel(page, 2, 2)).toEqual([120, 120, 120, 51]);

  await page.evaluate(() => {
    const state = (window as Window & { __studioStore?: { getState: () => {
      frames: Array<{ layers: Array<{ id: string }> }>;
      setActiveFrame: (index: number) => void;
      toggleLayerLock: (id: string) => void;
    } } }).__studioStore!.getState();
    state.setActiveFrame(1);
    state.toggleLayerLock(state.frames[1].layers[0].id);
    state.setActiveFrame(0);
  });
  await page.getByRole('button', { name: 'Scan artwork for cleanup' }).click();
  await expect(page.getByText(/Skipped 1 locked layer/)).toBeVisible();
  await apply.click();
  await expect.poll(() => pixel(page, 2, 2)).toEqual([0, 0, 0, 0]);
  await page.evaluate(() => (window as Window & { __studioStore?: { getState: () => { setActiveFrame: (index: number) => void } } }).__studioStore!.getState().setActiveFrame(1));
  await expect.poll(() => pixel(page, 2, 2)).toEqual([120, 120, 120, 51]);
});

test('cleanup detects opaque gray artifacts when the alpha slider cannot', async ({ page }) => {
  await page.goto('/studio');
  await expect(page.getByTestId('main-composite-canvas')).toBeVisible();
  await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  const base64 = await page.evaluate(() => {
    const art = document.createElement('canvas');
    art.width = 32; art.height = 32;
    const ctx = art.getContext('2d')!;
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 32, 32);
    ctx.fillStyle = '#b4b6b5'; ctx.fillRect(2, 2, 1, 1);
    ctx.fillStyle = '#151e28'; ctx.fillRect(10, 10, 8, 8);
    ctx.fillStyle = '#ec497e'; ctx.fillRect(14, 14, 1, 1);
    return art.toDataURL('image/png').split(',')[1];
  });
  await page.locator('input[type=file]').first().setInputFiles({
    name: 'opaque_gray_art.png', mimeType: 'image/png', buffer: Buffer.from(base64, 'base64'),
  });
  const dialog = page.getByRole('dialog', { name: 'Import Image' });
  await dialog.getByRole('button', { name: 'Single Sprite / Layer' }).click();
  await dialog.getByRole('button', { name: 'Import Image', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect.poll(() => pixel(page, 2, 2)).toEqual([180, 182, 181, 255]);
  await page.getByRole('button', { name: 'PixiTools' }).click();
  await page.getByRole('button', { name: 'Clean & Polish' }).click();
  const section = page.getByRole('button', { name: 'Pixel Cleanup & RotSprite (Atelier Assistants & Ramps)' });
  if (await section.getAttribute('aria-expanded') === 'false') await section.click();
  await page.getByRole('slider', { name: 'Cleanup faint alpha threshold' }).fill('200');
  await page.getByRole('button', { name: 'Scan artwork for cleanup' }).click();
  await expect(page.getByText(/0 faint removed, 0 alpha hardened/)).toBeVisible();
  await expect(page.getByText(/No translucent pixels found/)).toBeVisible();
  await page.getByRole('button', { name: 'Apply analyzed artwork cleanup' }).click();
  await expect.poll(() => pixel(page, 2, 2)).toEqual([255, 255, 255, 255]);
  expect((await pixel(page, 14, 14)).slice(0, 3)).toEqual([236, 73, 126]);
});
