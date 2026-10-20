import { describe, it, expect } from 'vitest';
import {
  encodeGifRawFrames,
  validateRawFrames,
  quantizePixels,
  type RawFrameData,
} from '@/lib/export/gifEncoderCore';
import { extractScaledRawFrames } from '@/lib/export/gifEncoder';
import { readAnimatedGif } from './helpers/readAnimatedGif';

function makeFrame(width: number, height: number, fillRgba?: [number, number, number, number]): RawFrameData {
  const data = new Uint8ClampedArray(width * height * 4);
  if (fillRgba) {
    for (let i = 0; i < width * height; i++) {
      data[i * 4] = fillRgba[0];
      data[i * 4 + 1] = fillRgba[1];
      data[i * 4 + 2] = fillRgba[2];
      data[i * 4 + 3] = fillRgba[3];
    }
  }
  return { width, height, data };
}

function createMockCanvas(width: number, height: number, fillRgba?: [number, number, number, number]): HTMLCanvasElement {
  return {
    width,
    height,
    getContext: () => ({
      imageSmoothingEnabled: false,
      drawImage: () => {},
      getImageData: (_x: number, _y: number, w: number, h: number) => {
        const data = new Uint8ClampedArray(w * h * 4);
        if (fillRgba) {
          for (let i = 0; i < w * h; i++) {
            data[i * 4] = fillRgba[0];
            data[i * 4 + 1] = fillRgba[1];
            data[i * 4 + 2] = fillRgba[2];
            data[i * 4 + 3] = fillRgba[3];
          }
        }
        return { width: w, height: h, data };
      },
    }),
  } as unknown as HTMLCanvasElement;
}

describe('Adversarial GIF Pipeline & Performance Stress Harness (challenger_m3_2)', () => {
  describe('Requirement 1: Validation Performance Overhead on Large Frame Collections (100–300 frames < 1ms)', () => {
    const frameCounts = [100, 200, 300, 500, 1000];

    for (const count of frameCounts) {
      it(`validates ${count} frames in strictly < 1ms (benchmarked over 100 runs)`, () => {
        const frames: RawFrameData[] = [];
        for (let i = 0; i < count; i++) {
          frames.push(makeFrame(32, 32));
        }

        // Warm up JIT
        for (let w = 0; w < 10; w++) {
          validateRawFrames(frames);
        }

        const iterations = 100;
        const durations: number[] = [];

        for (let it = 0; it < iterations; it++) {
          const start = performance.now();
          validateRawFrames(frames);
          const end = performance.now();
          durations.push(end - start);
        }

        const totalTime = durations.reduce((a, b) => a + b, 0);
        const avgMs = totalTime / iterations;
        const _maxMs = Math.max(...durations);
        durations.sort((a, b) => a - b);
        const p99Ms = durations[Math.floor(iterations * 0.99)];

        // Assert strictly under 1ms
        expect(avgMs).toBeLessThan(1.0);
        if (count <= 300) {
          expect(p99Ms).toBeLessThan(1.0);
        }

        // Informational assertion / log check
        expect(durations.length).toBe(iterations);
      });
    }

    it('validates Uint8Array collections with identical sub-millisecond efficiency', () => {
      const frames: RawFrameData[] = [];
      for (let i = 0; i < 300; i++) {
        frames.push({
          width: 64,
          height: 64,
          data: new Uint8Array(64 * 64 * 4) as unknown as Uint8ClampedArray,
        });
      }

      const start = performance.now();
      for (let i = 0; i < 100; i++) {
        validateRawFrames(frames);
      }
      const totalMs = performance.now() - start;
      const avgMs = totalMs / 100;

      expect(avgMs).toBeLessThan(1.0);
    });

    it('rejects invalid collections early without unbounded latency', () => {
      const frames: RawFrameData[] = [];
      for (let i = 0; i < 300; i++) {
        frames.push(makeFrame(16, 16));
      }
      // Introduce corruption at frame 299
      frames[299] = { width: 16, height: 16, data: new Uint8ClampedArray(10) };

      const start = performance.now();
      expect(() => validateRawFrames(frames)).toThrow(RangeError);
      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(1.0);
    });
  });

  describe('Requirement 2: Transparency Preservation (a < 128 maps to transparent index)', () => {
    it('quantizePixels maps all a < 128 strictly to transparentIndex and a >= 128 to opaque colors', () => {
      // 256 pixels, one for each alpha value from 0 to 255
      const pixelCount = 256;
      const data = new Uint8ClampedArray(pixelCount * 4);
      for (let a = 0; a < 256; a++) {
        data[a * 4] = 200;     // R
        data[a * 4 + 1] = 100; // G
        data[a * 4 + 2] = 50;  // B
        data[a * 4 + 3] = a;   // A
      }

      const { palette, indexedPixels, transparentIndex } = quantizePixels(data, pixelCount);

      expect(transparentIndex).toBeGreaterThanOrEqual(0);
      expect(transparentIndex).toBe(palette.length - 1);

      // Verify the transparent palette slot
      expect(palette[transparentIndex]).toEqual([0, 0, 0]);

      // Verify exact boundary mapping
      for (let a = 0; a < 256; a++) {
        const idx = indexedPixels[a];
        if (a < 128) {
          expect(idx).toBe(transparentIndex);
        } else {
          expect(idx).not.toBe(transparentIndex);
        }
      }
    });

    it('preserves exact boundary thresholds a = 127 vs a = 128 in decoded GIF pixels', () => {
      // 2x1 image: pixel 0 has a = 127, pixel 1 has a = 128
      const frame: RawFrameData = {
        width: 2,
        height: 1,
        data: new Uint8ClampedArray([
          255, 0, 0, 127,  // Pixel 0: a=127 -> transparent
          255, 0, 0, 128,  // Pixel 1: a=128 -> opaque red
        ]),
      };

      const gifBytes = encodeGifRawFrames([frame], 10);
      const decoded = readAnimatedGif(Buffer.from(gifBytes));

      expect(decoded.width).toBe(2);
      expect(decoded.height).toBe(1);
      expect(decoded.frames.length).toBe(1);

      const decodedPixels = decoded.frames[0].data;
      // Pixel 0: transparent (0, 0, 0, 0)
      expect(decodedPixels.slice(0, 4)).toEqual([0, 0, 0, 0]);
      // Pixel 1: opaque red (255, 0, 0, 255)
      expect(decodedPixels.slice(4, 8)).toEqual([255, 0, 0, 255]);
    });

    it('prevents color collision when transparent and opaque pixels share identical RGB values', () => {
      // Both pixels have R=255, G=0, B=0, but pixel 0 is a=0 and pixel 1 is a=255
      const frame: RawFrameData = {
        width: 2,
        height: 1,
        data: new Uint8ClampedArray([
          255, 0, 0, 0,    // transparent red
          255, 0, 0, 255,  // opaque red
        ]),
      };

      const gifBytes = encodeGifRawFrames([frame], 10);
      const decoded = readAnimatedGif(Buffer.from(gifBytes));

      const decodedPixels = decoded.frames[0].data;
      expect(decodedPixels.slice(0, 4)).toEqual([0, 0, 0, 0]);
      expect(decodedPixels.slice(4, 8)).toEqual([255, 0, 0, 255]);
    });

    it('handles 100% transparent frames correctly (no opaque colors)', () => {
      const frame = makeFrame(4, 4, [0, 0, 0, 0]);
      const gifBytes = encodeGifRawFrames([frame], 10);
      const decoded = readAnimatedGif(Buffer.from(gifBytes));

      expect(decoded.frames.length).toBe(1);
      // All 16 pixels must be 0,0,0,0
      for (let i = 0; i < 16; i++) {
        expect(decoded.frames[0].data.slice(i * 4, i * 4 + 4)).toEqual([0, 0, 0, 0]);
      }
    });

    it('handles 100% opaque frames with no transparentIndex in GCE', () => {
      const frame = makeFrame(4, 4, [100, 150, 200, 255]);
      const gifBytes = encodeGifRawFrames([frame], 10);

      // Inspect GCE directly in binary stream
      // Header (6) + ScreenDesc (7) + Netscape (19) = 32 bytes offset to first GCE
      const gceOffset = 32;
      expect(gifBytes[gceOffset]).toBe(0x21); // Extension Introducer
      expect(gifBytes[gceOffset + 1]).toBe(0xF9); // GCE label
      expect(gifBytes[gceOffset + 2]).toBe(4); // Block size
      const packedFields = gifBytes[gceOffset + 3];
      const transparentFlag = packedFields & 1;
      expect(transparentFlag).toBe(0); // Transparent color flag MUST be 0

      const decoded = readAnimatedGif(Buffer.from(gifBytes));
      expect(decoded.frames[0].data.slice(0, 4)).toEqual([100, 150, 200, 255]);
    });

    it('handles 256 unique opaque colors PLUS transparent pixels without palette overflow (>256)', () => {
      // 16x17 canvas = 272 pixels. 256 unique colors + 16 transparent pixels
      const width = 16;
      const height = 17;
      const data = new Uint8ClampedArray(width * height * 4);

      // 256 opaque unique colors
      for (let i = 0; i < 256; i++) {
        data[i * 4] = i;        // distinct R
        data[i * 4 + 1] = 255 - i; // distinct G
        data[i * 4 + 2] = (i * 7) % 256;
        data[i * 4 + 3] = 255;  // opaque
      }
      // Remaining 16 pixels are transparent
      for (let i = 256; i < width * height; i++) {
        data[i * 4] = 0;
        data[i * 4 + 1] = 0;
        data[i * 4 + 2] = 0;
        data[i * 4 + 3] = 0;    // transparent
      }

      const frame: RawFrameData = { width, height, data };
      const { palette, indexedPixels, transparentIndex } = quantizePixels(data, width * height);

      // Must fit in 256 entries
      expect(palette.length).toBeLessThanOrEqual(256);
      expect(transparentIndex).toBe(palette.length - 1);
      expect(transparentIndex).toBeLessThan(256);

      // Verify transparent pixels map to transparentIndex
      for (let i = 256; i < width * height; i++) {
        expect(indexedPixels[i]).toBe(transparentIndex);
      }

      // Encode and decode full GIF stream
      const gifBytes = encodeGifRawFrames([frame], 10);
      expect(gifBytes.length).toBeGreaterThan(0);
      const decoded = readAnimatedGif(Buffer.from(gifBytes));
      expect(decoded.frames.length).toBe(1);

      // Verify transparent pixels preserved in decoded output
      for (let i = 256; i < width * height; i++) {
        expect(decoded.frames[0].data.slice(i * 4, i * 4 + 4)).toEqual([0, 0, 0, 0]);
      }
    });

    it('preserves per-frame independent transparency in multi-frame animation', () => {
      // Frame 0: transparent circle on green (pixel 0 transparent)
      // Frame 1: blue with transparent corner (pixel 15 transparent)
      // Frame 2: transparent cross on yellow (pixel 5 transparent)
      const f0 = makeFrame(4, 4, [0, 255, 0, 255]);
      f0.data[0 * 4 + 3] = 0; // pixel 0 transparent

      const f1 = makeFrame(4, 4, [0, 0, 255, 255]);
      f1.data[15 * 4 + 3] = 0; // pixel 15 transparent

      const f2 = makeFrame(4, 4, [255, 255, 0, 255]);
      f2.data[5 * 4 + 3] = 50; // pixel 5 transparent (a < 128)

      // Verify quantizePixels independently on each frame
      const q0 = quantizePixels(f0.data, 16);
      expect(q0.transparentIndex).toBeGreaterThanOrEqual(0);
      expect(q0.indexedPixels[0]).toBe(q0.transparentIndex);

      const q1 = quantizePixels(f1.data, 16);
      expect(q1.transparentIndex).toBeGreaterThanOrEqual(0);
      expect(q1.indexedPixels[15]).toBe(q1.transparentIndex);

      const q2 = quantizePixels(f2.data, 16);
      expect(q2.transparentIndex).toBeGreaterThanOrEqual(0);
      expect(q2.indexedPixels[5]).toBe(q2.transparentIndex);

      const gifBytes = encodeGifRawFrames([f0, f1, f2], 10);
      const decoded = readAnimatedGif(Buffer.from(gifBytes));

      expect(decoded.frames.length).toBe(3);
      // Frame 0 has pixel 0 transparent
      expect(decoded.frames[0].data.slice(0, 4)).toEqual([0, 0, 0, 0]);
      expect(decoded.frames[0].data.slice(4, 8)).toEqual([0, 255, 0, 255]);

      // Frame 1 has pixel 15 transparent
      expect(decoded.frames[1].data.slice(15 * 4, 15 * 4 + 4)).toEqual([0, 0, 0, 0]);
      expect(decoded.frames[1].data.slice(0, 4)).toEqual([0, 0, 255, 255]);

      // Frame 2 has pixel 5 transparent
      expect(decoded.frames[2].data.slice(5 * 4, 5 * 4 + 4)).toEqual([0, 0, 0, 0]);
      expect(decoded.frames[2].data.slice(0, 4)).toEqual([255, 255, 0, 255]);
    });
  });

  describe('Requirement 3: Legitimate Multi-Frame Export Integrity (Valid GIF89a Header & Structure)', () => {
    it('produces valid GIF89a signature, logical screen descriptor, and trailer', () => {
      const frames = [
        makeFrame(12, 16, [255, 0, 0, 255]),
        makeFrame(12, 16, [0, 255, 0, 255]),
      ];

      const gifBytes = encodeGifRawFrames(frames, 10, undefined, [20, 30], true);

      // Header: GIF89a
      const header = String.fromCharCode(...gifBytes.slice(0, 6));
      expect(header).toBe('GIF89a');

      // Logical Screen Descriptor
      const width = gifBytes[6] | (gifBytes[7] << 8);
      const height = gifBytes[8] | (gifBytes[9] << 8);
      expect(width).toBe(12);
      expect(height).toBe(16);

      const packed = gifBytes[10];
      expect(packed).toBe(0x70); // Global Color Table = 0, Color Res = 8 bits

      // Netscape 2.0 loop extension present when repeat = true
      const netscapeText = new TextDecoder().decode(gifBytes);
      expect(netscapeText).toContain('NETSCAPE2.0');

      // Trailer byte
      expect(gifBytes[gifBytes.length - 1]).toBe(0x3B);
    });

    it('omits Netscape extension when repeat is false (play once)', () => {
      const frames = [
        makeFrame(8, 8, [255, 0, 0, 255]),
        makeFrame(8, 8, [0, 255, 0, 255]),
      ];

      const gifBytes = encodeGifRawFrames(frames, 10, undefined, [10, 10], false);
      const netscapeText = new TextDecoder().decode(gifBytes);
      expect(netscapeText).not.toContain('NETSCAPE2.0');
      expect(gifBytes[gifBytes.length - 1]).toBe(0x3B);
    });

    it('encodes and decodes multi-frame sequences with custom frame delays accurately', () => {
      const delaysCs = [5, 12, 25, 40]; // centiseconds (50ms, 120ms, 250ms, 400ms)
      const frames = [
        makeFrame(4, 4, [255, 0, 0, 255]),
        makeFrame(4, 4, [0, 255, 0, 255]),
        makeFrame(4, 4, [0, 0, 255, 255]),
        makeFrame(4, 4, [255, 255, 255, 255]),
      ];

      const gifBytes = encodeGifRawFrames(frames, 10, undefined, delaysCs, true);
      const decoded = readAnimatedGif(Buffer.from(gifBytes));

      expect(decoded.frames.length).toBe(4);
      for (let i = 0; i < 4; i++) {
        expect(decoded.frames[i].delayMs).toBe(delaysCs[i] * 10);
      }

      // Check pixel contents
      expect(decoded.frames[0].data.slice(0, 4)).toEqual([255, 0, 0, 255]);
      expect(decoded.frames[1].data.slice(0, 4)).toEqual([0, 255, 0, 255]);
      expect(decoded.frames[2].data.slice(0, 4)).toEqual([0, 0, 255, 255]);
      expect(decoded.frames[3].data.slice(0, 4)).toEqual([255, 255, 255, 255]);
    });

    it('successfully stress-tests large multi-frame sequence (50 frames)', () => {
      const count = 50;
      const frames: RawFrameData[] = [];
      for (let i = 0; i < count; i++) {
        // Pixel art animation: 8x8 canvas with moving diagonal pixel
        const f = makeFrame(8, 8, [10, 10, 10, 255]);
        const activePixel = (i % 8) * 8 + (i % 8);
        f.data[activePixel * 4] = 255;
        f.data[activePixel * 4 + 1] = (i * 5) % 256;
        f.data[activePixel * 4 + 2] = 200;
        frames.push(f);
      }

      let progressCalls = 0;
      const gifBytes = encodeGifRawFrames(frames, 24, (current, total) => {
        progressCalls++;
        expect(current).toBe(progressCalls);
        expect(total).toBe(count);
      });

      expect(progressCalls).toBe(count);
      expect(gifBytes.length).toBeGreaterThan(0);
      expect(String.fromCharCode(...gifBytes.slice(0, 6))).toBe('GIF89a');
      expect(gifBytes[gifBytes.length - 1]).toBe(0x3B);

      const decoded = readAnimatedGif(Buffer.from(gifBytes));
      expect(decoded.frames.length).toBe(count);
      expect(decoded.width).toBe(8);
      expect(decoded.height).toBe(8);
    });

    it('extractScaledRawFrames enforces dimension uniformity and correctly scales frames', () => {
      const canvases = [
        createMockCanvas(8, 8, [255, 0, 0, 255]),
        createMockCanvas(8, 8, [0, 255, 0, 255]),
      ];

      const scaled = extractScaledRawFrames(canvases, 3);
      expect(scaled.length).toBe(2);
      expect(scaled[0].width).toBe(24);
      expect(scaled[0].height).toBe(24);
      expect(scaled[0].data.byteLength).toBe(24 * 24 * 4);
      expect(scaled[1].width).toBe(24);
      expect(scaled[1].height).toBe(24);
      expect(scaled[1].data.byteLength).toBe(24 * 24 * 4);

      // Verify validation passes on the scaled output
      expect(() => validateRawFrames(scaled)).not.toThrow();
    });

    it('preserves distinct local palettes across frames without color cross-contamination', () => {
      const f0 = makeFrame(2, 2, [255, 0, 0, 255]); // pure red
      const f1 = makeFrame(2, 2, [0, 255, 0, 255]); // pure green
      const f2 = makeFrame(2, 2, [0, 0, 255, 255]); // pure blue
      const f3 = makeFrame(2, 2, [255, 255, 0, 255]); // pure yellow

      const gifBytes = encodeGifRawFrames([f0, f1, f2, f3], 10);
      const decoded = readAnimatedGif(Buffer.from(gifBytes));

      expect(decoded.frames.length).toBe(4);
      expect(decoded.frames[0].data.slice(0, 4)).toEqual([255, 0, 0, 255]);
      expect(decoded.frames[1].data.slice(0, 4)).toEqual([0, 255, 0, 255]);
      expect(decoded.frames[2].data.slice(0, 4)).toEqual([0, 0, 255, 255]);
      expect(decoded.frames[3].data.slice(0, 4)).toEqual([255, 255, 0, 255]);
    });

    it('supports 1x1 minimal dimension boundary multi-frame export', () => {
      const f0 = makeFrame(1, 1, [255, 128, 0, 255]);
      const f1 = makeFrame(1, 1, [0, 128, 255, 255]);

      const gifBytes = encodeGifRawFrames([f0, f1], 10);
      expect(gifBytes.length).toBeGreaterThan(0);
      expect(String.fromCharCode(...gifBytes.slice(0, 6))).toBe('GIF89a');

      const decoded = readAnimatedGif(Buffer.from(gifBytes));
      expect(decoded.width).toBe(1);
      expect(decoded.height).toBe(1);
      expect(decoded.frames.length).toBe(2);
      expect(decoded.frames[0].data).toEqual([255, 128, 0, 255]);
      expect(decoded.frames[1].data).toEqual([0, 128, 255, 255]);
    });

    it('supports extreme aspect ratios: 64x1 horizontal and 1x64 vertical', () => {
      const w0 = makeFrame(64, 1);
      for (let i = 0; i < 64; i++) { w0.data[i * 4] = (i * 7) % 256; w0.data[i * 4 + 3] = 255; }
      const w1 = makeFrame(64, 1);
      for (let i = 0; i < 64; i++) { w1.data[i * 4 + 1] = (i * 11) % 256; w1.data[i * 4 + 3] = 255; }
      const wideFrames = [w0, w1];

      const t0 = makeFrame(1, 64);
      for (let i = 0; i < 64; i++) { t0.data[i * 4] = (i * 7) % 256; t0.data[i * 4 + 3] = 255; }
      const t1 = makeFrame(1, 64);
      for (let i = 0; i < 64; i++) { t1.data[i * 4 + 1] = (i * 11) % 256; t1.data[i * 4 + 3] = 255; }
      const tallFrames = [t0, t1];

      const wideBytes = encodeGifRawFrames(wideFrames, 10);
      const tallBytes = encodeGifRawFrames(tallFrames, 10);

      const decodedWide = readAnimatedGif(Buffer.from(wideBytes));
      expect(decodedWide.width).toBe(64);
      expect(decodedWide.height).toBe(1);
      expect(decodedWide.frames.length).toBe(2);

      const decodedTall = readAnimatedGif(Buffer.from(tallBytes));
      expect(decodedTall.width).toBe(1);
      expect(decodedTall.height).toBe(64);
      expect(decodedTall.frames.length).toBe(2);
      expect(decodedTall.frames.length).toBe(2);
    });

    it('enforces minimum frame delay of 2 centiseconds (20ms) to prevent browser throttling', () => {
      // Input delays: 0cs, 1cs
      const frames = [makeFrame(2, 2, [255, 0, 0, 255]), makeFrame(2, 2, [0, 255, 0, 255])];
      const gifBytes = encodeGifRawFrames(frames, 60, undefined, [0, 1]);
      const decoded = readAnimatedGif(Buffer.from(gifBytes));

      expect(decoded.frames[0].delayMs).toBeGreaterThanOrEqual(20);
      expect(decoded.frames[1].delayMs).toBeGreaterThanOrEqual(20);
    });

    it('encodes a 120-frame animation (5s at 24fps) with complete stream integrity', () => {
      const count = 120;
      const frames: RawFrameData[] = [];
      for (let i = 0; i < count; i++) {
        frames.push(makeFrame(16, 16, [i % 256, (i * 2) % 256, (i * 3) % 256, 255]));
      }

      const gifBytes = encodeGifRawFrames(frames, 24);
      expect(gifBytes.length).toBeGreaterThan(0);
      expect(String.fromCharCode(...gifBytes.slice(0, 6))).toBe('GIF89a');
      expect(gifBytes[gifBytes.length - 1]).toBe(0x3B);

      const decoded = readAnimatedGif(Buffer.from(gifBytes));
      expect(decoded.frames.length).toBe(120);
      expect(decoded.width).toBe(16);
      expect(decoded.height).toBe(16);
    });
  });
});
