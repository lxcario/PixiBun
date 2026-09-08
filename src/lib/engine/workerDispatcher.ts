/**
 * workerDispatcher.ts
 * Typesafe Web Worker dispatcher for compute-heavy routines:
 * - RotSprite 8x upscale & majority-voting
 * - WaveFunctionCollapse constraint-satisfaction texture synthesis
 * - Optical Flow & SDF In-Between frame morphing
 *
 * Automatically falls back to synchronous main-thread execution when running
 * in environments without Web Worker support (Node.js, Vitest, SSR, or restrictive CSP).
 */

import { rotSprite, PixelBuffer } from '@/lib/canvas/rotSprite';
import { synthesizeWfc, WfcInput, WfcOptions, WfcResult } from '@/lib/procedural/waveFunctionCollapse';
import { morphInBetweenFramesSync } from '@/lib/ai/pixelAiEngine';
import type { HeavyWorkerRequest, HeavyWorkerResponse } from '@/workers/heavyCompute.worker';

let sharedWorker: Worker | null = null;
let pendingCallbacks = new Map<
  string,
  {
    resolve: (val: unknown) => void;
    reject: (err: Error) => void;
  }
>();

function getOrCreateWorker(): Worker | null {
  if (typeof window === 'undefined' || typeof Worker === 'undefined') {
    return null;
  }

  if (!sharedWorker) {
    try {
      sharedWorker = new Worker(
        new URL('../../workers/heavyCompute.worker.ts', import.meta.url),
        { type: 'module' }
      );

      sharedWorker.onmessage = (e: MessageEvent<HeavyWorkerResponse>) => {
        const data = e.data;
        if (!data || !data.id) return;
        const cb = pendingCallbacks.get(data.id);
        if (!cb) return;
        pendingCallbacks.delete(data.id);

        if (data.type === 'error') {
          cb.reject(new Error(data.message));
        } else {
          cb.resolve(data.result);
        }
      };

      sharedWorker.onerror = (_err) => {
        // Reject all pending and terminate
        const oldCallbacks = pendingCallbacks;
        pendingCallbacks = new Map();
        oldCallbacks.forEach((cb) => cb.reject(new Error('Worker encountered fatal error')));
        sharedWorker?.terminate();
        sharedWorker = null;
      };
    } catch {
      sharedWorker = null;
    }
  }

  return sharedWorker;
}

let nextReqId = 1;
function getNextId(): string {
  return `req_${Date.now()}_${nextReqId++}`;
}

/**
 * Offload RotSprite 8x to Web Worker, with fallback to synchronous execution.
 */
export async function runRotSpriteInWorker(
  src: PixelBuffer,
  angleRad: number,
  pivotX?: number,
  pivotY?: number,
  targetW?: number,
  targetH?: number,
  outPivotX?: number,
  outPivotY?: number
): Promise<PixelBuffer> {
  const worker = getOrCreateWorker();

  if (!worker) {
    return rotSprite(src, angleRad, pivotX, pivotY, targetW, targetH, outPivotX, outPivotY);
  }

  const id = getNextId();
  // Clone data buffer so the source isn't detached if caller needs it
  const dataCopy = new Uint8ClampedArray(src.data);

  return new Promise<PixelBuffer>((resolve, reject) => {
    pendingCallbacks.set(id, {
      resolve: (val: unknown) => resolve(val as PixelBuffer),
      reject,
    });

    const req: HeavyWorkerRequest = {
      id,
      type: 'rotSprite',
      data: dataCopy,
      width: src.width,
      height: src.height,
      angleRad,
      pivotX,
      pivotY,
      targetW,
      targetH,
      outPivotX,
      outPivotY,
    };

    try {
      worker.postMessage(req, [dataCopy.buffer]);
    } catch {
      pendingCallbacks.delete(id);
      // Fallback to sync
      try {
        resolve(rotSprite(src, angleRad, pivotX, pivotY, targetW, targetH, outPivotX, outPivotY));
      } catch (syncErr) {
        reject(syncErr instanceof Error ? syncErr : new Error(String(syncErr)));
      }
    }
  });
}

/**
 * Offload WaveFunctionCollapse synthesis to Web Worker, with fallback to synchronous execution.
 */
export async function runWfcInWorker(
  input: WfcInput,
  options?: WfcOptions
): Promise<WfcResult> {
  const worker = getOrCreateWorker();

  if (!worker) {
    return synthesizeWfc(input, options);
  }

  const id = getNextId();
  const sampleCopy = new Uint8ClampedArray(input.sampleData);

  return new Promise<WfcResult>((resolve, reject) => {
    pendingCallbacks.set(id, {
      resolve: (val: unknown) => resolve(val as WfcResult),
      reject,
    });

    const req: HeavyWorkerRequest = {
      id,
      type: 'wfc',
      input: {
        ...input,
        sampleData: sampleCopy,
      },
      options,
    };

    try {
      worker.postMessage(req, [sampleCopy.buffer]);
    } catch {
      pendingCallbacks.delete(id);
      try {
        resolve(synthesizeWfc(input, options));
      } catch (syncErr) {
        reject(syncErr instanceof Error ? syncErr : new Error(String(syncErr)));
      }
    }
  });
}

/**
 * Offload In-Between Frame Morphing to Web Worker, with fallback to synchronous execution.
 */
export async function runMorphInWorker(
  frameA: { width: number; height: number; data: Uint8ClampedArray },
  frameB: { width: number; height: number; data: Uint8ClampedArray },
  steps: number = 1
): Promise<{ width: number; height: number; data: Uint8ClampedArray }[]> {
  const worker = getOrCreateWorker();

  if (!worker) {
    return morphInBetweenFramesSync(frameA, frameB, steps);
  }

  const id = getNextId();
  const dataACopy = new Uint8ClampedArray(frameA.data);
  const dataBCopy = new Uint8ClampedArray(frameB.data);

  return new Promise<{ width: number; height: number; data: Uint8ClampedArray }[]>(
    (resolve, reject) => {
      pendingCallbacks.set(id, {
        resolve: (val: unknown) =>
          resolve(val as { width: number; height: number; data: Uint8ClampedArray }[]),
        reject,
      });

      const req: HeavyWorkerRequest = {
        id,
        type: 'morph',
        frameA: { width: frameA.width, height: frameA.height, data: dataACopy },
        frameB: { width: frameB.width, height: frameB.height, data: dataBCopy },
        steps,
      };

      try {
        worker.postMessage(req, [dataACopy.buffer, dataBCopy.buffer]);
      } catch {
        pendingCallbacks.delete(id);
        try {
          resolve(morphInBetweenFramesSync(frameA, frameB, steps));
        } catch (syncErr) {
          reject(syncErr instanceof Error ? syncErr : new Error(String(syncErr)));
        }
      }
    }
  );
}
