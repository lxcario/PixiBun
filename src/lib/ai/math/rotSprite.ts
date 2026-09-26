/**
 * RotSprite-inspired pixel-art rotation adapter.
 *
 * Citations:
 * 1. Xenowhirl, "RotSprite: An algorithm for scaling and rotating pixel art", 2007.
 * 2. Eric Johnston, EPX (Eric's Pixel Expansion), LucasArts, 1992.
 * 3. Andrea Mazzoleni, Scale2x for AdvanceMAME, 2001 (equivalent output to EPX).
 *
 * Thin DOM adapter delegating to PixiBun's RotSprite-inspired engine in '@/lib/canvas/rotSprite'.
 */

import { rotSprite, type PixelBuffer } from '@/lib/canvas/rotSprite';

export { rotSprite, type PixelBuffer };

/**
 * Convenience Canvas context adapter executing PixiBun's rotation algorithm.
 * Converts angles from degrees to radians, samples the source context, and returns
 * an HTMLCanvasElement populated with the rotated pixel buffer.
 */
export function rotateWithRotSprite(
  srcCtx: CanvasRenderingContext2D,
  width: number,
  height: number,
  angleDeg: number
): HTMLCanvasElement {
  const angleRad = (angleDeg * Math.PI) / 180;
  const imgData = srcCtx.getImageData(0, 0, width, height);
  const result = rotSprite({ width, height, data: imgData.data }, angleRad);

  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = result.width;
  outputCanvas.height = result.height;
  const outCtx = outputCanvas.getContext('2d');
  if (!outCtx) {
    throw new Error('Failed to acquire 2D context from destination canvas in rotateWithRotSprite');
  }

  const outImgData = outCtx.createImageData(result.width, result.height);
  outImgData.data.set(result.data);
  outCtx.putImageData(outImgData, 0, 0);

  return outputCanvas;
}
