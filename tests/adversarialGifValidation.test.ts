/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
import {
  encodeGifRawFrames,
  validateRawFrames,
  type RawFrameData,
} from '@/lib/export/gifEncoderCore';

describe('Adversarial Forensic Audit — GIF Encoder Input Validation', () => {
  describe('Extreme boundary and type coercion stress tests', () => {
    it('rejects non-integer float close to integer (10.0000001)', () => {
      expect(() =>
        validateRawFrames([
          { width: 10.0000001, height: 10, data: new Uint8ClampedArray(400) },
        ])
      ).toThrow(RangeError);
    });

    it('rejects boolean width / height masquerading as numbers', () => {
      expect(() =>
        validateRawFrames([
          { width: true as unknown as number, height: 10, data: new Uint8ClampedArray(40) },
        ])
      ).toThrow(RangeError);
    });

    it('rejects string numbers without auto-coercing', () => {
      expect(() =>
        validateRawFrames([
          { width: '16' as unknown as number, height: 16, data: new Uint8ClampedArray(1024) },
        ])
      ).toThrow(RangeError);
    });

    it('rejects exact boundary violation 65536', () => {
      expect(() =>
        validateRawFrames([
          { width: 65536, height: 1, data: new Uint8ClampedArray(65536 * 4) },
        ])
      ).toThrow(RangeError);
    });

    it('permits maximum valid 16-bit dimension 65535 (validation only)', () => {
      // Create a dummy typed array with exact byte length matching width 65535 * height 1 * 4
      const buf = new Uint8Array(65535 * 4);
      expect(() =>
        validateRawFrames([
          { width: 65535, height: 1, data: buf as unknown as Uint8ClampedArray },
        ])
      ).not.toThrow();
    });

    it('rejects primitive types passed in place of frame collection', () => {
      expect(() => validateRawFrames(123 as unknown as RawFrameData[])).toThrow(TypeError);
      expect(() => validateRawFrames('frames' as unknown as RawFrameData[])).toThrow(TypeError);
      expect(() => validateRawFrames(true as unknown as RawFrameData[])).toThrow(TypeError);
      expect(() => validateRawFrames({} as unknown as RawFrameData[])).toThrow(TypeError);
    });

    it('rejects sparse arrays with missing frame slots', () => {
      const sparse = new Array(3) as RawFrameData[];
      sparse[0] = { width: 4, height: 4, data: new Uint8ClampedArray(64) };
      // sparse[1] is undefined hole
      sparse[2] = { width: 4, height: 4, data: new Uint8ClampedArray(64) };

      expect(() => validateRawFrames(sparse)).toThrow(
        /Frame 1 is not a valid frame object/
      );
    });

    it('rejects foreign typed arrays like Float32Array or Int32Array', () => {
      const f32 = new Float32Array(16);
      expect(() =>
        validateRawFrames([
          { width: 2, height: 2, data: f32 as unknown as Uint8ClampedArray },
        ])
      ).toThrow(/Frame 0 data must be a Uint8ClampedArray or Uint8Array/);
    });

    it('rejects late frame mismatch in deep multi-frame sequence', () => {
      const frames: RawFrameData[] = [];
      for (let i = 0; i < 10; i++) {
        frames.push({ width: 8, height: 8, data: new Uint8ClampedArray(8 * 8 * 4) });
      }
      // Corrupt 9th frame dimensions
      frames[8] = { width: 8, height: 9, data: new Uint8ClampedArray(8 * 9 * 4) };

      expect(() => validateRawFrames(frames)).toThrow(
        /Frame 8 dimensions \(8x9\) do not match canvas dimensions \(8x8\)/
      );
    });

    it('rejects late payload length mismatch in deep multi-frame sequence', () => {
      const frames: RawFrameData[] = [];
      for (let i = 0; i < 10; i++) {
        frames.push({ width: 8, height: 8, data: new Uint8ClampedArray(8 * 8 * 4) });
      }
      // Corrupt 7th frame payload length by 1 byte
      frames[7] = { width: 8, height: 8, data: new Uint8ClampedArray(8 * 8 * 4 - 1) };

      expect(() => validateRawFrames(frames)).toThrow(
        /Frame 7 payload length \(255 bytes\) does not match expected RGBA byte length \(256 bytes for 8x8\)/
      );
    });
  });

  describe('Capacity stress and real encoding verification', () => {
    it('successfully handles dynamic capacity reallocation across multiple frames without hanging', () => {
      // 20 frames of 64x64 pixels = 20 * 4096 = 81,920 pixels
      const frames: RawFrameData[] = [];
      for (let i = 0; i < 20; i++) {
        const data = new Uint8ClampedArray(64 * 64 * 4);
        // Add varying gradient to prevent extreme compression
        for (let p = 0; p < 64 * 64; p++) {
          data[p * 4] = (p + i * 10) & 0xff;
          data[p * 4 + 1] = (p * 2 + i) & 0xff;
          data[p * 4 + 2] = (p * 3) & 0xff;
          data[p * 4 + 3] = 255;
        }
        frames.push({ width: 64, height: 64, data });
      }

      const encoded = encodeGifRawFrames(frames, 10);
      expect(encoded.length).toBeGreaterThan(0);
      expect(String.fromCharCode(...encoded.slice(0, 6))).toBe('GIF89a');
      expect(encoded[encoded.length - 1]).toBe(0x3B);
    });

    it('correctly encodes 1x1 minimal single-pixel frame', () => {
      const data = new Uint8ClampedArray([255, 128, 64, 255]);
      const frames: RawFrameData[] = [{ width: 1, height: 1, data }];
      const encoded = encodeGifRawFrames(frames, 1);
      expect(encoded.length).toBeGreaterThan(0);
      expect(String.fromCharCode(...encoded.slice(0, 6))).toBe('GIF89a');
      expect(encoded[encoded.length - 1]).toBe(0x3B);
    });
  });
});
