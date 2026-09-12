import { LayerSlice, StudioSliceCreator } from './types';
import { Layer } from '@/types/canvas';
import { createId } from '@/lib/engine/id';
import { getOrCreateBuffer, cloneBuffers, deleteBuffers } from '@/lib/engine/bufferRegistry';
import { pushStructuralHistoryStep } from '@/lib/engine/structuralHistory';

export const createLayerSlice: StudioSliceCreator<LayerSlice> = set => ({
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
    });
  },

  deleteLayer: layerId => {
    pushStructuralHistoryStep('Katman Silindi');
    set(state => {
      const currentFrame = state.frames[state.activeFrameIndex];
      if (!currentFrame || currentFrame.layers.length <= 1) return;

      currentFrame.layers = currentFrame.layers.filter(l => l.id !== layerId);
      deleteBuffers([layerId]);
      if (state.activeLayerId === layerId) {
        state.activeLayerId = currentFrame.layers[0].id;
      }
    });
  },

  duplicateLayer: layerId => {
    pushStructuralHistoryStep('Katman Çoğaltıldı');
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
      };

      currentFrame.layers.splice(idx, 0, duplicate);
      cloneBuffers([layerId], [newLayerId], state.canvasWidth, state.canvasHeight);
      state.activeLayerId = newLayerId;
    });
  },

  reorderLayers: (startIndex, endIndex) => {
    pushStructuralHistoryStep('Katmanlar Yeniden Sıralandı');
    set(state => {
      const currentFrame = state.frames[state.activeFrameIndex];
      if (!currentFrame) return;

      const [removed] = currentFrame.layers.splice(startIndex, 1);
      currentFrame.layers.splice(endIndex, 0, removed);
    });
  },

  toggleLayerVisibility: layerId => {
    set(state => {
      const currentFrame = state.frames[state.activeFrameIndex];
      if (!currentFrame) return;
      const layer = currentFrame.layers.find(l => l.id === layerId);
      if (layer) {
        layer.visible = !layer.visible;
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
      }
    });
  },

  mergeLayerDown: layerId => {
    pushStructuralHistoryStep('Katman Aşağı Birleştirildi');
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
      state.bufferVersion += 1;
    });
  },
});
