import { describe, it, expect } from 'vitest';
import { downsampleImage, extractOklabPalette, rgbToOklab } from '@/lib/ai/pixelizeEngine';
import { morphInBetweenFrames } from '@/lib/ai/pixelAiEngine';
import { rotateNearest, PixelBuffer } from '@/lib/canvas/rotSprite';

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
});

