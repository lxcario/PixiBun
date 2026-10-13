import { expect, test, type Page } from '@playwright/test';

const pixels = (page: Page, id = 'main-composite-canvas') => page.getByTestId(id).evaluate((c: HTMLCanvasElement) =>
  Array.from(c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data));
async function colors(page: Page, id: string) {
  const data = await pixels(page, id), result = new Set<string>();
  for (let i = 0; i < data.length; i += 4) if (data[i + 3]) result.add(data.slice(i, i + 4).join(','));
  return [...result].sort();
}
async function color(page: Page, target: 'Primary' | 'Secondary', hex: string) {
  await page.getByTestId('toolbar-color-dock').getByRole('button', { name: new RegExp(`^${target} color `) }).dblclick();
  const dialog = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: new RegExp(`^(?:✦\\s*)?Pick Custom ${target} Color$`) }) });
  await expect(dialog).toBeVisible(); await dialog.getByRole('textbox', { name: 'Picker hex color', exact: true }).fill(hex);
  await dialog.getByRole('button', { name: 'Select Color', exact: true }).click(); await expect(dialog).toBeHidden();
}
async function draft(page: Page, secondary = false) {
  await page.getByTestId('curve-tool').click(); const box = (await page.getByTestId('main-composite-canvas').boundingBox())!;
  const point = (x: number, y: number) => ({ x: box.x + (x + .5) * box.width / 32, y: box.y + (y + .5) * box.height / 32 });
  const a = point(5, 8), b = point(23, 8); if (secondary) await page.keyboard.down('Shift');
  await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(b.x, b.y, { steps: 3 });
  if (secondary) await page.keyboard.up('Shift'); await page.mouse.up();
  await expect(page.getByTestId('curve-adjustment-toolbar')).toBeVisible();
}
test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1100 }); await page.goto('/studio?width=32&height=32');
  await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  expect((await pixels(page)).every((v, i) => i % 4 !== 3 || v === 0)).toBe(true);
  await color(page, 'Primary', '#ff0055'); await color(page, 'Secondary', '#00ffff');
});

test('Shift Curve retains secondary preview, exact Undo/Redo and saved reload pixels', async ({ page }, info) => {
  await draft(page, true); await expect.poll(() => colors(page, 'stroke-preview-canvas')).toEqual(['0,255,255,255']);
  const preview = await pixels(page, 'stroke-preview-canvas'); await page.screenshot({ path: info.outputPath('secondary-preview.png') });
  await page.getByRole('button', { name: 'Apply (Enter)', exact: true }).click(); await expect.poll(() => pixels(page)).toEqual(preview);
  await page.getByTestId('undo-button').click(); await expect.poll(async () => (await pixels(page)).every((v, i) => i % 4 !== 3 || v === 0)).toBe(true);
  await page.getByTestId('redo-button').click(); await expect.poll(() => pixels(page)).toEqual(preview);
  await page.getByTestId('save-button').click(); await expect(page.getByRole('status').filter({ hasText: /^Changes saved$/ })).toBeVisible();
  await page.reload(); await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible(); await expect.poll(() => pixels(page)).toEqual(preview);
  await page.screenshot({ path: info.outputPath('secondary-reloaded.png') });
});

for (const secondary of [false, true]) test(`Curve re-edit retains the committed ${secondary ? 'secondary' : 'primary'} color after current wells change`, async ({ page }, info) => {
  await draft(page, secondary); await page.getByRole('button', { name: 'Apply (Enter)', exact: true }).click(); const original = await pixels(page);
  const expected = secondary ? ['0,255,255,255'] : ['255,0,85,255'];
  await color(page, 'Primary', '#123456'); await color(page, 'Secondary', '#654321');
  await page.getByRole('button', { name: /Re-edit Curve/ }).click(); await expect(page.getByTestId('curve-adjustment-toolbar')).toBeVisible();
  await expect.poll(() => colors(page, 'stroke-preview-canvas')).toEqual(expected);
  await page.screenshot({ path: info.outputPath('re-edit-preview.png') });
  await page.getByRole('button', { name: 'Apply (Enter)', exact: true }).click(); await expect.poll(() => pixels(page)).toEqual(original);
});

test('secondary Curve ignores primary-well changes and responds to its selected secondary well', async ({ page }) => {
  await draft(page, true); await color(page, 'Primary', '#774433');
  await expect(page.getByTestId('curve-adjustment-toolbar')).toBeVisible(); await expect.poll(() => colors(page, 'stroke-preview-canvas')).toEqual(['0,255,255,255']);
  await color(page, 'Secondary', '#aa66cc'); await expect.poll(() => colors(page, 'stroke-preview-canvas')).toEqual(['170,102,204,255']);
  const preview = await pixels(page, 'stroke-preview-canvas'); await page.getByRole('button', { name: 'Apply (Enter)', exact: true }).click();
  await expect.poll(() => pixels(page)).toEqual(preview);
});
