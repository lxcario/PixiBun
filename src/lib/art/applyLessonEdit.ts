import { applyHistoryEdit } from '@/lib/engine/historyEdit';
import { studioEvents } from '@/lib/events/studioEvents';

/** Make a lesson button edit reversible through the viewport's existing Undo/Redo. */
export function applyLessonEdit(
  description: string,
  draw: (ctx: CanvasRenderingContext2D) => void,
): boolean {
  const result = applyHistoryEdit(description, draw, 'This lesson edit is too large to undo. Choose a smaller canvas before trying again.');
  if (result.ok) return true;
  studioEvents.emit('pixibun:toast', {
    type: 'error',
    message: result.reason === 'refused'
      ? 'Pause playback and choose an unlocked layer before editing. If the canvas is still loading, try again in a moment.'
      : result.error,
  });
  return false;
}
