/**
 * zipWriter.ts
 *
 * Streaming Store-Only (Uncompressed) ZIP32 Archive Writer for PixiBun Atelier.
 *
 * Implements standard PKZIP 2.0 / ZIP32 specification with zero external dependencies.
 *
 * Architectural & Streaming Decisions:
 * 1. Store-Only (Method 0): Uncompressed raw byte streams. Eliminates CPU compression
 *    overhead and memory buffers, enabling constant-memory streaming relative to payload
 *    size directly to disk or network sinks.
 * 2. Data Descriptor Framing (Flags 0x0808):
 *    - Bit 3 (0x0008): Local headers write zero for CRC-32 and sizes; true values are
 *      emitted in a 16-byte signed Data Descriptor immediately following payload data.
 *      This resolves the conflict between streaming single-pass CRC calculation and
 *      immutable local header emission.
 *    - Bit 11 (0x0800): Language encoding flag (EFS), mandating UTF-8 for all filenames.
 *    - Central Directory headers record the final actual CRC-32 and sizes.
 * 3. Bounded Chunking: Payload chunks larger than 64 KiB (65,536 bytes) are split before
 *    writing to the sink, guaranteeing bounded per-write memory pressure.
 * 4. Memory Bounds:
 *    - Payload processing uses O(1) memory relative to payload size.
 *    - Payload sink writes are capped at 64 KiB.
 *    - Archive bookkeeping is bounded O(entry count), capped by 65,535 entries.
 *    - Encoded filename buffers are not retained across entries; filenames are validated
 *      during preflight and re-encoded on the fly one entry at a time when emitting headers.
 *    - The duplicate-path set and immutable plan scale with entry count.
 * 5. Preflight Immutable Plan Snapshot & Array Stabilization:
 *    - The entries array length is captured once at entry, and entry references are shallow-copied
 *      into an internal array before evaluating any entry's name, size, or openStream.
 *    - All archive entries, paths, sizes, custom timestamps, and 32-bit offsets are
 *      evaluated, validated, and snapshotted into an immutable plan before writing byte 0.
 *    - Input entries array and entry properties are never re-read during writing, guarding
 *      against mutating accessors, proxies, or concurrent modifications.
 *    - The destination sink's write method is evaluated and bound exactly once at entry.
 *    - Rejects malformed Unicode (unpaired UTF-16 surrogates), preventing silent U+FFFD replacement
 *      and filename collisions.
 * 6. Responsive Cancellation:
 *    - AbortSignal interrupts pending reader.read() calls promptly via reader.cancel().
 *    - Normalizes cancellation so that rejections always produce a genuine DOMException
 *      named 'AbortError'.
 *    - Stream reader locks are released in all terminal paths.
 * 7. Sink Ownership: The writer never closes or aborts the caller-owned sink.
 */

export const ZIP32_CONSTANTS = {
  LOCAL_FILE_HEADER_SIGNATURE: 0x04034b50,
  DATA_DESCRIPTOR_SIGNATURE: 0x08074b50,
  CENTRAL_DIRECTORY_SIGNATURE: 0x02014b50,
  END_OF_CENTRAL_DIR_SIGNATURE: 0x06054b50,

  VERSION_NEEDED_STORE: 20, // PKZIP 2.0
  VERSION_MADE_BY_DOS: 20,  // DOS / FAT filesystem, version 2.0
  METHOD_STORE: 0,          // No compression

  // Bit 3 (data descriptor) | Bit 11 (UTF-8 filename encoding)
  FLAG_DATA_DESCRIPTOR_AND_UTF8: 0x0808,

  // Minimum MS-DOS timestamp: 1980-01-01 00:00:00
  // Date: (1980-1980)<<9 | 1<<5 | 1 = 0x0021
  // Time: 0<<11 | 0<<5 | 0 = 0x0000
  DOS_MINIMUM_DATE: 0x0021,
  DOS_MINIMUM_TIME: 0x0000,

  MAX_ENTRIES: 0xffff,        // 65,535
  MAX_FILE_SIZE: 0xffffffff,  // 4 GiB - 1 (4,294,967,295 bytes)
  MAX_ARCHIVE_SIZE: 0xffffffff,
  MAX_FILENAME_BYTES: 0xffff, // 65,535
  MAX_PAYLOAD_CHUNK_SIZE: 65536, // 64 KiB per sink write
} as const;

export interface RecoveryZipEntry {
  /** Relative archive path (e.g. "project.json", "layers/layer_0_0.png"). */
  name: string;
  /** Declared uncompressed byte length. Must match actual streamed bytes exactly. */
  size: number;
  /** Opens a fresh readable byte stream for this entry's payload. */
  openStream(): ReadableStream<Uint8Array>;
}

export interface RecoveryZipSink {
  /** Writes a byte chunk to the destination sink. */
  write(chunk: Uint8Array): Promise<void>;
}

export interface RecoveryZipOptions {
  /** Optional cancellation signal. */
  signal?: AbortSignal;
  /** Optional deterministic MS-DOS timestamp override { time, date }. */
  dosTimestamp?: { time: number; date: number };
}

export interface RecoveryZipResult {
  /** Total bytes written to the sink. */
  totalBytesWritten: number;
  /** Total entries archived. */
  entryCount: number;
  /** Byte offset where the central directory begins. */
  centralDirectoryOffset: number;
  /** Byte length of all central directory records. */
  centralDirectorySize: number;
}

interface PlannedZipEntry {
  readonly name: string;
  readonly size: number;
  readonly openStream: () => ReadableStream<Uint8Array>;
  readonly localHeaderOffset: number;
}

// -----------------------------------------------------------------------------
// CRC-32 IEEE 802.3 Implementation (Polynomial: 0xEDB88320)
// -----------------------------------------------------------------------------

const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[n] = c >>> 0;
}

/**
 * Updates a running CRC-32 with a new byte chunk.
 * Initialize runningCrc with 0xffffffff.
 */
export function updateCrc32(runningCrc: number, chunk: Uint8Array): number {
  let c = runningCrc;
  const len = chunk.length;
  for (let i = 0; i < len; i++) {
    c = CRC_TABLE[(c ^ chunk[i]) & 0xff] ^ (c >>> 8);
  }
  return c;
}

/**
 * Computes standard IEEE 802.3 CRC-32 checksum for a complete byte buffer.
 */
export function computeCrc32(data: Uint8Array): number {
  return (updateCrc32(0xffffffff, data) ^ 0xffffffff) >>> 0;
}

// -----------------------------------------------------------------------------
// Unicode & Timestamp Validation Utilities
// -----------------------------------------------------------------------------

/**
 * Checks whether a string contains unpaired UTF-16 surrogates.
 * Detects lone high surrogates (0xD800-0xDBFF) without low surrogates (0xDC00-0xDFFF)
 * and lone low surrogates.
 */
export function hasLoneSurrogates(str: string): boolean {
  if (typeof str !== 'string') {
    return false;
  }
  const len = str.length;
  for (let i = 0; i < len; i++) {
    const code = str.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff) {
      if (i + 1 >= len) {
        return true;
      }
      const next = str.charCodeAt(i + 1);
      if (next < 0xdc00 || next > 0xdfff) {
        return true;
      }
      i++; // Skip paired low surrogate
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      return true;
    }
  }
  return false;
}

/**
 * Validates a custom MS-DOS timestamp object during preflight.
 * Enforces numeric finite integer types, 16-bit ranges, and valid decoded DOS date/time fields.
 */
export function validateDosTimestamp(timestamp: unknown): { time: number; date: number } {
  if (!timestamp || typeof timestamp !== 'object') {
    throw new TypeError('dosTimestamp must be an object with numeric time and date properties.');
  }

  const { time, date } = timestamp as { time: unknown; date: unknown };

  if (typeof time !== 'number' || !Number.isFinite(time) || !Number.isInteger(time)) {
    throw new TypeError(`Invalid DOS time: must be a finite integer, received ${String(time)}.`);
  }

  if (typeof date !== 'number' || !Number.isFinite(date) || !Number.isInteger(date)) {
    throw new TypeError(`Invalid DOS date: must be a finite integer, received ${String(date)}.`);
  }

  if (time < 0 || time > 0xffff) {
    throw new RangeError(`DOS time out of range: ${time} must be between 0 and 0xFFFF (65535).`);
  }

  if (date < 0 || date > 0xffff) {
    throw new RangeError(`DOS date out of range: ${date} must be between 0 and 0xFFFF (65535).`);
  }

  // DOS time bit layout:
  // bits 15-11: Hours (0-23)
  // bits 10-5:  Minutes (0-59)
  // bits 4-0:   Two-second units (0-29) -> (0-58 seconds, 2-sec intervals)
  const hours = (time >>> 11) & 0x1f;
  const minutes = (time >>> 5) & 0x3f;
  const twoSeconds = time & 0x1f;

  if (hours > 23) {
    throw new RangeError(`Invalid DOS time hour: decoded hour ${hours} exceeds 23 (raw: 0x${time.toString(16)}).`);
  }
  if (minutes > 59) {
    throw new RangeError(`Invalid DOS time minute: decoded minute ${minutes} exceeds 59 (raw: 0x${time.toString(16)}).`);
  }
  if (twoSeconds > 29) {
    throw new RangeError(`Invalid DOS time two-second units: decoded value ${twoSeconds} exceeds 29 (raw: 0x${time.toString(16)}).`);
  }

  // DOS date bit layout:
  // bits 15-9: Year offset from 1980 (0-127 -> 1980-2107)
  // bits 8-5:  Month (1-12)
  // bits 4-0:  Day of month (1-31)
  const yearOffset = (date >>> 9) & 0x7f;
  const month = (date >>> 5) & 0x0f;
  const day = date & 0x1f;
  const year = 1980 + yearOffset;

  if (year < 1980 || year > 2107) {
    throw new RangeError(`Invalid DOS date year: decoded year ${year} out of range 1980-2107 (raw: 0x${date.toString(16)}).`);
  }
  if (month < 1 || month > 12) {
    throw new RangeError(`Invalid DOS date month: decoded month ${month} out of range 1-12 (raw: 0x${date.toString(16)}).`);
  }
  if (day < 1 || day > 31) {
    throw new RangeError(`Invalid DOS date day: decoded day ${day} out of range 1-31 (raw: 0x${date.toString(16)}).`);
  }

  return { time, date };
}

// -----------------------------------------------------------------------------
// Preflight Path Validations
// -----------------------------------------------------------------------------

/**
 * Validates an archive relative path and encodes it to UTF-8 bytes.
 * Rejects unsafe, absolute, traversal, backslash, drive-letter, NUL, lone surrogate, and oversized paths.
 */
export function validateZipPath(name: string): Uint8Array {
  if (typeof name !== 'string') {
    throw new TypeError('Archive entry name must be a string.');
  }

  if (name.length === 0) {
    throw new Error('Archive entry path cannot be empty.');
  }

  if (name.includes('\0')) {
    throw new Error(`Archive entry path contains NUL character: "${name}".`);
  }

  if (name.includes('\\')) {
    throw new Error(`Archive entry path cannot contain backslashes: "${name}". Use "/" separator.`);
  }

  if (/^[a-zA-Z]:/.test(name)) {
    throw new Error(`Archive entry path cannot contain a drive letter: "${name}".`);
  }

  if (name.startsWith('/')) {
    throw new Error(`Archive entry path cannot be absolute: "${name}".`);
  }

  if (hasLoneSurrogates(name)) {
    throw new Error(
      `Archive entry path contains malformed Unicode (unpaired UTF-16 surrogate): "${name}".`
    );
  }

  const segments = name.split('/');
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    if (segment === '' || segment === '.' || segment === '..') {
      throw new Error(
        `Archive entry path "${name}" contains forbidden segment "${segment}" (empty, ".", or "..").`
      );
    }
  }

  const encoded = new TextEncoder().encode(name);
  if (encoded.length === 0 || encoded.length > ZIP32_CONSTANTS.MAX_FILENAME_BYTES) {
    throw new Error(
      `Archive entry UTF-8 filename length (${encoded.length} bytes) exceeds ZIP32 limit (${ZIP32_CONSTANTS.MAX_FILENAME_BYTES}).`
    );
  }

  return encoded;
}

// -----------------------------------------------------------------------------
// Binary Record Creators
// -----------------------------------------------------------------------------

function createLocalFileHeader(
  nameBytes: Uint8Array,
  dosTime: number,
  dosDate: number
): Uint8Array {
  const header = new Uint8Array(30 + nameBytes.length);
  const view = new DataView(header.buffer, header.byteOffset, header.byteLength);

  view.setUint32(0, ZIP32_CONSTANTS.LOCAL_FILE_HEADER_SIGNATURE, true);
  view.setUint16(4, ZIP32_CONSTANTS.VERSION_NEEDED_STORE, true);
  view.setUint16(6, ZIP32_CONSTANTS.FLAG_DATA_DESCRIPTOR_AND_UTF8, true);
  view.setUint16(8, ZIP32_CONSTANTS.METHOD_STORE, true);
  view.setUint16(10, dosTime, true);
  view.setUint16(12, dosDate, true);
  view.setUint32(14, 0, true); // CRC zeroed (in data descriptor)
  view.setUint32(18, 0, true); // Compressed size zeroed (in data descriptor)
  view.setUint32(22, 0, true); // Uncompressed size zeroed (in data descriptor)
  view.setUint16(26, nameBytes.length, true);
  view.setUint16(28, 0, true); // Extra field length
  header.set(nameBytes, 30);

  return header;
}

function createDataDescriptor(crc: number, size: number): Uint8Array {
  const desc = new Uint8Array(16);
  const view = new DataView(desc.buffer, desc.byteOffset, desc.byteLength);

  view.setUint32(0, ZIP32_CONSTANTS.DATA_DESCRIPTOR_SIGNATURE, true);
  view.setUint32(4, crc >>> 0, true);
  view.setUint32(8, size >>> 0, true);  // Compressed size (Store mode: compressed == uncompressed)
  view.setUint32(12, size >>> 0, true); // Uncompressed size

  return desc;
}

function createCentralDirectoryHeader(
  nameBytes: Uint8Array,
  crc: number,
  size: number,
  localHeaderOffset: number,
  dosTime: number,
  dosDate: number
): Uint8Array {
  const cd = new Uint8Array(46 + nameBytes.length);
  const view = new DataView(cd.buffer, cd.byteOffset, cd.byteLength);

  view.setUint32(0, ZIP32_CONSTANTS.CENTRAL_DIRECTORY_SIGNATURE, true);
  view.setUint16(4, ZIP32_CONSTANTS.VERSION_MADE_BY_DOS, true);
  view.setUint16(6, ZIP32_CONSTANTS.VERSION_NEEDED_STORE, true);
  view.setUint16(8, ZIP32_CONSTANTS.FLAG_DATA_DESCRIPTOR_AND_UTF8, true);
  view.setUint16(10, ZIP32_CONSTANTS.METHOD_STORE, true);
  view.setUint16(12, dosTime, true);
  view.setUint16(14, dosDate, true);
  view.setUint32(16, crc >>> 0, true);
  view.setUint32(20, size >>> 0, true);
  view.setUint32(24, size >>> 0, true);
  view.setUint16(28, nameBytes.length, true);
  view.setUint16(30, 0, true); // Extra field length
  view.setUint16(32, 0, true); // File comment length
  view.setUint16(34, 0, true); // Disk number start
  view.setUint16(36, 0, true); // Internal file attributes
  view.setUint32(38, 0, true); // External file attributes
  view.setUint32(42, localHeaderOffset >>> 0, true);
  cd.set(nameBytes, 46);

  return cd;
}

function createEndOfCentralDirectoryRecord(
  entryCount: number,
  cdSize: number,
  cdOffset: number
): Uint8Array {
  const eocd = new Uint8Array(22);
  const view = new DataView(eocd.buffer, eocd.byteOffset, eocd.byteLength);

  view.setUint32(0, ZIP32_CONSTANTS.END_OF_CENTRAL_DIR_SIGNATURE, true);
  view.setUint16(4, 0, true);          // Number of this disk
  view.setUint16(6, 0, true);          // Disk where central directory starts
  view.setUint16(8, entryCount, true); // Number of central directory records on this disk
  view.setUint16(10, entryCount, true);// Total number of central directory records
  view.setUint32(12, cdSize >>> 0, true);
  view.setUint32(16, cdOffset >>> 0, true);
  view.setUint16(20, 0, true);         // ZIP file comment length

  return eocd;
}

function getAbortError(signal?: AbortSignal, defaultMsg = 'ZIP creation was cancelled.'): DOMException {
  const reason = signal?.reason;
  if (reason instanceof DOMException && reason.name === 'AbortError') {
    return reason;
  }
  const message =
    typeof reason === 'string'
      ? reason
      : reason instanceof Error
        ? reason.message
        : defaultMsg;
  return new DOMException(message, 'AbortError');
}

// -----------------------------------------------------------------------------
// Core Streaming ZIP32 Writer
// -----------------------------------------------------------------------------

/**
 * Writes a valid Store-only (uncompressed) PKZIP 2.0 / ZIP32 archive to a stream sink.
 *
 * Guarantees:
 * - Preflight immutable plan: captures entryCount and shallow-copies entry sources before
 *   evaluating any entry properties. Snapshots paths, sizes, offsets, and bound stream openers
 *   before writing byte 0. Never re-reads the input entries array or entry objects during writing.
 * - Single-access sink binding: accesses and binds sink.write exactly once at function entry.
 * - Incremental streaming: never buffers complete entry payloads.
 * - Chunk bounded: payload writes to sink never exceed 64 KiB.
 * - Memory bounds: payload streaming is O(1); archive bookkeeping is bounded O(entry count).
 * - Exact size verification: short or oversized streams throw and clean up readers.
 * - Responsive cancellation: registers abort listener on reader to interrupt pending reads;
 *   guarantees DOMException AbortError priority and releases reader locks in all terminal paths.
 * - Sink ownership: never closes or aborts the caller-owned sink.
 */
export async function writeStoreOnlyZip(
  entries: readonly RecoveryZipEntry[],
  sink: RecoveryZipSink,
  options?: RecoveryZipOptions
): Promise<RecoveryZipResult> {
  // 1. Validate inputs and stabilize input array
  if (!Array.isArray(entries)) {
    throw new TypeError('Archive entries must be an array.');
  }

  // Capture entries.length once
  const entryCount = entries.length;
  if (typeof entryCount !== 'number' || !Number.isSafeInteger(entryCount) || entryCount < 0) {
    throw new TypeError('Archive entries array length is invalid.');
  }

  if (entryCount > ZIP32_CONSTANTS.MAX_ENTRIES) {
    throw new Error(
      `Archive entry count (${entryCount}) exceeds maximum ZIP32 limit (${ZIP32_CONSTANTS.MAX_ENTRIES}).`
    );
  }

  // Shallow-snapshot the entry sources into an internal array BEFORE evaluating
  // any entry's name, size, or openStream. This protects against mutating getters
  // that modify entries.length or remove/reorder elements during preflight.
  const entrySources = new Array<RecoveryZipEntry>(entryCount);
  for (let i = 0; i < entryCount; i++) {
    const src = entries[i];
    if (!src || typeof src !== 'object') {
      throw new TypeError(`Archive entry at index ${i} must be an object.`);
    }
    entrySources[i] = src;
  }

  // Access and bind sink.write exactly once
  if (!sink || typeof sink !== 'object') {
    throw new TypeError('Archive sink must be an object.');
  }
  const sinkWriteMethod = (sink as { write?: unknown }).write;
  if (typeof sinkWriteMethod !== 'function') {
    throw new TypeError('Archive sink must provide a write(chunk: Uint8Array): Promise<void> method.');
  }
  const sinkWrite = sinkWriteMethod.bind(sink);

  const signal = options?.signal;
  if (signal?.aborted) {
    throw getAbortError(signal, 'ZIP creation was cancelled before execution.');
  }

  // Validate custom timestamp before writing byte 0
  let dosTime: number = ZIP32_CONSTANTS.DOS_MINIMUM_TIME;
  let dosDate: number = ZIP32_CONSTANTS.DOS_MINIMUM_DATE;
  if (options?.dosTimestamp !== undefined) {
    const validated = validateDosTimestamp(options.dosTimestamp);
    dosTime = validated.time;
    dosDate = validated.date;
  }

  // 2. Preflight validation: snapshot entries into an immutable execution plan
  // Built exclusively from entrySources using the captured entryCount.
  const seenPaths = new Set<string>();
  const plannedEntries: PlannedZipEntry[] = new Array(entryCount);
  const entryCrcs = new Uint32Array(entryCount);

  let currentOffset = 0;
  let totalCentralDirectorySize = 0;

  for (let i = 0; i < entryCount; i++) {
    const entry = entrySources[i];

    // Evaluate and snapshot entry properties exactly once
    const name = entry.name;
    const size = entry.size;
    const openStream = entry.openStream;

    if (typeof name !== 'string') {
      throw new TypeError(`Archive entry at index ${i} name must be a string.`);
    }

    if (seenPaths.has(name)) {
      throw new Error(`Duplicate archive path: "${name}".`);
    }

    // Validate path (checks segments, traversal, backslashes, NUL, and lone surrogates)
    const nameBytes = validateZipPath(name);
    seenPaths.add(name);
    const nameByteLength = nameBytes.length;

    // Validate declared size
    if (
      typeof size !== 'number' ||
      !Number.isFinite(size) ||
      !Number.isSafeInteger(size) ||
      size < 0 ||
      size > ZIP32_CONSTANTS.MAX_FILE_SIZE
    ) {
      throw new Error(
        `Invalid declared entry size (${size}) for "${name}": must be an integer between 0 and ${ZIP32_CONSTANTS.MAX_FILE_SIZE}.`
      );
    }

    if (typeof openStream !== 'function') {
      throw new TypeError(`Archive entry "${name}" must provide an openStream() function.`);
    }

    const boundOpenStream = openStream.bind(entry);
    const localHeaderOffset = currentOffset;

    // Checked arithmetic for local entry span:
    // Local header (30 + nameByteLength) + payload (size) + Data Descriptor (16)
    const localEntrySpan = 30 + nameByteLength + size + 16;
    currentOffset += localEntrySpan;

    if (currentOffset > ZIP32_CONSTANTS.MAX_ARCHIVE_SIZE) {
      throw new Error(
        `Archive calculated size exceeds 4 GiB ZIP32 limit (${ZIP32_CONSTANTS.MAX_ARCHIVE_SIZE} bytes).`
      );
    }

    // Central directory entry span: 46 + nameByteLength
    totalCentralDirectorySize += 46 + nameByteLength;

    plannedEntries[i] = {
      name,
      size,
      openStream: boundOpenStream,
      localHeaderOffset,
    };
  }

  const centralDirectoryOffset = currentOffset;
  const totalArchiveSize = centralDirectoryOffset + totalCentralDirectorySize + 22; // 22 = EOCD length

  if (
    centralDirectoryOffset > ZIP32_CONSTANTS.MAX_ARCHIVE_SIZE ||
    totalCentralDirectorySize > ZIP32_CONSTANTS.MAX_ARCHIVE_SIZE ||
    totalArchiveSize > ZIP32_CONSTANTS.MAX_ARCHIVE_SIZE
  ) {
    throw new Error('Archive calculated dimensions exceed 4 GiB ZIP32 limits.');
  }

  let bytesWritten = 0;
  const textEncoder = new TextEncoder();

  // 3. Write local file headers, stream payload chunks, and write signed data descriptors
  // Execution uses only plannedEntries; original entries array is never accessed again.
  for (let i = 0; i < plannedEntries.length; i++) {
    if (signal?.aborted) {
      throw getAbortError(signal);
    }

    const planned = plannedEntries[i];
    // Re-encode filename for this entry's local header (not retained across entries)
    const nameBytes = textEncoder.encode(planned.name);

    // Write Local File Header (30 + name.length)
    const localHeader = createLocalFileHeader(nameBytes, dosTime, dosDate);
    await sinkWrite(localHeader);
    bytesWritten += localHeader.length;

    // Open entry stream and validate returned stream object at runtime
    let stream: ReadableStream<Uint8Array>;
    try {
      stream = planned.openStream();
    } catch (err) {
      throw new Error(
        `Failed to open stream for entry "${planned.name}": ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }

    if (!stream || typeof stream !== 'object' || typeof stream.getReader !== 'function') {
      throw new TypeError(
        `Archive entry "${planned.name}" openStream() must return a ReadableStream with a getReader() method.`
      );
    }

    // Acquire reader and validate reader object at runtime
    let reader: ReadableStreamDefaultReader<Uint8Array>;
    try {
      reader = stream.getReader();
    } catch (err) {
      throw new Error(
        `Failed to acquire reader for entry "${planned.name}": ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }

    if (
      !reader ||
      typeof reader !== 'object' ||
      typeof reader.read !== 'function' ||
      typeof reader.cancel !== 'function' ||
      typeof reader.releaseLock !== 'function'
    ) {
      const lockable = reader as { releaseLock?: () => void } | null;
      if (lockable && typeof lockable.releaseLock === 'function') {
        try {
          lockable.releaseLock();
        } catch {
          // ignore
        }
      }
      throw new TypeError(
        `Acquired reader for entry "${planned.name}" is invalid: must provide read(), cancel(), and releaseLock() methods.`
      );
    }

    let entryBytesRead = 0;
    let runningCrc = 0xffffffff;

    // Wire AbortSignal to cancel reader if aborted while a read is pending
    let onAbort: (() => void) | undefined;
    if (signal) {
      onAbort = () => {
        const abortErr = getAbortError(signal);
        try {
          const cancelPromise = reader.cancel(abortErr);
          if (cancelPromise && typeof cancelPromise.catch === 'function') {
            cancelPromise.catch(() => {});
          }
        } catch {
          // Ignore synchronous cancellation errors
        }
      };
      signal.addEventListener('abort', onAbort, { once: true });
    }

    try {
      while (true) {
        if (signal?.aborted) {
          throw getAbortError(signal);
        }

        const { done, value } = await reader.read();

        // Check signal immediately after every awaited reader.read()
        if (signal?.aborted) {
          throw getAbortError(signal);
        }

        if (done) {
          break;
        }

        if (!(value instanceof Uint8Array)) {
          throw new TypeError(`Stream for entry "${planned.name}" yielded a non-Uint8Array chunk.`);
        }

        if (value.length === 0) {
          continue;
        }

        entryBytesRead += value.length;
        if (entryBytesRead > planned.size) {
          throw new Error(
            `Stream for entry "${planned.name}" produced more bytes (${entryBytesRead}) than declared size (${planned.size}).`
          );
        }

        // Update incremental CRC-32
        runningCrc = updateCrc32(runningCrc, value);

        // Split payload writes so no payload chunk sent to the sink exceeds 64 KiB
        const maxChunk = ZIP32_CONSTANTS.MAX_PAYLOAD_CHUNK_SIZE;
        if (value.length <= maxChunk) {
          await sinkWrite(value);
        } else {
          for (let offset = 0; offset < value.length; offset += maxChunk) {
            if (signal?.aborted) {
              throw getAbortError(signal);
            }
            const subChunk = value.subarray(offset, Math.min(offset + maxChunk, value.length));
            await sinkWrite(subChunk);
          }
        }
        bytesWritten += value.length;
      }

      if (signal?.aborted) {
        throw getAbortError(signal);
      }

      if (entryBytesRead !== planned.size) {
        throw new Error(
          `Stream for entry "${planned.name}" produced ${entryBytesRead} bytes, but declared size was ${planned.size}.`
        );
      }
    } catch (err) {
      if (signal?.aborted) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          throw err;
        }
        throw getAbortError(signal);
      }
      try {
        const cancelPromise = reader.cancel(err);
        if (cancelPromise && typeof cancelPromise.catch === 'function') {
          cancelPromise.catch(() => {});
        }
      } catch {
        // Ignore secondary cancellation error
      }
      throw err;
    } finally {
      if (signal && onAbort) {
        signal.removeEventListener('abort', onAbort);
      }
      try {
        reader.releaseLock();
      } catch {
        // Ignore releaseLock error
      }
    }

    // Finalize CRC-32 for this entry
    const finalCrc = (runningCrc ^ 0xffffffff) >>> 0;
    entryCrcs[i] = finalCrc;

    // Write Signed Data Descriptor (16 bytes)
    const descriptor = createDataDescriptor(finalCrc, planned.size);
    await sinkWrite(descriptor);
    bytesWritten += descriptor.length;
  }

  // 4. Write Central Directory Headers
  if (signal?.aborted) {
    throw getAbortError(signal);
  }

  for (let i = 0; i < plannedEntries.length; i++) {
    if (signal?.aborted) {
      throw getAbortError(signal);
    }

    const planned = plannedEntries[i];
    const nameBytes = textEncoder.encode(planned.name);
    const cdHeader = createCentralDirectoryHeader(
      nameBytes,
      entryCrcs[i],
      planned.size,
      planned.localHeaderOffset,
      dosTime,
      dosDate
    );
    await sinkWrite(cdHeader);
    bytesWritten += cdHeader.length;
  }

  // 5. Write End of Central Directory Record (22 bytes)
  if (signal?.aborted) {
    throw getAbortError(signal);
  }

  const eocd = createEndOfCentralDirectoryRecord(
    plannedEntries.length,
    totalCentralDirectorySize,
    centralDirectoryOffset
  );
  await sinkWrite(eocd);
  bytesWritten += eocd.length;

  return {
    totalBytesWritten: bytesWritten,
    entryCount: plannedEntries.length,
    centralDirectoryOffset,
    centralDirectorySize: totalCentralDirectorySize,
  };
}
