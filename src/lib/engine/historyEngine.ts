import type { HistoryStep } from '@/types/canvas';
export type { HistoryStep };

export interface HistoryEngine {
  /** Push a completed stroke snapshot; drops redo tail, prunes to maxDepth (50), returns new undo depth. */
  push(step: HistoryStep): number;
  /** Pop undo stack; if currentState is provided, pushes it to redo stack; returns the step to restore, or null if nothing to undo. */
  undo(currentState?: HistoryStep): HistoryStep | null;
  /** Pop redo stack; if currentState is provided, pushes it to undo stack; returns the step to restore, or null if nothing to redo. */
  redo(currentState?: HistoryStep): HistoryStep | null;
  /** Peek at the top of the undo stack without popping. */
  peekUndo(): HistoryStep | null;
  /** Peek at the top of the redo stack without popping. */
  peekRedo(): HistoryStep | null;
  /** Clear both stacks (new drawing, canvas resize, frame switch). */
  clear(): void;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly depth: number;
}

export function createHistoryEngine(maxDepth: number = 50): HistoryEngine {
  const limit = Math.max(1, maxDepth);
  let undoStack: HistoryStep[] = [];
  let redoStack: HistoryStep[] = [];

  return {
    push(step: HistoryStep): number {
      undoStack.push(step);
      while (undoStack.length > limit) {
        undoStack.shift();
      }
      redoStack = [];
      return undoStack.length;
    },

    undo(currentState?: HistoryStep): HistoryStep | null {
      if (undoStack.length === 0) return null;
      const step = undoStack.pop()!;
      if (currentState) {
        redoStack.push(currentState);
      } else {
        redoStack.push(step);
      }
      while (redoStack.length > limit) {
        redoStack.shift();
      }
      return step;
    },

    redo(currentState?: HistoryStep): HistoryStep | null {
      if (redoStack.length === 0) return null;
      const step = redoStack.pop()!;
      if (currentState) {
        undoStack.push(currentState);
      } else {
        undoStack.push(step);
      }
      while (undoStack.length > limit) {
        undoStack.shift();
      }
      return step;
    },

    peekUndo(): HistoryStep | null {
      return undoStack.length > 0 ? undoStack[undoStack.length - 1] : null;
    },

    peekRedo(): HistoryStep | null {
      return redoStack.length > 0 ? redoStack[redoStack.length - 1] : null;
    },

    clear(): void {
      undoStack = [];
      redoStack = [];
    },

    get canUndo(): boolean {
      return undoStack.length > 0;
    },

    get canRedo(): boolean {
      return redoStack.length > 0;
    },

    get depth(): number {
      return undoStack.length;
    },
  };
}
