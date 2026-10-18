/**
 * A tiny in-memory canvas for the tool preview clips. The studio's raster
 * functions only ever call getImageData/putImageData, so `rasterContext` lets
 * the clips run the real tool code on these buffers, in the browser and in
 * unit tests alike.
 */

import { bunOutline, bunPixels, BUN_INK, type BunPose } from '@/lib/art/bunSprite';
import type { ShadedPixel } from '@/lib/ai/math/curvesAndLines';

export const ART_W = 32;
export const ART_H = 24;

export interface Raster {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

export interface Pt { x: number; y: number }

export function blank(width = ART_W, height = ART_H): Raster {
  return { width, height, data: new Uint8ClampedArray(width * height * 4) };
}

export function clone(r: Raster): Raster {
  return { width: r.width, height: r.height, data: new Uint8ClampedArray(r.data) };
}

export function rgb(hex: string): [number, number, number] {
  const value = parseInt(hex.replace('#', ''), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

export function setPixel(r: Raster, x: number, y: number, hex: string, alpha = 255): void {
  if (x < 0 || y < 0 || x >= r.width || y >= r.height) return;
  const [cr, cg, cb] = rgb(hex);
  const i = (Math.round(y) * r.width + Math.round(x)) * 4;
  r.data[i] = cr; r.data[i + 1] = cg; r.data[i + 2] = cb; r.data[i + 3] = alpha;
}

export function clearPixel(r: Raster, x: number, y: number): void {
  if (x < 0 || y < 0 || x >= r.width || y >= r.height) return;
  r.data.fill(0, (y * r.width + x) * 4, (y * r.width + x) * 4 + 4);
}

export function fillRect(r: Raster, x: number, y: number, w: number, h: number, hex: string): void {
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) setPixel(r, xx, yy, hex);
}

export function opaque(r: Raster, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= r.width || y >= r.height) return false;
  return r.data[(y * r.width + x) * 4 + 3] > 30;
}

/** Bun, the studio mascot, from the same pixel table the app draws everywhere else. */
export function drawBun(r: Raster, ox: number, oy: number, pose: BunPose = 'idle', outline = true): Raster {
  if (outline) for (const [x, y] of bunOutline(pose)) setPixel(r, ox + x, oy + y, BUN_INK);
  for (const [x, y, w, h, fill] of bunPixels(pose)) fillRect(r, ox + x, oy + y, w, h, fill);
  return r;
}

/** Source-over: paint `top` onto `base` (both the same size). */
export function over(base: Raster, top: Raster): Raster {
  const out = clone(base);
  const a = out.data;
  const b = top.data;
  for (let i = 0; i < a.length; i += 4) {
    const ta = b[i + 3] / 255;
    if (ta === 0) continue;
    const ba = a[i + 3] / 255;
    const oa = ta + ba * (1 - ta);
    for (let c = 0; c < 3; c++) a[i + c] = Math.round((b[i + c] * ta + a[i + c] * ba * (1 - ta)) / oa);
    a[i + 3] = Math.round(oa * 255);
  }
  return out;
}

/** Apply engine output (shaded or specular pixels) the way the studio commits it. */
export function applyShaded(r: Raster, pixels: readonly ShadedPixel[]): Raster {
  const top = blank(r.width, r.height);
  for (const p of pixels) {
    if (p.x < 0 || p.y < 0 || p.x >= r.width || p.y >= r.height) continue;
    const i = (p.y * r.width + p.x) * 4;
    top.data[i] = p.r; top.data[i + 1] = p.g; top.data[i + 2] = p.b; top.data[i + 3] = p.a;
  }
  return over(r, top);
}

/**
 * A stand-in 2D context over a raster, enough for the engine functions
 * (floodFill, pixelAiEngine, photometric lighting, dithering, thinning).
 */
export function rasterContext(r: Raster): CanvasRenderingContext2D {
  return {
    canvas: { width: r.width, height: r.height },
    getImageData: () => ({ width: r.width, height: r.height, data: new Uint8ClampedArray(r.data), colorSpace: 'srgb' }),
    putImageData: (image: { data: Uint8ClampedArray }) => { r.data.set(image.data); },
  } as unknown as CanvasRenderingContext2D;
}

/** Run a context-based engine function on a copy and return the result. */
export function runOn(r: Raster, run: (ctx: CanvasRenderingContext2D, width: number, height: number) => void): Raster {
  const out = clone(r);
  run(rasterContext(out), out.width, out.height);
  return out;
}

export function changed(a: Raster, b: Raster, i: number): boolean {
  const o = i * 4;
  return a.data[o] !== b.data[o] || a.data[o + 1] !== b.data[o + 1]
    || a.data[o + 2] !== b.data[o + 2] || a.data[o + 3] !== b.data[o + 3];
}

/**
 * When each pixel changes, as a 0..1 fraction of the action. Pixels that never
 * change get Infinity. `key` ranks the changing pixels (lower goes first).
 */
export function revealOrder(before: Raster, after: Raster, key: (x: number, y: number) => number): Float32Array {
  const n = before.width * before.height;
  const order = new Float32Array(n).fill(Infinity);
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < n; i++) {
    if (!changed(before, after, i)) continue;
    const k = key(i % before.width, Math.floor(i / before.width));
    order[i] = k;
    lo = Math.min(lo, k);
    hi = Math.max(hi, k);
  }
  const span = hi - lo || 1;
  for (let i = 0; i < n; i++) if (order[i] !== Infinity) order[i] = hi === lo ? 0 : (order[i] - lo) / span;
  return order;
}

/** Breadth-first distance from a seed through the pixels that change: a flood ripple. */
export function floodOrder(before: Raster, after: Raster, seed: Pt): Float32Array {
  const { width, height } = before;
  const dist = new Float32Array(width * height).fill(Infinity);
  const start = seed.y * width + seed.x;
  if (!changed(before, after, start)) return revealOrder(before, after, (x, y) => Math.hypot(x - seed.x, y - seed.y));
  dist[start] = 0;
  const queue = [start];
  for (let head = 0; head < queue.length; head++) {
    const i = queue[head];
    const x = i % width;
    const y = Math.floor(i / width);
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const j = ny * width + nx;
      if (dist[j] !== Infinity || !changed(before, after, j)) continue;
      dist[j] = dist[i] + 1;
      queue.push(j);
    }
  }
  return revealOrder(before, after, (x, y) => {
    const d = dist[y * width + x];
    return d === Infinity ? Math.hypot(x - seed.x, y - seed.y) * 1.4 : d;
  });
}

/** Frame at `progress`: pixels whose turn has come show `after`, the rest `before`. */
export function revealAt(before: Raster, after: Raster, order: Float32Array, progress: number): Raster {
  const out = clone(before);
  for (let i = 0; i < order.length; i++) {
    if (order[i] <= progress) out.data.set(after.data.subarray(i * 4, i * 4 + 4), i * 4);
  }
  return out;
}

/** A deterministic 0..1 hash for scattering specks and sparkles. */
export function hash(x: number, y: number, seed = 1): number {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
