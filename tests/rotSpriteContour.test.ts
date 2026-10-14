/**
 * RotSprite v3 (contour-aware) regression suite built on the PixiBun mascot.
 *
 * Free-angle rotation previously broke 1px outlines (gaps and 3px blobs), dropped one
 * of the mascot's eyes at most angles and left stray spike pixels. These properties are
 * checked across a sweep of awkward angles, including the reported 37° case.
 */

import { describe, it, expect } from 'vitest';
import { rotSprite, computeRotatedBounds, type PixelBuffer } from '@/lib/canvas/rotSprite';
import { BUN_INK, bunOutline, bunPixels } from '@/lib/art/bunSprite';

const ANGLES = [10, 20, 30, 37, 45, 53, 60, 75, 120, 200, 323];

function hexToRgba(hex: string): number[] {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16), 255];
}

/** The mascot on an 18x18 grid (outline included), optionally scaled up by `k`. */
function mascot(pose: 'idle' | 'happy', k = 1): PixelBuffer {
  const size = 18 * k;
  const data = new Uint8ClampedArray(size * size * 4);
  const fill = (x: number, y: number, color: string) => {
    for (let yy = 0; yy < k; yy++) for (let xx = 0; xx < k; xx++) {
      data.set(hexToRgba(color), (((y + 1) * k + yy) * size + (x + 1) * k + xx) * 4);
    }
  };
  for (const [x, y] of bunOutline(pose)) fill(x, y, BUN_INK);
  for (const [x, y, w, h, color] of bunPixels(pose)) {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) fill(xx, yy, color);
  }
  return { width: size, height: size, data };
}

function rotateLikeCommit(src: PixelBuffer, deg: number): PixelBuffer {
  const rad = (deg * Math.PI) / 180;
  const b = computeRotatedBounds(src.width, src.height, 0, 0, src.width / 2, src.height / 2, rad);
  return rotSprite(src, rad, b.localPivotX, b.localPivotY, b.targetW, b.targetH, b.outPivotX, b.outPivotY, true);
}

const INK = new Uint32Array(new Uint8ClampedArray(hexToRgba(BUN_INK)).buffer)[0];

function analyze(src: PixelBuffer, out: PixelBuffer) {
  const s = new Uint32Array(src.data.buffer, src.data.byteOffset, src.width * src.height);
  const o = new Uint32Array(out.data.buffer, out.data.byteOffset, out.width * out.height);
  const W = out.width, H = out.height;
  const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && (o[y * W + x] >>> 24) !== 0;
  const palette = new Set(Array.from(s).filter((c) => c >>> 24));
  let foreign = 0, outlineGaps = 0, spikes = 0, area = 0, sourceArea = 0;
  for (const c of s) if (c >>> 24) sourceArea++;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = o[y * W + x];
    if (!(c >>> 24)) continue;
    area++;
    if (!palette.has(c)) foreign++;
    const n4 = +solid(x - 1, y) + +solid(x + 1, y) + +solid(x, y - 1) + +solid(x, y + 1);
    if (c !== INK && n4 < 4) outlineGaps++;
    if (n4 === 0) spikes++;
  }
  // Eyes: 8-connected ink components that never touch transparency.
  let eyeInk = 0;
  const seen = new Uint8Array(W * H);
  for (let start = 0; start < W * H; start++) {
    if (o[start] !== INK || seen[start]) continue;
    const queue = [start];
    seen[start] = 1;
    let size = 0, enclosed = true;
    while (queue.length) {
      const i = queue.pop()!, x = i % W, y = (i - x) / W;
      size++;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        if (!solid(x + dx, y + dy)) { enclosed = false; continue; }
        const j = (y + dy) * W + x + dx;
        if (o[j] === INK && !seen[j]) { seen[j] = 1; queue.push(j); }
      }
    }
    if (enclosed) eyeInk += size;
  }
  return { foreign, outlineGaps, spikes, eyeInk, areaRatio: area / sourceArea };
}

describe('RotSprite v3 contour-aware rotation (PixiBun mascot)', () => {
  it('keeps a gap-free outline, both eyes and the exact palette at free angles', () => {
    const src = mascot('idle');
    const sourceEyes = analyze(src, src).eyeInk;
    for (const deg of ANGLES) {
      const m = analyze(src, rotateLikeCommit(src, deg));
      expect(m.foreign, `${deg}° invented colours`).toBe(0);
      expect(m.outlineGaps, `${deg}° fill exposed through the outline`).toBe(0);
      expect(m.spikes, `${deg}° isolated stray pixels`).toBe(0);
      expect(m.eyeInk, `${deg}° eye pixels`).toBe(sourceEyes);
      expect(m.areaRatio, `${deg}° area`).toBeGreaterThan(0.93);
      expect(m.areaRatio, `${deg}° area`).toBeLessThan(1.07);
    }
  });

  it('keeps both chevron eyes of the happy pose with their pixel count', () => {
    const src = mascot('happy');
    const sourceEyes = analyze(src, src).eyeInk;
    for (const deg of ANGLES) {
      expect(analyze(src, rotateLikeCommit(src, deg)).eyeInk, `${deg}°`).toBe(sourceEyes);
    }
  });

  it('rebuilds a 2px outline at 2px instead of a ragged 1-3px fringe', () => {
    const src = mascot('idle', 2);
    for (const deg of [17, 37, 45, 71]) {
      const out = rotateLikeCommit(src, deg);
      const o = new Uint32Array(out.data.buffer, out.data.byteOffset, out.width * out.height);
      const W = out.width, H = out.height;
      const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && (o[y * W + x] >>> 24) !== 0;
      // Peel the silhouette: layer 1 touches the outside, layer 2 touches layer 1.
      const depth = new Uint8Array(W * H);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (solid(x, y) && (!solid(x - 1, y) || !solid(x + 1, y) || !solid(x, y - 1) || !solid(x, y + 1))) depth[y * W + x] = 1;
      }
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = y * W + x;
        if (!solid(x, y) || depth[i]) continue;
        if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => depth[(y + dy) * W + x + dx] === 1)) depth[i] = 2;
      }
      for (const layer of [1, 2]) {
        let cells = 0, ink = 0;
        for (let i = 0; i < W * H; i++) if (depth[i] === layer) { cells++; if (o[i] === INK) ink++; }
        expect(ink / cells, `${deg}° outline layer ${layer}`).toBeGreaterThanOrEqual(layer === 1 ? 1 : 0.95);
      }
      expect(analyze(src, out).eyeInk, `${deg}° eyes`).toBe(analyze(src, src).eyeInk);
    }
  });

  it('keeps unfilled one-pixel line art closed and single-pixel wide', () => {
    // A hollow 1px rounded box drawn as line art.
    const rows = [
      '...######...',
      '..#......#..',
      '.#........#.',
      '#..........#',
      '#..........#',
      '#..........#',
      '.#........#.',
      '..#......#..',
      '...######...',
    ];
    const w = rows[0].length, h = rows.length;
    const data = new Uint8ClampedArray(w * h * 4);
    rows.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === '#') data.set([43, 108, 176, 255], (y * w + x) * 4); }));
    const src = { width: w, height: h, data };
    for (const deg of ANGLES) {
      const out = rotateLikeCommit(src, deg);
      const W = out.width, H = out.height;
      const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && out.data[(y * W + x) * 4 + 3] !== 0;
      // Closed: the inside is not reachable from the border through 4-connected empty cells.
      const seen = new Uint8Array(W * H);
      const queue: number[] = [];
      for (let x = 0; x < W; x++) for (const y of [0, H - 1]) if (!solid(x, y)) { seen[y * W + x] = 1; queue.push(y * W + x); }
      for (let y = 0; y < H; y++) for (const x of [0, W - 1]) if (!solid(x, y) && !seen[y * W + x]) { seen[y * W + x] = 1; queue.push(y * W + x); }
      while (queue.length) {
        const i = queue.pop()!, x = i % W, y = (i - x) / W;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy, j = ny * W + nx;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen[j] || solid(nx, ny)) continue;
          seen[j] = 1;
          queue.push(j);
        }
      }
      let inside = 0, blocks = 0;
      for (let i = 0; i < W * H; i++) if (!seen[i] && !solid(i % W, (i - (i % W)) / W)) inside++;
      for (let y = 0; y < H - 1; y++) for (let x = 0; x < W - 1; x++) {
        if (solid(x, y) && solid(x + 1, y) && solid(x, y + 1) && solid(x + 1, y + 1)) blocks++;
      }
      expect(inside, `${deg}° stroke must stay closed`).toBeGreaterThan(10);
      expect(blocks, `${deg}° stroke must stay one pixel wide`).toBe(0);
    }
  });
});
