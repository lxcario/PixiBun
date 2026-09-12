'use client';

import React from 'react';

interface PngExportTabProps {
  scale: number;
  setScale: (scale: number) => void;
  canvasWidth: number;
  canvasHeight: number;
}

export const PngExportTab: React.FC<PngExportTabProps> = ({
  scale,
  setScale,
  canvasWidth,
  canvasHeight,
}) => {
  return (
    <div className="flex flex-col gap-2.5 bg-[var(--desk-surface)] p-3 rounded-[2px] border-2 border-[var(--desk-border)] text-xs font-mono shadow-xs">
      <div className="flex items-center justify-between">
        <span className="text-[var(--text-body)] font-bold">Scale Resolution:</span>
        <div className="flex gap-1">
          {[1, 2, 4, 8, 16, 32].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setScale(s)}
              className={`px-2 py-0.5 rounded-[2px] border font-bold cursor-pointer transition-colors ${
                scale === s
                  ? 'bg-[#f0be7c] text-[#140d1f] border-[#8c5120]'
                  : 'bg-[var(--desk-surface)] text-[var(--text-heading)] border-[var(--desk-border)] hover:border-[#f0be7c]'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between text-[var(--text-body)]">
        <span className="font-bold">Output Size:</span>
        <span className="text-[#f0be7c] font-bold">
          {canvasWidth * scale} × {canvasHeight * scale} px
        </span>
      </div>
    </div>
  );
};
