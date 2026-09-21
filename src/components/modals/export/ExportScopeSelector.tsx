'use client';

import React from 'react';
import type { AnimationClip } from '@/types/animation';

interface ExportScopeSelectorProps {
  clips: AnimationClip[];
  selectedClipId: string | 'all';
  onSelectClipId: (id: string | 'all') => void;
  isExporting: boolean;
  totalFrames: number;
}

export const ExportScopeSelector: React.FC<ExportScopeSelectorProps> = ({
  clips,
  selectedClipId,
  onSelectClipId,
  isExporting,
  totalFrames,
}) => {
  if (clips.length === 0) return null;

  return (
    <div className="flex items-center justify-between bg-[var(--desk-surface)] px-3 py-2 rounded-[2px] border-2 border-[var(--desk-border)] text-xs font-mono">
      <span className="text-[var(--text-body)] font-bold">Export Scope:</span>
      <select
        value={selectedClipId}
        aria-label="Export frame scope"
        disabled={isExporting}
        onChange={(e) => onSelectClipId(e.target.value)}
        className="bg-[var(--surface-0)] text-[var(--text-heading)] font-bold text-xs font-mono px-2.5 py-1 rounded-[2px] border border-[var(--desk-border)] outline-none cursor-pointer focus:border-[#f0be7c]"
      >
        <option value="all">All Frames (1–{totalFrames})</option>
        {clips.map((clip) => (
          <option key={clip.id} value={clip.id}>
            {clip.name} (Frames {clip.startFrame + 1}–{clip.endFrame + 1})
          </option>
        ))}
      </select>
    </div>
  );
};
