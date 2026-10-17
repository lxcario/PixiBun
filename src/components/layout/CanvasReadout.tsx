'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useStudioStore } from '@/stores/studioStore';
import type { StudioState } from '@/stores/slices/types';
import {
  describeCanvasReadout,
  formatReadoutColors,
  readActiveFrameReadout,
  type CanvasReadout as Readout,
} from '@/lib/render/canvasReadout';

/* ── Canvas Readout ── */

// Quiet time after the last change before the frame is read again, so a burst
// of commits (a fill, then its thumbnail refresh) produces one announcement.
const SETTLE_MS = 80;

type Source = readonly unknown[];

const sourceOf = (s: StudioState): Source => [
  s.currentProjectId, s.bufferVersion, s.frames, s.activeFrameIndex, s.activeLayerId, s.canvasWidth, s.canvasHeight,
];

const sameSource = (a: Source | null, b: Source) => a !== null && a.every((value, i) => Object.is(value, b[i]));

/**
 * Text summary of the active frame for screen readers and black-box tests:
 * size, frame and layer, painted pixel count, top colors and a digest of the
 * composite. It re-reads the frame only once an edit is committed: while a
 * pointer is held (a stroke, a slider drag) or the animation plays, it waits.
 */
export const CanvasReadout: React.FC = React.memo(() => {
  const source = useStudioStore(useShallow(sourceOf));
  const isPlaying = useStudioStore((s) => s.isPlaying);
  const [state, setState] = useState<{ readout: Readout | null; source: Source | null; revision: number }>({
    readout: null,
    source: null,
    revision: 0,
  });
  const computedFor = useRef<Source | null>(null);
  const pointerHeld = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const read = useCallback(() => {
    timer.current = null;
    const studio = useStudioStore.getState();
    if (pointerHeld.current || studio.isPlaying) return;
    const current = sourceOf(studio);
    computedFor.current = current;
    const readout = readActiveFrameReadout(studio);
    setState((previous) => ({ readout, source: current, revision: previous.revision + 1 }));
  }, []);

  const schedule = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
    const studio = useStudioStore.getState();
    if (pointerHeld.current || studio.isPlaying || sameSource(computedFor.current, sourceOf(studio))) return;
    timer.current = setTimeout(read, SETTLE_MS);
  }, [read]);

  useEffect(() => {
    schedule();
  }, [source, isPlaying, schedule]);

  useEffect(() => {
    const hold = () => {
      pointerHeld.current = true;
      if (timer.current !== null) clearTimeout(timer.current);
      timer.current = null;
    };
    const release = () => {
      if (!pointerHeld.current) return;
      pointerHeld.current = false;
      schedule();
    };
    const onVisibility = () => { if (document.visibilityState === 'hidden') release(); };
    window.addEventListener('pointerdown', hold, true);
    window.addEventListener('pointerup', release, true);
    window.addEventListener('pointercancel', release, true);
    window.addEventListener('blur', release);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pointerdown', hold, true);
      window.removeEventListener('pointerup', release, true);
      window.removeEventListener('pointercancel', release, true);
      window.removeEventListener('blur', release);
      document.removeEventListener('visibilitychange', onVisibility);
      if (timer.current !== null) clearTimeout(timer.current);
    };
  }, [schedule]);

  const { readout, revision } = state;
  const ready = readout !== null && sameSource(state.source, source);

  return (
    <section
      data-testid="canvas-readout"
      aria-label="Canvas readout"
      data-state={ready ? 'ready' : 'pending'}
      data-revision={revision}
      className="sr-only"
    >
      <p data-testid="canvas-readout-summary" role="status" aria-live="polite" aria-atomic="true">
        {readout ? describeCanvasReadout(readout) : 'Reading the canvas…'}
      </p>
      {readout && (
        <dl>
          <dt>Canvas size</dt>
          <dd data-testid="canvas-readout-size">{readout.width}×{readout.height}</dd>
          <dt>Active frame</dt>
          <dd data-testid="canvas-readout-frame">{readout.frameNumber} of {readout.frameCount}</dd>
          <dt>Frames</dt>
          <dd data-testid="canvas-readout-frames">{readout.frameCount}</dd>
          <dt>Active layer</dt>
          <dd data-testid="canvas-readout-layer">{readout.layerName}</dd>
          <dt>Layers in this frame</dt>
          <dd data-testid="canvas-readout-layers">{readout.layerCount}</dd>
          <dt>Painted pixels in this frame</dt>
          <dd data-testid="canvas-readout-pixels">{readout.paintedPixels}</dd>
          <dt>Colors in this frame</dt>
          <dd data-testid="canvas-readout-colors">{readout.colorCount}</dd>
          <dt>Most used colors with pixel counts</dt>
          <dd data-testid="canvas-readout-top-colors">{formatReadoutColors(readout.topColors)}</dd>
          <dt>Frame digest</dt>
          <dd data-testid="canvas-readout-digest">{readout.digest}</dd>
        </dl>
      )}
    </section>
  );
});

CanvasReadout.displayName = 'CanvasReadout';
