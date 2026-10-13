'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll, useSpring } from 'motion/react';
import { STARTER_TEMPLATES, TEMPLATE_PALETTE } from '@/lib/art/starterTemplates';
import { CottageBackdrop } from './CottageBackdrop';
import { NIGHT_VARS } from './nightPalette';

const CHAPTERS = [
  {
    kicker: '01 · sketch',
    title: 'Start with a single pixel.',
    body: 'Pick a colour and tap the grid. Pencil, lines, fills, smooth curves and mirror symmetry are there when you want them, and quiet when you don’t.',
    accent: '#ffd285',
  },
  {
    kicker: '02 · light',
    title: 'Then give it a lamp.',
    body: 'Move a little light around your sprite and watch the shading follow, with real 2.5D lighting and cast shadows painted right onto the pixels.',
    accent: '#f0be7c',
  },
  {
    kicker: '03 · move',
    title: 'Make it breathe.',
    body: 'Flip through a few frames with onion skin to guide your hand. Tiny loops are the best loops.',
    accent: '#dcabdf',
  },
  {
    kicker: '04 · take it home',
    title: 'Take it home.',
    body: 'Export a PNG, a sprite sheet, a GIF or APNG, or a Godot kit for your game. Everything stays on your device, and nobody asks you to sign up.',
    accent: '#a8e092',
  },
];

const W = 64;
const H = 48;
const GX = 24;
const GY = 12;
const BOB = [0, -1, -2, -1];

const GHOST = STARTER_TEMPLATES.find((t) => t.id === 'hearth-ghost')!;
type Px = { x: number; y: number; c: string; key: string };
const PIXELS: Px[] = [];
GHOST.rows.forEach((row, y) => {
  for (let x = 0; x < row.length; x++) {
    const c = TEMPLATE_PALETTE[row[x]];
    if (c) PIXELS.push({ x, y, c, key: row[x] });
  }
});
const INK_ORDER = [...PIXELS].sort((a, b) => {
  const ao = a.key === 'o' ? 0 : 1;
  const bo = b.key === 'o' ? 0 : 1;
  if (ao !== bo) return ao - bo;
  if (ao === 0) return Math.atan2(a.y - 7, a.x - 7.5) - Math.atan2(b.y - 7, b.x - 7.5);
  return a.y - b.y || a.x - b.x;
});

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const ease = (p: number) => 1 - Math.pow(1 - p, 3);

function rgb(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mix(a: string, b: string, t: number) {
  const A = rgb(a);
  const B = rgb(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`;
}

function drawBackdrop(ctx: CanvasRenderingContext2D) {
  for (let y = 0; y < H; y += 4) {
    for (let x = 0; x < W; x += 4) {
      ctx.fillStyle = ((x + y) / 4) % 2 ? '#221a35' : '#1c152d';
      ctx.fillRect(x, y, 4, 4);
    }
  }
}

function drawGhost(ctx: CanvasRenderingContext2D, ox: number, oy: number, alpha = 1, tint?: string) {
  ctx.globalAlpha = alpha;
  for (const p of PIXELS) {
    ctx.fillStyle = tint ? (p.key === 'o' ? tint : mix(p.c, tint, 0.55)) : p.c;
    ctx.fillRect(ox + p.x, oy + p.y, 1, 1);
  }
  ctx.globalAlpha = 1;
}

/** Draws one chapter at progress `cp` (0..1) onto a transparent canvas. `t` is wall time for idle loops. */
function renderChapter(ctx: CanvasRenderingContext2D, chapter: number, cp: number, t: number) {
  ctx.clearRect(0, 0, W, H);

  if (chapter === 0) {
    // A little sheet of paper with a dot grid, then pixels inked one by one, pencil riding the newest one.
    ctx.fillStyle = '#0f0a1a';
    ctx.fillRect(GX - 1, GY, 20, 19);
    ctx.fillStyle = '#f6ead6';
    ctx.fillRect(GX - 2, GY - 2, 20, 20);
    ctx.fillStyle = '#e2cfb2';
    for (let y = 0; y < 16; y += 2) {
      for (let x = 0; x < 16; x += 2) ctx.fillRect(GX + x, GY + y, 1, 1);
    }
    const inked = clamp01(cp * 1.3) * INK_ORDER.length;
    const n = Math.ceil(inked);
    for (let i = 0; i < n; i++) {
      const px = INK_ORDER[i];
      // The newest few pixels fade in so the pencil glides instead of ticking.
      ctx.globalAlpha = clamp01(inked - i + 0.15);
      ctx.fillStyle = px.c;
      ctx.fillRect(GX + px.x, GY + px.y, 1, 1);
    }
    ctx.globalAlpha = 1;
    const tip = INK_ORDER[Math.max(0, n - 1)];
    if (inked < INK_ORDER.length - 0.5) {
      const x = GX + tip.x + 1;
      const y = GY + tip.y - 1;
      // Little pixel pencil
      ctx.fillStyle = '#3a2e4c';
      for (let k = 0; k < 6; k++) ctx.fillRect(x + k, y - k, 2, 2);
      ctx.fillStyle = '#f0be7c';
      for (let k = 1; k < 5; k++) ctx.fillRect(x + k, y - k, 1, 1);
      ctx.fillStyle = '#e08ca6';
      ctx.fillRect(x + 6, y - 6, 2, 2);
      ctx.fillStyle = '#fff3c4';
      ctx.fillRect(x, y, 1, 1);
    }
    // Palette strip
    ['#3a2e4c', '#ede8f4', '#ffffff', '#f0be7c', '#e08ca6', '#cdbfdf'].forEach((c, i) => {
      const active = tip && tip.c === c;
      ctx.fillStyle = active ? '#ffd285' : '#3a2e4c';
      ctx.fillRect(14 + i * 6, H - 7, 6, 5);
      ctx.fillStyle = c;
      ctx.fillRect(15 + i * 6, H - 6, 4, 3);
    });
    return;
  }

  if (chapter === 1) {
    // Lamp orbits; every pixel is shaded by a fake normal facing out of the sprite.
    const angle = -Math.PI * 0.9 + cp * Math.PI * 1.8 + Math.sin(t / 900) * 0.05;
    const lx = Math.cos(angle);
    const ly = Math.sin(angle) * 0.7 - 0.3;
    const lz = 0.55;
    const len = Math.hypot(lx, ly, lz);
    const ground = GY + 17;
    // Cast shadow away from the lamp
    const sx = Math.round(GX + 8 - lx * 7);
    for (let dx = -7; dx <= 7; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if ((dx * dx) / 49 + (dy * dy) / 2.2 > 1) continue;
        if ((dx + dy) & 1) continue;
        ctx.fillStyle = '#0f0a1a';
        ctx.fillRect(sx + dx, ground + dy, 1, 1);
      }
    }
    for (const px of PIXELS) {
      if (px.key === 'o') {
        ctx.fillStyle = px.c;
      } else {
        const nx = (px.x - 7.5) / 8;
        const ny = (px.y - 7) / 8;
        const nz = Math.sqrt(Math.max(0.05, 1 - nx * nx - ny * ny));
        const d = (nx * lx + ny * ly + nz * lz) / len;
        const light = clamp01(d);
        ctx.fillStyle = light > 0.82 ? mix(px.c, '#fff3c4', 0.6) : mix(px.c, '#3a2350', (1 - light) * 0.75);
      }
      ctx.fillRect(GX + px.x, GY + px.y, 1, 1);
    }
    // The lamp itself, with a dithered halo
    const lampX = Math.round(GX + 8 + Math.cos(angle) * 20);
    const lampY = Math.round(GY + 8 + Math.sin(angle) * 14);
    for (let dy = -5; dy <= 5; dy++) {
      for (let dx = -5; dx <= 5; dx++) {
        const dd = Math.hypot(dx, dy);
        if (dd > 5 || (dx + dy) & 1) continue;
        ctx.fillStyle = `rgba(255, 210, 133, ${0.35 * (1 - dd / 5)})`;
        ctx.fillRect(lampX + dx, lampY + dy, 1, 1);
      }
    }
    ctx.fillStyle = '#fff3c4';
    ctx.fillRect(lampX - 1, lampY - 1, 3, 3);
    ctx.fillStyle = '#ffd285';
    ctx.fillRect(lampX, lampY - 2, 1, 1);
    ctx.fillRect(lampX, lampY + 2, 1, 1);
    ctx.fillRect(lampX - 2, lampY, 1, 1);
    ctx.fillRect(lampX + 2, lampY, 1, 1);
    return;
  }

  if (chapter === 2) {
    const frame = Math.floor(t / 170) % 4;
    const prev = (frame + 3) % 4;
    const next = (frame + 1) % 4;
    drawGhost(ctx, GX, GY + BOB[prev] + 1, 0.3, '#c792df');
    drawGhost(ctx, GX, GY + BOB[next] + 1, 0.22, '#7fae6b');
    drawGhost(ctx, GX, GY + BOB[frame] + 1);
    if (frame % 2 === 0) {
      ctx.fillStyle = '#fff3c4';
      ctx.fillRect(GX + 8, GY + BOB[frame] + 10, 1, 1);
    }
    // Timeline strip
    for (let i = 0; i < 4; i++) {
      const x = 15 + i * 9;
      ctx.fillStyle = i === frame ? '#ffd285' : '#3a2e4c';
      ctx.fillRect(x, H - 9, 8, 7);
      ctx.fillStyle = i === frame ? '#2a1945' : '#251c38';
      ctx.fillRect(x + 1, H - 8, 6, 5);
      ctx.fillStyle = '#ede8f4';
      ctx.fillRect(x + 3, H - 7 + (BOB[i] < -1 ? 0 : 1), 2, 2);
    }
    return;
  }

  // Chapter 3: four frames glide out into a sprite sheet.
  const k = ease(clamp01(cp * 1.4));
  const sheetY = 6;
  ctx.fillStyle = '#2a1945';
  ctx.globalAlpha = k;
  ctx.fillRect(0, sheetY - 1, W, 18);
  ctx.globalAlpha = 1;
  for (let i = 0; i < 4; i++) {
    const x = Math.round(GX + (i * 16 - GX) * k);
    const y = Math.round(GY + (sheetY - GY) * k);
    drawGhost(ctx, x, y + BOB[i] + 1);
    if (k > 0.95) {
      ctx.fillStyle = 'rgba(255, 210, 133, 0.5)';
      ctx.fillRect(i * 16, sheetY - 1, 1, 18);
    }
  }
  // Little parcels flying to the shelf
  const shelf = H - 8;
  ctx.fillStyle = '#5b3a2a';
  ctx.fillRect(6, shelf + 5, W - 12, 2);
  ['#f0be7c', '#dcabdf', '#a8e092'].forEach((c, i) => {
    const pp = ease(clamp01(cp * 1.6 - 0.35 - i * 0.12));
    if (pp <= 0) return;
    const x = Math.round(16 + i * 14);
    const y = Math.round(sheetY + 16 + (shelf - sheetY - 16) * pp);
    ctx.fillStyle = '#3a2e4c';
    ctx.fillRect(x - 1, y - 1, 9, 7);
    ctx.fillStyle = c;
    ctx.fillRect(x, y, 7, 5);
    ctx.fillStyle = '#fff3c4';
    ctx.fillRect(x + 3, y, 1, 5);
  });
}

const BLEND = 0.06; // portion of a chapter spent cross-fading into the next

function makeLayer() {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  return c;
}

/** Composites the stage at overall progress `p`, cross-fading across chapter boundaries. */
function renderStage(ctx: CanvasRenderingContext2D, layers: [HTMLCanvasElement, HTMLCanvasElement], p: number, t: number) {
  const pos = clamp01(p) * 4;
  const chapter = Math.min(3, Math.floor(pos));
  const cp = Math.min(1, pos - chapter);
  ctx.clearRect(0, 0, W, H);
  drawBackdrop(ctx);
  const a = layers[0].getContext('2d')!;
  // Fade toward the next chapter during the last sliver of this one.
  const fade = chapter < 3 ? clamp01((cp - (1 - BLEND)) / BLEND) : 0;
  renderChapter(a, chapter, fade > 0 ? 1 : cp / (chapter < 3 ? 1 - BLEND : 1), t);
  ctx.globalAlpha = 1 - fade;
  ctx.drawImage(layers[0], 0, 0);
  if (fade > 0) {
    const b = layers[1].getContext('2d')!;
    renderChapter(b, chapter + 1, 0, t);
    ctx.globalAlpha = fade;
    ctx.drawImage(layers[1], 0, 0);
  }
  ctx.globalAlpha = 1;
}

const EXPORTS = ['sheet.png', 'loop.gif', 'godot kit'];

export const NightStory: React.FC = () => {
  const reduceMotion = Boolean(useReducedMotion());
  const ref = useRef<HTMLElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [chapter, setChapter] = useState(0);
  const [inChapter, setInChapter] = useState(0);
  const [exportsShown, setExportsShown] = useState(false);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  // A soft spring between the wheel and the drawing keeps every step of the story gliding.
  const smooth = useSpring(scrollYProgress, { stiffness: 90, damping: 24, mass: 0.6, restDelta: 0.0005 });

  useMotionValueEvent(smooth, 'change', (v) => {
    const pos = clamp01(v) * 4;
    const c = Math.min(3, Math.floor(pos));
    setChapter(c);
    setInChapter(Math.round(Math.min(1, pos - c) * 100) / 100);
    setExportsShown(c === 3 && pos - 3 > 0.55);
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const section = ref.current;
    if (!canvas || !ctx || !section) return;
    let raf = 0;
    let visible = false;
    const layers: [HTMLCanvasElement, HTMLCanvasElement] = [makeLayer(), makeLayer()];
    const progressNow = () => (reduceMotion ? scrollYProgress.get() : smooth.get());
    const loop = (t: number) => {
      renderStage(ctx, layers, progressNow(), reduceMotion ? 0 : t);
      if (visible) raf = requestAnimationFrame(loop);
    };
    renderStage(ctx, layers, progressNow(), 0);
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      cancelAnimationFrame(raf);
      if (visible) raf = requestAnimationFrame(loop);
    });
    io.observe(section);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [reduceMotion, smooth, scrollYProgress]);

  const active = CHAPTERS[chapter];

  return (
    <section
      id="a-night-at-the-atelier"
      ref={ref}
      aria-labelledby="night-story-title"
      className="relative scroll-mt-0 bg-[#20152b]"
      style={{ ...NIGHT_VARS, height: '420vh' }}
    >
      <h2 id="night-story-title" className="sr-only">
        A night at the atelier
      </h2>
      <ol className="sr-only">
        {CHAPTERS.map((c) => (
          <li key={c.kicker}>
            <h3>{c.title}</h3>
            <p>{c.body}</p>
          </li>
        ))}
      </ol>

      <div className="sticky top-0 h-[100svh] flex items-center overflow-hidden" aria-hidden="true">
        <CottageBackdrop chapter={chapter} reduceMotion={reduceMotion} />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 55% 60% at 30% 50%, rgba(255, 196, 120, 0.10), transparent 70%), linear-gradient(to bottom, rgba(13,10,28,0.55), transparent 18%)' }}
        />
        <div className="relative max-w-7xl w-full mx-auto px-6 sm:px-8 grid lg:grid-cols-[1.1fr_1fr] gap-8 lg:gap-16 items-center">
          {/* Stage */}
          <div className="relative mx-auto w-full max-w-[560px]">
            <motion.div
              className="absolute -inset-6 rounded-full blur-3xl opacity-40 pointer-events-none"
              animate={{ backgroundColor: active.accent }}
              transition={{ duration: 0.8 }}
            />
            <div className="relative p-3 bg-[#140e22] border-2 border-[#3a2e4c] shadow-[0_8px_0_#0b0714] rounded-[2px]">
              <div className="flex items-center gap-1.5 pb-2 px-1">
                <span className="w-2 h-2 bg-[#e08ca6]" />
                <span className="w-2 h-2 bg-[#f0be7c]" />
                <span className="w-2 h-2 bg-[#7fae6b]" />
                <span className="ml-auto font-mono text-[10px] text-[#968ca2]">hearth-ghost.pixi</span>
              </div>
              <canvas
                ref={canvasRef}
                width={W}
                height={H}
                className="block w-full h-auto"
                style={{ imageRendering: 'pixelated', aspectRatio: `${W} / ${H}` }}
              />
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
                        className="px-2 py-1 bg-[#fff3e0] text-[#2a1945] font-mono text-[11px] font-bold border-2 border-[#3a2e4c] shadow-[0_3px_0_#0b0714]"
                      >
                        {label}
                      </motion.span>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Words */}
          <div className="relative min-h-[15rem] lg:pr-24 xl:pr-28">
            <div className="flex gap-2 mb-6">
              {CHAPTERS.map((c, i) => (
                <motion.span
                  key={c.kicker}
                  className="relative h-1.5 rounded-[1px] overflow-hidden bg-[var(--desk-border)]"
                  animate={{ width: i === chapter ? 56 : 14 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 28 }}
                >
                  <span
                    className="absolute inset-y-0 left-0"
                    style={{ backgroundColor: c.accent, width: `${i < chapter ? 100 : i === chapter ? inChapter * 100 : 0}%` }}
                  />
                </motion.span>
              ))}
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={chapter}
                initial={reduceMotion ? false : { opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, y: -30 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              >
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--accent-gold)]">{active.kicker}</p>
                <p className="mt-3 font-display text-3xl sm:text-4xl lg:text-5xl leading-[1.05] text-[var(--text-heading)]">
                  {active.title}
                </p>
                <p className="mt-5 max-w-md text-base sm:text-lg leading-relaxed text-[var(--text-body)]">{active.body}</p>
              </motion.div>
            </AnimatePresence>
            <p className="mt-10 font-mono text-[11px] text-[var(--text-muted)]">
              {chapter < 3 ? 'keep scrolling ↓' : 'ready when you are ✦'}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
