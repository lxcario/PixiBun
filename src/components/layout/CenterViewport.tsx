'use client';

import { readImportFile, reportImportError } from '@/lib/project/importFile';

import React, { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import { useStudioStore } from '@/stores/studioStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { getOrCreateBuffer, snapshotBuffers } from '@/lib/engine/bufferRegistry';
import type { ImportPayload } from '@/components/modals/ImportModal';
import { FloatingPreviewWindow } from '@/components/studio/FloatingPreviewWindow';
import { FrameBun } from './FrameBun';
import { ViewportLensFilters } from '@/components/studio/ViewportLensFilters';
import { RadialContextMenu } from '@/components/studio/RadialContextMenu';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { useRadialContextMenu } from '@/hooks/useRadialContextMenu';
import { compositeFrame } from '@/lib/render/compositor';
import { createStrokeCompositeCache } from '@/lib/render/strokeCompositeCache';
import {
  computeSeparableEDT,
  generateInflatedHeightmap,
  applyBilateralFilter,
  computeTangentNormalField,
  bakeNormalMapToCanvas,
} from '@/lib/graphics/smartMathEngine';
import { decodeNormalRGB, blendNormalsRNM } from '@/lib/art/normalSculptor';
import { buildCycleRegisterMask, updateLivePaletteLUT32 } from '@/lib/color/paletteCycling';
import { buildCanvasPaletteIndexMap } from '@/lib/export/shaderExporter';

import { useViewportTransform } from '@/hooks/viewport/useViewportTransform';
import { useViewportOverlays } from '@/hooks/viewport/useViewportOverlays';
import { useViewportSelection } from '@/hooks/viewport/useViewportSelection';
import { useViewportSelectionTransform } from '@/hooks/viewport/useViewportSelectionTransform';
import { SelectionTransformGizmo } from '@/components/studio/SelectionTransformGizmo';
import { CurveAdjustmentGizmo } from '@/components/studio/CurveAdjustmentGizmo';
import { rotSprite, computeRotatedBounds } from '@/lib/canvas/rotSprite';
import { paethRotate } from '@/lib/canvas/paethRotation';
import { rotateNormalVectors } from '@/lib/canvas/normalMapRotation';
import { isNormalLayer } from '@/lib/export/normalLayers';
import { PixiMotionGizmo } from '@/components/studio/PixiMotionGizmo';
import {
  interpolatePose,
  clearSelectionFromImageData,
  resolveMotionSource,
} from '@/lib/animation/pixiMotion';
import { createMotionRenderer } from '@/lib/animation/motionRenderer';
import { countClippedMotionPixels, stampPlacedMotionRaster } from '@/lib/animation/motionRaster';
import { useViewportDrawing } from '@/hooks/viewport/useViewportDrawing';
import { useViewportPointerEvents } from '@/hooks/viewport/useViewportPointerEvents';
import { useViewportStudioEvents } from '@/hooks/viewport/useViewportStudioEvents';
import { PixelLightBulbGizmo } from '@/components/studio/PixelLightBulbGizmo';
import { studioEvents } from '@/lib/events/studioEvents';
import { RemoteCursorsOverlay } from '@/components/studio/RemoteCursorsOverlay';
import { updateCursorHUD } from '@/components/layout/CursorStatusBadge';
import { checkerStyle } from '@/lib/render/transparencyChecker';
import { rightClickOpensToolsPopup } from '@/lib/input/keymap';
import { usePreferencesStore } from '@/stores/preferencesStore';
import { calculateFitZoom, DEFAULT_ZOOM } from '@/config/zoom';

// The project and canvas size last fitted to the window, so returning to the
// same drawing (route handoff, remount) keeps the zoom the artist chose.
let lastFittedCanvas: string | null = null;

interface CenterViewportProps {
  onCommitHistory?: () => void;
  retainHistory?: boolean;
  onOpenImport?: (payload: ImportPayload) => void;
  /** Pointer-transparent layer on the art's pixel grid, above the artwork and stroke preview. */
  stageOverlay?: React.ReactNode;
  /** Zoom for fit on open; defaults to the ladder fit capped at 1600%. */
  fitZoom?: (canvasWidth: number, canvasHeight: number, stageWidth: number, stageHeight: number) => number;
  /** Show the canvas on plain paper whatever View → Transparency says (the setting itself is untouched). */
  plainPaper?: boolean;
}

function ScreenGuide({ axis, fraction, color, thickness = 1 }: {
  axis: 'vertical' | 'horizontal';
  fraction: number;
  color: string;
  thickness?: number;
}) {
  const vertical = axis === 'vertical';
  return <div aria-hidden="true" className="absolute pointer-events-none" style={{
    left: vertical ? `${fraction * 100}%` : 0,
    top: vertical ? 0 : `${fraction * 100}%`,
    width: vertical ? `${thickness}px` : '100%',
    height: vertical ? '100%' : `${thickness}px`,
    backgroundImage: `repeating-linear-gradient(to ${vertical ? 'bottom' : 'right'}, ${color} 0 4px, transparent 4px 8px)`,
  }} />;
}

export const CenterViewport = React.memo(function CenterViewport({
  onCommitHistory,
  onOpenImport,
  retainHistory = false,
  stageOverlay,
  fitZoom,
  plainPaper = false,
}: CenterViewportProps) {
  const focusMode = useWorkspaceStore(s => s.focusMode);
  const keymap = usePreferencesStore(s => s.keymap);
  const containerRef = useRef<HTMLDivElement>(null);
  const mainCanvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const stencilCanvasRef = useRef<HTMLCanvasElement>(null);
  const onionCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const gridCanvasRef = useRef<HTMLCanvasElement>(null);
  const cursorCanvasRef = useRef<HTMLDivElement>(null);
  const motionPreviewCanvasRef = useRef<HTMLCanvasElement>(null);
  const motionRendererRef = useRef<ReturnType<typeof createMotionRenderer> | null>(null);
  const [motionPreviewOwner, setMotionPreviewOwner] = useState<string | null>(null);

  // Store atomic subscriptions
  const canvasWidth = useStudioStore((s) => s.canvasWidth);
  const canvasHeight = useStudioStore((s) => s.canvasHeight);
  const zoom = useStudioStore((s) => s.zoom);
  const showTransparencyChecker = useStudioStore((s) => s.showTransparencyChecker) && !plainPaper;
  const setZoom = useStudioStore((s) => s.setZoom);
  const panX = useStudioStore((s) => s.panX);
  const panY = useStudioStore((s) => s.panY);
  const setPan = useStudioStore((s) => s.setPan);
  const setZoomAndPan = useStudioStore((s) => s.setZoomAndPan);
  const showGrid = useStudioStore((s) => s.showGrid);
  const referenceOverlay = useStudioStore((s) => s.referenceOverlay);
  const showIsoGuides = useStudioStore((s) => s.showIsoGuides);
  const isPlaygroundActive = useOnboardingStore((s) => s.isPlaygroundActive);
  const currentProjectId = useStudioStore((s) => s.currentProjectId);

  const fitZoomRef = useRef(fitZoom);
  fitZoomRef.current = fitZoom;
  // Fit on open: a newly opened drawing (or a new canvas size) starts fully
  // visible, never zoomed in past the default 1600%.
  useEffect(() => {
    const key = `${currentProjectId}:${canvasWidth}x${canvasHeight}`;
    const container = containerRef.current;
    if (lastFittedCanvas === key || !container) return;
    // The stage may not have its size yet (layout still settling); fit once it does.
    const fitWhenSized = () => {
      if (lastFittedCanvas === key || container.clientWidth === 0 || container.clientHeight === 0) return;
      lastFittedCanvas = key;
      const fit = fitZoomRef.current?.(canvasWidth, canvasHeight, container.clientWidth, container.clientHeight)
        ?? Math.min(calculateFitZoom(canvasWidth, canvasHeight, container.clientWidth, container.clientHeight), DEFAULT_ZOOM);
      useStudioStore.getState().setZoomAndPan(fit, 0, 0);
      observer.disconnect();
    };
    const observer = new ResizeObserver(fitWhenSized);
    observer.observe(container);
    fitWhenSized();
    return () => observer.disconnect();
  }, [canvasHeight, canvasWidth, currentProjectId]);
  const activeLessonId = useOnboardingStore((s) => s.activeLessonId);
  const showTilePreview = useStudioStore((s) => s.showTilePreview);
  const showNormalMapPreview = useStudioStore((s) => s.showNormalMapPreview);
  const photometricGizmoActive = useStudioStore((s) => s.photometricGizmoActive);
  const cvdLens = useStudioStore((s) => s.cvdLens);
  const squintMode = useStudioStore((s) => s.squintMode);
  const onionSkin = useStudioStore((s) => s.onionSkin);
  const isPlaying = useStudioStore((s) => s.isPlaying);
  const tools = useStudioStore((s) => s.tools);
  const frames = useStudioStore((s) => s.frames);
  const activeFrameIndex = useStudioStore((s) => s.activeFrameIndex);
  const activeLayerId = useStudioStore((s) => s.activeLayerId);
  const isPaletteCycling = useStudioStore((s) => s.isPaletteCycling);
  const paletteCycleSpeedMultiplier = useStudioStore((s) => s.paletteCycleSpeedMultiplier);
  const palettes = useStudioStore((s) => s.palettes);
  const currentPaletteId = useStudioStore((s) => s.currentPaletteId);
  const selection = useStudioStore((s) => s.selection);
  const selectionMask = useStudioStore((s) => s.selectionMask);

  // PixiMotion session state
  const motionPart = useStudioStore((s) => s.motionPart);
  // Only a motion session needs to re-render on raster edits; outside one this
  // stays 0 so painting doesn't re-render the whole viewport every frame.
  const motionBufferVersion = useStudioStore((s) => (s.motionPart ? s.bufferVersion : 0));
  const tileBufferVersion = useStudioStore((s) => (s.showTilePreview ? s.bufferVersion : 0));
  const tileCanvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const motionActivePose = useStudioStore((s) => s.motionActivePose);
  const motionPreviewIndex = useStudioStore((s) => s.motionPreviewIndex);
  const updateMotionPose = useStudioStore((s) => s.updateMotionPose);
  const updateMotionPart = useStudioStore((s) => s.updateMotionPart);
  const setMotionActivePose = useStudioStore((s) => s.setMotionActivePose);
  const clearMotionPart = useStudioStore((s) => s.clearMotionPart);
  const motionSource = motionPart ? resolveMotionSource(motionPart) : null;

  const [isDragOver, setIsDragOver] = useState(false);
  const radialMenu = useRadialContextMenu(containerRef);

  // Initialize or fetch the offscreen canvas for a layer
  const getOrCreateLayerCanvas = useCallback(
    (layerId: string): HTMLCanvasElement => {
      const state = useStudioStore.getState();
      return getOrCreateBuffer(layerId, state.canvasWidth, state.canvasHeight).canvas;
    },
    []
  );

  // Hook 1: Viewport transform & pan/zoom
  const {
    isPanning,
    beginPan,
    movePan,
    endPan,
    refreshCanvasRect,
    clientToCanvasCoords,
    handleWheel,
  } = useViewportTransform({
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
    cursorCoordsRef,
    lockedWarning,
    setLockedWarning,
    lockedWarningTimerRef,
    captureSnapshot,
    commitSnapshot,
    discardSnapshot,
    performUndo,
    performRedo,
    drawPointsOnActiveLayer,
    drawProvisionalPoint,
    finishBrushBatch,
    currentStrokeSnapshotRef,
    setPrimaryColor,
  } = useViewportDrawing({
    canvasWidth,
    canvasHeight,
    renderComposite: () => renderComposite(),
    getOrCreateLayerCanvas,
    onCommitHistory,
    retainHistory,
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
    ownsTransformShortcuts: false,
    canvasWidth,
    canvasHeight,
    activeLayerId,
    previewCanvasRef,
    getOrCreateLayerCanvas,
    renderComposite: () => renderComposite(),
    captureSnapshot,
    commitSnapshot,
  });

  const {
    transform: selectionTransform,
    handlePointerDown: handleGizmoPointerDown,
    handlePointerMove: handleGizmoPointerMove,
    handlePointerUp: handleGizmoPointerUp,
    commitTransform: commitGizmoTransform,
    cancelTransform: cancelGizmoTransform,
    handleFlipH: handleGizmoFlipH,
    handleFlipV: handleGizmoFlipV,
    handleRotate90CW: handleGizmoRotate90CW,
    handleRotate90CCW: handleGizmoRotate90CCW,
  } = useViewportSelectionTransform({
    canvasWidth,
    canvasHeight,
    activeLayerId,
    selection,
    selectionMask,
    floatingSelection,
    setFloatingSelection,
    setSelection: (box) => useStudioStore.getState().setSelection(box),
    getOrCreateLayerCanvas,
    renderComposite: () => renderComposite(),
    captureSnapshot,
    commitSnapshot,
    bumpBufferVersion: () => useStudioStore.getState().bumpBufferVersion(),
    liftSelectionToFloating,
    commitFloatingSelection,
  });

  const normalMapCacheRef = useRef<{ cacheKey: string; floatingCanvas: HTMLCanvasElement | null; canvas: HTMLCanvasElement } | null>(null);
  const rotatedSelectionCacheRef = useRef<{
    cacheKey: string;
    sourceCanvas: HTMLCanvasElement;
    canvas: HTMLCanvasElement;
    destX: number;
    destY: number;
  } | null>(null);

  const panGesture = useMemo(
    () => ({ begin: beginPan, move: movePan, end: endPan, isPanning }),
    [beginPan, endPan, isPanning, movePan]
  );

  // While a stroke is in progress, the layers around the active one stay flattened.
  const [strokeComposite] = useState(createStrokeCompositeCache);

  // Pure composite of all visible layers onto the main viewport canvas
  const renderComposite = useCallback(() => {
    // Undo/Redo can publish new dimensions before React replaces this callback.
    // Imperative painting must use the committed size to avoid resizing restored
    // layer buffers back to the previous dimensions and cropping their pixels.
    const state = useStudioStore.getState();
    const { canvasWidth, canvasHeight } = state;
    const mainCanvas = mainCanvasRef.current;
    if (!mainCanvas) return;
    const ctx = mainCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.imageSmoothingEnabled = false;

    const currentFrame = state.frames[state.activeFrameIndex];

    // 1. Main Active Frame Layers (Unified Bottom-to-Top Compositing)
    if (isDrawingRef.current) {
      strokeComposite.composite(state.frames, state.activeFrameIndex, state.activeLayerId, canvasWidth, canvasHeight, mainCanvas);
    } else {
      strokeComposite.invalidate();
      compositeFrame(state.frames, state.activeFrameIndex, canvasWidth, canvasHeight, {}, mainCanvas);
    }

    // 2. Floating Selection Buffer overlay
    if (floatingSelection) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha = 1.0;
      ctx.globalCompositeOperation = 'source-over';

      if (selectionTransform && Math.abs(selectionTransform.rotation) > 1e-4) {
        const curW = floatingSelection.w;
        const curH = floatingSelection.h;
        const curX = floatingSelection.x;
        const curY = floatingSelection.y;
        const rotation = selectionTransform.rotation;
        const pivotX = selectionTransform.pivot.x;
        const pivotY = selectionTransform.pivot.y;

        const algorithm = state.tools.rotationAlgorithm ?? 'rotsprite';
        const curFrame = state.frames[state.activeFrameIndex];
        const activeLayerObj = curFrame?.layers.find((l) => l.id === state.activeLayerId);
        const isNormal = activeLayerObj ? isNormalLayer(activeLayerObj) : false;

        const bounds = computeRotatedBounds(curW, curH, curX, curY, pivotX, pivotY, rotation);
        const cacheKey = JSON.stringify([curW, curH, curX, curY, rotation, pivotX, pivotY, algorithm, isNormal]);

        let rotatedCanvas: HTMLCanvasElement;
        let destX: number;
        let destY: number;

        if (rotatedSelectionCacheRef.current && rotatedSelectionCacheRef.current.cacheKey === cacheKey &&
          rotatedSelectionCacheRef.current.sourceCanvas === floatingSelection.canvas) {
          rotatedCanvas = rotatedSelectionCacheRef.current.canvas;
          destX = rotatedSelectionCacheRef.current.destX;
          destY = rotatedSelectionCacheRef.current.destY;
        } else {
          const fCtx = floatingSelection.canvas.getContext('2d', { willReadFrequently: true });
          const imgData = fCtx?.getImageData(0, 0, curW, curH);

          if (imgData) {
            let rotResult = algorithm === 'paeth'
              ? paethRotate(
                  { width: curW, height: curH, data: imgData.data },
                  rotation,
                  bounds.localPivotX,
                  bounds.localPivotY,
                  bounds.targetW,
                  bounds.targetH,
                  bounds.outPivotX,
                  bounds.outPivotY
                )
              : rotSprite(
                  { width: curW, height: curH, data: imgData.data },
                  rotation,
                  bounds.localPivotX,
                  bounds.localPivotY,
                  bounds.targetW,
                  bounds.targetH,
                  bounds.outPivotX,
                  bounds.outPivotY,
                  true
                );

            if (isNormal) {
              rotResult = rotateNormalVectors(rotResult, rotation);
            }

            rotatedCanvas = document.createElement('canvas');
            rotatedCanvas.width = rotResult.width;
            rotatedCanvas.height = rotResult.height;
            const rCtx = rotatedCanvas.getContext('2d');
            if (rCtx) {
              const outImg = rCtx.createImageData(rotResult.width, rotResult.height);
              outImg.data.set(rotResult.data);
              rCtx.putImageData(outImg, 0, 0);
            }
            destX = bounds.destX;
            destY = bounds.destY;
            rotatedSelectionCacheRef.current = {
              cacheKey,
              sourceCanvas: floatingSelection.canvas,
              canvas: rotatedCanvas,
              destX,
              destY,
            };
          } else {
            rotatedCanvas = floatingSelection.canvas;
            destX = curX;
            destY = curY;
          }
        }

        ctx.drawImage(rotatedCanvas, destX, destY);
      } else {
        ctx.drawImage(floatingSelection.canvas, floatingSelection.x, floatingSelection.y);
      }

      ctx.restore();
    }

    // 3. Tangent-Space Normal Map Live Viewport Mode
    if (state.showNormalMapPreview) {
      const buffers = snapshotBuffers();
      const layersSig = currentFrame?.layers.map(l => [l.id, l.visible, l.opacity, l.blendMode, l.tag,
        buffers.get(l.id)?.generation, buffers.get(l.id)?.contentRevision]);
      const floatingCanvas = floatingSelection?.canvas ?? null;
      const floatKey = floatingSelection ? [floatingSelection.x, floatingSelection.y, floatingSelection.w, floatingSelection.h,
        selectionTransform.rotation, selectionTransform.pivot.x, selectionTransform.pivot.y] : null;
      const cacheKey = JSON.stringify([state.currentProjectId, state.bufferVersion, currentFrame?.id, canvasWidth, canvasHeight, layersSig, floatKey]);
      let normalCanvas: HTMLCanvasElement;

      if (normalMapCacheRef.current && normalMapCacheRef.current.cacheKey === cacheKey && normalMapCacheRef.current.floatingCanvas === floatingCanvas) {
        normalCanvas = normalMapCacheRef.current.canvas;
      } else {
        const data = ctx.getImageData(0, 0, canvasWidth, canvasHeight).data;
        const isOpaque = (x: number, y: number) => {
          if (x < 0 || x >= canvasWidth || y < 0 || y >= canvasHeight) return false;
          return data[(y * canvasWidth + x) * 4 + 3] > 30;
        };
        const distanceMap = computeSeparableEDT(isOpaque, canvasWidth, canvasHeight);
        const rawHeightmap = generateInflatedHeightmap(distanceMap, canvasWidth, canvasHeight, 0.5);
        const smoothHeightmap = applyBilateralFilter(rawHeightmap, canvasWidth, canvasHeight, 1.5, 2.0);
        const normalField = computeTangentNormalField(smoothHeightmap, canvasWidth, canvasHeight, 2.0);

        // Blend custom normal sculpt layers (e.g. tag === 'normal') using RNM
        if (currentFrame) {
          const normalLayers = currentFrame.layers.filter(
            (l) => l.visible && (l.tag === 'normal' || l.tag === 'normal-map')
          );
          for (const nLayer of normalLayers) {
            const nlCanvas = getOrCreateLayerCanvas(nLayer.id);
            const nlCtx = nlCanvas.getContext('2d', { willReadFrequently: true });
            if (nlCtx) {
              const nlData = nlCtx.getImageData(0, 0, canvasWidth, canvasHeight).data;
              for (let y = 0; y < canvasHeight; y++) {
                for (let x = 0; x < canvasWidth; x++) {
                  const pIdx = (y * canvasWidth + x) * 4;
                  const idx = y * canvasWidth + x;
                  if (nlData[pIdx + 3] > 20) {
                    const detail = decodeNormalRGB(nlData[pIdx], nlData[pIdx + 1], nlData[pIdx + 2], true);
                    const base: [number, number, number] = [
                      normalField.nx[idx],
                      normalField.ny[idx],
                      normalField.nz[idx],
                    ];
                    const blended = blendNormalsRNM(base, detail);
                    normalField.nx[idx] = blended[0];
                    normalField.ny[idx] = blended[1];
                    normalField.nz[idx] = blended[2];
                  }
                }
              }
            }
          }
        }

        normalCanvas = bakeNormalMapToCanvas(normalField, canvasWidth, canvasHeight, isOpaque);
        normalMapCacheRef.current = { cacheKey, floatingCanvas, canvas: normalCanvas };
      }

      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      ctx.drawImage(normalCanvas, 0, 0);
    }

    ctx.globalAlpha = 1.0;
    ctx.globalCompositeOperation = 'source-over';
  }, [
    floatingSelection,
    getOrCreateLayerCanvas,
    isDrawingRef,
    selectionTransform,
    strokeComposite,
  ]);

  // Mark Ferrari 8-Bit Dynamic Palette Cycling 60 FPS Engine
  useEffect(() => {
    if (!isPaletteCycling) return;
    const currentPalette = palettes.find((p) => p.id === currentPaletteId);
    const tracks = currentPalette?.cycleTracks?.filter((t) => t.enabled && t.rate > 0);
    if (!currentPalette || !tracks || tracks.length === 0) return;

    const mainCanvas = mainCanvasRef.current;
    if (!mainCanvas) return;
    const ctx = mainCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const baseImg = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
    const indexMap = buildCanvasPaletteIndexMap(ctx, canvasWidth, canvasHeight, currentPalette.colors);
    const numPixels = canvasWidth * canvasHeight;
    const outLUT32 = new Uint32Array(currentPalette.colors.length);
    const cyclingRegisters = buildCycleRegisterMask(tracks, currentPalette.colors.length);

    const frameData = ctx.createImageData(canvasWidth, canvasHeight);
    const data32 = new Uint32Array(frameData.data.buffer);
    const baseData32 = new Uint32Array(baseImg.data.buffer);

    let animationFrameId: number;
    const startTime = performance.now();

    const cycleLoop = (time: number) => {
      const elapsedSec = ((time - startTime) / 1000) * paletteCycleSpeedMultiplier;
      updateLivePaletteLUT32(currentPalette.colors, tracks, elapsedSec, outLUT32);

      for (let i = 0; i < numPixels; i++) {
        const palIdx = indexMap.indices[i];
        if (indexMap.alpha[i] === 0 || !cyclingRegisters[palIdx]) {
          data32[i] = baseData32[i];
        } else {
          data32[i] = ((outLUT32[palIdx] ?? baseData32[i]) & 0x00ffffff) | (indexMap.alpha[i] << 24);
        }
      }

      ctx.putImageData(frameData, 0, 0);
      animationFrameId = requestAnimationFrame(cycleLoop);
    };

    animationFrameId = requestAnimationFrame(cycleLoop);

    return () => {
      cancelAnimationFrame(animationFrameId);
      renderComposite();
    };
  }, [
    isPaletteCycling,
    currentPaletteId,
    palettes,
    paletteCycleSpeedMultiplier,
    canvasWidth,
    canvasHeight,
    renderComposite,
  ]);

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
    selection,
    selectionMask,
    floatingSelection,
    cvdLens,
    squintMode,
    activeTool: tools.activeTool,
    brushSize: tools.brushSize,
  });

  // Hook 5: Studio events and PixiTools operations
  useViewportStudioEvents({
    mainCanvasRef,
    canvasWidth,
    canvasHeight,
    activeLayerId,
    getOrCreateLayerCanvas,
    renderComposite,
    captureSnapshot,
    commitSnapshot,
    discardSnapshot,
    performUndo,
    performRedo,
  });

  const cancelSelection = useCallback(() => {
    cancelGizmoTransform();
    setLassoPoints([]);
    const previewCanvas = previewCanvasRef.current;
    if (previewCanvas) {
      const pCtx = previewCanvas.getContext('2d');
      pCtx?.clearRect(0, 0, canvasWidth, canvasHeight);
    }
    useStudioStore.getState().setSelection(null, null);
  }, [cancelGizmoTransform, canvasHeight, canvasWidth, previewCanvasRef, setLassoPoints]);

  // Hook 6: Pointer event routing and drawing dispatch
  const { handlePointerDown, handlePointerMove, handlePointerUp, handlePointerCancel, curveHandler } =
    useViewportPointerEvents({
      canvasWidth,
      canvasHeight,
      panGesture,
      refreshCanvasRect,
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
      drawProvisionalPoint,
      finishBrushBatch,
      captureSnapshot,
      commitSnapshot,
      discardSnapshot,
      performUndo,
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
      commitFloatingSelection: () => {
        if (
          selectionTransform &&
          (Math.abs(selectionTransform.rotation) > 1e-4 ||
            selectionTransform.scaleX !== 1 ||
            selectionTransform.scaleY !== 1)
        ) {
          void commitGizmoTransform();
        } else {
          return commitFloatingSelection();
        }
      },
      createBoxMask,
      mergeSelectionMask,
      lockedWarningTimerRef,
      setLockedWarning,
      cancelSelection,
    });

  // When switching away from selection tools to drawing tools (e.g. Pen, Eraser),
  // commit any floating selection. The selection itself stays: it limits every
  // raster tool until Esc or a click outside the canvas clears it.
  const commitCurve = curveHandler.commit;
  const prevToolRef = useRef(tools.activeTool);
  useEffect(() => {
    const prevTool = prevToolRef.current;
    const currentTool = tools.activeTool;
    prevToolRef.current = currentTool;

    if (prevTool !== currentTool) {
      if (prevTool === 'curve' && currentTool !== 'curve') {
        commitCurve();
      }
      const toolsPreservingSelection = [
        'select-box',
        'select-lasso',
        'select-wand',
        'gradient',
        'erase-color',
      ];
      if (!toolsPreservingSelection.includes(currentTool)) {
        if (floatingSelection) {
          if (
            selectionTransform &&
            (Math.abs(selectionTransform.rotation) > 1e-4 ||
              selectionTransform.scaleX !== 1 ||
              selectionTransform.scaleY !== 1)
          ) {
            void commitGizmoTransform();
          } else {
            commitFloatingSelection();
          }
        }
      }
    }
  }, [tools.activeTool, floatingSelection, selectionTransform, commitGizmoTransform, commitFloatingSelection, commitCurve]);

  // Live Composite & Onion Skin Rendering
  useEffect(() => {
    if (!isDrawingRef.current) {
      renderComposite();
    }
    renderOnionSkin();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- isDrawingRef is an inert mutable ref
  }, [
    renderComposite,
    renderOnionSkin,
    canvasWidth,
    canvasHeight,
    frames,
    activeFrameIndex,
    activeLayerId,
    showNormalMapPreview,
    onionSkin,
    isPlaying,
  ]);

  // Seamless tile preview: copy the composite into the eight neighbours after it
  // changes, without resizing (and so clearing) them on every viewport render.
  useEffect(() => {
    const source = mainCanvasRef.current;
    if (!showTilePreview || !source) return;
    for (const tile of tileCanvasRefs.current) {
      if (!tile) continue;
      if (tile.width !== canvasWidth || tile.height !== canvasHeight) {
        tile.width = canvasWidth;
        tile.height = canvasHeight;
      }
      const ctx = tile.getContext('2d');
      if (!ctx) continue;
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      ctx.drawImage(source, 0, 0);
    }
  }, [showTilePreview, tileBufferVersion, frames, activeFrameIndex, canvasWidth, canvasHeight, showNormalMapPreview]);

  // Remote co-draw peers paint layer buffers directly (outside React state),
  // so the bridge requests an explicit composite re-render per applied batch.
  // Coalesce rapid bursts using requestAnimationFrame (B20).
  useEffect(() => {
    let rafId: number | null = null;
    const unsub = studioEvents.on('pixibun:request-composite', () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        renderComposite();
      });
    });
    return () => {
      unsub();
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    };
  }, [renderComposite]);

  // Interruption safety: window blur (Alt-tab), tab visibility hidden, or lost pointer capture (B19)
  useEffect(() => {
    const onWindowBlur = () => {
      handlePointerCancel();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handlePointerCancel();
      }
    };
    window.addEventListener('blur', onWindowBlur);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('blur', onWindowBlur);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [handlePointerCancel]);

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
      void readImportFile(file).then(payload => onOpenImport?.(payload)).catch(reportImportError);
    }
  };

  // Native non-passive wheel listener to allow smooth zoom preventDefault without Chrome passive warnings
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onNativeWheel = (e: WheelEvent) => {
      handleWheel(e);
    };
    el.addEventListener('wheel', onNativeWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onNativeWheel);
    };
  }, [handleWheel]);

  // PixiMotion: Render non-destructive live preview onto motionPreviewCanvasRef
  const motionSessionId = motionPart?.id;
  useEffect(() => { renderOnionSkin(); }, [motionSessionId, renderOnionSkin]);
  useEffect(() => {
    if (!motionSessionId) return;
    const renderer = createMotionRenderer(); motionRendererRef.current = renderer;
    return () => { motionRendererRef.current?.dispose(); motionRendererRef.current = null; };
  }, [motionSessionId]);
  useEffect(() => {
    if (!motionPart || !motionPreviewCanvasRef.current) return;
    const canvas = motionPreviewCanvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;
    const source = resolveMotionSource(motionPart);
    if (!source.ok) {
      motionRendererRef.current?.dispose(); motionRendererRef.current = null;
      ctx.clearRect(0, 0, canvasWidth, canvasHeight); canvas.setAttribute('aria-busy', 'false'); return;
    }
    const renderer = motionRendererRef.current ?? createMotionRenderer(); motionRendererRef.current = renderer;
    let live = true;
    canvas.setAttribute('aria-busy', 'true');
    studioEvents.emit('pixibun:motion-preview-status', { partId: motionPart.id, pending: true });

    // 1. Calculate active pose
    // Static endpoints use the same integer translation sampling as playback/bake.
    // Keep fractional authored settings and pivots; do not mutate the saved pose.
    const progress = motionPreviewIndex !== null
      ? (motionPart.frameCount > 1 ? motionPreviewIndex / (motionPart.frameCount - 1) : 0)
      : motionActivePose === 'start' ? 0 : 1;
    const activePose = interpolatePose(motionPart.startPose, motionPart.endPose, progress, motionPart.easing);

    // 2. Compute transformed raster
    void renderer.render(motionPart, activePose, canvasWidth, canvasHeight).then(transformed => {
      if (!live || useStudioStore.getState().motionPart !== motionPart || !resolveMotionSource(motionPart).ok) return;
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      // 3. Composite layers bottom to top from source frame
      const currentFrame = source.frame;
      const entries = snapshotBuffers();

      for (const layer of currentFrame.layers.slice().reverse()) {
        if (!layer.visible) continue;
        const entry = entries.get(layer.id);
        if (!entry) continue; // A preview must not materialize unpainted layers.
        if (entry.canvas.width !== canvasWidth || entry.canvas.height !== canvasHeight) throw new Error('The preview layer dimensions changed. Capture a fresh motion part.');
        ctx.globalAlpha = layer.opacity;
        ctx.globalCompositeOperation = layer.blendMode;

        if (layer.id === motionPart.sourceLayerId) {
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = canvasWidth;
          tempCanvas.height = canvasHeight;
          const tCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
          if (tCtx) {
            tCtx.imageSmoothingEnabled = false;
            tCtx.drawImage(entry.canvas, 0, 0);
            const imgData = tCtx.getImageData(0, 0, canvasWidth, canvasHeight);
            clearSelectionFromImageData(
              imgData,
              motionPart.bounds,
              motionPart.mask,
              canvasWidth,
              canvasHeight
            );
            stampPlacedMotionRaster(imgData, transformed);
            tCtx.putImageData(imgData, 0, 0);
            ctx.drawImage(tempCanvas, 0, 0);
          }
        } else {
          ctx.drawImage(entry.canvas, 0, 0);
        }
      }

      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      canvas.setAttribute('aria-busy', 'false');
      const clippedPixels = countClippedMotionPixels(transformed, canvasWidth, canvasHeight);
      canvas.setAttribute('data-clipped-pixels', String(clippedPixels));
      studioEvents.emit('pixibun:motion-preview-status', { partId: motionPart.id, pending: false, clippedPixels });
      setMotionPreviewOwner(motionPart.id);
    }).catch(error => {
      if (!live || (error instanceof DOMException && error.name === 'AbortError')) return;
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      clearMotionPart();
      studioEvents.emit('pixibun:toast', { type: 'error', message: error instanceof Error ? error.message : 'Could not preview this motion part.' });
    });
    return () => { live = false; };
  }, [
    motionPart,
    motionBufferVersion,
    motionActivePose,
    motionPreviewIndex,
    canvasWidth,
    canvasHeight,
    frames,
    activeFrameIndex,
    clearMotionPart,
  ]);

  const stageWidth = (canvasWidth * zoom) / 100;
  const stageHeight = (canvasHeight * zoom) / 100;
  const referenceFractions = referenceOverlay === 'thirds' ? [1 / 3, 2 / 3]
    : referenceOverlay === 'golden' ? [0.382, 0.618]
    : referenceOverlay === 'center' ? [0.5] : referenceOverlay === 'safe' ? [0.1, 0.9] : [];
  const referenceColor = referenceOverlay === 'thirds' ? 'rgba(199, 146, 223, 0.7)'
    : referenceOverlay === 'golden' ? 'rgba(240, 190, 124, 0.75)'
    : 'rgba(220, 171, 223, 0.7)';
  const screenScale = zoom / 100;
  const isoGuidePeriod = 16 * screenScale / Math.sqrt(5);
  const hasGroundGuide = isPlaygroundActive && (
    activeLessonId === 'master-bouncing-ball' ||
    activeLessonId === 'character-hop-shock' ||
    activeLessonId === 'combat-slash-hitstop'
  );
  const trajectoryStart = activeLessonId === 'master-bouncing-ball' ? 10
    : activeLessonId === 'character-hop-shock' ? 8 : null;

  return (
    <main
      ref={containerRef}
      id="main-content"
      tabIndex={-1}
      aria-label="Pixel art canvas workspace"
      className="relative flex-1 h-full w-full overflow-hidden flex items-center justify-center select-none touch-none outline-none"
      style={{
        backgroundColor: 'var(--canvas-well)',
        // Keep large canvas decorations cheap to repaint on high-DPI software renderers.
        backgroundImage: 'linear-gradient(to bottom, rgba(0,0,0,0.3), transparent)',
        backgroundSize: '100% 4px',
        backgroundRepeat: 'no-repeat',
        outline: '1px solid var(--canvas-border)',
        outlineOffset: '-1px',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onLostPointerCapture={handlePointerCancel}
      onPointerLeave={() => {
        cursorCoordsRef.current = null;
        updateCursorHUD(null);
        renderBrushGhost(null);
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onContextMenu={(e) => {
        // Standard keymap: right-click on the artwork paints, so only the space
        // around it opens the tools popup.
        const onArtwork = clientToCanvasCoords(e.clientX, e.clientY) !== null;
        if (rightClickOpensToolsPopup(usePreferencesStore.getState().keymap, onArtwork)) radialMenu.handleContextMenu(e);
        else e.preventDefault();
      }}
    >
      {/* Mode Indicators */}
      <div 
        className="absolute z-50 flex flex-col gap-2 items-end pointer-events-none"
        style={{ top: 'var(--space-3)', right: 'var(--space-3)' }}
      >
        {showNormalMapPreview && (
          <div className="bg-[var(--surface-3)] text-[var(--accent-gold)] font-mono text-[10px] px-2 py-0.5 rounded-full shadow-md">
            Normal Map
          </div>
        )}
        {isPaletteCycling && (
          <div className="bg-[var(--surface-3)] text-[var(--accent-gold)] font-mono text-[10px] px-2 py-0.5 rounded-full shadow-md">
            Cycling
          </div>
        )}
        {showTilePreview && (
          <div className="bg-[var(--surface-3)] text-[var(--accent-gold)] font-mono text-[10px] px-2 py-0.5 rounded-full shadow-md">
            Tiling
          </div>
        )}
      </div>

      {/* SVG Filters for CVD Colorblindness Simulation */}
      <ViewportLensFilters />

      {/* Floating Preview Window (Picture-in-Picture) */}
      <div hidden={focusMode}><FloatingPreviewWindow /></div>

      {/* Interactive Radial Context Menu */}
      <RadialContextMenu
        isOpen={radialMenu.isOpen}
        position={radialMenu.position}
        onClose={radialMenu.closeMenu}
        viewportRef={containerRef}
      />

      {/* Locked Layer Warning Toast */}
      {lockedWarning && (
        <div
          role="status"
          aria-live="polite"
          className="absolute top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-3 py-1.5 bg-[var(--desk-border)] text-[#DDDFDF] text-xs font-mono rounded border border-[var(--accent-wisteria)]/40 shadow-pixel-glow pointer-events-none animate-fade-in"
        >
          <PixelIcon name="lock" size={14} className="text-[var(--accent-plum)]" />
          <span>Active layer is locked! Unlock it in the inspector to paint.</span>
        </div>
      )}

      {/* Centered Canvas Container Area */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- The focusable drawing application opens its contextual tools with Shift+F10 or the Context Menu key. */}
      <div
        id="center-canvas-area"
        ref={stageRef}
        onKeyDown={radialMenu.handleKeyDown}
        data-tutorial="canvas"
        role="application"
        tabIndex={0}
        aria-label={`Pixel art drawing canvas. Use mouse or stylus to paint, arrow keys to pan viewport or nudge selection, and ${keymap === 'classic' ? 'Alt' : 'Space'}+drag to pan.`}
        className="relative shrink-0 outline outline-1 outline-[var(--desk-border)] focus:ring-2 focus:ring-[var(--accent-gold)]"
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
        {/* Atelier / Cozy Classic Platen Mat Collar & Attached Corner Registration Marks */}
        <FrameBun />
        <div aria-hidden="true" className="canvas-platen absolute -inset-3 bg-[var(--platen-bg)] border border-[var(--platen-border)]/60 rounded-[2px] outline outline-1 outline-[var(--desk-border)] pointer-events-none -z-10" />
        <div className="platen-corner absolute -top-3 -left-3 w-2 h-2 border-t border-l border-[var(--platen-mark)]/50 pointer-events-none" aria-hidden="true" />
        <div className="platen-corner absolute -top-3 -right-3 w-2 h-2 border-t border-r border-[var(--platen-mark)]/50 pointer-events-none" aria-hidden="true" />
        <div className="platen-corner absolute -bottom-3 -left-3 w-2 h-2 border-b border-l border-[var(--platen-mark)]/50 pointer-events-none" aria-hidden="true" />
        <div className="platen-corner absolute -bottom-3 -right-3 w-2 h-2 border-b border-r border-[var(--platen-mark)]/50 pointer-events-none" aria-hidden="true" />
        {/* 3x3 Seamless Tile Matrix Preview Surroundings */}
        {showTilePreview && (
          <div className="absolute inset-0 pointer-events-none z-0 opacity-60">
            {[-1, 0, 1].map((ox) =>
              [-1, 0, 1].map((oy) => {
                if (ox === 0 && oy === 0) return null;
                return (
                  <div
                    key={`tile-${ox}-${oy}`}
                    className="absolute border border-dashed border-[var(--accent-gold)]/40 overflow-hidden"
                    style={{
                      left: `${ox * stageWidth}px`,
                      top: `${oy * stageHeight}px`,
                      width: `${stageWidth}px`,
                      height: `${stageHeight}px`,
                    }}
                  >
                    <canvas
                      ref={(el) => { tileCanvasRefs.current[(ox + 1) * 3 + (oy + 1)] = el; }}
                      className="w-full h-full pixelated"
                    />
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Layer 0: transparency shows as a checkerboard on the art's pixel grid (View → Transparency), or plain white */}
        <div
          data-testid="canvas-solid-underlay"
          data-transparency={showTransparencyChecker ? 'checker' : 'white'}
          className="absolute inset-0 pointer-events-none"
          style={{ filter: cvdFilterCss, ...(showTransparencyChecker ? checkerStyle(zoom) : { backgroundColor: '#ffffff' }) }}
          aria-hidden="true"
        />

        {/* Remote co-draw peer cursors (presence channel) */}
        <RemoteCursorsOverlay zoom={zoom} />

        {/* Layer 1: Onion Skin Ghost Canvases */}
        <canvas
          ref={onionCanvasRef}
          data-testid="onion-skin-canvas"
          width={canvasWidth}
          height={canvasHeight}
          className="absolute inset-0 w-full h-full pointer-events-none pixelated"
          style={{ filter: cvdFilterCss, imageRendering: 'pixelated', visibility: motionPart ? 'hidden' : 'visible' }}
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
          className="absolute inset-0 w-full h-full pixelated shadow-pixel-frame cursor-crosshair"
          style={{ filter: mainFilterCss, imageRendering: 'pixelated', opacity: motionSource?.ok && motionPreviewOwner === motionPart?.id ? 0 : 1 }}
        />

        {/* Layer 4: Interactive Stroke & Shape Live Preview Canvas */}
        <canvas
          ref={previewCanvasRef}
          data-testid="stroke-preview-canvas"
          width={canvasWidth}
          height={canvasHeight}
          className="absolute inset-0 w-full h-full pointer-events-none pixelated"
          style={{ filter: cvdFilterCss, imageRendering: 'pixelated' }}
        />

        {stageOverlay}

        {/* Layer 4.8: PixiMotion Live Preview Canvas */}
        {motionPart && (
          <canvas
            ref={motionPreviewCanvasRef}
            data-testid="piximotion-preview-canvas"
            width={canvasWidth}
            height={canvasHeight}
            className="absolute inset-0 w-full h-full pointer-events-none pixelated"
            style={{ filter: mainFilterCss, imageRendering: 'pixelated', zIndex: 12, opacity: motionSource?.ok && motionPreviewOwner === motionPart.id ? 1 : 0 }}
          />
        )}

        {/* Layer 5: Grid & Marching Ants Selection Overlay */}
        <div
          data-testid="grid-selection-overlay"
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={showGrid && zoom >= 400 ? {
            backgroundImage: 'linear-gradient(to right, rgba(58, 46, 76, 0.16) 0 1px, transparent 1px 100%), linear-gradient(to bottom, rgba(58, 46, 76, 0.16) 0 1px, transparent 1px 100%)',
            backgroundSize: `${zoom / 100}px ${zoom / 100}px`,
          } : undefined}
        />
        <canvas
          ref={gridCanvasRef}
          data-testid="selection-overlay-canvas"
          width={canvasWidth}
          height={canvasHeight}
          className="absolute inset-0 w-full h-full pointer-events-none pixelated"
        />

        {/* Screen-pixel guides stay thin without zoom-sized canvas buffers. */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          {showIsoGuides && <div data-testid="isometric-guide-overlay" className="absolute inset-0" style={{
            backgroundImage: [26.565, 153.435].map((angle) =>
              `repeating-linear-gradient(${angle}deg, rgba(240, 190, 124, 0.45) 0 1px, transparent 1px ${isoGuidePeriod}px)`
            ).join(', '),
          }} />}
          {referenceFractions.flatMap((fraction) => [
            <ScreenGuide key={`reference-v-${fraction}`} axis="vertical" fraction={fraction} color={referenceColor} />,
            <ScreenGuide key={`reference-h-${fraction}`} axis="horizontal" fraction={fraction} color={referenceColor} />,
          ])}
          {referenceOverlay === 'diagonals' && <svg data-testid="diagonal-composition-guide" className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M0 0 L100 100 M100 0 L0 100" fill="none" stroke="rgba(240,190,124,0.75)" strokeWidth="1" vectorEffect="non-scaling-stroke" /></svg>}
          {tools.symmetryHorizontal && <ScreenGuide axis="vertical" fraction={0.5} color="rgba(199, 146, 223, 0.85)" thickness={2} />}
          {tools.symmetryVertical && <ScreenGuide axis="horizontal" fraction={0.5} color="rgba(199, 146, 223, 0.85)" thickness={2} />}
          {hasGroundGuide && <div data-testid="playground-ground-guide" className="absolute left-0 w-full" style={{
            top: `${26 * screenScale}px`, height: '1.5px',
            backgroundImage: 'repeating-linear-gradient(to right, rgba(240, 190, 124, 0.6) 0 4px, transparent 4px 6px)',
          }} />}
          {isPlaygroundActive && trajectoryStart !== null && <div data-testid="playground-trajectory-guide" className="absolute" style={{
            left: `${16 * screenScale}px`, top: `${trajectoryStart * screenScale}px`,
            width: '1px', height: `${(26 - trajectoryStart) * screenScale}px`,
            backgroundImage: 'repeating-linear-gradient(to bottom, rgba(240, 190, 124, 0.35) 0 2px, transparent 2px 6px)',
          }} />}
        </div>

        {/* Layer 6: Brush Ghost Bounding Cursor (screen-space CSS stroke) */}
        <div
          ref={cursorCanvasRef}
          data-testid="brush-ghost-overlay"
          className="absolute pointer-events-none"
          style={{
            display: 'none',
            boxSizing: 'border-box',
            border: '1px solid rgba(240, 190, 124, 0.6)',
            outline: '1px solid rgba(20, 12, 30, 0.5)',
          }}
        />

        {/* Layer 6.5: Selection Free-Transform Gizmo & Marching Ants */}
        {(selection || floatingSelection) && !motionPart && (
          <SelectionTransformGizmo
            canvasWidth={canvasWidth}
            canvasHeight={canvasHeight}
            zoom={zoom}
            selectionMask={selectionMask}
            transform={selectionTransform}
            interactive={
              tools.activeTool.startsWith('select-') ||
              !!floatingSelection ||
              selectionTransform.isTransforming
            }
            onHandlePointerDown={handleGizmoPointerDown}
            onPointerMove={handleGizmoPointerMove}
            onPointerUp={handleGizmoPointerUp}
            onCommit={commitGizmoTransform}
            onCancel={cancelGizmoTransform}
            onFlipH={handleGizmoFlipH}
            onFlipV={handleGizmoFlipV}
            onRotate90CW={handleGizmoRotate90CW}
            onRotate90CCW={handleGizmoRotate90CCW}
          />
        )}

        {/* Layer 6.6: PixiMotion Rigid Part Transform Gizmo */}
        {motionPart && (
          <PixiMotionGizmo
            canvasWidth={canvasWidth}
            canvasHeight={canvasHeight}
            zoom={zoom}
            motionPart={motionPart}
            motionActivePose={motionActivePose}
            motionPreviewIndex={motionPreviewIndex}
            onUpdatePivot={(pivot) => updateMotionPart({ pivot })}
            onUpdatePose={(target, updates) => updateMotionPose(target, updates)}
            onTogglePose={() =>
              setMotionActivePose(motionActivePose === 'start' ? 'end' : 'start')
            }
            onBake={() => studioEvents.emit('pixibun:motion-bake')}
            onCancel={clearMotionPart}
          />
        )}

        {/* Layer 6.7: Interactive Bézier Curve Adjustment Screen-Space Gizmo */}
        {curveHandler.adjustingCurve && (
          <CurveAdjustmentGizmo
            zoom={zoom}
            start={curveHandler.adjustingCurve.start}
            control={curveHandler.adjustingCurve.control}
            end={curveHandler.adjustingCurve.end}
            draggingHandle={curveHandler.adjustingCurve.draggingHandle}
            onStartDrag={curveHandler.startDraggingHandle}
          />
        )}

        {/* Layer 7: Interactive On-Canvas Pixel Light Bulb Gizmo */}
        {photometricGizmoActive && (
          <PixelLightBulbGizmo
            canvasWidth={canvasWidth}
            canvasHeight={canvasHeight}
            zoom={zoom}
            mainCanvasRef={mainCanvasRef}
            onCommit={() => studioEvents.emit('pixibun:photometric-gizmo-commit')}
            onCancel={() => studioEvents.emit('pixibun:photometric-gizmo-cancel')}
            onLightChange={(azimuth, elevation, cx, cy, brightness, look) => {
              studioEvents.emit('pixibun:photometric-lighting-live', {
                lightAzimuth: azimuth,
                lightElevation: elevation,
                lightCenterX: cx,
                lightCenterY: cy,
                lightBrightness: brightness,
                ...look,
              });
            }}
          />
        )}

        {/* Drag Over Overlay */}
        {isDragOver && (
          <div className="absolute inset-0 border-4 border-dashed border-[var(--accent-plum)] bg-[var(--accent-wisteria)]/20 flex items-center justify-center pointer-events-none z-30">
            <span className="text-[var(--desk-border)] font-mono text-sm font-bold bg-[#DDDFDF] px-3 py-1.5 rounded shadow">
              Drop file to import
            </span>
          </div>
        )}

      </div>

      {/* Interactive Curve / Spline Adjustment Control Toolbar */}
      {curveHandler.isAdjusting && (
        <div
          data-testid="curve-adjustment-toolbar"
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
          className="absolute bottom-5 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 bg-[var(--desk-surface-raised)]/95 border border-[var(--desk-border)] rounded-[3px] px-2.5 py-1 shadow-md backdrop-blur-sm text-[10px] font-mono text-[var(--accent-cream)] select-none animate-in fade-in zoom-in-95 duration-150"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-gold)] animate-pulse" />
          <span className="font-semibold text-[var(--accent-gold)] text-[10px]">Curve</span>
          <span className="text-[var(--text-muted)]">·</span>
          <span className="text-[10px] text-[var(--text-secondary)]">Drag handles</span>
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              curveHandler.commit();
            }}
            className="ml-1 px-2 py-0.5 bg-[var(--accent-gold)] text-[var(--desk-surface-base)] font-bold rounded-[2px] hover:brightness-110 transition-all text-[10px] shadow-xs cursor-pointer"
          >
            Apply (Enter)
          </button>
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              curveHandler.cancel();
            }}
            className="px-1.5 py-0.5 text-[var(--text-muted)] hover:text-[var(--accent-rose)] transition-colors text-[10px] cursor-pointer"
          >
            Cancel (Esc)
          </button>
        </div>
      )}

      {/* Curve Re-edit Notification Pill */}
      {curveHandler.canReEdit && !curveHandler.isAdjusting && tools.activeTool === 'curve' && (
        <div
          data-testid="curve-reedit-toolbar"
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
          className="absolute bottom-5 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 bg-[var(--desk-surface-raised)]/95 border border-[var(--desk-border)] rounded-[3px] px-2.5 py-1 shadow-md backdrop-blur-sm text-[10px] font-mono text-[var(--accent-cream)] select-none animate-in fade-in zoom-in-95 duration-150"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-sage)]" />
          <span className="font-semibold text-[var(--accent-sage)] text-[10px]">Applied</span>
          <span className="text-[var(--text-muted)]">·</span>
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              curveHandler.reEdit();
            }}
            className="px-2 py-0.5 bg-[var(--accent-sage)] text-[var(--desk-surface-base)] font-bold rounded-[2px] hover:brightness-110 transition-all text-[10px] shadow-xs cursor-pointer flex items-center gap-1"
          >
            <span>✎</span>
            <span>Re-edit Curve (Enter)</span>
          </button>
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              curveHandler.dismissReEdit();
            }}
            className="px-1.5 py-0.5 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors text-[10px] cursor-pointer"
            title="Dismiss"
          >
            ✕
          </button>
        </div>
      )}
    </main>
  );
});
