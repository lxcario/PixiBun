import { describe, expect, it } from 'vitest';
import { fillRectMasked, keepOutsideMask, resolveSelectionMask } from '@/lib/canvas/selectionMask';
import { replaceLayerColor } from '@/lib/canvas/floodFill';

describe('selection masks', () => {
  it('turns a marquee into a mask clipped to the canvas, and prefers an explicit mask', () => {
    const mask = resolveSelectionMask({ x: 2, y: 1, w: 3, h: 2 }, null, 6, 4)!;
    expect(Array.from(mask)).toEqual([
      0, 0, 0, 0, 0, 0,
      0, 0, 1, 1, 1, 0,
      0, 0, 1, 1, 1, 0,
      0, 0, 0, 0, 0, 0,
    ]);
    expect(Array.from(resolveSelectionMask({ x: -3, y: 2, w: 5, h: 9 }, null, 4, 4)!)).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0]);
    const lasso = new Uint8Array(24).fill(1);
    expect(resolveSelectionMask({ x: 0, y: 0, w: 1, h: 1 }, lasso, 6, 4)).toBe(lasso);
    expect(resolveSelectionMask(null, null, 6, 4)).toBeNull();
  });

  it('stamps only the selected runs of a brush footprint', () => {
    const calls: number[][] = [];
    const ctx = { fillRect: (...args: number[]) => calls.push(args) } as unknown as CanvasRenderingContext2D;
    const mask = new Uint8Array([
      1, 1, 0, 1,
      0, 1, 1, 1,
    ]);
    fillRectMasked(ctx, -1, 0, 6, 2, mask, 4, 2);
    expect(calls).toEqual([[0, 0, 2, 1], [3, 0, 1, 1], [1, 1, 3, 1]]);
    calls.length = 0;
    fillRectMasked(ctx, 1, 1, 2, 2, null, 4, 2);
    expect(calls).toEqual([[1, 1, 2, 2]]);
  });

  it('keeps original pixels outside the mask after a whole-image edit', () => {
    const original = new Uint8ClampedArray([1, 1, 1, 1, 2, 2, 2, 2]);
    const edited = new Uint8ClampedArray([9, 9, 9, 9, 9, 9, 9, 9]);
    keepOutsideMask(original, edited, new Uint8Array([0, 1]));
    expect(Array.from(edited)).toEqual([1, 1, 1, 1, 9, 9, 9, 9]);
  });

  it('limits Color Replace to the selection and ignores samples outside it', () => {
    const image = { width: 2, height: 1, data: new Uint8ClampedArray([10, 10, 10, 255, 10, 10, 10, 255]) } as ImageData;
    expect(replaceLayerColor(image, 0, 0, '#ff0000', 0, new Uint8Array([0, 1]))).toBe(0);
    expect(replaceLayerColor(image, 1, 0, '#ff0000', 0, new Uint8Array([0, 1]))).toBe(1);
    expect(Array.from(image.data)).toEqual([10, 10, 10, 255, 255, 0, 0, 255]);
  });
});
