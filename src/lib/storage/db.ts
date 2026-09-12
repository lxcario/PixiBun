import Dexie, { Table } from 'dexie';
import type { DiagnosticEntry } from '@/types/diagnostics';
import { createId } from '@/lib/engine/id';
import { PROJECT_FORMAT_ID, PROJECT_FORMAT_VERSION, type ProjectFile } from '@/types/project';
import { StorageResilience } from '@/lib/safety/storageResilience';

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

export class PixiBunDatabase extends Dexie {
  projects!: Table<StoredProject, string>;
  diagnostics!: Table<DiagnosticEntry, string>;
  layerBlobs!: Table<StoredLayerBlob, number>;

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
  }
}

export const db = new PixiBunDatabase();

if (typeof window !== 'undefined') {
  (window as unknown as { __pixibunDb?: PixiBunDatabase }).__pixibunDb = db;
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
  try {
    return await db.layerBlobs.where('projectId').equals(projectId).toArray();
  } catch (err) {
    console.error(`Failed to get layer blobs for project ${projectId}:`, err);
    return [];
  }
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

// Autosave current workspace to IndexedDB
export async function autoSaveWorkspace(
  projectId: string,
  name: string,
  width: number,
  height: number,
  fps: number,
  stateSnapshot: object,
  thumbnailDataUrl?: string,
  layerBlobs?: Array<{ layerId: string; frameIndex: number; blob: Blob }>
): Promise<boolean> {
  try {
    if (!db.isOpen()) return false;
    const existing = await db.projects.get(projectId);
    const createdAt = existing?.createdAt || Date.now();
    const dataJson = JSON.stringify(stateSnapshot);
    await db.projects.put({
      id: projectId,
      name,
      width,
      height,
      fps,
      createdAt,
      updatedAt: Date.now(),
      thumbnailDataUrl: thumbnailDataUrl || existing?.thumbnailDataUrl,
      dataJson,
    });
    if (layerBlobs && layerBlobs.length > 0) {
      await saveLayerBlobs(projectId, layerBlobs);
    }
    return true;
  } catch (err: unknown) {
    if (isIgnorableDbClosure(err)) {
      console.warn('Autosave aborted (database closed or reset in progress)');
      return false;
    }
    if (StorageResilience.isQuotaExceeded(err)) {
      console.warn('[autoSaveWorkspace] Storage quota exceeded. Pruning volatile caches.');
      await StorageResilience.pruneVolatileCaches(db);
      return false;
    }
    console.error('Autosave error:', err);
    return false;
  }
}

// Load the most recently saved project from IndexedDB
export async function loadLatestSavedWorkspace(): Promise<StoredProject | null> {
  try {
    if (!db.isOpen()) {
      return null;
    }
    const projects = await db.projects.orderBy('updatedAt').reverse().limit(1).toArray();
    return projects[0] || null;
  } catch (err: unknown) {
    if (isIgnorableDbClosure(err)) {
      console.warn('Load autosave aborted (database closed or reset in progress)');
      return null;
    }
    console.error('Load autosave error:', err);
    return null;
  }
}

// List all projects sorted by updatedAt descending
export async function listAllProjects(): Promise<StoredProject[]> {
  try {
    if (!db.isOpen()) return [];
    return await db.projects.orderBy('updatedAt').reverse().toArray();
  } catch (err: unknown) {
    if (isIgnorableDbClosure(err)) return [];
    console.error('List projects error:', err);
    return [];
  }
}

// Get project by ID
export async function getProjectById(id: string): Promise<StoredProject | null> {
  try {
    if (!db.isOpen()) return null;
    const project = await db.projects.get(id);
    return project || null;
  } catch (err: unknown) {
    if (isIgnorableDbClosure(err)) return null;
    console.error(`Get project ${id} error:`, err);
    return null;
  }
}

// Delete project by ID
export async function deleteProject(id: string): Promise<boolean> {
  try {
    if (!db.isOpen()) return false;
    await db.projects.delete(id);
    await deleteLayerBlobsForProject(id);
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
    const source = await db.projects.get(id);
    if (!source) return null;

    const newId = createId('proj');
    const now = Date.now();
    const clonedName = newName || `Copy of ${source.name}`;

    let updatedDataJson = source.dataJson;
    try {
      const parsed = JSON.parse(source.dataJson) as ProjectFile;
      parsed.name = clonedName;
      parsed.createdAt = now;
      parsed.updatedAt = now;
      updatedDataJson = JSON.stringify(parsed);
    } catch {
      // If parsing fails, preserve original payload
    }

    const duplicate: StoredProject = {
      ...source,
      id: newId,
      name: clonedName,
      createdAt: now,
      updatedAt: now,
      dataJson: updatedDataJson,
    };

    await db.projects.put(duplicate);

    const sourceBlobs = await getLayerBlobsForProject(id);
    if (sourceBlobs.length > 0) {
      await saveLayerBlobs(
        newId,
        sourceBlobs.map((b) => ({
          layerId: b.layerId,
          frameIndex: b.frameIndex,
          blob: b.blob,
        }))
      );
    }

    return duplicate;
  } catch (err) {
    console.error(`Duplicate project ${id} error:`, err);
    return null;
  }
}

// Rename an existing project
export async function renameProject(id: string, newName: string): Promise<boolean> {
  try {
    const project = await db.projects.get(id);
    if (!project) return false;

    let updatedDataJson = project.dataJson;
    try {
      const parsed = JSON.parse(project.dataJson) as ProjectFile;
      parsed.name = newName;
      parsed.updatedAt = Date.now();
      updatedDataJson = JSON.stringify(parsed);
    } catch {
      // fallback
    }

    await db.projects.update(id, {
      name: newName,
      updatedAt: Date.now(),
      dataJson: updatedDataJson,
    });
    return true;
  } catch (err) {
    console.error(`Rename project ${id} error:`, err);
    return false;
  }
}

// Create a blank project record matching resetToNewProject defaults
export async function createBlankProject(
  name: string = 'Untitled Sprite',
  width: number = 32,
  height: number = 32
): Promise<StoredProject> {
  const newId = createId('proj');
  const initialLayerId = createId('layer');
  const initialFrameId = createId('frame');
  const now = Date.now();

  const initialProjectFile: ProjectFile = {
    format: PROJECT_FORMAT_ID,
    version: PROJECT_FORMAT_VERSION,
    name,
    width,
    height,
    fps: 8,
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

  const stored: StoredProject = {
    id: newId,
    name,
    width,
    height,
    fps: 8,
    createdAt: now,
    updatedAt: now,
    dataJson: JSON.stringify(initialProjectFile),
  };

  await db.projects.put(stored);
  return stored;
}
