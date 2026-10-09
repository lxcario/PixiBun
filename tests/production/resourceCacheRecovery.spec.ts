import { expect, test, type Page } from '@playwright/test';
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';

const pixels = (page: Page) => page.getByTestId('main-composite-canvas').evaluate((canvas: HTMLCanvasElement) =>
  Array.from(canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data));

// This fault shim runs in the native worker after a successful ordinary install.
// Production HTML/JS/worker bytes come from the frozen build; only CacheStorage
// outcomes and counters are injected. It models an outage, not its real frequency.
const faultShim = `
let resourceFault = '';
const resourceFaultCounts = { open: 0, read: 0 };
const resourceFetches = [];
const nativeCacheOpen = caches.open.bind(caches);
const nativeFetch = self.fetch.bind(self);
caches.open = (...args) => {
  if (resourceFault.startsWith('open-')) {
    resourceFaultCounts.open++;
    return resourceFault === 'open-reject' ? Promise.reject(Error('Injected cache open failure')) : new Promise(() => {});
  }
  return nativeCacheOpen(...args).then(cache => new Proxy(cache, { get(target, key) {
    if (key === 'match' && resourceFault.startsWith('read-')) return () => {
      resourceFaultCounts.read++;
      return resourceFault === 'read-reject' ? Promise.reject(Error('Injected cache read failure')) : new Promise(() => {});
    };
    const value = Reflect.get(target, key, target);
    return typeof value === 'function' ? value.bind(target) : value;
  }}));
};
self.fetch = (...args) => {
  resourceFetches.push(new URL(typeof args[0] === 'string' ? args[0] : args[0].url, self.location.origin).pathname);
  return nativeFetch(...args);
};
self.addEventListener('message', event => {
  if (event.data?.type !== 'RESOURCE_RECOVERY_FAULT') return;
  if (event.data.mode) resourceFault = event.data.mode;
  event.ports[0].postMessage({ mode: resourceFault, counts: resourceFaultCounts, fetches: resourceFetches });
});
`;
async function faultState(page: Page, mode?: string) {
  return page.evaluate(mode => new Promise<{ mode: string; counts: { open: number; read: number }; fetches: string[] }>(resolve => {
    const channel = new MessageChannel(); channel.port1.onmessage = event => { channel.port1.close(); resolve(event.data); };
    navigator.serviceWorker.controller!.postMessage({ type: 'RESOURCE_RECOVERY_FAULT', mode }, [channel.port2]);
  }), mode);
}
for (const mode of ['open-reject', 'open-stall', 'read-reject', 'read-stall']) {
  test(`online Studio loads exact resources and saved artwork despite ${mode} storage`, async ({ page, baseURL }, info) => {
    const script = await fetch(`${baseURL}/sw.js`).then(r => r.text());
    const binary = Buffer.from([0, 255, 17, 80, 23, 128, 4, 9]);
    const requests: string[] = [];
    const server = createServer(async (request, response) => {
      requests.push(request.url!);
      try {
        if (request.url?.startsWith('/sw.js')) {
          response.writeHead(200, { 'Content-Type': 'application/javascript', 'Cache-Control': 'no-store', 'Service-Worker-Allowed': '/' });
          response.end(faultShim + script); return;
        }
        if (request.url?.startsWith('/cache-fault-default.bin')) {
          response.writeHead(200, { 'Content-Type': 'application/octet-stream', 'Cache-Control': 'no-store' }); response.end(binary); return;
        }
        const upstream = await fetch(`${baseURL}${request.url}`);
        const headers = Object.fromEntries([...upstream.headers].filter(([key]) => !['content-encoding', 'content-length', 'transfer-encoding'].includes(key)));
        response.writeHead(upstream.status, { ...headers, 'cache-control': 'no-store' }); response.end(Buffer.from(await upstream.arrayBuffer()));
      } catch { response.writeHead(502); response.end(); }
    });
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
    try {
      await page.goto(`${origin}/studio`, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
      const before = await pixels(page), box = (await page.getByTestId('main-composite-canvas').boundingBox())!;
      await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.3);
      await expect.poll(() => pixels(page)).not.toEqual(before);
      await page.getByTestId('save-button').click();
      await expect(page.locator('[role="status"]').filter({ hasText: /Changes saved/ })).toBeVisible();
      const saved = await pixels(page);
      await page.evaluate(async () => { await navigator.serviceWorker.ready; });
      await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
      const chunk = await page.evaluate(() => performance.getEntriesByType('resource').map(r => new URL(r.name)).find(u => u.pathname.startsWith('/_next/static/') && u.pathname.endsWith('.js'))!.pathname);
      const expectedChunk = await fetch(`${baseURL}${chunk}`).then(r => r.arrayBuffer());
      const expectedHash = createHash('sha256').update(Buffer.from(expectedChunk)).digest('hex');
      expect((await faultState(page, mode)).mode).toBe(mode);
      const requestStart = requests.length;
      await page.reload({ waitUntil: 'domcontentloaded' });
      await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
      await expect.poll(() => pixels(page)).toEqual(saved);
      expect(await page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
      const downloaded = await page.evaluate(async chunk => {
        const response = await fetch(chunk + '?cache-fault-exact=1');
        const bytes = await response.arrayBuffer();
        const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))).map(v => v.toString(16).padStart(2, '0')).join('');
        const binary = await fetch('/cache-fault-default.bin?cache-fault-exact=1');
        return { status: response.status, hash, binaryStatus: binary.status, binary: Array.from(new Uint8Array(await binary.arrayBuffer())) };
      }, chunk);
      expect(downloaded).toEqual({ status: 200, hash: expectedHash, binaryStatus: 200, binary: [...binary] });
      const state = await faultState(page);
      expect(state.mode).toBe(mode); expect(state.counts[mode.startsWith('open') ? 'open' : 'read']).toBeGreaterThan(0);
      expect(state.fetches).toContain(chunk); expect(state.fetches).toContain('/cache-fault-default.bin');
      expect(requests.slice(requestStart).some(p => p.startsWith('/_next/static/') && p.includes('.js'))).toBe(true);
      await info.attach('native-resource-recovery.json', { body: Buffer.from(JSON.stringify({ mode, state, downloaded, actualServerRequests: requests.slice(requestStart) })), contentType: 'application/json' });
    } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
  });
}
