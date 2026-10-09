/**
 * tests/rotSpriteContourPreservation.test.ts
 *
 * Regression test suite verifying that 1-pixel hollow lines, contours,
 * and closed loops survive arbitrary-angle pixel art rotation without
 * dropouts, gaps, or severance.
 */

import { describe, it, expect } from 'vitest';
import { rotSprite, computeRotatedBounds, type PixelBuffer } from '@/lib/canvas/rotSprite';
import { OUTLINED_CIRCLE_ROWS } from './fixtures/outlinedCircle';

const POTATO_OUTLINE = [
  '.......########........',
  '......#........#.......',
  '.....#..........#......',
  '....#............#.....',
  '....#............#.....',
  '...#.............#.....',
  '...#.............#.....',
  '...#.............#.....',
  '....#............#.....',
  '.....#..........#......',
  '......###......#.......',
  '.........######........',
];

function makePotato(): PixelBuffer {
  const h = POTATO_OUTLINE.length;
  const w = POTATO_OUTLINE[0].length;
  const buf: PixelBuffer = { width: w, height: h, data: new Uint8ClampedArray(w * h * 4) };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (POTATO_OUTLINE[y][x] === '#') {
        const idx = (y * w + x) * 4;
        buf.data[idx] = 58;
        buf.data[idx + 1] = 46;
        buf.data[idx + 2] = 76;
        buf.data[idx + 3] = 255;
      }
    }
  }
  return buf;
}

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

function countEnclosedHolePixels(buf: PixelBuffer): number {
  const { width: w, height: h, data } = buf;
  const solid = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    if (data[i * 4 + 3] > 0) solid[i] = 1;
  }

  // Flood fill from outer boundaries
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
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
        const nidx = ny * w + nx;
        if (!solid[nidx] && !extVisited[nidx]) {
          extVisited[nidx] = 1;
          extQueue.push(nidx);
        }
      }
    }
  }

  let enclosedHoleCount = 0;
  for (let i = 0; i < w * h; i++) {
    if (!solid[i] && !extVisited[i]) {
      enclosedHoleCount++;
    }
  }
  return enclosedHoleCount;
}

describe('RotSprite Contour & 1px Outline Preservation', () => {
  it('preserves continuity of 1px closed outline across angles from 5° to 85°', () => {
    const potato = makePotato();
    const testAngles = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85];

    for (const deg of testAngles) {
      const rad = (deg * Math.PI) / 180;
      const bounds = computeRotatedBounds(potato.width, potato.height, 0, 0, potato.width / 2, potato.height / 2, rad);
      const rot = rotSprite(
        potato,
        rad,
        bounds.localPivotX,
        bounds.localPivotY,
        bounds.targetW,
        bounds.targetH,
        bounds.outPivotX,
        bounds.outPivotY
      );

      const compCount = count8ConnectedComponents(rot);
      const holePixels = countEnclosedHolePixels(rot);

      expect(compCount, `Component count at ${deg}° should be 1 (no broken contour)`).toBe(1);
      expect(holePixels, `Interior hole at ${deg}° must remain enclosed without leaking`).toBeGreaterThan(0);
    }
  });

  it('correctly rotates with explicit user pivot and unclipped target bounding box', () => {
    const potato = makePotato();
    const rad = (30 * Math.PI) / 180;
    const curW = potato.width;
    const curH = potato.height;
    const pivotX = 5;
    const pivotY = 5;

    const bounds = computeRotatedBounds(curW, curH, 0, 0, pivotX, pivotY, rad);
    const rotated = rotSprite(
      potato,
      rad,
      bounds.localPivotX,
      bounds.localPivotY,
      bounds.targetW,
      bounds.targetH,
      bounds.outPivotX,
      bounds.outPivotY
    );

    expect(rotated.width).toBe(bounds.targetW);
    expect(rotated.height).toBe(bounds.targetH);
    const compCount = count8ConnectedComponents(rotated);
    expect(compCount).toBe(1);
  });

  // Wall-clock admission lives in scripts/benchmarkRotSprite.mjs, outside coverage.
  // Functional contour/pivot/ring assertions remain instrumented in this suite.

  it('preserves continuity and enclosed hole of 1px hollow circle/ring across arbitrary angles', () => {
    const width = 32, height = 32;
    const ringBuf: PixelBuffer = { width, height, data: new Uint8ClampedArray(width * height * 4) };
    for (let y = 0; y < OUTLINED_CIRCLE_ROWS.length; y++) {
      for (let x = 0; x < width; x++) {
        if (OUTLINED_CIRCLE_ROWS[y][x] === '#') {
          const idx = ((y + 8) * width + x) * 4;
          ringBuf.data[idx] = 46;
          ringBuf.data[idx + 1] = 32;
          ringBuf.data[idx + 2] = 61;
          ringBuf.data[idx + 3] = 255;
        }
      }
    }

    const testAngles = [-19, 15, 20, 30, 45, 47.7, 60, 75];
    for (const deg of testAngles) {
      const rad = (deg * Math.PI) / 180;
      const bounds = computeRotatedBounds(width, height, 0, 0, width / 2, height / 2, rad);
      const rot = rotSprite(
        ringBuf,
        rad,
        bounds.localPivotX,
        bounds.localPivotY,
        bounds.targetW,
        bounds.targetH,
        bounds.outPivotX,
        bounds.outPivotY
      );

      const compCount = count8ConnectedComponents(rot);
      const holePixels = countEnclosedHolePixels(rot);

      expect(compCount, `Hollow ring component count at ${deg}° should be 1 (no broken contour)`).toBe(1);
      expect(holePixels, `Hollow ring interior hole at ${deg}° must remain enclosed without leaking`).toBeGreaterThan(50);
    }
  });
});
