import { AnimationSlice, StudioSliceCreator } from './types';
import { Layer, AnimationFrame } from '@/types/canvas';
import { AnimationClip } from '@/types/animation';
import { createId } from '@/lib/engine/id';
import { cloneBuffers, deleteBuffers } from '@/lib/engine/bufferRegistry';

const initialLayerId = 'layer-1';
const initialFrameId = 'frame-1';

const defaultInitialFrame: AnimationFrame = {
  id: initialFrameId,
  durationMs: 100,
  layers: [
    {
      id: initialLayerId,
      name: 'Base Layer',
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: 'source-over',
    },
  ],
};

export const createAnimationSlice: StudioSliceCreator<AnimationSlice> = (set, get) => ({
  frames: [defaultInitialFrame],
  activeFrameIndex: 0,
  isPlaying: false,
  fps: 8,
  loopMode: 'repeat',
  onionSkin: {
    enabled: false,
    prevFrames: 1,
    nextFrames: 1,
    prevColor: '#C792DF', // Wisteria
    nextColor: '#DCABDF', // Plum
    opacity: 0.45,
  },
  clips: [
    {
      id: 'tag-1',
      name: 'Default',
      fromFrame: 0,
      toFrame: 0,
      startFrame: 0,
      endFrame: 0,
      color: '#F0BE7C',
      loopMode: 'forward',
    },
  ],
  activeClipId: null,

  addFrame: () => {
    set(state => {
      const newFrameId = createId('frame');
      const currentFrame = state.frames[state.activeFrameIndex];

      const clonedLayers: Layer[] = currentFrame.layers
        .filter(l => !l.tag)
        .map(l => ({
          ...l,
          id: createId('layer'),
        }));

      if (clonedLayers.length === 0) {
        clonedLayers.push({
          id: createId('layer'),
          name: 'Base Layer',
          visible: true,
          locked: false,
          opacity: 1,
          blendMode: 'source-over',
        });
      }

      const newFrame: AnimationFrame = {
        id: newFrameId,
        durationMs: 100,
        layers: clonedLayers,
      };

      state.frames.push(newFrame);
      state.activeFrameIndex = state.frames.length - 1;
      state.activeLayerId = clonedLayers[0].id;
    });
  },

  duplicateFrame: frameIndex => {
    set(state => {
      const srcFrame = state.frames[frameIndex];
      if (!srcFrame) return;

      const newFrameId = createId('frame');
      const duplicatedLayers = srcFrame.layers.map(l => ({
        ...l,
        id: createId('layer'),
      }));

      const duplicate: AnimationFrame = {
        ...srcFrame,
        id: newFrameId,
        layers: duplicatedLayers,
      };

      cloneBuffers(
        srcFrame.layers.map(l => l.id),
        duplicatedLayers.map(l => l.id),
        state.canvasWidth,
        state.canvasHeight
      );

      state.frames.splice(frameIndex + 1, 0, duplicate);
      state.activeFrameIndex = frameIndex + 1;
      state.activeLayerId = duplicatedLayers[0].id;
    });
  },

  deleteFrame: frameIndex => {
    set(state => {
      if (state.frames.length <= 1) return;
      // Bounds guard: an out-of-range index would crash on removedFrame.layers
      if (frameIndex < 0 || frameIndex >= state.frames.length) return;
      const removedFrame = state.frames[frameIndex];
      deleteBuffers(removedFrame.layers.map(l => l.id));
      state.frames.splice(frameIndex, 1);
      state.activeFrameIndex = Math.min(state.activeFrameIndex, state.frames.length - 1);
      state.activeLayerId = state.frames[state.activeFrameIndex].layers[0].id;
    });
  },

  setFrameDuration: (frameIndex, durationMs) => {
    set(state => {
      const frame = state.frames[frameIndex];
      if (frame) {
        frame.durationMs = Math.max(10, Math.min(10000, Math.round(durationMs)));
      }
    });
  },

  reorderFrames: (startIndex, endIndex) => {
    set(state => {
      // Bounds guard: out-of-range indices would splice `undefined` into frames
      if (
        startIndex < 0 ||
        startIndex >= state.frames.length ||
        endIndex < 0 ||
        endIndex >= state.frames.length
      ) {
        return;
      }
      const [removed] = state.frames.splice(startIndex, 1);
      state.frames.splice(endIndex, 0, removed);
      state.activeFrameIndex = endIndex;
    });
  },

  setActiveFrame: index => {
    set(state => {
      if (index >= 0 && index < state.frames.length) {
        state.activeFrameIndex = index;
        const currentFrame = state.frames[index];
        if (currentFrame && currentFrame.layers.length > 0) {
          const existingLayer = currentFrame.layers.find(l => l.id === state.activeLayerId);
          if (!existingLayer) {
            state.activeLayerId = currentFrame.layers[0].id;
          }
        }
      }
    });
  },

  setFps: fps => {
    set(state => {
      state.fps = Math.max(1, Math.min(60, fps));
    });
  },

  setIsPlaying: playing => {
    set(state => {
      state.isPlaying = playing;
    });
  },

  setLoopMode: mode => {
    set(state => {
      state.loopMode = mode;
    });
  },

  setOnionSkin: settings => {
    set(state => {
      state.onionSkin = { ...state.onionSkin, ...settings };
    });
  },

  addClip: (name, startFrame, endFrame, color, loopMode = 'forward') => {
    set(state => {
      const minF = Math.max(0, Math.min(state.frames.length - 1, Math.min(startFrame, endFrame)));
      const maxF = Math.max(0, Math.min(state.frames.length - 1, Math.max(startFrame, endFrame)));
      const newClip: AnimationClip = {
        id: createId('tag'),
        name,
        fromFrame: minF,
        toFrame: maxF,
        startFrame: minF,
        endFrame: maxF,
        color: color || '#F0BE7C',
        loopMode: loopMode || 'forward',
      };
      state.clips.push(newClip);
      state.activeClipId = newClip.id;
    });
  },

  updateClip: (id, updates) => {
    set(state => {
      const clip = state.clips.find(c => c.id === id);
      if (clip) {
        const nextUpdates = { ...updates };
        if (nextUpdates.fromFrame !== undefined && nextUpdates.startFrame === undefined) {
          nextUpdates.startFrame = nextUpdates.fromFrame;
        } else if (nextUpdates.startFrame !== undefined && nextUpdates.fromFrame === undefined) {
          nextUpdates.fromFrame = nextUpdates.startFrame;
        }
        if (nextUpdates.toFrame !== undefined && nextUpdates.endFrame === undefined) {
          nextUpdates.endFrame = nextUpdates.toFrame;
        } else if (nextUpdates.endFrame !== undefined && nextUpdates.toFrame === undefined) {
          nextUpdates.toFrame = nextUpdates.endFrame;
        }
        if (nextUpdates.fromFrame !== undefined) {
          nextUpdates.fromFrame = Math.max(0, Math.min(state.frames.length - 1, nextUpdates.fromFrame));
          nextUpdates.startFrame = nextUpdates.fromFrame;
        }
        if (nextUpdates.toFrame !== undefined) {
          nextUpdates.toFrame = Math.max(0, Math.min(state.frames.length - 1, nextUpdates.toFrame));
          nextUpdates.endFrame = nextUpdates.toFrame;
        }
        Object.assign(clip, nextUpdates);
      }
    });
  },

  deleteClip: id => {
    set(state => {
      state.clips = state.clips.filter(c => c.id !== id);
      if (state.activeClipId === id) {
        state.activeClipId = null;
      }
    });
  },

  reorderClips: (sourceIndex, targetIndex) => {
    set(state => {
      if (
        sourceIndex < 0 ||
        sourceIndex >= state.clips.length ||
        targetIndex < 0 ||
        targetIndex >= state.clips.length
      ) {
        return;
      }
      const [moved] = state.clips.splice(sourceIndex, 1);
      state.clips.splice(targetIndex, 0, moved);
    });
  },

  setActiveClipId: id => {
    set(state => {
      state.activeClipId = id;
      if (id) {
        const clip = state.clips.find(c => c.id === id);
        if (clip) {
          state.activeFrameIndex = clip.fromFrame ?? clip.startFrame;
        }
      }
    });
  },

  addTag: (name, fromFrame, toFrame, color, loopMode = 'forward') => {
    get().addClip(name, fromFrame, toFrame, color, loopMode);
  },

  updateTag: (id, updates) => {
    get().updateClip(id, updates);
  },

  deleteTag: id => {
    get().deleteClip(id);
  },

  reorderTags: (sourceIndex, targetIndex) => {
    get().reorderClips(sourceIndex, targetIndex);
  },

  setActiveTagId: id => {
    get().setActiveClipId(id);
  },
});
