import { test, expect } from '@playwright/test';

test.describe('PWA Manifest & Service Worker Assets', () => {
  test('serves valid web application manifest', async ({ request }) => {
    const res = await request.get('/manifest.webmanifest');
    expect(res.status()).toBe(200);

    const json = await res.json();
    expect(json.name).toBe('PixiBun Atelier');
    expect(json.short_name).toBe('PixiBun');
    expect(json.display).toBe('standalone');
    expect(json.start_url).toBe('/studio');
    expect(json.icons.length).toBeGreaterThanOrEqual(3);
  });

  test('serves service worker script with appropriate headers', async ({ request }) => {
    const res = await request.get('/sw.js');
    expect(res.status()).toBe(200);
    expect(res.headers()['service-worker-allowed']).toBe('/');
    const text = await res.text();
    expect(text).toContain('CACHE_NAME');
  });

  test('serves offline static fallback page', async ({ request }) => {
    const res = await request.get('/offline.html');
    expect(res.status()).toBe(200);
    const text = await res.text();
    expect(text).toContain("You're Away from the Network");
  });
});
