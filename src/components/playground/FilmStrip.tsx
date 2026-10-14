'use client';

import React, { useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { useStudioStore } from '@/stores/studioStore';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { FramePreviewCanvas } from '@/components/layout/BottomTimeline';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { usePlaybackClock } from '@/hooks/studio/usePlaybackClock';
import { coachForFrame, holdInWords } from '@/lib/art/playgroundCoach';
import { LessonPreview } from './LessonPreview';
import { MATCH_SCORE, useFrameScores, usePlaygroundUi } from './playgroundUi';

/**
 * The flipbook along the bottom: each frame's drawing over its faint target,
 * a tick when it matches, and a bar showing how long it stays on screen.
 */
export const FilmStrip: React.FC = () => {
  const frames = useStudioStore((s) => s.frames);
  const activeFrameIndex = useStudioStore((s) => s.activeFrameIndex);
  const isPlaying = useStudioStore((s) => s.isPlaying);
  const fps = useStudioStore((s) => s.fps);
  const setActiveFrame = useStudioStore((s) => s.setActiveFrame);
  const setIsPlaying = useStudioStore((s) => s.setIsPlaying);
  const addFrame = useStudioStore((s) => s.addFrame);
  const lesson = useOnboardingStore((s) => s.getCurrentLesson());
  const step = useOnboardingStore((s) => s.getCurrentStep());
  const slowMotion = usePlaygroundUi((s) => s.slowMotion);
  const setSlowMotion = usePlaygroundUi((s) => s.setSlowMotion);
  const reduceMotion = Boolean(useReducedMotion());

  const speedRef = useRef(1);
  speedRef.current = slowMotion ? 0.35 : 1;
  usePlaybackClock(isPlaying, speedRef);

  const scores = useFrameScores();

  const longest = Math.max(...frames.map(f => f.durationMs ?? Math.round(1000 / fps)), 1);
  const playStep = step.type === 'PLAYBACK';

  return (
    <footer
      data-testid="playground-filmstrip"
      className="shrink-0 z-20 border-t-2 border-[var(--ink)] bg-[var(--desk-surface)] px-3 sm:px-5 py-2.5 flex items-center gap-3 sm:gap-4"
    >
      <div className="flex items-center gap-2 shrink-0">
        <motion.button
          type="button"
          data-tutorial="play-button"
          onClick={() => setIsPlaying(!isPlaying)}
          title="Play / Pause Animation (Space)"
          aria-pressed={isPlaying}
          animate={playStep && !isPlaying && !reduceMotion ? { scale: [1, 1.08, 1] } : { scale: 1 }}
          transition={playStep && !isPlaying ? { duration: 1.1, repeat: Infinity } : { duration: 0.2 }}
          className={`h-12 min-w-[92px] px-4 flex items-center justify-center gap-2 rounded-[2px] font-display text-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--desk-surface)] ${
            isPlaying ? 'pixel-tactile-btn text-[var(--text-heading)]' : 'pixel-primary-btn'
          }`}
        >
          <PixelIcon name={isPlaying ? 'pause' : 'play'} size={14} />
          <span>{isPlaying ? 'Pause' : 'Play'}</span>
        </motion.button>
        <button
          type="button"
          aria-pressed={slowMotion}
          onClick={() => setSlowMotion(!slowMotion)}
          title="Play the frames slowly so you can see each one"
          className={`h-12 px-2.5 hidden md:flex flex-col items-center justify-center gap-0.5 rounded-[2px] text-[10px] font-mono leading-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)] ${
            slowMotion ? 'pixel-tactile-btn text-[var(--accent-gold)] border-[var(--accent-gold)]' : 'pixel-tactile-btn text-[var(--text-muted)]'
          }`}
        >
          <PixelIcon name="clock-pixel" size={14} />
          <span>Slow-mo</span>
        </button>
      </div>

      <ol aria-label="Frames" className="flex-1 min-w-0 flex items-end gap-2 overflow-x-auto py-1 px-1 custom-scrollbar">
        {frames.map((frame, index) => {
          const template = lesson.frames[index];
          const coach = template ? coachForFrame(lesson, index) : null;
          const duration = frame.durationMs ?? Math.round(1000 / fps);
          const active = index === activeFrameIndex;
          const done = template ? (scores[index] ?? 0) >= MATCH_SCORE : false;
          const isStepFrame = step.type === 'DRAW_FRAME' && step.frameIndex === index;
          return (
            <li key={frame.id} className="shrink-0">
              <button
                type="button"
                onClick={() => setActiveFrame(index)}
                aria-current={active ? 'true' : undefined}
                aria-label={`Frame ${index + 1}${coach ? `: ${coach.title.replace(/[.!?]$/, '')}` : ''}. ${done ? 'Matches the guide. ' : ''}Stays on screen for ${duration} ms, ${holdInWords(duration)}.`}
                title={`${coach?.title ?? `Frame ${index + 1}`} · ${duration} ms`}
                className="group relative flex flex-col items-center gap-1 px-1 pt-1 pb-0.5 rounded-[2px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)]"
              >
                {active && (
                  <motion.span
                    layoutId="filmstrip-active"
                    aria-hidden="true"
                    className="absolute inset-0 z-0 rounded-[2px] border-2 border-[var(--accent-gold)] bg-[var(--surface-3)]"
                    transition={isPlaying || reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 36 }}
                  />
                )}
                <span className={`relative z-[1] w-12 h-12 flex items-center justify-center border-2 rounded-[1px] overflow-hidden bg-[var(--lesson-paper)] ${active ? 'border-[var(--ink)]' : 'border-[var(--desk-border)] group-hover:border-[var(--desk-border-highlight)]'}`}>
                  {template && (
                    <LessonPreview lesson={lesson} mode="still" frameIndex={index} size={44} playing={false} className="absolute opacity-20" />
                  )}
                  <span className="relative flex items-center justify-center w-11 h-11 [&>canvas]:w-full [&>canvas]:h-full">
                    <FramePreviewCanvas frameIndex={index} maxSize={44} testId={`frame-thumbnail-${index}`} />
                  </span>
                  {done && (
                    <motion.span
                      initial={reduceMotion ? false : { scale: 0, rotate: -30 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 600, damping: 18 }}
                      aria-hidden="true"
                      className="absolute -top-0.5 -right-0.5 w-4 h-4 flex items-center justify-center bg-[var(--accent-sage)] border border-[var(--ink)] text-[9px] leading-none text-[var(--ink)] font-bold"
                    >
                      ✓
                    </motion.span>
                  )}
                  {isStepFrame && !done && (
                    <span aria-hidden="true" className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-[var(--accent-gold)] border border-[var(--ink)]" />
                  )}
                </span>
                <span className="relative z-[1] flex items-center gap-1.5 w-12">
                  <span className={`text-[10px] font-mono tabular-nums ${active ? 'text-[var(--text-heading)] font-bold' : 'text-[var(--text-muted)]'}`}>{index + 1}</span>
                  <span aria-hidden="true" className="flex-1 h-1.5 bg-[var(--surface-0)] border border-[var(--desk-border)] overflow-hidden">
                    <span className="block h-full bg-[var(--accent-wisteria)]" style={{ width: `${Math.max(12, (duration / longest) * 100)}%` }} />
                  </span>
                </span>
              </button>
            </li>
          );
        })}
        <li className="shrink-0 self-center">
          <button
            type="button"
            onClick={addFrame}
            aria-label="+ Frame"
            data-testid="add-frame-button"
            title="Add a blank frame at the end"
            className="w-9 h-12 flex items-center justify-center rounded-[2px] border-2 border-dashed border-[var(--desk-border)] text-[var(--text-muted)] hover:text-[var(--accent-gold)] hover:border-[var(--accent-gold)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)]"
          >
            <PixelIcon name="plus" size={12} />
          </button>
        </li>
      </ol>

      <p className="hidden xl:block shrink-0 max-w-[180px] text-[11px] leading-snug text-[var(--text-muted)]">
        Longer bars stay on screen longer. Frames flip by like a flipbook.
      </p>
    </footer>
  );
};
