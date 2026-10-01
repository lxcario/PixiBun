// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { makeCanvas } from './helpers/mockCanvas';
import { createAnimatedGifBlobAsync, encodeGifRawFrames, GIF_WORKER_TIMEOUT_MS, type RawFrameData } from '@/lib/export/gifEncoder';

let mode: 'init' | 'crash' | 'error' | 'hang' | 'success';
let detached: RawFrameData[];
class GifWorker {
  static latest: GifWorker;
  onmessage: ((event: { data: object }) => void) | null = null;
  onerror: ((event: Error) => void) | null = null;
  terminate = vi.fn();
  constructor() { if (mode === 'init') throw new Error('Worker unavailable'); GifWorker.latest = this; }
  postMessage(message: { frames: RawFrameData[]; fps: number; delays?: number[]; repeat?: boolean }, transfer: ArrayBuffer[]) {
    detached = message.frames;
    const received = structuredClone(message, { transfer });
    queueMicrotask(() => {
      if (mode === 'crash') this.onerror?.(new Error('Crash after transfer'));
      if (mode === 'error') this.onmessage?.({ data: { type: 'error', message: 'Encoding error' } });
      if (mode === 'success') {
        const bytes = encodeGifRawFrames(received.frames, received.fps, undefined, received.delays, received.repeat);
        this.onmessage?.({ data: { type: 'done', buffer: bytes.slice().buffer } });
      }
    });
  }
}
beforeEach(() => { mode = 'success'; vi.stubGlobal('Worker', GifWorker); vi.spyOn(console, 'warn').mockImplementation(() => {}); });
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.useRealTimers(); });
function source() {
  const canvas = makeCanvas(1, 1); const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ff0000'; ctx.fillRect(0, 0, 1, 1);
  return canvas;
}
const expected = () => encodeGifRawFrames([{ width: 1, height: 1, data: new Uint8ClampedArray([255, 0, 0, 255]) }], 10, undefined, [17]);
it('preserves original pixels/delay when worker initialization fails before transfer', async () => {
  mode = 'init';
  const blob = await createAnimatedGifBlobAsync([source()], 10, 1, undefined, undefined, [17]);
  expect(new Uint8Array(await blob.arrayBuffer())).toEqual(expected());
});
it.each(['crash', 'error'] as const)('rejects a post-transfer %s without reusing detached pixels', async failure => {
  mode = failure;
  await expect(createAnimatedGifBlobAsync([source()], 10)).rejects.toThrow('failed after transferring pixels');
  expect(detached[0].data.byteLength).toBe(0);
  expect(GifWorker.latest.terminate).toHaveBeenCalledOnce();
});
it('encodes the transferred pixel snapshot and cleans up the worker', async () => {
  const blob = await createAnimatedGifBlobAsync([source()], 10, 1, undefined, undefined, [17]);
  expect(new Uint8Array(await blob.arrayBuffer())).toEqual(expected());
  expect(detached[0].data.byteLength).toBe(0);
  expect(GifWorker.latest.terminate).toHaveBeenCalledOnce();
});
it.each(['init', 'success'] as const)('writes a play-once GIF through the %s path without an infinite-loop extension', async path => {
  mode = path;
  const blob = await createAnimatedGifBlobAsync([source()], 10, 1, undefined, undefined, [17], false);
  const bytes = new Uint8Array(await blob.arrayBuffer());
  expect(bytes).toEqual(encodeGifRawFrames([{ width: 1, height: 1, data: new Uint8ClampedArray([255, 0, 0, 255]) }], 10, undefined, [17], false));
  expect(new TextDecoder().decode(bytes)).not.toContain('NETSCAPE2.0');
  expect(new TextDecoder().decode(expected())).toContain('NETSCAPE2.0');
});
it('terminates a stalled worker at the deadline without returning a file', async () => {
  vi.useFakeTimers(); mode = 'hang';
  const assertion = expect(createAnimatedGifBlobAsync([source()], 10)).rejects.toThrow('timed out');
  await vi.advanceTimersByTimeAsync(GIF_WORKER_TIMEOUT_MS);
  await assertion;
  expect(GifWorker.latest.terminate).toHaveBeenCalledOnce();
  expect(vi.getTimerCount()).toBe(0);
});
it('rejects cancellation after transfer and clears its worker/deadline', async () => {
  vi.useFakeTimers(); mode = 'hang'; const controller = new AbortController();
  const assertion = expect(createAnimatedGifBlobAsync([source()], 10, 1, undefined, controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
  controller.abort(); await assertion;
  expect(GifWorker.latest.terminate).toHaveBeenCalledOnce();
  expect(vi.getTimerCount()).toBe(0);
});
