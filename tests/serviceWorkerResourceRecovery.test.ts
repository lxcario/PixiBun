import { expect, it, vi } from 'vitest';
import { runInNewContext } from 'node:vm';
import { buildServiceWorkerScript } from '@/app/sw.js/route';

const flush = async () => { for (let i = 0; i < 40; i++) await Promise.resolve(); };
function probe(pathname: string, cacheStorage: object, network: () => Promise<Response>) {
  let handler!: (event: unknown) => void;
  let response!: Promise<Response>;
  const pending: Promise<unknown>[] = [];
  const timers = new Map<number, () => void>();
  let nextTimer = 0;
  runInNewContext(buildServiceWorkerScript('resource-fault'), {
    self: { location: { origin: 'https://example.test' }, addEventListener: (name: string, callback: typeof handler) => { if (name === 'fetch') handler = callback; } },
    caches: cacheStorage, fetch: network, URL, Response,
    setTimeout: (callback: () => void, delay: number) => { expect(delay).toBe(250); timers.set(++nextTimer, callback); return nextTimer; },
    clearTimeout: (id: number) => timers.delete(id),
  });
  handler({ request: { url: `https://example.test${pathname}`, method: 'GET', mode: 'cors', destination: '' },
    respondWith: (promise: Promise<Response>) => { response = promise; promise.catch(() => {}); },
    waitUntil: (promise: Promise<unknown>) => { pending.push(promise); promise.catch(() => {}); } });
  return { get response() { return response; }, pending, expire: async () => { const callbacks = [...timers.values()]; timers.clear(); callbacks.forEach(callback => callback()); await flush(); }, timers };
}
function healthyCache() {
  return { match: vi.fn(async () => undefined as Response | undefined), put: vi.fn(async () => {}), keys: vi.fn(async () => []), delete: vi.fn(async () => true) };
}
function online(body = 'network bytes') {
  const response = new Response(body); Object.defineProperty(response, 'type', { value: 'basic' }); return response;
}
for (const pathname of ['/_next/static/chunks/studio.js', '/other.txt']) {
  it(`${pathname}: rejected cache opening still fetches exact healthy network bytes`, async () => {
    const network = vi.fn(async () => online());
    const result = probe(pathname, { open: async () => { throw Error('Unavailable'); } }, network);
    await flush(); expect(network).toHaveBeenCalledTimes(1);
    expect(await result.response.then(r => r.text())).toBe('network bytes');
    expect((await Promise.allSettled(result.pending)).every(r => r.status === 'fulfilled')).toBe(true);
  });
  it(`${pathname}: stalled cache opening cannot block the network past the cache deadline`, async () => {
    let release!: (cache: ReturnType<typeof healthyCache>) => void;
    const lease = new Promise<ReturnType<typeof healthyCache>>(resolve => { release = resolve; });
    const open = vi.fn(() => lease), network = vi.fn(async () => online());
    const result = probe(pathname, { open }, network);
    await flush(); await result.expire(); expect(network).toHaveBeenCalledTimes(1);
    expect(await result.response.then(r => r.text())).toBe('network bytes');
    const detached = healthyCache(); release(detached); await flush(); await Promise.all(result.pending);
    expect(open).toHaveBeenCalledTimes(1); expect(detached.put).not.toHaveBeenCalled();
  });
  it(`${pathname}: rejected cache reads still deliver exact healthy bytes`, async () => {
    const cache = healthyCache(); cache.match.mockRejectedValue(Error('Unreadable'));
    const network = vi.fn(async () => online()); const result = probe(pathname, { open: async () => cache }, network);
    await flush(); expect(network).toHaveBeenCalledTimes(1); expect(await result.response.then(r => r.text())).toBe('network bytes');
    await Promise.all(result.pending);
  });
  it(`${pathname}: stalled cache reads cannot hold a healthy response`, async () => {
    const cache = healthyCache(); cache.match.mockImplementation(() => new Promise(() => {}));
    const network = vi.fn(async () => online()); const result = probe(pathname, { open: async () => cache }, network);
    await flush(); await result.expire(); expect(network).toHaveBeenCalledTimes(1);
    expect(await result.response.then(r => r.text())).toBe('network bytes');
    await result.expire(); await Promise.all(result.pending);
  });
  it(`${pathname}: rejected cache writes remain optional background work`, async () => {
    const cache = healthyCache(); cache.put.mockRejectedValue(Error('Quota exceeded'));
    const result = probe(pathname, { open: async () => cache }, async () => online());
    expect(await result.response.then(r => r.text())).toBe('network bytes');
    expect((await Promise.allSettled(result.pending)).every(r => r.status === 'fulfilled')).toBe(true);
  });
  it(`${pathname}: stalled cache writes end their optional event lifetime at the deadline`, async () => {
    const cache = healthyCache(); cache.put.mockImplementation(() => new Promise(() => {}));
    const result = probe(pathname, { open: async () => cache }, async () => online());
    expect(await result.response.then(r => r.text())).toBe('network bytes'); await flush(); await result.expire();
    expect((await Promise.allSettled(result.pending)).every(r => r.status === 'fulfilled')).toBe(true);
  });
  it(`${pathname}: failed network and unavailable storage produce an explicit resource error`, async () => {
    const result = probe(pathname, { open: async () => { throw Error('Unavailable'); } }, async () => { throw Error('Offline'); });
    const response = await result.response; expect(response.type).toBe('error'); expect(response.status).toBe(0); await Promise.all(result.pending);
  });
  it(`${pathname}: offline readable cached bytes are retained`, async () => {
    const cache = healthyCache(); cache.match.mockResolvedValue(new Response('cached bytes'));
    const result = probe(pathname, { open: async () => cache }, async () => { throw Error('Offline'); });
    expect(await result.response.then(r => r.text())).toBe('cached bytes'); await Promise.all(result.pending);
  });
}
it('default cache hits avoid fetching and tolerate failed LRU touch writes', async () => {
  const cache = healthyCache(); cache.match.mockResolvedValue(new Response('cached bytes')); cache.put.mockRejectedValue(Error('Unavailable'));
  const network = vi.fn(async () => online()); const result = probe('/other.txt', { open: async () => cache }, network);
  expect(await result.response.then(r => r.text())).toBe('cached bytes'); expect(network).not.toHaveBeenCalled();
  expect((await Promise.allSettled(result.pending)).every(r => r.status === 'fulfilled')).toBe(true);
});
it('static cache hits return before a delayed refresh and retain its event lifetime', async () => {
  let release!: (response: Response) => void; const network = new Promise<Response>(resolve => { release = resolve; });
  const cache = healthyCache(); cache.match.mockResolvedValue(new Response('cached bytes'));
  const result = probe('/_next/static/chunks/studio.js', { open: async () => cache }, () => network);
  expect(await result.response.then(r => r.text())).toBe('cached bytes'); expect(result.pending.length).toBeGreaterThan(0);
  release(online()); await Promise.all(result.pending); expect(cache.put).toHaveBeenCalled();
});
it('static online bytes arrive while the cache lease is still stalled, before its deadline', async () => {
  const network = vi.fn(async () => online());
  const result = probe('/_next/static/chunks/studio.js', { open: () => new Promise(() => {}) }, network);
  await flush(); expect(network).toHaveBeenCalledTimes(1);
  expect(await result.response.then(r => r.text())).toBe('network bytes');
  await result.expire(); await Promise.all(result.pending);
});
for (const pathname of ['/_next/static/chunks/studio.js', '/other.txt']) {
  it(`${pathname}: a synchronous storage exception still permits healthy fetching`, async () => {
    const result = probe(pathname, { open: () => { throw Error('SecurityError'); } }, async () => online());
    expect(await result.response.then(r => r.text())).toBe('network bytes'); await Promise.all(result.pending);
  });
  it(`${pathname}: offline plus stalled cache access resolves to an explicit resource error`, async () => {
    const result = probe(pathname, { open: () => new Promise(() => {}) }, async () => { throw Error('Offline'); });
    await flush(); await result.expire();
    expect((await result.response).type).toBe('error'); await Promise.all(result.pending);
  });
}
for (const fault of ['open-reject', 'read-stall']) {
  it(`optional warming with ${fault} storage cannot retain a rejected or endless event lifetime`, async () => {
    let handler!: (event: unknown) => void;
    const timers = new Map<number, () => void>(); let id = 0;
    new Function('self', 'caches', 'setTimeout', 'clearTimeout', buildServiceWorkerScript('warm-fault'))(
      { location: { origin: 'https://example.test' }, addEventListener: (name: string, callback: typeof handler) => { if (name === 'message') handler = callback; } },
      { open: () => fault === 'open-reject' ? Promise.reject(Error('Unavailable')) : Promise.resolve({ match: () => new Promise(() => {}) }) },
      (callback: () => void) => { timers.set(++id, callback); return id; }, (id: number) => timers.delete(id),
    );
    let pending!: Promise<unknown>;
    handler({ data: { type: 'CACHE_ASSETS', urls: ['/_next/static/lazy.js'] }, waitUntil: (p: Promise<unknown>) => { pending = p; } });
    await flush(); [...timers.values()].forEach(callback => callback()); await flush();
    expect((await Promise.allSettled([pending]))[0].status).toBe('fulfilled');
  });
}
it('static readable cached bytes survive an immediate HTTP 503 from refresh', async () => {
  let release!: (response: Response) => void;
  const stored = new Promise<Response>(resolve => { release = resolve; });
  const cache = healthyCache(); cache.match.mockImplementation(() => stored);
  const result = probe('/_next/static/chunks/studio.js', { open: async () => cache }, async () => new Response('unavailable', { status: 503 }));
  await flush(); release(new Response('cached bytes'));
  const response = await result.response; expect(response.status).toBe(200); expect(await response.text()).toBe('cached bytes');
  await Promise.all(result.pending);
});
