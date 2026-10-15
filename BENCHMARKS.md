# PixiBun Performance Benchmarks & Runtime Memory Models

This document records empirical benchmarks, algorithmic execution budgets, and heap memory footprint calculations for PixiBun's core graphics and state engines.

The earlier release-repair candidate recorded RotSprite p90 **2.146894 ms locally /2.27146516 ms in CI** against the unchanged **10 ms** limit. The separate 13 October Studio/Nibbli candidate recorded **1.794520 ms** in its frozen full gate and **1.890496 ms** in the subsequent mandatory pre-push gate. These are dated run observations, not a claim that remote CI reran or that the difference is a measured improvement. See [current status](docs/current-status.md) and the [candidate's source/build labels](docs/releases/2026-10-13-studio-and-nibbli.md#verification-and-remaining-scope).

The benchmark is serial uninstrumented Node 22 work with five warmup and fifteen measured 50-call batches; p90 describes batch means, not individual-operation latency. Correctness and required coverage stay in the full gate. These numbers do not measure Studio input-to-display latency or resolve M3's browser scheduling gaps. Earlier instrumented timing failures and the historical tables below retain their original scope.

Current discovery is in [generated/test-inventory.json](docs/generated/test-inventory.json); actual execution is in [current status](docs/current-status.md). Historical measurements retain their original counts and timings.

The [7 October editing follow-up (local archive)](docs/archives.md#record-docs-research-2026-10-07-editing-quality-release-hardening-md) records compiled-browser drawing, rotation preview, playback, bake, timeline, save and project-export measurements at 64/128/256 pixels. Wall-clock automation spans and >50 ms browser tasks are separate measures; neither is a population INP or physical-device result.

The [8 October rectangle measurement (local archive)](docs/archives.md#record-docs-research-2026-10-08-motion-bounds-hardening-md) separates a small-part isolated rotation improvement from essentially unchanged five-frame browser bake timing. The 689→5.3 ms result is for a 16×16 part on an interior 512×512 target in Node; it excludes browser scheduling, worker transfer and full bake/history.

Recorded glint checkpoint — 1 October 2026: the full gate passed in 59.18s, including all 1,482 tests (14.30s Vitest duration) and production compilation (7.74s gate stage). Three focused Chromium scenarios passed in 12.8s. These are local run observations, not a general performance guarantee. [Gate log (local archive)](docs/archives.md#raw-evidence), [browser log (local archive)](docs/archives.md#raw-evidence).

**Audit session — 2026-10-01:** The recorded Phase 6 five-stage gate passed in 45.50 seconds on the supported workspace-local Node 22.23.3 runtime. Its 134-test editor run passed in 2.1 minutes. Research previews admit at most 256 pixels per axis, 16 frames and 262,144 source pixels, with a 30-second worker deadline; tile search admits at most 16 tiles and 20,000 states. These bounds and estimated reservations do not establish a measured heap peak, 60 fps or long-duration device behavior. See the [session record (local archive)](docs/archives.md#record-docs-research-session-completion-2026-10-01-md) for execution scope and later UI additions.

Current history-backed structural edits estimate both the prior-state Undo snapshot and projected Redo snapshot before mutation. An individual edit that exceeds the 64 MiB history budget is rejected; the historical tables below describe retained pixel-step capacity for admitted edits.

> **Environment Note:** The older micro-benchmark tables outside §7 do not record exact hardware and have not been reproduced for this audit; treat them as historical observations. §7 retains a 26 September run with named hardware; it is not a fresh run of this remediation. Automated tests in `tests/benchmark.test.ts` enforce generous latency ceilings rather than identical machine-specific timings.

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
**Stack ceilings:** 4,096 Undo entries and independently 4,096 Redo entries by default, sharing a 64 MiB retained-step cap; new edits clear Redo. This is drawing history. Motion pose parameters have separate 50-entry stacks.

Ordinary pixel steps retain the smallest changed rectangle twice (before and expected-after), plus the engine's fixed 512-byte accounting allowance: `8 × rectangleWidth × rectangleHeight + 512` bytes. A one-cell patch is 520 accounted bytes regardless of canvas size; the first edit on a layer additionally seeds a whole-layer replay baseline. Capture/diff still reads full-layer images, so retained size does not establish constant-time strokes or peak heap size.

### Memory Scaling Analysis

The table models a **whole-canvas before/after patch on every step**, with no Redo or structural entries. It is a conservative retained-payload scenario rather than measured heap or the ordinary small-stroke capacity. The 4,096-step column deliberately shows the uncapped model; the last column applies the actual byte and depth ceilings.

| Changed rectangle | Accounted bytes per step | Modeled 4,096 steps, MiB (uncapped) | Maximum under 64 MiB |
| --- | --- | --- | --- |
| 16 × 16 | 2,560 | 10.000 | 4096 |
| 32 × 32 | 8,704 | 34.000 | 4096 |
| 64 × 64 | 33,280 | 130.000 | 2016 |
| 128 × 128 | 131,584 | 514.000 | 510 |
| 256 × 256 | 524,800 | 2050.000 | 127 |
| 512 × 512 | 2,097,664 | 8194.000 | 31 |
| 1024 × 1024 | 8,389,120 | 32770.000 | 7 |
| 2048 × 2048 | 33,554,944 | 131074.000 | 1 |

For a one-cell patch, 4,096 steps use 2,129,920 bytes (2.031 MiB), before separate replay-baseline/browser memory. Whole-layer steps without expected-after data and structural steps have different sizes: `calculateStepBytes` counts the actual retained raster payloads and metadata allowances. The first pixel edit following structural history stays whole-layer for replay continuity. `tests/undoPatches.test.ts` exercises 1,000 one-pixel steps, Undo/Redo, layer-offset replay and eviction. These are correctness/accounting checks, not input-latency measurements.

Oldest Undo entries fold into the separately accounted replay baseline on eviction; Redo eviction does not rewrite that baseline. A baseline can still contain full layers even when retained steps are tiny. The previous 50-step/full-layer table is superseded by this source-backed model.

---

## 3. Viewport Decoupling & React Render Performance

To target lower interaction overhead (no end-to-end sub-16ms/no-drop measurement established):
- **`bufferVersion` Signal:** Leaf previews use raster invalidation, and the current `CenterViewport` subscribes to this signal for motion preview refresh. It is not exclusively a leaf-widget subscription or proof that the parent never renders on artwork changes.
- **`CursorStatusBadge`:** Decoupled from `CenterViewport`. Pointer movements across pixel boundaries broadcast via `updateCursorHUD(coords)` to an isolated subscriber leaf badge, reducing direct parent-state updates. A complete render-count profile for all pointer states has not been recorded.
- **Canvas Stack Separation:** Layered multi-canvas architecture ensures tool previews, grid lines, and marching ants redraw independently without dirtying or re-rasterizing base layer bitmaps.

---

## 4. Interactive Selection Transform & Inverse Affine Sampling Performance

**Historical measured operations:** `rotateNearest` (nearest-neighbor inverse affine point sampling) and `drawImage` with `imageSmoothingEnabled = false`.

**Current integration:** [`CenterViewport.tsx`](src/components/layout/CenterViewport.tsx), [`rotSprite.ts`](src/lib/canvas/rotSprite.ts), [`useViewportSelectionTransform.ts`](src/hooks/viewport/useViewportSelectionTransform.ts).
**Target Budget:** $\le 16.66\text{ ms}$ (60 FPS continuous pointer drag)

Translation and resizing use unsmoothed floating canvases. Rotated selection preview now evaluates the chosen RotSprite or Paeth raster synchronously and caches it by floating canvas identity and exact transform settings; commit evaluates through the worker. The heavier rotation is therefore not deferred exclusively until commit. Achieved sustained refresh rate is unmeasured. The historical micro-operation table below does not benchmark this current preview workflow; [current synthetic renderer samples (local archive)](docs/archives.md#record-docs-research-2026-10-07-piximotion-cross-phase-hardening-md) have their own narrow scope.

### Historical nearest-neighbor timings (100 iterations per resolution)

| Selection Resolution | Total Pixels | Average Frame Time | $p_{95}$ Latency | 60 FPS Budget Consumed |
|---|---|---|---|---|
| **32 × 32** | 1,024 | **$0.012\text{ ms}$** | $0.014\text{ ms}$ | **0.07%** |
| **64 × 64** | 4,096 | **$0.027\text{ ms}$** | $0.046\text{ ms}$ | **0.16%** |
| **128 × 128** | 16,384 | **$0.089\text{ ms}$** | $0.117\text{ ms}$ | **0.53%** |
| **256 × 256** | 65,536 | **$0.333\text{ ms}$** | $0.383\text{ ms}$ | **2.00%** |

> **Historical scope:** These micro-operation timings lack retained hardware/raw samples outside the named §7 run. They do not measure input handling, compositing, browser presentation or sustained interaction. The redundant operations-per-second extrapolation has been removed; CI latency ceilings are regression checks, not reproduction of these values.

---

## 5. Export Memory Budgets & Canvas Safety Bounds

**Components:** `ExportModal.tsx`, `PngExportTab.tsx`  
**Max Safe Single-Axis Dimension:** $4,096\text{ px}$ (`MAX_SAFE_CANVAS_DIMENSION`)  
**Max Safe Pixel Area:** $16,777,216\text{ pixels}$ (`MAX_SAFE_CANVAS_PIXELS`)  
**Target Invariant:** Reduce excessive allocation risk through admitted geometry; this does not cap total browser/codec/GPU memory or guarantee no device OOM.

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
| **512 × 512** | 32× | 16,384 × 16,384 | 268,435,456 | **$1.07\text{ GB}$** | **Blocked** | Outside configured envelope; crash not universally demonstrated |

> **Conclusion:** By enforcing single-axis ($\le 4096\text{px}$) and total-pixel ($\le 16.7\text{MP}$) ceilings, one RGBA output buffer is constrained to $\le 67.11\text{ MB}$. Source canvases, multiple animation frames, encoder workspaces and browser copies can coexist, so this is not a peak-memory bound. No export heap peak was measured for this audit.

---

## 6. Worker EDT & Normal Map Offloading Performance

**Worker Module:** `src/workers/heavyCompute.worker.ts`  
**Dispatcher:** `src/lib/engine/workerDispatcher.ts`  
**Target Invariant:** Non-blocking asynchronous calculation during worker-offloaded normal baking (offloading heavy EDT calculation from the main thread).

Normal-map Bake can offload the 2D Euclidean Distance Transform (Felzenszwalb-Huttenlocher), bilateral Gaussian smoothing and Sobel gradient convolution. The dispatcher first makes a defensive copy of live input pixels, then transfers that copy without an additional structured-clone copy. The figures below retain their historical measurement scope:

| Canvas Size | Total Pixels | Synchronous Main Thread Compute (Without Worker) | Main Thread Compute (Worker Offloaded) | Worker Execution Time | UI Responsiveness |
|---|---|---|---|---|---|
| **64 × 64** | 4,096 | $\approx 2.4\text{ ms}$ | Dispatch overhead unmeasured | $\approx 2.1\text{ ms}$ | End-to-end interaction unmeasured |
| **128 × 128** | 16,384 | $\approx 8.8\text{ ms}$ | Dispatch overhead unmeasured | $\approx 7.9\text{ ms}$ | End-to-end interaction unmeasured |
| **256 × 256** | 65,536 | $\approx 34.2\text{ ms}$ | Dispatch overhead unmeasured | $\approx 31.0\text{ ms}$ | End-to-end interaction unmeasured |
| **512 × 512** | 262,144 | $\approx 141.5\text{ ms}$ | Dispatch overhead unmeasured | $\approx 128.0\text{ ms}$ | End-to-end interaction unmeasured |

> **Main-Thread Latency Breakdown Note:** Worker-available normal-map Bake runs EDT, bilateral filtering and Sobel passes in `heavyCompute.worker.ts`. Input copying, dispatch and publication remain main-thread work, and bounded fallback can run synchronously. The optional anatomical pass remains synchronous when invoked. Live photometric analysis/preview/Apply in `usePhotometricEvents.ts` is a separate main-thread path, so these bake observations do not establish responsive live relighting.

---

## 7. Autonomous Local Quality Gate Pipeline Benchmark

**Harness:** `scripts/runQualityGate.mjs`; run `npm run gate` for five stages (docs, types, lint, coverage, performance) and `npm run gate:full` for those plus stage 6 (production build). The dated table below records the earlier five-stage layout; it does not enumerate the current runner. Stage times are wall-clock durations printed by that runner.

> **Reference Testbench:** Windows 11 (NT 10.0.26200) x64 • Intel Core i5-12500H (16 logical CPUs) • 31.7 GiB RAM • Node v26.5.1 • npm 11.17.0 (captured 2026-09-26 on checkout `3c77c31`). The original capture called this Windows 10; build 26200 is [Windows 11](https://learn.microsoft.com/en-us/windows/release-health/windows11-release-information). Node 26 was the actual historical runtime, outside the current supported Node 22 range; it is retained rather than relabeled. These warm-cache observations are not current-runtime qualification or a guarantee for other machines.

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
| **Legacy 3D Specular Highlight Pill** | Blinn-Phong + $N_{3D} \cdot L_{3D} > 0$ gate | $0.09\text{ ms}$ | $0.26\text{ ms}$ | $0.84\text{ ms}$ | Macro-silhouette normals; facial/ink feature shielding |
| **Recipe Serialization (v3)** | Non-destructive `LayerEffectRecipe` | $< 0.01\text{ ms}$ | $< 0.01\text{ ms}$ | $< 0.01\text{ ms}$ | JSON serialization scales with parameter payload; older table size/timing is not a current bound |
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
