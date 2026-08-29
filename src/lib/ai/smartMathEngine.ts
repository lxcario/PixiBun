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

import { MaterialType, MaterialProperties, PhotometricLightingParams } from '@/types/tools';
import { hexToRgba, rgbaToHex } from '@/lib/canvas/floodFill';
import { generateOklchRamp } from '@/lib/color/rampGenerator';

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
function dt1D(f: Float32Array, n: number): Float32Array {
  const d = new Float32Array(n);
  const v = new Int32Array(n);
  const z = new Float32Array(n + 1);
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
  const grid = new Float32Array(width * height);

  // Initialize: 0 for transparent boundary, INF for opaque interior
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      grid[y * width + x] = isOpaque(x, y) ? INF : 0;
    }
  }

  // 1. Transform along columns
  for (let x = 0; x < width; x++) {
    const col = new Float32Array(height);
    for (let y = 0; y < height; y++) {
      col[y] = grid[y * width + x];
    }
    const dtCol = dt1D(col, height);
    for (let y = 0; y < height; y++) {
      grid[y * width + x] = dtCol[y];
    }
  }

  // 2. Transform along rows
  const distance = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    const row = new Float32Array(width);
    for (let x = 0; x < width; x++) {
      row[x] = grid[y * width + x];
    }
    const dtRow = dt1D(row, width);
    for (let x = 0; x < width; x++) {
      distance[y * width + x] = Math.sqrt(dtRow[x]);
    }
  }

  return distance;
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

// -----------------------------------------------------------------------------
// 7. Full Photometric Lighting Pipeline
// -----------------------------------------------------------------------------

/**
 * Renders complete physical 2.5D lighting model:
 * - Lambertian Diffuse (with albedo Hadamard product)
 * - Blinn-Phong Specular (Half-Vector H)
 * - Discrete Laplace Cavity AO
 * - Distance Attenuation
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

  // 1. Compute binary mask & linear EDT
  const isOpaque = (x: number, y: number) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return false;
    return data[(y * width + x) * 4 + 3] > 30;
  };

  const distanceMap = computeSeparableEDT(isOpaque, width, height);

  // 2. Non-linear Dome Heightmap + Bilateral Smoothing
  const rawHeightmap = generateInflatedHeightmap(distanceMap, width, height, 0.5);
  const smoothHeightmap = applyBilateralFilter(rawHeightmap, width, height, 1.5, 2.0);

  // 3. Tangent Space Normal Vector Field
  const normalField = computeTangentNormalField(smoothHeightmap, width, height, 2.0);

  // 4. Laplace Cavity Ambient Occlusion
  const cavityAO = computeDiscreteLaplaceCavity(smoothHeightmap, width, height, params.cavityStrength);

  // 5. Material Coefficients
  const mat = MATERIAL_PROFILES[params.material] || MATERIAL_PROFILES.matte;

  // Light Vector L from Spherical Coordinates
  const azRad = (params.lightAzimuth * Math.PI) / 180;
  const elRad = (params.lightElevation * Math.PI) / 180;

  const Lx = Math.cos(azRad) * Math.cos(elRad);
  const Ly = -Math.sin(azRad) * Math.cos(elRad);
  const Lz = Math.sin(elRad);

  // View Vector V = (0, 0, 1) in orthographic view
  const Vx = 0;
  const Vy = 0;
  const Vz = 1.0;

  // Blinn-Phong Half-Vector H = (L + V) / ||L + V||
  const Hx = Lx + Vx;
  const Hy = Ly + Vy;
  const Hz = Lz + Vz;
  const hLen = Math.sqrt(Hx * Hx + Hy * Hy + Hz * Hz) || 1;
  const normHx = Hx / hLen;
  const normHy = Hy / hLen;
  const normHz = Hz / hLen;

  // Light color RGB
  const lightRgba = hexToRgba(params.lightColor || '#FFFFFF');
  const lightR = lightRgba.r / 255;
  const lightG = lightRgba.g / 255;
  const lightB = lightRgba.b / 255;

  // Pre-calculate OKLab palette
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

      // 1. Lambertian Diffuse N . L
      const NdotL = Math.max(0, Nx * Lx + Ny * Ly + Nz * Lz);
      const diffR = mat.kd * NdotL * (origR * lightR);
      const diffG = mat.kd * NdotL * (origG * lightG);
      const diffB = mat.kd * NdotL * (origB * lightB);

      // 2. Blinn-Phong Specular (N . H)^alpha
      const NdotH = Math.max(0, Nx * normHx + Ny * normHy + Nz * normHz);
      const Ispec = mat.ks * Math.pow(NdotH, mat.shininess);

      let specR = Ispec * lightR;
      let specG = Ispec * lightG;
      let specB = Ispec * lightB;

      // For metallic materials, specular is tinted by base albedo
      if (mat.isMetallic) {
        specR *= origR;
        specG *= origG;
        specB *= origB;
      }

      // 3. Ambient
      const ambR = origR * params.ambientIntensity * ao;
      const ambG = origG * params.ambientIntensity * ao;
      const ambB = origB * params.ambientIntensity * ao;

      // 4. Total continuous color: (Ambient * AO + Diffuse * AO + Specular)
      let totalR = Math.max(0, Math.min(1.0, ambR + diffR * ao + specR));
      let totalG = Math.max(0, Math.min(1.0, ambG + diffG * ao + specG));
      let totalB = Math.max(0, Math.min(1.0, ambB + diffB * ao + specB));

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

  const distanceMap = computeSeparableEDT(isOpaque, width, height);
  const rawHeightmap = generateInflatedHeightmap(distanceMap, width, height, 0.5);
  const smoothHeightmap = applyBilateralFilter(rawHeightmap, width, height, 1.5, 2.0);
  const normalField = computeTangentNormalField(smoothHeightmap, width, height, 2.0);

  const azRad = (params.azimuthDeg * Math.PI) / 180;
  const elRad = (Math.max(15, params.elevationDeg) * Math.PI) / 180;

  const Lx = Math.cos(azRad) * Math.cos(elRad);
  const Ly = -Math.sin(azRad) * Math.cos(elRad);
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
      ambientIntensity: 0.35,
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

  // Build effective palette: combine passed palette with unique colors on canvas
  const canvasColors = new Set<string>();
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] > 30) {
      canvasColors.add(rgbaToHex(data[i], data[i + 1], data[i + 2], 255));
    }
  }

  let effectivePalette = paletteHex;
  if (effectivePalette.length === 0 || (canvasColors.size > 0 && !Array.from(canvasColors).some(c => effectivePalette.includes(c)))) {
    const customPalette = new Set<string>();
    canvasColors.forEach(c => {
      customPalette.add(c);
      const ramp = generateOklchRamp(c);
      ramp.forEach(rc => customPalette.add(rc));
    });
    effectivePalette = Array.from(customPalette);
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

  // Build effective palette: combine passed palette with unique colors on canvas
  const canvasColors = new Set<string>();
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] > 30) {
      canvasColors.add(rgbaToHex(data[i], data[i + 1], data[i + 2], 255));
    }
  }

  let effectivePalette = paletteHex;
  if (effectivePalette.length === 0 || (canvasColors.size > 0 && !Array.from(canvasColors).some(c => effectivePalette.includes(c)))) {
    const customPalette = new Set<string>();
    canvasColors.forEach(c => {
      customPalette.add(c);
      const ramp = generateOklchRamp(c);
      ramp.forEach(rc => customPalette.add(rc));
    });
    effectivePalette = Array.from(customPalette);
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
