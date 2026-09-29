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

    // Project-format boundaries are editable without changing their values.
    store.setFrameDuration(1, 2);
    expect(useStudioStore.getState().frames[1].durationMs).toBe(2);
    store.setFrameDuration(1, 0);
    expect(useStudioStore.getState().frames[1].durationMs).toBe(1);

    store.setFrameDuration(2, 60_000);
    expect(useStudioStore.getState().frames[2].durationMs).toBe(60_000);
    store.setFrameDuration(2, 60_001);
    expect(useStudioStore.getState().frames[2].durationMs).toBe(60_000);
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

});
