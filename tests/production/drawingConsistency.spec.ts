import { expect, test, type Page } from '@playwright/test';
import { chooseTool } from '../helpers/tools';

const pixels = (page: Page, id = 'main-composite-canvas') => page.getByTestId(id).evaluate((c: HTMLCanvasElement) => Array.from(c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data));
async function point(page: Page, x: number, y: number) {
  const box = (await page.getByTestId('main-composite-canvas').boundingBox())!;
  return { x: box.x + (x + 0.5) * box.width / 32, y: box.y + (y + 0.5) * box.height / 32 };
}
async function preview(page: Page, from: [number, number], to: [number, number]) {
  const a = await point(page, ...from), b = await point(page, ...to);
  await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(b.x, b.y);
  return pixels(page, 'stroke-preview-canvas');
}
async function ready(page: Page) {
  await page.setViewportSize({ width: 1280, height: 900 }); await page.goto('/studio');
  await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  // Keep the help card from covering the initial drag point on slower engines.
  // Use the saved user preference through its real control.
  await page.getByTestId('appearance-button').click();
  const previews = page.getByRole('checkbox', { name: 'Tool Previews', exact: true });
  await previews.focus(); await previews.press('Space'); await expect(previews).not.toBeChecked();
  await page.getByRole('button', { name: 'Close studio options', exact: true }).click();
}

test('Line keeps exact preview, pixels, Undo and Redo when the drag direction reverses', async ({ page }) => {
  await ready(page); await chooseTool(page, 'line');
  const blank = await pixels(page);
  const first = await preview(page, [5, 5], [6, 7]);
  const occupied = first.flatMap((v, i) => i % 4 === 3 && v ? [[((i - 3) / 4) % 32, Math.floor((i - 3) / 128)]] : []);
  expect(occupied).toEqual([[5, 5], [5, 6], [6, 7]]);
  await page.mouse.up(); await expect.poll(() => pixels(page)).toEqual(first);
  await page.getByTestId('undo-button').click(); await expect.poll(() => pixels(page)).toEqual(blank);
  const reversed = await preview(page, [6, 7], [5, 5]); expect(reversed).toEqual(first);
  await page.mouse.up(); await expect.poll(() => pixels(page)).toEqual(first);
  await page.getByTestId('undo-button').click(); await expect.poll(() => pixels(page)).toEqual(blank);
  await page.getByTestId('redo-button').click(); await expect.poll(() => pixels(page)).toEqual(first);
});

for (const tool of ['line', 'isometric-line', 'rectangle', 'ellipse']) {
  test(`${tool} thick selected preview equals committed pixels and survives Undo/Redo`, async ({ page }) => {
    await ready(page); const blank = await pixels(page);
    await chooseTool(page, 'select-box');
    await preview(page, [8, 8], [17, 17]); await page.mouse.up();
    await chooseTool(page, tool); await page.getByTestId('tab-tools').click();
    const size = page.getByRole('slider', { name: 'Tool panel brush size', exact: true });
    await size.focus(); await size.press('Home'); await size.press('ArrowRight'); await size.press('ArrowRight'); await expect(size).toHaveValue('3');
    const seen = await preview(page, [4, 11], [20, 14]);
    expect(seen.some((v, i) => i % 4 === 3 && v > 0)).toBe(true);
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) if (x < 8 || x > 17 || y < 8 || y > 17) expect(seen[(y * 32 + x) * 4 + 3]).toBe(0);
    await page.mouse.up(); await expect.poll(() => pixels(page)).toEqual(seen);
    await page.getByTestId('undo-button').click(); await expect.poll(() => pixels(page)).toEqual(blank);
    await page.getByTestId('redo-button').click(); await expect.poll(() => pixels(page)).toEqual(seen);
  });
}
