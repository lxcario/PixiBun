import { describe, expect, it } from 'vitest';
import { sceneRecolor } from '@/lib/theme/sceneRecolor';

// Landing scenes recolor every animation frame; the loop works on packed pixels
// and reuses the last color's answer. These checks hold it to the per-pixel result.

function image(pixels: number[][]): ImageData {
  return { data: new Uint8ClampedArray(pixels.flat()), width: pixels.length, height: 1, colorSpace: 'srgb' } as ImageData;
}

function recolorOne(recolor: (img: ImageData) => void, rgba: number[]): number[] {
  const one = image([rgba]);
  recolor(one);
  return [...one.data];
}

describe('scene recolor', () => {
  const recolor = sceneRecolor('sakura', true)!;

  it('matches recoloring each pixel on its own, through runs and changes of color', () => {
    const night = [
      [13, 10, 28, 255], [13, 10, 28, 255], [42, 26, 66, 255], [42, 26, 66, 128],
      [0, 0, 0, 0], [42, 26, 66, 255], [240, 190, 124, 255], [13, 10, 28, 255], [123, 52, 97, 255],
    ];
    const img = image(night);
    recolor(img);
    night.forEach((px, i) => {
      expect([...img.data.slice(i * 4, i * 4 + 4)]).toEqual(recolorOne(recolor, px));
    });
  });

  it('keeps alpha, leaves transparent pixels alone and keeps warm light exactly', () => {
    const img = image([[42, 26, 66, 77], [9, 9, 9, 0], [240, 190, 124, 255]]);
    recolor(img);
    expect(img.data[3]).toBe(77);
    expect([...img.data.slice(4, 8)]).toEqual([9, 9, 9, 0]);
    expect([...img.data.slice(8, 12)]).toEqual([240, 190, 124, 255]);
  });

  it('a scene painted for daylight keeps its lightness instead of inverting it', () => {
    const painted = sceneRecolor('sakura', true, true)!;
    // A dark night hill: inverted it turns light; painted for day it stays dark.
    const inverted = recolorOne(recolor, [42, 26, 66, 255]);
    const kept = recolorOne(painted, [42, 26, 66, 255]);
    const lum = (p: number[]) => 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2];
    expect(lum(kept)).toBeLessThan(lum(inverted) - 100);
  });

  it('keeps Moonlit at night as painted', () => {
    expect(sceneRecolor('moonlit', false)).toBeNull();
  });
});
