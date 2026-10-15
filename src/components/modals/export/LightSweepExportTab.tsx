'use client';

import React, { useEffect, useImperativeHandle, useRef, useState } from 'react';
import { useStudioStore } from '@/stores/studioStore';
import { compositeFrame } from '@/lib/render/compositor';
import { cardFonts } from '@/lib/cart/buildCart';
import { renderLightSweep, SWEEP_FPS, SWEEP_SCALE, SWEEP_SECONDS } from '@/lib/cart/lightSweep';
import { exportAnimationToMp4Async, isMp4ExportSupported, probeMp4ExportSupport } from '@/lib/export/mp4Encoder';
import { exportAnimationToWebmAsync, isWebmExportSupported } from '@/lib/export/webmEncoder';
import { reserveMemory } from '@/lib/safety/memoryBudget';
import { studioEvents } from '@/lib/events/studioEvents';

export interface LightSweepHandle { save: () => Promise<void> }

interface LightSweepExportTabProps {
  onBusy: (busy: boolean) => void;
  onDone: () => void;
}

const MAKER_KEY = 'pixibun-cart-maker';

/** Every frame of the drawing as shown, with its hold. */
function drawingFrames() {
  const state = useStudioStore.getState();
  const frames: HTMLCanvasElement[] = [];
  for (let i = 0; i < state.frames.length; i++) {
    const art = compositeFrame(state.frames, i, state.canvasWidth, state.canvasHeight);
    if (art) frames.push(art);
  }
  if (frames.length === 0) throw new Error('The drawing could not be read. Try again in a moment.');
  return { frames, durations: state.frames.map(frame => Math.max(16, frame.durationMs || 100)) };
}

/** Export → Light Sweep: a 9:16 clip of a lamp drifting over the drawing at night. */
export const LightSweepExportTab = React.forwardRef<LightSweepHandle, LightSweepExportTabProps>(function LightSweepExportTab({ onBusy, onDone }, ref) {
  const projectName = useStudioStore(s => s.projectName);
  const bufferVersion = useStudioStore(s => s.bufferVersion);
  const posterRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState<{ done: number; total: number; phase: 'lighting' | 'encoding' } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const maker = useRef('');

  useEffect(() => {
    try { maker.current = window.localStorage.getItem(MAKER_KEY) ?? ''; } catch { maker.current = ''; }
  }, []);

  // A poster: the first moment of the clip.
  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          await document.fonts?.ready;
          const { frames, durations } = drawingFrames();
          const [poster] = await renderLightSweep({ frames: [frames[0]], durations: [durations[0]], title: projectName, maker: maker.current || undefined, fonts: cardFonts() }, undefined, undefined).then(all => all.slice(0, 1));
          if (cancelled || !posterRef.current || !poster) return;
          poster.setAttribute('aria-hidden', 'true');
          poster.className = 'block h-[300px] w-auto mx-auto [image-rendering:pixelated] rounded-[6px]';
          posterRef.current.replaceChildren(poster);
        } catch { /* The poster is a courtesy; saving reports real problems. */ }
      })();
    }, 200);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [bufferVersion, projectName]);

  useImperativeHandle(ref, () => ({
    save: async () => {
      setError(null);
      onBusy(true);
      const total = SWEEP_FPS * SWEEP_SECONDS;
      const release = reserveMemory(total * 270 * 480 * 4 * 2, 'Light Sweep frames');
      try {
        const { frames, durations } = drawingFrames();
        const clip = await renderLightSweep(
          { frames, durations, title: projectName, maker: maker.current || undefined, fonts: cardFonts() },
          (done, all) => setProgress({ done, total: all, phase: 'lighting' }),
        );
        setProgress({ done: 0, total: clip.length, phase: 'encoding' });
        const width = clip[0].width * SWEEP_SCALE, height = clip[0].height * SWEEP_SCALE;
        const mp4 = isMp4ExportSupported() && await probeMp4ExportSupport(width, height, SWEEP_FPS).catch(() => false);
        if (!mp4 && !isWebmExportSupported()) throw new Error('This browser can’t make video files. Try Chrome, Edge or Firefox, or share the cart itself.');
        const options = {
          fps: SWEEP_FPS, scale: SWEEP_SCALE, loopCount: 1,
          durationsMs: clip.map(() => Math.round(1000 / SWEEP_FPS)),
          onProgress: (done: number, all: number) => setProgress({ done, total: all, phase: 'encoding' }),
        };
        const blob = mp4 ? await exportAnimationToMp4Async(clip, options) : await exportAnimationToWebmAsync(clip, options);
        for (const canvas of clip) { canvas.width = 0; canvas.height = 0; }
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const slug = projectName.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'pixibun';
        link.download = `${slug}-light-sweep.${mp4 ? 'mp4' : 'webm'}`;
        link.href = url;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        studioEvents.emit('pixibun:toast', { type: 'success', message: 'Light Sweep saved. Post it with your cart link so people can light it themselves.' });
        onDone();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'The Light Sweep could not be made.');
      } finally {
        release();
        setProgress(null);
        onBusy(false);
      }
    },
  }));

  return (
    <div className="flex flex-col gap-3" data-testid="light-sweep-export">
      <p className="text-xs text-[var(--text-body)] leading-relaxed">
        A {SWEEP_SECONDS}-second tall video for phones: a lamp drifts over your drawing at night and lights it as it goes. Animated drawings keep playing underneath.
      </p>
      <div ref={posterRef} data-testid="light-sweep-poster" className="min-h-[300px] flex items-center justify-center rounded-[4px] bg-[var(--surface-0)] border border-dashed border-[var(--desk-border)] p-2" />
      {progress && (
        <p role="status" className="text-[11px] text-[var(--text-body)]">
          {progress.phase === 'lighting' ? `Lighting frame ${progress.done} of ${progress.total}…` : `Making the video… ${progress.done} of ${progress.total}`}
        </p>
      )}
      <p className="text-[11px] text-[var(--text-muted)]">540 × 960, {SWEEP_FPS} frames a second. MP4 where your browser can make it, otherwise WebM.</p>
      {error && <p role="alert" className="text-xs text-[var(--danger-fg)] bg-[var(--danger-bg)] border border-[var(--danger-border)] rounded-[2px] px-2 py-1.5">{error}</p>}
    </div>
  );
});
