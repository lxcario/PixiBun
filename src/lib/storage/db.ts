import Dexie, { Table } from 'dexie';
import type { DiagnosticEntry } from '@/types/diagnostics';
import type { RecoveryReasonCode } from '@/lib/recovery/recoveryTypes';
import { createId } from '@/lib/engine/id';
import { PROJECT_FORMAT_ID, PROJECT_FORMAT_VERSION, type ProjectFile } from '@/types/project';
import { StorageResilience } from '@/lib/safety/storageResilience';
import { assertWorkspaceDimensions } from '@/config/canvasLimits';
import { decodeAndValidateProject } from '@/lib/project/decodeProject';
import { clearPersistedRevisions } from '@/lib/project/persistenceRevisions';
import { validateProjectFile } from '@/lib/project/schema';

export interface StoredProject {
  id: string;
  name: string;
  width: number;
  height: number;
  fps: number;
  createdAt: number;
  updatedAt: number;
  thumbnailDataUrl?: string;
  dataJson: string; // Serialized ProjectFile
}

export interface StoredLayerBlob {
  id?: number;
  projectId: string;
  layerId: string;
  frameIndex: number;
  blob: Blob;
  updatedAt: number;
}

export interface StoredWorkspace extends StoredProject {
  layerBlobs: StoredLayerBlob[];
}

export interface RecoveryRecord {
  projectId: string;
  classificationState:
    | 'recoverable-envelope-exceeded'
    | 'recoverable-blob-invalid'
    | 'malformed'
    | 'unsupported-version'
    | 'unsafe-content';
  firstDetectedAt: number;
  lastConfirmedAt: number;
  reasonCodes: RecoveryReasonCode[];
  resolvedAt?: number;
  recoveredProjectId?: string;
  resolvedSourceFingerprint?: string;
}

export class PixiBunDatabase extends Dexie {
  projects!: Table<StoredProject, string>;
  diagnostics!: Table<DiagnosticEntry, string>;
  layerBlobs!: Table<StoredLayerBlob, number>;
  recoveryRecords!: Table<RecoveryRecord, string>;

  constructor() {
    super('PixiBunDB');
    this.version(1).stores({
      projects: 'id, name, updatedAt',
    });
    this.version(2).stores({
      projects: 'id, name, updatedAt',
      diagnostics: 'id, kind, timestamp',
    });
    this.version(3).stores({
      projects: 'id, name, updatedAt, createdAt',
      diagnostics: 'id, kind, timestamp',
    }).upgrade(async (tx) => {
      await tx.table('projects').toCollection().modify((p: StoredProject) => {
        if (!p.createdAt) {
          p.createdAt = p.updatedAt || Date.now();
        }
      });
    });
    this.version(4).stores({
      projects: 'id, name, updatedAt, createdAt',
      diagnostics: 'id, kind, timestamp',
      layerBlobs: '++id, [projectId+layerId+frameIndex], projectId, layerId',
    });
    this.version(5).stores({
      projects: 'id, name, updatedAt, createdAt',
      diagnostics: 'id, kind, timestamp',
      layerBlobs: '++id, [projectId+layerId+frameIndex], projectId, layerId, [projectId+id]',
      recoveryRecords: 'projectId, classificationState, lastConfirmedAt',
    });
  }
}

export const db = new PixiBunDatabase();

if (typeof window !== 'undefined') {
  const isDevOrTest =
    process.env.NODE_ENV !== 'production' ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';
  if (isDevOrTest) {
    (window as unknown as { __pixibunDb?: PixiBunDatabase }).__pixibunDb = db;
  }
}

async function blobsEqual(b1: Blob, b2: Blob): Promise<boolean> {
  if (b1 === b2) return true;
  if (!b1 || !b2 || b1.size !== b2.size || b1.type !== b2.type) return false;
  if (b1.size === 0) return true;
  const buf1 = await b1.arrayBuffer();
  const buf2 = await b2.arrayBuffer();
  if (buf1.byteLength !== buf2.byteLength) return false;
  const u1 = new Uint8Array(buf1);
  const u2 = new Uint8Array(buf2);
  for (let i = 0; i < u1.length; i++) {
    if (u1[i] !== u2[i]) return false;
  }
  return true;
}

// Save layer binary blobs to layerBlobs table with incremental upsert & dirty-diffing
export async function saveLayerBlobs(
  projectId: string,
  blobs: Array<{ layerId: string; frameIndex: number; blob: Blob }>
): Promise<void> {
  const now = Date.now();
  const keyOf = (layerId: string, frameIndex: number) => `${layerId}::${frameIndex}`;

  // Deduplicate incoming blobs by keeping the latest entry for each (layerId, frameIndex)
  const incomingMap = new Map<string, { layerId: string; frameIndex: number; blob: Blob }>();
  for (const b of blobs) {
    incomingMap.set(keyOf(b.layerId, b.frameIndex), b);
  }
  const deduplicatedBlobs = Array.from(incomingMap.values());

  // 1. Query existing records outside the write transaction
  const existingRecords = await db.layerBlobs.where('projectId').equals(projectId).toArray();

  const existingMap = new Map<string, StoredLayerBlob>();
  const idsToDelete: number[] = [];

  for (const rec of existingRecords) {
    const k = keyOf(rec.layerId, rec.frameIndex);
    if (!incomingMap.has(k)) {
      if (rec.id !== undefined) {
        idsToDelete.push(rec.id);
      }
    } else {
      if (existingMap.has(k)) {
        // If a duplicate record already exists in the database for this key, mark it for pruning
        if (rec.id !== undefined) {
          idsToDelete.push(rec.id);
        }
      } else {
        existingMap.set(k, rec);
      }
    }
  }

  const recordsToAdd: StoredLayerBlob[] = [];
  const recordsToPut: StoredLayerBlob[] = [];

  // 2. Perform native async Blob comparisons OUTSIDE the write transaction.
  // Native microtasks from blob.arrayBuffer() can otherwise detach from Dexie's PSD zone
  // and cause TransactionInactiveError in strict browser environments.
  for (const b of deduplicatedBlobs) {
    const k = keyOf(b.layerId, b.frameIndex);
    const existing = existingMap.get(k);

    if (!existing) {
      recordsToAdd.push({
        projectId,
        layerId: b.layerId,
        frameIndex: b.frameIndex,
        blob: b.blob,
        updatedAt: now,
      });
    } else {
      const isIdentical = await blobsEqual(existing.blob, b.blob);
      if (!isIdentical) {
        recordsToPut.push({
          id: existing.id,
          projectId,
          layerId: b.layerId,
          frameIndex: b.frameIndex,
          blob: b.blob,
          updatedAt: now,
        });
      }
    }
  }

  // 3. If nothing changed, return immediately without opening an IndexedDB transaction
  if (idsToDelete.length === 0 && recordsToAdd.length === 0 && recordsToPut.length === 0) {
    return;
  }

  // 4. Execute atomic batch writes with purely synchronous Dexie calls inside the transaction
  try {
    await db.transaction('rw', db.layerBlobs, async () => {
      if (idsToDelete.length > 0) {
        await db.layerBlobs.bulkDelete(idsToDelete);
      }
      if (recordsToAdd.length > 0) {
        await db.layerBlobs.bulkAdd(recordsToAdd);
      }
      if (recordsToPut.length > 0) {
        await db.layerBlobs.bulkPut(recordsToPut);
      }
    });
  } catch (err: unknown) {
    if (StorageResilience.isQuotaExceeded(err)) {
      console.warn('[saveLayerBlobs] IndexedDB QuotaExceededError encountered. Pruning volatile caches.');
      await StorageResilience.pruneVolatileCaches(db);
    }
    throw err;
  }
}

// Retrieve layer binary blobs for a project
export async function getLayerBlobsForProject(projectId: string): Promise<StoredLayerBlob[]> {
  return await db.layerBlobs.where('projectId').equals(projectId).toArray();
}

// Delete layer binary blobs for a project
export async function deleteLayerBlobsForProject(projectId: string): Promise<void> {
  try {
    await db.layerBlobs.where('projectId').equals(projectId).delete();
  } catch (err) {
    console.error(`Failed to delete layer blobs for project ${projectId}:`, err);
  }
}

/**
 * Determines whether an error was caused by an expected database closure or abort
 * (e.g. during page unload, navigation, or explicit test connection teardown).
 */
function isIgnorableDbClosure(err: unknown): boolean {
  if (!db.isOpen()) return true;
  const e = err as { name?: string; message?: string } | null;
  if (!e) return false;
  return (
    e.name === 'DatabaseClosedError' ||
    e.name === 'AbortError' ||
    (typeof e.message === 'string' && e.message.includes('Database has been closed'))
  );
}

export type AutoSaveOutcome =
  | { ok: true; status: 'saved' }
  | { ok: false; reason: 'invariant-invalid'; error: string }
  | { ok: false; reason: 'aborted'; error?: string }
  | { ok: false; reason: 'quota-exceeded'; error?: string }
  | { ok: false; reason: 'error'; error: string };

// Autosave current workspace to IndexedDB with strict pre-transaction validation
export async function autoSaveWorkspaceDetailed(
  projectId: string,
  project: ProjectFile,
  thumbnailDataUrl?: string,
  layerBlobs?: Array<{ layerId: string; frameIndex: number; blob: Blob }>,
  activeLayerKeys?: Array<{ layerId: string; frameIndex: number }>
): Promise<AutoSaveOutcome> {
  // Pre-transaction validation: abort immediately before opening transaction or mutating DB
  const validation = validateProjectFile(project);
  if (!validation.ok) {
    return {
      ok: false,
      reason: 'invariant-invalid',
      error: validation.error,
    };
  }

  const validProject = validation.value;
  const name = validProject.name;
  const width = validProject.width;
  const height = validProject.height;
  const fps = validProject.fps;

  try {
    if (!db.isOpen()) await db.open();
    await db.transaction('rw', db.projects, db.layerBlobs, async () => {
      const existing = await db.projects.get(projectId);
      const createdAt = existing?.createdAt || validProject.createdAt || Date.now();
      const now = Date.now();
      const dataJson = JSON.stringify(validProject);
      await db.projects.put({
        id: projectId,
        name,
        width,
        height,
        fps,
        createdAt,
        updatedAt: now,
        thumbnailDataUrl: thumbnailDataUrl || existing?.thumbnailDataUrl,
        dataJson,
      });

      if (layerBlobs !== undefined || activeLayerKeys !== undefined) {
        // Collect all active layer keys from valid project frames
        const activeKeySet = new Set<string>();
        if (activeLayerKeys) {
          for (const k of activeLayerKeys) {
            activeKeySet.add(`${k.layerId}::${k.frameIndex}`);
          }
        } else {
          for (let fIdx = 0; fIdx < validProject.frames.length; fIdx++) {
            const frame = validProject.frames[fIdx];
            for (const layer of frame.layers) {
              if (layer?.id) activeKeySet.add(`${layer.id}::${fIdx}`);
            }
          }
        }

        const existingRecords = await db.layerBlobs.where('projectId').equals(projectId).toArray();
        const existingMap = new Map<string, StoredLayerBlob>();
        const idsToDelete: number[] = [];

        for (const rec of existingRecords) {
          const k = `${rec.layerId}::${rec.frameIndex}`;
          if (!activeKeySet.has(k)) {
            if (rec.id !== undefined) idsToDelete.push(rec.id);
          } else {
            if (existingMap.has(k)) {
              if (rec.id !== undefined) idsToDelete.push(rec.id);
            } else {
              existingMap.set(k, rec);
            }
          }
        }

        const recordsToPut: StoredLayerBlob[] = [];
        const recordsToAdd: StoredLayerBlob[] = [];

        if (layerBlobs && layerBlobs.length > 0) {
          for (const b of layerBlobs) {
            const k = `${b.layerId}::${b.frameIndex}`;
            const existingRec = existingMap.get(k);
            if (existingRec && existingRec.id !== undefined) {
              recordsToPut.push({
                id: existingRec.id,
                projectId,
                layerId: b.layerId,
                frameIndex: b.frameIndex,
                blob: b.blob,
                updatedAt: now,
              });
            } else {
              recordsToAdd.push({
                projectId,
                layerId: b.layerId,
                frameIndex: b.frameIndex,
                blob: b.blob,
                updatedAt: now,
              });
            }
          }
        }

        if (idsToDelete.length > 0) {
          await db.layerBlobs.bulkDelete(idsToDelete);
        }
        if (recordsToPut.length > 0) {
          await db.layerBlobs.bulkPut(recordsToPut);
        }
        if (recordsToAdd.length > 0) {
          await db.layerBlobs.bulkAdd(recordsToAdd);
        }
      }
    });
    return { ok: true, status: 'saved' };
  } catch (err: unknown) {
    if (isIgnorableDbClosure(err)) {
      console.warn('Autosave aborted (database closed or reset in progress)');
      return { ok: false, reason: 'aborted', error: err instanceof Error ? err.message : String(err) };
    }
    if (StorageResilience.isQuotaExceeded(err)) {
      console.warn('[autoSaveWorkspaceDetailed] Storage quota exceeded. Pruning volatile caches.');
      await StorageResilience.pruneVolatileCaches(db);
      return { ok: false, reason: 'quota-exceeded', error: err instanceof Error ? err.message : String(err) };
    }
    console.error('Autosave error:', err);
    return { ok: false, reason: 'error', error: err instanceof Error ? err.message : String(err) };
  }
}

// Load the most recently saved project from IndexedDB
export async function loadLatestSavedWorkspace(): Promise<StoredWorkspace | null> {
  try {
    if (!db.isOpen()) await db.open();
    return await db.transaction('r', db.projects, db.layerBlobs, async () => {
      const projects = await db.projects.orderBy('updatedAt').reverse().limit(1).toArray();
      const project = projects[0];
      return project ? { ...project, layerBlobs: await db.layerBlobs.where('projectId').equals(project.id).toArray() } : null;
    });
  } catch (err: unknown) {
    throw new Error('Saved workspace could not be read.', { cause: err });
  }
}

// List all projects sorted by updatedAt descending
export async function listAllProjects(): Promise<StoredProject[]> {
  try {
    if (!db.isOpen()) await db.open();
    return await db.projects.orderBy('updatedAt').reverse().toArray();
  } catch (err: unknown) {
    if (isIgnorableDbClosure(err)) return [];
    console.error('List projects error:', err);
    throw new Error('Database storage is unavailable; could not read project list.', { cause: err });
  }
}

// Get project by ID
export async function getProjectById(id: string): Promise<StoredWorkspace | null> {
  try {
    if (!db.isOpen()) await db.open();
    return await db.transaction('r', db.projects, db.layerBlobs, async () => {
      const project = await db.projects.get(id);
      return project ? { ...project, layerBlobs: await db.layerBlobs.where('projectId').equals(id).toArray() } : null;
    });
  } catch (err: unknown) {
    if (isIgnorableDbClosure(err)) return null;
    console.error(`Get project ${id} error:`, err);
    return null;
  }
}

// Delete project by ID atomically across metadata, layer blobs, and recovery records
export async function deleteProject(id: string): Promise<boolean> {
  try {
    if (!db.isOpen()) await db.open();
    await db.transaction('rw', db.projects, db.layerBlobs, db.recoveryRecords, async () => {
      await db.projects.delete(id);
      await db.layerBlobs.where('projectId').equals(id).delete();
      await db.recoveryRecords.delete(id);
    });
    clearPersistedRevisions(id);
    return true;
  } catch (err: unknown) {
    if (isIgnorableDbClosure(err)) return false;
    console.error(`Delete project ${id} error:`, err);
    return false;
  }
}

// Duplicate an existing project
export async function duplicateProject(id: string, newName?: string): Promise<StoredProject | null> {
  try {
    if (!db.isOpen()) await db.open();
    return await db.transaction('rw', db.projects, db.layerBlobs, async () => {
      const source = await db.projects.get(id);
      if (!source) return null;

      const newId = createId('proj');
      const now = Date.now();
      const clonedName = newName || `Copy of ${source.name}`;

      let updatedDataJson = source.dataJson;
      const decoded = decodeAndValidateProject(source.dataJson);
      if (decoded.ok) {
        const validated = decoded.value;
        validated.name = clonedName;
        validated.createdAt = now;
        validated.updatedAt = now;
        updatedDataJson = JSON.stringify(validated);
      } else {
        console.warn(`Duplicate project ${id}: source data failed validation (${decoded.error}), preserving data structure.`);
      }

      const duplicate: StoredProject = {
        ...source,
        id: newId,
        name: clonedName,
        createdAt: now,
        updatedAt: now,
        dataJson: updatedDataJson,
      };

      const sourceBlobs = await db.layerBlobs.where('projectId').equals(id).toArray();
      await db.projects.put(duplicate);
      await db.layerBlobs.bulkAdd(sourceBlobs.map((b) => ({
        projectId: newId,
        updatedAt: now,
        layerId: b.layerId,
        frameIndex: b.frameIndex,
        blob: b.blob,
      })));
      return duplicate;
    });
  } catch (err) {
    console.error(`Duplicate project ${id} error:`, err);
    return null;
  }
}

// Rename an existing project
export async function renameProject(id: string, newName: string): Promise<boolean> {
  try {
    if (!db.isOpen()) await db.open();
    return await db.transaction('rw', db.projects, async () => {
      const project = await db.projects.get(id);
      if (!project) return false;

      const now = Date.now();
      let updatedDataJson = project.dataJson;
      const decoded = decodeAndValidateProject(project.dataJson);
      if (decoded.ok) {
        const validated = decoded.value;
        validated.name = newName;
        validated.updatedAt = now;
        updatedDataJson = JSON.stringify(validated);
      } else {
        console.warn(`Rename project ${id}: source data failed validation (${decoded.error}), preserving data structure.`);
      }

      await db.projects.update(id, {
        name: newName,
        updatedAt: now,
        dataJson: updatedDataJson,
      });
      return true;
    });
  } catch (err) {
    if (isIgnorableDbClosure(err)) return false;
    console.error(`Rename project ${id} error:`, err);
    return false;
  }
}

// Create a blank ProjectFile matching resetToNewProject defaults
export function createBlankProjectFile(
  name: string = 'Untitled Sprite',
  width: number = 32,
  height: number = 32,
  fps: number = 8
): ProjectFile {
  assertWorkspaceDimensions(width, height);
  const initialLayerId = createId('layer');
  const initialFrameId = createId('frame');
  const now = Date.now();

  return {
    format: PROJECT_FORMAT_ID,
    version: PROJECT_FORMAT_VERSION,
    name,
    width,
    height,
    fps,
    loopMode: 'repeat',
    onionSkin: {
      enabled: false,
      prevFrames: 1,
      nextFrames: 1,
      prevColor: '#7fae6b',
      nextColor: '#c792df',
      opacity: 0.35,
    },
    palettes: [
      {
        id: 'pal-default-atelier',
        name: 'Atelier Hearth',
        colors: [
          '#140d1f', '#281b3d', '#3a2e4c', '#6a5880',
          '#a86ec6', '#c792df', '#dcabdf', '#d0c4df',
          '#dddddf', '#dddfdf', '#f0be7c', '#e2a35d',
        ],
      },
    ],
    currentPaletteId: 'pal-default-atelier',
    customRamps: [],
    clips: [{ id: 'clip-1', name: 'Default Clip', startFrame: 0, endFrame: 0 }],
    frames: [
      {
        id: initialFrameId,
        durationMs: 125,
        layers: [
          {
            id: initialLayerId,
            name: 'Base Layer',
            visible: true,
            locked: false,
            opacity: 1,
            blendMode: 'source-over',
          },
        ],
      },
    ],
    createdAt: now,
    updatedAt: now,
  };
}

// Create a blank project record matching resetToNewProject defaults
export async function createBlankProject(
  name: string = 'Untitled Sprite',
  width: number = 32,
  height: number = 32
): Promise<StoredProject> {
  const initialProjectFile = createBlankProjectFile(name, width, height);
  const newId = createId('proj');
  const now = initialProjectFile.createdAt;

  const stored: StoredProject = {
    id: newId,
    name,
    width,
    height,
    fps: initialProjectFile.fps,
    createdAt: now,
    updatedAt: now,
    dataJson: JSON.stringify(initialProjectFile),
  };

  await db.projects.put(stored);
  return stored;
}
