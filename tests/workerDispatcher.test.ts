import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  runRotSpriteInWorker,
  runWfcInWorker,
  runMorphInWorker,
  runEdtNormalMapInWorker,
  _setSharedWorkerForTesting,
  _resetSharedWorkerForTesting,
  _setWorkerFactoryForTesting,
  _getPendingCallbacksCountForTesting,
} from '@/lib/engine/workerDispatcher';
import type { HeavyWorkerRequest } from '@/workers/heavyCompute.worker';
import { COMBINED_MEMORY_LIMIT_BYTES, getMemoryBudgetUsage, registerMemoryUsage } from '@/lib/safety/memoryBudget';

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
    expect(getMemoryBudgetUsage().reservedBytes).toBe(0);
    vi.useRealTimers();
  });

  it('refuses combined memory pressure before creating a worker or copying inputs', async () => {
    const factory = vi.fn(() => new MockWorker() as unknown as Worker);
    _setWorkerFactoryForTesting(factory);
    registerMemoryUsage('history', () => COMBINED_MEMORY_LIMIT_BYTES);
    try {
      await expect(runRotSpriteInWorker({ width: 1, height: 1, data: new Uint8ClampedArray(4) }, 0)).rejects.toThrow(/combined artwork memory budget/);
      expect(factory).not.toHaveBeenCalled();
      expect(_getPendingCallbacksCountForTesting()).toBe(0);
    } finally { registerMemoryUsage('history', () => 0); }
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

  it('rejects pre-aborted work before worker creation or synchronous allocation on every entry point', async () => {
    const factory = vi.fn(() => { throw new Error('No worker'); });
    _setWorkerFactoryForTesting(factory);
    const controller = new AbortController(); controller.abort();
    const options = { signal: controller.signal };
    const frame = { width: 256, height: 256, data: new Uint8ClampedArray() };
    await expect(runRotSpriteInWorker(frame, 0, undefined, undefined, undefined, undefined, options)).rejects.toMatchObject({ name: 'AbortError' });
    await expect(runWfcInWorker({ sampleData: frame.data, sampleWidth: 256, sampleHeight: 256, outputWidth: 256, outputHeight: 256 }, options)).rejects.toMatchObject({ name: 'AbortError' });
    await expect(runMorphInWorker(frame, frame, 1, undefined, options)).rejects.toMatchObject({ name: 'AbortError' });
    await expect(runEdtNormalMapInWorker(frame.data, 256, 256, options)).rejects.toMatchObject({ name: 'AbortError' });
    expect(factory).not.toHaveBeenCalled();
  });

  it('refuses large main-thread fallbacks before allocating computation buffers', async () => {
    _setWorkerFactoryForTesting(() => { throw new Error('No worker'); });
    const frame = { width: 512, height: 512, data: new Uint8ClampedArray() };
    await expect(runRotSpriteInWorker(frame, 0)).rejects.toThrow('requires a compute worker');
    await expect(runWfcInWorker({ sampleData: frame.data, sampleWidth: 512, sampleHeight: 512, outputWidth: 512, outputHeight: 512 })).rejects.toThrow('requires a compute worker');
    await expect(runMorphInWorker(frame, frame)).rejects.toThrow('requires a compute worker');
    await expect(runEdtNormalMapInWorker(frame.data, 512, 512)).rejects.toThrow('requires a compute worker');
  });

  it('bounds queued work and admits new work after a job completes', async () => {
    const worker = new MockWorker(); _setSharedWorkerForTesting(worker as unknown as Worker);
    const frame = { width: 2, height: 2, data: new Uint8ClampedArray(16) };
    const jobs = Array.from({ length: 4 }, () => runRotSpriteInWorker(frame, 0));
    await expect(runRotSpriteInWorker(frame, 0)).rejects.toThrow('busy');
    expect(worker.postMessage).toHaveBeenCalledTimes(4);
    for (const [req] of worker.postMessage.mock.calls as [HeavyWorkerRequest][]) {
      worker.onmessage?.({ data: { id: req.id, type: 'rotSprite', result: frame } } as MessageEvent);
    }
    await Promise.all(jobs);
    const next = runRotSpriteInWorker(frame, 0);
    const req = worker.postMessage.mock.calls[4][0] as HeavyWorkerRequest;
    worker.onmessage?.({ data: { id: req.id, type: 'rotSprite', result: frame } } as MessageEvent);
    expect(await next).toEqual(frame);
  });

  it('removes cancellation listeners after completion so a late abort cannot kill subsequent work', async () => {
    const worker = new MockWorker(); _setSharedWorkerForTesting(worker as unknown as Worker);
    const controller = new AbortController();
    const frame = { width: 2, height: 2, data: new Uint8ClampedArray(16) };
    const first = runRotSpriteInWorker(frame, 0, undefined, undefined, undefined, undefined, { signal: controller.signal });
    const req = worker.postMessage.mock.calls[0][0] as HeavyWorkerRequest;
    worker.onmessage?.({ data: { id: req.id, type: 'rotSprite', result: frame } } as MessageEvent);
    await first;
    const second = runRotSpriteInWorker(frame, 0);
    controller.abort();
    expect(worker.terminate).not.toHaveBeenCalled();
    const next = worker.postMessage.mock.calls[1][0] as HeavyWorkerRequest;
    worker.onmessage?.({ data: { id: next.id, type: 'rotSprite', result: frame } } as MessageEvent);
    expect(await second).toEqual(frame);
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

  it('sends only the selected pixel view to the normal-map worker', async () => {
    const mockWorker = new MockWorker();
    _setSharedWorkerForTesting(mockWorker as unknown as Worker);
    const backing = new Uint8ClampedArray([91, 92, 93, 94, ...Array.from({ length: 16 }, (_, i) => i + 1), 95, 96]);
    const pixels = backing.subarray(4, 20);
    const promise = runEdtNormalMapInWorker(pixels, 2, 2);

    const request = mockWorker.postMessage.mock.calls[0][0] as Extract<HeavyWorkerRequest, { type: 'edtNormalMap' }>;
    expect(request.buffer.byteLength).toBe(16);
    expect(Array.from(new Uint8ClampedArray(request.buffer))).toEqual(Array.from(pixels));
    expect(backing[4]).toBe(1);
    mockWorker.onmessage?.({
      data: { id: request.id, type: 'edtNormalMap', result: { width: 2, height: 2, data: new Uint8ClampedArray(16) } },
    } as MessageEvent);
    await expect(promise).resolves.toMatchObject({ width: 2, height: 2 });
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

    await expect(promise).rejects.toThrow(/Worker request .* timed out/i);
    expect(mockWorker.terminate).toHaveBeenCalled();
    expect(_getPendingCallbacksCountForTesting()).toBe(0);
  });

  it('terminates cancelled work and explicitly interrupts queued peers', async () => {
    const worker = new MockWorker();
    _setSharedWorkerForTesting(worker as unknown as Worker);
    const controller = new AbortController();
    const src = { width: 2, height: 2, data: new Uint8ClampedArray(16) };
    const a = runRotSpriteInWorker(src, 0, undefined, undefined, undefined, undefined, { signal: controller.signal });
    const b = runRotSpriteInWorker(src, 0);
    const assertions = Promise.all([
      expect(a).rejects.toMatchObject({ name: 'AbortError' }),
      expect(b).rejects.toMatchObject({ name: 'WorkerInterruptedError' }),
    ]);
    controller.abort();
    await assertions;
    expect(worker.terminate).toHaveBeenCalledOnce();
    expect(_getPendingCallbacksCountForTesting()).toBe(0);
  });

  it('terminates a timed-out worker, interrupts peers and recovers on a fresh worker', async () => {
    vi.useFakeTimers();
    const workers: MockWorker[] = [];
    _setWorkerFactoryForTesting(() => { const worker = new MockWorker(); workers.push(worker); return worker as unknown as Worker; });
    const src = { width: 2, height: 2, data: new Uint8ClampedArray(16) };
    const a = runRotSpriteInWorker(src, 0, undefined, undefined, undefined, undefined, { timeoutMs: 100 });
    const b = runRotSpriteInWorker(src, 0);
    const assertions = Promise.all([
      expect(a).rejects.toMatchObject({ name: 'WorkerTimeoutError' }),
      expect(b).rejects.toMatchObject({ name: 'WorkerInterruptedError' }),
    ]);
    vi.advanceTimersByTime(100);
    await assertions;
    expect(workers[0].terminate).toHaveBeenCalledOnce();
    expect(_getPendingCallbacksCountForTesting()).toBe(0);
    const c = runRotSpriteInWorker(src, 0);
    expect(workers).toHaveLength(2);
    const req = workers[1].postMessage.mock.calls[0][0] as HeavyWorkerRequest;
    workers[1].onmessage?.({ data: { id: req.id, type: 'rotSprite', result: src } } as MessageEvent);
    expect(await c).toEqual(src);
  });
});
