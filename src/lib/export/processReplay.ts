/**
 * Process Replay Export Engine ("Speedpaint" Timelapse Generator).
 *
 * Reuses the local-first history engine's per-stroke ring buffer snapshots
 * to compile a shareable timelapse animation of the creation process.
 * Fully DOM-independent and Web Worker / Node test friendly.
 */

import { HistoryStep } from '@/lib/engine/historyEngine';
import { RawFrameData, encodeGifRawFrames } from './gifEncoderCore';

export interface ProcessReplayOptions {
  fps?: number; // Frames per second (default: 12)
  scale?: number; // Output scaling factor (default: 1)
  holdLastFrameMs?: number; // Milliseconds to pause on the finished artwork (default: 1000)
  onProgress?: (current: number, total: number) => void;
  signal?: AbortSignal;
}

/**
 * Extracts scaled RawFrameData array directly from HistoryStep snapshots
 * with high-performance nearest-neighbor pixel expansion (zero DOM dependency).
 */
export function convertHistoryToRawFrames(
  steps: readonly HistoryStep[],
  scale: number = 1
): RawFrameData[] {
  if (!steps || steps.length === 0) return [];

  const s = Math.max(1, Math.floor(scale));
  const rawFrames: RawFrameData[] = [];

  for (const step of steps) {
    if (step.type === 'structural' || !step.imageData) continue;
    const srcW = step.imageData.width;
    const srcH = step.imageData.height;
    const srcData = step.imageData.data;

    if (s === 1) {
      rawFrames.push({
        width: srcW,
        height: srcH,
        data: new Uint8ClampedArray(srcData),
      });
      continue;
    }

    const dstW = srcW * s;
    const dstH = srcH * s;
    const dstData = new Uint8ClampedArray(dstW * dstH * 4);

    for (let dy = 0; dy < dstH; dy++) {
      const sy = Math.floor(dy / s);
      for (let dx = 0; dx < dstW; dx++) {
        const sx = Math.floor(dx / s);
        const srcIdx = (sy * srcW + sx) * 4;
        const dstIdx = (dy * dstW + dx) * 4;
        dstData[dstIdx] = srcData[srcIdx];
        dstData[dstIdx + 1] = srcData[srcIdx + 1];
        dstData[dstIdx + 2] = srcData[srcIdx + 2];
        dstData[dstIdx + 3] = srcData[srcIdx + 3];
      }
    }

    rawFrames.push({
      width: dstW,
      height: dstH,
      data: dstData,
    });
  }

  return rawFrames;
}

/**
 * Converts a sequence of historical undo snapshots into an array of HTMLCanvasElements
 * when a DOM environment is available.
 */
export function convertHistoryToCanvases(steps: readonly HistoryStep[]): HTMLCanvasElement[] {
  if (typeof document === 'undefined' || !steps || steps.length === 0) return [];

  const canvases: HTMLCanvasElement[] = [];

  for (const step of steps) {
    if (step.type === 'structural' || !step.imageData) continue;
    const canvas = document.createElement('canvas');
    canvas.width = step.imageData.width;
    canvas.height = step.imageData.height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.imageSmoothingEnabled = false;
      ctx.putImageData(step.imageData, 0, 0);
      canvases.push(canvas);
    }
  }

  return canvases;
}

/**
 * Generates an animated GIF Blob representing the drawing progression (speedpaint)
 * from captured undo history snapshots.
 *
 * @param steps Array of HistoryStep snapshots from historyEngine.getHistory()
 * @param options Configuration options (fps, scale, holdLastFrameMs, onProgress, signal)
 * @returns Promise resolving to an animated GIF Blob
 */
export async function exportProcessReplayGifAsync(
  steps: readonly HistoryStep[],
  options: ProcessReplayOptions = {}
): Promise<Blob> {
  const scale = Math.max(1, Math.min(16, options.scale ?? 1));
  const rawFrames = convertHistoryToRawFrames(steps, scale);

  if (rawFrames.length === 0) {
    throw new Error('Cannot export process replay: history contains no drawable steps.');
  }

  if (options.signal?.aborted) {
    throw new DOMException('Process replay export aborted', 'AbortError');
  }

  const fps = Math.max(1, Math.min(60, options.fps ?? 12));
  const holdLastFrameMs = options.holdLastFrameMs ?? 1000;

  // Calculate per-frame delays in hundredths of a second (10ms units per GIF89a spec)
  const defaultDelayUnits = Math.max(1, Math.round(100 / fps));
  const delays = rawFrames.map((_, idx) => {
    if (idx === rawFrames.length - 1 && holdLastFrameMs > 0) {
      return Math.max(1, Math.round(holdLastFrameMs / 10));
    }
    return defaultDelayUnits;
  });

  const gifBytes = encodeGifRawFrames(rawFrames, fps, options.onProgress, delays);
  return new Blob([gifBytes as unknown as BlobPart], { type: 'image/gif' });
}
