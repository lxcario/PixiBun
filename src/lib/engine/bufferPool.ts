import { COMBINED_MEMORY_LIMIT_BYTES, getMemoryBudgetUsage, registerMemoryUsage } from '@/lib/safety/memoryBudget';

/** Retained scratch buffers only; checked-out arrays belong to their callers. */
export const MAX_RETAINED_POOL_BYTES = 32 * 1024 * 1024;
const MAX_BUCKET_SIZE = 16;
type ScratchBuffer = Float32Array | Int32Array;
const float32Pool = new Map<number, Float32Array[]>();
const int32Pool = new Map<number, Int32Array[]>();
// Insertion order is release order. Evict the oldest idle buffer first.
const idle = new Map<ScratchBuffer, Map<number, ScratchBuffer[]>>();
let retainedBytes = 0;
registerMemoryUsage('scratchPool', () => retainedBytes);

function acquire<T extends ScratchBuffer>(pool: Map<number, T[]>, size: number, allocate: (size: number) => T): T {
  const bucket = pool.get(size);
  const buffer = bucket?.pop();
  if (!buffer) return allocate(size);
  if (bucket!.length === 0) pool.delete(size);
  idle.delete(buffer);
  retainedBytes -= buffer.byteLength;
  buffer.fill(0);
  return buffer;
}

function evictOldest(): void {
  const oldest = idle.entries().next().value;
  if (!oldest) return;
  const [buffer, pool] = oldest;
  const bucket = pool.get(buffer.length)!;
  bucket.splice(bucket.indexOf(buffer), 1);
  if (bucket.length === 0) pool.delete(buffer.length);
  idle.delete(buffer);
  retainedBytes -= buffer.byteLength;
}

function release<T extends ScratchBuffer>(pool: Map<number, T[]>, buffer: T): void {
  // Subarrays can retain a much larger backing allocation and alias live data.
  if (idle.has(buffer) || buffer.byteLength === 0 || buffer.byteOffset !== 0 ||
      buffer.byteLength !== buffer.buffer.byteLength || buffer.byteLength > MAX_RETAINED_POOL_BYTES) return;
  if ((pool.get(buffer.length)?.length ?? 0) >= MAX_BUCKET_SIZE) return;
  while (idle.size > 0 && (retainedBytes + buffer.byteLength > MAX_RETAINED_POOL_BYTES ||
      getMemoryBudgetUsage().totalBytes + buffer.byteLength > COMBINED_MEMORY_LIMIT_BYTES)) evictOldest();
  if (getMemoryBudgetUsage().totalBytes + buffer.byteLength > COMBINED_MEMORY_LIMIT_BYTES) return;
  const bucket = pool.get(buffer.length) ?? [];
  bucket.push(buffer);
  pool.set(buffer.length, bucket);
  idle.set(buffer, pool);
  retainedBytes += buffer.byteLength;
}

export function acquireFloat32Buffer(size: number): Float32Array {
  return acquire(float32Pool, size, (length) => new Float32Array(length));
}
export function releaseFloat32Buffer(buffer: Float32Array): void { release(float32Pool, buffer); }
export function acquireInt32Buffer(size: number): Int32Array {
  return acquire(int32Pool, size, (length) => new Int32Array(length));
}
export function releaseInt32Buffer(buffer: Int32Array): void { release(int32Pool, buffer); }

/** Drops idle references without invalidating checked-out arrays. */
export function clearBufferPool(): void {
  float32Pool.clear();
  int32Pool.clear();
  idle.clear();
  retainedBytes = 0;
}
export function getBufferPoolUsage() {
  return { retainedBytes, buffers: idle.size, buckets: float32Pool.size + int32Pool.size, limitBytes: MAX_RETAINED_POOL_BYTES };
}
