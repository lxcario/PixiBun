import { describe, expect, it } from 'vitest';
import { calculateFitZoom, getNextZoomStep, getPrevZoomStep } from '@/config/zoom';

describe('viewport zoom ladder', () => {
  it('fits large canvases below actual size using the available viewport', () => {
    expect(calculateFitZoom(2048, 2048, 512, 400)).toBe(17);
    expect(calculateFitZoom(32, 32, 512, 400)).toBe(1000);
  });

  it('keeps toolbar steps available below 100%', () => {
    expect(getPrevZoomStep(100)).toBe(75);
    expect(getNextZoomStep(75)).toBe(100);
  });
});
