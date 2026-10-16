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

const WEBM_CLUSTER_ID = [0x1f, 0x43, 0xb6, 0x75];
/** Longest wait for a recorder to start capturing before the export fails. */
export const RECORDER_START_TIMEOUT_MS = 20_000;

/**
 * True when a recorded container holds encoded media, not only its header.
 * A recorder that receives no canvas frames still writes a valid header
 * (about 110 bytes of WebM, or an MP4 `ftyp`/`moov`), which players open as
 * an empty video. WebM media lives in Cluster elements; MP4 media in a
 * non-empty top-level `mdat` box. Other container types are not inspected.
 */
export function containsEncodedMedia(bytes: Uint8Array, mimeType: string): boolean {
  const container = mimeType.split(';')[0].trim().toLowerCase();
  if (container === 'video/webm') {
    for (let i = 0; i + 4 <= bytes.length; i++) {
      if (bytes[i] === WEBM_CLUSTER_ID[0] && bytes[i + 1] === WEBM_CLUSTER_ID[1]
        && bytes[i + 2] === WEBM_CLUSTER_ID[2] && bytes[i + 3] === WEBM_CLUSTER_ID[3]) return true;
    }
    return false;
  }
  if (container === 'video/mp4') {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let offset = 0;
    while (offset + 8 <= bytes.length) {
      let size = view.getUint32(offset);
      const type = String.fromCharCode(bytes[offset + 4], bytes[offset + 5], bytes[offset + 6], bytes[offset + 7]);
      let header = 8;
      if (size === 1) {
        if (offset + 16 > bytes.length) return false;
        size = view.getUint32(offset + 8) * 2 ** 32 + view.getUint32(offset + 12);
        header = 16;
      } else if (size === 0) {
        size = bytes.length - offset;
      }
      if (size < header) return false;
      if (type === 'mdat' && size > header) return true;
      offset += size;
    }
    return false;
  }
  return true;
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
    let refresh: ReturnType<typeof setInterval> | undefined;
    let finished = false;
    const chunks: Blob[] = [];
    const cleanup = () => {
      clearTimeout(timer);
      clearTimeout(deadline);
      clearInterval(refresh);
      options.signal?.removeEventListener('abort', onAbort);
      if (recorder) {
        recorder.onstart = null;
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
        const noData = () => fail(new Error('Video recording produced no frames. Please retry or choose GIF / APNG.'));
        if (blob.size === 0) { noData(); return; }
        blob.arrayBuffer().then(buffer => {
          if (finished) return;
          if (!containsEncodedMedia(new Uint8Array(buffer), mimeType)) { noData(); return; }
          finished = true;
          cleanup();
          resolve(blob);
        }, fail);
      };
      options.signal?.addEventListener('abort', onAbort, { once: true });
      if (options.signal?.aborted) { onAbort(); return; }
      // Encoder warm-up (seconds for a first VP9 recording in a fresh browser)
      // gets its own bound; the recording's own deadline starts at `start`.
      deadline = setTimeout(() => fail(new Error('Video recording timed out before it started. Please retry.')), RECORDER_START_TIMEOUT_MS);
      let rendered = 0;
      let current = 0;
      let started = false;
      const total = frames.length * loopCount;
      const paint = (index: number) => {
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(frames[index], 0, 0, drawWidth, drawHeight);
        current = index;
      };
      const show = (index: number) => {
        rendered += 1;
        options.onProgress?.(rendered, total);
        if (!finished) timer = setTimeout(renderNext, delaysMs[index]);
      };
      const renderNext = () => {
        if (finished) return;
        try {
          if (rendered === total) { clearInterval(refresh); recorder!.stop(); return; }
          const index = rendered % frames.length;
          paint(index);
          show(index);
        } catch (error) { fail(error); }
      };
      // A canvas track emits a frame only when the canvas is painted, and the
      // recorder starts (and fires `start`) only once it receives one. Painting
      // a single frame once, before the recorder was ready, recorded a header
      // with no frames. Paint the first frame now, repaint whatever is showing
      // at the stream rate throughout, and begin timing holds at `start`.
      paint(0);
      refresh = setInterval(() => {
        if (finished) return;
        try { paint(current); } catch (error) { fail(error); }
      }, Math.max(1, Math.round(1000 / fps)));
      recorder.onstart = () => {
        if (finished || started) return;
        started = true;
        clearTimeout(deadline);
        deadline = setTimeout(() => fail(new Error('Video recording timed out. Please retry.')),
          Math.min(2_147_483_647, delaysMs.reduce((sum, value) => sum + value, 0) * loopCount + 5_000));
        try { paint(0); show(0); } catch (error) { fail(error); }
      };
      recorder.start();
    } catch (error) { fail(error); }
  });
}
