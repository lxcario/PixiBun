// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import { makeCanvas } from './helpers/mockCanvas';
import { useStudioStore } from '@/stores/studioStore';
import { clearAllBuffers, getOrCreateBuffer, touchBuffer } from '@/lib/engine/bufferRegistry';
import { setGlobalHistoryEngine } from '@/lib/engine/historyEngine';
import { useViewportDrawing } from '@/hooks/viewport/useViewportDrawing';
import { clipReviewKey, scanAnimationClip } from '@/lib/animation/scanClip';
import { getMemoryBudgetUsage, reserveMemory, COMBINED_MEMORY_LIMIT_BYTES } from '@/lib/safety/memoryBudget';
import { compositeFrame } from '@/lib/render/compositor';
import { buildProjectFile } from '@/lib/project/serialize';
import { validateProjectFile } from '@/lib/project/schema';

vi.mock('@/lib/render/compositor', () => ({ compositeFrame: vi.fn() }));
const region = { id: 'eye', name: 'Eye', kind: 'protect' as const, x: 1, y: 1, w: 2, h: 2 };
beforeEach(() => {
  const contexts = new WeakMap<HTMLCanvasElement, CanvasRenderingContext2D>();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
    let ctx = contexts.get(this);
    if (!ctx) { ctx = makeCanvas(this.width || 32, this.height || 32).getContext('2d')!; contexts.set(this, ctx); }
    return ctx;
  });
  vi.stubGlobal('crypto', webcrypto); vi.stubGlobal('Worker', undefined);
  clearAllBuffers(); setGlobalHistoryEngine(null);
  useStudioStore.getState().resetToNewProject('review-project');
  useStudioStore.getState().addFrame(); useStudioStore.getState().addClip('Review', 0, 1);
  vi.mocked(compositeFrame).mockImplementation(() => makeCanvas(32, 32) as unknown as HTMLCanvasElement);
});
afterEach(() => { cleanup(); setGlobalHistoryEngine(null); clearAllBuffers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); expect(getMemoryBudgetUsage().reservedBytes).toBe(0); });
const clip = () => useStudioStore.getState().clips.find(c => c.id === useStudioStore.getState().activeClipId)!;

it('undoes and redoes review metadata without changing raster artwork', () => {
  const hook = renderHook(() => useViewportDrawing({ canvasWidth: 32, canvasHeight: 32,
    getOrCreateLayerCanvas: id => getOrCreateBuffer(id, 32, 32).canvas, renderComposite: vi.fn() }));
  const id = useStudioStore.getState().activeLayerId, raster = getOrCreateBuffer(id, 32, 32);
  raster.ctx.fillStyle = '#ff0000'; raster.ctx.fillRect(1, 1, 2, 2); touchBuffer(id);
  const before = raster.ctx.getImageData(0, 0, 32, 32).data.slice();
  act(() => useStudioStore.getState().updateClip(clip().id, { review: { regions: [region], exceptions: [] } }));
  expect(clip().review?.regions).toEqual([region]);
  act(() => hook.result.current.performUndo()); expect(clip().review).toBeUndefined();
  act(() => hook.result.current.performRedo()); expect(clip().review?.regions).toEqual([region]);
  expect(getOrCreateBuffer(id, 32, 32).ctx.getImageData(0, 0, 32, 32).data).toEqual(before);
});

it('retains bounded report memory until disposal and content signatures survive navigation and accepted marks', async () => {
  const report = await scanAnimationClip(clip(), true, false);
  try {
    expect(getMemoryBudgetUsage().reservedBytes).toBeGreaterThan(0);
    const key = clipReviewKey(clip());
    useStudioStore.getState().setActiveFrame(1);
    useStudioStore.getState().updateClip(clip().id, { review: { regions: [], exceptions: [{
      fromFrameId: report.frames[0].id, toFrameId: report.frames[1].id, signature: report.signatures[0],
    }] } });
    expect(clipReviewKey(clip())).toBe(key);
    expect(report.signatures[0]).toMatch(/^[a-f0-9]{64}$/);
    getOrCreateBuffer(useStudioStore.getState().activeLayerId, 32, 32);
    touchBuffer(useStudioStore.getState().activeLayerId); expect(clipReviewKey(clip())).not.toBe(key);
  } finally { report.dispose(); report.dispose(); }
});

it('rejects a stale snapshot after metadata changes and releases its memory lease', async () => {
  const pending = scanAnimationClip(clip(), true, false);
  useStudioStore.getState().updateClip(clip().id, { review: { regions: [region], exceptions: [] } });
  await expect(pending).rejects.toThrow(/changed/);
});

it('expires a saved judgment when its following-pose reversal context changes, without binding unrelated poses', async () => {
  useStudioStore.getState().addFrame(); useStudioStore.getState().addFrame();
  useStudioStore.getState().updateClip(clip().id, { endFrame: 3 });
  const colors = ['#ff0000', '#00ff00', '#ff0000', '#ff0000'];
  vi.mocked(compositeFrame).mockImplementation((_frames, index) => {
    const canvas = makeCanvas(32, 32), ctx = canvas.getContext('2d')!;
    ctx.fillStyle = colors[index]; ctx.fillRect(4, 4, 1, 1);
    return canvas;
  });
  const scanPair = async () => {
    const report = await scanAnimationClip(clip(), true, false);
    try { return { signature: report.signatures[0], reversals: report.transitions[0].transientPixels }; }
    finally { report.dispose(); }
  };
  const initial = await scanPair();
  expect(initial.reversals).toBe(1);
  useStudioStore.getState().updateClip(clip().id, { review: { regions: [], exceptions: [{
    fromFrameId: useStudioStore.getState().frames[0].id, toFrameId: useStudioStore.getState().frames[1].id,
    signature: initial.signature,
  }] } });
  colors[3] = '#0000ff';
  expect((await scanPair()).signature).toBe(initial.signature);
  colors[2] = '#00ff00';
  const changed = await scanPair();
  expect(changed.reversals).toBe(0);
  expect(changed.signature).not.toBe(clip().review!.exceptions[0].signature);
});

it('preserves regions and content-bound marks through portable serialization, admission and store hydration', () => {
  const id = clip().id;
  const review = { regions: [region], exceptions: [{ fromFrameId: useStudioStore.getState().frames[0].id,
    toFrameId: useStudioStore.getState().frames[1].id, signature: 'a'.repeat(64) }] };
  useStudioStore.getState().updateClip(id, { review });
  const admitted = validateProjectFile(buildProjectFile());
  expect(admitted.ok).toBe(true);
  if (!admitted.ok) throw new Error(admitted.error);
  useStudioStore.getState().resetToNewProject('another-project');
  useStudioStore.getState().loadProjectState(admitted.value, 'restored');
  expect(useStudioStore.getState().clips.find(c => c.id === id)?.review).toEqual(review);
});

it('refuses combined pressure before compositing and preserves the original workspace', async () => {
  const before = useStudioStore.getState().frames;
  const usage = getMemoryBudgetUsage().totalBytes;
  const release = reserveMemory(COMBINED_MEMORY_LIMIT_BYTES - usage, 'Test pressure');
  vi.mocked(compositeFrame).mockClear();
  try {
    await expect(scanAnimationClip(clip(), true, false)).rejects.toThrow(/combined artwork memory budget/);
    expect(compositeFrame).not.toHaveBeenCalled(); expect(useStudioStore.getState().frames).toBe(before);
  } finally { release(); }
});
