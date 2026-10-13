'use client';

import React, { useEffect, useRef } from 'react';
import { useThemeStore } from '@/stores/themeStore';
import { BAYER_4X4 } from '@/lib/canvas/ditherMatrix';

/**
 * The Moonlit theme's sky behind the drawing canvas: a dithered night with
 * twinkling stars, a moon and a sleepy town along the bottom edge (or, in light
 * mode, a soft dawn with drifting clouds). Purely decorative and pointer-transparent.
 *
 * It ticks at ~8fps on a timer instead of every animation frame so it never
 * competes with drawing, and stops entirely when the tab is hidden or motion is reduced.
 */

const PX = 4;
const TICK_MS = 125;

interface Sky {
  w: number;
  h: number;
  base: HTMLCanvasElement;
  stars: Array<{ x: number; y: number; p: number; s: number }>;
  lights: Array<{ x: number; y: number; p: number }>;
  clouds: Array<{ x: number; y: number; w: number; s: number }>;
}

function rng(seed: number) {
  let a = seed;
  return () => {
    a = (a * 1664525 + 1013904223) >>> 0;
    return a / 4294967296;
  };
}

function hex(c: string) {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function buildSky(w: number, h: number, dawn: boolean): Sky {
  const rand = rng(5);
  const base = document.createElement('canvas');
  base.width = w;
  base.height = h;
  const g = base.getContext('2d')!;
  const bands = (dawn ? ['#e9dcf2', '#efe0ee', '#f6e4e2', '#fbe9dc'] : ['#0b0718', '#110a22', '#170d2c', '#1f1236']).map(hex);
  const img = g.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    const pos = (y / h) * (bands.length - 1);
    const i = Math.min(bands.length - 2, Math.floor(pos));
    const f = pos - i;
    for (let x = 0; x < w; x++) {
      const c = f > (BAYER_4X4[y & 3][x & 3] + 0.5) / 16 ? bands[i + 1] : bands[i];
      const o = (y * w + x) * 4;
      img.data[o] = c[0];
      img.data[o + 1] = c[1];
      img.data[o + 2] = c[2];
      img.data[o + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);

  // Moon (or a pale morning sun) in the top-right corner
  const mx = Math.round(w * 0.68);
  const my = 30;
  for (let y = -6; y <= 6; y++) {
    for (let x = -6; x <= 6; x++) {
      const d = Math.hypot(x, y);
      if (d <= 5) {
        g.fillStyle = dawn ? '#ffe2b8' : Math.hypot(x + 2, y - 1.5) > 5 ? '#fff1cf' : '#e4c896';
        g.fillRect(mx + x, my + y, 1, 1);
      } else if (d <= 6 && (x + y) % 2 === 0) {
        g.fillStyle = dawn ? 'rgba(255, 210, 160, 0.5)' : 'rgba(255, 214, 160, 0.18)';
        g.fillRect(mx + x, my + y, 1, 1);
      }
    }
  }

  // Far hills and a sleepy town along the bottom
  const hill = dawn ? '#d9c3e6' : '#170e2a';
  const town = dawn ? '#cbb2dc' : '#130b24';
  const lights: Sky['lights'] = [];
  for (let x = 0; x < w; x++) {
    const top = Math.round(h - 10 - Math.sin(x / 23) * 3 - Math.sin(x / 7.3) * 1.2);
    g.fillStyle = hill;
    g.fillRect(x, top, 1, h - top);
  }
  for (let x = 2; x < w - 6; ) {
    const hw = 4 + Math.floor(rand() * 4);
    const hh = 3 + Math.floor(rand() * 4);
    if (rand() < 0.55) {
      const baseY = h - 6;
      g.fillStyle = town;
      g.fillRect(x, baseY - hh, hw, hh + 6);
      for (let r = 0; r < Math.ceil(hw / 2); r++) g.fillRect(x + r, baseY - hh - r - 1, hw - r * 2, 1);
      if (rand() < 0.7) lights.push({ x: x + 1 + Math.floor(rand() * (hw - 2)), y: baseY - hh + 1 + Math.floor(rand() * Math.max(1, hh - 2)), p: rand() * 6 });
    }
    x += hw + 2 + Math.floor(rand() * 8);
  }

  return {
    w,
    h,
    base,
    stars: Array.from({ length: Math.round((w * h) / 220) }, () => ({
      x: Math.floor(rand() * w),
      y: Math.floor(Math.pow(rand(), 1.4) * (h - 14)),
      p: rand() * Math.PI * 2,
      s: 0.4 + rand() * 1.2,
    })),
    lights,
    clouds: Array.from({ length: 4 }, () => ({ x: rand() * w, y: 8 + rand() * h * 0.45, w: 14 + Math.floor(rand() * 18), s: 0.0008 + rand() * 0.0012 })),
  };
}

function paint(g: CanvasRenderingContext2D, sky: Sky, t: number, dawn: boolean) {
  g.drawImage(sky.base, 0, 0);
  if (!dawn) {
    for (const s of sky.stars) {
      const tw = Math.sin((t / 1000) * s.s + s.p);
      if (tw < -0.5) continue;
      g.fillStyle = tw > 0.75 ? '#fff3c4' : tw > 0 ? '#9d8bbd' : '#5d4a80';
      g.fillRect(s.x, s.y, 1, 1);
    }
    for (const l of sky.lights) {
      g.fillStyle = Math.sin(t / 900 + l.p) > -0.7 ? '#e0a55c' : '#7a5530';
      g.fillRect(l.x, l.y, 1, 1);
    }
  }
  // Fairy lights swagged across the top of the room, just under the rail
  if (!dawn) {
    const swags = Math.max(2, Math.round(sky.w / 90));
    for (let i = 0; i < swags; i++) {
      const x0 = Math.round((sky.w / swags) * i);
      const x1 = Math.round((sky.w / swags) * (i + 1));
      for (let x = x0; x < x1; x++) {
        const p = (x - x0) / (x1 - x0);
        const y = 17 + Math.round(Math.sin(p * Math.PI) * 6);
        g.fillStyle = '#0b0714';
        g.fillRect(x, y, 1, 1);
        if ((x - x0) % 7 === 3) {
          const lit = Math.sin(t / 700 + x * 0.9) > -0.35;
          g.fillStyle = lit ? ['#ffd285', '#f2b8c6', '#c792df', '#a8e092'][Math.floor(x / 7) % 4] : '#3a2a4a';
          g.fillRect(x, y + 1, 1, 2);
          if (lit) {
            g.fillStyle = 'rgba(255, 210, 133, 0.16)';
            g.fillRect(x - 1, y, 3, 4);
          }
        }
      }
    }
  }
  for (const c of sky.clouds) {
    const x = Math.round(((c.x + t * c.s) % (sky.w + c.w * 2)) - c.w);
    const y = Math.round(c.y);
    g.fillStyle = dawn ? 'rgba(255, 250, 255, 0.75)' : 'rgba(60, 40, 96, 0.55)';
    g.fillRect(x + 2, y - 2, c.w - 6, 1);
    g.fillRect(x + 1, y - 1, c.w - 3, 1);
    g.fillRect(x, y, c.w, 2);
  }
}

export const StudioSkyBackdrop: React.FC = () => {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const studioTheme = useThemeStore((s) => s.studioTheme);
  const colorScheme = useThemeStore((s) => s.colorScheme);
  const enabled = studioTheme === 'moonlit';
  const dawn = colorScheme === 'light';

  useEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    const g = el?.getContext('2d');
    const host = el?.parentElement;
    if (!el || !g || !host) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let sky: Sky | null = null;
    const start = performance.now();
    const build = () => {
      const rect = host.getBoundingClientRect();
      const w = Math.max(1, Math.ceil(rect.width / PX));
      const h = Math.max(1, Math.ceil(rect.height / PX));
      el.width = w;
      el.height = h;
      el.style.width = `${w * PX}px`;
      el.style.height = `${h * PX}px`;
      sky = buildSky(w, h, dawn);
    };
    const draw = () => {
      if (sky && document.visibilityState !== 'hidden') paint(g, sky, performance.now() - start, dawn);
    };
    build();
    draw();
    const timer = reduce ? 0 : window.setInterval(draw, TICK_MS);
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => {
      build();
      draw();
    });
    ro?.observe(host);
    return () => {
      window.clearInterval(timer);
      ro?.disconnect();
    };
  }, [enabled, dawn]);

  if (!enabled) return null;
  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      data-testid="studio-sky-backdrop"
      className="absolute top-0 left-0 -z-10 pointer-events-none"
      style={{ imageRendering: 'pixelated' }}
    />
  );
};
