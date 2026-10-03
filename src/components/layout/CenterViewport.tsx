'use client';

import { readImportFile, reportImportError } from '@/lib/project/importFile';

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useStudioStore } from '@/stores/studioStore';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { getOrCreateBuffer } from '@/lib/engine/bufferRegistry';
import type { ImportPayload } from '@/components/modals/ImportModal';
import { FloatingPreviewWindow } from '@/components/studio/FloatingPreviewWindow';
import { ViewportLensFilters } from '@/components/studio/ViewportLensFilters';
import { RadialContextMenu } from '@/components/studio/RadialContextMenu';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { useRadialContextMenu } from '@/hooks/useRadialContextMenu';
import { compositeFrame } from '@/lib/render/compositor';
import {
  computeSeparableEDT,
  generateInflatedHeightmap,
  applyBilateralFilter,
  computeTangentNormalField,
  bakeNormalMapToCanvas,
} from '@/lib/ai/smartMathEngine';
import { decodeNormalRGB, blendNormalsRNM } from '@/lib/art/normalSculptor';
import { buildCycleRegisterMask, updateLivePaletteLUT32 } from '@/lib/color/paletteCycling';
import { buildCanvasPaletteIndexMap } from '@/lib/export/shaderExporter';

import { useViewportTransform } from '@/hooks/viewport/useViewportTransform';
import { useViewportOverlays } from '@/hooks/viewport/useViewportOverlays';
import { useViewportSelection } from '@/hooks/viewport/useViewportSelection';
import { useViewportSelectionTransform } from '@/hooks/viewport/useViewportSelectionTransform';
import { SelectionTransformGizmo } from '@/components/studio/SelectionTransformGizmo';
import { useViewportDrawing } from '@/hooks/viewport/useViewportDrawing';
import { useViewportPointerEvents } from '@/hooks/viewport/useViewportPointerEvents';
import { useViewportStudioEvents } from '@/hooks/viewport/useViewportStudioEvents';
import { PixelLightBulbGizmo } from '@/components/studio/PixelLightBulbGizmo';
import { studioEvents } from '@/lib/events/studioEvents';
import { RemoteCursorsOverlay } from '@/components/studio/RemoteCursorsOverlay';
import { updateCursorHUD } from '@/components/layout/CursorStatusBadge';

interface CenterViewportProps {
  onCommitHistory?: () => void;
  retainHistory?: boolean;
  onOpenImport?: (payload: ImportPayload) => void;
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

export const CenterViewport: React.FC<CenterViewportProps> = ({
  onCommitHistory,
  onOpenImport,
  retainHistory = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mainCanvasRef = useRef<HTMLCanvasElement>(null);
  const stencilCanvasRef = useRef<HTMLCanvasElement>(null);
  const onionCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const gridCanvasRef = useRef<HTMLCanvasElement>(null);
  const cursorCanvasRef = useRef<HTMLDivElement>(null);

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
  const referenceOverlay = useStudioStore((s) => s.referenceOverlay);
  const showIsoGuides = useStudioStore((s) => s.showIsoGuides);
  const isPlaygroundActive = useOnboardingStore((s) => s.isPlaygroundActive);
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

  const [isDragOver, setIsDragOver] = useState(false);
  const radialMenu = useRadialContextMenu(containerRef);

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

  const normalMapCacheRef = useRef<{ cacheKey: string; canvas: HTMLCanvasElement } | null>(null);

  // Pure composite of all visible layers onto the main viewport canvas
  const renderComposite = useCallback(() => {
    const mainCanvas = mainCanvasRef.current;
    if (!mainCanvas) return;
    const ctx = mainCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.imageSmoothingEnabled = false;

    const state = useStudioStore.getState();
    const currentFrame = state.frames[state.activeFrameIndex];

    // 1. Main Active Frame Layers (Unified Bottom-to-Top Compositing)
    compositeFrame(state.frames, state.activeFrameIndex, canvasWidth, canvasHeight, {}, mainCanvas);

    // 2. Floating Selection Buffer overlay
    if (floatingSelection) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha = 1.0;
      ctx.globalCompositeOperation = 'source-over';
      if (selectionTransform && Math.abs(selectionTransform.rotation) > 1e-4) {
        ctx.translate(selectionTransform.pivot.x, selectionTransform.pivot.y);
        ctx.rotate(selectionTransform.rotation);
        ctx.translate(-selectionTransform.pivot.x, -selectionTransform.pivot.y);
      }
      ctx.drawImage(floatingSelection.canvas, floatingSelection.x, floatingSelection.y);
      ctx.restore();
    }

    // 3. Tangent-Space Normal Map Live Viewport Mode
    if (state.showNormalMapPreview) {
      const layersSig = currentFrame
        ? currentFrame.layers.map((l) => `${l.id}:${l.visible ? 1 : 0}:${l.opacity}:${l.blendMode}`).join(';')
        : '';
      const floatKey = floatingSelection ? `${floatingSelection.x}_${floatingSelection.y}` : 'none';
      const cacheKey = `${state.bufferVersion}_${state.activeFrameIndex}_${canvasWidth}_${canvasHeight}_${layersSig}_${floatKey}`;
      let normalCanvas: HTMLCanvasElement;

      if (normalMapCacheRef.current && normalMapCacheRef.current.cacheKey === cacheKey) {
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
        normalMapCacheRef.current = { cacheKey, canvas: normalCanvas };
      }

      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      ctx.drawImage(normalCanvas, 0, 0);
    }

    ctx.globalAlpha = 1.0;
    ctx.globalCompositeOperation = 'source-over';
  }, [
    canvasHeight,
    canvasWidth,
    floatingSelection,
    getOrCreateLayerCanvas,
    selectionTransform,
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
    discardSnapshot,
    performUndo,
    performRedo,
  });

  // Hook 6: Pointer event routing and drawing dispatch
  const { handlePointerDown, handlePointerMove, handlePointerUp, handlePointerCancel } =
    useViewportPointerEvents({
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
      discardSnapshot,
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
    });

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
    frames,
    activeFrameIndex,
    activeLayerId,
    showNormalMapPreview,
    onionSkin,
    isPlaying,
  ]);

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

  const stageWidth = (canvasWidth * zoom) / 100;
  const stageHeight = (canvasHeight * zoom) / 100;
  const referenceFractions = referenceOverlay === 'thirds' ? [1 / 3, 2 / 3]
    : referenceOverlay === 'golden' ? [0.382, 0.618]
    : referenceOverlay === 'center' ? [0.5] : [];
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
        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.4), inset 0 0 0 1px var(--canvas-border)'
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
      onContextMenu={radialMenu.handleContextMenu}
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
          className="absolute top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-3 py-1.5 bg-[var(--desk-border)] text-[#DDDFDF] text-xs font-mono rounded border border-[var(--accent-wisteria)]/40 shadow-pixel-glow pointer-events-none animate-fade-in"
        >
          <PixelIcon name="lock" size={14} className="text-[var(--accent-plum)]" />
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
        className="relative shrink-0 outline outline-1 outline-[var(--desk-border)] focus:ring-2 focus:ring-[var(--accent-gold)]"
        style={{
          width: `${stageWidth}px`,
          height: `${stageHeight}px`,
          minWidth: `${stageWidth}px`,
          minHeight: `${stageHeight}px`,
          flexShrink: 0,
          transform: `translate(${panX}px, ${panY}px)`,
          transition: 'none',
          boxShadow: 'var(--canvas-shadow)',
        }}
      >
        {/* Atelier / Cozy Classic Platen Mat Collar & Attached Corner Registration Marks */}
        <div aria-hidden="true" className="absolute -inset-3 bg-[var(--platen-bg)] border border-[var(--platen-border)]/60 rounded-[2px] shadow-[0_4px_16px_rgba(0,0,0,0.3),0_0_0_1px_var(--desk-border)] pointer-events-none -z-10" />
        <div className="absolute -top-3 -left-3 w-2 h-2 border-t border-l border-[var(--platen-mark)]/50 pointer-events-none" aria-hidden="true" />
        <div className="absolute -top-3 -right-3 w-2 h-2 border-t border-r border-[var(--platen-mark)]/50 pointer-events-none" aria-hidden="true" />
        <div className="absolute -bottom-3 -left-3 w-2 h-2 border-b border-l border-[var(--platen-mark)]/50 pointer-events-none" aria-hidden="true" />
        <div className="absolute -bottom-3 -right-3 w-2 h-2 border-b border-r border-[var(--platen-mark)]/50 pointer-events-none" aria-hidden="true" />
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

        {/* Remote co-draw peer cursors (presence channel) */}
        <RemoteCursorsOverlay zoom={zoom} />

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
          className="absolute inset-0 w-full h-full pixelated shadow-pixel-frame cursor-crosshair"
          style={{ filter: mainFilterCss, imageRendering: 'pixelated' }}
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

        {/* Layer 5: Grid & Marching Ants Selection Overlay */}
        <canvas
          ref={gridCanvasRef}
          data-testid="grid-selection-overlay"
          width={canvasWidth}
          height={canvasHeight}
          className="absolute inset-0 w-full h-full pointer-events-none pixelated"
          style={showGrid && zoom >= 400 ? {
            backgroundImage: 'linear-gradient(to right, rgba(58, 46, 76, 0.16) 1px, transparent 1px), linear-gradient(to bottom, rgba(58, 46, 76, 0.16) 1px, transparent 1px)',
            backgroundSize: `${zoom / 100}px ${zoom / 100}px`,
          } : undefined}
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
        {(selection || floatingSelection) && (
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

        {/* Layer 7: Interactive On-Canvas Pixel Light Bulb Gizmo */}
        {photometricGizmoActive && (
          <PixelLightBulbGizmo
            canvasWidth={canvasWidth}
            canvasHeight={canvasHeight}
            zoom={zoom}
            mainCanvasRef={mainCanvasRef}
            onCommit={() => studioEvents.emit('pixibun:photometric-gizmo-commit')}
            onCancel={() => studioEvents.emit('pixibun:photometric-gizmo-cancel')}
            onLightChange={(azimuth, elevation, cx, cy, brightness) => {
              studioEvents.emit('pixibun:photometric-lighting-live', {
                lightAzimuth: azimuth,
                lightElevation: elevation,
                lightCenterX: cx,
                lightCenterY: cy,
                lightBrightness: brightness,
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
    </main>
  );
};
