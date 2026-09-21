'use client';

import React from 'react';
import { PixelIcon } from '@/components/ui/PixelIcon';

interface ReplayExportTabProps {
  replayFormat: 'gif' | 'mp4';
  setReplayFormat: (format: 'gif' | 'mp4') => void;
  scale: number;
  setScale: (scale: number) => void;
  replayFps: number;
  setReplayFps: (fps: number) => void;
  holdLastFrameMs: number;
  setHoldLastFrameMs: (ms: number) => void;
  historyLength: number;
  isMp4Supported: boolean;
  isTruncated?: boolean;
}

export const ReplayExportTab: React.FC<ReplayExportTabProps> = ({
  replayFormat,
  setReplayFormat,
  scale,
  setScale,
  replayFps,
  setReplayFps,
  holdLastFrameMs,
  setHoldLastFrameMs,
  historyLength,
  isMp4Supported,
  isTruncated = false,
}) => {
  return (
    <div className="flex flex-col gap-2.5 bg-[var(--desk-surface)] p-3 rounded-[2px] border-2 border-[var(--desk-border)] text-xs font-mono shadow-xs">
      <div className="flex items-center justify-between">
        <span className="text-[var(--text-body)] font-bold">Timelapse Format:</span>
        <div className="flex gap-1">
          {(['gif', 'mp4'] as const).map((fmt) => (
            <button
              key={fmt}
              type="button"
              onClick={() => setReplayFormat(fmt)}
              className={`px-2 py-0.5 rounded-[2px] border font-bold cursor-pointer transition-colors uppercase ${
                replayFormat === fmt
                  ? 'bg-[#f0be7c] text-[#140d1f] border-[#8c5120]'
                  : 'bg-[var(--desk-surface)] text-[var(--text-heading)] border-[var(--desk-border)] hover:border-[#f0be7c]'
              }`}
            >
              {fmt === 'mp4' ? 'MP4 Video' : 'Animated GIF'}
            </button>
          ))}
        </div>
      </div>

      {replayFormat === 'mp4' && !isMp4Supported && (
        <div className="flex flex-col gap-1 p-2.5 rounded-[2px] bg-[#3a1d28] border border-[#b84a62] text-xs font-mono text-[#ffb3c1]">
          <div className="flex items-center gap-1.5 font-bold text-[#ff8099]">
            <PixelIcon name="warning" size={13} />
            <span>MP4 Video Recording Unsupported</span>
          </div>
          <p className="text-[11px] leading-relaxed text-[#fcd2d7]">
            Your browser lacks native MP4 (H.264) MediaRecorder support. Please choose <strong>Animated GIF</strong> for timelapse export.
          </p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-[var(--text-body)] font-bold">Scale Resolution:</span>
        <div className="flex gap-1">
          {[1, 2, 4, 8].map((s) => (
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
        <span className="text-[var(--text-body)] font-bold">Playback Speed:</span>
        <div className="flex gap-1">
          {[6, 12, 18, 24].map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setReplayFps(f)}
              className={`px-2 py-0.5 rounded-[2px] border font-bold cursor-pointer transition-colors ${
                replayFps === f
                  ? 'bg-[#f0be7c] text-[#140d1f] border-[#8c5120]'
                  : 'bg-[var(--desk-surface)] text-[var(--text-heading)] border-[var(--desk-border)] hover:border-[#f0be7c]'
              }`}
            >
              {f} FPS
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[var(--text-body)] font-bold">Hold Final Frame:</span>
        <div className="flex gap-1">
          {[500, 1000, 2000].map((ms) => (
            <button
              key={ms}
              type="button"
              onClick={() => setHoldLastFrameMs(ms)}
              className={`px-2 py-0.5 rounded-[2px] border font-bold cursor-pointer transition-colors ${
                holdLastFrameMs === ms
                  ? 'bg-[#f0be7c] text-[#140d1f] border-[#8c5120]'
                  : 'bg-[var(--desk-surface)] text-[var(--text-heading)] border-[var(--desk-border)] hover:border-[#f0be7c]'
              }`}
            >
              {ms / 1000}s
            </button>
          ))}
        </div>
      </div>

      {isTruncated && (
        <div className="flex flex-col gap-1 p-2 rounded-[2px] bg-[#3a2e1d] border border-[#d19a66] text-[11px] font-mono text-[#e5c07b]">
          <div className="flex items-center gap-1.5 font-bold">
            <PixelIcon name="warning" size={13} />
            <span>Earlier Steps Evicted (Memory Budget)</span>
          </div>
          <p className="leading-tight text-[#dcdfe4]">
            Earlier creative steps were pruned to enforce history memory bounds. The exported timelapse begins at the earliest retained step.
          </p>
        </div>
      )}

      <div className="flex items-center justify-between text-[var(--text-body)] pt-1 border-t border-[var(--desk-border)]">
        <span className="font-bold">History Steps:</span>
        <span className="text-[#f0be7c] font-bold">
          {historyLength} stroke snapshots recorded
        </span>
      </div>

      {historyLength === 0 && (
        <p className="text-[#e06c75] text-[11px] pt-1">
          No drawing strokes recorded in current session yet. Draw on the canvas to generate a timelapse.
        </p>
      )}
    </div>
  );
};
