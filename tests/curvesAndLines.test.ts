import { describe, it, expect } from 'vitest';
import {
  getQuadraticBezierPoints,
  getIsometric2p1Line,
  calculate47TileBitmask,
} from '@/lib/ai/math/curvesAndLines';
import { getBresenhamLine } from '@/lib/canvas/rasterMath';

describe('curvesAndLines mathematical engine', () => {
  describe('getQuadraticBezierPoints', () => {
    it('always preserves exact endpoints p0 and p2', () => {
      const p0 = { x: 5, y: 10 };
      const p1 = { x: 25, y: 40 };
      const p2 = { x: 50, y: 15 };

      const points = getQuadraticBezierPoints(p0, p1, p2);
      expect(points.length).toBeGreaterThanOrEqual(2);
      expect(points[0]).toEqual(p0);
      expect(points[points.length - 1]).toEqual(p2);
    });

    it('returns a single point when all control points are identical', () => {
      const p = { x: 12, y: 34 };
      const points = getQuadraticBezierPoints(p, p, p);
      expect(points).toEqual([p]);
    });

    it('asserts collinear Bézier points form a subset of Bresenham line (subset assertion)', () => {
      // (0,0) -> (30,30) with control point (15,15)
      const p0 = { x: 0, y: 0 };
      const p1 = { x: 15, y: 15 };
      const p2 = { x: 30, y: 30 };

      const bezierPts = getQuadraticBezierPoints(p0, p1, p2);
      const bresenhamPts = getBresenhamLine(p0.x, p0.y, p2.x, p2.y);
      const bresenhamSet = new Set(bresenhamPts.map((p) => `${p.x},${p.y}`));

      for (const pt of bezierPts) {
        expect(bresenhamSet.has(`${pt.x},${pt.y}`)).toBe(true);
      }
    });

    it('maintains 8-connectivity with zero skipped gaps across long curves', () => {
      // Long curve (0,0) -> (160,0) curving through (80,60)
      const p0 = { x: 0, y: 0 };
      const p1 = { x: 80, y: 60 };
      const p2 = { x: 160, y: 0 };

      const points = getQuadraticBezierPoints(p0, p1, p2);
      for (let i = 0; i < points.length - 1; i++) {
        const dx = Math.abs(points[i + 1].x - points[i].x);
        const dy = Math.abs(points[i + 1].y - points[i].y);
        const maxStep = Math.max(dx, dy);
        // 8-connectivity invariant: step distance between consecutive rasterized points must be <= 1
        expect(maxStep).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('getIsometric2p1Line', () => {
    it('produces alternating 2-pixel steps along X for standard 2:1 isometric slope', () => {
      // Line from (0,0) to (10,5)
      const points = getIsometric2p1Line(0, 0, 10, 5);
      expect(points[0]).toEqual({ x: 0, y: 0 });

      // Group points by Y to verify run-lengths
      const yRuns = new Map<number, number[]>();
      for (const pt of points) {
        if (!yRuns.has(pt.y)) yRuns.set(pt.y, []);
        yRuns.get(pt.y)!.push(pt.x);
      }

      for (const xs of yRuns.values()) {
        expect(xs.length).toBeGreaterThanOrEqual(1);
        expect(xs.length).toBeLessThanOrEqual(2);
      }
    });

    it('handles zero-length degenerate segment', () => {
      const points = getIsometric2p1Line(7, 9, 7, 9);
      expect(points).toEqual([{ x: 7, y: 9 }]);
    });

    it('handles vertical line edge case without horizontal drift', () => {
      const points = getIsometric2p1Line(15, 0, 15, 10);
      expect(points.length).toBe(11);
      for (const pt of points) {
        expect(pt.x).toBe(15);
      }
    });

    it('handles horizontal line edge case without vertical drift', () => {
      const points = getIsometric2p1Line(0, 8, 10, 8);
      expect(points.length).toBe(11);
      for (const pt of points) {
        expect(pt.y).toBe(8);
      }
    });
  });

  describe('calculate47TileBitmask', () => {
    it('returns 0 for an isolated tile with no neighbors', () => {
      const mask = calculate47TileBitmask(() => false, 10, 10);
      expect(mask).toBe(0);
    });

    it('returns 255 when all 8 neighbors are present', () => {
      const mask = calculate47TileBitmask(() => true, 10, 10);
      expect(mask).toBe(255);
    });

    it('computes cardinal-only neighbors (N=1, E=4, S=16, W=64)', () => {
      const neighbors = new Set(['10,9', '11,10', '10,11', '9,10']);
      const isNeighbor = (nx: number, ny: number) => neighbors.has(`${nx},${ny}`);
      const mask = calculate47TileBitmask(isNeighbor, 10, 10);
      expect(mask).toBe(1 + 4 + 16 + 64); // 85
    });

    it('suppresses corner bit when adjacent cardinal neighbors are missing (Wang rule)', () => {
      // Corner NE (11,9) is true, but N (10,9) and E (11,10) are false
      const neighbors = new Set(['11,9']);
      const isNeighbor = (nx: number, ny: number) => neighbors.has(`${nx},${ny}`);
      const mask = calculate47TileBitmask(isNeighbor, 10, 10);
      // In 47-tile autotiling, NE only counts if N AND E are present!
      expect(mask).toBe(0);
    });

    it('includes corner bit when both adjacent cardinal neighbors are present', () => {
      // N (10,9) and E (11,10) and NE (11,9) are true
      const neighbors = new Set(['10,9', '11,10', '11,9']);
      const isNeighbor = (nx: number, ny: number) => neighbors.has(`${nx},${ny}`);
      const mask = calculate47TileBitmask(isNeighbor, 10, 10);
      // N (1) + NE (2) + E (4) = 7
      expect(mask).toBe(1 + 2 + 4);
    });
  });
});
