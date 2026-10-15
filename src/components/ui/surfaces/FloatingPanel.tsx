'use client';

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, type HTMLMotionProps } from 'motion/react';
import { SpringSurface, originToward } from './SpringSurface';
import { useMorphHeight } from './useMorphHeight';

export type PanelPlacement = 'bottom-end' | 'bottom-start' | 'top-start' | 'top-end';
type Coords = { top?: number; bottom?: number; left?: number; right?: number; maxHeight: number };

const subscribeNothing = () => () => {};

/** Where a panel of `width` opens next to `anchor`; it flips above when there is more room there. */
export function placePanel(anchor: Pick<DOMRect, 'top' | 'bottom' | 'left' | 'right'>, viewport: { width: number; height: number }, placement: PanelPlacement, width: number, gap = 6): Coords {
  const margin = 12;
  const below = viewport.height - anchor.bottom - gap - margin;
  const above = anchor.top - gap - margin;
  const wantsTop = placement.startsWith('top');
  const top = wantsTop ? above >= 160 || above > below : below < 160 && above > below;
  const coords: Coords = top
    ? { bottom: viewport.height - anchor.top + gap, maxHeight: Math.max(120, above) }
    : { top: anchor.bottom + gap, maxHeight: Math.max(120, below) };
  if (placement.endsWith('end')) coords.right = Math.max(margin, viewport.width - anchor.right);
  else coords.left = Math.max(8, Math.min(anchor.left, viewport.width - width - 8));
  return coords;
}

interface FloatingPanelProps extends Omit<HTMLMotionProps<'div'>, 'ref' | 'children'> {
  open: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
  onClose: (reason: 'escape' | 'outside') => void;
  placement?: PanelPlacement;
  /** Expected width, used to keep start-aligned panels on screen. */
  width?: number;
  /** Follow the anchor while scrolling/resizing (default), or close instead. */
  onViewportChange?: 'follow' | 'close';
  /** Escape closes the panel and returns focus to the anchor (default true). */
  closeOnEscape?: boolean;
  /** Called once the panel is on screen, to place initial focus. */
  initialFocus?: (panel: HTMLDivElement) => void;
  panelRef?: React.Ref<HTMLDivElement>;
  children: React.ReactNode;
}

/**
 * The studio's popover shell: portalled to <body>, anchored to its trigger, blooming out of it on
 * the island's spring and melting back on close. It closes on outside press and Escape (focus
 * returns to the trigger), springs its height when its content changes, and scrolls when the
 * viewport is short. Keyboard behaviour inside (menus, radio groups) stays with the consumer.
 */
export function FloatingPanel({
  open, anchorRef, onClose, placement = 'bottom-end', width = 288, onViewportChange = 'follow',
  closeOnEscape = true, initialFocus, panelRef, className = '', style, children, ...rest
}: FloatingPanelProps) {
  const mounted = useSyncExternalStore(subscribeNothing, () => true, () => false);
  const [coords, setCoords] = useState<Coords | null>(null);
  const panel = useRef<HTMLDivElement | null>(null);
  const inner = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef(onClose);
  const focusRef = useRef(initialFocus);
  useEffect(() => { closeRef.current = onClose; focusRef.current = initialFocus; });

  const measure = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    setCoords(placePanel(anchor.getBoundingClientRect(), { width: window.innerWidth, height: window.innerHeight }, placement, width));
  }, [anchorRef, placement, width]);

  useLayoutEffect(() => { if (open) measure(); }, [open, measure]);

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (panel.current?.contains(target) || anchorRef.current?.contains(target)) return;
      closeRef.current('outside');
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !closeOnEscape || event.defaultPrevented) return;
      event.preventDefault();
      closeRef.current('escape');
      anchorRef.current?.focus();
    };
    const viewport = () => (onViewportChange === 'close' ? closeRef.current('outside') : measure());
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    window.addEventListener('resize', viewport);
    window.addEventListener('scroll', viewport, true);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
      window.removeEventListener('resize', viewport);
      window.removeEventListener('scroll', viewport, true);
    };
  }, [open, anchorRef, closeOnEscape, onViewportChange, measure]);

  // Initial focus once the panel exists (a frame later, after the portal has committed).
  useEffect(() => {
    if (!open || !coords) return;
    const frame = requestAnimationFrame(() => {
      if (panel.current && !panel.current.contains(document.activeElement)) focusRef.current?.(panel.current);
    });
    return () => cancelAnimationFrame(frame);
  }, [open, coords !== null]); // eslint-disable-line react-hooks/exhaustive-deps

  // Height springs only once the panel has fully bloomed, so every opening looks the same.
  const [entered, setEntered] = useState(false);
  useEffect(() => { if (!open) setEntered(false); }, [open]);
  useMorphHeight(panel, inner, { enabled: open && !!coords && entered });

  const setPanel = useCallback((node: HTMLDivElement | null) => {
    panel.current = node;
    if (typeof panelRef === 'function') panelRef(node);
    else if (panelRef) panelRef.current = node;
    // Bloom out of the trigger: offset geometry ignores the entrance scale.
    const anchor = anchorRef.current;
    if (node && anchor) {
      const box = new DOMRect(node.offsetLeft, node.offsetTop, node.offsetWidth, node.offsetHeight);
      node.style.transformOrigin = originToward(anchor.getBoundingClientRect(), box);
    }
  }, [anchorRef, panelRef]);

  if (!mounted) return null;
  return createPortal(
    <AnimatePresence onExitComplete={() => { if (!open) setCoords(null); }}>
      {open && coords && (
        <SpringSurface
          key="panel"
          ref={setPanel}
          data-surface="panel"
          onAnimationComplete={(definition: unknown) => { if (definition === 'open') setEntered(true); }}
          className={`pb-panel fixed z-[9999] overflow-y-auto overscroll-contain ${className}`}
          style={{ ...coords, maxHeight: coords.maxHeight, ...style }}
          {...rest}
        >
          <div ref={inner}>{children}</div>
        </SpringSurface>
      )}
    </AnimatePresence>,
    document.body,
  );
}
