'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { useStudioStore } from '@/stores/studioStore';
import { coachForFrame, coachForLesson, holdInWords, lessonScore, progressMessage } from '@/lib/art/playgroundCoach';
import { getTemplateGridSize } from '@/lib/art/playgroundLessons';
import { BunMascot } from '@/components/ui/BunMascot';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { usePracticeActions } from './PracticeActions';
import { LessonPreview } from './LessonPreview';
import { PixelBurst } from './PixelBurst';
import { MATCH_SCORE, useFrameScores, usePlaygroundUi } from './playgroundUi';
import { useLessonActions } from './useLessonActions';

const eyebrow = 'font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--accent-gold)]';
const secondaryBtn = 'inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-[2px] pixel-tactile-btn text-xs font-semibold text-[var(--text-heading)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)] disabled:opacity-40 disabled:cursor-not-allowed';
const primaryBtn = 'inline-flex items-center justify-center gap-2 h-11 px-4 whitespace-nowrap rounded-[2px] pixel-primary-btn font-display text-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--desk-surface)] disabled:opacity-40';

/** Ten chunky pixels that fill in as the drawing matches. */
const PixelMeter: React.FC<{ score: number; matched: boolean }> = ({ score, matched }) => {
  const filled = Math.round(Math.min(100, score) / 10);
  return (
    <div className="flex gap-[3px]" aria-hidden="true">
      {Array.from({ length: 10 }, (_, i) => (
        <motion.span
          key={i}
          className="h-3 flex-1 border border-[var(--ink)]"
          initial={false}
          animate={{
            backgroundColor: i < filled ? (matched ? 'var(--accent-sage)' : 'var(--accent-gold)') : 'var(--surface-0)',
            y: i < filled && matched ? [0, -3, 0] : 0,
          }}
          transition={{ duration: 0.25, delay: matched ? i * 0.03 : 0 }}
        />
      ))}
    </div>
  );
};

/** The lesson path: one pixel per frame, then Play and Done. Click any to jump there. */
const StepPath: React.FC<{ scores: number[] }> = ({ scores }) => {
  const steps = useOnboardingStore((s) => s.steps);
  const current = useOnboardingStore((s) => s.currentStepIndex);
  const setStepIndex = useOnboardingStore((s) => s.setStepIndex);
  const lesson = useOnboardingStore((s) => s.getCurrentLesson());
  return (
    <ol aria-label="Lesson steps" className="flex items-center gap-1 flex-wrap">
      {steps.map((step, index) => {
        const active = index === current;
        const matched = step.type === 'DRAW_FRAME' && step.frameIndex !== undefined && (scores[step.frameIndex] ?? 0) >= MATCH_SCORE;
        const label = step.type === 'DRAW_FRAME' && step.frameIndex !== undefined
          ? `Frame ${step.frameIndex + 1}: ${coachForFrame(lesson, step.frameIndex).title}`
          : step.type === 'PLAYBACK' ? 'Watch it play' : 'Finished';
        return (
          <li key={step.id}>
            <button
              type="button"
              onClick={() => { useStudioStore.getState().setIsPlaying(false); setStepIndex(index); }}
              aria-current={active ? 'step' : undefined}
              aria-label={`${label}${matched ? ' (done)' : ''}`}
              title={label}
              className="relative w-5 h-5 flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)] rounded-[1px]"
            >
              {active && (
                <motion.span layoutId="coach-step" className="absolute inset-0 border-2 border-[var(--accent-gold)] rounded-[1px]"
                  transition={{ type: 'spring', stiffness: 500, damping: 34 }} />
              )}
              <span className={`block border border-[var(--ink)] ${
                step.type === 'DRAW_FRAME' ? 'w-2.5 h-2.5' : 'w-2.5 h-2.5 rotate-45'
              } ${matched ? 'bg-[var(--accent-sage)]' : active ? 'bg-[var(--accent-gold)]' : index < current ? 'bg-[var(--desk-border-highlight)]' : 'bg-[var(--surface-0)]'}`} />
            </button>
          </li>
        );
      })}
    </ol>
  );
};

const Intro: React.FC = () => {
  const lesson = useOnboardingStore((s) => s.getCurrentLesson());
  const coach = coachForLesson(lesson);
  const dismissIntro = usePlaygroundUi((s) => s.dismissIntro);
  const showDemo = usePlaygroundUi((s) => s.showDemo);
  const setPickerOpen = usePlaygroundUi((s) => s.setPickerOpen);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-11 h-11 flex items-center justify-center border-2 border-[var(--ink)] bg-[var(--desk-surface-raised)] shadow-[0_2px_0_var(--ink)]">
          <BunMascot size={30} pose="happy" animate />
        </div>
        <div>
          <p className={eyebrow}>{coach.level}</p>
          <h2 className="mt-1 font-display text-xl leading-tight text-[var(--text-heading)]">Let&apos;s make {coach.title}</h2>
        </div>
      </div>
      <div className="relative self-center p-3 border-2 border-[var(--ink)] bg-[var(--lesson-paper)] shadow-[0_4px_0_var(--ink)]">
        <LessonPreview lesson={lesson} mode="loop" size={144} label={`${coach.title}: the finished animation`} />
        <span className="absolute left-3 right-3 bottom-[18px] h-px bg-[var(--desk-border)]" aria-hidden="true" />
      </div>
      <p className="text-sm leading-relaxed text-[var(--text-body)]">{coach.blurb}</p>
      <div className="border-l-4 border-[var(--accent-wisteria)] bg-[var(--desk-surface-raised)] px-3 py-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">The trick</p>
        <p className="mt-1 text-sm leading-snug text-[var(--text-heading)]">{coach.bigIdea}</p>
      </div>
      <p className="text-xs leading-relaxed text-[var(--text-muted)]">
        {lesson.totalFrames} frames to draw, one at a time. This is a scratch sheet: your Studio drawing is safe, and you can keep this practice when you like it.
      </p>
      <div className="sticky bottom-0 -mx-5 px-5 py-3 -mb-5 bg-[var(--desk-surface)] border-t-2 border-[var(--desk-border)] flex items-center gap-2">
        <button type="button" className={`${primaryBtn} flex-1`} onClick={() => { dismissIntro(lesson.id); showDemo(); }}>
          Let&apos;s start <span aria-hidden="true">→</span>
        </button>
        <button type="button" className={secondaryBtn} onClick={() => setPickerOpen(true)}>Other lessons</button>
      </div>
    </div>
  );
};

const DrawStep: React.FC<{ scores: number[] }> = ({ scores }) => {
  const lesson = useOnboardingStore((s) => s.getCurrentLesson());
  const step = useOnboardingStore((s) => s.getCurrentStep());
  const steps = useOnboardingStore((s) => s.steps);
  const prevStep = useOnboardingStore((s) => s.prevStep);
  const isPlaying = useStudioStore((s) => s.isPlaying);
  const frames = useStudioStore((s) => s.frames);
  const showDemo = usePlaygroundUi((s) => s.showDemo);
  const showGaps = usePlaygroundUi((s) => s.showGaps);
  const cue = usePlaygroundUi((s) => s.cue);
  const analysis = useOnboardingStore((s) => s.latestAnalysis);
  const { trace, copyPrevious, next } = useLessonActions();
  const reduceMotion = Boolean(useReducedMotion());

  const frameIndex = step.frameIndex ?? 0;
  const coach = coachForFrame(lesson, frameIndex);
  const template = lesson.frames[frameIndex];
  const score = scores[frameIndex] ?? 0;
  const matched = score >= MATCH_SCORE;
  const hold = frames[frameIndex]?.durationMs ?? template?.recommendedHoldMs ?? 100;
  // A drawing that spills well past the pose is held below a match; say why.
  const canvasWidth = useStudioStore((s) => s.canvasWidth);
  const cellPixels = template ? (canvasWidth / getTemplateGridSize(template)) ** 2 : 1;
  const messy = analysis !== null && lessonScore(analysis, cellPixels).messy;
  const nextStep = steps[step.stepIndex + 1];
  const nextLabel = nextStep?.type === 'DRAW_FRAME' && nextStep.frameIndex !== undefined
    ? `Next: ${coachForFrame(lesson, nextStep.frameIndex).title}`
    : 'Next: watch it play';

  // Celebrate the moment the drawing first matches, not on revisiting a finished frame.
  const [burst, setBurst] = useState<number | null>(null);
  const wasMatched = useRef(matched);
  useEffect(() => {
    if (matched && !wasMatched.current) setBurst(Date.now());
    wasMatched.current = matched;
  }, [matched]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <motion.div
          className="shrink-0 w-11 h-11 flex items-center justify-center border-2 border-[var(--ink)] bg-[var(--desk-surface-raised)] shadow-[0_2px_0_var(--ink)]"
          animate={burst && !reduceMotion ? { y: [0, -10, 0, -4, 0] } : { y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <BunMascot size={30} pose={matched ? 'happy' : 'idle'} animate />
        </motion.div>
        <div className="min-w-0">
          <p className={eyebrow}>Frame {frameIndex + 1} of {lesson.totalFrames}</p>
          <h2 className="mt-1 font-display text-xl leading-tight text-[var(--text-heading)]">{coach.title}</h2>
        </div>
      </div>

      <p className="text-sm leading-relaxed text-[var(--text-body)]">{coach.hint}</p>

      <div className="grid grid-cols-2 gap-2">
        <figure className="flex flex-col items-center gap-1.5 p-2 border-2 border-[var(--desk-border)] bg-[var(--surface-0)]">
          <LessonPreview lesson={lesson} mode="loop" size={84} label="The whole move, looping" className="bg-[var(--lesson-paper)] p-1 border border-[var(--desk-border)]" />
          <figcaption className="text-[11px] text-[var(--text-muted)]">The whole move</figcaption>
        </figure>
        <figure className="flex flex-col items-center gap-1.5 p-2 border-2 border-[var(--desk-border)] bg-[var(--surface-0)]">
          <LessonPreview lesson={lesson} mode="compare" frameIndex={frameIndex} size={84} label="This pose over a faint copy of the one before" className="bg-[var(--lesson-paper)] p-1 border border-[var(--desk-border)]" />
          <figcaption className="text-[11px] text-[var(--text-muted)]">What changes</figcaption>
        </figure>
      </div>

      <div className="relative flex flex-col gap-2 p-3 border-2 border-[var(--ink)] bg-[var(--desk-surface-raised)] shadow-[0_3px_0_var(--ink)]">
        <PixelBurst burstKey={burst} />
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">Your tracing</span>
          <AnimatePresence mode="popLayout" initial={false}>
            {matched ? (
              <motion.span key="matched"
                initial={reduceMotion ? { opacity: 0 } : { scale: 0.4, rotate: -12, opacity: 0 }}
                animate={{ scale: 1, rotate: -3, opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: 'spring', stiffness: 520, damping: 16 }}
                className="font-display text-xs px-2 py-0.5 border-2 border-[var(--ink)] bg-[var(--accent-sage)] text-[var(--ink)]">
                Matched!
              </motion.span>
            ) : (
              <motion.span key="score" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="font-mono text-xs tabular-nums text-[var(--text-heading)]">{score}%</motion.span>
            )}
          </AnimatePresence>
        </div>
        <PixelMeter score={score} matched={matched} />
        <p role="status" aria-live="polite" className="text-xs text-[var(--text-body)]">
          {progressMessage(score, matched, true, messy)}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={secondaryBtn} onClick={showDemo} disabled={isPlaying || cue?.kind === 'demo'}>
          <PixelIcon name="play" size={11} /> Show me
        </button>
        {score > 0 && !matched && (
          <button type="button" className={secondaryBtn} onClick={showGaps} disabled={isPlaying}>
            <PixelIcon name="eye" size={12} /> What&apos;s missing?
          </button>
        )}
        {frameIndex > 0 && score < MATCH_SCORE && (
          <button type="button" className={secondaryBtn} onClick={copyPrevious} disabled={isPlaying}
            title="Copy the last frame here, then change only what moves (you can Undo)">
            <PixelIcon name="copy" size={12} /> Start from last frame
          </button>
        )}
        <button type="button" onClick={trace} disabled={isPlaying}
          title="Fill this frame with the guide's pixels (you can Undo)"
          className="inline-flex items-center gap-1.5 h-9 px-1 text-xs text-[var(--text-muted)] underline underline-offset-4 decoration-dotted hover:text-[var(--text-heading)] cursor-pointer disabled:opacity-40">
          <PixelIcon name="sparkles" size={12} /> Trace it for me
        </button>
      </div>

      <p className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
        <PixelIcon name="clock-pixel" size={12} />
        <span>This frame stays on screen for {holdInWords(hold)} ({hold} ms).</span>
      </p>

      <div className="sticky bottom-0 -mx-5 px-5 py-3 -mb-5 bg-[var(--desk-surface)] border-t-2 border-[var(--desk-border)] flex items-center gap-2">
        {step.stepIndex > 0 && (
          <button type="button" className={secondaryBtn} onClick={() => { useStudioStore.getState().setIsPlaying(false); prevStep(); }}>
            <span aria-hidden="true">←</span> Back
          </button>
        )}
        <motion.button
          type="button"
          onClick={next}
          className={`${primaryBtn} flex-1`}
          animate={matched && !reduceMotion ? { scale: [1, 1.04, 1] } : { scale: 1 }}
          transition={matched ? { duration: 1.2, repeat: Infinity, repeatDelay: 0.6 } : { duration: 0.2 }}
        >
          <span className="truncate">{nextLabel}</span> <span aria-hidden="true">→</span>
        </motion.button>
      </div>
    </div>
  );
};

const PlayStep: React.FC = () => {
  const lesson = useOnboardingStore((s) => s.getCurrentLesson());
  const prevStep = useOnboardingStore((s) => s.prevStep);
  const isPlaying = useStudioStore((s) => s.isPlaying);
  const setIsPlaying = useStudioStore((s) => s.setIsPlaying);
  const slowMotion = usePlaygroundUi((s) => s.slowMotion);
  const setSlowMotion = usePlaygroundUi((s) => s.setSlowMotion);
  const coach = coachForLesson(lesson);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-11 h-11 flex items-center justify-center border-2 border-[var(--ink)] bg-[var(--desk-surface-raised)] shadow-[0_2px_0_var(--ink)]">
          <BunMascot size={30} pose="happy" animate />
        </div>
        <div>
          <p className={eyebrow}>All frames drawn</p>
          <h2 className="mt-1 font-display text-xl leading-tight text-[var(--text-heading)]">Watch it move!</h2>
        </div>
      </div>
      <p className="text-sm leading-relaxed text-[var(--text-body)]">
        Press Play. Your frames flip by like a flipbook, each one for its own little moment.
      </p>
      <div className="border-l-4 border-[var(--accent-wisteria)] bg-[var(--desk-surface-raised)] px-3 py-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">Look for</p>
        <p className="mt-1 text-sm leading-snug text-[var(--text-heading)]">{coach.bigIdea}</p>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" className={`${primaryBtn} flex-1`} onClick={() => setIsPlaying(!isPlaying)}>
          <PixelIcon name={isPlaying ? 'pause' : 'play'} size={13} /> {isPlaying ? 'Pause' : 'Play it'}
        </button>
        <button type="button" aria-pressed={slowMotion} className={`${secondaryBtn} ${slowMotion ? 'text-[var(--accent-gold)]' : ''}`} onClick={() => setSlowMotion(!slowMotion)}>
          Slow-mo
        </button>
      </div>
      <button type="button" className={`${secondaryBtn} self-start`} onClick={() => { setIsPlaying(false); prevStep(); }}>
        <span aria-hidden="true">←</span> Back to the last frame
      </button>
    </div>
  );
};

const DoneStep: React.FC = () => {
  const practice = usePracticeActions();
  const lesson = useOnboardingStore((s) => s.getCurrentLesson());
  const setStepIndex = useOnboardingStore((s) => s.setStepIndex);
  const setPickerOpen = usePlaygroundUi((s) => s.setPickerOpen);
  const coach = coachForLesson(lesson);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-11 h-11 flex items-center justify-center border-2 border-[var(--ink)] bg-[var(--desk-surface-raised)] shadow-[0_2px_0_var(--ink)]">
          <BunMascot size={30} pose="happy" animate />
        </div>
        <div>
          <p className={eyebrow}>Lesson complete</p>
          <h2 className="mt-1 font-display text-xl leading-tight text-[var(--text-heading)]">You made {coach.title}!</h2>
        </div>
      </div>
      <p className="text-sm leading-relaxed text-[var(--text-body)]">
        Keep it to carry on in Studio with layers, colors and exports, or try another lesson.
      </p>
      <button type="button" className={primaryBtn} onClick={practice?.keep} disabled={!practice}>
        Keep it in Studio <PixelIcon name="export" size={13} />
      </button>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={secondaryBtn} onClick={() => setPickerOpen(true)}>Try another lesson</button>
        <button type="button" className={secondaryBtn} onClick={() => setStepIndex(0)}>Back to frame 1</button>
      </div>
    </div>
  );
};

/** One instruction at a time, with a demo, live feedback and a clear next step. */
export const CoachPanel: React.FC = () => {
  const lesson = useOnboardingStore((s) => s.getCurrentLesson());
  const step = useOnboardingStore((s) => s.getCurrentStep());
  const introSeen = usePlaygroundUi((s) => Boolean(s.introSeen[lesson.id]));
  const scores = useFrameScores();
  const reduceMotion = Boolean(useReducedMotion());
  const showIntro = !introSeen && step.stepIndex === 0;
  const view = showIntro ? `intro-${lesson.id}` : `${lesson.id}-${step.id}`;

  return (
    <aside
      aria-label="Lesson coach"
      className="w-[340px] xl:w-[360px] shrink-0 h-full overflow-y-auto custom-scrollbar border-l-2 border-[var(--ink)] bg-[var(--desk-surface)] flex flex-col"
    >
      {!showIntro && (
        <div className="px-5 pt-4 pb-3 border-b-2 border-[var(--desk-border)] flex flex-col gap-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">{coachForLesson(lesson).title}</p>
          <StepPath scores={scores} />
        </div>
      )}
      <div className="relative flex-1 px-5 py-5">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={view}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -24 }}
            transition={{ duration: reduceMotion ? 0.12 : 0.26, ease: [0.22, 1, 0.36, 1] }}
          >
            {showIntro ? <Intro />
              : step.type === 'DRAW_FRAME' ? <DrawStep scores={scores} />
              : step.type === 'PLAYBACK' ? <PlayStep />
              : <DoneStep />}
          </motion.div>
        </AnimatePresence>
      </div>
    </aside>
  );
};
