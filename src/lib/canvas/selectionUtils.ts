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
