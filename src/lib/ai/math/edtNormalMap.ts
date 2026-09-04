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
  const heightmap = new Float32Array(width * height);
  let maxD = 0;
  for (let i = 0; i < distanceMap.length; i++) {
    if (distanceMap[i] > maxD) maxD = distanceMap[i];
  }

  if (maxD === 0) return heightmap;

  for (let i = 0; i < distanceMap.length; i++) {
    if (distanceMap[i] > 0) {
      const normalizedD = Math.min(1.0, distanceMap[i] / maxD);
      heightmap[i] = Math.pow(normalizedD, gamma);
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
  sigmaRange: number = 0.15
): Float32Array {
  const dst = new Float32Array(width * height);
  const radius = Math.ceil(sigmaSpatial * 2);
  const twoSigmaSpatialSq = 2 * sigmaSpatial * sigmaSpatial;
  const twoSigmaRangeSq = 2 * sigmaRange * sigmaRange;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const centerIdx = y * width + x;
      const centerVal = src[centerIdx];

      if (centerVal === 0) {
        dst[centerIdx] = 0;
        continue;
      }

      let sumWeights = 0;
      let sumValues = 0;

      for (let dy = -radius; dy <= radius; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= height) continue;

        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx;
          if (nx < 0 || nx >= width) continue;

          const neighborVal = src[ny * width + nx];
          if (neighborVal === 0) continue;

          const distSq = dx * dx + dy * dy;
          const spatialWeight = Math.exp(-distSq / twoSigmaSpatialSq);
          const rangeDiff = neighborVal - centerVal;
          const rangeWeight = Math.exp(-(rangeDiff * rangeDiff) / twoSigmaRangeSq);

          const weight = spatialWeight * rangeWeight;
          sumWeights += weight;
          sumValues += neighborVal * weight;
        }
      }

      dst[centerIdx] = sumWeights > 0 ? sumValues / sumWeights : centerVal;
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
  strength: number = 2.0
): NormalVectorField {
  const nx = new Float32Array(width * height);
  const ny = new Float32Array(width * height);
  const nz = new Float32Array(width * height);

  const getH = (x: number, y: number) => {
    const cx = Math.max(0, Math.min(width - 1, x));
    const cy = Math.max(0, Math.min(height - 1, y));
    return heightmap[cy * width + cx];
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;

      if (heightmap[idx] === 0) {
        nx[idx] = 0;
        ny[idx] = 0;
        nz[idx] = 1;
        continue;
      }

      const z00 = getH(x - 1, y - 1);
      const z01 = getH(x - 1, y);
      const z02 = getH(x - 1, y + 1);
      const z20 = getH(x + 1, y - 1);
      const z21 = getH(x + 1, y);
      const z22 = getH(x + 1, y + 1);

      const z10 = getH(x, y - 1);
      const z12 = getH(x, y + 1);

      const dzdx = (z20 + 2 * z21 + z22 - (z00 + 2 * z01 + z02)) / 8;
      const dzdy = (z02 + 2 * z12 + z22 - (z00 + 2 * z10 + z20)) / 8;

      const vx = -dzdx * strength;
      const vy = -dzdy * strength;
      const vz = 1.0;

      const len = Math.sqrt(vx * vx + vy * vy + vz * vz) || 1.0;
      nx[idx] = vx / len;
      ny[idx] = vy / len;
      nz[idx] = vz / len;
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

      data[pIdx] = Math.max(0, Math.min(255, r));
      data[pIdx + 1] = Math.max(0, Math.min(255, g));
      data[pIdx + 2] = Math.max(0, Math.min(255, b));
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
  height: number
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

      const up = getH(x, y - 1);
      const down = getH(x, y + 1);
      const left = getH(x - 1, y);
      const right = getH(x + 1, y);

      const laplacian = (up + down + left + right) - 4 * center;
      // Cavity occurs where curvature is concave (valleys/crevices)
      const concaveCurvature = Math.max(0, -laplacian);
      cavity[idx] = Math.max(0.0, Math.min(1.0, 1.0 - concaveCurvature * 2.0));
    }
  }

  return cavity;
}
