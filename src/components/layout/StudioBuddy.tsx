'use client';

import React, { useEffect, useRef, useState } from 'react';
import { BunMascot } from '@/components/ui/BunMascot';
import { useStudioStore } from '@/stores/studioStore';

const CHEERS = ['nice pixels!', 'keep going ✦', 'ooh, cozy', 'tea break?', 'so tidy!', 'one more frame?', 'love that colour'];
const SLEEP_AFTER_MS = 60_000;

type Mood = 'idle' | 'happy' | 'sleepy';

/**
 * Bun, sitting in the status bar keeping you company: hops when you switch
 * tools, beams when your work is saved, dozes off when things go quiet, and
 * says something nice when booped.
 */
export const StudioBuddy: React.FC = () => {
  const activeTool = useStudioStore((s) => s.tools.activeTool);
  const saveStatus = useStudioStore((s) => s.saveStatus);
  const [mood, setMood] = useState<Mood>('idle');
  const [hop, setHop] = useState(0);
  const [bubble, setBubble] = useState<string | null>(null);
  const [heart, setHeart] = useState(false);
  const moodTimer = useRef<number | undefined>(undefined);
  const sleepTimer = useRef<number | undefined>(undefined);
  const firstTool = useRef(true);
  const lastSave = useRef(saveStatus);
  const cheer = useRef(0);

  const brighten = (ms: number) => {
    setMood('happy');
    window.clearTimeout(moodTimer.current);
    moodTimer.current = window.setTimeout(() => {
      setMood('idle');
      setBubble(null);
      setHeart(false);
    }, ms);
  };

  // Any change in the studio wakes Bun and restarts the nap countdown.
  useEffect(() => {
    const restart = () => {
      window.clearTimeout(sleepTimer.current);
      setMood((m) => (m === 'sleepy' ? 'idle' : m));
      sleepTimer.current = window.setTimeout(() => setMood('sleepy'), SLEEP_AFTER_MS);
    };
    restart();
    const unsubscribe = useStudioStore.subscribe(restart);
    return () => {
      unsubscribe();
      window.clearTimeout(sleepTimer.current);
      window.clearTimeout(moodTimer.current);
    };
  }, []);

  useEffect(() => {
    if (firstTool.current) {
      firstTool.current = false;
      return;
    }
    setHop((n) => n + 1);
  }, [activeTool]);

  useEffect(() => {
    if (lastSave.current === 'saving' && saveStatus === 'saved') {
      setHeart(true);
      setHop((n) => n + 1);
      brighten(1600);
    }
    lastSave.current = saveStatus;
  }, [saveStatus]);

  const boop = () => {
    setBubble(CHEERS[cheer.current++ % CHEERS.length]);
    setHop((n) => n + 1);
    brighten(1800);
  };

  return (
    <span className="relative flex items-center shrink-0">
      <button
        type="button"
        onClick={boop}
        title="Boop Bun"
        aria-label="Bun, your studio buddy. Boop for encouragement."
        data-testid="studio-buddy"
        className="relative w-5 h-5 grid place-items-center rounded-[2px] hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-gold)]"
      >
        <span key={hop} className={hop ? 'bun-hop block' : 'block'}>
          <BunMascot size={16} pose={mood === 'happy' ? 'happy' : mood === 'sleepy' ? 'blink' : 'idle'} animate={mood === 'idle'} />
        </span>
        {mood === 'sleepy' && (
          <span aria-hidden="true" className="bun-float absolute -top-1 right-0 text-[8px] font-bold text-[var(--accent-plum)] pointer-events-none">
            z
          </span>
        )}
        {heart && (
          <span aria-hidden="true" className="bun-float absolute -top-1 right-0 text-[9px] text-[#f2b8c6] pointer-events-none">
            ♥
          </span>
        )}
      </button>
      {bubble && (
        <span
          aria-hidden="true"
          className="absolute bottom-full left-0 mb-1.5 whitespace-nowrap px-2 py-0.5 rounded-[2px] border-2 border-[var(--btn-shadow)] bg-[var(--desk-surface-raised)] text-[var(--text-heading)] text-[10px] font-mono shadow-[0_2px_0_var(--btn-shadow)] pointer-events-none z-50"
        >
          {bubble}
        </span>
      )}
    </span>
  );
};
