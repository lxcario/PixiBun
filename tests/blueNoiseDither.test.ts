import { describe, it, expect } from 'vitest';
import {
  generateVoidAndClusterMatrix,
  BLUE_NOISE_16X16,
  shouldDitherPixel,
  BAYER_8X8,
} from '@/lib/canvas/ditherMatrix';

describe('Phase 34.1: Blue-Noise (Void-and-Cluster) Dithering Engine', () => {
  it('generates a mathematically valid 16x16 rank permutation from 0 to 255', () => {
    const matrix = generateVoidAndClusterMatrix(16, 1.9);
    expect(matrix.length).toBe(16);
    expect(matrix[0].length).toBe(16);

    const values = new Set<number>();
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const val = matrix[y][x];
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThan(256);
        values.add(val);
      }
    }
    expect(values.size).toBe(256);
  });

  it('provides a cached BLUE_NOISE_16X16 matrix with complete rank distribution', () => {
    expect(BLUE_NOISE_16X16.length).toBe(16);
    expect(BLUE_NOISE_16X16[0].length).toBe(16);

    const values = new Set<number>();
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        values.add(BLUE_NOISE_16X16[y][x]);
      }
    }
    expect(values.size).toBe(256);
  });

  it('demonstrates absence of repeating low-frequency periodic structure via spatial autocorrelation', () => {
    // Helper: compute spatial autocorrelation of binary threshold slice on toroidal NxN grid
    function computeAutocorrelation(bin: number[][], lagX: number, lagY: number): number {
      const N = bin.length;
      let mean = 0;
      for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
          mean += bin[y][x];
        }
      }
      mean /= N * N;

      let num = 0;
      let denom = 0;
      for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
          const v = bin[y][x] - mean;
          const vShift = bin[(y + lagY + N) % N][(x + lagX + N) % N] - mean;
          num += v * vShift;
          denom += v * v;
        }
      }
      return denom === 0 ? 0 : num / denom;
    }

    // 1. Generate binary pattern for Bayer 8x8 tiled to 16x16 at 50% density
    const bayerBinary: number[][] = Array.from({ length: 16 }, (_, y) =>
      Array.from({ length: 16 }, (_, x) => (BAYER_8X8[y % 8][x % 8] < 32 ? 1 : 0))
    );

    // 2. Generate binary pattern for Blue Noise 16x16 at 50% density
    const blueNoiseBinary: number[][] = Array.from({ length: 16 }, (_, y) =>
      Array.from({ length: 16 }, (_, x) => (BLUE_NOISE_16X16[y][x] < 128 ? 1 : 0))
    );

    // Identity check
    expect(computeAutocorrelation(blueNoiseBinary, 0, 0)).toBeCloseTo(1.0, 4);
    expect(computeAutocorrelation(bayerBinary, 0, 0)).toBeCloseTo(1.0, 4);

    // Bayer shows severe periodic grid correlation spikes (+1.0 and -1.0)
    expect(computeAutocorrelation(bayerBinary, 1, 0)).toBeCloseTo(-1.0, 4);
    expect(computeAutocorrelation(bayerBinary, 2, 0)).toBeCloseTo(1.0, 4);
    expect(computeAutocorrelation(bayerBinary, 2, 2)).toBeCloseTo(1.0, 4);
    expect(computeAutocorrelation(bayerBinary, 8, 0)).toBeCloseTo(1.0, 4);

    // Blue noise exhibits suppressed low-frequency autocorrelation (|r| < 0.25) across all non-zero lags
    const lags = [
      [1, 0],
      [0, 1],
      [1, 1],
      [2, 0],
      [0, 2],
      [2, 2],
      [4, 4],
      [8, 0],
      [8, 8],
    ];

    for (const [lx, ly] of lags) {
      const r = computeAutocorrelation(blueNoiseBinary, lx, ly);
      expect(Math.abs(r)).toBeLessThan(0.25);
    }
  });

  it('correctly modulates pixel threshold in shouldDitherPixel', () => {
    // At density 0: no pixels should pass
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        expect(shouldDitherPixel(x, y, 'blue-noise', 0.0)).toBe(false);
      }
    }

    // At density 1.0: all pixels should pass
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        expect(shouldDitherPixel(x, y, 'blue-noise', 1.0)).toBe(true);
      }
    }

    // At density 0.5: exactly 128 pixels in 16x16 block should pass
    let count = 0;
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        if (shouldDitherPixel(x, y, 'blue-noise', 0.5)) {
          count++;
        }
      }
    }
    expect(count).toBe(128);

    // Handles negative and large coordinates toroidally
    expect(shouldDitherPixel(-16, -16, 'blue-noise', 0.5)).toBe(
      shouldDitherPixel(0, 0, 'blue-noise', 0.5)
    );
    expect(shouldDitherPixel(33, 49, 'blue-noise', 0.5)).toBe(
      shouldDitherPixel(1, 1, 'blue-noise', 0.5)
    );
  });
});
