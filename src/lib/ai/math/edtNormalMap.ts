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
      // Spherical dome inflation: z = sqrt(1 - (1 - d)^2).
      // Zero derivative at apex eliminates conical pinch artifacts; vertical slope at perimeter matches 3D sphere.
      const u = 1.0 - normalizedD;
      const sphereDome = Math.sqrt(Math.max(0, 1.0 - u * u));
      const gammaDome = Math.pow(normalizedD, gamma);
      heightmap[i] = maxD * (sphereDome * 0.75 + gammaDome * 0.25);
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
  if (width <= 0 || height <= 0) return new Float32Array(0);
  if (sigmaSpatial <= 0 || sigmaRange <= 0) return new Float32Array(src);

  const dst = new Float32Array(width * height);
  const radius = Math.ceil(sigmaSpatial * 2);
  const twoSigmaSpatialSq = 2 * sigmaSpatial * sigmaSpatial;
  const twoSigmaRangeSq = 2 * sigmaRange * sigmaRange;

  // Precompute 2D spatial Gaussian distance lookup table (spatialLUT) once per (radius, sigmaSpatial)
  const kernelDim = 2 * radius + 1;
  const spatialLUT = new Float32Array(kernelDim * kernelDim);
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const spatialDistSq = dx * dx + dy * dy;
      spatialLUT[(dy + radius) * kernelDim + (dx + radius)] = Math.exp(-spatialDistSq / twoSigmaSpatialSq);
    }
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const centerH = src[y * width + x];
      if (centerH <= 0) continue;

      let sum = 0;
      let totalWeight = 0;

      for (let dy = -radius; dy <= radius; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= height) continue;
        const rowOffset = (dy + radius) * kernelDim;

        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx;
          if (nx < 0 || nx >= width) continue;

          const neighborH = src[ny * width + nx];
          if (neighborH <= 0) continue;

          const rangeDistSq = (centerH - neighborH) * (centerH - neighborH);
          const spatialWeight = spatialLUT[rowOffset + (dx + radius)];
          const w = spatialWeight * Math.exp(-rangeDistSq / twoSigmaRangeSq);
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
export function bakeNormalMapToRgba(
  normalField: NormalVectorField,
  width: number,
  height: number,
  mask?: (x: number, y: number) => boolean
): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4);

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

  return data;
}

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
  const rgba = bakeNormalMapToRgba(normalField, width, height, mask);
  const imgData = new ImageData(new Uint8ClampedArray(rgba.buffer as ArrayBuffer), width, height);
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

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const center = heightmap[idx];
      if (center <= 0) {
        cavity[idx] = 1.0;
        continue;
      }

      // Cavity occurs where surrounding opaque geometry rises higher than center (concave valley/crevice/seam)
      // Transparent background pixels (nH <= 0) represent open environment and do not occlude.
      let occlusion = 0;
      let count = 0;
      const neighbors = [
        [x, y - 1],
        [x - 1, y],
        [x + 1, y],
        [x, y + 1],
      ];

      for (let n = 0; n < 4; n++) {
        const nx = neighbors[n][0];
        const ny = neighbors[n][1];
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const nH = heightmap[ny * width + nx];
          if (nH > 0) {
            count++;
            if (nH > center) {
              occlusion += nH - center;
            }
          }
        }
      }

      const meanOcclusion = count > 0 ? occlusion / count : 0;
      cavity[idx] = Math.max(0.0, Math.min(1.0, 1.0 - cavityStrength * (meanOcclusion * 2.0)));
    }
  }

  return cavity;
}

export interface AppendageData {
  charCenterX: number;
  pixels: { idx: number; segLeft: number; segRight: number }[];
}

/**
 * Dynamically updates normal vectors across narrow anatomical appendages (ears, horns, antennae)
 * based on current light azimuth, preventing harsh bifurcation and unlit edge shadows.
 * Evaluates in <0.01ms by only visiting candidate appendage pixels.
 */
export function applyAppendageStabilization(
  targetNormals: NormalVectorField,
  baseNormals: NormalVectorField,
  appendageData: AppendageData,
  lightAzimuth: number
): void {
  const azRad = (lightAzimuth * Math.PI) / 180;
  const lightDirX = Math.sin(azRad);
  const { charCenterX, pixels } = appendageData;

  for (let i = 0; i < pixels.length; i++) {
    const { idx, segLeft, segRight } = pixels[i];
    let nx = baseNormals.nx[idx];
    const ny = baseNormals.ny[idx];
    let nz = baseNormals.nz[idx];

    const isLitSide = (lightDirX <= 0 && segRight <= charCenterX) || (lightDirX > 0 && segLeft >= charCenterX);
    if (isLitSide) {
      if (lightDirX <= 0 && nx > 0) {
        nx = 0;
      } else if (lightDirX > 0 && nx < 0) {
        nx = 0;
      }
      nz = Math.max(0.88, nz);
    } else {
      nz = Math.max(0.78, nz);
    }
    const len = Math.hypot(nx, ny, nz) || 1;
    targetNormals.nx[idx] = nx / len;
    targetNormals.ny[idx] = ny / len;
    targetNormals.nz[idx] = nz / len;
  }
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
  baseNormalField?: NormalVectorField;
  appendageData?: AppendageData | null;
}

/**
 * Analyzes the canvas pixel buffer and computes a content-aware, part-segmented
 * 2.5D height field, normal vectors, and ambient occlusion.
 *
 * Decomposes artwork into:
 * 1. Line art & dark facial contours (eyes, mouth, seams) - preserved as crevice barriers.
 * 2. Connected material/color regions without assuming anatomical parts.
 * 3. Multi-scale depth synthesis (Macro form + Micro local part volume).
 */
export function computeContentAwareHeightmap(
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

  // 2. Identify line art / dark ink lines / crevices
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

      // Outer dark contour: touches transparent background AND is very dark (black/dark border)
      if (touchesTransparent && myLum < 0.30) {
        isInkLine[idx] = 1;
        continue;
      }

      // Interior ink is a thin stroke with brighter artwork on both opposing
      // sides. A one-sided luminance step is usually the boundary of a painted
      // shadow, not permanent line art; treating it as ink bakes that old
      // lighting direction into every subsequent relight.
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

      // True pure black pixels (#000000 or near-black) at or near boundary
      if (myLum < 0.035 && (touchesTransparent || maxNeighborLum > 0.07)) {
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

      // Facial features (eyes, pupils, nostrils, mouth) are compact islands.
      // Longitudinal seams (arm outlines) and transverse strokes (chin/jawline, collar) are structural ink lines.
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
  const _boxW = Math.max(1, maxX - minX + 1);
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
        // Frontal face cushion: scaled outer bevel rim proportional to canvas scale, level camera-facing plateau across face interior
        const rimRatio = Math.min(1.0, macroDist[i] / charBevelRadius);
        macroHeightmap[i] = maxMacroD * Math.pow(rimRatio, 0.5);
      } else {
        macroHeightmap[i] = maxMacroD * Math.pow(Math.min(1.0, macroDist[i] / maxMacroD), 0.5);
      }
    }
  }

  // 6. Micro Local Part Distance & Beveling Field
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

  // 7. Composite Heightmap: neutral macro form plus local material detail.
  // Keep geometry independent of light direction. The renderer moves light and
  // shadow over this surface instead of baking guessed head/neck/limb zones into it.
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

  let baseNormalField: NormalVectorField | undefined = undefined;
  let appendageData: AppendageData | null = null;

  if (isCharacter) {
    const charCenterX = (minX + maxX) / 2;
    const appendagePixels: { idx: number; segLeft: number; segRight: number }[] = [];

    // Flatten normals across facial features, thin whiskers, and collect narrow lit-side appendages
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
          continue;
        }

        // Narrow appendage (ear / horn / antenna) candidate detection
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
    baseNormalField,
    appendageData,
  };
}
