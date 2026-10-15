'use client';

import React, { useRef } from 'react';
import { useStudioStore } from '@/stores/studioStore';
import { Point, getBresenhamLine, getUndirectedLine, filterPixelPerfect } from '@/lib/canvas/rasterMath';
import { shouldDitherPixel } from '@/lib/canvas/ditherMatrix';

interface BrushHandlerProps {
  drawPointsOnActiveLayer: (points: Point[], color: string, isErase: boolean) => void;
  lastPoint: Point | null;
  setLastPoint: (pt: Point | null) => void;
  drawProvisionalPoint?: (point: Point, color: string, isErase: boolean) => (() => void) | undefined;
  finishBrushBatch?: () => void;
  /** Whether this event paints with the secondary color (keymap-dependent; defaults to Shift). */
  usesSecondary?: (e: { shiftKey: boolean } | undefined) => boolean;
}

export function useBrushPointerHandler({
  drawPointsOnActiveLayer,
  lastPoint,
  setLastPoint,
  drawProvisionalPoint,
  finishBrushBatch,
  usesSecondary = e => !!e?.shiftKey,
}: BrushHandlerProps) {
  const tools = useStudioStore((s) => s.tools);
  const primaryColor = useStudioStore((s) => s.primaryColor);
  const secondaryColor = useStudioStore((s) => s.secondaryColor);
  const strokeRef = useRef<{ last: Point; previous: Point; pending: Point | null; rollback?: () => void } | null>(null);

  /** `lineFrom`: Shift-click in the standard keymap draws a straight line from the previous stroke's end. */
  const onPointerDown = (e: React.PointerEvent, coords: Point, lineFrom?: Point) => {
    const isErase = tools.activeTool === 'eraser';
    const drawColor = usesSecondary(e) ? secondaryColor : primaryColor;
    strokeRef.current = { last: coords, previous: coords, pending: null };
    const points = lineFrom ? getUndirectedLine(lineFrom.x, lineFrom.y, coords.x, coords.y) : [coords];

    if (tools.activeTool === 'pen' || tools.activeTool === 'eraser') {
      drawPointsOnActiveLayer(points, drawColor, isErase);
    } else if (tools.activeTool === 'dither') {
      const stamps = points.filter(point => shouldDitherPixel(point.x, point.y, tools.ditherMatrix, tools.ditherDensity));
      if (stamps.length) drawPointsOnActiveLayer(stamps, drawColor, false);
    }
  };

  const onPointerMove = (e: React.PointerEvent, coords: Point) => {
    const isErase = tools.activeTool === 'eraser';
    const drawColor = usesSecondary(e) ? secondaryColor : primaryColor;

    if (tools.activeTool === 'pen' || tools.activeTool === 'eraser') {
      const stroke = strokeRef.current;
      const start = stroke?.last ?? lastPoint;
      if (start) {
        const linePoints = getBresenhamLine(start.x, start.y, coords.x, coords.y).slice(1);
        if (tools.pixelPerfect && stroke && drawProvisionalPoint) {
          for (const point of linePoints) {
            if (stroke.pending) {
              const cleaned = filterPixelPerfect([stroke.previous, stroke.pending, point]);
              if (cleaned.length === 2) stroke.rollback?.();
              else stroke.previous = stroke.pending;
            }
            stroke.pending = point;
            stroke.rollback = drawProvisionalPoint(point, drawColor, isErase);
          }
          if (linePoints.length) finishBrushBatch?.();
        } else if (linePoints.length) {
          drawPointsOnActiveLayer(linePoints, drawColor, isErase);
        }
      }
      if (stroke) stroke.last = coords;
      setLastPoint(coords);
    } else if (tools.activeTool === 'dither') {
      const start = strokeRef.current?.last ?? lastPoint;
      const points = start ? getBresenhamLine(start.x, start.y, coords.x, coords.y).slice(1) : [coords];
      const stamps = points.filter(point => shouldDitherPixel(point.x, point.y, tools.ditherMatrix, tools.ditherDensity));
      if (stamps.length) drawPointsOnActiveLayer(stamps, drawColor, false);
      if (strokeRef.current) strokeRef.current.last = coords;
      setLastPoint(coords);
    }
  };

  const onPointerUp = (e: React.PointerEvent | undefined, coords: Point | null) => {
    if (strokeRef.current && coords && e && e.type !== 'pointercancel' && ['pen', 'eraser', 'dither'].includes(tools.activeTool)) {
      onPointerMove(e, coords);
    }
    strokeRef.current = null;
  };

  return { onPointerDown, onPointerMove, onPointerUp };
}
