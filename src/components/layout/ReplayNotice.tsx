'use client';

import React from 'react';
import { PixelIcon } from '@/components/ui/PixelIcon';

export type ReplayState =
  | { phase: 'running' }
  | { phase: 'applied'; steps: number }
  /** `opened`: a new drawing was opened (the previous one saved) before the failure. */
  | { phase: 'error'; message: string; applied: number; opened: boolean };

/**
 * Outcome of a `?replay=` link. Success is announced by a toast and recorded on
 * a hidden status for tests; a link that could not be read, or a step that
 * failed, stays on screen until dismissed.
 */
export const ReplayNotice: React.FC<{ state: ReplayState | null; onDismiss: () => void }> = ({ state, onDismiss }) => {
  if (!state) return null;
  return (
    <>
      <p
        className="sr-only"
        data-testid="replay-status"
        data-state={state.phase}
        data-steps={state.phase === 'applied' ? state.steps : state.phase === 'error' ? state.applied : undefined}
      >
        {state.phase === 'running' ? 'Replaying the link…'
          : state.phase === 'applied' ? `Replayed ${state.steps} ${state.steps === 1 ? 'step' : 'steps'}.`
            : 'The replay link was not drawn.'}
      </p>
      {state.phase === 'error' && (
        <div
          role="alert"
          data-testid="replay-error"
          className="fixed top-12 left-1/2 -translate-x-1/2 z-40 max-w-xl w-[90%] bg-[var(--surface-1)] border border-[var(--danger-border)] shadow-2xl p-2.5 rounded-[4px] flex items-start justify-between gap-3 text-xs font-mono text-[var(--text-heading)]"
        >
          <div className="flex items-start gap-2 min-w-0">
            <PixelIcon name="warning" size={14} className="text-[var(--danger-fg)] shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="font-bold">Replay link not drawn</p>
              <p data-testid="replay-error-message" className="break-words">{state.message}</p>
              <p className="text-[var(--text-muted)]">
                {state.applied > 0
                  ? `The first ${state.applied} ${state.applied === 1 ? 'step was' : 'steps were'} drawn; Undo steps back through them.`
                  : state.opened ? 'A blank drawing was opened; your previous drawing was saved first.' : 'Your drawing is unchanged.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="p-1 text-[var(--text-muted)] hover:text-[var(--text-heading)] transition-colors cursor-pointer text-xs leading-none"
            aria-label="Dismiss replay message"
            data-testid="replay-error-dismiss"
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
};
