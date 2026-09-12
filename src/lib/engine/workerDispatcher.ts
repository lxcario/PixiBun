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
import { morphInBetweenFramesSync, morphInBetweenFrameAtFraction } from '@/lib/ai/pixelAiEngine';
import {
  computeSeparableEDT,
  generateInflatedHeightmap,
  applyBilateralFilter,
  computeTangentNormalField,
  bakeNormalMapToRgba,
} from '@/lib/ai/math/edtNormalMap';
import { computeMinecraftSkinNormalField } from '@/lib/ai/math/minecraftSkin';
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
  steps: number = 1,
  fraction?: number
): Promise<{ width: number; height: number; data: Uint8ClampedArray }[]> {
  const worker = getOrCreateWorker();

  if (!worker) {
    if (fraction !== undefined) {
      return [morphInBetweenFrameAtFraction(frameA, frameB, fraction)];
    }
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
        fraction,
      };

      try {
        worker.postMessage(req, [dataACopy.buffer, dataBCopy.buffer]);
      } catch {
        pendingCallbacks.delete(id);
        try {
          if (fraction !== undefined) {
            resolve([morphInBetweenFrameAtFraction(frameA, frameB, fraction)]);
          } else {
            resolve(morphInBetweenFramesSync(frameA, frameB, steps));
          }
        } catch (syncErr) {
          reject(syncErr instanceof Error ? syncErr : new Error(String(syncErr)));
        }
      }
    }
  );
}

export interface EdtNormalMapOptions {
  isMinecraftSkin?: boolean;
  depthScale?: number;
}

/**
 * Offload Euclidean Distance Transform (EDT) and Normal Map baking to Web Worker,
 * with zero-copy Transferable ArrayBuffers and automatic synchronous fallback.
 */
export async function runEdtNormalMapInWorker(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  options: EdtNormalMapOptions = {}
): Promise<{ width: number; height: number; data: Uint8ClampedArray }> {
  const worker = getOrCreateWorker();

  const runSync = () => {
    const isOpaque = (x: number, y: number) => {
      if (x < 0 || x >= width || y < 0 || y >= height) return false;
      return rgba[(y * width + x) * 4 + 3] > 10;
    };
    const normalField = options.isMinecraftSkin
      ? computeMinecraftSkinNormalField(width, height)
      : computeTangentNormalField(
          applyBilateralFilter(
            generateInflatedHeightmap(
              computeSeparableEDT(isOpaque, width, height),
              width,
              height,
              0.5
            ),
            width,
            height,
            1.5,
            2.0
          ),
          width,
          height,
          options.depthScale ?? 2.0
        );
    const data = bakeNormalMapToRgba(normalField, width, height, isOpaque);
    return { width, height, data };
  };

  if (!worker) {
    return runSync();
  }

  const id = getNextId();
  // Clone buffer to avoid detaching caller's live buffer on main thread
  const bufferCopy = (rgba.buffer as ArrayBuffer).slice(0);

  return new Promise<{ width: number; height: number; data: Uint8ClampedArray }>(
    (resolve, reject) => {
      pendingCallbacks.set(id, {
        resolve: (val: unknown) =>
          resolve(val as { width: number; height: number; data: Uint8ClampedArray }),
        reject,
      });

      const req: HeavyWorkerRequest = {
        id,
        type: 'edtNormalMap',
        buffer: bufferCopy,
        width,
        height,
        isMinecraftSkin: options.isMinecraftSkin,
        depthScale: options.depthScale,
      };

      try {
        worker.postMessage(req, [bufferCopy]);
      } catch {
        pendingCallbacks.delete(id);
        try {
          resolve(runSync());
        } catch (syncErr) {
          reject(syncErr instanceof Error ? syncErr : new Error(String(syncErr)));
        }
      }
    }
  );
}

