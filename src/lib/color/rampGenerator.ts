/**
 * Perceptually Uniform OKLCH Color Ramp Generator for Pixel Art
 * Implements standard Pixel Art Color Theory:
 * - Highlights shift toward Warm Sunlight (OKLCH Hue 105°)
 * - Shadows shift toward Cool Sky / Indigo Ambience (OKLCH Hue 285°)
 */

import { rgbToOklch, oklchToRgb, shiftHueToward } from '@/lib/ai/math/colorSpace';
import { rgbaToHex } from '@/lib/canvas/floodFill';

export interface ColorRampStep {
  name: 'highlight' | 'base' | 'shadow' | 'deep' | 'outline';
  hex: string;
}

// Convert Hex to RGB [0-255]
function hexToRgb(hex: string): [number, number, number] {
  if (!hex || typeof hex !== 'string') {
    return [0, 0, 0];
  }
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3 || clean.length === 4) {
    clean = clean.slice(0, 3).split('').map(c => c + c).join('');
  } else if (clean.length > 6) {
    clean = clean.slice(0, 6);
  }
  const num = parseInt(clean, 16);
  if (Number.isNaN(num)) {
    return [0, 0, 0];
  }
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

// Convert RGB [0-255] to uppercase Hex
const rgbToHex = (r: number, g: number, b: number): string => rgbaToHex(r, g, b).toUpperCase();

const WARM_SUN_HUE = 105; // Yellow sunlight
const COOL_SHADOW_HUE = 285; // Deep indigo ambient sky

/**
 * Generates an authentic pixel art 5-step color ramp with warm-shifted highlights and cool-shifted shadows
 */
export function generateOklchRamp(baseHex: string): string[] {
  const [r, g, b] = hexToRgb(baseHex);
  const [L, C, H] = rgbToOklch(r, g, b);

  // 1. Highlight: Lighter, slightly desaturated, shifted toward warm sunlight
  const highlightHue = shiftHueToward(H, WARM_SUN_HUE, 15);
  const [hr, hg, hb] = oklchToRgb(
    Math.min(0.96, L + 0.16),
    Math.max(0.04, C * 0.85),
    highlightHue
  );

  // 2. Base Tone
  const baseRgb = [r, g, b] as [number, number, number];

  // 3. Mid Shadow: Rich, saturated, shifted toward cool shadow hue
  const shadowHue = shiftHueToward(H, COOL_SHADOW_HUE, 12);
  const [sr, sg, sb] = oklchToRgb(
    Math.max(0.18, L - 0.16),
    Math.min(0.32, C * 1.12),
    shadowHue
  );

  // 4. Deep Shadow: Rich deep contrast
  const deepHue = shiftHueToward(H, COOL_SHADOW_HUE, 22);
  const [dr, dg, db] = oklchToRgb(
    Math.max(0.1, L - 0.32),
    Math.max(0.04, C * 1.05),
    deepHue
  );

  // 5. Obsidian Outline: Deep contrast
  const outlineHue = shiftHueToward(H, COOL_SHADOW_HUE, 30);
  const [or, og, ob] = oklchToRgb(
    Math.max(0.05, L - 0.50),
    Math.max(0.02, C * 0.5),
    outlineHue
  );

  return [
    rgbToHex(hr, hg, hb),
    rgbToHex(baseRgb[0], baseRgb[1], baseRgb[2]),
    rgbToHex(sr, sg, sb),
    rgbToHex(dr, dg, db),
    rgbToHex(or, og, ob),
  ];
}

/** Lightness offsets of the shade strip, darkest first; the base sits in the middle. */
const SHADE_STRIP_STEPS = [-0.36, -0.24, -0.12, 0, 0.1, 0.19, 0.27];

/**
 * Seven hue-shifted shades around one color, darkest first, with the base
 * unchanged in the middle: shadows lean cool and gain a little chroma,
 * highlights lean warm and lose some, as pixel artists build ramps by hand.
 * Steps that would clip to the same black or white are dropped.
 */
export function generateShadeStrip(baseHex: string): string[] {
  const [r, g, b] = hexToRgb(baseHex);
  const [L, C, H] = rgbToOklch(r, g, b);
  const base = rgbToHex(r, g, b);
  const strip: string[] = [];
  for (const offset of SHADE_STRIP_STEPS) {
    if (offset === 0) { strip.push(base); continue; }
    const depth = Math.abs(offset) / 0.36;
    const hue = offset < 0 ? shiftHueToward(H, COOL_SHADOW_HUE, 26 * depth) : shiftHueToward(H, WARM_SUN_HUE, 20 * depth);
    const chroma = offset < 0 ? Math.min(0.32, C * (1 + 0.12 * depth)) : C * (1 - 0.3 * depth);
    const lightness = Math.max(0.04, Math.min(0.98, L + offset));
    const [sr, sg, sb] = oklchToRgb(lightness, chroma, hue);
    strip.push(rgbToHex(sr, sg, sb));
  }
  return strip.filter((hex, index) => hex === base || strip.indexOf(hex) === index);
}
