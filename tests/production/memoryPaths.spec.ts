import { expect, test } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';

test('compiled timeline and backup retain exact pixels with bounded preview and encoding work', async ({ page }, info) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'showSaveFilePicker', { value: undefined, configurable: true });
    const stats = { draws: 0, encodes: 0, peakEncodes: 0, pending: 0 };
    Object.assign(window, { memoryPathStats: stats });
    const draw = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function(...args: unknown[]) {
      if (this.canvas instanceof HTMLCanvasElement && this.canvas.matches('[data-testid^="frame-thumbnail"]')) stats.draws++;
      return Reflect.apply(draw, this, args);
    };
    const encode = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function(callback, ...args) {
      stats.encodes++; stats.pending++; stats.peakEncodes = Math.max(stats.peakEncodes, stats.pending);
      return encode.call(this, blob => { stats.pending--; callback(blob); }, ...args);
    };
  });
  await page.goto('/studio'); await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  const fixture = await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
    const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#ff0000'; ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = '#00ff00'; ctx.fillRect(32, 32, 32, 32);
    const pngBase64 = canvas.toDataURL().split(',')[1];
    return { format: 'pixibun-project', version: 3, name: 'Memory fixture', width: 128, height: 128, fps: 8, loopMode: 'repeat',
      palettes: [{ id: 'colors', name: 'Colors', colors: ['#ff0000'] }], currentPaletteId: 'colors', customRamps: [], clips: [],
      frames: Array.from({ length: 64 }, (_, i) => ({ id: `frame-${i}`, durationMs: 100, layers: [{ id: `layer-${i}`, name: 'Body', visible: true, locked: false, opacity: 1, blendMode: 'source-over', pngBase64 }] })), createdAt: 1, updatedAt: 1 };
  });
  await page.locator('input[type=file]').first().setInputFiles({ name: 'memory.pixibun', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(fixture)) });
  const dialog = page.getByRole('dialog', { name: 'Import Project (.pixibun)' });
  await dialog.getByRole('button', { name: 'Confirm Import' }).click(); await expect(dialog).toBeHidden();
  await expect(page.getByTestId('frame-thumbnail-0')).toBeVisible();
  await page.getByTestId('fit-canvas-button').click();
  await page.getByTestId('save-button').click();
  await expect(page.locator('[role="status"]').filter({ hasText: /Changes saved/ })).toBeVisible();
  const retained = await page.locator('[data-testid^="frame-thumbnail"]').evaluateAll(elements => elements.map(element => {
    const canvas = element as HTMLCanvasElement; return { width: canvas.width, height: canvas.height };
  }));
  await page.evaluate(() => { (window as unknown as { memoryPathStats: { draws: number } }).memoryPathStats.draws = 0; });
  await page.locator('#center-canvas-area').focus(); await page.keyboard.press('e');
  const canvas = page.getByTestId('main-composite-canvas'), box = (await canvas.boundingBox())!;
  const originalPng = await canvas.evaluate((c: HTMLCanvasElement) => c.toDataURL().split(',')[1]);
  const originalGreen = await canvas.evaluate((c: HTMLCanvasElement) => Array.from(c.getContext('2d')!.getImageData(40, 40, 1, 1).data));
  const inputStarted = Date.now();
  await page.mouse.click(box.x + box.width * 40.5 / 128, box.y + box.height * 40.5 / 128);
  await expect.poll(() => canvas.evaluate((c: HTMLCanvasElement) => c.getContext('2d')!.getImageData(40, 40, 1, 1).data[3])).toBe(0);
  const inputObservedMs = Date.now() - inputStarted;
  const strokeDraws = await page.evaluate(() => (window as unknown as { memoryPathStats: { draws: number } }).memoryPathStats.draws);
  const editedPng = await canvas.evaluate((c: HTMLCanvasElement) => c.toDataURL().split(',')[1]);
  await page.getByTestId('save-button').click();
  await expect(page.locator('[role="status"]').filter({ hasText: /Changes saved/ })).toBeVisible();
  const before = await page.evaluate(() => {
    const stats = (window as unknown as { memoryPathStats: { draws: number; peakEncodes: number } }).memoryPathStats;
    stats.draws = 0; stats.peakEncodes = 0; return performance.now();
  });
  await page.getByTestId('export-button').click(); await page.getByTestId('export-tab-project').click();
  const download = page.waitForEvent('download'); await page.getByRole('button', { name: 'Download project backup', exact: true }).click();
  const path = await (await download).path(); expect(path).toBeTruthy();
  const project = JSON.parse(await readFile(path!, 'utf8'));
  expect(project.frames).toHaveLength(64);
  const decodedMatches = await page.evaluate(async ({ actual, expected }) => {
    const cache = new Map<string, Promise<Uint8ClampedArray>>();
    const decode = (png: string) => {
      if (!cache.has(png)) cache.set(png, (async () => {
        const image = new Image(); image.src = 'data:image/png;base64,' + png; await image.decode();
        const c = document.createElement('canvas'); c.width = image.width; c.height = image.height;
        const ctx = c.getContext('2d')!; ctx.drawImage(image, 0, 0); return ctx.getImageData(0, 0, c.width, c.height).data;
      })());
      return cache.get(png)!;
    };
    return Promise.all(actual.map(async (png: string, i: number) => {
      const left = await decode(png), right = await decode(expected[i]);
      return left.length === right.length && left.every((byte, index) => byte === right[index]);
    }));
  }, { actual: project.frames.map((frame: { layers: { pngBase64: string }[] }) => frame.layers[0].pngBase64), expected: fixture.frames.map((_, i) => i === 0 ? editedPng : originalPng) });
  expect(decodedMatches).toEqual(Array(64).fill(true));
  const metrics = await page.evaluate(start => ({ elapsedMs: performance.now() - start, ...(window as unknown as { memoryPathStats: { draws: number; peakEncodes: number } }).memoryPathStats }), before);
  await info.attach('memory-path-measurement', { body: JSON.stringify({ retained, backingBytes: retained.reduce((n, c) => n + c.width * c.height * 4, 0), metrics }, null, 2), contentType: 'application/json' });
  await writeFile(info.outputPath(`${process.env.PIXIBUN_MEMORY_BASELINE ? 'baseline' : 'after'}-${info.project.name}.json`), JSON.stringify({ retained, backingBytes: retained.reduce((n, c) => n + c.width * c.height * 4, 0), metrics, strokeDraws, inputObservedMs }, null, 2));
  if (!process.env.PIXIBUN_MEMORY_BASELINE) {
    expect(retained.length).toBeLessThan(32); expect(retained.every(c => c.width <= 24 && c.height <= 24)).toBe(true);
    expect((metrics as { peakEncodes: number }).peakEncodes).toBeLessThanOrEqual(2);
    expect(strokeDraws).toBeLessThanOrEqual(4);
  }
  await page.getByRole('button', { name: /Select frame 64\./ }).scrollIntoViewIfNeeded();
  await expect(page.getByTestId('frame-thumbnail-63')).toBeVisible();
  expect(await page.getByTestId('frame-thumbnail-63').evaluate((c: HTMLCanvasElement) => Array.from(c.getContext('2d')!.getImageData(Math.floor(c.width * 0.375), Math.floor(c.height * 0.375), 1, 1).data))).toEqual(originalGreen);
});

test('compiled small previews match native composites with alpha, blends, hidden layers and rectangular artwork', async ({ page }) => {
  await page.goto('/studio'); await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  const fixture = await page.evaluate(() => {
    const png = (color: string) => {
      const c = document.createElement('canvas'); c.width = 48; c.height = 24;
      const ctx = c.getContext('2d')!; ctx.fillStyle = color; ctx.fillRect(0, 0, 48, 24);
      ctx.clearRect(12, 6, 12, 6); return c.toDataURL().split(',')[1];
    };
    const layer = (id: string, color: string, opacity: number, blendMode: string, visible = true) => ({ id, name: id, opacity, blendMode, visible, locked: false, pngBase64: png(color) });
    return { format: 'pixibun-project', version: 3, name: 'Preview blend fixture', width: 48, height: 24, fps: 8, loopMode: 'repeat',
      palettes: [{ id: 'colors', name: 'Colors', colors: ['#ff0000'] }], currentPaletteId: 'colors', customRamps: [], clips: [],
      frames: [{ id: 'frame', durationMs: 100, layers: [layer('hidden', '#ff0000', 1, 'source-over', false), layer('light', '#80ff8080', 0.4, 'screen'), layer('base', '#40208080', 0.7, 'source-over')] }], createdAt: 1, updatedAt: 1 };
  });
  await page.locator('input[type=file]').first().setInputFiles({ name: 'blend.pixibun', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(fixture)) });
  const dialog = page.getByRole('dialog', { name: 'Import Project (.pixibun)' }); await dialog.getByRole('button', { name: 'Confirm Import' }).click(); await expect(dialog).toBeHidden();
  await expect(page.getByTestId('frame-thumbnail-0')).toBeVisible();
  const comparison = await page.evaluate(() => {
    const source = document.querySelector<HTMLCanvasElement>('[data-testid=main-composite-canvas]')!;
    const actual = document.querySelector<HTMLCanvasElement>('[data-testid=frame-thumbnail-0]')!;
    const expected = document.createElement('canvas'); expected.width = 24; expected.height = 12;
    const ctx = expected.getContext('2d')!; ctx.imageSmoothingEnabled = false; ctx.drawImage(source, 0, 0, 24, 12);
    return { width: actual.width, height: actual.height, expected: Array.from(ctx.getImageData(0, 0, 24, 12).data), actual: Array.from(actual.getContext('2d')!.getImageData(0, 0, actual.width, actual.height).data) };
  });
  expect(comparison.width).toBe(24); expect(comparison.height).toBe(12); expect(comparison.actual).toEqual(comparison.expected);
});

test('compiled GIF preparation cancels before download and a later PNG export still works', async ({ page }) => {
  await page.goto('/studio'); await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  const fixture = await page.evaluate(() => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const ctx = c.getContext('2d')!; ctx.fillStyle = '#ff0000'; ctx.fillRect(0, 0, 128, 128);
    const pngBase64 = c.toDataURL().split(',')[1];
    return { format: 'pixibun-project', version: 3, name: 'Cancel fixture', width: 128, height: 128, fps: 8, loopMode: 'repeat',
      palettes: [{ id: 'colors', name: 'Colors', colors: ['#ff0000'] }], currentPaletteId: 'colors', customRamps: [], clips: [],
      frames: Array.from({ length: 64 }, (_, i) => ({ id: `f-${i}`, durationMs: 100, layers: [{ id: `l-${i}`, name: 'Body', visible: true, locked: false, opacity: 1, blendMode: 'source-over', pngBase64 }] })), createdAt: 1, updatedAt: 1 };
  });
  await page.locator('input[type=file]').first().setInputFiles({ name: 'cancel.pixibun', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(fixture)) });
  const importing = page.getByRole('dialog', { name: 'Import Project (.pixibun)' }); await importing.getByRole('button', { name: 'Confirm Import' }).click(); await expect(importing).toBeHidden();
  const png = () => page.getByTestId('main-composite-canvas').evaluate((c: HTMLCanvasElement) => c.toDataURL());
  const before = await png(); const downloads: string[] = []; page.on('download', download => downloads.push(download.suggestedFilename()));
  await page.getByTestId('export-button').click(); await page.getByTestId('export-tab-gif').click();
  const exporting = page.getByRole('dialog', { name: 'Export Studio Assets' });
  await exporting.getByRole('button', { name: '1x', exact: true }).click();
  await exporting.getByRole('button', { name: 'Download GIF', exact: true }).click();
  await expect(exporting.getByText('Encoding GIF…', { exact: true })).toBeVisible();
  await page.keyboard.press('Escape'); await expect(exporting).toBeHidden();
  expect(await png()).toBe(before);
  await expect(page.getByRole('button', { name: /^Select frame \d+\./ })).toHaveCount(64);
  await page.getByTestId('export-button').click(); await page.getByTestId('export-tab-png').click();
  await exporting.getByRole('button', { name: '1x', exact: true }).click();
  const pending = page.waitForEvent('download'); await exporting.getByRole('button', { name: 'Download PNG', exact: true }).click();
  const downloaded = await pending; expect(downloaded.suggestedFilename()).toMatch(/\.png$/);
  expect((await readFile((await downloaded.path())!)).length).toBeGreaterThan(100);
  expect(downloads).toEqual([downloaded.suggestedFilename()]); expect(await png()).toBe(before);
});
