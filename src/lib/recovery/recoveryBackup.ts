/**
 * recoveryBackup.ts
 *
 * Untouched Archive Assembly and Immutable Database Snapshot Engine for PixiBun Atelier.
 *
 * Implements:
 * 1. Read-only single-transaction IndexedDB snapshotting with keyset bounds.
 * 2. Fail-closed storage envelope validation.
 * 3. Exact ZIP32 size preflight calculation.
 * 4. Incremental UTF-8 string streaming for project.json without full array allocation.
 * 5. Closed-schema recovery-manifest.json generation.
 * 6. Module-private non-forgeable trust verification for PreparedRecoveryArchive.
 * 7. Safe suggested filename generation.
 */

import Dexie from 'dexie';
import { db, type StoredProject, type StoredLayerBlob, type RecoveryRecord } from '@/lib/storage/db';
import { RECOVERY_INSPECTION_CEILINGS, RECOVERY_BACKUP_LIMITS } from './recoveryLimits';
import {
  RecoveryBackupError,
  type RecoveryBackupManifestV1,
  type PreparedBlobDescriptor,
  type PreparedRecoveryArchive,
  type RecoveryBackupWriteResult,
  type RecoveryReasonCode,
  KNOWN_RECOVERY_LEDGER_STATES,
  sortReasonCodes,
} from './recoveryTypes';
import {
  writeStoreOnlyZip,
  validateZipPath,
  ZIP32_CONSTANTS,
  type RecoveryZipEntry,
  type RecoveryZipSink,
} from './zipWriter';
import { getUtf8ByteLength } from '@/lib/safety/safeJson';

export interface RecoveryBackupPrepareOptions {
  signal?: AbortSignal;
  now?: () => Date;
}

export interface RecoveryBackupWriteOptions {
  signal?: AbortSignal;
}

// -----------------------------------------------------------------------------
// Module-Private Runtime Brand & Trust Map
// -----------------------------------------------------------------------------

interface PreparedArchiveInternal {
  readonly projectId: string;
  readonly dataJson: string;
  readonly manifestJson: string;
  readonly manifestBytes: Uint8Array;
  readonly blobHandles: readonly Blob[];
  readonly estimatedArchiveBytes: number;
  readonly entryCount: number;
  readonly blobCount: number;
  createEntries(): RecoveryZipEntry[];
}

const trustedPreparedArchives = new WeakSet<object>();
const preparedArchiveInternals = new WeakMap<PreparedRecoveryArchive, PreparedArchiveInternal>();

/**
 * Asserts that a prepared recovery archive object was produced by this module
 * and has not been forged, cloned, or structurally substituted.
 * Returns void to prevent leaking internal mutable state to callers.
 */
export function assertTrustedPreparedArchive(archive: unknown): void {
  if (!archive || typeof archive !== 'object') {
    throw new RecoveryBackupError(
      'INVALID_PREPARED_ARCHIVE',
      'Prepared recovery archive must be a non-null object.'
    );
  }
  if (!trustedPreparedArchives.has(archive) || !preparedArchiveInternals.has(archive as PreparedRecoveryArchive)) {
    throw new RecoveryBackupError(
      'INVALID_PREPARED_ARCHIVE',
      'Unrecognized, untrusted, or forged prepared recovery archive object.'
    );
  }
}

function getInternal(archive: PreparedRecoveryArchive): PreparedArchiveInternal {
  assertTrustedPreparedArchive(archive);
  const internal = preparedArchiveInternals.get(archive);
  if (!internal) {
    throw new RecoveryBackupError(
      'INVALID_PREPARED_ARCHIVE',
      'Missing internal state for prepared recovery archive.'
    );
  }
  return internal;
}

// -----------------------------------------------------------------------------
// Manifest Size Policy Validator
// -----------------------------------------------------------------------------

/**
 * Pure policy validator for recovery manifest JSON size.
 * Rejects if manifest bytes exceed MAX_MANIFEST_BYTES (16 MiB).
 */
export function validateManifestByteLength(manifestByteLength: number): void {
  if (
    typeof manifestByteLength !== 'number' ||
    !Number.isSafeInteger(manifestByteLength) ||
    manifestByteLength < 0
  ) {
    throw new TypeError('Invalid manifestByteLength: must be a non-negative safe integer.');
  }
  if (manifestByteLength > RECOVERY_BACKUP_LIMITS.MAX_MANIFEST_BYTES) {
    throw new RecoveryBackupError(
      'MANIFEST_SIZE_EXCEEDED',
      `Generated recovery manifest size (${manifestByteLength} bytes) exceeds ceiling (${RECOVERY_BACKUP_LIMITS.MAX_MANIFEST_BYTES} bytes).`
    );
  }
}

// -----------------------------------------------------------------------------
// Exact Size Preflight Calculation
// -----------------------------------------------------------------------------

export interface ZipEntryMeta {
  readonly nameBytesLength: number;
  readonly size: number;
}

/**
 * Hardened exact Store-only (uncompressed) ZIP32 archive byte calculation.
 * Precomputes local headers, signed data descriptors, central directory headers, and EOCD.
 */
export function calculateStoreOnlyZipSize(entries: readonly ZipEntryMeta[]): number {
  if (!Array.isArray(entries)) {
    throw new TypeError('calculateStoreOnlyZipSize requires an array of entry descriptors.');
  }

  const entryCount = entries.length;
  if (!Number.isSafeInteger(entryCount) || entryCount < 0) {
    throw new TypeError('Invalid entry count: must be a non-negative safe integer.');
  }

  if (entryCount > ZIP32_CONSTANTS.MAX_ENTRIES) {
    throw new RecoveryBackupError(
      'ARCHIVE_SIZE_EXCEEDED',
      `Entry count (${entryCount}) exceeds ZIP32 limit (${ZIP32_CONSTANTS.MAX_ENTRIES}).`
    );
  }

  let currentOffset = 0;
  let totalCentralDirectorySize = 0;

  for (let i = 0; i < entryCount; i++) {
    const entry = entries[i];
    if (!entry || typeof entry !== 'object') {
      throw new TypeError(`Entry descriptor at index ${i} must be an object.`);
    }

    const { nameBytesLength, size } = entry;

    if (
      typeof nameBytesLength !== 'number' ||
      !Number.isSafeInteger(nameBytesLength) ||
      nameBytesLength < 1 ||
      nameBytesLength > ZIP32_CONSTANTS.MAX_FILENAME_BYTES
    ) {
      throw new TypeError(
        `Invalid nameBytesLength (${nameBytesLength}) at index ${i}: must be 1..${ZIP32_CONSTANTS.MAX_FILENAME_BYTES}.`
      );
    }

    if (
      typeof size !== 'number' ||
      !Number.isSafeInteger(size) ||
      size < 0 ||
      size > ZIP32_CONSTANTS.MAX_FILE_SIZE
    ) {
      throw new TypeError(
        `Invalid entry size (${size}) at index ${i}: must be a safe integer between 0 and ${ZIP32_CONSTANTS.MAX_FILE_SIZE}.`
      );
    }

    // Local header: 30 + nameBytesLength
    // Payload: size
    // Data descriptor: 16
    const localEntrySpan = 30 + nameBytesLength + size + 16;
    currentOffset += localEntrySpan;

    if (currentOffset > ZIP32_CONSTANTS.MAX_ARCHIVE_SIZE) {
      throw new RecoveryBackupError(
        'ARCHIVE_SIZE_EXCEEDED',
        `Archive offset exceeds 4 GiB ZIP32 limit (${ZIP32_CONSTANTS.MAX_ARCHIVE_SIZE} bytes).`
      );
    }

    // Central directory header: 46 + nameBytesLength
    const cdEntrySpan = 46 + nameBytesLength;
    totalCentralDirectorySize += cdEntrySpan;

    if (totalCentralDirectorySize > ZIP32_CONSTANTS.MAX_ARCHIVE_SIZE) {
      throw new RecoveryBackupError(
        'ARCHIVE_SIZE_EXCEEDED',
        `Central directory size exceeds 4 GiB ZIP32 limit (${ZIP32_CONSTANTS.MAX_ARCHIVE_SIZE} bytes).`
      );
    }
  }

  const centralDirectoryOffset = currentOffset;
  const totalArchiveSize = centralDirectoryOffset + totalCentralDirectorySize + 22; // 22 = EOCD length

  if (totalArchiveSize > ZIP32_CONSTANTS.MAX_ARCHIVE_SIZE) {
    throw new RecoveryBackupError(
      'ARCHIVE_SIZE_EXCEEDED',
      `Total archive size exceeds 4 GiB ZIP32 limit (${ZIP32_CONSTANTS.MAX_ARCHIVE_SIZE} bytes).`
    );
  }

  return totalArchiveSize;
}

// -----------------------------------------------------------------------------
// Bounded Incremental UTF-8 String Stream
// -----------------------------------------------------------------------------

/**
 * Creates an incremental ReadableStream<Uint8Array> emitting UTF-8 encoded chunks
 * of a JavaScript string without materializing the complete encoded array.
 *
 * Guarantees:
 * 1. Chunks are strictly <= maxChunkBytes (validated between 4 and 65,536 bytes).
 * 2. Surrogate pairs are never split across chunk boundaries.
 * 3. Platform-standard WHATWG TextEncoder applies U+FFFD (3 bytes) replacement to lone surrogates.
 * 4. Cooperative cancellation cleans up internal state.
 */
export function createUtf8StringStream(
  str: string,
  maxChunkBytes?: number
): ReadableStream<Uint8Array> {
  if (typeof str !== 'string') {
    throw new TypeError('createUtf8StringStream requires a string input.');
  }

  const minBound = 4;
  const maxBound = RECOVERY_BACKUP_LIMITS.MAX_UTF8_STREAM_CHUNK_BYTES;
  let effectiveMax: number = maxBound;

  if (maxChunkBytes !== undefined) {
    if (
      typeof maxChunkBytes !== 'number' ||
      !Number.isSafeInteger(maxChunkBytes) ||
      maxChunkBytes < minBound ||
      maxChunkBytes > maxBound
    ) {
      throw new RangeError(
        `maxChunkBytes must be a safe integer between ${minBound} and ${maxBound} (received ${String(maxChunkBytes)}).`
      );
    }
    effectiveMax = maxChunkBytes;
  }

  if (str.length === 0) {
    return new ReadableStream<Uint8Array>({
      start(controller) {
        controller.close();
      },
    });
  }

  // Determine character chunk size. Each UTF-16 code unit can expand to at most 3 UTF-8 bytes
  // (surrogate pairs are 2 code units -> 4 bytes = 2 bytes/unit; BMP >= 0x800 is 1 unit -> 3 bytes).
  // A slice of floor(effectiveMax / 3) characters is guaranteed to encode to <= effectiveMax.
  const baseCharSpan = Math.max(1, Math.floor(effectiveMax / 3));
  const textEncoder = new TextEncoder();
  let charOffset = 0;
  let isCancelled = false;

  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (isCancelled || charOffset >= str.length) {
        controller.close();
        return;
      }

      let targetEnd = Math.min(charOffset + baseCharSpan, str.length);

      // If targetEnd is not the end of the string, check if it splits a surrogate pair.
      // If str[targetEnd - 1] is a high surrogate (0xD800..0xDBFF) and str[targetEnd]
      // is a low surrogate (0xDC00..0xDFFF):
      // - If targetEnd - 1 > charOffset: decrement targetEnd so the pair stays together in the next chunk.
      // - If targetEnd - 1 === charOffset (baseCharSpan === 1): advance to include both code units
      //   (charOffset + 2), which encodes to exactly 4 bytes <= effectiveMax (since effectiveMax >= 4).
      if (targetEnd < str.length) {
        const lastCode = str.charCodeAt(targetEnd - 1);
        if (lastCode >= 0xd800 && lastCode <= 0xdbff) {
          const nextCode = str.charCodeAt(targetEnd);
          if (nextCode >= 0xdc00 && nextCode <= 0xdfff) {
            if (targetEnd - 1 > charOffset) {
              targetEnd--;
            } else {
              targetEnd = Math.min(charOffset + 2, str.length);
            }
          }
        }
      }

      const chunkStr = str.slice(charOffset, targetEnd);
      charOffset = targetEnd;

      const encoded = textEncoder.encode(chunkStr);
      controller.enqueue(encoded);

      if (charOffset >= str.length) {
        controller.close();
      }
    },
    cancel() {
      isCancelled = true;
      charOffset = str.length;
    },
  });
}

// -----------------------------------------------------------------------------
// Safe Suggested Filename Generator
// -----------------------------------------------------------------------------

/**
 * Generates a safe, ASCII-only suggested archive filename based on the injected UTC clock.
 * Format: pixibun-recovery-YYYYMMDDTHHMMSSZ.zip
 */
export function generateRecoveryBackupFilename(now: () => Date = () => new Date()): string {
  if (typeof now !== 'function') {
    throw new RecoveryBackupError('INVALID_CLOCK', 'now provider must be a function returning a Date.');
  }

  const d = now();
  if (!(d instanceof Date) || !Number.isFinite(d.getTime())) {
    throw new RecoveryBackupError('INVALID_CLOCK', 'now provider returned an invalid Date.');
  }

  const pad = (n: number) => String(n).padStart(2, '0');
  const year = d.getUTCFullYear();
  const month = pad(d.getUTCMonth() + 1);
  const day = pad(d.getUTCDate());
  const hours = pad(d.getUTCHours());
  const minutes = pad(d.getUTCMinutes());
  const seconds = pad(d.getUTCSeconds());

  return `pixibun-recovery-${year}${month}${day}T${hours}${minutes}${seconds}Z.zip`;
}

// -----------------------------------------------------------------------------
// Preparation & Snapshot Engine
// -----------------------------------------------------------------------------

function getAbortError(signal?: AbortSignal, defaultMsg = 'Operation was aborted.'): DOMException {
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

/**
 * Prepares an untouched recovery archive from an IndexedDB project.
 *
 * Guarantees:
 * 1. Single read-only Dexie transaction across projects, layerBlobs, and recoveryRecords.
 * 2. Full compound index keyspace inspection [projectId, Dexie.minKey] to [projectId, Dexie.maxKey].
 * 3. Count the compound range before materializing payloads; excessive counts fail closed.
 *    Admitted enumeration retains limit(MAX_INSPECTABLE_STORED_BLOBS + 1).
 * 4. Transaction is released immediately; zero transaction locks are held during subsequent archive writes.
 * 5. Fail-closed envelope validation (empty string dataJson accepted; non-string rejected; corrupted blobs rejected).
 * 6. Manifest schema closed and bounded (<= 16 MiB).
 * 7. Live ReadableStream instances are NOT created during preparation; fresh streams created on write.
 * 8. Returns a frozen, module-private branded PreparedRecoveryArchive with no Blob handles exposed.
 */
export async function prepareUntouchedRecoveryArchive(
  projectId: string,
  options?: RecoveryBackupPrepareOptions
): Promise<PreparedRecoveryArchive> {
  const signal = options?.signal;
  if (signal?.aborted) {
    throw getAbortError(signal, 'Recovery archive preparation was cancelled before start.');
  }

  const clock = options?.now ?? (() => new Date());
  if (typeof clock !== 'function') {
    throw new RecoveryBackupError('INVALID_CLOCK', 'now provider must be a function returning a Date.');
  }
  const startDate = clock();
  if (!(startDate instanceof Date) || !Number.isFinite(startDate.getTime())) {
    throw new RecoveryBackupError('INVALID_CLOCK', 'now provider returned an invalid Date.');
  }

  if (
    typeof projectId !== 'string' ||
    projectId.trim().length === 0 ||
    projectId.length > RECOVERY_INSPECTION_CEILINGS.MAX_IDENTIFIER_LENGTH
  ) {
    throw new RecoveryBackupError(
      'INVALID_PROJECT_ID',
      `Invalid projectId: must be a non-empty string with length <= ${RECOVERY_INSPECTION_CEILINGS.MAX_IDENTIFIER_LENGTH}.`
    );
  }

  if (!db.isOpen()) {
    try {
      await db.open();
    } catch (err) {
      throw new RecoveryBackupError(
        'TRANSIENT_STORAGE_FAILURE',
        `Database failed to open: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  if (signal?.aborted) {
    throw getAbortError(signal);
  }

  // 1. Snapshot all records in a single read-only transaction
  let projectRecord: StoredProject | undefined;
  let blobRecords: StoredLayerBlob[] = [];
  let excessiveStoredBlobs = false;
  let ledgerRecord: RecoveryRecord | undefined;

  try {
    await db.transaction('r', [db.projects, db.layerBlobs, db.recoveryRecords], async () => {
      projectRecord = await db.projects.get(projectId);
      if (signal?.aborted) return;

      // Count index entries without cloning payloads. The count and payload query
      // share this transaction, so a concurrent writer cannot change admission.
      const storedBlobs = db.layerBlobs
        .where('[projectId+id]')
        .between([projectId, Dexie.minKey], [projectId, Dexie.maxKey], true, true)
        .limit(RECOVERY_INSPECTION_CEILINGS.MAX_INSPECTABLE_STORED_BLOBS + 1);
      excessiveStoredBlobs =
        (await storedBlobs.count()) > RECOVERY_INSPECTION_CEILINGS.MAX_INSPECTABLE_STORED_BLOBS;
      if (signal?.aborted) return;
      if (!excessiveStoredBlobs) {
        blobRecords = await storedBlobs.toArray();
      }

      if (signal?.aborted) return;

      ledgerRecord = await db.recoveryRecords.get(projectId);
    });
  } catch (err) {
    if (signal?.aborted || (err instanceof DOMException && err.name === 'AbortError')) {
      throw getAbortError(signal);
    }
    throw new RecoveryBackupError(
      'TRANSIENT_STORAGE_FAILURE',
      `Failed to query IndexedDB tables: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  if (signal?.aborted) {
    throw getAbortError(signal);
  }

  // 2. Storage envelope validation
  if (!projectRecord) {
    throw new RecoveryBackupError('PROJECT_NOT_FOUND', `Project "${projectId}" not found in database.`);
  }

  // dataJson must be a string (empty string, whitespace, malformed JSON are accepted byte-for-byte)
  if (typeof projectRecord.dataJson !== 'string') {
    throw new RecoveryBackupError(
      'INVALID_DATA_JSON_STORAGE_TYPE',
      `Project "${projectId}" stored dataJson is not a string (received ${typeof projectRecord.dataJson}).`
    );
  }

  const storedDataJson: string = projectRecord.dataJson;

  if (excessiveStoredBlobs) {
    throw new RecoveryBackupError(
      'EXCESSIVE_STORED_BLOBS',
      `Project "${projectId}" exceeds maximum inspectable stored blobs (${RECOVERY_INSPECTION_CEILINGS.MAX_INSPECTABLE_STORED_BLOBS}).`
    );
  }

  // Validate every blob record
  const validatedBlobRecords: StoredLayerBlob[] = [];
  const seenRecordIds = new Set<number>();

  for (let i = 0; i < blobRecords.length; i++) {
    const rec = blobRecords[i];

    if (
      typeof rec.id !== 'number' ||
      !Number.isSafeInteger(rec.id) ||
      rec.id <= 0 ||
      seenRecordIds.has(rec.id)
    ) {
      throw new RecoveryBackupError(
        'CORRUPTED_STORED_BLOB_RECORD',
        `Corrupted layer blob primary key at index ${i}: must be a positive unique safe integer.`
      );
    }
    seenRecordIds.add(rec.id);

    if (rec.projectId !== projectId) {
      throw new RecoveryBackupError(
        'CORRUPTED_STORED_BLOB_RECORD',
        `Layer blob projectId mismatch: expected "${projectId}", found "${String(rec.projectId)}".`
      );
    }

    if (
      typeof rec.layerId !== 'string' ||
      rec.layerId.length === 0 ||
      rec.layerId.length > RECOVERY_INSPECTION_CEILINGS.MAX_IDENTIFIER_LENGTH
    ) {
      throw new RecoveryBackupError(
        'CORRUPTED_STORED_BLOB_RECORD',
        `Corrupted layerId in blob record id ${rec.id}: must be non-empty and within identifier length bound.`
      );
    }

    if (
      typeof rec.frameIndex !== 'number' ||
      !Number.isSafeInteger(rec.frameIndex) ||
      rec.frameIndex < 0
    ) {
      throw new RecoveryBackupError(
        'CORRUPTED_STORED_BLOB_RECORD',
        `Corrupted frameIndex in blob record id ${rec.id}: must be a non-negative safe integer.`
      );
    }

    if (!(rec.blob instanceof Blob)) {
      throw new RecoveryBackupError(
        'INVALID_BLOB_PAYLOAD',
        `Blob record id ${rec.id} payload is not a valid Blob instance.`
      );
    }

    if (
      typeof rec.blob.size !== 'number' ||
      !Number.isSafeInteger(rec.blob.size) ||
      rec.blob.size < 0 ||
      rec.blob.size > ZIP32_CONSTANTS.MAX_FILE_SIZE
    ) {
      throw new RecoveryBackupError(
        'CORRUPTED_STORED_BLOB_RECORD',
        `Blob record id ${rec.id} size (${rec.blob.size}) is invalid or exceeds ZIP32 limit.`
      );
    }

    validatedBlobRecords.push(rec);
  }

  // Sort blobs deterministically by primary key ascending
  validatedBlobRecords.sort((a, b) => (a.id as number) - (b.id as number));

  // Validate ledger record if present
  let validatedRecoveryManifest: RecoveryBackupManifestV1['recovery'] | undefined;
  if (ledgerRecord) {
    if (ledgerRecord.projectId !== projectId) {
      throw new RecoveryBackupError(
        'INVALID_RECOVERY_RECORD',
        `Ledger record projectId mismatch: expected "${projectId}", found "${String(ledgerRecord.projectId)}".`
      );
    }

    if (
      typeof ledgerRecord.classificationState !== 'string' ||
      !KNOWN_RECOVERY_LEDGER_STATES.has(ledgerRecord.classificationState)
    ) {
      throw new RecoveryBackupError(
        'INVALID_RECOVERY_RECORD',
        `Invalid ledger classification state: "${String(ledgerRecord.classificationState)}".`
      );
    }

    if (!Array.isArray(ledgerRecord.reasonCodes)) {
      throw new RecoveryBackupError(
        'INVALID_RECOVERY_RECORD',
        'Ledger record reasonCodes must be an array.'
      );
    }

    let sortedCodes: RecoveryReasonCode[];
    try {
      sortedCodes = sortReasonCodes(ledgerRecord.reasonCodes);
    } catch (err) {
      throw new RecoveryBackupError(
        'INVALID_RECOVERY_RECORD',
        `Failed to validate ledger reason codes: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    if (
      typeof ledgerRecord.firstDetectedAt !== 'number' ||
      !Number.isSafeInteger(ledgerRecord.firstDetectedAt) ||
      ledgerRecord.firstDetectedAt < 0 ||
      typeof ledgerRecord.lastConfirmedAt !== 'number' ||
      !Number.isSafeInteger(ledgerRecord.lastConfirmedAt) ||
      ledgerRecord.lastConfirmedAt < 0
    ) {
      throw new RecoveryBackupError(
        'INVALID_RECOVERY_RECORD',
        'Ledger record timestamps must be finite non-negative safe integers.'
      );
    }

    validatedRecoveryManifest = Object.freeze({
      projectId,
      classificationState: ledgerRecord.classificationState,
      firstDetectedAt: ledgerRecord.firstDetectedAt,
      lastConfirmedAt: ledgerRecord.lastConfirmedAt,
      reasonCodes: Object.freeze([...sortedCodes]),
    });
  }

  // 3. Assemble recovery manifest v1
  const projectDataJsonUtf8Bytes = getUtf8ByteLength(storedDataJson);

  const manifestBlobs: Array<RecoveryBackupManifestV1['blobs'][number]> = [];
  const preparedBlobDescriptors: PreparedBlobDescriptor[] = [];
  const blobHandles: Blob[] = [];

  for (let i = 0; i < validatedBlobRecords.length; i++) {
    const rec = validatedBlobRecords[i];
    const ordinal = i + 1;
    const ordinalStr = String(ordinal).padStart(6, '0');
    const archiveEntry = `layers/blob_${ordinalStr}.png`;

    // Normalize and bound MIME type
    let mimeType = 'image/png';
    if (typeof rec.blob.type === 'string' && rec.blob.type.trim().length > 0) {
      const trimmed = rec.blob.type.trim();
      if (trimmed.length <= RECOVERY_BACKUP_LIMITS.MAX_MIME_TYPE_LENGTH) {
        mimeType = trimmed;
      }
    }

    const manifestEntry = Object.freeze({
      ordinal,
      archiveEntry,
      recordId: rec.id as number,
      layerId: rec.layerId,
      frameIndex: rec.frameIndex,
      sizeBytes: rec.blob.size,
      mimeType,
    });
    manifestBlobs.push(manifestEntry);

    // Public descriptor strictly excludes the Blob handle
    const blobDesc: PreparedBlobDescriptor = Object.freeze({
      ordinal,
      archiveEntry,
      recordId: rec.id as number,
      layerId: rec.layerId,
      frameIndex: rec.frameIndex,
      sizeBytes: rec.blob.size,
      mimeType,
    });
    preparedBlobDescriptors.push(blobDesc);
    blobHandles.push(rec.blob);
  }

  const manifestObject: RecoveryBackupManifestV1 = Object.freeze({
    format: 'pixibun-recovery-backup',
    version: 1,
    createdAt: startDate.toISOString(),
    project: Object.freeze({
      projectId,
      projectEntry: 'project.json',
      originalDataJsonUtf8Bytes: projectDataJsonUtf8Bytes,
    }),
    blobs: Object.freeze(manifestBlobs),
    ...(validatedRecoveryManifest ? { recovery: validatedRecoveryManifest } : {}),
  });

  const manifestJson = JSON.stringify(manifestObject, null, 2);
  const manifestByteLength = getUtf8ByteLength(manifestJson);

  validateManifestByteLength(manifestByteLength);

  const manifestBytes = new TextEncoder().encode(manifestJson);

  // 4. Precompute exact archive size
  const entriesMeta: ZipEntryMeta[] = [
    { nameBytesLength: 12, size: projectDataJsonUtf8Bytes },       // "project.json"
    { nameBytesLength: 22, size: manifestBytes.length },           // "recovery-manifest.json"
  ];

  for (let i = 0; i < preparedBlobDescriptors.length; i++) {
    const name = preparedBlobDescriptors[i].archiveEntry;
    const nameBytes = validateZipPath(name);
    entriesMeta.push({ nameBytesLength: nameBytes.length, size: preparedBlobDescriptors[i].sizeBytes });
  }

  const estimatedArchiveBytes = calculateStoreOnlyZipSize(entriesMeta);

  // 5. Construct fresh stream factory closures inside frozen internal holder
  const internal: PreparedArchiveInternal = Object.freeze({
    projectId,
    dataJson: storedDataJson,
    manifestJson,
    manifestBytes,
    blobHandles: Object.freeze([...blobHandles]),
    estimatedArchiveBytes,
    entryCount: entriesMeta.length,
    blobCount: preparedBlobDescriptors.length,
    createEntries(): RecoveryZipEntry[] {
      const entries: RecoveryZipEntry[] = [];

      // 1. project.json: fresh streaming UTF-8
      entries.push({
        name: 'project.json',
        size: projectDataJsonUtf8Bytes,
        openStream(): ReadableStream<Uint8Array> {
          return createUtf8StringStream(storedDataJson);
        },
      });

      // 2. recovery-manifest.json: emit a fresh defensive byte copy on every openStream pass
      entries.push({
        name: 'recovery-manifest.json',
        size: manifestBytes.length,
        openStream(): ReadableStream<Uint8Array> {
          const defensiveCopy = manifestBytes.slice();
          return new ReadableStream<Uint8Array>({
            start(controller) {
              controller.enqueue(defensiveCopy);
              controller.close();
            },
          });
        },
      });

      // 3. Blobs: fresh stream calls using private Blob handles
      for (let i = 0; i < preparedBlobDescriptors.length; i++) {
        const desc = preparedBlobDescriptors[i];
        const blobRef = blobHandles[i];
        entries.push({
          name: desc.archiveEntry,
          size: desc.sizeBytes,
          openStream(): ReadableStream<Uint8Array> {
            if (typeof blobRef.stream === 'function') {
              return blobRef.stream();
            }
            // Fallback for environments lacking Blob.stream()
            return new ReadableStream<Uint8Array>({
              async start(controller) {
                const buf = await blobRef.arrayBuffer();
                controller.enqueue(new Uint8Array(buf));
                controller.close();
              },
            });
          },
        });
      }

      return entries;
    },
  });

  const prepared: PreparedRecoveryArchive = Object.freeze({
    projectId,
    createdAt: startDate.toISOString(),
    estimatedArchiveBytes,
    entryCount: entriesMeta.length,
    blobCount: preparedBlobDescriptors.length,
    manifest: manifestObject,
    dataJsonBytesLength: projectDataJsonUtf8Bytes,
    blobEntries: Object.freeze(preparedBlobDescriptors),
  });

  trustedPreparedArchives.add(prepared);
  preparedArchiveInternals.set(prepared, internal);

  return prepared;
}

// -----------------------------------------------------------------------------
// Generic Archive Writer
// -----------------------------------------------------------------------------

/**
 * Writes a prepared recovery archive to a caller-owned stream sink.
 * Verifies written bytes against the preflight estimate.
 * Never closes or aborts the sink.
 */
export async function writePreparedRecoveryArchive(
  prepared: PreparedRecoveryArchive,
  sink: RecoveryZipSink,
  options?: RecoveryBackupWriteOptions
): Promise<RecoveryBackupWriteResult> {
  const internal = getInternal(prepared);

  const signal = options?.signal;
  if (signal?.aborted) {
    throw getAbortError(signal, 'Recovery archive writing was cancelled before start.');
  }

  // Create fresh stream entries for this write pass
  const entries = internal.createEntries();

  const zipResult = await writeStoreOnlyZip(entries, sink, { signal });

  if (zipResult.totalBytesWritten !== internal.estimatedArchiveBytes) {
    throw new RecoveryBackupError(
      'CALCULATED_SIZE_MISMATCH',
      `Written archive bytes (${zipResult.totalBytesWritten}) did not match prepared estimate (${internal.estimatedArchiveBytes}).`
    );
  }

  return {
    totalBytesWritten: zipResult.totalBytesWritten,
    entryCount: zipResult.entryCount,
    blobCount: internal.blobCount,
  };
}
