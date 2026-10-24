import { getOrCreateBuffer, touchBuffer } from '@/lib/engine/bufferRegistry';
import { calculateStepBytes, getGlobalHistoryEngine } from '@/lib/engine/historyEngine';
import { toPatchStep } from '@/lib/engine/pixelPatch';
import { studioEvents } from '@/lib/events/studioEvents';
import { assertMemoryAvailable } from '@/lib/safety/memoryBudget';
import { coDrawBridge } from '@/lib/sync/coDrawBridge';
import { useStudioStore } from '@/stores/studioStore';
import type { PixelHistoryStep } from '@/types/canvas';

export type HistoryEditResult =
  | { ok: true }
  /** `refused`: playback, a locked layer or no mounted viewport; nothing was touched. */
  | { ok: false; reason: 'refused' | 'failed'; error: string };

/**
 * Draws on the active layer as one step of the viewport's Undo/Redo, the way
 * a committed stroke is stored: a patch of the changed rectangle, the buffer
 * touched, the composite refreshed and the change sent to co-draw partners.
 * A failed draw is rolled back and leaves older history alone.
 */
export function applyHistoryEdit(
  description: string,
  draw: (ctx: CanvasRenderingContext2D) => void,
  tooLargeMessage = 'This edit is too large to undo. Choose a smaller canvas before trying again.',
): HistoryEditResult {
  const state = useStudioStore.getState();
  const layer = state.frames[state.activeFrameIndex]?.layers.find(candidate => candidate.id === state.activeLayerId);
  const history = getGlobalHistoryEngine();
  if (!layer || layer.locked || state.isPlaying || !history) {
    return { ok: false, reason: 'refused', error: 'Pause playback and choose an unlocked layer before editing.' };
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
    if (calculateStepBytes(snapshot) > history.maxBytes) throw new Error(tooLargeMessage);
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
    return { ok: true };
  } catch (error) {
    rollback?.();
    return { ok: false, reason: 'failed', error: error instanceof Error ? error.message : 'The edit could not be applied.' };
  }
}
