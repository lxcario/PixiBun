'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useStudioStore } from '@/stores/studioStore';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { getOrCreateBuffer } from '@/lib/engine/bufferRegistry';

export const FloatingPreviewWindow: React.FC = () => {
  const {
    frames,
    activeFrameIndex,
    canvasWidth,
    canvasHeight,
    isPlaying,
    setIsPlaying,
    fps,
    previewScale,
    setPreviewScale,
    previewBackdrop,
    setPreviewBackdrop,
    showFloatingPreview,
    toggleFloatingPreview,
    bufferVersion,
  } = useStudioStore();

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 16, y: 56 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Render active composite frame to preview canvas whenever frames, activeFrameIndex, or canvas size changes
  useEffect(() => {
    if (!showFloatingPreview) return;
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.imageSmoothingEnabled = false;

    const currentFrame = frames[activeFrameIndex];
    if (currentFrame) {
      currentFrame.layers.slice().reverse().forEach((layer) => {
        if (!layer.visible) return;
        const lBuffer = getOrCreateBuffer(layer.id, canvasWidth, canvasHeight);
        ctx.globalAlpha = layer.opacity;
        ctx.globalCompositeOperation = layer.blendMode;
        ctx.drawImage(lBuffer.canvas, 0, 0);
      });
    }

    ctx.globalAlpha = 1.0;
    ctx.globalCompositeOperation = 'source-over';
  }, [activeFrameIndex, bufferVersion, canvasHeight, canvasWidth, frames, showFloatingPreview]);

  if (!showFloatingPreview) return null;

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // fallback
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setPosition({
      x: Math.max(10, e.clientX - dragOffset.x),
      y: Math.max(10, e.clientY - dragOffset.y),
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // fallback
    }
  };

  const scaledWidth = canvasWidth * previewScale;
  const scaledHeight = canvasHeight * previewScale;

  const getBackdropClass = () => {
    switch (previewBackdrop) {
      case 'obsidian':
        return 'bg-[#2A2130]';
      case 'alabaster':
        return 'bg-[#EDE8F4]';
      case 'amber':
        return 'bg-[#F0BE7C]/30';
      case 'checker':
      default:
        return 'bg-[repeating-conic-gradient(#3a2e4c_0%_25%,#261c33_0%_50%)] bg-[length:12px_12px]';
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      className="z-30 bg-[var(--desk-surface)] border-2 border-[var(--desk-border)] rounded-[3px] shadow-[0_12px_32px_rgba(0,0,0,0.6)] flex flex-col select-none overflow-hidden transition-colors duration-300"
    >
      {/* 1. Window Titlebar / Drag Handle */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="h-6 bg-[var(--desk-surface-raised)] border-b border-[var(--desk-border)] px-2 flex items-center justify-between cursor-move text-[10px] font-mono font-bold text-[#f0be7c]"
      >
        <div className="flex items-center gap-1.5">
          <PixelIcon name="preview" size={12} />
          <span>Live Preview ({previewScale}x)</span>
        </div>

        <button
          onPointerDown={(e) => {
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.stopPropagation();
            toggleFloatingPreview();
          }}
          className="text-[var(--text-body)] hover:text-[#ff99aa] font-bold text-xs p-0.5 cursor-pointer"
          title="Close Preview Window"
        >
          ×
        </button>
      </div>

      {/* 2. Live Canvas Viewport */}
      <div className="p-3 flex items-center justify-center bg-[var(--desk-bg)]">
        <div
          className={`relative border border-[var(--desk-border)] rounded-[2px] overflow-hidden flex items-center justify-center ${getBackdropClass()}`}
          style={{
            width: `${Math.max(128, scaledWidth)}px`,
            height: `${Math.max(128, scaledHeight)}px`,
          }}
        >
          <canvas
            ref={previewCanvasRef}
            width={canvasWidth}
            height={canvasHeight}
            style={{
              width: `${scaledWidth}px`,
              height: `${scaledHeight}px`,
            }}
            className="pixelated pointer-events-none"
          />
        </div>
      </div>

      {/* 3. Controls Bar: Play/Pause, Scale (1x/2x/4x), Backdrop Switcher */}
      <div className="px-2 py-1.5 bg-[var(--desk-surface-raised)] border-t border-[var(--desk-border)] flex items-center justify-between gap-2 text-xs font-mono">
        {/* Play / Pause Toggle */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`p-1 rounded-[2px] border transition-colors cursor-pointer ${
              isPlaying
                ? 'bg-[#f0be7c] text-[#140d1f] border-[#8c5120]'
                : 'bg-[var(--desk-surface)] text-[var(--text-heading)] border-[var(--desk-border)] hover:text-[#f0be7c]'
            }`}
            title={isPlaying ? 'Pause Animation' : 'Play Animation'}
          >
            <PixelIcon name={isPlaying ? 'pause' : 'play'} size={12} />
          </button>
          <span className="text-[10px] text-[#f0be7c] font-bold">
            #{activeFrameIndex + 1}/{frames.length}
          </span>
          <span className="text-[9px] text-[var(--text-body)]">({fps} FPS)</span>
        </div>

        {/* Scale Selector (1x, 2x, 4x) */}
        <div className="flex items-center gap-0.5 bg-[var(--desk-surface)] p-0.5 rounded-[2px] border border-[var(--desk-border)]">
          {([1, 2, 4] as const).map((sc) => (
            <button
              key={sc}
              onClick={() => setPreviewScale(sc)}
              className={`px-1.5 py-0.5 text-[9px] font-bold rounded-[1px] cursor-pointer transition-colors ${
                previewScale === sc
                  ? 'bg-[#f0be7c] text-[#140d1f]'
                  : 'text-[var(--text-body)] hover:text-[#f0be7c]'
              }`}
            >
              {sc}x
            </button>
          ))}
        </div>

        {/* Backdrop Swatches */}
        <div className="flex items-center gap-1">
          {(['checker', 'obsidian', 'alabaster', 'amber'] as const).map((bg) => (
            <button
              key={bg}
              onClick={() => setPreviewBackdrop(bg)}
              className={`w-3.5 h-3.5 rounded-[1px] border cursor-pointer ${
                previewBackdrop === bg ? 'border-[#f0be7c] scale-110' : 'border-[#140d1f]'
              } ${
                bg === 'obsidian'
                  ? 'bg-[#2A2130]'
                  : bg === 'alabaster'
                  ? 'bg-[#EDE8F4]'
                  : bg === 'amber'
                  ? 'bg-[#F0BE7C]'
                  : 'bg-[repeating-conic-gradient(#888_0%_25%,#444_0%_50%)] bg-[length:6px_6px]'
              }`}
              title={`Backdrop: ${bg}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
