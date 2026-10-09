import { describe, it, expect } from 'vitest';
import { buildServiceWorkerScript, GET } from '@/app/sw.js/route';

describe('Service Worker Route & Lifecycle Script (Milestone C1)', () => {
  it('generates byte-distinct scripts when version changes across deployments', () => {
    const scriptV1 = buildServiceWorkerScript('v1.14.0');
    const scriptV2 = buildServiceWorkerScript('v1.14.1');

    expect(scriptV1).not.toBe(scriptV2);
    expect(scriptV1).toContain("const CACHE_NAME = 'pixibun-v1.14.0';");
    expect(scriptV2).toContain("const CACHE_NAME = 'pixibun-v1.14.1';");
  });

  it('includes mandatory precache shell assets', () => {
    const script = buildServiceWorkerScript('v1.14.1');
    expect(script).toContain("'/studio'");
    expect(script).toContain("'/manifest.webmanifest'");
    expect(script).toContain("'/offline.html'");
    expect(script).toContain("'/theme.js'");
  });

  it('includes SKIP_WAITING message listener for seamless client activation', () => {
    const script = buildServiceWorkerScript('v1.14.1');
    expect(script).toContain("event.data.type === 'SKIP_WAITING'");
    expect(script).toContain('self.skipWaiting()');
  });

  it('includes cache cleanup on activate that purges obsolete pixibun-* buckets and claims clients', () => {
    const script = buildServiceWorkerScript('v1.14.1');
    expect(script).toContain("key.startsWith('pixibun-') && key !== CACHE_NAME");
    expect(script).toContain('caches.delete(key)');
    expect(script).toContain('self.clients.claim()');
  });

  it('bounds dynamic cache entries to prevent unbounded storage growth', () => {
    const script = buildServiceWorkerScript('v1.14.1');
    expect(script).toContain('const MAX_DYNAMIC_CACHE_ENTRIES = 50;');
    expect(script).toContain('async function trimCache(cache, maxEntries)');
  });

  it('serves GET route with status 200 and JavaScript body', async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain('CACHE_NAME');
  });
});
