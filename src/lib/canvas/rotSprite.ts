/**
 * RotSprite Algorithm Implementation.
 *
 * Academic & Historical Reference:
 * - Xenowhirl (2007), "RotSprite: An algorithm for rotating pixel art" (as popularized in Aseprite).
 * - Eric Johnston (1992), "EPX / Scale2x algorithm", LucasArts.
 *
 * Architecture:
 * 1. Lossless integer fast-paths for 0°, 90°, 180°, 270°.
 * 2. 3-pass Scale2x / EPX expansion (1x -> 2x -> 4x -> 8x) respecting color similarity thresholds.
 * 3. Inverse affine point sampling on the 8x raster with subpixel center alignment.
 * 4. Gaussian center-weighted majority voting downscaler (8x -> 1x) that strictly preserves
 *    original palette colors (0 new color artifacts) and preserves single-pixel line continuity.
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
export function scale2x(src: PixelBuffer, similarityThreshold = 28): PixelBuffer {
  const { width: curW, height: curH, data: srcBytes } = src;
  const outW = curW * 2;
  const outH = curH * 2;
  const outBytes = new Uint8ClampedArray(outW * outH * 4);

  const src32 = new Uint32Array(srcBytes.buffer, srcBytes.byteOffset, curW * curH);
  const out32 = new Uint32Array(outBytes.buffer, outBytes.byteOffset, outW * outH);

  const getPx = (x: number, y: number): number => {
    if (x < 0 || x >= curW || y < 0 || y >= curH) return 0;
    return src32[y * curW + x];
  };

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
      if (colorDistance32(B, H) > similarityThreshold && colorDistance32(D, F) > similarityThreshold) {
        if (colorDistance32(D, B) <= similarityThreshold) {
          e0 = colorDistance32(D, P) <= colorDistance32(B, P) ? D : B;
        }
        if (colorDistance32(B, F) <= similarityThreshold) {
          e1 = colorDistance32(B, P) <= colorDistance32(F, P) ? B : F;
        }
        if (colorDistance32(D, H) <= similarityThreshold) {
          e2 = colorDistance32(D, P) <= colorDistance32(H, P) ? D : H;
        }
        if (colorDistance32(H, F) <= similarityThreshold) {
          e3 = colorDistance32(H, P) <= colorDistance32(F, P) ? H : F;
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
export function scale8x(src: PixelBuffer, similarityThreshold = 28): PixelBuffer {
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
 */
export function downscale8xMajorityVote(
  src8x: PixelBuffer,
  targetW: number,
  targetH: number,
  angleRad: number,
  srcPivotX: number,
  srcPivotY: number,
  outPivotX: number = srcPivotX,
  outPivotY: number = srcPivotY
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
          const sx = cos * dx - sin * dy + srcPivotX;
          const sy = sin * dx + cos * dy + srcPivotY;

          // Map to 8x scale raster with epsilon
          const sx8 = Math.floor(sx * 8 + 1e-9);
          const sy8 = Math.floor(sy * 8 + 1e-9);

          // Radially symmetric Gaussian center-weighted falloff
          const distSq = u * u + v * v;
          const weight = 1.0 + 0.01 * (25 - distSq);
          totalWeight += weight;

          let color = 0;
          if (sx8 >= 0 && sx8 < w8 && sy8 >= 0 && sy8 < h8) {
            color = s8_32[sy8 * w8 + sx8];
          }

          if (color !== 0) {
            votes.set(color, (votes.get(color) || 0) + weight);
            nonTransparentWeight += weight;
            if ((ui === 3 || ui === 4) && (vi === 3 || vi === 4)) {
              centerCoreWeight += weight;
            }
          }
        }
      }

      // Feature conservation threshold:
      // Preserves 1px thin lines if center core touches solid pixels,
      // otherwise requires solid majority to prevent border dilation.
      const dynamicThreshold = centerCoreWeight > 0 ? 0.20 : 0.38;
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

/**
 * Main RotSprite Algorithm entry point.
 * Rotates pixel art with Scale8x and Gaussian majority-voting.
 */
export function rotSprite(
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
  const outW = targetW ?? w;
  const outH = targetH ?? h;

  if (w <= 0 || h <= 0 || data.length === 0) {
    const safeW = Math.max(1, outW);
    const safeH = Math.max(1, outH);
    return { width: safeW, height: safeH, data: new Uint8ClampedArray(safeW * safeH * 4) };
  }

  const cx = pivotX ?? w / 2;
  const cy = pivotY ?? h / 2;
  const ocx = outPivotX ?? cx;
  const ocy = outPivotY ?? cy;

  const EPSILON = 1e-5;
  const TWO_PI = Math.PI * 2;
  const normAngle = ((angleRad % TWO_PI) + TWO_PI) % TWO_PI;
  const isNear = (target: number) => Math.abs(normAngle - target) < EPSILON;

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
    w === h &&
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
        out32[x * w + (h - 1 - y)] = src32[y * w + x];
      }
    }
    return { width: w, height: h, data: outBytes };
  }

  if (
    isNear((3 * Math.PI) / 2) &&
    w === h &&
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
        out32[(w - 1 - x) * w + y] = src32[y * w + x];
      }
    }
    return { width: w, height: h, data: outBytes };
  }

  // 2. Perform 3-pass Scale2x cascade to 8x
  const src8x = scale8x(src);

  // 3. Downscale using subpixel inverse rotation and center-weighted Gaussian majority voting
  return downscale8xMajorityVote(src8x, outW, outH, angleRad, cx, cy, ocx, ocy);
}
