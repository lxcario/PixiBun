import { useEffect, useCallback, RefObject } from 'react';
import { useStudioStore } from '@/stores/studioStore';
import { studioEvents } from '@/lib/events/studioEvents';
import { rgbaToHex } from '@/lib/canvas/floodFill';
import { usePhotometricEvents } from './events/usePhotometricEvents';
import { useGeometricEvents } from './events/useGeometricEvents';
import { useArtisanEvents } from './events/useArtisanEvents';
import { createId } from '@/lib/engine/id';
import type { LayerEffectDescriptor } from '@/types/canvas';
import { canAddLayersToFrame } from '@/lib/project/workspaceEnvelopeGuard';

interface UseViewportStudioEventsProps {
  mainCanvasRef: RefObject<HTMLCanvasElement | null>;
  canvasWidth: number;
  canvasHeight: number;
  activeLayerId: string;
  getOrCreateLayerCanvas: (layerId: string) => HTMLCanvasElement;
  renderComposite: () => void;
  captureSnapshot: (
    description: string,
    overrideLayerId?: string,
    createdLayerId?: string,
    createdLayerTag?: string,
    preserveLayerEffect?: boolean,
    createdLayerIndex?: number
  ) => void;
  commitSnapshot: () => void;
  discardSnapshot: () => void;
  performUndo: () => void;
  performRedo: () => void;
}

export function useViewportStudioEvents({
  mainCanvasRef,
  canvasWidth,
  canvasHeight,
  activeLayerId,
  getOrCreateLayerCanvas,
  renderComposite,
  captureSnapshot,
  commitSnapshot,
  discardSnapshot,
  performUndo,
  performRedo,
}: UseViewportStudioEventsProps) {
  const addExtractedPalette = useStudioStore((s) => s.addExtractedPalette);
  const bumpBufferVersion = useStudioStore((s) => s.bumpBufferVersion);

  // Helper: composite source snapshot of all layers excluding tagged target
  const compositeSourceSnapshot = useCallback(
    (excludeTag?: string): CanvasRenderingContext2D | null => {
      const state = useStudioStore.getState();
      const currentFrame = state.frames[state.activeFrameIndex];
      if (!currentFrame) return null;

      const scratch = document.createElement('canvas');
      scratch.width = canvasWidth;
      scratch.height = canvasHeight;
      const sCtx = scratch.getContext('2d', { willReadFrequently: true });
      if (!sCtx) return null;
      sCtx.imageSmoothingEnabled = false;

      // 1. Composite excluding the tag (base artwork)
      currentFrame.layers
        .slice()
        .reverse()
        .forEach((layer) => {
          if (!layer.visible) return;
          const photometricAuxiliaryLayer =
            excludeTag === 'photometric' &&
            (layer.tag === 'auto-shade' ||
              layer.tag === 'specular' ||
              layer.tag === 'normal' ||
              layer.tag === 'normal-map' ||
              layer.tag === 'cast-shadow' ||
              layer.tag === 'ground-shadow' ||
              layer.tag === 'optical-output' ||
              layer.tag === 'sel-out' ||
              layer.tag === 'auto-outline');
          if (
            excludeTag &&
            (layer.tag === excludeTag || photometricAuxiliaryLayer)
          ) {
            return;
          }
          const lCanvas = getOrCreateLayerCanvas(layer.id);
          sCtx.globalAlpha = layer.opacity;
          sCtx.globalCompositeOperation = layer.blendMode;
          sCtx.drawImage(lCanvas, 0, 0);
        });

      // 2. Count opaque pixels in the non-tagged composite
      const nonTaggedData = sCtx.getImageData(0, 0, canvasWidth, canvasHeight).data;
      let nonTaggedPixels = 0;
      for (let i = 3; i < nonTaggedData.length; i += 4) {
        if (nonTaggedData[i] > 20) nonTaggedPixels++;
      }

      // A generator must never analyze its own cached output. If an explicit
      // target tag was excluded and no authored source remains, return the
      // empty source rather than recursively baking the old effect into itself.
      if (nonTaggedPixels > 0 || excludeTag) {
        sCtx.globalAlpha = 1.0;
        sCtx.globalCompositeOperation = 'source-over';
        return sCtx;
      }

      // 3. Untargeted tools may still fall back to the complete visible composite.
      const fullScratch = document.createElement('canvas');
      fullScratch.width = canvasWidth;
      fullScratch.height = canvasHeight;
      const fullCtx = fullScratch.getContext('2d', { willReadFrequently: true });
      if (!fullCtx) return sCtx;
      fullCtx.imageSmoothingEnabled = false;

      currentFrame.layers
        .slice()
        .reverse()
        .forEach((layer) => {
          if (!layer.visible) return;
          const lCanvas = getOrCreateLayerCanvas(layer.id);
          fullCtx.globalAlpha = layer.opacity;
          fullCtx.globalCompositeOperation = layer.blendMode;
          fullCtx.drawImage(lCanvas, 0, 0);
        });

      fullCtx.globalAlpha = 1.0;
      fullCtx.globalCompositeOperation = 'source-over';
      return fullCtx;
    },
    [canvasHeight, canvasWidth, getOrCreateLayerCanvas]
  );

  // Helper: composite manual normal sculpt layers (e.g. tag === 'normal')
  const compositeNormalMapSnapshot = useCallback((): ImageData | null => {
    const state = useStudioStore.getState();
    const currentFrame = state.frames[state.activeFrameIndex];
    if (!currentFrame) return null;

    const normalLayers = currentFrame.layers.filter(
      (l) => l.visible && (l.tag === 'normal' || l.tag === 'normal-map')
    );
    if (normalLayers.length === 0) return null;

    const scratch = document.createElement('canvas');
    scratch.width = canvasWidth;
    scratch.height = canvasHeight;
    const sCtx = scratch.getContext('2d', { willReadFrequently: true });
    if (!sCtx) return null;
    sCtx.imageSmoothingEnabled = false;

    normalLayers
      .slice()
      .reverse()
      .forEach((layer) => {
        const lCanvas = getOrCreateLayerCanvas(layer.id);
        sCtx.globalAlpha = layer.opacity;
        sCtx.globalCompositeOperation = layer.blendMode;
        sCtx.drawImage(lCanvas, 0, 0);
      });

    return sCtx.getImageData(0, 0, canvasWidth, canvasHeight);
  }, [canvasHeight, canvasWidth, getOrCreateLayerCanvas]);

  // Helper: write AI generated content to a dedicated tagged layer
  const updateTaggedLayer = useCallback(
    (
      displayName: string,
      tag: string,
      drawFn: (ctx: CanvasRenderingContext2D) => void,
      effect?: LayerEffectDescriptor
    ) => {
      const state = useStudioStore.getState();
      const currentFrame = state.frames[state.activeFrameIndex];
      if (!currentFrame) return;

      const previousActiveLayerId = state.activeLayerId;
      let targetLayerId: string;
      let targetLayerIndex: number;

      // Find existing tagged layer strictly by explicit tag
      const existing = currentFrame.layers.find((l) => l.tag === tag);

      if (existing) {
        targetLayerId = existing.id;
        targetLayerIndex = currentFrame.layers.findIndex((layer) => layer.id === targetLayerId);
        // Capture raster and metadata before changing the generated layer so a
        // single undo restores the complete pre-command state.
        captureSnapshot(displayName, targetLayerId, undefined, tag, true, targetLayerIndex);
      } else {
        const capacity = canAddLayersToFrame(
          state.frames,
          state.activeFrameIndex,
          canvasWidth,
          canvasHeight,
          1
        );
        if (!capacity.ok) {
          studioEvents.emit('pixibun:toast', {
            message: capacity.reason || 'Cannot create shadow layer: workspace capacity ceiling reached.',
            type: 'error',
          });
          return;
        }

        targetLayerId = createId('layer');
        targetLayerIndex = tag === 'cast-shadow' || tag === 'ground-shadow'
          ? currentFrame.layers.length
          : 0;
        useStudioStore.setState((draft) => {
          const frame = draft.frames[draft.activeFrameIndex];
          if (!frame) return;
          frame.layers.splice(targetLayerIndex, 0, {
            id: targetLayerId,
            name: displayName,
            visible: true,
            locked: false,
            opacity: 1,
            blendMode: 'source-over',
            tag,
          });
          draft.activeLayerId = targetLayerId;
        });
        captureSnapshot(displayName, targetLayerId, targetLayerId, tag, true, targetLayerIndex);
      }

      const lCanvas = getOrCreateLayerCanvas(targetLayerId);
      const lCtx = lCanvas.getContext('2d', { willReadFrequently: true });
      if (lCtx) {
        lCtx.imageSmoothingEnabled = false;
        lCtx.clearRect(0, 0, canvasWidth, canvasHeight);
        drawFn(lCtx);
      }

      useStudioStore.setState((draft) => {
        const layer = draft.frames[draft.activeFrameIndex]?.layers.find(
          (candidate) => candidate.id === targetLayerId
        );
        if (!layer) return;
        layer.name = displayName;
        layer.tag = tag;
        layer.effect = effect
          ? {
              ...structuredClone(effect),
              id: existing?.effect?.id ?? effect.id ?? createId('effect'),
              updatedAt: effect.updatedAt ?? Date.now(),
            }
          : undefined;
      });

      commitSnapshot();
      renderComposite();
      bumpBufferVersion();

      if (previousActiveLayerId && previousActiveLayerId !== targetLayerId) {
        useStudioStore.getState().setActiveLayer(previousActiveLayerId);
      }
    },
    [
      bumpBufferVersion,
      canvasHeight,
      canvasWidth,
      captureSnapshot,
      commitSnapshot,
      getOrCreateLayerCanvas,
      renderComposite,
    ]
  );

  // Mount domain event hooks
  usePhotometricEvents({
    canvasWidth,
    canvasHeight,
    activeLayerId,
    getOrCreateLayerCanvas,
    renderComposite,
    captureSnapshot,
    commitSnapshot,
    bumpBufferVersion,
    compositeSourceSnapshot,
    updateTaggedLayer,
    compositeNormalMapSnapshot,
    discardSnapshot,
  });

  useGeometricEvents({
    canvasWidth,
    canvasHeight,
    activeLayerId,
    getOrCreateLayerCanvas,
    renderComposite,
    captureSnapshot,
    commitSnapshot,
    bumpBufferVersion,
    compositeSourceSnapshot,
    updateTaggedLayer,
  });

  useArtisanEvents({
    canvasWidth,
    canvasHeight,
    activeLayerId,
    getOrCreateLayerCanvas,
    renderComposite,
    captureSnapshot,
    commitSnapshot,
    bumpBufferVersion,
    compositeSourceSnapshot,
    updateTaggedLayer,
  });

  // Core session undo, redo, and palette extraction listeners
  useEffect(() => {
    const handleUndoEvent = () => performUndo();
    const handleRedoEvent = () => performRedo();

    const handleExtractPaletteEvent = () => {
      const mainCanvas = mainCanvasRef.current;
      if (!mainCanvas) return;
      const ctx = mainCanvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      const imgData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
      const data = imgData.data;
      const uniqueColors = new Set<string>();

      for (let i = 0; i < data.length; i += 4) {
        const a = data[i + 3];
        if (a > 30) {
          const hex = rgbaToHex(data[i], data[i + 1], data[i + 2], a);
          uniqueColors.add(hex);
        }
      }

      const colorsArr = Array.from(uniqueColors);
      if (colorsArr.length > 0) {
        addExtractedPalette(`Extracted (${colorsArr.length})`, colorsArr);
      }
    };

    const unsubs = [
      studioEvents.on('pixibun:undo', handleUndoEvent),
      studioEvents.on('pixibun:redo', handleRedoEvent),
      studioEvents.on('pixibun:extract-palette', handleExtractPaletteEvent),
    ];

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [
    addExtractedPalette,
    canvasHeight,
    canvasWidth,
    mainCanvasRef,
    performRedo,
    performUndo,
  ]);
}
