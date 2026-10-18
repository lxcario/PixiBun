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

import { getVideoRecordingMimeType, recordCanvasVideo } from './videoRecorder';
import { awaitVideoOperation } from './videoOperation';
import { muxToMp4Blob, Mp4MuxerSample } from './isobmffWriter';
import { validateExportGeometry } from './exportGeometryValidation';
import { withExportMemory } from './exportMemory';

export interface Mp4ExportOptions {
  fps?: number; // Target video frame rate (default: 30)
  scale?: number; // Integer scaling factor (default: 4)
  delays?: number[]; // Per-frame durations in hundredths of a second (10ms units)
  durationsMs?: number[]; // Per-frame durations in milliseconds
  loopCount?: number; // Number of animation cycles to record (default: 2)
  onProgress?: (current: number, total: number) => void;
  signal?: AbortSignal;
}

interface WebCodecsWindow extends Window {
  VideoEncoder?: { isConfigSupported?: (config: unknown) => Promise<{ supported?: boolean }>; new (init: { output: (chunk: unknown, metadata?: unknown) => void; error: (e: unknown) => void }): {
    configure: (config: unknown) => void;
    encode: (frame: unknown, options?: { keyFrame?: boolean }) => void;
    flush: () => Promise<void>;
    close: () => void;
  }; };
  VideoFrame?: new (source: CanvasImageSource, init: { timestamp: number; duration: number }) => { close: () => void };
}

/**
 * Checks if in-browser MP4 (H.264) video encoding is supported via WebCodecs VideoEncoder
 * or fallback MediaRecorder with Canvas captureStream.
 */
export function isMp4ExportSupported(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false;
  }
  // Synchronous API-presence hint. UI/export must also probe the exact config.
  if (
    typeof (window as WebCodecsWindow).VideoEncoder === 'function' &&
    typeof (window as WebCodecsWindow).VideoFrame === 'function'
  ) {
    return true;
  }

  return getVideoRecordingMimeType('mp4') !== null;
}

/**
 * The H.264 configuration every MP4 path uses, so the support probe, the trial encode
 * and the export test the same encoder. Software encoding: on one Windows machine the
 * hardware encoder began writing limited-range colour that decoded red as 233,0,2, with
 * no change in PixiBun. Pixel-art videos are small enough that the software encoder is
 * quick, and it gives the same colours on every machine.
 */
const H264 = { codec: 'avc1.42001f', bitrate: 2_000_000, avc: { format: 'avc' }, hardwareAcceleration: 'prefer-software' } as const;

const trialEncodes = new Map<string, Promise<boolean>>();

/**
 * Encodes one small frame with the given configuration. Some browsers report an
 * H.264 configuration as supported and then fail every encode (Firefox without
 * its H.264 plugin), so support is only claimed once a real chunk comes out.
 */
function trialEncode(config: { width: number; height: number; framerate: number } & Record<string, unknown>): Promise<boolean> {
  const key = `${config.width}x${config.height}@${config.framerate}`;
  const cached = trialEncodes.get(key);
  if (cached) return cached;
  const attempt = (async () => {
    const { VideoEncoder: Encoder, VideoFrame: Frame } = window as WebCodecsWindow;
    if (!Encoder || !Frame) return false;
    let chunks = 0, failed = false;
    const encoder = new Encoder({ output: () => { chunks += 1; }, error: () => { failed = true; } });
    let frame: { close: () => void } | undefined;
    try {
      encoder.configure(config);
      const canvas = document.createElement('canvas');
      canvas.width = config.width; canvas.height = config.height;
      frame = new Frame(canvas, { timestamp: 0, duration: 33_333 });
      encoder.encode(frame, { keyFrame: true });
      frame.close(); frame = undefined;
      await awaitVideoOperation(encoder.flush());
      return !failed && chunks > 0;
    } catch {
      return false;
    } finally {
      try { frame?.close(); } catch { /* already closed */ }
      try { encoder.close(); } catch { /* a failed encoder may already be closed */ }
    }
  })();
  trialEncodes.set(key, attempt);
  return attempt;
}

/** Exact configuration probe for export controls; API presence alone is insufficient. */
export async function probeMp4ExportSupport(width: number, height: number, fps = 30): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const encoder = (window as WebCodecsWindow).VideoEncoder;
  if (encoder?.isConfigSupported && (window as WebCodecsWindow).VideoFrame) {
    try {
      const config = { ...H264, width: (width + 1) & ~1, height: (height + 1) & ~1, framerate: fps };
      if ((await awaitVideoOperation(encoder.isConfigSupported(config))).supported
        && await trialEncode({ ...config, width: 16, height: 16 })) return true;
    } catch { /* Check recording fallback independently. */ }
  }
  return getVideoRecordingMimeType('mp4') !== null;
}

/** Test seam: forget earlier trial encodes. */
export function resetMp4ProbeCache(): void {
  trialEncodes.clear();
}

async function exportAnimationWithWebCodecsAsync(
  frameCanvases: HTMLCanvasElement[],
  width: number,
  height: number,
  drawWidth: number,
  drawHeight: number,
  fps: number,
  loopCount: number,
  frameDelaysMs: number[],
  options: Mp4ExportOptions
): Promise<Blob> {
  const VideoEncoderClass = (window as WebCodecsWindow).VideoEncoder;
  const VideoFrameClass = (window as WebCodecsWindow).VideoFrame;
  if (!VideoEncoderClass || !VideoFrameClass) throw new Error('WebCodecs is unavailable');

  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = width;
  exportCanvas.height = height;
  const ctx = exportCanvas.getContext('2d');
  if (!ctx) throw new Error('Failed to acquire canvas context');
  ctx.imageSmoothingEnabled = false;

  const samples: Mp4MuxerSample[] = [];
  let avcCData: Uint8Array | null = null;
  let encoderError: Error | null = null;

  const encoder = new VideoEncoderClass({
    output: (rawChunk: unknown, rawMeta: unknown) => {
      const chunk = rawChunk as { byteLength: number; duration?: number; type: string; copyTo: (dest: Uint8Array) => void };
      const metadata = rawMeta as { decoderConfig?: { description?: ArrayBuffer | Uint8Array } } | undefined;

      if (metadata?.decoderConfig?.description) {
        avcCData = new Uint8Array(metadata.decoderConfig.description);
      }
      const data = new Uint8Array(chunk.byteLength);
      chunk.copyTo(data);
      samples.push({
        data,
        durationMs: Math.max(1, Math.round((chunk.duration || 0) / 1000)),
        isKey: chunk.type === 'key',
      });
    },
    error: (e: unknown) => {
      encoderError = e as Error;
    },
  });

  try {
    const config = { ...H264, width, height, framerate: fps };
    if (!VideoEncoderClass.isConfigSupported || !(await awaitVideoOperation(VideoEncoderClass.isConfigSupported(config), options.signal)).supported) {
      throw new Error('The requested H.264 configuration is unsupported.');
    }
    if (options.signal?.aborted) throw new DOMException('MP4 export aborted', 'AbortError');
    encoder.configure(config);

    let currentTimestampUs = 0;
    let framesProcessed = 0;
    const totalFrames = frameCanvases.length * loopCount;

    for (let loop = 0; loop < loopCount; loop++) {
      for (let f = 0; f < frameCanvases.length; f++) {
        if (options.signal?.aborted) {
          throw new DOMException('MP4 export aborted', 'AbortError');
        }
        if (encoderError) throw encoderError;

        const durationMs = frameDelaysMs[f];
        const durationUs = durationMs * 1000;

        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(frameCanvases[f], 0, 0, drawWidth, drawHeight);

        const videoFrame = new VideoFrameClass(exportCanvas, {
          timestamp: currentTimestampUs,
          duration: durationUs,
        });

        const isKey = loop === 0 && f === 0;
        try {
          encoder.encode(videoFrame, { keyFrame: isKey });
        } finally {
          videoFrame.close();
        }

        currentTimestampUs += durationUs;
        framesProcessed++;
        options.onProgress?.(framesProcessed, totalFrames);
        if (framesProcessed % 16 === 0) await new Promise<void>(resolve => setTimeout(resolve, 0));
      }
    }

    await awaitVideoOperation(encoder.flush(), options.signal);

    if (options.signal?.aborted) throw new DOMException('MP4 export aborted', 'AbortError');
    if (encoderError) throw encoderError;
    if (samples.length === 0) throw new Error('MP4 encoder produced no samples.');
    if (!avcCData) {
      throw new Error('WebCodecs encoder did not emit AVCDecoderConfigurationRecord');
    }

    return muxToMp4Blob({
      width,
      height,
      timescale: 1000,
      avcCData,
      samples,
    });
  } finally {
    try { encoder.close(); } catch { /* A failed encoder may already be closed. */ }
  }
}

/**
 * Encodes an array of frame canvases into an MP4 (H.264) video Blob.
 *
 * @param frameCanvases Sequence of HTMLCanvasElements representing animation frames
 * @param options Configuration options (fps, scale, durationsMs, loopCount, onProgress, signal)
 * @returns Promise resolving to an MP4 video Blob (MIME type: 'video/mp4')
 */
export async function exportAnimationToMp4Async(...args: Parameters<typeof encodeMp4>): Promise<Blob> {
  return withExportMemory(args[0], Math.max(1, Math.min(16, args[1]?.scale ?? 4)), () => encodeMp4(...args), undefined, 'MP4');
}

async function encodeMp4(
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
  const drawWidth = frameCanvases[0].width * scale;
  const drawHeight = frameCanvases[0].height * scale;
  const width = (drawWidth + 1) & ~1;
  const height = (drawHeight + 1) & ~1;

  const validation = validateExportGeometry(width, height);
  if (!validation.valid) {
    throw new RangeError(`MP4 export aborted: ${validation.error}`);
  }

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

  // 1. First-class Pure-TS WebCodecs Fast-Start Path
  if (
    typeof window !== 'undefined' &&
    typeof (window as WebCodecsWindow).VideoEncoder === 'function' &&
    typeof (window as WebCodecsWindow).VideoFrame === 'function'
  ) {
    try {
      return await exportAnimationWithWebCodecsAsync(
        frameCanvases,
        width,
        height,
        drawWidth,
        drawHeight,
        fps,
        loopCount,
        frameDelaysMs,
        options
      );
    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') throw err;
      console.warn('WebCodecs MP4 encoding failed, falling back to MediaRecorder:', err);
    }
  }

  const mimeType = getVideoRecordingMimeType('mp4');
  if (!mimeType) throw new Error('MP4 recording is unsupported in this browser. Choose WebM, GIF / APNG instead.');
  return recordCanvasVideo(frameCanvases, width, height, drawWidth, drawHeight, fps, loopCount,
    frameDelaysMs, mimeType, options);
}
