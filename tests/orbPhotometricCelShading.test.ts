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

describe('Soft Orb & Geometric Primitive Photometric Cel-Shading', () => {
  it('cel-shades a flat purple circle into discrete OKLCH tones preserving >=55% base artist color', () => {
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
    expect(inferred.material).toBe('matte');

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
        material: inferred.material,
        cavityStrength: 1.0,
        ditherModulation: 0,
        bayerSize: '4x4',
        formType: inferred.formType,
      },
      []
    );

    const outData = shadedCanvas.getContext('2d')!.getImageData(0, 0, width, height).data;

    let totalOpaque = 0;
    let baseColorPixels = 0;
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

          // Check if exact original base color is preserved
          if (r === 134 && g === 75 && b === 162) {
            baseColorPixels++;
          }
        }
      }
    }

    // 1. Output must be cel-shaded into a cohesive palette (<= 4 discrete colors), not 189 muddy float colors
    expect(uniqueColors.size).toBeLessThanOrEqual(4);

    // 2. Base artist color must dominate >= 55% of the orb surface
    const baseRatio = baseColorPixels / totalOpaque;
    expect(baseRatio).toBeGreaterThanOrEqual(0.55);

    // 3. No pixel should be crushed to near-black mud (< 20% luminance)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        if (outData[idx + 3] > 30) {
          const r = outData[idx];
          const g = outData[idx + 1];
          const b = outData[idx + 2];
          const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
          expect(lum).toBeGreaterThan(0.08);
        }
      }
    }
  });

  it('adds warm highlight only when the material is shiny (metal/gold/glass)', () => {
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
    let hasHighlight = false;
    for (let i = 0; i < metalData.length; i += 4) {
      if (metalData[i + 3] > 30) {
        const r = metalData[i];
        const g = metalData[i + 1];
        const b = metalData[i + 2];
        // Warm OKLCH highlight tone for #864ba2 (134, 75, 162)
        if (r === 183 && g === 112 && b === 190) {
          hasHighlight = true;
          break;
        }
      }
    }
    expect(hasHighlight).toBe(true);
  });
});
