'use client';

import React from 'react';
import { useStudioStore } from '@/stores/studioStore';
import { Point, getBresenhamLine } from '@/lib/canvas/rasterMath';
import { ChiselStrokeSession } from '@/lib/art/normalSculptor';
import type { HistoryStep } from '@/types/canvas';

interface ChiselHandlerProps {
  canvasWidth: number;
  canvasHeight: number;
  chiselSessionRef: React.MutableRefObject<ChiselStrokeSession | null>;
  currentStrokeSnapshotRef: React.MutableRefObject<HistoryStep | null>;
  lastPoint: Point | null;
  setLastPoint: (pt: Point | null) => void;
  getOrCreateLayerCanvas: (layerId: string) => HTMLCanvasElement;
  renderComposite: () => void;
}

export function useChiselPointerHandler({
  canvasWidth,
  canvasHeight,
  chiselSessionRef,
  currentStrokeSnapshotRef,
  lastPoint,
  setLastPoint,
  getOrCreateLayerCanvas,
  renderComposite,
}: ChiselHandlerProps) {
  const tools = useStudioStore((s) => s.tools);
  const activeLayerId = useStudioStore((s) => s.activeLayerId);
  const frames = useStudioStore((s) => s.frames);
  const activeFrameIndex = useStudioStore((s) => s.activeFrameIndex);

  const onPointerDown = (_e: React.PointerEvent, coords: Point) => {
    const currentFrame = frames[activeFrameIndex];
    const targetLayerId = activeLayerId || currentFrame?.layers[0]?.id;

    if (tools.activeTool === 'normal-chisel') {
      if (targetLayerId) {
        chiselSessionRef.current = new ChiselStrokeSession(canvasWidth, canvasHeight);
        chiselSessionRef.current.stampChisel(coords.x, coords.y, {
          azimuth: tools.chiselAzimuth,
          incline: tools.chiselIncline,
          width: tools.chiselWidth,
          ridgeMode: tools.chiselRidgeMode,
          blendMode: tools.normalBlendMode,
        });
        const lCanvas = getOrCreateLayerCanvas(targetLayerId);
        const lCtx = lCanvas.getContext('2d', { willReadFrequently: true });
        if (lCtx && currentStrokeSnapshotRef.current && 'imageData' in currentStrokeSnapshotRef.current) {
          const workingImg = new ImageData(
            new Uint8ClampedArray(currentStrokeSnapshotRef.current.imageData.data),
            canvasWidth,
            canvasHeight
          );
          chiselSessionRef.current.compositeOnto(workingImg, tools.normalBlendMode);
          lCtx.putImageData(workingImg, 0, 0);
          renderComposite();
        }
      }
    }
  };

  const onPointerMove = (_e: React.PointerEvent, coords: Point) => {
    if (tools.activeTool === 'normal-chisel') {
      if (lastPoint && chiselSessionRef.current) {
        const dx = coords.x - lastPoint.x;
        const dy = coords.y - lastPoint.y;
        const linePoints = getBresenhamLine(lastPoint.x, lastPoint.y, coords.x, coords.y);
        for (const pt of linePoints) {
          chiselSessionRef.current.stampChisel(
            pt.x,
            pt.y,
            {
              azimuth: tools.chiselAzimuth,
              incline: tools.chiselIncline,
              width: tools.chiselWidth,
              ridgeMode: tools.chiselRidgeMode,
              blendMode: tools.normalBlendMode,
            },
            { dx, dy }
          );
        }
        const currentFrame = frames[activeFrameIndex];
        const targetLayerId = activeLayerId || currentFrame?.layers[0]?.id;
        if (targetLayerId && currentStrokeSnapshotRef.current && 'imageData' in currentStrokeSnapshotRef.current) {
          const lCanvas = getOrCreateLayerCanvas(targetLayerId);
          const lCtx = lCanvas.getContext('2d', { willReadFrequently: true });
          if (lCtx) {
            const workingImg = new ImageData(
              new Uint8ClampedArray(currentStrokeSnapshotRef.current.imageData.data),
              canvasWidth,
              canvasHeight
            );
            chiselSessionRef.current.compositeOnto(workingImg, tools.normalBlendMode);
            lCtx.putImageData(workingImg, 0, 0);
            renderComposite();
          }
        }
      }
      setLastPoint(coords);
    }
  };

  const onPointerUp = (_e: React.PointerEvent | undefined, _coords: Point | null) => {
    // Normal chisel handled in main hook via bumpBufferVersion & snapshot commit
  };

  return { onPointerDown, onPointerMove, onPointerUp };
}
