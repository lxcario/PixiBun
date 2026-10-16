import { BAYER_4X4 } from '@/lib/canvas/ditherMatrix';

/**
 * Procedural pixel scenes behind the floating studio panels, one per scene
 * theme and time of day. Everything is drawn in "scene pixels" (one scene
 * pixel is several screen pixels) from a fixed seed, so a scene looks the same
 * on every visit. A static base is built once per size; `paintScene` adds the
 * moving parts and is cheap enough to tick at ~8fps.
 */

type Orb = { kind: 'moon' | 'full' | 'sun' | 'synth'; x: number; y: number; r: number; light: string; shade: string; halo: string };
type HorizonKind = 'town' | 'pagoda' | 'yozakura' | 'reef' | 'roofs' | 'pines' | 'grid' | 'hills' | 'cabins' | 'city' | 'fields' | 'harbor';
type ParticleKind = 'stars' | 'petals' | 'bubbles' | 'embers' | 'fireflies' | 'leaves' | 'motes' | 'glints' | 'clouds8' | 'birds' | 'snow' | 'rain';

export interface SceneSpec {
  bands: string[];
  orb?: Orb;
  horizon: {
    kind: HorizonKind; far: string; near: string; accent?: string; line?: string; lights?: string[];
    /** Named extra colors a horizon kind draws with (torii, snow, barn...). */
    detail?: Record<string, string>;
  };
  particles: Array<{ kind: ParticleKind; colors: string[]; density: number }>;
  /** Red and white chōchin strung across the top, under the rail. */
  swag?: { colors: string[]; cord: string };
  clouds?: string;
  /** Long, flat bands of mist across the lower sky, as in woodblock prints. */
  mist?: string;
  /** Northern lights curtains, from their bright lower edge upward. */
  aurora?: string[];
}

const SCENES: Record<string, { night: SceneSpec; day: SceneSpec }> = {
  moonlit: {
    night: {
      bands: ['#0b0718', '#110a22', '#170d2c', '#1f1236'],
      orb: { kind: 'moon', x: 0.68, y: 30, r: 5, light: '#fff1cf', shade: '#e4c896', halo: 'rgba(255, 214, 160, 0.18)' },
      horizon: { kind: 'town', far: '#170e2a', near: '#130b24', lights: ['#e0a55c', '#7a5530'] },
      particles: [{ kind: 'stars', colors: ['#fff3c4', '#9d8bbd', '#5d4a80'], density: 220 }],
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
    // Yozakura: a night blossom-viewing festival. Full moon over Mt. Fuji,
    // a vermilion torii between stone lanterns, a pagoda, lit cherry trees and
    // a row of red chōchin across the top.
    night: {
      bands: ['#05071a', '#0a0f2c', '#111842', '#1a2253', '#262b62'],
      orb: { kind: 'full', x: 0.22, y: 40, r: 9, light: '#fff4dc', shade: '#ead7b4', halo: 'rgba(255, 228, 190, 0.16)' },
      mist: '#2a3170',
      horizon: {
        kind: 'yozakura',
        far: '#141a46',
        near: '#080a20',
        accent: '#b9557f',
        lights: ['#ffc46e', '#7a4a2a'],
        detail: {
          mountain: '#242c66', snow: '#a9b2dd', torii: '#d2412e', toriiShade: '#8a2419', toriiCap: '#16080c',
          blossom: '#d77ba3', blossomHi: '#f9b6cd', blossomShade: '#6e2c5a', stone: '#3a3f6a', bark: '#3a2a4c',
        },
      },
      particles: [
        { kind: 'stars', colors: ['#fff6e8', '#a7a9d8', '#454a7a'], density: 520 },
        { kind: 'petals', colors: ['#ffb3cc', '#ffd9e6', '#e07aa2'], density: 700 },
      ],
      swag: { colors: ['#d93a2b', '#d93a2b', '#f3e2bf'], cord: '#05060f' },
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
  cocoa: {
    // A snowed-in cabin under the northern lights, chimney smoking.
    night: {
      bands: ['#050914', '#0a1222', '#101b31', '#172640', '#203350'],
      orb: { kind: 'moon', x: 0.84, y: 22, r: 4, light: '#f2f7ff', shade: '#c4d2ea', halo: 'rgba(190, 215, 255, 0.16)' },
      aurora: ['#4fbf98', '#2c8a78', '#1f5c66', '#2e3a74'],
      horizon: {
        kind: 'cabins',
        far: '#16243c',
        near: '#0b1424',
        lights: ['#ffc77a', '#8a5a2a'],
        detail: { snow: '#b9c8e0', drift: '#d9e4f4', wall: '#2a1e22', smoke: '#4a5a78' },
      },
      particles: [
        { kind: 'stars', colors: ['#ffffff', '#9fb2d4', '#4a5a7a'], density: 300 },
        { kind: 'snow', colors: ['#ffffff', '#d4e0f2', '#8798b8'], density: 650 },
      ],
    },
    day: {
      bands: ['#c4daf0', '#d2e3f4', '#dfebf7', '#ecf3fa', '#f6f9fc'],
      orb: { kind: 'sun', x: 0.84, y: 22, r: 6, light: '#fffcf0', shade: '#ffefc8', halo: 'rgba(255, 245, 210, 0.6)' },
      horizon: {
        kind: 'cabins',
        far: '#a9bfd8',
        near: '#e8f0f9',
        detail: { snow: '#ffffff', drift: '#ffffff', pine: '#5f7f78', wall: '#8a5a44', glass: '#5a7088', smoke: '#ffffff' },
      },
      particles: [{ kind: 'snow', colors: ['#ffffff', '#ffffff', '#9fb5cf'], density: 800 }],
      clouds: 'rgba(255, 255, 255, 0.85)',
    },
  },
  drizzle: {
    // A rainy street after dark: café windows, flickering neon, steady rain.
    night: {
      bands: ['#070a0e', '#0b1016', '#10171f', '#16202b', '#1d2a36'],
      clouds: 'rgba(36, 48, 62, 0.75)',
      horizon: {
        kind: 'city',
        far: '#111a23',
        near: '#080c11',
        lights: ['#ffc36b', '#4a3418'],
        detail: { neonA: '#ff6fae', neonB: '#6ff2ff', neonC: '#ffd36b', awning: '#7a2a36', awningB: '#d8c8b0', tower: '#0d141b' },
      },
      particles: [{ kind: 'rain', colors: ['rgba(110, 140, 165, 0.22)', 'rgba(140, 170, 195, 0.3)', 'rgba(175, 200, 220, 0.4)'], density: 260 }],
    },
    day: {
      bands: ['#b8c3cd', '#c4ced7', '#d0d8df', '#dbe1e7', '#e6eaee'],
      clouds: 'rgba(242, 245, 248, 0.85)',
      horizon: {
        kind: 'city',
        far: '#a3b0bc',
        near: '#8795a3',
        detail: { neonA: '#d97a9e', neonB: '#6fb5c4', neonC: '#d9b26b', awning: '#b8505e', awningB: '#f2ead8', tower: '#7d8b99', glass: '#c9d3dc' },
      },
      particles: [{ kind: 'rain', colors: ['rgba(110, 125, 140, 0.25)', 'rgba(130, 145, 160, 0.32)', 'rgba(255, 255, 255, 0.5)'], density: 300 }],
    },
  },
  harvest: {
    // A harvest moon over the fields: haystacks, a barn, glowing pumpkins.
    night: {
      bands: ['#0b0818', '#150e24', '#22132c', '#351a34', '#4a233a'],
      orb: { kind: 'full', x: 0.7, y: 34, r: 8, light: '#ffcf86', shade: '#eaa660', halo: 'rgba(255, 170, 90, 0.2)' },
      horizon: {
        kind: 'fields',
        far: '#3e2440',
        near: '#1a0e1a',
        lights: ['#ff9a3c', '#7a3a10'],
        detail: { barn: '#24121e', trim: '#4a2a36', hay: '#6a4434', row: '#2c1a2c', pumpkin: '#c8561c', stem: '#3a4a1a' },
      },
      particles: [
        { kind: 'stars', colors: ['#fff0dc', '#a88aa8', '#5a3e5a'], density: 420 },
        { kind: 'leaves', colors: ['#c8582a', '#e08a2a', '#8a3a20'], density: 1500 },
        { kind: 'fireflies', colors: ['#ffc46a', '#fff0c4', '#4a2a1a'], density: 2400 },
      ],
    },
    day: {
      bands: ['#f4cf9c', '#f7dbb0', '#fae5c4', '#fcedd6', '#fff5e6'],
      orb: { kind: 'sun', x: 0.7, y: 26, r: 7, light: '#fff3d0', shade: '#ffd98c', halo: 'rgba(255, 200, 120, 0.5)' },
      horizon: {
        kind: 'fields',
        far: '#dcae6e',
        near: '#bf8a48',
        detail: { barn: '#b0402c', roof: '#6a3226', trim: '#f4e6d0', hay: '#e8c060', row: '#a8743a', pumpkin: '#e8781e', stem: '#4f6a1e' },
      },
      particles: [
        { kind: 'leaves', colors: ['#d0602a', '#e8a03a', '#a84a20'], density: 1100 },
        { kind: 'birds', colors: ['#7a4a30'], density: 9000 },
      ],
      clouds: 'rgba(255, 250, 240, 0.8)',
    },
  },
  harbor: {
    // A lighthouse sweeping the bay, boats bobbing at anchor, a shore town asleep.
    night: {
      bands: ['#060b18', '#0a1224', '#0f1a32', '#162440', '#1f2f4e'],
      orb: { kind: 'full', x: 0.3, y: 34, r: 7, light: '#fff3d4', shade: '#e2cfa8', halo: 'rgba(255, 230, 180, 0.16)' },
      horizon: {
        kind: 'harbor',
        far: '#111b30',
        near: '#070c16',
        lights: ['#ffc36b', '#6a4a22'],
        detail: {
          sea: '#0c182e', crest: '#2f4c78', glitter: '#e8d8b0', cliff: '#0a1120', tower: '#5d6884', stripe: '#6e2a30',
          lamp: '#fff0b0', beamRgb: '255, 226, 150', hull: '#2a1c22', sail: '#4a5470',
        },
      },
      particles: [{ kind: 'stars', colors: ['#fff6e0', '#9aa8cc', '#45527a'], density: 260 }],
    },
    day: {
      bands: ['#9fd0ef', '#b2daf2', '#c6e3f5', '#daedf8', '#ecf6fb'],
      orb: { kind: 'sun', x: 0.3, y: 26, r: 7, light: '#fffbe6', shade: '#ffe9b0', halo: 'rgba(255, 245, 200, 0.6)' },
      horizon: {
        kind: 'harbor',
        far: '#94b2c8',
        near: '#5f7d96',
        detail: {
          sea: '#4f92c0', crest: '#d8eef9', glitter: '#ffffff', cliff: '#9a8466', tower: '#ffffff', stripe: '#cc4a3c',
          lamp: '#ffe9a0', hull: '#8a4e34', sail: '#fffaf0', glass: '#3e5a72',
        },
      },
      particles: [{ kind: 'birds', colors: ['#5a6878'], density: 7000 }],
      clouds: 'rgba(255, 255, 255, 0.85)',
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
  /** Window and lantern pixels; `c`/`w` make a colored neon sign that flickers instead of dimming. */
  lights: Array<{ x: number; y: number; p: number; c?: string; w?: number }>;
  particles: Array<{ kind: ParticleKind; colors: string[]; items: Particle[] }>;
  clouds: Array<{ x: number; y: number; w: number; s: number }>;
  kelp: Array<{ x: number; h: number; p: number }>;
  /** Chimney tops that puff smoke. */
  chimneys: Array<{ x: number; y: number; p: number }>;
  /** Harbor: sea level, boats at anchor and the lighthouse lamp. */
  sea?: number;
  boats: Array<{ x: number; y: number; w: number; p: number }>;
  beacon?: { x: number; y: number };
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
  if (orb.kind === 'full') {
    // A full moon: a wide dithered halo, then the disc with a few faint seas
    for (let y = -orb.r - 4; y <= orb.r + 4; y++) {
      for (let x = -orb.r - 4; x <= orb.r + 4; x++) {
        const d = Math.hypot(x, y);
        if (d > orb.r && d <= orb.r + 4 && ((x + y) & 1) === 0 && (d <= orb.r + 2 || ((x * 3 + y) & 3) === 0)) {
          g.fillStyle = orb.halo;
          g.fillRect(cx + x, cy + y, 1, 1);
        }
      }
    }
    for (let y = -orb.r; y <= orb.r; y++) {
      for (let x = -orb.r; x <= orb.r; x++) {
        const d = Math.hypot(x, y);
        if (d > orb.r) continue;
        const sea = Math.hypot(x + orb.r * 0.3, y + orb.r * 0.2) < orb.r * 0.32
          || Math.hypot(x - orb.r * 0.25, y - orb.r * 0.3) < orb.r * 0.24
          || (Math.hypot(x - orb.r * 0.35, y + orb.r * 0.35) < orb.r * 0.18 && ((x + y) & 1) === 0);
        g.fillStyle = sea || d > orb.r - 0.8 ? orb.shade : orb.light;
        g.fillRect(cx + x, cy + y, 1, 1);
      }
    }
    return;
  }
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
  const detail = (key: string, fallback: string) => spec.horizon.detail?.[key] ?? fallback;
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
  } else if (kind === 'yozakura') {
    drawYozakura(g, w, h, spec, rand, built, column, detail);
  } else if (kind === 'cabins') {
    drawCabins(g, w, h, spec, rand, built, column, detail);
  } else if (kind === 'city') {
    drawCity(g, w, h, spec, rand, built, detail);
  } else if (kind === 'fields') {
    drawFields(g, w, h, spec, rand, built, column, detail);
  } else if (kind === 'harbor') {
    drawHarbor(g, w, h, spec, rand, built, column, detail);
  }
}

type Column = (x: number, top: number, color: string) => void;
type Detail = (key: string, fallback: string) => string;

/** One cherry tree: a dark trunk under a cloud of blossom lit from above. */
function blossomTree(g: CanvasRenderingContext2D, x: number, baseY: number, r: number, trunk: string, colors: [string, string, string], rand: () => number) {
  const [shade, mid, hi] = colors;
  const cy = baseY - 5 - r;
  g.fillStyle = trunk;
  g.fillRect(x, cy + 1, 2, baseY - cy + 2);
  g.fillRect(x - 2, cy + 2, 2, 1);
  g.fillRect(x + 2, cy + 1, 2, 1);
  const blobs = [[0, 0], [-Math.round(r * 0.85), 2], [Math.round(r * 0.85), 1], [0, -Math.round(r * 0.5)]];
  for (let y = -r * 2; y <= r + 2; y++) {
    for (let dx = -r * 2 - 1; dx <= r * 2 + 1; dx++) {
      let best = Infinity;
      let local = 0;
      for (const [bx, by] of blobs) {
        const dist = Math.hypot((dx - bx) * 0.85, y - by);
        if (dist < best) { best = dist; local = (y - by) / r; }
      }
      if (best > r || rand() < 0.07) continue;
      const v = local + (rand() - 0.5) * 0.3;
      g.fillStyle = v < -0.45 ? hi : v > 0.45 ? shade : mid;
      g.fillRect(x + dx, cy + y, 1, 1);
    }
  }
}

function drawYozakura(g: CanvasRenderingContext2D, w: number, h: number, spec: SceneSpec, rand: () => number, built: BuiltScene, column: Column, detail: Detail) {
  const { far, near, accent } = spec.horizon;
  const lit = spec.horizon.lights;
  const ground = groundLine(h);
  const baseY = ground - 2;
  const blossom: [string, string, string] = [detail('blossomShade', near), detail('blossom', accent ?? far), detail('blossomHi', accent ?? far)];

  // Mt. Fuji far behind: concave slopes, a flat crater rim and a ragged snowcap
  const fx = Math.round(w * 0.15);
  const fh = Math.min(64, Math.round(h * 0.3));
  const fw = Math.round(fh * 1.9);
  const peak = ground - 4 - fh;
  for (let dx = -fw; dx <= fw; dx++) {
    const t = Math.abs(dx) / fw;
    const top = Math.max(peak + 2, Math.round(ground - 4 - fh * (1 - t) ** 1.8));
    const snowLine = Math.round(peak + 2 + fh * 0.3 + Math.sin(dx * 1.7) * 2 + Math.sin(dx * 0.55) * 2.5);
    column(fx + dx, top, detail('mountain', far));
    if (snowLine > top) {
      g.fillStyle = detail('snow', far);
      g.fillRect(fx + dx, top, 1, snowLine - top);
    }
  }

  // Woodblock-print mist drifting across the mountain's foot and the sky
  if (spec.mist) {
    g.fillStyle = spec.mist;
    const bands = Math.max(3, Math.round(w / 70));
    for (let i = 0; i < bands; i++) {
      const len = 24 + Math.floor(rand() * 40);
      const x = Math.floor(rand() * w) - 10;
      const y = Math.round(peak + fh * (0.45 + rand() * 0.45));
      g.fillRect(x + 2, y, len - 4, 1);
      g.fillRect(x, y + 1, len, 2);
      g.fillRect(x + 3, y + 3, len - 6, 1);
    }
  }

  for (let x = 0; x < w; x++) column(x, Math.round(ground - 5 - Math.sin(x / 29) * 3 - Math.sin(x / 11) * 1.5), far);

  // A five-storey pagoda with upturned eaves
  const px = Math.round(w * 0.8);
  g.fillStyle = near;
  g.fillRect(px - 8, baseY - 2, 17, 8);
  for (let tier = 0; tier < 5; tier++) {
    const y = baseY - 7 - tier * 6;
    const half = Math.round(10 - tier * 1.5);
    g.fillStyle = near;
    g.fillRect(px - half, y, half * 2 + 1, 2);
    g.fillRect(px - half - 1, y - 1, 1, 1);
    g.fillRect(px + half + 1, y - 1, 1, 1);
    g.fillRect(px - half + 3, y + 2, (half - 3) * 2 + 1, 4);
    if (lit && tier < 4) built.lights.push({ x: px, y: y + 3, p: tier * 1.7 }, { x: px, y: y + 4, p: tier * 1.7 });
  }
  const top = baseY - 7 - 4 * 6;
  for (let k = 1; k <= 8; k++) g.fillRect(px - (k % 2 === 0 && k < 7 ? 1 : 0), top - k, k % 2 === 0 && k < 7 ? 3 : 1, 1);

  // A vermilion torii between two stone lanterns
  const tx = Math.round(w * 0.6);
  const torii = detail('torii', accent ?? near);
  const toriiShade = detail('toriiShade', near);
  const cap = detail('toriiCap', near);
  g.fillStyle = torii;
  g.fillRect(tx - 8, baseY - 20, 2, 20);
  g.fillRect(tx + 7, baseY - 20, 2, 20);
  g.fillRect(tx - 11, baseY - 15, 23, 2);
  g.fillRect(tx, baseY - 19, 1, 4);
  g.fillRect(tx - 12, baseY - 21, 25, 2);
  g.fillStyle = toriiShade;
  g.fillRect(tx - 7, baseY - 18, 1, 18);
  g.fillRect(tx + 8, baseY - 18, 1, 18);
  g.fillRect(tx - 11, baseY - 14, 23, 1);
  g.fillRect(tx - 12, baseY - 20, 25, 1);
  g.fillStyle = cap;
  g.fillRect(tx - 13, baseY - 22, 27, 1);
  g.fillRect(tx - 15, baseY - 23, 3, 1);
  g.fillRect(tx + 13, baseY - 23, 3, 1);
  g.fillRect(tx - 8, baseY - 2, 2, 4);
  g.fillRect(tx + 7, baseY - 2, 2, 4);

  const stone = detail('stone', far);
  for (const sx of [tx - 17, tx + 17]) {
    g.fillStyle = stone;
    g.fillRect(sx - 2, baseY, 5, 2);
    g.fillRect(sx, baseY - 3, 1, 3);
    g.fillRect(sx - 1, baseY - 4, 3, 1);
    g.fillRect(sx - 1, baseY - 6, 3, 2);
    g.fillRect(sx - 2, baseY - 7, 5, 1);
    g.fillRect(sx - 1, baseY - 8, 3, 1);
    g.fillRect(sx, baseY - 9, 1, 1);
    if (lit) built.lights.push({ x: sx, y: baseY - 6, p: sx }, { x: sx, y: baseY - 5, p: sx });
  }

  // Cherry trees in bloom, kept clear of the gate and the pagoda
  for (let x = 6; x < w - 4;) {
    if (Math.abs(x - tx) > 24 && Math.abs(x - px) > 16 && rand() < 0.75) {
      blossomTree(g, x, baseY + 1, 4 + Math.floor(rand() * 4), near, blossom, rand);
    }
    x += 10 + Math.floor(rand() * 12);
  }

  // A blossoming branch reaching in front of the moon
  const orb = spec.orb;
  if (orb) {
    const mx = Math.round(w * orb.x);
    const y0 = orb.y + orb.r + 9;
    const end = mx + Math.round(orb.r * 0.6);
    const branchY = (x: number) => Math.round(y0 - (x / end) * 14 + Math.sin(x / 9) * 1.5);
    const bark = detail('bark', near);
    g.fillStyle = bark;
    for (let x = 0; x <= end; x++) g.fillRect(x, branchY(x), 1, x < end * 0.55 ? 2 : 1);
    const flower = (x: number, y: number) => {
      g.fillStyle = blossom[1];
      g.fillRect(x - 1, y, 3, 1);
      g.fillRect(x, y - 1, 1, 3);
      g.fillStyle = blossom[2];
      g.fillRect(x, y, 1, 1);
    };
    const cluster = (x: number, y: number) => {
      g.fillStyle = blossom[0];
      g.fillRect(x - 1, y + 1, 4, 2);
      flower(x, y);
      flower(x + 2, y + 1);
      if (rand() < 0.6) flower(x - 1, y + 2);
      g.fillStyle = blossom[2];
      if (rand() < 0.5) g.fillRect(x + 3, y - 1, 1, 1);
    };
    for (let x = 10; x <= end; x += 6 + Math.floor(rand() * 5)) {
      const by = branchY(x);
      const up = rand() < 0.6;
      const len = 3 + Math.floor(rand() * 4);
      g.fillStyle = bark;
      for (let k = 1; k <= len; k++) g.fillRect(x + Math.floor(k / 2), by + (up ? -k : k), 1, 1);
      cluster(x + Math.floor(len / 2), by + (up ? -len - 1 : len + 1));
      cluster(x - 2, by + (up ? 1 : -2));
    }
    cluster(end + 1, branchY(end) - 1);
  }
}

function drawCabins(g: CanvasRenderingContext2D, w: number, h: number, spec: SceneSpec, rand: () => number, built: BuiltScene, column: Column, detail: Detail) {
  const { far, near } = spec.horizon;
  const lit = spec.horizon.lights;
  const ground = groundLine(h);
  const snow = detail('snow', '#ffffff');
  const pine = detail('pine', near);

  // A snowy ridge, its crest catching the light
  for (let x = 0; x < w; x++) {
    const top = Math.round(ground - 12 - Math.sin(x / 31) * 5 - Math.sin(x / 13) * 2);
    column(x, top, far);
    g.fillStyle = snow;
    if ((x & 3) !== 0) g.fillRect(x, top, 1, 1);
  }

  const snowyPine = (x: number, base: number, th: number) => {
    for (let y = 0; y < th; y++) {
      const half = Math.floor((y / th) * (th / 3)) + (y % 3 === 0 ? 1 : 0);
      g.fillStyle = pine;
      g.fillRect(x - half, base - th + y, half * 2 + 1, 1);
      if (y % 3 === 0) {
        g.fillStyle = snow;
        g.fillRect(x - half, base - th + y, half + 1, 1);
      }
    }
    g.fillStyle = pine;
    g.fillRect(x, base, 1, 3);
  };

  const cabins = [
    { x: Math.round(w * 0.08), cw: 16, ch: 8 },
    { x: Math.round(w * 0.66), cw: 20, ch: 9 },
    { x: Math.round(w * 0.9), cw: 14, ch: 7 },
  ];
  const clear = (x: number) => cabins.every(c => Math.abs(x - c.x) > c.cw / 2 + 3);

  for (let x = 2; x < w;) {
    if (clear(x) && rand() < 0.7) snowyPine(x, ground - 6, 10 + Math.floor(rand() * 8));
    x += 5 + Math.floor(rand() * 7);
  }

  const wall = detail('wall', near);
  const glass = detail('glass', lit ? lit[1] : near);
  for (const c of cabins) {
    const baseY = ground - 1;
    const left = c.x - (c.cw >> 1);
    g.fillStyle = wall;
    g.fillRect(left, baseY - c.ch, c.cw, c.ch + 2);
    g.fillStyle = near;
    g.fillRect(c.x - 1, baseY - 4, 3, 5);
    const rh = Math.ceil((c.cw + 4) / 2);
    for (let r = 0; r < rh; r++) {
      g.fillStyle = r === 0 ? near : snow;
      g.fillRect(left - 2 + r, baseY - c.ch - 1 - r, c.cw + 4 - r * 2, 1);
    }
    const chx = left + c.cw - 5;
    const chTop = baseY - c.ch - rh + 1;
    g.fillStyle = near;
    g.fillRect(chx, chTop, 2, 4);
    g.fillStyle = snow;
    g.fillRect(chx, chTop - 1, 2, 1);
    built.chimneys.push({ x: chx, y: chTop - 2, p: rand() });
    const p = rand() * 6;
    for (const wx of [left + 2, left + c.cw - 4]) {
      g.fillStyle = glass;
      g.fillRect(wx, baseY - c.ch + 2, 2, 2);
      if (lit) for (let k = 0; k < 4; k++) built.lights.push({ x: wx + (k & 1), y: baseY - c.ch + 2 + (k >> 1), p });
    }
  }

  // Snow banked along the bottom, with a few softer drifts
  for (let x = 0; x < w; x++) {
    const top = Math.round(ground - 2 - Math.max(0, Math.sin(x / 9) + Math.sin(x / 23)) * 1.5);
    g.fillStyle = snow;
    g.fillRect(x, top, 1, ground + 2 - top);
    g.fillStyle = detail('drift', snow);
    g.fillRect(x, top, 1, 1);
  }
}

function drawCity(g: CanvasRenderingContext2D, w: number, h: number, spec: SceneSpec, rand: () => number, built: BuiltScene, detail: Detail) {
  const { far, near } = spec.horizon;
  const lit = spec.horizon.lights;
  const ground = groundLine(h);
  const neon = [detail('neonA', '#ff6fae'), detail('neonB', '#6ff2ff'), detail('neonC', '#ffd36b')];
  /** Lit windows and neon flicker at night; by day they are painted once. */
  const light = (x: number, y: number, p: number, color?: string, width = 1) => {
    if (lit) built.lights.push({ x, y, p, c: color, w: width });
    else {
      g.fillStyle = color ?? detail('glass', near);
      g.fillRect(x, y, width, 1);
    }
  };

  // Tall blocks behind, a few windows still awake
  for (let x = 0; x < w;) {
    const bw = 8 + Math.floor(rand() * 12);
    const bh = 22 + Math.floor(rand() * Math.min(44, h * 0.25));
    g.fillStyle = far;
    g.fillRect(x, ground - bh, bw, bh);
    if (rand() < 0.35) g.fillRect(x + (bw >> 1), ground - bh - 5, 1, 5);
    if (lit) {
      for (let wy = ground - bh + 2; wy < ground - 14; wy += 3) {
        for (let wx = x + 1; wx < x + bw - 1; wx += 2) if (rand() < 0.1) built.lights.push({ x: wx, y: wy, p: rand() * 6 });
      }
    }
    x += bw + Math.floor(rand() * 3);
  }

  // Low shopfronts in front: water towers, awnings, glowing café windows and neon signs
  for (let x = -2; x < w;) {
    const bw = 12 + Math.floor(rand() * 10);
    const bh = 10 + Math.floor(rand() * 14);
    const roof = ground - bh;
    g.fillStyle = near;
    g.fillRect(x, roof, bw, bh + 2);
    g.fillRect(x - 1, roof, bw + 2, 1);
    if (rand() < 0.35) {
      g.fillStyle = detail('tower', near);
      g.fillRect(x + 2, roof - 3, 1, 3);
      g.fillRect(x + 5, roof - 3, 1, 3);
      g.fillRect(x + 1, roof - 8, 6, 5);
      g.fillRect(x + 2, roof - 9, 4, 1);
    }
    for (let wy = roof + 3; wy < ground - 8; wy += 3) {
      for (let wx = x + 2; wx < x + bw - 2; wx += 3) if (rand() < 0.3) light(wx, wy, rand() * 6);
    }
    if (rand() < 0.55) {
      const awning = detail('awning', near);
      const stripe = detail('awningB', awning);
      for (let ax = x + 1; ax < x + bw - 1; ax++) {
        g.fillStyle = ((ax - x) >> 1) % 2 === 0 ? awning : stripe;
        g.fillRect(ax, ground - 7, 1, 2);
      }
      const p = rand() * 6;
      for (let sy = ground - 4; sy < ground - 2; sy++) {
        for (let wx = x + 2; wx < x + bw - 4; wx += 4) light(wx, sy, p, lit ? undefined : detail('glass', near), 3);
      }
    }
    if (rand() < 0.6) {
      const color = neon[Math.floor(rand() * neon.length)];
      const p = rand() * 6;
      if (rand() < 0.5) light(x + 2 + Math.floor(rand() * Math.max(1, bw - 9)), roof + 2, p, color, 4 + Math.floor(rand() * 3));
      else for (let k = 0; k < 5; k++) light(x + bw - 2, roof + 2 + k, p, color);
    }
    x += bw;
  }
}

function drawHarbor(g: CanvasRenderingContext2D, w: number, h: number, spec: SceneSpec, rand: () => number, built: BuiltScene, column: Column, detail: Detail) {
  const { far, near } = spec.horizon;
  const lit = spec.horizon.lights;
  const ground = groundLine(h);
  const sea = ground - 16;
  built.sea = sea;

  // The far side of the bay, then the water and the moon's (or sun's) path across it
  for (let x = 0; x < w; x++) column(x, Math.round(sea - 3 - Math.max(0, Math.sin(x / 53) * 6 + Math.sin(x / 19) * 2)), far);
  g.fillStyle = detail('sea', far);
  g.fillRect(0, sea, w, ground - sea + 2);
  if (spec.orb) {
    const mx = Math.round(w * spec.orb.x);
    g.fillStyle = detail('glitter', spec.orb.light);
    for (let y = sea + 1; y < ground; y += 2) {
      const half = 2 + Math.floor((y - sea) / 2);
      for (let k = -half; k <= half; k += 3) if (rand() < 0.65) g.fillRect(mx + k + Math.floor(rand() * 2), y, 2, 1);
    }
  }

  // A little shore town on the left with a pier reaching out
  const townEnd = Math.round(w * 0.27);
  for (let x = 2; x < townEnd;) {
    const hw = 5 + Math.floor(rand() * 4);
    const hh = 4 + Math.floor(rand() * 5);
    g.fillStyle = near;
    g.fillRect(x, sea - hh, hw, hh + 1);
    for (let r = 0; r < Math.ceil(hw / 2); r++) g.fillRect(x + r, sea - hh - r - 1, hw - r * 2, 1);
    const wy = sea - hh + 2;
    const wx = x + 1 + Math.floor(rand() * Math.max(1, hw - 2));
    if (lit) {
      if (rand() < 0.75) built.lights.push({ x: wx, y: wy, p: rand() * 6 });
    } else {
      g.fillStyle = detail('glass', near);
      g.fillRect(wx, wy, 1, 1);
    }
    x += hw + 1 + Math.floor(rand() * 4);
  }
  const pier = Math.round(w * 0.1);
  g.fillStyle = near;
  g.fillRect(townEnd - 4, sea - 1, pier, 1);
  for (let x = townEnd - 2; x < townEnd - 4 + pier; x += 5) g.fillRect(x, sea, 1, 4);

  // A cliff on the right with a striped lighthouse and the keeper's cottage
  const lx = Math.round(w * 0.73);
  const cliff = detail('cliff', near);
  for (let dx = -30; dx <= 40; dx++) {
    const rise = dx < 0 ? 15 + dx * 0.5 : 15 - dx * 0.4;
    if (rise <= 0) continue;
    const rim = Math.round(sea - rise - Math.abs(Math.sin(dx * 0.9)) * 1.2);
    g.fillStyle = cliff;
    g.fillRect(lx + dx, rim, 1, sea + 2 - rim);
  }
  const top = sea - 15;
  for (let i = 0; i < 22; i++) {
    const half = i < 8 ? 3 : 2;
    g.fillStyle = Math.floor(i / 4) % 2 === 0 ? detail('tower', near) : detail('stripe', near);
    g.fillRect(lx - half, top - i, half * 2 + 1, 1);
  }
  const lamp = top - 25;
  g.fillStyle = near;
  g.fillRect(lx - 4, top - 22, 9, 1);
  g.fillRect(lx - 3, lamp - 1, 7, 1);
  g.fillRect(lx - 2, lamp - 2, 5, 1);
  g.fillRect(lx, lamp - 3, 1, 1);
  g.fillStyle = detail('lamp', '#fff0b0');
  g.fillRect(lx - 2, lamp, 5, 3);
  if (spec.horizon.detail?.beamRgb) built.beacon = { x: lx, y: lamp + 1 };
  g.fillStyle = near;
  g.fillRect(lx - 14, top - 5, 8, 5);
  for (let r = 0; r < 5; r++) g.fillRect(lx - 15 + r, top - 6 - r, 10 - r * 2, 1);
  if (lit) built.lights.push({ x: lx - 11, y: top - 3, p: 2 }, { x: lx - 10, y: top - 3, p: 2 });

  // Boats at anchor out on the water
  for (const [fx, row] of [[0.36, 4], [0.47, 9], [0.58, 5], [0.9, 10]]) {
    built.boats.push({ x: Math.round(w * fx), y: sea + row, w: 7 + Math.floor(rand() * 4), p: rand() * 6 });
  }
}

function drawFields(g: CanvasRenderingContext2D, w: number, h: number, spec: SceneSpec, rand: () => number, built: BuiltScene, column: Column, detail: Detail) {
  const { far, near } = spec.horizon;
  const lit = spec.horizon.lights;
  const ground = groundLine(h);
  const hillTop = (x: number) => Math.round(ground - 10 - Math.sin(x / 37) * 4 - Math.sin(x / 15) * 2);

  // Rolling fields striped with furrows
  const row = detail('row', near);
  for (let x = 0; x < w; x++) {
    const top = hillTop(x);
    column(x, top, far);
    g.fillStyle = row;
    for (let y = top + 2; y < ground; y++) if ((x + (ground - y) * 3) % 7 === 0) g.fillRect(x, y, 1, 1);
  }

  // A gambrel-roofed barn with a glowing hayloft
  const bx = Math.round(w * 0.66);
  const bw = 20;
  const baseY = ground - 1;
  const left = bx - bw / 2;
  const barn = detail('barn', near);
  const trim = detail('trim', near);
  g.fillStyle = barn;
  g.fillRect(left, baseY - 11, bw, 13);
  const roofRows = [11, 11, 10, 10, 9, 7, 5, 3];
  g.fillStyle = detail('roof', barn);
  roofRows.forEach((half, r) => g.fillRect(bx - half, baseY - 12 - r, half * 2, 1));
  g.fillStyle = trim;
  g.fillRect(bx - 4, baseY - 6, 8, 1);
  g.fillRect(bx - 4, baseY - 6, 1, 7);
  g.fillRect(bx + 3, baseY - 6, 1, 7);
  for (let k = 0; k < 6; k++) {
    g.fillRect(bx - 3 + k, baseY - 5 + k, 1, 1);
    g.fillRect(bx + 2 - k, baseY - 5 + k, 1, 1);
  }
  const loft = { x: bx - 1, y: baseY - 15 };
  g.fillStyle = lit ? lit[1] : trim;
  g.fillRect(loft.x, loft.y, 2, 2);
  if (lit) for (let k = 0; k < 4; k++) built.lights.push({ x: loft.x + (k & 1), y: loft.y + (k >> 1), p: 1 });

  // Haystacks and a scarecrow keeping watch
  const hay = detail('hay', far);
  for (let x = 6; x < w - 6;) {
    if (Math.abs(x - bx) > 18 && rand() < 0.5) {
      const r = 3 + Math.floor(rand() * 3);
      for (let dx = -r; dx <= r; dx++) {
        const top = baseY - Math.round(Math.sqrt(r * r - dx * dx) * 1.3);
        g.fillStyle = hay;
        g.fillRect(x + dx, top, 1, baseY - top + 2);
        g.fillStyle = row;
        if ((dx & 1) === 0) g.fillRect(x + dx, top + 2, 1, 1);
      }
    }
    x += 14 + Math.floor(rand() * 20);
  }
  const sx = Math.round(w * 0.1);
  g.fillStyle = near;
  g.fillRect(sx, baseY - 14, 1, 15);
  g.fillRect(sx - 5, baseY - 10, 11, 1);
  g.fillRect(sx - 2, baseY - 10, 5, 5);
  g.fillRect(sx - 1, baseY - 13, 3, 2);
  g.fillRect(sx - 3, baseY - 14, 7, 1);
  g.fillRect(sx - 1, baseY - 16, 3, 2);

  // Pumpkins along the bottom; at night they are carved and glowing
  const pumpkin = detail('pumpkin', '#c8561c');
  const stem = detail('stem', near);
  for (let x = 4; x < w - 4;) {
    if (rand() < 0.45) {
      g.fillStyle = pumpkin;
      g.fillRect(x - 1, ground - 3, 4, 3);
      g.fillRect(x - 2, ground - 2, 6, 1);
      g.fillStyle = stem;
      g.fillRect(x + 1, ground - 4, 1, 1);
      if (lit) built.lights.push({ x, y: ground - 2, p: rand() * 6 }, { x: x + 2, y: ground - 2, p: rand() * 6 });
    }
    x += rand() < 0.3 ? 6 : 18 + Math.floor(rand() * 34);
  }
}

export function buildScene(themeId: string, day: boolean, w: number, h: number): BuiltScene {
  const spec = getSceneSpec(themeId, day);
  const rand = rng(5 + themeId.length * 97 + (day ? 1 : 0));
  const base = document.createElement('canvas');
  base.width = w;
  base.height = h;
  const g = base.getContext('2d')!;
  const built: BuiltScene = { w, h, spec, base, lights: [], particles: [], clouds: [], kelp: [], chimneys: [], boats: [] };
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
        case 'snow': {
          const x = Math.floor(wrap(q.x + Math.sin(sec * 0.9 * q.s + q.p) * 3 + sec * 1.2, w));
          const y = Math.floor(wrap(q.y + sec * 5 * q.s, h));
          g.fillStyle = col(q.c);
          if (q.s > 1.45) {
            g.fillRect(x - 1, y, 3, 1);
            g.fillRect(x, y - 1, 1, 3);
          } else if (q.s > 1.05) g.fillRect(x, y, 2, 2);
          else g.fillRect(x, y, 1, 1);
          break;
        }
        case 'rain': {
          // Slanted streaks that splash where they meet the street
          const fall = q.y + sec * 70 * q.s;
          const y = Math.floor(wrap(fall, h));
          const x = Math.floor(wrap(q.x - fall * 0.25, w));
          const ground = groundLine(h);
          if (y > ground) break;
          g.fillStyle = col(q.c);
          g.fillRect(x, y, 1, 2);
          if (q.s > 0.9) g.fillRect(x - 1, y + 2, 1, 2);
          if (y > ground - 4) {
            g.fillRect(x - 2, ground - 1, 1, 1);
            g.fillRect(x + 1, ground - 1, 1, 1);
          }
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

function paintHarbor(g: CanvasRenderingContext2D, scene: BuiltScene, sec: number) {
  const { w, h, spec } = scene;
  const sea = scene.sea ?? groundLine(h);
  const ground = groundLine(h);
  const d = spec.horizon.detail ?? {};
  // Wave crests that drift and sparkle
  g.fillStyle = d.crest ?? spec.horizon.far;
  for (let y = sea + 1; y < ground; y += 2) {
    for (let x = 0; x < w; x += 2) {
      if (Math.sin(x * 0.55 + y * 1.7 + sec * 1.6) + Math.sin(x * 0.13 - y + sec * 0.7) > 1.7) g.fillRect(x, y, 2, 1);
    }
  }
  for (const b of scene.boats) {
    const y = b.y + (Math.sin(sec * 1.4 + b.p) > 0.3 ? 1 : 0);
    const mast = b.x + Math.floor(b.w / 2) - 1;
    g.fillStyle = d.sail ?? spec.horizon.far;
    for (let i = 0; i < 6; i++) g.fillRect(mast + 1, y - 7 + i, Math.ceil(i * 0.7), 1);
    g.fillStyle = spec.horizon.near;
    g.fillRect(mast, y - 8, 1, 8);
    g.fillStyle = d.hull ?? spec.horizon.near;
    g.fillRect(b.x, y, b.w, 1);
    g.fillRect(b.x + 1, y + 1, b.w - 2, 1);
    if (spec.horizon.lights && Math.sin(sec * 3 + b.p * 5) > -0.8) {
      g.fillStyle = spec.horizon.lights[0];
      g.fillRect(b.x + b.w - 1, y - 2, 1, 1);
      g.fillStyle = 'rgba(255, 200, 120, 0.2)';
      g.fillRect(b.x + b.w - 2, y - 3, 3, 3);
    }
  }
}

export function paintScene(g: CanvasRenderingContext2D, scene: BuiltScene, t: number) {
  const { spec, w } = scene;
  g.drawImage(scene.base, 0, 0);
  const sec = t / 1000;
  if (spec.aurora) {
    // Curtains that sway and fade upward in a dither, opening and closing slowly
    const cols = spec.aurora;
    const orbX = spec.orb ? Math.round(w * spec.orb.x) : -100;
    const orbClear = spec.orb ? spec.orb.r + 3 : 0;
    for (let x = 0; x < w; x++) {
      const curtain = Math.sin(x / 41 + sec * 0.12) + Math.sin(x / 17 - sec * 0.2) * 0.5;
      if (curtain < 0 || Math.abs(x - orbX) <= orbClear) continue;
      const foot = Math.round(48 + Math.sin(x / 23 + sec * 0.35) * 6 + Math.sin(x / 7 - sec * 0.6) * 1.5);
      const len = Math.round(8 + curtain * 12);
      for (let i = 0; i < len; i++) {
        const f = i / len;
        if ((f > 0.3 && (x + i) & 1) || (f > 0.65 && (x + i) & 3)) continue;
        g.fillStyle = cols[Math.min(cols.length - 1, Math.floor(f * cols.length))];
        g.fillRect(x, foot - i, 1, 1);
      }
    }
  }
  if (scene.kelp.length) {
    g.fillStyle = spec.horizon.near;
    for (const k of scene.kelp) {
      for (let i = 0; i < k.h; i++) {
        const sway = Math.round(Math.sin(sec * 1.2 + k.p + i * 0.35) * (i / k.h) * 2);
        g.fillRect(k.x + sway, groundLine(scene.h) - 2 - i, 1, 1);
      }
    }
  }
  if (scene.sea !== undefined) paintHarbor(g, scene, sec);
  paintParticles(g, scene, t);
  if (scene.beacon) {
    // The lighthouse beam swings round: long when side-on, short as it turns toward or away from us
    const { x: bx, y: by } = scene.beacon;
    const turn = Math.cos(sec * 0.8);
    if (Math.abs(turn) > 0.12) {
      const dir = Math.sign(turn);
      const len = Math.round(Math.abs(turn) * w * 0.45);
      const beam = spec.horizon.detail?.beamRgb ?? '255, 226, 150';
      for (let d = 3; d < len; d++) {
        const half = Math.round(d * 0.05);
        g.fillStyle = `rgba(${beam}, ${(0.42 * (1 - d / len) + 0.06).toFixed(2)})`;
        g.fillRect(bx + dir * d, by - half, 1, half * 2 + 1);
      }
    }
    if (Math.sin(sec * 0.8) > 0.85) {
      g.fillStyle = 'rgba(255, 245, 200, 0.45)';
      g.fillRect(bx - 4, by - 3, 9, 7);
    }
  }
  if (spec.horizon.lights) {
    const [on, off] = spec.horizon.lights;
    for (const l of scene.lights) {
      if (l.c) {
        // Neon: mostly steady, with the odd buzzing stutter
        if (Math.sin(t / 1300 + l.p) < -0.85 || Math.sin(t / 97 + l.p * 7) > 0.96) continue;
        g.fillStyle = l.c;
      } else g.fillStyle = Math.sin(t / 900 + l.p) > -0.7 ? on : off ?? on;
      g.fillRect(l.x, l.y, l.w ?? 1, 1);
    }
  }
  if (scene.chimneys.length) {
    g.fillStyle = spec.horizon.detail?.smoke ?? spec.horizon.far;
    for (const c of scene.chimneys) {
      for (let k = 0; k < 6; k++) {
        const life = (sec * 0.3 + k / 6 + c.p) % 1;
        if (life > 0.75 && (k + Math.floor(sec * 4)) & 1) continue;
        const size = 1 + Math.floor(life * 3);
        g.fillRect(Math.round(c.x + Math.sin(life * 4 + sec * 0.8 + c.p * 6) * 2 + life * 7), Math.round(c.y - life * 24), size, size);
      }
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
        if ((x - x0) % 13 === 3) {
          // A ribbed paper chōchin with black lacquer caps, a candle flickering inside
          const color = spec.swag.colors[Math.floor(x / 13) % spec.swag.colors.length];
          const glow = Math.sin(t / 380 + x * 1.7) * 0.5 + Math.sin(t / 157 + x) * 0.5 > -0.75;
          g.fillStyle = spec.swag.cord;
          g.fillRect(x - 1, y + 1, 3, 1);
          g.fillStyle = color;
          g.fillRect(x - 1, y + 2, 3, 1);
          g.fillRect(x - 2, y + 3, 5, 3);
          g.fillRect(x - 1, y + 6, 3, 1);
          g.fillStyle = 'rgba(0, 0, 0, 0.22)';
          g.fillRect(x - 2, y + 4, 5, 1);
          g.fillRect(x + 1, y + 2, 1, 5);
          g.fillStyle = glow ? 'rgba(255, 214, 140, 0.55)' : 'rgba(255, 190, 120, 0.25)';
          g.fillRect(x - 1, y + 3, 2, 3);
          g.fillStyle = spec.swag.cord;
          g.fillRect(x - 1, y + 7, 3, 1);
          g.fillRect(x, y + 8, 1, 1);
          if (glow) {
            g.fillStyle = 'rgba(255, 140, 90, 0.13)';
            g.fillRect(x - 3, y + 1, 7, 8);
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
