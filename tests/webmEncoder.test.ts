import { describe, it, expect, vi } from 'vitest';
import { exportAnimationToWebmAsync } from '@/lib/export/webmEncoder';

function createMockCanvas(width: number, height: number): HTMLCanvasElement {
  return {
    width,
    height,
    getContext: vi.fn().mockReturnValue({
      clearRect: vi.fn(),
      drawImage: vi.fn(),
      imageSmoothingEnabled: true,
    }),
  } as unknown as HTMLCanvasElement;
}

describe('Phase 37.3: WebM Video Export Engine', () => {
  it('throws an error if no frames are provided', async () => {
    await expect(exportAnimationToWebmAsync([])).rejects.toThrow(
      'Cannot export WebM: no frames provided.'
    );
  });

  it('rejects immediately when AbortSignal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    const frames = [createMockCanvas(16, 16)];
    await expect(
      exportAnimationToWebmAsync(frames, { signal: controller.signal })
    ).rejects.toThrow('WebM export aborted');
  });

  it('exports a valid WebM Blob and reports progress in test environment', async () => {
    const frames = [
      createMockCanvas(32, 32),
      createMockCanvas(32, 32),
    ];

    const onProgress = vi.fn();
    const blob = await exportAnimationToWebmAsync(frames, {
      fps: 24,
      scale: 2,
      durationsMs: [100, 200],
      loopCount: 1,
      onProgress,
    });

    expect(blob).toBeDefined();
    expect(blob.type).toBe('video/webm');
    expect(blob.size).toBeGreaterThan(0);
    expect(onProgress).toHaveBeenCalled();
  });

  it('properly drives mock MediaRecorder when available in browser context', async () => {
    const origWindow = globalThis.window;
    const origMediaRecorder = (globalThis as unknown as { MediaRecorder?: unknown }).MediaRecorder;

    let mockRecorderInstance: {
      state: string;
      start: () => void;
      stop: () => void;
      ondataavailable: ((e: { data: Blob }) => void) | null;
      onstop: (() => void) | null;
      onerror: (() => void) | null;
    } | null = null;

    class MockMediaRecorder {
      state = 'inactive';
      ondataavailable: ((e: { data: Blob }) => void) | null = null;
      onstop: (() => void) | null = null;
      onerror: (() => void) | null = null;

      static isTypeSupported() {
        return true;
      }

      constructor() {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        mockRecorderInstance = this;
      }

      start() {
        this.state = 'recording';
      }

      stop() {
        this.state = 'inactive';
        if (this.ondataavailable) {
          this.ondataavailable({ data: new Blob(['webm-data'], { type: 'video/webm' }) });
        }
        if (this.onstop) {
          this.onstop();
        }
      }
    }

    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn().mockReturnValue({
        clearRect: vi.fn(),
        drawImage: vi.fn(),
        imageSmoothingEnabled: true,
      }),
      captureStream: vi.fn().mockReturnValue({}),
    };

    const origDocument = (globalThis as unknown as { document?: unknown }).document;

    (globalThis as unknown as { window: unknown }).window = {
      MediaRecorder: MockMediaRecorder,
      document: {
        createElement: vi.fn().mockReturnValue(mockCanvas),
      },
    };
    (globalThis as unknown as { MediaRecorder: unknown }).MediaRecorder = MockMediaRecorder;
    (globalThis as unknown as { document: unknown }).document = {
      createElement: vi.fn().mockReturnValue(mockCanvas),
    };

    try {
      const frames = [createMockCanvas(16, 16)];
      const blobPromise = exportAnimationToWebmAsync(frames, {
        fps: 30,
        scale: 1,
        durationsMs: [10],
        loopCount: 1,
      });

      const resultBlob = await blobPromise;
      expect(resultBlob.type).toBe('video/webm');
      expect(mockRecorderInstance).not.toBeNull();
    } finally {
      (globalThis as unknown as { window: unknown }).window = origWindow;
      (globalThis as unknown as { MediaRecorder: unknown }).MediaRecorder = origMediaRecorder;
      (globalThis as unknown as { document?: unknown }).document = origDocument;
    }
  });
});
