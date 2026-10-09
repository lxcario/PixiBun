import { test, expect, type Page } from '@playwright/test';

const pixels = (page: Page) => page.getByTestId('main-composite-canvas').evaluate((canvas: HTMLCanvasElement) =>
  Array.from(canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data));
const pixel = (page: Page, x: number, y: number) => page.getByTestId('main-composite-canvas').evaluate((canvas: HTMLCanvasElement, point) =>
  Array.from(canvas.getContext('2d')!.getImageData(point.x, point.y, 1, 1).data), { x, y });

async function image(page: Page, color: string, x = 0, y = 0, size = 32) {
  return Buffer.from(await page.evaluate(({ color, x, y, size }) => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d')!; ctx.fillStyle = color; ctx.fillRect(x, y, 1, 1);
    return canvas.toDataURL('image/png').split(',')[1];
  }, { color, x, y, size }), 'base64');
}
async function importImage(page: Page, buffer: Buffer, target = 'Replace', name = 'sprite.png', accepted = true, fitCurrentCanvas = false) {
  const previous = await pixels(page);
  await page.locator('input[type=file]').first().setInputFiles({ name, mimeType: 'image/png', buffer });
  const dialog = page.getByRole('dialog', { name: 'Import Image' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Single Sprite / Layer', exact: true }).click();
  await dialog.getByRole('button', { name: target, exact: true }).click();
  if (fitCurrentCanvas) await dialog.locator('#size-mode-fit-canvas').check();
  await dialog.getByRole('button', { name: 'Import Image', exact: true }).click();
  if (accepted) {
    await expect(dialog).toBeHidden();
    await expect.poll(() => pixels(page)).not.toEqual(previous);
  } else await expect(dialog).toBeVisible();
}
async function saved(page: Page) {
  await page.getByTestId('save-button').click();
  await expect(page.locator('[role=status]').filter({ hasText: /Changes saved/ })).toBeVisible();
}
test.beforeEach(async ({ page }) => {
  await page.goto('/studio', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-restoration-phase=active]')).toBeVisible();
  await expect(page.getByTestId('main-composite-canvas')).toBeVisible();
});

test('Replace repaints transparent pixels, restores one Undo/Redo step and autosaves for reload', async ({ page }) => {
  await importImage(page, await image(page, '#0000ff', 31, 31)); await saved(page);
  const original = await pixels(page);
  await importImage(page, await image(page, '#ff0000'));
  await expect.poll(() => pixel(page, 0, 0)).toEqual([255, 0, 0, 255]);
  await expect.poll(() => pixel(page, 31, 31)).toEqual([0, 0, 0, 0]);
  const imported = await pixels(page);
  await page.keyboard.press('Control+z'); await expect.poll(() => pixels(page)).toEqual(original);
  await page.keyboard.press('Control+Shift+z'); await expect.poll(() => pixels(page)).toEqual(imported);
  // No manual Save or unrelated metadata edit may rescue the final imported pixels.
  await expect(page.getByText('Saved', { exact: true })).toBeVisible();
  await page.reload({ waitUntil: 'domcontentloaded' }); await expect(page.locator('[data-restoration-phase=active]')).toBeVisible();
  await expect.poll(() => pixels(page)).toEqual(imported);
});

test('Replace alone autosaves on an already saved project without a repaint helper', async ({ page }) => {
  await importImage(page, await image(page, '#0000ff', 31, 31)); await saved(page);
  await importImage(page, await image(page, '#ff0000', 16, 16));
  await expect.poll(() => pixel(page, 16, 16)).toEqual([255, 0, 0, 255]);
  await expect(page.getByText('Saved', { exact: true })).toBeVisible();
  await page.reload({ waitUntil: 'domcontentloaded' }); await expect(page.locator('[data-restoration-phase=active]')).toBeVisible();
  await expect.poll(() => pixel(page, 16, 16)).toEqual([255, 0, 0, 255]);
  expect(await pixel(page, 31, 31)).toEqual([0, 0, 0, 0]);
});

test('refused New Layer keeps existing pixels, layer count and Undo state intact', async ({ page }) => {
  await importImage(page, await image(page, '#0000ff', 31, 31)); await saved(page);
  const original = await pixels(page);
  await importImage(page, await image(page, '#ff0000'), 'New Layer', `${'a'.repeat(129)}.png`, false);
  await expect(page.getByText(/Layer name must be at most/)).toBeVisible();
  await page.getByRole('dialog', { name: 'Import Image' }).getByRole('button', { name: 'Cancel', exact: true }).click();
  expect(await pixels(page)).toEqual(original);
  await expect(page.getByRole('button', { name: /^Lock layer/ })).toHaveCount(1);
  await page.keyboard.press('Control+z');
  await expect.poll(() => pixels(page)).not.toEqual(original);
  await page.keyboard.press('Control+Shift+z'); await expect.poll(() => pixels(page)).toEqual(original);
});

test('locked Replace refuses the import and preserves saved artwork', async ({ page }) => {
  await importImage(page, await image(page, '#0000ff', 31, 31));
  await page.getByRole('button', { name: /^Lock layer/ }).click(); await saved(page);
  const original = await pixels(page);
  await importImage(page, await image(page, '#ff0000'), 'Replace', 'sprite.png', false);
  await expect(page.getByText('Unlock the layer before replacing its image.')).toBeVisible();
  await page.getByRole('dialog', { name: 'Import Image' }).getByRole('button', { name: 'Cancel', exact: true }).click();
  expect(await pixels(page)).toEqual(original);
  await page.reload({ waitUntil: 'domcontentloaded' }); await expect.poll(() => pixels(page)).toEqual(original);
  await expect(page.getByRole('button', { name: /^Unlock layer/ })).toBeVisible();
});

test('a smaller replacement clears the full destination and restores the original pixels with Undo', async ({ page }) => {
  await importImage(page, await image(page, '#0000ff', 31, 31));
  const original = await pixels(page);
  await importImage(page, await image(page, '#ff0000', 0, 0, 16), 'Replace', 'small.png', true, true);
  await expect.poll(() => pixel(page, 0, 0)).toEqual([255, 0, 0, 255]);
  expect(await pixel(page, 31, 31)).toEqual([0, 0, 0, 0]);
  await page.keyboard.press('Control+z'); await expect.poll(() => pixels(page)).toEqual(original);
});

test('Replace Frames restores every erased layer with one Undo and replays the entire sheet with Redo', async ({ page }) => {
  await importImage(page, await image(page, '#0000ff', 31, 31));
  await importImage(page, await image(page, '#00ff00', 16, 16), 'New Layer');
  const original = await pixels(page);
  const sheet = Buffer.from(await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 32;
    const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#ff0000'; ctx.fillRect(0, 0, 1, 1);
    ctx.fillStyle = '#ffff00'; ctx.fillRect(32, 0, 1, 1);
    return canvas.toDataURL('image/png').split(',')[1];
  }), 'base64');
  await page.locator('input[type=file]').first().setInputFiles({ name: 'walk-sheet.png', mimeType: 'image/png', buffer: sheet });
  const dialog = page.getByRole('dialog', { name: 'Import Image' });
  await dialog.getByRole('button', { name: 'Sprite Sheet Slicer', exact: true }).click();
  await dialog.getByLabel('Frame cell width in pixels').fill('32');
  await dialog.getByLabel('Frame cell height in pixels').fill('32');
  await dialog.getByRole('checkbox', { name: /Skip Empty/ }).uncheck();
  await dialog.getByRole('button', { name: 'Replace Frames', exact: true }).click();
  await dialog.getByRole('button', { name: 'Slice & Import Frames', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect.poll(() => pixel(page, 0, 0)).toEqual([255, 0, 0, 255]);
  expect(await pixel(page, 16, 16)).toEqual([0, 0, 0, 0]); expect(await pixel(page, 31, 31)).toEqual([0, 0, 0, 0]);
  const imported = await pixels(page);
  await page.keyboard.press('Control+z'); await expect.poll(() => pixels(page)).toEqual(original);
  await page.keyboard.press('Control+Shift+z'); await expect.poll(() => pixels(page)).toEqual(imported);
  await page.getByRole('button', { name: /^Select frame 2\./ }).click();
  await expect.poll(() => pixel(page, 0, 0)).toEqual([255, 255, 0, 255]);
});

test('import resize Undo restores edge pixels before repaint can crop the restored buffers', async ({ page }) => {
  await importImage(page, await image(page, '#0000ff', 31, 31));
  const original = await pixels(page);
  await importImage(page, await image(page, '#ff0000', 0, 0, 16));
  await expect(page.getByTestId('main-composite-canvas')).toHaveJSProperty('width', 16);
  const imported = await pixels(page);
  await page.keyboard.press('Control+z');
  await expect.poll(() => pixels(page)).toEqual(original);
  await expect.poll(() => pixel(page, 31, 31)).toEqual([0, 0, 255, 255]);
  await page.keyboard.press('Control+Shift+z'); await expect.poll(() => pixels(page)).toEqual(imported);
  await saved(page); await page.reload({ waitUntil: 'domcontentloaded' }); await expect.poll(() => pixels(page)).toEqual(imported);
});
