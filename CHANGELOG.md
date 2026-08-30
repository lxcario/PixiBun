# 📜 PixiBun Atelier — Changelog

All notable changes and architectural enhancements to the PixiBun Atelier codebase are documented below.

---

## [v1.1.0] — 2026-08-30

### 🚀 Core Engine & Rendering Optimizations
- **Zero-GC Compositor Canvas Pooling**: Added `sharedOffscreenCanvas` singleton and `targetCanvas` parameter in `compositeFrame()`, eliminating dynamic canvas element creation during onion skinning, scrubbing, and frame compositing.
- **TypedArray Buffer Pool (`src/lib/engine/bufferPool.ts`)**: Built a memory-bounded scratch buffer pool (`acquireFloat32Buffer`, `releaseFloat32Buffer`, `acquireInt32Buffer`, `releaseInt32Buffer`, clamped arrays) with zero-fill reset guarantees.
- **Zero-GC EDT Distance Transform (`src/lib/ai/smartMathEngine.ts`)**: Refactored 1D parabolic envelope calculations in `computeSeparableEDT` and `dt1D` to borrow scratch buffers from `TypedArrayPool`.
- **Zero-GC Downsampling Gradient Allocation (`src/lib/ai/pixelizeEngine.ts`)**: Swapped dynamic gradient map allocations with buffer pool acquires.
- **Web Worker Compute Engine (`src/lib/ai/pixelAi.worker.ts`)**: Offloaded heavy CPU passes (2D block-matching optical flow morphing, directional sel-out rim calculation, OKLab K-Means quantization, error diffusion dithering) to a dedicated worker thread with transferable ArrayBuffers.
- **Buffer Registry Memory Safety (`src/stores/studioStore.ts`)**: Integrated `clearAllBuffers()` calls during `resetToNewProject()` and `loadProjectState()`, preventing memory leaks on project switches.
- **Flood Fill Exact Tolerance 0 (`src/lib/canvas/floodFill.ts`)**: Added strict integer RGBA comparison when `tolerance === 0`, preventing floating-point alpha edge case false positives.
- **Pixel-Perfect 8-Way Connectivity (`src/lib/canvas/rasterMath.ts`)**: Enforced Chebyshev distance connectivity check (`Math.abs(dx) <= 1 && Math.abs(dy) <= 1`) before dropping corner pixels.
- **Async Autosave Serialization (`src/lib/project/serialize.ts`)**: Added `rasterizeLayerPngAsync` with non-blocking `canvas.toBlob()` and `buildProjectFileAsync()`.

### 🏗️ Architecture & State Management
- **Strongly-Typed Event Bus (`src/lib/events/studioEvents.ts`)**: Created a typed TypeScript event pub/sub system with discriminated payloads for studio actions.
- **History Hook Extraction (`src/hooks/useHistoryStack.ts`)**: Extracted undo/redo snapshotting, restore execution, and depth state from `CenterViewport.tsx`.
- **Image-to-Pixel-Art Hook (`src/hooks/usePixelizeEngine.ts`)**: Decomposed monolithic modal logic from `ImportModal.tsx` into a reusable, testable React hook.

### 🌐 Web Platform, Accessibility & Security
- **Node.js SSR Storage Warning**: Replaced bare `typeof localStorage !== 'undefined'` checks with `typeof window !== 'undefined' && window.localStorage` across `capture.ts` and `themeStore.ts`.
- **Responsive Workspace Gate (< 1024px) (`src/components/layout/MobileStudioGate.tsx`)**: Added a tactile fallback screen with Bun mascot guiding users on small screens / mobile devices.
- **Static Theme Initialization & Hardened CSP**: Externalized theme bootstrapping script into `public/theme.js` and removed `'unsafe-inline'` from production `script-src` in `next.config.ts`.
- **Semantic Theme Tokens in Error Boundaries**: Refactored `error.tsx`, `global-error.tsx`, and `studio/error.tsx` to use design system CSS variables.
- **Accessibility & Contrast**: Upgraded `--text-muted` to `#a496b8` for WCAG AA compliance, added skip-to-workspace navigation link, and added missing `aria-label`s on buttons and color swatches.
- **Diagnostics Relay Error Handling**: Handled malformed JSON payloads gracefully with server logging and 400 Bad Request responses.

---

## [v1.0.0] — Initial Release
- Multi-layer timeline animation engine with customizable FPS and onion skinning.
- Full artisan raster tools: Bresenham pen, dither brush, Wu 2:1 isometric guides, flood fill, bezier curves.
- PixiBud Smart Studio: Photometric surface normal baking, Blinn-Phong lighting, volumetric sub-surface scattering, and autotiling.
- Offline-first storage with Dexie IndexedDB and multi-engine export suite (PNG, GIF, Godot, Unity, Phaser 3).
