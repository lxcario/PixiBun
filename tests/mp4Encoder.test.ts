/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect } from 'vitest';
import {
  exportAnimationToMp4Async,
  buildIsoBox,
  createFtypBox,
  createMoovBox,
} from '@/lib/export/mp4Encoder';
import { exportProcessReplayMp4Async } from '@/lib/export/speedpaintExporter';
import { HistoryStep } from '@/lib/engine/historyEngine';

function createMockCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const data = new Uint8ClampedArray(width * height * 4);
    ctx.getImageData = () => ({ width, height, data } as ImageData);
  }
  return canvas;
}

describe('In-Browser MP4 (H.264 / ISOBMFF) Video Export Engine', () => {
  it('builds standard ISOBMFF box with 4-byte big-endian size and 4-char type', () => {
    const payload = new Uint8Array([10, 20, 30, 40]);
    const box = buildIsoBox('test', payload);

    expect(box.length).toBe(12); // 8 header + 4 payload
    expect(box[0]).toBe(0);
    expect(box[1]).toBe(0);
    expect(box[2]).toBe(0);
    expect(box[3]).toBe(12);

    expect(String.fromCharCode(box[4], box[5], box[6], box[7])).toBe('test');
    expect(Array.from(box.subarray(8))).toEqual([10, 20, 30, 40]);
  });

  it('constructs standard ftyp and moov FastStart metadata boxes', () => {
    const ftyp = createFtypBox();
    expect(ftyp.length).toBeGreaterThan(16);
    expect(String.fromCharCode(ftyp[4], ftyp[5], ftyp[6], ftyp[7])).toBe('ftyp');
    // Major brand 'isom'
    expect(String.fromCharCode(ftyp[8], ftyp[9], ftyp[10], ftyp[11])).toBe('isom');

    const moov = createMoovBox(64, 64, 1000);
    expect(moov.length).toBeGreaterThan(32);
    expect(String.fromCharCode(moov[4], moov[5], moov[6], moov[7])).toBe('moov');
  });

  it('throws an error if no frames are provided', async () => {
    await expect(exportAnimationToMp4Async([])).rejects.toThrow(
      'Cannot export MP4: no frames provided.'
    );
  });

  it('rejects immediately when AbortSignal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    const canvas = createMockCanvas(16, 16);
    await expect(
      exportAnimationToMp4Async([canvas], { signal: controller.signal })
    ).rejects.toThrow('MP4 export aborted');
  });

  it('encodes animation frames into a valid MP4 Blob with video/mp4 MIME type', async () => {
    const frame1 = createMockCanvas(32, 32);
    const frame2 = createMockCanvas(32, 32);

    let progressCount = 0;
    const blob = await exportAnimationToMp4Async([frame1, frame2], {
      fps: 12,
      scale: 2,
      loopCount: 1,
      onProgress: () => {
        progressCount++;
      },
    });

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('video/mp4');
    expect(blob.size).toBeGreaterThan(64);
    expect(progressCount).toBeGreaterThan(0);

    const buffer = new Uint8Array(await blob.arrayBuffer());
    // Verify first box is ftyp
    const firstBoxType = String.fromCharCode(
      buffer[4],
      buffer[5],
      buffer[6],
      buffer[7]
    );
    expect(firstBoxType).toBe('ftyp');
  });

  it('exports speedpaint timelapse history snapshots into an MP4 video Blob', async () => {
    const dummyImageData = {
      width: 16,
      height: 16,
      data: new Uint8ClampedArray(16 * 16 * 4),
      colorSpace: 'srgb' as PredefinedColorSpace,
    };

    const steps: HistoryStep[] = [
      {
        description: 'Pen stroke 1',
        frameIndex: 0,
        layerId: 'layer-1',
        imageData: dummyImageData as ImageData,
      },
      {
        description: 'Pen stroke 2',
        frameIndex: 0,
        layerId: 'layer-1',
        imageData: dummyImageData as ImageData,
      },
    ];

    const blob = await exportProcessReplayMp4Async(steps, {
      fps: 12,
      scale: 2,
      holdLastFrameMs: 500,
    });

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('video/mp4');
    expect(blob.size).toBeGreaterThan(64);
  });
});
