import { describe, it, expect } from 'vitest';
import {
  getBresenhamLine,
  filterPixelPerfect,
  getRectanglePoints,
  applySymmetry,
} from '@/lib/canvas/rasterMath';

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
