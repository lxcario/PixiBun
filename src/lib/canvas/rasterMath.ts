// Mathematical raster algorithms for integer pixel art manipulation

export interface Point {
  x: number;
  y: number;
}

// Bresenham's line algorithm: yields all integer points between (x0, y0) and (x1, y1)
export function getBresenhamLine(x0: number, y0: number, x1: number, y1: number): Point[] {
  const points: Point[] = [];
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  let currX = x0;
  let currY = y0;

  while (true) {
    points.push({ x: currX, y: currY });
    if (currX === x1 && currY === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      currX += sx;
    }
    if (e2 < dx) {
      err += dx;
      currY += sy;
    }
  }

  return points;
}

// Pixel-perfect line filter: cleans L-shaped double pixels (jaggies)
export function filterPixelPerfect(points: Point[]): Point[] {
  if (points.length < 3) return points;

  const result: Point[] = [points[0]];

  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];

    // Check if the current point forms an unwanted L-corner with identical step directions
    const sameRowOrColAsPrev = prev.x === curr.x || prev.y === curr.y;
    const sameRowOrColAsNext = curr.x === next.x || curr.y === next.y;

    if (sameRowOrColAsPrev && sameRowOrColAsNext && prev.x !== next.x && prev.y !== next.y) {
      // Skip this corner point to maintain a single-pixel line width
      continue;
    }

    result.push(curr);
  }

  result.push(points[points.length - 1]);
  return result;
}

// Midpoint Ellipse Algorithm
export function getEllipsePoints(x0: number, y0: number, x1: number, y1: number, filled: boolean): Point[] {
  const points: Point[] = [];
  const rx = Math.abs(Math.floor((x1 - x0) / 2));
  const ry = Math.abs(Math.floor((y1 - y0) / 2));
  const xc = Math.min(x0, x1) + rx;
  const yc = Math.min(y0, y1) + ry;

  if (rx === 0 || ry === 0) {
    return getBresenhamLine(x0, y0, x1, y1);
  }

  if (filled) {
    for (let y = -ry; y <= ry; y++) {
      for (let x = -rx; x <= rx; x++) {
        if ((x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1) {
          points.push({ x: xc + x, y: yc + y });
        }
      }
    }
    return points;
  }

  // Outline ellipse
  let x = 0;
  let y = ry;
  let d1 = ry * ry - rx * rx * ry + 0.25 * rx * rx;
  let dx = 2 * ry * ry * x;
  let dy = 2 * rx * rx * y;

  while (dx < dy) {
    points.push({ x: xc + x, y: yc + y });
    points.push({ x: xc - x, y: yc + y });
    points.push({ x: xc + x, y: yc - y });
    points.push({ x: xc - x, y: yc - y });

    if (d1 < 0) {
      x++;
      dx += 2 * ry * ry;
      d1 += dx + ry * ry;
    } else {
      x++;
      y--;
      dx += 2 * ry * ry;
      dy -= 2 * rx * rx;
      d1 += dx - dy + ry * ry;
    }
  }

  let d2 = ry * ry * ((x + 0.5) * (x + 0.5)) + rx * rx * ((y - 1) * (y - 1)) - rx * rx * ry * ry;
  while (y >= 0) {
    points.push({ x: xc + x, y: yc + y });
    points.push({ x: xc - x, y: yc + y });
    points.push({ x: xc + x, y: yc - y });
    points.push({ x: xc - x, y: yc - y });

    if (d2 > 0) {
      y--;
      dy -= 2 * rx * rx;
      d2 += rx * rx - dy;
    } else {
      y--;
      x++;
      dx += 2 * ry * ry;
      dy -= 2 * rx * rx;
      d2 += dx - dy + rx * rx;
    }
  }

  return points;
}

// Rectangle Points
export function getRectanglePoints(x0: number, y0: number, x1: number, y1: number, filled: boolean): Point[] {
  const points: Point[] = [];
  const minX = Math.min(x0, x1);
  const maxX = Math.max(x0, x1);
  const minY = Math.min(y0, y1);
  const maxY = Math.max(y0, y1);

  if (filled) {
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        points.push({ x, y });
      }
    }
  } else {
    for (let x = minX; x <= maxX; x++) {
      points.push({ x, y: minY });
      points.push({ x, y: maxY });
    }
    for (let y = minY + 1; y < maxY; y++) {
      points.push({ x: minX, y });
      points.push({ x: maxX, y });
    }
  }

  return points;
}

// Apply Symmetry to points
export function applySymmetry(
  points: Point[],
  width: number,
  height: number,
  symH: boolean,
  symV: boolean
): Point[] {
  if (!symH && !symV) return points;

  const pointSet = new Set<number>();
  const result: Point[] = [];

  const addPoint = (x: number, y: number) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const key = y * width + x;
    if (!pointSet.has(key)) {
      pointSet.add(key);
      result.push({ x, y });
    }
  };

  for (const pt of points) {
    addPoint(pt.x, pt.y);

    if (symH) {
      addPoint(width - 1 - pt.x, pt.y);
    }
    if (symV) {
      addPoint(pt.x, height - 1 - pt.y);
    }
    if (symH && symV) {
      addPoint(width - 1 - pt.x, height - 1 - pt.y);
    }
  }

  return result;
}

// Re-export Bezier curve and isometric helpers
export { getQuadraticBezierPoints, getCubicBezierPoints, getIsometric2p1Line } from '@/lib/ai/smartMathEngine';

