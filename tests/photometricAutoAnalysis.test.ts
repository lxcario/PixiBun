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

  it('recognizes character morphology with ears/horns and assigns 315°/48° key lighting', () => {
    // 32x32 sprite with two ear peaks at the top and a face body below
    const data = makeData(32, 32, (x, y) => {
      // Left ear (x: 8..11, y: 4..8)
      if (y >= 4 && y <= 8 && x >= 8 && x <= 11) return [140, 90, 180, 255];
      // Right ear (x: 20..23, y: 4..8)
      if (y >= 4 && y <= 8 && x >= 20 && x <= 23) return [140, 90, 180, 255];
      // Face / Body (x: 6..25, y: 9..24)
      if (y >= 9 && y <= 24 && x >= 6 && x <= 25) return [140, 90, 180, 255];
      return null;
    });
    const out = inferPhotometricSettings(data, 32, 32);
    expect(out.lightAzimuth).toBe(315);
    expect(out.lightElevation).toBe(48);
    expect(out.rationale).toContain('character with anatomical features');
  });

  it('recognizes spherical orb geometry and assigns 336° key lighting', () => {
    // 32x32 circle centered at (16, 16) with radius 12
    const data = makeData(32, 32, (x, y) => {
      if (inCircle(x, y, 16, 16, 12)) return [220, 50, 50, 255];
      return null;
    });
    const out = inferPhotometricSettings(data, 32, 32);
    expect(out.lightAzimuth).toBe(336);
    expect(out.rationale).toContain('spherical form');
  });
});

describe('Content-Aware Heightmap & Part Segmentation', () => {
  it('detects line art contours, isolates facial features, and segments anatomical parts', async () => {
    const { computeContentAwareHeightmap } = await import('@/lib/ai/math/edtNormalMap');

    // Create a 32x32 character sprite with black outline (0,0,0), purple body (150, 90, 190),
    // two ears at the top, and two black eye pixels inside the face.
    const data = makeData(32, 32, (x, y) => {
      // Black eye pixels inside face at (12, 14) and (19, 14)
      if ((x === 12 && y === 14) || (x === 19 && y === 14)) return [0, 0, 0, 255];

      // Left ear (x: 8..11, y: 4..7)
      if (x >= 8 && x <= 11 && y >= 4 && y <= 7) {
        if (x === 8 || x === 11 || y === 4) return [0, 0, 0, 255]; // ear outline
        return [150, 90, 190, 255]; // ear interior
      }

      // Right ear (x: 20..23, y: 4..7)
      if (x >= 20 && x <= 23 && y >= 4 && y <= 7) {
        if (x === 20 || x === 23 || y === 4) return [0, 0, 0, 255]; // ear outline
        return [150, 90, 190, 255]; // ear interior
      }

      // Main face body (x: 6..25, y: 8..24)
      if (x >= 6 && x <= 25 && y >= 8 && y <= 24) {
        if (x === 6 || x === 25 || y === 8 || y === 24) return [0, 0, 0, 255]; // body outline
        return [150, 90, 190, 255]; // body interior
      }

      return null;
    });

    const analysis = computeContentAwareHeightmap(data, 32, 32);

    // 1. Line art detection
    const borderIdx = 8 * 32 + 6; // left border of body
    expect(analysis.isInkLine[borderIdx]).toBe(1);

    // 2. Facial feature detection (eye pixel at 12, 14)
    const eyeIdx = 14 * 32 + 12;
    expect(analysis.isFeature[eyeIdx]).toBe(1);

    // 3. Part segmentation: left ear interior, right ear interior, and face have separate component IDs
    const leftEarInterior = 6 * 32 + 9;
    const rightEarInterior = 6 * 32 + 21;
    const faceInterior = 16 * 32 + 16;
    expect(analysis.componentMap[leftEarInterior]).toBeGreaterThan(0);
    expect(analysis.componentMap[rightEarInterior]).toBeGreaterThan(0);
    expect(analysis.componentMap[faceInterior]).toBeGreaterThan(0);

    // 4. Heightmap volume: ears have distinct local 3D height, not flattened ramps
    expect(analysis.smoothHeightmap[leftEarInterior]).toBeGreaterThan(0.5);
    expect(analysis.smoothHeightmap[rightEarInterior]).toBeGreaterThan(0.5);
    expect(analysis.smoothHeightmap[faceInterior]).toBeGreaterThan(analysis.smoothHeightmap[leftEarInterior]);

    // 5. Normal vectors: left ear left flank angles leftward, right ear right flank angles rightward
    const leftEarLeftFlank = 6 * 32 + 9;
    const rightEarRightFlank = 6 * 32 + 22;
    expect(analysis.normalField.nx[leftEarLeftFlank]).toBeLessThan(0); // angles toward the left
    expect(analysis.normalField.nx[rightEarRightFlank]).toBeGreaterThan(0); // angles toward the right
  });
});
