import { describe, expect, it } from 'vitest';
import { rgbaToI420Bt709 } from '@/lib/export/i420Color';

describe('explicit limited-range BT.709 I420 input', () => {
  // Fixed primary/neutral vectors from the BT.709 matrix, independent of the
  // implementation. A BT.601 conversion yields different primary Y/U/V bytes.
  it.each([
    [[0, 0, 0, 255], [16, 128, 128]],
    [[255, 255, 255, 255], [235, 128, 128]],
    [[255, 0, 0, 255], [63, 102, 240]],
    [[0, 255, 0, 255], [173, 42, 26]],
    [[0, 0, 255, 255], [32, 240, 118]],
    [[128, 128, 128, 255], [126, 128, 128]],
  ])('encodes RGBA %j with Y/U/V %j', (rgba, expected) => {
    const input = Uint8ClampedArray.from([...rgba, ...rgba, ...rgba, ...rgba]), before = input.slice();
    expect([...rgbaToI420Bt709(input, 2, 2)]).toEqual([expected[0], expected[0], expected[0], expected[0], expected[1], expected[2]]);
    expect(input).toEqual(before);
  });
  it('averages chroma over the actual 2×2 cells and keeps rows and planes separate', () => {
    const red = [255, 0, 0, 255], blue = [0, 0, 255, 255];
    const input = Uint8Array.from([...red, ...red, ...blue, ...blue, ...red, ...red, ...blue, ...blue]);
    expect([...rgbaToI420Bt709(input, 4, 2)]).toEqual([63, 63, 32, 32, 63, 63, 32, 32, 102, 240, 240, 118]);
    expect([...rgbaToI420Bt709(Uint8Array.from([...red, ...blue, ...red, ...blue]), 2, 2)])
      .toEqual([63, 32, 63, 32, 171, 179]);
  });
  it('mattes transparency over black without leaking hidden RGB or mutating the source', () => {
    const input = Uint8ClampedArray.from([255, 0, 0, 0, 0, 255, 0, 0, 0, 0, 255, 0, 255, 255, 255, 0]);
    expect([...rgbaToI420Bt709(input, 2, 2)]).toEqual([16, 16, 16, 16, 128, 128]);
    const half = Uint8Array.from(Array.from({ length: 4 }, () => [255, 255, 255, 128]).flat());
    expect([...rgbaToI420Bt709(half, 2, 2)]).toEqual([126, 126, 126, 126, 128, 128]);
  });
  it('refuses odd, oversized or inconsistent buffers before allocation', () => {
    for (const [width, height] of [[1, 2], [2, 3], [0, 2], [2.5, 2], [4098, 2], [Infinity, 2], [2, NaN]]) {
      expect(() => rgbaToI420Bt709(new Uint8Array(16), width, height)).toThrow(RangeError);
    }
    expect(() => rgbaToI420Bt709(new Uint8Array(15), 2, 2)).toThrow(RangeError);
  });
});
