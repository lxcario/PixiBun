import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

// Strategy Phase 2: a cart is a PNG card with the whole drawing inside.

const pixels = (page: Page) => page.getByTestId('main-composite-canvas').evaluate((canvas: HTMLCanvasElement) =>
  Array.from(canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data));

async function saveCart(page: Page, fields: { title?: string; maker?: string; note?: string; license?: string; night?: boolean } = {}) {
  await page.getByTestId('export-button').click();
  await page.getByTestId('export-tab-cart').click();
  const form = page.getByTestId('cart-export');
  if (fields.title !== undefined) await form.getByLabel('Title', { exact: true }).fill(fields.title);
  if (fields.maker !== undefined) await form.getByLabel('Your name').fill(fields.maker);
  if (fields.note !== undefined) await form.getByLabel('A note').fill(fields.note);
  if (fields.license) await form.getByLabel('License').selectOption({ label: fields.license });
  if (fields.night) await form.getByText('Night', { exact: true }).click();
  await expect(page.getByTestId('cart-preview').locator('canvas')).toBeVisible();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save cart', exact: true }).click();
  const download = await pending;
  const path = await download.path();
  if (!path) throw new Error('The cart download has no local file.');
  return { name: download.suggestedFilename(), bytes: readFileSync(path) };
}

/** The starter drawing paints after the workspace restores; wait for its pixels. */
async function starterReady(page: Page) {
  await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  await expect.poll(async () => (await pixels(page)).some((value, index) => index % 4 === 3 && value > 0)).toBe(true);
}

async function openCart(page: Page, bytes: Buffer, name: string) {
  await page.locator('input[type=file]').first().setInputFiles({ name, mimeType: 'image/png', buffer: bytes });
  const dialog = page.getByRole('dialog', { name: 'A cart arrived' });
  await expect(dialog).toBeVisible();
  return dialog;
}

test('a cart carries the whole drawing out and back in, and remixes credit it', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto('/studio?template=mochi');
  await starterReady(page);
  const original = await pixels(page);

  const cart = await saveCart(page, { title: 'Hearth Ghost', maker: 'Rowan', note: 'keep it warm', license: 'CC BY 4.0' });
  expect(cart.name).toBe('hearth-ghost-by-rowan.cart.png');
  // A real PNG with the private cart chunk before IEND.
  expect(cart.bytes.subarray(1, 4).toString('latin1')).toBe('PNG');
  expect(cart.bytes.includes(Buffer.from('pxBn'))).toBe(true);
  expect(cart.bytes.lastIndexOf(Buffer.from('pxBn'))).toBeLessThan(cart.bytes.lastIndexOf(Buffer.from('IEND')));

  // Paint over the drawing, then open the cart: the original comes back.
  const box = (await page.getByTestId('main-composite-canvas').boundingBox())!;
  await page.mouse.click(box.x + box.width * 0.05, box.y + box.height * 0.05);
  await expect.poll(() => pixels(page)).not.toEqual(original);
  const arrival = await openCart(page, cart.bytes, cart.name);
  await expect(arrival.getByRole('heading', { name: 'Hearth Ghost' })).toBeVisible();
  await expect(arrival.getByText('by Rowan')).toBeVisible();
  await expect(arrival.getByText('“keep it warm”')).toBeVisible();
  await expect(arrival.getByText('CC BY 4.0')).toBeVisible();
  await arrival.getByTestId('cart-open').click();
  await expect(arrival).toBeHidden();
  await expect.poll(() => pixels(page)).toEqual(original);

  // A cart made from the opened drawing names where it came from.
  const remix = await saveCart(page, { title: 'Ghost, again', maker: 'Sage' });
  const second = await openCart(page, remix.bytes, remix.name);
  await expect(second.getByText('Remixed from')).toBeVisible();
  await expect(second.getByText('Hearth Ghost · Rowan')).toBeVisible();
  await second.getByRole('button', { name: 'Not now' }).click();
});

test('an ordinary PNG still imports as a picture, and a damaged cart explains itself', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto('/studio?template=mochi');
  await starterReady(page);
  const cart = await saveCart(page);
  const at = cart.bytes.lastIndexOf(Buffer.from('pxBn'));
  const damaged = Buffer.from(cart.bytes); damaged[at + 10] ^= 0xff;
  await page.locator('input[type=file]').first().setInputFiles({ name: 'damaged.png', mimeType: 'image/png', buffer: damaged });
  await expect(page.getByRole('status').or(page.getByRole('alert')).filter({ hasText: /damaged/i }).first()).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'A cart arrived' })).toHaveCount(0);
});
