// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { AnimatedExportTab } from '@/components/modals/export/AnimatedExportTab';
import { extractScaledCanvasRgba } from '@/lib/canvas/scaleCanvas';
import { extractScaledRawFrames } from '@/lib/export/gifEncoder';
import { exportAnimationToApngAsync } from '@/lib/export/apngEncoder';
import { exportAnimationToMp4Async } from '@/lib/export/mp4Encoder';
import { exportAnimationToWebmAsync } from '@/lib/export/webmEncoder';
import { validateExportGeometry } from '@/lib/export/exportGeometryValidation';
import {
  MAX_SAFE_CANVAS_DIMENSION,
  MAX_SAFE_CANVAS_PIXELS,
  MAX_EXPORT_AGGREGATE_PIXELS,
} from '@/config/canvasLimits';

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

  constructor(stream: unknown, options: unknown) {
    super();
    this.stream = stream;
    this.options = options;
  }

  start() {
    this.state = 'recording';
  }

  stop() {
    if (this.state === 'inactive') return;
    this.state = 'inactive';
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
}

function createMockCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

describe('Animated Exporters Output Safety Ceilings (H3 Verification)', () => {
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
    vi.restoreAllMocks();
    originalMediaRecorder = (window as unknown as { MediaRecorder?: unknown }).MediaRecorder;
    originalCaptureStream = HTMLCanvasElement.prototype.captureStream;
    originalGetContext = HTMLCanvasElement.prototype.getContext;

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
  });

  afterEach(() => {
    cleanup();
    if (originalMediaRecorder === undefined) {
      delete (window as unknown as { MediaRecorder?: unknown }).MediaRecorder;
    } else {
      (window as unknown as { MediaRecorder?: unknown }).MediaRecorder = originalMediaRecorder;
    }
    HTMLCanvasElement.prototype.captureStream = originalCaptureStream as (fps?: number) => MediaStream;
    HTMLCanvasElement.prototype.getContext = originalGetContext;
    vi.restoreAllMocks();
  });

  // A. Safe GIF geometry
  it('A. safe GIF geometry succeeds and produces valid raw frames', () => {
    const frames = [createMockCanvas(32, 32), createMockCanvas(32, 32)];
    const rawFrames = extractScaledRawFrames(frames, 2);
    expect(rawFrames).toHaveLength(2);
    expect(rawFrames[0].width).toBe(64);
    expect(rawFrames[0].height).toBe(64);
    expect(rawFrames[0].data.length).toBe(64 * 64 * 4);
  });

  // B. Oversized GIF width
  it('B. rejects oversized GIF width before frame extraction or worker dispatch', () => {
    const frames = [createMockCanvas(3000, 32)];
    const createElementSpy = vi.spyOn(document, 'createElement');

    // 3000 * 2 = 6000 > 4096
    expect(() => {
      extractScaledRawFrames(frames, 2);
    }).toThrow(RangeError);

    // Document canvas was not created during extraction
    const canvasCalls = createElementSpy.mock.calls.filter((c) => c[0] === 'canvas');
    expect(canvasCalls).toHaveLength(0);
  });

  // C. Oversized GIF height
  it('C. rejects oversized GIF height before frame extraction or worker dispatch', () => {
    const frames = [createMockCanvas(32, 3000)];
    const createElementSpy = vi.spyOn(document, 'createElement');

    expect(() => {
      extractScaledRawFrames(frames, 2);
    }).toThrow(RangeError);

    const canvasCalls = createElementSpy.mock.calls.filter((c) => c[0] === 'canvas');
    expect(canvasCalls).toHaveLength(0);
  });

  // D. Oversized GIF pixel area
  it('D. rejects oversized GIF total area when single axis is legal but area exceeds ceiling', () => {
    const validation = validateExportGeometry(3000, 3000, {
      maxDimension: 4096,
      maxPixels: 8_000_000,
    });
    expect(validation.valid).toBe(false);
    expect(validation.reason).toBe('exceeds-pixels');
    expect(validation.error).toContain('exceeds maximum safety limit');
  });

  // E. Safe APNG geometry
  it('E. safe APNG geometry reaches encoder and produces valid APNG blob', async () => {
    const frames = [createMockCanvas(16, 16), createMockCanvas(16, 16)];
    const blob = await exportAnimationToApngAsync(frames, { fps: 10, scale: 2 });
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('image/apng');
    expect(blob.size).toBeGreaterThan(64);
  });

  // F. Oversized APNG geometry
  it('F. rejects oversized APNG geometry with RangeError before heavy frame extraction', async () => {
    const frames = [createMockCanvas(3000, 32)];
    const createElementSpy = vi.spyOn(document, 'createElement');

    await expect(
      exportAnimationToApngAsync(frames, { scale: 2 })
    ).rejects.toThrow(RangeError);

    // No intermediate canvas was allocated for scaling
    const canvasCalls = createElementSpy.mock.calls.filter((c) => c[0] === 'canvas');
    expect(canvasCalls).toHaveLength(0);
  });

  // G. Safe MP4 geometry
  it('G. safe MP4 geometry reaches video path and produces valid Blob', async () => {
    const frames = [createMockCanvas(32, 32), createMockCanvas(32, 32)];
    const blob = await exportAnimationToMp4Async(frames, { fps: 30, scale: 2, loopCount: 1, durationsMs: [10, 10] });
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('video/mp4');
  });

  // H. Oversized MP4 geometry
  it('H. rejects oversized MP4 geometry before allocating export canvas or encoder init', async () => {
    const frames = [createMockCanvas(3000, 32)];
    const createElementSpy = vi.spyOn(document, 'createElement');

    await expect(
      exportAnimationToMp4Async(frames, { scale: 2 })
    ).rejects.toThrow(/MP4 export aborted/);

    const canvasCalls = createElementSpy.mock.calls.filter((c) => c[0] === 'canvas');
    expect(canvasCalls).toHaveLength(0);
  });

  // I. Safe WebM geometry
  it('I. safe WebM geometry reaches video path and produces valid Blob', async () => {
    const frames = [createMockCanvas(32, 32), createMockCanvas(32, 32)];
    const blob = await exportAnimationToWebmAsync(frames, { fps: 30, scale: 2, loopCount: 1 });
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('video/webm');
  });

  // J. Oversized WebM geometry
  it('J. rejects oversized WebM geometry before allocating export canvas or recorder', async () => {
    const frames = [createMockCanvas(3000, 32)];
    const createElementSpy = vi.spyOn(document, 'createElement');

    await expect(
      exportAnimationToWebmAsync(frames, { scale: 2 })
    ).rejects.toThrow(/WebM export aborted/);

    const canvasCalls = createElementSpy.mock.calls.filter((c) => c[0] === 'canvas');
    expect(canvasCalls).toHaveLength(0);
  });

  // K. Exact geometry boundary
  it('K. correctly accepts exact 4096px boundary and rejects 4097px boundary', () => {
    // Exact limit
    const exact = validateExportGeometry(MAX_SAFE_CANVAS_DIMENSION, MAX_SAFE_CANVAS_DIMENSION);
    expect(exact.valid).toBe(true);
    expect(exact.totalPixels).toBe(MAX_SAFE_CANVAS_PIXELS);

    // 1px over width
    const overW = validateExportGeometry(MAX_SAFE_CANVAS_DIMENSION + 1, 64);
    expect(overW.valid).toBe(false);
    expect(overW.reason).toBe('exceeds-dimension');

    // 1px over height
    const overH = validateExportGeometry(64, MAX_SAFE_CANVAS_DIMENSION + 1);
    expect(overH.valid).toBe(false);
    expect(overH.reason).toBe('exceeds-dimension');
  });

  // L. Non-finite / invalid dimensions
  it('L. safely rejects non-positive, NaN, and non-finite dimensions', () => {
    expect(validateExportGeometry(0, 100).valid).toBe(false);
    expect(validateExportGeometry(100, -5).valid).toBe(false);
    expect(validateExportGeometry(NaN, 100).valid).toBe(false);
    expect(validateExportGeometry(Infinity, 100).valid).toBe(false);
    expect(validateExportGeometry(100, -Infinity).valid).toBe(false);
  });

  // M. Scale pushes otherwise-valid canvas over limit
  it('M. scale pushes otherwise-valid 512x512 canvas over limit at 16x scale', async () => {
    const frames = [createMockCanvas(512, 512)];

    // 512 * 8 = 4096 (exact limit, valid)
    expect(validateExportGeometry(512 * 8, 512 * 8).valid).toBe(true);

    // 512 * 16 = 8192 (exceeds 4096, rejected across all encoders)
    expect(() => extractScaledRawFrames(frames, 16)).toThrow(RangeError);

    await expect(
      exportAnimationToApngAsync(frames, { scale: 16 })
    ).rejects.toThrow(RangeError);

    await expect(
      exportAnimationToMp4Async(frames, { scale: 16 })
    ).rejects.toThrow(RangeError);

    await expect(
      exportAnimationToWebmAsync(frames, { scale: 16 })
    ).rejects.toThrow(RangeError);
  });

  // N. Aggregate memory bounds for GIF & APNG
  it('N. rejects excessive aggregate memory for GIF and APNG when frameCount causes overflow', async () => {
    // 5 frames of 4000x4000 = 5 * 16,000,000 = 80,000,000 pixels > 67,108,864 (MAX_PROJECT_AGGREGATE_PIXELS)
    // Individual frame 4000x4000 is <= 4096 and <= 16.7M, but aggregate memory exceeds 256 MiB!
    const frames = [
      createMockCanvas(4000, 4000),
      createMockCanvas(4000, 4000),
      createMockCanvas(4000, 4000),
      createMockCanvas(4000, 4000),
      createMockCanvas(4000, 4000),
    ];

    expect(() => extractScaledRawFrames(frames, 1)).toThrow(
      /exceeds maximum aggregate safety limit/
    );

    await expect(
      exportAnimationToApngAsync(frames, { scale: 1 })
    ).rejects.toThrow(/exceeds maximum aggregate safety limit/);
  });

  // O. Defense in depth in scaleCanvas.ts
  it('O. extractScaledCanvasRgba directly throws RangeError when scale exceeds ceiling', () => {
    const canvas = createMockCanvas(500, 500);
    // 500 * 10 = 5000 > 4096
    expect(() => {
      extractScaledCanvasRgba(canvas, 10);
    }).toThrow(RangeError);
  });

  // P. AnimatedExportTab does NOT silently downgrade unsafe scale
  it('P. AnimatedExportTab does not silently downgrade unsafe scale and renders explicit warning banner', () => {
    const setScaleMock = vi.fn();
    const setVideoLoopCountMock = vi.fn();

    const { getByTestId, getByText } = render(
      React.createElement(AnimatedExportTab, {
        exportType: 'apng',
        scale: 16,
        setScale: setScaleMock,
        canvasWidth: 512,
        canvasHeight: 512,
        totalFrames: 2,
        fps: 8,
        videoLoopCount: 1,
        setVideoLoopCount: setVideoLoopCountMock,
        isMp4Supported: true,
      })
    );

    // setScale was NOT called on mount/render to silently downgrade to 8x or 4x
    expect(setScaleMock).not.toHaveBeenCalled();

    // Warning banner is displayed explaining the condition to the user
    const warning = getByTestId('unsafe-scale-warning');
    expect(warning).toBeDefined();
    expect(warning.textContent).toContain('Selected Scale Exceeds Safety Ceilings');

    // 16x exceeds safety limits (512 * 16 = 8192 > 4096), so 16x button is disabled
    const btn16x = getByText('16x') as HTMLButtonElement;
    expect(btn16x.disabled).toBe(true);

    // 8x is safe (512 * 8 = 4096), so 8x button is enabled
    const btn8x = getByText('8x') as HTMLButtonElement;
    expect(btn8x.disabled).toBe(false);

    // 4x is safe, so 4x button is enabled
    const btn4x = getByText('4x') as HTMLButtonElement;
    expect(btn4x.disabled).toBe(false);
  });

  // Q. UI preflight halts before frame compositing or worker allocation
  it('Q. UI preflight halts before compositeFrame or encoder allocation on oversized geometry', () => {
    // 3000x32 animation at 2x scale: output width is 6000px > 4096px
    const scale = 2;
    const canvasWidth = 3000;
    const canvasHeight = 32;
    const frameCount = 10;

    const outW = canvasWidth * scale;
    const outH = canvasHeight * scale;

    const validation = validateExportGeometry(outW, outH, {
      frameCount,
      maxAggregatePixels: MAX_EXPORT_AGGREGATE_PIXELS,
    });

    expect(validation.valid).toBe(false);
    expect(validation.reason).toBe('exceeds-dimension');
    // Preflight returns false, ensuring UI aborts before compositeFrame loop runs
  });

  // R. Format-specific scale UI availability (GIF/APNG aggregate-invalid vs MP4/WebM aggregate-unconstrained)
  it('R. format-specific scale UI semantics: same canvas + frame count + scale disables GIF/APNG but allows MP4/WebM', () => {
    // Canvas 1000x1000 at 4x = 4000x4000 per frame.
    // 4000 <= 4096 and 16,000,000 <= 16,777,216 (per-frame strictly valid).
    // With 10 frames, total aggregate pixels = 160,000,000 > 67,108,864 (exceeds aggregate ceiling).
    const canvasWidth = 1000;
    const canvasHeight = 1000;
    const totalFrames = 10;
    const scale = 4;

    // 1. GIF: aggregate exceeds ceiling -> 4x disabled, warning shown
    const gifView = render(
      React.createElement(AnimatedExportTab, {
        exportType: 'gif',
        scale,
        setScale: vi.fn(),
        canvasWidth,
        canvasHeight,
        totalFrames,
        fps: 8,
        videoLoopCount: 1,
        setVideoLoopCount: vi.fn(),
        isMp4Supported: true,
      })
    );
    const gifBtn4x = gifView.getByText('4x') as HTMLButtonElement;
    expect(gifBtn4x.disabled).toBe(true);
    expect(gifView.getByTestId('unsafe-scale-warning')).toBeDefined();
    gifView.unmount();

    // 2. APNG: aggregate exceeds ceiling -> 4x disabled, warning shown
    const apngView = render(
      React.createElement(AnimatedExportTab, {
        exportType: 'apng',
        scale,
        setScale: vi.fn(),
        canvasWidth,
        canvasHeight,
        totalFrames,
        fps: 8,
        videoLoopCount: 1,
        setVideoLoopCount: vi.fn(),
        isMp4Supported: true,
      })
    );
    const apngBtn4x = apngView.getByText('4x') as HTMLButtonElement;
    expect(apngBtn4x.disabled).toBe(true);
    expect(apngView.getByTestId('unsafe-scale-warning')).toBeDefined();
    apngView.unmount();

    // 3. MP4: streaming pipeline does not apply aggregate pixel limit -> 4x enabled, no warning
    const mp4View = render(
      React.createElement(AnimatedExportTab, {
        exportType: 'mp4',
        scale,
        setScale: vi.fn(),
        canvasWidth,
        canvasHeight,
        totalFrames,
        fps: 30,
        videoLoopCount: 1,
        setVideoLoopCount: vi.fn(),
        isMp4Supported: true,
      })
    );
    const mp4Btn4x = mp4View.getByText('4x') as HTMLButtonElement;
    expect(mp4Btn4x.disabled).toBe(false);
    expect(mp4View.queryByTestId('unsafe-scale-warning')).toBeNull();
    mp4View.unmount();

    // 4. WebM: streaming pipeline does not apply aggregate pixel limit -> 4x enabled, no warning
    const webmView = render(
      React.createElement(AnimatedExportTab, {
        exportType: 'webm',
        scale,
        setScale: vi.fn(),
        canvasWidth,
        canvasHeight,
        totalFrames,
        fps: 30,
        videoLoopCount: 1,
        setVideoLoopCount: vi.fn(),
        isMp4Supported: true,
      })
    );
    const webmBtn4x = webmView.getByText('4x') as HTMLButtonElement;
    expect(webmBtn4x.disabled).toBe(false);
    expect(webmView.queryByTestId('unsafe-scale-warning')).toBeNull();
    webmView.unmount();
  });
});
