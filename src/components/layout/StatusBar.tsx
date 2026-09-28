'use client';

import React, { useEffect, useState } from 'react';
import type { Point } from '@/lib/canvas/rasterMath';
import { useStudioStore } from '@/stores/studioStore';
import { subscribeCursorHUD } from '@/components/layout/CursorStatusBadge';

/* ── Status Bar Component ── */

export const StatusBar: React.FC = React.memo(() => {
  const [coords, setCoords] = useState<Point | null>(null);

  const activeTool = useStudioStore((s) => s.tools.activeTool);
  const canvasWidth = useStudioStore((s) => s.canvasWidth);
  const canvasHeight = useStudioStore((s) => s.canvasHeight);
  const zoom = useStudioStore((s) => s.zoom);
  const frames = useStudioStore((s) => s.frames);
  const activeFrameIndex = useStudioStore((s) => s.activeFrameIndex);
  const activeLayerId = useStudioStore((s) => s.activeLayerId);
  const selection = useStudioStore((s) => s.selection);

  /* Derive active layer name */
  const activeLayerName = frames[activeFrameIndex]?.layers.find(
    (l) => l.id === activeLayerId
  )?.name;

  /* Derive selection dimensions */
  const selectionInfo =
    selection != null
      ? {
          w: selection.x + selection.w > 0 ? selection.w : 0,
          h: selection.y + selection.h > 0 ? selection.h : 0,
        }
      : null;

  useEffect(() => {
    return subscribeCursorHUD((c) => setCoords(c));
  }, []);

  return (
    <div
      data-testid="status-bar"
      className="flex items-center h-6 px-[var(--space-4)] gap-[var(--space-5)] bg-[var(--desk-surface)] border-t border-[var(--desk-border)] text-[var(--text-muted)] font-mono text-[10px] select-none shrink-0"
    >
      {/* Cursor Coordinates */}
      <span
        data-testid="cursor-status-badge"
        className="flex items-center gap-1 min-w-[90px]"
      >
        {coords ? (
          <>
            <span className="text-[var(--accent-gold)]">
              X: {coords.x} Y: {coords.y}
            </span>
          </>
        ) : (
          <span className="text-[var(--text-body)]">X: — Y: —</span>
        )}
      </span>

      {/* Separator */}
      <span className="w-px h-3 bg-[var(--desk-border)]" />

      {/* Canvas Dimensions */}
      <span className="flex items-center gap-1">
        <span className="text-[var(--text-muted)]">
          {canvasWidth}×{canvasHeight}
        </span>
      </span>

      {/* Separator */}
      <span className="w-px h-3 bg-[var(--desk-border)]" />

      {/* Zoom Level */}
      <span className="text-[var(--text-muted)]">{zoom}%</span>

      {/* Separator */}
      <span className="w-px h-3 bg-[var(--desk-border)]" />

      {/* Frame Position */}
      <span className="text-[var(--text-muted)]">
        Frame {activeFrameIndex + 1}/{frames.length}
      </span>

      {/* Separator */}
      <span className="w-px h-3 bg-[var(--desk-border)]" />

      {/* Active Layer */}
      <span className="truncate max-w-[120px] text-[var(--text-body)]">
        {activeLayerName ?? 'No Layer'}
      </span>

      {/* Separator + Active Tool — push to far right */}
      <span className="flex-1" />

      {/* Selection Dimensions (if active) */}
      {selectionInfo && selectionInfo.w > 0 && selectionInfo.h > 0 && (
        <>
          <span className="text-[var(--accent-plum)]">
            Sel: {selectionInfo.w}×{selectionInfo.h}
          </span>
          <span className="w-px h-3 bg-[var(--desk-border)]" />
        </>
      )}

      {/* Active Tool */}
      <span className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-wisteria)]" />
        <span className="capitalize text-[var(--accent-gold)]">
          {activeTool}
        </span>
      </span>
    </div>
  );
});

StatusBar.displayName = 'StatusBar';
