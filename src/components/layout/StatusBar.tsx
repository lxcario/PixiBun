'use client';

import React, { useEffect, useState } from 'react';
import type { Point } from '@/lib/canvas/rasterMath';
import { useStudioStore } from '@/stores/studioStore';
import { subscribeCursorHUD } from '@/components/layout/CursorStatusBadge';
import { StudioBuddy } from '@/components/layout/StudioBuddy';
import { CANONICAL_TOOLS } from '@/config/shortcuts';

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
  const isDirty = useStudioStore((s) => s.isDirty);
  const saveStatus = useStudioStore((s) => s.saveStatus);
  const saveLabel = saveStatus === 'saving' ? 'Saving…' : saveStatus === 'error' ? 'Save issue' : isDirty ? 'Unsaved' : 'Saved';
  const saveTitle = saveStatus === 'saving' ? 'Saving changes to local storage…' : saveStatus === 'error' ? 'Save paused. Your artwork remains safe in memory.' : isDirty ? 'You have unsaved changes' : 'All changes saved to local storage';

  /* Derive active layer name */
  const activeLayer = frames[activeFrameIndex]?.layers.find(
    (l) => l.id === activeLayerId
  );
  const activeLayerName = activeLayer?.name;
  // Clipped layers keep paint that lands off the artwork below but never show it.
  const activeLayerClipped = activeLayer?.blendMode === 'source-atop';

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
      className="flex items-center h-6 px-[var(--space-4)] gap-[var(--space-5)] bg-[var(--desk-surface)] border-t border-[var(--desk-border)] text-[var(--text-muted)] font-mono text-[11px] select-none shrink-0"
    >
      <StudioBuddy />

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
        <span className="text-[var(--text-muted)]" title="Canvas size in pixels">
          {canvasWidth}×{canvasHeight}
        </span>
      </span>

      {/* Separator */}
      <span className="w-px h-3 bg-[var(--desk-border)]" />

      {/* Zoom Level */}
      <span className="text-[var(--text-muted)]" title="Zoom">{zoom}%</span>

      {/* Separator */}
      <span className="w-px h-3 bg-[var(--desk-border)]" />

      {/* Frame Position */}
      <span className="text-[var(--text-muted)]">
        Frame {activeFrameIndex + 1}/{frames.length}
      </span>

      {/* Separator */}
      <span className="w-px h-3 bg-[var(--desk-border)]" />

      {/* Active Layer */}
      <span className="truncate max-w-[140px] text-[var(--text-body)]" title="Active layer">
        {activeLayerName ?? 'No layer'}
      </span>
      {activeLayerClipped && (
        <span
          data-testid="status-bar-clip-hint"
          className="shrink-0 whitespace-nowrap text-[var(--accent-plum)]"
          title="This layer is set to On artwork only: paint shows only over artwork on the layers below. Change Blend in Layers, or pick another layer, to paint anywhere."
        >
          On artwork only
        </span>
      )}

      {/* Separator + Active Tool — push to far right */}
      <span className="flex-1" />

      {/* Selection Dimensions (if active) */}
      {selectionInfo && selectionInfo.w > 0 && selectionInfo.h > 0 && (
        <>
          <span className="text-[var(--accent-plum)]">
            Selection {selectionInfo.w}×{selectionInfo.h}
          </span>
          <span className="w-px h-3 bg-[var(--desk-border)]" />
        </>
      )}

      {/* Active Tool */}
      <span className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-wisteria)]" />
        <span className="text-[var(--accent-gold)]">
          {CANONICAL_TOOLS.find((tool) => tool.id === activeTool)?.label ?? activeTool}
        </span>
      </span>
      <span className="w-px h-3 shrink-0 bg-[var(--desk-border)]" />
      <span data-testid="status-bar-save-indicator" className="shrink-0">
        <span
          data-testid="save-status-badge"
          role="status"
          aria-live="polite"
          title={saveTitle}
          className={`h-5 px-2 flex items-center gap-1.5 whitespace-nowrap rounded-[2px] border ${
            saveStatus === 'error'
              ? 'bg-[var(--danger-bg)] border-[var(--danger-border)]/60 text-[var(--danger-fg)]'
              : saveStatus === 'saving' || isDirty
              ? 'bg-[var(--surface-0)] border-[var(--desk-border)] text-[var(--accent-gold)]'
              : 'bg-[var(--surface-0)] border-[var(--desk-border)] text-[var(--text-muted)]'
          }`}
        >
          <span aria-hidden="true" className={`w-1.5 h-1.5 shrink-0 rounded-full ${saveStatus === 'error' ? 'bg-[var(--state-danger)]' : saveStatus === 'saving' ? 'bg-[var(--accent-gold)] animate-pulse' : isDirty ? 'bg-[var(--accent-gold)]' : 'bg-[var(--accent-sage,#7d9d7f)]'}`} />
          <span>{saveLabel}</span>
        </span>
      </span>
    </div>
  );
});

StatusBar.displayName = 'StatusBar';
