'use client';

import React from 'react';
import { useStudioStore } from '@/stores/studioStore';
import {
  Point,
  getClippedLine,
  getRectanglePoints,
  getEllipsePoints,
  applySymmetry,
  getIsometric2p1Line,
} from '@/lib/canvas/rasterMath';

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

          let previewPoints: Point[] = [];
          if (tools.activeTool === 'line') {
            previewPoints = getClippedLine(strokeStart.x, strokeStart.y, coords.x, coords.y, canvasWidth, canvasHeight);
          } else if (tools.activeTool === 'isometric-line') {
            previewPoints = tools.isoAngleSnap
              ? getIsometric2p1Line(strokeStart.x, strokeStart.y, coords.x, coords.y)
              : getClippedLine(strokeStart.x, strokeStart.y, coords.x, coords.y, canvasWidth, canvasHeight);
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

  const onPointerUp = (e: React.PointerEvent | undefined, endCoords: Point | null) => {
    if (
      (tools.activeTool === 'line' ||
        tools.activeTool === 'isometric-line' ||
        tools.activeTool === 'rectangle' ||
        tools.activeTool === 'ellipse') &&
      strokeStart &&
      endCoords
    ) {
      let shapePoints: Point[] = [];
      if (tools.activeTool === 'line') {
        shapePoints = getClippedLine(strokeStart.x, strokeStart.y, endCoords.x, endCoords.y, canvasWidth, canvasHeight);
      } else if (tools.activeTool === 'isometric-line') {
        shapePoints = tools.isoAngleSnap
          ? getIsometric2p1Line(strokeStart.x, strokeStart.y, endCoords.x, endCoords.y)
          : getClippedLine(strokeStart.x, strokeStart.y, endCoords.x, endCoords.y, canvasWidth, canvasHeight);
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

      const drawColor = usesSecondary(e) ? secondaryColor : primaryColor;
      drawPointsOnActiveLayer(shapePoints, drawColor, false);
    }
  };

  return { onPointerDown, onPointerMove, onPointerUp };
}
