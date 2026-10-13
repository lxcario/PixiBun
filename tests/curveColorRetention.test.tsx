// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useCurvePointerHandler } from '@/hooks/viewport/useCurvePointerHandler';
import { useStudioStore } from '@/stores/studioStore';
import { clearAllBuffers, getOrCreateBuffer } from '@/lib/engine/bufferRegistry';
import { createHistoryEngine, setGlobalHistoryEngine } from '@/lib/engine/historyEngine';
import type { HistoryStep } from '@/types/canvas';
import { makeCanvas } from './helpers/mockCanvas';

const PRIMARY = '#ff0055', SECONDARY = '#00ffff';
beforeEach(() => {
  const contexts = new WeakMap<HTMLCanvasElement, CanvasRenderingContext2D>();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function(this: HTMLCanvasElement) {
    let context = contexts.get(this);
    if (!context) { context = makeCanvas(32, 32).getContext('2d')!; contexts.set(this, context); }
    return context;
  });
  clearAllBuffers(); setGlobalHistoryEngine(null);
  useStudioStore.setState(state => {
    state.currentProjectId = 'curve-color'; state.canvasWidth = state.canvasHeight = 32;
    state.editRevision = 0; state.tools.activeTool = 'curve'; state.tools.brushSize = 1;
    state.primaryColor = PRIMARY; state.secondaryColor = SECONDARY;
    state.activeFrameIndex = 0; state.activeLayerId = 'color-layer';
    state.frames = [{ id: 'color-frame', durationMs: 100, layers: [{ id: 'color-layer', name: 'Art', visible: true, locked: false, opacity: 1, blendMode: 'source-over' }] }];
  });
  getOrCreateBuffer('color-layer', 32, 32);
});
afterEach(() => { cleanup(); setGlobalHistoryEngine(null); clearAllBuffers(); vi.restoreAllMocks(); });

function fixture(secondary = false, withHistory = false) {
  const draw = vi.fn(), canvas = document.createElement('canvas'), previewCanvasRef = { current: canvas };
  const engine = withHistory ? createHistoryEngine(50) : null;
  setGlobalHistoryEngine(engine);
  const current = (): HistoryStep => ({ type: 'pixel', layerId: 'color-layer', frameIndex: 0,
    imageData: getOrCreateBuffer('color-layer', 32, 32).ctx.getImageData(0, 0, 32, 32), description: 'Bézier Curve' });
  const captureSnapshot = vi.fn(), discardSnapshot = vi.fn(), renderComposite = vi.fn();
  const commitSnapshot = vi.fn(() => engine?.push(current()));
  const performUndo = vi.fn(() => engine?.undo(current()));
  const hook = renderHook(() => useCurvePointerHandler({ canvasWidth: 32, canvasHeight: 32, previewCanvasRef,
    drawPointsOnActiveLayer: draw, captureSnapshot, discardSnapshot, renderComposite, commitSnapshot, performUndo }));
  act(() => {
    hook.result.current.onPointerDown({ button: 0, shiftKey: secondary } as React.PointerEvent, { x: 5, y: 8 });
    hook.result.current.onPointerMove({ button: 0, shiftKey: false } as React.PointerEvent, { x: 23, y: 8 });
    hook.result.current.onPointerUp(undefined, { x: 23, y: 8 });
  });
  return { ...hook, draw };
}
function commitColor(f: ReturnType<typeof fixture>, expected: string) {
  expect(f.result.current.isAdjusting).toBe(true);
  act(() => f.result.current.commit());
  expect(f.draw).toHaveBeenLastCalledWith(expect.any(Array), expected, false);
}

it('retains the Shift-selected secondary color after releasing Shift and entering adjustment', () => {
  commitColor(fixture(true), SECONDARY);
});
it('keeps the secondary stroke color when only primary color or brush size changes', () => {
  const f = fixture(true);
  act(() => useStudioStore.setState(state => { state.primaryColor = '#774433'; state.tools.brushSize = 3; }));
  commitColor(f, SECONDARY);
});
it('updates a secondary curve from an explicit secondary-well change', () => {
  const f = fixture(true);
  act(() => useStudioStore.setState(state => { state.secondaryColor = '#aa66cc'; }));
  commitColor(f, '#aa66cc');
});
it('updates a primary curve from an explicit primary-well change', () => {
  const f = fixture();
  act(() => useStudioStore.setState(state => { state.primaryColor = '#cc9933'; }));
  commitColor(f, '#cc9933');
});
it.each([false, true])('reopens a committed curve with its stored color when secondary=%s despite changed current wells', secondary => {
  const f = fixture(secondary, true), expected = secondary ? SECONDARY : PRIMARY;
  act(() => f.result.current.commit());
  act(() => useStudioStore.setState(state => { state.primaryColor = '#123456'; state.secondaryColor = '#654321'; }));
  act(() => expect(f.result.current.reEdit()).toBe(true));
  commitColor(f, expected);
});
