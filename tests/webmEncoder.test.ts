// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { exportAnimationToWebmAsync, isWebmExportSupported } from '@/lib/export/webmEncoder';
import { containsEncodedMedia, RECORDER_START_TIMEOUT_MS } from '@/lib/export/videoRecorder';

let mode: 'success' | 'empty' | 'header-only' | 'silent-start' | 'constructor' | 'start' | 'draw' | 'error' | 'hang' = 'success';
const drawImage = vi.fn();
// EBML header, then a Cluster element (ID 1F 43 B6 75) holding encoded frames.
const WEBM_HEADER = [0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81, 0x01];
const WEBM_WITH_FRAMES = new Uint8Array([...WEBM_HEADER, 0x1f, 0x43, 0xb6, 0x75, 0x01, 0xa3, 0x81]);
const stopTrack = vi.fn();
class Recorder {
  static isTypeSupported = vi.fn(() => true);
  static latest: Recorder;
  state = 'inactive';
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstart: (() => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor() { if (mode === 'constructor') throw new Error('Constructor failed'); Recorder.latest = this; }
  start() {
    if (mode === 'start') throw new Error('Start failed');
    this.state = 'recording';
    // Real recorders announce capture asynchronously, after start() returns.
    if (mode !== 'silent-start') queueMicrotask(() => this.onstart?.());
  }
  stop() {
    this.state = 'inactive';
    if (mode === 'hang') return;
    if (mode === 'header-only') this.ondataavailable?.({ data: new Blob([new Uint8Array(WEBM_HEADER)], { type: 'video/webm' }) });
    else if (mode !== 'empty') this.ondataavailable?.({ data: new Blob([WEBM_WITH_FRAMES], { type: 'video/webm' }) });
    this.onstop?.();
  }
}
const canvas = () => { const c = document.createElement('canvas'); c.width = 16; c.height = 16; return c; };
beforeEach(() => {
  vi.useFakeTimers();
  mode = 'success';
  stopTrack.mockClear();
  drawImage.mockReset();
  Recorder.isTypeSupported.mockReturnValue(true);
  vi.stubGlobal('MediaRecorder', Recorder);
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    clearRect: vi.fn(), drawImage: (...args: unknown[]) => { drawImage(...args); if (mode === 'draw') throw new Error('Draw failed'); },
  } as unknown as CanvasRenderingContext2D);
  Object.defineProperty(HTMLCanvasElement.prototype, 'captureStream', { configurable: true, writable: true,
    value: vi.fn(() => ({ getTracks: () => [{ stop: stopTrack }] })) });
});
afterEach(() => {
  delete (HTMLCanvasElement.prototype as unknown as { captureStream?: unknown }).captureStream;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});
const options = { scale: 1, loopCount: 1, durationsMs: [10] };

describe('WebM recording safety', () => {
  it('rejects empty input and pre-existing cancellation', async () => {
    await expect(exportAnimationToWebmAsync([])).rejects.toThrow('no frames');
    const controller = new AbortController(); controller.abort();
    await expect(exportAnimationToWebmAsync([canvas()], { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
  });
  it('rejects missing APIs rather than returning a placeholder file', async () => {
    vi.stubGlobal('MediaRecorder', undefined);
    expect(isWebmExportSupported()).toBe(false);
    await expect(exportAnimationToWebmAsync([canvas()])).rejects.toThrow('unsupported');
  });
  it('rejects when none of the WebM MIME candidates is supported', async () => {
    Recorder.isTypeSupported.mockReturnValue(false);
    expect(isWebmExportSupported()).toBe(false);
    await expect(exportAnimationToWebmAsync([canvas()])).rejects.toThrow('unsupported');
    expect(HTMLCanvasElement.prototype.captureStream).not.toHaveBeenCalled();
  });
  it('returns recorded data, reports progress and releases tracks/timers', async () => {
    const progress = vi.fn();
    const result = exportAnimationToWebmAsync([canvas()], { ...options, onProgress: progress });
    await vi.runAllTimersAsync();
    expect((await result).size).toBeGreaterThan(0);
    expect(progress).toHaveBeenCalledWith(1, 1);
    expect(stopTrack).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('paints before starting, so the canvas track can deliver the frame that starts the recorder', async () => {
    const progress = vi.fn();
    const result = exportAnimationToWebmAsync([canvas()], { ...options, onProgress: progress });
    await Promise.resolve();
    expect(drawImage).toHaveBeenCalled();
    await vi.runAllTimersAsync();
    expect(progress).toHaveBeenCalledWith(1, 1);
    expect((await result).size).toBeGreaterThan(0);
  });
  it('repaints a held frame at the stream rate so capture keeps receiving it', async () => {
    const result = exportAnimationToWebmAsync([canvas()], { scale: 1, loopCount: 1, fps: 30, durationsMs: [300] });
    await vi.runAllTimersAsync();
    await result;
    expect(drawImage.mock.calls.length).toBeGreaterThanOrEqual(8);
  });
  it('times holds from the start event and rejects a recording that never starts at the deadline', async () => {
    mode = 'silent-start';
    const progress = vi.fn();
    const startedAt = Date.now();
    const assertion = expect(exportAnimationToWebmAsync([canvas()], { ...options, onProgress: progress })).rejects.toThrow('timed out before it started');
    await vi.runAllTimersAsync();
    await assertion;
    expect(progress).not.toHaveBeenCalled();
    expect(Date.now() - startedAt).toBe(RECORDER_START_TIMEOUT_MS);
    expect(Recorder.latest.state).toBe('inactive');
    expect(stopTrack).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('allows a slow encoder warm-up without shortening the recording deadline', async () => {
    mode = 'silent-start';
    const result = exportAnimationToWebmAsync([canvas()], { ...options, durationsMs: [300] });
    await vi.advanceTimersByTimeAsync(RECORDER_START_TIMEOUT_MS - 1000);
    mode = 'success';
    Recorder.latest.onstart?.();
    await vi.runAllTimersAsync();
    expect((await result).size).toBeGreaterThan(0);
  });
  it.each(['empty', 'header-only', 'constructor', 'start', 'draw'] as const)('rejects %s failure and releases resources', async failure => {
    mode = failure;
    const assertion = expect(exportAnimationToWebmAsync([canvas()], options)).rejects.toThrow();
    await vi.runAllTimersAsync();
    await assertion;
    expect(stopTrack).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('rejects recorder errors and cancels pending playback', async () => {
    const assertion = expect(exportAnimationToWebmAsync([canvas()], options)).rejects.toThrow('MediaRecorder failed');
    Recorder.latest.onerror?.();
    await assertion;
    expect(stopTrack).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('rejects active cancellation without downloading partial data', async () => {
    const controller = new AbortController();
    const assertion = expect(exportAnimationToWebmAsync([canvas()], { ...options, signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
    controller.abort();
    await assertion;
    expect(stopTrack).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('bounds a stalled recording with a deadline', async () => {
    mode = 'hang';
    const assertion = expect(exportAnimationToWebmAsync([canvas()], options)).rejects.toThrow('timed out');
    await vi.runAllTimersAsync();
    await assertion;
    expect(stopTrack).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('recorded container inspection', () => {
  const box = (type: string, payload: number[]) => [0, 0, 0, 8 + payload.length, ...Array.from(type, ch => ch.charCodeAt(0)), ...payload];
  it('accepts WebM only when a Cluster follows the header', () => {
    expect(containsEncodedMedia(WEBM_WITH_FRAMES, 'video/webm;codecs=vp9')).toBe(true);
    expect(containsEncodedMedia(new Uint8Array(WEBM_HEADER), 'video/webm')).toBe(false);
  });
  it('accepts MP4 only with a non-empty top-level mdat box', () => {
    const ftyp = box('ftyp', [105, 115, 111, 109]), moov = box('moov', [0, 0, 0, 0]);
    expect(containsEncodedMedia(new Uint8Array([...ftyp, ...moov]), 'video/mp4')).toBe(false);
    expect(containsEncodedMedia(new Uint8Array([...ftyp, ...box('mdat', [])]), 'video/mp4')).toBe(false);
    expect(containsEncodedMedia(new Uint8Array([...ftyp, ...moov, ...box('mdat', [1, 2])]), 'video/mp4;codecs=avc1')).toBe(true);
    // 64-bit box size and a final box that runs to the end of the file.
    expect(containsEncodedMedia(new Uint8Array([...ftyp, 0, 0, 0, 1, 109, 100, 97, 116, 0, 0, 0, 0, 0, 0, 0, 18, 7, 7]), 'video/mp4')).toBe(true);
    expect(containsEncodedMedia(new Uint8Array([...ftyp, 0, 0, 0, 0, 109, 100, 97, 116, 9]), 'video/mp4')).toBe(true);
    // A truncated or malformed box is not media.
    expect(containsEncodedMedia(new Uint8Array([...ftyp, 0, 0, 0, 4, 109, 100, 97, 116]), 'video/mp4')).toBe(false);
  });
});
