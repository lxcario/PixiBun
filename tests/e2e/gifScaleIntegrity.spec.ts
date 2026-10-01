import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { gifHolds } from '../helpers/gameAnimationDownload';

test('an 8x cycle GIF decodes every flame, wood and transparent pixel in all 16 frames', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.addInitScript(() => localStorage.setItem('pixibun:tool-previews-disabled', 'true'));
  await page.goto('/studio');
  await expect(page.locator('[data-restoration-phase]')).toHaveAttribute('data-restoration-phase', 'active');
  const png = await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#080808'; ctx.fillRect(9, 7, 46, 49);
    let seed = 0x6a651295;
    for (let y = 8; y < 55; y++) for (let x = 10; x < 54; x++) {
      seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
      const colors = y < 40 ? ['#C43C18', '#D88000', '#FF8C00', '#FFB833'] : ['#664422', '#684628', '#745132'];
      ctx.fillStyle = colors[(seed >>> 0) % colors.length]; ctx.fillRect(x, y, 1, 1);
    }
    return canvas.toDataURL('image/png').split(',')[1];
  });
  await page.locator('input[type=file]').first().setInputFiles({ name: 'textured-fire-and-wood.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
  const importer = page.getByRole('dialog', { name: 'Import Image' });
  await importer.getByRole('button', { name: 'Single Sprite / Layer' }).click();
  await importer.getByRole('button', { name: 'Import Image', exact: true }).click();
  await expect(importer).toBeHidden();
  await page.evaluate(() => {
    const store = (window as unknown as { __studioStore: { getState: () => {
      currentPaletteId: string;
      addExtractedPalette: (name: string, colors: string[]) => boolean;
      addPaletteCycleTrack: (id: string, track: { id: string; low: number; high: number; rate: number; direction: 'forward'; blendShift: boolean; enabled: boolean }) => void;
      setPaletteCycleSpeedMultiplier: (speed: number) => void;
    } } }).__studioStore;
    store.getState().addExtractedPalette('Fire only', ['#080808', '#664422', '#C43C18', '#D88000', '#FF8C00', '#FFB833']);
    store.getState().addPaletteCycleTrack(store.getState().currentPaletteId, { id: 'fire', low: 2, high: 5, rate: 2, direction: 'forward', blendShift: false, enabled: true });
    store.getState().setPaletteCycleSpeedMultiplier(1);
  });
  const pixels = () => page.getByTestId('main-composite-canvas').evaluate((c: HTMLCanvasElement) => Array.from(c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data));
  const original = await pixels();
  await page.getByTestId('export-button').click();
  const dialog = page.getByRole('dialog', { name: 'Export Studio Assets' });
  await dialog.getByTestId('export-tab-palette-cycle').click();
  await dialog.getByRole('group', { name: 'Cycle file format' }).getByRole('button', { name: 'GIF', exact: true }).click();
  await dialog.getByRole('button', { name: '8 FPS', exact: true }).click();
  await dialog.getByRole('group', { name: 'Cycle image size' }).getByRole('button', { name: '8x', exact: true }).click();
  const pending = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Download cycle animation' }).click();
  const download = await pending, path = testInfo.outputPath('fire-cycle-8x.gif');
  await download.saveAs(path); const bytes = await readFile(path);
  expect(bytes.readUInt16LE(6)).toBe(512); expect(bytes.readUInt16LE(8)).toBe(512);
  expect(gifHolds(bytes)).toHaveLength(16);
  await expect(dialog).toBeHidden(); expect(await pixels()).toEqual(original);

  // Chromium's native GIF decoder is independent of our LZW implementation.
  const decoded = await page.evaluate(async ({ data, source }) => {
    type Frame = { displayWidth: number; displayHeight: number; copyTo: (target: Uint8Array, options: { format: 'RGBA' }) => Promise<unknown>; close: () => void };
    const Decoder = (window as unknown as { ImageDecoder: new (options: { data: Uint8Array; type: string }) => {
      tracks: { ready: Promise<void>; selectedTrack: { frameCount: number } };
      decode: (options: { frameIndex: number }) => Promise<{ image: Frame }>;
      close: () => void;
    } }).ImageDecoder;
    const decoder = new Decoder({ data: new Uint8Array(data), type: 'image/gif' });
    await decoder.tracks.ready;
    const count = decoder.tracks.selectedTrack.frameCount;
    const fire = [[196, 60, 24], [216, 128, 0], [255, 140, 0], [255, 184, 51]];
    const registers = new Map(fire.map((rgb, index) => [(rgb[0] << 16) | (rgb[1] << 8) | rgb[2], index]));
    let mismatches = 0, firstMismatch = '', width = 0, height = 0;
    for (let f = 0; f < count; f++) {
      const { image } = await decoder.decode({ frameIndex: f });
      width = image.displayWidth; height = image.displayHeight;
      const rgba = new Uint8Array(width * height * 4);
      await image.copyTo(rgba, { format: 'RGBA' }); image.close();
      const phase = Math.floor(f / 8 * 2);
      for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        const src = ((y >> 3) * 64 + (x >> 3)) * 4, dest = (y * width + x) * 4;
        let r = source[src], g = source[src + 1], b = source[src + 2];
        const register = registers.get((r << 16) | (g << 8) | b);
        if (register !== undefined && source[src + 3]) [r, g, b] = fire[(register - phase + 4) % 4];
        if (rgba[dest] !== r || rgba[dest + 1] !== g || rgba[dest + 2] !== b || rgba[dest + 3] !== source[src + 3]) {
          mismatches++; if (!firstMismatch) firstMismatch = `frame ${f}, (${x},${y})`;
        }
      }
    }
    decoder.close(); return { count, width, height, mismatches, firstMismatch };
  }, { data: Array.from(bytes), source: original });
  expect(decoded).toEqual({ count: 16, width: 512, height: 512, mismatches: 0, firstMismatch: '' });
  await testInfo.attach('native-gif-decoder-result', { body: JSON.stringify(decoded), contentType: 'application/json' });
  await page.setContent('<main style="background:#17121e;color:#f0be7c;min-height:95vh;display:grid;place-content:center;gap:16px;text-align:center;font:16px sans-serif"><p>Downloaded 8× GIF · 512×512 · 16 frames</p><img id="exported" alt="Actual exported 8x GIF" width="512" height="512"></main>');
  await page.locator('#exported').evaluate(async (node: HTMLImageElement, data) => {
    node.src = URL.createObjectURL(new Blob([new Uint8Array(data)], { type: 'image/gif' })); await node.decode();
  }, Array.from(bytes));
  await page.screenshot({ path: testInfo.outputPath('decoded-8x-gif.png') });
});
