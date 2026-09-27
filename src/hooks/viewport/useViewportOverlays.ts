import { useRef, useCallback, useEffect, RefObject } from 'react';
import { Point } from '@/lib/canvas/rasterMath';
import { ToolType } from '@/types/tools';
import { CvdLensMode, CVD_FILTER_IDS, getViewportFilterCss } from '@/lib/color/cvdLens';
import { useStudioStore } from '@/stores/studioStore';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { TEMPLATE_PALETTE } from '@/lib/art/starterTemplates';
import { getTemplateRows, getTemplateGridSize } from '@/lib/art/playgroundLessons';
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
  cursorCanvasRef: RefObject<HTMLDivElement | null>;
  canvasWidth: number;
  canvasHeight: number;
  zoom: number;
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
  const isPlaying = useStudioStore((state) => state.isPlaying);

  useEffect(() => {
    const canvas = stencilCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    if (!showStencilGuide || !isPlaygroundActive) return;

    const currentStep = useOnboardingStore.getState().getCurrentStep();
    const currentLesson = useOnboardingStore.getState().getCurrentLesson();

    // Synchronize studio active frame if out of sync (only when paused in drawing steps)
    if (!isPlaying && currentStep.type === 'DRAW_FRAME') {
      if (currentStep.frameIndex !== undefined && activeFrameIndex !== currentStep.frameIndex) {
        useStudioStore.getState().setActiveFrame(currentStep.frameIndex);
      }
    }

    // Determine which template to render:
    // During active playback, render the template corresponding to activeFrameIndex so the animation animates on the canvas!
    // When paused, render current step's template or activeFrame's template.
    const template = isPlaying
      ? (currentLesson.frames[activeFrameIndex] || currentStep.template)
      : (currentStep.template ||
         useOnboardingStore.getState().getCurrentFrameTemplate() ||
         (currentStep.frameIndex !== undefined
           ? currentLesson.frames[currentStep.frameIndex]
           : null));
    if (!template) return;

    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = stencilOpacity;

    const rows = getTemplateRows(template);
    const gridSize = getTemplateGridSize(template);
    const cellW = canvasWidth / gridSize;
    const cellH = canvasHeight / gridSize;

    rows.forEach((row, y) => {
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
    isPlaying,
    canvasWidth,
    canvasHeight,
    stencilCanvasRef,
  ]);

  // Render the selection mask tint on a logical-size canvas.
  const renderGridAndSelection = useCallback(() => {
    const gridCanvas = gridCanvasRef.current;
    if (!gridCanvas) return;
    // Keep the backing store in artwork pixels. CSS stretches this layer with
    // the stage; zoom must never multiply a canvas allocation.
    const scale = 1;
    const width = canvasWidth;
    const height = canvasHeight;
    if (gridCanvas.width !== width) gridCanvas.width = width;
    if (gridCanvas.height !== height) gridCanvas.height = height;
    const ctx = gridCanvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    // Pixel-grid hairlines are a CSS pattern on the overlay element, so they
    // stay one screen pixel wide even when the logical canvas is enlarged.

    // 4. Selection Bounding Box & Marching Ants
    const activeBox = floatingSelection
      ? { x: floatingSelection.x, y: floatingSelection.y, w: floatingSelection.w, h: floatingSelection.h }
      : selection;

    if (activeBox && !floatingSelection) {
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

      // The selection gizmo draws its own screen-space marching-ants border.
      // Keeping only the mask tint here avoids a zoom-thick duplicate outline.
    }
  }, [
    canvasHeight,
    canvasWidth,
    floatingSelection,
    gridCanvasRef,
    selection,
    selectionMask,
  ]);

  // Brush footprint outline per DESIGN.md Section 8
  const renderBrushGhost = useCallback(
    (coords: Point | null) => {
      const ghost = cursorCanvasRef.current;
      if (!ghost) return;

      const isBrushTool =
        activeTool === 'pen' ||
        activeTool === 'eraser' ||
        activeTool === 'dither' ||
        activeTool === 'line' ||
        activeTool === 'curve' ||
        activeTool === 'rectangle' ||
        activeTool === 'ellipse';

      if (!coords || zoom < 400 || !isBrushTool) {
        ghost.style.display = 'none';
        return;
      }

      const scale = zoom / 100;
      const offset = Math.floor(brushSize / 2);
      const bx = coords.x - offset;
      const by = coords.y - offset;
      ghost.style.display = 'block';
      ghost.style.left = `${Math.round(bx * scale)}px`;
      ghost.style.top = `${Math.round(by * scale)}px`;
      ghost.style.width = `${Math.round(brushSize * scale)}px`;
      ghost.style.height = `${Math.round(brushSize * scale)}px`;
    },
    [activeTool, brushSize, cursorCanvasRef, zoom]
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
