'use client';

import React from 'react';
import { useStudioStore } from '@/stores/studioStore';
import { Point } from '@/lib/canvas/rasterMath';

interface SelectionHandlerProps {
  canvasWidth: number;
  canvasHeight: number;
  floatingSelection: { canvas: HTMLCanvasElement; x: number; y: number; w: number; h: number } | null;
  setFloatingSelection: React.Dispatch<React.SetStateAction<{ canvas: HTMLCanvasElement; x: number; y: number; w: number; h: number } | null>>;
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
  isDrawingRef: React.MutableRefObject<boolean>;
  setIsDrawing: (drawing: boolean) => void;
  strokeStart: Point | null;
  setStrokeStart: (pt: Point | null) => void;
  lastPoint: Point | null;
  setLastPoint: (pt: Point | null) => void;
  getOrCreateLayerCanvas: (layerId: string) => HTMLCanvasElement;
  previewCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  renderComposite: () => void;
}

export function useSelectionPointerHandler({
  canvasWidth,
  canvasHeight,
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
  isDrawingRef,
  setIsDrawing,
  strokeStart,
  setStrokeStart,
  lastPoint: _lastPoint,
  setLastPoint,
  getOrCreateLayerCanvas,
  previewCanvasRef,
  renderComposite,
}: SelectionHandlerProps) {
  const tools = useStudioStore((s) => s.tools);
  const selection = useStudioStore((s) => s.selection);
  const selectionMask = useStudioStore((s) => s.selectionMask);
  const setSelection = useStudioStore((s) => s.setSelection);
  const activeLayerId = useStudioStore((s) => s.activeLayerId);

  const onPointerDown = (e: React.PointerEvent, coords: Point): boolean => {
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
        return true; // handled
      }
    }

    if (tools.activeTool === 'select-box') {
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
      setStrokeStart(coords);
      setLastPoint(coords);
      if (mode === 'replace') {
        setSelection({ x: coords.x, y: coords.y, w: 1, h: 1 }, null);
      }
      return true;
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
      return true;
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
      return true;
    }

    return false;
  };

  const onPointerMove = (e: React.PointerEvent, coords: Point): boolean => {
    if (isDraggingSelection && floatingSelection) {
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
      return true;
    }

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
      return true;
    }

    if (tools.activeTool === 'select-lasso' && isDrawingRef.current && strokeStart) {
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
      return true;
    }

    return false;
  };

  const onPointerUp = (e: React.PointerEvent | undefined, endCoords: Point | null): boolean => {
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
      return true;
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
      return true;
    }
    
    if (tools.activeTool.startsWith('select-')) return true; // Just in case wand/etc so it skips snapshot commits

    return false;
  };

  return { onPointerDown, onPointerMove, onPointerUp };
}
