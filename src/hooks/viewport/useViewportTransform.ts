import { useCallback, useEffect, useLayoutEffect, useRef, RefObject } from 'react';
import { Point } from '@/lib/canvas/rasterMath';
import { useStudioStore } from '@/stores/studioStore';
import { studioEvents } from '@/lib/events/studioEvents';
import { MathInvariants } from '@/lib/safety/mathInvariants';
import { getNextZoomStep, getPrevZoomStep, calculateFitZoom, MIN_ZOOM, MAX_ZOOM } from '@/config/zoom';
import { commitLivePan, endLivePan, getLivePan, previewPan, subscribeLivePan, type PanPoint } from '@/lib/viewport/livePan';

interface UseViewportTransformProps {
  containerRef: RefObject<HTMLDivElement | null>;
  mainCanvasRef: RefObject<HTMLCanvasElement | null>;
  /** The element carrying the pan translate (#center-canvas-area). */
  stageRef?: RefObject<HTMLElement | null>;
  canvasWidth: number;
  canvasHeight: number;
  zoom: number;
  setZoom: (z: number) => void;
  panX: number;
  panY: number;
  setPan: (x: number, y: number) => void;
  setZoomAndPan?: (zoom: number, panX: number, panY: number) => void;
}

interface CanvasRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Shift and horizontal wheel pans reach the store once the wheel goes quiet. */
export const WHEEL_PAN_COMMIT_MS = 150;

export function stageTransform(pan: PanPoint): string {
  return `translate(${pan.x}px, ${pan.y}px)`;
}

export function useViewportTransform({
  containerRef,
  mainCanvasRef,
  stageRef,
  canvasWidth,
  canvasHeight,
  zoom,
  setZoom,
  panX,
  panY,
  setPan,
  setZoomAndPan,
}: UseViewportTransformProps) {
  // Touchpads and pinch gestures send many small deltas; add them up so one
  // gesture moves a step at a time instead of racing through the zoom ladder.
  const wheelZoomRef = useRef({ total: 0, at: 0 });
  // Client point minus pan when a drag pan started; null when not panning.
  const panGestureRef = useRef<Point | null>(null);
  const wheelPanTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The store pan, updated on commit before React re-renders with it.
  const storePanRef = useRef<PanPoint>({ x: panX, y: panY });
  // The pan the stage element shows right now.
  const stagePanRef = useRef<PanPoint>({ x: panX, y: panY });
  // Canvas bounds, read again after a pointer-down, resize, zoom or store pan
  // instead of on every move. A live pan shifts them in place.
  const canvasRectRef = useRef<CanvasRect | null>(null);
  const setPanRef = useRef(setPan);

  useLayoutEffect(() => {
    setPanRef.current = setPan;
    storePanRef.current = { x: panX, y: panY };
    const live = getLivePan();
    // A render during a gesture may have written the store pan back onto the stage.
    if (live && stageRef?.current) stageRef.current.style.transform = stageTransform(live);
    stagePanRef.current = live ?? storePanRef.current;
  });

  useLayoutEffect(() => {
    canvasRectRef.current = null;
  }, [zoom, canvasWidth, canvasHeight, panX, panY]);

  useEffect(() => {
    const invalidate = () => { canvasRectRef.current = null; };
    const container = containerRef.current;
    const observer = container && typeof ResizeObserver !== 'undefined' ? new ResizeObserver(invalidate) : null;
    if (container) observer?.observe(container);
    window.addEventListener('resize', invalidate);
    window.addEventListener('scroll', invalidate, true);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', invalidate);
      window.removeEventListener('scroll', invalidate, true);
    };
  }, [containerRef]);

  // Move the stage for every previewed pan, whoever drives it (this viewport or the Navigator).
  useEffect(() => subscribeLivePan((pan, settled) => {
    if (settled) storePanRef.current = settled;
    const next = pan ?? storePanRef.current;
    const prev = stagePanRef.current;
    if (prev.x === next.x && prev.y === next.y) return;
    const stage = stageRef?.current;
    if (stage) stage.style.transform = stageTransform(next);
    const rect = canvasRectRef.current;
    if (rect) canvasRectRef.current = { ...rect, left: rect.left + next.x - prev.x, top: rect.top + next.y - prev.y };
    stagePanRef.current = next;
  }), [stageRef]);

  const clearWheelPanTimer = useCallback(() => {
    if (wheelPanTimerRef.current !== null) {
      clearTimeout(wheelPanTimerRef.current);
      wheelPanTimerRef.current = null;
    }
  }, []);

  // Publish an unfinished pan if the viewport goes away mid-gesture.
  useEffect(() => () => {
    clearWheelPanTimer();
    panGestureRef.current = null;
    commitLivePan(setPanRef.current);
  }, [clearWheelPanTimer]);

  /** Forgets the cached canvas bounds; the next conversion reads them again. */
  const refreshCanvasRect = useCallback(() => {
    canvasRectRef.current = null;
  }, []);

  // Convert client viewport coordinates (e.g. mouse event) directly to canvas pixel space
  const clientToCanvasCoords = useCallback(
    (clientX: number, clientY: number, clamped = false): Point | null => {
      const canvas = mainCanvasRef.current;
      if (!canvas) return null;

      let rect = canvasRectRef.current;
      if (!rect) {
        const read = canvas.getBoundingClientRect();
        rect = { left: read.left, top: read.top, width: read.width, height: read.height };
        // A canvas without layout yet has no size; read it again next time.
        if (rect.width > 0 && rect.height > 0) canvasRectRef.current = rect;
      }
      const scaleX = canvasWidth / rect.width;
      const scaleY = canvasHeight / rect.height;

      let x = Math.floor((clientX - rect.left) * scaleX);
      let y = Math.floor((clientY - rect.top) * scaleY);

      if (clamped) {
        x = Math.max(0, Math.min(canvasWidth - 1, x));
        y = Math.max(0, Math.min(canvasHeight - 1, y));
        return { x, y };
      }

      if (x < 0 || x >= canvasWidth || y < 0 || y >= canvasHeight) {
        return null;
      }

      return { x, y };
    },
    [canvasHeight, canvasWidth, mainCanvasRef]
  );

  /** Starts a drag pan anchored at this client point. */
  const beginPan = useCallback((clientX: number, clientY: number) => {
    clearWheelPanTimer();
    const pan = getLivePan() ?? storePanRef.current;
    panGestureRef.current = { x: clientX - pan.x, y: clientY - pan.y };
  }, [clearWheelPanTimer]);

  /** Moves the stage for a drag pan; false when no drag pan is in progress. */
  const movePan = useCallback((clientX: number, clientY: number): boolean => {
    const start = panGestureRef.current;
    if (!start) return false;
    previewPan(clientX - start.x, clientY - start.y);
    return true;
  }, []);

  /** Ends a drag pan, writing the final pan to the store once. */
  const endPan = useCallback(() => {
    if (!panGestureRef.current) return;
    panGestureRef.current = null;
    commitLivePan(setPanRef.current);
  }, []);

  const isPanning = useCallback(() => panGestureRef.current !== null, []);

  const previewWheelPan = useCallback((x: number, y: number) => {
    previewPan(x, y);
    clearWheelPanTimer();
    wheelPanTimerRef.current = setTimeout(() => {
      wheelPanTimerRef.current = null;
      if (!panGestureRef.current) commitLivePan(setPanRef.current);
    }, WHEEL_PAN_COMMIT_MS);
  }, [clearWheelPanTimer]);

  // Wheel Handler: Mouse Wheel / Ctrl+Wheel = Zoom to cursor; Shift+Wheel = Pan Horizontally
  const handleWheel = useCallback(
    (e: React.WheelEvent | WheelEvent) => {
      // Intercept wheel when photometric lighting gizmo is active and route to bulb strength
      const { photometricGizmoActive } = useStudioStore.getState();
      if (photometricGizmoActive) {
        const delta = e.deltaY < 0 ? 0.05 : -0.05;
        studioEvents.emit('pixibun:photometric-strength-delta', delta);
        return;
      }

      e.preventDefault();
      const pan = getLivePan() ?? storePanRef.current;

      if (e.shiftKey) {
        // Shift + Wheel = Pan horizontally
        previewWheelPan(pan.x - (e.deltaX || e.deltaY), pan.y);
        return;
      }

      // If purely horizontal scroll (e.g. tilt wheel), pan horizontally
      if (e.deltaY === 0 && e.deltaX !== 0) {
        previewWheelPan(pan.x - e.deltaX, pan.y);
        return;
      }

      // Mouse Wheel scrolling (and Ctrl/Cmd+Wheel) = Zoom in/out anchored to cursor
      const accumulated = accumulateWheelZoom(wheelZoomRef.current, e);
      if (accumulated === 0) return;
      const safeCurrentZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, MathInvariants.isSafeFinite(zoom) ? zoom : 100));
      const newZoom = accumulated < 0 ? getNextZoomStep(safeCurrentZoom) : getPrevZoomStep(safeCurrentZoom);
      if (newZoom === safeCurrentZoom) return;

      // Zooming re-renders the viewport anyway, so it also publishes any pan still in preview.
      clearWheelPanTimer();
      const container = containerRef.current;
      if (!container) {
        if (!panGestureRef.current) commitLivePan(setPan);
        setZoom(newZoom);
        return;
      }

      // Instant cursor-anchored zooming (1:1 deterministic, zero animation lag)
      const rect = container.getBoundingClientRect();
      const safePanX = MathInvariants.isSafeFinite(pan.x) ? pan.x : 0;
      const safePanY = MathInvariants.isSafeFinite(pan.y) ? pan.y : 0;
      // Cursor position relative to canvas center on screen
      const cursorOffsetX = e.clientX - (rect.left + rect.width / 2) - safePanX;
      const cursorOffsetY = e.clientY - (rect.top + rect.height / 2) - safePanY;

      const ratio = MathInvariants.safeDivide(newZoom, safeCurrentZoom, 1);
      const newPanX = Math.round(safePanX + cursorOffsetX * (1 - ratio));
      const newPanY = Math.round(safePanY + cursorOffsetY * (1 - ratio));

      if (setZoomAndPan) {
        setZoomAndPan(newZoom, newPanX, newPanY);
      } else {
        setPan(newPanX, newPanY);
        setZoom(newZoom);
      }
      const gesture = panGestureRef.current;
      // A drag pan in progress carries on from the zoomed pan.
      if (gesture) panGestureRef.current = { x: gesture.x + pan.x - newPanX, y: gesture.y + pan.y - newPanY };
      endLivePan({ x: newPanX, y: newPanY });
      canvasRectRef.current = null;
    },
    [clearWheelPanTimer, containerRef, previewWheelPan, setPan, setZoom, setZoomAndPan, zoom]
  );

  // Fit to Screen
  const handleFitToScreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    setZoom(calculateFitZoom(canvasWidth, canvasHeight, container.clientWidth, container.clientHeight));
    setPan(0, 0);
  }, [canvasHeight, canvasWidth, containerRef, setPan, setZoom]);

  // Reset to 100% (or default)
  const handleResetZoom = useCallback(() => {
    setZoom(1600);
    setPan(0, 0);
  }, [setPan, setZoom]);

  return {
    isPanning,
    beginPan,
    movePan,
    endPan,
    refreshCanvasRect,
    clientToCanvasCoords,
    handleWheel,
    handleFitToScreen,
    handleResetZoom,
  };
}

/** A mouse notch (about 100px) is one step; smaller deltas wait until they add up. */
const WHEEL_ZOOM_STEP_PX = 60;
const PINCH_ZOOM_STEP_PX = 18;
const WHEEL_GESTURE_GAP_MS = 220;

/**
 * Adds a wheel event to the running total and returns the total once it is
 * large enough for one zoom step (negative zooms in), else 0.
 */
export function accumulateWheelZoom(
  state: { total: number; at: number },
  e: Pick<WheelEvent, 'deltaY' | 'deltaMode' | 'ctrlKey' | 'timeStamp'>,
): number {
  const px = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaMode === 2 ? e.deltaY * 800 : e.deltaY;
  // A pause or a change of direction starts a new gesture.
  if (e.timeStamp - state.at > WHEEL_GESTURE_GAP_MS || Math.sign(px) !== Math.sign(state.total)) state.total = 0;
  state.at = e.timeStamp;
  state.total += px;
  if (Math.abs(state.total) < (e.ctrlKey ? PINCH_ZOOM_STEP_PX : WHEEL_ZOOM_STEP_PX)) return 0;
  const total = state.total;
  state.total = 0;
  return total;
}
