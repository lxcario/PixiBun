/**
 * Dirty-rectangle undo patches.
 *
 * A pixel history step used to keep the whole layer, so a one-pixel stroke on a
 * 512×512 canvas cost 1 MiB and Undo stopped after a few dozen strokes. A patch
 * step keeps only the rectangle the change touched: `imageData` is that
 * rectangle before the change, `expectedImageData` the same rectangle after it,
 * and `x`/`y` place it on the layer.
 */
import type { PixelHistoryStep } from '@/types/canvas';

export interface PatchRect { x: number; y: number; width: number; height: number }

function makeImageData(data: Uint8ClampedArray<ArrayBuffer>, width: number, height: number, colorSpace?: PredefinedColorSpace): ImageData {
  if (typeof ImageData === 'function') {
    try { return new ImageData(data, width, height); } catch { /* Fall through to a plain object in headless runtimes. */ }
  }
  return { data, width, height, colorSpace: colorSpace ?? 'srgb' };
}

/** Smallest rectangle containing every pixel that differs, or null when nothing changed. */
export function changedRect(before: ImageData, after: ImageData): PatchRect | null {
  const { width, height } = before;
  if (after.width !== width || after.height !== height) return { x: 0, y: 0, width, height };
  const a = new Uint32Array(before.data.buffer, before.data.byteOffset, width * height);
  const b = new Uint32Array(after.data.buffer, after.data.byteOffset, width * height);
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      if (a[row + x] === b[row + x]) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      maxY = y;
    }
  }
  return maxX < 0 ? null : { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

/** Copy one rectangle out of a full image. */
export function cropImageData(source: ImageData, rect: PatchRect): ImageData {
  if (rect.x === 0 && rect.y === 0 && rect.width === source.width && rect.height === source.height) {
    return makeImageData(new Uint8ClampedArray(source.data), source.width, source.height, source.colorSpace);
  }
  const out = new Uint8ClampedArray(rect.width * rect.height * 4);
  for (let row = 0; row < rect.height; row++) {
    const from = ((rect.y + row) * source.width + rect.x) * 4;
    out.set(source.data.subarray(from, from + rect.width * 4), row * rect.width * 4);
  }
  return makeImageData(out, rect.width, rect.height, source.colorSpace);
}

/** Paste a patch into a full image in place, clipped to its bounds. */
export function pastePatch(target: ImageData, patch: ImageData, x = 0, y = 0): void {
  const x0 = Math.max(0, x), y0 = Math.max(0, y);
  const x1 = Math.min(target.width, x + patch.width), y1 = Math.min(target.height, y + patch.height);
  if (x1 <= x0 || y1 <= y0) return;
  for (let row = y0; row < y1; row++) {
    const from = ((row - y) * patch.width + (x0 - x)) * 4;
    target.data.set(patch.data.subarray(from, from + (x1 - x0) * 4), (row * target.width + x0) * 4);
  }
}

/** True when a step covers only part of its layer. */
export function isPatchStep(step: PixelHistoryStep): boolean {
  return step.x !== undefined || step.y !== undefined;
}

/** The rectangle a step restores, in layer coordinates. */
export function stepRect(step: PixelHistoryStep): PatchRect {
  return { x: step.x ?? 0, y: step.y ?? 0, width: step.imageData.width, height: step.imageData.height };
}

/**
 * Shrink a full-layer step to the rectangle that actually changed. `after` is
 * the full layer once the change is done. Unchanged layers keep a 1×1 patch so
 * Undo still has a step to take.
 */
export function toPatchStep(step: PixelHistoryStep, after: ImageData): PixelHistoryStep {
  const before = step.imageData;
  if (after.width !== before.width || after.height !== before.height) return step;
  const rect = changedRect(before, after) ?? { x: 0, y: 0, width: 1, height: 1 };
  return { ...step, imageData: cropImageData(before, rect), expectedImageData: cropImageData(after, rect), x: rect.x, y: rect.y };
}
