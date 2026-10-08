// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { useStudioStore } from '@/stores/studioStore';
import { useViewportDrawing } from '@/hooks/viewport/useViewportDrawing';
import { makeCanvas } from './helpers/mockCanvas';
import * as registry from '@/lib/engine/bufferRegistry';
import { getGlobalHistoryEngine, setGlobalHistoryEngine } from '@/lib/engine/historyEngine';
import { captureMotionPart } from '@/lib/animation/pixiMotion';
import { PixiMotionPanel } from '@/components/layout/inspector/PixiMotionPanel';
import { MOTION_EDIT_LIMITS } from '@/lib/animation/motionEditing';

let drawing: ReturnType<typeof useViewportDrawing>;
beforeEach(() => {
  const contexts = new WeakMap<HTMLCanvasElement, CanvasRenderingContext2D>();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function(this: HTMLCanvasElement) {
    let ctx = contexts.get(this); if (!ctx) { ctx = makeCanvas(this.width || 32, this.height || 32).getContext('2d')!; contexts.set(this, ctx); } return ctx;
  });
  registry.clearAllBuffers(); setGlobalHistoryEngine(null); useStudioStore.getState().resetToNewProject('editing');
  drawing = renderHook(() => useViewportDrawing({ canvasWidth: 32, canvasHeight: 32,
    getOrCreateLayerCanvas: id => registry.getOrCreateBuffer(id, 32, 32).canvas, renderComposite: vi.fn() })).result.current;
  const state = useStudioStore.getState(), entry = registry.getOrCreateBuffer(state.activeLayerId, 32, 32);
  const source = new ImageData(32, 32); source.data.set([230, 60, 80, 255], (5 * 32 + 5) * 4); entry.ctx.putImageData(source, 0, 0); registry.touchBuffer(state.activeLayerId);
  const part = captureMotionPart({ canvasWidth: 32, canvasHeight: 32, activeFrameIndex: 0, activeLayerId: state.activeLayerId,
    frames: state.frames, selection: { x: 4, y: 4, w: 4, h: 4 }, selectionMask: null, layerCanvas: entry.canvas })!;
  useStudioStore.getState().setMotionPart(part);
});
afterEach(() => { cleanup(); vi.useRealTimers(); registry.clearAllBuffers(); setGlobalHistoryEngine(null); vi.restoreAllMocks(); });
const state = () => useStudioStore.getState();
describe('temporary motion edit history', () => {
  it('groups a drag into one metadata step and routes owning-hook Undo without touching artwork', () => {
    const raster = state().motionPart!.raster, source = registry.snapshotBuffers().get(state().activeLayerId)!;
    const before = source.ctx.getImageData(0, 0, 32, 32).data.slice(), revision = source.contentRevision;
    act(() => { state().beginMotionEdit(); for(let x = 1; x <= 10; x++) state().updateMotionPose('end', { translationX: x }); state().finishMotionEdit(); });
    expect(state().motionHistory!.past).toHaveLength(1);
    act(() => drawing.performUndo()); expect(state().motionPart!.endPose.translationX).toBe(0);
    act(() => drawing.performRedo()); expect(state().motionPart!.endPose.translationX).toBe(10);
    expect(state().motionPart!.raster).toBe(raster); expect(source.contentRevision).toBe(revision);
    expect(source.ctx.getImageData(0, 0, 32, 32).data).toEqual(before); expect(getGlobalHistoryEngine()!.depth).toBe(0);
  });
  it('cancelled/no-op gestures retain redo; changed edits branch it', () => {
    state().updateMotionPose('end', { translationX: 4 }); state().undoMotionEdit();
    state().beginMotionEdit(); state().updateMotionPart({ pivot: { x: 3.5, y: 7.5 } }); state().finishMotionEdit(true);
    expect(state().motionPart!.pivot).toEqual({ x: 6, y: 6 }); expect(state().motionHistory!.future).toHaveLength(1);
    state().beginMotionEdit(); state().updateMotionPose('end', { translationX: 0 }); state().finishMotionEdit();
    expect(state().motionHistory!.past).toHaveLength(0); expect(state().motionHistory!.future).toHaveLength(1);
    state().updateMotionPart({ frameCount: 30 }); expect(state().motionHistory!.future).toHaveLength(0);
  });
  it('restores pose target, fractional pivot, timing and easing with bounded stacks', () => {
    state().setMotionActivePose('start'); state().updateMotionPose('start', { rotation: Math.PI / 2 });
    state().updateMotionPart({ pivot: { x: 5.5, y: 4.5 }, frameCount: 30, easing: 'linear' });
    state().setMotionActivePose('end'); expect(state().undoMotionEdit()).toBe(true);
    expect(state().motionActivePose).toBe('start'); expect(state().motionPart!.frameCount).toBe(5);
    expect(state().redoMotionEdit()).toBe(true); expect(state().motionPart!.pivot).toEqual({ x: 5.5, y: 4.5 });
    for(let x = 0; x < 75; x++) state().updateMotionPose('start', { translationX: x });
    expect(state().motionHistory!.past).toHaveLength(MOTION_EDIT_LIMITS.historyDepth);
    for(let x = 0; x < 75; x++) state().undoMotionEdit();
    expect(state().motionHistory!.future).toHaveLength(MOTION_EDIT_LIMITS.historyDepth);
  });
  it('refuses malformed edits, stale source replay and same-project session replacement', () => {
    const part = state().motionPart!;
    for(const frameCount of [NaN, 1, 31, 2.5]) state().updateMotionPart({ frameCount });
    state().updateMotionPose('end', { translationX: Infinity }); expect(state().motionPart).toBe(part);
    state().beginMotionEdit(); state().updateMotionPose('end', { translationX: 8 }); registry.touchBuffer(part.sourceLayerId);
    state().finishMotionEdit(true); expect(state().motionPart!.endPose.translationX).toBe(8); expect(state().undoMotionEdit()).toBe(false);
    state().resetToNewProject('editing'); expect(state().motionHistory).toBeNull(); expect(state().motionPart).toBeNull();
  });
  it('an empty motion history cannot consume an existing drawing Undo', () => {
    const layerId = state().activeLayerId;
    getGlobalHistoryEngine()!.push({ type: 'pixel', layerId, frameIndex: 0, imageData: new ImageData(32, 32), description: 'Authored mark' });
    act(() => drawing.performUndo()); expect(getGlobalHistoryEngine()!.depth).toBe(1);
    act(() => { state().clearMotionPart(); drawing.performUndo(); }); expect(getGlobalHistoryEngine()!.depth).toBe(0);
  });
});
describe('precise motion controls', () => {
  it('preview follows the source cel duration instead of a different project FPS', async () => {
    vi.useFakeTimers(); act(() => useStudioStore.setState(s => { s.frames[0].durationMs = 200; s.fps = 60; }));
    render(<PixiMotionPanel />); fireEvent.click(screen.getByRole('button', { name: 'Play Loop' }));
    await act(async () => { await vi.advanceTimersByTimeAsync(220); });
    expect(state().motionPreviewIndex).toBe(1);
    await act(async () => { await vi.advanceTimersByTimeAsync(200); });
    expect(state().motionPreviewIndex).toBe(2);
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
  });
  it('accepts 30 poses, commits numeric fields once, and resets/undoes the active pose', () => {
    render(<PixiMotionPanel />);
    expect(screen.getByRole('slider', { name: 'Motion frame count' }).getAttribute('max')).toBe('30');
    const x = screen.getByRole('spinbutton', { name: 'Position X pixels' });
    fireEvent.change(x, { target: { value: '12' } }); fireEvent.keyDown(x, { key: 'Enter' }); fireEvent.blur(x);
    expect(state().motionPart!.endPose.translationX).toBe(12); expect(state().motionHistory!.past).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Reset Pose' })); expect(state().motionPart!.endPose.translationX).toBe(0);
    fireEvent.click(screen.getByRole('button', { name: 'Undo motion edit' })); expect(state().motionPart!.endPose.translationX).toBe(12);
    const frames = screen.getByRole('spinbutton', { name: 'Motion frames' }); fireEvent.change(frames, { target: { value: '30' } }); fireEvent.blur(frames);
    expect(state().motionPart!.frameCount).toBe(30);
  });
  it('coalesces native range pointer edits and rolls back a cancelled range', () => {
    render(<PixiMotionPanel />); const slider = screen.getByRole('slider', { name: 'Pose translation X' });
    fireEvent.pointerDown(slider); for(const value of ['1', '2', '9']) fireEvent.change(slider, { target: { value } }); fireEvent.pointerUp(slider);
    expect(state().motionHistory!.past).toHaveLength(1);
    fireEvent.pointerDown(slider); fireEvent.change(slider, { target: { value: '15' } }); fireEvent.pointerCancel(slider);
    expect(state().motionPart!.endPose.translationX).toBe(9); expect(state().motionHistory!.past).toHaveLength(1);
  });
});
