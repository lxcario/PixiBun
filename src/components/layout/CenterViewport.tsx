'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useStudioStore } from '@/stores/studioStore';
import { getOrCreateBuffer } from '@/lib/engine/bufferRegistry';
import type { ImportPayload } from '@/components/modals/ImportModal';
import { FloatingPreviewWindow } from '@/components/studio/FloatingPreviewWindow';
import { ViewportLensFilters } from '@/components/studio/ViewportLensFilters';
import { RadialContextMenu } from '@/components/studio/RadialContextMenu';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { useRadialContextMenu } from '@/hooks/useRadialContextMenu';
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
import {
  computeSeparableEDT,
  generateInflatedHeightmap,
  applyBilateralFilter,
  computeTangentNormalField,
  bakeNormalMapToCanvas,
} from '@/lib/ai/smartMathEngine';

import { useViewportTransform } from '@/hooks/viewport/useViewportTransform';
import { useViewportOverlays } from '@/hooks/viewport/useViewportOverlays';
import { useViewportSelection } from '@/hooks/viewport/useViewportSelection';
import { useViewportDrawing } from '@/hooks/viewport/useViewportDrawing';
import { useViewportStudioEvents } from '@/hooks/viewport/useViewportStudioEvents';
import { PixelLightBulbGizmo } from '@/components/studio/PixelLightBulbGizmo';
import { studioEvents } from '@/lib/events/studioEvents';

interface CenterViewportProps {
  onCommitHistory?: () => void;
  onOpenImport?: (payload: ImportPayload) => void;
}

export const CenterViewport: React.FC<CenterViewportProps> = ({
  onCommitHistory,
  onOpenImport,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mainCanvasRef = useRef<HTMLCanvasElement>(null);
  const stencilCanvasRef = useRef<HTMLCanvasElement>(null);
  const onionCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const gridCanvasRef = useRef<HTMLCanvasElement>(null);
  const cursorCanvasRef = useRef<HTMLCanvasElement>(null);

  // Store atomic subscriptions
  const canvasWidth = useStudioStore((s) => s.canvasWidth);
  const canvasHeight = useStudioStore((s) => s.canvasHeight);
  const zoom = useStudioStore((s) => s.zoom);
  const setZoom = useStudioStore((s) => s.setZoom);
  const panX = useStudioStore((s) => s.panX);
  const panY = useStudioStore((s) => s.panY);
  const setPan = useStudioStore((s) => s.setPan);
  const setZoomAndPan = useStudioStore((s) => s.setZoomAndPan);
  const showGrid = useStudioStore((s) => s.showGrid);
  const showIsoGuides = useStudioStore((s) => s.showIsoGuides);
  const showTilePreview = useStudioStore((s) => s.showTilePreview);
  const showNormalMapPreview = useStudioStore((s) => s.showNormalMapPreview);
  const photometricGizmoActive = useStudioStore((s) => s.photometricGizmoActive);
  const cvdLens = useStudioStore((s) => s.cvdLens);
  const squintMode = useStudioStore((s) => s.squintMode);
  const onionSkin = useStudioStore((s) => s.onionSkin);
  const isPlaying = useStudioStore((s) => s.isPlaying);
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

  const [isDragOver, setIsDragOver] = useState(false);
  const radialMenu = useRadialContextMenu();

  // Initialize or fetch the offscreen canvas for a layer
  const getOrCreateLayerCanvas = useCallback(
    (layerId: string): HTMLCanvasElement =>
      getOrCreateBuffer(layerId, canvasWidth, canvasHeight).canvas,
    [canvasWidth, canvasHeight]
  );

  // Hook 1: Viewport transform & pan/zoom
  const {
    isPanning,
    setIsPanning,
    panStart,
    setPanStart,
    clientToCanvasCoords,
    handleWheel,
    handleFitToScreen,
    handleResetZoom,
  } = useViewportTransform({
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
  });

  // Hook 2: Viewport drawing
  const {
    isDrawingRef,
    isDrawing,
    setIsDrawing,
    strokeStart,
    setStrokeStart,
    lastPoint,
    setLastPoint,
    cursorCoords,
    setCursorCoords,
    lockedWarning,
    setLockedWarning,
    lockedWarningTimerRef,
    captureSnapshot,
    commitSnapshot,
    performUndo,
    performRedo,
    drawPointsOnActiveLayer,
    setPrimaryColor,
  } = useViewportDrawing({
    canvasWidth,
    canvasHeight,
    renderComposite: () => renderComposite(),
    getOrCreateLayerCanvas,
    onCommitHistory,
  });

  // Hook 3: Viewport selection & clipboard
  const {
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
  } = useViewportSelection({
    canvasWidth,
    canvasHeight,
    activeLayerId,
    getOrCreateLayerCanvas,
    renderComposite: () => renderComposite(),
    captureSnapshot,
    commitSnapshot,
  });

  // Pure composite of all visible layers onto the main viewport canvas
  const renderComposite = useCallback(() => {
    const mainCanvas = mainCanvasRef.current;
    if (!mainCanvas) return;
    const ctx = mainCanvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.imageSmoothingEnabled = false;

    const state = useStudioStore.getState();
    const currentFrame = state.frames[state.activeFrameIndex];

    // 1. Main Active Frame Layers (Bottom-to-Top Compositing)
    if (currentFrame) {
      currentFrame.layers.slice().reverse().forEach((layer) => {
        if (!layer.visible) return;
        const lCanvas = getOrCreateLayerCanvas(layer.id);
        ctx.globalAlpha = layer.opacity;
        ctx.globalCompositeOperation = layer.blendMode;
        ctx.drawImage(lCanvas, 0, 0);
      });
    }

    // 2. Floating Selection Buffer overlay
    if (floatingSelection) {
      ctx.globalAlpha = 1.0;
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(floatingSelection.canvas, floatingSelection.x, floatingSelection.y);
    }

    // 3. Tangent-Space Normal Map Live Viewport Mode
    if (state.showNormalMapPreview) {
      const data = ctx.getImageData(0, 0, canvasWidth, canvasHeight).data;
      const isOpaque = (x: number, y: number) => {
        if (x < 0 || x >= canvasWidth || y < 0 || y >= canvasHeight) return false;
        return data[(y * canvasWidth + x) * 4 + 3] > 30;
      };
      const distanceMap = computeSeparableEDT(isOpaque, canvasWidth, canvasHeight);
      const rawHeightmap = generateInflatedHeightmap(distanceMap, canvasWidth, canvasHeight, 0.5);
      const smoothHeightmap = applyBilateralFilter(rawHeightmap, canvasWidth, canvasHeight, 1.5, 2.0);
      const normalField = computeTangentNormalField(smoothHeightmap, canvasWidth, canvasHeight, 2.0);
      const normalCanvas = bakeNormalMapToCanvas(normalField, canvasWidth, canvasHeight, isOpaque);
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      ctx.drawImage(normalCanvas, 0, 0);
    }

    ctx.globalAlpha = 1.0;
    ctx.globalCompositeOperation = 'source-over';
  }, [canvasHeight, canvasWidth, floatingSelection, getOrCreateLayerCanvas]);

  // Hook 4: Viewport overlays
  const {
    cvdFilterCss,
    mainFilterCss,
    renderOnionSkin,
    renderBrushGhost,
  } = useViewportOverlays({
    gridCanvasRef,
    onionCanvasRef,
    stencilCanvasRef,
    cursorCanvasRef,
    canvasWidth,
    canvasHeight,
    zoom,
    showGrid,
    showIsoGuides,
    symmetryHorizontal: tools.symmetryHorizontal,
    symmetryVertical: tools.symmetryVertical,
    selection,
    selectionMask,
    floatingSelection,
    cvdLens,
    squintMode,
    activeTool: tools.activeTool,
    brushSize: tools.brushSize,
  });

  // Hook 5: Studio events and AI operations
  useViewportStudioEvents({
    mainCanvasRef,
    canvasWidth,
    canvasHeight,
    activeLayerId,
    getOrCreateLayerCanvas,
    renderComposite,
    captureSnapshot,
    commitSnapshot,
    performUndo,
    performRedo,
  });

  // Live Composite & Onion Skin Rendering
  useEffect(() => {
    if (!isDrawingRef.current) {
      renderComposite();
    }
    renderOnionSkin();
  }, [
    renderComposite,
    renderOnionSkin,
    frames,
    activeFrameIndex,
    activeLayerId,
    showNormalMapPreview,
    onionSkin,
    isPlaying,
    isDrawingRef,
  ]);

  // Pointer Event Handlers
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
      setCursorCoords(coords);
      renderBrushGhost(coords);
    } else {
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

      let endCoords = cursorCoords;
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
  };

  // Drag and drop imports
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const filename = file.name;

      if (filename.endsWith('.pixibun') || filename.endsWith('.json')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const projectJson = JSON.parse(event.target?.result as string);
            onOpenImport?.({
              type: 'project',
              filename,
              projectJson,
            });
          } catch (err) {
            console.error('Failed to parse project file:', err);
          }
        };
        reader.readAsText(file);
      } else if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const dataUrl = event.target?.result as string;
          const img = new Image();
          img.onload = () => {
            onOpenImport?.({
              type: 'image',
              filename,
              dataUrl,
              imgWidth: img.width,
              imgHeight: img.height,
            });
          };
          img.src = dataUrl;
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const stageWidth = (canvasWidth * zoom) / 100;
  const stageHeight = (canvasHeight * zoom) / 100;

  return (
    <main
      ref={containerRef}
      id="main-content"
      tabIndex={-1}
      aria-label="Pixel art canvas workspace"
      className="relative flex-1 h-full w-full overflow-hidden bg-dot-grid flex items-center justify-center select-none outline-none"
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onContextMenu={radialMenu.handleContextMenu}
    >
      {/* SVG Filters for CVD Colorblindness Simulation */}
      <ViewportLensFilters />

      {/* Floating Preview Window (Picture-in-Picture) */}
      <FloatingPreviewWindow />

      {/* Interactive Radial Context Menu */}
      <RadialContextMenu
        isOpen={radialMenu.isOpen}
        position={radialMenu.position}
        onClose={radialMenu.closeMenu}
      />

      {/* Locked Layer Warning Toast */}
      {lockedWarning && (
        <div
          role="status"
          aria-live="polite"
          className="absolute top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-3 py-1.5 bg-[#3A2E4C] text-[#DDDFDF] text-xs font-mono rounded border border-[#C792DF]/40 shadow-pixel-glow pointer-events-none animate-fade-in"
        >
          <PixelIcon name="lock" size={14} className="text-[#DCABDF]" />
          <span>Active layer is locked! Unlock it in the inspector to paint.</span>
        </div>
      )}

      {/* Centered Canvas Container Area */}
      <div
        id="center-canvas-area"
        data-tutorial="canvas"
        role="application"
        tabIndex={0}
        aria-label="Pixel art drawing canvas. Use mouse or stylus to paint, arrow keys to pan viewport or nudge selection, and Alt+drag to pan."
        className="relative shrink-0 border-2 border-[#3a2e4c] shadow-[0_20px_50px_rgba(10,6,18,0.85),0_0_0_1px_rgba(240,190,124,0.2)] focus:outline-none focus:ring-2 focus:ring-[#f0be7c]"
        style={{
          width: `${stageWidth}px`,
          height: `${stageHeight}px`,
          minWidth: `${stageWidth}px`,
          minHeight: `${stageHeight}px`,
          flexShrink: 0,
          transform: `translate(${panX}px, ${panY}px)`,
          transition: 'none',
        }}
      >
        {/* 3x3 Seamless Tile Matrix Preview Surroundings */}
        {showTilePreview && (
          <div className="absolute inset-0 pointer-events-none z-0 opacity-60">
            {[-1, 0, 1].map((ox) =>
              [-1, 0, 1].map((oy) => {
                if (ox === 0 && oy === 0) return null;
                return (
                  <div
                    key={`tile-${ox}-${oy}`}
                    className="absolute border border-dashed border-[#f0be7c]/40 overflow-hidden"
                    style={{
                      left: `${ox * stageWidth}px`,
                      top: `${oy * stageHeight}px`,
                      width: `${stageWidth}px`,
                      height: `${stageHeight}px`,
                    }}
                  >
                    <canvas
                      ref={(el) => {
                        if (el && mainCanvasRef.current) {
                          const ctx = el.getContext('2d');
                          if (ctx) {
                            el.width = canvasWidth;
                            el.height = canvasHeight;
                            ctx.imageSmoothingEnabled = false;
                            ctx.clearRect(0, 0, canvasWidth, canvasHeight);
                            ctx.drawImage(mainCanvasRef.current, 0, 0);
                          }
                        }
                      }}
                      className="w-full h-full pixelated"
                    />
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Layer 0: Clean Solid Canvas Background (Original Studio Ivory/White) */}
        <div
          data-testid="canvas-solid-underlay"
          className="absolute inset-0 bg-[#ffffff] pointer-events-none"
          style={{ filter: cvdFilterCss }}
          aria-hidden="true"
        />

        {/* Layer 1: Onion Skin Ghost Canvases */}
        <canvas
          ref={onionCanvasRef}
          data-testid="onion-skin-canvas"
          width={canvasWidth}
          height={canvasHeight}
          className="absolute inset-0 w-full h-full pointer-events-none pixelated"
          style={{ filter: cvdFilterCss, imageRendering: 'pixelated' }}
        />

        {/* Layer 2: Onboarding Playground Tracing Stencil */}
        <canvas
          ref={stencilCanvasRef}
          width={canvasWidth}
          height={canvasHeight}
          className="absolute inset-0 w-full h-full pointer-events-none pixelated"
          style={{ filter: cvdFilterCss, imageRendering: 'pixelated' }}
        />

        {/* Layer 3: Main Composite Raster Canvas */}
        <canvas
          ref={mainCanvasRef}
          data-testid="main-composite-canvas"
          width={canvasWidth}
          height={canvasHeight}
          className="absolute inset-0 w-full h-full pixelated shadow-pixel-frame border border-[#3A2E4C]/20 cursor-crosshair"
          style={{ filter: mainFilterCss, imageRendering: 'pixelated' }}
        />

        {/* Layer 4: Interactive Stroke & Shape Live Preview Canvas */}
        <canvas
          ref={previewCanvasRef}
          width={canvasWidth}
          height={canvasHeight}
          className="absolute inset-0 w-full h-full pointer-events-none pixelated"
          style={{ filter: cvdFilterCss, imageRendering: 'pixelated' }}
        />

        {/* Layer 5: Grid & Marching Ants Selection Overlay */}
        <canvas
          ref={gridCanvasRef}
          width={stageWidth}
          height={stageHeight}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />

        {/* Layer 6: Brush Ghost Bounding Cursor */}
        <canvas
          ref={cursorCanvasRef}
          width={stageWidth}
          height={stageHeight}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />

        {/* Layer 7: Interactive On-Canvas Pixel Light Bulb Gizmo */}
        {photometricGizmoActive && (
          <PixelLightBulbGizmo
            canvasWidth={canvasWidth}
            canvasHeight={canvasHeight}
            zoom={zoom}
            mainCanvasRef={mainCanvasRef}
            onCommit={() => studioEvents.emit('pixibun:photometric-gizmo-commit')}
            onCancel={() => studioEvents.emit('pixibun:photometric-gizmo-cancel')}
            onLightChange={(azimuth, elevation, cx, cy) => {
              studioEvents.emit('pixibun:photometric-lighting-live', {
                lightAzimuth: azimuth,
                lightElevation: elevation,
                lightCenterX: cx,
                lightCenterY: cy,
              });
            }}
          />
        )}

        {/* Drag Over Overlay */}
        {isDragOver && (
          <div className="absolute inset-0 border-4 border-dashed border-[#DCABDF] bg-[#C792DF]/20 flex items-center justify-center pointer-events-none z-30">
            <span className="text-[#3A2E4C] font-mono text-sm font-bold bg-[#DDDFDF] px-3 py-1.5 rounded shadow">
              Drop file to import
            </span>
          </div>
        )}
      </div>

      {/* Viewport Floating HUD Controls */}
      <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2 bg-[#DDDFDF]/90 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-[#C792DF]/40 shadow-sm font-mono text-xs text-[#3A2E4C]">
        <button
          type="button"
          onClick={() => setZoom(Math.max(100, zoom - 200))}
          className="hover:text-[#A86EC6] font-bold px-1 active:scale-95"
          title="Zoom Out (Ctrl+-)"
          aria-label="Zoom out"
        >
          -
        </button>
        <span className="w-12 text-center select-none font-semibold">{zoom}%</span>
        <button
          type="button"
          onClick={() => setZoom(Math.min(6400, zoom + 200))}
          className="hover:text-[#A86EC6] font-bold px-1 active:scale-95"
          title="Zoom In (Ctrl++)"
          aria-label="Zoom in"
        >
          +
        </button>
        <span className="w-px h-3 bg-[#C792DF]/40 mx-1" />
        <button
          type="button"
          onClick={handleFitToScreen}
          className="hover:text-[#A86EC6] active:scale-95 px-1 font-semibold"
          title="Fit to Screen (Ctrl+0)"
          aria-label="Fit to screen"
        >
          Fit
        </button>
        <button
          type="button"
          onClick={handleResetZoom}
          className="hover:text-[#A86EC6] active:scale-95 px-1 font-semibold"
          title="Reset to 16x"
          aria-label="Reset zoom"
        >
          16x
        </button>
        <span className="w-px h-3 bg-[#C792DF]/40 mx-1" />
        <span className="text-[#6A5880]">
          {canvasWidth}×{canvasHeight}
        </span>
      </div>

      {/* Coordinate & Tool Status Indicator */}
      {cursorCoords && (
        <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2 bg-[#DDDFDF]/90 backdrop-blur-md px-3 py-1 rounded-lg border border-[#C792DF]/40 shadow-sm font-mono text-xs text-[#6A5880]">
          <span>
            X: {cursorCoords.x} Y: {cursorCoords.y}
          </span>
          <span className="w-1 h-1 rounded-full bg-[#C792DF]" />
          <span className="capitalize">{tools.activeTool}</span>
        </div>
      )}
    </main>
  );
};
