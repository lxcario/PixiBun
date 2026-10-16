/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
import { executePhotometricPipeline } from '@/lib/ai/math/photometricLighting';
import type { PhotometricLightingParams } from '@/types/tools';

// The light bar's Tint, Fill, Material and Edges controls must change the cel-shaded
// result, and their defaults must leave it exactly as before.

class MockImageData {
  data: Uint8ClampedArray;
  constructor(public width: number, public height: number) { this.data = new Uint8ClampedArray(width * height * 4); }
}

if (typeof (globalThis as unknown as { document?: unknown }).document === 'undefined') {
  (globalThis as unknown as { document: unknown }).document = {
    createElement: (tag: string) => {
      if (tag !== 'canvas') return {};
      let image = new MockImageData(24, 24);
      return {
        width: 24, height: 24,
        getContext: () => ({
          createImageData: (w: number, h: number) => (image = new MockImageData(w, h)),
          putImageData: (img: MockImageData) => { image = img; },
          getImageData: () => image,
        }),
      };
    },
  };
}

const SIZE = 24;
/** A round orange ball with a dark outline and a crease across it. */
function ball(): Uint8ClampedArray {
  const data = new Uint8ClampedArray(SIZE * SIZE * 4);
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
    const d = Math.hypot(x - 11.5, y - 11.5);
    if (d > 10) continue;
    const p = (y * SIZE + x) * 4;
    const edge = d > 9 || (y === 12 && x > 5 && x < 18);
    data.set(edge ? [40, 24, 30, 255] : [232, 140, 70, 255], p);
  }
  return data;
}

function render(overrides: Partial<PhotometricLightingParams> = {}) {
  const source = ball();
  const ctx = { getImageData: () => ({ data: new Uint8ClampedArray(source), width: SIZE, height: SIZE }) } as unknown as CanvasRenderingContext2D;
  const params: PhotometricLightingParams = {
    lightAzimuth: 315, lightElevation: 40, lightRadius: 64, lightColor: '#FFFFFF', ambientIntensity: 0.48,
    lightBrightness: 1.15, material: 'matte', cavityStrength: 1, ditherModulation: 0, bayerSize: '4x4',
    formType: 'orb', shadingBands: 2, glintStyle: 'soft', ...overrides,
  } as PhotometricLightingParams;
  const out = executePhotometricPipeline(ctx, SIZE, SIZE, params, []);
  return Array.from(out.getContext('2d')!.getImageData(0, 0, SIZE, SIZE).data);
}

const differs = (a: number[], b: number[]) => a.some((v, i) => v !== b[i]);

describe('light bar look controls', () => {
  const base = render();

  it('keeps the classic result for daylight, normal fill, matte and normal edges', () => {
    expect(render({ ambientIntensity: 0.45 })).toEqual(base);
    expect(render({ ambientIntensity: 0.35 })).toEqual(base);
  });

  it('tints the light', () => {
    const candle = render({ lightColor: '#FFD49A' });
    expect(differs(candle, base)).toBe(true);
    // Warm light keeps red and pulls blue down on the lit side.
    const redSum = (px: number[]) => px.filter((_, i) => i % 4 === 0).reduce((a, b) => a + b, 0);
    const blueSum = (px: number[]) => px.filter((_, i) => i % 4 === 2).reduce((a, b) => a + b, 0);
    expect(blueSum(candle)).toBeLessThan(blueSum(base));
    expect(redSum(candle)).toBe(redSum(base));
  });

  it('lifts shadows with more fill and sinks them with less', () => {
    const sum = (px: number[]) => px.reduce((a, b) => a + b, 0);
    expect(sum(render({ ambientIntensity: 0.65 }))).toBeGreaterThan(sum(base));
    expect(sum(render({ ambientIntensity: 0.08 }))).toBeLessThan(sum(base));
  });

  it('gives each material its own look', () => {
    const looks = (['matte', 'fabric', 'metal', 'gold', 'glass'] as const).map((material) => render({ material }));
    for (let i = 1; i < looks.length; i++) expect(differs(looks[i], looks[0])).toBe(true);
  });

  it('turns creases off at edge depth 0 and deepens them at 2', () => {
    expect(differs(render({ cavityStrength: 0 }), base)).toBe(true);
    expect(differs(render({ cavityStrength: 2 }), base)).toBe(true);
  });
});
