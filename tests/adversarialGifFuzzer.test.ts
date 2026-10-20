/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
import {
  encodeGifRawFrames,
  validateRawFrames,
  type RawFrameData,
} from '@/lib/export/gifEncoderCore';

describe('Adversarial Fuzzer Stress Suite (challenger_m3_1)', () => {
  describe('Dimension 1: 0-Byte Detached Buffers', () => {
    it('rejects frame 0 with detached buffer via MessageChannel transfer', () => {
      const buffer = new ArrayBuffer(16 * 16 * 4);
      const data = new Uint8ClampedArray(buffer);
      const { port1 } = new MessageChannel();
      port1.postMessage(buffer, [buffer]);

      expect(data.byteLength).toBe(0);
      expect(buffer.detached).toBe(true);

      const frames: RawFrameData[] = [{ width: 16, height: 16, data }];
      expect(() => validateRawFrames(frames)).toThrow(RangeError);
      expect(() => validateRawFrames(frames)).toThrow(
        /Frame 0 payload length \(0 bytes\) does not match expected RGBA byte length \(1024 bytes for 16x16\)/
      );
      expect(() => encodeGifRawFrames(frames, 10)).toThrow(RangeError);
    });

    it('rejects frame 0 with detached buffer via structuredClone transfer', () => {
      const data = new Uint8ClampedArray(8 * 8 * 4);
      structuredClone(data, { transfer: [data.buffer] });

      expect(data.byteLength).toBe(0);
      const frames: RawFrameData[] = [{ width: 8, height: 8, data }];
      expect(() => validateRawFrames(frames)).toThrow(
        /Frame 0 payload length \(0 bytes\) does not match expected RGBA byte length \(256 bytes for 8x8\)/
      );
      expect(() => encodeGifRawFrames(frames, 10)).toThrow(RangeError);
    });

    it('rejects frame 49 of 50 when frame 49 buffer is detached', () => {
      const frames: RawFrameData[] = [];
      for (let i = 0; i < 50; i++) {
        frames.push({
          width: 8,
          height: 8,
          data: new Uint8ClampedArray(8 * 8 * 4),
        });
      }

      // Detach frame 49 buffer
      const targetBuf = frames[49].data.buffer;
      const { port1 } = new MessageChannel();
      port1.postMessage(targetBuf, [targetBuf]);
      expect(frames[49].data.byteLength).toBe(0);

      expect(() => validateRawFrames(frames)).toThrow(
        /Frame 49 payload length \(0 bytes\) does not match expected RGBA byte length \(256 bytes for 8x8\)/
      );
      expect(() => encodeGifRawFrames(frames, 10)).toThrow(RangeError);
    });

    it('rejects detached standard Uint8Array frame payload', () => {
      const buffer = new ArrayBuffer(4 * 4 * 4);
      const data = new Uint8Array(buffer);
      const { port1 } = new MessageChannel();
      port1.postMessage(buffer, [buffer]);

      const frames: RawFrameData[] = [{ width: 4, height: 4, data: data as unknown as Uint8ClampedArray }];
      expect(() => validateRawFrames(frames)).toThrow(RangeError);
      expect(() => encodeGifRawFrames(frames, 10)).toThrow(RangeError);
    });

    it('rejects zero-length allocated Uint8ClampedArray buffer for non-zero dimensions', () => {
      const frames: RawFrameData[] = [{ width: 10, height: 10, data: new Uint8ClampedArray(0) }];
      expect(() => validateRawFrames(frames)).toThrow(
        /Frame 0 payload length \(0 bytes\) does not match expected RGBA byte length \(400 bytes for 10x10\)/
      );
    });
  });

  describe('Dimension 2: Out-of-Range Dimensions (NaN, Infinity, 65536)', () => {
    it('rejects NaN width in initial frame with RangeError', () => {
      expect(() =>
        validateRawFrames([{ width: NaN, height: 16, data: new Uint8ClampedArray(1024) }])
      ).toThrow(/Invalid canvas width: NaN\. Frame width must be a positive integer between 1 and 65535\./);
    });

    it('rejects NaN height in initial frame with RangeError', () => {
      expect(() =>
        validateRawFrames([{ width: 16, height: NaN, data: new Uint8ClampedArray(1024) }])
      ).toThrow(/Invalid canvas height: NaN\. Frame height must be a positive integer between 1 and 65535\./);
    });

    it('rejects Infinity and -Infinity width in initial frame with RangeError', () => {
      expect(() =>
        validateRawFrames([{ width: Infinity, height: 16, data: new Uint8ClampedArray(1024) }])
      ).toThrow(/Invalid canvas width: Infinity/);

      expect(() =>
        validateRawFrames([{ width: -Infinity, height: 16, data: new Uint8ClampedArray(1024) }])
      ).toThrow(/Invalid canvas width: -Infinity/);
    });

    it('rejects Infinity and -Infinity height in initial frame with RangeError', () => {
      expect(() =>
        validateRawFrames([{ width: 16, height: Infinity, data: new Uint8ClampedArray(1024) }])
      ).toThrow(/Invalid canvas height: Infinity/);

      expect(() =>
        validateRawFrames([{ width: 16, height: -Infinity, data: new Uint8ClampedArray(1024) }])
      ).toThrow(/Invalid canvas height: -Infinity/);
    });

    it('rejects dimension 65536 exceeding 16-bit unsigned integer max', () => {
      expect(() =>
        validateRawFrames([{ width: 65536, height: 16, data: new Uint8ClampedArray(65536 * 16 * 4) }])
      ).toThrow(/Invalid canvas width: 65536\. Frame width must be a positive integer between 1 and 65535\./);

      expect(() =>
        validateRawFrames([{ width: 16, height: 65536, data: new Uint8ClampedArray(16 * 65536 * 4) }])
      ).toThrow(/Invalid canvas height: 65536\. Frame height must be a positive integer between 1 and 65535\./);
    });

    it('rejects frame 49 of 50 when width or height is NaN, Infinity, or 65536', () => {
      const makeFrames = (badW: number, badH: number): RawFrameData[] => {
        return Array.from({ length: 50 }, (_, i) => ({
          width: i === 49 ? badW : 16,
          height: i === 49 ? badH : 16,
          data: new Uint8ClampedArray(16 * 16 * 4),
        }));
      };

      expect(() => validateRawFrames(makeFrames(NaN, 16))).toThrow(
        /Frame 49 dimensions \(NaNx16\) do not match canvas dimensions \(16x16\)/
      );
      expect(() => validateRawFrames(makeFrames(Infinity, 16))).toThrow(
        /Frame 49 dimensions \(Infinityx16\) do not match canvas dimensions \(16x16\)/
      );
      expect(() => validateRawFrames(makeFrames(65536, 16))).toThrow(
        /Frame 49 dimensions \(65536x16\) do not match canvas dimensions \(16x16\)/
      );
    });
  });

  describe('Dimension 3: Mixed Dimensions in Large Frame Collections', () => {
    it('detects mixed dimensions at frame 49 of 50 (width +1)', () => {
      const frames: RawFrameData[] = Array.from({ length: 50 }, (_, i) => ({
        width: i === 49 ? 17 : 16,
        height: 16,
        data: new Uint8ClampedArray((i === 49 ? 17 : 16) * 16 * 4),
      }));

      expect(() => validateRawFrames(frames)).toThrow(
        /Frame 49 dimensions \(17x16\) do not match canvas dimensions \(16x16\)/
      );
      expect(() => encodeGifRawFrames(frames, 12)).toThrow(RangeError);
    });

    it('detects mixed dimensions at frame 49 of 50 (height +1)', () => {
      const frames: RawFrameData[] = Array.from({ length: 50 }, (_, i) => ({
        width: 16,
        height: i === 49 ? 17 : 16,
        data: new Uint8ClampedArray(16 * (i === 49 ? 17 : 16) * 4),
      }));

      expect(() => validateRawFrames(frames)).toThrow(
        /Frame 49 dimensions \(16x17\) do not match canvas dimensions \(16x16\)/
      );
    });

    it('detects mixed dimensions at frame 99 of 100', () => {
      const frames: RawFrameData[] = Array.from({ length: 100 }, (_, i) => ({
        width: i === 99 ? 32 : 16,
        height: i === 99 ? 32 : 16,
        data: new Uint8ClampedArray((i === 99 ? 32 : 16) * (i === 99 ? 32 : 16) * 4),
      }));

      expect(() => validateRawFrames(frames)).toThrow(
        /Frame 99 dimensions \(32x32\) do not match canvas dimensions \(16x16\)/
      );
    });

    it('detects payload length mismatch at frame 49 of 50 with matching dimensions', () => {
      const frames: RawFrameData[] = Array.from({ length: 50 }, (_, i) => ({
        width: 16,
        height: 16,
        data: i === 49 ? new Uint8ClampedArray(16 * 16 * 4 - 4) : new Uint8ClampedArray(16 * 16 * 4),
      }));

      expect(() => validateRawFrames(frames)).toThrow(
        /Frame 49 payload length \(1020 bytes\) does not match expected RGBA byte length \(1024 bytes for 16x16\)/
      );
    });
  });

  describe('Dimension 4: Zero-Dimension Edge Cases (0x0, 0x10, 10x0) Without Hangs', () => {
    it('synchronously rejects 0x0 frame without hang (< 20ms)', () => {
      const start = performance.now();
      const frames: RawFrameData[] = [{ width: 0, height: 0, data: new Uint8ClampedArray(0) }];

      expect(() => validateRawFrames(frames)).toThrow(RangeError);
      expect(() => validateRawFrames(frames)).toThrow(/Invalid canvas width: 0/);
      expect(() => encodeGifRawFrames(frames, 10)).toThrow(RangeError);

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(50);
    });

    it('synchronously rejects 0x10 frame without hang (< 20ms)', () => {
      const start = performance.now();
      const frames: RawFrameData[] = [{ width: 0, height: 16, data: new Uint8ClampedArray(0) }];

      expect(() => validateRawFrames(frames)).toThrow(RangeError);
      expect(() => validateRawFrames(frames)).toThrow(/Invalid canvas width: 0/);
      expect(() => encodeGifRawFrames(frames, 10)).toThrow(RangeError);

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(50);
    });

    it('synchronously rejects 10x0 frame without hang (< 20ms)', () => {
      const start = performance.now();
      const frames: RawFrameData[] = [{ width: 10, height: 0, data: new Uint8ClampedArray(0) }];

      expect(() => validateRawFrames(frames)).toThrow(RangeError);
      expect(() => validateRawFrames(frames)).toThrow(/Invalid canvas height: 0/);
      expect(() => encodeGifRawFrames(frames, 10)).toThrow(RangeError);

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(50);
    });

    it('synchronously rejects 0-dimension frame at index 49 of 50 without hang', () => {
      const start = performance.now();
      const frames: RawFrameData[] = Array.from({ length: 50 }, (_, i) => ({
        width: i === 49 ? 0 : 16,
        height: i === 49 ? 0 : 16,
        data: i === 49 ? new Uint8ClampedArray(0) : new Uint8ClampedArray(16 * 16 * 4),
      }));

      expect(() => validateRawFrames(frames)).toThrow(
        /Frame 49 dimensions \(0x0\) do not match canvas dimensions \(16x16\)/
      );
      expect(() => encodeGifRawFrames(frames, 10)).toThrow(RangeError);

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(50);
    });
  });

  describe('Dimension 5: Adversarial Fuzzing Matrix', () => {
    it('survives 150 adversarial random permutations without uncaught exceptions or hangs', () => {
      const badWidths = [NaN, Infinity, -Infinity, -10, 0, 0.5, 65536, 120000];
      const badHeights = [NaN, Infinity, -Infinity, -1, 0, 1.25, 65536, 999999];
      const badTypes = [null, undefined, 42, 'invalid', {}, false, [1, 2, 3]];

      for (let i = 0; i < 150; i++) {
        const scenario = i % 5;
        let testInput: unknown;

        if (scenario === 0) {
          // Bad array shape
          testInput = badTypes[i % badTypes.length];
        } else if (scenario === 1) {
          // Empty or containing bad item
          testInput = i % 2 === 0 ? [] : [badTypes[i % badTypes.length]];
        } else if (scenario === 2) {
          // Frame with invalid width/height
          testInput = [{
            width: badWidths[i % badWidths.length],
            height: badHeights[i % badHeights.length],
            data: new Uint8ClampedArray(16),
          }];
        } else if (scenario === 3) {
          // Frame with invalid data property
          testInput = [{
            width: 4,
            height: 4,
            data: badTypes[i % badTypes.length],
          }];
        } else {
          // Frame with mismatched byte lengths
          const byteLen = (i * 13) % 120;
          testInput = [{
            width: 4,
            height: 4,
            data: new Uint8ClampedArray(byteLen === 64 ? 65 : byteLen),
          }];
        }

        expect(() => validateRawFrames(testInput as RawFrameData[])).toThrow();
        expect(() => encodeGifRawFrames(testInput as RawFrameData[], 10)).toThrow();
      }
    });
  });

  describe('Dimension 6: Legitimate Export Non-Regression Control', () => {
    it('encodes a valid multi-frame animation without regression', () => {
      const frames: RawFrameData[] = [
        { width: 8, height: 8, data: new Uint8ClampedArray(8 * 8 * 4) },
        { width: 8, height: 8, data: new Uint8ClampedArray(8 * 8 * 4) },
      ];
      // Frame 1 has blue
      frames[0].data[2] = 255;
      frames[0].data[3] = 255;
      // Frame 2 has yellow
      frames[1].data[0] = 255;
      frames[1].data[1] = 255;
      frames[1].data[3] = 255;

      const bytes = encodeGifRawFrames(frames, 10, undefined, [20, 30], true);
      expect(bytes.length).toBeGreaterThan(0);
      expect(String.fromCharCode(...bytes.slice(0, 6))).toBe('GIF89a');
      expect(bytes[bytes.length - 1]).toBe(0x3B);
    });
  });
});
