import type { Point } from './rasterMath';
import { BAYER_4X4 } from './ditherMatrix';

export interface PixelGradientOptions {
  shape: 'linear' | 'radial';
  dither: boolean;
  colors: string[];
  selection: { x: number; y: number; w: number; h: number } | null;
  mask: Uint8Array | null;
}
/** Output uses only the supplied ramp, with optional ordered dithering. */
export function pixelGradient(width: number, height: number, from: Point, to: Point, options: PixelGradientOptions): Uint8ClampedArray {
  const output = new Uint8ClampedArray(width * height * 4);
  const colors = options.colors.map(hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)));
  if (colors.length < 2) return output;
  const dx = to.x - from.x, dy = to.y - from.y, lengthSq = dx * dx + dy * dy;
  if (!lengthSq) return output;
  const box = options.selection;
  const left = Math.max(0, box?.x ?? 0), top = Math.max(0, box?.y ?? 0);
  const right = Math.min(width, box ? box.x + box.w : width), bottom = Math.min(height, box ? box.y + box.h : height);
  for (let y = top; y < bottom; y++) for (let x = left; x < right; x++) {
    const pixel = y * width + x;
    if (options.mask && !options.mask[pixel]) continue;
    const position = options.shape === 'radial' ? Math.hypot(x - from.x, y - from.y) / Math.sqrt(lengthSq) : ((x - from.x) * dx + (y - from.y) * dy) / lengthSq;
    const index = Math.max(0, Math.min(1, position)) * (colors.length - 1), lower = Math.floor(index), fraction = index - lower;
    const chosen = options.dither ? Math.min(colors.length - 1, lower + (fraction > (BAYER_4X4[y % 4][x % 4] + 0.5) / 16 ? 1 : 0)) : Math.round(index);
    const offset = pixel * 4;
    output[offset] = colors[chosen][0]; output[offset + 1] = colors[chosen][1]; output[offset + 2] = colors[chosen][2]; output[offset + 3] = 255;
  }
  return output;
}
