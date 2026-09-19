import { useStudioStore, type StudioState } from '@/stores/studioStore';

/** Compare all persisted metadata and the raster/dirty revisions after an async save. */
export function isCurrentSaveRevision(saved: StudioState): boolean {
  const live = useStudioStore.getState();
  const keys = ['currentProjectId', 'projectName', 'canvasWidth', 'canvasHeight',
    'frames', 'fps', 'loopMode', 'onionSkin', 'palettes', 'currentPaletteId',
    'customRamps', 'clips', 'bufferVersion', 'editRevision'] as const;
  return keys.every(key => live[key] === saved[key]);
}
