'use client';

import { useRef, useCallback } from 'react';
import { createHistoryEngine, HistoryEngine, HistoryStep } from '@/lib/engine/historyEngine';

interface UseHistoryStackProps {
  activeLayerId: string;
  activeFrameIndex: number;
  canvasWidth: number;
  canvasHeight: number;
  getLayerCanvas: (layerId: string) => HTMLCanvasElement;
  renderComposite: () => void;
  bumpBufferVersion: () => void;
  setCanUndo: (can: boolean) => void;
  setCanRedo: (can: boolean) => void;
  onCommitHistory?: () => void;
}

export function useHistoryStack({
  activeLayerId,
  activeFrameIndex,
  canvasWidth,
  canvasHeight,
  getLayerCanvas,
  renderComposite,
  bumpBufferVersion,
  setCanUndo,
  setCanRedo,
  onCommitHistory,
}: UseHistoryStackProps) {
  const historyEngineRef = useRef<HistoryEngine>(createHistoryEngine(50));
  const currentStrokeSnapshotRef = useRef<HistoryStep | null>(null);

  const takeSnapshot = useCallback(
    (description: string = 'Stroke') => {
      const currentLayerCanvas = getLayerCanvas(activeLayerId);
      const ctx = currentLayerCanvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      const imgData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
      currentStrokeSnapshotRef.current = {
        layerId: activeLayerId,
        frameIndex: activeFrameIndex,
        imageData: imgData,
        description,
      };
    },
    [activeFrameIndex, activeLayerId, canvasWidth, canvasHeight, getLayerCanvas]
  );

  const commitSnapshot = useCallback(() => {
    if (currentStrokeSnapshotRef.current) {
      historyEngineRef.current.push(currentStrokeSnapshotRef.current);
      currentStrokeSnapshotRef.current = null;
      setCanUndo(historyEngineRef.current.canUndo);
      setCanRedo(historyEngineRef.current.canRedo);
      onCommitHistory?.();
    }
  }, [onCommitHistory, setCanRedo, setCanUndo]);

  const performUndo = useCallback(() => {
    const previousStep = historyEngineRef.current.peekUndo();
    if (!previousStep) return;

    const currentLayerCanvas = getLayerCanvas(previousStep.layerId);
    const ctx = currentLayerCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const currentImgData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
    const currentStep: HistoryStep = {
      layerId: previousStep.layerId,
      frameIndex: previousStep.frameIndex,
      imageData: currentImgData,
      description: previousStep.description,
    };

    const stepToRestore = historyEngineRef.current.undo(currentStep);
    if (!stepToRestore) return;

    ctx.putImageData(stepToRestore.imageData, 0, 0);

    setCanUndo(historyEngineRef.current.canUndo);
    setCanRedo(historyEngineRef.current.canRedo);
    renderComposite();
    bumpBufferVersion();
  }, [bumpBufferVersion, canvasWidth, canvasHeight, getLayerCanvas, renderComposite, setCanRedo, setCanUndo]);

  const performRedo = useCallback(() => {
    const nextStep = historyEngineRef.current.peekRedo();
    if (!nextStep) return;

    const currentLayerCanvas = getLayerCanvas(nextStep.layerId);
    const ctx = currentLayerCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const currentImgData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
    const currentStep: HistoryStep = {
      layerId: nextStep.layerId,
      frameIndex: nextStep.frameIndex,
      imageData: currentImgData,
      description: nextStep.description,
    };

    const stepToRestore = historyEngineRef.current.redo(currentStep);
    if (!stepToRestore) return;

    ctx.putImageData(stepToRestore.imageData, 0, 0);

    setCanUndo(historyEngineRef.current.canUndo);
    setCanRedo(historyEngineRef.current.canRedo);
    renderComposite();
    bumpBufferVersion();
  }, [bumpBufferVersion, canvasWidth, canvasHeight, getLayerCanvas, renderComposite, setCanRedo, setCanUndo]);

  const clearHistory = useCallback(() => {
    historyEngineRef.current.clear();
    currentStrokeSnapshotRef.current = null;
    setCanUndo(false);
    setCanRedo(false);
  }, [setCanRedo, setCanUndo]);

  return {
    historyEngineRef,
    takeSnapshot,
    commitSnapshot,
    performUndo,
    performRedo,
    clearHistory,
  };
}
