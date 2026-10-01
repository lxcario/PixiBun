import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { importGameDeliveryFixture } from './gameDeliveryFixture';

/** Parse the downloaded formats independently of the production encoders. */
export function gifHolds(bytes: Buffer): number[] {
  expect(bytes.subarray(0, 6).toString()).toBe('GIF89a');
  const holds: number[] = [];
  let offset = 13 + ((bytes[10] & 0x80) ? 3 * (2 << (bytes[10] & 7)) : 0);
  const skipBlocks = () => { while (bytes[offset]) offset += 1 + bytes[offset]; offset++; };
  while (offset < bytes.length && bytes[offset] !== 0x3b) {
    const marker = bytes[offset++];
    if (marker === 0x21) {
      const label = bytes[offset++];
      if (label === 0xf9) holds.push(bytes.readUInt16LE(offset + 2) * 10);
      skipBlocks();
    } else {
      expect(marker).toBe(0x2c);
      const packed = bytes[offset + 8]; offset += 9;
      if (packed & 0x80) offset += 3 * (2 << (packed & 7));
      offset++; skipBlocks(); // LZW code size, then image data.
    }
  }
  expect(bytes[offset]).toBe(0x3b);
  return holds;
}

export function apngTiming(bytes: Buffer): { holds: number[]; plays: number; count: number } {
  expect(bytes.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const result = { holds: [] as number[], plays: -1, count: -1 };
  for (let offset = 8; offset < bytes.length;) {
    const length = bytes.readUInt32BE(offset), type = bytes.subarray(offset + 4, offset + 8).toString(), data = offset + 8;
    if (type === 'acTL') { result.count = bytes.readUInt32BE(data); result.plays = bytes.readUInt32BE(data + 4); }
    if (type === 'fcTL') result.holds.push(1000 * bytes.readUInt16BE(data + 20) / (bytes.readUInt16BE(data + 22) || 100));
    offset += 12 + length;
  }
  return result;
}

export async function verifyAnimatedDownloadOrder(page: Page) {
  await importGameDeliveryFixture(page, false, { solid: true, once: true });
  const posePixels: number[][] = [];
  for (let i = 1; i <= 3; i++) {
    await page.getByRole('button', { name: new RegExp(`^Select frame ${i}\\.`) }).click();
    const expected = [[255, 0, 0, 255], [0, 0, 255, 255], [0, 255, 0, 255]][i - 1];
    // WebKit's native fixture PNG round trip can shift a channel by one byte. Frame identity
    // is checked here; downloaded pixels must match the actual source exactly.
    await expect.poll(async () => {
      const pixel = await page.getByTestId('main-composite-canvas').evaluate((c: HTMLCanvasElement) => Array.from(c.getContext('2d')!.getImageData(0, 0, 1, 1).data));
      return Math.max(...pixel.map((value, channel) => Math.abs(value - expected[channel])));
    }).toBeLessThanOrEqual(1);
    posePixels.push(await page.getByTestId('main-composite-canvas').evaluate((c: HTMLCanvasElement) => Array.from(c.getContext('2d')!.getImageData(0, 0, 1, 1).data)));
  }
  await test.info().attach('source-pose-pixels', { body: JSON.stringify(posePixels), contentType: 'application/json' });
  await page.getByRole('button', { name: /^Select frame 1\./ }).click();
  const before = await page.getByTestId('main-composite-canvas').evaluate((c: HTMLCanvasElement) => Array.from(c.getContext('2d')!.getImageData(0, 0, 1, 1).data));
  for (const clip of ['back', 'bounce']) for (const format of ['gif', 'apng']) {
    await page.getByTestId('export-button').click(); const dialog = page.getByRole('dialog');
    await dialog.getByTestId(`export-tab-${format}`).click();
    await dialog.getByRole('combobox', { name: 'Export frame scope' }).selectOption(clip);
    await dialog.getByRole('button', { name: '1x', exact: true }).click();
    const pending = page.waitForEvent('download'); await dialog.getByRole('button', { name: `Download ${format.toUpperCase()}`, exact: true }).click();
    const download = await pending, path = test.info().outputPath(`${clip}.${format === 'gif' ? 'gif' : 'png'}`);
    await download.saveAs(path); const bytes = await readFile(path);
    const holds = clip === 'back' ? [110, 230, 70] : [70, 230, 110, 230];
    if (format === 'gif') { expect(gifHolds(bytes)).toEqual(holds); expect(bytes.includes(Buffer.from('NETSCAPE2.0'))).toBe(false); }
    else expect(apngTiming(bytes)).toEqual({ holds, plays: 1, count: holds.length });
    const pixel = await page.evaluate(async ({ data, mime }) => {
      const image = await createImageBitmap(new Blob([new Uint8Array(data)], { type: mime }), { colorSpaceConversion: 'none' });
      const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
      const ctx = canvas.getContext('2d')!; ctx.drawImage(image, 0, 0); image.close();
      return Array.from(ctx.getImageData(0, 0, 1, 1).data);
    }, { data: Array.from(bytes), mime: format === 'gif' ? 'image/gif' : 'image/png' });
    expect(pixel, `${format}/${clip} decoded first-frame pixel`).toEqual(posePixels[clip === 'back' ? 2 : 0]);
    await expect(dialog).toBeHidden();
  }
  expect(await page.getByTestId('main-composite-canvas').evaluate((c: HTMLCanvasElement) => Array.from(c.getContext('2d')!.getImageData(0, 0, 1, 1).data))).toEqual(before);
}
