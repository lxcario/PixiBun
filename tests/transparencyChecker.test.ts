import { describe, expect, it } from 'vitest';
import { checkerSquarePx, checkerStyle } from '@/lib/render/transparencyChecker';

describe('transparency checkerboard', () => {
  it('keeps each square on whole art pixels and at least 8 screen pixels wide', () => {
    expect(checkerSquarePx(1600)).toBe(16); // one art pixel per square
    expect(checkerSquarePx(800)).toBe(8);
    expect(checkerSquarePx(400)).toBe(8); // two art pixels
    expect(checkerSquarePx(100)).toBe(8); // eight art pixels
    expect(checkerSquarePx(50)).toBe(8);
    expect(checkerSquarePx(6400)).toBe(64);
    for (const zoom of [10, 33, 150, 275, 900]) {
      const square = checkerSquarePx(zoom);
      const artPixels = square / (zoom / 100);
      expect(square).toBeGreaterThanOrEqual(8);
      expect(Math.log2(artPixels) % 1).toBeCloseTo(0, 9);
    }
  });

  it('tiles two squares per background cell', () => {
    expect(checkerStyle(1600).backgroundSize).toBe('32px 32px');
    expect(checkerStyle(1600).backgroundImage).toContain('repeating-conic-gradient');
  });
});
