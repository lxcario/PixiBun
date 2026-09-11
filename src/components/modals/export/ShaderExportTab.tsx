'use client';

import React from 'react';

interface ShaderExportTabProps {
  isPaletteCycle?: boolean;
  shaderTarget?: 'godot' | 'unity';
  setShaderTarget?: (target: 'godot' | 'unity') => void;
  activeCycleTracksCount?: number;
  cycleLoopDuration?: number;
  setCycleLoopDuration?: (sec: number) => void;
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
  cycleLoopFormat = 'apng',
  setCycleLoopFormat,
  scale = 4,
  setScale,
}) => {
  if (isPaletteCycle) {
    return (
      <div className="flex flex-col gap-2.5 bg-[var(--desk-surface)] p-3 rounded-[2px] border-2 border-[var(--desk-border)] text-xs font-mono shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-[var(--text-body)] font-bold">Target Loop Duration:</span>
          <div className="flex gap-1">
            {[1.0, 2.0, 3.0, 4.0, 5.0].map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => setCycleLoopDuration?.(sec)}
                className={`px-2 py-0.5 rounded-[2px] border font-bold cursor-pointer transition-colors ${
                  cycleLoopDuration === sec
                    ? 'bg-[#f0be7c] text-[#140d1f] border-[#8c5120]'
                    : 'bg-[var(--desk-surface)] text-[var(--text-heading)] border-[var(--desk-border)] hover:border-[#f0be7c]'
                }`}
              >
                {sec}s
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[var(--text-body)] font-bold">Animation Format:</span>
          <div className="flex gap-1">
            {(['apng', 'gif'] as const).map((fmt) => (
              <button
                key={fmt}
                type="button"
                onClick={() => setCycleLoopFormat?.(fmt)}
                className={`px-2.5 py-0.5 rounded-[2px] border font-bold cursor-pointer uppercase transition-colors ${
                  cycleLoopFormat === fmt
                    ? 'bg-[#f0be7c] text-[#140d1f] border-[#8c5120]'
                    : 'bg-[var(--desk-surface)] text-[var(--text-heading)] border-[var(--desk-border)] hover:border-[#f0be7c]'
                }`}
              >
                {fmt}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[var(--text-body)] font-bold">Scale Resolution:</span>
          <div className="flex gap-1">
            {[1, 2, 4, 8].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setScale?.(s)}
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

        <p className="text-[#a89ab8] text-[11px] pt-1 border-t border-[var(--desk-border)]">
          Powered by harmonic rational retuning to guarantee 100% seamless zero-pop looping across all cycle tracks.
        </p>
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
                ? 'bg-[#f0be7c] text-[#140d1f] border-[#8c5120]'
                : 'bg-[var(--desk-surface)] text-[var(--text-heading)] border-[var(--desk-border)] hover:border-[#f0be7c]'
            }`}
          >
            Godot 4 (.gdshader)
          </button>
          <button
            type="button"
            onClick={() => setShaderTarget?.('unity')}
            className={`px-2.5 py-1 rounded-[2px] border font-bold cursor-pointer transition-colors ${
              shaderTarget === 'unity'
                ? 'bg-[#f0be7c] text-[#140d1f] border-[#8c5120]'
                : 'bg-[var(--desk-surface)] text-[var(--text-heading)] border-[var(--desk-border)] hover:border-[#f0be7c]'
            }`}
          >
            Unity URP 2D (.shader)
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
        <span>Active Tracks:</span>
        <span className="font-bold text-[#f0be7c]">{activeCycleTracksCount} tracks configured</span>
      </div>

      <p className="text-[#a89ab8] text-[11px] pt-1 border-t border-[var(--desk-border)]">
        Hardware-accelerated pixel shader with point-filtering, ping-pong oscillation, and sub-step color interpolation.
      </p>
    </div>
  );
};
