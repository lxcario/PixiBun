import Dexie, { Table } from 'dexie';
import type { DiagnosticEntry } from '@/types/diagnostics';
import { createId } from '@/lib/engine/id';
import { PROJECT_FORMAT_ID, PROJECT_FORMAT_VERSION, type ProjectFile } from '@/types/project';

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

// Save layer binary blobs to layerBlobs table
export async function saveLayerBlobs(
  projectId: string,
  blobs: Array<{ layerId: string; frameIndex: number; blob: Blob }>
): Promise<void> {
  const now = Date.now();
  await db.transaction('rw', db.layerBlobs, async () => {
    await db.layerBlobs.where('projectId').equals(projectId).delete();
    const records: StoredLayerBlob[] = blobs.map((b) => ({
      projectId,
      layerId: b.layerId,
      frameIndex: b.frameIndex,
      blob: b.blob,
      updatedAt: now,
    }));
    if (records.length > 0) {
      await db.layerBlobs.bulkAdd(records);
    }
  });
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
  } catch (err) {
    console.error('Autosave error:', err);
    return false;
  }
}

// Load the most recently saved project from IndexedDB
export async function loadLatestSavedWorkspace(): Promise<StoredProject | null> {
  try {
    const projects = await db.projects.orderBy('updatedAt').reverse().limit(1).toArray();
    return projects[0] || null;
  } catch (err) {
    console.error('Load autosave error:', err);
    return null;
  }
}

// List all projects sorted by updatedAt descending
export async function listAllProjects(): Promise<StoredProject[]> {
  try {
    return await db.projects.orderBy('updatedAt').reverse().toArray();
  } catch (err) {
    console.error('List projects error:', err);
    return [];
  }
}

// Get project by ID
export async function getProjectById(id: string): Promise<StoredProject | null> {
  try {
    const project = await db.projects.get(id);
    return project || null;
  } catch (err) {
    console.error(`Get project ${id} error:`, err);
    return null;
  }
}

// Delete project by ID
export async function deleteProject(id: string): Promise<boolean> {
  try {
    await db.projects.delete(id);
    await deleteLayerBlobsForProject(id);
    return true;
  } catch (err) {
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
