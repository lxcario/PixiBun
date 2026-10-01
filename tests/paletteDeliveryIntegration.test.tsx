// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import { makeCanvas } from './helpers/mockCanvas';
import { useStudioStore } from '@/stores/studioStore';
import { clearAllBuffers, getOrCreateBuffer } from '@/lib/engine/bufferRegistry';
import { setGlobalHistoryEngine } from '@/lib/engine/historyEngine';
import { useViewportDrawing } from '@/hooks/viewport/useViewportDrawing';
import { defaultPaletteSemantics } from '@/lib/color/paletteSemantics';
import { buildProjectFile } from '@/lib/project/serialize';
import { validateProjectFile } from '@/lib/project/schema';
import { buildGodotKit } from '@/lib/export/godotKit';
import { compositeFrame } from '@/lib/render/compositor';
import { getMemoryBudgetUsage, reserveMemory, COMBINED_MEMORY_LIMIT_BYTES } from '@/lib/safety/memoryBudget';

vi.mock('@/lib/render/compositor', () => ({ compositeFrame: vi.fn() }));
beforeEach(() => {
  const contexts = new WeakMap<HTMLCanvasElement, CanvasRenderingContext2D>();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
    let ctx = contexts.get(this); if (!ctx) { ctx = makeCanvas(this.width || 32, this.height || 32).getContext('2d')!; contexts.set(this, ctx); } return ctx;
  });
  vi.clearAllMocks(); vi.stubGlobal('crypto', webcrypto); clearAllBuffers(); setGlobalHistoryEngine(null);
  useStudioStore.getState().resetToNewProject('palette-kit');
  vi.mocked(compositeFrame).mockImplementation(() => makeCanvas(32, 32));
});
afterEach(() => { cleanup(); setGlobalHistoryEngine(null); clearAllBuffers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); expect(getMemoryBudgetUsage().reservedBytes).toBe(0); });
const activePalette = () => useStudioStore.getState().palettes.find(p => p.id === useStudioStore.getState().currentPaletteId)!;
const drawing = () => renderHook(() => useViewportDrawing({ canvasWidth: 32, canvasHeight: 32, getOrCreateLayerCanvas: id => getOrCreateBuffer(id, 32, 32).canvas, renderComposite: vi.fn() }));
const options = { clipId: 'all', indexed: false, normals: false, pivot: 'center' as const };

it('roles, explicit bindings and cycling undo and redo together without changing raster bytes', () => {
  const hook = drawing(), state = useStudioStore.getState(), id = state.activeLayerId;
  const raster = getOrCreateBuffer(id, 32, 32); raster.ctx.fillStyle = '#ff0000'; raster.ctx.fillRect(2, 2, 2, 2);
  const before = raster.ctx.getImageData(0, 0, 32, 32).data.slice(), palette = activePalette();
  const semantics = defaultPaletteSemantics(palette); semantics.entries[0].role = 'water-phase';
  semantics.bindings.push({ id: 'binding', frameId: state.frames[0].id, entryId: semantics.entries[0].id, x: 2, y: 2, w: 2, h: 2 });
  act(() => state.setPaletteSemantics(palette.id, semantics));
  act(() => useStudioStore.getState().addPaletteCycleTrack(palette.id, { id: 'cycle', low: 0, high: 2, rate: 2, direction: 'forward', blendShift: true, enabled: true }));
  act(() => hook.result.current.performUndo()); expect(activePalette().cycleTracks?.some(t => t.id === 'cycle')).toBe(false); expect(activePalette().semantics).toEqual(semantics);
  act(() => hook.result.current.performUndo()); expect(activePalette().semantics).toBeUndefined();
  act(() => hook.result.current.performRedo()); act(() => hook.result.current.performRedo());
  expect(activePalette().semantics).toEqual(semantics); expect(activePalette().cycleTracks?.some(t => t.id === 'cycle')).toBe(true);
  expect(getOrCreateBuffer(id, 32, 32).ctx.getImageData(0, 0, 32, 32).data).toEqual(before);
});
it('project admission round-trips register identity and rejects corrupted bindings', () => {
  const palette = activePalette(), semantics = defaultPaletteSemantics(palette); semantics.entries[0].role = 'cloth-shadow';
  useStudioStore.getState().setPaletteSemantics(palette.id, semantics);
  const file = structuredClone(buildProjectFile()); const loaded = validateProjectFile(file); expect(loaded.ok).toBe(true);
  if (loaded.ok) expect(loaded.value.palettes.find(p => p.id === palette.id)?.semantics).toEqual(semantics);
  file.palettes.find(p => p.id === palette.id)!.semantics!.entries[0].id = semantics.entries[1].id;
  expect(validateProjectFile(file).ok).toBe(false);
});
it('appending a ramp keeps all existing register IDs and roles stable', () => {
  const palette = activePalette(), semantics = defaultPaletteSemantics(palette); semantics.entries[0].role = 'skin-light';
  useStudioStore.getState().setPaletteSemantics(palette.id, semantics); useStudioStore.getState().generateAndAddRamp('#123abc');
  expect(activePalette().semantics?.entries.slice(0, semantics.entries.length)).toEqual(semantics.entries);
  expect(activePalette().semantics?.entries.length).toBe(activePalette().colors.length);
});
it('refuses combined memory pressure before compositing or allocating the kit', async () => {
  const release = reserveMemory(COMBINED_MEMORY_LIMIT_BYTES - getMemoryBudgetUsage().totalBytes - 32, 'occupied');
  try { await expect(buildGodotKit(options)).rejects.toThrow(/memory/i); expect(compositeFrame).not.toHaveBeenCalled(); } finally { release(); }
});
it('refuses an already cancelled kit before touching pixels', async () => {
  const controller = new AbortController(); controller.abort(); await expect(buildGodotKit({ ...options, signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
  expect(compositeFrame).not.toHaveBeenCalled();
});
it('rejects changed artwork after an asynchronous export boundary and releases its lease', async () => {
  const pending = buildGodotKit(options); useStudioStore.getState().setFrameDuration(0, 123);
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(callback => callback(new Blob([new Uint8Array([1, 2, 3])])));
  await expect(pending).rejects.toThrow(/changed/);
});
it('refuses missing normal-map planes without making an empty replacement', async () => {
  useStudioStore.setState(s => ({ frames: [{ ...s.frames[0], layers: [{ ...s.frames[0].layers[0], tag: 'normal-map' }] }] }));
  await expect(buildGodotKit({ ...options, normals: true })).rejects.toThrow(/missing/);
  expect(compositeFrame).not.toHaveBeenCalled();
});
it('handles synchronous native encoding failure and releases the kit memory', async () => {
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(() => { throw new Error('Native encoding failed'); });
  await expect(buildGodotKit(options)).rejects.toThrow(/Native encoding failed/);
});
it('ignores a late PNG callback after cancellation instead of reading new bytes', async () => {
  let callback: BlobCallback | undefined;
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(cb => { callback = cb; });
  const controller = new AbortController(), pending = buildGodotKit({ ...options, signal: controller.signal });
  const rejected = expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  await vi.waitFor(() => expect(callback).toBeDefined()); controller.abort(); await rejected;
  const late = new Blob([new Uint8Array([1, 2, 3])]), read = vi.spyOn(late, 'arrayBuffer');
  callback!(late); expect(read).not.toHaveBeenCalled();
});
