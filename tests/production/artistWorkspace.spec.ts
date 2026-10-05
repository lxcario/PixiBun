import { expect, test, type Page } from '@playwright/test';

async function ready(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/studio');
  await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  await expect(page.getByTestId('main-composite-canvas')).toBeVisible();
}
const pixels = (page: Page) => page.getByTestId('main-composite-canvas').evaluate((c: HTMLCanvasElement) =>
  Array.from(c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data));
async function draw(page: Page, from: [number, number], to: [number, number]) {
  const box = (await page.locator('#center-canvas-area').boundingBox())!;
  await page.mouse.move(box.x + (from[0] + 0.5) * box.width / 32, box.y + (from[1] + 0.5) * box.height / 32);
  await page.mouse.down();
  await page.mouse.move(box.x + (to[0] + 0.5) * box.width / 32, box.y + (to[1] + 0.5) * box.height / 32, { steps: 6 });
  await page.mouse.up();
}
test('compiled layout, palette preview and focus restore the same artwork after reload', async ({ page }) => {
  await ready(page); await draw(page, [8, 8], [14, 12]); const artwork = await pixels(page);
  expect(artwork.some((v, i) => i % 4 === 3 && v !== 0)).toBe(true);
  await page.getByLabel('Workspace layout').selectOption('lighting');
  await expect(page.getByTestId('bottom-timeline')).toBeHidden();
  await page.getByTestId('tab-palette').click();
  await expect(page.getByRole('region', { name: 'Pinned color panel' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Canvas navigator' })).toBeVisible();
  await page.getByRole('button', { name: 'View options menu', exact: true }).click();
  await page.getByRole('button', { name: 'Arrange...', exact: true }).click();
  await page.getByLabel('Inspector position').selectOption('left');
  await page.getByLabel('New workspace name').pressSequentially('Color desk');
  await expect(page.getByLabel('New workspace name')).toHaveValue('Color desk');
  // Shift+Tab in a text field retains keyboard navigation and cannot hide panels.
  await page.getByLabel('New workspace name').press('Shift+Tab');
  await expect(page.getByRole('dialog', { name: 'Arrange workspace' })).toBeVisible();
  await expect(page.getByTestId('right-inspector')).toBeVisible();
  await page.getByRole('button', { name: 'Save layout', exact: true }).click();
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await page.getByTestId('tab-palette').click();
  await page.getByRole('button', { name: /Browse palettes/ }).click();
  await page.getByLabel('Search palettes').fill('DawnBringer');
  await page.getByRole('button', { name: 'Preview DawnBringer 16', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Selected palette preview' })).toContainText('DawnBringer');
  expect(await pixels(page)).toEqual(artwork);
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await page.locator('#center-canvas-area').focus(); await page.keyboard.press('Shift+Tab');
  await expect(page.getByTestId('right-inspector')).toBeHidden(); expect(await pixels(page)).toEqual(artwork);
  await page.keyboard.press('Shift+Tab'); await expect(page.getByTestId('right-inspector')).toBeVisible();
  await page.getByRole('button', { name: 'View options menu', exact: true }).click();
  await page.getByRole('button', { name: 'Canvas Only ⇧ Tab', exact: true }).click();
  await expect(page.getByTestId('right-inspector')).toBeHidden();
  await expect(page.locator('#center-canvas-area')).toBeFocused();
  await page.keyboard.press('Shift+Tab'); await expect(page.getByTestId('right-inspector')).toBeVisible();
  await page.getByRole('button', { name: 'Save now', exact: true }).click();
  await expect.poll(() => page.getByRole('status').first().textContent()).toContain('Changes saved');
  await page.reload(); await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  await expect(page.getByLabel('Workspace layout').locator('option:checked')).toHaveText('Color desk');
  expect(await pixels(page)).toEqual(artwork);
  // Establish a keyboard opener; pointer clicks need not focus buttons in WebKit.
  await page.getByRole('button', { name: 'View options menu', exact: true }).focus();
  await page.getByRole('button', { name: 'View options menu', exact: true }).press('Enter');
  await page.getByRole('button', { name: 'Arrange...', exact: true }).press('Enter');
  await page.getByLabel('New workspace name').pressSequentially('Temporary name');
  await expect(page.getByLabel('New workspace name')).toBeFocused();
  await page.getByLabel('New workspace name').press('Escape');
  await expect(page.getByRole('dialog', { name: 'Arrange workspace' })).toBeHidden();
  await expect(page.getByRole('button', { name: 'View options menu', exact: true })).toBeFocused();
  expect(await pixels(page)).toEqual(artwork);
});
test('compiled radial gradient uses the active palette and one undoable layer fill', async ({ page }) => {
  await ready(page); const blank = await pixels(page);
  await page.getByTestId('tab-palette').click();
  await page.getByRole('button', { name: /Browse palettes/ }).click();
  await page.getByLabel('Search palettes').fill('Monitor Glow');
  await page.getByRole('button', { name: 'Preview 1bit Monitor Glow', exact: true }).click();
  await page.getByRole('button', { name: 'Use palette', exact: true }).click();
  await page.locator('#center-canvas-area').focus(); await page.keyboard.press('Shift+G');
  await page.getByTestId('tab-tools').click();
  await page.getByLabel('Gradient shape').selectOption('radial');
  await page.getByLabel('Gradient colors').selectOption('palette');
  await page.getByLabel('Bayer 4×4 dithering').uncheck();
  await page.getByRole('checkbox', { name: /^Draw on new layer/ }).uncheck();
  await draw(page, [16, 16], [24, 16]); const filled = await pixels(page);
  const at = (x: number, y: number) => filled.slice((y * 32 + x) * 4, (y * 32 + x) * 4 + 4);
  expect(at(16, 16)).toEqual([34, 35, 35, 255]); expect(at(24, 16)).toEqual([240, 246, 240, 255]);
  expect(at(20, 16)).toEqual(at(16, 20));
  for (let i = 0; i < filled.length; i += 4) expect([[34, 35, 35, 255], [240, 246, 240, 255]]).toContainEqual(filled.slice(i, i + 4));
  await page.getByTestId('undo-button').click(); await expect.poll(() => pixels(page)).toEqual(blank);
  await page.getByTestId('redo-button').click(); await expect.poll(() => pixels(page)).toEqual(filled);
  // Repeating the identical fill creates no extra history step.
  await draw(page, [16, 16], [24, 16]); await page.getByTestId('undo-button').click(); await expect.poll(() => pixels(page)).toEqual(blank);
});
test('compiled onion controls compare distinct poses and persist without painting ghosts', async ({ page }, testInfo) => {
  await ready(page); await draw(page, [8, 8], [8, 8]);
  await page.getByTestId('add-frame-button').click(); await draw(page, [12, 12], [12, 12]);
  const artwork = await pixels(page);
  await page.getByLabel('Onion skin settings', { exact: true }).click();
  await page.getByRole('button', { name: 'Previous pose', exact: true }).click();
  await page.getByLabel('Previous onion tint', { exact: true }).fill('#ff0000');
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  const ghost = () => page.getByTestId('onion-skin-canvas').evaluate((c: HTMLCanvasElement) => Array.from(c.getContext('2d')!.getImageData(8, 8, 1, 1).data));
  await expect.poll(ghost).toEqual([255, 0, 0, 89]); expect(await pixels(page)).toEqual(artwork);
  await page.getByRole('button', { name: 'Save now', exact: true }).click();
  await expect.poll(() => page.getByRole('status').first().textContent()).toContain('Changes saved');
  await page.reload(); await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  // Projects reopen on their first frame; return to the pose being compared.
  await page.getByRole('button', { name: /^Select frame 2\./ }).click();
  await expect.poll(ghost).toEqual([255, 0, 0, 89]); expect(await pixels(page)).toEqual(artwork);
  await page.getByLabel('Onion skin settings', { exact: true }).click();
  await expect(page.getByLabel('Previous onion frames', { exact: true })).toHaveValue('1');
  await expect(page.getByLabel('Next onion frames', { exact: true })).toHaveValue('0');
  await expect(page.getByLabel('Previous onion tint', { exact: true })).toHaveValue('#ff0000');
  if (testInfo.project.name === 'chromium') await page.screenshot({ path: testInfo.outputPath('onion-settings.png') });
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await page.locator('#center-canvas-area').focus(); await page.keyboard.press('F3');
  await expect.poll(ghost).toEqual([0, 0, 0, 0]); expect(await pixels(page)).toEqual(artwork);
});

test('compiled palette application and reload retain two distinct strokes and a favorite', async ({ page }) => {
  await ready(page);
  await page.getByTestId('tab-palette').click();
  await page.getByLabel('Picker hex color').fill('#5d275d');
  await draw(page, [5, 5], [9, 5]);
  await page.getByLabel('Picker hex color').fill('#00e600');
  await draw(page, [20, 20], [24, 20]);
  const artwork = await pixels(page);
  const at = (x: number, y: number) => artwork.slice((y * 32 + x) * 4, (y * 32 + x) * 4 + 4);
  expect(at(5, 5)).toEqual([93, 39, 93, 255]);
  expect(at(20, 20)).toEqual([0, 230, 0, 255]);
  await page.getByTestId('tab-palette').click();
  await page.getByRole('button', { name: /Browse palettes/ }).click();
  await page.getByLabel('Search palettes').fill('Sweetie');
  await page.getByRole('button', { name: 'Preview Sweetie 16', exact: true }).click();
  expect(await pixels(page)).toEqual(artwork);
  await page.getByRole('button', { name: 'Favorite Sweetie 16', exact: true }).click();
  await page.getByRole('button', { name: 'Use palette', exact: true }).click();
  expect(await pixels(page)).toEqual(artwork);
  await page.getByRole('button', { name: 'Save now', exact: true }).click();
  await expect.poll(() => page.getByRole('status').first().textContent()).toContain('Changes saved');
  await page.reload();
  await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  await expect.poll(() => pixels(page)).toEqual(artwork);
  await page.getByTestId('tab-palette').click();
  await page.getByRole('button', { name: /Browse palettes/ }).click();
  await page.getByLabel('Palette collection').selectOption('favorites');
  await expect(page.getByRole('button', { name: 'Preview Sweetie 16', exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Selected palette preview' })).toContainText('GrafxKid');
  expect(await pixels(page)).toEqual(artwork);
});
