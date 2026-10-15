import { expect, test } from '@playwright/test';

type StudioState = {
  frames: Array<{ layers: Array<{ id: string; name: string }> }>;
  activeLayerId: string;
  addLayer: (name?: string, tag?: string) => void;
  setLayerBlendMode: (id: string, blendMode: 'source-atop') => void;
  setActiveTool: (tool: 'pen') => void;
  setPrimaryColor: (color: string) => void;
};
type StudioWindow = Window & { __studioStore?: { getState: () => StudioState } };

// A photometric matte is "On artwork only": the stage clips it to the artwork
// below while its own buffer (and Layers thumbnail) keeps every stroke. Paint
// over the artwork must show at once; paint beside it must be explained.
test('painting on an On artwork only matte shows over artwork and explains hidden pixels', async ({ page }) => {
  await page.goto('/studio');
  await expect(page.locator('[data-restoration-phase]')).toHaveAttribute('data-restoration-phase', 'active');
  const canvas = page.getByTestId('main-composite-canvas');
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  const size = await canvas.evaluate((element: HTMLCanvasElement) => element.width);
  expect(box).not.toBeNull();
  const cell = box!.width / size;
  const at = (x: number, y: number) => ({ x: box!.x + (x + 0.5) * cell, y: box!.y + (y + 0.5) * cell });
  const click = (x: number, y: number) => page.mouse.click(at(x, y).x, at(x, y).y);
  const pixel = (x: number, y: number) => canvas.evaluate((element: HTMLCanvasElement, point: [number, number]) =>
    Array.from(element.getContext('2d')!.getImageData(point[0], point[1], 1, 1).data), [x, y] as [number, number]);

  // Artwork on the normal Base Layer draws straight onto the stage.
  await page.evaluate(() => {
    const state = (window as StudioWindow).__studioStore!.getState();
    state.setActiveTool('pen');
    state.setPrimaryColor('#ff0000');
  });
  await click(8, 8);
  await expect.poll(() => pixel(8, 8)).toEqual([255, 0, 0, 255]);

  await page.evaluate(() => {
    const store = (window as StudioWindow).__studioStore!;
    store.getState().addLayer('Photometric matte', 'photometric');
    const state = store.getState();
    state.setLayerBlendMode(state.activeLayerId, 'source-atop');
    state.setPrimaryColor('#0000ff');
  });
  const clipHint = page.getByTestId('status-bar-clip-hint');
  await expect(clipHint).toHaveText('On artwork only');

  // Over the artwork the matte stroke repaints the stage immediately.
  await click(8, 8);
  await expect.poll(() => pixel(8, 8)).toEqual([0, 0, 255, 255]);

  // Beside the artwork it is clipped away, and the studio says so.
  await click(12, 12);
  const toast = page.getByTestId('studio-toast');
  await expect(toast).toContainText('“Photometric matte” is On artwork only');
  await expect(toast).toContainText('1 pixel of that stroke');
  expect(await pixel(12, 12)).toEqual([0, 0, 0, 0]);

  await toast.getByRole('button', { name: 'Draw on Base Layer' }).click();
  await expect(clipHint).toBeHidden();
  await click(12, 12);
  await expect.poll(() => pixel(12, 12)).toEqual([0, 0, 255, 255]);
});
