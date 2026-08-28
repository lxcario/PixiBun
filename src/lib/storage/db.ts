import Dexie, { Table } from 'dexie';

export interface StoredProject {
  id: string;
  name: string;
  width: number;
  height: number;
  fps: number;
  updatedAt: number;
  dataJson: string; // Serialized frames, layers, palettes, and settings
}

class PixiBunDatabase extends Dexie {
  projects!: Table<StoredProject, string>;

  constructor() {
    super('PixiBunDB');
    this.version(1).stores({
      projects: 'id, name, updatedAt',
    });
  }
}

export const db = new PixiBunDatabase();

// Autosave current workspace to IndexedDB
export async function autoSaveWorkspace(
  projectId: string,
  name: string,
  width: number,
  height: number,
  fps: number,
  stateSnapshot: object
): Promise<void> {
  try {
    const dataJson = JSON.stringify(stateSnapshot);
    await db.projects.put({
      id: projectId,
      name,
      width,
      height,
      fps,
      updatedAt: Date.now(),
      dataJson,
    });
  } catch (err) {
    console.error('Autosave error:', err);
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
