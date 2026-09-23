/**
 * recoveryBackupTransport.ts
 *
 * Safe Export Destination Adapters for PixiBun Atelier Recovery Archives.
 *
 * Adapters:
 * 1. FileSystemFileHandle streaming writer with single-close and non-masking abort lifecycle.
 * 2. Bounded in-memory Blob fallback with 250 MB preflight rejection and defensive chunk copying.
 *
 * Guaranteed Properties:
 * - Runtime trust verification via assertTrustedPreparedArchive (rejects forged/untrusted archives).
 * - Never calls showSaveFilePicker, anchor downloads, or URL.createObjectURL.
 * - Single-access runtime validation and binding of destination sink methods.
 * - Complete post-open lifecycle protection: every post-open failure best-effort aborts without masking primary errors.
 * - Releases memory buffers and chunk references on cancellation and failure paths.
 */

import { RECOVERY_BACKUP_LIMITS } from './recoveryLimits';
import {
  type PreparedRecoveryArchive,
  type RecoveryBackupWriteResult,
  RecoveryBackupError,
} from './recoveryTypes';
import {
  assertTrustedPreparedArchive,
  writePreparedRecoveryArchive,
  type RecoveryBackupWriteOptions,
} from './recoveryBackup';
import type { RecoveryZipSink } from './zipWriter';

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
 * Pure policy validator for fallback in-memory Blob archive size.
 * Rejects if archive bytes exceed MAX_FALLBACK_BLOB_BYTES (250 MB).
 */
export function validateFallbackBlobArchiveSize(estimatedArchiveBytes: number): void {
  if (
    typeof estimatedArchiveBytes !== 'number' ||
    !Number.isSafeInteger(estimatedArchiveBytes) ||
    estimatedArchiveBytes < 0
  ) {
    throw new TypeError('Invalid estimatedArchiveBytes: must be a non-negative safe integer.');
  }
  if (estimatedArchiveBytes > RECOVERY_BACKUP_LIMITS.MAX_FALLBACK_BLOB_BYTES) {
    throw new RecoveryBackupError(
      'BLOB_FALLBACK_CEILING_EXCEEDED',
      `Prepared archive size (${estimatedArchiveBytes} bytes) exceeds maximum in-memory Blob fallback ceiling (${RECOVERY_BACKUP_LIMITS.MAX_FALLBACK_BLOB_BYTES} bytes).`
    );
  }
}

/**
 * Streams a prepared recovery archive directly to a FileSystemFileHandle.
 *
 * Lifecycle guarantees:
 * - Does not call createWritable if signal is already aborted or if prepared archive is untrusted.
 * - Binds createWritable, write, close, and optional abort methods exactly once.
 * - Once createWritable resolves, any subsequent failure (invalid methods, streaming error, cancellation,
 *   or close error) preserves the primary error and best-effort aborts the opened writable when abort is callable.
 * - Never calls close() after a failed write or failed method validation.
 * - Calls close() exactly once only after complete success.
 * - Secondary abort exceptions never mask the primary error.
 * - Does not buffer archive payloads in memory.
 */
export async function writeRecoveryArchiveToFileHandle(
  prepared: PreparedRecoveryArchive,
  fileHandle: FileSystemFileHandle,
  options?: RecoveryBackupWriteOptions
): Promise<RecoveryBackupWriteResult> {
  // 1. Runtime-verify trusted prepared archive before touching fileHandle
  assertTrustedPreparedArchive(prepared);

  const signal = options?.signal;
  if (signal?.aborted) {
    throw getAbortError(signal, 'File handle export was cancelled before start.');
  }

  // 2. Runtime-validate and bind createWritable exactly once
  if (!fileHandle || typeof fileHandle !== 'object') {
    throw new TypeError('fileHandle must be an object.');
  }
  const createWritableMethod = (fileHandle as { createWritable?: unknown }).createWritable;
  if (typeof createWritableMethod !== 'function') {
    throw new TypeError('fileHandle must provide a createWritable() method.');
  }
  const createWritable = createWritableMethod.bind(fileHandle);

  if (signal?.aborted) {
    throw getAbortError(signal);
  }

  // 3. Open writable file stream
  const writable = await createWritable();

  // 4. Capture abort method immediately for post-open lifecycle protection
  let abortFn: ((reason?: unknown) => Promise<void>) | undefined = undefined;
  if (writable && typeof writable === 'object') {
    const rawAbort = (writable as { abort?: unknown }).abort;
    if (typeof rawAbort === 'function') {
      abortFn = rawAbort.bind(writable);
    }
  }

  const bestEffortAbort = async (primaryError: unknown): Promise<void> => {
    if (abortFn) {
      try {
        await abortFn(primaryError);
      } catch {
        // Never mask primary error
      }
    }
  };

  // 5. Runtime-validate and bind writable stream methods under protected lifecycle
  let writeFn: (chunk: Uint8Array) => Promise<void>;
  let closeFn: () => Promise<void>;

  try {
    if (!writable || typeof writable !== 'object') {
      throw new TypeError('createWritable() must return a writable stream object.');
    }

    const rawWrite = (writable as { write?: unknown }).write;
    if (typeof rawWrite !== 'function') {
      throw new TypeError('Writable stream must provide a write(chunk: Uint8Array) method.');
    }
    writeFn = rawWrite.bind(writable);

    const rawClose = (writable as { close?: unknown }).close;
    if (typeof rawClose !== 'function') {
      throw new TypeError('Writable stream must provide a close() method.');
    }
    closeFn = rawClose.bind(writable);
  } catch (validationErr) {
    await bestEffortAbort(validationErr);
    throw validationErr;
  }

  // 6. Stream directly to file destination
  const sink: RecoveryZipSink = {
    async write(chunk: Uint8Array): Promise<void> {
      await writeFn(chunk);
    },
  };

  let writeResult: RecoveryBackupWriteResult;
  try {
    writeResult = await writePreparedRecoveryArchive(prepared, sink, options);
  } catch (writeErr) {
    await bestEffortAbort(writeErr);
    throw writeErr;
  }

  // 7. Close exactly once on complete success
  try {
    await closeFn();
  } catch (closeErr) {
    await bestEffortAbort(closeErr);
    throw closeErr;
  }

  return writeResult;
}

/**
 * Creates an in-memory application/zip Blob from a prepared recovery archive.
 *
 * Guarantees:
 * - Preflight ceiling: rejects before collecting any chunks if estimated size exceeds 250 MB.
 * - Defensive copying: chunk.slice() protects against upstream buffer mutation.
 * - Checked cumulative byte accounting during every write.
 * - Memory release: releases all accumulated chunk references on error or cancellation.
 * - Verifies total accumulated bytes and resulting Blob size strictly equal the preflight estimate.
 * - Never creates <a> elements, object URLs, or initiates browser downloads.
 */
export async function createRecoveryArchiveBlob(
  prepared: PreparedRecoveryArchive,
  options?: RecoveryBackupWriteOptions
): Promise<Blob> {
  // 1. Runtime-verify trusted prepared archive
  assertTrustedPreparedArchive(prepared);

  const signal = options?.signal;
  if (signal?.aborted) {
    throw getAbortError(signal, 'Blob archive creation was cancelled before start.');
  }

  // 2. Preflight fallback ceiling check before allocating or streaming anything
  validateFallbackBlobArchiveSize(prepared.estimatedArchiveBytes);

  // 3. Accumulate with defensive chunk copies and checked byte accounting
  const chunks: Uint8Array[] = [];
  let cumulativeBytes = 0;
  const expectedBytes = prepared.estimatedArchiveBytes;

  const sink: RecoveryZipSink = {
    async write(chunk: Uint8Array): Promise<void> {
      if (signal?.aborted) {
        throw getAbortError(signal);
      }
      if (!(chunk instanceof Uint8Array)) {
        throw new TypeError('Archive sink received a non-Uint8Array chunk.');
      }

      cumulativeBytes += chunk.length;
      if (cumulativeBytes > expectedBytes) {
        throw new RecoveryBackupError(
          'CALCULATED_SIZE_MISMATCH',
          `Accumulated chunk bytes (${cumulativeBytes}) exceeded preflight archive estimate (${expectedBytes}).`
        );
      }
      if (cumulativeBytes > RECOVERY_BACKUP_LIMITS.MAX_FALLBACK_BLOB_BYTES) {
        throw new RecoveryBackupError(
          'BLOB_FALLBACK_CEILING_EXCEEDED',
          `Accumulated bytes (${cumulativeBytes}) exceeded fallback blob ceiling.`
        );
      }

      // Defensive copy: chunk.slice() protects against upstream buffer reuse/mutation
      chunks.push(chunk.slice());
    },
  };

  try {
    const writeResult = await writePreparedRecoveryArchive(prepared, sink, options);

    if (cumulativeBytes !== expectedBytes) {
      throw new RecoveryBackupError(
        'CALCULATED_SIZE_MISMATCH',
        `Accumulated fallback bytes (${cumulativeBytes}) did not match prepared estimate (${expectedBytes}).`
      );
    }

    if (writeResult.totalBytesWritten !== expectedBytes) {
      throw new RecoveryBackupError(
        'CALCULATED_SIZE_MISMATCH',
        `ZIP writer reported bytes (${writeResult.totalBytesWritten}) did not match prepared estimate (${expectedBytes}).`
      );
    }

    const blob = new Blob(chunks as BlobPart[], { type: 'application/zip' });

    if (blob.size !== expectedBytes) {
      throw new RecoveryBackupError(
        'CALCULATED_SIZE_MISMATCH',
        `Resulting Blob size (${blob.size}) did not match prepared estimate (${expectedBytes}).`
      );
    }

    // Release chunk references after constructing the Blob
    chunks.length = 0;

    return blob;
  } catch (err) {
    // Release retained references on all failures
    chunks.length = 0;
    throw err;
  }
}
