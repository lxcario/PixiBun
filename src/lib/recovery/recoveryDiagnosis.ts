/**
 * recoveryDiagnosis.ts
 *
 * Bounded Read-Only Stored-Blob Assessment Engine for PixiBun Atelier.
 *
 * Scans persisted project records and blobs without modifying stored data.
 * Performs keyset pagination on [projectId+id] compound index with 24-byte
 * PNG header probes.
 *
 * NOTE FOR FUTURE COMMIT PIPELINES:
 * The eventual recovered-copy commit must rescan and revalidate all selected layers;
 * it must not trust a truncated diagnostic preview.
 */

import Dexie from 'dexie';
import { db, type StoredProject, type StoredLayerBlob, type RecoveryRecord } from '@/lib/storage/db';
import { classifyProjectMetadata } from './recoveryClassifier';
import {
  type StoredRecoveryAssessment,
  type StoredProjectSnapshot,
  RecoveryAbortError,
  type InvalidLayerReason,
  type InvalidLayerDescriptor,
  type InvalidLayerSummary,
  type OrphanBlobDetail,
  type OrphanBlobSummary,
  type RecoveryScanProgress,
  type RecoveryReasonCode,
  sortReasonCodes,
} from './recoveryTypes';
import { RECOVERY_INSPECTION_CEILINGS } from './recoveryLimits';
import { ImageHeaderProbe } from '@/lib/safety/imageHeaderProbe';

export interface RecoveryAssessmentOptions {
  signal?: AbortSignal;
  onProgress?: (progress: RecoveryScanProgress) => void;
}

interface LayerMetadataInfo {
  hasEmbeddedRaster: boolean;
  blobCount: number;
  blobReasons: InvalidLayerReason[];
}

const INVALID_LAYER_REASON_PRIORITY: Record<InvalidLayerReason, number> = {
  CORRUPTED_PNG_HEADER: 1,
  BLOB_DIMENSION_MISMATCH: 2,
  DUPLICATE_BLOB_MAPPING: 3,
  EMBEDDED_RASTER_UNSUPPORTED: 4,
};

/**
 * Captures an authoritative single bounded snapshot of a project, its complete
 * layer blobs keyspace, and its recovery ledger record in a single read-only transaction.
 */
export async function acquireStoredProjectSnapshot(
  projectId: string,
  options?: { signal?: AbortSignal }
): Promise<StoredProjectSnapshot> {
  if (options?.signal?.aborted) {
    throw new RecoveryAbortError('Recovery snapshot acquisition cancelled.');
  }

  if (
    typeof projectId !== 'string' ||
    projectId.trim().length === 0 ||
    projectId.length > RECOVERY_INSPECTION_CEILINGS.MAX_IDENTIFIER_LENGTH
  ) {
    throw new TypeError(
      `Invalid projectId: must be non-empty string <= ${RECOVERY_INSPECTION_CEILINGS.MAX_IDENTIFIER_LENGTH}`
    );
  }

  if (!db.isOpen()) {
    await db.open();
  }

  let projectRecord: StoredProject | undefined;
  let sourceBlobs: StoredLayerBlob[] = [];
  let ledgerRecord: RecoveryRecord | undefined;

  try {
    await db.transaction('r', [db.projects, db.layerBlobs, db.recoveryRecords], async () => {
      if (options?.signal?.aborted) {
        throw new RecoveryAbortError('Recovery snapshot acquisition cancelled.');
      }
      projectRecord = await db.projects.get(projectId);

      if (options?.signal?.aborted) {
        throw new RecoveryAbortError('Recovery snapshot acquisition cancelled.');
      }
      sourceBlobs = await db.layerBlobs
        .where('[projectId+id]')
        .between([projectId, Dexie.minKey], [projectId, Dexie.maxKey], true, true)
        .limit(RECOVERY_INSPECTION_CEILINGS.MAX_INSPECTABLE_STORED_BLOBS + 1)
        .toArray();

      if (options?.signal?.aborted) {
        throw new RecoveryAbortError('Recovery snapshot acquisition cancelled.');
      }
      ledgerRecord = await db.recoveryRecords.get(projectId);
    });
  } catch (err) {
    if (
      options?.signal?.aborted ||
      err instanceof RecoveryAbortError ||
      (err as { name?: string })?.name === 'AbortError'
    ) {
      throw new RecoveryAbortError('Recovery snapshot acquisition cancelled.');
    }
    throw err;
  }

  return Object.freeze({
    projectRecord,
    sourceBlobs: Object.freeze(sourceBlobs),
    ledgerRecord,
  });
}

/**
 * Assesses an already captured StoredProjectSnapshot purely in memory.
 * Performs zero database operations.
 */
export async function assessStoredSnapshot(
  snapshot: StoredProjectSnapshot,
  options?: RecoveryAssessmentOptions,
  fallbackProjectId?: string
): Promise<StoredRecoveryAssessment> {
  const projectId = snapshot.projectRecord?.id ?? fallbackProjectId ?? 'unknown';

  if (options?.signal?.aborted) {
    return {
      status: 'cancelled',
      projectId,
      message: 'Recovery scan was cancelled before execution.',
    };
  }

  const projectRecord = snapshot.projectRecord;
  if (!projectRecord) {
    return {
      status: 'not-found',
      projectId,
      message: `Project "${projectId}" not found in database.`,
    };
  }

  // 1. Validate dataJson presence
  if (!projectRecord.dataJson || typeof projectRecord.dataJson !== 'string') {
    return {
      status: 'malformed',
      projectId,
      reasonCode: 'MALFORMED_METADATA',
      reasonCodes: ['MALFORMED_METADATA'],
      message: 'Stored project record has missing or empty dataJson payload.',
    };
  }

  // 2. Classify metadata
  const classification = classifyProjectMetadata(projectRecord.dataJson);

  if (classification.status === 'malformed') {
    return {
      status: 'malformed',
      projectId,
      reasonCode: classification.reasonCode,
      reasonCodes: [classification.reasonCode],
      message: classification.message,
      details: classification.details,
    };
  }

  if (classification.status === 'unsupported-version') {
    return {
      status: 'unsupported-version',
      projectId,
      reasonCode: 'UNSUPPORTED_FUTURE_VERSION',
      reasonCodes: ['UNSUPPORTED_FUTURE_VERSION'],
      foundVersion: classification.foundVersion,
      supportedVersion: classification.supportedVersion,
      message: classification.message,
    };
  }

  if (classification.status === 'unsafe-content') {
    return {
      status: 'unsafe-content',
      projectId,
      reasonCode: classification.reasonCode,
      reasonCodes: [classification.reasonCode],
      message: classification.message,
      details: classification.details,
    };
  }

  // 3. Metadata is valid or recoverable-envelope-exceeded: proceed to blob scanning
  const metadataLayers = new Map<string, Map<number, LayerMetadataInfo>>();
  for (let f = 0; f < classification.project.frames.length; f++) {
    const frame = classification.project.frames[f];
    for (let l = 0; l < frame.layers.length; l++) {
      const layer = frame.layers[l];
      let frameMap = metadataLayers.get(layer.id);
      if (!frameMap) {
        frameMap = new Map();
        metadataLayers.set(layer.id, frameMap);
      }
      frameMap.set(f, {
        hasEmbeddedRaster: typeof layer.pngBase64 === 'string',
        blobCount: 0,
        blobReasons: [],
      });
    }
  }

  if (snapshot.sourceBlobs.length > RECOVERY_INSPECTION_CEILINGS.MAX_INSPECTABLE_STORED_BLOBS) {
    return {
      status: 'unsafe-content',
      projectId,
      reasonCode: 'EXCESSIVE_STORED_BLOBS',
      reasonCodes: ['EXCESSIVE_STORED_BLOBS'],
      message: `Project exceeds recovery blob inspection ceiling (${RECOVERY_INSPECTION_CEILINGS.MAX_INSPECTABLE_STORED_BLOBS} blobs).`,
    };
  }

  let lastSeenId: number | undefined = undefined;
  let scannedBlobs = 0;
  let totalOrphans = 0;
  let duplicateOrphans = 0;
  const orphanDetails: OrphanBlobDetail[] = [];
  const orphanSeen = new Map<string, Set<number>>();

  for (let i = 0; i < snapshot.sourceBlobs.length; i++) {
    if (options?.signal?.aborted) {
      return {
        status: 'cancelled',
        projectId,
        message: 'Recovery scan was cancelled.',
      };
    }

    const record = snapshot.sourceBlobs[i];

    // Validate primary key: must be a positive safe integer and strictly monotonic
    if (
      typeof record.id !== 'number' ||
      !Number.isSafeInteger(record.id) ||
      record.id <= 0 ||
      (lastSeenId !== undefined && record.id <= lastSeenId)
    ) {
      return {
        status: 'unsafe-content',
        projectId,
        reasonCode: 'CORRUPTED_STORED_BLOB_RECORD',
        reasonCodes: ['CORRUPTED_STORED_BLOB_RECORD'],
        message:
          'Corrupted stored blob record: primary key is not a positive safe integer or non-monotonic.',
      };
    }
    lastSeenId = record.id;
    scannedBlobs++;

    // Validate untrusted blob record structure
    const isValidRecord =
      typeof record.projectId === 'string' &&
      record.projectId === projectId &&
      typeof record.layerId === 'string' &&
      record.layerId.length > 0 &&
      record.layerId.length <= RECOVERY_INSPECTION_CEILINGS.MAX_IDENTIFIER_LENGTH &&
      typeof record.frameIndex === 'number' &&
      Number.isSafeInteger(record.frameIndex) &&
      record.frameIndex >= 0 &&
      record.blob instanceof Blob &&
      typeof record.blob.size === 'number' &&
      Number.isSafeInteger(record.blob.size) &&
      record.blob.size >= 0;

    if (!isValidRecord) {
      return {
        status: 'unsafe-content',
        projectId,
        reasonCode: 'CORRUPTED_STORED_BLOB_RECORD',
        reasonCodes: ['CORRUPTED_STORED_BLOB_RECORD'],
        message:
          'Corrupted stored blob record: invalid field types, bounds, or unsafe integers.',
      };
    }

    // Match against metadata
    const layerEntry = metadataLayers.get(record.layerId)?.get(record.frameIndex);
    if (!layerEntry) {
      // Orphan blob
      totalOrphans++;
      let seenFrames = orphanSeen.get(record.layerId);
      if (!seenFrames) {
        seenFrames = new Set();
        orphanSeen.set(record.layerId, seenFrames);
      }
      if (seenFrames.has(record.frameIndex)) {
        duplicateOrphans++;
      } else {
        seenFrames.add(record.frameIndex);
        if (orphanDetails.length < RECOVERY_INSPECTION_CEILINGS.MAX_RECORDED_ORPHAN_DETAILS) {
          orphanDetails.push({
            recordId: record.id,
            ordinal: totalOrphans,
            frameIndex: record.frameIndex,
            sizeBytes: record.blob.size,
          });
        }
      }
      continue;
    }

    // Matched layer in metadata
    layerEntry.blobCount++;
    if (layerEntry.blobCount > 1) {
      if (!layerEntry.blobReasons.includes('DUPLICATE_BLOB_MAPPING')) {
        layerEntry.blobReasons.push('DUPLICATE_BLOB_MAPPING');
      }
    } else {
      if (options?.signal?.aborted) {
        return {
          status: 'cancelled',
          projectId,
          message: 'Recovery scan was cancelled.',
        };
      }

      try {
        const slice = record.blob.slice(0, 24);
        const probed = await ImageHeaderProbe.probe(slice);

        if (options?.signal?.aborted) {
          return {
            status: 'cancelled',
            projectId,
            message: 'Recovery scan was cancelled.',
          };
        }

        if (probed.format !== 'PNG') {
          layerEntry.blobReasons.push('CORRUPTED_PNG_HEADER');
        } else if (
          probed.width !== classification.project.width ||
          probed.height !== classification.project.height
        ) {
          layerEntry.blobReasons.push('BLOB_DIMENSION_MISMATCH');
        }
      } catch {
        layerEntry.blobReasons.push('CORRUPTED_PNG_HEADER');
      }
    }

    const isBatchBoundary = (i + 1) % RECOVERY_INSPECTION_CEILINGS.BLOB_SCAN_BATCH_SIZE === 0;
    const isLastItem = i === snapshot.sourceBlobs.length - 1;
    if (isBatchBoundary || isLastItem) {
      if (options?.signal?.aborted) {
        return {
          status: 'cancelled',
          projectId,
          message: 'Recovery scan was cancelled.',
        };
      }
      if (options?.onProgress) {
        try {
          options.onProgress({
            scannedBlobs,
            currentBatchSize: isBatchBoundary
              ? RECOVERY_INSPECTION_CEILINGS.BLOB_SCAN_BATCH_SIZE
              : (snapshot.sourceBlobs.length % RECOVERY_INSPECTION_CEILINGS.BLOB_SCAN_BATCH_SIZE),
          });
        } catch {
          // Observational
        }
      }
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
  }

  // 5. Evaluate retained metadata layers into a strictly bounded InvalidLayerSummary
  let affectedLayerCount = 0;
  let totalReasonCount = 0;
  const invalidLayerDetails: InvalidLayerDescriptor[] = [];
  const collectedReasonCodes = new Set<RecoveryReasonCode>();

  if (classification.status === 'recoverable-envelope-exceeded') {
    for (const code of classification.reasonCodes) {
      collectedReasonCodes.add(code);
    }
  }

  for (const [layerId, frameMap] of metadataLayers.entries()) {
    for (const [frameIndex, entry] of frameMap.entries()) {
      const reasonsForLayer: InvalidLayerReason[] = [];
      if (entry.hasEmbeddedRaster) {
        reasonsForLayer.push('EMBEDDED_RASTER_UNSUPPORTED');
      }
      for (const r of entry.blobReasons) {
        if (!reasonsForLayer.includes(r)) {
          reasonsForLayer.push(r);
        }
      }

      if (reasonsForLayer.length > 0) {
        reasonsForLayer.sort(
          (a, b) => INVALID_LAYER_REASON_PRIORITY[a] - INVALID_LAYER_REASON_PRIORITY[b]
        );
        affectedLayerCount++;
        totalReasonCount += reasonsForLayer.length;
        for (const r of reasonsForLayer) {
          collectedReasonCodes.add(r);
        }

        if (invalidLayerDetails.length < RECOVERY_INSPECTION_CEILINGS.MAX_RECORDED_INVALID_LAYERS) {
          invalidLayerDetails.push({
            layerId,
            frameIndex,
            reason: reasonsForLayer[0],
            reasons: reasonsForLayer,
          });
        }
      }
    }
  }

  const invalidLayerSummary: InvalidLayerSummary = {
    affectedLayerCount,
    totalReasonCount,
    detailsTruncated: affectedLayerCount > invalidLayerDetails.length,
    details: invalidLayerDetails,
  };

  const orphanSummary: OrphanBlobSummary = {
    totalCount: totalOrphans,
    duplicateCount: duplicateOrphans,
    detailsTruncated: totalOrphans > orphanDetails.length,
    details: orphanDetails,
  };

  // 6. Produce final deterministic assessment
  if (affectedLayerCount > 0) {
    return {
      status: 'recoverable-blob-invalid',
      projectId,
      project: classification.project,
      metadata: classification.metadata,
      invalidLayerSummary,
      violations:
        classification.status === 'recoverable-envelope-exceeded'
          ? classification.violations
          : undefined,
      reasonCodes: sortReasonCodes(Array.from(collectedReasonCodes)),
      orphanSummary,
      scannedBlobsCount: scannedBlobs,
    };
  }

  if (classification.status === 'recoverable-envelope-exceeded') {
    return {
      status: 'recoverable-envelope-exceeded',
      projectId,
      project: classification.project,
      metadata: classification.metadata,
      violations: classification.violations,
      reasonCodes: sortReasonCodes(classification.reasonCodes),
      orphanSummary,
      scannedBlobsCount: scannedBlobs,
    };
  }

  return {
    status: 'valid',
    projectId,
    project: classification.project,
    metadata: classification.metadata,
    orphanSummary,
    scannedBlobsCount: scannedBlobs,
  };
}

/**
 * Assesses a stored project and its associated layer blobs in IndexedDB.
 * Delegates to acquireStoredProjectSnapshot and assessStoredSnapshot.
 */
export async function assessStoredProject(
  projectId: string,
  options?: RecoveryAssessmentOptions
): Promise<StoredRecoveryAssessment> {
  if (options?.signal?.aborted) {
    return {
      status: 'cancelled',
      projectId,
      message: 'Recovery scan was cancelled before execution.',
    };
  }

  if (
    typeof projectId !== 'string' ||
    projectId.trim().length === 0 ||
    projectId.length > RECOVERY_INSPECTION_CEILINGS.MAX_IDENTIFIER_LENGTH
  ) {
    return {
      status: 'unsafe-content',
      projectId,
      reasonCode: 'MALFORMED_METADATA',
      reasonCodes: ['MALFORMED_METADATA'],
      message: 'Invalid projectId: must be a non-empty string within bound.',
    };
  }

  if (!db.isOpen()) {
    try {
      await db.open();
    } catch (err) {
      return {
        status: 'transient-load-failure',
        projectId,
        message: err instanceof Error ? err.message : 'Database failed to open.',
      };
    }
  }

  let snapshot: StoredProjectSnapshot;
  try {
    snapshot = await acquireStoredProjectSnapshot(projectId, { signal: options?.signal });
  } catch (err) {
    if (
      options?.signal?.aborted ||
      err instanceof RecoveryAbortError ||
      (err as { name?: string })?.name === 'AbortError'
    ) {
      return {
        status: 'cancelled',
        projectId,
        message: 'Recovery scan was cancelled.',
      };
    }
    return {
      status: 'transient-load-failure',
      projectId,
      message: err instanceof Error ? err.message : 'Failed to query database tables.',
    };
  }

  return assessStoredSnapshot(snapshot, options, projectId);
}
