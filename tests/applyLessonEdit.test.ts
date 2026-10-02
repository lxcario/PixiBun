import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { applyLessonEdit } from '@/lib/art/applyLessonEdit';
import { createHistoryEngine, getGlobalHistoryEngine, setGlobalHistoryEngine } from '@/lib/engine/historyEngine';
import { useStudioStore } from '@/stores/studioStore';
import type { PixelHistoryStep } from '@/types/canvas';

const mocks = vi.hoisted(() => ({ getBuffer: vi.fn(), touch: vi.fn(), broadcast: vi.fn() }));
vi.mock('@/lib/engine/bufferRegistry', () => ({
  getOrCreateBuffer: mocks.getBuffer, touchBuffer: mocks.touch,
  clearAllBuffers: vi.fn(), deleteBuffers: vi.fn(),
}));
vi.mock('@/lib/sync/coDrawBridge', () => ({ coDrawBridge: { notifyStrokeCommitted: mocks.broadcast } }));

describe('history-backed lesson edits', () => {
  let pixels: Uint8ClampedArray;
  let ctx: CanvasRenderingContext2D;
  beforeEach(() => {
    vi.clearAllMocks();
    useStudioStore.setState({
      canvasWidth: 2, canvasHeight: 2, activeFrameIndex: 0, activeLayerId: 'lesson-layer',
      frames: [{ id: 'lesson-frame', durationMs: 100, layers: [{
        id: 'lesson-layer', name: 'Art', visible: true, locked: false, opacity: 1, blendMode: 'source-over',
      }] }],
      isPlaying: false, isDirty: false, canUndo: false, canRedo: false,
    });
    pixels = new Uint8ClampedArray([1, 2, 3, 255, 0, 0, 0, 0, 4, 5, 6, 128, 9, 8, 7, 255]);
    ctx = {
      getImageData: () => ({ width: 2, height: 2, data: pixels.slice(), colorSpace: 'srgb' }),
      putImageData: (image: ImageData) => { pixels = image.data.slice(); },
      clearRect: () => { pixels.fill(0); }, save: vi.fn(), restore: vi.fn(),
    } as unknown as CanvasRenderingContext2D;
    mocks.getBuffer.mockReturnValue({ ctx });
    setGlobalHistoryEngine(createHistoryEngine());
  });
  afterEach(() => { setGlobalHistoryEngine(null); });

  it('retains exact alpha and colors through clear, undo and redo', () => {
    const original = pixels.slice();
    expect(applyLessonEdit('Clear lesson layer', context => context.clearRect(0, 0, 2, 2))).toBe(true);
    expect([...pixels]).toEqual(Array(16).fill(0));
    expect(useStudioStore.getState().isDirty).toBe(true);
    expect(useStudioStore.getState().canUndo).toBe(true);
    const history = getGlobalHistoryEngine()!;
    const cleared = { ...history.peekUndo(), imageData: ctx.getImageData(0, 0, 2, 2) } as PixelHistoryStep;
    const undone = history.undo(cleared) as PixelHistoryStep;
    ctx.putImageData(undone.imageData, 0, 0);
    expect(pixels).toEqual(original);
    const redone = history.redo(undone) as PixelHistoryStep;
    ctx.putImageData(redone.imageData, 0, 0);
    expect([...pixels]).toEqual(Array(16).fill(0));
    expect(mocks.broadcast).toHaveBeenCalledWith('lesson-layer', expect.objectContaining({ data: original }));
  });

  it.each(['locked', 'playing', 'no-history'] as const)('refuses %s without allocating or editing', reason => {
    if (reason === 'locked') useStudioStore.setState(draft => { draft.frames[0].layers[0].locked = true; });
    if (reason === 'playing') useStudioStore.setState({ isPlaying: true });
    if (reason === 'no-history') setGlobalHistoryEngine(null);
    const draw = vi.fn();
    const original = pixels.slice();
    expect(applyLessonEdit('Trace', draw)).toBe(false);
    expect(draw).not.toHaveBeenCalled();
    expect(mocks.getBuffer).not.toHaveBeenCalled();
    expect(pixels).toEqual(original);
    expect(useStudioStore.getState().isDirty).toBe(false);
  });

  it('rolls back a failed draw and preserves the existing undo/redo branch', () => {
    const history = getGlobalHistoryEngine()!;
    const prior: PixelHistoryStep = {
      type: 'pixel', description: 'Previous', layerId: 'lesson-layer', frameIndex: 0,
      imageData: ctx.getImageData(0, 0, 2, 2),
    };
    history.push(prior);
    history.undo(prior);
    const original = pixels.slice();
    expect(applyLessonEdit('Failed edit', context => {
      context.clearRect(0, 0, 2, 2);
      throw new Error('Failed');
    })).toBe(false);
    expect(pixels).toEqual(original);
    expect(history.depth).toBe(0);
    expect(history.redoDepth).toBe(1);
    expect(mocks.touch).not.toHaveBeenCalled();
    expect(ctx.restore).toHaveBeenCalled();
  });

  it('refuses a snapshot above the undo limit without destroying older history', () => {
    const history = createHistoryEngine({ maxBytes: 1024 });
    setGlobalHistoryEngine(history);
    useStudioStore.setState({ canvasWidth: 16, canvasHeight: 16 });
    pixels = new Uint8ClampedArray(16 * 16 * 4).fill(42);
    const original = pixels.slice();
    const draw = vi.fn();
    expect(applyLessonEdit('Trace', draw)).toBe(false);
    expect(draw).not.toHaveBeenCalled();
    expect(pixels).toEqual(original);
    expect(history.isTruncated).toBe(false);
  });
});
