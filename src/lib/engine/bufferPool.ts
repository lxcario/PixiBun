/**
 * PixiBun High-Performance TypedArray Buffer Pool
 * 
 * Prevents GC thrashing during hot computational passes (Distance Transforms,
 * Bilateral Filters, Morphological Thinning, Convolutions, and Normal Baking)
 * by pooling and reusing TypedArrays across frame renders.
 */

const MAX_BUCKET_SIZE = 16;
const float32Pool = new Map<number, Float32Array[]>();
const int32Pool = new Map<number, Int32Array[]>();

export function acquireFloat32Buffer(size: number): Float32Array {
  const bucket = float32Pool.get(size);
  if (bucket && bucket.length > 0) {
    const arr = bucket.pop()!;
    arr.fill(0);
    return arr;
  }
  return new Float32Array(size);
}

export function releaseFloat32Buffer(arr: Float32Array): void {
  const size = arr.length;
  let bucket = float32Pool.get(size);
  if (!bucket) {
    bucket = [];
    float32Pool.set(size, bucket);
  }
  if (bucket.length < MAX_BUCKET_SIZE) {
    bucket.push(arr);
  }
}

export function acquireInt32Buffer(size: number): Int32Array {
  const bucket = int32Pool.get(size);
  if (bucket && bucket.length > 0) {
    const arr = bucket.pop()!;
    arr.fill(0);
    return arr;
  }
  return new Int32Array(size);
}

export function releaseInt32Buffer(arr: Int32Array): void {
  const size = arr.length;
  let bucket = int32Pool.get(size);
  if (!bucket) {
    bucket = [];
    int32Pool.set(size, bucket);
  }
  if (bucket.length < MAX_BUCKET_SIZE) {
    bucket.push(arr);
  }
}
