import { expect, test } from '@playwright/test';

type StudioState = {
  frames: Array<{ layers: Array<{ id: string; name: string }> }>;
  activeFrameIndex: number;
  activeLayerId: string;
  addLayer: (name: string) => void;
  addFrame: () => void;
  setActiveFrame: (index: number) => void;
  setActiveLayer: (id: string) => void;
  setActiveTool: (tool: 'pen') => void;
  setPrimaryColor: (color: string) => void;
};

test('a new blank frame keeps layer names but not the prior frame artwork', async ({ page }) => {
  await page.goto('/studio');
  await expect(page.locator('[data-restoration-phase]')).toHaveAttribute('data-restoration-phase', 'active');
  const canvas = page.getByTestId('main-composite-canvas');
  await expect(canvas).toBeVisible();
  await page.evaluate(() => {
    const state = (window as Window & { __studioStore?: { getState: () => StudioState } }).__studioStore!.getState();
    state.addLayer('Ink');
    state.setActiveTool('pen');
    state.setPrimaryColor('#ff0000');
  });
  const stage = await page.locator('#center-canvas-area').boundingBox();
  expect(stage).not.toBeNull();
  const at = (x: number, y: number) => ({ x: stage!.x + (x + 0.5) * 16, y: stage!.y + (y + 0.5) * 16 });
  const pixel = (x: number, y: number) => canvas.evaluate((element: HTMLCanvasElement, point: [number, number]) =>
    Array.from(element.getContext('2d')!.getImageData(point[0], point[1], 1, 1).data), [x, y] as [number, number]);

  await page.mouse.click(at(8, 8).x, at(8, 8).y);
  await page.evaluate(() => {
    const state = (window as Window & { __studioStore?: { getState: () => StudioState } }).__studioStore!.getState();
    state.setActiveLayer(state.frames[0].layers[1].id);
    state.setPrimaryColor('#0000ff');
  });
  await page.mouse.click(at(16, 16).x, at(16, 16).y);
  await expect.poll(() => pixel(8, 8)).toEqual([255, 0, 0, 255]);
  await expect.poll(() => pixel(16, 16)).toEqual([0, 0, 255, 255]);
  const firstLayers = await page.evaluate(() => (window as Window & { __studioStore?: { getState: () => StudioState } }).__studioStore!.getState().frames[0].layers.map(({ id, name }) => ({ id, name })));

  await page.getByTitle(/Add blank frame with the current layer names/i).click();
  const second = await page.evaluate(() => {
    const state = (window as Window & { __studioStore?: { getState: () => StudioState } }).__studioStore!.getState();
    return { activeFrameIndex: state.activeFrameIndex, layers: state.frames[1].layers.map(({ id, name }) => ({ id, name })) };
  });
  expect(second.activeFrameIndex).toBe(1);
  expect(second.layers.map((layer) => layer.name)).toEqual(firstLayers.map((layer) => layer.name));
  expect(second.layers.every((layer) => firstLayers.every((first) => first.id !== layer.id))).toBe(true);
  await expect(page.getByTestId('layers-stack-header')).toContainText('Frame 2');
  await expect.poll(() => pixel(8, 8)).toEqual([0, 0, 0, 0]);
  await expect.poll(() => pixel(16, 16)).toEqual([0, 0, 0, 0]);

  await page.evaluate(() => {
    const state = (window as Window & { __studioStore?: { getState: () => StudioState } }).__studioStore!.getState();
    state.setPrimaryColor('#00ff00');
  });
  await page.mouse.click(at(8, 8).x, at(8, 8).y);
  await expect.poll(() => pixel(8, 8)).toEqual([0, 255, 0, 255]);
  await page.evaluate(() => (window as Window & { __studioStore?: { getState: () => StudioState } }).__studioStore!.getState().setActiveFrame(0));
  await expect.poll(() => pixel(8, 8)).toEqual([255, 0, 0, 255]);
  await expect.poll(() => pixel(16, 16)).toEqual([0, 0, 255, 255]);
});
