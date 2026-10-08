// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { makeCanvas } from './helpers/mockCanvas';
import { useStudioStore } from '@/stores/studioStore';
import { clearAllBuffers, getOrCreateBuffer, snapshotBuffers } from '@/lib/engine/bufferRegistry';
import { createHistoryEngine, getGlobalHistoryEngine, setGlobalHistoryEngine } from '@/lib/engine/historyEngine';
import { pushStructuralHistoryStep } from '@/lib/engine/structuralHistory';
import { prepareMotionArtwork } from '@/lib/animation/prepareMotionArtwork';
import { getMemoryBudgetUsage } from '@/lib/safety/memoryBudget';
import * as compositor from '@/lib/render/compositor';

beforeEach(() => {
  const contexts = new WeakMap<HTMLCanvasElement, CanvasRenderingContext2D>();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function(this: HTMLCanvasElement) {
    let context = contexts.get(this); if (!context) { context = makeCanvas(this.width || 32, this.height || 32).getContext('2d')!; contexts.set(this, context); } return context;
  });
  clearAllBuffers(); setGlobalHistoryEngine(null); useStudioStore.getState().resetToNewProject('motion-layered');
  useStudioStore.getState().addLayer('Overlay', undefined, undefined, true);
  for (const layer of useStudioStore.getState().frames[0].layers) getOrCreateBuffer(layer.id, 32, 32);
  const composite = makeCanvas(32, 32); composite.getContext('2d')!.fillStyle = '#ff0000'; composite.getContext('2d')!.fillRect(4, 5, 1, 1);
  vi.spyOn(compositor, 'compositeFrame').mockReturnValue(composite);
  setGlobalHistoryEngine(createHistoryEngine());
});
afterEach(() => { setGlobalHistoryEngine(null); clearAllBuffers(); vi.restoreAllMocks(); expect(getMemoryBudgetUsage().reservedBytes).toBe(0); });

it('publishes one baked color layer and one Undo step without altering the old source buffers', () => {
  const before = useStudioStore.getState(), buffers = snapshotBuffers();
  expect(prepareMotionArtwork()).toEqual({ ok: true });
  const state = useStudioStore.getState(), layer = state.frames[0].layers[0];
  expect(state.frames[0].layers).toHaveLength(1); expect(layer.name).toBe('Motion artwork'); expect(layer.opacity).toBe(1); expect(layer.blendMode).toBe('source-over');
  expect(layer.effect).toBeUndefined(); expect(layer.research).toBeUndefined(); expect(state.activeLayerId).toBe(layer.id);
  expect(getGlobalHistoryEngine()!.depth).toBe(1);
  const step = getGlobalHistoryEngine()!.peekUndo()!; expect(step.type).toBe('structural');
  if (step.type !== 'structural') throw Error('Expected structural Undo');
  expect(step.frames).toEqual(before.frames);
  expect(Array.from(getOrCreateBuffer(layer.id, 32, 32).ctx.getImageData(4, 5, 1, 1).data)).toEqual([255, 0, 0, 255]);
  for (const entry of buffers.values()) expect(entry.ctx.getImageData(4, 5, 1, 1).data[3]).toBe(0);
});
it('retains hidden color layers and their existing buffer ownership', () => {
  useStudioStore.getState().addLayer('Hidden', undefined, undefined, true);
  const hiddenId = useStudioStore.getState().activeLayerId; useStudioStore.getState().toggleLayerVisibility(hiddenId);
  const entry = getOrCreateBuffer(hiddenId, 32, 32); const depth = getGlobalHistoryEngine()!.depth;
  expect(prepareMotionArtwork().ok).toBe(true);
  expect(useStudioStore.getState().frames[0].layers.find(layer => layer.id === hiddenId)?.visible).toBe(false);
  expect(snapshotBuffers().get(hiddenId)).toBe(entry); expect(getGlobalHistoryEngine()!.depth).toBe(depth + 1);
});
it('refuses a mismatched visible buffer even at zero opacity before the compositor can resize it', () => {
  const state = useStudioStore.getState(), frames = structuredClone(state.frames), id = frames[0].layers[0].id;
  frames[0].layers[0].opacity = 0; useStudioStore.setState({ frames }); getOrCreateBuffer(id, 16, 16);
  const before = useStudioStore.getState(), buffers = snapshotBuffers(), depth = getGlobalHistoryEngine()!.depth;
  expect(prepareMotionArtwork().ok).toBe(false); expect(compositor.compositeFrame).not.toHaveBeenCalled();
  expect(useStudioStore.getState()).toBe(before); expect(snapshotBuffers()).toEqual(buffers); expect(buffers.get(id)!.canvas.width).toBe(16); expect(getGlobalHistoryEngine()!.depth).toBe(depth);
});
it('restores real state, buffer ownership, history bytes and Redo after a post-staging publication fault', () => {
  const engine = getGlobalHistoryEngine()!; pushStructuralHistoryStep('Existing redo'); engine.undo(engine.peekUndo()!);
  const before = useStudioStore.getState(), buffers = snapshotBuffers(), redo = engine.peekRedo(), bytes = engine.totalBytes;
  vi.spyOn(useStudioStore, 'setState').mockImplementationOnce(() => { throw Error('Injected publication fault'); });
  expect(prepareMotionArtwork()).toEqual({ ok: false, reason: 'Injected publication fault' });
  expect(useStudioStore.getState()).toBe(before); expect(snapshotBuffers()).toEqual(buffers);
  expect(engine.depth).toBe(0); expect(engine.redoDepth).toBe(1); expect(engine.peekRedo()).toBe(redo); expect(engine.totalBytes).toBe(bytes);
});
it.each(['locked', 'normal', 'floating'] as const)('refuses %s artwork without changing state, history or buffers', kind => {
  const state = useStudioStore.getState();
  if (kind === 'floating') useStudioStore.setState({ hasFloatingSelection: true });
  else { const frames = structuredClone(state.frames); if (kind === 'locked') frames[0].layers[0].locked = true; else frames[0].layers[0].tag = 'normal-map'; useStudioStore.setState({ frames }); }
  const before = useStudioStore.getState(), buffers = snapshotBuffers(), depth = getGlobalHistoryEngine()!.depth;
  expect(prepareMotionArtwork().ok).toBe(false); expect(useStudioStore.getState()).toBe(before); expect(snapshotBuffers()).toEqual(buffers); expect(getGlobalHistoryEngine()!.depth).toBe(depth);
});
it('refuses an empty visible composite before creating history or replacing source buffers', () => {
  vi.mocked(compositor.compositeFrame).mockReturnValue(makeCanvas(32, 32));
  const before = useStudioStore.getState(), buffers = snapshotBuffers();
  expect(prepareMotionArtwork()).toEqual({ ok: false, reason: 'The visible artwork is empty.' });
  expect(useStudioStore.getState()).toBe(before); expect(snapshotBuffers()).toEqual(buffers); expect(getGlobalHistoryEngine()!.depth).toBe(0);
});
