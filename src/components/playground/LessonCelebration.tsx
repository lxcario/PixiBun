'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ModalWrapper } from '@/components/ui/ModalWrapper';
import { BunMascot } from '@/components/ui/BunMascot';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { FramePreviewCanvas } from '@/components/layout/BottomTimeline';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { useStudioStore } from '@/stores/studioStore';
import { coachForLesson } from '@/lib/art/playgroundCoach';
import { usePracticeActions } from './PracticeActions';
import { PixelBurst } from './PixelBurst';
import { usePlaygroundUi } from './playgroundUi';

/** The learner's own frames, looping at their real timings. */
const MyAnimation: React.FC<{ size: number }> = ({ size }) => {
  const frames = useStudioStore((s) => s.frames);
  const fps = useStudioStore((s) => s.fps);
  const reduceMotion = Boolean(useReducedMotion());
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (reduceMotion || frames.length < 2) return;
    const hold = frames[index]?.durationMs ?? Math.round(1000 / fps);
    const timer = setTimeout(() => setIndex((index + 1) % frames.length), hold);
    return () => clearTimeout(timer);
  }, [index, frames, fps, reduceMotion]);
  return (
    <span className="flex items-center justify-center [&>canvas]:w-full [&>canvas]:h-full" style={{ width: size, height: size }}>
      <FramePreviewCanvas frameIndex={Math.min(index, frames.length - 1)} maxSize={size} />
    </span>
  );
};

export const LessonCelebration: React.FC = () => {
  const practice = usePracticeActions();
  const step = useOnboardingStore((s) => s.getCurrentStep());
  const lesson = useOnboardingStore((s) => s.getCurrentLesson());
  const setPickerOpen = usePlaygroundUi((s) => s.setPickerOpen);
  const [open, setOpen] = useState(false);
  const [burst, setBurst] = useState<number | null>(null);
  const previous = useRef(step.type);

  // Open once on arriving at the end of a lesson.
  useEffect(() => {
    if (step.type === 'COMPLETE' && previous.current !== 'COMPLETE') {
      setOpen(true);
      setBurst(Date.now());
    }
    previous.current = step.type;
  }, [step.type]);

  const coach = coachForLesson(lesson);
  return (
    <ModalWrapper
      isOpen={open}
      onClose={() => setOpen(false)}
      title="Lesson complete"
      maxWidth="w-[440px]"
      className="!border-2 !border-[var(--ink)] !shadow-[0_8px_0_var(--ink)] !bg-[var(--desk-surface)] !p-5 overflow-visible"
      bodyClassName="flex flex-col items-center gap-4 text-center"
    >
      <div className="relative">
        <PixelBurst burstKey={burst} count={28} spread={150} />
        <motion.div
          initial={{ scale: 0.6, rotate: -6, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 360, damping: 18 }}
          className="relative p-3 border-2 border-[var(--ink)] bg-[var(--lesson-paper)] shadow-[0_5px_0_var(--ink)]"
        >
          <MyAnimation size={160} />
          <span className="absolute -bottom-4 -right-5 w-12 h-12 flex items-center justify-center border-2 border-[var(--ink)] bg-[var(--desk-surface-raised)] shadow-[0_2px_0_var(--ink)]">
            <BunMascot size={34} pose="happy" animate />
          </span>
        </motion.div>
      </div>
      <div>
        <p className="font-display text-2xl leading-tight text-[var(--text-heading)] [text-shadow:0_3px_0_var(--ink)]">You made it move!</p>
        <p className="mt-2 text-sm leading-relaxed text-[var(--text-body)]">
          That loop is your {coach.title}, drawn by you, frame by frame. {coach.bigIdea}
        </p>
      </div>
      <div className="w-full flex flex-col gap-2">
        <button
          type="button"
          data-autofocus
          onClick={practice?.keep}
          disabled={!practice}
          className="h-11 inline-flex items-center justify-center gap-2 rounded-[2px] pixel-primary-btn font-display text-sm cursor-pointer disabled:opacity-40"
        >
          Keep it in Studio <PixelIcon name="export" size={13} />
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => { setOpen(false); setPickerOpen(true); }}
            className="h-9 rounded-[2px] pixel-tactile-btn text-xs font-semibold text-[var(--text-heading)] cursor-pointer">
            Try another lesson
          </button>
          <button type="button" onClick={() => setOpen(false)}
            className="h-9 rounded-[2px] pixel-tactile-btn text-xs font-semibold text-[var(--text-heading)] cursor-pointer">
            Keep practicing
          </button>
        </div>
      </div>
    </ModalWrapper>
  );
};
