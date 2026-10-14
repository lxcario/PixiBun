'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll, useSpring, useTransform, type MotionValue } from 'motion/react';
import { STARTER_TEMPLATES, TEMPLATE_PALETTE } from '@/lib/art/starterTemplates';
import { CottageBackdrop } from './CottageBackdrop';

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
    body: 'Move a little light around your sprite and watch the shading follow, with real lighting and cast shadows painted right onto the pixels, using colors from your own palette.',
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
    const inked = clamp01(cp) * INK_ORDER.length;
    const n = Math.ceil(inked);
    for (let i = 0; i < Math.floor(inked); i++) {
      const px = INK_ORDER[i];
      ctx.fillStyle = px.c;
      ctx.fillRect(GX + px.x, GY + px.y, 1, 1);
    }
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
    // The lamp drifts slowly back and forth; every pixel is shaded by a fake normal facing out of the sprite.
    const sweep = 0.5 - 0.5 * Math.cos(t / 3400);
    const angle = -Math.PI * 0.9 + sweep * Math.PI * 1.8;
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
    const frame = Math.floor(t / 340) % 4;
    const prev = (frame + 3) % 4;
    const next = (frame + 1) % 4;
    drawGhost(ctx, GX, GY + BOB[prev] + 1, 0.2, '#c792df');
    drawGhost(ctx, GX, GY + BOB[next] + 1, 0.14, '#7fae6b');
    drawGhost(ctx, GX, GY + BOB[frame] + 1);
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
  const k = ease(clamp01(cp * 1.2));
  const sheetY = 6;
  if (k > 0.15) {
    ctx.fillStyle = '#2a1945';
    ctx.fillRect(0, sheetY - 1, W, 18);
  }
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
    const pp = ease(clamp01(cp * 1.4 - 0.3 - i * 0.14));
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

// Scroll only chooses the chapter; each chapter then plays at its own calm,
// fixed pace, so a fast flick of the wheel never rushes the drawing.
const FADE_START = 0.78;
const FADE_MS = 650;
/** How long each chapter's one-time animation takes; 0 means it is an idle loop. */
const PLAY_MS = [6500, 0, 0, 3200];
const smoothstep = (x: number) => x * x * (3 - 2 * x);

/** The chapter on show: it changes late in the chapter's share of the scroll, with its words. */
export function storyChapter(progress: number): number {
  const pos = clamp01(progress) * 4;
  const chapter = Math.min(3, Math.floor(pos));
  return chapter < 3 && pos - chapter > (FADE_START + 1) / 2 ? chapter + 1 : chapter;
}

function makeLayer() {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  return c;
}

interface StageView {
  from: number;
  fromProgress: number;
  to: number;
  toProgress: number;
  /** 0 shows `from`, 1 shows `to`. */
  mix: number;
}

const DISSOLVE = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

/** Composites the stage; between chapters, pixels switch over in an ordered-dither pattern. */
function renderStage(ctx: CanvasRenderingContext2D, layers: [HTMLCanvasElement, HTMLCanvasElement], view: StageView, t: number) {
  ctx.clearRect(0, 0, W, H);
  drawBackdrop(ctx);
  const toCtx = layers[1].getContext('2d', { willReadFrequently: true })!;
  renderChapter(toCtx, view.to, view.toProgress, t);
  if (view.from < 0 || view.mix >= 1) {
    ctx.drawImage(layers[1], 0, 0);
    return;
  }
  const fromCtx = layers[0].getContext('2d', { willReadFrequently: true })!;
  renderChapter(fromCtx, view.from, view.fromProgress, t);
  const out = ctx.getImageData(0, 0, W, H);
  const a = fromCtx.getImageData(0, 0, W, H).data;
  const b = toCtx.getImageData(0, 0, W, H).data;
  const level = Math.floor(view.mix * 16);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const src = DISSOLVE[y & 3][x & 3] < level ? b : a;
      const o = (y * W + x) * 4;
      if (src[o + 3] === 0) continue;
      out.data[o] = src[o];
      out.data[o + 1] = src[o + 1];
      out.data[o + 2] = src[o + 2];
      out.data[o + 3] = 255;
    }
  }
  ctx.putImageData(out, 0, 0);
}

const EXPORTS = ['sheet.png', 'loop.gif', 'godot kit'];

/** One chapter's progress pip; its fill follows the scroll spring directly, without re-rendering. */
const StoryPip: React.FC<{ index: number; active: boolean; accent: string; progress: MotionValue<number> }> = ({ index, active, accent, progress }) => {
  const fill = useTransform(progress, (v) => `${clamp01(clamp01(v) * 4 - index) * 100}%`);
  return (
    <motion.span
      className="relative h-1.5 rounded-[1px] overflow-hidden bg-[var(--desk-border)]"
      animate={{ width: active ? 56 : 14 }}
      transition={{ type: 'spring', stiffness: 160, damping: 26 }}
    >
      <motion.span className="absolute inset-y-0 left-0" style={{ backgroundColor: accent, width: fill }} />
    </motion.span>
  );
};

export const NightStory: React.FC = () => {
  const reduceMotion = Boolean(useReducedMotion());
  const ref = useRef<HTMLElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [chapter, setChapter] = useState(0);
  const [direction, setDirection] = useState(1);
  const [exportsShown, setExportsShown] = useState(false);
  const shown = useRef(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  // A soft, slightly heavy spring between the scroll and the drawing, so fast
  // wheel flicks still glide through each step of the story.
  const smooth = useSpring(scrollYProgress, { stiffness: 55, damping: 22, mass: 0.9, restDelta: 0.0002 });

  useMotionValueEvent(smooth, 'change', (v) => {
    const next = storyChapter(v);
    if (next !== shown.current) {
      setDirection(next > shown.current ? 1 : -1);
      shown.current = next;
      setChapter(next);
    }
    setExportsShown(clamp01(v) * 4 > 3.55);
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
    // When each chapter started playing; a chapter that already played shows finished.
    const startedAt = [-1, -1, -1, -1];
    let current = -1;
    let previous = -1;
    let switchedAt = -Infinity;
    const played = (chapter: number, now: number) => {
      if (reduceMotion || PLAY_MS[chapter] === 0) return 1;
      if (startedAt[chapter] < 0) return 0;
      return smoothstep(clamp01((now - startedAt[chapter]) / PLAY_MS[chapter]));
    };
    const view = (now: number): StageView => {
      const chapter = storyChapter(progressNow());
      if (chapter !== current) {
        previous = current;
        current = chapter;
        switchedAt = now;
      }
      // Start drawing once the stage is really in view (not while the hero still fills the screen).
      if (startedAt[current] < 0 && section.getBoundingClientRect().top < window.innerHeight * 0.25) {
        startedAt[current] = now + (previous >= 0 ? FADE_MS / 2 : 250);
      }
      const mix = reduceMotion || previous < 0 ? 1 : clamp01((now - switchedAt) / FADE_MS);
      return { from: previous, fromProgress: previous >= 0 ? played(previous, now) : 0, to: current, toProgress: played(current, now), mix };
    };
    const loop = (t: number) => {
      renderStage(ctx, layers, view(t), reduceMotion ? 0 : t);
      if (visible) raf = requestAnimationFrame(loop);
    };
    renderStage(ctx, layers, view(performance.now()), 0);
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
      id="a-night-at-the-desk"
      ref={ref}
      aria-labelledby="night-story-title"
      className="relative scroll-mt-0 bg-[var(--desk-bg)]"
      style={{ height: '560vh' }}
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

      <div className="sticky top-0 h-[100svh] flex items-center overflow-hidden" aria-hidden="true">
        <CottageBackdrop chapter={chapter} reduceMotion={reduceMotion} />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 55% 60% at 30% 50%, color-mix(in srgb, var(--primary-bg) 12%, transparent), transparent 70%), linear-gradient(to bottom, color-mix(in srgb, var(--desk-bg) 55%, transparent), transparent 18%)' }}
        />
        <div className="relative max-w-7xl w-full mx-auto px-6 sm:px-8 grid lg:grid-cols-[1.1fr_1fr] gap-8 lg:gap-16 items-center">
          {/* Stage */}
          <div className="relative mx-auto w-full max-w-[560px]">
            <motion.div
              className="absolute -inset-6 rounded-full blur-3xl opacity-40 pointer-events-none"
              animate={{ backgroundColor: active.accent }}
              transition={{ duration: 0.8 }}
            />
            <div className="relative p-3 bg-[var(--surface-0)] border-2 border-[var(--desk-border)] shadow-[0_8px_0_var(--ink)] rounded-[2px]">
              <div className="flex items-center gap-1.5 pb-2 px-1">
                <span className="w-2 h-2 bg-[#e08ca6]" />
                <span className="w-2 h-2 bg-[#f0be7c]" />
                <span className="w-2 h-2 bg-[#7fae6b]" />
                <span className="ml-auto font-mono text-[10px] text-[var(--text-muted)]">hearth-ghost.pixi</span>
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

          {/* Words */}
          <div className="relative min-h-[15rem] lg:pr-24 xl:pr-28">
            <div className="flex gap-2 mb-6">
              {CHAPTERS.map((c, i) => (
                <StoryPip key={c.kicker} index={i} active={i === chapter} accent={c.accent} progress={smooth} />
              ))}
            </div>
            {/* The words wipe out, then the next ones wipe in from the scroll direction: solid, never see-through */}
            <div className="grid">
              <AnimatePresence initial={false} custom={direction} mode="wait">
                <motion.div
                  key={chapter}
                  custom={direction}
                  style={{ gridArea: '1 / 1' }}
                  variants={{
                    enter: (d: number) => (reduceMotion ? {} : { y: d * 18, clipPath: d > 0 ? 'inset(0 0 100% 0)' : 'inset(100% 0 0 0)' }),
                    center: { y: 0, clipPath: 'inset(0 0 0% 0)', transition: { duration: 0.34, ease: [0.22, 1, 0.36, 1] } },
                    exit: (d: number) => (reduceMotion ? {} : { y: d * -18, clipPath: d > 0 ? 'inset(100% 0 0 0)' : 'inset(0 0 100% 0)', transition: { duration: 0.2, ease: [0.4, 0, 1, 1] } }),
                  }}
                  initial="enter"
                  animate="center"
                  exit="exit"
                >
                  <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--accent-gold)]">{active.kicker}</p>
                  <p className="mt-3 font-display text-3xl sm:text-4xl lg:text-5xl leading-[1.05] text-[var(--text-heading)]">
                    {active.title}
                  </p>
                  <p className="mt-5 max-w-md text-base sm:text-lg leading-relaxed text-[var(--text-body)]">{active.body}</p>
                </motion.div>
              </AnimatePresence>
            </div>
            <p className="mt-10 font-mono text-[11px] text-[var(--text-muted)]">
              {chapter < 3 ? 'keep scrolling ↓' : 'ready when you are ✦'}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
