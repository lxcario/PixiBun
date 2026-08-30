/**
 * PixiBud Smart Math & Computer Graphics Engine
 * High-performance, mathematically rigorous algorithms for pro pixel art design:
 * 1. Linear-Time O(N) 2D Euclidean Distance Transform (Felzenszwalb-Huttenlocher algorithm)
 * 2. Non-linear Dome Profile Inflation & Edge-Preserving Bilateral Filter
 * 3. Discrete Sobel Gradient Fields & Tangent Space Unit Normal Generation
 * 4. Normal Map Texture Baker (Standard Tangent Space RGB 128, 128, 255)
 * 5. Discrete Laplace Cavity Map / Ambient Occlusion (AO)
 * 6. Photometric Lighting Pipeline (Lambert + Blinn-Phong Specular Half-Vector + Distance Attenuation)
 * 7. Physical Material Presets (Matte, Metal, Glass/Dielectric, Fabric, Gold)
 * 8. OKLab Perceptual Color Matching & Bayer Matrix Ordered Dithering Modulation
 * 9. RotSprite 8x Scale2X Distortion-Free Rotation
 * 10. 47-Tile Blob Autotiling Bitmask Algorithm
 * 11. Rational Bézier Curves & Wu's Quantized Lines
 * 12. Zhang-Suen Morphological Skeleton Line Thinning
 */

import { MaterialType, MaterialProperties, PhotometricLightingParams, VolumetricOpticsParams, OpticalPresetType, AnisoFlowPreset } from '@/types/tools';
import { hexToRgba, rgbaToHex } from '@/lib/canvas/floodFill';
import { generateOklchRamp } from '@/lib/color/rampGenerator';
import {
  acquireFloat32Buffer,
  releaseFloat32Buffer,
  acquireInt32Buffer,
  releaseInt32Buffer,
} from '@/lib/engine/bufferPool';

export interface Point {
  x: number;
  y: number;
}

export interface ShadedPixel {
  x: number;
  y: number;
  r: number;
  g: number;
  b: number;
  a: number;
}

// -----------------------------------------------------------------------------
// Material Properties Definitions
// -----------------------------------------------------------------------------

export const MATERIAL_PROFILES: Record<MaterialType, MaterialProperties> = {
  matte: {
    kd: 1.0,
    ks: 0.08,
    shininess: 8,
    isMetallic: false,
    isDielectric: false,
    hasRim: false,
  },
  metal: {
    kd: 0.45,
    ks: 1.35,
    shininess: 32,
    isMetallic: true,
    isDielectric: false,
    hasRim: false,
  },
  glass: {
    kd: 0.2,
    ks: 1.8,
    shininess: 64,
    isMetallic: false,
    isDielectric: true,
    hasRim: true,
  },
  fabric: {
    kd: 1.15,
    ks: 0.05,
    shininess: 4,
    isMetallic: false,
    isDielectric: false,
    hasRim: true,
  },
  gold: {
    kd: 0.55,
    ks: 1.5,
    shininess: 28,
    isMetallic: true,
    isDielectric: false,
    hasRim: false,
  },
};

// -----------------------------------------------------------------------------
// 1. Linear-Time O(N) 2D Euclidean Distance Transform (Felzenszwalb-Huttenlocher)
// -----------------------------------------------------------------------------

/**
 * Computes the 1D squared distance transform of an array in O(N) time using lower parabolic envelopes.
 */
function dt1D(f: Float32Array, n: number, dOut?: Float32Array, vScratch?: Int32Array, zScratch?: Float32Array): Float32Array {
  const d = dOut || new Float32Array(n);
  const v = vScratch || acquireInt32Buffer(n);
  const z = zScratch || acquireFloat32Buffer(n + 1);
  let k = 0;
  v[0] = 0;
  z[0] = -Infinity;
  z[1] = Infinity;

  for (let q = 1; q < n; q++) {
    let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) {
      k--;
      s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = Infinity;
  }

  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) {
      k++;
    }
    d[q] = (q - v[k]) * (q - v[k]) + f[v[k]];
  }

  if (!vScratch) releaseInt32Buffer(v);
  if (!zScratch) releaseFloat32Buffer(z);

  return d;
}

/**
 * Computes exact 2D Euclidean Distance Transform (EDT) in O(width * height) linear time.
 */
export function computeSeparableEDT(
  isOpaque: (x: number, y: number) => boolean,
  width: number,
  height: number
): Float32Array {
  const INF = 1e9;
  const grid = acquireFloat32Buffer(width * height);

  // Initialize: 0 for transparent boundary, INF for opaque interior
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      grid[y * width + x] = isOpaque(x, y) ? INF : 0;
    }
  }

  // Pre-allocate scratch buffers for 1D transforms along columns and rows
  const maxDim = Math.max(width, height);
  const fScratch = acquireFloat32Buffer(maxDim);
  const dScratch = acquireFloat32Buffer(maxDim);
  const vScratch = acquireInt32Buffer(maxDim);
  const zScratch = acquireFloat32Buffer(maxDim + 1);

  try {
    // 1. Transform along columns
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        fScratch[y] = grid[y * width + x];
      }
      dt1D(fScratch, height, dScratch, vScratch, zScratch);
      for (let y = 0; y < height; y++) {
        grid[y * width + x] = dScratch[y];
      }
    }

    // 2. Transform along rows
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
    releaseFloat32Buffer(grid);
    releaseFloat32Buffer(fScratch);
    releaseFloat32Buffer(dScratch);
    releaseInt32Buffer(vScratch);
    releaseFloat32Buffer(zScratch);
  }
}

// -----------------------------------------------------------------------------
// 2. Non-Linear Height Profile Inflation & Bilateral Filter
// -----------------------------------------------------------------------------

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
      // Non-linear curvature
      heightmap[i] = maxD * Math.pow(normalizedD, gamma);
    }
  }

  return heightmap;
}

/**
 * Edge-preserving Bilateral Filter on the height field.
 */
export function applyBilateralFilter(
  heightmap: Float32Array,
  width: number,
  height: number,
  sigmaS: number = 1.5,
  sigmaR: number = 2.0
): Float32Array {
  const result = new Float32Array(width * height);
  const radius = Math.ceil(sigmaS * 2);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const centerH = heightmap[y * width + x];
      if (centerH <= 0) continue;

      let sum = 0;
      let totalWeight = 0;

      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;

          const neighborH = heightmap[ny * width + nx];
          if (neighborH <= 0) continue;

          const spatialDistSq = dx * dx + dy * dy;
          const rangeDistSq = (centerH - neighborH) * (centerH - neighborH);

          const w = Math.exp(-spatialDistSq / (2 * sigmaS * sigmaS)) * Math.exp(-rangeDistSq / (2 * sigmaR * sigmaR));
          sum += neighborH * w;
          totalWeight += w;
        }
      }

      result[y * width + x] = totalWeight > 0 ? sum / totalWeight : centerH;
    }
  }

  return result;
}

// -----------------------------------------------------------------------------
// 3. Discrete Sobel Gradient Fields & Tangent Space Normal Map
// -----------------------------------------------------------------------------

export interface NormalVectorField {
  nx: Float32Array;
  ny: Float32Array;
  nz: Float32Array;
  sky?: Float32Array;
  material?: Uint8Array; // 0 = skin (base layer), 1 = fabric (overlay clothing), 2 = eye protection
}

/**
 * Evaluates Sobel-Feldman kernels to derive partial derivatives and tangent-space unit normals.
 */
export function computeTangentNormalField(
  heightmap: Float32Array,
  width: number,
  height: number,
  depthScale: number = 1.8
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

  return { nx, ny, nz };
}

/**
 * Encodes Tangent Space Normal Vector Field into an RGBA HTMLCanvasElement texture (128, 128, 255).
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

// -----------------------------------------------------------------------------
// 4. Discrete Laplace Cavity Map / Ambient Occlusion (AO)
// -----------------------------------------------------------------------------

/**
 * Calculates surface crevices and cavity occlusion using discrete Laplace convolution kernel.
 */
export function computeDiscreteLaplaceCavity(
  heightmap: Float32Array,
  width: number,
  height: number,
  cavityStrength: number = 1.0
): Float32Array {
  const ao = new Float32Array(width * height);

  const getH = (x: number, y: number) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return 0;
    return heightmap[y * width + x];
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (heightmap[idx] <= 0) {
        ao[idx] = 1.0;
        continue;
      }

      // Discrete Laplace operator: d^2H/dx^2 + d^2H/dy^2
      const laplace =
        getH(x, y - 1) +
        getH(x - 1, y) - 4 * getH(x, y) + getH(x + 1, y) +
        getH(x, y + 1);

      // Cavity occurs when Laplace curvature is negative (crevices and sharp concave joints)
      const concaveCurvature = Math.max(0, -laplace);
      ao[idx] = Math.max(0.0, Math.min(1.0, 1.0 - cavityStrength * (concaveCurvature / 4.0)));
    }
  }

  return ao;
}

// -----------------------------------------------------------------------------
// 5. OKLab Perceptual Color Science
// -----------------------------------------------------------------------------

export interface OKLabColor {
  L: number;
  a: number;
  b: number;
}

/**
 * Converts sRGB [0..255] to Linear sRGB [0..1].
 */
function srgbToLinear(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

/**
 * Converts Linear sRGB [0..1] to sRGB [0..255].
 */
export function linearToSrgb(v: number): number {
  const c = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1.0 / 2.4) - 0.055;
  return Math.round(Math.max(0, Math.min(255, c * 255)));
}

/**
 * Converts RGB [0..255] to OKLab perceptual color space.
 */
export function rgbToOKLab(r: number, g: number, b: number): OKLabColor {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);

  const l_ = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m_ = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s_ = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);

  return {
    L: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  };
}

/**
 * Converts OKLab color space back to RGB [0..255].
 */
export function okLabToRGB(L: number, a: number, b: number): { r: number; g: number; b: number } {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  const lr = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const lg = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const lb = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

  return {
    r: linearToSrgb(lr),
    g: linearToSrgb(lg),
    b: linearToSrgb(lb),
  };
}

/**
 * Computes Delta E distance in OKLab color space.
 */
export function deltaEOKLab(c1: OKLabColor, c2: OKLabColor): number {
  const dL = c1.L - c2.L;
  const da = c1.a - c2.a;
  const db = c1.b - c2.b;
  return Math.sqrt(dL * dL + da * da + db * db);
}

// -----------------------------------------------------------------------------
// 6. Bayer Matrix Dither Threshold Generator
// -----------------------------------------------------------------------------

export function getBayerMatrixThreshold(x: number, y: number, size: '2x2' | '4x4' | '8x8'): number {
  if (size === '2x2') {
    const M2 = [
      [0, 2],
      [3, 1],
    ];
    return (M2[y % 2][x % 2] + 0.5) / 4.0;
  } else if (size === '4x4') {
    const M4 = [
      [ 0,  8,  2, 10],
      [12,  4, 14,  6],
      [ 3, 11,  1,  9],
      [15,  7, 13,  5],
    ];
    return (M4[y % 4][x % 4] + 0.5) / 16.0;
  } else {
    const M8 = [
      [ 0, 32,  8, 40,  2, 34, 10, 42],
      [48, 16, 56, 24, 50, 18, 58, 26],
      [12, 44,  4, 36, 14, 46,  6, 38],
      [60, 28, 52, 20, 62, 30, 54, 22],
      [ 3, 35, 11, 43,  1, 33,  9, 41],
      [51, 19, 59, 27, 49, 17, 57, 25],
      [15, 47,  7, 39, 13, 45,  5, 37],
      [63, 31, 55, 23, 61, 29, 53, 21],
    ];
    return (M8[y % 8][x % 8] + 0.5) / 64.0;
  }
}

/**
 * Detects if the current canvas image corresponds to a standard Minecraft skin (64x64 or 64x32).
 */
export function detectMinecraftSkin(
  isOpaque: (x: number, y: number) => boolean,
  width: number,
  height: number
): boolean {
  if (width !== 64 || (height !== 64 && height !== 32)) return false;

  const voidZones = [
    { x: 0, y: 0, w: 8, h: 8 },
    { x: 24, y: 0, w: 8, h: 8 },
    { x: 32, y: 0, w: 8, h: 8 },
    { x: 56, y: 0, w: 8, h: 8 },
    { x: 0, y: 16, w: 4, h: 4 },
    { x: 12, y: 16, w: 4, h: 4 },
    { x: 36, y: 16, w: 4, h: 4 },
    { x: 56, y: 16, w: 8, h: 4 },
  ];

  let voidPixels = 0;
  let voidOpaque = 0;
  for (const z of voidZones) {
    if (z.y + z.h <= height) {
      for (let py = z.y; py < z.y + z.h; py++) {
        for (let px = z.x; px < z.x + z.w; px++) {
          voidPixels++;
          if (isOpaque(px, py)) voidOpaque++;
        }
      }
    }
  }

  let headPixels = 0;
  for (let py = 8; py < 16; py++) {
    for (let px = 8; px < 16; px++) {
      if (isOpaque(px, py)) headPixels++;
    }
  }

  return (voidOpaque / (voidPixels || 1) < 0.25) && (headPixels >= 16);
}

/**
 * Computes physically accurate 3D cuboid face normals for Minecraft skins.
 */
export function computeMinecraftSkinNormalField(
  width: number,
  height: number
): NormalVectorField {
  const nx = new Float32Array(width * height);
  const ny = new Float32Array(width * height);
  const nz = new Float32Array(width * height);
  const sky = new Float32Array(width * height);
  const material = new Uint8Array(width * height); // 0 = skin (base), 1 = fabric (overlay), 2 = eye protection

  for (let i = 0; i < width * height; i++) {
    nz[i] = 1.0;
    sky[i] = 1.0;
    material[i] = 0;
  }

  const paintFace = (
    fx: number,
    fy: number,
    fw: number,
    fh: number,
    baseNorm: [number, number, number],
    leftNeighborNorm: [number, number, number] = baseNorm,
    rightNeighborNorm: [number, number, number] = baseNorm,
    faceType: 'UP' | 'DOWN' | 'SIDE' = 'SIDE',
    bodyPart: 'head' | 'torso' | 'arm' | 'leg' = 'torso',
    layer: 'base' | 'overlay' = 'base'
  ) => {
    if (fx + fw > width || fy + fh > height) return;

    for (let py = fy; py < fy + fh; py++) {
      for (let px = fx; px < fx + fw; px++) {
        const idx = py * width + px;
        let [bx, by, bz] = baseNorm;

        // 1px narrow boundary linear interpolation to remove harsh barcode/step transitions
        if (fw > 1) {
          if (px === fx) {
            // Left border column: blend 75% base + 25% left neighbor
            bx = bx * 0.75 + leftNeighborNorm[0] * 0.25;
            by = by * 0.75 + leftNeighborNorm[1] * 0.25;
            bz = bz * 0.75 + leftNeighborNorm[2] * 0.25;
          } else if (px === fx + fw - 1) {
            // Right border column: blend 75% base + 25% right neighbor
            bx = bx * 0.75 + rightNeighborNorm[0] * 0.25;
            by = by * 0.75 + rightNeighborNorm[1] * 0.25;
            bz = bz * 0.75 + rightNeighborNorm[2] * 0.25;
          }
        }

        const len = Math.sqrt(bx * bx + by * by + bz * bz) || 1;
        nx[idx] = bx / len;
        ny[idx] = by / len;
        nz[idx] = bz / len;

        // Material assignment
        if (layer === 'overlay') {
          material[idx] = 1; // Fabric / Clothing overlay
        } else {
          // Base layer: check if this is the Head Front Eye region (x: 8..15, y: 12..14)
          if (bodyPart === 'head' && fx === 8 && fy === 8 && py >= 12 && py <= 14) {
            material[idx] = 2; // Eye row
          } else {
            material[idx] = 0; // Skin / Organic base
          }
        }

        // Sky factor
        if (faceType === 'UP') {
          sky[idx] = 1.08;
        } else if (faceType === 'DOWN') {
          sky[idx] = 0.80;
        } else {
          sky[idx] = 1.0; // Flat neutral sky (no vertical 1D gradient lines)
        }
      }
    }
  };

  const UP: [number, number, number] = [0, -0.60, 0.80];
  const DOWN: [number, number, number] = [0, 0.60, 0.80];
  const LEFT: [number, number, number] = [0.60, 0, 0.80];
  const RIGHT: [number, number, number] = [-0.60, 0, 0.80];
  const FRONT: [number, number, number] = [0, 0, 1.0];
  const BACK: [number, number, number] = [0, 0, 0.65];

  // Head (0, 0, 32, 16) - Base Layer
  paintFace(8, 0, 8, 8, UP, UP, UP, 'UP', 'head', 'base');
  paintFace(16, 0, 8, 8, DOWN, DOWN, DOWN, 'DOWN', 'head', 'base');
  paintFace(0, 8, 8, 8, RIGHT, BACK, FRONT, 'SIDE', 'head', 'base');
  paintFace(8, 8, 8, 8, FRONT, RIGHT, LEFT, 'SIDE', 'head', 'base');
  paintFace(16, 8, 8, 8, LEFT, FRONT, BACK, 'SIDE', 'head', 'base');
  paintFace(24, 8, 8, 8, BACK, LEFT, RIGHT, 'SIDE', 'head', 'base');

  // Hat Layer 2 (32, 0, 32, 16) - Overlay Layer (Clothing/Hair)
  paintFace(40, 0, 8, 8, UP, UP, UP, 'UP', 'head', 'overlay');
  paintFace(48, 0, 8, 8, DOWN, DOWN, DOWN, 'DOWN', 'head', 'overlay');
  paintFace(32, 8, 8, 8, RIGHT, BACK, FRONT, 'SIDE', 'head', 'overlay');
  paintFace(40, 8, 8, 8, FRONT, RIGHT, LEFT, 'SIDE', 'head', 'overlay');
  paintFace(48, 8, 8, 8, LEFT, FRONT, BACK, 'SIDE', 'head', 'overlay');
  paintFace(56, 8, 8, 8, BACK, LEFT, RIGHT, 'SIDE', 'head', 'overlay');

  // Body / Torso (16, 16, 24, 16) - Base Layer
  paintFace(20, 16, 8, 4, UP, UP, UP, 'UP', 'torso', 'base');
  paintFace(28, 16, 8, 4, DOWN, DOWN, DOWN, 'DOWN', 'torso', 'base');
  paintFace(16, 20, 4, 12, RIGHT, BACK, FRONT, 'SIDE', 'torso', 'base');
  paintFace(20, 20, 8, 12, FRONT, RIGHT, LEFT, 'SIDE', 'torso', 'base');
  paintFace(28, 20, 4, 12, LEFT, FRONT, BACK, 'SIDE', 'torso', 'base');
  paintFace(32, 20, 8, 12, BACK, LEFT, RIGHT, 'SIDE', 'torso', 'base');

  // Right Arm (40, 16, 16, 16) - Base Layer
  paintFace(44, 16, 4, 4, UP, UP, UP, 'UP', 'arm', 'base');
  paintFace(48, 16, 4, 4, DOWN, DOWN, DOWN, 'DOWN', 'arm', 'base');
  paintFace(40, 20, 4, 12, RIGHT, BACK, FRONT, 'SIDE', 'arm', 'base');
  paintFace(44, 20, 4, 12, FRONT, RIGHT, LEFT, 'SIDE', 'arm', 'base');
  paintFace(48, 20, 4, 12, LEFT, FRONT, BACK, 'SIDE', 'arm', 'base');
  paintFace(52, 20, 4, 12, BACK, LEFT, RIGHT, 'SIDE', 'arm', 'base');

  // Right Leg (0, 16, 16, 16) - Base Layer
  paintFace(4, 16, 4, 4, UP, UP, UP, 'UP', 'leg', 'base');
  paintFace(8, 16, 4, 4, DOWN, DOWN, DOWN, 'DOWN', 'leg', 'base');
  paintFace(0, 20, 4, 12, RIGHT, BACK, FRONT, 'SIDE', 'leg', 'base');
  paintFace(4, 20, 4, 12, FRONT, RIGHT, LEFT, 'SIDE', 'leg', 'base');
  paintFace(8, 20, 4, 12, LEFT, FRONT, BACK, 'SIDE', 'leg', 'base');
  paintFace(12, 20, 4, 12, BACK, LEFT, RIGHT, 'SIDE', 'leg', 'base');

  if (height >= 64) {
    // Left Leg Base (16, 48, 16, 16) - Base Layer
    paintFace(20, 48, 4, 4, UP, UP, UP, 'UP', 'leg', 'base');
    paintFace(24, 48, 4, 4, DOWN, DOWN, DOWN, 'DOWN', 'leg', 'base');
    paintFace(16, 52, 4, 12, RIGHT, BACK, FRONT, 'SIDE', 'leg', 'base');
    paintFace(20, 52, 4, 12, FRONT, RIGHT, LEFT, 'SIDE', 'leg', 'base');
    paintFace(24, 52, 4, 12, LEFT, FRONT, BACK, 'SIDE', 'leg', 'base');
    paintFace(28, 52, 4, 12, BACK, LEFT, RIGHT, 'SIDE', 'leg', 'base');

    // Left Arm Base (32, 48, 16, 16) - Base Layer
    paintFace(36, 48, 4, 4, UP, UP, UP, 'UP', 'arm', 'base');
    paintFace(40, 48, 4, 4, DOWN, DOWN, DOWN, 'DOWN', 'arm', 'base');
    paintFace(32, 52, 4, 12, RIGHT, BACK, FRONT, 'SIDE', 'arm', 'base');
    paintFace(36, 52, 4, 12, FRONT, RIGHT, LEFT, 'SIDE', 'arm', 'base');
    paintFace(40, 52, 4, 12, LEFT, FRONT, BACK, 'SIDE', 'arm', 'base');
    paintFace(44, 52, 4, 12, BACK, LEFT, RIGHT, 'SIDE', 'arm', 'base');

    // Jacket Layer 2 (16, 32, 24, 16) - Overlay Layer (Clothing)
    paintFace(20, 32, 8, 4, UP, UP, UP, 'UP', 'torso', 'overlay');
    paintFace(28, 32, 8, 4, DOWN, DOWN, DOWN, 'DOWN', 'torso', 'overlay');
    paintFace(16, 36, 4, 12, RIGHT, BACK, FRONT, 'SIDE', 'torso', 'overlay');
    paintFace(20, 36, 8, 12, FRONT, RIGHT, LEFT, 'SIDE', 'torso', 'overlay');
    paintFace(28, 36, 4, 12, LEFT, FRONT, BACK, 'SIDE', 'torso', 'overlay');
    paintFace(32, 36, 8, 12, BACK, LEFT, RIGHT, 'SIDE', 'torso', 'overlay');

    // Right Sleeve Layer 2 (40, 32, 16, 16) - Overlay Layer (Clothing)
    paintFace(44, 32, 4, 4, UP, UP, UP, 'UP', 'arm', 'overlay');
    paintFace(48, 32, 4, 4, DOWN, DOWN, DOWN, 'DOWN', 'arm', 'overlay');
    paintFace(40, 36, 4, 12, RIGHT, BACK, FRONT, 'SIDE', 'arm', 'overlay');
    paintFace(44, 36, 4, 12, FRONT, RIGHT, LEFT, 'SIDE', 'arm', 'overlay');
    paintFace(48, 36, 4, 12, LEFT, FRONT, BACK, 'SIDE', 'arm', 'overlay');
    paintFace(52, 36, 4, 12, BACK, LEFT, RIGHT, 'SIDE', 'arm', 'overlay');

    // Right Pants Layer 2 (0, 32, 16, 16) - Overlay Layer (Clothing)
    paintFace(4, 32, 4, 4, UP, UP, UP, 'UP', 'leg', 'overlay');
    paintFace(8, 32, 4, 4, DOWN, DOWN, DOWN, 'DOWN', 'leg', 'overlay');
    paintFace(0, 36, 4, 12, RIGHT, BACK, FRONT, 'SIDE', 'leg', 'overlay');
    paintFace(4, 36, 4, 12, FRONT, RIGHT, LEFT, 'SIDE', 'leg', 'overlay');
    paintFace(8, 36, 4, 12, LEFT, FRONT, BACK, 'SIDE', 'leg', 'overlay');
    paintFace(12, 36, 4, 12, BACK, LEFT, RIGHT, 'SIDE', 'leg', 'overlay');

    // Left Pants Layer 2 (0, 48, 16, 16) - Overlay Layer (Clothing)
    paintFace(4, 48, 4, 4, UP, UP, UP, 'UP', 'leg', 'overlay');
    paintFace(8, 48, 4, 4, DOWN, DOWN, DOWN, 'DOWN', 'leg', 'overlay');
    paintFace(0, 52, 4, 12, RIGHT, BACK, FRONT, 'SIDE', 'leg', 'overlay');
    paintFace(4, 52, 4, 12, FRONT, RIGHT, LEFT, 'SIDE', 'leg', 'overlay');
    paintFace(8, 52, 4, 12, LEFT, FRONT, BACK, 'SIDE', 'leg', 'overlay');
    paintFace(12, 52, 4, 12, BACK, LEFT, RIGHT, 'SIDE', 'leg', 'overlay');

    // Left Sleeve Layer 2 (48, 48, 16, 16) - Overlay Layer (Clothing)
    paintFace(52, 48, 4, 4, UP, UP, UP, 'UP', 'arm', 'overlay');
    paintFace(56, 48, 4, 4, DOWN, DOWN, DOWN, 'DOWN', 'arm', 'overlay');
    paintFace(48, 52, 4, 12, RIGHT, BACK, FRONT, 'SIDE', 'arm', 'overlay');
    paintFace(52, 52, 4, 12, FRONT, RIGHT, LEFT, 'SIDE', 'arm', 'overlay');
    paintFace(56, 52, 4, 12, LEFT, FRONT, BACK, 'SIDE', 'arm', 'overlay');
    paintFace(60, 52, 4, 12, BACK, LEFT, RIGHT, 'SIDE', 'arm', 'overlay');
  }

  return { nx, ny, nz, sky, material };
}

/**
 * Professional Minecraft Skin Photometric Shading Engine:
 * Domain-specific algorithms used by top-tier PlanetMinecraft & Skindex artists:
 * 1. Warm Golden Hour Sun Highlights (shifted toward ~65° amber/yellow)
 * 2. Cool Atmospheric Indigo Shadows (shifted toward ~260° violet/blue, never muddy gray)
 * 3. Anatomical Contact Ambient Occlusion (under chin, neck seam, armpits, inner limbs)
 * 4. Sky Hemisphere Micro-Gradients (top of head/shoulders lighting falloff)
 * 5. Overlay Hat / Jacket / Sleeve subtle depth contact shading
 * 6. 100% Non-Destructive Modulation in OKLCH (preserves all texture details & eye colors)
 */
export function executeMinecraftSkinShadingPipeline(
  srcCtx: CanvasRenderingContext2D,
  width: number,
  height: number,
  params: PhotometricLightingParams
): HTMLCanvasElement {
  const imgData = srcCtx.getImageData(0, 0, width, height);
  const data = imgData.data;

  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = width;
  outputCanvas.height = height;
  const outCtx = outputCanvas.getContext('2d')!;
  const outImgData = outCtx.createImageData(width, height);
  const outData = outImgData.data;

  const isOpaque = (x: number, y: number) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return false;
    return data[(y * width + x) * 4 + 3] > 30;
  };

  const normalField = computeMinecraftSkinNormalField(width, height);

  const azRad = (params.lightAzimuth * Math.PI) / 180;
  const elRad = (Math.max(15, params.lightElevation) * Math.PI) / 180;

  const Lx = Math.sin(azRad) * Math.cos(elRad);
  const Ly = -Math.cos(azRad) * Math.cos(elRad);
  const Lz = Math.sin(elRad);

  const brightness = params.lightBrightness ?? 1.15;
  const cavityStr = params.cavityStrength ?? 1.0;

  // Pre-calculate anatomical contact ambient occlusion map
  const aoMap = new Float32Array(width * height).fill(1.0);

  const applyContactAO = (x: number, y: number, w: number, h: number, aoFactor: number) => {
    for (let py = y; py < y + h && py < height; py++) {
      for (let px = x; px < x + w && px < width; px++) {
        if (px >= 0 && py >= 0) {
          aoMap[py * width + px] = Math.min(aoMap[py * width + px], aoFactor);
        }
      }
    }
  };

  // 1. Head Under-Neck Occlusion (Bottom face of head)
  applyContactAO(16, 0, 8, 8, 0.85);

  // 2. Overlap Layer (Hat, Jacket, Sleeve, Pants) subtle shadow on base layer
  const applyOverlapShadow = (ox: number, oy: number, w: number, h: number, bx: number, by: number) => {
    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        if (isOpaque(ox + px, oy + py) && isOpaque(bx + px, by + py)) {
          aoMap[(by + py) * width + (bx + px)] *= 0.90;
        }
      }
    }
  };

  // Hat shadow on head
  applyOverlapShadow(32, 0, 32, 16, 0, 0);
  // Jacket shadow on torso
  if (height >= 64) {
    applyOverlapShadow(16, 32, 24, 16, 16, 16);
    applyOverlapShadow(40, 32, 16, 16, 40, 16); // Right sleeve
    applyOverlapShadow(0, 32, 16, 16, 0, 16);   // Right pants
    applyOverlapShadow(0, 48, 16, 16, 16, 48);  // Left pants
    applyOverlapShadow(48, 48, 16, 16, 32, 48); // Left sleeve
  }

  // Shift hue helper in degrees
  const shiftHue = (currentH: number, targetH: number, maxShiftDeg: number): number => {
    let diff = (targetH - currentH + 360) % 360;
    if (diff > 180) diff -= 360;
    const shift = Math.sign(diff) * Math.min(Math.abs(diff), maxShiftDeg);
    return (currentH + shift + 360) % 360;
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const pIdx = idx * 4;

      if (!isOpaque(x, y)) {
        outData[pIdx + 3] = 0;
        continue;
      }

      const origR = data[pIdx];
      const origG = data[pIdx + 1];
      const origB = data[pIdx + 2];

      const lab = rgbToOKLab(origR, origG, origB);
      const C = Math.sqrt(lab.a * lab.a + lab.b * lab.b);
      let H = (Math.atan2(lab.b, lab.a) * 180) / Math.PI;
      if (H < 0) H += 360;
      const L = lab.L;

      // Normal vector of cuboid face
      const Nx = normalField.nx[idx];
      const Ny = normalField.ny[idx];
      const Nz = normalField.nz[idx];

      // 1. Half-Lambert Directional Shading
      const NdotL = Nx * Lx + Ny * Ly + Nz * Lz;
      const directionalFactor = Math.pow(Math.max(0, (NdotL + 0.5) / 1.5), 1.15);

      // 2. Anatomical Ambient Occlusion
      const ao = 1.0 - (1.0 - aoMap[idx]) * cavityStr;

      // 3. Anatomical Sky Lighting (Calculated per UV island based on 3D face orientation)
      const skyFactor = normalField.sky ? normalField.sky[idx] : 1.0;

      // Total continuous lighting multiplier
      const totalFactor = directionalFactor * ao * skyFactor * (brightness * 0.95);

      let newL: number;
      let newC: number;
      let newH: number;

      const matType = normalField.material ? normalField.material[idx] : 0;

      if (matType === 2) {
        // --- 1. EYE PROTECTION (Head Front Eye Row) ---
        // Sclera, pupils and irises receive minimal lighting modulation to stay crisp without being washed out
        const eyeFactor = 1.0 + (totalFactor - 1.0) * 0.10;
        newH = H;
        newL = Math.max(0.05, Math.min(0.99, L + (eyeFactor - 1.0) * 0.08));
        newC = C;
      } else if (matType === 1) {
        // --- 2. FABRIC / CLOTHING OVERLAY (Hat, Jacket, Sleeves, Pants) ---
        // Low specular, soft/broad transitions, reduced contrast: white shirts stay crisp white, patterns stay clear
        if (totalFactor >= 1.0) {
          const intensity = Math.min(1.0, (totalFactor - 1.0) * 0.70);
          newH = shiftHue(H, 65, intensity * 8);
          newL = Math.min(0.99, L + intensity * (0.99 - L) * 0.20);
          newC = Math.min(0.35, C * (1.0 + intensity * 0.04));
        } else {
          const intensity = Math.min(1.0, (1.0 - totalFactor) * 0.75);
          newH = shiftHue(H, 260, intensity * 10);
          newL = Math.max(0.20, L - intensity * L * 0.22);
          newC = Math.min(0.35, C * (1.0 + intensity * 0.06));
        }
      } else {
        // --- 3. SKIN / ORGANIC BASE LAYER ---
        // Rich organic hue shifting with warm sunlight highlights and cool violet shadows
        if (totalFactor >= 1.0) {
          const intensity = Math.min(1.0, (totalFactor - 1.0) * 1.4);
          newH = shiftHue(H, 65, intensity * 26);
          newL = Math.min(0.98, L + intensity * (0.98 - L) * 0.48);
          newC = Math.min(0.35, C * (1.0 + intensity * 0.15));
        } else {
          const intensity = Math.min(1.0, (1.0 - totalFactor) * 1.5);
          newH = shiftHue(H, 260, intensity * 24);
          newL = Math.max(0.12, L - intensity * L * 0.42);
          newC = Math.min(0.35, C * (1.0 + intensity * 0.20));
        }
      }

      const hRad = (newH * Math.PI) / 180;
      const targetA = newC * Math.cos(hRad);
      const targetB = newC * Math.sin(hRad);
      const rgb = okLabToRGB(newL, targetA, targetB);

      outData[pIdx] = rgb.r;
      outData[pIdx + 1] = rgb.g;
      outData[pIdx + 2] = rgb.b;
      outData[pIdx + 3] = data[pIdx + 3];
    }
  }

  outCtx.putImageData(outImgData, 0, 0);
  return outputCanvas;
}

// -----------------------------------------------------------------------------
// 7. Full Photometric Lighting Pipeline
// -----------------------------------------------------------------------------

/**
 * Renders complete physical 2.5D lighting model:
 * - Half-Lambertian Diffuse with Wrap Lighting (prevents dark muddy crush)
 * - Blinn-Phong Specular (Half-Vector H)
 * - 3D Minecraft Skin Geometry Recognition
 * - Discrete Laplace Cavity AO
 * - OKLab Perceptual Quantization + Bayer Matrix Dither Modulation
 */
export function executePhotometricPipeline(
  srcCtx: CanvasRenderingContext2D,
  width: number,
  height: number,
  params: PhotometricLightingParams,
  paletteHex: string[]
): HTMLCanvasElement {
  const imgData = srcCtx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // 1. Compute binary mask
  const isOpaque = (x: number, y: number) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return false;
    return data[(y * width + x) * 4 + 3] > 30;
  };

  const isMcSkin = detectMinecraftSkin(isOpaque, width, height);

  // If this is a Minecraft Skin, use the dedicated professional skin shading engine!
  if (isMcSkin) {
    return executeMinecraftSkinShadingPipeline(srcCtx, width, height, params);
  }

  // 2. Standard 2.5D Sprite Photometric Normal Vector Field & Cavity AO
  const distanceMap = computeSeparableEDT(isOpaque, width, height);
  const rawHeightmap = generateInflatedHeightmap(distanceMap, width, height, 0.5);
  const smoothHeightmap = applyBilateralFilter(rawHeightmap, width, height, 1.5, 2.0);
  const normalField = computeTangentNormalField(smoothHeightmap, width, height, 2.0);
  const cavityAO = computeDiscreteLaplaceCavity(smoothHeightmap, width, height, params.cavityStrength);

  // 3. Material & Lighting Parameters
  const mat = MATERIAL_PROFILES[params.material] || MATERIAL_PROFILES.matte;
  const brightness = params.lightBrightness ?? 1.15;

  const azRad = (params.lightAzimuth * Math.PI) / 180;
  const elRad = (Math.max(10, params.lightElevation) * Math.PI) / 180;

  const Lx = Math.sin(azRad) * Math.cos(elRad);
  const Ly = -Math.cos(azRad) * Math.cos(elRad);
  const Lz = Math.sin(elRad);

  const Vx = 0;
  const Vy = 0;
  const Vz = 1.0;

  const Hx = Lx + Vx;
  const Hy = Ly + Vy;
  const Hz = Lz + Vz;
  const hLen = Math.sqrt(Hx * Hx + Hy * Hy + Hz * Hz) || 1;
  const normHx = Hx / hLen;
  const normHy = Hy / hLen;
  const normHz = Hz / hLen;

  const lightRgba = hexToRgba(params.lightColor || '#FFFFFF');
  const lightR = lightRgba.r / 255;
  const lightG = lightRgba.g / 255;
  const lightB = lightRgba.b / 255;

  const paletteRgba = paletteHex.map(hexToRgba);
  const paletteOKLab = paletteRgba.map((c) => rgbToOKLab(c.r, c.g, c.b));

  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = width;
  outputCanvas.height = height;
  const outCtx = outputCanvas.getContext('2d')!;
  const outImgData = outCtx.createImageData(width, height);
  const outData = outImgData.data;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const pIdx = idx * 4;

      if (!isOpaque(x, y)) {
        outData[pIdx + 3] = 0;
        continue;
      }

      const origR = data[pIdx] / 255;
      const origG = data[pIdx + 1] / 255;
      const origB = data[pIdx + 2] / 255;

      const Nx = normalField.nx[idx];
      const Ny = normalField.ny[idx];
      const Nz = normalField.nz[idx];

      const ao = cavityAO[idx];

      // 1. Half-Lambert Wrap Lighting (prevents muddy dark black crush)
      const rawNdotL = Nx * Lx + Ny * Ly + Nz * Lz;
      const wrapNdotL = Math.pow(Math.max(0, (rawNdotL + 0.35) / 1.35), 1.25);
      const diffR = mat.kd * wrapNdotL * (origR * lightR);
      const diffG = mat.kd * wrapNdotL * (origG * lightG);
      const diffB = mat.kd * wrapNdotL * (origB * lightB);

      // 2. Blinn-Phong Specular (N . H)^alpha
      const NdotH = Math.max(0, Nx * normHx + Ny * normHy + Nz * normHz);
      const Ispec = mat.ks * Math.pow(NdotH, mat.shininess);

      let specR = Ispec * lightR;
      let specG = Ispec * lightG;
      let specB = Ispec * lightB;

      if (mat.isMetallic) {
        specR *= origR;
        specG *= origG;
        specB *= origB;
      }

      // 3. Ambient
      const effectiveAmbient = Math.max(0.35, params.ambientIntensity) * brightness;
      const ambR = origR * effectiveAmbient * ao;
      const ambG = origG * effectiveAmbient * ao;
      const ambB = origB * effectiveAmbient * ao;

      // 4. Total continuous color: (Ambient + Diffuse * AO + Specular) * brightness
      let totalR = Math.max(0, Math.min(1.0, (ambR + diffR * ao + specR) * (brightness * 0.9)));
      let totalG = Math.max(0, Math.min(1.0, (ambG + diffG * ao + specG) * (brightness * 0.9)));
      let totalB = Math.max(0, Math.min(1.0, (ambB + diffB * ao + specB) * (brightness * 0.9)));

      // 5. Bayer Matrix Dither Modulation
      if (params.ditherModulation > 0) {
        const threshold = getBayerMatrixThreshold(x, y, params.bayerSize);
        const offset = params.ditherModulation * (threshold - 0.5) * 0.25;
        totalR = Math.max(0, Math.min(1.0, totalR + offset));
        totalG = Math.max(0, Math.min(1.0, totalG + offset));
        totalB = Math.max(0, Math.min(1.0, totalB + offset));
      }

      const evalR = Math.round(totalR * 255);
      const evalG = Math.round(totalG * 255);
      const evalB = Math.round(totalB * 255);

      // 6. OKLab Perceptual Quantization to Palette
      if (paletteOKLab.length > 0) {
        const pixelOKLab = rgbToOKLab(evalR, evalG, evalB);
        let closestIdx = 0;
        let minDiff = Infinity;

        for (let k = 0; k < paletteOKLab.length; k++) {
          const diff = deltaEOKLab(pixelOKLab, paletteOKLab[k]);
          if (diff < minDiff) {
            minDiff = diff;
            closestIdx = k;
          }
        }

        const chosen = paletteRgba[closestIdx];
        outData[pIdx] = chosen.r;
        outData[pIdx + 1] = chosen.g;
        outData[pIdx + 2] = chosen.b;
        outData[pIdx + 3] = 255;
      } else {
        outData[pIdx] = evalR;
        outData[pIdx + 1] = evalG;
        outData[pIdx + 2] = evalB;
        outData[pIdx + 3] = 255;
      }
    }
  }

  outCtx.putImageData(outImgData, 0, 0);
  return outputCanvas;
}

// -----------------------------------------------------------------------------
// Legacy & Utility Shading API Adapters
// -----------------------------------------------------------------------------

export interface LightParameters {
  azimuthDeg: number;
  elevationDeg: number;
  shadowIntensity: number;
  specularShininess: number;
  rimLight: boolean;
  selOut: boolean;
}

export function renderParametric2p5DLighting(
  srcCtx: CanvasRenderingContext2D,
  width: number,
  height: number,
  params: LightParameters
): {
  shadedPixels: ShadedPixel[];
  specularPixels: ShadedPixel[];
  rimPixels: ShadedPixel[];
} {
  const imgData = srcCtx.getImageData(0, 0, width, height);
  const data = imgData.data;

  const isOpaque = (x: number, y: number) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return false;
    return data[(y * width + x) * 4 + 3] > 30;
  };

  const isMcSkin = detectMinecraftSkin(isOpaque, width, height);
  const normalField = isMcSkin
    ? computeMinecraftSkinNormalField(width, height)
    : computeTangentNormalField(
        applyBilateralFilter(
          generateInflatedHeightmap(computeSeparableEDT(isOpaque, width, height), width, height, 0.5),
          width,
          height,
          1.5,
          2.0
        ),
        width,
        height,
        2.0
      );

  const azRad = (params.azimuthDeg * Math.PI) / 180;
  const elRad = (Math.max(15, params.elevationDeg) * Math.PI) / 180;

  const Lx = Math.sin(azRad) * Math.cos(elRad);
  const Ly = -Math.cos(azRad) * Math.cos(elRad);
  const Lz = Math.sin(elRad);

  const Vx = 0;
  const Vy = 0;
  const Vz = 1.0;

  const Hx = Lx + Vx;
  const Hy = Ly + Vy;
  const Hz = Lz + Vz;
  const hLen = Math.sqrt(Hx * Hx + Hy * Hy + Hz * Hz) || 1;
  const normHx = Hx / hLen;
  const normHy = Hy / hLen;
  const normHz = Hz / hLen;

  const photometricCanvas = executePhotometricPipeline(
    srcCtx,
    width,
    height,
    {
      lightAzimuth: params.azimuthDeg,
      lightElevation: params.elevationDeg,
      lightRadius: 64,
      lightColor: '#FFFFFF',
      ambientIntensity: 0.45,
      lightBrightness: 1.2,
      material: 'matte',
      cavityStrength: 1.0,
      ditherModulation: 0,
      bayerSize: '4x4',
    },
    []
  );

  const pData = photometricCanvas.getContext('2d')!.getImageData(0, 0, width, height).data;
  const shadedPixels: ShadedPixel[] = [];
  const specularPixels: ShadedPixel[] = [];
  const rimPixels: ShadedPixel[] = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const pIdx = idx * 4;

      if (pData[pIdx + 3] > 30) {
        shadedPixels.push({
          x,
          y,
          r: pData[pIdx],
          g: pData[pIdx + 1],
          b: pData[pIdx + 2],
          a: pData[pIdx + 3],
        });

        const Nx = normalField.nx[idx];
        const Ny = normalField.ny[idx];
        const Nz = normalField.nz[idx];

        const NdotH = Math.max(0, Nx * normHx + Ny * normHy + Nz * normHz);
        const shininess = params.specularShininess || 16;
        const Ispec = Math.pow(NdotH, shininess);

        if (Ispec > 0.35) {
          const alpha = Math.min(255, Math.round(Ispec * 255));
          specularPixels.push({
            x,
            y,
            r: 255,
            g: 255,
            b: 255,
            a: alpha,
          });
        }
      }
    }
  }

  return { shadedPixels, specularPixels, rimPixels };
}

// -----------------------------------------------------------------------------
// 9. RotSprite 8x Scale2X Pixel Art Rotation Engine
// -----------------------------------------------------------------------------

export function rotateWithRotSprite(
  srcCtx: CanvasRenderingContext2D,
  width: number,
  height: number,
  angleDeg: number
): HTMLCanvasElement {
  // 1. Scale 8x via Scale2X (AdvMAME2x three passes)
  let currentCanvas = document.createElement('canvas');
  currentCanvas.width = width;
  currentCanvas.height = height;
  const initCtx = currentCanvas.getContext('2d')!;
  initCtx.imageSmoothingEnabled = false;
  initCtx.drawImage(srcCtx.canvas, 0, 0);

  for (let pass = 0; pass < 3; pass++) {
    currentCanvas = scale2XPass(currentCanvas);
  }

  // 2. High-res 8x rotation around center
  const w8 = width * 8;
  const h8 = height * 8;
  const rotated8xCanvas = document.createElement('canvas');
  rotated8xCanvas.width = w8;
  rotated8xCanvas.height = h8;
  const rotCtx = rotated8xCanvas.getContext('2d')!;
  rotCtx.imageSmoothingEnabled = false;

  const cx8 = w8 / 2;
  const cy8 = h8 / 2;
  const rad = (angleDeg * Math.PI) / 180;

  rotCtx.translate(cx8, cy8);
  rotCtx.rotate(rad);
  rotCtx.translate(-cx8, -cy8);
  rotCtx.drawImage(currentCanvas, 0, 0);

  // 3. Majority-Voting Area Downsampler (64 subpixels per pixel)
  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = width;
  outputCanvas.height = height;
  const outCtx = outputCanvas.getContext('2d')!;
  outCtx.imageSmoothingEnabled = false;

  const rot8Data = rotCtx.getImageData(0, 0, w8, h8).data;
  const outImgData = outCtx.createImageData(width, height);
  const outData = outImgData.data;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const colorCounts = new Map<string, { count: number; r: number; g: number; b: number; a: number }>();
      let opaqueCount = 0;

      for (let sy = 0; sy < 8; sy++) {
        for (let sx = 0; sx < 8; sx++) {
          const subX = x * 8 + sx;
          const subY = y * 8 + sy;
          const sIdx = (subY * w8 + subX) * 4;

          const a = rot8Data[sIdx + 3];
          if (a > 30) {
            opaqueCount++;
            const r = rot8Data[sIdx];
            const g = rot8Data[sIdx + 1];
            const b = rot8Data[sIdx + 2];
            const key = `${r},${g},${b}`;
            const existing = colorCounts.get(key);
            if (existing) {
              existing.count++;
            } else {
              colorCounts.set(key, { count: 1, r, g, b, a });
            }
          }
        }
      }

      const outIdx = (y * width + x) * 4;
      // If at least 35% of the 8x8 block is covered, render the modal color
      if (opaqueCount >= 22) {
        let bestColor = { r: 0, g: 0, b: 0, a: 255 };
        let maxCount = -1;
        for (const entry of colorCounts.values()) {
          if (entry.count > maxCount) {
            maxCount = entry.count;
            bestColor = entry;
          }
        }
        outData[outIdx] = bestColor.r;
        outData[outIdx + 1] = bestColor.g;
        outData[outIdx + 2] = bestColor.b;
        outData[outIdx + 3] = 255;
      } else {
        outData[outIdx + 3] = 0;
      }
    }
  }

  outCtx.putImageData(outImgData, 0, 0);
  return outputCanvas;
}

function scale2XPass(srcCanvas: HTMLCanvasElement): HTMLCanvasElement {
  const w = srcCanvas.width;
  const h = srcCanvas.height;
  const sCtx = srcCanvas.getContext('2d')!;
  const sData = sCtx.getImageData(0, 0, w, h).data;

  const outCanvas = document.createElement('canvas');
  outCanvas.width = w * 2;
  outCanvas.height = h * 2;
  const oCtx = outCanvas.getContext('2d')!;
  const oImgData = oCtx.createImageData(w * 2, h * 2);
  const oData = oImgData.data;

  const getPixel = (x: number, y: number): [number, number, number, number] => {
    const cx = Math.max(0, Math.min(w - 1, x));
    const cy = Math.max(0, Math.min(h - 1, y));
    const idx = (cy * w + cx) * 4;
    return [sData[idx], sData[idx + 1], sData[idx + 2], sData[idx + 3]];
  };

  const same = (p1: [number, number, number, number], p2: [number, number, number, number]): boolean => {
    return p1[0] === p2[0] && p1[1] === p2[1] && p1[2] === p2[2] && p1[3] === p2[3];
  };

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const P = getPixel(x, y);
      const A = getPixel(x - 1, y);
      const B = getPixel(x, y - 1);
      const C = getPixel(x + 1, y);
      const D = getPixel(x, y + 1);

      let E0 = P;
      let E1 = P;
      let E2 = P;
      let E3 = P;

      if (!same(B, D) && !same(A, C)) {
        E0 = same(A, B) ? A : P;
        E1 = same(B, C) ? C : P;
        E2 = same(D, A) ? A : P;
        E3 = same(D, C) ? C : P;
      }

      const setOut = (ox: number, oy: number, p: [number, number, number, number]) => {
        const oIdx = (oy * (w * 2) + ox) * 4;
        oData[oIdx] = p[0];
        oData[oIdx + 1] = p[1];
        oData[oIdx + 2] = p[2];
        oData[oIdx + 3] = p[3];
      };

      setOut(x * 2, y * 2, E0);
      setOut(x * 2 + 1, y * 2, E1);
      setOut(x * 2, y * 2 + 1, E2);
      setOut(x * 2 + 1, y * 2 + 1, E3);
    }
  }

  oCtx.putImageData(oImgData, 0, 0);
  return outCanvas;
}

// -----------------------------------------------------------------------------
// 10. 47-Tile Blob Autotiling Bitmask Calculation
// -----------------------------------------------------------------------------

export function calculate47TileBitmask(
  isMatchingNeighbor: (nx: number, ny: number) => boolean,
  x: number,
  y: number
): number {
  const N = isMatchingNeighbor(x, y - 1) ? 1 : 0;
  const E = isMatchingNeighbor(x + 1, y) ? 1 : 0;
  const S = isMatchingNeighbor(x, y + 1) ? 1 : 0;
  const W = isMatchingNeighbor(x - 1, y) ? 1 : 0;

  const NE = N && E && isMatchingNeighbor(x + 1, y - 1) ? 1 : 0;
  const SE = S && E && isMatchingNeighbor(x + 1, y + 1) ? 1 : 0;
  const SW = S && W && isMatchingNeighbor(x - 1, y + 1) ? 1 : 0;
  const NW = N && W && isMatchingNeighbor(x - 1, y - 1) ? 1 : 0;

  return (
    N * 1 +
    NE * 2 +
    E * 4 +
    SE * 8 +
    S * 16 +
    SW * 32 +
    W * 64 +
    NW * 128
  );
}

// -----------------------------------------------------------------------------
// 11. Atkinson Dithering Algorithm
// -----------------------------------------------------------------------------

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

  const buffer = new Float32Array(width * height * 3);
  for (let i = 0; i < width * height; i++) {
    buffer[i * 3] = data[i * 4];
    buffer[i * 3 + 1] = data[i * 4 + 1];
    buffer[i * 3 + 2] = data[i * 4 + 2];
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (data[idx * 4 + 3] <= 30) continue;

      const r = Math.max(0, Math.min(255, buffer[idx * 3]));
      const g = Math.max(0, Math.min(255, buffer[idx * 3 + 1]));
      const b = Math.max(0, Math.min(255, buffer[idx * 3 + 2]));

      let closest = palRgba[0];
      let minDiff = Infinity;
      for (const c of palRgba) {
        const diff = (r - c.r) ** 2 + (g - c.g) ** 2 + (b - c.b) ** 2;
        if (diff < minDiff) {
          minDiff = diff;
          closest = c;
        }
      }

      data[idx * 4] = closest.r;
      data[idx * 4 + 1] = closest.g;
      data[idx * 4 + 2] = closest.b;

      const errR = (r - closest.r) / 8;
      const errG = (g - closest.g) / 8;
      const errB = (b - closest.b) / 8;

      const neighbors = [
        [x + 1, y],
        [x + 2, y],
        [x - 1, y + 1],
        [x, y + 1],
        [x + 1, y + 1],
        [x, y + 2],
      ];

      for (const [nx, ny] of neighbors) {
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const nIdx = (ny * width + nx) * 3;
          buffer[nIdx] += errR;
          buffer[nIdx + 1] += errG;
          buffer[nIdx + 2] += errB;
        }
      }
    }
  }

  srcCtx.putImageData(imgData, 0, 0);
}

// -----------------------------------------------------------------------------
// 12. Riemersma Hilbert Space-Filling Dither
// -----------------------------------------------------------------------------

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

  const path: [number, number][] = [];
  const numPoints = order * order;

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
    
    if (x >= 0 && x < width && y >= 0 && y < height) {
      path.push([x, y]);
    }
  }

  const historyLength = 16;
  const errR = new Array<number>(historyLength).fill(0);
  const errG = new Array<number>(historyLength).fill(0);
  const errB = new Array<number>(historyLength).fill(0);
  const decay = 1 / 8;

  for (let p = 0; p < path.length; p++) {
    const [x, y] = path[p];
    const idx = y * width + x;

    if (data[idx * 4 + 3] <= 30) continue;

    let totalErrR = 0;
    let totalErrG = 0;
    let totalErrB = 0;

    for (let i = 0; i < historyLength; i++) {
      const weight = Math.pow(decay, historyLength - i);
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

// -----------------------------------------------------------------------------
// 13. Rational Bézier Curves & Isometric Lines
// -----------------------------------------------------------------------------

export function getQuadraticBezierPoints(
  p0: Point,
  p1: Point,
  p2: Point,
  steps: number = 32
): Point[] {
  const points: Point[] = [];
  const seen = new Set<string>();

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const mt = 1 - t;

    const x = Math.round(mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x);
    const y = Math.round(mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y);

    const key = `${x},${y}`;
    if (!seen.has(key)) {
      seen.add(key);
      points.push({ x, y });
    }
  }

  return points;
}

export function getCubicBezierPoints(
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point
): Point[] {
  const points: Point[] = [];
  const seen = new Set<string>();

  const approxDist =
    Math.hypot(p1.x - p0.x, p1.y - p0.y) +
    Math.hypot(p2.x - p1.x, p2.y - p1.y) +
    Math.hypot(p3.x - p2.x, p3.y - p2.y);

  const steps = Math.max(16, Math.ceil(approxDist * 1.5));

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const mt = 1 - t;

    const x = Math.round(
      mt * mt * mt * p0.x +
      3 * mt * mt * t * p1.x +
      3 * mt * t * t * p2.x +
      t * t * t * p3.x
    );
    const y = Math.round(
      mt * mt * mt * p0.y +
      3 * mt * mt * t * p1.y +
      3 * mt * t * t * p2.y +
      t * t * t * p3.y
    );

    const key = `${x},${y}`;
    if (!seen.has(key)) {
      seen.add(key);
      points.push({ x, y });
    }
  }

  return points;
}

export function getIsometric2p1Line(x0: number, y0: number, x1: number, y1: number): Point[] {
  const points: Point[] = [];
  const dx = x1 - x0;
  const dy = y1 - y0;

  if (dx === 0 && dy === 0) return [{ x: x0, y: y0 }];

  const sx = dx >= 0 ? 1 : -1;
  const sy = dy >= 0 ? 1 : -1;

  // Number of 2-pixel isometric steps along X axis
  const numSteps = Math.max(1, Math.round(Math.abs(dx) / 2));

  const seen = new Set<string>();

  for (let k = 0; k <= numSteps; k++) {
    const curY = y0 + k * sy;
    const curX1 = x0 + (k * 2) * sx;
    const curX2 = x0 + (k * 2 + 1) * sx;

    const key1 = `${curX1},${curY}`;
    if (!seen.has(key1)) {
      seen.add(key1);
      points.push({ x: curX1, y: curY });
    }

    if (k < numSteps) {
      const key2 = `${curX2},${curY}`;
      if (!seen.has(key2)) {
        seen.add(key2);
        points.push({ x: curX2, y: curY });
      }
    }
  }

  return points;
}

// -----------------------------------------------------------------------------
// 13. Zhang-Suen Morphological Skeleton Line Thinning
// -----------------------------------------------------------------------------

export function applyZhangSuenThinning(
  srcCtx: CanvasRenderingContext2D,
  width: number,
  height: number
): { thinnedCount: number } {
  const imgData = srcCtx.getImageData(0, 0, width, height);
  const data = imgData.data;

  const binary = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    binary[i] = data[i * 4 + 3] > 30 ? 1 : 0;
  }

  let count = 0;
  let hasChanged = true;

  while (hasChanged) {
    hasChanged = false;

    // Sub-iteration 1
    const toDelete1: number[] = [];
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        if (!binary[idx]) continue;

        const p2 = binary[(y - 1) * width + x];
        const p3 = binary[(y - 1) * width + (x + 1)];
        const p4 = binary[y * width + (x + 1)];
        const p5 = binary[(y + 1) * width + (x + 1)];
        const p6 = binary[(y + 1) * width + x];
        const p7 = binary[(y + 1) * width + (x - 1)];
        const p8 = binary[y * width + (x - 1)];
        const p9 = binary[(y - 1) * width + (x - 1)];

        const B = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
        if (B < 2 || B > 6) continue;

        const neighbors = [p2, p3, p4, p5, p6, p7, p8, p9, p2];
        let A = 0;
        for (let k = 0; k < 8; k++) {
          if (neighbors[k] === 0 && neighbors[k + 1] === 1) A++;
        }
        if (A !== 1) continue;

        if (p2 * p4 * p6 !== 0) continue;
        if (p4 * p6 * p8 !== 0) continue;

        toDelete1.push(idx);
      }
    }

    for (const idx of toDelete1) {
      binary[idx] = 0;
      data[idx * 4 + 3] = 0;
      count++;
      hasChanged = true;
    }

    // Sub-iteration 2
    const toDelete2: number[] = [];
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        if (!binary[idx]) continue;

        const p2 = binary[(y - 1) * width + x];
        const p3 = binary[(y - 1) * width + (x + 1)];
        const p4 = binary[y * width + (x + 1)];
        const p5 = binary[(y + 1) * width + (x + 1)];
        const p6 = binary[(y + 1) * width + x];
        const p7 = binary[(y + 1) * width + (x - 1)];
        const p8 = binary[y * width + (x - 1)];
        const p9 = binary[(y - 1) * width + (x - 1)];

        const B = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
        if (B < 2 || B > 6) continue;

        const neighbors = [p2, p3, p4, p5, p6, p7, p8, p9, p2];
        let A = 0;
        for (let k = 0; k < 8; k++) {
          if (neighbors[k] === 0 && neighbors[k + 1] === 1) A++;
        }
        if (A !== 1) continue;

        if (p2 * p4 * p8 !== 0) continue;
        if (p2 * p6 * p8 !== 0) continue;

        toDelete2.push(idx);
      }
    }

    for (const idx of toDelete2) {
      binary[idx] = 0;
      data[idx * 4 + 3] = 0;
      count++;
      hasChanged = true;
    }
  }

  srcCtx.putImageData(imgData, 0, 0);
  return { thinnedCount: count };
}

// -----------------------------------------------------------------------------
// 13. PixiBud 2D Volumetric Optics, Subsurface Scattering & Anisotropic Shaders
// -----------------------------------------------------------------------------

export interface OpticalMaterialProfile {
  sigmaT: [number, number, number]; // Spectral extinction (R, G, B)
  gForward: number; // Henyey-Greenstein forward anisotropy (0.6 - 0.85)
  distortion: number; // Normal distortion for internal refraction (0.1 - 0.4)
  wrap: number; // Subsurface wrap factor (0.2 - 0.5)
  fresnelEta: number; // Base IOR (e.g. 1.77 Ruby, 1.33 Slime, 1.58 Emerald)
  fresnelPower: number; // Grazing angle power exponent (2.0 - 6.0)
  dispersion: number; // Abbe chromatic dispersion delta (0.01 - 0.06)
  roughness: number; // Surface microfacet roughness (0.0 - 0.5)
  anisoStrength: number; // Kajiya-Kay anisotropic specular strength
  kajiyaPower1: number; // Sharp highlight exponent
  kajiyaPower2: number; // Soft tinted highlight exponent
  kajiyaSpec1: number; // Sharp specular weight
  kajiyaSpec2: number; // Soft specular weight
}

export const OPTICAL_PROFILES: Record<OpticalPresetType, OpticalMaterialProfile> = {
  gemstone: {
    sigmaT: [0.35, 2.4, 2.8],
    gForward: 0.78,
    distortion: 0.35,
    wrap: 0.3,
    fresnelEta: 1.77,
    fresnelPower: 4.5,
    dispersion: 0.035,
    roughness: 0.08,
    anisoStrength: 0.85,
    kajiyaPower1: 64,
    kajiyaPower2: 24,
    kajiyaSpec1: 1.2,
    kajiyaSpec2: 0.4,
  },
  slime: {
    sigmaT: [2.9, 0.4, 2.6],
    gForward: 0.82,
    distortion: 0.25,
    wrap: 0.45,
    fresnelEta: 1.33,
    fresnelPower: 3.0,
    dispersion: 0.015,
    roughness: 0.12,
    anisoStrength: 0.35,
    kajiyaPower1: 32,
    kajiyaPower2: 12,
    kajiyaSpec1: 0.6,
    kajiyaSpec2: 0.5,
  },
  hair: {
    sigmaT: [1.5, 1.5, 1.5],
    gForward: 0.55,
    distortion: 0.15,
    wrap: 0.35,
    fresnelEta: 1.55,
    fresnelPower: 3.5,
    dispersion: 0.01,
    roughness: 0.25,
    anisoStrength: 1.4,
    kajiyaPower1: 48,
    kajiyaPower2: 16,
    kajiyaSpec1: 1.3,
    kajiyaSpec2: 0.7,
  },
  foliage: {
    sigmaT: [2.5, 0.5, 3.2],
    gForward: 0.68,
    distortion: 0.2,
    wrap: 0.4,
    fresnelEta: 1.45,
    fresnelPower: 2.8,
    dispersion: 0.015,
    roughness: 0.35,
    anisoStrength: 0.3,
    kajiyaPower1: 24,
    kajiyaPower2: 8,
    kajiyaSpec1: 0.5,
    kajiyaSpec2: 0.3,
  },
  metal_aniso: {
    sigmaT: [0.8, 0.8, 0.8],
    gForward: 0.5,
    distortion: 0.1,
    wrap: 0.2,
    fresnelEta: 2.4,
    fresnelPower: 5.0,
    dispersion: 0.04,
    roughness: 0.15,
    anisoStrength: 1.5,
    kajiyaPower1: 80,
    kajiyaPower2: 32,
    kajiyaSpec1: 1.6,
    kajiyaSpec2: 0.8,
  },
};

/**
 * Evaluates 2D Henyey-Greenstein Phase Function for volumetric forward scattering.
 */
export function phaseHG2D(cosTheta: number, g: number): number {
  const gClamped = Math.max(-0.95, Math.min(0.95, g));
  const g2 = gClamped * gClamped;
  const cosT = Math.max(-1.0, Math.min(1.0, cosTheta));
  const denom = Math.max(1e-4, 1.0 + g2 - 2.0 * gClamped * cosT);
  return (1.0 - g2) / (2.0 * Math.PI * Math.pow(denom, 1.5));
}

/**
 * Evaluates Chromatic Dielectric Fresnel Reflectance with Cauchy dispersion channel splitting.
 */
export function evaluateDielectricFresnel(
  cosTheta: number,
  etaBase: number,
  dispersion: number,
  roughness: number,
  fresnelPower: number = 5.0
): [number, number, number] {
  const cosT = Math.max(0.0, Math.min(1.0, cosTheta));
  const etaR = Math.max(1.01, etaBase - dispersion);
  const etaG = Math.max(1.01, etaBase);
  const etaB = Math.max(1.01, etaBase + dispersion);

  const f0R = Math.pow((etaR - 1) / (etaR + 1), 2);
  const f0G = Math.pow((etaG - 1) / (etaG + 1), 2);
  const f0B = Math.pow((etaB - 1) / (etaB + 1), 2);

  const fMax = Math.max(0.0, 1.0 - roughness);
  const grazingTerm = Math.pow(1.0 - cosT, fresnelPower);

  return [
    f0R + (Math.max(fMax, f0R) - f0R) * grazingTerm,
    f0G + (Math.max(fMax, f0G) - f0G) * grazingTerm,
    f0B + (Math.max(fMax, f0B) - f0B) * grazingTerm,
  ];
}

/**
 * Computes anisotropic 2D tangent vector field T(x, y) based on normal curvature and directional presets.
 */
export function computeAnisotropicTangentField(
  normalField: NormalVectorField,
  width: number,
  height: number,
  flowPreset: AnisoFlowPreset,
  angleDeg: number
): { tx: Float32Array; ty: Float32Array } {
  const tx = new Float32Array(width * height);
  const ty = new Float32Array(width * height);
  const angleRad = (angleDeg * Math.PI) / 180;
  const cosA = Math.cos(angleRad);
  const sinA = Math.sin(angleRad);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const nx = normalField.nx[idx];
      const ny = normalField.ny[idx];

      let bx = 0;
      let by = 0;

      if (flowPreset === 'vertical') {
        bx = 0;
        by = 1;
      } else if (flowPreset === 'horizontal') {
        bx = 1;
        by = 0;
      } else if (flowPreset === 'radial') {
        const cx = width / 2;
        const cy = height / 2;
        const dx = x - cx;
        const dy = y - cy;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        bx = -dy / len;
        by = dx / len;
      } else {
        // Curvature tangent: orthogonal to normal gradient
        const len = Math.sqrt(nx * nx + ny * ny) || 1;
        bx = -ny / len;
        by = nx / len;
      }

      // Rotate by angle offset
      const rx = bx * cosA - by * sinA;
      const ry = bx * sinA + by * cosA;
      const rLen = Math.sqrt(rx * rx + ry * ry) || 1;

      tx[idx] = rx / rLen;
      ty[idx] = ry / rLen;
    }
  }

  return { tx, ty };
}

/**
 * Converts OKLab color space to OKLCH (Lightness, Chroma, Hue in degrees [0..360]).
 */
export function okLabToOKLCH(L: number, a: number, b: number): { L: number; C: number; h: number } {
  const C = Math.sqrt(a * a + b * b);
  let h = (Math.atan2(b, a) * 180) / Math.PI;
  if (h < 0) h += 360;
  return { L, C, h };
}

/**
 * Converts OKLCH back to OKLab color space.
 */
export function oklchToOKLab(L: number, C: number, h: number): OKLabColor {
  const hRad = (h * Math.PI) / 180;
  return {
    L,
    a: C * Math.cos(hRad),
    b: C * Math.sin(hRad),
  };
}

/**
 * Snaps smooth surface normals into discrete planar facet angles for cut gemstones.
 */
export function snapToGemstoneFacets(
  nx: Float32Array,
  ny: Float32Array,
  nz: Float32Array,
  width: number,
  height: number,
  numSectors: number = 8
): { nx: Float32Array; ny: Float32Array; nz: Float32Array } {
  const outNx = new Float32Array(width * height);
  const outNy = new Float32Array(width * height);
  const outNz = new Float32Array(width * height);
  const sectorAngle = (2 * Math.PI) / numSectors;

  for (let i = 0; i < width * height; i++) {
    const x = nx[i];
    const y = ny[i];
    const z = nz[i];
    const planarLen = Math.sqrt(x * x + y * y);
    if (planarLen < 0.08) {
      outNx[i] = 0;
      outNy[i] = 0;
      outNz[i] = 1.0;
    } else {
      let angle = Math.atan2(y, x);
      if (angle < 0) angle += 2 * Math.PI;
      const snappedAngle = Math.round(angle / sectorAngle) * sectorAngle;
      const snappedElevation = Math.max(0.35, Math.round(z * 3) / 3);
      const snappedPlanar = Math.sqrt(Math.max(0, 1 - snappedElevation * snappedElevation));
      outNx[i] = snappedPlanar * Math.cos(snappedAngle);
      outNy[i] = snappedPlanar * Math.sin(snappedAngle);
      outNz[i] = snappedElevation;
    }
  }
  return { nx: outNx, ny: outNy, nz: outNz };
}

/**
 * 1-Pass Cellular Automaton to remove isolated orphan pixel noise (confetti cleanup).
 */
export function cleanOrphanPixelConfetti(
  data: Uint8ClampedArray,
  width: number,
  height: number
): void {
  const copy = new Uint8ClampedArray(data);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      if (copy[idx + 3] === 0) continue;

      const r = copy[idx];
      const g = copy[idx + 1];
      const b = copy[idx + 2];

      const up = ((y - 1) * width + x) * 4;
      const down = ((y + 1) * width + x) * 4;
      const left = (y * width + (x - 1)) * 4;
      const right = (y * width + (x + 1)) * 4;

      const matches = (nIdx: number) => {
        if (copy[nIdx + 3] === 0) return false;
        return copy[nIdx] === r && copy[nIdx + 1] === g && copy[nIdx + 2] === b;
      };

      const neighborMatches = (matches(up) ? 1 : 0) + (matches(down) ? 1 : 0) + (matches(left) ? 1 : 0) + (matches(right) ? 1 : 0);

      if (neighborMatches === 0) {
        const neighbors = [up, down, left, right].filter(n => copy[n + 3] > 0);
        if (neighbors.length > 0) {
          const target = neighbors[0];
          data[idx] = copy[target];
          data[idx + 1] = copy[target + 1];
          data[idx + 2] = copy[target + 2];
        }
      }
    }
  }
}

/**
 * Executes the complete 2D Cel-Banded Volumetric Optics, SSS, Fresnel, and Anisotropic Specular Shader pipeline.
 */
export function executeVolumetricOpticalPipeline(
  srcCtx: CanvasRenderingContext2D,
  width: number,
  height: number,
  params: VolumetricOpticsParams
): HTMLCanvasElement {
  const imgData = srcCtx.getImageData(0, 0, width, height);
  const data = imgData.data;

  const isOpaque = (x: number, y: number) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return false;
    return data[(y * width + x) * 4 + 3] > 30;
  };

  const isBorder = (x: number, y: number) => {
    if (!isOpaque(x, y)) return false;
    return !isOpaque(x + 1, y) || !isOpaque(x - 1, y) || !isOpaque(x, y + 1) || !isOpaque(x, y - 1);
  };

  // 1. Distance transform & normal fields
  const distanceMap = computeSeparableEDT(isOpaque, width, height);
  let maxDist = 1;
  for (let i = 0; i < width * height; i++) {
    if (distanceMap[i] > maxDist) maxDist = distanceMap[i];
  }

  const rawHeightmap = generateInflatedHeightmap(distanceMap, width, height, 0.5);
  const smoothHeightmap = applyBilateralFilter(rawHeightmap, width, height, 1.5, 2.0);
  let normalField = computeTangentNormalField(smoothHeightmap, width, height, 2.0);

  // Faceted normal snapping for gemstones
  if (params.preset === 'gemstone' || params.facetedGems) {
    normalField = snapToGemstoneFacets(normalField.nx, normalField.ny, normalField.nz, width, height, 8);
  }

  const tangentField = computeAnisotropicTangentField(
    normalField,
    width,
    height,
    params.anisoFlow,
    params.anisoAngle
  );

  const profile = OPTICAL_PROFILES[params.preset] || OPTICAL_PROFILES.gemstone;

  // 2. Light setup
  const azRad = (params.lightAzimuth * Math.PI) / 180;
  const elRad = (Math.max(10, params.lightElevation) * Math.PI) / 180;

  const Lx = Math.sin(azRad) * Math.cos(elRad);
  const Ly = -Math.cos(azRad) * Math.cos(elRad);
  const Lz = Math.sin(elRad);

  const Vx = 0;
  const Vy = 0;
  const Vz = 1.0;

  const Hx = Lx + Vx;
  const Hy = Ly + Vy;
  const Hz = Lz + Vz;
  const hLen = Math.sqrt(Hx * Hx + Hy * Hy + Hz * Hz) || 1;
  const normHx = Hx / hLen;
  const normHy = Hy / hLen;

  const lightRgba = hexToRgba(params.lightColor || '#FFFFFF');
  const lightR = lightRgba.r / 255;
  const lightG = lightRgba.g / 255;
  const lightB = lightRgba.b / 255;

  const paletteRgba = params.paletteColors.map(hexToRgba);
  const paletteOKLab = paletteRgba.map(c => rgbToOKLab(c.r, c.g, c.b));

  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = width;
  outputCanvas.height = height;
  const outCtx = outputCanvas.getContext('2d')!;
  const outImgData = outCtx.createImageData(width, height);
  const outData = outImgData.data;

  const celTones = params.celTones ?? 3;
  const numTones = typeof celTones === 'number' ? celTones : 3;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const pIdx = idx * 4;

      if (!isOpaque(x, y)) {
        outData[pIdx + 3] = 0;
        continue;
      }

      const origR = data[pIdx] / 255;
      const origG = data[pIdx + 1] / 255;
      const origB = data[pIdx + 2] / 255;
      const origA = data[pIdx + 3];

      const Nx = normalField.nx[idx];
      const Ny = normalField.ny[idx];
      const Nz = normalField.nz[idx];

      const Tx = tangentField.tx[idx];
      const Ty = tangentField.ty[idx];

      const dist = distanceMap[idx];
      const NdotL = Nx * Lx + Ny * Ly + Nz * Lz;

      // A. 2D Subsurface Scattering with Focused Inner Core
      const effectiveDepth = Math.max(1, params.translucencyDepth);
      const opticalChord = (2.0 * Math.max(0.5, dist)) / Math.max(0.08, NdotL + profile.wrap);
      const scaledChord = opticalChord / effectiveDepth;

      const sssR = Math.exp(-profile.sigmaT[0] * scaledChord);
      const sssG = Math.exp(-profile.sigmaT[1] * scaledChord);
      const sssB = Math.exp(-profile.sigmaT[2] * scaledChord);

      // Inverted light vector with normal distortion for forward scatter
      const sLx = -(Lx + Nx * profile.distortion);
      const sLy = -(Ly + Ny * profile.distortion);
      const sLz = -(Lz + Nz * profile.distortion);
      const sLen = Math.sqrt(sLx * sLx + sLy * sLy + sLz * sLz) || 1;
      const cosTheta = (sLx * Vx + sLy * Vy + sLz * Vz) / sLen;
      const forwardScatter = phaseHG2D(cosTheta, profile.gForward);

      // Focused internal luminous core mask for slimes and potion bottles
      const coreMask = Math.pow(Math.max(0, (dist - 1.0) / Math.max(1.0, maxDist - 1.0)), 1.1);
      const forwardGlow = Math.min(1.0, Math.max(0, 1.8 * forwardScatter));
      const sssCoreFactor = (profile.wrap * 0.4 + (1 - profile.wrap * 0.4) * coreMask) * (0.3 + 0.7 * forwardGlow);

      const sssRadianceR = sssR * sssCoreFactor * lightR * 1.5;
      const sssRadianceG = sssG * sssCoreFactor * lightG * 1.5;
      const sssRadianceB = sssB * sssCoreFactor * lightB * 1.5;

      // B. Dielectric Fresnel Reflection with Morphological Crescent Outline
      const cosView = Math.max(0, Nz);
      const fresnelPower = params.fresnelPower ?? profile.fresnelPower;
      const [fresR, fresG, fresB] = evaluateDielectricFresnel(
        cosView,
        profile.fresnelEta,
        profile.dispersion,
        profile.roughness,
        fresnelPower
      );

      const isSilBorder = isBorder(x, y);
      const rimLightGate = Math.max(0, NdotL + 0.25);
      const crescentRimBoost = isSilBorder ? 1.6 : 0.8;

      const rimRadianceR = fresR * rimLightGate * crescentRimBoost * lightR;
      const rimRadianceG = fresG * rimLightGate * crescentRimBoost * lightG;
      const rimRadianceB = fresB * rimLightGate * crescentRimBoost * lightB;

      // C. Kajiya-Kay Anisotropic Specular Highlight (Angel Ring)
      const t1x = Tx + Nx * 0.1;
      const t1y = Ty + Ny * 0.1;
      const t1Len = Math.sqrt(t1x * t1x + t1y * t1y) || 1;

      const t2x = Tx - Nx * 0.15;
      const t2y = Ty - Ny * 0.15;
      const t2Len = Math.sqrt(t2x * t2x + t2y * t2y) || 1;

      const dotTH1 = (t1x / t1Len) * normHx + (t1y / t1Len) * normHy;
      const dotTH2 = (t2x / t2Len) * normHx + (t2y / t2Len) * normHy;

      const sinTH1 = Math.sqrt(Math.max(0.0, 1.0 - dotTH1 * dotTH1));
      const sinTH2 = Math.sqrt(Math.max(0.0, 1.0 - dotTH2 * dotTH2));

      let spec1 = profile.kajiyaSpec1 * Math.pow(sinTH1, profile.kajiyaPower1);
      const spec2 = profile.kajiyaSpec2 * Math.pow(sinTH2, profile.kajiyaPower2);

      // Clean bounded angel-ring sheen band for hair preset
      if (params.preset === 'hair') {
        spec1 = sinTH1 > 0.65 ? Math.pow((sinTH1 - 0.65) / 0.35, 1.4) * 1.5 : 0;
      }

      const anisoHighlightR = (spec1 * lightR + spec2 * origR * lightR) * profile.anisoStrength;
      const anisoHighlightG = (spec1 * lightG + spec2 * origG * lightG) * profile.anisoStrength;
      const anisoHighlightB = (spec1 * lightB + spec2 * origB * lightB) * profile.anisoStrength;

      // D. Total Physical Light Modulation Signal
      const diffuseLight = Math.max(0, NdotL);
      const totalLightSignal = (
        0.30 * diffuseLight +
        0.45 * ((sssRadianceR + sssRadianceG + sssRadianceB) / 3) +
        0.55 * ((rimRadianceR + rimRadianceG + rimRadianceB) / 3) +
        0.50 * ((anisoHighlightR + anisoHighlightG + anisoHighlightB) / 3)
      );

      let r255: number;
      let g255: number;
      let b255: number;

      const baseLab = rgbToOKLab(data[pIdx], data[pIdx + 1], data[pIdx + 2]);
      const baseLch = okLabToOKLCH(baseLab.L, baseLab.a, baseLab.b);

      if (celTones === 'smooth') {
        // Continuous lighting mode for VFX overlays
        const finalR = origR * 0.4 + sssRadianceR * 0.8 + rimRadianceR * 0.6 + anisoHighlightR * 0.7;
        const finalG = origG * 0.4 + sssRadianceG * 0.8 + rimRadianceG * 0.6 + anisoHighlightG * 0.7;
        const finalB = origB * 0.4 + sssRadianceB * 0.8 + rimRadianceB * 0.6 + anisoHighlightB * 0.7;

        r255 = Math.max(0, Math.min(255, Math.round(finalR * 255)));
        g255 = Math.max(0, Math.min(255, Math.round(finalG * 255)));
        b255 = Math.max(0, Math.min(255, Math.round(finalB * 255)));
      } else {
        // Stepped Cel-Banding Quantization Mode (2, 3, or 4 Tones)
        const toneStep = Math.min(numTones - 1, Math.max(0, Math.floor(totalLightSignal * (numTones + 0.3))));

        let targetL = baseLch.L;
        let targetC = baseLch.C;
        let targetH = baseLch.h;

        if (toneStep >= numTones - 1) {
          // Specular Glint / Fresnel Rim Tone (Warm Sun / Amber shift)
          targetL = Math.min(1.0, baseLch.L * 1.35 + 0.12);
          targetC = baseLch.C * 1.15;
          targetH = (baseLch.h - 15 + 360) % 360;
        } else if (toneStep === 0) {
          // Deep Atmospheric Shadow (Cool Indigo / Violet shift)
          targetL = baseLch.L * 0.62;
          targetC = baseLch.C * 0.90;
          targetH = (baseLch.h + 28) % 360;
        } else {
          // Midtone / SSS Resonant Tone
          targetL = baseLch.L * 0.95;
          targetC = baseLch.C * 1.05;
        }

        const modulatedLab = oklchToOKLab(targetL, targetC, targetH);
        const modulatedRgb = okLabToRGB(modulatedLab.L, modulatedLab.a, modulatedLab.b);

        r255 = modulatedRgb.r;
        g255 = modulatedRgb.g;
        b255 = modulatedRgb.b;
      }

      // E. Optional Palette Snapping
      if (paletteOKLab.length > 0) {
        const pixelLab = rgbToOKLab(r255, g255, b255);
        let bestDist = Infinity;
        let bestColor = paletteRgba[0];

        for (let i = 0; i < paletteOKLab.length; i++) {
          const pLab = paletteOKLab[i];
          const dist = deltaEOKLab(pixelLab, pLab);
          if (dist < bestDist) {
            bestDist = dist;
            bestColor = paletteRgba[i];
          }
        }

        r255 = bestColor.r;
        g255 = bestColor.g;
        b255 = bestColor.b;
      }

      outData[pIdx] = r255;
      outData[pIdx + 1] = g255;
      outData[pIdx + 2] = b255;
      outData[pIdx + 3] = origA;
    }
  }

  // F. 1-Pass Cellular Automaton to remove isolated orphan pixel confetti
  if (celTones !== 'smooth') {
    cleanOrphanPixelConfetti(outData, width, height);
  }

  outCtx.putImageData(outImgData, 0, 0);
  return outputCanvas;
}

