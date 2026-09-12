'use client';

import React from 'react';
import { PixelIcon } from '@/components/ui/PixelIcon';

interface AnimatedExportTabProps {
  exportType: 'gif' | 'apng' | 'webm' | 'mp4';
  scale: number;
  setScale: (scale: number) => void;
  canvasWidth: number;
  canvasHeight: number;
  totalFrames: number;
  fps: number;
  videoLoopCount: number;
  setVideoLoopCount: (count: number) => void;
  isMp4Supported: boolean;
}

export const AnimatedExportTab: React.FC<AnimatedExportTabProps> = ({
  exportType,
  scale,
  setScale,
  canvasWidth,
  canvasHeight,
  totalFrames,
  fps,
  videoLoopCount,
  setVideoLoopCount,
  isMp4Supported,
}) => {
  const isVideo = exportType === 'webm' || exportType === 'mp4';
  const scaleOptions = exportType === 'gif' ? [1, 2, 4, 8] : [1, 2, 4, 8, 16];

  return (
    <div className="flex flex-col gap-2.5 bg-[var(--desk-surface)] p-3 rounded-[2px] border-2 border-[var(--desk-border)] text-xs font-mono shadow-xs">
      {exportType === 'mp4' && !isMp4Supported && (
        <div className="flex flex-col gap-1 p-2.5 rounded-[2px] bg-[#3a1d28] border border-[#b84a62] text-xs font-mono text-[#ffb3c1]">
          <div className="flex items-center gap-1.5 font-bold text-[#ff8099]">
            <PixelIcon name="warning" size={13} />
            <span>MP4 Video Recording Unsupported</span>
          </div>
          <p className="text-[11px] leading-relaxed text-[#fcd2d7]">
            Your browser lacks native MP4 (H.264) MediaRecorder support. Please choose <strong>WebM</strong> for video or <strong>GIF / APNG</strong> for animation export instead.
          </p>
        </div>
      )}

      {/* Scale Resolution */}
      <div className="flex items-center justify-between">
        <span className="text-[var(--text-body)] font-bold">Scale Resolution:</span>
        <div className="flex gap-1">
          {scaleOptions.map((s) => (
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

      {/* Video Loop Cycles */}
      {isVideo && (
        <div className="flex items-center justify-between">
          <span className="text-[var(--text-body)] font-bold">Animation Cycles:</span>
          <div className="flex gap-1">
            {[1, 2, 4].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setVideoLoopCount(c)}
                className={`px-2 py-0.5 rounded-[2px] border font-bold cursor-pointer transition-colors ${
                  videoLoopCount === c
                    ? 'bg-[#f0be7c] text-[#140d1f] border-[#8c5120]'
                    : 'bg-[var(--desk-surface)] text-[var(--text-heading)] border-[var(--desk-border)] hover:border-[#f0be7c]'
                }`}
              >
                {c} {c === 1 ? 'loop' : 'loops'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Info Output */}
      <div className="flex items-center justify-between text-[var(--text-body)]">
        <span className="font-bold">Output Info:</span>
        <span className="text-[#f0be7c] font-bold">
          {canvasWidth * scale} × {canvasHeight * scale} px
          {exportType === 'gif' && `, ${totalFrames} frames at ${fps} FPS`}
          {exportType === 'apng' && `, ${totalFrames} frames (24-bit Truecolor)`}
          {exportType === 'webm' && ` WebM (VP9/VP8)`}
          {exportType === 'mp4' && ` MP4 (H.264 / ISOBMFF)`}
        </span>
      </div>

      {/* Footnote / Explanation */}
      <p className="text-[#a89ab8] text-[11px] pt-1 border-t border-[var(--desk-border)]">
        {exportType === 'gif' && 'Animated GIF with crisp nearest-neighbor integer scaling.'}
        {exportType === 'apng' &&
          'Animated PNG (APNG) retains full 24-bit/32-bit RGBA color without GIF palette degradation. Encoded with uncompressed DEFLATE store blocks for instant offline generation.'}
        {exportType === 'webm' &&
          'Encodes animation with exact per-frame millisecond holds for high-quality game dev video showcases and social sharing.'}
        {exportType === 'mp4' &&
          'Universal MP4 container optimized for instant video previews across Discord, Twitter/X, and modern video players.'}
      </p>
    </div>
  );
};
