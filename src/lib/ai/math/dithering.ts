/**
 * Dithering Algorithms: Bayer, Atkinson, and Riemersma Hilbert Space-Filling Curve.
 *
 * Citations:
 * 1. Bryce E. Bayer, "An optimum method for two-level rendition of continuous-tone pictures",
 *    IEEE International Conference on Communications (ICC), 1973.
 * 2. Bill Atkinson, Atkinson Dithering Algorithm, Apple Computer, 1984.
 *    Fractional (1/8) error diffusion distributing error to 6 neighboring pixels, preserving specular highlights.
 * 3. Thiadmer Riemersma, "A Balanced Dithering Algorithm",
 *    C/C++ Users Journal, Vol. 16, No. 12, December 1998.
 *    1D error diffusion along a recursive 2D Hilbert space-filling curve with exponential error decay.
 */

import { rgbaToHex, hexToRgba } from '@/lib/canvas/floodFill';
import { generateOklchRamp } from '@/lib/color/rampGenerator';

export function getBayerMatrixThreshold(x: number, y: number, size: '2x2' | '4x4' | '8x8'): number {
  if (size === '2x2') {
    const bayer2 = [
      [0, 2],
      [3, 1],
    ];
    return (bayer2[y % 2][x % 2] + 0.5) / 4.0;
  }
  if (size === '4x4') {
    const bayer4 = [
      [ 0,  8,  2, 10],
      [12,  4, 14,  6],
      [ 3, 11,  1,  9],
      [15,  7, 13,  5],
    ];
    return (bayer4[y % 4][x % 4] + 0.5) / 16.0;
  }
  const bayer8 = [
    [ 0, 32,  8, 40,  2, 34, 10, 42],
    [48, 16, 56, 24, 50, 18, 58, 26],
    [12, 44,  4, 36, 14, 46,  6, 38],
    [60, 28, 52, 20, 62, 30, 54, 22],
    [ 3, 35, 11, 43,  1, 33,  9, 41],
    [51, 19, 59, 27, 49, 17, 57, 25],
    [15, 47,  7, 39, 13, 45,  5, 37],
    [63, 31, 55, 23, 61, 29, 53, 21],
  ];
  return (bayer8[y % 8][x % 8] + 0.5) / 64.0;
}

/**
 * Atkinson Error-Diffusion Dithering (1/8 fraction to 6 neighbors).
 */
export function applyAtkinsonDither(
  srcCtx: CanvasRenderingContext2D,
  width: number,
  height: number,
  paletteHex: string[]
): void {
  const imgData = srcCtx.getImageData(0, 0, width, height);
  const data = imgData.data;

  let effectivePalette = paletteHex;
  if (!effectivePalette || effectivePalette.length < 2) {
    const canvasColors = new Set<string>();
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 30) {
        canvasColors.add(rgbaToHex(data[i], data[i + 1], data[i + 2], 255));
      }
    }
    const customPalette = new Set<string>();
    canvasColors.forEach(c => {
      customPalette.add(c);
      const ramp = generateOklchRamp(c);
      ramp.forEach(rc => customPalette.add(rc));
    });
    effectivePalette = Array.from(customPalette).slice(0, 16);
  }

  if (effectivePalette.length === 0) return;
  const palRgba = effectivePalette.map(hexToRgba);

  const rBuf = new Float32Array(width * height);
  const gBuf = new Float32Array(width * height);
  const bBuf = new Float32Array(width * height);

  for (let i = 0; i < width * height; i++) {
    rBuf[i] = data[i * 4];
    gBuf[i] = data[i * 4 + 1];
    bBuf[i] = data[i * 4 + 2];
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (data[idx * 4 + 3] <= 30) continue;

      const oldR = Math.max(0, Math.min(255, rBuf[idx]));
      const oldG = Math.max(0, Math.min(255, gBuf[idx]));
      const oldB = Math.max(0, Math.min(255, bBuf[idx]));

      let closest = palRgba[0];
      let minDiff = Infinity;
      for (const c of palRgba) {
        const diff = (oldR - c.r) ** 2 + (oldG - c.g) ** 2 + (oldB - c.b) ** 2;
        if (diff < minDiff) {
          minDiff = diff;
          closest = c;
        }
      }

      data[idx * 4] = closest.r;
      data[idx * 4 + 1] = closest.g;
      data[idx * 4 + 2] = closest.b;

      const errR = (oldR - closest.r) / 8;
      const errG = (oldG - closest.g) / 8;
      const errB = (oldB - closest.b) / 8;

      const offsets = [
        [x + 1, y],
        [x + 2, y],
        [x - 1, y + 1],
        [x, y + 1],
        [x + 1, y + 1],
        [x, y + 2],
      ];

      for (const [nx, ny] of offsets) {
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const nIdx = ny * width + nx;
          if (data[nIdx * 4 + 3] > 30) {
            rBuf[nIdx] += errR;
            gBuf[nIdx] += errG;
            bBuf[nIdx] += errB;
          }
        }
      }
    }
  }

  srcCtx.putImageData(imgData, 0, 0);
}

/**
 * Riemersma Hilbert Space-Filling Curve Dithering.
 */
export function applyRiemersmaDither(
  srcCtx: CanvasRenderingContext2D,
  width: number,
  height: number,
  paletteHex: string[]
): void {
  const imgData = srcCtx.getImageData(0, 0, width, height);
  const data = imgData.data;

  let effectivePalette = paletteHex;
  if (!effectivePalette || effectivePalette.length < 2) {
    const canvasColors = new Set<string>();
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 30) {
        canvasColors.add(rgbaToHex(data[i], data[i + 1], data[i + 2], 255));
      }
    }
    const customPalette = new Set<string>();
    canvasColors.forEach(c => {
      customPalette.add(c);
      const ramp = generateOklchRamp(c);
      ramp.forEach(rc => customPalette.add(rc));
    });
    effectivePalette = Array.from(customPalette).slice(0, 16);
  }

  if (effectivePalette.length === 0) return;
  const palRgba = effectivePalette.map(hexToRgba);

  let order = 1;
  while (order < Math.max(width, height)) {
    order *= 2;
  }

  const path: [number, number][] = [];
  const numPoints = order * order;

  for (let d = 0; d < numPoints; d++) {
    let rx: number, ry: number, s: number;
    let t = d;
    let x = 0;
    let y = 0;

    for (s = 1; s < order; s *= 2) {
      rx = 1 & Math.floor(t / 2);
      ry = 1 & (t ^ rx);
      if (ry === 0) {
        if (rx === 1) {
          x = s - 1 - x;
          y = s - 1 - y;
        }
        const temp = x;
        x = y;
        y = temp;
      }
      x += s * rx;
      y += s * ry;
      t = Math.floor(t / 4);
    }

    if (x >= 0 && x < width && y >= 0 && y < height) {
      path.push([x, y]);
    }
  }

  const historyLength = 16;
  const errR = new Array<number>(historyLength).fill(0);
  const errG = new Array<number>(historyLength).fill(0);
  const errB = new Array<number>(historyLength).fill(0);
  const decay = 1 / 8;

  for (let p = 0; p < path.length; p++) {
    const [x, y] = path[p];
    const idx = y * width + x;

    if (data[idx * 4 + 3] <= 30) continue;

    let totalErrR = 0;
    let totalErrG = 0;
    let totalErrB = 0;

    for (let i = 0; i < historyLength; i++) {
      const weight = Math.pow(decay, historyLength - i);
      totalErrR += errR[i] * weight;
      totalErrG += errG[i] * weight;
      totalErrB += errB[i] * weight;
    }

    const r = Math.max(0, Math.min(255, data[idx * 4] + totalErrR));
    const g = Math.max(0, Math.min(255, data[idx * 4 + 1] + totalErrG));
    const b = Math.max(0, Math.min(255, data[idx * 4 + 2] + totalErrB));

    let closest = palRgba[0];
    let minDiff = Infinity;
    for (const c of palRgba) {
      const diff = (r - c.r) ** 2 + (g - c.g) ** 2 + (b - c.b) ** 2;
      if (diff < minDiff) {
        minDiff = diff;
        closest = c;
      }
    }

    const qErrR = (data[idx * 4] + totalErrR) - closest.r;
    const qErrG = (data[idx * 4 + 1] + totalErrG) - closest.g;
    const qErrB = (data[idx * 4 + 2] + totalErrB) - closest.b;

    data[idx * 4] = closest.r;
    data[idx * 4 + 1] = closest.g;
    data[idx * 4 + 2] = closest.b;

    errR.shift();
    errR.push(qErrR);
    errG.shift();
    errG.push(qErrG);
    errB.shift();
    errB.push(qErrB);
  }

  srcCtx.putImageData(imgData, 0, 0);
}
