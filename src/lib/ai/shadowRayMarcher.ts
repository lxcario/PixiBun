/**
 * PixiBun 2D Ray Marching & Physically Accurate Soft Shadows Engine
 * 
 * High-performance CPU ray marcher operating on discrete 2D Euclidean Distance Fields (EDT/UDF):
 * 1. Branchless C0 continuous bilinear distance field sampling.
 * 2. Sebastian Aaltonen geometric contact-hardening tangent correction (Claybook / GDC 2018).
 * 3. True physical area light cone tracing (RL disk radius).
 * 4. Cubic Hermite smoothstep area occlusion falloff.
 * 5. Bayer matrix ordered dither modulation for authentic retro pixel art stippling.
 * 6. Zero-allocation Float32Array buffer pooling for V8 JIT efficiency.
 */

import { acquireFloat32Buffer, releaseFloat32Buffer } from '../engine/bufferPool';
import { getBayerMatrixThreshold } from './smartMathEngine';

export interface RaymarchedShadowParams {
  lightX?: number;
  lightY?: number;
  lightRadius?: number; // Physical light source radius (e.g. 4 to 64px)
  lightAzimuth?: number; // 0° to 360° (0° = North, 90° = East, 315° = Northwest)
  lightElevation?: number; // 15° to 85° (overhead)
  shadowOpacity?: number; // 0.0 to 1.0 (default: 0.65)
  shadowColor?: string | [number, number, number]; // Hex string or [r, g, b] (default: #180B26)
  ditherMode?: 'none' | '2x2' | '4x4' | '8x8';
  maxSteps?: number; // Maximum sphere-tracing steps (default: 64)
  perspectiveForeshortening?: number; // default: 0.5 (3/4 top-down perspective)
  volumetricDepthBias?: number; // default: 0.25 (prevents 1D line collapse)
  mode?: 'bounded-2.5d' | 'raymarch-2d'; // default: 'bounded-2.5d'
  isFloating?: boolean;
}

/**
 * Creates an ImageData object safely in both Browser and Node/Testing environments.
 */
function createImageDataBuffer(width: number, height: number): ImageData {
  if (typeof ImageData !== 'undefined') {
    return new ImageData(width, height);
  }
  return {
    width,
    height,
    data: new Uint8ClampedArray(width * height * 4),
  } as ImageData;
}

/**
 * Parses Hex or RGB tuple into normalized 0-255 [r, g, b] array.
 */
function parseShadowColor(color?: string | [number, number, number]): [number, number, number] {
  if (!color) return [24, 11, 38]; // Default deep atmospheric indigo/plum #180B26
  if (Array.isArray(color)) return color;
  
  let clean = color.replace('#', '');
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  const num = parseInt(clean, 16);
  if (isNaN(num)) return [24, 11, 38];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

/**
 * Branchless Bilinear UDF Sampling.
 * Restores C0 continuity to the discrete distance grid to prevent ray-stepping acne.
 */
export function sampleEDTBilinear(
  edt: Float32Array,
  width: number,
  height: number,
  x: number,
  y: number
): number {
  // Clamp coordinates to valid grid bounds to avoid out-of-bounds memory errors
  const cx = Math.max(0.0, Math.min(width - 1, x));
  const cy = Math.max(0.0, Math.min(height - 1, y));

  // Integer coordinates for the top-left of the 2x2 sampling grid (Bitwise OR for fast V8 int cast)
  const x0 = cx | 0;
  const y0 = cy | 0;

  const x1 = Math.min(x0 + 1, width - 1);
  const y1 = Math.min(y0 + 1, height - 1);

  // Fractional interpolation weights
  const u = cx - x0;
  const v = cy - y0;

  // 1D array index calculations
  const row0 = y0 * width;
  const row1 = y1 * width;

  // Fetch the 4 neighboring discrete distances
  const d00 = edt[row0 + x0];
  const d10 = edt[row0 + x1];
  const d01 = edt[row1 + x0];
  const d11 = edt[row1 + x1];

  // Bilinear interpolation calculation
  const d0 = d00 + u * (d10 - d00);
  const d1 = d01 + u * (d11 - d01);

  return d0 + v * (d1 - d0);
}

/**
 * Physically Accurate 2D Cone Tracing with Sebastian Aaltonen Tangent Geometric Correction.
 * Traces a ray from receiver (px, py) towards light (lx, ly).
 * Returns visibility in [0.0, 1.0] (1.0 = fully lit, 0.0 = fully occluded umbra).
 */
export function tracePhysical2DSoftShadow(
  edt: Float32Array,
  width: number,
  height: number,
  px: number,
  py: number,
  lx: number,
  ly: number,
  lightRadius: number,
  maxSteps: number = 64
): number {
  const dx = lx - px;
  const dy = ly - py;
  const totalDist = Math.sqrt(dx * dx + dy * dy);

  // If the light is right at the pixel coordinate, it is fully lit
  if (totalDist < 0.0001) return 1.0;

  const dirX = dx / totalDist;
  const dirY = dy / totalDist;

  // Initial sample to check if receiver is inside solid geometry
  let h = sampleEDTBilinear(edt, width, height, px, py);
  if (h <= 0.0) return 0.0;

  // Start slightly off the surface to prevent self-shadowing
  let t = Math.max(1.0, h * 0.9);
  let visibility = 1.0;

  // Initialize previous clearance to a large number to prevent division by zero on step 1
  let ph = 1e10;

  for (let step = 0; step < maxSteps; step++) {
    // If the ray has reached the light source coordinate, terminate march
    if (t >= totalDist) break;

    const curX = px + t * dirX;
    const curY = py + t * dirY;

    h = sampleEDTBilinear(edt, width, height, curX, curY);

    // Solid hit threshold - if the ray enters a solid geometry wall
    if (h < 0.1) return 0.0;

    // Aaltonen geometric correction to find exact closest approach distance 'd'
    // 'y' is the distance along the ray segment back to the closest point
    const y = (h * h) / (2.0 * ph);

    // 'd' is the perpendicular distance from the ray to the tangent surface
    const dSquared = Math.max(0.0, h * h - y * y);
    const d = Math.sqrt(dSquared);

    // 'tClosest' is the absolute distance from origin to the point of closest approach
    const tClosest = Math.max(0.001, t - y);

    // Physical radius of the expanding light cone at tClosest
    const rCone = lightRadius * (tClosest / totalDist);

    if (rCone > 0.0001) {
      // Linear visibility ratio: how much of the cone is unobstructed
      const s = Math.max(0.0, d / rCone);

      if (s < 1.0) {
        // Cubic Hermite smoothstep to model circular area light occlusion falloff
        const smoothPenumbra = s * s * (3.0 - 2.0 * s);
        visibility = Math.min(visibility, smoothPenumbra);
      }
    }

    // Early out if fully occluded (umbra reached)
    if (visibility < 0.005) return 0.0;

    ph = h;

    // Advance ray. Enforce a minimum step of 0.5px to prevent infinite stalls on grazing angles
    t += Math.max(0.5, h);
  }

  return Math.max(0.0, Math.min(1.0, visibility));
}

/**
 * Generates a full-canvas float visibility map [0.0, 1.0] using zero-allocation buffer pooling.
 * NOTE: The caller MUST release the returned Float32Array using releaseFloat32Buffer() when finished.
 */
export function generateRaymarchedShadowMap(
  edt: Float32Array,
  width: number,
  height: number,
  lx: number,
  ly: number,
  lightRadius: number,
  maxSteps: number = 64
): Float32Array {
  const shadowMap = acquireFloat32Buffer(width * height);
  try {
    for (let y = 0; y < height; y++) {
      const row = y * width;
      for (let x = 0; x < width; x++) {
        const idx = row + x;
        // If inside an obstacle/solid pixel, it is completely shadowed
        if (edt[idx] <= 0) {
          shadowMap[idx] = 0.0;
        } else {
          shadowMap[idx] = tracePhysical2DSoftShadow(
            edt,
            width,
            height,
            x,
            y,
            lx,
            ly,
            lightRadius,
            maxSteps
          );
        }
      }
    }

    return shadowMap;
  } catch (err) {
    releaseFloat32Buffer(shadowMap);
    throw err;
  }
}

/**
 * Renders a physically grounded 2.5D Bounded Sprite Cast Shadow.
 *
 * Professional game engine technique (Godot 4, Unity 2D, Aseprite):
 * 1. Anchored at the sprite's ground contact baseline (yBase = maxY) with zero drift at feet.
 * 2. Directional ground shear derived from key light Azimuth (theta_az) and Elevation (theta_el).
 * 3. Finite, bounded shadow reach L = Hs * cot(theta_el) * k_persp (prevents infinite canvas flooding).
 * 4. Sebastian Aaltonen contact-hardening: sharp contact umbra at feet, softening with distance.
 * 5. Volumetric depth bias: prevents 1D line collapse when sun is at East/West (90°/270°).
 * 6. Ambient contact occlusion ellipse at the base for grounding under high-noon overhead light.
 * 7. Authentic ordered Bayer 4x4 matrix dithering.
 * 8. Zero allocation Float32Array buffer pooling and non-destructive output.
 */
export function renderBoundedSpriteCastShadow(
  edt: Float32Array,
  width: number,
  height: number,
  params: RaymarchedShadowParams
): ImageData {
  const {
    shadowOpacity = 0.65,
    shadowColor,
    ditherMode = '4x4',
    perspectiveForeshortening = 0.5,
    volumetricDepthBias = 0.25,
  } = params;

  // 1. Scan Sprite Bounding Box & Baseline from EDT field (solid pixels have edt <= 0.001)
  let minX = width;
  let maxX = -1;
  let minY = height;
  let maxY = -1;
  let count = 0;
  let sumX = 0;
  let sumY = 0;

  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      if (edt[row + x] <= 0.001) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        count++;
        sumX += x;
        sumY += y;
      }
    }
  }

  const outImgData = createImageDataBuffer(width, height);
  if (count === 0) return outImgData;

  const boxW = Math.max(1, maxX - minX + 1);
  const boxH = Math.max(1, maxY - minY + 1);
  const cx = sumX / count;
  const cy = sumY / count;
  const yBase = maxY;

  const distanceFromBottom = height - 1 - maxY;
  const isFloating = params.isFloating === true;

  // For floating sprites, ground is lower than the sprite; for grounded, ground is at baseline
  const yGround = isFloating
    ? Math.min(height - 2, maxY + Math.min(8, Math.max(3, Math.round(distanceFromBottom * 0.6))))
    : yBase;

  // 2. Resolve Azimuth and Elevation
  let azimuthDeg = params.lightAzimuth;
  let elevationDeg = params.lightElevation;

  if (azimuthDeg === undefined || elevationDeg === undefined) {
    const lx = params.lightX ?? Math.round(width / 2);
    const ly = params.lightY ?? Math.round(height / 4);
    const dx = lx - cx;
    const dy = ly - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (azimuthDeg === undefined) {
      if (dist < 0.001) {
        azimuthDeg = 0;
      } else {
        const azRad = Math.atan2(dx, -dy);
        azimuthDeg = Math.round(((azRad * 180) / Math.PI + 360) % 360);
      }
    }

    if (elevationDeg === undefined) {
      const maxDim = Math.max(width, height);
      elevationDeg = Math.round(Math.max(15, Math.min(85, 90 - (dist / maxDim) * 70)));
    }
  }

  // 3. Compute Directional Shear Factors
  const azRad = (azimuthDeg * Math.PI) / 180;
  const elRad = (Math.max(12, Math.min(88, elevationDeg)) * Math.PI) / 180;
  const cotEl = 1.0 / Math.tan(elRad);

  // Shadow direction on ground is opposite the light
  const sx = -Math.sin(azRad);
  let sy = Math.cos(azRad);

  // Volumetric character depth bias prevents 1D line collapse when sun is at East/West (90°/270°)
  const signY = sy >= 0 ? 1 : -1;
  sy = signY * Math.max(Math.abs(sy), volumetricDepthBias);

  const shearX = cotEl * sx;
  const shearY = cotEl * sy * perspectiveForeshortening;

  // 4. Rasterize Bounded Ground Shadow into Pooled Float32 Density Map
  const densityMap = acquireFloat32Buffer(width * height);
  densityMap.fill(0);

  try {
    // A. Directional Sheared Silhouette Projection
    for (let y_s = minY; y_s <= maxY; y_s++) {
      const h = yBase - y_s; // Height above baseline: 0 at feet, boxH at head
      const u = Math.min(1.0, h / boxH); // Normalized height: [0, 1]

      // Distance attenuation: contact base is 1.0, fading to 0.0 at tip
      const falloff = Math.max(0.0, 1.0 - Math.pow(u, 1.4));

      // Aaltonen contact hardening penumbra factor (sharp at base, softening with distance)
      const penumbraSoftness = 1.0 - 0.35 * u;
      const scanlineAlpha = falloff * penumbraSoftness;

      if (scanlineAlpha <= 0.01) continue;

      // Project contiguous spans of opaque pixels on row y_s
      let x = minX;
      while (x <= maxX) {
        if (edt[y_s * width + x] <= 0.001) {
          const xStart = x;
          while (x <= maxX && edt[y_s * width + x] <= 0.001) {
            x++;
          }
          const xEnd = x - 1;

          const xMinProj = Math.floor(xStart + h * shearX - (Math.abs(shearX) > 0.5 ? 0.5 : 0));
          const xMaxProj = Math.ceil(xEnd + h * shearX + (Math.abs(shearX) > 0.5 ? 0.5 : 0));

          const yMinProj = Math.floor(Math.min(yGround + (h - 0.5) * shearY, yGround + (h + 0.5) * shearY));
          const yMaxProj = Math.ceil(Math.max(yGround + (h - 0.5) * shearY, yGround + (h + 0.5) * shearY));

          for (let py = yMinProj; py <= yMaxProj; py++) {
            if (py < 0 || py >= height) continue;
            const rowOffset = py * width;
            for (let px = xMinProj; px <= xMaxProj; px++) {
              if (px < 0 || px >= width) continue;
              const pIdx = rowOffset + px;
              if (scanlineAlpha > densityMap[pIdx]) {
                densityMap[pIdx] = scanlineAlpha;
              }
            }
          }
        } else {
          x++;
        }
      }
    }

    // B. Ambient Contact Occlusion Ellipse at Ground Baseline
    const rx = Math.max(2.5, boxW * 0.45);
    const ry = Math.max(1.2, rx * 0.25);
    const contactStrength = isFloating ? 0.45 : 0.85;

    const minYContact = Math.max(0, Math.floor(yGround - ry));
    const maxYContact = Math.min(height - 1, Math.ceil(yGround + ry));
    const minXContact = Math.max(0, Math.floor(cx - rx));
    const maxXContact = Math.min(width - 1, Math.ceil(cx + rx));

    for (let cy_ = minYContact; cy_ <= maxYContact; cy_++) {
      const dy = (cy_ - yGround) / ry;
      const rowOffset = cy_ * width;
      for (let cx_ = minXContact; cx_ <= maxXContact; cx_++) {
        const dx = (cx_ - cx) / rx;
        const distSq = dx * dx + dy * dy;
        if (distSq <= 1.0) {
          const dist = Math.sqrt(distSq);
          const ao = (1.0 - dist) * contactStrength;
          const pIdx = rowOffset + cx_;
          if (ao > densityMap[pIdx]) {
            densityMap[pIdx] = ao;
          }
        }
      }
    }

    // 5. Composite into Output Buffer with Color, Opacity & Bayer Dither
    const data = outImgData.data;
    const [sr, sg, sb] = parseShadowColor(shadowColor);
    const opacity = Math.max(0.0, Math.min(1.0, shadowOpacity));

    for (let y = 0; y < height; y++) {
      const row = y * width;
      for (let x = 0; x < width; x++) {
        const idx = row + x;
        const pIdx = idx * 4;

        // Solid sprite pixels must remain 100% transparent in the shadow layer
        if (edt[idx] <= 0.001) {
          data[pIdx + 3] = 0;
          continue;
        }

        const density = densityMap[idx];
        if (density <= 0.01) {
          data[pIdx + 3] = 0;
          continue;
        }

        const continuousAlpha = density * opacity;
        let finalAlpha = 0;

        if (ditherMode !== 'none') {
          const threshold = getBayerMatrixThreshold(x, y, ditherMode);
          finalAlpha = continuousAlpha >= threshold ? Math.round(opacity * 255) : 0;
        } else {
          finalAlpha = Math.round(continuousAlpha * 255);
        }

        if (finalAlpha > 0) {
          data[pIdx] = sr;
          data[pIdx + 1] = sg;
          data[pIdx + 2] = sb;
          data[pIdx + 3] = finalAlpha;
        } else {
          data[pIdx + 3] = 0;
        }
      }
    }

    return outImgData;
  } finally {
    releaseFloat32Buffer(densityMap);
  }
}

export const executeBoundedCastShadowPipeline = renderBoundedSpriteCastShadow;

/**
 * Classic 2D Planar Raymarched Soft Shadows (Sphere Tracing on discrete 2D distance field).
 */
export function executeClassic2DRaymarchedShadow(
  edt: Float32Array,
  width: number,
  height: number,
  params: RaymarchedShadowParams
): ImageData {
  const {
    lightX = Math.round(width / 2),
    lightY = Math.round(height / 4),
    lightRadius = 16,
    shadowOpacity = 0.7,
    shadowColor,
    ditherMode = 'none',
    maxSteps = 64,
  } = params;

  const [sr, sg, sb] = parseShadowColor(shadowColor);
  const opacity = Math.max(0.0, Math.min(1.0, shadowOpacity));

  const visibilityMap = generateRaymarchedShadowMap(
    edt,
    width,
    height,
    lightX,
    lightY,
    lightRadius,
    maxSteps
  );

  const imgData = createImageDataBuffer(width, height);
  const data = imgData.data;

  try {
    for (let y = 0; y < height; y++) {
      const row = y * width;
      for (let x = 0; x < width; x++) {
        const idx = row + x;
        const pIdx = idx * 4;
        let vis = visibilityMap[idx];

        if (ditherMode !== 'none') {
          const threshold = getBayerMatrixThreshold(x, y, ditherMode);
          vis = vis < threshold ? 0.0 : 1.0;
        }

        const shadowFactor = (1.0 - vis) * opacity;
        let alpha = Math.round(shadowFactor * 255);

        if (edt[idx] <= 0) {
          alpha = 0;
        }

        if (alpha > 0) {
          data[pIdx] = sr;
          data[pIdx + 1] = sg;
          data[pIdx + 2] = sb;
          data[pIdx + 3] = alpha;
        } else {
          data[pIdx + 3] = 0;
        }
      }
    }

    return imgData;
  } finally {
    releaseFloat32Buffer(visibilityMap);
  }
}

/**
 * Unified Cast Shadow Pipeline.
 * Defaults to the professional bounded 2.5D ground shadow unless 2D planar sphere-tracing is requested.
 */
export function executeRaymarchedCastShadowPipeline(
  edt: Float32Array,
  width: number,
  height: number,
  params: RaymarchedShadowParams
): ImageData {
  if (params.mode === 'bounded-2.5d') {
    return renderBoundedSpriteCastShadow(edt, width, height, params);
  }
  return executeClassic2DRaymarchedShadow(edt, width, height, params);
}

export {
  inferRaymarchedShadowSettings,
  type InferredShadowSettings,
  type ShadowAnalysisOptions,
} from './math/shadowAuto';
