import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

// Strategy Phase 2: cart links and the phone cart player at /open.

const pixels = (page: Page) => page.getByTestId('main-composite-canvas').evaluate((canvas: HTMLCanvasElement) =>
  Array.from(canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data));
const stagePixels = (page: Page) => page.getByTestId('cart-canvas').evaluate((canvas: HTMLCanvasElement) =>
  Array.from(canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data));

/** The starter drawing paints after the workspace restores; wait for its pixels. */
async function starterReady(page: Page) {
  await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  await expect.poll(async () => (await pixels(page)).some((value, index) => index % 4 === 3 && value > 0)).toBe(true);
}

/** Save a cart from Studio and turn its chunk into a link, as Copy link does. */
async function cartLinkFrom(page: Page) {
  await page.getByTestId('export-button').click();
  await page.getByTestId('export-tab-cart').click();
  const form = page.getByTestId('cart-export');
  await form.getByLabel('Title').fill('Hearth Ghost');
  await form.getByLabel('Your name').fill('Rowan');
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save cart', exact: true }).click();
  const bytes = readFileSync((await (await pending).path())!);
  // Walk the PNG chunks to the pxBn data: [length][type][data][crc].
  let at = 8;
  for (;;) {
    const length = bytes.readUInt32BE(at), type = bytes.subarray(at + 4, at + 8).toString('latin1');
    if (type === 'pxBn') return { bytes, fragment: `c1.${bytes.subarray(at + 8, at + 8 + length).toString('base64url')}` };
    if (type === 'IEND') throw new Error('No cart chunk.');
    at += 12 + length;
  }
}

test('a cart link opens in the phone player, relights with a finger and stays on the desk', async ({ page, browser, browserName }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto('/studio?template=hearth-ghost');
  await starterReady(page);
  const { fragment } = await cartLinkFrom(page);

  // Firefox has no mobile emulation in Playwright; the phone-sized viewport still applies.
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, ...(browserName === 'firefox' ? {} : { isMobile: true }) });
  const player = await phone.newPage();
  await player.goto(`/open#${fragment}`);
  await expect(player.getByRole('heading', { name: 'Hearth Ghost' })).toBeVisible();
  await expect(player.getByTestId('cart-details').getByText('by Rowan')).toBeVisible();
  const canvas = player.getByTestId('cart-canvas');
  const size = await canvas.evaluate((element: HTMLCanvasElement) => [element.width, element.height]);
  // A 16×16 drawing at a whole-number scale that fits the phone.
  expect(size[0] % 16).toBe(0); expect(size[0]).toBeGreaterThanOrEqual(16 * 10); expect(size[0]).toBeLessThanOrEqual(390);
  expect((await canvas.boundingBox())!.x).toBeGreaterThanOrEqual(0);
  // Studio needs a wide screen; the phone gets no Open in Studio button.
  await expect(player.getByTestId('cart-open-studio')).toHaveCount(0);

  // Drag across the drawing: the lamp lights it.
  const unlit = await stagePixels(player);
  const stage = (await player.getByTestId('cart-stage').boundingBox())!;
  await player.mouse.move(stage.x + stage.width * 0.15, stage.y + stage.height * 0.15);
  await player.mouse.down(); await player.mouse.move(stage.x + stage.width * 0.2, stage.y + stage.height * 0.1, { steps: 3 }); await player.mouse.up();
  await expect(player.getByTestId('cart-lamp')).toBeVisible();
  await expect.poll(() => stagePixels(player), { timeout: 15_000 }).not.toEqual(unlit);
  await player.getByRole('button', { name: 'Lamp off' }).click();
  await expect.poll(() => stagePixels(player)).toEqual(unlit);

  // Keep it, then find it on the desk without the link.
  await player.getByTestId('cart-keep').click();
  await expect(player.getByTestId('cart-keep')).toHaveText('On your desk');
  await player.goto('/open');
  await expect(player.getByTestId('cart-shelf').getByText('Hearth Ghost')).toBeVisible();
  await player.getByTestId('cart-shelf').getByText('Hearth Ghost').click();
  await expect(player.getByRole('heading', { name: 'Hearth Ghost' })).toBeVisible();
  await phone.close();
});

test('the player hands a cart to Studio on a wide screen, and refuses a broken link kindly', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto('/studio?template=hearth-ghost');
  await starterReady(page);
  const original = await pixels(page);
  const { fragment } = await cartLinkFrom(page);

  await page.goto('/open#c1.not-really-a-cart');
  await expect(page.getByTestId('cart-player-empty').getByRole('alert')).toContainText(/damaged|could not/i);

  await page.goto(`/open#${fragment}`);
  await page.getByTestId('cart-open-studio').click();
  const arrival = page.getByRole('dialog', { name: 'A cart arrived' });
  await expect(arrival).toBeVisible();
  await arrival.getByTestId('cart-open').click();
  await expect.poll(() => pixels(page)).toEqual(original);
  await expect(page).not.toHaveURL(/cart=/);
});
