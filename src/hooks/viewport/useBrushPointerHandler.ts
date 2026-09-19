'use client';

import React from 'react';
import { useStudioStore } from '@/stores/studioStore';
import { Point, getBresenhamLine, filterPixelPerfect } from '@/lib/canvas/rasterMath';
import { shouldDitherPixel } from '@/lib/canvas/ditherMatrix';

interface BrushHandlerProps {
  drawPointsOnActiveLayer: (points: Point[], color: string, isErase: boolean) => void;
  lastPoint: Point | null;
  setLastPoint: (pt: Point | null) => void;
}

export function useBrushPointerHandler({
  drawPointsOnActiveLayer,
  lastPoint,
  setLastPoint,
}: BrushHandlerProps) {
  const tools = useStudioStore((s) => s.tools);
  const primaryColor = useStudioStore((s) => s.primaryColor);
  const secondaryColor = useStudioStore((s) => s.secondaryColor);

  const onPointerDown = (e: React.PointerEvent, coords: Point) => {
    const isErase = tools.activeTool === 'eraser';
    const drawColor = e.shiftKey ? secondaryColor : primaryColor;

    if (tools.activeTool === 'pen' || tools.activeTool === 'eraser') {
      drawPointsOnActiveLayer([coords], drawColor, isErase);
    } else if (tools.activeTool === 'dither') {
      if (shouldDitherPixel(coords.x, coords.y, tools.ditherMatrix, tools.ditherDensity)) {
        drawPointsOnActiveLayer([coords], drawColor, false);
      }
    }
  };

  const onPointerMove = (e: React.PointerEvent, coords: Point) => {
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
    }
  };

  const onPointerUp = (_e: React.PointerEvent | undefined, _coords: Point | null) => {
    // Brush tools don't need explicit up logic besides what main hook does (commit snapshot)
  };

  return { onPointerDown, onPointerMove, onPointerUp };
}
