import { describe, it, expect } from 'vitest';
import {
  replicatePointWallpaper,
  applyWallpaperSymmetry,
} from '@/lib/canvas/wallpaperSymmetry';
import { applySymmetry } from '@/lib/canvas/rasterMath';

describe('Phase 34.4: 17 Wallpaper Groups Symmetry Brush Engine', () => {
  const width = 32;
  const height = 32;

  it('replicates single point as identity when group is none', () => {
    const pts = replicatePointWallpaper(4, 10, width, height, 'none');
    expect(pts).toEqual([{ x: 4, y: 10 }]);
  });

  it('replicates p2 (180° rotation / 2-fold rotocenter)', () => {
    const pts = replicatePointWallpaper(4, 10, width, height, 'p2');
    expect(pts.length).toBe(2);

    // Initial point
    expect(pts).toContainEqual({ x: 4, y: 10 });

    // 180° rotated: (31 - 4, 31 - 10) = (27, 21)
    expect(pts).toContainEqual({ x: 27, y: 21 });

    // Center point maps to 1 point
    const centerPts = replicatePointWallpaper(15, 15, 31, 31, 'p2');
    expect(centerPts.length).toBe(1);
    expect(centerPts[0]).toEqual({ x: 15, y: 15 });
  });

  it('replicates pm (bilateral mirror reflection across vertical axis)', () => {
    const pts = replicatePointWallpaper(4, 10, width, height, 'pm');
    expect(pts.length).toBe(2);

    expect(pts).toContainEqual({ x: 4, y: 10 });
    // Reflected across vertical axis: (31 - 4, 10) = (27, 10)
    expect(pts).toContainEqual({ x: 27, y: 10 });

    // Point on mirror axis maps to single point
    const axisPts = replicatePointWallpaper(15, 10, 31, 31, 'pm');
    expect(axisPts.length).toBe(1);
    expect(axisPts[0]).toEqual({ x: 15, y: 10 });
  });

  it('replicates p4 (4-fold cyclic rotation: 90°, 180°, 270°)', () => {
    const pts = replicatePointWallpaper(4, 10, width, height, 'p4');
    expect(pts.length).toBe(4);

    expect(pts).toContainEqual({ x: 4, y: 10 });

    // All points must be distinct
    const set = new Set(pts.map((p) => `${p.x},${p.y}`));
    expect(set.size).toBe(4);

    // Center point in odd grid maps to 1 point
    const centerPts = replicatePointWallpaper(15, 15, 31, 31, 'p4');
    expect(centerPts.length).toBe(1);
  });

  it('replicates p4m (8-way D4 dihedral kaleidoscope: 4 rotations + 4 reflections)', () => {
    // General point not on axis or diagonal
    const pts = replicatePointWallpaper(4, 10, width, height, 'p4m');
    expect(pts.length).toBe(8);

    const set = new Set(pts.map((p) => `${p.x},${p.y}`));
    expect(set.size).toBe(8);

    // Point on diagonal (x = y) reduces to 4 points due to reflection self-symmetry
    const diagPts = replicatePointWallpaper(5, 5, width, height, 'p4m');
    expect(diagPts.length).toBe(4);
  });

  it('replicates p6m (12-way D6 hexagonal snowflake kaleidoscope)', () => {
    const pts = replicatePointWallpaper(4, 10, width, height, 'p6m');
    expect(pts.length).toBe(12);

    const set = new Set(pts.map((p) => `${p.x},${p.y}`));
    expect(set.size).toBe(12);

    // All points must stay strictly within bounds
    for (const p of pts) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThan(width);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThan(height);
    }
  });

  it('applies symmetry across multi-point strokes via applyWallpaperSymmetry', () => {
    const stroke = [
      { x: 2, y: 3 },
      { x: 3, y: 3 },
      { x: 4, y: 4 },
    ];

    const replicated = applyWallpaperSymmetry(stroke, width, height, 'p4m');
    expect(replicated.length).toBeGreaterThanOrEqual(stroke.length * 4);

    // Deduplication check
    const uniqueKeys = new Set(replicated.map((p) => `${p.x},${p.y}`));
    expect(uniqueKeys.size).toBe(replicated.length);
  });

  it('integrates seamlessly with rasterMath applySymmetry helper', () => {
    const stroke = [{ x: 4, y: 10 }];

    // Passing wallpaperGroup takes precedence
    const p4Result = applySymmetry(stroke, width, height, false, false, 'p4');
    expect(p4Result.length).toBe(4);

    const p6mResult = applySymmetry(stroke, width, height, true, true, 'p6m');
    expect(p6mResult.length).toBe(12);

    // None falls back to classical H/V
    const fallbackResult = applySymmetry(stroke, width, height, true, false, 'none');
    expect(fallbackResult.length).toBe(2);
    expect(fallbackResult).toContainEqual({ x: 27, y: 10 });
  });
});
