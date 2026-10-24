import { MAX_SAFE_CANVAS_DIMENSION, MAX_SAFE_CANVAS_PIXELS } from '@/config/canvasLimits';

// Canvas samples are sRGB. Only the RGB/YUV matrix changes; the transfer stays
// sRGB. Supplying explicit planes avoids browsers converting RGB with one
// matrix and reporting another (Mozilla 2057760). H.264 has no alpha: matte black.
export const I420_COLOR_SPACE = {
  primaries: 'bt709', transfer: 'iec61966-2-1', matrix: 'bt709', fullRange: false,
} as const;

export function rgbaToI420Bt709(rgba: Uint8ClampedArray | Uint8Array, width: number, height: number): Uint8Array<ArrayBuffer> {
  const count = width * height;
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 2 || height < 2
    || width % 2 || height % 2 || width > MAX_SAFE_CANVAS_DIMENSION || height > MAX_SAFE_CANVAS_DIMENSION
    || count > MAX_SAFE_CANVAS_PIXELS || rgba.length !== count * 4) {
    throw new RangeError('I420 needs an admitted even-sized RGBA image.');
  }
  const output = new Uint8Array(count * 3 / 2), chromaWidth = width / 2;
  const byte = (value: number, low: number, high: number) => Math.max(low, Math.min(high, Math.round(value)));
  for (let y = 0; y < height; y += 2) for (let x = 0; x < width; x += 2) {
    let sumB = 0, sumR = 0, sumY = 0;
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
      const pixel = (y + dy) * width + x + dx, at = pixel * 4, alpha = rgba[at + 3] / 255;
      const r = rgba[at] * alpha, g = rgba[at + 1] * alpha, b = rgba[at + 2] * alpha;
      const luma = .2126 * r + .7152 * g + .0722 * b;
      output[pixel] = byte(16 + 219 * luma / 255, 16, 235);
      sumR += r; sumB += b; sumY += luma;
    }
    const chroma = y / 2 * chromaWidth + x / 2;
    output[count + chroma] = byte(128 + 112 * (sumB - sumY) / (4 * 255 * (1 - .0722)), 16, 240);
    output[count * 5 / 4 + chroma] = byte(128 + 112 * (sumR - sumY) / (4 * 255 * (1 - .2126)), 16, 240);
  }
  return output;
}
