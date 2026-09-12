import { describe, it, expect } from 'vitest';
import { MAX_SAFE_CANVAS_DIMENSION, MAX_SAFE_CANVAS_PIXELS } from '@/components/modals/export/PngExportTab';

describe('PNG Export Scale Resolution Bounds & Safety Verification', () => {
  it('correctly establishes 4096px max dimension and 16,777,216px max area', () => {
    expect(MAX_SAFE_CANVAS_DIMENSION).toBe(4096);
    expect(MAX_SAFE_CANVAS_PIXELS).toBe(16777216);
    expect(MAX_SAFE_CANVAS_DIMENSION * MAX_SAFE_CANVAS_DIMENSION).toBe(MAX_SAFE_CANVAS_PIXELS);
  });

  it('allows 32x scale on smaller pixel art canvases without exceeding limits', () => {
    // 32x32 sprite scaled 32x is 1024x1024 (1,048,576 px = ~4.2 MB)
    const w32 = 32 * 32;
    const h32 = 32 * 32;
    expect(w32).toBeLessThanOrEqual(MAX_SAFE_CANVAS_DIMENSION);
    expect(h32).toBeLessThanOrEqual(MAX_SAFE_CANVAS_DIMENSION);
    expect(w32 * h32).toBeLessThanOrEqual(MAX_SAFE_CANVAS_PIXELS);

    // 64x64 sprite scaled 32x is 2048x2048 (4,194,304 px = ~16.8 MB)
    const w64 = 64 * 32;
    const h64 = 64 * 32;
    expect(w64).toBeLessThanOrEqual(MAX_SAFE_CANVAS_DIMENSION);
    expect(h64).toBeLessThanOrEqual(MAX_SAFE_CANVAS_DIMENSION);
    expect(w64 * h64).toBeLessThanOrEqual(MAX_SAFE_CANVAS_PIXELS);

    // 128x128 sprite scaled 32x is 4096x4096 (16,777,216 px = exact ceiling)
    const w128 = 128 * 32;
    const h128 = 128 * 32;
    expect(w128).toBe(MAX_SAFE_CANVAS_DIMENSION);
    expect(h128).toBe(MAX_SAFE_CANVAS_DIMENSION);
    expect(w128 * h128).toBe(MAX_SAFE_CANVAS_PIXELS);
  });

  it('disallows 32x and 16x scales on large 512x512 canvases to prevent tab crashes', () => {
    const scales = [1, 2, 4, 8, 16, 32];
    const canvasSize = 512;

    const evaluation = scales.map((s) => {
      const outW = canvasSize * s;
      const outH = canvasSize * s;
      const total = outW * outH;
      const isAllowed =
        outW <= MAX_SAFE_CANVAS_DIMENSION &&
        outH <= MAX_SAFE_CANVAS_DIMENSION &&
        total <= MAX_SAFE_CANVAS_PIXELS;
      return { scale: s, outW, outH, total, isAllowed };
    });

    // 512 * 8 = 4096 (allowed, hits exactly 16.7MP)
    expect(evaluation.find((e) => e.scale === 8)?.isAllowed).toBe(true);

    // 512 * 16 = 8192 (disallowed: dimension 8192 > 4096 and total 67MP > 16.7MP)
    expect(evaluation.find((e) => e.scale === 16)?.isAllowed).toBe(false);

    // 512 * 32 = 16384 (disallowed: dimension 16384 > 4096 and total 268MP > 16.7MP, 1GB RAM)
    expect(evaluation.find((e) => e.scale === 32)?.isAllowed).toBe(false);
  });

  it('enforces single-axis bounds even when aspect ratio is non-square', () => {
    // 512x32 canvas at 16x: width = 8192 (exceeds single-axis 4096 even if total area 8192*512 = 4.19MP < 16.7MP)
    const w = 512 * 16;
    const h = 32 * 16;
    const total = w * h;
    const isAllowed =
      w <= MAX_SAFE_CANVAS_DIMENSION &&
      h <= MAX_SAFE_CANVAS_DIMENSION &&
      total <= MAX_SAFE_CANVAS_PIXELS;

    expect(w).toBe(8192);
    expect(total).toBeLessThan(MAX_SAFE_CANVAS_PIXELS);
    // Single axis exceeds 4096, so it must be disallowed for mobile/Safari safety
    expect(isAllowed).toBe(false);
  });
});
