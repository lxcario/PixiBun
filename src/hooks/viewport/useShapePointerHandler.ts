'use client';

import React from 'react';
import { useStudioStore } from '@/stores/studioStore';
import {
  Point,
  getUndirectedLine,
  getRectanglePoints,
  getEllipsePoints,
  applySymmetry,
  getIsometric2p1Line,
} from '@/lib/canvas/rasterMath';
import { fillRectMasked, resolveSelectionMask } from '@/lib/canvas/selectionMask';

interface ShapeHandlerProps {
  canvasWidth: number;
  canvasHeight: number;
  strokeStart: Point | null;
  previewCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  drawPointsOnActiveLayer: (points: Point[], color: string, isErase: boolean) => void;
  /** Whether this event draws with the secondary color (keymap-dependent; defaults to Shift). */
  usesSecondary?: (e: { shiftKey: boolean } | undefined) => boolean;
}

export function useShapePointerHandler({
  canvasWidth,
  canvasHeight,
  strokeStart,
  previewCanvasRef,
  drawPointsOnActiveLayer,
  usesSecondary = e => !!e?.shiftKey,
}: ShapeHandlerProps) {
  const tools = useStudioStore((s) => s.tools);
  const primaryColor = useStudioStore((s) => s.primaryColor);
  const secondaryColor = useStudioStore((s) => s.secondaryColor);

  // Preview and commit share the same geometry; symmetry and masking are applied
  // when stamping, just as they are for the active drawing layer.
  const rasterize = (end: Point): Point[] => {
    if (!strokeStart) return [];
    switch (tools.activeTool) {
      case 'line': return getUndirectedLine(strokeStart.x, strokeStart.y, end.x, end.y, canvasWidth, canvasHeight);
      case 'isometric-line': return tools.isoAngleSnap
        ? getIsometric2p1Line(strokeStart.x, strokeStart.y, end.x, end.y)
        : getUndirectedLine(strokeStart.x, strokeStart.y, end.x, end.y, canvasWidth, canvasHeight);
      case 'rectangle': return getRectanglePoints(strokeStart.x, strokeStart.y, end.x, end.y, tools.shapeFilled);
      case 'ellipse': return getEllipsePoints(strokeStart.x, strokeStart.y, end.x, end.y, tools.shapeFilled);
      default: return [];
    }
  };

  const onPointerDown = (_e: React.PointerEvent, _coords: Point) => {
    // Shapes only set strokeStart, which is handled in main hook
  };

  const onPointerMove = (e: React.PointerEvent, coords: Point) => {
    const drawColor = usesSecondary(e) ? secondaryColor : primaryColor;

    if (
      (tools.activeTool === 'line' ||
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

          const state = useStudioStore.getState();
          const layer = state.frames[state.activeFrameIndex]?.layers.find(item => item.id === state.activeLayerId);
          if (!layer || layer.locked) return;
          const mask = resolveSelectionMask(state.selection, state.selectionMask, canvasWidth, canvasHeight);
          let previewPoints = rasterize(coords);

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
            fillRectMasked(pCtx, p.x - offset, p.y - offset, tools.brushSize, tools.brushSize, mask, canvasWidth, canvasHeight);
          });
        }
      }
    }
  };

  const onPointerUp = (e: React.PointerEvent | undefined, endCoords: Point | null) => {
    if (
      (tools.activeTool === 'line' ||
        tools.activeTool === 'isometric-line' ||
        tools.activeTool === 'rectangle' ||
        tools.activeTool === 'ellipse') &&
      strokeStart &&
      endCoords
    ) {
      const shapePoints = rasterize(endCoords);

      const drawColor = usesSecondary(e) ? secondaryColor : primaryColor;
      drawPointsOnActiveLayer(shapePoints, drawColor, false);
    }
  };

  return { onPointerDown, onPointerMove, onPointerUp };
}
