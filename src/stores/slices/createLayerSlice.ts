import { LayerSlice, StudioSliceCreator } from './types';
import { Layer } from '@/types/canvas';
import { createId } from '@/lib/engine/id';
import { getOrCreateBuffer, cloneBuffers, deleteBuffers } from '@/lib/engine/bufferRegistry';
import { pushStructuralHistoryStep } from '@/lib/engine/structuralHistory';

export const createLayerSlice: StudioSliceCreator<LayerSlice> = (set, get) => ({
  activeLayerId: 'layer-1',

  setActiveLayer: layerId => {
    set(state => {
      state.activeLayerId = layerId;
    });
  },

  addLayer: (name, tag, idOverride) => {
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
    if (!skipHistory) pushStructuralHistoryStep('Delete Layer');
    set(state => {
      const currentFrame = state.frames[state.activeFrameIndex];
      if (!currentFrame || currentFrame.layers.length <= 1) return;

      currentFrame.layers = currentFrame.layers.filter(l => l.id !== layerId);
      deleteBuffers([layerId]);
      if (state.activeLayerId === layerId) {
        state.activeLayerId = currentFrame.layers[0].id;
      }
      state.isDirty = true;
      state.editRevision += 1;
    });
  },

  duplicateLayer: layerId => {
    const frame = get().frames[get().activeFrameIndex];
    if (!frame?.layers.some((layer) => layer.id === layerId)) return;
    pushStructuralHistoryStep('Duplicate Layer');
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
        name: `${src.name} (Copy)`,
        effect: src.effect
          ? { ...structuredClone(src.effect), id: createId('effect'), updatedAt: Date.now() }
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
    pushStructuralHistoryStep('Reorder Layers');
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

  setLayerOpacity: (layerId, opacity) => {
    set(state => {
      const currentFrame = state.frames[state.activeFrameIndex];
      if (!currentFrame) return;
      const layer = currentFrame.layers.find(l => l.id === layerId);
      if (layer) {
        layer.opacity = Math.max(0, Math.min(1, opacity));
        state.isDirty = true;
        state.editRevision += 1;
      }
    });
  },

  setLayerBlendMode: (layerId, blendMode) => {
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
    pushStructuralHistoryStep('Merge Down Layer');
    set(state => {
      const currentFrame = state.frames[state.activeFrameIndex];
      if (!currentFrame || currentFrame.layers.length <= 1) return;

      const upperIndex = currentFrame.layers.findIndex(l => l.id === layerId);
      if (upperIndex === -1 || upperIndex >= currentFrame.layers.length - 1) {
        return;
      }

      const upper = currentFrame.layers[upperIndex];
      const lower = currentFrame.layers[upperIndex + 1];

      const upperBuffer = getOrCreateBuffer(upper.id, state.canvasWidth, state.canvasHeight);
      const lowerBuffer = getOrCreateBuffer(lower.id, state.canvasWidth, state.canvasHeight);

      if (upper.visible) {
        lowerBuffer.ctx.save();
        lowerBuffer.ctx.imageSmoothingEnabled = false;
        lowerBuffer.ctx.globalAlpha = upper.opacity;
        lowerBuffer.ctx.globalCompositeOperation = upper.blendMode;
        lowerBuffer.ctx.drawImage(upperBuffer.canvas, 0, 0);
        lowerBuffer.ctx.restore();
      }

      currentFrame.layers.splice(upperIndex, 1);
      deleteBuffers([upper.id]);

      state.activeLayerId = lower.id;
      lower.effect = undefined;
      state.bufferVersion += 1;
      state.isDirty = true;
      state.editRevision += 1;
    });
  },
});
