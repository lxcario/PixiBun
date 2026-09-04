/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
import { inferRaymarchedShadowSettings } from '@/lib/ai/math/shadowAuto';

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

describe('Raymarched Soft Shadows Auto-Analysis Engine', () => {
  it('returns sensible defaults when the canvas is empty', () => {
    const data = makeData(32, 32, () => null);
    const out = inferRaymarchedShadowSettings(data, 32, 32);

    expect(out.lightX).toBe(16);
    expect(out.lightY).toBeLessThan(16); // Overhead
    expect(out.lightRadius).toBe(16);
    expect(out.shadowOpacity).toBe(0.6);
    expect(out.ditherMode).toBe('4x4');
    expect(out.rationale).toContain('empty');
  });

  it('positions light source top-left for 315° key light, casting shadow down-right', () => {
    // 32x32 canvas with centered 16x16 sprite
    const data = makeData(32, 32, (x, y) => {
      if (x >= 8 && x <= 24 && y >= 8 && y <= 24) {
        return [220, 60, 40, 255]; // red sprite
      }
      return null;
    });

    const out = inferRaymarchedShadowSettings(data, 32, 32, {
      keyLightAzimuth: 315,
      keyLightElevation: 45,
    });

    // For 315° light, light should be to the left of sprite center (cx=16) and above (cy=16)
    expect(out.lightX).toBeLessThan(out.spriteBounds.cx);
    expect(out.lightY).toBeLessThan(out.spriteBounds.cy);
    expect(out.lightRadius).toBeGreaterThanOrEqual(8);
    expect(out.lightRadius).toBeLessThanOrEqual(24);
  });

  it('positions light source top-right for 45° key light', () => {
    const data = makeData(32, 32, (x, y) => {
      if (inCircle(x, y, 16, 16, 8)) {
        return [100, 180, 240, 255];
      }
      return null;
    });

    const out = inferRaymarchedShadowSettings(data, 32, 32, {
      keyLightAzimuth: 45,
      keyLightElevation: 45,
    });

    // For 45° light, light should be to the right of sprite center (cx=16) and above (cy=16)
    expect(out.lightX).toBeGreaterThan(out.spriteBounds.cx);
    expect(out.lightY).toBeLessThan(out.spriteBounds.cy);
  });

  it('infers complementary Indigo or Violet shadow for warm red/gold artwork', () => {
    const data = makeData(32, 32, (x, y) => {
      if (inCircle(x, y, 16, 16, 10)) {
        return [240, 70, 30, 255]; // warm red
      }
      return null;
    });

    const out = inferRaymarchedShadowSettings(data, 32, 32);
    expect(['#180B26', '#2E1065']).toContain(out.shadowColor);
  });

  it('infers earthy Umber or Obsidian shadow for cool blue/cyan artwork', () => {
    const data = makeData(32, 32, (x, y) => {
      if (inCircle(x, y, 16, 16, 10)) {
        return [40, 140, 240, 255]; // cool blue
      }
      return null;
    });

    const out = inferRaymarchedShadowSettings(data, 32, 32);
    expect(['#26140B', '#0A0612']).toContain(out.shadowColor);
  });

  it('infers Teal/Fog shadow for lush nature/foliage artwork', () => {
    const data = makeData(32, 32, (x, y) => {
      if (inCircle(x, y, 16, 16, 10)) {
        return [40, 210, 60, 255]; // vibrant green foliage
      }
      return null;
    });

    const out = inferRaymarchedShadowSettings(data, 32, 32);
    expect(out.shadowColor).toBe('#062419');
  });

  it('detects ground baseline accurately for standing characters', () => {
    // Character standing on row 28
    const data = makeData(32, 32, (x, y) => {
      if (x >= 10 && x <= 22 && y >= 10 && y <= 28) {
        return [180, 120, 90, 255];
      }
      return null;
    });

    const out = inferRaymarchedShadowSettings(data, 32, 32);
    expect(out.spriteBounds.maxY).toBe(28);
    expect(out.isFloating).toBe(false);
  });

  it('detects floating items with lowered opacity', () => {
    // Floating orb near the top of the canvas (y: 4..14 in 32x32 canvas)
    const data = makeData(32, 32, (x, y) => {
      if (inCircle(x, y, 16, 8, 5)) {
        return [220, 180, 80, 255];
      }
      return null;
    });

    const out = inferRaymarchedShadowSettings(data, 32, 32);
    expect(out.isFloating).toBe(true);
    expect(out.shadowOpacity).toBe(0.5);
  });

  it('infers light direction directly from painted highlight bias when present', () => {
    // Artwork with a distinct bright highlight in the top-left quadrant
    const data = makeData(32, 32, (x, y) => {
      if (!inCircle(x, y, 16, 16, 10)) return null;
      if (inCircle(x, y, 11, 11, 3)) return [255, 255, 240, 255]; // top-left hotspot
      return [100, 70, 60, 255]; // body
    });

    const out = inferRaymarchedShadowSettings(data, 32, 32);
    // Light placed towards top-left to match painted hotspot
    expect(out.lightX).toBeLessThan(out.spriteBounds.cx);
    expect(out.lightY).toBeLessThan(out.spriteBounds.cy);
  });
});
