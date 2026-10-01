// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import { makeCanvas } from './helpers/mockCanvas';
import { useStudioStore } from '@/stores/studioStore';
import { clearAllBuffers, getOrCreateBuffer, getBufferRevision, touchBuffer } from '@/lib/engine/bufferRegistry';
import { setGlobalHistoryEngine, getGlobalHistoryEngine, calculateStepBytes } from '@/lib/engine/historyEngine';
import { useViewportDrawing } from '@/hooks/viewport/useViewportDrawing';
import { createResearchPreview, applyResearchPreview, researchSourceStatus, runResearchWorker } from '@/lib/research/workbench';
import { buildProjectFile } from '@/lib/project/serialize';
import { validateProjectFile } from '@/lib/project/schema';
import { getMemoryBudgetUsage, reserveMemory, COMBINED_MEMORY_LIMIT_BYTES } from '@/lib/safety/memoryBudget';
import type { ResearchSettings } from '@/lib/research/recipes';
const settings: ResearchSettings = { kind: 'pixelize', block: 4, candidate: 'average', colors: ['#000000', '#ffffff'], protected: [{ name: 'Detail', x: 2, y: 2, w: 1, h: 1 }] };
beforeEach(() => {
  const contexts = new WeakMap<HTMLCanvasElement, CanvasRenderingContext2D>();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
    let ctx = contexts.get(this); if (!ctx) { ctx = makeCanvas(this.width || 32, this.height || 32).getContext('2d')!; contexts.set(this, ctx); } return ctx;
  });
  vi.stubGlobal('crypto', webcrypto); vi.stubGlobal('Worker', undefined); clearAllBuffers(); setGlobalHistoryEngine(null);
  useStudioStore.getState().resetToNewProject('research-fixture');
  const s = useStudioStore.getState(), buffer = getOrCreateBuffer(s.activeLayerId, 32, 32); buffer.ctx.fillStyle = '#a02040'; buffer.ctx.fillRect(0, 0, 32, 32);
});
afterEach(() => { cleanup(); setGlobalHistoryEngine(null); clearAllBuffers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); expect(getMemoryBudgetUsage().reservedBytes).toBe(0); });
const hook = () => renderHook(() => useViewportDrawing({ canvasWidth: 32, canvasHeight: 32, getOrCreateLayerCanvas: id => getOrCreateBuffer(id, 32, 32).canvas, renderComposite: vi.fn() }));
it('keeps original source bytes, applies prepublished pixels, and atomically undoes/redoes recipe and visibility', async () => {
  const drawing = hook(), s = useStudioStore.getState(), original = s.activeLayerId;
  const before = getOrCreateBuffer(original, 32, 32).ctx.getImageData(0, 0, 32, 32).data.slice();
  const preview = await createResearchPreview(settings, 'Preserved detail', false);
  expect(getOrCreateBuffer(original, 32, 32).ctx.getImageData(0, 0, 32, 32).data).toEqual(before);
  let observed = false; const unsubscribe = useStudioStore.subscribe(next => { const layer = next.frames[0].layers[0]; if (layer.research) { observed = true; expect(getOrCreateBuffer(layer.id, 32, 32).ctx.getImageData(0, 0, 32, 32).data).toEqual(preview.frames[0].result.data); } });
  act(() => applyResearchPreview(preview)); unsubscribe(); expect(observed).toBe(true);
  const generated = useStudioStore.getState().frames[0].layers[0]; expect(generated.research?.settings).toEqual(settings); expect(useStudioStore.getState().frames[0].layers[1].visible).toBe(false);
  act(() => drawing.result.current.performUndo()); expect(useStudioStore.getState().frames[0].layers).toHaveLength(1); expect(useStudioStore.getState().frames[0].layers[0].visible).toBe(true);
  act(() => drawing.result.current.performRedo()); expect(useStudioStore.getState().frames[0].layers[0].research).toEqual(generated.research);
  expect(getOrCreateBuffer(original, 32, 32).ctx.getImageData(0, 0, 32, 32).data).toEqual(before);
});
it('round-trips canonical research metadata through portable project admission and snapshots nested lists', async () => {
  const preview = await createResearchPreview(settings, 'Saved study', false); applyResearchPreview(preview);
  const file = buildProjectFile(), loaded = validateProjectFile(file); expect(loaded.ok).toBe(true);
  if (loaded.ok) expect(loaded.value.frames[0].layers[0].research).toEqual(useStudioStore.getState().frames[0].layers[0].research);
  const exported = file.frames[0].layers[0].research!; if (exported.settings.kind === 'pixelize') exported.settings.protected[0].name = 'changed';
  expect(useStudioStore.getState().frames[0].layers[0].research!.settings).toEqual(settings);
  file.frames[0].layers[0].research!.source.sha256 = 'invalid'; expect(validateProjectFile(file).ok).toBe(false);
});
it('clears single-source recipe provenance after a merge and restores it through undo', async () => {
  const drawing = hook(), preview = await createResearchPreview(settings, 'Study', false);
  act(() => applyResearchPreview(preview)); const recipe = useStudioStore.getState().frames[0].layers[0].research;
  act(() => useStudioStore.getState().addLayer('Painted overlay'));
  act(() => useStudioStore.getState().mergeLayerDown(useStudioStore.getState().activeLayerId));
  expect(useStudioStore.getState().frames[0].layers[0].research).toBeUndefined();
  act(() => drawing.result.current.performUndo()); expect(useStudioStore.getState().frames[0].layers[1].research).toEqual(recipe);
  act(() => drawing.result.current.performRedo()); expect(useStudioStore.getState().frames[0].layers[0].research).toBeUndefined();
});
it('detects changed raw pixels through content fingerprints and preserves hidden originals when recomputing', async () => {
  const preview = await createResearchPreview(settings, 'Study', false); applyResearchPreview(preview);
  const s = useStudioStore.getState(), generated = s.frames[0].layers[0], recipe = generated.research!;
  expect(await researchSourceStatus(recipe)).toBe('current');
  const source = getOrCreateBuffer(recipe.source.layerId, 32, 32); source.ctx.clearRect(2, 2, 1, 1); touchBuffer(recipe.source.layerId);
  expect(await researchSourceStatus(recipe)).toBe('stale');
  const second = await createResearchPreview(recipe.settings, recipe.name, false); applyResearchPreview(second);
  expect(useStudioStore.getState().frames[0].layers.filter(l => l.visible)).toHaveLength(1);
  expect(await researchSourceStatus(useStudioStore.getState().frames[0].layers[0].research!)).toBe('current');
});
it('refuses stale application without adding layers or history and releases retained preview memory', async () => {
  hook(); const preview = await createResearchPreview(settings, 'Study', false);
  const s = useStudioStore.getState(); s.setFrameDuration(0, 321);
  const depth = getGlobalHistoryEngine()!.depth;
  try { expect(() => applyResearchPreview(preview)).toThrow(/changed/); expect(useStudioStore.getState().frames[0].layers).toHaveLength(1); expect(getGlobalHistoryEngine()!.depth).toBe(depth); }
  finally { preview.dispose(); }
});
it('refuses cancelled and memory-pressured work before reading a source buffer', async () => {
  const s = useStudioStore.getState(), revision = getBufferRevision(s.activeLayerId), controller = new AbortController(); controller.abort();
  await expect(createResearchPreview(settings, 'Study', false, controller.signal)).rejects.toThrow(/cancelled/);
  const release = reserveMemory(COMBINED_MEMORY_LIMIT_BYTES - getMemoryBudgetUsage().totalBytes - 1, 'occupied');
  try { await expect(createResearchPreview(settings, 'Study', false)).rejects.toThrow(/memory/); } finally { release(); }
  expect(getBufferRevision(s.activeLayerId)).toBe(revision);
});
it('checks every source in a shared light scope before allowing any multi-frame publication', async () => {
  const s = useStudioStore.getState(); s.addFrame(); const state = useStudioStore.getState(); state.renameLayer(state.activeLayerId, 'Different source');
  const rig: ResearchSettings = { kind: 'light', azimuth: 90, elevation: 45, ambient: 0.25, intensity: 1, height: 0, material: 'cloth', regions: [] };
  await expect(createResearchPreview(rig, 'Shared rig', true)).rejects.toThrow(/exactly one original layer/);
  expect(useStudioStore.getState().frames.map(f => f.layers.length)).toEqual([1, 1]);
});
it('publishes a shared rig across poses in one undo step and fingerprints each authored normal map', async () => {
  const drawing = hook(); act(() => useStudioStore.getState().addFrame());
  const state = useStudioStore.getState();
  const frames = state.frames.map((f, i) => ({ ...f, layers: [...f.layers, { id: `normal-${i}`, name: 'Normal', tag: 'normal-map' as const, visible: false, locked: false, opacity: 1, blendMode: 'source-over' as const }] }));
  act(() => useStudioStore.setState({ frames }));
  frames.forEach((f, i) => { const n = getOrCreateBuffer(`normal-${i}`, 32, 32); n.ctx.fillStyle = i ? '#1080be' : '#f080be'; n.ctx.fillRect(0, 0, 32, 32); const c = getOrCreateBuffer(f.layers[0].id, 32, 32); c.ctx.fillStyle = '#808080'; c.ctx.fillRect(0, 0, 32, 32); });
  const rig: ResearchSettings = { kind: 'light', azimuth: 90, elevation: 45, ambient: 0.25, intensity: 1, height: 0, material: 'metal', regions: [] };
  const preview = await createResearchPreview(rig, 'Pose rig', true), depth = getGlobalHistoryEngine()!.depth;
  expect(preview.frames[0].result.data).not.toEqual(preview.frames[1].result.data);
  act(() => applyResearchPreview(preview)); expect(getGlobalHistoryEngine()!.depth).toBe(depth + 1);
  const recipes = useStudioStore.getState().frames.map(f => f.layers[0].research!);
  expect(recipes.map(r => r.source.normalLayerId)).toEqual(['normal-0', 'normal-1']);
  expect(await Promise.all(recipes.map(researchSourceStatus))).toEqual(['current', 'current']);
  act(() => drawing.result.current.performUndo()); expect(useStudioStore.getState().frames).toEqual(frames);
  act(() => drawing.result.current.performRedo()); expect(useStudioStore.getState().frames.map(f => f.layers[0].research)).toEqual(recipes);
  getOrCreateBuffer('normal-1', 32, 32).ctx.clearRect(0, 0, 1, 1); touchBuffer('normal-1');
  expect(await researchSourceStatus(recipes[1])).toBe('stale');
  const retagged = structuredClone(useStudioStore.getState().frames);
  retagged[0].layers.find(l => l.id === 'normal-0')!.tag = undefined;
  act(() => useStudioStore.setState({ frames: retagged }));
  expect(await researchSourceStatus(recipes[0])).toBe('stale');
});
it('counts bounded recipe metadata in history admission and rejects full layer capacity', async () => {
  const preview = await createResearchPreview(settings, 'Study', false), s = useStudioStore.getState();
  useStudioStore.setState({ frames: [{ ...s.frames[0], layers: Array.from({ length: 100 }, (_, i) => ({ ...s.frames[0].layers[0], id: i ? `limit-${i}` : s.activeLayerId })) }] });
  // Recreate a preview against the now-full project to exercise capacity rather than staleness.
  preview.dispose(); const full = await createResearchPreview(settings, 'Study', false);
  expect(() => applyResearchPreview(full)).toThrow(/layer/); full.dispose();
  const recipe = full.frames[0].recipe, base = { type: 'structural' as const, description: 'test', frameIndex: 0, activeFrameIndex: 0, activeLayerId: s.activeLayerId, frames: [{ ...s.frames[0], layers: [{ ...s.frames[0].layers[0], research: recipe }] }] };
  expect(calculateStepBytes(base)).toBeGreaterThan(calculateStepBytes({ ...base, frames: s.frames }));
});
it('cancels an owned stalled worker, rejects malformed results, and never falls back after failure', async () => {
  class WorkerStub { static instance: WorkerStub; onmessage: ((event: MessageEvent) => void) | null = null; onerror = null; terminate = vi.fn(); postMessage = vi.fn(); constructor() { WorkerStub.instance = this; } }
  vi.stubGlobal('Worker', WorkerStub); const data = new Uint8ClampedArray(64), input = [{ width: 4, height: 4, data, settings }];
  const controller = new AbortController(), cancelled = expect(runResearchWorker(input, controller.signal)).rejects.toThrow(/cancelled/); controller.abort(); await cancelled;
  expect(WorkerStub.instance.terminate).toHaveBeenCalledOnce();
  const bad = expect(runResearchWorker(input)).rejects.toThrow(/invalid pixels/);
  WorkerStub.instance.onmessage!({ data: { results: [{ data: new Uint8ClampedArray(3), notes: [] }] } } as MessageEvent); await bad;
});
it('terminates a research worker at its fixed deadline and frees the job slot', async () => {
  vi.useFakeTimers(); class WorkerStub { onmessage = null; onerror = null; terminate = vi.fn(); postMessage = vi.fn(); }
  vi.stubGlobal('Worker', WorkerStub); const input = [{ width: 4, height: 4, data: new Uint8ClampedArray(64), settings }];
  const expired = expect(runResearchWorker(input)).rejects.toThrow(/deadline/); await vi.advanceTimersByTimeAsync(30000); await expired;
  const controller = new AbortController(), again = expect(runResearchWorker(input, controller.signal)).rejects.toThrow(/cancelled/); controller.abort(); await again;
});
it.each(['foreign tile', 'non-finite repetition', 'missing light passes'])('rejects worker workflow diagnostics: %s', async mode => {
  class WorkerStub { static instance: WorkerStub; onmessage: ((event: MessageEvent) => void) | null = null; onerror = null; terminate = vi.fn(); postMessage = vi.fn(); constructor() { WorkerStub.instance = this; } }
  vi.stubGlobal('Worker', WorkerStub);
  const config: ResearchSettings = mode === 'missing light passes' ? { kind: 'light', azimuth: 90, elevation: 45, ambient: 0.25, intensity: 1, height: 0, material: 'cloth', regions: [] } :
    { kind: 'scene', tileSize: 2, seed: 1, path: 'none', pins: [], tiles: Array.from({ length: 4 }, () => ({ north: 'a', east: 'a', south: 'a', west: 'a', walkable: true })) };
  const refused = expect(runResearchWorker([{ width: 4, height: 4, data: new Uint8ClampedArray(64), settings: config }])).rejects.toThrow(/invalid workflow diagnostics/);
  WorkerStub.instance.onmessage!({ data: { results: [{ data: new Uint8ClampedArray(64), notes: [], map: [0, 0, 0, mode === 'foreign tile' ? 4 : 0], repeats: mode === 'non-finite repetition' ? NaN : 0 }] } } as MessageEvent);
  await refused; expect(WorkerStub.instance.terminate).toHaveBeenCalledOnce();
});
