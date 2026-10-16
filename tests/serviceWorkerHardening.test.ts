import { describe, expect, it, vi } from 'vitest';
import { runInNewContext } from 'node:vm';
import { buildServiceWorkerScript } from '@/app/sw.js/route';

const flush = async () => { for (let i = 0; i < 40; i++) await Promise.resolve(); };
type Listener = (event: unknown) => void;

function worker(options: {
  caches: object;
  fetch: (request: unknown) => Promise<Response>;
  registration?: object;
  serviceWorker?: object;
  windows?: number;
}) {
  const listeners = new Map<string, Listener>();
  const timers = new Map<number, { callback: () => void; delay: number }>();
  let next = 0;
  runInNewContext(buildServiceWorkerScript('current'), {
    self: {
      location: { origin: 'https://example.test' },
      registration: options.registration,
      serviceWorker: options.serviceWorker,
      clients: { claim: async () => {}, matchAll: async () => Array.from({ length: options.windows ?? 0 }, (_, id) => ({ id })) },
      addEventListener: (name: string, callback: Listener) => listeners.set(name, callback),
    },
    caches: options.caches, fetch: options.fetch, URL, Response,
    setTimeout: (callback: () => void, delay: number) => { timers.set(++next, { callback, delay }); return next; },
    clearTimeout: (id: number) => timers.delete(id),
  });
  const fire = async (delay: number) => {
    for (const [id, timer] of [...timers]) if (timer.delay === delay) { timers.delete(id); timer.callback(); }
    await flush();
  };
  const request = (pathname: string, mode = 'cors', headers?: Record<string, string>) => {
    const pending: Promise<unknown>[] = [];
    let response: Promise<Response> | undefined;
    listeners.get('fetch')!({
      request: { url: `https://example.test${pathname}`, method: 'GET', mode, destination: '', headers: headers && new Headers(headers) },
      respondWith: (promise: Promise<Response>) => { response = promise; promise.catch(() => {}); },
      waitUntil: (promise: Promise<unknown>) => { pending.push(promise); promise.catch(() => {}); },
    });
    return { get response() { return response; }, pending };
  };
  return { request, fire, timers };
}

function storage(buckets: Record<string, Record<string, string>>) {
  const make = (entries: Record<string, string>) => ({
    match: vi.fn(async (request: string | { url: string }) => {
      const key = typeof request === 'string' ? `https://example.test${request}` : request.url;
      return key in entries ? new Response(entries[key]) : undefined;
    }),
    put: vi.fn(async () => {}), keys: vi.fn(async () => []), delete: vi.fn(async () => true),
  });
  const open = new Map(Object.entries(buckets).map(([name, entries]) => [name, make(entries)]));
  return {
    open: vi.fn(async (name: string) => open.get(name) ?? make({})),
    keys: vi.fn(async () => [...open.keys()]),
    delete: vi.fn(async (name: string) => open.delete(name)),
    match: vi.fn(async (request: string | { url: string }) => {
      for (const bucket of open.values()) { const hit = await bucket.match(request); if (hit) return hit; }
      return undefined;
    }),
    names: () => [...open.keys()],
  };
}
const basic = (body: string) => { const response = new Response(body); Object.defineProperty(response, 'type', { value: 'basic' }); return response; };

describe('navigation on a slow connection', () => {
  it('answers with the cached copy of the same page after the timeout and refreshes it', async () => {
    const caches = storage({ 'pixibun-current': { 'https://example.test/studio': 'cached Studio' } });
    let release!: (response: Response) => void;
    const sw = worker({ caches, fetch: () => new Promise(resolve => { release = resolve; }) });
    const result = sw.request('/studio', 'navigate');
    await flush();
    await sw.fire(4000);
    expect(await result.response!.then(r => r.text())).toBe('cached Studio');
    release(new Response('fresh Studio')); await flush();
    expect((await Promise.allSettled(result.pending)).every(r => r.status === 'fulfilled')).toBe(true);
  });
  it('keeps waiting for the network when this page is not cached', async () => {
    const caches = storage({ 'pixibun-current': { 'https://example.test/studio': 'cached Studio' } });
    let release!: (response: Response) => void;
    const sw = worker({ caches, fetch: () => new Promise(resolve => { release = resolve; }) });
    const result = sw.request('/', 'navigate');
    await flush(); await sw.fire(4000);
    let settled = false; result.response!.then(() => { settled = true; });
    await flush(); expect(settled).toBe(false);
    release(new Response('fresh home'));
    expect(await result.response!.then(r => r.text())).toBe('fresh home');
  });
  it('answers immediately from the network when it is healthy', async () => {
    const sw = worker({ caches: storage({}), fetch: async () => new Response('online') });
    const result = sw.request('/studio', 'navigate');
    expect(await result.response!.then(r => r.text())).toBe('online');
    expect([...sw.timers.values()].some(timer => timer.delay === 4000)).toBe(false);
  });
});

describe('flight data and older builds', () => {
  it.each([['/studio?_rsc=abc', undefined], ['/studio', { RSC: '1' }]] as const)('does not intercept Next.js flight data %s', async (pathname, headers) => {
    const fetch = vi.fn(async () => basic('flight'));
    const sw = worker({ caches: storage({}), fetch });
    const result = sw.request(pathname, 'cors', headers);
    expect(result.response).toBeUndefined();
    expect(fetch).not.toHaveBeenCalled();
  });
  it('reads a hashed build file from an older bucket when offline', async () => {
    const caches = storage({ 'pixibun-current': {}, 'pixibun-old': { 'https://example.test/_next/static/chunks/old.js': 'old chunk' } });
    const sw = worker({ caches, fetch: async () => { throw Error('Offline'); } });
    expect(await sw.request('/_next/static/chunks/old.js').response!.then(r => r.text())).toBe('old chunk');
  });
});

describe('retired bucket sweep', () => {
  const self = { id: 'me' };
  it('lets the active worker remove older buckets once one window remains', async () => {
    const caches = storage({ 'pixibun-current': {}, 'pixibun-old': {}, 'other-app': {} });
    const sw = worker({ caches, fetch: async () => new Response('online'), registration: { active: self }, serviceWorker: self, windows: 1 });
    const result = sw.request('/studio', 'navigate'); await result.response; await Promise.all(result.pending);
    expect(caches.names()).toEqual(['pixibun-current', 'other-app']);
  });
  it.each([
    ['several windows are open', { active: self }, self, 2],
    ['a newer worker is waiting', { active: self, waiting: {} }, self, 1],
    ['a newer worker is installing', { active: self, installing: {} }, self, 1],
    ['this worker is not the active one', { active: { id: 'newer' } }, self, 1],
    ['the worker cannot identify itself', { active: self }, undefined, 1],
  ])('keeps every bucket when %s', async (_name, registration, serviceWorker, windows) => {
    const caches = storage({ 'pixibun-current': {}, 'pixibun-old': {} });
    const sw = worker({ caches, fetch: async () => new Response('online'), registration, serviceWorker, windows });
    const result = sw.request('/studio', 'navigate'); await result.response; await Promise.all(result.pending);
    expect(caches.names()).toEqual(['pixibun-current', 'pixibun-old']);
  });
});
