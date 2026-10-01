// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { clearAllBuffers, getBufferRegistryUsage, getOrCreateBuffer, snapshotBuffers } from '@/lib/engine/bufferRegistry';
import { restoreStructuralWorkspace } from '@/lib/engine/structuralHistory';
import { hydrateProject } from '@/lib/project/serialize';
import { createBlankProjectFile } from '@/lib/storage/db';
import { useStudioStore } from '@/stores/studioStore';
import { COMBINED_MEMORY_LIMIT_BYTES, getMemoryBudgetUsage, registerMemoryUsage, reserveMemory } from '@/lib/safety/memoryBudget';
import { makeCanvas } from './helpers/mockCanvas';
import { act, cleanup, renderHook } from '@testing-library/react';
import { useViewportDrawing } from '@/hooks/viewport/useViewportDrawing';
import { getGlobalHistoryEngine } from '@/lib/engine/historyEngine';

beforeEach(() => {
  clearAllBuffers();
  registerMemoryUsage('rasters', () => getBufferRegistryUsage().bytes);
  registerMemoryUsage('history', () => 0); registerMemoryUsage('collaboration', () => 0);
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
    return makeCanvas(this.width, this.height).getContext('2d');
  });
  useStudioStore.getState().resetToNewProject('live');
});
afterEach(() => { cleanup(); clearAllBuffers(); vi.restoreAllMocks(); });

it('refuses a pressured undo before popping its history and allows a later retry', () => {
  const { result } = renderHook(() => useViewportDrawing({ canvasWidth: 32, canvasHeight: 32,
    renderComposite: vi.fn(), getOrCreateLayerCanvas: id => getOrCreateBuffer(id, 32, 32).canvas }));
  act(() => { result.current.captureSnapshot(); result.current.commitSnapshot(); });
  expect(getGlobalHistoryEngine()!.depth).toBe(1);
  const release = reserveMemory(COMBINED_MEMORY_LIMIT_BYTES - getMemoryBudgetUsage().totalBytes, 'running export');
  try { act(() => result.current.performUndo()); expect(getGlobalHistoryEngine()!.depth).toBe(1); }
  finally { release(); }
  act(() => result.current.performUndo());
  expect(getGlobalHistoryEngine()!.depth).toBe(0);
  expect(getGlobalHistoryEngine()!.canRedo).toBe(true);
});

it('refuses a new raster before touching the existing registry', () => {
  getOrCreateBuffer('artwork', 32, 32);
  const before = snapshotBuffers();
  const release = reserveMemory(COMBINED_MEMORY_LIMIT_BYTES - getMemoryBudgetUsage().totalBytes, 'running export');
  try {
    expect(() => getOrCreateBuffer('refused', 32, 32)).toThrow(/combined artwork memory budget/);
    expect(snapshotBuffers()).toEqual(before);
  } finally { release(); }
});

it('refuses history restoration staging before any store or buffer publication', () => {
  const state = useStudioStore.getState();
  getOrCreateBuffer(state.activeLayerId, 32, 32);
  const before = snapshotBuffers();
  const release = reserveMemory(COMBINED_MEMORY_LIMIT_BYTES - getMemoryBudgetUsage().totalBytes, 'running export');
  try {
    expect(() => restoreStructuralWorkspace({ frames: state.frames, canvasWidth: 64, canvasHeight: 64,
      activeFrameIndex: 0, activeLayerId: state.activeLayerId })).toThrow(/memory budget/);
    expect(snapshotBuffers()).toEqual(before);
    expect(useStudioStore.getState().canvasWidth).toBe(32);
  } finally { release(); }
});

it('releases hydration staging on cancellation and preserves live artwork', async () => {
  getOrCreateBuffer('artwork', 32, 32);
  const before = snapshotBuffers();
  await expect(hydrateProject(createBlankProjectFile(), 'other', [], () => false)).rejects.toThrow(/workspace changed/);
  expect(snapshotBuffers()).toEqual(before);
  expect(useStudioStore.getState().currentProjectId).toBe('live');
  expect(getMemoryBudgetUsage().reservedBytes).toBe(0);
});
