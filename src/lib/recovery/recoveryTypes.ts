/**
 * recoveryTypes.ts
 *
 * Domain types for Restricted Recovery Mode and project metadata classification.
 */

import type { ProjectFile, ProjectResourceUsage } from '@/types/project';
import type { StoredProject, StoredLayerBlob, RecoveryRecord } from '@/lib/storage/db';
import { RECOVERY_INSPECTION_CEILINGS } from './recoveryLimits';

export type EnvelopeViolationCode =
  | 'ENVELOPE_MAX_FRAMES'
  | 'ENVELOPE_MAX_LAYERS_PER_FRAME'
  | 'ENVELOPE_MAX_TOTAL_LAYERS'
  | 'ENVELOPE_MAX_MEGAPIXELS';

export interface FrameLayerViolationDetail {
  frameIndex: number;
  actualLayers: number;
  allowedLayers: number;
}

export interface EnvelopeViolation {
  code: EnvelopeViolationCode;
  message: string;
  actual: number;
  allowed: number;
  /** Total number of affected frames exceeding layer limit (for ENVELOPE_MAX_LAYERS_PER_FRAME). */
  affectedFramesCount?: number;
  /** True when the number of affected frames exceeds MAX_RECORDED_FRAME_VIOLATION_DETAILS. */
  detailsTruncated?: boolean;
  /** Bounded list of per-frame violation details. */
  frameDetails?: FrameLayerViolationDetail[];
}

export type InvalidLayerReason =
  | 'DUPLICATE_BLOB_MAPPING'
  | 'CORRUPTED_PNG_HEADER'
  | 'BLOB_DIMENSION_MISMATCH'
  | 'EMBEDDED_RASTER_UNSUPPORTED';

export interface InvalidLayerDescriptor {
  layerId: string;
  frameIndex: number;
  reason: InvalidLayerReason;
  reasons: InvalidLayerReason[];
}

/**
 * Bounded summary of invalid layers detected during stored-blob diagnosis.
 *
 * NOTE FOR FUTURE COMMIT PIPELINES:
 * The eventual recovered-copy commit must rescan and revalidate all selected layers;
 * it must not trust a truncated diagnostic preview.
 */
export interface InvalidLayerSummary {
  affectedLayerCount: number;
  totalReasonCount: number;
  detailsTruncated: boolean;
  details: InvalidLayerDescriptor[];
}

export type RecoveryReasonCode =
  | EnvelopeViolationCode
  | InvalidLayerReason
  | 'SAFE_JSON_PAYLOAD_LIMIT'
  | 'SAFE_JSON_NESTING_DEPTH'
  | 'SAFE_JSON_TRAVERSAL_LIMIT'
  | 'SAFE_JSON_SYNTAX_ERROR'
  | 'MALFORMED_JSON_SYNTAX'
  | 'EXCESSIVE_STORED_BLOBS'
  | 'CORRUPTED_STORED_BLOB_RECORD'
  | 'INSPECTION_CEILING_EXCEEDED'
  | 'INVALID_ROOT_TYPE'
  | 'INVALID_FORMAT_ID'
  | 'INVALID_VERSION_FORMAT'
  | 'INVALID_NAME'
  | 'INVALID_DIMENSIONS'
  | 'INVALID_FPS'
  | 'INVALID_LOOP_MODE'
  | 'INVALID_ONION_SKIN'
  | 'INVALID_PALETTES'
  | 'DUPLICATE_PALETTE_ID'
  | 'INVALID_ACTIVE_PALETTE'
  | 'INVALID_CUSTOM_RAMPS'
  | 'INVALID_CLIPS'
  | 'DUPLICATE_CLIP_ID'
  | 'MALFORMED_CLIP_RANGE'
  | 'INVALID_FRAME_STRUCTURE'
  | 'INVALID_LAYER_STRUCTURE'
  | 'DUPLICATE_FRAME_ID'
  | 'DUPLICATE_LAYER_ID'
  | 'INVALID_TIMESTAMPS'
  | 'ARITHMETIC_OVERFLOW'
  | 'UNSUPPORTED_FUTURE_VERSION'
  | 'MALFORMED_METADATA';

export interface SafeProjectMetadata {
  name: string;
  width: number;
  height: number;
  frameCount: number;
  totalLayerCount: number;
  maxLayersInAFrame: number;
  materializableRasterPixels: number;
  baseRawRgbaBytes: number;
  fps: number;
  version: number;
  createdAt: number;
  updatedAt: number;
}

export type RecoveryClassification =
  | {
      status: 'valid';
      project: ProjectFile;
      metadata: SafeProjectMetadata;
    }
  | {
      status: 'recoverable-envelope-exceeded';
      project: ProjectFile;
      metadata: SafeProjectMetadata;
      violations: EnvelopeViolation[];
      reasonCodes: EnvelopeViolationCode[];
    }
  | {
      status: 'malformed';
      reasonCode: RecoveryReasonCode;
      message: string;
      details?: string;
    }
  | {
      status: 'unsupported-version';
      reasonCode: 'UNSUPPORTED_FUTURE_VERSION';
      foundVersion: number;
      supportedVersion: number;
      message: string;
    }
  | {
      status: 'unsafe-content';
      reasonCode: RecoveryReasonCode;
      message: string;
      details?: string;
    };

export interface OrphanBlobDetail {
  recordId: number;
  ordinal: number;
  frameIndex: number;
  sizeBytes: number;
}

export interface OrphanBlobSummary {
  totalCount: number;
  duplicateCount: number;
  detailsTruncated: boolean;
  details: OrphanBlobDetail[];
}

export interface RecoveryScanProgress {
  scannedBlobs: number;
  totalEstimatedBlobs?: number;
  currentBatchSize: number;
}

export type StoredRecoveryAssessment =
  | {
      status: 'valid';
      projectId: string;
      project: ProjectFile;
      metadata: SafeProjectMetadata;
      orphanSummary: OrphanBlobSummary;
      scannedBlobsCount: number;
    }
  | {
      status: 'recoverable-envelope-exceeded';
      projectId: string;
      project: ProjectFile;
      metadata: SafeProjectMetadata;
      violations: EnvelopeViolation[];
      reasonCodes: RecoveryReasonCode[];
      orphanSummary: OrphanBlobSummary;
      scannedBlobsCount: number;
    }
  | {
      status: 'recoverable-blob-invalid';
      projectId: string;
      project: ProjectFile;
      metadata: SafeProjectMetadata;
      invalidLayerSummary: InvalidLayerSummary;
      violations?: EnvelopeViolation[];
      reasonCodes: RecoveryReasonCode[];
      orphanSummary: OrphanBlobSummary;
      scannedBlobsCount: number;
    }
  | {
      status: 'malformed';
      projectId: string;
      reasonCode: RecoveryReasonCode;
      reasonCodes: RecoveryReasonCode[];
      message: string;
      details?: string;
    }
  | {
      status: 'unsupported-version';
      projectId: string;
      reasonCode: 'UNSUPPORTED_FUTURE_VERSION';
      reasonCodes: RecoveryReasonCode[];
      foundVersion: number;
      supportedVersion: number;
      message: string;
    }
  | {
      status: 'unsafe-content';
      projectId: string;
      reasonCode: RecoveryReasonCode;
      reasonCodes: RecoveryReasonCode[];
      message: string;
      details?: string;
    }
  | {
      status: 'not-found';
      projectId: string;
      message: string;
    }
  | {
      status: 'cancelled';
      projectId: string;
      message: string;
    }
  | {
      status: 'transient-load-failure';
      projectId: string;
      message: string;
    };

export type DeterministicRecoveryAssessment = Extract<
  StoredRecoveryAssessment,
  {
    status:
      | 'recoverable-envelope-exceeded'
      | 'recoverable-blob-invalid'
      | 'malformed'
      | 'unsupported-version'
      | 'unsafe-content';
  }
>;

export const CANONICAL_REASON_CODE_ORDER: readonly RecoveryReasonCode[] = [
  'ENVELOPE_MAX_FRAMES',
  'ENVELOPE_MAX_LAYERS_PER_FRAME',
  'ENVELOPE_MAX_TOTAL_LAYERS',
  'ENVELOPE_MAX_MEGAPIXELS',
  'DUPLICATE_BLOB_MAPPING',
  'CORRUPTED_PNG_HEADER',
  'BLOB_DIMENSION_MISMATCH',
  'EMBEDDED_RASTER_UNSUPPORTED',
  'SAFE_JSON_PAYLOAD_LIMIT',
  'SAFE_JSON_NESTING_DEPTH',
  'SAFE_JSON_TRAVERSAL_LIMIT',
  'SAFE_JSON_SYNTAX_ERROR',
  'MALFORMED_JSON_SYNTAX',
  'EXCESSIVE_STORED_BLOBS',
  'CORRUPTED_STORED_BLOB_RECORD',
  'INSPECTION_CEILING_EXCEEDED',
  'INVALID_ROOT_TYPE',
  'INVALID_FORMAT_ID',
  'INVALID_VERSION_FORMAT',
  'INVALID_NAME',
  'INVALID_DIMENSIONS',
  'INVALID_FPS',
  'INVALID_LOOP_MODE',
  'INVALID_ONION_SKIN',
  'INVALID_PALETTES',
  'DUPLICATE_PALETTE_ID',
  'INVALID_ACTIVE_PALETTE',
  'INVALID_CUSTOM_RAMPS',
  'INVALID_CLIPS',
  'DUPLICATE_CLIP_ID',
  'MALFORMED_CLIP_RANGE',
  'INVALID_FRAME_STRUCTURE',
  'INVALID_LAYER_STRUCTURE',
  'DUPLICATE_FRAME_ID',
  'DUPLICATE_LAYER_ID',
  'INVALID_TIMESTAMPS',
  'ARITHMETIC_OVERFLOW',
  'UNSUPPORTED_FUTURE_VERSION',
  'MALFORMED_METADATA',
] as const;

export const KNOWN_RECOVERY_REASON_CODES: ReadonlySet<string> = new Set<string>(
  CANONICAL_REASON_CODE_ORDER
);

export function sortReasonCodes(
  codes: readonly RecoveryReasonCode[]
): RecoveryReasonCode[] {
  if (!Array.isArray(codes)) {
    throw new TypeError('sortReasonCodes requires an array of reason codes.');
  }
  if (codes.length > RECOVERY_INSPECTION_CEILINGS.MAX_LEDGER_INPUT_REASON_CODES) {
    throw new TypeError(
      `Reason codes array length (${codes.length}) exceeds maximum allowed input bound (${RECOVERY_INSPECTION_CEILINGS.MAX_LEDGER_INPUT_REASON_CODES}).`
    );
  }
  const set = new Set<RecoveryReasonCode>();
  for (let i = 0; i < codes.length; i++) {
    const code = codes[i];
    if (typeof code !== 'string' || !KNOWN_RECOVERY_REASON_CODES.has(code)) {
      throw new TypeError(`Unknown or invalid reason code: ${String(code)}`);
    }
    set.add(code as RecoveryReasonCode);
  }
  const result: RecoveryReasonCode[] = [];
  for (const code of CANONICAL_REASON_CODE_ORDER) {
    if (set.has(code)) {
      result.push(code);
    }
  }
  return result;
}

// -----------------------------------------------------------------------------
// Phase 1B.4 — Untouched Recovery Archive Types & Error Definitions
// -----------------------------------------------------------------------------

export type RecoveryLedgerClassificationState =
  | 'recoverable-envelope-exceeded'
  | 'recoverable-blob-invalid'
  | 'malformed'
  | 'unsupported-version'
  | 'unsafe-content';

export const KNOWN_RECOVERY_LEDGER_STATES: ReadonlySet<string> = new Set<string>([
  'recoverable-envelope-exceeded',
  'recoverable-blob-invalid',
  'malformed',
  'unsupported-version',
  'unsafe-content',
]);

export type RecoveryBackupErrorCode =
  | 'PROJECT_NOT_FOUND'
  | 'INVALID_PROJECT_ID'
  | 'INVALID_DATA_JSON_STORAGE_TYPE'
  | 'CORRUPTED_STORED_BLOB_RECORD'
  | 'EXCESSIVE_STORED_BLOBS'
  | 'INVALID_BLOB_PAYLOAD'
  | 'MANIFEST_SIZE_EXCEEDED'
  | 'ARCHIVE_SIZE_EXCEEDED'
  | 'CALCULATED_SIZE_MISMATCH'
  | 'BLOB_FALLBACK_CEILING_EXCEEDED'
  | 'INVALID_RECOVERY_RECORD'
  | 'TRANSIENT_STORAGE_FAILURE'
  | 'INVALID_CLOCK'
  | 'INVALID_PREPARED_ARCHIVE';

export class RecoveryBackupError extends Error {
  public readonly code: RecoveryBackupErrorCode;

  constructor(code: RecoveryBackupErrorCode, message: string) {
    super(`[RecoveryBackup] ${code}: ${message}`);
    this.name = 'RecoveryBackupError';
    this.code = code;
    Object.setPrototypeOf(this, RecoveryBackupError.prototype);
  }
}

export interface RecoveryBackupManifestV1 {
  readonly format: 'pixibun-recovery-backup';
  readonly version: 1;
  readonly createdAt: string;
  readonly project: {
    readonly projectId: string;
    readonly projectEntry: 'project.json';
    readonly originalDataJsonUtf8Bytes: number;
  };
  readonly blobs: ReadonlyArray<{
    readonly ordinal: number;
    readonly archiveEntry: string;
    readonly recordId: number;
    readonly layerId: string;
    readonly frameIndex: number;
    readonly sizeBytes: number;
    readonly mimeType: string;
  }>;
  readonly recovery?: {
    readonly projectId: string;
    readonly classificationState: RecoveryLedgerClassificationState;
    readonly firstDetectedAt: number;
    readonly lastConfirmedAt: number;
    readonly reasonCodes: readonly RecoveryReasonCode[];
  };
}

export interface PreparedBlobDescriptor {
  readonly ordinal: number;
  readonly archiveEntry: string;
  readonly recordId: number;
  readonly layerId: string;
  readonly frameIndex: number;
  readonly sizeBytes: number;
  readonly mimeType: string;
}

export interface PreparedRecoveryArchive {
  readonly projectId: string;
  readonly createdAt: string;
  readonly estimatedArchiveBytes: number;
  readonly entryCount: number;
  readonly blobCount: number;
  readonly manifest: RecoveryBackupManifestV1;
  readonly dataJsonBytesLength: number;
  readonly blobEntries: readonly PreparedBlobDescriptor[];
}

export interface RecoveryBackupWriteResult {
  readonly totalBytesWritten: number;
  readonly entryCount: number;
  readonly blobCount: number;
}

// -----------------------------------------------------------------------------
// Phase 1B.5 — Deterministic Recovery Plan Builder Domain Types
// -----------------------------------------------------------------------------

export type RecoverableStoredAssessment = Extract<
  StoredRecoveryAssessment,
  {
    status: 'recoverable-envelope-exceeded' | 'recoverable-blob-invalid';
  }
>;

export interface RecoverySourceBlobRecord {
  readonly recordId: number;
  readonly projectId: string;
  readonly layerId: string;
  readonly frameIndex: number;
  readonly blob: Blob;
  readonly updatedAt: number;
}

export interface RecoveryPlanBuilderDecisions {
  readonly deleteFrameIndices?: readonly number[];
  readonly deleteLayerIds?: readonly string[];
  readonly clipConsentGranted?: boolean;
}

export interface RecoveryPlanBuilderInput {
  readonly assessment: RecoverableStoredAssessment;
  readonly sourceBlobs: readonly RecoverySourceBlobRecord[];
  readonly decisions?: RecoveryPlanBuilderDecisions;
}

export interface RecoveryPlanBuilderOptions {
  readonly signal?: AbortSignal;
}

export interface CandidateBlobRemapEntry {
  readonly sourceRecordId: number;
  readonly sourceProjectId: string;
  readonly sourceLayerId: string;
  readonly sourceFrameIndex: number;
  readonly sourceUpdatedAt: number;
  readonly expectedSizeBytes: number;
  readonly expectedMimeType: string;
  readonly targetLayerId: string;
  readonly targetFrameIndex: number;
}

export interface CandidateRecoveryPlan {
  readonly sourceProjectId: string;
  readonly candidateProject: ProjectFile;
  readonly blobRemapEntries: readonly CandidateBlobRemapEntry[];
  readonly excludedRecordIds: readonly number[];
  readonly deletedFrameIndices: readonly number[];
  readonly deletedLayerIds: readonly string[];
  readonly removedClipIds: readonly string[];
  readonly resourceUsage: ProjectResourceUsage;
}

export interface AffectedClipDescriptor {
  readonly clipId: string;
  readonly clipName: string;
  readonly startFrame: number;
  readonly endFrame: number;
  readonly deletedFrameIndices: readonly number[];
}

export type PlanAdditionalDeletionReason =
  | 'DUPLICATE_BLOB_MAPPING'
  | 'CORRUPTED_PNG_HEADER'
  | 'BLOB_DIMENSION_MISMATCH'
  | 'EMPTY_FRAME_REQUIRES_DELETION'
  | EnvelopeViolationCode;

export interface AdditionalDeletionItem {
  readonly reason: PlanAdditionalDeletionReason;
  readonly frameIndex?: number;
  readonly layerId?: string;
  readonly layerName?: string;
  readonly message: string;
}

export type PlanBlockedReasonCode =
  | 'INVALID_ASSESSMENT'
  | 'INCOMPLETE_SOURCE_BLOB_SNAPSHOT'
  | 'CORRUPTED_STORED_BLOB_RECORD'
  | 'INVALID_RECOVERY_DECISIONS'
  | 'ALL_FRAMES_DELETED'
  | 'CLIP_REMAP_INVARIANT_FAILED'
  | 'STRUCTURAL_VALIDATION_FAILED'
  | 'SCHEMA_VALIDATION_FAILED'
  | RecoveryReasonCode;

export type RecoveryPlanResult =
  | {
      readonly status: 'ready';
      readonly candidatePlan: CandidateRecoveryPlan;
    }
  | {
      readonly status: 'additional-deletion-required';
      readonly requiredDeletions: readonly AdditionalDeletionItem[];
      readonly violations?: readonly EnvelopeViolation[];
      readonly resourceUsage?: ProjectResourceUsage;
      readonly summary: string;
    }
  | {
      readonly status: 'clip-consent-required';
      readonly affectedClips: readonly AffectedClipDescriptor[];
      readonly summary: string;
    }
  | {
      readonly status: 'unrecoverable-blocked';
      readonly reasonCode: PlanBlockedReasonCode;
      readonly message: string;
      readonly details?: string;
    }
  | {
      readonly status: 'cancelled';
      readonly message: string;
    };

// ============================================================================
// Phase 1B.6 Types: Orchestration, Provenance, and Atomic Persistence
// ============================================================================

/**
 * Opaque brand token representing a trusted, verified recovery plan.
 * Backed by a module-private WeakMap capsule in recoveryOrchestrator.ts.
 */
export interface TrustedRecoveryPlanToken {
  readonly __brand: unique symbol;
}

/**
 * Authoritative single bounded snapshot captured from IndexedDB.
 */
export interface StoredProjectSnapshot {
  readonly projectRecord: StoredProject | undefined;
  readonly sourceBlobs: readonly StoredLayerBlob[];
  readonly ledgerRecord: RecoveryRecord | undefined;
}

export interface RecoveryFingerprintComponents {
  readonly projectFingerprint: string;
  readonly blobsFingerprint: string;
  readonly resolvedSourceFingerprint: string;
  readonly ledgerPreimageFingerprint: string;
  readonly commitPreimageFingerprint: string;
}

export interface RecoveryOrchestratorPrepareOptions {
  readonly signal?: AbortSignal;
  readonly onProgress?: (progress: RecoveryScanProgress) => void;
}

export type RecoveryOrchestratorPrepareResult =
  | {
      readonly status: 'ready';
      readonly planToken: TrustedRecoveryPlanToken;
      readonly candidatePlan: CandidateRecoveryPlan;
    }
  | {
      readonly status: 'additional-deletion-required';
      readonly requiredDeletions: readonly AdditionalDeletionItem[];
      readonly violations?: readonly EnvelopeViolation[];
      readonly resourceUsage?: ProjectResourceUsage;
      readonly summary: string;
    }
  | {
      readonly status: 'clip-consent-required';
      readonly affectedClips: readonly AffectedClipDescriptor[];
      readonly summary: string;
    }
  | {
      readonly status: 'unrecoverable-blocked';
      readonly reasonCode:
        | PlanBlockedReasonCode
        | 'RESOURCE_CEILING_EXCEEDED'
        | 'STORED_BLOBS_CEILING_EXCEEDED'
        | 'PROJECT_NOT_FOUND'
        | 'MALFORMED_METADATA';
      readonly message: string;
      readonly details?: string;
    }
  | {
      readonly status: 'cancelled';
      readonly message: string;
    };

export interface RecoveryPersistenceCommitOptions {
  readonly signal?: AbortSignal;
  readonly now?: () => number;
  readonly generateId?: () => string;
}

export type StaleSnapshotDetail =
  | 'PROJECT_MODIFIED'
  | 'BLOBS_MODIFIED'
  | 'LEDGER_PREIMAGE_MODIFIED'
  | 'SNAPSHOT_CONCURRENCY_VIOLATION';

export type RecoveryPersistenceCommitResult =
  | {
      readonly status: 'persisted-success';
      readonly recoveredProjectId: string;
      readonly recoveredTitle: string;
      readonly cancellationIgnoredPostCommit?: boolean;
    }
  | {
      readonly status: 'stale-source-snapshot';
      readonly reasonCode: 'STALE_SOURCE_SNAPSHOT';
      readonly detail: StaleSnapshotDetail;
      readonly message: string;
    }
  | {
      readonly status: 'destination-collision';
      readonly reasonCode: 'DESTINATION_COLLISION';
      readonly message: string;
    }
  | {
      readonly status: 'unrecoverable-blocked';
      readonly reasonCode:
        | 'INVALID_PLAN_TOKEN'
        | 'TOKEN_ALREADY_COMMITTING'
        | 'TOKEN_ALREADY_CONSUMED'
        | 'INVALID_GENERATED_ID'
        | 'INVALID_CLOCK'
        | 'SCHEMA_VALIDATION_FAILED'
        | 'RESOURCE_CEILING_EXCEEDED';
      readonly message: string;
    }
  | {
      readonly status: 'storage-failure';
      readonly reasonCode: 'TRANSACTION_TIMEOUT' | 'STORAGE_ERROR';
      readonly message: string;
    }
  | {
      readonly status: 'cancelled';
      readonly message: string;
    };

export class RecoveryAbortError extends Error {
  override readonly name = 'RecoveryAbortError';
  constructor(message = 'Recovery operation cancelled.') {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class StaleSnapshotError extends Error {
  override readonly name = 'StaleSnapshotError';
  constructor(
    readonly detail: StaleSnapshotDetail,
    message = `Snapshot concurrency violation: ${detail}`
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class DestinationCollisionError extends Error {
  override readonly name = 'DestinationCollisionError';
  constructor(message = 'Destination ID collision detected.') {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ResourceCeilingError extends Error {
  override readonly name = 'ResourceCeilingError';
  constructor(
    readonly reasonCode: string,
    message: string
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export type RecoveryCommitBlockedReasonCode =
  | 'INVALID_PLAN_TOKEN'
  | 'TOKEN_ALREADY_COMMITTING'
  | 'TOKEN_ALREADY_CONSUMED'
  | 'INVALID_GENERATED_ID'
  | 'INVALID_CLOCK'
  | 'SCHEMA_VALIDATION_FAILED'
  | 'RESOURCE_CEILING_EXCEEDED';

export class RecoveryCommitError extends Error {
  override readonly name = 'RecoveryCommitError';
  constructor(
    readonly code: RecoveryCommitBlockedReasonCode,
    message: string = code
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
