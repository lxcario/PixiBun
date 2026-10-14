'use client';

import React from 'react';

import { MAX_SAFE_CANVAS_DIMENSION, MAX_SAFE_CANVAS_PIXELS } from '@/config/canvasLimits';
export { MAX_SAFE_CANVAS_DIMENSION, MAX_SAFE_CANVAS_PIXELS };

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
  const currentOutputW = canvasWidth * scale;
  const currentOutputH = canvasHeight * scale;
  const currentPixels = currentOutputW * currentOutputH;
  const memoryMb = (currentPixels * 4) / (1024 * 1024);

  // Auto-clamp if the active scale exceeds safe limits
  React.useEffect(() => {
    if (
      currentOutputW > MAX_SAFE_CANVAS_DIMENSION ||
      currentOutputH > MAX_SAFE_CANVAS_DIMENSION ||
      currentPixels > MAX_SAFE_CANVAS_PIXELS
    ) {
      const safeScales = [32, 16, 8, 4, 2, 1].filter((s) => {
        const w = canvasWidth * s;
        const h = canvasHeight * s;
        return w <= MAX_SAFE_CANVAS_DIMENSION && h <= MAX_SAFE_CANVAS_DIMENSION && w * h <= MAX_SAFE_CANVAS_PIXELS;
      });
      if (safeScales.length > 0) {
        setScale(safeScales[0]);
      }
    }
  }, [canvasWidth, canvasHeight, currentOutputW, currentOutputH, currentPixels, setScale]);

  const hasDisabledScales = [1, 2, 4, 8, 16, 32].some((s) => {
    const outW = canvasWidth * s;
    const outH = canvasHeight * s;
    return outW > MAX_SAFE_CANVAS_DIMENSION || outH > MAX_SAFE_CANVAS_DIMENSION || outW * outH > MAX_SAFE_CANVAS_PIXELS;
  });

  return (
    <div className="flex flex-col gap-2.5 bg-[var(--desk-surface)] p-3 rounded-[2px] border-2 border-[var(--desk-border)] text-xs font-mono shadow-xs">
      <div className="flex items-center justify-between">
        <span className="text-[var(--text-body)] font-bold">Scale Resolution:</span>
        <div className="flex gap-1">
          {[1, 2, 4, 8, 16, 32].map((s) => {
            const outW = canvasWidth * s;
            const outH = canvasHeight * s;
            const totalPx = outW * outH;
            const exceedsCeiling =
              outW > MAX_SAFE_CANVAS_DIMENSION ||
              outH > MAX_SAFE_CANVAS_DIMENSION ||
              totalPx > MAX_SAFE_CANVAS_PIXELS;

            return (
              <button
                key={s}
                type="button"
                disabled={exceedsCeiling}
                onClick={() => setScale(s)}
                title={
                  exceedsCeiling
                    ? `Exceeds cross-platform browser canvas limit (max ${MAX_SAFE_CANVAS_DIMENSION}px / 16.7MP). Result would be ${outW}×${outH}px.`
                    : `${s}x scale (${outW}×${outH}px)`
                }
                className={`px-2 py-0.5 rounded-[2px] border font-bold transition-colors ${
                  exceedsCeiling
                    ? 'opacity-30 cursor-not-allowed bg-[var(--desk-surface)] text-[var(--text-muted)] border-[var(--desk-border)]'
                    : scale === s
                    ? 'bg-[var(--primary-bg)] text-[var(--primary-fg)] border-[var(--ink)] cursor-pointer'
                    : 'bg-[var(--desk-surface)] text-[var(--text-heading)] border-[var(--desk-border)] hover:border-[var(--accent-gold)] cursor-pointer'
                }`}
              >
                {s}x
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between text-[var(--text-body)]">
        <span className="font-bold">Output Size:</span>
        <span className="text-[var(--accent-gold)] font-bold">
          {currentOutputW} × {currentOutputH} px
          <span className="text-[10px] text-[var(--text-muted)] font-normal ml-1.5">
            (~{memoryMb < 1 ? '<1' : memoryMb.toFixed(1)} MB buffer)
          </span>
        </span>
      </div>

      {hasDisabledScales && (
        <div className="text-[10px] text-[var(--text-muted)] bg-[var(--desk-bg)] p-1.5 rounded-[2px] border border-[var(--desk-border)]">
          <span className="text-[var(--accent-gold)] font-bold">Canvas Safety Limit:</span> Higher scales exceeding 4096 px or 16.7 MP are disabled for this canvas ({canvasWidth}×{canvasHeight} px) to prevent browser allocation crashes (iOS / Safari ceiling).
        </div>
      )}

      {currentOutputW >= 2048 && !hasDisabledScales && (
        <div className="text-[10px] text-[var(--text-muted)] bg-[var(--desk-bg)] p-1.5 rounded-[2px] border border-[var(--desk-border)]">
          <span className="text-[var(--accent-gold)] font-bold">Note:</span> High-resolution canvas export ({currentOutputW}×{currentOutputH}px). Verified safe within standard browser ceilings (up to 4096px / 16.7MP).
        </div>
      )}
    </div>
  );
};
