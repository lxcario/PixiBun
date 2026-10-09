import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { inflateSync } from 'node:zlib';

const pixels = (page: Page) => page.getByTestId('main-composite-canvas').evaluate((canvas: HTMLCanvasElement) =>
  Array.from(canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data));
async function ready(page: Page) {
  await page.goto('/studio', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
}
async function image(page: Page, width: number, height: number) {
  const base64 = await page.evaluate(({ width, height }) => {
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ff0000'; ctx.fillRect(0, height - 1, 1, 1);
    ctx.fillStyle = '#0000ff'; ctx.fillRect(width - 1, height - 1, 1, 1);
    const data = canvas.toDataURL('image/png').split(',')[1]; canvas.width = 0; canvas.height = 0; return data;
  }, { width, height });
  await page.locator('input[type=file]').first().setInputFiles({ name: 'audit-sheet.png', mimeType: 'image/png', buffer: Buffer.from(base64, 'base64') });
  const dialog = page.getByRole('dialog', { name: 'Import Image' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Sprite Sheet Slicer', exact: true }).click();
  return dialog;
}

test('landing skip link stays on the landing page and focuses its content', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/#top$/);
  await expect(page.locator('main#top')).toBeFocused();
});

test('large source uses a bounded slicer preview and cancellation preserves artwork and undo', async ({ page }) => {
  await ready(page);
  const before = await pixels(page), box = (await page.getByTestId('main-composite-canvas').boundingBox())!;
  await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.3);
  await expect.poll(() => pixels(page)).not.toEqual(before);
  const drawing = await pixels(page);
  const dialog = await image(page, 4096, 1025);
  await dialog.getByRole('spinbutton', { name: 'Frame cell width in pixels' }).fill('1024');
  await dialog.getByRole('spinbutton', { name: 'Frame cell height in pixels' }).fill('1025');
  await dialog.getByRole('checkbox', { name: /Skip Empty/ }).check();
  await expect(dialog.getByText('For large sheets, empty cells are checked during import. This preview shows all cells.')).toBeVisible();
  await expect.poll(() => dialog.getByTestId('slicer-cutline-preview').evaluate((canvas: HTMLCanvasElement) => [canvas.width, canvas.height])).toEqual([1024, 256]);
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(dialog).toBeHidden();
  expect(await pixels(page)).toEqual(drawing);
  await page.keyboard.press('Control+z'); await expect.poll(() => pixels(page)).toEqual(before);
});

for (const fallback of [false, true]) test(`thin source details survive empty-cell filtering and APNG download (fallback=${fallback})`, async ({ page }, info) => {
  if (fallback) await page.addInitScript(() => { Object.defineProperty(window, 'CompressionStream', { value: undefined, configurable: true }); });
  await ready(page);
  const dialog = await image(page, 96, 32);
  for (const [label, value] of [['Frame cell width in pixels', '32'], ['Frame cell height in pixels', '32'],
    ['Start X in pixels', '0'], ['Start Y in pixels', '0'], ['Gap X in pixels', '0'], ['Gap Y in pixels', '0']]) {
    await dialog.getByRole('spinbutton', { name: label }).fill(value);
  }
  await dialog.getByRole('button', { name: 'Replace Frames', exact: true }).click();
  const skip = dialog.getByRole('checkbox', { name: /Skip Empty/ }); await expect(skip).not.toBeChecked();
  await expect(dialog.getByRole('button', { name: 'Slice & Import Frames' })).toContainText('(3)');
  await skip.check();
  await expect(dialog.getByRole('button', { name: 'Slice & Import Frames' })).toContainText('(2)');
  await dialog.getByRole('button', { name: 'Slice & Import Frames' }).click(); await expect(dialog).toBeHidden();
  await expect(page.getByRole('button', { name: /^Select frame \d+\./ })).toHaveCount(2);
  const expected: number[][] = [];
  for (let index = 1; index <= 2; index++) {
    await page.getByRole('button', { name: new RegExp(`^Select frame ${index}\\.`) }).click();
    await expect.poll(async () => (await pixels(page)).filter((v, i) => i % 4 === 3 && v > 0).length).toBe(1);
    expected.push(await pixels(page));
  }
  await page.getByTestId('export-button').click(); const exporting = page.getByRole('dialog');
  await exporting.getByTestId('export-tab-apng').click();
  await exporting.getByRole('button', { name: '1x', exact: true }).click();
  const pending = page.waitForEvent('download'); await exporting.getByRole('button', { name: 'Download APNG', exact: true }).click();
  const download = await pending, output = info.outputPath('thin-details.apng'); await download.saveAs(output);
  const bytes = await readFile(output), decoded: number[][] = [];
  for (let offset = 8; offset < bytes.length;) {
    const length = bytes.readUInt32BE(offset), type = bytes.subarray(offset + 4, offset + 8).toString();
    if (type === 'IDAT' || type === 'fdAT') {
      const data = inflateSync(bytes.subarray(offset + (type === 'fdAT' ? 12 : 8), offset + 8 + length));
      expect(data.length).toBe(32 * 129);
      const rgba: number[] = [];
      for (let row = 0; row < 32; row++) { expect(data[row * 129]).toBe(0); rgba.push(...data.subarray(row * 129 + 1, (row + 1) * 129)); }
      decoded.push(rgba);
    }
    offset += length + 12;
  }
  expect(decoded).toEqual(expected);
  await expect(exporting).toBeHidden();
  expect(await pixels(page)).toEqual(expected[1]);
});

test('invalid project JSON gives a readable error and preserves active pixels', async ({ page }) => {
  await ready(page); const before = await pixels(page);
  await page.locator('input[type=file]').first().setInputFiles({ name: 'invalid.pixibun', mimeType: 'application/json', buffer: Buffer.from('{broken') });
  await expect(page.getByText(/not valid JSON/)).toBeVisible();
  expect(await pixels(page)).toEqual(before);
});
