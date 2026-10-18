import { useStudioStore } from '@/stores/studioStore';
import { studioEvents } from '@/lib/events/studioEvents';

/** Check at each mutation, including when a layer was locked after selecting. */
export function canEditSelectionLayer(layerId: string): boolean {
  const state = useStudioStore.getState();
  const layer = state.frames[state.activeFrameIndex]?.layers.find(candidate => candidate.id === layerId);
  if (state.activeLayerId === layerId && layer && !layer.locked) return true;
  studioEvents.emit('pixibun:toast', { type: 'error', message: 'Select an unlocked layer before editing selected pixels.' });
  return false;
}
