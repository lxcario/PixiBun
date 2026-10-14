import { expect, test, type Page } from '@playwright/test';

// Audit v1.14.1 defect 2: selections did not limit Pen, Eraser or Bucket, and switching
// to those tools cleared the selection.

const SIZE = 32;
const composite = (page: Page) => page.getByTestId('main-composite-canvas');
const pixels = (page: Page) => composite(page).evaluate((canvas: HTMLCanvasElement) =>
  Array.from(canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data));

/** Canvas pixel indexes whose RGBA differs between two reads. */
function changed(before: number[], after: number[]): Set<number> {
  const out = new Set<number>();
  for (let i = 0; i < before.length; i += 4) {
    if (before[i] !== after[i] || before[i + 1] !== after[i + 1] || before[i + 2] !== after[i + 2] || before[i + 3] !== after[i + 3]) out.add(i / 4);
  }
  return out;
}

async function at(page: Page, x: number, y: number) {
  const box = (await composite(page).boundingBox())!;
  return { x: box.x + ((x + 0.5) * box.width) / SIZE, y: box.y + ((y + 0.5) * box.height) / SIZE };
}

async function drag(page: Page, points: Array<[number, number]>) {
  const first = await at(page, ...points[0]);
  await page.mouse.move(first.x, first.y);
  await page.mouse.down();
  for (const point of points.slice(1)) {
    const p = await at(page, ...point);
    await page.mouse.move(p.x, p.y, { steps: 12 });
  }
  await page.mouse.up();
}

async function pickTool(page: Page, key: string) {
  // Point at a corner pixel so shortcuts reach the canvas, without an element hover
  // (the marquee's handles cover the selection while a selection tool is active).
  const corner = await at(page, 0, SIZE - 1);
  await page.mouse.move(corner.x, corner.y);
  await page.keyboard.press(key);
}

/** Paints with a tool and returns the pixels it changed. */
async function paintChanges(page: Page, action: () => Promise<void>) {
  const before = await pixels(page);
  await action();
  await expect.poll(async () => changed(before, await pixels(page)).size, { timeout: 3000 }).toBeGreaterThan(0);
  return changed(before, await pixels(page));
}

function outside(changes: Set<number>, selected: Set<number>) {
  return [...changes].filter(index => !selected.has(index)).map(index => `${index % SIZE},${Math.floor(index / SIZE)}`);
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto(`/studio?width=${SIZE}&height=${SIZE}`, { waitUntil: 'domcontentloaded' });
  await expect.poll(() => composite(page).evaluate((canvas: HTMLCanvasElement) => [canvas.width, canvas.height])).toEqual([SIZE, SIZE]);
  await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
});

test('a marquee limits bucket, pen, eraser, line and rectangle, and survives tool switches', async ({ page }) => {
  await pickTool(page, 'm');
  await drag(page, [[8, 8], [16, 16]]);

  // The bucket fills exactly the selection on a blank canvas: that set is the selection.
  await pickTool(page, 'g');
  const selected = await paintChanges(page, async () => {
    const p = await at(page, 12, 12);
    await page.mouse.click(p.x, p.y);
  });
  expect(selected.size).toBeGreaterThan(40);
  expect(selected.size).toBeLessThan(SIZE * SIZE / 4);

  await page.keyboard.press('x');
  for (const [key, path] of [
    ['b', [[2, 12], [29, 12]]],
    ['e', [[12, 2], [12, 29]]],
    ['l', [[1, 1], [30, 30]]],
    ['u', [[11, 3], [27, 13]]],
  ] as Array<[string, Array<[number, number]>]>) {
    await pickTool(page, key);
    const changes = await paintChanges(page, () => drag(page, path));
    expect(outside(changes, selected), `tool ${key} painted outside the marquee`).toEqual([]);
  }

  // Esc releases the selection, and painting reaches the whole canvas again.
  await page.keyboard.press('Escape');
  await pickTool(page, 'b');
  const free = await paintChanges(page, () => drag(page, [[1, 28], [30, 28]]));
  expect(outside(free, selected).length).toBeGreaterThan(20);
});

test('a lasso limits the pen and the bucket never leaks out of it', async ({ page }) => {
  await pickTool(page, 'q');
  await drag(page, [[4, 4], [26, 6], [14, 26], [4, 4]]);
  await pickTool(page, 'g');
  const selected = await paintChanges(page, async () => {
    const p = await at(page, 13, 10);
    await page.mouse.click(p.x, p.y);
  });
  expect(selected.size).toBeLessThan(SIZE * SIZE / 2);
  await page.keyboard.press('x');
  await pickTool(page, 'b');
  const changes = await paintChanges(page, () => drag(page, [[1, 12], [30, 12]]));
  expect(outside(changes, selected)).toEqual([]);
});
