import { BAYER_4X4 } from '@/lib/canvas/ditherMatrix';

/**
 * Procedural pixel scenes behind the floating studio panels, one per scene
 * theme and time of day. Everything is drawn in "scene pixels" (one scene
 * pixel is several screen pixels) from a fixed seed, so a scene looks the same
 * on every visit. A static base is built once per size; `paintScene` adds the
 * moving parts and is cheap enough to tick at ~8fps.
 */

type Orb = { kind: 'moon' | 'sun' | 'synth'; x: number; y: number; r: number; light: string; shade: string; halo: string };
type HorizonKind = 'town' | 'pagoda' | 'reef' | 'roofs' | 'pines' | 'grid' | 'hills';
type ParticleKind = 'stars' | 'petals' | 'bubbles' | 'embers' | 'fireflies' | 'leaves' | 'motes' | 'glints' | 'clouds8' | 'birds';

export interface SceneSpec {
  bands: string[];
  orb?: Orb;
  horizon: { kind: HorizonKind; far: string; near: string; accent?: string; line?: string; lights?: string[] };
  particles: Array<{ kind: ParticleKind; colors: string[]; density: number }>;
  /** Fairy lights or lanterns strung across the top, under the rail. */
  swag?: { colors: string[]; cord: string; lanterns?: boolean };
  clouds?: string;
}

const SCENES: Record<string, { night: SceneSpec; day: SceneSpec }> = {
  moonlit: {
    night: {
      bands: ['#0b0718', '#110a22', '#170d2c', '#1f1236'],
      orb: { kind: 'moon', x: 0.68, y: 30, r: 5, light: '#fff1cf', shade: '#e4c896', halo: 'rgba(255, 214, 160, 0.18)' },
      horizon: { kind: 'town', far: '#170e2a', near: '#130b24', lights: ['#e0a55c', '#7a5530'] },
      particles: [{ kind: 'stars', colors: ['#fff3c4', '#9d8bbd', '#5d4a80'], density: 220 }],
      swag: { colors: ['#ffd285', '#f2b8c6', '#c792df', '#a8e092'], cord: '#0b0714' },
      clouds: 'rgba(60, 40, 96, 0.55)',
    },
    day: {
      bands: ['#e9dcf2', '#efe0ee', '#f6e4e2', '#fbe9dc'],
      orb: { kind: 'sun', x: 0.68, y: 30, r: 5, light: '#ffe2b8', shade: '#ffd9a3', halo: 'rgba(255, 210, 160, 0.5)' },
      horizon: { kind: 'town', far: '#d9c3e6', near: '#cbb2dc' },
      particles: [{ kind: 'birds', colors: ['#9c7fb8'], density: 9000 }],
      clouds: 'rgba(255, 250, 255, 0.75)',
    },
  },
  sakura: {
    night: {
      bands: ['#090c20', '#0f1430', '#171a3e', '#22204a'],
      orb: { kind: 'moon', x: 0.22, y: 26, r: 6, light: '#fff0f4', shade: '#f2c9d6', halo: 'rgba(255, 190, 215, 0.2)' },
      horizon: { kind: 'pagoda', far: '#141838', near: '#0c0f26', accent: '#7a3a5e', lights: ['#ffb36b', '#7a4a33'] },
      particles: [
        { kind: 'stars', colors: ['#fff1f6', '#a7a9d8', '#555a8a'], density: 320 },
        { kind: 'petals', colors: ['#ffa3c4', '#ffc8da', '#d9709a'], density: 900 },
      ],
      swag: { colors: ['#ff8fb3', '#ffb36b', '#ffd3e2'], cord: '#060818', lanterns: true },
    },
    day: {
      bands: ['#fde6ee', '#fdeef0', '#fff4ef', '#fff8ec'],
      orb: { kind: 'sun', x: 0.22, y: 26, r: 6, light: '#fff6e6', shade: '#ffe8cc', halo: 'rgba(255, 200, 210, 0.55)' },
      horizon: { kind: 'pagoda', far: '#f2cfdb', near: '#e8b9ca', accent: '#f7a8c4' },
      particles: [{ kind: 'petals', colors: ['#f48fb6', '#ffb7cf', '#e0789f'], density: 800 }],
      clouds: 'rgba(255, 255, 255, 0.8)',
    },
  },
  tidepool: {
    night: {
      bands: ['#04161c', '#062026', '#082a31', '#0b343c'],
      orb: { kind: 'moon', x: 0.8, y: 22, r: 5, light: '#e8fffb', shade: '#a9e3d9', halo: 'rgba(120, 240, 220, 0.16)' },
      horizon: { kind: 'reef', far: '#0a2b31', near: '#051a1f', accent: '#ff9eb0' },
      particles: [
        { kind: 'bubbles', colors: ['#5fe0cf', '#2f9e93', '#c8fff6'], density: 1100 },
        { kind: 'glints', colors: ['#5fe0cf', '#1f6d70'], density: 1800 },
      ],
    },
    day: {
      bands: ['#bfeee6', '#cff3ec', '#def7f1', '#ecfaf5'],
      orb: { kind: 'sun', x: 0.8, y: 22, r: 6, light: '#fffbe6', shade: '#fff1c2', halo: 'rgba(255, 245, 200, 0.6)' },
      horizon: { kind: 'reef', far: '#a6dcd2', near: '#8bcbbf', accent: '#ff9f8a' },
      particles: [
        { kind: 'bubbles', colors: ['#ffffff', '#7cc9bd', '#e6fffa'], density: 1200 },
        { kind: 'glints', colors: ['#ffffff', '#c9f1ea'], density: 1600 },
      ],
    },
  },
  ember: {
    night: {
      bands: ['#120b08', '#1a0f0a', '#24140c', '#331a0e'],
      orb: { kind: 'moon', x: 0.3, y: 24, r: 4, light: '#ffe9cf', shade: '#e0b88a', halo: 'rgba(255, 170, 100, 0.14)' },
      horizon: { kind: 'roofs', far: '#21140d', near: '#140c08', lights: ['#ffb056', '#7a4a22'] },
      particles: [
        { kind: 'stars', colors: ['#ffe8cc', '#8a6a52', '#4a382a'], density: 420 },
        { kind: 'embers', colors: ['#ffd166', '#ff9e52', '#e0582a', '#7a2c14'], density: 520 },
      ],
    },
    day: {
      bands: ['#fbe3c8', '#fbe9d4', '#fdf0e0', '#fff6ec'],
      orb: { kind: 'sun', x: 0.3, y: 24, r: 7, light: '#fff3d6', shade: '#ffdfa6', halo: 'rgba(255, 190, 120, 0.5)' },
      horizon: { kind: 'roofs', far: '#efcfae', near: '#e2b993' },
      particles: [{ kind: 'motes', colors: ['#ffffff', '#ffe6c4'], density: 260 }],
      clouds: 'rgba(255, 252, 245, 0.75)',
    },
  },
  moss: {
    night: {
      bands: ['#060d08', '#09130b', '#0d1a10', '#122216'],
      orb: { kind: 'moon', x: 0.62, y: 24, r: 5, light: '#f4ffe0', shade: '#c9dca8', halo: 'rgba(220, 242, 126, 0.14)' },
      horizon: { kind: 'pines', far: '#102116', near: '#07110a' },
      particles: [
        { kind: 'stars', colors: ['#f1f7e9', '#7c967a', '#3e523f'], density: 340 },
        { kind: 'fireflies', colors: ['#dcf27e', '#f4ffcc', '#3f4a1e'], density: 1100 },
      ],
    },
    day: {
      bands: ['#e3f0c8', '#eaf3d6', '#f1f7e3', '#f7faee'],
      orb: { kind: 'sun', x: 0.62, y: 24, r: 6, light: '#fffbe0', shade: '#fff0b0', halo: 'rgba(255, 240, 170, 0.55)' },
      horizon: { kind: 'pines', far: '#c3d9a8', near: '#a6c48a' },
      particles: [{ kind: 'leaves', colors: ['#8fb84a', '#c9a24a', '#6f9a3a'], density: 900 }],
      clouds: 'rgba(255, 255, 250, 0.8)',
    },
  },
  arcade: {
    night: {
      bands: ['#05051a', '#0d0826', '#1c0b35', '#331045'],
      orb: { kind: 'synth', x: 0.64, y: 0, r: 14, light: '#ffe14d', shade: '#ff5ad8', halo: '#4a1450' },
      horizon: { kind: 'grid', far: '#1e0c3a', near: '#0a0418', accent: '#ff5ad8', line: '#5a1f6e' },
      particles: [{ kind: 'stars', colors: ['#f5f5ff', '#3ef5e0', '#4848a3'], density: 260 }],
    },
    day: {
      bands: ['#7ec8ff', '#92d2ff', '#a8dcff', '#c2e7ff'],
      orb: { kind: 'sun', x: 0.84, y: 20, r: 6, light: '#fff6b0', shade: '#ffd23f', halo: 'rgba(255, 240, 150, 0.5)' },
      horizon: { kind: 'hills', far: '#5cc46b', near: '#2f9a45', accent: '#1d5e2c' },
      particles: [
        { kind: 'clouds8', colors: ['#ffffff', '#2a2a3b'], density: 9000 },
        { kind: 'birds', colors: ['#2a2a3b'], density: 12000 },
      ],
    },
  },
};

export function hasScene(themeId: string): boolean {
  return themeId in SCENES;
}

export function getSceneSpec(themeId: string, day: boolean): SceneSpec {
  const scene = SCENES[themeId] ?? SCENES.moonlit;
  return day ? scene.day : scene.night;
}

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a * 1664525 + 1013904223) >>> 0;
    return a / 4294967296;
  };
}

function rgb(c: string) {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

interface Particle { x: number; y: number; p: number; s: number; c: number }

export interface BuiltScene {
  w: number;
  h: number;
  spec: SceneSpec;
  base: HTMLCanvasElement;
  lights: Array<{ x: number; y: number; p: number }>;
  particles: Array<{ kind: ParticleKind; colors: string[]; items: Particle[] }>;
  clouds: Array<{ x: number; y: number; w: number; s: number }>;
  kelp: Array<{ x: number; h: number; p: number }>;
}

function fillDither(g: CanvasRenderingContext2D, w: number, h: number, bands: string[]) {
  const colors = bands.map(rgb);
  const img = g.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    const pos = (y / h) * (colors.length - 1);
    const i = Math.min(colors.length - 2, Math.floor(pos));
    const f = pos - i;
    for (let x = 0; x < w; x++) {
      const c = f > (BAYER_4X4[y & 3][x & 3] + 0.5) / 16 ? colors[i + 1] : colors[i];
      const o = (y * w + x) * 4;
      img.data[o] = c[0];
      img.data[o + 1] = c[1];
      img.data[o + 2] = c[2];
      img.data[o + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
}

/** Scene pixels kept clear at the bottom for the timeline card. */
export function groundLine(h: number) {
  return h - Math.max(10, Math.round(h * 0.17));
}

function gridHorizon(h: number) {
  return Math.round(h * 0.6);
}

function drawOrb(g: CanvasRenderingContext2D, w: number, h: number, orb: Orb) {
  const cx = Math.round(w * orb.x);
  if (orb.kind === 'synth') {
    // A striped synthwave sun resting on the grid horizon, with a dithered glow
    const cy = gridHorizon(h);
    for (let y = -orb.r - 4; y <= 0; y++) {
      for (let x = -orb.r - 4; x <= orb.r + 4; x++) {
        const d = Math.hypot(x, y);
        if (d > orb.r && d <= orb.r + 4 && ((x + y) & 1) === 0 && d <= orb.r + 4 - ((x * 7 + y * 3) & 1) * 2) {
          g.fillStyle = orb.halo;
          g.fillRect(cx + x, cy + y, 1, 1);
        }
      }
    }
    for (let y = -orb.r; y <= 0; y++) {
      if (y > -orb.r * 0.5 && ((y + 1) & 3) === 0) continue;
      const half = Math.round(Math.sqrt(orb.r * orb.r - y * y));
      g.fillStyle = (y + orb.r) / orb.r < 0.45 ? orb.light : orb.shade;
      g.fillRect(cx - half, cy + y, half * 2 + 1, 1);
    }
    return;
  }
  const cy = orb.y;
  for (let y = -orb.r - 1; y <= orb.r + 1; y++) {
    for (let x = -orb.r - 1; x <= orb.r + 1; x++) {
      const d = Math.hypot(x, y);
      if (d <= orb.r) {
        g.fillStyle = orb.kind === 'moon' && Math.hypot(x + 2, y - 1.5) <= orb.r ? orb.shade : orb.light;
        if (orb.kind === 'sun') g.fillStyle = d < orb.r - 1.5 ? orb.light : orb.shade;
        g.fillRect(cx + x, cy + y, 1, 1);
      } else if (d <= orb.r + 1 && (x + y) % 2 === 0) {
        g.fillStyle = orb.halo;
        g.fillRect(cx + x, cy + y, 1, 1);
      }
    }
  }
}

function drawHorizon(g: CanvasRenderingContext2D, w: number, h: number, spec: SceneSpec, rand: () => number, built: BuiltScene) {
  const { kind, far, near, accent } = spec.horizon;
  const lit = spec.horizon.lights;
  const ground = groundLine(h);
  const column = (x: number, top: number, color: string) => {
    g.fillStyle = color;
    g.fillRect(x, top, 1, h - top);
  };
  if (kind !== 'grid') {
    // Everything under the ground line is hidden by the timeline; keep it solid.
    g.fillStyle = near;
    g.fillRect(0, ground, w, h - ground);
  }
  if (kind === 'town' || kind === 'roofs' || kind === 'pagoda') {
    for (let x = 0; x < w; x++) column(x, Math.round(ground - 6 - Math.sin(x / 23) * 3 - Math.sin(x / 7.3) * 1.2), far);
  }
  if (kind === 'town') {
    for (let x = 2; x < w - 6;) {
      const hw = 4 + Math.floor(rand() * 4);
      const hh = 3 + Math.floor(rand() * 4);
      if (rand() < 0.55) {
        const baseY = ground - 2;
        g.fillStyle = near;
        g.fillRect(x, baseY - hh, hw, hh + 6);
        for (let r = 0; r < Math.ceil(hw / 2); r++) g.fillRect(x + r, baseY - hh - r - 1, hw - r * 2, 1);
        if (lit && rand() < 0.7) built.lights.push({ x: x + 1 + Math.floor(rand() * (hw - 2)), y: baseY - hh + 1 + Math.floor(rand() * Math.max(1, hh - 2)), p: rand() * 6 });
      }
      x += hw + 2 + Math.floor(rand() * 8);
    }
  } else if (kind === 'roofs') {
    // Tall gabled houses with chimneys, shoulder to shoulder
    for (let x = 0; x < w;) {
      const hw = 6 + Math.floor(rand() * 6);
      const hh = 6 + Math.floor(rand() * 7);
      const baseY = ground;
      g.fillStyle = near;
      g.fillRect(x, baseY - hh, hw, hh + 4);
      for (let r = 0; r < Math.ceil(hw / 2); r++) g.fillRect(x + r, baseY - hh - r - 1, hw - r * 2, 1);
      if (rand() < 0.6) g.fillRect(x + hw - 3, baseY - hh - Math.ceil(hw / 2) - 1, 2, 4);
      if (lit) for (let k = 0; k < 2; k++) if (rand() < 0.55) built.lights.push({ x: x + 1 + Math.floor(rand() * (hw - 2)), y: baseY - hh + 2 + Math.floor(rand() * Math.max(1, hh - 3)), p: rand() * 6 });
      x += hw + Math.floor(rand() * 3);
    }
  } else if (kind === 'pagoda') {
    const px = Math.round(w * 0.74);
    const baseY = ground - 2;
    g.fillStyle = near;
    for (let tier = 0; tier < 4; tier++) {
      const y = baseY - 6 - tier * 6;
      const half = 9 - tier * 2;
      g.fillRect(px - half, y, half * 2 + 1, 1);
      g.fillRect(px - half - 1, y - 1, 2, 1);
      g.fillRect(px + half, y - 1, 2, 1);
      g.fillRect(px - half + 2, y + 1, half * 2 - 3, 5);
    }
    g.fillRect(px, baseY - 34, 1, 6);
    g.fillRect(px - 9, baseY - 1, 19, 7);
    if (lit) built.lights.push({ x: px - 1, y: baseY - 10, p: 0 }, { x: px + 1, y: baseY - 16, p: 2 });
    // Cherry trees: dark trunks under round canopies
    for (let x = 4; x < w - 4;) {
      if (Math.abs(x - px) > 14 && rand() < 0.6) {
        const r = 3 + Math.floor(rand() * 3);
        const cy = baseY - 4 - r;
        g.fillStyle = near;
        g.fillRect(x, cy, 1, baseY - cy + 6);
        g.fillStyle = accent ?? near;
        for (let y = -r; y <= r; y++) for (let dx = -r - 1; dx <= r + 1; dx++) if (dx * dx * 0.7 + y * y <= r * r && rand() > 0.08) g.fillRect(x + dx, cy + y, 1, 1);
      }
      x += 6 + Math.floor(rand() * 9);
    }
  } else if (kind === 'reef') {
    for (let x = 0; x < w; x++) column(x, Math.round(ground - 8 - Math.sin(x / 17) * 3 - Math.sin(x / 5.1) * 1.5), far);
    for (let x = 0; x < w;) {
      const rw = 5 + Math.floor(rand() * 10);
      const rh = 3 + Math.floor(rand() * 6);
      g.fillStyle = near;
      for (let dx = 0; dx < rw; dx++) column(x + dx, ground - Math.round(Math.sin((dx / rw) * Math.PI) * rh), near);
      if (accent && rand() < 0.5) {
        // a little branching coral
        const cx = x + Math.floor(rw / 2);
        const top = ground - rh - 1;
        g.fillStyle = accent;
        g.fillRect(cx, top - 4, 1, 4);
        g.fillRect(cx - 2, top - 3, 1, 3);
        g.fillRect(cx + 2, top - 2, 1, 2);
        g.fillRect(cx - 2, top - 1, 5, 1);
      }
      if (rand() < 0.6) built.kelp.push({ x: x + Math.floor(rand() * rw), h: 8 + Math.floor(rand() * 12), p: rand() * 6 });
      x += rw + Math.floor(rand() * 6);
    }
  } else if (kind === 'pines') {
    const layer = (color: string, baseOffset: number, scale: number) => {
      for (let x = -4; x < w + 4;) {
        const th = Math.round((8 + rand() * 10) * scale);
        const base = ground - baseOffset;
        g.fillStyle = color;
        for (let y = 0; y < th; y++) {
          const half = Math.floor((y / th) * (th / 3)) + (y % 3 === 0 ? 1 : 0);
          g.fillRect(x - half, base - th + y, half * 2 + 1, 1);
        }
        g.fillRect(x - 1, base, 3, baseOffset);
        x += Math.round((3 + rand() * 5) * scale);
      }
    };
    layer(far, 6, 1.1);
    layer(near, 0, 0.8);
  } else if (kind === 'grid') {
    const horizon = gridHorizon(h);
    // Distant mountains, then the neon floor
    for (let x = 0; x < w; x++) column(x, horizon - Math.round(Math.abs(Math.sin(x / 19)) * 7 + Math.abs(Math.sin(x / 7)) * 2), far);
    g.fillStyle = near;
    g.fillRect(0, horizon, w, h - horizon);
    g.fillStyle = spec.horizon.line ?? far;
    // Cross-bars bunch up toward the horizon
    for (let k = 1; ; k++) {
      const y = horizon + Math.round(k * k * 0.9);
      if (y >= h) break;
      g.fillRect(0, y, w, 1);
    }
    // Rails converge on the vanishing point; step along the longer axis so steep lines stay solid
    const cx = Math.round(w / 2);
    const depth = h - horizon;
    for (let i = -9; i <= 9; i++) {
      const x1 = cx + i * Math.round(w / 9);
      const steps = Math.max(Math.abs(x1 - cx), depth);
      for (let t = 0; t <= steps; t++) {
        g.fillRect(Math.round(cx + ((x1 - cx) * t) / steps), Math.round(horizon + (depth * t) / steps), 1, 1);
      }
    }
    g.fillStyle = accent ?? '#ff5ad8';
    g.fillRect(0, horizon, w, 1);
  } else if (kind === 'hills') {
    const hill = (cx: number, r: number, color: string, outline: string) => {
      for (let x = -r; x <= r; x++) {
        const top = ground - Math.round(Math.sqrt(Math.max(0, r * r - x * x)) * 0.55);
        g.fillStyle = color;
        g.fillRect(cx + x, top, 1, h - top);
        g.fillStyle = outline;
        g.fillRect(cx + x, top, 1, 1);
      }
    };
    for (let x = 0; x < w + 40;) {
      const r = 18 + Math.floor(rand() * 22);
      hill(x, r, far, accent ?? near);
      x += r + 10 + Math.floor(rand() * 20);
    }
    for (let x = 10; x < w + 20;) {
      const r = 9 + Math.floor(rand() * 10);
      hill(x, r, near, accent ?? near);
      x += r * 2 + 12 + Math.floor(rand() * 30);
    }
  }
}

export function buildScene(themeId: string, day: boolean, w: number, h: number): BuiltScene {
  const spec = getSceneSpec(themeId, day);
  const rand = rng(5 + themeId.length * 97 + (day ? 1 : 0));
  const base = document.createElement('canvas');
  base.width = w;
  base.height = h;
  const g = base.getContext('2d')!;
  const built: BuiltScene = { w, h, spec, base, lights: [], particles: [], clouds: [], kelp: [] };
  fillDither(g, w, h, spec.bands);
  if (spec.orb) drawOrb(g, w, h, spec.orb);
  drawHorizon(g, w, h, spec, rand, built);
  for (const p of spec.particles) {
    const count = Math.max(2, Math.round((w * h) / p.density));
    built.particles.push({
      kind: p.kind,
      colors: p.colors,
      items: Array.from({ length: count }, () => ({ x: rand() * w, y: rand() * h, p: rand() * Math.PI * 2, s: 0.4 + rand() * 1.2, c: Math.floor(rand() * p.colors.length) })),
    });
  }
  if (spec.clouds) {
    built.clouds = Array.from({ length: 4 }, () => ({ x: rand() * w, y: 8 + rand() * h * 0.45, w: 14 + Math.floor(rand() * 18), s: 0.0008 + rand() * 0.0012 }));
  }
  return built;
}

const wrap = (v: number, n: number) => ((v % n) + n) % n;

/** Paints only a scene's moving particles (petals, bubbles, embers...), e.g. over another painting. */
export function paintSceneParticles(g: CanvasRenderingContext2D, scene: BuiltScene, t: number, skip: readonly string[] = []) {
  paintParticles(g, scene, t, skip);
}

function paintParticles(g: CanvasRenderingContext2D, scene: BuiltScene, t: number, skip: readonly string[] = []) {
  const { w, h } = scene;
  const sec = t / 1000;
  for (const group of scene.particles) {
    if (skip.includes(group.kind)) continue;
    const col = (i: number) => group.colors[Math.min(i, group.colors.length - 1)];
    for (const q of group.items) {
      switch (group.kind) {
        case 'stars': {
          if (q.y > h * 0.7) break;
          const tw = Math.sin(sec * q.s + q.p);
          if (tw < -0.5) break;
          g.fillStyle = tw > 0.75 ? col(0) : tw > 0 ? col(1) : col(2);
          g.fillRect(Math.floor(q.x), Math.floor(q.y * 0.7), 1, 1);
          break;
        }
        case 'petals':
        case 'leaves': {
          const fall = group.kind === 'petals' ? 5 : 4;
          const x = Math.floor(wrap(q.x + sec * 3 * q.s + Math.sin(sec * 1.3 + q.p) * 3, w));
          const y = Math.floor(wrap(q.y + sec * fall * q.s, h));
          g.fillStyle = col(q.c);
          if (group.kind === 'petals') {
            g.fillRect(x, y, 2, 1);
            if (Math.sin(sec * 2 + q.p) > 0) g.fillRect(x + 1, y + 1, 1, 1);
          } else {
            g.fillRect(x, y, 2, 2);
            g.fillRect(x + (Math.sin(sec + q.p) > 0 ? 2 : -1), y + 1, 1, 1);
          }
          break;
        }
        case 'bubbles': {
          const x = Math.floor(q.x + Math.sin(sec * 1.4 + q.p) * 2);
          const y = Math.floor(h - wrap(q.y + sec * 6 * q.s, h));
          if (y > groundLine(h)) break;
          g.fillStyle = col(q.c);
          if (q.s > 1.2) {
            // a 4x4 ring with a highlight
            g.fillRect(x + 1, y, 2, 1);
            g.fillRect(x + 1, y + 3, 2, 1);
            g.fillRect(x, y + 1, 1, 2);
            g.fillRect(x + 3, y + 1, 1, 2);
            g.fillStyle = col(2);
            g.fillRect(x + 1, y + 1, 1, 1);
          } else if (q.s > 0.8) {
            g.fillRect(x, y, 2, 2);
          } else g.fillRect(x, y, 1, 1);
          break;
        }
        case 'embers': {
          const life = wrap(q.y + sec * 9 * q.s, h);
          const y = Math.floor(h - life);
          const x = Math.floor(q.x + Math.sin(sec * 2.2 + q.p) * 3 + (life / h) * 4);
          const stage = Math.min(group.colors.length - 1, Math.floor((life / h) * group.colors.length));
          if (Math.sin(sec * 9 + q.p * 3) < -0.6) break;
          g.fillStyle = col(stage);
          g.fillRect(x, y, 1, 1);
          break;
        }
        case 'fireflies': {
          const x = Math.floor(q.x + Math.sin(sec * 0.6 * q.s + q.p) * 9);
          const y = Math.floor(h * 0.35 + q.y * 0.6 + Math.cos(sec * 0.45 * q.s + q.p) * 5);
          const glow = Math.sin(sec * 1.8 * q.s + q.p * 2);
          if (glow < 0.2 || y > groundLine(h)) break;
          if (glow > 0.8) {
            g.fillStyle = col(2);
            g.fillRect(x - 1, y - 1, 3, 3);
          }
          g.fillStyle = glow > 0.8 ? col(1) : col(0);
          g.fillRect(x, y, 1, 1);
          break;
        }
        case 'motes': {
          // Dust in a sunbeam slanting from the top-left
          const along = wrap(q.y + sec * 2 * q.s, h);
          const x = Math.floor(q.x * 0.35 + along * 0.9 + Math.sin(sec * 0.7 + q.p) * 2);
          if (Math.sin(sec * 1.1 + q.p) < -0.2) break;
          g.fillStyle = col(q.c);
          g.fillRect(x, Math.floor(along), 1, 1);
          break;
        }
        case 'glints': {
          if (q.y < h * 0.15 || q.y > groundLine(h)) break;
          const on = Math.sin(sec * 2.6 * q.s + q.p);
          if (on < 0.85) break;
          const x = Math.floor(q.x);
          const y = Math.floor(q.y);
          g.fillStyle = col(1);
          g.fillRect(x, y, 1, 1);
          if (on > 0.96) {
            g.fillStyle = col(0);
            g.fillRect(x - 1, y, 3, 1);
            g.fillRect(x, y - 1, 1, 3);
          }
          break;
        }
        case 'clouds8': {
          const cw = 10 + Math.floor(q.s * 8);
          const x = Math.floor(wrap(q.x + sec * 1.5 * q.s, w + cw * 2) - cw);
          const y = Math.floor(6 + q.y * 0.35);
          g.fillStyle = col(1);
          g.fillRect(x + 2, y - 3, cw - 4, 1);
          g.fillRect(x, y - 1, cw, 1);
          g.fillRect(x - 1, y, 1, 3);
          g.fillRect(x + cw, y, 1, 3);
          g.fillRect(x, y + 3, cw, 1);
          g.fillStyle = col(0);
          g.fillRect(x + 2, y - 2, cw - 4, 1);
          g.fillRect(x, y, cw, 3);
          g.fillRect(x + 1, y - 1, cw - 2, 1);
          break;
        }
        case 'birds': {
          const x = Math.floor(wrap(q.x + sec * 7 * q.s, w + 20) - 10);
          const y = Math.floor(10 + q.y * 0.3 + Math.sin(sec + q.p) * 2);
          const up = Math.sin(sec * 6 + q.p) > 0;
          g.fillStyle = col(0);
          g.fillRect(x, y, 1, 1);
          g.fillRect(x - 1, y + (up ? -1 : 1), 1, 1);
          g.fillRect(x + 1, y + (up ? -1 : 1), 1, 1);
          break;
        }
      }
    }
  }
}

export function paintScene(g: CanvasRenderingContext2D, scene: BuiltScene, t: number) {
  const { spec, w } = scene;
  g.drawImage(scene.base, 0, 0);
  const sec = t / 1000;
  if (scene.kelp.length) {
    g.fillStyle = spec.horizon.near;
    for (const k of scene.kelp) {
      for (let i = 0; i < k.h; i++) {
        const sway = Math.round(Math.sin(sec * 1.2 + k.p + i * 0.35) * (i / k.h) * 2);
        g.fillRect(k.x + sway, groundLine(scene.h) - 2 - i, 1, 1);
      }
    }
  }
  paintParticles(g, scene, t);
  if (spec.horizon.lights) {
    const [on, off] = spec.horizon.lights;
    for (const l of scene.lights) {
      g.fillStyle = Math.sin(t / 900 + l.p) > -0.7 ? on : off ?? on;
      g.fillRect(l.x, l.y, 1, 1);
    }
  }
  if (spec.swag) {
    const swags = Math.max(2, Math.round(w / 90));
    for (let i = 0; i < swags; i++) {
      const x0 = Math.round((w / swags) * i);
      const x1 = Math.round((w / swags) * (i + 1));
      for (let x = x0; x < x1; x++) {
        const p = (x - x0) / (x1 - x0);
        const y = 17 + Math.round(Math.sin(p * Math.PI) * 6);
        g.fillStyle = spec.swag.cord;
        g.fillRect(x, y, 1, 1);
        const step = spec.swag.lanterns ? 15 : 7;
        if ((x - x0) % step === 3) {
          const lit = Math.sin(t / 700 + x * 0.9) > -0.35;
          const color = spec.swag.colors[Math.floor(x / step) % spec.swag.colors.length];
          if (spec.swag.lanterns) {
            g.fillStyle = color;
            g.fillRect(x - 1, y + 1, 3, 4);
            g.fillStyle = spec.swag.cord;
            g.fillRect(x - 1, y + 5, 3, 1);
            if (lit) {
              g.fillStyle = 'rgba(255, 200, 160, 0.18)';
              g.fillRect(x - 2, y, 5, 7);
            }
          } else {
            g.fillStyle = lit ? color : '#3a2a4a';
            g.fillRect(x, y + 1, 1, 2);
            if (lit) {
              g.fillStyle = 'rgba(255, 210, 133, 0.16)';
              g.fillRect(x - 1, y, 3, 4);
            }
          }
        }
      }
    }
  }
  if (spec.clouds) {
    for (const c of scene.clouds) {
      const x = Math.round(((c.x + t * c.s) % (w + c.w * 2)) - c.w);
      const y = Math.round(c.y);
      g.fillStyle = spec.clouds;
      g.fillRect(x + 2, y - 2, c.w - 6, 1);
      g.fillRect(x + 1, y - 1, c.w - 3, 1);
      g.fillRect(x, y, c.w, 2);
    }
  }
}
