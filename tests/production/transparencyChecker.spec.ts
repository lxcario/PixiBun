import { expect, test, type Page } from '@playwright/test';

// Audit v1.14.1 defect 4: a white viewport base made transparent and white pixels look identical.

const SIZE = 32;
const composite = (page: Page) => page.getByTestId('main-composite-canvas');

async function zoomTo(page: Page, level: number) {
  await page.getByRole('button', { name: /^Zoom \d+ percent/ }).click();
  await page.getByRole('group', { name: 'Zoom levels' }).getByRole('button', { name: new RegExp(`^${level}%`) }).click();
  await expect(page.getByRole('button', { name: new RegExp(`^Zoom ${level} percent`) })).toBeVisible();
}

/** Distinct on-screen colors across a block of art pixels, read from a real screenshot. */
async function screenColors(page: Page, fromX: number, fromY: number, size: number) {
  const box = (await composite(page).boundingBox())!;
  const unit = box.width / SIZE;
  const clip = { x: box.x + fromX * unit, y: box.y + fromY * unit, width: Math.max(4, size * unit), height: Math.max(4, size * unit) };
  const png = await page.screenshot({ clip });
  return page.evaluate(async (b64) => {
    const image = new Image();
    image.src = `data:image/png;base64,${b64}`;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(image, 0, 0);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const colors = new Set<string>();
    for (let i = 0; i < data.length; i += 4) colors.add(`${data[i]},${data[i + 1]},${data[i + 2]}`);
    return [...colors];
  }, png.toString('base64'));
}

test('transparent pixels show a checkerboard that white pixels do not, at every zoom', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto(`/studio?width=${SIZE}&height=${SIZE}`, { waitUntil: 'domcontentloaded' });
  await expect.poll(() => composite(page).evaluate((c: HTMLCanvasElement) => c.width)).toBe(SIZE);
  await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();

  // Paint a white block in the top-left with the bucket inside a marquee.
  const box = (await composite(page).boundingBox())!;
  const at = (x: number, y: number) => ({ x: box.x + ((x + 0.5) * box.width) / SIZE, y: box.y + ((y + 0.5) * box.height) / SIZE });
  await page.mouse.move(at(0, 31).x, at(0, 31).y);
  await page.keyboard.press('Shift+D');
  await page.keyboard.press('x');
  await page.keyboard.press('m');
  await page.mouse.move(at(0, 0).x, at(0, 0).y);
  await page.mouse.down();
  await page.mouse.move(at(15, 15).x, at(15, 15).y, { steps: 8 });
  await page.mouse.up();
  await page.keyboard.press('g');
  await page.mouse.click(at(4, 4).x, at(4, 4).y);
  await page.keyboard.press('Escape');

  await expect(page.getByTestId('canvas-solid-underlay')).toHaveAttribute('data-transparency', 'checker');
  for (const level of [100, 800, 1600]) {
    await zoomTo(page, level);
    const transparent = await screenColors(page, 18, 18, 12);
    const white = await screenColors(page, 2, 2, 10);
    expect(transparent, `transparent area at ${level}%`).toEqual(expect.arrayContaining(['255,255,255', '217,217,217']));
    // Pixel-grid lines appear when zoomed in; the checker's gray must not.
    expect(white, `white area at ${level}%`).toContain('255,255,255');
    expect(white, `white area at ${level}%`).not.toContain('217,217,217');
  }

  // View → Transparency off: the plain white underlay returns.
  await page.getByRole('button', { name: 'View options menu', exact: true }).click();
  await page.getByTestId('toggle-transparency-checker').click();
  await expect(page.getByTestId('canvas-solid-underlay')).toHaveAttribute('data-transparency', 'white');
  await page.keyboard.press('Escape');
  expect(await screenColors(page, 18, 18, 12)).not.toContain('217,217,217');
});
