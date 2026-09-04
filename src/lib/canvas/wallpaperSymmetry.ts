/**
 * 17 Wallpaper Groups & Crystallographic Plane Symmetry Brush Engine.
 *
 * Academic Citation:
 * Doris Schattschneider, "The Plane Symmetry Groups: Their Recognition and Notation,"
 * The American Mathematical Monthly, Vol. 85, No. 6, pp. 439-450, 1978.
 *
 * Mathematical Foundations:
 * The 17 planar crystallographic groups describe the discrete isometries of 2D Euclidean space.
 * For finite local sprite and tilework operations, the fundamental point symmetry subgroups
 * of the wallpaper groups generate orbit sets under cyclic (Cn) and dihedral (Dn) actions:
 * - p2 (C2): 180° rotation around canvas centroid (2-fold rotocenter).
 * - pm (D1): Bilateral mirror reflection across the vertical axis.
 * - p4 (C4): 4-fold cyclic rotation (90°, 180°, 270° rotocenters).
 * - p4m (D4): 4-fold rotation with 4 reflection lines intersecting at 45° (8-way kaleidoscope).
 * - p6m (D6): 6-fold rotation with 6 reflection lines intersecting at 30° (12-way snowflake kaleidoscope).
 */

import { Point } from '@/lib/canvas/rasterMath';
import { WallpaperGroup } from '@/types/tools';

/**
 * Replicates a single canvas coordinate across all isometries of a wallpaper group.
 *
 * @param x Pixel X coordinate
 * @param y Pixel Y coordinate
 * @param width Canvas width in pixels
 * @param height Canvas height in pixels
 * @param group Wallpaper group identifier ('none' | 'pm' | 'p2' | 'p4' | 'p4m' | 'p6m')
 * @returns Array of unique, canvas-bounded integer points in the symmetry orbit
 */
export function replicatePointWallpaper(
  x: number,
  y: number,
  width: number,
  height: number,
  group: WallpaperGroup
): Point[] {
  if (group === 'none') {
    return [{ x, y }];
  }

  const cx = (width - 1) / 2;
  const cy = (height - 1) / 2;
  const u = x - cx;
  const v = y - cy;

  const points: Point[] = [];
  const visited = new Set<number>();

  const addPoint = (px: number, py: number) => {
    const rx = Math.round(px);
    const ry = Math.round(py);
    if (rx >= 0 && rx < width && ry >= 0 && ry < height) {
      const key = ry * width + rx;
      if (!visited.has(key)) {
        visited.add(key);
        points.push({ x: rx, y: ry });
      }
    }
  };

  // 1. Identity point
  addPoint(x, y);

  if (group === 'p2') {
    // 180° rotation around center
    addPoint(cx - u, cy - v);
  } else if (group === 'pm') {
    // Bilateral mirror across vertical centroid axis
    addPoint(cx - u, cy + v);
  } else if (group === 'p4') {
    // 90°, 180°, and 270° rotations
    addPoint(cx - v, cy + u); // 90°
    addPoint(cx - u, cy - v); // 180°
    addPoint(cx + v, cy - u); // 270°
  } else if (group === 'p4m') {
    // 4 Rotations (0°, 90°, 180°, 270°)
    addPoint(cx - v, cy + u);
    addPoint(cx - u, cy - v);
    addPoint(cx + v, cy - u);

    // 4 Reflections (vertical, horizontal, diagonal, anti-diagonal)
    addPoint(cx - u, cy + v);
    addPoint(cx + u, cy - v);
    addPoint(cx + v, cy + u);
    addPoint(cx - v, cy - v);
  } else if (group === 'p6m') {
    // 6 Rotations (multiples of 60°)
    for (let k = 1; k < 6; k++) {
      const theta = (k * Math.PI) / 3;
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);
      addPoint(cx + (u * cosT - v * sinT), cy + (u * sinT + v * cosT));
    }

    // 6 Reflections across axes spaced by 30°
    const nu = -u;
    for (let k = 0; k < 6; k++) {
      const theta = (k * Math.PI) / 3;
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);
      addPoint(cx + (nu * cosT - v * sinT), cy + (nu * sinT + v * cosT));
    }
  }

  return points;
}

/**
 * Replicates a set of stroke points per the selected wallpaper group's rotation/reflection operations.
 */
export function applyWallpaperSymmetry(
  points: Point[],
  width: number,
  height: number,
  group: WallpaperGroup
): Point[] {
  if (group === 'none') {
    return points;
  }

  const pointSet = new Set<number>();
  const result: Point[] = [];

  for (const pt of points) {
    const orbit = replicatePointWallpaper(pt.x, pt.y, width, height, group);
    for (const op of orbit) {
      const key = op.y * width + op.x;
      if (!pointSet.has(key)) {
        pointSet.add(key);
        result.push(op);
      }
    }
  }

  return result;
}
