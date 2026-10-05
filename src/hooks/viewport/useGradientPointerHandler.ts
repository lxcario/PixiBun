'use client';

import { useEffect, useRef } from 'react';
import { pixelGradient } from '@/lib/canvas/pixelGradient';
import { useStudioStore } from '@/stores/studioStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { touchBuffer } from '@/lib/engine/bufferRegistry';
import type { Point } from '@/lib/canvas/rasterMath';
import type { HistoryStep } from '@/types/canvas';
import { reserveMemory } from '@/lib/safety/memoryBudget';
import { studioEvents } from '@/lib/events/studioEvents';

export function useGradientPointerHandler({ canvasWidth, canvasHeight, strokeStart, previewCanvasRef, getOrCreateLayerCanvas, renderComposite, currentStrokeSnapshotRef }: {
  canvasWidth: number; canvasHeight: number; strokeStart: Point | null; previewCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  getOrCreateLayerCanvas: (id: string) => HTMLCanvasElement; renderComposite: () => void;
  currentStrokeSnapshotRef: React.MutableRefObject<HistoryStep | null>;
}) {
  const pending = useRef<Point | null>(null), raf = useRef<number | null>(null);
  useEffect(() => () => { if (raf.current !== null) cancelAnimationFrame(raf.current); }, []);
  const paint = (point: Point, commit: boolean) => {
    const state = useStudioStore.getState(), settings = useWorkspaceStore.getState().gradient;
    if (!strokeStart || state.tools.activeTool !== 'gradient' || (strokeStart.x === point.x && strokeStart.y === point.y)) return false;
    const colors = settings.ramp === 'palette' ? state.palettes.find(p => p.id === state.currentPaletteId)?.colors ?? [] : [state.primaryColor.slice(0, 7), state.secondaryColor.slice(0, 7)];
    if (colors.length < 2 || colors.some(color => !/^#[\da-f]{6}$/i.test(color))) return false;
    let release: (() => void) | undefined;
    try {
      release = reserveMemory(canvasWidth * canvasHeight * 8, 'Gradient preview');
      const bytes = pixelGradient(canvasWidth, canvasHeight, strokeStart, point, { shape: settings.shape, dither: settings.dither, colors, selection: state.selection, mask: state.selectionMask });
      const ctx = previewCanvasRef.current?.getContext('2d'); if (!ctx) return false;
      ctx.putImageData(new ImageData(bytes as Uint8ClampedArray<ArrayBuffer>, canvasWidth, canvasHeight), 0, 0);
      if (!commit) return true;
      let targetLayerId = state.activeLayerId;
      if (settings.newLayer) {
        state.addLayer('Dither Gradient');
        const nextState = useStudioStore.getState();
        targetLayerId = nextState.activeLayerId;
      }
      const activeFrame = useStudioStore.getState().frames[useStudioStore.getState().activeFrameIndex];
      const layer = activeFrame?.layers.find(l => l.id === targetLayerId);
      if (!layer || layer.locked) return false;
      const snapshot = currentStrokeSnapshotRef.current;
      const original = snapshot && snapshot.type !== 'structural' ? snapshot.imageData.data : null;
      let changed = false;
      for (let i = 0; i < bytes.length; i += 4) if (bytes[i + 3] && (!original || bytes[i] !== original[i] || bytes[i + 1] !== original[i + 1] || bytes[i + 2] !== original[i + 2] || bytes[i + 3] !== original[i + 3])) { changed = true; break; }
      if (!changed && !settings.newLayer) return false;
      const target = getOrCreateLayerCanvas(layer.id).getContext('2d');
      if (target && previewCanvasRef.current) { target.drawImage(previewCanvasRef.current, 0, 0); touchBuffer(layer.id); renderComposite(); return true; }
      return false;
    } catch (error) {
      studioEvents.emit('pixibun:toast', { type: 'error', message: error instanceof Error ? error.message : 'The gradient could not be drawn. Try a smaller canvas.' });
      return false;
    } finally { release?.(); }
  };
  const cancel = () => { if (raf.current !== null) cancelAnimationFrame(raf.current); raf.current = null; pending.current = null; };
  return {
    onPointerMove: (point: Point) => {
      pending.current = point;
      if (raf.current === null) raf.current = requestAnimationFrame(() => { raf.current = null; const next = pending.current; pending.current = null; if (next) paint(next, false); });
    },
    onPointerUp: (point: Point | null) => { cancel(); return point ? paint(point, true) : false; }, cancel,
  };
}
