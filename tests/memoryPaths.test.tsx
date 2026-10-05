// @vitest-environment happy-dom
import 'fake-indexeddb/auto';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { BottomTimeline } from '@/components/layout/BottomTimeline';
import { Blob as NodeBlob } from 'node:buffer';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { mapBounded, SerializationSupersededError } from '@/lib/safety/boundedWork';
import { getMemoryBudgetUsage, reserveMemory, COMBINED_MEMORY_LIMIT_BYTES } from '@/lib/safety/memoryBudget';
import { buildAutosavePayloadAsync, buildProjectFileAsync } from '@/lib/project/serialize';
import { useStudioStore } from '@/stores/studioStore';
import { clearAllBuffers, getOrCreateBuffer, touchBuffer } from '@/lib/engine/bufferRegistry';
import { frameVisualKey, previewSize, retainFramePreview } from '@/lib/render/framePreview';
import { clearPersistedRevisions } from '@/lib/project/persistenceRevisions';
import { prepareExportFrames, prepareExportFramesAsync } from '@/lib/export/prepareFrames';
import * as compositor from '@/lib/render/compositor';
import { db, autoSaveWorkspaceDetailed, createBlankProjectFile } from '@/lib/storage/db';
import { makeCanvas } from './helpers/mockCanvas';
import { generateLoopAnimationCanvases } from '@/lib/export/shaderExporter';
const BrowserBlob = Blob;

beforeEach(() => {
  vi.stubGlobal('Blob', NodeBlob);
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => makeCanvas(32, 32).getContext('2d'));
  clearAllBuffers(); clearPersistedRevisions(); useStudioStore.getState().resetToNewProject();
});
afterEach(() => { clearAllBuffers(); clearPersistedRevisions(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('bounded memory paths', () => {
  it('timeline server markup agrees with first client markup regardless of observer availability', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    const server = renderToString(<BottomTimeline />);
    vi.stubGlobal('IntersectionObserver', class {});
    const client = renderToString(<BottomTimeline />);
    expect(server).toBe(client);
    expect(server).not.toContain('data-testid="frame-thumbnail-0"');
  });
  it('cancelled portable preparation drains its native snapshots without starting queued layers or retaining leases', async () => {
    const state = useStudioStore.getState(), controller = new AbortController();
    const layers = [0, 1, 2, 3].map(i => ({ ...state.frames[0].layers[0], id: `cancel-${i}` }));
    useStudioStore.setState({ frames: [{ ...state.frames[0], layers }] });
    const callbacks: BlobCallback[] = []; const before = getMemoryBudgetUsage().reservedBytes;
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(callback => { callbacks.push(callback); });
    const pending = buildProjectFileAsync(controller.signal).catch(error => error); expect(callbacks).toHaveLength(2);
    controller.abort(); callbacks[0](new BrowserBlob(['first'])); callbacks[1](new BrowserBlob(['second']));
    expect((await pending).name).toBe('AbortError'); expect(callbacks).toHaveLength(2);
    expect(getMemoryBudgetUsage().reservedBytes).toBe(before);
  });
  it('a pre-aborted backup never starts a native snapshot', async () => {
    const controller = new AbortController(); controller.abort(); const encode = vi.spyOn(HTMLCanvasElement.prototype, 'toBlob');
    await expect(buildProjectFileAsync(controller.signal)).rejects.toThrow(/abort/i); expect(encode).not.toHaveBeenCalled();
  });
  it('palette loop generation fails rather than dropping a frame and releases partially prepared surfaces', () => {
    const source = makeCanvas(4, 4), first = document.createElement('canvas'), second = document.createElement('canvas');
    Object.defineProperty(first, 'getContext', { value: () => makeCanvas(4, 4).getContext('2d'), configurable: true });
    vi.spyOn(document, 'createElement').mockReturnValueOnce(first).mockReturnValueOnce(second);
    Object.defineProperty(second, 'getContext', { value: () => null, configurable: true });
    expect(() => generateLoopAnimationCanvases(source, ['#000000'], [], 1, 2)).toThrow('Palette cycle frame 2 could not be rendered.');
    expect(first.width).toBe(0); expect(second.width).toBe(0);
  });
  it('drains running jobs and never starts queued jobs after a failure', async () => {
    let finish!: () => void; const started: number[] = [];
    const result = mapBounded([0, 1, 2, 3], async index => {
      started.push(index); if (index === 0) throw new Error('failed');
      await new Promise<void>(resolve => { finish = resolve; }); return index;
    });
    let settled = false; const checked = result.catch(error => { settled = true; return error; });
    await Promise.resolve(); expect(settled).toBe(false); expect(started).toEqual([0, 1]);
    finish(); expect((await checked).message).toBe('failed'); expect(started).toEqual([0, 1]);
  });
  it.each(['autosave', 'portable'])('bounds %s encoding to two and preserves output order', async kind => {
    const state = useStudioStore.getState();
    const layers = [0, 1, 2, 3].map(i => ({ ...state.frames[0].layers[0], id: `layer-${i}` }));
    useStudioStore.setState({ frames: [{ ...state.frames[0], layers }] });
    const callbacks: BlobCallback[] = [];
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(callback => { callbacks.push(callback); });
    const baseline = getMemoryBudgetUsage().reservedBytes;
    const result = kind === 'autosave' ? buildAutosavePayloadAsync() : buildProjectFileAsync();
    expect(callbacks).toHaveLength(2);
    const EncodedBlob = kind === 'portable' ? BrowserBlob : Blob;
    callbacks[1](new EncodedBlob(['second'])); callbacks[0](new EncodedBlob(['first']));
    // FileReader is a separate asynchronous task for portable output.
    await vi.waitFor(() => expect(callbacks).toHaveLength(4));
    callbacks[2](new EncodedBlob(['third'])); callbacks[3](new EncodedBlob(['fourth']));
    const payload = await result;
    const project = 'project' in payload ? payload.project : payload;
    expect(project.frames[0].layers.map(layer => layer.id)).toEqual(layers.map(layer => layer.id));
    expect(getMemoryBudgetUsage().reservedBytes).toBe(baseline);
  });
  it('refuses a changed queued raster and drains active encoding before releasing reservations', async () => {
    const state = useStudioStore.getState();
    const layers = [0, 1, 2].map(i => ({ ...state.frames[0].layers[0], id: `queued-${i}` }));
    useStudioStore.setState({ frames: [{ ...state.frames[0], layers }] });
    const callbacks: BlobCallback[] = []; const baseline = getMemoryBudgetUsage().reservedBytes;
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(callback => { callbacks.push(callback); });
    const result = buildAutosavePayloadAsync().catch(error => error);
    touchBuffer('queued-2'); callbacks[0](new Blob(['old']));
    await Promise.resolve(); await Promise.resolve();
    expect(callbacks).toHaveLength(2); expect(getMemoryBudgetUsage().reservedBytes).toBeGreaterThan(baseline);
    callbacks[1](new Blob(['old'])); expect(await result).toBeInstanceOf(SerializationSupersededError);
    expect(getMemoryBudgetUsage().reservedBytes).toBe(baseline);
  });
  it('checks memory before starting a native PNG snapshot', async () => {
    const state = useStudioStore.getState(); getOrCreateBuffer(state.activeLayerId, state.canvasWidth, state.canvasHeight);
    const encode = vi.spyOn(HTMLCanvasElement.prototype, 'toBlob');
    const release = reserveMemory(COMBINED_MEMORY_LIMIT_BYTES - getMemoryBudgetUsage().totalBytes, 'test saturation');
    try { await expect(buildAutosavePayloadAsync()).rejects.toThrow(/memory budget/); expect(encode).not.toHaveBeenCalled(); }
    finally { release(); }
  });
  it('preview identity ignores timing and other frames but follows raster edits and replacements', () => {
    const state = useStudioStore.getState(), frame = state.frames[0];
    getOrCreateBuffer(state.activeLayerId, 32, 32); const key = frameVisualKey(frame);
    expect(frameVisualKey({ ...frame, durationMs: 900 })).toBe(key);
    getOrCreateBuffer('unrelated', 32, 32); touchBuffer('unrelated'); expect(frameVisualKey(frame)).toBe(key);
    touchBuffer(state.activeLayerId); expect(frameVisualKey(frame)).not.toBe(key);
    expect(previewSize(2048, 1024, 24)).toEqual({ width: 24, height: 12 });
  });
  it('counts and releases retained preview backing storage', () => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 24;
    const before = getMemoryBudgetUsage().totalBytes; const release = retainFramePreview(canvas);
    expect(getMemoryBudgetUsage().totalBytes).toBe(before + 2304);
    release(); expect(canvas.width).toBe(0); expect(getMemoryBudgetUsage().totalBytes).toBe(before);
  });
  it('rejects oversized animation preparation before allocating any composites', () => {
    const draw = vi.spyOn(compositor, 'compositeFrame');
    expect(() => prepareExportFrames(useStudioStore.getState().frames, 16384, 16384)).toThrow(/memory budget/);
    expect(draw).not.toHaveBeenCalled();
  });
  it('cancels during preparation, releases composites and never renders the next frame', async () => {
    vi.useFakeTimers(); const state = useStudioStore.getState();
    const canvas = makeCanvas(32, 32); const draw = vi.spyOn(compositor, 'compositeFrame').mockReturnValue(canvas);
    const controller = new AbortController(); const before = getMemoryBudgetUsage().reservedBytes;
    const pending = prepareExportFramesAsync([state.frames[0], state.frames[0]], 32, 32, controller.signal).catch(error => error);
    await vi.advanceTimersByTimeAsync(0); expect(draw).toHaveBeenCalledOnce();
    controller.abort(); await vi.runAllTimersAsync(); expect((await pending).name).toBe('AbortError');
    expect(draw).toHaveBeenCalledOnce(); expect(canvas.width).toBe(0); expect(getMemoryBudgetUsage().reservedBytes).toBe(before);
  });
  it('incremental save reads index keys, preserves clean bytes and deletes duplicate and orphan keys atomically', async () => {
    await db.open(); await db.layerBlobs.clear(); await db.projects.clear();
    const project = createBlankProjectFile('Index-only'); const layer = project.frames[0].layers[0];
    const first = await autoSaveWorkspaceDetailed('index-only', project, undefined, [{ layerId: layer.id, frameIndex: 0, blob: new Blob(['original']) }]);
    expect(first.ok).toBe(true);
    await db.layerBlobs.add({ projectId: 'index-only', layerId: layer.id, frameIndex: 0, blob: new Blob(['duplicate']), updatedAt: 1 });
    await db.layerBlobs.add({ projectId: 'index-only', layerId: 'orphan', frameIndex: 0, blob: new Blob(['orphan']), updatedAt: 1 });
    const read = vi.fn(); db.layerBlobs.hook('reading', read);
    try {
      const saved = await autoSaveWorkspaceDetailed('index-only', project, undefined, [], undefined, first.ok ? first.storageVersion : undefined);
      expect(saved.ok).toBe(true); expect(read).not.toHaveBeenCalled();
    } finally { db.layerBlobs.hook('reading').unsubscribe(read); }
    const rows = await db.layerBlobs.where('projectId').equals('index-only').toArray(); expect(rows).toHaveLength(1);
    expect(await rows[0].blob.text()).toBe('original');
  });
});
