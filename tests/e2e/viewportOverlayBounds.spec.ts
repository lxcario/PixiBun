import { test, expect } from '@playwright/test';

test('large supported artwork never scales overlay backing stores with zoom', async ({ page }) => {
  await page.goto('/studio');
  const grid = page.getByTestId('grid-selection-overlay');
  const brushGhost = page.getByTestId('brush-ghost-overlay');
  await expect(grid).toBeVisible();
  await expect.poll(() => page.evaluate(() => Boolean((window as Window & { __studioStore?: unknown }).__studioStore))).toBe(true);
  await page.evaluate(() => {
    const store = (window as Window & { __studioStore?: { getState: () => { setCanvasSize: (w: number, h: number) => void } } }).__studioStore!.getState();
    store.setCanvasSize(2048, 2048);
  });
  await expect(grid).toHaveAttribute('width', '2048');
  await expect(grid).toHaveAttribute('height', '2048');
  await expect.poll(() => grid.evaluate((element) => getComputedStyle(element).backgroundSize)).toContain('16px 16px');
  await expect(brushGhost).toHaveJSProperty('tagName', 'DIV');

  const viewport = await page.locator('#main-content').boundingBox();
  expect(viewport).not.toBeNull();
  await page.mouse.move(viewport!.x + viewport!.width / 2, viewport!.y + viewport!.height / 2);
  await expect(brushGhost).toBeVisible();
  await expect.poll(() => brushGhost.evaluate((element) => getComputedStyle(element).width)).toBe('16px');

  await page.evaluate(() => (window as Window & { __studioStore?: { getState: () => { setZoom: (zoom: number) => void } } }).__studioStore!.getState().setZoom(6400));
  await expect(grid).toHaveAttribute('width', '2048');
  await expect(grid).toHaveAttribute('height', '2048');
  await expect.poll(() => grid.evaluate((element) => getComputedStyle(element).backgroundSize)).toContain('64px 64px');
  await expect(brushGhost).toHaveJSProperty('tagName', 'DIV');
  await page.evaluate(() => (window as Window & { __studioStore?: { getState: () => { toggleIsoGuides: () => void } } }).__studioStore!.getState().toggleIsoGuides());
  const iso = page.getByTestId('isometric-guide-overlay');
  await expect(iso).toBeVisible();
  await expect.poll(() => iso.evaluate((element) => getComputedStyle(element).backgroundImage)).toContain('repeating-linear-gradient');
  expect(await grid.evaluate((element: HTMLCanvasElement) => element.getContext('2d')!.getImageData(0, 0, 1, 1).data[3])).toBe(0);
});

test('a three-pixel pen uses the same square footprint as its CSS brush outline', async ({ page }) => {
  await page.goto('/studio');
  const artwork = page.getByTestId('main-composite-canvas');
  const ghost = page.getByTestId('brush-ghost-overlay');
  await expect(artwork).toBeVisible();
  await expect.poll(() => page.evaluate(() => Boolean((window as Window & { __studioStore?: unknown }).__studioStore))).toBe(true);
  await page.evaluate(() => {
    const state = (window as Window & { __studioStore?: { getState: () => {
      setBrushSize: (size: number) => void; setActiveTool: (tool: 'pen') => void;
    } } }).__studioStore!.getState();
    state.setActiveTool('pen');
    state.setBrushSize(3);
  });
  const stage = await page.locator('#center-canvas-area').boundingBox();
  expect(stage).not.toBeNull();
  const zoom = 16;
  const x = stage!.x + 10.5 * zoom;
  const y = stage!.y + 10.5 * zoom;
  await page.mouse.move(x - zoom, y - zoom);
  await page.mouse.move(x, y, { steps: 4 });
  await expect(ghost).toBeVisible();
  await expect.poll(() => ghost.evaluate((element) => getComputedStyle(element).width)).toBe('48px');
  await expect.poll(() => ghost.evaluate((element) => getComputedStyle(element).height)).toBe('48px');
  await page.mouse.down();
  await page.mouse.up();
  await expect.poll(() => artwork.evaluate((element: HTMLCanvasElement) => {
    const pixels = element.getContext('2d')!.getImageData(0, 0, element.width, element.height).data;
    let count = 0;
    for (let i = 3; i < pixels.length; i += 4) if (pixels[i] > 0) count++;
    return count;
  })).toBe(9);
});
