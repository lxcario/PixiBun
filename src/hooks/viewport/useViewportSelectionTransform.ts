'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Point } from '@/lib/canvas/rasterMath';
import { runRotSpriteInWorker } from '@/lib/engine/workerDispatcher';
import { FloatingSelection } from './useViewportOverlays';

export type TransformHandleType =
  | 'tl'
  | 'tc'
  | 'tr'
  | 'mr'
  | 'br'
  | 'bc'
  | 'bl'
  | 'ml'
  | 'pivot'
  | 'rotate'
  | 'translate';

export interface TransformState {
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number; // in radians
  scaleX: number;
  scaleY: number;
  pivot: { x: number; y: number }; // in canvas coordinates
  isTransforming: boolean;
  activeHandle: TransformHandleType | null;
}

interface UseViewportSelectionTransformProps {
  canvasWidth: number;
  canvasHeight: number;
  activeLayerId: string;
  selection: { x: number; y: number; w: number; h: number } | null;
  selectionMask: Uint8Array | null;
  floatingSelection: FloatingSelection | null;
  setFloatingSelection: (val: FloatingSelection | null | ((prev: FloatingSelection | null) => FloatingSelection | null)) => void;
  setSelection: (val: { x: number; y: number; w: number; h: number } | null) => void;
  getOrCreateLayerCanvas: (layerId: string) => HTMLCanvasElement;
  renderComposite: () => void;
  captureSnapshot: (description: string) => void;
  commitSnapshot: () => void;
  bumpBufferVersion: () => void;
  liftSelectionToFloating: () => void;
  commitFloatingSelection: () => void;
}

export function useViewportSelectionTransform({
  canvasWidth,
  canvasHeight: _canvasHeight,
  activeLayerId,
  selection,
  selectionMask,
  floatingSelection,
  setFloatingSelection,
  setSelection,
  getOrCreateLayerCanvas,
  renderComposite,
  captureSnapshot,
  commitSnapshot,
  bumpBufferVersion,
  liftSelectionToFloating,
  commitFloatingSelection: _commitFloatingSelection,
}: UseViewportSelectionTransformProps) {
  // Source backup for cancel or crisp high-quality commit
  const originalSourceRef = useRef<{
    canvas: HTMLCanvasElement;
    x: number;
    y: number;
    w: number;
    h: number;
    mask: Uint8Array | null;
    layerId: string;
  } | null>(null);

  // Active transform state
  const [transform, setTransform] = useState<TransformState>({
    x: 0,
    y: 0,
    w: 0,
    h: 0,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    pivot: { x: 0, y: 0 },
    isTransforming: false,
    activeHandle: null,
  });

  const dragStartRef = useRef<{
    clientPoint: Point;
    canvasPoint: Point;
    transform: TransformState;
    initialAngle: number;
    aspectRatio: number;
  } | null>(null);

  const lastActiveBoxRef = useRef<string | null>(null);

  // Sync transform state when a new selection box is created
  useEffect(() => {
    if (transform.isTransforming) return;

    const box = floatingSelection
      ? { x: floatingSelection.x, y: floatingSelection.y, w: floatingSelection.w, h: floatingSelection.h }
      : selection;

    if (!box) {
      lastActiveBoxRef.current = null;
      return;
    }

    const boxKey = `${box.x},${box.y},${box.w},${box.h}`;
    if (lastActiveBoxRef.current !== boxKey && !floatingSelection) {
      lastActiveBoxRef.current = boxKey;
      setTransform((prev) => ({
        ...prev,
        x: box.x,
        y: box.y,
        w: box.w,
        h: box.h,
        pivot: { x: box.x + box.w / 2, y: box.y + box.h / 2 },
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
      }));
    }
  }, [floatingSelection, selection, transform.isTransforming]);

  const ensureFloatingSelection = useCallback((): FloatingSelection | null => {
    if (floatingSelection) return floatingSelection;
    if (!selection) return null;

    const layerCanvas = getOrCreateLayerCanvas(activeLayerId);
    const backup = document.createElement('canvas');
    backup.width = selection.w;
    backup.height = selection.h;
    const bCtx = backup.getContext('2d');
    if (bCtx) {
      bCtx.drawImage(
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
      if (selectionMask) {
        const pixels = bCtx.getImageData(0, 0, selection.w, selection.h);
        for (let y = 0; y < selection.h; y++) {
          for (let x = 0; x < selection.w; x++) {
            if (selectionMask[(selection.y + y) * canvasWidth + selection.x + x] !== 1) {
              const offset = (y * selection.w + x) * 4;
              pixels.data[offset] = 0;
              pixels.data[offset + 1] = 0;
              pixels.data[offset + 2] = 0;
              pixels.data[offset + 3] = 0;
            }
          }
        }
        bCtx.putImageData(pixels, 0, 0);
      }
    }

    originalSourceRef.current = {
      canvas: backup,
      x: selection.x,
      y: selection.y,
      w: selection.w,
      h: selection.h,
      mask: selectionMask ? new Uint8Array(selectionMask) : null,
      layerId: activeLayerId,
    };

    liftSelectionToFloating();

    const floatCanvas = document.createElement('canvas');
    floatCanvas.width = selection.w;
    floatCanvas.height = selection.h;
    const fCtx = floatCanvas.getContext('2d');
    if (fCtx) {
      fCtx.drawImage(backup, 0, 0);
    }

    return {
      canvas: floatCanvas,
      x: selection.x,
      y: selection.y,
      w: selection.w,
      h: selection.h,
    };
  }, [activeLayerId, canvasWidth, floatingSelection, getOrCreateLayerCanvas, liftSelectionToFloating, selection, selectionMask]);

  // Start a transform interaction with a specific handle
  const handlePointerDown = useCallback(
    (
      handle: TransformHandleType,
      clientPoint: Point,
      canvasPoint: Point
    ) => {
      // If not yet floating, lift active selection to floating buffer now
      if (!floatingSelection && selection) {
        ensureFloatingSelection();
      } else if (floatingSelection && !originalSourceRef.current) {
        const backup = document.createElement('canvas');
        backup.width = floatingSelection.w;
        backup.height = floatingSelection.h;
        const bCtx = backup.getContext('2d');
        if (bCtx) {
          bCtx.drawImage(floatingSelection.canvas, 0, 0);
        }
        originalSourceRef.current = {
          canvas: backup,
          x: floatingSelection.x,
          y: floatingSelection.y,
          w: floatingSelection.w,
          h: floatingSelection.h,
          mask: null,
          layerId: activeLayerId,
        };
      }

      const currentBox = floatingSelection || selection;
      if (!currentBox) return;

      const pivot = transform.pivot.x !== 0 || transform.pivot.y !== 0
        ? transform.pivot
        : { x: currentBox.x + currentBox.w / 2, y: currentBox.y + currentBox.h / 2 };

      const initialAngle = Math.atan2(canvasPoint.y - pivot.y, canvasPoint.x - pivot.x);
      const aspectRatio = currentBox.w / Math.max(1, currentBox.h);

      const nextTransform: TransformState = {
        ...transform,
        x: currentBox.x,
        y: currentBox.y,
        w: currentBox.w,
        h: currentBox.h,
        pivot,
        isTransforming: true,
        activeHandle: handle,
      };

      setTransform(nextTransform);

      dragStartRef.current = {
        clientPoint,
        canvasPoint,
        transform: nextTransform,
        initialAngle,
        aspectRatio,
      };
    },
    [
      activeLayerId,
      ensureFloatingSelection,
      floatingSelection,
      selection,
      transform,
    ]
  );

  // Update transform during pointer move
  const handlePointerMove = useCallback(
    (
      canvasPoint: Point,
      modifiers: { shiftKey: boolean; altKey: boolean }
    ) => {
      if (!dragStartRef.current || !transform.isTransforming || !transform.activeHandle) {
        return;
      }

      const { canvasPoint: startPt, transform: startState, initialAngle, aspectRatio } = dragStartRef.current;
      const handle = transform.activeHandle;

      if (handle === 'pivot') {
        setTransform((prev) => ({
          ...prev,
          pivot: { x: canvasPoint.x, y: canvasPoint.y },
        }));
        return;
      }

      if (handle === 'rotate') {
        const currAngle = Math.atan2(
          canvasPoint.y - startState.pivot.y,
          canvasPoint.x - startState.pivot.x
        );
        const delta = currAngle - initialAngle;
        let newRot = startState.rotation + delta;

        // Shift snaps to 15-degree increments (PI / 12)
        if (modifiers.shiftKey) {
          const step = Math.PI / 12;
          newRot = Math.round(newRot / step) * step;
        }

        setTransform((prev) => ({
          ...prev,
          rotation: newRot,
        }));
        renderComposite();
        return;
      }

      if (handle === 'translate') {
        let dx = canvasPoint.x - startPt.x;
        let dy = canvasPoint.y - startPt.y;

        // Shift locks axis to horizontal or vertical
        if (modifiers.shiftKey) {
          if (Math.abs(dx) > Math.abs(dy)) {
            dy = 0;
          } else {
            dx = 0;
          }
        }

        const newX = Math.round(startState.x + dx);
        const newY = Math.round(startState.y + dy);

        setTransform((prev) => ({
          ...prev,
          x: newX,
          y: newY,
          pivot: {
            x: startState.pivot.x + dx,
            y: startState.pivot.y + dy,
          },
        }));

        setFloatingSelection((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            x: newX,
            y: newY,
          };
        });

        renderComposite();
        return;
      }

      // Handle Scaling (Corners and Edges)
      // Transform pointer into local space relative to pivot and rotation
      const rad = -startState.rotation;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);

      const dxWorld = canvasPoint.x - startPt.x;
      const dyWorld = canvasPoint.y - startPt.y;

      const dxLocal = cos * dxWorld - sin * dyWorld;
      const dyLocal = sin * dxWorld + cos * dyWorld;

      let newW = startState.w;
      let newH = startState.h;
      let newX = startState.x;
      let newY = startState.y;

      const symmetric = modifiers.altKey;

      switch (handle) {
        case 'br': {
          const deltaW = symmetric ? dxLocal * 2 : dxLocal;
          const deltaH = symmetric ? dyLocal * 2 : dyLocal;
          newW = Math.max(1, startState.w + deltaW);
          newH = Math.max(1, startState.h + deltaH);
          if (modifiers.shiftKey) {
            const scale = Math.max(newW / startState.w, newH / startState.h);
            newW = Math.max(1, Math.round(startState.w * scale));
            newH = Math.max(1, Math.round(newW / aspectRatio));
          }
          if (symmetric) {
            newX = startState.pivot.x - newW / 2;
            newY = startState.pivot.y - newH / 2;
          }
          break;
        }
        case 'tl': {
          const deltaW = symmetric ? -dxLocal * 2 : -dxLocal;
          const deltaH = symmetric ? -dyLocal * 2 : -dyLocal;
          newW = Math.max(1, startState.w + deltaW);
          newH = Math.max(1, startState.h + deltaH);
          if (modifiers.shiftKey) {
            const scale = Math.max(newW / startState.w, newH / startState.h);
            newW = Math.max(1, Math.round(startState.w * scale));
            newH = Math.max(1, Math.round(newW / aspectRatio));
          }
          if (symmetric) {
            newX = startState.pivot.x - newW / 2;
            newY = startState.pivot.y - newH / 2;
          } else {
            newX = startState.x + (startState.w - newW);
            newY = startState.y + (startState.h - newH);
          }
          break;
        }
        case 'tr': {
          const deltaW = symmetric ? dxLocal * 2 : dxLocal;
          const deltaH = symmetric ? -dyLocal * 2 : -dyLocal;
          newW = Math.max(1, startState.w + deltaW);
          newH = Math.max(1, startState.h + deltaH);
          if (modifiers.shiftKey) {
            const scale = Math.max(newW / startState.w, newH / startState.h);
            newW = Math.max(1, Math.round(startState.w * scale));
            newH = Math.max(1, Math.round(newW / aspectRatio));
          }
          if (symmetric) {
            newX = startState.pivot.x - newW / 2;
            newY = startState.pivot.y - newH / 2;
          } else {
            newY = startState.y + (startState.h - newH);
          }
          break;
        }
        case 'bl': {
          const deltaW = symmetric ? -dxLocal * 2 : -dxLocal;
          const deltaH = symmetric ? dyLocal * 2 : dyLocal;
          newW = Math.max(1, startState.w + deltaW);
          newH = Math.max(1, startState.h + deltaH);
          if (modifiers.shiftKey) {
            const scale = Math.max(newW / startState.w, newH / startState.h);
            newW = Math.max(1, Math.round(startState.w * scale));
            newH = Math.max(1, Math.round(newW / aspectRatio));
          }
          if (symmetric) {
            newX = startState.pivot.x - newW / 2;
            newY = startState.pivot.y - newH / 2;
          } else {
            newX = startState.x + (startState.w - newW);
          }
          break;
        }
        case 'mr': {
          const deltaW = symmetric ? dxLocal * 2 : dxLocal;
          newW = Math.max(1, startState.w + deltaW);
          if (symmetric) {
            newX = startState.pivot.x - newW / 2;
          }
          break;
        }
        case 'ml': {
          const deltaW = symmetric ? -dxLocal * 2 : -dxLocal;
          newW = Math.max(1, startState.w + deltaW);
          if (symmetric) {
            newX = startState.pivot.x - newW / 2;
          } else {
            newX = startState.x + (startState.w - newW);
          }
          break;
        }
        case 'tc': {
          const deltaH = symmetric ? -dyLocal * 2 : -dyLocal;
          newH = Math.max(1, startState.h + deltaH);
          if (symmetric) {
            newY = startState.pivot.y - newH / 2;
          } else {
            newY = startState.y + (startState.h - newH);
          }
          break;
        }
        case 'bc': {
          const deltaH = symmetric ? dyLocal * 2 : dyLocal;
          newH = Math.max(1, startState.h + deltaH);
          if (symmetric) {
            newY = startState.pivot.y - newH / 2;
          }
          break;
        }
      }

      setTransform((prev) => ({
        ...prev,
        x: Math.round(newX),
        y: Math.round(newY),
        w: Math.round(newW),
        h: Math.round(newH),
      }));

      // Render 60 FPS fast nearest-neighbor preview onto floating canvas
      if (originalSourceRef.current) {
        const source = originalSourceRef.current.canvas;
        const previewCanvas = document.createElement('canvas');
        previewCanvas.width = Math.max(1, Math.round(newW));
        previewCanvas.height = Math.max(1, Math.round(newH));
        const pCtx = previewCanvas.getContext('2d');
        if (pCtx) {
          pCtx.imageSmoothingEnabled = false;
          pCtx.drawImage(source, 0, 0, previewCanvas.width, previewCanvas.height);
          setFloatingSelection({
            canvas: previewCanvas,
            x: Math.round(newX),
            y: Math.round(newY),
            w: previewCanvas.width,
            h: previewCanvas.height,
          });
          renderComposite();
        }
      }
    },
    [renderComposite, setFloatingSelection, transform.activeHandle, transform.isTransforming]
  );

  // End pointer drag
  const handlePointerUp = useCallback(() => {
    if (transform.isTransforming) {
      dragStartRef.current = null;
      setTransform((prev) => ({
        ...prev,
        activeHandle: null,
      }));
    }
  }, [transform.isTransforming]);

  // Commit transform: RotSprite 8x if rotated, bake back to active layer with undo
  const commitTransform = useCallback(async () => {
    if (!originalSourceRef.current) {
      captureSnapshot('Commit Free Transform');
    }

    const source = floatingSelection?.canvas || originalSourceRef.current?.canvas;
    if (!source) {
      setTransform((prev) => ({ ...prev, isTransforming: false, activeHandle: null }));
      return;
    }

    const curW = transform.w;
    const curH = transform.h;
    const curX = transform.x;
    const curY = transform.y;
    const rotation = transform.rotation;

    let finalCanvas = source;

    // If scaled or stretched, perform nearest neighbor resample first
    if (source.width !== curW || source.height !== curH) {
      const scaledCanvas = document.createElement('canvas');
      scaledCanvas.width = curW;
      scaledCanvas.height = curH;
      const sCtx = scaledCanvas.getContext('2d');
      if (sCtx) {
        sCtx.imageSmoothingEnabled = false;
        sCtx.drawImage(source, 0, 0, curW, curH);
        finalCanvas = scaledCanvas;
      }
    }

    let destX = curX;
    let destY = curY;

    // If rotated, run RotSprite algorithm with unclipped bounding box and user pivot
    if (Math.abs(rotation) > 1e-4) {
      const fCtx = finalCanvas.getContext('2d', { willReadFrequently: true });
      if (fCtx) {
        const imgData = fCtx.getImageData(0, 0, curW, curH);

        const localPivotX = transform.pivot.x - curX;
        const localPivotY = transform.pivot.y - curY;

        const cos = Math.cos(rotation);
        const sin = Math.sin(rotation);

        const corners = [
          { x: 0, y: 0 },
          { x: curW, y: 0 },
          { x: curW, y: curH },
          { x: 0, y: curH },
        ].map((pt) => {
          const dx = pt.x - localPivotX;
          const dy = pt.y - localPivotY;
          return {
            x: localPivotX + cos * dx - sin * dy,
            y: localPivotY + sin * dx + cos * dy,
          };
        });

        const minX = Math.floor(Math.min(...corners.map((c) => c.x)));
        const maxX = Math.ceil(Math.max(...corners.map((c) => c.x)));
        const minY = Math.floor(Math.min(...corners.map((c) => c.y)));
        const maxY = Math.ceil(Math.max(...corners.map((c) => c.y)));

        const targetW = Math.max(1, maxX - minX);
        const targetH = Math.max(1, maxY - minY);
        destX = Math.round(curX + minX);
        destY = Math.round(curY + minY);
        const outPivotX = localPivotX - minX;
        const outPivotY = localPivotY - minY;

        const rotResult = await runRotSpriteInWorker(
          { width: curW, height: curH, data: imgData.data },
          rotation,
          localPivotX,
          localPivotY,
          targetW,
          targetH,
          outPivotX,
          outPivotY
        );

        const rotatedCanvas = document.createElement('canvas');
        rotatedCanvas.width = rotResult.width;
        rotatedCanvas.height = rotResult.height;
        const rCtx = rotatedCanvas.getContext('2d');
        if (rCtx) {
          const outImg = rCtx.createImageData(rotResult.width, rotResult.height);
          outImg.data.set(rotResult.data);
          rCtx.putImageData(outImg, 0, 0);
          finalCanvas = rotatedCanvas;
        }
      }
    }

    // Bake into active layer
    const layerCanvas = getOrCreateLayerCanvas(activeLayerId);
    const layerCtx = layerCanvas.getContext('2d', { willReadFrequently: true });
    if (layerCtx) {
      layerCtx.imageSmoothingEnabled = false;
      layerCtx.drawImage(finalCanvas, destX, destY);
    }

    // Reset states
    originalSourceRef.current = null;
    lastActiveBoxRef.current = null;
    setFloatingSelection(null);
    setSelection(null);
    setTransform({
      x: 0,
      y: 0,
      w: 0,
      h: 0,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      pivot: { x: 0, y: 0 },
      isTransforming: false,
      activeHandle: null,
    });

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
    setFloatingSelection,
    setSelection,
    transform,
  ]);

  // Cancel transform: restore original pixels and clear floating selection
  const cancelTransform = useCallback(() => {
    if (originalSourceRef.current) {
      const { canvas, x, y, layerId } = originalSourceRef.current;
      const targetLayer = getOrCreateLayerCanvas(layerId);
      const ctx = targetLayer.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(canvas, x, y);
      }
      originalSourceRef.current = null;
    }

    lastActiveBoxRef.current = null;
    setFloatingSelection(null);
    setSelection(null);
    setTransform({
      x: 0,
      y: 0,
      w: 0,
      h: 0,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      pivot: { x: 0, y: 0 },
      isTransforming: false,
      activeHandle: null,
    });

    renderComposite();
    bumpBufferVersion();
  }, [bumpBufferVersion, getOrCreateLayerCanvas, renderComposite, setFloatingSelection, setSelection]);

  // Quick Action: Flip Horizontal
  const handleFlipH = useCallback(() => {
    const current = ensureFloatingSelection();
    if (!current) return;

    setTransform((prev) => ({
      ...prev,
      scaleX: prev.scaleX * -1,
    }));

    const flipped = document.createElement('canvas');
    flipped.width = current.w;
    flipped.height = current.h;
    const fCtx = flipped.getContext('2d');
    if (fCtx) {
      fCtx.imageSmoothingEnabled = false;
      fCtx.translate(current.w, 0);
      fCtx.scale(-1, 1);
      fCtx.drawImage(current.canvas, 0, 0);
    }

    setFloatingSelection((prev) => {
      const base = prev || current;
      return { ...base, canvas: flipped };
    });
    renderComposite();
  }, [ensureFloatingSelection, renderComposite, setFloatingSelection]);

  // Quick Action: Flip Vertical
  const handleFlipV = useCallback(() => {
    const current = ensureFloatingSelection();
    if (!current) return;

    setTransform((prev) => ({
      ...prev,
      scaleY: prev.scaleY * -1,
    }));

    const flipped = document.createElement('canvas');
    flipped.width = current.w;
    flipped.height = current.h;
    const fCtx = flipped.getContext('2d');
    if (fCtx) {
      fCtx.imageSmoothingEnabled = false;
      fCtx.translate(0, current.h);
      fCtx.scale(1, -1);
      fCtx.drawImage(current.canvas, 0, 0);
    }

    setFloatingSelection((prev) => {
      const base = prev || current;
      return { ...base, canvas: flipped };
    });
    renderComposite();
  }, [ensureFloatingSelection, renderComposite, setFloatingSelection]);

  // Quick Action: Rotate 90° CW
  const handleRotate90CW = useCallback(() => {
    ensureFloatingSelection();
    setTransform((prev) => ({
      ...prev,
      rotation: prev.rotation + Math.PI / 2,
    }));
    renderComposite();
  }, [ensureFloatingSelection, renderComposite]);

  // Quick Action: Rotate 90° CCW
  const handleRotate90CCW = useCallback(() => {
    ensureFloatingSelection();
    setTransform((prev) => ({
      ...prev,
      rotation: prev.rotation - Math.PI / 2,
    }));
    renderComposite();
  }, [ensureFloatingSelection, renderComposite]);

  // Global Keyboard shortcuts: Enter to commit, Escape to cancel, arrows to nudge
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      const active = floatingSelection || selection;
      if (!active) return;

      if (e.key === 'Enter') {
        e.preventDefault();
        void commitTransform();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancelTransform();
      } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;

        setTransform((prev) => ({
          ...prev,
          x: prev.x + dx,
          y: prev.y + dy,
          pivot: { x: prev.pivot.x + dx, y: prev.pivot.y + dy },
        }));

        setFloatingSelection((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            x: prev.x + dx,
            y: prev.y + dy,
          };
        });
        renderComposite();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cancelTransform, commitTransform, floatingSelection, renderComposite, selection, setFloatingSelection]);

  return {
    transform,
    setTransform,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    commitTransform,
    cancelTransform,
    handleFlipH,
    handleFlipV,
    handleRotate90CW,
    handleRotate90CCW,
  };
}
