import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { acquireFloat32Buffer, acquireInt32Buffer, releaseFloat32Buffer, releaseInt32Buffer, clearBufferPool, getBufferPoolUsage, MAX_RETAINED_POOL_BYTES } from '@/lib/engine/bufferPool';
import { COMBINED_MEMORY_LIMIT_BYTES, getMemoryBudgetUsage, reserveMemory } from '@/lib/safety/memoryBudget';

describe('bounded idle scratch buffers', () => {
  beforeEach(clearBufferPool);
  afterEach(clearBufferPool);

  it('reuses exact-size buffers with cleared contents and transfers idle accounting', () => {
    const f = acquireFloat32Buffer(16), i = acquireInt32Buffer(16);
    f.fill(9); i.fill(9);
    releaseFloat32Buffer(f); releaseInt32Buffer(i);
    expect(getMemoryBudgetUsage().retained.scratchPool).toBe(128);
    expect(acquireFloat32Buffer(16)).toBe(f);
    expect([...f]).toEqual(Array(16).fill(0));
    expect(acquireInt32Buffer(16)).toBe(i);
    expect([...i]).toEqual(Array(16).fill(0));
    expect(getBufferPoolUsage()).toMatchObject({ retainedBytes: 0, buffers: 0, buckets: 0 });
  });

  it('bounds varied dimensions across both array types and evicts oldest idle buffers', () => {
    const oldest = acquireFloat32Buffer(MAX_RETAINED_POOL_BYTES / 8);
    releaseFloat32Buffer(oldest);
    for (let n = 0; n < 40; n++) {
      releaseInt32Buffer(new Int32Array(262144 + n));
      expect(getBufferPoolUsage().retainedBytes).toBeLessThanOrEqual(MAX_RETAINED_POOL_BYTES);
    }
    expect(acquireFloat32Buffer(oldest.length) === oldest).toBe(false);
  });

  it('drops aliases, duplicate releases, zero-length and oversized arrays', () => {
    const f = new Float32Array(16);
    releaseFloat32Buffer(f); releaseFloat32Buffer(f);
    releaseFloat32Buffer(f.subarray(1));
    releaseFloat32Buffer(new Float32Array(0));
    releaseInt32Buffer(new Int32Array(MAX_RETAINED_POOL_BYTES / 4 + 1));
    expect(getBufferPoolUsage()).toMatchObject({ retainedBytes: 64, buffers: 1, buckets: 1 });
  });

  it('caps each exact-size bucket and preserves arrays still checked out on clear', () => {
    const checkedOut = acquireFloat32Buffer(8); checkedOut.fill(4);
    for (let n = 0; n < 30; n++) releaseInt32Buffer(new Int32Array(4));
    expect(getBufferPoolUsage().buffers).toBe(16);
    clearBufferPool();
    expect(getMemoryBudgetUsage().retained.scratchPool).toBe(0);
    expect([...checkedOut]).toEqual(Array(8).fill(4));
  });

  it('evicts idle buffers under combined admission pressure and refuses retention if still full', () => {
    releaseFloat32Buffer(new Float32Array(16));
    const usage = getMemoryBudgetUsage().totalBytes;
    const releaseReservation = reserveMemory(COMBINED_MEMORY_LIMIT_BYTES - usage, 'pool test');
    try {
      releaseInt32Buffer(new Int32Array(32));
      expect(getBufferPoolUsage().retainedBytes).toBe(0);
    } finally { releaseReservation(); }
  });
});
