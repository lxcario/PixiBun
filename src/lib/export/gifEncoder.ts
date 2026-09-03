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

/**
 * Extracts scaled RawFrameData array from a list of HTMLCanvasElements.
 */
export function extractScaledRawFrames(
  frameCanvases: HTMLCanvasElement[],
  scale: number = 1
): RawFrameData[] {
  if (frameCanvases.length === 0) return [];
  const width = frameCanvases[0].width * scale;
  const height = frameCanvases[0].height * scale;

  const rawFrames: RawFrameData[] = [];

  for (let i = 0; i < frameCanvases.length; i++) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(frameCanvases[i], 0, 0, width, height);

    const imageData = ctx.getImageData(0, 0, width, height);
    rawFrames.push({
      width,
      height,
      data: imageData.data,
    });
  }

  return rawFrames;
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
  return new Blob([gifUint8 as unknown as BlobPart], { type: 'image/gif' });
}

/**
 * Synchronous legacy wrapper for backward compatibility and tests.
 */
export function createAnimatedGifBlob(
  frameCanvases: HTMLCanvasElement[],
  fps: number,
  scale: number = 1,
  delays?: number[]
): Blob {
  const rawFrames = extractScaledRawFrames(frameCanvases, scale);
  const gifUint8 = encodeGifRawFrames(rawFrames, fps, undefined, delays);
  return new Blob([gifUint8 as unknown as BlobPart], { type: 'image/gif' });
}
