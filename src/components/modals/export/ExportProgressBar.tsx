'use client';

import React from 'react';

interface ExportProgressBarProps {
  exportType: string;
  exportProgress: { current: number; total: number } | null;
}

export const ExportProgressBar: React.FC<ExportProgressBarProps> = ({
  exportType,
  exportProgress,
}) => {
  if (!exportProgress) return null;

  const total = Math.max(1, exportProgress.total);
  const current = exportProgress.current;
  const pct = Math.round((current / total) * 100);

  return (
    <div className="bg-[var(--desk-surface)] p-3 rounded-[2px] border-2 border-[#f0be7c] flex flex-col gap-2 shadow-md animate-pulse">
      <div className="flex items-center justify-between text-xs font-mono">
        <span className="text-[#f0be7c] font-bold">Encoding {exportType.toUpperCase()} via Browser Codec:</span>
        <span className="text-[var(--text-heading)] font-bold">
          {current} / {total} frames ({pct}%)
        </span>
      </div>
      <div className="w-full bg-[#181124] h-2.5 rounded-[2px] overflow-hidden border border-[var(--desk-border)]">
        <div
          className="bg-[#f0be7c] h-full transition-all duration-100 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};
