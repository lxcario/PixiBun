import { getStudioTheme, type ThemePalette } from './registry';

/**
 * Recolors the landing page's hand-painted night scenes into any studio theme.
 *
 * The scenes are drawn in Moonlit's plum night. Each cool or neutral pixel is
 * mapped, by lightness, onto the theme's own palette ramp, so walls, sky and
 * silhouettes take the theme's colors while keeping the painting's light and
 * shade. Warm light (lamps, windows, candles), greens and the brightest
 * highlights (moon, stars) keep their original color. By day the ramp is
 * inverted, so the night painting turns into a light, daytime version.
 *
 * Pixel art uses few colors, so results are cached per source color.
 */

const RAMP_FIELDS: Array<keyof ThemePalette> = ['ink', 'sunken', 'bg', 'surface', 'raised', 'active', 'hover', 'elevated', 'borderSubtle', 'border', 'borderHi', 'muted', 'body', 'heading'];

function hexRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** CIE L* (0-100) from sRGB. */
function lightness(r: number, g: number, b: number): number {
  const lin = (v: number) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const y = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return y > 216 / 24389 ? 116 * Math.cbrt(y) - 16 : (24389 / 27) * y;
}

function hueChroma(r: number, g: number, b: number): [number, number] {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const chroma = (max - min) / 255;
  if (max === min) return [0, 0];
  let h: number;
  if (max === r) h = ((g - b) / (max - min)) % 6;
  else if (max === g) h = (b - r) / (max - min) + 2;
  else h = (r - g) / (max - min) + 4;
  return [(h * 60 + 360) % 360, chroma];
}

export type Recolor = ((image: ImageData) => void) | null;

/**
 * Returns null when the scene should keep its original colors (Moonlit at night).
 * `paintedForDay` is for a scene that paints its own daylight values: by day its lightness
 * is kept as painted instead of inverted, and only near-white highlights stay unthemed.
 */
export function sceneRecolor(themeId: string, day: boolean, paintedForDay = false): Recolor {
  const theme = getStudioTheme(themeId);
  if (theme.id === 'moonlit' && !day) return null;
  const palette = day ? theme.day : theme.night;
  const stops = RAMP_FIELDS.map(field => {
    const rgb = hexRgb(palette[field]);
    return { l: lightness(...rgb), rgb };
  }).sort((a, b) => a.l - b.l);
  const cache = new Map<number, number>();

  const map = (r: number, g: number, b: number): number => {
    const key = (r << 16) | (g << 8) | b;
    const hit = cache.get(key);
    if (hit !== undefined) return hit;
    let out = key;
    const l = lightness(r, g, b);
    const [hue, chroma] = hueChroma(r, g, b);
    // Keep warm light, plants and the brightest highlights as painted.
    const warm = chroma > 0.18 && hue >= 12 && hue <= 75;
    const green = chroma > 0.15 && hue > 75 && hue < 170;
    const highlight = l > (paintedForDay && day ? 98.5 : day ? 74 : 82);
    if (!warm && !green && !highlight) {
      // By day the ramp is inverted gently: a full inversion turned the night painting's pale far
      // ridge into a dark band and the near hills nearly white. Compressed, the sky stays lightest
      // and distant shapes fade towards it, the way hills look in daylight haze.
      const target = day && !paintedForDay ? 97 - l * 0.5 : l;
      let lo = stops[0];
      let hi = stops[stops.length - 1];
      for (let i = 0; i < stops.length - 1; i++) {
        if (target >= stops[i].l && target <= stops[i + 1].l) {
          lo = stops[i];
          hi = stops[i + 1];
          break;
        }
      }
      const span = hi.l - lo.l;
      const f = target <= lo.l ? 0 : target >= hi.l ? 1 : span > 0 ? (target - lo.l) / span : 0;
      const mix = (i: number) => Math.round(lo.rgb[i] + (hi.rgb[i] - lo.rgb[i]) * f);
      out = (mix(0) << 16) | (mix(1) << 8) | mix(2);
    }
    cache.set(key, out);
    return out;
  };

  return (image: ImageData) => {
    const d = image.data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] === 0) continue;
      const c = map(d[i], d[i + 1], d[i + 2]);
      d[i] = (c >> 16) & 255;
      d[i + 1] = (c >> 8) & 255;
      d[i + 2] = c & 255;
    }
  };
}

/** Recolors whatever is currently on a canvas, in place. */
export function recolorCanvas(ctx: CanvasRenderingContext2D, recolor: Recolor) {
  if (!recolor) return;
  const { width, height } = ctx.canvas;
  if (width < 1 || height < 1) return;
  const image = ctx.getImageData(0, 0, width, height);
  recolor(image);
  ctx.putImageData(image, 0, 0);
}
