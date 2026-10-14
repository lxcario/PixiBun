import { expect, test, type Page } from '@playwright/test';
import { createServer } from 'node:http';

// Audit v1.14.1 defect 1: a panel first opened offline failed its chunk request,
// crashed the Studio route and lost unsaved strokes.

const pixels = (page: Page) => page.getByTestId('main-composite-canvas').evaluate((canvas: HTMLCanvasElement) =>
  Array.from(canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data));

async function ready(page: Page, url = '/studio') {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  await expect(page.getByTestId('main-composite-canvas')).toBeVisible();
}

async function paint(page: Page, fraction: number) {
  const before = await pixels(page);
  const box = (await page.getByTestId('main-composite-canvas').boundingBox())!;
  await page.mouse.click(box.x + box.width * fraction, box.y + box.height * fraction);
  await expect.poll(() => pixels(page)).not.toEqual(before);
}

async function studioIntact(page: Page) {
  await expect(page.getByText('Studio Canvas Hitch')).toHaveCount(0);
  await expect(page.getByTestId('panel-load-error')).toHaveCount(0);
  await expect(page.getByTestId('main-composite-canvas')).toBeVisible();
}

test('every lazy panel opens offline when it was never opened online, and offline strokes survive', async ({ page, baseURL }) => {
  // Stop the whole origin rather than emulate offline (WebKit rejects worker responses too).
  const server = createServer(async (request, response) => {
    try {
      const upstream = await fetch(`${baseURL}${request.url}`);
      response.writeHead(upstream.status, Object.fromEntries([...upstream.headers].filter(([key]) => !['content-encoding', 'content-length', 'transfer-encoding'].includes(key))));
      response.end(Buffer.from(await upstream.arrayBuffer()));
    } catch { response.writeHead(502); response.end(); }
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as { port: number };
  try {
    await ready(page, `http://127.0.0.1:${port}/studio`);
    await page.evaluate(async () => { await navigator.serviceWorker.ready; });
    await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
    const assets = await page.evaluate(async () => (await (await fetch('/precache-manifest.json')).json()).assets as string[]);
    expect(assets.length).toBeGreaterThan(0);
    await expect.poll(() => page.evaluate(async (paths: string[]) =>
      (await Promise.all(paths.map(async path => await caches.match(path) ? null : path))).filter(Boolean), assets), { timeout: 30_000 }).toEqual([]);

    server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve()));
    await paint(page, 0.7);
    const offlineStroke = await pixels(page);

    await page.getByTestId('tab-ai').click();
    await expect(page.getByTestId('pixitools-browse-all')).toBeVisible();
    await studioIntact(page);

    await page.getByRole('button', { name: 'Export drawing', exact: true }).click();
    const tabs = page.getByRole('dialog').locator('[data-testid^="export-tab-"]');
    await expect(tabs.first()).toBeVisible();
    for (let index = 0; index < await tabs.count(); index++) {
      await tabs.nth(index).click();
      await studioIntact(page);
    }
    await page.keyboard.press('Escape');

    await page.getByTestId('main-composite-canvas').hover();
    await page.keyboard.press('?');
    await expect(page.getByRole('dialog')).toBeVisible();
    await studioIntact(page);
    await page.keyboard.press('Escape');
    await page.keyboard.press('Control+k');
    await expect(page.getByRole('dialog')).toBeVisible();
    await studioIntact(page);
    await page.keyboard.press('Escape');

    expect(await pixels(page)).toEqual(offlineStroke);
    await page.getByTestId('save-button').click();
    await expect(page.locator('[role="status"]').filter({ hasText: /Changes saved/ })).toBeVisible();
    await page.reload();
    await expect.poll(() => pixels(page)).toEqual(offlineStroke);
  } finally { if (server.listening) { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); } }
});

test.describe('without a service worker', () => {
  test.use({ serviceWorkers: 'block' });

  test('a panel whose chunk fails shows a retry inside the panel and keeps drawing alive', async ({ page }) => {
    await ready(page);
    await paint(page, 0.3);
    const failChunks = (route: { abort: () => Promise<void> }) => route.abort();
    await page.route('**/_next/static/chunks/**', failChunks);

    await page.getByTestId('tab-ai').click();
    await expect(page.getByTestId('panel-load-error')).toContainText('PixiTools could not load.');
    await expect(page.getByText('Studio Canvas Hitch')).toHaveCount(0);
    await paint(page, 0.6);

    await page.unroute('**/_next/static/chunks/**', failChunks);
    await page.getByRole('button', { name: 'Try again' }).click();
    await expect(page.getByTestId('pixitools-browse-all')).toBeVisible();
    await studioIntact(page);
  });
});
