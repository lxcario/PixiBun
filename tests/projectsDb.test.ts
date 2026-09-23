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
  autoSaveWorkspaceDetailed,
  loadLatestSavedWorkspace,
  saveLayerBlobs,
  getLayerBlobsForProject,
  deleteLayerBlobsForProject,
} from '@/lib/storage/db';
import type { ProjectFile } from '@/types/project';

describe('Projects Database (Dexie IndexedDB CRUD)', () => {
  beforeEach(async () => {
    await db.projects.clear();
    await db.layerBlobs.clear();
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
    const projectFile: ProjectFile = JSON.parse(created.dataJson);
    projectFile.name = 'Pixel Bunny Updated';
    projectFile.fps = 12;

    await new Promise((r) => setTimeout(r, 15));
    const updatedSuccess = await autoSaveWorkspaceDetailed(
      created.id,
      projectFile,
      'data:image/png;base64,mockthumb'
    );

    expect(updatedSuccess.ok).toBe(true);

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

  it('deletes a project by ID and cascades deletion of its layerBlobs', async () => {
    const proj = await createBlankProject('To Be Deleted');
    expect(await getProjectById(proj.id)).not.toBeNull();

    const mockBlob = new Blob(['mock-binary-data'], { type: 'image/png' });
    await saveLayerBlobs(proj.id, [{ layerId: 'layer-1', frameIndex: 0, blob: mockBlob }]);
    const savedBlobs = await getLayerBlobsForProject(proj.id);
    expect(savedBlobs).toHaveLength(1);

    const deleted = await deleteProject(proj.id);
    expect(deleted).toBe(true);
    expect(await getProjectById(proj.id)).toBeNull();

    const remainingBlobs = await getLayerBlobsForProject(proj.id);
    expect(remainingBlobs).toHaveLength(0);

    const all = await listAllProjects();
    expect(all).toHaveLength(0);
  });

  it('stores and retrieves binary layerBlobs in Dexie schema v4 via autoSaveWorkspace', async () => {
    const proj = await createBlankProject('Binary Project', 16, 16);
    const mockBlob1 = new Blob(['png-pixels-layer1'], { type: 'image/png' });
    const mockBlob2 = new Blob(['png-pixels-layer2'], { type: 'image/png' });

    const projectFile: ProjectFile = JSON.parse(proj.dataJson);
    projectFile.name = 'Binary Project Saved';
    projectFile.width = 16;
    projectFile.height = 16;
    projectFile.fps = 8;
    projectFile.frames = [
      {
        id: 'frame-1',
        durationMs: 100,
        layers: [
          { id: 'layer-1', name: 'Layer 1', visible: true, locked: false, opacity: 1, blendMode: 'source-over' },
          { id: 'layer-2', name: 'Layer 2', visible: true, locked: false, opacity: 1, blendMode: 'source-over' },
        ],
      },
    ];

    const success = await autoSaveWorkspaceDetailed(
      proj.id,
      projectFile,
      undefined,
      [
        { layerId: 'layer-1', frameIndex: 0, blob: mockBlob1 },
        { layerId: 'layer-2', frameIndex: 0, blob: mockBlob2 },
      ]
    );

    expect(success.ok).toBe(true);
    const storedBlobs = await getLayerBlobsForProject(proj.id);
    expect(storedBlobs).toHaveLength(2);
    expect(storedBlobs.map((b) => b.layerId)).toEqual(['layer-1', 'layer-2']);

    const loadedProject = await getProjectById(proj.id);
    expect(loadedProject?.name).toBe('Binary Project Saved');
    const parsed = JSON.parse(loadedProject?.dataJson ?? '{}');
    expect(parsed.name).toBe('Binary Project Saved');
    expect(parsed.frames[0].layers).toHaveLength(2);

    await deleteLayerBlobsForProject(proj.id);
    const clearedBlobs = await getLayerBlobsForProject(proj.id);
    expect(clearedBlobs).toHaveLength(0);
  });

  it('clones layerBlobs when duplicating an existing project', async () => {
    const original = await createBlankProject('Source Sprite', 32, 32);
    const mockBlob = new Blob(['source-pixels'], { type: 'image/png' });
    await saveLayerBlobs(original.id, [{ layerId: 'layer-src', frameIndex: 0, blob: mockBlob }]);

    const duplicate = await duplicateProject(original.id, 'Cloned Sprite');
    expect(duplicate).not.toBeNull();

    const clonedBlobs = await getLayerBlobsForProject(duplicate!.id);
    expect(clonedBlobs).toHaveLength(1);
    expect(clonedBlobs[0].layerId).toBe('layer-src');
    expect(clonedBlobs[0].projectId).toBe(duplicate!.id);
  });

  it('incrementally upserts layerBlobs, pruning deleted layers while avoiding rewrites for unchanged layers', async () => {
    const proj = await createBlankProject('Incremental Sprite', 16, 16);
    const blob1 = new Blob(['layer1-content'], { type: 'image/png' });
    const blob2 = new Blob(['layer2-content'], { type: 'image/png' });

    // 1. Initial save of layer1 and layer2
    await saveLayerBlobs(proj.id, [
      { layerId: 'layer-1', frameIndex: 0, blob: blob1 },
      { layerId: 'layer-2', frameIndex: 0, blob: blob2 },
    ]);

    const initialBlobs = await getLayerBlobsForProject(proj.id);
    expect(initialBlobs).toHaveLength(2);
    const l1Record = initialBlobs.find((b) => b.layerId === 'layer-1')!;
    const l2Record = initialBlobs.find((b) => b.layerId === 'layer-2')!;
    expect(l1Record.id).toBeDefined();
    expect(l2Record.id).toBeDefined();

    // 2. Second save where layer1 is unchanged, but layer2 is updated with new content
    const blob2Updated = new Blob(['layer2-MUTATED-content'], { type: 'image/png' });
    await new Promise((r) => setTimeout(r, 10));

    await saveLayerBlobs(proj.id, [
      { layerId: 'layer-1', frameIndex: 0, blob: blob1 }, // identical
      { layerId: 'layer-2', frameIndex: 0, blob: blob2Updated }, // changed
    ]);

    const secondSaveBlobs = await getLayerBlobsForProject(proj.id);
    expect(secondSaveBlobs).toHaveLength(2);

    const l1AfterSecond = secondSaveBlobs.find((b) => b.layerId === 'layer-1')!;
    const l2AfterSecond = secondSaveBlobs.find((b) => b.layerId === 'layer-2')!;

    // Layer 1 was NOT rewritten: preserved identical id and updatedAt
    expect(l1AfterSecond.id).toBe(l1Record.id);
    expect(l1AfterSecond.updatedAt).toBe(l1Record.updatedAt);

    // Layer 2 was updated: preserved same id, but updatedAt advanced
    expect(l2AfterSecond.id).toBe(l2Record.id);
    expect(l2AfterSecond.updatedAt).toBeGreaterThan(l2Record.updatedAt);

    // 3. Third save where layer-2 is deleted and layer-3 is added
    const blob3 = new Blob(['layer3-brand-new'], { type: 'image/png' });
    await saveLayerBlobs(proj.id, [
      { layerId: 'layer-1', frameIndex: 0, blob: blob1 },
      { layerId: 'layer-3', frameIndex: 0, blob: blob3 },
    ]);

    const thirdSaveBlobs = await getLayerBlobsForProject(proj.id);
    expect(thirdSaveBlobs).toHaveLength(2);

    const remainingLayerIds = thirdSaveBlobs.map((b) => b.layerId).sort();
    expect(remainingLayerIds).toEqual(['layer-1', 'layer-3']);

    // Layer 1 was still untouched
    const l1AfterThird = thirdSaveBlobs.find((b) => b.layerId === 'layer-1')!;
    expect(l1AfterThird.id).toBe(l1Record.id);
    expect(l1AfterThird.updatedAt).toBe(l1Record.updatedAt);
  });

  it('safely handles duplicate keys in payload and prunes all layers when payload is empty', async () => {
    const proj = await createBlankProject('Edge Case Sprite', 16, 16);
    const blobA = new Blob(['layer1-v1'], { type: 'image/png' });
    const blobB = new Blob(['layer1-v2-latest'], { type: 'image/png' });

    // Payload with duplicate (layerId, frameIndex) entries
    await saveLayerBlobs(proj.id, [
      { layerId: 'layer-dup', frameIndex: 0, blob: blobA },
      { layerId: 'layer-dup', frameIndex: 0, blob: blobB },
    ]);

    const records = await getLayerBlobsForProject(proj.id);
    // Should be deduplicated to exactly 1 record with latest blob content
    expect(records).toHaveLength(1);
    expect(records[0].layerId).toBe('layer-dup');
    const text = await records[0].blob.text();
    expect(text).toBe('layer1-v2-latest');

    // Saving with empty array prunes all layer records cleanly
    await saveLayerBlobs(proj.id, []);
    const cleared = await getLayerBlobsForProject(proj.id);
    expect(cleared).toHaveLength(0);
  });

  it('stress tests multi-frame, multi-layer binary updates without Dexie transaction deactivation', async () => {
    const proj = await createBlankProject('Stress Animation', 32, 32);

    // Create 15 blobs across 5 frames and 3 layers
    const initialBlobs: Array<{ layerId: string; frameIndex: number; blob: Blob }> = [];
    for (let frame = 0; frame < 5; frame++) {
      for (let layer = 0; layer < 3; layer++) {
        const u8 = new Uint8Array([frame, layer, 42, 99, 128]);
        initialBlobs.push({
          layerId: `layer-${layer}`,
          frameIndex: frame,
          blob: new Blob([u8], { type: 'image/png' }),
        });
      }
    }

    await saveLayerBlobs(proj.id, initialBlobs);
    const stored1 = await getLayerBlobsForProject(proj.id);
    expect(stored1).toHaveLength(15);

    // Mutate only frame 2, layer 1 with different bytes, keep others identical
    const mutatedBlobs = initialBlobs.map((item) => {
      if (item.frameIndex === 2 && item.layerId === 'layer-1') {
        const mutatedBytes = new Uint8Array([2, 1, 99, 99, 255, 255]);
        return {
          ...item,
          blob: new Blob([mutatedBytes], { type: 'image/png' }),
        };
      }
      return item;
    });

    await saveLayerBlobs(proj.id, mutatedBlobs);
    const stored2 = await getLayerBlobsForProject(proj.id);
    expect(stored2).toHaveLength(15);

    const targetRecord = stored2.find((b) => b.frameIndex === 2 && b.layerId === 'layer-1');
    expect(targetRecord).toBeDefined();
    const targetBuf = await targetRecord!.blob.arrayBuffer();
    expect(new Uint8Array(targetBuf)).toEqual(new Uint8Array([2, 1, 99, 99, 255, 255]));

    // Other layers remain intact and identical
    const untouchedRecord = stored2.find((b) => b.frameIndex === 0 && b.layerId === 'layer-0');
    expect(untouchedRecord).toBeDefined();
    const untouchedBuf = await untouchedRecord!.blob.arrayBuffer();
    expect(new Uint8Array(untouchedBuf)).toEqual(new Uint8Array([0, 0, 42, 99, 128]));
  });
});
