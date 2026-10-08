import { describe, it, expect } from 'vitest';
import { paethRotate } from '@/lib/canvas/paethRotation';
import { computeRotatedBounds, rotSprite, type PixelBuffer } from '@/lib/canvas/rotSprite';

describe('Alan Paeth 3-Shear Rotation Engine', () => {
  it('rotates a rectangular image around its output center without losing an edge row', () => {
    const data = new Uint8ClampedArray(3 * 2 * 4);
    for (let i = 0; i < 6; i++) data.set([i + 1, 0, 0, 255], i * 4);
    const output = paethRotate({ width: 3, height: 2, data }, Math.PI / 2);
    expect([output.width, output.height]).toEqual([2, 3]);
    expect(Array.from(output.data).filter((_, i) => i % 4 === 0)).toEqual([4, 1, 5, 2, 6, 3]);
  });
  it.each([0, 90, 180, 270])('uses the same pixel centers as rigid motion at %s degrees', deg => {
    const data = new Uint8ClampedArray(3 * 2 * 4);
    for (let i = 0; i < 6; i++) data.set([i + 1, 30, 40, 255], i * 4);
    const src = { width: 3, height: 2, data }, angle = deg * Math.PI / 180;
    expect(paethRotate(src, angle, 1.5, 1, 10, 10, 5, 5).data)
      .toEqual(rotSprite(src, angle, 1.5, 1, 10, 10, 5, 5).data);
  });

  it('strictly preserves pixel count and area across arbitrary angles', () => {
    const w = 16, h = 16;
    const data = new Uint8ClampedArray(w * h * 4);
    // Draw a 6x6 solid square in the center (36 pixels)
    for (let y = 5; y < 11; y++) {
      for (let x = 5; x < 11; x++) {
        const i = (y * w + x) * 4;
        data[i] = 200; data[i + 1] = 100; data[i + 2] = 50; data[i + 3] = 255;
      }
    }
    const src: PixelBuffer = { width: w, height: h, data };

    for (const deg of [15, 30, 45, 60, 90, 135, 180]) {
      const rad = (deg * Math.PI) / 180;
      const b = computeRotatedBounds(w, h, 0, 0, 8, 8, rad);
      const res = paethRotate(src, rad, b.localPivotX, b.localPivotY, b.targetW, b.targetH, b.outPivotX, b.outPivotY);

      let solidCount = 0;
      for (let i = 3; i < res.data.length; i += 4) {
        if (res.data[i] > 0) solidCount++;
      }
      expect(solidCount).toBe(36);
    }
  });

  it('preserves alternating checkerboard dither without clumping or Moiré collapse', () => {
    const w = 16, h = 16;
    const data = new Uint8ClampedArray(w * h * 4);
    // Draw an alternating 8x8 checkerboard in the center
    let initialCheckerPixels = 0;
    for (let y = 4; y < 12; y++) {
      for (let x = 4; x < 12; x++) {
        if ((x + y) % 2 === 0) {
          const i = (y * w + x) * 4;
          data[i] = 255; data[i + 1] = 255; data[i + 2] = 255; data[i + 3] = 255;
          initialCheckerPixels++;
        }
      }
    }
    expect(initialCheckerPixels).toBe(32);

    const src: PixelBuffer = { width: w, height: h, data };
    const rad = (20 * Math.PI) / 180;
    const b = computeRotatedBounds(w, h, 0, 0, 8, 8, rad);
    const res = paethRotate(src, rad, b.localPivotX, b.localPivotY, b.targetW, b.targetH, b.outPivotX, b.outPivotY);

    let rotatedSolid = 0;
    for (let i = 3; i < res.data.length; i += 4) {
      if (res.data[i] > 0) rotatedSolid++;
    }
    // Total pixel density is exactly preserved
    expect(rotatedSolid).toBe(32);

    // Verify palette purity (only pure white or transparent, no blended grayscale)
    for (let i = 0; i < res.data.length; i += 4) {
      const a = res.data[i + 3];
      if (a > 0) {
        expect(res.data[i]).toBe(255);
        expect(res.data[i + 1]).toBe(255);
        expect(res.data[i + 2]).toBe(255);
        expect(a).toBe(255);
      }
    }
  });

  it('handles exact orthogonal quarter turns identically to canvas transformation', () => {
    const w = 8, h = 8;
    const data = new Uint8ClampedArray(w * h * 4);
    // Red pixel at (2, 2)
    data[(2 * w + 2) * 4] = 255; data[(2 * w + 2) * 4 + 3] = 255;
    const src: PixelBuffer = { width: w, height: h, data };

    const b = computeRotatedBounds(w, h, 0, 0, 4, 4, Math.PI / 2);
    const res90 = paethRotate(src, Math.PI / 2, b.localPivotX, b.localPivotY, b.targetW, b.targetH, b.outPivotX, b.outPivotY);

    let solidCount = 0;
    for (let i = 3; i < res90.data.length; i += 4) {
      if (res90.data[i] > 0) solidCount++;
    }
    expect(solidCount).toBe(1);
  });
});
