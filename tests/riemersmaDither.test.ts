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

  it('follows a black-to-white ramp instead of collapsing it to one color', () => {
    // The 16 history weights used to sum to about 5.6, so error was fed forward 5.6 times
    // and a ramp dithered with black and white came out entirely black.
    const canvas = makeCanvas(32, 32);
    const pixels = canvas._imageData.data;
    for (let y = 0; y < 32; y++) {
      for (let x = 0; x < 32; x++) {
        const i = (y * 32 + x) * 4;
        pixels[i] = pixels[i + 1] = pixels[i + 2] = Math.round((x / 31) * 255);
        pixels[i + 3] = 255;
      }
    }
    applyRiemersmaDither(canvas.getContext('2d')!, 32, 32, ['#000000', '#FFFFFF']);
    const whiteIn = (x0: number, x1: number) => {
      let white = 0;
      for (let y = 0; y < 32; y++) for (let x = x0; x < x1; x++) if (pixels[(y * 32 + x) * 4] === 255) white++;
      return white / (32 * (x1 - x0));
    };
    // The whole ramp averages half white; its dark and light quarters stay dark and light.
    expect(whiteIn(0, 32)).toBeGreaterThan(0.4);
    expect(whiteIn(0, 32)).toBeLessThan(0.6);
    expect(whiteIn(0, 8)).toBeLessThan(0.25);
    expect(whiteIn(24, 32)).toBeGreaterThan(0.75);
  });
});
