// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { makeCanvas } from './helpers/mockCanvas';
import { useStudioStore } from '@/stores/studioStore';
import { clearAllBuffers, getOrCreateBuffer } from '@/lib/engine/bufferRegistry';
import { setGlobalHistoryEngine } from '@/lib/engine/historyEngine';
import { useViewportDrawing } from '@/hooks/viewport/useViewportDrawing';
import { workspaceJobKey } from '@/lib/engine/workspaceJob';

// Strokes publish one store update per animation frame while drawing. A committed
// stroke must be final at once: Curve records this key to allow Re-edit, and a
// late update made every committed curve look stale.
let frames: FrameRequestCallback[] = [];
beforeEach(() => {
  frames = [];
  const contexts = new WeakMap<HTMLCanvasElement, CanvasRenderingContext2D>();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
    let ctx = contexts.get(this);
    if (!ctx) { ctx = makeCanvas(this.width || 32, this.height || 32).getContext('2d')!; contexts.set(this, ctx); }
    return ctx;
  });
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => frames.push(callback));
  vi.stubGlobal('cancelAnimationFrame', (id: number) => { frames[id - 1] = () => {}; });
  clearAllBuffers(); setGlobalHistoryEngine(null);
  useStudioStore.getState().resetToNewProject('stroke-commit');
});
afterEach(() => { cleanup(); setGlobalHistoryEngine(null); clearAllBuffers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('publishes a committed stroke at once, so its workspace key stays valid on the next frame', () => {
  const hook = renderHook(() => useViewportDrawing({ canvasWidth: 32, canvasHeight: 32,
    getOrCreateLayerCanvas: id => getOrCreateBuffer(id, 32, 32).canvas, renderComposite: vi.fn() }));
  const layer = useStudioStore.getState().activeLayerId;
  act(() => {
    hook.result.current.captureSnapshot('Bézier Curve');
    hook.result.current.drawPointsOnActiveLayer([{ x: 2, y: 2 }, { x: 3, y: 2 }], '#ff0000', false);
    hook.result.current.commitSnapshot();
  });
  const committed = workspaceJobKey([layer]);
  act(() => { for (const callback of frames.splice(0)) callback(performance.now()); });
  expect(workspaceJobKey([layer])).toBe(committed);
});

it('still publishes an uncommitted stroke on the next frame', () => {
  const hook = renderHook(() => useViewportDrawing({ canvasWidth: 32, canvasHeight: 32,
    getOrCreateLayerCanvas: id => getOrCreateBuffer(id, 32, 32).canvas, renderComposite: vi.fn() }));
  const before = useStudioStore.getState().bufferVersion;
  act(() => {
    hook.result.current.captureSnapshot('Stroke');
    hook.result.current.drawPointsOnActiveLayer([{ x: 4, y: 4 }], '#00ff00', false);
  });
  expect(useStudioStore.getState().bufferVersion).toBe(before);
  act(() => { for (const callback of frames.splice(0)) callback(performance.now()); });
  expect(useStudioStore.getState().bufferVersion).toBe(before + 1);
});
