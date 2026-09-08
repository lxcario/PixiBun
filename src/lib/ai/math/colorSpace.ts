/**
 * OKLab & OKLCH Color Space Transforms.
 *
 * Citation: Björn Ottosson, "A perceptual color space for image processing" (2020).
 * Provides uniform perceptual spacing for delta E color quantization,
 * lightness adjustments, and color grading.
 */

export interface OKLabColor {
  L: number;
  a: number;
  b: number;
}

export type OklabColor = OKLabColor;

/**
 * Converts sRGB [0..255] to Linear float [0..1].
 */
export function srgbToLinear(c: number): number {
  const norm = c / 255;
  return norm <= 0.04045 ? norm / 12.92 : Math.pow((norm + 0.055) / 1.055, 2.4);
}

/**
 * Converts Linear float [0..1] to sRGB integer [0..255].
 */
export function linearToSrgb(c: number): number {
  const clamped = Math.max(0, Math.min(1, c));
  const srgb = clamped <= 0.0031308 ? clamped * 12.92 : 1.055 * Math.pow(clamped, 1.0 / 2.4) - 0.055;
  return Math.round(Math.max(0, Math.min(255, srgb * 255)));
}

/**
 * Converts sRGB [0..255] to OKLab { L: 0..1, a, b }.
 */
export function rgbToOKLab(r: number, g: number, b: number): OKLabColor {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);

  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);

  return {
    L: 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
  };
}

/**
 * Converts OKLab to sRGB object { r, g, b } in [0..255].
 */
export function okLabToRGB(L: number, a: number, b: number): { r: number; g: number; b: number } {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  const lr = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const lg = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const lb = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

  return {
    r: linearToSrgb(lr),
    g: linearToSrgb(lg),
    b: linearToSrgb(lb),
  };
}

/**
 * Converts OKLab to sRGB tuple [r, g, b] in [0..255].
 */
export function oklabToRgb(L: number, a: number, b: number): [number, number, number] {
  const rgb = okLabToRGB(L, a, b);
  return [rgb.r, rgb.g, rgb.b];
}

/**
 * Perceptual color difference delta E in OKLab space.
 */
export function deltaEOKLab(c1: OKLabColor, c2: OKLabColor): number {
  const dL = c1.L - c2.L;
  const da = c1.a - c2.a;
  const db = c1.b - c2.b;
  return Math.sqrt(dL * dL + da * da + db * db);
}

export function okLabToOKLCH(L: number, a: number, b: number): { L: number; C: number; h: number } {
  const C = Math.sqrt(a * a + b * b);
  let h = (Math.atan2(b, a) * 180) / Math.PI;
  if (h < 0) h += 360;
  return { L, C, h };
}

export function oklchToOKLab(L: number, C: number, h: number): OKLabColor {
  const hRad = (h * Math.PI) / 180;
  return {
    L,
    a: C * Math.cos(hRad),
    b: C * Math.sin(hRad),
  };
}

/**
 * Converts RGB [0..255] to OKLCH perceptual cylindrical color space [L: 0..1, C: 0..0.4, H: 0..360].
 */
export function rgbToOklch(r: number, g: number, b: number): [number, number, number] {
  const lab = rgbToOKLab(r, g, b);
  const C = Math.sqrt(lab.a * lab.a + lab.b * lab.b);
  let H = (Math.atan2(lab.b, lab.a) * 180) / Math.PI;
  if (H < 0) H += 360;
  return [lab.L, C, H];
}

/**
 * Converts OKLCH [0..1, 0..0.4, 0..360] to RGB [0..255].
 */
export function oklchToRgb(L: number, C: number, H: number): [number, number, number] {
  const hRad = (H * Math.PI) / 180;
  const a = C * Math.cos(hRad);
  const b = C * Math.sin(hRad);
  return oklabToRgb(L, a, b);
}

/**
 * Shifts hue towards target hue by at most maxShiftDeg along the shortest arc.
 */
export function shiftHue(currentH: number, targetH: number, maxShiftDeg: number): number {
  let diff = (targetH - currentH + 360) % 360;
  if (diff > 180) diff -= 360;
  const shift = Math.sign(diff) * Math.min(Math.abs(diff), maxShiftDeg);
  return (currentH + shift + 360) % 360;
}

// Aliases for cross-engine compatibility
export const rgbToOklab = rgbToOKLab;
export const deltaEOklab = deltaEOKLab;
export const oklabDistance = deltaEOKLab;
export const shiftHueToward = shiftHue;

