import { describe, expect, it } from 'vitest';
import { thumbOffset } from '@/experimental/liquidControls/LiquidSliders';

describe('liquid slider thumb offset', () => {
  it('maps the value across the track minus the thumb', () => {
    expect(thumbOffset(0, 0, 100, 124)).toBe(0);
    expect(thumbOffset(50, 0, 100, 124)).toBe(50);
    expect(thumbOffset(100, 0, 100, 124)).toBe(100);
    expect(thumbOffset(16.5, 1, 32, 86)).toBeCloseTo(31, 5);
  });

  it('clamps out-of-range values and tolerates degenerate tracks', () => {
    expect(thumbOffset(-5, 0, 10, 124)).toBe(0);
    expect(thumbOffset(15, 0, 10, 124)).toBe(100);
    expect(thumbOffset(3, 3, 3, 124)).toBe(0);
    expect(thumbOffset(5, 0, 10, 10)).toBe(0);
  });
});
