import React, { useRef } from 'react';
import { useStudioStore } from '@/stores/studioStore';
import { coDrawBridge } from '@/lib/sync/coDrawBridge';
import { updateCursorHUD } from '@/components/layout/CursorStatusBadge';
import { ChiselStrokeSession } from '@/lib/art/normalSculptor';
import { Point } from '@/lib/canvas/rasterMath';
import { performFloodFill, rgbaToHex, replaceLayerColor } from '@/lib/canvas/floodFill';
import { eraseMatchingColor } from '@/lib/canvas/eraseMatchingColor';
import { touchBuffer } from '@/lib/engine/bufferRegistry';
import { pushStructuralHistoryStep } from '@/lib/engine/structuralHistory';
import { DEFAULT_HISTORY_MAX_BYTES } from '@/lib/engine/historyEngine';
import { studioEvents } from '@/lib/events/studioEvents';
import { compositeFrame } from '@/lib/render/compositor';
import type { HistoryStep } from '@/types/canvas';

import { useBrushPointerHandler } from './useBrushPointerHandler';
import { useSelectionPointerHandler } from './useSelectionPointerHandler';
import { useShapePointerHandler } from './useShapePointerHandler';
import { useChiselPointerHandler } from './useChiselPointerHandler';

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
  discardSnapshot?: () => void;
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

export function useViewportPointerEvents(props: UseViewportPointerEventsProps) {
  const tools = useStudioStore((s) => s.tools);
  const primaryColor = useStudioStore((s) => s.primaryColor);
  const frames = useStudioStore((s) => s.frames);
  const activeFrameIndex = useStudioStore((s) => s.activeFrameIndex);
  const activeLayerId = useStudioStore((s) => s.activeLayerId);
  const bumpBufferVersion = useStudioStore((s) => s.bumpBufferVersion);

  const chiselSessionRef = useRef<ChiselStrokeSession | null>(null);
  const capturedPointerRef = useRef<{ target: HTMLElement; pointerId: number } | null>(null);

  const brushHandler = useBrushPointerHandler({
    drawPointsOnActiveLayer: props.drawPointsOnActiveLayer,
    lastPoint: props.lastPoint,
    setLastPoint: props.setLastPoint,
  });

  const selectionHandler = useSelectionPointerHandler({
    canvasWidth: props.canvasWidth,
    canvasHeight: props.canvasHeight,
    floatingSelection: props.floatingSelection,
    setFloatingSelection: props.setFloatingSelection,
    isDraggingSelection: props.isDraggingSelection,
    setIsDraggingSelection: props.setIsDraggingSelection,
    dragOffset: props.dragOffset,
    setDragOffset: props.setDragOffset,
    lassoPoints: props.lassoPoints,
    setLassoPoints: props.setLassoPoints,
    selectionModifierRef: props.selectionModifierRef,
    baseSelectionMaskRef: props.baseSelectionMaskRef,
    liftSelectionToFloating: props.liftSelectionToFloating,
    commitFloatingSelection: props.commitFloatingSelection,
    createBoxMask: props.createBoxMask,
    mergeSelectionMask: props.mergeSelectionMask,
    isDrawingRef: props.isDrawingRef,
    setIsDrawing: props.setIsDrawing,
    strokeStart: props.strokeStart,
    setStrokeStart: props.setStrokeStart,
    lastPoint: props.lastPoint,
    setLastPoint: props.setLastPoint,
    getOrCreateLayerCanvas: props.getOrCreateLayerCanvas,
    previewCanvasRef: props.previewCanvasRef,
    renderComposite: props.renderComposite,
  });

  const shapeHandler = useShapePointerHandler({
    canvasWidth: props.canvasWidth,
    canvasHeight: props.canvasHeight,
    strokeStart: props.strokeStart,
    previewCanvasRef: props.previewCanvasRef,
    drawPointsOnActiveLayer: props.drawPointsOnActiveLayer,
  });

  const chiselHandler = useChiselPointerHandler({
    canvasWidth: props.canvasWidth,
    canvasHeight: props.canvasHeight,
    chiselSessionRef,
    currentStrokeSnapshotRef: props.currentStrokeSnapshotRef,
    lastPoint: props.lastPoint,
    setLastPoint: props.setLastPoint,
    getOrCreateLayerCanvas: props.getOrCreateLayerCanvas,
    renderComposite: props.renderComposite,
  });

  const handlePointerDown = (e: React.PointerEvent) => {
    // Suppress drawing tools while live photometric lighting bulb is active
    const { photometricGizmoActive } = useStudioStore.getState();
    if (photometricGizmoActive) {
      return;
    }

    // Middle Click or Alt+Click = Pan Viewport
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      props.setIsPanning(true);
      props.setPanStart({ x: e.clientX - props.panX, y: e.clientY - props.panY });
      return;
    }

    if (e.button !== 0) return;

    const coords = props.clientToCanvasCoords(e.clientX, e.clientY);
    if (!coords) return;

    if (selectionHandler.onPointerDown(e, coords)) {
      return;
    }

    const currentFrame = frames[activeFrameIndex];
    const currentLayer = currentFrame?.layers.find((l) => l.id === activeLayerId);

    // Prevent edits to locked layers for every pixel-changing tool.
    if (currentLayer?.locked && tools.activeTool !== 'eyedropper') {
      props.setLockedWarning(true);
      if (props.lockedWarningTimerRef.current !== null) {
        window.clearTimeout(props.lockedWarningTimerRef.current);
      }
      props.lockedWarningTimerRef.current = window.setTimeout(() => {
        props.setLockedWarning(false);
      }, 1600);
      return;
    }

    if (tools.activeTool === 'erase-color') {
      if (!currentLayer) return;
      if (props.floatingSelection) props.commitFloatingSelection();
      const state = useStudioStore.getState();
      const sourceCanvas = props.getOrCreateLayerCanvas(activeLayerId);
      const sourceCtx = sourceCanvas.getContext('2d', { willReadFrequently: true });
      if (!sourceCtx) return;
      const sourcePixel = sourceCtx.getImageData(coords.x, coords.y, 1, 1).data;
      if (sourcePixel[3] === 0) return;
      const sampled = [sourcePixel[0], sourcePixel[1], sourcePixel[2]] as const;
      let selectionMask = state.selectionMask;
      if (!selectionMask && state.selection) {
        selectionMask = new Uint8Array(props.canvasWidth * props.canvasHeight);
        const box = state.selection;
        for (let y = Math.max(0, box.y); y < Math.min(props.canvasHeight, box.y + box.h); y++) {
          for (let x = Math.max(0, box.x); x < Math.min(props.canvasWidth, box.x + box.w); x++) {
            selectionMask[y * props.canvasWidth + x] = 1;
          }
        }
      }
      if (selectionMask && !selectionMask[coords.y * props.canvasWidth + coords.x]) return;

      const allFrames = state.tools.eraseColorAllFrames;
      const layerIndex = currentFrame.layers.findIndex((layer) => layer.id === activeLayerId);
      const targets = allFrames
        ? state.frames
            .map((frame) => frame.layers[layerIndex] || frame.layers.find((layer) => layer.name === currentLayer.name))
            .filter((layer): layer is import('@/types/canvas').Layer => Boolean(layer && !layer.locked))
        : [currentLayer];
      if (allFrames && targets.length * props.canvasWidth * props.canvasHeight * 4 > DEFAULT_HISTORY_MAX_BYTES / 2) {
        studioEvents.emit('pixibun:toast', { type: 'error', message: 'Too many frame pixels for one undoable color erase. Use This frame.' });
        return;
      }
      const edits: Array<{ id: string; ctx: CanvasRenderingContext2D; image: ImageData }> = [];
      for (const layer of targets) {
        const ctx = props.getOrCreateLayerCanvas(layer.id).getContext('2d', { willReadFrequently: true });
        if (!ctx) continue;
        const image = ctx.getImageData(0, 0, props.canvasWidth, props.canvasHeight);
        const changed = eraseMatchingColor(image, sampled, state.tools.eraseColorTolerance, {
          contiguous: !allFrames && state.tools.eraseColorContiguous,
          family: state.tools.eraseColorFamily,
          x: coords.x,
          y: coords.y,
          mask: selectionMask,
        });
        if (changed > 0) edits.push({ id: layer.id, ctx, image });
      }
      if (edits.length === 0) return;
      if (allFrames) {
        if (!pushStructuralHistoryStep('Erase Color (All Frames)', { affectedLayerIds: edits.map((edit) => edit.id) })) return;
      } else {
        props.captureSnapshot('Erase Color');
      }
      for (const edit of edits) {
        const before = allFrames ? edit.ctx.getImageData(0, 0, props.canvasWidth, props.canvasHeight) : null;
        edit.ctx.putImageData(edit.image, 0, 0);
        touchBuffer(edit.id);
        if (before) coDrawBridge.notifyStrokeCommitted(edit.id, before);
      }
      if (allFrames) {
        const affected = new Set(edits.map((edit) => edit.id));
        useStudioStore.setState((draft) => {
          for (const frame of draft.frames) {
            for (const layer of frame.layers) {
              if (affected.has(layer.id)) layer.effect = undefined;
            }
          }
          draft.isDirty = true;
          draft.editRevision += 1;
        });
        const lockedCount = state.frames.filter((frame) => {
          const l = frame.layers[layerIndex] || frame.layers.find((layer) => layer.name === currentLayer.name);
          return l?.locked;
        }).length;
        if (lockedCount > 0) studioEvents.emit('pixibun:toast', {
          type: 'default', message: `Skipped ${lockedCount} locked frame layer${lockedCount === 1 ? '' : 's'}.`,
        });
      } else {
        props.commitSnapshot();
      }
      props.renderComposite();
      bumpBufferVersion();
      return;
    }

    // Color Replace Tool
    if (tools.activeTool === 'color-replace') {
      if (!currentLayer) return;
      if (props.floatingSelection) props.commitFloatingSelection();
      const targetCanvas = props.getOrCreateLayerCanvas(activeLayerId);
      const ctx = targetCanvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        const imgData = ctx.getImageData(0, 0, props.canvasWidth, props.canvasHeight);
        const changed = replaceLayerColor(imgData, coords.x, coords.y, primaryColor, tools.bucketTolerance);
        if (changed > 0) {
          props.captureSnapshot('Color Replace');
          ctx.putImageData(imgData, 0, 0);
          props.commitSnapshot();
          props.renderComposite();
          bumpBufferVersion();
        }
      }
      return;
    }

    // Commit floating selection before starting standard drawing tools
    if (props.floatingSelection) {
      props.commitFloatingSelection();
    }

    // Prevent drawing on locked layers
    props.captureSnapshot(`Tool: ${tools.activeTool}`);

    try {
      const el = e.currentTarget as HTMLElement;
      el.setPointerCapture(e.pointerId);
      capturedPointerRef.current = { target: el, pointerId: e.pointerId };
    } catch {
      // fallback
    }

    props.isDrawingRef.current = true;
    props.setIsDrawing(true);
    props.setStrokeStart(coords);
    props.setLastPoint(coords);

    switch (tools.activeTool) {
      case 'pen':
      case 'eraser':
      case 'dither': {
        brushHandler.onPointerDown(e, coords);
        break;
      }
      case 'line':
      case 'curve':
      case 'isometric-line':
      case 'rectangle':
      case 'ellipse': {
        shapeHandler.onPointerDown(e, coords);
        break;
      }
      case 'normal-chisel': {
        chiselHandler.onPointerDown(e, coords);
        break;
      }
      case 'eyedropper': {
        const comp = compositeFrame(frames, activeFrameIndex, props.canvasWidth, props.canvasHeight);
        if (comp) {
          const ctx = comp.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            const pixel = ctx.getImageData(coords.x, coords.y, 1, 1).data;
            if (pixel[3] > 0) {
              const hex = rgbaToHex(pixel[0], pixel[1], pixel[2], pixel[3]);
              props.setPrimaryColor(hex);
            }
          }
        }
        props.isDrawingRef.current = false;
        props.setIsDrawing(false);
        // Eyedropper never changes pixels: drop stale snapshot
        props.currentStrokeSnapshotRef.current = null;
        break;
      }
      case 'bucket': {
        const targetLayerId = activeLayerId || currentFrame?.layers[0]?.id;
        if (targetLayerId) {
          const layerCanvas = props.getOrCreateLayerCanvas(targetLayerId);
          const ctx = layerCanvas.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            const drawColor = e.shiftKey ? useStudioStore.getState().secondaryColor : primaryColor;
            performFloodFill(ctx, coords.x, coords.y, drawColor, tools.bucketContiguous, tools.fillTolerance, tools.fillEnclosedSpecks);
            props.renderComposite();
            props.commitSnapshot();
            bumpBufferVersion();
          }
        }
        props.isDrawingRef.current = false;
        props.setIsDrawing(false);
        break;
      }
      default:
        break;
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (props.isPanning) {
      props.setPan(e.clientX - props.panStart.x, e.clientY - props.panStart.y);
      return;
    }

    const coords = props.clientToCanvasCoords(e.clientX, e.clientY, props.isDrawing);
    if (coords) {
      props.cursorCoordsRef.current = coords;
      updateCursorHUD(coords);
      props.renderBrushGhost(coords);
      coDrawBridge.broadcastCursor(coords.x, coords.y);
    } else {
      props.cursorCoordsRef.current = null;
      updateCursorHUD(null);
      props.renderBrushGhost(null);
    }

    if (selectionHandler.onPointerMove(e, coords || { x: 0, y: 0 })) {
      return;
    }

    if (!props.isDrawing || !coords) return;

    if (tools.activeTool === 'pen' || tools.activeTool === 'eraser' || tools.activeTool === 'dither') {
      brushHandler.onPointerMove(e, coords);
    } else if (tools.activeTool === 'normal-chisel') {
      chiselHandler.onPointerMove(e, coords);
    } else if (
      (tools.activeTool === 'line' ||
        tools.activeTool === 'curve' ||
        tools.activeTool === 'isometric-line' ||
        tools.activeTool === 'rectangle' ||
        tools.activeTool === 'ellipse') &&
      props.strokeStart
    ) {
      shapeHandler.onPointerMove(e, coords);
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
    if (capturedPointerRef.current) {
      try {
        capturedPointerRef.current.target.releasePointerCapture(capturedPointerRef.current.pointerId);
      } catch {
        // fallback
      }
      capturedPointerRef.current = null;
    }

    if (props.isPanning) {
      props.setIsPanning(false);
    }

    if (props.isDraggingSelection) {
      props.setIsDraggingSelection(false);
      return;
    }

    const isDrawingActive = props.isDrawing || props.isDrawingRef.current;
    if (isDrawingActive) {
      props.isDrawingRef.current = false;
      props.setIsDrawing(false);

      let endCoords = props.cursorCoordsRef.current;
      if (e) {
        const upCoords = props.clientToCanvasCoords(e.clientX, e.clientY, true);
        if (upCoords) endCoords = upCoords;
      }
      if (!endCoords && props.strokeStart) endCoords = props.strokeStart;

      if (selectionHandler.onPointerUp(e, endCoords)) {
        // Selection handled its own commit
      } else {
        brushHandler.onPointerUp(e, endCoords);
        shapeHandler.onPointerUp(e, endCoords);
        chiselHandler.onPointerUp(e, endCoords);

        if (
          tools.activeTool !== 'select-box' &&
          tools.activeTool !== 'select-lasso' &&
          tools.activeTool !== 'select-wand'
        ) {
          props.commitSnapshot();
          bumpBufferVersion();
        }
      }

      const previewCanvas = props.previewCanvasRef.current;
      if (previewCanvas) {
        const pCtx = previewCanvas.getContext('2d');
        pCtx?.clearRect(0, 0, props.canvasWidth, props.canvasHeight);
      }
    }

    const previewCanvas = props.previewCanvasRef.current;
    if (previewCanvas) {
      const pCtx = previewCanvas.getContext('2d');
      pCtx?.clearRect(0, 0, props.canvasWidth, props.canvasHeight);
    }

    props.setStrokeStart(null);
    props.setLastPoint(null);
    chiselSessionRef.current = null;
  };

  const handlePointerCancel = (e?: React.PointerEvent | PointerEvent | Event) => {
    if (e && 'pointerId' in e && 'currentTarget' in e && e.currentTarget) {
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // fallback
      }
    }
    if (capturedPointerRef.current) {
      try {
        capturedPointerRef.current.target.releasePointerCapture(capturedPointerRef.current.pointerId);
      } catch {
        // fallback
      }
      capturedPointerRef.current = null;
    }

    if (props.isPanning) {
      props.setIsPanning(false);
    }

    if (props.isDraggingSelection) {
      props.setIsDraggingSelection(false);
    }

    const isDrawingActive = props.isDrawing || props.isDrawingRef.current;
    if (isDrawingActive) {
      props.isDrawingRef.current = false;
      props.setIsDrawing(false);

      const isShapeTool =
        tools.activeTool === 'line' ||
        tools.activeTool === 'curve' ||
        tools.activeTool === 'isometric-line' ||
        tools.activeTool === 'rectangle' ||
        tools.activeTool === 'ellipse';

      if (isShapeTool) {
        if (props.discardSnapshot) {
          props.discardSnapshot();
        } else {
          props.currentStrokeSnapshotRef.current = null;
        }
      } else if (
        tools.activeTool === 'select-box' ||
        tools.activeTool === 'select-lasso' ||
        tools.activeTool === 'select-wand'
      ) {
        props.setLassoPoints([]);
      } else {
        props.commitSnapshot();
        bumpBufferVersion();
      }

      const previewCanvas = props.previewCanvasRef.current;
      if (previewCanvas) {
        const pCtx = previewCanvas.getContext('2d');
        pCtx?.clearRect(0, 0, props.canvasWidth, props.canvasHeight);
      }
    }

    props.setStrokeStart(null);
    props.setLastPoint(null);
    props.cursorCoordsRef.current = null;
    updateCursorHUD(null);
    props.renderBrushGhost(null);
    chiselSessionRef.current = null;
    props.renderComposite();
  };

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
  };
}
