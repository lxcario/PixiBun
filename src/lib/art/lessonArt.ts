// Target poses for the Playground lessons, painted procedurally so every frame
// of a lesson stays on model: the same outline, fill, shadow side, highlight
// and ground shadow, moved and squashed by the motion each frame teaches.
// Output is the lesson grid format: one string per row, one palette char per cell.
//
// This module has no imports so its art can be inspected from plain Node.

/** Colors the lesson art adds to TEMPLATE_PALETTE (see lessonPalette.ts). */
export const LESSON_EXTRA_PALETTE: Record<string, string> = {
  b: '#8cc8dc', // water blue
  B: '#4b7fa8', // deep water
  c: '#e3f4f7', // foam / smear white
  y: '#ffe08a', // spark yellow
  R: '#d4596a', // flame red
  G: '#4f8a55', // deep moss
  e: '#8f88a6', // steel shadow
  E: '#e9e6f2', // steel light
  n: '#a8703f', // wood
  N: '#6b432b', // dark wood
};

type Pred = (x: number, y: number) => boolean;

class Sheet {
  readonly cells: string[];
  constructor(readonly size: number) { this.cells = Array(size * size).fill('.'); }
  inBounds(x: number, y: number) { return x >= 0 && y >= 0 && x < this.size && y < this.size; }
  set(x: number, y: number, c: string) { if (this.inBounds(x, y)) this.cells[y * this.size + x] = c; }
  get(x: number, y: number) { return this.inBounds(x, y) ? this.cells[y * this.size + x] : '.'; }
  /** Cells whose centre satisfies `pred`. */
  mask(pred: Pred): boolean[] {
    const m: boolean[] = [];
    for (let y = 0; y < this.size; y++) for (let x = 0; x < this.size; x++) m.push(pred(x + 0.5, y + 0.5));
    return m;
  }
  paint(m: boolean[], c: string) { m.forEach((on, i) => { if (on) this.cells[i] = c; }); }
  rows() {
    const out: string[] = [];
    for (let y = 0; y < this.size; y++) out.push(this.cells.slice(y * this.size, (y + 1) * this.size).join(''));
    return out;
  }
}

const ellipse = (cx: number, cy: number, rx: number, ry: number, angleDeg = 0): Pred => {
  const a = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(a), sin = Math.sin(a);
  return (x, y) => {
    const dx = x - cx, dy = y - cy;
    const u = dx * cos + dy * sin;
    const v = -dx * sin + dy * cos;
    return (u / rx) ** 2 + (v / ry) ** 2 <= 1;
  };
};
const union = (...preds: Pred[]): Pred => (x, y) => preds.some(p => p(x, y));
const clip = (pred: Pred, test: Pred): Pred => (x, y) => pred(x, y) && test(x, y);

function edgeOf(sheet: Sheet, m: boolean[]): boolean[] {
  const n = sheet.size;
  return m.map((on, i) => {
    if (!on) return false;
    const x = i % n, y = Math.floor(i / n);
    return !(x > 0 && m[i - 1]) || !(x < n - 1 && m[i + 1]) || !(y > 0 && m[i - n]) || !(y < n - 1 && m[i + n]);
  });
}

interface BodyStyle { line: string; fill: string; shade?: string; light?: string; shadeDepth?: number }

/** Fill, a shadow band on the lower right, an optional highlight spot and a one-pixel outline. */
function body(sheet: Sheet, pred: Pred, style: BodyStyle, highlight?: Pred, extras?: (s: Sheet) => void) {
  const m = sheet.mask(pred);
  sheet.paint(m, style.fill);
  if (style.shade) {
    const d = style.shadeDepth ?? 1.4;
    sheet.paint(m.map((on, i) => on && !pred((i % sheet.size) + 0.5 + d * 0.55, Math.floor(i / sheet.size) + 0.5 + d)), style.shade);
  }
  if (style.light && highlight) sheet.paint(m.map((on, i) => on && highlight((i % sheet.size) + 0.5, Math.floor(i / sheet.size) + 0.5)), style.light);
  extras?.(sheet);
  sheet.paint(edgeOf(sheet, m), style.line);
}

/** A soft ground shadow: dark middle, lighter ends. */
function groundShadow(sheet: Sheet, cx: number, y: number, halfWidth: number, dark = 'p', soft = 's') {
  const w = Math.max(1, Math.round(halfWidth));
  for (let x = Math.round(cx - w); x < Math.round(cx + w); x++) {
    const end = x === Math.round(cx - w) || x === Math.round(cx + w) - 1;
    sheet.set(x, y, end && w > 2 ? soft : dark);
  }
}

type Eyes = 'open' | 'squint' | 'closed';

function face(sheet: Sheet, cx: number, cy: number, spacing: number, eyes: Eyes, blush = true, big = false) {
  // Mirror-symmetric about cx, whatever the spacing.
  const lx = Math.floor(cx - spacing), rx = Math.ceil(cx + spacing) - 1, y = Math.round(cy - 0.5);
  const tall = eyes === 'open' ? (big ? 3 : 2) : 1;
  for (const ex of [lx, rx]) {
    if (eyes === 'open') {
      for (let r = 0; r < tall; r++) sheet.set(ex, y + r, 'k');
      if (big) sheet.set(ex, y, 'F');
    } else if (eyes === 'squint') {
      const out = ex === lx ? -1 : 1;
      sheet.set(ex, y + 1, 'k'); sheet.set(ex - out, y, 'k');
    } else { sheet.set(ex, y + 1, 'k'); sheet.set(ex + (ex === lx ? -1 : 1), y + 1, 'k'); }
  }
  if (blush) { sheet.set(lx - 1, y + tall, 'r'); sheet.set(rx + 1, y + tall, 'r'); }
}

/** A teardrop standing on `base`, its tip `h` above and leaning sideways by `lean`. */
const teardrop = (cx: number, base: number, w: number, h: number, lean = 0): Pred => (x, y) => {
  const t = (base - y) / h;
  if (t < -0.12 || t > 1) return false;
  const bulge = t < 0.32 ? Math.sqrt(Math.max(0, 1 - ((0.32 - t) / 0.44) ** 2)) : Math.pow(1 - (t - 0.32) / 0.68, 0.85);
  return Math.abs(x - (cx + lean * t * t)) <= w * bulge;
};

/** Everything within `w` of the segment, narrowing to a point over the last `taper` of its length. */
const capsule = (x0: number, y0: number, x1: number, y1: number, w: number, taper = 0): Pred => (x, y) => {
  const vx = x1 - x0, vy = y1 - y0;
  const len2 = vx * vx + vy * vy || 1;
  const t = Math.max(0, Math.min(1, ((x - x0) * vx + (y - y0) * vy) / len2));
  const width = taper > 0 && t > 1 - taper ? w * Math.max(0.15, (1 - t) / taper) : w;
  return Math.hypot(x - (x0 + vx * t), y - (y0 + vy * t)) <= width;
};

// ── Subjects ────────────────────────────────────────────────────────────────

const MOCHI = { line: 'o', fill: 'f', shade: 's', light: 'F' };

function mochi(cx: number, bottom: number, rx: number, ry: number, shadowW: number, eyes: Eyes): string[] {
  const s = new Sheet(16);
  groundShadow(s, cx, 14, shadowW);
  const cy = bottom - ry;
  // A rice cake sits a little flat on its underside.
  const shape = clip(ellipse(cx, cy, rx, ry), (_x, y) => y < cy + ry * 0.86);
  body(s, shape, MOCHI, ellipse(cx - rx * 0.42, cy - ry * 0.45, Math.max(0.9, rx * 0.28), Math.max(0.7, ry * 0.22)),
    sheet => face(sheet, cx, cy + ry * 0.05, Math.max(1, rx * 0.34), eyes));
  return s.rows();
}

function star(rays: number, diag: number, core: number): string[] {
  const s = new Sheet(16);
  const c = 7.5;
  const shape: Pred = (x, y) => {
    const dx = Math.abs(x - c - 0.5), dy = Math.abs(y - c - 0.5);
    if (dx + dy <= core) return true;
    const ray = (along: number, across: number) => along <= rays && across <= Math.max(0, 0.8 - along / (rays * 3));
    if (ray(dx, dy) || ray(dy, dx)) return true;
    return diag > 0 && Math.abs(dx - dy) < 0.6 && dx <= diag && dx > 0;
  };
  const m = s.mask(shape);
  s.paint(m, 'A');
  s.paint(s.mask((x, y) => Math.abs(x - c - 0.5) + Math.abs(y - c - 0.5) <= core + 0.6 && shape(x, y)), 'y');
  s.paint(s.mask((x, y) => Math.abs(x - c - 0.5) + Math.abs(y - c - 0.5) <= Math.max(0.5, core - 1.2)), 'w');
  s.paint(edgeOf(s, m).map((on, i) => on && s.cells[i] === 'A'), 'a');
  return s.rows();
}

function flame(lean: number, height: number, width: number, spark: [number, number] | null): string[] {
  const s = new Sheet(16);
  // The log stays put.
  body(s, (x, y) => x >= 2.5 && x <= 13.5 && y >= 12.5 && y <= 14.5, { line: 'N', fill: 'n' });
  s.set(5, 13, 'N'); s.set(10, 13, 'N');
  const base = 12.6;
  const drop = (w: number, h: number, l: number) => teardrop(8, base, w, h, l);
  const outer = drop(width, height, lean);
  const m = s.mask(outer);
  s.paint(m, 'a');
  s.paint(s.mask(drop(width * 0.62, height * 0.72, lean * 0.8)), 'A');
  s.paint(s.mask(drop(width * 0.32, height * 0.42, lean * 0.5)), 'y');
  s.paint(edgeOf(s, m), 'R');
  if (spark) { s.set(spark[0], spark[1], 'y'); s.set(spark[0] + 1, spark[1] + 1, 'A'); }
  return s.rows();
}

interface BunPose {
  cx: number; bottom: number; rx: number; ry: number;
  earLen: number; earWidth: number; earAngle: number; earSpread: number;
  eyes: Eyes; shadowW: number; ground: number;
}

function bun(size: 16 | 32, pose: BunPose, extra?: (s: Sheet) => void): string[] {
  const s = new Sheet(size);
  if (pose.shadowW > 0) groundShadow(s, pose.cx, pose.ground, pose.shadowW);
  const cy = pose.bottom - pose.ry;
  const top = cy - pose.ry;
  const ear = (side: -1 | 1, scale = 1) => {
    const a = pose.earAngle * side;
    const rad = (a * Math.PI) / 180;
    const bx = pose.cx + side * pose.earSpread, by = top + pose.ry * 0.25;
    return ellipse(bx + Math.sin(rad) * pose.earLen * 0.5, by - Math.cos(rad) * pose.earLen * 0.5,
      pose.earWidth * scale, pose.earLen * 0.55 * scale, a);
  };
  const torso = clip(ellipse(pose.cx, cy, pose.rx, pose.ry), (_x, y) => y < cy + pose.ry * 0.9);
  const shape = union(torso, ear(-1), ear(1));
  body(s, shape, MOCHI, ellipse(pose.cx - pose.rx * 0.4, cy - pose.ry * 0.4, pose.rx * 0.26, pose.ry * 0.2), sheet => {
    sheet.paint(sheet.mask(clip(union(ear(-1, 0.45), ear(1, 0.45)), (x, y) => !torso(x, y))), 'r');
    face(sheet, pose.cx, cy + pose.ry * 0.05, Math.max(1, pose.rx * (size === 32 ? 0.36 : 0.3)), pose.eyes, true, size === 32);
  });
  extra?.(s);
  return s.rows();
}

function flask(bubbles: Array<[number, number, number]>, surfaceBump: number, drops: Array<[number, number]>): string[] {
  const s = new Sheet(16);
  const bulb = ellipse(8, 10.5, 5.2, 4.8);
  const neck: Pred = (x, y) => x >= 5.8 && x <= 10.2 && y >= 2 && y <= 7;
  const glass = union(bulb, neck);
  const m = s.mask(glass);
  const surface = 8.2;
  s.paint(s.mask((x, y) => bulb(x, y) && (y > surface || (Math.abs(x - 8) < 1.6 && y > surface - surfaceBump))), 'l');
  s.paint(s.mask((x, y) => bulb(x, y) && !bulb(x + 0.9, y + 1.3) && y > surface), 'p');
  s.paint(s.mask((x, y) => bulb(x, y) && y > surface && y < surface + 1 && Math.abs(x - 8) > 1.4), 'L');
  for (const [bx, by, r] of bubbles) {
    if (r <= 0.6) { s.set(Math.floor(bx), Math.floor(by), 'F'); continue; }
    const ring = s.mask(ellipse(bx, by, r, r));
    s.paint(edgeOf(s, ring), 'L');
    s.set(Math.floor(bx - r * 0.4), Math.floor(by - r * 0.4), 'F');
  }
  s.paint(edgeOf(s, m), 'o');
  // Glass glint and cork.
  s.set(4, 9, 'F'); s.set(4, 10, 'F'); s.set(5, 8, 'F');
  for (let x = 6; x <= 9; x++) { s.set(x, 1, 'n'); s.set(x, 0, 'N'); }
  for (const [dx, dy] of drops) { s.set(dx, dy, 'L'); }
  return s.rows();
}

function slime(parts: Array<[number, number, number]>, eyesAt: number, shadowW: number, shadowX: number): string[] {
  const s = new Sheet(16);
  groundShadow(s, shadowX, 14, shadowW);
  const ground = 13.6;
  const domes = parts.map(([cx, rx, ry]) => ellipse(cx, ground - ry * 0.45, rx, ry));
  const shape = clip(union(...domes), (_x, y) => y < ground);
  const [mx, mrx, mry] = parts[0];
  const top = ground - mry * 1.45;
  body(s, shape, { line: 'o', fill: 'g', shade: 'G', light: 'F' }, ellipse(mx - mrx * 0.45, top + 1.6, 0.9, 0.8),
    sheet => face(sheet, eyesAt, top + mry * 0.75, 1.2, 'open', false));
  return s.rows();
}

function ripple(rings: Array<[number, number, string, number]>, drops: Array<[number, number, string]>, droplet: [number, number] | null): string[] {
  const s = new Sheet(16);
  const cx = 8, cy = 10.5;
  for (const [rx, ry, c, gapEvery] of rings) {
    const ring = edgeOf(s, s.mask(ellipse(cx, cy, rx, ry)));
    let k = 0;
    s.paint(ring.map(on => on && (gapEvery === 0 || (k++ % gapEvery) !== 0)), c);
  }
  if (droplet) {
    const [dx, dy] = droplet;
    body(s, teardrop(dx, dy, 1.9, 4.6), { line: 'B', fill: 'b' });
    s.set(Math.floor(dx) - 1, Math.floor(dy) - 2, 'c');
  }
  for (const [x, y, c] of drops) s.set(x, y, c);
  return s.rows();
}

/** A sword from its hilt at (px, py), pointing `angle` degrees clockwise from straight up. */
function sword(s: Sheet, px: number, py: number, angle: number, length: number, scale: 1 | 2) {
  const rad = (angle * Math.PI) / 180;
  const ux = Math.sin(rad), uy = -Math.cos(rad);
  const at = (d: number, side = 0): [number, number] => [px + ux * d - uy * side, py + uy * d + ux * side];
  const w = scale === 2 ? 1.6 : 1.05;
  body(s, capsule(...at(1.5), ...at(length), w, 0.22), { line: 'o', fill: 'E', shade: 'e', shadeDepth: 0.8 });
  body(s, capsule(...at(1.4, -2.2 * scale), ...at(1.4, 2.2 * scale), scale === 2 ? 1.1 : 0.7), { line: 'N', fill: 'a' });
  body(s, capsule(...at(0.4), ...at(-1.4 * scale), scale === 2 ? 1.1 : 0.7), { line: 'N', fill: 'n' });
}

/** A crescent smear swept from `from` to `to` degrees, fattest at the leading end. */
function smear(s: Sheet, px: number, py: number, from: number, to: number, outer: number, maxThick: number) {
  const m = s.mask((x, y) => {
    const dx = x - px, dy = y - py;
    let a = (Math.atan2(dx, -dy) * 180) / Math.PI;
    if (a < from - 180) a += 360;
    const t = (a - from) / (to - from);
    if (t < 0 || t > 1) return false;
    const r = Math.hypot(dx, dy);
    return r <= outer && r >= outer - maxThick * Math.sin(t * Math.PI * 0.5) - 0.5;
  });
  s.paint(m, 'b');
  s.paint(m.map((on, i) => on && Math.hypot((i % s.size) + 0.5 - px, Math.floor(i / s.size) + 0.5 - py) > outer - 1.6), 'c');
  s.paint(edgeOf(s, m), 'B');
}

function dummy(s: Sheet, tilt: number) {
  body(s, (x, y) => x >= 22 && x <= 25 && y >= 14 && y <= 29, { line: 'N', fill: 'n' });
  body(s, (x, y) => x >= 18.5 && x <= 29.5 && y >= 17 && y <= 19, { line: 'N', fill: 'n' });
  body(s, ellipse(23.8 + tilt, 11.5, 3.8, 3.6), { line: 'a', fill: 'A', shade: 'a', light: 'w' }, ellipse(22.6 + tilt, 10.2, 1.1, 0.9));
  for (let x = 19; x <= 28; x++) s.set(x, 30, 'N');
}

function swing(size: 16 | 32, px: number, py: number, angle: number, length: number, extra?: (s: Sheet) => void, before?: (s: Sheet) => void) {
  const s = new Sheet(size);
  before?.(s);
  sword(s, px, py, angle, length, size === 32 ? 2 : 1);
  // The hand holding it.
  body(s, ellipse(px, py, size === 32 ? 2.6 : 1.7, size === 32 ? 2.4 : 1.6), { line: 'o', fill: 'f', shade: 's' });
  extra?.(s);
  return s.rows();
}

function sparkAt(s: Sheet, x: number, y: number) {
  for (let i = -3; i <= 3; i++) { s.set(x + i, y, Math.abs(i) < 2 ? 'w' : 'y'); s.set(x, y + i, Math.abs(i) < 2 ? 'w' : 'y'); }
  s.set(x - 2, y - 2, 'y'); s.set(x + 2, y + 2, 'y'); s.set(x + 2, y - 2, 'y'); s.set(x - 2, y + 2, 'y');
}

/**
 * The 32px ball keeps its mass while it squashes and stretches: find the
 * radius whose pixel count lands in the lesson's 112–114 px window.
 */
function bouncingBall(bottom: number, stretch: number, shadowW: number): string[] {
  for (let r = 5.4; r <= 6.8; r += 0.005) {
    const rx = r / stretch, ry = r * stretch;
    const cy = bottom - ry;
    const s = new Sheet(32);
    const shape = ellipse(16, cy, rx, ry);
    const count = s.mask(shape).filter(Boolean).length;
    if (count < 112 || count > 114) continue;
    // The lesson counts the ball's mass without its shadow, so the shadow stays one color.
    groundShadow(s, 16, 29, shadowW, 'p', 'p');
    if (shadowW > 4) groundShadow(s, 16, 30, shadowW - 2.5, 'p', 'p');
    body(s, shape, { line: 'o', fill: 'A', shade: 'a', light: 'w', shadeDepth: 2 }, ellipse(16 - rx * 0.42, cy - ry * 0.42, rx * 0.26, ry * 0.22));
    s.set(Math.round(16 - rx * 0.5), Math.round(cy - ry * 0.55), 'F');
    return s.rows();
  }
  throw new Error(`No mass-preserving ball for stretch ${stretch}`);
}

function idleBun(chestRy: number, eyes: Eyes): string[] {
  const s = new Sheet(32);
  groundShadow(s, 16, 28, 10);
  // Ears and head never move; only the chest rises and falls.
  const head = ellipse(16, 12.5, 8.4, 6.6);
  const earL = ellipse(11.5, 4.6, 2.2, 5, -12);
  const earR = ellipse(20.5, 4.6, 2.2, 5, 12);
  const lower = clip(ellipse(16, 22.5, 10, 5), (_x, y) => y < 27);
  // The chest is wider than the head, so its rise shows at the shoulders.
  const chest = clip(ellipse(16, 22, 11.2, chestRy), (_x, y) => y < 22);
  body(s, union(earL, earR), MOCHI, undefined, sheet => sheet.paint(sheet.mask(union(ellipse(11.5, 5, 1, 3.4, -12), ellipse(20.5, 5, 1, 3.4, 12))), 'r'));
  body(s, union(lower, chest), MOCHI, ellipse(10.8, 21.4 - chestRy * 0.6, 1.6, 1));
  body(s, head, MOCHI, ellipse(12.4, 9.4, 2, 1.4), sheet => face(sheet, 16, 13.2, 3.6, eyes, true, true));
  return s.rows();
}

// ── Lessons ─────────────────────────────────────────────────────────────────

const bunPose = (overrides: Partial<BunPose>, base: BunPose): BunPose => ({ ...base, ...overrides });
const BUN16: BunPose = { cx: 8, bottom: 14, rx: 4.2, ry: 3.4, earLen: 5, earWidth: 1.4, earAngle: 4, earSpread: 2.5, eyes: 'open', shadowW: 4, ground: 14 };
const BUN32: BunPose = { cx: 16, bottom: 28.6, rx: 8.2, ry: 7.2, earLen: 10, earWidth: 2.4, earAngle: 8, earSpread: 3.6, eyes: 'open', shadowW: 8, ground: 29 };

export function buildLessonArt(): Record<string, string[][]> {
  return {
    'bouncing-mochi': [
      mochi(8, 9.5, 4.4, 4.1, 2, 'open'),
      mochi(8, 12.6, 3.9, 4.8, 3, 'open'),
      mochi(8, 14, 6.4, 2.9, 6.5, 'squint'),
      mochi(8, 12, 3.95, 4.5, 3, 'open'),
    ],
    'twinkling-star': [star(2.2, 0, 1.2), star(4.5, 0, 1.5), star(7, 3, 2.5), star(3, 1.5, 1)],
    'hearth-flame': [
      flame(0, 8.5, 3.6, null),
      flame(2.4, 11, 3.2, null),
      flame(-1.6, 9.8, 3.4, [10, 1]),
    ],
    'bun-hop': [
      bun(16, bunPose({ rx: 4.8, ry: 2.8, earLen: 4.8, earAngle: 14, eyes: 'squint', shadowW: 5 }, BUN16)),
      bun(16, bunPose({ bottom: 11.6, rx: 3.9, ry: 3.6, earLen: 5.2, earAngle: -2, shadowW: 2 }, BUN16)),
      bun(16, bunPose({ rx: 4.9, ry: 3, earLen: 4.4, earAngle: 50, eyes: 'closed', shadowW: 5 }, BUN16)),
    ],
    'potion-bubble': [
      flask([[6.5, 13.5, 0.5], [9.5, 12.5, 0.5]], 0, []),
      flask([[8, 11.4, 1.5], [6, 13.5, 0.5]], 0, []),
      flask([[8, 8.6, 1.6]], 1, []),
      flask([[9.5, 13, 0.5]], 0, [[6, 4], [10, 4], [8, 3], [5, 6], [11, 6]]),
    ],
    'slime-glide': [
      slime([[7.5, 4.6, 4.4]], 7.5, 5, 7.5),
      slime([[6.6, 4, 3.9], [10.6, 3.4, 2.4]], 9, 6, 8.5),
      slime([[8.8, 3.3, 5.2]], 9, 3.5, 9),
      slime([[8.4, 4.8, 4]], 8.6, 5, 8.4),
    ],
    'water-ripple': [
      ripple([[1.8, 0.9, 'b', 0]], [[5, 9, 'b'], [10, 9, 'b']], [8, 8.4]),
      ripple([[3.2, 1.6, 'B', 0]], [[8, 6, 'c'], [6, 7, 'c'], [10, 7, 'c'], [8, 7, 'b']], null),
      ripple([[5.2, 2.6, 'B', 0], [2.2, 1.1, 'b', 0]], [[8, 8, 'c']], null),
      ripple([[7.4, 3.6, 'b', 4], [4.2, 2.1, 'B', 3]], [], null),
    ],
    'sword-slash': [
      swing(16, 6, 10, -28, 8),
      swing(16, 6, 10, 95, 8.5, undefined, s => smear(s, 6, 10, -28, 95, 9, 3.5)),
      swing(16, 6, 10, 138, 7.5, s => { s.set(13, 11, 'b'); s.set(14, 9, 'b'); s.set(12, 13, 'b'); }),
    ],
    'master-bouncing-ball': [
      bouncingBall(16, 1, 3),
      bouncingBall(16.8, 1, 3),
      bouncingBall(18.8, 1.06, 3.5),
      bouncingBall(23, 1.2, 4.5),
      bouncingBall(28, 1.16, 6),
      bouncingBall(28, 0.72, 8.5),
      bouncingBall(26.6, 1.16, 6),
      bouncingBall(22, 1.12, 4.5),
      bouncingBall(18.6, 1.04, 3.5),
      bouncingBall(16.6, 1, 3),
      bouncingBall(16.1, 0.95, 3),
      bouncingBall(16.2, 1.02, 3),
    ],
    'subpixel-idle': [idleBun(3.6, 'open'), idleBun(4.7, 'open'), idleBun(3.2, 'closed')],
    'combat-slash-hitstop': [
      swing(32, 9, 21, -40, 14, undefined, s => dummy(s, 0)),
      swing(32, 9, 21, 100, 14, undefined, s => { dummy(s, 0); smear(s, 9, 21, -40, 100, 15, 6); }),
      swing(32, 9, 21, 86, 13, s => sparkAt(s, 22, 19), s => dummy(s, 1.6)),
      swing(32, 9, 21, 150, 11, undefined, s => dummy(s, 0.4)),
    ],
    'character-hop-shock': [
      bun(32, bunPose({ rx: 9.6, ry: 5.8, earLen: 8, earAngle: 30, eyes: 'squint', shadowW: 10 }, BUN32)),
      bun(32, bunPose({ bottom: 26, rx: 6.4, ry: 9, earLen: 11, earAngle: -2, earSpread: 2.6, shadowW: 6 }, BUN32)),
      bun(32, bunPose({ bottom: 20, rx: 7.6, ry: 7.2, earLen: 9, earAngle: 30, earSpread: 3.2, shadowW: 4 }, BUN32)),
      bun(32, bunPose({ rx: 10.2, ry: 5.2, earLen: 8.5, earAngle: 62, eyes: 'closed', shadowW: 11 }, BUN32)),
      bun(32, bunPose({ rx: 8, ry: 7.4, earLen: 10, earAngle: 6 }, BUN32)),
    ],
  };
}
