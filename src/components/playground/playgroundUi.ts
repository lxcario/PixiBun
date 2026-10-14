'use client';

import { useMemo } from 'react';
import { create } from 'zustand';
import { useStudioStore } from '@/stores/studioStore';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { frameVisualKey } from '@/lib/render/framePreview';
import type { AnimationFrame } from '@/types/canvas';
import { getTemplateGridSize, type LessonFrameTemplate } from '@/lib/art/playgroundLessons';
import { lessonScore } from '@/lib/art/playgroundCoach';
import { evaluateStencilCoverage } from '@/lib/art/stencilEvaluator';
import { compositeFrame } from '@/lib/render/compositor';
import { reserveMemory } from '@/lib/safety/memoryBudget';

/** What the canvas overlay is showing right now. */
export type OverlayCue = { kind: 'demo' | 'gaps'; nonce: number } | null;

interface PlaygroundUiState {
  /** Lessons whose "here's what we'll make" intro was dismissed in this practice. */
  introSeen: Record<string, true>;
  cue: OverlayCue;
  slowMotion: boolean;
  pickerOpen: boolean;
  dismissIntro: (lessonId: string) => void;
  showDemo: () => void;
  showGaps: () => void;
  clearCue: () => void;
  setSlowMotion: (slow: boolean) => void;
  setPickerOpen: (open: boolean) => void;
  reset: () => void;
}

let nonce = 0;

export const usePlaygroundUi = create<PlaygroundUiState>((set) => ({
  introSeen: {},
  cue: null,
  slowMotion: false,
  pickerOpen: false,
  dismissIntro: (lessonId) => set((state) => ({ introSeen: { ...state.introSeen, [lessonId]: true } })),
  showDemo: () => set({ cue: { kind: 'demo', nonce: ++nonce } }),
  showGaps: () => set({ cue: { kind: 'gaps', nonce: ++nonce } }),
  clearCue: () => set({ cue: null }),
  setSlowMotion: (slowMotion) => set({ slowMotion }),
  setPickerOpen: (pickerOpen) => set({ pickerOpen }),
  reset: () => set({ introSeen: {}, cue: null, slowMotion: false, pickerOpen: false }),
}));

/** Tracing score (0–100) of a whole frame's composite against a lesson template. */
export function frameCoverage(
  frame: AnimationFrame | undefined, template: LessonFrameTemplate | undefined, width: number, height: number,
): number {
  if (!frame || !template) return 0;
  let release: (() => void) | undefined;
  let composite: HTMLCanvasElement | null = null;
  try {
    release = reserveMemory(width * height * 4, 'Lesson progress');
    composite = compositeFrame([frame], 0, width, height, { freshCanvas: true });
    const ctx = composite?.getContext('2d', { willReadFrequently: true });
    if (!ctx) return 0;
    const cellPixels = (width / getTemplateGridSize(template)) * (height / getTemplateGridSize(template));
    return lessonScore(evaluateStencilCoverage(ctx, width, height, template), cellPixels).score;
  } catch {
    return 0;
  } finally {
    if (composite) { composite.width = 0; composite.height = 0; }
    release?.();
  }
}

/** A score at or above this counts as matching the guide (the evaluator's 85% outline rule). */
export const MATCH_SCORE = 85;

/** Tracing score for every frame of the practice, against the lesson pose at the same index. */
export function useFrameScores(): number[] {
  const frames = useStudioStore((s) => s.frames);
  const canvasWidth = useStudioStore((s) => s.canvasWidth);
  const canvasHeight = useStudioStore((s) => s.canvasHeight);
  // Raster revisions live outside Zustand; the joined visual keys change whenever any frame's pixels do.
  const visualKeys = useStudioStore((s) => s.frames.map(frameVisualKey).join('|'));
  const lesson = useOnboardingStore((s) => s.getCurrentLesson());
  return useMemo(
    () => frames.map((frame, i) => frameCoverage(frame, lesson.frames[i], canvasWidth, canvasHeight)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visualKeys, lesson, canvasWidth, canvasHeight],
  );
}
