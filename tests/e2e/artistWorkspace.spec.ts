import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import type { StudioState } from '../../src/stores/slices/types';

interface ArtistTestWindow extends Window { __studioStore: { getState: () => StudioState } }
async function openStudio(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/studio');
  await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  await expect(page.locator('#center-canvas-area')).toBeVisible();
}
async function pixels(page: Page) {
  return page.getByTestId('main-composite-canvas').evaluate((c: HTMLCanvasElement) => Array.from(c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data));
}
async function drag(page: Page, x1: number, y1: number, x2: number, y2: number) {
  const box = (await page.locator('#center-canvas-area').boundingBox())!;
  const at = (x: number, y: number) => ({ x: box.x + (x + 0.5) * box.width / 32, y: box.y + (y + 0.5) * box.height / 32 });
  const from = at(x1, y1), to = at(x2, y2);
  await page.mouse.move(from.x, from.y); await page.mouse.down(); await page.mouse.move(to.x, to.y, { steps: 8 }); await page.mouse.up();
}
test('named layouts, left inspector, focus and reload preserve artwork', async ({ page }) => {
  await openStudio(page); await drag(page, 8, 8, 12, 12); const before = await pixels(page);
  expect(before.some(value => value !== 0)).toBe(true);
  await page.getByLabel('Workspace layout').selectOption('animation');
  await expect(page.getByRole('region', { name: 'Canvas navigator' })).toBeVisible();
  await page.getByRole('button', { name: 'Arrange workspace' }).click();
  await page.getByLabel('Inspector position').selectOption('left');
  await page.getByLabel('Inspector width').press('Home');
  for (let i = 0; i < 10; i++) await page.getByLabel('Inspector width').press('ArrowRight');
  await page.getByLabel('New workspace name').fill('Animation desk');
  await page.getByRole('button', { name: 'Save layout', exact: true }).click();
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await expect(page.getByTestId('right-inspector')).toHaveCSS('width', '360px');
  const inspector = (await page.getByTestId('right-inspector').boundingBox())!, stage = (await page.locator('#main-content').boundingBox())!;
  expect(inspector.x).toBeLessThan(stage.x);
  await page.locator('#center-canvas-area').focus(); await page.keyboard.press('Shift+Tab');
  await expect(page.getByTestId('right-inspector')).toBeHidden(); await expect(page.getByTestId('bottom-timeline')).toBeHidden();
  expect(await pixels(page)).toEqual(before);
  await page.keyboard.press('Shift+Tab'); await expect(page.getByTestId('right-inspector')).toBeVisible();
  expect(await pixels(page)).toEqual(before);
  await page.getByRole('button', { name: 'Save now', exact: true }).click(); await page.reload();
  await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  await expect(page.getByLabel('Workspace layout').locator('option:checked')).toHaveText('Animation desk');
  await expect(page.getByTestId('right-inspector')).toHaveCSS('width', '360px'); expect(await pixels(page)).toEqual(before);
});
test('palette previews are nondestructive, favorites persist, and applying adds one exact palette', async ({ page }) => {
  await openStudio(page); await drag(page, 7, 7, 10, 7); const before = await pixels(page);
  await page.getByTestId('tab-palette').click();
  const initial = await page.evaluate(() => (window as unknown as ArtistTestWindow).__studioStore.getState().currentPaletteId);
  await page.getByRole('button', { name: /Browse palettes/ }).click();
  await expect(page.getByRole('dialog', { name: 'Palette library' })).toBeVisible();
  await page.screenshot({ path: 'docs/assets/screenshots/2026-10-04-artist-workspace/palette-library.png' });
  await page.getByLabel('Search palettes').fill('Sweetie'); await page.getByRole('button', { name: 'Preview Sweetie 16', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Selected palette preview' })).toContainText('GrafxKid');
  expect(await page.evaluate(() => (window as unknown as ArtistTestWindow).__studioStore.getState().currentPaletteId)).toBe(initial);
  expect(await pixels(page)).toEqual(before);
  await page.getByRole('button', { name: 'Favorite Sweetie 16', exact: true }).click();
  await page.getByRole('button', { name: 'Use palette', exact: true }).click();
  expect(await page.evaluate(() => { const s = (window as unknown as ArtistTestWindow).__studioStore.getState(); return s.palettes.find(p => p.id === s.currentPaletteId)?.colors; })).toEqual(['#1a1c2c', '#5d275d', '#b13e53', '#ef7d57', '#ffcd75', '#a7f070', '#38b764', '#257179', '#29366f', '#3b5dc9', '#41a6f6', '#73eff7', '#f4f4f4', '#94b0c2', '#566c86', '#333c57']);
  expect(await pixels(page)).toEqual(before);
  await page.getByRole('button', { name: /Browse palettes/ }).click();
  await page.getByLabel('Palette collection').selectOption('favorites'); await expect(page.getByRole('button', { name: 'Preview Sweetie 16' })).toBeVisible();
});
test('pinned triangle, tool controls and navigator are usable at desktop widths', async ({ page }) => {
  await openStudio(page); await drag(page, 8, 8, 14, 12); await page.getByRole('navigation', { name: 'Artist workspace' }).getByRole('button', { name: 'Color', exact: true }).click();
  await page.getByLabel('Picker hex color').fill('#ff0000'); await page.getByLabel('Picker hue').press('Home');
  for (let i = 0; i < 120; i++) await page.getByLabel('Picker hue').press('ArrowRight');
  expect(await page.evaluate(() => (window as unknown as ArtistTestWindow).__studioStore.getState().primaryColor)).toBe('#00ff00');
  await page.getByLabel('Color picker shape').selectOption('square'); await page.getByLabel('Color picker shape').selectOption('triangle');
  await page.getByRole('button', { name: 'Tool settings', exact: true }).click();
  await page.getByLabel('Tool panel brush size').press('Home'); await page.getByLabel('Tool panel brush size').press('ArrowRight');
  expect(await page.evaluate(() => (window as unknown as ArtistTestWindow).__studioStore.getState().tools.brushSize)).toBe(2);
  await page.getByLabel('Composition guide').selectOption('diagonals'); await expect(page.getByTestId('diagonal-composition-guide')).toBeVisible();
  await page.getByRole('navigation', { name: 'Artist workspace' }).getByRole('button', { name: 'Navigator', exact: true }).click();
  const panBefore = await page.evaluate(() => (window as unknown as ArtistTestWindow).__studioStore.getState().panX);
  await page.getByTestId('navigator-canvas').click({ position: { x: 180, y: 56 } });
  expect(await page.evaluate(() => (window as unknown as ArtistTestWindow).__studioStore.getState().panX)).not.toBe(panBefore);
  await page.getByRole('button', { name: 'Fit canvas', exact: true }).click();
  for (const width of [1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.getByTestId('navigator-canvas')).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
  }
  await page.screenshot({ path: 'docs/assets/screenshots/2026-10-04-artist-workspace/color-tools-navigator.png' });
  const scan = await new AxeBuilder({ page }).include('[aria-label="Artist workspace"]').include('[data-testid="right-inspector"]').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(scan.violations).toEqual([]);
});
test('onion settings render selected ghost ranges, keep artwork intact and survive reload', async ({ page }) => {
  await openStudio(page); await drag(page, 8, 8, 8, 8);
  await page.getByTestId('add-frame-button').click(); await drag(page, 12, 12, 12, 12);
  const before = await pixels(page);
  await page.getByLabel('Onion skin settings', { exact: true }).click();
  await page.getByRole('button', { name: 'Previous pose', exact: true }).click();
  await page.getByLabel('Previous onion frames', { exact: true }).fill('2');
  await page.getByLabel('Onion skin opacity', { exact: true }).press('Home'); for (let i = 0; i < 40; i++) await page.getByLabel('Onion skin opacity', { exact: true }).press('ArrowRight');
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  const settings = await page.evaluate(() => (window as unknown as ArtistTestWindow).__studioStore.getState().onionSkin);
  expect(settings).toMatchObject({ enabled: true, prevFrames: 2, nextFrames: 0, opacity: 0.4 }); expect(await pixels(page)).toEqual(before);
  expect(await page.getByTestId('onion-skin-canvas').evaluate((c: HTMLCanvasElement) => c.getContext('2d')!.getImageData(8, 8, 1, 1).data[3])).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Save now', exact: true }).click(); await page.reload(); await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as ArtistTestWindow).__studioStore.getState().onionSkin)).toEqual(settings);
  await page.locator('#center-canvas-area').focus(); await page.keyboard.press('F3'); expect(await page.evaluate(() => (window as unknown as ArtistTestWindow).__studioStore.getState().onionSkin.enabled)).toBe(false);
});
test('gradient respects lasso-shaped masks, Undo/Redo, cancel, zero-length and locked layers', async ({ page }) => {
  await openStudio(page);
  await page.evaluate(() => {
    const s = (window as unknown as ArtistTestWindow).__studioStore.getState(); const mask = new Uint8Array(32 * 32); for (let y = 8; y < 16; y++) for (let x = 8; x <= y; x++) mask[y * 32 + x] = 1;
    s.setSelection({ x: 8, y: 8, w: 8, h: 8 }, mask); s.setPrimaryColor('#ff0000'); s.setSecondaryColor('#0000ff');
  });
  await page.locator('#center-canvas-area').focus(); await page.keyboard.press('Shift+G');
  await page.getByRole('button', { name: 'Tool settings', exact: true }).click(); await expect(page.getByLabel('Gradient shape')).toBeVisible();
  await drag(page, 8, 8, 15, 8); const drawn = await pixels(page);
  let changed = 0; for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) { const rgba = drawn.slice((y * 32 + x) * 4, (y * 32 + x) * 4 + 4); if (y >= 8 && y < 16 && x >= 8 && x <= y) { expect([[255, 0, 0, 255], [0, 0, 255, 255]]).toContainEqual(rgba); changed++; } else expect(rgba).toEqual([0, 0, 0, 0]); }
  expect(changed).toBe(36);
  await page.getByTestId('undo-button').click(); expect((await pixels(page)).every(v => v === 0)).toBe(true);
  await page.getByTestId('redo-button').click(); expect(await pixels(page)).toEqual(drawn);
  await page.screenshot({ path: 'docs/assets/screenshots/2026-10-04-artist-workspace/selection-gradient.png' });
  await page.evaluate(() => (window as unknown as ArtistTestWindow).__studioStore.getState().setPrimaryColor('#00ff00'));
  const box = (await page.locator('#center-canvas-area').boundingBox())!;
  await page.mouse.move(box.x + 8.5 * box.width / 32, box.y + 8.5 * box.height / 32); await page.mouse.down(); await page.mouse.move(box.x + 15.5 * box.width / 32, box.y + 8.5 * box.height / 32);
  await page.locator('#center-canvas-area').dispatchEvent('pointercancel', { pointerType: 'mouse', isPrimary: true }); await page.mouse.up(); expect(await pixels(page)).toEqual(drawn);
  await drag(page, 10, 10, 10, 10); expect(await pixels(page)).toEqual(drawn);
  await page.evaluate(() => { const s = (window as unknown as ArtistTestWindow).__studioStore.getState(); s.toggleLayerLock(s.activeLayerId); });
  await drag(page, 8, 8, 15, 8); expect(await pixels(page)).toEqual(drawn);
});
