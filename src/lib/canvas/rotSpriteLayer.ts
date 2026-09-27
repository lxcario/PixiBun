import type { PixelBuffer } from './rotSprite';

/** Cap the 8x expansion to roughly 88 MiB of raster buffers. */
export const MAX_ROTSPRITE_SOURCE_PIXELS = 512 * 512;

export interface LayerRotationPlan {
  source: PixelBuffer;
  sourcePivotX: number;
  sourcePivotY: number;
  targetWidth: number;
  targetHeight: number;
  outputPivotX: number;
  outputPivotY: number;
  destX: number;
  destY: number;
}

export function planLayerRotation(
  fullLayer: PixelBuffer,
  angleRad: number
): { plan?: LayerRotationPlan; error?: string } {
  const { width, height, data } = fullLayer;
  if (!Number.isFinite(angleRad) || data.length !== width * height * 4) {
    return { error: 'The layer cannot be rotated because its pixels or angle are invalid.' };
  }
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] === 0) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  if (maxX < minX) return {};

  const sourceWidth = maxX - minX + 1;
  const sourceHeight = maxY - minY + 1;
  if (sourceWidth * sourceHeight > MAX_ROTSPRITE_SOURCE_PIXELS) {
    return { error: 'This artwork is too large for clean rotation. Select a smaller area first.' };
  }

  const pivotX = width / 2;
  const pivotY = height / 2;
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  const corners = [
    [minX, minY], [maxX + 1, minY], [minX, maxY + 1], [maxX + 1, maxY + 1],
  ].map(([x, y]) => ({
    x: pivotX + cos * (x - pivotX) - sin * (y - pivotY),
    y: pivotY + sin * (x - pivotX) + cos * (y - pivotY),
  }));
  const destX = Math.floor(Math.min(...corners.map((point) => point.x)));
  const destY = Math.floor(Math.min(...corners.map((point) => point.y)));
  const endX = Math.ceil(Math.max(...corners.map((point) => point.x)));
  const endY = Math.ceil(Math.max(...corners.map((point) => point.y)));
  if (destX < 0 || destY < 0 || endX > width || endY > height) {
    return { error: 'Rotation would clip artwork. Enlarge the canvas or rotate a smaller selection first.' };
  }

  const cropped = new Uint8ClampedArray(sourceWidth * sourceHeight * 4);
  for (let y = 0; y < sourceHeight; y++) {
    const start = ((minY + y) * width + minX) * 4;
    cropped.set(data.subarray(start, start + sourceWidth * 4), y * sourceWidth * 4);
  }
  return {
    plan: {
      source: { width: sourceWidth, height: sourceHeight, data: cropped },
      sourcePivotX: pivotX - minX,
      sourcePivotY: pivotY - minY,
      targetWidth: endX - destX,
      targetHeight: endY - destY,
      outputPivotX: pivotX - destX,
      outputPivotY: pivotY - destY,
      destX,
      destY,
    },
  };
}
