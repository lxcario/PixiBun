export type BunPose = 'idle' | 'blink' | 'happy';

export type BunPixel = readonly [x: number, y: number, w: number, h: number, fill: string];

export const BUN_INK = '#3a2e4c';

const FUR = '#f2ecf7';
const SHADE = '#d9cde8';
const INNER = '#f0b7cf';
const BLUSH = '#f2b8c6';
const BELLY = '#faf6fc';

// Hand-plotted on a 16x16 grid. Ears, head, body; the face arrives per pose.
export const BUN_BODY: readonly BunPixel[] = [
  // Left ear
  [4, 0, 1, 1, FUR],
  [3, 1, 3, 1, FUR],
  [3, 2, 3, 3, FUR],
  [4, 2, 1, 3, INNER],
  // Right ear
  [11, 0, 1, 1, FUR],
  [10, 1, 3, 1, FUR],
  [10, 2, 3, 3, FUR],
  [11, 2, 1, 3, INNER],
  // Head, rounded corners
  [4, 5, 8, 1, FUR],
  [3, 6, 10, 1, FUR],
  [2, 7, 12, 4, FUR],
  [3, 11, 10, 1, SHADE],
  // Body
  [3, 12, 10, 3, FUR],
  [3, 12, 1, 3, SHADE],
  [12, 12, 1, 3, SHADE],
  [6, 13, 4, 2, BELLY],
  [3, 15, 10, 1, SHADE],
];

export const BUN_POSES: Record<BunPose, readonly BunPixel[]> = {
  idle: [
    [5, 8, 1, 2, BUN_INK],
    [10, 8, 1, 2, BUN_INK],
  ],
  blink: [
    [5, 9, 1, 1, BUN_INK],
    [10, 9, 1, 1, BUN_INK],
  ],
  happy: [
    [5, 7, 1, 1, BUN_INK],
    [4, 8, 1, 1, BUN_INK],
    [6, 8, 1, 1, BUN_INK],
    [10, 7, 1, 1, BUN_INK],
    [9, 8, 1, 1, BUN_INK],
    [11, 8, 1, 1, BUN_INK],
  ],
};

// Rosy cheeks survive every pose.
const BUN_BLUSH: readonly BunPixel[] = [
  [3, 9, 2, 1, BLUSH],
  [11, 9, 2, 1, BLUSH],
];

export function bunPixels(pose: BunPose): readonly BunPixel[] {
  return [...BUN_BODY, ...BUN_BLUSH, ...BUN_POSES[pose]];
}

/** 1x1 ink cells forming the silhouette outline; draw these before the pixels. */
export function bunOutline(pose: BunPose): Array<readonly [number, number]> {
  const covered = new Set<string>();
  const ring: Array<readonly [number, number]> = [];
  for (const [x, y, w, h] of bunPixels(pose)) {
    for (let dx = -1; dx <= w; dx++) {
      for (let dy = -1; dy <= h; dy++) {
        const px = x + dx;
        const py = y + dy;
        const key = `${px},${py}`;
        if (covered.has(key)) continue;
        covered.add(key);
        const inside = dx >= 0 && dx < w && dy >= 0 && dy < h;
        if (!inside) ring.push([px, py]);
      }
    }
  }
  return ring;
}

export function drawBun(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  pose: BunPose,
  outline = true,
  /** Maps each color, for scenes that paint directly in a theme's palette. */
  color: (css: string) => string = (css) => css
): void {
  if (outline) {
    ctx.fillStyle = color(BUN_INK);
    for (const [x, y] of bunOutline(pose)) {
      ctx.fillRect(ox + x, oy + y, 1, 1);
    }
  }
  for (const [x, y, w, h, fill] of bunPixels(pose)) {
    ctx.fillStyle = color(fill);
    ctx.fillRect(ox + x, oy + y, w, h);
  }
}