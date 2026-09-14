import { useState, useRef, useCallback, useEffect } from 'react';
import { Point, applySymmetry } from '@/lib/canvas/rasterMath';
import { createHistoryEngine, HistoryEngine, setGlobalHistoryEngine } from '@/lib/engine/historyEngine';
import { HistoryStep } from '@/types/canvas';
import { deleteBuffers, getOrCreateBuffer } from '@/lib/engine/bufferRegistry';
import { captureProjectBuffers } from '@/lib/engine/structuralHistory';
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
      createdLayerTag?: string
    ) => {
      const targetLayerId = overrideLayerId || activeLayerId;
      const currentLayerCanvas = getOrCreateLayerCanvas(targetLayerId);
      const ctx = currentLayerCanvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      const imgData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
      currentStrokeSnapshotRef.current = {
        type: 'pixel',
        layerId: targetLayerId,
        frameIndex: activeFrameIndex,
        imageData: imgData,
        description,
        createdLayerId,
        createdLayerTag,
      };
    },
    [activeFrameIndex, activeLayerId, canvasWidth, canvasHeight, getOrCreateLayerCanvas]
  );

  // Commit Undo Snapshot to Stack
  const commitSnapshot = useCallback(() => {
    if (currentStrokeSnapshotRef.current) {
      const snapshot = currentStrokeSnapshotRef.current;
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

  // Undo Action (Supports both Pixel and Structural steps)
  const performUndo = useCallback(() => {
    const previousStep = historyEngineRef.current.peekUndo();
    if (!previousStep) return;

    let currentStep: HistoryStep;

    if (previousStep.type === 'structural') {
      const state = useStudioStore.getState();
      currentStep = {
        type: 'structural',
        description: previousStep.description,
        frameIndex: state.activeFrameIndex,
        frames: JSON.parse(JSON.stringify(state.frames)),
        activeFrameIndex: state.activeFrameIndex,
        activeLayerId: state.activeLayerId,
        layerBuffers: captureProjectBuffers(),
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
      };
    }

    const stepToRestore = historyEngineRef.current.undo(currentStep);
    if (!stepToRestore) return;

    if (stepToRestore.type === 'structural') {
      useStudioStore.setState({
        frames: stepToRestore.frames,
        activeFrameIndex: Math.min(stepToRestore.activeFrameIndex, Math.max(0, stepToRestore.frames.length - 1)),
        activeLayerId: stepToRestore.activeLayerId,
      });
      if (stepToRestore.layerBuffers) {
        for (const buf of stepToRestore.layerBuffers) {
          const entry = getOrCreateBuffer(buf.layerId, canvasWidth, canvasHeight);
          entry.ctx.putImageData(buf.imageData, 0, 0);
        }
      }
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
        }
      }
    }

    setCanUndo(historyEngineRef.current.canUndo);
    setCanRedo(historyEngineRef.current.canRedo);
    renderComposite();
    bumpBufferVersion();
  }, [bumpBufferVersion, canvasHeight, canvasWidth, getOrCreateLayerCanvas, renderComposite, setCanRedo, setCanUndo]);

  // Redo Action (Supports both Pixel and Structural steps)
  const performRedo = useCallback(() => {
    const nextStep = historyEngineRef.current.peekRedo();
    if (!nextStep) return;

    let currentStep: HistoryStep;

    if (nextStep.type === 'structural') {
      const state = useStudioStore.getState();
      currentStep = {
        type: 'structural',
        description: nextStep.description,
        frameIndex: state.activeFrameIndex,
        frames: JSON.parse(JSON.stringify(state.frames)),
        activeFrameIndex: state.activeFrameIndex,
        activeLayerId: state.activeLayerId,
        layerBuffers: captureProjectBuffers(),
      };
    } else {
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
      };
    }

    const stepToRestore = historyEngineRef.current.redo(currentStep);
    if (!stepToRestore) return;

    if (stepToRestore.type === 'structural') {
      useStudioStore.setState({
        frames: stepToRestore.frames,
        activeFrameIndex: Math.min(stepToRestore.activeFrameIndex, Math.max(0, stepToRestore.frames.length - 1)),
        activeLayerId: stepToRestore.activeLayerId,
      });
      if (stepToRestore.layerBuffers) {
        for (const buf of stepToRestore.layerBuffers) {
          const entry = getOrCreateBuffer(buf.layerId, canvasWidth, canvasHeight);
          entry.ctx.putImageData(buf.imageData, 0, 0);
        }
      }
    } else {
      if (stepToRestore.createdLayerId) {
        const currentFrame = useStudioStore.getState().frames[stepToRestore.frameIndex];
        const exists = currentFrame?.layers.some((l) => l.id === stepToRestore.createdLayerId);
        if (!exists) {
          useStudioStore.setState((state) => {
            const frame = state.frames[stepToRestore.frameIndex];
            if (!frame) return;
            frame.layers.unshift({
              id: stepToRestore.createdLayerId!,
              name: stepToRestore.description,
              visible: true,
              locked: false,
              opacity: 1,
              blendMode: 'source-over',
              ...(stepToRestore.createdLayerTag ? { tag: stepToRestore.createdLayerTag } : {}),
            });
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
        }
      }
    }

    setCanUndo(historyEngineRef.current.canUndo);
    setCanRedo(historyEngineRef.current.canRedo);
    renderComposite();
    bumpBufferVersion();
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
    performUndo,
    performRedo,
    drawPointsOnActiveLayer,
    primaryColor,
    secondaryColor,
    setPrimaryColor,
  };
}
