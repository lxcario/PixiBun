import { useState, useRef, useCallback, useEffect } from 'react';
import { Point, applySymmetry } from '@/lib/canvas/rasterMath';
import { createHistoryEngine, HistoryEngine, setGlobalHistoryEngine, getGlobalHistoryEngine, readViewportHistory, rememberViewportHistory } from '@/lib/engine/historyEngine';
import { HistoryStep, Layer } from '@/types/canvas';
import { deleteBuffers, touchBuffer } from '@/lib/engine/bufferRegistry';
import { captureLayerBuffers, restoreStructuralWorkspace, estimateRestorationAllocation } from '@/lib/engine/structuralHistory';
import { canAddLayersToFrame, validateWorkspaceStructure } from '@/lib/project/workspaceEnvelopeGuard';
import { useStudioStore } from '@/stores/studioStore';
import { coDrawBridge } from '@/lib/sync/coDrawBridge';
import { studioEvents } from '@/lib/events/studioEvents';
import { assertMemoryAvailable } from '@/lib/safety/memoryBudget';
import { estimateClipBytes } from '@/lib/animation/reviewMetadata';
import { estimatePaletteBytes } from '@/lib/color/paletteSemantics';

interface UseViewportDrawingProps {
  canvasWidth: number;
  canvasHeight: number;
  renderComposite: () => void;
  getOrCreateLayerCanvas: (layerId: string) => HTMLCanvasElement;
  onCommitHistory?: () => void;
  retainHistory?: boolean;
}

export function useViewportDrawing({
  canvasWidth,
  canvasHeight,
  renderComposite,
  getOrCreateLayerCanvas,
  onCommitHistory,
  retainHistory = false,
}: UseViewportDrawingProps) {
  const isDrawingRef = useRef(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokeStart, setStrokeStart] = useState<Point | null>(null);
  const [lastPoint, setLastPoint] = useState<Point | null>(null);
  const cursorCoordsRef = useRef<Point | null>(null);

  const [lockedWarning, setLockedWarning] = useState(false);
  const lockedWarningTimerRef = useRef<number | null>(null);

  const [historyEngine] = useState(() => retainHistory ? readViewportHistory(useStudioStore.getState().currentProjectId) : createHistoryEngine(50));
  const historyEngineRef = useRef<HistoryEngine>(historyEngine);
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
    const engine = historyEngineRef.current;
    setGlobalHistoryEngine(engine);
    if (retainHistory) rememberViewportHistory(useStudioStore.getState().currentProjectId, engine);

    // Event listener: Clear history when project changes or a new drawing is opened
    const handleHistoryClear = () => {
      if (engine) {
        engine.clear();
      }
      currentStrokeSnapshotRef.current = null;
      setCanUndo(false);
      setCanRedo(false);
    };

    const unsub = studioEvents.on('pixibun:history-clear', handleHistoryClear);

    return () => {
      unsub();
      if (retainHistory) rememberViewportHistory(useStudioStore.getState().currentProjectId, engine);
      if (getGlobalHistoryEngine() === engine) setGlobalHistoryEngine(null);
      if (rafBufferBumpRef.current !== null) {
        cancelAnimationFrame(rafBufferBumpRef.current);
      }
    };
  }, [retainHistory, setCanUndo, setCanRedo]);

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
        layerBlendMode: targetLayer?.blendMode,
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
  const admitHistoryTransition = useCallback((step: HistoryStep, inverseIds: string[]) => {
    const state = useStudioStore.getState();
    const inverseBytes = (step.type === 'structural' ? new Set(inverseIds).size : 1) * state.canvasWidth * state.canvasHeight * 4;
    const metadataBytes = state.frames.reduce((sum, frame) => sum + 256 + frame.layers.length * 256, 1024) +
      state.clips.reduce((sum, clip) => sum + estimateClipBytes(clip), 0) +
      (step.type === 'structural' && step.palettes ? state.palettes.reduce((sum, palette) => sum + estimatePaletteBytes(palette), 0) : 0);
    const stagingBytes = step.type === 'structural' ? estimateRestorationAllocation({
      canvasWidth: step.canvasWidth ?? state.canvasWidth, canvasHeight: step.canvasHeight ?? state.canvasHeight,
      frames: step.frames, activeFrameIndex: step.activeFrameIndex, activeLayerId: step.activeLayerId, layerBuffers: step.layerBuffers,
    }) : state.canvasWidth * state.canvasHeight * 4;
    try { assertMemoryAvailable(inverseBytes + metadataBytes + stagingBytes, 'Undo/redo transition'); return true; }
    catch (error) { studioEvents.emit('pixibun:toast', { type: 'error', message: (error as Error).message }); return false; }
  }, []);

  const performUndo = useCallback(() => {
    const previousStep = historyEngineRef.current.peekUndo();
    if (!previousStep) return;
    if (!admitHistoryTransition(previousStep, previousStep.type === 'structural' ? getRedoCaptureLayerIds(previousStep, useStudioStore.getState()) : [])) return;

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
        ...(previousStep.palettes ? { palettes: structuredClone(state.palettes), currentPaletteId: state.currentPaletteId } : {}),
        description: previousStep.description,
        frameIndex: state.activeFrameIndex,
        frames: structuredClone(state.frames),
        clips: structuredClone(state.clips),
        activeClipId: state.activeClipId,
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
        layerBlendMode: useStudioStore.getState().frames[previousStep.frameIndex]?.layers.find(
          layer => layer.id === previousStep.layerId
        )?.blendMode,
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
        clips: stepToRestore.clips,
        palettes: stepToRestore.palettes,
        currentPaletteId: stepToRestore.currentPaletteId,
        activeClipId: stepToRestore.activeClipId,
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
            if (stepToRestore.layerBlendMode) layer.blendMode = stepToRestore.layerBlendMode;
            layer.effect = stepToRestore.layerEffect
              ? structuredClone(stepToRestore.layerEffect)
              : undefined;
          }
        });
      }
    }

    if (currentStep.type !== 'structural' && currentStep.imageData) {
      coDrawBridge.notifyStrokeCommitted(currentStep.layerId, currentStep.imageData);
    }
    setCanUndo(historyEngineRef.current.canUndo);
    setCanRedo(historyEngineRef.current.canRedo);
    renderComposite();
    bumpBufferVersion();
    useStudioStore.getState().setDirty(true);
  }, [admitHistoryTransition, bumpBufferVersion, canvasHeight, canvasWidth, getOrCreateLayerCanvas, getRedoCaptureLayerIds, renderComposite, setCanRedo, setCanUndo]);

  // Redo Action (Supports both Pixel and Structural steps)
  const performRedo = useCallback(() => {
    const nextStep = historyEngineRef.current.peekRedo();
    if (!nextStep) return;
    if (!admitHistoryTransition(nextStep, nextStep.type === 'structural' ? nextStep.affectedLayerIds ?? [] : [])) return;

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
        ...(nextStep.palettes ? { palettes: structuredClone(state.palettes), currentPaletteId: state.currentPaletteId } : {}),
        description: nextStep.description,
        frameIndex: state.activeFrameIndex,
        frames: structuredClone(state.frames),
        clips: structuredClone(state.clips),
        activeClipId: state.activeClipId,
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
        layerBlendMode: state.frames[nextStep.frameIndex]?.layers.find(
          layer => layer.id === nextStep.layerId
        )?.blendMode,
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
        clips: stepToRestore.clips,
        palettes: stepToRestore.palettes,
        currentPaletteId: stepToRestore.currentPaletteId,
        activeClipId: stepToRestore.activeClipId,
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
              blendMode: stepToRestore.layerBlendMode ?? 'source-over',
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
            if (stepToRestore.layerBlendMode) layer.blendMode = stepToRestore.layerBlendMode;
            layer.effect = stepToRestore.layerEffect
              ? structuredClone(stepToRestore.layerEffect)
              : undefined;
          }
        });
      }
    }

    if (currentStep.type !== 'structural' && currentStep.imageData) {
      coDrawBridge.notifyStrokeCommitted(currentStep.layerId, currentStep.imageData);
    }
    setCanUndo(historyEngineRef.current.canUndo);
    setCanRedo(historyEngineRef.current.canRedo);
    renderComposite();
    bumpBufferVersion();
    useStudioStore.getState().setDirty(true);
  }, [admitHistoryTransition, bumpBufferVersion, canvasHeight, canvasWidth, getOrCreateLayerCanvas, renderComposite, setCanRedo, setCanUndo]);

  // Draw points on active layer
  const drawPointsOnActiveLayer = useCallback(
    (points: Point[], color: string, isErase: boolean = false, refresh: boolean = true) => {
      const currentFrame = frames[activeFrameIndex];
      const targetLayerId = activeLayerId || currentFrame?.layers[0]?.id;
      if (!targetLayerId || !currentFrame?.layers.some(layer => layer.id === targetLayerId && !layer.locked)) return;

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

      if (refresh) renderComposite();

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

  const drawProvisionalPoint = useCallback((point: Point, color: string, isErase: boolean) => {
    const frame = useStudioStore.getState().frames[activeFrameIndex];
    const layerId = activeLayerId || frame?.layers[0]?.id;
    if (!layerId || !frame?.layers.some(layer => layer.id === layerId && !layer.locked)) return;
    const ctx = getOrCreateLayerCanvas(layerId).getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    const points = applySymmetry([point], canvasWidth, canvasHeight, tools.symmetryHorizontal, tools.symmetryVertical, tools.symmetryGroup);
    const offset = Math.floor(tools.brushSize / 2);
    // Capture all footprints before painting, including overlapping symmetry stamps.
    const originals = points.flatMap(p => {
      const x = Math.max(0, p.x - offset), y = Math.max(0, p.y - offset);
      const w = Math.min(canvasWidth, p.x - offset + tools.brushSize) - x;
      const h = Math.min(canvasHeight, p.y - offset + tools.brushSize) - y;
      return w > 0 && h > 0 ? [{ x, y, pixels: ctx.getImageData(x, y, w, h) }] : [];
    });
    drawPointsOnActiveLayer([point], color, isErase, false);
    return () => {
      for (const original of originals) ctx.putImageData(original.pixels, original.x, original.y);
    };
  }, [activeFrameIndex, activeLayerId, canvasHeight, canvasWidth, drawPointsOnActiveLayer, getOrCreateLayerCanvas, tools.brushSize, tools.symmetryGroup, tools.symmetryHorizontal, tools.symmetryVertical]);

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
    drawProvisionalPoint,
    finishBrushBatch: renderComposite,
    primaryColor,
    secondaryColor,
    setPrimaryColor,
  };
}
