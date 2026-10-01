/** Estimated application-owned CPU memory. Excludes browser/GPU/codec internals. */
export const COMBINED_MEMORY_LIMIT_BYTES = 512 * 1024 * 1024;
type MemoryOwner = 'rasters' | 'history' | 'collaboration' | 'scratchPool';
const providers = new Map<MemoryOwner, () => number>();
let reservedBytes = 0;

export function registerMemoryUsage(owner: MemoryOwner, read: () => number): void {
  providers.set(owner, read);
}

export function getMemoryBudgetUsage() {
  const retained = Object.fromEntries([...providers].map(([owner, read]) => [owner, read()]));
  const totalBytes = Object.values(retained).reduce((a, b) => a + b, 0) + reservedBytes;
  return { retained, reservedBytes, totalBytes, limitBytes: COMBINED_MEMORY_LIMIT_BYTES };
}

export function assertMemoryAvailable(bytes: number, operation: string): void {
  if (!Number.isSafeInteger(bytes) || bytes < 0 || getMemoryBudgetUsage().totalBytes + bytes > COMBINED_MEMORY_LIMIT_BYTES) {
    throw new RangeError(`${operation} exceeds the combined artwork memory budget. Try exporting fewer frames, using a smaller scale, or closing other exports before retrying.`);
  }
}

/** Reserve before allocating; release on success, failure, cancellation and timeout. */
export function reserveMemory(bytes: number, operation: string): () => void {
  assertMemoryAvailable(bytes, operation);
  reservedBytes += bytes;
  let released = false;
  return () => {
    if (!released) { reservedBytes -= bytes; released = true; }
  };
}
