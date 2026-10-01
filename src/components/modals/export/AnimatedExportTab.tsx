'use client';

import React from 'react';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { validateExportGeometry } from '@/lib/export/exportGeometryValidation';
import { MAX_EXPORT_AGGREGATE_PIXELS } from '@/config/canvasLimits';

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
  isWebmSupported?: boolean;
  onSelectType?: (type: 'gif' | 'apng' | 'webm' | 'mp4') => void;
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
  isWebmSupported = false,
  onSelectType,
}) => {
  const isVideo = exportType === 'webm' || exportType === 'mp4';
  const scaleOptions = React.useMemo(
    () => (exportType === 'gif' ? [1, 2, 4, 8] : [1, 2, 4, 8, 16]),
    [exportType]
  );

  const getOutputDimensions = React.useCallback(
    (s: number) => {
      let outW = canvasWidth * s;
      let outH = canvasHeight * s;
      if (exportType === 'mp4') {
        outW = (outW + 1) & ~1;
        outH = (outH + 1) & ~1;
      }
      return { outW, outH };
    },
    [canvasWidth, canvasHeight, exportType]
  );

  const getValidation = React.useCallback(
    (s: number) => {
      const { outW, outH } = getOutputDimensions(s);
      return validateExportGeometry(outW, outH, {
        frameCount: exportType === 'gif' || exportType === 'apng' ? totalFrames : undefined,
        maxAggregatePixels: exportType === 'gif' || exportType === 'apng' ? MAX_EXPORT_AGGREGATE_PIXELS : undefined,
      });
    },
    [getOutputDimensions, exportType, totalFrames]
  );

  const activeValidation = getValidation(scale);

  return (
    <div className="flex flex-col gap-2.5 bg-[var(--desk-surface)] p-3 rounded-[2px] border-2 border-[var(--desk-border)] text-xs font-mono shadow-xs">
      {exportType === 'webm' && !isWebmSupported && (
        <div className="flex flex-col gap-1.5 p-2.5 rounded-[2px] bg-[#3a1d28] border border-[#b84a62] text-xs font-mono text-[#ffb3c1]">
          <div className="flex items-center gap-1.5 font-bold text-[#ff8099]">
            <PixelIcon name="warning" size={13} />
            <span>WebM Video Recording Unsupported</span>
          </div>
          <p role="alert" className="text-[11px] leading-relaxed text-[#fcd2d7]">
            WebM recording is unavailable in this browser. Choose <strong>GIF</strong> or <strong>APNG</strong> instead.
          </p>
          {onSelectType && (
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => onSelectType('gif')}
                className="px-2.5 py-1 bg-[var(--surface-0)] hover:bg-[var(--surface-2)] text-[var(--accent-gold)] border border-[var(--desk-border)] rounded-[2px] font-bold cursor-pointer text-xs"
              >
                Switch to GIF
              </button>
              <button
                type="button"
                onClick={() => onSelectType('apng')}
                className="px-2.5 py-1 bg-[var(--surface-0)] hover:bg-[var(--surface-2)] text-[var(--text-heading)] border border-[var(--desk-border)] rounded-[2px] font-bold cursor-pointer text-xs"
              >
                Switch to APNG
              </button>
            </div>
          )}
        </div>
      )}
      {exportType === 'mp4' && !isMp4Supported && (
        <div className="flex flex-col gap-1.5 p-2.5 rounded-[2px] bg-[#3a1d28] border border-[#b84a62] text-xs font-mono text-[#ffb3c1]">
          <div className="flex items-center gap-1.5 font-bold text-[#ff8099]">
            <PixelIcon name="warning" size={13} />
            <span>MP4 Video Recording Unsupported</span>
          </div>
          <p role="alert" className="text-[11px] leading-relaxed text-[#fcd2d7]">
            MP4 encoding is unavailable for this export configuration. Please choose <strong>WebM</strong> for video or <strong>GIF / APNG</strong> for animation export instead.
          </p>
          {onSelectType && (
            <div className="flex gap-2 pt-1">
              {isWebmSupported && (
                <button
                  type="button"
                  onClick={() => onSelectType('webm')}
                  className="px-2.5 py-1 bg-[var(--surface-0)] hover:bg-[var(--surface-2)] text-[var(--accent-gold)] border border-[var(--desk-border)] rounded-[2px] font-bold cursor-pointer text-xs"
                >
                  Switch to WebM Video
                </button>
              )}
              <button
                type="button"
                onClick={() => onSelectType('gif')}
                className="px-2.5 py-1 bg-[var(--surface-0)] hover:bg-[var(--surface-2)] text-[var(--text-heading)] border border-[var(--desk-border)] rounded-[2px] font-bold cursor-pointer text-xs"
              >
                Switch to GIF Animation
              </button>
            </div>
          )}
        </div>
      )}

      {!activeValidation.valid && (
        <div className="flex flex-col gap-1 p-2 rounded-[2px] bg-[#3a1d28] border border-[#b84a62] text-[11px] font-mono text-[#ffb3c1]" data-testid="unsafe-scale-warning">
          <div className="flex items-center gap-1.5 font-bold text-[#ff8099]">
            <PixelIcon name="warning" size={13} />
            <span>Selected Scale Exceeds Safety Ceilings</span>
          </div>
          <p className="leading-tight text-[#fcd2d7]">
            {activeValidation.error || `${scale}x scale exceeds the configured safety ceiling (${getOutputDimensions(scale).outW}×${getOutputDimensions(scale).outH}px). Please select a safe scale before exporting.`}
          </p>
        </div>
      )}

      {/* Scale Resolution */}
      <div className="flex items-center justify-between">
        <span className="text-[var(--text-body)] font-bold">Scale Resolution:</span>
        <div className="flex gap-1">
          {scaleOptions.map((s) => {
            const validation = getValidation(s);
            const safe = validation.valid;
            const { outW, outH } = getOutputDimensions(s);
            return (
              <button
                key={s}
                type="button"
                disabled={!safe}
                onClick={() => setScale(s)}
                title={
                  !safe
                    ? validation.error || `Exceeds safety limit. Result would be ${outW}×${outH}px.`
                    : `${s}x scale (${outW}×${outH}px)`
                }
                className={`px-2 py-0.5 rounded-[2px] border font-bold transition-colors ${
                  !safe
                    ? scale === s
                      ? 'bg-[#5a1e28] text-[#ff8099] border-[#b84a62] cursor-not-allowed'
                      : 'opacity-30 cursor-not-allowed bg-[var(--desk-surface)] text-[var(--text-muted)] border-[var(--desk-border)]'
                    : scale === s
                    ? 'bg-[#f0be7c] text-[#140d1f] border-[#8c5120] cursor-pointer'
                    : 'bg-[var(--desk-surface)] text-[var(--text-heading)] border-[var(--desk-border)] hover:border-[#f0be7c] cursor-pointer'
                }`}
              >
                {s}x
              </button>
            );
          })}
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
          {getOutputDimensions(scale).outW} × {getOutputDimensions(scale).outH} px
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
          'Records animation with browser-paced frame holds. Use APNG for exact image frame timing.'}
        {exportType === 'mp4' &&
          'Universal MP4 container optimized for instant video previews across Discord, Twitter/X, and modern video players.'}
      </p>
    </div>
  );
};
