import { describe, it, expect, vi } from 'vitest';
import { createHistoryEngine, HistoryStep } from '@/lib/engine/historyEngine';
import {
  convertHistoryToRawFrames,
  convertHistoryToCanvases,
  exportProcessReplayGifAsync,
} from '@/lib/export/processReplay';

function makeMockImageData(width: number, height: number, fillColor: [number, number, number, number]): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = fillColor[0];
    data[i * 4 + 1] = fillColor[1];
    data[i * 4 + 2] = fillColor[2];
    data[i * 4 + 3] = fillColor[3];
  }
  return {
    width,
    height,
    data,
    colorSpace: 'srgb',
  } as unknown as ImageData;
}

describe('Phase 36.1: Process Replay Export Engine ("Speedpaint" Timelapse)', () => {
  it('retains historical steps in order via historyEngine.getHistory()', () => {
    const engine = createHistoryEngine(20);
    expect(engine.getHistory().length).toBe(0);

    const step1: HistoryStep = {
      layerId: 'layer-1',
      frameIndex: 0,
      description: 'Stroke 1',
      imageData: makeMockImageData(16, 16, [255, 0, 0, 255]),
    };
    const step2: HistoryStep = {
      layerId: 'layer-1',
      frameIndex: 0,
      description: 'Stroke 2',
      imageData: makeMockImageData(16, 16, [0, 255, 0, 255]),
    };

    engine.push(step1);
    engine.push(step2);

    const history = engine.getHistory();
    expect(history.length).toBe(2);
    expect(history[0].description).toBe('Stroke 1');
    expect(history[1].description).toBe('Stroke 2');
  });

  it('converts historical step snapshots into matching RawFrameData with scaling', () => {
    const steps: HistoryStep[] = [
      {
        layerId: 'layer-1',
        frameIndex: 0,
        description: 'Step 1',
        imageData: makeMockImageData(8, 8, [255, 0, 0, 255]),
      },
      {
        layerId: 'layer-1',
        frameIndex: 0,
        description: 'Step 2',
        imageData: makeMockImageData(8, 8, [0, 0, 255, 255]),
      },
      {
        layerId: 'layer-1',
        frameIndex: 0,
        description: 'Step 3',
        imageData: makeMockImageData(8, 8, [240, 190, 124, 255]),
      },
    ];

    const frames = convertHistoryToRawFrames(steps, 2);
    expect(frames.length).toBe(3);
    for (const f of frames) {
      expect(f.width).toBe(16);
      expect(f.height).toBe(16);
      expect(f.data.length).toBe(16 * 16 * 4);
    }

    // Direct 1:1 scale
    const unscaledFrames = convertHistoryToRawFrames(steps, 1);
    expect(unscaledFrames.length).toBe(3);
    expect(unscaledFrames[0].width).toBe(8);
    expect(unscaledFrames[0].height).toBe(8);
  });

  it('converts historical step snapshots into matching HTMLCanvasElements when DOM is present', () => {
    const steps: HistoryStep[] = [
      {
        layerId: 'layer-1',
        frameIndex: 0,
        description: 'Step 1',
        imageData: makeMockImageData(8, 8, [255, 0, 0, 255]),
      },
    ];

    // When document is undefined in node environment, returns empty array
    expect(convertHistoryToCanvases(steps)).toEqual([]);

    // When DOM document is available
    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn().mockReturnValue({
        imageSmoothingEnabled: true,
        putImageData: vi.fn(),
      }),
    };

    const origDocument = (globalThis as unknown as Record<string, unknown>).document;
    (globalThis as unknown as Record<string, unknown>).document = {
      createElement: vi.fn().mockReturnValue(mockCanvas),
    };

    try {
      const canvases = convertHistoryToCanvases(steps);
      expect(canvases.length).toBe(1);
      expect(canvases[0].width).toBe(8);
      expect(canvases[0].height).toBe(8);
    } finally {
      (globalThis as unknown as Record<string, unknown>).document = origDocument;
    }
  });

  it('compiles scripted sequence of 5 strokes into an animated GIF matching step count', async () => {
    const engine = createHistoryEngine(50);
    const strokeColors: [number, number, number, number][] = [
      [255, 0, 0, 255],
      [0, 255, 0, 255],
      [0, 0, 255, 255],
      [240, 190, 124, 255],
      [199, 146, 223, 255],
    ];

    for (let i = 0; i < strokeColors.length; i++) {
      engine.push({
        layerId: 'layer-1',
        frameIndex: 0,
        description: `Stroke ${i + 1}`,
        imageData: makeMockImageData(16, 16, strokeColors[i]),
      });
    }

    const history = engine.getHistory();
    expect(history.length).toBe(5);

    const progressSpy = vi.fn();
    const gifBlob = await exportProcessReplayGifAsync(history, {
      fps: 10,
      scale: 1,
      holdLastFrameMs: 500,
      onProgress: progressSpy,
    });

    expect(gifBlob).toBeDefined();
    expect(gifBlob.size).toBeGreaterThan(0);
    expect(gifBlob.type).toBe('image/gif');
    expect(progressSpy).toHaveBeenCalled();
  });

  it('throws an informative error if history has no steps', async () => {
    await expect(exportProcessReplayGifAsync([])).rejects.toThrow(
      'Cannot export process replay: history contains no drawable steps.'
    );
  });
});
