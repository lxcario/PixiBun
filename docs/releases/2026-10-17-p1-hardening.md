# P1 hardening: service worker, update checks, relay, headers and toggles — 17 October 2026

Branch `testsprite-s4`, continuing the uncommitted [P0 hardening](2026-10-16-p0-hardening.md) work on `c4b2a924`. This record covers the runtime items from the 16 October audit, plus two product defects that the P0 browser runs exposed. Main and production were still at `1a4b96b7`.

## Service worker (`src/app/sw.js/route.ts`)

- **Slow connections.** A page load waited on `fetch()` with no limit, so a connection that was up but not answering held the Studio open on a blank page. After 4 s, the worker now answers with this exact page if it is cached and still lets the network refresh it. If the page is not cached, the network is awaited as before. A failed network still falls back to the page, `/studio`, then `/offline.html`.
- **Next.js flight data.** Client-navigation data (`?_rsc=` or the `RSC: 1` header) fell through to the cache-first branch, so one build's router data could be replayed to another. It is no longer intercepted or cached; offline, the router falls back to a full page load, which the cached shell answers.
- **Retired buckets.** Older builds' caches were deleted only when at most one window was open at activation, and otherwise stayed until a later activation. On page loads, the active worker now removes them once at most one window remains. It does so only while it is the registration's active worker and no newer worker is waiting or installing; the existing route tests caught a first version in which an older worker could delete the newer build's bucket.
- **Trimming.** `trimCache` builds its protected-path set once per trim instead of parsing every shell path for every cached request.

**Retained failed attempt.** The audit also proposed answering only content-hashed `/_next/static/` files from other builds' buckets. With that limit, `operation.spec.ts` "a real waiting update preserves both open tabs…" failed intermittently in Chromium: the new worker sometimes never activated after both tabs closed. A bisection against the original worker (8 of 8 passed in 1.2 min) and the other changes isolated the limit: with it, 6 of 8 and then 4 of 8 passed; without it, 8 of 8 passed. The limit was removed. The stale-data risk it targeted is mainly addressed by no longer caching flight data; unhashed files (`/theme.js`, icons, assets) can still come from an older bucket offline.

`tests/serviceWorkerHardening.test.ts` adds 12 cases run against the emitted script. Four failed against the original worker (slow-network fallback, both flight-data cases and the sweep); the rest guard against over-eager sweeping. The existing source-text check in `tests/serviceWorkerRoute.test.ts` now names the set-based protection.

## Update checks for long-lived pages

Browsers look for a new worker on navigation, which a Studio left open for days may never do. `ServiceWorkerRegistrar` now calls `registration.update()` hourly, and when the page becomes visible again after at least 10 minutes. Both are skipped while offline and stop on unmount; a failed check waits for the next one. This does not apply updates: the existing save-then-restart banner still decides that.

## First-visit update banner in WebKit

On a first visit in WebKit the "A fresh PixiBun build is ready" banner appeared even though no update existed. In the P0 runs it covered "+ Frame" and failed the WebKit GIF and MP4 export cases. Instrumenting the registration showed why. Chromium delivers the first worker's `installed` event while the page is still uncontrolled. WebKit delivers it after that same worker has activated and claimed the page, so "installed while a controller exists" read as an update. An update now requires the controller to be a *different* worker. A unit case reproduces the WebKit order and fails without the fix; in the production build, the banner count on a first visit was 0 in Chromium, Firefox and WebKit.

## Diagnostics relay (`src/app/api/diagnostics/relay/route.ts`)

- An `Origin` header is now required and must match the request origin (403 otherwise). It was optional, so any non-browser script could spend the upstream quota. Browsers send Origin with every POST, including PixiBun's own same-origin `fetch`.
- The body must be `application/json` (415 otherwise). Both checks run before the rate limit, so refused requests spend no tokens.
- The rate-limit key is `X-Real-IP`, else the last `X-Forwarded-For` entry. The first entry, used before, is whatever the client sent; a test now shows that rotating it no longer mints extra requests.

These are browser-origin checks, not authentication: a non-browser client can still forge both headers. The [security boundaries](../contracts/security-boundaries.md) contract is updated. Existing relay tests that modelled requests without Origin or content type now send the headers a browser sends; their assertions are unchanged.

## Page policy and headers

The CSP adds `form-action 'self'`. All responses add `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Resource-Policy: same-origin`. PixiBun opens no popups that need an opener, and loads none of its responses from other sites. `upgrade-insecure-requests` was not added: it would rewrite requests on the local `http://localhost` production server used by the browser suites, and HSTS already covers the deployed site. `tests/securityHeaders.test.ts` covers the policy and headers.

## Recent colors from storage

`loadRecentColors` accepted any strings from `localStorage`. It now keeps at most eight distinct `#RRGGBB` colors, normalized to upper case, matching what the Studio writes.

## Toggle rows

Inspector toggles (`ToggleRow` in `src/components/layout/inspector/InspectorKit.tsx`) drew a switch and kept the real checkbox as a 1 px `sr-only` input underneath the label text. Pointer users toggled through the label, but anything that clicks the control itself was intercepted: Playwright's `check()`/`uncheck()`, and black-box agents such as TestSprite. The checkbox now lies, invisible, exactly over the drawn 30 × 18 switch, above it in stacking order and before it in the DOM, so the `peer` checked and focus styles still apply. Measured in Chromium: the input's box equals the switch's; `uncheck()`, `check()`, a label click and Space all toggle; and the switch shows its focus ring. The `artistWorkspace` radial-gradient spec passes with its original `uncheck()` lines.

## Verification

Run on Windows with Node **26.5.1** (not the pinned 22.23.3, so the gate's performance stage was not run) against production builds of the working tree.

- Type check and lint passed. Vitest: **2,663 passed / 254 files**.
- **Production, three engines** (`artistWorkspace`, `brushGuideExportIntegrity`, `animatedExportIntegrity`, `stableStudioGeometry`, `workspaceConsistency`, `offlinePanels`, `operation`, `welcomeJourney`): **90 passed / 6 failed** in 22.2 minutes, zero retries. All P0 failures caused by the toggle rows, the WebKit banner and the stale locators now pass. The six failures:
  - `offlinePanels` ×3. Commit `411d2b8e` (the light bar, made in a parallel session) landed while the build ran. The worker was compiled as `c4b2a924`, but the precache list was written afterwards as `411d2b8e`, and the worker correctly ignores a list from another build. After a rebuild with matching versions, all six `offlinePanels` cases passed in Chromium, Firefox and WebKit.
  - `operation` "a real waiting update…" ×2, Chromium, while a documentation inventory job ran concurrently. On the same build with nothing else running, both variants passed **18 of 18** across the three engines (three repeats each).
  - `animatedExportIntegrity` MP4, Firefox: the open capability mismatch recorded in the [P0 record](2026-10-16-p0-hardening.md#verification).
- WebKit first visit: update banner count 0 in all three engines (instrumented run).
- **Development, Chromium** (`backupTrust`, `exportBoundaries`, `studioChrome`, `studioSurfaces`, `artistWorkspace`, `dynamicIsland`): **33 passed / 1 failed**. The failure is `dynamicIsland.spec.ts` "hover shortcut splits to the right…": the quick shortcut moved 0.31–0.49 px vertically while held, against a 0.25 px limit. It failed 2 of 4 repeats on this tree, and 5 of 6 with this batch's 24 px top-bar rule reverted, so that rule is not the cause. It passed earlier on 16 October on this branch. It remains open; the parallel light-bar commit, which changes the Studio layout and Liquid sliders, was not reverted to test it.

Not run: the six-stage gate on Node 22, the complete development and production suites, actual Safari and devices, and a deployed host. The 4 s navigation fallback and hourly update checks are covered by unit tests against the emitted worker, not by a throttled-network browser run.
