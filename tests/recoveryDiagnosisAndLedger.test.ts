import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import Dexie from 'dexie';
import { db, deleteProject } from '@/lib/storage/db';
import { assessStoredProject } from '@/lib/recovery/recoveryDiagnosis';
import {
  recordRecoveryAssessment,
  getRecoveryRecord,
} from '@/lib/recovery/recoveryLedger';
import { PROJECT_FORMAT_ID, PROJECT_FORMAT_VERSION, type ProjectFile } from '@/types/project';
import { RECOVERY_INSPECTION_CEILINGS } from '@/lib/recovery/recoveryLimits';
import {
  type DeterministicRecoveryAssessment,
  type RecoveryReasonCode,
  sortReasonCodes,
} from '@/lib/recovery/recoveryTypes';

function createPngBlob(width: number, height: number): Blob {
  const bytes = new Uint8Array(24);
  // PNG Magic (8 bytes)
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  // IHDR length 13 (4 bytes)
  bytes.set([0x00, 0x00, 0x00, 0x0d], 8);
  // 'IHDR' (4 bytes)
  bytes.set([0x49, 0x48, 0x44, 0x52], 12);
  // Width & Height (Big Endian)
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width, false);
  view.setUint32(20, height, false);
  return new Blob([bytes], { type: 'image/png' });
}

function createCorruptPngBlob(): Blob {
  // Truncated invalid bytes
  return new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x00])], { type: 'image/png' });
}

function baseProjectFixture(_id = 'proj-test-1', width = 32, height = 32): ProjectFile {
  return {
    format: PROJECT_FORMAT_ID,
    version: PROJECT_FORMAT_VERSION,
    name: 'Stored Project Diagnosis',
    width,
    height,
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
    palettes: [{ id: 'pal-1', name: 'Cozy', colors: ['#3A2E4C', '#F0BE7C'] }],
    currentPaletteId: 'pal-1',
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
            opacity: 1,
            blendMode: 'source-over',
          },
        ],
      },
    ],
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  };
}

async function seedProject(
  id: string,
  project: ProjectFile,
  blobs: Array<{
    id?: number | string;
    layerId: string;
    frameIndex: number;
    blob: Blob;
  }> = []
) {
  await db.projects.put({
    id,
    name: project.name,
    width: project.width,
    height: project.height,
    fps: project.fps,
    dataJson: JSON.stringify(project),
    updatedAt: project.updatedAt ?? Date.now(),
    createdAt: project.createdAt ?? Date.now(),
  });

  for (const b of blobs) {
    await db.layerBlobs.put({
      id: b.id as unknown as number,
      projectId: id,
      layerId: b.layerId,
      frameIndex: b.frameIndex,
      blob: b.blob,
      updatedAt: Date.now(),
    });
  }
}

describe('Phase 1B.2: Recovery Ledger and Stored-Blob Diagnosis', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    if (!db.isOpen()) {
      await db.open();
    }
    await db.projects.clear();
    await db.layerBlobs.clear();
    await db.recoveryRecords.clear();
  });

  it('migrates from Dexie schema v4 to v5, adding recoveryRecords and compound index [projectId+id]', async () => {
    const testDbName = `pixibun-test-migration-${Date.now()}`;
    const v4Db = new Dexie(testDbName);
    v4Db.version(4).stores({
      projects: 'id, name, updatedAt, createdAt',
      diagnostics: 'id, kind, timestamp',
      layerBlobs: '++id, [projectId+layerId+frameIndex], projectId, layerId',
    });
    await v4Db.open();

    await v4Db.table('projects').put({
      id: 'proj-mig-v4',
      name: 'V4 Project',
      dataJson: JSON.stringify(baseProjectFixture('proj-mig-v4')),
      updatedAt: 1000,
      createdAt: 1000,
    });
    await v4Db.table('layerBlobs').put({
      id: 1,
      projectId: 'proj-mig-v4',
      layerId: 'layer-1',
      frameIndex: 0,
      blob: createPngBlob(32, 32),
      updatedAt: 1000,
    });
    v4Db.close();

    const v5Db = new Dexie(testDbName);
    v5Db.version(4).stores({
      projects: 'id, name, updatedAt, createdAt',
      diagnostics: 'id, kind, timestamp',
      layerBlobs: '++id, [projectId+layerId+frameIndex], projectId, layerId',
    });
    v5Db.version(5).stores({
      projects: 'id, name, updatedAt, createdAt',
      diagnostics: 'id, kind, timestamp',
      layerBlobs: '++id, [projectId+layerId+frameIndex], projectId, layerId, [projectId+id]',
      recoveryRecords: 'projectId, classificationState, lastConfirmedAt',
    });
    await v5Db.open();

    const project = await v5Db.table('projects').get('proj-mig-v4');
    expect(project.name).toBe('V4 Project');

    const blobs = await v5Db
      .table('layerBlobs')
      .where('[projectId+id]')
      .between(['proj-mig-v4', Dexie.minKey], ['proj-mig-v4', Dexie.maxKey], true, true)
      .toArray();
    expect(blobs).toHaveLength(1);
    expect(blobs[0].id).toBe(1);

    await v5Db.table('recoveryRecords').put({
      projectId: 'proj-mig-v4',
      classificationState: 'recoverable-envelope-exceeded',
      firstDetectedAt: 1000,
      lastConfirmedAt: 1000,
      reasonCodes: ['ENVELOPE_MAX_FRAMES'],
    });
    const record = await v5Db.table('recoveryRecords').get('proj-mig-v4');
    expect(record.classificationState).toBe('recoverable-envelope-exceeded');

    v5Db.close();
    await Dexie.delete(testDbName);
  });

  it('resumes keyset pagination on compound index [projectId+id] across multiple batches without duplicates', async () => {
    const proj = baseProjectFixture('proj-paging', 32, 32);
    proj.frames = Array.from({ length: 60 }, (_, f) => ({
      id: `f-${f}`,
      durationMs: 100,
      layers: [{ id: `l-${f}`, name: `L`, visible: true, locked: false, opacity: 1, blendMode: 'source-over' }],
    }));

    const blobs = proj.frames.map((_, i) => ({
      id: i + 1,
      layerId: `l-${i}`,
      frameIndex: i,
      blob: createPngBlob(32, 32),
    }));

    await seedProject('proj-paging', proj, blobs);

    let progressCalls = 0;
    const assessment = await assessStoredProject('proj-paging', {
      onProgress: (prog) => {
        progressCalls++;
        expect(prog.scannedBlobs).toBeGreaterThan(0);
      },
    });

    expect(assessment.status).toBe('valid');
    if (assessment.status === 'valid') {
      expect(assessment.scannedBlobsCount).toBe(60);
      expect(assessment.orphanSummary.totalCount).toBe(0);
    }
    expect(progressCalls).toBe(3);
  });

  it('catches and reports negative, zero, fractional, string, and unsafe integer primary keys without skipping', async () => {
    const proj = baseProjectFixture('proj-keyspace', 32, 32);
    await seedProject('proj-keyspace', proj);

    // Negative primary key
    await db.layerBlobs.put({
      id: -10 as unknown as number,
      projectId: 'proj-keyspace',
      layerId: 'layer-1',
      frameIndex: 0,
      blob: createPngBlob(32, 32),
      updatedAt: Date.now(),
    });
    let assessment = await assessStoredProject('proj-keyspace');
    expect(assessment.status).toBe('unsafe-content');
    if (assessment.status === 'unsafe-content') {
      expect(assessment.reasonCode).toBe('CORRUPTED_STORED_BLOB_RECORD');
    }

    // Zero primary key
    await db.layerBlobs.clear();
    await db.layerBlobs.put({
      id: 0 as unknown as number,
      projectId: 'proj-keyspace',
      layerId: 'layer-1',
      frameIndex: 0,
      blob: createPngBlob(32, 32),
      updatedAt: Date.now(),
    });
    assessment = await assessStoredProject('proj-keyspace');
    expect(assessment.status).toBe('unsafe-content');
    if (assessment.status === 'unsafe-content') {
      expect(assessment.reasonCode).toBe('CORRUPTED_STORED_BLOB_RECORD');
    }

    // Fractional primary key
    await db.layerBlobs.clear();
    await db.layerBlobs.put({
      id: 1.5 as unknown as number,
      projectId: 'proj-keyspace',
      layerId: 'layer-1',
      frameIndex: 0,
      blob: createPngBlob(32, 32),
      updatedAt: Date.now(),
    });
    assessment = await assessStoredProject('proj-keyspace');
    expect(assessment.status).toBe('unsafe-content');
    if (assessment.status === 'unsafe-content') {
      expect(assessment.reasonCode).toBe('CORRUPTED_STORED_BLOB_RECORD');
    }

    // Greater than safe integer primary key
    await db.layerBlobs.clear();
    await db.layerBlobs.put({
      id: 9007199254740992 as unknown as number,
      projectId: 'proj-keyspace',
      layerId: 'layer-1',
      frameIndex: 0,
      blob: createPngBlob(32, 32),
      updatedAt: Date.now(),
    });
    assessment = await assessStoredProject('proj-keyspace');
    expect(assessment.status).toBe('unsafe-content');
    if (assessment.status === 'unsafe-content') {
      expect(assessment.reasonCode).toBe('CORRUPTED_STORED_BLOB_RECORD');
    }

    // String primary key
    await db.layerBlobs.clear();
    await db.layerBlobs.put({
      id: 'str-blob-key' as unknown as number,
      projectId: 'proj-keyspace',
      layerId: 'layer-1',
      frameIndex: 0,
      blob: createPngBlob(32, 32),
      updatedAt: Date.now(),
    });
    assessment = await assessStoredProject('proj-keyspace');
    expect(assessment.status).toBe('unsafe-content');
    if (assessment.status === 'unsafe-content') {
      expect(assessment.reasonCode).toBe('CORRUPTED_STORED_BLOB_RECORD');
    }
  });

  it('rejects unsafe integer frameIndex and size with CORRUPTED_STORED_BLOB_RECORD', async () => {
    const proj = baseProjectFixture('proj-unsafe-frame', 32, 32);
    await seedProject('proj-unsafe-frame', proj);

    await db.layerBlobs.put({
      id: 1,
      projectId: 'proj-unsafe-frame',
      layerId: 'layer-1',
      frameIndex: 1.5 as unknown as number,
      blob: createPngBlob(32, 32),
      updatedAt: Date.now(),
    });
    const assessment = await assessStoredProject('proj-unsafe-frame');
    expect(assessment.status).toBe('unsafe-content');
    if (assessment.status === 'unsafe-content') {
      expect(assessment.reasonCode).toBe('CORRUPTED_STORED_BLOB_RECORD');
    }
  });

  it('aborts cleanly between batches and mid-batch when AbortSignal triggers', async () => {
    const proj = baseProjectFixture('proj-cancel', 32, 32);
    proj.frames = Array.from({ length: 50 }, (_, f) => ({
      id: `f-${f}`,
      durationMs: 100,
      layers: [{ id: `l-${f}`, name: `L`, visible: true, locked: false, opacity: 1, blendMode: 'source-over' }],
    }));
    const blobs = proj.frames.map((_, i) => ({
      id: i + 1,
      layerId: `l-${i}`,
      frameIndex: i,
      blob: createPngBlob(32, 32),
    }));
    await seedProject('proj-cancel', proj, blobs);

    const controller = new AbortController();
    let batchCount = 0;
    const assessmentPromise = assessStoredProject('proj-cancel', {
      signal: controller.signal,
      onProgress: () => {
        batchCount++;
        if (batchCount === 1) {
          controller.abort();
        }
      },
    });

    const assessment = await assessmentPromise;
    expect(assessment.status).toBe('cancelled');
    if (assessment.status === 'cancelled') {
      expect(assessment.message).toContain('cancelled');
    }
  });

  it('swallows onProgress callback exceptions without misclassifying as database corruption', async () => {
    const proj = baseProjectFixture('proj-progress-throw', 32, 32);
    const blobs = [{ id: 1, layerId: 'layer-1', frameIndex: 0, blob: createPngBlob(32, 32) }];
    await seedProject('proj-progress-throw', proj, blobs);

    const assessment = await assessStoredProject('proj-progress-throw', {
      onProgress: () => {
        throw new Error('Consumer progress callback explosion');
      },
    });

    expect(assessment.status).toBe('valid');
  });

  it('stops cleanly and returns unsafe-content when blob inspection ceiling is exceeded', async () => {
    const proj = baseProjectFixture('proj-excessive', 32, 32);
    await seedProject('proj-excessive', proj);

    const originalCeiling = RECOVERY_INSPECTION_CEILINGS.MAX_INSPECTABLE_STORED_BLOBS;
    (RECOVERY_INSPECTION_CEILINGS as { MAX_INSPECTABLE_STORED_BLOBS: number }).MAX_INSPECTABLE_STORED_BLOBS = 5;

    try {
      const blobs = Array.from({ length: 6 }, (_, i) => ({
        id: i + 1,
        layerId: 'layer-orphan',
        frameIndex: 0,
        blob: createPngBlob(32, 32),
      }));
      for (const b of blobs) {
        await db.layerBlobs.put({
          id: b.id,
          projectId: 'proj-excessive',
          layerId: b.layerId,
          frameIndex: b.frameIndex,
          blob: b.blob,
          updatedAt: Date.now(),
        });
      }

      const assessment = await assessStoredProject('proj-excessive');
      expect(assessment.status).toBe('unsafe-content');
      if (assessment.status === 'unsafe-content') {
        expect(assessment.reasonCode).toBe('EXCESSIVE_STORED_BLOBS');
      }
    } finally {
      (RECOVERY_INSPECTION_CEILINGS as { MAX_INSPECTABLE_STORED_BLOBS: number }).MAX_INSPECTABLE_STORED_BLOBS = originalCeiling;
    }
  });

  it('bounds InvalidLayerSummary details to MAX_RECORDED_INVALID_LAYERS while counting all affected layers', async () => {
    const proj = baseProjectFixture('proj-many-invalid-layers', 32, 32);
    // Create 120 layers in frame 0
    proj.frames[0].layers = Array.from({ length: 120 }, (_, i) => ({
      id: `l-${i}`,
      name: `L ${i}`,
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: 'source-over',
      pngBase64: 'embedded-raster', // every layer invalid
    }));
    await seedProject('proj-many-invalid-layers', proj);

    const assessment = await assessStoredProject('proj-many-invalid-layers');
    expect(assessment.status).toBe('recoverable-blob-invalid');
    if (assessment.status === 'recoverable-blob-invalid') {
      expect(assessment.invalidLayerSummary.affectedLayerCount).toBe(120);
      expect(assessment.invalidLayerSummary.totalReasonCount).toBe(120);
      expect(assessment.invalidLayerSummary.detailsTruncated).toBe(true);
      expect(assessment.invalidLayerSummary.details).toHaveLength(
        RECOVERY_INSPECTION_CEILINGS.MAX_RECORDED_INVALID_LAYERS
      );
    }
  });

  it('determines deterministic multi-reason priority for a single layer', async () => {
    const proj = baseProjectFixture('proj-multi-reason', 32, 32);
    // Layer has embedded raster AND corrupted blob header
    proj.frames[0].layers[0].pngBase64 = 'some-embedded-data';
    const blobs = [{ id: 1, layerId: 'layer-1', frameIndex: 0, blob: createCorruptPngBlob() }];
    await seedProject('proj-multi-reason', proj, blobs);

    const assessment = await assessStoredProject('proj-multi-reason');
    expect(assessment.status).toBe('recoverable-blob-invalid');
    if (assessment.status === 'recoverable-blob-invalid') {
      expect(assessment.invalidLayerSummary.affectedLayerCount).toBe(1);
      expect(assessment.invalidLayerSummary.totalReasonCount).toBe(2);
      const detail = assessment.invalidLayerSummary.details[0];
      // CORRUPTED_PNG_HEADER has higher priority (1) than EMBEDDED_RASTER_UNSUPPORTED (4)
      expect(detail.reason).toBe('CORRUPTED_PNG_HEADER');
      expect(detail.reasons).toEqual(['CORRUPTED_PNG_HEADER', 'EMBEDDED_RASTER_UNSUPPORTED']);
      expect(assessment.reasonCodes).toContain('CORRUPTED_PNG_HEADER');
      expect(assessment.reasonCodes).toContain('EMBEDDED_RASTER_UNSUPPORTED');
    }
  });

  it('treats transparent layer with zero blobs and no pngBase64 as completely valid', async () => {
    const proj = baseProjectFixture('proj-transparent', 32, 32);
    await seedProject('proj-transparent', proj, []);

    const assessment = await assessStoredProject('proj-transparent');
    expect(assessment.status).toBe('valid');
    if (assessment.status === 'valid') {
      expect(assessment.scannedBlobsCount).toBe(0);
      expect(assessment.orphanSummary.totalCount).toBe(0);
    }
  });

  it('detects corrupt or truncated PNG header and reports CORRUPTED_PNG_HEADER', async () => {
    const proj = baseProjectFixture('proj-corrupt-png', 32, 32);
    const blobs = [{ id: 1, layerId: 'layer-1', frameIndex: 0, blob: createCorruptPngBlob() }];
    await seedProject('proj-corrupt-png', proj, blobs);

    const assessment = await assessStoredProject('proj-corrupt-png');
    expect(assessment.status).toBe('recoverable-blob-invalid');
    if (assessment.status === 'recoverable-blob-invalid') {
      expect(assessment.reasonCodes).toContain('CORRUPTED_PNG_HEADER');
      expect(assessment.invalidLayerSummary.details[0].reason).toBe('CORRUPTED_PNG_HEADER');
    }
  });

  it('detects dimension mismatch and reports BLOB_DIMENSION_MISMATCH', async () => {
    const proj = baseProjectFixture('proj-dim-mismatch', 32, 32);
    const blobs = [{ id: 1, layerId: 'layer-1', frameIndex: 0, blob: createPngBlob(64, 64) }];
    await seedProject('proj-dim-mismatch', proj, blobs);

    const assessment = await assessStoredProject('proj-dim-mismatch');
    expect(assessment.status).toBe('recoverable-blob-invalid');
    if (assessment.status === 'recoverable-blob-invalid') {
      expect(assessment.reasonCodes).toContain('BLOB_DIMENSION_MISMATCH');
      expect(assessment.invalidLayerSummary.details[0].reason).toBe('BLOB_DIMENSION_MISMATCH');
    }
  });

  it('detects duplicate matching blob records and reports DUPLICATE_BLOB_MAPPING', async () => {
    const proj = baseProjectFixture('proj-dup-blobs', 32, 32);
    const blobs = [
      { id: 1, layerId: 'layer-1', frameIndex: 0, blob: createPngBlob(32, 32) },
      { id: 2, layerId: 'layer-1', frameIndex: 0, blob: createPngBlob(32, 32) },
    ];
    await seedProject('proj-dup-blobs', proj, blobs);

    const assessment = await assessStoredProject('proj-dup-blobs');
    expect(assessment.status).toBe('recoverable-blob-invalid');
    if (assessment.status === 'recoverable-blob-invalid') {
      expect(assessment.reasonCodes).toContain('DUPLICATE_BLOB_MAPPING');
      expect(assessment.invalidLayerSummary.details[0].reason).toBe('DUPLICATE_BLOB_MAPPING');
    }
  });

  it('does NOT expose raw layer IDs in OrphanBlobDetail; provides safe ordinal descriptors', async () => {
    const dangerousOrphanLayerId = '/etc/passwd:🎨_dangerous_unicode_#1\x00\x1f';
    const proj = baseProjectFixture('proj-orphan-privacy', 32, 32);
    const blobs = [
      { id: 1, layerId: 'layer-1', frameIndex: 0, blob: createPngBlob(32, 32) },
      { id: 2, layerId: dangerousOrphanLayerId, frameIndex: 0, blob: createPngBlob(32, 32) },
    ];
    await seedProject('proj-orphan-privacy', proj, blobs);

    const assessment = await assessStoredProject('proj-orphan-privacy');
    expect(assessment.status).toBe('valid');
    if (assessment.status === 'valid') {
      expect(assessment.orphanSummary.totalCount).toBe(1);
      const detail = assessment.orphanSummary.details[0];
      expect(detail).toBeDefined();
      expect(detail).not.toHaveProperty('layerId');
      expect(detail.recordId).toBe(2);
      expect(detail.ordinal).toBe(1);
      expect(detail.frameIndex).toBe(0);
      expect(detail.sizeBytes).toBeGreaterThan(0);
    }
  });

  it('flags empty, whitespace, data URL, and arbitrary strings in pngBase64 as EMBEDDED_RASTER_UNSUPPORTED', async () => {
    // Empty string
    const p1 = baseProjectFixture('proj-emb-empty', 32, 32);
    p1.frames[0].layers[0].pngBase64 = '';
    await seedProject('proj-emb-empty', p1);
    const a1 = await assessStoredProject('proj-emb-empty');
    expect(a1.status).toBe('recoverable-blob-invalid');
    if (a1.status === 'recoverable-blob-invalid') {
      expect(a1.reasonCodes).toContain('EMBEDDED_RASTER_UNSUPPORTED');
    }

    // Whitespace string
    const p2 = baseProjectFixture('proj-emb-space', 32, 32);
    p2.frames[0].layers[0].pngBase64 = '   ';
    await seedProject('proj-emb-space', p2);
    const a2 = await assessStoredProject('proj-emb-space');
    expect(a2.status).toBe('recoverable-blob-invalid');
    if (a2.status === 'recoverable-blob-invalid') {
      expect(a2.reasonCodes).toContain('EMBEDDED_RASTER_UNSUPPORTED');
    }

    // Data URL
    const p3 = baseProjectFixture('proj-emb-dataurl', 32, 32);
    p3.frames[0].layers[0].pngBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    await seedProject('proj-emb-dataurl', p3);
    const a3 = await assessStoredProject('proj-emb-dataurl');
    expect(a3.status).toBe('recoverable-blob-invalid');
    if (a3.status === 'recoverable-blob-invalid') {
      expect(a3.reasonCodes).toContain('EMBEDDED_RASTER_UNSUPPORTED');
    }

    // Embedded string plus valid IndexedDB blob
    const p4 = baseProjectFixture('proj-emb-plus-blob', 32, 32);
    p4.frames[0].layers[0].pngBase64 = 'arbitrary-string';
    const blobs = [{ id: 1, layerId: 'layer-1', frameIndex: 0, blob: createPngBlob(32, 32) }];
    await seedProject('proj-emb-plus-blob', p4, blobs);
    const a4 = await assessStoredProject('proj-emb-plus-blob');
    expect(a4.status).toBe('recoverable-blob-invalid');
    if (a4.status === 'recoverable-blob-invalid') {
      expect(a4.reasonCodes).toContain('EMBEDDED_RASTER_UNSUPPORTED');
    }
  });

  it('preserves both metadata envelope violations and blob-invalid reason codes simultaneously', async () => {
    const proj = baseProjectFixture('proj-dual-failure', 32, 32);
    proj.frames[0].layers = Array.from({ length: 101 }, (_, i) => ({
      id: `l-${i}`,
      name: `L ${i}`,
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: 'source-over',
    }));
    const blobs = [{ id: 1, layerId: 'l-0', frameIndex: 0, blob: createCorruptPngBlob() }];
    await seedProject('proj-dual-failure', proj, blobs);

    const assessment = await assessStoredProject('proj-dual-failure');
    expect(assessment.status).toBe('recoverable-blob-invalid');
    if (assessment.status === 'recoverable-blob-invalid') {
      expect(assessment.reasonCodes).toContain('ENVELOPE_MAX_LAYERS_PER_FRAME');
      expect(assessment.reasonCodes).toContain('CORRUPTED_PNG_HEADER');
      expect(assessment.violations).toBeDefined();
      expect(assessment.invalidLayerSummary.affectedLayerCount).toBe(1);
    }
  });

  it('assessment guarantees absolute byte-for-byte immutability across all stored records', async () => {
    const proj = baseProjectFixture('proj-immutability-check', 32, 32);
    const blob1 = createPngBlob(32, 32);
    const blobs = [{ id: 1, layerId: 'layer-1', frameIndex: 0, blob: blob1 }];
    await seedProject('proj-immutability-check', proj, blobs);

    await db.recoveryRecords.put({
      projectId: 'proj-immutability-check',
      classificationState: 'recoverable-envelope-exceeded',
      firstDetectedAt: 123456,
      lastConfirmedAt: 123456,
      reasonCodes: ['ENVELOPE_MAX_FRAMES'],
    });

    const projectBefore = await db.projects.get('proj-immutability-check');
    const blobsBefore = await db.layerBlobs.where('projectId').equals('proj-immutability-check').toArray();
    const bytesBefore = await blobsBefore[0].blob.arrayBuffer();
    const recoveryBefore = await db.recoveryRecords.get('proj-immutability-check');

    await assessStoredProject('proj-immutability-check');

    const projectAfter = await db.projects.get('proj-immutability-check');
    const blobsAfter = await db.layerBlobs.where('projectId').equals('proj-immutability-check').toArray();
    const bytesAfter = await blobsAfter[0].blob.arrayBuffer();
    const recoveryAfter = await db.recoveryRecords.get('proj-immutability-check');

    expect(projectAfter).toEqual(projectBefore);
    expect(blobsAfter[0].id).toBe(blobsBefore[0].id);
    expect(blobsAfter[0].layerId).toBe(blobsBefore[0].layerId);
    expect(blobsAfter[0].frameIndex).toBe(blobsBefore[0].frameIndex);
    expect(Buffer.from(bytesAfter).equals(Buffer.from(bytesBefore))).toBe(true);
    expect(recoveryAfter).toEqual(recoveryBefore);
  });

  it('handles transient database read failure by returning transient-load-failure without altering ledger', async () => {
    const proj = baseProjectFixture('proj-transient', 32, 32);
    await seedProject('proj-transient', proj);

    const getSpy = vi.spyOn(db.projects, 'get').mockRejectedValueOnce(new Error('Transient DB I/O Failure'));

    const assessment = await assessStoredProject('proj-transient');
    expect(assessment.status).toBe('transient-load-failure');
    expect(await db.recoveryRecords.get('proj-transient')).toBeUndefined();
    getSpy.mockRestore();
  });

  it('prevents orphaned ledger records when project is deleted before ledger recording', async () => {
    const projId = 'proj-orphan-race';
    const proj = baseProjectFixture(projId, 32, 32);
    await seedProject(projId, proj);

    const assessment: DeterministicRecoveryAssessment = {
      status: 'recoverable-envelope-exceeded',
      projectId: projId,
      project: proj,
      metadata: {
        name: 'Race',
        width: 32,
        height: 32,
        frameCount: 1,
        totalLayerCount: 1,
        maxLayersInAFrame: 1,
        materializableRasterPixels: 1024,
        baseRawRgbaBytes: 4096,
        fps: 12,
        version: 2,
        createdAt: 100,
        updatedAt: 100,
      },
      violations: [],
      reasonCodes: ['ENVELOPE_MAX_FRAMES'],
      orphanSummary: { totalCount: 0, duplicateCount: 0, detailsTruncated: false, details: [] },
      scannedBlobsCount: 0,
    };

    // Simulate concurrent deletion
    await db.projects.delete(projId);

    await expect(recordRecoveryAssessment(assessment)).rejects.toThrow(
      /not found/i
    );
    expect(await db.recoveryRecords.get(projId)).toBeUndefined();
  });

  it('runtime-validates ledger inputs and throws TypeError on forgeries and bounds violations', async () => {
    const projId = 'proj-forgery';
    const proj = baseProjectFixture(projId, 32, 32);
    await seedProject(projId, proj);

    // Non-plain object
    await expect(recordRecoveryAssessment(null as unknown as DeterministicRecoveryAssessment)).rejects.toThrow(TypeError);
    await expect(recordRecoveryAssessment([] as unknown as DeterministicRecoveryAssessment)).rejects.toThrow(TypeError);

    // Empty or whitespace project ID
    await expect(
      recordRecoveryAssessment({
        status: 'recoverable-envelope-exceeded',
        projectId: '   ',
        reasonCodes: ['ENVELOPE_MAX_FRAMES'],
      } as unknown as DeterministicRecoveryAssessment)
    ).rejects.toThrow(TypeError);

    // Oversized project ID (>128 chars)
    await expect(
      recordRecoveryAssessment({
        status: 'recoverable-envelope-exceeded',
        projectId: 'a'.repeat(129),
        reasonCodes: ['ENVELOPE_MAX_FRAMES'],
      } as unknown as DeterministicRecoveryAssessment)
    ).rejects.toThrow(TypeError);

    // Non-array reasonCodes
    await expect(
      recordRecoveryAssessment({
        status: 'recoverable-envelope-exceeded',
        projectId: projId,
        reasonCodes: 'not-an-array' as unknown as RecoveryReasonCode[],
      } as unknown as DeterministicRecoveryAssessment)
    ).rejects.toThrow(TypeError);

    // Unknown reason code string
    await expect(
      recordRecoveryAssessment({
        status: 'recoverable-envelope-exceeded',
        projectId: projId,
        reasonCodes: ['FORGED_UNKNOWN_REASON_CODE' as unknown as RecoveryReasonCode],
      } as unknown as DeterministicRecoveryAssessment)
    ).rejects.toThrow(TypeError);

    // Huge reason-code array (>256)
    await expect(
      recordRecoveryAssessment({
        status: 'recoverable-envelope-exceeded',
        projectId: projId,
        reasonCodes: Array.from({ length: 257 }, () => 'ENVELOPE_MAX_FRAMES' as RecoveryReasonCode),
      } as unknown as DeterministicRecoveryAssessment)
    ).rejects.toThrow(TypeError);

    // Empty normalized reasonCodes
    await expect(
      recordRecoveryAssessment({
        status: 'recoverable-envelope-exceeded',
        projectId: projId,
        reasonCodes: [],
      } as unknown as DeterministicRecoveryAssessment)
    ).rejects.toThrow(TypeError);

    // Non-persistable status
    await expect(
      recordRecoveryAssessment({
        status: 'valid',
        projectId: projId,
        reasonCodes: ['ENVELOPE_MAX_FRAMES'],
      } as unknown as DeterministicRecoveryAssessment)
    ).rejects.toThrow(TypeError);
  });

  it('records recovery assessment and preserves firstDetectedAt on repeat confirmation', async () => {
    const projId = 'proj-ledger-test';
    const proj = baseProjectFixture(projId);
    await seedProject(projId, proj);

    const assessment: DeterministicRecoveryAssessment = {
      status: 'recoverable-envelope-exceeded',
      projectId: projId,
      project: proj,
      metadata: {
        name: 'Test',
        width: 32,
        height: 32,
        frameCount: 1,
        totalLayerCount: 1,
        maxLayersInAFrame: 1,
        materializableRasterPixels: 1024,
        baseRawRgbaBytes: 4096,
        fps: 12,
        version: 2,
        createdAt: 100,
        updatedAt: 100,
      },
      violations: [],
      reasonCodes: ['ENVELOPE_MAX_FRAMES'],
      orphanSummary: { totalCount: 0, duplicateCount: 0, detailsTruncated: false, details: [] },
      scannedBlobsCount: 0,
    };

    await recordRecoveryAssessment(assessment);
    const firstRecord = await getRecoveryRecord(projId);
    expect(firstRecord).toBeDefined();
    expect(firstRecord?.classificationState).toBe('recoverable-envelope-exceeded');
    expect(firstRecord?.firstDetectedAt).toBeDefined();
    expect(firstRecord?.lastConfirmedAt).toBe(firstRecord?.firstDetectedAt);

    await new Promise((r) => setTimeout(r, 15));

    await recordRecoveryAssessment(assessment);
    const secondRecord = await getRecoveryRecord(projId);
    expect(firstRecord).toBeDefined();
    expect(secondRecord).toBeDefined();
    expect(secondRecord?.firstDetectedAt).toBe(firstRecord?.firstDetectedAt);
    if (firstRecord && secondRecord) {
      expect(secondRecord.lastConfirmedAt).toBeGreaterThan(firstRecord.lastConfirmedAt);
    }
  });

  it('sorts and deduplicates reason codes in recovery ledger', async () => {
    const projId = 'proj-ledger-codes';
    const proj = baseProjectFixture(projId);
    await seedProject(projId, proj);

    const assessment: DeterministicRecoveryAssessment = {
      status: 'recoverable-blob-invalid',
      projectId: projId,
      project: proj,
      metadata: {
        name: 'Test',
        width: 32,
        height: 32,
        frameCount: 1,
        totalLayerCount: 1,
        maxLayersInAFrame: 1,
        materializableRasterPixels: 1024,
        baseRawRgbaBytes: 4096,
        fps: 12,
        version: 2,
        createdAt: 100,
        updatedAt: 100,
      },
      invalidLayerSummary: {
        affectedLayerCount: 0,
        totalReasonCount: 0,
        detailsTruncated: false,
        details: [],
      },
      reasonCodes: [
        'CORRUPTED_PNG_HEADER',
        'ENVELOPE_MAX_FRAMES',
        'CORRUPTED_PNG_HEADER', // duplicate
        'BLOB_DIMENSION_MISMATCH',
      ],
      orphanSummary: { totalCount: 0, duplicateCount: 0, detailsTruncated: false, details: [] },
      scannedBlobsCount: 0,
    };

    await recordRecoveryAssessment(assessment);
    const record = await getRecoveryRecord(projId);
    expect(record?.reasonCodes).toEqual([
      'ENVELOPE_MAX_FRAMES',
      'CORRUPTED_PNG_HEADER',
      'BLOB_DIMENSION_MISMATCH',
    ]);
  });

  it('sortReasonCodes rejects non-arrays, excessive length, and unknown codes', () => {
    expect(() => sortReasonCodes('invalid' as unknown as RecoveryReasonCode[])).toThrow(TypeError);
    expect(() =>
      sortReasonCodes(Array.from({ length: 257 }, () => 'ENVELOPE_MAX_FRAMES' as RecoveryReasonCode))
    ).toThrow(TypeError);
    expect(() =>
      sortReasonCodes(['UNKNOWN_CODE' as unknown as RecoveryReasonCode])
    ).toThrow(TypeError);
  });

  it('atomically rolls back all table deletes when deleteProject fails mid-transaction', async () => {
    const projId = 'proj-atomic-rollback';
    const proj = baseProjectFixture(projId, 32, 32);
    const blobs = [{ id: 101, layerId: 'layer-1', frameIndex: 0, blob: createPngBlob(32, 32) }];
    await seedProject(projId, proj, blobs);

    await db.recoveryRecords.put({
      projectId: projId,
      classificationState: 'recoverable-blob-invalid',
      firstDetectedAt: 1700000000000,
      lastConfirmedAt: 1700000000000,
      reasonCodes: ['CORRUPTED_PNG_HEADER'],
    });

    // Mock db.recoveryRecords.delete to fail after db.projects and db.layerBlobs deletes were issued
    const deleteSpy = vi.spyOn(db.recoveryRecords, 'delete').mockImplementationOnce(() => {
      return Dexie.Promise.reject(new Error('Simulated IO Failure during recoveryRecords delete'));
    });

    const failedResult = await deleteProject(projId);
    expect(failedResult).toBe(false);

    // All three tables MUST retain their records intact due to transaction rollback!
    expect(await db.projects.get(projId)).toBeDefined();
    expect(await db.layerBlobs.where('projectId').equals(projId).count()).toBe(1);
    expect(await db.recoveryRecords.get(projId)).toBeDefined();

    deleteSpy.mockRestore();

    // Now verify successful cascade delete without mock
    const success = await deleteProject(projId);
    expect(success).toBe(true);
    expect(await db.projects.get(projId)).toBeUndefined();
    expect(await db.layerBlobs.where('projectId').equals(projId).count()).toBe(0);
    expect(await db.recoveryRecords.get(projId)).toBeUndefined();
  });
});
