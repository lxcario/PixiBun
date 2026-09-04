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
  lightX: number;
  lightY: number;
  lightRadius: number; // Physical light source radius (e.g. 4 to 64px)
  shadowOpacity?: number; // 0.0 to 1.0 (default: 0.7)
  shadowColor?: string | [number, number, number]; // Hex string or [r, g, b] (default: #180B26)
  ditherMode?: 'none' | '2x2' | '4x4' | '8x8';
  maxSteps?: number; // Maximum sphere-tracing steps (default: 64)
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
 * Executes the complete 2D Raymarched Soft Shadow pipeline and returns an ImageData layer.
 * Manages zero-allocation buffers automatically to guarantee zero memory leaks.
 */
export function executeRaymarchedCastShadowPipeline(
  edt: Float32Array,
  width: number,
  height: number,
  params: RaymarchedShadowParams
): ImageData {
  const {
    lightX,
    lightY,
    lightRadius,
    shadowOpacity = 0.7,
    shadowColor,
    ditherMode = 'none',
    maxSteps = 64,
  } = params;

  const [sr, sg, sb] = parseShadowColor(shadowColor);
  const opacity = Math.max(0.0, Math.min(1.0, shadowOpacity));

  // 1. Generate continuous visibility map from buffer pool
  const visibilityMap = generateRaymarchedShadowMap(
    edt,
    width,
    height,
    lightX,
    lightY,
    lightRadius,
    maxSteps
  );

  // 2. Allocate output ImageData buffer safely in browser and node
  const imgData = createImageDataBuffer(width, height);
  const data = imgData.data;

  try {
    // 3. Composite visibility buffer into stylized shadow pixels
    for (let y = 0; y < height; y++) {
      const row = y * width;
      for (let x = 0; x < width; x++) {
        const idx = row + x;
        const pIdx = idx * 4;
        let vis = visibilityMap[idx];

        if (ditherMode !== 'none') {
          const threshold = getBayerMatrixThreshold(x, y, ditherMode);
          // Crisp Bayer matrix stippling: if visibility < threshold, pixel is shadowed
          vis = vis < threshold ? 0.0 : 1.0;
        }

        // Shadow alpha is proportional to (1.0 - visibility) * opacity
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
    // Crucially release pooled visibility buffer to prevent GC pressure and memory leaks
    releaseFloat32Buffer(visibilityMap);
  }
}
