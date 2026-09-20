import React, { useEffect, useState } from 'react';
import type { Point } from '@/lib/canvas/rasterMath';
import { useStudioStore } from '@/stores/studioStore';

type CursorListener = (coords: Point | null) => void;
const listeners = new Set<CursorListener>();

/**
 * Updates the HUD cursor badge without triggering React re-renders in CenterViewport.
 */
export function updateCursorHUD(coords: Point | null) {
  listeners.forEach((fn) => fn(coords));
}

/**
 * Subscribe to cursor HUD updates. Returns an unsubscribe function.
 */
export function subscribeCursorHUD(handler: CursorListener): () => void {
  listeners.add(handler);
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
