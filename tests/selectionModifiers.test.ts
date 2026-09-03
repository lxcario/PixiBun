import { describe, it, expect } from 'vitest';

/**
 * Pure selection modifier logic mirroring CenterViewport.tsx
 */
function mergeSelectionMask(
  baseMask: Uint8Array | null,
  incomingMask: Uint8Array,
  mode: 'replace' | 'union' | 'subtract',
  canvasWidth: number,
  canvasHeight: number
): { box: { x: number; y: number; w: number; h: number } | null; mask: Uint8Array | null } {
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

function createBoxMask(
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

describe('Selection Modifiers: Union, Subtract, and Bounding Box Extraction', () => {
  const W = 16;
  const H = 16;

  it('performs Replace mode correctly without prior base mask', () => {
    const incoming = createBoxMask({ x: 2, y: 2, w: 4, h: 4 }, W, H);
    const { box, mask } = mergeSelectionMask(null, incoming, 'replace', W, H);

    expect(box).toEqual({ x: 2, y: 2, w: 4, h: 4 });
    expect(mask).not.toBeNull();
    let count = 0;
    mask?.forEach((v) => { if (v === 1) count++; });
    expect(count).toBe(16);
  });

  it('performs Union mode on two disjoint regions and expands bounding box', () => {
    const box1 = createBoxMask({ x: 0, y: 0, w: 2, h: 2 }, W, H);
    const box2 = createBoxMask({ x: 4, y: 4, w: 2, h: 2 }, W, H);

    const { box, mask } = mergeSelectionMask(box1, box2, 'union', W, H);

    expect(box).toEqual({ x: 0, y: 0, w: 6, h: 6 });
    expect(mask).not.toBeNull();
    let count = 0;
    mask?.forEach((v) => { if (v === 1) count++; });
    expect(count).toBe(8); // 4 + 4 pixels
  });

  it('performs Subtract mode to punch a hole or carve out a sub-region', () => {
    // 8x8 base square (64 pixels)
    const base = createBoxMask({ x: 0, y: 0, w: 8, h: 8 }, W, H);
    // 4x4 corner to subtract (16 pixels)
    const sub = createBoxMask({ x: 0, y: 0, w: 4, h: 4 }, W, H);

    const { box, mask } = mergeSelectionMask(base, sub, 'subtract', W, H);

    expect(box).toEqual({ x: 0, y: 0, w: 8, h: 8 });
    expect(mask).not.toBeNull();
    let count = 0;
    mask?.forEach((v) => { if (v === 1) count++; });
    expect(count).toBe(48); // 64 - 16 = 48
    expect(mask?.[0]).toBe(0); // carved out
    expect(mask?.[7 * W + 7]).toBe(1); // retained
  });

  it('returns null box and null mask when subtraction eliminates entire selection', () => {
    const base = createBoxMask({ x: 2, y: 2, w: 3, h: 3 }, W, H);
    const sub = createBoxMask({ x: 0, y: 0, w: 10, h: 10 }, W, H);

    const { box, mask } = mergeSelectionMask(base, sub, 'subtract', W, H);

    expect(box).toBeNull();
    expect(mask).toBeNull();
  });
});
