/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
import { executePhotometricPipeline } from '@/lib/ai/math/photometricLighting';
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

describe('Photometric Shading Pipelines (Smooth 3D Orbs & Discrete Character Cel Ramps)', () => {
  it('renders smooth continuous 3D volumetric shading for orbs with soft ambient fill', () => {
    const width = 32;
    const height = 32;
    const circleData = new Uint8ClampedArray(width * height * 4);
    const cx = 16;
    const cy = 16;
    const radius = 10;

    // Draw solid purple circle (#864ba2)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = x - cx;
        const dy = y - cy;
        if (Math.hypot(dx, dy) <= radius) {
          const idx = (y * width + x) * 4;
          circleData[idx] = 134;     // R
          circleData[idx + 1] = 75;  // G
          circleData[idx + 2] = 162; // B
          circleData[idx + 3] = 255; // A
        }
      }
    }

    const inferred = inferPhotometricSettings(circleData, width, height);
    expect(inferred.formType).toBe('orb');

    const mockCtx = {
      getImageData: () => ({ data: new Uint8ClampedArray(circleData) }),
    } as unknown as CanvasRenderingContext2D;

    const shadedCanvas = executePhotometricPipeline(
      mockCtx,
      width,
      height,
      {
        lightAzimuth: inferred.lightAzimuth,
        lightElevation: inferred.lightElevation,
        lightRadius: 64,
        lightColor: '#FFFFFF',
        ambientIntensity: 0.48,
        material: 'matte',
        cavityStrength: 1.0,
        ditherModulation: 0,
        bayerSize: '4x4',
        formType: 'orb',
      },
      []
    );

    const outData = shadedCanvas.getContext('2d')!.getImageData(0, 0, width, height).data;

    let totalOpaque = 0;
    const uniqueColors = new Set<string>();

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        if (outData[idx + 3] > 30) {
          totalOpaque++;
          const r = outData[idx];
          const g = outData[idx + 1];
          const b = outData[idx + 2];
          const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
          uniqueColors.add(hex);
        }
      }
    }

    // 1. Output must have smooth continuous 3D volumetric curvature (rich smooth gradient, not flat 2-color staircase)
    expect(uniqueColors.size).toBeGreaterThan(15);
    expect(totalOpaque).toBeGreaterThan(200);

    // 2. No pixel should be crushed to near-black mud (< 10% luminance) thanks to soft ambient wrap
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        if (outData[idx + 3] > 30) {
          const r = outData[idx];
          const g = outData[idx + 1];
          const b = outData[idx + 2];
          const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
          expect(lum).toBeGreaterThan(0.04);
        }
      }
    }
  });

  it('renders discrete OKLCH cel ramps specifically for characters with anatomical features', () => {
    const width = 32;
    const height = 32;
    const charData = new Uint8ClampedArray(width * height * 4);
    // Draw character head with ears
    for (let y = 10; y < 26; y++) {
      for (let x = 8; x < 24; x++) {
        const idx = (y * width + x) * 4;
        charData[idx] = 134;
        charData[idx + 1] = 75;
        charData[idx + 2] = 162;
        charData[idx + 3] = 255;
      }
    }
    // Add ears
    for (let y = 4; y < 10; y++) {
      for (const x of [10, 11, 20, 21]) {
        const idx = (y * width + x) * 4;
        charData[idx] = 134;
        charData[idx + 1] = 75;
        charData[idx + 2] = 162;
        charData[idx + 3] = 255;
      }
    }

    const mockCtx = {
      getImageData: () => ({ data: new Uint8ClampedArray(charData) }),
    } as unknown as CanvasRenderingContext2D;

    const shadedCanvas = executePhotometricPipeline(
      mockCtx,
      width,
      height,
      {
        lightAzimuth: 315,
        lightElevation: 48,
        lightRadius: 64,
        lightColor: '#FFFFFF',
        ambientIntensity: 0.48,
        material: 'matte',
        cavityStrength: 1.0,
        ditherModulation: 0,
        bayerSize: '4x4',
        formType: 'character',
      },
      []
    );

    const outData = shadedCanvas.getContext('2d')!.getImageData(0, 0, width, height).data;
    const uniqueColors = new Set<string>();

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        if (outData[idx + 3] > 30) {
          const r = outData[idx];
          const g = outData[idx + 1];
          const b = outData[idx + 2];
          const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
          uniqueColors.add(hex);
        }
      }
    }

    // Character mode must use discrete OKLCH cel ramps (<= 4 discrete tones)
    expect(uniqueColors.size).toBeLessThanOrEqual(4);
  });

  it('adds specular gloss highlight when material is shiny metal on an orb', () => {
    const width = 32;
    const height = 32;
    const circleData = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (Math.hypot(x - 16, y - 16) <= 10) {
          const idx = (y * width + x) * 4;
          circleData[idx] = 134;
          circleData[idx + 1] = 75;
          circleData[idx + 2] = 162;
          circleData[idx + 3] = 255;
        }
      }
    }

    const mockCtx = {
      getImageData: () => ({ data: new Uint8ClampedArray(circleData) }),
    } as unknown as CanvasRenderingContext2D;

    // Render as 'metal'
    const shadedMetal = executePhotometricPipeline(
      mockCtx,
      width,
      height,
      {
        lightAzimuth: 315,
        lightElevation: 45,
        lightRadius: 64,
        lightColor: '#FFFFFF',
        ambientIntensity: 0.48,
        material: 'metal',
        cavityStrength: 1.0,
        ditherModulation: 0,
        bayerSize: '4x4',
        formType: 'orb',
      },
      []
    );

    const metalData = shadedMetal.getContext('2d')!.getImageData(0, 0, width, height).data;
    let maxLum = 0;
    for (let i = 0; i < metalData.length; i += 4) {
      if (metalData[i + 3] > 30) {
        const lum = (0.2126 * metalData[i] + 0.7152 * metalData[i + 1] + 0.0722 * metalData[i + 2]) / 255;
        if (lum > maxLum) maxLum = lum;
      }
    }
    // High specular highlight on metallic orb
    expect(maxLum).toBeGreaterThan(0.65);
  });
});
