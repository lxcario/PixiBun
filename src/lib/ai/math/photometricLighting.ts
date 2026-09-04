/**
 * Photometric 2.5D Shading, Blinn-Phong Specular, Volumetric Optics & SSS Pipeline.
 *
 * Citations:
 * 1. J. F. Blinn, "Models of light reflection for computer synthesized pictures",
 *    ACM SIGGRAPH Computer Graphics, 11(2): 192–198, 1977 (Blinn-Phong half-vector specular model).
 * 2. L. G. Henyey & J. L. Greenstein, "Diffuse radiation in the galaxy",
 *    The Astrophysical Journal, 93: 70–83, 1941 (Henyey-Greenstein 2D phase function for forward subsurface scattering).
 * 3. J. T. Kajiya & T. L. Kay, "Rendering fur with three dimensional textures",
 *    ACM SIGGRAPH Computer Graphics, 23(3): 271–280, 1989 (Kajiya-Kay anisotropic specular reflection).
 * 4. Augustin-Jean Fresnel, "Mémoire sur la loi des modifications que la réflexion imprime à la lumière polarisée",
 *    Mémoires de l'Académie des Sciences, 1827 (Dielectric Fresnel reflectance with Cauchy chromatic dispersion delta).
 */

import {
  MaterialType,
  MaterialProperties,
  PhotometricLightingParams,
  VolumetricOpticsParams,
  OpticalPresetType,
  AnisoFlowPreset,
} from '@/types/tools';
import { hexToRgba } from '@/lib/canvas/floodFill';
import { rgbToOKLab, deltaEOKLab, okLabToOKLCH } from './colorSpace';
import {
  type NormalVectorField,
  computeSeparableEDT,
  generateInflatedHeightmap,
  applyBilateralFilter,
  computeTangentNormalField,
  computeDiscreteLaplaceCavity,
  computeContentAwareHeightmap,
} from './edtNormalMap';

export {
  type NormalVectorField,
  computeSeparableEDT,
  generateInflatedHeightmap,
  applyBilateralFilter,
  computeTangentNormalField,
  computeDiscreteLaplaceCavity,
  computeContentAwareHeightmap,
};
import { getBayerMatrixThreshold } from './dithering';
import { detectMinecraftSkin, computeMinecraftSkinNormalField, executeMinecraftSkinShadingPipeline } from './minecraftSkin';
import { ShadedPixel } from './curvesAndLines';

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

export function phaseHG2D(cosTheta: number, g: number): number {
  const gClamped = Math.max(-0.95, Math.min(0.95, g));
  const g2 = gClamped * gClamped;
  const cosT = Math.max(-1.0, Math.min(1.0, cosTheta));
  const denom = Math.max(1e-4, 1.0 + g2 - 2.0 * gClamped * cosT);
  return (1.0 - g2) / (2.0 * Math.PI * Math.pow(denom, 1.5));
}

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
        const len = Math.sqrt(nx * nx + ny * ny) || 1;
        bx = -ny / len;
        by = nx / len;
      }

      const rx = bx * cosA - by * sinA;
      const ry = bx * sinA + by * cosA;
      const rLen = Math.sqrt(rx * rx + ry * ry) || 1;

      tx[idx] = rx / rLen;
      ty[idx] = ry / rLen;
    }
  }

  return { tx, ty };
}

export function snapToGemstoneFacets(
  nx: Float32Array,
  ny: Float32Array,
  nz: Float32Array,
  width: number,
  height: number,
  numSectors: number = 8
): NormalVectorField {
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
  return { nx: outNx, ny: outNy, nz: outNz, width, height };
}

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

export function executePhotometricPipeline(
  srcCtx: CanvasRenderingContext2D,
  width: number,
  height: number,
  params: PhotometricLightingParams,
  paletteHex: string[]
): HTMLCanvasElement {
  const imgData = srcCtx.getImageData(0, 0, width, height);
  const data = imgData.data;

  const isOpaque = (x: number, y: number) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return false;
    return data[(y * width + x) * 4 + 3] > 30;
  };

  const isMcSkin = detectMinecraftSkin(isOpaque, width, height);
  if (isMcSkin) {
    return executeMinecraftSkinShadingPipeline(srcCtx, width, height, params);
  }

  const {
    normalField,
    cavityAO,
    isInkLine,
    isFeature,
  } = computeContentAwareHeightmap(data, width, height, params.cavityStrength ?? 1.0, 2.0);

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

      // Hand-drawn line art & dark contour preservation:
      // Preserves original hand-inked line work with deep contrast, subtle ambient occlusion darkening,
      // and eliminates muddy diffuse light wash or specular glints on ink lines.
      if (isInkLine[idx] === 1) {
        outData[pIdx] = Math.round(data[pIdx] * (0.65 + 0.35 * ao));
        outData[pIdx + 1] = Math.round(data[pIdx + 1] * (0.65 + 0.35 * ao));
        outData[pIdx + 2] = Math.round(data[pIdx + 2] * (0.65 + 0.35 * ao));
        outData[pIdx + 3] = data[pIdx + 3];
        continue;
      }

      // Facial feature preservation (e.g. eyes, mouth):
      if (isFeature[idx] === 1) {
        outData[pIdx] = Math.round(data[pIdx] * (0.75 + 0.25 * ao));
        outData[pIdx + 1] = Math.round(data[pIdx + 1] * (0.75 + 0.25 * ao));
        outData[pIdx + 2] = Math.round(data[pIdx + 2] * (0.75 + 0.25 * ao));
        outData[pIdx + 3] = data[pIdx + 3];
        continue;
      }

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
      const effectiveAmbient = Math.max(0.35, params.ambientIntensity ?? 0.35) * brightness;
      const ambR = origR * effectiveAmbient * ao;
      const ambG = origG * effectiveAmbient * ao;
      const ambB = origB * effectiveAmbient * ao;

      // 4. Total continuous color: (Ambient + Diffuse * AO + Specular) * brightness
      let totalR = Math.max(0, Math.min(1.0, (ambR + diffR * ao + specR) * (brightness * 0.9)));
      let totalG = Math.max(0, Math.min(1.0, (ambG + diffG * ao + specG) * (brightness * 0.9)));
      let totalB = Math.max(0, Math.min(1.0, (ambB + diffB * ao + specB) * (brightness * 0.9)));

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

export interface LightParameters {
  azimuthDeg: number;
  elevationDeg: number;
  shadowIntensity: number;
  specularShininess: number;
  rimLight: boolean;
  selOut: boolean;
  material?: string;
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
  const contentAnalysis = isMcSkin
    ? null
    : computeContentAwareHeightmap(data, width, height, 1.0, 2.0);

  const normalField = isMcSkin
    ? computeMinecraftSkinNormalField(width, height)
    : contentAnalysis!.normalField;

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
      material: (params.material as MaterialType) || 'matte',
      cavityStrength: 1.0,
      ditherModulation: 0,
      bayerSize: '4x4',
    },
    []
  );

  const pData = photometricCanvas.getContext('2d')!.getImageData(0, 0, width, height).data;
  const shadedPixels: ShadedPixel[] = [];
  const candidateSpecular: Array<{ pixel: ShadedPixel; intensity: number }> = [];
  const specularPixels: ShadedPixel[] = [];
  const rimPixels: ShadedPixel[] = [];

  const isMetallic = params.material === 'gold' || params.material === 'metal';
  const shininess = params.specularShininess || 16;

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

        const isInk = contentAnalysis ? contentAnalysis.isInkLine[idx] === 1 : false;
        const isFeat = contentAnalysis ? contentAnalysis.isFeature[idx] === 1 : false;
        const macroD = contentAnalysis ? contentAnalysis.macroHeightmap[idx] : 2.0;

        // Specular glints strictly prohibited on line art, facial markings (eyes/mouth), and boundary outer edges
        if (!isInk && !isFeat && macroD >= 1.5) {
          const Nx = normalField.nx[idx];
          const Ny = normalField.ny[idx];
          const Nz = normalField.nz[idx];

          const NdotL = Nx * Lx + Ny * Ly + Nz * Lz;
          if (NdotL > 0.05 && Nz >= 0.15) {
            const NdotH = Math.max(0, Nx * normHx + Ny * normHy + Nz * normHz);
            const Ispec = Math.pow(NdotH, shininess);

            if (Ispec > 0.30) {
              const alpha = Math.min(255, Math.round(Ispec * 255));
              let r = 255;
              let g = 255;
              let b = 255;

              if (isMetallic) {
                r = Math.min(255, Math.round(pData[pIdx] * 0.35 + 255 * 0.65));
                g = Math.min(255, Math.round(pData[pIdx + 1] * 0.35 + 245 * 0.65));
                b = Math.min(255, Math.round(pData[pIdx + 2] * 0.35 + 160 * 0.65));
              }

              candidateSpecular.push({
                pixel: { x, y, r, g, b, a: alpha },
                intensity: Ispec,
              });
            }
          }
        }
      }
    }
  }

  // Cluster candidate glints into a cohesive apex hotspot (matching Photo 2!)
  // Eliminates scattered edge dots across ears, chins, and line art
  if (candidateSpecular.length > 0) {
    candidateSpecular.sort((a, b) => b.intensity - a.intensity);
    const apex = candidateSpecular[0];
    const apexX = apex.pixel.x;
    const apexY = apex.pixel.y;
    const apexIntensity = apex.intensity;

    const maxClusterRadius = Math.max(1.8, Math.min(3.2, Math.sqrt(width * height) * 0.06));
    const clustered = candidateSpecular.filter((cand) => {
      const dx = cand.pixel.x - apexX;
      const dy = cand.pixel.y - apexY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      return dist <= maxClusterRadius && cand.intensity >= apexIntensity * 0.60;
    });

    const maxGlints = Math.max(3, Math.min(7, Math.round((width * height) / 200)));
    for (let i = 0; i < Math.min(maxGlints, clustered.length); i++) {
      specularPixels.push(clustered[i].pixel);
    }
  }

  return { shadedPixels, specularPixels, rimPixels };
}

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

  const distanceMap = computeSeparableEDT(isOpaque, width, height);
  let maxDist = 1;
  for (let i = 0; i < width * height; i++) {
    if (distanceMap[i] > maxDist) maxDist = distanceMap[i];
  }

  const rawHeightmap = generateInflatedHeightmap(distanceMap, width, height, 0.5);
  const smoothHeightmap = applyBilateralFilter(rawHeightmap, width, height, 1.5, 2.0);
  let normalField = computeTangentNormalField(smoothHeightmap, width, height, 2.0);

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

      const effectiveDepth = Math.max(1, params.translucencyDepth);
      const opticalChord = (2.0 * Math.max(0.5, dist)) / Math.max(0.08, NdotL + profile.wrap);
      const scaledChord = opticalChord / effectiveDepth;

      const sssR = Math.exp(-profile.sigmaT[0] * scaledChord);
      const sssG = Math.exp(-profile.sigmaT[1] * scaledChord);
      const sssB = Math.exp(-profile.sigmaT[2] * scaledChord);

      const sLx = -(Lx + Nx * profile.distortion);
      const sLy = -(Ly + Ny * profile.distortion);
      const sLz = -(Lz + Nz * profile.distortion);
      const sLen = Math.sqrt(sLx * sLx + sLy * sLy + sLz * sLz) || 1;
      const cosTheta = (sLx * Vx + sLy * Vy + sLz * Vz) / sLen;
      const forwardScatter = phaseHG2D(cosTheta, profile.gForward);

      const coreMask = Math.pow(Math.max(0, (dist - 1.0) / Math.max(1.0, maxDist - 1.0)), 1.1);
      const forwardGlow = Math.min(1.0, Math.max(0, 1.8 * forwardScatter));
      const sssCoreFactor = (profile.wrap * 0.4 + (1 - profile.wrap * 0.4) * coreMask) * (0.3 + 0.7 * forwardGlow);

      const sssRadianceR = sssR * sssCoreFactor * lightR * 1.5;
      const sssRadianceG = sssG * sssCoreFactor * lightG * 1.5;
      const sssRadianceB = sssB * sssCoreFactor * lightB * 1.5;

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

      if (params.preset === 'hair') {
        spec1 = sinTH1 > 0.65 ? Math.pow((sinTH1 - 0.65) / 0.35, 1.4) * 1.5 : 0;
      }

      const anisoHighlightR = (spec1 * lightR + spec2 * origR * lightR) * profile.anisoStrength;
      const anisoHighlightG = (spec1 * lightG + spec2 * origG * lightG) * profile.anisoStrength;
      const anisoHighlightB = (spec1 * lightB + spec2 * origB * lightB) * profile.anisoStrength;

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
      const _baseLch = okLabToOKLCH(baseLab.L, baseLab.a, baseLab.b);

      if (celTones === 'smooth') {
        const finalR = origR * 0.4 + (origR * diffuseLight * 0.6) + sssRadianceR * 0.8 + rimRadianceR * 0.6 + anisoHighlightR * 0.7;
        const finalG = origG * 0.4 + (origG * diffuseLight * 0.6) + sssRadianceG * 0.8 + rimRadianceG * 0.6 + anisoHighlightG * 0.7;
        const finalB = origB * 0.4 + (origB * diffuseLight * 0.6) + sssRadianceB * 0.8 + rimRadianceB * 0.6 + anisoHighlightB * 0.7;

        r255 = Math.max(0, Math.min(255, Math.round(finalR * 255)));
        g255 = Math.max(0, Math.min(255, Math.round(finalG * 255)));
        b255 = Math.max(0, Math.min(255, Math.round(finalB * 255)));
      } else {
        const toneStep = Math.min(numTones - 1, Math.max(0, Math.floor(totalLightSignal * (numTones + 0.3))));

        const finalR = origR * 0.4 + (origR * diffuseLight * 0.6) + sssRadianceR * 0.8 + rimRadianceR * 0.6 + anisoHighlightR * 0.7;
        const finalG = origG * 0.4 + (origG * diffuseLight * 0.6) + sssRadianceG * 0.8 + rimRadianceG * 0.6 + anisoHighlightG * 0.7;
        const finalB = origB * 0.4 + (origB * diffuseLight * 0.6) + sssRadianceB * 0.8 + rimRadianceB * 0.6 + anisoHighlightB * 0.7;

        const toneFactor = toneStep / Math.max(1, numTones - 1);

        const qR = origR * 0.4 + (finalR - origR * 0.4) * toneFactor;
        const qG = origG * 0.4 + (finalG - origG * 0.4) * toneFactor;
        const qB = origB * 0.4 + (finalB - origB * 0.4) * toneFactor;

        r255 = Math.max(0, Math.min(255, Math.round(qR * 255)));
        g255 = Math.max(0, Math.min(255, Math.round(qG * 255)));
        b255 = Math.max(0, Math.min(255, Math.round(qB * 255)));
      }

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

  if (celTones !== 'smooth') {
    cleanOrphanPixelConfetti(outData, width, height);
  }

  outCtx.putImageData(outImgData, 0, 0);
  return outputCanvas;
}
