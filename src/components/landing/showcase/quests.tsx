'use client';

import React, { createContext, useContext, useMemo } from 'react';

/**
 * The workbench's little quests: each demo lists three things to try, and
 * ticks them off as soon as the visitor does them, so newcomers can see that
 * their clicks did something and what to try next.
 */

interface QuestApi {
  /** Indexes of the quests already tried on this demo. */
  done: ReadonlySet<number>;
  complete: (index: number) => void;
}

const NO_QUESTS: QuestApi = { done: new Set(), complete: () => {} };
const QuestContext = createContext<QuestApi>(NO_QUESTS);

export const QuestProvider: React.FC<{ done: ReadonlySet<number>; onComplete: (index: number) => void; children: React.ReactNode }> = ({
  done,
  onComplete,
  children,
}) => {
  const value = useMemo(() => ({ done, complete: onComplete }), [done, onComplete]);
  return <QuestContext.Provider value={value}>{children}</QuestContext.Provider>;
};

export function useQuests(): QuestApi {
  return useContext(QuestContext);
}
