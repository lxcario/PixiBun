// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMotionRenderer, type MotionRenderRequest } from '@/lib/animation/motionRenderer';
import { bakeMotionToTimelineAsync, captureMotionPart } from '@/lib/animation/pixiMotion';
import { getMemoryBudgetUsage } from '@/lib/safety/memoryBudget';
import { useStudioStore } from '@/stores/studioStore';
import * as registry from '@/lib/engine/bufferRegistry';
import { createHistoryEngine, getGlobalHistoryEngine, setGlobalHistoryEngine } from '@/lib/engine/historyEngine';
import { makeCanvas } from './helpers/mockCanvas';

class WorkerFixture {
  static instances: WorkerFixture[] = [];
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onerror: (() => void) | null = null;
  onmessageerror: (() => void) | null = null;
  requests: MotionRenderRequest[] = [];
  terminated = false;
  constructor() { WorkerFixture.instances.push(this); }
  postMessage(request: MotionRenderRequest) { this.requests.push(request); }
  terminate() { this.terminated = true; }
  respond(index = 0) {
    const r = this.requests[index];
    // Independent identity raster with translated integer placement, never canvas-sized.
    this.onmessage?.({ data: { id: r.id, result: { width: r.raster.width, height: r.raster.height,
      destX: r.bounds.x + r.pose.translationX, destY: r.bounds.y + r.pose.translationY, data: r.raster.data.slice() } } });
  }
}
beforeEach(() => {
  const contexts = new WeakMap<HTMLCanvasElement, CanvasRenderingContext2D>();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function(this: HTMLCanvasElement) {
    let context = contexts.get(this); if (!context) { context = makeCanvas(this.width || 32, this.height || 32).getContext('2d')!; contexts.set(this, context); } return context;
  });
  registry.clearAllBuffers(); setGlobalHistoryEngine(null); useStudioStore.getState().resetToNewProject('renderer');
  setGlobalHistoryEngine(createHistoryEngine()); WorkerFixture.instances = [];
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); registry.clearAllBuffers(); setGlobalHistoryEngine(null); });
function capture() {
  const state = useStudioStore.getState(), entry = registry.getOrCreateBuffer(state.activeLayerId, 32, 32);
  const image = new ImageData(32, 32); image.data.set([230, 60, 80, 255], (5 * 32 + 5) * 4); entry.ctx.putImageData(image, 0, 0); registry.touchBuffer(state.activeLayerId);
  const part = captureMotionPart({ canvasWidth: 32, canvasHeight: 32, activeFrameIndex: 0, activeLayerId: state.activeLayerId, frames: state.frames,
    selection: { x: 4, y: 4, w: 4, h: 4 }, selectionMask: null, layerCanvas: entry.canvas })!;
  useStudioStore.getState().setMotionPart(part); return part;
}
const factory = () => new WorkerFixture() as unknown as Worker;
const pose = (translationX: number) => ({ translationX, translationY: 0, rotation: 0 });
describe('dedicated motion renderer ownership', () => {
  it('coalesces queued previews, copies transfer input and never interrupts an unrelated worker', async () => {
    const part = capture(), source = part.raster.data.slice(), before = getMemoryBudgetUsage().reservedBytes;
    const unrelated = new WorkerFixture(), renderer = createMotionRenderer(factory);
    const first = renderer.render(part, pose(1), 32, 32);
    const discarded = renderer.render(part, pose(2), 32, 32).catch(error => error);
    const latest = renderer.render(part, pose(3), 32, 32), worker = WorkerFixture.instances[1];
    expect((await discarded).name).toBe('AbortError'); expect(worker.requests).toHaveLength(1);
    expect(worker.requests[0].raster.data).not.toBe(part.raster.data);
    worker.respond(); const firstImage = await first;
    expect(firstImage).toMatchObject({ width: 4, height: 4, destX: 5, destY: 4 });
    expect(firstImage.data[(1 * 4 + 1) * 4 + 3]).toBe(255);
    expect(worker.requests).toHaveLength(2); expect(worker.requests[1].pose.translationX).toBe(3);
    worker.respond(1); expect(await latest).toMatchObject({ width: 4, height: 4, destX: 7, destY: 4 });
    renderer.dispose(); expect(worker.terminated).toBe(true); expect(unrelated.terminated).toBe(false);
    expect(part.raster.data).toEqual(source); expect(getMemoryBudgetUsage().reservedBytes).toBe(before);
  });
  it('releases active and queued work on cancellation, and ignores late responses', async () => {
    const part = capture(), before = getMemoryBudgetUsage().reservedBytes, renderer = createMotionRenderer(factory);
    const active = renderer.render(part, pose(1), 32, 32).catch(e => e), queued = renderer.render(part, pose(2), 32, 32).catch(e => e);
    renderer.dispose(); WorkerFixture.instances[0].respond();
    expect((await active).name).toBe('AbortError'); expect((await queued).name).toBe('AbortError');
    expect(getMemoryBudgetUsage().reservedBytes).toBe(before);
    await expect(renderer.render(part, pose(3), 32, 32)).rejects.toMatchObject({ name: 'AbortError' });
  });
  it('times out a hung worker and releases its reservation', async () => {
    vi.useFakeTimers(); const part = capture(), before = getMemoryBudgetUsage().reservedBytes, renderer = createMotionRenderer(factory, 100);
    const pending = renderer.render(part, pose(1), 32, 32).catch(e => e); await vi.advanceTimersByTimeAsync(100);
    expect((await pending).message).toMatch(/timed out/); expect(WorkerFixture.instances[0].terminated).toBe(true);
    expect(getMemoryBudgetUsage().reservedBytes).toBe(before); renderer.dispose();
  });
  it('rejects malformed output and refuses an unbounded synchronous fallback', async () => {
    const part = capture(), before = getMemoryBudgetUsage().reservedBytes, renderer = createMotionRenderer(factory);
    const pending = renderer.render(part, pose(1), 32, 32);
    WorkerFixture.instances[0].onmessage?.({ data: { id: 1, result: { width: 1, height: 1, data: new Uint8ClampedArray(4) } } });
    await expect(pending).rejects.toThrow(/Invalid/); renderer.dispose();
    const fallback = createMotionRenderer(() => null);
    await expect(fallback.render({ ...part, bounds: { x: 0, y: 0, w: 129, h: 129 }, raster: new ImageData(129, 129) }, pose(1), 256, 256)).rejects.toThrow(/Web Worker/);
    fallback.dispose(); expect(getMemoryBudgetUsage().reservedBytes).toBe(before);
  });
  it('a source change during async bake cancels without publishing partial frames or history', async () => {
    vi.stubGlobal('Worker', WorkerFixture); const part = capture(), frames = useStudioStore.getState().frames;
    const before = getMemoryBudgetUsage().reservedBytes, depth = getGlobalHistoryEngine()!.depth;
    const pending = bakeMotionToTimelineAsync(part); expect(WorkerFixture.instances).toHaveLength(1);
    registry.touchBuffer(part.sourceLayerId); useStudioStore.getState().bumpBufferVersion();
    expect((await pending).ok).toBe(false); expect(useStudioStore.getState().frames).toBe(frames);
    expect(getGlobalHistoryEngine()!.depth).toBe(depth); expect(WorkerFixture.instances[0].terminated).toBe(true);
    expect(getMemoryBudgetUsage().reservedBytes).toBe(before);
  });
  it('rejects a correctly sized worker raster placed at the wrong destination', async () => {
    const part = capture(), before = getMemoryBudgetUsage().reservedBytes, renderer = createMotionRenderer(factory);
    const pending = renderer.render(part, pose(1), 32, 32);
    WorkerFixture.instances[0].onmessage?.({ data: { id: 1, result: { width: 4, height: 4,
      destX: 6, destY: 4, data: part.raster.data.slice() } } });
    await expect(pending).rejects.toThrow(/Invalid/); renderer.dispose();
    expect(getMemoryBudgetUsage().reservedBytes).toBe(before);
  });
  it('admits small selections on large canvases by selection scratch, and rejects invalid coordinates before allocation', async () => {
    const part = capture(), before = getMemoryBudgetUsage().reservedBytes, renderer = createMotionRenderer(factory);
    const pending = renderer.render(part, pose(1), 2048, 2048);
    expect(getMemoryBudgetUsage().reservedBytes - before).toBeLessThan(10000);
    WorkerFixture.instances[0].respond(); await pending;
    await expect(renderer.render(part, { ...pose(1), rotation: NaN }, 32, 32)).rejects.toThrow(/Invalid/);
    await expect(renderer.render({ ...part, bounds: { ...part.bounds, x: -1 } }, pose(1), 32, 32)).rejects.toThrow(/Invalid/);
    renderer.dispose(); expect(getMemoryBudgetUsage().reservedBytes).toBe(before);
  });
  it('uses the bounded real fallback with fractional pivots and releases its scratch', async () => {
    const part = capture(), before = getMemoryBudgetUsage().reservedBytes, renderer = createMotionRenderer(() => null);
    const result = await renderer.render({ ...part, pivot: { x: 5.3, y: 5.7 } }, pose(-5), 32, 32);
    expect(result).toMatchObject({ width: 4, height: 4, destX: -1, destY: 4 });
    expect(result.data).toEqual(part.raster.data);
    renderer.dispose(); expect(getMemoryBudgetUsage().reservedBytes).toBe(before);
  });
  it('async bake publishes independently positioned cels as one history step and releases all staging', async () => {
    vi.stubGlobal('Worker', WorkerFixture); capture(); useStudioStore.getState().updateMotionPart({ frameCount: 3, easing: 'linear' });
    useStudioStore.getState().updateMotionPose('end', { translationX: 4 }); const part = useStudioStore.getState().motionPart!;
    const before = getMemoryBudgetUsage().reservedBytes, depth = getGlobalHistoryEngine()!.depth;
    const pending = bakeMotionToTimelineAsync(part), worker = WorkerFixture.instances[0];
    // Autosave completion and view-only changes do not alter the bake's inputs.
    useStudioStore.getState().markClean(); useStudioStore.getState().setZoom(200);
    for (let i = 0; i < 3; i++) { worker.respond(i); await Promise.resolve(); }
    expect(await pending).toMatchObject({ ok: true, addedFrameCount: 2 });
    const state = useStudioStore.getState(); expect(state.motionPart).toBeNull(); expect(state.frames).toHaveLength(3);
    for (let i = 0; i < 3; i++) {
      const image = registry.snapshotBuffers().get(state.frames[i].layers[0].id)!.ctx.getImageData(0, 0, 32, 32);
      const expected = new Uint8ClampedArray(32 * 32 * 4); expected.set([230, 60, 80, 255], (5 * 32 + 5 + i * 2) * 4);
      expect(image.data).toEqual(expected);
    }
    expect(getGlobalHistoryEngine()!.depth).toBe(depth + 1); expect(getMemoryBudgetUsage().reservedBytes).toBe(before);
  });
});
