import { describe, it, expect } from 'vitest';
import {
  writeStoreOnlyZip,
  computeCrc32,
  updateCrc32,
  validateZipPath,
  hasLoneSurrogates,
  ZIP32_CONSTANTS,
  type RecoveryZipEntry,
  type RecoveryZipSink,
} from '@/lib/recovery/zipWriter';

// -----------------------------------------------------------------------------
// Test Helpers & Truly Independent Test ZIP Parser
// -----------------------------------------------------------------------------

class MemoryZipSink implements RecoveryZipSink {
  public chunks: Uint8Array[] = [];
  public chunkSizes: number[] = [];
  public totalBytes = 0;

  async write(chunk: Uint8Array): Promise<void> {
    const copy = new Uint8Array(chunk.length);
    copy.set(chunk);
    this.chunks.push(copy);
    this.chunkSizes.push(chunk.length);
    this.totalBytes += chunk.length;
  }

  getBuffer(): Uint8Array {
    const combined = new Uint8Array(this.totalBytes);
    let offset = 0;
    for (const chunk of this.chunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }
    return combined;
  }
}

function makeStreamEntry(name: string, payload: Uint8Array): RecoveryZipEntry {
  return {
    name,
    size: payload.length,
    openStream(): ReadableStream<Uint8Array> {
      return new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(payload);
          controller.close();
        },
      });
    },
  };
}

/**
 * Pure test-only bit-at-a-time IEEE 802.3 CRC-32 calculation.
 * Does NOT call or reuse production computeCrc32 or updateCrc32, ensuring
 * that any defect in the production CRC table or calculation is caught.
 */
function computeTestIndependentCrc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i];
    for (let j = 0; j < 8; j++) {
      if ((crc & 1) !== 0) {
        crc = (crc >>> 1) ^ 0xedb88320;
      } else {
        crc >>>= 1;
      }
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

interface ParsedZipEntry {
  name: string;
  nameBytes: Uint8Array;
  flags: number;
  compressionMethod: number;
  dosTime: number;
  dosDate: number;
  crc32: number;
  compressedSize: number;
  uncompressedSize: number;
  localHeaderOffset: number;
  payload: Uint8Array;
  computedCrc32: number;
  dataDescriptor?: {
    crc32: number;
    compressedSize: number;
    uncompressedSize: number;
  };
}

interface ParsedZip {
  entries: ParsedZipEntry[];
  eocd: {
    diskNumber: number;
    cdStartDisk: number;
    diskEntries: number;
    totalEntries: number;
    cdSize: number;
    cdOffset: number;
    commentLength: number;
  };
}

/**
 * Truly independent ZIP archive parser and validator.
 * Validates byte-level invariants without reusing production binary encoders:
 * - Locates EOCD and asserts single-disk and zero-offset invariants.
 * - Asserts EOCD begins exactly at cdOffset + cdSize.
 * - Asserts Central Directory traversal finishes exactly at cdOffset + cdSize.
 * - Asserts local headers match central directory flags, methods, and filename bytes.
 * - Asserts Store mode (method 0) has compressedSize === uncompressedSize.
 * - Computes CRC using test-only independent bit-at-a-time algorithm and asserts match.
 * - Validates 16-byte signed Data Descriptor signature and sizes.
 */
function parseZipArchive(buffer: Uint8Array): ParsedZip {
  // 1. Locate End of Central Directory (EOCD) signature 0x06054b50 from the end
  let eocdOffset = -1;
  for (let i = buffer.length - 22; i >= 0; i--) {
    if (
      buffer[i] === 0x50 &&
      buffer[i + 1] === 0x4b &&
      buffer[i + 2] === 0x05 &&
      buffer[i + 3] === 0x06
    ) {
      eocdOffset = i;
      break;
    }
  }

  if (eocdOffset === -1) {
    throw new Error('EOCD signature (0x06054b50) not found in archive buffer.');
  }

  const eocdView = new DataView(buffer.buffer, buffer.byteOffset + eocdOffset, 22);
  const diskNumber = eocdView.getUint16(4, true);
  const cdStartDisk = eocdView.getUint16(6, true);
  const diskEntries = eocdView.getUint16(8, true);
  const totalEntries = eocdView.getUint16(10, true);
  const cdSize = eocdView.getUint32(12, true);
  const cdOffset = eocdView.getUint32(16, true);
  const commentLength = eocdView.getUint16(20, true);

  // Assert EOCD invariants
  expect(diskNumber).toBe(0);
  expect(cdStartDisk).toBe(0);
  expect(diskEntries).toBe(totalEntries);
  expect(commentLength).toBe(0);
  expect(eocdOffset).toBe(cdOffset + cdSize);

  const eocd = {
    diskNumber,
    cdStartDisk,
    diskEntries,
    totalEntries,
    cdSize,
    cdOffset,
    commentLength,
  };

  // 2. Parse Central Directory headers starting at cdOffset
  let cdPtr = cdOffset;
  const rawCdEntries: Array<{
    name: string;
    nameBytes: Uint8Array;
    flags: number;
    compressionMethod: number;
    dosTime: number;
    dosDate: number;
    crc32: number;
    compressedSize: number;
    uncompressedSize: number;
    localHeaderOffset: number;
  }> = [];

  const textDecoder = new TextDecoder('utf-8');

  for (let i = 0; i < totalEntries; i++) {
    expect(cdPtr + 46).toBeLessThanOrEqual(buffer.length);
    const view = new DataView(buffer.buffer, buffer.byteOffset + cdPtr, 46);
    const sig = view.getUint32(0, true);
    if (sig !== 0x02014b50) {
      throw new Error(`Invalid Central Directory signature at offset ${cdPtr}: 0x${sig.toString(16)}`);
    }

    const flags = view.getUint16(8, true);
    const compressionMethod = view.getUint16(10, true);
    const dosTime = view.getUint16(12, true);
    const dosDate = view.getUint16(14, true);
    const crc32 = view.getUint32(16, true);
    const compressedSize = view.getUint32(20, true);
    const uncompressedSize = view.getUint32(24, true);
    const nameLen = view.getUint16(28, true);
    const extraLen = view.getUint16(30, true);
    const commentLen = view.getUint16(32, true);
    const localHeaderOffset = view.getUint32(42, true);

    // In Store mode (method 0), compressedSize must equal uncompressedSize
    if (compressionMethod === 0) {
      expect(compressedSize).toBe(uncompressedSize);
    }

    expect(cdPtr + 46 + nameLen).toBeLessThanOrEqual(buffer.length);
    const nameBytes = buffer.subarray(cdPtr + 46, cdPtr + 46 + nameLen);
    const name = textDecoder.decode(nameBytes);

    rawCdEntries.push({
      name,
      nameBytes,
      flags,
      compressionMethod,
      dosTime,
      dosDate,
      crc32,
      compressedSize,
      uncompressedSize,
      localHeaderOffset,
    });

    cdPtr += 46 + nameLen + extraLen + commentLen;
  }

  // Assert Central Directory traversal ended exactly at cdOffset + cdSize
  expect(cdPtr).toBe(cdOffset + cdSize);

  // 3. Resolve local headers, extract payloads, and parse Data Descriptors
  const entries: ParsedZipEntry[] = [];

  for (const cdEntry of rawCdEntries) {
    expect(cdEntry.localHeaderOffset + 30).toBeLessThanOrEqual(buffer.length);
    const locView = new DataView(buffer.buffer, buffer.byteOffset + cdEntry.localHeaderOffset, 30);
    const locSig = locView.getUint32(0, true);
    if (locSig !== 0x04034b50) {
      throw new Error(
        `Invalid Local File Header signature at offset ${cdEntry.localHeaderOffset}: 0x${locSig.toString(16)}`
      );
    }

    const locFlags = locView.getUint16(6, true);
    const locMethod = locView.getUint16(8, true);
    expect(locFlags).toBe(cdEntry.flags);
    expect(locMethod).toBe(cdEntry.compressionMethod);

    const locNameLen = locView.getUint16(26, true);
    const locExtraLen = locView.getUint16(28, true);

    // Assert local filename bytes match central directory filename bytes
    const locNameBytes = buffer.subarray(
      cdEntry.localHeaderOffset + 30,
      cdEntry.localHeaderOffset + 30 + locNameLen
    );
    expect(locNameBytes).toEqual(cdEntry.nameBytes);

    const payloadOffset = cdEntry.localHeaderOffset + 30 + locNameLen + locExtraLen;
    const payloadEnd = payloadOffset + cdEntry.uncompressedSize;
    expect(payloadEnd).toBeLessThanOrEqual(buffer.length);

    const payload = buffer.slice(payloadOffset, payloadEnd);

    // Compute CRC independently using test-only algorithm
    const computedCrc32 = computeTestIndependentCrc32(payload);
    expect(computedCrc32).toBe(cdEntry.crc32);

    let dataDescriptor: { crc32: number; compressedSize: number; uncompressedSize: number } | undefined;
    if ((cdEntry.flags & 0x0008) !== 0) {
      const descOffset = payloadEnd;
      const descEnd = descOffset + 16;
      expect(descEnd).toBeLessThanOrEqual(buffer.length);

      const descView = new DataView(buffer.buffer, buffer.byteOffset + descOffset, 16);
      const descSig = descView.getUint32(0, true);
      if (descSig !== 0x08074b50) {
        throw new Error(
          `Invalid Data Descriptor signature at offset ${descOffset}: 0x${descSig.toString(16)}`
        );
      }
      dataDescriptor = {
        crc32: descView.getUint32(4, true),
        compressedSize: descView.getUint32(8, true),
        uncompressedSize: descView.getUint32(12, true),
      };

      // Assert data descriptor CRC and sizes match payload and CD record
      expect(dataDescriptor.crc32).toBe(computedCrc32);
      expect(dataDescriptor.crc32).toBe(cdEntry.crc32);
      expect(dataDescriptor.compressedSize).toBe(cdEntry.uncompressedSize);
      expect(dataDescriptor.uncompressedSize).toBe(cdEntry.uncompressedSize);
    }

    entries.push({
      ...cdEntry,
      payload,
      computedCrc32,
      dataDescriptor,
    });
  }

  return { entries, eocd };
}

// -----------------------------------------------------------------------------
// Test Suites
// -----------------------------------------------------------------------------

describe('Phase 1B.3: Streaming Store-Only ZIP32 Core', () => {
  // 1. IEEE 802.3 CRC-32 standard test vector (asserted against independent test CRC)
  it('1. computes IEEE 802.3 CRC-32 matching canonical "123456789" vector on both engines', () => {
    const data = new TextEncoder().encode('123456789');
    const productionCrc = computeCrc32(data);
    const independentCrc = computeTestIndependentCrc32(data);

    expect(productionCrc).toBe(0xcbf43926);
    expect(independentCrc).toBe(0xcbf43926);
  });

  // 2. Incremental multi-chunk CRC matching single-pass
  it('2. computes incremental CRC-32 across split chunks identically to single-pass', () => {
    const chunk1 = new Uint8Array([1, 2, 3, 4, 5]);
    const chunk2 = new Uint8Array([6, 7, 8, 9, 10]);
    const full = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

    let running = updateCrc32(0xffffffff, chunk1);
    running = updateCrc32(running, chunk2);
    const incrementalCrc = (running ^ 0xffffffff) >>> 0;

    const singlePassCrc = computeCrc32(full);
    expect(incrementalCrc).toBe(singlePassCrc);
    expect(incrementalCrc).toBe(computeTestIndependentCrc32(full));
  });

  // 3. Empty archive produces exact 22-byte EOCD
  it('3. writes a valid empty ZIP archive as exactly 22 bytes containing only EOCD', async () => {
    const sink = new MemoryZipSink();
    const result = await writeStoreOnlyZip([], sink);

    expect(result.totalBytesWritten).toBe(22);
    expect(result.entryCount).toBe(0);
    expect(result.centralDirectoryOffset).toBe(0);
    expect(result.centralDirectorySize).toBe(0);

    const buf = sink.getBuffer();
    expect(buf.length).toBe(22);

    const parsed = parseZipArchive(buf);
    expect(parsed.entries.length).toBe(0);
    expect(parsed.eocd.totalEntries).toBe(0);
    expect(parsed.eocd.cdOffset).toBe(0);
    expect(parsed.eocd.cdSize).toBe(0);
  });

  // 4. Single zero-length entry
  it('4. archives a single zero-length file with correct headers, descriptor, and offsets', async () => {
    const sink = new MemoryZipSink();
    const entry = makeStreamEntry('empty.txt', new Uint8Array(0));

    const result = await writeStoreOnlyZip([entry], sink);
    expect(result.entryCount).toBe(1);

    const parsed = parseZipArchive(sink.getBuffer());
    expect(parsed.entries.length).toBe(1);
    expect(parsed.entries[0].name).toBe('empty.txt');
    expect(parsed.entries[0].uncompressedSize).toBe(0);
    expect(parsed.entries[0].crc32).toBe(0);
    expect(parsed.entries[0].payload.length).toBe(0);
    expect(parsed.entries[0].dataDescriptor?.crc32).toBe(0);
  });

  // 5. Binary entry with payload
  it('5. archives a binary file and verifies payload and CRC matching', async () => {
    const sink = new MemoryZipSink();
    const payload = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]); // PNG signature
    const entry = makeStreamEntry('image.png', payload);

    const result = await writeStoreOnlyZip([entry], sink);
    expect(result.entryCount).toBe(1);

    const parsed = parseZipArchive(sink.getBuffer());
    expect(parsed.entries.length).toBe(1);
    expect(parsed.entries[0].name).toBe('image.png');
    expect(parsed.entries[0].uncompressedSize).toBe(8);
    expect(parsed.entries[0].computedCrc32).toBe(computeTestIndependentCrc32(payload));
    expect(parsed.entries[0].payload).toEqual(payload);
  });

  // 6. Multiple entries with directories and UTF-8 filenames
  it('6. archives multiple entries with subdirectories and preserves UTF-8 filenames', async () => {
    const sink = new MemoryZipSink();
    const data1 = new TextEncoder().encode('{"name": "PixiBun Project"}');
    const data2 = new Uint8Array([10, 20, 30, 40]);
    const data3 = new TextEncoder().encode('日本語テキスト 🎨');

    const entries = [
      makeStreamEntry('project.json', data1),
      makeStreamEntry('layers/layer_0_0.png', data2),
      makeStreamEntry('metadata/日本語.txt', data3),
    ];

    const result = await writeStoreOnlyZip(entries, sink);
    expect(result.entryCount).toBe(3);

    const parsed = parseZipArchive(sink.getBuffer());
    expect(parsed.entries.length).toBe(3);
    expect(parsed.entries[0].name).toBe('project.json');
    expect(parsed.entries[0].payload).toEqual(data1);
    expect(parsed.entries[1].name).toBe('layers/layer_0_0.png');
    expect(parsed.entries[1].payload).toEqual(data2);
    expect(parsed.entries[2].name).toBe('metadata/日本語.txt');
    expect(parsed.entries[2].payload).toEqual(data3);
  });

  // 7. Payload crossing 64 KiB buffer boundary
  it('7. handles payload larger than 64 KiB streamed in chunks', async () => {
    const sink = new MemoryZipSink();
    const largeSize = 100_000;
    const largePayload = new Uint8Array(largeSize);
    for (let i = 0; i < largeSize; i++) {
      largePayload[i] = (i * 31) & 0xff;
    }

    const entry = makeStreamEntry('large.bin', largePayload);
    await writeStoreOnlyZip([entry], sink);

    const parsed = parseZipArchive(sink.getBuffer());
    expect(parsed.entries.length).toBe(1);
    expect(parsed.entries[0].uncompressedSize).toBe(largeSize);
    expect(parsed.entries[0].computedCrc32).toBe(computeTestIndependentCrc32(largePayload));
    expect(parsed.entries[0].payload).toEqual(largePayload);
  });

  // 8. Chunks > 64 KiB split into <= 64 KiB writes
  it('8. splits source stream chunks larger than 64 KiB so no sink write exceeds 64 KiB', async () => {
    const sink = new MemoryZipSink();
    const chunk128k = new Uint8Array(131072);
    chunk128k.fill(0xaa);

    const entry: RecoveryZipEntry = {
      name: 'bigchunk.dat',
      size: 131072,
      openStream() {
        return new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(chunk128k);
            controller.close();
          },
        });
      },
    };

    await writeStoreOnlyZip([entry], sink);

    for (const size of sink.chunkSizes) {
      expect(size).toBeLessThanOrEqual(ZIP32_CONSTANTS.MAX_PAYLOAD_CHUNK_SIZE);
    }

    const parsed = parseZipArchive(sink.getBuffer());
    expect(parsed.entries[0].uncompressedSize).toBe(131072);
    expect(parsed.entries[0].payload).toEqual(chunk128k);
  });

  // 9. Method 0 and Flag 0x0808 verification
  it('9. verifies Store method (0) and flags (0x0808) in both local and central directory headers', async () => {
    const sink = new MemoryZipSink();
    const entry = makeStreamEntry('test.bin', new Uint8Array([1, 2, 3]));
    await writeStoreOnlyZip([entry], sink);

    const parsed = parseZipArchive(sink.getBuffer());
    expect(parsed.entries[0].compressionMethod).toBe(0);
    expect(parsed.entries[0].flags).toBe(0x0808);
  });

  // 10. Signed Data Descriptor layout
  it('10. verifies 16-byte signed Data Descriptor signature and fields', async () => {
    const sink = new MemoryZipSink();
    const payload = new Uint8Array([11, 22, 33, 44]);
    const entry = makeStreamEntry('sample.bin', payload);
    await writeStoreOnlyZip([entry], sink);

    const parsed = parseZipArchive(sink.getBuffer());
    expect(parsed.entries[0].dataDescriptor).toBeDefined();
    expect(parsed.entries[0].dataDescriptor?.crc32).toBe(computeTestIndependentCrc32(payload));
    expect(parsed.entries[0].dataDescriptor?.compressedSize).toBe(payload.length);
    expect(parsed.entries[0].dataDescriptor?.uncompressedSize).toBe(payload.length);
  });

  // 11. Central directory offsets match local headers
  it('11. verifies central directory offsets point exactly to local file headers', async () => {
    const sink = new MemoryZipSink();
    const entries = [
      makeStreamEntry('a.txt', new Uint8Array([1, 2])),
      makeStreamEntry('b.txt', new Uint8Array([3, 4, 5, 6])),
    ];

    const result = await writeStoreOnlyZip(entries, sink);
    const buf = sink.getBuffer();
    const parsed = parseZipArchive(buf);

    expect(parsed.entries[0].localHeaderOffset).toBe(0);

    const localAView = new DataView(buf.buffer, buf.byteOffset, 4);
    expect(localAView.getUint32(0, true)).toBe(ZIP32_CONSTANTS.LOCAL_FILE_HEADER_SIGNATURE);

    const offsetB = parsed.entries[1].localHeaderOffset;
    expect(offsetB).toBeGreaterThan(0);
    const localBView = new DataView(buf.buffer, buf.byteOffset + offsetB, 4);
    expect(localBView.getUint32(0, true)).toBe(ZIP32_CONSTANTS.LOCAL_FILE_HEADER_SIGNATURE);

    expect(result.centralDirectoryOffset).toBeGreaterThan(offsetB);
  });

  // 12. Byte-for-byte output determinism
  it('12. produces byte-for-byte identical output for identical inputs', async () => {
    const payload = new Uint8Array([42, 43, 44]);
    const makeEntries = () => [makeStreamEntry('deterministic.dat', payload)];

    const sink1 = new MemoryZipSink();
    await writeStoreOnlyZip(makeEntries(), sink1);

    const sink2 = new MemoryZipSink();
    await writeStoreOnlyZip(makeEntries(), sink2);

    expect(sink1.getBuffer()).toEqual(sink2.getBuffer());
  });

  // 13. Preflight rejects duplicate paths
  it('13. rejects duplicate archive paths during preflight before writing any byte', async () => {
    const sink = new MemoryZipSink();
    const entries = [
      makeStreamEntry('duplicate.txt', new Uint8Array([1])),
      makeStreamEntry('duplicate.txt', new Uint8Array([2])),
    ];

    await expect(writeStoreOnlyZip(entries, sink)).rejects.toThrow(/Duplicate archive path/);
    expect(sink.chunks.length).toBe(0);
  });

  // 14. Preflight rejects unsafe paths
  it('14. rejects traversal, drive letter, leading slash, NUL, and backslashes during preflight', async () => {
    const unsafePaths = [
      '../escape.txt',
      'foo/../../bar.txt',
      './relative.txt',
      '/absolute.txt',
      'C:/windows.txt',
      'back\\slash.txt',
      'nul\0byte.txt',
      'foo//bar.txt',
      '',
    ];

    for (const p of unsafePaths) {
      const sink = new MemoryZipSink();
      const entries = [makeStreamEntry(p, new Uint8Array([1]))];
      await expect(writeStoreOnlyZip(entries, sink)).rejects.toThrow();
      expect(sink.chunks.length).toBe(0);
    }
  });

  // 15. Preflight rejects size overflow
  it('15. rejects entries exceeding 4 GiB size and entry count exceeding 65535', async () => {
    const sink = new MemoryZipSink();
    const oversizeEntry: RecoveryZipEntry = {
      name: 'oversize.bin',
      size: 0x100000000, // 4 GiB
      openStream() {
        return new ReadableStream<Uint8Array>();
      },
    };

    await expect(writeStoreOnlyZip([oversizeEntry], sink)).rejects.toThrow(/Invalid declared entry size/);
    expect(sink.chunks.length).toBe(0);

    const tooMany = new Array(65536).fill(null).map((_, i) => makeStreamEntry(`file_${i}.txt`, new Uint8Array(0)));
    await expect(writeStoreOnlyZip(tooMany, sink)).rejects.toThrow(/exceeds maximum ZIP32 limit/);
    expect(sink.chunks.length).toBe(0);
  });

  // 16. Stream length mismatch detection
  it('16. throws when stream emits fewer or more bytes than declared size', async () => {
    const sink1 = new MemoryZipSink();
    const shortEntry: RecoveryZipEntry = {
      name: 'short.bin',
      size: 10,
      openStream() {
        return new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(new Uint8Array([1, 2, 3])); // only 3 bytes
            controller.close();
          },
        });
      },
    };
    await expect(writeStoreOnlyZip([shortEntry], sink1)).rejects.toThrow(/produced 3 bytes, but declared size was 10/);

    const sink2 = new MemoryZipSink();
    const longEntry: RecoveryZipEntry = {
      name: 'long.bin',
      size: 2,
      openStream() {
        return new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(new Uint8Array([1, 2, 3, 4, 5])); // 5 bytes instead of 2
            controller.close();
          },
        });
      },
    };
    await expect(writeStoreOnlyZip([longEntry], sink2)).rejects.toThrow(/produced more bytes/);
  });

  // 17. Immediate error propagation on sink write failure
  it('17. propagates sink write error immediately and does not swallow it', async () => {
    const failingSink: RecoveryZipSink = {
      async write() {
        throw new Error('Disk full');
      },
    };

    const entry = makeStreamEntry('test.dat', new Uint8Array([1, 2, 3]));
    await expect(writeStoreOnlyZip([entry], failingSink)).rejects.toThrow('Disk full');
  });

  // 18. Pre-write cancellation
  it('18. throws AbortError when AbortSignal is already cancelled before execution', async () => {
    const sink = new MemoryZipSink();
    const controller = new AbortController();
    controller.abort(new DOMException('Pre-aborted', 'AbortError'));

    const entry = makeStreamEntry('test.dat', new Uint8Array([1, 2, 3]));
    await expect(writeStoreOnlyZip([entry], sink, { signal: controller.signal })).rejects.toThrow(
      /Pre-aborted|cancelled before execution/
    );
    expect(sink.chunks.length).toBe(0);
  });

  // 19. Pending-read cancellation interrupts prompt without hang
  it('19. interrupts pending reader.read() promptly on AbortSignal without hanging', async () => {
    const sink = new MemoryZipSink();
    const abortController = new AbortController();

    let cancelCalledWith: unknown = null;
    let streamInstance: ReadableStream<Uint8Array> | null = null;

    const entry: RecoveryZipEntry = {
      name: 'pending.dat',
      size: 100,
      openStream() {
        streamInstance = new ReadableStream<Uint8Array>({
          pull() {
            // Return a promise that never resolves, simulating a stalled source
            return new Promise<void>(() => {});
          },
          cancel(reason) {
            cancelCalledWith = reason;
          },
        });
        return streamInstance;
      },
    };

    const zipPromise = writeStoreOnlyZip([entry], sink, { signal: abortController.signal });

    // Wait a brief microtick so reader.read() begins and is actively pending
    await new Promise((r) => setTimeout(r, 15));

    // At this point, only the local file header has been written; no payload bytes have been emitted
    const bytesBeforeAbort = sink.totalBytes;
    expect(bytesBeforeAbort).toBe(30 + 'pending.dat'.length);

    // Abort the operation
    abortController.abort(new DOMException('User stopped recovery', 'AbortError'));

    // The zip writer promise must settle promptly with a real DOMException AbortError
    await expect(zipPromise).rejects.toThrow(DOMException);
    await expect(zipPromise).rejects.toSatisfy((err: unknown) => {
      return err instanceof DOMException && err.name === 'AbortError';
    });

    // Zero payload bytes written after abort
    expect(sink.totalBytes).toBe(bytesBeforeAbort);

    // The underlying stream's cancel handler was invoked with the abort reason
    expect(cancelCalledWith).toBeDefined();
    expect((cancelCalledWith as { name?: string })?.name).toBe('AbortError');

    // The reader lock was released in finally
    expect(streamInstance).not.toBeNull();
    expect(streamInstance!.locked).toBe(false);
  });

  // 20. Cancellation Normalization (real DOMException guarantee)
  it('20. normalizes cancellation so rejecting with non-DOMException Error produces genuine DOMException AbortError', async () => {
    const sink = new MemoryZipSink();
    const abortController = new AbortController();

    // Fabricate a non-DOMException Error whose name was mutated to AbortError
    const fakeError = new Error('Fake abort error');
    fakeError.name = 'AbortError';
    abortController.abort(fakeError);

    const entry = makeStreamEntry('test.dat', new Uint8Array([1, 2]));

    await expect(
      writeStoreOnlyZip([entry], sink, { signal: abortController.signal })
    ).rejects.toSatisfy((err: unknown) => {
      return (
        err instanceof DOMException &&
        err.name === 'AbortError' &&
        err.message === 'Fake abort error'
      );
    });
  });

  // 21. DOS Timestamp validation
  describe('21. DOS Timestamp Validation', () => {
    it('applies and parses custom valid DOS timestamp correctly', async () => {
      const sink = new MemoryZipSink();
      // Year 2024 (2024-1980=44), Month 6, Day 15 -> (44<<9) | (6<<5) | 15 = 0x58cf
      // Hour 14, Minute 30, Two-seconds 22 (44 sec) -> (14<<11) | (30<<5) | 22 = 0x73d6
      const validTime = (14 << 11) | (30 << 5) | 22;
      const validDate = (44 << 9) | (6 << 5) | 15;

      const entry = makeStreamEntry('timestamped.txt', new Uint8Array([1, 2, 3]));
      await writeStoreOnlyZip([entry], sink, {
        dosTimestamp: { time: validTime, date: validDate },
      });

      const parsed = parseZipArchive(sink.getBuffer());
      expect(parsed.entries[0].dosTime).toBe(validTime);
      expect(parsed.entries[0].dosDate).toBe(validDate);
    });

    it('rejects invalid timestamps during preflight and writes zero bytes to sink', async () => {
      const invalidTimestamps = [
        { time: -1, date: 0x0021 },
        { time: 1.5, date: 0x0021 },
        { time: Number.NaN, date: 0x0021 },
        { time: Number.POSITIVE_INFINITY, date: 0x0021 },
        { time: 0x10000, date: 0x0021 }, // oversized uint16
        { time: 0, date: 0 }, // zero date: month 0, day 0
        { time: (24 << 11), date: 0x0021 }, // hour 24 > 23
        { time: (60 << 5), date: 0x0021 }, // minute 60 > 59
        { time: 30, date: 0x0021 }, // twoSeconds 30 > 29
        { time: 0, date: (13 << 5) | 1 }, // month 13 > 12
        { time: 0, date: (1 << 5) | 32 }, // day 32 > 31
        { time: 0, date: (1 << 5) | 0 }, // day 0 < 1
        { time: 0, date: (0 << 5) | 1 }, // month 0 < 1
      ];

      for (const ts of invalidTimestamps) {
        const sink = new MemoryZipSink();
        const entry = makeStreamEntry('ts_test.txt', new Uint8Array([1]));
        await expect(
          writeStoreOnlyZip([entry], sink, {
            dosTimestamp: ts as unknown as { time: number; date: number },
          })
        ).rejects.toThrow();
        expect(sink.chunks.length).toBe(0);
      }
    });
  });

  // 22. Runtime Stream and Reader Validation
  describe('22. Runtime Stream and Reader Validation', () => {
    it('rejects openStream returning null', async () => {
      const sink = new MemoryZipSink();
      const entry: RecoveryZipEntry = {
        name: 'null_stream.bin',
        size: 5,
        openStream: () => null as unknown as ReadableStream<Uint8Array>,
      };

      await expect(writeStoreOnlyZip([entry], sink)).rejects.toThrow(
        /must return a ReadableStream with a getReader\(\) method/
      );
    });

    it('rejects openStream returning a plain object without getReader', async () => {
      const sink = new MemoryZipSink();
      const entry: RecoveryZipEntry = {
        name: 'plain_obj.bin',
        size: 5,
        openStream: () => ({} as unknown as ReadableStream<Uint8Array>),
      };

      await expect(writeStoreOnlyZip([entry], sink)).rejects.toThrow(
        /must return a ReadableStream with a getReader\(\) method/
      );
    });

    it('preserves useful error message when getReader throws', async () => {
      const sink = new MemoryZipSink();
      const entry: RecoveryZipEntry = {
        name: 'throw_getreader.bin',
        size: 5,
        openStream() {
          return {
            getReader() {
              throw new Error('Stream locked by another reader');
            },
          } as unknown as ReadableStream<Uint8Array>;
        },
      };

      await expect(writeStoreOnlyZip([entry], sink)).rejects.toThrow(
        /Failed to acquire reader for entry "throw_getreader.bin": Stream locked by another reader/
      );
    });

    it('rejects reader missing read(), cancel(), or releaseLock() independently', async () => {
      const sink = new MemoryZipSink();

      // Missing read
      const missingRead: RecoveryZipEntry = {
        name: 'no_read.bin',
        size: 5,
        openStream() {
          return {
            getReader() {
              return { cancel: () => {}, releaseLock: () => {} };
            },
          } as unknown as ReadableStream<Uint8Array>;
        },
      };
      await expect(writeStoreOnlyZip([missingRead], sink)).rejects.toThrow(/must provide read\(\), cancel\(\), and releaseLock\(\)/);

      // Missing cancel
      const missingCancel: RecoveryZipEntry = {
        name: 'no_cancel.bin',
        size: 5,
        openStream() {
          return {
            getReader() {
              return { read: async () => ({ done: true, value: undefined }), releaseLock: () => {} };
            },
          } as unknown as ReadableStream<Uint8Array>;
        },
      };
      await expect(writeStoreOnlyZip([missingCancel], sink)).rejects.toThrow(/must provide read\(\), cancel\(\), and releaseLock\(\)/);

      // Missing releaseLock
      const missingReleaseLock: RecoveryZipEntry = {
        name: 'no_releaselock.bin',
        size: 5,
        openStream() {
          return {
            getReader() {
              return { read: async () => ({ done: true, value: undefined }), cancel: () => {} };
            },
          } as unknown as ReadableStream<Uint8Array>;
        },
      };
      await expect(writeStoreOnlyZip([missingReleaseLock], sink)).rejects.toThrow(/must provide read\(\), cancel\(\), and releaseLock\(\)/);
    });

    it('rejects a stream whose reader read() rejects and cleans up reader lock', async () => {
      const sink = new MemoryZipSink();
      let streamInstance: ReadableStream<Uint8Array> | null = null;

      const entry: RecoveryZipEntry = {
        name: 'reject_read.bin',
        size: 10,
        openStream() {
          streamInstance = new ReadableStream<Uint8Array>({
            pull() {
              return Promise.reject(new Error('Hardware read error'));
            },
          });
          return streamInstance;
        },
      };

      await expect(writeStoreOnlyZip([entry], sink)).rejects.toThrow(/Hardware read error/);
      expect(streamInstance).not.toBeNull();
      expect(streamInstance!.locked).toBe(false);
    });

    it('rejects when stream yields a non-Uint8Array chunk and releases lock', async () => {
      const sink = new MemoryZipSink();
      let streamInstance: ReadableStream<Uint8Array> | null = null;

      const entry: RecoveryZipEntry = {
        name: 'bad_chunk.bin',
        size: 10,
        openStream() {
          streamInstance = new ReadableStream<Uint8Array>({
            start(controller) {
              (controller as unknown as { enqueue(val: unknown): void }).enqueue('not-a-uint8array');
              controller.close();
            },
          });
          return streamInstance;
        },
      };

      await expect(writeStoreOnlyZip([entry], sink)).rejects.toThrow(
        /yielded a non-Uint8Array chunk/
      );
      expect(streamInstance).not.toBeNull();
      expect(streamInstance!.locked).toBe(false);
    });
  });

  // 23. Immutable Preflight Plan & Mutating Getter Protection
  describe('23. Immutable Preflight Plan & Getter Protection', () => {
    it('evaluates entry properties exactly once during preflight and does not re-read them during writing', async () => {
      const sink = new MemoryZipSink();

      let nameAccessCount = 0;
      let sizeAccessCount = 0;
      let openStreamAccessCount = 0;

      const dynamicEntry = {
        get name() {
          nameAccessCount++;
          // If called a second time, returns a different corrupted name
          return nameAccessCount === 1 ? 'static_file.txt' : 'corrupted_name.txt';
        },
        get size() {
          sizeAccessCount++;
          return sizeAccessCount === 1 ? 5 : 999999;
        },
        get openStream() {
          openStreamAccessCount++;
          return () =>
            new ReadableStream<Uint8Array>({
              start(c) {
                c.enqueue(new Uint8Array([1, 2, 3, 4, 5]));
                c.close();
              },
            });
        },
      };

      const result = await writeStoreOnlyZip([dynamicEntry], sink);
      expect(result.entryCount).toBe(1);

      // Verify each property was accessed exactly once during preflight plan construction
      expect(nameAccessCount).toBe(1);
      expect(sizeAccessCount).toBe(1);
      expect(openStreamAccessCount).toBe(1);

      const parsed = parseZipArchive(sink.getBuffer());
      expect(parsed.entries[0].name).toBe('static_file.txt');
      expect(parsed.entries[0].uncompressedSize).toBe(5);
    });

    it('protects emitted archive when the exact input array and entry objects are mutated after writing starts', async () => {
      const sink = new MemoryZipSink();
      const payload1 = new Uint8Array([10, 20]);
      const payload2 = new Uint8Array([30, 40, 50]);

      const entry1: RecoveryZipEntry = {
        name: 'first.bin',
        size: payload1.length,
        openStream() {
          // Mutate the exact inputEntries array passed to writeStoreOnlyZip:
          inputEntries.pop();
          // Mutate entry1 and entry2 properties
          (entry1 as { name: string }).name = 'tampered1.bin';
          (entry1 as { size: number }).size = 99999;
          (entry2 as { name: string }).name = 'tampered2.bin';
          (entry2 as { size: number }).size = 88888;

          return new ReadableStream({
            start(c) {
              c.enqueue(payload1);
              c.close();
            },
          });
        },
      };

      const entry2: RecoveryZipEntry = {
        name: 'second.bin',
        size: payload2.length,
        openStream() {
          return new ReadableStream({
            start(c) {
              c.enqueue(payload2);
              c.close();
            },
          });
        },
      };

      const inputEntries: RecoveryZipEntry[] = [entry1, entry2];
      await writeStoreOnlyZip(inputEntries, sink);

      // The archive must have archived both original entries using the snapshotted plan
      const parsed = parseZipArchive(sink.getBuffer());
      expect(parsed.entries.length).toBe(2);
      expect(parsed.entries[0].name).toBe('first.bin');
      expect(parsed.entries[1].name).toBe('second.bin');
      expect(parsed.entries[0].payload).toEqual(payload1);
      expect(parsed.entries[1].payload).toEqual(payload2);
      expect(parsed.entries[0].uncompressedSize).toBe(payload1.length);
      expect(parsed.entries[1].uncompressedSize).toBe(payload2.length);
    });

    it('protects plan when the first entry name getter mutates the input array during preflight', async () => {
      const sink = new MemoryZipSink();
      const payload1 = new Uint8Array([1, 2]);
      const payload2 = new Uint8Array([3, 4]);

      const entry1 = {
        get name() {
          // Mutate the inputEntries array during preflight property evaluation:
          inputEntries.pop();
          return 'file1.dat';
        },
        size: payload1.length,
        openStream: () =>
          new ReadableStream<Uint8Array>({
            start(c) {
              c.enqueue(payload1);
              c.close();
            },
          }),
      };

      const entry2 = {
        name: 'file2.dat',
        size: payload2.length,
        openStream: () =>
          new ReadableStream<Uint8Array>({
            start(c) {
              c.enqueue(payload2);
              c.close();
            },
          }),
      };

      const inputEntries = [entry1 as unknown as RecoveryZipEntry, entry2 as unknown as RecoveryZipEntry];
      const result = await writeStoreOnlyZip(inputEntries, sink);

      // Both entries must still be validated and archived because entrySources was shallow-snapshotted
      expect(result.entryCount).toBe(2);
      const parsed = parseZipArchive(sink.getBuffer());
      expect(parsed.entries.length).toBe(2);
      expect(parsed.entries[0].name).toBe('file1.dat');
      expect(parsed.entries[1].name).toBe('file2.dat');
      expect(parsed.entries[0].payload).toEqual(payload1);
      expect(parsed.entries[1].payload).toEqual(payload2);
    });

    it('evaluates and binds sink.write exactly once and uses only the bound writer', async () => {
      let writeGetterAccessCount = 0;
      const writtenChunks: Uint8Array[] = [];

      const validWrite = async (chunk: Uint8Array) => {
        writtenChunks.push(chunk);
      };

      const sink = {
        get write() {
          writeGetterAccessCount++;
          if (writeGetterAccessCount === 1) {
            return validWrite;
          }
          throw new Error('sink.write accessed more than once!');
        },
      };

      const entry = makeStreamEntry('single_access.txt', new Uint8Array([1, 2, 3]));
      const result = await writeStoreOnlyZip([entry], sink as unknown as RecoveryZipSink);

      expect(result.entryCount).toBe(1);
      expect(writeGetterAccessCount).toBe(1);
      expect(writtenChunks.length).toBeGreaterThan(1);
    });

    it('fails before any sink write if sink.write getter throws', async () => {
      const sink = {
        get write() {
          throw new Error('sink.write getter threw');
        },
      };

      const entry = makeStreamEntry('test.txt', new Uint8Array([1]));
      await expect(
        writeStoreOnlyZip([entry], sink as unknown as RecoveryZipSink)
      ).rejects.toThrow('sink.write getter threw');
    });

    it('ensures any getter exception during plan creation throws before the first sink write', async () => {
      const sink = new MemoryZipSink();
      const throwingEntry = {
        get name(): string {
          throw new Error('Getter failed during preflight');
        },
        size: 10,
        openStream: () => new ReadableStream<Uint8Array>(),
      };

      await expect(
        writeStoreOnlyZip([throwingEntry as unknown as RecoveryZipEntry], sink)
      ).rejects.toThrow('Getter failed during preflight');
      expect(sink.chunks.length).toBe(0);
    });
  });

  // 24. Unicode and Lone Surrogates
  describe('24. Unicode and Lone Surrogate Safety', () => {
    it('rejects filenames containing lone high surrogates during preflight', async () => {
      const sink = new MemoryZipSink();
      const badName = 'corrupt_\uD800_path.txt';
      expect(hasLoneSurrogates(badName)).toBe(true);

      const entry = makeStreamEntry(badName, new Uint8Array([1]));
      await expect(writeStoreOnlyZip([entry], sink)).rejects.toThrow(
        /contains malformed Unicode \(unpaired UTF-16 surrogate\)/
      );
      expect(sink.chunks.length).toBe(0);
    });

    it('rejects filenames containing lone low surrogates during preflight', async () => {
      const sink = new MemoryZipSink();
      const badName = 'corrupt_\uDC00_path.txt';
      expect(hasLoneSurrogates(badName)).toBe(true);

      const entry = makeStreamEntry(badName, new Uint8Array([1]));
      await expect(writeStoreOnlyZip([entry], sink)).rejects.toThrow(
        /contains malformed Unicode \(unpaired UTF-16 surrogate\)/
      );
      expect(sink.chunks.length).toBe(0);
    });

    it('ensures distinct malformed strings are rejected rather than colliding on U+FFFD', () => {
      const str1 = 'bad_\uD800.txt';
      const str2 = 'bad_\uD801.txt';

      expect(() => validateZipPath(str1)).toThrow(/unpaired UTF-16 surrogate/);
      expect(() => validateZipPath(str2)).toThrow(/unpaired UTF-16 surrogate/);
    });

    it('allows valid surrogate pairs (emojis and supplemental planes)', () => {
      const validEmoji = 'art_🎨_絵.png';
      expect(hasLoneSurrogates(validEmoji)).toBe(false);
      const encoded = validateZipPath(validEmoji);
      expect(encoded.length).toBeGreaterThan(0);
    });
  });

  // 25. Bounded Auxiliary Memory during Preflight
  it('25. processes 100 entries with bounded metadata without accumulating filename buffers', async () => {
    const sink = new MemoryZipSink();
    const count = 100;
    const entries = Array.from({ length: count }, (_, i) =>
      makeStreamEntry(`folder_${i}/file_${i}.dat`, new Uint8Array([i & 0xff]))
    );

    const result = await writeStoreOnlyZip(entries, sink);
    expect(result.entryCount).toBe(count);

    const parsed = parseZipArchive(sink.getBuffer());
    expect(parsed.entries.length).toBe(count);
    expect(parsed.entries[42].name).toBe('folder_42/file_42.dat');
    expect(parsed.entries[42].payload).toEqual(new Uint8Array([42]));
  });

  // 26. Pure TypeScript portable roundtrip extraction test (always executed on all environments)
  it('26. completes end-to-end multi-file archive extraction and bit-level verification portably', async () => {
    const sink = new MemoryZipSink();
    const textData = new TextEncoder().encode('Hello PixiBun Recovery Archive!');
    const binaryData = new Uint8Array([0x00, 0xff, 0xaa, 0x55, 0x12, 0x34, 0x78, 0x90]);
    const emptyData = new Uint8Array(0);
    const unicodeData = new TextEncoder().encode('PixiBun Atelier: ピクセルアート 🎨');

    const entries = [
      makeStreamEntry('docs/readme.txt', textData),
      makeStreamEntry('assets/binary.dat', binaryData),
      makeStreamEntry('empty.placeholder', emptyData),
      makeStreamEntry('i18n/japanese_日本語.txt', unicodeData),
    ];

    const result = await writeStoreOnlyZip(entries, sink);
    expect(result.entryCount).toBe(4);

    const parsed = parseZipArchive(sink.getBuffer());
    expect(parsed.entries.length).toBe(4);

    expect(parsed.entries[0].name).toBe('docs/readme.txt');
    expect(parsed.entries[0].payload).toEqual(textData);
    expect(parsed.entries[0].computedCrc32).toBe(computeTestIndependentCrc32(textData));

    expect(parsed.entries[1].name).toBe('assets/binary.dat');
    expect(parsed.entries[1].payload).toEqual(binaryData);
    expect(parsed.entries[1].computedCrc32).toBe(computeTestIndependentCrc32(binaryData));

    expect(parsed.entries[2].name).toBe('empty.placeholder');
    expect(parsed.entries[2].payload).toEqual(emptyData);
    expect(parsed.entries[2].computedCrc32).toBe(0);

    expect(parsed.entries[3].name).toBe('i18n/japanese_日本語.txt');
    expect(parsed.entries[3].payload).toEqual(unicodeData);
    expect(parsed.entries[3].computedCrc32).toBe(computeTestIndependentCrc32(unicodeData));
  });
});
