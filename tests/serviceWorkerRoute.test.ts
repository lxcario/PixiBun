import { describe, it, expect } from 'vitest';
import { GET, buildServiceWorkerScript } from '@/app/sw.js/route';
import { runInNewContext } from 'node:vm';

type WorkerEvent = { request?: { url: string; method: string; mode: string; destination: string }; waitUntil(promise: Promise<unknown>): void; respondWith(promise: Promise<Response>): void };

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
        self: { location: { origin: 'https://example.test' }, clients: { claim: async () => {} }, addEventListener: (name: string, callback: (event: WorkerEvent) => void) => callbacks.set(name, callback) },
        caches: cacheStorage, URL, Response, fetch: () => { startedFetch(); return network; },
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
