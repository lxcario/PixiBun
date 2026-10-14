import React, { useEffect, useState } from 'react';
import type { Point } from '@/lib/canvas/rasterMath';
import { useStudioStore } from '@/stores/studioStore';

type CursorListener = (coords: Point | null) => void;
const listeners = new Set<CursorListener>();
let current: Point | null = null;

/**
 * Updates the HUD cursor badge without triggering React re-renders in CenterViewport.
 * Pointer moves within the same canvas pixel are dropped: at high zoom most moves stay
 * inside one pixel, and re-rendering every subscriber for each one can flood React with
 * updates when a backlog of pointer events is dispatched at once.
 */
export function updateCursorHUD(coords: Point | null) {
  if (coords === current || (coords && current && coords.x === current.x && coords.y === current.y)) return;
  current = coords ? { x: coords.x, y: coords.y } : null;
  listeners.forEach((fn) => fn(current));
}

/**
 * Subscribe to cursor HUD updates; the handler first receives the current value.
 * Returns an unsubscribe function.
 */
export function subscribeCursorHUD(handler: CursorListener): () => void {
  listeners.add(handler);
  handler(current);
  return () => {
    listeners.delete(handler);
  };
}

export const CursorStatusBadge: React.FC = React.memo(() => {
  const [coords, setCoords] = useState<Point | null>(null);
  const activeTool = useStudioStore((state) => state.tools.activeTool);

  useEffect(() => subscribeCursorHUD(setCoords), []);

  if (!coords) return null;

  return (
    <div
      data-testid="cursor-status-badge"
      className="absolute bottom-4 right-4 z-20 flex items-center gap-2 bg-[var(--desk-surface-raised)] border-2 border-[var(--desk-border)] rounded-[2px] shadow-[0_2px_0_var(--btn-shadow)] text-[var(--accent-gold)] font-mono text-[10px] px-2.5 py-1 pointer-events-none select-none"
    >
      <span>X: {coords.x} Y: {coords.y}</span>
      <span className="w-1 h-1 rounded-full bg-[var(--accent-wisteria)]" />
      <span className="capitalize">{activeTool}</span>
    </div>
  );
});

CursorStatusBadge.displayName = 'CursorStatusBadge';
