import { expect, type ConsoleMessage, type Page, type TestInfo } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { importGameDeliveryFixture } from './gameDeliveryFixture';
import { readNativePng } from './readNativePng';

type Capture = (name: string) => Promise<void>;
function unpack(bytes: Buffer) {
  const files: Record<string, Buffer> = {}; let offset = 0;
  while (bytes.readUInt32LE(offset) === 0x04034b50) {
    expect(bytes.readUInt16LE(offset + 8)).toBe(0);
    const size = bytes.readUInt32LE(offset + 18), length = bytes.readUInt16LE(offset + 26), extra = bytes.readUInt16LE(offset + 28), start = offset + 30 + length + extra;
    files[bytes.subarray(offset + 30, offset + 30 + length).toString()] = bytes.subarray(start, start + size); offset = start + size;
  }
  return files;
}
async function downloadFiles(page: Page, info: TestInfo, button: string, filename: string) {
  const next = page.waitForEvent('download'); await page.getByRole('button', { name: button, exact: true }).click();
  const download = await next; expect(download.suggestedFilename()).toMatch(/\.zip$/);
  const path = info.outputPath(filename); await download.saveAs(path); return unpack(await readFile(path));
}
async function rgba(page: Page, base64: string) {
  return page.evaluate(async src => {
    const image = new Image(); image.src = 'data:image/png;base64,' + src; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
    const ctx = canvas.getContext('2d')!; ctx.drawImage(image, 0, 0);
    return { width: image.width, height: image.height, data: Array.from(ctx.getImageData(0, 0, image.width, image.height).data) };
  }, base64);
}
export async function verifyManualNormalKit(page: Page, info: TestInfo, capture?: Capture) {
  await page.setViewportSize({ width: 1600, height: 1000 });
  const project = await importGameDeliveryFixture(page, false, { manualNormals: true, solid: true });
  await page.getByTestId('export-button').click(); await page.getByTestId('export-tab-godot-kit').click();
  await page.getByRole('checkbox', { name: 'Include normal-map atlas' }).check();
  await expect(page.getByText('Normal maps: Verified neutral normal layer on all 3 frames.', { exact: true })).toBeVisible();
  await expect(page.getByText(/exactly one Normal Facets or Normal Map layer/)).toBeVisible();
  if (capture) await capture('godot-manual-normals.png');
  const files = await downloadFiles(page, info, 'Download Godot kit', 'manual-normals.zip');
  const manifest = JSON.parse(files['manifest.json'].toString()), normal = readNativePng(files['normal.png']), diffuse = readNativePng(files['atlas.png']);
  const solidColors = [[255, 0, 0, 255], [0, 0, 255, 255], [0, 255, 0, 255]];
  for (let i = 0; i < project.frames.length; i++) {
    // Native ICC conversion is an appearance transform, not a raw PNG pixel oracle.
    // Decode the input samples independently, including exact normal-map data bytes.
    const color = readNativePng(Buffer.from(project.frames[i].layers[0].pngBase64, 'base64'));
    const expectedNormal = readNativePng(Buffer.from(project.frames[i].layers[1].pngBase64, 'base64'));
    expect(color.data).toEqual(Array.from({ length: project.width * project.height }, () => solidColors[i]).flat());
    const rect = manifest.rects[i];
    // Independent atlas sampling proves a visible manual data layer does not tint diffuse.
    for (let y = 0; y < project.height; y++) for (let x = 0; x < project.width; x++) {
      const target = ((rect.y + y) * diffuse.width + rect.x + x) * 4, source = (y * project.width + x) * 4;
      expect(diffuse.data.slice(target, target + 4)).toEqual(color.data.slice(source, source + 4));
      expect(normal.data.slice(target, target + 4)).toEqual(expectedNormal.data.slice(source, source + 4));
    }
  }
}
export async function verifyUniqueTileBundle(page: Page, info: TestInfo, capture?: Capture) {
  await page.setViewportSize({ width: 1600, height: 1000 });
  const project = await importGameDeliveryFixture(page, false, { outlined: true, tileAlpha: true });
  const source = await rgba(page, project.frames[0].layers[0].pngBase64);
  expect(source.data.some((v, i) => i % 4 === 3 && v === 51)).toBe(true);
  await page.getByTestId('tab-ai').click(); await page.getByTestId('pixitools-task-tileset').click();
  await page.getByRole('button', { name: 'Patterns & Tilesets', exact: true }).click();
  const download = page.getByRole('button', { name: 'Download tile PNG + maps (.zip)', exact: true });
  for (const size of [8, 16, 32]) {
    await page.getByRole('button', { name: `${size}px`, exact: true }).click();
    if (size !== 8) { await expect(download).toBeDisabled(); await expect(page.getByText('Artwork or settings changed. Slice again before copying or downloading.')).toBeVisible(); }
    await page.getByRole('button', { name: 'Slice Into Unique Tiles', exact: true }).click(); await expect(download).toBeEnabled();
    if (capture && size === 8) { await page.mouse.move(700, 70); await page.keyboard.press('Escape'); await expect(page.getByRole('group', { name: 'Tile Slicer preview' })).toBeHidden(); await capture('unique-tile-bundle.png'); }
    const files = await downloadFiles(page, info, 'Download tile PNG + maps (.zip)', `tiles-${size}.zip`);
    expect(Object.keys(files).sort()).toEqual(['map.tmj', 'tilemap.json', 'tileset.png']);
    const map = JSON.parse(files['tilemap.json'].toString()), tiled = JSON.parse(files['map.tmj'].toString()), atlas = readNativePng(files['tileset.png']);
    expect(map.atlas.image).toBe('tileset.png'); expect(atlas.width).toBe(map.atlas.width); expect(atlas.height).toBe(map.atlas.height);
    expect(tiled.tilesets[0]).toMatchObject({ firstgid: 1, image: 'tileset.png', imagewidth: atlas.width, imageheight: atlas.height, columns: map.atlas.columns, tilecount: map.uniqueTiles, margin: 0, spacing: 0 });
    expect(tiled.layers[0].data).toEqual(map.tilemap.flat().map((id: number) => id + 1));
    const restored = Array(source.data.length).fill(0);
    for (let y = 0; y < source.height; y++) for (let x = 0; x < source.width; x++) {
      const gid = tiled.layers[0].data[Math.floor(y / size) * tiled.width + Math.floor(x / size)], id = gid - tiled.tilesets[0].firstgid;
      const at = ((Math.floor(id / tiled.tilesets[0].columns) * size + y % size) * atlas.width + id % tiled.tilesets[0].columns * size + x % size) * 4;
      for (let channel = 0; channel < 4; channel++) restored[(y * source.width + x) * 4 + channel] = atlas.data[at + channel];
    }
    expect(restored).toEqual(source.data);
  }
  await page.getByRole('button', { name: /Select frame 2/ }).click(); await expect(download).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Copy Tilemap JSON', exact: true })).toBeDisabled();
  if (capture) { await page.mouse.move(700, 70); await page.keyboard.press('Escape'); await expect(page.getByRole('group', { name: 'Tile Slicer preview' })).toBeHidden(); await capture('unique-tile-stale.png'); }
  await page.getByRole('button', { name: /Select frame 1/ }).click(); await expect(download).toBeDisabled();
  await page.getByRole('button', { name: 'Slice Into Unique Tiles', exact: true }).click(); await expect(download).toBeEnabled();
  await page.getByRole('button', { name: '8px', exact: true }).click(); await expect(download).toBeDisabled();
  await page.getByRole('button', { name: '32px', exact: true }).click(); await expect(download).toBeDisabled();
}
export async function verifyTileEdgeRefusal(page: Page) {
  await importGameDeliveryFixture(page, false, { outlined: true, canvasSize: [31, 32] });
  await page.getByTestId('tab-ai').click(); await page.getByTestId('pixitools-task-tileset').click(); await page.getByRole('button', { name: 'Patterns & Tilesets', exact: true }).click();
  const downloads: string[] = []; page.on('download', d => downloads.push(d.suggestedFilename()));
  await page.getByRole('button', { name: 'Slice Into Unique Tiles', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'would cut off an edge' })).toBeVisible(); expect(downloads).toEqual([]);
  await expect(page.getByRole('button', { name: 'Download tile PNG + maps (.zip)', exact: true })).toHaveCount(0);
}
export async function verifyAmbiguousNormals(page: Page) {
  await importGameDeliveryFixture(page, false, { manualNormals: true, ambiguousNormals: true });
  await page.getByTestId('export-button').click(); await page.getByTestId('export-tab-godot-kit').click();
  await page.getByRole('checkbox', { name: 'Include normal-map atlas' }).check();
  await expect(page.getByText(/Missing or invalid on frame/)).toBeVisible();
  const downloads: string[] = []; page.on('download', d => downloads.push(d.suggestedFilename()));
  await page.getByRole('button', { name: 'Download Godot kit', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('exactly one full-opacity'); expect(downloads).toEqual([]);
}
export async function verifyPendingTileEdit(page: Page) {
  await importGameDeliveryFixture(page, false, { outlined: true });
  await page.getByTestId('tab-ai').click(); await page.getByTestId('pixitools-task-tileset').click(); await page.getByRole('button', { name: 'Patterns & Tilesets', exact: true }).click();
  await page.evaluate(() => {
    const original = HTMLCanvasElement.prototype.toBlob;
    const held: Array<() => void> = [];
    Object.assign(window, { releaseTileCodec: () => { HTMLCanvasElement.prototype.toBlob = original; held.forEach(f => f()); } });
    HTMLCanvasElement.prototype.toBlob = function (callback, ...args) { held.push(() => original.call(this, callback, ...args)); };
  });
  await page.getByRole('button', { name: 'Slice Into Unique Tiles', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Cancel tile export', exact: true })).toBeVisible();
  const canvas = page.getByTestId('main-composite-canvas'), box = (await canvas.boundingBox())!;
  await page.keyboard.press('x'); await page.mouse.click(box.x + box.width * 0.1, box.y + box.height * 0.1);
  await expect(page.getByText('Artwork changed while preparing tiles. Slice again to use the current pixels.')).toBeVisible();
  await page.evaluate(() => (window as Window & { releaseTileCodec?: () => void }).releaseTileCodec?.());
  await expect(page.getByRole('button', { name: 'Download tile PNG + maps (.zip)', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Slice Into Unique Tiles', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Download tile PNG + maps (.zip)', exact: true })).toBeEnabled();
}
export async function verifyWelcomeBenchGif(page: Page, info: TestInfo, capture?: Capture) {
  const startupErrors: string[] = [];
  const recordStartupError = (error: Error) => startupErrors.push(error.message);
  const recordConsoleError = (message: ConsoleMessage) => {
    if (message.type() === 'error') startupErrors.push(message.text());
  };
  page.on('pageerror', recordStartupError);
  page.on('console', recordConsoleError);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 1000 }); await page.goto('/');
  // The bench replaced the welcome page's text-note samples: its Hop loop saves a real GIF.
  const stage = page.getByRole('img', { name: /^Bun on the bench, / });
  await stage.scrollIntoViewIfNeeded(); await expect(stage).toBeVisible();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.reload(); await stage.scrollIntoViewIfNeeded();
  expect(startupErrors).toEqual([]);
  page.off('pageerror', recordStartupError);
  page.off('console', recordConsoleError);
  const tools = page.getByRole('radiogroup', { name: 'Tool' });
  await expect(tools.getByRole('radio', { name: /^Draw/ })).toHaveAttribute('aria-checked', 'true');
  await tools.getByRole('radio', { name: /^Hop/ }).click();
  await expect(tools.getByRole('radio', { name: /^Hop/ })).toHaveAttribute('aria-checked', 'true');
  await expect(stage).toHaveAccessibleName(/Hop tool/);
  if (capture) await capture('welcome-bench-hop.png');
  const next = page.waitForEvent('download'); await page.getByRole('button', { name: 'Save GIF', exact: true }).click();
  const d = await next; expect(d.suggestedFilename()).toMatch(/^pixibun-[a-z0-9-]+-hop\.gif$/);
  const path = info.outputPath('bench-hop.gif'); await d.saveAs(path);
  const bytes = await readFile(path);
  expect(bytes.subarray(0, 6).toString('latin1')).toBe('GIF89a');
  expect(bytes[bytes.length - 1]).toBe(0x3b);
  // Every frame carries a graphic control extension; the loop has several, and they clear to transparency.
  const controls: number[] = [];
  for (let i = bytes.indexOf(Buffer.from([0x21, 0xf9, 0x04])); i >= 0; i = bytes.indexOf(Buffer.from([0x21, 0xf9, 0x04]), i + 1)) controls.push(i);
  expect(controls.length).toBeGreaterThan(1);
  expect(controls.every(at => (bytes[at + 3] & 1) === 1)).toBe(true);
  const size = await page.evaluate(async base64 => {
    const image = new Image(); image.src = `data:image/gif;base64,${base64}`; await image.decode();
    return [image.naturalWidth, image.naturalHeight];
  }, bytes.toString('base64'));
  expect(size[0]).toBeGreaterThan(0); expect(size[1]).toBeGreaterThan(0);
}
export async function verifySvgApproximation(page: Page, info: TestInfo, capture?: Capture) {
  await importGameDeliveryFixture(page, false, { outlined: true }); await page.getByTestId('export-button').click(); await page.getByTestId('export-tab-svg').click();
  await expect(page.getByText(/An approximate contour conversion/)).toBeVisible(); await expect(page.getByText(/Lossless Vector SVG/)).toHaveCount(0);
  if (capture) await capture('svg-approximation.png');
  const next = page.waitForEvent('download'); await page.getByRole('button', { name: /Download SVG/ }).click();
  const d = await next; expect(d.suggestedFilename()).toMatch(/\.svg$/); const path = info.outputPath('approximation.svg'); await d.saveAs(path);
  const svg = await readFile(path, 'utf8');
  const parsed = await page.evaluate(text => { const doc = new DOMParser().parseFromString(text, 'image/svg+xml'); return { root: doc.documentElement.localName, errors: doc.querySelectorAll('parsererror').length, paths: doc.querySelectorAll('path').length }; }, svg);
  expect(parsed.root).toBe('svg'); expect(parsed.errors).toBe(0); expect(parsed.paths).toBeGreaterThan(0);
}
