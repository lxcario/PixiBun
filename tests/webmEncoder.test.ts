// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { exportAnimationToWebmAsync, isWebmExportSupported } from '@/lib/export/webmEncoder';

let mode: 'success' | 'empty' | 'constructor' | 'start' | 'draw' | 'error' | 'hang' = 'success';
const stopTrack = vi.fn();
class Recorder {
  static isTypeSupported = vi.fn(() => true);
  static latest: Recorder;
  state = 'inactive';
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor() { if (mode === 'constructor') throw new Error('Constructor failed'); Recorder.latest = this; }
  start() { if (mode === 'start') throw new Error('Start failed'); this.state = 'recording'; }
  stop() {
    this.state = 'inactive';
    if (mode === 'hang') return;
    if (mode !== 'empty') this.ondataavailable?.({ data: new Blob(['encoded'], { type: 'video/webm' }) });
    this.onstop?.();
  }
}
const canvas = () => { const c = document.createElement('canvas'); c.width = 16; c.height = 16; return c; };
beforeEach(() => {
  vi.useFakeTimers();
  mode = 'success';
  stopTrack.mockClear();
  Recorder.isTypeSupported.mockReturnValue(true);
  vi.stubGlobal('MediaRecorder', Recorder);
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    clearRect: vi.fn(), drawImage: () => { if (mode === 'draw') throw new Error('Draw failed'); },
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
  it.each(['empty', 'constructor', 'start', 'draw'] as const)('rejects %s failure and releases resources', async failure => {
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
