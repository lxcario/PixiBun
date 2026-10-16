import { expect, type Page } from '@playwright/test';

type PixelPoint = [number, number];
const pixels = (page: Page, id = 'main-composite-canvas') => page.getByTestId(id).evaluate((canvas: HTMLCanvasElement) =>
  Array.from(canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data));
const hasInk = (data: number[]) => data.some((v, i) => i % 4 === 3 && v > 0);
const contains = (data: number[], [x, y]: PixelPoint) => data[(y * 32 + x) * 4 + 3] > 0;

async function blankStudio(page: Page) {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto('/studio');
  await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  await expect(page.getByTestId('main-composite-canvas')).toHaveAttribute('width', '32');
  expect(hasInk(await pixels(page))).toBe(false);
}
async function gesture(page: Page, start: PixelPoint, end: PixelPoint) {
  const box = (await page.getByTestId('main-composite-canvas').boundingBox())!;
  const at = ([x, y]: PixelPoint) => ({ x: box.x + (x + 0.5) * box.width / 32, y: box.y + (y + 0.5) * box.height / 32 });
  const first = at(start), last = at(end);
  await page.mouse.move(first.x, first.y); await page.mouse.down();
  await page.mouse.move(last.x, last.y, { steps: 4 });
  await expect.poll(async () => hasInk(await pixels(page, 'stroke-preview-canvas'))).toBe(true);
  expect(hasInk(await pixels(page))).toBe(false);
  const preview = await pixels(page, 'stroke-preview-canvas');
  await page.mouse.up();
  await expect.poll(() => pixels(page)).toEqual(preview);
  await expect.poll(async () => hasInk(await pixels(page, 'stroke-preview-canvas'))).toBe(false);
  await page.getByTestId('undo-button').click();
  await expect.poll(async () => hasInk(await pixels(page))).toBe(false);
  await page.getByTestId('redo-button').click();
  await expect.poll(() => pixels(page)).toEqual(preview);
  await page.getByTestId('undo-button').click();
  return preview;
}
export async function verifyFreeIso(page: Page, capture?: (name: string) => Promise<void>, scope: 'diagonal' | 'cardinal-edge' | 'mirrored' | 'all' = 'all') {
  await blankStudio(page); await page.keyboard.press('j');
  await page.getByTestId('tool-options-button').click();
  const snap = page.getByRole('button', { name: '2:1 Snap: ON', exact: true });
  await expect(snap).toHaveAttribute('aria-pressed', 'true'); await snap.click();
  await expect(page.getByRole('button', { name: '2:1 Snap: FREE', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await page.keyboard.press('Escape');
  const cases: [PixelPoint, PixelPoint][] = [[[2, 2], [20, 8]], [[4, 3], [9, 24]], [[26, 23], [8, 18]], [[20, 4], [5, 21]], [[15, 3], [15, 26]], [[2, 15], [25, 15]], [[0, 0], [5, 23]]];
  const selectedCases = scope === 'mirrored' ? [] : scope === 'diagonal' ? cases.slice(0, 4) : scope === 'cardinal-edge' ? cases.slice(4) : cases;
  for (const [start, end] of selectedCases) {
    const result = await gesture(page, start, end);
    expect(contains(result, start)).toBe(true); expect(contains(result, end)).toBe(true);
    expect(result.filter((v, i) => i % 4 === 3 && v > 0)).toHaveLength(Math.max(Math.abs(end[0] - start[0]), Math.abs(end[1] - start[1])) + 1);
  }
  if (scope === 'diagonal' || scope === 'cardinal-edge') return;
  await page.getByTestId('tool-options-button').click();
  await page.getByRole('button', { name: 'Brush size 1 pixels. Size 1 px', exact: true }).click();
  await page.getByRole('button', { name: '3 pixel brush preset', exact: true }).click();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Horizontal symmetry', exact: true }).click();
  const mirrored = await gesture(page, [2, 3], [9, 24]);
  // Keep all 1,024 symmetry comparisons in one structured assertion rather
  // than emitting a traced Playwright assertion for every canvas pixel.
  const ink = Array.from({ length: 32 }, (_, y) => Array.from({ length: 32 }, (_, x) => contains(mirrored, [x, y])));
  expect(ink).toEqual(ink.map(row => [...row].reverse()));
  await page.getByTestId('redo-button').click();
  await expect.poll(() => pixels(page)).toEqual(mirrored);
  if (capture) { await page.getByTestId('tool-options-button').click(); await capture('iso-free-thick-mirrored.png'); }
}
export async function verifySnappedIso(page: Page, capture?: (name: string) => Promise<void>) {
  await blankStudio(page); await page.keyboard.press('j');
  const result = await gesture(page, [2, 2], [20, 8]);
  expect(contains(result, [2, 2])).toBe(true);
  expect(contains(result, [20, 8])).toBe(false);
  // For this drag, the established projection ends at (18, 10), with 2:1 steps.
  expect(contains(result, [18, 10])).toBe(true);
  await page.getByTestId('redo-button').click();
  if (capture) { await page.getByTestId('tool-options-button').click(); await capture('iso-snapped.png'); }
}
export async function verifyFloatingPreview(page: Page, capture?: (name: string) => Promise<void>) {
  await blankStudio(page); const canvas = page.getByTestId('main-composite-canvas');
  const box = (await canvas.boundingBox())!;
  await page.keyboard.press('x');
  const outline: PixelPoint[] = [[10, 11], [12, 9], [14, 11], [16, 9], [18, 11], [14, 16], [10, 11]];
  const at = ([x, y]: PixelPoint) => [box.x + (x + 0.5) * box.width / 32, box.y + (y + 0.5) * box.height / 32];
  const first = at(outline[0]); await page.mouse.move(first[0], first[1]); await page.mouse.down();
  for (const point of outline.slice(1)) { const next = at(point); await page.mouse.move(next[0], next[1], { steps: 4 }); }
  await page.mouse.up();
  const original = await pixels(page);
  const window = page.getByRole('dialog', { name: 'Live Preview Window', exact: true });
  const toggle = async () => { await page.getByRole('button', { name: 'View options menu', exact: true }).click(); await page.getByRole('button', { name: 'Toggle Live PiP Preview Window', exact: true }).click(); await page.keyboard.press('Escape'); };
  await toggle(); await expect(window).toHaveCount(1); await expect(window).toBeVisible();
  const preview = window.locator('canvas');
  const previewPixels = () => preview.evaluate((c: HTMLCanvasElement) => Array.from(c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data));
  await expect.poll(previewPixels).toEqual(original);
  // Move the preview over the artwork: its controls must not start a drawing.
  const title = window.getByText('Live Preview', { exact: true });
  const titleBox = (await title.boundingBox())!;
  await page.mouse.move(titleBox.x + 20, titleBox.y + 5); await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 5 }); await page.mouse.up();
  await window.getByRole('button', { name: '4x', exact: true }).click();
  await window.getByRole('button', { name: 'Backdrop: alabaster', exact: true }).click();
  expect(await pixels(page)).toEqual(original);
  const previewArea = preview.locator('..');
  const beforeResize = (await previewArea.boundingBox())!;
  const resize = (await window.getByTitle('Drag to resize Live Preview window', { exact: true }).boundingBox())!;
  await page.mouse.move(resize.x + resize.width / 2, resize.y + resize.height / 2); await page.mouse.down();
  await page.mouse.move(resize.x + resize.width / 2 + 50, resize.y + resize.height / 2 + 30, { steps: 4 }); await page.mouse.up();
  await expect.poll(async () => (await previewArea.boundingBox())!.width).toBeGreaterThan(beforeResize.width);
  await expect.poll(async () => (await previewArea.boundingBox())!.height).toBeGreaterThan(beforeResize.height);
  expect(await pixels(page)).toEqual(original);
  await window.getByRole('button', { name: 'Minimize Preview Window', exact: true }).click();
  await expect(preview).toHaveCount(0);
  await window.getByRole('button', { name: 'Expand Preview Window', exact: true }).click();
  await expect.poll(previewPixels).toEqual(original);
  await expect(window).toHaveCount(1);
  if (capture) await capture('single-live-preview.png');
  await window.getByRole('button', { name: 'Close Preview Window', exact: true }).click();
  await expect(window).toHaveCount(0);
  await toggle(); await expect(window).toHaveCount(1); await expect.poll(previewPixels).toEqual(original);
  await page.getByTestId('undo-button').click();
  await expect.poll(async () => hasInk(await pixels(page))).toBe(false);
  await expect.poll(async () => hasInk(await previewPixels())).toBe(false);
  await page.getByTestId('redo-button').click(); await expect.poll(previewPixels).toEqual(original);
  await toggle(); await expect(window).toHaveCount(0);
}
