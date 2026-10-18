/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  exportAnimationToMp4Async,
  h264FreezesThisBrowser,
  isMp4ExportSupported,
  probeMp4ExportSupport,
  resetMp4ProbeCache,
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
  public onstart: (() => void) | null = null;
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
    // Real recorders announce capture asynchronously.
    queueMicrotask(() => this.onstart?.());
  }

  stop() {
    if (this.state === 'inactive') return;
    this.state = 'inactive';
    // Deliver mock encoded H.264 / MP4 container chunk
    const chunk = new Blob([new Uint8Array([
      0, 0, 0, 12, 102, 116, 121, 112, 105, 115, 111, 109, // ftyp isom
      0, 0, 0, 12, 109, 100, 97, 116, 1, 2, 3, 4, // mdat with encoded samples
    ])], {
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
    vi.unstubAllGlobals();
    vi.useRealTimers();
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

  it('closes the WebCodecs encoder and frame when export aborts after encoding', async () => {
    const originalVideoEncoder = (window as unknown as { VideoEncoder?: unknown }).VideoEncoder;
    const originalVideoFrame = (window as unknown as { VideoFrame?: unknown }).VideoFrame;
    const closeEncoder = vi.fn();
    const closeFrame = vi.fn();
    const encode = vi.fn();
    const controller = new AbortController();
    HTMLCanvasElement.prototype.getContext = vi.fn(() => mockCtx) as unknown as typeof HTMLCanvasElement.prototype.getContext;
    (window as unknown as { VideoEncoder: unknown }).VideoEncoder = class {
      static isConfigSupported = async () => ({ supported: true });
      configure() {}
      encode = encode;
      flush = vi.fn(async () => {});
      close = closeEncoder;
    };
    (window as unknown as { VideoFrame: unknown }).VideoFrame = class {
      close = closeFrame;
    };

    try {
      await expect(exportAnimationToMp4Async([createMockCanvas(16, 16), createMockCanvas(16, 16)], {
        signal: controller.signal,
        onProgress: () => controller.abort(),
      })).rejects.toThrow('MP4 export aborted');
      expect(encode).toHaveBeenCalledTimes(1);
      expect(closeFrame).toHaveBeenCalledTimes(1);
      expect(closeEncoder).toHaveBeenCalledTimes(1);
    } finally {
      (window as unknown as { VideoEncoder?: unknown }).VideoEncoder = originalVideoEncoder;
      (window as unknown as { VideoFrame?: unknown }).VideoFrame = originalVideoFrame;
    }
  });

  it('detects when MP4 export is unsupported in environment without MediaRecorder', () => {
    uninstallMediaRecorderMock();
    expect(isMp4ExportSupported()).toBe(false);
  });

  it('probes the actual H.264 configuration and rejects it without an independent recorder fallback', async () => {
    uninstallMediaRecorderMock();
    const configure = vi.fn(); const close = vi.fn();
    const probe = vi.fn(async () => ({ supported: false }));
    vi.stubGlobal('VideoEncoder', class { static isConfigSupported = probe; configure = configure; close = close; });
    vi.stubGlobal('VideoFrame', class {});
    HTMLCanvasElement.prototype.getContext = vi.fn(() => mockCtx) as unknown as typeof HTMLCanvasElement.prototype.getContext;
    expect(await probeMp4ExportSupport(15, 33)).toBe(false);
    expect(probe).toHaveBeenCalledWith(expect.objectContaining({ width: 16, height: 34, codec: 'avc1.42001f', hardwareAcceleration: 'prefer-software' }));
    await expect(exportAnimationToMp4Async([createMockCanvas(16, 16)])).rejects.toThrow('unsupported');
    expect(configure).not.toHaveBeenCalled(); expect(close).toHaveBeenCalledOnce();
  });

  it.each([
    ['reports the configuration as supported but fails to encode (Firefox without H.264)', 'error', false],
    ['produces no chunk', 'silent', false],
    ['encodes a real chunk', 'ok', true],
  ] as const)('claims MP4 support only when a trial encode works: encoder %s', async (_name, behaviour, expected) => {
    uninstallMediaRecorderMock(); resetMp4ProbeCache();
    const encode = vi.fn(); const close = vi.fn();
    vi.stubGlobal('VideoEncoder', class {
      static isConfigSupported = async () => ({ supported: true });
      constructor(private init: { output: (chunk: unknown) => void; error: (e: unknown) => void }) {}
      configure() {}
      encode() { encode(); if (behaviour === 'ok') this.init.output({}); if (behaviour === 'error') this.init.error(new DOMException('Encoding failed', 'EncodingError')); }
      async flush() {}
      close = close;
    });
    vi.stubGlobal('VideoFrame', class { close() {} });
    HTMLCanvasElement.prototype.getContext = vi.fn(() => mockCtx) as unknown as typeof HTMLCanvasElement.prototype.getContext;
    expect(await probeMp4ExportSupport(32, 32)).toBe(expected);
    expect(await probeMp4ExportSupport(32, 32)).toBe(expected);
    expect(encode).toHaveBeenCalledOnce();
    expect(close).toHaveBeenCalledOnce();
  });

  it('cancels a stalled hardware flush and closes the encoder', async () => {
    uninstallMediaRecorderMock(); const controller = new AbortController(); const close = vi.fn();
    vi.stubGlobal('VideoEncoder', class {
      static isConfigSupported = async () => ({ supported: true });
      configure() {} encode() {} close = close;
      flush() { controller.abort(); return new Promise<void>(() => {}); }
    });
    vi.stubGlobal('VideoFrame', class { close() {} });
    HTMLCanvasElement.prototype.getContext = vi.fn(() => mockCtx) as unknown as typeof HTMLCanvasElement.prototype.getContext;
    await expect(exportAnimationToMp4Async([createMockCanvas(16, 16)], { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
    expect(close).toHaveBeenCalledOnce();
  });

  it('bounds a stalled hardware configuration probe and releases the encoder', async () => {
    vi.useFakeTimers(); uninstallMediaRecorderMock(); const close = vi.fn();
    vi.stubGlobal('VideoEncoder', class {
      static isConfigSupported = () => new Promise<{ supported: boolean }>(() => {});
      configure() {} close = close;
    });
    vi.stubGlobal('VideoFrame', class {});
    HTMLCanvasElement.prototype.getContext = vi.fn(() => mockCtx) as unknown as typeof HTMLCanvasElement.prototype.getContext;
    const assertion = expect(exportAnimationToMp4Async([createMockCanvas(16, 16)])).rejects.toThrow('unsupported');
    await vi.advanceTimersByTimeAsync(10_000); await assertion;
    expect(close).toHaveBeenCalledOnce(); expect(vi.getTimerCount()).toBe(0);
  });

  it('rejects with descriptive error when MP4 export is unsupported', async () => {
    uninstallMediaRecorderMock();
    const frame = createMockCanvas(16, 16);

    await expect(exportAnimationToMp4Async([frame])).rejects.toThrow(
      /MP4 recording is unsupported/i
    );
  });

  it('reports supported when MediaRecorder with video/mp4 MIME type and captureStream are present', () => {
    installMediaRecorderMock();
    expect(isMp4ExportSupported()).toBe(true);
  });

  it('leaves H.264 untouched in WebKit on Linux, where probing it froze the page', async () => {
    const webkitLinux = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15';
    expect(h264FreezesThisBrowser(webkitLinux)).toBe(true);
    for (const ua of [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64; rv:144.0) Gecko/20100101 Firefox/144.0',
      navigator.userAgent, // happy-dom: "Linux … AppleWebKit", but not a Safari build
    ]) expect(h264FreezesThisBrowser(ua)).toBe(false);

    installMediaRecorderMock();
    MockMediaRecorderInstance.isTypeSupported.mockClear();
    const configProbe = vi.fn(async () => ({ supported: true }));
    vi.stubGlobal('VideoEncoder', Object.assign(vi.fn(), { isConfigSupported: configProbe }));
    vi.stubGlobal('VideoFrame', vi.fn());
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(webkitLinux);
    expect(isMp4ExportSupported()).toBe(false);
    await expect(probeMp4ExportSupport(32, 32)).resolves.toBe(false);
    await expect(exportAnimationToMp4Async([createMockCanvas(4, 4)])).rejects.toThrow('MP4 recording is unsupported');
    expect(configProbe).not.toHaveBeenCalled();
    expect(MockMediaRecorderInstance.isTypeSupported).not.toHaveBeenCalled();
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

    await expect(exportPromise).rejects.toMatchObject({ name: 'AbortError' });
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
      'MediaRecorder failed while encoding video.'
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
    expect(mockCtx.drawImage).toHaveBeenCalledWith(frame, 0, 0, 15, 33);
  });
});
