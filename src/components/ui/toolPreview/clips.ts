/**
 * Tool preview clips. Every clip runs the studio's own code on Bun: the same
 * rasterizers, flood fill, RotSprite, lighting, Sel-Out, cleanup, grading and
 * in-between morphing the tools call, so what the card plays is what the tool
 * does. Clips are built on first use and cache their frames.
 *
 * This module is heavy (lighting, RotSprite) and is loaded lazily by the stage.
 */

import type { Scene } from '../ToolMotionPreview';
import {
  filterPixelPerfect, getBresenhamLine, getEllipsePoints, getRectanglePoints,
} from '@/lib/canvas/rasterMath';
import { getIsometric2p1Line, getQuadraticBezierPoints } from '@/lib/ai/math/curvesAndLines';
import { performFloodFill, replaceLayerColor } from '@/lib/canvas/floodFill';
import { eraseMatchingColor } from '@/lib/canvas/eraseMatchingColor';
import { shouldDitherPixel } from '@/lib/canvas/ditherMatrix';
import { pixelGradient } from '@/lib/canvas/pixelGradient';
import { createBoxMask } from '@/lib/canvas/selectionUtils';
import { planLayerRotation } from '@/lib/canvas/rotSpriteLayer';
import { rotSprite } from '@/lib/canvas/rotSprite';
import { renderParametric2p5DLighting } from '@/lib/ai/math/photometricLighting';
import {
  computeSeparableEDT, generateInflatedHeightmap, computeTangentNormalField, bakeNormalMapToRgba,
} from '@/lib/ai/math/edtNormalMap';
import { applyAtkinsonDither, applyRiemersmaDither } from '@/lib/ai/math/dithering';
import { applyZhangSuenThinning } from '@/lib/ai/math/morphology';
import {
  applyAtmosphericColorGrade, cleanJaggiesOnCanvas, cleanStrayPixelsOnCanvas, generate47BlobEdgeData,
  generateGroundShadowData, generateSelOutDataSync, harmonizePaletteColors, morphInBetweenFrameAtFraction,
  quantizeToActivePalette,
} from '@/lib/ai/pixelAiEngine';
import { planSpriteCleanup } from '@/lib/ai/spriteCleanup';
import { generateOklchRamp } from '@/lib/color/rampGenerator';
import { lampFromPointer, snapLamp } from '@/lib/cart/relight';
import { BUN_INK, bunPixels } from '@/lib/art/bunSprite';
import {
  ART_H, ART_W, applyShaded, blank, changed, clone, drawBun, fillRect, floodOrder, hash, opaque,
  over, rasterContext, revealAt, revealOrder, rgb, runOn, setPixel, clearPixel, type Pt, type Raster,
} from './raster';
import {
  antsMask, antsPath, antsRect, bulb, chip, controlHandle, endHandle, frame as frameRect, guide, loupe, ring,
  scanLine, sparkle, swatches, veil, type Overlay,
} from './overlay';

export type Phase = 'before' | 'action' | 'result';

export interface Clip {
  /** drag: the pointer moves while pressed; click: one press; run: a panel button, no pointer. */
  kind: 'drag' | 'click' | 'run';
  /** Distinct frames across the action: frame(0) is the start, frame(steps) the result. */
  steps: number;
  frame(step: number): Raster;
  /** Pointer position, in art pixels, at action progress `a` (0..1). */
  pointer?(a: number): Pt;
  /** Brush ghost size in art pixels; 0 shows just the crosshair. */
  brush?: number;
  /** Short captions for the before, action and result moments. */
  labels: readonly [string, string, string];
  overlay?(o: Overlay, a: number, phase: Phase): void;
  /** Before the action, show this instead of frame 0 (time since the clip began). */
  intro?(time: number): Raster;
  /** While the result holds, show this instead of the last frame (a flipbook playing back). */
  loop?(time: number): Raster;
}

// ── Shared art ──────────────────────────────────────────────────────────────

const PINK = '#ff6b8b';
const LILAC = '#C792DF';
const PLUM = '#a86ec6';
const SKETCH = '#5fa8ff';
const CENTER: Pt = { x: 11, y: 12 };

/** Bun as the studio draws it, on the left of a 32×24 canvas. */
const bun = (pose: 'idle' | 'blink' | 'happy' = 'idle', ox = 2, oy = 4) => drawBun(blank(), ox, oy, pose);

const BUN_PALETTE = [...new Set([BUN_INK, ...bunPixels('idle').map((p) => p[4])])];

function memo(steps: number, make: (step: number) => Raster): (step: number) => Raster {
  const cache = new Map<number, Raster>();
  return (step) => {
    const k = Math.max(0, Math.min(steps, Math.round(step)));
    let hit = cache.get(k);
    if (!hit) { hit = make(k); cache.set(k, hit); }
    return hit;
  };
}

/** Constant pointer. */
const at = (p: Pt) => () => p;

/** Arc-length walk along a polyline. */
function along(points: readonly Pt[]): (a: number) => Pt {
  const lengths = [0];
  for (let i = 1; i < points.length; i++) {
    lengths.push(lengths[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y));
  }
  const total = lengths[lengths.length - 1] || 1;
  return (a) => {
    const d = Math.max(0, Math.min(1, a)) * total;
    let i = 1;
    while (i < lengths.length - 1 && lengths[i] < d) i++;
    const span = lengths[i] - lengths[i - 1] || 1;
    const f = (d - lengths[i - 1]) / span;
    return { x: points[i - 1].x + (points[i].x - points[i - 1].x) * f, y: points[i - 1].y + (points[i].y - points[i - 1].y) * f };
  };
}

const round = (p: Pt): Pt => ({ x: Math.round(p.x), y: Math.round(p.y) });

/** The pixels a dragged pointer passes over by step k, joined the way the brush handler does. */
function dragPoints(path: (a: number) => Pt, steps: number, k: number): Pt[] {
  const points: Pt[] = [round(path(0))];
  for (let j = 1; j <= k; j++) {
    const from = round(path((j - 1) / steps));
    const to = round(path(j / steps));
    points.push(...getBresenhamLine(from.x, from.y, to.x, to.y).slice(1));
  }
  return points;
}

/** The studio's brush stamp: a size×size square offset by floor(size / 2). */
function stamp(p: Pt, size: number, paint: (x: number, y: number) => void) {
  const offset = Math.floor(size / 2);
  for (let y = p.y - offset; y < p.y - offset + size; y++) {
    for (let x = p.x - offset; x < p.x - offset + size; x++) paint(x, y);
  }
}

function reveal(
  before: Raster, after: Raster, order: Float32Array,
  rest: Omit<Clip, 'steps' | 'frame'> & { steps?: number },
): Clip {
  const steps = rest.steps ?? 40;
  return {
    ...rest,
    steps,
    frame: memo(steps, (k) => (k === 0 ? before : k === steps ? after : revealAt(before, after, order, k / steps))),
  };
}

const sweepX = (x: number, y: number) => x + y * 0.15;
const scanOverlay = (o: Overlay, a: number, phase: Phase) => {
  if (phase === 'action') scanLine(o, a * ART_W * 1.02, ART_H);
};

function maskFrom(test: (x: number, y: number) => boolean): Uint8Array {
  const mask = new Uint8Array(ART_W * ART_H);
  for (let y = 0; y < ART_H; y++) for (let x = 0; x < ART_W; x++) if (test(x, y)) mask[y * ART_W + x] = 1;
  return mask;
}

function insidePolygon(points: readonly Pt[], x: number, y: number): boolean {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i];
    const b = points[j];
    if ((a.y > y) !== (b.y > y) && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

function lit(r: Raster, azimuthDeg: number, elevationDeg: number, shininess = 18): { shaded: Raster; specularOnly: Raster } {
  const { shadedPixels, specularPixels } = renderParametric2p5DLighting(
    ctxOf(r), r.width, r.height,
    { azimuthDeg, elevationDeg, shadowIntensity: 0.5, specularShininess: shininess },
  );
  return { shaded: applyShaded(r, [...shadedPixels, ...specularPixels]), specularOnly: applyShaded(r, specularPixels) };
}

/** A context over a throwaway copy, for engine functions that only read and return pixels. */
const ctxOf = (r: Raster) => rasterContext(clone(r));

/** Bun's normal map through the studio's EDT → inflated height → tangent normal pipeline. */
function normalMap(r: Raster): Raster {
  const isOpaque = (x: number, y: number) => opaque(r, x, y);
  const distance = computeSeparableEDT(isOpaque, r.width, r.height);
  const height = generateInflatedHeightmap(distance, r.width, r.height);
  const field = computeTangentNormalField(height, r.width, r.height);
  return { width: r.width, height: r.height, data: bakeNormalMapToRgba(field, r.width, r.height, isOpaque) };
}

/** A soft truecolor sky ramp, for tools that work on smooth color. */
function skyRamp(stops: readonly string[], vertical = false): Raster {
  const r = blank();
  const colors = stops.map(rgb);
  for (let y = 0; y < ART_H; y++) {
    for (let x = 0; x < ART_W; x++) {
      const t = vertical ? y / (ART_H - 1) : (x + y * 0.35) / (ART_W - 1 + ART_H * 0.35);
      const index = t * (colors.length - 1);
      const lo = Math.floor(index);
      const hi = Math.min(colors.length - 1, lo + 1);
      const f = index - lo;
      const i = (y * ART_W + x) * 4;
      for (let c = 0; c < 3; c++) r.data[i + c] = Math.round(colors[lo][c] + (colors[hi][c] - colors[lo][c]) * f);
      r.data[i + 3] = 255;
    }
  }
  return r;
}

/** A small carrot for RotSprite, outlined in Bun's ink, with room to turn on a 20px canvas. */
function carrot(): Raster {
  const r = blank(14, 14);
  const leaf = '#6cc070';
  const leafDark = '#3f8f4a';
  [[6, 0], [8, 0], [5, 1], [6, 1], [8, 1], [9, 1], [6, 2], [8, 2]].forEach(([x, y]) => setPixel(r, x, y, leaf));
  setPixel(r, 7, 1, leafDark); setPixel(r, 7, 2, leafDark);
  const rows: Array<[number, number, number]> = [[3, 5, 8], [4, 5, 8], [5, 5, 8], [6, 5, 8], [7, 6, 8], [8, 6, 8], [9, 6, 7], [10, 6, 7], [11, 6, 7], [12, 7, 7]];
  for (const [y, x0, x1] of rows) {
    for (let x = x0; x <= x1; x++) setPixel(r, x, y, x === x0 ? '#ffc070' : x === x1 ? '#d9661f' : '#ff9a3c');
  }
  setPixel(r, 6, 5, '#c4561a'); setPixel(r, 7, 8, '#c4561a'); setPixel(r, 6, 10, '#c4561a');
  // Ink ring
  const ring: Pt[] = [];
  for (let y = 0; y < 14; y++) for (let x = 0; x < 14; x++) {
    if (opaque(r, x, y)) continue;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => opaque(r, x + dx, y + dy))) ring.push({ x, y });
  }
  ring.forEach((p) => setPixel(r, p.x, p.y, BUN_INK));
  return place(blank(20, 20), r, 3, 3);
}

function place(base: Raster, top: Raster, ox: number, oy: number): Raster {
  const layer = blank(base.width, base.height);
  for (let y = 0; y < top.height; y++) for (let x = 0; x < top.width; x++) {
    const tx = x + ox;
    const ty = y + oy;
    if (tx < 0 || ty < 0 || tx >= base.width || ty >= base.height) continue;
    const i = (y * top.width + x) * 4;
    layer.data.set(top.data.subarray(i, i + 4), (ty * base.width + tx) * 4);
  }
  return over(base, layer);
}

/** An 8×8 grass tile that wraps cleanly on every edge. */
function grassTile(): Raster {
  const t = blank(8, 8);
  fillRect(t, 0, 0, 8, 8, '#7cc46a');
  [[1, 1], [5, 0], [3, 4], [7, 5], [0, 6], [4, 7]].forEach(([x, y]) => setPixel(t, x, y, '#5a9e52'));
  [[1, 0], [5, 7], [3, 3], [7, 4]].forEach(([x, y]) => setPixel(t, x, y, '#9fdb86'));
  setPixel(t, 6, 2, '#ffd285');
  setPixel(t, 2, 6, '#ffb6ba');
  return t;
}

function dirtTile(): Raster {
  const t = blank(8, 8);
  fillRect(t, 0, 0, 8, 8, '#c8955f');
  [[2, 1], [6, 3], [1, 5], [4, 6]].forEach(([x, y]) => setPixel(t, x, y, '#a8734a'));
  [[5, 1], [3, 4]].forEach(([x, y]) => setPixel(t, x, y, '#e2b47c'));
  return t;
}

function waterTile(): Raster {
  const t = blank(8, 8);
  fillRect(t, 0, 0, 8, 8, '#4f8fd6');
  [[1, 2], [2, 2], [5, 5], [6, 5]].forEach(([x, y]) => setPixel(t, x, y, '#8cc4f2'));
  [[4, 1], [1, 6]].forEach(([x, y]) => setPixel(t, x, y, '#3b6fb0'));
  return t;
}

// ── Drawing tools ───────────────────────────────────────────────────────────

/** A heart traced in one freehand loop, starting at the dip. */
const HEART: Pt[] = [
  { x: 25, y: 8 }, { x: 24, y: 7 }, { x: 23, y: 6 }, { x: 22, y: 6 }, { x: 21, y: 7 }, { x: 20, y: 8 }, { x: 20, y: 10 },
  { x: 21, y: 11 }, { x: 25, y: 15 }, { x: 29, y: 11 }, { x: 30, y: 10 }, { x: 30, y: 8 }, { x: 29, y: 7 }, { x: 28, y: 6 },
  { x: 27, y: 6 }, { x: 26, y: 7 }, { x: 25, y: 8 },
];

function penClip(): Clip {
  const base = bun();
  const path = along(HEART);
  const steps = 44;
  return {
    kind: 'drag', steps, brush: 1, pointer: path,
    labels: ['pen · 1px', 'drag to draw', 'pixel-perfect line'],
    frame: memo(steps, (k) => {
      const r = clone(base);
      if (k === 0) return r;
      // Pixel Perfect drops the doubled L-corners a freehand stroke leaves.
      for (const p of filterPixelPerfect(dragPoints(path, steps, k))) setPixel(r, p.x, p.y, PINK);
      return r;
    }),
  };
}

function curveClip(): Clip {
  const p0: Pt = { x: 20, y: 21 };
  const p2: Pt = { x: 31, y: 21 };
  const handle = (a: number): Pt => ({ x: 25.5 - a * 0.5, y: 21 - a * 20 });
  const base = bun();
  const steps = 32;
  return {
    kind: 'drag', steps, brush: 0, pointer: handle,
    labels: ['ends placed', 'drag the middle handle', 'smooth pixel arc'],
    frame: memo(steps, (k) => {
      const r = clone(base);
      for (const p of getQuadraticBezierPoints(p0, round(handle(k / steps)), p2)) setPixel(r, p.x, p.y, PLUM);
      return r;
    }),
    overlay(o, a, phase) {
      const h = round(handle(a));
      if (phase !== 'result') { guide(o, p0, h); guide(o, h, p2); }
      endHandle(o, p0);
      endHandle(o, p2);
      controlHandle(o, h, phase === 'action');
    },
  };
}

function eraserClip(): Clip {
  const base = bun();
  const path = along([{ x: 3, y: 9 }, { x: 7, y: 6 }, { x: 11, y: 8 }, { x: 15, y: 5 }, { x: 18, y: 7 }]);
  const steps = 36;
  return {
    kind: 'drag', steps, brush: 2, pointer: path,
    labels: ['eraser · 2px', 'drag to erase', 'pixels cleared'],
    frame: memo(steps, (k) => {
      const r = clone(base);
      for (const p of dragPoints(path, steps, k)) stamp(p, 2, (x, y) => clearPixel(r, x, y));
      return r;
    }),
  };
}

function eraseColorClip(): Clip {
  const r = blank();
  const sketch = (points: Pt[]) => points.forEach((p) => setPixel(r, p.x, p.y, SKETCH));
  sketch(getEllipsePoints(0, 1, 21, 23, false));
  sketch(getBresenhamLine(0, 13, 31, 11));
  sketch(getBresenhamLine(10, 0, 12, 23));
  sketch(getBresenhamLine(22, 4, 30, 20));
  sketch(getBresenhamLine(24, 3, 31, 16));
  const before = over(r, bun());
  const click: Pt = { x: 26, y: 12 };
  const after = clone(before);
  eraseMatchingColor(after, rgb(SKETCH), 24, { contiguous: false });
  return reveal(before, after, floodOrder(before, after, click), {
    kind: 'click', brush: 1, pointer: at(click),
    labels: ['sketch under ink', 'click the sketch blue', 'only blue erased'],
  });
}

function fillClip(): Clip {
  const outlineOnly = blank();
  const full = bun();
  // Bun's ink outline, eyes and cheeks with an empty body.
  for (let i = 0; i < full.data.length; i += 4) {
    const hex = `#${[0, 1, 2].map((c) => full.data[i + c].toString(16).padStart(2, '0')).join('')}`;
    if (full.data[i + 3] && (hex === BUN_INK.toLowerCase() || hex === '#f2b8c6')) outlineOnly.data.set(full.data.subarray(i, i + 4), i);
  }
  const click: Pt = { x: 9, y: 16 };
  const after = runOn(outlineOnly, (ctx) => performFloodFill(ctx, click.x, click.y, LILAC, true, 0));
  return reveal(outlineOnly, after, floodOrder(outlineOnly, after, click), {
    kind: 'click', brush: 1, pointer: at(click), steps: 36,
    labels: ['closed outline', 'click inside', 'connected area filled'],
  });
}

function gradientClip(): Clip {
  const start: Pt = { x: 25, y: 0 };
  const end = (a: number): Pt => ({ x: 25, y: a * 23 });
  const sprite = bun();
  const steps = 24;
  return {
    kind: 'drag', steps, brush: 0, pointer: end,
    labels: ['empty layer', 'drag a ramp', 'dithered palette ramp'],
    frame: memo(steps, (k) => {
      const to = round(end(k / steps));
      if (k === 0 || to.y === start.y) return sprite;
      const sky: Raster = {
        width: ART_W, height: ART_H,
        data: pixelGradient(ART_W, ART_H, start, to, {
          shape: 'linear', dither: true, colors: ['#2b2050', '#6a4a9c', '#e58fb5', '#ffd9a0'], selection: null, mask: null,
        }),
      };
      return over(sky, sprite);
    }),
    overlay(o, a, phase) {
      if (phase === 'action') { guide(o, start, round(end(a))); endHandle(o, start); }
    },
  };
}

function ditherClip(): Clip {
  const base = bun();
  // Scribble back and forth over Bun's right side; the 2×2 matrix decides which pixels land.
  const zigzag: Pt[] = [];
  for (let y = 10; y <= 18; y++) zigzag.push(y % 2 ? { x: 14, y } : { x: 11, y }, y % 2 ? { x: 11, y } : { x: 14, y });
  const path = along(zigzag);
  const steps = 48;
  return {
    kind: 'drag', steps, brush: 1, pointer: path,
    labels: ['dither · 2×2 Bayer', 'scribble to shade', 'checkerboard shading'],
    frame: memo(steps, (k) => {
      const r = clone(base);
      for (const p of dragPoints(path, steps, k)) if (shouldDitherPixel(p.x, p.y, '2x2', 0.5)) setPixel(r, p.x, p.y, LILAC);
      return r;
    }),
  };
}

function recolorClip(): Clip {
  const before = bun();
  const click: Pt = { x: 9, y: 12 };
  const after = clone(before);
  replaceLayerColor(after as unknown as ImageData, click.x, click.y, '#ffd99a', 0);
  return reveal(before, after, revealOrder(before, after, (x, y) => Math.hypot(x - click.x, y - click.y)), {
    kind: 'click', brush: 1, pointer: at(click), steps: 24,
    labels: ['click a color', 'swapping every match', 'fur recolored'],
  });
}

function boxSelectClip(): Clip {
  const sprite = bun();
  const from: Pt = { x: 1, y: 2 };
  const to = (a: number): Pt => ({ x: 1 + a * 19, y: 2 + a * 14 });
  const mask = createBoxMask({ x: 1, y: 2, w: 19, h: 14 }, ART_W, ART_H);
  return {
    kind: 'drag', steps: 1, brush: 0, pointer: to, frame: () => sprite,
    labels: ['marquee', 'drag a box', 'head selected'],
    overlay(o, a, phase) {
      if (phase === 'action') { const p = round(to(a)); antsRect(o, from.x, from.y, p.x, p.y); }
      if (phase === 'result') antsMask(o, mask, ART_W, ART_H);
    },
  };
}

function lassoClip(): Clip {
  const sprite = bun();
  const loop: Pt[] = [
    { x: 9.5, y: 8.5 }, { x: 5, y: 9 }, { x: 2.5, y: 12 }, { x: 3, y: 16.5 }, { x: 7, y: 18.5 }, { x: 12, y: 18.8 },
    { x: 16.5, y: 16.5 }, { x: 17.5, y: 12 }, { x: 15, y: 9 }, { x: 9.5, y: 8.5 },
  ];
  const path = along(loop);
  const mask = maskFrom((x, y) => insidePolygon(loop, x + 0.5, y + 0.5));
  return {
    kind: 'drag', steps: 1, brush: 0, pointer: path, frame: () => sprite,
    labels: ['lasso', 'trace freehand', 'freeform selection'],
    overlay(o, a, phase) {
      if (phase === 'action') {
        const trail: Pt[] = [];
        for (let i = 0; i <= 40; i++) trail.push(path((i / 40) * a));
        antsPath(o, trail);
      }
      if (phase === 'result') antsMask(o, mask, ART_W, ART_H);
    },
  };
}

function wandClip(): Clip {
  const sprite = bun();
  const click: Pt = { x: 9, y: 12 };
  // The wand's flood: 4-connected, exact color at tolerance 0, as useSelectionPointerHandler runs it.
  const dist = new Float32Array(ART_W * ART_H).fill(Infinity);
  const target = sprite.data.slice((click.y * ART_W + click.x) * 4, (click.y * ART_W + click.x) * 4 + 4);
  const same = (i: number) => [0, 1, 2, 3].every((c) => sprite.data[i * 4 + c] === target[c]);
  const queue = [click.y * ART_W + click.x];
  dist[queue[0]] = 0;
  let far = 0;
  for (let head = 0; head < queue.length; head++) {
    const i = queue[head];
    const x = i % ART_W;
    const y = Math.floor(i / ART_W);
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
      if (nx < 0 || ny < 0 || nx >= ART_W || ny >= ART_H) continue;
      const j = ny * ART_W + nx;
      if (dist[j] !== Infinity || !same(j)) continue;
      dist[j] = dist[i] + 1;
      far = Math.max(far, dist[j]);
      queue.push(j);
    }
  }
  return {
    kind: 'click', steps: 1, brush: 0, pointer: at(click), frame: () => sprite,
    labels: ['magic wand', 'click one color', 'connected fur only'],
    overlay(o, a, phase) {
      if (phase === 'before') return;
      const reach = phase === 'result' ? far : Math.min(1, a * 1.6) * far;
      antsMask(o, maskFrom((x, y) => dist[y * ART_W + x] <= reach), ART_W, ART_H);
    },
  };
}

function shapeClip(
  raster: (x0: number, y0: number, x1: number, y1: number) => Pt[],
  from: Pt, to: Pt, color: string, labels: Clip['labels'],
): Clip {
  const base = bun();
  const pointer = (a: number): Pt => ({ x: from.x + (to.x - from.x) * a, y: from.y + (to.y - from.y) * a });
  const steps = 28;
  return {
    kind: 'drag', steps, brush: 1, pointer, labels,
    frame: memo(steps, (k) => {
      const r = clone(base);
      if (k === 0) return r;
      const p = round(pointer(k / steps));
      for (const q of raster(from.x, from.y, p.x, p.y)) setPixel(r, q.x, q.y, color);
      return r;
    }),
  };
}

function chiselClip(): Clip {
  const before = bun();
  // A 2px chisel: height climbs over the first two pixels in from the edge, then plateaus,
  // and the studio's EDT and Sobel normal field turn it into a bevel the light can catch.
  const distance = computeSeparableEDT((x, y) => opaque(before, x, y), ART_W, ART_H);
  const height = distance.map((d) => Math.min(d, 2.5) / 2.5);
  const field = computeTangentNormalField(height, ART_W, ART_H, 3);
  const light = [-0.6, -0.6, 0.53].map((v, _, l) => v / Math.hypot(...l));
  const flat = light[2];
  const after = clone(before);
  for (let i = 0; i < ART_W * ART_H; i++) {
    if (!after.data[i * 4 + 3]) continue;
    const lambert = field.nx[i] * light[0] + field.ny[i] * light[1] + field.nz[i] * light[2];
    const lift = (lambert - flat) * 1.3;
    for (let c = 0; c < 3; c++) {
      const v = after.data[i * 4 + c];
      after.data[i * 4 + c] = lift > 0 ? v + (255 - v) * Math.min(1, lift) * (c === 2 ? 0.7 : 1) : v * (1 + Math.max(-0.55, lift));
    }
  }
  // Trace the rim clockwise from the left ear.
  const rim = along(Array.from({ length: 25 }, (_, i) => {
    const t = Math.PI * 0.95 + (i / 24) * Math.PI * 2;
    return { x: CENTER.x + Math.cos(t) * 8.2, y: CENTER.y + 0.5 + Math.sin(t) * 8.4 };
  }));
  const angle = (x: number, y: number) => {
    const t = Math.atan2(y - CENTER.y - 0.5, x - CENTER.x) - Math.PI * 0.95;
    return ((t % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  };
  return reveal(before, after, revealOrder(before, after, angle), {
    kind: 'drag', brush: 2, pointer: rim, steps: 40,
    labels: ['flat edges', 'carve along the rim', 'bevel catches light'],
  });
}

function eyedropperClip(): Clip {
  const sprite = bun();
  const target: Pt = { x: 6, y: 7 };
  const i = (target.y * ART_W + target.x) * 4;
  const picked = `rgb(${sprite.data[i]},${sprite.data[i + 1]},${sprite.data[i + 2]})`;
  return {
    kind: 'click', steps: 1, brush: 0, pointer: at(target), frame: () => sprite,
    labels: ['eyedropper', 'click a pixel', 'color picked'],
    overlay(o, a, phase) {
      const p = round(target);
      loupe(o, p, sprite, phase === 'before' ? '#ffffff' : picked);
      // The color wells, swapping to the sampled color.
      const well = phase === 'before' ? BUN_INK : picked;
      swatches(o, [LILAC], 1, { x: 27.6, y: 19.6 }, { size: 2.6 });
      swatches(o, [well], phase === 'before' ? 1 : Math.min(1, 0.2 + a * 3), { x: 26, y: 18 }, { size: 2.6 });
    },
  };
}

// ── Light & shading ─────────────────────────────────────────────────────────

function lightClip(): Clip {
  const sprite = bun();
  const radius = 11;
  const pointer = (a: number): Pt => {
    const t = Math.PI * (1.18 + a * 0.64);
    return { x: CENTER.x + Math.cos(t) * radius, y: CENTER.y + Math.sin(t) * radius * 0.85 };
  };
  const steps = 16;
  return {
    kind: 'drag', steps, brush: 0, pointer,
    labels: ['light on the left', 'drag the bulb', 'lit from the right'],
    frame: memo(steps, (k) => {
      const p = pointer(k / steps);
      // The player's own mapping: direction sets azimuth, distance sets how low the lamp hangs.
      const lamp = snapLamp(lampFromPointer(p.x - CENTER.x, p.y - CENTER.y, radius * 1.4));
      return lit(sprite, lamp.azimuth, lamp.elevation).shaded;
    }),
    overlay(o, a) {
      bulb(o, pointer(a), { x: CENTER.x + 0.5, y: CENTER.y + 1 });
    },
  };
}

function bakeLightClip(): Clip {
  const before = bun();
  const after = lit(before, 315, 40).shaded;
  return reveal(before, after, revealOrder(before, after, sweepX), {
    kind: 'run', labels: ['flat sprite', 'baking the light', 'shading in the pixels'], overlay: scanOverlay,
  });
}

function normalViewClip(): Clip {
  const before = bun();
  const after = normalMap(before);
  return reveal(before, after, revealOrder(before, after, (x, y) => x + y), {
    kind: 'run', labels: ['color view', 'showing normals', 'surface directions'],
  });
}

function bakeNormalClip(): Clip {
  const before = bun();
  const after = normalMap(before);
  return reveal(before, after, revealOrder(before, after, (x, y) => y * 40 + x), {
    kind: 'run', labels: ['sprite', 'baking normals', 'new normal layer'],
    overlay(o, a, phase) {
      if (phase === 'action') { o.ctx.save(); o.ctx.fillStyle = 'rgba(122,215,240,0.9)'; o.ctx.fillRect(0, a * 18 + 3, ART_W, o.px * 2); o.ctx.restore(); }
      if (phase === 'result') chip(o, '+ normal layer', { x: 25.5, y: 21 }, 'mint');
    },
  });
}

function glintClip(): Clip {
  const before = bun();
  const after = lit(before, 315, 50, 40).specularOnly;
  const order = revealOrder(before, after, (x, y) => hash(x, y, 7));
  const glints: Pt[] = [];
  for (let i = 0; i < order.length; i++) if (order[i] !== Infinity) glints.push({ x: i % ART_W, y: Math.floor(i / ART_W) });
  const clip = reveal(before, after, order, { kind: 'run', labels: ['matte sprite', 'casting glints', 'specular highlights'] });
  clip.overlay = (o, a, phase) => {
    if (phase === 'before') return;
    glints.slice(0, 6).forEach((p, i) => sparkle(o, p, phase === 'result' ? ((o.time / 900 + i * 0.37) % 1) : a * 1.4 - i * 0.08));
  };
  return clip;
}

function selOutClip(): Clip {
  const before = bun();
  const after = applyShaded(before, generateSelOutDataSync(before, 315).selOutPixels);
  const angle = (x: number, y: number) => (Math.atan2(y - CENTER.y, x - CENTER.x) + Math.PI * 2.5) % (Math.PI * 2);
  return reveal(before, after, revealOrder(before, after, angle), {
    kind: 'run', labels: ['flat ink outline', 'tinting each edge', 'light-aware outline'],
  });
}

function shadowClip(): Clip {
  const sprite = bun('idle', 2, 2);
  const { shadowPixels } = generateGroundShadowData(ctxOf(sprite), ART_W, ART_H);
  const after = over(applyShaded(blank(), shadowPixels), sprite);
  return reveal(sprite, after, revealOrder(sprite, after, (x, y) => Math.abs(x - 10.5) + Math.abs(y - 20) * 2), {
    kind: 'run', labels: ['floating sprite', 'casting on the floor', 'grounded'],
  });
}

// ── Tiles ───────────────────────────────────────────────────────────────────

function repeatClip(): Clip {
  const tile = grassTile();
  let all = blank();
  for (let ty = 0; ty < 3; ty++) for (let tx = 0; tx < 4; tx++) all = place(all, tile, tx * 8, ty * 8);
  const before = place(blank(), tile, 8, 8);
  const after = all;
  const order = revealOrder(before, after, (x, y) => Math.hypot(Math.floor(x / 8) - 1, Math.floor(y / 8) - 1) + hash(Math.floor(x / 8), Math.floor(y / 8)) * 0.2);
  return reveal(before, after, order, {
    kind: 'run', steps: 12, labels: ['one tile', 'repeating', 'check the seams'],
    overlay(o, _a, phase) {
      frameRect(o, 8, 8, 8, 8);
      if (phase === 'result') {
        o.ctx.save();
        o.ctx.strokeStyle = 'rgba(255,255,255,0.45)';
        o.ctx.lineWidth = o.px;
        o.ctx.setLineDash([2 * o.px, 2 * o.px]);
        o.ctx.beginPath();
        for (let x = 8; x < ART_W; x += 8) { o.ctx.moveTo(x, 0); o.ctx.lineTo(x, ART_H); }
        for (let y = 8; y < ART_H; y += 8) { o.ctx.moveTo(0, y); o.ctx.lineTo(ART_W, y); }
        o.ctx.stroke();
        o.ctx.restore();
      }
    },
  });
}

function sliceClip(): Clip {
  const kinds = [grassTile(), dirtTile(), waterTile()];
  const layout = [[0, 0, 1, 0], [2, 0, 0, 1], [0, 1, 2, 0]];
  let map = blank();
  layout.forEach((row, ty) => row.forEach((kind, tx) => { map = place(map, kinds[kind], tx * 8, ty * 8); }));
  // Dedupe exactly like a slicer: a tile is new only if no earlier tile has identical pixels.
  const tiles: Array<{ x: number; y: number; first: number }> = [];
  const keys: string[] = [];
  layout.forEach((row, ty) => row.forEach((_, tx) => {
    let key = '';
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const i = ((ty * 8 + y) * ART_W + tx * 8 + x) * 4;
      key += map.data.slice(i, i + 4).join(',') + ';';
    }
    let first = keys.indexOf(key);
    if (first < 0) { keys.push(key); first = keys.length - 1; tiles.push({ x: tx * 8, y: ty * 8, first: -1 }); }
    else tiles.push({ x: tx * 8, y: ty * 8, first });
  }));
  const unique = keys.length;
  return {
    kind: 'run', steps: 1, frame: () => map,
    labels: ['tilemap', 'slicing 8×8', `${unique} unique tiles`],
    overlay(o, a, phase) {
      if (phase === 'before') return;
      const shown = phase === 'result' ? tiles.length : Math.floor(a * tiles.length);
      o.ctx.save();
      o.ctx.strokeStyle = 'rgba(20,13,31,0.6)';
      o.ctx.lineWidth = o.px;
      o.ctx.beginPath();
      for (let x = 8; x < ART_W; x += 8) { o.ctx.moveTo(x, 0); o.ctx.lineTo(x, ART_H); }
      for (let y = 8; y < ART_H; y += 8) { o.ctx.moveTo(0, y); o.ctx.lineTo(ART_W, y); }
      o.ctx.stroke();
      o.ctx.restore();
      let n = 0;
      tiles.slice(0, shown).forEach((t) => {
        if (t.first >= 0) veil(o, t.x, t.y, 8, 8, 0.6);
        else { n += 1; frameRect(o, t.x + 0.5, t.y + 0.5, 7, 7); chip(o, String(n), { x: t.x + 4, y: t.y + 4 }, 'gold'); }
      });
    },
  };
}

function blobClip(): Clip {
  const island = blank();
  for (let y = 0; y < ART_H; y++) for (let x = 0; x < ART_W; x++) {
    const d = Math.hypot((x - 13) / 10, (y - 12) / 8);
    const lobe = Math.hypot((x - 23) / 6, (y - 8) / 5);
    if (d < 1 || lobe < 1) setPixel(island, x, y, '#7cc46a');
  }
  const after = applyShaded(island, generate47BlobEdgeData(ctxOf(island), ART_W, ART_H).blobPixels);
  return reveal(island, after, revealOrder(island, after, (x, y) => (Math.atan2(y - 12, x - 15) + Math.PI * 2.5) % (Math.PI * 2)), {
    kind: 'run', labels: ['flat island', 'reading 47 neighbors', 'contours shaded'],
  });
}

// ── Polish & clean ──────────────────────────────────────────────────────────

/** Bun as an import might arrive: faint fringe pixels and loose specks. */
function noisyBun(): Raster {
  const r = bun();
  const specks: Pt[] = [{ x: 22, y: 4 }, { x: 27, y: 9 }, { x: 24, y: 17 }, { x: 30, y: 21 }, { x: 20, y: 12 }, { x: 0, y: 1 }];
  // Scanner dust: cleanup only lifts neutral specks, never colored detail.
  specks.forEach((p, i) => setPixel(r, p.x, p.y, ['#6f6a75', '#9a96a0', '#4a4650'][i % 3]));
  // Faint halo pixels hugging the silhouette
  for (let y = 0; y < ART_H; y++) for (let x = 0; x < ART_W; x++) {
    if (opaque(r, x, y) || hash(x, y, 3) > 0.12) continue;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => opaque(r, x + dx, y + dy) && x + dx < 19)) setPixel(r, x, y, BUN_INK, 50);
  }
  return r;
}

const CLEANUP = { alphaCutoff: 96, maxSpeckPixels: 2, paletteSize: 16, simplifyColors: false, thinDarkLines: false };

function scanClip(): Clip {
  const before = noisyBun();
  const after: Raster = { width: ART_W, height: ART_H, data: planSpriteCleanup(before, CLEANUP).data };
  const issues: Pt[] = [];
  for (let i = 0; i < ART_W * ART_H; i++) if (changed(before, after, i)) issues.push({ x: i % ART_W, y: Math.floor(i / ART_W) });
  return {
    kind: 'run', steps: 1, frame: () => before,
    labels: ['imported sprite', 'scanning', `${issues.length} issues marked`],
    overlay(o, a, phase) {
      if (phase === 'before') return;
      const reach = phase === 'result' ? ART_W + 1 : a * ART_W * 1.02;
      issues.forEach((p) => {
        if (p.x > reach) return;
        o.ctx.save();
        o.ctx.strokeStyle = '#ffd285';
        o.ctx.lineWidth = 1.25 * o.px;
        o.ctx.beginPath();
        o.ctx.arc(p.x + 0.5, p.y + 0.5, 0.95, 0, Math.PI * 2);
        o.ctx.stroke();
        o.ctx.restore();
      });
      if (phase === 'action') scanLine(o, reach, ART_H);
    },
  };
}

function applyCleanupClip(): Clip {
  const before = noisyBun();
  const after: Raster = { width: ART_W, height: ART_H, data: planSpriteCleanup(before, CLEANUP).data };
  return reveal(before, after, revealOrder(before, after, sweepX), {
    kind: 'run', labels: ['noisy import', 'applying cleanup', 'crisp sprite'], overlay: scanOverlay,
  });
}

/** A 4-connected arc: every diagonal step leaves an L-corner, the classic jaggy stroke. */
function jaggyArc(): Raster {
  const r = blank();
  const points: Pt[] = [];
  for (let i = 0; i <= 30; i++) {
    const t = Math.PI * (0.52 + (i / 30) * 0.46);
    points.push({ x: Math.round(32 + Math.cos(t) * 12), y: Math.round(2 + Math.sin(t) * 18) });
  }
  let prev = points[0];
  setPixel(r, prev.x, prev.y, PLUM);
  for (const p of points.slice(1)) {
    for (const q of getBresenhamLine(prev.x, prev.y, p.x, p.y).slice(1)) {
      if (q.x !== prev.x && q.y !== prev.y) setPixel(r, q.x, prev.y, PLUM);
      setPixel(r, q.x, q.y, PLUM);
      prev = q;
    }
  }
  return r;
}

function jaggiesClip(): Clip {
  const stroke = jaggyArc();
  const before = over(stroke, bun());
  const after = over(runOn(stroke, (ctx, w, h) => cleanJaggiesOnCanvas(ctx, w, h)), bun());
  return reveal(before, after, revealOrder(before, after, (x, y) => y * 2 - x), {
    kind: 'run', labels: ['stair-step corners', 'smoothing', 'even pixel steps'],
  });
}

function thinClip(): Clip {
  const stroke = blank();
  const path = along([{ x: 20, y: 20 }, { x: 22, y: 12 }, { x: 26, y: 6 }, { x: 30, y: 3 }]);
  for (const p of dragPoints(path, 30, 30)) stamp(p, 3, (x, y) => setPixel(stroke, x, y, PINK));
  const before = over(stroke, bun());
  const after = over(runOn(stroke, (ctx, w, h) => applyZhangSuenThinning(ctx, w, h)), bun());
  return reveal(before, after, revealOrder(before, after, sweepX), {
    kind: 'run', labels: ['3px stroke', 'thinning', 'clean 1px line'], overlay: scanOverlay,
  });
}

function straysClip(): Clip {
  const before = bun();
  const strays: Pt[] = [{ x: 22, y: 3 }, { x: 28, y: 7 }, { x: 25, y: 13 }, { x: 30, y: 18 }, { x: 21, y: 21 }, { x: 0, y: 0 }, { x: 27, y: 22 }];
  strays.forEach((p, i) => setPixel(before, p.x, p.y, i % 2 ? PINK : PLUM));
  const after = runOn(before, (ctx, w, h) => cleanStrayPixelsOnCanvas(ctx, w, h));
  const order = revealOrder(before, after, (x) => x);
  const gone: Array<Pt & { at: number }> = [];
  for (let i = 0; i < order.length; i++) if (order[i] !== Infinity) gone.push({ x: i % ART_W, y: Math.floor(i / ART_W), at: order[i] });
  const clip = reveal(before, after, order, { kind: 'run', labels: ['loose dots', 'checking neighbors', `${gone.length} strays erased`] });
  clip.overlay = (o, a, phase) => {
    if (phase !== 'action') return;
    gone.forEach((p) => ring(o, p, (a - p.at) * 4, '#ffd285', 6));
  };
  return clip;
}

function rotateClip(): Clip {
  const source = carrot();
  const sprite = bun();
  const angles = [0, 7.5, 15, 22.5, 30, 37.5, 45];
  const steps = angles.length - 1;
  return {
    kind: 'run', steps,
    labels: ['0°', 'rotating', 'crisp 45° turn'],
    frame: memo(steps, (k) => {
      const angle = (angles[k] * Math.PI) / 180;
      let turned = source;
      if (k > 0) {
        const { plan } = planLayerRotation(source, angle);
        if (plan) {
          const out = rotSprite(plan.source, angle, plan.sourcePivotX, plan.sourcePivotY, plan.targetWidth, plan.targetHeight, plan.outputPivotX, plan.outputPivotY, true);
          turned = place(blank(20, 20), out, plan.destX, plan.destY);
        }
      }
      return place(sprite, turned, 14, 2);
    }),
    overlay(o, a, phase) {
      const deg = phase === 'before' ? 0 : Math.round(angles[Math.round(a * steps)]);
      chip(o, `${deg}°`, { x: 25, y: 21.5 }, phase === 'result' ? 'mint' : 'ink');
    },
  };
}

// ── Shading & palette ───────────────────────────────────────────────────────

const SKY = ['#2b2050', '#6a4a9c', '#e58fb5', '#ffd9a0'];

function errorDitherClip(kind: 'atkinson' | 'smooth'): Clip {
  const smooth = skyRamp(['#241a46', '#7a4fa8', '#f08fb0', '#ffe2a6']);
  const dithered = runOn(smooth, (ctx, w, h) => (kind === 'atkinson' ? applyAtkinsonDither : applyRiemersmaDither)(ctx, w, h, SKY));
  const before = over(smooth, bun());
  const after = over(dithered, bun());
  return reveal(before, after, revealOrder(before, after, sweepX), {
    kind: 'run', overlay: scanOverlay,
    labels: kind === 'atkinson' ? ['smooth ramp', 'Atkinson diffusion', '4 colors, crisp grain'] : ['smooth ramp', 'Hilbert-path diffusion', '4 colors, soft grain'],
  });
}

function snapClip(): Clip {
  const before = bun();
  for (let i = 0; i < before.data.length; i += 4) {
    if (!before.data[i + 3]) continue;
    const p = i / 4;
    const n = (hash(p % ART_W, Math.floor(p / ART_W), 11) - 0.5) * 46;
    before.data[i] += n; before.data[i + 1] += n * 0.6; before.data[i + 2] -= n * 0.8;
  }
  const after = runOn(before, (ctx, w, h) => quantizeToActivePalette(ctx, w, h, BUN_PALETTE));
  const clip = reveal(before, after, revealOrder(before, after, sweepX), {
    kind: 'run', labels: ['off-palette noise', 'matching swatches', 'on-palette pixels'],
  });
  clip.overlay = (o, a, phase) => {
    scanOverlay(o, a, phase);
    swatches(o, BUN_PALETTE, BUN_PALETTE.length, { x: 22, y: 6 }, { size: 2.6, columns: 3, gap: 0.6 });
  };
  return clip;
}

function harmonizeClip(): Clip {
  const sprite = bun();
  const existing = BUN_PALETTE.map((c) => c.toUpperCase());
  const added = harmonizePaletteColors(existing);
  const all = [...existing, ...added];
  return {
    kind: 'run', steps: 1, frame: () => sprite,
    labels: [`${existing.length} swatches`, 'finding accents', `+${added.length} harmonies`],
    overlay(o, a, phase) {
      const shown = phase === 'before' ? existing.length : phase === 'result' ? all.length : existing.length + a * added.length;
      swatches(o, all, shown, { x: 20.2, y: 2 }, { size: 2.4, columns: 4, gap: 0.6 });
    },
  };
}

function rampClip(): Clip {
  const sprite = bun();
  const ramp = generateOklchRamp(PINK);
  return {
    kind: 'run', steps: 1, frame: () => sprite,
    labels: ['one base color', 'stepping in OKLCH', `${ramp.length}-step ramp`],
    overlay(o, a, phase) {
      const shown = phase === 'before' ? 0 : phase === 'result' ? ramp.length : a * ramp.length;
      swatches(o, [PINK], 1, { x: 24.5, y: 2 }, { size: 3, highlight: 0 });
      swatches(o, ramp, shown, { x: 24.5, y: 6.5 }, { size: 3, columns: 1, gap: 0.4 });
    },
  };
}

function moodClip(grade: 'sunset' | 'moonlight' | 'neon'): Clip {
  // A little scene of sprites on transparency, the way a grade is normally applied.
  const ground = blank();
  fillRect(ground, 0, 21, ART_W, 3, '#7cc46a');
  fillRect(ground, 0, 21, ART_W, 1, '#9fdb86');
  [[1, 20], [17, 20], [29, 20]].forEach(([x, y]) => { setPixel(ground, x, y, '#ffb6ba'); setPixel(ground, x, y + 1, '#5a9e52'); });
  const before = place(over(ground, bun()), carrot(), 14, 2);
  const after = runOn(before, (ctx, w, h) => applyAtmosphericColorGrade(ctx, w, h, grade));
  return reveal(before, after, revealOrder(before, after, sweepX), {
    kind: 'run', overlay: scanOverlay,
    labels: ['daylight', `grading ${grade}`, `${grade} mood`],
  });
}

function inBetweenClip(): Clip {
  // A 2px bob between adjacent keyframes. The morph blends colors, so it stays crisp
  // for small moves like this and turns muddy on big jumps; the clip shows its sweet spot.
  const a = bun('idle', 8, 5);
  const b = bun('idle', 8, 3);
  const tint = (r: Raster, hex: string, alpha: number) => {
    const out = blank();
    const [cr, cg, cb] = rgb(hex);
    for (let i = 0; i < r.data.length; i += 4) {
      if (!r.data[i + 3]) continue;
      out.data[i] = cr; out.data[i + 1] = cg; out.data[i + 2] = cb; out.data[i + 3] = alpha;
    }
    return out;
  };
  // The action makes one frame, halfway, exactly as the panel button does.
  const middle = morphInBetweenFrameAtFraction(a, b, 0.5);
  // Onion skin in the studio's default previous/next tints.
  const ghosts = over(tint(a, '#C792DF', 80), tint(b, '#DCABDF', 80));
  const developed = over(ghosts, middle);
  const order = revealOrder(ghosts, developed, (x, y) => hash(x, y, 5));
  // Then the three frames play back as a flipbook: 1, ½, 2, ½.
  const sequence = [a, middle, b, middle];
  const FLIP_MS = 170;
  const playing = (time: number) => Math.floor(time / FLIP_MS) % sequence.length;
  // Before: the two keyframes alone, flipping with a visible jump.
  const keyframe = (time: number) => Math.floor(time / FLIP_MS) % 2;
  return {
    kind: 'run', steps: 16,
    labels: ['two keyframes: 1 · 2', 'generating frame ½', 'played back: 1 · ½ · 2'],
    frame: memo(16, (k) => (k === 0 ? ghosts : revealAt(ghosts, developed, order, k / 16))),
    intro: (time) => (keyframe(time) ? b : a),
    loop: (time) => sequence[playing(time)],
    overlay(o, _a, phase) {
      const now = phase === 'result' ? [0, 1, 2, 1][playing(o.time)] : phase === 'before' ? keyframe(o.time) * 2 : -1;
      ['1', '½', '2'].forEach((label, i) => {
        if (i === 1 && phase === 'before') return;
        const tone = now === i ? 'mint' : i === 1 && phase === 'action' ? 'gold' : 'ink';
        chip(o, label, { x: 25.2 + i * 2.6, y: 2 }, tone);
      });
    },
  };
}

// ── Registry ────────────────────────────────────────────────────────────────

const BUILDERS: Record<Scene, () => Clip> = {
  stroke: penClip,
  curve: curveClip,
  erase: eraserClip,
  'erase-color': eraseColorClip,
  fill: fillClip,
  gradient: gradientClip,
  dither: ditherClip,
  recolor: recolorClip,
  'select-box': boxSelectClip,
  'select-lasso': lassoClip,
  'select-wand': wandClip,
  line: () => shapeClip((x0, y0, x1, y1) => getBresenhamLine(x0, y0, x1, y1), { x: 20, y: 21 }, { x: 31, y: 3 }, PINK, ['line', 'drag the line', 'one straight run']),
  iso: () => shapeClip(getIsometric2p1Line, { x: 20, y: 19 }, { x: 31, y: 12 }, PLUM, ['2:1 iso line', 'drag any angle', 'clean 2:1 steps']),
  rectangle: () => shapeClip((x0, y0, x1, y1) => getRectanglePoints(x0, y0, x1, y1, false), { x: 20, y: 5 }, { x: 31, y: 19 }, '#3fa37a', ['rectangle', 'drag corner to corner', 'crisp box']),
  ellipse: () => shapeClip((x0, y0, x1, y1) => getEllipsePoints(x0, y0, x1, y1, false), { x: 20, y: 5 }, { x: 31, y: 20 }, '#4f8fd6', ['ellipse', 'drag the bounds', 'pixel ellipse']),
  depth: chiselClip,
  eyedropper: eyedropperClip,
  light: lightClip,
  'bake-light': bakeLightClip,
  shadow: shadowClip,
  glow: glintClip,
  clean: scanClip,
  'apply-cleanup': applyCleanupClip,
  rotate: rotateClip,
  palette: snapClip,
  animate: inBetweenClip,
  tiles: sliceClip,
  autotile: blobClip,
  'sel-out': selOutClip,
  jaggies: jaggiesClip,
  thin: thinClip,
  strays: straysClip,
  'normal-map': normalViewClip,
  'bake-normal': bakeNormalClip,
  seamless: repeatClip,
  'dither-atkinson': () => errorDitherClip('atkinson'),
  'dither-smooth': () => errorDitherClip('smooth'),
  'palette-snap': snapClip,
  'palette-harmonize': harmonizeClip,
  'palette-ramp': rampClip,
  'mood-sunset': () => moodClip('sunset'),
  'mood-moonlight': () => moodClip('moonlight'),
  'mood-neon': () => moodClip('neon'),
};

const built = new Map<Scene, Clip>();

export function clipFor(scene: Scene): Clip {
  let clip = built.get(scene);
  if (!clip) { clip = BUILDERS[scene](); built.set(scene, clip); }
  return clip;
}

export const CLIP_SCENES = Object.keys(BUILDERS) as Scene[];
