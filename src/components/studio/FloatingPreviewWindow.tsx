'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useStudioStore } from '@/stores/studioStore';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { compositeFrame } from '@/lib/render/compositor';

export const FloatingPreviewWindow: React.FC = () => {
  const frames = useStudioStore((s) => s.frames);
  const activeFrameIndex = useStudioStore((s) => s.activeFrameIndex);
  const canvasWidth = useStudioStore((s) => s.canvasWidth);
  const canvasHeight = useStudioStore((s) => s.canvasHeight);
  const isPlaying = useStudioStore((s) => s.isPlaying);
  const setIsPlaying = useStudioStore((s) => s.setIsPlaying);
  const fps = useStudioStore((s) => s.fps);
  const previewScale = useStudioStore((s) => s.previewScale);
  const setPreviewScale = useStudioStore((s) => s.setPreviewScale);
  const previewBackdrop = useStudioStore((s) => s.previewBackdrop);
  const setPreviewBackdrop = useStudioStore((s) => s.setPreviewBackdrop);
  const showFloatingPreview = useStudioStore((s) => s.showFloatingPreview);
  const toggleFloatingPreview = useStudioStore((s) => s.toggleFloatingPreview);
  const bufferVersion = useStudioStore((s) => s.bufferVersion);

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 16, y: 56 });

  useEffect(() => {
    setPosition({ x: Math.max(16, window.innerWidth - 640), y: 16 });
  }, []);
  const [isDragging, setIsDragging] = useState(false);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Custom resizable viewport size (minimum 140px width)
  const [viewportSize, setViewportSize] = useState<{ width: number; height: number }>({
    width: 180,
    height: 120,
  });
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartRef = useRef<{ startX: number; startY: number; startW: number; startH: number }>({
    startX: 0,
    startY: 0,
    startW: 180,
    startH: 120,
  });

  // Render active composite frame to preview canvas whenever frames, activeFrameIndex, or canvas size changes
  useEffect(() => {
    if (!showFloatingPreview || isMinimized) return;
    const canvas = previewCanvasRef.current;
    if (!canvas) return;

    compositeFrame(frames, activeFrameIndex, canvasWidth, canvasHeight, {}, canvas);
  }, [activeFrameIndex, bufferVersion, canvasHeight, canvasWidth, frames, showFloatingPreview, isMinimized]);

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
        x: Math.max(10, Math.min(window.innerWidth - 150, e.clientX - dragOffsetRef.current.x)),
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
        width: Math.max(140, Math.min(640, resizeStartRef.current.startW + deltaX)),
        height: Math.max(80, Math.min(640, resizeStartRef.current.startH + deltaY)),
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
      role="dialog"
      aria-label="Live Preview Window"
      data-testid="floating-preview-window"
      onPointerDown={(event) => event.stopPropagation()}
      style={{
        position: 'absolute',
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      className={`z-30 ${
        isMinimized ? 'w-44' : 'min-w-[140px]'
      } bg-[var(--desk-surface)] border border-[var(--desk-border)] rounded-[3px] shadow-[0_12px_32px_rgba(0,0,0,0.6)] flex flex-col select-none overflow-hidden ${
        isDragging || isResizing ? '' : 'transition-opacity duration-150'
      } opacity-95 hover:opacity-100 relative`}
    >
      {/* 1. Window Titlebar / Drag Handle */}
      <div
        onPointerDown={handleTitlePointerDown}
        className="h-6 bg-[var(--desk-surface-raised)] border-b border-[var(--desk-border)] px-2 flex items-center justify-between cursor-move text-[11px] font-sans font-medium text-[var(--accent-gold)]"
      >
        <div className="flex items-center gap-1.5 pointer-events-none">
          <PixelIcon name="preview" size={12} />
          <span>Live Preview{isMinimized ? '' : ` (${previewScale}x)`}</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setIsMinimized(!isMinimized);
            }}
            className="text-[var(--text-muted)] hover:text-[var(--accent-gold)] font-mono text-xs px-1 cursor-pointer leading-none"
            title={isMinimized ? 'Expand Preview Window' : 'Minimize Preview Window'}
            aria-label={isMinimized ? 'Expand Preview Window' : 'Minimize Preview Window'}
          >
            {isMinimized ? '+' : '–'}
          </button>
          <button
            onPointerDown={(e) => {
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.stopPropagation();
              toggleFloatingPreview();
            }}
            className="text-[var(--text-body)] hover:text-[#ff99aa] font-bold text-xs p-0.5 cursor-pointer leading-none"
            title="Close Preview Window"
            aria-label="Close Preview Window"
          >
            ×
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
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
      <div className="px-2 py-1 bg-[var(--desk-surface-raised)] border-t border-[var(--desk-border)] flex flex-wrap items-center justify-between gap-1 text-[10px] font-mono pr-5">
        {/* Play / Pause Toggle */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`p-1 rounded-[2px] border transition-colors cursor-pointer ${
              isPlaying
                ? 'bg-[var(--accent-gold)] text-[#16141a] border-[#995e1e]'
                : 'bg-[var(--desk-surface)] text-[var(--text-heading)] border-[var(--desk-border)] hover:text-[var(--accent-gold)]'
            }`}
            title={isPlaying ? 'Pause Animation' : 'Play Animation'}
            aria-label={isPlaying ? 'Pause Animation' : 'Play Animation'}
          >
            <PixelIcon name={isPlaying ? 'pause' : 'play'} size={12} />
          </button>
          <span className="text-[10px] text-[var(--accent-gold)] font-bold font-mono">
            #{activeFrameIndex + 1}/{frames.length}
          </span>
          <span className="text-[9px] text-[var(--text-body)] font-mono">({fps} FPS)</span>
        </div>

        {/* Scale Selector (1x, 2x, 4x) */}
        <div className="flex items-center gap-0.5 bg-[var(--desk-surface)] p-0.5 rounded-[2px] border border-[var(--desk-border)]">
          {([1, 2, 4] as const).map((sc) => (
            <button
              key={sc}
              onClick={() => setPreviewScale(sc)}
              className={`px-1 py-0.5 text-[9px] font-bold rounded-[1px] cursor-pointer transition-colors font-mono ${
                previewScale === sc
                  ? 'bg-[var(--accent-gold)] text-[#16141a]'
                  : 'text-[var(--text-body)] hover:text-[var(--accent-gold)]'
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
              className="w-5 h-5 flex items-center justify-center cursor-pointer bg-transparent border-0 p-0"
              title={`Backdrop: ${bg}`}
              aria-label={`Backdrop: ${bg}`}
            >
              <span
                className={`w-3 h-3 rounded-[1px] border block ${
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
        </>
      )}
    </div>
  );
};
