'use client';

import React, { useEffect, useRef } from 'react';
import { useReducedMotion } from 'motion/react';
import { BAYER_4X4 } from '@/lib/canvas/ditherMatrix';
import { STARTER_TEMPLATES, TEMPLATE_PALETTE } from '@/lib/art/starterTemplates';

/**
 * Pixel-art backdrops for the landing sections that follow the cottage tour.
 * Scenery hugs the edges; the middle stays calm so the content on top reads.
 *
 *  - workbench: a pegboard wall with tools, pinned sketches, a hanging lamp and a moth.
 *  - garden: the back garden at night — fence, flowers, lanterns and fireflies.
 */

export type BackdropScene = 'workbench' | 'garden';

interface Built {
  base: HTMLCanvasElement;
  w: number;
  h: number;
  lampX: number;
  glow: HTMLCanvasElement;
  points: Array<{ x: number; y: number; p: number; s: number }>;
  lanterns: Array<{ x: number; y: number }>;
}

function rng(seed: number) {
  let a = seed;
  return () => {
    a = (a * 1664525 + 1013904223) >>> 0;
    return a / 4294967296;
  };
}

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return { c, g: c.getContext('2d')! };
}

function halo(radius: number, color: string, strength = 0.9) {
  const { c, g } = canvas(radius * 2 + 1, radius * 2 + 1);
  g.fillStyle = color;
  for (let y = 0; y <= radius * 2; y++) {
    for (let x = 0; x <= radius * 2; x++) {
      const d = Math.hypot(x - radius, y - radius) / radius;
      if (d <= 1 && (1 - d) * strength > (BAYER_4X4[y & 3][x & 3] + 0.5) / 16) g.fillRect(x, y, 1, 1);
    }
  }
  return c;
}

function paintSprite(g: CanvasRenderingContext2D, rows: string[], x: number, y: number) {
  rows.forEach((row, ry) => {
    for (let rx = 0; rx < row.length; rx++) {
      const c = TEMPLATE_PALETTE[row[rx]];
      if (!c) continue;
      g.fillStyle = c;
      g.fillRect(x + rx, y + ry, 1, 1);
    }
  });
}

function buildWorkbench(w: number, h: number): Built {
  const rand = rng(23);
  const { c, g } = canvas(w, h);
  g.fillStyle = '#1c1424';
  g.fillRect(0, 0, w, h);
  // Pegboard
  for (let y = 4; y < h - 14; y += 8) {
    for (let x = 4; x < w; x += 8) {
      g.fillStyle = '#120c18';
      g.fillRect(x, y, 1, 1);
      g.fillStyle = '#251c2f';
      g.fillRect(x + 1, y + 1, 1, 1);
    }
  }
  // Desk along the bottom
  const desk = h - 12;
  g.fillStyle = '#6b4436';
  g.fillRect(0, desk, w, 1);
  g.fillStyle = '#4a2f2a';
  g.fillRect(0, desk + 1, w, 4);
  g.fillStyle = '#3a2420';
  g.fillRect(0, desk + 5, w, h - desk - 5);
  for (let x = 0; x < w; x += 37) {
    g.fillStyle = '#2c1a17';
    g.fillRect(x, desk + 5, 1, h - desk - 5);
  }

  // Edge props only fit where the margins are wide enough to keep them clear of the content.
  const roomy = w >= 300;

  // Left: palette board and brushes on pegs
  const L = Math.max(8, Math.round(w * 0.03));
  const py = Math.round(h * 0.18);
  for (let y = 0; y < 16 && roomy; y++) {
    const half = Math.round(Math.sqrt(1 - Math.pow((y - 8) / 8.5, 2)) * 13);
    g.fillStyle = '#b07a4a';
    g.fillRect(L + 13 - half, py + y, half * 2, 1);
  }
  if (roomy) {
    g.fillStyle = '#1c1424';
    g.fillRect(L + 18, py + 9, 3, 3);
    [['#e08ca6', 6, 4], ['#ffd285', 11, 3], ['#7fae6b', 16, 4], ['#c792df', 7, 9], ['#6a9fd4', 12, 11]].forEach(([col, x, y]) => {
      g.fillStyle = col as string;
      g.fillRect(L + (x as number), py + (y as number), 3, 2);
    });
    const brushes: Array<[string, number]> = [['#e08ca6', 22], ['#ffd285', 27], ['#c792df', 32]];
    brushes.forEach(([tip, len], i) => {
      const bx = L + 4 + i * 7;
      const by = py + 26;
      g.fillStyle = '#120c18';
      g.fillRect(bx, by - 2, 1, 1);
      g.fillStyle = '#8a5a3a';
      g.fillRect(bx, by, 1, len);
      g.fillStyle = '#c0c0d0';
      g.fillRect(bx, by + len, 1, 2);
      g.fillStyle = tip;
      g.fillRect(bx, by + len + 2, 1, 3);
    });
    // Ruler
    g.fillStyle = '#d9b46a';
    g.fillRect(L + 26, py + 26, 3, 40);
    for (let i = 0; i < 40; i += 3) {
      g.fillStyle = '#7a5a2a';
      g.fillRect(L + 26, py + 26 + i, i % 9 === 0 ? 2 : 1, 1);
  }

  // Right: corkboard with pinned sketches
  const cw = 46;
  const cx = w - cw - Math.max(6, Math.round(w * 0.03));
  const cy = 26;
  const ch = 46;
  g.fillStyle = '#5b3a2a';
  g.fillRect(cx - 2, cy - 2, cw + 4, ch + 4);
  g.fillStyle = '#a07048';
  g.fillRect(cx, cy, cw, ch);
  for (let i = 0; i < cw * ch * 0.08; i++) {
    g.fillStyle = rand() < 0.5 ? '#8f6340' : '#b4825a';
    g.fillRect(cx + Math.floor(rand() * cw), cy + Math.floor(rand() * ch), 1, 1);
  }
  const pins = ['#e08ca6', '#ffd285', '#c792df', '#7fae6b'];
  STARTER_TEMPLATES.slice(0, 4).forEach((tmpl, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const sx = cx + 3 + col * 20 + (row ? 1 : 0);
    const sy = cy + 3 + row * 21;
    if (sx + 18 > cx + cw) return;
    g.fillStyle = '#2a1a14';
    g.fillRect(sx + 1, sy + 1, 18, 18);
    g.fillStyle = '#f6ead6';
    g.fillRect(sx, sy, 18, 18);
    paintSprite(g, tmpl.rows, sx + 1, sy + 1);
    g.fillStyle = pins[i];
    g.fillRect(sx + 8, sy - 1, 2, 2);
  });
  }

  // Mug and sketchbooks on the desk
  const mx = w - Math.round(w * 0.2);
  g.fillStyle = '#c792df';
  g.fillRect(mx, desk - 6, 5, 6);
  g.fillRect(mx + 5, desk - 5, 2, 1);
  g.fillRect(mx + 6, desk - 5, 1, 3);
  g.fillRect(mx + 5, desk - 3, 2, 1);
  g.fillStyle = '#dcabdf';
  g.fillRect(mx, desk - 6, 5, 1);
  const bx0 = Math.round(w * 0.12);
  [['#7a3a5c', 22, 3], ['#3e5a6b', 20, 3], ['#8a6a3a', 24, 2]].forEach(([col, bw, bh], i) => {
    g.fillStyle = col as string;
    g.fillRect(bx0 + i, desk - 3 * (i + 1), bw as number, bh as number);
    g.fillStyle = '#f6ead6';
    g.fillRect(bx0 + i + (bw as number) - 2, desk - 3 * (i + 1), 1, bh as number);
  });

  const lampX = Math.round(w * 0.5);
  // Lamp cord and shade
  g.fillStyle = '#120c18';
  g.fillRect(lampX, 0, 1, 14);
  g.fillStyle = '#3a2e4c';
  g.fillRect(lampX - 4, 14, 9, 2);
  g.fillRect(lampX - 6, 16, 13, 2);
  g.fillStyle = '#ffd285';
  g.fillRect(lampX - 6, 18, 13, 1);

  return {
    base: c,
    w,
    h,
    lampX,
    glow: halo(Math.round(Math.min(w, h) * 0.32), 'rgba(255, 210, 140, 0.07)', 0.75),
    points: Array.from({ length: 22 }, () => ({ x: rand() * w, y: rand() * h * 0.85, p: rand() * 6, s: 0.3 + rand() * 0.5 })),
    lanterns: [{ x: mx + 2, y: desk - 7 }],
  };
}

function buildGarden(w: number, h: number): Built {
  const rand = rng(41);
  const { c, g } = canvas(w, h);
  const ground = Math.round(h * 0.82);
  const top = [17, 13, 34];
  const bottom = [42, 25, 69];
  for (let y = 0; y < ground; y++) {
    const t = y / ground;
    for (let x = 0; x < w; x++) {
      const k = t + ((BAYER_4X4[y & 3][x & 3] + 0.5) / 16 - 0.5) * 0.12;
      const rgb = top.map((v, i) => Math.round(v + (bottom[i] - v) * Math.max(0, Math.min(1, k))));
      g.fillStyle = `rgb(${rgb.join(',')})`;
      g.fillRect(x, y, 1, 1);
    }
  }
  // Distant treeline
  for (let x = 0; x < w; x++) {
    const ty = ground - 6 - Math.round(Math.abs(Math.sin(x * 0.21)) * 5 + Math.sin(x * 0.05) * 3);
    g.fillStyle = '#1a102b';
    g.fillRect(x, ty, 1, ground - ty);
  }
  // Ground with a little texture and a stepping-stone path winding toward you
  g.fillStyle = '#140b21';
  g.fillRect(0, ground, w, h - ground);
  for (let i = 0; i < (w * (h - ground)) / 14; i++) {
    g.fillStyle = rand() < 0.5 ? '#1b1030' : '#0f0819';
    g.fillRect(Math.floor(rand() * w), ground + 2 + Math.floor(rand() * (h - ground)), 1, 1);
  }
  for (let s = 0; s < 9; s++) {
    const sy = ground + 3 + s * 4;
    if (sy > h - 2) break;
    const sx = Math.round(w / 2 + Math.sin(s * 0.8) * 14 - s * 2);
    const sw = 6 + s;
    g.fillStyle = '#2a1d3c';
    g.fillRect(sx - (sw >> 1), sy, sw, 2);
    g.fillStyle = '#3a2a52';
    g.fillRect(sx - (sw >> 1) + 1, sy, sw - 3, 1);
  }
  for (let x = 0; x < w; x += 2) {
    g.fillStyle = '#2c1c47';
    g.fillRect(x, ground - 1 - Math.floor(rand() * 2), 1, 2);
  }
  // Picket fence along the left and right
  const lanterns: Built['lanterns'] = [];
  for (const side of [0, 1]) {
    const start = side ? Math.round(w * 0.78) : 0;
    const end = side ? w : Math.round(w * 0.22);
    g.fillStyle = '#3a2a4c';
    g.fillRect(start, ground - 7, end - start, 1);
    g.fillRect(start, ground - 4, end - start, 1);
    for (let x = start + 2; x < end; x += 5) {
      g.fillStyle = '#4a3660';
      g.fillRect(x, ground - 10, 3, 10);
      g.fillRect(x + 1, ground - 11, 1, 1);
      g.fillStyle = '#5d4486';
      g.fillRect(x, ground - 10, 1, 10);
    }
    // Lantern posts
    const lx = side ? Math.round(w * 0.86) : Math.round(w * 0.12);
    g.fillStyle = '#2a1d3c';
    g.fillRect(lx, ground - 26, 1, 26);
    g.fillRect(lx, ground - 26, 4, 1);
    lanterns.push({ x: lx + 4, y: ground - 23 });
  }
  // Flowers and shrubs
  for (let i = 0; i < w / 6; i++) {
    const x = Math.floor(rand() * w);
    if (x > w * 0.3 && x < w * 0.7 && rand() < 0.7) continue;
    const fh = 2 + Math.floor(rand() * 4);
    g.fillStyle = '#2c4a33';
    g.fillRect(x, ground - fh, 1, fh);
    g.fillStyle = ['#f2b8c6', '#c792df', '#ffd285', '#ede8f4'][Math.floor(rand() * 4)];
    g.fillRect(x - 1, ground - fh - 1, 3, 1);
    g.fillRect(x, ground - fh - 2, 1, 3);
  }
  return {
    base: c,
    w,
    h,
    lampX: 0,
    glow: halo(14, 'rgba(255, 200, 130, 0.22)'),
    points: Array.from({ length: 28 }, () => ({ x: rand() * w, y: ground - 4 - rand() * h * 0.35, p: rand() * 6, s: 0.4 + rand() * 0.7 })),
    lanterns,
  };
}

function draw(ctx: CanvasRenderingContext2D, scene: BackdropScene, b: Built, t: number) {
  ctx.drawImage(b.base, 0, 0);
  if (scene === 'workbench') {
    const flick = 0.9 + Math.sin(t / 120) * 0.05 + Math.sin(t / 47) * 0.03;
    ctx.globalAlpha = flick;
    ctx.drawImage(b.glow, b.lampX - (b.glow.width >> 1), 18 - (b.glow.width >> 2));
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#fff3c4';
    ctx.fillRect(b.lampX - 1, 19, 3, 1);
    // A moth looping around the lamp
    const a = t / 700;
    const mx = Math.round(b.lampX + Math.cos(a) * 12 + Math.sin(a * 2.3) * 3);
    const my = Math.round(26 + Math.sin(a * 1.6) * 6);
    ctx.fillStyle = '#cdbfdf';
    ctx.fillRect(mx, my, 1, 1);
    if (Math.sin(t / 40) > 0) {
      ctx.fillRect(mx - 1, my - 1, 1, 1);
      ctx.fillRect(mx + 1, my - 1, 1, 1);
    }
    // Steam from the mug
    const [mug] = b.lanterns;
    for (let s = 0; s < 3; s++) {
      const age = (t / 1500 + s / 3) % 1;
      ctx.fillStyle = `rgba(237, 232, 244, ${0.4 * (1 - age)})`;
      ctx.fillRect(mug.x + Math.round(Math.sin(age * 6 + s)), mug.y - Math.round(age * 7), 1, 1);
    }
    for (const m of b.points) {
      const x = Math.round((m.x + Math.sin(t / 3000 + m.p) * 6) % b.w);
      const y = Math.round(m.y + Math.sin(t / 2000 + m.p) * 4);
      ctx.fillStyle = `rgba(255, 220, 160, ${0.18 + Math.sin(t / 900 + m.p) * 0.12})`;
      ctx.fillRect(x, y, 1, 1);
    }
  } else {
    for (const l of b.lanterns) {
      ctx.globalAlpha = 0.85 + Math.sin(t / 110 + l.x) * 0.1;
      ctx.drawImage(b.glow, l.x - 14, l.y - 13);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#3a2e4c';
      ctx.fillRect(l.x - 1, l.y - 1, 4, 5);
      ctx.fillStyle = Math.sin(t / 90 + l.x) > 0 ? '#fff3c4' : '#ffd285';
      ctx.fillRect(l.x, l.y, 2, 3);
    }
    for (const f of b.points) {
      const ft = (t / 1000) * f.s + f.p;
      const x = Math.round(f.x + Math.sin(ft) * 8);
      const y = Math.round(f.y + Math.sin(ft * 1.6) * 4);
      const glow = Math.sin(ft * 2.5);
      if (glow < -0.1) continue;
      ctx.fillStyle = glow > 0.6 ? '#fff3a8' : '#ffd285';
      ctx.fillRect(x, y, 1, 1);
      if (glow > 0.6) {
        ctx.fillStyle = 'rgba(255, 230, 140, 0.3)';
        ctx.fillRect(x - 1, y, 3, 1);
        ctx.fillRect(x, y - 1, 1, 3);
      }
    }
    // A few stars twinkling over the garden
    for (let i = 0; i < 30; i++) {
      if (Math.sin(t / 700 + i * 2.1) < 0) continue;
      ctx.fillStyle = '#d8c6e8';
      ctx.fillRect((i * 97) % b.w, (i * 53) % Math.round(b.h * 0.5), 1, 1);
    }
  }
}

export const SceneBackdrop: React.FC<{ scene: BackdropScene }> = ({ scene }) => {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const reduceMotion = Boolean(useReducedMotion());

  useEffect(() => {
    const el = ref.current;
    const ctx = el?.getContext('2d');
    const host = el?.parentElement;
    if (!el || !ctx || !host) return;
    let built: Built | null = null;
    let raf = 0;
    let visible = false;
    const start = performance.now();
    const build = () => {
      const rect = host.getBoundingClientRect();
      const PX = rect.width >= 1024 ? 4 : 3;
      const w = Math.ceil(rect.width / PX);
      const h = Math.ceil(rect.height / PX);
      el.width = w;
      el.height = h;
      el.style.width = `${w * PX}px`;
      el.style.height = `${h * PX}px`;
      built = scene === 'workbench' ? buildWorkbench(w, h) : buildGarden(w, h);
    };
    const paint = () => built && draw(ctx, scene, built, reduceMotion ? 0 : performance.now() - start);
    const loop = () => {
      paint();
      if (visible && !reduceMotion) raf = requestAnimationFrame(loop);
    };
    build();
    paint();
    if (typeof ResizeObserver === 'undefined' || typeof IntersectionObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      build();
      paint();
    });
    ro.observe(host);
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      cancelAnimationFrame(raf);
      if (visible) raf = requestAnimationFrame(loop);
    });
    io.observe(host);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, [scene, reduceMotion]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="absolute top-0 left-0 pointer-events-none"
      style={{ imageRendering: 'pixelated' }}
    />
  );
};
