import { describe, expect, it } from 'vitest';
import { countClippedMotionPixels, copyPlacedMotionRaster, renderPlacedMotionRaster, stampPlacedMotionRaster } from '@/lib/animation/motionRaster';
import { interpolatePose } from '@/lib/animation/pixiMotion';
import { rotSprite, rotSpriteV1, rotSpriteV2 } from '@/lib/canvas/rotSprite';
import { STARTER_TEMPLATES, TEMPLATE_PALETTE } from '@/lib/art/starterTemplates';

function source() {
  const ghost = STARTER_TEMPLATES.find(t => t.id === 'hearth-ghost')!, data = new Uint8ClampedArray(16 * 16 * 4);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const hex = TEMPLATE_PALETTE[ghost.rows[y][x]];
    if (hex) { const rgb = parseInt(hex.slice(1), 16); data.set([rgb >> 16, (rgb >> 8) & 255, rgb & 255, 255], (y * 16 + x) * 4); }
  }
  data.set([59, 70, 129, 85], (9 * 16 + 7) * 4);
  return { width: 16, height: 16, data };
}
const zero = { translationX: 0, translationY: 0, rotation: 0 };
describe('motion raster placement and compatibility', () => {
  it('reports actual clipped alpha samples without treating empty rotated bounds as missing artwork', () => {
    const data = new Uint8ClampedArray(3 * 3 * 4); data[3] = 1; data[(1 * 3 + 1) * 4 + 3] = 255;
    expect(countClippedMotionPixels({ width: 3, height: 3, data, destX: -1, destY: -1 }, 2, 2)).toBe(1);
    expect(countClippedMotionPixels({ width: 3, height: 3, data, destX: 0, destY: 0 }, 2, 2)).toBe(0);
    expect(countClippedMotionPixels({ width: 3, height: 3, data, destX: 5, destY: 5 }, 2, 2)).toBe(2);
    expect(data.filter(value => value > 0)).toEqual(new Uint8ClampedArray([1, 255]));
  });
  it.each([0, 37, 90, 180, 270, 359.99])('retains full-canvas interior bytes at %s degrees for fractional pivots and sampling phases', degrees => {
    const src = source(), original = src.data.slice(), bounds = { x: 24, y: 24, w: 16, h: 16 };
    for (const pivot of [{ x: 32, y: 32 }, { x: 27.3, y: 31.7 }, { x: 32.5, y: 32.5 }]) {
      for (const shift of [0, 3, -1.5, .3]) {
        const pose = { translationX: shift, translationY: -shift, rotation: degrees * Math.PI / 180 };
        const sprite = renderPlacedMotionRaster(src, bounds, pivot, pose);
        const actual = { width: 64, height: 64, data: new Uint8ClampedArray(64 * 64 * 4) };
        copyPlacedMotionRaster(actual, sprite);
        const expected = rotSprite(src, pose.rotation, pivot.x - bounds.x, pivot.y - bounds.y,
          64, 64, pivot.x + shift, pivot.y - shift, true);
        expect(actual.data, `${degrees} degrees; shift ${shift}; pivot ${pivot.x},${pivot.y}`).toEqual(expected.data);
      }
    }
    expect(src.data).toEqual(original);
  });
  it('clips all four edges and off-canvas parts without wrapping or altering distant pixels', () => {
    const data = new Uint8ClampedArray(3 * 3 * 4).fill(255);
    for (const [destX, destY] of [[-2, -2], [4, -2], [-2, 4], [4, 4], [-20, 0], [20, 20]]) {
      const target = { width: 5, height: 5, data: new Uint8ClampedArray(5 * 5 * 4) };
      stampPlacedMotionRaster(target, { width: 3, height: 3, data, destX, destY });
      const expected = new Uint8ClampedArray(target.data.length);
      for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) if (x >= destX && x < destX + 3 && y >= destY && y < destY + 3) expected.fill(255, (y * 5 + x) * 4, (y * 5 + x + 1) * 4);
      expect(target.data).toEqual(expected);
    }
  });
  it('preserves straight-alpha over and fractional source alpha', () => {
    const target = { width: 3, height: 1, data: new Uint8ClampedArray([20, 40, 60, 128, 9, 8, 7, 255, 0, 0, 0, 0]) };
    stampPlacedMotionRaster(target, { width: 1, height: 1, data: new Uint8ClampedArray([200, 100, 40, 128]), destX: 0, destY: 0 });
    expect(Array.from(target.data)).toEqual([140, 80, 47, 192, 9, 8, 7, 255, 0, 0, 0, 0]);
  });
  it('normalizes negative zero while retaining negative half-pixel rounding', () => {
    expect(Object.is(interpolatePose(zero, { ...zero, translationX: -1 }, .3, 'linear').translationX, 0)).toBe(true);
    expect(interpolatePose(zero, { ...zero, translationX: -3 }, .5, 'linear').translationX).toBe(-1);
    expect(interpolatePose(zero, { ...zero, translationX: 3 }, .5, 'linear').translationX).toBe(2);
  });
  it.each([rotSprite, rotSpriteV1, rotSpriteV2])('wraps tiny negative angles into the identity fast path', renderer => {
    const src = source();
    const expected = renderer(src, 0, 8, 8, 64, 64, 32, 32, true);
    expect(renderer(src, -1e-6, 8, 8, 64, 64, 32, 32, true).data).toEqual(expected.data);
  });
});
