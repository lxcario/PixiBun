# PixiBun Performance Benchmarks & Runtime Memory Models

This document records empirical benchmarks, algorithmic execution budgets, and heap memory footprint calculations for PixiBun's core graphics and state engines.

> **Environment Note:** Empirical micro-benchmarks were captured on a modern reference development workstation (x86-64 / Apple Silicon equivalent, Node v20 / V8 engine). Automated CI tests in `tests/benchmark.test.ts` verify that operations remain within generous upper-bound latency ceilings ($\le 16.66\text{ ms}$ for 60 FPS interaction) rather than asserting identical machine-specific timings.

---

## 1. Palette Cycling 32-Bit LUT Remapping Performance

**Function:** `updateLivePaletteLUT32` (with direct `ImageData` `Uint32Array` LUT remapping)  
**File:** [`src/lib/color/paletteCycling.ts`](src/lib/color/paletteCycling.ts)  
**Target Budget:** $\le 16.66\text{ ms}$ (60 FPS continuous animation)

The palette cycling engine operates via a zero-allocation 32-bit packed `Uint32Array` lookup table. In each animation frame, cycle tracks rotate color indices into `outLUT32`, which is then mapped directly across the canvas pixel buffer.

### Empirical Frame Timings

| Resolution | Total Pixels | LUT Update ($N \le 256$) | Raster Remap ($p_{95}$) | Total Frame Time | 60 FPS Budget Consumed |
|---|---|---|---|---|---|
| **64 × 64** | 4,096 | $< 0.005\text{ ms}$ | $0.019\text{ ms}$ | **$0.024\text{ ms}$** | **0.14%** |
| **128 × 128** | 16,384 | $< 0.005\text{ ms}$ | $0.072\text{ ms}$ | **$0.077\text{ ms}$** | **0.46%** |
| **256 × 256** | 65,536 | $< 0.005\text{ ms}$ | $0.199\text{ ms}$ | **$0.204\text{ ms}$** | **1.22%** |
| **512 × 512** | 262,144 | $< 0.005\text{ ms}$ | $0.802\text{ ms}$ | **$0.807\text{ ms}$** | **4.84%** |

> **Conclusion:** Across empirical runs up to $512 \times 512$, continuous palette cycling measured $<5\%$ of the 16.66ms browser frame budget, remaining well within automated CI latency budgets.

---

## 2. HistoryEngine Memory Footprint & Ceilings

**Class:** `HistoryEngine`  
**File:** [`src/lib/engine/historyEngine.ts`](src/lib/engine/historyEngine.ts)  
**Ring Buffer Size:** 50 undo steps + up to 50 redo steps (100 steps total max capacity)

Each history step stores uncompressed 32-bit RGBA `ImageData` ($width \times height \times 4\text{ bytes}$).

### Memory Scaling Analysis

| Canvas Size | Bytes per Pixel | Size per Step | 50 Undo Steps | 100 Steps (Max Undo + Redo) |
|---|---|---|---|---|
| **16 × 16** | 4 bytes | $1.0\text{ KB}$ | **$51.2\text{ KB}$** | **$102.4\text{ KB}$** |
| **32 × 32** (Standard) | 4 bytes | $4.1\text{ KB}$ | **$204.8\text{ KB}$** | **$409.6\text{ KB}$** |
| **64 × 64** | 4 bytes | $16.4\text{ KB}$ | **$819.2\text{ KB}$** | **$1.64\text{ MB}$** |
| **128 × 128** | 4 bytes | $65.5\text{ KB}$ | **$3.28\text{ MB}$** | **$6.55\text{ MB}$** |
| **256 × 256** | 4 bytes | $262.1\text{ KB}$ | **$13.11\text{ MB}$** | **$26.21\text{ MB}$** |
| **512 × 512** | 4 bytes | $1.05\text{ MB}$ | **$52.43\text{ MB}$** | **$104.86\text{ MB}$** |

> **Mathematical Note:** A 50-step history at $256 \times 256$ RGBA is **$13.11\text{ MB}$** ($256 \times 256 \times 4 \times 50 = 13,107,200\text{ bytes}$), well within browser tab memory quotas ($>1\text{ GB}$).

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

| Selection Resolution | Total Pixels | Average Frame Time | $p_{95}$ Latency | 60 FPS Budget Consumed | Theoretical Peak Throughput |
|---|---|---|---|---|---|
| **32 × 32** | 1,024 | **$0.012\text{ ms}$** | $0.014\text{ ms}$ | **0.07%** | $> 80,000\text{ FPS}$ |
| **64 × 64** | 4,096 | **$0.027\text{ ms}$** | $0.046\text{ ms}$ | **0.16%** | $> 36,000\text{ FPS}$ |
| **128 × 128** | 16,384 | **$0.089\text{ ms}$** | $0.117\text{ ms}$ | **0.53%** | $> 11,000\text{ FPS}$ |
| **256 × 256** | 65,536 | **$0.333\text{ ms}$** | $0.383\text{ ms}$ | **2.00%** | $> 3,000\text{ FPS}$ |

> **Conclusion:** Across reference benchmark runs, 256 × 256 nearest-neighbor inverse point sampling completes in $\approx 0.33\text{ ms}$ ($\approx 2.0\%$ of the 16.66ms 60 FPS frame budget), remaining within upper-bound latency ceilings enforced by automated CI regression tests.

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

> **Conclusion:** By enforcing single-axis ($\le 4096\text{px}$) and total-pixel ($\le 16.7\text{MP}$) ceilings, peak transient export allocations are constrained to $\le 67.11\text{ MB}$, mitigating 1 GB allocation spikes and significantly improving export reliability across mobile and desktop browsers.

---

## 6. Worker EDT & Normal Map Offloading Performance

**Worker Module:** `src/workers/heavyCompute.worker.ts`  
**Dispatcher:** `src/lib/engine/workerDispatcher.ts`  
**Target Invariant:** Zero UI jank on the main thread ($0\text{ ms}$ main-thread blocking latency during normal baking).

By offloading the 2D Euclidean Distance Transform (Felzenszwalb-Huttenlocher), bilateral Gaussian smoothing, and Sobel gradient convolution to a Web Worker with zero-copy Transferable ArrayBuffers:

| Canvas Size | Total Pixels | Main Thread Blocking (Before) | Main Thread Blocking (Worker Offload) | Worker Execution Time | UI Responsiveness |
|---|---|---|---|---|---|
| **64 × 64** | 4,096 | $\approx 2.4\text{ ms}$ | **$0.00\text{ ms}$** | $\approx 2.1\text{ ms}$ | Instant (60 FPS solid) |
| **128 × 128** | 16,384 | $\approx 8.8\text{ ms}$ | **$0.00\text{ ms}$** | $\approx 7.9\text{ ms}$ | Instant (60 FPS solid) |
| **256 × 256** | 65,536 | $\approx 34.2\text{ ms}$ | **$0.00\text{ ms}$** | $\approx 31.0\text{ ms}$ | Instant (60 FPS solid) |
| **512 × 512** | 262,144 | $\approx 141.5\text{ ms}$ | **$0.00\text{ ms}$** | $\approx 128.0\text{ ms}$ | Instant (60 FPS solid) |

---

## 7. Autonomous Local Quality Gate Pipeline Benchmark

**Harness:** `scripts/runQualityGate.mjs` (`npm run gate`)  
**Target Invariant:** $\le 20\text{ seconds}$ total gate execution time on reference development hardware.

| Stage | Subsystem | Measured Duration | Status | Checked Invariants |
|---|---|---|---|---|
| **Stage 1** | `verifyDocIntegrity.mjs` | **$7.27\text{ s}$** | **PASSED** | 50 unique phases, 27 monotonic sections, 196 filepaths, line counts, test claims. |
| **Stage 2** | `tsc --noEmit` | **$2.19\text{ s}$** | **PASSED** | 0 TypeScript compilation errors across whole codebase. |
| **Stage 3** | `vitest run` | **$6.83\text{ s}$** | **PASSED** | 614 unit tests across 89 suites (100% pass). |
| **Total** | **`npm run gate`** | **$16.30\text{ s}$** | **ALL GREEN** | Pre-push gatekeeper validates release readiness with zero cloud dependency. |



