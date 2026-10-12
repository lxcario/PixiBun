'use client';

import React, { useEffect, useRef } from 'react';
import type { Scene } from './ToolMotionPreview';
import { pixelGradient } from '@/lib/canvas/pixelGradient';

const W = 96;
const H = 54;
const DURATION = 2600;
const GOLD = '#f0be7c';
const RED = '#e85a70';
const BLUE = '#66c6e8';
const INK = '#271b37';
const WHITE = '#f8edf5';

type Point = readonly [number, number];
type Canvas = CanvasRenderingContext2D;

function clamp(value: number) { return Math.max(0, Math.min(1, value)); }
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
function cursor(ctx: Canvas, x: number, y: number, pressed = false) {
  x = Math.round(x);
  y = Math.round(y);
  box(ctx, x - 4, y, 3, 1, WHITE);
  box(ctx, x + 2, y, 3, 1, WHITE);
  box(ctx, x, y - 4, 1, 3, WHITE);
  box(ctx, x, y + 2, 1, 3, WHITE);
  pixel(ctx, x, y, pressed ? GOLD : BLUE);
}
function backdrop(ctx: Canvas) {
  box(ctx, 0, 0, W, H, '#120e1b');
  for (let y = 7; y < 47; y += 4) {
    for (let x = 9; x < 89; x += 4) {
      box(ctx, x, y, 4, 4, ((x + y) / 4) % 2 ? '#21192d' : '#1a1425');
    }
  }
  box(ctx, 8, 6, 81, 1, '#40304f');
  box(ctx, 8, 47, 81, 1, '#40304f');
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
  const action = clamp((t - 0.12) / 0.56);
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
      sampleSprite(ctx, 48, 27, {
        flat: true,
        base: action > 0.35 ? RED : '#251b32',
      });
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
  return label;
}

export function ToolPreviewCanvas({ scene }: { scene: Scene }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const currentCanvas = canvas;
    ctx.imageSmoothingEnabled = false;
    const render = (progress: number) => {
      const label = drawToolPreviewFrame(ctx, scene, progress);
      currentCanvas.parentElement?.setAttribute('data-step-label', label);
    };
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      render(0.85);
      currentCanvas.dataset.previewPhase = 'result';
      return;
    }
    let frame = 0;
    const start = performance.now();
    const animate = (now: number) => {
      const progress = ((now - start) % DURATION) / DURATION;
      render(progress);
      currentCanvas.dataset.previewPhase = progress >= 0.68 ? 'result' : progress >= 0.12 ? 'action' : 'before';
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [scene]);
  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      data-scene={scene}
      role="img"
      aria-label={scene.replaceAll('-', ' ') + ' animated tool demonstration'}
      style={{ imageRendering: 'pixelated' }}
    />
  );
}
