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
