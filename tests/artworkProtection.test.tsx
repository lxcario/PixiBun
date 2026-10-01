// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makeCanvas } from './helpers/mockCanvas';
import { useStudioStore } from '@/stores/studioStore';
import { clearAllBuffers, deleteBuffers, getBufferRevision, getOrCreateBuffer, touchBuffer } from '@/lib/engine/bufferRegistry';
import { buildAutosavePayloadAsync } from '@/lib/project/serialize';
import { clearPersistedRevisions, commitPersistedRevisions, getPersistedRevision } from '@/lib/project/persistenceRevisions';
import { createHistoryEngine, setGlobalHistoryEngine } from '@/lib/engine/historyEngine';
import { useViewportDrawing } from '@/hooks/viewport/useViewportDrawing';
import { useArtisanEvents } from '@/hooks/viewport/events/useArtisanEvents';
import * as workers from '@/lib/engine/workerDispatcher';
import { studioEvents } from '@/lib/events/studioEvents';
import { CoDrawBridge } from '@/lib/sync/coDrawBridge';
import type { StructurePayload } from '@/lib/sync/p2pSync';

beforeEach(() => {
  const contexts = new WeakMap<HTMLCanvasElement, CanvasRenderingContext2D>();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
    let ctx = contexts.get(this);
    if (!ctx) {
      ctx = makeCanvas(this.width || 32, this.height || 32).getContext('2d')!;
      contexts.set(this, ctx);
    }
    return ctx;
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(callback => callback(new Blob(['png'])));
  clearAllBuffers();
  clearPersistedRevisions();
  setGlobalHistoryEngine(null);
  useStudioStore.getState().resetToNewProject('protected-project');
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  clearAllBuffers();
  clearPersistedRevisions();
  setGlobalHistoryEngine(null);
});

const layerCanvas = (id: string) => getOrCreateBuffer(id, 32, 32).canvas;
const pixels = (id: string) => Array.from(getOrCreateBuffer(id, 32, 32).ctx.getImageData(0, 0, 32, 32).data);

function mountDrawing() {
  return renderHook(() => useViewportDrawing({ canvasWidth: 32, canvasHeight: 32,
    getOrCreateLayerCanvas: layerCanvas, renderComposite: vi.fn() }));
}

function mountMorph() {
  return renderHook(() => useArtisanEvents({
    canvasWidth: 32, canvasHeight: 32, activeLayerId: useStudioStore.getState().activeLayerId,
    getOrCreateLayerCanvas: layerCanvas, renderComposite: vi.fn(), captureSnapshot: vi.fn(),
    commitSnapshot: vi.fn(), bumpBufferVersion: vi.fn(), compositeSourceSnapshot: () => null,
    updateTaggedLayer: vi.fn(),
  }));
}

describe('artwork protection', () => {
  it('keeps a stroke made during PNG encoding dirty until another encoding completes', async () => {
    const id = useStudioStore.getState().activeLayerId;
    getOrCreateBuffer(id, 32, 32);
    touchBuffer(id);
    const encodedRevision = getBufferRevision(id);
    let release!: () => void;
    vi.mocked(HTMLCanvasElement.prototype.toBlob).mockImplementationOnce(callback => {
      release = () => callback(new Blob(['old snapshot']));
    });
    const pending = buildAutosavePayloadAsync();
    touchBuffer(id);
    release();
    const first = await pending;
    expect(first.capturedRevisions.get(id)?.revision).toBe(encodedRevision);
    commitPersistedRevisions('protected-project', first.capturedRevisions);
    const retry = await buildAutosavePayloadAsync();
    expect(retry.dirtyLayerCount).toBe(1);
    expect(retry.layerBlobs).toHaveLength(1);
    expect(retry.capturedRevisions.get(id)?.revision).toBe(encodedRevision + 1);
  });

  it('re-encodes a replacement buffer even when its revision restarts below the saved revision', async () => {
    const id = useStudioStore.getState().activeLayerId;
    const original = getOrCreateBuffer(id, 32, 32);
    touchBuffer(id);
    const old = await buildAutosavePayloadAsync();
    deleteBuffers([id]);
    const replacement = getOrCreateBuffer(id, 32, 32);
    expect(replacement.generation).not.toBe(original.generation);
    commitPersistedRevisions('protected-project', old.capturedRevisions);
    const retry = await buildAutosavePayloadAsync();
    expect(retry.dirtyLayerCount).toBe(1);
    commitPersistedRevisions('protected-project', retry.capturedRevisions);
    commitPersistedRevisions('protected-project', old.capturedRevisions);
    expect(getPersistedRevision('protected-project', id)?.generation).toBe(replacement.generation);
    expect((await buildAutosavePayloadAsync()).dirtyLayerCount).toBe(0);
  });

  it('restores removed clips and their selection through actual undo and redo', () => {
    useStudioStore.getState().addFrame();
    useStudioStore.getState().addClip('second only', 1, 1, '#ffffff');
    const beforeClips = structuredClone(useStudioStore.getState().clips);
    const beforeSelection = useStudioStore.getState().activeClipId;
    const drawing = mountDrawing();
    act(() => useStudioStore.getState().deleteFrame(1));
    const deletedClips = structuredClone(useStudioStore.getState().clips);
    expect(deletedClips).not.toEqual(beforeClips);
    act(() => drawing.result.current.performUndo());
    expect(useStudioStore.getState().frames).toHaveLength(2);
    expect(useStudioStore.getState().clips).toEqual(beforeClips);
    expect(useStudioStore.getState().activeClipId).toBe(beforeSelection);
    act(() => drawing.result.current.performRedo());
    expect(useStudioStore.getState().frames).toHaveLength(1);
    expect(useStudioStore.getState().clips).toEqual(deletedClips);
    expect(useStudioStore.getState().activeClipId).toBeNull();
  });

  it('undoes clip edits without unexpectedly reverting a preceding layer edit', () => {
    const drawing = mountDrawing();
    const id = useStudioStore.getState().activeLayerId;
    act(() => useStudioStore.getState().renameLayer(id, 'renamed'));
    const originalClips = structuredClone(useStudioStore.getState().clips);
    act(() => useStudioStore.getState().addClip('new clip', 0, 0));
    act(() => drawing.result.current.performUndo());
    expect(useStudioStore.getState().clips).toEqual(originalClips);
    expect(useStudioStore.getState().frames[0].layers[0].name).toBe('renamed');
  });

  it('selects a layer belonging to the clip frame and rejects foreign active layer IDs', () => {
    useStudioStore.getState().addFrame();
    const secondId = useStudioStore.getState().activeLayerId;
    useStudioStore.getState().addClip('first', 0, 0);
    const clip = useStudioStore.getState().clips.find(c => c.name === 'first')!;
    useStudioStore.getState().setActiveClipId(clip.id);
    const state = useStudioStore.getState();
    expect(state.activeFrameIndex).toBe(0);
    expect(state.activeLayerId).toBe(state.frames[0].layers[0].id);
    state.setActiveLayer(secondId);
    expect(useStudioStore.getState().activeLayerId).toBe(state.activeLayerId);
    useStudioStore.getState().reorderFrames(1, 0);
    expect(useStudioStore.getState().activeLayerId).toBe(secondId);
  });

  it('refuses raster drawing when the active layer does not belong to the visible frame', () => {
    useStudioStore.getState().addFrame();
    const secondId = useStudioStore.getState().activeLayerId;
    useStudioStore.getState().setActiveFrame(0);
    useStudioStore.setState({ activeLayerId: secondId });
    const before = pixels(secondId);
    const drawing = mountDrawing();
    act(() => drawing.result.current.drawPointsOnActiveLayer([{ x: 1, y: 1 }], '#ff0000', false));
    expect(pixels(secondId)).toEqual(before);
  });

  it.each(['host', null] as const)('rejects structural replacement while role is %s', role => {
    const bridge = new CoDrawBridge();
    const receiver = bridge as unknown as { role: typeof role; adoptStructure(payload: StructurePayload): void };
    receiver.role = role;
    const state = useStudioStore.getState();
    const entry = getOrCreateBuffer(state.activeLayerId, 32, 32);
    entry.ctx.fillRect(0, 0, 1, 1);
    const before = pixels(state.activeLayerId);
    const history = createHistoryEngine();
    setGlobalHistoryEngine(history);
    receiver.adoptStructure({ width: 16, height: 16,
      frames: [{ ...state.frames[0], id: 'remote', layers: [{ ...state.frames[0].layers[0], id: 'remote-layer' }] }] });
    expect(useStudioStore.getState().frames).toBe(state.frames);
    expect(useStudioStore.getState().canvasWidth).toBe(32);
    expect(pixels(state.activeLayerId)).toEqual(before);
  });

  it('leaves existing artwork and history untouched when frame capacity refuses in-between insertion', async () => {
    useStudioStore.getState().addLayer('upper');
    const state = useStudioStore.getState();
    const frame = structuredClone(state.frames[0]);
    getOrCreateBuffer(state.activeLayerId, 32, 32).ctx.fillRect(0, 0, 1, 1);
    useStudioStore.setState({ frames: [frame, ...Array.from({ length: 499 }, (_, i) => ({
      ...frame, id: `frame-${i}`, layers: [{ ...frame.layers[0], id: `layer-${i}` }],
    }))] });
    const worker = vi.spyOn(workers, 'runMorphInWorker');
    const history = createHistoryEngine();
    setGlobalHistoryEngine(history);
    const before = frame.layers.map(layer => pixels(layer.id));
    const revision = useStudioStore.getState().editRevision;
    mountMorph();
    await act(async () => { studioEvents.emit('pixibun:in-between-frame'); });
    expect(worker).not.toHaveBeenCalled();
    expect(frame.layers.map(layer => pixels(layer.id))).toEqual(before);
    expect(useStudioStore.getState().frames).toHaveLength(500);
    expect(useStudioStore.getState().editRevision).toBe(revision);
    expect(history.depth).toBe(0);
  });

  it('does not change source pixels when undo memory refuses a generated insertion', async () => {
    const id = useStudioStore.getState().activeLayerId;
    getOrCreateBuffer(id, 32, 32).ctx.fillRect(0, 0, 1, 1);
    const before = pixels(id);
    vi.spyOn(workers, 'runMorphInWorker').mockResolvedValue([{ width: 32, height: 32, data: new Uint8ClampedArray(4096) }]);
    const history = createHistoryEngine({ maxBytes: 1024 });
    setGlobalHistoryEngine(history);
    mountMorph();
    await act(async () => { studioEvents.emit('pixibun:in-between-frame'); });
    expect(pixels(id)).toEqual(before);
    expect(useStudioStore.getState().frames).toHaveLength(1);
    expect(history.depth).toBe(0);
  });

  it('reports a morph failure without inserting a frame or changing its source', async () => {
    const before = useStudioStore.getState();
    const worker = vi.spyOn(workers, 'runMorphInWorker').mockRejectedValue(new Error('worker failure'));
    const emitted = vi.spyOn(studioEvents, 'emit');
    mountMorph();
    await act(async () => { studioEvents.emit('pixibun:in-between-frame'); });
    expect(worker).toHaveBeenCalled();
    expect(useStudioStore.getState().frames).toBe(before.frames);
    expect(emitted).toHaveBeenCalledWith('pixibun:toast', { message: 'worker failure', type: 'error' });
  });

  it('publishes generated pixels atomically and keeps their baked opacity through undo and redo', async () => {
    const baseId = useStudioStore.getState().activeLayerId;
    useStudioStore.getState().setLayerOpacity(baseId, 0.3);
    useStudioStore.getState().toggleLayerVisibility(baseId);
    useStudioStore.getState().addLayer('upper');
    const upperId = useStudioStore.getState().activeLayerId;
    getOrCreateBuffer(upperId, 32, 32).ctx.fillStyle = '#ff0000';
    getOrCreateBuffer(upperId, 32, 32).ctx.fillRect(0, 0, 1, 1);
    const before = pixels(upperId);
    const output = new Uint8ClampedArray(4096);
    output.set([0, 0, 255, 255]);
    vi.spyOn(workers, 'runMorphInWorker').mockResolvedValue([{ width: 32, height: 32, data: output }]);
    const drawing = mountDrawing();
    mountMorph();
    const published: number[][] = [];
    const unsubscribe = useStudioStore.subscribe(state => {
      if (state.frames.length === 2) published.push(pixels(state.frames[1].layers[1].id));
    });
    await act(async () => { studioEvents.emit('pixibun:in-between-frame'); });
    unsubscribe();
    expect(published.length).toBeGreaterThan(0);
    expect(published.every(image => image[2] === 255 && image[3] === 255)).toBe(true);
    const generated = useStudioStore.getState().frames[1].layers[1];
    expect(generated).toMatchObject({ visible: true, opacity: 1, blendMode: 'source-over' });
    expect(pixels(upperId)).toEqual(before);
    act(() => drawing.result.current.performUndo());
    expect(useStudioStore.getState().frames).toHaveLength(1);
    expect(pixels(upperId)).toEqual(before);
    act(() => drawing.result.current.performRedo());
    expect(pixels(generated.id)).toEqual(Array.from(output));
  });

  it('discards a generated result when the artist changes the animation while it runs', async () => {
    let finish!: (frames: { width: number; height: number; data: Uint8ClampedArray }[]) => void;
    vi.spyOn(workers, 'runMorphInWorker').mockReturnValue(new Promise(resolve => { finish = resolve; }));
    mountMorph();
    await act(async () => { studioEvents.emit('pixibun:in-between-frame'); });
    act(() => useStudioStore.getState().addFrame());
    const changedFrames = useStudioStore.getState().frames;
    await act(async () => { finish([{ width: 32, height: 32, data: new Uint8ClampedArray(4096) }]); });
    expect(useStudioStore.getState().frames).toBe(changedFrames);
  });

  it('refuses malformed generated pixels before recording or inserting a frame', async () => {
    vi.spyOn(workers, 'runMorphInWorker').mockResolvedValue([{ width: 32, height: 32, data: new Uint8ClampedArray(4) }]);
    const before = useStudioStore.getState().frames;
    const history = createHistoryEngine();
    setGlobalHistoryEngine(history);
    mountMorph();
    await act(async () => { studioEvents.emit('pixibun:in-between-frame'); });
    expect(useStudioStore.getState().frames).toBe(before);
    expect(history.depth).toBe(0);
  });
});
