import { useStudioStore, type StudioState } from '@/stores/studioStore';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { snapshotBuffers, replaceAllBuffers, type BufferEntry } from '@/lib/engine/bufferRegistry';
import { getGlobalHistoryEngine, rememberViewportHistory, setGlobalHistoryEngine } from '@/lib/engine/historyEngine';
import { createId } from '@/lib/engine/id';
import { DesktopFileSystem } from '@/lib/storage/desktopFileSystem';
import { autoSaveWorkspaceDetailed, getLatestStoredProjectId } from '@/lib/storage/db';
import { buildAutosavePayloadAsync, generateCompositeThumbnail } from './serialize';
import { commitPersistedRevisions, clearPersistedRevisions } from './persistenceRevisions';
import { coDrawBridge } from '@/lib/sync/coDrawBridge';
import { registerMemoryUsage } from '@/lib/safety/memoryBudget';
import {
  getStudioRouteSession, setStudioResume, PRACTICE_RETURN_KEY, clearPracticeReturnProject, getPracticeReturnProject,
  type StudioResume,
} from './studioRouteSession';

interface PreparedPractice {
  projectId: string;
  editRevision: number;
  resume: StudioResume | null;
  returnProjectId: string | null;
}
export interface PracticeSession {
  token: string;
  projectId: string;
}
interface SuspendedStudio {
  state: StudioState;
  buffers: Map<string, BufferEntry>;
  file: ReturnType<typeof DesktopFileSystem.captureAssociation>;
  resume: StudioResume | null;
}
let active: PracticeSession | null = null;
let suspended: SuspendedStudio | null = null;
let savedPracticeVersion: string | null = null;
const listeners = new Set<() => void>();
const publish = () => listeners.forEach(listener => listener());
export const subscribePracticeSession = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};
export const getPracticeSession = () => active;
export const isPracticeActive = () => active !== null;

registerMemoryUsage('suspendedRasters', () => {
  let bytes = 0;
  for (const entry of suspended?.buffers.values() ?? []) bytes += entry.canvas.width * entry.canvas.height * 4;
  return bytes;
});

function requireSoloWorkspace() {
  if (coDrawBridge.getRole() !== null) {
    throw new Error('Close your co-draw session in Studio before starting practice.');
  }
}

/** Complete the existing Studio save before any practice workspace is published. */
export async function preparePractice(): Promise<PreparedPractice> {
  const state = useStudioStore.getState();
  const studio = getStudioRouteSession(state.currentProjectId);
  let resume: StudioResume | null = studio?.resume() ?? null;
  try {
    requireSoloWorkspace();
    if (studio) {
      const checkpoint = studio.checkpoint().catch(error => ({
        ...studio.resume(), error: error instanceof Error ? error.message : 'Saving failed.',
      }));
      // Publish before awaiting: Return during encoding must not hydrate old pixels.
      setStudioResume({ ...studio.resume(), checkpoint });
      resume = await checkpoint;
      if (resume.error) throw new Error(resume.error);
    } else if (state.isDirty || snapshotBuffers().size > 0) {
      throw new Error('Return to Studio and finish saving your drawing before starting practice.');
    }
    requireSoloWorkspace();
    if (useStudioStore.getState().currentProjectId !== state.currentProjectId) {
      throw new Error('Your drawing changed while practice was preparing. Return to Studio and try again.');
    }
    const returnProjectId = studio ? state.currentProjectId : getPracticeReturnProject() ?? await getLatestStoredProjectId();
    const current = useStudioStore.getState();
    if (resume) setStudioResume(resume);
    return { projectId: current.currentProjectId, editRevision: current.editRevision, resume, returnProjectId };
  } catch (error) {
    // A refused checkpoint must not cause rehydration to erase unsaved RAM work.
    if (studio) setStudioResume({ ...studio.resume(), error: error instanceof Error ? error.message : 'Saving failed.' });
    throw error;
  }
}

export function beginPractice(prepared: PreparedPractice): PracticeSession {
  if (active) throw new Error('A practice workspace is already open.');
  requireSoloWorkspace();
  const state = useStudioStore.getState();
  if (state.currentProjectId !== prepared.projectId || state.editRevision !== prepared.editRevision) {
    throw new Error('Your drawing changed before practice could start. Return to Studio and try again.');
  }
  // This pointer protects the original after refresh, including an interrupted
  // Keep write. If session storage cannot hold it, fail before changing artwork.
  if (prepared.returnProjectId) {
    sessionStorage.setItem(PRACTICE_RETURN_KEY, prepared.returnProjectId);
    if (sessionStorage.getItem(PRACTICE_RETURN_KEY) !== prepared.returnProjectId) {
      throw new Error('Practice could not protect your return-to-drawing checkpoint.');
    }
  }
  suspended = { state, buffers: snapshotBuffers(), file: DesktopFileSystem.captureAssociation(), resume: prepared.resume };
  const session = { token: createId('practice'), projectId: createId('proj') };
  try {
    setGlobalHistoryEngine(null);
    replaceAllBuffers(new Map());
    useStudioStore.setState(useStudioStore.getInitialState(), true);
    useStudioStore.getState().resetToNewProject(session.projectId);
    useStudioStore.getState().setProjectName('Practice Drawing');
    useOnboardingStore.getState().startPlayground();
    useStudioStore.getState().setBrushSize(2);
    savedPracticeVersion = null;
    active = session;
    publish();
    return session;
  } catch (error) {
    restoreSuspended();
    throw error;
  }
}

function restoreSuspended() {
  const original = suspended;
  if (!original) return;
  setGlobalHistoryEngine(null);
  replaceAllBuffers(original.buffers);
  useStudioStore.setState(original.state, true);
  DesktopFileSystem.restoreAssociation(original.file);
  setStudioResume(original.resume);
  suspended = null;
  useOnboardingStore.setState({ isPlaygroundActive: false, showStencilGuide: false });
}

export function discardPractice(token: string): void {
  if (active?.token !== token) return;
  const practiceId = active.projectId;
  active = null;
  restoreSuspended();
  clearPersistedRevisions(practiceId);
  publish();
}

/** Only explicit Keep may persist practice. Always write under its new identity. */
export async function keepPractice(token: string): Promise<void> {
  const session = active;
  if (!session || session.token !== token) throw new Error('Practice is no longer open.');
  const state = useStudioStore.getState();
  if (state.currentProjectId !== session.projectId || state.currentProjectId === suspended?.state.currentProjectId) {
    throw new Error('Practice no longer owns the current drawing.');
  }
  state.setIsPlaying(false);
  const revision = useStudioStore.getState().editRevision;
  const payload = await buildAutosavePayloadAsync();
  if (active?.token !== token) throw new Error('Practice was closed before saving finished.');
  if (useStudioStore.getState().editRevision !== revision) throw new Error('Practice changed while encoding. Try Keep again.');
  const outcome = await autoSaveWorkspaceDetailed(session.projectId, payload.project,
    generateCompositeThumbnail(128, 128), payload.layerBlobs, undefined, savedPracticeVersion);
  if (!outcome.ok) throw new Error(outcome.error || 'Practice could not be saved. Your original drawing is still protected.');
  // Even if the UI was cancelled, the write is a separate copy. The return
  // checkpoint stays in place until a stable adoption has finished.
  if (active?.token !== token) throw new Error('Practice was closed before saving finished.');
  if (!outcome.storageVersion) throw new Error('Practice save did not return a confirmed storage version. Try Keep again.');
  savedPracticeVersion = outcome.storageVersion;
  if (useStudioStore.getState().editRevision !== revision) {
    throw new Error('Practice changed while saving. Try Keep again to save the latest pixels.');
  }
  commitPersistedRevisions(session.projectId, payload.capturedRevisions);
  state.markClean();
  state.setSaveStatus('saved');
  const history = getGlobalHistoryEngine();
  if (history) rememberViewportHistory(session.projectId, history);
  setStudioResume({
    projectId: session.projectId,
    storageVersions: new Map(outcome.storageVersion ? [[session.projectId, outcome.storageVersion]] : []),
    lifecycle: { phase: 'active', projectId: session.projectId },
    conflictProjectId: null,
  });
  DesktopFileSystem.reset();
  clearPracticeReturnProject();
  suspended = null;
  active = null;
  useOnboardingStore.setState({ isPlaygroundActive: false, showStencilGuide: false });
  publish();
}
