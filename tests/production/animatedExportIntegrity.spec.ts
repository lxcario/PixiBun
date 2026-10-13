import { readFile, writeFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { readAnimatedGif } from '../helpers/readAnimatedGif';

const pixels = (page: Page) => page.getByTestId('main-composite-canvas').evaluate((c: HTMLCanvasElement) =>
  Array.from(c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data));
async function color(page: Page, hex: string) {
  await page.getByTestId('toolbar-color-dock').getByRole('button', { name: /^Primary color / }).dblclick();
  const dialog = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: /Pick Custom Primary Color/ }) });
  await dialog.getByRole('textbox', { name: 'Picker hex color', exact: true }).fill(hex);
  await dialog.getByRole('button', { name: 'Select Color', exact: true }).click(); await expect(dialog).toBeHidden();
}
async function fixture(page: Page, opaque = false) {
  await page.setViewportSize({ width: 1600, height: 1100 }); await page.goto('/studio?width=32&height=32');
  await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  const onion = page.getByTestId('bottom-timeline').getByRole('button', { name: 'Onion Skin', exact: true });
  if (await onion.getAttribute('aria-pressed') === 'true') await onion.click();
  await page.getByTestId(opaque ? 'bucket-tool' : 'pen-tool').click();
  if (!opaque) {
    await page.getByRole('button', { name: 'Brush size 1 pixels. Size 1 px', exact: true }).click();
    await page.getByRole('button', { name: '4 pixel brush preset', exact: true }).click(); await page.keyboard.press('Escape');
  }
  const frames: number[][] = [];
  for (let i = 0; i < 2; i++) {
    if (i) { await page.getByTestId('add-frame-button').click(); expect((await pixels(page)).every((v, c) => c % 4 !== 3 || v === 0)).toBe(true); }
    const hold = page.getByRole('spinbutton', { name: 'Active frame duration in milliseconds', exact: true });
    await hold.fill(i ? '240' : '160'); await hold.press('Tab');
    await color(page, i ? '#0000ff' : '#ff0000');
    const box = (await page.getByTestId('main-composite-canvas').boundingBox())!;
    const coord = opaque ? 16 : i ? 22 : 8; await page.mouse.click(box.x + (coord + .5) * box.width / 32, box.y + (coord + .5) * box.height / 32);
    const frame = await pixels(page); expect(frame.filter((v, c) => c % 4 === 3 && v === 255)).toHaveLength(opaque ? 1024 : 16); frames.push(frame);
  }
  return frames;
}
test('actual GIF download preserves every moving pose, transparent clearing and frame hold after saved reload', async ({ page }, info) => {
  const frames = await fixture(page); await page.getByTestId('save-button').click();
  await expect(page.getByRole('status').filter({ hasText: /^Changes saved$/ })).toBeVisible();
  await page.reload(); await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  // Restoring a document selects its first frame; inspect each saved cel explicitly.
  for (let i = 0; i < frames.length; i++) {
    await page.getByRole('button', { name: new RegExp(`^Select frame ${i + 1}\\.`) }).click();
    await expect.poll(() => pixels(page)).toEqual(frames[i]);
    await expect(page.getByRole('spinbutton', { name: 'Active frame duration in milliseconds', exact: true })).toHaveValue(i ? '240' : '160');
  }
  await page.getByTestId('export-button').click(); await page.getByTestId('export-tab-gif').click();
  const dialog = page.getByRole('dialog'); await dialog.getByRole('button', { name: '1x', exact: true }).click();
  const pending = page.waitForEvent('download'); await dialog.getByRole('button', { name: 'Download GIF', exact: true }).click();
  const download = await pending, bytes = await readFile((await download.path())!); await info.attach('actual-moving-poses.gif', { body: bytes, contentType: 'image/gif' });
  const decoded = readAnimatedGif(bytes); expect([decoded.width, decoded.height]).toEqual([32, 32]);
  expect(decoded.frames.map(frame => frame.delayMs)).toEqual([160, 240]); expect(decoded.frames.map(frame => frame.data)).toEqual(frames);
  await expect(dialog).toBeHidden(); expect(await pixels(page)).toEqual(frames[1]);
});
test('actual MP4 is playable with both painted poses, or its unsupported platform is explicitly refused', async ({ page, browserName }, info) => {
  const frames = await fixture(page, true); await page.getByTestId('export-button').click(); await page.getByTestId('export-tab-mp4').click();
  const dialog = page.getByRole('dialog'); await dialog.getByRole('button', { name: '1x', exact: true }).click();
  const supported = await page.evaluate(async () => {
    if (typeof VideoEncoder !== 'undefined' && typeof VideoFrame !== 'undefined') {
      try { if ((await VideoEncoder.isConfigSupported({ codec: 'avc1.42001f', width: 32, height: 32, bitrate: 2_000_000, framerate: 30, avc: { format: 'avc' } })).supported) return true; } catch { /* Query recording support independently. */ }
    }
    return typeof MediaRecorder === 'function' && typeof HTMLCanvasElement.prototype.captureStream === 'function'
      && ['video/mp4;codecs=avc1', 'video/mp4'].some(mime => MediaRecorder.isTypeSupported(mime));
  });
  const action = dialog.getByRole('button', { name: 'Download MP4', exact: true });
  if (!supported) {
    await expect(action).toBeDisabled(); await expect(dialog.getByText(/MP4.*Unsupported/i).first()).toBeVisible();
    await writeFile(info.outputPath('mp4-capability.json'), JSON.stringify({ browserName, status: 'unsupported', decoded: false }));
    expect(await pixels(page)).toEqual(frames[1]); return;
  }
  await expect(action).toBeEnabled(); const pending = page.waitForEvent('download'); await action.click();
  const download = await pending, bytes = await readFile((await download.path())!); await info.attach('actual-painted-poses.mp4', { body: bytes, contentType: 'video/mp4' });
  expect(bytes.subarray(4, 8).toString()).toBe('ftyp'); expect(bytes.includes(Buffer.from('moov'))).toBe(true); expect(bytes.includes(Buffer.from('mdat'))).toBe(true);
  // Decode the downloaded file outside Studio's restrictive media CSP.
  const decoderPage = await page.context().newPage();
  const observed = await decoderPage.evaluate(async data => {
    const video = document.createElement('video'); video.muted = true; video.preload = 'auto';
    const url = URL.createObjectURL(new Blob([new Uint8Array(data)], { type: 'video/mp4' }));
    const event = (name: 'loadeddata' | 'seeked') => new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Downloaded MP4 did not decode: ' + name)), 8000);
      video.addEventListener(name, () => { clearTimeout(timer); resolve(); }, { once: true });
      video.addEventListener('error', () => { clearTimeout(timer); reject(new Error('Downloaded MP4 media error')); }, { once: true });
    });
    try {
      const ready = event('loadeddata'); video.src = url; await ready;
      const canvas = document.createElement('canvas'); canvas.width = video.videoWidth; canvas.height = video.videoHeight;
      const context = canvas.getContext('2d')!, samples: number[][] = [];
      for (const at of [.08, .28]) { const seeking = event('seeked'); video.currentTime = at; await seeking; context.drawImage(video, 0, 0); samples.push(Array.from(context.getImageData(16, 16, 1, 1).data)); }
      return { width: video.videoWidth, height: video.videoHeight, duration: video.duration, samples };
    } finally { video.removeAttribute('src'); video.load(); URL.revokeObjectURL(url); }
  }, Array.from(bytes));
  await decoderPage.close();
  expect([observed.width, observed.height]).toEqual([32, 32]); expect(observed.duration).toBeGreaterThanOrEqual(.7); expect(observed.duration).toBeLessThanOrEqual(1.2);
  for (const [i, expected] of [[0, [255, 0, 0, 255]], [1, [0, 0, 255, 255]]] as const) {
    expect(observed.samples[i].map((v, c) => Math.abs(v - expected[c])).every(error => error <= 12)).toBe(true);
  }
  await writeFile(info.outputPath('mp4-capability.json'), JSON.stringify({ browserName, status: 'decoded', expectedDuration: .8, timingTolerance: 'recording path .7–1.2 seconds; not exact-hold qualification', ...observed }));
  expect(await pixels(page)).toEqual(frames[1]);
});
