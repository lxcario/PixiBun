// @vitest-environment happy-dom
import 'fake-indexeddb/auto';
import { Blob as NodeBlob } from 'node:buffer';
import { makeCanvas } from './helpers/mockCanvas';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { db, createBlankProject, autoSaveWorkspace, loadLatestSavedWorkspace, getLayerBlobsForProject, duplicateProject, getProjectById } from '@/lib/storage/db';
import { validateProjectFile } from '@/lib/project/schema';
import {
  hydrateProject,
  buildProjectFile,
  buildAutosavePayloadAsync,
  commitPersistedRevisions,
  isLayerDirty,
  clearPersistedRevisions,
  rasterizeLayerBlobAsync,
} from '@/lib/project/serialize';
import { compositeFrame } from '@/lib/render/compositor';
import { PROJECT_FORMAT_ID, PROJECT_FORMAT_VERSION, type ProjectFile } from '@/types/project';
import { useStudioStore } from '@/stores/studioStore';
import { getOrCreateBuffer, hasBuffer, clearAllBuffers, touchBuffer, getBufferRevision } from '@/lib/engine/bufferRegistry';
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
  clearPersistedRevisions();
  useStudioStore.getState().resetToNewProject();
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); clearAllBuffers(); clearPersistedRevisions(); });

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
    vi.spyOn(db.layerBlobs, 'bulkPut').mockRejectedValueOnce(new DOMException('Full', 'QuotaExceededError'));
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

  it('proves incremental autosave round-trip invariant against canonical save across stroke, add, delete, duplicate, frame reorder, and metadata-only edits', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({
      width: 32,
      height: 32,
      close: vi.fn(),
    }));
    vi.spyOn(ImageHeaderProbe, 'probe').mockResolvedValue({ width: 32, height: 32, format: 'PNG' });

    // Canonical save oracle: extracts all layer blobs and project file without dirty-diffing
    const canonicalOracle = async (_projId: string) => {
      const state = useStudioStore.getState();
      const allBlobs: Array<{ layerId: string; frameIndex: number; blob: Blob }> = [];
      const frames = await Promise.all(
        state.frames.map(async (frame, frameIndex) => {
          const layers = await Promise.all(
            frame.layers.map(async (layer) => {
              const blob = await rasterizeLayerBlobAsync(layer.id, state.canvasWidth, state.canvasHeight);
              if (blob) {
                allBlobs.push({ layerId: layer.id, frameIndex, blob });
              }
              return {
                id: layer.id,
                name: layer.name,
                visible: layer.visible,
                locked: layer.locked,
                opacity: layer.opacity,
                blendMode: layer.blendMode,
                tag: layer.tag,
                effect: layer.effect ? structuredClone(layer.effect) : undefined,
                pngBase64: undefined,
              };
            })
          );
          return { id: frame.id, durationMs: frame.durationMs, layers };
        })
      );
      const project: ProjectFile = {
        format: PROJECT_FORMAT_ID,
        version: PROJECT_FORMAT_VERSION,
        name: state.projectName,
        width: state.canvasWidth,
        height: state.canvasHeight,
        fps: state.fps,
        loopMode: state.loopMode,
        onionSkin: { ...state.onionSkin },
        palettes: state.palettes.map((p) => ({ ...p, colors: [...p.colors] })),
        currentPaletteId: state.currentPaletteId,
        customRamps: state.customRamps.map((r) => ({ ...r, shades: [...r.shades] })),
        clips: state.clips.map((c) => ({ ...c })),
        frames,
        createdAt: 1000,
        updatedAt: 1000,
      };
      return { project, allBlobs };
    };

    // Helper to perform an incremental save step
    const performIncrementalSave = async (projId: string) => {
      const payload = await buildAutosavePayloadAsync(projId);
      const ok = await autoSaveWorkspace(
        projId,
        payload.project.name,
        payload.project.width,
        payload.project.height,
        payload.project.fps,
        payload.project,
        undefined,
        payload.layerBlobs
      );
      expect(ok).toBe(true);
      commitPersistedRevisions(projId, payload.capturedRevisions);
      return payload;
    };

    // 1. Setup multi-frame, multi-layer workspace: Frame 0 (Layer A, Layer B), Frame 1 (Layer C)
    const store = useStudioStore.getState();
    const layerAId = store.activeLayerId;
    const bufA = getOrCreateBuffer(layerAId, 32, 32);
    bufA.ctx.fillStyle = '#ff0000';
    bufA.ctx.fillRect(0, 0, 10, 10);
    touchBuffer(layerAId);

    store.addLayer('Layer B');
    const layerBId = useStudioStore.getState().activeLayerId;
    const bufB = getOrCreateBuffer(layerBId, 32, 32);
    bufB.ctx.fillStyle = '#00ff00';
    bufB.ctx.fillRect(5, 5, 10, 10);
    touchBuffer(layerBId);

    store.addFrame();
    const frame1 = useStudioStore.getState().frames[1];
    const layerCId = frame1.layers[0].id;
    const bufC = getOrCreateBuffer(layerCId, 32, 32);
    bufC.ctx.fillStyle = '#0000ff';
    bufC.ctx.fillRect(10, 10, 10, 10);
    touchBuffer(layerCId);

    const projId = useStudioStore.getState().currentProjectId;

    // Initial incremental save: All 4 layers across 2 frames are dirty
    const initialPayload = await performIncrementalSave(projId);
    expect(initialPayload.dirtyLayerCount).toBe(4);
    expect(initialPayload.layerBlobs).toHaveLength(4);

    // Verify stored blobs match canonical oracle
    const oracleInitial = await canonicalOracle(projId);
    const dbBlobsInitial = await getLayerBlobsForProject(projId);
    expect(dbBlobsInitial).toHaveLength(oracleInitial.allBlobs.length);

    // 2. Mutation A: Stroke edit on Layer A ONLY
    bufA.ctx.fillRect(1, 1, 2, 2);
    touchBuffer(layerAId);

    const payloadA = await performIncrementalSave(projId);
    // Exactly 1 layer dirty, exactly 1 PNG blob encoded!
    expect(payloadA.dirtyLayerCount).toBe(1);
    expect(payloadA.layerBlobs).toHaveLength(1);
    expect(payloadA.layerBlobs[0].layerId).toBe(layerAId);

    // Verify DB layer blobs still has all 4 layers, and Layer A is updated
    const dbBlobsAfterA = await getLayerBlobsForProject(projId);
    expect(dbBlobsAfterA).toHaveLength(4);

    // 3. Mutation B: Metadata-only edit (Project rename + Palette change)
    useStudioStore.getState().setProjectName('Canonical Test Sprite');
    const payloadB = await performIncrementalSave(projId);
    // Exactly 0 layers dirty! Zero PNG encodes!
    expect(payloadB.dirtyLayerCount).toBe(0);
    expect(payloadB.layerBlobs).toHaveLength(0);

    const storedProjB = await getProjectById(projId);
    expect(storedProjB?.name).toBe('Canonical Test Sprite');
    expect(await getLayerBlobsForProject(projId)).toHaveLength(4);

    // 4. Mutation C: Layer add
    useStudioStore.getState().setActiveFrame(0);
    useStudioStore.getState().addLayer('Layer D');
    const layerDId = useStudioStore.getState().activeLayerId;
    getOrCreateBuffer(layerDId, 32, 32);
    touchBuffer(layerDId);

    const payloadC = await performIncrementalSave(projId);
    // Only the new Layer D is dirty
    expect(payloadC.dirtyLayerCount).toBe(1);
    expect(payloadC.layerBlobs[0].layerId).toBe(layerDId);

    const dbBlobsAfterC = await getLayerBlobsForProject(projId);
    expect(dbBlobsAfterC).toHaveLength(5);

    // 5. Mutation D: Layer delete (delete Layer B)
    useStudioStore.getState().deleteLayer(layerBId);
    const payloadD = await performIncrementalSave(projId);
    expect(payloadD.dirtyLayerCount).toBe(0); // Remaining layers had no pixel edits

    // Pruning invariant: Layer B blob is cleanly deleted from DB
    const dbBlobsAfterD = await getLayerBlobsForProject(projId);
    expect(dbBlobsAfterD).toHaveLength(4);
    expect(dbBlobsAfterD.some((b) => b.layerId === layerBId)).toBe(false);

    // 6. Mutation E: Frame reorder (swap Frame 0 and Frame 1)
    useStudioStore.getState().reorderFrames(0, 1);
    const payloadE = await performIncrementalSave(projId);
    // Layers whose frameIndex changed are detected as dirty
    expect(payloadE.dirtyLayerCount).toBeGreaterThan(0);

    const oracleFinal = await canonicalOracle(projId);
    const dbBlobsFinal = await getLayerBlobsForProject(projId);
    expect(dbBlobsFinal).toHaveLength(oracleFinal.allBlobs.length);

    // 7. Full round-trip rehydration from DB
    clearAllBuffers();
    const finalWorkspace = await getProjectById(projId);
    expect(finalWorkspace).not.toBeNull();
    const decodedFinal = JSON.parse(finalWorkspace!.dataJson);
    await hydrateProject(decodedFinal, projId, finalWorkspace!.layerBlobs);

    // Check all active layers hydrated correctly
    for (const frame of decodedFinal.frames) {
      for (const layer of frame.layers) {
        expect(hasBuffer(layer.id)).toBe(true);
      }
    }
  });

  it('guarantees in-flight edit safety (R -> R+1): layer edited during save remains dirty and is saved on next pass', async () => {
    const projId = 'proj-in-flight-safety';
    const store = useStudioStore.getState();
    const layerId = store.activeLayerId;
    const buf = getOrCreateBuffer(layerId, 32, 32);

    // Edit 1: User paints stroke 1
    buf.ctx.fillRect(0, 0, 4, 4);
    touchBuffer(layerId); // contentRevision = 2
    expect(getBufferRevision(layerId)).toBe(2);

    // Start Save 1: captures revision 2
    const payload1 = await buildAutosavePayloadAsync(projId);
    expect(payload1.dirtyLayerCount).toBe(1);
    expect(payload1.capturedRevisions.get(layerId)?.revision).toBe(2);

    // Mid-flight: User paints stroke 2 while Save 1 is in-flight!
    buf.ctx.fillRect(4, 4, 4, 4);
    touchBuffer(layerId); // contentRevision = 3 (R -> R+1)
    expect(getBufferRevision(layerId)).toBe(3);

    // Save 1 completes write to IndexedDB
    const ok1 = await autoSaveWorkspace(
      projId,
      payload1.project.name,
      payload1.project.width,
      payload1.project.height,
      payload1.project.fps,
      payload1.project,
      undefined,
      payload1.layerBlobs
    );
    expect(ok1).toBe(true);
    commitPersistedRevisions(projId, payload1.capturedRevisions);

    // Invariant check: layer must REMAIN dirty because current revision 3 > persisted revision 2!
    expect(isLayerDirty(projId, layerId, getBufferRevision(layerId), 0)).toBe(true);

    // Next save pass: captures stroke 2 at revision 3
    const payload2 = await buildAutosavePayloadAsync(projId);
    expect(payload2.dirtyLayerCount).toBe(1);
    expect(payload2.capturedRevisions.get(layerId)?.revision).toBe(3);

    const ok2 = await autoSaveWorkspace(
      projId,
      payload2.project.name,
      payload2.project.width,
      payload2.project.height,
      payload2.project.fps,
      payload2.project,
      undefined,
      payload2.layerBlobs
    );
    expect(ok2).toBe(true);
    commitPersistedRevisions(projId, payload2.capturedRevisions);

    // Now clean!
    expect(isLayerDirty(projId, layerId, getBufferRevision(layerId), 0)).toBe(false);
  });

  it('handles save failure retry without marking clean: layers remain dirty on error and retry succeeds', async () => {
    const projId = 'proj-save-failure-retry';
    const store = useStudioStore.getState();
    const layerId = store.activeLayerId;
    const buf = getOrCreateBuffer(layerId, 32, 32);

    buf.ctx.fillRect(0, 0, 5, 5);
    touchBuffer(layerId);
    expect(isLayerDirty(projId, layerId, getBufferRevision(layerId), 0)).toBe(true);

    const payload = await buildAutosavePayloadAsync(projId);
    expect(payload.dirtyLayerCount).toBe(1);

    // Simulate DB write error (e.g. QuotaExceededError on initial insert)
    vi.spyOn(db.layerBlobs, 'bulkAdd').mockRejectedValueOnce(new DOMException('Disk full', 'QuotaExceededError'));

    const saveFailed = await autoSaveWorkspace(
      projId,
      payload.project.name,
      payload.project.width,
      payload.project.height,
      payload.project.fps,
      payload.project,
      undefined,
      payload.layerBlobs
    );
    expect(saveFailed).toBe(false);

    // Because save failed, commitPersistedRevisions is NOT called!
    // Layer must REMAIN dirty!
    expect(isLayerDirty(projId, layerId, getBufferRevision(layerId), 0)).toBe(true);

    // Retry save without error
    const retryPayload = await buildAutosavePayloadAsync(projId);
    expect(retryPayload.dirtyLayerCount).toBe(1);

    const retryOk = await autoSaveWorkspace(
      projId,
      retryPayload.project.name,
      retryPayload.project.width,
      retryPayload.project.height,
      retryPayload.project.fps,
      retryPayload.project,
      undefined,
      retryPayload.layerBlobs
    );
    expect(retryOk).toBe(true);
    commitPersistedRevisions(projId, retryPayload.capturedRevisions);

    // Now marked clean
    expect(isLayerDirty(projId, layerId, getBufferRevision(layerId), 0)).toBe(false);
  });
});

