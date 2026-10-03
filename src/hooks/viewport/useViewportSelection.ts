import { useState, useRef, useCallback, useEffect, type RefObject } from 'react';
import { Point } from '@/lib/canvas/rasterMath';
import { createBoxMask, mergeSelectionMask } from '@/lib/canvas/selectionUtils';
import { useStudioStore } from '@/stores/studioStore';
import { SafeCanvas } from '@/lib/safety/safeCanvas';
import { FloatingSelection } from './useViewportOverlays';
import { isWorkspaceControlTarget, shouldIgnoreWorkspaceKey, workspaceShortcutKey } from '@/lib/input/workspaceKeyboard';

interface UseViewportSelectionProps {
  canvasWidth: number;
  canvasHeight: number;
  activeLayerId: string;
  previewCanvasRef: RefObject<HTMLCanvasElement | null>;
  getOrCreateLayerCanvas: (layerId: string) => HTMLCanvasElement;
  renderComposite: () => void;
  captureSnapshot: (description: string) => void;
  commitSnapshot: () => void;
  ownsTransformShortcuts?: boolean;
}

export function useViewportSelection({
  canvasWidth,
  canvasHeight,
  activeLayerId,
  previewCanvasRef,
  getOrCreateLayerCanvas,
  renderComposite,
  captureSnapshot,
  commitSnapshot,
  ownsTransformShortcuts = true,
}: UseViewportSelectionProps) {
  const selection = useStudioStore((s) => s.selection);
  const selectionMask = useStudioStore((s) => s.selectionMask);
  const setSelection = useStudioStore((s) => s.setSelection);
  const bumpBufferVersion = useStudioStore((s) => s.bumpBufferVersion);

  const [floatingSelection, setFloatingSelection] = useState<FloatingSelection | null>(null);
  const clipboardRef = useRef<{ canvas: HTMLCanvasElement; w: number; h: number } | null>(null);
  const [isDraggingSelection, setIsDraggingSelection] = useState(false);
  const [dragOffset, setDragOffset] = useState<Point>({ x: 0, y: 0 });
  const [lassoPoints, setLassoPoints] = useState<Point[]>([]);

  const selectionModifierRef = useRef<'replace' | 'union' | 'subtract'>('replace');
  const baseSelectionMaskRef = useRef<Uint8Array | null>(null);

  const clearPreview = useCallback(() => {
    const canvas = previewCanvasRef.current;
    canvas?.getContext('2d')?.clearRect(0, 0, canvasWidth, canvasHeight);
  }, [canvasHeight, canvasWidth, previewCanvasRef]);

  const clearSelectedPixels = useCallback(() => {
    if (!selection || selection.w <= 0 || selection.h <= 0) return;
    const ctx = getOrCreateLayerCanvas(activeLayerId).getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    if (!selectionMask) {
      ctx.clearRect(selection.x, selection.y, selection.w, selection.h);
      return;
    }
    for (let y = 0; y < selection.h; y++) {
      const rowOffset = (selection.y + y) * canvasWidth + selection.x;
      let x = 0;
      while (x < selection.w) {
        if (selectionMask[rowOffset + x] !== 1) {
          x++;
          continue;
        }
        const start = x;
        while (x < selection.w && selectionMask[rowOffset + x] === 1) x++;
        ctx.clearRect(selection.x + start, selection.y + y, x - start, 1);
      }
    }
  }, [activeLayerId, canvasWidth, getOrCreateLayerCanvas, selection, selectionMask]);

  // Lift selected pixels from active layer into floating selection
  const liftSelectionToFloating = useCallback(() => {
    if (!selection) return;

    captureSnapshot('Lift Selection');

    const layerCanvas = getOrCreateLayerCanvas(activeLayerId);
    const ctx = layerCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const floatCanvas = document.createElement('canvas');
    floatCanvas.width = selection.w;
    floatCanvas.height = selection.h;
    const fCtx = floatCanvas.getContext('2d', { willReadFrequently: true });
    if (!fCtx) return;

    if (selectionMask) {
      const srcData = SafeCanvas.getImageData(ctx, selection.x, selection.y, selection.w, selection.h);
      const floatData = SafeCanvas.createImageData(fCtx, selection.w, selection.h);

      for (let dy = 0; dy < selection.h; dy++) {
        for (let dx = 0; dx < selection.w; dx++) {
          const globalX = selection.x + dx;
          const globalY = selection.y + dy;
          const maskIdx = globalY * canvasWidth + globalX;
          const pixelIdx = (dy * selection.w + dx) * 4;

          if (selectionMask[maskIdx] === 1) {
            floatData.data[pixelIdx] = srcData.data[pixelIdx];
            floatData.data[pixelIdx + 1] = srcData.data[pixelIdx + 1];
            floatData.data[pixelIdx + 2] = srcData.data[pixelIdx + 2];
            floatData.data[pixelIdx + 3] = srcData.data[pixelIdx + 3];

            // Clear from source layer
            srcData.data[pixelIdx + 3] = 0;
          }
        }
      }

      fCtx.putImageData(floatData, 0, 0);
      ctx.putImageData(srcData, selection.x, selection.y);
    } else {
      fCtx.drawImage(
        layerCanvas,
        selection.x,
        selection.y,
        selection.w,
        selection.h,
        0,
        0,
        selection.w,
        selection.h
      );
      ctx.clearRect(selection.x, selection.y, selection.w, selection.h);
    }

    setFloatingSelection({
      canvas: floatCanvas,
      x: selection.x,
      y: selection.y,
      w: selection.w,
      h: selection.h,
    });

    renderComposite();
    bumpBufferVersion();
  }, [
    activeLayerId,
    bumpBufferVersion,
    canvasWidth,
    captureSnapshot,
    getOrCreateLayerCanvas,
    renderComposite,
    selection,
    selectionMask,
  ]);

  // Commit floating selection buffer back to active layer
  const commitFloatingSelection = useCallback(() => {
    if (!floatingSelection) return;

    captureSnapshot('Commit Selection');
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
  }, [
    activeLayerId,
    bumpBufferVersion,
    captureSnapshot,
    commitSnapshot,
    floatingSelection,
    getOrCreateLayerCanvas,
    renderComposite,
    setSelection,
  ]);

  const handleCopy = useCallback(() => {
    if (floatingSelection) {
      const copyCanvas = document.createElement('canvas');
      copyCanvas.width = floatingSelection.w;
      copyCanvas.height = floatingSelection.h;
      const cCtx = copyCanvas.getContext('2d');
      cCtx?.drawImage(floatingSelection.canvas, 0, 0);
      clipboardRef.current = {
        canvas: copyCanvas,
        w: floatingSelection.w,
        h: floatingSelection.h,
      };
    } else if (selection) {
      const layerCanvas = getOrCreateLayerCanvas(activeLayerId);
      const copyCanvas = document.createElement('canvas');
      copyCanvas.width = selection.w;
      copyCanvas.height = selection.h;
      const cCtx = copyCanvas.getContext('2d', { willReadFrequently: true });
      if (!cCtx) return;

      if (selectionMask) {
        const ctx = layerCanvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;
        const srcData = SafeCanvas.getImageData(ctx, selection.x, selection.y, selection.w, selection.h);
        const floatData = SafeCanvas.createImageData(cCtx, selection.w, selection.h);

        for (let dy = 0; dy < selection.h; dy++) {
          for (let dx = 0; dx < selection.w; dx++) {
            const globalX = selection.x + dx;
            const globalY = selection.y + dy;
            const maskIdx = globalY * canvasWidth + globalX;
            const pixelIdx = (dy * selection.w + dx) * 4;

            if (selectionMask[maskIdx] === 1) {
              floatData.data[pixelIdx] = srcData.data[pixelIdx];
              floatData.data[pixelIdx + 1] = srcData.data[pixelIdx + 1];
              floatData.data[pixelIdx + 2] = srcData.data[pixelIdx + 2];
              floatData.data[pixelIdx + 3] = srcData.data[pixelIdx + 3];
            }
          }
        }
        cCtx.putImageData(floatData, 0, 0);
      } else {
        cCtx.drawImage(
          layerCanvas,
          selection.x,
          selection.y,
          selection.w,
          selection.h,
          0,
          0,
          selection.w,
          selection.h
        );
      }

      clipboardRef.current = {
        canvas: copyCanvas,
        w: selection.w,
        h: selection.h,
      };
    }
  }, [activeLayerId, canvasWidth, floatingSelection, getOrCreateLayerCanvas, selection, selectionMask]);

  const handleCut = useCallback(() => {
    handleCopy();
    clearPreview();
    if (floatingSelection) {
      setFloatingSelection(null);
      setSelection(null);
      commitSnapshot();
      renderComposite();
      bumpBufferVersion();
    } else if (selection) {
      captureSnapshot('Cut Selection');
      clearSelectedPixels();
      setSelection(null);
      commitSnapshot();
      renderComposite();
      bumpBufferVersion();
    }
  }, [
    bumpBufferVersion,
    captureSnapshot,
    clearPreview,
    clearSelectedPixels,
    commitSnapshot,
    floatingSelection,
    handleCopy,
    renderComposite,
    selection,
    setSelection,
  ]);

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
    clearPreview();
    if (floatingSelection) {
      setFloatingSelection(null);
      setSelection(null);
      commitSnapshot();
      renderComposite();
      bumpBufferVersion();
    } else if (selection) {
      captureSnapshot('Delete Selection');
      clearSelectedPixels();
      setSelection(null);
      commitSnapshot();
      renderComposite();
      bumpBufferVersion();
    }
  }, [
    bumpBufferVersion,
    captureSnapshot,
    clearPreview,
    clearSelectedPixels,
    commitSnapshot,
    floatingSelection,
    renderComposite,
    selection,
    setSelection,
  ]);

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

  // Global Keyboard Shortcuts for Selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (shouldIgnoreWorkspaceKey(e) || e.altKey) return;
      const key = workspaceShortcutKey(e);
      // CenterViewport delegates Escape/arrows to its transform hook. One owner
      // avoids committing then cancelling, or moving a floating selection twice.
      if (!ownsTransformShortcuts && ['Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;

      if ((e.ctrlKey || e.metaKey) && key === 'c') {
        e.preventDefault();
        handleCopy();
      } else if ((e.ctrlKey || e.metaKey) && key === 'x') {
        e.preventDefault();
        handleCut();
      } else if ((e.ctrlKey || e.metaKey) && key === 'v') {
        e.preventDefault();
        handlePaste();
      } else if ((e.ctrlKey || e.metaKey) && key === 'd') {
        e.preventDefault();
        commitFloatingSelection();
        setSelection(null);
      } else if (e.ctrlKey || e.metaKey) {
        return;
      } else if (e.key === 'Escape') {
        e.preventDefault();
        commitFloatingSelection();
        setSelection(null);
        clearPreview();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selection || floatingSelection) {
          e.preventDefault();
          handleDeleteSelection();
        } else {
          clearPreview();
        }
      } else if (key === 'h' && !e.shiftKey && (selection || floatingSelection)) {
        e.preventDefault();
        handleFlipHorizontal();
      } else if (key === 'v' && !e.shiftKey && (selection || floatingSelection)) {
        e.preventDefault();
        handleFlipVertical();
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        if (floatingSelection && !isWorkspaceControlTarget(e)) {
          e.preventDefault();
          const step = e.shiftKey ? 5 : 1;
          const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
          const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
          setFloatingSelection({
            ...floatingSelection,
            x: floatingSelection.x + dx,
            y: floatingSelection.y + dy,
          });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    commitFloatingSelection,
    clearPreview,
    floatingSelection,
    handleCopy,
    handleCut,
    handleDeleteSelection,
    handleFlipHorizontal,
    handleFlipVertical,
    handlePaste,
    selection,
    setSelection,
    ownsTransformShortcuts,
  ]);

  return {
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
    handleCopy,
    handleCut,
    handlePaste,
    handleDeleteSelection,
    handleFlipHorizontal,
    handleFlipVertical,
    createBoxMask: (box: { x: number; y: number; w: number; h: number }) =>
      createBoxMask(box, canvasWidth, canvasHeight),
    mergeSelectionMask: (
      base: Uint8Array | null,
      incoming: Uint8Array,
      mode: 'replace' | 'union' | 'subtract'
    ) => mergeSelectionMask(base, incoming, mode, canvasWidth, canvasHeight),
  };
}
