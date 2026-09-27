import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { db } from '@/lib/storage/db';
import { getLatestStoredProjectId } from '@/lib/storage/db';
import {
  inspectAndAdmitStoredProject,
  isAutosavePermitted,
  type RestoreLifecycleState,
} from '@/lib/recovery/projectAdmission';
import { PROJECT_FORMAT_ID, PROJECT_FORMAT_VERSION, type ProjectFile } from '@/types/project';
import { RECOVERY_INSPECTION_CEILINGS } from '@/lib/recovery/recoveryLimits';
import * as bufferRegistry from '@/lib/engine/bufferRegistry';

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
  bytes[24] = payloadByte;
  return new Blob([bytes], { type: 'image/png' });
}

function createCorruptPngBlob(): Blob {
  return new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x00])], { type: 'image/png' });
}

function createHeaderValidBodyInvalidPngBlob(width = 32, height = 32): Blob {
  const bytes = new Uint8Array(34);
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
  // Trailing invalid/truncated bytes (no CRC, no IDAT)
  bytes.set([0x08, 0x06, 0x00, 0x00, 0x00, 0xde, 0xad, 0xbe, 0xef, 0x00], 24);
  return new Blob([bytes], { type: 'image/png' });
}

function baseProjectFixture(_id = 'proj-admission-test', width = 32, height = 32): ProjectFile {
  return {
    format: PROJECT_FORMAT_ID,
    version: PROJECT_FORMAT_VERSION,
    name: 'Admission Test Project',
    width,
    height,
    fps: 12,
    createdAt: 1000,
    updatedAt: 1000,
    loopMode: 'repeat',
    onionSkin: {
      enabled: false,
      prevFrames: 1,
      nextFrames: 1,
      opacity: 0.35,
      prevColor: '#7fae6b',
      nextColor: '#c792df',
    },
    customRamps: [],
    palettes: [
      {
        id: 'palette-default',
        name: 'Default Palette',
        colors: ['#000000', '#ffffff', '#ff0000'],
      },
    ],
    currentPaletteId: 'palette-default',
    clips: [],
    frames: [
      {
        id: 'frame-1',
        durationMs: 83,
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
  };
}

describe('Phase 1B.7 — Stored-Project Admission Boundary & Recovery Routing', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await db.projects.clear();
    await db.layerBlobs.clear();
    await db.recoveryRecords.clear();

    // Default createImageBitmap mock for browser canvas hydration
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn().mockResolvedValue({
        width: 32,
        height: 32,
        close: vi.fn(),
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // ==========================================================================
  // 1. Admission Unit Tests
  // ==========================================================================

  describe('inspectAndAdmitStoredProject', () => {
    it('admits a valid stored project with matching valid blobs', async () => {
      const proj = baseProjectFixture('proj-valid');
      await db.projects.put({
        id: 'proj-valid',
        name: proj.name,
        width: proj.width,
        height: proj.height,
        fps: proj.fps,
        createdAt: 1000,
        updatedAt: 1000,
        dataJson: JSON.stringify(proj),
        thumbnailDataUrl: '',
      });
      await db.layerBlobs.put({
        id: 1,
        projectId: 'proj-valid',
        layerId: 'layer-1',
        frameIndex: 0,
        blob: createPngBlob(32, 32),
        updatedAt: 1000,
      });

      const result = await inspectAndAdmitStoredProject('proj-valid');
      expect(result.status).toBe('admitted');
      if (result.status === 'admitted') {
        expect(result.projectId).toBe('proj-valid');
        expect(result.project.name).toBe(proj.name);
        expect(result.sourceBlobs).toHaveLength(1);
        expect(result.sourceBlobs[0].layerId).toBe('layer-1');
      }
    });

    it('admits a valid stored project with transparent zero-blob layers (zero IndexedDB blobs and no pngBase64)', async () => {
      const proj = baseProjectFixture('proj-transparent-admission');
      await db.projects.put({
        id: 'proj-transparent-admission',
        name: proj.name,
        width: proj.width,
        height: proj.height,
        fps: proj.fps,
        createdAt: 1000,
        updatedAt: 1000,
        dataJson: JSON.stringify(proj),
        thumbnailDataUrl: '',
      });
      // Zero blob records inserted in db.layerBlobs: canonical Phase 1B.2 transparent layer

      const result = await inspectAndAdmitStoredProject('proj-transparent-admission');
      expect(result.status).toBe('admitted');
      if (result.status === 'admitted') {
        expect(result.projectId).toBe('proj-transparent-admission');
        expect(result.project.name).toBe(proj.name);
        expect(result.sourceBlobs).toHaveLength(0);
      }
    });

    it('rejects a project with dimension-mismatched blob as recovery-required before hydration', async () => {
      const createEntrySpy = vi.spyOn(bufferRegistry, 'createEntry');
      const proj = baseProjectFixture('proj-dim-mismatch');
      await db.projects.put({
        id: 'proj-dim-mismatch',
        name: proj.name,
        width: 32,
        height: 32,
        fps: proj.fps,
        createdAt: 1000,
        updatedAt: 1000,
        dataJson: JSON.stringify(proj),
        thumbnailDataUrl: '',
      });
      // Blob dimensions (64x64) mismatch project canvas (32x32)
      await db.layerBlobs.put({
        id: 1,
        projectId: 'proj-dim-mismatch',
        layerId: 'layer-1',
        frameIndex: 0,
        blob: createPngBlob(64, 64),
        updatedAt: 1000,
      });

      const result = await inspectAndAdmitStoredProject('proj-dim-mismatch');
      expect(result.status).toBe('recovery-required');
      if (result.status === 'recovery-required') {
        expect(result.assessment.status).toBe('recoverable-blob-invalid');
      }
      expect(createEntrySpy).not.toHaveBeenCalled();
    });

    it('rejects a project with corrupt PNG header blob as recovery-required before hydration', async () => {
      const createEntrySpy = vi.spyOn(bufferRegistry, 'createEntry');
      const proj = baseProjectFixture('proj-corrupt-header');
      await db.projects.put({
        id: 'proj-corrupt-header',
        name: proj.name,
        width: 32,
        height: 32,
        fps: proj.fps,
        createdAt: 1000,
        updatedAt: 1000,
        dataJson: JSON.stringify(proj),
        thumbnailDataUrl: '',
      });
      await db.layerBlobs.put({
        id: 1,
        projectId: 'proj-corrupt-header',
        layerId: 'layer-1',
        frameIndex: 0,
        blob: createCorruptPngBlob(),
        updatedAt: 1000,
      });

      const result = await inspectAndAdmitStoredProject('proj-corrupt-header');
      expect(result.status).toBe('recovery-required');
      if (result.status === 'recovery-required') {
        expect(result.assessment.status).toBe('recoverable-blob-invalid');
      }
      expect(createEntrySpy).not.toHaveBeenCalled();
    });

    it('rejects duplicate blob mappings for the same layer as recovery-required before hydration', async () => {
      const createEntrySpy = vi.spyOn(bufferRegistry, 'createEntry');
      const proj = baseProjectFixture('proj-dup-blobs');
      await db.projects.put({
        id: 'proj-dup-blobs',
        name: proj.name,
        width: 32,
        height: 32,
        fps: proj.fps,
        createdAt: 1000,
        updatedAt: 1000,
        dataJson: JSON.stringify(proj),
        thumbnailDataUrl: '',
      });
      await db.layerBlobs.bulkPut([
        {
          id: 1,
          projectId: 'proj-dup-blobs',
          layerId: 'layer-1',
          frameIndex: 0,
          blob: createPngBlob(32, 32, 1),
          updatedAt: 1000,
        },
        {
          id: 2,
          projectId: 'proj-dup-blobs',
          layerId: 'layer-1',
          frameIndex: 0,
          blob: createPngBlob(32, 32, 2),
          updatedAt: 1001,
        },
      ]);

      const result = await inspectAndAdmitStoredProject('proj-dup-blobs');
      expect(result.status).toBe('recovery-required');
      if (result.status === 'recovery-required') {
        expect(result.assessment.status).toBe('recoverable-blob-invalid');
        expect(result.assessment.reasonCodes).toContain('DUPLICATE_BLOB_MAPPING');
      }
      expect(createEntrySpy).not.toHaveBeenCalled();
    });

    it('rejects envelope-exceeded projects as recovery-required before hydration', async () => {
      const createEntrySpy = vi.spyOn(bufferRegistry, 'createEntry');
      const proj = baseProjectFixture('proj-env-exceeded');
      // Create excessive layers exceeding MAX_CANVAS_LAYERS (100)
      const layers = Array.from({ length: 105 }, (_, i) => ({
        id: `layer-${i + 1}`,
        name: `Layer ${i + 1}`,
        visible: true,
        locked: false,
        opacity: 1,
        blendMode: 'source-over' as const,
      }));
      proj.frames[0].layers = layers;

      await db.projects.put({
        id: 'proj-env-exceeded',
        name: proj.name,
        width: 32,
        height: 32,
        fps: proj.fps,
        createdAt: 1000,
        updatedAt: 1000,
        dataJson: JSON.stringify(proj),
        thumbnailDataUrl: '',
      });

      const result = await inspectAndAdmitStoredProject('proj-env-exceeded');
      expect(result.status).toBe('recovery-required');
      if (result.status === 'recovery-required') {
        expect(result.assessment.status).toBe('recoverable-envelope-exceeded');
      }
      expect(createEntrySpy).not.toHaveBeenCalled();
    });

    it('rejects stored blob count exceeding MAX_INSPECTABLE_STORED_BLOBS as blocked before hydration', async () => {
      const createEntrySpy = vi.spyOn(bufferRegistry, 'createEntry');
      const proj = baseProjectFixture('proj-excessive-blobs');
      await db.projects.put({
        id: 'proj-excessive-blobs',
        name: proj.name,
        width: 32,
        height: 32,
        fps: 8,
        createdAt: 1000,
        updatedAt: 1000,
        dataJson: JSON.stringify(proj),
        thumbnailDataUrl: '',
      });

      // Only the record count matters here; share the immutable fixture blob.
      const fixtureBlob = createPngBlob(32, 32);
      const excessiveBlobs = Array.from(
        { length: RECOVERY_INSPECTION_CEILINGS.MAX_INSPECTABLE_STORED_BLOBS + 1 },
        (_, i) => ({
          id: i + 1,
          projectId: 'proj-excessive-blobs',
          layerId: 'layer-1',
          frameIndex: 0,
          blob: fixtureBlob,
          updatedAt: 1000,
        })
      );
      await db.layerBlobs.bulkPut(excessiveBlobs);

      const result = await inspectAndAdmitStoredProject('proj-excessive-blobs');
      expect(result.status).toBe('blocked');
      if (result.status === 'blocked') {
        expect(result.reasonCode).toBe('EXCESSIVE_STORED_BLOBS');
      }
      expect(createEntrySpy).not.toHaveBeenCalled();
    }, 20_000);

    it('rejects embedded pngBase64 layers as recovery-required before hydration', async () => {
      const createEntrySpy = vi.spyOn(bufferRegistry, 'createEntry');
      const proj = baseProjectFixture('proj-embedded-raster');
      (proj.frames[0].layers[0] as unknown as { pngBase64: string }).pngBase64 =
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      await db.projects.put({
        id: 'proj-embedded-raster',
        name: proj.name,
        width: 32,
        height: 32,
        fps: 8,
        createdAt: 1000,
        updatedAt: 1000,
        dataJson: JSON.stringify(proj),
        thumbnailDataUrl: '',
      });

      const result = await inspectAndAdmitStoredProject('proj-embedded-raster');
      expect(result.status).toBe('recovery-required');
      if (result.status === 'recovery-required') {
        expect(result.assessment.status).toBe('recoverable-blob-invalid');
        expect(result.assessment.reasonCodes).toContain('EMBEDDED_RASTER_UNSUPPORTED');
      }
      expect(createEntrySpy).not.toHaveBeenCalled();
    });

    it('admits a project with valid PNG header even if remaining body bytes are truncated/corrupt', async () => {
      const proj = baseProjectFixture('proj-valid-header-bad-body');
      await db.projects.put({
        id: 'proj-valid-header-bad-body',
        name: proj.name,
        width: 32,
        height: 32,
        fps: 12,
        createdAt: 1000,
        updatedAt: 1000,
        dataJson: JSON.stringify(proj),
        thumbnailDataUrl: '',
      });
      await db.layerBlobs.put({
        id: 1,
        projectId: 'proj-valid-header-bad-body',
        layerId: 'layer-1',
        frameIndex: 0,
        blob: createHeaderValidBodyInvalidPngBlob(32, 32),
        updatedAt: 1000,
      });

      const result = await inspectAndAdmitStoredProject('proj-valid-header-bad-body');
      expect(result.status).toBe('admitted');
      if (result.status === 'admitted') {
        expect(result.sourceBlobs).toHaveLength(1);
      }
    });

    it('rejects malformed json metadata as blocked', async () => {
      await db.projects.put({
        id: 'proj-malformed',
        name: 'Bad',
        width: 32,
        height: 32,
        fps: 8,
        createdAt: 1000,
        updatedAt: 1000,
        dataJson: '{"invalid": json syntax',
        thumbnailDataUrl: '',
      });

      const result = await inspectAndAdmitStoredProject('proj-malformed');
      expect(result.status).toBe('blocked');
    });

    it('rejects unsupported future version as unsupported-version', async () => {
      const proj = baseProjectFixture('proj-future');
      proj.version = PROJECT_FORMAT_VERSION + 99;

      await db.projects.put({
        id: 'proj-future',
        name: proj.name,
        width: 32,
        height: 32,
        fps: 8,
        createdAt: 1000,
        updatedAt: 1000,
        dataJson: JSON.stringify(proj),
        thumbnailDataUrl: '',
      });

      const result = await inspectAndAdmitStoredProject('proj-future');
      expect(result.status).toBe('unsupported-version');
      if (result.status === 'unsupported-version') {
        expect(result.foundVersion).toBe(PROJECT_FORMAT_VERSION + 99);
      }
    });

    it('returns not-found for nonexistent project ID', async () => {
      const result = await inspectAndAdmitStoredProject('nonexistent-id');
      expect(result.status).toBe('not-found');
    });

    it('returns cancelled when pre-aborted signal is provided', async () => {
      const controller = new AbortController();
      controller.abort();

      const result = await inspectAndAdmitStoredProject('proj-any', { signal: controller.signal });
      expect(result.status).toBe('cancelled');
    });

    it('admits project even with orphan blobs (orphans do not block admission)', async () => {
      const proj = baseProjectFixture('proj-with-orphan');
      await db.projects.put({
        id: 'proj-with-orphan',
        name: proj.name,
        width: proj.width,
        height: proj.height,
        fps: proj.fps,
        createdAt: 1000,
        updatedAt: 1000,
        dataJson: JSON.stringify(proj),
        thumbnailDataUrl: '',
      });
      await db.layerBlobs.bulkPut([
        {
          id: 1,
          projectId: 'proj-with-orphan',
          layerId: 'layer-1',
          frameIndex: 0,
          blob: createPngBlob(32, 32),
          updatedAt: 1000,
        },
        // Orphan blob referencing non-existent layer-orphan
        {
          id: 2,
          projectId: 'proj-with-orphan',
          layerId: 'layer-orphan',
          frameIndex: 99,
          blob: createPngBlob(32, 32),
          updatedAt: 1000,
        },
      ]);

      const result = await inspectAndAdmitStoredProject('proj-with-orphan');
      expect(result.status).toBe('admitted');
    });

    it('guarantees immutability of admitted descriptors and project', async () => {
      const proj = baseProjectFixture('proj-immut');
      await db.projects.put({
        id: 'proj-immut',
        name: proj.name,
        width: proj.width,
        height: proj.height,
        fps: proj.fps,
        createdAt: 1000,
        updatedAt: 1000,
        dataJson: JSON.stringify(proj),
        thumbnailDataUrl: '',
      });
      await db.layerBlobs.put({
        id: 1,
        projectId: 'proj-immut',
        layerId: 'layer-1',
        frameIndex: 0,
        blob: createPngBlob(32, 32),
        updatedAt: 1000,
      });

      const result = await inspectAndAdmitStoredProject('proj-immut');
      expect(result.status).toBe('admitted');
      if (result.status === 'admitted') {
        expect(Object.isFrozen(result.sourceBlobs)).toBe(true);
        expect(Object.isFrozen(result.sourceBlobs[0])).toBe(true);
        expect(Object.isFrozen(result.project)).toBe(true);

        // Attempt scalar mutations on individual descriptor fields
        expect(() => {
          (result.sourceBlobs[0] as { layerId: string }).layerId = 'tampered';
        }).toThrow(TypeError);
        expect(() => {
          (result.sourceBlobs[0] as { frameIndex: number }).frameIndex = 999;
        }).toThrow(TypeError);
        expect(() => {
          (result.sourceBlobs[0] as { projectId: string }).projectId = 'other-proj';
        }).toThrow(TypeError);

        // Attempt mutations on array membership and elements
        expect(() => {
          (result.sourceBlobs as unknown as unknown[]).push({});
        }).toThrow(TypeError);
        expect(() => {
          (result.sourceBlobs as unknown as unknown[])[0] = {};
        }).toThrow(TypeError);

        // Attempt scalar and deep nested mutations on ProjectFile structure
        expect(() => {
          (result.project as { width: number }).width = 9999;
        }).toThrow(TypeError);
        expect(() => {
          (result.project.frames[0] as { durationMs: number }).durationMs = 9999;
        }).toThrow(TypeError);
        expect(() => {
          (result.project.frames[0].layers[0] as { name: string }).name = 'tampered';
        }).toThrow(TypeError);
      }
    });
  });

  // ==========================================================================
  // 2. Identity Discovery Tests
  // ==========================================================================

  describe('getLatestStoredProjectId', () => {
    it('returns the ID of the most recently updated project', async () => {
      await db.projects.bulkPut([
        {
          id: 'proj-old',
          name: 'Old',
          width: 32,
          height: 32,
          fps: 8,
          createdAt: 100,
          updatedAt: 100,
          dataJson: '{}',
          thumbnailDataUrl: '',
        },
        {
          id: 'proj-newest',
          name: 'Newest',
          width: 32,
          height: 32,
          fps: 8,
          createdAt: 200,
          updatedAt: 500,
          dataJson: '{}',
          thumbnailDataUrl: '',
        },
        {
          id: 'proj-middle',
          name: 'Middle',
          width: 32,
          height: 32,
          fps: 8,
          createdAt: 300,
          updatedAt: 300,
          dataJson: '{}',
          thumbnailDataUrl: '',
        },
      ]);

      const latest = await getLatestStoredProjectId();
      expect(latest).toBe('proj-newest');
    });

    it('returns null when no projects exist in database', async () => {
      const latest = await getLatestStoredProjectId();
      expect(latest).toBeNull();
    });

    it('does NOT query or materialize layerBlobs during identity discovery', async () => {
      const whereSpy = vi.spyOn(db.layerBlobs, 'where');
      const toArraySpy = vi.spyOn(db.layerBlobs, 'toArray');

      await db.projects.put({
        id: 'proj-blobless',
        name: 'No Blobs Read',
        width: 32,
        height: 32,
        fps: 8,
        createdAt: 1000,
        updatedAt: 1000,
        dataJson: '{}',
        thumbnailDataUrl: '',
      });

      const latest = await getLatestStoredProjectId();
      expect(latest).toBe('proj-blobless');
      expect(whereSpy).not.toHaveBeenCalled();
      expect(toArraySpy).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // 3. Lifecycle & Autosave Permission Tests
  // ==========================================================================

  describe('isAutosavePermitted', () => {
    it('returns true exclusively for active phase', () => {
      expect(isAutosavePermitted('active')).toBe(true);
    });

    it('returns false for all non-active phases', () => {
      const nonActivePhases: RestoreLifecycleState['phase'][] = [
        'idle',
        'loading',
        'assessing',
        'hydrating',
        'recovery-required',
        'unsupported-version',
        'blocked',
        'transient-failure',
        'hydration-failure',
        'cancelled',
      ];
      for (const phase of nonActivePhases) {
        expect(isAutosavePermitted(phase)).toBe(false);
      }
    });
  });
});
