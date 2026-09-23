import { useState, useRef, useCallback, useEffect } from 'react';
import { Point, applySymmetry } from '@/lib/canvas/rasterMath';
import { createHistoryEngine, HistoryEngine, setGlobalHistoryEngine } from '@/lib/engine/historyEngine';
import { HistoryStep, Layer } from '@/types/canvas';
import { deleteBuffers, touchBuffer } from '@/lib/engine/bufferRegistry';
import { captureLayerBuffers, restoreStructuralWorkspace } from '@/lib/engine/structuralHistory';
import { canAddLayersToFrame, validateWorkspaceStructure } from '@/lib/project/workspaceEnvelopeGuard';
import { useStudioStore } from '@/stores/studioStore';
import { coDrawBridge } from '@/lib/sync/coDrawBridge';
import { studioEvents } from '@/lib/events/studioEvents';

interface UseViewportDrawingProps {
  canvasWidth: number;
  canvasHeight: number;
  renderComposite: () => void;
  getOrCreateLayerCanvas: (layerId: string) => HTMLCanvasElement;
  onCommitHistory?: () => void;
}

export function useViewportDrawing({
  canvasWidth,
  canvasHeight,
  renderComposite,
  getOrCreateLayerCanvas,
  onCommitHistory,
}: UseViewportDrawingProps) {
  const isDrawingRef = useRef(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokeStart, setStrokeStart] = useState<Point | null>(null);
  const [lastPoint, setLastPoint] = useState<Point | null>(null);
  const cursorCoordsRef = useRef<Point | null>(null);

  const [lockedWarning, setLockedWarning] = useState(false);
  const lockedWarningTimerRef = useRef<number | null>(null);

  const historyEngineRef = useRef<HistoryEngine>(createHistoryEngine(50));
  const currentStrokeSnapshotRef = useRef<HistoryStep | null>(null);
  const rafBufferBumpRef = useRef<number | null>(null);

  const frames = useStudioStore((s) => s.frames);
  const activeFrameIndex = useStudioStore((s) => s.activeFrameIndex);
  const activeLayerId = useStudioStore((s) => s.activeLayerId);
  const tools = useStudioStore((s) => s.tools);
  const primaryColor = useStudioStore((s) => s.primaryColor);
  const secondaryColor = useStudioStore((s) => s.secondaryColor);
  const setPrimaryColor = useStudioStore((s) => s.setPrimaryColor);
  const setCanUndo = useStudioStore((s) => s.setCanUndo);
  const setCanRedo = useStudioStore((s) => s.setCanRedo);
  const bumpBufferVersion = useStudioStore((s) => s.bumpBufferVersion);

  useEffect(() => {
    setGlobalHistoryEngine(historyEngineRef.current);

    // Event listener: Clear history when project changes or a new drawing is opened
    const handleHistoryClear = () => {
      if (historyEngineRef.current) {
        historyEngineRef.current.clear();
      }
      currentStrokeSnapshotRef.current = null;
      setCanUndo(false);
      setCanRedo(false);
    };

    const unsub = studioEvents.on('pixibun:history-clear', handleHistoryClear);

    return () => {
      unsub();
      setGlobalHistoryEngine(null);
      if (rafBufferBumpRef.current !== null) {
        cancelAnimationFrame(rafBufferBumpRef.current);
      }
    };
  }, [setCanUndo, setCanRedo]);

  // Capture Undo Snapshot
  const captureSnapshot = useCallback(
    (
      description: string = 'Stroke',
      overrideLayerId?: string,
      createdLayerId?: string,
      createdLayerTag?: string,
      preserveLayerEffect: boolean = false,
      createdLayerIndex?: number
    ) => {
      const targetLayerId = overrideLayerId || activeLayerId;
      const currentLayerCanvas = getOrCreateLayerCanvas(targetLayerId);
      const ctx = currentLayerCanvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      const imgData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
      const targetLayer = useStudioStore.getState().frames[activeFrameIndex]?.layers.find(
        (layer) => layer.id === targetLayerId
      );
      currentStrokeSnapshotRef.current = {
        type: 'pixel',
        layerId: targetLayerId,
        frameIndex: activeFrameIndex,
        imageData: imgData,
        description,
        createdLayerId,
        createdLayerTag,
        createdLayerIndex,
        layerName: targetLayer?.name,
        layerTag: targetLayer?.tag,
        preserveLayerEffect,
        layerEffect: targetLayer?.effect ? structuredClone(targetLayer.effect) : undefined,
      };
    },
    [activeFrameIndex, activeLayerId, canvasWidth, canvasHeight, getOrCreateLayerCanvas]
  );

  // Commit Undo Snapshot to Stack
  const commitSnapshot = useCallback(() => {
    if (currentStrokeSnapshotRef.current) {
      const snapshot = currentStrokeSnapshotRef.current;
      if (
        snapshot.type !== 'structural' &&
        !snapshot.preserveLayerEffect &&
        snapshot.layerId
      ) {
        useStudioStore.setState((state) => {
          const layer = state.frames[snapshot.frameIndex]?.layers.find(
            (candidate) => candidate.id === snapshot.layerId
          );
          if (layer) layer.effect = undefined;
        });
      }
      if (snapshot.type !== 'structural' && snapshot.layerId) {
        touchBuffer(snapshot.layerId);
      }
      historyEngineRef.current.push(snapshot);
      currentStrokeSnapshotRef.current = null;
      setCanUndo(historyEngineRef.current.canUndo);
      setCanRedo(historyEngineRef.current.canRedo);
      onCommitHistory?.();
      // Broadcast committed pixels to co-draw peers (no-op when disconnected).
      // The snapshot holds the PRE-stroke pixels; the bridge diffs them against
      // the live buffer to extract LWW-CRDT ops.
      if (snapshot.type !== 'structural' && snapshot.layerId && snapshot.imageData) {
        coDrawBridge.notifyStrokeCommitted(snapshot.layerId, snapshot.imageData);
      }
    }
  }, [onCommitHistory, setCanRedo, setCanUndo]);

  // Abandon an in-progress preview without touching the committed undo stack.
  // Long-lived interactive tools restore their own preview buffer, then use
  // this to ensure the captured pre-preview pixels cannot be committed later.
  const discardSnapshot = useCallback(() => {
    currentStrokeSnapshotRef.current = null;
  }, []);

  // Helper to determine which layer buffers must be captured on undo so redo can restore them
  const getRedoCaptureLayerIds = useCallback((
    step: import('@/types/canvas').StructuralHistoryStep,
    currentState: { frames: { id: string; layers: { id: string }[] }[]; activeLayerId: string }
  ): string[] => {
    switch (step.opKind) {
      case 'reorder-layers':
      case 'reorder-frames':
      case 'delete-layer':
      case 'delete-frame':
        return [];
      case 'add-layer':
      case 'duplicate-layer':
      case 'add-frame':
      case 'duplicate-frame': {
        const prevIds = new Set<string>();
        for (const f of step.frames) {
          for (const l of f.layers) prevIds.add(l.id);
        }
        const newIds: string[] = [];
        for (const f of currentState.frames) {
          for (const l of f.layers) {
            if (!prevIds.has(l.id)) newIds.push(l.id);
          }
        }
        return newIds;
      }
      case 'merge-layer':
        return step.affectedLayerIds && step.affectedLayerIds.length > 1
          ? [step.affectedLayerIds[1]]
          : [currentState.activeLayerId];
      case 'rotsprite':
        return step.affectedLayerIds ?? [currentState.activeLayerId];
      default:
        return step.affectedLayerIds ?? [];
    }
  }, []);

  // Undo Action (Supports both Pixel and Structural steps)
  const performUndo = useCallback(() => {
    const previousStep = historyEngineRef.current.peekUndo();
    if (!previousStep) return;

    let currentStep: HistoryStep;

    if (previousStep.type === 'structural') {
      const state = useStudioStore.getState();
      const targetWidth = previousStep.canvasWidth ?? state.canvasWidth;
      const targetHeight = previousStep.canvasHeight ?? state.canvasHeight;
      const targetFrames = previousStep.frames;

      // Prevalidate structural target BEFORE mutating history stacks or workspace
      const validity = validateWorkspaceStructure(targetWidth, targetHeight, targetFrames);
      if (!validity.ok) {
        studioEvents.emit('pixibun:toast', {
          type: 'error',
          message: validity.reason || 'Structural undo target workspace exceeds envelope bounds.',
        });
        return;
      }

      const redoCaptureIds = getRedoCaptureLayerIds(previousStep, state);
      currentStep = {
        type: 'structural',
        opKind: previousStep.opKind,
        description: previousStep.description,
        frameIndex: state.activeFrameIndex,
        frames: structuredClone(state.frames),
        activeFrameIndex: state.activeFrameIndex,
        activeLayerId: state.activeLayerId,
        canvasWidth: state.canvasWidth,
        canvasHeight: state.canvasHeight,
        layerBuffers: captureLayerBuffers(redoCaptureIds),
        affectedLayerIds: previousStep.affectedLayerIds,
      };
    } else {
      const currentLayerCanvas = getOrCreateLayerCanvas(previousStep.layerId);
      const ctx = currentLayerCanvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      const currentImgData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
      currentStep = {
        type: 'pixel',
        layerId: previousStep.layerId,
        frameIndex: previousStep.frameIndex,
        imageData: currentImgData,
        description: previousStep.description,
        createdLayerId: previousStep.createdLayerId,
        createdLayerTag: previousStep.createdLayerTag,
        createdLayerIndex: previousStep.createdLayerIndex,
        layerName: useStudioStore.getState().frames[previousStep.frameIndex]?.layers.find(
          (layer) => layer.id === previousStep.layerId
        )?.name,
        layerTag: useStudioStore.getState().frames[previousStep.frameIndex]?.layers.find(
          (layer) => layer.id === previousStep.layerId
        )?.tag,
        preserveLayerEffect: previousStep.preserveLayerEffect,
        layerEffect: (() => {
          const effect = useStudioStore.getState().frames[previousStep.frameIndex]?.layers.find(
            (layer) => layer.id === previousStep.layerId
          )?.effect;
          return effect ? structuredClone(effect) : undefined;
        })(),
      };
    }

    const stepToRestore = historyEngineRef.current.undo(currentStep);
    if (!stepToRestore) return;

    if (stepToRestore.type === 'structural') {
      const state = useStudioStore.getState();
      const targetWidth = stepToRestore.canvasWidth ?? state.canvasWidth;
      const targetHeight = stepToRestore.canvasHeight ?? state.canvasHeight;
      const targetFrames = stepToRestore.frames;

      restoreStructuralWorkspace({
        canvasWidth: targetWidth,
        canvasHeight: targetHeight,
        frames: targetFrames,
        activeFrameIndex: stepToRestore.activeFrameIndex,
        activeLayerId: stepToRestore.activeLayerId,
        layerBuffers: stepToRestore.layerBuffers,
      });
    } else {
      if (previousStep.type !== 'structural' && previousStep.createdLayerId) {
        const state = useStudioStore.getState();
        state.deleteLayer(previousStep.createdLayerId, true);
        deleteBuffers([previousStep.createdLayerId]);
      } else if (stepToRestore.imageData && stepToRestore.layerId) {
        const targetCanvas = getOrCreateLayerCanvas(stepToRestore.layerId);
        const targetCtx = targetCanvas.getContext('2d', { willReadFrequently: true });
        if (targetCtx) {
          targetCtx.putImageData(stepToRestore.imageData, stepToRestore.x ?? 0, stepToRestore.y ?? 0);
          touchBuffer(stepToRestore.layerId);
        }
        useStudioStore.setState((state) => {
          const layer = state.frames[stepToRestore.frameIndex]?.layers.find(
            (candidate) => candidate.id === stepToRestore.layerId
          );
          if (layer) {
            layer.name = stepToRestore.layerName ?? layer.name;
            layer.tag = stepToRestore.layerTag;
            layer.effect = stepToRestore.layerEffect
              ? structuredClone(stepToRestore.layerEffect)
              : undefined;
          }
        });
      }
    }

    setCanUndo(historyEngineRef.current.canUndo);
    setCanRedo(historyEngineRef.current.canRedo);
    renderComposite();
    bumpBufferVersion();
    useStudioStore.getState().setDirty(true);
  }, [bumpBufferVersion, canvasHeight, canvasWidth, getOrCreateLayerCanvas, getRedoCaptureLayerIds, renderComposite, setCanRedo, setCanUndo]);

  // Redo Action (Supports both Pixel and Structural steps)
  const performRedo = useCallback(() => {
    const nextStep = historyEngineRef.current.peekRedo();
    if (!nextStep) return;

    let currentStep: HistoryStep;

    if (nextStep.type === 'structural') {
      const state = useStudioStore.getState();
      const targetWidth = nextStep.canvasWidth ?? state.canvasWidth;
      const targetHeight = nextStep.canvasHeight ?? state.canvasHeight;
      const targetFrames = nextStep.frames;

      // Prevalidate structural target BEFORE mutating history stacks or workspace
      const validity = validateWorkspaceStructure(targetWidth, targetHeight, targetFrames);
      if (!validity.ok) {
        studioEvents.emit('pixibun:toast', {
          type: 'error',
          message: validity.reason || 'Structural redo target workspace exceeds envelope bounds.',
        });
        return;
      }

      currentStep = {
        type: 'structural',
        opKind: nextStep.opKind,
        description: nextStep.description,
        frameIndex: state.activeFrameIndex,
        frames: structuredClone(state.frames),
        activeFrameIndex: state.activeFrameIndex,
        activeLayerId: state.activeLayerId,
        canvasWidth: state.canvasWidth,
        canvasHeight: state.canvasHeight,
        layerBuffers: captureLayerBuffers(nextStep.affectedLayerIds ?? []),
        affectedLayerIds: nextStep.affectedLayerIds,
      };
    } else {
      const state = useStudioStore.getState();

      // When redoing a pixel-history step that would recreate a missing createdLayerId,
      // prospective-guard adding one layer to nextStep.frameIndex before mutating stacks, buffers, or state
      if (nextStep.createdLayerId) {
        const targetFrame = state.frames[nextStep.frameIndex];
        const layerExists = targetFrame?.layers.some((l) => l.id === nextStep.createdLayerId);
        if (!layerExists) {
          const capacity = canAddLayersToFrame(
            state.frames,
            nextStep.frameIndex,
            state.canvasWidth,
            state.canvasHeight,
            1
          );
          if (!capacity.ok) {
            studioEvents.emit('pixibun:toast', {
              type: 'error',
              message: capacity.reason || 'Redoing layer creation exceeds workspace envelope.',
            });
            return;
          }
        }
      }

      const currentLayerCanvas = getOrCreateLayerCanvas(nextStep.layerId);
      const ctx = currentLayerCanvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      const currentImgData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
      currentStep = {
        type: 'pixel',
        layerId: nextStep.layerId,
        frameIndex: nextStep.frameIndex,
        imageData: currentImgData,
        description: nextStep.description,
        createdLayerId: nextStep.createdLayerId,
        createdLayerTag: nextStep.createdLayerTag,
        createdLayerIndex: nextStep.createdLayerIndex,
        layerName: state.frames[nextStep.frameIndex]?.layers.find(
          (layer) => layer.id === nextStep.layerId
        )?.name,
        layerTag: state.frames[nextStep.frameIndex]?.layers.find(
          (layer) => layer.id === nextStep.layerId
        )?.tag,
        preserveLayerEffect: nextStep.preserveLayerEffect,
        layerEffect: (() => {
          const effect = state.frames[nextStep.frameIndex]?.layers.find(
            (layer) => layer.id === nextStep.layerId
          )?.effect;
          return effect ? structuredClone(effect) : undefined;
        })(),
      };
    }

    const stepToRestore = historyEngineRef.current.redo(currentStep);
    if (!stepToRestore) return;

    if (stepToRestore.type === 'structural') {
      const state = useStudioStore.getState();
      const targetWidth = stepToRestore.canvasWidth ?? state.canvasWidth;
      const targetHeight = stepToRestore.canvasHeight ?? state.canvasHeight;
      const targetFrames = stepToRestore.frames;

      restoreStructuralWorkspace({
        canvasWidth: targetWidth,
        canvasHeight: targetHeight,
        frames: targetFrames,
        activeFrameIndex: stepToRestore.activeFrameIndex,
        activeLayerId: stepToRestore.activeLayerId,
        layerBuffers: stepToRestore.layerBuffers,
      });
    } else {
      if (stepToRestore.createdLayerId) {
        const currentFrame = useStudioStore.getState().frames[stepToRestore.frameIndex];
        const exists = currentFrame?.layers.some((l) => l.id === stepToRestore.createdLayerId);
        if (!exists) {
          useStudioStore.setState((state) => {
            const frame = state.frames[stepToRestore.frameIndex];
            if (!frame) return;
            const recreatedLayer: Layer = {
              id: stepToRestore.createdLayerId!,
              name: stepToRestore.layerName ?? stepToRestore.description,
              visible: true,
              locked: false,
              opacity: 1,
              blendMode: 'source-over',
              ...(stepToRestore.createdLayerTag ? { tag: stepToRestore.createdLayerTag } : {}),
              ...(stepToRestore.layerEffect
                ? { effect: structuredClone(stepToRestore.layerEffect) }
                : {}),
            };
            const insertionIndex = Math.max(
              0,
              Math.min(stepToRestore.createdLayerIndex ?? 0, frame.layers.length)
            );
            frame.layers.splice(insertionIndex, 0, recreatedLayer);
            if (state.activeFrameIndex === stepToRestore.frameIndex) {
              state.activeLayerId = stepToRestore.createdLayerId!;
            }
          });
        }
      }

      if (stepToRestore.imageData && stepToRestore.layerId) {
        const targetCanvas = getOrCreateLayerCanvas(stepToRestore.layerId);
        const targetCtx = targetCanvas.getContext('2d', { willReadFrequently: true });
        if (targetCtx) {
          targetCtx.putImageData(stepToRestore.imageData, stepToRestore.x ?? 0, stepToRestore.y ?? 0);
          touchBuffer(stepToRestore.layerId);
        }
        useStudioStore.setState((state) => {
          const layer = state.frames[stepToRestore.frameIndex]?.layers.find(
            (candidate) => candidate.id === stepToRestore.layerId
          );
          if (layer) {
            layer.name = stepToRestore.layerName ?? layer.name;
            layer.tag = stepToRestore.layerTag;
            layer.effect = stepToRestore.layerEffect
              ? structuredClone(stepToRestore.layerEffect)
              : undefined;
          }
        });
      }
    }

    setCanUndo(historyEngineRef.current.canUndo);
    setCanRedo(historyEngineRef.current.canRedo);
    renderComposite();
    bumpBufferVersion();
    useStudioStore.getState().setDirty(true);
  }, [bumpBufferVersion, canvasHeight, canvasWidth, getOrCreateLayerCanvas, renderComposite, setCanRedo, setCanUndo]);

  // Draw points on active layer
  const drawPointsOnActiveLayer = useCallback(
    (points: Point[], color: string, isErase: boolean = false) => {
      const currentFrame = frames[activeFrameIndex];
      const targetLayerId = activeLayerId || currentFrame?.layers[0]?.id;
      if (!targetLayerId) return;

      const layerCanvas = getOrCreateLayerCanvas(targetLayerId);
      const ctx = layerCanvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      ctx.imageSmoothingEnabled = false;

      let allPoints = points;
      if (
        tools.symmetryHorizontal ||
        tools.symmetryVertical ||
        (tools.symmetryGroup && tools.symmetryGroup !== 'none')
      ) {
        allPoints = applySymmetry(
          points,
          canvasWidth,
          canvasHeight,
          tools.symmetryHorizontal,
          tools.symmetryVertical,
          tools.symmetryGroup
        );
      }

      const offset = Math.floor(tools.brushSize / 2);
      if (isErase) {
        ctx.globalCompositeOperation = 'destination-out';
        allPoints.forEach((p) => {
          ctx.fillRect(p.x - offset, p.y - offset, tools.brushSize, tools.brushSize);
        });
        ctx.globalCompositeOperation = 'source-over';
      } else {
        ctx.fillStyle = color;
        ctx.globalCompositeOperation = 'source-over';
        allPoints.forEach((p) => {
          ctx.fillRect(p.x - offset, p.y - offset, tools.brushSize, tools.brushSize);
        });
      }

      renderComposite();

      // Throttle bumpBufferVersion via requestAnimationFrame
      if (rafBufferBumpRef.current === null) {
        rafBufferBumpRef.current = requestAnimationFrame(() => {
          rafBufferBumpRef.current = null;
          useStudioStore.getState().bumpBufferVersion();
        });
      }
    },
    [
      activeFrameIndex,
      activeLayerId,
      canvasHeight,
      canvasWidth,
      frames,
      getOrCreateLayerCanvas,
      renderComposite,
      tools.brushSize,
      tools.symmetryGroup,
      tools.symmetryHorizontal,
      tools.symmetryVertical,
    ]
  );

  return {
    isDrawingRef,
    isDrawing,
    setIsDrawing,
    strokeStart,
    setStrokeStart,
    lastPoint,
    setLastPoint,
    cursorCoordsRef,
    lockedWarning,
    setLockedWarning,
    lockedWarningTimerRef,
    historyEngineRef,
    currentStrokeSnapshotRef,
    rafBufferBumpRef,
    captureSnapshot,
    commitSnapshot,
    discardSnapshot,
    performUndo,
    performRedo,
    drawPointsOnActiveLayer,
    primaryColor,
    secondaryColor,
    setPrimaryColor,
  };
}
