// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useViewportSelection } from '@/hooks/viewport/useViewportSelection';
import { useViewportSelectionTransform } from '@/hooks/viewport/useViewportSelectionTransform';
import { useStudioStore } from '@/stores/studioStore';
import { clearAllBuffers } from '@/lib/engine/bufferRegistry';
import { setGlobalHistoryEngine } from '@/lib/engine/historyEngine';
import { makeCanvas, type MockCtx } from './helpers/mockCanvas';

const box = { x: 3, y: 4, w: 2, h: 2 };
beforeEach(() => {
  const contexts = new WeakMap<HTMLCanvasElement, CanvasRenderingContext2D>();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
    let context = contexts.get(this);
    if (!context) {
      context = makeCanvas(this.width || 32, this.height || 32).getContext('2d')!;
      contexts.set(this, context);
      // Let the byte-copy fixture read a DOM canvas used for clipboard/paste.
      Object.defineProperty(this, '_imageData', { value: (context as MockCtx)._imageData, configurable: true });
    }
    return context;
  });
  clearAllBuffers(); setGlobalHistoryEngine(null);
  useStudioStore.getState().resetToNewProject('Selection lock');
  const mask = new Uint8Array(32 * 32);
  for (let y = 4; y < 6; y++) for (let x = 3; x < 5; x++) mask[y * 32 + x] = 1;
  useStudioStore.getState().setSelection(box, mask);
});
afterEach(() => { cleanup(); clearAllBuffers(); setGlobalHistoryEngine(null); vi.restoreAllMocks(); });

function setup() {
  const layerId = useStudioStore.getState().activeLayerId;
  const canvas = makeCanvas(32, 32), capture = vi.fn(), commit = vi.fn(), render = vi.fn();
  const context = canvas.getContext('2d')!;
  context.fillStyle = '#ff0000'; context.fillRect(3, 4, 2, 2);
  const pixels = () => Array.from(context.getImageData(0, 0, 32, 32).data);
  const hook = renderHook(() => {
    const selection = useStudioStore(state => state.selection);
    const selected = useViewportSelection({ canvasWidth: 32, canvasHeight: 32, activeLayerId: layerId,
      previewCanvasRef: { current: null }, getOrCreateLayerCanvas: () => canvas,
      renderComposite: render, captureSnapshot: capture, commitSnapshot: commit });
    const transformed = useViewportSelectionTransform({ canvasWidth: 32, canvasHeight: 32, activeLayerId: layerId,
      selection, selectionMask: null, floatingSelection: selected.floatingSelection,
      setFloatingSelection: selected.setFloatingSelection, setSelection: useStudioStore.getState().setSelection,
      getOrCreateLayerCanvas: () => canvas, renderComposite: render, captureSnapshot: capture,
      commitSnapshot: commit, bumpBufferVersion: vi.fn(), liftSelectionToFloating: selected.liftSelectionToFloating,
      commitFloatingSelection: selected.commitFloatingSelection });
    return { selected, transformed };
  });
  const lock = () => act(() => { useStudioStore.getState().toggleLayerLock(layerId); });
  return { ...hook, layerId, canvas, pixels, capture, commit, render, lock };
}

it.each(['handleDeleteSelection', 'handleCut', 'liftSelectionToFloating', 'handleFlipHorizontal', 'handleFlipVertical'] as const)(
  '%s preserves locked pixels, marquee and history', method => {
    const hook = setup(), before = hook.pixels(); hook.lock();
    act(() => { hook.result.current.selected[method](); });
    expect(hook.pixels()).toEqual(before);
    expect(useStudioStore.getState().selection).toEqual(box);
    expect(hook.result.current.selected.floatingSelection).toBeNull();
    expect(hook.capture).not.toHaveBeenCalled(); expect(hook.commit).not.toHaveBeenCalled();
  });

it.each(['Delete', 'Backspace', 'x'] as const)('the real key handler refuses locked %s', key => {
  const hook = setup(), before = hook.pixels(); hook.lock();
  act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key, code: key === 'x' ? 'KeyX' : key,
    ctrlKey: key === 'x', cancelable: true, bubbles: true })); });
  expect(hook.pixels()).toEqual(before); expect(useStudioStore.getState().selection).toEqual(box);
  expect(hook.capture).not.toHaveBeenCalled(); expect(hook.commit).not.toHaveBeenCalled();
});

it('refuses a paste on a locked layer and permits it after unlocking', () => {
  const hook = setup(), before = hook.pixels();
  act(() => { hook.result.current.selected.handleCopy(); }); hook.lock();
  act(() => { hook.result.current.selected.handlePaste(); });
  expect(hook.result.current.selected.floatingSelection).toBeNull();
  expect(hook.pixels()).toEqual(before); expect(hook.capture).not.toHaveBeenCalled();
  hook.lock();
  act(() => { hook.result.current.selected.handlePaste(); });
  expect(hook.result.current.selected.floatingSelection).toMatchObject({ x: 15, y: 15, w: 2, h: 2 });
});

it('keeps a pending pasted selection when the destination becomes locked, then commits after unlock', () => {
  const hook = setup(), before = hook.pixels();
  act(() => { hook.result.current.selected.handleCopy(); hook.result.current.selected.handlePaste(); });
  const floating = hook.result.current.selected.floatingSelection; hook.lock();
  act(() => { hook.result.current.selected.commitFloatingSelection(); });
  expect(hook.pixels()).toEqual(before); expect(hook.result.current.selected.floatingSelection).toBe(floating);
  expect(hook.capture).not.toHaveBeenCalled(); expect(hook.commit).not.toHaveBeenCalled();
  hook.lock();
  act(() => { hook.result.current.selected.commitFloatingSelection(); });
  expect(hook.result.current.selected.floatingSelection).toBeNull();
  expect(Array.from(hook.canvas.getContext('2d')!.getImageData(15, 15, 1, 1).data)).toEqual([255, 0, 0, 255]);
  expect(hook.capture).toHaveBeenCalledOnce(); expect(hook.commit).toHaveBeenCalledOnce();
});

it('does not lift a locked layer to start a gizmo transform', () => {
  const hook = setup(), before = hook.pixels(); hook.lock();
  act(() => { hook.result.current.transformed.handlePointerDown('translate', { x: 3, y: 4 }, { x: 3, y: 4 }); });
  expect(hook.pixels()).toEqual(before); expect(hook.result.current.selected.floatingSelection).toBeNull();
  expect(hook.result.current.transformed.transform.isTransforming).toBe(false);
  expect(hook.capture).not.toHaveBeenCalled();
});

it('still deletes an unlocked selection and allows read-only copying from a locked layer', () => {
  const hook = setup(), before = hook.pixels(); hook.lock();
  act(() => { hook.result.current.selected.handleCopy(); });
  expect(hook.pixels()).toEqual(before);
  hook.lock();
  act(() => { hook.result.current.selected.handleDeleteSelection(); });
  expect(hook.pixels()).not.toEqual(before); expect(useStudioStore.getState().selection).toBeNull();
  expect(hook.capture).toHaveBeenCalledOnce(); expect(hook.commit).toHaveBeenCalledOnce();
  act(() => { hook.result.current.selected.handlePaste(); });
  expect(hook.result.current.selected.floatingSelection).toMatchObject({ w: 2, h: 2 });
});
