'use client';

import React, { useEffect, useRef } from 'react';
import { useReducedMotion } from 'motion/react';
import type { LessonFrameTemplate } from '@/lib/art/playgroundLessons';
import { getTemplateGridSize } from '@/lib/art/playgroundLessons';
import { uncoveredCells } from '@/lib/art/playgroundCoach';
import { compositeFrame } from '@/lib/render/compositor';
import { useStudioStore } from '@/stores/studioStore';
import { useLiveThemeChoice } from '@/stores/themeStore';
import { usePlaygroundUi } from './playgroundUi';
import { accentColor, runTraceDemo } from './traceDemo';

/**
 * Lives on the canvas stage, above the artwork. "Show me" draws the target
 * pose cell by cell like a ghostly pen; "What's missing?" pulses the cells the
 * drawing has not reached. It never takes pointer input.
 */
export const GhostOverlay: React.FC<{ template: LessonFrameTemplate | null }> = ({ template }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cue = usePlaygroundUi((s) => s.cue);
  const clearCue = usePlaygroundUi((s) => s.clearCue);
  const canvasWidth = useStudioStore((s) => s.canvasWidth);
  const canvasHeight = useStudioStore((s) => s.canvasHeight);
  const isPlaying = useStudioStore((s) => s.isPlaying);
  const reduceMotion = Boolean(useReducedMotion());
  // Repaint in the saved theme's accent from the first frame.
  const { studioTheme, colorScheme } = useLiveThemeChoice();

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!cue || !template) return;
    // Playback shows the learner's own frames; a demo would draw over them.
    if (isPlaying) { clearCue(); return; }

    const grid = getTemplateGridSize(template);
    const cellW = canvasWidth / grid;
    const cellH = canvasHeight / grid;
    const gold = accentColor();
    let raf = 0;
    const start = performance.now();
    const fill = (x: number, y: number, color: string, alpha: number) => {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.fillRect(Math.floor(x * cellW), Math.floor(y * cellH), Math.max(1, Math.ceil(cellW)), Math.max(1, Math.ceil(cellH)));
    };
    const finish = () => { ctx.globalAlpha = 1; ctx.clearRect(0, 0, canvas.width, canvas.height); clearCue(); };

    let cancelDemo: (() => void) | undefined;
    if (cue.kind === 'demo') {
      cancelDemo = runTraceDemo(ctx, template, canvasWidth, canvasHeight, { reduceMotion, onDone: finish });
    } else {
      const state = useStudioStore.getState();
      let missing: Array<{ x: number; y: number }> = [];
      let composite: HTMLCanvasElement | null = null;
      try {
        composite = compositeFrame(state.frames, state.activeFrameIndex, canvasWidth, canvasHeight, { freshCanvas: true });
        const sample = composite?.getContext('2d', { willReadFrequently: true });
        if (sample) missing = uncoveredCells(sample, canvasWidth, canvasHeight, template);
      } catch {
        missing = [];
      } finally {
        if (composite) { composite.width = 0; composite.height = 0; }
      }
      const totalMs = 2100;
      const frame = (now: number) => {
        const t = now - start;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const pulse = reduceMotion ? 0.75 : 0.35 + 0.55 * (0.5 + 0.5 * Math.sin((t / 700) * Math.PI * 2 - Math.PI / 2));
        const fade = t > totalMs - 300 ? Math.max(0, (totalMs - t) / 300) : 1;
        for (const cell of missing) fill(cell.x, cell.y, gold, pulse * fade);
        if (t >= totalMs) { finish(); return; }
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
    }

    // Drawing on the canvas takes over from the demo straight away.
    const stop = (event: PointerEvent) => {
      if ((event.target as Element | null)?.closest?.('#main-content')) finish();
    };
    window.addEventListener('pointerdown', stop, true);
    return () => {
      cancelDemo?.();
      cancelAnimationFrame(raf);
      window.removeEventListener('pointerdown', stop, true);
      ctx.globalAlpha = 1;
    };
  }, [cue, template, canvasWidth, canvasHeight, reduceMotion, clearCue, isPlaying, studioTheme, colorScheme]);

  return (
    <canvas
      ref={canvasRef}
      data-testid="playground-ghost-overlay"
      width={canvasWidth}
      height={canvasHeight}
      aria-hidden="true"
      className="absolute inset-0 w-full h-full pointer-events-none pixelated"
      style={{ imageRendering: 'pixelated', zIndex: 11 }}
    />
  );
};
