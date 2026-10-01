# Implementation Plan — PixiBun Professionalization: Offline Truth, WCAG 2.2, Test Gates & Privacy-First Observability

## Overview

Make PixiBun a genuinely professional web application across four pillars, chosen by the owner: **(1) PWA/offline install** — the README has claimed "100% offline-capable" since day one, but there is no `public/` directory, no manifest, no service worker; today the app is a lie on a plane. **(2) WCAG 2.2 AA accessibility** — the app has good a11y instincts (amber focus rings, `aria-label`s, `useReducedMotion`) but zero enforcement, no error boundaries (`error.tsx` absent), and the canvas-centric UI has dragging-only interactions. **(3) Test & performance gates** — 61 node-only Vitest tests never touch a React component or a browser; no E2E, no performance budgets; Lighthouse CI closes this. **(4) Privacy-first observability** — the "zero telemetry" brand promise is honored by making diagnostics **local-only by default** (IndexedDB ring buffer + "Export diagnostics" button) with a strictly **opt-in** relay, implemented with a ~100-line hand-rolled reporter instead of the Sentry SDK, honoring SKILL.md's zero-bloat rule.

Research grounding: W3C WCAG 2.2 (new AA criteria: 2.4.11 Focus Not Obscured, 2.5.7 Dragging Movements, 2.5.8 Target Size, 3.2.6 Consistent Help), web.dev Learn PWA (manifest + service worker lifecycle, update flows, storage persistence), Lighthouse CI assertions/budgets, Playwright best practices (test user-visible behavior, isolation, CI on Linux, Chromium-only install).

Everything fits the existing architecture: no new runtime deps except `web-vitals` (~1KB); the service worker is hand-rolled (app is small, Workbox is bloat); CSP stays `'self'`-only because the opt-in relay is self-hosted or same-origin; the cozy aesthetic and copy rules are untouched.

## Types

New file `src/types/diagnostics.ts`:

```ts
export type DiagnosticKind = 'error' | 'web-vital' | 'unhandled-rejection';

export interface DiagnosticEntry {
  id: string;                    // from createId('diag')
  kind: DiagnosticKind;
  timestamp: number;
  message: string;               // error.message or vital name
  detail?: string;               // stack (truncated to 2KB) or vital metric JSON
  route: string;                 // pathname at capture time
  appVersion: string;            // from package.json / next build id
}

export interface DiagnosticsSettings {
  enabled: boolean;              // local capture; default TRUE (local-only is not telemetry)
  relayOptIn: boolean;           // default FALSE — sending anything off-device requires this
  relayEndpoint?: string;        // user/self-hosted GlitchTip-compatible URL
}

export type PwaUpdateState = 'idle' | 'downloading' | 'ready';
```

No changes to `src/types/canvas.ts`, `tools.ts`, or the store shape. Diagnostics settings live in `localStorage` (`pixibun-diagnostics`), deliberately outside Zustand so it survives store resets.

## Files

New files:

| Path | Purpose |
|---|---|
| `public/manifest.webmanifest` | Installable PWA: `name: "PixiBun Atelier"`, `short_name: "PixiBun"`, `start_url: "/studio"`, `display: "standalone"`, `theme_color: "#140C1E"`, `background_color: "#140C1E"`, icons 192/512 + maskable (PNG renders of Bun), `description` in craftsperson voice. |
| `public/icons/*.png` | 192, 512, maskable-512, apple-touch-180 — hand-exported from `src/app/icon.svg` (document the export command in LOGS). |
| `public/sw.js` | Hand-rolled service worker: **precache** app shell (land on `install`, versioned cache name `pixibun-v{n}`); **stale-while-revalidate** for `/_next/static/*` and fonts; **network-only** for `/api/*` (never cache AI route) and non-GET; **offline fallback** to cached `/studio` shell; `skipWaiting` + `clients.claim` on explicit postMessage so update UX is deterministic. |
| `public/offline.html` | Static fallback served when navigation fails and no shell cached — warm copy, no JS. |
| `src/components/system/ServiceWorkerRegistrar.tsx` | Client component in root layout: registers `/sw.js`, listens for `waiting` worker, exposes update via `PwaUpdateToast`. |
| `src/components/system/PwaUpdateToast.tsx` | "A fresh build is ready — reload to pick it up" HUD chip; posts `SKIP_WAITING` to the worker; respects copy rules. |
| `src/components/system/OfflineIndicator.tsx` | `navigator.onLine` + `online`/`offline` listeners → small status chip near the viewport HUD; `useOnlineStatus` hook inside. |
| `src/components/system/DiagnosticsProvider.tsx` | Client provider: `error`/`unhandledrejection` listeners + `reportWebVitals` bridge; writes entries to Dexie table; never throws. |
| `src/app/error.tsx` | Route error boundary (client): warm failure copy, "Try again" reset, captures into diagnostics. |
| `src/app/global-error.tsx` | Root boundary fallback (renders own `<html>` when layout itself fails). |
| `src/app/studio/error.tsx` | Studio-specific boundary: warns autosave state is safe (IndexedDB), CTA to reload. |
| `src/lib/diagnostics/capture.ts` | `captureDiagnostic(entry)`, `getRecentDiagnostics(limit)`, `clearDiagnostics()`, `exportDiagnosticsFile()` — Dexie-backed ring buffer (max 200 entries, FIFO prune). |
| `src/lib/diagnostics/vitals.ts` | `initWebVitals()` — wraps `web-vitals` `onLCP/onINP/onCLS/onTTFB` into `captureDiagnostic` calls. |
| `tests/e2e/*.spec.ts` | Playwright specs (see Testing). |
| `playwright.config.ts` | Chromium-only, `webServer` running `next build && next start`, trace on retry, `contextOptions` with reduced-motion and emulated offline variants. |
| `lighthouserc.json` | Lighthouse CI config: 3 runs, assert categories (performance ≥ 0.85, accessibility = 1.0, best-practices ≥ 0.9, seo ≥ 0.9), `budgets` for script size. |

Modified files:

| Path | Change |
|---|---|
| `src/app/layout.tsx` | Add `manifest: "/manifest.webmanifest"`, `viewport` export (`themeColor` per scheme), `appleWebApp` metadata; mount `ServiceWorkerRegistrar`, `DiagnosticsProvider`. |
| `next.config.ts` | Headers for `/sw.js` (`Cache-Control: no-cache`, `Service-Worker-Allowed: /`) and `/offline.html`; production CSP: drop `'unsafe-eval'` (keep `'unsafe-inline'` for styles only — split `style-src`), keeping dev pragmatic via env check. |
| `src/components/layout/StudioLayout.tsx` | Mount `OfflineIndicator`; call `navigator.storage.persist()` once on first user gesture (storage-persistence guard against eviction — Dexie data is the user's artwork). |
| `src/components/ui/ModalWrapper.tsx` | Add focus trap hardening (Tab cycle, focus return to opener) — verified against WCAG 2.4.11/2.4.3. |
| `src/components/layout/CenterViewport.tsx` | WCAG 2.5.7 (Dragging Movements): keyboard alternatives for drag-only actions — arrow keys nudge floating selection (already exists), add pan via arrow keys when no selection, and single-click fallbacks where sensible; canvas gets `role="application"` + `aria-label` describing the drawing surface. |
| `src/components/layout/AtelierRail.tsx` | Persistent Help button (opens ShortcutsModal) satisfying WCAG 3.2.6 Consistent Help; add "Export diagnostics" entry into ShortcutsModal footer. |
| `src/components/modals/ShortcutsModal.tsx` | Add diagnostics disclosure: local capture status, relay opt-in toggle (off by default, honest copy about what is sent), Export/Clear buttons. |
| `src/app/globals.css` | Focus ring token unified (`--focus-ring`), min target sizes utility for icon buttons (≥24px hit area via padding, WCAG 2.5.8). |
| `eslint.config.mjs` | Add `eslint-plugin-jsx-a11y` recommended rules (errors) for `src/`. |
| `.github/workflows/ci.yml` | Add `e2e` job (Playwright, Chromium only, `--with-deps`) and `lighthouse` job (`lhci autorun` against `next build` output); keep existing gates. |

## Functions

New functions:

- `registerServiceWorker(): Promise<ServiceWorkerRegistration | null>` — `src/components/system/ServiceWorkerRegistrar.tsx`; null-safe when `!('serviceWorker' in navigator)` or on `file:`.
- `requestPersistentStorage(): Promise<boolean>` — wraps `navigator.storage.persist()`; fire-once guard.
- `useOnlineStatus(): boolean` — `src/components/system/OfflineIndicator.tsx`.
- `captureDiagnostic(entry: Omit<DiagnosticEntry, 'id' | 'timestamp' | 'route' | 'appVersion'>): void` — `src/lib/diagnostics/capture.ts`; swallows all storage errors (diagnostics must never break the app).
- `initWebVitals(): void` — `src/lib/diagnostics/vitals.ts`.
- `exportDiagnosticsFile(): Promise<void>` — serializes entries to a `.json` Blob download.
- `relayDiagnostics(endpoint: string, entries: DiagnosticEntry[]): Promise<boolean>` — minimal `fetch` POST (Sentry-envelope-compatible), only invoked after `relayOptIn === true`.

Modified functions:

- `applyThemeToDOM` / theme boot in `themeStore.ts` — coordinate `themeColor` meta updates with the new viewport metadata (minor).
- `postMessage` handling in Service Worker (served dynamically via `src/app/sw.js/route.ts`) (`SKIP_WAITING`, `CACHE_VERSION` bump message).

Removed: none.

## Classes

None. The codebase is function-oriented and stays that way; Next.js error boundaries are function components (`error.tsx` exports a default client component receiving `{ error, reset }`).

## Dependencies

| Package | Kind | Why |
|---|---|---|
| `web-vitals` (^5) | runtime | The only runtime addition; ~1KB, official Lighthouse-compatible vitals. |
| `@playwright/test` | dev | E2E + axe + offline emulation. |
| `@axe-core/playwright` | dev | Automated WCAG scanning inside E2E. |
| `happy-dom` | dev | Component-test environment for Vitest (ModalWrapper/TactileButton/themeStore). |
| `eslint-plugin-jsx-a11y` | dev | Static a11y enforcement in lint gate. |
| `@lhci/cli` | CI-only | Installed via `npx` in the workflow; never in `package.json`. |

Deliberately **not** added: Workbox (hand-rolled SW — the shell is ~10 assets; SKILL.md forbids deps when a clean solution exists), Sentry SDK (hand-rolled ~100-line reporter to a self-hosted GlitchTip-compatible endpoint — zero third-party script, CSP untouched, honors the privacy promise).

## Testing

1. **Component tests** (`tests/components/*.test.tsx`, Vitest + happy-dom): ModalWrapper focus trap/Escape/focus-return; ThemeToggle persists and applies `data-theme`; TactileButton focus-visible ring; diagnostics capture FIFO pruning and corrupted-payload tolerance.
2. **E2E (Playwright, Chromium):**
   - `landing.spec.ts` — hero renders, DoodlePad paints, no console errors, axe scan clean (zero violations, WCAG 2.2 tags).
   - `studio.spec.ts` — draw a stroke, Ctrl+Z/Ctrl+Y round-trip, zoom bounds, keyboard shortcuts modal via `?`, locked-layer toast via `aria-live`.
   - `offline.spec.ts` — load `/studio`, `context.setOffline(true)`, reload → shell + workspace hydrate from IndexedDB; OfflineIndicator visible.
   - `pwa.spec.ts` — manifest fetchable, valid; SW registered and controlling; `/api/ai/vision` bypasses cache (asserted via request interception).
3. **Lighthouse CI:** 3-run median against production build; a11y score must equal 100; performance ≥ 85; budgets: total script ≤ 300KB (current app is well under).
4. **Existing suite:** all 61 tests remain green; new lib tests for `capture.ts` pruning.

## Implementation Order

**Phase A — Error boundaries & diagnostics foundation (P0, ship first)**
1. `src/types/diagnostics.ts`, Dexie schema v2 (`diagnostics` table — additive, no migration risk), `capture.ts` + vitals + tests.
2. `error.tsx`, `global-error.tsx`, `studio/error.tsx`; `DiagnosticsProvider` in root layout.
3. Diagnostics UI in ShortcutsModal (local by default; relay opt-in never default-on).

**Phase B — Accessibility (WCAG 2.2 AA)**
4. `eslint-plugin-jsx-a11y` wired; fix everything it flags.
5. Target-size sweep (2.5.8), keyboard pan/nudge alternatives (2.5.7), Help surface (3.2.6), ModalWrapper focus hardening, reduced-motion audit for `PixelVines`/`PixelDitherCurtain`/`CozyParticles`.
6. `globals.css` focus-ring token; component tests green.

**Phase C — PWA / offline truth**
7. `public/` manifest + icons + `offline.html`; layout metadata; `next.config.ts` SW headers.
8. `sw.js` (precache/SWR/network-only rules) + registrar + update toast + offline indicator; `storage.persist()` on first gesture.
9. E2E `offline.spec.ts` + `pwa.spec.ts` green; README "offline-capable" claim becomes true — update LOGS/TASKS.

**Phase D — Quality gates**
10. `playwright.config.ts` + three E2E specs; `lighthouserc.json`.
11. CI workflow: add `e2e` and `lighthouse` jobs; require both green before merge is considered done.

**Phase E — Close-out**
12. Production build + full manual sweep (install on desktop/Android, airplane-mode reload, keyboard-only pass, screen-reader smoke via NVDA), adversarial self-review per FullStackGuide Gate 5, `TASKS.md` Phase 21 entry, conventional commits per phase.

Every phase exits with `typecheck`, `lint`, `test`, and `next build` green — now also enforced by the existing CI on `main`.

<!-- session-publication-2026-10-01 -->
## Session checkpoint — 2026-10-01

This document retains its dated findings and verification scope. The latest studio follow-up keeps File, drawing controls, adjacent Mirror/Zoom/Fit/View, Studio and Export on one desktop header row. The live bulb offers Off/Soft/Crisp glints with a brighter pixel core and stepped edge, preserves outlines and alpha, and supports Cancel, Apply and exact Undo/Redo. See the [UI/UX record](../research/session-ui-ux-2026-10-01.md) and [glint research, screenshots and evidence](../research/specular-glint-2026-10-01.md).

The latest full gate passed documentation, types, lint, **1,482 unit/integration tests across 144 suites**, and the production build. Three focused Chromium glint scenarios passed; the current discovered editor inventory is **149 tests in 33 files**, plus 39 separate compiled-production scenarios. Earlier full-run results retain their dates and scope. The user requested Git publication of this checkpoint; it does not authorize deployment or replace the existing release sign-off. [Delivered work and open validation](../research/session-completion-2026-10-01.md).
<!-- /session-publication-2026-10-01 -->
