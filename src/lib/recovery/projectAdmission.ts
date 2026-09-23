/**
 * projectAdmission.ts
 *
 * Authoritative Stored-Project Admission Boundary & Lifecycle Engine for PixiBun Atelier.
 *
 * Establishes a single safe admission boundary between persisted IndexedDB project data
 * and normal editor hydration.
 *
 * Core Invariant:
 * No stored project may enter normal editor hydration until both its metadata and its
 * persisted Blob state have passed bounded pre-hydration admission checks.
 */

import type { ProjectFile } from '@/types/project';
import type { StoredLayerBlob } from '@/lib/storage/db';
import { validateProjectFile } from '@/lib/project/schema';
import { RECOVERY_INSPECTION_CEILINGS } from './recoveryLimits';
import {
  type StoredProjectSnapshot,
  type StoredRecoveryAssessment,
  type RecoverableStoredAssessment,
  type RecoveryScanProgress,
  RecoveryAbortError,
} from './recoveryTypes';
import {
  acquireStoredProjectSnapshot,
  assessStoredSnapshot,
} from './recoveryDiagnosis';

// ============================================================================
// Lifecycle & Admission Types
// ============================================================================

export interface PendingRecoveryContext {
  readonly sourceProjectId: string;
  readonly assessment: StoredRecoveryAssessment;
}

export interface StartupIssueContext {
  readonly kind: 'transient-failure' | 'unsupported-version' | 'blocked' | 'hydration-failure';
  readonly sourceProjectId?: string;
  readonly reasonCode?: string;
  readonly message: string;
}

/**
 * Discriminated lifecycle state for studio restore/open operations.
 */
export type RestoreLifecycleState =
  | { readonly phase: 'idle' }
  | { readonly phase: 'loading'; readonly projectId: string }
  | { readonly phase: 'assessing'; readonly projectId: string }
  | { readonly phase: 'hydrating'; readonly projectId: string }
  | {
      readonly phase: 'active';
      readonly projectId: string;
      readonly pendingRecovery?: PendingRecoveryContext;
      readonly startupIssue?: StartupIssueContext;
    }
  | { readonly phase: 'recovery-required'; readonly projectId: string; readonly assessment: StoredRecoveryAssessment }
  | { readonly phase: 'unsupported-version'; readonly projectId: string; readonly foundVersion: number; readonly supportedVersion: number; readonly message: string }
  | { readonly phase: 'blocked'; readonly projectId: string; readonly reasonCode: string; readonly message: string }
  | { readonly phase: 'transient-failure'; readonly projectId: string; readonly message: string }
  | { readonly phase: 'hydration-failure'; readonly projectId: string; readonly message: string }
  | { readonly phase: 'cancelled' };

/**
 * Result of inspecting a stored IndexedDB project for hydration admission.
 */
export type StoredProjectAdmissionResult =
  | {
      readonly status: 'admitted';
      readonly project: Readonly<ProjectFile>;
      readonly projectId: string;
      readonly sourceBlobs: readonly Readonly<StoredLayerBlob>[];
    }
  | {
      readonly status: 'recovery-required';
      readonly projectId: string;
      readonly assessment: RecoverableStoredAssessment;
    }
  | {
      readonly status: 'unsupported-version';
      readonly projectId: string;
      readonly foundVersion: number;
      readonly supportedVersion: number;
      readonly message: string;
    }
  | {
      readonly status: 'blocked';
      readonly projectId: string;
      readonly reasonCode: string;
      readonly message: string;
    }
  | {
      readonly status: 'not-found';
      readonly projectId: string;
    }
  | {
      readonly status: 'transient-failure';
      readonly projectId: string;
      readonly message: string;
    }
  | {
      readonly status: 'cancelled';
    };

export interface AdmissionOptions {
  readonly signal?: AbortSignal;
  readonly onProgress?: (progress: RecoveryScanProgress) => void;
}

// ============================================================================
// Immutability Utilities
// ============================================================================

/**
 * Deeply and recursively freezes an object graph to guarantee public runtime immutability.
 * Exempts Blob instances since browser Blobs are natively immutable.
 */
export function deepFreeze<T>(obj: T, seen = new WeakSet<object>()): Readonly<T> {
  if (obj === null || typeof obj !== 'object' || Object.isFrozen(obj)) {
    return obj;
  }
  if (typeof Blob !== 'undefined' && obj instanceof Blob) {
    return obj;
  }
  if (seen.has(obj as object)) {
    return obj;
  }
  seen.add(obj as object);
  for (const key of Object.getOwnPropertyNames(obj)) {
    const value = (obj as Record<string, unknown>)[key];
    if (value !== null && typeof value === 'object') {
      deepFreeze(value, seen);
    }
  }
  return Object.freeze(obj);
}

// ============================================================================
// Core Admission Functions
// ============================================================================

/**
 * Pure derivation: whether autosave may fire in the given lifecycle phase.
 * Invariant: autosave may resume only when the live workspace is established ('active').
 */
export function isAutosavePermitted(phase: RestoreLifecycleState['phase']): boolean {
  return phase === 'active';
}

/**
 * Authoritative stored-project admission boundary.
 *
 * Accepts a project ID and optional signal only.
 * Internally acquires a single bounded snapshot from IndexedDB, runs the full
 * Phase 1B.2 metadata classification and bounded keyspace Blob assessment,
 * then performs strict validateProjectFile() validation before admitting.
 *
 * Rejects any non-valid assessment before hydration.
 * Returns only frozen, immutable data needed for safe hydration.
 */
export async function inspectAndAdmitStoredProject(
  projectId: string,
  options?: AdmissionOptions
): Promise<StoredProjectAdmissionResult> {
  if (options?.signal?.aborted) {
    return { status: 'cancelled' };
  }

  if (
    typeof projectId !== 'string' ||
    projectId.trim().length === 0 ||
    projectId.length > RECOVERY_INSPECTION_CEILINGS.MAX_IDENTIFIER_LENGTH
  ) {
    return {
      status: 'blocked',
      projectId: String(projectId),
      reasonCode: 'INVALID_PROJECT_ID',
      message: `Invalid projectId: must be a non-empty string <= ${RECOVERY_INSPECTION_CEILINGS.MAX_IDENTIFIER_LENGTH}`,
    };
  }

  let snapshot: StoredProjectSnapshot;
  try {
    snapshot = await acquireStoredProjectSnapshot(projectId, { signal: options?.signal });
  } catch (err: unknown) {
    if (options?.signal?.aborted || err instanceof RecoveryAbortError) {
      return { status: 'cancelled' };
    }
    return {
      status: 'transient-failure',
      projectId,
      message: err instanceof Error ? err.message : 'Database snapshot acquisition failed.',
    };
  }

  if (options?.signal?.aborted) {
    return { status: 'cancelled' };
  }

  if (!snapshot.projectRecord) {
    return { status: 'not-found', projectId };
  }

  let assessment: StoredRecoveryAssessment;
  try {
    assessment = await assessStoredSnapshot(snapshot, options);
  } catch (err: unknown) {
    if (options?.signal?.aborted || err instanceof RecoveryAbortError) {
      return { status: 'cancelled' };
    }
    return {
      status: 'transient-failure',
      projectId,
      message: err instanceof Error ? err.message : 'Stored snapshot assessment failed.',
    };
  }

  if (options?.signal?.aborted || assessment.status === 'cancelled') {
    return { status: 'cancelled' };
  }

  switch (assessment.status) {
    case 'not-found':
      return { status: 'not-found', projectId };

    case 'transient-load-failure':
      return {
        status: 'transient-failure',
        projectId,
        message: assessment.message,
      };

    case 'unsupported-version':
      return {
        status: 'unsupported-version',
        projectId,
        foundVersion: assessment.foundVersion,
        supportedVersion: assessment.supportedVersion,
        message: assessment.message,
      };

    case 'malformed':
      return {
        status: 'blocked',
        projectId,
        reasonCode: assessment.reasonCode,
        message: assessment.message,
      };

    case 'unsafe-content':
      return {
        status: 'blocked',
        projectId,
        reasonCode: assessment.reasonCode,
        message: assessment.message,
      };

    case 'recoverable-envelope-exceeded':
    case 'recoverable-blob-invalid':
      return {
        status: 'recovery-required',
        projectId,
        assessment,
      };

    case 'valid': {
      // Defense-in-depth: strict validation before admission
      const strictResult = validateProjectFile(assessment.project);
      if (!strictResult.ok) {
        return {
          status: 'blocked',
          projectId,
          reasonCode: 'STRICT_VALIDATION_FAILED',
          message: strictResult.error,
        };
      }

      // Snapshot descriptor immutability: freeze each layer blob descriptor and the array
      const frozenBlobs = Object.freeze(
        snapshot.sourceBlobs.map((b) =>
          Object.freeze({
            id: b.id,
            projectId: b.projectId,
            layerId: b.layerId,
            frameIndex: b.frameIndex,
            blob: b.blob,
            updatedAt: b.updatedAt,
          })
        )
      );

      // Deep freeze the strict-validated ProjectFile
      const frozenProject = deepFreeze(structuredClone(strictResult.value));

      return {
        status: 'admitted',
        project: frozenProject,
        projectId,
        sourceBlobs: frozenBlobs,
      };
    }
  }
}
