'use client';

import React, { useState, useId } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { PixelIcon, type PixelIconName } from '@/components/ui/PixelIcon';
import { Collapse } from '@/components/ui/surfaces/Collapse';

interface PanelSectionProps {
  title: string;
  ariaLabel?: string;
  description?: string;
  icon?: PixelIconName;
  children: React.ReactNode;
  defaultOpen?: boolean;
  storageKey?: string;
  actions?: React.ReactNode;
  className?: string;
}

export default function PanelSection({
  title,
  ariaLabel,
  description,
  icon,
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
  const descriptionId = useId();
  
  const toggleOpen = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, newState ? 'open' : 'closed');
      } catch {
        // Disclosure controls still work when storage is unavailable.
      }
    }
  };
  
  return (
    <section className={twMerge(clsx('flex flex-col w-full', description && 'border border-[var(--desk-border)] rounded-[2px] overflow-visible', className))}>
      <div 
        className={clsx(
          'flex items-center justify-between w-full select-none',
          isOpen ? 'bg-[var(--desk-surface-raised)]/60' : 'bg-[var(--surface-1)]',
          'hover:bg-[var(--surface-2)] transition-colors duration-100 border-b border-[var(--desk-border)]',
          description ? 'px-2.5 py-2' : 'px-3 py-1.5'
        )}
      >
        <h3 className="flex-1 min-w-0 m-0">
        <button
          type="button"
          onClick={toggleOpen}
          aria-expanded={isOpen}
          aria-controls={contentId}
          aria-label={ariaLabel || title}
          aria-describedby={description ? descriptionId : undefined}
          className="w-full min-h-6 flex items-center gap-2 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)] focus-visible:ring-inset py-0.5 rounded-[2px]"
        >
          {icon && <span aria-hidden="true" className="w-7 h-7 shrink-0 flex items-center justify-center rounded-[2px] bg-[var(--surface-3)] text-[var(--accent-gold)]"><PixelIcon name={icon} size={14} /></span>}
          <span className="min-w-0 flex-1 flex flex-col gap-0.5 font-sans">
            <span className="text-xs font-semibold text-[var(--text-heading)] tracking-normal">{title}</span>
            {description && <span id={descriptionId} className="text-[10px] font-normal leading-4 text-[var(--text-muted)]">{description}</span>}
          </span>
          <span aria-hidden="true" data-open={isOpen || undefined} className="pb-disclosure-chevron text-[var(--text-muted)] text-[10px] w-[10px] inline-block shrink-0">▸</span>
        </button>
        </h3>
        
        {actions && (
          <div className="flex items-center shrink-0 ml-2">
            {actions}
          </div>
        )}
      </div>
      
      <Collapse open={isOpen} id={contentId} innerClassName="p-2.5">
        {children}
      </Collapse>
    </section>
  );
}
