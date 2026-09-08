import { useEffect, useCallback, RefObject } from 'react';
import { useStudioStore } from '@/stores/studioStore';
import { studioEvents } from '@/lib/events/studioEvents';
import { rgbaToHex } from '@/lib/canvas/floodFill';
import { usePhotometricEvents } from './events/usePhotometricEvents';
import { useGeometricEvents } from './events/useGeometricEvents';
import { useArtisanEvents } from './events/useArtisanEvents';

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
    createdLayerTag?: string
  ) => void;
  commitSnapshot: () => void;
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
          if (
            excludeTag &&
            (layer.tag === excludeTag ||
              (excludeTag === 'photometric' &&
                (layer.tag === 'specular' ||
                  layer.tag === 'normal' ||
                  layer.tag === 'normal-map')))
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

      // If the base artwork (excluding the target tag) has content, ALWAYS use it
      if (nonTaggedPixels > 0) {
        sCtx.globalAlpha = 1.0;
        sCtx.globalCompositeOperation = 'source-over';
        return sCtx;
      }

      // 3. Fallback only if base artwork is completely empty: composite all visible layers
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
    (displayName: string, tag: string, drawFn: (ctx: CanvasRenderingContext2D) => void) => {
      const state = useStudioStore.getState();
      const currentFrame = state.frames[state.activeFrameIndex];
      if (!currentFrame) return;

      const previousActiveLayerId = state.activeLayerId;
      let targetLayerId: string;
      let isNewLayer = false;

      // Find existing tagged layer strictly by explicit tag
      const existing = currentFrame.layers.find((l) => l.tag === tag);

      if (existing) {
        targetLayerId = existing.id;
        if (existing.tag !== tag) {
          state.setLayerTag(targetLayerId, tag);
        }
        if (existing.name !== displayName) {
          state.renameLayer(targetLayerId, displayName);
        }
      } else {
        isNewLayer = true;
        state.addLayer(displayName, tag);
        const freshState = useStudioStore.getState();
        const freshFrame = freshState.frames[freshState.activeFrameIndex];
        const newLayer = freshFrame?.layers[0];
        if (!newLayer) return;
        targetLayerId = newLayer.id;

        if (tag === 'cast-shadow' || tag === 'ground-shadow') {
          const layerCount = freshFrame.layers.length;
          if (layerCount > 1) {
            freshState.reorderLayers(0, layerCount - 1);
          }
        }
      }

      // Prune any extraneous duplicate layers with the same tag
      const duplicateLayers = currentFrame.layers.filter(
        (l) => l.tag === tag && l.id !== targetLayerId
      );
      if (duplicateLayers.length > 0) {
        duplicateLayers.forEach((dup) => {
          state.deleteLayer(dup.id);
        });
      }

      captureSnapshot(displayName, targetLayerId, isNewLayer ? targetLayerId : undefined, tag);

      const lCanvas = getOrCreateLayerCanvas(targetLayerId);
      const lCtx = lCanvas.getContext('2d', { willReadFrequently: true });
      if (lCtx) {
        lCtx.imageSmoothingEnabled = false;
        lCtx.clearRect(0, 0, canvasWidth, canvasHeight);
        drawFn(lCtx);
      }

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
    performUndo,
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
