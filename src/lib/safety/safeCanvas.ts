/**
 * safeCanvas.ts
 *
 * Defensive Canvas 2D raster operations for PixiBun Atelier.
 *
 * Web Standard References:
 * 1. W3C / WHATWG HTML Living Standard: Section 4.12.5.1 "The 2D rendering context"
 *    - Clause on createImageData / getImageData: IndexSizeError DOMException thrown if sw or sh is zero.
 * 2. Khronos Group WebGL Specification (WebGL 1.0 & 2.0):
 *    - MAX_TEXTURE_SIZE hardware capability query and area limits.
 */

import { MathInvariants } from './mathInvariants';
import { WORKSPACE_ENVELOPE } from '@/config/canvasLimits';

export class CanvasHardwareLimits {
  private static cachedMaxDim: number | null = null;
  public static readonly DEFAULT_SAFE_DIM = WORKSPACE_ENVELOPE.MAX_PROBE_DIMENSION;
  public static readonly MAX_SAFE_PIXEL_AREA = WORKSPACE_ENVELOPE.MAX_HARDWARE_PIXEL_AREA; // 268 MP ceiling

  /**
   * Queries the hardware GPU maximum texture size via WebGL probe context.
   * Caches the result to avoid redundant context creations.
   */
  public static getMaxTextureSize(): number {
    if (this.cachedMaxDim !== null) return this.cachedMaxDim;
    if (typeof window === 'undefined') return this.DEFAULT_SAFE_DIM;

    try {
      const probeCanvas = document.createElement('canvas');
      const gl = probeCanvas.getContext('webgl') || probeCanvas.getContext('experimental-webgl');
      if (gl) {
        const max = (gl as WebGLRenderingContext).getParameter((gl as WebGLRenderingContext).MAX_TEXTURE_SIZE);
        if (typeof max === 'number' && max > 0) {
          this.cachedMaxDim = max;
          const loseContext = (gl as WebGLRenderingContext).getExtension('WEBGL_lose_context');
          if (loseContext) loseContext.loseContext();
          return max;
        }
      }
    } catch {
      // Ignore probing failure and use safe default
    }

    this.cachedMaxDim = this.DEFAULT_SAFE_DIM;
    return this.cachedMaxDim;
  }
}

export class SafeCanvas {
  /**
   * Defensive wrapper for ctx.createImageData().
   * Guarantees:
   * - Positive integers >= 1 (completely prevents IndexSizeError on 0 or negative dimensions).
   * - Clamped against GPU MAX_TEXTURE_SIZE ceiling.
   * - Validates total pixel area against memory exhaustion ceiling.
   */
  public static createImageData(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null,
    width: number,
    height: number
  ): ImageData {
    const maxDim = CanvasHardwareLimits.getMaxTextureSize();

    const rawW = MathInvariants.isSafeFinite(width) ? width : 1;
    const rawH = MathInvariants.isSafeFinite(height) ? height : 1;

    if (rawW > maxDim || rawH > maxDim || rawW * rawH > CanvasHardwareLimits.MAX_SAFE_PIXEL_AREA) {
      throw new RangeError(
        `[SafeCanvas] Canvas dimensions (${rawW}x${rawH}) exceed maximum hardware capability ceiling (${maxDim}px or ${CanvasHardwareLimits.MAX_SAFE_PIXEL_AREA} total area)`
      );
    }

    const w = Math.floor(Math.max(1, rawW));
    const h = Math.floor(Math.max(1, rawH));

    if (ctx && typeof ctx.createImageData === 'function') {
      try {
        return ctx.createImageData(w, h);
      } catch {
        // Fallback if context is in a detached or invalid state
      }
    }

    // Modern browser and Node 20+ support standalone ImageData constructor
    if (typeof ImageData !== 'undefined') {
      return new ImageData(w, h);
    }

    // Headless test environment mock fallback
    return {
      width: w,
      height: h,
      data: new Uint8ClampedArray(w * h * 4),
      colorSpace: 'srgb',
    } as unknown as ImageData;
  }

  /**
   * Defensive wrapper for ctx.getImageData().
   * Guarantees:
   * - Handles negative dimensions by normalizing bounding rectangle origin.
   * - Intersects sampling rectangle with valid canvas boundaries [0, 0, canvasWidth, canvasHeight].
   * - Returns a padded blank ImageData without throwing IndexSizeError when sampling 0-width or 0-height boxes.
   */
  public static getImageData(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    sx: number,
    sy: number,
    sw: number,
    sh: number
  ): ImageData {
    const canvasWidth = ctx.canvas.width;
    const canvasHeight = ctx.canvas.height;

    // 1. Normalize negative drag rectangles
    const norm = MathInvariants.normalizeRect(sx, sy, sx + sw, sy + sh);
    const normX = norm.x;
    const normY = norm.y;
    const normW = norm.w;
    const normH = norm.h;

    // 2. Prevent IndexSizeError on zero-dimension selections
    if (normW <= 0 || normH <= 0) {
      return this.createImageData(ctx, 1, 1);
    }

    // 3. Intersect sampling rect with actual canvas boundaries
    const x1 = Math.max(0, normX);
    const y1 = Math.max(0, normY);
    const x2 = Math.min(canvasWidth, normX + normW);
    const y2 = Math.min(canvasHeight, normY + normH);

    const interW = x2 - x1;
    const interH = y2 - y1;

    // Completely off-canvas: return blank transparent ImageData
    if (interW <= 0 || interH <= 0) {
      return this.createImageData(ctx, normW, normH);
    }

    // Pure interior crop: direct native read
    if (normX === x1 && normY === y1 && normW === interW && normH === interH) {
      return ctx.getImageData(normX, normY, normW, normH);
    }

    // Partially out-of-bounds: sample intersecting region and blit onto correctly padded buffer
    const result = this.createImageData(ctx, normW, normH);
    const sampleData = ctx.getImageData(x1, y1, interW, interH);

    const dstOffsetX = x1 - normX;
    const dstOffsetY = y1 - normY;

    const srcU32 = new Uint32Array(
      sampleData.data.buffer,
      sampleData.data.byteOffset,
      interW * interH
    );
    const dstU32 = new Uint32Array(
      result.data.buffer,
      result.data.byteOffset,
      normW * normH
    );

    for (let row = 0; row < interH; row++) {
      const srcIdx = row * interW;
      const dstIdx = (dstOffsetY + row) * normW + dstOffsetX;
      dstU32.set(srcU32.subarray(srcIdx, srcIdx + interW), dstIdx);
    }

    return result;
  }
}
