import { describe, it, expect, vi } from 'vitest';
import {
  PROJECT_FORMAT_ID,
  PROJECT_FORMAT_VERSION,
  type ProjectFile,
  type SerializedFrame,
  type SerializedLayer,
} from '@/types/project';
import { RECOVERY_INSPECTION_CEILINGS } from '@/lib/recovery/recoveryLimits';
import { buildRecoveryPlan } from '@/lib/recovery/recoveryPlanBuilder';
import { ImageHeaderProbe } from '@/lib/safety/imageHeaderProbe';
import type {
  RecoverableStoredAssessment,
  RecoverySourceBlobRecord,
} from '@/lib/recovery/recoveryTypes';

// -----------------------------------------------------------------------------
// Test Helpers & Fixture Builders
// -----------------------------------------------------------------------------

function createPngBlob(width = 64, height = 64, type = 'image/png'): Blob {
  const buf = new Uint8Array(24);
  buf.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  buf.set([0x00, 0x00, 0x00, 0x0d], 8);
  buf.set([0x49, 0x48, 0x44, 0x52], 12);
  const view = new DataView(buf.buffer);
  view.setUint32(16, width, false);
  view.setUint32(20, height, false);
  return new Blob([buf], { type });
}

function createGifBlob(width = 64, height = 64): Blob {
  const buf = new Uint8Array(10);
  buf.set([0x47, 0x49, 0x46, 0x38, 0x39, 0x61], 0);
  const view = new DataView(buf.buffer);
  view.setUint16(6, width, true);
  view.setUint16(8, height, true);
  return new Blob([buf], { type: 'image/gif' });
}

function createCorruptedBlob(): Blob {
  return new Blob([new Uint8Array([0x00, 0x11, 0x22, 0x33, 0x44])], {
    type: 'image/png',
  });
}

function createValidProject(overrides?: Partial<ProjectFile>): ProjectFile {
  return {
    format: PROJECT_FORMAT_ID,
    version: PROJECT_FORMAT_VERSION,
    name: 'Test Project',
    width: 64,
    height: 64,
    fps: 12,
    loopMode: 'repeat',
    onionSkin: {
      enabled: false,
      prevFrames: 1,
      nextFrames: 1,
      opacity: 0.35,
      prevColor: '#7fae6b',
      nextColor: '#c792df',
    },
    palettes: [
      {
        id: 'palette-default',
        name: 'Default',
        colors: ['#000000', '#ffffff'],
      },
    ],
    currentPaletteId: 'palette-default',
    customRamps: [],
    clips: [],
    frames: [
      {
        id: 'frame-1',
        durationMs: 100,
        layers: [
          {
            id: 'layer-1',
            name: 'Layer 1',
            visible: true,
            locked: false,
            opacity: 1.0,
            blendMode: 'source-over',
          },
        ],
      },
    ],
    createdAt: 1700000000000,
    updatedAt: 1700000001000,
    ...overrides,
  };
}

function createValidAssessment(
  project?: ProjectFile,
  overrides?: Partial<RecoverableStoredAssessment>
): RecoverableStoredAssessment {
  const proj = project ?? createValidProject();
  const totalLayers = proj.frames.reduce((acc, f) => acc + (f.layers?.length ?? 0), 0);
  return {
    status: 'recoverable-blob-invalid',
    projectId: 'proj-123',
    project: proj,
    metadata: {
      name: proj.name,
      width: proj.width,
      height: proj.height,
      frameCount: proj.frames.length,
      totalLayerCount: totalLayers,
      maxLayersInAFrame: Math.max(...proj.frames.map((f) => f.layers?.length ?? 0), 0),
      materializableRasterPixels: proj.width * proj.height * totalLayers,
      baseRawRgbaBytes: proj.width * proj.height * 4 * totalLayers,
      fps: proj.fps,
      version: proj.version,
      createdAt: proj.createdAt,
      updatedAt: proj.updatedAt,
    },
    invalidLayerSummary: {
      affectedLayerCount: 0,
      totalReasonCount: 0,
      detailsTruncated: false,
      details: [],
    },
    orphanSummary: {
      totalCount: 0,
      duplicateCount: 0,
      detailsTruncated: false,
      details: [],
    },
    scannedBlobsCount: 0,
    ...overrides,
  } as RecoverableStoredAssessment;
}

describe('recoveryPlanBuilder', () => {
  // ---------------------------------------------------------------------------
  // 1. Unusual Layer IDs (colons, slashes, Unicode, null, delimiter-like)
  // ---------------------------------------------------------------------------
  it('handles unusual layer IDs containing colons, slashes, Unicode, and delimiter characters without confusion', async () => {
    const unusualLayerIds = [
      'layer:colon:1',
      'layer/slash/2',
      'layer::double::colon',
      'layer-null\0char',
      'слой-кириллица-4',
      '🎨-emoji-layer-5',
      '{"json":"like"}-6',
    ];

    const project = createValidProject({
      frames: [
        {
          id: 'frame-1',
          durationMs: 100,
          layers: unusualLayerIds.map((id, idx) => ({
            id,
            name: `Unusual Layer ${idx + 1}`,
            visible: true,
            locked: false,
            opacity: 1.0,
            blendMode: 'source-over',
          })),
        },
      ],
    });

    const sourceBlobs: RecoverySourceBlobRecord[] = unusualLayerIds.map((layerId, idx) => ({
      recordId: idx + 1,
      projectId: 'proj-123',
      layerId,
      frameIndex: 0,
      blob: createPngBlob(64, 64),
      updatedAt: 1700000000000 + idx,
    }));

    const assessment = createValidAssessment(project, {
      scannedBlobsCount: sourceBlobs.length,
    });

    const result = await buildRecoveryPlan({
      assessment,
      sourceBlobs,
    });

    expect(result.status).toBe('ready');
    if (result.status !== 'ready') return;

    expect(result.candidatePlan.blobRemapEntries).toHaveLength(unusualLayerIds.length);
    for (let i = 0; i < unusualLayerIds.length; i++) {
      const entry = result.candidatePlan.blobRemapEntries[i];
      expect(entry.sourceRecordId).toBe(i + 1);
      expect(entry.sourceLayerId).toBe(unusualLayerIds[i]);
      expect(entry.targetLayerId).toBe(unusualLayerIds[i]);
      expect(entry.targetFrameIndex).toBe(0);
    }
  });

  // ---------------------------------------------------------------------------
  // 2. Zero-or-One Blob Semantics (Transparent Layers)
  // ---------------------------------------------------------------------------
  it('supports multiple surviving transparent layers with zero Blobs and retains them as valid layers', async () => {
    const project = createValidProject({
      frames: [
        {
          id: 'frame-1',
          durationMs: 100,
          layers: [
            {
              id: 'layer-with-blob',
              name: 'Raster Layer',
              visible: true,
              locked: false,
              opacity: 1.0,
              blendMode: 'source-over',
            },
            {
              id: 'layer-transparent-1',
              name: 'Transparent 1',
              visible: true,
              locked: false,
              opacity: 0.5,
              blendMode: 'multiply',
            },
            {
              id: 'layer-transparent-2',
              name: 'Transparent 2',
              visible: false,
              locked: true,
              opacity: 1.0,
              blendMode: 'screen',
            },
          ],
        },
      ],
    });

    // Only 1 blob exists in storage; 2 layers are transparent
    const sourceBlobs: RecoverySourceBlobRecord[] = [
      {
        recordId: 42,
        projectId: 'proj-123',
        layerId: 'layer-with-blob',
        frameIndex: 0,
        blob: createPngBlob(64, 64),
        updatedAt: 1700000000000,
      },
    ];

    const assessment = createValidAssessment(project, {
      scannedBlobsCount: 1,
    });

    const result = await buildRecoveryPlan({
      assessment,
      sourceBlobs,
    });

    expect(result.status).toBe('ready');
    if (result.status !== 'ready') return;

    const candidate = result.candidatePlan.candidateProject;
    expect(candidate.frames[0].layers).toHaveLength(3);
    expect(candidate.frames[0].layers[0].id).toBe('layer-with-blob');
    expect(candidate.frames[0].layers[1].id).toBe('layer-transparent-1');
    expect(candidate.frames[0].layers[2].id).toBe('layer-transparent-2');

    // Exactly 1 remap entry produced for the layer with a blob
    expect(result.candidatePlan.blobRemapEntries).toHaveLength(1);
    expect(result.candidatePlan.blobRemapEntries[0].targetLayerId).toBe('layer-with-blob');
  });

  // ---------------------------------------------------------------------------
  // 3. Complete Snapshot Proof (INCOMPLETE_SOURCE_BLOB_SNAPSHOT)
  // ---------------------------------------------------------------------------
  it('rejects snapshots shorter than assessment scannedBlobsCount', async () => {
    const assessment = createValidAssessment(undefined, {
      scannedBlobsCount: 5,
    });
    const sourceBlobs: RecoverySourceBlobRecord[] = [
      {
        recordId: 1,
        projectId: 'proj-123',
        layerId: 'layer-1',
        frameIndex: 0,
        blob: createPngBlob(),
        updatedAt: 1000,
      },
    ];

    const result = await buildRecoveryPlan({
      assessment,
      sourceBlobs,
    });

    expect(result.status).toBe('unrecoverable-blocked');
    if (result.status === 'unrecoverable-blocked') {
      expect(result.reasonCode).toBe('INCOMPLETE_SOURCE_BLOB_SNAPSHOT');
    }
  });

  it('rejects snapshots longer than assessment scannedBlobsCount', async () => {
    const assessment = createValidAssessment(undefined, {
      scannedBlobsCount: 1,
    });
    const sourceBlobs: RecoverySourceBlobRecord[] = [
      {
        recordId: 1,
        projectId: 'proj-123',
        layerId: 'layer-1',
        frameIndex: 0,
        blob: createPngBlob(),
        updatedAt: 1000,
      },
      {
        recordId: 2,
        projectId: 'proj-123',
        layerId: 'layer-1',
        frameIndex: 0,
        blob: createPngBlob(),
        updatedAt: 1000,
      },
    ];

    const result = await buildRecoveryPlan({
      assessment,
      sourceBlobs,
    });

    expect(result.status).toBe('unrecoverable-blocked');
    if (result.status === 'unrecoverable-blocked') {
      expect(result.reasonCode).toBe('INCOMPLETE_SOURCE_BLOB_SNAPSHOT');
    }
  });

  it('rejects assessments with invalid status or bounds', async () => {
    const invalidAssessment = createValidAssessment(undefined, {
      status: 'valid' as unknown as RecoverableStoredAssessment['status'],
      scannedBlobsCount: 0,
    });

    const result = await buildRecoveryPlan({
      assessment: invalidAssessment,
      sourceBlobs: [],
    });

    expect(result.status).toBe('unrecoverable-blocked');
    if (result.status === 'unrecoverable-blocked') {
      expect(result.reasonCode).toBe('INVALID_ASSESSMENT');
    }
  });

  it('rejects assessments with scannedBlobsCount exceeding inspection ceiling', async () => {
    const invalidAssessment = createValidAssessment(undefined, {
      scannedBlobsCount: RECOVERY_INSPECTION_CEILINGS.MAX_INSPECTABLE_STORED_BLOBS + 1,
    });

    const result = await buildRecoveryPlan({
      assessment: invalidAssessment,
      sourceBlobs: [],
    });

    expect(result.status).toBe('unrecoverable-blocked');
    if (result.status === 'unrecoverable-blocked') {
      expect(result.reasonCode).toBe('INVALID_ASSESSMENT');
    }
  });

  // ---------------------------------------------------------------------------
  // 4. Hardened Source-Record Validation & Mid-Probe Mutation Defense
  // ---------------------------------------------------------------------------
  it('rejects records with non-positive or non-safe-integer recordId', async () => {
    const assessment = createValidAssessment(undefined, { scannedBlobsCount: 1 });
    const sourceBlobs = [
      {
        recordId: 0, // Must be > 0
        projectId: 'proj-123',
        layerId: 'layer-1',
        frameIndex: 0,
        blob: createPngBlob(),
        updatedAt: 1000,
      },
    ];

    const result = await buildRecoveryPlan({
      assessment,
      sourceBlobs,
    });

    expect(result.status).toBe('unrecoverable-blocked');
    if (result.status === 'unrecoverable-blocked') {
      expect(result.reasonCode).toBe('CORRUPTED_STORED_BLOB_RECORD');
    }
  });

  it('rejects records with duplicate recordId in sourceBlobs', async () => {
    const assessment = createValidAssessment(undefined, { scannedBlobsCount: 2 });
    const sourceBlobs = [
      {
        recordId: 10,
        projectId: 'proj-123',
        layerId: 'layer-1',
        frameIndex: 0,
        blob: createPngBlob(),
        updatedAt: 1000,
      },
      {
        recordId: 10, // Duplicate ID
        projectId: 'proj-123',
        layerId: 'layer-1',
        frameIndex: 0,
        blob: createPngBlob(),
        updatedAt: 1000,
      },
    ];

    const result = await buildRecoveryPlan({
      assessment,
      sourceBlobs,
    });

    expect(result.status).toBe('unrecoverable-blocked');
    if (result.status === 'unrecoverable-blocked') {
      expect(result.reasonCode).toBe('CORRUPTED_STORED_BLOB_RECORD');
    }
  });

  it('rejects records with mismatched projectId', async () => {
    const assessment = createValidAssessment(undefined, { scannedBlobsCount: 1 });
    const sourceBlobs = [
      {
        recordId: 1,
        projectId: 'other-project',
        layerId: 'layer-1',
        frameIndex: 0,
        blob: createPngBlob(),
        updatedAt: 1000,
      },
    ];

    const result = await buildRecoveryPlan({
      assessment,
      sourceBlobs,
    });

    expect(result.status).toBe('unrecoverable-blocked');
    if (result.status === 'unrecoverable-blocked') {
      expect(result.reasonCode).toBe('CORRUPTED_STORED_BLOB_RECORD');
    }
  });

  it('rejects records with invalid blob object or size', async () => {
    const assessment = createValidAssessment(undefined, { scannedBlobsCount: 1 });
    const sourceBlobs = [
      {
        recordId: 1,
        projectId: 'proj-123',
        layerId: 'layer-1',
        frameIndex: 0,
        blob: { not: 'a real Blob' } as unknown as Blob,
        updatedAt: 1000,
      },
    ];

    const result = await buildRecoveryPlan({
      assessment,
      sourceBlobs,
    });

    expect(result.status).toBe('unrecoverable-blocked');
    if (result.status === 'unrecoverable-blocked') {
      expect(result.reasonCode).toBe('CORRUPTED_STORED_BLOB_RECORD');
    }
  });

  it('captures an immutable internal record snapshot so caller mutations during pending async probe are prevented', async () => {
    const assessment = createValidAssessment(undefined, { scannedBlobsCount: 1 });
    const mutableRecord = {
      recordId: 42,
      projectId: 'proj-123',
      layerId: 'layer-1',
      frameIndex: 0,
      blob: createPngBlob(64, 64, 'image/png'),
      updatedAt: 1700000000000,
    };
    const sourceBlobs = [mutableRecord];

    let releaseProbe: (() => void) | undefined;
    const probePromise = new Promise<{ width: number; height: number; format: 'PNG' }>((resolve) => {
      releaseProbe = () => resolve({ width: 64, height: 64, format: 'PNG' });
    });

    const probeSpy = vi.spyOn(ImageHeaderProbe, 'probe').mockImplementation(async () => {
      return await probePromise;
    });

    try {
      const planPromise = buildRecoveryPlan({
        assessment,
        sourceBlobs,
      });

      // While probe is pending, caller mutates EVERY field and replaces Blob
      mutableRecord.recordId = 99999;
      mutableRecord.projectId = 'mutated-project';
      mutableRecord.layerId = 'mutated-layer';
      mutableRecord.frameIndex = 88;
      mutableRecord.updatedAt = 999999999;
      mutableRecord.blob = createPngBlob(32, 32, 'image/corrupted');

      // Release probe
      releaseProbe?.();

      const result = await planPromise;
      expect(result.status).toBe('ready');
      if (result.status !== 'ready') return;

      // Completed plan MUST use originally captured values
      const entry = result.candidatePlan.blobRemapEntries[0];
      expect(entry.sourceRecordId).toBe(42);
      expect(entry.sourceProjectId).toBe('proj-123');
      expect(entry.sourceLayerId).toBe('layer-1');
      expect(entry.sourceFrameIndex).toBe(0);
      expect(entry.sourceUpdatedAt).toBe(1700000000000);
      expect(entry.expectedSizeBytes).toBe(24);
      expect(entry.expectedMimeType).toBe('image/png');
    } finally {
      probeSpy.mockRestore();
    }
  });

  it('captures an immutable source project snapshot so caller mutations during pending async probe are prevented', async () => {
    const originalProject = createValidProject({
      name: 'Initial Name',
      clips: [{ id: 'clip-1', name: 'Initial Clip', startFrame: 0, endFrame: 0 }],
      updatedAt: 1700000000000,
    });
    const assessment = createValidAssessment(originalProject, { scannedBlobsCount: 1 });
    const sourceBlobs = [
      {
        recordId: 1,
        projectId: 'proj-123',
        layerId: 'layer-1',
        frameIndex: 0,
        blob: createPngBlob(),
        updatedAt: 1000,
      },
    ];

    let releaseProbe: (() => void) | undefined;
    const probePromise = new Promise<{ width: number; height: number; format: 'PNG' }>((resolve) => {
      releaseProbe = () => resolve({ width: 64, height: 64, format: 'PNG' });
    });

    const probeSpy = vi.spyOn(ImageHeaderProbe, 'probe').mockImplementation(async () => {
      return await probePromise;
    });

    try {
      const planPromise = buildRecoveryPlan({
        assessment,
        sourceBlobs,
      });

      // While probe is pending, caller mutates original project properties
      originalProject.name = 'Mutated Caller Name';
      originalProject.updatedAt = 999999999999;
      originalProject.frames[0].layers[0].id = 'mutated-layer-id';
      originalProject.clips.push({ id: 'mutated-clip', name: 'Injected Clip', startFrame: 0, endFrame: 0 });

      releaseProbe?.();

      const result = await planPromise;
      expect(result.status).toBe('ready');
      if (result.status !== 'ready') return;

      const candidate = result.candidatePlan.candidateProject;
      expect(candidate.name).toBe('Initial Name');
      expect(candidate.updatedAt).toBe(1700000000000);
      expect(candidate.frames[0].layers[0].id).toBe('layer-1');
      expect(candidate.clips).toHaveLength(1);
      expect(candidate.clips[0].id).toBe('clip-1');
    } finally {
      probeSpy.mockRestore();
    }
  });

  // ---------------------------------------------------------------------------
  // 5. Decisions Validation & Snapshotting
  // ---------------------------------------------------------------------------
  it('rejects decisions with out-of-bounds deleteFrameIndices', async () => {
    const assessment = createValidAssessment(undefined, { scannedBlobsCount: 0 });
    const result = await buildRecoveryPlan({
      assessment,
      sourceBlobs: [],
      decisions: {
        deleteFrameIndices: [99],
      },
    });

    expect(result.status).toBe('unrecoverable-blocked');
    if (result.status === 'unrecoverable-blocked') {
      expect(result.reasonCode).toBe('INVALID_RECOVERY_DECISIONS');
    }
  });

  it('rejects decisions with duplicate deleteFrameIndices', async () => {
    const project = createValidProject({
      frames: [
        { id: 'f1', durationMs: 100, layers: [{ id: 'l1', name: 'L1', visible: true, locked: false, opacity: 1, blendMode: 'source-over' }] },
        { id: 'f2', durationMs: 100, layers: [{ id: 'l2', name: 'L2', visible: true, locked: false, opacity: 1, blendMode: 'source-over' }] },
      ],
    });
    const assessment = createValidAssessment(project, { scannedBlobsCount: 0 });
    const result = await buildRecoveryPlan({
      assessment,
      sourceBlobs: [],
      decisions: {
        deleteFrameIndices: [1, 1],
      },
    });

    expect(result.status).toBe('unrecoverable-blocked');
    if (result.status === 'unrecoverable-blocked') {
      expect(result.reasonCode).toBe('INVALID_RECOVERY_DECISIONS');
    }
  });

  it('rejects decisions with non-existent deleteLayerIds', async () => {
    const assessment = createValidAssessment(undefined, { scannedBlobsCount: 0 });
    const result = await buildRecoveryPlan({
      assessment,
      sourceBlobs: [],
      decisions: {
        deleteLayerIds: ['non-existent-layer'],
      },
    });

    expect(result.status).toBe('unrecoverable-blocked');
    if (result.status === 'unrecoverable-blocked') {
      expect(result.reasonCode).toBe('INVALID_RECOVERY_DECISIONS');
    }
  });

  it('rejects decisions with non-boolean clipConsentGranted', async () => {
    const assessment = createValidAssessment(undefined, { scannedBlobsCount: 0 });
    const result = await buildRecoveryPlan({
      assessment,
      sourceBlobs: [],
      decisions: {
        clipConsentGranted: 'true' as unknown as boolean,
      },
    });

    expect(result.status).toBe('unrecoverable-blocked');
    if (result.status === 'unrecoverable-blocked') {
      expect(result.reasonCode).toBe('INVALID_RECOVERY_DECISIONS');
    }
  });

  it('snapshots decision collections into local arrays before evaluation to prevent caller array mutation', async () => {
    const project = createValidProject({
      frames: [
        { id: 'f0', durationMs: 100, layers: [{ id: 'l0', name: 'L0', visible: true, locked: false, opacity: 1, blendMode: 'source-over' }] },
        { id: 'f1', durationMs: 100, layers: [{ id: 'l1', name: 'L1', visible: true, locked: false, opacity: 1, blendMode: 'source-over' }] },
      ],
    });
    const assessment = createValidAssessment(project, { scannedBlobsCount: 0 });

    const mutableFrameIndices = [1];
    const planPromise = buildRecoveryPlan({
      assessment,
      sourceBlobs: [],
      decisions: {
        deleteFrameIndices: mutableFrameIndices,
      },
    });

    // Caller mutates array immediately
    mutableFrameIndices.push(0);

    const result = await planPromise;
    expect(result.status).toBe('ready');
    if (result.status !== 'ready') return;
    expect(result.candidatePlan.deletedFrameIndices).toEqual([1]);
  });

  // ---------------------------------------------------------------------------
  // 6. All-Frame Deletion Defense (ALL_FRAMES_DELETED)
  // ---------------------------------------------------------------------------
  it('fails closed with ALL_FRAMES_DELETED when all frames are deleted, before probing or clip consent', async () => {
    const projectWithClips = createValidProject({
      frames: [
        { id: 'f0', durationMs: 100, layers: [{ id: 'l0', name: 'L0', visible: true, locked: false, opacity: 1, blendMode: 'source-over' }] },
        { id: 'f1', durationMs: 100, layers: [{ id: 'l1', name: 'L1', visible: true, locked: false, opacity: 1, blendMode: 'source-over' }] },
      ],
      clips: [{ id: 'clip-1', name: 'Clip 1', startFrame: 0, endFrame: 1 }],
    });
    const assessment = createValidAssessment(projectWithClips, { scannedBlobsCount: 0 });

    // Case A: With clips, consent false
    const resA = await buildRecoveryPlan({
      assessment,
      sourceBlobs: [],
      decisions: { deleteFrameIndices: [0, 1], clipConsentGranted: false },
    });
    expect(resA.status).toBe('unrecoverable-blocked');
    if (resA.status === 'unrecoverable-blocked') {
      expect(resA.reasonCode).toBe('ALL_FRAMES_DELETED');
    }

    // Case B: With clips, consent true
    const resB = await buildRecoveryPlan({
      assessment,
      sourceBlobs: [],
      decisions: { deleteFrameIndices: [0, 1], clipConsentGranted: true },
    });
    expect(resB.status).toBe('unrecoverable-blocked');
    if (resB.status === 'unrecoverable-blocked') {
      expect(resB.reasonCode).toBe('ALL_FRAMES_DELETED');
    }

    // Case C: Without clips
    const projectNoClips = createValidProject({
      frames: [
        { id: 'f0', durationMs: 100, layers: [{ id: 'l0', name: 'L0', visible: true, locked: false, opacity: 1, blendMode: 'source-over' }] },
      ],
      clips: [],
    });
    const assessmentNoClips = createValidAssessment(projectNoClips, { scannedBlobsCount: 0 });
    const resC = await buildRecoveryPlan({
      assessment: assessmentNoClips,
      sourceBlobs: [],
      decisions: { deleteFrameIndices: [0] },
    });
    expect(resC.status).toBe('unrecoverable-blocked');
    if (resC.status === 'unrecoverable-blocked') {
      expect(resC.reasonCode).toBe('ALL_FRAMES_DELETED');
    }
  });

  // ---------------------------------------------------------------------------
  // 7. Actually Remove pngBase64 (Absence vs Undefined)
  // ---------------------------------------------------------------------------
  it('constructs candidate layers strictly without a pngBase64 property', async () => {
    const project = createValidProject({
      frames: [
        {
          id: 'f1',
          durationMs: 100,
          layers: [
            {
              id: 'layer-with-raster-str',
              name: 'Raster Layer',
              visible: true,
              locked: false,
              opacity: 1.0,
              blendMode: 'source-over',
              pngBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            },
            {
              id: 'layer-normal',
              name: 'Normal Layer',
              visible: true,
              locked: false,
              opacity: 1.0,
              blendMode: 'source-over',
            },
          ],
        },
      ],
    });

    const assessment = createValidAssessment(project, { scannedBlobsCount: 0 });
    const result = await buildRecoveryPlan({
      assessment,
      sourceBlobs: [],
    });

    expect(result.status).toBe('ready');
    if (result.status !== 'ready') return;

    for (const frame of result.candidatePlan.candidateProject.frames) {
      for (const layer of frame.layers) {
        expect(Object.prototype.hasOwnProperty.call(layer, 'pngBase64')).toBe(false);
        expect('pngBase64' in layer).toBe(false);
      }
    }
  });

  // ---------------------------------------------------------------------------
  // 8. Exact MIME Identity Preservation
  // ---------------------------------------------------------------------------
  it('preserves exact Blob.type string, including empty string and custom types', async () => {
    const project = createValidProject({
      frames: [
        {
          id: 'f1',
          durationMs: 100,
          layers: [
            { id: 'l-empty-mime', name: 'Empty MIME', visible: true, locked: false, opacity: 1, blendMode: 'source-over' },
            { id: 'l-png-mime', name: 'PNG MIME', visible: true, locked: false, opacity: 1, blendMode: 'source-over' },
            { id: 'l-custom-mime', name: 'Custom MIME', visible: true, locked: false, opacity: 1, blendMode: 'source-over' },
          ],
        },
      ],
    });

    const sourceBlobs: RecoverySourceBlobRecord[] = [
      { recordId: 1, projectId: 'proj-123', layerId: 'l-empty-mime', frameIndex: 0, blob: createPngBlob(64, 64, ''), updatedAt: 1000 },
      { recordId: 2, projectId: 'proj-123', layerId: 'l-png-mime', frameIndex: 0, blob: createPngBlob(64, 64, 'image/png'), updatedAt: 1000 },
      { recordId: 3, projectId: 'proj-123', layerId: 'l-custom-mime', frameIndex: 0, blob: createPngBlob(64, 64, 'image/x-pixibun-raw'), updatedAt: 1000 },
    ];

    const assessment = createValidAssessment(project, { scannedBlobsCount: 3 });
    const result = await buildRecoveryPlan({
      assessment,
      sourceBlobs,
    });

    expect(result.status).toBe('ready');
    if (result.status !== 'ready') return;

    const entries = result.candidatePlan.blobRemapEntries;
    expect(entries).toHaveLength(3);
    expect(entries[0].expectedMimeType).toBe('');
    expect(entries[1].expectedMimeType).toBe('image/png');
    expect(entries[2].expectedMimeType).toBe('image/x-pixibun-raw');
  });

  // ---------------------------------------------------------------------------
  // 9. Genuine Cancellation Priority Race Test
  // ---------------------------------------------------------------------------
  it('gives cancellation absolute priority over a simultaneous probe failure during an awaited probe', async () => {
    const controller = new AbortController();
    const assessment = createValidAssessment(undefined, { scannedBlobsCount: 1 });
    const sourceBlobs: RecoverySourceBlobRecord[] = [
      {
        recordId: 1,
        projectId: 'proj-123',
        layerId: 'layer-1',
        frameIndex: 0,
        blob: createCorruptedBlob(),
        updatedAt: 1000,
      },
    ];

    let triggerReject: ((err: Error) => void) | undefined;
    const probePromise = new Promise<{ width: number; height: number; format: 'PNG' }>((_, reject) => {
      triggerReject = reject;
    });

    const probeSpy = vi.spyOn(ImageHeaderProbe, 'probe').mockImplementation(async () => {
      return await probePromise;
    });

    try {
      const planPromise = buildRecoveryPlan(
        { assessment, sourceBlobs },
        { signal: controller.signal }
      );

      // Abort signal while probe is actively pending
      controller.abort();

      // Reject the probe promise after abort
      triggerReject?.(new Error('Simulated IO or probe corruption error'));

      const result = await planPromise;
      expect(result.status).toBe('cancelled');
    } finally {
      probeSpy.mockRestore();
    }
  });

  it('cancels immediately if pre-aborted before execution begins', async () => {
    const controller = new AbortController();
    controller.abort();

    const assessment = createValidAssessment(undefined, { scannedBlobsCount: 0 });
    const result = await buildRecoveryPlan(
      { assessment, sourceBlobs: [] },
      { signal: controller.signal }
    );

    expect(result.status).toBe('cancelled');
  });

  it('does not evaluate project getter or perform preflight work if pre-aborted before execution begins', async () => {
    const controller = new AbortController();
    controller.abort();

    let projectGetterCalled = false;
    let metadataGetterCalled = false;

    const assessment = {
      status: 'recoverable-envelope-exceeded',
      projectId: 'proj-123',
      get project() {
        projectGetterCalled = true;
        throw new Error('project getter must never be evaluated on pre-aborted signal');
      },
      get metadata() {
        metadataGetterCalled = true;
        throw new Error('metadata getter must never be evaluated on pre-aborted signal');
      },
      scannedBlobsCount: 0,
    } as unknown as RecoverableStoredAssessment;

    const result = await buildRecoveryPlan(
      { assessment, sourceBlobs: [] },
      { signal: controller.signal }
    );

    expect(result.status).toBe('cancelled');
    expect(projectGetterCalled).toBe(false);
    expect(metadataGetterCalled).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // 10. Source Input Immutability Proof
  // ---------------------------------------------------------------------------
  it('proves that assessment, project, source records, source array, and Blob bytes remain strictly unchanged', async () => {
    const originalProject = createValidProject({
      name: 'Source Integrity Project',
      clips: [{ id: 'clip-1', name: 'Clip', startFrame: 0, endFrame: 0 }],
      createdAt: 1690000000000,
      updatedAt: 1695000000000,
    });
    const assessment = createValidAssessment(originalProject, { scannedBlobsCount: 1 });

    const rawBlob = createPngBlob(64, 64);
    const sourceBlobs: RecoverySourceBlobRecord[] = [
      {
        recordId: 1,
        projectId: 'proj-123',
        layerId: 'layer-1',
        frameIndex: 0,
        blob: rawBlob,
        updatedAt: 1700000000000,
      },
    ];

    // Pre-flight snapshots
    const preAssessmentJson = JSON.stringify(assessment);
    const preProjectJson = JSON.stringify(originalProject);
    const preRecordSnapshot = { ...sourceBlobs[0] };
    const preBlobBytes = new Uint8Array(await rawBlob.arrayBuffer());

    // 1. Ready path
    const resReady = await buildRecoveryPlan({ assessment, sourceBlobs });
    expect(resReady.status).toBe('ready');
    expect(JSON.stringify(assessment)).toBe(preAssessmentJson);
    expect(JSON.stringify(originalProject)).toBe(preProjectJson);
    expect(sourceBlobs[0]).toEqual(preRecordSnapshot);
    expect(new Uint8Array(await rawBlob.arrayBuffer())).toEqual(preBlobBytes);

    // 2. Additional-deletion path
    const resAdditional = await buildRecoveryPlan({
      assessment,
      sourceBlobs: [
        {
          recordId: 1,
          projectId: 'proj-123',
          layerId: 'layer-1',
          frameIndex: 0,
          blob: createCorruptedBlob(),
          updatedAt: 1700000000000,
        },
      ],
    });
    expect(resAdditional.status).toBe('additional-deletion-required');
    expect(JSON.stringify(assessment)).toBe(preAssessmentJson);

    // 3. Clip-consent path
    const twoFrameProject = createValidProject({
      name: 'Two Frame Clip Project',
      frames: [
        { id: 'f0', durationMs: 100, layers: [{ id: 'l0', name: 'Layer 0', visible: true, locked: false, opacity: 1, blendMode: 'source-over' }] },
        { id: 'f1', durationMs: 100, layers: [{ id: 'l1', name: 'Layer 1', visible: true, locked: false, opacity: 1, blendMode: 'source-over' }] },
      ],
      clips: [{ id: 'clip-1', name: 'Clip 1', startFrame: 0, endFrame: 1 }],
      createdAt: 1690000000000,
      updatedAt: 1695000000000,
    });
    const clipBlob = createPngBlob(64, 64);
    const clipSourceBlobs: RecoverySourceBlobRecord[] = [
      {
        recordId: 10,
        projectId: 'proj-123',
        layerId: 'l1',
        frameIndex: 1,
        blob: clipBlob,
        updatedAt: 1700000000000,
      },
    ];
    const clipAssessment = createValidAssessment(twoFrameProject, { scannedBlobsCount: 1 });
    const preClipAssessmentJson = JSON.stringify(clipAssessment);
    const preTwoFrameProjectJson = JSON.stringify(twoFrameProject);
    const preClipRecordSnapshot = { ...clipSourceBlobs[0] };
    const preClipBlobBytes = new Uint8Array(await clipBlob.arrayBuffer());

    const resClip = await buildRecoveryPlan({
      assessment: clipAssessment,
      sourceBlobs: clipSourceBlobs,
      decisions: { deleteFrameIndices: [0], clipConsentGranted: false },
    });
    expect(resClip.status).toBe('clip-consent-required');
    expect(JSON.stringify(clipAssessment)).toBe(preClipAssessmentJson);
    expect(JSON.stringify(twoFrameProject)).toBe(preTwoFrameProjectJson);
    expect(clipSourceBlobs[0]).toEqual(preClipRecordSnapshot);
    expect(new Uint8Array(await clipBlob.arrayBuffer())).toEqual(preClipBlobBytes);

    // 4. Blocked path
    const resBlocked = await buildRecoveryPlan({
      assessment: { ...assessment, status: 'valid' } as unknown as RecoverableStoredAssessment,
      sourceBlobs: [],
    });
    expect(resBlocked.status).toBe('unrecoverable-blocked');
    expect(JSON.stringify(assessment)).toBe(preAssessmentJson);

    // 5. Cancelled path
    const abortCtrl = new AbortController();
    abortCtrl.abort();
    const resCancelled = await buildRecoveryPlan({ assessment, sourceBlobs }, { signal: abortCtrl.signal });
    expect(resCancelled.status).toBe('cancelled');
    expect(JSON.stringify(assessment)).toBe(preAssessmentJson);
    expect(new Uint8Array(await rawBlob.arrayBuffer())).toEqual(preBlobBytes);
  });

  it('detects non-PNG formats (e.g. GIF) and requires layer deletion', async () => {
    const assessment = createValidAssessment(undefined, { scannedBlobsCount: 1 });
    const sourceBlobs: RecoverySourceBlobRecord[] = [
      {
        recordId: 1,
        projectId: 'proj-123',
        layerId: 'layer-1',
        frameIndex: 0,
        blob: createGifBlob(64, 64),
        updatedAt: 1000,
      },
    ];

    const result = await buildRecoveryPlan({
      assessment,
      sourceBlobs,
    });

    expect(result.status).toBe('additional-deletion-required');
    if (result.status === 'additional-deletion-required') {
      expect(result.requiredDeletions[0].reason).toBe('CORRUPTED_PNG_HEADER');
      expect(result.requiredDeletions[0].layerId).toBe('layer-1');
    }
  });

  // ---------------------------------------------------------------------------
  // 11. Bounded Result Messages
  // ---------------------------------------------------------------------------
  it('converts probe failures into stable bounded messages without leaking exception traces', async () => {
    const assessment = createValidAssessment(undefined, { scannedBlobsCount: 1 });
    const sourceBlobs = [
      {
        recordId: 1,
        projectId: 'proj-123',
        layerId: 'layer-1',
        frameIndex: 0,
        blob: createCorruptedBlob(),
        updatedAt: 1000,
      },
    ];

    const result = await buildRecoveryPlan({
      assessment,
      sourceBlobs,
    });

    expect(result.status).toBe('additional-deletion-required');
    if (result.status === 'additional-deletion-required') {
      const msg = result.requiredDeletions[0].message;
      expect(msg).toBe('Layer "Layer 1" in frame 1 has a corrupted or unreadable PNG header and must be explicitly deleted.');
      expect(msg.length).toBeLessThan(256);
    }
  });

  // ---------------------------------------------------------------------------
  // 12. Clip Remapping & Invariant Failure
  // ---------------------------------------------------------------------------
  it('requires clip consent when a clip intersects an explicitly deleted frame and remaps surviving clips in lockstep', async () => {
    const project = createValidProject({
      frames: [
        { id: 'f0', durationMs: 100, layers: [{ id: 'l0', name: 'L0', visible: true, locked: false, opacity: 1, blendMode: 'source-over' }] },
        { id: 'f1', durationMs: 100, layers: [{ id: 'l1', name: 'L1', visible: true, locked: false, opacity: 1, blendMode: 'source-over' }] },
        { id: 'f2', durationMs: 100, layers: [{ id: 'l2', name: 'L2', visible: true, locked: false, opacity: 1, blendMode: 'source-over' }] },
      ],
      clips: [
        { id: 'clip-1', name: 'Intersected Clip', startFrame: 0, endFrame: 1 },
        { id: 'clip-2', name: 'Disjoint Clip', startFrame: 2, endFrame: 2 },
      ],
    });

    const assessment = createValidAssessment(project, { scannedBlobsCount: 0 });

    const resultNoConsent = await buildRecoveryPlan({
      assessment,
      sourceBlobs: [],
      decisions: {
        deleteFrameIndices: [1],
        clipConsentGranted: false,
      },
    });

    expect(resultNoConsent.status).toBe('clip-consent-required');
    if (resultNoConsent.status === 'clip-consent-required') {
      expect(resultNoConsent.affectedClips).toHaveLength(1);
      expect(resultNoConsent.affectedClips[0].clipId).toBe('clip-1');
      expect(resultNoConsent.affectedClips[0].deletedFrameIndices).toEqual([1]);
    }

    const resultWithConsent = await buildRecoveryPlan({
      assessment,
      sourceBlobs: [],
      decisions: {
        deleteFrameIndices: [1],
        clipConsentGranted: true,
      },
    });

    expect(resultWithConsent.status).toBe('ready');
    if (resultWithConsent.status === 'ready') {
      const plan = resultWithConsent.candidatePlan;
      expect(plan.removedClipIds).toEqual(['clip-1']);
      expect(plan.candidateProject.clips).toHaveLength(1);

      const survivingClip = plan.candidateProject.clips[0];
      expect(survivingClip.id).toBe('clip-2');
      expect(survivingClip.startFrame).toBe(1);
      expect(survivingClip.endFrame).toBe(1);
      expect(survivingClip.fromFrame).toBe(1);
      expect(survivingClip.toFrame).toBe(1);
    }
  });

  // ---------------------------------------------------------------------------
  // 13. Deterministic Ordering (Shuffled Source Blobs Test)
  // ---------------------------------------------------------------------------
  it('produces byte-for-byte deterministic plan output regardless of sourceBlobs array order', async () => {
    const project = createValidProject({
      frames: [
        {
          id: 'f-1',
          durationMs: 100,
          layers: [
            { id: 'l-1a', name: 'Layer 1A', visible: true, locked: false, opacity: 1, blendMode: 'source-over' },
            { id: 'l-1b', name: 'Layer 1B', visible: true, locked: false, opacity: 1, blendMode: 'source-over' },
          ],
        },
        {
          id: 'f-2',
          durationMs: 100,
          layers: [
            { id: 'l-2a', name: 'Layer 2A', visible: true, locked: false, opacity: 1, blendMode: 'source-over' },
          ],
        },
      ],
    });

    const blobsOrdered: RecoverySourceBlobRecord[] = [
      { recordId: 1, projectId: 'proj-123', layerId: 'l-1a', frameIndex: 0, blob: createPngBlob(), updatedAt: 1000 },
      { recordId: 2, projectId: 'proj-123', layerId: 'l-1b', frameIndex: 0, blob: createPngBlob(), updatedAt: 1000 },
      { recordId: 3, projectId: 'proj-123', layerId: 'l-2a', frameIndex: 1, blob: createPngBlob(), updatedAt: 1000 },
      { recordId: 99, projectId: 'proj-123', layerId: 'orphan-1', frameIndex: 9, blob: createPngBlob(), updatedAt: 1000 },
      { recordId: 105, projectId: 'proj-123', layerId: 'orphan-2', frameIndex: 8, blob: createPngBlob(), updatedAt: 1000 },
    ];

    const assessment = createValidAssessment(project, {
      scannedBlobsCount: blobsOrdered.length,
    });

    const result1 = await buildRecoveryPlan({
      assessment,
      sourceBlobs: blobsOrdered,
    });

    const blobsReversed = [...blobsOrdered].reverse();
    const result2 = await buildRecoveryPlan({
      assessment,
      sourceBlobs: blobsReversed,
    });

    const blobsShuffled = [blobsOrdered[3], blobsOrdered[0], blobsOrdered[4], blobsOrdered[2], blobsOrdered[1]];
    const result3 = await buildRecoveryPlan({
      assessment,
      sourceBlobs: blobsShuffled,
    });

    expect(result1.status).toBe('ready');
    expect(result2.status).toBe('ready');
    expect(result3.status).toBe('ready');

    expect(result2).toEqual(result1);
    expect(result3).toEqual(result1);

    if (result1.status === 'ready') {
      const ids = result1.candidatePlan.blobRemapEntries.map((e) => e.sourceRecordId);
      expect(ids).toEqual([1, 2, 3]);
      expect(result1.candidatePlan.excludedRecordIds).toEqual([99, 105]);
    }
  });

  // ---------------------------------------------------------------------------
  // 14. Structural vs Envelope Validation Hierarchy
  // ---------------------------------------------------------------------------
  it('returns additional-deletion-required when candidate exceeds MAX_CANVAS_FRAMES (500)', async () => {
    const frames: SerializedFrame[] = [];
    for (let i = 0; i < 501; i++) {
      frames.push({
        id: `f-${i}`,
        durationMs: 100,
        layers: [{ id: `l-${i}`, name: 'Layer', visible: true, locked: false, opacity: 1, blendMode: 'source-over' }],
      });
    }

    const project = createValidProject({ frames });
    const assessment = createValidAssessment(project, { scannedBlobsCount: 0 });

    const result = await buildRecoveryPlan({
      assessment,
      sourceBlobs: [],
    });

    expect(result.status).toBe('additional-deletion-required');
    if (result.status === 'additional-deletion-required') {
      expect(result.violations?.some((v) => v.code === 'ENVELOPE_MAX_FRAMES')).toBe(true);
    }
  });

  it('returns additional-deletion-required when a frame exceeds MAX_CANVAS_LAYERS (100)', async () => {
    const layers: SerializedLayer[] = [];
    for (let i = 0; i < 101; i++) {
      layers.push({
        id: `l-${i}`,
        name: `Layer ${i}`,
        visible: true,
        locked: false,
        opacity: 1,
        blendMode: 'source-over',
      });
    }

    const project = createValidProject({
      frames: [{ id: 'f-1', durationMs: 100, layers }],
    });
    const assessment = createValidAssessment(project, { scannedBlobsCount: 0 });

    const result = await buildRecoveryPlan({
      assessment,
      sourceBlobs: [],
    });

    expect(result.status).toBe('additional-deletion-required');
    if (result.status === 'additional-deletion-required') {
      expect(result.violations?.some((v) => v.code === 'ENVELOPE_MAX_LAYERS_PER_FRAME')).toBe(true);
    }
  });

  it('returns additional-deletion-required when total layers exceed MAX_PROJECT_TOTAL_LAYERS (2,000)', async () => {
    const frames: SerializedFrame[] = [];
    for (let f = 0; f < 21; f++) {
      const layers: SerializedLayer[] = [];
      for (let l = 0; l < 96; l++) {
        layers.push({
          id: `l-${f}-${l}`,
          name: `Layer ${l}`,
          visible: true,
          locked: false,
          opacity: 1,
          blendMode: 'source-over',
        });
      }
      frames.push({ id: `f-${f}`, durationMs: 100, layers });
    }

    const project = createValidProject({ frames });
    const assessment = createValidAssessment(project, { scannedBlobsCount: 0 });

    const result = await buildRecoveryPlan({
      assessment,
      sourceBlobs: [],
    });

    expect(result.status).toBe('additional-deletion-required');
    if (result.status === 'additional-deletion-required') {
      expect(result.violations?.some((v) => v.code === 'ENVELOPE_MAX_TOTAL_LAYERS')).toBe(true);
    }
  });

  it('returns additional-deletion-required when aggregate pixels exceed MAX_PROJECT_AGGREGATE_PIXELS (67,108,864)', async () => {
    const layers: SerializedLayer[] = [];
    for (let i = 0; i < 17; i++) {
      layers.push({
        id: `layer-${i}`,
        name: `Layer ${i}`,
        visible: true,
        locked: false,
        opacity: 1,
        blendMode: 'source-over',
      });
    }

    const project = createValidProject({
      width: 2048,
      height: 2048,
      frames: [{ id: 'f-1', durationMs: 100, layers }],
    });
    const assessment = createValidAssessment(project, { scannedBlobsCount: 0 });

    const result = await buildRecoveryPlan({
      assessment,
      sourceBlobs: [],
    });

    expect(result.status).toBe('additional-deletion-required');
    if (result.status === 'additional-deletion-required') {
      expect(result.violations?.some((v) => v.code === 'ENVELOPE_MAX_MEGAPIXELS')).toBe(true);
    }
  });

  // ---------------------------------------------------------------------------
  // 15. Runtime Immutability
  // ---------------------------------------------------------------------------
  it('deep-freezes all returned result trees and prevents runtime mutations', async () => {
    const assessment = createValidAssessment(undefined, { scannedBlobsCount: 1 });
    const sourceBlobs: RecoverySourceBlobRecord[] = [
      {
        recordId: 1,
        projectId: 'proj-123',
        layerId: 'layer-1',
        frameIndex: 0,
        blob: createPngBlob(),
        updatedAt: 1000,
      },
    ];

    const result = await buildRecoveryPlan({
      assessment,
      sourceBlobs,
    });

    expect(result.status).toBe('ready');
    if (result.status !== 'ready') return;

    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.candidatePlan)).toBe(true);
    expect(Object.isFrozen(result.candidatePlan.candidateProject)).toBe(true);
    expect(Object.isFrozen(result.candidatePlan.candidateProject.frames)).toBe(true);
    expect(Object.isFrozen(result.candidatePlan.candidateProject.frames[0])).toBe(true);
    expect(Object.isFrozen(result.candidatePlan.candidateProject.frames[0].layers)).toBe(true);
    expect(Object.isFrozen(result.candidatePlan.candidateProject.frames[0].layers[0])).toBe(true);
    expect(Object.isFrozen(result.candidatePlan.blobRemapEntries)).toBe(true);
    expect(Object.isFrozen(result.candidatePlan.excludedRecordIds)).toBe(true);

    expect(() => {
      (result.candidatePlan.candidateProject as unknown as Record<string, unknown>).name = 'Mutated Name';
    }).toThrow();

    expect(() => {
      (result.candidatePlan.candidateProject.frames as unknown as unknown[]).push({ id: 'bad' });
    }).toThrow();

    expect(() => {
      (result.candidatePlan.blobRemapEntries as unknown as unknown[]).push({ bad: true });
    }).toThrow();
  });

  // ---------------------------------------------------------------------------
  // 16. Preserves Source Identity & Timestamps
  // ---------------------------------------------------------------------------
  it('deterministically preserves source project name, createdAt, and updatedAt without modification', async () => {
    const project = createValidProject({
      name: 'Original Unmodified Name',
      createdAt: 1690000000000,
      updatedAt: 1695000000000,
    });

    const assessment = createValidAssessment(project, { scannedBlobsCount: 0 });
    const result = await buildRecoveryPlan({
      assessment,
      sourceBlobs: [],
    });

    expect(result.status).toBe('ready');
    if (result.status !== 'ready') return;

    const candidate = result.candidatePlan.candidateProject;
    expect(candidate.name).toBe('Original Unmodified Name');
    expect(candidate.createdAt).toBe(1690000000000);
    expect(candidate.updatedAt).toBe(1695000000000);
  });

  // ---------------------------------------------------------------------------
  // 17. Single-Evaluation Snapshot Defenses (Adversarial Getters / Proxies)
  // ---------------------------------------------------------------------------
  it('reads source record properties exactly once, resisting getter mutation or secondary read throws', async () => {
    const project = createValidProject();
    const assessment = createValidAssessment(project, { scannedBlobsCount: 1 });
    const normalBlob = createPngBlob(64, 64, 'image/png');

    const normalRecord: RecoverySourceBlobRecord = {
      recordId: 1,
      projectId: 'proj-123',
      layerId: 'layer-1',
      frameIndex: 0,
      blob: normalBlob,
      updatedAt: 1000,
    };

    const normalResult = await buildRecoveryPlan({
      assessment,
      sourceBlobs: [normalRecord],
    });
    expect(normalResult.status).toBe('ready');

    // Create adversarial record with throwing getters on read > 1
    const readCounts: Record<string, number> = {
      recordId: 0,
      projectId: 0,
      layerId: 0,
      frameIndex: 0,
      updatedAt: 0,
      blob: 0,
    };

    const adversarialRecord = {
      get recordId() {
        readCounts.recordId++;
        if (readCounts.recordId > 1) throw new Error('Secondary read of recordId');
        return 1;
      },
      get projectId() {
        readCounts.projectId++;
        if (readCounts.projectId > 1) throw new Error('Secondary read of projectId');
        return 'proj-123';
      },
      get layerId() {
        readCounts.layerId++;
        if (readCounts.layerId > 1) throw new Error('Secondary read of layerId');
        return 'layer-1';
      },
      get frameIndex() {
        readCounts.frameIndex++;
        if (readCounts.frameIndex > 1) throw new Error('Secondary read of frameIndex');
        return 0;
      },
      get updatedAt() {
        readCounts.updatedAt++;
        if (readCounts.updatedAt > 1) throw new Error('Secondary read of updatedAt');
        return 1000;
      },
      get blob() {
        readCounts.blob++;
        if (readCounts.blob > 1) throw new Error('Secondary read of blob');
        return normalBlob;
      },
    } as unknown as RecoverySourceBlobRecord;

    const adversarialResult = await buildRecoveryPlan({
      assessment,
      sourceBlobs: [adversarialRecord],
    });

    expect(adversarialResult.status).toBe('ready');
    expect(adversarialResult).toEqual(normalResult);

    // Verify each property was evaluated exactly once
    expect(readCounts.recordId).toBe(1);
    expect(readCounts.projectId).toBe(1);
    expect(readCounts.layerId).toBe(1);
    expect(readCounts.frameIndex).toBe(1);
    expect(readCounts.updatedAt).toBe(1);
    expect(readCounts.blob).toBe(1);
  });

  it('reads blob.size and blob.type exactly once, resisting getter mutation or secondary read throws', async () => {
    const project = createValidProject();
    const assessment = createValidAssessment(project, { scannedBlobsCount: 1 });
    const rawBlob = createPngBlob(64, 64, 'image/png');

    let sizeReads = 0;
    let typeReads = 0;
    const expectedSize = rawBlob.size;
    const expectedType = rawBlob.type;

    Object.defineProperty(rawBlob, 'size', {
      get() {
        sizeReads++;
        if (sizeReads > 1) throw new Error('Secondary read of blob.size');
        return expectedSize;
      },
      configurable: true,
    });

    Object.defineProperty(rawBlob, 'type', {
      get() {
        typeReads++;
        if (typeReads > 1) throw new Error('Secondary read of blob.type');
        return expectedType;
      },
      configurable: true,
    });

    const result = await buildRecoveryPlan({
      assessment,
      sourceBlobs: [
        {
          recordId: 1,
          projectId: 'proj-123',
          layerId: 'layer-1',
          frameIndex: 0,
          blob: rawBlob,
          updatedAt: 1000,
        },
      ],
    });

    expect(result.status).toBe('ready');
    if (result.status === 'ready') {
      expect(result.candidatePlan.blobRemapEntries).toHaveLength(1);
      expect(result.candidatePlan.blobRemapEntries[0].expectedSizeBytes).toBe(expectedSize);
      expect(result.candidatePlan.blobRemapEntries[0].expectedMimeType).toBe(expectedType);
    }
    expect(sizeReads).toBe(1);
    expect(typeReads).toBe(1);
  });

  it('reads assessment and decisions properties exactly once into local snapshots', async () => {
    const baseProject = createValidProject({
      frames: [
        { id: 'f0', durationMs: 100, layers: [{ id: 'l0', name: 'L0', visible: true, locked: false, opacity: 1, blendMode: 'source-over' }] },
        { id: 'f1', durationMs: 100, layers: [{ id: 'l1', name: 'L1', visible: true, locked: false, opacity: 1, blendMode: 'source-over' }] },
      ],
    });

    let statusReads = 0;
    let projectIdReads = 0;
    let projectReads = 0;
    let metadataReads = 0;
    let scannedBlobsCountReads = 0;

    const adversarialAssessment = {
      get status() {
        statusReads++;
        if (statusReads > 1) throw new Error('Secondary read of assessment.status');
        return 'recoverable-envelope-exceeded';
      },
      get projectId() {
        projectIdReads++;
        if (projectIdReads > 1) throw new Error('Secondary read of assessment.projectId');
        return 'proj-123';
      },
      get project() {
        projectReads++;
        if (projectReads > 1) throw new Error('Secondary read of assessment.project');
        return baseProject;
      },
      get metadata() {
        metadataReads++;
        if (metadataReads > 1) throw new Error('Secondary read of assessment.metadata');
        return {
          schemaVersion: 1,
          layerCount: 2,
          frameCount: 2,
          hasBlobs: false,
          maxFrameDimension: { width: 64, height: 64 },
          unsupportedFeatures: [],
        };
      },
      get scannedBlobsCount() {
        scannedBlobsCountReads++;
        if (scannedBlobsCountReads > 1) throw new Error('Secondary read of assessment.scannedBlobsCount');
        return 0;
      },
    } as unknown as RecoverableStoredAssessment;

    let deleteFrameIndicesReads = 0;
    let deleteLayerIdsReads = 0;
    let clipConsentGrantedReads = 0;

    const adversarialDecisions = {
      get deleteFrameIndices() {
        deleteFrameIndicesReads++;
        if (deleteFrameIndicesReads > 1) throw new Error('Secondary read of decisions.deleteFrameIndices');
        return [1];
      },
      get deleteLayerIds() {
        deleteLayerIdsReads++;
        if (deleteLayerIdsReads > 1) throw new Error('Secondary read of decisions.deleteLayerIds');
        return [];
      },
      get clipConsentGranted() {
        clipConsentGrantedReads++;
        if (clipConsentGrantedReads > 1) throw new Error('Secondary read of decisions.clipConsentGranted');
        return false;
      },
    };

    const result = await buildRecoveryPlan({
      assessment: adversarialAssessment,
      sourceBlobs: [],
      decisions: adversarialDecisions,
    });

    expect(result.status).toBe('ready');
    expect(statusReads).toBe(1);
    expect(projectIdReads).toBe(1);
    expect(projectReads).toBe(1);
    expect(metadataReads).toBe(1);
    expect(scannedBlobsCountReads).toBe(1);
    expect(deleteFrameIndicesReads).toBe(1);
    expect(deleteLayerIdsReads).toBe(1);
    expect(clipConsentGrantedReads).toBe(1);
  });

  // ---------------------------------------------------------------------------
  // 18. Hostile Array Iterator Defenses (Bounded Indexed Snapshots)
  // ---------------------------------------------------------------------------
  it('never accesses or invokes sourceBlobs[Symbol.iterator] and ignores throwing iterators', async () => {
    const project = createValidProject();
    const assessment = createValidAssessment(project, { scannedBlobsCount: 1 });
    const normalBlob = createPngBlob(64, 64, 'image/png');
    const record: RecoverySourceBlobRecord = {
      recordId: 1,
      projectId: 'proj-123',
      layerId: 'layer-1',
      frameIndex: 0,
      blob: normalBlob,
      updatedAt: 1000,
    };

    let iteratorAccessed = false;
    const hostileSourceBlobs = [record];
    Object.defineProperty(hostileSourceBlobs, Symbol.iterator, {
      get() {
        iteratorAccessed = true;
        throw new Error('Hostile Symbol.iterator must never be accessed or invoked');
      },
      configurable: true,
    });

    const result = await buildRecoveryPlan({
      assessment,
      sourceBlobs: hostileSourceBlobs,
    });

    expect(result.status).toBe('ready');
    expect(iteratorAccessed).toBe(false);
    if (result.status === 'ready') {
      expect(result.candidatePlan.blobRemapEntries).toHaveLength(1);
      expect(result.candidatePlan.blobRemapEntries[0].sourceRecordId).toBe(1);
    }
  });

  it('never accesses or invokes decision-array iterators, ignoring throwing iterators', async () => {
    const project = createValidProject({
      frames: [
        {
          id: 'f0',
          durationMs: 100,
          layers: [
            { id: 'l0', name: 'L0', visible: true, locked: false, opacity: 1, blendMode: 'source-over' },
            { id: 'l0_surviving', name: 'L0 Surviving', visible: true, locked: false, opacity: 1, blendMode: 'source-over' },
          ],
        },
        { id: 'f1', durationMs: 100, layers: [{ id: 'l1', name: 'L1', visible: true, locked: false, opacity: 1, blendMode: 'source-over' }] },
      ],
    });
    const assessment = createValidAssessment(project, { scannedBlobsCount: 0 });

    let frameIteratorAccessed = false;
    const hostileFrameIndices = [1];
    Object.defineProperty(hostileFrameIndices, Symbol.iterator, {
      get() {
        frameIteratorAccessed = true;
        throw new Error('deleteFrameIndices Symbol.iterator must never be accessed or invoked');
      },
      configurable: true,
    });

    let layerIteratorAccessed = false;
    const hostileLayerIds = ['l0'];
    Object.defineProperty(hostileLayerIds, Symbol.iterator, {
      get() {
        layerIteratorAccessed = true;
        throw new Error('deleteLayerIds Symbol.iterator must never be accessed or invoked');
      },
      configurable: true,
    });

    const result = await buildRecoveryPlan({
      assessment,
      sourceBlobs: [],
      decisions: {
        deleteFrameIndices: hostileFrameIndices,
        deleteLayerIds: hostileLayerIds,
      },
    });

    expect(result.status).toBe('ready');
    expect(frameIteratorAccessed).toBe(false);
    expect(layerIteratorAccessed).toBe(false);
    if (result.status === 'ready') {
      expect(result.candidatePlan.deletedFrameIndices).toEqual([1]);
      expect(result.candidatePlan.deletedLayerIds).toEqual(['l0']);
    }
  });

  it('prevents iterators that yield beyond declared length from injecting extra records or decisions', async () => {
    const project = createValidProject({
      frames: [
        { id: 'f0', durationMs: 100, layers: [{ id: 'l0', name: 'L0', visible: true, locked: false, opacity: 1, blendMode: 'source-over' }] },
        { id: 'f1', durationMs: 100, layers: [{ id: 'l1', name: 'L1', visible: true, locked: false, opacity: 1, blendMode: 'source-over' }] },
      ],
    });
    const assessment = createValidAssessment(project, { scannedBlobsCount: 1 });
    const normalBlob = createPngBlob(64, 64, 'image/png');

    const validRecord: RecoverySourceBlobRecord = {
      recordId: 1,
      projectId: 'proj-123',
      layerId: 'l0',
      frameIndex: 0,
      blob: normalBlob,
      updatedAt: 1000,
    };
    const injectedRecord: RecoverySourceBlobRecord = {
      recordId: 999,
      projectId: 'proj-123',
      layerId: 'l1',
      frameIndex: 1,
      blob: normalBlob,
      updatedAt: 1000,
    };

    // Array length is 1, but its generator iterator yields 2 records
    const sourceBlobs = [validRecord];
    Object.defineProperty(sourceBlobs, Symbol.iterator, {
      value: function* () {
        yield validRecord;
        yield injectedRecord;
      },
      configurable: true,
    });

    // Decision array length is 1 [1], but generator iterator yields [1, 0] (which would delete all frames)
    const deleteFrameIndices = [1];
    Object.defineProperty(deleteFrameIndices, Symbol.iterator, {
      value: function* () {
        yield 1;
        yield 0;
      },
      configurable: true,
    });

    const result = await buildRecoveryPlan({
      assessment,
      sourceBlobs,
      decisions: {
        deleteFrameIndices,
      },
    });

    // If iterator had been executed:
    // - injectedRecord would have been processed
    // - frame 0 would have been deleted alongside frame 1, triggering ALL_FRAMES_DELETED
    expect(result.status).toBe('ready');
    if (result.status === 'ready') {
      expect(result.candidatePlan.blobRemapEntries).toHaveLength(1);
      expect(result.candidatePlan.blobRemapEntries[0].sourceRecordId).toBe(1);
      expect(result.candidatePlan.deletedFrameIndices).toEqual([1]);
    }
  });

  it('reads length and each indexed element exactly once through observable Proxies', async () => {
    const project = createValidProject({
      frames: [
        { id: 'f0', durationMs: 100, layers: [{ id: 'l0', name: 'L0', visible: true, locked: false, opacity: 1, blendMode: 'source-over' }] },
        { id: 'f1', durationMs: 100, layers: [{ id: 'l1', name: 'L1', visible: true, locked: false, opacity: 1, blendMode: 'source-over' }] },
      ],
    });
    const assessment = createValidAssessment(project, { scannedBlobsCount: 1 });
    const normalBlob = createPngBlob(64, 64, 'image/png');

    const record: RecoverySourceBlobRecord = {
      recordId: 1,
      projectId: 'proj-123',
      layerId: 'l0',
      frameIndex: 0,
      blob: normalBlob,
      updatedAt: 1000,
    };

    let blobLengthReads = 0;
    let blobIndex0Reads = 0;
    let blobIteratorGets = 0;

    const proxySourceBlobs = new Proxy([record], {
      get(target, prop, receiver) {
        if (prop === 'length') {
          blobLengthReads++;
          if (blobLengthReads > 1) throw new Error('Secondary read of sourceBlobs.length');
          return target.length;
        }
        if (prop === '0') {
          blobIndex0Reads++;
          if (blobIndex0Reads > 1) throw new Error('Secondary read of sourceBlobs[0]');
          return target[0];
        }
        if (prop === Symbol.iterator) {
          blobIteratorGets++;
          throw new Error('Symbol.iterator accessed on sourceBlobs');
        }
        return Reflect.get(target, prop, receiver);
      },
    });

    let decisionLengthReads = 0;
    let decisionIndex0Reads = 0;
    let decisionIteratorGets = 0;

    const proxyFrameIndices = new Proxy([1], {
      get(target, prop, receiver) {
        if (prop === 'length') {
          decisionLengthReads++;
          if (decisionLengthReads > 1) throw new Error('Secondary read of deleteFrameIndices.length');
          return target.length;
        }
        if (prop === '0') {
          decisionIndex0Reads++;
          if (decisionIndex0Reads > 1) throw new Error('Secondary read of deleteFrameIndices[0]');
          return target[0];
        }
        if (prop === Symbol.iterator) {
          decisionIteratorGets++;
          throw new Error('Symbol.iterator accessed on deleteFrameIndices');
        }
        return Reflect.get(target, prop, receiver);
      },
    });

    const result = await buildRecoveryPlan({
      assessment,
      sourceBlobs: proxySourceBlobs as unknown as RecoverySourceBlobRecord[],
      decisions: {
        deleteFrameIndices: proxyFrameIndices as unknown as number[],
      },
    });

    expect(result.status).toBe('ready');
    expect(blobLengthReads).toBe(1);
    expect(blobIndex0Reads).toBe(1);
    expect(blobIteratorGets).toBe(0);
    expect(decisionLengthReads).toBe(1);
    expect(decisionIndex0Reads).toBe(1);
    expect(decisionIteratorGets).toBe(0);
  });

  it('rejects a sourceBlobs length/count mismatch before any element or iterator access', async () => {
    const project = createValidProject();
    const assessment = createValidAssessment(project, { scannedBlobsCount: 5 });

    let elementAccessed = false;
    let iteratorAccessed = false;

    // Array with declared length 2 (mismatch against scannedBlobsCount 5)
    const mismatchArray: RecoverySourceBlobRecord[] = [];
    Object.defineProperty(mismatchArray, '0', {
      get() {
        elementAccessed = true;
        throw new Error('Element 0 must not be accessed on length mismatch');
      },
      configurable: true,
    });
    Object.defineProperty(mismatchArray, Symbol.iterator, {
      get() {
        iteratorAccessed = true;
        throw new Error('Symbol.iterator must not be accessed on length mismatch');
      },
      configurable: true,
    });
    mismatchArray.length = 2;

    const result = await buildRecoveryPlan({
      assessment,
      sourceBlobs: mismatchArray,
    });

    expect(result.status).toBe('unrecoverable-blocked');
    if (result.status === 'unrecoverable-blocked') {
      expect(result.reasonCode).toBe('INCOMPLETE_SOURCE_BLOB_SNAPSHOT');
    }
    expect(elementAccessed).toBe(false);
    expect(iteratorAccessed).toBe(false);
  });

  it('preserves identical deterministic output when using ordinary arrays', async () => {
    const project = createValidProject({
      frames: [
        { id: 'f0', durationMs: 100, layers: [{ id: 'l0', name: 'L0', visible: true, locked: false, opacity: 1, blendMode: 'source-over' }] },
        { id: 'f1', durationMs: 100, layers: [{ id: 'l1', name: 'L1', visible: true, locked: false, opacity: 1, blendMode: 'source-over' }] },
      ],
    });
    const normalBlob = createPngBlob(64, 64, 'image/png');
    const sourceBlobs: RecoverySourceBlobRecord[] = [
      {
        recordId: 1,
        projectId: 'proj-123',
        layerId: 'l0',
        frameIndex: 0,
        blob: normalBlob,
        updatedAt: 1000,
      },
    ];

    const assessment = createValidAssessment(project, { scannedBlobsCount: 1 });

    const result = await buildRecoveryPlan({
      assessment,
      sourceBlobs,
      decisions: {
        deleteFrameIndices: [1],
      },
    });

    expect(result.status).toBe('ready');
    if (result.status === 'ready') {
      expect(result.candidatePlan.blobRemapEntries).toHaveLength(1);
      expect(result.candidatePlan.blobRemapEntries[0].sourceRecordId).toBe(1);
      expect(result.candidatePlan.blobRemapEntries[0].targetLayerId).toBe('l0');
      expect(result.candidatePlan.blobRemapEntries[0].targetFrameIndex).toBe(0);
      expect(result.candidatePlan.deletedFrameIndices).toEqual([1]);
    }
  });
});
