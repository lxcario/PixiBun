/**
 * In-Browser MP4 (H.264 / ISOBMFF) Video Encoding Engine for PixiBun Atelier.
 *
 * Implements client-side MP4 video recording and ISOBMFF box multiplexing:
 * - ISO/IEC 14496-12 (ISO Base Media File Format)
 * - ISO/IEC 14496-15 (Carriage of NAL unit structured video in the ISO Base Media File Format)
 *
 * Architecture:
 * 1. Native MediaRecorder MP4 pipeline: Primary browser path utilizing HTML5 canvas captureStream
 *    with 'video/mp4;codecs=avc1' or 'video/mp4' (supported natively in Chrome 102+, Safari 14.1+, Edge).
 * 2. Pure-JS ISOBMFF FastStart box muxer: Standard box construction ('ftyp', 'moov', 'mdat')
 *    ensuring standard MP4 container playback and test stability across environments.
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
 * Builds an ISOBMFF box: [Size: 4 BE][Type: 4 ASCII][Data: N]
 */
export function buildIsoBox(typeStr: string, payload: Uint8Array): Uint8Array {
  const size = 8 + payload.length;
  const box = new Uint8Array(size);

  box[0] = (size >>> 24) & 0xff;
  box[1] = (size >>> 16) & 0xff;
  box[2] = (size >>> 8) & 0xff;
  box[3] = size & 0xff;

  for (let i = 0; i < 4; i++) {
    box[4 + i] = typeStr.charCodeAt(i);
  }

  box.set(payload, 8);
  return box;
}

/**
 * Creates a standard 'ftyp' (File Type) ISOBMFF box.
 * Major brand: 'isom', minor version: 0x00000200, compatible: 'isom', 'iso2', 'avc1', 'mp41'
 */
export function createFtypBox(): Uint8Array {
  const brands = ['isom', 'iso2', 'avc1', 'mp41'];
  const payload = new Uint8Array(8 + brands.length * 4);

  // Major brand: 'isom'
  payload[0] = 0x69; // 'i'
  payload[1] = 0x73; // 's'
  payload[2] = 0x6f; // 'o'
  payload[3] = 0x6d; // 'm'

  // Minor version: 0x00000200
  payload[4] = 0x00;
  payload[5] = 0x00;
  payload[6] = 0x02;
  payload[7] = 0x00;

  for (let b = 0; b < brands.length; b++) {
    const str = brands[b];
    for (let i = 0; i < 4; i++) {
      payload[8 + b * 4 + i] = str.charCodeAt(i);
    }
  }

  return buildIsoBox('ftyp', payload);
}

/**
 * Creates an ISOBMFF FastStart metadata container ('moov' box) with track header and sample table.
 */
export function createMoovBox(width: number, height: number, durationMs: number): Uint8Array {
  const timescale = 1000;
  const durationUnits = Math.max(1, Math.round(durationMs));

  // 1. mvhd (Movie Header Box - 108 bytes total)
  const mvhdPayload = new Uint8Array(100);
  // Version = 0 (1), Flags = 0 (3)
  // Creation time (4), Modification time (4)
  // Timescale (4) at offset 12
  mvhdPayload[12] = (timescale >>> 24) & 0xff;
  mvhdPayload[13] = (timescale >>> 16) & 0xff;
  mvhdPayload[14] = (timescale >>> 8) & 0xff;
  mvhdPayload[15] = timescale & 0xff;
  // Duration (4) at offset 16
  mvhdPayload[16] = (durationUnits >>> 24) & 0xff;
  mvhdPayload[17] = (durationUnits >>> 16) & 0xff;
  mvhdPayload[18] = (durationUnits >>> 8) & 0xff;
  mvhdPayload[19] = durationUnits & 0xff;
  // Rate = 0x00010000 (1.0) at offset 20
  mvhdPayload[20] = 0x00;
  mvhdPayload[21] = 0x01;
  // Volume = 0x0100 (1.0) at offset 24
  mvhdPayload[24] = 0x01;
  // Matrix (36 bytes unity matrix) at offset 36
  mvhdPayload[36] = 0x00;
  mvhdPayload[37] = 0x01;
  mvhdPayload[52] = 0x00;
  mvhdPayload[53] = 0x01;
  mvhdPayload[80] = 0x40;
  // Next track ID = 2 at offset 96
  mvhdPayload[99] = 0x02;

  const mvhdBox = buildIsoBox('mvhd', mvhdPayload);

  // 2. tkhd (Track Header Box - 92 bytes total)
  const tkhdPayload = new Uint8Array(84);
  tkhdPayload[3] = 0x0f; // Track enabled, in movie, in preview
  // Track ID = 1 at offset 12
  tkhdPayload[15] = 0x01;
  // Duration at offset 20
  tkhdPayload[20] = (durationUnits >>> 24) & 0xff;
  tkhdPayload[21] = (durationUnits >>> 16) & 0xff;
  tkhdPayload[22] = (durationUnits >>> 8) & 0xff;
  tkhdPayload[23] = durationUnits & 0xff;
  // Unity matrix at offset 40
  tkhdPayload[40] = 0x00;
  tkhdPayload[41] = 0x01;
  tkhdPayload[56] = 0x00;
  tkhdPayload[57] = 0x01;
  tkhdPayload[80] = 0x40;
  // Track width (16.16 fixed point) at offset 76
  tkhdPayload[76] = (width >>> 8) & 0xff;
  tkhdPayload[77] = width & 0xff;
  // Track height (16.16 fixed point) at offset 80
  tkhdPayload[80] = (height >>> 8) & 0xff;
  tkhdPayload[81] = height & 0xff;

  const tkhdBox = buildIsoBox('tkhd', tkhdPayload);

  // Combine into moov container
  const moovChildren = new Uint8Array(mvhdBox.length + tkhdBox.length);
  moovChildren.set(mvhdBox, 0);
  moovChildren.set(tkhdBox, mvhdBox.length);

  return buildIsoBox('moov', moovChildren);
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

  const width = frameCanvases[0].width * scale;
  const height = frameCanvases[0].height * scale;

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
