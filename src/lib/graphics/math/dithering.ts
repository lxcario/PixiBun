/**
 * Dithering Algorithms: Bayer, Atkinson, and Riemersma Hilbert Space-Filling Curve.
 *
 * Citations:
 * 1. Bryce E. Bayer, "An optimum method for two-level rendition of continuous-tone pictures",
 *    IEEE International Conference on Communications (ICC), 1973.
 * 2. Bill Atkinson, Atkinson Dithering Algorithm, Apple Computer, 1984.
 *    Fractional (1/8) error diffusion distributing error to 6 neighboring pixels, preserving specular highlights.
 * 3. Thiadmer Riemersma, "A Balanced Dithering Technique",
 *    C/C++ Users Journal, Vol. 16, No. 12, December 1998.
 *    https://www.compuphase.com/articles_pub_en.htm
 *    1D error diffusion along a recursive 2D Hilbert space-filling curve with exponential error decay.
 */

import { rgbaToHex, hexToRgba } from '@/lib/canvas/floodFill';
import { generateOklchRamp } from '@/lib/color/rampGenerator';
import { BAYER_2X2, BAYER_4X4, BAYER_8X8 } from '@/lib/canvas/ditherMatrix';

export function getBayerMatrixThreshold(x: number, y: number, size: '2x2' | '4x4' | '8x8'): number {
  if (size === '2x2') {
    return (BAYER_2X2[((y % 2) + 2) % 2][((x % 2) + 2) % 2] + 0.5) / 4.0;
  }
  if (size === '4x4') {
    return (BAYER_4X4[((y % 4) + 4) % 4][((x % 4) + 4) % 4] + 0.5) / 16.0;
  }
  return (BAYER_8X8[((y % 8) + 8) % 8][((x % 8) + 8) % 8] + 0.5) / 64.0;
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

  const numPoints = order * order;
  const historyLength = 16;
  const errR = new Array<number>(historyLength).fill(0);
  const errG = new Array<number>(historyLength).fill(0);
  const errB = new Array<number>(historyLength).fill(0);
  // A 16:1 newest-to-oldest weight ratio keeps recent quantization error
  // strong enough to dither while retaining spatial context along the curve.
  const decay = Math.pow(1 / 16, 1 / (historyLength - 1));

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

    if (x >= width || y >= height) continue;
    const idx = y * width + x;

    if (data[idx * 4 + 3] <= 30) continue;

    let totalErrR = 0;
    let totalErrG = 0;
    let totalErrB = 0;

    for (let i = 0; i < historyLength; i++) {
      const weight = Math.pow(decay, historyLength - 1 - i);
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
