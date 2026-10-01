import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import type { StudioState } from '../../src/stores/studioStore';
type StudioWindow = Window & { __studioStore: { getState(): StudioState } };

async function prepareArtwork(page: Page) {
  await page.goto('/studio');
  const canvas = page.getByTestId('main-composite-canvas');
  await expect(canvas).toBeVisible();
  await expect(page.locator('[data-restoration-phase]')).toHaveAttribute('data-restoration-phase', 'active');
  await expect.poll(() => page.evaluate(() => Boolean((window as Partial<StudioWindow>).__studioStore))).toBe(true);
  await page.evaluate(() => {
    const state = (window as unknown as StudioWindow).__studioStore.getState();
    state.setPrimaryColor('#ff0000'); state.setBrushSize(16); state.setFrameDuration(0, 300);
  });
  await expect(page.getByRole('button', { name: 'Brush size 16 pixels', exact: true })).toBeVisible();
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  const box = (await canvas.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect.poll(() => canvas.evaluate((c: HTMLCanvasElement) => c.getContext('2d')!.getImageData(16, 16, 1, 1).data[0])).toBe(255);
}
async function openExport(page: Page, format: string) {
  await page.getByTestId('export-button').click();
  const dialog = page.getByRole('dialog'); await expect(dialog).toBeVisible();
  await dialog.getByTestId('export-tab-' + format).click();
  return dialog;
}

for (const format of ['gif', 'webm', 'mp4']) {
  test(`downloaded ${format.toUpperCase()} opens in the native decoder and contains painted pixels`, async ({ page, context }, testInfo) => {
    await prepareArtwork(page);
    const dialog = await openExport(page, format);
    if (format !== 'gif') await dialog.getByRole('button', { name: '1 loop', exact: true }).click();
    const button = dialog.getByRole('button', { name: 'Download ' + format.toUpperCase(), exact: true });
    await expect(button).toBeEnabled();
    const downloadEvent = page.waitForEvent('download'); await button.click();
    const download = await downloadEvent; const bytes = await readFile((await download.path())!);
    await testInfo.attach('export.' + format, { body: bytes, contentType: format === 'gif' ? 'image/gif' : 'video/' + format });
    expect(download.suggestedFilename()).toMatch(new RegExp('\\.' + format + '$'));
    // Decode in a fresh blank page: the studio CSP does not permit blob video
    // playback, while export itself only downloads files.
    const decoderPage = await context.newPage();
    const decoded = await decoderPage.evaluate(async ({ base64, format }) => {
      const binary = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([binary], { type: format === 'gif' ? 'image/gif' : 'video/' + format }));
      try {
        const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d')!;
        if (format === 'gif') {
          const image = new Image(); image.src = url; await image.decode();
          canvas.width = image.width; canvas.height = image.height; ctx.drawImage(image, 0, 0);
        } else {
          const video = document.createElement('video'); video.muted = true;
          await new Promise<void>((resolve, reject) => {
            video.onloadeddata = () => resolve(); video.onerror = () => reject(new Error('Native video decoder failed: ' + video.error?.message));
            video.src = url;
          });
          await new Promise<void>((resolve, reject) => {
            video.onseeked = () => resolve(); video.onerror = () => reject(new Error('Native video seek failed'));
            video.currentTime = 0.12;
          });
          canvas.width = video.videoWidth; canvas.height = video.videoHeight; ctx.drawImage(video, 0, 0);
        }
        return { width: canvas.width, height: canvas.height,
          pixel: Array.from(ctx.getImageData(canvas.width / 2, canvas.height / 2, 1, 1).data) };
      } finally { URL.revokeObjectURL(url); }
    }, { base64: bytes.toString('base64'), format });
    await decoderPage.close();
    expect(decoded.width).toBe(128); expect(decoded.height).toBe(128);
    expect(decoded.pixel[0]).toBeGreaterThan(200);
    expect(decoded.pixel[1]).toBeLessThan(60); expect(decoded.pixel[2]).toBeLessThan(60);
    if (format === 'gif') {
      const gce = bytes.indexOf(Buffer.from([0x21, 0xf9, 0x04])); expect(gce).toBeGreaterThan(0);
      expect(bytes.readUInt16LE(gce + 4)).toBe(30); // 300 ms hold.
      expect(bytes[bytes.length - 1]).toBe(0x3b); // No unused worker capacity after trailer.
    }
  });
}

test('unsupported WebM is explained and cannot download a placeholder', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, 'MediaRecorder', { configurable: true, value: undefined }));
  await prepareArtwork(page); const dialog = await openExport(page, 'webm');
  await expect(dialog.getByRole('alert')).toContainText('WebM recording is unavailable');
  await expect(dialog.getByRole('button', { name: 'Download WEBM', exact: true })).toBeDisabled();
});

test('GIF post-transfer failure tells the artist to retry and never downloads corrupted data', async ({ page }) => {
  await prepareArtwork(page);
  await page.evaluate(() => {
    class FailedWorker {
      onmessage: ((event: { data: object }) => void) | null = null;
      onerror = null;
      terminate() {}
      postMessage(message: object, transfer: ArrayBuffer[]) {
        structuredClone(message, { transfer });
        queueMicrotask(() => this.onmessage?.({ data: { type: 'error', message: 'Post-transfer failure' } }));
      }
    }
    Object.defineProperty(window, 'Worker', { configurable: true, value: FailedWorker });
  });
  const downloads: string[] = []; page.on('download', item => downloads.push(item.suggestedFilename()));
  const dialog = await openExport(page, 'gif');
  await dialog.getByRole('button', { name: 'Download GIF', exact: true }).click();
  await expect(page.getByTestId('studio-toast')).toContainText('GIF encoding failed after transferring pixels. Please retry the export.');
  await expect(dialog.getByRole('button', { name: 'Download GIF', exact: true })).toBeEnabled();
  expect(downloads).toEqual([]);
});
