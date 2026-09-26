/**
 * recoveryPlanBuilder.ts
 *
 * Phase 1B.5: Deterministic Recovery Plan Builder and Safe Candidate Reconstruction.
 *
 * Synthesizes validated diagnostic assessments and authoritative source blob snapshots
 * into deterministic, immutable candidate reconstruction plans. Defensively analyzes
 * blob mappings, probes raster headers without decoding or canvas allocation, enforces
 * strict structural & envelope validation hierarchies, and guarantees zero-or-one blob
 * invariants with zero compound delimiter serialization.
 */

import {
  PROJECT_FORMAT_ID,
  PROJECT_FORMAT_VERSION,
  type ProjectFile,
  type SerializedFrame,
  type SerializedLayer,
} from '@/types/project';
import type { AnimationClip } from '@/types/animation';
import { WORKSPACE_ENVELOPE } from '@/config/canvasLimits';
import { RECOVERY_INSPECTION_CEILINGS } from './recoveryLimits';
import { ImageHeaderProbe } from '@/lib/safety/imageHeaderProbe';
import { validateProjectWithPolicy } from '@/lib/project/schema';
import { validateProjectResourceBudget } from '@/lib/project/resourceBudget';
import type {
  RecoveryPlanBuilderInput,
  RecoveryPlanBuilderOptions,
  CandidateBlobRemapEntry,
  CandidateRecoveryPlan,
  AffectedClipDescriptor,
  AdditionalDeletionItem,
  PlanAdditionalDeletionReason,
  PlanBlockedReasonCode,
  RecoveryPlanResult,
  EnvelopeViolation,
  EnvelopeViolationCode,
} from './recoveryTypes';

const CANONICAL_DELETION_REASON_RANK: Readonly<Record<PlanAdditionalDeletionReason, number>> = {
  DUPLICATE_BLOB_MAPPING: 1,
  CORRUPTED_PNG_HEADER: 2,
  BLOB_DIMENSION_MISMATCH: 3,
  EMPTY_FRAME_REQUIRES_DELETION: 4,
  ENVELOPE_MAX_FRAMES: 5,
  ENVELOPE_MAX_LAYERS_PER_FRAME: 6,
  ENVELOPE_MAX_TOTAL_LAYERS: 7,
  ENVELOPE_MAX_MEGAPIXELS: 8,
};

/**
 * Immutable internal snapshot of a source blob record captured during synchronous preflight.
 * Decoupled completely from caller object references and caller mutation.
 */
interface InternalRecoverySourceBlob {
  readonly recordId: number;
  readonly projectId: string;
  readonly layerId: string;
  readonly frameIndex: number;
  readonly updatedAt: number;
  readonly sizeBytes: number;
  readonly mimeType: string;
  readonly headerSlice: Blob;
}

/**
 * Deeply and recursively freezes an object graph to guarantee public runtime immutability.
 */
function deepFreeze<T>(obj: T, seen = new WeakSet<object>()): Readonly<T> {
  if (obj === null || typeof obj !== 'object' || Object.isFrozen(obj)) {
    return obj;
  }
  if (seen.has(obj)) {
    return obj;
  }
  seen.add(obj);
  for (const key of Object.getOwnPropertyNames(obj)) {
    const value = (obj as Record<string, unknown>)[key];
    if (value !== null && typeof value === 'object') {
      deepFreeze(value, seen);
    }
  }
  return Object.freeze(obj);
}

function createBlockedResult(
  reasonCode: PlanBlockedReasonCode,
  message: string,
  details?: string
): RecoveryPlanResult {
  return deepFreeze({
    status: 'unrecoverable-blocked' as const,
    reasonCode,
    message,
    details,
  });
}

function createCancelledResult(message: string): RecoveryPlanResult {
  return deepFreeze({
    status: 'cancelled' as const,
    message,
  });
}

/**
 * Sorts required deletion items canonically:
 * 1. Project frame index ascending (or -1 if unindexed)
 * 2. Layer position in frame ascending (or -1 if unindexed)
 * 3. Canonical reason code rank ascending
 */
function sortRequiredDeletions(
  items: AdditionalDeletionItem[],
  frameLayerOrderMap: Map<number, Map<string, number>>
): AdditionalDeletionItem[] {
  return items.sort((a, b) => {
    const frameA = a.frameIndex ?? -1;
    const frameB = b.frameIndex ?? -1;
    if (frameA !== frameB) {
      return frameA - frameB;
    }

    const layerOrderA =
      a.layerId !== undefined && frameLayerOrderMap.get(frameA)?.has(a.layerId)
        ? (frameLayerOrderMap.get(frameA)!.get(a.layerId) ?? -1)
        : -1;
    const layerOrderB =
      b.layerId !== undefined && frameLayerOrderMap.get(frameB)?.has(b.layerId)
        ? (frameLayerOrderMap.get(frameB)!.get(b.layerId) ?? -1)
        : -1;
    if (layerOrderA !== layerOrderB) {
      return layerOrderA - layerOrderB;
    }

    const rankA = CANONICAL_DELETION_REASON_RANK[a.reason] ?? 999;
    const rankB = CANONICAL_DELETION_REASON_RANK[b.reason] ?? 999;
    return rankA - rankB;
  });
}

/**
 * Core domain entry point for building a deterministic recovery plan.
 */
export async function buildRecoveryPlan(
  input: RecoveryPlanBuilderInput,
  options?: RecoveryPlanBuilderOptions
): Promise<RecoveryPlanResult> {
  const signal = options?.signal;

  // Immediately check pre-aborted cancellation before any expensive preflight work
  if (signal?.aborted) {
    return createCancelledResult('Recovery plan building cancelled by caller.');
  }

  // ---------------------------------------------------------------------------
  // 1. Synchronous Preflight: Single-Evaluation Capture of Assessment & Project
  // ---------------------------------------------------------------------------
  if (!input || typeof input !== 'object') {
    return createBlockedResult('INVALID_ASSESSMENT', 'Plan builder requires an input object.');
  }

  const assessment = input.assessment;
  if (!assessment || typeof assessment !== 'object') {
    return createBlockedResult(
      'INVALID_ASSESSMENT',
      'Assessment does not represent a valid recoverable stored state or has invalid bounds.'
    );
  }

  // Single-evaluation capture of assessment boundary properties into local variables
  const rawStatus = assessment.status;
  const rawProjectId = assessment.projectId;
  const rawProject = assessment.project;
  const rawMetadata = assessment.metadata;
  const rawScannedBlobsCount = assessment.scannedBlobsCount;

  if (
    (rawStatus !== 'recoverable-envelope-exceeded' &&
      rawStatus !== 'recoverable-blob-invalid') ||
    typeof rawProjectId !== 'string' ||
    rawProjectId.trim().length === 0 ||
    rawProjectId.length > RECOVERY_INSPECTION_CEILINGS.MAX_IDENTIFIER_LENGTH ||
    !rawProject ||
    typeof rawProject !== 'object' ||
    !rawMetadata ||
    typeof rawMetadata !== 'object' ||
    !Number.isSafeInteger(rawScannedBlobsCount) ||
    rawScannedBlobsCount < 0 ||
    rawScannedBlobsCount > RECOVERY_INSPECTION_CEILINGS.MAX_INSPECTABLE_STORED_BLOBS
  ) {
    return createBlockedResult(
      'INVALID_ASSESSMENT',
      'Assessment does not represent a valid recoverable stored state or has invalid bounds.'
    );
  }

  // Validate the captured source project immediately before any await
  const sourceValidation = validateProjectWithPolicy(rawProject, {
    envelopeMode: 'collect-recoverable',
  });
  if (!sourceValidation.ok) {
    return createBlockedResult(
      'INVALID_ASSESSMENT',
      sourceValidation.error,
      sourceValidation.details
    );
  }

  // Authoritative private snapshot of source project
  const safeSourceProject: ProjectFile = sourceValidation.value;
  const safeProjectId = rawProjectId;
  const safeScannedBlobsCount = rawScannedBlobsCount;

  // ---------------------------------------------------------------------------
  // 2. Synchronous Preflight: Single-Evaluation Capture of Decisions
  // ---------------------------------------------------------------------------
  const rawDecisions = input.decisions;
  let rawDeleteFrameIndices: readonly number[] = [];
  let rawDeleteLayerIds: readonly string[] = [];
  let clipConsentGranted = false;

  if (rawDecisions !== undefined) {
    if (typeof rawDecisions !== 'object' || rawDecisions === null || Array.isArray(rawDecisions)) {
      return createBlockedResult(
        'INVALID_RECOVERY_DECISIONS',
        'Decisions must be a plain object.'
      );
    }

    // Single-evaluation capture of decision properties into local variables
    const capturedDeleteFrameIndices = rawDecisions.deleteFrameIndices;
    const capturedDeleteLayerIds = rawDecisions.deleteLayerIds;
    const capturedClipConsentGranted = rawDecisions.clipConsentGranted;

    if (capturedDeleteFrameIndices !== undefined) {
      if (!Array.isArray(capturedDeleteFrameIndices)) {
        return createBlockedResult(
          'INVALID_RECOVERY_DECISIONS',
          'deleteFrameIndices is invalid or exceeds bounds.'
        );
      }
      const frameIndicesLen = capturedDeleteFrameIndices.length;
      if (
        !Number.isSafeInteger(frameIndicesLen) ||
        frameIndicesLen < 0 ||
        frameIndicesLen > RECOVERY_INSPECTION_CEILINGS.MAX_INSPECTABLE_FRAMES
      ) {
        return createBlockedResult(
          'INVALID_RECOVERY_DECISIONS',
          'deleteFrameIndices is invalid or exceeds bounds.'
        );
      }
      const safeDeleteFrameIndices: number[] = new Array(frameIndicesLen);
      for (let i = 0; i < frameIndicesLen; i++) {
        safeDeleteFrameIndices[i] = capturedDeleteFrameIndices[i];
      }
      rawDeleteFrameIndices = safeDeleteFrameIndices;
    }

    if (capturedDeleteLayerIds !== undefined) {
      if (!Array.isArray(capturedDeleteLayerIds)) {
        return createBlockedResult(
          'INVALID_RECOVERY_DECISIONS',
          'deleteLayerIds is invalid or exceeds bounds.'
        );
      }
      const layerIdsLen = capturedDeleteLayerIds.length;
      if (
        !Number.isSafeInteger(layerIdsLen) ||
        layerIdsLen < 0 ||
        layerIdsLen > RECOVERY_INSPECTION_CEILINGS.MAX_INSPECTABLE_TOTAL_LAYERS
      ) {
        return createBlockedResult(
          'INVALID_RECOVERY_DECISIONS',
          'deleteLayerIds is invalid or exceeds bounds.'
        );
      }
      const safeDeleteLayerIds: string[] = new Array(layerIdsLen);
      for (let i = 0; i < layerIdsLen; i++) {
        safeDeleteLayerIds[i] = capturedDeleteLayerIds[i];
      }
      rawDeleteLayerIds = safeDeleteLayerIds;
    }

    if (capturedClipConsentGranted !== undefined) {
      if (typeof capturedClipConsentGranted !== 'boolean') {
        return createBlockedResult(
          'INVALID_RECOVERY_DECISIONS',
          'clipConsentGranted must be a boolean.'
        );
      }
      clipConsentGranted = capturedClipConsentGranted;
    }
  }

  // Validate decision indices against safeSourceProject
  const deleteFrameIndicesSet = new Set<number>();
  for (let i = 0; i < rawDeleteFrameIndices.length; i++) {
    const idx = rawDeleteFrameIndices[i];
    if (
      !Number.isSafeInteger(idx) ||
      idx < 0 ||
      idx >= safeSourceProject.frames.length
    ) {
      return createBlockedResult(
        'INVALID_RECOVERY_DECISIONS',
        `deleteFrameIndex ${idx} is out of bounds or not a non-negative safe integer.`
      );
    }
    if (deleteFrameIndicesSet.has(idx)) {
      return createBlockedResult(
        'INVALID_RECOVERY_DECISIONS',
        `Duplicate frame index in decisions: ${idx}.`
      );
    }
    deleteFrameIndicesSet.add(idx);
  }

  // Check all-frame deletion immediately before probing or clip evaluation
  if (
    safeSourceProject.frames.length > 0 &&
    deleteFrameIndicesSet.size === safeSourceProject.frames.length
  ) {
    return createBlockedResult(
      'ALL_FRAMES_DELETED',
      'All frames in the project were marked for deletion. An empty project cannot be recovered.'
    );
  }

  const allProjectLayerIds = new Set<string>();
  for (const frame of safeSourceProject.frames) {
    if (Array.isArray(frame.layers)) {
      for (const layer of frame.layers) {
        if (layer && typeof layer.id === 'string') {
          allProjectLayerIds.add(layer.id);
        }
      }
    }
  }

  const deleteLayerIdsSet = new Set<string>();
  for (let i = 0; i < rawDeleteLayerIds.length; i++) {
    const lid = rawDeleteLayerIds[i];
    if (
      typeof lid !== 'string' ||
      lid.length === 0 ||
      lid.length > RECOVERY_INSPECTION_CEILINGS.MAX_IDENTIFIER_LENGTH ||
      !allProjectLayerIds.has(lid)
    ) {
      return createBlockedResult(
        'INVALID_RECOVERY_DECISIONS',
        `deleteLayerId "${String(lid)}" does not exist in the source project.`
      );
    }
    if (deleteLayerIdsSet.has(lid)) {
      return createBlockedResult(
        'INVALID_RECOVERY_DECISIONS',
        `Duplicate layer ID in decisions: ${lid}.`
      );
    }
    deleteLayerIdsSet.add(lid);
  }

  // ---------------------------------------------------------------------------
  // 3. Synchronous Preflight: Bounded Indexed Capture of Source Records
  // ---------------------------------------------------------------------------
  const rawSourceBlobs = input.sourceBlobs;
  if (!Array.isArray(rawSourceBlobs)) {
    return createBlockedResult(
      'INCOMPLETE_SOURCE_BLOB_SNAPSHOT',
      'sourceBlobs must be a valid array.'
    );
  }

  // Capture length exactly once
  const rawBlobsLen = rawSourceBlobs.length;
  if (
    !Number.isSafeInteger(rawBlobsLen) ||
    rawBlobsLen < 0 ||
    rawBlobsLen > RECOVERY_INSPECTION_CEILINGS.MAX_INSPECTABLE_STORED_BLOBS
  ) {
    return createBlockedResult(
      'INCOMPLETE_SOURCE_BLOB_SNAPSHOT',
      'sourceBlobs length is invalid or exceeds inspection ceilings.'
    );
  }

  // Compare captured length with safeScannedBlobsCount before copying any element
  if (rawBlobsLen !== safeScannedBlobsCount) {
    return createBlockedResult(
      'INCOMPLETE_SOURCE_BLOB_SNAPSHOT',
      `Source blob count (${rawBlobsLen}) does not match assessment scannedBlobsCount (${safeScannedBlobsCount}).`
    );
  }

  // Allocate/copy only according to that captured bounded length
  const internalSourceBlobs: InternalRecoverySourceBlob[] = [];
  const seenRecordIds = new Set<number>();

  for (let i = 0; i < rawBlobsLen; i++) {
    // Read each numeric index exactly once
    const r = rawSourceBlobs[i];
    if (!r || typeof r !== 'object') {
      return createBlockedResult(
        'CORRUPTED_STORED_BLOB_RECORD',
        `Corrupted or invalid source blob record at index ${i}.`
      );
    }

    // Single-evaluation capture of each record's boundary properties into local variables
    const recordId = r.recordId;
    const projectId = r.projectId;
    const layerId = r.layerId;
    const frameIndex = r.frameIndex;
    const updatedAt = r.updatedAt;
    const blob = r.blob;

    if (
      !Number.isSafeInteger(recordId) ||
      recordId <= 0 ||
      seenRecordIds.has(recordId) ||
      projectId !== safeProjectId ||
      typeof layerId !== 'string' ||
      layerId.length === 0 ||
      layerId.length > RECOVERY_INSPECTION_CEILINGS.MAX_IDENTIFIER_LENGTH ||
      !Number.isSafeInteger(frameIndex) ||
      frameIndex < 0 ||
      !Number.isSafeInteger(updatedAt) ||
      updatedAt < 0 ||
      !(blob instanceof Blob)
    ) {
      return createBlockedResult(
        'CORRUPTED_STORED_BLOB_RECORD',
        `Corrupted or invalid source blob record at index ${i}.`
      );
    }

    // After confirming blob instanceof Blob, capture blob.size and blob.type exactly once
    const sizeBytes = blob.size;
    const rawType = blob.type;
    const mimeType = typeof rawType === 'string' ? rawType : '';

    if (!Number.isSafeInteger(sizeBytes) || sizeBytes < 0) {
      return createBlockedResult(
        'CORRUPTED_STORED_BLOB_RECORD',
        `Corrupted or invalid blob size at index ${i}.`
      );
    }

    seenRecordIds.add(recordId);

    // Safely capture header slice synchronously via intrinsic Blob slice on captured blob
    const headerSlice = Blob.prototype.slice.call(blob, 0, 24);

    internalSourceBlobs.push({
      recordId,
      projectId,
      layerId,
      frameIndex,
      updatedAt,
      sizeBytes,
      mimeType,
      headerSlice,
    });
  }

  // ---------------------------------------------------------------------------
  // 4. Index source blobs using structured nested maps (zero delimiter strings)
  // ---------------------------------------------------------------------------
  // Outer key: layerId (string)
  // Inner key: frameIndex (number)
  // Value: InternalRecoverySourceBlob[]
  const layerFrameBlobMap = new Map<string, Map<number, InternalRecoverySourceBlob[]>>();
  const excludedRecordIdSet = new Set<number>();

  const frameLayerOrderMap = new Map<number, Map<string, number>>();
  const projectLayerFrameSet = new Map<string, Set<number>>();

  for (let fIdx = 0; fIdx < safeSourceProject.frames.length; fIdx++) {
    const frame = safeSourceProject.frames[fIdx];
    const layerOrder = new Map<string, number>();
    frameLayerOrderMap.set(fIdx, layerOrder);

    if (Array.isArray(frame.layers)) {
      for (let lIdx = 0; lIdx < frame.layers.length; lIdx++) {
        const layer = frame.layers[lIdx];
        if (layer && typeof layer.id === 'string') {
          layerOrder.set(layer.id, lIdx);
          let frameSet = projectLayerFrameSet.get(layer.id);
          if (!frameSet) {
            frameSet = new Set<number>();
            projectLayerFrameSet.set(layer.id, frameSet);
          }
          frameSet.add(fIdx);
        }
      }
    }
  }

  for (const r of internalSourceBlobs) {
    const framesForLayer = projectLayerFrameSet.get(r.layerId);
    const isOrphan = !framesForLayer || !framesForLayer.has(r.frameIndex);

    if (isOrphan) {
      // Orphans are excluded automatically without requiring layer deletion
      excludedRecordIdSet.add(r.recordId);
      continue;
    }

    const isDeletedByDecision =
      deleteFrameIndicesSet.has(r.frameIndex) || deleteLayerIdsSet.has(r.layerId);

    if (isDeletedByDecision) {
      // Blobs belonging to explicitly deleted layers/frames are excluded
      excludedRecordIdSet.add(r.recordId);
      continue;
    }

    // Surviving layer blob
    let innerMap = layerFrameBlobMap.get(r.layerId);
    if (!innerMap) {
      innerMap = new Map<number, InternalRecoverySourceBlob[]>();
      layerFrameBlobMap.set(r.layerId, innerMap);
    }
    let records = innerMap.get(r.frameIndex);
    if (!records) {
      records = [];
      innerMap.set(r.frameIndex, records);
    }
    records.push(r);
  }

  // ---------------------------------------------------------------------------
  // 5. Probe surviving blobs & evaluate required deletions
  // ---------------------------------------------------------------------------
  if (signal?.aborted) {
    return createCancelledResult('Recovery plan building cancelled by caller.');
  }

  const requiredDeletions: AdditionalDeletionItem[] = [];

  for (let fIdx = 0; fIdx < safeSourceProject.frames.length; fIdx++) {
    if (deleteFrameIndicesSet.has(fIdx)) {
      continue;
    }

    const srcFrame = safeSourceProject.frames[fIdx];
    let survivingLayersCount = 0;

    for (const srcLayer of srcFrame.layers) {
      if (deleteLayerIdsSet.has(srcLayer.id)) {
        continue;
      }

      survivingLayersCount++;

      const records = layerFrameBlobMap.get(srcLayer.id)?.get(fIdx) ?? [];

      if (records.length === 0) {
        // Legitimate transparent layer with zero Blobs
        continue;
      }

      if (records.length > 1) {
        // Ambiguous duplicate mappings: must delete affected layer
        requiredDeletions.push({
          reason: 'DUPLICATE_BLOB_MAPPING',
          frameIndex: fIdx,
          layerId: srcLayer.id,
          layerName: srcLayer.name,
          message: `Layer "${srcLayer.name}" in frame ${fIdx + 1} has ${records.length} duplicate blob records and must be explicitly deleted.`,
        });
        continue;
      }

      // Exactly 1 blob record: probe binary header from captured headerSlice
      const record = records[0];

      if (signal?.aborted) {
        return createCancelledResult('Recovery plan building cancelled by caller.');
      }

      let probed;
      try {
        probed = await ImageHeaderProbe.probe(record.headerSlice);
      } catch {
        // Cancellation takes absolute priority over simultaneous probe failure
        if (signal?.aborted) {
          return createCancelledResult('Recovery plan building cancelled by caller.');
        }
        requiredDeletions.push({
          reason: 'CORRUPTED_PNG_HEADER',
          frameIndex: fIdx,
          layerId: srcLayer.id,
          layerName: srcLayer.name,
          message: `Layer "${srcLayer.name}" in frame ${fIdx + 1} has a corrupted or unreadable PNG header and must be explicitly deleted.`,
        });
        continue;
      }

      if (signal?.aborted) {
        return createCancelledResult('Recovery plan building cancelled by caller.');
      }

      if (probed.format !== 'PNG') {
        requiredDeletions.push({
          reason: 'CORRUPTED_PNG_HEADER',
          frameIndex: fIdx,
          layerId: srcLayer.id,
          layerName: srcLayer.name,
          message: `Layer "${srcLayer.name}" in frame ${fIdx + 1} uses unsupported format ${probed.format} (expected PNG).`,
        });
        continue;
      }

      if (probed.width !== safeSourceProject.width || probed.height !== safeSourceProject.height) {
        requiredDeletions.push({
          reason: 'BLOB_DIMENSION_MISMATCH',
          frameIndex: fIdx,
          layerId: srcLayer.id,
          layerName: srcLayer.name,
          message: `Layer "${srcLayer.name}" in frame ${fIdx + 1} dimensions (${probed.width}x${probed.height}) do not match project dimensions (${safeSourceProject.width}x${safeSourceProject.height}).`,
        });
        continue;
      }
    }

    if (survivingLayersCount === 0) {
      // Empty frame requires explicit deletion (no silent cascading deletes)
      requiredDeletions.push({
        reason: 'EMPTY_FRAME_REQUIRES_DELETION',
        frameIndex: fIdx,
        message: `Frame ${fIdx + 1} has 0 surviving layers and must be explicitly deleted.`,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // 6. Evaluate clips and consent requirements
  // ---------------------------------------------------------------------------
  const deletedFramesList = Array.from(deleteFrameIndicesSet).sort((a, b) => a - b);
  const affectedClips: AffectedClipDescriptor[] = [];
  const removedClipIds: string[] = [];

  const sourceClips = Array.isArray(safeSourceProject.clips) ? safeSourceProject.clips : [];
  for (const clip of sourceClips) {
    const cStart = clip.startFrame ?? clip.fromFrame ?? 0;
    const cEnd = clip.endFrame ?? clip.toFrame ?? 0;

    const intersectedFrames: number[] = [];
    for (const dIdx of deletedFramesList) {
      if (dIdx >= cStart && dIdx <= cEnd) {
        intersectedFrames.push(dIdx);
      }
    }

    if (intersectedFrames.length > 0) {
      affectedClips.push({
        clipId: clip.id,
        clipName: clip.name,
        startFrame: cStart,
        endFrame: cEnd,
        deletedFrameIndices: intersectedFrames,
      });

      if (clipConsentGranted) {
        removedClipIds.push(clip.id);
      }
    }
  }

  // If there are layer/frame deletions required, report them immediately
  if (requiredDeletions.length > 0) {
    const sortedDeletions = sortRequiredDeletions(requiredDeletions, frameLayerOrderMap);
    return deepFreeze({
      status: 'additional-deletion-required',
      requiredDeletions: sortedDeletions,
      summary: `Recovery requires deleting ${sortedDeletions.length} affected layer(s) or empty frame(s).`,
    });
  }

  // If clips intersect deleted frames and consent is not yet granted, block for consent
  if (affectedClips.length > 0 && !clipConsentGranted) {
    return deepFreeze({
      status: 'clip-consent-required',
      affectedClips,
      summary: `${affectedClips.length} animation clip(s) intersect deleted frames and require explicit consent to be removed.`,
    });
  }

  // ---------------------------------------------------------------------------
  // 7. Assemble candidate project and scalar remap entries
  // ---------------------------------------------------------------------------
  if (signal?.aborted) {
    return createCancelledResult('Recovery plan building cancelled by caller.');
  }

  // Map original frame index -> target frame index
  const frameIndexRemap = new Map<number, number>();
  let nextTargetFrameIndex = 0;
  for (let fIdx = 0; fIdx < safeSourceProject.frames.length; fIdx++) {
    if (!deleteFrameIndicesSet.has(fIdx)) {
      frameIndexRemap.set(fIdx, nextTargetFrameIndex++);
    }
  }

  const candidateFrames: SerializedFrame[] = [];
  const blobRemapEntries: CandidateBlobRemapEntry[] = [];

  for (let fIdx = 0; fIdx < safeSourceProject.frames.length; fIdx++) {
    if (deleteFrameIndicesSet.has(fIdx)) {
      continue;
    }

    const srcFrame = safeSourceProject.frames[fIdx];
    const targetFrameIndex = frameIndexRemap.get(fIdx)!;
    const candidateLayers: SerializedLayer[] = [];

    for (const srcLayer of srcFrame.layers) {
      if (deleteLayerIdsSet.has(srcLayer.id)) {
        continue;
      }

      // Construct candidate layer strictly WITHOUT pngBase64 property
      const layerObj: SerializedLayer = {
        id: srcLayer.id,
        name: srcLayer.name,
        visible: srcLayer.visible,
        locked: srcLayer.locked,
        opacity: srcLayer.opacity,
        blendMode: srcLayer.blendMode,
      };
      if (srcLayer.tag !== undefined) {
        layerObj.tag = srcLayer.tag;
      }
      if (srcLayer.effect) {
        layerObj.effect = structuredClone(srcLayer.effect);
      }

      candidateLayers.push(layerObj);

      const records = layerFrameBlobMap.get(srcLayer.id)?.get(fIdx);
      if (records && records.length === 1) {
        const record = records[0];
        blobRemapEntries.push({
          sourceRecordId: record.recordId,
          sourceProjectId: record.projectId,
          sourceLayerId: record.layerId,
          sourceFrameIndex: record.frameIndex,
          sourceUpdatedAt: record.updatedAt,
          expectedSizeBytes: record.sizeBytes,
          expectedMimeType: record.mimeType,
          targetLayerId: srcLayer.id,
          targetFrameIndex,
        });
      }
    }

    candidateFrames.push({
      id: srcFrame.id,
      durationMs: srcFrame.durationMs,
      layers: candidateLayers,
    });
  }

  // Re-map surviving clips in lockstep
  const removedClipIdSet = new Set(removedClipIds);
  const survivingClips: AnimationClip[] = [];

  for (const clip of sourceClips) {
    if (removedClipIdSet.has(clip.id)) {
      continue;
    }
    const cStart = clip.startFrame ?? clip.fromFrame ?? 0;
    const cEnd = clip.endFrame ?? clip.toFrame ?? 0;
    const mappedStart = frameIndexRemap.get(cStart);
    const mappedEnd = frameIndexRemap.get(cEnd);

    if (mappedStart === undefined || mappedEnd === undefined) {
      return createBlockedResult(
        'CLIP_REMAP_INVARIANT_FAILED',
        `Clip "${clip.name}" (id: ${clip.id}) has invalid remapped endpoints.`
      );
    }

    survivingClips.push({
      id: clip.id,
      name: clip.name,
      startFrame: mappedStart,
      endFrame: mappedEnd,
      fromFrame: mappedStart,
      toFrame: mappedEnd,
      color: clip.color,
      loopMode: clip.loopMode,
    });
  }

  // Assemble candidate project preserving source identity & timestamps
  const candidateProject: ProjectFile = {
    format: PROJECT_FORMAT_ID,
    version: PROJECT_FORMAT_VERSION,
    name: safeSourceProject.name,
    width: safeSourceProject.width,
    height: safeSourceProject.height,
    fps: safeSourceProject.fps,
    loopMode: safeSourceProject.loopMode,
    onionSkin: structuredClone(safeSourceProject.onionSkin),
    palettes: structuredClone(safeSourceProject.palettes),
    currentPaletteId: safeSourceProject.currentPaletteId,
    customRamps: structuredClone(safeSourceProject.customRamps),
    clips: survivingClips,
    frames: candidateFrames,
    createdAt: safeSourceProject.createdAt,
    updatedAt: safeSourceProject.updatedAt,
  };

  // ---------------------------------------------------------------------------
  // 8. Structural-versus-envelope validation hierarchy
  // ---------------------------------------------------------------------------
  if (signal?.aborted) {
    return createCancelledResult('Recovery plan building cancelled by caller.');
  }

  // Step 8.1: Validate with collect-recoverable mode
  const collectResult = validateProjectWithPolicy(candidateProject, {
    envelopeMode: 'collect-recoverable',
  });

  if (!collectResult.ok) {
    return createBlockedResult(
      collectResult.reasonCode ?? 'STRUCTURAL_VALIDATION_FAILED',
      collectResult.error,
      collectResult.details
    );
  }

  // Step 8.2: If envelope violations remain, return additional-deletion-required
  const candidateEnvelopeViolations: EnvelopeViolation[] = collectResult.violations
    ? Array.from(collectResult.violations)
    : [];

  // Step 8.3: Check resource budget
  const budgetResult = validateProjectResourceBudget(
    candidateProject.width,
    candidateProject.height,
    candidateProject.frames
  );

  if (!budgetResult.ok) {
    const budgetCode: EnvelopeViolationCode =
      budgetResult.usage.layerCount > WORKSPACE_ENVELOPE.MAX_PROJECT_TOTAL_LAYERS
        ? 'ENVELOPE_MAX_TOTAL_LAYERS'
        : 'ENVELOPE_MAX_MEGAPIXELS';

    const budgetViolation: EnvelopeViolation = {
      code: budgetCode,
      message: budgetResult.error,
      actual:
        budgetCode === 'ENVELOPE_MAX_TOTAL_LAYERS'
          ? budgetResult.usage.layerCount
          : budgetResult.usage.materializableRasterPixels,
      allowed:
        budgetCode === 'ENVELOPE_MAX_TOTAL_LAYERS'
          ? WORKSPACE_ENVELOPE.MAX_PROJECT_TOTAL_LAYERS
          : WORKSPACE_ENVELOPE.MAX_PROJECT_AGGREGATE_PIXELS,
    };

    if (!candidateEnvelopeViolations.some((v) => v.code === budgetCode)) {
      candidateEnvelopeViolations.push(budgetViolation);
    }
  }

  if (candidateEnvelopeViolations.length > 0) {
    const envelopeDeletions: AdditionalDeletionItem[] = candidateEnvelopeViolations.map((v) => ({
      reason: v.code,
      message: v.message,
    }));

    return deepFreeze({
      status: 'additional-deletion-required',
      requiredDeletions: envelopeDeletions,
      violations: candidateEnvelopeViolations,
      resourceUsage: budgetResult.usage,
      summary: `Candidate project exceeds workspace limits (${candidateEnvelopeViolations.map((v) => v.code).join(', ')}).`,
    });
  }

  // Step 8.4: Final strict validation
  const strictResult = validateProjectWithPolicy(candidateProject, {
    envelopeMode: 'strict',
  });

  if (!strictResult.ok) {
    return createBlockedResult(
      strictResult.reasonCode ?? 'SCHEMA_VALIDATION_FAILED',
      strictResult.error,
      strictResult.details
    );
  }

  // ---------------------------------------------------------------------------
  // 9. Assemble ready candidate plan with canonical deterministic ordering
  // ---------------------------------------------------------------------------
  // Blob remap entries: ascending source record ID
  blobRemapEntries.sort((a, b) => a.sourceRecordId - b.sourceRecordId);

  // Excluded record IDs: ascending numeric order
  const excludedRecordIds = Array.from(excludedRecordIdSet).sort((a, b) => a - b);

  // Deleted frame lists: ascending numeric order
  const deletedFrameIndices = Array.from(deleteFrameIndicesSet).sort((a, b) => a - b);

  // Deleted layer IDs: source project order
  const deletedLayerIds: string[] = [];
  for (const frame of safeSourceProject.frames) {
    if (Array.isArray(frame.layers)) {
      for (const layer of frame.layers) {
        if (layer && deleteLayerIdsSet.has(layer.id) && !deletedLayerIds.includes(layer.id)) {
          deletedLayerIds.push(layer.id);
        }
      }
    }
  }

  const candidatePlan: CandidateRecoveryPlan = {
    sourceProjectId: safeProjectId,
    candidateProject,
    blobRemapEntries,
    excludedRecordIds,
    deletedFrameIndices,
    deletedLayerIds,
    removedClipIds,
    resourceUsage: budgetResult.usage,
  };

  return deepFreeze({
    status: 'ready',
    candidatePlan,
  });
}
