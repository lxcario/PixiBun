/**
 * Quadratic Bézier Curves, Isometric 2:1 Lines, and 47-Tile Blob Autotile Bitmasks.
 */

export interface Point {
  x: number;
  y: number;
}

export interface ShadedPixel {
  x: number;
  y: number;
  r: number;
  g: number;
  b: number;
  a: number;
}

export function getQuadraticBezierPoints(
  p0: Point,
  p1: Point,
  p2: Point,
  customSteps?: number
): Point[] {
  const points: Point[] = [];
  const seen = new Set<string>();

  const approxDist =
    Math.hypot(p1.x - p0.x, p1.y - p0.y) +
    Math.hypot(p2.x - p1.x, p2.y - p1.y);

  const steps = customSteps ?? Math.max(16, Math.ceil(approxDist * 1.5));

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const mt = 1 - t;

    const x = Math.round(mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x);
    const y = Math.round(mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y);

    const key = `${x},${y}`;
    if (!seen.has(key)) {
      seen.add(key);
      points.push({ x, y });
    }
  }

  return points;
}

/**
 * Quantized 2:1 isometric line rasterizer.
 * In dimetric pixel art, standard 2:1 isometric lines follow an angle of ~26.565° (slope 1/2 or 2/1).
 * When dragging between (x0, y0) and arbitrary cursor coordinates (x1, y1), this function
 * projects the displacement onto the canonical 2:1 dimetric vector, snapping the line to
 * clean alternating 2-pixel steps along X for every 1-pixel step along Y, terminating at the
 * projected isometric ray endpoint while maintaining straight cardinal lines when dx=0 or dy=0.
 */
export function getIsometric2p1Line(x0: number, y0: number, x1: number, y1: number): Point[] {
  const dx = x1 - x0;
  const dy = y1 - y0;

  if (dx === 0 && dy === 0) return [{ x: x0, y: y0 }];

  // Pure vertical line
  if (dx === 0) {
    const sy = dy >= 0 ? 1 : -1;
    const count = Math.abs(dy);
    const pts: Point[] = [];
    for (let k = 0; k <= count; k++) {
      pts.push({ x: x0, y: y0 + k * sy });
    }
    return pts;
  }

  // Pure horizontal line
  if (dy === 0) {
    const sx = dx >= 0 ? 1 : -1;
    const count = Math.abs(dx);
    const pts: Point[] = [];
    for (let k = 0; k <= count; k++) {
      pts.push({ x: x0 + k * sx, y: y0 });
    }
    return pts;
  }

  const sx = dx >= 0 ? 1 : -1;
  const sy = dy >= 0 ? 1 : -1;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  // Scalar projection of (|dx|, |dy|) onto the 2:1 dimetric direction vector (2, 1):
  // t = (2 * absDx + absDy) / (2^2 + 1^2) = (2 * absDx + absDy) / 5
  const numSteps = Math.max(1, Math.round((2 * absDx + absDy) / 5));

  const points: Point[] = [];
  const seen = new Set<string>();

  for (let k = 0; k < numSteps; k++) {
    const curY = y0 + k * sy;
    const curX1 = x0 + (k * 2) * sx;
    const curX2 = x0 + (k * 2 + 1) * sx;

    const key1 = `${curX1},${curY}`;
    if (!seen.has(key1)) {
      seen.add(key1);
      points.push({ x: curX1, y: curY });
    }

    const key2 = `${curX2},${curY}`;
    if (!seen.has(key2)) {
      seen.add(key2);
      points.push({ x: curX2, y: curY });
    }
  }

  // Snapped endpoint cap on the projected 2:1 ray
  const finalX = x0 + (numSteps * 2) * sx;
  const finalY = y0 + numSteps * sy;
  const finalKey = `${finalX},${finalY}`;
  if (!seen.has(finalKey)) {
    seen.add(finalKey);
    points.push({ x: finalX, y: finalY });
  }

  return points;
}

export function calculate47TileBitmask(
  isMatchingNeighbor: (nx: number, ny: number) => boolean,
  x: number,
  y: number
): number {
  const N = isMatchingNeighbor(x, y - 1) ? 1 : 0;
  const E = isMatchingNeighbor(x + 1, y) ? 1 : 0;
  const S = isMatchingNeighbor(x, y + 1) ? 1 : 0;
  const W = isMatchingNeighbor(x - 1, y) ? 1 : 0;

  const NE = N && E && isMatchingNeighbor(x + 1, y - 1) ? 1 : 0;
  const SE = S && E && isMatchingNeighbor(x + 1, y + 1) ? 1 : 0;
  const SW = S && W && isMatchingNeighbor(x - 1, y + 1) ? 1 : 0;
  const NW = N && W && isMatchingNeighbor(x - 1, y - 1) ? 1 : 0;

  return (
    N * 1 +
    NE * 2 +
    E * 4 +
    SE * 8 +
    S * 16 +
    SW * 32 +
    W * 64 +
    NW * 128
  );
}
