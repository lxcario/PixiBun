import { test, expect } from '@playwright/test';

test('small-screen studio link opens a usable pocket doodle pad', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/studio');
  await page.getByRole('link', { name: 'Try Pocket Doodle Pad' }).click();

  await expect(page).toHaveURL(/\/playground$/);
  await expect(page.getByRole('heading', { name: 'Pocket Doodle Pad' })).toBeVisible();
  const canvas = page.getByRole('img', { name: 'Pocket doodle canvas' });
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);
  const paintedAlpha = await canvas.evaluate((element: HTMLCanvasElement) =>
    element.getContext('2d')!.getImageData(16, 16, 1, 1).data[3]);
  expect(paintedAlpha).toBe(255);

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save PNG' }).click();
  expect((await downloadPromise).suggestedFilename()).toBe('pixibun-pocket-doodle.png');

  await page.getByRole('button', { name: 'Clear' }).click();
  const clearedAlpha = await canvas.evaluate((element: HTMLCanvasElement) =>
    element.getContext('2d')!.getImageData(16, 16, 1, 1).data[3]);
  expect(clearedAlpha).toBe(0);
});
