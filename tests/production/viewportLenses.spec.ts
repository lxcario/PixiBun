import { test, expect } from '@playwright/test';

test('native lens filters use linear color for CVD, encoded ink for squint and preserve source pixels', async ({ page }) => {
  await page.goto('/studio');
  await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  const canvas = page.getByTestId('main-composite-canvas');
  await expect(canvas).toBeVisible();
  const box = (await canvas.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  const before = await canvas.evaluate((node: HTMLCanvasElement) => Array.from(node.getContext('2d')!.getImageData(0, 0, node.width, node.height).data));
  await page.keyboard.press('p');
  const pixels = await page.evaluate(async () => {
    const sample = async (id: string) => {
      const filter = document.getElementById(id)!;
      const markup = `<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><defs>${filter.outerHTML}</defs><rect width="8" height="8" fill="#ff0000" filter="url(#${id})"/></svg>`;
      const image = new Image();
      image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(markup);
      await image.decode();
      const target = document.createElement('canvas'); target.width = target.height = 8;
      const ctx = target.getContext('2d')!; ctx.drawImage(image, 0, 0);
      return Array.from(ctx.getImageData(4, 4, 1, 1).data);
    };
    return { cvd: await sample('pixibun-cvd-protanopia'), squint: await sample('pixibun-squint') };
  });
  for (const [i, expected] of [109, 95, 0, 255].entries()) expect(Math.abs(pixels.cvd[i] - expected)).toBeLessThanOrEqual(2);
  expect(pixels.squint).toEqual([20, 12, 30, 255]);
  await page.keyboard.press('s');
  const after = await canvas.evaluate((node: HTMLCanvasElement) => Array.from(node.getContext('2d')!.getImageData(0, 0, node.width, node.height).data));
  expect(after).toEqual(before);
});
