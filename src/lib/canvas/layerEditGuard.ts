import type { Layer } from '@/types/canvas';
import { studioEvents } from '@/lib/events/studioEvents';
import { useStudioStore } from '@/stores/studioStore';

// Canvas edits (strokes, shapes, curves, fills and selection Cut/Delete/move/
// paste) change only a layer the artist can see and has not locked. A hidden
// layer would take the edit, and its Undo step, without anything on screen.

export const HIDDEN_LAYER_MESSAGE = 'The active layer is hidden. Show it in Layers before changing its pixels.';
export const LOCKED_LAYER_MESSAGE = 'The active layer is locked. Unlock it in Layers before changing its pixels.';

/** True when canvas tools may change this layer's pixels. */
export function isEditableLayer(layer: Pick<Layer, 'locked' | 'visible'> | undefined): layer is Pick<Layer, 'locked' | 'visible'> {
  return !!layer && !layer.locked && layer.visible;
}

/** Why the canvas must leave this layer alone, or null when it may edit it. */
export function layerEditRefusal(layer: Pick<Layer, 'locked' | 'visible'> | undefined): string | null {
  if (!layer) return 'Select a layer before changing pixels.';
  if (layer.locked) return LOCKED_LAYER_MESSAGE;
  if (!layer.visible) return HIDDEN_LAYER_MESSAGE;
  return null;
}

/**
 * The layer a floating selection drops into: the layer it was lifted from or pasted
 * onto, while that layer is still in the active frame. Choosing another layer in the
 * meantime does not move the pixels there. Falls back to the active layer when the
 * source is gone (deleted, or another frame is showing).
 */
export function floatingSelectionTarget(sourceLayerId: string | undefined): Layer | undefined {
  const state = useStudioStore.getState();
  const layers = state.frames[state.activeFrameIndex]?.layers ?? [];
  return (sourceLayerId && layers.find(layer => layer.id === sourceLayerId))
    || layers.find(layer => layer.id === state.activeLayerId);
}

/** Like {@link confirmActiveLayerEditable}, for a named layer that need not be active. */
export function confirmLayerEditable(layer: Layer | undefined): boolean {
  const refusal = layerEditRefusal(layer);
  if (!refusal) return true;
  const named = layer && layer.id !== useStudioStore.getState().activeLayerId
    ? refusal.replace('The active layer', `The selection's layer “${layer.name}”`)
    : refusal;
  studioEvents.emit('pixibun:toast', { type: 'error', message: named });
  return false;
}

/**
 * Checks the store's active layer for a selection edit. When it may not change,
 * tells the artist why and returns false; nothing has been touched.
 */
export function confirmActiveLayerEditable(): boolean {
  const state = useStudioStore.getState();
  const layer = state.frames[state.activeFrameIndex]?.layers.find(item => item.id === state.activeLayerId);
  const refusal = layerEditRefusal(layer);
  if (!refusal) return true;
  studioEvents.emit('pixibun:toast', { type: 'error', message: refusal });
  return false;
}
