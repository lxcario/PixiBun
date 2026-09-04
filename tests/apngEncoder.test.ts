/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect } from 'vitest';
import {
  exportAnimationToApngAsync,
  computeCrc32,
  computeAdler32,
  createPngChunk,
} from '@/lib/export/apngEncoder';

function createMockCanvas(width: number, height: number, fillColor: [number, number, number, number]): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Happy-dom 2D context mock
    const data = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < width * height; i++) {
      data[i * 4] = fillColor[0];
      data[i * 4 + 1] = fillColor[1];
      data[i * 4 + 2] = fillColor[2];
      data[i * 4 + 3] = fillColor[3];
    }
    ctx.getImageData = () => ({ width, height, data } as ImageData);
  }
  return canvas;
}

describe('In-Browser Animated PNG (APNG) Export Engine', () => {
  it('computes IEEE 802.3 CRC32 correctly against known vectors', () => {
    // Standard CRC-32 test: "123456789" -> 0xCBF43926
    const testBytes = new TextEncoder().encode('123456789');
    const crc = computeCrc32(testBytes, 0, testBytes.length);
    expect(crc).toBe(0xcbf43926);
  });

  it('computes RFC 1950 Adler32 correctly against known vectors', () => {
    // "Wikipedia" -> 0x11E60398
    const testBytes = new TextEncoder().encode('Wikipedia');
    const adler = computeAdler32(testBytes);
    expect(adler).toBe(0x11e60398);
  });

  it('creates valid PNG binary chunks with correct length, tag, and CRC-32', () => {
    const chunkData = new Uint8Array([1, 2, 3, 4]);
    const chunk = createPngChunk('test', chunkData);

    // Length: 4 (BE)
    expect(chunk[0]).toBe(0);
    expect(chunk[1]).toBe(0);
    expect(chunk[2]).toBe(0);
    expect(chunk[3]).toBe(4);

    // Type: 'test'
    expect(String.fromCharCode(chunk[4], chunk[5], chunk[6], chunk[7])).toBe('test');

    // Data: [1, 2, 3, 4]
    expect(Array.from(chunk.subarray(8, 12))).toEqual([1, 2, 3, 4]);

    // CRC-32 (4 bytes at the end)
    const expectedCrc = computeCrc32(chunk, 4, 8);
    const actualCrc =
      ((chunk[12] << 24) | (chunk[13] << 16) | (chunk[14] << 8) | chunk[15]) >>> 0;
    expect(actualCrc).toBe(expectedCrc);
  });

  it('encodes a multi-frame animation into a valid APNG with IHDR, acTL, fcTL, IDAT, fdAT, and IEND', async () => {
    const frame1 = createMockCanvas(4, 4, [255, 0, 0, 255]);
    const frame2 = createMockCanvas(4, 4, [0, 255, 0, 255]);
    const frame3 = createMockCanvas(4, 4, [0, 0, 255, 255]);

    const progressReports: Array<{ current: number; total: number }> = [];

    const blob = await exportAnimationToApngAsync([frame1, frame2, frame3], {
      fps: 10,
      scale: 2,
      onProgress: (current, total) => progressReports.push({ current, total }),
    });

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('image/apng');
    expect(blob.size).toBeGreaterThan(64);

    const buffer = new Uint8Array(await blob.arrayBuffer());

    // 1. Verify PNG Signature: 89 50 4E 47 0D 0A 1A 0A
    expect(Array.from(buffer.subarray(0, 8))).toEqual([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]);

    // Parse chunk types sequentially
    const chunkTypes: string[] = [];
    let offset = 8;
    while (offset < buffer.length) {
      const length =
        ((buffer[offset] << 24) |
          (buffer[offset + 1] << 16) |
          (buffer[offset + 2] << 8) |
          buffer[offset + 3]) >>>
        0;
      const type = String.fromCharCode(
        buffer[offset + 4],
        buffer[offset + 5],
        buffer[offset + 6],
        buffer[offset + 7]
      );
      chunkTypes.push(type);
      offset += 8 + length + 4; // length(4) + type(4) + data(length) + crc(4)
    }

    // Expected order in APNG:
    // IHDR, acTL, fcTL (frame 0), IDAT (frame 0), fcTL (frame 1), fdAT (frame 1), fcTL (frame 2), fdAT (frame 2), IEND
    expect(chunkTypes).toEqual([
      'IHDR',
      'acTL',
      'fcTL',
      'IDAT',
      'fcTL',
      'fdAT',
      'fcTL',
      'fdAT',
      'IEND',
    ]);

    // Progress reporting should have reached 3/3
    expect(progressReports.length).toBe(3);
    expect(progressReports[progressReports.length - 1]).toEqual({ current: 3, total: 3 });
  });

  it('supports per-frame duration overrides and abort cancellation', async () => {
    const frame1 = createMockCanvas(2, 2, [255, 255, 0, 255]);
    const frame2 = createMockCanvas(2, 2, [255, 0, 255, 255]);

    const blob = await exportAnimationToApngAsync([frame1, frame2], {
      durationsMs: [250, 750],
      loopCount: 3,
    });
    expect(blob.size).toBeGreaterThan(0);

    // Abort controller test
    const controller = new AbortController();
    controller.abort();

    await expect(
      exportAnimationToApngAsync([frame1, frame2], { signal: controller.signal })
    ).rejects.toThrow('APNG export aborted');
  });
});
