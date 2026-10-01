// @vitest-environment node
import { expect, it } from 'vitest';
import { extractCompactPalette } from '@/lib/color/compactPalette';

it('keeps a small palette exact and ignores transparent background pixels', () => {
  const pixels = new Uint8ClampedArray([255, 100, 0, 255, 255, 100, 0, 255, 30, 20, 10, 255, 255, 255, 255, 0]);
  expect(extractCompactPalette(pixels)).toEqual(['#FF6400', '#1E140A']);
});
it('groups hundreds of warm near-duplicates into at most six actual source swatches', () => {
  const bases = [[12, 10, 8], [102, 67, 37], [255, 65, 15], [255, 139, 0], [255, 176, 18]];
  const pixels = new Uint8ClampedArray(4096 * 4), allowed = new Set<string>();
  for (let i = 0; i < 4096; i++) {
    const base = bases[i % bases.length];
    const rgb = base.map((c, channel) => Math.max(0, Math.min(255, c + (Math.floor(i / (channel + 1)) % 7) - 3)));
    pixels.set([...rgb, 255], i * 4); allowed.add(`#${rgb.map(c => c.toString(16).padStart(2, '0')).join('').toUpperCase()}`);
  }
  const original = pixels.slice(), palette = extractCompactPalette(pixels);
  expect(allowed.size).toBeGreaterThan(100); expect(palette).toHaveLength(5);
  expect(palette.every(c => allowed.has(c))).toBe(true);
  for (const base of bases) expect(palette.some(hex => [1, 3, 5].every((offset, i) => Math.abs(parseInt(hex.slice(offset, offset + 2), 16) - base[i]) < 12))).toBe(true);
  expect(pixels).toEqual(original); expect(extractCompactPalette(pixels)).toEqual(palette);
});
it('bounds the requested summary size and never fills an empty frame with invented colors', () => {
  expect(extractCompactPalette(new Uint8ClampedArray(4096))).toEqual([]);
  const data = new Uint8ClampedArray(65536 * 4);
  for (let i = 0; i < 65536; i++) data.set([i % 256, Math.floor(i / 256), i % 113, 255], i * 4);
  expect(extractCompactPalette(data, 5)).toHaveLength(5);
  expect(extractCompactPalette(data, 0)).toHaveLength(1);
});
