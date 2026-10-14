import { expect, test, type Page } from '@playwright/test';
import { chooseTool } from '../helpers/tools';

// Audit v1.14.1: the standard pixel-art keymap by default, with the original
// keys kept as "PixiBun classic" in Guide & Shortcuts.

const ART = 32;
const pixels = (page: Page) => page.getByTestId('main-composite-canvas').evaluate((c: HTMLCanvasElement) =>
  Array.from(c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data));
const at = (data: number[], x: number, y: number) => data.slice((y * ART + x) * 4, (y * ART + x) * 4 + 4).join(',');
const PINK = '255,0,85,255', CYAN = '0,255,255,255';

async function color(page: Page, target: 'Primary' | 'Secondary', hex: string) {
  await page.getByTestId('toolbar-color-dock').getByRole('button', { name: new RegExp(`^${target} color `) }).dblclick();
  const dialog = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: new RegExp(`^(?:✦\\s*)?Pick Custom ${target} Color$`) }) });
  await expect(dialog).toBeVisible(); await dialog.getByRole('textbox', { name: 'Picker hex color', exact: true }).fill(hex);
  await dialog.getByRole('button', { name: 'Select Color', exact: true }).click(); await expect(dialog).toBeHidden();
}
async function point(page: Page, x: number, y: number) {
  const box = (await page.getByTestId('main-composite-canvas').boundingBox())!;
  return { x: box.x + (x + 0.5) * box.width / ART, y: box.y + (y + 0.5) * box.height / ART };
}
const primaryWell = (page: Page) => page.getByTestId('toolbar-color-dock').getByRole('button', { name: /^Primary color / })
  .evaluate(button => (button as HTMLButtonElement).style.backgroundColor);
const playButton = (page: Page) => page.getByTestId('bottom-timeline').getByRole('button', { name: /^(Play|Pause)$/ }).first();

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto(`/studio?width=${ART}&height=${ART}`);
  await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  await color(page, 'Primary', '#ff0055'); await color(page, 'Secondary', '#00ffff');
  await chooseTool(page, 'pen');
});

test('standard keymap: right-click paints, Alt picks, Shift draws a line, Space pans, Enter plays', async ({ page }) => {
  // Click, then Shift-click: a straight line from the last pixel.
  const a = await point(page, 4, 4), b = await point(page, 10, 4);
  await page.mouse.click(a.x, a.y);
  await page.keyboard.down('Shift'); await page.mouse.click(b.x, b.y); await page.keyboard.up('Shift');
  await expect.poll(async () => { const data = await pixels(page); return [4, 5, 6, 7, 8, 9, 10].map(x => at(data, x, 4)); })
    .toEqual(Array(7).fill(PINK));

  // Right-click paints the secondary color and opens no popup.
  const c = await point(page, 4, 10);
  await page.mouse.click(c.x, c.y, { button: 'right' });
  await expect.poll(async () => at(await pixels(page), 4, 10)).toBe(CYAN);
  await expect(page.getByRole('dialog', { name: 'Canvas tools', exact: true })).toHaveCount(0);

  // Alt-click picks the color under the pointer.
  await page.keyboard.down('Alt'); await page.mouse.click(c.x, c.y); await page.keyboard.up('Alt');
  await expect.poll(() => primaryWell(page)).toBe('rgb(0, 255, 255)');
  const before = await pixels(page);
  expect(at(before, 4, 10)).toBe(CYAN);

  // Hold Space and drag: the canvas pans and nothing is painted.
  const box = (await page.getByTestId('main-composite-canvas').boundingBox())!;
  const d = await point(page, 20, 20);
  await page.mouse.move(d.x, d.y);
  await page.keyboard.down('Space');
  await page.mouse.down(); await page.mouse.move(d.x + 40, d.y + 20, { steps: 4 }); await page.mouse.up();
  await page.keyboard.up('Space');
  await expect.poll(async () => (await page.getByTestId('main-composite-canvas').boundingBox())!.x).toBeCloseTo(box.x + 40, 0);
  expect(await pixels(page)).toEqual(before);

  // Enter plays and pauses; Space no longer does.
  await expect(playButton(page)).toHaveText(/Play/);
  await page.keyboard.press('Space'); await expect(playButton(page)).toHaveText(/Play/);
  await page.keyboard.press('Enter'); await expect(playButton(page)).toHaveText(/Pause/);
  await page.keyboard.press('Enter'); await expect(playButton(page)).toHaveText(/Play/);
});

test('PixiBun classic keymap is one choice away and keeps the original keys', async ({ page }) => {
  await page.keyboard.press('?');
  const guide = page.getByRole('dialog', { name: 'Guide & Shortcuts' });
  await expect(guide).toBeVisible();
  await guide.getByTestId('keymap-classic').click();
  await expect(guide.getByTestId('keymap-classic')).toHaveAttribute('aria-checked', 'true');
  await expect(guide.getByText('Middle / Alt + Drag', { exact: true })).toBeVisible();
  await page.keyboard.press('Escape'); await expect(guide).toBeHidden();

  // Shift paints the secondary color; right-click on the artwork opens the tools popup.
  const a = await point(page, 6, 6);
  await page.keyboard.down('Shift'); await page.mouse.click(a.x, a.y); await page.keyboard.up('Shift');
  await expect.poll(async () => at(await pixels(page), 6, 6)).toBe(CYAN);
  const popup = page.getByRole('dialog', { name: 'Canvas tools', exact: true });
  await page.mouse.click(a.x, a.y, { button: 'right' }); await expect(popup).toBeVisible();
  await page.keyboard.press('Escape'); await expect(popup).toHaveCount(0);

  // Alt-drag pans; Space plays.
  const box = (await page.getByTestId('main-composite-canvas').boundingBox())!;
  const b = await point(page, 20, 20);
  await page.mouse.move(b.x, b.y);
  await page.keyboard.down('Alt'); await page.mouse.down(); await page.mouse.move(b.x + 40, b.y, { steps: 4 }); await page.mouse.up(); await page.keyboard.up('Alt');
  await expect.poll(async () => (await page.getByTestId('main-composite-canvas').boundingBox())!.x).toBeCloseTo(box.x + 40, 0);
  await page.getByTestId('main-composite-canvas').hover();
  await page.keyboard.press('Space'); await expect(playButton(page)).toHaveText(/Pause/);
  await page.keyboard.press('Space'); await expect(playButton(page)).toHaveText(/Play/);

  // The choice survives a reload.
  await page.reload(); await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  expect(JSON.parse((await page.evaluate(() => localStorage.getItem('pixibun-preferences')))!)).toMatchObject({ keymap: 'classic' });
});
