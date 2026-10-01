import { AnimationSlice, StudioSliceCreator } from './types';
import { current } from 'immer';
import { Layer, AnimationFrame } from '@/types/canvas';
import { AnimationClip } from '@/types/animation';
import { createId } from '@/lib/engine/id';
import { cloneBuffers, deleteBuffers, getOrCreateBuffer, touchBuffer } from '@/lib/engine/bufferRegistry';
import { pushStructuralHistoryStep } from '@/lib/engine/structuralHistory';
import { canAddFramesToProject } from '@/lib/project/workspaceEnvelopeGuard';
import { studioEvents } from '@/lib/events/studioEvents';
import { clipRangeError, MAX_PROJECT_CLIPS, metadataNameError } from '@/lib/project/metadataAdmission';
import { ANIMATION_TIMING_LIMITS } from '@/lib/project/animationTiming';
import { parseAnimationReview } from '@/lib/animation/reviewMetadata';

function remapClipAfterFrameDeletion(clip: AnimationClip, removedIndex: number): AnimationClip | null {
  const startFrame = clip.startFrame - (removedIndex < clip.startFrame ? 1 : 0);
  const endFrame = clip.endFrame - (removedIndex <= clip.endFrame ? 1 : 0);
  if (startFrame > endFrame) return null;
  return { ...clip, startFrame, endFrame, fromFrame: startFrame, toFrame: endFrame };
}

const initialLayerId = 'layer-1';
const initialFrameId = 'frame-1';

function activateFrame(state: Pick<AnimationSlice, 'frames' | 'activeFrameIndex'> & { activeLayerId: string }, index: number): void {
  const frame = state.frames[index];
  if (!Number.isInteger(index) || !frame) return;
  state.activeFrameIndex = index;
  if (!frame.layers.some(layer => layer.id === state.activeLayerId)) {
    state.activeLayerId = frame.layers[0]?.id ?? '';
  }
}

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
    const currentStore = get();
    const currentFrame = currentStore.frames[currentStore.activeFrameIndex];
    if (!currentFrame) return;

    const untaggedLayerCount = currentFrame.layers.filter(l => !l.tag).length;
    const incomingLayerCount = Math.max(1, untaggedLayerCount);

    const capacity = canAddFramesToProject(
      currentStore.frames,
      currentStore.canvasWidth,
      currentStore.canvasHeight,
      [{ layerCount: incomingLayerCount }]
    );
    if (!capacity.ok) {
      studioEvents.emit('pixibun:toast', {
        message: capacity.reason || 'Cannot add frame: workspace capacity ceiling reached.',
        type: 'error',
      });
      return;
    }

    if (!pushStructuralHistoryStep('Add Frame', {
      opKind: 'add-frame', affectedLayerIds: [], redoBufferCount: incomingLayerCount,
      addedLayerCount: incomingLayerCount, addedFrameCount: 1,
    })) return;
    set(state => {
      const newFrameId = createId('frame');
      const currentFrame = state.frames[state.activeFrameIndex];

      const clonedLayers: Layer[] = currentFrame.layers
        .filter(l => !l.tag)
        .map(l => ({
          ...l,
          id: createId('layer'),
          effect: l.effect
            ? { ...structuredClone(current(l.effect)), id: createId('effect'), updatedAt: Date.now() }
            : undefined,
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
      state.isDirty = true;
      state.editRevision += 1;
    });
  },

  duplicateFrame: (frameIndex, rasterizedContent) => {
    const currentStore = get();
    const srcFrame = currentStore.frames[frameIndex];
    if (!srcFrame || !Number.isInteger(frameIndex)) return null;
    if (rasterizedContent && (rasterizedContent.width !== currentStore.canvasWidth ||
      rasterizedContent.height !== currentStore.canvasHeight ||
      rasterizedContent.data.length !== currentStore.canvasWidth * currentStore.canvasHeight * 4 ||
      !srcFrame.layers.some(layer => !layer.tag))) {
      studioEvents.emit('pixibun:toast', { type: 'error', message: 'Cannot insert invalid rasterized frame content.' });
      return null;
    }

    const incomingLayerCount = srcFrame.layers.length;
    const capacity = canAddFramesToProject(
      currentStore.frames,
      currentStore.canvasWidth,
      currentStore.canvasHeight,
      [{ layerCount: incomingLayerCount }]
    );
    if (!capacity.ok) {
      studioEvents.emit('pixibun:toast', {
        message: capacity.reason || 'Cannot duplicate frame: workspace capacity ceiling reached.',
        type: 'error',
      });
      return null;
    }

    if (!pushStructuralHistoryStep('Duplicate Frame', {
      opKind: 'duplicate-frame', affectedLayerIds: [], redoBufferCount: incomingLayerCount,
      addedLayerCount: incomingLayerCount, addedFrameCount: 1,
    })) return null;
    let result: { frameId: string; layerIds: string[] } | null = null;
    set(state => {
      const srcFrame = state.frames[frameIndex];
      if (!srcFrame) return;

      const newFrameId = createId('frame');
      const duplicatedLayers = srcFrame.layers.map(l => ({
        ...l,
        id: createId('layer'),
        effect: l.effect
          ? { ...structuredClone(current(l.effect)), id: createId('effect'), updatedAt: Date.now() }
          : undefined,
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

      // Install generated pixels before publishing the new frame to save/sync subscribers.
      if (rasterizedContent) {
        const artworkLayers = duplicatedLayers.filter(layer => !layer.tag);
        const base = artworkLayers[artworkLayers.length - 1];
        for (const layer of artworkLayers) {
          const entry = getOrCreateBuffer(layer.id, state.canvasWidth, state.canvasHeight);
          if (layer === base) {
            const image = entry.ctx.createImageData(state.canvasWidth, state.canvasHeight);
            image.data.set(rasterizedContent.data);
            entry.ctx.putImageData(image, 0, 0);
            layer.visible = true;
            layer.opacity = 1;
            layer.blendMode = 'source-over';
            layer.effect = undefined;
          } else {
            entry.ctx.clearRect(0, 0, state.canvasWidth, state.canvasHeight);
          }
          touchBuffer(layer.id);
        }
      }

      state.frames.splice(frameIndex + 1, 0, duplicate);
      state.activeFrameIndex = frameIndex + 1;
      state.activeLayerId = duplicatedLayers[0].id;
      result = { frameId: newFrameId, layerIds: duplicatedLayers.map(layer => layer.id) };
      state.isDirty = true;
      state.editRevision += 1;
    });
    return result;
  },

  deleteFrame: frameIndex => {
    if (get().frames.length <= 1 || frameIndex < 0 || frameIndex >= get().frames.length) return;
    const frameToDelete = get().frames[frameIndex];
    if (!pushStructuralHistoryStep('Delete Frame', {
      opKind: 'delete-frame',
      affectedLayerIds: frameToDelete.layers.map(l => l.id),
    })) return;
    set(state => {
      if (state.frames.length <= 1) return;
      // Bounds guard: an out-of-range index would crash on removedFrame.layers
      if (frameIndex < 0 || frameIndex >= state.frames.length) return;
      const removedFrame = state.frames[frameIndex];
      deleteBuffers(removedFrame.layers.map(l => l.id));
      state.frames.splice(frameIndex, 1);
      state.clips = state.clips
        .map((clip) => remapClipAfterFrameDeletion(clip, frameIndex))
        .filter((clip): clip is AnimationClip => clip !== null);
      if (state.activeClipId && !state.clips.some((clip) => clip.id === state.activeClipId)) {
        state.activeClipId = null;
      }
      state.activeFrameIndex = Math.min(state.activeFrameIndex, state.frames.length - 1);
      state.activeLayerId = state.frames[state.activeFrameIndex].layers[0].id;
      state.isDirty = true;
      state.editRevision += 1;
    });
  },

  setFrameDuration: (frameIndex, durationMs, skipHistory = false) => {
    if (!Number.isFinite(durationMs)) return false;
    const frame = get().frames[frameIndex];
    const nextDuration = Math.max(ANIMATION_TIMING_LIMITS.durationMinMs, Math.min(ANIMATION_TIMING_LIMITS.durationMaxMs, Math.round(durationMs)));
    if (!frame || frame.durationMs === nextDuration) return false;
    if (!skipHistory && !pushStructuralHistoryStep('Change Frame Duration')) return false;
    set(state => {
      const frame = state.frames[frameIndex];
      if (frame) {
        frame.durationMs = nextDuration;
        state.isDirty = true;
        state.editRevision += 1;
      }
    });
    return true;
  },

  reorderFrames: (startIndex, endIndex) => {
    const frameCount = get().frames.length;
    if (
      startIndex < 0 ||
      startIndex >= frameCount ||
      endIndex < 0 ||
      endIndex >= frameCount ||
      startIndex === endIndex
    ) return;
    if (!pushStructuralHistoryStep('Reorder Frames', { opKind: 'reorder-frames', affectedLayerIds: [] })) return;
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
      activateFrame(state, endIndex);
      state.isDirty = true;
      state.editRevision += 1;
    });
  },

  setActiveFrame: index => {
    set(state => {
      activateFrame(state, index);
    });
  },

  setFps: fps => {
    set(state => {
      if (!Number.isFinite(fps)) return;
      state.fps = Math.max(ANIMATION_TIMING_LIMITS.fpsMin, Math.min(ANIMATION_TIMING_LIMITS.fpsMax, Math.round(fps)));
      state.isDirty = true;
      state.editRevision += 1;
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
      state.isDirty = true;
      state.editRevision += 1;
    });
  },

  setOnionSkin: settings => {
    set(state => {
      state.onionSkin = { ...state.onionSkin, ...settings };
      state.isDirty = true;
      state.editRevision += 1;
    });
  },

  addClip: (name, startFrame, endFrame, color, loopMode = 'forward') => {
    const current = get();
    const nameError = metadataNameError(name, 'clip');
    const error = nameError ?? (
      current.clips.length >= MAX_PROJECT_CLIPS
        ? `A project can have at most ${MAX_PROJECT_CLIPS} clips.`
        : !Number.isInteger(startFrame) || !Number.isInteger(endFrame)
          ? 'Clip frame positions must be whole numbers.'
          : null
    );
    if (error) {
      studioEvents.emit('pixibun:toast', { type: 'error', message: error });
      return;
    }
    if (!pushStructuralHistoryStep('Add Clip')) return;
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
      state.isDirty = true;
      state.editRevision += 1;
    });
  },

  updateClip: (id, updates) => {
    const current = get();
    const existing = current.clips.find((clip) => clip.id === id);
    if (!existing) return;
    const review = updates.review === undefined ? undefined : parseAnimationReview(updates.review);
    if (review === null) {
      studioEvents.emit('pixibun:toast', { type: 'error', message: 'Review regions or exceptions exceed their limits or are invalid.' });
      return;
    }
    const startFrame = updates.startFrame ?? updates.fromFrame ?? existing.startFrame;
    const endFrame = updates.endFrame ?? updates.toFrame ?? existing.endFrame;
    const error = metadataNameError(updates.name ?? existing.name, 'clip') ??
      clipRangeError(startFrame, endFrame, current.frames.length);
    if (error) {
      studioEvents.emit('pixibun:toast', { type: 'error', message: error });
      return;
    }
    if (!pushStructuralHistoryStep('Update Clip')) return;
    set(state => {
      const clip = state.clips.find(c => c.id === id);
      if (clip) {
        Object.assign(clip, updates, { startFrame, endFrame, fromFrame: startFrame, toFrame: endFrame });
        if (review) clip.review = review;
        state.isDirty = true;
        state.editRevision += 1;
      }
    });
  },

  deleteClip: id => {
    if (!get().clips.some(clip => clip.id === id) || !pushStructuralHistoryStep('Delete Clip')) return;
    set(state => {
      state.clips = state.clips.filter(c => c.id !== id);
      if (state.activeClipId === id) {
        state.activeClipId = null;
      }
      state.isDirty = true;
      state.editRevision += 1;
    });
  },

  reorderClips: (sourceIndex, targetIndex) => {
    const count = get().clips.length;
    if (!Number.isInteger(sourceIndex) || !Number.isInteger(targetIndex) || sourceIndex < 0 ||
      sourceIndex >= count || targetIndex < 0 || targetIndex >= count || sourceIndex === targetIndex) return;
    if (!pushStructuralHistoryStep('Reorder Clips')) return;
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
      state.isDirty = true;
      state.editRevision += 1;
    });
  },

  setActiveClipId: id => {
    const clip = id ? get().clips.find(c => c.id === id) : undefined;
    if (id && !clip) return;
    set(state => {
      state.activeClipId = id;
      if (clip) activateFrame(state, clip.fromFrame ?? clip.startFrame);
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
