import { describe, it, expect } from 'vitest';
import {
  encodeGifRawFrames,
  validateRawFrames,
  type RawFrameData,
} from '@/lib/export/gifEncoderCore';
import {
  extractScaledRawFrames,
  createAnimatedGifBlobAsync,
} from '@/lib/export/gifEncoder';

function createMockCanvas(width: number, height: number): HTMLCanvasElement {
  return {
    width,
    height,
    getContext: () => ({
      imageSmoothingEnabled: false,
      drawImage: () => {},
      getImageData: (_x: number, _y: number, w: number, h: number) => ({
        width: w,
        height: h,
        data: new Uint8ClampedArray(w * h * 4),
      }),
    }),
  } as unknown as HTMLCanvasElement;
}

describe('Task C — GIF Encoder Input Validation', () => {
  describe('Collection and Frame Structure Validation', () => {
    it('rejects non-array frames collection with TypeError', () => {
      expect(() => encodeGifRawFrames(null as unknown as RawFrameData[], 10)).toThrow(
        TypeError
      );
      expect(() => encodeGifRawFrames(undefined as unknown as RawFrameData[], 10)).toThrow(
        TypeError
      );
    });

    it('rejects empty frame collection with descriptive error', () => {
      expect(() => encodeGifRawFrames([], 10)).toThrow(
        'encodeGifRawFrames requires at least 1 frame.'
      );
    });

    it('rejects malformed frame objects in the collection', () => {
      expect(() =>
        encodeGifRawFrames([null as unknown as RawFrameData], 10)
      ).toThrow(TypeError);
      expect(() =>
        encodeGifRawFrames([
          { width: 10, height: 10, data: new Uint8ClampedArray(400) },
          null as unknown as RawFrameData,
        ], 10)
      ).toThrow(TypeError);
    });

    it('rejects frames with non-Uint8(Clamped)Array data', () => {
      expect(() =>
        encodeGifRawFrames([
          { width: 10, height: 10, data: [1, 2, 3] as unknown as Uint8ClampedArray },
        ], 10)
      ).toThrow(TypeError);
    });
  });

  describe('Canvas Dimension Bounds Validation', () => {
    it('rejects zero or negative dimensions with RangeError', () => {
      expect(() =>
        encodeGifRawFrames([
          { width: 0, height: 10, data: new Uint8ClampedArray(0) },
        ], 10)
      ).toThrow(RangeError);

      expect(() =>
        encodeGifRawFrames([
          { width: 10, height: -5, data: new Uint8ClampedArray(0) },
        ], 10)
      ).toThrow(RangeError);
    });

    it('rejects non-integer dimensions with RangeError', () => {
      expect(() =>
        encodeGifRawFrames([
          { width: 10.5, height: 10, data: new Uint8ClampedArray(420) },
        ], 10)
      ).toThrow(RangeError);
    });

    it('rejects out-of-range dimensions (>65535) with RangeError', () => {
      expect(() =>
        encodeGifRawFrames([
          { width: 70000, height: 10, data: new Uint8ClampedArray(0) },
        ], 10)
      ).toThrow(RangeError);
    });

    it('rejects NaN or Infinite dimensions with RangeError', () => {
      expect(() =>
        encodeGifRawFrames([
          { width: NaN, height: 10, data: new Uint8ClampedArray(0) },
        ], 10)
      ).toThrow(RangeError);
    });
  });

  describe('Inconsistent Frame Dimensions Across Frames', () => {
    it('rejects mixed frame dimensions with descriptive RangeError citing frame index and bounds', () => {
      const frames: RawFrameData[] = [
        { width: 10, height: 10, data: new Uint8ClampedArray(10 * 10 * 4) },
        { width: 20, height: 20, data: new Uint8ClampedArray(20 * 20 * 4) },
      ];
      expect(() => encodeGifRawFrames(frames, 10)).toThrow(
        /Frame 1 dimensions \(20x20\) do not match canvas dimensions \(10x10\)/
      );
    });

    it('rejects smaller subsequent frame dimensions without buffer overrun', () => {
      const frames: RawFrameData[] = [
        { width: 20, height: 20, data: new Uint8ClampedArray(20 * 20 * 4) },
        { width: 10, height: 10, data: new Uint8ClampedArray(10 * 10 * 4) },
      ];
      expect(() => encodeGifRawFrames(frames, 10)).toThrow(
        /Frame 1 dimensions \(10x10\) do not match canvas dimensions \(20x20\)/
      );
    });
  });

  describe('RGBA Payload Byte Length Validation', () => {
    it('rejects payload byte length shorter than width * height * 4', () => {
      const frames: RawFrameData[] = [
        { width: 10, height: 10, data: new Uint8ClampedArray(100) },
      ];
      expect(() => encodeGifRawFrames(frames, 10)).toThrow(
        /Frame 0 payload length \(100 bytes\) does not match expected RGBA byte length \(400 bytes for 10x10\)/
      );
    });

    it('rejects payload byte length longer than width * height * 4', () => {
      const frames: RawFrameData[] = [
        { width: 10, height: 10, data: new Uint8ClampedArray(800) },
      ];
      expect(() => encodeGifRawFrames(frames, 10)).toThrow(
        /Frame 0 payload length \(800 bytes\) does not match expected RGBA byte length \(400 bytes for 10x10\)/
      );
    });

    it('rejects detached 0-byte transfer buffer', () => {
      const frames: RawFrameData[] = [
        { width: 10, height: 10, data: new Uint8ClampedArray(0) },
      ];
      expect(() => encodeGifRawFrames(frames, 10)).toThrow(
        /Frame 0 payload length \(0 bytes\) does not match expected RGBA byte length \(400 bytes for 10x10\)/
      );
    });
  });

  describe('Canvas Extraction & Worker Pipeline Validation', () => {
    it('extractScaledRawFrames rejects mismatched canvas dimensions before extraction', () => {
      const canvases = [createMockCanvas(16, 16), createMockCanvas(32, 32)];
      expect(() => extractScaledRawFrames(canvases, 1)).toThrow(
        /Frame 1 canvas dimensions \(32x32\) do not match initial frame dimensions \(16x16\)/
      );
    });

    it('createAnimatedGifBlobAsync rejects mismatched canvases before worker transfer', async () => {
      const canvases = [createMockCanvas(16, 16), createMockCanvas(32, 32)];
      await expect(createAnimatedGifBlobAsync(canvases, 10)).rejects.toThrow(
        /Frame 1 canvas dimensions \(32x32\) do not match initial frame dimensions \(16x16\)/
      );
    });
  });

  describe('Legitimate Valid Exports Non-Regression', () => {
    it('successfully encodes valid multi-frame animation with transparency and delays', () => {
      const frames: RawFrameData[] = [
        { width: 8, height: 8, data: new Uint8ClampedArray(8 * 8 * 4) },
        { width: 8, height: 8, data: new Uint8ClampedArray(8 * 8 * 4) },
      ];
      // Frame 1 has some red and alpha
      frames[0].data[0] = 255;
      frames[0].data[3] = 255;
      // Frame 2 has green
      frames[1].data[1] = 255;
      frames[1].data[3] = 255;

      const bytes = encodeGifRawFrames(frames, 12, undefined, [10, 10], true);
      expect(bytes.length).toBeGreaterThan(0);
      expect(String.fromCharCode(...bytes.slice(0, 6))).toBe('GIF89a');
      expect(bytes[bytes.length - 1]).toBe(0x3B);
    });

    it('accepts Uint8Array standard typed array as well as Uint8ClampedArray', () => {
      const frames: RawFrameData[] = [
        { width: 4, height: 4, data: new Uint8Array(4 * 4 * 4) as unknown as Uint8ClampedArray },
      ];
      expect(() => validateRawFrames(frames)).not.toThrow();
      const bytes = encodeGifRawFrames(frames, 10);
      expect(bytes.length).toBeGreaterThan(0);
      expect(String.fromCharCode(...bytes.slice(0, 6))).toBe('GIF89a');
    });
  });
});
