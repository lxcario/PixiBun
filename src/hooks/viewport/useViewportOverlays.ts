import { useRef, useCallback, useEffect, RefObject } from 'react';
import { Point } from '@/lib/canvas/rasterMath';
import { ToolType } from '@/types/tools';
import { CvdLensMode, CVD_FILTER_IDS, getViewportFilterCss } from '@/lib/color/cvdLens';
import { useStudioStore } from '@/stores/studioStore';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { TEMPLATE_PALETTE } from '@/lib/art/starterTemplates';
import { compositeFrame } from '@/lib/render/compositor';
import { getOnionSkinSpecs } from '@/lib/render/onionSkin';

export interface FloatingSelection {
  canvas: HTMLCanvasElement;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface UseViewportOverlaysProps {
  gridCanvasRef: RefObject<HTMLCanvasElement | null>;
  onionCanvasRef: RefObject<HTMLCanvasElement | null>;
  stencilCanvasRef: RefObject<HTMLCanvasElement | null>;
  cursorCanvasRef: RefObject<HTMLCanvasElement | null>;
  canvasWidth: number;
  canvasHeight: number;
  zoom: number;
  showGrid: boolean;
  showIsoGuides: boolean;
  symmetryHorizontal: boolean;
  symmetryVertical: boolean;
  selection: { x: number; y: number; w: number; h: number } | null;
  selectionMask: Uint8Array | null;
  floatingSelection: FloatingSelection | null;
  cvdLens: CvdLensMode;
  squintMode: boolean;
  activeTool: ToolType;
  brushSize: number;
}

export function useViewportOverlays({
  gridCanvasRef,
  onionCanvasRef,
  stencilCanvasRef,
  cursorCanvasRef,
  canvasWidth,
  canvasHeight,
  zoom,
  showGrid,
  showIsoGuides,
  symmetryHorizontal,
  symmetryVertical,
  selection,
  selectionMask,
  floatingSelection,
  cvdLens,
  squintMode,
  activeTool,
  brushSize,
}: UseViewportOverlaysProps) {
  const onionGhostCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Matrix-only lens: safe for translucent stacked surfaces (preserves alpha)
  const cvdFilterCss = cvdLens !== 'none' ? `url(#${CVD_FILTER_IDS[cvdLens]})` : undefined;
  // Main composite surface: squint (white flood + ink) supersedes the CVD matrix
  const mainFilterCss = getViewportFilterCss(cvdLens, squintMode);

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
  }, [canvasHeight, canvasWidth, onionCanvasRef]);

  // Render on-canvas interactive lightbox tracing stencil (strictly in playground mode)
  const isPlaygroundActive = useOnboardingStore((state) => state.isPlaygroundActive);
  const showStencilGuide = useOnboardingStore((state) => state.showStencilGuide);
  const stencilOpacity = useOnboardingStore((state) => state.stencilOpacity);
  const currentStepIndex = useOnboardingStore((state) => state.currentStepIndex);
  const activeLessonId = useOnboardingStore((state) => state.activeLessonId);
  const activeFrameIndex = useStudioStore((state) => state.activeFrameIndex);

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
  }, [
    showStencilGuide,
    isPlaygroundActive,
    stencilOpacity,
    currentStepIndex,
    activeLessonId,
    activeFrameIndex,
    canvasWidth,
    canvasHeight,
    stencilCanvasRef,
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
    if (symmetryHorizontal) {
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

    if (symmetryVertical) {
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
    gridCanvasRef,
    selection,
    selectionMask,
    showGrid,
    showIsoGuides,
    symmetryHorizontal,
    symmetryVertical,
    zoom,
  ]);

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
        activeTool === 'pen' ||
        activeTool === 'eraser' ||
        activeTool === 'dither' ||
        activeTool === 'line' ||
        activeTool === 'curve' ||
        activeTool === 'rectangle' ||
        activeTool === 'ellipse';

      if (!coords || zoom < 400 || !isBrushTool) {
        return;
      }

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
    [activeTool, brushSize, canvasHeight, canvasWidth, cursorCanvasRef, zoom]
  );

  useEffect(() => {
    renderGridAndSelection();
  }, [renderGridAndSelection]);

  return {
    onionGhostCanvasRef,
    cvdFilterCss,
    mainFilterCss,
    renderOnionSkin,
    renderGridAndSelection,
    renderBrushGhost,
  };
}
