/**
 * In-Browser Animated PNG (APNG) Encoding Engine for PixiBun Atelier.
 * Implements the Animated Portable Network Graphics (APNG) Specification:
 * - Originally authored by Stuart Parmenter & Vladimir Vukicevic (Mozilla Corporation, 2004)
 * - Standardized under W3C PNG Specification (Third Edition): https://www.w3.org/TR/png-3/#animation
 * - Reference: https://wiki.mozilla.org/APNG_Specification
 *
 * Compression Architecture:
 * - Uses native zlib-framed CompressionStream when available, with offline stored-block fallback.
 *
 * Features:
 * - True 24-bit / 32-bit RGBA color animation without GIF's 256-color palette limitation.
 * - Variable per-frame duration timing (supporting Richard Williams animation holds).
 * - Nearest-neighbor integer upscaling (1x, 2x, 4x, 8x, 16x).
 * - Standard chunk generation: IHDR, acTL, fcTL, IDAT, fdAT, IEND.
 * - IEEE 802.3 CRC-32 checksums and RFC 1950/1951 zlib DEFLATE framing.
 * - Zero external runtime dependencies; 100% offline and browser/Node test friendly.
 */

export interface ApngExportOptions {
  fps?: number; // Base frames per second (default: 12)
  scale?: number; // Integer scale factor (default: 1)
  durationsMs?: number[]; // Per-frame millisecond durations
  delays?: number[]; // Per-frame durations in hundredths of a second (10ms units)
  loopCount?: number; // Number of animation plays (0 = infinite loop, default: 0)
  onProgress?: (current: number, total: number) => void;
  signal?: AbortSignal;
}

export function yieldApngTask(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0));
}

export function apngFailureMessage(error: unknown): string {
  return error instanceof RangeError ? 'This animation exceeds the export size or memory limits. Reduce the frame count or scale.'
    : 'The animation could not be rendered or encoded. Retry the export or choose another format.';
}

async function compressApngScanlines(data: Uint8Array, signal?: AbortSignal): Promise<Uint8Array> {
  if (typeof CompressionStream === 'undefined') return encodeZlibDeflate(data);
  let compressor: CompressionStream;
  try { compressor = new CompressionStream('deflate'); }
  catch (error) { if (error instanceof TypeError) return encodeZlibDeflate(data); throw error; }
  const input = new ReadableStream({ start(controller) { controller.enqueue(data); controller.close(); } });
  const compressed = input.pipeThrough(compressor, { signal });
  return new Uint8Array(await new Response(compressed).arrayBuffer());
}

// Precomputed CRC-32 lookup table (IEEE 802.3 polynomial: 0xEDB88320)
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[n] = c >>> 0;
}

/**
 * Computes CRC-32 checksum over a slice of Uint8Array.
 */
export function computeCrc32(data: Uint8Array, offset: number, length: number): number {
  let c = 0xffffffff;
  const end = offset + length;
  for (let i = offset; i < end; i++) {
    c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

/**
 * Computes Adler-32 checksum for RFC 1950 zlib wrapper.
 */
export function computeAdler32(data: Uint8Array): number {
  let s1 = 1;
  let s2 = 0;
  const MOD = 65521;
  const len = data.length;
  for (let i = 0; i < len; i++) {
    s1 = (s1 + data[i]) % MOD;
    s2 = (s2 + s1) % MOD;
  }
  return ((s2 << 16) | s1) >>> 0;
}

/**
 * Writes a 32-bit unsigned integer in big-endian format.
 */
function writeUint32BE(buf: Uint8Array, offset: number, value: number): void {
  buf[offset] = (value >>> 24) & 0xff;
  buf[offset + 1] = (value >>> 16) & 0xff;
  buf[offset + 2] = (value >>> 8) & 0xff;
  buf[offset + 3] = value & 0xff;
}

/**
 * Writes a 16-bit unsigned integer in big-endian format.
 */
function writeUint16BE(buf: Uint8Array, offset: number, value: number): void {
  buf[offset] = (value >>> 8) & 0xff;
  buf[offset + 1] = value & 0xff;
}

/**
 * Encodes uncompressed DEFLATE zlib stream from raw filtered scanlines.
 */
export function encodeZlibDeflate(uncompressedData: Uint8Array): Uint8Array {
  const BLOCK_MAX = 65535;
  const numBlocks = Math.max(1, Math.ceil(uncompressedData.length / BLOCK_MAX));

  // Size: 2 (zlib header) + blocks * 5 + data.length + 4 (adler32)
  const totalSize = 2 + numBlocks * 5 + uncompressedData.length + 4;
  const out = new Uint8Array(totalSize);

  // Zlib header: CMINFO = 0x78 (Deflate, 32K window), FLG = 0x01 (check bits)
  out[0] = 0x78;
  out[1] = 0x01;

  let inOffset = 0;
  let outOffset = 2;

  for (let b = 0; b < numBlocks; b++) {
    const isLast = b === numBlocks - 1 ? 1 : 0;
    const chunkSize = Math.min(BLOCK_MAX, uncompressedData.length - inOffset);

    // BFINAL (1 bit) + BTYPE 00 (2 bits, uncompressed)
    out[outOffset++] = isLast ? 0x01 : 0x00;

    // LEN (16-bit LE)
    out[outOffset++] = chunkSize & 0xff;
    out[outOffset++] = (chunkSize >>> 8) & 0xff;

    // NLEN (16-bit LE, one's complement)
    const nlen = ~chunkSize & 0xffff;
    out[outOffset++] = nlen & 0xff;
    out[outOffset++] = (nlen >>> 8) & 0xff;

    // Block payload
    out.set(uncompressedData.subarray(inOffset, inOffset + chunkSize), outOffset);
    inOffset += chunkSize;
    outOffset += chunkSize;
  }

  // Adler-32 checksum (4 bytes big-endian)
  const adler = computeAdler32(uncompressedData);
  writeUint32BE(out, outOffset, adler);

  return out;
}

/**
 * Creates a raw filtered RGBA scanline buffer (filter type 0 = None).
 */
export function createFilteredRgbaScanlines(
  rgba: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number
): Uint8Array {
  const rowBytes = width * 4;
  const out = new Uint8Array(height * (rowBytes + 1));

  let inPtr = 0;
  let outPtr = 0;

  for (let y = 0; y < height; y++) {
    out[outPtr++] = 0; // Filter byte: 0 (None)
    out.set(rgba.subarray(inPtr, inPtr + rowBytes), outPtr);
    inPtr += rowBytes;
    outPtr += rowBytes;
  }

  return out;
}

/**
 * Creates a standard PNG binary chunk:
 * [Length (4 BE)][Type (4 ASCII)][Data (N)][CRC-32 (4 BE)]
 */
export function createPngChunk(typeStr: string, data: Uint8Array): Uint8Array {
  const chunk = new Uint8Array(4 + 4 + data.length + 4);
  writeUint32BE(chunk, 0, data.length);

  for (let i = 0; i < 4; i++) {
    chunk[4 + i] = typeStr.charCodeAt(i);
  }

  chunk.set(data, 8);

  const crc = computeCrc32(chunk, 4, 4 + data.length);
  writeUint32BE(chunk, 8 + data.length, crc);

  return chunk;
}

import { extractScaledCanvasRgba, ScaledRgbaFrame } from '@/lib/canvas/scaleCanvas';
import { validateExportGeometry } from './exportGeometryValidation';
import { MAX_EXPORT_AGGREGATE_PIXELS } from '@/config/canvasLimits';
import { withExportMemory } from './exportMemory';

export { extractScaledCanvasRgba };
export type { ScaledRgbaFrame };

/**
 * Encodes an array of frame canvases into an Animated PNG (APNG) Blob.
 *
 * @param frameCanvases Sequence of HTMLCanvasElements representing animation frames
 * @param options Configuration options (fps, scale, durationsMs, loopCount, onProgress, signal)
 * @returns Promise resolving to an APNG image Blob (MIME type: 'image/apng')
 */
export async function exportAnimationToApngAsync(...args: Parameters<typeof encodeApng>): Promise<Blob> {
  return withExportMemory(args[0], Math.max(1, Math.min(16, args[1]?.scale ?? 1)), () => encodeApng(...args), MAX_EXPORT_AGGREGATE_PIXELS, 'APNG');
}

async function encodeApng(
  frameCanvases: HTMLCanvasElement[],
  options: ApngExportOptions = {}
): Promise<Blob> {
  if (!frameCanvases || frameCanvases.length === 0) {
    throw new Error('Cannot export APNG: no frames provided.');
  }

  if (options.signal?.aborted) {
    throw new DOMException('APNG export aborted', 'AbortError');
  }

  const fps = Math.max(1, Math.min(60, options.fps ?? 12));
  const scale = Math.max(1, Math.min(16, options.scale ?? 1));
  const loopCount = Math.max(0, options.loopCount ?? 0); // 0 = infinite loop

  const outW = frameCanvases[0].width * scale;
  const outH = frameCanvases[0].height * scale;
  const validation = validateExportGeometry(outW, outH, {
    frameCount: frameCanvases.length,
    maxAggregatePixels: MAX_EXPORT_AGGREGATE_PIXELS,
  });
  if (!validation.valid) {
    throw new RangeError(`APNG export aborted: ${validation.error}`);
  }

  // Standard 8-byte PNG signature
  const PNG_SIGNATURE = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // Extract first frame to establish target dimensions
  const firstFrame = extractScaledCanvasRgba(frameCanvases[0], scale);
  const width = firstFrame.width;
  const height = firstFrame.height;
  const totalFrames = frameCanvases.length;

  const chunks: Uint8Array[] = [PNG_SIGNATURE];

  // 1. IHDR Chunk (13 bytes)
  // Width(4), Height(4), BitDepth(1=8), ColorType(1=6 RGBA), Compression(1=0), Filter(1=0), Interlace(1=0)
  const ihdrData = new Uint8Array(13);
  writeUint32BE(ihdrData, 0, width);
  writeUint32BE(ihdrData, 4, height);
  ihdrData[8] = 8; // 8 bits per channel
  ihdrData[9] = 6; // Color type 6 = RGBA
  ihdrData[10] = 0; // Deflate
  ihdrData[11] = 0; // Adaptive filtering
  ihdrData[12] = 0; // Non-interlaced
  chunks.push(createPngChunk('IHDR', ihdrData));

  // 2. acTL Chunk (Animation Control - 8 bytes)
  // num_frames (4 BE), num_plays (4 BE)
  const actlData = new Uint8Array(8);
  writeUint32BE(actlData, 0, totalFrames);
  writeUint32BE(actlData, 4, loopCount);
  chunks.push(createPngChunk('acTL', actlData));

  let sequenceNumber = 0;

  // Process frames
  for (let i = 0; i < totalFrames; i++) {
    if (options.signal?.aborted) {
      throw new DOMException('APNG export aborted', 'AbortError');
    }

    const frame = i === 0 ? firstFrame : extractScaledCanvasRgba(frameCanvases[i], scale);

    // Determine frame delay
    // APNG stores a rational delay, so integer FPS needs no millisecond rounding.
    let delayNum = Number.isInteger(fps) ? 1 : Math.round(1000 / fps);
    let delayDen = Number.isInteger(fps) ? fps : 1000;
    if (options.durationsMs && options.durationsMs[i] !== undefined) {
      delayNum = Math.max(10, options.durationsMs[i]);
      delayDen = 1000;
    } else if (options.delays && options.delays[i] !== undefined) {
      delayNum = Math.max(10, options.delays[i] * 10);
      delayDen = 1000;
    }

    // 3. fcTL Chunk (Frame Control - 26 bytes)
    // sequence_number(4), width(4), height(4), x_offset(4), y_offset(4),
    // delay_num(2), delay_den(2), dispose_op(1), blend_op(1)
    const fctlData = new Uint8Array(26);
    writeUint32BE(fctlData, 0, sequenceNumber++);
    writeUint32BE(fctlData, 4, width);
    writeUint32BE(fctlData, 8, height);
    writeUint32BE(fctlData, 12, 0); // x_offset
    writeUint32BE(fctlData, 16, 0); // y_offset
    writeUint16BE(fctlData, 20, delayNum);
    writeUint16BE(fctlData, 22, delayDen);
    fctlData[24] = 0; // APNG_DISPOSE_OP_NONE
    fctlData[25] = 0; // APNG_BLEND_OP_SOURCE
    chunks.push(createPngChunk('fcTL', fctlData));

    // Compress scanlines with Deflate
    const scanlines = createFilteredRgbaScanlines(frame.data, width, height);
    const compressed = await compressApngScanlines(scanlines, options.signal);
    if (options.signal?.aborted) throw new DOMException('APNG export aborted', 'AbortError');

    if (i === 0) {
      // Frame 0 uses standard IDAT chunk
      chunks.push(createPngChunk('IDAT', compressed));
    } else {
      // Subsequent frames use fdAT chunk prefixed with sequence_number
      const fdatData = new Uint8Array(4 + compressed.length);
      writeUint32BE(fdatData, 0, sequenceNumber++);
      fdatData.set(compressed, 4);
      chunks.push(createPngChunk('fdAT', fdatData));
    }

    options.onProgress?.(i + 1, totalFrames);
    await yieldApngTask();
  }
  if (options.signal?.aborted) throw new DOMException('APNG export aborted', 'AbortError');

  // 4. IEND Chunk (0 bytes data)
  chunks.push(createPngChunk('IEND', new Uint8Array(0)));

  // Concatenate all chunks into a single binary Blob
  return new Blob(chunks as BlobPart[], { type: 'image/apng' });
}
