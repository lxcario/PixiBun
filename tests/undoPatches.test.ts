import { describe, expect, it } from 'vitest';
import { createHistoryEngine, DEFAULT_HISTORY_MAX_BYTES } from '@/lib/engine/historyEngine';
import { changedRect, cropImageData, isPatchStep, pastePatch, stepRect, toPatchStep } from '@/lib/engine/pixelPatch';
import { convertHistoryToRawFrames } from '@/lib/export/processReplay';
import type { PixelHistoryStep } from '@/types/canvas';

// Audit v1.14.1 defect 9: Undo stopped at 50 steps and every step kept the whole layer.

const image = (width: number, height: number, data?: Uint8ClampedArray): ImageData =>
  ({ width, height, data: data ?? new Uint8ClampedArray(width * height * 4), colorSpace: 'srgb' }) as ImageData;
const copy = (source: ImageData) => image(source.width, source.height, new Uint8ClampedArray(source.data));
const paint = (layer: ImageData, x: number, y: number, rgba: number[]) => layer.data.set(rgba, (y * layer.width + x) * 4);
const step = (before: ImageData, layerId = 'ink'): PixelHistoryStep =>
  ({ type: 'pixel', description: 'Stroke', frameIndex: 0, layerId, imageData: before });

/** What the viewport does on Undo/Redo: capture the live patch, then restore. */
function restore(layer: ImageData, target: PixelHistoryStep): PixelHistoryStep {
  const live = isPatchStep(target) ? cropImageData(layer, stepRect(target)) : copy(layer);
  pastePatch(layer, target.imageData, target.x, target.y);
  return { ...target, imageData: live, expectedImageData: target.imageData };
}

describe('dirty-rectangle undo patches', () => {
  it('finds the changed rectangle and round-trips a patch', () => {
    const before = image(8, 8), after = copy(before);
    paint(after, 2, 3, [255, 0, 0, 255]);
    paint(after, 5, 6, [0, 255, 0, 255]);
    expect(changedRect(before, after)).toEqual({ x: 2, y: 3, width: 4, height: 4 });
    expect(changedRect(before, copy(before))).toBeNull();

    const patch = toPatchStep(step(before), after);
    expect([patch.x, patch.y, patch.imageData.width, patch.imageData.height]).toEqual([2, 3, 4, 4]);
    const layer = copy(after);
    pastePatch(layer, patch.imageData, patch.x, patch.y);
    expect(Array.from(layer.data)).toEqual(Array.from(before.data));
    pastePatch(layer, patch.expectedImageData!, patch.x, patch.y);
    expect(Array.from(layer.data)).toEqual(Array.from(after.data));
  });

  it('keeps 1,000 one-pixel strokes on a 512x512 canvas undoable within 64 MiB', () => {
    const engine = createHistoryEngine();
    const layer = image(512, 512);
    const blank = copy(layer);
    for (let i = 0; i < 1000; i++) {
      const before = copy(layer);
      paint(layer, (i * 37) % 512, (i * 91) % 512, [i % 256, 40, 200, 255]);
      engine.push(toPatchStep(step(before), layer), before);
    }
    const final = copy(layer);
    expect(engine.depth).toBe(1000);
    expect(engine.isTruncated).toBe(false);
    expect(engine.totalBytes).toBeLessThan(DEFAULT_HISTORY_MAX_BYTES);
    expect(engine.totalBytes).toBeLessThan(2 * 1024 * 1024);

    for (let i = 0; i < 1000; i++) {
      const target = engine.peekUndo() as PixelHistoryStep;
      engine.undo(restore(layer, target));
    }
    expect(engine.canUndo).toBe(false);
    expect(Array.from(layer.data)).toEqual(Array.from(blank.data));

    for (let i = 0; i < 1000; i++) {
      const target = engine.peekRedo() as PixelHistoryStep;
      engine.redo(restore(layer, target));
    }
    expect(Array.from(layer.data)).toEqual(Array.from(final.data));
  }, 60_000); // 1,000 full-layer scans; slow under coverage instrumentation.

  it('remembers the whole layer once, for the first edit only', () => {
    const engine = createHistoryEngine();
    const layer = image(4, 4);
    paint(layer, 0, 0, [9, 9, 9, 255]);
    const origin = copy(layer);
    for (let i = 1; i < 4; i++) {
      const before = copy(layer);
      paint(layer, i, i, [255, 0, 0, 255]);
      engine.push(toPatchStep(step(before), layer), before);
    }
    const baseline = engine.getBaseline()!;
    expect(baseline.frames[0].layers).toHaveLength(1);
    expect(Array.from(baseline.frames[0].layers[0].imageData.data)).toEqual(Array.from(origin.data));
  });

  it('moves the replay baseline forward when patch steps are evicted', () => {
    const engine = createHistoryEngine({ maxDepth: 2 });
    const layer = image(4, 4);
    const states: ImageData[] = [];
    for (let i = 0; i < 4; i++) {
      const before = copy(layer);
      paint(layer, i, 0, [255, 0, 0, 255]);
      states.push(copy(layer));
      engine.push(toPatchStep(step(before), layer), before);
    }
    // Two steps were evicted: the baseline is the layer right after the second stroke.
    expect(engine.evictionCount).toBe(2);
    expect(Array.from(engine.getBaseline()!.frames[0].layers[0].imageData.data)).toEqual(Array.from(states[1].data));
  });

  it('rebuilds full timelapse frames from patches', () => {
    const engine = createHistoryEngine();
    const layer = image(4, 4);
    const befores: ImageData[] = [];
    for (let i = 0; i < 3; i++) {
      const before = copy(layer);
      befores.push(before);
      paint(layer, i, i, [0, 0, 255, 255]);
      engine.push(toPatchStep(step(before), layer), before);
    }
    const frames = convertHistoryToRawFrames(engine.getHistory(), 1, {
      baseline: engine.getBaseline(),
      finalFrame: { width: 4, height: 4, data: new Uint8ClampedArray(layer.data) },
    });
    // Baseline, the state before each of the three strokes, then the finished art.
    expect(frames).toHaveLength(5);
    befores.forEach((before, i) => expect(Array.from(frames[i + 1].data)).toEqual(Array.from(before.data)));
    expect(Array.from(frames[4].data)).toEqual(Array.from(layer.data));
  });
});
