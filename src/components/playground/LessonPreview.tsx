'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { getTemplateGridSize, type PlaygroundLesson } from '@/lib/art/playgroundLessons';
import { LESSON_PALETTE } from '@/lib/art/lessonPalette';
import { paintTemplate } from '@/lib/art/playgroundCoach';

interface LessonPreviewProps {
  lesson: PlaygroundLesson;
  /** `loop` plays the whole lesson; `compare` shows this frame over a faint copy of the one before. */
  mode: 'loop' | 'compare' | 'still';
  frameIndex?: number;
  /** Pixel size of the square preview. */
  size: number;
  /** Override autoplay (defaults to on unless the viewer prefers reduced motion). */
  playing?: boolean;
  slow?: boolean;
  onFrame?: (frameIndex: number) => void;
  /** Omit for a decorative preview. */
  label?: string;
  className?: string;
}

/** A small pixel-perfect look at a lesson's target poses. */
export const LessonPreview: React.FC<LessonPreviewProps> = ({
  lesson, mode, frameIndex = 0, size, playing, slow = false, onFrame, label, className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduceMotion = Boolean(useReducedMotion());
  const autoplay = playing ?? !reduceMotion;
  const [loopFrame, setLoopFrame] = useState(0);
  const onFrameRef = useRef(onFrame);
  onFrameRef.current = onFrame;
  const grid = getTemplateGridSize(lesson.frames[0]);

  // Step through the lesson's own frame timings.
  useEffect(() => {
    if (mode !== 'loop' || !autoplay) return;
    let index = 0;
    let timer: ReturnType<typeof setTimeout>;
    const advance = () => {
      setLoopFrame(index);
      onFrameRef.current?.(index);
      const hold = lesson.frames[index]?.recommendedHoldMs ?? 120;
      timer = setTimeout(() => {
        index = (index + 1) % lesson.frames.length;
        advance();
      }, hold * (slow ? 3 : 1.6));
    };
    advance();
    return () => clearTimeout(timer);
  }, [mode, autoplay, lesson, slow]);

  const shown = mode === 'loop' && autoplay ? loopFrame : frameIndex;

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, grid, grid);
    if (mode === 'compare' && lesson.frames.length > 1) {
      const previous = lesson.frames[(shown - 1 + lesson.frames.length) % lesson.frames.length];
      ctx.globalAlpha = 0.35;
      paintTemplate(ctx, previous, LESSON_PALETTE, grid, grid, '#8e6fb4');
      ctx.globalAlpha = 1;
    }
    const current = lesson.frames[shown];
    if (current) paintTemplate(ctx, current, LESSON_PALETTE, grid, grid);
  }, [lesson, shown, mode, grid]);

  return (
    <canvas
      ref={canvasRef}
      width={grid}
      height={grid}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={`pixelated ${className}`}
      style={{ width: size, height: size, imageRendering: 'pixelated' }}
    />
  );
};
