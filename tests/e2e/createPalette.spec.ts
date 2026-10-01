import { expect, test, type Page } from '@playwright/test';

async function snapshot(page: Page) {
  return page.evaluate(() => {
    const state = (window as unknown as { __studioStore: { getState: () => { palettes: { id: string; name: string; colors: string[] }[]; currentPaletteId: string } } }).__studioStore.getState();
    return { palettes: state.palettes, currentId: state.currentPaletteId };
  });
}
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('pixibun:tool-previews-disabled', 'true'));
  await page.goto('/studio');
  await expect(page.locator('[data-restoration-phase]')).toHaveAttribute('data-restoration-phase', 'active');
  await page.getByRole('button', { name: 'Palette', exact: true }).click();
});

test('scan groups raster variations into six swatches and removing a swatch preserves the art', async ({ page }, testInfo) => {
  const image = await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
    const ctx = canvas.getContext('2d')!, colors = [[12, 10, 8], [102, 67, 37], [255, 65, 15], [255, 139, 0], [255, 176, 18]];
    for (let y = 8; y < 56; y++) for (let x = 8; x < 56; x++) {
      const base = colors[Math.floor((x - 8) / 10) % 5], noise = ((x * 17 + y * 7) % 7) - 3;
      ctx.fillStyle = `rgb(${base.map(c => Math.max(0, Math.min(255, c + noise))).join(',')})`; ctx.fillRect(x, y, 1, 1);
    }
    return canvas.toDataURL('image/png').split(',')[1];
  });
  await page.locator('input[type=file]').first().setInputFiles({ name: 'warm-variations.png', mimeType: 'image/png', buffer: Buffer.from(image, 'base64') });
  const importer = page.getByRole('dialog', { name: 'Import Image' });
  await importer.getByRole('button', { name: 'Single Sprite / Layer' }).click();
  await importer.getByRole('button', { name: 'Import Image', exact: true }).click(); await expect(importer).toBeHidden();
  const canvas = page.getByTestId('main-composite-canvas');
  const pixels = () => canvas.evaluate((c: HTMLCanvasElement) => Array.from(c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data));
  const artwork = await pixels();
  await page.getByRole('button', { name: 'Palette', exact: true }).click();
  await page.getByRole('button', { name: 'Scan Canvas', exact: true }).click();
  const scanned = await snapshot(page), palette = scanned.palettes.find(p => p.id === scanned.currentId)!;
  expect(palette.colors.length).toBeLessThanOrEqual(6); expect(palette.colors.length).toBeGreaterThanOrEqual(5);
  await page.getByRole('button', { name: `Select color ${palette.colors[1]}`, exact: true }).click();
  await page.screenshot({ path: testInfo.outputPath('compact-scan-and-remove.png') });
  await page.getByRole('button', { name: 'Remove color', exact: true }).click();
  const removed = await snapshot(page);
  expect(removed.palettes.find(p => p.id === removed.currentId)?.colors).toEqual(palette.colors.filter((_, i) => i !== 1));
  expect(await pixels()).toEqual(artwork);
  await page.getByTestId('undo-button').click(); await expect.poll(() => snapshot(page)).toEqual(scanned);
  await page.getByRole('button', { name: 'Redo last action' }).click(); await expect.poll(() => snapshot(page)).toEqual(removed);
  await page.getByRole('button', { name: 'Create palette', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Create palette' });
  await dialog.getByRole('button', { name: 'From artwork' }).click();
  expect(await dialog.getByRole('group', { name: 'Palette draft colors' }).getByRole('button').count()).toBeLessThanOrEqual(6);
});

test('builds a named palette, orders its swatches, preserves artwork, undoes and reloads it', async ({ page }, testInfo) => {
  const canvas = page.getByTestId('main-composite-canvas');
  const pixels = () => canvas.evaluate((c: HTMLCanvasElement) => Array.from(c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data));
  const original = await pixels(), before = await snapshot(page);
  const trigger = page.getByRole('button', { name: 'Create palette', exact: true });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Create palette' });
  await expect(dialog.getByLabel('Palette name')).toBeFocused();
  await dialog.getByLabel('Palette name').fill('Campfire');
  await dialog.getByLabel('Hex color').fill('#442211');
  await dialog.getByRole('button', { name: '+ Add color' }).click();
  await dialog.getByLabel('Hex color').fill('#FFAA33');
  await dialog.getByRole('button', { name: '+ Add color' }).click();
  await dialog.getByLabel('Hex color').fill('#FF6600');
  await dialog.getByRole('button', { name: 'Move left' }).click();
  await expect(dialog.getByRole('button', { name: 'Edit color 2: #FF6600' })).toHaveAttribute('aria-pressed', 'true');
  await dialog.getByLabel('Hex color').fill('invalid');
  await expect(dialog.getByRole('button', { name: 'Create palette', exact: true })).toBeDisabled();
  await dialog.getByLabel('Hex color').fill('#FF6600');
  for (const width of [1440, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    const choices = dialog.getByRole('group', { name: 'Start palette from' }).getByRole('button');
    const boxes = await Promise.all([0, 1, 2].map(i => choices.nth(i).boundingBox()));
    expect(Math.max(...boxes.map(b => b!.width)) - Math.min(...boxes.map(b => b!.width))).toBeLessThan(2);
    await expect(dialog.getByRole('button', { name: 'Create palette', exact: true })).toBeInViewport();
  }
  await page.screenshot({ path: testInfo.outputPath('create-palette-1024.png') });
  await dialog.getByRole('button', { name: 'Create palette', exact: true }).click();
  await expect(dialog).toBeHidden();
  const created = await snapshot(page), palette = created.palettes.find(p => p.id === created.currentId)!;
  expect(palette.name).toBe('Campfire'); expect(palette.colors).toEqual(['#442211', '#FF6600', '#FFAA33']);
  expect(created.palettes.length).toBe(before.palettes.length + 1);
  expect(await pixels()).toEqual(original);
  await page.getByTestId('undo-button').click();
  await expect.poll(() => snapshot(page)).toEqual(before);
  await page.getByRole('button', { name: 'Redo last action' }).click();
  await expect.poll(() => snapshot(page)).toEqual(created);
  await page.getByTestId('save-button').click();
  await expect(page.getByTestId('save-status-badge')).toContainText('Saved');
  await page.reload();
  await expect(page.locator('[data-restoration-phase]')).toHaveAttribute('data-restoration-phase', 'active');
  await expect.poll(() => snapshot(page)).toEqual(created);
});

test('copies or collects visible frame colors into a cancellable draft', async ({ page }, testInfo) => {
  const before = await snapshot(page);
  const trigger = page.getByRole('button', { name: 'Create palette', exact: true });
  await trigger.click(); const dialog = page.getByRole('dialog', { name: 'Create palette' });
  await dialog.getByRole('button', { name: 'From artwork' }).click();
  await expect(dialog.getByRole('alert')).toContainText('Draw or import');
  await dialog.getByRole('button', { name: 'Copy palette' }).click();
  await dialog.getByLabel('Hex color').fill('#123456');
  await page.keyboard.press('Escape'); await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused(); expect(await snapshot(page)).toEqual(before);
  const image = await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    ['#442211', '#FF6600', '#FFAA33'].forEach((color, i) => { ctx.fillStyle = color; ctx.fillRect(8 + i * 4, 10, 4, 12); });
    return canvas.toDataURL('image/png').split(',')[1];
  });
  await page.locator('input[type=file]').first().setInputFiles({ name: 'warm-colors.png', mimeType: 'image/png', buffer: Buffer.from(image, 'base64') });
  const importer = page.getByRole('dialog', { name: 'Import Image' });
  await importer.getByRole('button', { name: 'Single Sprite / Layer' }).click();
  await importer.getByRole('button', { name: 'Import Image', exact: true }).click();
  await expect(importer).toBeHidden();
  await page.getByRole('button', { name: 'Palette', exact: true }).click();
  await trigger.click();
  await dialog.getByRole('button', { name: 'From artwork' }).click();
  await expect(dialog.getByRole('group', { name: 'Palette draft colors' }).getByRole('button')).toHaveCount(3);
  await dialog.getByLabel('Palette name').fill('Warm artwork');
  await page.screenshot({ path: testInfo.outputPath('create-palette-from-artwork.png') });
  await dialog.getByRole('button', { name: 'Create palette', exact: true }).click();
  await expect(dialog).toBeHidden();
  const result = await snapshot(page);
  expect(result.palettes.find(p => p.id === result.currentId)?.colors).toEqual(['#442211', '#FF6600', '#FFAA33']);
});
