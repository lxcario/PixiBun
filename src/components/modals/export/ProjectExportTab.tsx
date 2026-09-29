'use client';

import React from 'react';

interface ProjectExportTabProps {
  totalFrames: number;
}

export const ProjectExportTab: React.FC<ProjectExportTabProps> = ({ totalFrames }) => {
  return (
    <div className="flex flex-col gap-2 bg-[var(--desk-surface)] p-3 rounded-[2px] border-2 border-[var(--desk-border)] text-xs font-mono shadow-xs">
      <p className="text-[var(--text-body)] leading-relaxed font-medium">
        Keep a portable .pixibun copy outside this browser. It includes all {totalFrames} frames, layers, palettes, and timing.
      </p>
    </div>
  );
};
