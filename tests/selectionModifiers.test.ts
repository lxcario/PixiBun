import { describe, it, expect } from 'vitest';
import { mergeSelectionMask, createBoxMask } from '@/lib/canvas/selectionUtils';

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
