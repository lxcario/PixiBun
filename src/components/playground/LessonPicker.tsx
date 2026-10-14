'use client';

import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ModalWrapper } from '@/components/ui/ModalWrapper';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { useStudioStore } from '@/stores/studioStore';
import { PLAYGROUND_LESSONS } from '@/lib/art/playgroundLessons';
import { LESSON_LEVELS, coachForLesson } from '@/lib/art/playgroundCoach';
import { studioEvents } from '@/lib/events/studioEvents';
import { LessonPreview } from './LessonPreview';
import { usePlaygroundUi } from './playgroundUi';

/** Every lesson as a little animated card, grouped from first steps to big projects. */
export const LessonPicker: React.FC = () => {
  const open = usePlaygroundUi((s) => s.pickerOpen);
  const setOpen = usePlaygroundUi((s) => s.setPickerOpen);
  const activeLessonId = useOnboardingStore((s) => s.activeLessonId);
  const selectLesson = useOnboardingStore((s) => s.selectLesson);
  const reduceMotion = Boolean(useReducedMotion());

  const choose = (id: string) => {
    useStudioStore.getState().setIsPlaying(false);
    if (id !== activeLessonId) selectLesson(id);
    setOpen(false);
  };

  return (
    <ModalWrapper
      isOpen={open}
      onClose={() => setOpen(false)}
      title="Choose a lesson"
      maxWidth="w-[760px]"
      className="!border-2 !border-[var(--ink)] !shadow-[0_8px_0_var(--ink)] !bg-[var(--desk-surface)] !p-5"
    >
      <p className="text-sm text-[var(--text-body)]">Each lesson is a short animation you draw one frame at a time. Start at the top if you are new.</p>
      {LESSON_LEVELS.map((level) => {
        const lessons = PLAYGROUND_LESSONS.filter(lesson => coachForLesson(lesson).level === level);
        if (!lessons.length) return null;
        return (
          <section key={level} aria-label={level} className="flex flex-col gap-2 pt-1">
            <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--accent-gold)]">{level}</h3>
            <ul className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {lessons.map((lesson, i) => {
                const coach = coachForLesson(lesson);
                const active = lesson.id === activeLessonId;
                return (
                  <motion.li key={lesson.id}
                    initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.03 * i, duration: 0.25 }}>
                    <button
                      type="button"
                      onClick={() => choose(lesson.id)}
                      aria-pressed={active}
                      className={`group w-full h-full flex flex-col items-center gap-2 p-2.5 text-center rounded-[2px] border-2 cursor-pointer transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)] hover:-translate-y-0.5 ${
                        active ? 'border-[var(--accent-gold)] bg-[var(--surface-3)] shadow-[0_3px_0_var(--ink)]' : 'border-[var(--desk-border)] bg-[var(--desk-surface-raised)] hover:border-[var(--desk-border-highlight)]'
                      }`}
                    >
                      <span className="p-1.5 border-2 border-[var(--ink)] bg-[var(--lesson-paper)]">
                        <LessonPreview lesson={lesson} mode="loop" size={80} />
                      </span>
                      <span className="font-display text-xs leading-tight text-[var(--text-heading)]">{coach.title}</span>
                      <span className="text-[11px] leading-snug text-[var(--text-muted)]">{lesson.totalFrames} frames{active ? ' · current' : ''}</span>
                    </button>
                  </motion.li>
                );
              })}
            </ul>
          </section>
        );
      })}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[var(--desk-border)]">
        <p className="text-xs text-[var(--text-muted)]">Want to study a full jump, frame by frame?</p>
        <button
          type="button"
          onClick={() => { setOpen(false); studioEvents.emit('pixibun:open-teaching-board'); }}
          title="Open 10-Frame Jump Anatomy Teaching Board"
          className="h-9 px-3 rounded-[2px] pixel-tactile-btn text-xs font-semibold text-[var(--text-heading)] cursor-pointer"
        >
          Open the jump study board
        </button>
      </div>
    </ModalWrapper>
  );
};
