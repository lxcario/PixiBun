import { BAYER_4X4 } from '@/lib/canvas/ditherMatrix';
import { drawBun } from '@/lib/art/bunSprite';

/**
 * Tiny hand-built pixel scenes for the "little promises" cards. Each is drawn on
 * a 64×40 canvas and reacts to `k`, which eases from 0 to 1 while the card is hovered.
 */

export type PromiseKind = 'door' | 'fort' | 'home' | 'game';
export const SCENE_W = 64;
export const SCENE_H = 40;

type G = CanvasRenderingContext2D;

const INK = '#0b0714';
const WARM = ['#fff3c4', '#ffd285', '#f0be7c', '#d89a55'];

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const bayer = (x: number, y: number) => (BAYER_4X4[y & 3][x & 3] + 0.5) / 16;

function r(g: G, x: number, y: number, w: number, h: number, c: string) {
  g.fillStyle = c;
  g.fillRect(x, y, w, h);
}

function p(g: G, x: number, y: number, c: string) {
  g.fillStyle = c;
  g.fillRect(x, y, 1, 1);
}

/** Dithered glow of radius `rad` around a point. */
function glow(g: G, cx: number, cy: number, rad: number, color: string, strength = 0.8) {
  g.fillStyle = color;
  for (let y = -rad; y <= rad; y++) {
    for (let x = -rad; x <= rad; x++) {
      const d = Math.hypot(x, y) / rad;
      if (d <= 1 && (1 - d) * strength > bayer(cx + x, cy + y)) g.fillRect(cx + x, cy + y, 1, 1);
    }
  }
}

/** Night sky with a dithered gradient, twinkling stars and an optional moon. */
function sky(g: G, t: number, bottom: number, moon?: [number, number]) {
  const a = [20, 11, 33];
  const b = [58, 32, 82];
  for (let y = 0; y < bottom; y++) {
    for (let x = 0; x < SCENE_W; x++) {
      const k = y / bottom + (bayer(x, y) - 0.5) * 0.25;
      const c = a.map((v, i) => Math.round(v + (b[i] - v) * clamp01(k)));
      g.fillStyle = `rgb(${c.join(',')})`;
      g.fillRect(x, y, 1, 1);
    }
  }
  for (let i = 0; i < 12; i++) {
    const tw = Math.sin(t / 500 + i * 2.3);
    if (tw < -0.2) continue;
    const sx = (i * 23 + 5) % SCENE_W;
    const sy = (i * 11 + 2) % Math.max(4, bottom - 6);
    p(g, sx, sy, tw > 0.7 ? '#fff3c4' : '#a991c8');
  }
  if (moon) {
    const [mx, my] = moon;
    glow(g, mx, my, 7, 'rgba(255, 220, 170, 0.18)');
    for (let y = -3; y <= 3; y++) {
      for (let x = -3; x <= 3; x++) {
        if (Math.hypot(x, y) > 3.3) continue;
        const lit = Math.hypot(x + 1.6, y - 1) > 3;
        p(g, mx + x, my + y, lit ? '#fff1cf' : '#d9bd8a');
      }
    }
  }
}

function grass(g: G, top: number, t: number) {
  r(g, 0, top, SCENE_W, SCENE_H - top, '#1b1030');
  r(g, 0, top, SCENE_W, 1, '#3a2a5c');
  for (let x = 0; x < SCENE_W; x += 3) {
    const sway = Math.sin(t / 700 + x) > 0.4 ? 1 : 0;
    p(g, x + sway, top - 1, '#3a2a5c');
    if (x % 6 === 0) p(g, x, top - 2, '#3a2a5c');
  }
  for (let i = 0; i < 30; i++) p(g, (i * 37) % SCENE_W, top + 2 + ((i * 13) % (SCENE_H - top - 2)), '#140b21');
}

function flower(g: G, x: number, y: number, petal: string) {
  p(g, x, y + 1, '#4a7a45');
  p(g, x, y + 2, '#4a7a45');
  p(g, x - 1, y, petal);
  p(g, x + 1, y, petal);
  p(g, x, y - 1, petal);
  p(g, x, y, '#ffd285');
}

// ---------------------------------------------------------------------------

function door(g: G, t: number, k: number) {
  sky(g, t, 30, [56, 6]);
  // Eaves of the cottage
  r(g, 4, 3, 56, 2, '#2e1c49');
  r(g, 4, 3, 56, 1, '#4b3472');
  // Stone wall
  r(g, 6, 5, 52, 29, '#3d2b4a');
  for (let row = 0; row < 7; row++) {
    const y = 5 + row * 4;
    const off = row % 2 ? 3 : 0;
    for (let x = 6 - off; x < 58; x += 7) {
      const sx = Math.max(6, x);
      const sw = Math.min(58, x + 6) - sx;
      if (sw <= 0) continue;
      r(g, sx, y, sw, 3, row % 3 ? '#47335a' : '#4f3a63');
      r(g, sx, y, sw, 1, '#5a4472');
      r(g, sx, y + 3, sw, 1, '#2a1d38');
    }
  }
  // Doorway: an arch cut into the wall
  const dx = 24;
  const dy = 12;
  const dw = 16;
  const dh = 22;
  const arch = (y: number) => (y === 0 ? 4 : y === 1 ? 2 : y === 2 ? 1 : 0);
  for (let y = -1; y < dh; y++) {
    const inset = y < 0 ? 5 : arch(y);
    r(g, dx - 1 + inset, dy + y, dw + 2 - inset * 2, 1, '#5b3a2a');
  }
  // Warm interior with Bun, revealed as the door swings open
  for (let y = 0; y < dh; y++) {
    const inset = arch(y);
    r(g, dx + inset, dy + y, dw - inset * 2, 1, y > dh - 5 ? '#d89a55' : y > 8 ? '#f0be7c' : '#ffd285');
  }
  r(g, dx + 2, dy + 4, 3, 2, '#fff3c4');
  drawBun(g, dx, dy + dh - 17, k > 0.55 ? 'happy' : 'idle');
  if (k > 0.55) {
    // A little wave
    const up = Math.sin(t / 120) > 0;
    p(g, dx + 14, dy + dh - 9 - (up ? 1 : 0), '#f2ecf7');
    p(g, dx + 15, dy + dh - 10 - (up ? 1 : 0), '#f2ecf7');
  }
  // Door leaf, hinged on the left, narrowing as it opens
  const leaf = Math.round(dw * (1 - k * 0.82));
  if (leaf > 0) {
    for (let y = 0; y < dh; y++) {
      const inset = arch(y);
      const x0 = dx + inset;
      const w = Math.max(0, Math.min(leaf, dw - inset * 2) - (y < 3 ? inset : 0));
      for (let x = 0; x < w; x++) {
        const plank = x % 4 === 3 ? '#5b3a2a' : x % 4 === 0 ? '#a8683f' : '#8a5538';
        p(g, x0 + x, dy + y, plank);
      }
      if (w > 0) p(g, x0 + w - 1, dy + y, '#4a2a1e');
    }
    if (leaf > 8) {
      // Round window and iron straps
      const wx = dx + Math.round(leaf / 2) - 2;
      r(g, wx, dy + 5, 4, 4, '#ffd285');
      r(g, wx + 1, dy + 5, 2, 4, '#f0be7c');
      p(g, wx, dy + 5, '#5b3a2a');
      p(g, wx + 3, dy + 5, '#5b3a2a');
      p(g, wx, dy + 8, '#5b3a2a');
      p(g, wx + 3, dy + 8, '#5b3a2a');
      r(g, dx + 1, dy + 12, leaf - 2, 1, '#2a1d38');
      r(g, dx + 1, dy + 18, leaf - 2, 1, '#2a1d38');
    }
    if (leaf > 4) p(g, dx + leaf - 3, dy + 14, '#ffd285');
  }
  // Wall lantern
  const flick = Math.sin(t / 90) + Math.sin(t / 33) * 0.5;
  glow(g, 47, 17, 7, 'rgba(255, 210, 133, 0.35)');
  r(g, 44, 15, 2, 1, INK);
  r(g, 46, 14, 3, 5, INK);
  r(g, 47, 15, 1, 3, flick > 0 ? '#fff3c4' : '#ffd285');
  // Light spilling out onto the step
  const spill = clamp01(k * 1.3);
  if (spill > 0) {
    for (let y = 0; y < 6; y++) {
      for (let x = -y - 2; x < dw + y + 2; x++) {
        if (spill * 0.85 * (1 - y / 7) > bayer(dx + x, 34 + y)) p(g, dx + x, 34 + y, 'rgba(255, 210, 133, 0.45)');
      }
    }
  }
  // Ground, mat, potted plant, flowers
  r(g, 0, 34, SCENE_W, 6, '#2a1d38');
  r(g, 0, 34, SCENE_W, 1, '#4f3a63');
  r(g, dx - 1, 34, dw + 2, 2, '#7a3a5c');
  for (let x = dx + 1; x < dx + dw; x += 3) p(g, x, 34, '#f2b8c6');
  r(g, 12, 29, 6, 5, '#c86e5c');
  r(g, 12, 29, 6, 1, '#e08a74');
  r(g, 11, 28, 8, 1, '#a8574a');
  for (let i = 0; i < 7; i++) p(g, 12 + ((i * 3) % 6), 27 - (i % 3) - (i > 3 ? 1 : 0), i % 2 ? '#7fae6b' : '#4a7a45');
  flower(g, 52, 31, '#f2b8c6');
  flower(g, 55, 32, '#c792df');
}

function fort(g: G, t: number, k: number) {
  // Cozy room: striped wallpaper, a window, floorboards
  r(g, 0, 0, SCENE_W, 32, '#241833');
  for (let x = 0; x < SCENE_W; x += 6) r(g, x, 0, 2, 32, '#2a1d3c');
  r(g, 4, 4, 14, 12, INK);
  for (let y = 5; y < 15; y++) for (let x = 5; x < 17; x++) p(g, x, y, y < 10 ? '#140b21' : '#2a1945');
  p(g, 13, 7, '#fff1cf');
  p(g, 14, 7, '#fff1cf');
  p(g, 14, 8, '#fff1cf');
  p(g, 7, 6, '#a991c8');
  p(g, 9, 11, '#a991c8');
  r(g, 10, 5, 1, 10, INK);
  r(g, 5, 10, 12, 1, INK);
  r(g, 3, 16, 16, 1, '#5b3a2a');
  for (let y = 32; y < SCENE_H; y++) {
    r(g, 0, y, SCENE_W, 1, y % 3 === 2 ? '#1c1118' : '#2b1b22');
  }
  r(g, 0, 32, SCENE_W, 1, '#4f3242');

  // Quilt fort: patchwork draped into a peak
  const apex = 38;
  const top = 9;
  const base = 33;
  const half = (y: number) => Math.round(((y - top) / (base - top)) * 22);
  const patches = ['#7a3a5c', '#c792df', '#f0be7c', '#4a7a6b', '#e08ca6', '#5b3a7a'];
  for (let y = top; y < base; y++) {
    const hw = half(y);
    for (let x = apex - hw; x <= apex + hw; x++) {
      const pi = (Math.floor((x - apex + 40) / 5) + Math.floor((y - top) / 5) * 2) % patches.length;
      const edge = (x - apex + 40) % 5 === 0 || (y - top) % 5 === 0;
      p(g, x, y, edge ? '#3a2240' : patches[pi]);
    }
    p(g, apex - hw - 1, y, INK);
    p(g, apex + hw + 1, y, INK);
  }
  p(g, apex, top - 1, INK);
  // Fairy lights along the ridge
  for (let y = top + 2; y < base; y += 4) {
    const lit = Math.sin(t / 400 + y) > -0.3;
    const hw = half(y);
    p(g, apex - hw, y, lit ? WARM[1] : '#5b3a2a');
    p(g, apex + hw, y, lit ? '#f2b8c6' : '#5b3a2a');
  }
  // The flap: a warm opening that widens on hover, Bun reading inside
  const open = 3 + k * 9;
  g.save();
  g.beginPath();
  g.moveTo(apex + 0.5, base - open * 1.6 - 2);
  g.lineTo(apex + 0.5 + open, base);
  g.lineTo(apex + 0.5 - open, base);
  g.closePath();
  g.clip();
  r(g, 0, 0, SCENE_W, SCENE_H, '#ffd285');
  r(g, 0, base - 4, SCENE_W, 4, '#f0be7c');
  drawBun(g, apex - 8, base - 16 + Math.round((1 - k) * 4), k > 0.5 ? 'happy' : 'blink');
  r(g, apex - 3, base - 6, 6, 4, '#3e5a6b');
  r(g, apex - 2, base - 6, 4, 3, '#ede8f4');
  p(g, apex, base - 6, '#3e5a6b');
  g.restore();
  // Lantern on the floor
  glow(g, 14, 27, 8, 'rgba(255, 210, 133, 0.32)');
  r(g, 12, 25, 5, 7, INK);
  r(g, 13, 26, 3, 4, Math.sin(t / 90) > 0 ? '#fff3c4' : '#ffd285');
  r(g, 13, 24, 3, 1, INK);
  // The router, fast asleep
  r(g, 52, 22, 9, 4, '#3a2e4c');
  r(g, 52, 22, 9, 1, '#5d4486');
  p(g, 54, 24, '#46306a');
  p(g, 56, 24, '#46306a');
  r(g, 53, 19, 1, 3, '#3a2e4c');
  r(g, 59, 19, 1, 3, '#3a2e4c');
  const za = (t / 1300) % 1;
  g.globalAlpha = Math.sin(za * Math.PI);
  const zx = 58 + Math.round(za * 3);
  const zy = 16 - Math.round(za * 6);
  r(g, zx, zy, 3, 1, '#cdbfdf');
  p(g, zx + 1, zy + 1, '#cdbfdf');
  r(g, zx, zy + 2, 3, 1, '#cdbfdf');
  g.globalAlpha = 1;
}

function home(g: G, t: number, k: number) {
  sky(g, t, 32, [9, 7]);
  grass(g, 32, t);
  // Path
  for (let s = 0; s < 4; s++) r(g, 30 - s, 33 + s * 2, 4 + s, 1, '#3a2a52');
  // Cottage walls with timber framing
  const hx = 20;
  const hy = 16;
  const hw = 24;
  const hh = 16;
  r(g, hx - 1, hy - 1, hw + 2, hh + 2, INK);
  r(g, hx, hy, hw, hh, '#d9c3a0');
  r(g, hx + hw - 3, hy, 3, hh, '#b89a78');
  r(g, hx, hy, hw, 1, '#5b3a2a');
  r(g, hx, hy + 7, hw, 1, '#5b3a2a');
  for (const x of [hx + 5, hx + 12, hx + 18]) r(g, x, hy, 1, hh, '#5b3a2a');
  // Roof with tile rows and a moonlit edge
  for (let i = 0; i < 12; i++) {
    const y = hy - 1 - i;
    r(g, hx - 3 + i, y, hw + 6 - i * 2, 1, i % 3 === 0 ? '#5b2a46' : '#7a3a5c');
    p(g, hx - 3 + i, y, INK);
    p(g, hx + hw + 2 - i, y, INK);
    p(g, hx - 2 + i, y, '#a85a80');
  }
  // Chimney and smoke
  r(g, hx + 17, hy - 12, 4, 6, INK);
  r(g, hx + 18, hy - 11, 2, 5, '#7a4a34');
  for (let s = 0; s < 4; s++) {
    const a = (t / 1800 + s / 4) % 1;
    g.globalAlpha = 0.45 * (1 - a);
    r(g, hx + 18 + Math.round(Math.sin(a * 5 + s) * 1.5 + a * 3), hy - 14 - Math.round(a * 10), a > 0.5 ? 2 : 1, 1, '#cdbfdf');
  }
  g.globalAlpha = 1;
  // Windows and door
  const lit = 0.6 + k * 0.4;
  glow(g, hx + 8, hy + 10, 6, `rgba(255, 200, 120, ${0.3 * lit})`);
  for (const [wx, wy] of [[hx + 2, hy + 9], [hx + 7, hy + 9]] as const) {
    r(g, wx, wy, 4, 4, INK);
    r(g, wx + 1, wy + 1, 2, 2, k > 0.75 && wx === hx + 7 ? '#f2b8c6' : '#ffd285');
  }
  if (k > 0.75) {
    // A heart glows in the window once the drawing is home
    const pulse = Math.sin(t / 200) > 0 ? '#e08ca6' : '#f2b8c6';
    p(g, hx + 8, hy + 10, pulse);
    p(g, hx + 9, hy + 10, pulse);
  }
  r(g, hx + 13, hy + 9, 5, 7, INK);
  r(g, hx + 14, hy + 10, 3, 6, '#7a4a34');
  p(g, hx + 16, hy + 13, '#ffd285');
  r(g, hx + 20, hy + 2, 3, 3, '#ffd285');
  // The drawing, flapping little paper wings, flies home on hover
  const fly = clamp01(k);
  if (fly < 0.98) {
    const fx = Math.round(5 + fly * 34 + Math.sin(t / 600) * (1 - fly));
    const fy = Math.round(8 + Math.sin(t / 400) * 2 * (1 - fly) + Math.sin(fly * Math.PI) * -4 + fly * 6);
    g.globalAlpha = 1 - clamp01((fly - 0.8) / 0.18);
    const flap = Math.sin(t / (fly > 0.05 ? 70 : 160)) > 0;
    r(g, fx - 3, fy + (flap ? 0 : 2), 3, 1, '#fff3e0');
    r(g, fx + 8, fy + (flap ? 0 : 2), 3, 1, '#fff3e0');
    r(g, fx - 1, fy - 1, 10, 10, INK);
    r(g, fx, fy, 8, 8, '#d89a55');
    r(g, fx + 1, fy + 1, 6, 6, '#f6ead6');
    r(g, fx + 2, fy + 2, 4, 4, '#ede8f4');
    p(g, fx + 3, fy + 3, INK);
    p(g, fx + 5, fy + 3, INK);
    p(g, fx + 4, fy + 5, '#f0be7c');
    g.globalAlpha = 1;
  }
  // Flowers and a little fence
  for (let x = 2; x < 18; x += 3) {
    r(g, x, 28, 1, 4, '#4a3660');
    p(g, x, 27, '#5d4486');
  }
  r(g, 2, 29, 16, 1, '#4a3660');
  flower(g, 48, 30, '#f2b8c6');
  flower(g, 52, 31, '#ffd285');
  flower(g, 57, 30, '#c792df');
}

let screenBun: HTMLCanvasElement | null = null;

/** Bun redrawn in the four greens of an old handheld screen. */
function greenBun() {
  if (screenBun) return screenBun;
  const c = document.createElement('canvas');
  c.width = 18;
  c.height = 18;
  const g = c.getContext('2d')!;
  drawBun(g, 1, 1, 'happy');
  const img = g.getImageData(0, 0, 18, 18);
  const greens = [
    [7, 24, 33],
    [48, 104, 80],
    [134, 192, 108],
    [224, 248, 207],
  ];
  for (let i = 0; i < img.data.length; i += 4) {
    if (img.data[i + 3] === 0) continue;
    const lum = (img.data[i] * 0.3 + img.data[i + 1] * 0.59 + img.data[i + 2] * 0.11) / 255;
    const [cr, cg, cb] = greens[Math.min(3, Math.floor(lum * 4))];
    img.data[i] = cr;
    img.data[i + 1] = cg;
    img.data[i + 2] = cb;
  }
  g.putImageData(img, 0, 0);
  screenBun = c;
  return c;
}

function game(g: G, t: number, k: number) {
  // Desk under a lamp
  r(g, 0, 0, SCENE_W, SCENE_H, '#1f1428');
  glow(g, 32, 4, 26, 'rgba(255, 210, 140, 0.12)', 0.9);
  r(g, 0, 33, SCENE_W, 7, '#4a2f2a');
  r(g, 0, 33, SCENE_W, 1, '#6b4436');
  // Console body with rounded corners and shading
  const bx = 14;
  const by = 2;
  const bw = 36;
  const bh = 35;
  r(g, bx, by, bw, bh, INK);
  r(g, bx + 1, by + 1, bw - 2, bh - 2, '#c792df');
  r(g, bx + bw - 3, by + 2, 2, bh - 4, '#a070c0');
  r(g, bx + 2, by + bh - 3, bw - 4, 2, '#a070c0');
  r(g, bx + 2, by + 1, bw - 5, 1, '#e5c4f2');
  r(g, bx + 1, by + 2, 1, bh - 5, '#e5c4f2');
  for (const [cx, cy] of [[bx, by], [bx + bw - 1, by], [bx, by + bh - 1], [bx + bw - 1, by + bh - 1]] as const) p(g, cx, cy, '#1f1428');
  // Screen bezel and screen
  r(g, bx + 3, by + 3, bw - 7, 19, '#2a1945');
  p(g, bx + 5, by + 5, k > 0.3 && Math.sin(t / 150) > 0 ? '#e08ca6' : '#5b2a46');
  const sx = bx + 7;
  const sy = by + 5;
  const sw = bw - 15;
  const sh = 15;
  r(g, sx, sy, sw, sh, '#86c06c');
  r(g, sx, sy, sw, 5, '#9fd18a');
  // Ground tiles scrolling past
  const scroll = Math.floor(t / 120) % 4;
  for (let x = -4; x < sw; x += 4) {
    r(g, sx + Math.max(0, x - scroll + 4) , sy + sh - 3, Math.min(4, sw - Math.max(0, x - scroll + 4)), 3, '#306850');
    if (x - scroll + 4 >= 0 && x - scroll + 4 < sw) p(g, sx + x - scroll + 4, sy + sh - 3, '#071821');
  }
  // Bun hops on hover and grabs a coin
  const hop = k > 0.4 ? Math.round(Math.abs(Math.sin(t / 180)) * 3) : 0;
  g.save();
  g.beginPath();
  g.rect(sx, sy, sw, sh);
  g.clip();
  g.drawImage(greenBun(), 0, 0, 18, 18, sx + 2, sy + sh - 3 - 11 - hop, 11, 11);
  if (k > 0.4) {
    const coinY = sy + 2 + (hop > 3 ? -1 : 0);
    r(g, sx + sw - 4, coinY, 2, 3, Math.sin(t / 100) > 0 ? '#e0f8cf' : '#306850');
  }
  g.restore();
  // D-pad, A/B, start/select, speaker
  const py = by + 25;
  r(g, bx + 4, py + 2, 7, 3, INK);
  r(g, bx + 6, py, 3, 7, INK);
  p(g, bx + 7, py + 1, '#3a2e4c');
  const press = k > 0.4 && Math.sin(t / 180) > 0.3;
  for (const [ax, ay, col] of [[bx + 25, py + 3, '#e08ca6'], [bx + 29, py + 1, '#e08ca6']] as const) {
    const down = press && ax === bx + 29 ? 1 : 0;
    r(g, ax, ay + down, 3, 3, INK);
    r(g, ax, ay + down, 2, 2, col);
    if (!down) p(g, ax, ay, '#f2b8c6');
  }
  r(g, bx + 14, py + 6, 3, 1, '#7a5a8a');
  r(g, bx + 18, py + 6, 3, 1, '#7a5a8a');
  for (let i = 0; i < 3; i++) r(g, bx + 27 + i * 2, by + bh - 6 - i, 1, 3, '#a070c0');
}

export function paintPromise(g: G, kind: PromiseKind, t: number, k: number) {
  g.clearRect(0, 0, SCENE_W, SCENE_H);
  if (kind === 'door') door(g, t, k);
  else if (kind === 'fort') fort(g, t, k);
  else if (kind === 'home') home(g, t, k);
  else game(g, t, k);
}
