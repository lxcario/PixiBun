import { describe, it, expect } from 'vitest';
import { createTokenBucketStore } from '@/lib/server/tokenBucket';

describe('tokenBucket: rate limiter semantics', () => {
  it('allows bursts up to capacity, then rejects', () => {
    const store = createTokenBucketStore({ capacity: 3, refillPerMinute: 0 });
    expect(store.take('ip-1', 1000)).toBe(true);
    expect(store.take('ip-1', 1000)).toBe(true);
    expect(store.take('ip-1', 1000)).toBe(true);
    expect(store.take('ip-1', 1000)).toBe(false);
  });

  it('refills continuously over time, capped at capacity', () => {
    // 60 tokens/minute = 1 token per 1000ms
    const store = createTokenBucketStore({ capacity: 2, refillPerMinute: 60 });

    expect(store.take('ip-1', 0)).toBe(true);
    expect(store.take('ip-1', 0)).toBe(true);
    expect(store.take('ip-1', 0)).toBe(false); // empty

    expect(store.take('ip-1', 1500)).toBe(true); // 1.5 tokens accrued -> take 1
    expect(store.take('ip-1', 1600)).toBe(false); // ~0.1 token left

    expect(store.take('ip-1', 10_000)).toBe(true); // fully refilled
  });

  it('never exceeds capacity during refill', () => {
    const store = createTokenBucketStore({ capacity: 2, refillPerMinute: 60_000 });
    store.take('ip-1', 0);
    expect(store.take('ip-1', 100_000)).toBe(true);
    expect(store.take('ip-1', 100_000)).toBe(true);
    expect(store.take('ip-1', 100_000)).toBe(false); // capped at 2, not 6000
  });

  it('isolates buckets per key', () => {
    const store = createTokenBucketStore({ capacity: 1, refillPerMinute: 0 });
    expect(store.take('ip-a', 0)).toBe(true);
    expect(store.take('ip-a', 0)).toBe(false);
    expect(store.take('ip-b', 0)).toBe(true);
  });

  it('prunes idle buckets to bound memory', () => {
    const store = createTokenBucketStore({ capacity: 1, refillPerMinute: 0 });
    store.take('stale-ip', 0);
    store.take('fresh-ip', 5_000_000);

    const removed = store.prune(5_000_000, 3_600_000);
    expect(removed).toBe(1);
    expect(store.size()).toBe(1);
  });
});