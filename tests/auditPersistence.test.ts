// @vitest-environment happy-dom
import 'fake-indexeddb/auto';
import { Blob as NodeBlob } from 'node:buffer';
import { makeCanvas } from './helpers/mockCanvas';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { db, createBlankProject, autoSaveWorkspace, loadLatestSavedWorkspace, getLayerBlobsForProject, duplicateProject } from '@/lib/storage/db';
import { validateProjectFile } from '@/lib/project/schema';
import { hydrateProject, buildProjectFile, buildAutosavePayloadAsync } from '@/lib/project/serialize';
import { compositeFrame } from '@/lib/render/compositor';
import type { ProjectFile } from '@/types/project';
import { useStudioStore } from '@/stores/studioStore';
import { getOrCreateBuffer, hasBuffer, clearAllBuffers } from '@/lib/engine/bufferRegistry';
import { isCurrentSaveRevision } from '@/lib/project/saveRevision';
import { DesktopFileSystem } from '@/lib/storage/desktopFileSystem';
import { SafeJson } from '@/lib/safety/safeJson';
import { readImportFile } from '@/lib/project/importFile';
import { ImageHeaderProbe } from '@/lib/safety/imageHeaderProbe';
import { validateStructurePayload } from '@/lib/sync/p2pSync';

beforeEach(async () => {
  vi.stubGlobal('Blob', NodeBlob);
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => makeCanvas(32, 32).getContext('2d'));
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,cG5n');
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(callback => callback(new Blob(['png'])));
  await db.open();
  await db.projects.clear();
  await db.layerBlobs.clear();
  useStudioStore.getState().resetToNewProject();
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); clearAllBuffers(); });

describe('audit persistence regressions', () => {
  it('probes compact lossless WebP headers and rejects oversized extended WebP before decoding', async () => {
    const compact = new Uint8Array(25);
    const view = new DataView(compact.buffer);
    view.setUint32(0, 0x52494646); view.setUint32(8, 0x57454250);
    view.setUint32(12, 0x5650384c); compact[20] = 0x2f;
    view.setUint32(21, 3 | (4 << 14), true);
    expect(await ImageHeaderProbe.probe(compact)).toEqual({ width: 4, height: 5, format: 'WebP' });
    const extended = new Uint8Array(30);
    extended.set(compact.subarray(0, 20));
    new DataView(extended.buffer).setUint32(12, 0x56503858);
    extended[24] = 0; extended[25] = 32; // 8193px wide
    await expect(ImageHeaderProbe.probe(extended)).rejects.toThrow(RangeError);
  });
  it('opens a closed database before restoring an existing workspace', async () => {
    const saved = await createBlankProject('Restore me');
    db.close();
    expect((await loadLatestSavedWorkspace())?.id).toBe(saved.id);
  });

  it('rolls metadata and pixels back together when a blob write fails', async () => {
    const saved = await createBlankProject('Original');
    const blobs = [{ layerId: 'layer', frameIndex: 0, blob: new Blob(['old']) }];
    expect(await autoSaveWorkspace(saved.id, 'Original', 32, 32, 8, { old: true }, undefined, blobs)).toBe(true);
    vi.spyOn(db.layerBlobs, 'bulkAdd').mockRejectedValueOnce(new DOMException('Full', 'QuotaExceededError'));
    expect(await autoSaveWorkspace(saved.id, 'Changed', 32, 32, 8, { old: false }, undefined,
      [{ ...blobs[0], blob: new Blob(['new']) }])).toBe(false);
    expect((await db.projects.get(saved.id))?.name).toBe('Original');
    expect(await (await getLayerBlobsForProject(saved.id))[0].blob.text()).toBe('old');
  });

  it('does not leave a partial duplicate after a blob write fails', async () => {
    const saved = await createBlankProject();
    await autoSaveWorkspace(saved.id, saved.name, 32, 32, 8, {}, undefined,
      [{ layerId: 'layer', frameIndex: 0, blob: new Blob(['old']) }]);
    vi.spyOn(db.layerBlobs, 'bulkAdd').mockRejectedValueOnce(new Error('Disk failure'));
    expect(await duplicateProject(saved.id)).toBeNull();
    expect(await db.projects.count()).toBe(1);
  });

  it('replaces the complete layer set even when it is empty', async () => {
    const saved = await createBlankProject();
    await autoSaveWorkspace(saved.id, saved.name, 32, 32, 8, {}, undefined,
      [{ layerId: 'layer', frameIndex: 0, blob: new Blob(['old']) }]);
    await autoSaveWorkspace(saved.id, saved.name, 32, 32, 8, {}, undefined, []);
    expect(await getLayerBlobsForProject(saved.id)).toEqual([]);
  });

  it('preserves generated tags through portable and autosave serialization and validation', async () => {
    const frame = useStudioStore.getState().frames[0];
    useStudioStore.setState({ frames: [{ ...frame, layers: [{ ...frame.layers[0], tag: 'photometric' }] }] });
    const file = buildProjectFile();
    expect(file.frames[0].layers[0].tag).toBe('photometric');
    const payload = await buildAutosavePayloadAsync();
    const checked = validateProjectFile(payload.project);
    expect(checked.ok && checked.value.frames[0].layers[0].tag).toBe('photometric');
  });

  it('rejects malformed ramps and duplicate layer IDs in both project and peer structures', () => {
    const file = buildProjectFile();
    expect(validateProjectFile({ ...file, customRamps: [{}] }).ok).toBe(false);
    const frames = [file.frames[0], { ...file.frames[0], id: 'second' }];
    expect(validateProjectFile({ ...file, frames }).ok).toBe(false);
    expect(validateStructurePayload({ width: 32, height: 32, frames })).toBeNull();
  });

  it('leaves live buffers and project identity intact when decoding fails', async () => {
    const initial = useStudioStore.getState();
    const buffer = getOrCreateBuffer(initial.activeLayerId, 32, 32);
    const file = buildProjectFile();
    file.frames[0].layers[0].pngBase64 = btoa('not a PNG');
    await expect(hydrateProject(file, 'replacement')).rejects.toThrow();
    expect(useStudioStore.getState().currentProjectId).toBe(initial.currentProjectId);
    expect(hasBuffer(initial.activeLayerId)).toBe(true);
    expect(getOrCreateBuffer(initial.activeLayerId, 32, 32)).toBe(buffer);
  });

  it('detects edits even when the dirty flag was already true', () => {
    useStudioStore.getState().setDirty(true);
    const snapshot = useStudioStore.getState();
    useStudioStore.getState().setDirty(true);
    expect(isCurrentSaveRevision(snapshot)).toBe(false);
  });

  it('clears native file association on a new project', () => {
    DesktopFileSystem.setActiveHandle({ name: 'original.pixibun' } as FileSystemFileHandle);
    useStudioStore.getState().resetToNewProject();
    expect(DesktopFileSystem.getActiveHandle()).toBeNull();
  });

  it.each([4096, 0, -1, 1.5, NaN, Infinity])('rejects invalid canvas width %s before mutating', width => {
    expect(() => useStudioStore.getState().setCanvasSize(width, 32)).toThrow(RangeError);
    expect(useStudioStore.getState().canvasWidth).toBe(32);
  });

  it('bounds imported JSON depth and file bytes before parsing or decoding', async () => {
    expect(() => SafeJson.parse('['.repeat(10000) + '0' + ']'.repeat(10000))).toThrow(RangeError);
    const file = new File(['{}'], 'large.pixibun');
    Object.defineProperty(file, 'size', { value: SafeJson.MAX_PAYLOAD_BYTES + 1 });
    const read = vi.spyOn(file, 'text');
    await expect(readImportFile(file)).rejects.toThrow('50 MB');
    expect(read).not.toHaveBeenCalled();
  });

  it('guarantees corrupt project and blobs in DB are completely preserved on restore failure and fresh project is unblocked', async () => {
    const corruptId = 'precious-corrupt-project';
    const originalJson = '{"format":"pixibun-project","version":3,"invalid":true}';
    await db.projects.put({
      id: corruptId,
      name: 'Precious Corrupt',
      width: 32,
      height: 32,
      fps: 8,
      dataJson: originalJson,
      createdAt: 1000,
      updatedAt: 2000,
    });
    await db.layerBlobs.put({
      id: 1,
      projectId: corruptId,
      layerId: 'layer-1',
      frameIndex: 0,
      blob: new Blob(['precious-pixel-data']),
      updatedAt: 1000,
    });

    // 1. Verify latest project is the corrupt one
    const latest = await loadLatestSavedWorkspace();
    expect(latest?.id).toBe(corruptId);

    // 2. Decode fails on corrupt project
    const validation = validateProjectFile(JSON.parse(latest!.dataJson));
    expect(validation.ok).toBe(false);

    // 3. Studio recovers under a fresh project
    useStudioStore.getState().resetToNewProject();
    const freshId = useStudioStore.getState().currentProjectId;
    expect(freshId).not.toBe(corruptId);

    // 4. Autosave writes to fresh project
    const success = await autoSaveWorkspace(
      freshId,
      'Fresh Project',
      32,
      32,
      8,
      { format: 'pixibun-project', version: 3, name: 'Fresh Project' },
      undefined,
      [{ layerId: 'fresh-layer', frameIndex: 0, blob: new Blob(['fresh-pixel-data']) }]
    );
    expect(success).toBe(true);

    // 5. Corrupt project in DB remains completely unchanged and NOT overwritten or deleted
    const preservedProject = await db.projects.get(corruptId);
    expect(preservedProject).toBeDefined();
    expect(preservedProject?.dataJson).toBe(originalJson);
    expect(preservedProject?.updatedAt).toBe(2000);

    // 6. Stored layer blobs for corrupt project remain intact
    const preservedBlobs = await getLayerBlobsForProject(corruptId);
    expect(preservedBlobs).toHaveLength(1);
    expect(await preservedBlobs[0].blob.text()).toBe('precious-pixel-data');

    // 7. Fresh project is interactive and can be saved, reset, or imported
    expect(useStudioStore.getState().currentProjectId).toBe(freshId);
    useStudioStore.getState().resetToNewProject();
    expect(useStudioStore.getState().currentProjectId).not.toBe(freshId);
  });

  it('proves lazy-buffer compatibility lifecycle: unallocated hydration, transparent composite, on-demand allocation, editing, saving, and re-hydration', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({
      width: 32,
      height: 32,
      close: vi.fn(),
    }));
    vi.spyOn(ImageHeaderProbe, 'probe').mockResolvedValue({ width: 32, height: 32, format: 'PNG' });

    const baseProject = buildProjectFile();
    const project: ProjectFile = {
      ...baseProject,
      name: 'Lazy Buffer Lifecycle Project',
      frames: [
        {
          id: 'frame-1',
          durationMs: 100,
          layers: [
            {
              id: 'layer-active',
              name: 'Active Layer',
              visible: true,
              locked: false,
              opacity: 1,
              blendMode: 'source-over',
            },
            {
              id: 'layer-lazy',
              name: 'Lazy Background Layer',
              visible: true,
              locked: false,
              opacity: 1,
              blendMode: 'source-over',
            },
          ],
        },
      ],
    };

    // 1. Hydrate project: layer-lazy has NO stored blob and is NOT active initial layer
    clearAllBuffers();
    await hydrateProject(project, 'proj-lazy-lifecycle');

    // Verify layer-lazy exists in store metadata but has NO allocated buffer in registry
    const state = useStudioStore.getState();
    expect(state.frames[0].layers).toHaveLength(2);
    expect(state.frames[0].layers[1].id).toBe('layer-lazy');
    expect(hasBuffer('layer-active')).toBe(true);
    expect(hasBuffer('layer-lazy')).toBe(false);

    // 2. Participate in composite rendering as transparent:
    //    compositeFrame must run cleanly and not eagerly allocate layer-lazy
    const compCanvas = compositeFrame(state.frames, 0, 32, 32, { freshCanvas: true });
    expect(compCanvas).not.toBeNull();
    expect(hasBuffer('layer-lazy')).toBe(false);

    // 3. Become the active layer:
    //    Switching active layer updates state without forcing buffer allocation
    state.setActiveLayer('layer-lazy');
    expect(useStudioStore.getState().activeLayerId).toBe('layer-lazy');
    expect(hasBuffer('layer-lazy')).toBe(false);

    // 4. Allocate on first edit:
    //    When drawing begins, getOrCreateBuffer allocates the backing canvas on demand
    const lazyEntry = getOrCreateBuffer('layer-lazy', 32, 32);
    expect(hasBuffer('layer-lazy')).toBe(true);
    expect(lazyEntry.canvas.width).toBe(32);
    expect(lazyEntry.canvas.height).toBe(32);

    // 5. Receive pixel edits:
    lazyEntry.ctx.fillStyle = '#ff0000';
    lazyEntry.ctx.fillRect(0, 0, 1, 1);
    const pixelData = lazyEntry.ctx.getImageData(0, 0, 1, 1).data;
    expect(pixelData[0]).toBe(255); // Red
    expect(pixelData[3]).toBe(255); // Alpha

    // 6. Save correctly:
    //    Autosave / serialization captures layer-lazy's raster data into layerBlobs
    const autosavePayload = await buildAutosavePayloadAsync();
    expect(autosavePayload.layerBlobs.some((b) => b.layerId === 'layer-lazy')).toBe(true);
    const saved = await autoSaveWorkspace(
      'proj-lazy-lifecycle',
      state.projectName,
      state.canvasWidth,
      state.canvasHeight,
      state.fps,
      autosavePayload.project,
      undefined,
      autosavePayload.layerBlobs
    );
    expect(saved).toBe(true);

    // 7. Hydrate again with the edited raster preserved:
    clearAllBuffers();
    expect(hasBuffer('layer-lazy')).toBe(false);
    const storedBlobs = autosavePayload.layerBlobs.map((b) => ({
      projectId: 'proj-lazy-lifecycle',
      layerId: b.layerId,
      frameIndex: b.frameIndex,
      blob: b.blob,
      updatedAt: Date.now(),
    }));
    await hydrateProject(autosavePayload.project, 'proj-lazy-lifecycle', storedBlobs);
    expect(hasBuffer('layer-lazy')).toBe(true);
    const rehydratedEntry = getOrCreateBuffer('layer-lazy', 32, 32);
    expect(rehydratedEntry.canvas).toBeDefined();
  });
});

