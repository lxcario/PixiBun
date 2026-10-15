import { readFileSync } from 'node:fs';
import { expect, test, type Locator, type Page } from '@playwright/test';

// Strategy Phase 2: Living Postcards.

const read = (canvas: Locator) => canvas.evaluate((element: HTMLCanvasElement) =>
  Array.from(element.getContext('2d')!.getImageData(0, 0, element.width, element.height).data).join(','));

async function moves(canvas: Locator, page: Page) {
  const first = await read(canvas);
  await page.waitForTimeout(700);
  return (await read(canvas)) !== first;
}

test('a living postcard opens cycling, and its cart keeps moving in the player', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto('/studio');
  await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  await page.getByRole('button', { name: /^File/ }).first().click();
  await page.getByTestId('postcard-button').click();
  const picker = page.getByTestId('postcard-picker');
  await expect(picker).toBeVisible();
  for (const id of ['campfire', 'waterfall', 'rainy-window', 'neon-sign', 'tide', 'lava']) {
    // Each preview is already moving.
    await expect.poll(() => moves(picker.getByTestId(`postcard-${id}`).locator('canvas'), page), { message: `${id} preview cycles` }).toBe(true);
  }
  await picker.getByTestId('postcard-campfire').click();
  await expect(picker).toBeHidden();
  await expect(page.getByRole('button', { name: /^Rename project Campfire/ })).toBeVisible();
  await expect(page.getByText('64×48').first()).toBeVisible();
  // The desk shows it cycling.
  await expect.poll(() => moves(page.getByTestId('main-composite-canvas'), page)).toBe(true);

  // A cart of the postcard keeps cycling on the phone player.
  await page.getByTestId('export-button').click();
  await page.getByTestId('export-tab-cart').click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save cart', exact: true }).click();
  const bytes = readFileSync((await (await pending).path())!);
  await page.goto('/open');
  await page.locator('input[type=file]').setInputFiles({ name: 'campfire.cart.png', mimeType: 'image/png', buffer: bytes });
  await expect(page.getByRole('heading', { name: 'Campfire' })).toBeVisible();
  await expect.poll(() => moves(page.getByTestId('cart-canvas'), page)).toBe(true);
});
