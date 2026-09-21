// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import {
  convertHistoryToRawFrames,
  exportProcessReplayGifAsync,
} from '@/lib/export/processReplay';
import type { HistoryStep, PixelHistoryStep, StructuralHistoryStep } from '@/types/canvas';

function createMockImageData(width: number, height: number, fillR: number = 0): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = fillR;
    data[i + 1] = 0;
    data[i + 2] = 0;
    data[i + 3] = 255;
  }
  return {
    width,
    height,
    data,
    colorSpace: 'srgb',
  } as ImageData;
}

describe('Process Replay characterization and regression tests', () => {
  it('extracts raw frames exclusively from pixel history steps with valid imageData', () => {
    const steps: HistoryStep[] = [
      {
        type: 'pixel',
        description: 'Stroke 1',
        frameIndex: 0,
        layerId: 'layer-1',
        imageData: createMockImageData(4, 4, 100),
      } as PixelHistoryStep,
      {
        type: 'structural',
        description: 'Reorder Layers',
        frameIndex: 0,
        frames: [],
        activeFrameIndex: 0,
        activeLayerId: 'layer-1',
      } as StructuralHistoryStep,
      {
        type: 'pixel',
        description: 'Stroke 2',
        frameIndex: 0,
        layerId: 'layer-1',
        imageData: createMockImageData(4, 4, 200),
      } as PixelHistoryStep,
    ];

    const rawFrames = convertHistoryToRawFrames(steps, 1);
    expect(rawFrames).toHaveLength(2);
    expect(rawFrames[0].width).toBe(4);
    expect(rawFrames[0].height).toBe(4);
    expect(rawFrames[0].data[0]).toBe(100);
    expect(rawFrames[1].data[0]).toBe(200);
  });

  it('scales frames using nearest neighbor interpolation when scale > 1', () => {
    const steps: HistoryStep[] = [
      {
        type: 'pixel',
        description: 'Brush',
        frameIndex: 0,
        layerId: 'layer-1',
        imageData: createMockImageData(2, 2, 128),
      } as PixelHistoryStep,
    ];

    const rawFrames = convertHistoryToRawFrames(steps, 2);
    expect(rawFrames).toHaveLength(1);
    expect(rawFrames[0].width).toBe(4);
    expect(rawFrames[0].height).toBe(4);
    expect(rawFrames[0].data.length).toBe(4 * 4 * 4);
    expect(rawFrames[0].data[0]).toBe(128);
  });

  it('throws error when exporting process replay from history containing no drawable steps', async () => {
    const emptySteps: HistoryStep[] = [];
    await expect(exportProcessReplayGifAsync(emptySteps)).rejects.toThrow(
      /history contains no drawable steps/i
    );

    const structuralOnlySteps: HistoryStep[] = [
      {
        type: 'structural',
        description: 'Add Layer',
        frameIndex: 0,
        frames: [],
        activeFrameIndex: 0,
        activeLayerId: 'layer-1',
      } as StructuralHistoryStep,
    ];
    await expect(exportProcessReplayGifAsync(structuralOnlySteps)).rejects.toThrow(
      /history contains no drawable steps/i
    );
  });

  it('exports valid animated GIF blob from creative steps', async () => {
    const steps: HistoryStep[] = [
      {
        type: 'pixel',
        description: 'First mark',
        frameIndex: 0,
        layerId: 'l1',
        imageData: createMockImageData(4, 4, 50),
      } as PixelHistoryStep,
      {
        type: 'pixel',
        description: 'Second mark',
        frameIndex: 0,
        layerId: 'l1',
        imageData: createMockImageData(4, 4, 150),
      } as PixelHistoryStep,
    ];

    const onProgress = vi.fn();
    const gifBlob = await exportProcessReplayGifAsync(steps, {
      fps: 10,
      scale: 1,
      holdLastFrameMs: 100,
      onProgress,
    });

    expect(gifBlob).toBeInstanceOf(Blob);
    expect(gifBlob.type).toBe('image/gif');
    expect(gifBlob.size).toBeGreaterThan(0);
    expect(onProgress).toHaveBeenCalled();
  });

  it('respects AbortSignal during GIF export', async () => {
    const controller = new AbortController();
    controller.abort();

    const steps: HistoryStep[] = [
      {
        type: 'pixel',
        description: 'Pixel',
        frameIndex: 0,
        layerId: 'l1',
        imageData: createMockImageData(4, 4, 50),
      } as PixelHistoryStep,
    ];

    await expect(
      exportProcessReplayGifAsync(steps, { signal: controller.signal })
    ).rejects.toThrow();
  });
});
