// @vitest-environment happy-dom
import 'fake-indexeddb/auto';
import { Blob as NodeBlob } from 'node:buffer';
import { makeCanvas } from './helpers/mockCanvas';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { db, createBlankProject, autoSaveWorkspace, loadLatestSavedWorkspace, getLayerBlobsForProject, duplicateProject } from '@/lib/storage/db';
import { validateProjectFile } from '@/lib/project/schema';
import { hydrateProject, buildProjectFile, buildAutosavePayloadAsync } from '@/lib/project/serialize';
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
});
