import { expect, test } from '@playwright/test';

type StudioState = {
  setCanvasSize: (width: number, height: number) => void;
  setActiveTool: (tool: 'pen' | 'color-replace') => void;
  setPrimaryColor: (color: string) => void;
  setBucketTolerance: (tolerance: number) => void;
  toggleLayerLock: (layerId: string) => void;
  activeLayerId: string;
};

test('Color Replace respects tolerance, active layer lock, and undo', async ({ page }) => {
  await page.goto('/studio');
  await expect(page.locator('[data-restoration-phase]')).toHaveAttribute('data-restoration-phase', 'active');
  const artwork = page.getByTestId('main-composite-canvas');
  await expect(artwork).toBeVisible();
  await page.evaluate(() => (window as Window & { __studioStore?: { getState: () => StudioState } }).__studioStore!.getState().setCanvasSize(32, 32));
  const clickPixel = async (x: number, y: number) => {
    const stage = await artwork.boundingBox();
    expect(stage).not.toBeNull();
    await page.mouse.click(stage!.x + (x + 0.5) * stage!.width / 32, stage!.y + (y + 0.5) * stage!.height / 32);
  };
  const pixel = (x: number, y: number) => artwork.evaluate((canvas: HTMLCanvasElement, point: [number, number]) => {
    return Array.from(canvas.getContext('2d')!.getImageData(point[0], point[1], 1, 1).data);
  }, [x, y] as [number, number]);

  for (const [x, color] of [[3, '#8060a0'], [6, '#8866a5'], [9, '#28203c']] as const) {
    await page.evaluate((next) => (window as Window & { __studioStore?: { getState: () => StudioState } }).__studioStore!.getState().setPrimaryColor(next), color);
    await clickPixel(x, 4);
  }
  await page.evaluate(() => {
    const state = (window as Window & { __studioStore?: { getState: () => StudioState } }).__studioStore!.getState();
    state.setPrimaryColor('#ff00aa');
    state.setActiveTool('color-replace');
  });
  await page.getByTestId('tool-options-button').click();
  await expect(page.getByRole('slider', { name: 'Color Replace tolerance' })).toHaveValue('0');
  await page.keyboard.press('Escape');
  await clickPixel(3, 4);
  await expect.poll(() => pixel(3, 4)).toEqual([255, 0, 170, 255]);
  expect(await pixel(6, 4)).toEqual([136, 102, 165, 255]);

  await page.getByTestId('undo-button').click();
  await expect.poll(() => pixel(3, 4)).toEqual([128, 96, 160, 255]);
  await page.evaluate(() => (window as Window & { __studioStore?: { getState: () => StudioState } }).__studioStore!.getState().setBucketTolerance(12));
  await page.getByTestId('tool-options-button').click();
  await expect(page.getByRole('slider', { name: 'Color Replace tolerance' })).toHaveValue('12');
  await page.keyboard.press('Escape');
  await clickPixel(3, 4);
  await expect.poll(() => pixel(6, 4)).toEqual([255, 0, 170, 255]);
  expect(await pixel(9, 4)).toEqual([40, 32, 60, 255]);

  await page.evaluate(() => {
    const state = (window as Window & { __studioStore?: { getState: () => StudioState } }).__studioStore!.getState();
    state.toggleLayerLock(state.activeLayerId);
    state.setPrimaryColor('#00ff00');
  });
  await clickPixel(9, 4);
  expect(await pixel(9, 4)).toEqual([40, 32, 60, 255]);
});
