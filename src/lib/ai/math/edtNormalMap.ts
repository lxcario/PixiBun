/**
 * Linear-Time Euclidean Distance Transform (EDT), Dome Heightmap Inflation & Normal Map Generator.
 *
 * Citations:
 * 1. Pedro F. Felzenszwalb & Daniel P. Huttenlocher, "Distance Transforms of Sampled Functions",
 *    Theory of Computing, 8(19): 415–428, 2012 (orig. Cornell Computing and Information Science TR2004-1963, 2004).
 *    Provides linear-time O(W * H) exact 2D squared Euclidean distance transform via lower parabolic envelopes.
 * 2. C. Tomasi & R. Manduchi, "Bilateral Filtering for Gray and Color Images",
 *    IEEE International Conference on Computer Vision (ICCV), 1998.
 *    Non-linear edge-preserving height smoothing preserving silhouette boundaries.
 */

import {
  acquireFloat32Buffer,
  releaseFloat32Buffer,
  acquireInt32Buffer,
  releaseInt32Buffer,
} from '@/lib/engine/bufferPool';

export interface NormalVectorField {
  nx: Float32Array;
  ny: Float32Array;
  nz: Float32Array;
  width: number;
  height: number;
}

const INF = 1e9;

/**
 * Computes the 1D squared distance transform of an array in O(N) time using lower parabolic envelopes.
 */
function dt1D(f: Float32Array, n: number, d: Float32Array, v: Int32Array, z: Float32Array): void {
  let k = 0;
  v[0] = 0;
  z[0] = -INF;
  z[1] = INF;

  for (let q = 1; q < n; q++) {
    let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) {
      k--;
      s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = INF;
  }

  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) {
      k++;
    }
    const dx = q - v[k];
    d[q] = dx * dx + f[v[k]];
  }
}

/**
 * Computes exact 2D Euclidean Distance Transform (EDT) in O(width * height) linear time.
 */
export function computeSeparableEDT(
  isOpaque: (x: number, y: number) => boolean,
  width: number,
  height: number
): Float32Array {
  const maxDim = Math.max(width, height);
  const fScratch = acquireFloat32Buffer(maxDim);
  const dScratch = acquireFloat32Buffer(maxDim);
  const vScratch = acquireInt32Buffer(maxDim);
  const zScratch = acquireFloat32Buffer(maxDim + 1);

  try {
    const grid = new Float32Array(width * height);

    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        fScratch[y] = isOpaque(x, y) ? INF : 0;
      }
      dt1D(fScratch, height, dScratch, vScratch, zScratch);
      for (let y = 0; y < height; y++) {
        grid[y * width + x] = dScratch[y];
      }
    }

    const distance = new Float32Array(width * height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        fScratch[x] = grid[y * width + x];
      }
      dt1D(fScratch, width, dScratch, vScratch, zScratch);
      for (let x = 0; x < width; x++) {
        distance[y * width + x] = Math.sqrt(dScratch[x]);
      }
    }

    return distance;
  } finally {
    releaseFloat32Buffer(fScratch);
    releaseFloat32Buffer(dScratch);
    releaseInt32Buffer(vScratch);
    releaseFloat32Buffer(zScratch);
  }
}

/**
 * Inflates linear distance field into a rounded 2.5D height dome using power-law gamma curve.
 */
export function generateInflatedHeightmap(
  distanceMap: Float32Array,
  width: number,
  height: number,
  gamma: number = 0.5
): Float32Array {
  let maxD = 0;
  for (let i = 0; i < distanceMap.length; i++) {
    if (distanceMap[i] > maxD) maxD = distanceMap[i];
  }
  if (maxD <= 0) maxD = 1;

  const heightmap = new Float32Array(width * height);
  for (let i = 0; i < distanceMap.length; i++) {
    if (distanceMap[i] > 0) {
      const normalizedD = Math.min(1.0, distanceMap[i] / maxD);
      // Non-linear curvature inflated to full 3D dome height
      heightmap[i] = maxD * Math.pow(normalizedD, gamma);
    }
  }

  return heightmap;
}

/**
 * Edge-preserving bilateral filter over 2.5D heightmap (Tomasi & Manduchi 1998).
 */
export function applyBilateralFilter(
  src: Float32Array,
  width: number,
  height: number,
  sigmaSpatial: number = 1.5,
  sigmaRange: number = 2.0
): Float32Array {
  const dst = new Float32Array(width * height);
  const radius = Math.ceil(sigmaSpatial * 2);
  const twoSigmaSpatialSq = 2 * sigmaSpatial * sigmaSpatial;
  const twoSigmaRangeSq = 2 * sigmaRange * sigmaRange;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const centerH = src[y * width + x];
      if (centerH <= 0) continue;

      let sum = 0;
      let totalWeight = 0;

      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;

          const neighborH = src[ny * width + nx];
          if (neighborH <= 0) continue;

          const spatialDistSq = dx * dx + dy * dy;
          const rangeDistSq = (centerH - neighborH) * (centerH - neighborH);

          const w = Math.exp(-spatialDistSq / twoSigmaSpatialSq) * Math.exp(-rangeDistSq / twoSigmaRangeSq);
          sum += neighborH * w;
          totalWeight += w;
        }
      }

      dst[y * width + x] = totalWeight > 0 ? sum / totalWeight : centerH;
    }
  }

  return dst;
}

/**
 * Computes unit normal vectors in tangent space from heightmap using Sobel operator.
 */
export function computeTangentNormalField(
  heightmap: Float32Array,
  width: number,
  height: number,
  depthScale: number = 2.0
): NormalVectorField {
  const nx = new Float32Array(width * height);
  const ny = new Float32Array(width * height);
  const nz = new Float32Array(width * height);

  const getH = (x: number, y: number) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return 0;
    return heightmap[y * width + x];
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (heightmap[idx] <= 0) {
        nx[idx] = 0;
        ny[idx] = 0;
        nz[idx] = 1;
        continue;
      }

      // Sobel kernel for Gx (dH/dx)
      const Gx = (
        -1 * getH(x - 1, y - 1) + 1 * getH(x + 1, y - 1) +
        -2 * getH(x - 1, y)     + 2 * getH(x + 1, y) +
        -1 * getH(x - 1, y + 1) + 1 * getH(x + 1, y + 1)
      ) / 8.0;

      // Sobel kernel for Gy (dH/dy)
      const Gy = (
        -1 * getH(x - 1, y - 1) - 2 * getH(x, y - 1) - 1 * getH(x + 1, y - 1) +
         1 * getH(x - 1, y + 1) + 2 * getH(x, y + 1) + 1 * getH(x + 1, y + 1)
      ) / 8.0;

      const sx = -Gx * depthScale;
      const sy = -Gy * depthScale;
      const sz = 1.0;
      const len = Math.sqrt(sx * sx + sy * sy + sz * sz) || 1;

      nx[idx] = sx / len;
      ny[idx] = sy / len;
      nz[idx] = sz / len;
    }
  }

  return { nx, ny, nz, width, height };
}

/**
 * Bakes tangent space normal vector field to canvas image data (Standard Tangent Space RGB 128, 128, 255).
 */
export function bakeNormalMapToCanvas(
  normalField: NormalVectorField,
  width: number,
  height: number,
  mask?: (x: number, y: number) => boolean
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const imgData = ctx.createImageData(width, height);
  const data = imgData.data;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const pIdx = idx * 4;

      if (mask && !mask(x, y)) {
        data[pIdx] = 0;
        data[pIdx + 1] = 0;
        data[pIdx + 2] = 0;
        data[pIdx + 3] = 0;
        continue;
      }

      // Encode normal [-1, 1] to RGB [0, 255]
      const r = Math.round(((normalField.nx[idx] + 1) / 2) * 255);
      const g = Math.round(((-normalField.ny[idx] + 1) / 2) * 255); // Invert Y for OpenGL tangent map convention
      const b = Math.round(((normalField.nz[idx] + 1) / 2) * 255);

      data[pIdx] = r;
      data[pIdx + 1] = g;
      data[pIdx + 2] = b;
      data[pIdx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

/**
 * Computes discrete Laplace cavity map / ambient occlusion (AO) from heightmap.
 */
export function computeDiscreteLaplaceCavity(
  heightmap: Float32Array,
  width: number,
  height: number,
  cavityStrength: number = 1.0
): Float32Array {
  const cavity = new Float32Array(width * height);

  const getH = (x: number, y: number) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return 0;
    return heightmap[y * width + x];
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const center = heightmap[idx];
      if (center <= 0) {
        cavity[idx] = 1.0;
        continue;
      }

      // Discrete Laplace operator: d^2H/dx^2 + d^2H/dy^2
      const laplace =
        getH(x, y - 1) +
        getH(x - 1, y) - 4 * center + getH(x + 1, y) +
        getH(x, y + 1);

      // Cavity occurs where curvature is concave (valleys/crevices)
      const concaveCurvature = Math.max(0, -laplace);
      cavity[idx] = Math.max(0.0, Math.min(1.0, 1.0 - cavityStrength * (concaveCurvature / 4.0)));
    }
  }

  return cavity;
}

export interface ContentAwareAnalysis {
  isInkLine: Uint8Array;
  isFeature: Uint8Array;
  componentMap: Int32Array;
  numComponents: number;
  macroHeightmap: Float32Array;
  microHeightmap: Float32Array;
  compositeHeightmap: Float32Array;
  smoothHeightmap: Float32Array;
  normalField: NormalVectorField;
  cavityAO: Float32Array;
}

/**
 * Analyzes the canvas pixel buffer and computes a content-aware, part-segmented
 * 2.5D height field, normal vectors, and ambient occlusion.
 *
 * Decomposes artwork into:
 * 1. Line art & dark facial contours (eyes, mouth, seams) - preserved as crevice barriers.
 * 2. Connected color components (anatomical parts: ears, head, body, limbs).
 * 3. Multi-scale depth synthesis (Macro form + Micro local part volume).
 */
export function computeContentAwareHeightmap(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  cavityStrength: number = 1.0,
  depthScale: number = 2.0
): ContentAwareAnalysis {
  const totalPixels = width * height;
  const isInkLine = new Uint8Array(totalPixels);
  const isFeature = new Uint8Array(totalPixels);
  const componentMap = new Int32Array(totalPixels);

  const isOpaque = (x: number, y: number): boolean => {
    if (x < 0 || x >= width || y < 0 || y >= height) return false;
    return data[(y * width + x) * 4 + 3] > 30;
  };

  // 1. Calculate luminance & local contrast to detect line art and contours
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

  // 2. Identify line art / dark ink lines / crevices
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (!isOpaque(x, y)) continue;

      const myLum = lum[idx];
      if (myLum < 0.22) {
        isInkLine[idx] = 1;
        continue;
      }

      // Check if this pixel is significantly darker than neighboring interior pixels
      let maxNeighborLum = 0;
      let hasOpaqueNeighbor = false;
      const neighbors = [
        [x + 1, y],
        [x - 1, y],
        [x, y + 1],
        [x, y - 1],
      ];
      for (const [nx, ny] of neighbors) {
        if (isOpaque(nx, ny)) {
          hasOpaqueNeighbor = true;
          const nLum = lum[ny * width + nx];
          if (nLum > maxNeighborLum) maxNeighborLum = nLum;
        }
      }

      if (hasOpaqueNeighbor && maxNeighborLum - myLum >= 0.30) {
        isInkLine[idx] = 1;
      }
    }
  }

  // 3. Identify dark facial / internal features (eyes, mouth)
  const visitedFeature = new Uint8Array(totalPixels);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (isInkLine[idx] !== 1 || visitedFeature[idx]) continue;

      const queue: number[] = [idx];
      visitedFeature[idx] = 1;
      const cluster: number[] = [];
      let touchesBackground = false;

      let qHead = 0;
      while (qHead < queue.length) {
        const cur = queue[qHead++];
        cluster.push(cur);
        const cx = cur % width;
        const cy = Math.floor(cur / width);

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

      const maxFeatureSize = Math.max(36, Math.floor(opaqueCount * 0.18));
      if (!touchesBackground && cluster.length <= maxFeatureSize) {
        for (const fIdx of cluster) {
          isFeature[fIdx] = 1;
        }
      }
    }
  }

  // 4. Connected Components for Non-Ink Interior Parts
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

          if (dr < 48 && dg < 48 && db < 48) {
            visitedComp[nIdx] = 1;
            componentMap[nIdx] = compId;
            queue.push(nIdx);
          }
        }
      }
    }
  }

  // 5. Global Macro Distance Field (Overall Form)
  const macroDist = computeSeparableEDT(isOpaque, width, height);
  let maxMacroD = 0;
  for (let i = 0; i < totalPixels; i++) {
    if (macroDist[i] > maxMacroD) maxMacroD = macroDist[i];
  }
  if (maxMacroD <= 0) maxMacroD = 1;

  // Determine if artwork represents a character/creature (ears or internal facial features)
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
    const scanRows = Math.min(8, Math.max(2, Math.floor(boxH * 0.35)));
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

  const macroHeightmap = new Float32Array(totalPixels);
  for (let i = 0; i < totalPixels; i++) {
    if (macroDist[i] > 0) {
      if (isCharacter) {
        // Frontal face cushion: 2.8px outer bevel rim, level camera-facing plateau across face interior
        const rimRatio = Math.min(1.0, macroDist[i] / 2.8);
        macroHeightmap[i] = maxMacroD * Math.pow(rimRatio, 0.5);
      } else {
        macroHeightmap[i] = maxMacroD * Math.pow(Math.min(1.0, macroDist[i] / maxMacroD), 0.5);
      }
    }
  }

  // 6. Micro Local Part Distance & Beveling Field
  const microDist = new Float32Array(totalPixels);
  const bevelRadius = Math.max(2.5, Math.min(6.0, maxMacroD * 0.45));

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

  // 7. Composite Heightmap: Macro Form + Micro Part Domes + Crevice Carving
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

  // 8. Bilateral Filtering
  const smoothHeightmap = applyBilateralFilter(compositeHeightmap, width, height, 1.2, 1.6);

  // 9. Tangent-Space Normal Vector Field
  const normalField = computeTangentNormalField(smoothHeightmap, width, height, depthScale);

  if (isCharacter) {
    // Flatten normals across facial features and thin whiskers to protect them from distortion
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        if (!isOpaque(x, y)) continue;

        if (isFeature[idx] === 1) {
          // Pure frontal normal for eyes/mouth
          normalField.nx[idx] = 0;
          normalField.ny[idx] = 0;
          normalField.nz[idx] = 1.0;
          continue;
        }

        // Whisker / thin lateral 1px protrusion detection
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
        }
      }
    }
  }

  // 10. Discrete Laplace Cavity Map / Ambient Occlusion
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
  };
}
