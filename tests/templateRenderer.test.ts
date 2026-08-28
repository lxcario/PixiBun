import { describe, it, expect, vi } from 'vitest';
import { paintTemplate } from '@/lib/render/templateRenderer';
import { StarterTemplate } from '@/types/landing';

interface FillCall {
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
}

function makeFakeCanvas(width: number, height: number) {
  const calls: FillCall[] = [];
  let currentFill = '';
  const ctx = {
    imageSmoothingEnabled: true,
    clearRect: vi.fn(),
    fillRect: (x: number, y: number, w: number, h: number) => {
      calls.push({ x, y, w, h, fill: currentFill });
    },
  };
  Object.defineProperty(ctx, 'fillStyle', {
    set(v: string) {
      currentFill = v;
    },
    get() {
      return currentFill;
    },
  });
  const canvas = {
    width,
    height,
    getContext: () => ctx,
  } as unknown as HTMLCanvasElement;
  return { canvas, calls, ctx };
}

const TINY: StarterTemplate = {
  id: 'mushroom',
  name: 'Tiny',
  blurb: '',
  width: 2,
  height: 2,
  rows: ['.A', 'o.'],
};

describe('paintTemplate', () => {
  it('skips transparent cells and fills the rest with exact rects', () => {
    const { canvas, calls } = makeFakeCanvas(32, 32);
    paintTemplate(canvas, TINY);

    expect(calls).toHaveLength(2);
    expect(calls[0]).toEqual({ x: 16, y: 0, w: 16, h: 16, fill: '#f0be7c' });
    expect(calls[1]).toEqual({ x: 0, y: 16, w: 16, h: 16, fill: '#3a2e4c' });
  });

  it('clears the canvas first and disables smoothing', () => {
    const { canvas, ctx } = makeFakeCanvas(64, 64);
    paintTemplate(canvas, TINY);

    expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 64, 64);
    expect(ctx.imageSmoothingEnabled).toBe(false);
  });

  it('handles a missing 2d context without throwing', () => {
    const canvas = {
      width: 16,
      height: 16,
      getContext: () => null,
    } as unknown as HTMLCanvasElement;
    expect(() => paintTemplate(canvas, TINY)).not.toThrow();
  });
});