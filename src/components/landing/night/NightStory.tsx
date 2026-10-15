'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from 'motion/react';
import { STARTER_TEMPLATES, TEMPLATE_PALETTE } from '@/lib/art/starterTemplates';
import { BAYER_4X4 } from '@/lib/canvas/ditherMatrix';
import { useThemePalette } from '@/lib/theme/useThemePalette';
import type { ThemePalette } from '@/lib/theme/registry';
import { CottageBackdrop } from './CottageBackdrop';
import { ambientTicker, tickWhileVisible, type AmbientTicker } from '../ambientClock';
import { litColor, SHADOW_OFFSET, storyAzimuth, storyShadow, warmStoryLighting } from './storyLighting';

/**
 * The tour: one continuous little film, scrubbed by scrolling. It opens zoomed
 * all the way into a single pixel, pulls back while Bun inks herself,
 * dims the room for the lamp, fans out into animation frames and finally
 * packs the frames into a sprite sheet. Nothing cuts or fades between
 * chapters: every stage of the drawing is a function of the scroll position.
 */

const CHAPTERS = [
  {
    kicker: '01 · sketch',
    title: 'Start with a single pixel.',
    body: 'Pick a colour and tap the grid. Pencil, lines, fills, smooth curves and mirror symmetry are there when you want them, and quiet when you don’t.',
    accent: 'var(--primary-bg)',
  },
  {
    kicker: '02 · light',
    title: 'Then give it a lamp.',
    body: 'Move a little light around your sprite and watch the shading follow, with real lighting and cast shadows painted right onto the pixels, using colors from your own palette.',
    accent: 'var(--accent-gold)',
  },
  {
    kicker: '03 · move',
    title: 'Make it breathe.',
    body: 'Flip through a few frames with onion skin to guide your hand. Tiny loops are the best loops.',
    accent: 'var(--accent-plum)',
  },
  {
    kicker: '04 · take it home',
    title: 'Take it home.',
    body: 'Export a PNG, a sprite sheet, a GIF or APNG, or a Godot kit for your game. Everything stays on your device, and nobody asks you to sign up.',
    accent: 'var(--accent-sage)',
  },
];

/** Stage resolution in canvas pixels; CSS scales it up crisply. */
const W = 192;
const H = 144;
/** Canvas pixels per art pixel once the camera has pulled back. */
const REST = 5;
/** Canvas pixels per art pixel at the very start: one pixel fills the stage. */
const CLOSE = 156;
/** Where the sprite's center sits on the stage. */
const CX = 96;
const CY = 66;
const BOB = [0, -1, -2, -1];

/** Bun is the tour's model: she inks herself, takes the lamp and learns to hop. */
const GHOST = STARTER_TEMPLATES.find((t) => t.id === 'bun')!;
type Px = { x: number; y: number; c: string; key: string };
const PIXELS: Px[] = [];
GHOST.rows.forEach((row, y) => {
  for (let x = 0; x < row.length; x++) {
    const c = TEMPLATE_PALETTE[row[x]];
    if (c) PIXELS.push({ x, y, c, key: row[x] });
  }
});
/** Outline first, traced around the body, then the fill top to bottom: the way people ink. */
const INK_ORDER = [...PIXELS].sort((a, b) => {
  const ao = a.key === 'o' ? 0 : 1;
  const bo = b.key === 'o' ? 0 : 1;
  if (ao !== bo) return ao - bo;
  if (ao === 0) return Math.atan2(a.y - 7, a.x - 7.5) - Math.atan2(b.y - 7, b.x - 7.5);
  return a.y - b.y || a.x - b.x;
});
const FIRST = INK_ORDER[0];

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (x: number) => {
  const v = clamp01(x);
  return v * v * (3 - 2 * v);
};
const easeOut = (p: number) => 1 - Math.pow(1 - clamp01(p), 3);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** 0 → 1 over [a, b] of a chapter's local progress. */
const span = (v: number, a: number, b: number) => smooth((v - a) / (b - a));

function rgb(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
/** Blends are memoized in 1/32 steps: the film reuses a few hundred colors every frame. */
const mixes = new Map<string, string>();
function mix(a: string, b: string, t: number) {
  const step = Math.round(clamp01(t) * 32);
  const key = `${a}|${b}|${step}`;
  const hit = mixes.get(key);
  if (hit) return hit;
  const A = rgb(a);
  const B = rgb(b);
  const out = `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * (step / 32))).join(',')})`;
  if (mixes.size > 4096) mixes.clear();
  mixes.set(key, out);
  return out;
}

export function storyChapter(progress: number): number {
  return Math.min(3, Math.floor(clamp01(progress) * 4));
}

/** The chapter the words rest on: they hold still while you read, then glide to the next one. */
export function restingChapter(progress: number): number {
  const f = clamp01(progress) * 4;
  const i = Math.min(3, Math.floor(f));
  return Math.min(3, i + smooth((f - i - 0.74) / 0.26));
}

/** Everything the stage shows, as a pure function of scroll progress. */
interface Shot {
  /** Canvas pixels per art pixel, and the art point the camera centers on. */
  s: number;
  fx: number;
  fy: number;
  inked: number;
  paper: number;
  grid: number;
  pencil: number;
  swatches: number;
  dark: number;
  lit: number;
  lampAngle: number;
  spread: number;
  onion: number;
  play: number;
  timeline: number;
  sheet: number;
  parcels: number;
}

export function storyShot(progress: number, t: number): Shot {
  const f = clamp01(progress) * 4;
  const c0 = clamp01(f);
  const c1 = clamp01(f - 1);
  const c2 = clamp01(f - 2);
  const c3 = clamp01(f - 3);
  const zoom = span(c0, 0.02, 0.4);
  const s = CLOSE * Math.pow(REST / CLOSE, zoom);
  const inked = 1 + (INK_ORDER.length - 1) * span(c0, 0.12, 0.9);
  const lit = span(c1, 0.08, 0.32) * (1 - span(c2, 0, 0.3));
  return {
    s,
    fx: lerp(FIRST.x + 0.5, 8, zoom),
    fy: lerp(FIRST.y + 0.5, 8, zoom),
    inked,
    paper: 1 - span(c1, 0, 0.3) * 0.55 - span(c3, 0, 0.4) * 0.3,
    grid: clamp01((s - 12) / 36),
    pencil: (1 - span(c0, 0.86, 0.98)) * span(c0, 0.06, 0.14),
    swatches: span(c0, 0.3, 0.45) * (1 - span(c1, 0, 0.2)),
    dark: 0.55 * span(c1, 0, 0.22) * (1 - span(c2, 0, 0.3)),
    lit,
    lampAngle: -Math.PI * 0.95 + c1 * Math.PI * 1.9 + Math.sin(t / 1500) * 0.05,
    spread: span(c2, 0.04, 0.32) * (1 - span(c2, 0.5, 0.74)),
    onion: span(c2, 0.55, 0.75) * (1 - span(c3, 0, 0.2)),
    play: span(c2, 0.5, 0.65),
    timeline: span(c2, 0.36, 0.56) * (1 - span(c3, 0.1, 0.3)),
    sheet: easeOut((c3 - 0.06) / 0.44),
    parcels: c3,
  };
}

interface SpriteOpts {
  inked?: number;
  alpha?: number;
  tint?: string;
  lit?: number;
  /** Light azimuth in degrees for the real lighting engine. */
  azimuth?: number;
  bob?: number;
}

/** Draws Bun with her art center (8, 8) at (cx, cy), `s` canvas pixels per art pixel. */
function drawSprite(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, palette: ThemePalette, opts: SpriteOpts = {}) {
  const { inked = INK_ORDER.length, alpha = 1, tint, lit = 0, azimuth, bob = 0 } = opts;
  const count = Math.min(INK_ORDER.length, Math.ceil(inked));
  for (let i = 0; i < count; i++) {
    const px = INK_ORDER[i];
    // The newest pixel lands with a little pop.
    const pop = clamp01(inked - i);
    const grow = pop < 1 ? 1 + (1 - easeOut(pop)) * 0.7 : 1;
    let color = tint ? (px.key === 'o' ? tint : mix(px.c, tint, 0.55)) : px.c;
    // The Studio's own 2.5D lighting, cached per 15° (see storyLighting.ts).
    const shaded = lit > 0 && azimuth !== undefined ? litColor(azimuth, px.x, px.y) : null;
    if (shaded) color = lit >= 1 ? shaded : mix(rgbHex(color), rgbHex(shaded), lit);
    const size = s * grow;
    const x0 = Math.round(cx + (px.x - 8) * s + (s - size) / 2);
    const y0 = Math.round(cy + (px.y - 8 + bob) * s + (s - size) / 2);
    const x1 = Math.round(cx + (px.x - 8) * s + (s + size) / 2);
    const y1 = Math.round(cy + (px.y - 8 + bob) * s + (s + size) / 2);
    ctx.globalAlpha = alpha * (pop < 1 ? Math.max(0.35, pop) : 1);
    ctx.fillStyle = color;
    ctx.fillRect(x0, y0, Math.max(1, x1 - x0), Math.max(1, y1 - y0));
  }
  ctx.globalAlpha = 1;
}

/** `mix()` returns rgb(); blending again needs hex. */
function rgbHex(color: string): string {
  if (color.startsWith('#')) return color;
  const [r, g, b] = color.slice(4, -1).split(',').map(Number);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

/** Dithered discs are drawn once per size and color, then stamped: the lamp's glow moves every frame. */
const discs = new Map<string, HTMLCanvasElement>();
function ditherDisc(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, color: string, strength: number) {
  const key = `${rx}|${ry}|${color}|${strength}`;
  let disc = discs.get(key);
  if (!disc) {
    const w = Math.ceil(rx) * 2 + 1, h = Math.ceil(ry) * 2 + 1;
    disc = document.createElement('canvas');
    disc.width = w; disc.height = h;
    const g = disc.getContext('2d')!;
    g.fillStyle = color;
    for (let dy = -Math.ceil(ry); dy <= ry; dy++) {
      for (let dx = -Math.ceil(rx); dx <= rx; dx++) {
        const d = Math.hypot(dx / rx, dy / ry);
        if (d > 1) continue;
        const level = (1 - d) * strength;
        const bayer = (BAYER_4X4[dy & 3][dx & 3] + 0.5) / 16;
        if (level <= bayer) continue;
        g.fillRect(dx + Math.ceil(rx), dy + Math.ceil(ry), 1, 1);
      }
    }
    if (discs.size > 64) discs.clear();
    discs.set(key, disc);
  }
  // Stamp on a 4-pixel grid so the 4×4 dither pattern stays put as the disc moves.
  ctx.drawImage(disc, Math.round(x - Math.ceil(rx)) & ~3, Math.round(y - Math.ceil(ry)) & ~3);
}

function render(ctx: CanvasRenderingContext2D, shot: Shot, t: number, palette: ThemePalette) {
  const { s } = shot;
  ctx.globalAlpha = 1;
  ctx.fillStyle = palette.sunken;
  ctx.fillRect(0, 0, W, H);

  // The sprite's own canvas: a chequered sheet with a margin, panned and zoomed by the camera.
  const cx = CX + (8 - shot.fx) * s;
  const cy = CY + (8 - shot.fy) * s;
  const toX = (ax: number) => Math.round(cx + (ax - 8) * s);
  const toY = (ay: number) => Math.round(cy + (ay - 8) * s);
  const left = Math.max(-2, Math.floor(8 + (0 - cx) / s));
  const right = Math.min(18, Math.ceil(8 + (W - cx) / s));
  const top = Math.max(-2, Math.floor(8 + (0 - cy) / s));
  const bottom = Math.min(18, Math.ceil(8 + (H - cy) / s));
  ctx.globalAlpha = shot.paper;
  for (let ay = top; ay < bottom; ay++) {
    for (let ax = left; ax < right; ax++) {
      ctx.fillStyle = (ax + ay) & 1 ? palette.surface : palette.raised;
      ctx.fillRect(toX(ax), toY(ay), toX(ax + 1) - toX(ax), toY(ay + 1) - toY(ay));
    }
  }
  ctx.globalAlpha = 1;
  if (shot.grid > 0) {
    ctx.globalAlpha = shot.grid * 0.6;
    ctx.fillStyle = palette.border;
    for (let ax = left; ax <= right; ax++) ctx.fillRect(toX(ax), 0, 1, H);
    for (let ay = top; ay <= bottom; ay++) ctx.fillRect(0, toY(ay), W, 1);
    ctx.globalAlpha = 1;
  }

  // The room dims for the lamp.
  if (shot.dark > 0) {
    ctx.globalAlpha = shot.dark;
    ctx.fillStyle = palette.ink;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  }

  const lampX = CX + Math.cos(shot.lampAngle) * 72;
  const lampY = CY + Math.sin(shot.lampAngle) * 46;
  const azimuth = storyAzimuth(shot.lampAngle);
  // Load and warm the real lighting as the sketch finishes, before the lamp comes on.
  if (shot.inked >= INK_ORDER.length * 0.6 || shot.dark > 0) warmStoryLighting(PIXELS);
  if (shot.lit > 0) {
    // A pool of lamplight on the paper, so the cast shadow has something to fall on.
    ctx.globalAlpha = shot.lit * 0.22;
    ditherDisc(ctx, lerp(cx, lampX, 0.35), lerp(cy, lampY, 0.35) + 10, 74, 56, palette.primary, 0.9);
    ctx.globalAlpha = shot.lit * 0.5;
    ditherDisc(ctx, lampX, lampY, 26, 26, palette.primary, 1);
    // The real ray-marched cast shadow, thrown away from the lamp.
    const shadow = storyShadow(azimuth, palette.ink);
    if (shadow) {
      ctx.globalAlpha = shot.lit;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(shadow, Math.round(cx - (8 + SHADOW_OFFSET.x) * s), Math.round(cy - (8 + SHADOW_OFFSET.y) * s), Math.round(SHADOW_OFFSET.size * s), Math.round(SHADOW_OFFSET.size * s));
    }
    ctx.globalAlpha = 1;
  }

  // Frames: one Bun while sketching and lighting; four when it learns to move.
  const frame = shot.play > 0 ? Math.floor(t / 170) % 4 : 0;
  if (shot.sheet > 0) {
    // Into a sprite sheet along the top, then little parcels drop onto the shelf.
    const k = shot.sheet;
    ctx.globalAlpha = k;
    ctx.fillStyle = palette.primaryFg;
    ctx.fillRect(0, 8, W, 52);
    ctx.globalAlpha = 1;
    for (let i = 0; i < 4; i++) {
      const x = lerp(CX, 24 + i * 48, k);
      const y = lerp(CY, 34, k);
      const sc = lerp(REST, 2.6, k);
      drawSprite(ctx, x, y, sc, palette, { bob: BOB[i] * k });
      if (k > 0.92) {
        ctx.fillStyle = palette.primary;
        ctx.fillRect(i * 48, 8, 1, 52);
      }
    }
    const shelf = H - 12;
    ctx.fillStyle = palette.frame;
    ctx.fillRect(14, shelf, W - 28, 3);
    [palette.accent, palette.accent3, palette.positive].forEach((c, i) => {
      const p = easeOut((shot.parcels - 0.45 - i * 0.1) / 0.3);
      if (p <= 0) return;
      const x = 46 + i * 40;
      const y = Math.round(lerp(60, shelf - 18, p));
      ctx.fillStyle = palette.border;
      ctx.fillRect(x - 2, y - 2, 30, 22);
      ctx.fillStyle = c;
      ctx.fillRect(x, y, 26, 18);
      ctx.fillStyle = palette.primaryShine;
      ctx.fillRect(x + 11, y, 4, 18);
      ctx.fillRect(x, y + 7, 26, 3);
    });
  } else if (shot.spread > 0.001) {
    // Bun fans out into four frames like cards on the desk, then gathers back up.
    const k = shot.spread;
    const sc = lerp(REST, 2.7, k);
    for (let i = 0; i < 4; i++) {
      const x = CX + (i - 1.5) * 46 * k;
      const y = CY - 4 * k;
      if (k > 0.15) {
        ctx.globalAlpha = k;
        ctx.fillStyle = palette.border;
        ctx.fillRect(Math.round(x - 25), Math.round(y - 27), 50, 56);
        ctx.fillStyle = palette.raised;
        ctx.fillRect(Math.round(x - 23), Math.round(y - 25), 46, 52);
        ctx.fillStyle = i === 0 ? palette.primary : palette.muted;
        for (let d = 0; d <= i; d++) ctx.fillRect(Math.round(x - 20 + d * 4), Math.round(y + 21), 2, 2);
        ctx.globalAlpha = 1;
      }
      drawSprite(ctx, x, y, sc, palette, { bob: BOB[i] * k, alpha: i === 0 ? 1 : k });
    }
  } else {
    if (shot.onion > 0) {
      drawSprite(ctx, cx, cy, s, palette, { bob: BOB[(frame + 3) % 4], alpha: 0.22 * shot.onion, tint: palette.accent2 });
      drawSprite(ctx, cx, cy, s, palette, { bob: BOB[(frame + 1) % 4], alpha: 0.16 * shot.onion, tint: palette.positive });
    }
    drawSprite(ctx, cx, cy, s, palette, { inked: shot.inked, lit: shot.lit, azimuth, bob: BOB[frame] * shot.play });
  }

  // The lamp itself.
  if (shot.lit > 0) {
    ctx.globalAlpha = shot.lit;
    ctx.fillStyle = palette.ink;
    ctx.fillRect(Math.round(lampX) - 4, Math.round(lampY) - 4, 9, 9);
    ctx.fillStyle = palette.primaryShine;
    ctx.fillRect(Math.round(lampX) - 3, Math.round(lampY) - 3, 7, 7);
    ctx.fillStyle = palette.primary;
    ctx.fillRect(Math.round(lampX) - 1, Math.round(lampY) - 7, 3, 3);
    ctx.fillRect(Math.round(lampX) - 1, Math.round(lampY) + 5, 3, 3);
    ctx.fillRect(Math.round(lampX) - 7, Math.round(lampY) - 1, 3, 3);
    ctx.fillRect(Math.round(lampX) + 5, Math.round(lampY) - 1, 3, 3);
    ctx.globalAlpha = 1;
  }

  // The pencil rides the newest pixel, at a constant size whatever the zoom.
  if (shot.pencil > 0) {
    const tip = INK_ORDER[Math.max(0, Math.ceil(shot.inked) - 1)];
    const x = Math.round(cx + (tip.x - 8 + 1) * s);
    const y = Math.round(cy + (tip.y - 8) * s) - Math.round((1 - shot.pencil) * 12);
    ctx.globalAlpha = shot.pencil;
    ctx.fillStyle = palette.ink;
    for (let k = 0; k < 9; k++) ctx.fillRect(x + k * 2 - 1, y - k * 2 - 3, 5, 5);
    ctx.fillStyle = palette.accent;
    for (let k = 1; k < 7; k++) ctx.fillRect(x + k * 2, y - k * 2 - 2, 3, 3);
    ctx.fillStyle = palette.accent2;
    ctx.fillRect(x + 14, y - 17, 4, 4);
    ctx.fillStyle = palette.primaryShine;
    ctx.fillRect(x, y - 2, 2, 2);
    ctx.globalAlpha = 1;
  }

  // The palette strip, its active colour following the pencil.
  if (shot.swatches > 0) {
    const tip = INK_ORDER[Math.max(0, Math.ceil(shot.inked) - 1)];
    const swatches = [...new Set(PIXELS.map((p) => p.c))].slice(0, 6);
    const x0 = Math.round(CX - swatches.length * 8);
    const y0 = H - 16 + Math.round((1 - shot.swatches) * 18);
    ctx.globalAlpha = shot.swatches;
    ctx.fillStyle = palette.border;
    ctx.fillRect(x0 - 3, y0 - 3, swatches.length * 16 + 4, 16);
    swatches.forEach((c, i) => {
      ctx.fillStyle = tip.c === c ? palette.primary : palette.sunken;
      ctx.fillRect(x0 + i * 16 - 1, y0 - 1, 14, 12);
      ctx.fillStyle = c;
      ctx.fillRect(x0 + i * 16 + 1, y0 + 1, 10, 8);
    });
    ctx.globalAlpha = 1;
  }

  // The timeline slides up while Bun breathes.
  if (shot.timeline > 0) {
    const y0 = H - Math.round(shot.timeline * 26);
    ctx.fillStyle = palette.border;
    ctx.fillRect(40, y0, 112, 26);
    for (let i = 0; i < 4; i++) {
      const x = 44 + i * 27;
      ctx.fillStyle = i === frame && shot.play > 0 ? palette.primary : palette.sunken;
      ctx.fillRect(x, y0 + 3, 24, 20);
      drawSprite(ctx, x + 12, y0 + 12 + BOB[i], 1, palette);
    }
  }
}

function statusFor(progress: number, shot: Shot, t: number): string {
  const chapter = storyChapter(progress);
  if (chapter === 0) {
    const n = Math.max(1, Math.floor(shot.inked));
    return n === 1 ? 'zoom 3200% · 1 px' : `${n}/${INK_ORDER.length} px`;
  }
  if (chapter === 1) return `☀ lamp ${Math.round((((shot.lampAngle * 180) / Math.PI) % 360 + 360) % 360)}°`;
  if (chapter === 2) return shot.play > 0 ? `▶ frame ${(Math.floor(t / 170) % 4) + 1}/4` : '4 frames';
  return shot.parcels > 0.85 ? 'saved ✓' : `exporting ${Math.round(clamp01(shot.parcels / 0.85) * 100)}%`;
}

const EXPORTS = ['sheet.png', 'loop.gif', 'godot kit'];

/** A line of words that rests while you read it and glides when the next chapter arrives. */
const StoryLine: React.FC<{ index: number; resting: MotionValue<number>; slot: MotionValue<number>; children: React.ReactNode }> = ({
  index,
  resting,
  slot,
  children,
}) => {
  const distance = useTransform(resting, (v) => index - v);
  const away = useTransform(distance, (d) => Math.min(1, Math.abs(d)));
  const y = useTransform([distance, slot], ([d, s]: number[]) => d * s);
  const scale = useTransform(away, (a) => 1 - a * 0.06);
  const opacity = useTransform(away, (a) => 1 - a * 0.88);
  const filter = useTransform(away, (a) => `blur(${a * 3}px)`);
  return (
    <motion.div className="absolute inset-x-0 top-1/2 -translate-y-1/2 origin-left will-change-transform" style={{ y, scale, opacity, filter }}>
      {children}
    </motion.div>
  );
};

/** The thread down the side: one knot per chapter, filling as you go. Click a knot to jump there. */
const StoryThread: React.FC<{ progress: MotionValue<number>; chapter: number; onPick: (i: number) => void }> = ({ progress, chapter, onPick }) => {
  const fill = useTransform(progress, (v) => `${clamp01(v / 0.875) * 100}%`);
  return (
    <div className="relative flex flex-col justify-between h-full py-1" aria-hidden="true">
      <span className="absolute left-1/2 -translate-x-1/2 top-2 bottom-2 w-[2px] bg-[var(--desk-border)]" />
      <motion.span className="absolute left-1/2 -translate-x-1/2 top-2 w-[2px] bg-[var(--accent-gold)] origin-top" style={{ height: fill }} />
      {CHAPTERS.map((c, i) => (
        <button
          key={c.kicker}
          type="button"
          tabIndex={-1}
          onClick={() => onPick(i)}
          className="relative z-10 grid place-items-center w-6 h-6 cursor-pointer group"
          title={c.title}
        >
          <motion.span
            className="block border-2 border-[var(--ink)]"
            animate={{
              width: i === chapter ? 14 : 10,
              height: i === chapter ? 14 : 10,
              rotate: i === chapter ? 45 : 0,
              backgroundColor: i <= chapter ? c.accent : 'var(--desk-surface)',
            }}
            transition={{ type: 'spring', stiffness: 380, damping: 22 }}
          />
        </button>
      ))}
    </div>
  );
};

export const NightStory: React.FC = () => {
  const palette = useThemePalette();
  const reduceMotion = Boolean(useReducedMotion());
  const ref = useRef<HTMLElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const statusRef = useRef<HTMLSpanElement | null>(null);
  const [chapter, setChapter] = useState(0);
  const [exportsShown, setExportsShown] = useState(false);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  // A light spring on top of scrolling keeps the film gliding through keyboard and scrollbar jumps.
  const springy = useSpring(scrollYProgress, { stiffness: 150, damping: 30, mass: 0.6, restDelta: 0.0002 });
  const progress = reduceMotion ? scrollYProgress : springy;
  const resting = useTransform(progress, restingChapter);
  const pixelHint = useTransform(progress, [0, 0.03], [1, 0]);
  // One chapter's step on the reel: a little less than the reel is tall, so neighbours peek in.
  const reelRef = useRef<HTMLDivElement | null>(null);
  const slot = useMotionValue(288);
  useEffect(() => {
    const reel = reelRef.current;
    if (!reel || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => slot.set(reel.clientHeight * 0.95));
    ro.observe(reel);
    return () => ro.disconnect();
  }, [slot]);

  const tickerRef = useRef<AmbientTicker | null>(null);
  useMotionValueEvent(progress, 'change', (v) => {
    // Scrubbing redraws at full rate; the film rests at a calm pace in between.
    tickerRef.current?.boost(400);
    const next = storyChapter(v);
    setChapter((c) => (c === next ? c : next));
    setExportsShown(clamp01(v) * 4 > 3.82);
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const section = ref.current;
    if (!canvas || !ctx || !section) return;
    let lastStatus = '';
    const paint = (t: number) => {
      const p = progress.get();
      const shot = storyShot(p, t);
      render(ctx, shot, t, palette);
      const status = statusFor(p, shot, t);
      if (status !== lastStatus && statusRef.current) {
        statusRef.current.textContent = status;
        lastStatus = status;
      }
    };
    paint(0);
    // Reduced motion still follows the scroll, with time held still.
    const ticker = ambientTicker(now => paint(reduceMotion ? 0 : now), 24);
    tickerRef.current = ticker;
    const stop = tickWhileVisible(section, ticker);
    return () => { stop(); tickerRef.current = null; };
  }, [reduceMotion, progress, palette]);

  const pick = (i: number) => {
    const section = ref.current;
    if (!section) return;
    const travel = section.offsetHeight - window.innerHeight;
    window.scrollTo({ top: section.offsetTop + travel * ((i + 0.62) / 4), behavior: reduceMotion ? 'auto' : 'smooth' });
  };

  const active = CHAPTERS[chapter];

  return (
    <section
      id="a-night-at-the-desk"
      ref={ref}
      aria-labelledby="night-story-title"
      className="relative scroll-mt-0 bg-[var(--desk-bg)]"
      style={{ height: '420svh' }}
    >
      <h2 id="night-story-title" className="sr-only">
        A night at the Desk
      </h2>
      <ol className="sr-only">
        {CHAPTERS.map((c) => (
          <li key={c.kicker}>
            <h3>{c.title}</h3>
            <p>{c.body}</p>
          </li>
        ))}
      </ol>

      <div className="sticky top-16 h-[calc(100svh-4rem)] flex items-center overflow-hidden" aria-hidden="true">
        <CottageBackdrop chapter={chapter} reduceMotion={reduceMotion} />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 55% 60% at 30% 50%, color-mix(in srgb, var(--primary-bg) 12%, transparent), transparent 70%), linear-gradient(to bottom, color-mix(in srgb, var(--desk-bg) 55%, transparent), transparent 18%)' }}
        />
        <div className="relative max-w-7xl w-full mx-auto px-6 sm:px-8 grid lg:grid-cols-[1.15fr_1fr] gap-6 lg:gap-14 items-center">
          {/* Stage */}
          <div className="relative mx-auto w-full max-w-[min(460px,44svh)] lg:max-w-[540px]">
            <motion.div
              className="absolute -inset-8 rounded-full blur-3xl opacity-40 pointer-events-none"
              animate={{ backgroundColor: active.accent }}
              transition={{ duration: 0.9 }}
            />
            <div className="relative p-3 bg-[var(--surface-0)] border-2 border-[var(--desk-border)] shadow-[0_8px_0_var(--ink)] rounded-[2px]">
              <div className="flex items-center gap-1.5 pb-2 px-1">
                <span className="w-2 h-2 bg-[var(--accent-plum)]" />
                <span className="w-2 h-2 bg-[var(--primary-bg)]" />
                <span className="w-2 h-2 bg-[var(--accent-sage)]" />
                <span className="ml-2 font-mono text-[10px] text-[var(--text-muted)]">bun.pixi</span>
                <span ref={statusRef} className="ml-auto font-mono text-[10px] text-[var(--accent-gold)] tabular-nums">
                  zoom 3200% · 1 px
                </span>
              </div>
              <div className="relative">
                <canvas
                  ref={canvasRef}
                  width={W}
                  height={H}
                  className="block w-full h-auto"
                  style={{ imageRendering: 'pixelated', aspectRatio: `${W} / ${H}` }}
                />
                <motion.span
                  className="absolute left-1/2 top-[18%] -translate-x-1/2 px-2 py-1 bg-[var(--primary-bg)] text-[var(--primary-fg)] font-mono text-[11px] font-bold border-2 border-[var(--ink)] shadow-[0_3px_0_var(--ink)] whitespace-nowrap"
                  style={{ opacity: pixelHint }}
                >
                  this is one pixel ✦
                </motion.span>
              </div>
              <AnimatePresence>
                {exportsShown && (
                  <motion.div className="absolute left-0 right-0 -bottom-5 flex justify-center gap-2">
                    {EXPORTS.map((label, i) => (
                      <motion.span
                        key={label}
                        initial={{ y: 12, opacity: 0, rotate: -6 }}
                        animate={{ y: 0, opacity: 1, rotate: i === 1 ? 2 : -2 }}
                        exit={{ y: 8, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 420, damping: 18, delay: i * 0.08 }}
                        className="px-2 py-1 bg-[var(--primary-bg)] text-[var(--primary-fg)] font-mono text-[11px] font-bold border-2 border-[var(--ink)] shadow-[0_3px_0_var(--ink)]"
                      >
                        {label}
                      </motion.span>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Words: a reel that rests on each chapter and glides to the next */}
          <div className="relative grid grid-cols-[24px_1fr] gap-5 lg:pr-24 xl:pr-28">
            <div className="h-[15rem] sm:h-[17rem] lg:h-[19rem]">
              <StoryThread progress={progress} chapter={chapter} onPick={pick} />
            </div>
            <div ref={reelRef} className="story-reel relative h-[15rem] sm:h-[17rem] lg:h-[19rem]">
              {CHAPTERS.map((c, i) => (
                <StoryLine key={c.kicker} index={i} resting={resting} slot={slot}>
                  <p className="font-mono text-xs uppercase tracking-[0.2em]" style={{ color: c.accent }}>
                    {c.kicker}
                  </p>
                  <p className="mt-3 font-display text-2xl sm:text-3xl lg:text-4xl leading-[1.05] text-[var(--text-heading)] [text-shadow:0_3px_0_var(--ink)]">
                    {c.title}
                  </p>
                  <p className="mt-4 max-w-md text-sm sm:text-base leading-relaxed text-[var(--text-body)]">{c.body}</p>
                </StoryLine>
              ))}
            </div>
            <p className="col-start-2 font-mono text-[11px] text-[var(--text-muted)]">
              {chapter < 3 ? (
                <span className="inline-flex items-center gap-2">
                  keep scrolling <span className="story-nudge inline-block">↓</span>
                </span>
              ) : (
                'ready when you are ✦'
              )}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
