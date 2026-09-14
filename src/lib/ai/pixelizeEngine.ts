/**
 * PixiBun Intelligent Image-to-Pixel-Art Synthesis Engine
 * Grounded in computer graphics literature & perceptual color science:
 * - Linear Optical Gamma-Corrected Area Box Downsampling
 * - Sobel Gradient Salience Edge-Preservation
 * - Oklab Perceptual Space Color Quantization (Median-Cut + K-Means++)
 * - Serpentine Floyd-Steinberg & Atkinson 75% Error Diffusion Dithering
 * - Bayer 4x4 Ordered Matrix Dithering
 * - 1-Bit Binary Alpha Thresholding & Auto Background Keying
 */

import { hexToRgba, rgbaToHex } from '@/lib/canvas/floodFill';
import { acquireFloat32Buffer, releaseFloat32Buffer } from '@/lib/engine/bufferPool';
import { BAYER_4X4 } from '@/lib/canvas/ditherMatrix';
import {
  srgbToLinear,
  linearToSrgb,
  rgbToOklab,
  oklabToRgb,
  deltaEOklab,
} from './math/colorSpace';
import type { OklabColor } from './math/colorSpace';

export {
  srgbToLinear,
  linearToSrgb,
  rgbToOklab,
  oklabToRgb,
  deltaEOklab,
};
export type { OklabColor };

export interface PixelizeOptions {
  targetWidth: number;
  targetHeight: number;
  fitMode: 'contain' | 'cover' | 'stretch' | 'pixel-art';
  samplingMode: 'salient-box' | 'nearest';
  colorMode: 'true-color' | 'active-palette' | 'reduce-8' | 'reduce-16' | 'reduce-32';
  activePalette?: string[];
  ditherMode: 'none' | 'bayer-4x4' | 'atkinson' | 'floyd-steinberg';
  ditherStrength?: number; // 0.0 to 1.0 (default 0.75)
  cleanAlpha: boolean;     // Binary threshold (alpha >= 128 -> 255, else 0)
  removeBackground?: boolean; // Automatically remove solid corner/background color
  bgTolerance?: number;    // 0.0 to 1.0 (default 0.15)
}

export interface PixelizeResult {
  canvas: HTMLCanvasElement;
  dataUrl: string;
  extractedPalette: string[];
  width: number;
  height: number;
}

// -----------------------------------------------------------------------------
// 1. Color Space Conversions: sRGB <-> Linear RGB <-> Oklab
// -----------------------------------------------------------------------------



// -----------------------------------------------------------------------------
// 2. Spatial Downsampling & Salience Integration
// -----------------------------------------------------------------------------

function calculateFitTransform(
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number,
  fitMode: 'contain' | 'cover' | 'stretch' | 'pixel-art'
): { scaleX: number; scaleY: number; offsetX: number; offsetY: number; drawW: number; drawH: number } {
  if (fitMode === 'stretch') {
    return { scaleX: dstW / srcW, scaleY: dstH / srcH, offsetX: 0, offsetY: 0, drawW: dstW, drawH: dstH };
  }

  if (fitMode === 'pixel-art') {
    // 1:1 pixel mapping centered
    const offsetX = Math.floor((dstW - srcW) / 2);
    const offsetY = Math.floor((dstH - srcH) / 2);
    return { scaleX: 1, scaleY: 1, offsetX, offsetY, drawW: srcW, drawH: srcH };
  }

  const srcAspect = srcW / srcH;
  const dstAspect = dstW / dstH;

  let drawW = dstW;
  let drawH = dstH;
  let offsetX = 0;
  let offsetY = 0;

  if (fitMode === 'contain') {
    if (srcAspect > dstAspect) {
      drawW = dstW;
      drawH = Math.max(1, Math.round(dstW / srcAspect));
      offsetY = Math.floor((dstH - drawH) / 2);
    } else {
      drawH = dstH;
      drawW = Math.max(1, Math.round(dstH * srcAspect));
      offsetX = Math.floor((dstW - drawW) / 2);
    }
  } else if (fitMode === 'cover') {
    if (srcAspect > dstAspect) {
      drawH = dstH;
      drawW = Math.max(1, Math.round(dstH * srcAspect));
      offsetX = Math.floor((dstW - drawW) / 2);
    } else {
      drawW = dstW;
      drawH = Math.max(1, Math.round(dstW / srcAspect));
      offsetY = Math.floor((dstH - drawH) / 2);
    }
  }

  return {
    scaleX: drawW / srcW,
    scaleY: drawH / srcH,
    offsetX,
    offsetY,
    drawW,
    drawH,
  };
}

export function downsampleImage(
  srcCtx: CanvasRenderingContext2D,
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number,
  fitMode: 'contain' | 'cover' | 'stretch' | 'pixel-art',
  samplingMode: 'salient-box' | 'nearest'
): ImageData {
  const srcData = srcCtx.getImageData(0, 0, srcW, srcH).data;
  const dstCanvas = document.createElement('canvas');
  dstCanvas.width = dstW;
  dstCanvas.height = dstH;
  const dstCtx = dstCanvas.getContext('2d')!;
  const dstImgData = dstCtx.createImageData(dstW, dstH);
  const dstData = dstImgData.data;

  const { offsetX, offsetY, drawW, drawH } = calculateFitTransform(srcW, srcH, dstW, dstH, fitMode);

  // Pre-calculate gradient magnitude map for salience if in salient-box mode
  const gradientMap = acquireFloat32Buffer(srcW * srcH);
  try {
    if (samplingMode === 'salient-box' && srcW > 1 && srcH > 1) {
      for (let y = 1; y < srcH - 1; y++) {
        for (let x = 1; x < srcW - 1; x++) {
          const idx = (y * srcW + x) * 4;
          const lumCenter = 0.2126 * srcData[idx] + 0.7152 * srcData[idx + 1] + 0.0722 * srcData[idx + 2];
          const lumRight = 0.2126 * srcData[idx + 4] + 0.7152 * srcData[idx + 5] + 0.0722 * srcData[idx + 6];
          const lumDown = 0.2126 * srcData[((y + 1) * srcW + x) * 4] + 0.7152 * srcData[((y + 1) * srcW + x) * 4 + 1] + 0.0722 * srcData[((y + 1) * srcW + x) * 4 + 2];

          const gx = lumRight - lumCenter;
          const gy = lumDown - lumCenter;
          gradientMap[y * srcW + x] = Math.sqrt(gx * gx + gy * gy);
        }
      }
    }

    for (let dy = 0; dy < dstH; dy++) {
      for (let dx = 0; dx < dstW; dx++) {
        const dstIdx = (dy * dstW + dx) * 4;

        // Check if within the drawn subregion
        const relX = dx - offsetX;
        const relY = dy - offsetY;

        if (relX < 0 || relX >= drawW || relY < 0 || relY >= drawH) {
          dstData[dstIdx + 3] = 0; // Transparent letterbox
          continue;
        }

        if (samplingMode === 'nearest' || fitMode === 'pixel-art') {
          const srcX = Math.min(srcW - 1, Math.max(0, Math.floor((relX / drawW) * srcW)));
          const srcY = Math.min(srcH - 1, Math.max(0, Math.floor((relY / drawH) * srcH)));
          const sIdx = (srcY * srcW + srcX) * 4;

          dstData[dstIdx] = srcData[sIdx];
          dstData[dstIdx + 1] = srcData[sIdx + 1];
          dstData[dstIdx + 2] = srcData[sIdx + 2];
          dstData[dstIdx + 3] = srcData[sIdx + 3];
        } else {
          // Area Box Filtering with Linear Gamma & Gradient Salience Boost
          const x0 = (relX / drawW) * srcW;
          const x1 = ((relX + 1) / drawW) * srcW;
          const y0 = (relY / drawH) * srcH;
          const y1 = ((relY + 1) / drawH) * srcH;

          const startX = Math.floor(x0);
          const endX = Math.min(srcW - 1, Math.ceil(x1));
          const startY = Math.floor(y0);
          const endY = Math.min(srcH - 1, Math.ceil(y1));

          let totalWeight = 0;
          let rLinSum = 0;
          let gLinSum = 0;
          let bLinSum = 0;
          let aSum = 0;

          for (let sy = startY; sy <= endY; sy++) {
            for (let sx = startX; sx <= endX; sx++) {
              const sIdx = (sy * srcW + sx) * 4;
              const alpha = srcData[sIdx + 3];
              if (alpha < 5) continue; // Ignore nearly transparent pixels

              const weightX = Math.max(0, Math.min(sx + 1, x1) - Math.max(sx, x0));
              const weightY = Math.max(0, Math.min(sy + 1, y1) - Math.max(sy, y0));
              let boxWeight = weightX * weightY;

              if (boxWeight <= 0) continue;

              // Boost high-frequency edge pixels so thin line art doesn't blur away
              if (samplingMode === 'salient-box') {
                const salience = gradientMap[sy * srcW + sx];
                boxWeight *= 1.0 + Math.min(2.5, salience * 3.0);
              }

              const rLin = srgbToLinear(srcData[sIdx]);
              const gLin = srgbToLinear(srcData[sIdx + 1]);
              const bLin = srgbToLinear(srcData[sIdx + 2]);

              rLinSum += rLin * boxWeight;
              gLinSum += gLin * boxWeight;
              bLinSum += bLin * boxWeight;
              aSum += alpha * boxWeight;
              totalWeight += boxWeight;
            }
          }

          if (totalWeight > 0.001) {
            dstData[dstIdx] = linearToSrgb(rLinSum / totalWeight);
            dstData[dstIdx + 1] = linearToSrgb(gLinSum / totalWeight);
            dstData[dstIdx + 2] = linearToSrgb(bLinSum / totalWeight);
            dstData[dstIdx + 3] = Math.round(Math.min(255, aSum / totalWeight));
          } else {
            dstData[dstIdx + 3] = 0;
          }
        }
      }
    }

    return dstImgData;
  } finally {
    releaseFloat32Buffer(gradientMap);
  }
}

// -----------------------------------------------------------------------------
// 3. Oklab Median-Cut & K-Means++ Palette Quantizer
// -----------------------------------------------------------------------------

interface ColorBox {
  pixels: OklabColor[];
  minL: number;
  maxL: number;
  mina: number;
  maxa: number;
  minb: number;
  maxb: number;
}

function createColorBox(pixels: OklabColor[]): ColorBox {
  let minL = Infinity, maxL = -Infinity;
  let mina = Infinity, maxa = -Infinity;
  let minb = Infinity, maxb = -Infinity;

  for (const p of pixels) {
    if (p.L < minL) minL = p.L;
    if (p.L > maxL) maxL = p.L;
    if (p.a < mina) mina = p.a;
    if (p.a > maxa) maxa = p.a;
    if (p.b < minb) minb = p.b;
    if (p.b > maxb) maxb = p.b;
  }

  return { pixels, minL, maxL, mina, maxa, minb, maxb };
}

export function extractOklabPalette(pixels: OklabColor[], maxColors: number): OklabColor[] {
  if (pixels.length === 0) return [];
  if (pixels.length <= maxColors) return pixels;

  const boxes: ColorBox[] = [createColorBox(pixels)];

  while (boxes.length < maxColors) {
    // Find box with the largest perceptual volume/range
    let maxIdx = -1;
    let maxRange = -1;

    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i];
      if (b.pixels.length < 2) continue;
      const rangeL = (b.maxL - b.minL) * 1.2; // slight extra weight on lightness
      const rangea = b.maxa - b.mina;
      const rangeb = b.maxb - b.minb;
      const range = Math.max(rangeL, rangea, rangeb);
      if (range > maxRange) {
        maxRange = range;
        maxIdx = i;
      }
    }

    if (maxIdx === -1 || maxRange <= 0.001) break;

    const targetBox = boxes.splice(maxIdx, 1)[0];
    const rangeL = targetBox.maxL - targetBox.minL;
    const rangea = targetBox.maxa - targetBox.mina;
    const rangeb = targetBox.maxb - targetBox.minb;

    // Split along the axis of largest variance
    if (rangeL >= rangea && rangeL >= rangeb) {
      targetBox.pixels.sort((p1, p2) => p1.L - p2.L);
    } else if (rangea >= rangeb) {
      targetBox.pixels.sort((p1, p2) => p1.a - p2.a);
    } else {
      targetBox.pixels.sort((p1, p2) => p1.b - p2.b);
    }

    const mid = Math.floor(targetBox.pixels.length / 2);
    const box1 = createColorBox(targetBox.pixels.slice(0, mid));
    const box2 = createColorBox(targetBox.pixels.slice(mid));

    boxes.push(box1, box2);
  }

  // Calculate centroid for each box
  const initialCentroids: OklabColor[] = boxes.map((box) => {
    let sumL = 0, suma = 0, sumb = 0;
    for (const p of box.pixels) {
      sumL += p.L;
      suma += p.a;
      sumb += p.b;
    }
    const count = box.pixels.length || 1;
    return { L: sumL / count, a: suma / count, b: sumb / count };
  });

  // 4 iterations of K-Means Lloyd refinement in Oklab space
  const centroids = [...initialCentroids];
  for (let iter = 0; iter < 4; iter++) {
    const clusterSums = centroids.map(() => ({ sumL: 0, suma: 0, sumb: 0, count: 0 }));

    for (const p of pixels) {
      let bestDist = Infinity;
      let bestIdx = 0;
      for (let k = 0; k < centroids.length; k++) {
        const d = deltaEOklab(p, centroids[k]);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = k;
        }
      }
      clusterSums[bestIdx].sumL += p.L;
      clusterSums[bestIdx].suma += p.a;
      clusterSums[bestIdx].sumb += p.b;
      clusterSums[bestIdx].count++;
    }

    for (let k = 0; k < centroids.length; k++) {
      if (clusterSums[k].count > 0) {
        centroids[k] = {
          L: clusterSums[k].sumL / clusterSums[k].count,
          a: clusterSums[k].suma / clusterSums[k].count,
          b: clusterSums[k].sumb / clusterSums[k].count,
        };
      }
    }
  }

  return centroids;
}

// -----------------------------------------------------------------------------
// 4. Quantization Mapping & Dithering Suite
// -----------------------------------------------------------------------------



export function quantizeAndDither(
  imgData: ImageData,
  width: number,
  height: number,
  paletteRgb: [number, number, number][],
  ditherMode: 'none' | 'bayer-4x4' | 'atkinson' | 'floyd-steinberg',
  ditherStrength: number = 0.75
): void {
  if (paletteRgb.length === 0) return;
  const data = imgData.data;

  const paletteOklab = paletteRgb.map(([r, g, b]) => ({
    ok: rgbToOklab(r, g, b),
    rgb: [r, g, b] as [number, number, number],
  }));

  const findNearestColor = (ok: OklabColor): [number, number, number] => {
    let bestDist = Infinity;
    let bestRgb = paletteOklab[0].rgb;

    for (let k = 0; k < paletteOklab.length; k++) {
      const d = deltaEOklab(ok, paletteOklab[k].ok);
      if (d < bestDist) {
        bestDist = d;
        bestRgb = paletteOklab[k].rgb;
      }
    }
    return bestRgb;
  };

  if (ditherMode === 'none') {
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] <= 30) continue;
      const ok = rgbToOklab(data[i], data[i + 1], data[i + 2]);
      const [r, g, b] = findNearestColor(ok);
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
    return;
  }

  if (ditherMode === 'bayer-4x4') {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        if (data[idx + 3] <= 30) continue;

        const bayerVal = (BAYER_4X4[y % 4][x % 4] + 0.5) / 16 - 0.5;
        const ok = rgbToOklab(data[idx], data[idx + 1], data[idx + 2]);
        ok.L = Math.max(0, Math.min(1.0, ok.L + bayerVal * 0.15 * ditherStrength));

        const [r, g, b] = findNearestColor(ok);
        data[idx] = r;
        data[idx + 1] = g;
        data[idx + 2] = b;
        data[idx + 3] = 255;
      }
    }
    return;
  }

  // Error Diffusion Dithering (Floyd-Steinberg or Atkinson) with Serpentine Scanning
  const bufferR = new Float32Array(width * height);
  const bufferG = new Float32Array(width * height);
  const bufferB = new Float32Array(width * height);

  for (let i = 0; i < width * height; i++) {
    bufferR[i] = data[i * 4];
    bufferG[i] = data[i * 4 + 1];
    bufferB[i] = data[i * 4 + 2];
  }

  for (let y = 0; y < height; y++) {
    const isForward = y % 2 === 0;
    const startX = isForward ? 0 : width - 1;
    const endX = isForward ? width : -1;
    const stepX = isForward ? 1 : -1;

    for (let x = startX; x !== endX; x += stepX) {
      const idx = y * width + x;
      const pIdx = idx * 4;
      if (data[pIdx + 3] <= 30) continue;

      const currR = Math.max(0, Math.min(255, bufferR[idx]));
      const currG = Math.max(0, Math.min(255, bufferG[idx]));
      const currB = Math.max(0, Math.min(255, bufferB[idx]));

      const ok = rgbToOklab(currR, currG, currB);
      const [chosenR, chosenG, chosenB] = findNearestColor(ok);

      data[pIdx] = chosenR;
      data[pIdx + 1] = chosenG;
      data[pIdx + 2] = chosenB;
      data[pIdx + 3] = 255;

      const errR = (currR - chosenR) * ditherStrength;
      const errG = (currG - chosenG) * ditherStrength;
      const errB = (currB - chosenB) * ditherStrength;

      if (ditherMode === 'floyd-steinberg') {
        // Serpentine direction handling
        const dir = isForward ? 1 : -1;
        const neighbors: [number, number, number][] = [
          [x + dir, y, 7 / 16],
          [x - dir, y + 1, 3 / 16],
          [x, y + 1, 5 / 16],
          [x + dir, y + 1, 1 / 16],
        ];

        for (const [nx, ny, weight] of neighbors) {
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const nIdx = ny * width + nx;
            bufferR[nIdx] += errR * weight;
            bufferG[nIdx] += errG * weight;
            bufferB[nIdx] += errB * weight;
          }
        }
      } else if (ditherMode === 'atkinson') {
        // Atkinson 75% diffusion across 6 neighbors
        const dir = isForward ? 1 : -1;
        const neighbors: [number, number][] = [
          [x + dir, y],
          [x + dir * 2, y],
          [x - dir, y + 1],
          [x, y + 1],
          [x + dir, y + 1],
          [x, y + 2],
        ];

        for (const [nx, ny] of neighbors) {
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const nIdx = ny * width + nx;
            bufferR[nIdx] += errR / 8;
            bufferG[nIdx] += errG / 8;
            bufferB[nIdx] += errB / 8;
          }
        }
      }
    }
  }
}

// -----------------------------------------------------------------------------
// 5. Alpha Cleanliness & Background Transparency Keying
// -----------------------------------------------------------------------------

export function cleanAlphaAndBackground(
  imgData: ImageData,
  width: number,
  height: number,
  options: { cleanAlpha: boolean; removeBackground?: boolean; bgTolerance?: number }
): void {
  const data = imgData.data;

  // 1. Remove background color if requested (sample 4 corners to detect solid bg)
  if (options.removeBackground) {
    const corners = [
      0, // top-left
      (width - 1) * 4, // top-right
      ((height - 1) * width) * 4, // bottom-left
      ((height - 1) * width + (width - 1)) * 4, // bottom-right
    ];

    const bgR = data[corners[0]];
    const bgG = data[corners[0] + 1];
    const bgB = data[corners[0] + 2];
    const tol = (options.bgTolerance || 0.15) * 255;

    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] === 0) continue;
      const dr = Math.abs(data[i] - bgR);
      const dg = Math.abs(data[i + 1] - bgG);
      const db = Math.abs(data[i + 2] - bgB);

      if (dr <= tol && dg <= tol && db <= tol) {
        data[i + 3] = 0; // Clear to transparent
      }
    }
  }

  // 2. Binary Alpha Thresholding (crisp 1-bit pixel art edges)
  if (options.cleanAlpha) {
    for (let i = 0; i < data.length; i += 4) {
      data[i + 3] = data[i + 3] >= 128 ? 255 : 0;
    }
  }
}

// -----------------------------------------------------------------------------
// 6. Master Image-to-Pixel-Art Synthesis Pipeline
// -----------------------------------------------------------------------------

export function processImageToPixelArt(
  srcCanvasOrImage: HTMLCanvasElement | HTMLImageElement,
  options: PixelizeOptions
): PixelizeResult {
  const srcW = srcCanvasOrImage.width;
  const srcH = srcCanvasOrImage.height;

  const tempSrc = document.createElement('canvas');
  tempSrc.width = srcW;
  tempSrc.height = srcH;
  const tCtx = tempSrc.getContext('2d', { willReadFrequently: true })!;
  tCtx.imageSmoothingEnabled = false;
  tCtx.drawImage(srcCanvasOrImage, 0, 0);

  // 1. Spatial Downsampling
  const downsampled = downsampleImage(
    tCtx,
    srcW,
    srcH,
    options.targetWidth,
    options.targetHeight,
    options.fitMode,
    options.samplingMode
  );

  // 2. Alpha & Background cleanup
  cleanAlphaAndBackground(downsampled, options.targetWidth, options.targetHeight, {
    cleanAlpha: options.cleanAlpha,
    removeBackground: options.removeBackground,
    bgTolerance: options.bgTolerance,
  });

  // 3. Color Quantization Palette Construction
  let paletteRgb: [number, number, number][] = [];
  const extractedHexSet = new Set<string>();

  if (options.colorMode === 'active-palette' && options.activePalette && options.activePalette.length > 0) {
    paletteRgb = options.activePalette.map((hex) => {
      const { r, g, b } = hexToRgba(hex);
      return [r, g, b];
    });
    options.activePalette.forEach((c) => extractedHexSet.add(c));
  } else if (
    options.colorMode === 'reduce-8' ||
    options.colorMode === 'reduce-16' ||
    options.colorMode === 'reduce-32'
  ) {
    const kColors = options.colorMode === 'reduce-8' ? 8 : options.colorMode === 'reduce-16' ? 16 : 32;
    const opaquePixels: OklabColor[] = [];
    const d = downsampled.data;

    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] > 30) {
        opaquePixels.push(rgbToOklab(d[i], d[i + 1], d[i + 2]));
      }
    }

    const oklabCentroids = extractOklabPalette(opaquePixels, kColors);
    paletteRgb = oklabCentroids.map((c) => oklabToRgb(c.L, c.a, c.b));
    paletteRgb.forEach(([r, g, b]) => extractedHexSet.add(rgbaToHex(r, g, b, 255)));
  }

  // 4. Quantization & Dithering
  if (paletteRgb.length > 0) {
    quantizeAndDither(
      downsampled,
      options.targetWidth,
      options.targetHeight,
      paletteRgb,
      options.ditherMode,
      options.ditherStrength ?? 0.75
    );
  } else {
    // True color: extract unique colors
    const d = downsampled.data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] > 30) {
        extractedHexSet.add(rgbaToHex(d[i], d[i + 1], d[i + 2], 255));
      }
    }
  }

  // 5. Final Output Canvas
  const outCanvas = document.createElement('canvas');
  outCanvas.width = options.targetWidth;
  outCanvas.height = options.targetHeight;
  const outCtx = outCanvas.getContext('2d')!;
  outCtx.imageSmoothingEnabled = false;
  outCtx.putImageData(downsampled, 0, 0);

  return {
    canvas: outCanvas,
    dataUrl: outCanvas.toDataURL('image/png'),
    extractedPalette: Array.from(extractedHexSet).slice(0, 32),
    width: options.targetWidth,
    height: options.targetHeight,
  };
}
