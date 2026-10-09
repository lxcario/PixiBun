import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { executeImageImport } from '@/lib/project/imageImportExecution';
import { useStudioStore } from '@/stores/studioStore';
import { clearAllBuffers, getOrCreateBuffer, snapshotBuffers } from '@/lib/engine/bufferRegistry';
import { createHistoryEngine, setGlobalHistoryEngine, type StructuralHistoryStep } from '@/lib/engine/historyEngine';
import { captureLayerBuffers, restoreStructuralWorkspace } from '@/lib/engine/structuralHistory';
import { installDocumentCanvasMock, makeCanvas } from './helpers/mockCanvas';
import type { ImageImportConfirmPayload } from '@/types/import';
import { getMemoryBudgetUsage } from '@/lib/safety/memoryBudget';

let history: ReturnType<typeof createHistoryEngine>;
let originalState: ReturnType<typeof useStudioStore.getState>;
beforeEach(() => {
  originalState = useStudioStore.getState();
  installDocumentCanvasMock(); clearAllBuffers();
  useStudioStore.getState().resetToNewProject();
  useStudioStore.setState({ canvasWidth: 2, canvasHeight: 2, isDirty: false, editRevision: 42, saveStatus: 'saved' });
  history = createHistoryEngine(); setGlobalHistoryEngine(history);
  const state = useStudioStore.getState();
  const buffer = getOrCreateBuffer(state.activeLayerId, 2, 2);
  buffer.ctx.fillStyle = '#0000ff'; buffer.ctx.fillRect(1, 1, 1, 1);
});
afterEach(() => { clearAllBuffers(); setGlobalHistoryEngine(null); useStudioStore.setState(originalState, true); vi.restoreAllMocks(); });

function payload(overrides: Partial<ImageImportConfirmPayload> = {}): ImageImportConfirmPayload {
  const canvas = makeCanvas(2, 2); const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ff0000'; ctx.fillRect(0, 0, 1, 1);
  return { canvas, filename: 'sprite.png', target: 'replace-layer', extractedPalette: [], addToPalette: false, ...overrides };
}
function pixel(id: string, x = 0, y = 0) {
  const state = useStudioStore.getState();
  return Array.from(getOrCreateBuffer(id, state.canvasWidth, state.canvasHeight).ctx.getImageData(x, y, 1, 1).data);
}
function undoRedo() {
  const step = history.peekUndo() as StructuralHistoryStep;
  const state = useStudioStore.getState();
  const inverse: StructuralHistoryStep = {
    ...step, frames: structuredClone(state.frames), canvasWidth: state.canvasWidth, canvasHeight: state.canvasHeight,
    activeFrameIndex: state.activeFrameIndex, activeLayerId: state.activeLayerId,
    palettes: step.palettes ? structuredClone(state.palettes) : undefined, currentPaletteId: state.currentPaletteId,
    layerBuffers: captureLayerBuffers(step.affectedLayerIds ?? []),
  };
  const restore = (target: StructuralHistoryStep) => restoreStructuralWorkspace({ ...target, canvasWidth: target.canvasWidth!, canvasHeight: target.canvasHeight! });
  restore(history.undo(inverse) as StructuralHistoryStep);
  return () => restore(history.redo(step) as StructuralHistoryStep);
}

describe('atomic image import', () => {
  it('restores a transparent original when the destination had no allocated buffer', () => {
    clearAllBuffers();
    const id = useStudioStore.getState().activeLayerId;
    expect(executeImageImport(payload()).ok).toBe(true);
    const redo = undoRedo(); expect(pixel(id)).toEqual([0, 0, 0, 0]);
    redo(); expect(pixel(id)).toEqual([255, 0, 0, 255]);
  });
  it('replaces transparency, advances the document once and preserves exact Undo/Redo pixels', () => {
    const id = useStudioStore.getState().activeLayerId;
    const previous = snapshotBuffers().get(id);
    expect(executeImageImport(payload())).toEqual({ ok: true });
    expect(pixel(id)).toEqual([255, 0, 0, 255]);
    expect(pixel(id, 1, 1)).toEqual([0, 0, 0, 0]);
    expect(previous!.ctx.getImageData(1, 1, 1, 1).data).toEqual(new Uint8ClampedArray([0, 0, 255, 255]));
    expect(useStudioStore.getState()).toMatchObject({ isDirty: true, editRevision: 43 });
    expect(history.depth).toBe(1);
    const redo = undoRedo(); expect(pixel(id, 1, 1)).toEqual([0, 0, 255, 255]);
    redo(); expect(pixel(id)).toEqual([255, 0, 0, 255]); expect(pixel(id, 1, 1)).toEqual([0, 0, 0, 0]);
  });

  it.each(['new-layer', 'new-frame', 'sprite-sheet-append'] as const)('groups %s and palette integration in one reversible edit', target => {
    const original = useStudioStore.getState();
    const data = payload({ target, addToPalette: true, extractedPalette: ['#ff0000'] });
    if (target === 'sprite-sheet-append') data.slicedFrames = [data.canvas, data.canvas];
    expect(executeImageImport(data).ok).toBe(true);
    const imported = useStudioStore.getState();
    expect(imported.activeLayerId).not.toBe(original.activeLayerId);
    expect(pixel(imported.activeLayerId)).toEqual([255, 0, 0, 255]);
    expect(pixel(original.activeLayerId, 1, 1)).toEqual([0, 0, 255, 255]);
    expect(history.depth).toBe(1); expect(imported.palettes.length).toBe(original.palettes.length + 1);
    const redo = undoRedo();
    expect(useStudioStore.getState().frames).toEqual(original.frames);
    expect(useStudioStore.getState().palettes).toEqual(original.palettes);
    redo(); expect(useStudioStore.getState().frames).toEqual(imported.frames);
    expect(pixel(imported.activeLayerId)).toEqual([255, 0, 0, 255]);
  });

  it('captures erased layers and deleted frames when replacing a sheet', () => {
    useStudioStore.getState().addLayer('Detail'); useStudioStore.getState().addFrame();
    useStudioStore.setState(state => {
      const palette = state.palettes[0];
      palette.semantics = {
        entries: palette.colors.map((_, index) => ({ id: `entry-${index}`, role: '' })),
        bindings: [{ id: 'removed-frame-binding', frameId: state.frames[1].id, entryId: 'entry-0', x: 0, y: 0, w: 1, h: 1 }],
      };
    });
    const original = useStudioStore.getState();
    for (const frame of original.frames) for (const layer of frame.layers) {
      const buffer = getOrCreateBuffer(layer.id, 2, 2); buffer.ctx.fillStyle = '#0000ff'; buffer.ctx.fillRect(1, 1, 1, 1);
    }
    history.clear();
    const data = payload({ target: 'sprite-sheet-replace' }); data.slicedFrames = [data.canvas];
    expect(executeImageImport(data).ok).toBe(true); expect(history.depth).toBe(1);
    expect(useStudioStore.getState().frames.length).toBe(1);
    expect(useStudioStore.getState().palettes[0].semantics!.bindings).toHaveLength(0);
    const redo = undoRedo(); expect(useStudioStore.getState().frames).toEqual(original.frames);
    expect(useStudioStore.getState().palettes).toEqual(original.palettes);
    for (const frame of original.frames) for (const layer of frame.layers) expect(pixel(layer.id, 1, 1)).toEqual([0, 0, 255, 255]);
    redo(); expect(useStudioStore.getState().frames.length).toBe(1);
    expect(useStudioStore.getState().palettes[0].semantics!.bindings).toHaveLength(0);
    expect(pixel(original.frames[0].layers[0].id)).toEqual([255, 0, 0, 255]);
  });

  it('records original dimensions and unaffected artwork for resize Undo', () => {
    useStudioStore.getState().addLayer('Detail'); history.clear();
    const original = useStudioStore.getState();
    expect(executeImageImport(payload({ resizeCanvasToMatch: { width: 3, height: 3 } })).ok).toBe(true);
    const redo = undoRedo(); expect(useStudioStore.getState().canvasWidth).toBe(2);
    expect(pixel(original.frames[0].layers[1].id, 1, 1)).toEqual([0, 0, 255, 255]);
    redo(); expect(useStudioStore.getState().canvasWidth).toBe(3);
  });

  it.each(['new-layer', 'new-frame', 'sprite-sheet-append', 'sprite-sheet-replace', 'replace-layer'] as const)('refuses %s when Undo cannot fit, leaving pixels and state intact', target => {
    history = createHistoryEngine({ maxBytes: 1 }); setGlobalHistoryEngine(history);
    const previous = useStudioStore.getState(), buffers = snapshotBuffers(), reserved = getMemoryBudgetUsage().reservedBytes;
    const data = payload({ target, resizeCanvasToMatch: { width: 3, height: 3 } });
    if (target.startsWith('sprite-sheet')) data.slicedFrames = [data.canvas];
    expect(executeImageImport(data).ok).toBe(false);
    expect(useStudioStore.getState()).toBe(previous); expect(snapshotBuffers()).toEqual(buffers);
    expect(pixel(previous.activeLayerId, 1, 1)).toEqual([0, 0, 255, 255]);
    expect(history.depth).toBe(0); expect(getMemoryBudgetUsage().reservedBytes).toBe(reserved);
  });

  it('rejects long filenames and invalid palettes before any edit', () => {
    const previous = useStudioStore.getState(), buffers = snapshotBuffers();
    expect(executeImageImport(payload({ target: 'new-layer', filename: `${'a'.repeat(129)}.png` })).ok).toBe(false);
    expect(executeImageImport(payload({ addToPalette: true, extractedPalette: ['not-a-color'] })).ok).toBe(false);
    expect(useStudioStore.getState()).toBe(previous); expect(snapshotBuffers()).toEqual(buffers); expect(history.depth).toBe(0);
  });

  it.each(['replace-layer', 'sprite-sheet-replace'] as const)('refuses protected %s artwork', target => {
    useStudioStore.getState().toggleLayerLock(useStudioStore.getState().activeLayerId);
    const previous = useStudioStore.getState(), buffers = snapshotBuffers(); history.clear();
    const data = payload({ target }); if (target === 'sprite-sheet-replace') data.slicedFrames = [data.canvas];
    expect(executeImageImport(data).reason).toMatch(/Unlock/);
    expect(useStudioStore.getState()).toBe(previous); expect(snapshotBuffers()).toEqual(buffers); expect(history.depth).toBe(0);
  });

  it('aborts failed drawing before changing the document or history', () => {
    const previous = useStudioStore.getState(), buffers = snapshotBuffers();
    const data = payload();
    const create = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const canvas = create(tag) as HTMLCanvasElement;
      vi.spyOn(canvas.getContext('2d')!, 'drawImage').mockImplementation(() => { throw new Error('draw failure'); });
      return canvas;
    });
    expect(executeImageImport(data).reason).toBe('draw failure');
    expect(useStudioStore.getState()).toBe(previous); expect(snapshotBuffers()).toEqual(buffers); expect(history.depth).toBe(0);
  });

  it('rolls back a failure after raster publication, including the existing Undo/Redo branch', () => {
    const state = useStudioStore.getState();
    const step = { type: 'pixel' as const, description: 'Prior edit', layerId: state.activeLayerId, frameIndex: 0, imageData: getOrCreateBuffer(state.activeLayerId, 2, 2).ctx.getImageData(0, 0, 2, 2) };
    history.push(step); history.undo(step);
    useStudioStore.setState({ canRedo: true });
    const previous = useStudioStore.getState(), buffers = snapshotBuffers();
    const setState = useStudioStore.setState;
    let injected = false;
    vi.spyOn(useStudioStore, 'setState').mockImplementation(((update: unknown, replace?: boolean) => {
      if (typeof update === 'function' && !injected) {
        injected = true;
        setState(update as Parameters<typeof setState>[0]);
        throw new Error('publication failure');
      }
      setState(update as ReturnType<typeof useStudioStore.getState>, replace as true);
    }) as typeof setState);
    expect(executeImageImport(payload()).reason).toBe('publication failure');
    expect(useStudioStore.getState()).toBe(previous); expect(snapshotBuffers()).toEqual(buffers); expect(history.depth).toBe(0);
    expect(history.redoDepth).toBe(1); expect(history.peekRedo()).toBe(step);
    expect(pixel(previous.activeLayerId, 1, 1)).toEqual([0, 0, 255, 255]);
  });
});
