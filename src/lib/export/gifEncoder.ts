// Client-side GIF89a encoder with Web Worker acceleration and main-thread fallback

import {
  encodeGifRawFrames,
  RawFrameData,
  quantizePixels,
  lzwEncode,
} from './gifEncoderCore';
import type { WorkerRequest, WorkerResponse } from './gifEncoder.worker';

export { quantizePixels, lzwEncode, encodeGifRawFrames };
export type { RawFrameData };

import { extractScaledCanvasRgba } from '@/lib/canvas/scaleCanvas';
import { validateExportGeometry } from './exportGeometryValidation';
import { MAX_EXPORT_AGGREGATE_PIXELS } from '@/config/canvasLimits';
import { toBlobPart } from './blobBytes';

/**
 * Extracts scaled RawFrameData array from a list of HTMLCanvasElements.
 */
export function extractScaledRawFrames(
  frameCanvases: HTMLCanvasElement[],
  scale: number = 1
): RawFrameData[] {
  if (frameCanvases.length === 0) return [];
  const s = Math.max(1, Math.floor(scale));
  const outW = frameCanvases[0].width * s;
  const outH = frameCanvases[0].height * s;
  const validation = validateExportGeometry(outW, outH, {
    frameCount: frameCanvases.length,
    maxAggregatePixels: MAX_EXPORT_AGGREGATE_PIXELS,
  });
  if (!validation.valid) {
    throw new RangeError(`GIF export aborted: ${validation.error}`);
  }
  return frameCanvases.map((canvas) => extractScaledCanvasRgba(canvas, s));
}

/**
 * Asynchronously encodes animation frames to a GIF Blob using a Web Worker.
 * If the worker fails to initialize (e.g. CSP, Node/Vitest, legacy browser),
 * it transparently falls back to synchronous main-thread execution with progress callbacks.
 */
export async function createAnimatedGifBlobAsync(
  frameCanvases: HTMLCanvasElement[],
  fps: number,
  scale: number = 1,
  onProgress?: (current: number, total: number) => void,
  signal?: AbortSignal,
  delays?: number[]
): Promise<Blob> {
  if (frameCanvases.length === 0) {
    throw new Error('createAnimatedGifBlobAsync requires at least 1 canvas frame.');
  }

  if (signal?.aborted) {
    throw new DOMException('GIF encoding aborted', 'AbortError');
  }

  const s = Math.max(1, Math.floor(scale));
  const outW = frameCanvases[0].width * s;
  const outH = frameCanvases[0].height * s;
  const validation = validateExportGeometry(outW, outH, {
    frameCount: frameCanvases.length,
    maxAggregatePixels: MAX_EXPORT_AGGREGATE_PIXELS,
  });
  if (!validation.valid) {
    throw new RangeError(`GIF export aborted: ${validation.error}`);
  }

  const rawFrames = extractScaledRawFrames(frameCanvases, scale);

  // Attempt Web Worker encoding first
  if (typeof window !== 'undefined' && typeof Worker !== 'undefined') {
    try {
      const blob = await new Promise<Blob>((resolve, reject) => {
        let worker: Worker | null = null;

        const cleanup = () => {
          if (signal) {
            signal.removeEventListener('abort', onAbort);
          }
          worker?.terminate();
          worker = null;
        };

        const onAbort = () => {
          cleanup();
          reject(new DOMException('GIF encoding aborted', 'AbortError'));
        };

        if (signal) {
          signal.addEventListener('abort', onAbort, { once: true });
        }

        try {
          worker = new Worker(new URL('./gifEncoder.worker.ts', import.meta.url), {
            type: 'module',
          });
        } catch (workerInitErr) {
          cleanup();
          return reject(workerInitErr);
        }

        worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
          const data = e.data;
          if (data.type === 'progress') {
            onProgress?.(data.current, data.total);
          } else if (data.type === 'done') {
            const gifBlob = new Blob([data.buffer], { type: 'image/gif' });
            cleanup();
            resolve(gifBlob);
          } else if (data.type === 'error') {
            cleanup();
            reject(new Error(data.message));
          }
        };

        worker.onerror = (err) => {
          cleanup();
          reject(err);
        };

        const message: WorkerRequest = {
          type: 'encode',
          frames: rawFrames,
          fps,
          delays,
        };

        // Transfer raw pixel buffers to the worker to avoid copy overhead
        const transferableBuffers: ArrayBuffer[] = [];
        for (const frame of rawFrames) {
          if (frame.data.buffer instanceof ArrayBuffer) {
            transferableBuffers.push(frame.data.buffer);
          }
        }

        worker.postMessage(message, transferableBuffers);
      });

      return blob;
    } catch (workerErr) {
      if (signal?.aborted) {
        throw workerErr;
      }
      console.warn('GIF Web Worker unavailable or failed, falling back to main thread encoder:', workerErr);
    }
  }

  // Main thread fallback
  const gifUint8 = encodeGifRawFrames(rawFrames, fps, onProgress, delays);
  return new Blob([toBlobPart(gifUint8)], { type: 'image/gif' });
}
