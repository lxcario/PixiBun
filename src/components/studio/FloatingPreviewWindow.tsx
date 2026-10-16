'use client';

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useStudioStore } from '@/stores/studioStore';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { SpringSurface } from '@/components/ui/surfaces/SpringSurface';
import { compositeFrame } from '@/lib/render/compositor';
import { useThrottledValue } from '@/hooks/useThrottledValue';
import { SNAP, spring } from '@/lib/motion/springs';
import { useReducedMotion } from '@/lib/motion/useReducedMotion';
import styles from './FloatingPreviewWindow.module.css';

type Backdrop = 'checker' | 'obsidian' | 'alabaster' | 'amber';

const BACKDROPS: { id: Backdrop; label: string }[] = [
  { id: 'checker', label: 'Transparent' },
  { id: 'obsidian', label: 'Dark' },
  { id: 'alabaster', label: 'Light' },
  { id: 'amber', label: 'Warm' },
];

/** Gap kept between the window and the edges of the canvas area. */
const EDGE = 12;
/** Within this distance of an edge, a dropped window settles against it. */
const MAGNET = 20;
const MIN_STAGE = { width: 140, height: 80 };
const MAX_STAGE = 640;

type Point = { x: number; y: number };

/**
 * Live Preview: the current frame (or the playing animation) at 1×, 2× or 4× on a chosen
 * backdrop. It lives inside the canvas area and can't be dragged or resized out of it.
 */
export const FloatingPreviewWindow = React.memo(function FloatingPreviewWindow() {
  const showFloatingPreview = useStudioStore((s) => s.showFloatingPreview);
  return (
    <AnimatePresence>
      {showFloatingPreview && <PreviewWindow key="live-preview" />}
    </AnimatePresence>
  );
});

function PreviewWindow() {
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
  const toggleFloatingPreview = useStudioStore((s) => s.toggleFloatingPreview);
  // Redraw a few times a second while painting, not on every stroke frame.
  const bufferVersion = useThrottledValue(useStudioStore((s) => s.bufferVersion), 120);
  const reduce = useReducedMotion();

  const windowRef = useRef<HTMLDivElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [stage, setStage] = useState({ width: 184, height: 124 });
  // null until measured: the window opens in the canvas area's top-right corner.
  const [position, setPosition] = useState<Point | null>(null);
  const [gesture, setGesture] = useState<'drag' | 'resize' | null>(null);
  // Read by the move handler: a fast pointer can move before React re-renders with the state.
  const gestureRef = useRef<'drag' | 'resize' | null>(null);
  const gestureStart = useRef({ pointerX: 0, pointerY: 0, x: 0, y: 0, width: 0, height: 0 });

  /** Keep the whole window inside the canvas area. */
  const clamp = useCallback((point: Point, magnet = false): Point => {
    const el = windowRef.current;
    const area = el?.offsetParent as HTMLElement | null;
    if (!el || !area) return point;
    const maxX = Math.max(EDGE, area.clientWidth - el.offsetWidth - EDGE);
    const maxY = Math.max(EDGE, area.clientHeight - el.offsetHeight - EDGE);
    let x = Math.min(maxX, Math.max(EDGE, point.x));
    let y = Math.min(maxY, Math.max(EDGE, point.y));
    if (magnet) {
      if (x - EDGE < MAGNET) x = EDGE; else if (maxX - x < MAGNET) x = maxX;
      if (y - EDGE < MAGNET) y = EDGE; else if (maxY - y < MAGNET) y = maxY;
    }
    return { x, y };
  }, []);

  useLayoutEffect(() => {
    const el = windowRef.current;
    const area = el?.offsetParent as HTMLElement | null;
    if (!el || !area) return;
    setPosition(prev => clamp(prev ?? { x: area.clientWidth - el.offsetWidth - EDGE, y: EDGE }));
    // The canvas area shrinks when panels open or the window resizes: stay inside it.
    const observer = new ResizeObserver(() => setPosition(prev => (prev ? clamp(prev) : prev)));
    observer.observe(area);
    return () => observer.disconnect();
  }, [clamp]);

  // A bigger stage or a restored window may now overhang an edge.
  useLayoutEffect(() => {
    setPosition(prev => (prev ? clamp(prev) : prev));
  }, [clamp, stage, isMinimized]);

  useEffect(() => {
    if (isMinimized) return;
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    compositeFrame(frames, activeFrameIndex, canvasWidth, canvasHeight, {}, canvas);
  }, [activeFrameIndex, bufferVersion, canvasHeight, canvasWidth, frames, isMinimized]);

  const begin = (kind: 'drag' | 'resize') => (e: React.PointerEvent<HTMLElement>) => {
    if (e.button !== 0 || !position) return;
    e.stopPropagation();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* the pointer is already gone */ }
    gestureStart.current = { pointerX: e.clientX, pointerY: e.clientY, x: position.x, y: position.y, width: stage.width, height: stage.height };
    gestureRef.current = kind;
    setGesture(kind);
  };
  const move = (e: React.PointerEvent<HTMLElement>) => {
    const gesture = gestureRef.current;
    if (!gesture) return;
    const start = gestureStart.current;
    const dx = e.clientX - start.pointerX;
    const dy = e.clientY - start.pointerY;
    if (gesture === 'drag') {
      setPosition(clamp({ x: start.x + dx, y: start.y + dy }));
    } else {
      // Never grow past the canvas area: the window's far edge stops at its margin.
      const area = windowRef.current?.offsetParent as HTMLElement | null;
      const chrome = (windowRef.current?.offsetWidth ?? 0) - stage.width;
      const chromeY = (windowRef.current?.offsetHeight ?? 0) - stage.height;
      const roomX = area ? area.clientWidth - start.x - EDGE - chrome : MAX_STAGE;
      const roomY = area ? area.clientHeight - start.y - EDGE - chromeY : MAX_STAGE;
      setStage({
        width: Math.round(Math.max(MIN_STAGE.width, Math.min(MAX_STAGE, roomX, start.width + dx))),
        height: Math.round(Math.max(MIN_STAGE.height, Math.min(MAX_STAGE, roomY, start.height + dy))),
      });
    }
  };
  const end = (e: React.PointerEvent<HTMLElement>) => {
    const gesture = gestureRef.current;
    if (!gesture) return;
    gestureRef.current = null;
    try { if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* released */ }
    if (gesture === 'drag') setPosition(prev => (prev ? clamp(prev, true) : prev));
    setGesture(null);
  };

  const fitsAt = (scale: number) => canvasWidth * scale <= stage.width && canvasHeight * scale <= stage.height;
  const displayScale = Math.min(previewScale, stage.width / canvasWidth, stage.height / canvasHeight);

  return (
    <SpringSurface
      ref={windowRef}
      role="dialog"
      aria-label="Live Preview Window"
      data-testid="floating-preview-window"
      data-gesture={gesture ?? undefined}
      origin="top right"
      onPointerDown={(event) => event.stopPropagation()}
      className={`pb-panel ${styles.window}`}
      style={{
        left: position?.x ?? 0,
        top: position?.y ?? 0,
        visibility: position ? 'visible' : 'hidden',
      }}
    >
      <div
        className={styles.header}
        onPointerDown={begin('drag')}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
      >
        <span className={styles.titleIcon} aria-hidden="true"><PixelIcon name="preview" size={12} /></span>
        <span className={styles.title}>Live Preview</span>
        <span className={styles.scaleChip} aria-hidden="true">{previewScale}x</span>
        <span className={styles.spacer} />
        <button
          type="button"
          className={styles.iconButton}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setIsMinimized(!isMinimized)}
          title={isMinimized ? 'Show the preview' : 'Fold to the title bar'}
          aria-label={isMinimized ? 'Expand Preview Window' : 'Minimize Preview Window'}
        >
          <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true" shapeRendering="crispEdges">
            {isMinimized
              ? <path fill="currentColor" d="M2 2h8v1H2zM2 9h8v1H2zM2 3h1v6H2zM9 3h1v6H9z" />
              : <path fill="currentColor" d="M2 6h8v1H2z" />}
          </svg>
        </button>
        <button
          type="button"
          className={styles.iconButton}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={toggleFloatingPreview}
          title="Close (View ▸ Live Preview brings it back)"
          aria-label="Close Preview Window"
        >
          <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true" shapeRendering="crispEdges">
            <path fill="currentColor" d="M2 2h2v1H2zM3 3h2v1H3zM4 4h1v1H4zM8 2h2v1H8zM7 3h2v1H7zM7 4h1v1H7zM5 5h2v2H5zM4 7h1v1H4zM3 8h2v1H3zM2 9h2v1H2zM7 7h1v1H7zM7 8h2v1H7zM8 9h2v1H8z" />
          </svg>
        </button>
      </div>

      <AnimatePresence initial={false}>
        {!isMinimized && (
          <motion.div
            key="body"
            className={styles.body}
            initial={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, height: 'auto', transition: { height: spring(SNAP), opacity: { duration: 0.16 } } }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0, transition: { duration: 0.14 } }}
          >
            <div className={styles.stageWrap}>
              <div className={styles.stage} data-backdrop={previewBackdrop} style={{ width: stage.width, height: stage.height }}>
                <canvas
                  ref={previewCanvasRef}
                  width={canvasWidth}
                  height={canvasHeight}
                  style={{ width: canvasWidth * displayScale, height: canvasHeight * displayScale }}
                  className="pixelated pointer-events-none"
                />
              </div>
            </div>

            <div className={styles.controls}>
              <button
                type="button"
                className={styles.play}
                data-playing={isPlaying || undefined}
                onClick={() => setIsPlaying(!isPlaying)}
                title={isPlaying ? 'Pause the animation' : 'Play the animation'}
                aria-label={isPlaying ? 'Pause Animation' : 'Play Animation'}
              >
                <PixelIcon name={isPlaying ? 'pause' : 'play'} size={11} />
              </button>
              <span className={styles.readout} title={`Frame ${activeFrameIndex + 1} of ${frames.length} at ${fps} frames per second`}>
                <b>{activeFrameIndex + 1}</b>/{frames.length}
                <span className={styles.fps}>{fps} fps</span>
              </span>

              <div className={`pb-segment ${styles.segment}`} role="radiogroup" aria-label="Preview zoom">
                {([1, 2, 4] as const).map((scale) => (
                  <button
                    key={scale}
                    type="button"
                    role="radio"
                    aria-checked={previewScale === scale}
                    aria-label={`${scale}x`}
                    title={fitsAt(scale) ? `Show at ${scale}× size` : `${scale}×: larger than the window, shown fitted. Drag the corner to enlarge.`}
                    onClick={() => setPreviewScale(scale)}
                    className={`pb-segment-option ${styles.segmentOption}`}
                  >
                    {previewScale === scale && (
                      <motion.span layoutId="live-preview-scale" className="pb-segment-thumb" transition={reduce ? { duration: 0 } : spring(SNAP)} />
                    )}
                    {scale}x
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.backdrops} role="radiogroup" aria-label="Preview backdrop">
              <span className={styles.backdropLabel}>Backdrop</span>
              {BACKDROPS.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={previewBackdrop === id}
                  aria-label={`Backdrop: ${id}`}
                  title={label}
                  onClick={() => setPreviewBackdrop(id)}
                  className={styles.backdrop}
                  data-backdrop={id}
                />
              ))}
            </div>

            <div
              className={styles.grip}
              onPointerDown={begin('resize')}
              onPointerMove={move}
              onPointerUp={end}
              onPointerCancel={end}
              title="Drag to resize Live Preview window"
            >
              <svg viewBox="0 0 8 8" width="8" height="8" aria-hidden="true" shapeRendering="crispEdges">
                <path fill="currentColor" d="M6 0h2v2H6zM3 3h2v2H3zM6 3h2v2H6zM0 6h2v2H0zM3 6h2v2H3zM6 6h2v2H6z" />
              </svg>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </SpringSurface>
  );
}
