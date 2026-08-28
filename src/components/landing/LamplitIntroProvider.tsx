'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export type IntroStage = 'twilight' | 'lighting' | 'awake' | 'complete';

interface LamplitIntroContextValue {
  stage: IntroStage;
  isFirstVisit: boolean;
  skipIntro: () => void;
}

const LamplitIntroContext = createContext<LamplitIntroContextValue>({
  stage: 'complete',
  isFirstVisit: false,
  skipIntro: () => {},
});

export const useLamplitIntro = () => useContext(LamplitIntroContext);

const INTRO_STORAGE_KEY = 'pixibun_intro_seen_v1';

export const LamplitIntroProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [stage, setStage] = useState<IntroStage>('complete');
  const [isFirstVisit, setIsFirstVisit] = useState(false);

  const skipIntro = useCallback(() => {
    setStage('complete');
    try {
      sessionStorage.setItem(INTRO_STORAGE_KEY, 'true');
    } catch {
      // ignore storage error
    }
  }, []);

  useEffect(() => {
    // Check if intro has already been seen in this session
    let seen: boolean;
    try {
      seen = sessionStorage.getItem(INTRO_STORAGE_KEY) === 'true';
    } catch {
      seen = false;
    }

    if (seen) {
      setStage('complete');
      return;
    }

    // First visit: start twilight sequence
    setIsFirstVisit(true);
    setStage('twilight');

    const t1 = setTimeout(() => {
      setStage('lighting');
    }, 250);

    const t2 = setTimeout(() => {
      setStage('awake');
    }, 650);

    const t3 = setTimeout(() => {
      setStage('complete');
      try {
        sessionStorage.setItem(INTRO_STORAGE_KEY, 'true');
      } catch {
        // ignore
      }
    }, 1200);

    // Fast-forward on early user interaction (scroll or click)
    const handleEarlyInteraction = () => {
      skipIntro();
    };

    window.addEventListener('pointerdown', handleEarlyInteraction, { once: true });
    window.addEventListener('scroll', handleEarlyInteraction, { once: true, passive: true });

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      window.removeEventListener('pointerdown', handleEarlyInteraction);
      window.removeEventListener('scroll', handleEarlyInteraction);
    };
  }, [skipIntro]);

  return (
    <LamplitIntroContext.Provider value={{ stage, isFirstVisit, skipIntro }}>
      {children}
    </LamplitIntroContext.Provider>
  );
};
