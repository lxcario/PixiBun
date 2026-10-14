import { expect, test, type Page } from '@playwright/test';

const pixels = (page: Page) => page.getByTestId('main-composite-canvas').evaluate((canvas: HTMLCanvasElement) =>
  Array.from(canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data));

async function originalDrawing(page: Page) {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto('/studio');
  await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  const box = (await page.getByTestId('main-composite-canvas').boundingBox())!;
  await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.3);
  await page.mouse.click(box.x + box.width * 0.6, box.y + box.height * 0.6);
  await page.getByTestId('undo-button').click();
  await expect(page.getByTestId('redo-button')).toBeEnabled();
  const artwork = await pixels(page);
  expect(artwork.some((value, index) => index % 4 === 3 && value > 0)).toBe(true);
  return artwork;
}
async function practice(page: Page) {
  await page.getByTitle('Return to PixiBun Home', { exact: true }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 15000 });
  await page.getByRole('navigation').getByRole('link', { name: 'Playground', exact: true }).click();
  await expect(page).toHaveURL(/\/playground$/, { timeout: 15000 });
  await expect(page.getByRole('button', { name: 'Return to drawing', exact: true })).toBeVisible();
  await page.getByRole('button', { name: "Let's start", exact: true }).click();
  await page.getByRole('button', { name: 'Trace it for me', exact: true }).click();
  await expect.poll(async () => (await pixels(page)).some((value, index) => index % 4 === 3 && value > 0)).toBe(true);
}

test('compiled practice returns original pixels and redo, then keeps a separate reloadable drawing', async ({ page }) => {
  const original = await originalDrawing(page);
  await practice(page);
  await page.getByRole('button', { name: 'Return to drawing', exact: true }).click();
  await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  await expect.poll(() => pixels(page)).toEqual(original);
  await expect(page.getByTestId('redo-button')).toBeEnabled();
  await practice(page);
  const kept = await pixels(page);
  expect(kept).not.toEqual(original);
  await page.getByRole('button', { name: 'Keep practice in Studio', exact: true }).click();
  await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  await expect.poll(() => pixels(page)).toEqual(kept);
  await expect(page.getByTestId('undo-button')).toBeEnabled();
  await page.reload();
  await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  await expect.poll(() => pixels(page)).toEqual(kept);
});

test('compiled practice refresh returns to the saved original instead of traced samples', async ({ page }) => {
  const original = await originalDrawing(page);
  await practice(page);
  page.on('dialog', dialog => { void dialog.accept(); });
  await page.reload();
  await expect(page.getByRole('button', { name: 'Return to drawing', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Return to drawing', exact: true }).click();
  await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  await expect.poll(() => pixels(page)).toEqual(original);
});
