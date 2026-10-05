import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
const pixels = (page: Page) => page.getByTestId('main-composite-canvas').evaluate((canvas: HTMLCanvasElement) => Array.from(canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data));
async function fixture(page: Page) {
  await page.addInitScript(() => { Object.defineProperty(window, 'showSaveFilePicker', { configurable: true, value: undefined }); });
  await page.goto('/studio'); await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  const project = await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 32;
    const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#ff0000'; ctx.fillRect(4, 4, 2, 2);
    return { format: 'pixibun-project', version: 3, name: 'Hardening artwork', width: 32, height: 32, fps: 8, loopMode: 'repeat',
      palettes: [{ id: 'colors', name: 'Colors', colors: ['#ff0000'] }], currentPaletteId: 'colors', customRamps: [], clips: [],
      frames: [0, 1, 2, 3].map(i => ({ id: `hard-frame-${i}`, durationMs: 100 + i * 50, layers: [{ id: `hard-layer-${i}`, name: 'Body', visible: true, locked: false, opacity: 1, blendMode: 'source-over', pngBase64: canvas.toDataURL().split(',')[1] }] })), createdAt: 1000, updatedAt: 1000 };
  });
  await page.locator('input[type=file]').first().setInputFiles({ name: 'hardening.pixibun', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(project)) });
  const importing = page.getByRole('dialog', { name: 'Import Project (.pixibun)' }); await importing.getByRole('button', { name: 'Confirm Import' }).click(); await expect(importing).toBeHidden();
  await page.getByTestId('save-button').click(); await expect(page.getByRole('status').filter({ hasText: /^Changes saved$/ })).toBeVisible();
  return pixels(page);
}
async function backup(page: Page) {
  await page.getByTestId('export-button').click();
  if (!(await page.getByRole('dialog', { name: 'Project backup' }).isVisible())) await page.getByTestId('export-tab-project').click();
  return page.getByRole('dialog', { name: 'Project backup' });
}
test('compiled cancelled backup drains two native snapshots, starts no queued layers and can export the same artwork afterward', async ({ page }) => {
  const before = await fixture(page), downloads: string[] = []; page.on('download', d => downloads.push(d.suggestedFilename()));
  await page.evaluate(() => {
    const original = HTMLCanvasElement.prototype.toBlob;
    const state = { started: 0, deliveries: [] as Array<() => void>, original };
    (window as unknown as { heldSnapshots: typeof state }).heldSnapshots = state;
    HTMLCanvasElement.prototype.toBlob = function(callback, type, quality) {
      state.started++; original.call(this, blob => state.deliveries.push(() => callback(blob)), type, quality);
    };
  });
  let dialog = await backup(page); await dialog.getByRole('button', { name: 'Download project backup' }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { heldSnapshots: { deliveries: unknown[] } }).heldSnapshots.deliveries.length)).toBe(2);
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click(); await expect(dialog).toBeHidden();
  dialog = await backup(page); await expect(dialog.getByRole('button', { name: 'Preparing backup…' })).toBeDisabled();
  await page.evaluate(() => { const state = (window as unknown as { heldSnapshots: { deliveries: Array<() => void> } }).heldSnapshots; for (const deliver of state.deliveries.splice(0)) deliver(); });
  await expect(dialog.getByRole('button', { name: 'Download project backup' })).toBeEnabled();
  expect(await page.evaluate(() => (window as unknown as { heldSnapshots: { started: number } }).heldSnapshots.started)).toBe(2);
  expect(downloads).toEqual([]);
  await page.evaluate(() => { HTMLCanvasElement.prototype.toBlob = (window as unknown as { heldSnapshots: { original: typeof HTMLCanvasElement.prototype.toBlob } }).heldSnapshots.original; });
  const pending = page.waitForEvent('download'); await dialog.getByRole('button', { name: 'Download project backup' }).click();
  const downloaded = await pending, file = JSON.parse(await readFile((await downloaded.path())!, 'utf8'));
  expect(file.createdAt).toBe(1000); expect(file.frames).toHaveLength(4); expect(file.frames.map((f: { durationMs: number }) => f.durationMs)).toEqual([100, 150, 200, 250]);
  expect(await pixels(page)).toEqual(before); expect(downloads).toEqual([downloaded.suggestedFilename()]);
});

test('compiled native write failure aborts the staged adapter and reports failure; retry writes the preserved editable backup', async ({ page }) => {
  const before = await fixture(page);
  await page.evaluate(() => {
    const state = { fail: true, writes: 0, closes: 0, aborts: 0, content: '' }; (window as unknown as { nativeFileFixture: typeof state }).nativeFileFixture = state;
    const handle = { name: 'hardening.pixibun', queryPermission: async () => 'granted', createWritable: async () => ({
      write: async (data: string) => { state.writes++; if (state.fail) throw new Error('Fixture disk failure'); state.content = data; },
      close: async () => { state.closes++; }, abort: async () => { state.aborts++; },
    }) };
    Object.defineProperty(window, 'showOpenFilePicker', { configurable: true, value: async () => [] });
    Object.defineProperty(window, 'showSaveFilePicker', { configurable: true, value: async () => handle });
  });
  await page.locator('#center-canvas-area').focus(); await page.keyboard.press('Control+Shift+s');
  await expect(page.getByText('The project file could not be written. Your drawing is still open. Try again or download a backup.', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => { const s = (window as unknown as { nativeFileFixture: { writes: number; closes: number; aborts: number } }).nativeFileFixture; return [s.writes, s.closes, s.aborts]; })).toEqual([1, 0, 1]);
  await page.evaluate(() => { (window as unknown as { nativeFileFixture: { fail: boolean } }).nativeFileFixture.fail = false; });
  await page.locator('#center-canvas-area').focus(); await page.keyboard.press('Control+Shift+s');
  await expect.poll(() => page.evaluate(() => (window as unknown as { nativeFileFixture: { closes: number } }).nativeFileFixture.closes)).toBe(1);
  const file = await page.evaluate(() => JSON.parse((window as unknown as { nativeFileFixture: { content: string } }).nativeFileFixture.content));
  expect(file.createdAt).toBe(1000); expect(file.frames).toHaveLength(4); expect(file.frames[0].layers[0].pngBase64.length).toBeGreaterThan(0);
  expect(await pixels(page)).toEqual(before);
});
