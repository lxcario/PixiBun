import { describe, it, expect } from 'vitest';
import { downsampleImage, extractOklabPalette, rgbToOklab } from '@/lib/ai/pixelizeEngine';
import { morphInBetweenFrames } from '@/lib/ai/pixelAiEngine';
import { rotateNearest, PixelBuffer } from '@/lib/canvas/rotSprite';
import { updateLivePaletteLUT32, type PaletteCycleTrack } from '@/lib/color/paletteCycling';
import { createHistoryEngine, type HistoryStep } from '@/lib/engine/historyEngine';

function createMockCtx(width: number, height: number, data?: Uint8ClampedArray): CanvasRenderingContext2D {
  const pixelData = data ?? new Uint8ClampedArray(width * height * 4);
  return {
    getImageData: () => ({
      width,
      height,
      data: pixelData,
    }),
  } as unknown as CanvasRenderingContext2D;
}

if (typeof document === 'undefined') {
  (globalThis as unknown as { document: unknown }).document = {
    createElement: (tag: string) => {
      if (tag === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext: () => ({
            createImageData: (w: number, h: number) => ({
              width: w,
              height: h,
              data: new Uint8ClampedArray(w * h * 4),
            }),
            putImageData: () => {},
          }),
        };
      }
      return {};
    },
  };
}

describe('Performance Benchmarking Suite', () => {
  it('measures downsampleImage time for large 4000x3000 photo', () => {
    const srcW = 4000;
    const srcH = 3000;
    const dstW = 64;
    const dstH = 64;

    const srcData = new Uint8ClampedArray(srcW * srcH * 4);
    for (let i = 0; i < srcData.length; i += 4) {
      srcData[i] = (i % 255);
      srcData[i + 1] = ((i * 3) % 255);
      srcData[i + 2] = ((i * 7) % 255);
      srcData[i + 3] = 255;
    }

    const srcCtx = createMockCtx(srcW, srcH, srcData);

    const t0 = performance.now();
    const result = downsampleImage(srcCtx, srcW, srcH, dstW, dstH, 'contain', 'salient-box');
    const t1 = performance.now();
    const durationMs = t1 - t0;

    expect(result.data.length).toBe(dstW * dstH * 4);
    expect(durationMs).toBeGreaterThan(0);
    expect(durationMs).toBeLessThan(10000); // Must complete within 10s budget
  }, 15000);

  it('measures K-Means++ in OKLab for 16, 64, and 256 colors', () => {
    const W = 64;
    const H = 64;
    const pixelCount = W * H;
    const oklabPixels = [];

    for (let i = 0; i < pixelCount; i++) {
      const r = (i * 17) % 256;
      const g = (i * 31) % 256;
      const b = (i * 59) % 256;
      oklabPixels.push(rgbToOklab(r, g, b));
    }

    for (const colorCount of [16, 64, 256]) {
      const t0 = performance.now();
      const palette = extractOklabPalette(oklabPixels, colorCount);
      const t1 = performance.now();
      const durationMs = t1 - t0;

      expect(palette.length).toBeGreaterThan(0);
      expect(palette.length).toBeLessThanOrEqual(colorCount);
      expect(durationMs).toBeLessThan(2000); // Fast convergence
    }
  });

  it('evaluates signed distance field morphing on complex checkerboard patterns', () => {
    const W = 32;
    const H = 32;
    const frameA = new Uint8ClampedArray(W * H * 4);
    const frameB = new Uint8ClampedArray(W * H * 4);

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const isBlack = (Math.floor(x / 2) + Math.floor(y / 2)) % 2 === 0;
        const idx = (y * W + x) * 4;
        frameA[idx] = isBlack ? 0 : 255;
        frameA[idx + 1] = isBlack ? 0 : 255;
        frameA[idx + 2] = isBlack ? 0 : 255;
        frameA[idx + 3] = 255;

        // Shift checkerboard by 2px in frame B
        const isBlackB = (Math.floor((x - 2) / 2) + Math.floor(y / 2)) % 2 === 0;
        frameB[idx] = isBlackB ? 0 : 255;
        frameB[idx + 1] = isBlackB ? 0 : 255;
        frameB[idx + 2] = isBlackB ? 0 : 255;
        frameB[idx + 3] = 255;
      }
    }

    const ctxA = createMockCtx(W, H, frameA);
    const ctxB = createMockCtx(W, H, frameB);

    const t0 = performance.now();
    const morphedCanvas = morphInBetweenFrames(ctxA, ctxB, W, H, 0.5);
    const t1 = performance.now();
    const durationMs = t1 - t0;

    expect(morphedCanvas).toBeDefined();
    expect(durationMs).toBeLessThan(1000);
  });

  it('benchmarks nearest-neighbor inverse affine transform for 32x32, 64x64, 128x128, and 256x256 selections', () => {
    const resolutions = [32, 64, 128, 256];
    const results: Record<number, { avgMs: number; p95Ms: number; fpsEquivalent: number }> = {};

    for (const res of resolutions) {
      const pixelCount = res * res;
      const data = new Uint8ClampedArray(pixelCount * 4);
      for (let i = 0; i < pixelCount; i++) {
        data[i * 4] = (i * 13) % 256;
        data[i * 4 + 1] = (i * 29) % 256;
        data[i * 4 + 2] = (i * 47) % 256;
        data[i * 4 + 3] = 255;
      }
      const buffer: PixelBuffer = { width: res, height: res, data };

      // Warmup JIT
      for (let w = 0; w < 10; w++) {
        rotateNearest(buffer, 0.45);
      }

      // 100 iterations measuring inverse affine nearest neighbor
      const iterations = 100;
      const timings: number[] = [];
      for (let i = 0; i < iterations; i++) {
        const angle = (i / iterations) * Math.PI * 2;
        const t0 = performance.now();
        rotateNearest(buffer, angle);
        const t1 = performance.now();
        timings.push(t1 - t0);
      }

      timings.sort((a, b) => a - b);
      const avg = timings.reduce((sum, t) => sum + t, 0) / iterations;
      const p95 = timings[Math.floor(iterations * 0.95)];

      results[res] = {
        avgMs: Number(avg.toFixed(4)),
        p95Ms: Number(p95.toFixed(4)),
        fpsEquivalent: Math.round(1000 / Math.max(avg, 0.001)),
      };

      // Even 256x256 nearest-neighbor must finish well below the 16.66ms frame budget (60 FPS)
      expect(avg).toBeLessThan(16.66);
    }
  });

  it('benchmarks 32-bit LUT remapping and raster pixel remapping for 64x64 to 512x512 palette cycling', () => {
    const resolutions = [64, 128, 256, 512];
    const basePaletteHex = Array.from({ length: 256 }, (_, i) =>
      `#${i.toString(16).padStart(2, '0')}${((i * 3) % 256).toString(16).padStart(2, '0')}${((i * 7) % 256).toString(16).padStart(2, '0')}`
    );
    const tracks: PaletteCycleTrack[] = [
      { id: 't1', name: 'water', low: 10, high: 32, rate: 12, direction: 'forward', blendShift: false, enabled: true },
      { id: 't2', name: 'fire', low: 40, high: 70, rate: 8, direction: 'ping-pong', blendShift: true, enabled: true },
    ];

    const outLUT32 = new Uint32Array(256);

    for (const res of resolutions) {
      const numPixels = res * res;
      const indexMap = new Uint8Array(numPixels);
      const data32 = new Uint32Array(numPixels);
      const baseData32 = new Uint32Array(numPixels);

      for (let i = 0; i < numPixels; i++) {
        indexMap[i] = i % 256;
        baseData32[i] = 0xff000000 | i;
      }

      // Warmup JIT
      for (let w = 0; w < 10; w++) {
        updateLivePaletteLUT32(basePaletteHex, tracks, 0.1 * w, outLUT32);
        for (let i = 0; i < numPixels; i++) {
          const palIdx = indexMap[i];
          data32[i] = palIdx === 255 ? baseData32[i] : (outLUT32[palIdx] ?? baseData32[i]);
        }
      }

      const iterations = 50;
      let totalLutMs = 0;
      let totalRemapMs = 0;

      for (let i = 0; i < iterations; i++) {
        const elapsedSec = (i / iterations) * 2.0;

        const t0 = performance.now();
        updateLivePaletteLUT32(basePaletteHex, tracks, elapsedSec, outLUT32);
        const t1 = performance.now();

        const t2 = performance.now();
        for (let p = 0; p < numPixels; p++) {
          const palIdx = indexMap[p];
          data32[p] = palIdx === 255 ? baseData32[p] : (outLUT32[palIdx] ?? baseData32[p]);
        }
        const t3 = performance.now();

        totalLutMs += t1 - t0;
        totalRemapMs += t3 - t2;
      }

      const avgLutMs = totalLutMs / iterations;
      const avgRemapMs = totalRemapMs / iterations;
      const avgTotalMs = avgLutMs + avgRemapMs;

      // Assert that 32-bit LUT remapping consumes well under the 16.66ms frame budget (60 FPS)
      expect(avgLutMs).toBeLessThan(2.0);
      expect(avgTotalMs).toBeLessThan(16.66);
    }
  });

  it('verifies HistoryEngine memory footprint and step pruning capacity against BENCHMARKS.md ceilings', () => {
    const resolutions = [16, 32, 64, 128, 256, 512];
    const maxDepth = 50;

    for (const res of resolutions) {
      const bytesPerPixel = 4;
      const sizePerStep = res * res * bytesPerPixel;
      const theoretical50StepsBytes = sizePerStep * maxDepth;
      const theoretical100StepsBytes = sizePerStep * (maxDepth * 2);

      // Verify mathematical scaling formulas
      expect(sizePerStep).toBe(res * res * 4);
      expect(theoretical50StepsBytes).toBe(res * res * 4 * 50);
      expect(theoretical100StepsBytes).toBe(res * res * 4 * 100);

      // Verify 256x256 matches exact BENCHMARKS.md specification (13,107,200 bytes ≈ 13.11 MB)
      if (res === 256) {
        expect(theoretical50StepsBytes).toBe(13107200);
      }

      const engine = createHistoryEngine(maxDepth);
      expect(engine.depth).toBe(0);

      // Push 60 steps to verify ring buffer prunes steps beyond 50
      for (let s = 0; s < 60; s++) {
        const mockImageData = {
          width: res,
          height: res,
          data: new Uint8ClampedArray(sizePerStep),
        } as ImageData;

        engine.push({
          description: `Stroke ${s}`,
          frameIndex: 0,
          layerId: 'layer-1',
          imageData: mockImageData,
        });
      }

      // Assert strictly capped at maxDepth (50 steps)
      expect(engine.depth).toBe(maxDepth);
      expect(engine.canUndo).toBe(true);

      // Calculate empirical heap memory retained in undo stack
      const history = engine.getHistory();
      expect(history.length).toBe(maxDepth);

      let totalRetainedBytes = 0;
      for (const step of history) {
        totalRetainedBytes += step.imageData.data.byteLength;
      }

      expect(totalRetainedBytes).toBe(theoretical50StepsBytes);

      // Verify undo populates redo stack without exceeding capacity
      const currentSnapshot: HistoryStep = {
        description: 'Current State',
        frameIndex: 0,
        layerId: 'layer-1',
        imageData: { width: res, height: res, data: new Uint8ClampedArray(sizePerStep) } as ImageData,
      };

      for (let u = 0; u < 30; u++) {
        engine.undo(currentSnapshot);
      }
      expect(engine.canRedo).toBe(true);
      expect(engine.depth).toBe(20);
    }
  });
});

