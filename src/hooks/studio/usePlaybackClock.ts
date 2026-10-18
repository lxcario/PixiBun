'use client';

import { useEffect, type RefObject } from 'react';
import { useStudioStore } from '@/stores/studioStore';
import { playbackOrder } from '@/lib/export/animationModel';

/**
 * Advances the active frame while `isPlaying`, honouring each frame's stored
 * duration, the active clip and loop mode. `previewSpeedRef` scales holds
 * without restarting the clock. Mount it once per workspace.
 */
export function usePlaybackClock(isPlaying: boolean, previewSpeedRef: RefObject<number>) {
  // Keep one clock for the playback session. Frame changes must not discard elapsed time.
  useEffect(() => {
    if (!isPlaying) return;

    let lastTimestamp: number | null = null;
    let accumulator = 0;
    let animFrameId: number;
    let sequenceKey = '', position = 0;
    let sequence: number[] = [];
    let publishedIndex = useStudioStore.getState().activeFrameIndex;

    const onVisibilityChange = () => {
      // A background tab is suspended; resume without replaying hidden time.
      lastTimestamp = null;
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    const tick = (timestamp: number) => {
      if (document.hidden) {
        lastTimestamp = null;
        animFrameId = requestAnimationFrame(tick);
        return;
      }
      if (lastTimestamp !== null) accumulator += Math.max(0, Math.min(250, timestamp - lastTimestamp));
      lastTimestamp = timestamp;
      const state = useStudioStore.getState();
      if (!state.isPlaying) return;
      const clip = state.clips.find((item) => item.id === state.activeClipId);
      const first = clip?.startFrame ?? 0;
      const last = Math.min(clip?.endFrame ?? state.frames.length - 1, state.frames.length - 1);
      const key = `${clip?.id}:${first}:${last}:${clip?.loopMode}:${state.loopMode}`;
      if (key !== sequenceKey) {
        sequenceKey = key; sequence = playbackOrder(first, last, clip?.loopMode, state.loopMode);
        position = 0; accumulator = 0;
      } else if (state.activeFrameIndex !== publishedIndex) {
        // An explicit scrub starts a fresh hold on the forward leg.
        position = Math.max(0, sequence.indexOf(state.activeFrameIndex)); accumulator = 0;
      }
      let index = sequence[position] ?? first;
      let stopped = false;
      if (first === last && state.loopMode === 'once') {
        const duration = state.frames[index]?.durationMs ?? Math.round(1000 / state.fps);
        stopped = accumulator >= duration / previewSpeedRef.current;
      }
      // At most one pose per animation frame. After a long gap between frames (a busy
      // tab, a slow device) the clock used to catch up by consuming several poses in one
      // frame, so they were never shown; now each is shown in order, and time owed beyond
      // the next pose's hold is dropped rather than fast-forwarded through.
      const hold = (frameIndex: number) => (state.frames[frameIndex]?.durationMs ?? Math.round(1000 / state.fps)) / previewSpeedRef.current;
      if (first < last && accumulator >= hold(index)) {
        accumulator -= hold(index);
        if (state.loopMode === 'once' && position === sequence.length - 1) {
          stopped = true;
          accumulator = 0;
        } else {
          position = (position + 1) % sequence.length;
          index = sequence[position];
          accumulator = Math.min(accumulator, hold(index));
        }
      }
      if (index !== publishedIndex) {
        publishedIndex = index;
        state.setActiveFrame(index);
      }
      if (stopped) {
        state.setIsPlaying(false);
        return;
      }
      animFrameId = requestAnimationFrame(tick);
    };

    animFrameId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(animFrameId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [isPlaying, previewSpeedRef]);
}
