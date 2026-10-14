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
                  ? 'bg-[var(--primary-bg)] text-[var(--primary-fg)] border-[var(--ink)]'
                  : 'bg-[var(--desk-surface)] text-[var(--text-heading)] border-[var(--desk-border)] hover:border-[var(--accent-gold)]'
              }`}
            >
              {fmt === 'mp4' ? 'MP4 Video' : 'Animated GIF'}
            </button>
          ))}
        </div>
      </div>

      {replayFormat === 'mp4' && !isMp4Supported && (
        <div className="flex flex-col gap-1 p-2.5 rounded-[2px] bg-[var(--danger-bg)] border border-[var(--danger-border)] text-xs font-mono text-[var(--danger-fg)]">
          <div className="flex items-center gap-1.5 font-bold text-[var(--danger-fg)]">
            <PixelIcon name="warning" size={13} />
            <span>MP4 Video Recording Unsupported</span>
          </div>
          <p className="text-[11px] leading-relaxed text-[var(--danger-fg)]">
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
                  ? 'bg-[var(--primary-bg)] text-[var(--primary-fg)] border-[var(--ink)]'
                  : 'bg-[var(--desk-surface)] text-[var(--text-heading)] border-[var(--desk-border)] hover:border-[var(--accent-gold)]'
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
                  ? 'bg-[var(--primary-bg)] text-[var(--primary-fg)] border-[var(--ink)]'
                  : 'bg-[var(--desk-surface)] text-[var(--text-heading)] border-[var(--desk-border)] hover:border-[var(--accent-gold)]'
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
                  ? 'bg-[var(--primary-bg)] text-[var(--primary-fg)] border-[var(--ink)]'
                  : 'bg-[var(--desk-surface)] text-[var(--text-heading)] border-[var(--desk-border)] hover:border-[var(--accent-gold)]'
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
        <span className="text-[var(--accent-gold)] font-bold">
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
