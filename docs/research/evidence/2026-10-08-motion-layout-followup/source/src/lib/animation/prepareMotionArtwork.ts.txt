import { useStudioStore } from '@/stores/studioStore';
import { snapshotBuffers, replaceAllBuffers, createEntry } from '@/lib/engine/bufferRegistry';
import { commitWorkspace } from '@/lib/engine/workspaceTransaction';
import { pushStructuralHistoryStep } from '@/lib/engine/structuralHistory';
import { compositeFrame } from '@/lib/render/compositor';
import { reserveMemory } from '@/lib/safety/memoryBudget';
import { createId } from '@/lib/engine/id';
import { isNormalLayer } from '@/lib/export/normalLayers';
import { coDrawBridge } from '@/lib/sync/coDrawBridge';

/** Explicit, undoable preparation for moving a layered drawing as one color part. */
export function prepareMotionArtwork(): { ok: true } | { ok: false; reason: string } {
  const state = useStudioStore.getState(), frame = state.frames[state.activeFrameIndex];
  if (!frame || state.motionPart || state.hasFloatingSelection || coDrawBridge.getRole() !== null) return { ok: false, reason: 'Close motion, floating selection and co-draw before combining artwork.' };
  const visible = frame.layers.filter(layer => layer.visible);
  if (!visible.length) return { ok: false, reason: 'Show and paint some color artwork first.' };
  if (visible.some(layer => layer.locked)) return { ok: false, reason: 'Unlock the visible layers before combining artwork.' };
  if (frame.layers.some(isNormalLayer)) return { ok: false, reason: 'Separate normal-map layers before combining color artwork for motion.' };
  const entries = snapshotBuffers();
  if (visible.some(layer => { const entry = entries.get(layer.id); return entry && (entry.canvas.width !== state.canvasWidth || entry.canvas.height !== state.canvasHeight); })) return { ok: false, reason: 'Restore mismatched layer dimensions before combining artwork.' };
  let release: (() => void) | undefined;
  try {
    release = reserveMemory(state.canvasWidth * state.canvasHeight * 12, 'Motion artwork preparation');
    const canvas = compositeFrame(state.frames, state.activeFrameIndex, state.canvasWidth, state.canvasHeight);
    const context = canvas?.getContext('2d', { willReadFrequently: true });
    if (!context) throw Error('Could not read the visible artwork.');
    const pixels = context.getImageData(0, 0, state.canvasWidth, state.canvasHeight);
    if (!pixels.data.some((value, i) => i % 4 === 3 && value > 0)) throw Error('The visible artwork is empty.');
    const id = createId('layer'), merged = createEntry(state.canvasWidth, state.canvasHeight, 1, true);
    merged.ctx.putImageData(pixels, 0, 0);
    const nextBuffers = new Map(entries), affectedIds = visible.map(layer => layer.id);
    for (const layerId of affectedIds) nextBuffers.delete(layerId);
    nextBuffers.set(id, merged);
    const nextFrames = structuredClone(state.frames), nextFrame = nextFrames[state.activeFrameIndex];
    const insertion = nextFrame.layers.findIndex(layer => affectedIds.includes(layer.id));
    nextFrame.layers = nextFrame.layers.filter(layer => !affectedIds.includes(layer.id));
    nextFrame.layers.splice(Math.min(insertion, nextFrame.layers.length), 0, { ...visible[0], id, name: 'Motion artwork', opacity: 1, blendMode: 'source-over', visible: true, locked: false, effect: undefined, research: undefined, tag: undefined });
    commitWorkspace(() => {
      if (useStudioStore.getState() !== state) throw Error('The workspace changed before combining artwork.');
      if (!pushStructuralHistoryStep('Combine visible motion artwork', { opKind: 'merge-layer', affectedLayerIds: [...affectedIds, id], redoBufferCount: 1 })) throw Error('Could not record Undo for combining artwork.');
      replaceAllBuffers(nextBuffers);
      useStudioStore.setState({ frames: nextFrames, activeLayerId: id, isDirty: true, editRevision: state.editRevision + 1, bufferVersion: state.bufferVersion + 1 });
    });
    return { ok: true };
  } catch (error) { return { ok: false, reason: error instanceof Error ? error.message : 'Could not combine artwork.' }; }
  finally { release?.(); }
}
