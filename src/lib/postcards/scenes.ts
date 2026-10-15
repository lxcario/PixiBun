/**
 * Living Postcards: six small scenes painted for color cycling.
 *
 * Each scene is an indexed picture plus a palette whose cycle tracks make it
 * move: flames and steam rise, water falls, rain slants down the glass, neon
 * flickers, the tide rolls in and lava flows. Recolor a ramp in the Palette
 * panel and the motion keeps working, because the motion lives in the palette
 * order, not in the pixels. Every color in a palette is unique, so the
 * Studio's register map finds each pixel's exact entry.
 */
import type { PaletteCycleTrack } from '@/types/palette';

export const POSTCARD_WIDTH = 64;
export const POSTCARD_HEIGHT = 48;

export interface Postcard {
  id: PostcardId;
  name: string;
  blurb: string;
  width: number;
  height: number;
  palette: string[];
  tracks: PaletteCycleTrack[];
  /** Palette index per pixel, row by row. */
  pixels: Uint8Array;
}

export type PostcardId = 'campfire' | 'waterfall' | 'rainy-window' | 'neon-sign' | 'tide' | 'lava';

interface Ramp { low: number; high: number; size: number; at: (step: number) => number }

/** Deterministic noise, so a postcard is the same every time. */
function hash(x: number, y: number, seed = 1): number {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

class Scene {
  readonly w = POSTCARD_WIDTH;
  readonly h = POSTCARD_HEIGHT;
  readonly pixels = new Uint8Array(this.w * this.h);
  readonly palette: string[] = [];
  readonly tracks: PaletteCycleTrack[] = [];

  color(hex: string): number {
    const value = hex.toLowerCase();
    const known = this.palette.indexOf(value);
    if (known >= 0) return known;
    this.palette.push(value);
    return this.palette.length - 1;
  }

  /** Consecutive registers that cycle together. Colors must not appear elsewhere. */
  ramp(name: string, hexes: string[], rate: number, direction: PaletteCycleTrack['direction'] = 'forward', blendShift = false): Ramp {
    const low = this.palette.length;
    for (const hex of hexes) {
      const value = hex.toLowerCase();
      if (this.palette.includes(value)) throw new Error(`Postcard color ${value} is used twice.`);
      this.palette.push(value);
    }
    const high = this.palette.length - 1;
    this.tracks.push({ id: `track-${name}`, name, low, high, rate, direction, blendShift, enabled: true });
    const size = hexes.length;
    return { low, high, size, at: step => low + (((Math.floor(step) % size) + size) % size) };
  }

  set(x: number, y: number, index: number) {
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.pixels[y * this.w + x] = index;
  }
  get(x: number, y: number) { return this.pixels[y * this.w + x]; }
  rect(x: number, y: number, w: number, h: number, index: number) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, index);
  }
  each(fn: (x: number, y: number) => number | undefined) {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) { const i = fn(x, y); if (i !== undefined) this.set(x, y, i); }
  }
  /** Vertical sky in stepped bands, with ordered-dither seams between them. */
  sky(hexes: string[], top = 0, bottom = this.h) {
    const bands = hexes.map(hex => this.color(hex));
    const span = (bottom - top) / bands.length;
    for (let y = top; y < bottom; y++) for (let x = 0; x < this.w; x++) {
      const t = (y - top) / span;
      const band = Math.min(bands.length - 1, Math.floor(t));
      const frac = t - band;
      const dither = frac > 0.75 && ((x + y) % 2 === 0) && band + 1 < bands.length;
      this.set(x, y, bands[dither ? band + 1 : band]);
    }
  }
  /** Fixed stars plus a twinkling few that ride the given ramp. */
  stars(count: number, maxY: number, staticHex: string, twinkle?: Ramp, seed = 3) {
    const still = this.color(staticHex);
    for (let n = 0; n < count; n++) {
      const x = Math.floor(hash(n, 1, seed) * this.w), y = Math.floor(hash(n, 2, seed) * maxY);
      this.set(x, y, twinkle && n % 3 === 0 ? twinkle.at(n) : still);
    }
  }
  build(id: PostcardId, name: string, blurb: string): Postcard {
    return { id, name, blurb, width: this.w, height: this.h, palette: [...this.palette], tracks: this.tracks.map(t => ({ ...t })), pixels: this.pixels };
  }
}

/** A campfire in a clearing: flames and sparks rise, the stars twinkle, the glow breathes. */
function campfire(): Postcard {
  const s = new Scene();
  s.sky(['#140f2b', '#1b1536', '#241a40', '#2e2148', '#3a2850'], 0, 34);
  const twinkle = s.ramp('Twinkle', ['#5d5280', '#a99bc4', '#f6e9cc', '#a89ac3'], 3, 'ping-pong');
  s.stars(38, 26, '#6e628f', twinkle);
  // Pine silhouettes on the horizon.
  const pine = s.color('#0f1a1c');
  for (const [cx, height] of [[4, 14], [11, 18], [19, 12], [45, 15], [53, 20], [60, 13]]) {
    for (let y = 0; y < height; y++) {
      const half = Math.floor((y / height) * 5) + 1;
      for (let x = -half; x <= half; x++) if (Math.abs(x) < half || (y % 3 !== 0)) s.set(cx + x, 34 - height + y, pine);
    }
  }
  // Ground, lit warm near the fire. The glow breathes (ping-pong).
  const ground = [s.color('#1c2a22'), s.color('#23332a')];
  const glow = s.ramp('Glow', ['#3a3328', '#4a3a2a', '#5e452c', '#704f2e'], 2.2, 'ping-pong', true);
  s.each((x, y) => {
    if (y < 34) return undefined;
    const d = Math.hypot((x - 32) / 1.6, (y - 41) * 1.4);
    if (d < 9) return glow.high - Math.min(3, Math.floor(d / 3));
    if (d < 13 && (x + y) % 2 === 0) return glow.low;
    return ground[(y + Math.floor(hash(x, y) * 3)) % 2 === 0 ? 0 : 1];
  });
  const grass = s.color('#3b5b3a');
  for (let x = 0; x < 64; x += 1) if (hash(x, 9) > 0.55) s.set(x, 34 + Math.floor(hash(x, 7) * 2), grass);
  // Crossed logs.
  const bark = s.color('#5a3a26'), barkLight = s.color('#7a5234'), cut = s.color('#c08a52');
  for (let i = 0; i < 16; i++) {
    s.set(24 + i, 44 - Math.floor(i / 4), i % 4 === 0 ? barkLight : bark); s.set(24 + i, 45 - Math.floor(i / 4), bark);
    s.set(40 - i, 44 - Math.floor(i / 4), i % 4 === 1 ? barkLight : bark); s.set(40 - i, 45 - Math.floor(i / 4), bark);
  }
  s.set(24, 44, cut); s.set(40, 44, cut);
  // Stones ring.
  const stone = s.color('#6b6478'), stoneLight = s.color('#8d86a0');
  for (const x of [21, 25, 29, 35, 39, 43]) { s.rect(x, 45, 3, 2, stone); s.set(x + 1, 45, stoneLight); }
  // Flames: a teardrop whose bands rise (index grows upward).
  const fire = s.ramp('Flames', ['#7a1f16', '#b5341c', '#e2541f', '#f5832a', '#ffb347', '#ffd36b', '#fff1a8', '#ffd46c', '#ffb448', '#f5842b', '#e2551f', '#b5351d'], 9);
  for (let y = 18; y <= 42; y++) {
    const t = (42 - y) / 24;
    const half = Math.round((1 - t) * 7.5 * Math.sin(Math.min(1, (1 - t) * 1.4) * Math.PI / 2) + (t < 0.15 ? 1 : 0));
    for (let x = -half; x <= half; x++) {
      const edge = Math.abs(x) / Math.max(1, half);
      if (edge > 0.85 && hash(x, y, 4) > 0.55) continue;
      s.set(32 + x, y, fire.at(42 - y + Math.floor(Math.abs(x) * 0.8) + Math.floor(hash(x, 0, 5) * 3)));
    }
  }
  // Sparks: dotted columns above the fire that drift up.
  const sparks = s.ramp('Sparks', ['#2d2047', '#2c1f46', '#ffb449', '#ffe7a0', '#2b1f45', '#2c2046'], 6);
  for (const [x, offset] of [[29, 0], [33, 2], [36, 4], [31, 3]]) for (let y = 6; y < 18; y++) if ((y + offset) % 2 === 0) s.set(x, y, sparks.at(18 - y + offset));
  return s.build('campfire', 'Campfire', 'Flames, sparks and a little breathing glow under the stars.');
}

/** A waterfall into a pool between mossy cliffs. */
function waterfall(): Postcard {
  const s = new Scene();
  s.sky(['#cde8f2', '#b3dbea', '#9bcde1'], 0, 14);
  const cloud = s.color('#f4fbfd');
  for (const [cx, cy] of [[10, 4], [16, 5], [48, 3], [54, 4]]) s.rect(cx - 3, cy, 7, 2, cloud);
  // Cliffs with moss.
  const rock = [s.color('#4f5a63'), s.color('#636f78'), s.color('#3e474f')];
  const moss = [s.color('#5e8f4a'), s.color('#7fae6b'), s.color('#4a7440')];
  s.each((x, y) => {
    const left = 22 + Math.floor(Math.sin(y / 5) * 2), right = 42 + Math.floor(Math.cos(y / 6) * 2);
    if (y < 8 || y > 38 || (x > left && x < right)) return undefined;
    const top = y < 12 + Math.floor(hash(x, 1) * 3);
    if (top) return moss[Math.floor(hash(x, y) * 3)];
    return rock[Math.floor(hash(Math.floor(x / 3), Math.floor(y / 2)) * 3)];
  });
  // Ferns spilling over the edges.
  const fern = s.color('#9cc97a');
  for (let y = 12; y < 36; y += 3) { s.set(22 + Math.floor(Math.sin(y / 5) * 2), y, fern); s.set(42 + Math.floor(Math.cos(y / 6) * 2), y + 1, fern); }
  // The falling water: columns whose bands fall (index grows downward).
  const water = s.ramp('Falling water', ['#2f7fb5', '#3d93c7', '#5aaedb', '#8fd0ee', '#d8f3fb', '#ffffff', '#c4ebf8', '#7cc5e8', '#4aa1d1', '#3486bd'], 10);
  for (let y = 8; y <= 39; y++) {
    const left = 23 + Math.floor(Math.sin(y / 5) * 2), right = 41 + Math.floor(Math.cos(y / 6) * 2);
    for (let x = left; x <= right; x++) s.set(x, y, water.at(y + Math.floor(hash(x, 0, 2) * 10)));
  }
  // The pool: ripples run outward along the rows.
  const pool = s.ramp('Ripples', ['#2a6f9e', '#347fb0', '#4594c4', '#6bb3da', '#4595c5', '#3580b1'], 5);
  const bank = [s.color('#8a7a5c'), s.color('#a8946a')];
  s.each((x, y) => {
    if (y < 39) return undefined;
    if (y > 45) return bank[(x + y) % 2];
    return pool.at(Math.abs(x - 32) / 2 + y);
  });
  // Mist at the foot.
  const mist = s.ramp('Mist', ['#e9f7fc', '#cfeaf5', '#b7e0f0', '#d0ebf6'], 2, 'ping-pong', true);
  for (let x = 20; x < 45; x++) if (hash(x, 40) > 0.4) s.set(x, 38 + Math.floor(hash(x, 41) * 3), mist.at(x));
  // A tiny frog on the bank.
  const frog = s.color('#3f8f4a'), eye = s.color('#141414');
  s.rect(52, 43, 3, 2, frog); s.set(52, 42, frog); s.set(54, 42, frog); s.set(52, 42, eye);
  return s.build('waterfall', 'Waterfall', 'Water tumbling into a pool between mossy cliffs.');
}

/** A rainy window at night: rain slants down the glass, tea steams, a candle flickers. */
function rainyWindow(): Postcard {
  const s = new Scene();
  // Room wall around the window.
  const wall = [s.color('#3b2a3f'), s.color('#43304a')];
  s.each((x, y) => wall[(Math.floor(x / 4) + y) % 7 === 0 ? 1 : 0]);
  // Outside: night with blurry town lights.
  const outside = [s.color('#16203a'), s.color('#1c2948'), s.color('#223156')];
  const lights = [s.color('#ffc46b'), s.color('#ff9a6b'), s.color('#9bd3ff')];
  for (let y = 4; y < 34; y++) for (let x = 8; x < 56; x++) s.set(x, y, outside[Math.min(2, Math.floor((y - 4) / 10))]);
  for (let n = 0; n < 16; n++) {
    const x = 9 + Math.floor(hash(n, 4) * 46), y = 22 + Math.floor(hash(n, 5) * 10);
    s.set(x, y, lights[n % 3]); if (n % 2) s.set(x + 1, y, lights[n % 3]);
  }
  // Rain: diagonal streaks that slide down the glass.
  const rain = s.ramp('Rain', ['#24345a', '#25355b', '#5f7fb5', '#a9c4ea', '#26365c', '#27375d', '#28385e', '#29395f'], 12);
  for (let y = 4; y < 34; y++) for (let x = 8; x < 56; x++) {
    if (hash(x - y, 7) > 0.32) continue;
    s.set(x, y, rain.at(y + Math.floor((x - y / 3) / 1)));
  }
  // Window frame and mullions.
  const wood = s.color('#7a5234'), woodLight = s.color('#9a6a42'), woodDark = s.color('#5a3a26');
  s.rect(6, 2, 52, 2, woodLight); s.rect(6, 34, 52, 3, wood); s.rect(6, 2, 2, 34, wood); s.rect(56, 2, 2, 34, woodDark);
  s.rect(31, 4, 2, 30, wood); s.rect(8, 18, 48, 2, wood);
  // Sill with a mug of tea and a candle.
  s.rect(4, 37, 56, 2, woodLight); s.rect(4, 39, 56, 1, woodDark);
  const mug = s.color('#e8dcc8'), mugShade = s.color('#c4b49a'), tea = s.color('#8a4f2c');
  s.rect(14, 31, 6, 6, mug); s.rect(19, 31, 1, 6, mugShade); s.rect(15, 31, 4, 1, tea); s.set(20, 33, mug); s.set(21, 33, mug); s.set(21, 34, mug); s.set(20, 35, mug);
  const steam = s.ramp('Steam', ['#42304a', '#42314b', '#b9a7c9', '#e6dcef', '#41304a', '#422f4a'], 4);
  for (let y = 22; y < 31; y++) { s.set(16 + Math.round(Math.sin(y / 2)), y, steam.at(31 - y)); s.set(18 + Math.round(Math.cos(y / 2)), y, steam.at(33 - y)); }
  const wax = s.color('#f3e7d3'), waxShade = s.color('#d9c8ad');
  s.rect(44, 31, 3, 6, wax); s.rect(46, 31, 1, 6, waxShade);
  const flame = s.ramp('Candle', ['#ffb347', '#ffd36c', '#fff1a9', '#ffd36d'], 6, 'ping-pong', true);
  s.set(45, 29, flame.at(0)); s.set(45, 30, flame.at(2)); s.set(45, 28, flame.at(1));
  // Warm light on the wall around the candle.
  const warm = s.color('#5a3e4e');
  for (let y = 24; y < 37; y++) for (let x = 40; x < 52; x++) if (s.get(x, y) === wall[0] && Math.hypot(x - 45, y - 30) < 6 && (x + y) % 2 === 0) s.set(x, y, warm);
  // A cat curled on the sill.
  const cat = s.color('#2a2230'), catLight = s.color('#3d3346');
  s.rect(26, 34, 8, 3, cat); s.rect(32, 32, 3, 3, cat); s.set(32, 31, cat); s.set(34, 31, cat); s.rect(27, 34, 4, 1, catLight);
  return s.build('rainy-window', 'Rainy Window', 'Rain on the glass, steam from the tea, a candle and a sleepy cat.');
}

/** Pixel font, 3×5, just the letters the sign needs. */
const GLYPHS: Record<string, string[]> = {
  C: ['###', '#..', '#..', '#..', '###'],
  A: ['.#.', '#.#', '###', '#.#', '#.#'],
  F: ['###', '#..', '##.', '#..', '#..'],
  E: ['###', '#..', '##.', '#..', '###'],
};

/** A café neon sign on a brick wall: the tubes flicker and a marquee of bulbs chases around it. */
function neonSign(): Postcard {
  const s = new Scene();
  const brick = [s.color('#3a1f2e'), s.color('#47263a'), s.color('#2e1825')];
  const mortar = s.color('#1f1220');
  s.each((x, y) => {
    if (y > 38) return undefined;
    if (y % 4 === 3) return mortar;
    const offset = Math.floor(y / 4) % 2 ? 4 : 0;
    if ((x + offset) % 8 === 7) return mortar;
    return brick[Math.floor(hash(Math.floor((x + offset) / 8), Math.floor(y / 4)) * 3)];
  });
  // Wet street with reflections.
  const street = [s.color('#141019'), s.color('#1b1622')];
  s.each((x, y) => (y > 38 ? street[(x + y) % 3 === 0 ? 1 : 0] : undefined));
  // Sign board.
  const board = s.color('#120c18');
  s.rect(12, 7, 40, 22, board);
  // Marquee bulbs chase around the board edge.
  const bulbs = s.ramp('Marquee', ['#fff3c4', '#ffc46b', '#7a5a2e', '#5a4126'], 6);
  let step = 0;
  const edge: [number, number][] = [];
  for (let x = 12; x < 52; x += 2) edge.push([x, 7]);
  for (let y = 9; y < 29; y += 2) edge.push([51, y]);
  for (let x = 49; x >= 12; x -= 2) edge.push([x, 28]);
  for (let y = 26; y > 7; y -= 2) edge.push([12, y]);
  for (const [x, y] of edge) s.set(x, y, bulbs.at(step++));
  // Neon letters: pink tubes that buzz (ping-pong flicker).
  const neon = s.ramp('Neon', ['#ff5fa2', '#ff8cc0', '#ffd0e6', '#ff8dc1', '#ff60a3', '#b83a74'], 7, 'ping-pong');
  const word = 'CAFE';
  word.split('').forEach((letter, n) => GLYPHS[letter].forEach((row, y) => [...row].forEach((cell, x) => {
    if (cell !== '#') return;
    const px = 17 + n * 8 + x * 2, py = 11 + y * 2;
    const tube = neon.at(n + (x + y) % 2 + (n === 2 ? 3 : 0));
    s.rect(px, py, 2, 2, tube);
  })));
  // A steaming cup glyph in teal neon.
  const teal = s.ramp('Cup', ['#4fe3d0', '#9ff4e8', '#4fe3d1', '#2fa597'], 3, 'ping-pong', true);
  for (const [x, y] of [[23, 23], [24, 23], [25, 23], [26, 23], [27, 23], [23, 24], [27, 24], [28, 24], [24, 25], [25, 25], [26, 25]]) s.set(x, y, teal.at(x));
  // Reflection of the sign in the puddle, broken by ripples.
  for (let y = 40; y < 48; y++) for (let x = 14; x < 50; x++) {
    const src = s.get(x + (y % 2), 38 - (y - 38) * 2);
    if (src >= neon.low && src <= neon.high && hash(x, y) > 0.35) s.set(x, y, src);
    if (src >= bulbs.low && src <= bulbs.high && hash(x, y, 2) > 0.5) s.set(x, y, src);
  }
  // A lamp post and a bench.
  const iron = s.color('#2a2a33');
  s.rect(58, 6, 1, 33, iron); s.rect(56, 6, 4, 1, iron);
  const lampGlow = s.color('#ffdb8f');
  s.rect(56, 7, 2, 2, lampGlow);
  return s.build('neon-sign', 'Neon Café', 'A buzzing café sign and a marquee of bulbs on a rainy street.');
}

/** The tide at dusk: waves roll in, foam laps the sand, the sun shimmers on the water. */
function tide(): Postcard {
  const s = new Scene();
  s.sky(['#2b2350', '#5a3a6b', '#9a5577', '#e07a6a', '#f5a46b', '#ffcf86'], 0, 22);
  // Setting sun.
  const sun = s.color('#fff1b8');
  for (let y = 15; y < 22; y++) for (let x = 26; x < 38; x++) if (Math.hypot(x - 31.5, y - 21) < 6) s.set(x, y, sun);
  // Sea: rows of waves rolling toward the shore (index grows downward).
  const sea = s.ramp('Waves', ['#2a3f78', '#33498a', '#3f5a9c', '#5574b3', '#7894c6', '#5675b4', '#405b9d', '#344a8b'], 4);
  for (let y = 22; y < 36; y++) for (let x = 0; x < 64; x++) s.set(x, y, sea.at(y * 2 + Math.floor(Math.sin(x / 4 + y) * 1.5)));
  // Sun glitter on the water.
  const glitter = s.ramp('Glitter', ['#ffd88f', '#fff4c9', '#3f5a9d', '#ffe3a4'], 5);
  for (let y = 23; y < 34; y++) for (let x = 27; x < 37; x++) if (hash(x, y, 8) > 0.6) s.set(x, y, glitter.at(x + y));
  // Foam laps in and out (ping-pong) along a wavy shoreline.
  const foam = s.ramp('Foam', ['#d9e6f2', '#f4f9fd', '#c7d9ea', '#e6d8bd'], 2.5, 'ping-pong', true);
  const sand = [s.color('#e6c99a'), s.color('#d8b886'), s.color('#efd7ac')];
  s.each((x, y) => {
    const shore = 36 + Math.round(Math.sin(x / 6) * 1.5);
    if (y < shore - 1) return undefined;
    if (y <= shore + 1) return foam.at(x + y);
    return sand[Math.floor(hash(x, y, 9) * 3)];
  });
  // Shells and a crab.
  const shell = s.color('#f6d5d0'), crab = s.color('#d9583a'), crabEye = s.color('#2b1a14');
  s.set(9, 43, shell); s.set(10, 43, shell); s.set(51, 45, shell);
  s.rect(40, 42, 4, 2, crab); s.set(39, 41, crab); s.set(44, 41, crab); s.set(41, 41, crabEye); s.set(42, 41, crabEye);
  // A far boat.
  const sail = s.color('#f2e6d4'), hull = s.color('#5a3a3a');
  s.rect(10, 20, 4, 1, hull); s.set(11, 18, sail); s.set(11, 19, sail); s.set(12, 19, sail);
  return s.build('tide', 'Tide at Dusk', 'Waves rolling in at sunset, foam at your feet and a crab on the sand.');
}

/** A lava river through a cave: molten bands flow, a lava fall pours, embers glow. */
function lava(): Postcard {
  const s = new Scene();
  const rock = [s.color('#1e1418'), s.color('#2a1c20'), s.color('#160f12')];
  s.each((x, y) => rock[Math.floor(hash(Math.floor(x / 2), Math.floor(y / 2), 11) * 3)]);
  // Rock glints lit from below, breathing with the lava.
  const lit = s.ramp('Heat', ['#4a2620', '#5e2e22', '#733824', '#5f2f23'], 1.5, 'ping-pong', true);
  // The river: a winding band whose molten stripes flow left to right.
  const river = s.ramp('Lava', ['#7a1a0e', '#a82a10', '#d9461a', '#f57a22', '#ffb347', '#ffe08a', '#ffb348', '#f57b22', '#d9471a', '#a82b10'], 8);
  for (let x = 0; x < 64; x++) {
    const center = 36 + Math.round(Math.sin(x / 9) * 3);
    for (let y = center - 4; y <= center + 4; y++) {
      const fromCenter = Math.abs(y - center);
      if (fromCenter === 4 && hash(x, y, 12) > 0.5) continue;
      s.set(x, y, river.at(x + fromCenter * 2 + Math.floor(hash(x, 0, 13) * 2)));
    }
    for (let y = center - 9; y < center - 4; y++) if (hash(x, y, 14) > 0.55) s.set(x, y, lit.at(y + x));
  }
  // A lava fall from a crack in the ceiling (falling bands).
  for (let y = 0; y < 33; y++) for (let x = 44; x < 49; x++) {
    if ((x === 44 || x === 48) && hash(x, y, 15) > 0.5) continue;
    s.set(x + Math.round(Math.sin(y / 6)), y, river.at(y + (x % 3)));
  }
  // Basalt columns.
  const basalt = [s.color('#2f2a33'), s.color('#3d3742')];
  for (const [x, h] of [[6, 14], [10, 18], [14, 11], [56, 16], [60, 12]]) for (let y = 30 - h; y < 30; y++) { s.set(x, y, basalt[1]); s.set(x + 1, y, basalt[0]); s.set(x + 2, y, basalt[0]); }
  // Embers floating up.
  const ember = s.ramp('Embers', ['#1e1419', '#1f1519', '#ff9a3c', '#ffd27a', '#20151a', '#21161b'], 7);
  for (const [x, offset] of [[20, 0], [26, 3], [33, 1], [39, 4], [52, 2]]) for (let y = 4; y < 28; y++) if ((y + offset) % 3 === 0) s.set(x, y, ember.at(28 - y + offset));
  return s.build('lava', 'Lava Cave', 'A molten river, a lava fall and embers drifting up through the dark.');
}

export const POSTCARDS: Postcard[] = [campfire(), waterfall(), rainyWindow(), neonSign(), tide(), lava()];

export function postcard(id: string): Postcard | undefined {
  return POSTCARDS.find(card => card.id === id);
}

/** Paint a postcard's pixels into an RGBA buffer. */
export function postcardRgba(card: Postcard): Uint8ClampedArray<ArrayBuffer> {
  const rgba = new Uint8ClampedArray(card.width * card.height * 4);
  const parsed = card.palette.map(hex => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]);
  for (let i = 0; i < card.pixels.length; i++) {
    const [r, g, b] = parsed[card.pixels[i]];
    rgba[i * 4] = r; rgba[i * 4 + 1] = g; rgba[i * 4 + 2] = b; rgba[i * 4 + 3] = 255;
  }
  return rgba;
}
