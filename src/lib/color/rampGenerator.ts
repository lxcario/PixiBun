/**
 * Perceptually Uniform OKLCH Color Ramp Generator for Pixel Art
 * Implements standard Pixel Art Color Theory:
 * - Highlights shift toward Warm Sunlight (OKLCH Hue 105°)
 * - Shadows shift toward Cool Sky / Indigo Ambience (OKLCH Hue 285°)
 */

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

// Convert RGB [0-255] to Hex
function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const toHex = (v: number) => clamp(v).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

// RGB to Linear sRGB
function srgbToLinear(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

// Linear sRGB to RGB
function linearToSrgb(v: number): number {
  const c = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
  return Math.max(0, Math.min(255, Math.round(c * 255)));
}

// RGB to OKLab
function rgbToOklab(r: number, g: number, b: number): [number, number, number] {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);

  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  return [
    0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
    1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
    0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_,
  ];
}

// OKLab to RGB
function oklabToRgb(L: number, a: number, b: number): [number, number, number] {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  const lr = +4.0767434782 * l - 3.3077115913 * m + 0.2309699291 * s;
  const lg = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const lb = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

  return [linearToSrgb(lr), linearToSrgb(lg), linearToSrgb(lb)];
}

// RGB to OKLCH
function rgbToOklch(r: number, g: number, b: number): [number, number, number] {
  const [L, a, b_] = rgbToOklab(r, g, b);
  const C = Math.sqrt(a * a + b_ * b_);
  let h = Math.atan2(b_, a) * (180 / Math.PI);
  if (h < 0) h += 360;
  return [L, C, h];
}

// OKLCH to RGB
function oklchToRgb(L: number, C: number, h: number): [number, number, number] {
  const hRad = (h * Math.PI) / 180;
  const a = C * Math.cos(hRad);
  const b = C * Math.sin(hRad);
  return oklabToRgb(L, a, b);
}

// Shortest path angular hue shift toward a target hue
function shiftHueToward(currentH: number, targetH: number, amountDeg: number): number {
  const diff = (targetH - currentH + 540) % 360 - 180;
  const step = Math.sign(diff) * Math.min(Math.abs(diff), amountDeg);
  return (currentH + step + 360) % 360;
}

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
