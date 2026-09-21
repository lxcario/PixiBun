import { describe, it, expect } from 'vitest';
import {
  createHistoryEngine,
  HistoryEngine,
  PixelHistoryStep,
  StructuralHistoryStep,
} from '@/lib/engine/historyEngine';
import {
  convertHistoryToRawFrames,
  reconstructProcessReplayFrames,
} from '@/lib/export/processReplay';
import type { AnimationFrame } from '@/types/canvas';

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

    // 4. Memory budget invariant:
    // Undo history is strictly bounded to 64 MiB / 50 entries. The replay baseline is separately bounded by current project raster complexity and does not grow with session duration.
    expect(baseline!.totalBytes).toBeGreaterThan(0);
    expect(engine.totalBytes).toBeGreaterThan(0);
    expect(engine.totalBytes).toBeLessThanOrEqual(engine.maxBytes);
  });
});

describe('Process Replay Adversarial Structural History Eviction Suite', () => {
  it('preserves complete project structure, ordering, attributes, and composite pixels when structural history entries cross eviction boundary', () => {
    // 1. Setup History Engine with a bounded depth of 3 entries to trigger eviction
    const engine: HistoryEngine = createHistoryEngine({ maxDepth: 3, maxBytes: 1024 * 1024 });

    const W = 4;
    const H = 4;

    // We have a 2-frame project:
    // Frame 0:
    //   - layer-bg (Layer 1): Solid Blue [0, 0, 255, 255]
    //   - layer-mid (Layer 2): Green dot at (1, 1) [0, 255, 0, 255]
    //   - layer-top (Layer 3): Red dot at (2, 2) [255, 0, 0, 255]
    // Frame 1:
    //   - layer-f1-bg: Solid White
    //   - layer-f1-top: Black dot at (0, 0)

    const initialFrames: AnimationFrame[] = [
      {
        id: 'frame-0',
        durationMs: 100,
        layers: [
          {
            id: 'layer-top',
            name: 'Top Layer',
            visible: true,
            locked: false,
            opacity: 1,
            blendMode: 'source-over',
          },
          {
            id: 'layer-mid',
            name: 'Middle Layer',
            visible: true,
            locked: false,
            opacity: 1,
            blendMode: 'source-over',
          },
          {
            id: 'layer-bg',
            name: 'Background Layer',
            visible: true,
            locked: false,
            opacity: 1,
            blendMode: 'source-over',
          },
        ],
      },
      {
        id: 'frame-1',
        durationMs: 100,
        layers: [
          {
            id: 'layer-f1-top',
            name: 'Frame 1 Top',
            visible: true,
            locked: false,
            opacity: 1,
            blendMode: 'source-over',
          },
          {
            id: 'layer-f1-bg',
            name: 'Frame 1 BG',
            visible: true,
            locked: false,
            opacity: 1,
            blendMode: 'source-over',
          },
        ],
      },
    ];

    // Step 1: Draw on Frame 0, layer-bg (Solid Blue)
    const step1: PixelHistoryStep = {
      type: 'pixel',
      description: 'Draw Frame 0 Background (Blue)',
      frameIndex: 0,
      layerId: 'layer-bg',
      layerName: 'Background Layer',
      imageData: createSolidImageData(W, H, 0, 0, 255),
    };
    engine.push(step1);

    // Step 2: Draw on Frame 0, layer-mid (Green dot at 1, 1)
    const step2: PixelHistoryStep = {
      type: 'pixel',
      description: 'Draw Frame 0 Middle (Green dot)',
      frameIndex: 0,
      layerId: 'layer-mid',
      layerName: 'Middle Layer',
      imageData: createPatternImageData(W, H, 1, 1, 0, 255, 0),
    };
    engine.push(step2);

    // Step 3: Draw on Frame 0, layer-top (Red dot at 2, 2)
    const step3: PixelHistoryStep = {
      type: 'pixel',
      description: 'Draw Frame 0 Top (Red dot)',
      frameIndex: 0,
      layerId: 'layer-top',
      layerName: 'Top Layer',
      imageData: createPatternImageData(W, H, 2, 2, 255, 0, 0),
    };
    engine.push(step3);

    expect(engine.depth).toBe(3);
    expect(engine.isTruncated).toBe(false);

    // Step 4: Metadata / Order Structural Mutation
    // Reorder layers in Frame 0: move layer-mid to the top -> [layer-mid, layer-top, layer-bg]
    const reorderedFrames: AnimationFrame[] = [
      {
        ...initialFrames[0],
        layers: [
          { ...initialFrames[0].layers[1] }, // layer-mid now at index 0 (top of stack)
          { ...initialFrames[0].layers[0] }, // layer-top now at index 1
          { ...initialFrames[0].layers[2] }, // layer-bg at index 2
        ],
      },
      initialFrames[1],
    ];

    const step4: StructuralHistoryStep = {
      type: 'structural',
      opKind: 'reorder-layers',
      description: 'Reorder Frame 0 Layers (Move Middle to Top)',
      frameIndex: 0,
      activeFrameIndex: 0,
      activeLayerId: 'layer-mid',
      canvasWidth: W,
      canvasHeight: H,
      frames: reorderedFrames,
      layerBuffers: [],
      affectedLayerIds: [],
    };
    // Pushing step 4 forces eviction of Step 1 (layer-bg paint)!
    engine.push(step4);

    expect(engine.depth).toBe(3);
    expect(engine.isTruncated).toBe(true);
    expect(engine.evictionCount).toBe(1);

    // Step 5: Destructive Raster Structural Mutation (Merge Down)
    // Merge layer-mid into layer-top:
    // layer-top now contains both the Green dot at (1, 1) and the Red dot at (2, 2).
    // layer-mid is deleted from Frame 0.
    const mergedImageData = createPatternImageData(W, H, 2, 2, 255, 0, 0); // Red at (2, 2)
    const midIdx = (1 * W + 1) * 4;
    mergedImageData.data[midIdx] = 0;
    mergedImageData.data[midIdx + 1] = 255; // Green at (1, 1)
    mergedImageData.data[midIdx + 2] = 0;
    mergedImageData.data[midIdx + 3] = 255;

    const mergedFrames: AnimationFrame[] = [
      {
        ...initialFrames[0],
        layers: [
          { ...initialFrames[0].layers[0], name: 'Merged Top Layer' }, // layer-top
          { ...initialFrames[0].layers[2] }, // layer-bg
        ],
      },
      initialFrames[1],
    ];

    const step5: StructuralHistoryStep = {
      type: 'structural',
      opKind: 'merge-layer',
      description: 'Merge Down Layer (Mid into Top)',
      frameIndex: 0,
      activeFrameIndex: 0,
      activeLayerId: 'layer-top',
      canvasWidth: W,
      canvasHeight: H,
      frames: mergedFrames,
      layerBuffers: [
        {
          layerId: 'layer-top',
          imageData: mergedImageData,
        },
      ],
      affectedLayerIds: ['layer-mid', 'layer-top'],
    };
    // Pushing step 5 forces eviction of Step 2 (layer-mid paint)!
    engine.push(step5);

    expect(engine.depth).toBe(3);
    expect(engine.evictionCount).toBe(2);

    // Step 6: Draw Yellow dot at (3, 3) on Frame 0 layer-top
    // This forces eviction of Step 3 (layer-top paint)!
    const step6: PixelHistoryStep = {
      type: 'pixel',
      description: 'Draw Frame 0 Top (Yellow dot at 3,3)',
      frameIndex: 0,
      layerId: 'layer-top',
      imageData: (() => {
        const copy = new Uint8ClampedArray(mergedImageData.data);
        const p33 = (3 * W + 3) * 4;
        copy[p33] = 255;
        copy[p33 + 1] = 255;
        copy[p33 + 2] = 0;
        copy[p33 + 3] = 255;
        return { width: W, height: H, data: copy, colorSpace: 'srgb' } as ImageData;
      })(),
    };
    engine.push(step6);
    expect(engine.evictionCount).toBe(3);

    // Step 7: Draw Cyan dot at (0, 3) on Frame 0 layer-top
    // This forces eviction of Step 4 (the reorder structural history step)!
    const step7: PixelHistoryStep = {
      type: 'pixel',
      description: 'Draw Frame 0 Top (Cyan dot at 0,3)',
      frameIndex: 0,
      layerId: 'layer-top',
      imageData: (() => {
        const copy = new Uint8ClampedArray(step6.imageData.data);
        const p03 = (3 * W + 0) * 4;
        copy[p03] = 0;
        copy[p03 + 1] = 255;
        copy[p03 + 2] = 255;
        copy[p03 + 3] = 255;
        return { width: W, height: H, data: copy, colorSpace: 'srgb' } as ImageData;
      })(),
    };
    engine.push(step7);
    expect(engine.evictionCount).toBe(4);

    // Step 8: Draw Purple dot at (0, 0) on Frame 1 layer-f1-top
    // This forces eviction of Step 5 (the destructive merge-down structural history step)!
    const step8: PixelHistoryStep = {
      type: 'pixel',
      description: 'Draw Frame 1 Top (Purple dot at 0,0)',
      frameIndex: 1,
      layerId: 'layer-f1-top',
      imageData: createPatternImageData(W, H, 0, 0, 128, 0, 128),
    };
    engine.push(step8);
    expect(engine.evictionCount).toBe(5);

    // At this point:
    // Steps 1, 2, 3, 4, 5 ARE ALL EVICTED!
    // Both structural mutations (metadata/order and destructive merge-down) have crossed
    // the eviction boundary and folded into the baseline checkpoint.
    // Retained history contains only steps 6, 7, 8.
    const retainedHistory = engine.getHistory();
    expect(retainedHistory).toHaveLength(3);
    expect(retainedHistory[0].description).toBe('Draw Frame 0 Top (Yellow dot at 3,3)');

    // 2. Audit the baseline checkpoint tracked during structural eviction
    const baseline = engine.getBaseline();
    expect(baseline).not.toBeNull();
    expect(baseline!.width).toBe(W);
    expect(baseline!.height).toBe(H);

    // Frame 0 baseline checks
    const f0 = baseline!.frames.find((f) => f.frameIndex === 0);
    expect(f0).toBeDefined();

    // Complete expected frame/layer structure:
    // Frame 0 must contain exactly 2 layers (layer-top and layer-bg).
    // layer-mid was merged down and deleted, so it must NOT exist in the baseline!
    expect(f0!.layers).toHaveLength(2);
    expect(f0!.layers.some((l) => l.layerId === 'layer-mid')).toBe(false);
    expect(f0!.layers.some((l) => l.layerId === 'layer-top')).toBe(true);
    expect(f0!.layers.some((l) => l.layerId === 'layer-bg')).toBe(true);

    // Ordering: layer-top is above layer-bg
    const bTop = f0!.layers.find((l) => l.layerId === 'layer-top')!;
    const bBg = f0!.layers.find((l) => l.layerId === 'layer-bg')!;
    expect(bTop.order).toBeGreaterThan(bBg.order!);

    // Visibility / Opacity / Blend state
    expect(bTop.visible).toBe(true);
    expect(bTop.opacity).toBe(1);
    expect(bTop.blendMode).toBe('source-over');
    expect(bBg.visible).toBe(true);
    expect(bBg.opacity).toBe(1);
    expect(bBg.blendMode).toBe('source-over');

    // Destructive raster content verification:
    // bTop must contain BOTH the Green dot at (1, 1) and the Red dot at (2, 2) from the folded merge-down!
    const p11 = (1 * W + 1) * 4;
    expect(bTop.imageData.data[p11]).toBe(0);
    expect(bTop.imageData.data[p11 + 1]).toBe(255); // Green
    expect(bTop.imageData.data[p11 + 2]).toBe(0);
    expect(bTop.imageData.data[p11 + 3]).toBe(255);

    const p22 = (2 * W + 2) * 4;
    expect(bTop.imageData.data[p22]).toBe(255); // Red
    expect(bTop.imageData.data[p22 + 1]).toBe(0);
    expect(bTop.imageData.data[p22 + 2]).toBe(0);
    expect(bTop.imageData.data[p22 + 3]).toBe(255);

    // bBg must retain the Solid Blue background from step 1
    const p00 = 0;
    expect(bBg.imageData.data[p00]).toBe(0);
    expect(bBg.imageData.data[p00 + 1]).toBe(0);
    expect(bBg.imageData.data[p00 + 2]).toBe(255); // Blue
    expect(bBg.imageData.data[p00 + 3]).toBe(255);

    // Memory invariant:
    // Undo history is strictly bounded to 64 MiB / 50 entries. The replay baseline is separately bounded by current project raster complexity and does not grow with session duration.
    expect(baseline!.totalBytes).toBeGreaterThan(0);
    expect(engine.totalBytes).toBeGreaterThan(0);
    expect(engine.totalBytes).toBeLessThanOrEqual(engine.maxBytes);

    // 3. Reconstruct Process Replay from the retained boundary
    baseline!.activeFrameIndex = 0; // Focus on Frame 0
    const replayFrames = reconstructProcessReplayFrames(retainedHistory, baseline, 1);

    // Expected progression:
    // Frame 0: Baseline composite at truncation boundary (Frame 0 Blue bg + merged Green at (1,1) and Red at (2,2))
    // Frame 1: Step 6 applied (Yellow dot at 3,3)
    // Frame 2: Step 7 applied (Cyan dot at 0,3)
    // Frame 3: Step 8 applied (on Frame 1)
    expect(replayFrames.length).toBe(4);

    // Replay Frame 0 (Baseline composite at truncation boundary):
    // (0, 0) should be Blue from background
    expect(replayFrames[0].data[p00]).toBe(0);
    expect(replayFrames[0].data[p00 + 1]).toBe(0);
    expect(replayFrames[0].data[p00 + 2]).toBe(255); // Blue
    expect(replayFrames[0].data[p00 + 3]).toBe(255);

    // (1, 1) should be Green from merged layer-top
    expect(replayFrames[0].data[p11]).toBe(0);
    expect(replayFrames[0].data[p11 + 1]).toBe(255); // Green
    expect(replayFrames[0].data[p11 + 2]).toBe(0);
    expect(replayFrames[0].data[p11 + 3]).toBe(255);

    // (2, 2) should be Red from merged layer-top
    expect(replayFrames[0].data[p22]).toBe(255); // Red
    expect(replayFrames[0].data[p22 + 1]).toBe(0);
    expect(replayFrames[0].data[p22 + 2]).toBe(0);
    expect(replayFrames[0].data[p22 + 3]).toBe(255);

    // Replay Frame 1 (Step 6: Yellow dot at 3, 3):
    const p33 = (3 * W + 3) * 4;
    expect(replayFrames[1].data[p33]).toBe(255); // Red channel of Yellow
    expect(replayFrames[1].data[p33 + 1]).toBe(255); // Green channel of Yellow
    expect(replayFrames[1].data[p33 + 2]).toBe(0); // Blue
    expect(replayFrames[1].data[p33 + 3]).toBe(255);

    // Preserves (1, 1) Green and (2, 2) Red
    expect(replayFrames[1].data[p11]).toBe(0);
    expect(replayFrames[1].data[p11 + 1]).toBe(255);
    expect(replayFrames[1].data[p22]).toBe(255);
    expect(replayFrames[1].data[p22 + 1]).toBe(0);

    // Replay Frame 2 (Step 7: Cyan dot at 0, 3):
    const p03 = (3 * W + 0) * 4;
    expect(replayFrames[2].data[p03]).toBe(0);
    expect(replayFrames[2].data[p03 + 1]).toBe(255); // Green
    expect(replayFrames[2].data[p03 + 2]).toBe(255); // Blue
    expect(replayFrames[2].data[p03 + 3]).toBe(255);

    // Still preserves (3, 3) Yellow, (1, 1) Green, (2, 2) Red
    expect(replayFrames[2].data[p33]).toBe(255);
    expect(replayFrames[2].data[p33 + 1]).toBe(255);
    expect(replayFrames[2].data[p11 + 1]).toBe(255);
    expect(replayFrames[2].data[p22]).toBe(255);
  });
});

