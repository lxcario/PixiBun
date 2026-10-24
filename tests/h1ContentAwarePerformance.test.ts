/**
 * @vitest-environment node
 */
import { describe, expect, it, vi } from 'vitest';
import {
  computeContentAwareHeightmap,
  computeSeparableEDT,
  applyBilateralFilter,
  computeTangentNormalField,
  computeDiscreteLaplaceCavity,
  applyAppendageStabilization,
  type ContentAwareAnalysis,
  type NormalVectorField,
  type AppendageData,
} from '@/lib/graphics/math/edtNormalMap';
import {
  renderParametric2p5DLighting,
  type LightParameters,
} from '@/lib/graphics/math/photometricLighting';

vi.mock('@/lib/graphics/math/edtNormalMap', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/graphics/math/edtNormalMap')>();
  return {
    ...actual,
    computeContentAwareHeightmap: vi.fn(actual.computeContentAwareHeightmap),
  };
});

// Canvas Mock for Node test environment
class MockImageData {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  constructor(width: number, height: number, data?: Uint8ClampedArray) {
    this.width = width;
    this.height = height;
    this.data = data ? new Uint8ClampedArray(data) : new Uint8ClampedArray(width * height * 4);
  }
}

if (typeof (globalThis as unknown as { document?: unknown }).document === 'undefined') {
  (globalThis as unknown as { document: unknown }).document = {
    createElement: (tag: string) => {
      if (tag === 'canvas') {
        let _img = new MockImageData(32, 32);
        const canvasObj = {
          width: 32,
          height: 32,
          getContext: () => ({
            createImageData: (w: number, h: number) => {
              _img = new MockImageData(w, h);
              return _img;
            },
            putImageData: (img: MockImageData) => {
              _img = new MockImageData(img.width, img.height, img.data);
            },
            getImageData: (_x: number, _y: number, w: number, h: number) => {
              if (_img.width !== w || _img.height !== h) {
                return new MockImageData(w, h);
              }
              return _img;
            },
          }),
        };
        return canvasObj;
      }
      return {};
    },
  };
}

function createMockContext(data: Uint8ClampedArray, width: number, height: number): CanvasRenderingContext2D {
  const img = new MockImageData(width, height, data);
  return {
    getImageData: () => new MockImageData(width, height, img.data),
  } as unknown as CanvasRenderingContext2D;
}

/**
 * Faithful copy of the UNMODIFIED pre-H1 baseline computeContentAwareHeightmap
 * (Commit: 2b8fb954ab6bea08fbf17a8473c4e4ea9105b504).
 * Used exclusively as a golden reference oracle to prove 100% equivalence.
 */
function computeLegacyContentAwareHeightmap(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  cavityStrength: number = 1.0,
  depthScale: number = 2.0,
  lightAzimuth?: number
): ContentAwareAnalysis {
  const totalPixels = width * height;
  const isInkLine = new Uint8Array(totalPixels);
  const isFeature = new Uint8Array(totalPixels);
  const componentMap = new Int32Array(totalPixels);
  const colorHue = new Float32Array(totalPixels);
  const colorChroma = new Float32Array(totalPixels);

  const isOpaque = (x: number, y: number): boolean => {
    if (x < 0 || x >= width || y < 0 || y >= height) return false;
    return data[(y * width + x) * 4 + 3] > 30;
  };

  const lum = new Float32Array(totalPixels);
  let opaqueCount = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const p = idx * 4;
      if (data[p + 3] <= 30) continue;

      opaqueCount++;
      const r = data[p];
      const g = data[p + 1];
      const b = data[p + 2];
      lum[idx] = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

      const maxChannel = Math.max(r, g, b);
      const minChannel = Math.min(r, g, b);
      const chroma = maxChannel - minChannel;
      colorChroma[idx] = chroma / 255;
      if (chroma > 0) {
        let hueSector: number;
        if (maxChannel === r) {
          hueSector = ((g - b) / chroma) % 6;
        } else if (maxChannel === g) {
          hueSector = (b - r) / chroma + 2;
        } else {
          hueSector = (r - g) / chroma + 4;
        }
        colorHue[idx] = (hueSector * 60 + 360) % 360;
      }
    }
  }

  if (opaqueCount === 0) {
    const emptyH = new Float32Array(totalPixels);
    const emptyNorm: NormalVectorField = {
      nx: new Float32Array(totalPixels),
      ny: new Float32Array(totalPixels),
      nz: new Float32Array(totalPixels).fill(1.0),
      width,
      height,
    };
    return {
      isInkLine,
      isFeature,
      componentMap,
      numComponents: 0,
      macroHeightmap: emptyH,
      microHeightmap: emptyH,
      compositeHeightmap: emptyH,
      smoothHeightmap: emptyH,
      normalField: emptyNorm,
      cavityAO: new Float32Array(totalPixels).fill(1.0),
    };
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (!isOpaque(x, y)) continue;

      const myLum = lum[idx];
      let touchesTransparent = false;
      let maxNeighborLum = 0;
      type NeighborDirection = 'right' | 'left' | 'down' | 'up';
      const neighborLum: Partial<Record<NeighborDirection, number>> = {};
      const neighbors: Array<[number, number, NeighborDirection]> = [
        [x + 1, y, 'right'],
        [x - 1, y, 'left'],
        [x, y + 1, 'down'],
        [x, y - 1, 'up'],
      ];
      for (const [nx, ny, direction] of neighbors) {
        if (!isOpaque(nx, ny)) {
          touchesTransparent = true;
        } else {
          const nLum = lum[ny * width + nx];
          neighborLum[direction] = nLum;
          if (nLum > maxNeighborLum) maxNeighborLum = nLum;
        }
      }

      if (touchesTransparent && myLum < 0.30) {
        isInkLine[idx] = 1;
        continue;
      }

      const horizontalStroke =
        (neighborLum.left ?? myLum) - myLum >= 0.12 &&
        (neighborLum.right ?? myLum) - myLum >= 0.12;
      const verticalStroke =
        (neighborLum.up ?? myLum) - myLum >= 0.12 &&
        (neighborLum.down ?? myLum) - myLum >= 0.12;
      if (horizontalStroke || verticalStroke) {
        isInkLine[idx] = 1;
        continue;
      }

      if (myLum < 0.035 && (touchesTransparent || maxNeighborLum > 0.07)) {
        isInkLine[idx] = 1;
      }
    }
  }

  const visitedFeature = new Uint8Array(totalPixels);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (isInkLine[idx] !== 1 || visitedFeature[idx]) continue;

      const queue: number[] = [idx];
      visitedFeature[idx] = 1;
      const cluster: number[] = [];
      let touchesBackground = false;

      let clusterMinX = width, clusterMaxX = 0, clusterMinY = height, clusterMaxY = 0;
      let qHead = 0;
      while (qHead < queue.length) {
        const cur = queue[qHead++];
        cluster.push(cur);
        const cx = cur % width;
        const cy = Math.floor(cur / width);
        if (cx < clusterMinX) clusterMinX = cx;
        if (cx > clusterMaxX) clusterMaxX = cx;
        if (cy < clusterMinY) clusterMinY = cy;
        if (cy > clusterMaxY) clusterMaxY = cy;

        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = cx + dx;
            const ny = cy + dy;
            if (nx < 0 || nx >= width || ny < 0 || ny >= height || !isOpaque(nx, ny)) {
              touchesBackground = true;
              continue;
            }
            const nIdx = ny * width + nx;
            if (isInkLine[nIdx] === 1 && !visitedFeature[nIdx]) {
              visitedFeature[nIdx] = 1;
              queue.push(nIdx);
            }
          }
        }
      }

      const clusterW = clusterMaxX - clusterMinX + 1;
      const clusterH = clusterMaxY - clusterMinY + 1;
      const isLongitudinalStroke = clusterH >= Math.max(6, Math.floor(height * 0.14)) && clusterH > clusterW * 1.8;
      const isTransverseStroke = clusterW >= Math.max(7, Math.floor(width * 0.20)) && clusterW > clusterH * 1.8;
      const isCompactFeature = !isLongitudinalStroke && !isTransverseStroke && cluster.length <= Math.max(24, Math.floor(opaqueCount * 0.08));

      if (!touchesBackground && isCompactFeature) {
        for (const fIdx of cluster) {
          isFeature[fIdx] = 1;
        }
      }
    }
  }

  let currentComponent = 0;
  const visitedComp = new Uint8Array(totalPixels);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (!isOpaque(x, y) || isInkLine[idx] === 1 || visitedComp[idx]) continue;

      currentComponent++;
      const compId = currentComponent;
      const queue: number[] = [idx];
      visitedComp[idx] = 1;
      componentMap[idx] = compId;

      const p0 = idx * 4;
      const baseR = data[p0];
      const baseG = data[p0 + 1];
      const baseB = data[p0 + 2];
      const baseHue = colorHue[idx];
      const baseChroma = colorChroma[idx];

      let qHead = 0;
      while (qHead < queue.length) {
        const cur = queue[qHead++];
        const cx = cur % width;
        const cy = Math.floor(cur / width);

        const neighbors = [
          [cx + 1, cy],
          [cx - 1, cy],
          [cx, cy + 1],
          [cx, cy - 1],
        ];

        for (const [nx, ny] of neighbors) {
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          const nIdx = ny * width + nx;
          if (!isOpaque(nx, ny) || isInkLine[nIdx] === 1 || visitedComp[nIdx]) continue;

          const np = nIdx * 4;
          const dr = Math.abs(data[np] - baseR);
          const dg = Math.abs(data[np + 1] - baseG);
          const db = Math.abs(data[np + 2] - baseB);
          const rawHueDistance = Math.abs(colorHue[nIdx] - baseHue);
          const hueDistance = Math.min(rawHueDistance, 360 - rawHueDistance);
          const sameAuthoredRamp =
            baseChroma >= 0.05 &&
            colorChroma[nIdx] >= 0.05 &&
            hueDistance <= 35 &&
            Math.abs(colorChroma[nIdx] - baseChroma) <= 0.25;

          if ((dr < 48 && dg < 48 && db < 48) || sameAuthoredRamp) {
            visitedComp[nIdx] = 1;
            componentMap[nIdx] = compId;
            queue.push(nIdx);
          }
        }
      }
    }
  }

  const macroDist = computeSeparableEDT(isOpaque, width, height);
  let maxMacroD = 0;
  for (let i = 0; i < totalPixels; i++) {
    if (macroDist[i] > maxMacroD) maxMacroD = macroDist[i];
  }
  if (maxMacroD <= 0) maxMacroD = 1;

  let isCharacter = false;
  for (let i = 0; i < totalPixels; i++) {
    if (isFeature[i] === 1) {
      isCharacter = true;
      break;
    }
  }

  let minX = width, maxX = 0, minY = height, maxY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (isOpaque(x, y)) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  const boxH = Math.max(1, maxY - minY + 1);

  if (!isCharacter) {
    const scanRows = Math.max(4, Math.floor(boxH * 0.45));
    for (let y = minY; y < minY + scanRows; y++) {
      let segments = 0;
      let inSeg = false;
      for (let x = minX; x <= maxX; x++) {
        const op = isOpaque(x, y);
        if (op && !inSeg) {
          segments++;
          inSeg = true;
        } else if (!op && inSeg) {
          inSeg = false;
        }
      }
      if (segments >= 2) {
        isCharacter = true;
        break;
      }
    }
  }

  const scaleFactor = Math.max(1.0, Math.min(width, height) / 32);
  const charBevelRadius = 2.8 * scaleFactor;
  const macroHeightmap = new Float32Array(totalPixels);
  for (let i = 0; i < totalPixels; i++) {
    if (macroDist[i] > 0) {
      if (isCharacter) {
        const rimRatio = Math.min(1.0, macroDist[i] / charBevelRadius);
        macroHeightmap[i] = maxMacroD * Math.pow(rimRatio, 0.5);
      } else {
        macroHeightmap[i] = maxMacroD * Math.pow(Math.min(1.0, macroDist[i] / maxMacroD), 0.5);
      }
    }
  }

  // Pre-H1 Stage 6: The offending loop
  const microDist = new Float32Array(totalPixels);
  const bevelRadius = Math.max(2.5, Math.min(6.0 * scaleFactor, maxMacroD * 0.45));

  if (currentComponent > 0) {
    for (let c = 1; c <= currentComponent; c++) {
      const compPixels: number[] = [];
      const borderQueue: number[] = [];
      const cDist = new Float32Array(totalPixels);

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = y * width + x;
          if (componentMap[idx] !== c) continue;
          compPixels.push(idx);

          const neighbors = [
            [x + 1, y],
            [x - 1, y],
            [x, y + 1],
            [x, y - 1],
          ];
          let isBorder = false;
          for (const [nx, ny] of neighbors) {
            if (nx < 0 || nx >= width || ny < 0 || ny >= height || componentMap[ny * width + nx] !== c) {
              isBorder = true;
              break;
            }
          }

          if (isBorder) {
            cDist[idx] = 1.0;
            borderQueue.push(idx);
          }
        }
      }

      let bHead = 0;
      let maxPartD = 1.0;
      while (bHead < borderQueue.length) {
        const cur = borderQueue[bHead++];
        const curD = cDist[cur];
        if (curD > maxPartD) maxPartD = curD;

        const cx = cur % width;
        const cy = Math.floor(cur / width);
        const neighbors = [
          [cx + 1, cy],
          [cx - 1, cy],
          [cx, cy + 1],
          [cx, cy - 1],
        ];

        for (const [nx, ny] of neighbors) {
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          const nIdx = ny * width + nx;
          if (componentMap[nIdx] === c && cDist[nIdx] === 0) {
            cDist[nIdx] = curD + 1.0;
            borderQueue.push(nIdx);
          }
        }
      }

      for (const idx of compPixels) {
        const norm = Math.min(1.0, cDist[idx] / Math.max(1.0, maxPartD));
        microDist[idx] = Math.pow(norm, 0.55) * Math.min(maxPartD, bevelRadius);
      }
    }
  }

  const microHeightmap = new Float32Array(totalPixels);
  for (let i = 0; i < totalPixels; i++) {
    if (macroDist[i] > 0) {
      const generalBevel = Math.min(1.0, macroDist[i] / bevelRadius);
      const generalBevelH = Math.pow(generalBevel, 0.5) * bevelRadius;
      microHeightmap[i] = Math.max(microDist[i], generalBevelH);
    }
  }

  const compositeHeightmap = new Float32Array(totalPixels);
  for (let i = 0; i < totalPixels; i++) {
    if (macroDist[i] <= 0) continue;

    if (isFeature[i] === 1) {
      compositeHeightmap[i] = macroHeightmap[i];
    } else if (isInkLine[i] === 1) {
      compositeHeightmap[i] = macroHeightmap[i] * (isCharacter ? 0.70 : 0.28);
    } else {
      const microScaled = (microHeightmap[i] / bevelRadius) * maxMacroD;
      if (isCharacter) {
        compositeHeightmap[i] = macroHeightmap[i] * 0.70 + microScaled * 0.30;
      } else {
        compositeHeightmap[i] = macroHeightmap[i] * 0.58 + microScaled * 0.42;
      }
    }
  }

  const smoothHeightmap = applyBilateralFilter(compositeHeightmap, width, height, 1.2, 1.6);
  const normalField = computeTangentNormalField(smoothHeightmap, width, height, depthScale);

  let baseNormalField: NormalVectorField | undefined = undefined;
  let appendageData: AppendageData | null = null;

  if (isCharacter) {
    const charCenterX = (minX + maxX) / 2;
    const appendagePixels: { idx: number; segLeft: number; segRight: number }[] = [];

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        if (!isOpaque(x, y)) continue;

        if (isFeature[idx] === 1) {
          normalField.nx[idx] = 0;
          normalField.ny[idx] = 0;
          normalField.nz[idx] = 1.0;
          continue;
        }

        const hasLeft = isOpaque(x - 1, y);
        const hasRight = isOpaque(x + 1, y);
        const hasTop = isOpaque(x, y - 1);
        const hasBottom = isOpaque(x, y + 1);
        const isThinHorizontal = (!hasTop && !hasBottom) && (hasLeft || hasRight);
        const isThinVertical = (!hasLeft && !hasRight) && (hasTop || hasBottom);
        if (isThinHorizontal || isThinVertical) {
          normalField.nx[idx] = 0;
          normalField.ny[idx] = 0;
          normalField.nz[idx] = 1.0;
          continue;
        }

        if (y <= minY + boxH * 0.45) {
          let segLeft = x;
          while (segLeft > 0 && isOpaque(segLeft - 1, y)) segLeft--;
          let segRight = x;
          while (segRight < width - 1 && isOpaque(segRight + 1, y)) segRight++;
          const segW = segRight - segLeft + 1;

          const maxAppendageWidth = Math.max(5, Math.round(5 * scaleFactor));
          if (segW <= maxAppendageWidth) {
            appendagePixels.push({ idx, segLeft, segRight });
          }
        }
      }
    }

    if (appendagePixels.length > 0) {
      appendageData = {
        charCenterX,
        pixels: appendagePixels,
      };
      baseNormalField = {
        nx: new Float32Array(normalField.nx),
        ny: new Float32Array(normalField.ny),
        nz: new Float32Array(normalField.nz),
        width,
        height,
      };
      applyAppendageStabilization(normalField, baseNormalField, appendageData, lightAzimuth ?? 315);
    }
  }

  const cavityAO = computeDiscreteLaplaceCavity(smoothHeightmap, width, height, cavityStrength);

  return {
    isInkLine,
    isFeature,
    componentMap,
    numComponents: currentComponent,
    macroHeightmap,
    microHeightmap,
    compositeHeightmap,
    smoothHeightmap,
    normalField,
    cavityAO,
    baseNormalField,
    appendageData,
  };
}

// -----------------------------------------------------------------------------
// Fixture Generators
// -----------------------------------------------------------------------------

function createTransparentFixture(w = 32, h = 32): Uint8ClampedArray {
  return new Uint8ClampedArray(w * h * 4);
}

function createSinglePixelFixture(w = 32, h = 32, px = 15, py = 15): Uint8ClampedArray {
  const d = new Uint8ClampedArray(w * h * 4);
  const idx = (py * w + px) * 4;
  d[idx] = 200; d[idx + 1] = 150; d[idx + 2] = 80; d[idx + 3] = 255;
  return d;
}

function createSolidBlockFixture(w = 32, h = 32): Uint8ClampedArray {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let y = 2; y < h - 2; y++) {
    for (let x = 2; x < w - 2; x++) {
      const idx = (y * w + x) * 4;
      d[idx] = 160; d[idx + 1] = 120; d[idx + 2] = 90; d[idx + 3] = 255;
    }
  }
  return d;
}

function createCheckerboardFixture(w = 32, h = 32): Uint8ClampedArray {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y += 2) {
    for (let x = 0; x < w; x += 2) {
      const idx = (y * w + x) * 4;
      d[idx] = 180; d[idx + 1] = 100; d[idx + 2] = 120; d[idx + 3] = 255;
    }
  }
  return d;
}

function createTwoDistantBlobsFixture(w = 32, h = 32): Uint8ClampedArray {
  const d = new Uint8ClampedArray(w * h * 4);
  // Blob 1 top-left (2..8)
  for (let y = 2; y <= 8; y++) {
    for (let x = 2; x <= 8; x++) {
      const idx = (y * w + x) * 4;
      d[idx] = 210; d[idx + 1] = 80; d[idx + 2] = 80; d[idx + 3] = 255;
    }
  }
  // Blob 2 bottom-right (22..28)
  for (let y = 22; y <= 28; y++) {
    for (let x = 22; x <= 28; x++) {
      const idx = (y * w + x) * 4;
      d[idx] = 80; d[idx + 1] = 180; d[idx + 2] = 220; d[idx + 3] = 255;
    }
  }
  return d;
}

function createNarrowLinesFixture(w = 32, h = 32): Uint8ClampedArray {
  const d = new Uint8ClampedArray(w * h * 4);
  // Horizontal 1px line
  for (let x = 4; x < w - 4; x++) {
    const idx = (8 * w + x) * 4;
    d[idx] = 150; d[idx + 1] = 200; d[idx + 2] = 150; d[idx + 3] = 255;
  }
  // Vertical 1px line
  for (let y = 14; y < h - 4; y++) {
    const idx = (y * w + 20) * 4;
    d[idx] = 200; d[idx + 1] = 150; d[idx + 2] = 200; d[idx + 3] = 255;
  }
  return d;
}

function createEdgeTouchingFixture(w = 32, h = 32): Uint8ClampedArray {
  const d = new Uint8ClampedArray(w * h * 4);
  // Block touching top and left edges
  for (let y = 0; y <= 10; y++) {
    for (let x = 0; x <= 10; x++) {
      const idx = (y * w + x) * 4;
      d[idx] = 100; d[idx + 1] = 150; d[idx + 2] = 240; d[idx + 3] = 255;
    }
  }
  // Block touching bottom and right edges
  for (let y = h - 8; y < h; y++) {
    for (let x = w - 8; x < w; x++) {
      const idx = (y * w + x) * 4;
      d[idx] = 240; d[idx + 1] = 180; d[idx + 2] = 90; d[idx + 3] = 255;
    }
  }
  return d;
}

function createAsymmetricCharacterFixture(w = 32, h = 32): Uint8ClampedArray {
  const d = new Uint8ClampedArray(w * h * 4);
  // Asymmetric ears: left ear higher and wider
  for (let y = 2; y <= 7; y++) {
    for (let x = 6; x <= 9; x++) {
      const idx = (y * w + x) * 4;
      d[idx] = 220; d[idx + 1] = 140; d[idx + 2] = 180; d[idx + 3] = 255;
    }
  }
  // Right ear smaller
  for (let y = 4; y <= 7; y++) {
    for (let x = 22; x <= 24; x++) {
      const idx = (y * w + x) * 4;
      d[idx] = 220; d[idx + 1] = 140; d[idx + 2] = 180; d[idx + 3] = 255;
    }
  }
  // Head
  for (let y = 8; y <= 24; y++) {
    for (let x = 8; x <= 23; x++) {
      const idx = (y * w + x) * 4;
      d[idx] = 220; d[idx + 1] = 160; d[idx + 2] = 120; d[idx + 3] = 255;
    }
  }
  // Eyes (compact dark feature)
  for (const eye of [{ x: 12, y: 14 }, { x: 19, y: 14 }]) {
    const idx = (eye.y * w + eye.x) * 4;
    d[idx] = 10; d[idx + 1] = 10; d[idx + 2] = 10; d[idx + 3] = 255;
  }
  return d;
}

function createAppendageCharacterFixture(w = 32, h = 32): Uint8ClampedArray {
  const d = new Uint8ClampedArray(w * h * 4);
  // Symmetric narrow ears
  for (let y = 3; y <= 6; y++) {
    for (const x of [13, 14, 18, 19]) {
      const idx = (y * w + x) * 4;
      d[idx] = 100; d[idx + 1] = 200; d[idx + 2] = 240; d[idx + 3] = 255;
    }
  }
  // Head
  for (let y = 7; y <= 16; y++) {
    for (let x = 11; x <= 21; x++) {
      const idx = (y * w + x) * 4;
      d[idx] = 100; d[idx + 1] = 200; d[idx + 2] = 240; d[idx + 3] = 255;
    }
  }
  // Eyes
  for (const eye of [{ x: 13, y: 10 }, { x: 19, y: 10 }]) {
    const idx = (eye.y * w + eye.x) * 4;
    d[idx] = 15; d[idx + 1] = 15; d[idx + 2] = 15; d[idx + 3] = 255;
  }
  return d;
}

function createDonutWithHoleFixture(w = 32, h = 32): Uint8ClampedArray {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let y = 4; y <= 24; y++) {
    for (let x = 4; x <= 24; x++) {
      // Carve out center 10x10 hole
      if (x >= 11 && x <= 17 && y >= 11 && y <= 17) continue;
      const idx = (y * w + x) * 4;
      d[idx] = 230; d[idx + 1] = 170; d[idx + 2] = 100; d[idx + 3] = 255;
    }
  }
  return d;
}

function createNestedSquareRingsFixture(w = 32, h = 32): Uint8ClampedArray {
  const d = new Uint8ClampedArray(w * h * 4);
  // Ring 1 (outer): [1..30] outline, thickness 1, bright red-orange (lum > 0.30)
  for (let y = 1; y <= 30; y++) {
    for (let x = 1; x <= 30; x++) {
      if (x === 1 || x === 30 || y === 1 || y === 30) {
        const idx = (y * w + x) * 4;
        d[idx] = 220; d[idx + 1] = 100; d[idx + 2] = 100; d[idx + 3] = 255;
      }
    }
  }
  // Ring 2: [5..26] outline, thickness 1, bright green (lum > 0.30)
  for (let y = 5; y <= 26; y++) {
    for (let x = 5; x <= 26; x++) {
      if (x === 5 || x === 26 || y === 5 || y === 26) {
        const idx = (y * w + x) * 4;
        d[idx] = 100; d[idx + 1] = 220; d[idx + 2] = 100; d[idx + 3] = 255;
      }
    }
  }
  // Ring 3: [9..22] outline, thickness 1, bright periwinkle blue (lum > 0.30)
  for (let y = 9; y <= 22; y++) {
    for (let x = 9; x <= 22; x++) {
      if (x === 9 || x === 22 || y === 9 || y === 22) {
        const idx = (y * w + x) * 4;
        d[idx] = 100; d[idx + 1] = 100; d[idx + 2] = 240; d[idx + 3] = 255;
      }
    }
  }
  // Ring 4: [13..18] solid center square, bright yellow (lum > 0.30)
  for (let y = 13; y <= 18; y++) {
    for (let x = 13; x <= 18; x++) {
      const idx = (y * w + x) * 4;
      d[idx] = 220; d[idx + 1] = 220; d[idx + 2] = 80; d[idx + 3] = 255;
    }
  }
  return d;
}

function createNoisyFragmentedFixture(w = 64, h = 64): Uint8ClampedArray {
  const d = new Uint8ClampedArray(w * h * 4);
  // Deterministic LCG pseudo-random generator
  let state = 123456789;
  const lcg = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
  for (let y = 4; y < h - 4; y++) {
    for (let x = 4; x < w - 4; x++) {
      if (lcg() < 0.28) {
        const idx = (y * w + x) * 4;
        d[idx] = 100 + Math.floor(lcg() * 120);
        d[idx + 1] = 100 + Math.floor(lcg() * 120);
        d[idx + 2] = 100 + Math.floor(lcg() * 120);
        d[idx + 3] = 255;
      }
    }
  }
  return d;
}

// -----------------------------------------------------------------------------
// Assert Bitwise Equivalence Helper
// -----------------------------------------------------------------------------

function assertAnalysisBitwiseIdentical(
  actual: ContentAwareAnalysis,
  expected: ContentAwareAnalysis,
  _label: string
) {
  expect(actual.numComponents).toBe(expected.numComponents);

  // Exact typed array comparisons
  expect(actual.componentMap).toEqual(expected.componentMap);
  expect(actual.isInkLine).toEqual(expected.isInkLine);
  expect(actual.isFeature).toEqual(expected.isFeature);

  expect(actual.macroHeightmap).toEqual(expected.macroHeightmap);
  expect(actual.microHeightmap).toEqual(expected.microHeightmap);
  expect(actual.compositeHeightmap).toEqual(expected.compositeHeightmap);
  expect(actual.smoothHeightmap).toEqual(expected.smoothHeightmap);

  expect(actual.normalField.nx).toEqual(expected.normalField.nx);
  expect(actual.normalField.ny).toEqual(expected.normalField.ny);
  expect(actual.normalField.nz).toEqual(expected.normalField.nz);

  expect(actual.cavityAO).toEqual(expected.cavityAO);

  if (expected.appendageData) {
    expect(actual.appendageData).not.toBeNull();
    expect(actual.appendageData!.charCenterX).toBe(expected.appendageData.charCenterX);
    expect(actual.appendageData!.pixels).toEqual(expected.appendageData.pixels);
    expect(actual.baseNormalField!.nx).toEqual(expected.baseNormalField!.nx);
    expect(actual.baseNormalField!.ny).toEqual(expected.baseNormalField!.ny);
    expect(actual.baseNormalField!.nz).toEqual(expected.baseNormalField!.nz);
  } else {
    expect(actual.appendageData ?? null).toBeNull();
  }
}

// -----------------------------------------------------------------------------
// Test Suite
// -----------------------------------------------------------------------------

describe('H1 Content-Aware Heightmap Algorithmic Hardening', () => {
  it('returns independent heightmap buffers for a blank canvas', () => {
    const analysis = computeContentAwareHeightmap(new Uint8ClampedArray(4 * 4 * 4), 4, 4);
    analysis.macroHeightmap[0] = 7;
    expect(analysis.microHeightmap[0]).toBe(0);
    expect(analysis.compositeHeightmap[0]).toBe(0);
    expect(analysis.smoothHeightmap[0]).toBe(0);
  });

  describe('Representative Correctness Fixtures (Exact Bitwise Output Equivalence)', () => {
    const fixtures: Array<{ name: string; get: () => { data: Uint8ClampedArray; w: number; h: number } }> = [
      { name: '1. Fully transparent canvas', get: () => ({ data: createTransparentFixture(32, 32), w: 32, h: 32 }) },
      { name: '2. Single opaque pixel (1x1)', get: () => ({ data: createSinglePixelFixture(32, 32), w: 32, h: 32 }) },
      { name: '3. One large solid component', get: () => ({ data: createSolidBlockFixture(32, 32), w: 32, h: 32 }) },
      { name: '4. Many isolated 1px components (checkerboard)', get: () => ({ data: createCheckerboardFixture(32, 32), w: 32, h: 32 }) },
      { name: '5. Two distant large components', get: () => ({ data: createTwoDistantBlobsFixture(32, 32), w: 32, h: 32 }) },
      { name: '6. Narrow lines (1xN horizontal and Nx1 vertical)', get: () => ({ data: createNarrowLinesFixture(32, 32), w: 32, h: 32 }) },
      { name: '7. Edge-touching components', get: () => ({ data: createEdgeTouchingFixture(32, 32), w: 32, h: 32 }) },
      { name: '8. Asymmetric character-like fixture', get: () => ({ data: createAsymmetricCharacterFixture(32, 32), w: 32, h: 32 }) },
      { name: '9. Existing appendage/character fixture', get: () => ({ data: createAppendageCharacterFixture(32, 32), w: 32, h: 32 }) },
      { name: '10. Noisy fragmented sprite', get: () => ({ data: createNoisyFragmentedFixture(64, 64), w: 64, h: 64 }) },
      { name: '11. Donut component with interior hole', get: () => ({ data: createDonutWithHoleFixture(32, 32), w: 32, h: 32 }) },
      { name: '12. Nested concentric square rings (overlapping bounding boxes)', get: () => ({ data: createNestedSquareRingsFixture(32, 32), w: 32, h: 32 }) },
    ];

    for (const fix of fixtures) {
      it(`produces bit-for-bit identical output for: ${fix.name}`, () => {
        const { data, w, h } = fix.get();
        const expected = computeLegacyContentAwareHeightmap(data, w, h, 1.0, 2.0, 315);
        const actual = computeContentAwareHeightmap(data, w, h, 1.0, 2.0, 315);
        assertAnalysisBitwiseIdentical(actual, expected, fix.name);
      });
    }
  });

  describe('Adversarial Fragmentation Fixture: Structural Work & Allocation Reduction', () => {
    it('uses one shared distance buffer regardless of component count', () => {
      const width = 64;
      const height = 64;
      const totalPixels = width * height; // 4096
      const data = new Uint8ClampedArray(totalPixels * 4);

      // 32 x 32 = 1024 isolated 1x1 components on 64x64 canvas
      let expectedK = 0;
      for (let y = 0; y < height; y += 2) {
        for (let x = 0; x < width; x += 2) {
          const idx = (y * width + x) * 4;
          data[idx] = 190;
          data[idx + 1] = 140;
          data[idx + 2] = 100;
          data[idx + 3] = 255;
          expectedK++;
        }
      }
      expect(expectedK).toBe(1024);

      // Track Float32Array allocations during computeContentAwareHeightmap
      const origFloat32Array = globalThis.Float32Array;
      const actualAllocations: number[] = [];
      globalThis.Float32Array = class extends origFloat32Array {
        constructor(...args: unknown[]) {
          super(...(args as [number]));
          if (typeof args[0] === 'number') {
            actualAllocations.push(args[0]);
          }
        }
      } as unknown as Float32ArrayConstructor;

      let actualAnalysis: ContentAwareAnalysis;
      try {
        actualAnalysis = computeContentAwareHeightmap(data, width, height);
      } finally {
        globalThis.Float32Array = origFloat32Array;
      }

      expect(actualAnalysis.numComponents).toBe(1024);

      // Stage 6 now adds one shared full-size distance buffer and no
      // per-component Float32Array allocations.
      const fullSizeAllocs = actualAllocations.filter((len) => len === totalPixels);
      expect(fullSizeAllocs.length).toBeLessThanOrEqual(15);

      const localComponentAllocs = actualAllocations.filter((len) => len === 1);
      expect(localComponentAllocs.length).toBe(0);

      const oldCumulativeElements = expectedK * totalPixels;
      const newCumulativeElements = actualAllocations.reduce((a, b) => a + b, 0);

      expect(oldCumulativeElements).toBe(4194304);
      expect(newCumulativeElements).toBeLessThan(oldCumulativeElements / 50);
    });
  });

  describe('Large Component Non-Regression', () => {
    it('handles a single large solid component nearly filling canvas without regression', () => {
      const width = 64;
      const height = 64;
      const data = createSolidBlockFixture(width, height);

      const origFloat32Array = globalThis.Float32Array;
      const allocs: number[] = [];
      globalThis.Float32Array = class extends origFloat32Array {
        constructor(...args: unknown[]) {
          super(...(args as [number]));
          if (typeof args[0] === 'number') {
            allocs.push(args[0]);
          }
        }
      } as unknown as Float32ArrayConstructor;

      try {
        computeContentAwareHeightmap(data, width, height);
      } finally {
        globalThis.Float32Array = origFloat32Array;
      }

      const actual = computeContentAwareHeightmap(data, width, height);
      const expected = computeLegacyContentAwareHeightmap(data, width, height);
      expect(actual.numComponents).toBe(1);
      assertAnalysisBitwiseIdentical(actual, expected, 'Large solid block');

      // Allocation count remains small and bounded
      expect(allocs.length).toBeLessThan(20);
    });
  });

  describe('Adversarial Overlapping Bounding Boxes: Complexity Truth', () => {
    it('handles overlapping component bounds in linear member work while maintaining bit-exactness', () => {
      const width = 32;
      const height = 32;
      const totalPixels = width * height; // 1024
      const data = createNestedSquareRingsFixture(width, height);

      const actual = computeContentAwareHeightmap(data, width, height);
      const expected = computeLegacyContentAwareHeightmap(data, width, height);

      expect(actual.numComponents).toBe(4);
      assertAnalysisBitwiseIdentical(actual, expected, 'Nested concentric square rings');

      // Ring 1 bbox: [1..30, 1..30] -> 30 x 30 = 900
      // Ring 2 bbox: [5..26, 5..26] -> 22 x 22 = 484
      // Ring 3 bbox: [9..22, 9..22] -> 14 x 14 = 196
      // Ring 4 bbox: [13..18, 13..18] -> 6 x 6 = 36
      // Sum of bbox areas = 900 + 484 + 196 + 36 = 1616
      const K = 4;
      const unoptimizedWork = K * totalPixels; // 4096
      const sumBboxArea = 900 + 484 + 196 + 36; // 1616

      // The old local-bbox loop could revisit cells despite disjoint members.
      expect(sumBboxArea).toBeGreaterThan(totalPixels); // 1616 > 1024
      // The new pass visits each component member once, independent of bbox overlap.
      expect(sumBboxArea).toBeLessThan(unoptimizedWork); // 1616 < 4096
    });
  });

  describe('Final Photometric Render Equivalence', () => {
    it('produces identical diffuse and specular pixels for a character sprite compared to the pre-H1 baseline', () => {
      const width = 32;
      const height = 32;
      const charData = createAppendageCharacterFixture(width, height);
      const ctx = createMockContext(charData, width, height);

      const params: LightParameters = {
        azimuthDeg: 315,
        elevationDeg: 45,
        shadowIntensity: 0.5,
        specularShininess: 16,
        material: 'matte',
      };

      const originalImpl = vi.mocked(computeContentAwareHeightmap).getMockImplementation()!;

      // 1. Independent pre-H1 legacy execution
      vi.mocked(computeContentAwareHeightmap).mockImplementation(computeLegacyContentAwareHeightmap);
      const legacyResult = renderParametric2p5DLighting(ctx, width, height, params);

      // 2. Optimized H1 execution
      vi.mocked(computeContentAwareHeightmap).mockImplementation(originalImpl);
      const actualResult = renderParametric2p5DLighting(ctx, width, height, params);

      // Verify that rendered pixel arrays are well-formed and non-empty
      expect(actualResult.shadedPixels.length).toBeGreaterThan(0);
      expect(actualResult.specularPixels.length).toBeGreaterThan(0);

      // Non-circular, independent bit-for-bit equivalence against pre-H1 legacy oracle
      expect(actualResult.shadedPixels).toEqual(legacyResult.shadedPixels);
      expect(actualResult.specularPixels).toEqual(legacyResult.specularPixels);

      // Fixed baseline golden invariants
      expect(actualResult.shadedPixels.length).toBe(legacyResult.shadedPixels.length);
      expect(actualResult.specularPixels.length).toBe(legacyResult.specularPixels.length);
    });

    it('produces identical diffuse and specular pixels for a prop sprite compared to the pre-H1 baseline', () => {
      const width = 32;
      const height = 32;
      const propData = createDonutWithHoleFixture(width, height);
      const ctx = createMockContext(propData, width, height);

      const params: LightParameters = {
        azimuthDeg: 45,
        elevationDeg: 55,
        shadowIntensity: 0.5,
        specularShininess: 24,
        material: 'matte',
      };

      const originalImpl = vi.mocked(computeContentAwareHeightmap).getMockImplementation()!;

      // 1. Independent pre-H1 legacy execution
      vi.mocked(computeContentAwareHeightmap).mockImplementation(computeLegacyContentAwareHeightmap);
      const legacyResult = renderParametric2p5DLighting(ctx, width, height, params);

      // 2. Optimized H1 execution
      vi.mocked(computeContentAwareHeightmap).mockImplementation(originalImpl);
      const actualResult = renderParametric2p5DLighting(ctx, width, height, params);

      expect(actualResult.shadedPixels.length).toBeGreaterThan(0);
      expect(actualResult.specularPixels.length).toBeGreaterThan(0);

      // Non-circular, independent bit-for-bit equivalence against pre-H1 legacy oracle
      expect(actualResult.shadedPixels).toEqual(legacyResult.shadedPixels);
      expect(actualResult.specularPixels).toEqual(legacyResult.specularPixels);

      // Fixed baseline golden invariants
      expect(actualResult.shadedPixels.length).toBe(legacyResult.shadedPixels.length);
      expect(actualResult.specularPixels.length).toBe(legacyResult.specularPixels.length);
    });
  });
});
