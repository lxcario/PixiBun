import { expect, test, type Page } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { buildServiceWorkerScript } from '../../src/app/sw.js/route';

const pixels = (page: Page) => page.getByTestId('main-composite-canvas').evaluate((canvas: HTMLCanvasElement) =>
  Array.from(canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data));

async function ready(page: Page, url = '/studio') {
  page.on('console', async message => {
    if (message.type() !== 'error') return;
    const details = await Promise.all(message.args().map(arg => arg.evaluate(value =>
      value instanceof Error ? { name: value.name, message: value.message } : typeof value === 'string' ? value : String(value)).catch(() => message.text())));
    console.error('Production browser error:', message.text(), JSON.stringify(details));
  });
  await page.goto(url);
  await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  await expect(page.getByTestId('main-composite-canvas')).toBeVisible();
}

async function paint(page: Page, fraction: number) {
  const before = await pixels(page);
  const box = (await page.getByTestId('main-composite-canvas').boundingBox())!;
  await page.mouse.click(box.x + box.width * fraction, box.y + box.height * fraction);
  await expect.poll(() => pixels(page)).not.toEqual(before);
}

async function saved(page: Page) {
  await page.getByTestId('save-button').click();
  await expect(page.locator('[role="status"]').filter({ hasText: /Changes saved/ })).toBeVisible();
}

test('production drawing, save, reload, undo and redo preserve pixels without development handles', async ({ page }) => {
  await ready(page);
  expect(await page.evaluate(() => Object.keys(window).filter(key => /__studioStore|__pixibunDb/.test(key)))).toEqual([]);
  await paint(page, 0.3); await saved(page);
  const first = await pixels(page);
  await page.reload();
  await expect.poll(() => pixels(page)).toEqual(first);
  await paint(page, 0.7);
  const second = await pixels(page);
  await page.keyboard.press('Control+z'); await expect.poll(() => pixels(page)).toEqual(first);
  await page.keyboard.press('Control+Shift+z'); await expect.poll(() => pixels(page)).toEqual(second);
  await saved(page); await page.reload(); await expect.poll(() => pixels(page)).toEqual(second);
});

test('two real tabs refuse stale saves and save an independent conflict copy', async ({ page, context }) => {
  await ready(page); await paint(page, 0.3); await saved(page);
  const secondTab = await context.newPage(); await ready(secondTab);
  const shared = await pixels(page); await expect.poll(() => pixels(secondTab)).toEqual(shared);
  await paint(page, 0.7); await saved(page);
  const original = await pixels(page);
  await paint(secondTab, 0.5);
  const copy = await pixels(secondTab);
  await secondTab.getByTestId('save-button').click();
  await expect(secondTab.getByRole('alert').filter({ hasText: /changed in another tab/ })).toBeVisible();
  await page.reload(); await expect.poll(() => pixels(page)).toEqual(original);
  await secondTab.getByRole('button', { name: 'Save a copy', exact: true }).click();
  await expect(secondTab.getByRole('alert').filter({ hasText: /changed in another tab/ })).toHaveCount(0);
  await saved(secondTab); await secondTab.reload(); await expect.poll(() => pixels(secondTab)).toEqual(copy);
  // The original tab still targets the original identity and can save it independently.
  await page.getByTestId('save-button').click();
  await expect(page.getByRole('alert').filter({ hasText: /changed in another tab/ })).toHaveCount(0);
});

test('warm production offline reload retains exact artwork and can save new edits', async ({ page, baseURL }) => {
  // Stop this test's entire origin. WebKit's offline-emulation flag incorrectly
  // rejects service-worker responses too (Playwright issue #42775).
  const server = createServer(async (request, response) => {
    try {
      const upstream = await fetch(`${baseURL}${request.url}`);
      response.writeHead(upstream.status, Object.fromEntries([...upstream.headers].filter(([key]) => !['content-encoding', 'content-length', 'transfer-encoding'].includes(key))));
      response.end(Buffer.from(await upstream.arrayBuffer()));
    } catch { response.writeHead(502); response.end(); }
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address() as { port: number };
  try {
    await ready(page, `http://127.0.0.1:${address.port}/studio`); await paint(page, 0.3); await saved(page);
    await page.evaluate(async () => { await navigator.serviceWorker.ready; });
    await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
    await expect.poll(() => page.evaluate(async () => {
      const assets = performance.getEntriesByType('resource').map(entry => entry.name).filter(url => new URL(url).pathname.startsWith('/_next/static/'));
      return (await Promise.all(assets.map(async url => await caches.match(url) ? null : url))).filter(Boolean);
    })).toEqual([]);
    const online = await pixels(page);
    server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve()));
    await page.reload();
    await expect.poll(() => pixels(page)).toEqual(online);
    await paint(page, 0.7); await saved(page);
    const offline = await pixels(page);
    await page.reload(); await expect.poll(() => pixels(page)).toEqual(offline);
  } finally { if (server.listening) { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); } }
});

test('production GIF worker produces a downloadable file that the native image decoder can open', async ({ page, context }, testInfo) => {
  await ready(page); await paint(page, 0.5);
  await page.getByRole('button', { name: 'Export drawing', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByTestId('export-tab-gif').click();
  const workerStarted = page.waitForEvent('worker');
  const downloaded = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Download GIF', exact: true }).click();
  const worker = await workerStarted;
  expect(worker.url()).toContain('/_next/');
  const download = await downloaded;
  const bytes = await readFile((await download.path())!);
  expect(bytes.subarray(0, 6).toString()).toBe('GIF89a');
  expect(bytes.at(-1)).toBe(0x3b);
  await testInfo.attach('production-export.gif', { body: bytes, contentType: 'image/gif' });
  const decoder = await context.newPage();
  const paintedPixels = await decoder.evaluate(async base64 => {
    const image = new Image(); image.src = URL.createObjectURL(new Blob([Uint8Array.from(atob(base64), char => char.charCodeAt(0))], { type: 'image/gif' }));
    await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
    const ctx = canvas.getContext('2d')!; ctx.drawImage(image, 0, 0);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    URL.revokeObjectURL(image.src);
    return Array.from(data).filter((alpha, index) => index % 4 === 3 && alpha > 0).length;
  }, bytes.toString('base64'));
  expect(paintedPixels).toBeGreaterThan(0);
});

test('a real waiting update preserves both open tabs and activates after all tabs close', async ({ context, baseURL }) => {
  let version = 'phase3-old';
  // Two release scripts through a local proxy; the UI and assets are the actual production build.
  const server = createServer(async (request, response) => {
    try {
      if (request.url?.startsWith('/sw.js')) {
        response.writeHead(200, { 'Content-Type': 'application/javascript', 'Cache-Control': 'no-store', 'Service-Worker-Allowed': '/' });
        response.end(buildServiceWorkerScript(version)); return;
      }
      const upstream = await fetch(`${baseURL}${request.url}`);
      response.writeHead(upstream.status, Object.fromEntries([...upstream.headers].filter(([key]) => !['content-encoding', 'content-length', 'transfer-encoding'].includes(key))));
      response.end(Buffer.from(await upstream.arrayBuffer()));
    } catch { response.writeHead(502); response.end(); }
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address() as { port: number };
  const url = `http://127.0.0.1:${address.port}/studio`;
  try {
    const first = await context.newPage(); await ready(first, url); await paint(first, 0.3); await saved(first);
    await first.evaluate(async () => { await navigator.serviceWorker.ready; });
    await expect.poll(() => first.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
    const second = await context.newPage(); await ready(second, url);
    const artwork = await pixels(second);
    version = 'phase3-new';
    await first.evaluate(async () => { await (await navigator.serviceWorker.getRegistration())!.update(); });
    await expect.poll(() => first.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.waiting?.state)).toBe('installed');
    await first.getByRole('button', { name: 'Update instructions', exact: true }).click();
    await expect(first.getByText(/close all PixiBun tabs/i)).toBeVisible();
    await expect.poll(() => first.evaluate(async () => Boolean((await navigator.serviceWorker.getRegistration())?.waiting))).toBe(true);
    await expect.poll(() => pixels(second)).toEqual(artwork);
    await first.close();
    expect(await second.evaluate(async () => Boolean((await navigator.serviceWorker.getRegistration())?.waiting))).toBe(true);
    await second.close();
    const reopened = await context.newPage(); await ready(reopened, url);
    await expect.poll(() => reopened.evaluate(() => caches.keys())).toEqual(['pixibun-phase3-new']);
    await expect.poll(() => pixels(reopened)).toEqual(artwork);
    await reopened.close();
  } finally {
    server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve()));
  }
});
