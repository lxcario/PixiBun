/**
 * recoveryLedger.ts
 *
 * Persistence Ledger for Restricted Recovery Mode Assessments.
 *
 * Manages write-isolated records in db.recoveryRecords.
 * Never modifies original project metadata or layer blobs.
 */

import { db, type RecoveryRecord } from '@/lib/storage/db';
import {
  type DeterministicRecoveryAssessment,
  CANONICAL_REASON_CODE_ORDER,
  sortReasonCodes,
} from './recoveryTypes';
import { RECOVERY_INSPECTION_CEILINGS } from './recoveryLimits';

const PERSISTABLE_RECOVERY_STATES = new Set([
  'recoverable-envelope-exceeded',
  'recoverable-blob-invalid',
  'malformed',
  'unsupported-version',
  'unsafe-content',
]);

function isPlainObject(val: unknown): val is Record<string, unknown> {
  return (
    typeof val === 'object' &&
    val !== null &&
    !Array.isArray(val) &&
    Object.prototype.toString.call(val) === '[object Object]'
  );
}

/**
 * Persists a deterministic recovery assessment into the IndexedDB recovery ledger.
 *
 * Guaranteed Properties:
 * 1. Strictly validates inputs at runtime; throws TypeError on malformed/forged payloads.
 * 2. Verifies the referenced project exists inside the transaction; aborts with an Error if deleted (no orphan records).
 * 3. Only persists deterministic failure/recovery states; throws on transient or valid results.
 * 4. Preserves firstDetectedAt on repeat assessments; updates lastConfirmedAt.
 * 5. Never alters projects or layerBlobs tables.
 * 6. Stores only bounded, deduplicated enum reason codes (zero raw error strings).
 */
export interface RecordRecoveryAssessmentOptions {
  currentSourceFingerprint?: string;
}

export function validateResolutionMetadata(record: Partial<RecoveryRecord>): void {
  if (record.resolvedAt !== undefined) {
    if (
      typeof record.resolvedAt !== 'number' ||
      !Number.isSafeInteger(record.resolvedAt) ||
      record.resolvedAt <= 0
    ) {
      throw new TypeError('Invalid recovery record: resolvedAt must be a positive safe integer.');
    }
  }
  if (record.recoveredProjectId !== undefined) {
    if (
      typeof record.recoveredProjectId !== 'string' ||
      record.recoveredProjectId.trim().length === 0 ||
      record.recoveredProjectId.length > RECOVERY_INSPECTION_CEILINGS.MAX_IDENTIFIER_LENGTH ||
      !/^[a-zA-Z0-9_-]+$/.test(record.recoveredProjectId)
    ) {
      throw new TypeError(
        `Invalid recovery record: recoveredProjectId must be a non-empty string <= ${RECOVERY_INSPECTION_CEILINGS.MAX_IDENTIFIER_LENGTH} characters matching allowed format.`
      );
    }
  }
  if (record.resolvedSourceFingerprint !== undefined) {
    if (
      typeof record.resolvedSourceFingerprint !== 'string' ||
      !/^[0-9a-f]{64}$/.test(record.resolvedSourceFingerprint)
    ) {
      throw new TypeError(
        'Invalid recovery record: resolvedSourceFingerprint must be a 64-character lowercase hex string.'
      );
    }
  }
}

/**
 * Persists a deterministic recovery assessment into the IndexedDB recovery ledger.
 *
 * Guaranteed Properties:
 * 1. Strictly validates inputs at runtime; throws TypeError on malformed/forged payloads.
 * 2. Verifies the referenced project exists inside the transaction; aborts with an Error if deleted (no orphan records).
 * 3. Only persists deterministic failure/recovery states; throws on transient or valid results.
 * 4. Preserves firstDetectedAt on repeat assessments; updates lastConfirmedAt.
 * 5. Preserves resolution metadata only if currentSourceFingerprint matches existing.resolvedSourceFingerprint.
 * 6. Never alters projects or layerBlobs tables.
 * 7. Stores only bounded, deduplicated enum reason codes (zero raw error strings).
 */
export async function recordRecoveryAssessment(
  assessment: DeterministicRecoveryAssessment,
  options?: RecordRecoveryAssessmentOptions
): Promise<void> {
  if (!isPlainObject(assessment)) {
    throw new TypeError('Invalid assessment: must be a plain object.');
  }

  if (
    typeof assessment.projectId !== 'string' ||
    assessment.projectId.trim().length === 0 ||
    assessment.projectId.length > RECOVERY_INSPECTION_CEILINGS.MAX_IDENTIFIER_LENGTH
  ) {
    throw new TypeError(
      `Invalid assessment: projectId must be a non-empty string with length <= ${RECOVERY_INSPECTION_CEILINGS.MAX_IDENTIFIER_LENGTH}.`
    );
  }

  if (
    typeof assessment.status !== 'string' ||
    !PERSISTABLE_RECOVERY_STATES.has(assessment.status)
  ) {
    throw new TypeError(
      `Cannot record recovery assessment with non-persistable status "${String(
        (assessment as { status?: unknown }).status
      )}".`
    );
  }

  if (!Array.isArray(assessment.reasonCodes)) {
    throw new TypeError('Invalid assessment: reasonCodes must be an array.');
  }

  if (
    assessment.reasonCodes.length >
    RECOVERY_INSPECTION_CEILINGS.MAX_LEDGER_INPUT_REASON_CODES
  ) {
    throw new TypeError(
      `Invalid assessment: reasonCodes length (${assessment.reasonCodes.length}) exceeds maximum allowed input bound (${RECOVERY_INSPECTION_CEILINGS.MAX_LEDGER_INPUT_REASON_CODES}).`
    );
  }

  const boundedCodes = sortReasonCodes(assessment.reasonCodes);
  if (boundedCodes.length === 0) {
    throw new TypeError(
      'Invalid assessment: normalized reasonCodes must be non-empty for failure/recovery states.'
    );
  }

  if (boundedCodes.length > CANONICAL_REASON_CODE_ORDER.length) {
    throw new TypeError(
      'Invalid assessment: normalized reasonCodes exceed canonical known code count.'
    );
  }

  if (!db.isOpen()) {
    await db.open();
  }

  const now = Date.now();

  await db.transaction('rw', [db.recoveryRecords, db.projects], async () => {
    // Verify referenced project exists before writing ledger record to prevent orphaned records
    const project = await db.projects.get(assessment.projectId);
    if (!project) {
      throw new Error(
        `Project "${assessment.projectId}" not found; cannot record recovery record for non-existent project.`
      );
    }

    const existing = await db.recoveryRecords.get(assessment.projectId);
    if (existing) {
      validateResolutionMetadata(existing);
    }

    const firstDetectedAt = existing?.firstDetectedAt ?? now;

    let resolvedAt: number | undefined = undefined;
    let recoveredProjectId: string | undefined = undefined;
    let resolvedSourceFingerprint: string | undefined = undefined;

    if (
      existing?.resolvedSourceFingerprint &&
      typeof options?.currentSourceFingerprint === 'string' &&
      options.currentSourceFingerprint === existing.resolvedSourceFingerprint
    ) {
      resolvedAt = existing.resolvedAt;
      recoveredProjectId = existing.recoveredProjectId;
      resolvedSourceFingerprint = existing.resolvedSourceFingerprint;
    }

    const record: RecoveryRecord = {
      projectId: assessment.projectId,
      classificationState: assessment.status,
      firstDetectedAt,
      lastConfirmedAt: now,
      reasonCodes: boundedCodes,
      ...(resolvedAt !== undefined ? { resolvedAt } : {}),
      ...(recoveredProjectId !== undefined ? { recoveredProjectId } : {}),
      ...(resolvedSourceFingerprint !== undefined ? { resolvedSourceFingerprint } : {}),
    };

    await db.recoveryRecords.put(record);
  });
}

/**
 * Reads a recovery record from IndexedDB by project identifier.
 */
export async function getRecoveryRecord(
  projectId: string
): Promise<RecoveryRecord | undefined> {
  if (
    typeof projectId !== 'string' ||
    projectId.trim().length === 0 ||
    projectId.length > RECOVERY_INSPECTION_CEILINGS.MAX_IDENTIFIER_LENGTH
  ) {
    throw new TypeError('Invalid projectId: must be a non-empty string within bound.');
  }

  if (!db.isOpen()) {
    await db.open();
  }
  const record = await db.recoveryRecords.get(projectId);
  if (record) {
    validateResolutionMetadata(record);
  }
  return record;
}

/**
 * Deletes a recovery record from IndexedDB by project identifier.
 */
export async function deleteRecoveryRecord(
  projectId: string
): Promise<void> {
  if (
    typeof projectId !== 'string' ||
    projectId.trim().length === 0 ||
    projectId.length > RECOVERY_INSPECTION_CEILINGS.MAX_IDENTIFIER_LENGTH
  ) {
    throw new TypeError('Invalid projectId: must be a non-empty string within bound.');
  }

  if (!db.isOpen()) {
    await db.open();
  }
  await db.recoveryRecords.delete(projectId);
}
