'use client';

import React, { useEffect, useRef, useState } from 'react';
import styles from './ToolMotionPreview.module.css';
import type { Scene } from './ToolMotionPreview';
import { pixelGradient } from '@/lib/canvas/pixelGradient';

const W = 96;
const H = 54;
const DURATION = 3000;
const GOLD = '#ffd285';
const RED = '#ff6b8b';
const BLUE = '#7ad7f0';
const INK = '#1d1336';
const WHITE = '#fff3e0';
// The motion layer composites the pixel art at this scale with smooth effects on top.
const SCALE = 5;

type Point = readonly [number, number];
type Canvas = CanvasRenderingContext2D;

function clamp(value: number) { return Math.max(0, Math.min(1, value)); }
/** Ease in-out so every demo accelerates and settles like a real hand, never a robot. */
function easeInOut(value: number) {
  const v = clamp(value);
  return v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2;
}

// Loop time of the frame being drawn, so shared helpers (cursor, ripples) can animate.
let frameTime = 0;
let pointer: Point | null = null;
let pointerPressed = false;
// When true, scenes paint only their pixel art; the motion layer draws stage, pointer and effects.
let artOnly = false;
function lerp(a: number, b: number, t: number) { return Math.round(a + (b - a) * t); }
function pixel(ctx: Canvas, x: number, y: number, color: string, size = 1) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), size, size);
}
function box(ctx: Canvas, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}
function line(ctx: Canvas, x0: number, y0: number, x1: number, y1: number, color: string, width = 1) {
  let x = Math.round(x0);
  let y = Math.round(y0);
  const endX = Math.round(x1);
  const endY = Math.round(y1);
  const dx = Math.abs(endX - x);
  const dy = Math.abs(endY - y);
  const sx = x < endX ? 1 : -1;
  const sy = y < endY ? 1 : -1;
  let error = dx - dy;
  while (true) {
    box(ctx, x, y, width, width, color);
    if (x === endX && y === endY) break;
    const twice = 2 * error;
    if (twice > -dy) { error -= dy; x += sx; }
    if (twice < dx) { error += dx; y += sy; }
  }
}
function pathPoint(points: readonly Point[], progress: number): Point {
  const at = clamp(progress) * (points.length - 1);
  const index = Math.min(points.length - 2, Math.floor(at));
  return [lerp(points[index][0], points[index + 1][0], at - index),
    lerp(points[index][1], points[index + 1][1], at - index)];
}
function path(ctx: Canvas, points: readonly Point[], progress: number, color: string, width = 1) {
  const at = clamp(progress) * (points.length - 1);
  for (let i = 0; i < Math.floor(at); i++) {
    line(ctx, points[i][0], points[i][1], points[i + 1][0], points[i + 1][1], color, width);
  }
  const index = Math.min(points.length - 2, Math.floor(at));
  const end = pathPoint(points, progress);
  line(ctx, points[index][0], points[index][1], end[0], end[1], color, width);
}
function ants(ctx: Canvas, points: readonly Point[], t: number) {
  let step = Math.floor(t * 18);
  for (let i = 0; i < points.length - 1; i++) {
    let x = points[i][0];
    let y = points[i][1];
    const [ex, ey] = points[i + 1];
    const dx = Math.abs(ex - x);
    const dy = Math.abs(ey - y);
    const sx = x < ex ? 1 : -1;
    const sy = y < ey ? 1 : -1;
    let error = dx - dy;
    while (true) {
      pixel(ctx, x, y, step % 6 < 3 ? WHITE : INK);
      step++;
      if (x === ex && y === ey) break;
      const twice = 2 * error;
      if (twice > -dy) { error -= dy; x += sx; }
      if (twice < dx) { error += dx; y += sy; }
    }
  }
}
// A little pixel arrow pointer; its tip sits exactly on (x, y).
const POINTER: readonly string[] = [
  'X.....',
  'XX....',
  'XWX...',
  'XWWX..',
  'XWWWX.',
  'XWWWWX',
  'XWWXXX',
  'XXWX..',
  '...XX.',
];
function cursor(ctx: Canvas, x: number, y: number, pressed = false) {
  x = Math.round(x);
  y = Math.round(y);
  pointer = [x, y];
  pointerPressed = pressed;
  if (artOnly) return;
  // Click ripple: a ring expands from the tip as the action begins.
  const ripple = (frameTime - 0.12) / 0.16;
  if (pressed && ripple > 0 && ripple < 1) {
    const radius = 2 + ripple * 7;
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2;
      pixel(ctx, x + Math.cos(a) * radius, y + Math.sin(a) * radius, ripple < 0.5 ? GOLD : '#8a6a4a');
    }
  }
  // Soft shadow, then the arrow; a press squashes it down one pixel.
  const dy = pressed ? 1 : 0;
  POINTER.forEach((row, ry) => {
    for (let rx = 0; rx < row.length; rx++) {
      if (row[rx] === '.') continue;
      pixel(ctx, x + rx + 1, y + ry + 1 + dy, 'rgba(0,0,0,0.45)');
    }
  });
  POINTER.forEach((row, ry) => {
    for (let rx = 0; rx < row.length; rx++) {
      const c = row[rx];
      if (c === '.') continue;
      pixel(ctx, x + rx, y + ry + dy, c === 'X' ? INK : pressed ? '#ffe2a8' : WHITE);
    }
  });
  if (pressed) pixel(ctx, x, y, GOLD);
}
function backdrop(ctx: Canvas) {
  if (artOnly) {
    ctx.clearRect(0, 0, W, H);
    return;
  }
  // Night-desk stage: deep plum with a soft lamp pool and a faint transparency checker.
  box(ctx, 0, 0, W, H, '#140c22');
  for (let y = 7; y < 47; y += 4) {
    for (let x = 9; x < 89; x += 4) {
      const d = Math.hypot(x + 2 - 48, (y + 2 - 27) * 1.6) / 46;
      const lit = d < 0.55;
      box(ctx, x, y, 4, 4, ((x + y) / 4) % 2 ? (lit ? '#2a1f3c' : '#211832') : (lit ? '#231a33' : '#1a132a'));
    }
  }
  box(ctx, 8, 6, 81, 1, '#4a3870');
  box(ctx, 8, 47, 81, 1, '#4a3870');
}

/** Loop polish shared by every scene: a sparkle burst on the result and a soft fade between loops. */
function flourish(ctx: Canvas, t: number) {
  if (artOnly) return;
  const burst = (t - 0.68) / 0.18;
  if (burst > 0 && burst < 1) {
    const [cx, cy] = pointer ?? [48, 27];
    const colors = [GOLD, WHITE, '#dcabdf', BLUE];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.4;
      const r = 3 + burst * 12;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r * 0.8;
      ctx.globalAlpha = 1 - burst;
      pixel(ctx, x, y, colors[i % colors.length]);
      if (i % 2 === 0 && burst < 0.6) {
        pixel(ctx, x - 1, y, colors[i % colors.length]);
        pixel(ctx, x + 1, y, colors[i % colors.length]);
        pixel(ctx, x, y - 1, colors[i % colors.length]);
        pixel(ctx, x, y + 1, colors[i % colors.length]);
      }
    }
    ctx.globalAlpha = 1;
  }
  // Fade to the stage colour at the very end, and back in at the start, so loops breathe.
  const fade = t > 0.93 ? (t - 0.93) / 0.07 : t < 0.03 ? 1 - t / 0.03 : 0;
  if (fade > 0) {
    ctx.globalAlpha = Math.min(1, fade);
    box(ctx, 0, 0, W, H, '#140c22');
    ctx.globalAlpha = 1;
  }
}
function outlineRect(ctx: Canvas, x: number, y: number, w: number, h: number, color: string) {
  line(ctx, x, y, x + w, y, color);
  line(ctx, x + w, y, x + w, y + h, color);
  line(ctx, x + w, y + h, x, y + h, color);
  line(ctx, x, y + h, x, y, color);
}
function ellipse(ctx: Canvas, cx: number, cy: number, rx: number, ry: number, color: string) {
  if (rx < 2 || ry < 2) return;
  for (let i = 0; i <= 80; i++) {
    const angle = (i / 80) * Math.PI * 2;
    pixel(ctx, cx + Math.cos(angle) * rx, cy + Math.sin(angle) * ry, color);
  }
}
interface SpriteStyle {
  base?: string;
  highlight?: string;
  shadow?: string;
  outline?: string;
  flat?: boolean;
  normal?: boolean;
  bevel?: boolean;
  selout?: boolean;
  glint?: boolean;
  lightFromRight?: boolean;
  lightPos?: Point;
}

function sampleSprite(ctx: Canvas, cx = 48, cy = 27, style: SpriteStyle = {}) {
  const base = style.base ?? RED;
  const highlight = style.highlight ?? '#ffa8ba';
  const shadow = style.shadow ?? '#992847';
  const outlineColor = style.outline ?? INK;

  // Handcrafted 16-bit cozy pixel heart spans: [y, left, right]
  const rows: readonly [number, number, number][] = [
    [-6, -13, 13],
    [-5, -13, 13],
    [-4, -13, 13],
    [-3, -13, 13],
    [-2, -13, 13],
    [-1, -13, 13],
    [0, -12, 12],
    [1, -12, 12],
    [2, -11, 11],
    [3, -10, 10],
    [4, -9, 9],
    [5, -8, 8],
    [6, -7, 7],
    [7, -6, 6],
    [8, -5, 5],
    [9, -3, 3],
    [10, -1, 1],
    [11, 0, 0],
  ];

  for (let y = -10; y <= 11; y++) {
    let spans: readonly (readonly [number, number])[];
    if (y === -10) {
      spans = [[-9, -5], [5, 9]];
    } else if (y === -9) {
      spans = [[-11, -3], [3, 11]];
    } else if (y === -8) {
      spans = [[-12, -2], [2, 12]];
    } else if (y === -7) {
      spans = [[-13, -1], [1, 13]];
    } else {
      const match = rows.find(([row]) => row === y);
      spans = match ? [[match[1], match[2]]] : [];
    }

    for (const [left, right] of spans) {
      for (let x = left; x <= right; x++) {
        const isTop = y === -10 || (y === -7 && (x === -1 || x === 1)) || (y === -6 && x === 0);
        const isBottom = y === 11;
        const edge = x === left || x === right || isTop || isBottom;

        // Compute 2.5D inflated surface normal (Nx, Ny, Nz) for realistic photometric dome shading
        let dx: number;
        let dy: number;
        if (y < 1) {
          dx = (x < 0 ? x - (-6) : x - 6) / 6.5;
          dy = (y - (-4)) / 6.0;
        } else {
          const halfW = Math.max(1, 12 * (1 - (y - 1) / 10.5));
          dx = x / halfW;
          dy = (y - 1) / 8.0;
        }

        const len2 = dx * dx + dy * dy;
        let Nx = dx;
        let Ny = dy;
        let Nz = len2 < 1 ? Math.sqrt(1 - len2) : 0.15;
        const norm = Math.hypot(Nx, Ny, Nz) || 1;
        Nx /= norm;
        Ny /= norm;
        Nz /= norm;

        // Compute directional light vector (Lx, Ly, Lz)
        let Lx: number;
        let Ly: number;
        let Lz: number;
        if (style.lightPos) {
          const lx = style.lightPos[0] - (cx + x);
          const ly = style.lightPos[1] - (cy + y);
          const lz = 22;
          const lLen = Math.hypot(lx, ly, lz) || 1;
          Lx = lx / lLen;
          Ly = ly / lLen;
          Lz = lz / lLen;
        } else if (style.lightFromRight) {
          Lx = 0.577;
          Ly = -0.577;
          Lz = 0.577;
        } else {
          Lx = -0.577;
          Ly = -0.577;
          Lz = 0.577;
        }

        let color = base;

        if (style.normal) {
          // Tangent space normal map RGB encoding (matches real engine)
          const r = Math.round((Nx * 0.5 + 0.5) * 255);
          const g = Math.round((-Ny * 0.5 + 0.5) * 255);
          const b = Math.round((Nz * 0.5 + 0.5) * 255);
          color = `rgb(${r},${g},${b})`;
        } else if (edge) {
          const dotEdge = Nx * Lx + Ny * Ly;
          color = style.selout
            ? (dotEdge > 0.05 ? highlight : shadow)
            : style.bevel
            ? (dotEdge > 0.05 ? GOLD : '#392c61')
            : outlineColor;
        } else if (!style.flat) {
          // Photometric diffuse (N · L) & Blinn-Phong specular (N · H)
          const diffuse = Math.max(0, Nx * Lx + Ny * Ly + Nz * Lz);
          const Hx = Lx;
          const Hy = Ly;
          const Hz = Lz + 1;
          const hLen = Math.hypot(Hx, Hy, Hz) || 1;
          const NdotH = Math.max(0, Nx * (Hx / hLen) + Ny * (Hy / hLen) + Nz * (Hz / hLen));
          const specular = Math.pow(NdotH, 14);

          // Total photometric irradiance with ambient term
          const irradiance = 0.22 + 0.78 * diffuse;

          if (specular > 0.62) {
            color = '#fff5f7'; // Specular highlight glint
          } else if (irradiance > 0.78) {
            color = highlight; // Curving highlight band
          } else if (irradiance > 0.44) {
            color = base; // Midtone body
          } else if (irradiance > 0.24) {
            color = shadow; // Curving shadow terminator
          } else {
            color = '#7a1936'; // Ambient occlusion crease
          }
        }
        pixel(ctx, cx + x, cy + y, color);
      }
    }
  }

  // Specular sparkle glint on the heart
  if (style.glint) {
    box(ctx, cx - 7, cy - 7, 3, 1, WHITE);
    box(ctx, cx - 6, cy - 8, 1, 3, WHITE);
  }
}
function specks(ctx: Canvas, visible: (index: number) => boolean = () => true) {
  const dots: Point[] = [[24, 19], [71, 15], [74, 36], [28, 38]];
  dots.forEach(([x, y], index) => { if (visible(index)) pixel(ctx, x, y, index % 2 ? BLUE : RED); });
}
function wipeSprite(ctx: Canvas, progress: number, before: SpriteStyle, after: SpriteStyle) {
  sampleSprite(ctx, 48, 27, before);
  if (progress > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(29, 12, Math.round(39 * clamp(progress)), 31);
    ctx.clip();
    sampleSprite(ctx, 48, 27, after);
    ctx.restore();
    if (progress < 1) box(ctx, 29 + Math.round(39 * progress), 12, 1, 31, GOLD);
  }
}
function swatches(ctx: Canvas, colors: readonly string[], count = colors.length) {
  const left = Math.round((96 - colors.length * 10) / 2);
  colors.forEach((color, index) => {
    if (index >= count) return;
    box(ctx, left + index * 10, 41, 8, 6, color);
    outlineRect(ctx, left + index * 10, 41, 8, 6, '#554660');
  });
}

export function drawToolPreviewFrame(ctx: Canvas, scene: Scene, t: number) {
  frameTime = t;
  pointer = null;
  pointerPressed = false;
  const action = easeInOut((t - 0.12) / 0.56);
  const done = t >= 0.68;
  let label = done ? 'RESULT' : action > 0 ? 'ACTION' : 'BEFORE';
  backdrop(ctx);
  switch (scene) {
    case 'stroke': {
      const points: Point[] = [[24, 35], [31, 30], [38, 31], [44, 22], [52, 25], [59, 16], [70, 20]];
      path(ctx, points, action, GOLD, 2);
      if (!done) { const [x, y] = pathPoint(points, action); cursor(ctx, x, y, action > 0); }
      label = done ? 'PIXEL STROKE' : 'DRAG PEN';
      break;
    }
    case 'curve': {
      const start: Point = [22, 37];
      const end: Point = [73, 35];
      const handle: Point = [47, lerp(34, 13, action)];
      line(ctx, start[0], start[1], handle[0], handle[1], '#735a75');
      line(ctx, handle[0], handle[1], end[0], end[1], '#735a75');
      for (let i = 0; i <= 40; i++) {
        const u = i / 40;
        pixel(ctx, (1-u)*(1-u)*start[0] + 2*(1-u)*u*handle[0] + u*u*end[0],
          (1-u)*(1-u)*start[1] + 2*(1-u)*u*handle[1] + u*u*end[1], GOLD);
      }
      box(ctx, start[0]-1, start[1]-1, 3, 3, BLUE);
      box(ctx, end[0]-1, end[1]-1, 3, 3, BLUE);
      box(ctx, handle[0]-1, handle[1]-1, 3, 3, WHITE);
      if (!done) cursor(ctx, handle[0], handle[1], action > 0);
      label = done ? 'CURVE SET' : 'DRAG HANDLE';
      break;
    }
    case 'erase': {
      sampleSprite(ctx, 48, 27);
      const erased = Math.round(action * 26);
      if (action > 0) {
        for (let y = 18; y < 35; y++) {
          for (let x = 38; x < 38 + erased; x++) {
            pixel(ctx, x, y, ((x + y) % 2) ? '#21192d' : '#1a1425');
          }
        }
      }
      if (!done) cursor(ctx, 38 + erased, 26, action > 0);
      label = done ? 'PIXELS REMOVED' : 'DRAG ERASER';
      break;
    }
    case 'fill': {
      // An empty outlined heart; paint floods outward from the click point.
      sampleSprite(ctx, 48, 27, { flat: true, base: '#2c2046', outline: '#e9dcf2' });
      if (action > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(44, 26, Math.max(0.5, action * 30), 0, Math.PI * 2);
        ctx.clip();
        sampleSprite(ctx, 48, 27, { flat: true, base: RED, outline: '#e9dcf2' });
        ctx.restore();
      }
      if (!done) cursor(ctx, 44, 26, action > 0);
      label = done ? 'CONNECTED AREA' : 'CLICK TO FILL';
      break;
    }
    case 'gradient': {
      const end = 26 + Math.max(1, Math.round(action * 44));
      if (action > 0) {
        const ramp = pixelGradient(48, 24, { x: 1, y: 12 }, { x: end - 25, y: 12 }, {
          shape: 'linear', dither: true, colors: [RED, GOLD, BLUE], selection: null, mask: null,
        });
        for (let y = 0; y < 24; y++) for (let x = 0; x < 48; x++) {
          const i = (y * 48 + x) * 4;
          pixel(ctx, x + 24, y + 16, `rgb(${ramp[i]},${ramp[i + 1]},${ramp[i + 2]})`);
        }
      }
      outlineRect(ctx, 23, 15, 50, 26, WHITE);
      if (!done) { line(ctx, 26, 28, end, 28, INK); cursor(ctx, end, 28, action > 0); }
      label = done ? 'PALETTE COLORS ONLY' : 'DRAG A RAMP';
      break;
    }
    case 'dither': {
      box(ctx, 24, 16, 25, 24, RED);
      box(ctx, 49, 16, 24, 24, '#354d9b');
      const through = Math.round(action * 24);
      for (let y = 17; y < 40; y++) {
        if (y - 16 > through) continue;
        for (let x = 43; x <= 54; x++) {
          if ((x + y) % 2 === 0) pixel(ctx, x, y, x < 49 ? '#354d9b' : RED);
        }
      }
      if (!done) cursor(ctx, 49, 16 + through, action > 0);
      label = done ? 'DITHER BLEND' : 'BRUSH BETWEEN';
      break;
    }
    case 'recolor': {
      const changed = action > 0.42;
      box(ctx, 27, 18, 16, 12, changed ? BLUE : RED);
      box(ctx, 54, 29, 16, 11, changed ? BLUE : RED);
      box(ctx, 56, 15, 9, 8, GOLD);
      if (!done) cursor(ctx, 35, 24, action > 0);
      label = changed ? 'BOTH COLORS SWAP' : 'CLICK SOURCE RED';
      break;
    }
    case 'erase-color': {
      sampleSprite(ctx, 48, 27, { flat: true });
      const cyan: Point[] = [[22, 19], [32, 23], [64, 20], [72, 35], [29, 36]];
      cyan.forEach(([x, y], i) => { if (action < (i + 1) / cyan.length) box(ctx, x, y, 4, 2, BLUE); });
      if (!done) cursor(ctx, 24, 20, action > 0);
      label = done ? 'ONLY CYAN ERASED' : 'CLICK CYAN';
      break;
    }
    case 'select-box': {
      sampleSprite(ctx);
      const w = Math.round(action * 40);
      const h = Math.round(action * 31);
      if (done) ants(ctx, [[28, 11], [68, 11], [68, 42], [28, 42], [28, 11]], t);
      else outlineRect(ctx, 28, 11, w, h, WHITE);
      if (!done) cursor(ctx, 28 + w, 11 + h, action > 0);
      label = done ? 'RECTANGLE SELECTED' : 'DRAG MARQUEE';
      break;
    }
    case 'select-lasso': {
      sampleSprite(ctx);
      pixel(ctx, 76, 35, RED, 2);
      const loop: Point[] = [[48, 14], [38, 15], [32, 21], [33, 31], [42, 38],
        [48, 41], [54, 38], [63, 31], [64, 21], [58, 15], [48, 14]];
      if (done) ants(ctx, loop, t);
      else {
        path(ctx, loop, action, WHITE);
        const [x, y] = pathPoint(loop, action);
        cursor(ctx, x, y, action > 0);
      }
      label = done ? 'FREEFORM SELECTED' : 'TRACE ARTWORK';
      break;
    }
    case 'select-wand': {
      box(ctx, 22, 18, 21, 16, RED);
      box(ctx, 29, 14, 9, 4, RED);
      box(ctx, 57, 29, 13, 10, RED);
      box(ctx, 61, 17, 10, 7, BLUE);
      if (action > 0.35) ants(ctx, [[22,18],[29,18],[29,14],[38,14],[38,18],
        [43,18],[43,34],[22,34],[22,18]], t);
      if (!done) cursor(ctx, 32, 25, action > 0);
      label = done ? 'CONNECTED RED ONLY' : 'CLICK ONE REGION';
      break;
    }
    case 'line': {
      line(ctx, 23, 36, lerp(23, 72, action), lerp(36, 17, action), GOLD, 2);
      if (!done) cursor(ctx, lerp(23, 72, action), lerp(36, 17, action), action > 0);
      label = done ? 'STRAIGHT PIXELS' : 'DRAG LINE';
      break;
    }
    case 'iso': {
      const steps = Math.round(action * 23);
      for (let i = 0; i < steps; i++) box(ctx, 25 + i * 2, 16 + i, 2, 1, GOLD);
      if (!done) cursor(ctx, 25 + steps * 2, 16 + steps, action > 0);
      label = done ? '2:1 PIXEL STEPS' : 'DRAG ISO LINE';
      break;
    }
    case 'rectangle': {
      const w = Math.round(action * 49);
      const h = Math.round(action * 25);
      outlineRect(ctx, 23, 15, w, h, GOLD);
      if (!done) cursor(ctx, 23 + w, 15 + h, action > 0);
      label = done ? 'RECTANGLE' : 'DRAG CORNERS';
      break;
    }
    case 'ellipse': {
      const rx = Math.max(2, Math.round(action * 25));
      const ry = Math.max(2, Math.round(action * 14));
      ellipse(ctx, 48, 27, rx, ry, BLUE);
      if (!done) cursor(ctx, 48 + rx, 27 + ry, action > 0);
      label = done ? 'PIXEL ELLIPSE' : 'DRAG ELLIPSE';
      break;
    }
    case 'depth': {
      wipeSprite(ctx, action, { flat: true }, { bevel: true, glint: true });
      if (!done) cursor(ctx, lerp(35, 60, action), 17, action > 0);
      label = done ? 'BEVELED SURFACE' : 'CARVE EDGE';
      break;
    }
    case 'eyedropper': {
      box(ctx, 26, 18, 18, 17, RED);
      box(ctx, 44, 18, 22, 17, BLUE);
      box(ctx, 66, 18, 7, 17, GOLD);
      box(ctx, 35, 42, 10, 6, action > 0.42 ? BLUE : RED);
      outlineRect(ctx, 35, 42, 10, 6, WHITE);
      if (!done) cursor(ctx, lerp(34, 54, action), 25, action > 0);
      label = done ? 'FOREGROUND: BLUE' : 'CLICK BLUE PIXEL';
      break;
    }
    case 'light': {
      const lightX = lerp(24, 74, action);
      const lightY = lerp(16, 18, action);
      sampleSprite(ctx, 48, 28, { lightPos: [lightX, lightY] });
      box(ctx, lightX - 2, lightY - 2, 5, 5, GOLD);
      pixel(ctx, lightX, lightY, WHITE);
      line(ctx, lightX, lightY + 3, 48, 24, '#a57d6d');
      if (!done) cursor(ctx, lightX, lightY, action > 0);
      label = done ? 'LIGHT FROM RIGHT' : 'DRAG LIGHT';
      break;
    }
    case 'bake-light': {
      wipeSprite(ctx, action, { flat: true }, { glint: true });
      label = done ? 'SHADING APPLIED' : 'BAKE LIGHT';
      break;
    }
    case 'normal-map': {
      wipeSprite(ctx, action, {}, { normal: true });
      label = done ? 'NORMAL VIEW ONLY' : 'TOGGLE VIEW';
      break;
    }
    case 'bake-normal': {
      sampleSprite(ctx, 34, 27);
      box(ctx, 58, 12, 28, 32, '#29364d');
      outlineRect(ctx, 58, 12, 28, 32, BLUE);
      if (action > 0.2) {
        const rows = Math.round((action - 0.2) / 0.8 * 17);
        for (let y = 0; y < rows; y++) {
          for (let x = 0; x < 19; x++) {
            const r = Math.round(75 + x * 5);
            const g = Math.round(70 + y * 7);
            pixel(ctx, 62 + x, 18 + y, 'rgb(' + r + ',' + g + ',220)');
          }
        }
      }
      label = done ? 'NEW NORMAL LAYER' : 'BAKE NORMALS';
      break;
    }
    case 'glow': {
      wipeSprite(ctx, action, {}, { glint: true });
      if (action > 0.6) {
        box(ctx, 39, 20, 5, 1, WHITE);
        box(ctx, 41, 18, 1, 5, WHITE);
      }
      label = done ? 'SPECULAR GLINT' : 'ADD REFLECTION';
      break;
    }
    case 'sel-out': {
      wipeSprite(ctx, action, { outline: '#08070c' }, { selout: true });
      label = done ? 'COLORED OUTLINE' : 'SOFTEN EDGE';
      break;
    }
    case 'shadow': {
      box(ctx, 10, 42, 76, 1, '#62516a');
      if (action > 0) {
        const reach = Math.round(action * 19);
        box(ctx, 42, 43, 20 + reach, 3, '#100c19');
        box(ctx, 46, 41, 14 + reach, 2, '#181121');
      }
      sampleSprite(ctx, 42, 28);
      box(ctx, 23, 15, 4, 4, GOLD);
      label = done ? 'GROUND SHADOW' : 'CAST ON FLOOR';
      break;
    }
    case 'seamless': {
      const repeat = Math.max(1, Math.round(1 + action * 11));
      for (let i = 0; i < repeat; i++) {
        const col = i % 4;
        const row = Math.floor(i / 4);
        const x = 14 + col * 18;
        const y = 10 + row * 12;
        box(ctx, x + 1, y + 1, 16, 10, '#303957');
        box(ctx, x + 3, y + 3, 3, 3, BLUE);
        box(ctx, x + 11, y + 5, 3, 3, GOLD);
        line(ctx, x + 7, y + 9, x + 10, y + 2, '#899bd0');
      }
      if (!done) outlineRect(ctx, 14, 10, 18, 12, GOLD);
      label = done ? 'CHECK TILE SEAMS' : 'REPEAT SELECTED TILE';
      break;
    }
    case 'tiles': {
      for (let i = 0; i < 9; i++) {
        const x = 14 + (i % 3) * 11;
        const y = 13 + Math.floor(i / 3) * 11;
        box(ctx, x, y, 10, 10, i % 2 ? '#3f6974' : '#8c6b54');
        box(ctx, x + 2, y + 2, 3, 3, i % 2 ? BLUE : GOLD);
      }
      if (action > 0.1) {
        line(ctx, 53, 27, 60, 27, GOLD);
        box(ctx, 61, 23, 3, 9, GOLD);
        const count = Math.round(action * 2);
        for (let i = 0; i < count; i++) {
          const x = 68 + i * 11;
          box(ctx, x, 21, 10, 10, i ? '#3f6974' : '#8c6b54');
          box(ctx, x + 2, 23, 3, 3, i ? BLUE : GOLD);
        }
      }
      label = done ? '2 UNIQUE TILES' : 'SLICE & DEDUPE';
      break;
    }
    case 'autotile': {
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          const x = 30 + col * 12;
          const y = 9 + row * 12;
          const land = col === 1 || row === 1;
          box(ctx, x, y, 11, 11, land ? '#36836c' : '#60475a');
          if (action > 0.45 && land) {
            if (col === 0) box(ctx, x + 9, y, 2, 11, GOLD);
            if (col === 2) box(ctx, x, y, 2, 11, GOLD);
            if (row === 0) box(ctx, x, y + 9, 11, 2, GOLD);
            if (row === 2) box(ctx, x, y, 11, 2, GOLD);
          }
        }
      }
      label = done ? 'EDGES CONNECT' : 'BUILD TRANSITIONS';
      break;
    }
    case 'clean': {
      sampleSprite(ctx);
      specks(ctx);
      const scanX = lerp(17, 79, action);
      if (action > 0.18) outlineRect(ctx, 22, 17, 4, 4, GOLD);
      if (action > 0.72) outlineRect(ctx, 69, 13, 4, 4, GOLD);
      if (!done) box(ctx, scanX, 12, 1, 32, BLUE);
      label = done ? 'ISSUES MARKED' : 'SCAN ONLY';
      break;
    }
    case 'apply-cleanup': {
      sampleSprite(ctx, 48, 27, { flat: true });
      box(ctx, 46, 25, 3, 2, action > 0.6 ? RED : '#867b79');
      specks(ctx, (index) => action < (index + 1) / 4);
      if (!done) box(ctx, lerp(18, 78, action), 12, 1, 32, '#7bd8ab');
      label = done ? 'ARTWORK CLEANED' : 'APPLY CLEANUP';
      break;
    }
    case 'jaggies': {
      const rough: Point[] = [[22,38],[30,38],[30,31],[38,31],[38,29],[47,29],[47,21],[55,21],[55,17],[70,17]];
      path(ctx, rough, 1, RED, 2);
      if (action > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(18, 13, Math.round(action * 60), 32);
        ctx.clip();
        backdrop(ctx);
        line(ctx, 22, 38, 70, 17, GOLD, 2);
        ctx.restore();
      }
      label = done ? 'EVEN PIXEL STEPS' : 'SMOOTH CORNERS';
      break;
    }
    case 'thin': {
      const width = Math.max(1, 5 - Math.round(action * 4));
      line(ctx, 24, 34, 72, 19, RED, width);
      if (!done) box(ctx, lerp(22, 75, action), 14, 1, 27, BLUE);
      label = done ? '1PX LINE' : 'THIN STROKE';
      break;
    }
    case 'strays': {
      box(ctx, 40, 19, 14, 13, RED);
      box(ctx, 54, 26, 8, 6, RED);
      specks(ctx, (index) => action < (index + 1) / 4);
      box(ctx, 24, 32, 2, 1, BLUE);
      if (!done) cursor(ctx, lerp(24, 73, action), 19, action > 0);
      label = done ? 'LOOSE DOTS GONE' : 'CHECK NEIGHBORS';
      break;
    }
    case 'rotate': {
      const angle = action * Math.PI / 4;
      const heartPoints: Point[] = [
        [-3,-4],[-2,-4],[-1,-4],[1,-4],[2,-4],[3,-4],
        [-4,-3],[-3,-3],[-2,-3],[-1,-3],[0,-3],[1,-3],[2,-3],[3,-3],[4,-3],
        [-4,-2],[-3,-2],[-2,-2],[-1,-2],[0,-2],[1,-2],[2,-2],[3,-2],[4,-2],
        [-4,-1],[-3,-1],[-2,-1],[-1,-1],[0,-1],[1,-1],[2,-1],[3,-1],[4,-1],
        [-3,0],[-2,0],[-1,0],[0,0],[1,0],[2,0],[3,0],
        [-3,1],[-2,1],[-1,1],[0,1],[1,1],[2,1],[3,1],
        [-2,2],[-1,2],[0,2],[1,2],[2,2],
        [-1,3],[0,3],[1,3],
        [0,4],
      ];
      heartPoints.forEach(([x, y]) => {
        const rx = Math.round(x * Math.cos(angle) - y * Math.sin(angle));
        const ry = Math.round(x * Math.sin(angle) + y * Math.cos(angle));
        const edge = Math.abs(x) >= 3 || y >= 3 || y === -4;
        pixel(ctx, 48 + rx, 27 + ry, edge ? INK : (x < 0 ? '#ffa8ba' : RED));
      });
      box(ctx, 73, 37, 18, 9, INK);
      ctx.fillStyle = WHITE;
      ctx.font = '7px monospace';
      ctx.fillText(Math.round(action * 45) + '°', 76, 44);
      label = done ? 'CRISP 45° TURN' : 'ROTATE PIXELS';
      break;
    }
    case 'dither-atkinson':
    case 'dither-smooth': {
      const atkinson = scene === 'dither-atkinson';
      for (let y = 16; y < 40; y++) {
        for (let x = 24; x < 73; x++) {
          const shade = (x - 24) / 49;
          let color = shade < 0.5 ? RED : '#354d9b';
          if (x - 24 < action * 49) {
            const threshold = atkinson
              ? ((x * 3 + y * 5) % 8) / 8
              : ((x * 13 + y * 19 + (x ^ y)) % 17) / 17;
            color = threshold < shade ? '#354d9b' : RED;
          }
          pixel(ctx, x, y, color);
        }
      }
      if (!done) box(ctx, 24 + Math.round(action * 49), 15, 1, 26, GOLD);
      label = done ? (atkinson ? 'ATKINSON DOTS' : 'SMOOTH DOTS') : 'DITHER SHADES';
      break;
    }
    case 'palette':
    case 'palette-snap': {
      wipeSprite(ctx, action, {
        base: '#89736d', highlight: '#b4a79a', shadow: '#61565b',
      }, {});
      swatches(ctx, [INK, '#922a58', RED, '#ffb6ba', WHITE]);
      label = done ? 'ON-PALETTE COLORS' : 'MATCH SWATCHES';
      break;
    }
    case 'palette-harmonize': {
      sampleSprite(ctx);
      const colors = [INK, '#922a58', RED, GOLD, '#66c6e8', '#8fd596'];
      swatches(ctx, colors, 3 + Math.round(action * 3));
      label = done ? 'ACCENTS ADDED' : 'EXPAND PALETTE';
      break;
    }
    case 'palette-ramp': {
      sampleSprite(ctx);
      const colors = ['#351733', '#7a2855', RED, '#ff9ca9', '#ffe1df'];
      swatches(ctx, colors, Math.max(1, Math.round(1 + action * 4)));
      label = done ? '5 SHADE RAMP' : 'GENERATE SHADES';
      break;
    }
    case 'mood-sunset':
    case 'mood-moonlight':
    case 'mood-neon': {
      const after: SpriteStyle = scene === 'mood-sunset'
        ? { base: '#f18b53', highlight: '#ffe0a2', shadow: '#93405a' }
        : scene === 'mood-moonlight'
          ? { base: '#5d88c9', highlight: '#b9d7ee', shadow: '#30385e' }
          : { base: '#ed5ba6', highlight: '#8de5f2', shadow: '#6b328f' };
      wipeSprite(ctx, action, {}, after);
      label = done ? 'COLORS REGRADED' : 'APPLY COLOR MOOD';
      break;
    }
    case 'animate': {
      for (let i = 0; i < 3; i++) {
        const x = 12 + i * 27;
        box(ctx, x, 14, 22, 27, '#293042');
        outlineRect(ctx, x, 14, 22, 27, i === 1 ? GOLD : '#64738a');
        const showMiddle = i !== 1 || action > 0.45;
        if (showMiddle) {
          const centerY = i === 0 ? 29 : i === 1 ? 25 : 21;
          box(ctx, x + 6, centerY - 4, 9, 8, RED);
          box(ctx, x + 7, centerY - 5, 7, 2, '#ffb6ba');
        }
        ctx.fillStyle = WHITE;
        ctx.font = '6px monospace';
        ctx.fillText(String(i + 1), x + 9, 47);
      }
      label = done ? 'MIDDLE FRAME MADE' : 'BETWEEN KEYFRAMES';
      break;
    }
    default: break;
  }
  flourish(ctx, t);
  return label;
}

// ─────────────────────────────────────────────────────────────────────────────
// Motion layer: composites the pixel art like a motion-graphics shot.
// ─────────────────────────────────────────────────────────────────────────────

const CW = W * SCALE;
const CH = H * SCALE;
const ART_BOX = { x: 8 * SCALE, y: 6 * SCALE, w: 81 * SCALE, h: 42 * SCALE };

const easeOutBack = (v: number) => {
  const c = 1.7;
  const x = clamp(v) - 1;
  return 1 + (c + 1) * x * x * x + c * x * x;
};
const easeOut = (v: number) => 1 - Math.pow(1 - clamp(v), 3);

function roundRect(ctx: Canvas, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function star(ctx: Canvas, x: number, y: number, r: number, rot: number) {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = rot + (i * Math.PI) / 4;
    const rr = i % 2 ? r * 0.32 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}

const BOKEH = Array.from({ length: 9 }, (_, i) => ({
  x: (i * 0.137 + 0.08) % 1,
  y: (i * 0.291 + 0.15) % 1,
  r: 26 + ((i * 37) % 40),
  speed: 0.03 + (i % 4) * 0.012,
  color: i % 3 === 0 ? '255, 210, 133' : i % 3 === 1 ? '199, 146, 223' : '122, 215, 240',
}));

function stageBackground(ctx: Canvas, t: number, time: number) {
  const g = ctx.createLinearGradient(0, 0, 0, CH);
  g.addColorStop(0, '#1d1238');
  g.addColorStop(1, '#0c0618');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, CW, CH);
  const glow = ctx.createRadialGradient(CW / 2, CH * 0.55, 10, CW / 2, CH * 0.55, CW * 0.55);
  glow.addColorStop(0, 'rgba(120, 80, 190, 0.45)');
  glow.addColorStop(1, 'rgba(120, 80, 190, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, CW, CH);
  // Drifting bokeh lights
  for (const b of BOKEH) {
    const x = ((b.x + time * b.speed * 0.0001) % 1.2 - 0.1) * CW;
    const y = (b.y + Math.sin(time * 0.0004 + b.r) * 0.03) * CH;
    const rg = ctx.createRadialGradient(x, y, 0, x, y, b.r);
    rg.addColorStop(0, `rgba(${b.color}, 0.16)`);
    rg.addColorStop(1, `rgba(${b.color}, 0)`);
    ctx.fillStyle = rg;
    ctx.fillRect(x - b.r, y - b.r, b.r * 2, b.r * 2);
  }
  // Fine dot grid
  ctx.fillStyle = 'rgba(255, 243, 224, 0.05)';
  for (let y = 15; y < CH; y += 30) for (let x = 15; x < CW; x += 30) ctx.fillRect(x, y, 2, 2);
  void t;
}

function artboard(ctx: Canvas) {
  const { x, y, w, h } = ART_BOX;
  ctx.save();
  ctx.shadowColor = 'rgba(4, 2, 10, 0.7)';
  ctx.shadowBlur = 34;
  ctx.shadowOffsetY = 12;
  roundRect(ctx, x, y, w, h, 14);
  ctx.fillStyle = '#1a1130';
  ctx.fill();
  ctx.restore();
  ctx.save();
  roundRect(ctx, x, y, w, h, 14);
  ctx.clip();
  for (let yy = y; yy < y + h; yy += 20) {
    for (let xx = x; xx < x + w; xx += 20) {
      if (((xx - x) / 20 + (yy - y) / 20) % 2) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
        ctx.fillRect(xx, yy, 20, 20);
      }
    }
  }
  const sheen = ctx.createLinearGradient(x, y, x, y + h);
  sheen.addColorStop(0, 'rgba(255, 255, 255, 0.06)');
  sheen.addColorStop(0.4, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
  ctx.save();
  roundRect(ctx, x + 1, y + 1, w - 2, h - 2, 13);
  ctx.strokeStyle = 'rgba(199, 146, 223, 0.35)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function vectorPointer(ctx: Canvas, x: number, y: number, pressed: boolean, tilt: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  const s = pressed ? 0.88 : 1;
  ctx.scale(s, s);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, 26);
  ctx.lineTo(7, 20);
  ctx.lineTo(12, 30);
  ctx.lineTo(17, 28);
  ctx.lineTo(12, 18);
  ctx.lineTo(21, 18);
  ctx.closePath();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 5;
  ctx.fillStyle = pressed ? GOLD : '#ffffff';
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.restore();
}

interface Motion {
  trail: Point[];
  lastX: number | null;
  tilt: number;
}

function composite(ctx: Canvas, art: HTMLCanvasElement, t: number, time: number, motion: Motion) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.filter = 'none';
  stageBackground(ctx, t, time);

  // Camera: push in toward the action, then settle on the result with a little overshoot.
  const action = clamp((t - 0.12) / 0.56);
  const focus: Point = pointer ? [pointer[0] * SCALE, pointer[1] * SCALE] : [CW / 2, CH / 2];
  const push = Math.sin(action * Math.PI) * 0.07;
  const settle = t > 0.68 && t < 0.86 ? Math.sin(((t - 0.68) / 0.18) * Math.PI) * 0.035 : 0;
  const zoom = 1 + push + settle;
  const ox = CW / 2 + (focus[0] - CW / 2) * 0.45;
  const oy = CH / 2 + (focus[1] - CH / 2) * 0.45;
  ctx.save();
  ctx.translate(ox, oy);
  ctx.scale(zoom, zoom);
  ctx.translate(-ox, -oy);

  artboard(ctx);

  // Art glow for depth, then the crisp pixels on top
  ctx.save();
  ctx.filter = 'blur(12px)';
  ctx.globalAlpha = 0.5;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(art, 0, 0, CW, CH);
  ctx.restore();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(art, 0, 0, CW, CH);

  // Pointer motion trail
  if (pointer) {
    const [px, py] = [pointer[0] * SCALE, pointer[1] * SCALE];
    motion.trail.push([px, py]);
    if (motion.trail.length > 9) motion.trail.shift();
    const vx = motion.lastX === null ? 0 : px - motion.lastX;
    motion.tilt += (Math.max(-0.35, Math.min(0.35, vx * 0.03)) - motion.tilt) * 0.25;
    motion.lastX = px;
    motion.trail.forEach(([tx, ty], i) => {
      const a = (i + 1) / motion.trail.length;
      ctx.beginPath();
      ctx.arc(tx, ty, 3 + a * 4, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 210, 133, ${0.28 * a})`;
      ctx.fill();
    });
    // Click ripples as the action starts
    const ripple = (t - 0.12) / 0.22;
    if (pointerPressed && ripple > 0 && ripple < 1) {
      for (const lag of [0, 0.25]) {
        const r = easeOut(ripple - lag) * 46;
        if (r <= 0) continue;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.strokeStyle = lag ? `rgba(199, 146, 223, ${0.6 * (1 - ripple)})` : `rgba(255, 210, 133, ${0.9 * (1 - ripple)})`;
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    }
  } else {
    motion.trail.length = 0;
    motion.lastX = null;
  }

  // Result: a soft flash and a burst of spinning stars from the focal point
  const burst = (t - 0.68) / 0.24;
  if (burst > 0 && burst < 1) {
    const flash = ctx.createRadialGradient(focus[0], focus[1], 0, focus[0], focus[1], 120);
    flash.addColorStop(0, `rgba(255, 243, 224, ${0.32 * (1 - burst)})`);
    flash.addColorStop(1, 'rgba(255, 243, 224, 0)');
    ctx.fillStyle = flash;
    ctx.fillRect(focus[0] - 120, focus[1] - 120, 240, 240);
    const colors = [GOLD, '#ffffff', '#dcabdf', BLUE, '#a8e092', GOLD];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 - 0.5;
      const d = easeOut(burst) * 70;
      const size = 9 * (1 - burst) + 2;
      ctx.save();
      ctx.shadowColor = colors[i];
      ctx.shadowBlur = 12;
      star(ctx, focus[0] + Math.cos(a) * d, focus[1] + Math.sin(a) * d * 0.8, size, burst * 3 + i);
      ctx.fillStyle = colors[i];
      ctx.globalAlpha = 1 - burst * 0.8;
      ctx.fill();
      ctx.restore();
    }
  }

  if (pointer) vectorPointer(ctx, pointer[0] * SCALE, pointer[1] * SCALE, pointerPressed, motion.tilt);
  ctx.restore();

  // Done badge pops into the artboard corner
  if (t >= 0.7 && t < 0.95) {
    const pop = easeOutBack((t - 0.7) / 0.14);
    const bx = ART_BOX.x + ART_BOX.w - 22;
    const by = ART_BOX.y + 22;
    ctx.save();
    ctx.translate(bx, by);
    ctx.scale(pop, pop);
    ctx.beginPath();
    ctx.arc(0, 0, 15, 0, Math.PI * 2);
    ctx.fillStyle = '#a8e092';
    ctx.shadowColor = 'rgba(168, 224, 146, 0.8)';
    ctx.shadowBlur = 16;
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.lineWidth = 3;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-6, 0);
    ctx.lineTo(-1.5, 5);
    ctx.lineTo(7, -5);
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.restore();
  }

  // Iris transitions between loops
  const iris = t > 0.92 ? 1 - (t - 0.92) / 0.08 : t < 0.06 ? t / 0.06 : 1;
  if (iris < 1) {
    const r = easeOut(iris) * Math.hypot(CW, CH) * 0.55;
    ctx.beginPath();
    ctx.rect(0, 0, CW, CH);
    ctx.arc(CW / 2, CH / 2, Math.max(0.1, r), 0, Math.PI * 2, true);
    ctx.fillStyle = '#0c0618';
    ctx.fill('evenodd');
  }
}

type Phase = 'before' | 'action' | 'result';

export function ToolPreviewCanvas({ scene }: { scene: Scene }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [caption, setCaption] = useState<{ label: string; phase: Phase } | null>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const currentCanvas = canvas;
    const art = document.createElement('canvas');
    art.width = W;
    art.height = H;
    const artCtx = art.getContext('2d');
    if (!artCtx) return;
    artCtx.imageSmoothingEnabled = false;
    const motion: Motion = { trail: [], lastX: null, tilt: 0 };
    let shown = '';
    const render = (progress: number, time: number) => {
      artOnly = true;
      artCtx.clearRect(0, 0, W, H);
      const label = drawToolPreviewFrame(artCtx, scene, progress);
      artOnly = false;
      composite(ctx, art, progress, time, motion);
      const phase: Phase = progress >= 0.68 ? 'result' : progress >= 0.12 ? 'action' : 'before';
      currentCanvas.dataset.previewPhase = phase;
      currentCanvas.parentElement?.setAttribute('data-step-label', label);
      if (label + phase !== shown) {
        shown = label + phase;
        setCaption({ label, phase });
      }
    };
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      render(0.85, 0);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const animate = (now: number) => {
      render(((now - start) % DURATION) / DURATION, now - start);
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [scene]);
  return (
    <>
      <canvas
        ref={canvasRef}
        width={CW}
        height={CH}
        data-scene={scene}
        role="img"
        aria-label={scene.replaceAll('-', ' ') + ' animated tool demonstration'}
      />
      {caption && (
        <span key={caption.label} className={styles.caption} data-phase={caption.phase} aria-hidden="true">
          {caption.label.toLowerCase()}
        </span>
      )}
    </>
  );
}
