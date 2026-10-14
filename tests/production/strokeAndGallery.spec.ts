import { expect, test, type Page } from '@playwright/test';

const pixels = (page: Page) => page.getByTestId('main-composite-canvas').evaluate((canvas: HTMLCanvasElement) =>
  Array.from(canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data));
const rgba = async (page: Page, x: number, y: number) => (await pixels(page)).slice((y * 32 + x) * 4, (y * 32 + x) * 4 + 4);
async function ready(page: Page) {
  await page.goto('/studio'); await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  await expect(page.getByTestId('main-composite-canvas')).toBeVisible();
}
async function paint(page: Page, points: [number, number][]) {
  const box = (await page.getByTestId('main-composite-canvas').boundingBox())!;
  const move = (point: [number, number]) => page.mouse.move(box.x + box.width * (point[0] + 0.5) / 32, box.y + box.height * (point[1] + 0.5) / 32);
  await move(points[0]); await page.mouse.down();
  for (const point of points.slice(1)) await move(point);
  await page.mouse.up();
}
async function history(page: Page, key: 'z' | 'y') {
  await page.locator('#center-canvas-area').focus(); await page.keyboard.press(`Control+${key}`);
}
async function save(page: Page) {
  await page.getByTestId('save-button').click();
  await expect(page.locator('[role="status"]').filter({ hasText: /Changes saved/ })).toBeVisible();
}
async function gallery(page: Page) {
  await page.getByTestId('file-menu-button').click(); await page.getByRole('menuitem', { name: 'Projects', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Projects & Gallery' }); await expect(dialog).toBeVisible(); return dialog;
}
async function rename(page: Page, oldName: string, newName: string, keyboard = false) {
  const dialog = await gallery(page), card = dialog.getByRole('button', { name: `Open project ${oldName}`, exact: true });
  await card.getByRole('button', { name: 'Rename artwork' }).click();
  const input = card.getByRole('textbox', { name: 'Artwork title' }); await input.fill(newName);
  if (keyboard) await input.press('Enter'); else await card.getByRole('button', { name: 'Save title' }).click();
  await expect(dialog.getByRole('button', { name: `Open project ${newName}`, exact: true })).toBeVisible();
  await expect(dialog.getByRole('textbox', { name: 'Artwork title' })).toBeHidden(); return dialog;
}

test('compiled clean corners restore underlying artwork through undo, redo and saved reload', async ({ page }) => {
  await ready(page);
  const fixture = await page.evaluate(() => {
    const c = document.createElement('canvas'); c.width = c.height = 32;
    const ctx = c.getContext('2d')!; ctx.fillStyle = '#00ff0080'; ctx.fillRect(3, 2, 1, 1);
    return { format: 'pixibun-project', version: 3, name: 'Corner fixture', width: 32, height: 32, fps: 8, loopMode: 'repeat',
      onionSkin: { enabled: false, prevFrames: 1, nextFrames: 1, prevColor: '#c792df', nextColor: '#dcabdf', opacity: 0.45 },
      palettes: [{ id: 'colors', name: 'Colors', colors: ['#ff0000', '#00ff00'] }], currentPaletteId: 'colors', customRamps: [], clips: [],
      frames: [{ id: 'frame', durationMs: 100, layers: [{ id: 'body', name: 'Body', visible: true, locked: false, opacity: 1, blendMode: 'source-over', pngBase64: c.toDataURL('image/png').split(',')[1] }] }], createdAt: 1, updatedAt: 1 };
  });
  await page.locator('input[type=file]').first().setInputFiles({ name: 'corner.pixibun', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(fixture)) });
  const importDialog = page.getByRole('dialog', { name: 'Import Project (.pixibun)' });
  await importDialog.getByRole('button', { name: 'Confirm Import' }).click(); await expect(importDialog).toBeHidden();
  await expect.poll(() => rgba(page, 3, 2)).toEqual([0, 255, 0, 128]);
  const original = await pixels(page); await paint(page, [[2, 2], [3, 2], [3, 3]]);
  await expect.poll(() => rgba(page, 3, 2)).toEqual([0, 255, 0, 128]);
  expect((await rgba(page, 3, 3))[3]).toBe(255); const drawn = await pixels(page);
  await history(page, 'z'); await expect.poll(() => pixels(page)).toEqual(original);
  await history(page, 'y'); await expect.poll(() => pixels(page)).toEqual(drawn);
  await save(page); await page.reload(); await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  await expect.poll(() => pixels(page)).toEqual(drawn);
});

test('compiled dither fills a coarse path identically to fine samples and survives save and reload', async ({ page }) => {
  await ready(page); const blank = await pixels(page);
  await page.locator('#center-canvas-area').focus(); await page.keyboard.press('d');
  await expect(page.getByTestId('dither-tool')).toHaveAttribute('aria-pressed', 'true');
  await paint(page, [[0, 8], [20, 8]]);
  for (let x = 0; x <= 20; x++) expect((await rgba(page, x, 8))[3]).toBe(x % 2 === 0 ? 255 : 0);
  const coarse = await pixels(page); await history(page, 'z'); await expect.poll(() => pixels(page)).toEqual(blank);
  await paint(page, Array.from({ length: 21 }, (_, x) => [x, 8] as [number, number]));
  await expect.poll(() => pixels(page)).toEqual(coarse);
  await history(page, 'z'); await expect.poll(() => pixels(page)).toEqual(blank);
  await history(page, 'y'); await expect.poll(() => pixels(page)).toEqual(coarse);
  await save(page); await page.reload(); await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  await expect.poll(() => pixels(page)).toEqual(coarse);
});

test('compiled gallery contains input keys, saves mouse and keyboard renames, and preserves active and inactive drawings', async ({ page }) => {
  await ready(page); await paint(page, [[5, 5]]); await save(page); const original = await pixels(page);
  let dialog = await gallery(page); await dialog.getByRole('button', { name: 'Rename artwork' }).click();
  const input = dialog.getByRole('textbox', { name: 'Artwork title' }); await input.fill('My'); await input.press('Space'); await input.pressSequentially('sprite');
  await expect(input).toHaveValue('My sprite'); await expect(dialog).toBeVisible();
  await input.press('Escape'); await expect(input).toBeHidden(); await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Close dialog', exact: true }).click();
  dialog = await rename(page, 'Untitled Sprite', 'My sprite'); await dialog.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await paint(page, [[7, 7]]); await save(page); const edited = await pixels(page);
  await page.reload(); await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible(); await expect.poll(() => pixels(page)).toEqual(edited);
  await expect(page.getByRole('button', { name: 'Rename project My sprite' })).toBeVisible();
  dialog = await rename(page, 'My sprite', 'Keyboard title', true);
  await dialog.getByRole('button', { name: 'New Drawing', exact: true }).click();
  await expect(dialog).toBeHidden(); await save(page); const blank = await pixels(page);
  dialog = await rename(page, 'Keyboard title', 'Inactive title', true);
  expect(await pixels(page)).toEqual(blank);
  await dialog.getByRole('button', { name: 'Open project Inactive title', exact: true }).click();
  await expect.poll(() => pixels(page)).toEqual(edited); expect(edited).not.toEqual(original);
});

test('compiled rename refuses a real second-tab conflict while retaining both drawings', async ({ page, context }) => {
  await ready(page); await paint(page, [[4, 4]]); await save(page); const firstPixels = await pixels(page);
  const second = await context.newPage();
  try {
    await ready(second); await expect.poll(() => pixels(second)).toEqual(firstPixels);
    const firstDialog = await rename(page, 'Untitled Sprite', 'First tab'); await firstDialog.getByRole('button', { name: 'Close dialog', exact: true }).click();
    await paint(second, [[8, 8]]); const secondPixels = await pixels(second);
    const secondDialog = await gallery(second); await secondDialog.getByRole('button', { name: 'Rename artwork' }).click();
    await secondDialog.getByRole('textbox', { name: 'Artwork title' }).fill('Second tab'); await secondDialog.getByRole('button', { name: 'Save title' }).click();
    await expect(secondDialog.getByRole('alert')).toContainText('title could not be saved');
    expect(await pixels(second)).toEqual(secondPixels); await secondDialog.getByRole('button', { name: 'Close dialog', exact: true }).click();
    await expect(second.getByRole('button', { name: 'Save a copy', exact: true })).toBeVisible();
    await page.reload(); await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible(); await expect.poll(() => pixels(page)).toEqual(firstPixels);
    await expect(page.getByRole('button', { name: 'Rename project First tab' })).toBeVisible();
  } finally { await second.close(); }
});
