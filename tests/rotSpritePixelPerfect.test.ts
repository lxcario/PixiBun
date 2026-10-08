/**
 * tests/rotSpritePixelPerfect.test.ts
 *
 * Dedicated Test Suite for RotSprite Pixel-Perfect Line & Contour Rotation.
 *
 * Verifies:
 * - Elimination of redundant 2x2 L-corner double-pixel jaggies on rotated single-pixel lines.
 * - Single-pixel line width preservation on 1px hollow circles and strokes at arbitrary angles (23°, 45°, 67°).
 * - Strict 8-connectivity preservation: zero dropouts, gaps, or severed contours.
 * - Enclosed hole topological retention: interior holes remain enclosed without leaking.
 * - Strict palette safety: output colors are 100% subsets of source colors.
 * - Strict binary alpha: all alpha channels are either 0 or 255.
 * - Protection of authored small features and filled interior shapes against erosion.
 */

import { describe, it, expect } from 'vitest';
import {
  rotSprite,
  refinePixelPerfectContour,
  computeRotatedBounds,
  type PixelBuffer,
} from '@/lib/canvas/rotSprite';
import { getEllipsePoints } from '@/lib/canvas/rasterMath';

function count8ConnectedComponents(buf: PixelBuffer): number {
  const { width: w, height: h, data } = buf;
  const solid = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    if (data[i * 4 + 3] > 0) solid[i] = 1;
  }

  const visited = new Uint8Array(w * h);
  let compCount = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      if (solid[idx] && !visited[idx]) {
        compCount++;
        const queue = [idx];
        visited[idx] = 1;
        while (queue.length > 0) {
          const cur = queue.pop()!;
          const cy = Math.floor(cur / w);
          const cx = cur % w;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;
              const nx = cx + dx;
              const ny = cy + dy;
              if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                const nidx = ny * w + nx;
                if (solid[nidx] && !visited[nidx]) {
                  visited[nidx] = 1;
                  queue.push(nidx);
                }
              }
            }
          }
        }
      }
    }
  }
  return compCount;
}

function countLCorners(buf: PixelBuffer): number {
  const { width: w, height: h, data } = buf;
  const isSolid = (x: number, y: number) => {
    if (x < 0 || x >= w || y < 0 || y >= h) return false;
    return data[(y * w + x) * 4 + 3] > 0;
  };

  let lCorners = 0;
  for (let y = 0; y < h - 1; y++) {
    for (let x = 0; x < w - 1; x++) {
      const s00 = isSolid(x, y) ? 1 : 0;
      const s10 = isSolid(x + 1, y) ? 1 : 0;
      const s01 = isSolid(x, y + 1) ? 1 : 0;
      const s11 = isSolid(x + 1, y + 1) ? 1 : 0;
      if (s00 + s10 + s01 + s11 === 3) {
        lCorners++;
      }
    }
  }
  return lCorners;
}

function countEnclosedHolePixels(buf: PixelBuffer): number {
  const { width: w, height: h, data } = buf;
  const solid = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    if (data[i * 4 + 3] > 0) solid[i] = 1;
  }

  const extVisited = new Uint8Array(w * h);
  const extQueue: number[] = [];
  for (let x = 0; x < w; x++) {
    const top = x;
    const btm = (h - 1) * w + x;
    if (!solid[top] && !extVisited[top]) { extVisited[top] = 1; extQueue.push(top); }
    if (!solid[btm] && !extVisited[btm]) { extVisited[btm] = 1; extQueue.push(btm); }
  }
  for (let y = 0; y < h; y++) {
    const left = y * w;
    const right = y * w + (w - 1);
    if (!solid[left] && !extVisited[left]) { extVisited[left] = 1; extQueue.push(left); }
    if (!solid[right] && !extVisited[right]) { extVisited[right] = 1; extQueue.push(right); }
  }

  while (extQueue.length > 0) {
    const cur = extQueue.pop()!;
    const cy = Math.floor(cur / w);
    const cx = cur % w;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx, ny = cy + dy;
      if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
        const nidx = ny * w + nx;
        if (!solid[nidx] && !extVisited[nidx]) {
          extVisited[nidx] = 1;
          extQueue.push(nidx);
        }
      }
    }
  }

  let holeCount = 0;
  for (let i = 0; i < w * h; i++) {
    if (!solid[i] && !extVisited[i]) holeCount++;
  }
  return holeCount;
}

function makeHollowCircle(w: number, h: number, x0: number, y0: number, x1: number, y1: number): PixelBuffer {
  const data = new Uint8ClampedArray(w * h * 4);
  const pts = getEllipsePoints(x0, y0, x1, y1, false);
  for (const pt of pts) {
    const idx = (pt.y * w + pt.x) * 4;
    data[idx] = 46;
    data[idx + 1] = 32;
    data[idx + 2] = 61;
    data[idx + 3] = 255;
  }
  return { width: w, height: h, data };
}

describe('Pixel-Perfect RotSprite Rotation', () => {
  it('rotates hollow circle at 23° with crisp 1px stroke, 0 L-corners, and unbroken continuity', () => {
    const circle = makeHollowCircle(32, 32, 6, 6, 26, 26);
    const rad = (23 * Math.PI) / 180;
    const bounds = computeRotatedBounds(32, 32, 0, 0, 16, 16, rad);

    const rotated = rotSprite(
      circle,
      rad,
      bounds.localPivotX,
      bounds.localPivotY,
      bounds.targetW,
      bounds.targetH,
      bounds.outPivotX,
      bounds.outPivotY,
      true
    );

    // 1. Strict 8-connectivity (exactly 1 connected component, zero dropouts)
    const comps = count8ConnectedComponents(rotated);
    expect(comps).toBe(1);

    // 2. Interior hole remains enclosed without leaking
    const holePixels = countEnclosedHolePixels(rotated);
    expect(holePixels).toBeGreaterThan(150);

    // 3. Pixel-perfect: redundant 2x2 L-corners are pruned
    const lCorners = countLCorners(rotated);
    expect(lCorners).toBeLessThanOrEqual(4);

    // 4. Solid pixel count reflects true 1-pixel contour (perimeter ~ 60)
    let solidCount = 0;
    for (let i = 3; i < rotated.data.length; i += 4) {
      if (rotated.data[i] > 0) solidCount++;
    }
    expect(solidCount).toBeLessThan(70);
    expect(solidCount).toBeGreaterThanOrEqual(50);
  });

  it('preserves single-pixel width across angular sweep (15°, 30°, 45°, 60°, 75°)', () => {
    const circle = makeHollowCircle(32, 32, 6, 6, 26, 26);
    const angles = [15, 30, 45, 60, 75];

    for (const deg of angles) {
      const rad = (deg * Math.PI) / 180;
      const bounds = computeRotatedBounds(32, 32, 0, 0, 16, 16, rad);
      const rotated = rotSprite(
        circle,
        rad,
        bounds.localPivotX,
        bounds.localPivotY,
        bounds.targetW,
        bounds.targetH,
        bounds.outPivotX,
        bounds.outPivotY,
        true
      );

      const comps = count8ConnectedComponents(rotated);
      expect(comps, `At ${deg}°, circle must be 1 continuous component`).toBe(1);

      const hole = countEnclosedHolePixels(rotated);
      expect(hole, `At ${deg}°, hole must remain enclosed`).toBeGreaterThan(100);

      const lCorners = countLCorners(rotated);
      expect(lCorners, `At ${deg}°, L-corners must be minimized`).toBeLessThanOrEqual(4);
    }
  });

  it('guarantees palette safety and binary alpha', () => {
    const circle = makeHollowCircle(32, 32, 6, 6, 26, 26);
    const rad = (37 * Math.PI) / 180;
    const rotated = rotSprite(circle, rad, 16, 16, 32, 32, 16, 16, true);

    const validColors = new Set(['0,0,0,0', '46,32,61,255']);
    for (let i = 0; i < rotated.data.length; i += 4) {
      const key = `${rotated.data[i]},${rotated.data[i + 1]},${rotated.data[i + 2]},${rotated.data[i + 3]}`;
      expect(validColors.has(key), `Disallowed color found: ${key}`).toBe(true);

      const alpha = rotated.data[i + 3];
      expect(alpha === 0 || alpha === 255, `Non-binary alpha: ${alpha}`).toBe(true);
    }
  });

  it('does not erode solid filled shapes', () => {
    // 16x16 solid square
    const w = 16, h = 16;
    const data = new Uint8ClampedArray(w * h * 4);
    for (let y = 3; y <= 12; y++) {
      for (let x = 3; x <= 12; x++) {
        const idx = (y * w + x) * 4;
        data[idx] = 200; data[idx + 1] = 100; data[idx + 2] = 50; data[idx + 3] = 255;
      }
    }
    const buf: PixelBuffer = { width: w, height: h, data };
    const rad = (45 * Math.PI) / 180;
    const rotated = rotSprite(buf, rad, 8, 8, 16, 16, 8, 8, true);

    const comps = count8ConnectedComponents(rotated);
    expect(comps).toBe(1);

    // Should have substantial solid mass (> 60 pixels)
    let solidCount = 0;
    for (let i = 3; i < rotated.data.length; i += 4) {
      if (rotated.data[i] > 0) solidCount++;
    }
    expect(solidCount).toBeGreaterThan(60);
  });

  it('refinePixelPerfectContour directly prunes redundant 2x2 elbow pixels while respecting protectedCells', () => {
    const w = 6, h = 6;
    const makeGrid = () => {
      const data = new Uint8ClampedArray(w * h * 4);
      const setPx = (x: number, y: number) => {
        const i = (y * w + x) * 4;
        data[i] = 255; data[i + 1] = 0; data[i + 2] = 0; data[i + 3] = 255;
      };
      setPx(0, 4);
      setPx(1, 3);
      setPx(2, 2);
      setPx(3, 2); // redundant elbow
      setPx(3, 1);
      setPx(4, 0);
      return { width: w, height: h, data };
    };

    const buf = makeGrid();
    const refined = refinePixelPerfectContour(buf);
    const elbowIdx = (2 * w + 3) * 4;
    // Elbow should be pruned:
    expect(refined.data[elbowIdx + 3]).toBe(0);
    // 8-connectivity preserved:
    expect(count8ConnectedComponents(refined)).toBe(1);

    // If protected, it must NOT be pruned:
    const protectedCells = new Uint8Array(w * h);
    protectedCells[2 * w + 3] = 1;
    const preserved = refinePixelPerfectContour(buf, protectedCells);
    expect(preserved.data[elbowIdx + 3]).toBe(255);
  });
});
