// Token-bucket rate limiter for server route handlers.
//
// Classic token bucket (Tanenbaum & Wetherall, "Computer Networks", §5.3;
// a single request bucket, not the two-bucket three-color marker in RFC 2697): the bucket holds up to `capacity` tokens, refilled continuously
// at `refillPerMinute`, and each request consumes one token.
//
// Limitation (documented honestly): state is per-process memory. On a single
// Node instance this is correct; on multi-instance deployments it becomes a
// per-instance limit. For a zero-backend diagnostics relay this is the right
// trade-off — a distributed limiter would reintroduce the shared state this
// serverless app deliberately avoids.

export interface TokenBucketOptions {
  capacity: number;
  refillPerMinute: number;
}

export interface TokenBucketStore {
  /** Consume one token for `key`. Returns false when the bucket is empty. */
  take(key: string, now?: number): boolean;
  /** Drop entries idle longer than `idleMs` (default 1h) to bound memory. */
  prune(now?: number, idleMs?: number): number;
  size(): number;
}

interface BucketState {
  tokens: number;
  lastRefill: number;
}

export function createTokenBucketStore(options: TokenBucketOptions): TokenBucketStore {
  const capacity = Math.max(1, Math.floor(options.capacity));
  const refillPerMs = Math.max(0, options.refillPerMinute) / 60_000;
  const buckets = new Map<string, BucketState>();

  return {
    take(key: string, now: number = Date.now()): boolean {
      let bucket = buckets.get(key);
      if (!bucket) {
        bucket = { tokens: capacity, lastRefill: now };
        buckets.set(key, bucket);
      }

      // Continuous refill: tokens accumulate proportionally to elapsed time,
      // capped at capacity.
      const elapsed = Math.max(0, now - bucket.lastRefill);
      if (elapsed > 0 && refillPerMs > 0) {
        bucket.tokens = Math.min(capacity, bucket.tokens + elapsed * refillPerMs);
        bucket.lastRefill = now;
      }

      if (bucket.tokens < 1) {
        return false;
      }
      bucket.tokens -= 1;
      return true;
    },

    prune(now: number = Date.now(), idleMs: number = 3_600_000): number {
      let removed = 0;
      for (const [key, bucket] of buckets) {
        if (now - bucket.lastRefill > idleMs) {
          buckets.delete(key);
          removed++;
        }
      }
      return removed;
    },

    size(): number {
      return buckets.size;
    },
  };
}