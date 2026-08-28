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

import { DitherMatrixType } from '@/types/tools';

export function shouldDitherPixel(
  x: number,
  y: number,
  matrixType: DitherMatrixType,
  density: number = 0.5 // 0.0 to 1.0 threshold
): boolean {
  if (matrixType === '2x2') {
    const threshold = (BAYER_2X2[y % 2][x % 2] + 0.5) / 4;
    return threshold <= density;
  } else if (matrixType === '4x4') {
    const threshold = (BAYER_4X4[y % 4][x % 4] + 0.5) / 16;
    return threshold <= density;
  } else if (matrixType === '8x8') {
    const threshold = (BAYER_8X8[y % 8][x % 8] + 0.5) / 64;
    return threshold <= density;
  } else if (matrixType === 'atkinson') {
    // Atkinson pseudo-ordered pattern for brush stroke drawing
    const pat = [
      [0, 4, 1, 5],
      [6, 2, 7, 3],
      [1, 5, 0, 4],
      [7, 3, 6, 2],
    ];
    const threshold = (pat[y % 4][x % 4] + 0.5) / 8;
    return threshold <= density;
  } else {
    // Riemersma Hilbert-inspired fractal thresholding
    const h = ((x ^ y) * 7 + (x * 3 + y * 5)) % 16;
    const threshold = (h + 0.5) / 16;
    return threshold <= density;
  }
}

