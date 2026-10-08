import { describe, it, expect } from 'vitest';
import { rotateNormalVectors, rotateNormalMapBuffer } from '@/lib/canvas/normalMapRotation';
import { computeRotatedBounds, type PixelBuffer } from '@/lib/canvas/rotSprite';

describe('Normal Map Vector Counter-Rotation', () => {
  it('keeps flat neutral normals (128, 128, 255) invariant', () => {
    const data = new Uint8ClampedArray([128, 128, 255, 255]);
    const src: PixelBuffer = { width: 1, height: 1, data };

    const res = rotateNormalVectors(src, Math.PI / 4);
    expect(res.data[0]).toBeCloseTo(128, -1);
    expect(res.data[1]).toBeCloseTo(128, -1);
    expect(res.data[2]).toBe(255);
    expect(res.data[3]).toBe(255);
  });

  it('correctly counter-rotates an upward normal to rightward at 90 deg clockwise', () => {
    // Upward normal: R=128 (Nx=0), G=255 (Ny=1), B=128 (Nz=0)
    const data = new Uint8ClampedArray([128, 255, 128, 255]);
    const src: PixelBuffer = { width: 1, height: 1, data };

    // At 90 deg clockwise (pi / 2), upward (+Y) rotates to rightward (+X)
    const res = rotateNormalVectors(src, Math.PI / 2);
    expect(res.data[0]).toBe(255); // Nx = +1 (Right)
    expect(res.data[1]).toBeCloseTo(128, -1); // Ny = 0
    expect(res.data[2]).toBeCloseTo(128, -1); // Nz = 0
    expect(res.data[3]).toBe(255);
  });

  it('correctly counter-rotates a rightward normal to downward at 90 deg clockwise', () => {
    // Rightward normal: R=255 (Nx=1), G=128 (Ny=0), B=128 (Nz=0)
    const data = new Uint8ClampedArray([255, 128, 128, 255]);
    const src: PixelBuffer = { width: 1, height: 1, data };

    // At 90 deg clockwise (pi / 2), rightward (+X) rotates to downward (-Y)
    const res = rotateNormalVectors(src, Math.PI / 2);
    expect(res.data[0]).toBeCloseTo(128, -1); // Nx = 0
    expect(res.data[1]).toBe(0); // Ny = -1 (Down, G=0 in OpenGL)
    expect(res.data[2]).toBeCloseTo(128, -1);
    expect(res.data[3]).toBe(255);
  });

  it('preserves transparent pixels without corruption', () => {
    const data = new Uint8ClampedArray([0, 0, 0, 0]);
    const src: PixelBuffer = { width: 1, height: 1, data };

    const res = rotateNormalVectors(src, Math.PI / 3);
    expect(Array.from(res.data)).toEqual([0, 0, 0, 0]);
  });

  it('executes full normal map layer rotation with spatial and vector alignment', () => {
    const w = 4, h = 4;
    const data = new Uint8ClampedArray(w * h * 4);
    // Fill an upward normal at (1, 1)
    const idx = (1 * w + 1) * 4;
    data[idx] = 128; data[idx + 1] = 255; data[idx + 2] = 255; data[idx + 3] = 255;
    const src: PixelBuffer = { width: w, height: h, data };

    const rad = Math.PI / 2;
    const b = computeRotatedBounds(w, h, 0, 0, 2, 2, rad);
    const res = rotateNormalMapBuffer(src, rad, b.localPivotX, b.localPivotY, b.targetW, b.targetH, b.outPivotX, b.outPivotY, 'rotsprite');

    // Find the solid pixel in the rotated output
    let foundSolid = false;
    for (let i = 0; i < res.data.length; i += 4) {
      if (res.data[i + 3] > 0) {
        foundSolid = true;
        // Tangent vector should now point rightward (R=255, G~128)
        expect(res.data[i]).toBeGreaterThan(200);
        expect(res.data[i + 1]).toBeCloseTo(128, -1);
      }
    }
    expect(foundSolid).toBe(true);
  });
});
