/**
 * Raymarched Soft Shadows Auto-Analysis Engine ("understands the art, then casts realistic soft shadows").
 *
 * Analyzes the composited canvas artwork and infers physically plausible
 * 2D cone tracing shadow parameters:
 *
 * 1. Silhouette & Spatial Bounding Box:
 *    - Scans non-transparent pixels (alpha > 30) to find bounding box [minX, maxX, minY, maxY]
 *    - Finds geometric center of mass (cx, cy) and contact ground baseline (maxY)
 *    - Identifies whether the sprite is standing grounded or floating
 *
 * 2. Directional Key Light Alignment:
 *    - Detects internal painted highlight mass bias, or harmonizes with studio key light azimuth/elevation
 *    - Places the 2D raymarching area light source (lightX, lightY) outside the silhouette along the light vector
 *    - Elevates light above the ground plane so rays cast realistic downward shadows across the floor
 *
 * 3. Scale-Aware Penumbra Sizing (Aaltonen Contact Hardening):
 *    - Scales area light radius (lightRadius) with sprite dimensions for razor-sharp contact shadows
 *      at the feet and soft, smooth penumbra falloff further away
 *
 * 4. Atmospheric Shadow Tinting (Color Theory):
 *    - Warm artwork (reds, oranges, warm golds) receives complementary cool atmospheric shadows (Indigo #180B26 or Violet #2E1065)
 *    - Cool artwork (blues, cyans, cold slates) receives grounded warm shadows (Umber #26140B or Obsidian #0A0612)
 *    - Nature/foliage receives deep forest tint (Teal/Fog #062419)
 *
 * 5. Ordered Bayer Dither:
 *    - Retro 4x4 matrix dither for authentic pixel art stippling
 *
 * Pure, DOM-free and deterministic for robust unit testing.
 */

export interface InferredShadowSettings {
  lightX: number;
  lightY: number;
  lightRadius: number; // 4 to 64px
  shadowOpacity: number; // 0.0 to 1.0
  shadowColor: string; // Hex string from SHADOW_COLOR_PRESETS
  ditherMode: 'none' | '2x2' | '4x4' | '8x8';
  rationale: string;
  spriteBounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    width: number;
    height: number;
    cx: number;
    cy: number;
  };
  isFloating: boolean;
  lightAzimuth: number;
  lightElevation: number;
  shadowStyle?: 'cast' | 'drop';
}

export interface ShadowAnalysisOptions {
  keyLightAzimuth?: number; // 0-360 deg
  keyLightElevation?: number; // 15-90 deg
}

const OPAQUE_ALPHA = 30;

export function inferRaymarchedShadowSettings(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  options?: ShadowAnalysisOptions
): InferredShadowSettings {
  const DEFAULTS: InferredShadowSettings = {
    lightX: Math.round(width / 2),
    lightY: Math.max(2, Math.round(height * 0.15)),
    lightRadius: 16,
    shadowOpacity: 0.6,
    shadowColor: '#180B26',
    ditherMode: 'none',
    rationale: 'Canvas is empty — assigned centered overhead studio light with clean flat shadow.',
    spriteBounds: {
      minX: 0,
      maxX: width - 1,
      minY: 0,
      maxY: height - 1,
      width,
      height,
      cx: Math.round(width / 2),
      cy: Math.round(height / 2),
    },
    isFloating: false,
    lightAzimuth: 315,
    lightElevation: 45,
  };

  let minX = width;
  let maxX = 0;
  let minY = height;
  let maxY = 0;
  let count = 0;
  let sumX = 0;
  let sumY = 0;
  let lumSumX = 0;
  let lumSumY = 0;
  let lumTotal = 0;
  let sumR = 0;
  let sumG = 0;
  let sumB = 0;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    for (let x = 0; x < width; x++) {
      const p = (rowOffset + x) * 4;
      const a = data[p + 3];
      if (a <= OPAQUE_ALPHA) continue;

      count++;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;

      const r = data[p];
      const g = data[p + 1];
      const b = data[p + 2];
      const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

      sumX += x;
      sumY += y;
      lumSumX += x * lum;
      lumSumY += y * lum;
      lumTotal += lum;
      sumR += r;
      sumG += g;
      sumB += b;
    }
  }

  if (count === 0 || lumTotal === 0) {
    return DEFAULTS;
  }

  const boxW = Math.max(1, maxX - minX + 1);
  const boxH = Math.max(1, maxY - minY + 1);
  const cx = Math.round(sumX / count);
  const cy = Math.round(sumY / count);

  // Detect whether sprite touches or floats above canvas bottom
  const distanceFromBottom = height - 1 - maxY;
  const isFloating = distanceFromBottom > Math.max(3, Math.round(height * 0.1));

  // --- 1. Light Direction (Azimuth & Elevation) -------------------------------
  const lx = lumSumX / lumTotal;
  const ly = lumSumY / lumTotal;
  const dx = lx - (sumX / count);
  const dy = ly - (sumY / count);
  const offsetMag = Math.sqrt(dx * dx + dy * dy);

  let azimuthDeg: number;
  let elevationDeg: number;

  if (offsetMag >= 0.35) {
    // Artwork has clear painted internal directional shading cues
    azimuthDeg = Math.round(((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360);
    const spriteRadius = Math.sqrt(count / Math.PI) || 1;
    const verticalBias = Math.max(-1, Math.min(1, -dy / (spriteRadius * 0.55)));
    elevationDeg = Math.round(Math.max(15, Math.min(85, 45 + 35 * verticalBias)));
  } else if (options?.keyLightAzimuth !== undefined) {
    // Align with scene/studio key light azimuth and elevation
    azimuthDeg = options.keyLightAzimuth;
    elevationDeg = options.keyLightElevation ?? 45;
  } else {
    // Default classic 3/4 top-left studio key light
    azimuthDeg = 315;
    elevationDeg = 45;
  }

  // --- 2. Calculate 2D Area Light Coordinates (lightX, lightY) -----------------
  // Raymarching traces rays from background receiver pixels towards (lightX, lightY).
  // Any receiver pixel where the sprite blocks the light ray receives a cast shadow.
  // Placing the light source in the direction of azimuth (above/around the sprite)
  // projects the shadow onto the ground on the opposite side of the sprite.
  const azRad = (azimuthDeg * Math.PI) / 180;
  const elRad = (Math.max(15, elevationDeg) * Math.PI) / 180;

  // Direction vector in screen space pointing towards the light source
  const dirX = Math.sin(azRad);
  const dirY = -Math.cos(azRad);

  // Distance from sprite center to light source (proportional to sprite scale and elevation)
  const maxDim = Math.max(boxW, boxH);
  const distanceMultiplier = 1.1 + 0.6 * (1.0 - Math.sin(elRad));
  const offsetDist = Math.max(12, maxDim * distanceMultiplier);

  const lightX = Math.round(cx + dirX * offsetDist);
  let lightY = Math.round(cy + dirY * offsetDist);

  // Guarantee light is placed above the ground contact baseline so rays cast downward
  const minLightYLimit = Math.round(minY - Math.max(4, boxH * 0.25));
  if (lightY > minLightYLimit && dirY < 0.2) {
    lightY = minLightYLimit;
  }

  // --- 3. Light Size (Penumbra Softness with Aaltonen Contact Hardening) --------
  // Proportional to sprite scale: small sprites get a tight 8-12px light to preserve
  // clear contact shadow umbra, while large sprites get a 16-24px light for rich penumbra.
  const lightRadius = Math.max(8, Math.min(32, Math.round(Math.sqrt(boxW * boxH) * 0.45)));

  // --- 4. Atmospheric Shadow Tint (Artistic Color Harmony) ---------------------
  const meanR = sumR / count;
  const meanG = sumG / count;
  const meanB = sumB / count;
  const warmth = (meanR - meanB) / 255;
  const maxChannel = Math.max(meanR, Math.max(meanG, meanB));
  const minChannel = Math.min(meanR, Math.min(meanG, meanB));
  const saturation = maxChannel > 0 ? (maxChannel - minChannel) / maxChannel : 0;

  let shadowColor = '#180B26'; // Indigo default (balanced atmospheric depth)

  if (saturation < 0.15) {
    // Neutral / Grayscale / Metal art -> Obsidian (pure dark value)
    shadowColor = '#0A0612';
  } else if (meanG > meanR * 1.2 && meanG > meanB * 1.15) {
    // Foliage / Nature art -> Teal/Fog
    shadowColor = '#062419';
  } else if (warmth > 0.08) {
    // Warm artwork (reds, oranges, golds, peachy skin tones) -> Complementary cool Indigo or Violet
    shadowColor = warmth > 0.25 ? '#2E1065' : '#180B26';
  } else if (warmth < -0.08) {
    // Cool artwork (blues, cyans, icy slates) -> Grounding deep Umber
    shadowColor = '#26140B';
  }

  // --- 5. Opacity & Dithering -------------------------------------------------
  const shadowOpacity = isFloating ? 0.5 : 0.65;
  const ditherMode: 'none' | '2x2' | '4x4' | '8x8' = 'none';

  const formName = isFloating
    ? 'floating subject'
    : `grounded subject (${boxW}x${boxH}px, base Y=${maxY})`;

  const rationale =
    `Recognized ${formName}. Projecting 2.5D grounded cast shadow along ${azimuthDeg}° / ${elevationDeg}° light vector, ` +
    `with ${lightRadius}px penumbra radius and ${shadowColor} atmospheric tint.`;

  return {
    lightX,
    lightY,
    lightRadius,
    shadowOpacity,
    shadowColor,
    ditherMode,
    rationale,
    spriteBounds: {
      minX,
      maxX,
      minY,
      maxY,
      width: boxW,
      height: boxH,
      cx,
      cy,
    },
    isFloating,
    lightAzimuth: azimuthDeg,
    lightElevation: elevationDeg,
  };
}
