/**
 * In-Browser Speedpaint MP4 Video Exporter for PixiBun Atelier.
 *
 * Compiles undo history snapshots from the local-first history engine
 * into an animated MP4 timelapse video of the artwork's creation process.
 */

import { HistoryStep, PixelHistoryStep } from '@/lib/engine/historyEngine';
import { exportAnimationToMp4Async, Mp4ExportOptions } from './mp4Encoder';
import { convertHistoryToCanvases } from './processReplay';

export interface SpeedpaintMp4Options {
  fps?: number; // Playback speed in frames per second (default: 12)
  scale?: number; // Integer output scaling factor (default: 2)
  holdLastFrameMs?: number; // Hold duration on the finished artwork in ms (default: 1000)
  signal?: AbortSignal;
  onProgress?: (current: number, total: number) => void;
}

/**
 * Encodes an array of HistoryStep snapshots into an animated MP4 timelapse Blob.
 *
 * @param steps Array of HistoryStep snapshots from historyEngine.getHistory()
 * @param options Timing, scaling, and progress callback configurations
 * @returns Promise resolving to an MP4 video Blob (MIME type: 'video/mp4')
 */
export async function exportProcessReplayMp4Async(
  steps: readonly HistoryStep[],
  options: SpeedpaintMp4Options = {}
): Promise<Blob> {
  if (!steps || steps.length === 0) {
    throw new Error('Cannot export speedpaint MP4: history contains no steps.');
  }

  if (options.signal?.aborted) {
    throw new DOMException('Speedpaint MP4 export aborted', 'AbortError');
  }

  const fps = Math.max(1, Math.min(60, options.fps ?? 12));
  const scale = Math.max(1, Math.min(16, options.scale ?? 2));
  const holdLastFrameMs = options.holdLastFrameMs ?? 1000;

  // Convert history steps to frame canvases
  let canvases = convertHistoryToCanvases(steps);

  // Fallback if headless / no DOM: create mock canvases from step imageData
  if (canvases.length === 0) {
    canvases = steps
      .filter((s): s is PixelHistoryStep => s.type !== 'structural' && !!s.imageData)
      .map((step) => {
        const c = {
          width: step.imageData.width,
          height: step.imageData.height,
          getContext: () => ({
            getImageData: () => step.imageData,
            drawImage: () => {},
            clearRect: () => {},
          }),
        } as unknown as HTMLCanvasElement;
        return c;
      });
  }

  if (canvases.length === 0) {
    throw new Error('Cannot export speedpaint MP4: no valid image frames found in history.');
  }

  const defaultDurationMs = Math.max(16, Math.round(1000 / fps));
  const durationsMs = canvases.map((_, idx) => {
    if (idx === canvases.length - 1 && holdLastFrameMs > 0) {
      return holdLastFrameMs;
    }
    return defaultDurationMs;
  });

  const mp4Options: Mp4ExportOptions = {
    fps,
    scale,
    durationsMs,
    loopCount: 1,
    onProgress: options.onProgress,
    signal: options.signal,
  };

  return exportAnimationToMp4Async(canvases, mp4Options);
}
