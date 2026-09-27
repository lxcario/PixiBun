# PixiBun Performance Benchmarks & Runtime Memory Models

This document records empirical benchmarks, algorithmic execution budgets, and heap memory footprint calculations for PixiBun's core graphics and state engines.

Current suite inventory: 1270 unit tests across 129 suites. Historical measurements below retain their original test counts and timings.

> **Environment Note:** The older micro-benchmark tables outside §7 do not record exact hardware and have not been reproduced for this audit; treat them as historical observations. §7 records a fresh run with named hardware. Automated tests in `tests/benchmark.test.ts` enforce generous latency ceilings rather than identical machine-specific timings.

---

## 1. Palette Cycling 32-Bit LUT Remapping Performance

**Function:** `updateLivePaletteLUT32` (with direct `ImageData` `Uint32Array` LUT remapping)  
**File:** [`src/lib/color/paletteCycling.ts`](src/lib/color/paletteCycling.ts)  
**Target Budget:** $\le 16.66\text{ ms}$ (60 FPS continuous animation)

The palette cycling engine operates via an allocation-free per-pixel 32-bit packed `Uint32Array` lookup table blit. In each animation frame, cycle tracks rotate color indices into `outLUT32`, which is then mapped directly across the canvas pixel buffer (per-pixel blits allocate zero heap memory; per-frame LUT recomputations incur small, bounded scratch allocations).

### Empirical Frame Timings

| Resolution | Total Pixels | LUT Update ($N \le 256$) | Raster Remap ($p_{95}$) | Total Frame Time | 60 FPS Budget Consumed |
|---|---|---|---|---|---|
| **64 × 64** | 4,096 | $< 0.005\text{ ms}$ | $0.019\text{ ms}$ | **$0.024\text{ ms}$** | **0.14%** |
| **128 × 128** | 16,384 | $< 0.005\text{ ms}$ | $0.072\text{ ms}$ | **$0.077\text{ ms}$** | **0.46%** |
| **256 × 256** | 65,536 | $< 0.005\text{ ms}$ | $0.199\text{ ms}$ | **$0.204\text{ ms}$** | **1.22%** |
| **512 × 512** | 262,144 | $< 0.005\text{ ms}$ | $0.802\text{ ms}$ | **$0.807\text{ ms}$** | **4.84%** |

> **Historical observation:** The recorded palette-cycling runs were below 5% of a 16.66ms frame budget. Their hardware and raw samples were not retained, so these figures are not a current performance guarantee.

---

## 2. HistoryEngine Memory Footprint & Ceilings

**Class:** `HistoryEngine`  
**File:** [`src/lib/engine/historyEngine.ts`](src/lib/engine/historyEngine.ts)  
**Stack Ceilings:** 50 undo steps with independent 50-step redo stack (constrained by a unified 64 MiB combined history byte envelope); new edits clear redo

Each pixel history step in this modeled analysis represents a full-canvas single-layer modification storing uncompressed 32-bit RGBA `ImageData` ($width \times height \times 4\text{ bytes}$) plus a 512-byte object overhead (`calculateStepBytes` in `src/lib/engine/historyEngine.ts`).

### Memory Scaling Analysis

| Canvas Size | Bytes per Pixel | Size per Step | Theoretical 50 Steps (Uncapped) | Actual Max Steps under 64 MiB Cap |
|---|---|---|---|---|
| **16 × 16** | 4 bytes | $1.0\text{ KB}$ | **$51.2\text{ KB}$** | 50 steps |
| **32 × 32** (Standard) | 4 bytes | $4.1\text{ KB}$ | **$204.8\text{ KB}$** | 50 steps |
| **64 × 64** | 4 bytes | $16.4\text{ KB}$ | **$819.2\text{ KB}$** | 50 steps |
| **128 × 128** | 4 bytes | $65.5\text{ KB}$ | **$3.28\text{ MB}$** | 50 steps |
| **256 × 256** | 4 bytes | $262.1\text{ KB}$ | **$13.11\text{ MB}$** | 50 steps |
| **512 × 512** | 4 bytes | $1.05\text{ MB}$ | **$52.43\text{ MB}$** | ~50 steps |
| **1024 × 1024** | 4 bytes | $4.19\text{ MB}$ | **$209.72\text{ MB}$** | 15 steps (16 raw RGBA frames exceed 64 MiB by 8 KB with +512B overhead) |
| **2048 × 2048** (Envelope Max) | 4 bytes | $16.78\text{ MB}$ | **$838.86\text{ MB}$** | 3 steps (4 raw RGBA frames exceed 64 MiB by 2 KB with +512B overhead) |

> **Mathematical Note on 64 MiB Cap & Eviction Accounting:** Production code in `src/lib/engine/historyEngine.ts` enforces `DEFAULT_HISTORY_MAX_BYTES = 64 * 1024 * 1024` (64 MiB = 67,108,864 bytes). For resolutions $512 \times 512$ and below, 50 steps fit within 64 MiB. For $1024 \times 1024$ and $2048 \times 2048$, a naive division of raw pixel bytes ($64\text{ MiB} / 4\text{ MiB} = 16$ and $64\text{ MiB} / 16\text{ MiB} = 4$) does not account for the +512-byte per-step metadata overhead (`calculateStepBytes`). In actual execution, 16 steps at $1024\times1024$ total $67,117,056\text{ bytes}$ (8,192 bytes over the 64 MiB cap), and 4 steps at $2048\times2048$ total $67,110,912\text{ bytes}$ (2,048 bytes over the cap). The eviction check `(totalBytes + stepBytes > limitBytes)` triggers before insertion, yielding exactly 15 and 3 steps respectively in the active undo stack for single-layer full-canvas modifications. For multi-layer or structural history steps (which snapshot frame metadata and back up all affected layer buffers), step byte footprints vary dynamically by operation, and steps are evicted strictly according to aggregate byte size rather than a fixed step count. Redo steps are stored on an independent 50-step stack subject to the unified 64 MiB combined history byte envelope (with oldest redo entries evicted under combined byte pressure).

---

## 3. Viewport Decoupling & React Render Performance

To maintain sub-16ms interactive drawing latency without frame drops or garbage collection spikes during pen strokes:
- **`bufferVersion` Signal:** Decoupled from `CenterViewport`. Atomic integer signal subscribed exclusively by leaf widgets (`BottomTimeline`, `FloatingPreviewWindow`).
- **`CursorStatusBadge`:** Decoupled from `CenterViewport`. Pointer movements across pixel boundaries broadcast via `updateCursorHUD(coords)` to an isolated subscriber leaf badge, incurring **0** re-renders on `CenterViewport`.
- **Canvas Stack Separation:** Layered multi-canvas architecture ensures tool previews, grid lines, and marching ants redraw independently without dirtying or re-rasterizing base layer bitmaps.

---

## 4. Interactive Selection Transform & Inverse Affine Sampling Performance

**Function:** `rotateNearest` (nearest-neighbor inverse affine point sampling) & `drawImage` (uncapped hardware blit with `imageSmoothingEnabled = false`)  
**File:** [`src/lib/canvas/rotSprite.ts`](src/lib/canvas/rotSprite.ts), [`src/hooks/viewport/useViewportSelectionTransform.ts`](src/hooks/viewport/useViewportSelectionTransform.ts)  
**Target Budget:** $\le 16.66\text{ ms}$ (60 FPS continuous pointer drag)

During interactive selection transforms (corner scaling, edge stretching, translation, and rotation), PixiBun executes a fast nearest-neighbor inverse affine point sampling pass per pointer movement. This provides instantaneous visual feedback at full monitor refresh rates (60–144 Hz) without introducing blurry bilinear artifacts, deferring the heavy multi-pass RotSprite downscale until the transform is committed.

### Empirical Frame Timings (100 Iterations per Resolution)

| Selection Resolution | Total Pixels | Average Frame Time | $p_{95}$ Latency | 60 FPS Budget Consumed | Theoretical Operations/sec (Modeled) |
|---|---|---|---|---|---|
| **32 × 32** | 1,024 | **$0.012\text{ ms}$** | $0.014\text{ ms}$ | **0.07%** | $> 80,000\text{ ops/sec}$ |
| **64 × 64** | 4,096 | **$0.027\text{ ms}$** | $0.046\text{ ms}$ | **0.16%** | $> 36,000\text{ ops/sec}$ |
| **128 × 128** | 16,384 | **$0.089\text{ ms}$** | $0.117\text{ ms}$ | **0.53%** | $> 11,000\text{ ops/sec}$ |
| **256 × 256** | 65,536 | **$0.333\text{ ms}$** | $0.383\text{ ms}$ | **2.00%** | $> 3,000\text{ ops/sec}$ |

> **Throughput & Budget Note:** Peak throughput values are arithmetic extrapolations ($1000\text{ ms} / \text{latency}$) modeling theoretical operations per second in isolation, not physical browser display frame rates (which are clamped by the display refresh rate and composition pipeline). Across reference benchmark runs, 256 × 256 nearest-neighbor inverse point sampling completes in $\approx 0.33\text{ ms}$ ($\approx 2.0\%$ of the 16.66ms 60 FPS frame budget), remaining within upper-bound latency ceilings enforced by automated CI regression tests.

---

## 5. Export Memory Budgets & Canvas Safety Bounds

**Components:** `ExportModal.tsx`, `PngExportTab.tsx`  
**Max Safe Single-Axis Dimension:** $4,096\text{ px}$ (`MAX_SAFE_CANVAS_DIMENSION`)  
**Max Safe Pixel Area:** $16,777,216\text{ pixels}$ (`MAX_SAFE_CANVAS_PIXELS`)  
**Target Invariant:** Guard browser tab stability, prevent OOM heap exhaustion, and eliminate iOS Safari / WebKit canvas allocation crashes.

Raw uncompressed 32-bit RGBA pixel buffers allocated during scale transformations scale quadratically with respect to dimension:
$$\text{Memory} = (\text{width} \times \text{scale}) \times (\text{height} \times \text{scale}) \times 4\text{ bytes}$$

### Memory Footprint & Safety Evaluation

| Sprite Canvas | Scale Factor | Output Dimensions | Total Pixels | Raw 32-Bit Buffer | Status | Bound Evaluation |
|---|---|---|---|---|---|---|
| **16 × 16** | 32× | 512 × 512 | 262,144 | $1.05\text{ MB}$ | **Allowed** | Within bounds |
| **32 × 32** | 32× | 1,024 × 1,024 | 1,048,576 | $4.19\text{ MB}$ | **Allowed** | Within bounds |
| **64 × 64** | 32× | 2,048 × 2,048 | 4,194,304 | $16.78\text{ MB}$ | **Allowed** | Within bounds |
| **128 × 128** | 32× | 4,096 × 4,096 | 16,777,216 | $67.11\text{ MB}$ | **Allowed** | Exact safety boundary ($4096\text{px}$) |
| **256 × 256** | 16× | 4,096 × 4,096 | 16,777,216 | $67.11\text{ MB}$ | **Allowed** | Exact safety boundary ($4096\text{px}$) |
| **256 × 256** | 32× | 8,192 × 8,192 | 67,108,864 | $268.44\text{ MB}$ | **Blocked** | Exceeds $4096\text{px}$ / $16.7\text{MP}$ ceiling |
| **512 × 512** | 8× | 4,096 × 4,096 | 16,777,216 | $67.11\text{ MB}$ | **Allowed** | Exact safety boundary ($4096\text{px}$) |
| **512 × 512** | 16× | 8,192 × 8,192 | 67,108,864 | $268.44\text{ MB}$ | **Blocked** | Exceeds $4096\text{px}$ / $16.7\text{MP}$ ceiling |
| **512 × 512** | 32× | 16,384 × 16,384 | 268,435,456 | **$1.07\text{ GB}$** | **Blocked** | Severe memory risk; iOS Safari tab crash |

> **Conclusion:** By enforcing single-axis ($\le 4096\text{px}$) and total-pixel ($\le 16.7\text{MP}$) ceilings, one RGBA output buffer is constrained to $\le 67.11\text{ MB}$. Source canvases, multiple animation frames, encoder workspaces and browser copies can coexist, so this is not a peak-memory bound. No export heap peak was measured for this audit.

---

## 6. Worker EDT & Normal Map Offloading Performance

**Worker Module:** `src/workers/heavyCompute.worker.ts`  
**Dispatcher:** `src/lib/engine/workerDispatcher.ts`  
**Target Invariant:** Non-blocking asynchronous calculation during worker-offloaded normal baking (offloading heavy EDT calculation from the main thread).

By offloading the 2D Euclidean Distance Transform (Felzenszwalb-Huttenlocher), bilateral Gaussian smoothing, and Sobel gradient convolution to a Web Worker with zero-copy Transferable ArrayBuffers:

| Canvas Size | Total Pixels | Synchronous Main Thread Compute (Without Worker) | Main Thread Compute (Worker Offloaded) | Worker Execution Time | UI Responsiveness |
|---|---|---|---|---|---|
| **64 × 64** | 4,096 | $\approx 2.4\text{ ms}$ | Lightweight dispatch overhead | $\approx 2.1\text{ ms}$ | Smooth (60 FPS interaction) |
| **128 × 128** | 16,384 | $\approx 8.8\text{ ms}$ | Lightweight dispatch overhead | $\approx 7.9\text{ ms}$ | Smooth (60 FPS interaction) |
| **256 × 256** | 65,536 | $\approx 34.2\text{ ms}$ | Lightweight dispatch overhead | $\approx 31.0\text{ ms}$ | Smooth (60 FPS interaction) |
| **512 × 512** | 262,144 | $\approx 141.5\text{ ms}$ | Lightweight dispatch overhead | $\approx 128.0\text{ ms}$ | Smooth (60 FPS interaction) |

> **Main-Thread Latency Breakdown Note:** The heavy EDT, bilateral Gaussian filtering, and Sobel convolution passes execute asynchronously inside `heavyCompute.worker.ts`, removing heavy compute pauses from the main thread. However, absolute zero main-thread overhead is not claimed: lightweight main-thread message dispatch/transfer overhead still occurs, and the optional content-aware anatomical heightmap pass (connected-component BFS and anatomical prior evaluation in `src/lib/ai/math/edtNormalMap.ts`) runs synchronously on the main thread when invoked.

---

## 7. Autonomous Local Quality Gate Pipeline Benchmark

**Harness:** `scripts/runQualityGate.mjs`; run `npm run gate` for stages 1–4 and `npm run gate:full` for stages 1–5. Stage times are wall-clock durations printed by that runner.

> **Reference Testbench:** Windows 10 (NT 10.0.26200) x64 • Intel Core i5-12500H (16 logical CPUs) • 31.7 GiB RAM • Node v26.5.1 • npm 11.17.0 (captured 2026-09-26 on checkout `3c77c31`). These measurements are reference observations with warm dependency and build caches, not an empirical guarantee for other host machines.

| Stage | Check | Standard gate | Full gate | Result |
|---|---|---:|---:|---|
| 1 | Documentation integrity | 17.48 s | 19.01 s | Passed: 68 phases, 32 sections, 275 cited paths, current test inventory |
| 2 | TypeScript | 4.00 s | 3.28 s | Passed |
| 3 | ESLint | 18.81 s | 16.96 s | Passed: source, tests, scripts, configs |
| 4 | Vitest | 23.89 s | 21.52 s | Passed: 1,227 tests across 123 suites |
| 5 | Next.js production build | — | 17.18 s | Passed |
| **Total** | | **64.18 s** | **77.95 s** | **Passed** |

The previous v1.13.1 snapshot (699 tests across 98 suites) reported a 19.44 s gate. It is historical and does not describe the current suite or hardware.

---

## 8. Neutral Relighting & Smart-Effect Recipe Processing Budget

**Subsystems:** `edtNormalMap.ts`, `photometricLighting.ts`, `photometricAuto.ts`, `schema.ts`  
**Target Budget:** $\le 16.66\text{ ms}$ on typical sprite resolutions ($32\times32$ to $64\times64$) for continuous interactive bulb manipulation.

Phase 63 introduced source-shading normalization, two-sided ink edge classification, hue/chroma ramp grouping, discrete 1/2/3-tone cel-shading quantization, continuous 3D specular highlight pill with line-of-sight gating, and non-destructive `LayerEffectRecipe` metadata serialization.

The timing table below is a historical estimate without retained raw samples or a reproducible hardware record. It has not been remeasured for the current code and must not be used as a 60 FPS guarantee.

### Performance Scaling Analysis

| Pipeline Stage | Algorithm | $32 \times 32$ Sprite | $64 \times 64$ Sprite | $128 \times 128$ Sprite | Invariant Preserved |
|---|---|---|---|---|---|
| **Source Shading Normalization** | Two-sided ink filter + ramp flood fill | $0.28\text{ ms}$ | $0.85\text{ ms}$ | $2.94\text{ ms}$ | $\Delta\text{hue} \le 35^\circ, \Delta\text{chroma} \le 0.25$ |
| **Neutral Heightmap Formulation** | Composite $0.70 H_{\text{macro}} + 0.30 H_{\text{micro}}$ | $0.45\text{ ms}$ | $1.42\text{ ms}$ | $4.81\text{ ms}$ | Neutral surface without fixed anatomical bias |
| **Cel Terminator & Cavity AO** | Exposure-compensated clamp | $0.14\text{ ms}$ | $0.38\text{ ms}$ | $1.15\text{ ms}$ | Terminator fixed across brightness levels |
| **Discrete Tone Quantization** | Single / Dual / Trio OKLCH bands | $0.11\text{ ms}$ | $0.34\text{ ms}$ | $1.12\text{ ms}$ | Discrete OKLCH tone thresholds without color banding |
| **3D Specular Highlight Pill** | Blinn-Phong + $N_{3D} \cdot L_{3D} > 0$ gate | $0.09\text{ ms}$ | $0.26\text{ ms}$ | $0.84\text{ ms}$ | Macro-silhouette normals; facial/ink feature shielding |
| **Recipe Serialization (v3)** | Non-destructive `LayerEffectRecipe` | $< 0.01\text{ ms}$ | $< 0.01\text{ ms}$ | $< 0.01\text{ ms}$ | $O(1)$ JSON payload ($< 1\text{ KB}$ per layer) |
| **Total Interactive Preview** | Single-frame gizmo drag | **$1.07\text{ ms}$** | **$3.25\text{ ms}$** | **$10.86\text{ ms}$** | Historical estimate; current frame rate unverified |

---

## 9. Streaming Store-Only ZIP32 & Stored-Blob Assessment Resource Bounds (Phase 1B Design Invariants)

**Subsystems:** `zipWriter.ts`, `recoveryDiagnosis.ts`, `recoveryClassifier.ts`
**Design Invariant:** $O(1)$ payload-processing memory relative to payload size, $\le 64\text{ KiB}$ maximum chunk write size, and bounded keyset batch pagination in IndexedDB.

> **Benchmark Status Note:** This section specifies structural and algorithmic resource bounds and streaming architectural invariants. No live runtime throughput benchmark, empirical latency profiling, or hardware-specific timing measurements have been conducted for these Phase 1B subsystems.

### Memory & Execution Architecture

1. **Streaming Store-Only ZIP32 Core (`src/lib/recovery/zipWriter.ts`):**
   - **Method 0 (Store-Only):** Streams uncompressed byte chunks directly from source streams (`ReadableStream<Uint8Array>`) into consumer sinks (`RecoveryZipSink`).
   - **Payload Memory Bounds:** Enforces $O(1)$ payload-processing memory relative to payload size. Payload chunks larger than 64 KiB are split prior to sink writes, capping each sink write at 64 KiB.
   - **Archive Bookkeeping Ceilings:** Entry metadata is bounded by $O(\text{entry count})$ with a maximum ceiling of 65,535 entries (`ZIP32_CONSTANTS.MAX_ENTRIES`) and 4 GiB maximum total archive size. Filenames are validated during preflight and re-encoded dynamically per entry during header emission rather than held as redundant buffers.

2. **Keyset-Paginated Stored-Blob Assessment (`src/lib/recovery/recoveryDiagnosis.ts`):**
   - **Compound Index Scans:** Bounded batch reads (batches of 25) against `[projectId+id]` on `layerBlobs` ensure that inspection of stored project blobs avoids instantiating unbounded arrays in memory.
   - **Bounded Blob Header Probing:** Probes a bounded 24-byte Blob slice (`record.blob.slice(0, 24)`) via `ImageHeaderProbe` to validate PNG format and dimensions without instantiating canvas backing stores or decoding raster bitmaps, keeping memory negligible.
