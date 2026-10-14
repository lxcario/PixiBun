import { getOrCreateBuffer, touchBuffer } from '@/lib/engine/bufferRegistry';
import { calculateStepBytes, getGlobalHistoryEngine } from '@/lib/engine/historyEngine';
import { toPatchStep } from '@/lib/engine/pixelPatch';
import { studioEvents } from '@/lib/events/studioEvents';
import { assertMemoryAvailable } from '@/lib/safety/memoryBudget';
import { coDrawBridge } from '@/lib/sync/coDrawBridge';
import { useStudioStore } from '@/stores/studioStore';
import type { PixelHistoryStep } from '@/types/canvas';

/** Make a lesson button edit reversible through the viewport's existing Undo/Redo. */
export function applyLessonEdit(
  description: string,
  draw: (ctx: CanvasRenderingContext2D) => void,
): boolean {
  const state = useStudioStore.getState();
  const layer = state.frames[state.activeFrameIndex]?.layers.find(candidate => candidate.id === state.activeLayerId);
  const history = getGlobalHistoryEngine();
  if (!layer || layer.locked || state.isPlaying || !history) {
    studioEvents.emit('pixibun:toast', {
      type: 'error', message: 'Pause playback and choose an unlocked layer before editing. If the canvas is still loading, try again in a moment.',
    });
    return false;
  }

  let rollback: (() => void) | undefined;
  try {
    const buf = getOrCreateBuffer(layer.id, state.canvasWidth, state.canvasHeight);
    assertMemoryAvailable(state.canvasWidth * state.canvasHeight * 4, description);
    const snapshot: PixelHistoryStep = {
      type: 'pixel', description, frameIndex: state.activeFrameIndex, layerId: layer.id,
      imageData: buf.ctx.getImageData(0, 0, state.canvasWidth, state.canvasHeight),
      layerName: layer.name, layerTag: layer.tag, layerBlendMode: layer.blendMode,
      layerEffect: layer.effect ? structuredClone(layer.effect) : undefined,
    };
    if (calculateStepBytes(snapshot) > history.maxBytes) {
      throw new Error('This lesson edit is too large to undo. Choose a smaller canvas before trying again.');
    }
    rollback = () => buf.ctx.putImageData(snapshot.imageData, 0, 0);
    // Canvas state (for example fillStyle) is not part of the artwork snapshot.
    buf.ctx.save();
    try { draw(buf.ctx); } finally { buf.ctx.restore(); }
    history.push(toPatchStep(snapshot, buf.ctx.getImageData(0, 0, state.canvasWidth, state.canvasHeight)), snapshot.imageData);
    rollback = undefined;
    useStudioStore.setState(draft => {
      const edited = draft.frames[snapshot.frameIndex]?.layers.find(candidate => candidate.id === layer.id);
      if (edited) edited.effect = undefined;
    });
    touchBuffer(layer.id);
    state.setCanUndo(history.canUndo);
    state.setCanRedo(history.canRedo);
    state.bumpBufferVersion();
    state.setDirty(true);
    studioEvents.emit('pixibun:request-composite');
    coDrawBridge.notifyStrokeCommitted(layer.id, snapshot.imageData);
    return true;
  } catch (error) {
    rollback?.();
    studioEvents.emit('pixibun:toast', { type: 'error', message: error instanceof Error ? error.message : 'The lesson edit could not be applied.' });
    return false;
  }
}
