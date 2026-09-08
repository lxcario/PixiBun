'use client';

import React from 'react';

interface SpritesheetExportTabProps {
  layoutMode: 'horizontal' | 'vertical' | 'grid';
  setLayoutMode: (mode: 'horizontal' | 'vertical' | 'grid') => void;
  scale: number;
  setScale: (scale: number) => void;
  padding: number;
  setPadding: (padding: number) => void;
  includeMetadata: boolean;
  setIncludeMetadata: (include: boolean) => void;
}

export const SpritesheetExportTab: React.FC<SpritesheetExportTabProps> = ({
  layoutMode,
  setLayoutMode,
  scale,
  setScale,
  padding,
  setPadding,
  includeMetadata,
  setIncludeMetadata,
}) => {
  return (
    <div className="flex flex-col gap-2.5 bg-[var(--desk-surface)] p-3 rounded-[2px] border-2 border-[var(--desk-border)] text-xs font-mono shadow-xs">
      <div className="flex items-center justify-between">
        <span className="text-[var(--text-body)] font-bold">Layout Packing:</span>
        <div className="flex gap-1">
          {(['horizontal', 'vertical', 'grid'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setLayoutMode(mode)}
              className={`px-2 py-0.5 rounded-[2px] border capitalize font-bold cursor-pointer transition-colors ${
                layoutMode === mode
                  ? 'bg-[#f0be7c] text-[#140d1f] border-[#8c5120]'
                  : 'bg-[var(--desk-surface)] text-[var(--text-heading)] border-[var(--desk-border)] hover:border-[#f0be7c]'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[var(--text-body)] font-bold">Frame Scale:</span>
        <div className="flex gap-1">
          {[1, 2, 4].map((s) => (
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

      <div className="flex items-center justify-between">
        <span className="text-[var(--text-body)] font-bold">Padding:</span>
        <div className="flex gap-1">
          {[0, 1, 2, 4].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPadding(p)}
              className={`px-2 py-0.5 rounded-[2px] border font-bold cursor-pointer transition-colors ${
                padding === p
                  ? 'bg-[#f0be7c] text-[#140d1f] border-[#8c5120]'
                  : 'bg-[var(--desk-surface)] text-[var(--text-heading)] border-[var(--desk-border)] hover:border-[#f0be7c]'
              }`}
            >
              {p}px
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-[var(--desk-border)]">
        <span className="text-[var(--text-body)] font-bold">Engine Metadata (Godot & JSON):</span>
        <button
          type="button"
          onClick={() => setIncludeMetadata(!includeMetadata)}
          className={`px-2 py-0.5 rounded-[2px] border text-[10px] font-bold cursor-pointer transition-colors ${
            includeMetadata
              ? 'bg-[#f0be7c] text-[#140d1f] border-[#8c5120]'
              : 'bg-[var(--desk-surface)] text-[var(--text-body)] border-[var(--desk-border)]'
          }`}
        >
          {includeMetadata ? 'ENABLED' : 'OFF'}
        </button>
      </div>
    </div>
  );
};
