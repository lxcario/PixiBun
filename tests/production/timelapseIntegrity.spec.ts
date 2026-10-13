import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { readAnimatedGif } from '../helpers/readAnimatedGif';

const pixels = (page: Page) => page.getByTestId('main-composite-canvas').evaluate((c: HTMLCanvasElement) =>
  Array.from(c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data));
async function color(page: Page, hex: string) {
  await page.getByTestId('toolbar-color-dock').getByRole('button', { name: /^Primary color / }).dblclick();
  const dialog = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: /Pick Custom Primary Color/ }) });
  await dialog.getByRole('textbox', { name: 'Picker hex color', exact: true }).fill(hex);
  await dialog.getByRole('button', { name: 'Select Color', exact: true }).click(); await expect(dialog).toBeHidden();
}
async function stroke(page: Page, x1: number, x2: number, y: number) {
  const box = (await page.getByTestId('main-composite-canvas').boundingBox())!;
  await page.mouse.move(box.x + (x1 + .5) * box.width / 32, box.y + (y + .5) * box.height / 32); await page.mouse.down();
  await page.mouse.move(box.x + (x2 + .5) * box.width / 32, box.y + (y + .5) * box.height / 32, { steps: 3 }); await page.mouse.up();
}
test('downloaded timelapse finishes on the latest artwork without consuming Undo or changing saved pixels', async ({ page }, info) => {
  await page.addInitScript(() => { Object.defineProperty(window, 'showSaveFilePicker', { value: undefined, configurable: true }); });
  await page.setViewportSize({ width: 1600, height: 1100 }); await page.goto('/studio?width=32&height=32');
  await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible(); await page.getByTestId('pen-tool').click();
  await color(page, '#ff0055'); await stroke(page, 4, 11, 4); const first = await pixels(page);
  await color(page, '#3366ff'); await stroke(page, 6, 18, 12); const final = await pixels(page); expect(final).not.toEqual(first);
  await page.getByTestId('export-button').click(); await page.getByTestId('export-tab-replay').click();
  const dialog = page.getByRole('dialog'); await dialog.getByRole('button', { name: 'Animated GIF', exact: true }).click();
  await dialog.getByRole('button', { name: '1x', exact: true }).click();
  const pending = page.waitForEvent('download'); await dialog.getByRole('button', { name: 'Download REPLAY', exact: true }).click();
  const download = await pending, bytes = await readFile((await download.path())!); await info.attach('actual-timelapse.gif', { body: bytes, contentType: 'image/gif' });
  const decoded = readAnimatedGif(bytes); expect([decoded.width, decoded.height]).toEqual([32, 32]); expect(decoded.frames.length).toBeGreaterThanOrEqual(2);
  expect(decoded.frames.at(-1)!.data, 'The final held image must include the latest blue stroke').toEqual(final);
  expect(decoded.frames.at(-1)!.delayMs).toBeGreaterThanOrEqual(1000); await expect(dialog).toBeHidden();
  expect(await pixels(page)).toEqual(final); await page.getByTestId('undo-button').click(); await expect.poll(() => pixels(page)).toEqual(first);
  await page.getByTestId('redo-button').click(); await expect.poll(() => pixels(page)).toEqual(final);
  await page.getByTestId('save-button').click(); await expect(page.getByRole('status').filter({ hasText: /^Changes saved$/ })).toBeVisible();
  await page.reload(); await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible(); await expect.poll(() => pixels(page)).toEqual(final);
});
