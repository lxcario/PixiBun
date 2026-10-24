/**
 * Photometric 2.5D Shading, Blinn-Phong Specular, Volumetric Optics & SSS Pipeline.
 *
 * Citations:
 * 1. J. F. Blinn, "Models of light reflection for computer synthesized pictures",
 *    ACM SIGGRAPH Computer Graphics, 11(2): 192–198, 1977 (Blinn-Phong half-vector specular model).
 * 2. L. G. Henyey & J. L. Greenstein, "Diffuse radiation in the galaxy",
 *    The Astrophysical Journal, 93: 70–83, 1941 (Henyey-Greenstein 3D phase function, adapted with 2D circumference prefactor for empirical sprite subsurface scattering).
 * 3. J. T. Kajiya & T. L. Kay, "Rendering fur with three dimensional textures",
 *    ACM SIGGRAPH Computer Graphics, 23(3): 271–280, 1989 (Kajiya-Kay anisotropic specular reflection).
 * 4. S. R. Marschner, H. W. Jensen, M. Cammarano, S. Worley, and P. Hanrahan, "Light scattering from human hair fibers",
 *    ACM Transactions on Graphics (SIGGRAPH 2003), 22(3): 780–791 (Hair cuticle scale angle shift).
 * 5. T. Scheuermann, "Practical real-time hair rendering and shading",
 *    ACM SIGGRAPH 2004 Sketches (Tangent offset dual-specular approximation for Kajiya-Kay).
 * 6. Augustin-Jean Fresnel, "Mémoire sur la loi des modifications que la réflexion imprime à la lumière polarisée",
 *    Mémoires de l'Académie des Sciences, 1827 (Dielectric Fresnel reflectance with Cauchy chromatic dispersion delta).
 */

import {
  MaterialType,
  MaterialProperties,
  PhotometricLightingParams,
  PhotometricAnalysisGeometry,
  ShadingBandMode,
  CharacterRampBounds,
} from '@/types/tools';
import { hexToRgba } from '@/lib/canvas/floodFill';
import { decodeNormalRGB, blendNormalsRNM } from '@/lib/art/normalSculptor';
import { rgbToOKLab, deltaEOKLab, okLabToOKLCH, oklchToOKLab, okLabToRGB } from './colorSpace';
import { inferPhotometricSettings } from './photometricAuto';
import {
  type NormalVectorField,
  computeSeparableEDT,
  generateInflatedHeightmap,
  applyBilateralFilter,
  computeTangentNormalField,
  computeDiscreteLaplaceCavity,
  computeContentAwareHeightmap,
  applyAppendageStabilization,
  type AppendageData,
} from './edtNormalMap';

export {
  type NormalVectorField,
  type AppendageData,
  computeSeparableEDT,
  generateInflatedHeightmap,
  applyBilateralFilter,
  computeTangentNormalField,
  computeDiscreteLaplaceCavity,
  computeContentAwareHeightmap,
  applyAppendageStabilization,
};
import { getBayerMatrixThreshold } from './dithering';
import { detectMinecraftSkin, computeMinecraftSkinNormalField, executeMinecraftSkinShadingPipeline } from './minecraftSkin';
import { ShadedPixel } from './curvesAndLines';
import { renderPixelGlints, applyPixelGlints } from './pixelGlint';

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

export interface CelRamp {
  baseR: number;
  baseG: number;
  baseB: number;
  softR: number;
  softG: number;
  softB: number;
  shadowR: number;
  shadowG: number;
  shadowB: number;
  deepR: number;
  deepG: number;
  deepB: number;
  hiR: number;
  hiG: number;
  hiB: number;
}

export function buildCelRamp(r: number, g: number, b: number): CelRamp {
  const lab = rgbToOKLab(r, g, b);
  const lch = okLabToOKLCH(lab.L, lab.a, lab.b);

  // Preserve the authored hue/chroma family. Earlier blue-violet hue shifts
  // visibly repainted sprites and made the lighting look like corruption.

  // 1. Soft / Half-Tone Transition Shadow (penumbra step between base and core shadow)
  const softL = Math.max(0.05, Math.min(lch.L * 0.93, lch.L - 0.015));
  const softLab = oklchToOKLab(softL, lch.C, lch.h);
  const softRgb = okLabToRGB(softLab.L, softLab.a, softLab.b);

  // 2. Directional Mid-Shadow (core shadow)
  const shadowL = Math.max(0.04, Math.min(lch.L * 0.86, lch.L - 0.025));
  const shadowH = lch.h;
  const shadowC = lch.C;
  const shadowLab = oklchToOKLab(shadowL, shadowC, shadowH);
  const shadowRgb = okLabToRGB(shadowLab.L, shadowLab.a, shadowLab.b);

  // 3. Deep Crevice / Umbra Tone (occluded seams, under-chin, inner folds)
  const deepL = Math.max(0.02, Math.min(lch.L * 0.72, lch.L - 0.05));
  const deepH = lch.h;
  const deepC = lch.C;
  const deepLab = oklchToOKLab(deepL, deepC, deepH);
  const deepRgb = okLabToRGB(deepLab.L, deepLab.a, deepLab.b);

  // 4. Highlight raises lightness without changing the artwork's hue identity.
  const hiL = Math.min(0.98, lch.L + (0.98 - lch.L) * 0.22);
  const hiH = lch.h;
  const hiC = lch.C;
  const hiLab = oklchToOKLab(hiL, hiC, hiH);
  const hiRgb = okLabToRGB(hiLab.L, hiLab.a, hiLab.b);

  return {
    baseR: r,
    baseG: g,
    baseB: b,
    softR: softRgb.r,
    softG: softRgb.g,
    softB: softRgb.b,
    shadowR: shadowRgb.r,
    shadowG: shadowRgb.g,
    shadowB: shadowRgb.b,
    deepR: deepRgb.r,
    deepG: deepRgb.g,
    deepB: deepRgb.b,
    hiR: hiRgb.r,
    hiG: hiRgb.g,
    hiB: hiRgb.b,
  };
}

interface CharacterRampSample {
  key: number;
  count: number;
  L: number;
  a: number;
  b: number;
  C: number;
  h: number;
}


function hueDistance(a: number, b: number): number {
  const distance = Math.abs(a - b) % 360;
  return Math.min(distance, 360 - distance);
}

/**
 * Finds likely authored palette ramps without flattening them. The returned
 * lightness bounds are only a guardrail for ratio-image relighting: they let us
 * lift a painted shadow toward an existing light tone, while preserving every
 * pixel's hue, chroma, texture, and local value differences.
 */
function buildArtworkRampBounds(
  data: Uint8ClampedArray,
  isFeatureMask: Uint8Array | null
): Map<number, CharacterRampBounds> {
  const stats = new Map<number, { r: number; g: number; b: number; count: number }>();

  for (let pIdx = 0, idx = 0; pIdx < data.length; pIdx += 4, idx++) {
    if (data[pIdx + 3] <= 30 || isFeatureMask?.[idx] === 1) continue;

    const r = data[pIdx];
    const g = data[pIdx + 1];
    const b = data[pIdx + 2];
    const key = (r << 16) | (g << 8) | b;
    const existing = stats.get(key);
    if (existing) {
      existing.count++;
    } else {
      stats.set(key, { r, g, b, count: 1 });
    }
  }

  const samples: CharacterRampSample[] = Array.from(stats.entries()).map(([key, color]) => {
    const lab = rgbToOKLab(color.r, color.g, color.b);
    const lch = okLabToOKLCH(lab.L, lab.a, lab.b);
    return {
      key,
      count: color.count,
      L: lch.L,
      a: lab.a,
      b: lab.b,
      C: lch.C,
      h: lch.h,
    };
  });

  const clusters: CharacterRampSample[][] = [];
  for (const sample of samples.sort((a, b) => b.count - a.count)) {
    // Near-neutral ramps cannot be separated reliably by hue. Leaving them
    // untouched prevents white, grey, and black costume regions from merging.
    if (sample.C < 0.025) continue;

    let bestCluster: CharacterRampSample[] | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const cluster of clusters) {
      const anchor = cluster[0];
      const hDistance = hueDistance(sample.h, anchor.h);
      const cDistance = Math.abs(sample.C - anchor.C);
      const distance = hDistance / 24 + cDistance / 0.10;
      if (hDistance <= 24 && cDistance <= 0.10 && distance < bestDistance) {
        bestCluster = cluster;
        bestDistance = distance;
      }
    }

    if (bestCluster) {
      bestCluster.push(sample);
    } else {
      clusters.push([sample]);
    }
  }

  const rampBounds = new Map<number, CharacterRampBounds>();
  for (const cluster of clusters) {
    if (cluster.length < 2) continue;

    const minL = Math.min(...cluster.map((sample) => sample.L));
    const maxL = Math.max(...cluster.map((sample) => sample.L));
    if (maxL - minL < 0.08) continue;

    const candidates = cluster.filter((sample) => sample.L >= maxL - 0.12);
    const reference = candidates.reduce((best, sample) => {
      if (sample.count !== best.count) return sample.count > best.count ? sample : best;
      return sample.L > best.L ? sample : best;
    });

    for (const sample of cluster) {
      rampBounds.set(sample.key, {
        minL,
        maxL,
        referenceL: reference.L,
        referenceA: reference.a,
        referenceB: reference.b,
      });
    }
  }

  return rampBounds;
}

export function computePhotometricAnalysis(
  srcCtx: CanvasRenderingContext2D,
  width: number,
  height: number,
  params: PhotometricLightingParams,
  precomputedInference?: ReturnType<typeof inferPhotometricSettings>,
  precomputedData?: Uint8ClampedArray
): PhotometricAnalysisGeometry {
  const data = (precomputedData && precomputedData.length === width * height * 4)
    ? precomputedData
    : srcCtx.getImageData(0, 0, width, height).data;
  const sourceLighting = precomputedInference ?? inferPhotometricSettings(data, width, height);

  const isOpaque = (x: number, y: number) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return false;
    return data[(y * width + x) * 4 + 3] > 30;
  };

  let formType = params.formType;
  let inferredCavity = 1.0;
  if (!formType || formType === 'auto' || params.cavityStrength === undefined) {
    const inferred = sourceLighting;
    if (!formType || formType === 'auto') formType = inferred.formType;
    inferredCavity = inferred.cavityStrength;
  }

  const effectiveCavity = params.cavityStrength ?? inferredCavity ?? 1.0;

  let normalField: NormalVectorField;
  let baseNormalField: NormalVectorField | undefined = undefined;
  let appendageData: AppendageData | null = null;
  let cavityAO: Float32Array;
  let isFeatureMask: Uint8Array | null = null;
  let isInkLineMask: Uint8Array | null = null;

  if (formType === 'character') {
    const analysis = computeContentAwareHeightmap(data, width, height, effectiveCavity, 2.0, params.lightAzimuth);
    normalField = analysis.normalField;
    baseNormalField = analysis.baseNormalField;
    appendageData = analysis.appendageData ?? null;
    cavityAO = analysis.cavityAO;
    isFeatureMask = analysis.isFeature;
    isInkLineMask = analysis.isInkLine;
  } else if (formType === 'orb') {
    const distanceMap = computeSeparableEDT(isOpaque, width, height);
    const rawHeightmap = generateInflatedHeightmap(distanceMap, width, height, 0.5);
    const smoothHeightmap = applyBilateralFilter(rawHeightmap, width, height, 1.5, 2.0);
    normalField = computeTangentNormalField(smoothHeightmap, width, height, 2.0);
    cavityAO = computeDiscreteLaplaceCavity(smoothHeightmap, width, height, effectiveCavity);
  } else {
    // Props and general shapes: computeContentAwareHeightmap decomposes artwork into parts, lines, and crevices
    const analysis = computeContentAwareHeightmap(data, width, height, effectiveCavity, 2.0, params.lightAzimuth);
    normalField = analysis.normalField;
    baseNormalField = analysis.baseNormalField;
    appendageData = analysis.appendageData ?? null;
    cavityAO = analysis.cavityAO;
    isFeatureMask = analysis.isFeature;
    isInkLineMask = analysis.isInkLine;
  }

  // Keep reflected light independent of palette boundaries. Reuse orb geometry;
  // other forms get a cached silhouette estimate, overridden by painted normals.
  const glintNormalField = params.glintStyle !== undefined
    ? formType === 'orb' ? normalField : computeTangentNormalField(
        applyBilateralFilter(generateInflatedHeightmap(computeSeparableEDT(isOpaque, width, height), width, height, 0.5), width, height, 1.5, 2),
        width, height, 2
      )
    : undefined;

  // Pre-blend custom manual sculpt normals (from dedicated normal layers or chisel strokes) using RNM
  if (params.normalMapData) {
    const nData = params.normalMapData instanceof ImageData
      ? params.normalMapData.data
      : params.normalMapData;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const pIdx = (y * width + x) * 4;
        const idx = y * width + x;
        if (nData[pIdx + 3] > 20) {
          const detail = decodeNormalRGB(nData[pIdx], nData[pIdx + 1], nData[pIdx + 2], true);
          const base: [number, number, number] = [
            normalField.nx[idx],
            normalField.ny[idx],
            normalField.nz[idx],
          ];
          const blended = blendNormalsRNM(base, detail);
          normalField.nx[idx] = blended[0];
          normalField.ny[idx] = blended[1];
          normalField.nz[idx] = blended[2];

          if (baseNormalField) {
            const baseOrig: [number, number, number] = [
              baseNormalField.nx[idx],
              baseNormalField.ny[idx],
              baseNormalField.nz[idx],
            ];
            const blendedBase = blendNormalsRNM(baseOrig, detail);
            baseNormalField.nx[idx] = blendedBase[0];
            baseNormalField.ny[idx] = blendedBase[1];
            baseNormalField.nz[idx] = blendedBase[2];
          }
        }
      }
    }
  }

  return {
    formType,
    normalField,
    baseNormalField,
    glintNormalField,
    appendageData,
    cavityAO,
    isFeatureMask,
    isInkLineMask,
    sourceLightAzimuth: sourceLighting.lightAzimuth,
    sourceLightElevation: sourceLighting.lightElevation,
    directionalShadingCue: sourceLighting.directionalShadingCue,
    artworkRampBounds: buildArtworkRampBounds(data, isFeatureMask),
  };
}

export function executePhotometricPipeline(
  srcCtx: CanvasRenderingContext2D,
  width: number,
  height: number,
  params: PhotometricLightingParams,
  paletteHex: string[] = [],
  precomputedData?: Uint8ClampedArray
): HTMLCanvasElement {
  const data = (precomputedData && precomputedData.length === width * height * 4)
    ? precomputedData
    : srcCtx.getImageData(0, 0, width, height).data;

  const isOpaque = (x: number, y: number) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return false;
    return data[(y * width + x) * 4 + 3] > 30;
  };

  const skinMode = params.minecraftSkinMode ?? 'auto';
  let isMcSkin = false;
  if (width === 64 && (height === 64 || height === 32)) {
    if (skinMode === 'enabled') {
      isMcSkin = true;
    } else if (skinMode === 'auto' && params.formType !== 'character' && params.formType !== 'orb' && params.formType !== 'prop') {
      isMcSkin = detectMinecraftSkin(isOpaque, width, height);
    }
  }

  if (isMcSkin) {
    return executeMinecraftSkinShadingPipeline(srcCtx, width, height, params);
  }

  let formType: 'character' | 'orb' | 'prop';
  let normalField: NormalVectorField;
  let cavityAO: Float32Array;
  let isFeatureMask: Uint8Array | null = null;
  let isInkLineMask: Uint8Array | null = null;
  let artworkRampBounds: Map<number, CharacterRampBounds> | undefined;

  let geometry = params.precomputedAnalysis;
  if (params.precomputedAnalysis) {
    formType = params.precomputedAnalysis.formType;
    normalField = params.precomputedAnalysis.normalField;
    if (params.precomputedAnalysis.baseNormalField && params.precomputedAnalysis.appendageData) {
      applyAppendageStabilization(
        normalField,
        params.precomputedAnalysis.baseNormalField,
        params.precomputedAnalysis.appendageData,
        params.lightAzimuth
      );
    }
    cavityAO = params.precomputedAnalysis.cavityAO;
    isFeatureMask = params.precomputedAnalysis.isFeatureMask ?? null;
    isInkLineMask = params.precomputedAnalysis.isInkLineMask ?? null;
    artworkRampBounds = params.precomputedAnalysis.artworkRampBounds;
  } else {
    const analysis = computePhotometricAnalysis(srcCtx, width, height, params);
    geometry = analysis;
    formType = analysis.formType;
    normalField = analysis.normalField;
    cavityAO = analysis.cavityAO;
    isFeatureMask = analysis.isFeatureMask ?? null;
    isInkLineMask = analysis.isInkLineMask ?? null;
    artworkRampBounds = analysis.artworkRampBounds;
  }

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

  const celRampCache = new Map<number, CelRamp>();
  const getCelRamp = (r: number, g: number, b: number): CelRamp => {
    const key = (r << 16) | (g << 8) | b;
    let ramp = celRampCache.get(key);
    if (!ramp) {
      ramp = buildCelRamp(r, g, b);
      celRampCache.set(key, ramp);
    }
    return ramp;
  };
  artworkRampBounds = paletteOKLab.length === 0
    ? artworkRampBounds ?? buildArtworkRampBounds(data, isFeatureMask)
    : undefined;

  // Headless fallback uses only canvas/context methods shared with HTMLCanvasElement.
  const outputCanvas = typeof document !== 'undefined'
    ? document.createElement('canvas')
    : (new OffscreenCanvas(width, height) as unknown as HTMLCanvasElement);
  outputCanvas.width = width;
  outputCanvas.height = height;
  const outCtx = outputCanvas.getContext('2d')!;
  const outImgData = outCtx.createImageData(width, height);
  const outData = outImgData.data;

  const hasCustomCenter = params.lightCenterX !== undefined && params.lightCenterY !== undefined;
  const lCenterX = hasCustomCenter ? params.lightCenterX! : width / 2;
  const lCenterY = hasCustomCenter ? params.lightCenterY! : height / 2;
  const sceneScale = Math.max(width, height);
  const lightOrbitDistance = Math.max(8, sceneScale * 1.25);
  const pointLightX = lCenterX + Lx * lightOrbitDistance;
  const pointLightY = lCenterY + Ly * lightOrbitDistance;
  const pointLightZ = Lz * lightOrbitDistance;
  const radiusScale = Math.max(0.35, Math.min(2, (params.lightRadius ?? 64) / 64));
  const focusRadius = Math.max(4, sceneScale * 0.65 * radiusScale);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const pIdx = idx * 4;

      if (!isOpaque(x, y)) {
        outData[pIdx + 3] = 0;
        continue;
      }

      // 1. Feature protection: eyes, pupils, mouth, nose retain exact artist colors
      if (isFeatureMask && isFeatureMask[idx] === 1) {
        outData[pIdx] = data[pIdx];
        outData[pIdx + 1] = data[pIdx + 1];
        outData[pIdx + 2] = data[pIdx + 2];
        outData[pIdx + 3] = data[pIdx + 3];
        continue;
      }

      // 2. Outline & whisker protection: keep dark line art crisp
      if (isInkLineMask && isInkLineMask[idx] === 1) {
        const origLum = (0.2126 * data[pIdx] + 0.7152 * data[pIdx + 1] + 0.0722 * data[pIdx + 2]) / 255;
        if (origLum < 0.22) {
          outData[pIdx] = data[pIdx];
          outData[pIdx + 1] = data[pIdx + 1];
          outData[pIdx + 2] = data[pIdx + 2];
          outData[pIdx + 3] = data[pIdx + 3];
          continue;
        }
      }

      const Nx = normalField.nx[idx];
      const Ny = normalField.ny[idx];
      const Nz = normalField.nz[idx];

      const ao = cavityAO[idx];

      let pixLx = Lx;
      let pixLy = Ly;
      let pixLz = Lz;
      let pixNormHx = normHx;
      let pixNormHy = normHy;
      let pixNormHz = normHz;
      let effectiveFalloff = 1.0;

      if (hasCustomCenter) {
        // Treat the dragged center as the point light's target position. The
        // bulb's azimuth/elevation offsets a virtual light from that target;
        // translating the center therefore changes both local direction and
        // spatial intensity instead of merely nudging a global multiplier.
        const toLightX = pointLightX - x;
        const toLightY = pointLightY - y;
        const toLightZ = pointLightZ;
        const toLightLength = Math.sqrt(
          toLightX * toLightX + toLightY * toLightY + toLightZ * toLightZ
        ) || 1;
        pixLx = toLightX / toLightLength;
        pixLy = toLightY / toLightLength;
        pixLz = toLightZ / toLightLength;

        const localHx = pixLx + Vx;
        const localHy = pixLy + Vy;
        const localHz = pixLz + Vz;
        const localHLength = Math.sqrt(
          localHx * localHx + localHy * localHy + localHz * localHz
        ) || 1;
        pixNormHx = localHx / localHLength;
        pixNormHy = localHy / localHLength;
        pixNormHz = localHz / localHLength;

        const focusDx = lCenterX - x;
        const focusDy = lCenterY - y;
        const focusDistance = Math.sqrt(focusDx * focusDx + focusDy * focusDy);
        const normalizedFocusDistance = focusDistance / focusRadius;
        const inverseQuadratic = 1 / (
          1 + 1.8 * normalizedFocusDistance * normalizedFocusDistance
        );
        // Retain a small fill contribution outside the focus so moving the
        // handle never punches a hard circular hole into pixel art.
        effectiveFalloff = 0.18 + inverseQuadratic * 0.82;
      }

      // Half-Lambert Wrap Lighting (Valve Mitchell/McTaggart/Green 2006 formulation)
      // w = 0.55 softens the shadow terminator so light wraps gently around rounded volumes.
      const rawNdotL = Nx * pixLx + Ny * pixLy + Nz * pixLz;
      const wrapNdotL = Math.pow(Math.max(0, (rawNdotL + 0.55) / 1.55), 1.25);
      // Light strength controls the lamp, not the room. Multiplying ambient by
      // strength (and then multiplying the final result again) previously
      // clipped most pixels at 250%, erasing the bulb direction.
      const effectiveAmbient = Math.max(0.08, Math.min(0.65, params.ambientIntensity ?? 0.42));

      const sourceKey = (data[pIdx] << 16) | (data[pIdx + 1] << 8) | data[pIdx + 2];
      const rampBounds = artworkRampBounds?.get(sourceKey);
      let byteR = data[pIdx];
      let byteG = data[pIdx + 1];
      let byteB = data[pIdx + 2];

      if (rampBounds && (params.sourceShadingRemoval ?? 0) > 0) {
        const sourceLab = rgbToOKLab(byteR, byteG, byteB);
        const sourceLch = okLabToOKLCH(sourceLab.L, sourceLab.a, sourceLab.b);
        const rampSpan = Math.max(0.08, rampBounds.maxL - rampBounds.minL);
        const authoredDarkness = Math.max(0, Math.min(1, (rampBounds.maxL - sourceLch.L) / rampSpan));
        // At 100%, every non-feature color in a detected hue ramp converges on
        // one albedo representative. The current N┬╖L then creates all visible
        // cel tones, so an old purple shadow cannot remain fixed in place.
        const removalAmount = authoredDarkness > 0.02
          ? Math.max(0, Math.min(1, params.sourceShadingRemoval ?? 0))
          : 0;

        if (removalAmount > 0.01) {
          // Bounded intrinsic-style normalization: only colors belonging to a
          // detected chromatic ramp are lifted toward that ramp's representative
          // albedo. Protected features, ink, neutral colors, hue and chroma
          // families remain separate.
          const recoveredLab = {
            L: sourceLab.L + (rampBounds.referenceL - sourceLab.L) * removalAmount,
            a: sourceLab.a + (rampBounds.referenceA - sourceLab.a) * removalAmount,
            b: sourceLab.b + (rampBounds.referenceB - sourceLab.b) * removalAmount,
          };
          const recoveredRgb = okLabToRGB(recoveredLab.L, recoveredLab.a, recoveredLab.b);
          byteR = recoveredRgb.r;
          byteG = recoveredRgb.g;
          byteB = recoveredRgb.b;
        }
      }

      const origR = byteR / 255;
      const origG = byteG / 255;
      const origB = byteB / 255;

      const useCelShading = (params.shadingBands !== undefined || formType === 'character') && paletteOKLab.length === 0;
      if (useCelShading) {
        // Discrete OKLCH cel-shading mode: discrete OKLCH tone stepping with cached ramps for character anatomy & pixel art forms.
        // Preserves hand-drawn pixel art palette purity instead of generating muddy 24-bit float gradients.
        //
        // Shadow placement is driven PURELY by the directional diffuse signal (wrapNdotL).
        // The ambient contribution must NOT factor into shadow threshold decisions ΓÇö it fills all
        // surfaces equally and would overwhelm the directional terminator (ambSignal Γëê 1.27 makes
        // lightLevel > shadowThresh everywhere, producing a visually flat result with zero shadow).
        const diffSignal = wrapNdotL * effectiveFalloff;

        const ramp = getCelRamp(byteR, byteG, byteB);

        // Directional cel shadow terminator threshold:
        // diffSignal ranges from 0 (surface facing away from light) to ~1 (surface facing light).
        // Modulated inversely by lamp strength (brightness): higher strength pushes the shadow boundary back
        // (fewer shadow pixels, illuminating more of the character anatomy), while dimmer strength
        // causes shadows to encroach forward across the surface (more shadow pixels).
        let shadowThresh: number;
        if (brightness <= 1.15) {
          const t = Math.max(0, Math.min(1, (1.15 - brightness) / 0.85));
          shadowThresh = 0.52 + t * 0.30;
        } else {
          const t = Math.max(0, Math.min(1, (brightness - 1.15) / 1.35));
          shadowThresh = 0.52 - t * 0.32;
        }
        if (params.ditherModulation > 0) {
          const ditherVal = getBayerMatrixThreshold(x, y, params.bayerSize);
          shadowThresh += (ditherVal - 0.5) * 0.16 * params.ditherModulation;
        }
        // Material moves the terminator: velvet wraps light further round, metal cuts it harder.
        if (params.material === 'fabric') shadowThresh -= 0.06;
        else if (mat.isMetallic) shadowThresh += 0.05;

        // Cavity AO crevice threshold: deep concave seams trigger the darkest tone. Edge depth 0
        // turns crevices off; 1 is the classic 0.28; 2 sinks every seam (capped so thin parts survive).
        const cavStrength = params.cavityStrength ?? 1.0;
        const creviceAOThresh = cavStrength <= 0.01 ? -1 : Math.min(0.42, 0.06 + 0.22 * cavStrength);

        // Highlight condition: never on matte clay or velvet fabric. Metal, gold and glass always
        // catch a highlight tone; other shiny profiles only when no separate glint is drawn.
        const shinyByMaterial = mat.isMetallic || params.material === 'glass';
        const isShinyMaterial = mat.ks > 0.1 && params.material !== 'matte' && params.material !== 'fabric'
          && (params.glintStyle === undefined || shinyByMaterial);
        const highlightCut = shinyByMaterial ? 0.95 : 1.10;

        // Highlight uses the full directional signal amplified by brightness
        const highlightLevel = diffSignal * brightness;

        // Shading bands mode: 1 = Single (1 shadow color), 2 = Dual (2 shadow colors), 3 = Trio (3 shadow colors)
        const bands = params.shadingBands ?? 2;

        let toneR: number;
        let toneG: number;
        let toneB: number;
        let inShadow = true;

        if (ao < creviceAOThresh && diffSignal < shadowThresh + 0.10) {
          // Deep crevice tone (ambient cavity occlusion)
          toneR = ramp.deepR;
          toneG = ramp.deepG;
          toneB = ramp.deepB;
        } else if (diffSignal < shadowThresh) {
          // Directional shadow tones partitioned by shading band count
          if (bands === 1) {
            // Single shading mode: 1 shadow tone across entire shadow side
            toneR = ramp.shadowR;
            toneG = ramp.shadowG;
            toneB = ramp.shadowB;
          } else if (bands === 3) {
            // Trio shading mode: 3 shadow tones (soft penumbra -> core mid-shadow -> deep umbra)
            const splitUmbra = shadowThresh * 0.32;
            const splitCore = shadowThresh * 0.65;
            if (diffSignal < splitUmbra) {
              toneR = ramp.deepR;
              toneG = ramp.deepG;
              toneB = ramp.deepB;
            } else if (diffSignal < splitCore) {
              toneR = ramp.shadowR;
              toneG = ramp.shadowG;
              toneB = ramp.shadowB;
            } else {
              toneR = ramp.softR;
              toneG = ramp.softG;
              toneB = ramp.softB;
            }
          } else {
            // Dual shading mode (default): 2 shadow tones (core mid-shadow + deep shadow)
            const splitCore = shadowThresh * 0.48;
            if (diffSignal < splitCore) {
              toneR = ramp.deepR;
              toneG = ramp.deepG;
              toneB = ramp.deepB;
            } else {
              toneR = ramp.shadowR;
              toneG = ramp.shadowG;
              toneB = ramp.shadowB;
            }
          }
        } else if (highlightLevel > highlightCut && isShinyMaterial) {
          // Specular highlight tone (only for shiny/metallic materials, suppressed on fabric/matte)
          toneR = ramp.hiR;
          toneG = ramp.hiG;
          toneB = ramp.hiB;
          inShadow = false;
        } else {
          // Base authored artist color
          toneR = ramp.baseR;
          toneG = ramp.baseG;
          toneB = ramp.baseB;
          inShadow = false;
        }

        // Fill light: above the neutral band shadows lift toward the base color, below it they sink.
        // The engine's usual ambient values (0.30-0.50) leave the cel tones exactly as authored.
        if (inShadow && effectiveAmbient > 0.5) {
          const k = Math.min(1, (effectiveAmbient - 0.5) / 0.15) * 0.55;
          toneR += (ramp.baseR - toneR) * k; toneG += (ramp.baseG - toneG) * k; toneB += (ramp.baseB - toneB) * k;
        } else if (inShadow && effectiveAmbient < 0.3) {
          const k = 1 - Math.min(1, (0.3 - effectiveAmbient) / 0.22) * 0.5;
          toneR *= k; toneG *= k; toneB *= k;
        }
        // Glass lets light through its shadows; gold warms everything.
        if (params.material === 'glass' && inShadow) {
          toneR += (ramp.baseR - toneR) * 0.35; toneG += (ramp.baseG - toneG) * 0.35; toneB += (ramp.baseB - toneB) * 0.35;
        } else if (params.material === 'gold') {
          const [gr, gg, gb] = inShadow ? [0.62, 0.38, 0.12] : [1, 0.84, 0.48];
          const k = inShadow ? 0.3 : 0.4;
          toneR += (toneR * gr - toneR) * k; toneG += (toneG * gg - toneG) * k; toneB += (toneB * gb - toneB) * k;
        }
        // Light tint: the lit side takes on the light's color, shadows keep a little of it.
        // White light changes nothing.
        if (lightR < 1 || lightG < 1 || lightB < 1) {
          const k = inShadow ? 0.25 : 0.6;
          toneR *= 1 + (lightR - 1) * k; toneG *= 1 + (lightG - 1) * k; toneB *= 1 + (lightB - 1) * k;
        }
        outData[pIdx] = Math.max(0, Math.min(255, Math.round(toneR)));
        outData[pIdx + 1] = Math.max(0, Math.min(255, Math.round(toneG)));
        outData[pIdx + 2] = Math.max(0, Math.min(255, Math.round(toneB)));
        outData[pIdx + 3] = data[pIdx + 3];
        continue;
      }

      // Standard diffuse + specular shading (for orbs, props, or when palette snapping)
      const lightIntensity = Math.max(0.3, Math.min(2.5, brightness));
      const diffR = mat.kd * wrapNdotL * (origR * lightR) * effectiveFalloff * lightIntensity;
      const diffG = mat.kd * wrapNdotL * (origG * lightG) * effectiveFalloff * lightIntensity;
      const diffB = mat.kd * wrapNdotL * (origB * lightB) * effectiveFalloff * lightIntensity;

      const NdotH = Math.max(0, Nx * pixNormHx + Ny * pixNormHy + Nz * pixNormHz);
      const Ispec = params.glintStyle === undefined ? mat.ks * Math.pow(NdotH, mat.shininess) : 0;

      let specR = Ispec * lightR * lightIntensity;
      let specG = Ispec * lightG * lightIntensity;
      let specB = Ispec * lightB * lightIntensity;

      if (mat.isMetallic) {
        specR *= origR;
        specG *= origG;
        specB *= origB;
      }

      const effectiveAO = formType === 'orb' ? Math.max(0.85, ao) : ao;
      const ambR = origR * effectiveAmbient * effectiveAO;
      const ambG = origG * effectiveAmbient * effectiveAO;
      const ambB = origB * effectiveAmbient * effectiveAO;

      let totalR = Math.max(0, Math.min(1.0, ambR + diffR + specR));
      let totalG = Math.max(0, Math.min(1.0, ambG + diffG + specG));
      let totalB = Math.max(0, Math.min(1.0, ambB + diffB + specB));

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

  if (params.glintStyle !== undefined && geometry) {
    const glints = renderPixelGlints(data, width, height, { ...params, glintStyle: params.glintStyle }, geometry);
    applyPixelGlints(outData, width, glints);
    // Explicit palette snapping still constrains the finished highlight colors.
    if (paletteRgba.length > 0) {
      for (const pixel of glints) {
        const offset = (pixel.y * width + pixel.x) * 4;
        const lab = rgbToOKLab(outData[offset], outData[offset + 1], outData[offset + 2]);
        let nearest = 0, distance = Infinity;
        for (let k = 0; k < paletteOKLab.length; k++) {
          const candidate = deltaEOKLab(lab, paletteOKLab[k]);
          if (candidate < distance) { distance = candidate; nearest = k; }
        }
        outData[offset] = paletteRgba[nearest].r;
        outData[offset + 1] = paletteRgba[nearest].g;
        outData[offset + 2] = paletteRgba[nearest].b;
      }
    }
    for (let offset = 3; offset < data.length; offset += 4) {
      outData[offset] = data[offset];
      if (data[offset] <= 30) {
        outData[offset - 3] = data[offset - 3];
        outData[offset - 2] = data[offset - 2];
        outData[offset - 1] = data[offset - 1];
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
  material?: string;
  shadingBands?: ShadingBandMode;
  minecraftSkinMode?: 'auto' | 'enabled' | 'disabled';
}

export function renderParametric2p5DLighting(
  srcCtx: CanvasRenderingContext2D,
  width: number,
  height: number,
  params: LightParameters
): {
  shadedPixels: ShadedPixel[];
  specularPixels: ShadedPixel[];
} {
  const imgData = srcCtx.getImageData(0, 0, width, height);
  const data = imgData.data;

  const isOpaque = (x: number, y: number) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return false;
    return data[(y * width + x) * 4 + 3] > 30;
  };

  const skinMode = params.minecraftSkinMode ?? 'auto';
  let isMcSkin = false;
  if (width === 64 && (height === 64 || height === 32)) {
    if (skinMode === 'enabled') {
      isMcSkin = true;
    } else if (skinMode === 'auto') {
      isMcSkin = detectMinecraftSkin(isOpaque, width, height);
    }
  }
  const inferred = inferPhotometricSettings(data, width, height);
  const isCharacter = inferred.formType === 'character';

  const photometricParams: PhotometricLightingParams = {
    lightAzimuth: params.azimuthDeg,
    lightElevation: params.elevationDeg,
    lightRadius: 64,
    lightColor: '#FFFFFF',
    ambientIntensity: 0.45,
    lightBrightness: 1.2,
    material: (params.material as MaterialType) || 'matte',
    shadingBands: params.shadingBands,
    cavityStrength: 1.0,
    ditherModulation: 0,
    bayerSize: '4x4',
    formType: inferred.formType,
    minecraftSkinMode: params.minecraftSkinMode,
  };

  // Hoist analysis: execute computePhotometricAnalysis once locally
  // (which runs computeContentAwareHeightmap once for characters/props) and feed into executePhotometricPipeline.
  const analysis: PhotometricAnalysisGeometry | undefined = !isMcSkin
    ? computePhotometricAnalysis(srcCtx, width, height, photometricParams, inferred, data)
    : undefined;

  const charFeatureMask = isCharacter && analysis ? (analysis.isFeatureMask ?? null) : null;
  const charInkMask = isCharacter && analysis ? (analysis.isInkLineMask ?? null) : null;

  // Smooth macro silhouette normal field for specular reflections:
  // Continuous 3D cushion without eye-socket cliffs or color-boundary cuts.
  const specularNormalField = isMcSkin
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
      ...photometricParams,
      precomputedAnalysis: analysis,
    },
    [],
    data
  );

  const pData = photometricCanvas.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, width, height).data;
  const shadedPixels: ShadedPixel[] = [];
  const specularPixels: ShadedPixel[] = [];

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

        // Exclude facial features (eyes, mouth) and line art/outlines from receiving specular highlight
        if (charFeatureMask && charFeatureMask[idx] === 1) continue;
        if (charInkMask && charInkMask[idx] === 1) continue;
        const isBlackOutline = data[pIdx] < 30 && data[pIdx + 1] < 30 && data[pIdx + 2] < 30;
        if (isBlackOutline) continue;

        // When illuminated from above (Ly < 0) on characters, exclude bottom limbs from stealing
        // key specular reflections from the head/face/torso.
        if (isCharacter && Ly < 0 && y > height * 0.70) continue;

        const Nx = specularNormalField.nx[idx];
        const Ny = specularNormalField.ny[idx];
        const Nz = specularNormalField.nz[idx];

        // 1. Physical 2.5D Line-of-Sight Visibility Gate:
        // A surface must be oriented towards the light in both 3D space and on the 2D illuminated slope:
        const NdotL3D = Nx * Lx + Ny * Ly + Nz * Lz;
        const NdotL2D = Nx * Lx + Ny * Ly;
        const isZenith = elRad > (75 * Math.PI) / 180;
        if (NdotL3D <= 0 || (!isZenith && NdotL2D <= 0)) continue;

        const NdotH = Math.max(0, Nx * normHx + Ny * normHy + Nz * normHz);
        const Ispec = Math.pow(NdotH, shininess);

        if (Ispec > 0.35) {
          const alpha = Math.min(255, Math.round(Ispec * 255));
          let r = 255;
          let g = 255;
          let b = 255;

          if (isMetallic) {
            r = Math.min(255, Math.round(pData[pIdx] * 0.35 + 255 * 0.65));
            g = Math.min(255, Math.round(pData[pIdx + 1] * 0.35 + 245 * 0.65));
            b = Math.min(255, Math.round(pData[pIdx + 2] * 0.35 + 160 * 0.65));
          }

          specularPixels.push({
            x,
            y,
            r,
            g,
            b,
            a: alpha,
          });
        }
      }
    }
  }

  return { shadedPixels, specularPixels };
}
