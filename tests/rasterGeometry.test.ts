import { describe, expect, it } from 'vitest';
import { getQuadraticBezierPoints } from '@/lib/ai/math/curvesAndLines';
import { getEllipsePoints, getRectanglePoints, type Point } from '@/lib/canvas/rasterMath';
import { performFloodFill } from '@/lib/canvas/floodFill';
import { makeCanvas } from './helpers/mockCanvas';

// Regressions for the 17 October audit triage (docs/releases/2026-10-18-audit-triage.md).

const keys = (points: Point[]) => points.map(p => `${p.x},${p.y}`);

/** Chebyshev steps between consecutive points. */
const steps = (points: Point[]) => points.slice(1).map((p, i) => Math.max(Math.abs(p.x - points[i].x), Math.abs(p.y - points[i].y)));

/** Number of 8-connected components in a pixel set. */
function components8(points: Point[]): number {
  const remaining = new Set(keys(points));
  let count = 0;
  for (const start of [...remaining]) {
    if (!remaining.has(start)) continue;
    count++;
    const queue = [start];
    remaining.delete(start);
    while (queue.length) {
      const [x, y] = queue.pop()!.split(',').map(Number);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const key = `${x + dx},${y + dy}`;
          if (remaining.delete(key)) queue.push(key);
        }
      }
    }
  }
  return count;
}

describe('getEllipsePoints fills the dragged box at either parity', () => {
  const span = (points: Point[]) => {
    const xs = points.map(p => p.x);
    const ys = points.map(p => p.y);
    return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
  };

  it.each([[8, 8], [16, 16], [2, 2], [4, 6], [32, 32]])('spans the whole %i×%i drag box', (w, h) => {
    for (const filled of [false, true]) {
      const points = getEllipsePoints(0, 0, w - 1, h - 1, filled);
      expect(span(points)).toEqual({ minX: 0, maxX: w - 1, minY: 0, maxY: h - 1 });
    }
  });

  it('gives an even circle a 2×2 hub of symmetric pixels', () => {
    const outline = new Set(keys(getEllipsePoints(0, 0, 7, 7, false)));
    // Mirror about the half-pixel centre 3.5: x -> 7 - x.
    for (const key of outline) {
      const [x, y] = key.split(',').map(Number);
      expect(outline.has(`${7 - x},${y}`)).toBe(true);
      expect(outline.has(`${x},${7 - y}`)).toBe(true);
      expect(outline.has(`${y},${x}`)).toBe(true);
    }
    // Two-pixel flats at the middle of each side.
    for (const key of ['3,0', '4,0', '0,3', '0,4', '7,3', '7,4', '3,7', '4,7']) expect(outline.has(key)).toBe(true);
  });

  it('is a closed, symmetric, duplicate-free outline inside the box for every size up to 40×40', () => {
    for (let w = 1; w <= 40; w++) {
      for (let h = 1; h <= 40; h++) {
        const x0 = 3, y0 = 5, x1 = x0 + w - 1, y1 = y0 + h - 1;
        const outline = getEllipsePoints(x1, y1, x0, y0, false); // corner order must not matter
        const set = new Set(keys(outline));
        const area = getEllipsePoints(x0, y0, x1, y1, true);
        const areaSet = new Set(keys(area));
        const rows = new Map<number, number[]>();
        for (const p of area) rows.set(p.y, [...(rows.get(p.y) ?? []), p.x]);
        // One assertion per box keeps the 1,600-box sweep fast under coverage.
        expect({
          box: `${w}×${h}`,
          duplicates: outline.length - set.size,
          span: span(outline),
          components: components8(outline),
          asymmetric: outline.filter(p => !set.has(`${x0 + x1 - p.x},${p.y}`) || !set.has(`${p.x},${y0 + y1 - p.y}`)).length,
          fillDuplicates: area.length - areaSet.size,
          outlineOutsideFill: [...set].filter(key => !areaSet.has(key)).length,
          rows: rows.size,
          // Every row of the fill is one unbroken span.
          brokenRows: [...rows.values()].filter(xs => Math.max(...xs) - Math.min(...xs) + 1 !== xs.length).length,
        }).toEqual({
          box: `${w}×${h}`, duplicates: 0, span: { minX: x0, maxX: x1, minY: y0, maxY: y1 }, components: 1,
          asymmetric: 0, fillDuplicates: 0, outlineOutsideFill: 0, rows: h, brokenRows: 0,
        });
      }
    }
  });

  it('draws a one-pixel-thick box as a straight run, never a diagonal', () => {
    expect(keys(getEllipsePoints(2, 4, 2, 8, false))).toEqual(['2,4', '2,5', '2,6', '2,7', '2,8']);
    expect(keys(getEllipsePoints(6, 1, 2, 1, true))).toEqual(['2,1', '3,1', '4,1', '5,1', '6,1']);
    // Two pixels wide is a slim ellipse spanning the whole height.
    expect(span(getEllipsePoints(0, 0, 1, 9, false))).toEqual({ minX: 0, maxX: 1, minY: 0, maxY: 9 });
  });
});

describe('getRectanglePoints lists each pixel once', () => {
  it('stamps a one-pixel-high outline once per pixel', () => {
    const points = getRectanglePoints(2, 4, 8, 4, false);
    expect(keys(points)).toEqual(['2,4', '3,4', '4,4', '5,4', '6,4', '7,4', '8,4']);
  });

  it('stamps a one-pixel-wide outline once per pixel', () => {
    const points = getRectanglePoints(3, 9, 3, 5, false);
    expect(new Set(keys(points)).size).toBe(points.length);
    expect(points).toHaveLength(5);
  });

  it('stamps a single-click rectangle once', () => {
    expect(getRectanglePoints(5, 5, 5, 5, false)).toEqual([{ x: 5, y: 5 }]);
  });

  it('has no duplicates for any outline up to 12×12, with the perimeter count', () => {
    for (let w = 1; w <= 12; w++) {
      for (let h = 1; h <= 12; h++) {
        const points = getRectanglePoints(0, 0, w - 1, h - 1, false);
        expect(new Set(keys(points)).size).toBe(points.length);
        expect(points).toHaveLength(w === 1 || h === 1 ? w * h : 2 * (w + h) - 4);
      }
    }
  });
});

describe('getQuadraticBezierPoints stays 8-connected', () => {
  it('fills the audit gap at (93,49) under an asymmetric pull', () => {
    const points = getQuadraticBezierPoints({ x: 0, y: 50 }, { x: 0, y: 30 }, { x: 100, y: 50 });
    expect(keys(points)).toContain('93,49');
    expect(Math.max(...steps(points))).toBeLessThanOrEqual(1);
    expect(points[0]).toEqual({ x: 0, y: 50 });
    expect(points[points.length - 1]).toEqual({ x: 100, y: 50 });
  });

  it('never steps more than one pixel on non-reversing curves', () => {
    // Deterministic sweep of control points pulled hard towards one end.
    for (let cx = -40; cx <= 140; cx += 20) {
      for (let cy = -60; cy <= 60; cy += 15) {
        const points = getQuadraticBezierPoints({ x: 0, y: 0 }, { x: cx, y: cy }, { x: 100, y: 10 });
        // A control point beyond an end can make the curve double back; then
        // dedupe can legitimately reorder, so only require one component.
        const reverses = cx < 0 || cx > 100;
        if (reverses) expect(components8(points)).toBe(1);
        else expect(Math.max(...steps(points))).toBeLessThanOrEqual(1);
        expect(new Set(keys(points)).size).toBe(points.length);
      }
    }
  });

  it('adds no chord when a curve doubles back on itself', () => {
    // The control point far past the end makes the curve overshoot and return.
    const points = getQuadraticBezierPoints({ x: 0, y: 0 }, { x: 60, y: 0 }, { x: 20, y: 0 });
    expect(points.every(p => p.y === 0)).toBe(true);
    expect(components8(points)).toBe(1);
  });

  it('keeps 8-connected diagonal steps watertight for the 4-connected bucket', () => {
    // Diagonal steps are intended pixel-art stairs: a 4-connected fill cannot
    // pass between two diagonal neighbours, so the curve still seals.
    const width = 40;
    const height = 40;
    const canvas = makeCanvas(width, height);
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#000000';
    const curve = getQuadraticBezierPoints({ x: 0, y: 30 }, { x: 20, y: -10 }, { x: 39, y: 30 });
    expect(steps(curve).some((_, i) => Math.abs(curve[i + 1].x - curve[i].x) === 1 && Math.abs(curve[i + 1].y - curve[i].y) === 1)).toBe(true);
    for (const p of curve) ctx.fillRect(p.x, p.y, 1, 1);

    performFloodFill(ctx, 0, 39, '#ff0000');
    const data = ctx.getImageData(0, 0, width, height).data;
    // The fill stays below the curve: the pixel above its apex is untouched.
    const apex = curve.reduce((best, p) => (p.y < best.y ? p : best));
    expect(apex.y).toBeGreaterThan(0);
    const above = ((apex.y - 1) * width + apex.x) * 4;
    expect(data[above + 3]).toBe(0);
    const below = (39 * width + 20) * 4;
    expect([data[below], data[below + 3]]).toEqual([255, 255]);
  });
});
