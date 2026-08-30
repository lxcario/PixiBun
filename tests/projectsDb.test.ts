import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  db,
  listAllProjects,
  getProjectById,
  deleteProject,
  duplicateProject,
  renameProject,
  createBlankProject,
  autoSaveWorkspace,
  loadLatestSavedWorkspace,
} from '@/lib/storage/db';

describe('Projects Database (Dexie IndexedDB CRUD)', () => {
  beforeEach(async () => {
    await db.projects.clear();
  });

  it('creates and lists blank projects sorted by updatedAt descending', async () => {
    const p1 = await createBlankProject('Character Sprite', 16, 16);
    // Small delay to ensure timestamp difference
    await new Promise((r) => setTimeout(r, 10));
    const p2 = await createBlankProject('Background Tileset', 64, 64);

    expect(p1.id).toBeDefined();
    expect(p2.id).toBeDefined();
    expect(p1.id).not.toBe(p2.id);

    const all = await listAllProjects();
    expect(all).toHaveLength(2);
    // p2 is newer than p1
    expect(all[0].id).toBe(p2.id);
    expect(all[1].id).toBe(p1.id);
    expect(all[0].name).toBe('Background Tileset');
    expect(all[1].name).toBe('Character Sprite');
  });

  it('loads the latest saved workspace', async () => {
    await createBlankProject('Old Project');
    await new Promise((r) => setTimeout(r, 10));
    const latest = await createBlankProject('Latest Project');

    const loaded = await loadLatestSavedWorkspace();
    expect(loaded?.id).toBe(latest.id);
    expect(loaded?.name).toBe('Latest Project');
  });

  it('updates project through autoSaveWorkspace with thumbnail and preserves createdAt', async () => {
    const created = await createBlankProject('Pixel Bunny', 32, 32);
    const initialCreatedAt = created.createdAt;

    await new Promise((r) => setTimeout(r, 15));
    const updatedSuccess = await autoSaveWorkspace(
      created.id,
      'Pixel Bunny Updated',
      32,
      32,
      12,
      { testState: true },
      'data:image/png;base64,mockthumb'
    );

    expect(updatedSuccess).toBe(true);

    const fetched = await getProjectById(created.id);
    expect(fetched).not.toBeNull();
    expect(fetched?.name).toBe('Pixel Bunny Updated');
    expect(fetched?.fps).toBe(12);
    expect(fetched?.createdAt).toBe(initialCreatedAt);
    expect(fetched?.updatedAt).toBeGreaterThan(initialCreatedAt);
    expect(fetched?.thumbnailDataUrl).toBe('data:image/png;base64,mockthumb');
  });

  it('duplicates an existing project with independent ID and cloned dataJson', async () => {
    const original = await createBlankProject('Original Sprite', 32, 32);
    const duplicate = await duplicateProject(original.id, 'Custom Clone Name');

    expect(duplicate).not.toBeNull();
    expect(duplicate?.id).not.toBe(original.id);
    expect(duplicate?.name).toBe('Custom Clone Name');

    const all = await listAllProjects();
    expect(all).toHaveLength(2);

    // Verify modifying the clone does not affect original
    await renameProject(duplicate!.id, 'New Clone Title');
    const originalFetched = await getProjectById(original.id);
    expect(originalFetched?.name).toBe('Original Sprite');
  });

  it('renames a project and updates its dataJson name', async () => {
    const proj = await createBlankProject('Draft 1');
    const success = await renameProject(proj.id, 'Final Polished Artwork');
    expect(success).toBe(true);

    const updated = await getProjectById(proj.id);
    expect(updated?.name).toBe('Final Polished Artwork');
    expect(updated?.dataJson).toContain('Final Polished Artwork');
  });

  it('deletes a project by ID', async () => {
    const proj = await createBlankProject('To Be Deleted');
    expect(await getProjectById(proj.id)).not.toBeNull();

    const deleted = await deleteProject(proj.id);
    expect(deleted).toBe(true);
    expect(await getProjectById(proj.id)).toBeNull();

    const all = await listAllProjects();
    expect(all).toHaveLength(0);
  });
});
