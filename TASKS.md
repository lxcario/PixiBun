# Build Plan — PixiBun

## Phase 23 — Truth-in-Testing, Single CI Truth & Engine Extraction
**Goal:** Make PixiBun's quality claims honest, maintainable, and robust across four core pillars: (1) Assertion-backed E2E testing with pixel-level validation for undo/redo, authentic disconnected page reload for offline hydration, and active service worker controller verification; (2) Unified CI/CD workflow with `deploy.yml` triggered via `workflow_run` on `main`, private artifact storage for Lighthouse CI reports (`lhci-reports/`), and removal of redundant/dead headers from `vercel.json`; (3) Pure, DOM-free `HistoryEngine` extraction (`src/lib/engine/historyEngine.ts`) with fixed 50-step depth and dedicated unit test suite; (4) Clean repo hygiene and architectural doc truthfulness.

**Deliverables:**
- [x] Pure History Engine (`src/lib/engine/historyEngine.ts`): Extracted 50-step undo/redo stack out of `CenterViewport.tsx` refs into a DOM-free, pure TypeScript module with FIFO pruning, redo-tail invalidation, and O(1) state restoration.
- [x] Unit Test Suite (`tests/historyEngine.test.ts`): 8 unit tests verifying push, undo, redo, clear, maxDepth pruning (50), redo invalidation, and empty-stack edge cases.
- [x] Monolith Slimming (`src/components/layout/CenterViewport.tsx`): Replaced ad-hoc undo/redo stack refs with `historyEngineRef` and added `data-testid="main-composite-canvas"` for deterministic testing.
- [x] Assertion-Backed E2E Tests: Hardened `tests/e2e/studio.spec.ts` with pixel-level canvas assertions before/after stroke and undo/redo; hardened `tests/e2e/offline.spec.ts` with real disconnected page reload and SW cache hydration; updated `tests/e2e/pwa.spec.ts` with active `navigator.serviceWorker.controller` verification.
- [x] Private Lighthouse CI: Updated `lighthouserc.json` to upload to local filesystem (`./lhci-reports`), added `lhci-reports/` to `.gitignore`, and added 7-day artifact upload to `.github/workflows/ci.yml`.
- [x] Single CI Truth: Removed duplicate `verify` job from `.github/workflows/deploy.yml` in favor of `workflow_run` trigger on successful `CI` completion on `main`.
- [x] Header Deduplication & Dead Rule Pruning: Removed redundant security headers and dead `/static/(.*)` cache rule from `vercel.json` (`next.config.ts` remains canonical header source).
- [x] Repo Hygiene: Relocated `implementation_plan.md` and `implementation_plan_v2.md` to `docs/plans/` with `docs/plans/README.md`, deleted empty `CLAUDE.md`, and updated `eslint.config.mjs` ignores.
- [x] Architectural Documentation Truthfulness: Synchronized `ARCHITECTURE.md`, `PIXIBUN_DEEP_DIVE.md`, and `README.md` to reflect `HistoryEngine` architecture and updated test metrics (85 unit/component tests, 10 E2E specs).

**Acceptance criteria:**
- `npm run lint` → 0 errors, 0 warnings.
- `npm run typecheck` → 0 errors.
- `npm test` → 85/85 tests pass across 16 test suites (CI / Node 20).
- `npm run test:e2e` → 10/10 Playwright E2E specs pass.
- `npm run build` → Next.js 16 production build compiles cleanly.
- CI green on `main` (Node 20).

**Status:** Complete (2026-08-30)

---

## Phase 22 — Dead Route Pruning & Architectural Truthfulness
**Goal:** Eliminate dead serverless routes and orphaned backend scripts (`/api/ai/vision`, `testsprite-backend/`, `scripts/write_backend_tests.js`) and synchronize all architectural documentation to honestly reflect PixiBun's 100% deterministic, on-device graphics math identity with zero cloud or API key dependencies.

**Deliverables:**
- [x] Deleted dead route: Removed `src/app/api/ai/vision/route.ts` and orphaned folder `src/app/api/ai/`.
- [x] Deleted dead tests: Removed Python backend suite `testsprite-backend/` (7 tests) and test generator `scripts/write_backend_tests.js`.
- [x] Doc Truthfulness: Updated `MAIN.md`, `SKILL.md`, `README.md`, `TASKS.md`, `LOGS.md`, and `studioStore.ts` removing false Gemini cloud claims and documenting PixiBud's pure on-device graphics math engine.
- [x] Attack Surface Minimization: App contains only one server endpoint (`/api/diagnostics/relay`), fully hardened with SSRF protection.

**Acceptance criteria:**
- `npm run lint` → 0 errors, 0 warnings.
- `npm run typecheck` → 0 errors.
- `npm test` → 77/77 tests pass across 15 test suites.
- `npm run test:e2e` → 9/9 Playwright E2E specs pass.
- `npm run build` → Next.js 16 production build compiles cleanly (no `/api/ai/vision` route).

**Status:** Complete (2026-08-30)

---

## Phase 21 — PixiBun Professionalization: Offline Truth, WCAG 2.2, Test Gates & Privacy-First Observability
**Goal:** Make PixiBun a professional, reliable, and accessible local-first web application across four core pillars: (1) True PWA offline installation with hand-rolled zero-dependency service worker, manifest, precached app shell, offline fallback, and persistent storage protection; (2) Full WCAG 2.2 AA accessibility with keyboard alternatives for drag interactions, focus traps with opener restoration, high-contrast focus rings, minimum target sizes, and error boundaries; (3) Continuous automated quality & performance gates with 73 Happy-DOM unit/component tests, full Playwright E2E browser tests with automated Axe WCAG audits, and Lighthouse CI score budgets; (4) Privacy-first local diagnostics with IndexedDB ring buffer, Core Web Vitals bridge, and one-click JSON export.

**Deliverables:**
- [x] PWA Manifest & Icons: `public/manifest.webmanifest` and pixel-crisp PNG icons (192, 512, maskable, 180 apple touch) in `public/icons/`.
- [x] Hand-Rolled Service Worker (`public/sw.js`): Precached app shell, Stale-While-Revalidate caching for static chunks and assets, network-only for `/api/*`, navigation fallback, and `SKIP_WAITING` support.
- [x] Offline Fallback Page (`public/offline.html`): Self-contained, warm atelier styled static fallback page.
- [x] Service Worker Registrar & Update Toast (`src/components/system/ServiceWorkerRegistrar.tsx`, `PwaUpdateToast.tsx`): Update notification banner with instant reload action.
- [x] Offline Indicator & Storage Persistence (`OfflineIndicator.tsx`, `StudioLayout.tsx`): HUD status pill when offline and `navigator.storage.persist()` guard against eviction.
- [x] WCAG 2.2 AA Conformance & JSX-A11y: Resolved all static a11y violations, added `eslint-plugin-jsx-a11y`, hardened `ModalWrapper.tsx` focus traps and Escape handling.
- [x] Drag Alternatives & Live Region Feedback: Arrow key canvas panning and floating selection nudging (WCAG 2.5.7) and `aria-live="polite"` locked layer feedback.
- [x] Route & Global Error Boundaries: Atelier styled error boundaries in `src/app/error.tsx`, `src/app/global-error.tsx`, and `src/app/studio/error.tsx`.
- [x] Privacy-First Diagnostics & Web Vitals: Dexie schema v2 with 200-entry ring buffer, `web-vitals` listener, export JSON tool, and opt-in relay toggle in `ShortcutsModal.tsx`.
- [x] SSRF Security Remediation: Rewrote `/api/diagnostics/relay` to strictly use operator-configured HTTPS `DIAGNOSTICS_RELAY_URL` environment variable, ignoring all client-supplied target URLs and eliminating open-proxy vulnerabilities.
- [x] Quality Gates & CI: 77 unit/component tests (100% green across 15 suites), 9 Playwright E2E specs with Axe WCAG 2.2 scans, `lighthouserc.json`, and 3-stage GitHub Actions CI.

**Acceptance criteria:**
- `npm run lint` → 0 errors, 0 warnings.
- `npm run typecheck` → 0 errors.
- `npm test` → 77/77 tests pass across 15 test suites.
- `npm run test:e2e` → 9/9 Playwright E2E and Axe WCAG scans pass.
- `npm run build` → Next.js 16 production build compiles cleanly.

**Status:** Complete (2026-08-30)

---

## Phase 20 — Audit Remediation, Security Hardening, Dependency Pruning, Linter Hygiene & CI Enforcement
**Goal:** Remediate all architectural and hygiene findings identified in the deep audit: delete hardcoded PAT tokens, prune dead runtime dependencies, fix linter violations in benchmarks, align blend mode types with the UI and schema, add an MIT license, tighten CSP headers, establish GitHub Actions CI, and synchronize all documentation.

**Deliverables:**
- [x] Security: Deleted `sync_github.mjs` containing the exposed Personal Access Token.
- [x] Dependency Hygiene: Removed unused `isomorphic-git` (1.41.9) from `package.json`.
- [x] Linter Hygiene: Fixed `tests/benchmark.test.ts` unused imports and console calls (`eslint` passes with 0 errors and 0 warnings).
- [x] Blend Mode Alignment: Synchronized `src/types/canvas.ts`, `src/lib/project/schema.ts`, and `RightInspector.tsx` to the 5 verified blend modes (`source-over`, `multiply`, `screen`, `overlay`, `color-dodge`).
- [x] License: Created root `LICENSE` file under MIT terms.
- [x] CI/CD Automation: Created `.github/workflows/ci.yml` running typecheck, lint, vitest, and production build on push/PR.
- [x] Security Headers: Tightened CSP in `next.config.ts` by removing redundant external connect-src.
- [x] Documentation Truthfulness: Synchronized all `.md` files to reflect verified facts (61 tests across 10 suites, 5 blend modes, zero dead deps).

**Acceptance criteria:**
- `npm run lint` → 0 errors, 0 warnings.
- `npm run typecheck` → 0 errors.
- `npm test` → 61/61 tests pass across 10 test suites.
- `npm run build` → Next.js 16 production build compiles cleanly.
- `LICENSE` file exists in repo root.
- `isomorphic-git` absent from `package.json`.
- `sync_github.mjs` deleted.

**Status:** Complete (2026-08-30)

---

## Phase 19 — Tag Clip Export Scoping & Multi-Threaded Web Worker GIF Encoding
**Goal:** Implement isolated animation clip exporting (`Export Scope`), DOM-free GIF encoding core, background Web Worker acceleration with zero-copy transferable `ArrayBuffer` objects, animated progress bar feedback in `ExportModal`, and transparent main-thread fallback.

**Deliverables:**
- [x] Tag Clip Export Scope: `ExportModal.tsx` dropdown allows isolating clips (`Walk [1-4]`). Slices target frame arrays, adds scope suffixes to filenames, and $0$-indexes SpriteSheet atlas metadata (`Hero_0`, `Hero_1`, etc.).
- [x] DOM-free GIF Encoder Core (`src/lib/export/gifEncoderCore.ts`): Separated `quantizePixels`, `lzwEncode`, and `encodeGifRawFrames` into a pure, testable module.
- [x] Web Worker Acceleration (`src/lib/export/gifEncoder.worker.ts`): Background thread LZW compression and Median-Cut quantization with `postMessage` transferable buffers.
- [x] Live Worker Progress Bar: Visual progress updates (`X / Y frames (Z%)`) during GIF encoding in `ExportModal.tsx`.
- [x] Transparent Main-Thread Fallback: Automatic fallback in environments without worker support or under strict CSP rules.
- [x] Test Coverage: Added `tests/exportScopeAndWorker.test.ts` verifying multi-clip isolation and progress event callbacks.

**Acceptance criteria:**
- `npm run lint` → 0 errors, 0 warnings.
- `npm test` → 54/54 tests pass across 9 test suites.
- Manually: export clip "Walk" — produces isolated 4-frame GIF/SpriteSheet with $0$-indexed metadata.
- Manually: export 50-frame animation — worker encodes in background without freezing UI while progress bar animates.

**Status:** Complete (2026-08-30)

---

## Phase 18 — Data Persistence Hardening, Dynamic Undo Limits, Schema Migration & Locked Layer Security
**Goal:** Implement resilient multi-layer local-first persistence safeguards, dynamic resolution-scaled undo memory bounds, full proto-v1 $\to$ v2 schema migration, forward-compatibility version guards, new drawing confirmation dialog, and locked layer raster protection with HUD feedback.

**Deliverables:**
- [x] 2-Strike Autosave Failure Toast & Auto-Recovery: `autoSaveWorkspace` returns status boolean. `StudioLayout` renders persistent warning banner with 1-click Export CTA on $\ge 2$ consecutive failures; auto-dismisses on storage recovery.
- [x] Dynamic Canvas-Scaled Undo Limits: Replaced fixed 50-step stack with resolution-scaled limits ($50$ steps for $\le 64\text{px}$, $35$ steps for $\le 256\text{px}$, $20$ steps for $> 256\text{px}$).
- [x] Full Payload v1 $\to$ v2 Migration Engine (`migrateProjectPayload`): Backfills `customRamps`, `clips`, `onionSkin`, and layer `blendMode`/`opacity`/`visible`/`locked` for legacy and unversioned (`version: undefined`) files.
- [x] Forward-Version Guard: Explicit error message rejecting files from newer PixiBun versions (`input.version > PROJECT_FORMAT_VERSION`).
- [x] "New Drawing" Confirmation Modal: Prevents accidental canvas clearing via `isNewConfirmOpen` modal.
- [x] Locked Layer Security: `handlePointerDown` rejects drawing on locked layers and renders animated HUD toast (`🔒 Active layer is locked`).
- [x] OS Theme Auto-Detection: `themeStore.ts` detects `prefers-color-scheme: light` on cold boot before falling back to dark.

**Acceptance criteria:**
- `npm run lint` → 0 errors, 0 warnings.
- `npm test` → 51/51 tests pass.
- Schema migration unit tests verify unversioned and v1 projects migrate cleanly to v2.

**Status:** Complete (2026-08-30)

---

## Phase 17 — Compass Convention Light Vector Alignment, Optical Flow Center-Bias & Dynamic Compass Indicator
**Goal:** Align 2.5D photometric lighting with standard artist and Photoshop/Substance compass heading conventions ($0^\circ = \text{North/Top}, 315^\circ = \text{North-West/Top-Left}$), eliminate optical flow ghosting on uniform/transparent macroblocks via quadratic center bias, add a real-time rotating SVG compass needle indicator to the Azimuth slider, and verify with comprehensive directional tests.

**Deliverables:**
- [x] Standard Artist/Compass Light Vector Convention: `Lx = Math.sin(azRad) * Math.cos(elRad)`, `Ly = -Math.cos(azRad) * Math.cos(elRad)` applied across `executePhotometricPipeline`, `executeMinecraftSkinShadingPipeline`, `renderParametric2p5DLighting`, and `generateSelOutData`.
- [x] Optical Flow Zero-Motion Center Bias: Added `(ux*ux + vy*vy) * 0.05` quadratic distance penalty to block-matching SAD calculation in `morphInBetweenFrames`, preventing false motion vectors on solid-color and transparent background tiles.
- [x] Dynamic Rotating SVG Compass Needle: Added animated SVG navigation indicator next to Azimuth slider in `RightInspector.tsx` that visually rotates in real time with `tools.lightAzimuth`.
- [x] Compass Directional Highlight Regression Suite: Added test in `tests/photometricNonDestructive.test.ts` verifying that $315^\circ$ highlights Top-Left, $135^\circ$ highlights Bottom-Right, $45^\circ$ highlights Top-Right, and $225^\circ$ highlights Bottom-Left.

**Acceptance criteria:**
- `npm run lint` → 0 errors, 0 warnings.
- `npm test` → 49/49 tests pass across 8 test suites.
- Manually: set Azimuth to $315^\circ$ — produces crisp Top-Left highlight and Bottom-Right shadow.
- Manually: move Azimuth slider — SVG compass needle smoothly rotates matching the light angle.

**Status:** Complete (2026-08-30)

---

## Phase 16 — Minecraft 3D Photometric Shading Engine, Optical Flow Tweening, Anti-Aliasing & 3x3 Tiling
**Goal:** Implement physically and domain-accurate 3D Minecraft skin recognition and shading (Half-Lambert diffuse wrap, raytraced anatomical contact occlusion, sky hemisphere gradients, and OKLCH warm sunlight/cool indigo hue-shifting), optical flow animation tweening, smart sub-pixel anti-aliasing (De-Jaggy), light-aligned selective outlining (Sel-Out), and live 3x3 seamless pattern matrix preview.

**Deliverables:**
- [x] `detectMinecraftSkin(isOpaque, width, height)` & `computeMinecraftSkinNormalField(width, height)`: 3D normal vector recognition for all 12 UV boxes with smooth 1px edge beveling.
- [x] `executeMinecraftSkinShadingPipeline()`: Domain-specific non-destructive shading with Half-Lambert wrap, anatomical contact AO, sky-hemisphere radiance gradient, and OKLCH hue-shifting.
- [x] `morphInBetweenFrames()`: 2D Block-Matching Optical Flow & Signed Distance Field animation tweening in OKLab space.
- [x] `cleanJaggiesOnCanvas()`: Smart hand-crafted sub-pixel anti-aliasing (De-Jaggy) smoothing 1px staircase corners.
- [x] `generateSelOutData()`: Directional selective outlining recoloring silhouette outlines based on 3D light azimuth $\theta$.
- [x] `showTilePreview`: Live 3x3 seamless pattern matrix surrounding the viewport stage.
- [x] `showIsoGuides`: Sharp 2:1 isometric diamond guide grid.
- [x] `FloatingPreviewWindow` close button propagation stop.

**Acceptance criteria:**
- `npm run lint` → 0 errors.
- `npm test` → 48/48 tests pass.
- `npm run build` → 0 errors (Next.js 16.3.2 Turbopack static output).
- Manually: import Minecraft skin and render photometric lighting — produces warm sunlight highlights, indigo contact shadows, and preserved textures.
- Manually: click `+ In-Between Frame` — interpolates smooth intermediate animation frame.
- Manually: click `3x3` — live mirrors drawing into 8 seamless pattern tiles.

**Status:** Complete (2026-08-30)

---

## Phase 15 — Non-Destructive Photometric Output & Live Preview Signal
**Goal:** Fix the three regressions caused by the photometric pipeline writing destructively into the source layer (pixel loss on light-angle changes, incoherent re-renders, stale live preview) and replace fragile display-name matching with a stable per-layer `tag` identifier system.

**Root cause:** the photometric, auto-shade, specular, sel-out, ground-shadow, and bake-normals pipelines previously called `clearRect` + `drawImage` on the active drawing layer, so each render destroyed the artist's original pixels. There was also no `bufferVersion` signal for buffer-pixel mutations, so the live preview window did not re-render during strokes.

**Deliverables:**
- [x] `Layer.tag?: string` added to `src/types/canvas.ts` for stable machine identification of auto-generated output layers.
- [x] `useStudioStore.addLayer(name?, tag?)` extended; `addLayer` continues to `unshift` so the new layer is at `layers[0]`.
- [x] `useStudioStore.bufferVersion` + `bumpBufferVersion()` action added; bumped on every pixel-mutating path (pen/eraser/dither strokes, bucket fill, color replace, undo/redo, commit/lift/cut/delete selection, and all AI panel handlers).
- [x] `CenterViewport`: helpers `compositeSourceSnapshot(excludeTag)` and `replaceTaggedLayer(name, tag)`; `Render Photometric`, `Auto-Shade`, `Specular`, `Sel-Out`, `Ground Drop Shadow`, and `Bake Normals` now write to dedicated tagged layers and exclude prior outputs from their inputs.
- [x] `Bake Normals` fixed to write to the new `layers[0]` (was using `layers[length-1]` after a 50ms `setTimeout`).
- [x] `FloatingPreviewWindow` subscribes to `bufferVersion`; live preview now updates in real time during strokes and AI renders.
- [x] Dead duplicated `useEffect` block (legacy destructive pattern) removed from `CenterViewport`.
- [x] `applyRiemersmaDither()` Hilbert space-filling implementation in `smartMathEngine.ts`, wired to `pixibun:riemersma-dither`.
- [x] `RightInspector`: removed dead `Bezier Spline` panel button (Bézier is already a drawing tool — the toolbar's `curve` tool); `47-Blob` button disabled with explanatory tooltip (`"Requires tileset atlas (planned). 47-Tile Blob is currently a bitmask computation utility, not a one-click autotiler."`).
- [x] `LOGS.md` updated to clarify 47-Tile Blob is a bitmask utility, not a one-click autotiler.
- [x] Regression tests in `tests/photometricNonDestructive.test.ts`:
   1. Non-destructiveness — 10 photometric renders with varying angles leave the source `ImageData` byte-identical.
   2. Live sync — `bufferVersion` starts at 0 and increments on every `bumpBufferVersion()` call.
   3. Photometric correctness — `Az=0, El=90` produces a non-empty, silhouette-following, left/right-symmetric output with the top at least as bright as the bottom rim.
   4. Bake Normals layer index — `addLayer(name, tag)` inserts at `layers[0]`; `replaceTaggedLayer` keeps a single tagged output layer with base art at the bottom.

**Acceptance criteria:**
- `npx tsc --noEmit` → 0 errors.
- `npx vitest run` → 32/32 tests pass.
- Manually: draw a sprite, run Render Photometric 10× with varying angles — original layer remains byte-identical and the tagged output layer is replaced in place.
- Manually: drawing on the canvas updates the floating live preview in real time.
- Manually: click Riemersma dither with a palette — produces non-worming error-diffusion output.
- Manually: Bézier Spline button is gone; 47-Blob is disabled with the documented tooltip.

**Status:** Complete (2026-08-29)

---

## Phase 14 — 2.5D Photometric Studio, Normal Mapping, Geometry Engine & Mathematical Dithering Suite
**Goal:** Deliver a mathematically rigorous computer graphics and pixel intelligence suite built into the PixiBud inspector and canvas engine: linear-time $O(N)$ Euclidean Distance Transform (EDT), analytical tangent-space normal vector fields with standard blue texture baking $(128, 128, 255)$, Blinn-Phong specular half-vector glints, discrete Laplace cavity ambient occlusion, 5 physical material presets, OKLab perceptual color quantization, and recursive Bayer matrix dither modulation.

**Deliverables:**
- [x] Linear-Time $O(N)$ Separable Euclidean Distance Transform (Felzenszwalb-Huttenlocher algorithm).
- [x] Non-linear height dome inflation ($\gamma = 0.5$) with edge-preserving Bilateral filtering.
- [x] Discrete Sobel partial derivative kernels ($K_x, K_y$) and analytical unit normal vector derivation.
- [x] 1-Click Tangent Normal Map Baker writing standard $(128, 128, 255)$ normal maps directly to a new Layer for game engines (Godot, Unity, Unreal).
- [x] Discrete Laplace operator for Cavity Map / Ambient Occlusion (AO) in surface crevices.
- [x] Full Photometric Lighting equation with Lambert diffuse, Blinn-Phong specular, cavity AO, and inverse square distance attenuation.
- [x] 5 Material Presets: *Matte Clay*, *Polished Metal*, *Glossy Glass*, *Velvet Fabric*, *Gold / Brass*.
- [x] OKLab Perceptual Color Matching ($\Delta E_{\text{OKLab}}$) and recursive Bayer matrix dither offset modulation.
- [x] Rational Bézier curves, Wu's quantized 2:1 isometric lines, RotSprite 8x rotation, and Zhang-Suen 1px skeleton thinning.
- [x] Contextual Tool Options Strip (30px high dynamic toolbar beneath header) and categorized artisan Left Toolbar.
- [x] Live Viewport Normal Map Preview inspection toggle.

**Acceptance criteria:**
- Type-check (`tsc --noEmit`), build (`next build`), and tests pass with 0 errors.
- Normal maps bake cleanly to distinct layers with $(128, 128, 255)$ baseline flat normals.
- Photometric lighting applies physically accurate specular glints, diffuse shading, and clean OKLab Bayer dithering.

**Status:** Complete (2026-08-28)

---

## Phase 13 — Lamplit Identity: De-Slop, Cozy Studio & Hero Landing Page
**Goal:** Replace generic tool-panel feel with an authored identity per FullStackGuide: one signature element (the lamplit desk), a hand-pixelled brand mark, warm human copy everywhere, and a hero landing page that lets visitors draw before they enter.

**Deliverables:**
- [x] Token overhaul: desk/wood-grain surfaces, lamp amber accents, static CSS dither textures, scroll unlocked globally.
- [x] Route restructure: landing at `/`, editor moved to `/studio` with its own metadata; autosave hydration verified through the move.
- [x] Signature element shipped once per scene: `.lamp-pool` overlay on viewport and hero; canvas frame reads as paper under lamp light.
- [x] Bun mascot (`src/components/ui/BunMascot.tsx`): hand-plotted 16x16 SVG, idle/blink/happy poses, reduced-motion-safe blink; header brand plate rebuilt around it.
- [x] Copy de-slop: all eleven inspector feedback strings rewritten emoji-free in craftsperson voice; "1-Click Magic" replaced.
- [x] Landing page: hero + interactive 32x20 DoodlePad, narrative feature story (no bento grid), starter sprite gallery rendered via `paintTemplate`, quiet footer.
- [x] Starter art system: `src/types/landing.ts`, `src/lib/art/starterTemplates.ts` (four hand-authored 16x16 sprites), `src/lib/render/templateRenderer.ts`.
- [x] WCAG focus restored: amber focus-visible rings on TactileButton, doodle swatches, CTAs.
- [x] Tests: `starterTemplates.test.ts`, `templateRenderer.test.ts` (suite now 24 tests).
- [x] DESIGN.md locked: signature element, expanded tokens, texture rules, landing voice guide with banned phrases.

**Status:** Complete (2026-08-25)

---

## Phase 8 — Data Integrity, Truthful Exports & Verification Harness
**Status:** Complete (2026-08-25)
