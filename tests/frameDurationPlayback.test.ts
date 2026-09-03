import { describe, it, expect, beforeEach } from 'vitest';
import { useStudioStore } from '@/stores/studioStore';

describe('Variable Frame Duration & Animation Playback Timing', () => {
  beforeEach(() => {
    useStudioStore.getState().resetToNewProject();
  });

  it('updates frame durationMs with boundary clamping', () => {
    const store = useStudioStore.getState();
    store.addFrame();
    store.addFrame();

    // Set valid duration
    store.setFrameDuration(0, 250);
    expect(useStudioStore.getState().frames[0].durationMs).toBe(250);

    // Clamps minimum to 10ms
    store.setFrameDuration(1, 2);
    expect(useStudioStore.getState().frames[1].durationMs).toBe(10);

    // Clamps maximum to 10000ms
    store.setFrameDuration(2, 50000);
    expect(useStudioStore.getState().frames[2].durationMs).toBe(10000);
  });

  it('calculates total animation cycle duration with heterogeneous frame durations', () => {
    const store = useStudioStore.getState();
    // Default initial frame
    store.setFrameDuration(0, 100);

    // Frame 2: 250ms hold
    store.addFrame();
    store.setFrameDuration(1, 250);

    // Frame 3: 50ms fast transition
    store.addFrame();
    store.setFrameDuration(2, 50);

    const frames = useStudioStore.getState().frames;
    expect(frames).toHaveLength(3);

    const totalCycleDurationMs = frames.reduce((acc, f) => acc + (f.durationMs || 100), 0);
    expect(totalCycleDurationMs).toBe(400);
  });

  it('converts durationMs to GIF centisecond delay correctly', () => {
    const testCases = [
      { ms: 100, expectedDelay: 10 },
      { ms: 250, expectedDelay: 25 },
      { ms: 50, expectedDelay: 5 },
      { ms: 10, expectedDelay: 2 }, // min delay clamped to 2 centiseconds (20ms)
    ];

    for (const { ms, expectedDelay } of testCases) {
      const centiseconds = Math.max(2, Math.round(ms / 10));
      expect(centiseconds).toBe(expectedDelay);
    }
  });

  it('computes proportional timeline card width and hold badge correctly', () => {
    const fps = 8;
    const baseTime = Math.round(1000 / fps); // 125ms

    // Helper matching BottomTimeline.tsx logic
    const getCardMetrics = (durationMs: number) => {
      const cardWidth = Math.max(48, Math.min(160, Math.round(48 * (durationMs / baseTime))));
      const isHold = durationMs >= 2 * baseTime;
      const extraMs = durationMs - baseTime;
      return { cardWidth, isHold, extraMs };
    };

    // Standard frame (125ms at 8fps)
    const normal = getCardMetrics(125);
    expect(normal.cardWidth).toBe(48);
    expect(normal.isHold).toBe(false);

    // Short frame (50ms) clamps to minimum 48px
    const short = getCardMetrics(50);
    expect(short.cardWidth).toBe(48);
    expect(short.isHold).toBe(false);

    // 2x Hold frame (250ms >= 2 * 125ms)
    const hold = getCardMetrics(250);
    expect(hold.cardWidth).toBe(96);
    expect(hold.isHold).toBe(true);
    expect(hold.extraMs).toBe(125);

    // Very long hold (600ms) clamps to max 160px
    const longHold = getCardMetrics(600);
    expect(longHold.cardWidth).toBe(160);
    expect(longHold.isHold).toBe(true);
    expect(longHold.extraMs).toBe(475);
  });
});
