# PixiBun Performance Benchmarks & Runtime Memory Models

This document records empirical benchmarks, algorithmic execution budgets, and heap memory footprint calculations for PixiBun's core graphics and state engines.

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

> **Conclusion:** 60 FPS continuous palette cycling comfortably holds across all supported sprite dimensions up to $512 \times 512$, consuming less than $5\%$ of the total 16.66ms browser frame budget.

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
| **256 × 256** | 4 bytes | $262.1\text{ KB}$ | **$12.80\text{ MB}$** | **$25.60\text{ MB}$** |
| **512 × 512** | 4 bytes | $1.05\text{ MB}$ | **$52.43\text{ MB}$** | **$104.86\text{ MB}$** |

> **Mathematical Note:** A 50-step history at $256 \times 256$ RGBA is **$12.8\text{ MB}$** ($256 \times 256 \times 4 \times 50 = 13,107,200\text{ bytes}$), well within browser tab memory quotas ($>1\text{ GB}$).

---

## 3. Viewport Decoupling & React Render Performance

To guarantee sub-16ms interactive drawing latency without frame drops or garbage collection spikes during pen strokes:
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

> **Conclusion:** Even under extreme 256 × 256 continuous affine rotations, nearest-neighbor inverse point sampling completes in $\approx 0.33\text{ ms}$, consuming only $2.0\%$ of the browser's 16.66ms frame budget. The claim of 60 FPS continuous interactive transform preview is an empirically measured guarantee.

