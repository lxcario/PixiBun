/**
 * src/lib/canvas/rotSprite.ts
 *
 * PixiBun RotSprite — Deterministic Feature-Preserving Pixel-Art Rotation
 *
 * Academic & Historical Reference:
 * - Xenowhirl (2007), "RotSprite: An algorithm for rotating pixel art" (as popularized in Aseprite).
 * - Eric Johnston, EPX (Eric's Pixel Expansion), LucasArts, 1992.
 * - Andrea Mazzoleni, Scale2x for AdvanceMAME, 2001 (equivalent output to EPX).
 *   https://www.scale2x.it/scale2xandepx
 *
 * Arbitrary angles use the contour-aware v3 engine (`rotSpriteContour`, see its section).
 * The v2 pipeline below remains exported, unchanged, for comparison and regression tests.
 *
 * v2 architecture:
 * 1. Lossless integer fast-paths for 0°, 90°, 180°, 270°.
 * 2. 3-pass Scale2x / EPX expansion (1x -> 2x -> 4x -> 8x); rotation uses exact color matches
 *    (similarityThreshold 0), and `scale8x` accepts a threshold for callers that want near-shade merging.
 * 3. RotSprite v2 Multi-Candidate Rotation Search:
 *    Generates fractional source-space candidate offsets (0, ±0.25 px) evaluated against
 *    Scale8x raster with subpixel inverse sampling.
 * 4. Structural & Semantic Candidate Scoring:
 *    Evaluates silhouette occupancy, small component survival (distinct pixel claiming),
 *    tiny hole topology, and palette integrity.
 * 5. Conservative Semantic Restoration Pass:
 *    Recovers lost small authored features (eyes, mouths, highlights, 1-3px accents)
 *    and tiny enclosed holes into geometrically plausible interior context cells
 *    without silhouette distortion or invented colors.
 * 6. Contour Color Restoration:
 *    Keeps source-only border colors on the rotated silhouette boundary.
 */

export interface PixelBuffer {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

/**
 * Computes Manhattan distance between two RGBA colors (packed as 32-bit unsigned ints).
 */
export function colorDistance32(c1: number, c2: number): number {
  if (c1 === c2) return 0;
  const a1 = (c1 >>> 24) & 0xff;
  const a2 = (c2 >>> 24) & 0xff;
  if (a1 < 16 && a2 < 16) return 0;
  if (Math.abs(a1 - a2) > 64) return 10000;
  const r1 = c1 & 0xff, g1 = (c1 >>> 8) & 0xff, b1 = (c1 >>> 16) & 0xff;
  const r2 = c2 & 0xff, g2 = (c2 >>> 8) & 0xff, b2 = (c2 >>> 16) & 0xff;
  return Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2);
}

/**
 * 1-pass Scale2x / EPX algorithm.
 * Expands an image 2x in each dimension based on 4-orthogonal neighbors (B, D, F, H).
 */
export function scale2x(src: PixelBuffer, similarityThreshold = 0): PixelBuffer {
  const { width: curW, height: curH, data: srcBytes } = src;
  const outW = curW * 2;
  const outH = curH * 2;
  const outBytes = new Uint8ClampedArray(outW * outH * 4);

  const src32 = new Uint32Array(srcBytes.buffer, srcBytes.byteOffset, curW * curH);
  const out32 = new Uint32Array(outBytes.buffer, outBytes.byteOffset, outW * outH);

  const getPx = (x: number, y: number): number => {
    if (x < 0 || x >= curW || y < 0 || y >= curH) {
      return src32[Math.min(curH - 1, Math.max(0, y)) * curW + Math.min(curW - 1, Math.max(0, x))];
    }
    return src32[y * curW + x];
  };

  const dist = colorDistance32;

  for (let y = 0; y < curH; y++) {
    for (let x = 0; x < curW; x++) {
      const P = src32[y * curW + x];
      const B = getPx(x, y - 1);
      const D = getPx(x - 1, y);
      const F = getPx(x + 1, y);
      const H = getPx(x, y + 1);

      let e0 = P;
      let e1 = P;
      let e2 = P;
      let e3 = P;

      // Scale2x rule: if opposite neighbors differ and adjacent neighbors match
      if (dist(B, H) > similarityThreshold && dist(D, F) > similarityThreshold) {
        if (dist(D, B) <= similarityThreshold) {
          e0 = dist(D, P) <= dist(B, P) ? D : B;
        }
        if (dist(B, F) <= similarityThreshold) {
          e1 = dist(B, P) <= dist(F, P) ? B : F;
        }
        if (dist(D, H) <= similarityThreshold) {
          e2 = dist(D, P) <= dist(H, P) ? D : H;
        }
        if (dist(H, F) <= similarityThreshold) {
          e3 = dist(H, P) <= dist(F, P) ? H : F;
        }
      }

      const outBase = (y * 2) * outW + (x * 2);
      out32[outBase] = e0;
      out32[outBase + 1] = e1;
      out32[outBase + outW] = e2;
      out32[outBase + outW + 1] = e3;
    }
  }

  return { width: outW, height: outH, data: outBytes };
}

/**
 * 3-pass Scale2x cascade to expand an image 8x (1x -> 2x -> 4x -> 8x).
 */
export function scale8x(src: PixelBuffer, similarityThreshold = 0): PixelBuffer {
  const p1 = scale2x(src, similarityThreshold);
  const p2 = scale2x(p1, similarityThreshold);
  return scale2x(p2, similarityThreshold);
}

/**
 * Fast nearest-neighbor rotation for preview and integer orthogonal rotations.
 */
export function rotateNearest(
  src: PixelBuffer,
  angleRad: number,
  pivotX?: number,
  pivotY?: number
): PixelBuffer {
  const { width: w, height: h, data } = src;
  const outBytes = new Uint8ClampedArray(w * h * 4);
  const src32 = new Uint32Array(data.buffer, data.byteOffset, w * h);
  const out32 = new Uint32Array(outBytes.buffer, outBytes.byteOffset, w * h);

  const cx = pivotX ?? w / 2;
  const cy = pivotY ?? h / 2;
  const cos = Math.cos(-angleRad);
  const sin = Math.sin(-angleRad);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      const sx = Math.floor(cos * dx - sin * dy + cx);
      const sy = Math.floor(sin * dx + cos * dy + cy);

      if (sx >= 0 && sx < w && sy >= 0 && sy < h) {
        out32[y * w + x] = src32[sy * w + sx];
      } else {
        out32[y * w + x] = 0;
      }
    }
  }

  return { width: w, height: h, data: outBytes };
}

/**
 * Downscales an 8x upscaled buffer back to 1x using Gaussian center-weighted majority voting.
 * Supports optional fractional source-space candidate offsets (candOffX, candOffY).
 */
export function downscale8xMajorityVote(
  src8x: PixelBuffer,
  targetW: number,
  targetH: number,
  angleRad: number,
  srcPivotX: number,
  srcPivotY: number,
  outPivotX: number = srcPivotX,
  outPivotY: number = srcPivotY,
  candOffX: number = 0,
  candOffY: number = 0,
  pixelPerfect: boolean = false
): PixelBuffer {
  const outBytes = new Uint8ClampedArray(targetW * targetH * 4);
  const out32 = new Uint32Array(outBytes.buffer, outBytes.byteOffset, targetW * targetH);
  const s8Bytes = src8x.data;
  const s8_32 = new Uint32Array(s8Bytes.buffer, s8Bytes.byteOffset, src8x.width * src8x.height);
  const w8 = src8x.width;
  const h8 = src8x.height;

  const cos = Math.cos(-angleRad);
  const sin = Math.sin(-angleRad);

  // 8 subpixel offset coordinates within each 1x pixel cell
  const SUB_OFFSETS = [-3.5, -2.5, -1.5, -0.5, 0.5, 1.5, 2.5, 3.5];

  for (let y = 0; y < targetH; y++) {
    for (let x = 0; x < targetW; x++) {
      const px = x + 0.5;
      const py = y + 0.5;

      const votes = new Map<number, number>();
      let nonTransparentWeight = 0;
      let totalWeight = 0;
      let centerCoreWeight = 0;

      for (let vi = 0; vi < 8; vi++) {
        const v = SUB_OFFSETS[vi];
        for (let ui = 0; ui < 8; ui++) {
          const u = SUB_OFFSETS[ui];

          // Continuous inverse rotation from output canvas to 1x source coordinates
          const dx = px + u / 8 - outPivotX;
          const dy = py + v / 8 - outPivotY;
          const sx = cos * dx - sin * dy + srcPivotX + candOffX;
          const sy = sin * dx + cos * dy + srcPivotY + candOffY;

          // Map to 8x scale raster with epsilon
          const sx8 = Math.floor(sx * 8 + 1e-9);
          const sy8 = Math.floor(sy * 8 + 1e-9);

          // Radially symmetric parabolic center-weighted falloff
          const distSq = u * u + v * v;
          const weight = 1.0 + 0.01 * (25 - distSq);
          totalWeight += weight;

          let color = 0;
          if (sx8 >= 0 && sx8 < w8 && sy8 >= 0 && sy8 < h8) {
            color = s8_32[sy8 * w8 + sx8];
          }

          if ((color >>> 24) !== 0) {
            votes.set(color, (votes.get(color) || 0) + weight);
            nonTransparentWeight += weight;
            if ((ui === 3 || ui === 4) && (vi === 3 || vi === 4)) {
              centerCoreWeight += weight;
            }
          }
        }
      }

      // Feature conservation threshold:
      // Preserves 1px thin lines and closed contours if 2x2 central core touches solid pixels,
      // otherwise requires solid majority to prevent border dilation.
      const dynamicThreshold = pixelPerfect
        ? (centerCoreWeight > 0 ? 0.40 : 0.46)
        : (centerCoreWeight > 0 ? 0.38 : 0.45);
      if (nonTransparentWeight >= totalWeight * dynamicThreshold && votes.size > 0) {
        let bestColor = 0;
        let maxVote = -1;

        votes.forEach((vote, color) => {
          if (vote > maxVote) {
            maxVote = vote;
            bestColor = color;
          }
        });

        out32[y * targetW + x] = bestColor;
      } else {
        out32[y * targetW + x] = 0;
      }
    }
  }

  return { width: targetW, height: targetH, data: outBytes };
}

/** Keep source-only border colors on the rotated silhouette boundary. */
export function restoreRotatedContourColors(
  source: PixelBuffer,
  output: PixelBuffer,
  angleRad: number,
  sourcePivotX: number,
  sourcePivotY: number,
  outputPivotX: number,
  outputPivotY: number
): PixelBuffer {
  const { width: sw, height: sh } = source;
  const { width: ow, height: oh } = output;
  const src32 = new Uint32Array(source.data.buffer, source.data.byteOffset, sw * sh);
  const out32 = new Uint32Array(output.data.buffer, output.data.byteOffset, ow * oh);
  const sourceClass = new Uint8Array(sw * sh);
  const colorClasses = new Map<number, number>();
  const maxClassifiedColors = 4096;
  const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < sw && y < sh && (src32[y * sw + x] >>> 24) !== 0;

  for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
    const index = y * sw + x;
    const color = src32[index];
    if ((color >>> 24) === 0) continue;
    const kind = solid(x - 1, y) && solid(x + 1, y) && solid(x, y - 1) && solid(x, y + 1) ? 2 : 1;
    sourceClass[index] = kind;
    colorClasses.set(color, (colorClasses.get(color) ?? 0) | kind);
    if (colorClasses.size > maxClassifiedColors) return output;
  }
  let hasBorderOnly = false;
  let hasInteriorOnly = false;
  for (const kind of colorClasses.values()) {
    if (kind === 1) hasBorderOnly = true;
    if (kind === 2) hasInteriorOnly = true;
  }
  if (!hasBorderOnly || !hasInteriorOnly) return output;

  const cos = Math.cos(-angleRad);
  const sin = Math.sin(-angleRad);
  const outputSolid = (x: number, y: number) => x >= 0 && y >= 0 && x < ow && y < oh && (out32[y * ow + x] >>> 24) !== 0;
  for (let y = 0; y < oh; y++) for (let x = 0; x < ow; x++) {
    const index = y * ow + x;
    const color = out32[index];
    if ((color >>> 24) === 0) continue;
    const kind = outputSolid(x - 1, y) && outputSolid(x + 1, y) && outputSolid(x, y - 1) && outputSolid(x, y + 1) ? 2 : 1;
    if (colorClasses.get(color) !== (kind === 1 ? 2 : 1)) continue;

    const dx = x + 0.5 - outputPivotX;
    const dy = y + 0.5 - outputPivotY;
    const sx = cos * dx - sin * dy + sourcePivotX;
    const sy = sin * dx + cos * dy + sourcePivotY;
    let nearest = -1;
    let distance = Infinity;
    for (let yy = Math.floor(sy) - 2; yy <= Math.floor(sy) + 2; yy++) {
      for (let xx = Math.floor(sx) - 2; xx <= Math.floor(sx) + 2; xx++) {
        if (xx < 0 || yy < 0 || xx >= sw || yy >= sh) continue;
        const candidate = yy * sw + xx;
        if (sourceClass[candidate] !== kind || colorClasses.get(src32[candidate]) !== kind) continue;
        const d = (xx + 0.5 - sx) ** 2 + (yy + 0.5 - sy) ** 2;
        if (d < distance) {
          distance = d;
          nearest = candidate;
        }
      }
    }
    if (nearest >= 0) {
      out32[index] = (src32[nearest] & 0x00ffffff) | (color & 0xff000000);
    }
  }
  return output;
}

// ---------------------------------------------------------------------------
// RotSprite v2 — Component Analysis & Semantic Detail Preservation
// ---------------------------------------------------------------------------

export interface SourceComponent {
  id: number;
  color: number; // packed 32-bit uint
  isTransparent: boolean;
  pixels: Array<{ x: number; y: number }>;
  pixelCount: number;
  centroidX: number;
  centroidY: number;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  isSmall: boolean; // pixelCount <= 3
  isHole: boolean; // tiny transparent hole surrounded by solid pixels
  isInterior: boolean; // 0 neighbors touch canvas border or transparency
  neighborColors: Set<number>;
}

export interface SpriteAnalysis {
  components: SourceComponent[];
  smallComponents: SourceComponent[];
  holes: SourceComponent[];
  hasEnclosedHoles: boolean;
  enclosedHoleCount: number;
  enclosedHolePixelCount: number;
  solidPixelCount: number;
  solidComponentCount: number;
  uniqueSolidColors: Set<number>;
  hasAnyHolesOrSmallFeatures: boolean;
}

/**
 * Deterministically analyzes authored color components and enclosed holes in a source sprite.
 * Uses 8-connectivity per color for solid features, and checks interior enclosure.
 */
export function analyzeSourceComponents(src: PixelBuffer): SpriteAnalysis {
  const { width: w, height: h, data } = src;
  const src32 = new Uint32Array(data.buffer, data.byteOffset, w * h);
  const visited = new Uint8Array(w * h);
  const components: SourceComponent[] = [];
  const holes: SourceComponent[] = [];
  const uniqueSolidColors = new Set<number>();
  let solidPixelCount = 0;

  let nextId = 1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      if (visited[idx]) continue;
      const col = src32[idx];
      if ((col >>> 24) === 0) continue;

      uniqueSolidColors.add(col);

      const compPixels: Array<{ x: number; y: number }> = [];
      const neighborColors = new Set<number>();
      const q = [idx];
      visited[idx] = 1;
      let sumX = 0, sumY = 0;
      let minX = x, maxX = x, minY = y, maxY = y;
      let touchesTransparency = false;

      while (q.length > 0) {
        const cur = q.pop()!;
        const cx = cur % w;
        const cy = Math.floor(cur / w);
        compPixels.push({ x: cx, y: cy });
        sumX += cx + 0.5;
        sumY += cy + 0.5;
        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;

        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = cx + dx, ny = cy + dy;
            if (nx < 0 || nx >= w || ny < 0 || ny >= h) {
              touchesTransparency = true;
            } else {
              const nidx = ny * w + nx;
              const ncol = src32[nidx];
              if ((ncol >>> 24) === 0) {
                touchesTransparency = true;
              } else if (ncol === col && !visited[nidx]) {
                visited[nidx] = 1;
                q.push(nidx);
              } else if (ncol !== col) {
                neighborColors.add(ncol);
              }
            }
          }
        }
      }

      const count = compPixels.length;
      solidPixelCount += count;
      components.push({
        id: nextId++,
        color: col,
        isTransparent: false,
        pixels: compPixels,
        pixelCount: count,
        centroidX: sumX / count,
        centroidY: sumY / count,
        minX,
        minY,
        maxX,
        maxY,
        isSmall: count <= 3,
        isHole: false,
        isInterior: !touchesTransparency,
        neighborColors,
      });
    }
  }

  // Hole detection: transparent regions that do not touch canvas borders
  let hasEnclosedHoles = false;
  let enclosedHoleCount = 0;
  let enclosedHolePixelCount = 0;
  const transVisited = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      if (transVisited[idx] || (src32[idx] >>> 24) !== 0) continue;

      const holePixels: Array<{ x: number; y: number }> = [];
      const q = [idx];
      transVisited[idx] = 1;
      let touchesBorder = false;
      let sumX = 0, sumY = 0;

      while (q.length > 0) {
        const cur = q.pop()!;
        const cx = cur % w;
        const cy = Math.floor(cur / w);
        holePixels.push({ x: cx, y: cy });
        sumX += cx + 0.5;
        sumY += cy + 0.5;
        if (cx === 0 || cx === w - 1 || cy === 0 || cy === h - 1) touchesBorder = true;

        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = cx + dx, ny = cy + dy;
          if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
            const nidx = ny * w + nx;
            if ((src32[nidx] >>> 24) === 0 && !transVisited[nidx]) {
              transVisited[nidx] = 1;
              q.push(nidx);
            }
          }
        }
      }

      if (!touchesBorder) {
        hasEnclosedHoles = true;
        enclosedHoleCount++;
        enclosedHolePixelCount += holePixels.length;
        if (holePixels.length <= 8) {
          const count = holePixels.length;
          holes.push({
            id: nextId++,
            color: 0,
            isTransparent: true,
            pixels: holePixels,
            pixelCount: count,
            centroidX: sumX / count,
            centroidY: sumY / count,
            minX: 0,
            minY: 0,
            maxX: 0,
            maxY: 0,
            isSmall: true,
            isHole: true,
            isInterior: true,
            neighborColors: new Set(),
          });
        }
      }
    }
  }

  const smallComponents = components.filter(c => c.isSmall);
  const hasAnyHolesOrSmallFeatures = smallComponents.length > 0 || holes.length > 0 || hasEnclosedHoles;

  return {
    components,
    smallComponents,
    holes,
    hasEnclosedHoles,
    enclosedHoleCount,
    enclosedHolePixelCount,
    solidPixelCount,
    solidComponentCount: countSolidComponents(src32, w, h),
    uniqueSolidColors,
    hasAnyHolesOrSmallFeatures,
  };
}

/** Silhouette connectivity ignores color boundaries; semantic components do not. */
function countSolidComponents(pixels: Uint32Array, width: number, height: number): number {
  let count = 0;
  const visited = new Uint8Array(width * height);
  for (let i = 0; i < pixels.length; i++) {
    if ((pixels[i] >>> 24) === 0 || visited[i]) continue;
    count++;
    const queue = [i];
    visited[i] = 1;
    while (queue.length) {
      const current = queue.pop()!, x = current % width, y = Math.floor(current / width);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if ((dx === 0 && dy === 0) || nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const next = ny * width + nx;
        if ((pixels[next] >>> 24) !== 0 && !visited[next]) { visited[next] = 1; queue.push(next); }
      }
    }
  }
  return count;
}

/** Checks whether a pixel at (x, y) touches canvas boundaries or a transparent neighbor. */
function touchesTransparencyOrBorder(
  buf32: Uint32Array,
  x: number,
  y: number,
  width: number,
  height: number
): boolean {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) return true;
      if ((buf32[ny * width + nx] >>> 24) === 0) return true;
    }
  }
  return false;
}

/**
 * RotSprite v1 implementation frozen for regression testing and comparative benchmarks.
 */
export function rotSpriteV1(
  src: PixelBuffer,
  angleRad: number,
  pivotX?: number,
  pivotY?: number,
  targetW?: number,
  targetH?: number,
  outPivotX?: number,
  outPivotY?: number
): PixelBuffer {
  const { width: w, height: h, data } = src;
  const EPSILON = 1e-5;
  const TWO_PI = Math.PI * 2;
  const normAngle = ((angleRad % TWO_PI) + TWO_PI) % TWO_PI;
  const isNear = (target: number) => {
    const distance = Math.abs(normAngle - target);
    return Math.min(distance, TWO_PI - distance) < EPSILON;
  };
  const isQuarterTurn = isNear(Math.PI / 2) || isNear((3 * Math.PI) / 2);

  const outW = targetW ?? (isQuarterTurn ? h : w);
  const outH = targetH ?? (isQuarterTurn ? w : h);

  if (w <= 0 || h <= 0 || data.length === 0) {
    const safeW = Math.max(1, outW);
    const safeH = Math.max(1, outH);
    return { width: safeW, height: safeH, data: new Uint8ClampedArray(safeW * safeH * 4) };
  }

  const cx = pivotX ?? w / 2;
  const cy = pivotY ?? h / 2;
  const ocx = outPivotX ?? cx;
  const ocy = outPivotY ?? cy;

  const src8x = scale8x(src);
  const rotated = downscale8xMajorityVote(src8x, outW, outH, angleRad, cx, cy, ocx, ocy);
  return restoreRotatedContourColors(src, rotated, angleRad, cx, cy, ocx, ocy);
}

/**
 * Refines rotated pixel art by pruning redundant 2x2 L-corner elbow pixels (double pixels / staircase jaggies)
 * on 1-pixel strokes and contours while strictly preserving 8-connectivity and authored details.
 *
 * Topological Invariants:
 * 1. An L-cluster is identified in a 2x2 window where exactly 3 pixels are solid and 1 is transparent.
 * 2. The corner pixel P sharing orthogonal neighbors with both arms is evaluated for pruning.
 * 3. Pruning is ONLY permitted if:
 *    - P is not marked in protectedCells (authored eyes, mouth, 1px features, hole boundaries).
 *    - P is not an interior pixel of a solid fill (has < 4 solid orthogonal neighbors).
 *    - P has >= 2 solid 8-neighbors (isolated pixels and stroke endpoints are protected).
 *    - Local 8-connectivity: all solid 8-neighbors of P remain connected within a 5x5 window without P.
 *    - Global connectivity: component count remains invariant (no severed contours or broken rings).
 */
export function refinePixelPerfectContour(
  buffer: PixelBuffer,
  protectedCells?: Uint8Array
): PixelBuffer {
  const { width: w, height: h, data } = buffer;
  const outData = new Uint8ClampedArray(data);
  const buf32 = new Uint32Array(outData.buffer, outData.byteOffset, w * h);

  const isSolid = (x: number, y: number): boolean => {
    if (x < 0 || x >= w || y < 0 || y >= h) return false;
    return (buf32[y * w + x] >>> 24) > 0;
  };

  const countComponents = (): number => {
    let comps = 0;
    const visited = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) {
      if ((buf32[i] >>> 24) !== 0 && !visited[i]) {
        comps++;
        const q = [i];
        visited[i] = 1;
        while (q.length > 0) {
          const cur = q.pop()!;
          const cy = Math.floor(cur / w);
          const cx = cur % w;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;
              const nx = cx + dx, ny = cy + dy;
              if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                const ni = ny * w + nx;
                if ((buf32[ni] >>> 24) !== 0 && !visited[ni]) {
                  visited[ni] = 1;
                  q.push(ni);
                }
              }
            }
          }
        }
      }
    }
    return comps;
  };

  const baseComponents = countComponents();

  for (let pass = 0; pass < 1; pass++) {
    let prunedInPass = 0;
    const candidates: Array<{ x: number; y: number }> = [];

    for (let y = 0; y < h - 1; y++) {
      for (let x = 0; x < w - 1; x++) {
        const s00 = isSolid(x, y);
        const s10 = isSolid(x + 1, y);
        const s01 = isSolid(x, y + 1);
        const s11 = isSolid(x + 1, y + 1);
        const sum = (s00 ? 1 : 0) + (s10 ? 1 : 0) + (s01 ? 1 : 0) + (s11 ? 1 : 0);

        if (sum === 3) {
          let cx = -1, cy = -1;
          if (!s11 && s00 && s10 && s01) { cx = x; cy = y; }
          else if (!s01 && s00 && s10 && s11) { cx = x + 1; cy = y; }
          else if (!s10 && s00 && s01 && s11) { cx = x; cy = y + 1; }
          else if (!s00 && s10 && s01 && s11) { cx = x + 1; cy = y + 1; }

          if (cx !== -1) {
            candidates.push({ x: cx, y: cy });
          }
        }
      }
    }

    for (const { x, y } of candidates) {
      const idx = y * w + x;
      if ((buf32[idx] >>> 24) === 0) continue;
      if (protectedCells && protectedCells[idx]) continue;

      const solidNeighbors: Array<{ x: number; y: number }> = [];
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          if (isSolid(x + dx, y + dy)) {
            solidNeighbors.push({ x: x + dx, y: y + dy });
          }
        }
      }

      if (solidNeighbors.length <= 1) continue;

      const hasTop = isSolid(x, y - 1);
      const hasBottom = isSolid(x, y + 1);
      const hasLeft = isSolid(x - 1, y);
      const hasRight = isSolid(x + 1, y);
      if (hasTop && hasBottom && hasLeft && hasRight) continue;

      const start = solidNeighbors[0];
      const visited = new Set<number>();
      visited.add(start.y * w + start.x);
      const q = [start];

      while (q.length > 0) {
        const cur = q.pop()!;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = cur.x + dx, ny = cur.y + dy;
            if (nx === x && ny === y) continue;
            if (Math.abs(nx - x) <= 2 && Math.abs(ny - y) <= 2 && isSolid(nx, ny)) {
              const nidx = ny * w + nx;
              if (!visited.has(nidx)) {
                visited.add(nidx);
                q.push({ x: nx, y: ny });
              }
            }
          }
        }
      }

      let allConnected = true;
      for (const sn of solidNeighbors) {
        if (!visited.has(sn.y * w + sn.x)) {
          allConnected = false;
          break;
        }
      }
      if (!allConnected) continue;

      const savedColor = buf32[idx];
      buf32[idx] = 0;
      if (countComponents() === baseComponents) {
        prunedInPass++;
      } else {
        buf32[idx] = savedColor;
      }
    }

    if (prunedInPass === 0) break;
  }

  return { width: w, height: h, data: outData };
}

/**
 * RotSprite v2 — Feature-preserving arbitrary-angle pixel art rotation.
 * Executes multi-candidate subpixel search, structural scoring, and conservative detail restoration.
 */
export function rotSpriteV2(
  src: PixelBuffer,
  angleRad: number,
  pivotX?: number,
  pivotY?: number,
  targetW?: number,
  targetH?: number,
  outPivotX?: number,
  outPivotY?: number,
  pixelPerfect?: boolean
): PixelBuffer {
  const { width: w, height: h, data } = src;
  const EPSILON = 1e-5;
  const TWO_PI = Math.PI * 2;
  const normAngle = ((angleRad % TWO_PI) + TWO_PI) % TWO_PI;
  const isNear = (target: number) => {
    const distance = Math.abs(normAngle - target);
    return Math.min(distance, TWO_PI - distance) < EPSILON;
  };
  const isQuarterTurn = isNear(Math.PI / 2) || isNear((3 * Math.PI) / 2);

  const outW = targetW ?? (isQuarterTurn ? h : w);
  const outH = targetH ?? (isQuarterTurn ? w : h);

  if (w <= 0 || h <= 0 || data.length === 0) {
    const safeW = Math.max(1, outW);
    const safeH = Math.max(1, outH);
    return { width: safeW, height: safeH, data: new Uint8ClampedArray(safeW * safeH * 4) };
  }

  const cx = pivotX ?? w / 2;
  const cy = pivotY ?? h / 2;
  const ocx = outPivotX ?? cx;
  const ocy = outPivotY ?? cy;

  const analysis = analyzeSourceComponents(src);
  const src8x = scale8x(src);

  // Multi-candidate rotation search for small to medium sprites
  const area = w * h;
  let candidateOffsets: Array<[number, number]>;
  if (area > 4096) {
    // Large sprites (>64x64) evaluate candidate 0
    candidateOffsets = [[0, 0]];
  } else if (area <= 1024) {
    // Small sprites (<=32x32): full 9-candidate grid for maximum semantic preservation
    candidateOffsets = [
      [0, 0],
      [0.25, 0],
      [-0.25, 0],
      [0, 0.25],
      [0, -0.25],
      [0.25, 0.25],
      [0.25, -0.25],
      [-0.25, 0.25],
      [-0.25, -0.25],
    ];
  } else {
    // Medium sprites (32x32 to 64x64): 5-candidate cross
    candidateOffsets = [
      [0, 0],
      [0.25, 0],
      [-0.25, 0],
      [0, 0.25],
      [0, -0.25],
    ];
  }

  const C = Math.cos(angleRad);
  const S = Math.sin(angleRad);

  const shouldPixelPerfect = pixelPerfect ?? false;

  let bestCandBuf: PixelBuffer | null = null;
  let bestScore = Infinity;
  let bestOffset: [number, number] = [0, 0];

  for (let ci = 0; ci < candidateOffsets.length; ci++) {
    const [ox, oy] = candidateOffsets[ci];
    const cand = downscale8xMajorityVote(
      src8x,
      outW,
      outH,
      angleRad,
      cx,
      cy,
      ocx,
      ocy,
      ox,
      oy,
      shouldPixelPerfect
    );

    const c32 = new Uint32Array(cand.data.buffer, cand.data.byteOffset, outW * outH);
    let score = 0;
    let hardViolations = 0;

    // 0. Topological connectivity preservation (prevents fragmented outlines and severed limbs)
    const candComponents = countSolidComponents(c32, outW, outH);
    if (candComponents > analysis.solidComponentCount) {
      const extra = candComponents - analysis.solidComponentCount;
      hardViolations += extra;
      score += extra * 1500;
    }

    // 0b. Hole topology & leakage preservation (prevents broken contours from spilling interior holes)
    if (analysis.hasEnclosedHoles) {
      const extVisited = new Uint8Array(outW * outH);
      const extQueue: number[] = [];
      for (let x = 0; x < outW; x++) {
        const top = x;
        const btm = (outH - 1) * outW + x;
        if ((c32[top] >>> 24) === 0 && !extVisited[top]) { extVisited[top] = 1; extQueue.push(top); }
        if ((c32[btm] >>> 24) === 0 && !extVisited[btm]) { extVisited[btm] = 1; extQueue.push(btm); }
      }
      for (let y = 0; y < outH; y++) {
        const left = y * outW;
        const right = y * outW + (outW - 1);
        if ((c32[left] >>> 24) === 0 && !extVisited[left]) { extVisited[left] = 1; extQueue.push(left); }
        if ((c32[right] >>> 24) === 0 && !extVisited[right]) { extVisited[right] = 1; extQueue.push(right); }
      }
      while (extQueue.length > 0) {
        const cur = extQueue.pop()!;
        const cy2 = Math.floor(cur / outW);
        const cx2 = cur % outW;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = cx2 + dx, ny = cy2 + dy;
          if (nx >= 0 && nx < outW && ny >= 0 && ny < outH) {
            const nidx = ny * outW + nx;
            if ((c32[nidx] >>> 24) === 0 && !extVisited[nidx]) {
              extVisited[nidx] = 1;
              extQueue.push(nidx);
            }
          }
        }
      }
      let enclosedHolePixels = 0;
      for (let i = 0; i < outW * outH; i++) {
        if ((c32[i] >>> 24) === 0 && !extVisited[i]) {
          enclosedHolePixels++;
        }
      }
      if (enclosedHolePixels === 0) {
        hardViolations++;
        score += 2500;
      }
    }

    // 1. Small component preservation with distinct pixel claiming
    const claimedInCand = new Set<number>();
    for (const comp of analysis.smallComponents) {
      const relSx = comp.centroidX - cx - ox;
      const relSy = comp.centroidY - cy - oy;
      const expX = C * relSx - S * relSy + ocx;
      const expY = S * relSx + C * relSy + ocy;

      let found = false;
      const minX = Math.max(0, Math.floor(expX - 1.5));
      const maxX = Math.min(outW - 1, Math.ceil(expX + 1.5));
      const minY = Math.max(0, Math.floor(expY - 1.5));
      const maxY = Math.min(outH - 1, Math.ceil(expY + 1.5));

      for (let y = minY; y <= maxY && !found; y++) {
        for (let x = minX; x <= maxX && !found; x++) {
          const idx = y * outW + x;
          if (c32[idx] === comp.color && !claimedInCand.has(idx)) {
            if (comp.isInterior && touchesTransparencyOrBorder(c32, x, y, outW, outH)) continue;
            found = true;
            claimedInCand.add(idx);
          }
        }
      }
      if (!found) {
        hardViolations++;
        score += 1000;
      }
    }

    // 2. Hole preservation
    for (const hole of analysis.holes) {
      const relSx = hole.centroidX - cx - ox;
      const relSy = hole.centroidY - cy - oy;
      const expX = C * relSx - S * relSy + ocx;
      const expY = S * relSx + C * relSy + ocy;

      let found = false;
      const minX = Math.max(0, Math.floor(expX - 1.5));
      const maxX = Math.min(outW - 1, Math.ceil(expX + 1.5));
      const minY = Math.max(0, Math.floor(expY - 1.5));
      const maxY = Math.min(outH - 1, Math.ceil(expY + 1.5));

      for (let y = minY; y <= maxY && !found; y++) {
        for (let x = minX; x <= maxX && !found; x++) {
          if ((c32[y * outW + x] >>> 24) === 0) {
            if (hole.isInterior) {
              const isEnclosed =
                x > 0 && x < outW - 1 && y > 0 && y < outH - 1 &&
                (c32[(y - 1) * outW + x] >>> 24) !== 0 &&
                (c32[(y + 1) * outW + x] >>> 24) !== 0 &&
                (c32[y * outW + (x - 1)] >>> 24) !== 0 &&
                (c32[y * outW + (x + 1)] >>> 24) !== 0;
              if (isEnclosed) found = true;
            } else {
              found = true;
            }
          }
        }
      }
      if (!found) {
        hardViolations++;
        score += 800;
      }
    }

    // 3. Unique color retention
    const candColors = new Set(c32);
    for (const col of analysis.uniqueSolidColors) {
      if (!candColors.has(col)) {
        hardViolations++;
        score += 2000;
      }
    }

    // 4. Area distortion penalty
    let solidCount = 0;
    for (let i = 0; i < c32.length; i++) {
      if ((c32[i] >>> 24) !== 0) solidCount++;
    }
    score += Math.abs(solidCount - analysis.solidPixelCount) * 2;

    // 5. Offset Euclidean norm penalty (bias toward 0,0 when tied)
    score += Math.hypot(ox, oy) * 10;

    if (score < bestScore) {
      bestScore = score;
      bestCandBuf = cand;
      bestOffset = [ox, oy];
    }

    // Candidate 0 early exit: if the centered unshifted rotation has 0 hard semantic/topological
    // violations, it preserves symmetry and artwork fidelity without need for subpixel shifting.
    if (ci === 0 && hardViolations === 0) {
      bestScore = score;
      bestCandBuf = cand;
      bestOffset = [0, 0];
      break;
    }
  }

  // Conservative Semantic Restoration Pass on winning candidate
  const resultData = new Uint8ClampedArray(bestCandBuf!.data);
  const res32 = new Uint32Array(resultData.buffer, resultData.byteOffset, outW * outH);
  const [ox, oy] = bestOffset;

  const protectedCells = new Uint8Array(outW * outH);
  const claimedCells = new Set<number>();

  // Restore any missing small components into geometrically plausible context cells
  for (const comp of analysis.smallComponents) {
    const relSx = comp.centroidX - cx - ox;
    const relSy = comp.centroidY - cy - oy;
    const expX = C * relSx - S * relSy + ocx;
    const expY = S * relSx + C * relSy + ocy;
    const minX = Math.max(0, Math.floor(expX - 1.5));
    const maxX = Math.min(outW - 1, Math.ceil(expX + 1.5));
    const minY = Math.max(0, Math.floor(expY - 1.5));
    const maxY = Math.min(outH - 1, Math.ceil(expY + 1.5));

    let foundIdx = -1;
    for (let y = minY; y <= maxY && foundIdx === -1; y++) {
      for (let x = minX; x <= maxX && foundIdx === -1; x++) {
        const idx = y * outW + x;
        if (res32[idx] === comp.color && !claimedCells.has(idx)) {
          if (comp.isInterior && touchesTransparencyOrBorder(res32, x, y, outW, outH)) continue;
          foundIdx = idx;
        }
      }
    }

    if (foundIdx >= 0) {
      claimedCells.add(foundIdx);
      protectedCells[foundIdx] = 1;
    } else {
      type CandidateCell = { x: number; y: number; distSq: number; isContextMatch: boolean };
      const candidates: CandidateCell[] = [];

      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          const idx = y * outW + x;
          if (protectedCells[idx] || claimedCells.has(idx)) continue;
          const curCol = res32[idx];
          const isSolid = (curCol >>> 24) !== 0;

          if (comp.isInterior) {
            if (!isSolid) continue;
            if (touchesTransparencyOrBorder(res32, x, y, outW, outH)) continue;
          } else if (comp.neighborColors.size > 0) {
            if (!isSolid) continue;
          } else {
            // Isolated feature in empty space: preserve onto transparent cell, never overwrite solid art
            if (isSolid) continue;
          }

          const isContextMatch = comp.neighborColors.has(curCol);
          const distSq = (x + 0.5 - expX) ** 2 + (y + 0.5 - expY) ** 2;
          candidates.push({ x, y, distSq, isContextMatch });
        }
      }

      candidates.sort((a, b) => {
        if (a.isContextMatch !== b.isContextMatch) return a.isContextMatch ? -1 : 1;
        return a.distSq - b.distSq;
      });

      if (candidates.length > 0) {
        const best = candidates[0];
        const bidx = best.y * outW + best.x;
        res32[bidx] = comp.color;
        protectedCells[bidx] = 1;
        claimedCells.add(bidx);
      }
    }
  }

  // Restore any missing holes into enclosed interior cells
  for (const hole of analysis.holes) {
    const relSx = hole.centroidX - cx - ox;
    const relSy = hole.centroidY - cy - oy;
    const expX = C * relSx - S * relSy + ocx;
    const expY = S * relSx + C * relSy + ocy;

    let found = false;
    const minX = Math.max(0, Math.floor(expX - 1.5));
    const maxX = Math.min(outW - 1, Math.ceil(expX + 1.5));
    const minY = Math.max(0, Math.floor(expY - 1.5));
    const maxY = Math.min(outH - 1, Math.ceil(expY + 1.5));

    for (let y = minY; y <= maxY && !found; y++) {
      for (let x = minX; x <= maxX && !found; x++) {
        if ((res32[y * outW + x] >>> 24) === 0) {
          if (hole.isInterior) {
            const isEnclosed =
              x > 0 && x < outW - 1 && y > 0 && y < outH - 1 &&
              (res32[(y - 1) * outW + x] >>> 24) !== 0 &&
              (res32[(y + 1) * outW + x] >>> 24) !== 0 &&
              (res32[y * outW + (x - 1)] >>> 24) !== 0 &&
              (res32[y * outW + (x + 1)] >>> 24) !== 0;
            if (isEnclosed) found = true;
          } else {
            found = true;
          }
        }
      }
    }

    if (!found) {
      let bestDist = Infinity;
      let bestX = -1, bestY = -1;
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          const idx = y * outW + x;
          if (protectedCells[idx] || (res32[idx] >>> 24) === 0) continue;
          if (touchesTransparencyOrBorder(res32, x, y, outW, outH)) continue;
          const d = (x + 0.5 - expX) ** 2 + (y + 0.5 - expY) ** 2;
          if (d < bestDist) {
            bestDist = d;
            bestX = x;
            bestY = y;
          }
        }
      }
      if (bestX >= 0) {
        res32[bestY * outW + bestX] = 0;
        protectedCells[bestY * outW + bestX] = 1;
      }
    }
  }

  let resultBuf: PixelBuffer = { width: outW, height: outH, data: resultData };
  if (shouldPixelPerfect) {
    resultBuf = refinePixelPerfectContour(resultBuf, protectedCells);
  }
  return restoreRotatedContourColors(src, resultBuf, angleRad, cx, cy, ocx, ocy);
}

// ---------------------------------------------------------------------------
// RotSprite v3 — Contour-Aware Layered Rotation
// ---------------------------------------------------------------------------
//
// A single colour vote per output cell cannot keep a 1px outline 1px thick: at
// arbitrary angles the outline covers 30-70% of each cell, so it alternately
// vanishes (gaps) and doubles (blobs), and 1-2px eyes lose the vote entirely.
// v3 rotates each structural layer with the method that suits it:
//   1. Silhouette  — area coverage of a Scale8x-smoothed alpha mask, then
//                    one-cell spike/notch cleanup; tiny pieces and holes kept.
//   2. Outline     — the source ring width (0-3px) is measured, then the ring
//                    is regrown on the rotated silhouette at exactly that width
//                    and coloured from the nearest source cell of the same ring.
//   3. Interior    — Scale8x colour vote over body cells only.
//   4. Details     — small or one-pixel-thin regions (eyes, mouths, blush,
//                    shade bands) are inpainted out of the vote and re-placed as
//                    connected stamps with their original pixel count.
//   5. Strokes     — L-shaped elbows on unfilled 1px strokes are removed.

const SUB = 8;

/** Exact-equality Scale2x over packed values; edge cells are clamped. */
function scale2xPacked<T extends Uint8Array | Uint32Array>(src: T, w: number, h: number): T {
  const ow = w * 2;
  const out = (src instanceof Uint8Array ? new Uint8Array(ow * h * 2) : new Uint32Array(ow * h * 2)) as T;
  for (let y = 0; y < h; y++) {
    const up = (y > 0 ? y - 1 : y) * w, row = y * w, down = (y < h - 1 ? y + 1 : y) * w;
    for (let x = 0; x < w; x++) {
      const P = src[row + x], B = src[up + x], H = src[down + x];
      const D = src[row + (x > 0 ? x - 1 : x)], F = src[row + (x < w - 1 ? x + 1 : x)];
      let e0 = P, e1 = P, e2 = P, e3 = P;
      if (B !== H && D !== F) {
        if (D === B) e0 = D;
        if (B === F) e1 = F;
        if (D === H) e2 = D;
        if (H === F) e3 = F;
      }
      const o = y * 2 * ow + x * 2;
      out[o] = e0; out[o + 1] = e1; out[o + ow] = e2; out[o + ow + 1] = e3;
    }
  }
  return out;
}

function scale8xPacked<T extends Uint8Array | Uint32Array>(src: T, w: number, h: number): T {
  return scale2xPacked(scale2xPacked(scale2xPacked(src, w, h), w * 2, h * 2), w * 4, h * 4);
}

/** 1 + four-neighbour distance to transparency or the raster edge (capped); 0 for empty cells. */
function peelDepth(opaque: Uint8Array, w: number, h: number, cap: number): Uint8Array {
  const depth = new Uint8Array(w * h);
  let frontier: number[] = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (!opaque[i]) continue;
    if (x === 0 || y === 0 || x === w - 1 || y === h - 1 || !opaque[i - 1] || !opaque[i + 1] || !opaque[i - w] || !opaque[i + w]) {
      depth[i] = 1;
      frontier.push(i);
    }
  }
  for (let d = 2; d <= cap && frontier.length; d++) {
    const next: number[] = [];
    for (const i of frontier) {
      const x = i % w;
      for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w]) {
        if (j < 0 || j >= w * h || !opaque[j] || depth[j]) continue;
        depth[j] = d;
        next.push(j);
      }
    }
    frontier = next;
  }
  for (let i = 0; i < w * h; i++) if (opaque[i] && !depth[i]) depth[i] = cap;
  return depth;
}

/**
 * Chebyshev distance (capped) from each cell to the nearest change of value, treating the
 * outside as 0. Scale2x x3 only alters subpixels within ~1.75 cells of an edge, so a cell at
 * distance >= 4 has a uniform Scale8x neighbourhood and its samples need not be taken.
 */
function edgeDistance(values: Uint8Array | Uint32Array, w: number, h: number, cap: number): Uint8Array {
  const dist = new Uint8Array(w * h).fill(cap);
  let frontier: number[] = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, v = values[i];
    let edge = false;
    for (let dy = -1; dy <= 1 && !edge; dy++) for (let dx = -1; dx <= 1 && !edge; dx++) {
      const nx = x + dx, ny = y + dy;
      const nv = nx < 0 || ny < 0 || nx >= w || ny >= h ? 0 : values[ny * w + nx];
      if (nv !== v) edge = true;
    }
    if (edge) { dist[i] = 0; frontier.push(i); }
  }
  for (let d = 1; d < cap && frontier.length; d++) {
    const next: number[] = [];
    for (const i of frontier) {
      const x = i % w, y = (i - x) / w;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy, j = ny * w + nx;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h || dist[j] <= d) continue;
        dist[j] = d;
        next.push(j);
      }
    }
    frontier = next;
  }
  return dist;
}

interface Regions { labels: Int32Array; members: number[][] }

/** 8-connected components of accepted cells, split wherever `same` is false. */
function labelRegions(w: number, h: number, accept: (i: number) => boolean, same: (a: number, b: number) => boolean): Regions {
  const labels = new Int32Array(w * h);
  const members: number[][] = [[]];
  for (let s = 0; s < w * h; s++) {
    if (labels[s] || !accept(s)) continue;
    const id = members.length, list: number[] = [], queue = [s];
    labels[s] = id;
    while (queue.length) {
      const i = queue.pop()!, x = i % w, y = (i - x) / w;
      list.push(i);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy, j = ny * w + nx;
        if ((!dx && !dy) || nx < 0 || ny < 0 || nx >= w || ny >= h || labels[j] || !accept(j) || !same(i, j)) continue;
        labels[j] = id;
        queue.push(j);
      }
    }
    members.push(list);
  }
  return { labels, members };
}

/**
 * Measures a uniform outline ring: the largest k <= 3 whose peel layers 1..k are each
 * dominated by colours living almost exclusively within depth k. 0 means no outline.
 */
function detectOutlineWidth(src: Uint32Array, depth: Uint8Array): number {
  const total = new Map<number, number>();
  const byDepth = [new Map<number, number>(), new Map<number, number>(), new Map<number, number>()];
  const layerSize = [0, 0, 0];
  for (let i = 0; i < src.length; i++) {
    const d = depth[i];
    if (!d) continue;
    total.set(src[i], (total.get(src[i]) ?? 0) + 1);
    if (d <= 3) {
      byDepth[d - 1].set(src[i], (byDepth[d - 1].get(src[i]) ?? 0) + 1);
      layerSize[d - 1]++;
    }
  }
  let width = 0;
  for (let k = 1; k <= 3; k++) {
    const ring = new Set<number>();
    for (const [color, count] of total) {
      let shallow = 0;
      for (let j = 0; j < k; j++) shallow += byDepth[j].get(color) ?? 0;
      if (shallow >= count * 0.8) ring.add(color);
    }
    let ok = true;
    for (let j = 0; j < k && ok; j++) {
      let hits = 0;
      for (const [color, count] of byDepth[j]) if (ring.has(color)) hits += count;
      ok = layerSize[j] > 0 && hits >= layerSize[j] * 0.75;
    }
    // A ring must enclose a body of different colours; tiny sprites are otherwise all "ring".
    let deeper = 0, deeperRing = 0;
    for (let i = 0; i < src.length; i++) {
      if (depth[i] <= k) continue;
      deeper++;
      if (ring.has(src[i])) deeperRing++;
    }
    if (ok && deeper > 0 && deeperRing <= deeper * 0.5) width = k;
  }
  return width;
}

/** Removes one-cell spikes and fills one-cell notches created only by sampling phase. */
function smoothRotatedMask(mask: Uint8Array, coverage: Float32Array, w: number, h: number): void {
  const at = (x: number, y: number) => (x >= 0 && y >= 0 && x < w && y < h ? mask[y * w + x] : 0);
  const flips: number[] = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    const n4 = at(x - 1, y) + at(x + 1, y) + at(x, y - 1) + at(x, y + 1);
    if (mask[i] && n4 === 1 && coverage[i] < 0.75) {
      // Drop a spike only when its opaque neighbours form one run, so nothing disconnects.
      const ring = [at(x - 1, y - 1), at(x, y - 1), at(x + 1, y - 1), at(x + 1, y), at(x + 1, y + 1), at(x, y + 1), at(x - 1, y + 1), at(x - 1, y)];
      let runs = 0;
      for (let k = 0; k < 8; k++) if (ring[k] && !ring[(k + 7) % 8]) runs++;
      if (runs === 1) flips.push(i);
    } else if (!mask[i] && n4 >= 3 && coverage[i] > 0.2) {
      flips.push(i);
    }
  }
  for (const i of flips) mask[i] ^= 1;
}

/**
 * RotSprite v3 — contour-aware arbitrary-angle rotation (see section header).
 * Output colours are always copied from the source; no colour is invented or blended.
 */
export function rotSpriteContour(
  src: PixelBuffer,
  angleRad: number,
  pivotX: number,
  pivotY: number,
  outW: number,
  outH: number,
  outPivotX: number,
  outPivotY: number
): PixelBuffer {
  const { width: w, height: h } = src;
  const n = outW * outH;
  const raw = new Uint32Array(src.data.buffer, src.data.byteOffset, w * h);
  const s32 = new Uint32Array(w * h);
  const opaque = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) if (raw[i] >>> 24) { s32[i] = raw[i]; opaque[i] = 1; }

  const cos = Math.cos(angleRad), sin = Math.sin(angleRad);
  // Inverse map from output space to source space.
  const ax = pivotX - cos * outPivotX - sin * outPivotY;
  const ay = pivotY + sin * outPivotX - cos * outPivotY;
  const toSx = (px: number, py: number) => ax + cos * px + sin * py;
  const toSy = (px: number, py: number) => ay - sin * px + cos * py;

  const srcDepth = peelDepth(opaque, w, h, 8);
  const K = Math.max(1, detectOutlineWidth(s32, srcDepth));
  const w8 = w * SUB, h8 = h * SUB;

  // Unfilled one-pixel strokes (cells in no opaque 2x2 block) straddle two output cells at
  // ~50% coverage and would break at any threshold, so they skip the coverage pass and are
  // redrawn as a graph below: rotated pixel centres, bridged wherever neighbours separate.
  const solidSrc = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && opaque[y * w + x] === 1;
  const thin = new Uint8Array(w * h);
  const fat = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!solidSrc(x, y)) continue;
    let inBlock = false;
    for (const [dx, dy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      if (solidSrc(x + dx, y) && solidSrc(x, y + dy) && solidSrc(x + dx, y + dy)) inBlock = true;
    }
    if (inBlock) fat[y * w + x] = 1; else thin[y * w + x] = 1;
  }

  // Sub-sample offsets from a cell centre, pre-rotated into source space.
  const SAMPLES = SUB * SUB;
  const subX = new Float64Array(SAMPLES), subY = new Float64Array(SAMPLES), subWeight = new Float64Array(SAMPLES);
  for (let v = 0, k = 0; v < SUB; v++) for (let u = 0; u < SUB; u++, k++) {
    const ou = (u + 0.5) / SUB - 0.5, ov = (v + 0.5) / SUB - 0.5;
    subX[k] = cos * ou + sin * ov;
    subY[k] = -sin * ou + cos * ov;
    subWeight[k] = 1 / (1 + (ou * ou + ov * ov) * 8);
  }
  // Source cell under an output cell centre, or -1 when the whole Scale8x neighbourhood is
  // outside the sprite (every sample would miss).
  const UNIFORM = 4;
  const centreCell = (sx: number, sy: number) => {
    const fx = Math.floor(sx), fy = Math.floor(sy);
    if (fx < -UNIFORM || fy < -UNIFORM || fx >= w + UNIFORM || fy >= h + UNIFORM) return -2;
    return fx >= 0 && fy >= 0 && fx < w && fy < h ? fy * w + fx : -1;
  };

  // 1. Silhouette coverage of filled areas. The 8x mask is scoped so it can be collected early.
  const coverage = new Float32Array(n);
  {
    const mask8 = scale8xPacked(fat, w, h);
    const fatEdge = edgeDistance(fat, w, h, UNIFORM);
    for (let y = 0; y < outH; y++) for (let x = 0; x < outW; x++) {
      const sx = toSx(x + 0.5, y + 0.5), sy = toSy(x + 0.5, y + 0.5);
      const cell = centreCell(sx, sy);
      if (cell === -2) continue;
      if (cell >= 0 && fatEdge[cell] >= UNIFORM) { coverage[y * outW + x] = fat[cell]; continue; }
      let hit = 0;
      for (let k = 0; k < SAMPLES; k++) {
        const sx8 = Math.floor((sx + subX[k]) * SUB), sy8 = Math.floor((sy + subY[k]) * SUB);
        if (sx8 >= 0 && sy8 >= 0 && sx8 < w8 && sy8 < h8 && mask8[sy8 * w8 + sx8]) hit++;
      }
      coverage[y * outW + x] = hit / SAMPLES;
    }
  }
  const mask = new Uint8Array(n);
  for (let i = 0; i < n; i++) mask[i] = coverage[i] >= 0.5 ? 1 : 0;
  smoothRotatedMask(mask, coverage, outW, outH);

  const fwdX = (sx: number, sy: number) => cos * (sx - pivotX) - sin * (sy - pivotY) + outPivotX;
  const fwdY = (sx: number, sy: number) => sin * (sx - pivotX) + cos * (sy - pivotY) + outPivotY;
  const plot = (x: number, y: number) => {
    const ix = Math.floor(x), iy = Math.floor(y);
    if (ix >= 0 && iy >= 0 && ix < outW && iy < outH) mask[iy * outW + ix] = 1;
  };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!solidSrc(x, y)) continue;
    const isThin = thin[y * w + x] === 1;
    const ax0 = fwdX(x + 0.5, y + 0.5), ay0 = fwdY(x + 0.5, y + 0.5);
    if (isThin) plot(ax0, ay0);
    for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [-1, 1]]) {
      if (!solidSrc(x + dx, y + dy) || (!isThin && !thin[(y + dy) * w + x + dx])) continue;
      // A diagonal link is redundant when an orthogonal path already joins the two cells.
      if (dx && dy && (solidSrc(x + dx, y) || solidSrc(x, y + dy))) continue;
      const bx = fwdX(x + dx + 0.5, y + dy + 0.5), by = fwdY(x + dx + 0.5, y + dy + 0.5);
      // Neighbours land at most two cells apart; bridge only a real gap, at its midpoint.
      if (Math.max(Math.abs(Math.floor(bx) - Math.floor(ax0)), Math.abs(Math.floor(by) - Math.floor(ay0))) > 1) {
        plot((ax0 + bx) / 2, (ay0 + by) / 2);
      }
    }
  }

  // Coverage of a source region on the output grid, sampled on hard 1x cells near its pixels.
  const regionCoverage = (labels: Int32Array, id: number, pixels: number[]) => {
    const candidates = new Set<number>();
    for (const p of pixels) {
      const sx = p % w + 0.5 - pivotX, sy = (p - p % w) / w + 0.5 - pivotY;
      const px = cos * sx - sin * sy + outPivotX, py = sin * sx + cos * sy + outPivotY;
      for (let y = Math.floor(py - 1.25); y <= Math.floor(py + 1.25); y++) {
        for (let x = Math.floor(px - 1.25); x <= Math.floor(px + 1.25); x++) {
          if (x >= 0 && y >= 0 && x < outW && y < outH) candidates.add(y * outW + x);
        }
      }
    }
    const cov = new Map<number, number>();
    for (const c of candidates) {
      const x = c % outW, y = (c - x) / outW;
      let hit = 0;
      for (let v = 0; v < SUB; v++) for (let u = 0; u < SUB; u++) {
        const px = x + (u + 0.5) / SUB, py = y + (v + 0.5) / SUB;
        const sx = Math.floor(toSx(px, py)), sy = Math.floor(toSy(px, py));
        if (sx >= 0 && sy >= 0 && sx < w && sy < h && labels[sy * w + sx] === id) hit++;
      }
      if (hit) cov.set(c, hit / (SUB * SUB));
    }
    return cov;
  };

  // Greedy connected growth of `count` cells by descending coverage (area-preserving stamp).
  const stamp = (cov: Map<number, number>, count: number, allowed: (i: number) => boolean): number[] => {
    let seed = -1, best = 0;
    for (const [c, v] of cov) if (v > best && allowed(c)) { best = v; seed = c; }
    if (seed < 0) return [];
    const chosen = new Set([seed]);
    while (chosen.size < count) {
      let pick = -1, pickScore = 0;
      for (const c of chosen) {
        const x = c % outW;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const j = c + dy * outW + dx;
          if (x + dx < 0 || x + dx >= outW || j < 0 || j >= n || chosen.has(j) || !allowed(j)) continue;
          const v = cov.get(j) ?? 0;
          // Orthogonal neighbours win ties so strokes stay solid.
          const score = v + (dx && dy ? 0 : 1e-3);
          if (v > 0 && score > pickScore) { pickScore = score; pick = j; }
        }
      }
      if (pick < 0) break;
      chosen.add(pick);
    }
    return [...chosen];
  };

  // Small detached pieces (sparkles, stray accents) must survive.
  const pieces = labelRegions(w, h, (i) => opaque[i] === 1, () => true);
  for (let id = 1; id < pieces.members.length; id++) {
    const pixels = pieces.members[id];
    if (pixels.length > 24) continue;
    const cov = regionCoverage(pieces.labels, id, pixels);
    let present = false;
    for (const c of cov.keys()) if (mask[c]) { present = true; break; }
    if (!present) for (const c of stamp(cov, pixels.length, () => true)) mask[c] = 1;
  }

  // Small enclosed holes (rings, eye sockets) must stay open.
  const holes = labelRegions(w, h, (i) => opaque[i] === 0, () => true);
  for (let id = 1; id < holes.members.length; id++) {
    const pixels = holes.members[id];
    if (pixels.length > 24) continue;
    const enclosed = pixels.every((p) => {
      const x = p % w, y = (p - x) / w;
      return x > 0 && y > 0 && x < w - 1 && y < h - 1;
    });
    if (!enclosed) continue;
    const cov = regionCoverage(holes.labels, id, pixels);
    let open = false;
    for (const [c, v] of cov) if (!mask[c] && v >= 0.25) { open = true; break; }
    if (!open) for (const c of stamp(cov, pixels.length, () => true)) mask[c] = 0;
  }

  // 2. Outline rings: regrow at the source width and colour from the same ring.
  const outDepth = peelDepth(mask, outW, outH, K + 1);
  const out = new Uint32Array(n);

  const nearestSource = (sx: number, sy: number, accept: (i: number) => boolean, radius: number): number => {
    const cx = Math.floor(sx), cy = Math.floor(sy);
    let best = -1, bestD = Infinity;
    for (let r = 0; r <= radius; r++) {
      for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) {
        if (Math.max(Math.abs(x - cx), Math.abs(y - cy)) !== r || x < 0 || y < 0 || x >= w || y >= h) continue;
        const i = y * w + x;
        if (!accept(i)) continue;
        const d = (x + 0.5 - sx) ** 2 + (y + 0.5 - sy) ** 2;
        if (d < bestD) { bestD = d; best = i; }
      }
      if (best >= 0 && r >= 1) break;
    }
    return best;
  };

  // 4 (setup). Small or one-pixel-thin interior regions are stamped rather than voted.
  const regions = labelRegions(w, h, (i) => srcDepth[i] > K, (a, b) => s32[a] === s32[b]);
  const regionCount = regions.members.length;
  const stamped = new Uint8Array(regionCount);
  let largest = 0;
  for (let id = 1; id < regionCount; id++) if (regions.members[id].length > regions.members[largest].length) largest = id;
  for (let id = 1; id < regionCount; id++) {
    const pixels = regions.members[id];
    if (id === largest || pixels.length > 256) continue;
    const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && regions.labels[y * w + x] === id;
    const thin = pixels.every((p) => {
      const x = p % w, y = (p - x) / w;
      return !(inside(x - 1, y) && inside(x + 1, y) && inside(x, y - 1) && inside(x, y + 1));
    });
    if (pixels.length <= 24 || thin) stamped[id] = 1;
  }

  // 3. Interior vote source: body cells only, with stamped regions inpainted from their surroundings.
  const body = new Uint32Array(w * h);
  let pending: number[] = [];
  for (let i = 0; i < w * h; i++) {
    if (srcDepth[i] <= K) continue;
    if (stamped[regions.labels[i]]) pending.push(i); else body[i] = s32[i];
  }
  // Inpaint each region only from unstamped body colour or its own already-filled cells, so
  // fills never cascade through neighbouring details.
  const filled = new Int32Array(w * h);
  const tally = new Map<number, number>();
  for (let guard = 0; pending.length && guard < 64; guard++) {
    const fills: number[] = [];
    const rest: number[] = [];
    for (const i of pending) {
      const x = i % w, y = (i - x) / w, id = regions.labels[i];
      tally.clear();
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if ((!dx && !dy) || nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const j = ny * w + nx, c = body[j];
        if (!c || (filled[j] && filled[j] !== id)) continue;
        tally.set(c, (tally.get(c) ?? 0) + (dx && dy ? 1 : 2));
      }
      let bestC = 0, bestN = 0;
      for (const [c, k] of tally) if (k > bestN) { bestN = k; bestC = c; }
      if (bestC) fills.push(i, bestC); else rest.push(i);
    }
    for (let k = 0; k < fills.length; k += 2) { body[fills[k]] = fills[k + 1]; filled[fills[k]] = regions.labels[fills[k]]; }
    pending = rest;
    if (!fills.length) break;
  }
  // A region walled in by outline has no surrounding body to borrow from: it is the local body
  // itself (a guard band, a strap), so it stays in the vote instead of being stamped.
  for (const i of pending) {
    body[i] = s32[i];
    stamped[regions.labels[i]] = 0;
  }
  for (let i = 0; i < w * h; i++) if (filled[i] && !stamped[filled[i]]) body[i] = s32[i];
  const body8 = scale8xPacked(body, w, h);
  const bodyEdge = edgeDistance(body, w, h, UNIFORM);
  const voteColors = new Uint32Array(SAMPLES), voteWeights = new Float64Array(SAMPLES);
  // Stamped regions are inpainted out of the vote; cells centred on one remember it (step 4).
  const bandUnder = new Int32Array(n);
  let voteCount = 0;

  for (let y = 0; y < outH; y++) for (let x = 0; x < outW; x++) {
    const i = y * outW + x, d = outDepth[i];
    if (!d) continue;
    const cx = x + 0.5, cy = y + 0.5, sx = toSx(cx, cy), sy = toSy(cx, cy);
    if (d <= K) {
      let j = nearestSource(sx, sy, (k) => srcDepth[k] === d, 3);
      if (j < 0) j = nearestSource(sx, sy, (k) => srcDepth[k] > 0, 4);
      out[i] = j >= 0 ? s32[j] : 0;
      continue;
    }
    const cell = centreCell(sx, sy);
    if (cell >= 0 && srcDepth[cell] > K && stamped[regions.labels[cell]]) {
      bandUnder[i] = regions.labels[cell];
    }
    if (cell >= 0 && bodyEdge[cell] >= UNIFORM && body[cell]) { out[i] = body[cell]; continue; }
    voteCount = 0;
    for (let k = 0; k < SAMPLES; k++) {
      const sx8 = Math.floor((sx + subX[k]) * SUB), sy8 = Math.floor((sy + subY[k]) * SUB);
      if (sx8 < 0 || sy8 < 0 || sx8 >= w8 || sy8 >= h8) continue;
      const c = body8[sy8 * w8 + sx8];
      if (!c) continue;
      let slot = 0;
      while (slot < voteCount && voteColors[slot] !== c) slot++;
      if (slot === voteCount) { voteColors[slot] = c; voteWeights[slot] = 0; voteCount++; }
      voteWeights[slot] += subWeight[k];
    }
    let bestC = 0, bestV = 0;
    for (let slot = 0; slot < voteCount; slot++) if (voteWeights[slot] > bestV) { bestV = voteWeights[slot]; bestC = voteColors[slot]; }
    if (!bestC) {
      const j = nearestSource(sx, sy, (k) => srcDepth[k] > K, 4);
      if (j >= 0) {
        // Cells next to a stamped region take its inpainted colour unless step 4 finds it squeezed.
        if (stamped[regions.labels[j]]) bandUnder[i] = regions.labels[j];
        bestC = body[j] || s32[j];
      } else {
        const any = nearestSource(sx, sy, (k) => srcDepth[k] > 0, 4);
        bestC = any >= 0 ? s32[any] : 0;
      }
    }
    out[i] = bestC;
  }

  // 4. Details: smallest first claim their cells, larger stamps grow around them.
  const order: number[] = [];
  for (let id = 1; id < regionCount; id++) if (stamped[id]) order.push(id);
  order.sort((a, b) => regions.members[a].length - regions.members[b].length);
  const owned = new Uint8Array(n);
  const squeezed = new Uint8Array(regionCount);
  for (const id of order) {
    const pixels = regions.members[id];
    const color = s32[pixels[0]];
    const cov = regionCoverage(regions.labels, id, pixels);
    const allowed = (k: number) => outDepth[k] > K && !owned[k];
    // Claim only the area that actually lands inside the rotated body, so a thin body is
    // shared proportionally between neighbouring bands; 1-3px accents always keep full size.
    let landed = 0;
    for (const [c, v] of cov) if (allowed(c)) landed += v;
    const count = pixels.length <= 3 ? pixels.length : Math.max(1, Math.min(pixels.length, Math.round(landed)));
    const placed = stamp(cov, count, allowed);
    if (placed.length < pixels.length) squeezed[id] = 1;
    for (const c of placed) {
      out[c] = color;
      owned[c] = 1;
    }
  }

  // A region squeezed by a narrow rotated body could not place its full stamp; body cells
  // centred on it keep its colour rather than the inpainted neighbour colour. Uncrowded
  // details (eyes) placed everything, so their exact pixel count is untouched.
  for (let i = 0; i < n; i++) {
    const id = bandUnder[i];
    if (id && squeezed[id] && !owned[i] && outDepth[i] > K) out[i] = s32[regions.members[id][0]];
  }

  // 5. Pixel-perfect strokes: drop L-shaped elbows on unfilled one-pixel strokes.
  const solidAt = (x: number, y: number) => x >= 0 && y >= 0 && x < outW && y < outH && (out[y * outW + x] >>> 24) !== 0;
  for (let y = 0; y < outH; y++) for (let x = 0; x < outW; x++) {
    const i = y * outW + x;
    if (!(out[i] >>> 24)) continue;
    const l = solidAt(x - 1, y), r = solidAt(x + 1, y), u = solidAt(x, y - 1), d = solidAt(x, y + 1);
    if (+l + +r + +u + +d !== 2 || (l && r) || (u && d)) continue;
    const hx = l ? -1 : 1, vy = u ? -1 : 1;
    if (solidAt(x + hx, y + vy)) continue;
    if (out[i] !== out[(y + vy) * outW + x] && out[i] !== out[y * outW + x + hx]) continue;
    let safe = true;
    for (let dy = -1; dy <= 1 && safe; dy++) for (let dx = -1; dx <= 1 && safe; dx++) {
      if ((!dx && !dy) || !solidAt(x + dx, y + dy) || (dx === 0 && dy === vy) || (dy === 0 && dx === hx)) continue;
      // Every other neighbour must stay attached through one of the two kept arms.
      const nearVertical = Math.abs(dy - vy) <= 1, nearHorizontal = Math.abs(dx - hx) <= 1;
      if (!nearVertical && !nearHorizontal) safe = false;
    }
    if (safe) out[i] = 0;
  }

  // Flatten one-pixel bumps on strokes: a cell whose only neighbours are the two diagonals on
  // one side (a "^" kink from rounding) drops into the empty cell between them.
  for (let y = 0; y < outH; y++) for (let x = 0; x < outW; x++) {
    const i = y * outW + x;
    if (!(out[i] >>> 24)) continue;
    let neighbours = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && solidAt(x + dx, y + dy)) neighbours++;
    if (neighbours !== 2) continue;
    for (const [sx, sy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      // (sx, sy) points to the side holding both diagonal neighbours.
      const ax = sx || -1, ay = sy || -1, bx = sx || 1, by = sy || 1;
      if (solidAt(x + ax, y + ay) && solidAt(x + bx, y + by) && !solidAt(x + sx, y + sy)) {
        out[(y + sy) * outW + x + sx] = out[i];
        out[i] = 0;
        break;
      }
    }
  }

  return { width: outW, height: outH, data: new Uint8ClampedArray(out.buffer) };
}

/**
 * Main RotSprite rotation entry point for PixiBun Atelier.
 * Handles exact orthogonal fast paths, then delegates arbitrary-angle rotations
 * to the feature-preserving RotSprite v2 engine.
 */
export function rotSprite(
  src: PixelBuffer,
  angleRad: number,
  pivotX?: number,
  pivotY?: number,
  targetW?: number,
  targetH?: number,
  outPivotX?: number,
  outPivotY?: number,
  pixelPerfect?: boolean
): PixelBuffer {
  const { width: w, height: h, data } = src;
  const EPSILON = 1e-5;
  const TWO_PI = Math.PI * 2;
  const normAngle = ((angleRad % TWO_PI) + TWO_PI) % TWO_PI;
  const isNear = (target: number) => {
    const distance = Math.abs(normAngle - target);
    return Math.min(distance, TWO_PI - distance) < EPSILON;
  };
  const isQuarterTurn = isNear(Math.PI / 2) || isNear((3 * Math.PI) / 2);

  const outW = targetW ?? (isQuarterTurn ? h : w);
  const outH = targetH ?? (isQuarterTurn ? w : h);

  if (w <= 0 || h <= 0 || data.length === 0) {
    const safeW = Math.max(1, outW);
    const safeH = Math.max(1, outH);
    return { width: safeW, height: safeH, data: new Uint8ClampedArray(safeW * safeH * 4) };
  }

  const cx = pivotX ?? w / 2;
  const cy = pivotY ?? h / 2;
  const ocx = outPivotX ?? cx;
  const ocy = outPivotY ?? cy;

  // Explicit destination geometry (selection/layer transforms) can still use
  // exact integer quarter turns, even when the crop and pivot are off-center.
  if (targetW !== undefined && targetH !== undefined && outPivotX !== undefined && outPivotY !== undefined &&
      (isNear(0) || isNear(Math.PI / 2) || isNear(Math.PI) || isNear((3 * Math.PI) / 2))) {
    const quarter = isNear(Math.PI / 2) ? 1 : isNear(Math.PI) ? 2 : isNear((3 * Math.PI) / 2) ? 3 : 0;
    const outBytes = new Uint8ClampedArray(outW * outH * 4);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dx = x + 0.5 - cx;
        const dy = y + 0.5 - cy;
        const rx = quarter === 0 ? dx : quarter === 1 ? -dy : quarter === 2 ? -dx : dy;
        const ry = quarter === 0 ? dy : quarter === 1 ? dx : quarter === 2 ? -dy : -dx;
        const ox = Math.floor(rx + ocx);
        const oy = Math.floor(ry + ocy);
        if (ox >= 0 && ox < outW && oy >= 0 && oy < outH) {
          const sourceOffset = (y * w + x) * 4;
          outBytes.set(data.subarray(sourceOffset, sourceOffset + 4), (oy * outW + ox) * 4);
        }
      }
    }
    return { width: outW, height: outH, data: outBytes };
  }

  // 1. Lossless fast-paths for exact orthogonal 90-degree multiples when output dimensions match
  if ((isNear(0) || isNear(TWO_PI)) && outW === w && outH === h) {
    const copy = new Uint8ClampedArray(data.length);
    copy.set(data);
    return { width: w, height: h, data: copy };
  }

  if (
    isNear(Math.PI) &&
    outW === w &&
    outH === h &&
    Math.abs(cx - w / 2) < EPSILON &&
    Math.abs(cy - h / 2) < EPSILON
  ) {
    const outBytes = new Uint8ClampedArray(w * h * 4);
    const src32 = new Uint32Array(data.buffer, data.byteOffset, w * h);
    const out32 = new Uint32Array(outBytes.buffer, outBytes.byteOffset, w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        out32[(h - 1 - y) * w + (w - 1 - x)] = src32[y * w + x];
      }
    }
    return { width: w, height: h, data: outBytes };
  }

  if (
    isNear(Math.PI / 2) &&
    outW === h &&
    outH === w &&
    Math.abs(cx - w / 2) < EPSILON &&
    Math.abs(cy - h / 2) < EPSILON
  ) {
    const outBytes = new Uint8ClampedArray(w * h * 4);
    const src32 = new Uint32Array(data.buffer, data.byteOffset, w * h);
    const out32 = new Uint32Array(outBytes.buffer, outBytes.byteOffset, w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        out32[x * h + (h - 1 - y)] = src32[y * w + x];
      }
    }
    return { width: h, height: w, data: outBytes };
  }

  if (
    isNear((3 * Math.PI) / 2) &&
    outW === h &&
    outH === w &&
    Math.abs(cx - w / 2) < EPSILON &&
    Math.abs(cy - h / 2) < EPSILON
  ) {
    const outBytes = new Uint8ClampedArray(w * h * 4);
    const src32 = new Uint32Array(data.buffer, data.byteOffset, w * h);
    const out32 = new Uint32Array(outBytes.buffer, outBytes.byteOffset, w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        out32[(w - 1 - x) * h + y] = src32[y * w + x];
      }
    }
    return { width: h, height: w, data: outBytes };
  }

  if (
    isNear(Math.PI / 2) &&
    outW === w &&
    outH === h &&
    Math.abs(cx - w / 2) < EPSILON &&
    Math.abs(cy - h / 2) < EPSILON
  ) {
    const outBytes = new Uint8ClampedArray(w * h * 4);
    const src32 = new Uint32Array(data.buffer, data.byteOffset, w * h);
    const out32 = new Uint32Array(outBytes.buffer, outBytes.byteOffset, w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const sx = Math.floor(cx + (y - ocy));
        const sy = Math.floor(cy - (x - ocx));
        if (sx >= 0 && sx < w && sy >= 0 && sy < h) {
          out32[y * w + x] = src32[sy * w + sx];
        }
      }
    }
    return { width: w, height: h, data: outBytes };
  }

  if (
    isNear((3 * Math.PI) / 2) &&
    outW === w &&
    outH === h &&
    Math.abs(cx - w / 2) < EPSILON &&
    Math.abs(cy - h / 2) < EPSILON
  ) {
    const outBytes = new Uint8ClampedArray(w * h * 4);
    const src32 = new Uint32Array(data.buffer, data.byteOffset, w * h);
    const out32 = new Uint32Array(outBytes.buffer, outBytes.byteOffset, w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const sx = Math.floor(cx - (y - ocy));
        const sy = Math.floor(cy + (x - ocx));
        if (sx >= 0 && sx < w && sy >= 0 && sy < h) {
          out32[y * w + x] = src32[sy * w + sx];
        }
      }
    }
    return { width: w, height: h, data: outBytes };
  }

  // 2. Arbitrary angles use the contour-aware v3 engine, whose rebuilt outlines are
  // inherently pixel-perfect. `pixelPerfect` only selects behaviour of the frozen v2 engine.
  void pixelPerfect;
  return rotSpriteContour(src, angleRad, cx, cy, outW, outH, ocx, ocy);
}

export interface RotatedBoundingBox {
  targetW: number;
  targetH: number;
  destX: number;
  destY: number;
  localPivotX: number;
  localPivotY: number;
  outPivotX: number;
  outPivotY: number;
}

/**
 * Computes destination integer bounding box and pivot alignments for a rotated sprite region.
 */
export function computeRotatedBounds(
  w: number,
  h: number,
  x: number,
  y: number,
  pivotX: number,
  pivotY: number,
  rotationRad: number
): RotatedBoundingBox {
  const localPivotX = pivotX - x;
  const localPivotY = pivotY - y;
  const cos = Math.cos(rotationRad);
  const sin = Math.sin(rotationRad);

  const corners = [
    { x: 0, y: 0 },
    { x: w, y: 0 },
    { x: w, y: h },
    { x: 0, y: h },
  ].map((pt) => {
    const dx = pt.x - localPivotX;
    const dy = pt.y - localPivotY;
    return {
      x: localPivotX + cos * dx - sin * dy,
      y: localPivotY + sin * dx + cos * dy,
    };
  });

  const minX = Math.floor(Math.min(...corners.map((c) => c.x)));
  const maxX = Math.ceil(Math.max(...corners.map((c) => c.x)));
  const minY = Math.floor(Math.min(...corners.map((c) => c.y)));
  const maxY = Math.ceil(Math.max(...corners.map((c) => c.y)));

  const targetW = Math.max(1, maxX - minX);
  const targetH = Math.max(1, maxY - minY);
  const destX = Math.round(x + minX);
  const destY = Math.round(y + minY);
  const outPivotX = localPivotX - minX;
  const outPivotY = localPivotY - minY;

  return {
    targetW,
    targetH,
    destX,
    destY,
    localPivotX,
    localPivotY,
    outPivotX,
    outPivotY,
  };
}
