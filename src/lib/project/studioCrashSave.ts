import { useStudioStore } from '@/stores/studioStore';
import { getStudioRouteSession, setStudioResume } from './studioRouteSession';

export type StudioCrashSave = { saved: true } | { saved: false; error: string };

/**
 * The Studio route error screen unmounts the canvas, but the document and its
 * pixel buffers live on in module state. Save them through the last Studio's
 * save coordinator, and publish a resume ticket first so "Resume Session" keeps
 * the live workspace instead of rehydrating older stored pixels over the
 * unsaved strokes, even while this save is still running.
 */
export async function saveAfterStudioCrash(): Promise<StudioCrashSave> {
  const { currentProjectId, isDirty } = useStudioStore.getState();
  const studio = getStudioRouteSession(currentProjectId);
  if (!studio) return isDirty ? { saved: false, error: 'Studio closed before it could save this drawing.' } : { saved: true };
  if (!isDirty) {
    setStudioResume(studio.resume());
    return { saved: true };
  }
  const checkpoint = studio.checkpoint().catch(error => ({
    ...studio.resume(), error: error instanceof Error ? error.message : 'Saving failed.',
  }));
  setStudioResume({ ...studio.resume(), checkpoint });
  const resume = await checkpoint;
  setStudioResume(resume);
  return resume.error ? { saved: false, error: resume.error } : { saved: true };
}
