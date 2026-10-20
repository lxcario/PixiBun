/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
import {
  updateLivePaletteLUT32,
  retuneTracksForSeamlessLoop,
  unpackRgb32,
  hexToRgb,
  PaletteCycleTrack,
} from '@/lib/color/paletteCycling';

describe('Adversarial Palette Cycling Synchronization Suite', () => {
  // Helper to create unique palette colors
  function makePalette(count: number): string[] {
    const pal: string[] = [];
    for (let i = 0; i < count; i++) {
      const r = (i * 37) % 256;
      const g = (i * 73) % 256;
      const b = (i * 109) % 256;
      pal.push(`#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`);
    }
    return pal;
  }

  describe('1. Multi-Track Coprime Period Lengths Synchronization', () => {
    it('synchronizes 6 pairwise coprime period lengths across mixed directions at t = n*T', () => {
      // Create non-overlapping tracks with period lengths:
      // Track 1 (forward): S = 3, M = 3
      // Track 2 (reverse): S = 5, M = 5
      // Track 3 (ping-pong): S = 4, M = 2*(4-1) = 6 -> wait, 6 is not coprime to 3!
      // Let's choose M carefully so periods are coprime:
      // M1 = 3 (forward, S = 3, [0..2])
      // M2 = 5 (reverse, S = 5, [3..7])
      // M3 = 7 (forward, S = 7, [8..14])
      // M4 = 11 (reverse, S = 11, [15..25])
      // M5 = 13 (forward, S = 13, [26..38])
      // M6 = 16 (ping-pong, S = 9, M = 2*(9-1) = 16, [39..47])
      // Note: gcd(16, 3)=1, gcd(16, 5)=1, gcd(16, 7)=1, gcd(16, 11)=1, gcd(16, 13)=1!
      // All 6 period lengths {3, 5, 7, 11, 13, 16} are pairwise coprime!
      // LCM = 3 * 5 * 7 * 11 * 13 * 16 = 2,402,400 steps without retuning!

      const palette = makePalette(64);
      const tracks: PaletteCycleTrack[] = [
        { id: 't1_fwd_3', low: 0, high: 2, rate: 12.0, direction: 'forward', blendShift: false, enabled: true },
        { id: 't2_rev_5', low: 3, high: 7, rate: 15.0, direction: 'reverse', blendShift: false, enabled: true },
        { id: 't3_fwd_7', low: 8, high: 14, rate: 20.0, direction: 'forward', blendShift: false, enabled: true },
        { id: 't4_rev_11', low: 15, high: 25, rate: 22.0, direction: 'reverse', blendShift: false, enabled: true },
        { id: 't5_fwd_13', low: 26, high: 38, rate: 18.0, direction: 'forward', blendShift: false, enabled: true },
        { id: 't6_ping_16', low: 39, high: 47, rate: 25.0, direction: 'ping-pong', blendShift: false, enabled: true },
      ];

      // Non-integer durations: 0.7s, 1.428571s, 2.333333s, 3.1415926s
      const durations = [0.7, 1.428571, 2.333333, Math.PI, 7.0];

      for (const T of durations) {
        const retuned = retuneTracksForSeamlessLoop(tracks, T);

        const lut0 = new Uint32Array(palette.length);
        updateLivePaletteLUT32(palette, retuned, 0.0, lut0);
        const expectedColors = Array.from(lut0).map(unpackRgb32);

        // Test at loop boundaries t = 1*T, 2*T, 3*T, 5*T, 10*T, 25*T, 50*T
        const loopMultipliers = [1, 2, 3, 5, 10, 25, 50];
        for (const n of loopMultipliers) {
          const lutN = new Uint32Array(palette.length);
          const t = n * T;
          updateLivePaletteLUT32(palette, retuned, t, lutN);
          const actualColors = Array.from(lutN).map(unpackRgb32);

          expect(
            actualColors,
            `Coprime multi-track mismatch at duration T=${T}, loop iteration n=${n} (t=${t})`
          ).toEqual(expectedColors);
        }
      }
    });

    it('synchronizes coprime tracks with blendShift: true (sub-step color interpolation)', () => {
      const palette = makePalette(64);
      const tracks: PaletteCycleTrack[] = [
        { id: 't1_fwd_3', low: 0, high: 2, rate: 10.0, direction: 'forward', blendShift: true, enabled: true },
        { id: 't2_rev_5', low: 3, high: 7, rate: 14.0, direction: 'reverse', blendShift: true, enabled: true },
        { id: 't3_ping_8', low: 8, high: 12, rate: 16.0, direction: 'ping-pong', blendShift: true, enabled: true }, // M = 2*(5-1) = 8
        { id: 't4_fwd_7', low: 13, high: 19, rate: 21.0, direction: 'forward', blendShift: true, enabled: true },
      ];
      // Periods: {3, 5, 8, 7} are pairwise coprime.

      const durations = [0.3, 0.7, 1.333333, 2.5, Math.PI];

      for (const T of durations) {
        const retuned = retuneTracksForSeamlessLoop(tracks, T);

        const lut0 = new Uint32Array(palette.length);
        updateLivePaletteLUT32(palette, retuned, 0.0, lut0);
        const expectedColors = Array.from(lut0).map(unpackRgb32);

        for (const n of [1, 2, 3, 7, 10]) {
          const lutN = new Uint32Array(palette.length);
          const t = n * T;
          updateLivePaletteLUT32(palette, retuned, t, lutN);
          const actualColors = Array.from(lutN).map(unpackRgb32);

          expect(
            actualColors,
            `BlendShift coprime multi-track mismatch at T=${T}, n=${n} (t=${t})`
          ).toEqual(expectedColors);
        }
      }
    });

    it('maintains multi-track coprime synchronization without desynchronization at extended horizon (k = 10,000)', () => {
      const palette = makePalette(32);
      const tracks: PaletteCycleTrack[] = [
        { id: 't1_fast', low: 0, high: 4, rate: 60.0, direction: 'forward', blendShift: false, enabled: true },
        { id: 't2_slow', low: 5, high: 11, rate: 10.0, direction: 'reverse', blendShift: false, enabled: true },
      ];
      const T = 1.3;
      const retuned = retuneTracksForSeamlessLoop(tracks, T);
      const lut0 = new Uint32Array(32);
      updateLivePaletteLUT32(palette, retuned, 0.0, lut0);
      const c0 = Array.from(lut0).map(unpackRgb32);

      // At k = 10,000 (t = 13,000s), both coprime tracks must remain synchronized with initial loop state
      const t = 10000 * T;
      const lutK = new Uint32Array(32);
      updateLivePaletteLUT32(palette, retuned, t, lutK);
      const cK = Array.from(lutK).map(unpackRgb32);

      // When unscaled 1e-10 epsilon is used, t1 phaseFloat reaches 800,000 where 1 ULP = 1.164e-10 > 1e-10,
      // causing t1 to drop phase to step 4 while t2 remains at step 0, desynchronizing the tracks.
      expect(cK.slice(0, 5), 'Fast track (t1) desynchronized at k=10,000').toEqual(c0.slice(0, 5));
      expect(cK.slice(5, 12), 'Slow track (t2) desynchronized at k=10,000').toEqual(c0.slice(5, 12));
    });
  });

  describe('2. Mixed Directional and Status Permutations', () => {
    it('maintains strict register boundaries between forward, reverse, ping-pong, and inactive tracks', () => {
      const palette = makePalette(32);
      const tracks: PaletteCycleTrack[] = [
        { id: 't_disabled', low: 0, high: 3, rate: 15.0, direction: 'forward', blendShift: false, enabled: false },
        { id: 't_zero_rate', low: 4, high: 7, rate: 0.0, direction: 'reverse', blendShift: false, enabled: true },
        { id: 't_fwd', low: 8, high: 12, rate: 5.5, direction: 'forward', blendShift: false, enabled: true },
        { id: 't_rev', low: 13, high: 17, rate: 7.2, direction: 'reverse', blendShift: false, enabled: true },
        { id: 't_ping', low: 18, high: 22, rate: 9.1, direction: 'ping-pong', blendShift: false, enabled: true },
        { id: 't_single', low: 23, high: 23, rate: 10.0, direction: 'forward', blendShift: false, enabled: true },
        { id: 't_inverted', low: 28, high: 25, rate: 10.0, direction: 'forward', blendShift: false, enabled: true },
      ];

      const T = 1.37;
      const retuned = retuneTracksForSeamlessLoop(tracks, T);

      // Verify retuning leaves disabled, zero-rate, and degenerate tracks unchanged
      expect(retuned[0].rate).toBe(15.0);
      expect(retuned[1].rate).toBe(0.0);
      expect(retuned[5].rate).toBe(10.0);
      expect(retuned[6].rate).toBe(10.0);

      const lut0 = new Uint32Array(palette.length);
      updateLivePaletteLUT32(palette, retuned, 0.0, lut0);

      // Inactive/degenerate tracks must remain static at base color
      for (let i = 0; i <= 7; i++) {
        expect(unpackRgb32(lut0[i])).toEqual(hexToRgb(palette[i]));
      }
      expect(unpackRgb32(lut0[23])).toEqual(hexToRgb(palette[23]));

      // Verify loop closure at multiples of T
      for (const n of [1, 2, 5, 20]) {
        const lutN = new Uint32Array(palette.length);
        updateLivePaletteLUT32(palette, retuned, n * T, lutN);
        expect(Array.from(lutN).map(unpackRgb32)).toEqual(Array.from(lut0).map(unpackRgb32));
      }
    });

    it('reverses direction correctly during mid-cycle progression', () => {
      // Test that reverse track actually moves in the opposite direction of forward track
      const palette = ['#ff0000', '#00ff00', '#0000ff']; // R, G, B
      const fwdTrack: PaletteCycleTrack = { id: 'fwd', low: 0, high: 2, rate: 1.0, direction: 'forward', blendShift: false, enabled: true };
      const revTrack: PaletteCycleTrack = { id: 'rev', low: 0, high: 2, rate: 1.0, direction: 'reverse', blendShift: false, enabled: true };

      const lutFwd = new Uint32Array(3);
      const lutRev = new Uint32Array(3);

      // At t = 1:
      // Forward: shiftInt = -1 -> reg 0 gets pal[(0 - 1 + 3)%3 = 2] = B, reg 1 gets R, reg 2 gets G
      updateLivePaletteLUT32(palette, [fwdTrack], 1.0, lutFwd);
      expect(unpackRgb32(lutFwd[0])).toEqual([0, 0, 255]);
      expect(unpackRgb32(lutFwd[1])).toEqual([255, 0, 0]);
      expect(unpackRgb32(lutFwd[2])).toEqual([0, 255, 0]);

      // Reverse: shiftInt = +1 -> reg 0 gets pal[(0 + 1)%3 = 1] = G, reg 1 gets B, reg 2 gets R
      updateLivePaletteLUT32(palette, [revTrack], 1.0, lutRev);
      expect(unpackRgb32(lutRev[0])).toEqual([0, 255, 0]);
      expect(unpackRgb32(lutRev[1])).toEqual([0, 0, 255]);
      expect(unpackRgb32(lutRev[2])).toEqual([255, 0, 0]);
    });
  });

  describe('3. Non-Integer Durations and Sub-Step Boundary Precision', () => {
    it('closes loop under irrational-approximation durations (pi, e, sqrt(2))', () => {
      const palette = makePalette(20);
      const tracks: PaletteCycleTrack[] = [
        { id: 'fwd', low: 0, high: 4, rate: 5.7, direction: 'forward', blendShift: false, enabled: true },
        { id: 'rev', low: 5, high: 11, rate: 8.3, direction: 'reverse', blendShift: false, enabled: true },
        { id: 'ping', low: 12, high: 18, rate: 6.9, direction: 'ping-pong', blendShift: false, enabled: true },
      ];

      const exoticDurations = [
        Math.PI, // 3.141592653589793
        Math.E,  // 2.718281828459045
        Math.SQRT2, // 1.4142135623730951
        0.1000000001,
        1.0 / 3.0, // 0.3333333333333333
        1.0 / 7.0, // 0.14285714285714285
      ];

      for (const T of exoticDurations) {
        const retuned = retuneTracksForSeamlessLoop(tracks, T);
        const lut0 = new Uint32Array(palette.length);
        const lutT = new Uint32Array(palette.length);
        const lut3T = new Uint32Array(palette.length);

        updateLivePaletteLUT32(palette, retuned, 0.0, lut0);
        updateLivePaletteLUT32(palette, retuned, T, lutT);
        updateLivePaletteLUT32(palette, retuned, 3 * T, lut3T);

        const exp = Array.from(lut0).map(unpackRgb32);
        expect(Array.from(lutT).map(unpackRgb32), `Failed at T=${T}`).toEqual(exp);
        expect(Array.from(lut3T).map(unpackRgb32), `Failed at 3*T (T=${T})`).toEqual(exp);
      }
    });

    it('does not cause premature phase transition at t = T - 1e-9', () => {
      // Test that the snap epsilon (1e-10) does NOT snap prematurely at 1e-9 or 1e-8 before boundary
      const palette = makePalette(5);
      const track: PaletteCycleTrack = {
        id: 't',
        low: 0,
        high: 4, // S = 5
        rate: 5.0, // 5 steps/sec -> period = 1.0s
        direction: 'forward',
        blendShift: false,
        enabled: true,
      };

      const T = 1.0;
      const [retuned] = retuneTracksForSeamlessLoop([track], T);

      const lut0 = new Uint32Array(5);
      const lutBefore = new Uint32Array(5);
      const lutExact = new Uint32Array(5);

      updateLivePaletteLUT32(palette, [retuned], 0.0, lut0);
      updateLivePaletteLUT32(palette, [retuned], T - 1e-8, lutBefore);
      updateLivePaletteLUT32(palette, [retuned], T, lutExact);

      // At t = 0: initial state
      // At t = T: exact loop closure matches t = 0
      expect(Array.from(lutExact).map(unpackRgb32)).toEqual(Array.from(lut0).map(unpackRgb32));

      // At t = T - 1e-8: phase is 4.99999995 -> floor is 4, NOT 5!
      // Therefore, lutBefore MUST be at phase 4, which is DIFFERENT from phase 0!
      expect(Array.from(lutBefore).map(unpackRgb32)).not.toEqual(Array.from(lut0).map(unpackRgb32));
    });
  });

  describe('4. Long-Term Drift & Frame-by-Frame Accumulation Oracle', () => {
    it('verifies zero cumulative phase drift over 10,000 simulated animation frames', () => {
      const palette = makePalette(16);
      const tracks: PaletteCycleTrack[] = [
        { id: 'fwd', low: 0, high: 5, rate: 13.5, direction: 'forward', blendShift: false, enabled: true },
        { id: 'rev', low: 6, high: 10, rate: 11.2, direction: 'reverse', blendShift: false, enabled: true },
        { id: 'ping', low: 11, high: 15, rate: 17.8, direction: 'ping-pong', blendShift: false, enabled: true },
      ];

      const T = 2.5; // Loop duration
      const retuned = retuneTracksForSeamlessLoop(tracks, T);

      const lut0 = new Uint32Array(palette.length);
      updateLivePaletteLUT32(palette, retuned, 0.0, lut0);
      const expected = Array.from(lut0).map(unpackRgb32);

      // Simulate 10,000 frames at 60 FPS (~166.67 seconds = 66.67 full loop cycles)
      const fps = 60;
      const totalFrames = 10000;
      const dt = 1 / fps;

      let loopBoundaryCount = 0;
      for (let frame = 1; frame <= totalFrames; frame++) {
        const elapsedSec = frame * dt;
        // Check if this frame lands on or extremely close to a loop boundary n*T
        const nLoops = elapsedSec / T;
        const nearestLoop = Math.round(nLoops);
        if (Math.abs(elapsedSec - nearestLoop * T) < 1e-12) {
          loopBoundaryCount++;
          const lutFrame = new Uint32Array(palette.length);
          updateLivePaletteLUT32(palette, retuned, elapsedSec, lutFrame);
          expect(
            Array.from(lutFrame).map(unpackRgb32),
            `Frame ${frame} at elapsed ${elapsedSec}s drifted from initial loop state`
          ).toEqual(expected);
        }
      }
      expect(loopBoundaryCount).toBeGreaterThan(0);

      // Verify that at exactly t = 66 * T, loop state is pristine
      const lut66T = new Uint32Array(palette.length);
      updateLivePaletteLUT32(palette, retuned, 66 * T, lut66T);
      expect(Array.from(lut66T).map(unpackRgb32)).toEqual(expected);
    });
  });

  describe('5. High-Iteration Monte Carlo Fuzzing (1,000 Random Permutations)', () => {
    it('verifies seamless loop closure across 1,000 randomly generated multi-track configurations', () => {
      const palette = makePalette(128);
      const directions: ('forward' | 'reverse' | 'ping-pong')[] = ['forward', 'reverse', 'ping-pong'];

      // Deterministic PRNG for reproducibility
      let seed = 0xdeadbeef;
      function rand() {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 4294967296;
      }

      for (let trial = 0; trial < 1000; trial++) {
        const numTracks = 2 + Math.floor(rand() * 5); // 2 to 6 tracks
        const tracks: PaletteCycleTrack[] = [];
        let curReg = 0;

        for (let i = 0; i < numTracks; i++) {
          const S = 2 + Math.floor(rand() * 10); // range size 2..11
          if (curReg + S >= 128) break;
          const low = curReg;
          const high = curReg + S - 1;
          curReg = high + 1;

          const dir = directions[Math.floor(rand() * directions.length)];
          const rate = 0.5 + rand() * 40.0; // rate 0.5..40.5 Hz
          const blend = rand() > 0.5;

          tracks.push({
            id: `trial_${trial}_t_${i}`,
            low,
            high,
            rate,
            direction: dir,
            blendShift: blend,
            enabled: true,
          });
        }

        const targetDuration = 0.2 + rand() * 5.0; // 0.2s .. 5.2s
        const retuned = retuneTracksForSeamlessLoop(tracks, targetDuration);

        const lut0 = new Uint32Array(128);
        const lutT = new Uint32Array(128);
        const lut2T = new Uint32Array(128);

        updateLivePaletteLUT32(palette, retuned, 0.0, lut0);
        updateLivePaletteLUT32(palette, retuned, targetDuration, lutT);
        updateLivePaletteLUT32(palette, retuned, 2 * targetDuration, lut2T);

        const expected = Array.from(lut0).map(unpackRgb32);
        const actualT = Array.from(lutT).map(unpackRgb32);
        const actual2T = Array.from(lut2T).map(unpackRgb32);

        expect(
          actualT,
          `Fuzz trial ${trial} failed at t = T (T=${targetDuration}, tracks=${JSON.stringify(retuned)})`
        ).toEqual(expected);
        expect(
          actual2T,
          `Fuzz trial ${trial} failed at t = 2T (T=${targetDuration})`
        ).toEqual(expected);
      }
    });
  });

  describe('6. Edge Cases and Defensive Boundaries', () => {
    it('handles non-positive target durations by clamping to 0.1s minimum', () => {
      const track: PaletteCycleTrack = { id: 't', low: 0, high: 4, rate: 5.0, direction: 'forward', blendShift: false, enabled: true };
      const [rZero] = retuneTracksForSeamlessLoop([track], 0);
      const [rNeg] = retuneTracksForSeamlessLoop([track], -5.0);

      // Duration clamped to 0.1s
      // S = 5, M = 5. Nominal = 0.1 * 5 / 5 = 0.1 -> harmonic = max(1, round(0.1)) = 1
      // retunedRate = 1 * 5 / 0.1 = 50 Hz
      expect(rZero.rate).toBe(50);
      expect(rNeg.rate).toBe(50);
    });

    it('handles negative elapsedSec in updateLivePaletteLUT32 gracefully without throwing', () => {
      const palette = makePalette(10);
      const tracks: PaletteCycleTrack[] = [
        { id: 'fwd', low: 0, high: 2, rate: 2.0, direction: 'forward', blendShift: false, enabled: true },
        { id: 'rev', low: 3, high: 5, rate: 2.0, direction: 'reverse', blendShift: false, enabled: true },
        { id: 'ping', low: 6, high: 8, rate: 2.0, direction: 'ping-pong', blendShift: false, enabled: true },
      ];

      const lut = new Uint32Array(10);
      expect(() => {
        updateLivePaletteLUT32(palette, tracks, -2.5, lut);
      }).not.toThrow();

      // All colors should be valid unpacked RGB numbers (not NaN)
      for (let i = 0; i < 10; i++) {
        const [r, g, b] = unpackRgb32(lut[i]);
        expect(Number.isFinite(r)).toBe(true);
        expect(Number.isFinite(g)).toBe(true);
        expect(Number.isFinite(b)).toBe(true);
      }
    });
  });
});
