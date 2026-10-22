import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { summarizeCanvasPixels } from '../../src/lib/render/canvasReadout';
import { chooseTool } from '../helpers/tools';

const SIZE = 32;
// The stroke: one row of eight pixels, x 4..11 on y 4.
const STROKE_Y = 4;
const STROKE_FROM = 4;
const STROKE_TO = 11;

function expectedSummary(rgb: [number, number, number] | null) {
  const rgba = new Uint8ClampedArray(SIZE * SIZE * 4);
  if (rgb) {
    for (let x = STROKE_FROM; x <= STROKE_TO; x++) rgba.set([...rgb, 255], (STROKE_Y * SIZE + x) * 4);
  }
  return summarizeCanvasPixels(rgba, SIZE, SIZE);
}

async function pixelCenter(page: Page, x: number, y: number) {
  const box = await page.getByTestId('main-composite-canvas').boundingBox();
  expect(box).not.toBeNull();
  return { x: box!.x + (x + 0.5) * box!.width / SIZE, y: box!.y + (y + 0.5) * box!.height / SIZE };
}

test('canvas readout reports a committed stroke, ignores it mid-drag and follows undo and redo', async ({ page }) => {
  await page.goto(`/studio?width=${SIZE}&height=${SIZE}`);
  await expect(page.getByTestId('main-composite-canvas')).toBeVisible();
  const readout = page.getByTestId('canvas-readout');
  await expect(readout).toHaveAttribute('data-state', 'ready');

  const blank = expectedSummary(null);
  await expect(page.getByTestId('canvas-readout-size')).toHaveText(`${SIZE}×${SIZE}`);
  await expect(page.getByTestId('canvas-readout-frame')).toHaveText('1 of 1');
  await expect(page.getByTestId('canvas-readout-frames')).toHaveText('1');
  await expect(page.getByTestId('canvas-readout-layer')).toHaveText('Base Layer');
  await expect(page.getByTestId('canvas-readout-layers')).toHaveText('1');
  await expect(page.getByTestId('canvas-readout-pixels')).toHaveText('0');
  await expect(page.getByTestId('canvas-readout-colors')).toHaveText('0');
  await expect(page.getByTestId('canvas-readout-top-colors')).toHaveText('none');
  await expect(page.getByTestId('canvas-readout-digest')).toHaveText(blank.digest);
  await expect(page.getByTestId('canvas-readout-summary')).toHaveText(
    `${SIZE}×${SIZE} canvas, frame 1 of 1, layer Base Layer of 1 layer: 0 painted pixels in 0 colors.`);

  const primary = await page.evaluate(() =>
    (window as Window & { __studioStore?: { getState: () => { primaryColor: string } } }).__studioStore!.getState().primaryColor);
  const rgb = [1, 3, 5].map((i) => parseInt(primary.slice(i, i + 2), 16)) as [number, number, number];
  const stroked = expectedSummary(rgb);
  const hex = primary.toLowerCase();
  // The TestSprite PRD names the fresh-browser Pen color.
  expect(hex).toBe('#3a2e4c');

  await chooseTool(page, 'pen');
  const start = await pixelCenter(page, STROKE_FROM, STROKE_Y);
  const middle = await pixelCenter(page, 8, STROKE_Y);
  const end = await pixelCenter(page, STROKE_TO, STROKE_Y);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(middle.x, middle.y, { steps: 4 });
  // Paint is on the canvas, but the stroke is not committed: the readout waits.
  await expect.poll(() => page.getByTestId('main-composite-canvas').evaluate((canvas: HTMLCanvasElement, point) =>
    canvas.getContext('2d')!.getImageData(point.x, point.y, 1, 1).data[3], { x: STROKE_FROM, y: STROKE_Y })).toBe(255);
  await page.waitForTimeout(300);
  await expect(page.getByTestId('canvas-readout-pixels')).toHaveText('0');
  await expect(readout).toHaveAttribute('data-state', 'pending');
  await page.mouse.move(end.x, end.y, { steps: 4 });
  await page.mouse.up();

  await expect(readout).toHaveAttribute('data-state', 'ready');
  await expect(page.getByTestId('canvas-readout-pixels')).toHaveText(String(STROKE_TO - STROKE_FROM + 1));
  await expect(page.getByTestId('canvas-readout-colors')).toHaveText('1');
  await expect(page.getByTestId('canvas-readout-top-colors')).toHaveText(`${hex} 8`);
  await expect(page.getByTestId('canvas-readout-digest')).toHaveText(stroked.digest);
  expect(stroked.digest).not.toBe(blank.digest);
  await expect(page.getByTestId('canvas-readout-summary')).toHaveText(
    `${SIZE}×${SIZE} canvas, frame 1 of 1, layer Base Layer of 1 layer: 8 painted pixels in 1 color.`);

  await page.getByTestId('undo-button').click();
  await expect(page.getByTestId('canvas-readout-pixels')).toHaveText('0');
  await expect(page.getByTestId('canvas-readout-digest')).toHaveText(blank.digest);

  await page.getByTestId('redo-button').click();
  await expect(page.getByTestId('canvas-readout-pixels')).toHaveText('8');
  await expect(page.getByTestId('canvas-readout-digest')).toHaveText(stroked.digest);
});

async function dragRow(page: Page, from: number, to: number, y: number) {
  const start = await pixelCenter(page, from, y);
  const end = await pixelCenter(page, to, y);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 6 });
  await page.mouse.up();
}

async function readValues(page: Page) {
  await expect(page.getByTestId('canvas-readout')).toHaveAttribute('data-state', 'ready');
  return {
    pixels: await page.getByTestId('canvas-readout-pixels').textContent(),
    digest: await page.getByTestId('canvas-readout-digest').textContent(),
  };
}

test('canvas readout counts erased pixels and only visible, unlocked paint', async ({ page }) => {
  await page.goto(`/studio?width=${SIZE}&height=${SIZE}`);
  await expect(page.getByTestId('canvas-readout')).toHaveAttribute('data-state', 'ready');
  const blank = expectedSummary(null);

  await chooseTool(page, 'pen');
  await dragRow(page, STROKE_FROM, STROKE_TO, STROKE_Y);
  await expect(page.getByTestId('canvas-readout-pixels')).toHaveText('8');

  await chooseTool(page, 'eraser');
  await dragRow(page, STROKE_FROM, 7, STROKE_Y);
  await expect(page.getByTestId('canvas-readout-pixels')).toHaveText('4');
  const erased = await readValues(page);
  expect(erased.digest).not.toBe(blank.digest);

  // Hidden layers are not part of the frame's composite.
  await page.getByRole('button', { name: 'Hide layer Base Layer' }).click();
  await expect(page.getByTestId('canvas-readout-pixels')).toHaveText('0');
  await expect(page.getByTestId('canvas-readout-digest')).toHaveText(blank.digest);
  await page.getByRole('button', { name: 'Show layer Base Layer' }).click();
  await expect(page.getByTestId('canvas-readout-digest')).toHaveText(erased.digest!);

  // A locked layer refuses the stroke, so nothing in the readout moves.
  await page.getByRole('button', { name: 'Lock layer Base Layer' }).click();
  await expect(page.getByRole('button', { name: 'Unlock layer Base Layer' })).toBeVisible();
  await chooseTool(page, 'pen');
  // Locking changes layer metadata, which the readout reads once; let it settle.
  expect(await readValues(page)).toEqual(erased);
  const revision = await page.getByTestId('canvas-readout').getAttribute('data-revision');
  await dragRow(page, 2, 20, 10);
  await page.waitForTimeout(300);
  expect(await readValues(page)).toEqual(erased);
  await expect(page.getByTestId('canvas-readout')).toHaveAttribute('data-revision', revision!);
});

test('canvas readout gives a starter template the same digest on every fresh load', async ({ browser }) => {
  const loads = [];
  for (let i = 0; i < 2; i++) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto('/studio?template=bun');
    await expect(page.getByTestId('canvas-readout-size')).toHaveText('16×16');
    await expect.poll(async () => Number(await page.getByTestId('canvas-readout-pixels').textContent())).toBeGreaterThan(0);
    loads.push(await readValues(page));
    await context.close();
  }
  expect(loads[1]).toEqual(loads[0]);
  // docs/testsprite/PRD.md publishes these; update both together if Bun's art changes.
  expect(loads[0]).toEqual({ pixels: '192', digest: '6af29269' });
});

test('canvas readout follows layer and frame changes and stays in the accessibility tree', async ({ page }) => {
  await page.goto(`/studio?width=${SIZE}&height=${SIZE}`);
  await expect(page.getByTestId('canvas-readout')).toHaveAttribute('data-state', 'ready');

  await page.getByRole('button', { name: 'Add New Layer' }).click();
  await expect(page.getByTestId('canvas-readout-layers')).toHaveText('2');
  await expect(page.getByTestId('canvas-readout-layer')).toHaveText('Layer 2');

  await page.getByTestId('add-frame-button').click();
  await expect(page.getByTestId('canvas-readout-frames')).toHaveText('2');
  await expect(page.getByTestId('canvas-readout-frame')).toHaveText('2 of 2');

  // Visually hidden, yet a named region with a live status for screen readers.
  await expect(page.getByRole('region', { name: 'Canvas readout' })).toBeAttached();
  await expect(page.getByTestId('canvas-readout-summary')).toHaveAttribute('role', 'status');
  const findings = await new AxeBuilder({ page }).include('[data-testid="canvas-readout"]').analyze();
  expect(findings.violations).toEqual([]);
});
