import { useStudioStore } from '@/stores/studioStore';
import { studioEvents } from '@/lib/events/studioEvents';
import { confirmActiveLayerEditable } from '@/lib/canvas/layerEditGuard';

/** Check at each mutation, including when a layer was locked after selecting. */
export function canEditSelectionLayer(layerId: string): boolean {
  const state = useStudioStore.getState();
  if (state.activeLayerId === layerId) return confirmActiveLayerEditable();
  studioEvents.emit('pixibun:toast', { type: 'error', message: 'Select an unlocked layer before editing selected pixels.' });
  return false;
}
