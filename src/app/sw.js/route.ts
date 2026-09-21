/**
 * Service Worker route handler (src/app/sw.js/route.ts).
 *
 * Phase 32 — Cache versioning fidelity fix: CACHE_NAME was previously the
 * static string 'pixibun-v1' in public/sw.js, so new deploys kept reusing the
 * same precache bucket. The cache version is now build-time-injected via
 * `env.SW_CACHE_VERSION` in next.config.ts (inlined into this bundle by the
 * Next.js compiler) and bumped per release: a deploy that changes the version
 * produces a byte-different /sw.js, which triggers a service worker update,
 * and `activate` deletes every cache bucket that is not the current version.
 *
 * Response headers (no-cache + Service-Worker-Allowed + Content-Type) are
 * supplied by the '/sw.js' entry in next.config.ts `headers()` — this handler
 * deliberately sets none of them to avoid duplicated headers.
 *
 * SKIP_WAITING flow is unchanged (see the message listener below).
 */

export function buildServiceWorkerScript(version: string = process.env.SW_CACHE_VERSION ?? 'v1'): string {
  return `const CACHE_NAME = 'pixibun-${version}';
const PRECACHE_ASSETS = [
  '/',
  '/studio',
  '/manifest.webmanifest',
  '/offline.html',
  '/theme.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/maskable-512.png',
  '/icons/apple-touch-icon.png',
];
const MAX_DYNAMIC_CACHE_ENTRIES = 50;

async function trimCache(cacheName, maxEntries) {
  try {
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();
    // Exclude core precached assets so essential offline shell is never evicted
    const evictable = requests.filter((req) => {
      try {
        const pathname = new URL(req.url).pathname;
        return !PRECACHE_ASSETS.includes(pathname);
      } catch {
        return true;
      }
    });
    if (evictable.length > maxEntries) {
      const deleteCount = evictable.length - maxEntries;
      const toDelete = evictable.slice(0, deleteCount);
      await Promise.all(toDelete.map((req) => cache.delete(req)));
    }
  } catch (err) {
    // Ignore cache eviction failures gracefully
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('pixibun-') && key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Never intercept or cache non-GET requests or AI/API endpoints
  if (request.method !== 'GET' || url.pathname.startsWith('/api/')) {
    return;
  }

  // 2. Navigation requests: Network-first with cache fallback, then offline.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 200) {
            const copy = response.clone();
            event.waitUntil(
              caches.open(CACHE_NAME).then(async (cache) => {
                await cache.put(request, copy);
                await trimCache(CACHE_NAME, MAX_DYNAMIC_CACHE_ENTRIES);
              })
            );
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const studioCached = await caches.match('/studio');
          if (studioCached) return studioCached;
          const offlinePage = await caches.match('/offline.html');
          if (offlinePage) return offlinePage;
          return new Response('Offline and no cached shell available.', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain' },
          });
        })
    );
    return;
  }

  // 3. Next.js static bundles, fonts, theme and images: Stale-While-Revalidate
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/assets/') ||
    url.pathname === '/theme.js'
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(request);
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse.status === 200) {
              const copy = networkResponse.clone();
              event.waitUntil(
                caches.open(CACHE_NAME).then(async (c) => {
                  await c.put(request, copy);
                  await trimCache(CACHE_NAME, MAX_DYNAMIC_CACHE_ENTRIES);
                })
              );
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // 4. Default: Cache-first with network fallback and bounded dynamic storage (touch-on-hit LRU)
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        // Touch on hit to promote entry to the newest position in CacheStorage (true LRU)
        event.waitUntil(
          caches.open(CACHE_NAME).then((cache) => cache.put(request, cached.clone()))
        );
        return cached;
      }
      return fetch(request).then((response) => {
        if (response.status === 200 && response.type === 'basic') {
          const copy = response.clone();
          event.waitUntil(
            caches.open(CACHE_NAME).then(async (cache) => {
              await cache.put(request, copy);
              await trimCache(CACHE_NAME, MAX_DYNAMIC_CACHE_ENTRIES);
            })
          );
        }
        return response;
      });
    })
  );
});
`;
}

export async function GET() {
  // Content-Type / Cache-Control / Service-Worker-Allowed are appended by the
  // '/sw.js' headers entry in next.config.ts — do not duplicate them here.
  const script = buildServiceWorkerScript();
  return new Response(script, { status: 200 });
}