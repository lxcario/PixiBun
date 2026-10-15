import { TEMPLATE_PALETTE } from '@/lib/art/starterTemplates';
import { applySymmetry, filterPixelPerfect, getBresenhamLine, type Point } from '@/lib/canvas/rasterMath';
import type { PixelBuffer } from '@/lib/canvas/rotSprite';

/**
 * The bench's artwork: one 16×16 sprite as plain RGBA bytes, edited by the
 * visitor and handed, unchanged, to every engine on the bench.
 */

export const ART = 16;
/** The turn engines get a padded canvas so a rotated sprite keeps its corners. */
export const TURN = 24;

export type Rgba = readonly [number, number, number, number];

export function hexToRgba(hex: string): Rgba {
  const n = parseInt(hex.slice(1, 7), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255];
}

export function templatePixels(rows: readonly string[]): Uint8ClampedArray {
  const px = new Uint8ClampedArray(ART * ART * 4);
  for (let y = 0; y < ART; y++) {
    const row = rows[y] ?? '';
    for (let x = 0; x < ART; x++) {
      const hex = TEMPLATE_PALETTE[row[x]];
      if (!hex) continue;
      px.set(hexToRgba(hex), (y * ART + x) * 4);
    }
  }
  return px;
}

/**
 * Paint a pixel-perfect line from `from` to `to` (a dot when `from` is null),
 * mirrored across the sprite's middle when `mirror` is on. `color` null erases.
 * Returns whether any pixel changed.
 */
export function paintLine(px: Uint8ClampedArray, from: Point | null, to: Point, color: Rgba | null, mirror: boolean): boolean {
  const line = from ? filterPixelPerfect(getBresenhamLine(from.x, from.y, to.x, to.y)) : [to];
  const points = applySymmetry(line, ART, ART, mirror, false);
  const rgba = color ?? [0, 0, 0, 0];
  let changed = false;
  for (const { x, y } of points) {
    if (x < 0 || y < 0 || x >= ART || y >= ART) continue;
    const i = (y * ART + x) * 4;
    if (px[i] === rgba[0] && px[i + 1] === rgba[1] && px[i + 2] === rgba[2] && px[i + 3] === rgba[3]) continue;
    px.set(rgba, i);
    changed = true;
  }
  return changed;
}

export function samePixels(a: Uint8ClampedArray, b: Uint8ClampedArray): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

/** The sprite centred on a TURN×TURN canvas, ready for rotation. */
export function padForTurn(px: Uint8ClampedArray): PixelBuffer {
  const data = new Uint8ClampedArray(TURN * TURN * 4);
  const off = (TURN - ART) >> 1;
  for (let y = 0; y < ART; y++) data.set(px.subarray(y * ART * 4, (y + 1) * ART * 4), ((y + off) * TURN + off) * 4);
  return { width: TURN, height: TURN, data };
}

/**
 * Colours to paint with: the sprite's own colours, most used first (its ink
 * outline leads), plus a blush and a gold so there is always something new.
 */
export function spriteSwatches(rows: readonly string[], count = 6): string[] {
  const tally = new Map<string, number>();
  for (const row of rows) for (const key of row) if (TEMPLATE_PALETTE[key]) tally.set(key, (tally.get(key) ?? 0) + 1);
  const own = [...tally.entries()].sort((a, b) => b[1] - a[1]).map(([key]) => TEMPLATE_PALETTE[key]);
  const ink = TEMPLATE_PALETTE.o;
  const ordered = [ink, ...own.filter((hex) => hex !== ink)].slice(0, count);
  for (const extra of [TEMPLATE_PALETTE.r, TEMPLATE_PALETTE.A]) if (!ordered.includes(extra)) ordered.push(extra);
  return ordered;
}

/** One hop: squash on landing, rise, hang, fall. Lift is in art pixels. */
export const HOP_FRAMES: ReadonlyArray<{ lift: number; squash: boolean; ms: number }> = [
  { lift: 0, squash: true, ms: 160 },
  { lift: 2, squash: false, ms: 100 },
  { lift: 4, squash: false, ms: 200 },
  { lift: 2, squash: false, ms: 100 },
];
export const HOP_W = 20;
export const HOP_H = 24;
export const HOP_LOOP_MS = HOP_FRAMES.reduce((sum, frame) => sum + frame.ms, 0);

/** The hop frame showing at `ms` into the loop. */
export function hopFrameAt(ms: number): number {
  let t = ((ms % HOP_LOOP_MS) + HOP_LOOP_MS) % HOP_LOOP_MS;
  for (let i = 0; i < HOP_FRAMES.length; i++) {
    if (t < HOP_FRAMES[i].ms) return i;
    t -= HOP_FRAMES[i].ms;
  }
  return 0;
}
