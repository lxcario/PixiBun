import { expect, test, type Page } from '@playwright/test';

const pixels = (page: Page) => page.getByTestId('main-composite-canvas').evaluate((canvas: HTMLCanvasElement) => Array.from(canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data));
async function open(page: Page) {
  const box = (await page.getByTestId('main-composite-canvas').boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { button: 'right' });
  await expect(page.getByRole('dialog', { name: 'Canvas tools', exact: true })).toBeVisible();
}
test.beforeEach(async ({ page }) => {
  // Right-click on the artwork opens this popup in the PixiBun classic keymap; the
  // standard keymap paints there instead (see keymaps.spec.ts).
  await page.addInitScript(() => localStorage.setItem('pixibun-preferences', JSON.stringify({ keymap: 'classic' })));
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/studio?template=hearth-ghost');
  await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  // Workspace restoration can finish before the routed starter's native raster.
  await expect.poll(() => page.getByTestId('main-composite-canvas').evaluate((canvas: HTMLCanvasElement) => {
    if (canvas.width !== 16 || canvas.height !== 16) return false;
    return canvas.getContext('2d')!.getImageData(0, 0, 16, 16).data.some((value, index) => index % 4 === 3 && value > 0);
  })).toBe(true);
});

test('either mouse button selects every quick tool without painting or stealing the pointer', async ({ page }, info) => {
  const original = await pixels(page);
  for (const [id, name] of [['eraser', 'Eraser'], ['bucket', 'Flood Fill'], ['eyedropper', 'Eyedropper'], ['select-box', 'Marquee Box'], ['select-lasso', 'Lasso Select'], ['select-wand', 'Magic Wand'], ['line', 'Line'], ['rectangle', 'Rectangle'], ['ellipse', 'Ellipse'], ['pen', 'Pen']]) {
    for (const button of ['left', 'right'] as const) {
      await open(page);
      await page.getByRole('dialog', { name: 'Canvas tools', exact: true }).getByRole('button', { name, exact: true }).click({ button });
      await expect(page.getByRole('dialog', { name: 'Canvas tools', exact: true })).toHaveCount(0);
      await expect(page.getByTestId(`${id}-tool`)).toHaveAttribute('aria-pressed', 'true');
      expect(await pixels(page)).toEqual(original);
    }
  }
  await open(page);
  await page.getByRole('dialog', { name: 'Canvas tools', exact: true }).screenshot({ path: info.outputPath('canvas-tools.png') });
  await page.keyboard.press('Escape');
  const canvas = page.getByTestId('main-composite-canvas'), box = (await canvas.boundingBox())!;
  await page.mouse.click(box.x + box.width * .1, box.y + box.height * .1);
  await expect.poll(() => pixels(page)).not.toEqual(original);
  await page.getByTestId('undo-button').click(); await expect.poll(() => pixels(page)).toEqual(original);
});

test('the popup owns keys, swaps colors once, dismisses safely and stays inside a resized viewport', async ({ page }) => {
  const canvasFocus = page.locator('#center-canvas-area'); await canvasFocus.focus();
  const original = await pixels(page), originalBox = await page.getByTestId('main-composite-canvas').boundingBox();
  await open(page); const dialog = page.getByRole('dialog', { name: 'Canvas tools', exact: true });
  await expect(dialog.getByRole('button', { name: 'Pen', exact: true })).toBeFocused();
  await page.keyboard.press('ArrowRight'); await expect(dialog.getByRole('button', { name: 'Eraser', exact: true })).toBeFocused();
  for (const key of ['Control+z', 'Delete', 'e', 'ArrowDown', 'ArrowUp']) await page.keyboard.press(key);
  expect(await pixels(page)).toEqual(original); expect(await page.getByTestId('main-composite-canvas').boundingBox()).toEqual(originalBox);
  await page.keyboard.press('Enter'); await expect(dialog).toHaveCount(0); await expect(page.getByTestId('eraser-tool')).toHaveAttribute('aria-pressed', 'true'); await expect(canvasFocus).toBeFocused();
  const dock = page.getByTestId('toolbar-color-dock'), primary = dock.getByRole('button', { name: /^Primary color / }), secondary = dock.getByRole('button', { name: /^Secondary color / });
  const colors = () => Promise.all([primary, secondary].map(well => well.evaluate(button => (button as HTMLButtonElement).style.backgroundColor)));
  const before = await colors(); await open(page); await dialog.getByRole('button', { name: 'Swap primary and secondary colors', exact: true }).click(); expect(await colors()).toEqual([before[1], before[0]]);
  await open(page); await dialog.getByRole('button', { name: 'Swap primary and secondary colors', exact: true }).click({ button: 'right' }); expect(await colors()).toEqual(before);
  await canvasFocus.focus(); await canvasFocus.press('Shift+F10'); await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  const workspace = (await page.locator('#main-content').boundingBox())!;
  await page.mouse.click(workspace.x + workspace.width - 3, workspace.y + workspace.height - 3, { button: 'right' }); await expect(dialog).toBeVisible();
  for (const size of [{ width: 1280, height: 900 }, { width: 1024, height: 600 }, { width: 1024, height: 420 }]) {
    await page.setViewportSize(size); await expect.poll(async () => { const bounds = (await dialog.boundingBox())!; return bounds.x >= 11 && bounds.y >= 11 && bounds.x + bounds.width <= size.width - 11 && bounds.y + bounds.height <= size.height - 11; }).toBe(true);
  }
  await page.keyboard.press('Home'); await page.keyboard.press('Shift+Tab'); await expect(dialog.getByRole('button', { name: 'Swap primary and secondary colors', exact: true })).toBeFocused();
  await page.keyboard.press('Tab'); await expect(dialog.getByRole('button', { name: 'Pen', exact: true })).toBeFocused();
  await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => Boolean(document.activeElement?.closest('#main-content')))).toBe(true); expect(await pixels(page)).toEqual(original);
  await page.setViewportSize({ width: 1280, height: 900 }); await open(page);
  await page.getByRole('button', { name: 'Close canvas tools', exact: true }).click({ position: { x: 10, y: 300 } });
  await expect(dialog).toHaveCount(0); expect(await pixels(page)).toEqual(original);
  await open(page); await page.setViewportSize({ width: 360, height: 420 }); await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Desk Too Small', exact: true })).toBeVisible();
});
