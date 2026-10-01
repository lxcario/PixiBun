/** Shared recording lifecycle: capability checks, bounded completion and total cleanup. */
export function getVideoRecordingMimeType(format: 'webm' | 'mp4'): string | null {
  if (typeof window === 'undefined' || typeof document === 'undefined' ||
    typeof window.MediaRecorder !== 'function' || typeof HTMLCanvasElement === 'undefined' ||
    typeof HTMLCanvasElement.prototype.captureStream !== 'function') return null;
  const candidates = format === 'webm'
    ? ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
    : ['video/mp4;codecs=avc1', 'video/mp4'];
  try {
    return candidates.find(type => window.MediaRecorder.isTypeSupported(type)) ?? null;
  } catch { return null; }
}

export interface RecordingOptions {
  signal?: AbortSignal;
  onProgress?: (current: number, total: number) => void;
}

export function recordCanvasVideo(
  frames: HTMLCanvasElement[], width: number, height: number,
  drawWidth: number, drawHeight: number, fps: number, loopCount: number,
  delaysMs: number[], mimeType: string, options: RecordingOptions
): Promise<Blob> {
  if (options.signal?.aborted) return Promise.reject(new DOMException('Video export aborted', 'AbortError'));
  if (![fps, loopCount, ...delaysMs].every(value => Number.isFinite(value) && value > 0)) {
    return Promise.reject(new RangeError('Video frame rate and durations must be finite positive numbers.'));
  }
  return new Promise((resolve, reject) => {
    let stream: MediaStream | undefined;
    let recorder: MediaRecorder | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let deadline: ReturnType<typeof setTimeout> | undefined;
    let finished = false;
    const chunks: Blob[] = [];
    const cleanup = () => {
      clearTimeout(timer);
      clearTimeout(deadline);
      options.signal?.removeEventListener('abort', onAbort);
      if (recorder) {
        recorder.onstop = null;
        recorder.onerror = null;
        recorder.ondataavailable = null;
        try { if (recorder.state !== 'inactive') recorder.stop(); } catch { /* stop tracks below */ }
      }
      try { stream?.getTracks().forEach(track => track.stop()); } catch { /* cleanup must still settle the promise */ }
    };
    const fail = (error: unknown) => {
      if (finished) return;
      finished = true;
      cleanup();
      reject(error);
    };
    const onAbort = () => fail(new DOMException('Video export aborted', 'AbortError'));
    try {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Failed to acquire a video export canvas context.');
      ctx.imageSmoothingEnabled = false;
      stream = canvas.captureStream(fps);
      recorder = new window.MediaRecorder(stream, { mimeType });
      recorder.ondataavailable = event => { if (!finished && event.data.size > 0) chunks.push(event.data); };
      recorder.onerror = () => fail(new Error('MediaRecorder failed while encoding video.'));
      recorder.onstop = () => {
        if (finished) return;
        const blob = new Blob(chunks, { type: mimeType.split(';')[0] });
        if (blob.size === 0) { fail(new Error('Video recording produced no data. Please retry or choose GIF / APNG.')); return; }
        finished = true;
        cleanup();
        resolve(blob);
      };
      options.signal?.addEventListener('abort', onAbort, { once: true });
      if (options.signal?.aborted) { onAbort(); return; }
      deadline = setTimeout(() => fail(new Error('Video recording timed out. Please retry.')),
        Math.min(2_147_483_647, delaysMs.reduce((sum, value) => sum + value, 0) * loopCount + 5_000));
      recorder.start();
      let rendered = 0;
      const total = frames.length * loopCount;
      const renderNext = () => {
        if (finished) return;
        try {
          if (rendered === total) { recorder!.stop(); return; }
          const index = rendered % frames.length;
          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(frames[index], 0, 0, drawWidth, drawHeight);
          rendered += 1;
          options.onProgress?.(rendered, total);
          if (!finished) timer = setTimeout(renderNext, delaysMs[index]);
        } catch (error) { fail(error); }
      };
      renderNext();
    } catch (error) { fail(error); }
  });
}
