'use client';

import React, { useEffect, useRef } from 'react';
import { recolorCanvas } from '@/lib/theme/sceneRecolor';
import { useSceneRecolorRef } from './useSceneRecolor';
import { BAYER_4X4 } from '@/lib/canvas/ditherMatrix';
import { drawBun, type BunPose } from '@/lib/art/bunSprite';
import { ambientTicker, tickWhileVisible, type AmbientTicker } from '../ambientClock';

/**
 * Inside Bun's cottage: wallpaper, a bookshelf, a window onto the same night
 * sky as the hero, fairy lights, a rug, and Bun watching the tour from the floor.
 * Scenery stays at the edges so the middle of the room is calm for content.
 */

const FAIRY = ['#ffd285', '#f2b8c6', '#c792df', '#a8e092'];
const BOOKS = ['#7a3a5c', '#3e5a6b', '#8a6a3a', '#5b3a7a', '#a8574a', '#4a6b45', '#6b4a7a'];

function rng(seed: number) {
  let a = seed;
  return () => {
    a = (a * 1664525 + 1013904223) >>> 0;
    return a / 4294967296;
  };
}

interface Room {
  w: number;
  h: number;
  floorY: number;
  base: HTMLCanvasElement;
  candleHalo: HTMLCanvasElement;
  win: { x: number; y: number; w: number; h: number };
  sill: number;
  bunX: number;
  rug: { x: number; w: number };
  plantX: number;
  stars: Array<{ x: number; y: number; p: number }>;
  motes: Array<{ x: number; y: number; s: number; p: number }>;
}

function halo(radius: number, color: string) {
  const c = document.createElement('canvas');
  c.width = c.height = radius * 2 + 1;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = color;
  for (let y = 0; y <= radius * 2; y++) {
    for (let x = 0; x <= radius * 2; x++) {
      const d = Math.hypot(x - radius, y - radius) / radius;
      if (d <= 1 && (1 - d) * 0.9 > (BAYER_4X4[y & 3][x & 3] + 0.5) / 16) ctx.fillRect(x, y, 1, 1);
    }
  }
  return c;
}

function buildRoom(w: number, h: number): Room {
  const rand = rng(11);
  const base = document.createElement('canvas');
  base.width = w;
  base.height = h;
  const g = base.getContext('2d')!;
  const floorY = Math.round(h * 0.86);

  // Wallpaper: soft stripes with a little diamond motif
  g.fillStyle = '#20152b';
  g.fillRect(0, 0, w, h);
  for (let x = 0; x < w; x += 10) {
    g.fillStyle = '#251932';
    g.fillRect(x, 0, 3, floorY);
  }
  for (let y = 6; y < floorY - 20; y += 16) {
    for (let x = (y / 16) % 2 ? 5 : 0; x < w; x += 20) {
      g.fillStyle = '#2d203b';
      g.fillRect(x + 1, y, 1, 1);
      g.fillRect(x, y + 1, 3, 1);
      g.fillRect(x + 1, y + 2, 1, 1);
    }
  }
  // Wainscot panels
  const wain = floorY - Math.round(h * 0.15);
  g.fillStyle = '#291a27';
  g.fillRect(0, wain, w, floorY - wain);
  g.fillStyle = '#3d2633';
  g.fillRect(0, wain, w, 2);
  g.fillStyle = '#4f3242';
  g.fillRect(0, wain, w, 1);
  for (let x = 6; x < w; x += 26) {
    g.fillStyle = '#211520';
    g.fillRect(x, wain + 4, 1, floorY - wain - 7);
    g.fillRect(x, wain + 4, 20, 1);
    g.fillStyle = '#33212f';
    g.fillRect(x + 20, wain + 4, 1, floorY - wain - 7);
  }
  // Floorboards
  for (let y = floorY; y < h; y += 3) {
    g.fillStyle = (y - floorY) % 6 ? '#24161d' : '#28181f';
    g.fillRect(0, y, w, 3);
    g.fillStyle = '#170e13';
    g.fillRect(0, y, w, 1);
    for (let x = ((y * 7) % 23) - 23; x < w; x += 23 + ((y * 3) % 9)) {
      g.fillRect(x, y, 1, 3);
    }
  }
  g.fillStyle = '#3a2430';
  g.fillRect(0, floorY - 1, w, 1);

  // Rug
  const rugW = Math.round(Math.min(w * 0.42, 150));
  const rugX = Math.round(w * 0.36 - rugW / 2);
  const rugY = floorY + 3;
  g.fillStyle = '#7a3a5c';
  g.fillRect(rugX + 2, rugY, rugW - 4, 1);
  g.fillRect(rugX, rugY + 1, rugW, 5);
  g.fillRect(rugX + 2, rugY + 6, rugW - 4, 1);
  g.fillStyle = '#5b2a46';
  g.fillRect(rugX + 3, rugY + 2, rugW - 6, 3);
  for (let x = rugX + 6; x < rugX + rugW - 6; x += 6) {
    g.fillStyle = (x / 6) % 2 ? '#c792df' : '#f0be7c';
    g.fillRect(x, rugY + 3, 2, 1);
  }
  for (let x = rugX + 1; x < rugX + rugW - 1; x += 2) {
    g.fillStyle = '#c792df';
    g.fillRect(x, rugY + 7, 1, 1);
  }

  // Bookshelf on the left edge
  const shelfW = Math.max(26, Math.round(w * 0.075));
  const shelfTop = Math.round(h * 0.2);
  g.fillStyle = '#3a2229';
  g.fillRect(0, shelfTop, shelfW, floorY - shelfTop);
  g.fillStyle = '#4c2e36';
  g.fillRect(shelfW - 2, shelfTop, 2, floorY - shelfTop);
  g.fillRect(0, shelfTop, shelfW, 2);
  for (let sy = shelfTop + 20; sy < floorY - 4; sy += 20) {
    let bx = 2;
    while (bx < shelfW - 5) {
      const bw = 2 + Math.floor(rand() * 2);
      const bh = 9 + Math.floor(rand() * 7);
      if (rand() < 0.12) {
        // A little jar instead of a book
        g.fillStyle = '#6a7fa0';
        g.fillRect(bx, sy - 6, 4, 6);
        g.fillStyle = '#ffd285';
        g.fillRect(bx + 1, sy - 4, 2, 2);
        bx += 6;
        continue;
      }
      const lean = rand() < 0.1;
      g.fillStyle = BOOKS[Math.floor(rand() * BOOKS.length)];
      g.fillRect(bx, sy - bh, bw, bh);
      g.fillStyle = 'rgba(255,255,255,0.18)';
      g.fillRect(bx, sy - bh + 2, bw, 1);
      if (lean) bx += 1;
      bx += bw;
    }
    g.fillStyle = '#4c2e36';
    g.fillRect(0, sy, shelfW, 2);
    g.fillStyle = '#2a171d';
    g.fillRect(0, sy + 2, shelfW, 1);
  }
  // Trailing plant on top of the shelf
  g.fillStyle = '#a8574a';
  g.fillRect(4, shelfTop - 5, 8, 5);
  g.fillStyle = '#c86e5c';
  g.fillRect(4, shelfTop - 5, 8, 1);
  for (let i = 0; i < 26; i++) {
    const lx = 2 + Math.round(Math.sin(i * 0.7) * 3) + (i % 3);
    const ly = shelfTop - 6 + i;
    g.fillStyle = i % 4 ? '#4a7a45' : '#7fae6b';
    g.fillRect(shelfW - 2 + (i % 2), ly, 2, 1);
    if (i < 10) g.fillRect(lx + 6, shelfTop - 8 - (i % 3), 2, 1);
  }

  // Window on the right, with curtains and a sill
  const ww = Math.max(30, Math.round(w * 0.12));
  const wh = Math.round(h * 0.3);
  const wx = w - ww - Math.max(8, Math.round(w * 0.035));
  const wy = Math.round(h * 0.16);
  g.fillStyle = '#3d2633';
  g.fillRect(wx - 3, wy - 3, ww + 6, wh + 6);
  for (let y = 0; y < wh; y++) {
    const band = y / wh;
    for (let x = 0; x < ww; x++) {
      const threshold = (BAYER_4X4[y & 3][x & 3] + 0.5) / 16;
      const f = band * 2.2;
      const i = Math.min(2, Math.floor(f));
      const c = f - i > threshold ? i + 1 : i;
      g.fillStyle = ['#110b22', '#1d1336', '#3d2052', '#7b3461'][c];
      g.fillRect(wx + x, wy + y, 1, 1);
    }
  }
  // Moon in the window
  const mx = wx + Math.round(ww * 0.7);
  const my = wy + Math.round(wh * 0.25);
  for (let dy = -4; dy <= 4; dy++) {
    for (let dx = -4; dx <= 4; dx++) {
      if (Math.hypot(dx, dy) > 4.2) continue;
      g.fillStyle = Math.hypot(dx + 2, dy - 1) > 4 ? '#fff1cf' : '#f3d9a6';
      g.fillRect(mx + dx, my + dy, 1, 1);
    }
  }
  // Mullions
  g.fillStyle = '#3d2633';
  g.fillRect(wx + Math.floor(ww / 2) - 1, wy, 2, wh);
  g.fillRect(wx, wy + Math.floor(wh / 2) - 1, ww, 2);
  // Curtains
  for (const side of [-1, 1]) {
    const cx = side < 0 ? wx - 8 : wx + ww + 2;
    for (let y = wy - 6; y < wy + wh + 10; y++) {
      const tie = y > wy + wh * 0.55 && y < wy + wh * 0.6;
      const width = tie ? 4 : y > wy + wh * 0.6 ? 6 + Math.round((y - wy - wh * 0.6) / 6) : 6;
      const x0 = side < 0 ? cx : cx + 6 - width;
      g.fillStyle = '#6b3355';
      g.fillRect(x0, y, width, 1);
      g.fillStyle = '#57284a';
      g.fillRect(x0 + 2, y, 1, 1);
      if (tie) {
        g.fillStyle = '#f0be7c';
        g.fillRect(x0, y, width, 1);
      }
    }
  }
  g.fillStyle = '#4c3438';
  g.fillRect(wx - 12, wy - 7, ww + 24, 2);
  // Sill
  const sill = wy + wh + 3;
  g.fillStyle = '#4f3242';
  g.fillRect(wx - 6, sill, ww + 12, 2);
  g.fillStyle = '#2a171d';
  g.fillRect(wx - 5, sill + 2, ww + 10, 1);
  // Cactus on the sill
  g.fillStyle = '#a8574a';
  g.fillRect(wx + ww - 9, sill - 3, 5, 3);
  g.fillStyle = '#4a7a45';
  g.fillRect(wx + ww - 8, sill - 9, 3, 6);
  g.fillRect(wx + ww - 10, sill - 7, 2, 1);
  g.fillRect(wx + ww - 10, sill - 9, 1, 2);
  g.fillStyle = '#f2b8c6';
  g.fillRect(wx + ww - 7, sill - 10, 1, 1);

  const stars = Array.from({ length: 10 }, () => ({
    x: wx + 1 + Math.floor(rand() * (ww - 2)),
    y: wy + 1 + Math.floor(rand() * wh * 0.6),
    p: rand() * 6,
  }));
  const motes = Array.from({ length: 26 }, () => ({ x: rand() * w, y: rand() * h * 0.85, s: 0.2 + rand() * 0.5, p: rand() * 6 }));

  return {
    w,
    h,
    floorY,
    base,
    candleHalo: halo(10, 'rgba(255, 200, 130, 0.22)'),
    win: { x: wx, y: wy, w: ww, h: wh },
    sill,
    bunX: Math.round(w * 0.36 + rugW * 0.22),
    rug: { x: rugX, w: rugW },
    plantX: Math.round(w * 0.58),
    stars,
    motes,
  };
}

function drawRoom(ctx: CanvasRenderingContext2D, room: Room, t: number, chapter: number, hopAt: number) {
  const { w, floorY } = room;
  ctx.drawImage(room.base, 0, 0);

  // Window stars twinkle
  for (const s of room.stars) {
    if (Math.sin(t / 600 + s.p) < -0.3) continue;
    ctx.fillStyle = '#fff3c4';
    ctx.fillRect(s.x, s.y, 1, 1);
  }

  // Candle on the sill
  const cx = room.win.x + 6;
  const cy = room.sill;
  const flick = Math.sin(t / 80) * 0.5 + Math.sin(t / 33) * 0.3;
  ctx.globalAlpha = 0.85 + flick * 0.15;
  ctx.drawImage(room.candleHalo, cx - 10, cy - 15);
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#ede8f4';
  ctx.fillRect(cx - 1, cy - 5, 3, 5);
  ctx.fillStyle = flick > 0.2 ? '#fff3c4' : '#ffd285';
  ctx.fillRect(cx, cy - 7 - (flick > 0.5 ? 1 : 0), 1, 2);

  // Fairy lights swagged along the ceiling
  for (let swag = 0; swag < 3; swag++) {
    const x0 = Math.round((w / 3) * swag);
    const x1 = Math.round((w / 3) * (swag + 1));
    for (let x = x0; x < x1; x++) {
      const p = (x - x0) / (x1 - x0);
      const y = 17 + Math.round(Math.sin(p * Math.PI) * 6);
      ctx.fillStyle = '#120a16';
      ctx.fillRect(x, y, 1, 1);
      if ((x - x0) % 6 === 3) {
        const i = Math.floor(x / 6);
        const lit = Math.sin(t / 650 + i * 1.7) > -0.4;
        ctx.fillStyle = lit ? FAIRY[i % FAIRY.length] : '#3a2a4a';
        ctx.fillRect(x, y + 1, 1, 2);
        if (lit) {
          ctx.fillStyle = 'rgba(255, 210, 133, 0.14)';
          ctx.fillRect(x - 1, y, 3, 4);
        }
      }
    }
  }

  // Hanging plant swaying from the ceiling
  const sway = Math.round(Math.sin(t / 1400) * 1.5);
  const px = room.plantX;
  ctx.fillStyle = '#5b3a2a';
  for (let y = 0; y < 30; y++) ctx.fillRect(px + Math.round((sway * y) / 30), y, 1, 1);
  const potX = px + sway - 4;
  ctx.fillStyle = '#a8574a';
  ctx.fillRect(potX, 30, 9, 4);
  ctx.fillStyle = '#c86e5c';
  ctx.fillRect(potX, 30, 9, 1);
  for (let i = 0; i < 14; i++) {
    const side = i % 2 ? -1 : 1;
    const lx = potX + (side > 0 ? 8 : 0) + side * Math.round(Math.sin(t / 1600 + i) * 0.8);
    ctx.fillStyle = i % 3 ? '#4a7a45' : '#7fae6b';
    ctx.fillRect(lx, 33 + i, 1, 1);
    if (i % 3 === 0) ctx.fillRect(lx + side, 33 + i, 1, 1);
  }

  // Dust motes drifting through the lamplight
  for (const m of room.motes) {
    const mx = Math.round((m.x + Math.sin(t / 3000 + m.p) * 6 + t * 0.002 * m.s) % w);
    const my = Math.round(m.y + Math.sin(t / 2100 + m.p * 2) * 4);
    const a = 0.25 + Math.sin(t / 900 + m.p) * 0.2;
    if (a <= 0.08) continue;
    ctx.fillStyle = `rgba(255, 220, 160, ${a})`;
    ctx.fillRect(mx, my, 1, 1);
  }

  // Bun on the rug, watching the tour; hops when the chapter changes
  const bx = room.bunX;
  const ground = floorY + 5;
  const hp = Math.min(1, (t - hopAt) / 600);
  const lift = hp < 1 ? Math.round(Math.sin(hp * Math.PI) * 7) : 0;
  const breathe = Math.sin(t / 700) > 0.75 ? 1 : 0;
  const pose: BunPose = hp < 1 ? 'happy' : Math.floor(t / 130) % 29 === 0 ? 'blink' : chapter === 3 ? 'happy' : 'idle';
  ctx.fillStyle = 'rgba(8, 4, 16, 0.4)';
  ctx.fillRect(bx - 6 + Math.round(lift / 3), ground, 12 - Math.round(lift / 2), 1);
  ctx.save();
  ctx.translate(bx, 0);
  ctx.scale(-1, 1);
  ctx.translate(-bx, 0);
  drawBun(ctx, bx - 8, ground - 17 - lift + breathe, pose);
  ctx.restore();
  // A tiny prop for each chapter
  const propX = bx + 9;
  const propY = ground - 4 - lift;
  if (chapter === 0) {
    ctx.fillStyle = '#f0be7c';
    ctx.fillRect(propX, propY - 3, 1, 4);
    ctx.fillStyle = '#e08ca6';
    ctx.fillRect(propX, propY - 4, 1, 1);
  } else if (chapter === 1) {
    ctx.fillStyle = Math.sin(t / 90) > 0 ? '#fff3c4' : '#ffd285';
    ctx.fillRect(propX, propY - 2, 2, 2);
    ctx.fillStyle = 'rgba(255,210,133,0.3)';
    ctx.fillRect(propX - 1, propY - 3, 4, 4);
  } else if (chapter === 2) {
    const f = Math.floor(t / 170) % 4;
    ctx.fillStyle = '#ede8f4';
    ctx.fillRect(propX, propY - 3 - (f === 2 ? 1 : 0), 2, 3);
  } else {
    ctx.fillStyle = '#a8e092';
    ctx.fillRect(propX, propY - 3, 4, 3);
    ctx.fillStyle = '#fff3c4';
    ctx.fillRect(propX + 1, propY - 3, 1, 3);
  }
}

export const CottageBackdrop: React.FC<{ chapter: number; reduceMotion: boolean }> = ({ chapter, reduceMotion }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chapterRef = useRef(chapter);
  const hopAt = useRef(-1e9);
  const start = useRef(0);
  const repaint = useRef<() => void>(() => {});
  const tickerRef = useRef<AmbientTicker | null>(null);
  const recolor = useSceneRecolorRef(() => repaint.current());

  useEffect(() => {
    if (chapterRef.current !== chapter) {
      chapterRef.current = chapter;
      hopAt.current = performance.now() - start.current;
      // Bun's hop plays at full rate; the room settles back to a calm pace after.
      tickerRef.current?.boost(1200);
    }
  }, [chapter]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d', { willReadFrequently: true });
    const host = canvas?.parentElement;
    if (!canvas || !ctx || !host) return;
    start.current = performance.now();
    let room: Room | null = null;

    const build = () => {
      const rect = host.getBoundingClientRect();
      const PX = rect.width >= 1024 ? 4 : 3;
      const w = Math.ceil(rect.width / PX);
      const h = Math.ceil(rect.height / PX);
      // A hidden or collapsed host has no pixels to paint; wait for ResizeObserver.
      if (w < 1 || h < 1) { room = null; return; }
      canvas.width = w;
      canvas.height = h;
      canvas.style.width = `${w * PX}px`;
      canvas.style.height = `${h * PX}px`;
      ctx.imageSmoothingEnabled = false;
      room = buildRoom(w, h);
    };
    const draw = () => {
      if (!room) return;
      drawRoom(ctx, room, reduceMotion ? 0 : performance.now() - start.current, chapterRef.current, hopAt.current);
      recolorCanvas(ctx, recolor.current);
    };
    repaint.current = draw;
    build();
    draw();
    const ro = new ResizeObserver(() => {
      build();
      draw();
    });
    ro.observe(host);
    const ticker = ambientTicker(draw, 12);
    tickerRef.current = ticker;
    const stop = tickWhileVisible(host, ticker, !reduceMotion);
    return () => {
      stop();
      tickerRef.current = null;
      ro.disconnect();
    };
  }, [reduceMotion, recolor]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="absolute top-0 left-0 pointer-events-none"
      style={{ imageRendering: 'pixelated' }}
    />
  );
};
