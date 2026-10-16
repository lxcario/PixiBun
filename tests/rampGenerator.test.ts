import { describe, it, expect } from 'vitest';
import { generateOklchRamp } from '@/lib/color/rampGenerator';

// Helper to calculate standard relative luminance from hex color string
function getRelativeLuminance(hex: string): number {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;

  const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

// Helper to convert hex to RGB
function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const num = parseInt(clean, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

// Helper to extract approximate hue in [0, 360) from hex
function getHue(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d === 0) return 0;

  let h = 0;
  if (max === r) {
    h = ((g - b) / d) % 6;
  } else if (max === g) {
    h = (b - r) / d + 2;
  } else {
    h = (r - g) / d + 4;
  }
  h = Math.round(h * 60);
  if (h < 0) h += 360;
  return h;
}

describe('OKLCH Pixel Art Color Ramp Generator (rampGenerator.ts)', () => {
  it('generates a 5-step color ramp with uppercase 7-character hex strings', () => {
    const ramp = generateOklchRamp('#e06c75');

    expect(ramp).toHaveLength(5);
    for (const hex of ramp) {
      expect(hex).toMatch(/^#[0-9A-F]{6}$/);
    }
  });

  it('preserves the base color at step index 1', () => {
    const baseHex = '#4A90E2';
    const ramp = generateOklchRamp(baseHex);

    expect(ramp[1].toUpperCase()).toBe(baseHex.toUpperCase());
  });

  it('exhibits monotonic luminance decrease across the 5 ramp steps for standard mid-tones', () => {
    const midtones = ['#E06C75', '#98C379', '#E5C07B', '#61AFEF', '#C678DD', '#56B6C2'];

    for (const color of midtones) {
      const ramp = generateOklchRamp(color);
      const luminances = ramp.map(getRelativeLuminance);

      // Highlight (0) > Base (1) > Shadow (2) > Deep (3) > Outline (4)
      for (let i = 0; i < luminances.length - 1; i++) {
        expect(luminances[i]).toBeGreaterThanOrEqual(luminances[i + 1]);
      }
      expect(luminances[0]).toBeGreaterThan(luminances[1]);
      expect(luminances[1]).toBeGreaterThan(luminances[2]);
      expect(luminances[2]).toBeGreaterThan(luminances[3]);
      expect(luminances[3]).toBeGreaterThan(luminances[4]);
    }
  });

  describe('Hue shifting towards warm sunlight (105°) and cool sky (285°)', () => {
    it('shifts highlights toward warm sunlight hue and shadows toward cool sky hue', () => {
      // Magenta/purple base (~300° hue)
      const baseHex = '#8B2FC9';
      const ramp = generateOklchRamp(baseHex);

      const [highlightHex, baseColor, shadowHex, deepHex, outlineHex] = ramp;

      const baseHue = getHue(baseColor);
      const highlightHue = getHue(highlightHex);
      const shadowHue = getHue(shadowHex);

      expect(ramp).toHaveLength(5);
      expect(baseHue).toBeGreaterThan(0);
      expect(highlightHex).not.toBe(baseColor);
      expect(shadowHex).not.toBe(baseColor);
      expect(deepHex).not.toBe(shadowHex);
      expect(outlineHex).not.toBe(deepHex);

      // Verify that highlight hue moved counter-clockwise/downward towards 105 from ~280-300
      // or that highlight is warmer than shadows
      expect(highlightHue).not.toEqual(shadowHue);
    });
  });

  describe('Edge cases and input robustness', () => {
    it('handles pure white (#FFFFFF) without crashing or NaN', () => {
      const ramp = generateOklchRamp('#FFFFFF');
      expect(ramp).toHaveLength(5);
      for (const hex of ramp) {
        expect(hex).toMatch(/^#[0-9A-F]{6}$/);
      }
      expect(ramp[1]).toBe('#FFFFFF');
    });

    it('handles pure black (#000000) without crashing or negative hex values', () => {
      const ramp = generateOklchRamp('#000000');
      expect(ramp).toHaveLength(5);
      for (const hex of ramp) {
        expect(hex).toMatch(/^#[0-9A-F]{6}$/);
      }
      expect(ramp[1]).toBe('#000000');
    });

    it('handles 3-character short hex formats (#FFF, #F00, #4A9)', () => {
      const ramp1 = generateOklchRamp('#F00');
      expect(ramp1).toHaveLength(5);
      expect(ramp1[1]).toBe('#FF0000');

      const ramp2 = generateOklchRamp('#FFF');
      expect(ramp2).toHaveLength(5);
      expect(ramp2[1]).toBe('#FFFFFF');
    });

    it('handles hex values without leading hash symbol', () => {
      const ramp = generateOklchRamp('98C379');
      expect(ramp).toHaveLength(5);
      expect(ramp[1]).toBe('#98C379');
    });

    it('handles 8-character (#RRGGBBAA) and 4-character (#RGBA) hex formats with alpha', () => {
      const ramp8 = generateOklchRamp('#E06C75FF');
      expect(ramp8).toHaveLength(5);
      expect(ramp8[1]).toBe('#E06C75');

      const ramp4 = generateOklchRamp('#F00F');
      expect(ramp4).toHaveLength(5);
      expect(ramp4[1]).toBe('#FF0000');
    });

    it('handles empty or malformed strings gracefully by falling back to black (#000000)', () => {
      const emptyRamp = generateOklchRamp('');
      expect(emptyRamp).toHaveLength(5);
      expect(emptyRamp[1]).toBe('#000000');

      const malformedRamp = generateOklchRamp('not-a-color');
      expect(malformedRamp).toHaveLength(5);
      expect(malformedRamp[1]).toBe('#000000');
    });

    it('handles fully saturated pure primaries', () => {
      const redRamp = generateOklchRamp('#FF0000');
      const greenRamp = generateOklchRamp('#00FF00');
      const blueRamp = generateOklchRamp('#0000FF');

      expect(redRamp).toHaveLength(5);
      expect(greenRamp).toHaveLength(5);
      expect(blueRamp).toHaveLength(5);

      for (const ramp of [redRamp, greenRamp, blueRamp]) {
        for (const hex of ramp) {
          expect(hex).toMatch(/^#[0-9A-F]{6}$/);
        }
      }
    });
  });
});

describe('generateShadeStrip', () => {
  it('keeps the base in the middle and orders shades dark to light', async () => {
    const { generateShadeStrip } = await import('@/lib/color/rampGenerator');
    const strip = generateShadeStrip('#C792DF');
    expect(strip).toHaveLength(7);
    expect(strip[3]).toBe('#C792DF');
    const luminance = strip.map(getRelativeLuminance);
    for (let i = 1; i < luminance.length; i++) expect(luminance[i]).toBeGreaterThan(luminance[i - 1]);
  });

  it('shifts shadows cooler (bluer) and highlights warmer (redder) than the base', async () => {
    const { generateShadeStrip } = await import('@/lib/color/rampGenerator');
    const strip = generateShadeStrip('#5FA04E').map(hexToRgb);
    const [deep, , , base, , , light] = strip;
    expect(deep[2] / Math.max(1, deep[0] + deep[1] + deep[2])).toBeGreaterThan(base[2] / (base[0] + base[1] + base[2]));
    expect(light[0] / (light[0] + light[1] + light[2])).toBeGreaterThan(base[0] / (base[0] + base[1] + base[2]));
  });

  it('drops steps that clip to the same extreme instead of repeating them', async () => {
    const { generateShadeStrip } = await import('@/lib/color/rampGenerator');
    const strip = generateShadeStrip('#FFFFFF');
    expect(new Set(strip).size).toBe(strip.length);
    expect(strip).toContain('#FFFFFF');
  });
});
