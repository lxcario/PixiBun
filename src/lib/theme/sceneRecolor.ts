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

/** Maps one sRGB color to the theme's; packed 0xRRGGBB in and out. */
type ColorMapper = (r: number, g: number, b: number) => number;

/**
 * The per-color mapping behind both recolor styles below. Null when the scene
 * keeps its original colors (Moonlit at night). `paintedForDay` is for a scene
 * that paints its own daylight values: by day its lightness is kept as painted
 * instead of inverted, and only near-white highlights stay unthemed.
 */
function colorMapper(themeId: string, day: boolean, paintedForDay: boolean): ColorMapper | null {
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
  return map;
}

/** Recolors a whole frame of pixels. Null when the scene keeps its original colors. */
export function sceneRecolor(themeId: string, day: boolean, paintedForDay = false): Recolor {
  const map = colorMapper(themeId, day, paintedForDay);
  if (!map) return null;
  // Scenes recolor every animation frame, so the loop reads whole pixels at once and reuses the
  // last answer: pixel art is long runs of one color, so most pixels skip the lookup entirely.
  // Packed pixels are little-endian (0xAABBGGRR), as on every platform browsers run on.
  return (image: ImageData) => {
    const d = image.data;
    const px = new Uint32Array(d.buffer, d.byteOffset, d.byteLength >> 2);
    let lastIn = -1;
    let lastOut = 0;
    for (let i = 0; i < px.length; i++) {
      const v = px[i];
      if (v >>> 24 === 0) continue;
      const bgr = v & 0xffffff;
      if (bgr !== lastIn) {
        const c = map(v & 255, (v >>> 8) & 255, (v >>> 16) & 255);
        lastIn = bgr;
        lastOut = ((c >>> 16) & 255) | (c & 0xff00) | ((c & 255) << 16);
      }
      px[i] = (v & 0xff000000) | lastOut;
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

/** A CSS color in the theme's palette: `#rrggbb`, `rgb()` and `rgba()` in, the same form out. */
export type SceneColor = (css: string) => string;

const identity: SceneColor = (css) => css;

/**
 * The same recolor as a color function, for a scene that paints in the theme's
 * colors directly instead of reading back and recoloring every frame. Hex colors
 * are cached whole; rgb()/rgba() keep their alpha and cache only the color.
 */
export function sceneColor(themeId: string, day: boolean, paintedForDay = false): SceneColor {
  const map = colorMapper(themeId, day, paintedForDay);
  if (!map) return identity;
  const hex = new Map<string, string>();
  const rgbCache = new Map<number, string>();
  const mapped = (r: number, g: number, b: number) => {
    const key = (r << 16) | (g << 8) | b;
    let out = rgbCache.get(key);
    if (out === undefined) {
      const c = map(r, g, b);
      out = `${(c >> 16) & 255}, ${(c >> 8) & 255}, ${c & 255}`;
      rgbCache.set(key, out);
    }
    return out;
  };
  return (css) => {
    if (css.charCodeAt(0) === 35) {
      let out = hex.get(css);
      if (out === undefined) {
        const [r, g, b] = hexRgb(css);
        const c = map(r, g, b);
        out = `#${((1 << 24) | c).toString(16).slice(1)}`;
        hex.set(css, out);
      }
      return out;
    }
    const m = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/.exec(css);
    if (!m) return css;
    const rgb = mapped(+m[1], +m[2], +m[3]);
    return m[4] === undefined ? `rgb(${rgb})` : `rgba(${rgb}, ${m[4]})`;
  };
}
