import { describe, it, expect } from 'vitest';
import {
  createHistoryEngine,
  HistoryEngine,
  PixelHistoryStep,
} from '@/lib/engine/historyEngine';
import {
  convertHistoryToRawFrames,
  reconstructProcessReplayFrames,
} from '@/lib/export/processReplay';

function createSolidImageData(
  width: number,
  height: number,
  r: number,
  g: number,
  b: number,
  a: number = 255
): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
    data[i + 3] = a;
  }
  return {
    width,
    height,
    data,
    colorSpace: 'srgb',
  } as ImageData;
}

function createPatternImageData(
  width: number,
  height: number,
  x: number,
  y: number,
  r: number,
  g: number,
  b: number,
  a: number = 255
): ImageData {
  const data = new Uint8ClampedArray(width * height * 4); // all transparent (0, 0, 0, 0)
  const idx = (y * width + x) * 4;
  data[idx] = r;
  data[idx + 1] = g;
  data[idx + 2] = b;
  data[idx + 3] = a;
  return {
    width,
    height,
    data,
    colorSpace: 'srgb',
  } as ImageData;
}

describe('Process Replay Adversarial Multi-Layer / Multi-Frame Eviction (Item 1)', () => {
  it('reconstructs complete multi-layer project state at the truncation boundary after eviction and continues correctly', () => {
    // 1. Setup History Engine with a bounded depth of 3 entries to trigger eviction
    const engine: HistoryEngine = createHistoryEngine({ maxDepth: 3, maxBytes: 1024 * 1024 });

    const W = 4;
    const H = 4;

    // We have a 2-frame, 2-layer project:
    // Frame 0:
    //   - layer-bg (Layer 1): Solid Blue [0, 0, 255, 255]
    //   - layer-fg (Layer 2): Yellow pixel at (0, 0) [255, 255, 0, 255]
    // Frame 1:
    //   - layer-bg (Layer 1): Solid Green [0, 255, 0, 255]
    //   - layer-fg (Layer 2): Magenta pixel at (0, 0) [255, 0, 255, 255]

    // Step 1: Draw on Frame 0, layer-bg (Blue)
    const step1: PixelHistoryStep = {
      type: 'pixel',
      description: 'Draw Frame 0 Background (Blue)',
      frameIndex: 0,
      layerId: 'layer-bg',
      layerName: 'Background',
      imageData: createSolidImageData(W, H, 0, 0, 255),
    };
    engine.push(step1);

    // Step 2: Draw on Frame 0, layer-fg (Yellow dot)
    const step2: PixelHistoryStep = {
      type: 'pixel',
      description: 'Draw Frame 0 Foreground (Yellow dot)',
      frameIndex: 0,
      layerId: 'layer-fg',
      layerName: 'Foreground',
      imageData: createPatternImageData(W, H, 0, 0, 255, 255, 0),
    };
    engine.push(step2);

    // Step 3: Draw on Frame 1, layer-bg (Green)
    const step3: PixelHistoryStep = {
      type: 'pixel',
      description: 'Draw Frame 1 Background (Green)',
      frameIndex: 1,
      layerId: 'layer-bg',
      layerName: 'Background',
      imageData: createSolidImageData(W, H, 0, 255, 0),
    };
    engine.push(step3);

    expect(engine.depth).toBe(3);
    expect(engine.isTruncated).toBe(false);

    // Step 4: Draw on Frame 1, layer-fg (Magenta dot at 0, 0).
    // This forces EVICTION of step 1 (Frame 0 background)!
    const step4: PixelHistoryStep = {
      type: 'pixel',
      description: 'Draw Frame 1 Foreground (Magenta dot)',
      frameIndex: 1,
      layerId: 'layer-fg',
      layerName: 'Foreground',
      imageData: createPatternImageData(W, H, 0, 0, 255, 0, 255),
    };
    engine.push(step4);

    expect(engine.depth).toBe(3);
    expect(engine.isTruncated).toBe(true);
    expect(engine.evictionCount).toBe(1);

    // Step 5: Draw another stroke on Frame 1, layer-fg (White dot at 1, 1).
    // This forces EVICTION of step 2 (Frame 0 foreground)!
    const step5: PixelHistoryStep = {
      type: 'pixel',
      description: 'Draw Frame 1 Foreground (White dot at 1,1)',
      frameIndex: 1,
      layerId: 'layer-fg',
      layerName: 'Foreground',
      imageData: createPatternImageData(W, H, 1, 1, 255, 255, 255),
    };
    engine.push(step5);

    // Step 6: Draw another stroke on Frame 1, layer-fg (Red dot at 2, 2).
    // This forces EVICTION of step 3 (Frame 1 background)!
    const step6: PixelHistoryStep = {
      type: 'pixel',
      description: 'Draw Frame 1 Foreground (Red dot at 2,2)',
      frameIndex: 1,
      layerId: 'layer-fg',
      layerName: 'Foreground',
      imageData: createPatternImageData(W, H, 2, 2, 255, 0, 0),
    };
    engine.push(step6);

    expect(engine.evictionCount).toBe(3);
    expect(engine.depth).toBe(3);

    // At this point:
    // Retained history in engine ONLY contains steps 4, 5, 6 (all on layer-fg!).
    // Zero steps on layer-bg remain in the retained history stack!
    // The earliest retained entry is step 4 (not an initial blank/clean canvas state).
    const retainedHistory = engine.getHistory();
    expect(retainedHistory).toHaveLength(3);
    expect(retainedHistory[0].description).toBe('Draw Frame 1 Foreground (Magenta dot)');

    // 2. Audit the baseline checkpoint tracked during eviction
    const baseline = engine.getBaseline();
    expect(baseline).not.toBeNull();
    expect(baseline!.width).toBe(W);
    expect(baseline!.height).toBe(H);
    // Baseline must contain the evicted state for BOTH frames and their respective layers!
    expect(baseline!.frames.length).toBeGreaterThanOrEqual(2);

    // Frame 0 baseline checks
    const f0 = baseline!.frames.find((f) => f.frameIndex === 0);
    expect(f0).toBeDefined();
    const f0Bg = f0!.layers.find((l) => l.layerId === 'layer-bg');
    expect(f0Bg).toBeDefined();
    // Blue background at (0, 0)
    expect(f0Bg!.imageData.data[0]).toBe(0);
    expect(f0Bg!.imageData.data[1]).toBe(0);
    expect(f0Bg!.imageData.data[2]).toBe(255);

    // Frame 1 baseline checks
    const f1 = baseline!.frames.find((f) => f.frameIndex === 1);
    expect(f1).toBeDefined();
    const f1Bg = f1!.layers.find((l) => l.layerId === 'layer-bg');
    expect(f1Bg).toBeDefined();
    // Green background at (0, 0)
    expect(f1Bg!.imageData.data[0]).toBe(0);
    expect(f1Bg!.imageData.data[1]).toBe(255);
    expect(f1Bg!.imageData.data[2]).toBe(0);

    // 3. Reconstruct Process Replay from the retained boundary
    baseline!.activeFrameIndex = 1; // Inspect Frame 1's speedpaint progression
    const replayFrames = reconstructProcessReplayFrames(retainedHistory, baseline, 1);

    // Expected emitted frames:
    // Frame 0: Baseline composite at truncation boundary (Frame 1 Background Green + Magenta dot at 0, 0)
    // Frame 1: Step 4 applied (layer-fg Magenta dot at 0, 0 over Green bg)
    // Frame 2: Step 5 applied (layer-fg White dot at 1, 1 over Green bg)
    // Frame 3: Step 6 applied (layer-fg Red dot at 2, 2 over Green bg)
    expect(replayFrames.length).toBe(4);

    // Also assert convertHistoryToRawFrames with baseline produces equivalent frame count
    const viaConvert = convertHistoryToRawFrames(retainedHistory, 1, { baseline });
    expect(viaConvert.length).toBe(4);

    // Check Replay Frame 0 (reconstructed baseline boundary composite):
    // Pixel (3, 3) must be GREEN from layer-bg (even though all drawing on layer-bg was evicted!)
    const p33 = (3 * W + 3) * 4;
    expect(replayFrames[0].data[p33]).toBe(0);
    expect(replayFrames[0].data[p33 + 1]).toBe(255); // Green
    expect(replayFrames[0].data[p33 + 2]).toBe(0);
    expect(replayFrames[0].data[p33 + 3]).toBe(255);

    // Check Replay Frame 3 (final reconstructed step):
    // Pixel (2, 2) has RED dot from Step 6
    const p22 = (2 * W + 2) * 4;
    expect(replayFrames[3].data[p22]).toBe(255); // Red
    expect(replayFrames[3].data[p22 + 1]).toBe(0);
    expect(replayFrames[3].data[p22 + 2]).toBe(0);
    expect(replayFrames[3].data[p22 + 3]).toBe(255);

    // Pixel (3, 3) STILL has GREEN from the preserved baseline background
    expect(replayFrames[3].data[p33]).toBe(0);
    expect(replayFrames[3].data[p33 + 1]).toBe(255); // Green
    expect(replayFrames[3].data[p33 + 2]).toBe(0);
    expect(replayFrames[3].data[p33 + 3]).toBe(255);

    // 4. Memory budget invariant: Baseline participates in totalBytes
    expect(baseline!.totalBytes).toBeGreaterThan(0);
    expect(engine.totalBytes).toBeGreaterThan(0);
    expect(engine.totalBytes).toBeLessThanOrEqual(engine.maxBytes);
  });
});
