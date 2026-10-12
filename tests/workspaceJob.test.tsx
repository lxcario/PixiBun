// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { webcrypto } from 'node:crypto';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { makeCanvas } from './helpers/mockCanvas';
import { useStudioStore } from '@/stores/studioStore';
import { beginWorkspaceJob } from '@/lib/engine/workspaceJob';
import { clearAllBuffers, getOrCreateBuffer, touchBuffer, snapshotBuffers, createEntry, replaceAllBuffers } from '@/lib/engine/bufferRegistry';
import { getMemoryBudgetUsage } from '@/lib/safety/memoryBudget';
import { createResearchPreview } from '@/lib/research/workbench';
import { useViewportSelectionTransform } from '@/hooks/viewport/useViewportSelectionTransform';
import { runRotSpriteInWorker, runMorphInWorker, runEdtNormalMapInWorker } from '@/lib/engine/workerDispatcher';
import { useArtisanEvents } from '@/hooks/viewport/events/useArtisanEvents';
import { usePhotometricEvents } from '@/hooks/viewport/events/usePhotometricEvents';
import { studioEvents } from '@/lib/events/studioEvents';
import { useViewportSelection } from '@/hooks/viewport/useViewportSelection';
vi.mock('@/lib/engine/workerDispatcher', () => ({ runRotSpriteInWorker: vi.fn(), runMorphInWorker: vi.fn(), runEdtNormalMapInWorker: vi.fn() }));

beforeEach(() => {
  const contexts = new WeakMap<HTMLCanvasElement, CanvasRenderingContext2D>();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function(this: HTMLCanvasElement) {
    let ctx = contexts.get(this);
    if (!ctx) { ctx = makeCanvas(this.width || 32, this.height || 32).getContext('2d')!; contexts.set(this, ctx); }
    return ctx;
  });
  vi.stubGlobal('crypto', webcrypto);
  clearAllBuffers(); useStudioStore.getState().resetToNewProject('owned-source');
  const buffer = getOrCreateBuffer(useStudioStore.getState().activeLayerId, 32, 32);
  buffer.ctx.fillStyle = '#ff0000'; buffer.ctx.fillRect(0, 0, 2, 2);
});
afterEach(() => {
  cleanup(); clearAllBuffers(); vi.restoreAllMocks(); vi.unstubAllGlobals();
  vi.mocked(runRotSpriteInWorker).mockReset();
  vi.mocked(runMorphInWorker).mockReset(); vi.mocked(runEdtNormalMapInWorker).mockReset();
  expect(getMemoryBudgetUsage().reservedBytes).toBe(0);
});
it('cancels a job on a project switch, including switching back to the original identity', () => {
  const before = useStudioStore.getState(), job = beginWorkspaceJob([before.activeLayerId]);
  useStudioStore.getState().resetToNewProject('other-project');
  useStudioStore.setState(before, true);
  expect(job.signal.aborted).toBe(true); expect(() => job.check()).toThrow(/changed/);
  job.dispose();
});
it('rejects changed raw source revisions even before a store notification', () => {
  const id = useStudioStore.getState().activeLayerId, job = beginWorkspaceJob([id]);
  touchBuffer(id);
  expect(() => job.check()).toThrow(/changed/); expect(job.signal.aborted).toBe(true);
  job.dispose();
});
it('rejects replacement canvases with the same source ID and initial revision', () => {
  const id = useStudioStore.getState().activeLayerId, job = beginWorkspaceJob([id]);
  replaceAllBuffers(new Map([[id, createEntry(32, 32)]]));
  expect(() => job.check()).toThrow(/changed/); job.dispose();
});
it('cancels source metadata edits and invalid layer references before a worker can publish', () => {
  const id = useStudioStore.getState().activeLayerId, job = beginWorkspaceJob([id]);
  useStudioStore.getState().renameLayer(id, 'Renamed');
  expect(job.signal.aborted).toBe(true); job.dispose();
  const missing = beginWorkspaceJob(['missing-source']);
  expect(missing.signal.aborted).toBe(true); missing.dispose();
});
it('forwards already-aborted and later-aborted caller signals and removes listeners on disposal', () => {
  const id = useStudioStore.getState().activeLayerId, controller = new AbortController();
  const remove = vi.spyOn(controller.signal, 'removeEventListener');
  const job = beginWorkspaceJob([id], controller.signal); controller.abort();
  expect(job.signal.aborted).toBe(true); expect(remove).toHaveBeenCalledWith('abort', expect.any(Function));
  job.dispose(); const aborted = beginWorkspaceJob([id], controller.signal);
  expect(aborted.signal.aborted).toBe(true); aborted.dispose();
});
it('disposes the ownership watcher after a successful result', () => {
  const job = beginWorkspaceJob([useStudioStore.getState().activeLayerId]); job.check(); job.dispose();
  useStudioStore.getState().resetToNewProject('other-project');
  expect(job.signal.aborted).toBe(false);
});
it('terminates a research worker immediately on project replacement and releases preview reservations', async () => {
  const holder: { worker?: { onmessage: ((event: MessageEvent) => void) | null; terminate: ReturnType<typeof vi.fn>; postMessage: ReturnType<typeof vi.fn> } } = {};
  class FakeWorker {
    onmessage = null; onerror = null; terminate = vi.fn(); postMessage = vi.fn();
    constructor() { holder.worker = this; }
  }
  vi.stubGlobal('Worker', FakeWorker);
  const result = createResearchPreview({ kind: 'pixelize', block: 4, candidate: 'average', colors: ['#000000', '#ffffff'], protected: [] }, 'Owned preview', false);
  const rejected = expect(result).rejects.toThrow(/cancelled/);
  await vi.waitFor(() => expect(holder.worker?.postMessage).toHaveBeenCalledOnce());
  useStudioStore.getState().resetToNewProject('replacement-project');
  expect(holder.worker!.terminate).toHaveBeenCalledOnce(); expect(holder.worker!.onmessage).toBeNull();
  await rejected;
  expect(getMemoryBudgetUsage().reservedBytes).toBe(0);
  expect(useStudioStore.getState().frames[0].layers).toHaveLength(1);
});

function selectionHook() {
  const id = useStudioStore.getState().activeLayerId, canvas = document.createElement('canvas');
  canvas.width = 2; canvas.height = 2;
  const commit = vi.fn(), render = vi.fn(), setFloating = vi.fn();
  const drawing = renderHook(() => useViewportSelectionTransform({ canvasWidth: 32, canvasHeight: 32, activeLayerId: id,
    selection: null, selectionMask: null, floatingSelection: { canvas, x: 0, y: 0, w: 2, h: 2 },
    setFloatingSelection: setFloating, setSelection: vi.fn(), getOrCreateLayerCanvas: layerId => getOrCreateBuffer(layerId, 32, 32).canvas,
    renderComposite: render, captureSnapshot: vi.fn(), commitSnapshot: commit, bumpBufferVersion: vi.fn(),
    liftSelectionToFloating: vi.fn(), commitFloatingSelection: vi.fn() }));
  act(() => drawing.result.current.setTransform({ x: 0, y: 0, w: 2, h: 2, rotation: Math.PI / 4,
    scaleX: 1, scaleY: 1, pivot: { x: 1, y: 1 }, isTransforming: true, activeHandle: null }));
  return { drawing, commit, render, setFloating };
}
function pastedHook() {
  const id = useStudioStore.getState().activeLayerId, entry = getOrCreateBuffer(id, 32, 32);
  const pasted = document.createElement('canvas'); pasted.width = 2; pasted.height = 2;
  const ctx = pasted.getContext('2d')!; ctx.fillStyle = '#00ff00'; ctx.fillRect(0, 0, 2, 2);
  const capture = vi.fn(), commit = vi.fn();
  const drawing = renderHook(() => useViewportSelectionTransform({ canvasWidth: 32, canvasHeight: 32, activeLayerId: id,
    selection: { x: 15, y: 15, w: 2, h: 2 }, selectionMask: null, floatingSelection: { canvas: pasted, x: 15, y: 15, w: 2, h: 2 },
    setFloatingSelection: vi.fn(), setSelection: vi.fn(), getOrCreateLayerCanvas: layerId => getOrCreateBuffer(layerId, 32, 32).canvas,
    renderComposite: vi.fn(), captureSnapshot: capture, commitSnapshot: commit, bumpBufferVersion: vi.fn(),
    liftSelectionToFloating: vi.fn(), commitFloatingSelection: vi.fn() }));
  return { drawing, entry, capture, commit };
}
it('captures the unchanged layer once before transforming a pasted copy so commit has an Undo baseline', async () => {
  const { drawing, entry, capture, commit } = pastedHook(), before = entry.ctx.getImageData(0, 0, 32, 32).data.slice();
  capture.mockImplementation(() => expect(entry.ctx.getImageData(0, 0, 32, 32).data).toEqual(before));
  act(() => drawing.result.current.handlePointerDown('translate', { x: 15, y: 15 }, { x: 15, y: 15 }));
  await act(async () => { await drawing.result.current.commitTransform(); });
  expect(capture).toHaveBeenCalledOnce(); expect(commit).toHaveBeenCalledOnce();
});
it('cancelling a transform of a pasted copy discards it without restoring copied pixels into the layer', () => {
  const { drawing, entry, commit } = pastedHook(), before = entry.ctx.getImageData(0, 0, 32, 32).data.slice();
  act(() => drawing.result.current.handlePointerDown('translate', { x: 15, y: 15 }, { x: 15, y: 15 }));
  const draw = vi.spyOn(entry.ctx, 'drawImage'); act(() => drawing.result.current.cancelTransform());
  expect(draw).not.toHaveBeenCalled(); expect(entry.ctx.getImageData(0, 0, 32, 32).data).toEqual(before); expect(commit).not.toHaveBeenCalled();
});
function delayedRotation() {
  let finish!: (value: { width: number; height: number; data: Uint8ClampedArray }) => void;
  vi.mocked(runRotSpriteInWorker).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  return () => finish({ width: 2, height: 2, data: new Uint8ClampedArray(16) });
}
it('does not recreate a deleted source when cancelling a lifted transform after a project switch', () => {
  const id = useStudioStore.getState().activeLayerId;
  const drawing = renderHook(() => useViewportSelectionTransform({ canvasWidth: 32, canvasHeight: 32, activeLayerId: id,
    selection: { x: 0, y: 0, w: 2, h: 2 }, selectionMask: null, floatingSelection: null,
    setFloatingSelection: vi.fn(), setSelection: vi.fn(), getOrCreateLayerCanvas: layerId => getOrCreateBuffer(layerId, 32, 32).canvas,
    renderComposite: vi.fn(), captureSnapshot: vi.fn(), commitSnapshot: vi.fn(), bumpBufferVersion: vi.fn(),
    liftSelectionToFloating: vi.fn(), commitFloatingSelection: vi.fn() }));
  act(() => drawing.result.current.handlePointerDown('translate', { x: 0, y: 0 }, { x: 0, y: 0 }));
  act(() => useStudioStore.getState().resetToNewProject('new-document'));
  clearAllBuffers();
  const before = snapshotBuffers();
  act(() => drawing.result.current.cancelTransform());
  expect(snapshotBuffers()).toEqual(before);
});
it.each(['pixels', 'replacement', 'project-aba'])('cancelling a lifted transform preserves newer %s ownership', kind => {
  const state = useStudioStore.getState(), id = state.activeLayerId, entry = getOrCreateBuffer(id, 32, 32);
  const drawing = renderHook(() => useViewportSelectionTransform({ canvasWidth: 32, canvasHeight: 32, activeLayerId: id,
    selection: { x: 0, y: 0, w: 2, h: 2 }, selectionMask: null, floatingSelection: null,
    setFloatingSelection: vi.fn(), setSelection: vi.fn(), getOrCreateLayerCanvas: layerId => getOrCreateBuffer(layerId, 32, 32).canvas,
    renderComposite: vi.fn(), captureSnapshot: vi.fn(), commitSnapshot: vi.fn(), bumpBufferVersion: vi.fn(),
    liftSelectionToFloating: vi.fn(), commitFloatingSelection: vi.fn() }));
  act(() => drawing.result.current.handlePointerDown('translate', { x: 0, y: 0 }, { x: 0, y: 0 }));
  if (kind === 'pixels') { entry.ctx.fillStyle = '#00ff00'; entry.ctx.fillRect(0, 0, 2, 2); touchBuffer(id); }
  if (kind === 'replacement') replaceAllBuffers(new Map([[id, createEntry(32, 32)]]));
  if (kind === 'project-aba') act(() => { useStudioStore.setState({ currentProjectId: 'elsewhere' }); useStudioStore.setState({ currentProjectId: state.currentProjectId }); });
  const live = snapshotBuffers().get(id)!, before = live.ctx.getImageData(0, 0, 32, 32).data.slice(), draw = vi.spyOn(live.ctx, 'drawImage');
  act(() => drawing.result.current.cancelTransform());
  expect(draw).not.toHaveBeenCalled(); expect(live.ctx.getImageData(0, 0, 32, 32).data).toEqual(before);
});

it('refuses an old lifted transform before starting a worker in a replacement project', async () => {
  const id = useStudioStore.getState().activeLayerId, commit = vi.fn();
  const drawing = renderHook(() => useViewportSelectionTransform({ canvasWidth: 32, canvasHeight: 32, activeLayerId: id,
    selection: { x: 0, y: 0, w: 2, h: 2 }, selectionMask: null, floatingSelection: null,
    setFloatingSelection: vi.fn(), setSelection: vi.fn(), getOrCreateLayerCanvas: layerId => getOrCreateBuffer(layerId, 32, 32).canvas,
    renderComposite: vi.fn(), captureSnapshot: vi.fn(), commitSnapshot: commit, bumpBufferVersion: vi.fn(),
    liftSelectionToFloating: vi.fn(), commitFloatingSelection: vi.fn() }));
  act(() => drawing.result.current.handlePointerDown('translate', { x: 0, y: 0 }, { x: 0, y: 0 }));
  act(() => useStudioStore.getState().resetToNewProject('next'));
  const before = snapshotBuffers();
  await act(async () => { await drawing.result.current.commitTransform(); });
  expect(runRotSpriteInWorker).not.toHaveBeenCalled(); expect(commit).not.toHaveBeenCalled(); expect(snapshotBuffers()).toEqual(before);
});
it('advertises floating-selection ownership to motion and clears it on document replacement and unmount', () => {
  const state = useStudioStore.getState();
  const drawing = renderHook(() => useViewportSelection({ canvasWidth: 32, canvasHeight: 32, activeLayerId: state.activeLayerId,
    previewCanvasRef: { current: null }, getOrCreateLayerCanvas: id => getOrCreateBuffer(id, 32, 32).canvas,
    renderComposite: vi.fn(), captureSnapshot: vi.fn(), commitSnapshot: vi.fn() }));
  const floating = { canvas: document.createElement('canvas'), x: 0, y: 0, w: 2, h: 2 };
  act(() => drawing.result.current.setFloatingSelection(floating)); expect(useStudioStore.getState().hasFloatingSelection).toBe(true);
  act(() => useStudioStore.getState().resetToNewProject('new-document'));
  expect(drawing.result.current.floatingSelection).toBeNull(); expect(useStudioStore.getState().hasFloatingSelection).toBe(false);
  act(() => drawing.result.current.setFloatingSelection(floating)); expect(useStudioStore.getState().hasFloatingSelection).toBe(true);
  act(() => useStudioStore.getState().loadProjectState({ width: 32, height: 32, frames: useStudioStore.getState().frames }, 'new-document'));
  expect(drawing.result.current.floatingSelection).toBeNull(); expect(useStudioStore.getState().hasFloatingSelection).toBe(false);
  act(() => drawing.result.current.setFloatingSelection(floating)); expect(useStudioStore.getState().hasFloatingSelection).toBe(true);
  drawing.unmount(); expect(useStudioStore.getState().hasFloatingSelection).toBe(false);
});
it('rejects an uncooperative late free-transform result after changing projects without resurrecting its old layer', async () => {
  const { drawing, commit, render, setFloating } = selectionHook(), finish = delayedRotation();
  const result = drawing.result.current.commitTransform();
  expect(runRotSpriteInWorker).toHaveBeenCalledOnce();
  act(() => useStudioStore.getState().resetToNewProject('other-project'));
  clearAllBuffers(); getOrCreateBuffer(useStudioStore.getState().activeLayerId, 32, 32);
  const state = useStudioStore.getState(), buffers = snapshotBuffers();
  await act(async () => { finish(); await result; });
  expect(useStudioStore.getState()).toBe(state); expect(snapshotBuffers()).toEqual(buffers);
  expect(commit).not.toHaveBeenCalled(); expect(render).not.toHaveBeenCalled(); expect(setFloating).not.toHaveBeenCalled();
});
it('cancels free-transform ownership on unmount and refuses a late worker result', async () => {
  const { drawing, commit, render } = selectionHook(), finish = delayedRotation();
  const result = drawing.result.current.commitTransform(); drawing.unmount();
  finish(); await result;
  expect(commit).not.toHaveBeenCalled(); expect(render).not.toHaveBeenCalled();
});
it('admits only one simultaneous free-transform commit', async () => {
  const { drawing, commit } = selectionHook(), finish = delayedRotation();
  const first = drawing.result.current.commitTransform();
  await drawing.result.current.commitTransform();
  expect(runRotSpriteInWorker).toHaveBeenCalledOnce();
  await act(async () => { finish(); await first; }); expect(commit).toHaveBeenCalledOnce();
});
function eventContext() {
  const state = useStudioStore.getState();
  return { canvasWidth: 32, canvasHeight: 32, activeLayerId: state.activeLayerId,
    getOrCreateLayerCanvas: (id: string) => getOrCreateBuffer(id, 32, 32).canvas,
    renderComposite: vi.fn(), captureSnapshot: vi.fn(), commitSnapshot: vi.fn(), bumpBufferVersion: vi.fn(),
    compositeSourceSnapshot: () => getOrCreateBuffer(state.activeLayerId, 32, 32).ctx,
    updateTaggedLayer: vi.fn(), compositeNormalMapSnapshot: vi.fn(), discardSnapshot: vi.fn() };
}
it('does not insert an in-between result when its second source frame changes before a store notification', async () => {
  useStudioStore.getState().addFrame();
  const state = useStudioStore.getState(), secondId = state.frames[0].layers[0].id;
  let finish!: (value: { width: number; height: number; data: Uint8ClampedArray }[]) => void;
  vi.mocked(runMorphInWorker).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const context = eventContext(); renderHook(() => useArtisanEvents(context));
  act(() => studioEvents.emit('pixibun:in-between-frame'));
  expect(runMorphInWorker).toHaveBeenCalledOnce();
  touchBuffer(secondId);
  const before = useStudioStore.getState();
  await act(async () => { finish([{ width: 32, height: 32, data: new Uint8ClampedArray(4096) }]); });
  expect(useStudioStore.getState()).toBe(before); expect(context.renderComposite).not.toHaveBeenCalled();
});
it('cancels an in-between worker on unmount and refuses its late result', async () => {
  let finish!: (value: { width: number; height: number; data: Uint8ClampedArray }[]) => void;
  vi.mocked(runMorphInWorker).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const context = eventContext(), drawing = renderHook(() => useArtisanEvents(context));
  act(() => studioEvents.emit('pixibun:in-between-frame')); drawing.unmount();
  const signal = vi.mocked(runMorphInWorker).mock.calls[0][4]!.signal!;
  expect(signal.aborted).toBe(true);
  const state = useStudioStore.getState();
  finish([{ width: 32, height: 32, data: new Uint8ClampedArray(4096) }]);
  await act(async () => {});
  expect(useStudioStore.getState()).toBe(state);
});
it('cancels normal-map work on unmount and does not create a tagged output from a late result', async () => {
  let finish!: (value: { width: number; height: number; data: Uint8ClampedArray }) => void;
  vi.mocked(runEdtNormalMapInWorker).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const context = eventContext(), drawing = renderHook(() => usePhotometricEvents(context));
  act(() => studioEvents.emit('pixibun:bake-normal-map')); drawing.unmount();
  const signal = vi.mocked(runEdtNormalMapInWorker).mock.calls[0][3]!.signal!;
  expect(signal.aborted).toBe(true);
  finish({ width: 32, height: 32, data: new Uint8ClampedArray(4096) });
  await act(async () => {});
  expect(context.updateTaggedLayer).not.toHaveBeenCalled();
});
