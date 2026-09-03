'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useStudioStore } from '@/stores/studioStore';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { TEMPLATE_PALETTE } from '@/lib/art/starterTemplates';
import { 
  getBresenhamLine, 
  filterPixelPerfect, 
  getRectanglePoints, 
  getEllipsePoints, 
  applySymmetry, 
  Point,
  getQuadraticBezierPoints,
  getIsometric2p1Line
} from '@/lib/canvas/rasterMath';
import { performFloodFill, rgbaToHex, hexToRgba } from '@/lib/canvas/floodFill';
import { shouldDitherPixel } from '@/lib/canvas/ditherMatrix';
import { CVD_FILTER_IDS, getViewportFilterCss } from '@/lib/color/cvdLens';
import { ViewportLensFilters } from '@/components/studio/ViewportLensFilters';
import { getOrCreateBuffer, deleteBuffers } from '@/lib/engine/bufferRegistry';
import { HistoryStep } from '@/types/canvas';
import { createHistoryEngine, HistoryEngine } from '@/lib/engine/historyEngine';
import type { ImportPayload } from '@/components/modals/ImportModal';
import { 
  cleanJaggiesOnCanvas, 
  generateSelOutData,
  generateOuterStrokeData,
  generateGroundShadowData,
  applyAtmosphericColorGrade,
  quantizeToActivePalette,
  cleanStrayPixelsOnCanvas,
  generate47BlobEdgeData,
  morphInBetweenFrames,
} from '@/lib/ai/pixelAiEngine';
import {
  renderParametric2p5DLighting,
  rotateWithRotSprite,
  applyAtkinsonDither,
  applyRiemersmaDither,
  applyZhangSuenThinning,
  executePhotometricPipeline,
  executeVolumetricOpticalPipeline,
  computeSeparableEDT,
  executeRaymarchedCastShadowPipeline,
  generateInflatedHeightmap,
  applyBilateralFilter,
  computeTangentNormalField,
  bakeNormalMapToCanvas,
  detectMinecraftSkin,
  computeMinecraftSkinNormalField,
} from '@/lib/ai/smartMathEngine';
import { FloatingPreviewWindow } from '@/components/studio/FloatingPreviewWindow';
import { compositeFrame } from '@/lib/render/compositor';
import { getOnionSkinSpecs } from '@/lib/render/onionSkin';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { studioEvents } from '@/lib/events/studioEvents';
import { useRadialContextMenu } from '@/hooks/useRadialContextMenu';
import { RadialContextMenu } from '@/components/studio/RadialContextMenu';

interface FloatingSelection {
  canvas: HTMLCanvasElement;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface CenterViewportProps {
  onCommitHistory?: () => void;
  onOpenImport?: (payload: ImportPayload) => void;
}

export const CenterViewport: React.FC<CenterViewportProps> = ({ 
  onCommitHistory,
  onOpenImport 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mainCanvasRef = useRef<HTMLCanvasElement>(null);
  const stencilCanvasRef = useRef<HTMLCanvasElement>(null);
  const onionCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const gridCanvasRef = useRef<HTMLCanvasElement>(null);

  // Undo & Redo History Engine
  const historyEngineRef = useRef<HistoryEngine>(createHistoryEngine(50));
  const currentStrokeSnapshotRef = useRef<HistoryStep | null>(null);

  // Selection & Clipboard Memory
  const [floatingSelection, setFloatingSelection] = useState<FloatingSelection | null>(null);
  const clipboardRef = useRef<{ canvas: HTMLCanvasElement; w: number; h: number } | null>(null);
  const [isDraggingSelection, setIsDraggingSelection] = useState(false);
  const [dragOffset, setDragOffset] = useState<Point>({ x: 0, y: 0 });

  const canvasWidth = useStudioStore((s) => s.canvasWidth);
  const canvasHeight = useStudioStore((s) => s.canvasHeight);
  const zoom = useStudioStore((s) => s.zoom);
  const setZoom = useStudioStore((s) => s.setZoom);
  const panX = useStudioStore((s) => s.panX);
  const panY = useStudioStore((s) => s.panY);
  const setPan = useStudioStore((s) => s.setPan);
  const showGrid = useStudioStore((s) => s.showGrid);
  const showIsoGuides = useStudioStore((s) => s.showIsoGuides);
  const showTilePreview = useStudioStore((s) => s.showTilePreview);
  const showNormalMapPreview = useStudioStore((s) => s.showNormalMapPreview);
  // Display-only perceptual lenses (DESIGN.md §12/§13)
  const cvdLens = useStudioStore((s) => s.cvdLens);
  const squintMode = useStudioStore((s) => s.squintMode);
  // Matrix-only lens: safe for translucent stacked surfaces (preserves alpha)
  const cvdFilterCss = cvdLens !== 'none' ? `url(#${CVD_FILTER_IDS[cvdLens]})` : undefined;
  // Main composite surface: squint (white flood + ink) supersedes the CVD matrix
  const mainFilterCss = getViewportFilterCss(cvdLens, squintMode);
  const onionSkin = useStudioStore((s) => s.onionSkin);
  const isPlaying = useStudioStore((s) => s.isPlaying);
  const tools = useStudioStore((s) => s.tools);
  const primaryColor = useStudioStore((s) => s.primaryColor);
  const secondaryColor = useStudioStore((s) => s.secondaryColor);
  const setPrimaryColor = useStudioStore((s) => s.setPrimaryColor);
  const frames = useStudioStore((s) => s.frames);
  const activeFrameIndex = useStudioStore((s) => s.activeFrameIndex);
  const activeLayerId = useStudioStore((s) => s.activeLayerId);
  const setCanUndo = useStudioStore((s) => s.setCanUndo);
  const setCanRedo = useStudioStore((s) => s.setCanRedo);
  const addExtractedPalette = useStudioStore((s) => s.addExtractedPalette);
  const addLayer = useStudioStore((s) => s.addLayer);
  const deleteLayer = useStudioStore((s) => s.deleteLayer);
  const bumpBufferVersion = useStudioStore((s) => s.bumpBufferVersion);
  const selection = useStudioStore((s) => s.selection);
  const selectionMask = useStudioStore((s) => s.selectionMask);
  const setSelection = useStudioStore((s) => s.setSelection);

  const isDrawingRef = useRef(false);
  const rafBufferBumpRef = useRef<number | null>(null);
  const onionGhostCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cursorCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const selectionModifierRef = useRef<'replace' | 'union' | 'subtract'>('replace');
  const baseSelectionMaskRef = useRef<Uint8Array | null>(null);

  const createBoxMask = useCallback(
    (box: { x: number; y: number; w: number; h: number }): Uint8Array => {
      const mask = new Uint8Array(canvasWidth * canvasHeight);
      const endX = Math.min(canvasWidth, box.x + box.w);
      const endY = Math.min(canvasHeight, box.y + box.h);
      for (let y = Math.max(0, box.y); y < endY; y++) {
        for (let x = Math.max(0, box.x); x < endX; x++) {
          mask[y * canvasWidth + x] = 1;
        }
      }
      return mask;
    },
    [canvasHeight, canvasWidth]
  );

  const mergeSelectionMask = useCallback(
    (
      baseMask: Uint8Array | null,
      incomingMask: Uint8Array,
      mode: 'replace' | 'union' | 'subtract'
    ): { box: { x: number; y: number; w: number; h: number } | null; mask: Uint8Array | null } => {
      const total = canvasWidth * canvasHeight;
      const resultMask = new Uint8Array(total);
      const effectiveBase = mode !== 'replace' && baseMask ? baseMask : null;

      let minX = canvasWidth;
      let minY = canvasHeight;
      let maxX = -1;
      let maxY = -1;
      let count = 0;

      for (let i = 0; i < total; i++) {
        const baseVal = effectiveBase ? effectiveBase[i] : 0;
        const incVal = incomingMask[i];
        let finalVal = 0;

        if (mode === 'union') {
          finalVal = baseVal === 1 || incVal === 1 ? 1 : 0;
        } else if (mode === 'subtract') {
          finalVal = baseVal === 1 && incVal === 0 ? 1 : 0;
        } else {
          finalVal = incVal;
        }

        resultMask[i] = finalVal;
        if (finalVal === 1) {
          count++;
          const px = i % canvasWidth;
          const py = Math.floor(i / canvasWidth);
          if (px < minX) minX = px;
          if (px > maxX) maxX = px;
          if (py < minY) minY = py;
          if (py > maxY) maxY = py;
        }
      }

      if (count > 0 && maxX >= minX && maxY >= minY) {
        return {
          box: { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 },
          mask: resultMask,
        };
      }
      return { box: null, mask: null };
    },
    [canvasHeight, canvasWidth]
  );

  const [isDrawing, setIsDrawing] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<Point>({ x: 0, y: 0 });
  const [strokeStart, setStrokeStart] = useState<Point | null>(null);
  const [lastPoint, setLastPoint] = useState<Point | null>(null);
  const [cursorCoords, setCursorCoords] = useState<Point | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [lassoPoints, setLassoPoints] = useState<Point[]>([]);
  const [lockedWarning, setLockedWarning] = useState(false);
  const lockedWarningTimerRef = useRef<number | null>(null);

  const radialMenu = useRadialContextMenu();

  // Initialize or fetch the offscreen canvas for a layer.
  const getOrCreateLayerCanvas = useCallback(
    (layerId: string): HTMLCanvasElement =>
      getOrCreateBuffer(layerId, canvasWidth, canvasHeight).canvas,
    [canvasWidth, canvasHeight]
  );

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

    // 2. Floating Selection Buffer overlay (if active)
    if (floatingSelection) {
      ctx.globalAlpha = 1.0;
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(floatingSelection.canvas, floatingSelection.x, floatingSelection.y);
    }

    // 4. Tangent-Space Normal Map Live Viewport Mode
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

  // Render onion-skin ghost frames onto the dedicated underlay canvas
  const renderOnionSkin = useCallback(() => {
    const onionCanvas = onionCanvasRef.current;
    if (!onionCanvas) return;
    const ctx = onionCanvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.imageSmoothingEnabled = false;

    const state = useStudioStore.getState();
    const specs = getOnionSkinSpecs(
      state.frames.length,
      state.activeFrameIndex,
      state.onionSkin,
      state.isPlaying
    );

    if (specs.length === 0) return;

    if (!onionGhostCanvasRef.current) {
      onionGhostCanvasRef.current = document.createElement('canvas');
    }
    const scratchCanvas = onionGhostCanvasRef.current;
    if (scratchCanvas.width !== canvasWidth || scratchCanvas.height !== canvasHeight) {
      scratchCanvas.width = canvasWidth;
      scratchCanvas.height = canvasHeight;
    }

    for (const spec of specs) {
      const ghostCanvas = compositeFrame(
        state.frames,
        spec.frameIndex,
        canvasWidth,
        canvasHeight,
        {},
        scratchCanvas
      );
      if (!ghostCanvas) continue;

      if (spec.tint) {
        const ghostCtx = ghostCanvas.getContext('2d');
        if (ghostCtx) {
          ghostCtx.globalCompositeOperation = 'source-atop';
          ghostCtx.fillStyle = spec.tint;
          ghostCtx.fillRect(0, 0, canvasWidth, canvasHeight);
        }
      }

      ctx.globalAlpha = spec.alpha;
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(ghostCanvas, 0, 0);
    }

    ctx.globalAlpha = 1.0;
  }, [canvasHeight, canvasWidth]);

  // Render on-canvas interactive lightbox tracing stencil (strictly in playground mode)
  const isPlaygroundActive = useOnboardingStore((state) => state.isPlaygroundActive);
  const showStencilGuide = useOnboardingStore((state) => state.showStencilGuide);
  const stencilOpacity = useOnboardingStore((state) => state.stencilOpacity);
  const currentStepIndex = useOnboardingStore((state) => state.currentStepIndex);
  const activeLessonId = useOnboardingStore((state) => state.activeLessonId);

  useEffect(() => {
    const canvas = stencilCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    if (!showStencilGuide || !isPlaygroundActive) return;

    const currentStep = useOnboardingStore.getState().getCurrentStep();
    if (currentStep.type !== 'DRAW_FRAME') return;
    if (currentStep.frameIndex !== undefined && activeFrameIndex !== currentStep.frameIndex) return;

    const template = useOnboardingStore.getState().getCurrentFrameTemplate();
    if (!template) return;

    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = stencilOpacity;

    const cellW = canvasWidth / 16;
    const cellH = canvasHeight / 16;

    template.grid16.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const char = row[x];
        if (char === '.') continue;
        const color = TEMPLATE_PALETTE[char];
        if (color) {
          ctx.fillStyle = color;
          ctx.fillRect(x * cellW, y * cellH, cellW, cellH);
        }
      }
    });

    ctx.globalAlpha = 1.0;
  }, [showStencilGuide, isPlaygroundActive, stencilOpacity, currentStepIndex, activeLessonId, activeFrameIndex, canvasWidth, canvasHeight]);

  // Capture Undo Snapshot
  const captureSnapshot = useCallback((description: string = 'Stroke', overrideLayerId?: string, createdLayerId?: string) => {
    const targetLayerId = overrideLayerId || activeLayerId;
    const currentLayerCanvas = getOrCreateLayerCanvas(targetLayerId);
    const ctx = currentLayerCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const imgData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
    currentStrokeSnapshotRef.current = {
      layerId: targetLayerId,
      frameIndex: activeFrameIndex,
      imageData: imgData,
      description,
      createdLayerId,
    };
  }, [activeFrameIndex, activeLayerId, canvasWidth, canvasHeight, getOrCreateLayerCanvas]);

  // Commit Undo Snapshot to Stack
  const commitSnapshot = useCallback(() => {
    if (currentStrokeSnapshotRef.current) {
      historyEngineRef.current.push(currentStrokeSnapshotRef.current);
      currentStrokeSnapshotRef.current = null;
      setCanUndo(historyEngineRef.current.canUndo);
      setCanRedo(historyEngineRef.current.canRedo);
      onCommitHistory?.();
    }
  }, [onCommitHistory, setCanRedo, setCanUndo]);

  // Undo Action
  const performUndo = useCallback(() => {
    const previousStep = historyEngineRef.current.peekUndo();
    if (!previousStep) return;

    const currentLayerCanvas = getOrCreateLayerCanvas(previousStep.layerId);
    const ctx = currentLayerCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const currentImgData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
    const currentStep: HistoryStep = {
      layerId: previousStep.layerId,
      frameIndex: previousStep.frameIndex,
      imageData: currentImgData,
      description: previousStep.description,
      createdLayerId: previousStep.createdLayerId,
    };

    const stepToRestore = historyEngineRef.current.undo(currentStep);
    if (!stepToRestore) return;

    if (previousStep.createdLayerId) {
      // Remove the newly created layer on undo
      const state = useStudioStore.getState();
      state.deleteLayer(previousStep.createdLayerId);
      deleteBuffers([previousStep.createdLayerId]);
    } else {
      ctx.putImageData(stepToRestore.imageData, 0, 0);
    }

    setCanUndo(historyEngineRef.current.canUndo);
    setCanRedo(historyEngineRef.current.canRedo);
    renderComposite();
    bumpBufferVersion();
  }, [bumpBufferVersion, canvasWidth, canvasHeight, getOrCreateLayerCanvas, renderComposite, setCanRedo, setCanUndo]);

  // Redo Action
  const performRedo = useCallback(() => {
    const nextStep = historyEngineRef.current.peekRedo();
    if (!nextStep) return;

    if (nextStep.createdLayerId) {
      // Recreate the layer if it was deleted during undo
      const state = useStudioStore.getState();
      const currentFrame = state.frames[nextStep.frameIndex];
      const exists = currentFrame?.layers.some(l => l.id === nextStep.createdLayerId);
      if (!exists) {
        state.addLayer(nextStep.description, undefined, nextStep.createdLayerId);
      }
    }

    const currentLayerCanvas = getOrCreateLayerCanvas(nextStep.layerId);
    const ctx = currentLayerCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const currentImgData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
    const currentStep: HistoryStep = {
      layerId: nextStep.layerId,
      frameIndex: nextStep.frameIndex,
      imageData: currentImgData,
      description: nextStep.description,
      createdLayerId: nextStep.createdLayerId,
    };

    const stepToRestore = historyEngineRef.current.redo(currentStep);
    if (!stepToRestore) return;

    ctx.putImageData(stepToRestore.imageData, 0, 0);

    setCanUndo(historyEngineRef.current.canUndo);
    setCanRedo(historyEngineRef.current.canRedo);
    renderComposite();
    bumpBufferVersion();
  }, [bumpBufferVersion, canvasWidth, canvasHeight, getOrCreateLayerCanvas, renderComposite, setCanRedo, setCanUndo]);

  // Bind Custom Event Listeners for Undo / Redo / Palette Extract / AI Operations
  useEffect(() => {
    const handleUndoEvent = () => performUndo();
    const handleRedoEvent = () => performRedo();

    const handleExtractPaletteEvent = () => {
      const mainCanvas = mainCanvasRef.current;
      if (!mainCanvas) return;
      const ctx = mainCanvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      const imgData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
      const data = imgData.data;
      const uniqueColors = new Set<string>();

      for (let i = 0; i < data.length; i += 4) {
        const a = data[i + 3];
        if (a > 30) {
          const hex = rgbaToHex(data[i], data[i + 1], data[i + 2], a);
          uniqueColors.add(hex);
        }
      }

      const colorsArr = Array.from(uniqueColors);
      if (colorsArr.length > 0) {
        addExtractedPalette(`Extracted (${colorsArr.length})`, colorsArr);
      }
    };

    // Composite all visible layers into a scratch canvas for use as AI pipeline input.
    // If an excludeTag is provided, we attempt to composite excluding that generated layer
    // to allow cleanly re-shading from the base artwork. However, if the user painted/bucket-filled
    // new pixels on the tagged layer (or if base layers have fewer pixels), we intelligently use
    // the full composite so user artwork NEVER disappears.
    const compositeSourceSnapshot = (excludeTag?: string): CanvasRenderingContext2D | null => {
      const state = useStudioStore.getState();
      const currentFrame = state.frames[state.activeFrameIndex];
      if (!currentFrame) return null;

      const scratch = document.createElement('canvas');
      scratch.width = canvasWidth;
      scratch.height = canvasHeight;
      const sCtx = scratch.getContext('2d', { willReadFrequently: true });
      if (!sCtx) return null;
      sCtx.imageSmoothingEnabled = false;

      // 1. Composite excluding the tag (base artwork)
      currentFrame.layers.slice().reverse().forEach((layer) => {
        if (!layer.visible) return;
        if (excludeTag && layer.tag === excludeTag) return;
        const lCanvas = getOrCreateLayerCanvas(layer.id);
        sCtx.globalAlpha = layer.opacity;
        sCtx.globalCompositeOperation = layer.blendMode;
        sCtx.drawImage(lCanvas, 0, 0);
      });

      // 2. Count opaque pixels in the non-tagged composite
      const nonTaggedData = sCtx.getImageData(0, 0, canvasWidth, canvasHeight).data;
      let nonTaggedPixels = 0;
      for (let i = 3; i < nonTaggedData.length; i += 4) {
        if (nonTaggedData[i] > 20) nonTaggedPixels++;
      }

      // 3. Composite ALL visible layers
      const fullScratch = document.createElement('canvas');
      fullScratch.width = canvasWidth;
      fullScratch.height = canvasHeight;
      const fullCtx = fullScratch.getContext('2d', { willReadFrequently: true });
      if (!fullCtx) return sCtx;
      fullCtx.imageSmoothingEnabled = false;

      currentFrame.layers.slice().reverse().forEach((layer) => {
        if (!layer.visible) return;
        const lCanvas = getOrCreateLayerCanvas(layer.id);
        fullCtx.globalAlpha = layer.opacity;
        fullCtx.globalCompositeOperation = layer.blendMode;
        fullCtx.drawImage(lCanvas, 0, 0);
      });

      const fullData = fullCtx.getImageData(0, 0, canvasWidth, canvasHeight).data;
      let fullPixels = 0;
      for (let i = 3; i < fullData.length; i += 4) {
        if (fullData[i] > 20) fullPixels++;
      }

      // If full composite has more pixels than the non-tagged composite (meaning the user
      // drew/filled new pixels on the active layer) or if non-tagged has 0 pixels, use full composite!
      if (fullPixels > nonTaggedPixels || nonTaggedPixels === 0) {
        return fullCtx;
      }

      sCtx.globalAlpha = 1.0;
      sCtx.globalCompositeOperation = 'source-over';
      return sCtx;
    };

    // Non-destructively update or create a tagged AI layer, capturing history in place.
    const updateTaggedLayer = (displayName: string, tag: string, drawFn: (ctx: CanvasRenderingContext2D) => void) => {
      const state = useStudioStore.getState();
      const currentFrame = state.frames[state.activeFrameIndex];
      if (!currentFrame) return;

      const previousActiveLayerId = state.activeLayerId;
      let targetLayerId: string;
      let isNewLayer = false;
      const existing = currentFrame.layers.find(l => l.tag === tag);
      
      if (existing) {
        targetLayerId = existing.id;
        if (existing.name !== displayName) {
          state.renameLayer(targetLayerId, displayName);
        }
      } else {
        isNewLayer = true;
        state.addLayer(displayName, tag);
        const freshState = useStudioStore.getState();
        const freshFrame = freshState.frames[freshState.activeFrameIndex];
        const newLayer = freshFrame?.layers[0]; // addLayer uses unshift -> index 0
        if (!newLayer) return;
        targetLayerId = newLayer.id;
      }

      // Crucially capture the layer's pristine state BEFORE writing AI output
      captureSnapshot(displayName, targetLayerId, isNewLayer ? targetLayerId : undefined);
      
      const lCanvas = getOrCreateLayerCanvas(targetLayerId);
      const lCtx = lCanvas.getContext('2d', { willReadFrequently: true });
      if (lCtx) {
        lCtx.imageSmoothingEnabled = false;
        lCtx.clearRect(0, 0, canvasWidth, canvasHeight);
        drawFn(lCtx);
      }
      
      commitSnapshot();
      renderComposite();
      bumpBufferVersion();

      // Maintain selection on the original artwork layer so sequential AI effects remain anchored to base art
      if (previousActiveLayerId && previousActiveLayerId !== targetLayerId) {
        useStudioStore.getState().setActiveLayer(previousActiveLayerId);
      }
    };

    const handleCleanJaggiesEvent = () => {
      captureSnapshot('AI Clean Jaggies');
      const currentLayerCanvas = getOrCreateLayerCanvas(activeLayerId);
      const ctx = currentLayerCanvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        cleanJaggiesOnCanvas(ctx, canvasWidth, canvasHeight);
        commitSnapshot();
        renderComposite();
        bumpBufferVersion();
      }
    };

    const handleAutoShadeEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      const lightAz = customEvent.detail?.lightAzimuth ?? tools.lightAzimuth;
      const lightEl = customEvent.detail?.lightElevation ?? tools.lightElevation;

      const srcCtx = compositeSourceSnapshot('auto-shade');
      if (!srcCtx) return;

      const { shadedPixels } = renderParametric2p5DLighting(srcCtx, canvasWidth, canvasHeight, {
        azimuthDeg: lightAz,
        elevationDeg: lightEl,
        shadowIntensity: 0.8,
        specularShininess: 16,
        rimLight: false,
        selOut: false,
      });

      updateTaggedLayer(`Auto Shade ${lightAz}°`, 'auto-shade', (outCtx) => {
        shadedPixels.forEach((p) => {
          outCtx.fillStyle = `rgba(${p.r}, ${p.g}, ${p.b}, ${p.a / 255})`;
          outCtx.fillRect(p.x, p.y, 1, 1);
        });
      });
    };

    const handleHighlightEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      const lightAz = customEvent.detail?.lightAzimuth ?? tools.lightAzimuth;
      const lightEl = customEvent.detail?.lightElevation ?? tools.lightElevation;

      const srcCtx = compositeSourceSnapshot('specular');
      if (!srcCtx) return;

      const { specularPixels } = renderParametric2p5DLighting(srcCtx, canvasWidth, canvasHeight, {
        azimuthDeg: lightAz,
        elevationDeg: lightEl,
        shadowIntensity: 0.8,
        specularShininess: 16,
        rimLight: false,
        selOut: false,
      });

      updateTaggedLayer(`Specular ${lightAz}°`, 'specular', (outCtx) => {
        specularPixels.forEach((p) => {
          outCtx.fillStyle = `rgba(${p.r}, ${p.g}, ${p.b}, ${p.a / 255})`;
          outCtx.fillRect(p.x, p.y, 1, 1);
        });
      });
    };

    const handleSelOutEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      const lightAz = customEvent.detail?.lightAzimuth ?? tools.lightAzimuth;

      const srcCtx = compositeSourceSnapshot('sel-out');
      if (!srcCtx) return;

      const { selOutPixels } = generateSelOutData(srcCtx, canvasWidth, canvasHeight, lightAz);

      updateTaggedLayer('Selective Outline', 'sel-out', (outCtx) => {
        selOutPixels.forEach((p) => {
          outCtx.fillStyle = `rgba(${p.r}, ${p.g}, ${p.b}, ${p.a / 255})`;
          outCtx.fillRect(p.x, p.y, 1, 1);
        });
      });
    };

    const handleInBetweenFrameEvent = () => {
      const state = useStudioStore.getState();
      const currentIdx = state.activeFrameIndex;
      const totalFrames = state.frames.length;

      const frameA = state.frames[currentIdx];
      if (!frameA) return;

      let nextIdx = (currentIdx + 1) % totalFrames;
      if (totalFrames === 1) {
        state.duplicateFrame(0);
        nextIdx = 1;
      }
      const frameB = state.frames[nextIdx];

      // Exclude ALL tagged layers (lighting, shadows, outlines) to morph the pure base artwork
      const getCleanCtx = (frame: typeof frameA) => {
        const scratch = document.createElement('canvas');
        scratch.width = canvasWidth;
        scratch.height = canvasHeight;
        const ctx = scratch.getContext('2d')!;
        ctx.imageSmoothingEnabled = false;
        frame.layers.slice().reverse().forEach((l) => {
          if (!l.visible || l.tag) return;
          const lCanvas = getOrCreateLayerCanvas(l.id);
          ctx.globalAlpha = l.opacity;
          ctx.globalCompositeOperation = l.blendMode;
          ctx.drawImage(lCanvas, 0, 0);
        });
        return ctx;
      };

      const ctxA = getCleanCtx(frameA);
      const ctxB = getCleanCtx(frameB);

      const morphedCanvas = morphInBetweenFrames(ctxA, ctxB, canvasWidth, canvasHeight, 0.5);

      state.duplicateFrame(currentIdx);
      const updatedState = useStudioStore.getState();
      const newFrame = updatedState.frames[updatedState.activeFrameIndex];

      if (newFrame) {
        const nonTaggedLayers = newFrame.layers.filter(l => !l.tag);
        // Base layer is the bottom-most layer
        const baseLayer = nonTaggedLayers[nonTaggedLayers.length - 1];
        
        if (baseLayer) {
          const targetBuf = getOrCreateBuffer(baseLayer.id, canvasWidth, canvasHeight);
          const tCtx = targetBuf.canvas.getContext('2d', { willReadFrequently: true });
          if (tCtx) {
            tCtx.clearRect(0, 0, canvasWidth, canvasHeight);
            tCtx.imageSmoothingEnabled = false;
            tCtx.drawImage(morphedCanvas, 0, 0);
          }
        }
        
        // Clear other non-tagged layers so they don't overlay the flat composite twice
        for (const l of nonTaggedLayers) {
          if (l.id !== baseLayer?.id) {
            const upperBuf = getOrCreateBuffer(l.id, canvasWidth, canvasHeight);
            upperBuf.canvas.getContext('2d')?.clearRect(0, 0, canvasWidth, canvasHeight);
          }
        }
      }

      renderComposite();
      bumpBufferVersion();

      // Automatically re-apply photometric or optical pipelines to the new morphed frame!
      if (frameA.layers.some(l => l.tag === 'photometric')) {
        studioEvents.emit('pixibun:photometric-lighting', {});
      }
      if (frameA.layers.some(l => l.tag === 'optical-output')) {
        studioEvents.emit('pixibun:volumetric-optics', {});
      }
      if (frameA.layers.some(l => l.tag === 'cast-shadow')) {
        studioEvents.emit('pixibun:render-cast-shadow', {});
      }
    };

    const handleAutoOutlineEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      const strokeColor = customEvent.detail?.color || '#2B2038';

      captureSnapshot('AI Auto Outline');
      const srcCtx = compositeSourceSnapshot();
      if (!srcCtx) return;

      const { strokePixels } = generateOuterStrokeData(srcCtx, canvasWidth, canvasHeight, strokeColor);

      const targetCanvas = getOrCreateLayerCanvas(activeLayerId);
      const tCtx = targetCanvas.getContext('2d');
      if (tCtx) {
        strokePixels.forEach((p) => {
          tCtx.fillStyle = `rgba(${p.r}, ${p.g}, ${p.b}, ${p.a / 255})`;
          tCtx.fillRect(p.x, p.y, 1, 1);
        });
        commitSnapshot();
        renderComposite();
        bumpBufferVersion();
      }
    };

    const handleGroundShadowEvent = () => {
      const srcCtx = compositeSourceSnapshot('ground-shadow');
      if (!srcCtx) return;

      const { shadowPixels } = generateGroundShadowData(srcCtx, canvasWidth, canvasHeight);

      updateTaggedLayer('Ground Shadow', 'ground-shadow', (outCtx) => {
        shadowPixels.forEach((p) => {
          outCtx.fillStyle = `rgba(${p.r}, ${p.g}, ${p.b}, ${p.a / 255})`;
          outCtx.fillRect(p.x, p.y, 1, 1);
        });
      });
    };

    const handleRotSpriteEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      const angle = customEvent.detail?.angle || 45;

      captureSnapshot(`RotSprite ${angle}°`);
      const targetCanvas = getOrCreateLayerCanvas(activeLayerId);
      const tCtx = targetCanvas.getContext('2d', { willReadFrequently: true });
      if (tCtx) {
        const rotated = rotateWithRotSprite(tCtx, canvasWidth, canvasHeight, angle);
        tCtx.clearRect(0, 0, canvasWidth, canvasHeight);
        tCtx.drawImage(rotated, 0, 0);
        commitSnapshot();
        renderComposite();
        bumpBufferVersion();
      }
    };

    const handleAtkinsonDitherEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      const paletteColors = customEvent.detail?.colors || [];

      captureSnapshot('Atkinson Dither');
      const targetCanvas = getOrCreateLayerCanvas(activeLayerId);
      const tCtx = targetCanvas.getContext('2d', { willReadFrequently: true });
      if (tCtx) {
        applyAtkinsonDither(tCtx, canvasWidth, canvasHeight, paletteColors);
        commitSnapshot();
        renderComposite();
        bumpBufferVersion();
      }
    };

    const handleRiemersmaDitherEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      const paletteColors = customEvent.detail?.colors || [];

      captureSnapshot('Riemersma Dither');
      const targetCanvas = getOrCreateLayerCanvas(activeLayerId);
      const tCtx = targetCanvas.getContext('2d', { willReadFrequently: true });
      if (tCtx) {
        applyRiemersmaDither(tCtx, canvasWidth, canvasHeight, paletteColors);
        commitSnapshot();
        renderComposite();
        bumpBufferVersion();
      }
    };

    const handleSkeletonThinningEvent = () => {
      captureSnapshot('1px Skeleton Thinning');
      const targetCanvas = getOrCreateLayerCanvas(activeLayerId);
      const tCtx = targetCanvas.getContext('2d', { willReadFrequently: true });
      if (tCtx) {
        applyZhangSuenThinning(tCtx, canvasWidth, canvasHeight);
        commitSnapshot();
        renderComposite();
        bumpBufferVersion();
      }
    };

    const handleColorGradeEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      const grade = customEvent.detail?.grade || 'sunset';

      captureSnapshot(`AI Color Grade (${grade})`);
      const targetCanvas = getOrCreateLayerCanvas(activeLayerId);
      const tCtx = targetCanvas.getContext('2d');
      if (tCtx) {
        applyAtmosphericColorGrade(tCtx, canvasWidth, canvasHeight, grade);
        commitSnapshot();
        renderComposite();
        bumpBufferVersion();
      }
    };

    const handleQuantizePaletteEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      const paletteColors = customEvent.detail?.colors || [];

      captureSnapshot('AI Snap to Palette');
      const targetCanvas = getOrCreateLayerCanvas(activeLayerId);
      const tCtx = targetCanvas.getContext('2d');
      if (tCtx) {
        quantizeToActivePalette(tCtx, canvasWidth, canvasHeight, paletteColors);
        commitSnapshot();
        renderComposite();
        bumpBufferVersion();
      }
    };

    const handleRemoveStraysEvent = () => {
      captureSnapshot('AI Remove Stray Pixels');
      const targetCanvas = getOrCreateLayerCanvas(activeLayerId);
      const tCtx = targetCanvas.getContext('2d');
      if (tCtx) {
        cleanStrayPixelsOnCanvas(tCtx, canvasWidth, canvasHeight);
        commitSnapshot();
        renderComposite();
        bumpBufferVersion();
      }
    };

    const handlePhotometricLightingEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      const detail = customEvent.detail || {};

      // Read composite of all visible layers EXCLUDING any previous photometric output
      const srcCtx = compositeSourceSnapshot('photometric');
      if (!srcCtx) return;

      const materialName = detail.material ?? tools.materialPreset;
      const shadedCanvas = executePhotometricPipeline(
        srcCtx,
        canvasWidth,
        canvasHeight,
        {
          lightAzimuth: detail.lightAzimuth ?? tools.lightAzimuth,
          lightElevation: detail.lightElevation ?? tools.lightElevation,
          lightRadius: detail.lightRadius ?? tools.lightRadius,
          lightBrightness: detail.lightBrightness ?? tools.lightBrightness ?? 1.15,
          lightColor: detail.lightColor ?? primaryColor,
          ambientIntensity: detail.ambientIntensity ?? 0.45,
          material: materialName,
          cavityStrength: detail.cavityStrength ?? tools.cavityStrength,
          ditherModulation: detail.ditherModulation ?? tools.ditherModulation,
          bayerSize: detail.bayerSize || '4x4',
        },
        detail.paletteColors || []
      );

      // Write output to a dedicated tagged layer non-destructively
      updateTaggedLayer(`Photometric ${materialName}`, 'photometric', (outCtx) => {
        outCtx.drawImage(shadedCanvas, 0, 0);
      });
    };

    const handleVolumetricOpticsEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      const detail = customEvent.detail || {};

      // Read composite of all visible layers EXCLUDING any previous optical output
      const srcCtx = compositeSourceSnapshot('optical-output');
      if (!srcCtx) return;

      const preset = detail.preset ?? tools.opticalPreset;
      const shadedCanvas = executeVolumetricOpticalPipeline(
        srcCtx,
        canvasWidth,
        canvasHeight,
        {
          preset,
          translucencyDepth: detail.translucencyDepth ?? tools.translucencyDepth,
          fresnelPower: detail.fresnelPower ?? tools.fresnelPower,
          anisoAngle: detail.anisoAngle ?? tools.anisoAngle,
          anisoFlow: detail.anisoFlow ?? tools.anisoFlow,
          celTones: detail.celTones ?? tools.opticalCelTones,
          lightAzimuth: detail.lightAzimuth ?? tools.lightAzimuth,
          lightElevation: detail.lightElevation ?? tools.lightElevation,
          lightColor: detail.lightColor ?? primaryColor,
          paletteColors: detail.paletteColors ?? [],
          ditherModulation: detail.ditherModulation ?? tools.ditherModulation,
        }
      );

      // Write output to a dedicated tagged layer non-destructively
      updateTaggedLayer(`Optics (${preset})`, 'optical-output', (outCtx) => {
        outCtx.drawImage(shadedCanvas, 0, 0);
      });
    };

    const handleBakeNormalMapEvent = () => {
      // Read composite of all visible layers excluding any previous normal map
      const srcCtx = compositeSourceSnapshot('normal-map');
      if (!srcCtx) return;

      const imgData = srcCtx.getImageData(0, 0, canvasWidth, canvasHeight);
      const data = imgData.data;
      const isOpaque = (x: number, y: number) => {
        if (x < 0 || x >= canvasWidth || y < 0 || y >= canvasHeight) return false;
        return data[(y * canvasWidth + x) * 4 + 3] > 30;
      };

      const isMcSkin = detectMinecraftSkin(isOpaque, canvasWidth, canvasHeight);
      const normalField = isMcSkin
        ? computeMinecraftSkinNormalField(canvasWidth, canvasHeight)
        : computeTangentNormalField(
            applyBilateralFilter(
              generateInflatedHeightmap(computeSeparableEDT(isOpaque, canvasWidth, canvasHeight), canvasWidth, canvasHeight, 0.5),
              canvasWidth,
              canvasHeight,
              1.5,
              2.0
            ),
            canvasWidth,
            canvasHeight,
            2.0
          );
      const normalCanvas = bakeNormalMapToCanvas(normalField, canvasWidth, canvasHeight, isOpaque);

      updateTaggedLayer('Normal Map', 'normal-map', (outCtx) => {
        outCtx.drawImage(normalCanvas, 0, 0);
      });
    };

    const handle47BlobEvent = () => {
      const srcCtx = compositeSourceSnapshot('blob-edges');
      if (!srcCtx) return;

      const { blobPixels } = generate47BlobEdgeData(srcCtx, canvasWidth, canvasHeight);

      updateTaggedLayer('47-Blob Contours', 'blob-edges', (outCtx) => {
        blobPixels.forEach((p) => {
          outCtx.fillStyle = `rgba(${p.r}, ${p.g}, ${p.b}, ${p.a / 255})`;
          outCtx.fillRect(p.x, p.y, 1, 1);
        });
      });
    };

    const handleRenderCastShadowEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      const detail = customEvent.detail || {};

      // Read composite of all visible layers EXCLUDING any previous cast shadow layer
      const srcCtx = compositeSourceSnapshot('cast-shadow');
      if (!srcCtx) return;

      const imgData = srcCtx.getImageData(0, 0, canvasWidth, canvasHeight);
      const data = imgData.data;

      // Binary mask of solid obstacles (alpha > 30)
      const isOpaque = (x: number, y: number) => {
        if (x < 0 || x >= canvasWidth || y < 0 || y >= canvasHeight) return false;
        return data[(y * canvasWidth + x) * 4 + 3] > 30;
      };

      // Compute exact O(N) Euclidean Distance Transform to obstacle boundaries
      const edt = computeSeparableEDT(isOpaque, canvasWidth, canvasHeight);

      // Execute 2D Raymarched Soft Shadows with Aaltonen geometric cone tracing
      const shadowImgData = executeRaymarchedCastShadowPipeline(
        edt,
        canvasWidth,
        canvasHeight,
        {
          lightX: detail.lightX ?? Math.round(canvasWidth / 2),
          lightY: detail.lightY ?? Math.round(canvasHeight / 4),
          lightRadius: detail.lightRadius ?? 16,
          shadowOpacity: detail.shadowOpacity ?? 0.6,
          shadowColor: detail.shadowColor ?? '#180B26',
          ditherMode: detail.ditherMode ?? '4x4',
        }
      );

      // Write output to a dedicated tagged layer non-destructively
      updateTaggedLayer('Cast Shadow', 'cast-shadow', (outCtx) => {
        outCtx.putImageData(shadowImgData, 0, 0);
      });
    };

    const handleClearHistoryEvent = () => {
      historyEngineRef.current.clear();
      setCanUndo(false);
      setCanRedo(false);
    };

    const unsubs = [
      studioEvents.on('pixibun:undo', handleUndoEvent),
      studioEvents.on('pixibun:redo', handleRedoEvent),
      studioEvents.on('pixibun:history-clear', handleClearHistoryEvent),
      studioEvents.on('pixibun:extract-palette', handleExtractPaletteEvent),
      studioEvents.on('pixibun:clean-jaggies', handleCleanJaggiesEvent),
      studioEvents.on('pixibun:auto-shade', (detail) => handleAutoShadeEvent({ detail } as CustomEvent)),
      studioEvents.on('pixibun:highlight', (detail) => handleHighlightEvent({ detail } as CustomEvent)),
      studioEvents.on('pixibun:sel-out', (detail) => handleSelOutEvent({ detail } as CustomEvent)),
      studioEvents.on('pixibun:auto-outline', (detail) => handleAutoOutlineEvent({ detail } as CustomEvent)),
      studioEvents.on('pixibun:ground-shadow', handleGroundShadowEvent),
      studioEvents.on('pixibun:render-cast-shadow', (detail) => handleRenderCastShadowEvent({ detail } as CustomEvent)),
      studioEvents.on('pixibun:apply-47-blob', handle47BlobEvent),
      studioEvents.on('pixibun:rot-sprite', (detail) => handleRotSpriteEvent({ detail } as CustomEvent)),
      studioEvents.on('pixibun:atkinson-dither', (detail) => handleAtkinsonDitherEvent({ detail } as CustomEvent)),
      studioEvents.on('pixibun:riemersma-dither', (detail) => handleRiemersmaDitherEvent({ detail } as CustomEvent)),
      studioEvents.on('pixibun:skeleton-thinning', handleSkeletonThinningEvent),
      studioEvents.on('pixibun:color-grade', (detail) => handleColorGradeEvent({ detail } as CustomEvent)),
      studioEvents.on('pixibun:quantize-palette', (detail) => handleQuantizePaletteEvent({ detail } as CustomEvent)),
      studioEvents.on('pixibun:remove-strays', handleRemoveStraysEvent),
      studioEvents.on('pixibun:photometric-lighting', (detail) => handlePhotometricLightingEvent({ detail } as CustomEvent)),
      studioEvents.on('pixibun:volumetric-optics', (detail) => handleVolumetricOpticsEvent({ detail } as CustomEvent)),
      studioEvents.on('pixibun:bake-normal-map', handleBakeNormalMapEvent),
      studioEvents.on('pixibun:in-between-frame', handleInBetweenFrameEvent),
    ];

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [
    activeLayerId,
    addExtractedPalette,
    addLayer,
    bumpBufferVersion,
    canvasHeight,
    canvasWidth,
    captureSnapshot,
    commitSnapshot,
    deleteLayer,
    getOrCreateLayerCanvas,
    performRedo,
    performUndo,
    primaryColor,
    renderComposite,
    setCanRedo,
    setCanUndo,
    tools.cavityStrength,
    tools.ditherModulation,
    tools.lightAzimuth,
    tools.lightElevation,
    tools.lightRadius,
    tools.lightBrightness,
    tools.materialPreset,
    tools.opticalPreset,
    tools.translucencyDepth,
    tools.fresnelPower,
    tools.anisoAngle,
    tools.anisoFlow,
    tools.opticalCelTones,
  ]);

  // Render Grid, Isometric Guides, Symmetry, and Marching Ants Selection Overlay
  const renderGridAndSelection = useCallback(() => {
    const gridCanvas = gridCanvasRef.current;
    if (!gridCanvas) return;
    const ctx = gridCanvas.getContext('2d');
    if (!ctx) return;

    const scale = zoom / 100;
    const width = canvasWidth * scale;
    const height = canvasHeight * scale;

    gridCanvas.width = width;
    gridCanvas.height = height;

    ctx.clearRect(0, 0, width, height);

    // 1. Pixel Grid Lines
    if (showGrid && scale >= 4) {
      ctx.strokeStyle = 'rgba(58, 46, 76, 0.16)';
      ctx.lineWidth = 1;

      for (let x = 0; x <= canvasWidth; x++) {
        ctx.beginPath();
        ctx.moveTo(x * scale, 0);
        ctx.lineTo(x * scale, height);
        ctx.stroke();
      }

      for (let y = 0; y <= canvasHeight; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * scale);
        ctx.lineTo(width, y * scale);
        ctx.stroke();
      }
    }

    // 2. Isometric 2:1 Guide Grid Lines
    if (showIsoGuides) {
      ctx.strokeStyle = 'rgba(240, 190, 124, 0.45)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);

      const isoStep = 16 * scale;
      const span = width + height * 2;
      for (let offset = -span; offset <= span * 2; offset += isoStep) {
        // Forward diagonals (2:1 slope: dx = 2*dy)
        ctx.beginPath();
        ctx.moveTo(offset, 0);
        ctx.lineTo(offset + height * 2, height);
        ctx.stroke();

        // Backward diagonals (-2:1 slope: dx = -2*dy)
        ctx.beginPath();
        ctx.moveTo(offset, 0);
        ctx.lineTo(offset - height * 2, height);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }

    // 3. Symmetry Line Indicators
    if (tools.symmetryHorizontal) {
      const midX = (canvasWidth / 2) * scale;
      ctx.strokeStyle = 'rgba(199, 146, 223, 0.85)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(midX, 0);
      ctx.lineTo(midX, height);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (tools.symmetryVertical) {
      const midY = (canvasHeight / 2) * scale;
      ctx.strokeStyle = 'rgba(199, 146, 223, 0.85)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, midY);
      ctx.lineTo(width, midY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 4. Selection Bounding Box & Marching Ants
    const activeBox = floatingSelection 
      ? { x: floatingSelection.x, y: floatingSelection.y, w: floatingSelection.w, h: floatingSelection.h }
      : selection;

    if (activeBox) {
      const sx = activeBox.x * scale;
      const sy = activeBox.y * scale;
      const sw = activeBox.w * scale;
      const sh = activeBox.h * scale;

      // Render irregular mask tint
      if (selectionMask) {
        ctx.fillStyle = 'rgba(100, 150, 255, 0.3)';
        for (let py = activeBox.y; py < activeBox.y + activeBox.h; py++) {
          for (let px = activeBox.x; px < activeBox.x + activeBox.w; px++) {
            if (py >= 0 && py < canvasHeight && px >= 0 && px < canvasWidth) {
              if (selectionMask[py * canvasWidth + px] === 1) {
                ctx.fillRect(px * scale, py * scale, scale, scale);
              }
            }
          }
        }
      }

      // Dark dashed border
      ctx.strokeStyle = '#3A2E4C';
      ctx.lineWidth = 2;
      ctx.strokeRect(sx, sy, sw, sh);

      // Light inner dashed border
      ctx.strokeStyle = '#C792DF';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(sx, sy, sw, sw > 0 && sh > 0 ? sh : 0);
      ctx.setLineDash([]);
    }
  }, [
    canvasHeight,
    canvasWidth,
    floatingSelection,
    selection,
    selectionMask,
    showGrid,
    showIsoGuides,
    tools.symmetryHorizontal,
    tools.symmetryVertical,
    zoom,
  ]);

  // Live Composite & Onion Skin Rendering whenever frames, active layer/frame, visibility, opacity, buffer or preview mode changes
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
  ]);

  // Grid, symmetry guides, and selection box rendering
  useEffect(() => {
    renderGridAndSelection();
  }, [renderGridAndSelection]);

  // Canvas Brush Ghost Bounding Cursor per DESIGN.md Section 8
  const renderBrushGhost = useCallback(
    (coords: Point | null) => {
      const canvas = cursorCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const scale = zoom / 100;
      const targetW = canvasWidth * scale;
      const targetH = canvasHeight * scale;

      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }

      ctx.clearRect(0, 0, targetW, targetH);

      const isBrushTool =
        tools.activeTool === 'pen' ||
        tools.activeTool === 'eraser' ||
        tools.activeTool === 'dither' ||
        tools.activeTool === 'line' ||
        tools.activeTool === 'curve' ||
        tools.activeTool === 'rectangle' ||
        tools.activeTool === 'ellipse';

      if (!coords || zoom < 400 || !isBrushTool) {
        return;
      }

      const brushSize = tools.brushSize;
      const offset = Math.floor(brushSize / 2);
      const bx = coords.x - offset;
      const by = coords.y - offset;

      const sx = Math.round(bx * scale);
      const sy = Math.round(by * scale);
      const sw = Math.round(brushSize * scale);
      const sh = Math.round(brushSize * scale);

      ctx.imageSmoothingEnabled = false;

      // Outer shadow stroke: 1px #140C1E at 50% opacity
      ctx.strokeStyle = 'rgba(20, 12, 30, 0.5)';
      ctx.lineWidth = 1;
      ctx.strokeRect(sx - 0.5, sy - 0.5, sw + 1, sh + 1);

      // Inner highlight stroke: 1px #F0BE7C at 60% opacity
      ctx.strokeStyle = 'rgba(240, 190, 124, 0.6)';
      ctx.lineWidth = 1;
      ctx.strokeRect(sx + 0.5, sy + 0.5, sw - 1, sh - 1);
    },
    [canvasHeight, canvasWidth, tools.activeTool, tools.brushSize, zoom]
  );

  // Convert client viewport coordinates to canvas integer pixel coordinates
  const clientToCanvasCoords = (clientX: number, clientY: number, clamp: boolean = false): Point | null => {
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
  };

  // Commit floating selection buffer back to active layer
  const commitFloatingSelection = useCallback(() => {
    if (!floatingSelection) return;

    if (!currentStrokeSnapshotRef.current) {
      captureSnapshot('Commit Selection');
    }
    const layerCanvas = getOrCreateLayerCanvas(activeLayerId);
    const ctx = layerCanvas.getContext('2d', { willReadFrequently: true });
    if (ctx) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(floatingSelection.canvas, floatingSelection.x, floatingSelection.y);
    }
    setFloatingSelection(null);
    setSelection(null);
    commitSnapshot();
    renderComposite();
    bumpBufferVersion();
  }, [activeLayerId, bumpBufferVersion, captureSnapshot, commitSnapshot, floatingSelection, getOrCreateLayerCanvas, renderComposite, setSelection]);

  // Lift selected pixels from layer canvas into floating buffer
  const liftSelectionToFloating = useCallback(() => {
    if (!selection || floatingSelection) return;

    captureSnapshot('Lift Selection');
    const layerCanvas = getOrCreateLayerCanvas(activeLayerId);
    const ctx = layerCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const { x, y, w, h } = selection;
    if (w <= 0 || h <= 0) return;

    const floatCanvas = document.createElement('canvas');
    floatCanvas.width = w;
    floatCanvas.height = h;
    const fCtx = floatCanvas.getContext('2d');
    if (fCtx) {
      fCtx.imageSmoothingEnabled = false;
      const imgData = ctx.getImageData(x, y, w, h);
      
      if (selectionMask) {
        for (let py = 0; py < h; py++) {
          for (let px = 0; px < w; px++) {
            const globalX = x + px;
            const globalY = y + py;
            if (globalX >= 0 && globalX < canvasWidth && globalY >= 0 && globalY < canvasHeight) {
              if (selectionMask[globalY * canvasWidth + globalX] === 0) {
                const idx = (py * w + px) * 4;
                imgData.data[idx + 3] = 0;
              }
            }
          }
        }
      }
      fCtx.putImageData(imgData, 0, 0);
      
      if (selectionMask) {
        const origImgData = ctx.getImageData(x, y, w, h);
        for (let py = 0; py < h; py++) {
          for (let px = 0; px < w; px++) {
            const globalX = x + px;
            const globalY = y + py;
            if (globalX >= 0 && globalX < canvasWidth && globalY >= 0 && globalY < canvasHeight) {
              if (selectionMask[globalY * canvasWidth + globalX] === 1) {
                const idx = (py * w + px) * 4;
                origImgData.data[idx + 3] = 0;
                origImgData.data[idx] = 0;
                origImgData.data[idx + 1] = 0;
                origImgData.data[idx + 2] = 0;
              }
            }
          }
        }
        ctx.putImageData(origImgData, x, y);
      } else {
        ctx.clearRect(x, y, w, h);
      }
    }

    setFloatingSelection({
      canvas: floatCanvas,
      x,
      y,
      w,
      h,
    });
    commitSnapshot();
    renderComposite();
    bumpBufferVersion();
  }, [activeLayerId, bumpBufferVersion, canvasHeight, canvasWidth, captureSnapshot, commitSnapshot, floatingSelection, getOrCreateLayerCanvas, renderComposite, selection, selectionMask]);

  // Clipboard Actions
  const handleCopy = useCallback(() => {
    if (!selection && !floatingSelection) return;

    const layerCanvas = getOrCreateLayerCanvas(activeLayerId);
    const box = floatingSelection || selection!;
    const copyCanvas = document.createElement('canvas');
    copyCanvas.width = box.w;
    copyCanvas.height = box.h;
    const cCtx = copyCanvas.getContext('2d');
    if (!cCtx) return;

    cCtx.imageSmoothingEnabled = false;
    if (floatingSelection) {
      cCtx.drawImage(floatingSelection.canvas, 0, 0);
    } else {
      cCtx.drawImage(layerCanvas, box.x, box.y, box.w, box.h, 0, 0, box.w, box.h);
    }

    clipboardRef.current = {
      canvas: copyCanvas,
      w: box.w,
      h: box.h,
    };
  }, [activeLayerId, floatingSelection, getOrCreateLayerCanvas, selection]);

  const handleCut = useCallback(() => {
    handleCopy();
    if (floatingSelection) {
      setFloatingSelection(null);
      setSelection(null);
      renderComposite();
      bumpBufferVersion();
    } else if (selection) {
      captureSnapshot('Cut Selection');
      const layerCanvas = getOrCreateLayerCanvas(activeLayerId);
      const ctx = layerCanvas.getContext('2d');
      ctx?.clearRect(selection.x, selection.y, selection.w, selection.h);
      setSelection(null);
      commitSnapshot();
      renderComposite();
      bumpBufferVersion();
    }
  }, [activeLayerId, bumpBufferVersion, captureSnapshot, commitSnapshot, floatingSelection, getOrCreateLayerCanvas, handleCopy, renderComposite, selection, setSelection]);

  const handlePaste = useCallback(() => {
    if (!clipboardRef.current) return;

    if (floatingSelection) {
      commitFloatingSelection();
    }

    const { canvas, w, h } = clipboardRef.current;
    const pasteCanvas = document.createElement('canvas');
    pasteCanvas.width = w;
    pasteCanvas.height = h;
    const pCtx = pasteCanvas.getContext('2d');
    pCtx?.drawImage(canvas, 0, 0);

    const px = Math.max(0, Math.floor((canvasWidth - w) / 2));
    const py = Math.max(0, Math.floor((canvasHeight - h) / 2));

    setFloatingSelection({
      canvas: pasteCanvas,
      x: px,
      y: py,
      w,
      h,
    });
    setSelection({ x: px, y: py, w, h });
    renderComposite();
  }, [canvasHeight, canvasWidth, commitFloatingSelection, floatingSelection, renderComposite, setSelection]);

  const handleDeleteSelection = useCallback(() => {
    if (floatingSelection) {
      setFloatingSelection(null);
      setSelection(null);
      renderComposite();
      bumpBufferVersion();
    } else if (selection) {
      captureSnapshot('Delete Selection');
      const layerCanvas = getOrCreateLayerCanvas(activeLayerId);
      const ctx = layerCanvas.getContext('2d');
      ctx?.clearRect(selection.x, selection.y, selection.w, selection.h);
      setSelection(null);
      commitSnapshot();
      renderComposite();
      bumpBufferVersion();
    }
  }, [activeLayerId, bumpBufferVersion, captureSnapshot, commitSnapshot, floatingSelection, getOrCreateLayerCanvas, renderComposite, selection, setSelection]);

  const handleFlipHorizontal = useCallback(() => {
    const active = floatingSelection;
    if (!active) {
      liftSelectionToFloating();
      return;
    }
    const flippedCanvas = document.createElement('canvas');
    flippedCanvas.width = active.w;
    flippedCanvas.height = active.h;
    const fCtx = flippedCanvas.getContext('2d');
    if (!fCtx) return;

    fCtx.imageSmoothingEnabled = false;
    fCtx.translate(active.w, 0);
    fCtx.scale(-1, 1);
    fCtx.drawImage(active.canvas, 0, 0);

    setFloatingSelection({
      ...active,
      canvas: flippedCanvas,
    });
    renderComposite();
  }, [floatingSelection, liftSelectionToFloating, renderComposite]);

  const handleFlipVertical = useCallback(() => {
    const active = floatingSelection;
    if (!active) {
      liftSelectionToFloating();
      return;
    }
    const flippedCanvas = document.createElement('canvas');
    flippedCanvas.width = active.w;
    flippedCanvas.height = active.h;
    const fCtx = flippedCanvas.getContext('2d');
    if (!fCtx) return;

    fCtx.imageSmoothingEnabled = false;
    fCtx.translate(0, active.h);
    fCtx.scale(1, -1);
    fCtx.drawImage(active.canvas, 0, 0);

    setFloatingSelection({
      ...active,
      canvas: flippedCanvas,
    });
    renderComposite();
  }, [floatingSelection, liftSelectionToFloating, renderComposite]);

  // Global Keyboard Shortcuts for Selection & History
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        handleCopy();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'x') {
        e.preventDefault();
        handleCut();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        handlePaste();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        commitFloatingSelection();
        setSelection(null);
      } else if (e.key === 'Escape') {
        commitFloatingSelection();
        setSelection(null);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selection || floatingSelection) {
          e.preventDefault();
          handleDeleteSelection();
        }
      } else if (e.key.toLowerCase() === 'h' && (selection || floatingSelection)) {
        e.preventDefault();
        handleFlipHorizontal();
      } else if (e.key.toLowerCase() === 'v' && (selection || floatingSelection) && !e.ctrlKey) {
        e.preventDefault();
        handleFlipVertical();
      } else if (((e.ctrlKey || e.metaKey) && e.key === "'") || (e.shiftKey && e.key.toLowerCase() === 'g')) {
        e.preventDefault();
        useStudioStore.getState().toggleGrid();
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        if (floatingSelection) {
          e.preventDefault();
          const step = e.shiftKey ? 5 : 1;
          const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
          const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
          setFloatingSelection({
            ...floatingSelection,
            x: floatingSelection.x + dx,
            y: floatingSelection.y + dy,
          });
        } else {
          e.preventDefault();
          const step = e.shiftKey ? 60 : 20;
          const dx = e.key === 'ArrowLeft' ? step : e.key === 'ArrowRight' ? -step : 0;
          const dy = e.key === 'ArrowUp' ? step : e.key === 'ArrowDown' ? -step : 0;
          const currentStore = useStudioStore.getState();
          currentStore.setPan(currentStore.panX + dx, currentStore.panY + dy);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    commitFloatingSelection,
    handleCopy,
    handleCut,
    handleDeleteSelection,
    handleFlipHorizontal,
    handleFlipVertical,
    handlePaste,
    selection,
    floatingSelection,
    setSelection,
  ]);

  useEffect(() => {
    return () => {
      if (rafBufferBumpRef.current !== null) {
        cancelAnimationFrame(rafBufferBumpRef.current);
      }
    };
  }, []);

  // Draw points on active layer
  const drawPointsOnActiveLayer = useCallback(
    (points: Point[], color: string, isErase: boolean = false) => {
      const currentFrame = frames[activeFrameIndex];
      const targetLayerId = activeLayerId || currentFrame?.layers[0]?.id;
      if (!targetLayerId) return;

      const layerCanvas = getOrCreateLayerCanvas(targetLayerId);
      const ctx = layerCanvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      ctx.imageSmoothingEnabled = false;

      let allPoints = points;
      if (tools.symmetryHorizontal || tools.symmetryVertical) {
        allPoints = applySymmetry(
          points,
          canvasWidth,
          canvasHeight,
          tools.symmetryHorizontal,
          tools.symmetryVertical
        );
      }

      if (isErase) {
        ctx.globalCompositeOperation = 'destination-out';
        allPoints.forEach((p) => {
          const offset = Math.floor(tools.brushSize / 2);
          ctx.fillRect(p.x - offset, p.y - offset, tools.brushSize, tools.brushSize);
        });
        ctx.globalCompositeOperation = 'source-over';
      } else {
        ctx.fillStyle = color;
        ctx.globalCompositeOperation = 'source-over';
        allPoints.forEach((p) => {
          const offset = Math.floor(tools.brushSize / 2);
          ctx.fillRect(p.x - offset, p.y - offset, tools.brushSize, tools.brushSize);
        });
      }

      renderComposite();

      // Throttle bumpBufferVersion via requestAnimationFrame so live preview and timeline stay responsive without event thrashing
      if (rafBufferBumpRef.current === null) {
        rafBufferBumpRef.current = requestAnimationFrame(() => {
          rafBufferBumpRef.current = null;
          useStudioStore.getState().bumpBufferVersion();
        });
      }
    },
    [
      activeFrameIndex,
      activeLayerId,
      canvasHeight,
      canvasWidth,
      frames,
      getOrCreateLayerCanvas,
      renderComposite,
      tools.brushSize,
      tools.symmetryHorizontal,
      tools.symmetryVertical,
    ]
  );

  // Mouse / Pointer Event Handlers
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

    // Global Selection Drag Handler
    if (tools.activeTool.startsWith('select-')) {
      const activeBox = floatingSelection || selection;
      if (
        activeBox &&
        coords.x >= activeBox.x &&
        coords.x < activeBox.x + activeBox.w &&
        coords.y >= activeBox.y &&
        coords.y < activeBox.y + activeBox.h
      ) {
        // If it has an irregular mask, we can optionally check if they clicked a solid pixel.
        // For now, dragging via bounding box is standard and easiest for users.
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
                  if (colorMatch(data[dataIdx], data[dataIdx+1], data[dataIdx+2], data[dataIdx+3])) {
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
              if (colorMatch(data[dataIdx], data[dataIdx+1], data[dataIdx+2], data[dataIdx+3])) {
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

    // Commit floating selection before starting other tools
    if (floatingSelection) {
      commitFloatingSelection();
    }

    // Prevent drawing on locked layers with visual feedback
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
        const currentFrame = frames[activeFrameIndex];
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
            pCtx.strokeStyle = selectionModifierRef.current === 'union' ? 'rgba(128, 255, 128, 0.85)' : 'rgba(255, 128, 128, 0.85)';
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
      // Dynamic overlay preview
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
              x: Math.round((strokeStart.x + coords.x) / 2 + (coords.y - strokeStart.y) * tools.curveTightness),
              y: Math.round((strokeStart.y + coords.y) / 2 - (coords.x - strokeStart.x) * tools.curveTightness),
            };
            previewPoints = getQuadraticBezierPoints(strokeStart, controlPoint, coords);
          } else if (tools.activeTool === 'rectangle') {
            previewPoints = getRectanglePoints(strokeStart.x, strokeStart.y, coords.x, coords.y, tools.shapeFilled);
          } else if (tools.activeTool === 'ellipse') {
            previewPoints = getEllipsePoints(strokeStart.x, strokeStart.y, coords.x, coords.y, tools.shapeFilled);
          }

          if (tools.symmetryHorizontal || tools.symmetryVertical) {
            previewPoints = applySymmetry(
              previewPoints,
              canvasWidth,
              canvasHeight,
              tools.symmetryHorizontal,
              tools.symmetryVertical
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
    if (rafBufferBumpRef.current !== null) {
      cancelAnimationFrame(rafBufferBumpRef.current);
      rafBufferBumpRef.current = null;
    }

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
            x: Math.round((strokeStart.x + endCoords.x) / 2 + (endCoords.y - strokeStart.y) * tools.curveTightness),
            y: Math.round((strokeStart.y + endCoords.y) / 2 - (endCoords.x - strokeStart.x) * tools.curveTightness),
          };
          shapePoints = getQuadraticBezierPoints(strokeStart, controlPoint, endCoords);
        } else if (tools.activeTool === 'rectangle') {
          shapePoints = getRectanglePoints(strokeStart.x, strokeStart.y, endCoords.x, endCoords.y, tools.shapeFilled);
        } else if (tools.activeTool === 'ellipse') {
          shapePoints = getEllipsePoints(strokeStart.x, strokeStart.y, endCoords.x, endCoords.y, tools.shapeFilled);
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

      if (tools.activeTool !== 'select-box' && tools.activeTool !== 'select-lasso' && tools.activeTool !== 'select-wand') {
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

  // Zoom with mouse wheel
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.25 : 0.8;
    setZoom(Math.max(100, Math.min(6400, Math.round(zoom * zoomFactor))));
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
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={(e) => {
        handlePointerUp(e);
        renderBrushGhost(null);
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onContextMenu={radialMenu.handleContextMenu}
      style={{ touchAction: 'none' }}
      className={`relative flex-1 h-full overflow-hidden bg-[var(--desk-bg)] transition-colors duration-300 flex items-center justify-center cursor-crosshair select-none ${
        isPanning ? 'cursor-grab active:cursor-grabbing' : ''
      }`}
    >
      {/* 1. Drag & Drop File Highlight Overlay */}
      {isDragOver && (
        <div className="absolute inset-4 z-40 border-4 border-dashed border-[#f0be7c] bg-[#201431]/90 rounded-[4px] flex flex-col items-center justify-center gap-2 pointer-events-none backdrop-blur-xs shadow-2xl">
          <span className="text-sm font-mono font-bold text-[#f0be7c] uppercase">
            Drop Sprite or .pixibun Project to Import
          </span>
        </div>
      )}

      {/* 2. Floating Live 1x/2x/4x Animation Preview Window */}
      <FloatingPreviewWindow />

      {/* 3. Main Drawing Stage (Paper pinned on the desk) */}
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
          transition: isPanning ? 'none' : 'transform 0.05s linear',
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

        {/* Display-only perceptual lens SVG filter definitions (§12/§13) */}
        <ViewportLensFilters />

        {/* Solid Canvas Background */}
        <div
          className="absolute inset-0 bg-[#ffffff] pointer-events-none"
          style={{ filter: cvdFilterCss }}
        />

        {/* Lightbox Stencil Tracing Canvas */}
        <canvas
          ref={stencilCanvasRef}
          data-testid="stencil-guide-canvas"
          width={canvasWidth}
          height={canvasHeight}
          className="absolute inset-0 w-full h-full pixelated pointer-events-none"
          style={{ filter: cvdFilterCss }}
        />

        {/* Onion Skin Underlay Canvas */}
        <canvas
          ref={onionCanvasRef}
          data-testid="onion-skin-canvas"
          width={canvasWidth}
          height={canvasHeight}
          className="absolute inset-0 w-full h-full pixelated pointer-events-none"
          style={{ filter: cvdFilterCss }}
        />

        {/* Main Composite Layer Canvas */}
        <canvas
          ref={mainCanvasRef}
          data-testid="main-composite-canvas"
          width={canvasWidth}
          height={canvasHeight}
          className="absolute inset-0 w-full h-full pixelated"
          style={{ filter: mainFilterCss }}
        />

        {/* Live Shape / Curve Preview Overlay Canvas */}
        <canvas
          ref={previewCanvasRef}
          width={canvasWidth}
          height={canvasHeight}
          className="absolute inset-0 w-full h-full pixelated pointer-events-none"
          style={{ filter: cvdFilterCss }}
        />

        {/* Pixel Grid, Isometric Guides & Selection Box Overlay */}
        <canvas
          ref={gridCanvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />

        {/* Canvas Brush Ghost Bounding Cursor */}
        <canvas
          ref={cursorCanvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />
      </div>

      {/* 4. Precision HUD Pill at Top Left */}
      <div className="absolute top-3 left-3 bg-[var(--desk-surface-raised)] border-2 border-[var(--desk-border)] px-3 py-1.5 rounded-[3px] text-xs font-mono text-[var(--text-heading)] pointer-events-none select-none flex items-center gap-2.5 shadow-md">
        <span className="font-bold text-[#f0be7c]">
          {cursorCoords ? `X: ${cursorCoords.x} Y: ${cursorCoords.y}` : 'X: -- Y: --'}
        </span>
        <span className="text-[#3a2e4c]">|</span>
        <span className="text-[#dcabdf] font-bold">
          {selection ? `Sel: ${selection.w}x${selection.h}` : `${canvasWidth}x${canvasHeight}`}
        </span>
        <span className="text-[#3a2e4c]">|</span>
        <div className="flex items-center gap-1.5">
          <span
            className="w-3 h-3 rounded-[1px] border border-[#140d1f]"
            style={{ backgroundColor: primaryColor }}
          />
          <span className="text-[11px] text-[#f0be7c] font-bold uppercase">{primaryColor}</span>
        </div>
      </div>

      {/* Locked Layer Feedback Toast */}
      {lockedWarning && (
        <div
          role="status"
          aria-live="polite"
          className="absolute top-12 left-3 bg-[#eb5a66] text-[#140d1f] border-2 border-[#8c202a] px-3 py-1 rounded-[2px] text-xs font-mono font-bold shadow-lg z-30 flex items-center gap-1.5 pointer-events-none animate-pulse"
        >
          <PixelIcon name="lock" size={12} className="text-[#140d1f]" />
          <span>Active layer is locked! Unlock it in the Layers panel to draw.</span>
        </div>
      )}

      {/* 5. Bottom Right Viewport Metrics Badge */}
      <div className="absolute bottom-3 right-3 bg-[var(--desk-surface-raised)] border-2 border-[var(--desk-border)] px-3 py-1.5 rounded-[3px] text-xs font-mono text-[var(--text-heading)] pointer-events-none select-none flex items-center gap-2.5 shadow-md">
        <span className="text-[#dcabdf] font-bold">{zoom}%</span>
        <span className="text-[#3a2e4c]">|</span>
        <span className="text-[var(--text-body)]">
          {frames[activeFrameIndex]?.layers.length || 1} Layers
        </span>
      </div>

      <RadialContextMenu
        isOpen={radialMenu.isOpen}
        position={radialMenu.position}
        onClose={radialMenu.closeMenu}
      />
    </main>
  );
};
