'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence } from 'motion/react';
import { SpringSurface } from '@/components/ui/surfaces/SpringSurface';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { DrawingToolPreview } from '@/components/ui/ToolMotionPreview';
import { TOOL_METADATA_MAP, type ToolSlot } from '@/config/shortcuts';
import type { ToolType } from '@/types/tools';

interface ToolSlotButtonProps {
  slot: ToolSlot;
  /** The tool this slot shows: the active one if it belongs here, else the last used. */
  shown: ToolType;
  active: boolean;
  onChoose: (tool: ToolType) => void;
}

const FLYOUT_GAP = 6;
const VIEWPORT_MARGIN = 8;

const HOLD_MS = 350;

/**
 * One compact toolbar slot: a button for the shown tool. For groups, the same
 * button opens the group's other tools beside it on right-click, press and
 * hold, or the Right/Down arrow keys; a corner triangle marks those slots.
 */
export function ToolSlotButton({ slot, shown, active, onChoose }: ToolSlotButtonProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  // Where the flyout was, so it can melt away in place after closing.
  const shownAt = useRef<{ left: number; top: number } | null>(null);
  if (position) shownAt.current = position;
  const slotRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);
  const holdTimerRef = useRef<number | null>(null);
  const heldOpenRef = useRef(false);
  const flyoutRef = useRef<HTMLDivElement>(null);
  const meta = TOOL_METADATA_MAP[shown];
  const grouped = slot.tools.length > 1;

  const place = useCallback(() => {
    const rect = slotRef.current?.getBoundingClientRect();
    if (!rect) return;
    const height = flyoutRef.current?.offsetHeight ?? slot.tools.length * 34 + 30;
    const top = Math.max(VIEWPORT_MARGIN, Math.min(rect.top - 4, window.innerHeight - height - VIEWPORT_MARGIN));
    setPosition({ left: rect.right + FLYOUT_GAP, top });
  }, [slot.tools.length]);

  const openFlyout = useCallback(() => { place(); setOpen(true); }, [place]);
  const close = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) openerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    // Measure the real height once it renders, then keep it inside the window.
    place();
    const first = flyoutRef.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]')
      ?? flyoutRef.current?.querySelector<HTMLButtonElement>('button');
    first?.focus();
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!flyoutRef.current?.contains(target) && !slotRef.current?.contains(target)) close(false);
    };
    const onResize = () => close(false);
    document.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('resize', onResize);
    };
  }, [close, open, place]);

  const onFlyoutKeyDown = (e: React.KeyboardEvent) => {
    const items = Array.from(flyoutRef.current?.querySelectorAll<HTMLButtonElement>('button') ?? []);
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    let next = -1;
    if (e.key === 'ArrowDown') next = (index + 1) % items.length;
    else if (e.key === 'ArrowUp') next = (index - 1 + items.length) % items.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = items.length - 1;
    else if (e.key === 'Escape' || e.key === 'ArrowLeft') { e.preventDefault(); e.stopPropagation(); close(true); return; }
    else if (e.key === 'Tab') { close(false); return; }
    if (next >= 0) { e.preventDefault(); items[next]?.focus(); }
  };

  const cancelHold = () => {
    if (holdTimerRef.current !== null) window.clearTimeout(holdTimerRef.current);
    holdTimerRef.current = null;
  };
  useEffect(() => cancelHold, []);

  return (
    <div ref={slotRef} className="relative inline-flex" data-tool-slot={slot.id} data-tools={slot.tools.join(' ')}>
      <DrawingToolPreview toolId={shown}>
        <button
          ref={openerRef}
          type="button"
          onClick={() => {
            // A press and hold already opened the flyout; that release is not a click.
            if (heldOpenRef.current) { heldOpenRef.current = false; return; }
            onChoose(shown);
          }}
          onContextMenu={grouped ? (e) => { e.preventDefault(); cancelHold(); openFlyout(); } : undefined}
          onPointerDown={grouped ? (e) => {
            if (e.button !== 0) return;
            heldOpenRef.current = false;
            cancelHold();
            holdTimerRef.current = window.setTimeout(() => { heldOpenRef.current = true; openFlyout(); }, HOLD_MS);
          } : undefined}
          onPointerUp={grouped ? cancelHold : undefined}
          onPointerLeave={grouped ? cancelHold : undefined}
          onKeyDown={grouped ? (e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); openFlyout(); }
          } : undefined}
          aria-label={meta.label}
          aria-pressed={active}
          aria-haspopup={grouped ? 'menu' : undefined}
          aria-expanded={grouped ? open : undefined}
          aria-keyshortcuts={grouped ? 'ArrowRight' : undefined}
          title={`${meta.label} (${meta.shortcut})${grouped ? ` · hold or right-click for more ${slot.label.toLowerCase()}` : ''}`}
          data-testid={`${shown}-tool`}
          data-tutorial={`${shown}-tool`}
          className={`relative w-9 h-9 rounded-[2px] flex items-center justify-center cursor-pointer transition-all ${
            active
              ? 'pixel-primary-btn font-bold shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_1px_0_var(--btn-shadow)] ring-2 ring-[var(--accent-gold)] ring-offset-1 ring-offset-[var(--desk-surface)] z-10'
              : 'pixel-tactile-btn text-[var(--text-body)] hover:text-[var(--text-heading)]'
          }`}
        >
          <PixelIcon name={meta.icon} size={16} />
          {grouped && (
            // A small pixel corner triangle, like a folded page: more tools here.
            <svg viewBox="0 0 4 4" width="6" height="6" aria-hidden="true" shapeRendering="crispEdges"
              className="absolute bottom-[3px] right-[3px] pointer-events-none opacity-70">
              <path d="M4 0V4H0z" fill="currentColor" />
            </svg>
          )}
        </button>
      </DrawingToolPreview>
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
        {open && shownAt.current && (
        <SpringSurface
          key="flyout"
          ref={flyoutRef}
          origin="left center"
          role="menu"
          aria-label={slot.label}
          data-testid={`tool-flyout-${slot.id}`}
          onKeyDown={onFlyoutKeyDown}
          style={{ left: shownAt.current.left, top: shownAt.current.top }}
          className="pb-panel fixed z-[9500] min-w-[200px] !p-1.5"
        >
          <div className="px-2 pt-1 pb-1.5 text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)]">{slot.label}</div>
          {slot.tools.map(tool => {
            const item = TOOL_METADATA_MAP[tool];
            const current = tool === shown;
            return (
              <button
                key={tool}
                type="button"
                role="menuitemradio"
                aria-checked={current}
                onClick={() => { onChoose(tool); close(false); }}
                // The shown tool already owns this test id on the slot button.
                data-testid={current ? undefined : `${tool}-tool`}
                className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-[3px] text-left text-xs cursor-pointer outline-none ${
                  current
                    ? 'bg-[var(--primary-bg)] text-[var(--primary-fg)]'
                    : 'text-[var(--text-body)] hover:bg-[var(--menu-hover,var(--surface-2))] focus-visible:bg-[var(--menu-hover,var(--surface-2))] hover:text-[var(--text-heading)]'
                }`}
              >
                <PixelIcon name={item.icon} size={14} />
                <span className="flex-1">{item.label}</span>
                <kbd className={`font-mono text-[10px] ${current ? 'opacity-80' : 'text-[var(--text-muted)]'}`}>{item.shortcut}</kbd>
              </button>
            );
          })}
        </SpringSurface>
        )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}
