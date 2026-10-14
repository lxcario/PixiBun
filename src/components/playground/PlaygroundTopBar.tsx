'use client';

import React from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { PixiBunLogo } from '@/components/ui/PixiBunLogo';
import { DayNightSwitch } from '@/components/landing/DayNightSwitch';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { coachForLesson } from '@/lib/art/playgroundCoach';
import { studioEvents } from '@/lib/events/studioEvents';
import { usePracticeActions } from './PracticeActions';
import { usePlaygroundUi } from './playgroundUi';

export const PlaygroundTopBar: React.FC = () => {
  const practice = usePracticeActions();
  const lesson = useOnboardingStore((s) => s.getCurrentLesson());
  const setPickerOpen = usePlaygroundUi((s) => s.setPickerOpen);
  const coach = coachForLesson(lesson);

  return (
    <header className="h-14 shrink-0 z-30 flex items-center justify-between gap-4 px-4 border-b-2 border-[var(--ink)] bg-[var(--desk-surface)]">
      <div className="flex items-center gap-3 min-w-0">
        <Link href="/" title="Return to PixiBun Home" className="flex items-center gap-2 shrink-0 rounded-[2px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)]">
          <PixiBunLogo showSubtitle={false} />
          <span className="hidden xl:inline font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--accent-gold)]">Playground</span>
        </Link>
        <span aria-hidden="true" className="w-0.5 h-6 bg-[var(--desk-border)]" />
        <button
          type="button"
          aria-haspopup="dialog"
          onClick={() => setPickerOpen(true)}
          title="Choose a different lesson"
          className="group min-w-0 flex items-center gap-2 h-10 pl-3 pr-2.5 rounded-[2px] border-2 border-[var(--desk-border)] bg-[var(--desk-surface-raised)] hover:border-[var(--accent-gold)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)]"
        >
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">Lesson</span>
          <AnimatePresence mode="wait" initial={false}>
            <motion.span key={lesson.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }} className="truncate font-display text-sm text-[var(--text-heading)]">
              {coach.title}
            </motion.span>
          </AnimatePresence>
          <span aria-hidden="true" className="text-[10px] text-[var(--text-muted)] group-hover:text-[var(--accent-gold)]">▾</span>
        </button>
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        <button
          type="button"
          onClick={() => studioEvents.emit('pixibun:open-teaching-board')}
          title="Open 10-Frame Jump Anatomy Teaching Board"
          aria-label="Open Teaching Board"
          className="w-10 h-10 flex items-center justify-center rounded-[2px] pixel-tactile-btn text-[var(--text-body)] hover:text-[var(--accent-gold)] cursor-pointer"
        >
          <svg width="18" height="18" viewBox="0 0 9 9" shapeRendering="crispEdges" aria-hidden="true" fill="currentColor">
            <path d="M0 1h4v1H1v5h3v1H0zM5 1h4v7H5V7h3V2H5z" /><path d="M4 2h1v6H4z" opacity=".6" />
          </svg>
        </button>
        <DayNightSwitch />
        <button
          type="button"
          onClick={practice?.returnToDrawing}
          disabled={!practice}
          title="Leave practice and bring back your Studio drawing"
          className="h-10 px-3 rounded-[2px] pixel-tactile-btn text-xs font-semibold text-[var(--text-heading)] cursor-pointer disabled:opacity-40"
        >
          Return to drawing
        </button>
        <button
          type="button"
          onClick={practice?.keep}
          disabled={!practice}
          title="Save this practice as a new Studio project"
          className="h-10 px-3.5 rounded-[2px] pixel-primary-btn text-xs font-bold cursor-pointer disabled:opacity-40"
        >
          Keep practice in Studio
        </button>
      </div>
    </header>
  );
};
