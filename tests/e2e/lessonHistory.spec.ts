import { expect, test, type Page } from '@playwright/test';
import type { StudioState } from '../../src/stores/studioStore';

type StudioWindow = Window & { __studioStore: { getState(): StudioState } };
const pixels = (page: Page) => page.getByTestId('main-composite-canvas').evaluate((canvas: HTMLCanvasElement) =>
  Array.from(canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data));

test('lesson Trace and Clear undo and redo exact pixels through the real viewport', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto('/playground');
  await expect(page.getByTestId('main-composite-canvas')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Trace Stencil', exact: true })).toBeVisible();
  const original = await pixels(page);
  await page.getByRole('button', { name: 'Trace Stencil', exact: true }).click();
  await expect.poll(() => pixels(page)).not.toEqual(original);
  const traced = await pixels(page);
  await page.keyboard.press('Control+z');
  await expect.poll(() => pixels(page)).toEqual(original);
  await page.keyboard.press('Control+Shift+z');
  await expect.poll(() => pixels(page)).toEqual(traced);
  await page.getByRole('button', { name: 'Clear Frame', exact: true }).click();
  await expect.poll(() => pixels(page)).toEqual(Array(traced.length).fill(0));
  await page.keyboard.press('Control+z');
  await expect.poll(() => pixels(page)).toEqual(traced);
  await page.screenshot({ path: testInfo.outputPath('lesson-trace-restored.png'), fullPage: true });
  await page.keyboard.press('Control+Shift+z');
  await expect.poll(() => pixels(page)).toEqual(Array(traced.length).fill(0));
  await expect.poll(() => page.evaluate(() => (window as unknown as StudioWindow).__studioStore.getState().isDirty)).toBe(true);
  await page.evaluate(() => {
    const state = (window as unknown as StudioWindow).__studioStore.getState();
    state.toggleLayerLock(state.activeLayerId);
  });
  await page.getByRole('button', { name: 'Trace Stencil', exact: true }).click();
  await expect.poll(() => pixels(page)).toEqual(Array(traced.length).fill(0));
  await page.getByRole('button', { name: 'Clear Frame', exact: true }).click();
  await expect.poll(() => pixels(page)).toEqual(Array(traced.length).fill(0));
});

test('mobile Playground never initializes desktop lesson metadata', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/playground');
  await expect(page.getByRole('heading', { name: 'Pocket Doodle Pad' })).toBeVisible();
  await expect(page.getByTestId('main-composite-canvas')).toHaveCount(0);
  await expect(page.getByRole('combobox', { name: 'Choose animation lesson' })).toHaveCount(0);
  const state = await page.evaluate(() => {
    const store = (window as unknown as StudioWindow).__studioStore.getState();
    return { width: store.canvasWidth, height: store.canvasHeight, frames: store.frames.length, fps: store.fps };
  });
  expect(state).toEqual({ width: 32, height: 32, frames: 1, fps: 8 });
});
