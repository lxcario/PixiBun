/** Deadlines also cover hardware promises which can stall without firing callbacks. */
export function awaitVideoOperation<T>(operation: Promise<T>, signal?: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const cleanup = () => { clearTimeout(timer); signal?.removeEventListener('abort', onAbort); };
    const onAbort = () => { cleanup(); reject(new DOMException('MP4 export aborted', 'AbortError')); };
    const timer = setTimeout(() => { cleanup(); reject(new Error('Video encoder timed out. Please retry.')); }, 10_000);
    signal?.addEventListener('abort', onAbort, { once: true });
    operation.then(value => { cleanup(); resolve(value); }, error => { cleanup(); reject(error); });
    if (signal?.aborted) onAbort();
  });
}
