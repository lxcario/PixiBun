'use client';

import React from 'react';

interface ShaderExportTabProps {
  isPaletteCycle?: boolean;
  shaderTarget?: 'godot' | 'unity';
  setShaderTarget?: (target: 'godot' | 'unity') => void;
  activeCycleTracksCount?: number;
  cycleLoopDuration?: number;
  setCycleLoopDuration?: (sec: number) => void;
  cycleLoopFps?: number;
  setCycleLoopFps?: (fps: number) => void;
  cycleLoopFormat?: 'apng' | 'gif';
  setCycleLoopFormat?: (fmt: 'apng' | 'gif') => void;
  scale?: number;
  setScale?: (scale: number) => void;
}

export const ShaderExportTab: React.FC<ShaderExportTabProps> = ({
  isPaletteCycle = false,
  shaderTarget = 'godot',
  setShaderTarget,
  activeCycleTracksCount = 0,
  cycleLoopDuration = 2.0,
  setCycleLoopDuration,
  cycleLoopFps = 8,
  setCycleLoopFps,
  cycleLoopFormat = 'apng',
  setCycleLoopFormat,
  scale = 4,
  setScale,
}) => {
  if (isPaletteCycle) {
    return (
      <div className="flex flex-col gap-3 bg-[var(--desk-surface)] p-3 rounded-[2px] border-2 border-[var(--desk-border)] text-xs shadow-xs">
        {activeCycleTracksCount === 0 && <p role="alert" className="text-[var(--text-muted)]">Add an enabled cycle in Palette and choose at least two colors.</p>}
        <div className="flex flex-col gap-1.5">
          <span className="text-[var(--text-body)] font-bold">Loop length</span>
          <div className="grid grid-cols-5 gap-1" role="group" aria-label="Loop length">
            {[1.0, 2.0, 3.0, 4.0, 5.0].map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => setCycleLoopDuration?.(sec)}
                aria-pressed={cycleLoopDuration === sec}
                className={`min-h-7 px-2 py-0.5 rounded-[2px] border font-bold cursor-pointer transition-colors ${
                  cycleLoopDuration === sec
                    ? 'bg-[var(--primary-bg)] text-[var(--primary-fg)] border-[var(--ink)]'
                    : 'bg-[var(--desk-surface)] text-[var(--text-heading)] border-[var(--desk-border)] hover:border-[var(--accent-gold)]'
                }`}
              >
                {sec}s
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[var(--text-body)] font-bold">Frame rate</span>
          <div className="grid grid-cols-8 gap-1" role="group" aria-label="Frame rate">
            {[3, 5, 8, 10, 12, 15, 24, 30].map(value => <button key={value} type="button"
              aria-label={`${value} FPS`} aria-pressed={cycleLoopFps === value}
              onClick={() => setCycleLoopFps?.(value)}
              className={`min-h-7 py-1 rounded-[2px] border font-bold cursor-pointer ${cycleLoopFps === value
                ? 'bg-[var(--primary-bg)] text-[var(--primary-fg)] border-[var(--ink)]'
                : 'bg-[var(--desk-surface)] text-[var(--text-heading)] border-[var(--desk-border)] hover:border-[var(--accent-gold)]'}`}>
              {value}
            </button>)}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[var(--text-body)] font-bold">File format</span>
          <div className="grid grid-cols-2 gap-1" role="group" aria-label="Cycle file format">
            {(['apng', 'gif'] as const).map((fmt) => (
              <button
                key={fmt}
                type="button"
                onClick={() => setCycleLoopFormat?.(fmt)}
                aria-label={fmt.toUpperCase()}
                aria-pressed={cycleLoopFormat === fmt}
                className={`min-h-7 px-2.5 py-0.5 rounded-[2px] border font-bold cursor-pointer uppercase transition-colors ${
                  cycleLoopFormat === fmt
                    ? 'bg-[var(--primary-bg)] text-[var(--primary-fg)] border-[var(--ink)]'
                    : 'bg-[var(--desk-surface)] text-[var(--text-heading)] border-[var(--desk-border)] hover:border-[var(--accent-gold)]'
                }`}
              >
                {fmt}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[var(--text-body)] font-bold">Image size</span>
          <div className="grid grid-cols-4 gap-1" role="group" aria-label="Cycle image size">
            {[1, 2, 4, 8].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setScale?.(s)}
                aria-pressed={scale === s}
                className={`min-h-7 px-2 py-0.5 rounded-[2px] border font-bold cursor-pointer transition-colors ${
                  scale === s
                    ? 'bg-[var(--primary-bg)] text-[var(--primary-fg)] border-[var(--ink)]'
                    : 'bg-[var(--desk-surface)] text-[var(--text-heading)] border-[var(--desk-border)] hover:border-[var(--accent-gold)]'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1 text-[11px] pt-2 border-t border-[var(--desk-border)]">
          <p className="text-[var(--text-heading)]" role="status">{Math.round(cycleLoopDuration * cycleLoopFps)} frames · {cycleLoopDuration} seconds · {cycleLoopFps} FPS</p>
          <p className="text-[var(--text-muted)]">Uses this frame and enabled cycles. Speed adjusts to close the loop.</p>
          <p className="text-[var(--text-muted)]">{cycleLoopFormat === 'apng' ? 'APNG keeps exact frame timing and full transparency.' : 'GIF rounds frame timing and uses simple transparency.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5 bg-[var(--desk-surface)] p-3 rounded-[2px] border-2 border-[var(--desk-border)] text-xs font-mono shadow-xs">
      <div className="flex items-center justify-between">
        <span className="text-[var(--text-body)] font-bold">Engine Target:</span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setShaderTarget?.('godot')}
            className={`px-2.5 py-1 rounded-[2px] border font-bold cursor-pointer transition-colors ${
              shaderTarget === 'godot'
                ? 'bg-[var(--primary-bg)] text-[var(--primary-fg)] border-[var(--ink)]'
                : 'bg-[var(--desk-surface)] text-[var(--text-heading)] border-[var(--desk-border)] hover:border-[var(--accent-gold)]'
            }`}
          >
            Godot 4 (.gdshader)
          </button>
          <button
            type="button"
            onClick={() => setShaderTarget?.('unity')}
            className={`px-2.5 py-1 rounded-[2px] border font-bold cursor-pointer transition-colors ${
              shaderTarget === 'unity'
                ? 'bg-[var(--primary-bg)] text-[var(--primary-fg)] border-[var(--ink)]'
                : 'bg-[var(--desk-surface)] text-[var(--text-heading)] border-[var(--desk-border)] hover:border-[var(--accent-gold)]'
            }`}
          >
            Unity URP 2D (.shader)
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
        <span>Active Tracks:</span>
        <span className="font-bold text-[var(--accent-gold)]">{activeCycleTracksCount} tracks configured</span>
      </div>

      <p className="text-[var(--text-muted)] text-[11px] pt-1 border-t border-[var(--desk-border)]">
        Shader code only; supply a normalized index texture and palette LUT yourself. Use Godot Kit for a runnable sample with raw register bytes and separate alpha. Unity remains unverified in its engine.
      </p>
    </div>
  );
};
