import { LayerSlice, StudioSliceCreator } from './types';
import { current } from 'immer';
import { Layer } from '@/types/canvas';
import { createId } from '@/lib/engine/id';
import { getOrCreateBuffer, cloneBuffers, deleteBuffers, touchBuffer } from '@/lib/engine/bufferRegistry';
import { pushStructuralHistoryStep } from '@/lib/engine/structuralHistory';
import { canAddLayersToFrame } from '@/lib/project/workspaceEnvelopeGuard';
import { studioEvents } from '@/lib/events/studioEvents';
import { makeLayerCopyName, metadataNameError } from '@/lib/project/metadataAdmission';

export const createLayerSlice: StudioSliceCreator<LayerSlice> = (set, get) => ({
  activeLayerId: 'layer-1',

  setActiveLayer: layerId => {
    if (!get().frames[get().activeFrameIndex]?.layers.some(layer => layer.id === layerId)) return;
    set(state => {
      state.activeLayerId = layerId;
    });
  },

  addLayer: (name, tag, idOverride, skipHistory) => {
    const currentStore = get();
    const frame = currentStore.frames[currentStore.activeFrameIndex];
    if (!frame) return;

    const nameError = name === undefined ? null : metadataNameError(name, 'layer');
    if (nameError) {
      studioEvents.emit('pixibun:toast', { type: 'error', message: nameError });
      return;
    }

    const capacity = canAddLayersToFrame(
      currentStore.frames,
      currentStore.activeFrameIndex,
      currentStore.canvasWidth,
      currentStore.canvasHeight,
      1
    );
    if (!capacity.ok) {
      studioEvents.emit('pixibun:toast', {
        message: capacity.reason || 'Cannot add layer: workspace capacity ceiling reached.',
        type: 'error',
      });
      return;
    }

    if (!skipHistory) {
      if (!pushStructuralHistoryStep('Add Layer', { opKind: 'add-layer', affectedLayerIds: [], redoBufferCount: 1, addedLayerCount: 1 })) return;
    }
    set(state => {
      const currentFrame = state.frames[state.activeFrameIndex];
      if (!currentFrame) return;

      const layerCount = currentFrame.layers.length + 1;
      const newLayerId = idOverride || createId('layer');
      const newLayer: Layer = {
        id: newLayerId,
        name: name || `Layer ${layerCount}`,
        visible: true,
        locked: false,
        opacity: 1,
        blendMode: 'source-over',
        ...(tag ? { tag } : {}),
      };

      currentFrame.layers.unshift(newLayer);
      state.activeLayerId = newLayerId;
      state.isDirty = true;
      state.editRevision += 1;
    });
  },

  deleteLayer: (layerId, skipHistory) => {
    const frame = get().frames[get().activeFrameIndex];
    if (!frame || frame.layers.length <= 1 || !frame.layers.some((layer) => layer.id === layerId)) return;
    if (!skipHistory) {
      if (!pushStructuralHistoryStep('Delete Layer', { opKind: 'delete-layer', affectedLayerIds: [layerId] })) return;
    }
    set(state => {
      const currentFrame = state.frames[state.activeFrameIndex];
      if (!currentFrame || currentFrame.layers.length <= 1) return;

      currentFrame.layers = currentFrame.layers.filter(l => l.id !== layerId);
      deleteBuffers([layerId]);
      if (state.activeLayerId === layerId) {
        state.activeLayerId = currentFrame.layers[0].id;
      }
      if (state.motionPart?.sourceLayerId === layerId) {
        state.motionPart = null;
        state.motionPreviewIndex = null;
      }
      state.isDirty = true;
      state.editRevision += 1;
    });
  },

  duplicateLayer: layerId => {
    const currentStore = get();
    const frame = currentStore.frames[currentStore.activeFrameIndex];
    if (!frame?.layers.some((layer) => layer.id === layerId)) return;

    const capacity = canAddLayersToFrame(
      currentStore.frames,
      currentStore.activeFrameIndex,
      currentStore.canvasWidth,
      currentStore.canvasHeight,
      1
    );
    if (!capacity.ok) {
      studioEvents.emit('pixibun:toast', {
        message: capacity.reason || 'Cannot duplicate layer: workspace capacity ceiling reached.',
        type: 'error',
      });
      return;
    }

    if (!pushStructuralHistoryStep('Duplicate Layer', { opKind: 'duplicate-layer', affectedLayerIds: [], redoBufferCount: 1, addedLayerCount: 1 })) return;
    set(state => {
      const currentFrame = state.frames[state.activeFrameIndex];
      if (!currentFrame) return;

      const idx = currentFrame.layers.findIndex(l => l.id === layerId);
      if (idx === -1) return;

      const src = currentFrame.layers[idx];
      const newLayerId = createId('layer');
      const duplicate: Layer = {
        ...src,
        id: newLayerId,
        name: makeLayerCopyName(src.name),
        effect: src.effect
          ? { ...structuredClone(current(src.effect)), id: createId('effect'), updatedAt: Date.now() }
          : undefined,
      };

      currentFrame.layers.splice(idx, 0, duplicate);
      cloneBuffers([layerId], [newLayerId], state.canvasWidth, state.canvasHeight);
      state.activeLayerId = newLayerId;
      state.isDirty = true;
      state.editRevision += 1;
    });
  },

  reorderLayers: (startIndex, endIndex) => {
    const frame = get().frames[get().activeFrameIndex];
    if (
      !frame ||
      startIndex < 0 ||
      startIndex >= frame.layers.length ||
      endIndex < 0 ||
      endIndex >= frame.layers.length ||
      startIndex === endIndex
    ) return;
    if (!pushStructuralHistoryStep('Reorder Layers', { opKind: 'reorder-layers', affectedLayerIds: [] })) return;
    set(state => {
      const currentFrame = state.frames[state.activeFrameIndex];
      if (!currentFrame) return;

      const [removed] = currentFrame.layers.splice(startIndex, 1);
      currentFrame.layers.splice(endIndex, 0, removed);
      state.isDirty = true;
      state.editRevision += 1;
    });
  },

  toggleLayerVisibility: layerId => {
    if (!get().frames[get().activeFrameIndex]?.layers.some((layer) => layer.id === layerId)) return;
    if (!pushStructuralHistoryStep('Toggle Layer Visibility')) return;
    set(state => {
      const currentFrame = state.frames[state.activeFrameIndex];
      if (!currentFrame) return;
      const layer = currentFrame.layers.find(l => l.id === layerId);
      if (layer) {
        layer.visible = !layer.visible;
        state.isDirty = true;
        state.editRevision += 1;
      }
    });
  },

  toggleLayerLock: layerId => {
    if (!get().frames[get().activeFrameIndex]?.layers.some((layer) => layer.id === layerId)) return;
    if (!pushStructuralHistoryStep('Toggle Layer Lock')) return;
    set(state => {
      const currentFrame = state.frames[state.activeFrameIndex];
      if (!currentFrame) return;
      const layer = currentFrame.layers.find(l => l.id === layerId);
      if (layer) {
        layer.locked = !layer.locked;
        state.isDirty = true;
        state.editRevision += 1;
      }
    });
  },

  setLayerOpacity: (layerId, opacity, skipHistory = false) => {
    if (!Number.isFinite(opacity)) return false;
    const layer = get().frames[get().activeFrameIndex]?.layers.find((candidate) => candidate.id === layerId);
    const nextOpacity = Math.max(0, Math.min(1, opacity));
    if (!layer || layer.opacity === nextOpacity) return false;
    if (!skipHistory && !pushStructuralHistoryStep('Change Layer Opacity')) return false;
    set(state => {
      const currentFrame = state.frames[state.activeFrameIndex];
      if (!currentFrame) return;
      const layer = currentFrame.layers.find(l => l.id === layerId);
      if (layer) {
        layer.opacity = nextOpacity;
        state.isDirty = true;
        state.editRevision += 1;
      }
    });
    return true;
  },

  setLayerBlendMode: (layerId, blendMode) => {
    const layer = get().frames[get().activeFrameIndex]?.layers.find((candidate) => candidate.id === layerId);
    if (!layer || layer.blendMode === blendMode) return;
    if (!pushStructuralHistoryStep('Change Layer Blend Mode')) return;
    set(state => {
      const currentFrame = state.frames[state.activeFrameIndex];
      if (!currentFrame) return;
      const layer = currentFrame.layers.find(l => l.id === layerId);
      if (layer) {
        layer.blendMode = blendMode;
        state.isDirty = true;
        state.editRevision += 1;
      }
    });
  },

  renameLayer: (layerId, name) => {
    const error = metadataNameError(name, 'layer');
    if (error) {
      studioEvents.emit('pixibun:toast', { type: 'error', message: error });
      return;
    }
    const layer = get().frames[get().activeFrameIndex]?.layers.find((candidate) => candidate.id === layerId);
    if (!layer || layer.name === name) return;
    if (!pushStructuralHistoryStep('Rename Layer')) return;
    set(state => {
      const currentFrame = state.frames[state.activeFrameIndex];
      if (!currentFrame) return;
      const layer = currentFrame.layers.find(l => l.id === layerId);
      if (layer) {
        layer.name = name;
        state.isDirty = true;
        state.editRevision += 1;
      }
    });
  },

  // Immutably assign/update a layer's tag. Must go through the Immer producer
  // because store state is frozen (autoFreeze) — direct mutation of a layer
  // object retrieved via getState() throws "object is not extensible".
  setLayerTag: (layerId, tag) => {
    const layer = get().frames[get().activeFrameIndex]?.layers.find((candidate) => candidate.id === layerId);
    if (!layer || layer.tag === tag) return;
    if (!pushStructuralHistoryStep('Change Layer Tag')) return;
    set(state => {
      const currentFrame = state.frames[state.activeFrameIndex];
      if (!currentFrame) return;
      const layer = currentFrame.layers.find(l => l.id === layerId);
      if (layer) {
        layer.tag = tag;
        state.isDirty = true;
        state.editRevision += 1;
      }
    });
  },

  setLayerEffect: (layerId, effect) => {
    if (!get().frames[get().activeFrameIndex]?.layers.some((layer) => layer.id === layerId)) return;
    if (!pushStructuralHistoryStep('Change Layer Effect')) return;
    set(state => {
      const currentFrame = state.frames[state.activeFrameIndex];
      if (!currentFrame) return;
      const layer = currentFrame.layers.find(l => l.id === layerId);
      if (layer) {
        layer.effect = effect ? structuredClone(effect) : undefined;
        state.isDirty = true;
        state.editRevision += 1;
      }
    });
  },

  mergeLayerDown: layerId => {
    const frame = get().frames[get().activeFrameIndex];
    const layerIndex = frame?.layers.findIndex((layer) => layer.id === layerId) ?? -1;
    if (!frame || frame.layers.length <= 1 || layerIndex < 0 || layerIndex >= frame.layers.length - 1) return;
    const upper = frame.layers[layerIndex];
    const lower = frame.layers[layerIndex + 1];
    if (upper.locked || lower.locked) return;
    const nonNormal = [upper, lower].find(layer => layer.visible && layer.opacity > 0 && layer.blendMode !== 'source-over');
    if (nonNormal) {
      const modeLabel = nonNormal.blendMode.charAt(0).toUpperCase() + nonNormal.blendMode.slice(1);
      studioEvents.emit('pixibun:toast', {
        type: 'error',
        message: `Cannot merge: "${nonNormal.name}" uses ${modeLabel} blending. Merge down requires Normal blending on both visible layers to preserve their appearance.`,
      });
      return;
    }
    const { canvasWidth: width, canvasHeight: height } = get();
    const merged = document.createElement('canvas');
    merged.width = width;
    merged.height = height;
    const mergeCtx = merged.getContext('2d', { willReadFrequently: true });
    if (!mergeCtx) return;
    mergeCtx.imageSmoothingEnabled = false;
    mergeCtx.globalCompositeOperation = 'source-over';
    for (const layer of [lower, upper]) {
      if (!layer.visible) continue;
      mergeCtx.globalAlpha = layer.opacity;
      mergeCtx.drawImage(getOrCreateBuffer(layer.id, width, height).canvas, 0, 0);
    }
    const mergedPixels = mergeCtx.getImageData(0, 0, width, height);
    if (!pushStructuralHistoryStep('Merge Down Layer', {
      opKind: 'merge-layer',
      affectedLayerIds: [upper.id, lower.id],
    })) return;
    set(state => {
      const currentFrame = state.frames[state.activeFrameIndex];
      if (!currentFrame || currentFrame.layers.length <= 1) return;

      const upperIndex = currentFrame.layers.findIndex(l => l.id === layerId);
      if (upperIndex === -1 || upperIndex >= currentFrame.layers.length - 1) {
        return;
      }

      const upper = currentFrame.layers[upperIndex];
      const lower = currentFrame.layers[upperIndex + 1];

      const lowerBuffer = getOrCreateBuffer(lower.id, state.canvasWidth, state.canvasHeight);
      lowerBuffer.ctx.putImageData(mergedPixels, 0, 0);
      touchBuffer(lower.id);
      lower.visible = upper.visible || lower.visible;
      lower.opacity = 1;
      lower.blendMode = 'source-over';
      // A merged raster is baked artwork, no longer the output of a single recipe.
      lower.tag = undefined;
      lower.effect = undefined;
      lower.research = undefined;

      currentFrame.layers.splice(upperIndex, 1);
      deleteBuffers([upper.id]);

      state.activeLayerId = lower.id;
      state.bufferVersion += 1;
      state.isDirty = true;
      state.editRevision += 1;
    });
    studioEvents.emit('pixibun:toast', {
      type: 'success',
      message: `Merged "${upper.name}" into "${lower.name}"`,
      action: {
        label: 'Undo',
        onClick: () => {
          studioEvents.emit('pixibun:undo');
        },
      },
    });
  },
});
