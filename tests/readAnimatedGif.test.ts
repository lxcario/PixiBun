import { expect, it } from 'vitest';
import { readAnimatedGif } from './helpers/readAnimatedGif';

// Two hand-authored 2×1 frames: red then blue, with transparent disposal and a local palette.
const fixture = () => Buffer.from([
  71, 73, 70, 56, 57, 97, 2, 0, 1, 0, 128, 0, 0, 0, 0, 0, 255, 0, 0,
  33, 249, 4, 9, 1, 0, 0, 0, 44, 0, 0, 0, 0, 2, 0, 1, 0, 0, 2, 2, 12, 81, 0,
  33, 249, 4, 9, 2, 0, 0, 0, 44, 0, 0, 0, 0, 2, 0, 1, 0, 128, 0, 0, 0, 0, 0, 255, 2, 2, 4, 83, 0, 59,
]);
it('decodes independent hand-authored frame pixels, local palettes, holds and transparent disposal', () => {
  expect(readAnimatedGif(fixture())).toEqual({ width: 2, height: 1, frames: [
    { data: [255, 0, 0, 255, 0, 0, 0, 0], delayMs: 10 },
    { data: [0, 0, 0, 0, 0, 0, 255, 255], delayMs: 20 },
  ] });
});
it('refuses an incomplete downloaded GIF instead of accepting just a signature', () => {
  expect(() => readAnimatedGif(fixture().subarray(0, -1))).toThrow('Incomplete GIF stream');
});
it('refuses pixel indices missing from the actual downloaded palette', () => {
  const bytes = fixture(); bytes[bytes.indexOf(12)] = 28;
  expect(() => readAnimatedGif(bytes)).toThrow('GIF palette index missing');
});
