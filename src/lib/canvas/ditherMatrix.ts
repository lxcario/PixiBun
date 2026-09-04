/**
 * Bayer and Blue-Noise Threshold Matrices for Authentic Digital Halftoning.
 *
 * Academic Citations:
 * - Robert Ulichney, "The Void-and-Cluster Method for Dither Array Generation,"
 *   SPIE Proceedings Vol. 1913, Human Vision, Visual Processing, and Digital Display IV, pp. 332-343, 1993.
 * - Bryce E. Bayer, "An Optimum Method for Two-Level Rendition of Continuous-Tone Pictures,"
 *   IEEE International Conference on Communications, Vol. 1, pp. 26-11, 1973.
 */

import { DitherMatrixType } from '@/types/tools';

// Bayer threshold matrices for authentic ordered dithering patterns
export const BAYER_2X2 = [
  [0, 2],
  [3, 1],
];

export const BAYER_4X4 = [
  [ 0,  8,  2, 10],
  [12,  4, 14,  6],
  [ 3, 11,  1,  9],
  [15,  7, 13,  5],
];

export const BAYER_8X8 = [
  [ 0, 32,  8, 40,  2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44,  4, 36, 14, 46,  6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [ 3, 35, 11, 43,  1, 33,  9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47,  7, 39, 13, 45,  5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21],
];

/**
 * Generates an authentic Blue-Noise dither matrix via Robert Ulichney's
 * Void-and-Cluster algorithm (SPIE 1993) on a toroidal Gaussian filter domain.
 *
 * @param size Matrix width & height (default: 16)
 * @param sigma Gaussian blur standard deviation (default: 1.9 per Ulichney 1993)
 * @returns 2D array of integers [0, size*size - 1]
 */
export function generateVoidAndClusterMatrix(size: number = 16, sigma: number = 1.9): number[][] {
  const N = size;
  const twoSigmaSq = 2 * sigma * sigma;

  // Precompute toroidal Gaussian blur kernel
  const K: number[][] = Array.from({ length: N }, () => new Array(N));
  for (let y = 0; y < N; y++) {
    const dy = Math.min(y, N - y);
    for (let x = 0; x < N; x++) {
      const dx = Math.min(x, N - x);
      K[y][x] = Math.exp(-(dx * dx + dy * dy) / twoSigmaSq);
    }
  }

  const B: Uint8Array[] = Array.from({ length: N }, () => new Uint8Array(N));
  const F: Float64Array[] = Array.from({ length: N }, () => new Float64Array(N));
  const dither: number[][] = Array.from({ length: N }, () => new Array(N).fill(0));

  const addPoint = (px: number, py: number, sign: number = 1) => {
    B[py][px] = (B[py][px] + sign) & 1;
    for (let y = 0; y < N; y++) {
      const ky = (y - py + N) % N;
      for (let x = 0; x < N; x++) {
        const kx = (x - px + N) % N;
        F[y][x] += sign * K[ky][kx];
      }
    }
  };

  const findCluster = (): { x: number; y: number } => {
    let maxVal = -Infinity;
    let cx = 0;
    let cy = 0;
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        if (B[y][x] === 1 && F[y][x] > maxVal) {
          maxVal = F[y][x];
          cx = x;
          cy = y;
        }
      }
    }
    return { x: cx, y: cy };
  };

  const findVoid = (): { x: number; y: number } => {
    let minVal = Infinity;
    let vx = 0;
    let vy = 0;
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        if (B[y][x] === 0 && F[y][x] < minVal) {
          minVal = F[y][x];
          vx = x;
          vy = y;
        }
      }
    }
    return { x: vx, y: vy };
  };

  // Phase 1: Initialize minority pattern (~10% ones via low-discrepancy sampling)
  const targetM = Math.max(1, Math.round(N * N * 0.1));
  let m = 0;
  for (let i = 0; i < targetM * 2 && m < targetM; i++) {
    const px = Math.floor(((i * 0.6180339887) % 1) * N);
    const py = Math.floor(((i * 0.7548776662) % 1) * N);
    if (B[py][px] === 0) {
      addPoint(px, py, 1);
      m++;
    }
  }

  // Relax minority pattern to global void-and-cluster equilibrium
  for (let iter = 0; iter < 100; iter++) {
    const cluster = findCluster();
    addPoint(cluster.x, cluster.y, -1);
    const voidPt = findVoid();
    if (cluster.x === voidPt.x && cluster.y === voidPt.y) {
      addPoint(cluster.x, cluster.y, 1);
      break;
    }
    addPoint(voidPt.x, voidPt.y, 1);
  }

  // Snapshot relaxed initial pattern
  const B_init: Uint8Array[] = Array.from({ length: N }, (_, y) => Uint8Array.from(B[y]));

  // Phase 2: Successively fill voids up to N*N - 1
  for (let rank = m; rank < N * N; rank++) {
    const v = findVoid();
    dither[v.y][v.x] = rank;
    addPoint(v.x, v.y, 1);
  }

  // Reset to initial relaxed minority pattern
  for (let y = 0; y < N; y++) {
    B[y].fill(0);
    F[y].fill(0);
  }
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      if (B_init[y][x] === 1) {
        addPoint(x, y, 1);
      }
    }
  }

  // Phase 3: Successively remove tightest clusters down to 0
  for (let rank = m - 1; rank >= 0; rank--) {
    const c = findCluster();
    dither[c.y][c.x] = rank;
    addPoint(c.x, c.y, -1);
  }

  return dither;
}

/**
 * Canonical precomputed and cached 16x16 Blue Noise threshold matrix (0 to 255).
 * Free from repeating low-frequency Bayer periodic structures.
 */
export const BLUE_NOISE_16X16: readonly (readonly number[])[] = generateVoidAndClusterMatrix(16, 1.9);

export function shouldDitherPixel(
  x: number,
  y: number,
  matrixType: DitherMatrixType,
  density: number = 0.5 // 0.0 to 1.0 threshold
): boolean {
  if (matrixType === '2x2') {
    const threshold = (BAYER_2X2[((y % 2) + 2) % 2][((x % 2) + 2) % 2] + 0.5) / 4;
    return threshold <= density;
  } else if (matrixType === '4x4') {
    const threshold = (BAYER_4X4[((y % 4) + 4) % 4][((x % 4) + 4) % 4] + 0.5) / 16;
    return threshold <= density;
  } else if (matrixType === '8x8') {
    const threshold = (BAYER_8X8[((y % 8) + 8) % 8][((x % 8) + 8) % 8] + 0.5) / 64;
    return threshold <= density;
  } else if (matrixType === 'blue-noise') {
    const threshold = (BLUE_NOISE_16X16[((y % 16) + 16) % 16][((x % 16) + 16) % 16] + 0.5) / 256;
    return threshold <= density;
  } else if (matrixType === 'atkinson') {
    // Atkinson pseudo-ordered pattern for brush stroke drawing
    const pat = [
      [0, 4, 1, 5],
      [6, 2, 7, 3],
      [1, 5, 0, 4],
      [7, 3, 6, 2],
    ];
    const threshold = (pat[((y % 4) + 4) % 4][((x % 4) + 4) % 4] + 0.5) / 8;
    return threshold <= density;
  } else {
    // Riemersma Hilbert-inspired fractal thresholding
    const h = (Math.abs((x ^ y) * 7 + (x * 3 + y * 5))) % 16;
    const threshold = (h + 0.5) / 16;
    return threshold <= density;
  }
}
