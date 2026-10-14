'use client';

import { useCallback } from 'react';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { useStudioStore } from '@/stores/studioStore';
import { getOrCreateBuffer } from '@/lib/engine/bufferRegistry';
import { applyLessonEdit } from '@/lib/art/applyLessonEdit';
import { getTemplateGridSize, getTemplateRows } from '@/lib/art/playgroundLessons';
import { LESSON_PALETTE } from '@/lib/art/lessonPalette';
import { evaluateStencilCoverage } from '@/lib/art/stencilEvaluator';
import { compositeFrame } from '@/lib/render/compositor';

/** Score the active layer against the current lesson pose. */
export function scoreActiveLayer() {
  const onboarding = useOnboardingStore.getState();
  const template = onboarding.getCurrentFrameTemplate();
  const { activeLayerId, canvasWidth, canvasHeight } = useStudioStore.getState();
  if (!template || !activeLayerId) return;
  const buf = getOrCreateBuffer(activeLayerId, canvasWidth, canvasHeight);
  onboarding.recordAnalysis(evaluateStencilCoverage(buf.ctx, canvasWidth, canvasHeight, template));
}

/** Lesson edits that go through the viewport's Undo/Redo. */
export function useLessonActions() {
  // Trace overlays existing pixels; the pre-trace artwork stays in Undo.
  const trace = useCallback(() => {
    const template = useOnboardingStore.getState().getCurrentFrameTemplate();
    if (!template) return;
    const { canvasWidth, canvasHeight } = useStudioStore.getState();
    const rows = getTemplateRows(template);
    const gridSize = getTemplateGridSize(template);
    const cellW = canvasWidth / gridSize;
    const cellH = canvasHeight / gridSize;
    const committed = applyLessonEdit('Trace lesson template', (ctx) => {
      ctx.imageSmoothingEnabled = false;
      rows.forEach((row, y) => {
        for (let x = 0; x < row.length; x++) {
          const color = LESSON_PALETTE[row[x]];
          if (!color) continue;
          ctx.fillStyle = color;
          ctx.fillRect(Math.floor(x * cellW), Math.floor(y * cellH), Math.max(1, Math.ceil(cellW)), Math.max(1, Math.ceil(cellH)));
        }
      });
    });
    if (committed) scoreActiveLayer();
  }, []);

  const clearFrame = useCallback(() => {
    const { canvasWidth, canvasHeight } = useStudioStore.getState();
    const committed = applyLessonEdit('Clear lesson layer', ctx => ctx.clearRect(0, 0, canvasWidth, canvasHeight));
    if (committed) scoreActiveLayer();
  }, []);

  /** Start this frame from a copy of the one before, so only the moving parts need redrawing. */
  const copyPrevious = useCallback(() => {
    const { frames, activeFrameIndex, canvasWidth, canvasHeight } = useStudioStore.getState();
    if (activeFrameIndex < 1) return;
    let composite: HTMLCanvasElement | null = null;
    try {
      composite = compositeFrame(frames, activeFrameIndex - 1, canvasWidth, canvasHeight, { freshCanvas: true });
      const source = composite;
      if (!source) return;
      const committed = applyLessonEdit('Copy previous frame', ctx => {
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(source, 0, 0);
      });
      if (committed) scoreActiveLayer();
    } finally {
      if (composite) { composite.width = 0; composite.height = 0; }
    }
  }, []);

  /** Move to the next step, making sure the next lesson frame exists first. */
  const next = useCallback(() => {
    const onboarding = useOnboardingStore.getState();
    const step = onboarding.getCurrentStep();
    const studio = useStudioStore.getState();
    if (step.type === 'DRAW_FRAME' && step.frameIndex !== undefined) {
      const nextFrame = step.frameIndex + 1;
      if (nextFrame < onboarding.getCurrentLesson().totalFrames) {
        if (studio.frames.length <= nextFrame) studio.addFrame();
        useStudioStore.getState().setActiveFrame(nextFrame);
      }
    }
    if (studio.isPlaying) studio.setIsPlaying(false);
    onboarding.nextStep();
  }, []);

  return { trace, clearFrame, copyPrevious, next };
}
