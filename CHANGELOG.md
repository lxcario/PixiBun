# PixiBun Atelier — Changelog

All notable changes and architectural enhancements to the PixiBun Atelier codebase are documented below.

## [v1.12.1] - 2026-09-12
### External Audit Remediation & Terminology Harmonization (Phase 50)
- **P2P Co-Draw Modal Network Default (`src/components/modals/CoDrawModal.tsx`)**: Changed default network mode from `'internet'` to `'lan'`, matching the zero-egress LAN promise (`iceServers: []`) in `README.md`.
- **Lossless PNG Export 32× Resolution Option (`src/components/modals/export/PngExportTab.tsx`)**: Added `32` to the scale button array (`[1, 2, 4, 8, 16, 32]`), fulfilling the documented "1× to 32× lossless PNG" export capability in the UI.
- **Eradication of "Wu" Attribution on 2:1 Isometric Stepping (`README.md`, `ARCHITECTURE.md`, `PIXIBUN_DEEP_DIVE.md`, `CHANGELOG.md`, `TASKS.md`, `LOGS.md`)**: Replaced all mentions with "Quantized 2:1 Isometric Line Stepper", reflecting classic 1980s dimetric rasterization ($\arctan(0.5) \approx 26.565^\circ$) rather than Xiaolin Wu's anti-aliasing technique.
- **Historical Citation Cleanup (`src/lib/ai/math/rotSprite.ts`)**: Standardized citation on canonical author name Xenowhirl (2007) and removed the leftover alias "Xenowoz".
- **HistoryEngine Memory Arithmetic Correction (`BENCHMARKS.md`, `tests/benchmark.test.ts`)**: Corrected 256×256 50-step memory from 12.80 MB to 13.11 MB ($13{,}107{,}200 / 1{,}000{,}000$) and 100-step max memory from 25.60 MB to 26.21 MB.
- **CenterViewport 6-Canvas Stack Diagram (`ARCHITECTURE.md`)**: Updated the mermaid diagram to include all 6 hardware-accelerated canvas layers (`onionCanvasRef`, `stencilCanvasRef`, `mainCanvasRef`, `previewCanvasRef`, `gridCanvasRef`, `cursorCanvasRef`).
- **Deep Dive Directory Tree Alignment (`PIXIBUN_DEEP_DIVE.md`)**: Added `curvesAndLines.ts` and `morphology.ts` to the `src/lib/ai/math/` tree.
- **Persistent Storage Rejection Handling (`src/components/layout/StudioLayout.tsx`)**: Handled the promise returned by `requestPersistentStorage()`, logging a diagnostic warning if persistence is not granted.

### Deep Audit Remediation, RotSprite Fast Paths, SDF Morphing & Test Suite Re-alignment (Phase 49)
- **P2P WebRTC Data Channel Backpressure & Buffer Ceilings (`src/lib/sync/p2pSync.ts`, `tests/p2pSync.test.ts`)**:
  - Implemented `MAX_DATA_CHANNEL_BUFFERED_AMOUNT` (1 MB) and `MAX_PRESENCE_BUFFERED_AMOUNT` (64 KB) backpressure thresholds for dual RTCDataChannel transports.
  - Enforced backpressure guards in `broadcastPixelOps`, `broadcastInitialSync`, `broadcastStructure`, and `broadcastCursor` to eliminate channel buffer congestion and memory bloat.
  - Added unit test in `tests/p2pSync.test.ts` verifying graceful yielding and cursor frame dropping when data channel `bufferedAmount` exceeds thresholds.
- **Palette Cycling & History Engine Runtime Memory Benchmarks (`tests/benchmark.test.ts`, `BENCHMARKS.md`)**:
  - Added automated empirical benchmarks for zero-allocation 32-bit `updateLivePaletteLUT32` and raster pixel remapping across 64x64, 128x128, 256x256, and 512x512 sprite dimensions, verifying execution within 16.66ms (60 FPS budget).
  - Added formal memory footprint and ring buffer pruning capacity assertions for `HistoryEngine` across 16x16 through 512x512 resolutions, confirming exact agreement with `BENCHMARKS.md` ceilings (e.g. 13.1 MB for 50 steps at 256x256).
- **Photometric Light Bulb Gizmo UX & Cel Shading Remediation (`src/components/studio/PixelLightBulbGizmo.tsx`, `src/hooks/viewport/useViewportPointerEvents.ts`, `src/hooks/viewport/useViewportTransform.ts`, `src/lib/ai/math/photometricLighting.ts`, `src/lib/events/studioEvents.ts`, `src/stores/slices/createToolSlice.ts`, `tests/orbPhotometricCelShading.test.ts`, `tests/components/PixelLightBulbGizmo.test.tsx`)**:
  - Modulated directional cel shadow terminator threshold inversely by brightness (`(0.55 * 1.15) / max(0.2, brightness)` clamped to `[0.15, 0.85]`), ensuring bulb strength changes physically drive the shadow boundary back on character sprites while preserving exact palette purity and leaving default 1.15 output bit-identical.
  - Added event propagation suppression (`e.stopPropagation()`) across HUD buttons, steppers, inputs, and container `onPointerDown`, alongside an explicit `photometricGizmoActive` guard in `useViewportPointerEvents.ts` to eliminate canvas draw tool leakage when interacting with HUD controls.
  - Relocated the floating viewport HUD toolbar from `top-3` to `top-full mt-2 left-1/2 -translate-x-1/2`, anchoring it safely beneath the bottom canvas boundary and preventing artwork occlusion.
  - Intercepted mouse wheel events during active photometric sessions in `useViewportTransform.ts`, re-routing scroll deltas via `pixibun:photometric-strength-delta` to bulb strength adjustments ($\pm 0.05$ per tick) and preventing disruptive viewport zoom jumping.
  - Aligned tool store `setLightBrightness` lower clamp boundary from 0.4 to 0.3 to match the stepper minimum, and added unit tests in `tests/orbPhotometricCelShading.test.ts` and `tests/components/PixelLightBulbGizmo.test.tsx`.
- **RotSprite Rectangular 90°/270° Fast Path & Centered Layer Rotation (`src/lib/ai/math/rotSprite.ts`, `src/lib/canvas/rotSprite.ts`, `src/hooks/viewport/events/useGeometricEvents.ts`, `tests/rotSpriteRectangular.test.ts`)**:
  - Removed `w === h` restriction on orthogonal 90° and 270° fast paths across both canvas and math processing chains, transposing output canvas dimensions ($W' = H, H' = W$) and updating coordinate indexing to $y' \cdot H + x'$.
  - Added dedicated fixed-dimension centered fast-paths for $90^\circ$ and $270^\circ$ rotations on non-square bounds ($O(W \times H)$) when `outW === w && outH === h`, and centered rotated content in `useGeometricEvents.ts` to prevent asymmetrical layer clipping.
  - Deduplicated `src/lib/ai/math/rotSprite.ts` by removing 220 lines of redundant Scale2x/majority voting code and converting `rotateWithRotSprite` into a thin DOM adapter delegating directly to canonical `rotSprite` in `src/lib/canvas/rotSprite.ts`.
  - Corrected downsampling kernel documentation from Gaussian to Xenowhirl's parabolic center-weighted majority voting kernel: $w(u, v) = 1.0 + 0.01 \cdot (25 - (u^2 + v^2))$.
  - Created unit tests in `tests/rotSpriteRectangular.test.ts` (6 tests) verifying rectangular canvas rotation equivalence.
- **Morph Fraction Forwarding & Multi-Source BFS Color Sampling (`src/lib/ai/pixelAiEngine.ts`, `src/workers/heavyCompute.worker.ts`, `src/lib/engine/workerDispatcher.ts`, `tests/pixelAiEngineMorphFraction.test.ts`)**:
  - Replaced $O(W \times H \times R^2)$ spiral search with an 8-connected multi-source Breadth-First Search (BFS) in exact $O(W \times H)$ time for nearest opaque color lookups.
  - Exported `morphInBetweenFrameAtFraction` and forwarded time fraction parameter `t` in `morphInBetweenFrames`.
  - Added `fraction` property support across Web Worker message schemas and dispatcher fallback routes.
  - Created unit tests in `tests/pixelAiEngineMorphFraction.test.ts` (5 tests) asserting intermediate fraction color transitions.
- **History Engine Popped Step Loop Elimination (`src/lib/engine/historyEngine.ts`, `tests/historyEngine.test.ts`)**:
  - Guarded opposite stack push on `undo()` and `redo()` to execute only when `currentState !== undefined`, eliminating ghost state cycles.
  - Added unit test in `tests/historyEngine.test.ts` verifying no-arg undo behavior.
- **FloodFill Hex Parsing & Unsigned 32-Bit Contract (`src/lib/canvas/floodFill.ts`, `tests/floodFillHex.test.ts`)**:
  - Documented strict 6-digit `#RRGGBB` contract for color picker inputs and exported explicit `rgbToHex` alias.
  - Unified test suite in `tests/floodFillHex.test.ts` to 14 tests preserving all 5 `hexToRgba` tests (including CSS Color 4 4/8-digit `#RGBA` expansion), 4 `performFloodFill` algorithm tests, and 5 `rgbaToHex` contract tests.
- **Diagnostics Relay Fallback Version Synchronization (`src/lib/diagnostics/capture.ts`, `src/app/api/diagnostics/relay/route.ts`, `tests/diagnostics.test.ts`)**:
  - Synchronized `APP_VERSION = '1.12.0'` in `capture.ts` and default route fallback in `src/app/api/diagnostics/relay/route.ts`.
- **E2E Spec Test Reliability & Teardown Race Elimination (`tests/e2e/chiselAndPaletteLiveProof.spec.ts`, `tests/e2e/landing.spec.ts`, `tests/e2e/volumetricVisualProof.spec.ts`, `tests/e2e/selectionGizmoLiveProof.spec.ts`, `src/components/layout/TopHeader.tsx`, `src/lib/storage/db.ts`)**:
  - Root-caused intermittent E2E failure to `DatabaseClosedError` thrown when in-flight `loadLatestSavedWorkspace()` collided with explicit test database teardown (`win.__pixibunDb.close()`).
  - Added `isIgnorableDbClosure` in `db.ts` to recognize expected database closures during teardown/navigation and downgrade them to `console.warn`.
  - Cleared `consoleErrors` buffer post-reload in `selectionGizmoLiveProof.spec.ts` so pre-reload teardown noise does not pollute the active test run.
  - Disambiguated `Rivet Stamp` role queries between LeftToolbar and RightInspector, added accessible `aria-label` to Guide button in `TopHeader.tsx`, and handled intro curtain detachment timeouts in `landing.spec.ts`.
  - Replaced hardcoded machine-specific brain directory paths with dynamic `path.join(process.cwd(), 'test-results', 'e2e-artifacts')` and recursive folder creation.
  - All 8 Playwright E2E suites (20 tests) pass 100% green deterministically across repeated parallel runs.
- **Automated Semantic Verifier, Musical Attribution & Algorithmic Rigor (`scripts/verifyDocIntegrity.mjs`, `ARCHITECTURE.md`, `README.md`, `MAIN.md`, `PIXIBUN_DEEP_DIVE.md`, `SKILL.md`, `src/lib/audio/tracks.ts`, `tests/benchmark.test.ts`)**:
  - Added Check 5 in `scripts/verifyDocIntegrity.mjs` verifying claimed unit and E2E test counts against live `npx vitest list` and `npx playwright test --list` runners.
  - Added Toby Fox / Deltarune musical composition copyright and educational fan homage attribution notices in `tracks.ts` and `README.md`.
  - Updated benchmark test title from obsolete "optical flow" to "signed distance field morphing" in `tests/benchmark.test.ts`.
  - Replaced optical flow claims with Signed Distance Field (SDF) morphing and 8-connected multi-source BFS.
  - Aligned frontal cushion formula to $\text{rimRatio} = \min(1, D / 2.8)$ and $H = \max(D) \cdot \sqrt{\text{rimRatio}}$.
  - Aligned salience weighting to $2\times2$ forward differences with $[1.0, 3.5]$ clamp.
  - Aligned palette cycling retuning to harmonic rational retuning: $k = \operatorname{round}(T \cdot \text{rate} / M)$.
  - Documented missing keyboard shortcuts (<kbd>N</kbd>, <kbd>S</kbd>, <kbd>P</kbd>), `/playground` sandbox route, and APNG/MP4/WebM export nuances.
  - Harmonized `SKILL.md:12` emoji rule to distinguish functional documentation markers from decorative AI slop emojis.

## [v1.12.0] - 2026-09-08
### Selection Free-Transform Gizmo, Sprite Sheet Slicer & Web Worker Offloading Engine (Phase 48)
- **RotSprite Rotation Engine (`src/lib/canvas/rotSprite.ts`, `tests/rotSpriteAcademic.test.ts`)**:
  - Implemented the full Xenowhirl (2007) RotSprite algorithm for low-resolution pixel art (as popularized in Aseprite).
  - Features three-stage pipeline: Scale8x cascade via Scale2x corner-connectivity, subpixel inverse affine rotation, and parabolic center-weighted majority voting filter to downscale back to 1x without introducing new color shades.
  - Created unit tests in `tests/rotSpriteAcademic.test.ts` validating rotation symmetry, palette preservation, and 90° exact equivalence.
- **Selection Boundary Extraction & Marching Ants (`src/lib/canvas/selectionUtils.ts`, `tests/selectionBoundary.test.ts`)**:
  - Implemented `extractSelectionBoundarySegments` traversing 1-bit binary selection masks along orthogonal cell boundaries to extract per-pixel edge segments for arbitrary irregular shapes.
  - Implemented `boundarySegmentsToSvgPath` converting boundary edges to dual-tone SVG dashed marching ants paths.
  - Added unit tests in `tests/selectionBoundary.test.ts` verifying boundary extraction and disconnected selection islands.
- **Interactive Selection Free-Transform Gizmo (`src/components/studio/SelectionTransformGizmo.tsx`, `src/hooks/viewport/useViewportSelectionTransform.ts`, `src/components/layout/CenterViewport.tsx`, `tests/components/SelectionTransformGizmo.test.tsx`)**:
  - Mounted an interactive free-transform gizmo with 8 transform handles maintaining constant 16x16px screen-space hitboxes regardless of canvas zoom.
  - Center pivot reticle ($\oplus$) draggable for setting custom rotation/scaling centers.
  - 4 corner rotation hit zones with 15° Shift snapping, angle readout badge, 60 FPS nearest-neighbor preview during drag, and quick-action HUD bar (Flip H, Flip V, Rotate 90° CW/CCW, Commit, Cancel).
  - Added component tests in `tests/components/SelectionTransformGizmo.test.tsx` verifying handle rendering, HUD controls, and interactive dragging.
- **Timeline TagManagerModal Integration (`src/components/layout/BottomTimeline.tsx`, `tests/components/BottomTimeline.test.tsx`)**:
  - Added "Manage Tags" launcher button in the timeline clip bar next to `+ Tag Clip`.
  - Connected `TagManagerModal` dialog directly into timeline workflow for creating, editing, and deleting animation tags.
  - Added component tests in `tests/components/BottomTimeline.test.tsx` verifying modal opening and tag creation.
- **Sprite Sheet Auto-Slicer Engine (`src/lib/canvas/spritesheetSlicer.ts`, `src/components/modals/ImportModal.tsx`, `src/components/layout/StudioLayout.tsx`, `tests/spritesheetSlicer.test.ts`, `tests/components/ImportModal.test.tsx`)**:
  - Added pure slicer engine computing grid coordinates, filtering blank alpha cells, and extracting frames.
  - Added dedicated "Sprite Sheet Slicer" tab in `ImportModal.tsx` with preset buttons (16x16, 24x24, 32x32, 48x48, 64x64, custom), live cutline canvas preview with indexed frame badges (`#1`, `#2`, ...), and timeline append/replace options.
  - Updated `StudioLayout.tsx` to batch-import sliced frames directly into the timeline.
  - Added unit tests in `tests/spritesheetSlicer.test.ts` and component tests in `tests/components/ImportModal.test.tsx`.
- **Heavy Compute Web Worker Offloading (`src/workers/heavyCompute.worker.ts`, `src/lib/engine/workerDispatcher.ts`, `src/hooks/viewport/events/useArtisanEvents.ts`, `tests/workerDispatcher.test.ts`)**:
  - Created background Web Worker for heavy graphics tasks (`rotSprite`, `wfc`, `morph`) using Transferable `ArrayBuffer` objects for zero-copy transfers.
  - Created `workerDispatcher.ts` with automatic synchronous fallback for Node.js test environments or when workers are unavailable.
  - Integrated worker dispatcher into `useArtisanEvents.ts` for asynchronous WFC synthesis and in-between frame morphing.
  - Added unit tests in `tests/workerDispatcher.test.ts` verifying task execution and fallback handling.

## [v1.11.1] - 2026-09-08
### Graphics Pipeline Bug Fixes, Bitwise Normalization & System Hardening (Phase 47)
- **Unsigned 32-Bit Bitwise Normalization (`src/lib/canvas/floodFill.ts`, `tests/floodFillHex.test.ts`)**:
  - Fixed flood fill failure on opaque colored regions caused by signed 32-bit shift overflow (`(a << 24)` returning negative signed integers for $a = 255$) failing strict equality against unsigned `Uint32Array` values.
  - Appended `>>> 0` to `targetColor32` and `replacementColor32`, and added view-safe `Uint32Array` buffer offset instantiation.
  - Added unit tests in `tests/floodFillHex.test.ts` verifying opaque colored pixel expansion.
- **Export Modal Download Stream Race Prevention (`src/components/modals/ExportModal.tsx`, `tests/components/ExportModal.test.tsx`)**:
  - Replaced synchronous `URL.revokeObjectURL(url)` immediately after `link.click()` with a 1000ms deferred teardown (`setTimeout`) across all 11 download handlers (PNG, SVG, GIF, MP4, WebM, APNG, Spritesheet, Replay) to prevent premature blob invalidation in Firefox and Safari.
  - Added component tests in `tests/components/ExportModal.test.tsx` verifying asynchronous revocation timing.
- **Semi-Transparent Vector SVG Alpha Preservation (`src/lib/export/depixelizeVector.ts`, `tests/depixelizeVectorExport.test.ts`)**:
  - Corrected `packRgbaKey` to serialize fractional alpha via `rgba(r,g,b,(a/255).toFixed(3))` for $0 < a < 255$, preserving translucent sprite elements upon SVG export.
- **MP4 Odd-Dimension Macroblock Alignment (`src/lib/export/mp4Encoder.ts`, `tests/mp4Encoder.test.ts`)**:
  - Padded export canvas dimensions to even integer bounds via `(width * scale + 1) & ~1` and `(height * scale + 1) & ~1` to prevent hardware H.264 macroblock encoding and YUV 4:2:0 subsampling crashes on odd sprite dimensions.
- **P2P Post-Connection Layer Sync & State Hardening (`src/lib/sync/coDrawBridge.ts`, `tests/p2pSync.test.ts`)**:
  - Tracked `syncedLayerIds` and canvas dimensions to push initial snapshots when layers are added post-connection or canvas is resized.
  - Pruned deleted layer CRDT replicas and isolated guest active frame/layer pointers from incoming host updates.
- **Viewport Drawing HUD Decoupling (`src/components/layout/CursorStatusBadge.tsx`, `src/components/layout/CenterViewport.tsx`, `src/hooks/viewport/useViewportDrawing.ts`, `tests/components/CursorStatusBadge.test.tsx`)**:
  - Decoupled cursor coordinate state from parent `CenterViewport.tsx` into isolated subscriber `CursorStatusBadge.tsx`, eliminating component re-render cascades during active pen and brush strokes.
- **Photometric Lighting Cel-Shading Backlight Verification (`src/lib/ai/math/photometricLighting.ts`, `tests/orbPhotometricCelShading.test.ts`)**:
  - Verified existing `Math.max(0, ...)` guard in `wrapNdotL` and added unit test verifying that azimuth $180^\circ$ and negative elevation ($N \cdot L = -1.0$) evaluates to shadow tones without `NaN`.

## [v1.11.0] - 2026-09-08
### 2.5D Normal Chisel & Mark Ferrari Palette Cycling Suite (Phase 46)
- **2.5D Normal Chisel & Bas-Relief Sculptor (`src/lib/art/normalSculptor.ts`)**:
  - Implemented unit tangent normal vector encoding and decoding with OpenGL $+Y$ up convention ($N_x, N_y, N_z \in [-1, 1] \leftrightarrow [0, 255]$ with flat baseline at $(128, 128, 255)$).
  - Analytical directional bevel geometry with compass azimuth $\alpha \in [0, 360^\circ)$ and incline $\phi \in (0, 90^\circ]$.
  - Shallow spherical rivet/stud stamp calculation with flattening factor $h \in (0, 1]$ and inversion flag for dimples/countersunk holes.
  - Reoriented Normal Mapping (RNM, Colin Barré-Brisebois & Stephen Hill 2012) via shortest-arc quaternion rotation, plus UDN detail normal blending.
  - Two-phase `ChiselStrokeSession` envelope buffer preventing intra-stroke angular accumulation.
- **Studio Chisel & Rivet Integration (`src/types/tools.ts`, `src/stores/slices/createToolSlice.ts`, `src/components/layout/LeftToolbar.tsx`, `src/components/ui/PixelIcon.tsx`, `src/components/layout/inspector/NormalSculptorSection.tsx`, `src/components/layout/inspector/AiToolsPanel.tsx`, `src/components/layout/CenterViewport.tsx`)**:
  - Added `'normal-chisel'` and `'rivet-stamp'` tool options and state slices.
  - Interactive 3D normal vector sphere gizmo visualizing active normal azimuth and incline in real time.
  - Chisel and rivet icons on LeftToolbar with keyboard shortcuts.
- **Mark Ferrari 8-Bit Dynamic Palette Cycling Engine (`src/lib/color/paletteCycling.ts`)**:
  - Binary parsing and serialization for Amiga IFF ILBM `CRNG` (8-byte) and Commodore Graphicraft `CCRT` (14-byte) chunks.
  - Zero-allocation 32-bit LUT renderer (`updateLivePaletteLUT32`) updating canvas ImageData buffers at 60 FPS without garbage collection thrashing.
  - Mathematically sound triangle-wave ping-pong period $M = 2(S - 1)$ with zero-bound fencepost safety.
  - Sub-step `BlendShift` linear color interpolation between adjacent palette registers.
  - Harmonic rational retuning (`retuneTracksForSeamlessLoop`) preventing coprime LCM period explosion during loop baking.
- **Palette Inspector Controls & Exporters (`src/components/layout/inspector/PalettePanel.tsx`, `src/lib/export/shaderExporter.ts`, `src/components/modals/ExportModal.tsx`)**:
  - In-studio palette cycling preview with speed, direction, ping-pong, and BlendShift controls.
  - Standalone Godot 4 `.gdshader` and Unity URP 2D HLSL shader generator with point filtering.
  - Seamless APNG and animated GIF cycle loop unroller.
- **Zero Name-Sniffing & Pure Machine-Tag Architecture (`src/hooks/viewport/useViewportStudioEvents.ts`)**:
  - Purged all legacy display-name heuristic checks (`startsWith('photometric')`, `startsWith('specular')`, `startsWith('normal')`) across `compositeSourceSnapshot`, `updateTaggedLayer`, `duplicateLayers`, and `bakePhotometricLighting`.
  - Excluded `tag === 'normal'` and `tag === 'normal-map'` from diffuse albedo composites to protect base sprite textures from vector byte corruption.
  - Enforced strict machine-tag matching (`l.tag === tag`) across all layer types in the raster and photometric pipeline.
- **Sequential Test Isolation & Clean Database Teardown (`src/lib/storage/db.ts`, `tests/e2e/chiselAndPaletteLiveProof.spec.ts`)**:
  - Implemented explicit `window.__pixibunDb.close()` prior to database schema deletion.
  - Wrapped `indexedDB.deleteDatabase('PixiBunDB')` in a Promise that explicitly rejects on `req.onblocked` to eliminate hanging connection races.
  - Added post-reload store assertions (`frameCount === 1`, `layerCount === 1`, `hasNormalLayer === false`, `showNormalPreview === false`) guaranteeing clean test starting states.
- **Live Studio E2E Verification Suite (`tests/e2e/chiselAndPaletteLiveProof.spec.ts`)**:
  - Built comprehensive Playwright E2E test verifying live chisel carving, normal preview overlay toggle, 45° vs 225° relighting contrast inversion (32,558 modified pixels), and live Mark Ferrari palette cycling.
  - Archived 8 verified visual integration proof artifacts in `docs/assets/screenshots/`.
- **Unit & Integration Suite (`tests/normalSculptor.test.ts`, `tests/paletteCycling.test.ts`)**:
  - Added 31 unit tests validating normal math, RNM quaternion blending, IFF chunk codecs, ping-pong fenceposts, and shader syntax. Full suite passes: 445 tests across 66 suites.

## [v1.10.4] - 2026-09-07
### Landing Page Anti-Slop Remediation & Silky-Smooth Animations (Phase 45)
- **Direct Static Imports & Zero-Lag Tab Switching (`src/components/landing/AtelierEngineShowcase.tsx`)**:
  - Replaced `next/dynamic` lazy imports with direct static imports for all 4 showcase panels (`PhotometricShowcase`, `RotSpriteShowcase`, `PixelizeShowcase`, `EngineExportShowcase`), eliminating dark flashing, loading skeletons, and unmounting delay.
- **Framer Motion `layoutId` Spring Pill Selector (`src/components/landing/AtelierEngineShowcase.tsx`)**:
  - Added spring physics pill indicator (`layoutId="activeEngineShowcaseTab"`, stiffness 440, damping 32) behind active tab labels and smooth cross-fade transition on panel swap.
- **Landing Navigation Layout Stability & Progress Track (`src/components/landing/LandingNav.tsx`)**:
  - Replaced inline text layout-shifting spark with absolute bottom underline indicator (`layoutId="activeNavIndicator"`), preventing horizontal text jitter during viewport scroll.
  - Housed scroll progress bar within an explicit background track.
- **Purge of Residual Emojis and Copy Polish (`src/components/landing/showcase/PhotometricShowcase.tsx`, `src/components/landing/showcase/EngineExportShowcase.tsx`, `src/components/landing/AtelierDeskScene.tsx`, `src/app/error.tsx`, `src/app/studio/error.tsx`, `src/app/global-error.tsx`)**:
  - Replaced emoji buttons and icons with crisp 16x16 pixel SVG vectors (`<IconLighting />`, `<IconRotate />`, `<IconSynthesis />`, `<IconExport />`, pixel lamp, pixel heart, pixel chevrons).
  - Upgraded error boundary visuals with official `<BunMascot size={28} />`.
  - Replaced broken marketing badge with `"INTERACTIVE GRAPHICS BENCHMARK"`.
- **Regression Suite Verification (`tests/components/AtelierEngineShowcase.test.tsx`)**:
  - Updated clipboard copy assertion and verified all 8 integration tests pass.

## [v1.10.3] - 2026-09-07
### Zero-Slop Hardening, Accessibility & Documentation Parity (Phase 44)
- **WCAG 2.2 AA Accessibility (`src/components/landing/showcase/RotSpriteShowcase.tsx`, `src/components/modals/ColorPickerModal.tsx`, `src/components/onboarding/ArtisanHandbookPanel.tsx`)**:
  - Added programmatic `aria-label` attributes to the three auxiliary range inputs ("Rotation angle", "Color hue", "Lightbox opacity").
  - Regression tested in `tests/components/ArtisanHandbookPanel.test.tsx`.
- **Anti-Slop Emoji Purge (`SKILL.md` Rule 12)**:
  - Eliminated all 12 residual Unicode emojis (`🎉`, `🌐`, `🔒`, `📥`, `🧹`, `💡`, `📍`, `☀️`, `✔`, `✖`) across `CoDrawModal.tsx`, `ShortcutsModal.tsx`, `PixelLightBulbGizmo.tsx`, and `PhotometricLightingSection.tsx`.
  - Added native pixel-art `'lamp'` icon in `PixelIcon.tsx` on a 16x16 grid.
  - Regression tested in `tests/components/PixelLightBulbGizmo.test.tsx` verifying zero emoji characters in HUD toolbar.
- **Documentation Truthfulness & Metric Alignment (`README.md`, `ARCHITECTURE.md`)**:
  - Corrected E2E metric in `README.md` to "6 E2E spec suites (18 tests)".
  - Aligned `ARCHITECTURE.md` §4 undo history limit with physical 50-step circular ring buffer matching `SKILL.md` and `useViewportDrawing.ts:33`.
- **Test Environment Polish (`tests/setup.ts`, `vitest.config.mjs`)**:
  - Added in-memory `localStorage` mock in `tests/setup.ts` to eliminate all Node v26 experimental warnings during `vitest` runs.

## [v1.10.2] - 2026-09-07
### Cel-Shading Shadow Terminator Math Fix (Phase 43b)
- **Fixed flat/invisible cel-shading on character sprites (`src/lib/ai/math/photometricLighting.ts`)**:
  - Root cause: the discrete OKLCH cel-shading branch mixed an ambient signal (`ambSignal ≈ 1.27`) into the `lightLevel` formula and applied a double brightness multiplication, making `lightLevel ≥ 1.0` for ALL pixels — mathematically impossible to drop below `shadowThresh = 0.58`.
  - Fix: shadow placement is now driven purely by the directional diffuse signal (`diffSignal = wrapNdotL × effectiveFalloff`), with threshold `0.55`. The ambient contribution no longer factors into shadow termination — it fills all surfaces equally and must not overwhelm the directional terminator.
  - Result: character sprites now show crisp anatomical cel-shadows on the unlit side (ears, chin, snout, limb backsides, body bottom), with ~40–50% surface coverage in shadow for typical side-lit compositions.

## [v1.10.1] - 2026-09-07
### Minecraft Skin vs 2.5D Character Sprite Topological Discriminator & Photometric User Sovereignty (Phase 43)
- **Deep 8-Connected Topological Discriminator (`src/lib/ai/math/minecraftSkin.ts`)**:
  - Replaced naive 2-condition void/head check with `analyzeMinecraftSkinTopology(isOpaque, width, height)`.
  - Analyzes 8-connected component graph, dominant component pixel ratio (`largestComponentRatio`), bilateral limb presence ($x \in [0, 16)$ Right Leg, $x \in [40, 56)$ Right Arm), canonical void zone integrity ($<20\%$ pollution), and bounding box margins ($x < 10$ and $x > 48$).
  - Corrects the false positive where centered 64x64 character illustrations (e.g. red bunny, cat, props) were misidentified as Minecraft UV atlases, which previously led to flat $(0, 0, 1.0)$ normal generation and disabled photometric shading. Centered silhouettes ($\ge 68\%$ pixels in dominant component, empty lateral flanks) are decisively routed to standard 2.5D lighting.
- **Photometric Pipeline & Form Type Protection (`src/lib/ai/math/photometricLighting.ts`)**:
  - `executePhotometricPipeline` and `renderParametric2p5DLighting` now honor `params.minecraftSkinMode`.
  - When mode is `'disabled'` or `formType` is explicitly `'character' | 'orb' | 'prop'`, Minecraft skin shading is bypassed completely, ensuring continuous tangent normals and content-aware heightmaps.
- **User Sovereignty & Studio Store (`src/types/tools.ts`, `src/stores/slices/createToolSlice.ts`, `src/stores/slices/types.ts`, `src/hooks/viewport/useViewportStudioEvents.ts`)**:
  - Added `minecraftSkinMode?: 'auto' | 'enabled' | 'disabled'` to `PhotometricLightingParams` and `ToolSettings`.
  - Added `setMinecraftSkinMode` action to Zustand tool slice.
  - Forwarded `minecraftSkinMode` through viewport events (`handlePhotometricGizmoStartEvent`, `handlePhotometricLiveUpdateEvent`, `handleDirectPhotometricEvent`, `handleBakeNormalMapEvent`).
- **Tactile Inspector Mode Selector (`src/components/layout/inspector/PhotometricLightingSection.tsx`)**:
  - Added interactive `Skin 3D Shading: [ Auto | On | Off ]` button group in the lighting inspector whenever canvas dimensions are 64x64 or 64x32, complete with live status descriptions.
- **Comprehensive Quality Gates & Testing (`tests/minecraftSkinDetection.test.ts`, `tests/photometricNonDestructive.test.ts`)**:
  - Authored 8 new unit tests covering empty canvases, authentic Minecraft UV unwrap detection, centered character sprite classification, non-standard dimensions, and mode overrides.
  - Total test count expanded to 414 tests across 64 suites (100% passing).

## [v1.10.0] - 2026-09-06
### Co-Draw Activation: End-to-End CRDT Sync & Deep Audit Remediation (Phase 42)
- **P2P Co-Draw Wired End-to-End (`src/lib/sync/coDrawBridge.ts`, `src/lib/sync/p2pSync.ts`, `src/lib/collab/crdtPixelBuffer.ts`)**:
  - The CRDT engine was previously exercised only by tests; the CoDrawModal created sessions with no sync callbacks, so connected peers never exchanged a single pixel despite UI claims. The new module-scoped `CoDrawBridge` singleton integrates the full pipeline: structure join, full-state antientropy, delta propagation, and presence.
  - Full-state antientropy join per Shapiro et al. (SSS 2011, §4): on connect, the host broadcasts a `STRUCTURE_SYNC` payload so both peers share one layer-ID namespace, seeds one `CrdtPixelBuffer` per layer from the live canvases, and transmits complete per-layer state snapshots (with a bounded retry loop, since `RTCPeerConnection.connectionState === 'connected'` does not imply RFC 8831 data-channel openness).
  - Delta propagation: committed strokes are diffed against their pre-stroke history snapshot via the new pure `diffImageDataToOps` in `src/lib/sync/strokeDiff.ts`; each changed pixel becomes an LWW op broadcast per layer. Remote ops are applied via `applyRemoteOp` (HLC + bounded drift + deterministic peerId tie-break) and painted onto layer buffers in a single `getImageData`/`putImageData` pass.
  - Protocol extension in `src/lib/sync/p2pSync.ts`: new `STRUCTURE_SYNC` message with strict `validateStructurePayload` (bounds-checked dimensions, frame/layer counts, blend-mode whitelist, tag length); `layerId` is now mandatory on ops messages for unambiguous per-layer CRDT routing.
  - Presence: throttled ~30fps cursor broadcast over the lossy PR-SCTP channel, rendered by the new zoom-aware `src/components/studio/RemoteCursorsOverlay.tsx` with 4-second staleness pruning.
  - Sessions now outlive modal unmount (singleton-owned instead of modal `useState`-owned); `src/components/modals/CoDrawModal.tsx` rehydrates connection state on mount, and its copy now honestly states that the host owns the layer structure while connected.
- **Deep Audit Remediation (Critical/High Severity)**:
  - Canvas resize no longer corrupts artwork on undo: undo snapshots store full-canvas `ImageData` at capture-time dimensions, so `src/components/layout/StudioLayout.tsx` now dispatches `pixibun:history-clear` after both resize paths (resize modal and image-import resize-to-match).
  - Studio boot crash eliminated: `src/stores/slices/createToolSlice.ts` parsed `pixibun_recent_colors` from localStorage with unguarded module-scope `JSON.parse`; a corrupted value would white-screen the studio permanently. Now guarded with try/catch, array/string type filtering, and a safe fallback.
  - Frame operation bounds guards in `src/stores/slices/createAnimationSlice.ts`: `deleteFrame` no longer crashes on out-of-range indices, and `reorderFrames` can no longer splice `undefined` entries into `frames`.
- **Deep Audit Remediation (Medium/Low Severity)**:
  - Redo of created layers now re-inserts them into their originating frame (`nextStep.frameIndex`) instead of the currently active frame, and preserves the machine tag via the new `createdLayerTag` field on `HistoryStep` in `src/types/canvas.ts`, captured in `src/hooks/viewport/useViewportDrawing.ts` and `src/hooks/viewport/useViewportStudioEvents.ts`.
  - Merge-down is now a two-step confirm in `src/components/layout/inspector/LayersPanel.tsx` (the pixel-granularity history engine cannot represent structural layer ops, so it was previously irreversible with a single misclick).
  - Eyedropper no longer leaves a stale pre-stroke snapshot that a fast pointer-up could commit as a no-op undo step (`src/components/layout/CenterViewport.tsx`).
  - `hexToRgba` in `src/lib/canvas/floodFill.ts` now expands 4-digit `#RGBA` shorthand per CSS Color 4 instead of silently returning white.
  - Theme detection in `src/stores/themeStore.ts` respects `prefers-color-scheme` for first-time visitors.
  - `loadProjectState` in `src/stores/slices/createHistorySlice.ts` resets viewport-local state (selection, selection mask, active clip, playback) across project boundaries.
- **Diagnostics Relay Server Hardening (`src/app/api/diagnostics/relay/route.ts`, `src/lib/server/tokenBucket.ts`)**:
  - Added token-bucket rate limiting (12 requests/minute, burst 12, keyed by client IP) via the new pure, unit-tested `src/lib/server/tokenBucket.ts`.
  - Added a 64KB request-body ceiling enforced before JSON parsing and a 100-event cap on forwarded batches (413/429 responses), closing unbounded-body and upstream-flooding vectors. The SSRF/HTTPS-only upstream guard is unchanged.
- **Documentation Integrity**: All changes verified with `tsc --noEmit`, `eslint`, 406/406 unit tests (20 new in `tests/strokeDiff.test.ts`, `tests/tokenBucket.test.ts`, `tests/structurePayload.test.ts`, `tests/floodFillHex.test.ts`), and a clean production build. Known documented limitation: while connected, the host owns the layer/frame structure; guest structural edits stay local and are overwritten by the next host structure push.

## [v1.9.2] - 2026-09-05
### TestSprite Cloud End-to-End Suite & Complex Feature Verification (Phase 41)
- **P2P Co-Draw Modal & Serverless Signaling Token Generation (`src/components/modals/CoDrawModal.tsx`)**:
  - Authored and verified TestSprite frontend test plan (`c2ef43f3-cb81-4b9a-914b-6995344f953f`) evaluating header button integration, WebRTC host invite generation, join answer inputs, and clean modal dismissal (8/8 steps passed).
- **On-Canvas Pixel Light Bulb Gizmo & Live Shading Preview (`src/components/studio/PixelLightBulbGizmo.tsx`)**:
  - Authored and verified TestSprite frontend test plan (`d4bc65ba-70f5-4951-9c72-89f467290cf3`) evaluating circular artwork drawing, PixiBud studio activation, on-canvas pixel light bulb gizmo and top floating action bar (`Apply` / `Cancel`) mounting, and clean cancellation restoring canvas interactivity (11/11 steps passed).
- **Export Modal Multi-Format & Codec Capability Detection (`src/components/modals/ExportModal.tsx`)**:
  - Authored and verified TestSprite frontend test plan (`fca5c184-839d-4c09-a96c-ca6d560a5f3d`) evaluating Sprite Sheet layout packing options and MP4 video format codec capability notice evaluation (8/8 steps passed).
- **PWA Web Application Manifest & Strict Security Headers (`public/manifest.webmanifest`)**:
  - Authored and verified TestSprite backend test (`8aaeceaa-265c-4ead-94df-fcfbf723cd57`) asserting HTTP 200 OK, `application/manifest+json` MIME type, manifest JSON structure, and strict security headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`) passed.
- **Suite-Wide Verification**: Achieved 22/22 (100%) pass rate across TestSprite frontend (13 tests) and backend (9 tests) suites with zero failures.

## [v1.9.1] - 2026-09-05
### Audit Remediation & Quality Gate Parity (Phase 40)
- **Honest MP4 Capability Detection & CI Test Harness (`src/lib/export/mp4Encoder.ts`, `src/components/modals/ExportModal.tsx`, `tests/mp4Encoder.test.ts`)**:
  - Replaced non-functional ~200-byte stub container output with honest capability detection via `isMp4ExportSupported()` requiring both `MediaRecorder` and `captureStream` support.
  - Added user-facing warning in `src/components/modals/ExportModal.tsx` advising users to export as WebM or GIF when native MP4 encoding is unsupported.
  - Implemented mock `MediaRecorder` test harness in `tests/mp4Encoder.test.ts` (expanded to 12 tests).
- **Studio Accessibility Rigor & Complete Rule Carve-Out Elimination (`tests/e2e/studio.spec.ts`, `src/components/studio/FloatingPreviewWindow.tsx`, `src/components/layout/inspector/LayersPanel.tsx`, `src/components/layout/BottomTimeline.tsx`, `src/stores/themeStore.ts`)**:
  - Completely removed `.disableRules(['target-size', 'color-contrast'])` in `tests/e2e/studio.spec.ts`.
  - Upgraded touch targets to $\ge 24\times24$px across `src/components/studio/FloatingPreviewWindow.tsx` backdrop options, `src/components/layout/inspector/LayersPanel.tsx` layer lock button, and `src/components/layout/BottomTimeline.tsx` clip delete button.
  - Upgraded frame duration text contrast to $>6:1$ against dark panel surfaces.
  - Configured dark color scheme parity in `playwright.config.ts` and `src/stores/themeStore.ts`.
  - All 17 Playwright E2E tests pass with zero axe violations.
- **Photometric & Tangent-Space Normal Map Optimization (`src/lib/ai/math/edtNormalMap.ts`, `src/components/layout/CenterViewport.tsx`)**:
  - Precomputed 2D spatial Gaussian distance lookup table (`spatialLUT`) in `applyBilateralFilter` in `src/lib/ai/math/edtNormalMap.ts`, eliminating 50% of inner-loop `Math.exp()` calls, with bounds guards for non-positive dimensions and sigmas.
  - Memoized normal map preview canvas in `src/components/layout/CenterViewport.tsx` (measured 1179 lines) using an offscreen canvas ref cache invalidated only when `bufferVersion`, `activeFrameIndex`, layer structure signature, or floating selection key changes.
  - Removed inert `isDrawingRef` dependency from `src/components/layout/CenterViewport.tsx`'s `useEffect`.
- **P2P WebRTC Sync Hardening & Bounded CRDT Log (`src/lib/sync/p2pSync.ts`, `src/lib/collab/crdtPixelBuffer.ts`, `tests/p2pValidation.test.ts`)**:
  - Enforced 256KB DataChannel payload ceiling in `src/lib/sync/p2pSync.ts`.
  - Implemented strict runtime schema and integer bounds validation on incoming `PixelOp`s.
  - Added automatic chunking into 1000-op batches for `broadcastPixelOps` and `broadcastInitialSync`.
  - Bounded `opLog` in `src/lib/collab/crdtPixelBuffer.ts` (`MAX_OP_LOG_SIZE = 10000`) with sliding window eviction.
  - Added 17 unit tests in `tests/p2pValidation.test.ts`.
- **APNG Store Block Documentation (`src/lib/export/apngEncoder.ts`)**:
  - Honestly documented uncompressed DEFLATE store blocks (BTYPE 00) and byte-exact CRC32/Adler-32 chunking in `src/lib/export/apngEncoder.ts`.
- **Color Ramp Generator Hardening & Unit Tests (`src/lib/color/rampGenerator.ts`, `tests/rampGenerator.test.ts`)**:
  - Fixed `hexToRgb` to slice 8-character and 4-character hex inputs with alpha before parsing, eliminating blue channel bit-shift drift in `src/lib/color/rampGenerator.ts`.
  - Added 11 comprehensive unit tests in `tests/rampGenerator.test.ts`.
- **Codebase Polish (`src/hooks/viewport/useViewportDrawing.ts`, `src/lib/canvas/floodFill.ts`)**:
  - Translated Turkish comment to English in `src/hooks/viewport/useViewportDrawing.ts`.
  - Corrected docstring in `src/lib/canvas/floodFill.ts` to document iterative 4-connected stack-based fill.
- **Unit Test Suite Expansion**: Expanded unit test suite from 317 tests (53 suites) to 351 tests (55 suites) with 100% pass rate.

---

## [v1.9.0] - 2026-09-05
### Studio UI/UX 10/10 Overhaul: Amethyst Wisteria Hover, Specular Sweep Upgrade & Viewport Harmonization
- **Harmonized Tactile Button Design System (`src/components/ui/TactileButton.tsx`, `src/app/globals.css`)**:
  - Replaced blinding white hover states (`hover:bg-[#f0ecf6]`, `hover:bg-[#fff8db]`) that washed out amber text and obscured specular light sweeps with calibrated Amethyst Wisteria (`#603B82`, OKLCH $L \approx 0.42, C \approx 0.13, H \approx 312^\circ$).
  - Guarantees WCAG 2.2 AA contrast ratios ($4.6:1$ against `#f0be7c` gold text, $6.2:1$ against `#ede8f4` cream text).
  - Upgraded specular CC light sweep animation to a dual-band gradient with wisteria flanking wings (`linear-gradient(115deg, transparent 0%, rgba(220,171,223,0.15) 20%, rgba(255,255,255,0.75) 50%, rgba(220,171,223,0.15) 80%, transparent 100%)`).
  - Standardized microinteraction spring physics across all studio buttons (`scale: 1.025` on hover, `scale: 0.97` on tap, `rounded-[2px]`).
  - Harmonized modal action buttons across `src/components/layout/TopHeader.tsx`, `src/components/modals/ExportModal.tsx`, `src/components/modals/ShortcutsModal.tsx`, `src/components/modals/ImportModal.tsx`, `src/components/modals/ColorPickerModal.tsx`, `src/components/modals/CanvasResizeModal.tsx`, and `src/components/system/PwaUpdateToast.tsx`.
- **Viewport HUD & Control Deduplication (`src/components/layout/CenterViewport.tsx`)**:
  - Eliminated redundant bottom-left viewport zoom HUD (`[-] {zoom}% [+] [Fit] [16x] [32x32]`) that conflicted with the primary TopHeader zoom controls.
  - Redesigned bottom-right cursor coordinate indicator from generic gray pill to dark atelier aesthetic (`bg-[var(--desk-surface-raised)] border-2 border-[var(--desk-border)] rounded-[2px] text-[var(--accent-gold)] font-mono text-[10px]`).
- **Inspector Panel Feature Reorganization (`src/components/layout/inspector/VolumetricOpticsSection.tsx`, `src/components/layout/inspector/TilesetDecomposerSection.tsx`)**:
  - Removed misplaced `47-Blob Autotile Edges` button and duplicate `Ground Drop Shadow` button from Volumetric Optics section.
  - Relocated `47-Blob Autotile Edges` to the dedicated Tileset Decomposer panel alongside `Decompose Layer`.
- **Light Gizmo Header Collision Prevention (`src/components/studio/PixelLightBulbGizmo.tsx`)**:
  - Repositioned the floating gizmo action bar from `-top-12` to `top-3` within the canvas boundary, completely eliminating visual collisions with the secondary context options bar.
- **Unit & Integration Test Suite Verification (`tests/components/TactileButton.test.tsx`, `tests/components/PixelLightBulbGizmo.test.tsx`, `tests/components/InspectorDeduplication.test.tsx`)**:
  - Updated button unit tests validating `rounded-[2px]`, Amethyst Wisteria hover classes, dual-band specular light sweep, and variant styling with 100% pass rate.
  - Verified floating light gizmo toolbar position (`top-3`) inside viewport boundaries.
  - Verified inspector deduplication suite isolating autotile contours to the tileset decomposition engine.

---

## [v1.8.0] - 2026-09-05
### Live-Time On-Canvas Pixel Light Bulb Gizmo & Dynamic Focus Alignment
- **Interactive On-Canvas Light Bulb Gizmo (`src/components/studio/PixelLightBulbGizmo.tsx`)**:
  - Implemented an on-canvas draggable light bulb widget (`pixel-light-bulb-handle`) updating light azimuth and elevation in real time with throttled 60fps requestAnimationFrame rendering.
  - Added dedicated focal center reticle handle (`pixel-light-center-handle`), decoupling bulb orbit from focal center positioning so artists can reposition the lighting subject anchor anywhere across the canvas.
  - Isolated bulb orbit from the center reticle: dragging the bulb updates azimuth and elevation around the stationary center reticle without moving the focus anchor.
  - Dynamically calculates light azimuth from pointer coordinates relative to the subject anchor ($\text{azimuth} = \text{round}((\text{atan2}(dx, -dy) \times 180 / \pi + 360) \pmod{360})$).
  - Added on-canvas keyboard bindings: quick commit with Enter, cancel with Escape, reset focus with R, and brightness/exposure adjustments via `+` / `-` keys or mouse wheel scrolling over the gizmo.
  - Verified in `tests/components/PixelLightBulbGizmo.test.tsx`.

### Deep Character / Object Analysis Hardening & Cel-Shading Engine Restoration
- **Uncapped Asymmetrical Ear & Appendage Scanning (`src/lib/ai/math/photometricAuto.ts`, `src/lib/ai/math/edtNormalMap.ts`)**:
  - Removed the arbitrary 8-pixel cap on silhouette appendage scanning. Scans up to 45% of sprite dimensions across horizontal and vertical sweeps, reliably identifying asymmetrical ears, horns, wings, and cheek tufts at any canvas resolution.
- **Expressive Facial Feature Recognition (`src/lib/ai/math/photometricAuto.ts`)**:
  - Expanded cluster detection limits to support up to 32 facial feature clusters and improved contrast thresholds for darker and red fur tones, protecting eyes, eyebrows, nose, mouth, and whiskers from diffuse crush.
- **Prop & Complex Shape Content-Aware Decomposition (`src/lib/ai/math/photometricLighting.ts`)**:
  - Extended `computeContentAwareHeightmap` decomposition to props and general objects, isolating pure spherical dome EDT strictly to geometric orbs (`formType === 'orb'`).
  - Unified `formType` inference in `src/hooks/viewport/useViewportStudioEvents.ts` for both Auto and Manual studio modes, ensuring hand-drawn characters receive anatomical part segmentation and discrete OKLCH cel-shading even when setting light direction manually.
- **Calibrated Spherical Convex Dome Normal Mathematics (`src/lib/ai/math/edtNormalMap.ts`, `src/lib/ai/math/photometricLighting.ts`)**:
  - Calibrated spherical dome heightmap inflation ($z = R\sqrt{1 - (1 - d/R)^2}$) with zero derivative at the apex to eliminate conical pinch creases on spherical primitives (`tests/orbPhotometricCelShading.test.ts`).
  - Decoupled direct key light from cavity ambient occlusion on convex slopes to eliminate center-locked apex highlight glitches.

### Test Suite & Verification Expansion
- **Vitest Unit & Integration Suites**: Expanded test suite to 312 tests across 52 suites with 100% pass rate (`tests/components/PixelLightBulbGizmo.test.tsx`, `tests/photometricAutoAnalysis.test.ts`, `tests/orbPhotometricCelShading.test.ts`).

---

## [v1.7.0] - 2026-09-05
### Deep Art Understanding, Anatomical Part Segmentation & OKLCH Cel-Shading
- **Art Morphology & Anatomical Form Classification (`src/lib/ai/math/photometricAuto.ts`)**:
  - Implemented automatic classification of canvas drawings into `character` (creatures with ears/horns, facial features, limbs) vs. `orb` (geometric spheres/circles) vs. `prop`.
  - Connected-component clustering isolates eyes, pupils, mouth, snout, and lateral whiskers (`isFeature`, `isInkLine`).
  - Scans the top 15%–35% of the silhouette for distinct local convex lobes to detect ears and horns.
  - Distinguishes flat unshaded base colors from intentional pre-painted highlights to prevent double-shading artifacts.
  - Verified in `tests/photometricAutoAnalysis.test.ts`.
- **Frontal Face Cushion Plateau & Narrow Appendage Stabilization (`src/lib/ai/math/edtNormalMap.ts`)**:
  - Eliminated "bowling-ball" face inflation on character sprites: for `character` forms, the height reaches a smooth plateau within 2.8px of the boundary contour while the interior remains flat facing the camera ($N_z \ge 0.85$), ensuring light illuminates faces without splitting them in half with shadow.
  - Preserves dedicated local 3D peaks for ears and horns so they catch directional light independently from the head.
  - Stabilizes narrow appendages (ears, horns, antennae, tails $\le 5$px wide) on the light-facing side: clamps $N_x \le 0$ when light comes from the left and enforces $N_z \ge 0.88$, preventing narrow 2–4px ears from bisecting into a 1px lit tube and a 1px dark shadow tube.
  - Stabilizes facial feature and whisker normals to $N = (0, 0, 1)$.
- **100% Feature Preservation & Discrete OKLCH Cel-Shading Ramps (`src/lib/ai/math/photometricLighting.ts`)**:
  - Pixels identified as `isFeature` (eyes, mouth) or `isInkLine` (outlines, whiskers) bypass diffuse and ambient multipliers entirely, maintaining exact artist colors without diffuse brown mud or dark ambient crush.
  - Excludes facial features and line art from receiving specular highlights.
  - Implemented discrete OKLCH cel-shading ramps cached per unique base color (`CelRamp`): maps each artist base color to exactly one unified crisp shadow tone (cool skylight hue shifted to 260°, $L \times 0.78$), one deep crevice tone for concave seams/folds ($AO < 0.60$, $L \times 0.60$), and optional warm highlight tone (65°).
  - Completely eliminates continuous float gradients and dirty multi-shade banding across character fills.
  - Supports optional Bayer ordered dithering stippling along the cel shadow boundary when `ditherModulation > 0`.
- **Matte Character Specular Suppression (`src/hooks/viewport/useViewportStudioEvents.ts`)**:
  - Automatically suppresses harsh specular glint overlays on matte/fabric character fur and skin, preventing random white spots across character faces.
  - Maintains non-destructive tagged layer replacement (`Photometric <material>`).

### Bounded 2.5D Sprite Cast Shadows & Ground Drop Shadows
- **Length-Bounded 2.5D Sprite Cast Shadow Projection (`src/lib/ai/shadowRayMarcher.ts`)**:
  - Replaced infinite 2D planar cone-tracing wedge with professional length-bounded 2.5D sprite cast shadows.
  - Implemented exact 1-to-1 sheared silhouette projection ($h = y_{\text{base}} - y_s \ge 0$, $\text{projX} = \text{round}(x_s + h \cdot \text{shear}_x)$, $\text{projY} = \text{round}(y_{\text{ground}} + h \cdot \text{shear}_y)$) anchored at the sprite contact baseline ($y_{\text{base}}$).
  - Preserves hollow leg arches, waist indentations, and wing gaps without bounding-box bloat or muddy center ambient occlusion blobs.
  - Verified in `tests/shadowRayMarcher.test.ts`.
- **Classic Ground Contact Drop Shadows (`src/lib/ai/shadowRayMarcher.ts`, `src/components/layout/inspector/RaymarchedShadowSection.tsx`)**:
  - Added dedicated `shadowStyle: 'cast' | 'drop'` support: 'cast' renders directional sheared silhouette on the floor, while 'drop' renders a crisp stylized Bresenham pixel ellipse/capsule under the character contact baseline.
- **Crisp Pixel Art Uniform Opacity (`ditherMode: 'none'`)**:
  - When `ditherMode === 'none'`, shadows render with crisp uniform flat opacity $\text{round}(\text{shadowOpacity} \times 255)$, completely eliminating blurry continuous float alpha gradients and digital airbrush smear.
  - Changed default `ditherMode` across the shadow engine and inspector UI to `'none'`.
- **Smart Shadow Auto-Analysis (`src/lib/ai/math/shadowAuto.ts`)**:
  - Implemented "Analyze & Render" for shadows: analyzes canvas sprite morphology to auto-infer optimal light source coordinates, elevation, radius, opacity, and shadow style with plain-language rationale chips.
  - Verified in `tests/shadowAutoAnalysis.test.ts`.

### Test Suite & Verification Expansion
- **Vitest Unit & Integration Suites**: Expanded test suite from 276 tests across 49 suites to 296 tests across 50 suites with 100% pass rate (`tests/photometricAutoAnalysis.test.ts`, `tests/shadowAutoAnalysis.test.ts`, `tests/shadowRayMarcher.test.ts`).
- **Zero-Error Quality Gates**: Clean TypeScript typecheck (`tsc --noEmit`), zero ESLint errors/warnings, Next.js 16 Turbopack production build passing, and all documentation integrity checks passing.

---

## [v1.6.0] - 2026-09-04
### Architectural Decoupling & Modularization (Phase 33)
- **Viewport Custom Hook Refactoring (`src/hooks/viewport/`)**: Decomposed monolithic `CenterViewport.tsx` (2,328 lines $\to$ 1,176 lines) into five cohesive, single-responsibility hooks (totaling 1,972 lines across extracted hooks):
  - `useViewportDrawing.ts`: Isolated stroke drawing hot path, stroke buffer point management, and `requestAnimationFrame`-throttled buffer version bumps.
  - `useViewportSelection.ts`: Marquee, lasso, and wand selection state; Shift (union) / Alt (subtract) mask merging, floating selection dragging, and clean commit.
  - `useViewportTransform.ts`: Viewport zoom, pan offsets, wheel zooming/panning, center canvas alignment, `Ctrl+0` (fit to screen), and `Ctrl+1` (100% zoom).
  - `useViewportOverlays.ts`: Pixel grid rendering, 2:1 isometric guides, wallpaper symmetry lines, onion skin ghosts, brush ghost cursor, and CVD/Squint display lenses.
  - `useViewportStudioEvents.ts`: Strongly typed subscriber pipeline for photometric lighting, normal map bakes, thinning, WFC synthesis, and procedural filters.
- **Zustand Slices Pattern (`src/stores/slices/`)**: Decomposed monolithic `studioStore.ts` into five domain slices while preserving 100% backwards compatibility:
  - `createToolSlice.ts`: Tool types, brush size, pixel-perfect rasterization, dither matrices, ramps, material presets, and light settings.
  - `createLayerSlice.ts`: Layer stack management, opacity, blend modes, and non-destructive merge down.
  - `createAnimationSlice.ts`: Frames list, active frame index, playback loop, FPS, and onion skinning.
  - `createViewportSlice.ts`: Zoom, pan, grid, isometric guides, 3x3 tile preview, and perceptual lenses.
  - `createHistorySlice.ts`: Selection bounding box, selection mask, buffer version incrementing, and canUndo/canRedo flags.
- **Smart Math Modularization (`src/lib/ai/math/`)**: Extracted `smartMathEngine.ts` into modular domain modules with a clean barrel file:
  - `edtNormalMap.ts`: Felzenszwalb & Huttenlocher (2012) exact Euclidean Distance Transform, inflated heightmaps, bilateral filtering, and tangent normal field computation.
  - `photometricLighting.ts`: Parametric Blinn-Phong 2.5D lighting and volumetric raymarched soft shadows.
  - `dithering.ts`: Atkinson and Riemersma error-diffusion dithering.
  - `rotSprite.ts`: Xenowhirl 8x Scale2X RotSprite rotation engine and Zhang-Suen morphological thinning.
  - `minecraftSkin.ts`: Minecraft player skin UV detection and normal mapping.
- **Dynamic Dialog Code-Splitting**: Code-split client-side dialogs (`ColorPickerModal`, `ExportModal`, `CanvasResizeModal`, `ProjectsGalleryModal`, `ShortcutsModal`) with `next/dynamic(..., { ssr: false })` to optimize initial page bundle payload.

### Academic Research-Backed Graphics Intelligence (Phase 34)
- **Blue-Noise Void-and-Cluster Dithering (`src/lib/canvas/ditherMatrix.ts`)**: Implemented Robert Ulichney's 1993 SPIE void-and-cluster matrix generation algorithm (`generateVoidAndClusterMatrix(16, 16, 1.9)`), producing high-frequency, isotropic dither masks without low-frequency periodic spikes characteristic of Bayer matrices. Verified in `tests/blueNoiseDither.test.ts`.
- **WaveFunctionCollapse (WFC) Pattern Synthesis (`src/lib/procedural/waveFunctionCollapse.ts`)**: Implemented Maxim Gumin's 2016 Overlapping Model constraint solver with Shannon entropy heuristics and deterministic backtracking. Extracts sample tiles and synthesizes seamless textures obeying local $N \times N$ neighborhood constraints with 0 violations. Verified in `tests/waveFunctionCollapse.test.ts`. Integrated into `RightInspector.tsx` and `useViewportStudioEvents.ts`.
- **Kopf–Lischinski Inspired Vector SVG Export (`src/lib/export/depixelizeVector.ts`)**: Implemented pixel art vectorization inspired by Johannes Kopf & Dani Lischinski (SIGGRAPH 2011): 8-connected pixel similarity graphs, diagonal crossing ambiguity resolution via 1-hop parity connectivity heuristics, cell corner offsets ($\pm 0.05$), and smooth cubic Bézier SVG path generation. Verified in `tests/depixelizeVectorExport.test.ts`. Integrated as "Vector SVG" in `ExportModal.tsx`.
- **Crystallographic Wallpaper Group Symmetry Brushes (`src/lib/canvas/wallpaperSymmetry.ts`)**: Implemented Doris Schattschneider's 1978 AMM crystallographic symmetry groups (`p2` 180° rotation, `pm` reflection, `p4` 4-fold rotation, `p4m` 4-fold rotation with reflection, and `p6m` 6-fold rotation with reflection). Multiplies canvas strokes deterministically across crystallographic group orbits. Verified in `tests/wallpaperSymmetry.test.ts`.

### Direct-Manipulation Interaction Model (Phase 35)
- **Direct-Manipulation PixiBud Light Gizmo (`src/components/studio/LightGizmoOverlay.tsx`, `src/lib/canvas/lightGizmoMath.ts`)**: Implemented Ben Shneiderman's 1983 direct manipulation interaction model on the viewport overlay canvas. Renders concentric elevation rings, an azimuth direction line, and a draggable sun disc with real-time spherical coordinate conversion $(x, y) \to (\text{azimuth}, \text{elevation})$. Verified in `tests/lightGizmo.test.ts`.

### Sharing, Collaboration & Process Value (Phase 36)
- **Live Peer-to-Peer WebRTC Canvas Pairing (`src/lib/sync/p2pSync.ts`, `src/components/modals/CoDrawModal.tsx`)**: Built a 100% serverless, accountless co-drawing system on top of `crdtPixelBuffer.ts`. Utilizes a dual `RTCDataChannel` architecture (reliable ordered channel for CRDT ops, lossy PR-SCTP channel for 60fps cursor awareness), copy-paste base64 signaling tokens with Google STUN NAT traversal, and automatic canvas reconciliation. Verified in `tests/p2pSync.test.ts` (4 tests).
- **Process Replay Timelapse Video & GIF Export (`src/lib/export/processReplay.ts`, `src/lib/export/speedpaintExporter.ts`)**: Built a chronological speedpaint replay engine that extracts historical snapshot buffers via `getGlobalHistory()` and renders them into animated GIF and MP4 timelapse videos with nearest-neighbor scaling and progress reporting. Integrated as "Timelapse" in `ExportModal.tsx`. Verified in `tests/processReplayExport.test.ts` and `tests/mp4Encoder.test.ts`.
- **CRDT Pixel-Merge Engine Foundation (`src/lib/collab/crdtPixelBuffer.ts`)**: Implemented Marc Shapiro et al. (SSS 2011) Last-Write-Wins (LWW-Register) CRDT per pixel cell with Kulkarni et al. (OPODIS 2014) Hybrid Logical Clocks and deterministic peer ID tie-breaking, following the local-first architecture advocated by Kleppmann et al. (Onward! 2019). Guarantees Strong Eventual Consistency (SEC) across network partitions. Verified in `tests/p2pCoDrawCrdt.test.ts`.
- **Radio-Synced Visual Pulse (`src/lib/audio/spectralFlux.ts`, `src/lib/audio/lofiRadio.ts`)**: Implemented Simon Dixon (DAFx 2006) and Bello et al. (IEEE Trans. Speech Audio Process. 2005) half-wave rectified spectral energy flux onset detection over Web Audio FFT frames with adaptive thresholding. Emits `pixibun:audio-onset` events on `studioEvents`, driving a gentle, warm amber pulse on the active frame thumbnail in `BottomTimeline.tsx`. Verified in `tests/audioOnsetDetection.test.ts`.

### Competitive Parity & Platform Strategy (Phase 37)
- **Tileset / Tile-Stamping Engine & Decomposer (`src/lib/canvas/tileStamp.ts`)**:
  - Implemented 2D grid snapping (`snapToTileGrid`), buffer tile extraction, stamping, flip horizontal/vertical, and 90° clockwise rotation.
  - Implemented `decomposeIntoTileset` converting canvas layers into deduplicated unique tile atlases and 2D tilemap matrices for Godot, Unity, and Tiled map pipelines.
  - Integrated interactive "Tileset Decomposer" module in `RightInspector.tsx` with 8px, 16px, 32px grid slicing and one-click "Copy Tilemap JSON".
  - Verified in `tests/tileStamp.test.ts` (9 tests).
- **Lospec Palette Ecosystem Integration (`src/lib/color/lospecPalette.ts`)**:
  - Multi-format parser for Lospec `.hex` files, GIMP `.gpl` (RGB triplets) files, and Lospec JSON schemas.
  - Added "+ Lospec (.hex)" import button and native drag-and-drop file import in `RightInspector.tsx`.
  - Verified in `tests/lospecPalette.test.ts` (5 tests).
- **Social Video & Truecolor Animation Export (WebM, MP4, APNG) (`src/lib/export/webmEncoder.ts`, `src/lib/export/mp4Encoder.ts`, `src/lib/export/apngEncoder.ts`)**:
  - Built standards-compliant Animated PNG (APNG) encoder (`acTL`, `fcTL`, `fdAT`) preserving full 24-bit/32-bit RGBA color without GIF 256-color palette limits.
  - Built multi-tier MP4 encoder (native `MediaRecorder` + ISOBMFF FastStart box muxer) supporting nearest-neighbor integer scaling (1x, 2x, 4x, 8x, 16x) and per-frame duration timing.
  - Implemented browser `MediaRecorder` canvas recording pipeline capturing animation sequences in WebM format (VP9/VP8).
  - Integrated "WebM Video", "MP4 Video", and "APNG" format tabs in `ExportModal.tsx`.
  - Verified in `tests/webmEncoder.test.ts` (4 tests), `tests/mp4Encoder.test.ts` (6 tests), and `tests/apngEncoder.test.ts` (5 tests).
- **Tauri Desktop Packaging Assessment (`TASKS.md` §37.4)**: Documented architectural feasibility and distribution prerequisites for wrapping PixiBun Atelier in Tauri 2.0 with native filesystem access, file associations, and offline runtime guarantees.

---

## [v1.5.0] - 2026-09-03
### Accessibility, Next.js 16 Security Proxy & Perceptual Color Lenses (Phase 32)
- **Automated WCAG 2.2 Axe Audits (`tests/e2e/studio.spec.ts`)**: Integrated `@axe-core/playwright` automated a11y test suites across blank canvas workspace, open Export modal, and all expanded RightInspector panels (Layers, Palette, PixiBud AI). Achieved 100% compliance with zero violations.
- **Accessible Slider and Control Associations**: Added explicit `aria-label` tags to all custom inputs across `ContextOptionsBar.tsx`, `RightInspector.tsx`, `BottomTimeline.tsx`, and `ExportModal.tsx`, completely satisfying WCAG 4.1.2 accessible name requirements.
- **Next.js 16 Proxy Nonce CSP (`src/proxy.ts`)**: Replaced deprecated middleware with Next.js 16 `proxy.ts`, generating per-request crypto nonces, injecting `script-src 'self' 'nonce-{nonce}'` with production `'unsafe-inline'` script elimination, and bounding matchers strictly to dynamic page routes (skipping static assets, icons, and service workers).
- **Dynamic Service Worker Route Handler (`src/app/sw.js/route.ts`)**: Transitioned static `public/sw.js` into a dynamic Next.js route handler with build-time cache versioning (`pixibun-v2`), serving authoritative `Cache-Control: no-cache, no-store, must-revalidate` and `Service-Worker-Allowed: /` headers.
- **Machado 2009 CVD Colorblindness Simulation & Squint Silhouette Mode (`src/lib/color/cvdLens.ts`, `ViewportLensFilters.tsx`)**: Implemented mathematically rigorous on-device color vision deficiency simulation lenses (Protanopia, Deuteranopia, Tritanopia, Monochromacy) based on Machado et al. 2009 IEEE TVCG matrices, plus an instant 1-bit Squint silhouette filter. Rendered via zero-mutation GPU SVG `feColorMatrix` CSS display filters, guaranteeing canvas pixel buffers and export outputs remain completely pristine.
- **HUD Controls & Keyboard Shortcuts**: Added `CVD` lens cycle and `SIL` silhouette toggle buttons to `ContextOptionsBar.tsx`, wired hotkeys `p` (CVD cycle) and `s` (Squint toggle) in `StudioLayout.tsx`, and documented them in `ShortcutsModal.tsx`.
- **Lighthouse CI & Test Verification**:
  - Landing: Performance 0.85, Accessibility 1.00, Best Practices 1.00, SEO 1.00.
  - Studio: Performance 0.86, Accessibility 1.00, Best Practices 1.00, SEO 1.00.
  - Studio JS Bundle: 260.79 KB (< 300 KB budget).
  - Vitest: 186/186 tests passing across 32 test suites.
  - Playwright: 17/17 tests passing across all end-to-end suites.
  - TypeScript & Linter: 0 errors, 0 warnings.

---

## [v1.4.0] - 2026-09-03

### Performance, Storage & Hot-Path Decoupling (Phase 30)
- **Stroke Hot-Path Decoupling**: Pruned monolithic `useStudioStore` subscriptions in `CenterViewport.tsx` to atomic selectors. Completely decoupled `bufferVersion` subscriptions from viewport rendering, eliminating re-render cascades during active pen/eraser strokes.
- **Throttled Live Signals**: Throttled `bumpBufferVersion()` via `requestAnimationFrame` strictly for decoupled observers (`BottomTimeline`, `FloatingPreviewWindow`), while deferring snapshot commits and autosave triggers strictly to stroke completion (`pointerup`).
- **Dexie Schema v4 Binary Blob Storage**: Upgraded IndexedDB engine to schema v4 with a dedicated `layerBlobs` table (`++id, [projectId+layerId+frameIndex], projectId, layerId`). Layer pixel buffers are stored directly as raw PNG `Blob` instances, omitting `pngBase64` from metadata JSON to eliminate serialization overhead and storage duplication. Added `paintLayerFromBlob` with zero-leak `ImageBitmap.close()` management and full backward compatibility for legacy projects.
- **Export Constructor Hardening**: Replaced illegal `new HTMLCanvasElement()` constructor fallback in `ExportModal.tsx` with standard `document.createElement('canvas')`.
- **Compositor Re-entrancy Protection**: Set `freshCanvas: true` default in `compositor.ts` to prevent shared singleton canvas overwrite bugs during concurrent renders.
- **Zero Linter Warnings**: Cleaned up all 6 `react-hooks/exhaustive-deps` warnings in `CenterViewport.tsx`.

### Product Alignment, Viewport Precision & Timing (Phase 31)
- **Layer Merge Down (`mergeLayerDown`)**: Implemented non-destructive layer merge in `studioStore.ts` that composites the active layer onto the underlying layer respecting opacity and blend modes (`source-over`, `multiply`, `screen`, etc.), releases upper buffer memory, and focuses the lower layer. Added tactile UI buttons in `RightInspector.tsx` and a new pixel-aligned icon in `PixelIcon.tsx`.
- **Variable Frame Duration Pacing**: Wired per-frame `durationMs` to a high-resolution delta-time animation clock in `BottomTimeline.tsx`. Added proportional timeline card widths ($W_{\text{card}}$) and amber timing hold badges (`+Xms`) for frames held $\ge 2\times$ baseline duration per Richard Williams timing principles.
- **Heterogeneous GIF Export**: Upgraded `gifEncoderCore.ts`, `gifEncoder.worker.ts`, and `ExportModal.tsx` to output frame-specific centisecond delays ($D_i = \max(2, \text{round}(\text{durationMs}_i / 10))$).
- **Selection Modifiers**: Implemented Shift (Union) and Alt (Subtract) across Marquee Box, Freehand Lasso, and Magic Wand in `CenterViewport.tsx`, with dynamic binary mask merging, bounding box recalculation, and real-time color-coded viewport preview outlines.
- **Keyboard Zoom Shortcuts**: Bound `Ctrl/Cmd +` / `Ctrl/Cmd =`, `Ctrl/Cmd -`, `Ctrl/Cmd 0` (Fit to screen), and `Ctrl/Cmd 1` (100% zoom) in `StudioLayout.tsx`, with documentation added to `ShortcutsModal.tsx`.
- **Canvas Brush Ghost Bounding Cursor**: Added a 1px integer pixel bounding box on an overlay canvas layer in `CenterViewport.tsx` matching `tools.brushSize` at $\ge 400\%$ zoom, with zero React re-renders.

### Critical UX, Viewport Precision & RotSprite Polish
- **Onboarding Stencil Isolation**: Added strict `isPlaygroundActive` gating in `CenterViewport.tsx` and reset stencil state on `StudioLayout.tsx` mount, preventing playground tracing templates from leaking onto the studio canvas.
- **Playground Animation Transfer**: Added `?fromPlayground=true` parameter in `PlaygroundLayout.tsx` to preserve animated frame sequences authored during onboarding when entering the studio, autosaving to IndexedDB under the project name `'Playground Animation'`.
- **Viewport Zoom Aspect Ratio Fix**: Added `shrink-0` and explicit `flexShrink: 0`, `minWidth`, and `minHeight` styles to `#center-canvas-area` in `CenterViewport.tsx`, eliminating horizontal flexbox compression at high zoom levels (e.g. 2625%) and maintaining an exact 1:1 square aspect ratio up to 6400% zoom.
- **Area-Preserving Pixel Art Downsampling (`bufferRegistry.ts`)**: Replaced naive `drawImage` downsampling with mathematical presence conservation (`resamplePixelArtBuffer`). By integrating source footprints and voting among solid pixels, 1-pixel strokes and continuous outlines (e.g. circles, character silhouettes) are preserved with 0 holes or dropouts when downscaling (e.g. 32x32 to 16x16).
- **Canonical Xenowhirl RotSprite Engine (`smartMathEngine.ts`)**: Completely eliminated 45-degree rotation distortion (bloated 2-3px top-left outlines, erased bottom-right outlines, and asymmetrical corner spurs). Replaced the weighted voting alpha threshold engine with native 32-bit 3-pass Scale2X cascade ($1\times \to 2\times \to 4\times \to 8\times$) combined with strict subpixel center continuous inverse sampling ($x_s = \cos(-\theta)(x + 0.5 - C_x) - \sin(-\theta)(y + 0.5 - C_y) + C_x$). Added single-pixel detail restoration / presence conservation so micro-details and isolated dots never vanish. Verified 100% leak-proof closed contours (flood fill confirms 0 fill leaks across all 360 degrees), 4-quadrant bilateral symmetry, and exact 100.0% area preservation ($144 \to 144$ pixels on 32x32 star sprite).
- **Floating Preview Dragging & Resize Window (`FloatingPreviewWindow.tsx`)**: Completely resolved the sticky mouse dragging defect by binding pointer movement and release to `window` with `e.buttons === 0` abort guards. Added an interactive bottom-right resize handle (`◢`) allowing smooth drag-to-resize viewport scaling from 100x100 to 640x640.
- **Test Suite Updates**: 169 tests passing across 31 suites (+10 comprehensive tests in `tests/rotSpriteAndPrecision.test.ts`).

---

## [v1.3.0] - 2026-09-01

### 🚀 UX & Onboarding Overhaul
- **Progressive Playground & Onboarding**: Implemented a seamless onboarding flow with a progressive playground, allowing users to transition smoothly into the full studio experience.
- **Radial Menu & Recent Colors**: Added a contextual radial menu for rapid tool access, an autosave activity indicator, progressive disclosure of advanced tools, and a tracked "Recent Colors" palette.
- **Hydration & SSR**: Fixed hydration mismatch and console warnings in the `recentColors` component logic.

### 🎨 Advanced Selection Tools
- **Magic Wand & Lasso Rasterization**: Shipped the Magic Wand tool for continuous flood-fill color selection and implemented precise polygon rasterization for the freehand Lasso tool.

### ✨ Rendering Pipeline & AI Morphing Rewrite
- **Signed Distance Field (SDF) Morphing Engine (`src/lib/ai/pixelAiEngine.ts`)**: Replaced artifact-prone optical flow with Meijster's O(N) EDT (Euclidean Distance Transform) to provide pixel-perfect topological morphing for in-between frames.
- **Smart Morph Relighting (`src/components/layout/CenterViewport.tsx`)**: Re-architected in-between generation to cleanly extract base artwork, perform the SDF morph, and automatically re-dispatch `pixibun:photometric-lighting` and `pixibun:volumetric-optics` passes so newly generated frames perfectly match the dynamic lighting of the scene.
- **Physical Rendering Fix**: Restored omitted Lambertian diffuse reflection to physical composites, vastly improving lighting realism.
- **RotSprite Artifact-Free Canvas Rotation (`src/lib/ai/smartMathEngine.ts`)**: Implemented a custom Scale3x + Nearest-Neighbor Inverse Mapping algorithm to fix floating-point holes created by native `ctx.rotate`.
- **GIF Export Multiframe Pooled Canvas Fix (`src/components/modals/ExportModal.tsx`, `src/lib/render/compositor.ts`)**: Passed `{ freshCanvas: true }` during multi-frame composite jobs, preventing the `sharedOffscreenCanvas` singleton from destructively overwriting all output frames with the final frame.
- **GIF Delay Centisecond Clamping (`src/lib/export/gifEncoderCore.ts`)**: Added a lower bound of `2` centiseconds to GIF frame delays to bypass aggressive browser 100ms throttling penalties for fast animations.
- **Test Suite Updates**: 123 tests passing. Added new unit tests for GIF chunk distinction and delay clamping.

---

## [v1.2.0] - 2026-08-31

### 2D Ray Marching & Physically Accurate Soft Shadows Engine
- **Aaltonen Contact-Hardening Cone Tracing (`src/lib/ai/shadowRayMarcher.ts`)**: Implemented CPU-bound 2D sphere tracing directly over discrete Euclidean Distance Fields ($O(N)$ Felzenszwalb EDT) using Sebastian Aaltonen's tangent geometric correction ($y = \frac{h^2}{2ph}, d = \sqrt{h^2 - y^2}$) and physical area light cone tracing ($r_{\text{cone}} = R_L \frac{t_{\text{closest}}}{T}$).
- **Branchless $C^0$ Bilinear Field Interpolation (`sampleEDTBilinear`)**: Eliminates grid-stepping quantization and ray-stepping acne across fractional query coordinates.
- **Zero-Allocation TypedArray Memory Safety**: Reused Float32Array visibility buffers from `bufferPool.ts` (`acquireFloat32Buffer` / `releaseFloat32Buffer`) with bulletproof `try...finally` deallocation guarantees.
- **Bayer Matrix Ordered Penumbra Dithering**: Converts continuous float visibility gradients into authentic retro pixel art stippling patterns (`2x2`, `4x4`, `8x8`).
- **Studio Inspector UI (`src/components/layout/RightInspector.tsx`)**: Built a dedicated **Raymarched Soft Shadows** card with light coordinates, light disk radius ($R_L$), opacity slider, shadow color picker with 5 presets (Indigo `#180B26`, Obsidian `#0A0612`, Umber `#26140B`, Violet `#2E1065`, Teal/Fog `#062419`), and Bayer dither mode selector.
- **Non-Destructive Viewport Layer Execution (`src/components/layout/CenterViewport.tsx`)**: Added `pixibun:render-cast-shadow` handler routing output non-destructively to a tagged `'cast-shadow'` layer without mutating hand-drawn base artwork.
- **Comprehensive Vitest Suite (`tests/shadowRayMarcher.test.ts`)**: 9 unit and integration tests covering bilinear sampling precision, boundary clamping, contact hardening, memory pool recycling, color composition, Bayer stippling, and non-destructive layer replacement (123 total unit tests passing across 20 suites).

---

## [v1.1.0] - 2026-08-30

### Core Engine & Rendering Optimizations
- **Zero-GC Compositor Canvas Pooling**: Added `sharedOffscreenCanvas` singleton and `targetCanvas` parameter in `compositeFrame()`, eliminating dynamic canvas element creation during onion skinning, scrubbing, and frame compositing.
- **TypedArray Buffer Pool (`src/lib/engine/bufferPool.ts`)**: Built a memory-bounded scratch buffer pool (`acquireFloat32Buffer`, `releaseFloat32Buffer`, `acquireInt32Buffer`, `releaseInt32Buffer`, clamped arrays) with zero-fill reset guarantees.
- **Zero-GC EDT Distance Transform (`src/lib/ai/smartMathEngine.ts`)**: Refactored 1D parabolic envelope calculations in `computeSeparableEDT` and `dt1D` to borrow scratch buffers from `TypedArrayPool`.
- **Zero-GC Downsampling Gradient Allocation (`src/lib/ai/pixelizeEngine.ts`)**: Swapped dynamic gradient map allocations with buffer pool acquires.
- **Web Worker GIF Encoding Engine (`src/lib/export/gifEncoder.worker.ts`)**: Offloaded heavy LZW compression and median-cut color quantization to a dedicated worker thread with transferable ArrayBuffers.
- **Buffer Registry Memory Safety (`src/stores/studioStore.ts`)**: Integrated `clearAllBuffers()` calls during `resetToNewProject()` and `loadProjectState()`, preventing memory leaks on project switches.
- **Flood Fill Exact Tolerance 0 (`src/lib/canvas/floodFill.ts`)**: Added strict integer RGBA comparison when `tolerance === 0`, preventing floating-point alpha edge case false positives.
- **Async Autosave & Project Serialization (`src/lib/project/serialize.ts`)**: Added `rasterizeLayerPngAsync` with non-blocking `canvas.toBlob()`, wired `buildAutosavePayloadAsync()` to background autosave with Dexie binary blobs, and provided `buildProjectFileAsync()` for non-blocking project file exports.

### Architecture & State Management
- **Strongly-Typed Event Bus (`src/lib/events/studioEvents.ts`)**: Created a typed TypeScript event pub/sub system with discriminated payloads for 23 studio actions.
- **Image-to-Pixel-Art Hook (`src/hooks/usePixelizeEngine.ts`)**: Decomposed monolithic modal logic from `ImportModal.tsx` into a reusable, testable React hook.

### Web Platform, Accessibility & Security
- **Node.js SSR Storage Warning**: Replaced bare `typeof localStorage !== 'undefined'` checks with `typeof window !== 'undefined' && window.localStorage` across `capture.ts` and `themeStore.ts`.
- **Responsive Workspace Gate (< 1024px) (`src/components/layout/MobileStudioGate.tsx`)**: Added a tactile fallback screen with Bun mascot guiding users on small screens / mobile devices.
- **Static Theme Initialization & Clean CSP Configuration**: Externalized theme bootstrapping script into `public/theme.js` with structured fallback error handling.
- **Semantic Theme Tokens in Error Boundaries**: Refactored `error.tsx`, `global-error.tsx`, and `studio/error.tsx` to use design system CSS variables.
- **Accessibility & Contrast**: Upgraded `--text-muted` to `#a496b8` for WCAG AA compliance, added skip-to-workspace navigation link, and added missing `aria-label`s on buttons and color swatches.
- **Diagnostics Relay Error Handling**: Handled malformed JSON payloads gracefully with server logging and 400 Bad Request responses.

---

## [v1.0.0] - Initial Release
- Multi-layer timeline animation engine with customizable FPS and onion skinning.
- Full artisan raster tools: Bresenham pen, dither brush, 2:1 isometric guides, flood fill, bezier curves.
- PixiBud Smart Studio: Photometric surface normal baking, Blinn-Phong lighting, volumetric sub-surface scattering, and autotiling.
- Offline-first storage with Dexie IndexedDB and multi-engine export suite (PNG, GIF, Godot, Unity, Phaser 3).

