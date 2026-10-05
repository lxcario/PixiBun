/** Drain started jobs on failure; never leave native work running after its owner releases memory. */
export async function mapBounded<T, R>(items: readonly T[], work: (item: T, index: number) => Promise<R>, concurrency = 2): Promise<R[]> {
  if (!Number.isInteger(concurrency) || concurrency < 1) throw new RangeError('Invalid work concurrency.');
  const results = new Array<R>(items.length);
  let next = 0;
  let failed = false;
  let failure: unknown;
  const worker = async () => {
    while (!failed && next < items.length) {
      const index = next++;
      try { results[index] = await work(items[index], index); }
      catch (error) { if (!failed) { failed = true; failure = error; } }
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  if (failed) throw failure;
  return results;
}

export class SerializationSupersededError extends Error {
  constructor() { super('Artwork changed before its queued layers could be encoded. Retry the save.'); }
}
