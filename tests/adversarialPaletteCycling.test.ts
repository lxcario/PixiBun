/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
import {
  retuneTracksForSeamlessLoop,
  updateLivePaletteLUT32,
  unpackRgb32,
  PaletteCycleTrack,
} from '@/lib/color/paletteCycling';

describe('Adversarial Mathematical Testing: Palette Cycling Loop Closure & Drift', () => {
  describe('Extreme Cycle Sizes', () => {
    it('handles minimal 2-color cycle (S = 2) in forward, reverse, and ping-pong modes', () => {
      const palette = ['#102030', '#a0b0c0'];
      const directions: ('forward' | 'reverse' | 'ping-pong')[] = ['forward', 'reverse', 'ping-pong'];

      for (const dir of directions) {
        const track: PaletteCycleTrack = {
          id: `min-s2-${dir}`,
          low: 0,
          high: 1,
          rate: 5.0,
          direction: dir,
          blendShift: false,
          enabled: true,
        };

        const targetDuration = 2.0;
        const [retuned] = retuneTracksForSeamlessLoop([track], targetDuration);

        const lut0 = new Uint32Array(2);
        const lutT = new Uint32Array(2);
        updateLivePaletteLUT32(palette, [retuned], 0.0, lut0);
        updateLivePaletteLUT32(palette, [retuned], targetDuration, lutT);

        expect(Array.from(lutT).map(unpackRgb32)).toEqual(Array.from(lut0).map(unpackRgb32));
      }
    });

    it('handles maximum 256-color cycle (S = 256) across multiple loop periods', () => {
      const palette = Array.from({ length: 256 }, (_, i) => `#${i.toString(16).padStart(2, '0').repeat(3)}`);
      const track: PaletteCycleTrack = {
        id: 'max-s256',
        low: 0,
        high: 255,
        rate: 60.0,
        direction: 'forward',
        blendShift: false,
        enabled: true,
      };

      const targetDuration = 4.0;
      const [retuned] = retuneTracksForSeamlessLoop([track], targetDuration);

      const lut0 = new Uint32Array(256);
      const lutT = new Uint32Array(256);
      const lut2T = new Uint32Array(256);
      updateLivePaletteLUT32(palette, [retuned], 0.0, lut0);
      updateLivePaletteLUT32(palette, [retuned], targetDuration, lutT);
      updateLivePaletteLUT32(palette, [retuned], 2 * targetDuration, lut2T);

      expect(Array.from(lutT).map(unpackRgb32)).toEqual(Array.from(lut0).map(unpackRgb32));
      expect(Array.from(lut2T).map(unpackRgb32)).toEqual(Array.from(lut0).map(unpackRgb32));
    });

    it('handles degenerate track boundaries (high <= low) safely without throwing or mutating rate', () => {
      const palette = ['#000000', '#ffffff'];
      const track: PaletteCycleTrack = {
        id: 'degenerate',
        low: 1,
        high: 1, // S = 1 (degenerate)
        rate: 10.0,
        direction: 'forward',
        blendShift: false,
        enabled: true,
      };

      const [retuned] = retuneTracksForSeamlessLoop([track], 3.0);
      expect(retuned.rate).toBe(10.0);

      const lut = new Uint32Array(2);
      expect(() => updateLivePaletteLUT32(palette, [retuned], 1.5, lut)).not.toThrow();
    });
  });

  describe('Boundary Transitions & Sub-Step Timing', () => {
    it('evaluates palette state consistently around loop boundary t = T', () => {
      const palette = ['#111111', '#222222', '#333333'];
      const track: PaletteCycleTrack = {
        id: 'boundary-test',
        low: 0,
        high: 2,
        rate: 3.0,
        direction: 'forward',
        blendShift: false,
        enabled: true,
      };

      const T = 2.0;
      const [retuned] = retuneTracksForSeamlessLoop([track], T);

      const lut0 = new Uint32Array(3);
      const lutT = new Uint32Array(3);
      updateLivePaletteLUT32(palette, [retuned], 0.0, lut0);
      updateLivePaletteLUT32(palette, [retuned], T, lutT);

      expect(Array.from(lutT).map(unpackRgb32)).toEqual(Array.from(lut0).map(unpackRgb32));
    });
  });

  describe('Large Time Scales (t = 1000*T)', () => {
    it('maintains loop closure at t = 1000*T across various cycle periods', () => {
      const testCases = [
        { T: 0.7, rate: 10.0, S: 5, dir: 'forward' as const },
        { T: 1.0, rate: 15.0, S: 8, dir: 'reverse' as const },
        { T: 3.0, rate: 12.0, S: 4, dir: 'ping-pong' as const },
        { T: 7.0, rate: 1.4, S: 5, dir: 'forward' as const },
      ];

      for (const tc of testCases) {
        const palette = Array.from({ length: tc.S }, (_, i) => `#${(i * 30).toString(16).padStart(2, '0').repeat(3)}`);
        const track: PaletteCycleTrack = {
          id: `t1000-${tc.T}`,
          low: 0,
          high: tc.S - 1,
          rate: tc.rate,
          direction: tc.dir,
          blendShift: false,
          enabled: true,
        };

        const [retuned] = retuneTracksForSeamlessLoop([track], tc.T);
        const lut0 = new Uint32Array(tc.S);
        const lut1000T = new Uint32Array(tc.S);

        updateLivePaletteLUT32(palette, [retuned], 0.0, lut0);
        updateLivePaletteLUT32(palette, [retuned], 1000 * tc.T, lut1000T);

        expect(Array.from(lut1000T).map(unpackRgb32)).toEqual(Array.from(lut0).map(unpackRgb32));
      }
    });
  });

  describe('Scale-Aware IEEE 754 Precision at Extended Horizons (t = 10000*T and t = 100000*T)', () => {
    it('maintains exact loop closure at t = 10000*T and t = 100000*T without phase drift', () => {
      // Configuration where floating point ULP exceeds 1e-10 at large t
      const T = 1.3;
      const S = 5;
      const rate0 = 60.0;
      const palette = ['#111111', '#222222', '#333333', '#444444', '#555555'];
      const track: PaletteCycleTrack = {
        id: 'drift-10000',
        low: 0,
        high: S - 1,
        rate: rate0,
        direction: 'forward',
        blendShift: false,
        enabled: true,
      };

      const [retuned] = retuneTracksForSeamlessLoop([track], T);

      const k = 10000;
      const t = k * T;
      const phaseFloat = t * retuned.rate;
      const nearestPhaseInt = Math.round(phaseFloat);
      const floatDiff = Math.abs(phaseFloat - nearestPhaseInt);

      // Verify that the floating-point difference exceeds 1e-10 due to float64 ULP magnitude
      // phaseFloat is ~800,000, where 1 ULP is 2^-33 ≈ 1.164e-10 > 1e-10
      expect(floatDiff).toBeGreaterThan(1e-10);

      const lut0 = new Uint32Array(S);
      const lut10000T = new Uint32Array(S);
      const lut100000T = new Uint32Array(S);
      updateLivePaletteLUT32(palette, [retuned], 0.0, lut0);
      updateLivePaletteLUT32(palette, [retuned], t, lut10000T);
      updateLivePaletteLUT32(palette, [retuned], 100000 * T, lut100000T);

      const colors0 = Array.from(lut0).map(unpackRgb32);
      const colors10000T = Array.from(lut10000T).map(unpackRgb32);
      const colors100000T = Array.from(lut100000T).map(unpackRgb32);

      // Exact loop closure holds at both k = 10,000 and k = 100,000 with scale-aware IEEE 754 epsilon
      expect(colors10000T).toEqual(colors0);
      expect(colors100000T).toEqual(colors0);

      // Also verify ping-pong mode at k = 100,000
      const pingTrack: PaletteCycleTrack = {
        id: 'ping-100000',
        low: 0,
        high: S - 1,
        rate: rate0,
        direction: 'ping-pong',
        blendShift: false,
        enabled: true,
      };
      const [retunedPing] = retuneTracksForSeamlessLoop([pingTrack], T);
      const lutPing0 = new Uint32Array(S);
      const lutPing100000T = new Uint32Array(S);
      updateLivePaletteLUT32(palette, [retunedPing], 0.0, lutPing0);
      updateLivePaletteLUT32(palette, [retunedPing], 100000 * T, lutPing100000T);
      expect(Array.from(lutPing100000T).map(unpackRgb32)).toEqual(Array.from(lutPing0).map(unpackRgb32));
    });
  });
});
