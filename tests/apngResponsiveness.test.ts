import { afterEach, describe, expect, it, vi } from 'vitest';
import { inflateSync } from 'node:zlib';
import { exportAnimationToApngAsync, apngFailureMessage, computeCrc32 } from '@/lib/export/apngEncoder';
import { getMemoryBudgetUsage } from '@/lib/safety/memoryBudget';

vi.mock('@/lib/canvas/scaleCanvas', () => ({
  extractScaledCanvasRgba: (canvas: HTMLCanvasElement) => ({ width: canvas.width, height: canvas.height,
    data: new Uint8ClampedArray(canvas.width * canvas.height * 4).fill(127) }),
}));
const frame = { width: 32, height: 32 } as HTMLCanvasElement;
const nativeCompression = globalThis.CompressionStream;
afterEach(() => vi.unstubAllGlobals());

function checkFrames(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const frames: Uint8Array[] = [];
  let sequence = 0;
  for (let offset = 8; offset < bytes.length;) {
    const length = view.getUint32(offset), type = new TextDecoder().decode(bytes.slice(offset + 4, offset + 8));
    expect(view.getUint32(offset + 8 + length)).toBe(computeCrc32(bytes, offset + 4, length + 4));
    if (type === 'fcTL' || type === 'fdAT') expect(view.getUint32(offset + 8)).toBe(sequence++);
    if (type === 'IDAT' || type === 'fdAT') {
      frames.push(inflateSync(bytes.slice(offset + (type === 'fdAT' ? 12 : 8), offset + 8 + length)));
    }
    offset += length + 12;
  }
  expect(frames).toHaveLength(2);
  for (const data of frames) {
    expect(data.length).toBe(32 * 129);
    for (let row = 0; row < 32; row++) {
      expect(data[row * 129]).toBe(0);
      expect(Array.from(data.slice(row * 129 + 1, (row + 1) * 129))).toEqual(new Array(128).fill(127));
    }
  }
}

describe('APNG compression and event-loop cancellation', () => {
  it.each(['native', 'missing', 'unsupported'] as const)('decodes every frame and CRC with %s compression', async mode => {
    vi.stubGlobal('CompressionStream', mode === 'native' ? nativeCompression : mode === 'missing' ? undefined
      : class { constructor() { throw new TypeError('Unsupported format'); } });
    const blob = await exportAnimationToApngAsync([frame, frame]);
    checkFrames(new Uint8Array(await blob.arrayBuffer()));
    if (mode === 'native') expect(blob.size).toBeLessThan(1000);
  });
  it.each([true, false])('allows a queued user cancellation between frames (native=%s)', async native => {
    vi.stubGlobal('CompressionStream', native ? nativeCompression : undefined);
    const controller = new AbortController(), progress: number[] = [];
    const before = getMemoryBudgetUsage().reservedBytes;
    await expect(exportAnimationToApngAsync([frame, frame, frame], { signal: controller.signal,
      onProgress: current => { progress.push(current); if (current === 1) setTimeout(() => controller.abort(), 0); },
    })).rejects.toMatchObject({ name: 'AbortError' });
    expect(progress).toEqual([1]);
    expect(getMemoryBudgetUsage().reservedBytes).toBe(before);
  });
  it('keeps codec failures distinct from capacity failures and releases the reservation', async () => {
    const failure = new Error('Codec unavailable');
    vi.stubGlobal('CompressionStream', class { constructor() { throw failure; } });
    const before = getMemoryBudgetUsage().reservedBytes;
    await expect(exportAnimationToApngAsync([frame])).rejects.toBe(failure);
    expect(getMemoryBudgetUsage().reservedBytes).toBe(before);
    expect(apngFailureMessage(failure)).toContain('rendered or encoded');
    expect(apngFailureMessage(new RangeError('Capacity'))).toContain('size or memory');
  });
});
