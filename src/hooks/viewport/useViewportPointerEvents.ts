import React, { useRef } from 'react';
import { useStudioStore } from '@/stores/studioStore';
import { coDrawBridge } from '@/lib/sync/coDrawBridge';
import { updateCursorHUD } from '@/components/layout/CursorStatusBadge';
import { ChiselStrokeSession } from '@/lib/art/normalSculptor';
import {
  Point,
  getBresenhamLine,
  filterPixelPerfect,
  getRectanglePoints,
  getEllipsePoints,
  applySymmetry,
  getIsometric2p1Line,
  getQuadraticBezierPoints,
} from '@/lib/canvas/rasterMath';
import { shouldDitherPixel } from '@/lib/canvas/ditherMatrix';
import { performFloodFill, rgbaToHex, hexToRgba } from '@/lib/canvas/floodFill';
import { compositeFrame } from '@/lib/render/compositor';
import type { HistoryStep } from '@/types/canvas';

export interface UseViewportPointerEventsProps {
  canvasWidth: number;
  canvasHeight: number;
  panX: number;
  panY: number;
  setPan: (x: number, y: number) => void;
  isPanning: boolean;
  setIsPanning: (panning: boolean) => void;
  panStart: { x: number; y: number };
  setPanStart: (start: { x: number; y: number }) => void;
  clientToCanvasCoords: (clientX: number, clientY: number, clamped?: boolean) => Point | null;
  isDrawing: boolean;
  setIsDrawing: (drawing: boolean) => void;
  isDrawingRef: React.MutableRefObject<boolean>;
  strokeStart: Point | null;
  setStrokeStart: (pt: Point | null) => void;
  lastPoint: Point | null;
  setLastPoint: (pt: Point | null) => void;
  cursorCoordsRef: React.MutableRefObject<Point | null>;
  currentStrokeSnapshotRef: React.MutableRefObject<HistoryStep | null>;
  drawPointsOnActiveLayer: (points: Point[], color: string, isErase: boolean) => void;
  captureSnapshot: (desc: string) => void;
  commitSnapshot: () => void;
  setPrimaryColor: (color: string) => void;
  renderBrushGhost: (coords: Point | null) => void;
  renderComposite: () => void;
  getOrCreateLayerCanvas: (layerId: string) => HTMLCanvasElement;
  previewCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  floatingSelection: { canvas: HTMLCanvasElement; x: number; y: number; w: number; h: number } | null;
  setFloatingSelection: React.Dispatch<
    React.SetStateAction<{ canvas: HTMLCanvasElement; x: number; y: number; w: number; h: number } | null>
  >;
  isDraggingSelection: boolean;
  setIsDraggingSelection: (dragging: boolean) => void;
  dragOffset: { x: number; y: number };
  setDragOffset: (offset: { x: number; y: number }) => void;
  lassoPoints: Point[];
  setLassoPoints: React.Dispatch<React.SetStateAction<Point[]>>;
  selectionModifierRef: React.MutableRefObject<'replace' | 'union' | 'subtract'>;
  baseSelectionMaskRef: React.MutableRefObject<Uint8Array | null>;
  liftSelectionToFloating: () => void;
  commitFloatingSelection: () => void;
  createBoxMask: (box: { x: number; y: number; w: number; h: number }) => Uint8Array;
  mergeSelectionMask: (
    base: Uint8Array | null,
    next: Uint8Array,
    mode: 'replace' | 'union' | 'subtract'
  ) => { box: { x: number; y: number; w: number; h: number } | null; mask: Uint8Array | null };
  lockedWarningTimerRef: React.MutableRefObject<number | null>;
  setLockedWarning: (warning: boolean) => void;
}

export function useViewportPointerEvents({
  canvasWidth,
  canvasHeight,
  panX,
  panY,
  setPan,
  isPanning,
  setIsPanning,
  panStart,
  setPanStart,
  clientToCanvasCoords,
  isDrawing,
  setIsDrawing,
  isDrawingRef,
  strokeStart,
  setStrokeStart,
  lastPoint,
  setLastPoint,
  cursorCoordsRef,
  currentStrokeSnapshotRef,
  drawPointsOnActiveLayer,
  captureSnapshot,
  commitSnapshot,
  setPrimaryColor,
  renderBrushGhost,
  renderComposite,
  getOrCreateLayerCanvas,
  previewCanvasRef,
  floatingSelection,
  setFloatingSelection,
  isDraggingSelection,
  setIsDraggingSelection,
  dragOffset,
  setDragOffset,
  lassoPoints,
  setLassoPoints,
  selectionModifierRef,
  baseSelectionMaskRef,
  liftSelectionToFloating,
  commitFloatingSelection,
  createBoxMask,
  mergeSelectionMask,
  lockedWarningTimerRef,
  setLockedWarning,
}: UseViewportPointerEventsProps) {
  const tools = useStudioStore((s) => s.tools);
  const primaryColor = useStudioStore((s) => s.primaryColor);
  const secondaryColor = useStudioStore((s) => s.secondaryColor);
  const frames = useStudioStore((s) => s.frames);
  const activeFrameIndex = useStudioStore((s) => s.activeFrameIndex);
  const activeLayerId = useStudioStore((s) => s.activeLayerId);
  const bumpBufferVersion = useStudioStore((s) => s.bumpBufferVersion);
  const selection = useStudioStore((s) => s.selection);
  const selectionMask = useStudioStore((s) => s.selectionMask);
  const setSelection = useStudioStore((s) => s.setSelection);

  const chiselSessionRef = useRef<ChiselStrokeSession | null>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    // Middle Click or Alt+Click = Pan Viewport
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - panX, y: e.clientY - panY });
      return;
    }

    if (e.button !== 0) return;

    const coords = clientToCanvasCoords(e.clientX, e.clientY);
    if (!coords) return;

    // Selection Drag Handler
    if (tools.activeTool.startsWith('select-')) {
      const activeBox = floatingSelection || selection;
      if (
        activeBox &&
        coords.x >= activeBox.x &&
        coords.x < activeBox.x + activeBox.w &&
        coords.y >= activeBox.y &&
        coords.y < activeBox.y + activeBox.h
      ) {
        if (!floatingSelection) {
          liftSelectionToFloating();
        }
        setIsDraggingSelection(true);
        setDragOffset({
          x: coords.x - activeBox.x,
          y: coords.y - activeBox.y,
        });
        return;
      }
    }

    if (tools.activeTool === 'select-box') {
      if (floatingSelection) {
        commitFloatingSelection();
      }

      const mode = e.shiftKey ? 'union' : e.altKey ? 'subtract' : 'replace';
      selectionModifierRef.current = mode;
      baseSelectionMaskRef.current = selectionMask
        ? new Uint8Array(selectionMask)
        : selection
        ? createBoxMask(selection)
        : null;

      isDrawingRef.current = true;
      setIsDrawing(true);
      setStrokeStart(coords);
      setLastPoint(coords);
      if (mode === 'replace') {
        setSelection({ x: coords.x, y: coords.y, w: 1, h: 1 }, null);
      }
      return;
    }

    if (tools.activeTool === 'select-lasso') {
      if (floatingSelection) commitFloatingSelection();

      const mode = e.shiftKey ? 'union' : e.altKey ? 'subtract' : 'replace';
      selectionModifierRef.current = mode;
      baseSelectionMaskRef.current = selectionMask
        ? new Uint8Array(selectionMask)
        : selection
        ? createBoxMask(selection)
        : null;

      isDrawingRef.current = true;
      setIsDrawing(true);
      if (mode === 'replace') {
        setSelection(null, null);
      }
      setLassoPoints([coords]);
      setStrokeStart(coords);
      return;
    }

    if (tools.activeTool === 'select-wand') {
      if (floatingSelection) commitFloatingSelection();

      const mode = e.shiftKey ? 'union' : e.altKey ? 'subtract' : 'replace';
      const baseMask = selectionMask
        ? new Uint8Array(selectionMask)
        : selection
        ? createBoxMask(selection)
        : null;

      const layerCanvas = getOrCreateLayerCanvas(activeLayerId);
      const ctx = layerCanvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        const imgData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
        const data = imgData.data;
        const targetIdx = (coords.y * canvasWidth + coords.x) * 4;
        const targetR = data[targetIdx];
        const targetG = data[targetIdx + 1];
        const targetB = data[targetIdx + 2];
        const targetA = data[targetIdx + 3];

        const newSelectionMask = new Uint8Array(canvasWidth * canvasHeight);
        const visited = new Uint8Array(canvasWidth * canvasHeight);
        const queue: Point[] = [coords];
        const { bucketTolerance, bucketContiguous } = tools;

        const colorMatch = (r: number, g: number, b: number, a: number) => {
          if (bucketTolerance === 0) {
            return r === targetR && g === targetG && b === targetB && a === targetA;
          }
          const diff = Math.max(
            Math.abs(r - targetR),
            Math.abs(g - targetG),
            Math.abs(b - targetB),
            Math.abs(a - targetA)
          );
          return diff <= bucketTolerance;
        };

        if (bucketContiguous) {
          visited[coords.y * canvasWidth + coords.x] = 1;
          let head = 0;
          while (head < queue.length) {
            const { x, y } = queue[head++];
            const idx = y * canvasWidth + x;
            newSelectionMask[idx] = 1;

            const neighbors = [
              { nx: x - 1, ny: y },
              { nx: x + 1, ny: y },
              { nx: x, ny: y - 1 },
              { nx: x, ny: y + 1 },
            ];

            for (const { nx, ny } of neighbors) {
              if (nx >= 0 && nx < canvasWidth && ny >= 0 && ny < canvasHeight) {
                const nIdx = ny * canvasWidth + nx;
                if (visited[nIdx] === 0) {
                  visited[nIdx] = 1;
                  const dataIdx = nIdx * 4;
                  if (colorMatch(data[dataIdx], data[dataIdx + 1], data[dataIdx + 2], data[dataIdx + 3])) {
                    queue.push({ x: nx, y: ny });
                  }
                }
              }
            }
          }
        } else {
          for (let y = 0; y < canvasHeight; y++) {
            for (let x = 0; x < canvasWidth; x++) {
              const idx = y * canvasWidth + x;
              const dataIdx = idx * 4;
              if (colorMatch(data[dataIdx], data[dataIdx + 1], data[dataIdx + 2], data[dataIdx + 3])) {
                newSelectionMask[idx] = 1;
              }
            }
          }
        }

        const { box, mask } = mergeSelectionMask(baseMask, newSelectionMask, mode);
        setSelection(box, mask);
      }
      return;
    }

    // Color Replace Tool
    if (tools.activeTool === 'color-replace') {
      captureSnapshot('Color Replace');
      const targetCanvas = getOrCreateLayerCanvas(activeLayerId);
      const ctx = targetCanvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        const imgData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
        const data = imgData.data;
        const targetIdx = (coords.y * canvasWidth + coords.x) * 4;
        const tr = data[targetIdx];
        const tg = data[targetIdx + 1];
        const tb = data[targetIdx + 2];
        const ta = data[targetIdx + 3];

        if (ta > 30) {
          const replaceRgb = hexToRgba(primaryColor);
          for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] > 30 && data[i] === tr && data[i + 1] === tg && data[i + 2] === tb) {
              data[i] = replaceRgb.r;
              data[i + 1] = replaceRgb.g;
              data[i + 2] = replaceRgb.b;
              data[i + 3] = replaceRgb.a;
            }
          }
          ctx.putImageData(imgData, 0, 0);
          commitSnapshot();
          renderComposite();
          bumpBufferVersion();
        }
      }
      return;
    }

    // Commit floating selection before starting standard drawing tools
    if (floatingSelection) {
      commitFloatingSelection();
    }

    // Prevent drawing on locked layers
    const currentFrame = frames[activeFrameIndex];
    const currentLayer = currentFrame?.layers.find((l) => l.id === activeLayerId);
    if (currentLayer?.locked) {
      setLockedWarning(true);
      if (lockedWarningTimerRef.current !== null) {
        window.clearTimeout(lockedWarningTimerRef.current);
      }
      lockedWarningTimerRef.current = window.setTimeout(() => {
        setLockedWarning(false);
      }, 1600);
      return;
    }

    captureSnapshot(`Tool: ${tools.activeTool}`);

    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // fallback
    }

    isDrawingRef.current = true;
    setIsDrawing(true);
    setStrokeStart(coords);
    setLastPoint(coords);

    const isErase = tools.activeTool === 'eraser';
    const drawColor = e.shiftKey ? secondaryColor : primaryColor;

    switch (tools.activeTool) {
      case 'pen':
      case 'eraser': {
        drawPointsOnActiveLayer([coords], drawColor, isErase);
        break;
      }
      case 'dither': {
        if (shouldDitherPixel(coords.x, coords.y, tools.ditherMatrix, tools.ditherDensity)) {
          drawPointsOnActiveLayer([coords], drawColor, false);
        }
        break;
      }
      case 'eyedropper': {
        const comp = compositeFrame(frames, activeFrameIndex, canvasWidth, canvasHeight);
        if (comp) {
          const ctx = comp.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            const pixel = ctx.getImageData(coords.x, coords.y, 1, 1).data;
            if (pixel[3] > 0) {
              const hex = rgbaToHex(pixel[0], pixel[1], pixel[2], pixel[3]);
              setPrimaryColor(hex);
            }
          }
        }
        isDrawingRef.current = false;
        setIsDrawing(false);
        // Eyedropper never changes pixels: drop stale snapshot
        currentStrokeSnapshotRef.current = null;
        break;
      }
      case 'bucket': {
        const targetLayerId = activeLayerId || currentFrame?.layers[0]?.id;
        if (targetLayerId) {
          const layerCanvas = getOrCreateLayerCanvas(targetLayerId);
          const ctx = layerCanvas.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            performFloodFill(ctx, coords.x, coords.y, drawColor, tools.bucketContiguous);
            renderComposite();
            commitSnapshot();
            bumpBufferVersion();
          }
        }
        isDrawingRef.current = false;
        setIsDrawing(false);
        break;
      }
      case 'normal-chisel': {
        const targetLayerId = activeLayerId || currentFrame?.layers[0]?.id;
        if (targetLayerId) {
          chiselSessionRef.current = new ChiselStrokeSession(canvasWidth, canvasHeight);
          chiselSessionRef.current.stampChisel(coords.x, coords.y, {
            azimuth: tools.chiselAzimuth,
            incline: tools.chiselIncline,
            width: tools.chiselWidth,
            ridgeMode: tools.chiselRidgeMode,
            blendMode: tools.normalBlendMode,
          });
          const lCanvas = getOrCreateLayerCanvas(targetLayerId);
          const lCtx = lCanvas.getContext('2d', { willReadFrequently: true });
          if (lCtx && currentStrokeSnapshotRef.current) {
            const workingImg = new ImageData(
              new Uint8ClampedArray(currentStrokeSnapshotRef.current.imageData.data),
              canvasWidth,
              canvasHeight
            );
            chiselSessionRef.current.compositeOnto(workingImg, tools.normalBlendMode);
            lCtx.putImageData(workingImg, 0, 0);
            renderComposite();
          }
        }
        break;
      }
      case 'rivet-stamp': {
        const targetLayerId = activeLayerId || currentFrame?.layers[0]?.id;
        if (targetLayerId) {
          const session = new ChiselStrokeSession(canvasWidth, canvasHeight);
          session.stampRivet(coords.x, coords.y, {
            radius: tools.rivetRadius,
            flatten: tools.rivetFlatten,
            invert: tools.rivetInvert,
            blendMode: tools.normalBlendMode,
          });
          const lCanvas = getOrCreateLayerCanvas(targetLayerId);
          const lCtx = lCanvas.getContext('2d', { willReadFrequently: true });
          if (lCtx) {
            const imgData = lCtx.getImageData(0, 0, canvasWidth, canvasHeight);
            session.compositeOnto(imgData, tools.normalBlendMode);
            lCtx.putImageData(imgData, 0, 0);
            renderComposite();
            commitSnapshot();
            bumpBufferVersion();
          }
        }
        isDrawingRef.current = false;
        setIsDrawing(false);
        break;
      }
      default:
        break;
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isPanning) {
      setPan(e.clientX - panStart.x, e.clientY - panStart.y);
      return;
    }

    const coords = clientToCanvasCoords(e.clientX, e.clientY, isDrawing);
    if (coords) {
      cursorCoordsRef.current = coords;
      updateCursorHUD(coords);
      renderBrushGhost(coords);
      coDrawBridge.broadcastCursor(coords.x, coords.y);
    } else {
      cursorCoordsRef.current = null;
      updateCursorHUD(null);
      renderBrushGhost(null);
    }

    // Move floating selection
    if (isDraggingSelection && coords && floatingSelection) {
      const newX = coords.x - dragOffset.x;
      const newY = coords.y - dragOffset.y;
      setFloatingSelection({
        ...floatingSelection,
        x: newX,
        y: newY,
      });
      setSelection({
        x: newX,
        y: newY,
        w: floatingSelection.w,
        h: floatingSelection.h,
      });
      renderComposite();
      return;
    }

    if (!isDrawing || !coords) return;

    // Marquee Box Sizing
    if (tools.activeTool === 'select-box' && strokeStart) {
      const minX = Math.min(strokeStart.x, coords.x);
      const minY = Math.min(strokeStart.y, coords.y);
      const width = Math.abs(coords.x - strokeStart.x) + 1;
      const height = Math.abs(coords.y - strokeStart.y) + 1;
      if (selectionModifierRef.current === 'replace') {
        setSelection({ x: minX, y: minY, w: width, h: height }, null);
      } else {
        const previewCanvas = previewCanvasRef.current;
        if (previewCanvas) {
          const pCtx = previewCanvas.getContext('2d');
          if (pCtx) {
            pCtx.clearRect(0, 0, canvasWidth, canvasHeight);
            pCtx.imageSmoothingEnabled = false;
            pCtx.strokeStyle =
              selectionModifierRef.current === 'union'
                ? 'rgba(128, 255, 128, 0.85)'
                : 'rgba(255, 128, 128, 0.85)';
            pCtx.lineWidth = 1;
            pCtx.strokeRect(minX, minY, width, height);
          }
        }
      }
      return;
    }

    // Lasso Selecting
    if (tools.activeTool === 'select-lasso') {
      setLassoPoints((prev) => {
        const next = [...prev, coords];
        const previewCanvas = previewCanvasRef.current;
        if (previewCanvas && next.length > 0) {
          const pCtx = previewCanvas.getContext('2d');
          if (pCtx) {
            pCtx.clearRect(0, 0, canvasWidth, canvasHeight);
            pCtx.imageSmoothingEnabled = false;
            pCtx.strokeStyle = 'rgba(199, 146, 223, 0.85)';
            pCtx.lineWidth = 1;
            pCtx.beginPath();
            pCtx.moveTo(next[0].x, next[0].y);
            for (let i = 1; i < next.length; i++) {
              pCtx.lineTo(next[i].x, next[i].y);
            }
            pCtx.stroke();
          }
        }
        return next;
      });
      return;
    }

    const isErase = tools.activeTool === 'eraser';
    const drawColor = e.shiftKey ? secondaryColor : primaryColor;

    if (tools.activeTool === 'pen' || tools.activeTool === 'eraser') {
      if (lastPoint) {
        const linePoints = getBresenhamLine(lastPoint.x, lastPoint.y, coords.x, coords.y);
        const pointsToDraw = tools.pixelPerfect ? filterPixelPerfect(linePoints) : linePoints;
        drawPointsOnActiveLayer(pointsToDraw, drawColor, isErase);
      }
      setLastPoint(coords);
    } else if (tools.activeTool === 'dither') {
      if (shouldDitherPixel(coords.x, coords.y, tools.ditherMatrix, tools.ditherDensity)) {
        drawPointsOnActiveLayer([coords], drawColor, false);
      }
      setLastPoint(coords);
    } else if (tools.activeTool === 'normal-chisel') {
      if (lastPoint && chiselSessionRef.current) {
        const dx = coords.x - lastPoint.x;
        const dy = coords.y - lastPoint.y;
        const linePoints = getBresenhamLine(lastPoint.x, lastPoint.y, coords.x, coords.y);
        for (const pt of linePoints) {
          chiselSessionRef.current.stampChisel(
            pt.x,
            pt.y,
            {
              azimuth: tools.chiselAzimuth,
              incline: tools.chiselIncline,
              width: tools.chiselWidth,
              ridgeMode: tools.chiselRidgeMode,
              blendMode: tools.normalBlendMode,
            },
            { dx, dy }
          );
        }
        const currentFrame = frames[activeFrameIndex];
        const targetLayerId = activeLayerId || currentFrame?.layers[0]?.id;
        if (targetLayerId && currentStrokeSnapshotRef.current) {
          const lCanvas = getOrCreateLayerCanvas(targetLayerId);
          const lCtx = lCanvas.getContext('2d', { willReadFrequently: true });
          if (lCtx) {
            const workingImg = new ImageData(
              new Uint8ClampedArray(currentStrokeSnapshotRef.current.imageData.data),
              canvasWidth,
              canvasHeight
            );
            chiselSessionRef.current.compositeOnto(workingImg, tools.normalBlendMode);
            lCtx.putImageData(workingImg, 0, 0);
            renderComposite();
          }
        }
      }
      setLastPoint(coords);
    } else if (
      (tools.activeTool === 'line' ||
        tools.activeTool === 'curve' ||
        tools.activeTool === 'isometric-line' ||
        tools.activeTool === 'rectangle' ||
        tools.activeTool === 'ellipse') &&
      strokeStart
    ) {
      const previewCanvas = previewCanvasRef.current;
      if (previewCanvas) {
        const pCtx = previewCanvas.getContext('2d');
        if (pCtx) {
          pCtx.clearRect(0, 0, canvasWidth, canvasHeight);
          pCtx.imageSmoothingEnabled = false;

          let previewPoints: Point[] = [];
          if (tools.activeTool === 'line') {
            previewPoints = getBresenhamLine(strokeStart.x, strokeStart.y, coords.x, coords.y);
          } else if (tools.activeTool === 'isometric-line') {
            previewPoints = getIsometric2p1Line(strokeStart.x, strokeStart.y, coords.x, coords.y);
          } else if (tools.activeTool === 'curve') {
            const controlPoint: Point = {
              x: Math.round(
                (strokeStart.x + coords.x) / 2 +
                  (coords.y - strokeStart.y) * tools.curveTightness
              ),
              y: Math.round(
                (strokeStart.y + coords.y) / 2 -
                  (coords.x - strokeStart.x) * tools.curveTightness
              ),
            };
            previewPoints = getQuadraticBezierPoints(strokeStart, controlPoint, coords);
          } else if (tools.activeTool === 'rectangle') {
            previewPoints = getRectanglePoints(
              strokeStart.x,
              strokeStart.y,
              coords.x,
              coords.y,
              tools.shapeFilled
            );
          } else if (tools.activeTool === 'ellipse') {
            previewPoints = getEllipsePoints(
              strokeStart.x,
              strokeStart.y,
              coords.x,
              coords.y,
              tools.shapeFilled
            );
          }

          if (
            tools.symmetryHorizontal ||
            tools.symmetryVertical ||
            (tools.symmetryGroup && tools.symmetryGroup !== 'none')
          ) {
            previewPoints = applySymmetry(
              previewPoints,
              canvasWidth,
              canvasHeight,
              tools.symmetryHorizontal,
              tools.symmetryVertical,
              tools.symmetryGroup
            );
          }

          pCtx.fillStyle = drawColor;
          const offset = Math.floor(tools.brushSize / 2);
          previewPoints.forEach((p) => {
            pCtx.fillRect(p.x - offset, p.y - offset, tools.brushSize, tools.brushSize);
          });
        }
      }
    }
  };

  const handlePointerUp = (e?: React.PointerEvent) => {
    if (e) {
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // fallback
      }
    }

    if (isPanning) {
      setIsPanning(false);
    }

    if (isDraggingSelection) {
      setIsDraggingSelection(false);
      return;
    }

    if (isDrawing) {
      isDrawingRef.current = false;
      setIsDrawing(false);

      let endCoords = cursorCoordsRef.current;
      if (e) {
        const upCoords = clientToCanvasCoords(e.clientX, e.clientY, true);
        if (upCoords) endCoords = upCoords;
      }
      if (!endCoords && strokeStart) endCoords = strokeStart;

      if (
        (tools.activeTool === 'line' ||
          tools.activeTool === 'curve' ||
          tools.activeTool === 'isometric-line' ||
          tools.activeTool === 'rectangle' ||
          tools.activeTool === 'ellipse') &&
        strokeStart &&
        endCoords
      ) {
        let shapePoints: Point[] = [];
        if (tools.activeTool === 'line') {
          shapePoints = getBresenhamLine(strokeStart.x, strokeStart.y, endCoords.x, endCoords.y);
        } else if (tools.activeTool === 'isometric-line') {
          shapePoints = getIsometric2p1Line(strokeStart.x, strokeStart.y, endCoords.x, endCoords.y);
        } else if (tools.activeTool === 'curve') {
          const controlPoint: Point = {
            x: Math.round(
              (strokeStart.x + endCoords.x) / 2 +
                (endCoords.y - strokeStart.y) * tools.curveTightness
            ),
            y: Math.round(
              (strokeStart.y + endCoords.y) / 2 -
                (endCoords.x - strokeStart.x) * tools.curveTightness
            ),
          };
          shapePoints = getQuadraticBezierPoints(strokeStart, controlPoint, endCoords);
        } else if (tools.activeTool === 'rectangle') {
          shapePoints = getRectanglePoints(
            strokeStart.x,
            strokeStart.y,
            endCoords.x,
            endCoords.y,
            tools.shapeFilled
          );
        } else if (tools.activeTool === 'ellipse') {
          shapePoints = getEllipsePoints(
            strokeStart.x,
            strokeStart.y,
            endCoords.x,
            endCoords.y,
            tools.shapeFilled
          );
        }

        const drawColor = e?.shiftKey ? secondaryColor : primaryColor;
        drawPointsOnActiveLayer(shapePoints, drawColor, false);
      }

      if (tools.activeTool === 'select-box' && strokeStart && endCoords) {
        const bx = Math.min(strokeStart.x, endCoords.x);
        const by = Math.min(strokeStart.y, endCoords.y);
        const bw = Math.abs(endCoords.x - strokeStart.x) + 1;
        const bh = Math.abs(endCoords.y - strokeStart.y) + 1;
        const boxMask = createBoxMask({ x: bx, y: by, w: bw, h: bh });
        const { box, mask } = mergeSelectionMask(
          baseSelectionMaskRef.current,
          boxMask,
          selectionModifierRef.current
        );
        setSelection(box, mask);
        baseSelectionMaskRef.current = null;
        selectionModifierRef.current = 'replace';
      }

      if (tools.activeTool === 'select-lasso') {
        if (lassoPoints.length > 2) {
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = canvasWidth;
          tempCanvas.height = canvasHeight;
          const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
          if (tempCtx) {
            tempCtx.fillStyle = 'black';
            tempCtx.beginPath();
            tempCtx.moveTo(lassoPoints[0].x, lassoPoints[0].y);
            for (let i = 1; i < lassoPoints.length; i++) {
              tempCtx.lineTo(lassoPoints[i].x, lassoPoints[i].y);
            }
            tempCtx.closePath();
            tempCtx.fill();

            const imgData = tempCtx.getImageData(0, 0, canvasWidth, canvasHeight);
            const data = imgData.data;
            const newSelectionMask = new Uint8Array(canvasWidth * canvasHeight);

            for (let y = 0; y < canvasHeight; y++) {
              for (let x = 0; x < canvasWidth; x++) {
                const idx = y * canvasWidth + x;
                const alpha = data[idx * 4 + 3];
                if (alpha > 0) {
                  newSelectionMask[idx] = 1;
                }
              }
            }

            const { box, mask } = mergeSelectionMask(
              baseSelectionMaskRef.current,
              newSelectionMask,
              selectionModifierRef.current
            );
            setSelection(box, mask);
            baseSelectionMaskRef.current = null;
            selectionModifierRef.current = 'replace';
          }
        }
        setLassoPoints([]);
      }

      const previewCanvas = previewCanvasRef.current;
      if (previewCanvas) {
        const pCtx = previewCanvas.getContext('2d');
        pCtx?.clearRect(0, 0, canvasWidth, canvasHeight);
      }

      if (
        tools.activeTool !== 'select-box' &&
        tools.activeTool !== 'select-lasso' &&
        tools.activeTool !== 'select-wand'
      ) {
        commitSnapshot();
        bumpBufferVersion();
      }
    }

    const previewCanvas = previewCanvasRef.current;
    if (previewCanvas) {
      const pCtx = previewCanvas.getContext('2d');
      pCtx?.clearRect(0, 0, canvasWidth, canvasHeight);
    }

    setStrokeStart(null);
    setLastPoint(null);
    chiselSessionRef.current = null;
  };

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
}
