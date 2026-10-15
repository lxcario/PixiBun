import { BAYER_4X4 } from '@/lib/canvas/ditherMatrix';
import { drawBun, type BunPose } from '@/lib/art/bunSprite';
import { STARTER_TEMPLATES, TEMPLATE_PALETTE } from '@/lib/art/starterTemplates';

/**
 * Moonlit Hill — the landing hero's living pixel scene.
 *
 * Everything is drawn at a low "logical" resolution (one logical pixel = PX
 * screen pixels) and upscaled by CSS with `image-rendering: pixelated`, so the
 * whole scene stays honest pixel art. Static scenery (mountains, town, hills)
 * is baked into layers once; each frame only draws what moves. The first
 * INTRO_MS build the scene up (sky, moon, hills, town lights, Bun).
 */

export const INTRO_MS = 3600;

export type BunAction = 'hop' | 'spin' | 'wiggle' | 'nap' | 'dance';
export const BUN_ACTIONS: BunAction[] = ['hop', 'spin', 'wiggle', 'dance', 'nap'];
export const BUN_ACTION_MS: Record<BunAction, number> = { hop: 720, spin: 820, wiggle: 760, nap: 2800, dance: 1320 };

const SKY = ['#0d0a1c', '#140e28', '#1d1336', '#2a1945', '#3d2052', '#58285b', '#7b3461', '#a54766', '#cf6a63', '#eb9a6a'];
const MOUNTAIN = '#2a1a42';
const MOUNTAIN_RIM = '#46306a';
const TOWN_HILL = '#1f1333';
const HOUSE = '#1a1029';
const HOUSE_SIDE = '#150c22';
const ROOF = '#2e1c49';
const ROOF_RIM = '#4b3472';
const PINE = '#150d24';
const NEAR_HILL = '#130b20';
const NEAR_RIM = '#2c1c47';
const GRASS = '#33215a';
const WARM = ['#f0be7c', '#ffd285', '#f6a96c'];
const FAIRY = ['#ffd285', '#f2b8c6', '#c792df', '#a8e092'];

// Tiny pixel glyphs used for Bun's little reactions.
const GLYPH = {
  heart: ['#.#', '###', '.#.'],
  note: ['.##', '.#.', '##.'],
  z: ['####', '..#.', '.#..', '####'],
  spark: ['.#.', '###', '.#.'],
};

export interface PaintedStar {
  x: number;
  y: number;
  born: number;
  hue: number;
}

export interface Constellation {
  stars: PaintedStar[];
  name?: string;
}

export interface SceneInput {
  /** Milliseconds since the scene started (intro included). */
  t: number;
  /** Pointer position in [-1, 1] for parallax. */
  lookX: number;
  lookY: number;
  /** Page scroll in logical pixels, for layered parallax. */
  scroll: number;
  constellations: Constellation[];
  bunAction: { type: BunAction; start: number } | null;
  bunHover: boolean;
}

interface Win {
  x: number;
  y: number;
  on: number;
  tone: number;
  plant: boolean;
}

interface House {
  x: number;
  w: number;
  h: number;
  base: number;
  windows: Win[];
  door: number;
  doorLamp: boolean;
  chimney: number;
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const span = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const easeOut = (p: number) => 1 - Math.pow(1 - p, 3);
const easeInOut = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const easeBack = (p: number) => {
  const c = 1.6;
  return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2);
};

function mulberry(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function layer(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  return { c, ctx };
}

/** A soft, dithered warm halo stamp. */
function haloStamp(radius: number, color: string, strength: number) {
  const size = radius * 2 + 1;
  const { c, ctx } = layer(size, size);
  ctx.fillStyle = color;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - radius, y - radius) / radius;
      if (d > 1) continue;
      const threshold = (BAYER_4X4[y & 3][x & 3] + 0.5) / 16;
      if ((1 - d) * strength > threshold) ctx.fillRect(x, y, 1, 1);
    }
  }
  return c;
}

function glyph(ctx: CanvasRenderingContext2D, rows: string[], x: number, y: number, color: string) {
  ctx.fillStyle = color;
  rows.forEach((row, gy) => {
    for (let gx = 0; gx < row.length; gx++) if (row[gx] === '#') ctx.fillRect(x + gx, y + gy, 1, 1);
  });
}

/**
 * A puffy pixel cloud: a row of overlapping round puffs on a flat bottom,
 * lit by the moon along the top edge and shaded underneath.
 */
function cloudSprite(rand: () => number, width: number) {
  const puffs: Array<[number, number]> = [];
  let x = 4;
  while (x < width - 4) {
    const radius = 3 + Math.floor(rand() * 5) + (x > width * 0.25 && x < width * 0.7 ? 2 : 0);
    puffs.push([x, radius]);
    x += Math.max(3, Math.floor(radius * 1.1));
  }
  const height = Math.max(...puffs.map(([, rad]) => rad)) + 2;
  const { c, ctx } = layer(width, height);
  const inside = (px: number, py: number) =>
    py < height && puffs.some(([cx, rad]) => Math.hypot(px - cx, py - (height - 1)) <= rad + 0.3);
  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      if (!inside(px, py)) continue;
      const fromTop = inside(px, py - 1) ? (inside(px, py - 2) ? 2 : 1) : 0;
      const bottom = py >= height - 2;
      ctx.fillStyle = fromTop === 0 ? '#7a63a8' : fromTop === 1 ? '#4b3874' : bottom ? '#21163a' : '#2f2050';
      ctx.fillRect(px, py, 1, 1);
    }
  }
  return c;
}

const GHOST = STARTER_TEMPLATES.find((t) => t.id === 'bun')!;
const GHOST_PIXELS: Array<[number, number, string]> = [];
GHOST.rows.forEach((row, y) => {
  for (let x = 0; x < row.length; x++) {
    const c = TEMPLATE_PALETTE[row[x]];
    if (c) GHOST_PIXELS.push([x, y, c]);
  }
});
// Paint order: outline sweeps first, then the fill, like a person would ink it.
GHOST_PIXELS.sort((a, b) => {
  const ao = a[2] === TEMPLATE_PALETTE.o ? 0 : 1;
  const bo = b[2] === TEMPLATE_PALETTE.o ? 0 : 1;
  return ao - bo || a[1] - b[1] || a[0] - b[0];
});

const M = 16; // layer margin so parallax never reveals an edge

export class MoonlitScene {
  readonly w: number;
  readonly h: number;
  readonly horizon: number;
  readonly bunX: number;
  private sky: ImageData;
  private mountains: Int16Array;
  private townHill: Int16Array;
  private nearHill: Int16Array;
  private houses: House[] = [];
  private fairy: Array<{ x0: number; y0: number; x1: number; y1: number; sag: number }> = [];
  private cat: { x: number; y: number } | null = null;
  private stars: Array<{ x: number; y: number; big: boolean; phase: number; speed: number; appear: number }> = [];
  private fireflies: Array<{ x: number; y: number; r: number; phase: number; speed: number }> = [];
  private grass: Array<{ x: number; h: number; phase: number }> = [];
  private clouds: Array<{ x: number; y: number; w: number; speed: number; sprite: HTMLCanvasElement }> = [];
  private mountainLayer: HTMLCanvasElement;
  private townLayer: HTMLCanvasElement;
  private nearLayer: HTMLCanvasElement;
  private windowHalo: HTMLCanvasElement;
  private doorHalo: HTMLCanvasElement;
  private lanternHalo: HTMLCanvasElement;
  private shroomHalo: HTMLCanvasElement;
  private shooting: { x: number; y: number; born: number } | null = null;
  private nextShooting = INTRO_MS + 2500;
  private facing = 1;
  private turnFrom = 1;
  private turnStart = -1e9;

  constructor(w: number, h: number, ctx: CanvasRenderingContext2D) {
    this.w = w;
    this.h = h;
    this.horizon = Math.round(h * 0.8);
    const rand = mulberry(7);
    const LW = w + M * 2;

    // Dithered dusk sky, baked once.
    this.sky = ctx.createImageData(w, h);
    const rgb = SKY.map(hexToRgb);
    const d = this.sky.data;
    for (let y = 0; y < h; y++) {
      const pos = Math.pow(y / this.horizon, 1.35) * (SKY.length - 1);
      const band = Math.min(SKY.length - 2, Math.floor(pos));
      const frac = Math.min(1, pos - band);
      for (let x = 0; x < w; x++) {
        const threshold = (BAYER_4X4[y % 4][x % 4] + 0.5) / 16;
        const c = frac > threshold ? rgb[band + 1] : rgb[band];
        const i = (y * w + x) * 4;
        d[i] = c[0];
        d[i + 1] = c[1];
        d[i + 2] = c[2];
        d[i + 3] = 255;
      }
    }

    const ridge = (base: number, amp: number, f: number[], phase: number) => {
      const out = new Int16Array(LW);
      for (let lx = 0; lx < LW; lx++) {
        const x = lx - M;
        let v = 0;
        f.forEach((freq, i) => {
          v += Math.sin((x / w) * Math.PI * 2 * freq + phase * (i + 1)) / (i + 1);
        });
        out[lx] = Math.round(base + v * amp);
      }
      return out;
    };
    this.mountains = ridge(h * 0.6, h * 0.07, [1.3, 3.1, 7.7], 1.7);
    this.townHill = ridge(h * 0.72, h * 0.022, [0.9, 2.3], 0.4);

    // Foreground hill: a soft rise under Bun, low elsewhere.
    this.bunX = Math.round(w * (w < 200 ? 0.62 : 0.7));
    this.nearHill = new Int16Array(LW);
    for (let lx = 0; lx < LW; lx++) {
      const x = lx - M;
      const bump = Math.exp(-Math.pow((x - this.bunX) / (w * 0.22), 2));
      this.nearHill[lx] = Math.round(h * 0.93 - bump * h * 0.09 + Math.sin(x / 9) * 0.6);
    }

    // ---- Mountains layer -------------------------------------------------
    const ml = layer(LW, h);
    for (let x = 0; x < LW; x++) {
      const top = this.mountains[x];
      ml.ctx.fillStyle = MOUNTAIN_RIM;
      ml.ctx.fillRect(x, top, 1, 1);
      ml.ctx.fillStyle = MOUNTAIN;
      ml.ctx.fillRect(x, top + 1, 1, h - top);
      // Moonlit snow-ish rim on the upslopes
      if (x > 0 && this.mountains[x - 1] > top && (x & 1) === 0) {
        ml.ctx.fillStyle = MOUNTAIN_RIM;
        ml.ctx.fillRect(x, top + 1, 1, 1);
      }
    }
    this.mountainLayer = ml.c;

    // ---- Town layer: hill, pines, houses (windows are drawn live) ---------
    const tl = layer(LW, h);
    const t = tl.ctx;
    for (let x = 0; x < LW; x++) {
      t.fillStyle = TOWN_HILL;
      t.fillRect(x, this.townHill[x], 1, h);
    }
    const pine = (px: number, ph: number) => {
      const base = this.townHill[Math.min(LW - 1, Math.max(0, px))] + 1;
      t.fillStyle = PINE;
      for (let r = 0; r < ph; r++) {
        const half = Math.floor((r / ph) * (ph / 2.4)) + (r % 3 === 2 ? 1 : 0);
        t.fillRect(px - half, base - ph + r, half * 2 + 1, 1);
      }
      t.fillRect(px, base - 1, 1, 2);
    };
    let x = M + Math.round(rand() * 6) - 6;
    let prev: House | null = null;
    while (x < LW - 8) {
      const realX = x - M;
      if (Math.abs(realX - this.bunX) < 30 && rand() < 0.55) {
        if (rand() < 0.7) pine(x + 3, 6 + Math.floor(rand() * 7));
        x += 9;
        prev = null;
        continue;
      }
      if (rand() < 0.22) {
        pine(x + 2, 7 + Math.floor(rand() * 8));
        x += 5 + Math.floor(rand() * 4);
        continue;
      }
      const hw = 7 + Math.floor(rand() * 2) * 4 + (rand() < 0.3 ? 4 : 0);
      const hh = 6 + Math.floor(rand() * 2) * 4;
      const base = this.townHill[Math.min(LW - 1, x + (hw >> 1))] + 1;
      const windows: Win[] = [];
      for (let wy = 2; wy + 2 <= hh - 2; wy += 4) {
        for (let wx = 1; wx + 2 <= hw - 1; wx += 4) {
          if (rand() < 0.72) {
            windows.push({ x: wx, y: wy, on: 1700 + rand() * 1400, tone: rand(), plant: rand() < 0.3 });
          }
        }
      }
      const house: House = {
        x,
        w: hw,
        h: hh,
        base,
        windows,
        door: rand() < 0.6 ? 1 + Math.floor(rand() * (hw - 3)) : -1,
        doorLamp: rand() < 0.5,
        chimney: rand() < 0.5 ? 1 + Math.floor(rand() * (hw - 3)) : -1,
      };
      // Body with a shaded right wall
      const top = base - hh;
      t.fillStyle = HOUSE;
      t.fillRect(x, top, hw, hh);
      t.fillStyle = HOUSE_SIDE;
      t.fillRect(x + hw - 2, top, 2, hh);
      // Stepped roof, moonlit on the left slope
      const roof = Math.ceil(hw / 2);
      for (let r = 0; r < roof; r++) {
        t.fillStyle = ROOF;
        t.fillRect(x - 1 + r, top - r - 1, hw + 2 - r * 2, 1);
        t.fillStyle = ROOF_RIM;
        t.fillRect(x - 1 + r, top - r - 1, 1, 1);
      }
      if (house.chimney >= 0) {
        t.fillStyle = HOUSE_SIDE;
        t.fillRect(x + house.chimney, top - roof + 1, 2, 3);
      }
      if (house.door >= 0) {
        t.fillStyle = '#3b2430';
        t.fillRect(x + house.door, base - 3, 2, 3);
      }
      this.houses.push(house);
      if (prev && x - (prev.x + prev.w) < 16 && rand() < 0.75) {
        this.fairy.push({
          x0: prev.x + prev.w,
          y0: prev.base - prev.h + 1,
          x1: x,
          y1: top + 1,
          sag: 2 + rand() * 3,
        });
      }
      if (!this.cat && hw >= 11 && realX > w * 0.1 && realX < w * 0.5) this.cat = { x: x + Math.floor(hw / 2) - 2, y: top - roof };
      prev = house;
      x += hw + 2 + Math.floor(rand() * 6);
    }
    this.townLayer = tl.c;

    // ---- Near hill layer --------------------------------------------------
    const nl = layer(LW, h);
    for (let x2 = 0; x2 < LW; x2++) {
      const top = this.nearHill[x2];
      nl.ctx.fillStyle = NEAR_RIM;
      nl.ctx.fillRect(x2, top, 1, 1);
      nl.ctx.fillStyle = NEAR_HILL;
      nl.ctx.fillRect(x2, top + 1, 1, h - top);
      const realX = x2 - M;
      if (rand() < 0.035 && Math.abs(realX - this.bunX) > 22) {
        // Little flowers
        nl.ctx.fillStyle = GRASS;
        nl.ctx.fillRect(x2, top - 3, 1, 3);
        nl.ctx.fillStyle = rand() < 0.5 ? '#f2b8c6' : '#c792df';
        nl.ctx.fillRect(x2 - 1, top - 4, 3, 1);
        nl.ctx.fillRect(x2, top - 5, 1, 3);
        nl.ctx.fillStyle = '#ffd285';
        nl.ctx.fillRect(x2, top - 4, 1, 1);
      }
    }
    // Stepping-stone path up to Bun
    for (let s = 0; s < 6; s++) {
      const sx = M + this.bunX - 46 + s * 7;
      if (sx < 0 || sx >= LW) continue;
      const top = this.nearHill[sx] + 2 + (s % 2);
      nl.ctx.fillStyle = '#2a1d3c';
      nl.ctx.fillRect(sx, top, 4, 1);
      nl.ctx.fillStyle = '#3a2a52';
      nl.ctx.fillRect(sx + 1, top, 2, 1);
    }
    this.nearLayer = nl.c;

    this.windowHalo = haloStamp(5, 'rgba(255, 196, 120, 0.2)', 0.7);
    this.doorHalo = haloStamp(4, 'rgba(255, 210, 133, 0.28)', 0.8);
    this.lanternHalo = haloStamp(24, 'rgba(255, 200, 130, 0.2)', 0.95);
    this.shroomHalo = haloStamp(4, 'rgba(220, 171, 223, 0.22)', 0.8);

    const starCount = Math.round((w * h) / 260);
    for (let i = 0; i < starCount; i++) {
      this.stars.push({
        x: Math.floor(rand() * w),
        y: Math.floor(Math.pow(rand(), 1.6) * h * 0.62),
        big: rand() < 0.08,
        phase: rand() * Math.PI * 2,
        speed: 0.6 + rand() * 1.8,
        appear: 300 + rand() * 1400,
      });
    }
    for (let i = 0; i < 18; i++) {
      this.fireflies.push({
        x: rand() * w,
        y: h * (0.68 + rand() * 0.24),
        r: 4 + rand() * 10,
        phase: rand() * Math.PI * 2,
        speed: 0.3 + rand() * 0.6,
      });
    }
    for (let gx = 0; gx < LW; gx += 2 + Math.floor(rand() * 3)) {
      this.grass.push({ x: gx, h: 1 + Math.floor(rand() * 3), phase: rand() * 6 });
    }
    for (let i = 0; i < 4; i++) {
      const sprite = cloudSprite(rand, 26 + Math.floor(rand() * 22));
      this.clouds.push({ x: rand() * w, y: h * (0.08 + rand() * 0.3), w: sprite.width, speed: 0.0012 + rand() * 0.0016, sprite });
    }
  }

  /** Is a logical point in open sky (where constellations may be drawn)? */
  isSky(x: number, y: number): boolean {
    if (x < 0 || x >= this.w || y < 0) return false;
    return y < this.mountains[Math.floor(x) + M] - 3;
  }

  private ground() {
    return this.nearHill[this.bunX + M];
  }

  /** Bun's hitbox in logical pixels. */
  bunBox(t: number) {
    return { x: this.bunX - 9, y: this.ground() - 19 + this.introLift(t), w: 18, h: 19 };
  }

  private introLift(t: number) {
    const enter = span(t, 2050, 2550);
    return enter < 1 ? Math.round((1 - easeBack(enter)) * 18) : 0;
  }

  render(ctx: CanvasRenderingContext2D, input: SceneInput): void {
    const { w, h } = this;
    const { t, lookX, lookY, scroll } = input;
    const px = (depth: number) => Math.round(lookX * depth);
    const py = (depth: number) => Math.round(lookY * depth * 0.5);
    const skyShift = Math.round(scroll * 0.5);

    // ---- Sky -------------------------------------------------------------
    ctx.putImageData(this.sky, 0, skyShift);
    if (skyShift > 0) {
      ctx.fillStyle = SKY[0];
      ctx.fillRect(0, 0, w, skyShift);
    }

    // ---- Stars -----------------------------------------------------------
    for (const s of this.stars) {
      if (t < s.appear) continue;
      const tw = Math.sin((t / 1000) * s.speed + s.phase);
      if (tw < -0.75) continue;
      const pop = t - s.appear < 220;
      const sx = s.x + px(-1);
      const sy = s.y + skyShift;
      ctx.fillStyle = tw > 0.6 || pop ? '#fff3c4' : tw > 0 ? '#d8c6e8' : '#8d76ad';
      ctx.fillRect(sx, sy, 1, 1);
      if ((s.big && tw > 0.2) || pop) {
        ctx.fillStyle = 'rgba(255, 243, 196, 0.45)';
        ctx.fillRect(sx - 1, sy, 1, 1);
        ctx.fillRect(sx + 1, sy, 1, 1);
        ctx.fillRect(sx, sy - 1, 1, 1);
        ctx.fillRect(sx, sy + 1, 1, 1);
      }
    }

    // ---- Shooting star ---------------------------------------------------
    if (t > this.nextShooting && !this.shooting) {
      const r = mulberry(Math.floor(t))();
      this.shooting = { x: w * (0.15 + r * 0.6), y: h * 0.05, born: t };
      this.nextShooting = t + 5000 + r * 7000;
    }
    if (this.shooting) {
      const age = t - this.shooting.born;
      if (age > 900) {
        this.shooting = null;
      } else {
        const hx = this.shooting.x + 0.09 * age;
        const hy = this.shooting.y + 0.045 * age + skyShift;
        for (let i = 0; i < 9; i++) {
          ctx.fillStyle = `rgba(255, 243, 196, ${(1 - i / 9) * (1 - age / 900)})`;
          ctx.fillRect(Math.round(hx - i * 2), Math.round(hy - i), 1, 1);
        }
      }
    }

    // ---- Moon ------------------------------------------------------------
    const narrow = w < 200;
    const moonR = narrow ? Math.max(7, Math.round(w * 0.07)) : Math.max(7, Math.round(h * 0.075));
    const moonRise = easeOut(span(t, 350, 1700));
    const mx = Math.round(w * (narrow ? 0.86 : 0.82)) + px(-2);
    const my = Math.round((narrow ? moonR + 22 : h * 0.2) + (1 - moonRise) * h * 0.55) + skyShift + py(-2);
    for (let dy = -moonR - 12; dy <= moonR + 12; dy++) {
      for (let dx = -moonR - 12; dx <= moonR + 12; dx++) {
        const dist = Math.hypot(dx, dy);
        if (dist <= moonR) {
          const shade = Math.hypot(dx + moonR * 0.35, dy - moonR * 0.25) > moonR * 1.05;
          const crater =
            Math.hypot(dx - moonR * 0.3, dy + moonR * 0.25) < moonR * 0.22 ||
            Math.hypot(dx + moonR * 0.25, dy - moonR * 0.35) < moonR * 0.15 ||
            Math.hypot(dx + moonR * 0.1, dy + moonR * 0.55) < moonR * 0.1;
          ctx.fillStyle = shade ? (crater ? '#e2bf88' : '#f3d9a6') : crater ? '#f0d7a8' : '#fff1cf';
          ctx.fillRect(mx + dx, my + dy, 1, 1);
        } else if (dist <= moonR + 12) {
          const density = 1 - (dist - moonR) / 12;
          const threshold = (BAYER_4X4[(my + dy) & 3][(mx + dx) & 3] + 0.5) / 16;
          if (density * 0.55 > threshold) {
            ctx.fillStyle = 'rgba(255, 214, 160, 0.13)';
            ctx.fillRect(mx + dx, my + dy, 1, 1);
          }
        }
      }
    }

    // ---- Drifting clouds, moonlit on top ---------------------------------
    const cloudIn = span(t, 900, 2000);
    if (cloudIn > 0) {
      ctx.globalAlpha = cloudIn * 0.9;
      for (const c of this.clouds) {
        const cx = Math.round(((c.x + t * c.speed) % (w + c.w + 20)) - c.w - 10) + px(-1);
        const cy = Math.round(c.y) + skyShift;
        ctx.drawImage(c.sprite, cx, cy - c.sprite.height);
      }
      ctx.globalAlpha = 1;
    }

    // ---- Constellations painted by the visitor ----------------------------
    for (const c of input.constellations) {
      for (let i = 1; i < c.stars.length; i++) {
        const a = c.stars[i - 1];
        const b = c.stars[i];
        const steps = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y));
        const grow = clamp01((t - b.born) / 260);
        for (let s = 1; s < steps * grow; s++) {
          if (s % 2) continue;
          ctx.fillStyle = 'rgba(220, 171, 223, 0.6)';
          ctx.fillRect(Math.round(a.x + ((b.x - a.x) * s) / steps), Math.round(a.y + ((b.y - a.y) * s) / steps) + skyShift, 1, 1);
        }
      }
      for (const s of c.stars) {
        const age = t - s.born;
        if (age < 0) continue;
        const pop = age < 300 ? Math.round(2 * Math.sin((age / 300) * Math.PI)) : 0;
        const tw = Math.sin(t / 300 + s.hue * 7) > 0.2;
        const sy = s.y + skyShift;
        ctx.fillStyle = s.hue > 0.5 ? '#ffd285' : '#fff3c4';
        ctx.fillRect(s.x, sy, 1, 1);
        ctx.fillStyle = tw ? 'rgba(255, 210, 133, 0.8)' : 'rgba(220, 171, 223, 0.7)';
        const arm = 1 + pop + (tw ? 1 : 0);
        for (let k = 1; k <= arm; k++) {
          ctx.globalAlpha = 1 - (k - 1) / (arm + 0.5);
          ctx.fillRect(s.x - k, sy, 1, 1);
          ctx.fillRect(s.x + k, sy, 1, 1);
          ctx.fillRect(s.x, sy - k, 1, 1);
          ctx.fillRect(s.x, sy + k, 1, 1);
        }
        ctx.globalAlpha = 1;
      }
    }

    // ---- Mountains --------------------------------------------------------
    const mRise = Math.round((1 - easeOut(span(t, 650, 1450))) * h * 0.35);
    ctx.drawImage(this.mountainLayer, -M + px(-3), Math.round(scroll * 0.35) + mRise + py(-3));

    // ---- Town -------------------------------------------------------------
    const tRise = Math.round((1 - easeOut(span(t, 850, 1650))) * h * 0.3);
    const tOff = px(-5);
    const tY = Math.round(scroll * 0.2) + tRise + py(-5);
    const ox = -M + tOff;
    ctx.drawImage(this.townLayer, ox, tY);

    // Fairy lights strung between neighbours
    for (const f of this.fairy) {
      const len = f.x1 - f.x0;
      for (let s = 1; s < len; s += 2) {
        const p = s / len;
        const fx = ox + f.x0 + s;
        const fy = Math.round(f.y0 + (f.y1 - f.y0) * p + Math.sin(p * Math.PI) * f.sag) + tY;
        const i = (s >> 1) + f.x0;
        const lit = t > 2400 + i * 15 && Math.sin(t / 500 + i * 1.3) > -0.6;
        ctx.fillStyle = lit ? FAIRY[i % FAIRY.length] : '#2c1d45';
        ctx.fillRect(fx, fy, 1, 1);
      }
    }

    for (const house of this.houses) {
      const top = house.base - house.h + tY;
      const hx = ox + house.x;
      // Chimney smoke
      if (house.chimney >= 0) {
        for (let p = 0; p < 4; p++) {
          const age = (t / 1900 + p / 4 + house.x * 0.13) % 1;
          ctx.fillStyle = `rgba(205, 185, 225, ${0.25 * (1 - age)})`;
          ctx.fillRect(
            hx + house.chimney + Math.round(Math.sin(age * 4 + p) * 1.5 + age * 4),
            top - Math.ceil(house.w / 2) - 1 - Math.round(age * 10),
            age > 0.5 ? 2 : 1,
            1
          );
        }
      }
      for (const win of house.windows) {
        if (t < win.on) continue;
        const wx = hx + win.x;
        const wy = top + win.y;
        ctx.drawImage(this.windowHalo, wx - 4, wy - 4);
        const justOn = t - win.on < 180;
        // Slow candle breathing between warm tones
        const breath = Math.sin(t / (900 + win.tone * 700) + win.tone * 9);
        ctx.fillStyle = justOn ? '#fff3c4' : WARM[breath > 0.5 ? 1 : breath < -0.6 ? 2 : 0];
        ctx.fillRect(wx, wy, 2, 2);
        ctx.fillStyle = '#fff3c4';
        ctx.fillRect(wx, wy, 1, 1);
        if (win.plant) {
          ctx.fillStyle = '#3a5a33';
          ctx.fillRect(wx + 1, wy + 1, 1, 1);
        }
      }
      if (house.door >= 0 && house.doorLamp && t > 2300) {
        const lx = hx + house.door + 2;
        const ly = house.base - 3 + tY;
        ctx.drawImage(this.doorHalo, lx - 4, ly - 4);
        ctx.fillStyle = Math.sin(t / 120 + house.x) > -0.8 ? '#ffd285' : '#f0be7c';
        ctx.fillRect(lx, ly, 1, 1);
      }
    }

    // A cat on a roof, tail swishing, eyes blinking
    if (this.cat && t > 2600) {
      const cx = ox + this.cat.x;
      const cy = this.cat.y + tY;
      ctx.fillStyle = '#0e0818';
      ctx.fillRect(cx, cy - 3, 4, 3);
      ctx.fillRect(cx, cy - 5, 1, 2);
      ctx.fillRect(cx + 3, cy - 5, 1, 2);
      ctx.fillRect(cx + 1, cy - 4, 2, 1);
      const swish = Math.sin(t / 420) > 0;
      ctx.fillRect(cx + 4, cy - 1, 2, 1);
      ctx.fillRect(cx + 5 + (swish ? 1 : 0), cy - 3, 1, 2);
      if (Math.floor(t / 140) % 24 !== 0) {
        ctx.fillStyle = '#c6f08a';
        ctx.fillRect(cx + 1, cy - 3, 1, 1);
        ctx.fillRect(cx + 3, cy - 3, 1, 1);
      }
    }

    // ---- Foreground hill ----------------------------------------------------
    const nShift = Math.round((1 - easeOut(span(t, 1100, 1800))) * h * 0.25);
    const nOff = px(-8);
    const nx = -M + nOff;
    ctx.drawImage(this.nearLayer, nx, nShift);
    for (const g of this.grass) {
      const gx = nx + g.x;
      const top = this.nearHill[g.x] + nShift;
      const sway = Math.sin(t / 700 + g.phase + g.x * 0.08) > 0.3 ? 1 : 0;
      ctx.fillStyle = GRASS;
      ctx.fillRect(gx, top - g.h, 1, g.h);
      if (g.h > 2) ctx.fillRect(gx + sway, top - g.h - 1, 1, 1);
    }

    const bx = this.bunX + nOff;
    const ground = this.ground() + nShift;

    // ---- Lantern, teacup, mushrooms -----------------------------------------
    const lanternLit = t > 2650;
    const flick = Math.sin(t / 90) * 0.5 + Math.sin(t / 37) * 0.3;
    const lx = bx + 14;
    const ly = ground - 5;
    if (lanternLit) {
      const flash = clamp01(1 - (t - 2650) / 500);
      ctx.globalAlpha = 0.85 + flick * 0.15 + flash * 0.4;
      ctx.drawImage(this.lanternHalo, lx - 24, ly - 22);
      ctx.globalAlpha = 1;
    }
    if (t > 2400) {
      ctx.fillStyle = '#3a2e4c';
      ctx.fillRect(lx - 2, ly - 3, 5, 7);
      ctx.fillRect(lx - 1, ly - 5, 3, 1);
      ctx.fillRect(lx, ly - 6, 1, 1);
      ctx.fillStyle = lanternLit ? (flick > 0.3 ? '#fff3c4' : '#ffd285') : '#6b5470';
      ctx.fillRect(lx - 1, ly - 2, 3, 4);
      ctx.fillStyle = '#d89a55';
      ctx.fillRect(lx - 2, ly + 4, 5, 1);

      // Teacup with a lazy curl of steam
      const tx = lx + 6;
      const ty = ground - 2;
      ctx.fillStyle = '#ede8f4';
      ctx.fillRect(tx, ty, 3, 2);
      ctx.fillRect(tx + 3, ty, 1, 1);
      ctx.fillStyle = '#b9a8d2';
      ctx.fillRect(tx - 1, ty + 2, 5, 1);
      for (let s = 0; s < 3; s++) {
        const age = (t / 1400 + s / 3) % 1;
        ctx.fillStyle = `rgba(237, 232, 244, ${0.5 * (1 - age)})`;
        ctx.fillRect(tx + 1 + Math.round(Math.sin(age * 6 + s) * 1), ty - 1 - Math.round(age * 6), 1, 1);
      }
    }
    // Glowing mushrooms on the slope
    if (t > 2500) {
      for (const [off, tall] of [[-42, 2], [-38, 3], [25, 2], [29, 3]] as const) {
        const sx = bx + off;
        const sy = this.nearHill[this.bunX + off + M] + nShift;
        const pulse = 0.7 + Math.sin(t / 800 + off) * 0.3;
        ctx.globalAlpha = pulse;
        ctx.drawImage(this.shroomHalo, sx - 3, sy - tall - 5);
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#ede8f4';
        ctx.fillRect(sx, sy - tall, 1, tall);
        // Domed cap with a glowing spot
        ctx.fillStyle = '#b07cc6';
        ctx.fillRect(sx - 2, sy - tall - 1, 5, 1);
        ctx.fillStyle = '#dcabdf';
        ctx.fillRect(sx - 1, sy - tall - 2, 3, 1);
        ctx.fillRect(sx - 2, sy - tall - 1, 1, 1);
        ctx.fillStyle = '#fff3c4';
        ctx.fillRect(sx + 1, sy - tall - 1, 1, 1);
      }
    }

    // ---- Easel with Bun being painted ---------------------------
    const easelShow = span(t, 1700, 2050);
    if (easelShow > 0) {
      const ex = bx - 31;
      const ey = ground - 26 + Math.round((1 - easeBack(easelShow)) * 26);
      ctx.fillStyle = '#5b3a2a';
      ctx.fillRect(ex + 2, ey + 18, 1, ground - (ey + 18));
      ctx.fillRect(ex + 17, ey + 18, 1, ground - (ey + 18));
      ctx.fillRect(ex + 9, ey - 2, 1, 3);
      ctx.fillStyle = '#7a5038';
      ctx.fillRect(ex, ey + 18, 20, 1);
      ctx.fillStyle = '#3a2e4c';
      ctx.fillRect(ex, ey, 20, 18);
      ctx.fillStyle = '#fbe9c6';
      ctx.fillRect(ex + 1, ey + 1, 18, 16);
      const painted = Math.floor(span(t, 2700, 3900) * GHOST_PIXELS.length);
      for (let i = 0; i < painted; i++) {
        const [gx, gy, c] = GHOST_PIXELS[i];
        ctx.fillStyle = c;
        ctx.fillRect(ex + 2 + gx, ey + 1 + gy, 1, 1);
      }
      if (painted === GHOST_PIXELS.length && Math.sin(t / 400) > 0.4) {
        ctx.fillStyle = '#fff3c4';
        ctx.fillRect(ex + 2 + 8, ey + 1 + 9, 1, 1);
      }
    }

    if (t > 2050) this.drawBun(ctx, input, bx, ground);

    // ---- Fireflies ----------------------------------------------------------
    const fAlpha = span(t, 2400, 3200);
    if (fAlpha > 0) {
      for (const f of this.fireflies) {
        const ft = (t / 1000) * f.speed + f.phase;
        const fx = Math.round(f.x + Math.sin(ft) * f.r + nOff);
        const fy = Math.round(f.y + Math.sin(ft * 1.7) * f.r * 0.4);
        const glow = Math.sin(ft * 3);
        if (glow < -0.2) continue;
        ctx.globalAlpha = fAlpha * (0.5 + glow * 0.5);
        ctx.fillStyle = glow > 0.5 ? '#fff3a8' : '#ffd285';
        ctx.fillRect(fx, fy, 1, 1);
        if (glow > 0.5) {
          ctx.fillStyle = 'rgba(255, 230, 140, 0.35)';
          ctx.fillRect(fx - 1, fy, 1, 1);
          ctx.fillRect(fx + 1, fy, 1, 1);
          ctx.fillRect(fx, fy - 1, 1, 1);
          ctx.fillRect(fx, fy + 1, 1, 1);
        }
        ctx.globalAlpha = 1;
      }
    }

    // ---- Intro: the sky dithers in from black, top to bottom -----------------
    const reveal = span(t, 0, 1100);
    if (reveal < 1) {
      ctx.fillStyle = '#07050e';
      for (let y = 0; y < h; y += 2) {
        for (let x = 0; x < w; x += 2) {
          const threshold = (BAYER_4X4[(y >> 1) & 3][(x >> 1) & 3] + 0.5) / 16;
          if (reveal * 1.5 - (y / h) * 0.5 < threshold) ctx.fillRect(x, y, 2, 2);
        }
      }
    }
  }

  /** Bun: smooth turns toward the pointer, a hover greeting, and five click reactions. */
  private drawBun(ctx: CanvasRenderingContext2D, input: SceneInput, bx: number, ground: number) {
    const { t, lookX } = input;
    const action = input.bunAction && t - input.bunAction.start < BUN_ACTION_MS[input.bunAction.type] ? input.bunAction : null;
    const p = action ? (t - action.start) / BUN_ACTION_MS[action.type] : 0;
    const painting = t > 2700 && t < 3900;

    // Decide which way to face; turning takes 180ms of squash-and-flip.
    let want = this.facing;
    if (painting) want = -1;
    else if (!action || action.type === 'nap') {
      if (lookX < -0.2) want = -1;
      else if (lookX > 0.2) want = 1;
    }
    if (action?.type === 'dance') want = Math.floor(p * 4) % 2 ? -1 : 1;
    if (want !== this.facing && t - this.turnStart > 180) {
      this.turnFrom = this.facing;
      this.facing = want;
      this.turnStart = t;
    }
    const turnP = clamp01((t - this.turnStart) / 180);
    let sx = turnP < 1 ? this.turnFrom * Math.cos(easeInOut(turnP) * Math.PI) : this.facing;
    if (Math.abs(sx) < 0.2) sx = Math.sign(sx || this.facing) * 0.2;

    let lift = this.introLift(t);
    let dx = 0;
    let squash = 0;
    let pose: BunPose = Math.floor(t / 130) % 31 === 0 ? 'blink' : 'idle';

    if (input.bunHover && !action) {
      pose = 'happy';
      lift -= 1;
    }
    if (action) {
      switch (action.type) {
        case 'hop': {
          pose = 'happy';
          if (p < 0.14) squash = 1;
          else if (p < 0.86) lift -= Math.round(Math.sin(((p - 0.14) / 0.72) * Math.PI) * 12);
          else squash = 1;
          break;
        }
        case 'spin': {
          pose = 'happy';
          lift -= Math.round(Math.sin(p * Math.PI) * 8);
          sx = Math.cos(easeInOut(p) * Math.PI * 4) * this.facing;
          if (Math.abs(sx) < 0.2) sx = Math.sign(sx || 1) * 0.2;
          break;
        }
        case 'wiggle': {
          pose = 'happy';
          dx = Math.round(Math.sin(p * Math.PI * 8) * 1.6 * (1 - p));
          break;
        }
        case 'dance': {
          pose = 'happy';
          const beat = (p * 4) % 1;
          lift -= Math.round(Math.sin(beat * Math.PI) * 4);
          dx = Math.floor(p * 4) % 2 ? -1 : 1;
          break;
        }
        case 'nap': {
          pose = 'blink';
          squash = p > 0.08 && p < 0.92 ? 1 : 0;
          break;
        }
      }
    }

    // Shadow under Bun shrinks while airborne
    const airborne = Math.max(0, -Math.min(0, lift));
    const shadowW = Math.max(6, 14 - airborne);
    ctx.fillStyle = 'rgba(8, 4, 16, 0.45)';
    ctx.fillRect(bx - (shadowW >> 1) + dx, ground, shadowW, 1);

    const by = ground - 17 + lift + squash;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, this.w, ground + 1);
    ctx.clip();
    ctx.translate(bx + dx, 0);
    ctx.scale(sx, 1);
    ctx.translate(-(bx + dx), 0);
    drawBun(ctx, bx + dx - 8, by, pose);
    ctx.restore();

    // Brush in Bun's paw while painting
    if (painting) {
      const dab = Math.sin(t / 90) > 0 ? 1 : 0;
      ctx.fillStyle = '#d89a55';
      ctx.fillRect(bx - 12 - dab, ground - 8, 3, 1);
      ctx.fillStyle = '#c792df';
      ctx.fillRect(bx - 13 - dab, ground - 8, 1, 1);
    }

    // Floating reactions
    const float = (rows: string[], i: number, period: number, color: string, spread = 5) => {
      const a = ((t - (action?.start ?? 0)) / period + i / 3) % 1;
      const fx = bx - 1 + Math.round((i - 1) * spread + Math.sin(a * 6 + i) * 1.5);
      const fy = by - 3 - Math.round(a * 12);
      ctx.globalAlpha = Math.sin(a * Math.PI);
      glyph(ctx, rows, fx, fy, color);
      ctx.globalAlpha = 1;
    };
    if (action) {
      const fade = 1 - Math.max(0, (p - 0.8) / 0.2);
      ctx.save();
      ctx.globalAlpha = fade;
      if (action.type === 'hop') for (let i = 0; i < 3; i++) float(GLYPH.heart, i, 700, i === 1 ? '#f0be7c' : '#f2b8c6');
      if (action.type === 'dance' || action.type === 'wiggle') for (let i = 0; i < 2; i++) float(GLYPH.note, i, 650, i ? '#dcabdf' : '#ffd285', 9);
      if (action.type === 'nap') {
        for (let i = 0; i < 3; i++) {
          const a = ((t - action.start) / 1100 + i / 3) % 1;
          ctx.globalAlpha = Math.sin(a * Math.PI) * fade;
          glyph(ctx, GLYPH.z, bx + 6 + Math.round(a * 6), by - Math.round(a * 12), '#cdbfdf');
        }
      }
      if (action.type === 'spin') {
        for (let i = 0; i < 4; i++) {
          const ang = p * Math.PI * 4 + (i * Math.PI) / 2;
          glyph(ctx, GLYPH.spark, bx - 1 + Math.round(Math.cos(ang) * 12), by + 7 + Math.round(Math.sin(ang) * 6), i % 2 ? '#ffd285' : '#dcabdf');
        }
      }
      ctx.restore();
    } else if (input.bunHover) {
      const a = (t / 900) % 1;
      ctx.globalAlpha = Math.sin(a * Math.PI);
      glyph(ctx, GLYPH.heart, bx - 1, by - 4 - Math.round(a * 5), '#f2b8c6');
      ctx.globalAlpha = 1;
    }
  }
}
