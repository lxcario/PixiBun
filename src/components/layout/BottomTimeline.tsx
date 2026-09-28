'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useStudioStore } from '@/stores/studioStore';
import { TactileButton } from '@/components/ui/TactileButton';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { LoopMode } from '@/types/animation';
import { compositeFrame } from '@/lib/render/compositor';
import { TagManagerModal } from '@/components/modals/TagManagerModal';
import { useCoDrawStatus } from '@/hooks/useCoDrawStatus';
import { MAX_METADATA_NAME_LENGTH, MAX_PROJECT_CLIPS } from '@/lib/project/metadataAdmission';
import { ANIMATION_TIMING_LIMITS } from '@/lib/project/animationTiming';

interface FrameThumbnailProps {
  frameIndex: number;
  isActive: boolean;
}

const FrameThumbnail: React.FC<FrameThumbnailProps> = ({ frameIndex, isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasWidth = useStudioStore((state) => state.canvasWidth);
  const canvasHeight = useStudioStore((state) => state.canvasHeight);
  const frames = useStudioStore((state) => state.frames);
  const bufferVersion = useStudioStore((state) => state.bufferVersion);
  const currentProjectId = useStudioStore((state) => state.currentProjectId);

  const activeBufferVersion = isActive ? bufferVersion : 0;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.imageSmoothingEnabled = false;

    const comp = compositeFrame(frames, frameIndex, canvasWidth, canvasHeight);
    if (comp) {
      ctx.drawImage(comp, 0, 0);
    }
  }, [
    frameIndex,
    canvasWidth,
    canvasHeight,
    frames,
    currentProjectId,
    activeBufferVersion,
  ]);

  return (
    <div className="w-6 h-6 bg-[var(--desk-surface-raised)] border border-[var(--desk-border)] rounded-[1px] flex items-center justify-center overflow-hidden">
      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={canvasHeight}
        data-testid={`frame-thumbnail-${frameIndex}`}
        className="w-full h-full pixelated"
      />
    </div>
  );
};

interface FrameScrubPreviewProps {
  frameIndex: number;
  duration: number;
  layerCount: number;
}

const FrameScrubPreview: React.FC<FrameScrubPreviewProps> = ({ frameIndex, duration, layerCount }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasWidth = useStudioStore((state) => state.canvasWidth);
  const canvasHeight = useStudioStore((state) => state.canvasHeight);
  const frames = useStudioStore((state) => state.frames);
  const bufferVersion = useStudioStore((state) => state.bufferVersion);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.imageSmoothingEnabled = false;
    const comp = compositeFrame(frames, frameIndex, canvasWidth, canvasHeight);
    if (comp) {
      ctx.drawImage(comp, 0, 0);
    }
  }, [frameIndex, canvasWidth, canvasHeight, frames, bufferVersion]);

  return (
    <div
      role="tooltip"
      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 z-40 pointer-events-none flex flex-col items-center gap-1.5 p-2 bg-[var(--surface-3)] border-2 border-[var(--desk-border)] rounded-[var(--radius-md)] shadow-[0_8px_20px_rgba(0,0,0,0.5)] animate-in fade-in zoom-in-95 duration-100 whitespace-nowrap"
    >
      <div className="w-24 h-24 bg-[var(--surface-0)] border border-[var(--desk-border)] rounded-[2px] overflow-hidden flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          className="w-full h-full object-contain pixelated"
        />
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
  const setFps = useStudioStore((s) => s.setFps);
  const loopMode = useStudioStore((s) => s.loopMode);
  const setLoopMode = useStudioStore((s) => s.setLoopMode);
  const onionSkin = useStudioStore((s) => s.onionSkin);
  const setOnionSkin = useStudioStore((s) => s.setOnionSkin);
  const clips = useStudioStore((s) => s.clips);
  const activeClipId = useStudioStore((s) => s.activeClipId);
  const setActiveClipId = useStudioStore((s) => s.setActiveClipId);
  const addClip = useStudioStore((s) => s.addClip);
  const deleteClip = useStudioStore((s) => s.deleteClip);
  const { isGuest } = useCoDrawStatus();
  const guestFrameLockTitle = 'Frame structure is managed by the session host.';

  const [isCreatingClip, setIsCreatingClip] = useState(false);
  const [newClipName, setNewClipName] = useState('New Clip');
  const [isTagManagerOpen, setIsTagManagerOpen] = useState(false);
  const [draggedFrameIndex, setDraggedFrameIndex] = useState<number | null>(null);
  const [dragOverFrameIndex, setDragOverFrameIndex] = useState<number | null>(null);
  const [hoveredFrameIndex, setHoveredFrameIndex] = useState<number | null>(null);

  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

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
    let forward = true;
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
      if (state.activeFrameIndex !== publishedIndex) {
        // A scrub or step starts a fresh hold for the frame the artist selected.
        publishedIndex = state.activeFrameIndex;
        accumulator = 0;
      }
      const clip = state.clips.find((item) => item.id === state.activeClipId);
      const first = clip?.startFrame ?? 0;
      const last = Math.min(clip?.endFrame ?? state.frames.length - 1, state.frames.length - 1);
      let index = publishedIndex;
      if (index < first || index > last) {
        index = first;
        accumulator = 0;
      }
      let stopped = false;
      if (first === last && state.loopMode === 'once') {
        const duration = state.frames[index]?.durationMs ?? Math.round(1000 / state.fps);
        stopped = accumulator >= duration;
      }
      // 250ms of catch-up is the most one RAF can contribute; even 1ms frames fit.
      for (let steps = 0; steps < 256 && first < last; steps++) {
        const duration = state.frames[index]?.durationMs ?? Math.round(1000 / state.fps);
        if (accumulator < duration) break;
        accumulator -= duration;
        if (state.loopMode === 'once' && index === last) {
          stopped = true;
          accumulator = 0;
          break;
        }
        if (state.loopMode === 'ping-pong') {
          if (index === last) forward = false;
          if (index === first) forward = true;
          index += forward ? 1 : -1;
        } else {
          index = index === last ? first : index + 1;
        }
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

  const handleCreateClipSubmit = () => {
    if (newClipName.trim()) {
      addClip(newClipName.trim(), activeFrameIndex, Math.min(frames.length - 1, activeFrameIndex + 1));
    }
    setIsCreatingClip(false);
  };

  if (isCollapsed) {
    return (
      <footer
        data-testid="bottom-timeline-collapsed"
        className="h-7 bg-[var(--desk-surface)] border-t border-[var(--desk-border)] px-3 flex items-center justify-between select-none z-20 text-[var(--text-heading)] shadow-sm transition-colors duration-150 shrink-0"
      >
        {/* Left: Expand Timeline Button & Frame Status */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleCollapsed}
            className="flex items-center gap-1 text-[10px] font-sans font-medium text-[var(--text-body)] hover:text-[var(--text-heading)] pixel-tactile-btn px-2 py-0.5 rounded-[2px] border border-[var(--desk-border)] cursor-pointer"
            title="Expand Full Animation Timeline"
            aria-label="Expand Timeline"
          >
            <PixelIcon name="play" size={10} />
            <span>Timeline ({frames.length})</span>
            <span className="text-[8px] text-[var(--text-muted)]">▲</span>
          </button>

          <span className="text-[10px] font-sans text-[var(--text-muted)]">
            Frame <span className="font-mono font-bold text-[var(--text-heading)]">{activeFrameIndex + 1}</span> / <span className="font-mono">{frames.length}</span>
          </span>
        </div>

        {/* Center: Compact Playback Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleStepBack}
            title="Previous Frame (,)"
            className="p-1 text-[10px] rounded-[2px] border border-[var(--desk-border)] pixel-tactile-btn text-[var(--text-body)] hover:text-[var(--accent-gold)] cursor-pointer"
          >
            <PixelIcon name="step-backward" size={10} />
          </button>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            title="Play / Pause Animation (Space)"
            className={`px-2 py-0.5 text-[10px] font-bold rounded-[2px] border cursor-pointer flex items-center gap-1 ${
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
            className="p-1 text-[10px] rounded-[2px] border border-[var(--desk-border)] pixel-tactile-btn text-[var(--text-body)] hover:text-[var(--accent-gold)] cursor-pointer"
          >
            <PixelIcon name="step-forward" size={10} />
          </button>

          <span className="text-[9px] font-mono text-[var(--text-muted)] ml-1">
            {fps} FPS
          </span>
        </div>

        {/* Right: Quick +Frame and Expand button */}
        <div className="flex items-center gap-2">
          <button
            disabled={isGuest}
            onClick={addFrame}
            title={isGuest ? guestFrameLockTitle : 'Add blank frame with the current layer names and settings (no artwork)'}
            className={`px-1.5 py-0.5 text-[10px] font-sans font-medium rounded-[2px] border border-[var(--desk-border)] pixel-tactile-btn text-[var(--text-body)] hover:text-[var(--text-heading)] cursor-pointer flex items-center gap-1 ${
              isGuest ? 'opacity-40 cursor-not-allowed' : ''
            }`}
          >
            <PixelIcon name="plus" size={10} />
            <span>Frame</span>
          </button>

          <button
            onClick={toggleCollapsed}
            className="text-[10px] font-sans font-medium pixel-tactile-btn rounded-[2px] border border-[var(--desk-border)] text-[var(--text-muted)] hover:text-[var(--text-heading)] flex items-center gap-1 cursor-pointer px-1.5 py-0.5"
            title="Expand Full Timeline"
          >
            <span>▲ Expand</span>
          </button>
        </div>
      </footer>
    );
  }

  return (
    <footer data-testid="bottom-timeline" className="h-28 bg-[var(--desk-surface)] border-t border-[var(--desk-border)] px-4 py-1.5 flex flex-col justify-between select-none z-20 text-[var(--text-heading)] shadow-sm transition-colors duration-150">
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

              {/* Timing Properties: FPS, Duration, Onion Skin */}
              <div className="flex items-center gap-1.5 text-xs">
                {/* FPS Slider */}
                <div className="h-7 flex items-center gap-1.5 bg-[var(--surface-0)] px-2 rounded-[2px] border border-[var(--desk-border)]">
                  <span className="text-[var(--text-muted)] font-sans text-[10px]">FPS:</span>
                  <input
                    type="range"
                    min={ANIMATION_TIMING_LIMITS.fpsMin}
                    max={ANIMATION_TIMING_LIMITS.fpsMax}
                    value={fps}
                    aria-label="Playback speed in frames per second"
                    onChange={(e) => setFps(parseInt(e.target.value, 10))}
                    className="w-14 h-1 accent-[var(--accent-gold)] cursor-pointer"
                  />
                  <span className="text-[var(--text-heading)] min-w-[16px] font-mono text-[10px] text-right tabular-nums">
                    {fps}
                  </span>
                </div>

                {/* Active Frame Duration Input */}
                <div className="h-7 flex items-center gap-1 bg-[var(--surface-0)] px-1.5 rounded-[2px] border border-[var(--desk-border)]">
                  <span className="text-[var(--text-muted)] font-sans text-[10px]">Dur:</span>
                  <input
                    type="number"
                    min={ANIMATION_TIMING_LIMITS.durationMinMs}
                    max={ANIMATION_TIMING_LIMITS.durationMaxMs}
                    step="1"
                    aria-label="Active frame duration in milliseconds"
                    value={frames[activeFrameIndex]?.durationMs || Math.round(1000 / fps)}
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
                  title="Toggle Onion Skinning"
                  className={`h-7 px-2 text-xs font-sans font-medium flex items-center justify-center gap-1 pixel-tactile-btn ${
                    onionSkin.enabled
                      ? 'bg-[var(--surface-3)] text-[var(--accent-gold)] border-[var(--accent-gold)] shadow-[inset_1px_1px_0_rgba(229,169,98,0.2)] font-bold'
                      : 'text-[var(--text-body)] hover:text-[var(--text-heading)]'
                  }`}
                >
                  <PixelIcon name="onion" size={12} />
                  <span>Onion Skin</span>
                </TactileButton>
              </div>
            </>
          )}
        </div>

        {/* Right: Frame Actions (Add, Duplicate, Delete, Collapse) */}
        <div className="flex items-center gap-1.5">
          {!isPlaygroundMode && (
            <>
              <TactileButton
                size="icon-sm"
                variant="default"
                disabled={isGuest || isPlaying || activeFrameIndex === 0}
                onClick={() => reorderFrames(activeFrameIndex, activeFrameIndex - 1)}
                title="Move active frame left"
                aria-label="Move active frame left"
                className="w-7 h-7"
              >
                <PixelIcon name="step-backward" size={12} />
              </TactileButton>
              <TactileButton
                size="icon-sm"
                variant="default"
                disabled={isGuest || isPlaying || activeFrameIndex >= frames.length - 1}
                onClick={() => reorderFrames(activeFrameIndex, activeFrameIndex + 1)}
                title="Move active frame right"
                aria-label="Move active frame right"
                className="w-7 h-7"
              >
                <PixelIcon name="step-forward" size={12} />
              </TactileButton>
            </>
          )}
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
            <>
              <TactileButton
                size="icon-sm"
                variant="default"
                disabled={isGuest}
                onClick={() => duplicateFrame(activeFrameIndex)}
                title={isGuest ? guestFrameLockTitle : 'Duplicate active frame with all layer artwork'}
                className={`w-7 h-7 flex items-center justify-center pixel-tactile-btn text-[var(--text-body)] hover:text-[var(--accent-gold)] ${
                  isGuest ? 'opacity-40 cursor-not-allowed' : ''
                }`}
              >
                <PixelIcon name="copy" size={12} />
              </TactileButton>

              <TactileButton
                size="icon-sm"
                variant="danger"
                disabled={frames.length <= 1 || isGuest}
                onClick={() => deleteFrame(activeFrameIndex)}
                title={isGuest ? guestFrameLockTitle : 'Delete Active Frame'}
                className={`w-7 h-7 flex items-center justify-center pixel-tactile-btn bg-[#3d1928] border-[#6b283d] text-[#ff99aa] hover:bg-[#521e33] ${
                  isGuest ? 'opacity-40 cursor-not-allowed' : ''
                }`}
              >
                <PixelIcon name="trash" size={12} />
              </TactileButton>
            </>
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

      {/* Animation Clips Tag Bar & Frame Thumbnail Reel */}
      <div className="flex items-center gap-3 overflow-x-auto pt-1">
        {/* Clip Tag Badges (Hidden in playground mode to keep it minimal) */}
        {!isPlaygroundMode && (
          <div className="flex items-center gap-1 border-r border-[var(--desk-border)] pr-2 shrink-0">
            <button
              onClick={() => setActiveClipId(null)}
              className={`h-6 px-2 rounded-[2px] text-[10px] font-sans font-medium pixel-tactile-chip cursor-pointer ${
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
                className={`h-6 flex items-center gap-1.5 px-2 rounded-[2px] text-[10px] font-sans font-medium pixel-tactile-chip ${
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
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteClip(clip.id);
                  }}
                  className="w-3.5 h-3.5 flex items-center justify-center text-[#ff99aa] hover:text-[#ffffff] hover:bg-red-500/25 rounded-[1px] cursor-pointer bg-transparent border-0 p-0 text-[11px] leading-none font-bold"
                  aria-label={`Delete clip ${clip.name}`}
                  title="Delete Clip"
                >
                  ×
                </button>
              </div>
            ))}

            {isCreatingClip ? (
              <input
                type="text"
                maxLength={MAX_METADATA_NAME_LENGTH}
                value={newClipName}
                onChange={(e) => setNewClipName(e.target.value)}
                onBlur={handleCreateClipSubmit}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateClipSubmit()}
                ref={(el) => el?.focus()}
                aria-label="New clip name"
                className="h-6 bg-[var(--surface-0)] text-[var(--text-heading)] px-1.5 text-[10px] font-sans rounded-[2px] border border-[var(--accent-gold)] outline-none w-20"
              />
            ) : (
              <>
                <button
                  type="button"
                  disabled={clips.length >= MAX_PROJECT_CLIPS}
                  onClick={() => setIsCreatingClip(true)}
                  className="h-6 px-2 rounded-[2px] text-[10px] font-sans font-medium pixel-tactile-chip text-[var(--text-body)] hover:text-[var(--text-heading)] cursor-pointer flex items-center justify-center"
                  title={clips.length >= MAX_PROJECT_CLIPS ? `Maximum ${MAX_PROJECT_CLIPS} clips reached` : 'Add Tagged Animation Clip'}
                >
                  + Tag Clip
                </button>
                <button
                  type="button"
                  data-testid="manage-tags-button"
                  onClick={() => setIsTagManagerOpen(true)}
                  className="h-6 px-2 rounded-[2px] text-[10px] font-sans font-medium pixel-tactile-chip text-[var(--text-body)] hover:text-[var(--text-heading)] cursor-pointer flex items-center justify-center gap-1"
                  title="Manage Animation Clip Tags"
                >
                  <PixelIcon name="tag" size={10} />
                  <span>Manage</span>
                </button>
              </>
            )}
          </div>
        )}

        {/* Frame Thumbnail Reel (with Click & Drag Reordering) */}
        <div className="flex items-center gap-2">
          {frames.map((frame, index) => {
            const isActive = index === activeFrameIndex;
            const isInsideClip = activeClip ? (index >= activeClip.startFrame && index <= activeClip.endFrame) : true;
            const isBeingDragged = draggedFrameIndex === index;
            const isDropTarget = dragOverFrameIndex === index && draggedFrameIndex !== index;

            const baseTime = Math.round(1000 / fps);
            const duration = frame.durationMs || baseTime;
            const cardWidth = Math.max(56, Math.min(160, Math.round(56 * (duration / baseTime))));
            const isHold = duration >= 2 * baseTime;
            const extraMs = duration - baseTime;

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
                onMouseEnter={() => setHoveredFrameIndex(index)}
                onMouseLeave={() => setHoveredFrameIndex((cur) => (cur === index ? null : cur))}
                onClick={() => setActiveFrame(index)}
                aria-label={`Select frame ${index + 1}. Duration: ${duration}ms. Drag to reorder.`}
                title={
                  isGuest
                    ? `Frame #${index + 1} (${duration}ms) - ${guestFrameLockTitle}`
                    : `Frame #${index + 1} (${duration}ms) - Drag to reorder`
                }
                style={{ width: `${cardWidth}px` }}
                className={`relative min-w-[56px] h-12 rounded-[2px] border-2 ${
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
                {hoveredFrameIndex === index && !isBeingDragged && (
                  <FrameScrubPreview
                    frameIndex={index}
                    duration={duration}
                    layerCount={frame.layers.length}
                  />
                )}

                {/* Timing Hold Badge */}
                {isHold && (
                  <span
                    data-testid={`frame-hold-badge-${index}`}
                    className="absolute -top-1.5 -right-1.5 bg-[#8c5120] text-[var(--accent-gold)] text-[8px] font-mono font-bold px-1 rounded-[2px] border border-[var(--accent-gold)] shadow-xs pointer-events-none z-10"
                  >
                    +{extraMs}ms
                  </span>
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
      </div>

      {/* Tag Manager Modal */}
      <TagManagerModal
        isOpen={isTagManagerOpen}
        onClose={() => setIsTagManagerOpen(false)}
      />
    </footer>
  );
};
