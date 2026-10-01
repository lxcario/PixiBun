/**
 * WebM Video Export Engine for PixiBun Atelier.
 *
 * Uses HTML5 Canvas captureStream and MediaRecorder with nearest-neighbor integer scaling
 * and variable per-frame duration timing (supporting Richard Williams animation holds).
 *
 * Supports AbortSignal cancellation; unsupported recording is reported explicitly.
 */

import { getVideoRecordingMimeType, recordCanvasVideo } from './videoRecorder';

export const isWebmExportSupported = (): boolean => getVideoRecordingMimeType('webm') !== null;

import { validateExportGeometry } from './exportGeometryValidation';
import { withExportMemory } from './exportMemory';

export interface WebmExportOptions {
  fps?: number; // Target video frame rate (default: 30)
  scale?: number; // Integer scaling factor (default: 4)
  delays?: number[]; // Per-frame durations in hundredths of a second (10ms units, matching GIF spec)
  durationsMs?: number[]; // Per-frame durations in milliseconds
  loopCount?: number; // Number of animation cycles to record (default: 2)
  onProgress?: (current: number, total: number) => void;
  signal?: AbortSignal;
}

/**
 * Encodes an array of frame canvases into a WebM video Blob.
 */
export async function exportAnimationToWebmAsync(...args: Parameters<typeof encodeWebm>): Promise<Blob> {
  return withExportMemory(args[0], Math.max(1, Math.min(16, args[1]?.scale ?? 4)), () => encodeWebm(...args), undefined, 'WebM');
}

async function encodeWebm(
  frameCanvases: HTMLCanvasElement[],
  options: WebmExportOptions = {}
): Promise<Blob> {
  if (!frameCanvases || frameCanvases.length === 0) {
    throw new Error('Cannot export WebM: no frames provided.');
  }

  if (options.signal?.aborted) {
    throw new DOMException('WebM export aborted', 'AbortError');
  }

  const fps = Math.max(1, Math.min(60, options.fps ?? 30));
  const scale = Math.max(1, Math.min(16, options.scale ?? 4));
  const loopCount = Math.max(1, Math.min(10, options.loopCount ?? 2));

  const width = frameCanvases[0].width * scale;
  const height = frameCanvases[0].height * scale;

  const validation = validateExportGeometry(width, height);
  if (!validation.valid) {
    throw new RangeError(`WebM export aborted: ${validation.error}`);
  }

  // Calculate millisecond delays per frame
  const frameDelaysMs: number[] = frameCanvases.map((_, idx) => {
    if (options.durationsMs && options.durationsMs[idx] !== undefined) {
      return Math.max(10, options.durationsMs[idx]);
    }
    if (options.delays && options.delays[idx] !== undefined) {
      return Math.max(10, options.delays[idx] * 10);
    }
    return Math.max(10, Math.round(1000 / fps));
  });

  const mimeType = getVideoRecordingMimeType('webm');
  if (!mimeType) throw new Error('WebM recording is unsupported in this browser. Choose GIF / APNG instead.');
  return recordCanvasVideo(frameCanvases, width, height, width, height, fps, loopCount,
    frameDelaysMs, mimeType, options);
}
