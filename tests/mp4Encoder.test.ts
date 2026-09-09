/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  exportAnimationToMp4Async,
  isMp4ExportSupported,
} from '@/lib/export/mp4Encoder';
import { exportProcessReplayMp4Async } from '@/lib/export/speedpaintExporter';
import { HistoryStep } from '@/lib/engine/historyEngine';

class MockMediaRecorderInstance extends EventTarget {
  public static isTypeSupported = vi.fn((mime: string) => {
    return mime === 'video/mp4;codecs=avc1' || mime === 'video/mp4';
  });

  public state: 'inactive' | 'recording' | 'paused' = 'inactive';
  public stream: unknown;
  public options: unknown;
  public ondataavailable: ((e: { data: Blob }) => void) | null = null;
  public onstop: (() => void) | null = null;
  public onerror: ((e: unknown) => void) | null = null;

  public static lastInstance: MockMediaRecorderInstance | null = null;

  constructor(stream: unknown, options: unknown) {
    super();
    this.stream = stream;
    this.options = options;
    MockMediaRecorderInstance.lastInstance = this;
  }

  start() {
    this.state = 'recording';
  }

  stop() {
    if (this.state === 'inactive') return;
    this.state = 'inactive';
    // Deliver mock encoded H.264 / MP4 container chunk
    const chunk = new Blob([new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112, 105, 115, 111, 109])], {
      type: 'video/mp4',
    });
    if (this.ondataavailable) {
      this.ondataavailable({ data: chunk });
    }
    if (this.onstop) {
      this.onstop();
    }
  }

  simulateError() {
    if (this.onerror) {
      this.onerror(new Error('MediaRecorder simulated hardware encoding error'));
    }
  }
}

describe('In-Browser MP4 (H.264 / ISOBMFF) Video Export Engine', () => {
  let originalMediaRecorder: unknown;
  let originalCaptureStream: unknown;
  let originalGetContext: typeof HTMLCanvasElement.prototype.getContext;

  const mockCtx = {
    imageSmoothingEnabled: false,
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    putImageData: vi.fn(),
    getImageData: vi.fn((_x: number, _y: number, w: number, h: number) => ({
      width: w,
      height: h,
      data: new Uint8ClampedArray(w * h * 4),
    })),
  };

  beforeEach(() => {
    originalMediaRecorder = (window as unknown as { MediaRecorder?: unknown }).MediaRecorder;
    originalCaptureStream = HTMLCanvasElement.prototype.captureStream;
    originalGetContext = HTMLCanvasElement.prototype.getContext;
    MockMediaRecorderInstance.lastInstance = null;
    mockCtx.clearRect.mockClear();
    mockCtx.drawImage.mockClear();
  });

  afterEach(() => {
    if (originalMediaRecorder === undefined) {
      delete (window as unknown as { MediaRecorder?: unknown }).MediaRecorder;
    } else {
      (window as unknown as { MediaRecorder?: unknown }).MediaRecorder = originalMediaRecorder;
    }
    HTMLCanvasElement.prototype.captureStream = originalCaptureStream as (fps?: number) => MediaStream;
    HTMLCanvasElement.prototype.getContext = originalGetContext;
    vi.restoreAllMocks();
  });

  function installMediaRecorderMock() {
    (window as unknown as { MediaRecorder: typeof MockMediaRecorderInstance }).MediaRecorder =
      MockMediaRecorderInstance;
    HTMLCanvasElement.prototype.captureStream = vi.fn(() => ({
      getTracks: () => [{ stop: vi.fn() }],
      getVideoTracks: () => [{ stop: vi.fn() }],
    })) as unknown as (fps?: number) => MediaStream;
    HTMLCanvasElement.prototype.getContext = vi.fn(function (this: HTMLCanvasElement, contextId: string) {
      if (contextId === '2d') {
        return mockCtx as unknown as CanvasRenderingContext2D;
      }
      return null;
    }) as unknown as typeof HTMLCanvasElement.prototype.getContext;
  }

  function uninstallMediaRecorderMock() {
    delete (window as unknown as { MediaRecorder?: unknown }).MediaRecorder;
  }

  function createMockCanvas(width: number, height: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }

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

  it('detects when MP4 export is unsupported in environment without MediaRecorder', () => {
    uninstallMediaRecorderMock();
    expect(isMp4ExportSupported()).toBe(false);
  });

  it('rejects with descriptive error when MP4 export is unsupported', async () => {
    uninstallMediaRecorderMock();
    const frame = createMockCanvas(16, 16);

    await expect(exportAnimationToMp4Async([frame])).rejects.toThrow(
      /MP4 export is not supported in this browser environment/i
    );
  });

  it('reports supported when MediaRecorder with video/mp4 MIME type and captureStream are present', () => {
    installMediaRecorderMock();
    expect(isMp4ExportSupported()).toBe(true);
  });

  it('reports unsupported when MediaRecorder is present but canvas captureStream is missing', () => {
    installMediaRecorderMock();
    delete (HTMLCanvasElement.prototype as unknown as { captureStream?: unknown }).captureStream;
    expect(isMp4ExportSupported()).toBe(false);
  });

  it('executes real recording loop, frame painting, and progress callbacks via mock MediaRecorder harness', async () => {
    installMediaRecorderMock();
    const frame1 = createMockCanvas(32, 32);
    const frame2 = createMockCanvas(32, 32);

    const progressCalls: { current: number; total: number }[] = [];

    const blob = await exportAnimationToMp4Async([frame1, frame2], {
      fps: 30,
      scale: 2,
      loopCount: 2,
      durationsMs: [10, 10],
      onProgress: (current, total) => {
        progressCalls.push({ current, total });
      },
    });

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('video/mp4');
    expect(blob.size).toBeGreaterThan(0);

    // Verified progress increments up to total frames (2 frames * 2 loops = 4)
    expect(progressCalls.length).toBe(4);
    expect(progressCalls[progressCalls.length - 1]).toEqual({ current: 4, total: 4 });

    // Verified frames were painted through canvas context
    expect(mockCtx.drawImage).toHaveBeenCalled();
    expect(MockMediaRecorderInstance.lastInstance?.state).toBe('inactive');
  });

  it('cancels active recording when AbortSignal aborts mid-flight', async () => {
    installMediaRecorderMock();
    const frame1 = createMockCanvas(32, 32);
    const frame2 = createMockCanvas(32, 32);

    const controller = new AbortController();

    const exportPromise = exportAnimationToMp4Async([frame1, frame2], {
      fps: 10,
      scale: 2,
      loopCount: 5,
      durationsMs: [150, 150],
      signal: controller.signal,
    });

    // Abort after first frame begins
    setTimeout(() => {
      controller.abort();
    }, 20);

    await expect(exportPromise).rejects.toThrow('MP4 export aborted');
    expect(MockMediaRecorderInstance.lastInstance?.state).toBe('inactive');
  });

  it('rejects when MediaRecorder emits an encoding error', async () => {
    installMediaRecorderMock();
    const frame1 = createMockCanvas(32, 32);

    const exportPromise = exportAnimationToMp4Async([frame1], {
      fps: 10,
      durationsMs: [200],
    });

    setTimeout(() => {
      MockMediaRecorderInstance.lastInstance?.simulateError();
    }, 20);

    await expect(exportPromise).rejects.toThrow(
      'MediaRecorder encountered an error while encoding MP4.'
    );
  });

  it('exports speedpaint timelapse history snapshots into an MP4 video Blob with mock harness', async () => {
    installMediaRecorderMock();
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
      fps: 30,
      scale: 2,
      holdLastFrameMs: 20,
    });

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('video/mp4');
    expect(blob.size).toBeGreaterThan(0);
  });

  it('pads odd frame dimensions to nearest even integer for H.264 macroblock alignment', async () => {
    installMediaRecorderMock();
    // 15x33 odd dimensions at scale 1 -> padded to 16x34
    const frame = createMockCanvas(15, 33);

    await exportAnimationToMp4Async([frame], {
      fps: 30,
      scale: 1,
      loopCount: 1,
      durationsMs: [10],
    });

    expect(mockCtx.clearRect).toHaveBeenCalledWith(0, 0, 16, 34);
    expect(mockCtx.drawImage).toHaveBeenCalledWith(frame, 0, 0, 16, 34);
  });
});
