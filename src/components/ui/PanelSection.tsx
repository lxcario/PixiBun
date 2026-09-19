'use client';

import React, { useState, useId } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface PanelSectionProps {
  title: string;
  ariaLabel?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  storageKey?: string;
  actions?: React.ReactNode;
  className?: string;
}

export default function PanelSection({
  title,
  ariaLabel,
  children,
  defaultOpen = true,
  storageKey,
  actions,
  className,
}: PanelSectionProps) {
  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window !== 'undefined' && storageKey) {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored === 'open') return true;
        if (stored === 'closed') return false;
      } catch {
        // Fall back to defaultOpen if storage inaccessible
      }
    }
    return defaultOpen;
  });
  const contentId = useId();
  
  const toggleOpen = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    if (storageKey) {
      localStorage.setItem(storageKey, newState ? 'open' : 'closed');
    }
  };
  
  return (
    <section className={twMerge(clsx('flex flex-col w-full', className))}>
      <div 
        className={clsx(
          'flex items-center justify-between w-full select-none',
          isOpen ? 'bg-[var(--desk-surface-raised)]/60' : 'bg-[var(--surface-1)]',
          'hover:bg-[var(--surface-2)] transition-colors duration-100 border-b border-[var(--desk-border)]',
          'px-3 py-1.5'
        )}
      >
        <button
          type="button"
          onClick={toggleOpen}
          aria-expanded={isOpen}
          aria-controls={contentId}
          aria-label={ariaLabel || title}
          className="flex items-center gap-2 flex-1 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)] focus-visible:ring-inset py-0.5 rounded-[2px]"
        >
          <span className="text-[var(--text-muted)] text-[10px] w-[10px] inline-block shrink-0">
            {isOpen ? '▾' : '▸'}
          </span>
          <h3 className="font-sans text-xs font-semibold text-[var(--text-heading)] m-0 tracking-normal select-none">
            {title}
          </h3>
        </button>
        
        {actions && (
          <div className="flex items-center shrink-0 ml-2">
            {actions}
          </div>
        )}
      </div>
      
      <div 
        id={contentId}
        className={clsx(
          !isOpen ? 'hidden' : 'p-2.5 animate-in fade-in duration-150'
        )}
      >
        {children}
      </div>
    </section>
  );
}
