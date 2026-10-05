'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useStudioStore } from '@/stores/studioStore';
import { TactileButton } from '@/components/ui/TactileButton';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { LoopMode } from '@/types/animation';
import { drawFramePreview, frameVisualKey, previewSize, retainFramePreview } from '@/lib/render/framePreview';
import { reserveMemory } from '@/lib/safety/memoryBudget';
import { TagManagerModal } from '@/components/modals/TagManagerModal';
import { useCoDrawStatus } from '@/hooks/useCoDrawStatus';
import { ANIMATION_TIMING_LIMITS } from '@/lib/project/animationTiming';
import { playbackOrder } from '@/lib/export/animationModel';
import { OnionSkinSettings } from './OnionSkinSettings';

interface FrameThumbnailProps {
  frameIndex: number;
  isActive?: boolean;
}

const FrameThumbnail: React.FC<FrameThumbnailProps> = ({ frameIndex }) => {
  const holder = useRef<HTMLDivElement>(null);
  // Server and first client render must agree before browser capability checks.
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') { setVisible(true); return; }
    if (!holder.current) return;
    const observer = new IntersectionObserver(entries => setVisible(entries[0].isIntersecting), { rootMargin: '80px' });
    observer.observe(holder.current);
    return () => observer.disconnect();
  }, []);
  return <div ref={holder} className="w-6 h-6 bg-[var(--desk-surface-raised)] border border-[var(--desk-border)] rounded-[1px] flex items-center justify-center overflow-hidden">
    {visible && <FramePreviewCanvas frameIndex={frameIndex} maxSize={24} testId={`frame-thumbnail-${frameIndex}`} />}
  </div>;
};

const FramePreviewCanvas: React.FC<{ frameIndex: number; maxSize: number; testId?: string }> = ({ frameIndex, maxSize, testId }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasWidth = useStudioStore((state) => state.canvasWidth);
  const canvasHeight = useStudioStore((state) => state.canvasHeight);
  const visualKey = useStudioStore((state) => frameVisualKey(state.frames[frameIndex]));
  const currentProjectId = useStudioStore((state) => state.currentProjectId);
  const size = previewSize(canvasWidth, canvasHeight, maxSize);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let release: (() => void) | undefined;
    try {
      release = reserveMemory(size.width * size.height * 4, 'Frame preview');
      canvas.width = size.width; canvas.height = size.height;
      drawFramePreview(canvas, useStudioStore.getState().frames[frameIndex], canvasWidth, canvasHeight);
      return retainFramePreview(canvas);
    } catch {
      canvas.width = 0; canvas.height = 0;
    } finally { release?.(); }
  }, [frameIndex, canvasWidth, canvasHeight, visualKey, currentProjectId, size.width, size.height]);
  return <canvas ref={canvasRef} width={0} height={0} data-testid={testId} className="max-w-full max-h-full pixelated" />;
};

interface FrameScrubPreviewProps {
  frameIndex: number;
  duration: number;
  layerCount: number;
  anchor: { x: number; y: number };
}

const FrameScrubPreview: React.FC<FrameScrubPreviewProps> = ({ frameIndex, duration, layerCount, anchor }) => {
  return (
    <div
      role="tooltip"
      style={{ left: Math.max(8, Math.min(window.innerWidth - 120, anchor.x - 56)), top: Math.max(8, anchor.y - 168) }}
      className="fixed z-[100] pointer-events-none flex flex-col items-center gap-1.5 p-2 bg-[var(--surface-3)] border-2 border-[var(--desk-border)] rounded-[var(--radius-md)] shadow-[0_8px_20px_rgba(0,0,0,0.5)] animate-in fade-in zoom-in-95 duration-100 whitespace-nowrap"
    >
      <div className="w-24 h-24 bg-[var(--surface-0)] border border-[var(--desk-border)] rounded-[2px] overflow-hidden flex items-center justify-center">
        <FramePreviewCanvas frameIndex={frameIndex} maxSize={96} />
      </div>
      <div className="flex items-center justify-between w-full px-0.5 text-[10px] font-mono text-[var(--text-heading)]">
        <span className="text-[var(--accent-gold)] font-bold">Frame #{frameIndex + 1}</span>
        <span className="text-[var(--text-muted)]">{duration}ms</span>
      </div>
      <div className="text-[9px] font-mono text-[var(--text-muted)] w-full text-left px-0.5">
        {layerCount} {layerCount === 1 ? 'layer' : 'layers'}
      </div>
    </div>
  );
};

export interface BottomTimelineProps {
  isPlaygroundMode?: boolean;
}

export const BottomTimeline: React.FC<BottomTimelineProps> = ({ isPlaygroundMode = false }) => {
  const frames = useStudioStore((s) => s.frames);
  const activeFrameIndex = useStudioStore((s) => s.activeFrameIndex);
  const currentProjectId = useStudioStore((s) => s.currentProjectId);
  const setActiveFrame = useStudioStore((s) => s.setActiveFrame);
  const reorderFrames = useStudioStore((s) => s.reorderFrames);
  const addFrame = useStudioStore((s) => s.addFrame);
  const duplicateFrame = useStudioStore((s) => s.duplicateFrame);
  const deleteFrame = useStudioStore((s) => s.deleteFrame);
  const setFrameDuration = useStudioStore((s) => s.setFrameDuration);
  const durationGestureFrameRef = useRef<number | null>(null);
  useEffect(() => {
    durationGestureFrameRef.current = null;
  }, [activeFrameIndex, currentProjectId]);
  const isPlaying = useStudioStore((s) => s.isPlaying);
  const setIsPlaying = useStudioStore((s) => s.setIsPlaying);
  const fps = useStudioStore((s) => s.fps);
  const loopMode = useStudioStore((s) => s.loopMode);
  const setLoopMode = useStudioStore((s) => s.setLoopMode);
  const onionSkin = useStudioStore((s) => s.onionSkin);
  const setOnionSkin = useStudioStore((s) => s.setOnionSkin);
  const onionNotice = onionSkin.enabled
    ? frames.length <= 1
      ? 'Add another frame to see neighboring drawings.'
      : isPlaying
        ? 'Pause to see onion skin while editing.'
        : null
    : null;
  const clips = useStudioStore((s) => s.clips);
  const activeClipId = useStudioStore((s) => s.activeClipId);
  const setActiveClipId = useStudioStore((s) => s.setActiveClipId);
  const { isGuest } = useCoDrawStatus();
  const guestFrameLockTitle = 'Frame structure is managed by the session host.';

  const [isTagManagerOpen, setIsTagManagerOpen] = useState(false);
  const [isOnionSettingsOpen, setIsOnionSettingsOpen] = useState(false);
  const [draggedFrameIndex, setDraggedFrameIndex] = useState<number | null>(null);
  const [dragOverFrameIndex, setDragOverFrameIndex] = useState<number | null>(null);
  const [hoveredFrameIndex, setHoveredFrameIndex] = useState<number | null>(null);
  const [hoverPreviewAnchor, setHoverPreviewAnchor] = useState<{ x: number; y: number } | null>(null);

  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [previewSpeed, setPreviewSpeed] = useState(1);
  const [isPreviewMenuOpen, setIsPreviewMenuOpen] = useState(false);
  const previewMenuRef = useRef<HTMLDivElement>(null);
  const previewSpeedRef = useRef(previewSpeed);
  previewSpeedRef.current = previewSpeed;

  useEffect(() => {
    if (!isPreviewMenuOpen) return;
    const closeOutside = (event: MouseEvent) => {
      if (!previewMenuRef.current?.contains(event.target as Node)) setIsPreviewMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsPreviewMenuOpen(false);
    };
    document.addEventListener('mousedown', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isPreviewMenuOpen]);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('pixibun:timeline-collapsed');
        if (stored === 'true') {
          setIsCollapsed(true);
        }
      }
    } catch {
      // Ignore localStorage access errors
    }
  }, []);

  const toggleCollapsed = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('pixibun:timeline-collapsed', String(next));
      }
      return next;
    });
  };

  const activeClip = clips.find(c => c.id === activeClipId);

  // Frame Drag-and-Drop Reordering Handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (isGuest) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('text/plain', String(index));
    e.dataTransfer.effectAllowed = 'move';
    setDraggedFrameIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverFrameIndex !== index) {
      setDragOverFrameIndex(index);
    }
  };

  const handleDragLeave = (e: React.DragEvent, index: number) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    if (dragOverFrameIndex === index) {
      setDragOverFrameIndex(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const sourceIndexStr = e.dataTransfer.getData('text/plain');
    const sourceIndex = sourceIndexStr ? parseInt(sourceIndexStr, 10) : draggedFrameIndex;

    if (sourceIndex !== null && !isNaN(sourceIndex) && sourceIndex !== targetIndex) {
      reorderFrames(sourceIndex, targetIndex);
    }
    setDraggedFrameIndex(null);
    setDragOverFrameIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedFrameIndex(null);
    setDragOverFrameIndex(null);
  };

  // Keep one clock for the playback session. Frame changes must not discard elapsed time.
  useEffect(() => {
    if (!isPlaying) return;

    let lastTimestamp: number | null = null;
    let accumulator = 0;
    let animFrameId: number;
    let sequenceKey = '', position = 0;
    let sequence: number[] = [];
    let publishedIndex = useStudioStore.getState().activeFrameIndex;

    const onVisibilityChange = () => {
      // A background tab is suspended; resume without replaying hidden time.
      lastTimestamp = null;
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    const tick = (timestamp: number) => {
      if (document.hidden) {
        lastTimestamp = null;
        animFrameId = requestAnimationFrame(tick);
        return;
      }
      if (lastTimestamp !== null) accumulator += Math.max(0, Math.min(250, timestamp - lastTimestamp));
      lastTimestamp = timestamp;
      const state = useStudioStore.getState();
      if (!state.isPlaying) return;
      const clip = state.clips.find((item) => item.id === state.activeClipId);
      const first = clip?.startFrame ?? 0;
      const last = Math.min(clip?.endFrame ?? state.frames.length - 1, state.frames.length - 1);
      const key = `${clip?.id}:${first}:${last}:${clip?.loopMode}:${state.loopMode}`;
      if (key !== sequenceKey) {
        sequenceKey = key; sequence = playbackOrder(first, last, clip?.loopMode, state.loopMode);
        position = 0; accumulator = 0;
      } else if (state.activeFrameIndex !== publishedIndex) {
        // An explicit scrub starts a fresh hold on the forward leg.
        position = Math.max(0, sequence.indexOf(state.activeFrameIndex)); accumulator = 0;
      }
      let index = sequence[position] ?? first;
      let stopped = false;
      if (first === last && state.loopMode === 'once') {
        const duration = state.frames[index]?.durationMs ?? Math.round(1000 / state.fps);
        stopped = accumulator >= duration / previewSpeedRef.current;
      }
      // 250ms of catch-up is the most one RAF can contribute; even 1ms frames fit.
      for (let steps = 0; steps < 256 && first < last; steps++) {
        const duration = state.frames[index]?.durationMs ?? Math.round(1000 / state.fps);
        const previewDuration = duration / previewSpeedRef.current;
        if (accumulator < previewDuration) break;
        accumulator -= previewDuration;
        if (state.loopMode === 'once' && position === sequence.length - 1) {
          stopped = true;
          accumulator = 0;
          break;
        }
        position = (position + 1) % sequence.length;
        index = sequence[position];
      }
      if (index !== publishedIndex) {
        publishedIndex = index;
        state.setActiveFrame(index);
      }
      if (stopped) {
        state.setIsPlaying(false);
        return;
      }
      animFrameId = requestAnimationFrame(tick);
    };

    animFrameId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(animFrameId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [isPlaying]);

  const handleStepForward = () => {
    if (activeFrameIndex < frames.length - 1) {
      setActiveFrame(activeFrameIndex + 1);
    } else {
      setActiveFrame(0);
    }
  };

  const handleStepBack = () => {
    if (activeFrameIndex > 0) {
      setActiveFrame(activeFrameIndex - 1);
    } else {
      setActiveFrame(frames.length - 1);
    }
  };

  const cycleLoopMode = () => {
    const modes: LoopMode[] = ['repeat', 'ping-pong', 'once'];
    const nextIdx = (modes.indexOf(loopMode) + 1) % modes.length;
    setLoopMode(modes[nextIdx]);
  };

  if (isCollapsed) {
    return (
      <footer
        data-testid="bottom-timeline-collapsed"
        className="h-9 bg-[var(--desk-surface)] border-t border-[var(--desk-border)] px-3 flex items-center justify-between select-none z-20 text-[var(--text-heading)] shadow-sm transition-colors duration-150 shrink-0"
      >
        {/* Left: Expand Timeline Button & Frame Status */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleCollapsed}
            className="h-7 flex items-center gap-1 text-[10px] font-sans font-medium text-[var(--text-body)] hover:text-[var(--text-heading)] pixel-tactile-btn px-2 rounded-[2px] border border-[var(--desk-border)] cursor-pointer"
            title="Expand Full Animation Timeline"
            aria-label="Expand Timeline"
          >
            <PixelIcon name="play" size={10} />
            <span>Timeline ({frames.length})</span>
            <span className="text-[8px] text-[var(--text-muted)]">▲</span>
          </button>

          <span className="text-[10px] font-sans text-[var(--text-muted)]">
            Frame <span className="font-mono font-bold text-[var(--text-heading)]">{activeFrameIndex + 1}</span> / <span className="font-mono">{frames.length}</span>
            {frames.length === 1 && <span className="hidden sm:inline text-[var(--text-muted)]"> · Static Sprite</span>}
          </span>
        </div>

        {/* Center: Compact Playback Controls or Static Drawing Hint */}
        {frames.length > 1 ? (
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleStepBack}
              title="Previous Frame (,)"
              className="w-7 h-7 flex items-center justify-center rounded-[2px] border border-[var(--desk-border)] pixel-tactile-btn text-[var(--text-body)] hover:text-[var(--accent-gold)] cursor-pointer"
            >
              <PixelIcon name="step-backward" size={10} />
            </button>

            <button
              onClick={() => setIsPlaying(!isPlaying)}
              title="Play / Pause Animation (Space)"
              className={`h-7 min-w-[68px] px-2 text-[10px] font-bold rounded-[2px] border cursor-pointer flex items-center justify-center gap-1 ${
                isPlaying
                  ? 'pixel-primary-btn shadow-[0_2px_0_#8c5120]'
                  : 'pixel-tactile-btn border-[var(--desk-border)] text-[var(--text-heading)] hover:text-[var(--accent-gold)]'
              }`}
            >
              <PixelIcon name={isPlaying ? 'pause' : 'play'} size={10} />
              <span>{isPlaying ? 'Pause' : 'Play'}</span>
            </button>

            <button
              onClick={handleStepForward}
              title="Next Frame (.)"
              className="w-7 h-7 flex items-center justify-center rounded-[2px] border border-[var(--desk-border)] pixel-tactile-btn text-[var(--text-body)] hover:text-[var(--accent-gold)] cursor-pointer"
            >
              <PixelIcon name="step-forward" size={10} />
            </button>

            <span className="text-[10px] font-mono text-[var(--text-muted)] ml-1">
              {previewSpeed}× preview
            </span>
          </div>
        ) : (
          <div className="hidden sm:flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
            <span>Tip: Click &quot;＋ Add Frame&quot; to turn into an animation</span>
          </div>
        )}

        {/* Right: Quick +Frame and Expand button */}
        <div className="flex items-center gap-2">
          <button
            disabled={isGuest}
            onClick={() => {
              addFrame();
              setIsCollapsed(false);
            }}
            title={isGuest ? guestFrameLockTitle : 'Add blank frame to start animating'}
            className={`h-7 px-2.5 text-[10px] font-sans font-medium rounded-[2px] border border-[var(--desk-border)] pixel-tactile-btn text-[var(--text-body)] hover:text-[var(--text-heading)] cursor-pointer flex items-center gap-1.5 ${
              isGuest ? 'opacity-40 cursor-not-allowed' : 'hover:border-[var(--accent-gold)]'
            }`}
          >
            <PixelIcon name="plus" size={10} />
            <span>{frames.length === 1 ? 'Add Frame to Animate' : 'Frame'}</span>
          </button>

          <button
            onClick={toggleCollapsed}
            className="h-7 text-[10px] font-sans font-medium pixel-tactile-btn rounded-[2px] border border-[var(--desk-border)] text-[var(--text-muted)] hover:text-[var(--text-heading)] flex items-center gap-1 cursor-pointer px-2"
            title="Expand Full Timeline"
          >
            <span>▲ Expand</span>
          </button>
        </div>
      </footer>
    );
  }

  return (
    <footer data-testid="bottom-timeline" className="h-32 bg-[var(--desk-surface)] border-t border-[var(--desk-border)] px-4 py-1.5 flex flex-col justify-between select-none z-20 text-[var(--text-heading)] shadow-sm transition-colors duration-150">
      {/* Top Controls Bar: Play, FPS, Loop Mode, Onion Skin, Frame Actions */}
      <div className="flex items-center justify-between border-b border-[var(--desk-border)] pb-1.5">
        {/* Left: Unified Playback & Timing Instrument */}
        <div className="flex items-center gap-2.5">
          {/* Playback Controls */}
          <div className="flex items-center gap-1">
            <TactileButton
              size="sm"
              variant={isPlaying ? 'primary' : 'default'}
              onClick={() => setIsPlaying(!isPlaying)}
              title="Play / Pause Animation (Space)"
              data-tutorial="play-button"
              className={`h-7 min-w-[78px] px-2 text-xs flex items-center justify-center gap-1.5 font-medium ${
                isPlaying
                  ? 'pixel-primary-btn'
                  : 'pixel-tactile-btn text-[var(--text-heading)] hover:text-[var(--accent-gold)]'
              }`}
            >
              <PixelIcon name={isPlaying ? 'pause' : 'play'} size={12} />
              <span>{isPlaying ? 'Pause' : 'Play'}</span>
            </TactileButton>

            <TactileButton
              size="icon-sm"
              variant="default"
              onClick={handleStepBack}
              title="Previous Frame (,)"
              className="w-7 h-7 flex items-center justify-center pixel-tactile-btn text-[var(--text-body)] hover:text-[var(--accent-gold)]"
            >
              <PixelIcon name="step-backward" size={11} />
            </TactileButton>

            <TactileButton
              size="icon-sm"
              variant="default"
              onClick={handleStepForward}
              title="Next Frame (.)"
              className="w-7 h-7 flex items-center justify-center pixel-tactile-btn text-[var(--text-body)] hover:text-[var(--accent-gold)]"
            >
              <PixelIcon name="step-forward" size={11} />
            </TactileButton>

            {!isPlaygroundMode && (
              <TactileButton
                size="sm"
                variant="default"
                onClick={cycleLoopMode}
                title={`Loop Mode: ${loopMode}`}
                className="h-7 px-2 text-xs font-sans font-medium pixel-tactile-btn text-[var(--text-body)] hover:text-[var(--text-heading)] flex items-center justify-center gap-1"
              >
                <PixelIcon name={loopMode === 'ping-pong' ? 'ping-pong' : 'loop'} size={11} />
                <span>{loopMode === 'ping-pong' ? 'Ping-Pong' : loopMode === 'repeat' ? 'Repeat' : 'Once'}</span>
              </TactileButton>
            )}
          </div>

          {!isPlaygroundMode && (
            <>
              <div className="h-4 w-px bg-[var(--desk-border)]" />

              {/* Preview speed, frame timing, and onion skin */}
              <div className="flex items-center gap-1.5 text-xs">
                <div ref={previewMenuRef} className="relative">
                  <button type="button" onClick={() => setIsPreviewMenuOpen((open) => !open)}
                    aria-label="Preview speed" aria-expanded={isPreviewMenuOpen}
                    className="h-7 min-w-[102px] flex items-center justify-between gap-2 bg-[var(--surface-0)] px-2 rounded-[2px] border border-[var(--desk-border)] text-[var(--text-heading)] hover:border-[var(--desk-border-highlight)]">
                    <span className="text-[var(--text-muted)] text-[10px]">Preview</span>
                    <span className="font-mono text-[11px]">{previewSpeed}×</span>
                    <span aria-hidden="true" className="text-[var(--text-muted)]">▾</span>
                  </button>
                  {isPreviewMenuOpen && (
                    <div role="group" aria-label="Preview speeds"
                      className="absolute bottom-full left-0 mb-1 z-[100] w-full bg-[var(--surface-2)] border border-[var(--desk-border-highlight)] rounded-[2px] p-1 shadow-lg">
                      {[0.5, 1, 2].map((speed) => (
                        <button key={speed} type="button" onClick={() => { setPreviewSpeed(speed); setIsPreviewMenuOpen(false); }}
                          aria-label={`${speed}× preview speed`} aria-pressed={previewSpeed === speed}
                          className={`block w-full px-2 py-1.5 text-left font-mono text-xs rounded-[2px] hover:bg-[var(--surface-3)] ${previewSpeed === speed ? 'text-[var(--accent-gold)] bg-[var(--surface-3)]' : 'text-[var(--text-heading)]'}`}>
                          {speed}×
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Active Frame Duration Input */}
                <div className="h-7 flex items-center gap-1 bg-[var(--surface-0)] px-1.5 rounded-[2px] border border-[var(--desk-border)]">
                  <span className="text-[var(--text-muted)] font-sans text-[10px]">Frame time</span>
                  <input
                    type="number"
                    min={ANIMATION_TIMING_LIMITS.durationMinMs}
                    max={ANIMATION_TIMING_LIMITS.durationMaxMs}
                    step="1"
                    aria-label="Active frame duration in milliseconds"
                    value={frames[activeFrameIndex]?.durationMs ?? Math.round(1000 / fps)}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val) && val >= ANIMATION_TIMING_LIMITS.durationMinMs) {
                        if (setFrameDuration(activeFrameIndex, val, durationGestureFrameRef.current === activeFrameIndex)) {
                          durationGestureFrameRef.current = activeFrameIndex;
                        }
                      }
                    }}
                    onPointerUp={() => { durationGestureFrameRef.current = null; }}
                    onKeyDown={(e) => {
                      if ((e.ctrlKey || e.metaKey) && ['z', 'y'].includes(e.key.toLowerCase())) durationGestureFrameRef.current = null;
                    }}
                    onBlur={() => { durationGestureFrameRef.current = null; }}
                    className="w-11 h-5 bg-transparent text-[var(--text-heading)] font-mono text-right px-0.5 outline-none text-[10px] tabular-nums"
                  />
                  <span className="text-[var(--text-muted)] text-[9px] font-mono">ms</span>
                </div>

                {/* Onion Skinning Toggle */}
                <TactileButton
                  size="sm"
                  variant="default"
                  onClick={() => setOnionSkin({ enabled: !onionSkin.enabled })}
                  title={onionNotice ?? 'Toggle Onion Skinning'}
                  aria-pressed={onionSkin.enabled}
                  aria-describedby={onionNotice ? 'onion-skin-notice' : undefined}
                  className={`h-7 px-2 text-xs font-sans font-medium flex items-center justify-center gap-1 pixel-tactile-btn ${
                    onionSkin.enabled
                      ? 'bg-[var(--surface-3)] text-[var(--accent-gold)] border-[var(--accent-gold)] shadow-[inset_1px_1px_0_rgba(229,169,98,0.2)] font-bold'
                      : 'text-[var(--text-body)] hover:text-[var(--text-heading)]'
                  }`}
                >
                  <PixelIcon name="onion" size={12} />
                  <span>Onion Skin</span>
                </TactileButton>
                <button type="button" data-testid="onion-settings" aria-label="Onion skin settings" title="Configure onion skin" onClick={() => setIsOnionSettingsOpen(true)} className="h-7 w-7 border border-[var(--desk-border)] rounded-sm text-sm">⚙</button>
                <span id="onion-skin-notice" className="w-[94px] shrink-0 text-[9px] leading-tight text-[var(--text-muted)]" aria-live="polite">
                  {onionNotice}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Right: Frame Actions (Add, Duplicate, Delete, Collapse) */}
        <div className="flex items-center gap-1.5">
          <TactileButton
            size="sm"
            variant="default"
            disabled={isGuest}
            onClick={addFrame}
            title={isGuest ? guestFrameLockTitle : 'Add blank frame with the current layer names and settings (no artwork)'}
            aria-label="+ Frame"
            data-testid="add-frame-button"
            data-tutorial="add-frame"
            className={`h-7 px-2.5 text-xs pixel-tactile-btn text-[var(--text-heading)] hover:text-[var(--accent-gold)] flex items-center justify-center gap-1 font-medium ${
              isGuest ? 'opacity-40 cursor-not-allowed' : ''
            }`}
          >
            <PixelIcon name="plus" size={12} />
            <span>Frame</span>
          </TactileButton>

          {!isPlaygroundMode && (
            <details className="relative group">
              <summary className="h-7 px-2 flex items-center gap-1 text-xs pixel-tactile-btn text-[var(--text-body)] hover:text-[var(--text-heading)] cursor-pointer list-none rounded-[2px]">
                Frame actions <span aria-hidden="true">▾</span>
              </summary>
              <div className="absolute right-0 bottom-full mb-1 z-40 min-w-40 p-1 bg-[var(--surface-2)] border border-[var(--desk-border-highlight)] rounded-[2px] shadow-lg">
                {([
                  ['Duplicate frame', () => duplicateFrame(activeFrameIndex), isGuest],
                  ['Move frame earlier', () => reorderFrames(activeFrameIndex, activeFrameIndex - 1), isGuest || isPlaying || activeFrameIndex === 0],
                  ['Move frame later', () => reorderFrames(activeFrameIndex, activeFrameIndex + 1), isGuest || isPlaying || activeFrameIndex >= frames.length - 1],
                  ['Delete frame', () => deleteFrame(activeFrameIndex), isGuest || frames.length <= 1],
                ] as const).map(([label, action, disabled]) => (
                  <button key={label} type="button" disabled={disabled} onClick={(event) => {
                    action();
                    event.currentTarget.closest('details')?.removeAttribute('open');
                  }} className="block w-full text-left px-2 py-1.5 text-xs text-[var(--text-body)] hover:bg-[var(--surface-3)] disabled:opacity-40 rounded-[2px]">
                    {label}
                  </button>
                ))}
              </div>
            </details>
          )}

          <div className="h-4 w-px bg-[var(--desk-border)] mx-0.5" />

          <TactileButton
            size="sm"
            variant="default"
            onClick={toggleCollapsed}
            title="Collapse Timeline to compact strip"
            aria-label="Collapse Timeline"
            className="h-7 text-xs px-2 pixel-tactile-btn text-[var(--text-muted)] hover:text-[var(--text-heading)] flex items-center justify-center gap-1 font-medium"
          >
            <span className="text-[9px]">▼</span>
            <span>Collapse</span>
          </TactileButton>
        </div>
      </div>

      {/* Clips appear only when a clip is in use; frames remain the primary row. */}
      <div className="flex items-center gap-3 min-w-0 pt-1">
        {!isPlaygroundMode && (clips.length > 1 || activeClipId !== null) && (
          <div className="flex items-center gap-1 border-r border-[var(--desk-border)] pr-2 shrink-0">
            <button
              onClick={() => setActiveClipId(null)}
              aria-label={`Filter clips: All frames (${frames.length})`}
              title="Show all frames in timeline"
              data-testid="timeline-clip-filter-all"
              className={`h-7 px-2 rounded-[2px] text-[10px] font-sans font-medium pixel-tactile-chip cursor-pointer ${
                activeClipId === null
                  ? 'bg-[var(--surface-3)] text-[var(--accent-gold)] border-[var(--accent-gold)] font-bold shadow-xs'
                  : 'text-[var(--text-body)] hover:text-[var(--text-heading)]'
              }`}
            >
              All Frames ({frames.length})
            </button>

            {clips.map(clip => (
              <div
                key={clip.id}
                className={`h-7 flex items-center gap-1.5 px-2 rounded-[2px] text-[10px] font-sans font-medium pixel-tactile-chip ${
                  activeClipId === clip.id
                    ? 'bg-[var(--surface-3)] text-[var(--accent-gold)] border-[var(--accent-gold)] font-bold shadow-xs'
                    : 'text-[var(--text-body)] hover:text-[var(--text-heading)]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setActiveClipId(clip.id)}
                  className="cursor-pointer font-medium font-sans text-[10px] bg-transparent border-0 p-0 text-inherit text-left leading-none"
                >
                  {clip.name} ({clip.startFrame + 1}-{clip.endFrame + 1})
                </button>
              </div>
            ))}

          </div>
        )}

        {/* Frame Thumbnail Reel (with Click & Drag Reordering) */}
        <div className="flex items-center gap-2 min-w-0 flex-1 overflow-x-auto py-0.5">
          {frames.map((frame, index) => {
            const isActive = index === activeFrameIndex;
            const isInsideClip = activeClip ? (index >= activeClip.startFrame && index <= activeClip.endFrame) : true;
            const isBeingDragged = draggedFrameIndex === index;
            const isDropTarget = dragOverFrameIndex === index && draggedFrameIndex !== index;

            const baseTime = Math.round(1000 / fps);
            const duration = frame.durationMs ?? baseTime;

            return (
              <button
                type="button"
                key={frame.id}
                draggable={!isPlaying && !isGuest}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={(e) => handleDragLeave(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                onMouseEnter={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect();
                  setHoverPreviewAnchor({ x: rect.left + rect.width / 2, y: rect.top });
                  setHoveredFrameIndex(index);
                }}
                onMouseLeave={() => setHoveredFrameIndex((cur) => (cur === index ? null : cur))}
                onClick={() => setActiveFrame(index)}
                aria-label={`Select frame ${index + 1}. Duration: ${duration}ms. Drag to reorder.`}
                title={
                  isGuest
                    ? `Frame #${index + 1} (${duration}ms) - ${guestFrameLockTitle}`
                    : `Frame #${index + 1} (${duration}ms) - Drag to reorder`
                }
                className={`relative w-[72px] h-16 shrink-0 rounded-[2px] border-2 ${
                  isGuest ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'
                } transition-all flex flex-col items-center justify-between px-1.5 py-1 select-none text-left ${
                  isBeingDragged
                    ? 'opacity-30 scale-95 border-dashed border-[var(--accent-gold)] bg-[#1a0f2e]'
                    : isDropTarget
                    ? 'border-[var(--accent-gold)] bg-[#3d2757] ring-2 ring-[var(--accent-gold)] shadow-[0_0_12px_rgba(240,190,124,0.6)] scale-105'
                    : isActive
                    ? 'bg-[var(--timeline-frame-active-bg)] border-[var(--timeline-frame-active-border)] shadow-[var(--timeline-frame-active-shadow,none)]'
                    : isInsideClip
                    ? 'bg-[var(--desk-surface-raised)] border-[var(--desk-border)] hover:bg-[var(--timeline-frame-hover-bg)] hover:border-[var(--timeline-frame-hover-border)]'
                    : 'bg-[var(--desk-surface-raised)] border-[#2c1e3a] opacity-50 hover:opacity-80'
                }`}
              >
                {/* Scrubbing Enlarged Popup Preview */}
                {hoveredFrameIndex === index && hoverPreviewAnchor && !isBeingDragged && createPortal(
                  <FrameScrubPreview
                    frameIndex={index}
                    duration={duration}
                    layerCount={frame.layers.length}
                    anchor={hoverPreviewAnchor}
                  />, document.body
                )}

                <div className="w-full flex justify-between items-center text-[9px] font-mono leading-none pointer-events-none">
                  <span className={isActive ? 'text-[var(--accent-gold)] font-bold' : 'text-[var(--text-heading)] font-bold'}>
                    #{index + 1}
                  </span>
                  <span className={isActive ? 'text-[var(--accent-gold)] font-medium' : 'text-[var(--text-body)] font-medium'}>
                    {duration}ms
                  </span>
                </div>

                {/* Frame Canvas Pixel Thumbnail */}
                <div className="pointer-events-none">
                  <FrameThumbnail frameIndex={index} isActive={isActive} />
                </div>
              </button>
            );
          })}
        </div>
        {!isPlaygroundMode && (
          <button type="button" data-testid="manage-tags-button" onClick={() => setIsTagManagerOpen(true)}
            className="h-7 px-2 shrink-0 rounded-[2px] text-xs font-sans pixel-tactile-chip text-[var(--text-body)] hover:text-[var(--text-heading)] flex items-center gap-1"
            title="Create and manage animation clips">
            <PixelIcon name="tag" size={11} /> Clips
          </button>
        )}
      </div>

      {/* Tag Manager Modal */}
      {isOnionSettingsOpen && <OnionSkinSettings onClose={() => setIsOnionSettingsOpen(false)} />}
      <TagManagerModal
        isOpen={isTagManagerOpen}
        onClose={() => setIsTagManagerOpen(false)}
      />
    </footer>
  );
};
