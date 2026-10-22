import { expect, test, type Page } from '@playwright/test';

// The Dither Brush paints only the cells its pattern admits, at every brush size. Bayer 2×2 at
// 50% admits the cells where x and y have the same parity. A 4px stamp at the centre (8,8)
// covers x 6–9, y 6–9, so it must paint exactly these eight cells and leave the other eight.
const START = '1_16x16_e83a5c_p0.0.0';
const ADMITTED_4PX = [[6, 6], [8, 6], [7, 7], [9, 7], [6, 8], [8, 8], [7, 9], [9, 9]];

async function open(page: Page, replay: string) {
  await page.goto(`/studio?replay=${replay}`);
  await expect(page.getByTestId('replay-status')).toHaveAttribute('data-state', 'applied', { timeout: 15_000 });
  const skip = page.getByRole('button', { name: 'Skip setup' });
  if (await skip.isVisible().catch(() => false)) await skip.click();
  await expect(page.getByTestId('canvas-readout')).toHaveAttribute('data-state', 'ready');
}

const readout = async (page: Page, field: string) => {
  await expect(page.getByTestId('canvas-readout')).toHaveAttribute('data-state', 'ready');
  return page.getByTestId(`canvas-readout-${field}`).innerText();
};

test('a 4px Dither Brush stamp paints exactly the admitted half of its footprint', async ({ page }) => {
  // The expected composite, drawn independently by a replay link: the corner pixel plus
  // the eight admitted cells, each as its own one-pixel pen step.
  const expected = `1_16x16_e83a5c.1d4ed8_p0.0.0~${ADMITTED_4PX.map(([x, y]) => `p1.${x}.${y}`).join('~')}`;
  await open(page, expected);
  const expectedDigest = await readout(page, 'digest');
  expect(await readout(page, 'pixels')).toBe('9');

  await open(page, START);
  const before = await readout(page, 'digest');
  await page.getByRole('button', { name: /^Primary color/ }).click();
  await page.getByLabel('Primary hex value').fill('#1D4ED8');
  await page.getByLabel('Primary hex value').press('Enter');
  await page.getByRole('button', { name: 'Close color access' }).click();
  await page.keyboard.press('d');
  await page.getByRole('button', { name: 'Tools', exact: true }).first().click();
  await expect(page.getByLabel('Tool panel dither pattern')).toHaveValue('2x2');
  await page.getByRole('button', { name: '4 pixel brush', exact: true }).click();
  await page.getByLabel('Pixel art canvas workspace').click();

  await expect.poll(() => readout(page, 'pixels')).toBe('9');
  expect(await readout(page, 'top-colors')).toBe('#1d4ed8 8, #e83a5c 1');
  expect(await readout(page, 'digest')).toBe(expectedDigest);

  await page.getByRole('button', { name: 'Undo last action' }).click();
  await expect.poll(() => readout(page, 'digest')).toBe(before);
});

test('an 8px Dither Brush stamp paints 32 of its 64 cells', async ({ page }) => {
  await open(page, START);
  await page.keyboard.press('d');
  await page.getByRole('button', { name: 'Tools', exact: true }).first().click();
  await page.getByRole('button', { name: '8 pixel brush', exact: true }).click();
  await page.getByLabel('Pixel art canvas workspace').click();
  await expect.poll(() => readout(page, 'pixels')).toBe('33');
});
