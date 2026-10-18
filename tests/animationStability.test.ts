import { afterEach, describe, expect, it, vi } from 'vitest';
import { analyzeAnimationStability, validateStabilitySize, type StabilityInput, type ReviewFrame } from '@/lib/animation/stabilityAnalysis';
import { parseAnimationReview, restoreProtectedPixels, estimateClipBytes } from '@/lib/animation/reviewMetadata';
import { runStabilityWorker } from '@/lib/animation/scanClip';
import { planSpriteCleanup } from '@/lib/graphics/spriteCleanup';
import { createBlankProjectFile } from '@/lib/storage/db';
import { validateProjectFile } from '@/lib/project/schema';
import type { ReviewRegion } from '@/types/animation';

const frame = (points: [number, number, number?][], index = 0): ReviewFrame => {
  const data = new Uint8ClampedArray(8 * 8 * 4);
  for (const [x, y, color = 255] of points) data.set([color, 50, 100, 255], (y * 8 + x) * 4);
  return { id: `f${index}`, index, durationMs: 100, data };
};
const input = (frames: ReviewFrame[], overrides: Partial<StabilityInput> = {}): StabilityInput => ({ width: 8, height: 8, frames, regions: [], alignMotion: false, loop: false, ...overrides });
const region: ReviewRegion = { id: 'eye', name: 'Eye', kind: 'protect', x: 1, y: 1, w: 2, h: 2 };
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('artist-controlled animation review', () => {
  it('keeps identical held poses quiet without changing any source bytes', () => {
    const a = frame([[2, 2], [3, 2]]), b = { ...a, id: 'second', durationMs: 350, data: new Uint8ClampedArray(a.data) };
    const before = a.data.slice();
    const [report] = analyzeAnimationStability(input([a, b], { alignMotion: true }));
    expect(report).toMatchObject({ silhouetteChanged: 0, outlineChanged: 0, colorChanged: 0, transientPixels: 0, shiftX: 0, shiftY: 0 });
    expect(a.data).toEqual(before); expect(b.durationMs).toBe(350);
  });
  it('aligns whole-sprite integer motion while retaining canvas-fixed protection and contacts', () => {
    const a = frame([[1, 1], [2, 1], [1, 2], [2, 2]]), b = frame([[2, 1], [3, 1], [2, 2], [3, 2]], 1);
    const [report] = analyzeAnimationStability(input([a, b], { alignMotion: true, regions: [region, { ...region, id: 'foot', name: 'Foot', kind: 'contact', w: 4 }] }));
    expect(report).toMatchObject({ shiftX: 1, shiftY: 0, silhouetteChanged: 0, colorChanged: 0, protectedChanged: 2 });
    expect(report.contacts).toEqual([{ name: 'Foot', dx: 1, dy: 0 }]);
    expect(analyzeAnimationStability(input([a, b]))[0].silhouetteChanged).toBe(4);
  });
  it('detects eight-connected cluster-count changes without splitting diagonal pixels', () => {
    const [report] = analyzeAnimationStability(input([frame([[1, 1], [2, 2], [3, 3]]), frame([[1, 1], [3, 3]], 1)]));
    expect(report.clustersBefore).toBe(1); expect(report.clustersAfter).toBe(2);
  });
  it('separates RGB/alpha changes from silhouette changes and ignores transparent RGB garbage', () => {
    const a = frame([[2, 2, 100]]), b = frame([[2, 2, 160]], 1);
    a.data[0] = 220; b.data[0] = 2;
    const [report] = analyzeAnimationStability(input([a, b]));
    expect(report).toMatchObject({ colorChanged: 1, silhouetteChanged: 0, addedColors: 1, removedColors: 1 });
    expect(report.difference.slice((2 * 8 + 2) * 4, (2 * 8 + 2) * 4 + 4)).toEqual(new Uint8ClampedArray([230, 130, 255, 255]));
  });
  it('identifies a one-frame reversal and excludes an intentional region from review cues', () => {
    const frames = [frame([]), frame([[2, 2]], 1), frame([], 2)];
    expect(analyzeAnimationStability(input(frames))[0].transientPixels).toBe(1);
    const [ignored] = analyzeAnimationStability(input(frames, { regions: [{ ...region, kind: 'ignore' }] }));
    expect(ignored).toMatchObject({ transientPixels: 0, silhouetteChanged: 0, addedColors: 0 });
  });
  it('includes only requested loop seams and reports missing contact content', () => {
    const frames = [frame([[1, 1]]), frame([], 1)];
    expect(analyzeAnimationStability(input(frames))).toHaveLength(1);
    const reports = analyzeAnimationStability(input(frames, { loop: true, regions: [{ ...region, kind: 'contact' }] }));
    expect(reports).toHaveLength(2); expect(reports[1]).toMatchObject({ from: 1, to: 0 });
    expect(reports[0].contacts[0].dx).toBeNull();
  });
  it('refuses unsupported geometry and aggregate work before analysis', () => {
    expect(() => validateStabilitySize(257, 8, 2)).toThrow(/Choose a clip/);
    expect(() => validateStabilitySize(256, 256, 64)).toThrow(/million/);
    expect(() => analyzeAnimationStability(input([frame([]), { ...frame([]), data: new Uint8ClampedArray(3) }]))).toThrow(/snapshot/);
  });
  it('preserves protected cleanup pixels exactly while retaining unprotected proposals', () => {
    const source = frame([[1, 1], [6, 6]]).data;
    source[(1 * 8 + 1) * 4 + 3] = 30; source[(6 * 8 + 6) * 4 + 3] = 30;
    const options = { alphaCutoff: 96, maxSpeckPixels: 2, paletteSize: 24, simplifyColors: true, thinDarkLines: true };
    const plan = planSpriteCleanup({ width: 8, height: 8, data: source }, options, [region]);
    expect(plan.data.slice(36, 40)).toEqual(source.slice(36, 40));
    expect(plan.data[(6 * 8 + 6) * 4 + 3]).toBe(0);
    expect(plan.stats).toMatchObject({ changedPixels: 1, protectedPixels: 1 });
    const target = new Uint8ClampedArray(source.length);
    expect(restoreProtectedPixels(source, target, 8, 8, [region, region])).toBe(1);
  });
  it('round-trips bounded optional clip metadata and counts its retained history bytes', () => {
    const project = createBlankProjectFile();
    const review = { regions: [region], exceptions: [{ fromFrameId: 'old-frame', toFrameId: 'other', signature: 'a'.repeat(64) }] };
    project.clips[0].review = review;
    const admitted = validateProjectFile(project);
    expect(admitted.ok).toBe(true);
    if (admitted.ok) expect(admitted.value.clips[0].review).toEqual(review);
    expect(estimateClipBytes(project.clips[0])).toBeGreaterThan(256 + project.clips[0].name.length * 2 + 500);
    expect(parseAnimationReview({ regions: Array(33).fill(region), exceptions: [] })).toBeNull();
    expect(parseAnimationReview({ regions: [{ ...region, x: -1 }], exceptions: [] })).toBeNull();
    expect(parseAnimationReview({ regions: [], exceptions: [{ ...review.exceptions[0], signature: 'not-a-digest' }] })).toBeNull();
    project.clips[0].review = { regions: Array(33).fill(region), exceptions: [] };
    expect(validateProjectFile(project).ok).toBe(false);
  });
});

describe('animation worker lifetime', () => {
  class FakeWorker {
    onmessage: ((event: MessageEvent) => void) | null = null;
    onerror: (() => void) | null = null;
    postMessage = vi.fn(); terminate = vi.fn();
  }
  it('refuses a pre-aborted job before creating a worker or copying pixels', async () => {
    const factory = vi.fn(); vi.stubGlobal('Worker', factory);
    const abort = new AbortController(); abort.abort();
    await expect(runStabilityWorker(input([frame([]), frame([], 1)]), abort.signal)).rejects.toThrow(/cancelled/);
    expect(factory).not.toHaveBeenCalled();
  });
  it('copies the snapshot, cancels its owned worker and permits a fresh scan', async () => {
    const worker = new FakeWorker(); vi.stubGlobal('Worker', class { constructor() { return worker; } });
    const source = input([frame([[1, 1]]), frame([], 1)]), abort = new AbortController();
    const pending = runStabilityWorker(source, abort.signal);
    expect(worker.postMessage.mock.calls[0][0].frames[0].data).not.toBe(source.frames[0].data);
    await expect(runStabilityWorker(source)).rejects.toThrow(/Another animation scan/);
    abort.abort(); await expect(pending).rejects.toThrow(/cancelled/); expect(worker.terminate).toHaveBeenCalled();
    const fresh = runStabilityWorker(source);
    worker.onmessage!({ data: { transitions: [] } } as MessageEvent); await expect(fresh).resolves.toEqual([]);
  });
  it('bounds a stalled worker and releases its slot after a deadline', async () => {
    vi.useFakeTimers(); const worker = new FakeWorker(); vi.stubGlobal('Worker', class { constructor() { return worker; } });
    const pending = runStabilityWorker(input([frame([]), frame([], 1)]));
    const expected = expect(pending).rejects.toThrow(/timed out/);
    await vi.advanceTimersByTimeAsync(30_000); await expected;
    expect(worker.terminate).toHaveBeenCalled();
  });
});
