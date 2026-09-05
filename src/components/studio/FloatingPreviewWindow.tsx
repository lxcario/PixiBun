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
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Custom resizable viewport size
  const [viewportSize, setViewportSize] = useState<{ width: number; height: number }>({
    width: 144,
    height: 144,
  });
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartRef = useRef<{ startX: number; startY: number; startW: number; startH: number }>({
    startX: 0,
    startY: 0,
    startW: 144,
    startH: 144,
  });

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

  // Robust window-level dragging listener (prevents mouse stickiness bug)
  useEffect(() => {
    if (!isDragging) return;

    const onGlobalPointerMove = (e: PointerEvent) => {
      // Abort immediately if pointer button is no longer held
      if (e.buttons === 0) {
        setIsDragging(false);
        return;
      }
      setPosition({
        x: Math.max(10, Math.min(window.innerWidth - 80, e.clientX - dragOffsetRef.current.x)),
        y: Math.max(10, Math.min(window.innerHeight - 80, e.clientY - dragOffsetRef.current.y)),
      });
    };

    const onGlobalPointerUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('pointermove', onGlobalPointerMove);
    window.addEventListener('pointerup', onGlobalPointerUp);
    window.addEventListener('pointercancel', onGlobalPointerUp);

    return () => {
      window.removeEventListener('pointermove', onGlobalPointerMove);
      window.removeEventListener('pointerup', onGlobalPointerUp);
      window.removeEventListener('pointercancel', onGlobalPointerUp);
    };
  }, [isDragging]);

  // Robust window-level resizing listener
  useEffect(() => {
    if (!isResizing) return;

    const onGlobalResizeMove = (e: PointerEvent) => {
      if (e.buttons === 0) {
        setIsResizing(false);
        return;
      }
      const deltaX = e.clientX - resizeStartRef.current.startX;
      const deltaY = e.clientY - resizeStartRef.current.startY;
      setViewportSize({
        width: Math.max(100, Math.min(640, resizeStartRef.current.startW + deltaX)),
        height: Math.max(100, Math.min(640, resizeStartRef.current.startH + deltaY)),
      });
    };

    const onGlobalResizeUp = () => {
      setIsResizing(false);
    };

    window.addEventListener('pointermove', onGlobalResizeMove);
    window.addEventListener('pointerup', onGlobalResizeUp);
    window.addEventListener('pointercancel', onGlobalResizeUp);

    return () => {
      window.removeEventListener('pointermove', onGlobalResizeMove);
      window.removeEventListener('pointerup', onGlobalResizeUp);
      window.removeEventListener('pointercancel', onGlobalResizeUp);
    };
  }, [isResizing]);

  if (!showFloatingPreview) return null;

  const handleTitlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    dragOffsetRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
    setIsDragging(true);
  };

  const handleResizePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    resizeStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startW: viewportSize.width,
      startH: viewportSize.height,
    };
    setIsResizing(true);
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
      className="z-30 bg-[var(--desk-surface)] border-2 border-[var(--desk-border)] rounded-[3px] shadow-[0_12px_32px_rgba(0,0,0,0.6)] flex flex-col select-none overflow-hidden transition-colors duration-300 relative"
    >
      {/* 1. Window Titlebar / Drag Handle */}
      <div
        onPointerDown={handleTitlePointerDown}
        className="h-6 bg-[var(--desk-surface-raised)] border-b border-[var(--desk-border)] px-2 flex items-center justify-between cursor-move text-[10px] font-mono font-bold text-[#f0be7c]"
      >
        <div className="flex items-center gap-1.5 pointer-events-none">
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
          aria-label="Close Preview Window"
        >
          ×
        </button>
      </div>

      {/* 2. Live Canvas Viewport (Dynamic Resizable Size) */}
      <div className="p-2.5 flex items-center justify-center bg-[var(--desk-bg)]">
        <div
          className={`relative border border-[var(--desk-border)] rounded-[2px] overflow-hidden flex items-center justify-center ${getBackdropClass()}`}
          style={{
            width: `${viewportSize.width}px`,
            height: `${viewportSize.height}px`,
          }}
        >
          <canvas
            ref={previewCanvasRef}
            width={canvasWidth}
            height={canvasHeight}
            style={{
              width: `${scaledWidth}px`,
              height: `${scaledHeight}px`,
              maxWidth: `${viewportSize.width}px`,
              maxHeight: `${viewportSize.height}px`,
            }}
            className="pixelated pointer-events-none object-contain"
          />
        </div>
      </div>

      {/* 3. Controls Bar: Play/Pause, Scale (1x/2x/4x), Backdrop Switcher */}
      <div className="px-2 py-1.5 bg-[var(--desk-surface-raised)] border-t border-[var(--desk-border)] flex items-center justify-between gap-2 text-xs font-mono pr-5">
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
            aria-label={isPlaying ? 'Pause Animation' : 'Play Animation'}
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
        <div className="flex items-center gap-0.5">
          {(['checker', 'obsidian', 'alabaster', 'amber'] as const).map((bg) => (
            <button
              key={bg}
              type="button"
              onClick={() => setPreviewBackdrop(bg)}
              className="min-w-[24px] min-h-[24px] w-6 h-6 flex items-center justify-center cursor-pointer bg-transparent border-0 p-0"
              title={`Backdrop: ${bg}`}
              aria-label={`Backdrop: ${bg}`}
            >
              <span
                className={`w-3.5 h-3.5 rounded-[1px] border block ${
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
              />
            </button>
          ))}
        </div>
      </div>

      {/* 4. Bottom-Right Window Resize Handle */}
      <div
        onPointerDown={handleResizePointerDown}
        className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize flex items-end justify-end p-0.5 select-none text-[var(--text-body)] hover:text-[#f0be7c]"
        title="Drag to resize Live Preview window"
      >
        <svg width="6" height="6" viewBox="0 0 6 6" fill="currentColor" className="pointer-events-none">
          <rect x="4" y="0" width="2" height="2" />
          <rect x="2" y="2" width="2" height="2" />
          <rect x="4" y="2" width="2" height="2" />
          <rect x="0" y="4" width="2" height="2" />
          <rect x="2" y="4" width="2" height="2" />
          <rect x="4" y="4" width="2" height="2" />
        </svg>
      </div>
    </div>
  );
};
