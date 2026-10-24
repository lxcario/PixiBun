// -----------------------------------------------------------------------------
// PixiBun deterministic pixel raster engine (no generative models)
// Professional Real Data Algorithms:
// - Optical Flow & SDF 2D In-Between Frame Morphing
// - Sub-Pixel Anti-Aliasing (De-Jaggy) & Staircase Corner Smoothing
// - Directional Selective Outlining (Sel-Out) with Light Normal Vectors
// - OKLCH hue-based atmospheric color grading presets
// - 47-Tile Wang / Blob Autotiling Bitmask Analysis
// -----------------------------------------------------------------------------

import { ShadedPixel } from '@/lib/graphics/smartMathEngine';
import {
  rgbToOKLab,
  okLabToRGB,
  deltaEOKLab,
  computeSeparableEDT,
  rgbToOklch,
  oklchToRgb,
  shiftHueToward,
  calculate47TileBitmask,
} from '@/lib/graphics/smartMathEngine';
import { hexToRgba } from '@/lib/canvas/floodFill';

export { rgbToOklch, oklchToRgb, shiftHueToward, calculate47TileBitmask };

/**
 * Helper to compute shaded RGB for highlights and shadows.
 */
export function getShadedRgb(
  r: number,
  g: number,
  b: number,
  type: 'light' | 'mid' | 'deep'
): [number, number, number] {
  const [L, C, H] = rgbToOklch(r, g, b);
  if (type === 'light') {
    const newH = shiftHueToward(H, 275, 8);
    return oklchToRgb(Math.min(1.0, L * 1.15 + 0.05), Math.min(0.4, C * 1.05), newH);
  }
  if (type === 'mid') {
    const newH = shiftHueToward(H, 275, 15);
    return oklchToRgb(Math.max(0, L * 0.78 - 0.02), Math.min(0.4, C * 1.12), newH);
  }
  const newH = shiftHueToward(H, 275, 25);
  return oklchToRgb(Math.max(0, L * 0.55 - 0.05), Math.min(0.4, C * 1.25), newH);
}

export function getHighlightRgb(r: number, g: number, b: number): [number, number, number] {
  const [L, C, H] = rgbToOklch(r, g, b);
  const newH = shiftHueToward(H, 80, 15);
  return oklchToRgb(Math.min(1.0, L * 1.35 + 0.12), Math.min(0.4, C * 0.95), newH);
}

/**
 * 1. Selective Outlining (Sel-Out Generator):
 * Replaces harsh solid black outlines with material-aware directional lighting outlines.
 * Uses surface normals: borders facing the light source (azimuth) receive an illuminated
 * rim tint, while shadow-facing borders receive deep saturated material tones.
 */
export function generateSelOutDataSync(
  image: { width: number; height: number; data: Uint8ClampedArray },
  lightAzimuthDeg: number = 315,
  _lightElevationDeg?: number
): { selOutPixels: ShadedPixel[] } {
  const { width, height, data } = image;

  const isOpaque = (x: number, y: number): boolean => {
    if (x < 0 || x >= width || y < 0 || y >= height) return false;
    return data[(y * width + x) * 4 + 3] > 30;
  };

  const azRad = (lightAzimuthDeg * Math.PI) / 180;
  const Lx = Math.sin(azRad);
  const Ly = -Math.cos(azRad);

  const selOutPixels: ShadedPixel[] = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!isOpaque(x, y)) continue;

      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;

      // Check if this pixel is on the perimeter or is a dark outline pixel
      const nN = isOpaque(x, y - 1);
      const nS = isOpaque(x, y + 1);
      const nW = isOpaque(x - 1, y);
      const nE = isOpaque(x + 1, y);

      const touchesAlpha = !nN || !nS || !nW || !nE;
      const isOutlineCandidate = touchesAlpha || lum < 70;

      if (!isOutlineCandidate) continue;

      // Find interior sample color
      let sampleR = r, sampleG = g, sampleB = b;
      if (lum < 70) {
        const neighbors = [
          [x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1],
          [x + 1, y + 1], [x - 1, y - 1], [x + 1, y - 1], [x - 1, y + 1]
        ];
        for (const [nx, ny] of neighbors) {
          if (isOpaque(nx, ny)) {
            const nIdx = (ny * width + nx) * 4;
            const nLum = 0.299 * data[nIdx] + 0.587 * data[nIdx + 1] + 0.114 * data[nIdx + 2];
            if (nLum >= 70) {
              sampleR = data[nIdx];
              sampleG = data[nIdx + 1];
              sampleB = data[nIdx + 2];
              break;
            }
          }
        }
      }

      // Normal vector pointing outward toward open air
      let nx = 0, ny = 0;
      if (!nW) nx -= 1;
      if (!nE) nx += 1;
      if (!nN) ny -= 1;
      if (!nS) ny += 1;

      const len = Math.sqrt(nx * nx + ny * ny) || 1;
      const normX = nx / len;
      const normY = ny / len;

      // Alignment with light vector
      const NdotL = normX * Lx + normY * Ly;

      if (NdotL > 0.1) {
        // Light-facing border: soft illuminated rim
        const [hr, hg, hb] = getShadedRgb(sampleR, sampleG, sampleB, 'mid');
        selOutPixels.push({ x, y, r: hr, g: hg, b: hb, a: 255 });
      } else {
        // Shadow-facing border: deep colored shadow (never pure flat black)
        const [sr, sg, sb] = getShadedRgb(sampleR, sampleG, sampleB, 'deep');
        selOutPixels.push({ x, y, r: sr, g: sg, b: sb, a: 255 });
      }
    }
  }

  return { selOutPixels };
}

export function generateSelOutData(
  srcCtx: CanvasRenderingContext2D,
  width: number,
  height: number,
  lightAzimuthDeg: number = 315
): { selOutPixels: ShadedPixel[] } {
  const imgData = srcCtx.getImageData(0, 0, width, height);
  return generateSelOutDataSync(
    { width, height, data: imgData.data },
    lightAzimuthDeg
  );
}

/**
 * 2. Smart Hand-Crafted Anti-Aliasing (De-Jaggy Filter):
 * Evaluates high-contrast staircase kinks (L-crooks in 1px lines) along contours.
 * Instead of deleting pixels, it inserts smooth intermediate OKLab blend pixels
 * into the stair-step crook, transforming jagged diagonal steps into clean curves.
 */
export function cleanJaggiesOnCanvas(
  srcCtx: CanvasRenderingContext2D,
  width: number,
  height: number
): { cleanedCount: number } {
  const imgData = srcCtx.getImageData(0, 0, width, height);
  const data = imgData.data;

  const isOpaque = (x: number, y: number): boolean => {
    if (x < 0 || x >= width || y < 0 || y >= height) return false;
    return data[(y * width + x) * 4 + 3] > 30;
  };

  const getPixel = (x: number, y: number) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return null;
    const idx = (y * width + x) * 4;
    return { r: data[idx], g: data[idx + 1], b: data[idx + 2], a: data[idx + 3] };
  };

  const blendPixels = new Map<string, { r: number; g: number; b: number; a: number }>();

  // Scan for 2x2 staircase L-crooks
  for (let y = 0; y < height - 1; y++) {
    for (let x = 0; x < width - 1; x++) {
      const p00 = isOpaque(x, y);
      const p10 = isOpaque(x + 1, y);
      const p01 = isOpaque(x, y + 1);
      const p11 = isOpaque(x + 1, y + 1);

      const sum = (p00 ? 1 : 0) + (p10 ? 1 : 0) + (p01 ? 1 : 0) + (p11 ? 1 : 0);

      // 3 opaque, 1 transparent -> an L-crook where anti-aliasing smooths the staircase
      if (sum === 3) {
        let emptyX = x, emptyY = y;
        let c1 = getPixel(x, y), c2 = getPixel(x + 1, y);

        if (!p00) { emptyX = x; emptyY = y; c1 = getPixel(x + 1, y); c2 = getPixel(x, y + 1); }
        else if (!p10) { emptyX = x + 1; emptyY = y; c1 = getPixel(x, y); c2 = getPixel(x + 1, y + 1); }
        else if (!p01) { emptyX = x; emptyY = y + 1; c1 = getPixel(x, y); c2 = getPixel(x + 1, y + 1); }
        else if (!p11) { emptyX = x + 1; emptyY = y + 1; c1 = getPixel(x + 1, y); c2 = getPixel(x, y + 1); }

        if (c1 && c2 && c1.a > 30 && c2.a > 30) {
          const lab1 = rgbToOKLab(c1.r, c1.g, c1.b);
          const lab2 = rgbToOKLab(c2.r, c2.g, c2.b);
          const avgLab = {
            L: (lab1.L + lab2.L) / 2,
            a: (lab1.a + lab2.a) / 2,
            b: (lab1.b + lab2.b) / 2,
          };
          const rgb = okLabToRGB(avgLab.L, avgLab.a, avgLab.b);
          blendPixels.set(`${emptyX},${emptyY}`, { r: rgb.r, g: rgb.g, b: rgb.b, a: 160 });
        }
      }
    }
  }

  blendPixels.forEach((p, key) => {
    const [px, py] = key.split(',').map(Number);
    const idx = (py * width + px) * 4;
    // Only place AA if cell was empty
    if (data[idx + 3] <= 30) {
      data[idx] = p.r;
      data[idx + 1] = p.g;
      data[idx + 2] = p.b;
      data[idx + 3] = p.a;
    }
  });

  srcCtx.putImageData(imgData, 0, 0);
  return { cleanedCount: blendPixels.size };
}

/**
 * 3. Atmospheric Photographic Color Grading:
 * Applies fixed OKLCH hue, lightness, and chroma adjustments for stylized
 * sunset, moonlight, and neon looks, plus a four-color Game Boy palette.
 */
export function applyAtmosphericColorGrade(
  srcCtx: CanvasRenderingContext2D,
  width: number,
  height: number,
  grade: 'sunset' | 'moonlight' | 'neon' | 'gameboy'
): void {
  const imgData = srcCtx.getImageData(0, 0, width, height);
  const data = imgData.data;

  const DMG_PALETTE = [
    { r: 15, g: 56, b: 15 },
    { r: 48, g: 98, b: 48 },
    { r: 139, g: 172, b: 15 },
    { r: 155, g: 188, b: 15 },
  ];

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] <= 30) continue;

    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const [L, C, H] = rgbToOklch(r, g, b);

    if (grade === 'sunset') {
      // Golden Hour: shift hue toward warm amber with brighter, more saturated color.
      const newH = shiftHueToward(H, 65, 30);
      const newL = Math.min(0.96, L * 1.08 + 0.02);
      const newC = Math.min(0.35, C * 1.25);
      const [nr, ng, nb] = oklchToRgb(newL, newC, newH);
      data[i] = nr;
      data[i + 1] = ng;
      data[i + 2] = nb;
    } else if (grade === 'moonlight') {
      // Moonlight / Cool Night: shift hue toward cobalt with lower lightness and chroma.
      const newH = shiftHueToward(H, 260, 35);
      const newL = Math.max(0.06, L * 0.92);
      const newC = Math.max(0.02, C * 0.85);
      const [nr, ng, nb] = oklchToRgb(newL, newC, newH);
      data[i] = nr;
      data[i + 1] = ng;
      data[i + 2] = nb;
    } else if (grade === 'neon') {
      // Cyberpunk Dusk: Split-toning with cyan/teal highlights and vivid magenta/violet shadows
      const isHighlight = L > 0.5;
      const targetHue = isHighlight ? 185 : 320; // Cyan vs Magenta
      const newH = shiftHueToward(H, targetHue, 45);
      const newL = isHighlight ? Math.min(0.98, L * 1.12) : Math.max(0.04, L * 0.88);
      const newC = Math.min(0.38, C * 1.4);
      const [nr, ng, nb] = oklchToRgb(newL, newC, newH);
      data[i] = nr;
      data[i + 1] = ng;
      data[i + 2] = nb;
    } else if (grade === 'gameboy') {
      // Authentic 4-shade Game Boy DMG LCD green matrix
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      const shadeIdx = Math.min(3, Math.floor(lum * 4));
      const chosen = DMG_PALETTE[shadeIdx];
      data[i] = chosen.r;
      data[i + 1] = chosen.g;
      data[i + 2] = chosen.b;
    }
  }

  srcCtx.putImageData(imgData, 0, 0);
}

/**
 * Precomputes a nearby opaque pixel index for all pixels in O(W * H) using
 * 8-connected multi-source BFS. This uses Chebyshev path distance and can pick
 * a different seed than a Euclidean nearest-neighbor search.
 */
function computeNearestColorMap(data: Uint8ClampedArray, width: number, height: number): Int32Array {
  const totalPixels = width * height;
  const nearest = new Int32Array(totalPixels).fill(-1);
  const queue = new Int32Array(totalPixels);
  let head = 0;
  let tail = 0;

  for (let i = 0; i < totalPixels; i++) {
    if (data[i * 4 + 3] > 10) {
      nearest[i] = i;
      queue[tail++] = i;
    }
  }

  const dx = [-1, 0, 1, -1, 1, -1, 0, 1];
  const dy = [-1, -1, -1, 0, 0, 1, 1, 1];

  while (head < tail) {
    const curr = queue[head++];
    const cx = curr % width;
    const cy = Math.floor(curr / width);
    const seed = nearest[curr];

    for (let k = 0; k < 8; k++) {
      const nx = cx + dx[k];
      const ny = cy + dy[k];
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const nIdx = ny * width + nx;
        if (nearest[nIdx] === -1) {
          nearest[nIdx] = seed;
          queue[tail++] = nIdx;
        }
      }
    }
  }

  return nearest;
}

/**
 * Generates an in-between frame at arbitrary fraction t in [0, 1] using Signed Distance Field
 * interpolation with multi-source nearest-color sampling and linear sRGB cross-fading.
 */
function assertMorphFramesCompatible(
  frameA: { width: number; height: number; data: Uint8ClampedArray },
  frameB: { width: number; height: number; data: Uint8ClampedArray }
): void {
  const pixels = frameA.width * frameA.height;
  if (
    !Number.isSafeInteger(frameA.width) || !Number.isSafeInteger(frameA.height) ||
    frameA.width <= 0 || frameA.height <= 0 ||
    frameB.width !== frameA.width || frameB.height !== frameA.height ||
    !Number.isSafeInteger(pixels) ||
    frameA.data.length !== pixels * 4 || frameB.data.length !== pixels * 4
  ) {
    throw new RangeError('SDF morph frames must have identical positive dimensions and RGBA buffer lengths.');
  }
}

export function morphInBetweenFrameAtFraction(
  frameA: { width: number; height: number; data: Uint8ClampedArray },
  frameB: { width: number; height: number; data: Uint8ClampedArray },
  fraction: number
): { width: number; height: number; data: Uint8ClampedArray } {
  assertMorphFramesCompatible(frameA, frameB);
  const { width, height } = frameA;
  const t = Math.max(0, Math.min(1, fraction));

  if (t === 0) {
    return { width, height, data: new Uint8ClampedArray(frameA.data) };
  }
  if (t === 1) {
    return { width, height, data: new Uint8ClampedArray(frameB.data) };
  }

  const dataA = frameA.data;
  const dataB = frameB.data;

  const getSDF = (data: Uint8ClampedArray) => {
    const insideDist = computeSeparableEDT((x, y) => data[(y * width + x) * 4 + 3] > 10, width, height);
    const outsideDist = computeSeparableEDT((x, y) => data[(y * width + x) * 4 + 3] <= 10, width, height);
    const sdf = new Float32Array(width * height);
    for (let i = 0; i < width * height; i++) {
      sdf[i] = outsideDist[i] - insideDist[i];
    }
    return sdf;
  };

  const sdfA = getSDF(dataA);
  const sdfB = getSDF(dataB);
  const nearestA = computeNearestColorMap(dataA, width, height);
  const nearestB = computeNearestColorMap(dataB, width, height);

  const outData = new Uint8ClampedArray(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const outIdx = i * 4;

      const tweenedSDF = sdfA[i] * (1 - t) + sdfB[i] * t;
      if (tweenedSDF <= 0) {
        const seedA = nearestA[i];
        const seedB = nearestB[i];

        const hasA = seedA >= 0;
        const hasB = seedB >= 0;
        if (!hasA && !hasB) continue;

        const aIdx = hasA ? seedA * 4 : 0;
        const bIdx = hasB ? seedB * 4 : 0;

        const rA = hasA ? dataA[aIdx] : (hasB ? dataB[bIdx] : 0);
        const gA = hasA ? dataA[aIdx + 1] : (hasB ? dataB[bIdx + 1] : 0);
        const bA = hasA ? dataA[aIdx + 2] : (hasB ? dataB[bIdx + 2] : 0);

        const rB = hasB ? dataB[bIdx] : (hasA ? dataA[aIdx] : 0);
        const gB = hasB ? dataB[bIdx + 1] : (hasA ? dataA[aIdx + 1] : 0);
        const bB = hasB ? dataB[bIdx + 2] : (hasA ? dataA[aIdx + 2] : 0);
        const alphaA = hasA ? dataA[aIdx + 3] : 0;
        const alphaB = hasB ? dataB[bIdx + 3] : 0;

        outData[outIdx] = Math.round(rA * (1 - t) + rB * t);
        outData[outIdx + 1] = Math.round(gA * (1 - t) + gB * t);
        outData[outIdx + 2] = Math.round(bA * (1 - t) + bB * t);
        outData[outIdx + 3] = Math.round(alphaA * (1 - t) + alphaB * t);
      }
    }
  }

  return { width, height, data: outData };
}

/**
 * Pure buffer Signed Distance Field (SDF) tweening for frames A and B.
 */
export function morphInBetweenFramesSync(
  frameA: { width: number; height: number; data: Uint8ClampedArray },
  frameB: { width: number; height: number; data: Uint8ClampedArray },
  steps: number = 1
): { width: number; height: number; data: Uint8ClampedArray }[] {
  assertMorphFramesCompatible(frameA, frameB);
  const { width, height } = frameA;
  const dataA = frameA.data;
  const dataB = frameB.data;

  const getSDF = (data: Uint8ClampedArray) => {
    const insideDist = computeSeparableEDT((x, y) => data[(y * width + x) * 4 + 3] > 10, width, height);
    const outsideDist = computeSeparableEDT((x, y) => data[(y * width + x) * 4 + 3] <= 10, width, height);

    const sdf = new Float32Array(width * height);
    for (let i = 0; i < width * height; i++) {
      sdf[i] = outsideDist[i] - insideDist[i];
    }
    return sdf;
  };

  const sdfA = getSDF(dataA);
  const sdfB = getSDF(dataB);
  const nearestA = computeNearestColorMap(dataA, width, height);
  const nearestB = computeNearestColorMap(dataB, width, height);

  const results: { width: number; height: number; data: Uint8ClampedArray }[] = [];

  for (let s = 1; s <= steps; s++) {
    const t = s / (steps + 1);
    const outData = new Uint8ClampedArray(width * height * 4);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        const outIdx = i * 4;

        const tweenedSDF = sdfA[i] * (1 - t) + sdfB[i] * t;
        if (tweenedSDF <= 0) {
          const seedA = nearestA[i];
          const seedB = nearestB[i];

          const hasA = seedA >= 0;
          const hasB = seedB >= 0;
          if (!hasA && !hasB) continue;

          const aIdx = hasA ? seedA * 4 : 0;
          const bIdx = hasB ? seedB * 4 : 0;

          const rA = hasA ? dataA[aIdx] : (hasB ? dataB[bIdx] : 0);
          const gA = hasA ? dataA[aIdx + 1] : (hasB ? dataB[bIdx + 1] : 0);
          const bA = hasA ? dataA[aIdx + 2] : (hasB ? dataB[bIdx + 2] : 0);

          const rB = hasB ? dataB[bIdx] : (hasA ? dataA[aIdx] : 0);
          const gB = hasB ? dataB[bIdx + 1] : (hasA ? dataA[aIdx + 1] : 0);
          const bB = hasB ? dataB[bIdx + 2] : (hasA ? dataA[aIdx + 2] : 0);
          const alphaA = hasA ? dataA[aIdx + 3] : 0;
          const alphaB = hasB ? dataB[bIdx + 3] : 0;

          outData[outIdx] = Math.round(rA * (1 - t) + rB * t);
          outData[outIdx + 1] = Math.round(gA * (1 - t) + gB * t);
          outData[outIdx + 2] = Math.round(bA * (1 - t) + bB * t);
          outData[outIdx + 3] = Math.round(alphaA * (1 - t) + alphaB * t);
        }
      }
    }
    results.push({ width, height, data: outData });
  }

  return results;
}

/**
 * 4. Signed Distance Field (SDF) In-Between Frame Morphing:
 * Given Frame A and Frame B, computes Euclidean distance fields to interpolate
 * shape boundaries and color trajectories at fractional time t in [0, 1].
 */
export function morphInBetweenFrames(
  ctxA: CanvasRenderingContext2D,
  ctxB: CanvasRenderingContext2D,
  width: number,
  height: number,
  t: number = 0.5
): HTMLCanvasElement {
  const dataA = ctxA.getImageData(0, 0, width, height).data;
  const dataB = ctxB.getImageData(0, 0, width, height).data;

  const outCanvas = document.createElement('canvas');
  outCanvas.width = width;
  outCanvas.height = height;
  const outCtx = outCanvas.getContext('2d')!;
  const outImgData = outCtx.createImageData(width, height);

  const result = morphInBetweenFrameAtFraction(
    { width, height, data: dataA },
    { width, height, data: dataB },
    t
  );

  outImgData.data.set(result.data);
  outCtx.putImageData(outImgData, 0, 0);
  return outCanvas;
}

/**
 * 5. Snap to Active Palette (Color Reducer / Quantizer):
 */
export function quantizeToActivePalette(
  srcCtx: CanvasRenderingContext2D,
  width: number,
  height: number,
  paletteHexColors: string[]
): void {
  if (paletteHexColors.length === 0) return;

  const imgData = srcCtx.getImageData(0, 0, width, height);
  const data = imgData.data;

  const palRgba = paletteHexColors.map(hexToRgba);
  const palLab = palRgba.map(c => rgbToOKLab(c.r, c.g, c.b));

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] <= 30) continue;

    const lab = rgbToOKLab(data[i], data[i + 1], data[i + 2]);
    let closestIdx = 0;
    let minDiff = Infinity;

    for (let k = 0; k < palLab.length; k++) {
      const diff = deltaEOKLab(lab, palLab[k]);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = k;
      }
    }

    const chosen = palRgba[closestIdx];
    data[i] = chosen.r;
    data[i + 1] = chosen.g;
    data[i + 2] = chosen.b;
  }

  srcCtx.putImageData(imgData, 0, 0);
}

/**
 * 6. High-Performance Stray Pixel & Floating Island Cleaner:
 */
export function cleanStrayPixelsOnCanvas(
  srcCtx: CanvasRenderingContext2D,
  width: number,
  height: number
): { cleanedCount: number } {
  const imgData = srcCtx.getImageData(0, 0, width, height);
  const data = imgData.data;

  const isOpaque = (x: number, y: number): boolean => {
    if (x < 0 || x >= width || y < 0 || y >= height) return false;
    return data[(y * width + x) * 4 + 3] > 30;
  };

  let cleanedCount = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!isOpaque(x, y)) continue;

      let neighborsCount = 0;
      const neighbors = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]];
      for (const [nx, ny] of neighbors) {
        if (isOpaque(nx, ny)) neighborsCount++;
      }

      // Single disconnected pixel surrounded by air
      if (neighborsCount === 0) {
        data[(y * width + x) * 4 + 3] = 0;
        cleanedCount++;
      }
    }
  }

  srcCtx.putImageData(imgData, 0, 0);
  return { cleanedCount };
}

/**
 * 7. Palette Harmonizer:
 */
export function harmonizePaletteColors(existingColors: string[]): string[] {
  const harmonics = ['#3A2E4C', '#6A5880', '#A86EC6', '#C792DF', '#DCABDF', '#D0C4DF', '#F0BE7C', '#FFF8DB'];
  const newColors: string[] = [];

  harmonics.forEach(c => {
    if (!existingColors.includes(c)) {
      newColors.push(c);
    }
  });

  return newColors.slice(0, 4);
}

/**
 * 8. 47-Tile Blob Autotiling Edge & Corner Contour Generator
 */

export function generate47BlobEdgeData(
  srcCtx: CanvasRenderingContext2D,
  width: number,
  height: number
): { blobPixels: ShadedPixel[] } {
  const imgData = srcCtx.getImageData(0, 0, width, height);
  const data = imgData.data;

  const isOpaque = (x: number, y: number): boolean => {
    if (x < 0 || x >= width || y < 0 || y >= height) return false;
    return data[(y * width + x) * 4 + 3] > 30;
  };

  const blobPixels: ShadedPixel[] = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!isOpaque(x, y)) continue;

      const bitmask = calculate47TileBitmask(isOpaque, x, y);
      if (bitmask === 255) continue;

      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      const hasNorth = (bitmask & 1) !== 0;
      const hasWest = (bitmask & 64) !== 0;
      const hasSouth = (bitmask & 16) !== 0;
      const hasEast = (bitmask & 4) !== 0;

      if (!hasNorth || !hasWest) {
        const [hr, hg, hb] = getHighlightRgb(r, g, b);
        blobPixels.push({ x, y, r: hr, g: hg, b: hb, a: 220 });
      } else if (!hasSouth || !hasEast) {
        const [sr, sg, sb] = getShadedRgb(r, g, b, 'deep');
        blobPixels.push({ x, y, r: sr, g: sg, b: sb, a: 220 });
      } else {
        const [sr, sg, sb] = getShadedRgb(r, g, b, 'mid');
        blobPixels.push({ x, y, r: sr, g: sg, b: sb, a: 200 });
      }
    }
  }

  return { blobPixels };
}

export function generateOuterStrokeData(
  srcCtx: CanvasRenderingContext2D,
  width: number,
  height: number,
  strokeColorHex: string = '#2B2038',
  thickness: number = 1
): { strokePixels: ShadedPixel[] } {
  const imgData = srcCtx.getImageData(0, 0, width, height);
  const data = imgData.data;

  const isOpaque = (x: number, y: number): boolean => {
    if (x < 0 || x >= width || y < 0 || y >= height) return false;
    return data[(y * width + x) * 4 + 3] > 30;
  };

  const strokeRgb = hexToRgba(strokeColorHex);
  const strokePixels: ShadedPixel[] = [];
  const radius = Math.max(1, Math.min(8, Math.round(thickness)));

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (isOpaque(x, y)) continue;

      let hasOpaqueNeighbor = false;
      for (let dy = -radius; dy <= radius && !hasOpaqueNeighbor; dy++) {
        const maxDx = radius - Math.abs(dy);
        for (let dx = -maxDx; dx <= maxDx; dx++) {
          if ((dx !== 0 || dy !== 0) && isOpaque(x + dx, y + dy)) {
            hasOpaqueNeighbor = true;
            break;
          }
        }
      }

      if (hasOpaqueNeighbor) {
        strokePixels.push({
          x,
          y,
          r: strokeRgb.r,
          g: strokeRgb.g,
          b: strokeRgb.b,
          a: 255,
        });
      }
    }
  }

  return { strokePixels };
}

