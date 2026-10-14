'use client';
import React from 'react';
import { PixelIcon } from '@/components/ui/PixelIcon';

interface PwaUpdateToastProps {
  onUpdate: () => void;
  onDismiss: () => void;
  updating?: boolean;
  error?: string | null;
}
export const PwaUpdateToast: React.FC<PwaUpdateToastProps> = ({ onUpdate, onDismiss, updating = false, error }) => (
  <aside aria-label="Application update notification" className="fixed bottom-4 right-4 z-[100] w-[26rem] max-w-[calc(100vw-2rem)] bg-[var(--desk-surface-raised)] border-2 border-[var(--desk-border)] p-3 rounded-[3px] shadow-[0_8px_20px_var(--shadow-far)] flex flex-wrap items-center gap-3 font-mono text-xs text-[var(--text-body)]">
    <div className="flex min-w-0 flex-1 items-center gap-2" role="status" aria-live="polite">
      <PixelIcon name="sun" size={14} />
      <span>{error ?? (updating ? 'Saving your work and restarting…' : 'Update ready · A fresh PixiBun build is ready. Tap to restart and apply it.')}</span>
    </div>
    <div className="flex items-center gap-1.5">
      <button type="button" onClick={onUpdate} disabled={updating} className="px-2.5 py-2 pixel-primary-btn font-bold rounded-[2px] cursor-pointer disabled:opacity-60 disabled:cursor-wait focus-visible:outline-2 focus-visible:outline-[var(--accent-gold)]">{updating ? 'Restarting…' : 'Restart to update'}</button>
      <button type="button" onClick={onDismiss} disabled={updating} className="px-2 py-2 text-[var(--text-muted)] hover:text-[var(--accent-gold)] cursor-pointer disabled:opacity-60" aria-label="Dismiss update banner">✕</button>
    </div>
  </aside>
);
