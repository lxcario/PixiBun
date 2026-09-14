/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
import { inferPhotometricSettings } from '@/lib/ai/math/photometricAuto';

class MockImageData {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.data = new Uint8ClampedArray(width * height * 4);
  }
}

if (typeof (globalThis as unknown as { document?: unknown }).document === 'undefined') {
  (globalThis as unknown as { document: unknown }).document = {
    createElement: (tag: string) => {
      if (tag === 'canvas') {
        let _img = new MockImageData(32, 32);
        return {
          width: 32,
          height: 32,
          getContext: () => ({
            createImageData: (w: number, h: number) => {
              _img = new MockImageData(w, h);
              return _img;
            },
            putImageData: (img: MockImageData) => {
              _img = img;
            },
            getImageData: () => _img,
          }),
        };
      }
      return {};
    },
  };
}

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

  it('classifies drawn cat character, protects eyes/mouth from diffuse crush, and applies cel-shading', async () => {
    const { computeContentAwareHeightmap } = await import('@/lib/ai/math/edtNormalMap');
    const { executePhotometricPipeline } = await import('@/lib/ai/math/photometricLighting');

    // Construct a 32x32 cat sprite matching media_1788546468414.png
    // Cream body: [255, 245, 230, 255]
    // Black eyes: [0, 0, 0, 255] at (11, 15) and (19, 15)
    // Dark mouth: [30, 20, 30, 255] at (14..16, 19)
    // Black whiskers: [0, 0, 0, 255] at (4..6, 15) and (25..27, 15)
    const catData = makeData(32, 32, (x, y) => {
      // Left ear (x: 9..12, y: 5..9)
      if (x >= 9 && x <= 12 && y >= 5 && y <= 9) {
        if (x === 9 || x === 12 || y === 5) return [0, 0, 0, 255]; // outline
        return [255, 245, 230, 255];
      }
      // Right ear (x: 19..22, y: 5..9)
      if (x >= 19 && x <= 22 && y >= 5 && y <= 9) {
        if (x === 19 || x === 22 || y === 5) return [0, 0, 0, 255]; // outline
        return [255, 245, 230, 255];
      }
      // Whiskers (thin 1px lateral lines)
      if (y === 15 && ((x >= 4 && x <= 6) || (x >= 25 && x <= 27))) {
        return [0, 0, 0, 255];
      }
      // Face / Body (x: 7..24, y: 10..22)
      if (x >= 7 && x <= 24 && y >= 10 && y <= 22) {
        // Outline
        if (x === 7 || x === 24 || y === 10 || y === 22) return [0, 0, 0, 255];
        // Left eye
        if (x === 11 && (y === 14 || y === 15)) return [0, 0, 0, 255];
        // Right eye
        if (x === 19 && (y === 14 || y === 15)) return [0, 0, 0, 255];
        // Mouth
        if ((x === 14 || x === 15 || x === 16) && y === 18) return [30, 20, 30, 255];
        // Cream body
        return [255, 245, 230, 255];
      }
      return null;
    });

    // 1. Inferred Settings: Recognizes character with anatomical features
    const settings = inferPhotometricSettings(catData, 32, 32);
    expect(settings.formType).toBe('character');
    expect(settings.lightAzimuth).toBe(315);
    expect(settings.lightElevation).toBe(48);
    expect(settings.rationale).toContain('character with anatomical features');

    // 2. Content-Aware Heightmap & Feature Isolation
    const analysis = computeContentAwareHeightmap(catData, 32, 32);
    const leftEyeIdx = 15 * 32 + 11;
    const rightEyeIdx = 15 * 32 + 19;
    const mouthIdx = 18 * 32 + 15;
    expect(analysis.isFeature[leftEyeIdx]).toBe(1);
    expect(analysis.isFeature[rightEyeIdx]).toBe(1);
    expect(analysis.isFeature[mouthIdx]).toBe(1);

    // Frontal cushion normal on the face interior maintains camera-facing orientation (Nz >= 0.85)
    const faceCenterIdx = 16 * 32 + 15;
    expect(analysis.normalField.nz[faceCenterIdx]).toBeGreaterThanOrEqual(0.85);

    // 3. Shading Execution: Features (eyes, mouth) are protected from being muddied
    // Mock canvas context
    const mockCtx = {
      getImageData: () => ({ data: new Uint8ClampedArray(catData) }),
    } as unknown as CanvasRenderingContext2D;

    const shadedCanvas = executePhotometricPipeline(
      mockCtx,
      32,
      32,
      {
        lightAzimuth: 315,
        lightElevation: 48,
        lightRadius: 64,
        lightColor: '#FFFFFF',
        ambientIntensity: 0.35,
        material: 'matte',
        cavityStrength: 1.0,
        ditherModulation: 0,
        bayerSize: '4x4',
        formType: 'character',
      },
      []
    );

    const outData = shadedCanvas.getContext('2d')!.getImageData(0, 0, 32, 32).data;

    // Verify left and right eyes remain pure crisp black (not muddied or washed out)
    const leftEyeP = leftEyeIdx * 4;
    expect(outData[leftEyeP]).toBe(0);
    expect(outData[leftEyeP + 1]).toBe(0);
    expect(outData[leftEyeP + 2]).toBe(0);

    const rightEyeP = rightEyeIdx * 4;
    expect(outData[rightEyeP]).toBe(0);
    expect(outData[rightEyeP + 1]).toBe(0);
    expect(outData[rightEyeP + 2]).toBe(0);

    // Verify mouth retains its exact artist color
    const mouthP = mouthIdx * 4;
    expect(outData[mouthP]).toBe(30);
    expect(outData[mouthP + 1]).toBe(20);
    expect(outData[mouthP + 2]).toBe(30);

    // Verify whiskers retain crisp black outline
    const whiskerP = (15 * 32 + 5) * 4;
    expect(outData[whiskerP]).toBe(0);
    expect(outData[whiskerP + 1]).toBe(0);
    expect(outData[whiskerP + 2]).toBe(0);

    // Verify face interior retains clean cream base color, NOT crushed to muddy brown
    const faceP = faceCenterIdx * 4;
    expect(outData[faceP]).toBe(255);
    expect(outData[faceP + 1]).toBe(245);
    expect(outData[faceP + 2]).toBe(230);

    // Verify unlit right cheek contour has a soft, stepped shadow tone (not pitch black or muddy brown)
    const rightCheekP = (16 * 32 + 23) * 4;
    expect(outData[rightCheekP]).toBeGreaterThan(160); // light and readable
    expect(outData[rightCheekP]).toBeLessThan(255); // in shadow

    // 4. Verification of ZERO gradient banding (all shadow pixels share the exact same cel ramp color)
    const shadowR = outData[rightCheekP];
    const shadowG = outData[rightCheekP + 1];
    const shadowB = outData[rightCheekP + 2];

    const anotherShadowP = (17 * 32 + 23) * 4;
    expect(outData[anotherShadowP]).toBe(shadowR);
    expect(outData[anotherShadowP + 1]).toBe(shadowG);
    expect(outData[anotherShadowP + 2]).toBe(shadowB);

    // 5. Lit-side ear stabilization: left ear (facing the 315° key light) must NOT be bisected into a 1px shadow tube
    const leftEarInteriorP1 = (7 * 32 + 10) * 4;
    const leftEarInteriorP2 = (7 * 32 + 11) * 4;
    expect(outData[leftEarInteriorP1]).toBe(255); // retains base cream color
    expect(outData[leftEarInteriorP1 + 1]).toBe(245);
    expect(outData[leftEarInteriorP1 + 2]).toBe(230);
    expect(outData[leftEarInteriorP2]).toBe(255); // retains base cream color (not bisected!)
    expect(outData[leftEarInteriorP2 + 1]).toBe(245);
    expect(outData[leftEarInteriorP2 + 2]).toBe(230);
  });

  it('correctly classifies and cel-shades 128x128 character with asymmetrical ears and whiskers', async () => {
    const { computeContentAwareHeightmap } = await import('@/lib/ai/math/edtNormalMap');
    const { executePhotometricPipeline } = await import('@/lib/ai/math/photometricLighting');

    const w = 128;
    const h = 128;
    const data = new Uint8ClampedArray(w * h * 4);

    // Red bunny character (#e55050)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let isInside = false;
        // Tall left ear (y: 15..55, x: 40..60)
        if (x >= 40 && x <= 60 && y >= 15 && y <= 55) {
          if (Math.hypot(x - 50, y - 35) <= 18) isInside = true;
        }
        // Sideways right ear (y: 40..60, x: 55..95)
        if (x >= 55 && x <= 95 && y >= 40 && y <= 60) {
          if (Math.hypot(x - 75, y - 50) <= 15) isInside = true;
        }
        // Main head body (y: 45..95, x: 35..85)
        if (x >= 35 && x <= 85 && y >= 45 && y <= 95) {
          if (Math.hypot(x - 60, y - 70) <= 25) isInside = true;
        }

        if (isInside) {
          const idx = (y * w + x) * 4;
          data[idx] = 229;
          data[idx + 1] = 80;
          data[idx + 2] = 80;
          data[idx + 3] = 255;
        }
      }
    }

    // Facial features: eyes, brow marks, mouth, whiskers
    const drawDark = (x: number, y: number) => {
      const idx = (y * w + x) * 4;
      data[idx] = 40;
      data[idx + 1] = 40;
      data[idx + 2] = 60;
      data[idx + 3] = 255;
    };
    for (let x = 48; x <= 53; x++) drawDark(x, 62); // left eye
    for (let x = 67; x <= 72; x++) drawDark(x, 62); // right eye
    for (let y = 54; y <= 58; y++) drawDark(58, y); // forehead tick 1
    for (let y = 54; y <= 58; y++) drawDark(62, y); // forehead tick 2
    for (let x = 54; x <= 66; x++) drawDark(x, 75); // mouth
    for (let x = 36; x <= 42; x++) drawDark(x, 68); // whisker 1
    for (let x = 36; x <= 42; x++) drawDark(x, 72); // whisker 2
    for (let x = 36; x <= 42; x++) drawDark(x, 76); // whisker 3

    // 1. Classification: Successfully detects character despite asymmetrical height & 8 feature clusters
    const settings = inferPhotometricSettings(data, w, h);
    expect(settings.formType).toBe('character');
    expect(settings.rationale).toContain('character with anatomical features');

    // 2. Content-aware heightmap: Isolates eye and mouth features
    const analysis = computeContentAwareHeightmap(data, w, h);
    const eyeIdx = 62 * w + 50;
    expect(analysis.isFeature[eyeIdx]).toBe(1);

    // 3. Shading execution: Produces discrete cel-shading ramps, NOT 24-bit floating point gradient mud
    const mockCtx = {
      getImageData: () => ({ data: new Uint8ClampedArray(data), width: w, height: h }),
    } as unknown as CanvasRenderingContext2D;

    const shadedCanvas = executePhotometricPipeline(
      mockCtx,
      w,
      h,
      {
        lightAzimuth: 315,
        lightElevation: 45,
        lightRadius: 64,
        lightColor: '#FFFFFF',
        ambientIntensity: 0.48,
        lightBrightness: 1.15,
        material: 'fabric',
        cavityStrength: 1.0,
        ditherModulation: 0,
        bayerSize: '4x4',
        formType: 'character',
      },
      []
    );

    const outData = shadedCanvas.getContext('2d')!.getImageData(0, 0, w, h).data;

    // Verify dark eye pixel is 100% preserved
    const eyeP = eyeIdx * 4;
    expect(outData[eyeP]).toBe(40);
    expect(outData[eyeP + 1]).toBe(40);
    expect(outData[eyeP + 2]).toBe(60);

    // Verify body pixels are quantized to discrete cel tones (<= 6 distinct color values across entire sprite)
    const colorSet = new Set<string>();
    for (let i = 0; i < w * h; i++) {
      const p = i * 4;
      if (outData[p + 3] > 30) {
        colorSet.add(`${outData[p]},${outData[p + 1]},${outData[p + 2]}`);
      }
    }
    expect(colorSet.size).toBeLessThanOrEqual(6);
  });

  it('correctly shades characters with dark body palettes (crimson and navy) on 128x128 without line-art false positives', async () => {
    const { computeContentAwareHeightmap } = await import('@/lib/ai/math/edtNormalMap');
    const { executePhotometricPipeline } = await import('@/lib/ai/math/photometricLighting');
    const w = 128;
    const h = 128;
    const catData = new Uint8ClampedArray(w * h * 4);

    // Draw a dark crimson cat body (lum ~ 0.18) with a black outer contour
    const cx = 64;
    const cy = 64;
    const r = 32;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const dist = Math.hypot(x - cx, y - cy);
        if (dist <= r) {
          if (dist >= r - 2) {
            // True black outline
            catData[idx] = 10;
            catData[idx + 1] = 10;
            catData[idx + 2] = 10;
            catData[idx + 3] = 255;
          } else {
            // Dark crimson body fill (R=127, G=27, B=21, lum=0.18)
            catData[idx] = 127;
            catData[idx + 1] = 27;
            catData[idx + 2] = 21;
            catData[idx + 3] = 255;
          }
        }
      }
    }

    // Add distinct facial features (eyes) so it classifies as character
    const leftEyeIdx = (56 * w + 54) * 4;
    catData[leftEyeIdx] = 0;
    catData[leftEyeIdx + 1] = 0;
    catData[leftEyeIdx + 2] = 0;
    catData[leftEyeIdx + 3] = 255;

    const rightEyeIdx = (56 * w + 74) * 4;
    catData[rightEyeIdx] = 0;
    catData[rightEyeIdx + 1] = 0;
    catData[rightEyeIdx + 2] = 0;
    catData[rightEyeIdx + 3] = 255;

    const analysis = computeContentAwareHeightmap(catData, w, h);
    
    // True black border pixels must be flagged as ink lines
    const borderIdx = ((cy - r) * w + cx);
    expect(analysis.isInkLine[borderIdx]).toBe(1);

    // Deep interior crimson body pixels must NOT be false-positive ink lines
    const interiorIdx = (cy * w + cx);
    expect(analysis.isInkLine[interiorIdx]).toBe(0);

    // Shading execution with key light at 315°
    const mockCtx = {
      getImageData: () => ({ data: new Uint8ClampedArray(catData) }),
    } as unknown as CanvasRenderingContext2D;

    const shadedCanvas = executePhotometricPipeline(
      mockCtx,
      w,
      h,
      {
        lightAzimuth: 315,
        lightElevation: 45,
        lightRadius: 64,
        lightColor: '#FFFFFF',
        ambientIntensity: 0.48,
        lightBrightness: 1.15,
        material: 'matte',
        cavityStrength: 1.0,
        ditherModulation: 0,
        bayerSize: '4x4',
        formType: 'character',
      },
      []
    );

    const outData = shadedCanvas.getContext('2d')!.getImageData(0, 0, w, h).data;

    // Verify unlit right side receives dark cel shadow
    const rightSideP = (cy * w + (cx + 24)) * 4;
    expect(outData[rightSideP]).toBeLessThan(127); // Darker than base crimson red
    expect(outData[rightSideP + 3]).toBe(255);

    // Verify lit left side retains base crimson or highlight
    const leftSideP = (cy * w + (cx - 18)) * 4;
    expect(outData[leftSideP]).toBeGreaterThanOrEqual(120);
  });

  it('auto-scales cavityStrength down on complex hair-spike / multi-appendage character silhouettes, preventing deep-crevice engulfment', async () => {
    const { inferPhotometricSettings } = await import('@/lib/ai/math/photometricAuto');
    const { executePhotometricPipeline } = await import('@/lib/ai/math/photometricLighting');

    // Construct a 64x64 character sprite with multiple hair spikes/tufts on top and a character torso below
    const w = 64;
    const h = 64;
    const blueColor: [number, number, number, number] = [40, 70, 220, 255]; // Blue body matching user sprite

    const hairSpikeData = makeData(w, h, (x, y) => {
      // 4 prominent hair spikes in top region (y: 6..20)
      // Spike 1: x: 12..15, y: 8..20
      if (x >= 12 && x <= 15 && y >= 8 && y <= 20) return blueColor;
      // Spike 2: x: 22..25, y: 5..20
      if (x >= 22 && x <= 25 && y >= 5 && y <= 20) return blueColor;
      // Spike 3: x: 38..41, y: 5..20
      if (x >= 38 && x <= 41 && y >= 5 && y <= 20) return blueColor;
      // Spike 4: x: 48..51, y: 8..20
      if (x >= 48 && x <= 51 && y >= 8 && y <= 20) return blueColor;

      // Head & Torso body below (x: 16..47, y: 21..54)
      if (x >= 16 && x <= 47 && y >= 21 && y <= 54) {
        // Eyes at (24, 28) and (39, 28)
        if ((x === 24 || x === 39) && (y === 28 || y === 29)) return [0, 0, 0, 255];
        return blueColor;
      }
      return null;
    });

    // 1. Verify inferPhotometricSettings detects complex silhouette and scales down cavityStrength
    const settings = inferPhotometricSettings(hairSpikeData, w, h);
    expect(settings.formType).toBe('character');
    expect(settings.cavityStrength).toBeGreaterThanOrEqual(0.35);
    expect(settings.cavityStrength).toBeLessThanOrEqual(0.55);
    expect(settings.rationale).toContain('cavity AO auto-scaled');

    // 2. Verify spherical orb retains cavityStrength: 1.0
    const orbData = makeData(32, 32, (x, y) => {
      if (inCircle(x, y, 16, 16, 12)) return [200, 100, 50, 255];
      return null;
    });
    const orbSettings = inferPhotometricSettings(orbData, 32, 32);
    expect(orbSettings.formType).toBe('orb');
    expect(orbSettings.cavityStrength).toBe(1.0);

    // 3. Shading execution tone-bucket comparison: default cavityStrength 1.0 vs auto-scaled cavityStrength
    const mockCtx = {
      getImageData: () => ({ data: new Uint8ClampedArray(hairSpikeData) }),
    } as unknown as CanvasRenderingContext2D;

    // (a) Shading with flat cavityStrength: 1.0
    const shadedFlat = executePhotometricPipeline(
      mockCtx,
      w,
      h,
      {
        lightAzimuth: 315,
        lightElevation: 48,
        lightRadius: 64,
        lightColor: '#FFFFFF',
        ambientIntensity: 0.48,
        lightBrightness: 1.15,
        material: 'matte',
        cavityStrength: 1.0,
        ditherModulation: 0,
        bayerSize: '4x4',
        formType: 'character',
      },
      []
    );
    const flatData = shadedFlat.getContext('2d')!.getImageData(0, 0, w, h).data;

    // (b) Shading with auto-scaled cavityStrength (settings.cavityStrength)
    const shadedAuto = executePhotometricPipeline(
      mockCtx,
      w,
      h,
      {
        lightAzimuth: 315,
        lightElevation: 48,
        lightRadius: 64,
        lightColor: '#FFFFFF',
        ambientIntensity: 0.48,
        lightBrightness: 1.15,
        material: 'matte',
        cavityStrength: settings.cavityStrength,
        ditherModulation: 0,
        bayerSize: '4x4',
        formType: 'character',
      },
      []
    );
    const autoData = shadedAuto.getContext('2d')!.getImageData(0, 0, w, h).data;

    const { buildCelRamp } = await import('@/lib/ai/math/photometricLighting');
    const ramp = buildCelRamp(blueColor[0], blueColor[1], blueColor[2]);

    // Count tone distribution on hair spike pixels (y: 6..20)
    let totalHairPixels = 0;
    let deepCreviceFlatCount = 0;
    let deepCreviceAutoCount = 0;
    let directionalOrBaseAutoCount = 0;

    for (let y = 6; y <= 20; y++) {
      for (let x = 0; x < w; x++) {
        const p = (y * w + x) * 4;
        if (hairSpikeData[p + 3] > 0) {
          totalHairPixels++;
          if (flatData[p] === ramp.deepR && flatData[p + 1] === ramp.deepG && flatData[p + 2] === ramp.deepB) {
            deepCreviceFlatCount++;
          }
          if (autoData[p] === ramp.deepR && autoData[p + 1] === ramp.deepG && autoData[p + 2] === ramp.deepB) {
            deepCreviceAutoCount++;
          } else {
            directionalOrBaseAutoCount++;
          }
        }
      }
    }

    const flatCreviceShare = deepCreviceFlatCount / totalHairPixels;
    const autoCreviceShare = deepCreviceAutoCount / totalHairPixels;
    const directionalRecoveryShare = directionalOrBaseAutoCount / totalHairPixels;

    // With flat cavityStrength: 1.0, adjacent spike pixels are overwhelmingly marked deep-crevice (>= 40%)
    expect(flatCreviceShare).toBeGreaterThanOrEqual(0.40);
    // With auto-scaled cavityStrength & dynamic crevice threshold, deep-crevice share drops to < 10%
    expect(autoCreviceShare).toBeLessThan(0.10);
    // Over 90% of hair spike pixels recover base color and directional shading responsive to the light
    expect(directionalRecoveryShare).toBeGreaterThan(0.90);
  });
});

