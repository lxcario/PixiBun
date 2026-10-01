'use client';

import React, { useState, useRef, useEffect, useId } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface StudioTooltipProps {
  content: string;
  shortcut?: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  disabled?: boolean;
}

export default function StudioTooltip({
  content,
  shortcut,
  children,
  position = 'top',
  delay = 400,
  disabled = false,
}: StudioTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const id = useId();

  const handleMouseEnter = () => {
    if (disabled) return;
    // Hover followed by focus must share one timer; an older timer could
    // otherwise reopen a tooltip after the pointer and focus have left.
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      setIsVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }[position];

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
      aria-describedby={isVisible && !disabled ? id : undefined}
    >
      {children}
      {isVisible && !disabled && (
        <div
          id={id}
          role="tooltip"
          className={twMerge(
            clsx(
              'absolute z-50 pointer-events-none whitespace-nowrap flex items-center gap-2',
              'bg-[var(--surface-3)] border border-[var(--desk-border)] rounded-[var(--radius-md)]',
              'text-[var(--text-heading)] font-sans text-[11px]',
              'px-[var(--space-3)] py-[var(--space-2)]',
              'shadow-[0_2px_8px_rgba(0,0,0,0.3)]',
              'transition-opacity duration-150 ease-out',
              'motion-reduce:transition-none',
              positionClasses
            )
          )}
        >
          <span>{content}</span>
          {shortcut && (
            <kbd className="bg-[var(--surface-2)] text-[var(--text-muted)] font-mono text-[10px] px-1 rounded-[var(--radius-sm)] border border-[var(--desk-border)]">
              {shortcut}
            </kbd>
          )}
        </div>
      )}
    </div>
  );
}
