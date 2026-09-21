import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  runRotSpriteInWorker,
  runWfcInWorker,
  runMorphInWorker,
  _setSharedWorkerForTesting,
  _resetSharedWorkerForTesting,
  _setWorkerFactoryForTesting,
  _getPendingCallbacksCountForTesting,
} from '@/lib/engine/workerDispatcher';
import type { HeavyWorkerRequest } from '@/workers/heavyCompute.worker';

class MockWorker {
  public onmessage: ((e: MessageEvent) => void) | null = null;
  public onerror: ((e: Event) => void) | null = null;
  public postMessage = vi.fn();
  public terminate = vi.fn();
}

describe('workerDispatcher sync fallback and execution', () => {
  beforeEach(() => {
    _resetSharedWorkerForTesting();
  });

  afterEach(() => {
    _resetSharedWorkerForTesting();
    vi.useRealTimers();
  });

  it('runRotSpriteInWorker successfully executes via sync fallback in node/vitest', async () => {
    const data = new Uint8ClampedArray([
      255, 0, 0, 255, 0, 255, 0, 255,
      0, 0, 255, 255, 255, 255, 0, 255,
    ]);
    const src = { width: 2, height: 2, data };

    const result = await runRotSpriteInWorker(src, Math.PI / 2);
    expect(result.width).toBe(2);
    expect(result.height).toBe(2);
    expect(result.data.length).toBe(16);
  });

  it('runWfcInWorker successfully executes via sync fallback', async () => {
    const sampleData = new Uint8ClampedArray([
      255, 0, 0, 255, 0, 255, 0, 255,
      0, 0, 255, 255, 255, 255, 0, 255,
    ]);
    const input = {
      sampleData,
      sampleWidth: 2,
      sampleHeight: 2,
      outputWidth: 4,
      outputHeight: 4,
    };

    const result = await runWfcInWorker(input, { N: 2, seed: 123 });
    expect(result.width).toBe(4);
    expect(result.height).toBe(4);
    expect(result.data.length).toBe(4 * 4 * 4);
  });

  it('runMorphInWorker successfully executes via sync fallback', async () => {
    const frameA = {
      width: 4,
      height: 4,
      data: new Uint8ClampedArray(4 * 4 * 4).fill(100),
    };
    const frameB = {
      width: 4,
      height: 4,
      data: new Uint8ClampedArray(4 * 4 * 4).fill(200),
    };

    const result = await runMorphInWorker(frameA, frameB, 1);
    expect(result).toHaveLength(1);
    expect(result[0].width).toBe(4);
    expect(result[0].height).toBe(4);
  });

  it('runRotSpriteInWorker forwards expanded target dimensions and pivot coordinates', async () => {
    const data = new Uint8ClampedArray(4 * 4 * 4).fill(255);
    const src = { width: 4, height: 4, data };

    const result = await runRotSpriteInWorker(
      src,
      Math.PI / 4,
      2,
      2,
      8,
      8,
      4,
      4
    );
    expect(result.width).toBe(8);
    expect(result.height).toBe(8);
    expect(result.data.length).toBe(8 * 8 * 4);
  });
});

describe('workerDispatcher lifecycle, timeout, abort, and fatal crash recovery', () => {
  beforeEach(() => {
    _resetSharedWorkerForTesting();
  });

  afterEach(() => {
    _resetSharedWorkerForTesting();
    vi.useRealTimers();
  });

  it('dispatches to mocked worker and resolves on response message', async () => {
    const mockWorker = new MockWorker();
    _setSharedWorkerForTesting(mockWorker as unknown as Worker);

    const src = { width: 2, height: 2, data: new Uint8ClampedArray(16).fill(255) };
    const promise = runRotSpriteInWorker(src, Math.PI / 2);

    expect(mockWorker.postMessage).toHaveBeenCalledTimes(1);
    const req = mockWorker.postMessage.mock.calls[0][0] as HeavyWorkerRequest;

    // Simulate worker completion response
    mockWorker.onmessage?.({
      data: {
        id: req.id,
        type: 'rotSprite',
        result: { width: 2, height: 2, data: new Uint8ClampedArray(16).fill(128) },
      },
    } as MessageEvent);

    const result = await promise;
    expect(result.width).toBe(2);
    expect(result.data[0]).toBe(128);
    expect(_getPendingCallbacksCountForTesting()).toBe(0);
  });

  it('terminates worker and rejects all pending callbacks on worker fatal error', async () => {
    const mockWorker = new MockWorker();
    _setSharedWorkerForTesting(mockWorker as unknown as Worker);

    const src = { width: 2, height: 2, data: new Uint8ClampedArray(16).fill(255) };
    const promiseA = runRotSpriteInWorker(src, 0);
    const promiseB = runRotSpriteInWorker(src, Math.PI);

    expect(_getPendingCallbacksCountForTesting()).toBe(2);

    // Simulate fatal error on worker
    mockWorker.onerror?.(new (globalThis.ErrorEvent || Event)('error', { message: 'Out of memory in worker' } as EventInit));

    await expect(promiseA).rejects.toThrow(/Worker fatal error/i);
    await expect(promiseB).rejects.toThrow(/Worker fatal error/i);
    expect(mockWorker.terminate).toHaveBeenCalled();
    expect(_getPendingCallbacksCountForTesting()).toBe(0);
  });

  it('terminates worker and rejects all pending callbacks when a request times out', async () => {
    vi.useFakeTimers();

    const mockWorker = new MockWorker();
    _setSharedWorkerForTesting(mockWorker as unknown as Worker);

    const src = { width: 2, height: 2, data: new Uint8ClampedArray(16).fill(255) };
    const promise = runRotSpriteInWorker(src, 0, undefined, undefined, undefined, undefined, {
      timeoutMs: 100,
    });

    expect(_getPendingCallbacksCountForTesting()).toBe(1);

    // Advance time past timeout
    vi.advanceTimersByTime(150);

    await expect(promise).rejects.toThrow(/Worker terminated due to timeout/i);
    expect(mockWorker.terminate).toHaveBeenCalled();
    expect(_getPendingCallbacksCountForTesting()).toBe(0);
  });

  it('aborts individual request cleanly on AbortSignal without terminating worker or affecting concurrent requests', async () => {
    const mockWorker = new MockWorker();
    _setSharedWorkerForTesting(mockWorker as unknown as Worker);

    const controllerA = new AbortController();
    const src = { width: 2, height: 2, data: new Uint8ClampedArray(16).fill(255) };

    const promiseA = runRotSpriteInWorker(src, 0, undefined, undefined, undefined, undefined, {
      signal: controllerA.signal,
    });
    const promiseB = runRotSpriteInWorker(src, Math.PI);

    expect(_getPendingCallbacksCountForTesting()).toBe(2);
    const reqB = mockWorker.postMessage.mock.calls[1][0] as HeavyWorkerRequest;

    // Abort request A only
    controllerA.abort();

    await expect(promiseA).rejects.toThrow(/aborted/i);
    expect(mockWorker.terminate).not.toHaveBeenCalled();
    expect(_getPendingCallbacksCountForTesting()).toBe(1);

    // Request B should still resolve normally
    mockWorker.onmessage?.({
      data: {
        id: reqB.id,
        type: 'rotSprite',
        result: { width: 2, height: 2, data: new Uint8ClampedArray(16).fill(42) },
      },
    } as MessageEvent);

    const resultB = await promiseB;
    expect(resultB.data[0]).toBe(42);
    expect(_getPendingCallbacksCountForTesting()).toBe(0);
  });

  it('multi-request concurrent failure: Request A times out -> A and B rejected -> worker terminated -> Request C succeeds on fresh worker', async () => {
    vi.useFakeTimers();

    const createdWorkers: MockWorker[] = [];
    _setWorkerFactoryForTesting(() => {
      const w = new MockWorker();
      createdWorkers.push(w);
      return w as unknown as Worker;
    });

    const src = { width: 2, height: 2, data: new Uint8ClampedArray(16).fill(255) };

    // Request A has 100ms timeout, Request B has 500ms timeout
    const promiseA = runRotSpriteInWorker(src, 0, undefined, undefined, undefined, undefined, {
      timeoutMs: 100,
    });
    const promiseB = runRotSpriteInWorker(src, Math.PI, undefined, undefined, undefined, undefined, {
      timeoutMs: 500,
    });

    expect(createdWorkers.length).toBe(1);
    const firstWorker = createdWorkers[0];
    expect(_getPendingCallbacksCountForTesting()).toBe(2);

    // Advance 120ms: Request A times out
    vi.advanceTimersByTime(120);

    // Both A and B MUST be rejected because shared worker is invalidated
    await expect(promiseA).rejects.toThrow(/Worker terminated due to timeout on request/i);
    await expect(promiseB).rejects.toThrow(/Worker terminated due to timeout on request/i);
    expect(firstWorker.terminate).toHaveBeenCalled();
    expect(_getPendingCallbacksCountForTesting()).toBe(0);

    // Subsequent Request C should instantiate a fresh worker
    const promiseC = runRotSpriteInWorker(src, Math.PI / 2);
    expect(createdWorkers.length).toBe(2);
    const secondWorker = createdWorkers[1];
    expect(secondWorker).not.toBe(firstWorker);

    const reqC = secondWorker.postMessage.mock.calls[0][0] as HeavyWorkerRequest;
    secondWorker.onmessage?.({
      data: {
        id: reqC.id,
        type: 'rotSprite',
        result: { width: 2, height: 2, data: new Uint8ClampedArray(16).fill(99) },
      },
    } as MessageEvent);

    const resultC = await promiseC;
    expect(resultC.data[0]).toBe(99);
    expect(secondWorker.terminate).not.toHaveBeenCalled();
    expect(_getPendingCallbacksCountForTesting()).toBe(0);
  });
});
