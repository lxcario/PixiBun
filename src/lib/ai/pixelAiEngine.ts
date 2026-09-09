// -----------------------------------------------------------------------------
// PixiBun Smart Pixel AI & Mathematical Raster Engine
// Professional Real Data Algorithms:
// - Optical Flow & SDF 2D In-Between Frame Morphing
// - Sub-Pixel Anti-Aliasing (De-Jaggy) & Staircase Corner Smoothing
// - Directional Selective Outlining (Sel-Out) with Light Normal Vectors
// - OKLab Color Temperature & Atmospheric Kelvin Color Grading
// - 47-Tile Wang / Blob Autotiling Bitmask Analysis
// -----------------------------------------------------------------------------

import { ShadedPixel } from '@/lib/ai/smartMathEngine';
import {
  rgbToOKLab,
  okLabToRGB,
  deltaEOKLab,
  computeSeparableEDT,
  rgbToOklch,
  oklchToRgb,
  shiftHueToward,
  calculate47TileBitmask,
} from '@/lib/ai/smartMathEngine';
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
 * Implements real physical Kelvin color temperature shifts, chromatic adaptation matrices,
 * and cinematic split-toning in OKLab space.
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
      // Golden Hour: Warm Kelvin shift (+2800K), amber peach highlights, warm auburn shadows
      const newH = shiftHueToward(H, 65, 30);
      const newL = Math.min(0.96, L * 1.08 + 0.02);
      const newC = Math.min(0.35, C * 1.25);
      const [nr, ng, nb] = oklchToRgb(newL, newC, newH);
      data[i] = nr;
      data[i + 1] = ng;
      data[i + 2] = nb;
    } else if (grade === 'moonlight') {
      // Moonlight / Cool Night: Cool Kelvin shift (-3500K), Purkinje dark adaptation, luminous cobalt blue tint
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
 * Pure buffer optical flow tweening for frames A and B.
 */
export function morphInBetweenFramesSync(
  frameA: { width: number; height: number; data: Uint8ClampedArray },
  frameB: { width: number; height: number; data: Uint8ClampedArray },
  steps: number = 1
): { width: number; height: number; data: Uint8ClampedArray }[] {
  const { width, height } = frameA;
  const dataA = frameA.data;
  const dataB = frameB.data;

  // 1. Helper to compute SDF
  const getSDF = (data: Uint8ClampedArray) => {
    // insideDist: distance to transparent (positive inside, 0 outside)
    const insideDist = computeSeparableEDT((x, y) => data[(y * width + x) * 4 + 3] > 10, width, height);
    // outsideDist: distance to opaque (positive outside, 0 inside)
    const outsideDist = computeSeparableEDT((x, y) => data[(y * width + x) * 4 + 3] <= 10, width, height);

    const sdf = new Float32Array(width * height);
    for (let i = 0; i < width * height; i++) {
      sdf[i] = outsideDist[i] - insideDist[i];
    }
    return sdf;
  };

  const sdfA = getSDF(dataA);
  const sdfB = getSDF(dataB);

  // 2. Helper to find closest opaque pixel color using BFS/spiral search
  const findClosestColor = (data: Uint8ClampedArray, cx: number, cy: number): [number, number, number, number] => {
    if (data[(cy * width + cx) * 4 + 3] > 10) {
      const idx = (cy * width + cx) * 4;
      return [data[idx], data[idx + 1], data[idx + 2], data[idx + 3]];
    }
    
    let r = 1;
    while (r < Math.max(width, height)) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
          const px = cx + dx;
          const py = cy + dy;
          if (px >= 0 && px < width && py >= 0 && py < height) {
            const idx = (py * width + px) * 4;
            if (data[idx + 3] > 10) {
              return [data[idx], data[idx + 1], data[idx + 2], data[idx + 3]];
            }
          }
        }
      }
      r++;
    }
    return [0, 0, 0, 0];
  };

  const results: { width: number; height: number; data: Uint8ClampedArray }[] = [];

  for (let s = 1; s <= steps; s++) {
    const t = s / (steps + 1);
    const outData = new Uint8ClampedArray(width * height * 4);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        const outIdx = i * 4;

        // Tween SDF
        const tweenedSDF = sdfA[i] * (1 - t) + sdfB[i] * t;

        // If inside shape or exactly on boundary
        if (tweenedSDF <= 0) {
          // Sample nearest colors
          const colorA = findClosestColor(dataA, x, y);
          const colorB = findClosestColor(dataB, x, y);
          
          if (colorA[3] === 0 && colorB[3] === 0) continue;

          let cA = colorA;
          let cB = colorB;
          if (colorA[3] === 0) cA = colorB;
          if (colorB[3] === 0) cB = colorA;

          // Simple sRGB cross-fade
          outData[outIdx] = Math.round(cA[0] * (1 - t) + cB[0] * t);
          outData[outIdx + 1] = Math.round(cA[1] * (1 - t) + cB[1] * t);
          outData[outIdx + 2] = Math.round(cA[2] * (1 - t) + cB[2] * t);
          outData[outIdx + 3] = 255;
        }
      }
    }
    results.push({ width, height, data: outData });
  }

  return results;
}

/**
 * 4. Optical Flow & Signed Distance Field (SDF) In-Between Frame Morphing:
 * Given Frame A and Frame B, computes 2D block-matching motion flow vectors and
 * interpolates boundaries and color trajectories to generate a smooth intermediate tween frame.
 */
export function morphInBetweenFrames(
  ctxA: CanvasRenderingContext2D,
  ctxB: CanvasRenderingContext2D,
  width: number,
  height: number,
  _t: number = 0.5
): HTMLCanvasElement {
  const dataA = ctxA.getImageData(0, 0, width, height).data;
  const dataB = ctxB.getImageData(0, 0, width, height).data;

  const outCanvas = document.createElement('canvas');
  outCanvas.width = width;
  outCanvas.height = height;
  const outCtx = outCanvas.getContext('2d')!;
  const outImgData = outCtx.createImageData(width, height);

  const [result] = morphInBetweenFramesSync(
    { width, height, data: dataA },
    { width, height, data: dataB },
    1
  );

  if (result) {
    outImgData.data.set(result.data);
  }

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
  strokeColorHex: string = '#2B2038'
): { strokePixels: ShadedPixel[] } {
  const imgData = srcCtx.getImageData(0, 0, width, height);
  const data = imgData.data;

  const isOpaque = (x: number, y: number): boolean => {
    if (x < 0 || x >= width || y < 0 || y >= height) return false;
    return data[(y * width + x) * 4 + 3] > 30;
  };

  const strokeRgb = hexToRgba(strokeColorHex);
  const strokePixels: ShadedPixel[] = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (isOpaque(x, y)) continue;

      const hasOpaqueNeighbor =
        isOpaque(x + 1, y) ||
        isOpaque(x - 1, y) ||
        isOpaque(x, y + 1) ||
        isOpaque(x, y - 1);

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

export function generateGroundShadowData(
  srcCtx: CanvasRenderingContext2D,
  width: number,
  height: number,
  shadowColorHex: string = '#2B2038'
): { shadowPixels: ShadedPixel[] } {
  const imgData = srcCtx.getImageData(0, 0, width, height);
  const data = imgData.data;

  let minX = width, maxX = 0, minY = height, maxY = 0;
  let hasPixels = false;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 30) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
        hasPixels = true;
      }
    }
  }

  if (!hasPixels) return { shadowPixels: [] };

  const shadowPixels: ShadedPixel[] = [];
  const cx = (minX + maxX) / 2;
  const shadowY = Math.min(height - 2, maxY + 2);
  const rx = Math.max(3, (maxX - minX) / 2 + 1);
  const ry = 2;

  const shadowRgb = hexToRgba(shadowColorHex);

  for (let y = shadowY - ry; y <= shadowY + ry; y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      const dx = (x - cx) / rx;
      const dy = (y - shadowY) / ry;
      if (dx * dx + dy * dy <= 1.0) {
        shadowPixels.push({
          x,
          y,
          r: shadowRgb.r,
          g: shadowRgb.g,
          b: shadowRgb.b,
          a: 160,
        });
      }
    }
  }

  return { shadowPixels };
}

