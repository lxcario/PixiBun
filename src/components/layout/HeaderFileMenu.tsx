'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence } from 'motion/react';
import { PixelIcon, type PixelIconName } from '@/components/ui/PixelIcon';
import { SpringSurface } from '@/components/ui/surfaces/SpringSurface';

interface FileAction {
  label: string;
  icon: PixelIconName;
  testId: string;
  onSelect: () => void;
}

/** Occasional document actions, with native menu keyboard navigation. */
export function HeaderFileMenu({ actions }: { actions: FileAction[] }) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const initialIndex = useRef(0);
  // Where the menu was, so it can melt away in place after closing.
  const shownAt = useRef<{ top: number; left: number } | null>(null);
  if (position) shownAt.current = position;

  const focusItem = (index: number) => {
    const items = menu.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]');
    if (!items?.length) return;
    const next = (index + items.length) % items.length;
    items.forEach((item, itemIndex) => { item.tabIndex = itemIndex === next ? 0 : -1; });
    items[next].focus();
  };

  const open = (last = false) => {
    const bounds = trigger.current?.getBoundingClientRect();
    if (!bounds) return;
    initialIndex.current = last ? actions.length - 1 : 0;
    setPosition({ top: bounds.bottom + 4, left: Math.max(8, Math.min(bounds.left, window.innerWidth - 232)) });
  };

  useEffect(() => {
    if (!position) return;
    focusItem(initialIndex.current);
    const outside = (event: PointerEvent) => {
      if (!menu.current?.contains(event.target as Node) && !trigger.current?.contains(event.target as Node)) setPosition(null);
    };
    // Closing on viewport movement avoids a detached or clipped menu.
    const close = () => setPosition(null);
    document.addEventListener('pointerdown', outside);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    return () => {
      document.removeEventListener('pointerdown', outside);
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [position]);

  return <>
    <button ref={trigger} type="button" data-testid="file-menu-button"
      aria-haspopup="menu" aria-expanded={Boolean(position)} aria-controls={position ? id : undefined}
      title="File: projects, new drawing, import and canvas size"
      onClick={() => position ? setPosition(null) : open()}
      onKeyDown={(event) => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault();
          open(event.key === 'ArrowUp');
        }
      }}
      className="h-7 px-2.5 flex items-center gap-1.5 text-xs pixel-tactile-btn rounded-[2px] border border-[var(--desk-border)] text-[var(--text-body)] hover:text-[var(--text-heading)]">
      File <span aria-hidden="true" className="text-[8px] text-[var(--text-muted)]">▼</span>
    </button>
    {typeof document !== 'undefined' && createPortal(<AnimatePresence>{position && <SpringSurface key="file" origin="top left" ref={menu} id={id} role="menu" tabIndex={-1} aria-label="File"
      style={shownAt.current ?? position}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget) && event.relatedTarget !== trigger.current) setPosition(null);
      }}
      onKeyDown={(event) => {
        const items = Array.from(menu.current!.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'));
        const index = items.findIndex((item) => item === document.activeElement);
        if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
          event.preventDefault();
          event.stopPropagation();
          focusItem(event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : index + (event.key === 'ArrowDown' ? 1 : -1));
        } else if (event.key === 'Escape' || event.key === 'Tab') {
          if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); }
          setPosition(null);
          trigger.current?.focus();
        }
      }}
      className="pb-panel pb-menu fixed z-[9999] w-56 max-w-[calc(100vw-16px)] !p-1.5 font-sans text-xs">
      {actions.map((action) => <button key={action.testId} type="button" role="menuitem" tabIndex={-1}
        data-testid={action.testId}
        onClick={() => { setPosition(null); trigger.current?.focus(); action.onSelect(); }}
        className="pb-menu-item">
        <span className="pb-chip" aria-hidden="true"><PixelIcon name={action.icon} size={13} /></span><span>{action.label}</span>
      </button>)}
    </SpringSurface>}</AnimatePresence>, document.body)}
  </>;
}
