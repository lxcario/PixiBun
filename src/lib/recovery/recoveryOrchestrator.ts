/**
 * recoveryOrchestrator.ts
 *
 * Trusted Recovery Orchestration and Atomic Persistence Engine for PixiBun Atelier.
 *
 * Coordinates authoritative snapshot acquisition, pure diagnosis, deterministic
 * recovery planning, cryptographic fingerprint verification, module-private token
 * issuance, and atomic persistence across projects, layerBlobs, and recoveryRecords.
 *
 * Guarantees:
 * 1. Single authoritative bounded IndexedDB snapshot per planning attempt.
 * 2. Separate source-content and commit-preimage SHA-256 fingerprints.
 * 3. Module-private non-forgeable tokens with strict state machine (prepared -> committing -> consumed).
 * 4. Exact in-transaction source snapshot revalidation using Dexie.waitFor() keepalive.
 * 5. Three-table destination collision check (projects, layerBlobs, recoveryRecords).
 * 6. Atomic multi-table write transaction with complete rollback on any failure.
 * 7. Non-destructive: original damaged project, blobs, and ledger row remain untouched.
 */

import Dexie from 'dexie';
import {
  db,
  type StoredProject,
  type StoredLayerBlob,
  type RecoveryRecord,
} from '@/lib/storage/db';
import {
  type ProjectFile,
} from '@/types/project';
import { validateProjectFile } from '@/lib/project/schema';
import { RECOVERY_INSPECTION_CEILINGS } from './recoveryLimits';
import {
  type StoredProjectSnapshot,
  type TrustedRecoveryPlanToken,
  type RecoveryOrchestratorPrepareOptions,
  type RecoveryOrchestratorPrepareResult,
  type RecoveryPersistenceCommitOptions,
  type RecoveryPersistenceCommitResult,
  type CandidateRecoveryPlan,
  type CandidateBlobRemapEntry,
  type RecoveryPlanBuilderDecisions,
  type RecoveryReasonCode,
  RecoveryAbortError,
  StaleSnapshotError,
  DestinationCollisionError,
  ResourceCeilingError,
  RecoveryCommitError,
} from './recoveryTypes';
import {
  acquireStoredProjectSnapshot,
  assessStoredSnapshot,
} from './recoveryDiagnosis';
import { buildRecoveryPlan } from './recoveryPlanBuilder';

// ============================================================================
// Canonical Constants and Domain Separators
// ============================================================================

const DOMAIN_SEPARATORS = {
  SNAPSHOT_ENVELOPE: 'PIXIBUN_RECOVERY_SNAPSHOT_V1\0', // 29 bytes
  PROJECT: 'PIXIBUN_PROJECT_V1\0', // 19 bytes
  BLOBS: 'PIXIBUN_BLOBS_V1\0', // 17 bytes
  SOURCE_CONTENT: 'PIXIBUN_SOURCE_CONTENT_V1\0', // 26 bytes
  LEDGER: 'PIXIBUN_LEDGER_V1\0', // 18 bytes
  COMMIT_PREIMAGE: 'PIXIBUN_COMMIT_PREIMAGE_V1\0', // 27 bytes
} as const;

const STORED_PROJECT_RECOGNIZED_KEYS = new Set([
  'id',
  'name',
  'width',
  'height',
  'fps',
  'createdAt',
  'updatedAt',
  'thumbnailDataUrl',
  'dataJson',
]);

const STORED_BLOB_RECOGNIZED_KEYS = new Set([
  'id',
  'projectId',
  'layerId',
  'frameIndex',
  'blob',
  'updatedAt',
]);

const RECOVERY_RECORD_RECOGNIZED_KEYS = new Set([
  'projectId',
  'classificationState',
  'firstDetectedAt',
  'lastConfirmedAt',
  'reasonCodes',
  'resolvedAt',
  'recoveredProjectId',
  'resolvedSourceFingerprint',
]);

const LONE_SURROGATE_REGEX =
  /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;

// ============================================================================
// Normalized Record Validation and Encoding Helpers
// ============================================================================

export function assertNoLoneSurrogates(str: string, fieldName: string): void {
  if (LONE_SURROGATE_REGEX.test(str)) {
    throw new TypeError(`Field "${fieldName}" contains invalid UTF-16 with lone surrogates.`);
  }
}

export function assertClosedRecordShape(
  record: object,
  allowedKeys: Set<string>,
  recordType: string
): void {
  const ownKeys = Object.keys(record);
  for (const key of ownKeys) {
    if (!allowedKeys.has(key)) {
      throw new TypeError(
        `Unexpected own property "${key}" on ${recordType} record; rejected by closed schema policy.`
      );
    }
  }
}

export function bufferToHex(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex.toLowerCase();
}

export async function sha256DigestHex(data: Uint8Array): Promise<string> {
  const buf = new Uint8Array(data.byteLength);
  buf.set(data);
  const digest = await crypto.subtle.digest('SHA-256', buf.buffer);
  return bufferToHex(digest);
}

/**
 * Encodes a string as length-prefixed UTF-8 bytes (uint32 big-endian length).
 */
function encodeLengthPrefixedString(str: string, fieldName: string): Uint8Array {
  assertNoLoneSurrogates(str, fieldName);
  const textBytes = new TextEncoder().encode(str);
  const out = new Uint8Array(4 + textBytes.length);
  new DataView(out.buffer).setUint32(0, textBytes.length, false);
  out.set(textBytes, 4);
  return out;
}

/**
 * Formats a recovered project title keeping it strictly <= 256 code units,
 * deduplicating leading [Recovered] prefixes, and preserving surrogate pair boundaries.
 */
export function formatRecoveredTitle(originalName: string): string {
  const PREFIX = '[Recovered] '; // 12 UTF-16 code units
  const MAX_TITLE_LENGTH = RECOVERY_INSPECTION_CEILINGS.MAX_PROJECT_NAME_LENGTH; // 256
  const MAX_BASE_LENGTH = MAX_TITLE_LENGTH - PREFIX.length; // 244

  const clean = originalName.replace(/^(\[Recovered\]\s*)+/i, '').trim() || 'Untitled';

  let base = clean;
  if (base.length > MAX_BASE_LENGTH) {
    base = base.slice(0, MAX_BASE_LENGTH);
    // If truncation split a surrogate pair, drop the trailing high surrogate
    const lastCode = base.charCodeAt(base.length - 1);
    if (lastCode >= 0xd800 && lastCode <= 0xdbff) {
      base = base.slice(0, -1);
    }
    base = base.trim() || 'Untitled';
  }

  return `${PREFIX}${base}`;
}

// ============================================================================
// Cryptographic Binary Preimage Builders
// ============================================================================

export function buildProjectBinary(project: StoredProject): Uint8Array {
  assertClosedRecordShape(project, STORED_PROJECT_RECOGNIZED_KEYS, 'StoredProject');

  const domainBytes = new TextEncoder().encode(DOMAIN_SEPARATORS.PROJECT);
  const idBytes = encodeLengthPrefixedString(project.id, 'project.id');
  const nameBytes = encodeLengthPrefixedString(project.name, 'project.name');
  const dataJsonBytes = encodeLengthPrefixedString(project.dataJson, 'project.dataJson');

  let thumbBytes: Uint8Array;
  if (project.thumbnailDataUrl === undefined) {
    thumbBytes = new Uint8Array([0x00]);
  } else if (typeof project.thumbnailDataUrl === 'string') {
    const encoded = encodeLengthPrefixedString(project.thumbnailDataUrl, 'project.thumbnailDataUrl');
    thumbBytes = new Uint8Array(1 + encoded.length);
    thumbBytes[0] = 0x02;
    thumbBytes.set(encoded, 1);
  } else {
    throw new TypeError('Invalid thumbnailDataUrl: must be undefined or a valid string.');
  }

  // 19 (domain) + 1 (presence 0x01) + id + name + 4 (w) + 4 (h) + 4 (fps) + 8 (created) + 8 (updated) + thumb + dataJson
  const fixedSize = domainBytes.length + 1 + 4 + 4 + 4 + 8 + 8;
  const totalLength = fixedSize + idBytes.length + nameBytes.length + thumbBytes.length + dataJsonBytes.length;
  const out = new Uint8Array(totalLength);
  const view = new DataView(out.buffer);

  let offset = 0;
  out.set(domainBytes, offset);
  offset += domainBytes.length;

  out[offset++] = 0x01; // presence

  out.set(idBytes, offset);
  offset += idBytes.length;

  out.set(nameBytes, offset);
  offset += nameBytes.length;

  view.setInt32(offset, project.width, false);
  offset += 4;
  view.setInt32(offset, project.height, false);
  offset += 4;
  view.setInt32(offset, project.fps, false);
  offset += 4;

  view.setFloat64(offset, project.createdAt, false);
  offset += 8;
  view.setFloat64(offset, project.updatedAt, false);
  offset += 8;

  out.set(thumbBytes, offset);
  offset += thumbBytes.length;

  out.set(dataJsonBytes, offset);
  offset += dataJsonBytes.length;

  return out;
}

export function buildBlobsBinary(
  sourceBlobs: readonly StoredLayerBlob[],
  digests: Map<number, Uint8Array>
): Uint8Array {
  const domainBytes = new TextEncoder().encode(DOMAIN_SEPARATORS.BLOBS);
  const chunks: Uint8Array[] = [domainBytes];
  let totalLength = domainBytes.length + 4; // count uint32

  const countBuffer = new Uint8Array(4);
  new DataView(countBuffer.buffer).setUint32(0, sourceBlobs.length, false);
  chunks.push(countBuffer);

  for (const blobRec of sourceBlobs) {
    assertClosedRecordShape(blobRec, STORED_BLOB_RECOGNIZED_KEYS, 'StoredLayerBlob');

    if (
      typeof blobRec.id !== 'number' ||
      !Number.isSafeInteger(blobRec.id) ||
      blobRec.id <= 0
    ) {
      throw new TypeError(`Corrupted blob record id: ${String(blobRec.id)}`);
    }

    const digest = digests.get(blobRec.id);
    if (!digest || digest.length !== 32) {
      throw new Error(`Missing or invalid SHA-256 digest for blob record id ${blobRec.id}`);
    }

    const projectIdBytes = encodeLengthPrefixedString(blobRec.projectId, 'blob.projectId');
    const layerIdBytes = encodeLengthPrefixedString(blobRec.layerId, 'blob.layerId');
    const mimeBytes = encodeLengthPrefixedString(blobRec.blob.type, 'blob.type');

    // 8 (id uint64) + projectId + layerId + 4 (frameIndex int32) + 8 (updatedAt float64) + mime + 8 (size uint64) + 32 (digest)
    const fixedPart = new Uint8Array(8 + 4 + 8 + 8 + 32);
    const view = new DataView(fixedPart.buffer);
    view.setBigUint64(0, BigInt(blobRec.id), false);
    view.setInt32(8, blobRec.frameIndex, false);
    view.setFloat64(12, blobRec.updatedAt, false);
    view.setBigUint64(20, BigInt(blobRec.blob.size), false);
    fixedPart.set(digest, 28);

    chunks.push(projectIdBytes, layerIdBytes, mimeBytes, fixedPart);
    totalLength += projectIdBytes.length + layerIdBytes.length + mimeBytes.length + fixedPart.length;
  }

  const out = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

export function buildSourceContentBinary(
  projectFingerprint: string,
  blobsFingerprint: string
): Uint8Array {
  const domainBytes = new TextEncoder().encode(DOMAIN_SEPARATORS.SOURCE_CONTENT);
  const projBytes = new TextEncoder().encode(projectFingerprint);
  const blobBytes = new TextEncoder().encode(blobsFingerprint);

  const out = new Uint8Array(domainBytes.length + projBytes.length + blobBytes.length);
  let offset = 0;
  out.set(domainBytes, offset);
  offset += domainBytes.length;
  out.set(projBytes, offset);
  offset += projBytes.length;
  out.set(blobBytes, offset);
  return out;
}

export function buildLedgerBinary(ledger: RecoveryRecord | undefined): Uint8Array {
  const domainBytes = new TextEncoder().encode(DOMAIN_SEPARATORS.LEDGER);
  if (!ledger) {
    const out = new Uint8Array(domainBytes.length + 1);
    out.set(domainBytes, 0);
    out[domainBytes.length] = 0x00; // absent
    return out;
  }

  assertClosedRecordShape(ledger, RECOVERY_RECORD_RECOGNIZED_KEYS, 'RecoveryRecord');

  const chunks: Uint8Array[] = [domainBytes, new Uint8Array([0x01])]; // presence
  let totalLength = domainBytes.length + 1;

  const projectIdBytes = encodeLengthPrefixedString(ledger.projectId, 'ledger.projectId');
  const classStateBytes = encodeLengthPrefixedString(
    ledger.classificationState,
    'ledger.classificationState'
  );

  const fixedPart = new Uint8Array(16);
  const view = new DataView(fixedPart.buffer);
  view.setFloat64(0, ledger.firstDetectedAt, false);
  view.setFloat64(8, ledger.lastConfirmedAt, false);

  chunks.push(projectIdBytes, classStateBytes, fixedPart);
  totalLength += projectIdBytes.length + classStateBytes.length + fixedPart.length;

  // Reason codes in exact captured indexed order
  const countBuffer = new Uint8Array(4);
  new DataView(countBuffer.buffer).setUint32(0, ledger.reasonCodes.length, false);
  chunks.push(countBuffer);
  totalLength += 4;

  for (const code of ledger.reasonCodes) {
    const codeBytes = encodeLengthPrefixedString(code, 'ledger.reasonCode');
    chunks.push(codeBytes);
    totalLength += codeBytes.length;
  }

  // Optional resolution metadata
  if (ledger.resolvedAt !== undefined) {
    const resAtBuf = new Uint8Array(9);
    resAtBuf[0] = 0x01;
    new DataView(resAtBuf.buffer).setFloat64(1, ledger.resolvedAt, false);
    chunks.push(resAtBuf);
    totalLength += 9;
  } else {
    chunks.push(new Uint8Array([0x00]));
    totalLength += 1;
  }

  if (ledger.recoveredProjectId !== undefined) {
    const recIdBytes = encodeLengthPrefixedString(
      ledger.recoveredProjectId,
      'ledger.recoveredProjectId'
    );
    const recIdBuf = new Uint8Array(1 + recIdBytes.length);
    recIdBuf[0] = 0x01;
    recIdBuf.set(recIdBytes, 1);
    chunks.push(recIdBuf);
    totalLength += recIdBuf.length;
  } else {
    chunks.push(new Uint8Array([0x00]));
    totalLength += 1;
  }

  if (ledger.resolvedSourceFingerprint !== undefined) {
    const fpBytes = encodeLengthPrefixedString(
      ledger.resolvedSourceFingerprint,
      'ledger.resolvedSourceFingerprint'
    );
    const fpBuf = new Uint8Array(1 + fpBytes.length);
    fpBuf[0] = 0x01;
    fpBuf.set(fpBytes, 1);
    chunks.push(fpBuf);
    totalLength += fpBuf.length;
  } else {
    chunks.push(new Uint8Array([0x00]));
    totalLength += 1;
  }

  const out = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

export function buildCommitPreimageBinary(
  resolvedSourceFingerprint: string,
  ledgerPreimageFingerprint: string
): Uint8Array {
  const domainBytes = new TextEncoder().encode(DOMAIN_SEPARATORS.COMMIT_PREIMAGE);
  const srcBytes = new TextEncoder().encode(resolvedSourceFingerprint);
  const ledBytes = new TextEncoder().encode(ledgerPreimageFingerprint);

  const out = new Uint8Array(domainBytes.length + srcBytes.length + ledBytes.length);
  let offset = 0;
  out.set(domainBytes, offset);
  offset += domainBytes.length;
  out.set(srcBytes, offset);
  offset += srcBytes.length;
  out.set(ledBytes, offset);
  return out;
}

// ============================================================================
// Combined Kept-Alive Blob Digesting Operation
// ============================================================================

export async function digestBlobInTransaction(
  blob: Blob,
  signal: AbortSignal | undefined,
  timeoutMs: number
): Promise<Uint8Array> {
  if (signal?.aborted) {
    throw new RecoveryAbortError('Recovery operation cancelled before blob digest.');
  }

  let removeAbortListener = () => {};

  const abortPromise = new Promise<never>((_, reject) => {
    if (!signal) return;
    const onAbort = () => reject(new RecoveryAbortError('Recovery operation cancelled during blob digest.'));
    signal.addEventListener('abort', onAbort, { once: true });
    removeAbortListener = () => signal.removeEventListener('abort', onAbort);
  });

  const digestOperation = blob
    .arrayBuffer()
    .then((bytes) => {
      try {
        return crypto.subtle.digest('SHA-256', bytes);
      } finally {
        // bytes is released from closure scope
      }
    });

  try {
    const digest = await Dexie.waitFor(
      signal ? Promise.race([digestOperation, abortPromise]) : digestOperation,
      timeoutMs
    );
    return new Uint8Array(digest);
  } finally {
    removeAbortListener();
  }
}

// ============================================================================
// Module-Private Token and Capsule State Machine
// ============================================================================

const TOKEN_BRAND = Symbol('PixiBun.TrustedRecoveryPlanToken');

interface PrivatePlanExecutionData {
  readonly sourceProjectId: string;
  readonly sourceProjectRecord: StoredProject;
  readonly projectFingerprint: string;
  readonly blobsFingerprint: string;
  readonly resolvedSourceFingerprint: string;
  readonly ledgerPreimageFingerprint: string;
  readonly commitPreimageFingerprint: string;
  readonly blobDigests: Map<number, Uint8Array>;
  readonly candidateProject: ProjectFile;
  readonly sealedBlobMap: Map<number, { blob: Blob; entry: CandidateBlobRemapEntry }>;
  readonly candidatePlan: CandidateRecoveryPlan;
}

type CapsuleState =
  | { status: 'prepared'; data: PrivatePlanExecutionData }
  | { status: 'committing'; data: PrivatePlanExecutionData }
  | { status: 'consumed'; terminalReason: string };

const trustedPlanWeakMap = new WeakMap<TrustedRecoveryPlanToken, CapsuleState>();

function createToken(): TrustedRecoveryPlanToken {
  return Object.freeze({ [TOKEN_BRAND]: true }) as unknown as TrustedRecoveryPlanToken;
}

// ============================================================================
// Public API 1: prepareRecoveryPlan
// ============================================================================

/**
 * Prepares a trusted recovery plan from an authoritative snapshot of a project.
 *
 * Acquires a single bounded snapshot, calculates cryptographic fingerprints,
 * performs pure in-memory assessment and planning, and mints an opaque token
 * registered in a module-private state machine.
 */
export async function prepareRecoveryPlan(
  projectId: string,
  decisions?: RecoveryPlanBuilderDecisions,
  options?: RecoveryOrchestratorPrepareOptions
): Promise<RecoveryOrchestratorPrepareResult> {
  if (options?.signal?.aborted) {
    return {
      status: 'cancelled',
      message: 'Recovery plan preparation was cancelled before execution.',
    };
  }

  if (
    typeof projectId !== 'string' ||
    projectId.trim().length === 0 ||
    projectId.length > RECOVERY_INSPECTION_CEILINGS.MAX_IDENTIFIER_LENGTH
  ) {
    return {
      status: 'unrecoverable-blocked',
      reasonCode: 'MALFORMED_METADATA',
      message: `Invalid projectId: must be non-empty string <= ${RECOVERY_INSPECTION_CEILINGS.MAX_IDENTIFIER_LENGTH}`,
    };
  }

  let snapshot: StoredProjectSnapshot;
  try {
    snapshot = await acquireStoredProjectSnapshot(projectId, { signal: options?.signal });
  } catch (err) {
    if (options?.signal?.aborted || err instanceof RecoveryAbortError) {
      return {
        status: 'cancelled',
        message: 'Recovery plan preparation was cancelled.',
      };
    }
    return {
      status: 'unrecoverable-blocked',
      reasonCode: 'PROJECT_NOT_FOUND',
      message: err instanceof Error ? err.message : 'Failed to query database snapshot.',
    };
  }

  if (options?.signal?.aborted) {
    return { status: 'cancelled', message: 'Recovery plan preparation was cancelled.' };
  }

  if (!snapshot.projectRecord) {
    return {
      status: 'unrecoverable-blocked',
      reasonCode: 'PROJECT_NOT_FOUND',
      message: `Project "${projectId}" not found in database.`,
    };
  }

  if (snapshot.sourceBlobs.length > RECOVERY_INSPECTION_CEILINGS.MAX_INSPECTABLE_STORED_BLOBS) {
    return {
      status: 'unrecoverable-blocked',
      reasonCode: 'STORED_BLOBS_CEILING_EXCEEDED',
      message: `Project exceeds blob inspection ceiling (${RECOVERY_INSPECTION_CEILINGS.MAX_INSPECTABLE_STORED_BLOBS} blobs).`,
    };
  }

  // Validate closed-record schema shapes and lone surrogates
  try {
    assertClosedRecordShape(snapshot.projectRecord, STORED_PROJECT_RECOGNIZED_KEYS, 'StoredProject');
    assertNoLoneSurrogates(snapshot.projectRecord.name, 'project.name');
    assertNoLoneSurrogates(snapshot.projectRecord.id, 'project.id');
    assertNoLoneSurrogates(snapshot.projectRecord.dataJson, 'project.dataJson');
    if (typeof snapshot.projectRecord.thumbnailDataUrl === 'string') {
      assertNoLoneSurrogates(snapshot.projectRecord.thumbnailDataUrl, 'project.thumbnailDataUrl');
    }

    let aggregateBytes = 0;
    for (const blobRec of snapshot.sourceBlobs) {
      assertClosedRecordShape(blobRec, STORED_BLOB_RECOGNIZED_KEYS, 'StoredLayerBlob');
      assertNoLoneSurrogates(blobRec.layerId, 'blob.layerId');

      if (blobRec.blob.size > RECOVERY_INSPECTION_CEILINGS.MAX_SINGLE_BLOB_BYTES) {
        throw new ResourceCeilingError(
          'RESOURCE_CEILING_EXCEEDED',
          `Single blob size (${blobRec.blob.size} bytes) exceeds maximum ceiling (${RECOVERY_INSPECTION_CEILINGS.MAX_SINGLE_BLOB_BYTES} bytes).`
        );
      }

      if (!Number.isSafeInteger(aggregateBytes + blobRec.blob.size)) {
        throw new ResourceCeilingError(
          'RESOURCE_CEILING_EXCEEDED',
          'Arithmetic overflow detected during aggregate blob size accumulation.'
        );
      }
      aggregateBytes += blobRec.blob.size;

      if (aggregateBytes > RECOVERY_INSPECTION_CEILINGS.MAX_AGGREGATE_BLOB_BYTES) {
        throw new ResourceCeilingError(
          'RESOURCE_CEILING_EXCEEDED',
          `Aggregate blob bytes (${aggregateBytes} bytes) exceeds ceiling (${RECOVERY_INSPECTION_CEILINGS.MAX_AGGREGATE_BLOB_BYTES} bytes).`
        );
      }
    }

    if (snapshot.ledgerRecord) {
      assertClosedRecordShape(snapshot.ledgerRecord, RECOVERY_RECORD_RECOGNIZED_KEYS, 'RecoveryRecord');
      assertNoLoneSurrogates(snapshot.ledgerRecord.projectId, 'ledger.projectId');
      assertNoLoneSurrogates(snapshot.ledgerRecord.classificationState, 'ledger.classificationState');
      for (const code of snapshot.ledgerRecord.reasonCodes) {
        assertNoLoneSurrogates(code, 'ledger.reasonCodes');
      }
    }
  } catch (err) {
    if (err instanceof ResourceCeilingError) {
      return {
        status: 'unrecoverable-blocked',
        reasonCode: 'RESOURCE_CEILING_EXCEEDED',
        message: err.message,
      };
    }
    return {
      status: 'unrecoverable-blocked',
      reasonCode: 'MALFORMED_METADATA',
      message: err instanceof Error ? err.message : String(err),
    };
  }

  // Sequential pre-computation of individual Blob SHA-256 digests
  const blobDigests = new Map<number, Uint8Array>();
  for (const blobRec of snapshot.sourceBlobs) {
    if (options?.signal?.aborted) {
      return { status: 'cancelled', message: 'Recovery plan preparation was cancelled.' };
    }
    try {
      const buffer = await blobRec.blob.arrayBuffer();
      const digest = await crypto.subtle.digest('SHA-256', buffer);
      blobDigests.set(blobRec.id as number, new Uint8Array(digest));
    } catch (err) {
      return {
        status: 'unrecoverable-blocked',
        reasonCode: 'MALFORMED_METADATA',
        message: `Failed to compute SHA-256 for blob record ${blobRec.id}: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  // Pre-compute component and master fingerprints
  let projectFingerprint: string;
  let blobsFingerprint: string;
  let resolvedSourceFingerprint: string;
  let ledgerPreimageFingerprint: string;
  let commitPreimageFingerprint: string;

  try {
    const projBinary = buildProjectBinary(snapshot.projectRecord);
    projectFingerprint = await sha256DigestHex(projBinary);

    const blobsBinary = buildBlobsBinary(snapshot.sourceBlobs, blobDigests);
    blobsFingerprint = await sha256DigestHex(blobsBinary);

    const sourceContentBinary = buildSourceContentBinary(projectFingerprint, blobsFingerprint);
    resolvedSourceFingerprint = await sha256DigestHex(sourceContentBinary);

    const ledgerBinary = buildLedgerBinary(snapshot.ledgerRecord);
    ledgerPreimageFingerprint = await sha256DigestHex(ledgerBinary);

    const commitPreimageBinary = buildCommitPreimageBinary(
      resolvedSourceFingerprint,
      ledgerPreimageFingerprint
    );
    commitPreimageFingerprint = await sha256DigestHex(commitPreimageBinary);
  } catch (err) {
    return {
      status: 'unrecoverable-blocked',
      reasonCode: 'MALFORMED_METADATA',
      message: `Failed to assemble cryptographic fingerprints: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  // Pure in-memory diagnosis using the captured snapshot
  const assessment = await assessStoredSnapshot(snapshot, {
    signal: options?.signal,
    onProgress: options?.onProgress,
  });

  if (assessment.status === 'cancelled') {
    return { status: 'cancelled', message: assessment.message };
  }

  if (assessment.status === 'not-found') {
    return {
      status: 'unrecoverable-blocked',
      reasonCode: 'PROJECT_NOT_FOUND',
      message: assessment.message,
    };
  }

  if (assessment.status === 'valid') {
    return {
      status: 'unrecoverable-blocked',
      reasonCode: 'INVALID_ASSESSMENT',
      message: 'Project is healthy and valid; recovery plan is not required.',
    };
  }

  if (
    assessment.status === 'malformed' ||
    assessment.status === 'unsupported-version' ||
    assessment.status === 'unsafe-content' ||
    assessment.status === 'transient-load-failure'
  ) {
    const reasonCode: RecoveryReasonCode | 'MALFORMED_METADATA' =
      'reasonCode' in assessment && typeof assessment.reasonCode === 'string'
        ? (assessment.reasonCode)
        : 'MALFORMED_METADATA';
    return {
      status: 'unrecoverable-blocked',
      reasonCode,
      message: assessment.message,
      details: 'details' in assessment && typeof assessment.details === 'string' ? assessment.details : undefined,
    };
  }

  // Map snapshot source blobs to RecoverySourceBlobRecord for Phase 1B.5 planner
  const plannerSourceBlobs = snapshot.sourceBlobs.map((b) => ({
    recordId: b.id as number,
    projectId: b.projectId,
    layerId: b.layerId,
    frameIndex: b.frameIndex,
    updatedAt: b.updatedAt,
    blob: b.blob,
  }));

  const planResult = await buildRecoveryPlan(
    {
      assessment,
      sourceBlobs: plannerSourceBlobs,
      decisions,
    },
    { signal: options?.signal }
  );

  if (planResult.status !== 'ready') {
    return planResult;
  }

  // Build sealed blob map for remapped entries
  const sourceBlobsById = new Map<number, StoredLayerBlob>();
  for (const b of snapshot.sourceBlobs) {
    sourceBlobsById.set(b.id as number, b);
  }

  const sealedBlobMap = new Map<number, { blob: Blob; entry: CandidateBlobRemapEntry }>();
  for (const entry of planResult.candidatePlan.blobRemapEntries) {
    const sourceRec = sourceBlobsById.get(entry.sourceRecordId);
    if (!sourceRec) {
      return {
        status: 'unrecoverable-blocked',
        reasonCode: 'INCOMPLETE_SOURCE_BLOB_SNAPSHOT',
        message: `Plan referenced source record ID ${entry.sourceRecordId} which is missing from snapshot.`,
      };
    }
    sealedBlobMap.set(entry.sourceRecordId, { blob: sourceRec.blob, entry });
  }

  const executionData: PrivatePlanExecutionData = {
    sourceProjectId: projectId,
    sourceProjectRecord: snapshot.projectRecord,
    projectFingerprint,
    blobsFingerprint,
    resolvedSourceFingerprint,
    ledgerPreimageFingerprint,
    commitPreimageFingerprint,
    blobDigests,
    candidateProject: planResult.candidatePlan.candidateProject,
    sealedBlobMap,
    candidatePlan: planResult.candidatePlan,
  };

  const planToken = createToken();
  trustedPlanWeakMap.set(planToken, {
    status: 'prepared',
    data: executionData,
  });

  return {
    status: 'ready',
    planToken,
    candidatePlan: planResult.candidatePlan,
  };
}

// ============================================================================
// Public API 2: commitRecoveredProject
// ============================================================================

/**
 * Commits a trusted recovery plan into IndexedDB inside an atomic read-write transaction.
 *
 * Verifies token provenance, enforces single-claim concurrency locking, captures commit
 * timestamps and destination IDs, revalidates source snapshot integrity via Dexie.waitFor(),
 * and writes the recovered project, remapped blobs, and ledger audit transition.
 */
export async function commitRecoveredProject(
  token: TrustedRecoveryPlanToken,
  options?: RecoveryPersistenceCommitOptions
): Promise<RecoveryPersistenceCommitResult> {
  const capsule = trustedPlanWeakMap.get(token);
  if (!capsule) {
    return {
      status: 'unrecoverable-blocked',
      reasonCode: 'INVALID_PLAN_TOKEN',
      message: 'The provided recovery plan token is invalid, forged, or unminted.',
    };
  }

  if (capsule.status === 'committing') {
    return {
      status: 'unrecoverable-blocked',
      reasonCode: 'TOKEN_ALREADY_COMMITTING',
      message: 'A commit attempt is already in progress for this recovery plan token.',
    };
  }

  if (capsule.status === 'consumed') {
    return {
      status: 'unrecoverable-blocked',
      reasonCode: 'TOKEN_ALREADY_CONSUMED',
      message: 'This recovery plan token has already been consumed and cannot be replayed.',
    };
  }

  // Synchronously claim ownership before any await
  const capsuleData = capsule.data;
  trustedPlanWeakMap.set(token, { status: 'committing', data: capsuleData });
  const claimed = true;
  let terminalReason = 'storage-failure';

  try {
    // Check cancellation before opening transaction
    if (options?.signal?.aborted) {
      terminalReason = 'cancelled';
      return {
        status: 'cancelled',
        message: 'Recovery commit was cancelled before execution.',
      };
    }

    // Capture injected dependencies exactly once at commit start
    const nowFn = options?.now ?? (() => Date.now());
    const generateIdFn = options?.generateId ?? crypto.randomUUID.bind(crypto);

    let commitTimestamp: number;
    try {
      commitTimestamp = nowFn();
    } catch (err) {
      terminalReason = 'invalid-clock';
      return {
        status: 'unrecoverable-blocked',
        reasonCode: 'INVALID_CLOCK',
        message: `Injected now() threw an error: ${err instanceof Error ? err.message : String(err)}`,
      };
    }

    if (
      typeof commitTimestamp !== 'number' ||
      !Number.isSafeInteger(commitTimestamp) ||
      commitTimestamp < 0
    ) {
      terminalReason = 'invalid-clock';
      return {
        status: 'unrecoverable-blocked',
        reasonCode: 'INVALID_CLOCK',
        message: 'Injected clock must return a non-negative finite safe integer timestamp.',
      };
    }

    // Format recovered title with Unicode-safe truncation
    const recoveredTitle = formatRecoveredTitle(capsule.data.sourceProjectRecord.name);

    // Build and strictly validate the private recovered ProjectFile
    const recoveredProjectFile: ProjectFile = {
      ...capsule.data.candidateProject,
      name: recoveredTitle,
      createdAt: commitTimestamp,
      updatedAt: commitTimestamp,
    };

    const validation = validateProjectFile(recoveredProjectFile);
    if (!validation.ok) {
      terminalReason = 'schema-validation-failed';
      return {
        status: 'unrecoverable-blocked',
        reasonCode: 'SCHEMA_VALIDATION_FAILED',
        message: `Synthesized recovered project failed schema validation: ${validation.error}`,
      };
    }

    const dataJson = JSON.stringify(validation.value);

    // Recheck cancellation before opening write transaction
    if (options?.signal?.aborted) {
      terminalReason = 'cancelled';
      return {
        status: 'cancelled',
        message: 'Recovery commit was cancelled before opening database transaction.',
      };
    }

    if (!db.isOpen()) {
      await db.open();
    }

    let finalRecoveredProjectId = '';

    await db.transaction('rw', db.projects, db.layerBlobs, db.recoveryRecords, async () => {
      // 1. Check cancellation at transaction entry
      if (options?.signal?.aborted) {
        throw new RecoveryAbortError('Recovery commit cancelled at transaction start.');
      }

      // 2. Re-read source project
      const currentProject = await db.projects.get(capsule.data.sourceProjectId);
      if (options?.signal?.aborted) {
        throw new RecoveryAbortError('Recovery commit cancelled after project read.');
      }

      if (!currentProject) {
        throw new StaleSnapshotError('PROJECT_MODIFIED', 'Source project was deleted concurrently.');
      }

      assertClosedRecordShape(currentProject, STORED_PROJECT_RECOGNIZED_KEYS, 'StoredProject');
      const activeProjBinary = buildProjectBinary(currentProject);
      const activeProjectFingerprint = await Dexie.waitFor(sha256DigestHex(activeProjBinary));

      if (activeProjectFingerprint !== capsule.data.projectFingerprint) {
        throw new StaleSnapshotError('PROJECT_MODIFIED', 'Source project was modified concurrently.');
      }

      // 3. Re-read recovery ledger record
      if (options?.signal?.aborted) {
        throw new RecoveryAbortError('Recovery commit cancelled before ledger read.');
      }
      const currentLedger = await db.recoveryRecords.get(capsule.data.sourceProjectId);
      if (options?.signal?.aborted) {
        throw new RecoveryAbortError('Recovery commit cancelled after ledger read.');
      }

      if (currentLedger) {
        assertClosedRecordShape(currentLedger, RECOVERY_RECORD_RECOGNIZED_KEYS, 'RecoveryRecord');
      }

      const activeLedgerBinary = buildLedgerBinary(currentLedger);
      const activeLedgerFingerprint = await Dexie.waitFor(sha256DigestHex(activeLedgerBinary));

      if (activeLedgerFingerprint !== capsule.data.ledgerPreimageFingerprint) {
        throw new StaleSnapshotError(
          'LEDGER_PREIMAGE_MODIFIED',
          'Source recovery ledger record was modified or deleted concurrently.'
        );
      }

      // 4. Re-read layer blobs keyspace
      if (options?.signal?.aborted) {
        throw new RecoveryAbortError('Recovery commit cancelled before blob keyspace enumeration.');
      }

      const currentBlobs = await db.layerBlobs
        .where('[projectId+id]')
        .between(
          [capsule.data.sourceProjectId, Dexie.minKey],
          [capsule.data.sourceProjectId, Dexie.maxKey],
          true,
          true
        )
        .limit(RECOVERY_INSPECTION_CEILINGS.MAX_INSPECTABLE_STORED_BLOBS + 1)
        .toArray();

      if (options?.signal?.aborted) {
        throw new RecoveryAbortError('Recovery commit cancelled after blob keyspace enumeration.');
      }

      if (currentBlobs.length !== capsule.data.blobDigests.size) {
        throw new StaleSnapshotError(
          'BLOBS_MODIFIED',
          'Source blob keyspace count changed concurrently.'
        );
      }

      const activeBlobDigests = new Map<number, Uint8Array>();

      // 5. In-transaction asynchronous Blob digesting with Dexie.waitFor keepalive
      for (const blobRec of currentBlobs) {
        if (options?.signal?.aborted) {
          throw new RecoveryAbortError('Recovery commit cancelled during blob verification.');
        }

        assertClosedRecordShape(blobRec, STORED_BLOB_RECOGNIZED_KEYS, 'StoredLayerBlob');

        const expectedDigest = capsule.data.blobDigests.get(blobRec.id as number);
        if (!expectedDigest) {
          throw new StaleSnapshotError('BLOBS_MODIFIED', `Unexpected blob id ${blobRec.id} in source keyspace.`);
        }

        let activeDigest: Uint8Array;
        try {
          activeDigest = await digestBlobInTransaction(
            blobRec.blob,
            options?.signal,
            RECOVERY_INSPECTION_CEILINGS.TRANSACTION_DIGEST_TIMEOUT_MS
          );
        } catch (err) {
          if (err instanceof RecoveryAbortError) throw err;
          throw err;
        }

        if (options?.signal?.aborted) {
          throw new RecoveryAbortError('Recovery commit cancelled after blob digest.');
        }

        // Compare individual 32-byte digest
        if (activeDigest.length !== expectedDigest.length) {
          throw new StaleSnapshotError('BLOBS_MODIFIED', `Digest length mismatch on blob ${blobRec.id}.`);
        }
        for (let b = 0; b < activeDigest.length; b++) {
          if (activeDigest[b] !== expectedDigest[b]) {
            throw new StaleSnapshotError('BLOBS_MODIFIED', `Byte content changed in source blob ${blobRec.id}.`);
          }
        }

        activeBlobDigests.set(blobRec.id as number, activeDigest);
      }

      const activeBlobsBinary = buildBlobsBinary(currentBlobs, activeBlobDigests);
      const activeBlobsFingerprint = await Dexie.waitFor(sha256DigestHex(activeBlobsBinary));

      if (activeBlobsFingerprint !== capsule.data.blobsFingerprint) {
        throw new StaleSnapshotError('BLOBS_MODIFIED', 'Source blobs keyspace modified concurrently.');
      }

      const activeSourceContentBinary = buildSourceContentBinary(
        activeProjectFingerprint,
        activeBlobsFingerprint
      );
      const activeResolvedSourceFingerprint = await Dexie.waitFor(sha256DigestHex(activeSourceContentBinary));

      if (activeResolvedSourceFingerprint !== capsule.data.resolvedSourceFingerprint) {
        throw new StaleSnapshotError('BLOBS_MODIFIED', 'Source content fingerprint mismatch.');
      }

      const activeCommitPreimageBinary = buildCommitPreimageBinary(
        activeResolvedSourceFingerprint,
        activeLedgerFingerprint
      );
      const activeCommitPreimageFingerprint = await Dexie.waitFor(sha256DigestHex(activeCommitPreimageBinary));

      if (activeCommitPreimageFingerprint !== capsule.data.commitPreimageFingerprint) {
        throw new StaleSnapshotError(
          'SNAPSHOT_CONCURRENCY_VIOLATION',
          'Commit preimage concurrency validation failed.'
        );
      }

      // 6. Destination ID generation and 3-table collision check (bounded retries N=3)
      let destinationId: string | undefined = undefined;

      for (let attempt = 1; attempt <= RECOVERY_INSPECTION_CEILINGS.MAX_ID_GENERATION_RETRIES; attempt++) {
        if (options?.signal?.aborted) {
          throw new RecoveryAbortError('Recovery commit cancelled before destination collision check.');
        }

        let candidateId: string;
        try {
          candidateId = generateIdFn();
        } catch (err) {
          throw new RecoveryCommitError(
            'INVALID_GENERATED_ID',
            `generateId threw an error: ${err instanceof Error ? err.message : String(err)}`
          );
        }

        if (
          typeof candidateId !== 'string' ||
          candidateId.trim().length === 0 ||
          candidateId.length > RECOVERY_INSPECTION_CEILINGS.MAX_IDENTIFIER_LENGTH ||
          !/^[a-zA-Z0-9_-]+$/.test(candidateId)
        ) {
          throw new RecoveryCommitError(
            'INVALID_GENERATED_ID',
            `generateId returned an invalid ID: "${String(candidateId)}"`
          );
        }

        // Check collision across all three tables
        const projCollision = await db.projects.get(candidateId);
        if (projCollision !== undefined) continue;

        const blobCollision = await db.layerBlobs
          .where('[projectId+id]')
          .between([candidateId, Dexie.minKey], [candidateId, Dexie.maxKey], true, true)
          .count();
        if (blobCollision > 0) continue;

        const ledgerCollision = await db.recoveryRecords.get(candidateId);
        if (ledgerCollision !== undefined) continue;

        destinationId = candidateId;
        break;
      }

      if (!destinationId) {
        throw new DestinationCollisionError(
          `Exhausted all ${RECOVERY_INSPECTION_CEILINGS.MAX_ID_GENERATION_RETRIES} destination ID collision retries.`
        );
      }

      finalRecoveredProjectId = destinationId;

      // 7. Staged Writes
      if (options?.signal?.aborted) {
        throw new RecoveryAbortError('Recovery commit cancelled before destination project write.');
      }

      const storedProjectRow: StoredProject = {
        id: destinationId,
        name: recoveredTitle,
        width: validation.value.width,
        height: validation.value.height,
        fps: validation.value.fps,
        createdAt: commitTimestamp,
        updatedAt: commitTimestamp,
        dataJson,
      };

      await db.projects.add(storedProjectRow);

      if (options?.signal?.aborted) {
        throw new RecoveryAbortError('Recovery commit cancelled after destination project write.');
      }

      // Write remapped layer blobs
      for (const entry of capsule.data.candidatePlan.blobRemapEntries) {
        if (options?.signal?.aborted) {
          throw new RecoveryAbortError('Recovery commit cancelled during blob write.');
        }

        const sealed = capsule.data.sealedBlobMap.get(entry.sourceRecordId);
        if (!sealed) {
          throw new Error(`Corrupted internal capsule: missing sealed blob for record ${entry.sourceRecordId}`);
        }

        await db.layerBlobs.add({
          projectId: destinationId,
          layerId: entry.targetLayerId,
          frameIndex: entry.targetFrameIndex,
          blob: sealed.blob,
          updatedAt: commitTimestamp,
        });
      }

      if (options?.signal?.aborted) {
        throw new RecoveryAbortError('Recovery commit cancelled before ledger update.');
      }

      // Update original recovery ledger record with resolution metadata
      const classificationState =
        currentLedger?.classificationState ??
        (capsule.data.candidatePlan.resourceUsage ? 'recoverable-envelope-exceeded' : 'recoverable-blob-invalid');

      const updatedLedger: RecoveryRecord = {
        projectId: capsule.data.sourceProjectId,
        classificationState,
        firstDetectedAt: currentLedger?.firstDetectedAt ?? commitTimestamp,
        lastConfirmedAt: commitTimestamp,
        reasonCodes: currentLedger?.reasonCodes ?? [],
        resolvedAt: commitTimestamp,
        recoveredProjectId: destinationId,
        resolvedSourceFingerprint: capsule.data.resolvedSourceFingerprint,
      };

      await db.recoveryRecords.put(updatedLedger);

      // Final cancellation check immediately before transaction callback return
      if (options?.signal?.aborted) {
        throw new RecoveryAbortError('Recovery commit cancelled immediately before transaction resolution.');
      }
    });

    // Durable commit point: tx has committed!
    terminalReason = 'committed';

    if (options?.signal?.aborted) {
      return {
        status: 'persisted-success',
        recoveredProjectId: finalRecoveredProjectId,
        recoveredTitle,
        cancellationIgnoredPostCommit: true,
      };
    }

    return {
      status: 'persisted-success',
      recoveredProjectId: finalRecoveredProjectId,
      recoveredTitle,
    };
  } catch (err) {
    if (err instanceof RecoveryAbortError) {
      terminalReason = 'cancelled';
      return {
        status: 'cancelled',
        message: err.message,
      };
    }

    if (err instanceof StaleSnapshotError) {
      terminalReason = 'stale-source-snapshot';
      return {
        status: 'stale-source-snapshot',
        reasonCode: 'STALE_SOURCE_SNAPSHOT',
        detail: err.detail,
        message: err.message,
      };
    }

    if (err instanceof DestinationCollisionError) {
      terminalReason = 'destination-collision';
      return {
        status: 'destination-collision',
        reasonCode: 'DESTINATION_COLLISION',
        message: err.message,
      };
    }

    if (err instanceof RecoveryCommitError) {
      terminalReason = err.code;
      return {
        status: 'unrecoverable-blocked',
        reasonCode: err.code,
        message: err.message,
      };
    }

    // Check for transaction timeout
    const isTimeout =
      (err as { name?: string })?.name === 'TimeoutError' ||
      /timeout/i.test(err instanceof Error ? err.message : String(err));

    terminalReason = isTimeout ? 'timeout' : 'storage-failure';

    return {
      status: 'storage-failure',
      reasonCode: isTimeout ? 'TRANSACTION_TIMEOUT' : 'STORAGE_ERROR',
      message: err instanceof Error ? err.message : String(err),
    };
  } finally {
    // Only the owner that claimed the token executes cleanup
    if (claimed && capsuleData) {
      try {
        capsuleData.sealedBlobMap.clear();
        capsuleData.blobDigests.clear();
      } catch {
        // Safe clear
      }
      trustedPlanWeakMap.set(token, {
        status: 'consumed',
        terminalReason,
      });
    }
  }
}
