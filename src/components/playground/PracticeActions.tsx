'use client';
import { createContext, useContext } from 'react';

export interface PracticeActions {
  keep: () => void;
  returnToDrawing: () => void;
}
export const PracticeActionsContext = createContext<PracticeActions | null>(null);
export const usePracticeActions = () => useContext(PracticeActionsContext);
