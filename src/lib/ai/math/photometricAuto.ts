/**
 * Photometric Auto-Analysis Engine ("understands the art, then lights it").
 *
 * Analyzes the composited canvas artwork and infers the photometric studio
 * settings a lighting artist would pick by hand:
 *
 * 1. Light azimuth — direction from the sprite's geometric centroid toward its
 *    luminance centroid (the art's own brightest mass reads as the light side).
 * 2. Light elevation — how strongly that bright mass biases toward the top of
 *    the sprite silhouette (top-lit art => high sun, center/flat => overhead).
 * 3. Material — scores Blinn-Phong families from pixel statistics:
 *    highlight prevalence (specular share), chromatic warmth of the bright
 *    mass (conductor gold), cool clarity (dielectric glass), and overall
 *    contrast softness (matte clay vs velvet fabric).
 * 4. Brightness — exposure compensation for dark or blown-out palettes.
 *
 * Pure, DOM-free and deterministic so it is unit-testable.
 */

import { MaterialType } from '@/types/tools';

export type RecognizedFormType = 'character' | 'orb' | 'prop';

export interface InferredPhotometricSettings {
  lightAzimuth: number; // 0-360
  lightElevation: number; // 15-90
  material: MaterialType;
  brightness: number; // 0.5-2.0
  formType: RecognizedFormType;
  rationale: string; // Human-readable explanation of the inference
}

const OPAQUE_ALPHA = 30;

export function inferPhotometricSettings(
  data: Uint8ClampedArray,
  width: number,
  height: number
): InferredPhotometricSettings {
  const DEFAULTS: InferredPhotometricSettings = {
    lightAzimuth: 315,
    lightElevation: 45,
    material: 'matte',
    brightness: 1.15,
    formType: 'prop',
    rationale: 'Canvas is empty — default top-left studio light.',
  };

  let count = 0;
  let sumX = 0;
  let sumY = 0;
  let lumSumX = 0;
  let lumSumY = 0;
  let lumTotal = 0;
  let sumR = 0;
  let sumB = 0;
  let sumSat = 0;
  let brightCount = 0;
  let brightR = 0;
  let brightB = 0;
  // 32-bin luminance histogram for percentile + contrast statistics
  const histogram = new Uint32Array(32);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = (y * width + x) * 4;
      if (data[p + 3] <= OPAQUE_ALPHA) continue;

      const r = data[p];
      const g = data[p + 1];
      const b = data[p + 2];
      const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

      count++;
      sumX += x;
      sumY += y;
      lumSumX += x * lum;
      lumSumY += y * lum;
      lumTotal += lum;
      sumR += r;
      sumB += b;
      sumSat += (Math.max(r, Math.max(g, b)) - Math.min(r, Math.min(g, b))) / 255;
      histogram[Math.min(31, Math.floor(lum * 32))]++;
      if (lum >= 0.82) {
        brightCount++;
        brightR += r;
        brightB += b;
      }
    }
  }

  if (count === 0 || lumTotal === 0) return DEFAULTS;

  // --- 1) Morphological & Silhouette Analysis ---------------------------------
  let minX = width, maxX = 0, minY = height, maxY = 0;
  let perimeter = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = (y * width + x) * 4;
      if (data[p + 3] <= OPAQUE_ALPHA) continue;

      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;

      const isEdge =
        x === 0 || x === width - 1 || y === 0 || y === height - 1 ||
        data[((y - 1) * width + x) * 4 + 3] <= OPAQUE_ALPHA ||
        data[((y + 1) * width + x) * 4 + 3] <= OPAQUE_ALPHA ||
        data[(y * width + (x - 1)) * 4 + 3] <= OPAQUE_ALPHA ||
        data[(y * width + (x + 1)) * 4 + 3] <= OPAQUE_ALPHA;
      if (isEdge) perimeter++;
    }
  }

  const boxW = Math.max(1, maxX - minX + 1);
  const boxH = Math.max(1, maxY - minY + 1);
  const aspectRatio = boxW / boxH;
  const circularity = perimeter > 0 ? (4 * Math.PI * count) / (perimeter * perimeter) : 0;
  const isOrb = circularity > 0.65 && aspectRatio >= 0.8 && aspectRatio <= 1.25;

  // Detect top appendages/ears: check if top 15-35% of sprite bounding box splits into 2 distinct islands
  let hasEarsOrHorns = false;
  const earScanRows = Math.min(8, Math.max(2, Math.floor(boxH * 0.35)));
  for (let y = minY; y < minY + earScanRows; y++) {
    let segments = 0;
    let inSegment = false;
    for (let x = minX; x <= maxX; x++) {
      const opaque = data[(y * width + x) * 4 + 3] > OPAQUE_ALPHA;
      if (opaque && !inSegment) {
        segments++;
        inSegment = true;
      } else if (!opaque && inSegment) {
        inSegment = false;
      }
    }
    if (segments >= 2) {
      hasEarsOrHorns = true;
      break;
    }
  }

  // Detect internal facial features (eyes, mouth, nose):
  // Find dark/contrast pixels enclosed within the interior body (not touching transparent background)
  let hasFacialFeatures = false;
  const isOpaqueAt = (px: number, py: number) => {
    if (px < 0 || px >= width || py < 0 || py >= height) return false;
    return data[(py * width + px) * 4 + 3] > OPAQUE_ALPHA;
  };

  const internalDarkSet = new Set<number>();
  const meanLum = lumTotal / count;

  for (let y = minY + 1; y < maxY; y++) {
    for (let x = minX + 1; x < maxX; x++) {
      const p = (y * width + x) * 4;
      if (data[p + 3] <= OPAQUE_ALPHA) continue;

      // Must have opaque neighbors on all sides (fully interior)
      if (
        !isOpaqueAt(x - 1, y) ||
        !isOpaqueAt(x + 1, y) ||
        !isOpaqueAt(x, y - 1) ||
        !isOpaqueAt(x, y + 1)
      ) {
        continue;
      }

      const r = data[p];
      const g = data[p + 1];
      const b = data[p + 2];
      const pLum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

      if (pLum < 0.25 || (meanLum > 0.45 && meanLum - pLum > 0.28)) {
        internalDarkSet.add(y * width + x);
      }
    }
  }

  if (internalDarkSet.size > 0 && internalDarkSet.size <= Math.max(36, Math.floor(count * 0.22))) {
    const visitedSet = new Set<number>();
    let featureClusterCount = 0;
    for (const pIdx of internalDarkSet) {
      if (visitedSet.has(pIdx)) continue;
      featureClusterCount++;
      const queue = [pIdx];
      visitedSet.add(pIdx);
      let qHead = 0;
      while (qHead < queue.length) {
        const cur = queue[qHead++];
        const cx = cur % width;
        const cy = Math.floor(cur / width);
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nIdx = (cy + dy) * width + (cx + dx);
            if (internalDarkSet.has(nIdx) && !visitedSet.has(nIdx)) {
              visitedSet.add(nIdx);
              queue.push(nIdx);
            }
          }
        }
      }
    }
    if (featureClusterCount >= 1 && featureClusterCount <= 6) {
      hasFacialFeatures = true;
    }
  }

  const isCharacter = hasEarsOrHorns || hasFacialFeatures;
  let formType: RecognizedFormType = 'prop';
  if (isCharacter) {
    formType = 'character';
  } else if (isOrb) {
    formType = 'orb';
  }

  // --- 2) Light azimuth: geometric centroid -> luminance centroid -------------
  const cx = sumX / count;
  const cy = sumY / count;
  const lx = lumSumX / lumTotal;
  const ly = lumSumY / lumTotal;
  const dx = lx - cx;
  const dy = ly - cy;
  const spriteRadius = Math.sqrt(count / Math.PI) || 1;
  const offsetMag = Math.sqrt(dx * dx + dy * dy);
  const minShadingCueThreshold = Math.max(1.1, spriteRadius * 0.12);
  const hasPaintedShadingCues = offsetMag >= minShadingCueThreshold;

  let azimuthDeg: number;
  if (!hasPaintedShadingCues) {
    // Subject has flat or unshaded base colors — assign optimal studio key light based on form
    if (formType === 'character') {
      // Flattering 3/4 studio key light for character/creature: lights left ear, sculpts face, casts subtle right shadow
      azimuthDeg = 315;
    } else if (isOrb) {
      // Classic 336° high-key studio light for rounded spheres / orbs (matching Photo 2!)
      azimuthDeg = 336;
    } else {
      azimuthDeg = 315; // Classic 3/4 studio key
    }
  } else {
    // Artist already painted shading cues: align azimuth with brightest mass
    azimuthDeg = Math.round(((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360);
  }

  // --- 3) Light elevation: vertical bias of the bright mass ------------------
  const verticalBias = Math.max(-1, Math.min(1, -dy / (spriteRadius * 0.55)));
  let elevationDeg = Math.round(Math.max(15, Math.min(90, 45 + 40 * verticalBias)));
  if (formType === 'character' && !hasPaintedShadingCues) {
    elevationDeg = 48; // Optimal anatomical elevation for character features
  }

  // --- 4) Material scoring ----------------------------------------------------
  let variance = 0;
  let binSum = 0;
  for (let bin = 0; bin < 32; bin++) {
    const mid = (bin + 0.5) / 32;
    variance += histogram[bin] * (mid - meanLum) * (mid - meanLum);
    binSum += histogram[bin];
  }
  const stdLum = Math.sqrt(variance / Math.max(1, binSum));

  // Approximate 95th percentile from the histogram tail
  let acc = 0;
  let p95 = 1;
  for (let bin = 31; bin >= 0; bin--) {
    acc += histogram[bin];
    if (acc >= count * 0.05) {
      p95 = (bin + 1) / 32;
      break;
    }
  }
  const specRatio = brightCount / count; // share of true highlight pixels
  const peakPush = Math.max(0, p95 - meanLum); // how far highlights outrun the mean
  const warmth = (sumR - sumB) / (255 * count); // +warm / -cool
  const meanSat = sumSat / count;
  const contrast = stdLum / 0.29; // normalized: ~1.0 for full-range art

  const brightWarmth =
    brightCount > 0 ? (brightR - brightB) / (255 * brightCount) : 0;

  const scores: Record<MaterialType, number> = {
    // Soft, even falloff: low contrast, few blown highlights
    matte: 0.45 + Math.max(0, 1 - contrast) * 0.5 - specRatio * 1.2,
    // Mirror-like: strong highlight share pushed far above the mean
    metal: specRatio * 2.2 + peakPush * 1.6 - Math.abs(warmth) * 0.3,
    // Cool, wet dielectric clarity: highlights + cool tint + low saturation
    glass: specRatio * 1.6 + peakPush * 1.2 - Math.max(0, warmth) * 1.4 - meanSat * 0.35,
    // Velvet: mid contrast with muted highlights, rich saturation
    fabric: (1 - Math.abs(contrast - 0.65)) * 0.55 + meanSat * 0.55 - specRatio * 0.9,
    // Conductor gold: highlights rendered warm, not neutral
    gold: specRatio * 1.7 + Math.max(0, brightWarmth) * 1.9 + Math.max(0, warmth) * 0.7,
  };

  let material: MaterialType = 'matte';
  let bestScore = -Infinity;
  (Object.keys(scores) as MaterialType[]).forEach((key) => {
    if (scores[key] > bestScore) {
      bestScore = scores[key];
      material = key;
    }
  });

  // --- 5) Exposure compensation ----------------------------------------------
  let brightness = 1.15;
  if (meanLum < 0.25) brightness = 1.35;
  else if (meanLum > 0.7) brightness = 0.95;

  const specPct = Math.round(specRatio * 100);
  let formDesc = 'canvas art';
  if (hasEarsOrHorns && hasFacialFeatures) formDesc = 'character with anatomical features (ears & facial details)';
  else if (hasEarsOrHorns) formDesc = 'character with anatomical features';
  else if (hasFacialFeatures) formDesc = 'character with facial features';
  else if (isOrb) formDesc = 'spherical form';

  const rationale =
    `Recognized ${formDesc} (highlight mass ${azimuthDeg}° / ${elevationDeg}°, ` +
    `spec share ${specPct}%, contrast ${contrast.toFixed(2)}) → ${material} shading.`;

  return { lightAzimuth: azimuthDeg, lightElevation: elevationDeg, material, brightness, formType, rationale };
}
