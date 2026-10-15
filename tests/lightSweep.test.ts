import { describe, expect, it } from 'vitest';
import { frameAt, sweepAzimuth } from '@/lib/cart/lightSweep';

describe('Light Sweep', () => {
  it('swings the lamp from the left, over the top, to the right and back', () => {
    expect(sweepAzimuth(0)).toBeCloseTo(270);
    expect(sweepAzimuth(0.25)).toBeCloseTo(0);
    expect(sweepAzimuth(0.5)).toBeCloseTo(90);
    expect(sweepAzimuth(0.75)).toBeCloseTo(0);
    expect(sweepAzimuth(0.999)).toBeGreaterThan(269);
  });

  it('keeps the drawing playing with its own holds', () => {
    expect(frameAt([100], 1234)).toBe(0);
    expect(frameAt([100, 300], 50)).toBe(0);
    expect(frameAt([100, 300], 150)).toBe(1);
    expect(frameAt([100, 300], 399)).toBe(1);
    expect(frameAt([100, 300], 400)).toBe(0);
  });
});
