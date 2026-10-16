import { useState, useCallback, useRef, RefObject } from 'react';
import { Point } from '@/lib/canvas/rasterMath';
import { useStudioStore } from '@/stores/studioStore';
import { studioEvents } from '@/lib/events/studioEvents';
import { MathInvariants } from '@/lib/safety/mathInvariants';
import { getNextZoomStep, getPrevZoomStep, calculateFitZoom, MIN_ZOOM, MAX_ZOOM } from '@/config/zoom';

interface UseViewportTransformProps {
  containerRef: RefObject<HTMLDivElement | null>;
  mainCanvasRef: RefObject<HTMLCanvasElement | null>;
  canvasWidth: number;
  canvasHeight: number;
  zoom: number;
  setZoom: (z: number) => void;
  panX: number;
  panY: number;
  setPan: (x: number, y: number) => void;
  setZoomAndPan?: (zoom: number, panX: number, panY: number) => void;
}

export function useViewportTransform({
  containerRef,
  mainCanvasRef,
  canvasWidth,
  canvasHeight,
  zoom,
  setZoom,
  panX,
  panY,
  setPan,
  setZoomAndPan,
}: UseViewportTransformProps) {
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<Point>({ x: 0, y: 0 });
  // Touchpads and pinch gestures send many small deltas; add them up so one
  // gesture moves a step at a time instead of racing through the zoom ladder.
  const wheelZoomRef = useRef({ total: 0, at: 0 });

  // Convert client viewport coordinates (e.g. mouse event) directly to canvas pixel space
  const clientToCanvasCoords = useCallback(
    (clientX: number, clientY: number, clamped = false): Point | null => {
      const canvas = mainCanvasRef.current;
      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();
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

      if (e.shiftKey) {
        // Shift + Wheel = Pan horizontally
        setPan(panX - (e.deltaX || e.deltaY), panY);
        return;
      }

      // If purely horizontal scroll (e.g. tilt wheel), pan horizontally
      if (e.deltaY === 0 && e.deltaX !== 0) {
        setPan(panX - e.deltaX, panY);
        return;
      }

      // Mouse Wheel scrolling (and Ctrl/Cmd+Wheel) = Zoom in/out anchored to cursor
      const accumulated = accumulateWheelZoom(wheelZoomRef.current, e);
      if (accumulated === 0) return;
      const safeCurrentZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, MathInvariants.isSafeFinite(zoom) ? zoom : 100));
      const newZoom = accumulated < 0 ? getNextZoomStep(safeCurrentZoom) : getPrevZoomStep(safeCurrentZoom);
      if (newZoom === safeCurrentZoom) return;

      // Instant cursor-anchored zooming (1:1 deterministic, zero animation lag)
      const container = containerRef.current;
      if (container) {
        const rect = container.getBoundingClientRect();
        const safePanX = MathInvariants.isSafeFinite(panX) ? panX : 0;
        const safePanY = MathInvariants.isSafeFinite(panY) ? panY : 0;
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
      } else {
        setZoom(newZoom);
      }
    },
    [containerRef, panX, panY, setPan, setZoom, setZoomAndPan, zoom]
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
    setIsPanning,
    panStart,
    setPanStart,
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
