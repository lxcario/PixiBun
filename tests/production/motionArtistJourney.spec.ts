import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const pixels = (page: Page) => page.getByTestId('main-composite-canvas').evaluate((canvas: HTMLCanvasElement) =>
  Array.from(canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data));
async function numeric(page: Page, label: string, value: string) {
  const field = page.getByRole('spinbutton', { name: label, exact: true }); await field.fill(value); await field.press('Enter');
}
async function saveReload(page: Page) {
  await page.getByTestId('save-button').click(); await expect(page.getByRole('status').filter({ hasText: /^Changes saved$/ })).toBeVisible();
  await page.reload(); await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible(); await page.getByTestId('tab-tools').click();
}

for (const size of [16, 24, 32, 48]) test(`the welcome ${size}-pixel blank drawing keeps its size and edited pixels after reload`, async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1100 }); await page.goto(`/studio?width=${size}&height=${size}`);
  await expect.poll(() => page.getByTestId('main-composite-canvas').evaluate((canvas: HTMLCanvasElement) => [canvas.width, canvas.height])).toEqual([size, size]);
  await expect.poll(() => new URL(page.url()).searchParams.has('width')).toBe(false);
  expect((await pixels(page)).every(v => v === 0)).toBe(true);
  const box = (await page.getByTestId('main-composite-canvas').boundingBox())!;
  await page.mouse.click(box.x + box.width * .4, box.y + box.height * .4);
  await expect.poll(async () => (await pixels(page)).some((v, i) => i % 4 === 3 && v > 0)).toBe(true);
  const original = await pixels(page); await saveReload(page); await expect.poll(() => pixels(page)).toEqual(original);
});

test('the landing starter creates a separate saved drawing and Gallery retains the original pixels', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1100 }); await page.goto('/studio');
  await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  await page.getByRole('button', { name: /^Rename project / }).click();
  await page.locator('input:focus').fill('Starter original'); await page.locator('input:focus').press('Enter');
  const box = (await page.getByTestId('main-composite-canvas').boundingBox())!;
  await page.mouse.click(box.x + box.width * .4, box.y + box.height * .4);
  await expect.poll(async () => (await pixels(page)).some((v, i) => i % 4 === 3 && v > 0)).toBe(true);
  const original = await pixels(page); await saveReload(page);
  await page.goto('/'); await page.getByTitle('Open Hearth Ghost in studio', { exact: true }).click();
  await expect.poll(() => page.getByTestId('main-composite-canvas').evaluate((canvas: HTMLCanvasElement) => canvas.width)).toBe(16);
  await expect.poll(async () => (await pixels(page)).some((v, i) => i % 4 === 3 && v > 0)).toBe(true);
  await saveReload(page); const starter = await pixels(page); expect(starter).not.toEqual(original);
  await page.getByTestId('file-menu-button').click(); await page.getByRole('menuitem', { name: 'Projects', exact: true }).click();
  const gallery = page.getByRole('dialog', { name: 'Projects & Gallery' });
  await expect(gallery.getByRole('button', { name: 'Open project Hearth Ghost', exact: true })).toBeVisible();
  await gallery.getByRole('button', { name: 'Open project Starter original', exact: true }).click();
  await expect(gallery).toBeHidden(); await expect.poll(() => pixels(page)).toEqual(original);
});

test('an artist can draw, save a whole-layer rig, reopen, bake, reload and export exact PNG pixels', async ({ page }, info) => {
  await page.setViewportSize({ width: 1600, height: 1100 }); await page.goto('/studio?template=hearth-ghost');
  await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  await expect.poll(() => page.getByTestId('main-composite-canvas').evaluate((canvas: HTMLCanvasElement) => canvas.width)).toBe(16);
  await expect.poll(async () => (await pixels(page)).some((v, i) => i % 4 === 3 && v > 0)).toBe(true);
  await expect.poll(() => new URL(page.url()).searchParams.has('template')).toBe(false);
  const before = await pixels(page), box = (await page.getByTestId('main-composite-canvas').boundingBox())!;
  await page.mouse.click(box.x + box.width * .05, box.y + box.height * .9);
  await expect.poll(() => pixels(page)).not.toEqual(before); const original = await pixels(page);
  const width = await page.getByTestId('main-composite-canvas').evaluate((canvas: HTMLCanvasElement) => canvas.width);
  await page.getByTestId('tab-tools').click(); await page.getByTestId('create-motion-part-btn').click();
  await expect(page.getByTestId('piximotion-panel')).toBeVisible();
  await numeric(page, 'Position X pixels', '2'); await numeric(page, 'Motion frames', '3');
  await page.getByRole('combobox', { name: 'Motion easing' }).selectOption('linear');
  await page.getByRole('textbox', { name: 'Rig name', exact: true }).fill('Artist journey');
  await page.getByRole('button', { name: 'Save motion rig', exact: true }).click();
  await expect(page.getByTestId('motion-rig-library').getByRole('status')).toContainText('Motion rig ready');
  await page.getByRole('button', { name: 'Cancel (Escape)', exact: true }).click(); await saveReload(page);
  await expect.poll(() => pixels(page)).toEqual(original);
  await page.getByRole('button', { name: 'Open rig Artist journey', exact: true }).click();
  await expect(page.getByRole('spinbutton', { name: 'Position X pixels', exact: true })).toHaveValue('2');
  // HUD and inspector share the same async bake owner, including while preview is playing.
  await page.getByRole('button', { name: 'Play Loop', exact: true }).click();
  await page.getByTestId('piximotion-hud-bake-btn').click(); await expect(page.getByTestId('piximotion-panel')).toBeHidden();
  await expect(page.getByRole('button', { name: /^Select frame \d+\./ })).toHaveCount(3); await saveReload(page);
  await page.getByRole('button', { name: /Select frame 3\./ }).click();
  const expected = new Array<number>(original.length).fill(0), height = original.length / 4 / width;
  for (let y = 0; y < height; y++) for (let x = 0; x + 2 < width; x++) for (let c = 0; c < 4; c++)
    expected[(y * width + x + 2) * 4 + c] = original[(y * width + x) * 4 + c];
  await expect.poll(() => pixels(page)).toEqual(expected);
  await page.getByTestId('export-button').click(); await page.getByTestId('export-tab-png').click();
  await page.getByRole('button', { name: '1x', exact: true }).click();
  const pending = page.waitForEvent('download'); await page.getByRole('button', { name: 'Download PNG', exact: true }).click();
  const download = await pending, bytes = await readFile((await download.path())!);
  await info.attach('artist-journey.png', { body: bytes, contentType: 'image/png' });
  const decoded = await page.evaluate(async base64 => {
    const image = new Image(); image.src = 'data:image/png;base64,' + base64; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
    const ctx = canvas.getContext('2d')!; ctx.drawImage(image, 0, 0);
    return { width: image.width, pixels: Array.from(ctx.getImageData(0, 0, image.width, image.height).data) };
  }, bytes.toString('base64'));
  expect(decoded.width).toBe(width); expect(decoded.pixels).toEqual(expected);
});
