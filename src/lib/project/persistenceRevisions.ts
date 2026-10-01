// Project-scoped revision tracking for incremental autosave persistence.
// Maintains per-project, per-layer persisted revision and frameIndex records.
import { getBufferGeneration } from '@/lib/engine/bufferRegistry';

export interface PersistedLayerRevision {
  revision: number;
  frameIndex: number;
  generation?: number;
}

// Scoped by projectId -> layerId -> { revision, frameIndex }
const persistedRevisionsByProject = new Map<string, Map<string, PersistedLayerRevision>>();

export function getPersistedRevision(
  projectId: string,
  layerId: string
): PersistedLayerRevision | undefined {
  return persistedRevisionsByProject.get(projectId)?.get(layerId);
}

export function setPersistedRevision(
  projectId: string,
  layerId: string,
  revision: number,
  frameIndex: number
): void {
  let projectMap = persistedRevisionsByProject.get(projectId);
  if (!projectMap) {
    projectMap = new Map();
    persistedRevisionsByProject.set(projectId, projectMap);
  }
  projectMap.set(layerId, { revision, frameIndex, generation: getBufferGeneration(layerId) });
}

export function commitPersistedRevisions(
  projectId: string,
  captured?: Map<string, PersistedLayerRevision>
): void {
  if (!captured || typeof captured[Symbol.iterator] !== 'function') return;
  let projectMap = persistedRevisionsByProject.get(projectId);
  if (!projectMap) {
    projectMap = new Map();
    persistedRevisionsByProject.set(projectId, projectMap);
  }
  for (const [layerId, entry] of captured) {
    const existing = projectMap.get(layerId);
    const generationChanged = entry.generation !== undefined && existing?.generation !== undefined &&
      entry.generation !== existing.generation;
    if (!existing || (generationChanged
      ? entry.generation! > existing.generation!
      : entry.revision >= existing.revision)) {
      projectMap.set(layerId, { ...entry });
    }
  }
}

export function initProjectPersistedRevisions(
  projectId: string,
  revisions: Map<string, PersistedLayerRevision>
): void {
  const projectMap = new Map<string, PersistedLayerRevision>();
  for (const [layerId, entry] of revisions) {
    projectMap.set(layerId, { ...entry });
  }
  persistedRevisionsByProject.set(projectId, projectMap);
}

export function clearPersistedRevisions(projectId?: string): void {
  if (projectId) {
    persistedRevisionsByProject.delete(projectId);
  } else {
    persistedRevisionsByProject.clear();
  }
}

export function isLayerDirty(
  projectId: string,
  layerId: string,
  currentRevision: number,
  currentFrameIndex: number
): boolean {
  const persisted = getPersistedRevision(projectId, layerId);
  if (!persisted) return true;
  const generation = getBufferGeneration(layerId);
  if (persisted.generation !== undefined && generation !== persisted.generation) return true;
  if (currentRevision > persisted.revision) return true;
  if (currentFrameIndex !== persisted.frameIndex) return true;
  return false;
}
