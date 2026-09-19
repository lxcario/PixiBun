/**
 * imageHeaderProbe.ts
 *
 * Pre-flight binary image dimension inspector for PixiBun Atelier.
 * Defensively protects against Decompression Bombs ("Pixel Bombs" / CWE-409)
 * before allocating canvas memory or invoking browser decoders.
 *
 * Academic & Security References:
 * 1. Common Weakness Enumeration (CWE): CWE-409
 *    "Improper Handling of Highly Compressed Data (Decompression Bomb)"
 * 2. ISO/IEC 15948:2004 — Information technology: Computer graphics and image processing —
 *    Portable Network Graphics (PNG): Section 11.2.2 "IHDR Image header".
 * 3. ISO/IEC 10918-1:1994 — Digital compression and coding of continuous-tone still images (JPEG):
 *    Section B.2.2 "Frame header syntax (SOF0/SOF2)".
 * 4. CompuServe Incorporated. "Graphics Interchange Format: Version 89a."
 *    Section 18 "Logical Screen Descriptor".
 */

import { WORKSPACE_ENVELOPE } from '@/config/canvasLimits';

export interface ProbedImageDimensions {
  width: number;
  height: number;
  format: 'PNG' | 'GIF' | 'BMP' | 'JPEG' | 'WebP';
}

export class ImageHeaderProbe {
  /**
   * Maximum allowed single-axis dimension (8192px).
   */
  public static readonly MAX_ALLOWED_DIMENSION = WORKSPACE_ENVELOPE.MAX_PROBE_DIMENSION;

  /**
   * Maximum allowed total pixel area (67,108,864 pixels = 8192x8192).
   * Prevents allocating multi-gigabyte uncompressed RGBA pixel buffers.
   */
  public static readonly MAX_ALLOWED_PIXELS = WORKSPACE_ENVELOPE.MAX_PROBE_PIXELS;

  /** Maximum bytes to scan during JPEG marker segment traversal (16MB). */
  private static readonly MAX_PROBE_SEARCH_WINDOW = 16 * 1024 * 1024;

  /**
   * Probes an image header from a Blob, File, or raw ArrayBuffer/Uint8Array.
   * Supports streaming window paging for Blob/File inputs to handle late SOF segments.
   */
  public static async probe(
    input: Blob | File | ArrayBuffer | Uint8Array
  ): Promise<ProbedImageDimensions> {
    let headerBytes: Uint8Array;
    let chunkStart = 0;

    if (input instanceof Blob) {
      const initialSlice = await input.slice(0, 262144).arrayBuffer();
      headerBytes = new Uint8Array(initialSlice);
    } else if (input instanceof ArrayBuffer) {
      headerBytes = new Uint8Array(input);
    } else {
      headerBytes = input;
    }

    if (headerBytes.length < 10) {
      throw new Error('[ImageHeaderProbe] File is truncated or too small to contain a valid image header');
    }

    const view = new DataView(headerBytes.buffer, headerBytes.byteOffset, headerBytes.byteLength);

    if (headerBytes.length >= 20 && view.getUint32(0, false) === 0x52494646 && view.getUint32(8, false) === 0x57454250) {
      const chunk = view.getUint32(12, false);
      const uint24 = (at: number) => headerBytes[at] | (headerBytes[at + 1] << 8) | (headerBytes[at + 2] << 16);
      if (chunk === 0x56503858 && headerBytes.length >= 30) return this.validate(uint24(24) + 1, uint24(27) + 1, 'WebP');
      if (chunk === 0x5650384c && headerBytes.length >= 25 && headerBytes[20] === 0x2f) {
        const bits = view.getUint32(21, true);
        return this.validate((bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1, 'WebP');
      }
      if (chunk === 0x56503820 && headerBytes.length >= 30 && headerBytes[23] === 0x9d && headerBytes[24] === 0x01 && headerBytes[25] === 0x2a) {
        return this.validate(view.getUint16(26, true) & 0x3fff, view.getUint16(28, true) & 0x3fff, 'WebP');
      }
      throw new Error('[ImageHeaderProbe] Unsupported or malformed WebP header');
    }

    // 1. Check PNG (Magic: 0x89 50 4E 47 0D 0A 1A 0A)
    if (
      headerBytes[0] === 0x89 &&
      headerBytes[1] === 0x50 &&
      headerBytes[2] === 0x4e &&
      headerBytes[3] === 0x47 &&
      headerBytes[4] === 0x0d &&
      headerBytes[5] === 0x0a &&
      headerBytes[6] === 0x1a &&
      headerBytes[7] === 0x0a
    ) {
      if (headerBytes.length < 24) {
        throw new Error('[ImageHeaderProbe] Truncated PNG header: IHDR missing');
      }
      // IHDR chunk: 4 bytes length, 4 bytes type ('IHDR'), 4 bytes width, 4 bytes height
      const chunkType = String.fromCharCode(
        headerBytes[12],
        headerBytes[13],
        headerBytes[14],
        headerBytes[15]
      );
      if (chunkType !== 'IHDR') {
        throw new Error('[ImageHeaderProbe] Malformed PNG: First chunk is not IHDR');
      }
      const width = view.getUint32(16, false); // Big Endian
      const height = view.getUint32(20, false);
      return this.validate(width, height, 'PNG');
    }

    // 2. Check GIF (Magic: 'GIF87a' or 'GIF89a')
    if (
      headerBytes[0] === 0x47 &&
      headerBytes[1] === 0x49 &&
      headerBytes[2] === 0x46 &&
      headerBytes[3] === 0x38 &&
      (headerBytes[4] === 0x37 || headerBytes[4] === 0x39) &&
      headerBytes[5] === 0x61
    ) {
      if (headerBytes.length < 10) {
        throw new Error('[ImageHeaderProbe] Truncated GIF logical screen descriptor');
      }
      const width = view.getUint16(6, true); // Little Endian
      const height = view.getUint16(8, true);
      return this.validate(width, height, 'GIF');
    }

    // 3. Check BMP (Magic: 'BM')
    if (headerBytes[0] === 0x42 && headerBytes[1] === 0x4d) {
      if (headerBytes.length < 26) {
        throw new Error('[ImageHeaderProbe] Truncated BMP header');
      }
      // DIB header width and height at offset 18
      const width = Math.abs(view.getInt32(18, true)); // Little Endian
      const height = Math.abs(view.getInt32(22, true));
      return this.validate(width, height, 'BMP');
    }

    // 4. Check JPEG (Magic: 0xFF 0xD8)
    if (headerBytes[0] === 0xff && headerBytes[1] === 0xd8) {
      const ensureBytes = async (offset: number, length: number): Promise<boolean> => {
        if (offset + length <= chunkStart + headerBytes.length) {
          return true;
        }
        if (input instanceof Blob) {
          if (offset >= input.size) return false;
          const nextChunkSize = Math.max(262144, length);
          chunkStart = offset;
          const slice = await input.slice(chunkStart, chunkStart + nextChunkSize).arrayBuffer();
          headerBytes = new Uint8Array(slice);
          return headerBytes.length >= length;
        }
        return false;
      };

      let fileOffset = 2;
      while (fileOffset < ImageHeaderProbe.MAX_PROBE_SEARCH_WINDOW) {
        if (!(await ensureBytes(fileOffset, 2))) {
          throw new Error('[ImageHeaderProbe] SOF_BEYOND_PROBE_WINDOW: Start of frame not found within probe window');
        }

        const markerPrefix = headerBytes[fileOffset - chunkStart];
        fileOffset++;
        if (markerPrefix !== 0xff) continue;

        if (!(await ensureBytes(fileOffset, 1))) {
          throw new Error('[ImageHeaderProbe] SOF_BEYOND_PROBE_WINDOW: Start of frame not found within probe window');
        }

        let marker = headerBytes[fileOffset - chunkStart];
        fileOffset++;
        while (marker === 0xff) {
          if (!(await ensureBytes(fileOffset, 1))) {
            throw new Error('[ImageHeaderProbe] SOF_BEYOND_PROBE_WINDOW: Start of frame not found within probe window');
          }
          marker = headerBytes[fileOffset - chunkStart];
          fileOffset++;
        }

        // Variable-length markers: EOI (0xD9) or SOS (0xDA) reached without finding SOF
        if (marker === 0xd9 || marker === 0xda) {
          throw new Error('[ImageHeaderProbe] SOF_BEYOND_PROBE_WINDOW: Start of frame not found within probe window');
        }

        // Check for Start Of Frame markers:
        // SOF0 (0xC0 - Baseline), SOF1 (0xC1 - Extended), SOF2 (0xC2 - Progressive)
        if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
          if (!(await ensureBytes(fileOffset, 7))) {
            throw new Error('[ImageHeaderProbe] SOF_BEYOND_PROBE_WINDOW: Start of frame not found within probe window');
          }
          const sofView = new DataView(headerBytes.buffer, headerBytes.byteOffset + (fileOffset - chunkStart), 7);
          // Segment length (2 bytes) + Sample precision (1 byte)
          const height = sofView.getUint16(3, false); // Big Endian
          const width = sofView.getUint16(5, false);
          return this.validate(width, height, 'JPEG');
        }

        // Standalone markers without payload (RST0..RST7, TEM)
        if ((marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
          continue;
        }

        // Skip marker segment
        if (!(await ensureBytes(fileOffset, 2))) {
          throw new Error('[ImageHeaderProbe] SOF_BEYOND_PROBE_WINDOW: Start of frame not found within probe window');
        }
        const segView = new DataView(headerBytes.buffer, headerBytes.byteOffset + (fileOffset - chunkStart), 2);
        const segmentLength = segView.getUint16(0, false);
        if (segmentLength < 2) {
          throw new Error('[ImageHeaderProbe] SOF_BEYOND_PROBE_WINDOW: Start of frame not found within probe window');
        }
        fileOffset += segmentLength;
      }

      throw new Error('[ImageHeaderProbe] SOF_BEYOND_PROBE_WINDOW: Start of frame not found within probe window');
    }

    throw new Error('[ImageHeaderProbe] Unsupported or unrecognizable image signature');
  }

  private static validate(
    width: number,
    height: number,
    format: ProbedImageDimensions['format']
  ): ProbedImageDimensions {
    if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width <= 0 || height <= 0) {
      throw new RangeError(
        `[ImageHeaderProbe] Corrupted ${format} dimensions declared in header: ${width}x${height}`
      );
    }

    if (width > this.MAX_ALLOWED_DIMENSION || height > this.MAX_ALLOWED_DIMENSION) {
      throw new RangeError(
        `[ImageHeaderProbe] Image dimensions (${width}x${height}) exceed maximum allowed workstation limit (${this.MAX_ALLOWED_DIMENSION}px)`
      );
    }

    if (width * height > this.MAX_ALLOWED_PIXELS) {
      throw new RangeError(
        `[ImageHeaderProbe] Decompression bomb detected (CWE-409): total pixel area (${width * height}) exceeds safety limit`
      );
    }

    return { width, height, format };
  }
}
