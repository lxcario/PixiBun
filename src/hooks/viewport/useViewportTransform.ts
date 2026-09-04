import { useState, useCallback, RefObject } from 'react';
import { Point } from '@/lib/canvas/rasterMath';

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

  // Map browser screen coordinates to integer pixel coordinates on the canvas
  const clientToCanvasCoords = useCallback(
    (clientX: number, clientY: number, clamp: boolean = false): Point | null => {
      const canvas = mainCanvasRef.current;
      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;

      let x = Math.floor((clientX - rect.left) / (rect.width / canvasWidth));
      let y = Math.floor((clientY - rect.top) / (rect.height / canvasHeight));

      if (clamp) {
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
    (e: React.WheelEvent) => {
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
      const zoomDelta = e.deltaY < 0 ? 1.25 : 0.8;
      const newZoom = Math.max(100, Math.min(6400, Math.round(zoom * zoomDelta)));
      if (newZoom === zoom) return;

      // Instant cursor-anchored zooming (1:1 deterministic, zero animation lag)
      const container = containerRef.current;
      if (container) {
        const rect = container.getBoundingClientRect();
        // Cursor position relative to canvas center on screen
        const cursorOffsetX = e.clientX - (rect.left + rect.width / 2) - panX;
        const cursorOffsetY = e.clientY - (rect.top + rect.height / 2) - panY;

        const ratio = newZoom / zoom;
        const newPanX = Math.round(panX + cursorOffsetX * (1 - ratio));
        const newPanY = Math.round(panY + cursorOffsetY * (1 - ratio));

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

    const pad = 64;
    const availW = Math.max(100, container.clientWidth - pad);
    const availH = Math.max(100, container.clientHeight - pad);

    const scaleX = availW / canvasWidth;
    const scaleY = availH / canvasHeight;
    const bestScale = Math.min(scaleX, scaleY);

    const integerZoom = Math.max(100, Math.floor(bestScale) * 100);
    setZoom(integerZoom);
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
