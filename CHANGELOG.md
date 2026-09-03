# PixiBun Atelier — Changelog

All notable changes and architectural enhancements to the PixiBun Atelier codebase are documented below.

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
- **Selection Bounding Box & Undo History Restorations**: Fixed Lasso tool boundary drag locking and prevented `Ctrl+Z` hole-punching bugs by capturing snapshot buffers strictly pre-erasure.
- **Test Suite Updates**: 123 tests passing. Added new unit tests for GIF chunk distinction and delay clamping.

---

## [v1.2.0] â€” 2026-08-31

### â˜€ï¸ 2D Ray Marching & Physically Accurate Soft Shadows Engine
- **Aaltonen Contact-Hardening Cone Tracing (`src/lib/ai/shadowRayMarcher.ts`)**: Implemented CPU-bound 2D sphere tracing directly over discrete Euclidean Distance Fields ($O(N)$ Felzenszwalb EDT) using Sebastian Aaltonen's tangent geometric correction ($y = \frac{h^2}{2ph}, d = \sqrt{h^2 - y^2}$) and physical area light cone tracing ($r_{\text{cone}} = R_L \frac{t_{\text{closest}}}{T}$).
- **Branchless $C^0$ Bilinear Field Interpolation (`sampleEDTBilinear`)**: Eliminates grid-stepping quantization and ray-stepping acne across fractional query coordinates.
- **Zero-Allocation TypedArray Memory Safety**: Reused Float32Array visibility buffers from `bufferPool.ts` (`acquireFloat32Buffer` / `releaseFloat32Buffer`) with bulletproof `try...finally` deallocation guarantees.
- **Bayer Matrix Ordered Penumbra Dithering**: Converts continuous float visibility gradients into authentic retro pixel art stippling patterns (`2x2`, `4x4`, `8x8`).
- **Studio Inspector UI (`src/components/layout/RightInspector.tsx`)**: Built a dedicated **Raymarched Soft Shadows** card with light coordinates, light disk radius ($R_L$), opacity slider, shadow color picker with 5 presets (Indigo `#180B26`, Obsidian `#0A0612`, Umber `#26140B`, Violet `#2E1065`, Teal/Fog `#062419`), and Bayer dither mode selector.
- **Non-Destructive Viewport Layer Execution (`src/components/layout/CenterViewport.tsx`)**: Added `pixibun:render-cast-shadow` handler routing output non-destructively to a tagged `'cast-shadow'` layer without mutating hand-drawn base artwork.
- **Comprehensive Vitest Suite (`tests/shadowRayMarcher.test.ts`)**: 9 unit and integration tests covering bilinear sampling precision, boundary clamping, contact hardening, memory pool recycling, color composition, Bayer stippling, and non-destructive layer replacement (123 total unit tests passing across 20 suites).

---

## [v1.1.0] â€” 2026-08-30

### ðŸš€ Core Engine & Rendering Optimizations
- **Zero-GC Compositor Canvas Pooling**: Added `sharedOffscreenCanvas` singleton and `targetCanvas` parameter in `compositeFrame()`, eliminating dynamic canvas element creation during onion skinning, scrubbing, and frame compositing.
- **TypedArray Buffer Pool (`src/lib/engine/bufferPool.ts`)**: Built a memory-bounded scratch buffer pool (`acquireFloat32Buffer`, `releaseFloat32Buffer`, `acquireInt32Buffer`, `releaseInt32Buffer`, clamped arrays) with zero-fill reset guarantees.
- **Zero-GC EDT Distance Transform (`src/lib/ai/smartMathEngine.ts`)**: Refactored 1D parabolic envelope calculations in `computeSeparableEDT` and `dt1D` to borrow scratch buffers from `TypedArrayPool`.
- **Zero-GC Downsampling Gradient Allocation (`src/lib/ai/pixelizeEngine.ts`)**: Swapped dynamic gradient map allocations with buffer pool acquires.
- **Web Worker GIF Encoding Engine (`src/lib/export/gifEncoder.worker.ts`)**: Offloaded heavy LZW compression and median-cut color quantization to a dedicated worker thread with transferable ArrayBuffers.
- **Buffer Registry Memory Safety (`src/stores/studioStore.ts`)**: Integrated `clearAllBuffers()` calls during `resetToNewProject()` and `loadProjectState()`, preventing memory leaks on project switches.
- **Flood Fill Exact Tolerance 0 (`src/lib/canvas/floodFill.ts`)**: Added strict integer RGBA comparison when `tolerance === 0`, preventing floating-point alpha edge case false positives.
- **Pixel-Perfect 8-Way Connectivity (`src/lib/canvas/rasterMath.ts`)**: Enforced Chebyshev distance connectivity check (`Math.abs(dx) <= 1 && Math.abs(dy) <= 1`) before dropping corner pixels.
- **Async Autosave Serialization (`src/lib/project/serialize.ts`)**: Added `rasterizeLayerPngAsync` with non-blocking `canvas.toBlob()` and wired `buildProjectFileAsync()` to background autosave.

### ðŸ—ï¸ Architecture & State Management
- **Strongly-Typed Event Bus (`src/lib/events/studioEvents.ts`)**: Created a typed TypeScript event pub/sub system with discriminated payloads for 23 studio actions.
- **Image-to-Pixel-Art Hook (`src/hooks/usePixelizeEngine.ts`)**: Decomposed monolithic modal logic from `ImportModal.tsx` into a reusable, testable React hook.

### ðŸŒ Web Platform, Accessibility & Security
- **Node.js SSR Storage Warning**: Replaced bare `typeof localStorage !== 'undefined'` checks with `typeof window !== 'undefined' && window.localStorage` across `capture.ts` and `themeStore.ts`.
- **Responsive Workspace Gate (< 1024px) (`src/components/layout/MobileStudioGate.tsx`)**: Added a tactile fallback screen with Bun mascot guiding users on small screens / mobile devices.
- **Static Theme Initialization & Clean CSP Configuration**: Externalized theme bootstrapping script into `public/theme.js` with structured fallback error handling.
- **Semantic Theme Tokens in Error Boundaries**: Refactored `error.tsx`, `global-error.tsx`, and `studio/error.tsx` to use design system CSS variables.
- **Accessibility & Contrast**: Upgraded `--text-muted` to `#a496b8` for WCAG AA compliance, added skip-to-workspace navigation link, and added missing `aria-label`s on buttons and color swatches.
- **Diagnostics Relay Error Handling**: Handled malformed JSON payloads gracefully with server logging and 400 Bad Request responses.

---

## [v1.0.0] â€” Initial Release
- Multi-layer timeline animation engine with customizable FPS and onion skinning.
- Full artisan raster tools: Bresenham pen, dither brush, Wu 2:1 isometric guides, flood fill, bezier curves.
- PixiBud Smart Studio: Photometric surface normal baking, Blinn-Phong lighting, volumetric sub-surface scattering, and autotiling.
- Offline-first storage with Dexie IndexedDB and multi-engine export suite (PNG, GIF, Godot, Unity, Phaser 3).

