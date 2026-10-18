// @vitest-environment happy-dom
import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { usePlaybackClock } from '@/hooks/studio/usePlaybackClock';
import { useStudioStore } from '@/stores/studioStore';

// Animation frames are driven by hand: `step(ms)` runs the pending callback that many ms later.
let pending: FrameRequestCallback | null = null;
let now = 0;
const step = (ms: number) => { now += ms; const callback = pending; pending = null; callback?.(now); };

let shown: number[] = [];
const setActiveFrame = useStudioStore.getState().setActiveFrame;
beforeEach(() => {
  pending = null; now = 1000; shown = [];
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { pending = callback; return 1; });
  vi.stubGlobal('cancelAnimationFrame', () => { pending = null; });
  useStudioStore.getState().resetToNewProject();
  const base = useStudioStore.getState().frames[0];
  // The Motion journey's four poses and their stored holds.
  const frames = [160, 120, 180, 220].map((durationMs, i) => ({ ...base, id: `frame-${i}`, durationMs }));
  useStudioStore.setState({ frames, activeFrameIndex: 0, clips: [], activeClipId: null, loopMode: 'repeat', isPlaying: true });
  useStudioStore.setState({ setActiveFrame: (index: number) => { shown.push(index); setActiveFrame(index); } });
});
afterEach(() => { vi.unstubAllGlobals(); });

const play = () => renderHook(() => usePlaybackClock(true, { current: 1 }));

it('holds each pose for its stored duration at a steady frame rate', () => {
  play();
  step(0);
  for (let t = 0; t < 680; t += 16) step(16);
  // 160 + 120 + 180 = 460 ms reaches the last pose; 680 ms wraps to the first.
  expect(shown).toEqual([1, 2, 3, 0]);
});

it('shows every pose in order after a long stall, instead of skipping to where the time says', () => {
  useStudioStore.setState((state) => ({ frames: state.frames.map((frame) => ({ ...frame, durationMs: 100 })) }));
  play();
  step(0);
  step(16);
  // A 250 ms stall (the most one frame contributes) covers poses 0 and 1 together.
  step(250);
  expect(shown).toEqual([1]);
  step(16);
  expect(shown).toEqual([1, 2]);
  // The time owed was capped at pose 2's hold, so the clock does not race through the loop.
  step(16);
  expect(shown).toEqual([1, 2]);
  for (let i = 0; i < 40; i++) step(16);
  expect(shown.slice(0, 4)).toEqual([1, 2, 3, 0]);
  // Consecutive poses only: nothing consumed unseen.
  shown.forEach((pose, i) => { if (i > 0) expect(pose).toBe((shown[i - 1] + 1) % 4); });
});

it('stops on the last pose when playing once', () => {
  useStudioStore.setState({ loopMode: 'once' });
  play();
  step(0);
  for (let i = 0; i < 6; i++) step(250);
  expect(shown).toEqual([1, 2, 3]);
  expect(useStudioStore.getState().isPlaying).toBe(false);
});
