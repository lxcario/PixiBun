'use client';

import React from 'react';
import { useStudioStore } from '@/stores/studioStore';

export const AutosaveIndicator: React.FC = () => {
  const saveStatus = useStudioStore((state) => state.saveStatus);

  let ledColorClass = 'bg-[var(--text-muted)] opacity-50'; // idle
  let pulseClass = '';
  let title = 'Saved locally';

  if (saveStatus === 'saving') {
    ledColorClass = 'bg-[#f0be7c]';
    pulseClass = 'animate-pulse';
    title = 'Saving...';
  } else if (saveStatus === 'saved') {
    ledColorClass = 'bg-[#f0be7c]';
    pulseClass = 'opacity-100 transition-opacity duration-1000'; // fade out effect conceptually, but idle takes over
    title = 'Saved locally';
  } else if (saveStatus === 'error') {
    ledColorClass = 'bg-[var(--color-danger)] opacity-100';
    pulseClass = 'animate-bounce'; // distinct error state
    title = 'Save failed!';
  }
  let text = 'Saved';
  if (saveStatus === 'saving') text = 'Saving...';
  if (saveStatus === 'error') text = 'Error';

  return (
    <div 
      className="hidden lg:flex items-center gap-1.5 px-2 py-0.5 rounded-[2px] bg-[var(--desk-surface-raised)] border border-[var(--desk-border)] text-[11px] font-mono text-[var(--text-body)] cursor-default select-none"
      title={title}
      aria-label={title}
    >
      <div 
        className={`w-1.5 h-1.5 rounded-full border border-black/20 shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)] transition-colors duration-300 ${ledColorClass} ${pulseClass}`} 
      />
      <span>{text}</span>
    </div>
  );
};
