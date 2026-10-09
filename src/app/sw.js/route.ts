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
 * Set the service-worker headers on this Response. The production host can
 * override next.config.ts headers with its default text/plain type for a
 * dynamic route, which causes browsers to reject registration.
 *
 * Updates wait for open windows to close; an update must not interrupt artwork.
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
const PRECACHE_MANIFEST = '/__pixibun_precache__';
const MAX_SHELL_DEPENDENCIES = 128;
let warmQueue = Promise.resolve();
const CACHE_ACCESS_TIMEOUT_MS = 250;

// Optional storage cannot hold an online response or an event lifetime forever.
// Call the operation immediately: never reopen a retired bucket after a timeout.
function optionalCacheAccess(operation) {
  return new Promise((resolve) => {
    let finished = false;
    const finish = (value) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      resolve(value);
    };
    const timer = setTimeout(() => finish(null), CACHE_ACCESS_TIMEOUT_MS);
    try { Promise.resolve(operation()).then(finish, () => finish(null)); }
    catch { finish(null); }
  });
}

function openOwnedCache() {
  return optionalCacheAccess(() => caches.open(CACHE_NAME));
}

function readOwnedCache(cache, request) {
  return cache ? optionalCacheAccess(() => cache.match(request)) : Promise.resolve(null);
}

function storeResponse(cache, request, response) {
  if (!cache) return Promise.resolve();
  return optionalCacheAccess(async () => {
    await cache.put(request, response);
    await trimCache(cache, MAX_DYNAMIC_CACHE_ENTRIES);
  });
}

async function trimCache(cache, maxEntries) {
  try {
    const requests = await cache.keys();
    const manifest = await cache.match(PRECACHE_MANIFEST);
    const shellDependencies = manifest ? await manifest.json() : [];
    // Exclude core precached assets so essential offline shell is never evicted
    const evictable = requests.filter((req) => {
      try {
        const pathname = new URL(req.url).pathname;
        return pathname !== PRECACHE_MANIFEST && !PRECACHE_ASSETS.includes(pathname) && !shellDependencies.some(path => new URL(path, self.location.origin).pathname === pathname);
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

async function precacheShell() {
  const cache = await caches.open(CACHE_NAME);
  await cache.addAll(PRECACHE_ASSETS);
  const dependencies = new Set();
  for (const path of ['/', '/studio']) {
    const shell = await cache.match(path);
    const html = await shell.text();
    for (const match of html.matchAll(/(?:src|href)=["']([^"']+)["']/g)) {
      const url = new URL(match[1], self.location.origin);
      if (url.origin === self.location.origin && url.pathname.startsWith('/_next/static/')) dependencies.add(url.pathname + url.search);
    }
  }
  if (dependencies.size > MAX_SHELL_DEPENDENCIES) throw new Error('Offline shell dependency limit exceeded.');
  await cache.addAll([...dependencies]);
  await cache.put(PRECACHE_MANIFEST, new Response(JSON.stringify([...dependencies]), { headers: { 'Content-Type': 'application/json' } }));
}

self.addEventListener('install', (event) => {
  event.waitUntil(precacheShell());
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
  if (event.data?.type === 'CACHE_ASSETS' && Array.isArray(event.data.urls)) {
    // Capture ownership at event arrival, before queued work can outlive activation.
    const ownedCache = openOwnedCache();
    warmQueue = warmQueue.catch(() => {}).then(() => optionalCacheAccess(async () => {
      const cache = await ownedCache;
      if (!cache) return;
      const manifest = await cache.match(PRECACHE_MANIFEST);
      const paths = new Set(manifest ? await manifest.json() : []);
      const incoming = [];
      for (const value of event.data.urls.slice(0, MAX_SHELL_DEPENDENCIES)) {
        if (typeof value !== 'string') continue;
        let url;
        try { url = new URL(value, self.location.origin); } catch { continue; }
        const path = url.pathname + url.search;
        if (url.origin === self.location.origin && url.pathname.startsWith('/_next/static/') && !paths.has(path)) {
          if (paths.size >= MAX_SHELL_DEPENDENCIES) break;
          paths.add(path); incoming.push(path);
        }
      }
      // Protect these paths before competing dynamic cache writes can trim them.
      await cache.put(PRECACHE_MANIFEST, new Response(JSON.stringify([...paths]), { headers: { 'Content-Type': 'application/json' } }));
      await cache.addAll(incoming);
    }));
    event.waitUntil(warmQueue.catch(() => {}));
  }
  if (event.data && event.data.type === 'SKIP_WAITING') {
    event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // No forced takeover while any window can be editing or loading old chunks.
      if (clients.length === 0) return self.skipWaiting();
      event.source?.postMessage({ type: 'UPDATE_DEFERRED' });
    }));
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
    // Capture this cache's ownership now, but storage is optional for navigation.
    // Never reopen its name after a newer worker may have retired the bucket.
    const ownedCache = openOwnedCache();
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 200) {
            const copy = response.clone();
            event.waitUntil(
              (async () => {
                const cache = await ownedCache;
                await storeResponse(cache, request, copy);
              })().catch(() => {})
            );
          }
          return response;
        })
        .catch(async () => {
          for (const fallback of [request, '/studio', '/offline.html']) {
            try {
              const cached = await optionalCacheAccess(() => caches.match(fallback));
              if (cached) return cached;
            } catch {
              // Unavailable storage must still yield a controlled offline response.
            }
          }
          return new Response('Offline and no cached shell available.', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain' },
          });
        })
    );
    return;
  }

  // 3. Static resources: immediate network, bounded cache fallback and refresh.
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/assets/') ||
    url.pathname === '/theme.js'
  ) {
    const ownedCache = openOwnedCache();
    const cachedResponse = ownedCache.then(cache => readOwnedCache(cache, request));
    // Fetch immediately, even if cache opening or reading never settles.
    const fetchPromise = fetch(request)
      .then(async (networkResponse) => {
        if (networkResponse.status === 200) {
          const copy = networkResponse.clone();
          event.waitUntil(ownedCache.then(cache => storeResponse(cache, request, copy)));
        }
        return networkResponse.status === 200 ? networkResponse : (await cachedResponse) || networkResponse;
      })
      .catch(async () => (await cachedResponse) || Response.error());
    // Keep refresh/write registration legal after a fast cached response.
    event.waitUntil(fetchPromise.then(() => {}));
    event.respondWith(
      Promise.race([cachedResponse.then(cached => cached || fetchPromise), fetchPromise]).then((response) => {
        // A cached response's URL lacks the constructor fragment. Worker bootstraps
        // use that fragment for configuration; a synthetic response retains the
        // original worker request URL rather than replacing it with response.url.
        if ((request.destination === 'worker' || request.destination === 'sharedworker') && response.status === 200) {
          return new Response(response.body, { status: response.status, statusText: response.statusText, headers: response.headers });
        }
        return response;
      })
    );
    return;
  }

  // 4. Default: Cache-first with network fallback and bounded dynamic storage (touch-on-hit LRU)
  const ownedCache = openOwnedCache();
  event.respondWith(
    (async () => {
      const cache = await ownedCache;
      const cached = await readOwnedCache(cache, request);
      if (cached) {
        // Touch on hit to promote entry to the newest position in CacheStorage (true LRU)
        event.waitUntil(
          optionalCacheAccess(() => cache.put(request, cached.clone()))
        );
        return cached;
      }
      try {
        const response = await fetch(request);
        if (response.status === 200 && response.type === 'basic') {
          event.waitUntil(storeResponse(cache, request, response.clone()));
        }
        return response;
      } catch {
        // A missing resource is an explicit fetch error, never an HTML substitute.
        return Response.error();
      }
    })()
  );
});
`;
}

export async function GET() {
  const script = buildServiceWorkerScript();
  return new Response(script, {
    status: 200,
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Service-Worker-Allowed': '/',
    },
  });
}
