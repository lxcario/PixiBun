'use client';

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, animate, motion, useMotionValue, type AnimationPlaybackControls } from 'motion/react';
import { SpringSurface } from '@/components/ui/surfaces/SpringSurface';
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
import { usePlaybackClock } from '@/hooks/studio/usePlaybackClock';
import { OnionSkinSettings } from './OnionSkinSettings';
import { useThrottledValue } from '@/hooks/useThrottledValue';
import { usePreferencesStore } from '@/stores/preferencesStore';
import { playbackKey } from '@/lib/input/keymap';
import { ENTER_BLUR, FADE_IN, MORPH_H, REDUCED_FADE, UNBLUR, spring } from '@/lib/motion/springs';
import { readReducedMotion, useReducedMotion } from '@/lib/motion/useReducedMotion';
import { studioEvents } from '@/lib/events/studioEvents';

// 24px: the WCAG 2.2 minimum target size; both fit side by side on a 76px card.
const cardActionClass = 'absolute bottom-1 w-6 h-6 flex items-center justify-center rounded-[3px] border border-[var(--desk-border)] bg-[var(--desk-surface)] text-[var(--text-body)] hover:text-[var(--text-heading)] hover:border-[var(--desk-border-highlight)] opacity-0 group-hover/frame:opacity-100 group-focus-within/frame:opacity-100 focus-visible:opacity-100 transition-opacity cursor-pointer';

/** Total running time as animators read it: 0.6 s, 1.25 s, 12.5 s. */
function formatSeconds(ms: number): string {
  return `${Number((ms / 1000).toFixed(ms < 10000 ? 2 : 1))} s`;
}

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

export const FramePreviewCanvas: React.FC<{ frameIndex: number; maxSize: number; testId?: string }> = ({ frameIndex, maxSize, testId }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasWidth = useStudioStore((state) => state.canvasWidth);
  const canvasHeight = useStudioStore((state) => state.canvasHeight);
  // Thumbnails catch up a few times a second during a stroke instead of re-compositing every frame.
  const visualKey = useThrottledValue(useStudioStore((state) => frameVisualKey(state.frames[frameIndex])), 150);
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

export const BottomTimeline = React.memo(function BottomTimeline({ isPlaygroundMode = false }: BottomTimelineProps) {
  // Standard keymap plays with Enter (Space pans); classic plays with Space.
  const playKeyLabel = usePreferencesStore((s) => (playbackKey(s.keymap) === 'Enter' ? 'Enter' : 'Space'));
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
    toggledRef.current = true;
    setIsCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('pixibun:timeline-collapsed', String(next));
      }
      return next;
    });
  };

  // ── Collapse / expand: the strip springs between its heights like the Dynamic island ──
  // The footer keeps its class height (h-9 / h-32); while morphing it carries a pixel height on the
  // island's bouncy height spring (460/25), never dipping below the compact strip. The incoming
  // content is laid out at its final size (clipped, not squeezed) and blooms in from blur.
  const reduceMotion = useReducedMotion();
  const toggledRef = useRef(false);
  const shellRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const restHeight = useRef<number | null>(null);
  const shellHeight = useMotionValue(0);
  const morph = useRef<AnimationPlaybackControls | null>(null);
  useLayoutEffect(() => {
    const shell = shellRef.current;
    const content = contentRef.current;
    if (!shell || !content) return;
    const from = morph.current ? shellHeight.get() : restHeight.current;
    morph.current?.stop();
    shell.style.height = '';
    shell.style.overflow = '';
    shell.removeAttribute('data-morphing');
    content.style.height = '';
    const to = shell.offsetHeight;
    restHeight.current = to;
    if (from === null || Math.abs(from - to) < 0.5 || readReducedMotion()) { morph.current = null; return; }
    const style = getComputedStyle(shell);
    const box = to - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom) - parseFloat(style.borderTopWidth) - parseFloat(style.borderBottomWidth);
    const floor = Math.min(from, to);
    content.style.height = `${box}px`;
    shell.style.overflow = 'clip';
    shell.setAttribute('data-morphing', '');
    shellHeight.jump(from);
    shell.style.height = `${from}px`;
    const write = shellHeight.on('change', value => { shell.style.height = `${Math.max(floor, value)}px`; });
    const run = animate(shellHeight, to, spring(MORPH_H));
    morph.current = run;
    void run.then(() => {
      if (morph.current !== run) return;
      morph.current = null;
      shell.style.height = '';
      shell.style.overflow = '';
      shell.removeAttribute('data-morphing');
      content.style.height = '';
    });
    return () => write();
  }, [isCollapsed, shellHeight]);
  useEffect(() => () => morph.current?.stop(), []);
  const bloomFrom = !toggledRef.current ? false
    : reduceMotion ? { opacity: 0 } : { opacity: 0, filter: `blur(${ENTER_BLUR}px)` };
  const bloomTo = reduceMotion
    ? { opacity: 1, transition: REDUCED_FADE }
    : { opacity: 1, filter: 'blur(0px)', transitionEnd: { filter: 'none' }, transition: { opacity: FADE_IN, filter: UNBLUR } };

  const activeClip = clips.find(c => c.id === activeClipId);
  const totalMs = frames.reduce((sum, frame) => sum + (frame.durationMs ?? Math.round(1000 / fps)), 0);

  // ── Frame actions: one set of helpers behind the toolbar, the cards, the menu and the keys ──
  const reelRef = useRef<HTMLDivElement>(null);
  const frameMenuRef = useRef<HTMLDivElement>(null);
  const [frameMenu, setFrameMenu] = useState<{ index: number; x: number; y: number } | null>(null);
  // Portals exist only on the client; the server and first client render match without it.
  const [portalReady, setPortalReady] = useState(false);
  useEffect(() => setPortalReady(true), []);

  const focusFrame = (index: number) => {
    // After React has re-rendered the reel (a move or delete changes which card is where).
    setTimeout(() => {
      reelRef.current?.querySelector<HTMLButtonElement>(`[data-frame-card="${index}"] > button`)?.focus();
    }, 0);
  };
  const duplicateFrameAt = (index: number) => {
    if (isGuest) return;
    duplicateFrame(index);
  };
  const deleteFrameAt = (index: number) => {
    if (isGuest || useStudioStore.getState().frames.length <= 1) return;
    const before = useStudioStore.getState().frames.length;
    deleteFrame(index);
    if (useStudioStore.getState().frames.length < before) {
      studioEvents.emit('pixibun:toast', {
        message: `Frame ${index + 1} deleted.`,
        action: { label: 'Undo', onClick: () => studioEvents.emit('pixibun:undo') },
      });
    }
  };
  const moveFrameBy = (index: number, delta: number) => {
    const target = index + delta;
    if (isGuest || isPlaying || target < 0 || target >= useStudioStore.getState().frames.length) return;
    reorderFrames(index, target);
  };

  // Keys on a focused frame: arrows select, Alt+arrows move, Ctrl+D duplicates, Delete removes.
  const handleFrameKeys = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const count = frames.length;
    let handled = true;
    if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      const target = index + (e.key === 'ArrowLeft' ? -1 : 1);
      moveFrameBy(index, e.key === 'ArrowLeft' ? -1 : 1);
      if (target >= 0 && target < count) focusFrame(target);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Home' || e.key === 'End') {
      const target = e.key === 'Home' ? 0 : e.key === 'End' ? count - 1
        : Math.max(0, Math.min(count - 1, index + (e.key === 'ArrowLeft' ? -1 : 1)));
      setActiveFrame(target);
      focusFrame(target);
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
      duplicateFrameAt(index);
      focusFrame(index + 1);
    } else if ((e.key === 'Delete' || e.key === 'Backspace') && !isPlaygroundMode) {
      deleteFrameAt(index);
      focusFrame(Math.max(0, index - 1));
    } else if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) {
      const rect = e.currentTarget.getBoundingClientRect();
      setActiveFrame(index);
      setFrameMenu({ index, x: rect.left, y: rect.top });
    } else {
      handled = false;
    }
    if (handled) { e.preventDefault(); e.stopPropagation(); }
  };

  const handleMenuKeys = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
    const at = items.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      items[(at + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      e.preventDefault();
      e.stopPropagation();
      const index = frameMenu?.index;
      setFrameMenu(null);
      if (index !== undefined) focusFrame(index);
    }
  };

  useEffect(() => {
    if (!frameMenu) return;
    // The surface mounts through a portal and presence animation; focus it once it is in the page.
    const focusTimer = setTimeout(() => frameMenuRef.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus(), 0);
    const close = (event: PointerEvent) => {
      if (!frameMenuRef.current?.contains(event.target as Node)) setFrameMenu(null);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setFrameMenu(null);
    };
    const closeOnResize = () => setFrameMenu(null);
    document.addEventListener('pointerdown', close, true);
    document.addEventListener('keydown', closeOnEscape);
    window.addEventListener('resize', closeOnResize);
    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener('pointerdown', close, true);
      document.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('resize', closeOnResize);
    };
  }, [frameMenu]);

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

  usePlaybackClock(isPlaying, previewSpeedRef);

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

  const compactContent = (
    <>
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
              aria-label="Previous frame"
              title="Previous Frame (,)"
              className="w-7 h-7 flex items-center justify-center rounded-[2px] border border-[var(--desk-border)] pixel-tactile-btn text-[var(--text-body)] hover:text-[var(--accent-gold)] cursor-pointer"
            >
              <PixelIcon name="step-backward" size={10} />
            </button>

            <button
              onClick={() => setIsPlaying(!isPlaying)}
              title={`Play / Pause Animation (${playKeyLabel})`}
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
              aria-label="Next frame"
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
              toggledRef.current = true;
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
    </>
  );

  const fullContent = (
    <>
      {/* Top Controls Bar: Play, FPS, Loop Mode, Onion Skin, Frame Actions */}
      <div className="h-9 min-h-9 shrink-0 flex items-center justify-between border-b border-[var(--desk-border)] pb-1.5">
        {/* Left: Unified Playback & Timing Instrument */}
        <div className="flex items-center gap-2.5">
          {/* Playback Controls */}
          <div className="flex items-center gap-1">
            <TactileButton
              size="sm"
              variant={isPlaying ? 'primary' : 'default'}
              onClick={() => setIsPlaying(!isPlaying)}
              title={`Play / Pause Animation (${playKeyLabel})`}
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
              aria-label="Previous frame"
              title="Previous Frame (,)"
              className="w-7 h-7 flex items-center justify-center pixel-tactile-btn text-[var(--text-body)] hover:text-[var(--accent-gold)]"
            >
              <PixelIcon name="step-backward" size={11} />
            </TactileButton>

            <TactileButton
              size="icon-sm"
              variant="default"
              onClick={handleStepForward}
              aria-label="Next frame"
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
                title={`Loop mode: ${loopMode === 'ping-pong' ? 'ping-pong' : loopMode}. Click to change.`}
                aria-label={`Loop mode: ${loopMode === 'ping-pong' ? 'Ping-Pong' : loopMode === 'repeat' ? 'Repeat' : 'Once'}`}
                className="h-7 px-2 text-xs font-sans font-medium pixel-tactile-btn text-[var(--text-body)] hover:text-[var(--text-heading)] flex items-center justify-center gap-1"
              >
                <PixelIcon name={loopMode === 'ping-pong' ? 'ping-pong' : 'loop'} size={11} />
                <span className="hidden xl:inline">{loopMode === 'ping-pong' ? 'Ping-Pong' : loopMode === 'repeat' ? 'Repeat' : 'Once'}</span>
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
                    aria-label={`Preview ${previewSpeed}× speed`} aria-expanded={isPreviewMenuOpen}
                    className="h-7 min-w-[102px] flex items-center justify-between gap-2 bg-[var(--surface-0)] px-2 rounded-[2px] border border-[var(--desk-border)] text-[var(--text-heading)] hover:border-[var(--desk-border-highlight)]">
                    <span className="text-[var(--text-muted)] text-[11px]">Preview</span>{' '}
                    <span className="font-mono text-[11px]">{previewSpeed}×</span>
                    <span aria-hidden="true" className="text-[var(--text-muted)]">▾</span>
                  </button>
                  <AnimatePresence>
                    {isPreviewMenuOpen && (
                      <SpringSurface key="speeds" origin="bottom left" role="group" aria-label="Preview speeds"
                        className="pb-panel absolute bottom-full left-0 mb-1.5 z-[100] w-full min-w-[120px] !p-1.5">
                        {[0.5, 1, 2].map((speed) => (
                          <button key={speed} type="button" onClick={() => { setPreviewSpeed(speed); setIsPreviewMenuOpen(false); }}
                            aria-label={`${speed}× preview speed`} aria-pressed={previewSpeed === speed}
                            className="pb-menu-item !min-h-9 !px-2.5 font-mono tabular-nums">
                            {speed}×
                          </button>
                        ))}
                      </SpringSurface>
                    )}
                  </AnimatePresence>
                </div>

                {/* Active Frame Duration Input */}
                <div className="h-7 shrink-0 whitespace-nowrap flex items-center gap-1 bg-[var(--surface-0)] px-1.5 rounded-[2px] border border-[var(--desk-border)]">
                  <span className="text-[var(--text-muted)] font-sans text-[11px]">Frame time</span>
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
                <span id="onion-skin-notice" className="w-[140px] h-7 shrink-0 hidden xl:flex items-center text-[10px] leading-3 text-[var(--text-muted)]" aria-live="polite">
                  {onionNotice}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Right: the selected frame's actions, always in view, then layout */}
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="hidden 2xl:inline text-[11px] text-[var(--text-muted)] whitespace-nowrap mr-0.5">
            Frame <b className="font-mono text-[var(--text-heading)]">{activeFrameIndex + 1}</b>
            <span className="font-mono"> / {frames.length}</span>
            <span className="font-mono"> · {formatSeconds(totalMs)}</span>
          </span>

          <TactileButton
            size="sm"
            variant="default"
            disabled={isGuest}
            onClick={addFrame}
            title={isGuest ? guestFrameLockTitle : 'Add a blank frame at the end, with the same layers but no artwork'}
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
            <div role="group" aria-label={`Selected frame ${activeFrameIndex + 1}`} className="flex items-center gap-1">
              <TactileButton
                size="sm"
                variant="default"
                disabled={isGuest}
                onClick={() => duplicateFrameAt(activeFrameIndex)}
                aria-label="Duplicate frame"
                title={isGuest ? guestFrameLockTitle : 'Duplicate the selected frame, artwork included (Ctrl+D on a frame)'}
                className="h-7 px-2 text-xs pixel-tactile-btn text-[var(--text-body)] hover:text-[var(--text-heading)] flex items-center gap-1 font-medium"
              >
                <PixelIcon name="copy" size={12} />
                <span className="hidden 2xl:inline">Duplicate</span>
              </TactileButton>
              <TactileButton
                size="sm"
                variant="default"
                disabled={isGuest || frames.length <= 1}
                onClick={() => deleteFrameAt(activeFrameIndex)}
                aria-label="Delete frame"
                title={isGuest ? guestFrameLockTitle : frames.length <= 1 ? 'An animation keeps at least one frame' : 'Delete the selected frame (Delete on a frame). Undo brings it back.'}
                className="h-7 px-2 text-xs pixel-tactile-btn text-[var(--text-body)] hover:text-[var(--state-danger,#f08a9a)] flex items-center gap-1 font-medium"
              >
                <PixelIcon name="trash" size={12} />
                <span className="hidden 2xl:inline">Delete</span>
              </TactileButton>
              <TactileButton
                size="icon-sm"
                variant="default"
                disabled={isGuest || isPlaying || activeFrameIndex === 0}
                onClick={() => moveFrameBy(activeFrameIndex, -1)}
                aria-label="Move frame earlier"
                title="Move the selected frame one step earlier (Alt+←)"
                className="w-7 h-7 flex items-center justify-center pixel-tactile-btn text-[var(--text-body)] hover:text-[var(--accent-gold)]"
              >
                <span aria-hidden="true" className="text-[14px] leading-none">‹</span>
              </TactileButton>
              <TactileButton
                size="icon-sm"
                variant="default"
                disabled={isGuest || isPlaying || activeFrameIndex >= frames.length - 1}
                onClick={() => moveFrameBy(activeFrameIndex, 1)}
                aria-label="Move frame later"
                title="Move the selected frame one step later (Alt+→)"
                className="w-7 h-7 flex items-center justify-center pixel-tactile-btn text-[var(--text-body)] hover:text-[var(--accent-gold)]"
              >
                <span aria-hidden="true" className="text-[14px] leading-none">›</span>
              </TactileButton>
            </div>
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

        {/* Frame reel: click to select, drag to reorder, hover for quick actions, right-click for more */}
        <div ref={reelRef} role="list" aria-label="Frames" className="flex items-center gap-2 min-w-0 flex-1 overflow-x-auto py-0.5">
          {frames.map((frame, index) => {
            const isActive = index === activeFrameIndex;
            const isInsideClip = activeClip ? (index >= activeClip.startFrame && index <= activeClip.endFrame) : true;
            const isBeingDragged = draggedFrameIndex === index;
            const isDropTarget = dragOverFrameIndex === index && draggedFrameIndex !== index;

            const baseTime = Math.round(1000 / fps);
            const duration = frame.durationMs ?? baseTime;
            const showActions = !isPlaygroundMode && !isGuest && !isPlaying;

            return (
              <div
                key={frame.id}
                role="listitem"
                data-frame-card={index}
                className="group/frame relative shrink-0"
                onMouseEnter={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect();
                  setHoverPreviewAnchor({ x: rect.left + rect.width / 2, y: rect.top });
                  setHoveredFrameIndex(index);
                }}
                onMouseLeave={() => setHoveredFrameIndex((cur) => (cur === index ? null : cur))}
                onContextMenu={isPlaygroundMode ? undefined : (event) => {
                  event.preventDefault();
                  setActiveFrame(index);
                  setHoveredFrameIndex(null);
                  setFrameMenu({ index, x: event.clientX, y: event.clientY });
                }}
              >
                <button
                  type="button"
                  draggable={!isPlaying && !isGuest}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={(e) => handleDragLeave(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  onClick={() => setActiveFrame(index)}
                  onKeyDown={(e) => handleFrameKeys(e, index)}
                  aria-label={`Select frame ${index + 1}. #${index + 1} ${duration}ms. Drag to reorder.`}
                  aria-current={isActive ? 'true' : undefined}
                  aria-keyshortcuts="Delete Control+D Alt+ArrowLeft Alt+ArrowRight"
                  title={
                    isGuest
                      ? `Frame #${index + 1} (${duration}ms) - ${guestFrameLockTitle}`
                      : `Frame #${index + 1} (${duration}ms) · drag to reorder · right-click for frame actions`
                  }
                  className={`relative w-[76px] h-16 shrink-0 rounded-[2px] border-2 ${
                    isGuest ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'
                  } ${isPlaying ? 'transition-none' : 'transition-all'} flex flex-col items-center justify-between px-1.5 py-1 select-none text-left ${
                    isBeingDragged
                      ? 'opacity-30 scale-95 border-dashed border-[var(--accent-gold)] bg-[var(--surface-0)]'
                      : isDropTarget
                      ? 'border-[var(--accent-gold)] bg-[var(--surface-3)] ring-2 ring-[var(--accent-gold)] scale-105'
                      : isActive
                      ? `bg-[var(--timeline-frame-active-bg)] border-[var(--timeline-frame-active-border)] ${isPlaying ? 'shadow-none' : 'shadow-[var(--timeline-frame-active-shadow,none)]'}`
                      : isInsideClip
                      ? 'bg-[var(--desk-surface-raised)] border-[var(--desk-border)] hover:bg-[var(--timeline-frame-hover-bg)] hover:border-[var(--timeline-frame-hover-border)]'
                      : 'bg-[var(--desk-surface-raised)] border-[var(--desk-border)] opacity-50 hover:opacity-80'
                  }`}
                >
                  <div className="w-full flex justify-between items-center text-[10px] font-mono leading-none pointer-events-none">
                    <span className={isActive ? 'text-[var(--accent-gold)] font-bold' : 'text-[var(--text-heading)] font-bold'}>
                      #{index + 1}
                    </span>{' '}
                    <span className={isActive ? 'text-[var(--accent-gold)] font-medium' : 'text-[var(--text-body)] font-medium'}>
                      {duration}ms
                    </span>
                  </div>

                  {/* Frame Canvas Pixel Thumbnail */}
                  <div className="pointer-events-none">
                    <FrameThumbnail frameIndex={index} isActive={isActive} />
                  </div>
                </button>

                {/* Quick actions flank the thumbnail: always on the selected frame, on hover or focus elsewhere */}
                {showActions && (
                  <>
                    <button
                      type="button"
                      onClick={() => duplicateFrameAt(index)}
                      aria-label={`Duplicate frame ${index + 1}`}
                      title="Duplicate this frame (Ctrl+D)"
                      className={`${cardActionClass} left-1.5 ${isActive ? 'opacity-100' : ''}`}
                    >
                      <PixelIcon name="copy" size={11} />
                    </button>
                    {frames.length > 1 && (
                      <button
                        type="button"
                        onClick={() => deleteFrameAt(index)}
                        aria-label={`Delete frame ${index + 1}`}
                        title="Delete this frame (Delete). Undo brings it back."
                        className={`${cardActionClass} right-1.5 hover:!text-[var(--state-danger,#f08a9a)] hover:!border-[var(--state-danger,#f08a9a)] ${isActive ? 'opacity-100' : ''}`}
                      >
                        <PixelIcon name="trash" size={11} />
                      </button>
                    )}
                  </>
                )}

                {/* Scrubbing Enlarged Popup Preview */}
                {hoveredFrameIndex === index && hoverPreviewAnchor && !isBeingDragged && frameMenu === null && createPortal(
                  <FrameScrubPreview
                    frameIndex={index}
                    duration={duration}
                    layerCount={frame.layers.length}
                    anchor={hoverPreviewAnchor}
                  />, document.body
                )}
              </div>
            );
          })}

          {/* The reel ends in a slot for the next frame, so adding one is where the eye already is.
              It is a list item like the frames, so the Frames list holds only list items. */}
          {!isPlaygroundMode && (
            <div role="listitem" className="shrink-0">
              <button
                type="button"
                disabled={isGuest}
                onClick={addFrame}
                // The visible word leads the name, so voice control users can say what they see.
                aria-label={`${frames.length === 1 ? 'Animate' : 'New frame'}: add a blank frame at the end`}
                title={isGuest ? guestFrameLockTitle : 'Add a blank frame at the end'}
                className="w-[76px] h-16 shrink-0 rounded-[2px] border-2 border-dashed border-[var(--desk-border)] text-[var(--text-muted)] hover:text-[var(--accent-gold)] hover:border-[var(--accent-gold)] flex flex-col items-center justify-center gap-1 text-[10px] font-medium cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <PixelIcon name="plus" size={12} />
                <span>{frames.length === 1 ? 'Animate' : 'New frame'}</span>
              </button>
            </div>
          )}
        </div>
        {!isPlaygroundMode && (
          <button type="button" data-testid="manage-tags-button" onClick={() => setIsTagManagerOpen(true)}
            className="h-7 px-2 shrink-0 rounded-[2px] text-xs font-sans pixel-tactile-chip text-[var(--text-body)] hover:text-[var(--text-heading)] flex items-center gap-1"
            title="Create and manage animation clips">
            <PixelIcon name="tag" size={11} /> Clips
          </button>
        )}
      </div>

      {/* Right-click menu on a frame */}
      {portalReady && createPortal(
        <AnimatePresence>
          {frameMenu && (
            <SpringSurface
              key="frame-menu"
              ref={frameMenuRef}
              role="menu"
              aria-label={`Frame ${frameMenu.index + 1} actions`}
              origin="bottom left"
              onKeyDown={handleMenuKeys}
              className="pb-panel fixed z-[200] min-w-[208px] !p-1.5"
              style={{ left: Math.min(frameMenu.x, window.innerWidth - 220), bottom: Math.max(8, window.innerHeight - frameMenu.y + 4) }}
            >
              <div className="px-2 pt-1 pb-1.5 text-[11px] font-semibold text-[var(--text-muted)]">Frame {frameMenu.index + 1}</div>
              {([
                ['Duplicate', 'Ctrl+D', () => duplicateFrameAt(frameMenu.index), isGuest],
                ['Move earlier', 'Alt+←', () => moveFrameBy(frameMenu.index, -1), isGuest || isPlaying || frameMenu.index === 0],
                ['Move later', 'Alt+→', () => moveFrameBy(frameMenu.index, 1), isGuest || isPlaying || frameMenu.index >= frames.length - 1],
                ['Delete', 'Del', () => deleteFrameAt(frameMenu.index), isGuest || frames.length <= 1],
              ] as const).map(([label, keys, action, disabled]) => (
                <button key={label} type="button" role="menuitem" disabled={disabled}
                  onClick={() => { setFrameMenu(null); action(); }}
                  className={`pb-menu-item !min-h-9 disabled:opacity-40 disabled:cursor-not-allowed ${label === 'Delete' ? 'hover:!text-[var(--state-danger,#f08a9a)]' : ''}`}>
                  <span className="flex-1">{label}</span>
                  <kbd className="font-mono text-[10px] text-[var(--text-muted)]">{keys}</kbd>
                </button>
              ))}
            </SpringSurface>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Tag Manager Modal */}
      <AnimatePresence>{isOnionSettingsOpen && <OnionSkinSettings key="OnionSkinSettings" onClose={() => setIsOnionSettingsOpen(false)} />}</AnimatePresence>
      <TagManagerModal
        isOpen={isTagManagerOpen}
        onClose={() => setIsTagManagerOpen(false)}
      />
    </>
  );

  return (
    <footer
      ref={shellRef}
      data-testid={isCollapsed ? 'bottom-timeline-collapsed' : 'bottom-timeline'}
      data-timeline={isCollapsed ? 'compact' : 'full'}
      className={isCollapsed
        ? 'h-9 bg-[var(--desk-surface)] border-t border-[var(--desk-border)] px-3 select-none z-20 text-[var(--text-heading)] shadow-sm transition-colors duration-150 shrink-0'
        : 'h-32 bg-[var(--desk-surface)] border-t border-[var(--desk-border)] px-4 py-1.5 select-none z-20 text-[var(--text-heading)] shadow-sm transition-colors duration-150'}
    >
      <div ref={contentRef} className="h-full">
        <motion.div
          key={isCollapsed ? 'compact' : 'full'}
          initial={bloomFrom}
          animate={bloomTo}
          className={isCollapsed ? 'h-full flex items-center justify-between' : 'h-full flex flex-col justify-between'}
        >
          {isCollapsed ? compactContent : fullContent}
        </motion.div>
      </div>
    </footer>
  );
});
