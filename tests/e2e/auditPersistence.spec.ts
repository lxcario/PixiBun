import { test, expect } from '@playwright/test';

test('drawing survives an explicit save and a fresh-page IndexedDB restore', async ({ page }) => {
  await page.goto('/studio');
  const canvas = page.getByTestId('main-composite-canvas');
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);
  const pixels = () => canvas.evaluate((element: HTMLCanvasElement) =>
    Array.from(element.getContext('2d')!.getImageData(0, 0, element.width, element.height).data));
  await expect.poll(async () => (await pixels()).some((v, i) => i % 4 === 3 && v > 0)).toBe(true);
  const before = await pixels();
  await page.getByRole('button', { name: 'Save now', exact: true }).click();
  await expect(page.getByText(/Saved .* to browser storage/)).toBeVisible();
  await page.reload();
  await expect(canvas).toBeVisible();
  await expect.poll(pixels).toEqual(before);
});

test('header image picker decodes a real PNG and opens import controls', async ({ page }) => {
  await page.goto('/studio');
  await expect(page.getByTestId('main-composite-canvas')).toBeVisible();
  const png = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 4;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ff0000'; ctx.fillRect(0, 0, 4, 4);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  await page.locator('input[type=file]').first().setInputFiles({ name: 'red.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByText('red.png', { exact: false }).first()).toBeVisible();
});
