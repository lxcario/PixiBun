// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { makeCanvas } from './helpers/mockCanvas';
import { useStudioStore } from '@/stores/studioStore';
import { clearAllBuffers, getOrCreateBuffer, snapshotBuffers } from '@/lib/engine/bufferRegistry';
import { createHistoryEngine, setGlobalHistoryEngine, getGlobalHistoryEngine } from '@/lib/engine/historyEngine';
import { restoreStructuralWorkspace, pushStructuralHistoryStep } from '@/lib/engine/structuralHistory';
import { commitWorkspace } from '@/lib/engine/workspaceTransaction';
import { applyResearchPreview, researchWorkspaceKey, type ResearchPreview } from '@/lib/research/workbench';
import { useViewportDrawing } from '@/hooks/viewport/useViewportDrawing';
import { getMemoryBudgetUsage } from '@/lib/safety/memoryBudget';

let subscriptions: (() => void)[];
beforeEach(() => {
  subscriptions = [];
  const contexts = new WeakMap<HTMLCanvasElement, CanvasRenderingContext2D>();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function(this: HTMLCanvasElement) {
    let ctx = contexts.get(this);
    if (!ctx) { ctx = makeCanvas(this.width || 32, this.height || 32).getContext('2d')!; contexts.set(this, ctx); }
    return ctx;
  });
  vi.spyOn(console, 'error').mockImplementation(() => {});
  clearAllBuffers(); setGlobalHistoryEngine(null);
  useStudioStore.getState().resetToNewProject('publication-regression');
  const state = useStudioStore.getState(), buffer = getOrCreateBuffer(state.activeLayerId, 32, 32);
  buffer.ctx.fillStyle = '#ff0000'; buffer.ctx.fillRect(0, 0, 2, 2);
});
afterEach(() => {
  subscriptions.forEach(unsubscribe => unsubscribe()); cleanup();
  setGlobalHistoryEngine(null); clearAllBuffers(); vi.restoreAllMocks();
  expect(getMemoryBudgetUsage().reservedBytes).toBe(0);
});
function preview(): ResearchPreview {
  const state = useStudioStore.getState();
  const data = getOrCreateBuffer(state.activeLayerId, 32, 32).ctx.getImageData(0, 0, 32, 32).data;
  return { key: researchWorkspaceKey(), name: 'Publication regression', width: 32, height: 32, dispose: vi.fn(),
    frames: [{ index: 0, sourceId: state.activeLayerId, replacedId: state.activeLayerId, before: data,
      recipe: { version: 1, name: 'Publication regression', width: 32, height: 32,
        settings: { kind: 'pixelize', block: 4, candidate: 'average', colors: ['#000000', '#ffffff'], protected: [] },
        source: { frameId: state.frames[0].id, layerId: state.activeLayerId, sha256: '0'.repeat(64) } },
      result: { data: data.slice(), notes: [] } }] };
}
function failObserver() {
  subscriptions.push(useStudioStore.subscribe(() => { throw new Error('Injected observer failure'); }));
}
const hook = () => renderHook(() => useViewportDrawing({ canvasWidth: 32, canvasHeight: 32,
  getOrCreateLayerCanvas: id => getOrCreateBuffer(id, 32, 32).canvas, renderComposite: vi.fn() }));

it('publishes structural pixels and metadata together despite an observer fault and notifies later observers', () => {
  const before = useStudioStore.getState(), next = structuredClone(before.frames);
  next[0].layers[0].id = 'replacement-layer';
  const imageData = getOrCreateBuffer(before.activeLayerId, 32, 32).ctx.getImageData(0, 0, 32, 32);
  failObserver();
  let observed: { layerId: string; bufferIds: string[] } | undefined;
  subscriptions.push(useStudioStore.subscribe(state => { observed = { layerId: state.activeLayerId, bufferIds: [...snapshotBuffers().keys()] }; }));
  expect(() => restoreStructuralWorkspace({ canvasWidth: 32, canvasHeight: 32, frames: next, activeFrameIndex: 0,
    activeLayerId: 'replacement-layer', layerBuffers: [{ layerId: 'replacement-layer', imageData }] })).not.toThrow();
  expect(observed).toEqual({ layerId: 'replacement-layer', bufferIds: ['replacement-layer'] });
  expect(useStudioStore.getState().frames).toEqual(next);
  expect(getOrCreateBuffer('replacement-layer', 32, 32).ctx.getImageData(0, 0, 32, 32).data).toEqual(imageData.data);
  expect(console.error).toHaveBeenCalledWith(expect.stringContaining('observer failed'), expect.any(Error));
});
it('publishes generated output and Undo in one notification even when the first observer throws', () => {
  const before = useStudioStore.getState(), engine = createHistoryEngine(), output = preview();
  setGlobalHistoryEngine(engine); failObserver();
  const observed: unknown[] = [];
  subscriptions.push(useStudioStore.subscribe((state, previous) => {
    observed.push({ layers: state.frames[0].layers.length, undo: engine.depth, canUndo: state.canUndo,
      buffers: snapshotBuffers().size, previousLayers: previous.frames[0].layers.length });
  }));
  expect(() => applyResearchPreview(output)).not.toThrow();
  expect(observed).toEqual([{ layers: 2, undo: 1, canUndo: true, buffers: 2, previousLayers: 1 }]);
  expect(useStudioStore.getState().frames[0].layers[1].visible).toBe(false);
  expect(getOrCreateBuffer(before.activeLayerId, 32, 32).ctx.getImageData(0, 0, 32, 32).data).toEqual(output.frames[0].before);
  expect(output.dispose).toHaveBeenCalledOnce();
});
it('restores metadata, buffers, redo and byte accounting after a real updater failure following history publication', () => {
  const engine = createHistoryEngine(), buffers = snapshotBuffers();
  setGlobalHistoryEngine(engine);
  pushStructuralHistoryStep('Existing redo'); engine.undo(engine.peekUndo()!);
  useStudioStore.getState().setCanUndo(false); useStudioStore.getState().setCanRedo(true);
  const before = useStudioStore.getState();
  const bytes = engine.totalBytes, redo = engine.peekRedo();
  const observer = vi.fn(); subscriptions.push(useStudioStore.subscribe(observer));
  expect(() => commitWorkspace(() => {
    pushStructuralHistoryStep('Failed edit');
    useStudioStore.setState({ frames: structuredClone(before.frames), isDirty: true });
    useStudioStore.setState(() => { throw new Error('Preparation failed'); });
  })).toThrow('Preparation failed');
  expect(useStudioStore.getState()).toBe(before);
  expect(snapshotBuffers()).toEqual(buffers);
  expect(engine.depth).toBe(0); expect(engine.redoDepth).toBe(1);
  expect(engine.peekRedo()).toBe(redo); expect(engine.totalBytes).toBe(bytes);
  expect(observer).not.toHaveBeenCalled();
  // Failed batches do not contaminate the previous-state argument of later edits.
  commitWorkspace(() => useStudioStore.setState({ isDirty: true }));
  expect(observer).toHaveBeenCalledWith(useStudioStore.getState(), before);
});
it('does not change live ownership or history when raster staging fails and always releases the preview', () => {
  const before = useStudioStore.getState(), buffers = snapshotBuffers(), output = preview(), engine = createHistoryEngine();
  setGlobalHistoryEngine(engine);
  vi.mocked(HTMLCanvasElement.prototype.getContext).mockReturnValueOnce(null);
  expect(() => applyResearchPreview(output)).toThrow();
  expect(useStudioStore.getState()).toBe(before); expect(snapshotBuffers()).toEqual(buffers);
  expect(engine.depth).toBe(0); expect(output.dispose).toHaveBeenCalledOnce();
});
it('rolls back both raster ownership and metadata if a generated-state updater rejects after history staging', () => {
  const before = useStudioStore.getState(), buffers = snapshotBuffers(), output = preview(), engine = createHistoryEngine();
  setGlobalHistoryEngine(engine);
  vi.spyOn(useStudioStore, 'setState').mockImplementationOnce(() => { throw new Error('Injected updater failure'); });
  expect(() => applyResearchPreview(output)).toThrow('Injected updater failure');
  expect(useStudioStore.getState()).toBe(before); expect(snapshotBuffers()).toEqual(buffers);
  expect(engine.depth).toBe(0); expect(output.dispose).toHaveBeenCalledOnce();
});
it('disposes stale previews without changing the document or history', () => {
  const output = preview(); useStudioStore.setState({ editRevision: useStudioStore.getState().editRevision + 1 });
  const before = useStudioStore.getState();
  expect(() => applyResearchPreview(output)).toThrow(/changed/);
  expect(useStudioStore.getState()).toBe(before); expect(output.dispose).toHaveBeenCalledOnce();
});
it('restores an evicted replay baseline, its pixels and truncation counters on transaction failure', () => {
  const engine = createHistoryEngine({ maxDepth: 1 }); setGlobalHistoryEngine(engine);
  const imageData = getOrCreateBuffer(useStudioStore.getState().activeLayerId, 32, 32).ctx.getImageData(0, 0, 32, 32);
  const step = { type: 'pixel' as const, description: 'Stroke', frameIndex: 0, layerId: 'paint', imageData };
  engine.push(step); engine.push(step);
  const baseline = engine.getBaseline(), bytes = engine.totalBytes, evictions = engine.evictionCount;
  expect(() => engine.transaction(() => {
    engine.push({ ...step, imageData: { ...imageData, data: new Uint8ClampedArray(imageData.data.length) } });
    engine.push(step); throw new Error('Failure after eviction');
  })).toThrow('Failure after eviction');
  expect(engine.getBaseline()).toBe(baseline); expect(engine.totalBytes).toBe(bytes);
  expect(engine.evictionCount).toBe(evictions); expect(engine.peekUndo()).toBe(step);
  expect(baseline!.frames[0].layers[0].imageData.data).toEqual(imageData.data);
});
it('keeps structural Undo in place if restoration staging fails, then permits Undo and Redo', () => {
  const drawing = hook(), output = preview(); act(() => applyResearchPreview(output));
  const engine = getGlobalHistoryEngine()!;
  expect(engine.depth).toBe(1);
  const active = useStudioStore.getState(), buffers = snapshotBuffers();
  vi.spyOn(useStudioStore, 'setState').mockImplementationOnce(() => { throw new Error('Undo publication failed'); });
  expect(() => act(() => drawing.result.current.performUndo())).toThrow('Undo publication failed');
  expect(useStudioStore.getState()).toBe(active); expect(snapshotBuffers()).toEqual(buffers);
  expect(engine.depth).toBe(1); expect(engine.redoDepth).toBe(0);
  act(() => drawing.result.current.performUndo()); expect(useStudioStore.getState().frames[0].layers).toHaveLength(1);
  const undone = useStudioStore.getState(), undoneBuffers = snapshotBuffers();
  vi.mocked(HTMLCanvasElement.prototype.getContext).mockReturnValueOnce(null);
  expect(() => act(() => drawing.result.current.performRedo())).toThrow();
  expect(useStudioStore.getState()).toBe(undone); expect(snapshotBuffers()).toEqual(undoneBuffers);
  expect(engine.depth).toBe(0); expect(engine.redoDepth).toBe(1);
  act(() => drawing.result.current.performRedo()); expect(useStudioStore.getState().frames[0].layers).toHaveLength(2);
});
it('retains normal subscription failure semantics outside the workspace publication boundary', () => {
  failObserver();
  expect(() => useStudioStore.setState({ isDirty: true })).toThrow('Injected observer failure');
});
it('coalesces a reentrant observer edit before later observers see metadata and buffers', () => {
  const before = useStudioStore.getState(), original = before.activeLayerId;
  const imageData = getOrCreateBuffer(original, 32, 32).ctx.getImageData(0, 0, 32, 32);
  const first = structuredClone(before.frames), second = structuredClone(before.frames);
  first[0].layers[0].id = 'first'; second[0].layers[0].id = 'second';
  let repeated = false;
  subscriptions.push(useStudioStore.subscribe(() => {
    if (repeated) return; repeated = true;
    restoreStructuralWorkspace({ canvasWidth: 32, canvasHeight: 32, frames: second, activeFrameIndex: 0,
      activeLayerId: 'second', layerBuffers: [{ layerId: 'second', imageData }] });
  }));
  const observed: unknown[] = [];
  subscriptions.push(useStudioStore.subscribe((state, previous) => {
    observed.push({ layerId: state.activeLayerId, buffers: [...snapshotBuffers().keys()], previousId: previous.activeLayerId });
  }));
  restoreStructuralWorkspace({ canvasWidth: 32, canvasHeight: 32, frames: first, activeFrameIndex: 0,
    activeLayerId: 'first', layerBuffers: [{ layerId: 'first', imageData }] });
  expect(observed).toEqual([{ layerId: 'second', buffers: ['second'], previousId: original }]);
});
it('does not deliver a queued notification after a subscriber is removed during the batch', () => {
  const observer = vi.fn(), unsubscribe = useStudioStore.subscribe(observer);
  commitWorkspace(() => { useStudioStore.setState({ isDirty: true }); unsubscribe(); });
  expect(observer).not.toHaveBeenCalled();
});
