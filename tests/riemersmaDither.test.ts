import { describe, expect, it } from 'vitest';
import { applyRiemersmaDither } from '@/lib/graphics/math/dithering';
import { makeCanvas } from './helpers/mockCanvas';

describe('Riemersma dither', () => {
  it('distributes a mid-gray field across both palette colors', () => {
    const canvas = makeCanvas(32, 32);
    const pixels = canvas._imageData.data;
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = 128;
      pixels[i + 1] = 128;
      pixels[i + 2] = 128;
      pixels[i + 3] = 255;
    }

    applyRiemersmaDither(canvas.getContext('2d')!, 32, 32, ['#000000', '#FFFFFF']);
    let black = 0;
    let white = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i] === 0) black++;
      if (pixels[i] === 255) white++;
    }
    expect(black).toBeGreaterThan(256);
    expect(white).toBeGreaterThan(256);
    expect(black + white).toBe(1024);
  });
});
