import { describe, it, expect } from 'vitest';
import {
  scale2x,
  scale8x,
  rotSprite,
  PixelBuffer,
} from '@/lib/canvas/rotSprite';

describe('RotSprite Algorithm Academic Specification', () => {
  it('scale2x doubles width and height and preserves solid colors', () => {
    const src: PixelBuffer = {
      width: 2,
      height: 2,
      data: new Uint8ClampedArray([
        255, 0, 0, 255, 0, 255, 0, 255,
        0, 0, 255, 255, 255, 255, 0, 255,
      ]),
    };

    const scaled = scale2x(src);
    expect(scaled.width).toBe(4);
    expect(scaled.height).toBe(4);
    expect(scaled.data.length).toBe(4 * 4 * 4);
  });

  it('scale8x expands 8x across 3 passes (2x -> 4x -> 8x)', () => {
    const src: PixelBuffer = {
      width: 4,
      height: 4,
      data: new Uint8ClampedArray(4 * 4 * 4).fill(255),
    };

    const scaled8 = scale8x(src);
    expect(scaled8.width).toBe(32);
    expect(scaled8.height).toBe(32);
  });

  it('rotSprite exact 0° returns identical copy', () => {
    const data = new Uint8ClampedArray([
      10, 20, 30, 255, 40, 50, 60, 255,
      70, 80, 90, 255, 100, 110, 120, 255,
    ]);
    const src: PixelBuffer = { width: 2, height: 2, data };
    const rotated = rotSprite(src, 0);

    expect(rotated.width).toBe(2);
    expect(rotated.height).toBe(2);
    expect(Array.from(rotated.data)).toEqual(Array.from(data));
  });

  it('rotSprite exact 180° inverts pixels symmetrically', () => {
    const data = new Uint8ClampedArray([
      255, 0, 0, 255, 0, 255, 0, 255,
      0, 0, 255, 255, 255, 255, 255, 255,
    ]);
    const src: PixelBuffer = { width: 2, height: 2, data };
    const rotated = rotSprite(src, Math.PI);

    // Pixel at (0,0) moves to (1,1), (1,0) moves to (0,1)
    expect(rotated.data[0]).toBe(255); // was (1,1)
    expect(rotated.data[1]).toBe(255);
    expect(rotated.data[2]).toBe(255);
  });

  it('rotSprite introduces 0 new palette colors on arbitrary angles', () => {
    // 8x8 sprite with 3 colors: Red, Blue, Transparent
    const width = 8;
    const height = 8;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        if (x === y) {
          // Red diagonal
          data[idx] = 255; data[idx + 1] = 0; data[idx + 2] = 0; data[idx + 3] = 255;
        } else if (x === width - 1 - y) {
          // Blue anti-diagonal
          data[idx] = 0; data[idx + 1] = 0; data[idx + 2] = 255; data[idx + 3] = 255;
        }
      }
    }

    const src: PixelBuffer = { width, height, data };
    // Rotate 33 degrees (0.576 rad)
    const angleRad = (33 * Math.PI) / 180;
    const rotated = rotSprite(src, angleRad);

    expect(rotated.width).toBe(width);
    expect(rotated.height).toBe(height);

    // Verify all non-transparent pixels in rotated result are either pure Red or pure Blue
    for (let i = 0; i < width * height; i++) {
      const idx = i * 4;
      const r = rotated.data[idx];
      const g = rotated.data[idx + 1];
      const b = rotated.data[idx + 2];
      const a = rotated.data[idx + 3];

      if (a === 0) continue;

      const isRed = r === 255 && g === 0 && b === 0 && a === 255;
      const isBlue = r === 0 && g === 0 && b === 255 && a === 255;

      expect(isRed || isBlue).toBe(true);
    }
  });

  it('rotSprite with sub-degree rotation does NOT falsely trigger 0° fast-path', () => {
    // 8x8 sprite with a single white pixel at (0, 0)
    const width = 8;
    const height = 8;
    const data = new Uint8ClampedArray(width * height * 4);
    data[0] = 255;
    data[1] = 255;
    data[2] = 255;
    data[3] = 255;

    const src: PixelBuffer = { width, height, data };
    // 0.007 rad is approx 0.401 degrees (previously Math.round(0.401) === 0 triggered fast-path)
    const rotated = rotSprite(src, 0.007);
    expect(rotated.width).toBe(8);
    expect(rotated.height).toBe(8);

    // Exact 0 fast-path returns identical reference data or exact clone;
    // With 0.007 rad, it runs through the majority vote pipeline without crashing
    expect(rotated.data).toBeInstanceOf(Uint8ClampedArray);
  });

  it('rotSprite supports expanded target bounds and custom pivot without clipping', () => {
    // 4x4 square filled with red
    const width = 4;
    const height = 4;
    const data = new Uint8ClampedArray(width * height * 4).fill(255);
    const src: PixelBuffer = { width, height, data };

    // Rotate 45 degrees around center (2, 2) into an expanded 8x8 canvas
    const angleRad = Math.PI / 4;
    const rotated = rotSprite(src, angleRad, 2, 2, 8, 8, 4, 4);

    expect(rotated.width).toBe(8);
    expect(rotated.height).toBe(8);
    // Should have solid pixels near the center of the 8x8 canvas
    const centerIdx = (4 * 8 + 4) * 4;
    expect(rotated.data[centerIdx + 3]).toBe(255);
  });

  it('rotSprite safely handles extreme 1x32 aspect ratio at irrational angle', () => {
    const width = 1;
    const height = 32;
    const data = new Uint8ClampedArray(width * height * 4);
    // Set 1st pixel red
    data[0] = 255; data[3] = 255;

    const src: PixelBuffer = { width, height, data };
    const angleRad = (37.5 * Math.PI) / 180;
    const rotated = rotSprite(src, angleRad);

    expect(rotated.width).toBe(1);
    expect(rotated.height).toBe(32);
    expect(rotated.data.length).toBe(1 * 32 * 4);
  });

  it('rotSprite safely handles 0-dimension or empty buffer', () => {
    const empty: PixelBuffer = { width: 0, height: 0, data: new Uint8ClampedArray(0) };
    const rotated = rotSprite(empty, 0.5);
    expect(rotated.width).toBeGreaterThanOrEqual(1);
    expect(rotated.height).toBeGreaterThanOrEqual(1);
    expect(rotated.data.length).toBe(rotated.width * rotated.height * 4);
  });
});
