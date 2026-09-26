import { describe, it, expect } from 'vitest';
import {
  getBresenhamLine,
  getDDALine,
  getClippedLine,
  filterPixelPerfect,
  getRectanglePoints,
  applySymmetry,
} from '@/lib/canvas/rasterMath';
import { MathInvariants } from '@/lib/safety/mathInvariants';

describe('getBresenhamLine', () => {
  it('includes both endpoints on a horizontal run', () => {
    const points = getBresenhamLine(2, 5, 7, 5);
    expect(points[0]).toEqual({ x: 2, y: 5 });
    expect(points[points.length - 1]).toEqual({ x: 7, y: 5 });
    expect(points).toHaveLength(6);
  });

  it('steps one pixel at a time on a diagonal', () => {
    const points = getBresenhamLine(0, 0, 3, 3);
    expect(points).toHaveLength(4);
    for (let i = 0; i < points.length; i++) {
      expect(points[i]).toEqual({ x: i, y: i });
    }
  });

  it('never skips a row on shallow lines (no gaps)', () => {
    const points = getBresenhamLine(0, 0, 10, 3);
    const ys = new Set(points.map(p => p.y));
    for (let y = 0; y <= 3; y++) expect(ys.has(y)).toBe(true);
  });

  it('rejects fractional endpoints and leaves subpixel work to DDA', () => {
    expect(() => getBresenhamLine(0.5, 0, 3, 3)).toThrow(RangeError);
    expect(getClippedLine(0.5, 0.5, 3.5, 3.5, 8, 8)).toHaveLength(4);
  });
});

describe('filterPixelPerfect', () => {
  it('removes the corner pixel of an L-shaped step', () => {
    const stroke = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
    ];
    const filtered = filterPixelPerfect(stroke);
    expect(filtered).toHaveLength(2);
    expect(filtered.some(p => p.x === 1 && p.y === 0)).toBe(false);
  });

  it('leaves straight runs untouched', () => {
    const stroke = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
    ];
    expect(filterPixelPerfect(stroke)).toHaveLength(3);
  });
});

describe('getRectanglePoints', () => {
  it('outlines four corners without filling the interior', () => {
    const points = getRectanglePoints(0, 0, 3, 3, false);
    expect(points.some(p => p.x === 1 && p.y === 1)).toBe(false);
    expect(points.filter(p => p.x === 0 && p.y === 0)).toHaveLength(1);
    expect(points.filter(p => p.x === 3 && p.y === 3)).toHaveLength(1);
  });

  it('fills every cell when filled', () => {
    expect(getRectanglePoints(0, 0, 2, 2, true)).toHaveLength(9);
  });
});

describe('applySymmetry', () => {
  it('mirrors horizontally and dedupes center-column points', () => {
    const mirrored = applySymmetry([{ x: 0, y: 1 }], 8, 8, true, false);
    expect(mirrored).toHaveLength(2);
    expect(mirrored.some(p => p.x === 7 && p.y === 1)).toBe(true);

    const center = applySymmetry([{ x: 3, y: 1 }], 7, 8, true, false);
    expect(center).toHaveLength(1);
  });
});

describe('getDDALine', () => {
  it('rasterizes horizontal line identically to integer points', () => {
    const points = getDDALine(0, 5, 5, 5);
    expect(points).toHaveLength(6);
    expect(points[0]).toEqual({ x: 0, y: 5 });
    expect(points[5]).toEqual({ x: 5, y: 5 });
  });

  it('handles subpixel floating point start and end coordinates without gap', () => {
    const points = getDDALine(0.2, 0.4, 4.8, 4.9);
    expect(points.length).toBeGreaterThanOrEqual(5);
    expect(points[0]).toEqual({ x: 0, y: 0 });
    expect(points[points.length - 1]).toEqual({ x: 5, y: 5 });
  });

  it('returns single point when start and end are identical', () => {
    const points = getDDALine(3.2, 7.8, 3.2, 7.8);
    expect(points).toEqual([{ x: 3, y: 8 }]);
  });
});

describe('clipLineToCanvasSubpixel & getClippedLine', () => {
  it('returns exact continuous intersection coordinates without intermediate rounding', () => {
    // Line starting from (-10, -10) to (20, 20) against a 10x10 canvas [0..9, 0..9]
    const subpixel = MathInvariants.clipLineToCanvasSubpixel(-10, -10, 20, 20, 10, 10);
    expect(subpixel).not.toBeNull();
    expect(subpixel!.x0).toBe(0);
    expect(subpixel!.y0).toBe(0);
    expect(subpixel!.x1).toBe(9);
    expect(subpixel!.y1).toBe(9);
  });

  it('getClippedLine returns unclipped Bresenham line when inside canvas', () => {
    const inside = getClippedLine(2, 3, 7, 8, 32, 32);
    const expected = getBresenhamLine(2, 3, 7, 8);
    expect(inside).toEqual(expected);
  });

  it('getClippedLine safely clips lines that extend beyond canvas boundary and stays in bounds', () => {
    const points = getClippedLine(-20, 5, 40, 5, 16, 16);
    expect(points.length).toBeGreaterThan(0);
    for (const p of points) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThan(16);
      expect(p.y).toBe(5);
    }
  });

  it('returns empty array when line is completely outside canvas', () => {
    const points = getClippedLine(100, 100, 200, 200, 32, 32);
    expect(points).toEqual([]);
  });
});
