import { describe, expect, it } from 'vitest';
import { replaceLayerColor } from '@/lib/canvas/floodFill';
import { makeCanvas } from './helpers/mockCanvas';

describe('replaceLayerColor', () => {
  it('replaces all exact matches across a layer and preserves pixel alpha', () => {
    const ctx = makeCanvas(4, 1).getContext('2d')!;
    ctx.fillStyle = '#8060a0';
    ctx.fillRect(0, 0, 1, 1);
    ctx.fillRect(2, 0, 1, 1);
    ctx.fillStyle = '#8262a2';
    ctx.fillRect(1, 0, 1, 1);
    const pixels = ctx.getImageData(0, 0, 4, 1);
    pixels.data[3] = 128;

    expect(replaceLayerColor(pixels, 0, 0, '#ff00aa')).toBe(2);
    expect(Array.from(pixels.data.slice(0, 4))).toEqual([255, 0, 170, 128]);
    expect(Array.from(pixels.data.slice(4, 8))).toEqual([130, 98, 162, 255]);
    expect(Array.from(pixels.data.slice(8, 12))).toEqual([255, 0, 170, 255]);
    expect(pixels.data[15]).toBe(0);
  });

  it('includes nearby shades at the chosen tolerance without changing distant shades', () => {
    const ctx = makeCanvas(3, 1).getContext('2d')!;
    for (const [x, color] of ['#8060a0', '#8866a5', '#28203c'].entries()) {
      ctx.fillStyle = color;
      ctx.fillRect(x, 0, 1, 1);
    }
    const pixels = ctx.getImageData(0, 0, 3, 1);

    expect(replaceLayerColor(pixels, 0, 0, '#ff00aa', 12)).toBe(2);
    expect(Array.from(pixels.data.slice(0, 12))).toEqual([
      255, 0, 170, 255, 255, 0, 170, 255, 40, 32, 60, 255,
    ]);
  });

  it('does nothing for transparent source pixels and no-op replacements', () => {
    const ctx = makeCanvas(2, 1).getContext('2d')!;
    ctx.fillStyle = '#8060a0';
    ctx.fillRect(1, 0, 1, 1);
    const pixels = ctx.getImageData(0, 0, 2, 1);
    expect(replaceLayerColor(pixels, 0, 0, '#ff00aa', 255)).toBe(0);
    expect(replaceLayerColor(pixels, 1, 0, '#8060a0')).toBe(0);
  });
});
