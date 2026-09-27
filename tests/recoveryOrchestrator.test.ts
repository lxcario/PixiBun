import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  db,
  type StoredProject,
  type StoredLayerBlob,
  type RecoveryRecord,
} from '@/lib/storage/db';
import {
  PROJECT_FORMAT_ID,
  PROJECT_FORMAT_VERSION,
  type ProjectFile,
} from '@/types/project';
import { RECOVERY_INSPECTION_CEILINGS } from '@/lib/recovery/recoveryLimits';
import type { TrustedRecoveryPlanToken } from '@/lib/recovery/recoveryTypes';
import {
  acquireStoredProjectSnapshot,
  assessStoredSnapshot,
} from '@/lib/recovery/recoveryDiagnosis';
import {
  formatRecoveredTitle,
  assertNoLoneSurrogates,
  assertClosedRecordShape,
  sha256DigestHex,
  buildProjectBinary,
  prepareRecoveryPlan,
  commitRecoveredProject,
} from '@/lib/recovery/recoveryOrchestrator';

// ============================================================================
// Fixture Helpers
// ============================================================================

function createPngBlob(width: number, height: number, payloadByte = 0x5a): Blob {
  const bytes = new Uint8Array(28);
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
  // Custom payload byte after 24-byte header to create distinct blob contents
  bytes[24] = payloadByte;
  return new Blob([bytes], { type: 'image/png' });
}

function createCorruptPngBlob(): Blob {
  return new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x00])], { type: 'image/png' });
}

function baseProjectFixture(_id = 'proj-test', width = 32, height = 32): ProjectFile {
  return {
    format: PROJECT_FORMAT_ID,
    version: PROJECT_FORMAT_VERSION,
    name: 'Sample Project',
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
      {
        id: 'frame-2',
        durationMs: 100,
        layers: [
          {
            id: 'layer-2',
            name: 'Layer 2',
            visible: true,
            locked: false,
            opacity: 1.0,
            blendMode: 'source-over',
          },
        ],
      },
    ],
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  };
}

async function seedProjectInDb(
  id: string,
  project: ProjectFile,
  blobs: Array<{
    id?: number;
    layerId: string;
    frameIndex: number;
    blob: Blob;
  }> = [],
  ledger?: Partial<RecoveryRecord>
) {
  await db.projects.put({
    id,
    name: project.name,
    width: project.width,
    height: project.height,
    fps: project.fps,
    dataJson: JSON.stringify(project),
    updatedAt: project.updatedAt ?? 1700000000000,
    createdAt: project.createdAt ?? 1700000000000,
  });

  for (const b of blobs) {
    await db.layerBlobs.put({
      id: b.id,
      projectId: id,
      layerId: b.layerId,
      frameIndex: b.frameIndex,
      blob: b.blob,
      updatedAt: 1700000000000,
    });
  }

  if (ledger) {
    await db.recoveryRecords.put({
      projectId: id,
      classificationState: ledger.classificationState ?? 'recoverable-blob-invalid',
      firstDetectedAt: ledger.firstDetectedAt ?? 1700000000000,
      lastConfirmedAt: ledger.lastConfirmedAt ?? 1700000000000,
      reasonCodes: ledger.reasonCodes ?? ['BLOB_DIMENSION_MISMATCH'],
      ...ledger,
    });
  }
}

// ============================================================================
// Test Suite
// ============================================================================

describe('Phase 1B.6: Trusted Recovery Orchestrator and Atomic Persistence Engine', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  // --------------------------------------------------------------------------
  // Group 1: Snapshot Acquisition & Pure In-Memory Diagnosis
  // --------------------------------------------------------------------------
  describe('Group 1: Snapshot Acquisition & Pure In-Memory Diagnosis', () => {
    it('acquires complete snapshot with project, blobs, and ledger', async () => {
      const proj = baseProjectFixture('proj-1');
      const blob = createPngBlob(32, 32);
      await seedProjectInDb('proj-1', proj, [{ layerId: 'layer-1', frameIndex: 0, blob }], {
        classificationState: 'recoverable-blob-invalid',
      });

      const snapshot = await acquireStoredProjectSnapshot('proj-1');
      expect(snapshot).toBeDefined();
      expect(snapshot.projectRecord).toBeDefined();
      expect(snapshot.projectRecord!.id).toBe('proj-1');
      expect(snapshot.sourceBlobs).toHaveLength(1);
      expect(snapshot.sourceBlobs[0].layerId).toBe('layer-1');
      expect(snapshot.ledgerRecord).toBeDefined();
      expect(snapshot.ledgerRecord!.classificationState).toBe('recoverable-blob-invalid');
    });

    it('returns empty snapshot when project does not exist in storage', async () => {
      const snapshot = await acquireStoredProjectSnapshot('non-existent');
      expect(snapshot).toBeDefined();
      expect(snapshot.projectRecord).toBeUndefined();
      expect(snapshot.sourceBlobs).toHaveLength(0);
      expect(snapshot.ledgerRecord).toBeUndefined();
    });

    it('fails closed when blobs exceed MAX_INSPECTABLE_STORED_BLOBS via MAX+1 bounding', async () => {
      const proj = baseProjectFixture('proj-overflow');
      await db.projects.put({
        id: 'proj-overflow',
        name: proj.name,
        width: proj.width,
        height: proj.height,
        fps: proj.fps,
        dataJson: JSON.stringify(proj),
        createdAt: 1000,
        updatedAt: 1000,
      });

      // Insert MAX_INSPECTABLE_STORED_BLOBS + 1 blobs
      const ceiling = RECOVERY_INSPECTION_CEILINGS.MAX_INSPECTABLE_STORED_BLOBS;
      const blobsToInsert: StoredLayerBlob[] = [];
      const dummyBlob = new Blob(['x'], { type: 'image/png' });
      for (let i = 0; i < ceiling + 1; i++) {
        blobsToInsert.push({
          id: i + 1,
          projectId: 'proj-overflow',
          layerId: 'layer-1',
          frameIndex: i,
          blob: dummyBlob,
          updatedAt: 1000,
        });
      }
      await db.layerBlobs.bulkPut(blobsToInsert);

      // Snapshot bounds database read to exactly ceiling + 1
      const snapshot = await acquireStoredProjectSnapshot('proj-overflow');
      expect(snapshot.sourceBlobs).toHaveLength(ceiling + 1);

      // In-memory diagnosis fails closed as unsafe-content
      const assessment = await assessStoredSnapshot(snapshot);
      expect(assessment.status).toBe('unsafe-content');
      if (assessment.status === 'unsafe-content') {
        expect(assessment.reasonCodes).toContain('EXCESSIVE_STORED_BLOBS');
      }

      // Recovery preparation fails closed as unrecoverable-blocked
      const prep = await prepareRecoveryPlan('proj-overflow');
      expect(prep.status).toBe('unrecoverable-blocked');
      if (prep.status === 'unrecoverable-blocked') {
        expect(prep.reasonCode).toBe('STORED_BLOBS_CEILING_EXCEEDED');
      }
    }, 20_000);

    it('assesses pure in-memory snapshot identically to storage diagnosis', async () => {
      const proj = baseProjectFixture('proj-mem');
      // Intentionally mismatched dimension blob
      const blob = createPngBlob(64, 64);
      await seedProjectInDb('proj-mem', proj, [{ layerId: 'layer-1', frameIndex: 0, blob }]);

      const snapshot = await acquireStoredProjectSnapshot('proj-mem');
      expect(snapshot).toBeDefined();
      expect(snapshot.projectRecord).toBeDefined();

      const assessment = await assessStoredSnapshot(snapshot);
      expect(assessment.status).toBe('recoverable-blob-invalid');
      if (assessment.status === 'recoverable-blob-invalid') {
        expect(assessment.invalidLayerSummary.affectedLayerCount).toBe(1);
        expect(assessment.reasonCodes).toContain('BLOB_DIMENSION_MISMATCH');
      }
    });

    it('enforces closed schema checks rejecting unrecognized keys on records', () => {
      expect(() => {
        assertClosedRecordShape(
          { id: '1', name: 'proj', unauthorizedKey: true },
          new Set(['id', 'name']),
          'StoredProject'
        );
      }).toThrow(/Unexpected own property "unauthorizedKey"/);
    });

    it('detects and rejects lone surrogates in strings', () => {
      expect(() => {
        assertNoLoneSurrogates('Test \uD800 String', 'testField');
      }).toThrow(/contains invalid UTF-16 with lone surrogates/);

      expect(() => {
        assertNoLoneSurrogates('Valid \uD83D\uDE00 Emoji', 'testField');
      }).not.toThrow();
    });
  });

  // --------------------------------------------------------------------------
  // Group 2: Title Formatting & Canonical Hashing
  // --------------------------------------------------------------------------
  describe('Group 2: Title Formatting & Canonical Hashing', () => {
    it('prepends [Recovered] to project names', () => {
      expect(formatRecoveredTitle('My Project')).toBe('[Recovered] My Project');
    });

    it('does not duplicate existing [Recovered] prefix', () => {
      expect(formatRecoveredTitle('[Recovered] My Project')).toBe('[Recovered] My Project');
      expect(formatRecoveredTitle('[recovered] My Project')).toBe('[Recovered] My Project');
    });

    it('truncates long titles to <= 256 code units without breaking surrogate pairs', () => {
      // 250 'a' chars + emoji pair (2 code units) = 252 code units -> "[Recovered] " (12) + 244 chars = 256
      const prefix = 'a'.repeat(242);
      const emoji = '\uD83D\uDE00'; // 2 code units
      const name = prefix + emoji + 'extra';
      const formatted = formatRecoveredTitle(name);

      expect(formatted.length).toBeLessThanOrEqual(256);
      expect(formatted.startsWith('[Recovered] ')).toBe(true);
      // Ensure the trailing emoji was not split into a lone surrogate
      expect(() => assertNoLoneSurrogates(formatted, 'title')).not.toThrow();
    });

    it('produces deterministic SHA-256 binary digests', async () => {
      const proj = baseProjectFixture('proj-hash');
      const storedProj: StoredProject = {
        id: 'proj-hash',
        name: proj.name,
        width: proj.width,
        height: proj.height,
        fps: proj.fps,
        dataJson: JSON.stringify(proj),
        createdAt: 1000,
        updatedAt: 1000,
      };

      const binary1 = buildProjectBinary(storedProj);
      const binary2 = buildProjectBinary(storedProj);
      expect(binary1).toEqual(binary2);

      const digest1 = await sha256DigestHex(binary1);
      const digest2 = await sha256DigestHex(binary2);
      expect(digest1).toBe(digest2);
      expect(digest1).toHaveLength(64);
    });
  });

  // --------------------------------------------------------------------------
  // Group 3: Deterministic Plan Preparation (prepareRecoveryPlan)
  // --------------------------------------------------------------------------
  describe('Group 3: Plan Preparation', () => {
    it('returns unrecoverable-blocked INVALID_ASSESSMENT when project is healthy and valid', async () => {
      const proj = baseProjectFixture('proj-valid');
      const blob0 = createPngBlob(32, 32);
      const blob1 = createPngBlob(32, 32);
      await seedProjectInDb('proj-valid', proj, [
        { layerId: 'layer-1', frameIndex: 0, blob: blob0 },
        { layerId: 'layer-1', frameIndex: 1, blob: blob1 },
      ]);

      const prepResult = await prepareRecoveryPlan('proj-valid');
      expect(prepResult.status).toBe('unrecoverable-blocked');
      if (prepResult.status === 'unrecoverable-blocked') {
        expect(prepResult.reasonCode).toBe('INVALID_ASSESSMENT');
      }
    });

    it('returns unrecoverable-blocked PROJECT_NOT_FOUND when project does not exist', async () => {
      const prepResult = await prepareRecoveryPlan('non-existent');
      expect(prepResult.status).toBe('unrecoverable-blocked');
      if (prepResult.status === 'unrecoverable-blocked') {
        expect(prepResult.reasonCode).toBe('PROJECT_NOT_FOUND');
      }
    });

    it('prepares ready plan with plan token and candidate plan for recoverable project', async () => {
      const proj = baseProjectFixture('proj-rec');
      // Frame 0 has dimension mismatch (64x64 instead of 32x32)
      const badBlob = createPngBlob(64, 64);
      const goodBlob = createPngBlob(32, 32);
      await seedProjectInDb('proj-rec', proj, [
        { id: 101, layerId: 'layer-1', frameIndex: 0, blob: badBlob },
        { id: 102, layerId: 'layer-2', frameIndex: 1, blob: goodBlob },
      ]);

      // Provide decision to delete frame 0
      const prepResult = await prepareRecoveryPlan('proj-rec', {
        deleteFrameIndices: [0],
      });
      expect(prepResult.status).toBe('ready');
      if (prepResult.status === 'ready') {
        expect(prepResult.planToken).toBeDefined();
        expect(typeof prepResult.planToken).toBe('object');
        expect(prepResult.candidatePlan.sourceProjectId).toBe('proj-rec');
        expect(prepResult.candidatePlan.deletedFrameIndices).toEqual([0]);
        expect(prepResult.candidatePlan.blobRemapEntries).toHaveLength(1);
        expect(prepResult.candidatePlan.blobRemapEntries[0].sourceRecordId).toBe(102);
      }
    });

    it('returns additional-deletion-required when corrupted blob lacks deletion decision', async () => {
      const proj = baseProjectFixture('proj-corrupt');
      const corruptBlob = createCorruptPngBlob();
      await seedProjectInDb('proj-corrupt', proj, [
        { id: 201, layerId: 'layer-1', frameIndex: 0, blob: corruptBlob },
      ]);

      const prepResult = await prepareRecoveryPlan('proj-corrupt');
      expect(prepResult.status).toBe('additional-deletion-required');
    });

    it('returns cancelled when AbortSignal is triggered during prepare', async () => {
      const proj = baseProjectFixture('proj-abort');
      const badBlob = createPngBlob(64, 64);
      await seedProjectInDb('proj-abort', proj, [
        { id: 301, layerId: 'layer-1', frameIndex: 0, blob: badBlob },
      ]);

      const controller = new AbortController();
      controller.abort();

      const prepResult = await prepareRecoveryPlan('proj-abort', undefined, {
        signal: controller.signal,
      });

      expect(prepResult.status).toBe('cancelled');
    });
  });

  // --------------------------------------------------------------------------
  // Group 4: Token State Machine & Trust Boundary
  // --------------------------------------------------------------------------
  describe('Group 4: Token State Machine & Trust Boundary', () => {
    it('rejects fabricated or forged plan tokens', async () => {
      const forgedToken = Object.freeze({ fake: true }) as unknown as TrustedRecoveryPlanToken;
      const commitResult = await commitRecoveredProject(forgedToken);

      expect(commitResult.status).toBe('unrecoverable-blocked');
      if (commitResult.status === 'unrecoverable-blocked') {
        expect(commitResult.reasonCode).toBe('INVALID_PLAN_TOKEN');
      }
    });

    it('rejects cloned tokens created by object spread', async () => {
      const proj = baseProjectFixture('proj-clone');
      const badBlob = createPngBlob(64, 64);
      await seedProjectInDb('proj-clone', proj, [
        { id: 401, layerId: 'layer-1', frameIndex: 0, blob: badBlob },
      ]);

      const prepResult = await prepareRecoveryPlan('proj-clone', { deleteFrameIndices: [0] });
      expect(prepResult.status).toBe('ready');
      if (prepResult.status !== 'ready') return;

      const clonedToken = { ...prepResult.planToken } as TrustedRecoveryPlanToken;
      const commitResult = await commitRecoveredProject(clonedToken);

      expect(commitResult.status).toBe('unrecoverable-blocked');
      if (commitResult.status === 'unrecoverable-blocked') {
        expect(commitResult.reasonCode).toBe('INVALID_PLAN_TOKEN');
      }
    });

    it('rejects replay attacks with TOKEN_ALREADY_CONSUMED', async () => {
      const proj = baseProjectFixture('proj-replay');
      const badBlob = createPngBlob(64, 64);
      const goodBlob = createPngBlob(32, 32);
      await seedProjectInDb('proj-replay', proj, [
        { id: 501, layerId: 'layer-1', frameIndex: 0, blob: badBlob },
        { id: 502, layerId: 'layer-2', frameIndex: 1, blob: goodBlob },
      ]);

      const prepResult = await prepareRecoveryPlan('proj-replay', { deleteFrameIndices: [0] });
      expect(prepResult.status).toBe('ready');
      if (prepResult.status !== 'ready') return;

      // First commit: success
      const firstCommit = await commitRecoveredProject(prepResult.planToken);
      expect(firstCommit.status).toBe('persisted-success');

      // Second commit with the same token: rejected
      const replayCommit = await commitRecoveredProject(prepResult.planToken);
      expect(replayCommit.status).toBe('unrecoverable-blocked');
      if (replayCommit.status === 'unrecoverable-blocked') {
        expect(replayCommit.reasonCode).toBe('TOKEN_ALREADY_CONSUMED');
      }
    });

    it('rejects concurrent commit attempts with TOKEN_ALREADY_COMMITTING', async () => {
      const proj = baseProjectFixture('proj-concur');
      const badBlob = createPngBlob(64, 64);
      const goodBlob = createPngBlob(32, 32);
      await seedProjectInDb('proj-concur', proj, [
        { id: 601, layerId: 'layer-1', frameIndex: 0, blob: badBlob },
        { id: 602, layerId: 'layer-2', frameIndex: 1, blob: goodBlob },
      ]);

      const prepResult = await prepareRecoveryPlan('proj-concur', { deleteFrameIndices: [0] });
      expect(prepResult.status).toBe('ready');
      if (prepResult.status !== 'ready') return;

      // Run two commits simultaneously without awaiting the first before launching the second
      const p1 = commitRecoveredProject(prepResult.planToken);
      const p2 = commitRecoveredProject(prepResult.planToken);

      const [r1, r2] = await Promise.all([p1, p2]);

      // Exactly one succeeds and one is rejected as TOKEN_ALREADY_COMMITTING
      const statuses = [r1.status, r2.status];
      expect(statuses).toContain('persisted-success');
      expect(statuses).toContain('unrecoverable-blocked');

      const blockedResult = r1.status === 'unrecoverable-blocked' ? r1 : r2;
      if (blockedResult.status === 'unrecoverable-blocked') {
        expect(blockedResult.reasonCode).toBe('TOKEN_ALREADY_COMMITTING');
      }
    });
  });

  // --------------------------------------------------------------------------
  // Group 5: In-Transaction TOCTOU Detection & Exact Revalidation
  // --------------------------------------------------------------------------
  describe('Group 5: In-Transaction TOCTOU Detection', () => {
    it('detects concurrent project updatedAt modification', async () => {
      const proj = baseProjectFixture('proj-toctou-proj');
      const badBlob = createPngBlob(64, 64);
      await seedProjectInDb('proj-toctou-proj', proj, [
        { id: 701, layerId: 'layer-1', frameIndex: 0, blob: badBlob },
      ]);

      const prepResult = await prepareRecoveryPlan('proj-toctou-proj', { deleteFrameIndices: [0] });
      expect(prepResult.status).toBe('ready');
      if (prepResult.status !== 'ready') return;

      // Concurrently mutate project updatedAt in storage
      await db.projects.update('proj-toctou-proj', { updatedAt: 9999999999 });

      const commitResult = await commitRecoveredProject(prepResult.planToken);
      expect(commitResult.status).toBe('stale-source-snapshot');
      if (commitResult.status === 'stale-source-snapshot') {
        expect(commitResult.detail).toBe('PROJECT_MODIFIED');
      }
    });

    it('detects concurrent dataJson byte mutation with identical length', async () => {
      const proj = baseProjectFixture('proj-toctou-datajson');
      const badBlob = createPngBlob(64, 64);
      await seedProjectInDb('proj-toctou-datajson', proj, [
        { id: 711, layerId: 'layer-1', frameIndex: 0, blob: badBlob },
      ]);

      const prepResult = await prepareRecoveryPlan('proj-toctou-datajson', { deleteFrameIndices: [0] });
      expect(prepResult.status).toBe('ready');
      if (prepResult.status !== 'ready') return;

      // Tamper dataJson keeping the exact same length (swap "Sample" to "Xample")
      const stored = await db.projects.get('proj-toctou-datajson');
      expect(stored).toBeDefined();
      const tampered = stored!.dataJson.replace('"Sample Project"', '"Xample Project"');
      expect(tampered.length).toBe(stored!.dataJson.length);
      await db.projects.update('proj-toctou-datajson', { dataJson: tampered });

      const commitResult = await commitRecoveredProject(prepResult.planToken);
      expect(commitResult.status).toBe('stale-source-snapshot');
      if (commitResult.status === 'stale-source-snapshot') {
        expect(commitResult.detail).toBe('PROJECT_MODIFIED');
      }
    });

    it('detects concurrent project deletion', async () => {
      const proj = baseProjectFixture('proj-toctou-del');
      const badBlob = createPngBlob(64, 64);
      await seedProjectInDb('proj-toctou-del', proj, [
        { id: 721, layerId: 'layer-1', frameIndex: 0, blob: badBlob },
      ]);

      const prepResult = await prepareRecoveryPlan('proj-toctou-del', { deleteFrameIndices: [0] });
      expect(prepResult.status).toBe('ready');
      if (prepResult.status !== 'ready') return;

      // Delete project before commit
      await db.projects.delete('proj-toctou-del');

      const commitResult = await commitRecoveredProject(prepResult.planToken);
      expect(commitResult.status).toBe('stale-source-snapshot');
      if (commitResult.status === 'stale-source-snapshot') {
        expect(commitResult.detail).toBe('PROJECT_MODIFIED');
      }
    });

    it('detects concurrent recovery ledger modification', async () => {
      const proj = baseProjectFixture('proj-toctou-ledger');
      const badBlob = createPngBlob(64, 64);
      await seedProjectInDb(
        'proj-toctou-ledger',
        proj,
        [{ id: 731, layerId: 'layer-1', frameIndex: 0, blob: badBlob }],
        { classificationState: 'recoverable-blob-invalid' }
      );

      const prepResult = await prepareRecoveryPlan('proj-toctou-ledger', { deleteFrameIndices: [0] });
      expect(prepResult.status).toBe('ready');
      if (prepResult.status !== 'ready') return;

      // Concurrently alter ledger classificationState
      await db.recoveryRecords.update('proj-toctou-ledger', {
        classificationState: 'recoverable-envelope-exceeded',
      });

      const commitResult = await commitRecoveredProject(prepResult.planToken);
      expect(commitResult.status).toBe('stale-source-snapshot');
      if (commitResult.status === 'stale-source-snapshot') {
        expect(commitResult.detail).toBe('LEDGER_PREIMAGE_MODIFIED');
      }
    });

    it('detects concurrent single-byte Blob modification in remapped blob', async () => {
      const proj = baseProjectFixture('proj-toctou-blobbyte');
      const badBlob = createPngBlob(64, 64, 0x11);
      const goodBlob = createPngBlob(32, 32, 0x22);
      await seedProjectInDb('proj-toctou-blobbyte', proj, [
        { id: 741, layerId: 'layer-1', frameIndex: 0, blob: badBlob },
        { id: 742, layerId: 'layer-2', frameIndex: 1, blob: goodBlob },
      ]);

      const prepResult = await prepareRecoveryPlan('proj-toctou-blobbyte', { deleteFrameIndices: [0] });
      expect(prepResult.status).toBe('ready');
      if (prepResult.status !== 'ready') return;

      // Replace goodBlob with another blob of same size and mime type but different byte payload
      const mutatedBlob = createPngBlob(32, 32, 0x99);
      await db.layerBlobs.update(742, { blob: mutatedBlob });

      const commitResult = await commitRecoveredProject(prepResult.planToken);
      expect(commitResult.status).toBe('stale-source-snapshot');
      if (commitResult.status === 'stale-source-snapshot') {
        expect(commitResult.detail).toBe('BLOBS_MODIFIED');
      }
    });

    it('detects count-preserving deletion and insertion of a Blob record', async () => {
      const proj = baseProjectFixture('proj-toctou-swap');
      const badBlob = createPngBlob(64, 64, 0x11);
      const goodBlob = createPngBlob(32, 32, 0x22);
      await seedProjectInDb('proj-toctou-swap', proj, [
        { id: 751, layerId: 'layer-1', frameIndex: 0, blob: badBlob },
        { id: 752, layerId: 'layer-2', frameIndex: 1, blob: goodBlob },
      ]);

      const prepResult = await prepareRecoveryPlan('proj-toctou-swap', { deleteFrameIndices: [0] });
      expect(prepResult.status).toBe('ready');
      if (prepResult.status !== 'ready') return;

      // Delete record 751 and insert new record 753 preserving count = 2
      await db.layerBlobs.delete(751);
      await db.layerBlobs.put({
        id: 753,
        projectId: 'proj-toctou-swap',
        layerId: 'layer-1',
        frameIndex: 0,
        blob: badBlob,
        updatedAt: 1700000000000,
      });

      const commitResult = await commitRecoveredProject(prepResult.planToken);
      expect(commitResult.status).toBe('stale-source-snapshot');
      if (commitResult.status === 'stale-source-snapshot') {
        expect(commitResult.detail).toBe('BLOBS_MODIFIED');
      }
    });

    it('detects concurrent mutation of excluded or orphan Blob record', async () => {
      const proj = baseProjectFixture('proj-toctou-orphan');
      const badBlob = createPngBlob(64, 64, 0x11);
      const goodBlob = createPngBlob(32, 32, 0x22);
      const orphanBlob = createPngBlob(32, 32, 0x33);
      await seedProjectInDb('proj-toctou-orphan', proj, [
        { id: 761, layerId: 'layer-1', frameIndex: 0, blob: badBlob },
        { id: 762, layerId: 'layer-2', frameIndex: 1, blob: goodBlob },
        { id: 763, layerId: 'unknown-layer', frameIndex: 99, blob: orphanBlob },
      ]);

      const prepResult = await prepareRecoveryPlan('proj-toctou-orphan', { deleteFrameIndices: [0] });
      expect(prepResult.status).toBe('ready');
      if (prepResult.status !== 'ready') return;

      // Mutate the orphan blob (record 763) which is NOT in blobRemapEntries
      const modifiedOrphan = createPngBlob(32, 32, 0x88);
      await db.layerBlobs.update(763, { blob: modifiedOrphan });

      const commitResult = await commitRecoveredProject(prepResult.planToken);
      expect(commitResult.status).toBe('stale-source-snapshot');
      if (commitResult.status === 'stale-source-snapshot') {
        expect(commitResult.detail).toBe('BLOBS_MODIFIED');
      }
    });
  });

  // --------------------------------------------------------------------------
  // Group 6: Destination Collision Protection & Injected Validations
  // --------------------------------------------------------------------------
  describe('Group 6: Destination Collision & Validation', () => {
    it('retries ID generation when collision occurs in projects table', async () => {
      const proj = baseProjectFixture('proj-coll-p');
      const badBlob = createPngBlob(64, 64);
      const goodBlob = createPngBlob(32, 32);
      await seedProjectInDb('proj-coll-p', proj, [
        { id: 801, layerId: 'layer-1', frameIndex: 0, blob: badBlob },
        { id: 802, layerId: 'layer-2', frameIndex: 1, blob: goodBlob },
      ]);

      // Pre-occupy "colliding-id-1" in projects
      await db.projects.put({
        id: 'colliding-id-1',
        name: 'Existing',
        width: 32,
        height: 32,
        fps: 12,
        dataJson: '{}',
        createdAt: 1000,
        updatedAt: 1000,
      });

      const prepResult = await prepareRecoveryPlan('proj-coll-p', { deleteFrameIndices: [0] });
      expect(prepResult.status).toBe('ready');
      if (prepResult.status !== 'ready') return;

      // Injected generateId returns colliding-id-1 first, then unique-id-2
      const idGenerator = vi
        .fn()
        .mockReturnValueOnce('colliding-id-1')
        .mockReturnValueOnce('unique-id-2');

      const commitResult = await commitRecoveredProject(prepResult.planToken, {
        generateId: idGenerator,
      });

      expect(commitResult.status).toBe('persisted-success');
      if (commitResult.status === 'persisted-success') {
        expect(commitResult.recoveredProjectId).toBe('unique-id-2');
        expect(idGenerator).toHaveBeenCalledTimes(2);
      }
    });

    it('retries ID generation when collision occurs in layerBlobs table', async () => {
      const proj = baseProjectFixture('proj-coll-b');
      const badBlob = createPngBlob(64, 64);
      await seedProjectInDb('proj-coll-b', proj, [
        { id: 811, layerId: 'layer-1', frameIndex: 0, blob: badBlob },
      ]);

      // Pre-occupy layerBlobs for "colliding-blob-id"
      await db.layerBlobs.put({
        projectId: 'colliding-blob-id',
        layerId: 'layer-1',
        frameIndex: 0,
        blob: new Blob(['test']),
        updatedAt: 1000,
      });

      const prepResult = await prepareRecoveryPlan('proj-coll-b', { deleteFrameIndices: [0] });
      expect(prepResult.status).toBe('ready');
      if (prepResult.status !== 'ready') return;

      const idGenerator = vi
        .fn()
        .mockReturnValueOnce('colliding-blob-id')
        .mockReturnValueOnce('unique-blob-id');

      const commitResult = await commitRecoveredProject(prepResult.planToken, {
        generateId: idGenerator,
      });

      expect(commitResult.status).toBe('persisted-success');
      if (commitResult.status === 'persisted-success') {
        expect(commitResult.recoveredProjectId).toBe('unique-blob-id');
        expect(idGenerator).toHaveBeenCalledTimes(2);
      }
    });

    it('retries ID generation when collision occurs in recoveryRecords table', async () => {
      const proj = baseProjectFixture('proj-coll-r');
      const badBlob = createPngBlob(64, 64);
      await seedProjectInDb('proj-coll-r', proj, [
        { id: 821, layerId: 'layer-1', frameIndex: 0, blob: badBlob },
      ]);

      // Pre-occupy recoveryRecords for "colliding-rec-id"
      await db.recoveryRecords.put({
        projectId: 'colliding-rec-id',
        classificationState: 'recoverable-blob-invalid',
        firstDetectedAt: 1000,
        lastConfirmedAt: 1000,
        reasonCodes: [],
      });

      const prepResult = await prepareRecoveryPlan('proj-coll-r', { deleteFrameIndices: [0] });
      expect(prepResult.status).toBe('ready');
      if (prepResult.status !== 'ready') return;

      const idGenerator = vi
        .fn()
        .mockReturnValueOnce('colliding-rec-id')
        .mockReturnValueOnce('unique-rec-id');

      const commitResult = await commitRecoveredProject(prepResult.planToken, {
        generateId: idGenerator,
      });

      expect(commitResult.status).toBe('persisted-success');
      if (commitResult.status === 'persisted-success') {
        expect(commitResult.recoveredProjectId).toBe('unique-rec-id');
        expect(idGenerator).toHaveBeenCalledTimes(2);
      }
    });

    it('fails closed with DESTINATION_COLLISION when N=3 retries are exhausted', async () => {
      const proj = baseProjectFixture('proj-coll-exhaust');
      const badBlob = createPngBlob(64, 64);
      await seedProjectInDb('proj-coll-exhaust', proj, [
        { id: 831, layerId: 'layer-1', frameIndex: 0, blob: badBlob },
      ]);

      await db.projects.put({
        id: 'always-collide',
        name: 'Colliding',
        width: 32,
        height: 32,
        fps: 12,
        dataJson: '{}',
        createdAt: 1000,
        updatedAt: 1000,
      });

      const prepResult = await prepareRecoveryPlan('proj-coll-exhaust', { deleteFrameIndices: [0] });
      expect(prepResult.status).toBe('ready');
      if (prepResult.status !== 'ready') return;

      const idGenerator = vi.fn().mockReturnValue('always-collide');

      const commitResult = await commitRecoveredProject(prepResult.planToken, {
        generateId: idGenerator,
      });

      expect(commitResult.status).toBe('destination-collision');
      expect(idGenerator).toHaveBeenCalledTimes(RECOVERY_INSPECTION_CEILINGS.MAX_ID_GENERATION_RETRIES);
    });

    it('rejects invalid generated IDs with INVALID_GENERATED_ID', async () => {
      const proj = baseProjectFixture('proj-invalid-id');
      const badBlob = createPngBlob(64, 64);
      await seedProjectInDb('proj-invalid-id', proj, [
        { id: 841, layerId: 'layer-1', frameIndex: 0, blob: badBlob },
      ]);

      const prepResult = await prepareRecoveryPlan('proj-invalid-id', { deleteFrameIndices: [0] });
      expect(prepResult.status).toBe('ready');
      if (prepResult.status !== 'ready') return;

      const commitResult = await commitRecoveredProject(prepResult.planToken, {
        generateId: () => 'invalid/id with spaces!',
      });

      expect(commitResult.status).toBe('unrecoverable-blocked');
      if (commitResult.status === 'unrecoverable-blocked') {
        expect(commitResult.reasonCode).toBe('INVALID_GENERATED_ID');
      }
    });

    it('rejects invalid clock timestamps with INVALID_CLOCK', async () => {
      const proj = baseProjectFixture('proj-invalid-clock');
      const badBlob = createPngBlob(64, 64);
      await seedProjectInDb('proj-invalid-clock', proj, [
        { id: 851, layerId: 'layer-1', frameIndex: 0, blob: badBlob },
      ]);

      const prepResult = await prepareRecoveryPlan('proj-invalid-clock', { deleteFrameIndices: [0] });
      expect(prepResult.status).toBe('ready');
      if (prepResult.status !== 'ready') return;

      const commitResult = await commitRecoveredProject(prepResult.planToken, {
        now: () => -100, // Negative timestamp
      });

      expect(commitResult.status).toBe('unrecoverable-blocked');
      if (commitResult.status === 'unrecoverable-blocked') {
        expect(commitResult.reasonCode).toBe('INVALID_CLOCK');
      }
    });
  });

  // --------------------------------------------------------------------------
  // Group 7: Cancellation Checkpoints & Liveness
  // --------------------------------------------------------------------------
  describe('Group 7: Cancellation Checkpoints', () => {
    it('returns cancelled when pre-aborted before transaction entry', async () => {
      const proj = baseProjectFixture('proj-cancel-pre');
      const badBlob = createPngBlob(64, 64);
      await seedProjectInDb('proj-cancel-pre', proj, [
        { id: 901, layerId: 'layer-1', frameIndex: 0, blob: badBlob },
      ]);

      const prepResult = await prepareRecoveryPlan('proj-cancel-pre', { deleteFrameIndices: [0] });
      expect(prepResult.status).toBe('ready');
      if (prepResult.status !== 'ready') return;

      const controller = new AbortController();
      controller.abort();

      const commitResult = await commitRecoveredProject(prepResult.planToken, {
        signal: controller.signal,
      });

      expect(commitResult.status).toBe('cancelled');
    });

    it('reports persisted-success with cancellationIgnoredPostCommit when aborted after commit', async () => {
      const proj = baseProjectFixture('proj-cancel-post');
      const badBlob = createPngBlob(64, 64);
      const goodBlob = createPngBlob(32, 32);
      await seedProjectInDb('proj-cancel-post', proj, [
        { id: 911, layerId: 'layer-1', frameIndex: 0, blob: badBlob },
        { id: 912, layerId: 'layer-2', frameIndex: 1, blob: goodBlob },
      ]);

      const prepResult = await prepareRecoveryPlan('proj-cancel-post', { deleteFrameIndices: [0] });
      expect(prepResult.status).toBe('ready');
      if (prepResult.status !== 'ready') return;

      const controller = new AbortController();

      // Hook transaction execution to trigger abort right after transaction commit completes
      const originalTransaction = db.transaction.bind(db);
      vi.spyOn(db, 'transaction').mockImplementation(((...args: unknown[]) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (originalTransaction as any)(...args).then((res: unknown) => {
          controller.abort();
          return res;
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any);

      const commitResult = await commitRecoveredProject(prepResult.planToken, {
        signal: controller.signal,
      });

      // The transaction committed durably, so cancellation was post-commit
      expect(commitResult.status).toBe('persisted-success');
      if (commitResult.status === 'persisted-success') {
        expect(commitResult.cancellationIgnoredPostCommit).toBe(true);
      }
    });
  });

  // --------------------------------------------------------------------------
  // Group 8: Atomic Persistence, Zero-or-One Blob, and Complete Rollback
  // --------------------------------------------------------------------------
  describe('Group 8: Atomic Persistence & Full Rollback', () => {
    it('persists recovered copy atomically with exact blob bytes and updated ledger audit', async () => {
      const proj = baseProjectFixture('proj-success');
      const badBlob = createPngBlob(64, 64, 0x11);
      const goodBlob = createPngBlob(32, 32, 0x22);
      await seedProjectInDb('proj-success', proj, [
        { id: 1001, layerId: 'layer-1', frameIndex: 0, blob: badBlob },
        { id: 1002, layerId: 'layer-2', frameIndex: 1, blob: goodBlob },
      ]);

      const prepResult = await prepareRecoveryPlan('proj-success', { deleteFrameIndices: [0] });
      expect(prepResult.status).toBe('ready');
      if (prepResult.status !== 'ready') return;

      const commitResult = await commitRecoveredProject(prepResult.planToken);
      expect(commitResult.status).toBe('persisted-success');
      if (commitResult.status !== 'persisted-success') return;

      const recoveredId = commitResult.recoveredProjectId;
      expect(commitResult.recoveredTitle).toBe('[Recovered] Sample Project');

      // Check destination project record
      const destProject = await db.projects.get(recoveredId);
      expect(destProject).toBeDefined();
      expect(destProject!.name).toBe('[Recovered] Sample Project');
      expect(destProject!.width).toBe(32);
      expect(destProject!.height).toBe(32);

      // Check destination dataJson validity
      const parsedData = JSON.parse(destProject!.dataJson) as ProjectFile;
      expect(parsedData.frames).toHaveLength(1);
      expect(parsedData.frames[0].id).toBe('frame-2');

      // Check destination layer blobs (frame 1 remapped to target frame 0)
      const destBlobs = await db.layerBlobs.where('projectId').equals(recoveredId).toArray();
      expect(destBlobs).toHaveLength(1);
      expect(destBlobs[0].layerId).toBe('layer-2');
      expect(destBlobs[0].frameIndex).toBe(0);

      // Compare exact byte contents of remapped blob
      const originalBytes = new Uint8Array(await goodBlob.arrayBuffer());
      const persistedBytes = new Uint8Array(await destBlobs[0].blob.arrayBuffer());
      expect(persistedBytes).toEqual(originalBytes);

      // Verify original source project & blobs remain completely untouched
      const originalProject = await db.projects.get('proj-success');
      expect(originalProject).toBeDefined();
      expect(originalProject!.name).toBe('Sample Project');
      const originalBlobs = await db.layerBlobs.where('projectId').equals('proj-success').toArray();
      expect(originalBlobs).toHaveLength(2);

      // Verify recovery ledger record was updated with resolution audit metadata
      const updatedLedger = await db.recoveryRecords.get('proj-success');
      expect(updatedLedger).toBeDefined();
      expect(updatedLedger!.recoveredProjectId).toBe(recoveredId);
      expect(updatedLedger!.resolvedAt).toBeDefined();
      expect(updatedLedger!.resolvedSourceFingerprint).toHaveLength(64);
    });

    it('enforces zero-or-one Blob semantics: transparent layer produces zero destination Blobs', async () => {
      const proj = baseProjectFixture('proj-transparent');
      // Frame 0 has invalid blob and will be deleted. Frame 1 has no blob (transparent frame)
      const badBlob = createCorruptPngBlob();
      await seedProjectInDb('proj-transparent', proj, [
        { id: 1201, layerId: 'layer-1', frameIndex: 0, blob: badBlob },
      ]);

      const prepResult = await prepareRecoveryPlan('proj-transparent', { deleteFrameIndices: [0] });
      expect(prepResult.status).toBe('ready');
      if (prepResult.status !== 'ready') return;

      expect(prepResult.candidatePlan.blobRemapEntries).toHaveLength(0);

      const commitResult = await commitRecoveredProject(prepResult.planToken);
      expect(commitResult.status).toBe('persisted-success');
      if (commitResult.status !== 'persisted-success') return;

      // Destination project exists with 1 frame
      const destProject = await db.projects.get(commitResult.recoveredProjectId);
      expect(destProject).toBeDefined();
      const parsedData = JSON.parse(destProject!.dataJson) as ProjectFile;
      expect(parsedData.frames).toHaveLength(1);
      expect(parsedData.frames[0].id).toBe('frame-2');

      // Zero blobs created in layerBlobs
      const destBlobs = await db.layerBlobs
        .where('projectId')
        .equals(commitResult.recoveredProjectId)
        .toArray();
      expect(destBlobs).toHaveLength(0);
    });

    it('atomically rolls back all destination tables when transaction fails mid-flight', async () => {
      const proj = baseProjectFixture('proj-rollback');
      const badBlob = createPngBlob(64, 64);
      const goodBlob = createPngBlob(32, 32);
      await seedProjectInDb('proj-rollback', proj, [
        { id: 1101, layerId: 'layer-1', frameIndex: 0, blob: badBlob },
        { id: 1102, layerId: 'layer-2', frameIndex: 1, blob: goodBlob },
      ]);

      const prepResult = await prepareRecoveryPlan('proj-rollback', { deleteFrameIndices: [0] });
      expect(prepResult.status).toBe('ready');
      if (prepResult.status !== 'ready') return;

      // Spy on recoveryRecords.put to simulate disk failure on the final ledger update step
      vi.spyOn(db.recoveryRecords, 'put').mockRejectedValueOnce(
        new Error('Simulated disk write failure during ledger put')
      );

      const commitResult = await commitRecoveredProject(prepResult.planToken);
      expect(commitResult.status).toBe('storage-failure');

      // Verify complete rollback: no destination project was retained
      const allProjects = await db.projects.toArray();
      expect(allProjects).toHaveLength(1);
      expect(allProjects[0].id).toBe('proj-rollback');

      // Verify no orphaned layer blobs for any new project
      const allBlobs = await db.layerBlobs.toArray();
      expect(allBlobs).toHaveLength(2);
      expect(allBlobs.every((b) => b.projectId === 'proj-rollback')).toBe(true);

      // Verify token was marked consumed and cannot be reused
      const retryResult = await commitRecoveredProject(prepResult.planToken);
      expect(retryResult.status).toBe('unrecoverable-blocked');
      if (retryResult.status === 'unrecoverable-blocked') {
        expect(retryResult.reasonCode).toBe('TOKEN_ALREADY_CONSUMED');
      }
    });
  });
});
