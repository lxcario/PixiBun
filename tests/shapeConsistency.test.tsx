// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { PointerEvent } from 'react';
import { useShapePointerHandler } from '@/hooks/viewport/useShapePointerHandler';
import { useViewportDrawing } from '@/hooks/viewport/useViewportDrawing';
import { useStudioStore } from '@/stores/studioStore';
import { clearAllBuffers, getOrCreateBuffer } from '@/lib/engine/bufferRegistry';
import { setGlobalHistoryEngine } from '@/lib/engine/historyEngine';
import { makeCanvas } from './helpers/mockCanvas';
import type { Point } from '@/lib/canvas/rasterMath';

const event = { shiftKey: true } as PointerEvent;
beforeEach(() => {
  const contexts = new WeakMap<HTMLCanvasElement, CanvasRenderingContext2D>();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
    let ctx = contexts.get(this);
    if (!ctx) { ctx = makeCanvas(this.width || 32, this.height || 32).getContext('2d')!; contexts.set(this, ctx); }
    return ctx;
  });
  clearAllBuffers(); setGlobalHistoryEngine(null);
  useStudioStore.getState().resetToNewProject('shape-test');
  useStudioStore.setState({ primaryColor: '#ff0000', secondaryColor: '#0000ff' });
  useStudioStore.setState(s => { Object.assign(s.tools, { activeTool: 'line', brushSize: 1, isoAngleSnap: false, shapeFilled: false, symmetryHorizontal: false, symmetryVertical: false, symmetryGroup: 'none' }); });
});
afterEach(() => { cleanup(); clearAllBuffers(); setGlobalHistoryEngine(null); vi.restoreAllMocks(); });

it.each([[1, 1, 2, 3], [3, 2, 5, 3], [-4, 2, 35, 16]])('Line uses identical pixels from either end (%j,%j)-(%j,%j)', (x0, y0, x1, y1) => {
  const committed: Point[][] = [];
  const draw = (points: Point[]) => committed.push(points);
  const hook = renderHook(({ start }: { start: Point }) => useShapePointerHandler({ canvasWidth: 32, canvasHeight: 32, strokeStart: start, previewCanvasRef: { current: null }, drawPointsOnActiveLayer: draw }), { initialProps: { start: { x: x0, y: y0 } } });
  act(() => hook.result.current.onPointerUp(event, { x: x1, y: y1 }));
  hook.rerender({ start: { x: x1, y: y1 } });
  act(() => hook.result.current.onPointerUp(event, { x: x0, y: y0 }));
  expect(committed[0]).toEqual(committed[1].toReversed());
});

for (const mirrored of [false, true]) {
  it.each(['line', 'isometric-line', 'rectangle', 'ellipse'] as const)('%s preview equals the selected committed layer with a thick brush (mirrored: ' + mirrored + ')', tool => {
    const mask = new Uint8Array(32 * 32);
    for (let y = 1; y < 20; y++) for (let x = 7; x < 21; x++) if ((x + y) % 5 !== 0) mask[y * 32 + x] = 1;
    useStudioStore.setState(s => { Object.assign(s.tools, { activeTool: tool, brushSize: 3, symmetryHorizontal: mirrored }); s.selection = { x: 7, y: 1, w: 14, h: 19 }; s.selectionMask = mask; });
    const preview = document.createElement('canvas'); preview.width = preview.height = 32;
    const hook = renderHook(() => {
      const drawing = useViewportDrawing({ canvasWidth: 32, canvasHeight: 32, getOrCreateLayerCanvas: id => getOrCreateBuffer(id, 32, 32).canvas, renderComposite: () => {} });
      return useShapePointerHandler({ canvasWidth: 32, canvasHeight: 32, strokeStart: { x: 2, y: 2 }, previewCanvasRef: { current: preview }, drawPointsOnActiveLayer: drawing.drawPointsOnActiveLayer });
    });
    act(() => hook.result.current.onPointerMove(event, { x: 17, y: 14 }));
    const seen = preview.getContext('2d')!.getImageData(0, 0, 32, 32).data;
    act(() => hook.result.current.onPointerUp(event, { x: 17, y: 14 }));
    const actual = getOrCreateBuffer(useStudioStore.getState().activeLayerId, 32, 32).canvas.getContext('2d')!.getImageData(0, 0, 32, 32).data;
    expect(actual.some((v, i) => i % 4 === 3 && v > 0)).toBe(true);
    expect(seen).toEqual(actual);
    for (let i = 0; i < mask.length; i++) if (!mask[i]) expect(seen[i * 4 + 3]).toBe(0);
  });
}
