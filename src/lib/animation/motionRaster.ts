import { computeRotatedBounds, rotSprite, type PixelBuffer } from '@/lib/canvas/rotSprite';
import type { MotionPartBounds, MotionPivot, MotionPose } from './pixiMotion';

export interface PlacedMotionRaster extends PixelBuffer { destX: number; destY: number }

/** Count painted samples outside the canvas, ignoring transparent bounding padding. */
export function countClippedMotionPixels(sprite: PlacedMotionRaster, width: number, height: number): number {
  if (sprite.destX >= 0 && sprite.destY >= 0 && sprite.destX + sprite.width <= width && sprite.destY + sprite.height <= height) return 0;
  let clipped = 0;
  for (let y = 0; y < sprite.height; y++) for (let x = 0; x < sprite.width; x++) {
    if (sprite.data[(y * sprite.width + x) * 4 + 3] && (x + sprite.destX < 0 || x + sprite.destX >= width || y + sprite.destY < 0 || y + sprite.destY >= height)) clipped++;
  }
  return clipped;
}

/** Keep fractional translation in the sampling phase, with integer canvas placement. */
export function motionRasterPlacement(bounds: MotionPartBounds, pivot: MotionPivot, pose: MotionPose) {
  const box = computeRotatedBounds(bounds.w, bounds.h, bounds.x, bounds.y, pivot.x, pivot.y, pose.rotation);
  const left = box.destX + pose.translationX, top = box.destY + pose.translationY;
  const destX = Math.floor(left), destY = Math.floor(top);
  return { destX: destX === 0 ? 0 : destX, destY: destY === 0 ? 0 : destY,
    width: Math.ceil(left + box.targetW) - destX, height: Math.ceil(top + box.targetH) - destY,
    localPivotX: box.localPivotX, localPivotY: box.localPivotY,
    outPivotX: box.outPivotX + left - destX, outPivotY: box.outPivotY + top - destY };
}

/** Pure typed-array renderer shared by the worker and bounded fallback. */
export function renderPlacedMotionRaster(raster: PixelBuffer, bounds: MotionPartBounds, pivot: MotionPivot, pose: MotionPose): PlacedMotionRaster {
  const box = motionRasterPlacement(bounds, pivot, pose);
  const source = raster.data.byteOffset % 4 === 0 ? raster : { ...raster, data: new Uint8ClampedArray(raster.data) };
  const result = rotSprite(source, pose.rotation, box.localPivotX, box.localPivotY,
    box.width, box.height, box.outPivotX, box.outPivotY, true);
  return { ...result, destX: box.destX, destY: box.destY };
}

/** Compatibility placement into an empty full-canvas target without another resample. */
export function copyPlacedMotionRaster(target: PixelBuffer, sprite: PlacedMotionRaster): void {
  const x0 = Math.max(0, -sprite.destX), x1 = Math.min(sprite.width, target.width - sprite.destX);
  const y0 = Math.max(0, -sprite.destY), y1 = Math.min(sprite.height, target.height - sprite.destY);
  if (x1 <= x0) return;
  for (let y = y0; y < y1; y++) target.data.set(
    sprite.data.subarray((y * sprite.width + x0) * 4, (y * sprite.width + x1) * 4),
    ((y + sprite.destY) * target.width + x0 + sprite.destX) * 4);
}

/** Clip before visiting pixels; preserve the existing straight-alpha over operation. */
export function stampPlacedMotionRaster(target: PixelBuffer, sprite: PlacedMotionRaster): void {
  const x0 = Math.max(0, -sprite.destX), x1 = Math.min(sprite.width, target.width - sprite.destX);
  const y0 = Math.max(0, -sprite.destY), y1 = Math.min(sprite.height, target.height - sprite.destY);
  const t = target.data, s = sprite.data;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const si = (y * sprite.width + x) * 4, ti = ((y + sprite.destY) * target.width + x + sprite.destX) * 4;
    const alpha = s[si + 3];
    if (!alpha) continue;
    if (alpha === 255) { t.set(s.subarray(si, si + 4), ti); continue; }
    const sa = alpha / 255, da = t[ti + 3] / 255, out = sa + da * (1 - sa);
    for (let c = 0; c < 3; c++) t[ti + c] = Math.round((s[si + c] * sa + t[ti + c] * da * (1 - sa)) / out);
    t[ti + 3] = Math.round(out * 255);
  }
}
