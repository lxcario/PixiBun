/**
 * Masterclass Pixel Art 3D Illumination, Color Grading & Automation Engine
 * Real pixel transformations for all 1-click PixiBud actions:
 * 1. 2.5D Analytical Shading (Lambertian Crescent)
 * 2. Blinn-Phong Rounded Specular Highlight
 * 3. Selective Outlining (Sel-Out based on light direction)
 * 4. Outer Silhouette Stroke / Auto-Outline
 * 5. Ground Drop Shadow
 * 6. High-Performance Jaggy & Stray Pixel Cleaners
 * 7. Color Grading Filters (Warm Sunset, Cool Moonlight, Cyberpunk Neon)
 * 8. Palette Quantizer / Color Reducer
 */

import { generateOklchRamp } from '@/lib/color/rampGenerator';
import { rgbaToHex, hexToRgba } from '@/lib/canvas/floodFill';
import { calculate47TileBitmask } from '@/lib/ai/smartMathEngine';

export interface ShadedPixel {
  x: number;
  y: number;
  r: number;
  g: number;
  b: number;
  a: number;
}

// Convert RGB to OKLab
function rgbToOklab(r: number, g: number, b: number): [number, number, number] {
  const lr = r / 255;
  const lg = g / 255;
  const lb = b / 255;

  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  return [
    0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
    1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
    0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_,
  ];
}

// OKLab to RGB
function oklabToRgb(L: number, a: number, b: number): [number, number, number] {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  const lr = +4.0767434782 * l - 3.3077115913 * m + 0.2309699291 * s;
  const lg = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const lb = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v * 255)));
  return [clamp(lr), clamp(lg), clamp(lb)];
}

function rgbToOklch(r: number, g: number, b: number): [number, number, number] {
  const [L, a, b_] = rgbToOklab(r, g, b);
  const C = Math.sqrt(a * a + b_ * b_);
  let h = Math.atan2(b_, a) * (180 / Math.PI);
  if (h < 0) h += 360;
  return [L, C, h];
}

function oklchToRgb(L: number, C: number, h: number): [number, number, number] {
  const hRad = (h * Math.PI) / 180;
  const a = C * Math.cos(hRad);
  const b = C * Math.sin(hRad);
  return oklabToRgb(L, a, b);
}

function shiftHueToward(currentH: number, targetH: number, amountDeg: number): number {
  const diff = (targetH - currentH + 540) % 360 - 180;
  const step = Math.sign(diff) * Math.min(Math.abs(diff), amountDeg);
  return (currentH + step + 360) % 360;
}

// Compute darker / cooler shade from original RGB in OKLCH
function getShadedRgb(r: number, g: number, b: number, tier: 'mid' | 'deep'): [number, number, number] {
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  if (lum < 35) return [r, g, b];

  const hex = rgbaToHex(r, g, b, 255);
  const ramp = generateOklchRamp(hex);
  const shadowHex = tier === 'deep' ? ramp[3] : ramp[2];
  const shadowRgba = hexToRgba(shadowHex);

  return [shadowRgba.r, shadowRgba.g, shadowRgba.b];
}

// Compute lighter / warmer highlight from original RGB in OKLCH
function getHighlightRgb(r: number, g: number, b: number): [number, number, number] {
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  if (lum < 35) return [r, g, b];

  const hex = rgbaToHex(r, g, b, 255);
  const ramp = generateOklchRamp(hex);
  const highlightRgba = hexToRgba(ramp[0]);

  return [highlightRgba.r, highlightRgba.g, highlightRgba.b];
}

interface ComponentRegion {
  id: number;
  pixels: { x: number; y: number; r: number; g: number; b: number }[];
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  width: number;
  height: number;
  area: number;
  isBox: boolean;
}

function segmentCanvasObjects(
  data: Uint8ClampedArray,
  width: number,
  height: number
): ComponentRegion[] {
  const visited = new Uint8Array(width * height);
  const regions: ComponentRegion[] = [];
  let regionId = 0;

  const isOpaque = (x: number, y: number): boolean => {
    if (x < 0 || x >= width || y < 0 || y >= height) return false;
    return data[(y * width + x) * 4 + 3] > 30;
  };

  const isOutline = (x: number, y: number): boolean => {
    if (!isOpaque(x, y)) return false;
    const idx = (y * width + x) * 4;
    const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
    return lum < 35;
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (visited[idx] || !isOpaque(x, y) || isOutline(x, y)) continue;

      const queue: number[] = [x, y];
      visited[idx] = 1;

      const pixels: { x: number; y: number; r: number; g: number; b: number }[] = [];
      let minX = x, maxX = x, minY = y, maxY = y;

      while (queue.length > 0) {
        const cy = queue.pop()!;
        const cx = queue.pop()!;

        const pIdx = (cy * width + cx) * 4;
        pixels.push({
          x: cx,
          y: cy,
          r: data[pIdx],
          g: data[pIdx + 1],
          b: data[pIdx + 2],
        });

        minX = Math.min(minX, cx);
        maxX = Math.max(maxX, cx);
        minY = Math.min(minY, cy);
        maxY = Math.max(maxY, cy);

        const neighbors = [
          [cx + 1, cy],
          [cx - 1, cy],
          [cx, cy + 1],
          [cx, cy - 1],
        ];

        for (const [nx, ny] of neighbors) {
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const nIdx = ny * width + nx;
            if (!visited[nIdx] && isOpaque(nx, ny) && !isOutline(nx, ny)) {
              visited[nIdx] = 1;
              queue.push(nx, ny);
            }
          }
        }
      }

      const regWidth = maxX - minX + 1;
      const regHeight = maxY - minY + 1;
      const boundingArea = regWidth * regHeight;
      const fillRatio = pixels.length / (boundingArea || 1);

      const cornersFilled =
        isOpaque(minX, minY) &&
        isOpaque(maxX, minY) &&
        isOpaque(minX, maxY) &&
        isOpaque(maxX, maxY);

      const isBox = fillRatio > 0.92 && cornersFilled && regWidth >= 4 && regHeight >= 4;

      regions.push({
        id: regionId++,
        pixels,
        minX,
        maxX,
        minY,
        maxY,
        width: regWidth,
        height: regHeight,
        area: pixels.length,
        isBox,
      });
    }
  }

  return regions;
}

/**
 * 1. 2.5D Auto-Shade Generator:
 */
export function generateAutoShadeData(
  srcCtx: CanvasRenderingContext2D,
  width: number,
  height: number,
  _defaultShadowColor: string = '#3A2E4C',
  _lightAngleDeg: number = 45
): { shadowPixels: ShadedPixel[]; shadowCount: number } {
  const imgData = srcCtx.getImageData(0, 0, width, height);
  const data = imgData.data;

  const regions = segmentCanvasObjects(data, width, height);
  const shadowPixels: ShadedPixel[] = [];

  const Lx = -0.5;
  const Ly = -0.5;
  const Lz = 0.7071;

  for (const reg of regions) {
    if (reg.area < 4) continue;

    if (reg.isBox) {
      const shadowThickness = Math.max(1, Math.min(2, Math.floor(Math.min(reg.width, reg.height) / 5)));

      for (const p of reg.pixels) {
        const isBottomEdge = p.y >= reg.maxY - shadowThickness + 1;
        const isRightEdge = p.x >= reg.maxX - shadowThickness + 1;

        if (isBottomEdge && isRightEdge) {
          const [sr, sg, sb] = getShadedRgb(p.r, p.g, p.b, 'deep');
          shadowPixels.push({ x: p.x, y: p.y, r: sr, g: sg, b: sb, a: 255 });
        } else if (isBottomEdge || isRightEdge) {
          const [sr, sg, sb] = getShadedRgb(p.r, p.g, p.b, 'mid');
          shadowPixels.push({ x: p.x, y: p.y, r: sr, g: sg, b: sb, a: 255 });
        }
      }
    } else {
      const cx = (reg.minX + reg.maxX) / 2;
      const cy = (reg.minY + reg.maxY) / 2;
      const Rx = Math.max(2, (reg.width - 1) / 2);
      const Ry = Math.max(2, (reg.height - 1) / 2);

      for (const p of reg.pixels) {
        const u = (p.x - cx) / Rx;
        const v = (p.y - cy) / Ry;
        const distSq = u * u + v * v;
        if (distSq > 1.1) continue;

        const nz = Math.sqrt(Math.max(0, 1.0 - Math.min(1.0, distSq)));
        const nx = u;
        const ny = v;

        const NdotL = nx * Lx + ny * Ly + nz * Lz;

        if (NdotL < -0.10 && distSq > 0.45) {
          const [sr, sg, sb] = getShadedRgb(p.r, p.g, p.b, 'deep');
          shadowPixels.push({ x: p.x, y: p.y, r: sr, g: sg, b: sb, a: 255 });
        } else if (NdotL < 0.25 && distSq > 0.20) {
          const [sr, sg, sb] = getShadedRgb(p.r, p.g, p.b, 'mid');
          shadowPixels.push({ x: p.x, y: p.y, r: sr, g: sg, b: sb, a: 255 });
        }
      }
    }
  }

  return {
    shadowPixels,
    shadowCount: shadowPixels.length,
  };
}

/**
 * 2. Blinn-Phong Specular Highlight Generator:
 */
export function generateHighlightData(
  srcCtx: CanvasRenderingContext2D,
  width: number,
  height: number,
  _defaultHighlightColor: string = '#FFFFFF',
  _lightAngleDeg: number = 45
): { highlightPixels: ShadedPixel[]; highlightCount: number } {
  const imgData = srcCtx.getImageData(0, 0, width, height);
  const data = imgData.data;

  const regions = segmentCanvasObjects(data, width, height);
  const highlightPixels: ShadedPixel[] = [];

  const Hx = -0.2706;
  const Hy = -0.2706;
  const Hz = 0.9239;

  for (const reg of regions) {
    if (reg.area < 4) continue;

    if (reg.isBox) {
      for (const p of reg.pixels) {
        const isTopEdge = p.y === reg.minY;
        const isLeftEdge = p.x === reg.minX;

        if (isTopEdge || isLeftEdge) {
          const [hr, hg, hb] = getHighlightRgb(p.r, p.g, p.b);
          highlightPixels.push({ x: p.x, y: p.y, r: hr, g: hg, b: hb, a: 255 });
        }
      }
    } else {
      const cx = (reg.minX + reg.maxX) / 2;
      const cy = (reg.minY + reg.maxY) / 2;
      const Rx = Math.max(2, (reg.width - 1) / 2);
      const Ry = Math.max(2, (reg.height - 1) / 2);

      for (const p of reg.pixels) {
        const u = (p.x - cx) / Rx;
        const v = (p.y - cy) / Ry;
        const distSq = u * u + v * v;
        if (distSq > 1.1) continue;

        const nz = Math.sqrt(Math.max(0, 1.0 - Math.min(1.0, distSq)));
        const nx = u;
        const ny = v;

        const NdotH = Math.max(0, nx * Hx + ny * Hy + nz * Hz);
        const Ispec = Math.pow(NdotH, 12.0);

        if (Ispec >= 0.70 && distSq < 0.80) {
          const [hr, hg, hb] = getHighlightRgb(p.r, p.g, p.b);
          highlightPixels.push({ x: p.x, y: p.y, r: hr, g: hg, b: hb, a: 255 });
        }
      }
    }
  }

  return {
    highlightPixels,
    highlightCount: highlightPixels.length,
  };
}

/**
 * 3. Selective Outlining (Sel-Out Generator):
 */
export function generateSelOutData(
  srcCtx: CanvasRenderingContext2D,
  width: number,
  height: number
): { selOutPixels: ShadedPixel[] } {
  const imgData = srcCtx.getImageData(0, 0, width, height);
  const data = imgData.data;

  const isOpaque = (x: number, y: number): boolean => {
    if (x < 0 || x >= width || y < 0 || y >= height) return false;
    return data[(y * width + x) * 4 + 3] > 30;
  };

  const selOutPixels: ShadedPixel[] = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!isOpaque(x, y)) continue;

      const idx = (y * width + x) * 4;
      const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];

      const touchesAlpha =
        !isOpaque(x + 1, y) ||
        !isOpaque(x - 1, y) ||
        !isOpaque(x, y + 1) ||
        !isOpaque(x, y - 1);

      if (touchesAlpha && lum < 50) {
        let sampleR = 120, sampleG = 100, sampleB = 150;
        const neighbors = [[x + 1, y], [x, y + 1], [x - 1, y], [x, y - 1], [x + 1, y + 1]];
        for (const [nx, ny] of neighbors) {
          if (isOpaque(nx, ny)) {
            const nIdx = (ny * width + nx) * 4;
            const nLum = 0.299 * data[nIdx] + 0.587 * data[nIdx + 1] + 0.114 * data[nIdx + 2];
            if (nLum >= 50) {
              sampleR = data[nIdx];
              sampleG = data[nIdx + 1];
              sampleB = data[nIdx + 2];
              break;
            }
          }
        }

        const isFacingTopLeft = !isOpaque(x - 1, y) || !isOpaque(x, y - 1) || !isOpaque(x - 1, y - 1);

        if (isFacingTopLeft) {
          const [sr, sg, sb] = getShadedRgb(sampleR, sampleG, sampleB, 'deep');
          selOutPixels.push({ x, y, r: sr, g: sg, b: sb, a: 255 });
        } else {
          selOutPixels.push({ x, y, r: 25, g: 20, b: 35, a: 255 });
        }
      }
    }
  }

  return { selOutPixels };
}

/**
 * 4. Auto-Outline (1px Outer Silhouette Stroke):
 */
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

      const touchesOpaque =
        isOpaque(x + 1, y) ||
        isOpaque(x - 1, y) ||
        isOpaque(x, y + 1) ||
        isOpaque(x, y - 1) ||
        isOpaque(x + 1, y + 1) ||
        isOpaque(x - 1, y - 1) ||
        isOpaque(x + 1, y - 1) ||
        isOpaque(x - 1, y + 1);

      if (touchesOpaque) {
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

/**
 * 5. Ground Drop Shadow Generator:
 */
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

/**
 * 6. Atmospheric Color Grading:
 */
export function applyAtmosphericColorGrade(
  srcCtx: CanvasRenderingContext2D,
  width: number,
  height: number,
  grade: 'sunset' | 'moonlight' | 'neon' | 'gameboy'
): void {
  const imgData = srcCtx.getImageData(0, 0, width, height);
  const data = imgData.data;

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] <= 30) continue;

    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const [L, C, H] = rgbToOklch(r, g, b);

    if (grade === 'sunset') {
      const newH = shiftHueToward(H, 75, 25);
      const [nr, ng, nb] = oklchToRgb(Math.min(0.95, L * 1.05), Math.min(0.35, C * 1.2), newH);
      data[i] = nr;
      data[i + 1] = ng;
      data[i + 2] = nb;
    } else if (grade === 'moonlight') {
      const newH = shiftHueToward(H, 270, 30);
      const [nr, ng, nb] = oklchToRgb(Math.max(0.08, L * 0.90), Math.max(0.02, C * 0.85), newH);
      data[i] = nr;
      data[i + 1] = ng;
      data[i + 2] = nb;
    } else if (grade === 'neon') {
      const [nr, ng, nb] = oklchToRgb(L > 0.5 ? Math.min(0.98, L * 1.1) : Math.max(0.05, L * 0.85), Math.min(0.38, C * 1.45), H);
      data[i] = nr;
      data[i + 1] = ng;
      data[i + 2] = nb;
    }
  }

  srcCtx.putImageData(imgData, 0, 0);
}

/**
 * 7. Snap to Active Palette (Color Reducer / Quantizer):
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

  const palRgb = paletteHexColors.map(hexToRgba);

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] <= 30) continue;

    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    let closest = palRgb[0];
    let minDiff = Infinity;

    for (const c of palRgb) {
      const diff = (r - c.r) * (r - c.r) + (g - c.g) * (g - c.g) + (b - c.b) * (b - c.b);
      if (diff < minDiff) {
        minDiff = diff;
        closest = c;
      }
    }

    data[i] = closest.r;
    data[i + 1] = closest.g;
    data[i + 2] = closest.b;
  }

  srcCtx.putImageData(imgData, 0, 0);
}

/**
 * 8. High-Performance Jaggy & L-Corner Cleaner:
 * Detects 2x2 corner double clusters in 1px strokes and prunes redundant double pixels.
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

  const toRemove = new Set<string>();

  // Scan all 2x2 windows
  for (let y = 0; y < height - 1; y++) {
    for (let x = 0; x < width - 1; x++) {
      const p00 = isOpaque(x, y) ? 1 : 0;
      const p10 = isOpaque(x + 1, y) ? 1 : 0;
      const p01 = isOpaque(x, y + 1) ? 1 : 0;
      const p11 = isOpaque(x + 1, y + 1) ? 1 : 0;

      const sum = p00 + p10 + p01 + p11;

      // 3 of 4 pixels are opaque -> L-corner double cluster
      if (sum === 3) {
        if (p00 && p10 && p01 && !p11) {
          // Bottom-Right empty: prune corner pixel if diagonal is supported
          if (isOpaque(x + 2, y) || isOpaque(x, y + 2)) {
            toRemove.add(`${x + 1},${y}`);
          }
        } else if (p00 && p10 && !p01 && p11) {
          // Bottom-Left empty
          if (isOpaque(x - 1, y) || isOpaque(x + 1, y + 2)) {
            toRemove.add(`${x},${y}`);
          }
        } else if (p00 && !p10 && p01 && p11) {
          // Top-Right empty
          if (isOpaque(x - 1, y + 1) || isOpaque(x + 2, y + 1)) {
            toRemove.add(`${x},${y + 1}`);
          }
        } else if (!p00 && p10 && p01 && p11) {
          // Top-Left empty
          if (isOpaque(x + 1, y - 1) || isOpaque(x - 1, y + 1)) {
            toRemove.add(`${x + 1},${y + 1}`);
          }
        }
      }
    }
  }

  toRemove.forEach((key) => {
    const [rx, ry] = key.split(',').map(Number);
    data[(ry * width + rx) * 4 + 3] = 0;
  });

  srcCtx.putImageData(imgData, 0, 0);

  return { cleanedCount: toRemove.size };
}

/**
 * 9. High-Performance Stray Pixel & Floating Island Cleaner:
 * Sweeps away isolated 1px dots AND small disconnected floating strokes (< 20 px).
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

  const visited = new Uint8Array(width * height);
  const islands: { x: number; y: number }[][] = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (!isOpaque(x, y) || visited[idx]) continue;

      // BFS to group this connected cluster (8-way connected)
      const queue: number[] = [x, y];
      visited[idx] = 1;
      const island: { x: number; y: number }[] = [];

      while (queue.length > 0) {
        const cy = queue.pop()!;
        const cx = queue.pop()!;
        island.push({ x: cx, y: cy });

        const neighbors = [
          [cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1],
          [cx + 1, cy + 1], [cx - 1, cy - 1], [cx + 1, cy - 1], [cx - 1, cy + 1]
        ];

        for (const [nx, ny] of neighbors) {
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const nIdx = ny * width + nx;
            if (!visited[nIdx] && isOpaque(nx, ny)) {
              visited[nIdx] = 1;
              queue.push(nx, ny);
            }
          }
        }
      }

      islands.push(island);
    }
  }

  if (islands.length <= 1) {
    // If only 1 object exists, check for 1px dead-end whiskers
    let cleanedWhiskers = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (!isOpaque(x, y)) continue;
        let neighborsCount = 0;
        for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
          if (isOpaque(nx, ny)) neighborsCount++;
        }
        if (neighborsCount === 0) {
          data[(y * width + x) * 4 + 3] = 0;
          cleanedWhiskers++;
        }
      }
    }
    srcCtx.putImageData(imgData, 0, 0);
    return { cleanedCount: cleanedWhiskers };
  }

  // Sort islands by size descending (largest is main sprite body)
  islands.sort((a, b) => b.length - a.length);

  let cleanedTotal = 0;

  // Clear all small disconnected floating stray strokes (< 25 pixels)
  for (let i = 1; i < islands.length; i++) {
    if (islands[i].length <= 25) {
      for (const p of islands[i]) {
        data[(p.y * width + p.x) * 4 + 3] = 0;
        cleanedTotal++;
      }
    }
  }

  srcCtx.putImageData(imgData, 0, 0);

  return { cleanedCount: cleanedTotal };
}

/**
 * 10. Palette Harmonizer:
 */
export function harmonizePaletteColors(existingColors: string[]): string[] {
  const harmonics = ['#3A2E4C', '#6A5880', '#A86EC6', '#C792DF', '#DCABDF', '#D0C4DF', '#DDDFDF'];
  const newColors: string[] = [];

  harmonics.forEach(c => {
    if (!existingColors.includes(c)) {
      newColors.push(c);
    }
  });

  return newColors.slice(0, 4);
}

/**
 * 11. 47-Tile Blob Autotiling Edge & Corner Contour Generator:
 * Uses calculate47TileBitmask to evaluate 8-neighbor connectivity for each pixel,
 * generating edge highlight/shadow contour accents on sprite transitions.
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
      // Bitmask 255 means fully enclosed interior pixel
      if (bitmask === 255) continue;

      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      const hasNorth = (bitmask & 1) !== 0;
      const hasEast = (bitmask & 4) !== 0;
      const hasSouth = (bitmask & 16) !== 0;
      const hasWest = (bitmask & 64) !== 0;

      if (!hasNorth || !hasWest) {
        // Exposed top/left boundary: warm highlight accent
        const [hr, hg, hb] = getHighlightRgb(r, g, b);
        blobPixels.push({ x, y, r: hr, g: hg, b: hb, a: 220 });
      } else if (!hasSouth || !hasEast) {
        // Exposed bottom/right boundary: deep contour shadow
        const [sr, sg, sb] = getShadedRgb(r, g, b, 'deep');
        blobPixels.push({ x, y, r: sr, g: sg, b: sb, a: 220 });
      } else {
        // Diagonal inner corner crease
        const [sr, sg, sb] = getShadedRgb(r, g, b, 'mid');
        blobPixels.push({ x, y, r: sr, g: sg, b: sb, a: 200 });
      }
    }
  }

  return { blobPixels };
}
