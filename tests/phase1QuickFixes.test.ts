import { describe, expect, it } from 'vitest';
import { gifFrameDelays } from '@/lib/export/gifEncoderCore';
import { useStudioStore } from '@/stores/studioStore';

describe('Phase 1 quick fixes', () => {
  it('rounds GIF delays on the running total so a loop keeps its length (audit defect 8)', () => {
    // Eight 125 ms frames: 12.5 cs each, exactly 100 cs in total.
    const delays = gifFrameDelays(Array(8).fill(12.5));
    expect(delays.reduce((a, b) => a + b, 0)).toBe(100);
    expect(new Set(delays)).toEqual(new Set([12, 13]));
    // 12 fps: 8.33 cs per frame, 100 cs per 12 frames.
    expect(gifFrameDelays(Array(12).fill(100 / 12)).reduce((a, b) => a + b, 0)).toBe(100);
    // Very short frames are lengthened to 2 cs; later frames absorb the difference.
    expect(gifFrameDelays([1, 1, 10])).toEqual([2, 2, 8]);
  });

  it('starts Flood Fill at tolerance 0 without a near-duplicate default swatch (audit defect 7)', () => {
    const state = useStudioStore.getState();
    expect(state.tools.fillTolerance).toBe(0);
    const defaults = state.palettes.flatMap(p => p.colors.map(c => c.toUpperCase()));
    expect(defaults).not.toContain('#DDDDDF');
  });
});
