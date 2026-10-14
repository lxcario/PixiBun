import { describe, it, expect } from 'vitest';
import { GET, buildServiceWorkerScript } from '@/app/sw.js/route';
import { runInNewContext } from 'node:vm';

type WorkerEvent = { request?: { url: string; method: string; mode: string; destination: string }; waitUntil(promise: Promise<unknown>): void; respondWith(promise: Promise<Response>): void };

describe('navigation with unavailable cache storage', () => {
  async function navigate(cacheStorage: object, network: () => Promise<Response>) {
    const callbacks = new Map<string, (event: WorkerEvent) => void>();
    const pending: Promise<unknown>[] = [];
    let response!: Promise<Response>;
    runInNewContext(buildServiceWorkerScript('cache-fault'), {
      self: { location: { origin: 'https://example.test' }, addEventListener: (name: string, callback: (event: WorkerEvent) => void) => callbacks.set(name, callback) },
      caches: cacheStorage, fetch: network, URL, Response, setTimeout, clearTimeout,
    });
    callbacks.get('fetch')!({
      request: { url: 'https://example.test/studio', method: 'GET', mode: 'navigate', destination: '' },
      respondWith: promise => { response = promise; },
      waitUntil: promise => { pending.push(promise); promise.catch(() => {}); },
    });
    return { response: await response, pending };
  }

  it('delivers the healthy network shell when opening the cache rejects', async () => {
    let networkCalls = 0;
    const result = await navigate({ open: async () => { throw Error('Cache unavailable'); }, match: async () => undefined },
      async () => { networkCalls++; return new Response('online Studio'); });
    expect(networkCalls).toBe(1);
    expect(result.response.status).toBe(200);
    expect(await result.response.text()).toBe('online Studio');
    expect((await Promise.allSettled(result.pending)).every(item => item.status === 'fulfilled')).toBe(true);
  });

  it('delivers the network shell without waiting for a stalled cache open', async () => {
    let releaseCache!: (cache: object) => void;
    const stalled = new Promise<object>(resolve => { releaseCache = resolve; });
    const result = await navigate({ open: () => stalled }, async () => new Response('online Studio'));
    expect(await result.response.text()).toBe('online Studio');
    releaseCache({ put: async () => {}, keys: async () => [], match: async () => undefined });
    await Promise.all(result.pending);
  });

  it('does not turn a cache write failure into a failed online navigation', async () => {
    const result = await navigate({ open: async () => ({ put: async () => { throw Error('Quota exceeded'); } }) },
      async () => new Response('online Studio'));
    expect(result.response.status).toBe(200);
    expect(await result.response.text()).toBe('online Studio');
    expect((await Promise.allSettled(result.pending)).every(item => item.status === 'fulfilled')).toBe(true);
  });

  it('returns a controlled offline response when the network and cache reads both fail', async () => {
    const result = await navigate({ open: async () => { throw Error('Cache unavailable'); }, match: async () => { throw Error('Cache unavailable'); } },
      async () => { throw Error('Network unavailable'); });
    expect(result.response.status).toBe(503);
    expect(await result.response.text()).toBe('Offline and no cached shell available.');
    await Promise.all(result.pending);
  });
});

for (const [mode, pathname] of [['navigate', '/studio'], ['cors', '/_next/static/retirement.js'], ['cors', '/other.txt']]) {
  it(`a delayed old ${mode} ${pathname} response cannot recreate its retired cache`, async () => {
    // Cache objects survive deletion detached from CacheStorage; reopening by name
    // creates a new bucket. Model that distinction, then execute the emitted script.
    const buckets = new Map<string, ReturnType<typeof makeCache>>();
    function makeCache() {
      const entries = new Map<string, Response>();
      return {
        match: async (request: string | { url: string }) => entries.get(typeof request === 'string' ? request : request.url),
        put: async (request: string | { url: string }, response: Response) => { entries.set(typeof request === 'string' ? request : request.url, response); },
        keys: async () => [...entries.keys()].map(url => ({ url })),
        delete: async (request: { url: string }) => entries.delete(request.url),
      };
    }
    const cacheStorage = {
      open: async (name: string) => { if (!buckets.has(name)) buckets.set(name, makeCache()); return buckets.get(name)!; },
      keys: async () => [...buckets.keys()],
      delete: async (name: string) => buckets.delete(name),
      match: async () => undefined,
    };
    await cacheStorage.open('pixibun-old'); await cacheStorage.open('pixibun-new');
    let releaseFetch!: (response: Response) => void;
    let startedFetch!: () => void;
    const started = new Promise<void>(resolve => { startedFetch = resolve; });
    const network = new Promise<Response>(resolve => { releaseFetch = resolve; });
    const listeners = (version: string) => {
      const callbacks = new Map<string, (event: WorkerEvent) => void>();
      runInNewContext(buildServiceWorkerScript(version), {
        self: { location: { origin: 'https://example.test' }, clients: { claim: async () => {}, matchAll: async () => [] }, addEventListener: (name: string, callback: (event: WorkerEvent) => void) => callbacks.set(name, callback) },
        caches: cacheStorage, URL, Response, setTimeout, clearTimeout, fetch: () => { startedFetch(); return network; },
      });
      return callbacks;
    };
    const pending: Promise<unknown>[] = [];
    let response!: Promise<Response>;
    const event: WorkerEvent = {
      request: { url: `https://example.test${pathname}`, method: 'GET', mode, destination: '' },
      waitUntil: promise => { pending.push(promise); }, respondWith: promise => { response = promise; },
    };
    listeners('old').get('fetch')!(event);
    await started;
    const activation: Promise<unknown>[] = [];
    listeners('new').get('activate')!({ ...event, waitUntil: promise => { activation.push(promise); } });
    await Promise.all(activation);
    expect(await cacheStorage.keys()).toEqual(['pixibun-new']);
    const fetched = new Response('old response', { status: 200 });
    Object.defineProperty(fetched, 'type', { value: 'basic' });
    releaseFetch(fetched);
    await response; await Promise.all(pending);
    expect(await cacheStorage.keys()).toEqual(['pixibun-new']);
  });
}

describe('Service Worker Route Handler (sw.js/route.ts)', () => {
  it('returns status 200 with complete JavaScript service worker script', async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/javascript; charset=utf-8');
    expect(response.headers.get('cache-control')).toBe('no-cache, no-store, must-revalidate');
    expect(response.headers.get('service-worker-allowed')).toBe('/');

    const script = await response.text();
    expect(script).toContain('CACHE_NAME');
    expect(script).toContain('PRECACHE_ASSETS');
    expect(script).toContain('MAX_DYNAMIC_CACHE_ENTRIES = 50;');
    expect(script).toContain('trimCache');
    expect(script).toContain('event.waitUntil');
    expect(script).toContain('Promise.all');
  });

  it('generates syntactically valid JavaScript', async () => {
    const response = await GET();
    const script = await response.text();

    // Verify the script can be parsed as a JavaScript function without syntax errors
    expect(() => {
      // Create a function body mock to parse syntax
      new Function('self', script);
    }).not.toThrow();
  });

  it('guarantees core precache assets are excluded from dynamic eviction', async () => {
    const response = await GET();
    const script = await response.text();

    expect(script).toContain("!PRECACHE_ASSETS.includes(pathname)");
    expect(script).toContain("'/studio'");
    expect(script).toContain("'/manifest.webmanifest'");
    expect(script).toContain("'/offline.html'");
    expect(script).toContain("'/theme.js'");
  });

  it('restricts cache deletion to pixibun- namespace on activate', async () => {
    const response = await GET();
    const script = await response.text();

    expect(script).toContain("key.startsWith('pixibun-') && key !== CACHE_NAME");
  });

  it('generates distinct service worker scripts when cache version changes (B2/B4)', async () => {
    const scriptV1 = await (await GET()).text();
    process.env.SW_CACHE_VERSION = 'v1.14.2-test-bump';
    const scriptV2 = await (await GET()).text();

    expect(scriptV1).not.toBe(scriptV2);
    expect(scriptV2).toContain("const CACHE_NAME = 'pixibun-v1.14.2-test-bump';");
    delete process.env.SW_CACHE_VERSION;
  });
});
