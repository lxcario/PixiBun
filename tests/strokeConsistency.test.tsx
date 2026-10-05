// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { PointerEvent } from 'react';
import { useBrushPointerHandler } from '@/hooks/viewport/useBrushPointerHandler';
import { useViewportDrawing } from '@/hooks/viewport/useViewportDrawing';
import { useStudioStore } from '@/stores/studioStore';
import { clearAllBuffers, getOrCreateBuffer } from '@/lib/engine/bufferRegistry';
import { setGlobalHistoryEngine } from '@/lib/engine/historyEngine';
import { shouldDitherPixel } from '@/lib/canvas/ditherMatrix';
import { getBresenhamLine, filterPixelPerfect, type Point } from '@/lib/canvas/rasterMath';
import { makeCanvas } from './helpers/mockCanvas';

beforeEach(() => {
  const contexts = new WeakMap<HTMLCanvasElement, CanvasRenderingContext2D>();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
    let ctx = contexts.get(this);
    if (!ctx) {
      const backing = makeCanvas(this.width || 32, this.height || 32);
      ctx = backing.getContext('2d')!; contexts.set(this, ctx);
      Object.defineProperty(this, '_imageData', { configurable: true, get: () => backing._imageData });
    }
    return ctx;
  });
  clearAllBuffers(); setGlobalHistoryEngine(null);
  useStudioStore.getState().resetToNewProject('stroke-project');
  useStudioStore.setState({ primaryColor: '#ff0000', secondaryColor: '#0000ff' });
  useStudioStore.setState(state => { Object.assign(state.tools, { activeTool: 'pen', brushSize: 1, pixelPerfect: true, symmetryHorizontal: false, symmetryVertical: false, symmetryGroup: 'none', ditherMatrix: '2x2', ditherDensity: 0.5 }); });
});
afterEach(() => { cleanup(); clearAllBuffers(); setGlobalHistoryEngine(null); vi.restoreAllMocks(); });
const canvas = (id: string) => getOrCreateBuffer(id, 32, 32).canvas;
const event = (shiftKey = false) => ({ shiftKey, type: 'pointermove' }) as PointerEvent;
function setup() {
  const renderComposite = vi.fn();
  return renderHook(() => {
    const drawing = useViewportDrawing({ canvasWidth: 32, canvasHeight: 32, getOrCreateLayerCanvas: canvas, renderComposite });
    return { drawing, brush: useBrushPointerHandler(drawing), renderComposite };
  });
}
const pixels = () => canvas(useStudioStore.getState().activeLayerId).getContext('2d')!.getImageData(0, 0, 32, 32).data;
const rgba = (x: number, y: number) => Array.from(pixels().slice((y * 32 + x) * 4, (y * 32 + x) * 4 + 4));
function stroke(hook: ReturnType<typeof setup>, path: Point[], shift = false) {
  act(() => {
    hook.result.current.drawing.captureSnapshot();
    hook.result.current.brush.onPointerDown(event(shift), path[0]);
    for (const point of path.slice(1)) hook.result.current.brush.onPointerMove(event(shift), point);
    hook.result.current.brush.onPointerUp(event(shift), path.at(-1)!);
    hook.result.current.drawing.commitSnapshot();
  });
}

it.each(['pen', 'eraser'] as const)('corrects a %s corner across events, preserving underlying pixels and history', tool => {
  useStudioStore.getState().setActiveTool(tool);
  const ctx = canvas(useStudioStore.getState().activeLayerId).getContext('2d')!;
  ctx.fillStyle = '#00ff0080'; ctx.fillRect(3, 2, 1, 1);
  if (tool === 'eraser') { ctx.fillStyle = '#ff0000'; ctx.fillRect(2, 2, 1, 1); ctx.fillRect(3, 3, 1, 1); }
  const before = new Uint8ClampedArray(pixels());
  const hook = setup(); stroke(hook, [{ x: 2, y: 2 }, { x: 3, y: 2 }, { x: 3, y: 3 }]);
  expect(rgba(3, 2)).toEqual([0, 255, 0, 128]);
  expect(rgba(2, 2)[3]).toBe(tool === 'pen' ? 255 : 0);
  const after = new Uint8ClampedArray(pixels());
  act(() => hook.result.current.drawing.performUndo()); expect(pixels()).toEqual(before);
  act(() => hook.result.current.drawing.performRedo()); expect(pixels()).toEqual(after);
});

it('matches the whole-path filter through alternating corners without retaining the whole stroke', () => {
  const path = [{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 2 }, { x: 3, y: 3 }, { x: 4, y: 3 }, { x: 5, y: 3 }];
  const hook = setup(); stroke(hook, path);
  const expected = filterPixelPerfect(path);
  for (const point of path) expect(rgba(point.x, point.y)[3]).toBe(expected.some(p => p.x === point.x && p.y === point.y) ? 255 : 0);
});

it('renders a long pixel-perfect segment once, with identical coarse and fine raster samples', () => {
  const hook = setup(), path = getBresenhamLine(2, 2, 25, 14);
  act(() => { hook.result.current.brush.onPointerDown(event(), path[0]); });
  hook.result.current.renderComposite.mockClear();
  act(() => { hook.result.current.brush.onPointerMove(event(), path.at(-1)!); });
  expect(hook.result.current.renderComposite).toHaveBeenCalledTimes(1);
  const coarse = new Uint8ClampedArray(pixels());
  canvas(useStudioStore.getState().activeLayerId).getContext('2d')!.clearRect(0, 0, 32, 32);
  stroke(hook, path); expect(pixels()).toEqual(coarse);
});

it.each([10, 14])('restores mirrored brush footprints at x=%i without removing earlier stamps', x => {
  useStudioStore.setState(state => { state.tools.brushSize = 3; state.tools.symmetryHorizontal = true; });
  const ctx = canvas(useStudioStore.getState().activeLayerId).getContext('2d')!;
  ctx.fillStyle = '#0000ff80'; ctx.fillRect(0, 0, 32, 32);
  const hook = setup(); stroke(hook, [{ x, y: 10 }, { x: x + 1, y: 10 }, { x: x + 1, y: 11 }]);
  expect(rgba(x + 2, 9)).toEqual(x === 10 ? [0, 0, 255, 128] : [255, 0, 0, 255]);
  expect(rgba(x + 1, 11)).toEqual([255, 0, 0, 255]);
});

it('leaves locked artwork untouched and starts each stroke with fresh trailing state', () => {
  useStudioStore.setState(state => { state.frames[0].layers[0].locked = true; });
  const hook = setup(); stroke(hook, [{ x: 2, y: 2 }, { x: 3, y: 2 }, { x: 3, y: 3 }]);
  expect(pixels().every(value => value === 0)).toBe(true);
  act(() => useStudioStore.setState(state => { state.frames[0].layers[0].locked = false; }));
  stroke(hook, [{ x: 3, y: 2 }], true); expect(rgba(3, 2)).toEqual([0, 0, 255, 255]);
});

it('includes a new release coordinate but does not extend a cancelled stroke', () => {
  const hook = setup();
  act(() => { hook.result.current.brush.onPointerDown(event(), { x: 2, y: 2 }); hook.result.current.brush.onPointerUp(event(), { x: 5, y: 2 }); });
  expect(rgba(4, 2)[3]).toBe(255);
  act(() => { hook.result.current.brush.onPointerDown(event(), { x: 2, y: 4 }); hook.result.current.brush.onPointerUp({ ...event(), type: 'pointercancel' } as PointerEvent, { x: 5, y: 4 }); });
  expect(rgba(5, 4)[3]).toBe(0);
});

it('keeps deliberately doubled corners when clean corners is disabled', () => {
  useStudioStore.getState().setPixelPerfect(false);
  const hook = setup(); stroke(hook, [{ x: 2, y: 2 }, { x: 3, y: 2 }, { x: 3, y: 3 }]);
  expect(rgba(3, 2)).toEqual([255, 0, 0, 255]);
});

it.each(['2x2', '4x4', '8x8'] as const)('dither %s gives identical coarse and fine horizontal paths with exact anchored pixels', matrix => {
  useStudioStore.getState().setActiveTool('dither'); useStudioStore.getState().setDitherMatrix(matrix);
  const hook = setup(); stroke(hook, [{ x: 0, y: 4 }, { x: 20, y: 4 }]);
  const coarse = new Uint8ClampedArray(pixels());
  for (let x = 0; x <= 20; x++) expect(rgba(x, 4)[3]).toBe(shouldDitherPixel(x, 4, matrix, 0.5) ? 255 : 0);
  act(() => hook.result.current.drawing.performUndo());
  stroke(hook, getBresenhamLine(0, 4, 20, 4)); expect(pixels()).toEqual(coarse);
  act(() => hook.result.current.drawing.performUndo()); expect(pixels().every(value => value === 0)).toBe(true);
  act(() => hook.result.current.drawing.performRedo()); expect(pixels()).toEqual(coarse);
});

it.each(['2x2', '4x4', '8x8'] as const)('dither %s interpolates diagonal paths with secondary-color stamps', matrix => {
  useStudioStore.getState().setActiveTool('dither'); useStudioStore.getState().setDitherMatrix(matrix);
  const path = getBresenhamLine(2, 3, 20, 21), hook = setup();
  stroke(hook, [path[0], path.at(-1)!], true);
  const coarse = new Uint8ClampedArray(pixels());
  for (const point of path) expect(rgba(point.x, point.y)).toEqual(shouldDitherPixel(point.x, point.y, matrix, 0.5) ? [0, 0, 255, 255] : [0, 0, 0, 0]);
  act(() => hook.result.current.drawing.performUndo());
  stroke(hook, path, true); expect(pixels()).toEqual(coarse);
});
