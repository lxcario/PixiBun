import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { inflateSync } from 'node:zlib';
import { apngTiming, gifHolds } from '../helpers/gameAnimationDownload';

test('downloads two-second fire-only cycles at 3, 5, 8 and 15 FPS as APNG and GIF', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.addInitScript(() => localStorage.setItem('pixibun:tool-previews-disabled', 'true'));
  await page.goto('/studio');
  await expect(page.locator('[data-restoration-phase]')).toHaveAttribute('data-restoration-phase', 'active');
  await page.evaluate(() => (window as unknown as { __studioStore: { getState: () => {
    addExtractedPalette: (name: string, colors: string[]) => boolean;
  } } }).__studioStore.getState().addExtractedPalette('No cycle yet', ['#080808', '#FF8C00']));
  await page.getByTestId('export-button').click();
  const dialog = page.getByRole('dialog', { name: 'Export Studio Assets' });
  await dialog.getByTestId('export-tab-palette-cycle').click();
  await expect(dialog.getByRole('button', { name: '8 FPS', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(dialog.getByRole('alert')).toContainText('at least two colors');
  await expect(dialog.getByRole('button', { name: 'Download cycle animation' })).toBeDisabled();
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  const image = await page.evaluate(() => {
    const c = document.createElement('canvas'); c.width = c.height = 32;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#080808'; ctx.fillRect(7, 4, 18, 19); ctx.fillRect(3, 22, 26, 7);
    ['#C43C18', '#D88000', '#FF8C00', '#FFB833'].forEach((color, i) => {
      ctx.fillStyle = color; ctx.fillRect(8 + i * 4, 5, 4, 17);
    });
    ctx.fillStyle = '#684628'; ctx.fillRect(4, 23, 24, 5);
    return c.toDataURL('image/png').split(',')[1];
  });
  await page.locator('input[type=file]').first().setInputFiles({ name: 'fire-and-wood.png', mimeType: 'image/png', buffer: Buffer.from(image, 'base64') });
  const importer = page.getByRole('dialog', { name: 'Import Image' });
  await importer.getByRole('button', { name: 'Single Sprite / Layer' }).click();
  await importer.getByRole('button', { name: 'Import Image', exact: true }).click();
  await expect(importer).toBeHidden();
  await page.evaluate(() => {
    const state = (window as unknown as { __studioStore: { getState: () => {
      currentPaletteId: string;
      addExtractedPalette: (name: string, colors: string[]) => boolean;
      addPaletteCycleTrack: (id: string, track: { id: string; low: number; high: number; rate: number; direction: 'forward'; enabled: boolean; blendShift: boolean }) => void;
      setPaletteCycleSpeedMultiplier: (speed: number) => void;
    } } }).__studioStore;
    state.getState().addExtractedPalette('Fire + wood', ['#080808', '#664422', '#C43C18', '#D88000', '#FF8C00', '#FFB833']);
    state.getState().addPaletteCycleTrack(state.getState().currentPaletteId, { id: 'fire', low: 2, high: 5, rate: 4, direction: 'forward', enabled: true, blendShift: false });
    // 4 registers/sec * 2x = 8 registers/sec; each 15-FPS frame should advance
    // after two samples, rather than four when preview speed is ignored.
    state.getState().setPaletteCycleSpeedMultiplier(2);
  });
  const pixels = () => page.getByTestId('main-composite-canvas').evaluate((c: HTMLCanvasElement) => Array.from(c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data));
  const original = await pixels();
  for (const rate of [3, 5, 8, 15]) for (const format of ['apng', 'gif'] as const) {
    await page.getByTestId('export-button').click();
    await dialog.getByTestId('export-tab-palette-cycle').click();
    await dialog.getByRole('button', { name: `${rate} FPS`, exact: true }).click();
    await dialog.getByRole('group', { name: 'Loop length' }).getByRole('button', { name: '2s', exact: true }).click();
    await dialog.getByRole('group', { name: 'Cycle file format' }).getByRole('button', { name: format.toUpperCase(), exact: true }).click();
    await dialog.getByRole('group', { name: 'Cycle image size' }).getByRole('button', { name: '1x', exact: true }).click();
    await expect(dialog.getByRole('group', { name: 'Cycle image size' }).getByRole('button', { name: '1x', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(dialog.getByRole('combobox', { name: 'Export frame scope' })).toHaveCount(0);
    await expect(dialog.getByRole('status')).toHaveText(`${rate * 2} frames · 2 seconds · ${rate} FPS`);
    await expect(dialog.getByRole('button', { name: `${rate} FPS`, exact: true })).toHaveAttribute('aria-pressed', 'true');
    const boxes = await Promise.all((await dialog.getByRole('group', { name: 'Frame rate' }).getByRole('button').all()).map(button => button.boundingBox()));
    expect(Math.max(...boxes.map(b => b!.width)) - Math.min(...boxes.map(b => b!.width))).toBeLessThan(1);
    if (format === 'apng' && rate === 8) await page.screenshot({ path: testInfo.outputPath('cycle-export-low-fps.png'), animations: 'disabled' });
    const pending = page.waitForEvent('download');
    await dialog.getByRole('button', { name: 'Download cycle animation', exact: true }).click();
    const download = await pending, path = testInfo.outputPath(`fire-${rate}fps.${format === 'gif' ? 'gif' : 'png'}`);
    await download.saveAs(path); const bytes = await readFile(path);
    if (format === 'apng') {
      const timing = apngTiming(bytes);
      expect(timing.count).toBe(rate * 2); expect(timing.plays).toBe(0);
      timing.holds.forEach(hold => expect(hold).toBeCloseTo(1000 / rate, 8));
      expect(timing.holds.reduce((a, b) => a + b, 0)).toBeCloseTo(2000, 8);
      const decoded: number[][] = [];
      for (let offset = 8; offset < bytes.length;) {
        const length = bytes.readUInt32BE(offset), type = bytes.subarray(offset + 4, offset + 8).toString(), start = offset + 8;
        if (type === 'IDAT' || type === 'fdAT') {
          const raw = inflateSync(bytes.subarray(start + (type === 'fdAT' ? 4 : 0), start + length)), rgba: number[] = [];
          for (let y = 0; y < 32; y++) {
            expect(raw[y * 129]).toBe(0);
            rgba.push(...raw.subarray(y * 129 + 1, (y + 1) * 129));
          }
          decoded.push(rgba);
        }
        offset += length + 12;
      }
      expect(decoded).toHaveLength(rate * 2);
      const fireOffset = (5 * 32 + 8) * 4;
      expect(decoded[0].slice(fireOffset, fireOffset + 4)).toEqual(original.slice(fireOffset, fireOffset + 4));
      if (rate === 15) expect(decoded[2].slice(fireOffset, fireOffset + 3)).toEqual([255, 184, 51]);
      expect(new Set(decoded.map(frame => frame.slice(fireOffset, fireOffset + 3).join(','))).size).toBeGreaterThan(1);
      const outsideFire = original.map((_, i) => i).filter(i => {
        const pixel = Math.floor(i / 4), x = pixel % 32, y = Math.floor(pixel / 32);
        return x < 8 || x >= 24 || y < 5 || y >= 22;
      });
      const unchanged = outsideFire.map(i => original[i]);
      for (const frame of decoded) expect(outsideFire.map(i => frame[i])).toEqual(unchanged);
    } else {
      const holds = gifHolds(bytes);
      expect(holds).toHaveLength(rate * 2);
      expect(Math.min(...holds)).toBeGreaterThanOrEqual(Math.floor(100 / rate) * 10);
      expect(Math.max(...holds)).toBeLessThanOrEqual(Math.ceil(100 / rate) * 10);
      expect(holds.reduce((a, b) => a + b, 0)).toBe(2000);
    }
    await expect(dialog).toBeHidden();
    expect(await pixels()).toEqual(original);
  }
});
