import { test, expect } from '@playwright/test';

test('the artwork and grid share exact screen bounds at high zoom', async ({ page }) => {
  await page.goto('/studio');
  await expect(page.locator('[data-restoration-phase]')).toHaveAttribute('data-restoration-phase', 'active');
  await page.evaluate(() => {
    const state = (window as Window & { __studioStore?: { getState: () => {
      setCanvasSize: (w: number, h: number) => void; setZoom: (zoom: number) => void;
    } } }).__studioStore!.getState();
    state.setCanvasSize(32, 32);
    state.setZoom(1600);
  });
  const sizes = await page.evaluate(() => {
    const stage = document.querySelector('#center-canvas-area')!.getBoundingClientRect();
    const artwork = document.querySelector('[data-testid="main-composite-canvas"]')!.getBoundingClientRect();
    const grid = document.querySelector('[data-testid="grid-selection-overlay"]')!.getBoundingClientRect();
    return {
      stage: [stage.x, stage.y, stage.width, stage.height],
      artwork: [artwork.x, artwork.y, artwork.width, artwork.height],
      grid: [grid.x, grid.y, grid.width, grid.height],
      pitch: getComputedStyle(document.querySelector('[data-testid="grid-selection-overlay"]')!).backgroundSize,
    };
  });
  expect(sizes.stage.slice(2)).toEqual([512, 512]);
  expect(sizes.artwork).toEqual(sizes.stage);
  expect(sizes.grid).toEqual(sizes.stage);
  expect(sizes.pitch).toBe('16px 16px, 16px 16px');
});

test('bucket recolors nearby shades through the visible grid without crossing a contrasting color', async ({ page }) => {
  await page.goto('/studio');
  await expect(page.locator('[data-restoration-phase]')).toHaveAttribute('data-restoration-phase', 'active');
  const artwork = page.getByTestId('main-composite-canvas');
  await page.evaluate(() => {
    const state = (window as Window & { __studioStore?: { getState: () => {
      setCanvasSize: (w: number, h: number) => void; setZoom: (zoom: number) => void;
    } } }).__studioStore!.getState();
    state.setCanvasSize(32, 32);
    state.setZoom(1600);
  });
  await expect(artwork).toHaveAttribute('width', '32');
  const clickPixel = async (x: number, y: number) => {
    const stage = await artwork.boundingBox();
    expect(stage).not.toBeNull();
    await page.mouse.click(stage!.x + (x + 0.5) * stage!.width / 32, stage!.y + (y + 0.5) * stage!.height / 32);
  };
  const pixel = (x: number, y: number) => artwork.evaluate((canvas: HTMLCanvasElement, point: [number, number]) =>
    Array.from(canvas.getContext('2d')!.getImageData(point[0], point[1], 1, 1).data), [x, y] as [number, number]);
  for (const [x, color] of [[8, '#f0c080'], [9, '#eabc7d'], [10, '#ffa000']] as const) {
    await page.evaluate((next) => (window as Window & { __studioStore?: { getState: () => { setPrimaryColor: (color: string) => void } } }).__studioStore!.getState().setPrimaryColor(next), color);
    await clickPixel(x, 8);
  }
  await page.evaluate(() => {
    const state = (window as Window & { __studioStore?: { getState: () => {
      setPrimaryColor: (color: string) => void; setActiveTool: (tool: 'bucket') => void;
    } } }).__studioStore!.getState();
    state.setPrimaryColor('#90aaff');
    state.setActiveTool('bucket');
  });
  await page.getByTestId('tool-options-button').click();
  await expect(page.getByRole('slider', { name: 'Bucket fill tolerance' })).toHaveValue('24');
  await page.keyboard.press('Escape');
  await clickPixel(8, 8);
  await expect.poll(() => pixel(8, 8)).toEqual([144, 170, 255, 255]);
  await expect.poll(() => pixel(9, 8)).toEqual([144, 170, 255, 255]);
  expect(await pixel(10, 8)).toEqual([255, 160, 0, 255]);
});

test('large supported artwork never scales overlay backing stores with zoom', async ({ page }) => {
  await page.goto('/studio');
  const grid = page.getByTestId('grid-selection-overlay');
  const selection = page.getByTestId('selection-overlay-canvas');
  const brushGhost = page.getByTestId('brush-ghost-overlay');
  await expect(grid).toBeVisible();
  await expect.poll(() => page.evaluate(() => Boolean((window as Window & { __studioStore?: unknown }).__studioStore))).toBe(true);
  await page.evaluate(() => {
    const store = (window as Window & { __studioStore?: { getState: () => { setCanvasSize: (w: number, h: number) => void } } }).__studioStore!.getState();
    store.setCanvasSize(2048, 2048);
  });
  await expect(grid).toHaveJSProperty('tagName', 'DIV');
  await expect(selection).toHaveAttribute('width', '2048');
  await expect(selection).toHaveAttribute('height', '2048');
  await expect.poll(() => grid.evaluate((element) => getComputedStyle(element).backgroundSize)).toContain('16px 16px');
  await expect(brushGhost).toHaveJSProperty('tagName', 'DIV');

  const viewport = await page.locator('#main-content').boundingBox();
  expect(viewport).not.toBeNull();
  await page.mouse.move(viewport!.x + viewport!.width / 2, viewport!.y + viewport!.height / 2);
  await expect(brushGhost).toBeVisible();
  await expect.poll(() => brushGhost.evaluate((element) => getComputedStyle(element).width)).toBe('16px');

  await page.evaluate(() => (window as Window & { __studioStore?: { getState: () => { setZoom: (zoom: number) => void } } }).__studioStore!.getState().setZoom(6400));
  await expect(selection).toHaveAttribute('width', '2048');
  await expect(selection).toHaveAttribute('height', '2048');
  await expect.poll(() => grid.evaluate((element) => getComputedStyle(element).backgroundSize)).toContain('64px 64px');
  await expect(brushGhost).toHaveJSProperty('tagName', 'DIV');
  await page.evaluate(() => (window as Window & { __studioStore?: { getState: () => { toggleIsoGuides: () => void } } }).__studioStore!.getState().toggleIsoGuides());
  const iso = page.getByTestId('isometric-guide-overlay');
  await expect(iso).toBeVisible();
  await expect.poll(() => iso.evaluate((element) => getComputedStyle(element).backgroundImage)).toContain('repeating-linear-gradient');
  expect(await selection.evaluate((element: HTMLCanvasElement) => element.getContext('2d')!.getImageData(0, 0, 1, 1).data[3])).toBe(0);
});

test('a three-pixel pen uses the same square footprint as its CSS brush outline', async ({ page }) => {
  await page.goto('/studio');
  await expect(page.locator('[data-restoration-phase]')).toHaveAttribute('data-restoration-phase', 'active');
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
  await expect(page.getByRole('button', { name: 'Brush size 3 pixels. Size 3 px', exact: true })).toBeVisible();
  const zoom = 16;
  // Hover may scroll the canvas; measure its position after that action.
  await artwork.hover({ position: { x: 10.5 * zoom, y: 10.5 * zoom } });
  const stage = await artwork.boundingBox();
  expect(stage).not.toBeNull();
  const x = stage!.x + 10.5 * zoom;
  const y = stage!.y + 10.5 * zoom;
  await page.mouse.move(x + 1, y + 1);
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
