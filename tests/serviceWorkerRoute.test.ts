import { describe, it, expect } from 'vitest';
import { GET } from '@/app/sw.js/route';

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
