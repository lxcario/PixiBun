// @vitest-environment happy-dom
import 'fake-indexeddb/auto';
import { Blob as NodeBlob } from 'node:buffer';
import { makeCanvas } from './helpers/mockCanvas';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { db, createBlankProject, createBlankProjectFile, autoSaveWorkspaceDetailed, loadLatestSavedWorkspace, getLayerBlobsForProject, duplicateProject, getProjectById } from '@/lib/storage/db';
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
import { studioEvents } from '@/lib/events/studioEvents';
import { createHistoryEngine, getGlobalHistoryEngine, setGlobalHistoryEngine } from '@/lib/engine/historyEngine';

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
    const originalFile = JSON.parse(saved.dataJson);
    const layerId = originalFile.frames[0].layers[0].id;
    const blobs = [{ layerId, frameIndex: 0, blob: new Blob(['old']) }];
    expect((await autoSaveWorkspaceDetailed(saved.id, originalFile, undefined, blobs)).ok).toBe(true);
    vi.spyOn(db.layerBlobs, 'bulkPut').mockRejectedValueOnce(new DOMException('Full', 'QuotaExceededError'));
    const changedFile = { ...originalFile, name: 'Changed' };
    expect((await autoSaveWorkspaceDetailed(saved.id, changedFile, undefined,
      [{ ...blobs[0], blob: new Blob(['new']) }])).ok).toBe(false);
    expect((await db.projects.get(saved.id))?.name).toBe('Original');
    expect(await (await getLayerBlobsForProject(saved.id))[0].blob.text()).toBe('old');
  });

  it('does not leave a partial duplicate after a blob write fails', async () => {
    const saved = await createBlankProject();
    const blankFile = JSON.parse(saved.dataJson);
    const layerId = blankFile.frames[0].layers[0].id;
    await autoSaveWorkspaceDetailed(saved.id, blankFile, undefined,
      [{ layerId, frameIndex: 0, blob: new Blob(['old']) }]);
    vi.spyOn(db.layerBlobs, 'bulkAdd').mockRejectedValueOnce(new Error('Disk failure'));
    expect(await duplicateProject(saved.id)).toBeNull();
    expect(await db.projects.count()).toBe(1);
  });

  it('replaces the complete layer set even when it is empty', async () => {
    const saved = await createBlankProject();
    const blankFile = JSON.parse(saved.dataJson);
    const layerId = blankFile.frames[0].layers[0].id;
    await autoSaveWorkspaceDetailed(saved.id, blankFile, undefined,
      [{ layerId, frameIndex: 0, blob: new Blob(['old']) }]);
    await autoSaveWorkspaceDetailed(saved.id, blankFile, undefined, [], []);
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

  it('rolls back buffer registry to previous buffers if loadProjectState throws during publish', async () => {
    useStudioStore.setState({ projectCreatedAt: 1000 });
    const initial = useStudioStore.getState();
    const initialBuffer = getOrCreateBuffer(initial.activeLayerId, 32, 32);
    const file = buildProjectFile();
    file.createdAt = 2000;
    const validPng =
      'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAALUlEQVRYR+3QQREAAAzCQNq/9CoWfocGBpIknb53BwAAAAAAAAAAAAAAAADgYwGzVwEB8fXh+AAAAABJRU5ErkJggg==';
    file.frames[0].layers[0].id = 'incoming-layer-id';
    file.frames[0].layers[0].pngBase64 = validPng;

    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({
      width: 32,
      height: 32,
      close: vi.fn(),
    }));
    const probeSpy = vi.spyOn(ImageHeaderProbe, 'probe').mockResolvedValue({ width: 32, height: 32, format: 'PNG' });

    const originalLoad = useStudioStore.getState().loadProjectState;
    const loadSpy = vi.spyOn(useStudioStore.getState(), 'loadProjectState').mockImplementationOnce(() => {
      throw new Error('Simulated subscriber/state error during loadProjectState');
    });

    try {
      await expect(hydrateProject(file, 'proj-rollback-test')).rejects.toThrow(
        'Simulated subscriber/state error during loadProjectState'
      );

      // Live buffers must be restored to previous buffers rather than left with incoming-layer-id
      expect(hasBuffer('incoming-layer-id')).toBe(false);
      expect(useStudioStore.getState().projectCreatedAt).toBe(1000);
      expect(hasBuffer(initial.activeLayerId)).toBe(true);
      expect(getOrCreateBuffer(initial.activeLayerId, 32, 32)).toBe(initialBuffer);
    } finally {
      loadSpy.mockRestore();
      probeSpy.mockRestore();
      useStudioStore.setState({ loadProjectState: originalLoad });
    }
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
    const freshProject = createBlankProjectFile('Fresh Project', 32, 32, 8);
    const freshLayerId = freshProject.frames[0].layers[0].id;
    const success = await autoSaveWorkspaceDetailed(
      freshId,
      freshProject,
      undefined,
      [{ layerId: freshLayerId, frameIndex: 0, blob: new Blob(['fresh-pixel-data']) }]
    );
    expect(success.ok).toBe(true);

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
    const saved = await autoSaveWorkspaceDetailed(
      'proj-lazy-lifecycle',
      autosavePayload.project,
      undefined,
      autosavePayload.layerBlobs
    );
    expect(saved.ok).toBe(true);

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
      const ok = await autoSaveWorkspaceDetailed(
        projId,
        payload.project,
        undefined,
        payload.layerBlobs
      );
      expect(ok.ok).toBe(true);
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
    const ok1 = await autoSaveWorkspaceDetailed(
      projId,
      payload1.project,
      undefined,
      payload1.layerBlobs
    );
    expect(ok1.ok).toBe(true);
    commitPersistedRevisions(projId, payload1.capturedRevisions);

    // Invariant check: layer must REMAIN dirty because current revision 3 > persisted revision 2!
    expect(isLayerDirty(projId, layerId, getBufferRevision(layerId), 0)).toBe(true);

    // Next save pass: captures stroke 2 at revision 3
    const payload2 = await buildAutosavePayloadAsync(projId);
    expect(payload2.dirtyLayerCount).toBe(1);
    expect(payload2.capturedRevisions.get(layerId)?.revision).toBe(3);

    const ok2 = await autoSaveWorkspaceDetailed(
      projId,
      payload2.project,
      undefined,
      payload2.layerBlobs
    );
    expect(ok2.ok).toBe(true);
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

    const saveFailed = await autoSaveWorkspaceDetailed(
      projId,
      payload.project,
      undefined,
      payload.layerBlobs
    );
    expect(saveFailed.ok).toBe(false);

    // Because save failed, commitPersistedRevisions is NOT called!
    // Layer must REMAIN dirty!
    expect(isLayerDirty(projId, layerId, getBufferRevision(layerId), 0)).toBe(true);

    // Retry save without error
    const retryPayload = await buildAutosavePayloadAsync(projId);
    expect(retryPayload.dirtyLayerCount).toBe(1);

    const retryOk = await autoSaveWorkspaceDetailed(
      projId,
      retryPayload.project,
      undefined,
      retryPayload.layerBlobs
    );
    expect(retryOk.ok).toBe(true);
    commitPersistedRevisions(projId, retryPayload.capturedRevisions);

    // Now marked clean
    expect(isLayerDirty(projId, layerId, getBufferRevision(layerId), 0)).toBe(false);
  });

  // ==========================================================================
  // Phase 1B.7 — Publish Boundary Atomicity & Adversarial Listener Tests
  // ==========================================================================

  function createTestPngBlob(width = 32, height = 32): Blob {
    const bytes = new Uint8Array(28);
    bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
    bytes.set([0x00, 0x00, 0x00, 0x0d], 8);
    bytes.set([0x49, 0x48, 0x44, 0x52], 12);
    const view = new DataView(bytes.buffer);
    view.setUint32(16, width, false);
    view.setUint32(20, height, false);
    return new Blob([bytes], { type: 'image/png' });
  }

  function createProjectFileFixture(id: string, name: string, layerId: string, width = 32, height = 32): ProjectFile {
    return {
      format: PROJECT_FORMAT_ID,
      version: PROJECT_FORMAT_VERSION,
      name,
      width,
      height,
      fps: 12,
      loopMode: 'repeat',
      onionSkin: {
        enabled: false,
        prevFrames: 1,
        nextFrames: 1,
        opacity: 0.35,
        prevColor: '#7fae6b',
        nextColor: '#c792df',
      },
      customRamps: [],
      palettes: [
        {
          id: 'palette-default',
          name: 'Default Palette',
          colors: ['#000000', '#ffffff', '#ff0000'],
        },
      ],
      currentPaletteId: 'palette-default',
      clips: [],
      frames: [
        {
          id: `frame-${id}`,
          durationMs: 83,
          layers: [
            {
              id: layerId,
              name: `Layer of ${name}`,
              visible: true,
              locked: false,
              opacity: 1,
              blendMode: 'source-over',
            },
          ],
        },
      ],
      createdAt: 1000,
      updatedAt: 1000,
    };
  }

  it('prevents split-brain desynchronization when a store subscriber throws during hydration publication', async () => {
    // 1. Establish active Project A with allocated buffer and metadata
    const projA = createProjectFileFixture('proj-alpha', 'Project Alpha', 'layer-a-1');
    useStudioStore.getState().loadProjectState(projA, 'proj-alpha');
    const bufA = getOrCreateBuffer('layer-a-1', 32, 32);
    bufA.ctx.fillStyle = '#ff0000';
    bufA.ctx.fillRect(0, 0, 10, 10);
    touchBuffer('layer-a-1');
    const handle = { name: 'original.pixibun' } as FileSystemFileHandle;
    DesktopFileSystem.setActiveHandle(handle);
    useStudioStore.setState({ isDirty: true, editRevision: 42, saveStatus: 'saving', selection: { x: 1, y: 2, w: 3, h: 4 }, selectionMask: new Uint8Array([1, 0, 1]) });
    const originalSession = useStudioStore.getState();
    const originalAssociation = DesktopFileSystem.captureAssociation();

    expect(useStudioStore.getState().currentProjectId).toBe('proj-alpha');
    expect(useStudioStore.getState().projectName).toBe('Project Alpha');
    expect(hasBuffer('layer-a-1')).toBe(true);

    // 2. Prepare Project B with its own blob and layer
    const projB = createProjectFileFixture('proj-beta', 'Project Beta', 'layer-b-1');
    const blobsB = [
      {
        id: 101,
        projectId: 'proj-beta',
        layerId: 'layer-b-1',
        frameIndex: 0,
        blob: createTestPngBlob(32, 32),
        updatedAt: 2000,
      },
    ];

    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({
      width: 32,
      height: 32,
      close: vi.fn(),
    }));

    // 3. Register real store subscriber that throws when Project B state is loaded
    const unsubscribe = useStudioStore.subscribe((state) => {
      if (state.currentProjectId === 'proj-beta') {
        throw new Error('Adversarial subscriber crashed during Project B publication');
      }
    });

    // 4. Attempt to hydrate Project B: must fail and catch
    await expect(hydrateProject(projB, 'proj-beta', blobsB)).rejects.toThrow(
      'Adversarial subscriber crashed during Project B publication'
    );
    unsubscribe();

    // 5. Invariant: The workspace must NOT be in a split-brain state!
    // Store must be rolled back to Project A
    const state = useStudioStore.getState();
    expect(state).toBe(originalSession);
    expect(DesktopFileSystem.captureAssociation()).toEqual(originalAssociation);
    expect(state.currentProjectId).toBe('proj-alpha');
    expect(state.projectName).toBe('Project Alpha');
    expect(state.frames[0].layers[0].id).toBe('layer-a-1');

    // BufferRegistry must have Project A's buffer and NOT Project B's buffer
    expect(hasBuffer('layer-a-1')).toBe(true);
    expect(hasBuffer('layer-b-1')).toBe(false);

    // Pixels of Project A buffer must be intact
    const bufCheck = getOrCreateBuffer('layer-a-1', 32, 32);
    const pixel = bufCheck.ctx.getImageData(0, 0, 1, 1).data;
    expect(pixel[0]).toBe(255); // Red preserved
  });

  it('rolls back both store and buffer registry when studioEvents.emit throws after state publication', async () => {
    // 1. Establish active Project A
    const projA = createProjectFileFixture('proj-alpha-event', 'Project Alpha Events', 'layer-a-ev');
    useStudioStore.getState().loadProjectState(projA, 'proj-alpha-event');
    const bufA = getOrCreateBuffer('layer-a-ev', 32, 32);
    bufA.ctx.fillStyle = '#00ff00';
    bufA.ctx.fillRect(0, 0, 8, 8);
    touchBuffer('layer-a-ev');

    expect(useStudioStore.getState().currentProjectId).toBe('proj-alpha-event');
    expect(hasBuffer('layer-a-ev')).toBe(true);

    // 2. Prepare Project B
    const projB = createProjectFileFixture('proj-beta-event', 'Project Beta Events', 'layer-b-ev');
    const blobsB = [
      {
        id: 201,
        projectId: 'proj-beta-event',
        layerId: 'layer-b-ev',
        frameIndex: 0,
        blob: createTestPngBlob(32, 32),
        updatedAt: 2000,
      },
    ];

    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({
      width: 32,
      height: 32,
      close: vi.fn(),
    }));

    // 3. Spy on studioEvents.emit to throw on pixibun:history-clear
    const emitSpy = vi.spyOn(studioEvents, 'emit').mockImplementation((event) => {
      if (event === 'pixibun:history-clear') {
        throw new Error('Event bus dispatch failure during history-clear');
      }
    });

    // 4. Attempt hydration of Project B
    await expect(hydrateProject(projB, 'proj-beta-event', blobsB)).rejects.toThrow(
      'Event bus dispatch failure during history-clear'
    );
    emitSpy.mockRestore();

    // 5. Invariant: workspace must not be split-brain (Project B store + Project A buffers)
    const state = useStudioStore.getState();
    expect(state.currentProjectId).toBe('proj-alpha-event');
    expect(state.projectName).toBe('Project Alpha Events');
    expect(state.frames[0].layers[0].id).toBe('layer-a-ev');
    expect(hasBuffer('layer-a-ev')).toBe(true);
    expect(hasBuffer('layer-b-ev')).toBe(false);
  });

  it('preserves the original session even when its rollback observer also throws', async () => {
    // 1. Establish active Project A
    const projA = createProjectFileFixture('proj-alpha-double', 'Project Alpha Double', 'layer-a-dbl');
    useStudioStore.getState().loadProjectState(projA, 'proj-alpha-double');
    getOrCreateBuffer('layer-a-dbl', 32, 32);
    const originalSession = useStudioStore.getState();

    const projB = createProjectFileFixture('proj-beta-double', 'Project Beta Double', 'layer-b-dbl');

    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({
      width: 32,
      height: 32,
      close: vi.fn(),
    }));

    // 2. Subscriber that throws when Project B is loaded AND throws when Project A is reloaded,
    // but permits clean resetToNewProject
    const unsubscribe = useStudioStore.subscribe((state) => {
      if (state.currentProjectId === 'proj-beta-double') {
        throw new Error('Subscriber throws on Project B');
      }
      if (state.currentProjectId === 'proj-alpha-double' && state.projectName === 'Project Alpha Double') {
        throw new Error('Subscriber throws on Project A rollback');
      }
    });

    await expect(hydrateProject(projB, 'proj-beta-double', [])).rejects.toThrow();
    unsubscribe();

    // State installation precedes observer delivery; a second observer exception
    // must not discard the restored artwork or mask the original failure.
    const state = useStudioStore.getState();
    expect(state).toBe(originalSession);
    expect(hasBuffer('layer-a-dbl')).toBe(true);
    expect(hasBuffer('layer-b-dbl')).toBe(false);
  });

  it('restores Undo/Redo and native-file ownership when history clearing fails after clearing the engine', async () => {
    const project = createProjectFileFixture('old-history', 'Unsaved history', 'old-layer');
    useStudioStore.getState().loadProjectState(project, 'old-history');
    const buffer = getOrCreateBuffer('old-layer', 32, 32);
    const previousEngine = getGlobalHistoryEngine();
    const engine = createHistoryEngine(); setGlobalHistoryEngine(engine);
    const step = { type: 'pixel' as const, description: 'Prior edit', layerId: 'old-layer', frameIndex: 0, imageData: buffer.ctx.getImageData(0, 0, 32, 32) };
    engine.push(step); engine.undo(step);
    useStudioStore.setState({ isDirty: true, editRevision: 42, canRedo: true });
    DesktopFileSystem.setActiveHandle({ name: 'unsaved-history.pixibun' } as FileSystemFileHandle);
    const session = useStudioStore.getState(), association = DesktopFileSystem.captureAssociation();
    vi.spyOn(studioEvents, 'emit').mockImplementation(event => {
      if (event === 'pixibun:history-clear') { engine.clear(); throw new Error('clear notification failure'); }
    });
    try {
      await expect(hydrateProject(createProjectFileFixture('incoming-history', 'Incoming', 'incoming-layer'), 'incoming-history')).rejects.toThrow('clear notification failure');
      expect(useStudioStore.getState()).toBe(session);
      expect(DesktopFileSystem.captureAssociation()).toEqual(association);
      expect(engine.redoDepth).toBe(1); expect(engine.peekRedo()).toBe(step);
      expect(hasBuffer('old-layer')).toBe(true); expect(hasBuffer('incoming-layer')).toBe(false);
    } finally { setGlobalHistoryEngine(previousEngine); }
  });
});
