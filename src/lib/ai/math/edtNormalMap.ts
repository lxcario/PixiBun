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
