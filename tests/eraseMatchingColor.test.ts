import { describe, expect, it } from 'vitest';
import { eraseMatchingColor } from '@/lib/canvas/eraseMatchingColor';

function pixels(width: number, colors: Array<[number, number, number, number]>) {
  const data = new Uint8ClampedArray(colors.flat());
  return { width, height: colors.length / width, data };
}

describe('erase sampled color', () => {
  it('removes nearby green shades globally while preserving the sprite and transparent pixels', () => {
    const image = pixels(5, [
      [20, 210, 40, 255], [24, 205, 43, 255], [250, 250, 250, 255],
      [20, 210, 40, 0], [30, 30, 30, 255],
    ]);
    expect(eraseMatchingColor(image, [20, 210, 40], 0)).toBe(1);
    expect(Array.from(image.data.slice(0, 4))).toEqual([0, 0, 0, 0]);
    expect(eraseMatchingColor(image, [20, 210, 40], 24)).toBe(1);
    expect(Array.from(image.data.slice(4, 8))).toEqual([0, 0, 0, 0]);
    expect(Array.from(image.data.slice(8, 12))).toEqual([250, 250, 250, 255]);
    expect(Array.from(image.data.slice(16, 20))).toEqual([30, 30, 30, 255]);
  });

  it('connected mode removes only the clicked island and honors a selection mask', () => {
    const green: [number, number, number, number] = [0, 200, 0, 255];
    const black: [number, number, number, number] = [0, 0, 0, 255];
    const image = pixels(5, [green, green, black, green, green]);
    const mask = new Uint8Array([1, 1, 1, 1, 0]);
    expect(eraseMatchingColor(image, [0, 200, 0], 0, { contiguous: true, x: 0, y: 0, mask })).toBe(2);
    expect(Array.from(image.data.slice(12, 16))).toEqual(green);
    expect(eraseMatchingColor(image, [0, 200, 0], 0, { contiguous: true, x: 4, y: 0, mask })).toBe(0);
    expect(eraseMatchingColor(image, [0, 200, 0], 0, { mask })).toBe(1);
    expect(Array.from(image.data.slice(16, 20))).toEqual(green);
  });

  it('color family removes dark green edge spill and isolated green shadows without erasing neutral outlines', () => {
    const image = pixels(7, [
      [0, 205, 38, 255], [2, 67, 19, 255], [6, 26, 10, 255],
      [18, 29, 26, 255], [24, 24, 24, 255], [245, 245, 245, 255],
      [200, 75, 100, 255],
    ]);
    expect(eraseMatchingColor(image, [0, 205, 38], 24)).toBe(1);
    expect(eraseMatchingColor(image, [0, 205, 38], 24, { family: true })).toBe(2);
    expect(Array.from(image.data.slice(12, 16))).toEqual([18, 29, 26, 255]);
    expect(Array.from(image.data.slice(16, 20))).toEqual([24, 24, 24, 255]);
    expect(Array.from(image.data.slice(20, 24))).toEqual([245, 245, 245, 255]);
    expect(Array.from(image.data.slice(24, 28))).toEqual([200, 75, 100, 255]);
  });

  it('color family respects selections and falls back to exact RGB matching for neutral samples', () => {
    const image = pixels(3, [
      [10, 180, 10, 255], [10, 70, 10, 255], [10, 70, 10, 255],
    ]);
    expect(eraseMatchingColor(image, [10, 180, 10], 24, {
      family: true, mask: new Uint8Array([1, 1, 0]),
    })).toBe(2);
    expect(Array.from(image.data.slice(8, 12))).toEqual([10, 70, 10, 255]);
    const neutral = pixels(2, [[30, 30, 30, 255], [45, 45, 45, 255]]);
    expect(eraseMatchingColor(neutral, [30, 30, 30], 0, { family: true })).toBe(1);
  });

  it('clears pale green specks and neutralizes blue-green pixels embedded in a dark outline', () => {
    const image = pixels(3, [
      [211, 241, 216, 255], [0, 205, 38, 255], [250, 250, 250, 255],
      [18, 29, 26, 255], [27, 69, 52, 255], [20, 32, 44, 255],
      [0, 0, 0, 0], [7, 16, 28, 255], [255, 255, 255, 255],
    ]);
    expect(eraseMatchingColor(image, [0, 205, 38], 24, { family: true })).toBe(3);
    expect(Array.from(image.data.slice(0, 4))).toEqual([0, 0, 0, 0]);
    expect(Array.from(image.data.slice(4, 8))).toEqual([0, 0, 0, 0]);
    expect(Array.from(image.data.slice(16, 20))).toEqual([20, 32, 44, 255]);
    expect(Array.from(image.data.slice(8, 12))).toEqual([250, 250, 250, 255]);
  });
});
