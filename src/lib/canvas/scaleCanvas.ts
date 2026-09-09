/**
 * High-performance scaled pixel extraction helper for PixiBun canvas exports.
 * Provides fast-path for 1x extraction without offscreen allocation,
 * hardware-accelerated nearest-neighbor scaling for integer multiples,
 * and pixel replication fallback for headless/test environments.
 */

export interface ScaledRgbaFrame {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

/**
 * Helper to extract RGBA pixel data from an HTMLCanvasElement with optional integer scaling.
 */
export function extractScaledCanvasRgba(
  canvas: HTMLCanvasElement,
  scale: number = 1
): ScaledRgbaFrame {
  const s = Math.max(1, Math.floor(scale));
  const srcW = canvas.width;
  const srcH = canvas.height;

  if (s === 1 && typeof canvas.getContext === 'function') {
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const imgData = ctx.getImageData(0, 0, srcW, srcH);
      return { width: srcW, height: srcH, data: imgData.data };
    }
  }

  // Handle scaling via offscreen buffer or nearest-neighbor replication
  const dstW = srcW * s;
  const dstH = srcH * s;

  if (typeof document !== 'undefined') {
    const scaledCanvas = document.createElement('canvas');
    scaledCanvas.width = dstW;
    scaledCanvas.height = dstH;
    const ctx = scaledCanvas.getContext('2d');
    if (ctx) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(canvas, 0, 0, dstW, dstH);
      const imgData = ctx.getImageData(0, 0, dstW, dstH);
      return { width: dstW, height: dstH, data: imgData.data };
    }
  }

  // Fallback: direct pixel replication for headless / non-DOM environments
  const ctx = canvas.getContext ? canvas.getContext('2d') : null;
  const srcData = ctx ? ctx.getImageData(0, 0, srcW, srcH).data : new Uint8ClampedArray(srcW * srcH * 4);
  const dstData = new Uint8ClampedArray(dstW * dstH * 4);

  for (let dy = 0; dy < dstH; dy++) {
    const sy = Math.floor(dy / s);
    for (let dx = 0; dx < dstW; dx++) {
      const sx = Math.floor(dx / s);
      const srcIdx = (sy * srcW + sx) * 4;
      const dstIdx = (dy * dstW + dx) * 4;
      dstData[dstIdx] = srcData[srcIdx];
      dstData[dstIdx + 1] = srcData[srcIdx + 1];
      dstData[dstIdx + 2] = srcData[srcIdx + 2];
      dstData[dstIdx + 3] = srcData[srcIdx + 3];
    }
  }

  return { width: dstW, height: dstH, data: dstData };
}
