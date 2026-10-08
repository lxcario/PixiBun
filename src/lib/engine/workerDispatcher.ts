/**
 * workerDispatcher.ts
 * Typesafe Web Worker dispatcher for compute-heavy routines:
 * - RotSprite 8x upscale & majority-voting
 * - WaveFunctionCollapse constraint-satisfaction texture synthesis
 * - Optical Flow & SDF In-Between frame morphing
 * - Euclidean Distance Transform & normal map baking
 *
 * Automatically falls back to synchronous main-thread execution when running
 * in environments without Web Worker support (Node.js, Vitest, SSR, or restrictive CSP).
 *
 * Includes per-request execution timeout (default 10s), AbortSignal cancellation,
 * and deterministic crash recovery that invalidates and terminates corrupt worker instances.
 */

import { rotSprite, PixelBuffer } from '@/lib/canvas/rotSprite';
import { paethRotate } from '@/lib/canvas/paethRotation';
import { rotateNormalVectors } from '@/lib/canvas/normalMapRotation';
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
import { reserveMemory } from '@/lib/safety/memoryBudget';

export const DEFAULT_WORKER_TIMEOUT_MS = 10_000;
export const MAX_PENDING_WORKER_REQUESTS = 4;
/** Conservative work-unit admission policy, not a wall-clock latency guarantee. */
export const MAX_SYNC_FALLBACK_WORK_UNITS = 1_048_576;

function checkAbort(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException('This operation was aborted', 'AbortError');
}

function runBoundedFallback<T>(workUnits: number, signal: AbortSignal | undefined, compute: () => T): T {
  checkAbort(signal);
  if (!Number.isFinite(workUnits) || workUnits < 0 || workUnits > MAX_SYNC_FALLBACK_WORK_UNITS) {
    throw new RangeError('This operation requires a compute worker. Reduce its size or enable Web Workers.');
  }
  const result = compute();
  checkAbort(signal);
  return result;
}

function checkAdmission(signal?: AbortSignal): void {
  checkAbort(signal);
  if (pendingCallbacks.size >= MAX_PENDING_WORKER_REQUESTS) {
    throw new Error('Compute worker is busy. Wait for an operation to finish before trying again.');
  }
}

function interruptedWorkerError(): Error {
  const error = new Error('Worker terminated because another operation was cancelled or timed out. Please retry.');
  error.name = 'WorkerInterruptedError';
  return error;
}

export interface WorkerDispatcherOptions {
  timeoutMs?: number;
  signal?: AbortSignal;
}

interface PendingRequest {
  resolve: (val: unknown) => void;
  reject: (err: Error) => void;
  timerId: ReturnType<typeof setTimeout> | null;
  cleanupAbortListener?: () => void;
}

let sharedWorker: Worker | null = null;
let workerFactory: (() => Worker) | null = null;
let pendingCallbacks = new Map<string, PendingRequest>();
let workerFallbackReported = false;

function reportWorkerFallback(reason: unknown): void {
  if (typeof window === 'undefined' || workerFallbackReported) return;
  workerFallbackReported = true;
  const detail = reason instanceof Error ? reason.message : String(reason);
  console.warn('Heavy compute worker unavailable; using main-thread fallback:', detail);
  void import('@/lib/diagnostics/capture')
    .then(({ captureDiagnostic }) => captureDiagnostic({
      kind: 'error',
      message: 'Heavy compute worker unavailable; using main-thread fallback.',
      detail,
    }))
    .catch(() => {});
}

/**
 * Terminates the current worker, rejects all active in-flight requests,
 * and resets internal dispatcher state so subsequent requests can re-instantiate cleanly.
 */
function terminateWorkerAndRejectAll(error: Error): void {
  if (sharedWorker) {
    try {
      sharedWorker.terminate();
    } catch {
      // Ignore termination failure
    }
    sharedWorker = null;
  }

  const callbacksToReject = pendingCallbacks;
  pendingCallbacks = new Map();

  callbacksToReject.forEach(({ reject, timerId, cleanupAbortListener }) => {
    if (timerId !== null) clearTimeout(timerId);
    if (cleanupAbortListener) cleanupAbortListener();
    reject(error);
  });
}

function attachWorkerListeners(worker: Worker): void {
  worker.onmessage = (e: MessageEvent<HeavyWorkerResponse>) => {
    const data = e.data;
    if (!data || !data.id) return;
    const cb = pendingCallbacks.get(data.id);
    if (!cb) return;

    if (cb.timerId !== null) clearTimeout(cb.timerId);
    if (cb.cleanupAbortListener) cb.cleanupAbortListener();
    pendingCallbacks.delete(data.id);

    if (data.type === 'error') {
      cb.reject(new Error(data.message));
    } else {
      cb.resolve(data.result);
    }
  };

  worker.onerror = (err: Event | ErrorEvent) => {
    const message = 'message' in err && err.message ? err.message : 'Worker encountered fatal error';
    terminateWorkerAndRejectAll(new Error(`Worker fatal error: ${message}`));
  };
}

function getOrCreateWorker(): Worker | null {
  if (sharedWorker) {
    return sharedWorker;
  }

  if (workerFactory) {
    try {
      sharedWorker = workerFactory();
      attachWorkerListeners(sharedWorker);
      return sharedWorker;
    } catch (err) {
      sharedWorker = null;
      reportWorkerFallback(err);
      return null;
    }
  }

  const WorkerCtor =
    typeof Worker !== 'undefined'
      ? Worker
      : typeof globalThis !== 'undefined'
      ? globalThis.Worker
      : undefined;

  if (!WorkerCtor) {
    reportWorkerFallback(new Error('Web Worker API is unavailable.'));
    return null;
  }

  try {
    // Keep the constructor literal so Turbopack recognizes and bundles the
    // worker entrypoint instead of copying the TypeScript source as an asset.
    sharedWorker = new Worker(
      new URL('../../workers/heavyCompute.worker.ts', import.meta.url),
      { type: 'module' }
    );
    attachWorkerListeners(sharedWorker);
  } catch (err) {
    sharedWorker = null;
    reportWorkerFallback(err);
  }

  return sharedWorker;
}

let nextReqId = 1;
function getNextId(): string {
  return `req_${Date.now()}_${nextReqId++}`;
}

/**
 * Dispatches a typed request to the active shared worker with timeout and abort guarantees.
 */
function dispatchToWorker<T>(
  req: HeavyWorkerRequest,
  transferables: Transferable[],
  options?: WorkerDispatcherOptions
): Promise<T> {
  const worker = getOrCreateWorker();
  if (!worker) {
    throw new Error('No worker available');
  }

  const timeoutMs = options?.timeoutMs ?? DEFAULT_WORKER_TIMEOUT_MS;
  const signal = options?.signal;

  if (signal?.aborted) {
    const abortErr = new Error('This operation was aborted');
    abortErr.name = 'AbortError';
    return Promise.reject(abortErr);
  }

  return new Promise<T>((resolve, reject) => {
    let timerId: ReturnType<typeof setTimeout> | null = null;
    let cleanupAbortListener: (() => void) | undefined;

    if (timeoutMs > 0 && Number.isFinite(timeoutMs)) {
      timerId = setTimeout(() => {
        const pending = pendingCallbacks.get(req.id);
        if (!pending) return;
        pendingCallbacks.delete(req.id);
        pending.cleanupAbortListener?.();
        const timeoutError = new Error(`Worker request ${req.id} timed out after ${timeoutMs}ms`);
        timeoutError.name = 'WorkerTimeoutError';
        pending.reject(timeoutError);
        // Requests share one execution thread. A timed-out job could block every
        // queued job; interrupt peers explicitly and let the next dispatch recover.
        terminateWorkerAndRejectAll(interruptedWorkerError());
      }, timeoutMs);
    }

    if (signal) {
      const onAbort = () => {
        const pending = pendingCallbacks.get(req.id);
        if (pending) {
          if (pending.timerId !== null) clearTimeout(pending.timerId);
          pendingCallbacks.delete(req.id);
          pending.cleanupAbortListener?.();
          const abortErr = new Error('This operation was aborted');
          abortErr.name = 'AbortError';
          pending.reject(abortErr);
          terminateWorkerAndRejectAll(interruptedWorkerError());
        }
      };
      signal.addEventListener('abort', onAbort, { once: true });
      cleanupAbortListener = () => signal.removeEventListener('abort', onAbort);
    }

    pendingCallbacks.set(req.id, {
      resolve: (val: unknown) => resolve(val as T),
      reject,
      timerId,
      cleanupAbortListener,
    });

    try {
      worker.postMessage(req, transferables);
    } catch (postErr) {
      if (timerId !== null) clearTimeout(timerId);
      if (cleanupAbortListener) cleanupAbortListener();
      pendingCallbacks.delete(req.id);
      reject(postErr instanceof Error ? postErr : new Error(String(postErr)));
    }
  });
}

export interface RotSpriteWorkerOptions extends WorkerDispatcherOptions {
  outPivotX?: number;
  outPivotY?: number;
  pixelPerfect?: boolean;
  algorithm?: 'rotsprite' | 'paeth';
  isNormalMap?: boolean;
}

/**
 * Offload RotSprite 8x to Web Worker, with fallback to synchronous execution.
 */
export async function runRotSpriteInWorker(...args: Parameters<typeof computeRotSprite>): ReturnType<typeof computeRotSprite> {
  const options = typeof args[6] === 'object' ? args[6] : undefined;
  checkAdmission(options?.signal);
  const release = reserveMemory(args[0].width * args[0].height * 4 * 66 + (args[4] ?? args[0].width) * (args[5] ?? args[0].height) * 8, 'RotSprite compute');
  try { return await computeRotSprite(...args); } finally { release(); }
}

async function computeRotSprite(
  src: PixelBuffer,
  angleRad: number,
  pivotX?: number,
  pivotY?: number,
  targetW?: number,
  targetH?: number,
  outPivotXOrOptions?: number | RotSpriteWorkerOptions,
  outPivotY?: number
): Promise<PixelBuffer> {
  let outPivotX: number | undefined;
  let options: RotSpriteWorkerOptions | undefined;

  if (typeof outPivotXOrOptions === 'object' && outPivotXOrOptions !== null) {
    options = outPivotXOrOptions;
    outPivotX = options.outPivotX;
    outPivotY = options.outPivotY;
  } else {
    outPivotX = outPivotXOrOptions;
  }

  checkAdmission(options?.signal);
  const runSync = () => runBoundedFallback(src.width * src.height * 64 +
    (targetW ?? src.width) * (targetH ?? src.height), options?.signal,
    () => {
      let res = options?.algorithm === 'paeth'
        ? paethRotate(src, angleRad, pivotX, pivotY, targetW, targetH, outPivotX, outPivotY)
        : rotSprite(src, angleRad, pivotX, pivotY, targetW, targetH, outPivotX, outPivotY, options?.pixelPerfect);
      if (options?.isNormalMap) {
        res = rotateNormalVectors(res, angleRad);
      }
      return res;
    });

  const worker = getOrCreateWorker();
  if (!worker) {
    return runSync();
  }

  const id = getNextId();
  const dataCopy = new Uint8ClampedArray(src.data);
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
    pixelPerfect: options?.pixelPerfect,
    algorithm: options?.algorithm,
    isNormalMap: options?.isNormalMap,
  };

  try {
    return await dispatchToWorker<PixelBuffer>(req, [dataCopy.buffer], options);
  } catch (err) {
    if (
      err instanceof Error &&
      (err.name === 'AbortError' ||
        err.name === 'WorkerTimeoutError' ||
        err.message.includes('Worker terminated') ||
        err.message.includes('Worker fatal error'))
    ) {
      throw err;
    }
    return runSync();
  }
}

export interface WfcWorkerOptions extends WfcOptions, WorkerDispatcherOptions {}

/**
 * Offload WaveFunctionCollapse synthesis to Web Worker, with fallback to synchronous execution.
 */
export async function runWfcInWorker(...args: Parameters<typeof computeWfc>): ReturnType<typeof computeWfc> {
  checkAdmission(args[1]?.signal);
  const release = reserveMemory((args[1]?.maxWorkingSetBytes ?? 64 * 1024 * 1024) + args[0].sampleData.byteLength * 2, 'WFC compute');
  try { return await computeWfc(...args); } finally { release(); }
}

async function computeWfc(
  input: WfcInput,
  options?: WfcWorkerOptions
): Promise<WfcResult> {
  checkAdmission(options?.signal);
  const runSync = () => runBoundedFallback(input.sampleWidth * input.sampleHeight *
    input.outputWidth * input.outputHeight * (options?.symmetries ?? 8) *
    (options?.N ?? 2) ** 2 * (options?.maxRetries ?? 10), options?.signal,
    () => synthesizeWfc(input, options));
  const worker = getOrCreateWorker();
  if (!worker) {
    return runSync();
  }

  const id = getNextId();
  const sampleCopy = new Uint8ClampedArray(input.sampleData);
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
    return await dispatchToWorker<WfcResult>(req, [sampleCopy.buffer], options);
  } catch (err) {
    if (
      err instanceof Error &&
      (err.name === 'AbortError' ||
        err.name === 'WorkerTimeoutError' ||
        err.message.includes('Worker terminated') ||
        err.message.includes('Worker fatal error'))
    ) {
      throw err;
    }
    return runSync();
  }
}

export type MorphWorkerOptions = WorkerDispatcherOptions;

/**
 * Offload In-Between Frame Morphing to Web Worker, with fallback to synchronous execution.
 */
export async function runMorphInWorker(...args: Parameters<typeof computeMorph>): ReturnType<typeof computeMorph> {
  checkAdmission(args[4]?.signal);
  const release = reserveMemory(args[0].width * args[0].height * (128 + 8 * (args[3] !== undefined ? 1 : Math.max(1, args[2] ?? 1))), 'Frame morph compute');
  try { return await computeMorph(...args); } finally { release(); }
}

async function computeMorph(
  frameA: { width: number; height: number; data: Uint8ClampedArray },
  frameB: { width: number; height: number; data: Uint8ClampedArray },
  steps: number = 1,
  fraction?: number,
  options?: MorphWorkerOptions
): Promise<{ width: number; height: number; data: Uint8ClampedArray }[]> {
  checkAdmission(options?.signal);
  const runSync = () => runBoundedFallback(frameA.width * frameA.height * 256 *
    (fraction !== undefined ? 1 : Math.max(1, steps)), options?.signal,
    () => fraction !== undefined ? [morphInBetweenFrameAtFraction(frameA, frameB, fraction)]
      : morphInBetweenFramesSync(frameA, frameB, steps));
  const worker = getOrCreateWorker();
  if (!worker) {
    return runSync();
  }

  const id = getNextId();
  const dataACopy = new Uint8ClampedArray(frameA.data);
  const dataBCopy = new Uint8ClampedArray(frameB.data);
  const req: HeavyWorkerRequest = {
    id,
    type: 'morph',
    frameA: { width: frameA.width, height: frameA.height, data: dataACopy },
    frameB: { width: frameB.width, height: frameB.height, data: dataBCopy },
    steps,
    fraction,
  };

  try {
    return await dispatchToWorker<{ width: number; height: number; data: Uint8ClampedArray }[]>(
      req,
      [dataACopy.buffer, dataBCopy.buffer],
      options
    );
  } catch (err) {
    if (
      err instanceof Error &&
      (err.name === 'AbortError' ||
        err.name === 'WorkerTimeoutError' ||
        err.message.includes('Worker terminated') ||
        err.message.includes('Worker fatal error'))
    ) {
      throw err;
    }
    return runSync();
  }
}

export interface EdtNormalMapOptions extends WorkerDispatcherOptions {
  isMinecraftSkin?: boolean;
  depthScale?: number;
}

/**
 * Offload Euclidean Distance Transform (EDT) and Normal Map baking to Web Worker,
 * with a defensive input copy, Transferable ArrayBuffers, and synchronous fallback.
 */
export async function runEdtNormalMapInWorker(...args: Parameters<typeof computeEdt>): ReturnType<typeof computeEdt> {
  checkAdmission(args[3]?.signal);
  const release = reserveMemory(args[1] * args[2] * 128, 'Normal map compute');
  try { return await computeEdt(...args); } finally { release(); }
}

async function computeEdt(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  options: EdtNormalMapOptions = {}
): Promise<{ width: number; height: number; data: Uint8ClampedArray }> {
  checkAdmission(options.signal);
  const worker = getOrCreateWorker();

  const runSync = () => runBoundedFallback(width * height * 64, options.signal, () => {
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
  });

  if (!worker) {
    return runSync();
  }

  const id = getNextId();
  const bufferCopy = rgba.slice().buffer;

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
    return await dispatchToWorker<{ width: number; height: number; data: Uint8ClampedArray }>(
      req,
      [bufferCopy],
      options
    );
  } catch (err) {
    if (
      err instanceof Error &&
      (err.name === 'AbortError' ||
        err.name === 'WorkerTimeoutError' ||
        err.message.includes('Worker terminated') ||
        err.message.includes('Worker fatal error'))
    ) {
      throw err;
    }
    return runSync();
  }
}

// Test / Diagnostic helpers
export function _resetSharedWorkerForTesting(): void {
  terminateWorkerAndRejectAll(new Error('Reset for testing'));
  workerFactory = null;
  workerFallbackReported = false;
}

export function _setSharedWorkerForTesting(worker: Worker | null): void {
  if (sharedWorker && sharedWorker !== worker) {
    try {
      sharedWorker.terminate();
    } catch {
      // Ignore
    }
  }
  sharedWorker = worker;
  if (worker) {
    attachWorkerListeners(worker);
  }
}

export function _setWorkerFactoryForTesting(factory: (() => Worker) | null): void {
  workerFactory = factory;
}

export function _getPendingCallbacksCountForTesting(): number {
  return pendingCallbacks.size;
}
