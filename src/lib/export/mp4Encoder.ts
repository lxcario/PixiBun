/**
 * In-Browser MP4 (H.264) Video Encoding Engine for PixiBun Atelier.
 *
 * Implements client-side MP4 video recording using native HTML5 Canvas
 * captureStream combined with the MediaRecorder API ('video/mp4;codecs=avc1' or 'video/mp4').
 * Supported natively in Chromium-based browsers (Chrome, Edge, Opera) and Safari 14.1+.
 * In unsupported environments (e.g. Firefox), callers should inspect `isMp4ExportSupported()`
 * and guide the user toward WebM, GIF, or APNG exports.
 *
 * Features:
 * - Variable per-frame duration timing (animation holds).
 * - Nearest-neighbor integer upscaling (1x, 2x, 4x, 8x, 16x).
 * - Multi-cycle animation looping.
 * - AbortSignal cancellation support.
 */

export interface Mp4ExportOptions {
  fps?: number; // Target video frame rate (default: 30)
  scale?: number; // Integer scaling factor (default: 4)
  delays?: number[]; // Per-frame durations in hundredths of a second (10ms units)
  durationsMs?: number[]; // Per-frame durations in milliseconds
  loopCount?: number; // Number of animation cycles to record (default: 2)
  onProgress?: (current: number, total: number) => void;
  signal?: AbortSignal;
}

/**
 * Checks if in-browser MP4 (H.264) video encoding is supported via MediaRecorder and Canvas captureStream.
 */
export function isMp4ExportSupported(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false;
  }
  const hasMediaRecorder =
    typeof (window as unknown as { MediaRecorder?: typeof MediaRecorder }).MediaRecorder !== 'undefined';
  if (!hasMediaRecorder) {
    return false;
  }
  const hasCaptureStream =
    typeof HTMLCanvasElement !== 'undefined' &&
    (typeof HTMLCanvasElement.prototype.captureStream === 'function' ||
      typeof (HTMLCanvasElement.prototype as unknown as { mozCaptureStream?: unknown }).mozCaptureStream ===
        'function');
  if (!hasCaptureStream) {
    return false;
  }
  try {
    return (
      MediaRecorder.isTypeSupported('video/mp4;codecs=avc1') ||
      MediaRecorder.isTypeSupported('video/mp4')
    );
  } catch {
    return false;
  }
}

/**
 * Encodes an array of frame canvases into an MP4 (H.264) video Blob.
 *
 * @param frameCanvases Sequence of HTMLCanvasElements representing animation frames
 * @param options Configuration options (fps, scale, durationsMs, loopCount, onProgress, signal)
 * @returns Promise resolving to an MP4 video Blob (MIME type: 'video/mp4')
 */
export async function exportAnimationToMp4Async(
  frameCanvases: HTMLCanvasElement[],
  options: Mp4ExportOptions = {}
): Promise<Blob> {
  if (!frameCanvases || frameCanvases.length === 0) {
    throw new Error('Cannot export MP4: no frames provided.');
  }

  if (options.signal?.aborted) {
    throw new DOMException('MP4 export aborted', 'AbortError');
  }

  const fps = Math.max(1, Math.min(60, options.fps ?? 30));
  const scale = Math.max(1, Math.min(16, options.scale ?? 4));
  const loopCount = Math.max(1, Math.min(10, options.loopCount ?? 2));

  // H.264 macroblock encoding and YUV 4:2:0 subsampling require even dimensions
  const width = (frameCanvases[0].width * scale + 1) & ~1;
  const height = (frameCanvases[0].height * scale + 1) & ~1;

  // Calculate millisecond durations per frame
  const frameDelaysMs: number[] = frameCanvases.map((_, idx) => {
    if (options.durationsMs && options.durationsMs[idx] !== undefined) {
      return Math.max(10, options.durationsMs[idx]);
    }
    if (options.delays && options.delays[idx] !== undefined) {
      return Math.max(10, options.delays[idx] * 10);
    }
    return Math.max(10, Math.round(1000 / fps));
  });

  if (!isMp4ExportSupported()) {
    throw new Error(
      'MP4 export is not supported in this browser environment (MediaRecorder with video/mp4 MIME type is unavailable). Please export using WebM, GIF, or APNG instead.'
    );
  }

  // Active Browser MediaRecorder Path
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = width;
  exportCanvas.height = height;
  const ctx = exportCanvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to acquire 2D canvas context for MP4 recording.');
  }
  ctx.imageSmoothingEnabled = false;

  const stream = exportCanvas.captureStream(fps);
  const mimeType = MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')
    ? 'video/mp4;codecs=avc1'
    : 'video/mp4';

  const recorder = new MediaRecorder(stream, { mimeType });
  const chunks: Blob[] = [];

  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      chunks.push(e.data);
    }
  };

  return new Promise<Blob>((resolve, reject) => {
    let isFinished = false;
    let timerId: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      if (timerId !== null) {
        clearTimeout(timerId);
        timerId = null;
      }
      if (options.signal) {
        options.signal.removeEventListener('abort', onAbort);
      }
      try {
        stream.getTracks().forEach((track) => track.stop());
      } catch {
        // ignore track stop errors
      }
    };

    const onAbort = () => {
      if (isFinished) return;
      isFinished = true;
      cleanup();
      if (recorder.state !== 'inactive') {
        recorder.stop();
      }
      reject(new DOMException('MP4 export aborted', 'AbortError'));
    };

    if (options.signal) {
      options.signal.addEventListener('abort', onAbort);
    }

    recorder.onstop = () => {
      if (isFinished) return;
      isFinished = true;
      cleanup();
      const outputBlob = new Blob(chunks, { type: 'video/mp4' });
      resolve(outputBlob);
    };

    recorder.onerror = () => {
      if (isFinished) return;
      isFinished = true;
      cleanup();
      reject(new Error('MediaRecorder encountered an error while encoding MP4.'));
    };

    try {
      recorder.start();
    } catch (err) {
      cleanup();
      reject(err);
      return;
    }

    // Playback loop pacing frames
    let currentLoop = 0;
    let currentFrame = 0;
    let framesRendered = 0;
    const totalFramesToRender = frameCanvases.length * loopCount;

    const renderNext = () => {
      if (isFinished) return;

      if (currentLoop >= loopCount) {
        // Allow buffered frames to flush before stopping recorder
        timerId = setTimeout(() => {
          if (recorder.state !== 'inactive') {
            recorder.stop();
          }
        }, 120);
        return;
      }

      const sourceCanvas = frameCanvases[currentFrame];
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(sourceCanvas, 0, 0, width, height);

      framesRendered++;
      options.onProgress?.(framesRendered, totalFramesToRender);

      const delay = frameDelaysMs[currentFrame];

      currentFrame++;
      if (currentFrame >= frameCanvases.length) {
        currentFrame = 0;
        currentLoop++;
      }

      timerId = setTimeout(renderNext, delay);
    };

    renderNext();
  });
}
