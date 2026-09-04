/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
import { inferPhotometricSettings } from '@/lib/ai/math/photometricAuto';

function makeData(
  width: number,
  height: number,
  paint: (x: number, y: number) => [number, number, number, number] | null
): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const color = paint(x, y);
      if (!color) continue;
      const p = (y * width + x) * 4;
      data[p] = color[0];
      data[p + 1] = color[1];
      data[p + 2] = color[2];
      data[p + 3] = color[3];
    }
  }
  return data;
}

const inCircle = (x: number, y: number, cx: number, cy: number, r: number) =>
  Math.hypot(x - cx, y - cy) <= r;

describe('Photometric Auto-Analysis Engine', () => {
  it('returns safe studio defaults for an empty canvas', () => {
    const data = makeData(32, 32, () => null);
    const out = inferPhotometricSettings(data, 32, 32);
    expect(out.lightAzimuth).toBe(315);
    expect(out.lightElevation).toBe(45);
    expect(out.material).toBe('matte');
    expect(out.brightness).toBeGreaterThanOrEqual(0.5);
    expect(out.brightness).toBeLessThanOrEqual(2);
    expect(out.rationale.length).toBeGreaterThan(0);
  });

  it('points the light azimuth toward the brightest mass of the art', () => {
    // Sphere with a hot specular mass in the top-left quadrant
    const data = makeData(48, 48, (x, y) => {
      if (!inCircle(x, y, 24, 24, 16)) return null;
      if (inCircle(x, y, 13, 13, 6)) return [255, 250, 235, 255]; // bright NW hotspot
      return [120, 110, 100, 255];
    });
    const out = inferPhotometricSettings(data, 48, 48);
    // NW quadrant: 270°..360°
    expect(out.lightAzimuth).toBeGreaterThanOrEqual(270);
    expect(out.lightAzimuth).toBeLessThanOrEqual(360);
    // Top-weighted highlight => elevation pushed above the 45° baseline
    expect(out.lightElevation).toBeGreaterThan(45);
  });

  it('keeps the inferred settings inside physically valid ranges for any art', () => {
    const data = makeData(32, 32, (x) =>
      x % 2 === 0 ? [20, 200, 90, 255] : [240, 30, 60, 255]
    );
    const out = inferPhotometricSettings(data, 32, 32);
    expect(out.lightAzimuth).toBeGreaterThanOrEqual(0);
    expect(out.lightAzimuth).toBeLessThan(360);
    expect(out.lightElevation).toBeGreaterThanOrEqual(15);
    expect(out.lightElevation).toBeLessThanOrEqual(90);
    expect(['matte', 'metal', 'glass', 'fabric', 'gold']).toContain(out.material);
  });

  it('infers gold (warm conductor) shading for warm-highlighted art', () => {
    const data = makeData(48, 48, (x, y) => {
      if (!inCircle(x, y, 24, 24, 16)) return null;
      if (inCircle(x, y, 20, 20, 8)) return [255, 240, 192, 255]; // warm champagne highlights
      return [200, 144, 80, 255]; // warm gold albedo
    });
    const out = inferPhotometricSettings(data, 48, 48);
    expect(out.material).toBe('gold');
  });

  it('infers matte shading for soft, low-contrast art without highlights', () => {
    // Smooth vertical gradient, mid tones, zero specular pixels, low saturation
    const data = makeData(32, 32, (x, y) => {
      const v = 110 + Math.round(30 * (y / 31));
      return [v, v - 6, v - 12, 255];
    });
    const out = inferPhotometricSettings(data, 32, 32);
    expect(out.material).toBe('matte');
    // Mid-tone art keeps baseline exposure
    expect(out.brightness).toBeCloseTo(1.15, 5);
  });
});
