// @vitest-environment node
import { expect, it } from 'vitest';
import { lzwEncode } from '@/lib/export/gifEncoderCore';
import { decodeGifLzw } from './helpers/decodeGifLzw';

function noise(count: number, colors: number) {
  let seed = 0x6a651295;
  return Uint8Array.from({ length: count }, () => {
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    return (seed >>> 0) % colors;
  });
}

it.each([2, 3, 8])('decodes every pixel after repeated dictionary resets at %i-bit color depth', depth => {
  const source = noise(512 * 512, 1 << depth);
  const decoded = decodeGifLzw(lzwEncode(source, depth), source.length);
  expect(decoded.clearCodes).toBeGreaterThan(2);
  expect(decoded.maxBits).toBe(12);
  expect(decoded.pixels).toEqual(source);
});

it('preserves a textured 64px artwork after exact 8x scaling', () => {
  const source = noise(64 * 64, 7), scaled = new Uint8Array(512 * 512);
  for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) scaled[y * 512 + x] = source[(y >> 3) * 64 + (x >> 3)];
  const decoded = decodeGifLzw(lzwEncode(scaled, 3), scaled.length);
  expect(decoded.clearCodes).toBeGreaterThan(1);
  expect(decoded.pixels).toEqual(scaled);
});
