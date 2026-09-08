/**
 * Pure selection mask operations (Union, Subtract, Replace, Box Mask extraction).
 */

export interface SelectionMergeResult {
  box: { x: number; y: number; w: number; h: number } | null;
  mask: Uint8Array | null;
}

export function mergeSelectionMask(
  baseMask: Uint8Array | null,
  incomingMask: Uint8Array,
  mode: 'replace' | 'union' | 'subtract',
  canvasWidth: number,
  canvasHeight: number
): SelectionMergeResult {
  const total = canvasWidth * canvasHeight;
  const resultMask = new Uint8Array(total);
  const effectiveBase = mode !== 'replace' && baseMask ? baseMask : null;

  let minX = canvasWidth;
  let minY = canvasHeight;
  let maxX = -1;
  let maxY = -1;
  let count = 0;

  for (let i = 0; i < total; i++) {
    const baseVal = effectiveBase ? effectiveBase[i] : 0;
    const incVal = incomingMask[i];
    let finalVal = 0;

    if (mode === 'union') {
      finalVal = baseVal === 1 || incVal === 1 ? 1 : 0;
    } else if (mode === 'subtract') {
      finalVal = baseVal === 1 && incVal === 0 ? 1 : 0;
    } else {
      finalVal = incVal;
    }

    resultMask[i] = finalVal;
    if (finalVal === 1) {
      count++;
      const px = i % canvasWidth;
      const py = Math.floor(i / canvasWidth);
      if (px < minX) minX = px;
      if (px > maxX) maxX = px;
      if (py < minY) minY = py;
      if (py > maxY) maxY = py;
    }
  }

  if (count > 0 && maxX >= minX && maxY >= minY) {
    return {
      box: { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 },
      mask: resultMask,
    };
  }
  return { box: null, mask: null };
}

export function createBoxMask(
  box: { x: number; y: number; w: number; h: number },
  width: number,
  height: number
): Uint8Array {
  const mask = new Uint8Array(width * height);
  const endX = Math.min(width, box.x + box.w);
  const endY = Math.min(height, box.y + box.h);
  for (let y = Math.max(0, box.y); y < endY; y++) {
    for (let x = Math.max(0, box.x); x < endX; x++) {
      mask[y * width + x] = 1;
    }
  }
  return mask;
}

export interface BoundarySegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/**
 * Extracts orthogonal contour boundary segments where selectionMask === 1
 * neighbors an unselected pixel (0) or the canvas boundary.
 */
export function extractSelectionBoundarySegments(
  mask: Uint8Array,
  width: number,
  height: number
): BoundarySegment[] {
  const segments: BoundarySegment[] = [];

  const isSelected = (x: number, y: number): boolean => {
    if (x < 0 || x >= width || y < 0 || y >= height) return false;
    return mask[y * width + x] === 1;
  };

  // 1. Horizontal Edges (Top & Bottom of selected pixels)
  // For each horizontal line y from 0 to height:
  for (let y = 0; y <= height; y++) {
    let startX: number | null = null;
    let inEdge = false;

    for (let x = 0; x < width; x++) {
      const above = isSelected(x, y - 1);
      const below = isSelected(x, y);
      const hasEdge = above !== below;

      if (hasEdge) {
        if (!inEdge) {
          inEdge = true;
          startX = x;
        }
      } else {
        if (inEdge && startX !== null) {
          segments.push({ x1: startX, y1: y, x2: x, y2: y });
          inEdge = false;
          startX = null;
        }
      }
    }

    if (inEdge && startX !== null) {
      segments.push({ x1: startX, y1: y, x2: width, y2: y });
    }
  }

  // 2. Vertical Edges (Left & Right of selected pixels)
  // For each vertical line x from 0 to width:
  for (let x = 0; x <= width; x++) {
    let startY: number | null = null;
    let inEdge = false;

    for (let y = 0; y < height; y++) {
      const left = isSelected(x - 1, y);
      const right = isSelected(x, y);
      const hasEdge = left !== right;

      if (hasEdge) {
        if (!inEdge) {
          inEdge = true;
          startY = y;
        }
      } else {
        if (inEdge && startY !== null) {
          segments.push({ x1: x, y1: startY, x2: x, y2: y });
          inEdge = false;
          startY = null;
        }
      }
    }

    if (inEdge && startY !== null) {
      segments.push({ x1: x, y1: startY, x2: x, y2: height });
    }
  }

  return segments;
}

/**
 * Converts boundary segments into an SVG path definition ("M x1 y1 L x2 y2 ...").
 */
export function boundarySegmentsToSvgPath(
  segments: BoundarySegment[],
  scale: number = 1
): string {
  if (segments.length === 0) return '';
  return segments
    .map(
      (s) =>
        `M ${(s.x1 * scale).toFixed(2)} ${(s.y1 * scale).toFixed(2)} L ${(s.x2 * scale).toFixed(2)} ${(s.y2 * scale).toFixed(2)}`
    )
    .join(' ');
}

