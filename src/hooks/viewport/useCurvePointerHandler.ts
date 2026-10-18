'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useStudioStore } from '@/stores/studioStore';
import { touchBuffer } from '@/lib/engine/bufferRegistry';
import { workspaceJobKey } from '@/lib/engine/workspaceJob';
import { getGlobalHistoryEngine } from '@/lib/engine/historyEngine';
import { isWorkspaceControlTarget, shouldIgnoreWorkspaceKey } from '@/lib/input/workspaceKeyboard';
import type { HistoryStep } from '@/types/canvas';
import { isEditableLayer } from '@/lib/canvas/layerEditGuard';
import {
  Point,
  getClippedLine,
  applySymmetry,
  getQuadraticBezierPoints,
} from '@/lib/canvas/rasterMath';

export type CurveHandleId = 'start' | 'control' | 'end';
type CurveColorSource = 'primary' | 'secondary';

export interface CurvePointerHandlerProps {
  canvasWidth: number;
  canvasHeight: number;
  previewCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  drawPointsOnActiveLayer: (points: Point[], color: string, isErase: boolean) => void;
  captureSnapshot: (desc: string) => void;
  commitSnapshot: () => void;
  discardSnapshot?: () => void;
  performUndo?: () => void;
  renderComposite: () => void;
  /** Whether a new curve uses the secondary color (keymap-dependent; defaults to Shift). */
  usesSecondary?: (e: { shiftKey: boolean } | undefined) => boolean;
}

export interface CommittedCurveRecord {
  start: Point;
  control: Point;
  end: Point;
  drawColor: string;
  colorSource: CurveColorSource;
  layerId: string;
  frameIndex: number;
  ownerKey: string;
  undoStep: HistoryStep | null;
}

export interface AdjustingCurveState {
  start: Point;
  control: Point;
  end: Point;
  draggingHandle: CurveHandleId | null;
}

interface CurveState {
  layerId: string;
  ownerKey: string;
  undoHead: HistoryStep | null;
  phase: 'drafting' | 'adjusting';
  start: Point;
  control: Point;
  end: Point;
  drawColor: string;
  colorSource: CurveColorSource;
  draggingHandle: CurveHandleId | null;
  hoveredHandle: CurveHandleId | null;
}

export function useCurvePointerHandler({
  canvasWidth,
  canvasHeight,
  previewCanvasRef,
  drawPointsOnActiveLayer,
  captureSnapshot,
  commitSnapshot,
  discardSnapshot,
  performUndo,
  renderComposite,
  usesSecondary = e => !!e?.shiftKey,
}: CurvePointerHandlerProps) {
  const tools = useStudioStore((s) => s.tools);
  const primaryColor = useStudioStore((s) => s.primaryColor);
  const secondaryColor = useStudioStore((s) => s.secondaryColor);
  const frames = useStudioStore((s) => s.frames);
  const activeFrameIndex = useStudioStore((s) => s.activeFrameIndex);
  const activeLayerId = useStudioStore((s) => s.activeLayerId);
  const projectId = useStudioStore((s) => s.currentProjectId);

  const curveStateRef = useRef<CurveState | null>(null);
  const observedColorsRef = useRef({ primary: primaryColor, secondary: secondaryColor });
  const lastCommittedCurveRef = useRef<CommittedCurveRecord | null>(null);
  const [canReEdit, setCanReEdit] = useState(false);
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [adjustingCurve, setAdjustingCurve] = useState<AdjustingCurveState | null>(null);

  const lastPointerDownTimeRef = useRef<number>(0);
  const lastPointerDownPosRef = useRef<Point>({ x: 0, y: 0 });
  const lastPointerDownPhaseRef = useRef<'idle' | 'drafting' | 'adjusting'>('idle');

  const renderPreview = useCallback(
    (state: CurveState | null) => {
      const canvas = previewCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      if (!state) return;

      ctx.imageSmoothingEnabled = false;

      const currentTools = useStudioStore.getState().tools;
      const offset = Math.floor(currentTools.brushSize / 2);

      if (state.phase === 'drafting') {
        let linePoints = getClippedLine(
          state.start.x,
          state.start.y,
          state.end.x,
          state.end.y,
          canvasWidth,
          canvasHeight
        );
        if (
          currentTools.symmetryHorizontal ||
          currentTools.symmetryVertical ||
          (currentTools.symmetryGroup && currentTools.symmetryGroup !== 'none')
        ) {
          linePoints = applySymmetry(
            linePoints,
            canvasWidth,
            canvasHeight,
            currentTools.symmetryHorizontal,
            currentTools.symmetryVertical,
            currentTools.symmetryGroup
          );
        }
        ctx.fillStyle = state.drawColor;
        linePoints.forEach((p) => {
          ctx.fillRect(p.x - offset, p.y - offset, currentTools.brushSize, currentTools.brushSize);
        });
        return;
      }

      if (state.phase === 'adjusting') {
        // Render pure Bézier Curve raster pixels on previewCanvas
        // Screen-space overlay (CurveAdjustmentGizmo) renders the fixed-size handles and tangent guides
        let curvePoints = getQuadraticBezierPoints(state.start, state.control, state.end);
        if (
          currentTools.symmetryHorizontal ||
          currentTools.symmetryVertical ||
          (currentTools.symmetryGroup && currentTools.symmetryGroup !== 'none')
        ) {
          curvePoints = applySymmetry(
            curvePoints,
            canvasWidth,
            canvasHeight,
            currentTools.symmetryHorizontal,
            currentTools.symmetryVertical,
            currentTools.symmetryGroup
          );
        }
        ctx.fillStyle = state.drawColor;
        curvePoints.forEach((p) => {
          ctx.fillRect(p.x - offset, p.y - offset, currentTools.brushSize, currentTools.brushSize);
        });
      }
    },
    [canvasWidth, canvasHeight, previewCanvasRef]
  );

  const dismissReEdit = useCallback(() => {
    lastCommittedCurveRef.current = null;
    setCanReEdit(false);
  }, []);

  const cancel = useCallback(() => {
    if (!curveStateRef.current) return;
    curveStateRef.current = null;
    setIsAdjusting(false);
    setAdjustingCurve(null);
    dismissReEdit();
    discardSnapshot?.();
    renderPreview(null);
  }, [discardSnapshot, dismissReEdit, renderPreview]);

  const commit = useCallback(() => {
    const state = curveStateRef.current;
    if (!state || state.phase !== 'adjusting') {
      curveStateRef.current = null;
      setIsAdjusting(false);
      setAdjustingCurve(null);
      renderPreview(null);
      return;
    }
    if (state.ownerKey !== workspaceJobKey([state.layerId])
      || state.undoHead !== (getGlobalHistoryEngine()?.peekUndo() ?? null)) {
      cancel();
      return;
    }

    const storeState = useStudioStore.getState();
    const currentFrame = storeState.frames[storeState.activeFrameIndex];
    const targetLayerId = storeState.activeLayerId || currentFrame?.layers[0]?.id;

    curveStateRef.current = null;
    setIsAdjusting(false);
    setAdjustingCurve(null);

    const rawCurvePoints = getQuadraticBezierPoints(state.start, state.control, state.end);
    const drawColor = state.drawColor || storeState.primaryColor;
    drawPointsOnActiveLayer(rawCurvePoints, drawColor, false);

    if (targetLayerId) {
      touchBuffer(targetLayerId);
    }
    commitSnapshot();
    renderComposite();
    storeState.bumpBufferVersion();
    storeState.setDirty(true);
    const engine = getGlobalHistoryEngine();
    const undoStep = engine?.peekUndo() ?? null;
    if (!engine || (undoStep && undoStep !== state.undoHead
      && undoStep.type === 'pixel' && undoStep.layerId === targetLayerId
      && undoStep.description === 'Bézier Curve')) {
      lastCommittedCurveRef.current = {
        start: { ...state.start }, control: { ...state.control }, end: { ...state.end },
        drawColor, colorSource: state.colorSource, layerId: targetLayerId, frameIndex: storeState.activeFrameIndex,
        ownerKey: workspaceJobKey([targetLayerId]), undoStep,
      };
      setCanReEdit(true);
    } else {
      dismissReEdit();
    }
    renderPreview(null);
  }, [cancel, commitSnapshot, dismissReEdit, drawPointsOnActiveLayer, renderComposite, renderPreview]);

  const reEdit = useCallback((): boolean => {
    const record = lastCommittedCurveRef.current;
    if (!record) return false;

    const storeState = useStudioStore.getState();
    const currentFrame = storeState.frames[storeState.activeFrameIndex];
    const targetLayerId = storeState.activeLayerId || currentFrame?.layers[0]?.id;
    const engine = getGlobalHistoryEngine();
    if (record.layerId !== targetLayerId || record.frameIndex !== storeState.activeFrameIndex
      || record.ownerKey !== workspaceJobKey([record.layerId])
      || (engine && record.undoStep !== engine.peekUndo()) || !performUndo) {
      dismissReEdit();
      return false;
    }

    performUndo();
    if (engine && engine.peekUndo() === record.undoStep) {
      dismissReEdit();
      return false;
    }

    curveStateRef.current = {
      layerId: record.layerId,
      ownerKey: workspaceJobKey([record.layerId]),
      undoHead: engine?.peekUndo() ?? null,
      phase: 'adjusting',
      start: { ...record.start },
      control: { ...record.control },
      end: { ...record.end },
      drawColor: record.drawColor,
      colorSource: record.colorSource,
      draggingHandle: null,
      hoveredHandle: null,
    };

    captureSnapshot('Bézier Curve');
    curveStateRef.current.ownerKey = workspaceJobKey([record.layerId]);
    setIsAdjusting(true);
    setAdjustingCurve({
      start: { ...record.start },
      control: { ...record.control },
      end: { ...record.end },
      draggingHandle: null,
    });
    setCanReEdit(false);
    renderPreview(curveStateRef.current);
    return true;
  }, [captureSnapshot, dismissReEdit, performUndo, renderPreview]);

  const getHitHandle = (state: { start: Point; control: Point; end: Point }, coords: Point, zoom: number): CurveHandleId | null => {
    const hitRadius = Math.max(4, Math.round(12 / (zoom / 100)));

    const dCtrl = Math.hypot(state.control.x - coords.x, state.control.y - coords.y);
    if (dCtrl <= hitRadius) return 'control';

    const dStart = Math.hypot(state.start.x - coords.x, state.start.y - coords.y);
    const dEnd = Math.hypot(state.end.x - coords.x, state.end.y - coords.y);

    if (dStart <= hitRadius && dStart <= dEnd) return 'start';
    if (dEnd <= hitRadius) return 'end';

    return null;
  };

  const isNearCurve = (state: { start: Point; control: Point; end: Point }, coords: Point, zoom: number): boolean => {
    const threshold = Math.max(5, Math.round(10 / (zoom / 100)));
    const curvePoints = getQuadraticBezierPoints(state.start, state.control, state.end);
    return curvePoints.some(
      (p) => Math.hypot(p.x - coords.x, p.y - coords.y) <= threshold
    );
  };

  const startDraggingHandle = useCallback(
    (handle: CurveHandleId, _e: React.PointerEvent) => {
      const state = curveStateRef.current;
      if (state && state.phase === 'adjusting') {
        state.draggingHandle = handle;
        state.hoveredHandle = handle;
        setAdjustingCurve({
          start: { ...state.start },
          control: { ...state.control },
          end: { ...state.end },
          draggingHandle: handle,
        });
        renderPreview(state);
      }
    },
    [renderPreview]
  );

  const onPointerDown = (e: React.PointerEvent, coords: Point): boolean => {
    // The right button only arrives here for a secondary-color curve (standard keymap).
    if (e.button !== 0 && e.button !== 2) return false;

    const currentFrame = frames[activeFrameIndex];
    const currentLayer = currentFrame?.layers.find((l) => l.id === activeLayerId);
    // The general pointer path then explains a locked or hidden layer.
    if (!isEditableLayer(currentLayer)) {
      return false;
    }

    const state = curveStateRef.current;
    const zoom = useStudioStore.getState().zoom;

    // Double click to commit (only when previous click was already during adjusting phase)
    const now = Date.now();
    if (
      state &&
      state.phase === 'adjusting' &&
      lastPointerDownPhaseRef.current === 'adjusting' &&
      now - lastPointerDownTimeRef.current < 300 &&
      Math.hypot(coords.x - lastPointerDownPosRef.current.x, coords.y - lastPointerDownPosRef.current.y) < 5
    ) {
      commit();
      return true;
    }
    lastPointerDownPhaseRef.current = state?.phase ?? 'idle';
    lastPointerDownTimeRef.current = now;
    lastPointerDownPosRef.current = { ...coords };

    // If currently adjusting
    if (state && state.phase === 'adjusting') {
      const hitHandle = getHitHandle(state, coords, zoom);
      if (hitHandle) {
        state.draggingHandle = hitHandle;
        state.hoveredHandle = hitHandle;
        setAdjustingCurve({
          start: { ...state.start },
          control: { ...state.control },
          end: { ...state.end },
          draggingHandle: hitHandle,
        });
        renderPreview(state);
        return true;
      }

      if (isNearCurve(state, coords, zoom)) {
        state.control = { ...coords };
        state.draggingHandle = 'control';
        state.hoveredHandle = 'control';
        setAdjustingCurve({
          start: { ...state.start },
          control: { ...coords },
          end: { ...state.end },
          draggingHandle: 'control',
        });
        renderPreview(state);
        return true;
      }

      // Clicked outside: commit current curve and immediately start next curve
      commit();
    } else if (canReEdit && lastCommittedCurveRef.current) {
      const hitHandle = getHitHandle(lastCommittedCurveRef.current, coords, zoom);
      const near = isNearCurve(lastCommittedCurveRef.current, coords, zoom);
      if (hitHandle || near) {
        const success = reEdit();
        if (success && curveStateRef.current) {
          const activeState = curveStateRef.current;
          const targetHandle = hitHandle || 'control';
          if (!hitHandle && near) {
            activeState.control = { ...coords };
          }
          activeState.draggingHandle = targetHandle;
          activeState.hoveredHandle = targetHandle;
          setAdjustingCurve({
            start: { ...activeState.start },
            control: { ...activeState.control },
            end: { ...activeState.end },
            draggingHandle: targetHandle,
          });
          renderPreview(activeState);
          return true;
        }
      } else {
        dismissReEdit();
      }
    }

    // Start drafting new curve
    const secondary = usesSecondary(e);
    const drawColor = secondary ? secondaryColor : primaryColor;
    curveStateRef.current = {
      layerId: currentLayer.id,
      ownerKey: workspaceJobKey([currentLayer.id]),
      undoHead: getGlobalHistoryEngine()?.peekUndo() ?? null,
      phase: 'drafting',
      start: { ...coords },
      control: { ...coords },
      end: { ...coords },
      drawColor,
      colorSource: secondary ? 'secondary' : 'primary',
      draggingHandle: null,
      hoveredHandle: null,
    };
    setIsAdjusting(false);
    setAdjustingCurve(null);
    renderPreview(curveStateRef.current);
    return true;
  };

  const onPointerMove = (e: React.PointerEvent, coords: Point): boolean => {
    const state = curveStateRef.current;
    if (!state) return false;
    if (state.ownerKey !== workspaceJobKey([state.layerId])) { cancel(); return true; }

    const zoom = useStudioStore.getState().zoom;

    if (state.phase === 'drafting') {
      state.end = { ...coords };
      state.control = {
        x: Math.round((state.start.x + coords.x) / 2),
        y: Math.round((state.start.y + coords.y) / 2),
      };
      renderPreview(state);
      return true;
    }

    if (state.phase === 'adjusting') {
      if (state.draggingHandle) {
        if (state.draggingHandle === 'control') {
          state.control = { ...coords };
        } else if (state.draggingHandle === 'start') {
          state.start = { ...coords };
        } else if (state.draggingHandle === 'end') {
          state.end = { ...coords };
        }
        setAdjustingCurve({
          start: { ...state.start },
          control: { ...state.control },
          end: { ...state.end },
          draggingHandle: state.draggingHandle,
        });
        renderPreview(state);
        return true;
      }

      const hitHandle = getHitHandle(state, coords, zoom);
      if (hitHandle !== state.hoveredHandle) {
        state.hoveredHandle = hitHandle;
        renderPreview(state);
      }
      return true;
    }

    return false;
  };

  const onPointerUp = (_e: React.PointerEvent | undefined, coords: Point | null): boolean => {
    const state = curveStateRef.current;
    if (!state) return false;
    if (state.ownerKey !== workspaceJobKey([state.layerId])) { cancel(); return true; }

    if (state.phase === 'drafting') {
      const endPoint = coords ?? state.end;
      const dist = Math.hypot(endPoint.x - state.start.x, endPoint.y - state.start.y);

      if (dist < 2) {
        curveStateRef.current = null;
        setIsAdjusting(false);
        setAdjustingCurve(null);
        renderPreview(null);
        return true;
      }

      const tightness = tools.curveTightness ?? 0.5;
      const midX = (state.start.x + endPoint.x) / 2;
      const midY = (state.start.y + endPoint.y) / 2;
      const dx = endPoint.x - state.start.x;
      const dy = endPoint.y - state.start.y;

      state.phase = 'adjusting';
      state.end = { ...endPoint };
      state.control = {
        x: Math.round(midX + dy * (tightness * 0.2)),
        y: Math.round(midY - dx * (tightness * 0.2)),
      };
      state.draggingHandle = null;
      state.hoveredHandle = null;

      captureSnapshot('Bézier Curve');
      state.ownerKey = workspaceJobKey([state.layerId]);
      setIsAdjusting(true);
      setAdjustingCurve({
        start: { ...state.start },
        control: { ...state.control },
        end: { ...state.end },
        draggingHandle: null,
      });
      renderPreview(state);
      return true;
    }

    if (state.phase === 'adjusting') {
      if (state.draggingHandle) {
        state.draggingHandle = null;
        setAdjustingCurve({
          start: { ...state.start },
          control: { ...state.control },
          end: { ...state.end },
          draggingHandle: null,
        });
        renderPreview(state);
      }
      return true;
    }

    return false;
  };

  // Keyboard shortcut listener for Enter/Escape during adjustment or re-edit
  useEffect(() => {
    if (!isAdjusting && !canReEdit) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (shouldIgnoreWorkspaceKey(e)
        || (isWorkspaceControlTarget(e) && (e.key === 'Enter' || e.key === ' '))) return;

      if (isAdjusting) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          commit();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          cancel();
        } else if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
          e.preventDefault();
          e.stopImmediatePropagation();
          cancel();
        }
      } else if (canReEdit) {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          reEdit();
        } else if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
          e.preventDefault();
          e.stopPropagation();
          reEdit();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          dismissReEdit();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', onKeyDown, { capture: true });
    };
  }, [isAdjusting, canReEdit, commit, cancel, reEdit, dismissReEdit]);

  // Auto-commit and dismiss re-edit on tool switch
  const activeTool = tools.activeTool;
  useEffect(() => {
    if (activeTool !== 'curve') {
      if (curveStateRef.current) {
        commit();
      }
      dismissReEdit();
    }
  }, [activeTool, commit, dismissReEdit]);

  // A preview belongs to its initiating frame/layer; switching cancels it.
  useEffect(() => {
    if (curveStateRef.current) cancel();
    dismissReEdit();
  }, [activeFrameIndex, activeLayerId, projectId, cancel, dismissReEdit]);

  // Opening adjustment/re-edit preserves the chosen color; explicit well edits update it.
  useEffect(() => {
    const colors = { primary: primaryColor, secondary: secondaryColor };
    const previous = observedColorsRef.current;
    observedColorsRef.current = colors;
    const state = curveStateRef.current;
    if (isAdjusting && state) {
      if (colors[state.colorSource] !== previous[state.colorSource]) {
        state.drawColor = colors[state.colorSource];
      }
      renderPreview(state);
    }
  }, [primaryColor, secondaryColor, tools.brushSize, isAdjusting, renderPreview]);

  return {
    isAdjusting,
    adjustingCurve,
    canReEdit,
    reEdit,
    dismissReEdit,
    startDraggingHandle,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    commit,
    cancel,
  };
}
