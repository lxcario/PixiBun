import { test, expect } from '@playwright/test';

test.use({ bypassCSP: true });

interface DexieInstance {
  version: (n: number) => { stores: (schema: Record<string, string>) => void };
  open: () => Promise<void>;
  delete: () => Promise<void>;
  transaction: (mode: string, tables: unknown[], callback: () => Promise<void>) => Promise<void>;
  projects: {
    get: (id: string) => Promise<{ id: string; name: string; updatedAt: number } | undefined>;
    add: (item: unknown) => Promise<unknown>;
  };
  layerBlobs: {
    add: (item: unknown) => Promise<unknown>;
    where: (key: string) => {
      equals: (val: string) => {
        toArray: () => Promise<Array<{ projectId: string; layerId?: string; blob: Blob }>>;
      };
    };
  };
  recoveryRecords: {
    add: (item: unknown) => Promise<unknown>;
    put: (item: unknown) => Promise<unknown>;
    get: (id: string) => Promise<{ resolvedAt?: number; recoveredProjectId?: string; resolvedSourceFingerprint?: string } | undefined>;
  };
}

interface DexieStatic {
  new (databaseName: string): DexieInstance;
  waitFor: <T>(promise: Promise<T>) => Promise<T>;
}

interface ProductionRecoveryOrchestrator {
  prepareRecoveryPlan: (id: string, options?: { deleteFrameIndices?: number[] }) => Promise<{
    status: string;
    planToken?: unknown;
    message?: string;
  }>;
  commitRecoveredProject: (token: unknown) => Promise<{
    status: string;
    recoveredProjectId?: string;
    recoveredTitle?: string;
    message?: string;
  }>;
  db: {
    projects: {
      get: (id: string) => Promise<{ id: string; name: string } | undefined>;
      put: (item: unknown) => Promise<unknown>;
    };
    layerBlobs: {
      put: (item: unknown) => Promise<unknown>;
    };
    recoveryRecords: {
      get: (id: string) => Promise<{ resolvedAt?: number; recoveredProjectId?: string } | undefined>;
      put: (item: unknown) => Promise<unknown>;
    };
  };
}

interface WindowWithRecovery {
  Dexie: DexieStatic;
  __PIXIBUN_RECOVERY_ORCHESTRATOR__?: ProductionRecoveryOrchestrator;
}

let recoveryBundleCode: string;

test.describe('Real Chromium IndexedDB Transaction Liveness & Recovery Persistence', () => {
  test.beforeAll(async () => {
    const { build } = await import('vite');
    const path = await import('path');
    const res = await build({
      configFile: false,
      define: {
        'process.env.NODE_ENV': JSON.stringify('production'),
        'process.env': '{}',
      },
      resolve: {
        alias: {
          '@': path.resolve(process.cwd(), 'src'),
        },
      },
      build: {
        write: false,
        lib: {
          entry: path.resolve(process.cwd(), 'tests/e2e/helpers/recoveryTestBundleEntry.ts'),
          name: '__PIXIBUN_RECOVERY_ORCHESTRATOR__',
          formats: ['iife'],
        },
      },
    });
    const output = Array.isArray(res) ? res[0]?.output : (res as { output: Array<{ code: string }> })?.output;
    recoveryBundleCode = output?.[0]?.code || '';
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/studio');
    await page.waitForLoadState('domcontentloaded');

    // Inject real Dexie bundle into the Chromium browser window for low-level liveness proofs
    const dexieBundlePath = require.resolve('dexie/dist/dexie.min.js');
    await page.addScriptTag({ path: dexieBundlePath });

    // Inject test-only bundle containing genuine production recovery orchestrator without any production window exposure
    if (recoveryBundleCode) {
      await page.addScriptTag({ content: recoveryBundleCode });
    }
  });

  test('without Dexie.waitFor(), asynchronous Web Crypto digest causes premature auto-commit in real Chromium', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const win = window as unknown as WindowWithRecovery;
      const Dexie = win.Dexie;
      const dbName = 'test_liveness_fail_' + Date.now();
      const testDb = new Dexie(dbName);
      testDb.version(1).stores({
        projects: 'id, name, updatedAt',
        layerBlobs: '++id, [projectId+id], projectId, updatedAt',
        recoveryRecords: 'projectId, classificationState, resolvedAt',
      });

      await testDb.open();

      let caughtErrorName = '';
      let caughtErrorMessage = '';

      try {
        await testDb.transaction('rw', [testDb.projects, testDb.layerBlobs, testDb.recoveryRecords], async () => {
          // Create a blob and digest it with native Web Crypto WITHOUT Dexie.waitFor()
          const blob = new Blob(['sample-pixel-data-for-premature-commit'], { type: 'image/png' });
          const buffer = await blob.arrayBuffer();
          // This asynchronous await yields to the browser event loop without an active IDBRequest,
          // causing Chromium to automatically commit / close the native IDBTransaction
          const digest = await window.crypto.subtle.digest('SHA-256', buffer);
          const hex = Array.from(new Uint8Array(digest))
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('');

          // Subsequent write must fail because transaction is no longer active in Chromium
          await testDb.projects.add({
            id: 'proj-failed',
            name: 'Project ' + hex.slice(0, 8),
            updatedAt: Date.now(),
          });
        });
      } catch (err: unknown) {
        caughtErrorName = (err as { name?: string })?.name ?? 'Error';
        caughtErrorMessage = err instanceof Error ? err.message : String(err);
      } finally {
        await testDb.delete();
      }

      return { caughtErrorName, caughtErrorMessage };
    });

    // In Chromium, yielding during native async without Dexie.waitFor causes transaction inactivation
    expect(result.caughtErrorName.length).toBeGreaterThan(0);
    expect(
      /TransactionInactiveError|PrematureCommit|closed|not active|inactive/i.test(
        result.caughtErrorName + ' ' + result.caughtErrorMessage
      )
    ).toBe(true);
  });

  test('with Dexie.waitFor(), transaction stays alive across asynchronous Web Crypto SHA-256 digests and commits atomically in real Chromium', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const win = window as unknown as WindowWithRecovery;
      const Dexie = win.Dexie;
      const dbName = 'test_liveness_success_' + Date.now();
      const testDb = new Dexie(dbName);
      testDb.version(1).stores({
        projects: 'id, name, updatedAt',
        layerBlobs: '++id, [projectId+id], projectId, updatedAt',
        recoveryRecords: 'projectId, classificationState, resolvedAt',
      });

      await testDb.open();

      const sourceProjectId = 'source-damaged-proj';
      const destinationProjectId = 'recovered-clone-proj';
      const commitTimestamp = Date.now();

      // 1. Seed damaged project and blobs
      const samplePngBytes = new Uint8Array([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG magic (8 bytes)
        0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR header (8 bytes)
        0x00, 0x00, 0x00, 0x20, 0x00, 0x00, 0x00, 0x20, // 32x32 (8 bytes)
        0x08, 0x06, 0x00, 0x00, 0x00, 0x73, 0x7a, 0x7a, // (8 bytes)
        0x42, 0x4c, 0x4f, 0x42, // Custom payload (4 bytes) -> total 36 bytes
      ]);

      await testDb.projects.add({
        id: sourceProjectId,
        name: 'My Damaged Artwork',
        updatedAt: commitTimestamp - 1000,
      });

      await testDb.layerBlobs.add({
        projectId: sourceProjectId,
        layerId: 'layer-1',
        blob: new Blob([samplePngBytes], { type: 'image/png' }),
        updatedAt: commitTimestamp - 1000,
      });

      await testDb.recoveryRecords.add({
        projectId: sourceProjectId,
        classificationState: 'recoverable-blob-invalid',
        firstDetectedAt: commitTimestamp - 2000,
        lastConfirmedAt: commitTimestamp - 1000,
        reasonCodes: ['CORRUPTED_PNG_HEADER'],
      });

      let calculatedSha256Hex = '';

      // 2. Execute atomic recovery transaction with Dexie.waitFor keepalive
      await testDb.transaction('rw', [testDb.projects, testDb.layerBlobs, testDb.recoveryRecords], async () => {
        // Read source project inside transaction
        const project = await testDb.projects.get(sourceProjectId);
        if (!project) throw new Error('Source project missing');

        // Read source blobs inside transaction
        const blobs = await testDb.layerBlobs.where('projectId').equals(sourceProjectId).toArray();
        if (blobs.length !== 1) throw new Error('Source blobs missing');

        // Digest blob with Dexie.waitFor keepalive
        const blobDigestUint8 = await Dexie.waitFor(
          (async () => {
            const arrayBuffer = await blobs[0].blob.arrayBuffer();
            const digestBuffer = await window.crypto.subtle.digest('SHA-256', arrayBuffer);
            return new Uint8Array(digestBuffer);
          })()
        );

        calculatedSha256Hex = Array.from(blobDigestUint8)
          .map((b: number) => b.toString(16).padStart(2, '0'))
          .join('');

        // Destination project write
        await testDb.projects.add({
          id: destinationProjectId,
          name: '[Recovered] ' + project.name,
          updatedAt: commitTimestamp,
        });

        // Destination blob write
        await testDb.layerBlobs.add({
          projectId: destinationProjectId,
          layerId: 'layer-1-recovered',
          blob: blobs[0].blob,
          updatedAt: commitTimestamp,
        });

        // Recovery record resolution update
        await testDb.recoveryRecords.put({
          projectId: sourceProjectId,
          classificationState: 'recoverable-blob-invalid',
          firstDetectedAt: commitTimestamp - 2000,
          lastConfirmedAt: commitTimestamp,
          resolvedAt: commitTimestamp,
          recoveredProjectId: destinationProjectId,
          resolvedSourceFingerprint: calculatedSha256Hex,
        });
      });

      // 3. Verify real Chromium IndexedDB state after commit
      const persistedProject = await testDb.projects.get(destinationProjectId);
      const persistedBlobs = await testDb.layerBlobs.where('projectId').equals(destinationProjectId).toArray();
      const updatedLedger = await testDb.recoveryRecords.get(sourceProjectId);
      const originalProject = await testDb.projects.get(sourceProjectId);

      await testDb.delete();

      return {
        calculatedSha256Hex,
        persistedProject,
        persistedBlobsCount: persistedBlobs.length,
        persistedBlobSize: persistedBlobs[0]?.blob?.size,
        updatedLedger,
        originalProjectUntouched: originalProject?.name === 'My Damaged Artwork',
      };
    });

    expect(result.calculatedSha256Hex).toHaveLength(64);
    expect(result.persistedProject).toBeDefined();
    expect(result.persistedProject?.id).toBe('recovered-clone-proj');
    expect(result.persistedProject?.name).toBe('[Recovered] My Damaged Artwork');
    expect(result.persistedBlobsCount).toBe(1);
    expect(result.persistedBlobSize).toBe(36);
    expect(result.updatedLedger?.resolvedAt).toBeGreaterThan(0);
    expect(result.updatedLedger?.recoveredProjectId).toBe('recovered-clone-proj');
    expect(result.updatedLedger?.resolvedSourceFingerprint).toBe(result.calculatedSha256Hex);
    expect(result.originalProjectUntouched).toBe(true);
  });

  test('atomic rollback in real Chromium: mid-flight failure rolls back all destination writes', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const win = window as unknown as WindowWithRecovery;
      const Dexie = win.Dexie;
      const dbName = 'test_liveness_rollback_' + Date.now();
      const testDb = new Dexie(dbName);
      testDb.version(1).stores({
        projects: 'id, name, updatedAt',
        layerBlobs: '++id, [projectId+id], projectId, updatedAt',
        recoveryRecords: 'projectId, classificationState, resolvedAt',
      });

      await testDb.open();

      const sourceId = 'proj-rollback-source';
      const destId = 'proj-rollback-dest';

      await testDb.projects.add({ id: sourceId, name: 'Original', updatedAt: 1000 });

      let caughtError = '';
      try {
        await testDb.transaction('rw', [testDb.projects, testDb.layerBlobs, testDb.recoveryRecords], async () => {
          // Perform async hash with keepalive
          const blob = new Blob(['rollback-payload'], { type: 'image/png' });
          await Dexie.waitFor(
            (async () => {
              const buf = await blob.arrayBuffer();
              return window.crypto.subtle.digest('SHA-256', buf);
            })()
          );

          // Write destination project
          await testDb.projects.add({ id: destId, name: '[Recovered] Original', updatedAt: 2000 });

          // Write destination blob
          await testDb.layerBlobs.add({ projectId: destId, blob, updatedAt: 2000 });

          // Mid-flight intentional failure
          throw new Error('Simulated atomic crash before transaction complete');
        });
      } catch (err: unknown) {
        caughtError = err instanceof Error ? err.message : String(err);
      }

      // Verify zero partial destination records in Chromium IndexedDB
      const destProject = await testDb.projects.get(destId);
      const destBlobs = await testDb.layerBlobs.where('projectId').equals(destId).toArray();
      const sourceProject = await testDb.projects.get(sourceId);

      await testDb.delete();

      return {
        caughtError,
        destProjectExists: destProject !== undefined,
        destBlobsCount: destBlobs.length,
        sourceProjectPreserved: sourceProject !== undefined,
      };
    });

    expect(result.caughtError).toBe('Simulated atomic crash before transaction complete');
    expect(result.destProjectExists).toBe(false);
    expect(result.destBlobsCount).toBe(0);
    expect(result.sourceProjectPreserved).toBe(true);
  });

  test('endures sequential multi-blob hashing with deep microtask yielding under Dexie.waitFor()', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const win = window as unknown as WindowWithRecovery;
      const Dexie = win.Dexie;
      const dbName = 'test_liveness_multiblob_' + Date.now();
      const testDb = new Dexie(dbName);
      testDb.version(1).stores({
        projects: 'id, name, updatedAt',
        layerBlobs: '++id, [projectId+id], projectId, updatedAt',
        recoveryRecords: 'projectId, classificationState, resolvedAt',
      });

      await testDb.open();

      const blobCount = 8;
      const digests: string[] = [];

      await testDb.transaction('rw', [testDb.projects, testDb.layerBlobs, testDb.recoveryRecords], async () => {
        // Sequentially digest multiple blobs with async microtask yields in Dexie.waitFor
        for (let i = 0; i < blobCount; i++) {
          const blob = new Blob([`multi-blob-layer-payload-content-${i}`], { type: 'image/png' });
          const hex = await Dexie.waitFor(
            (async () => {
              const buffer = await blob.arrayBuffer();
              const hash = await window.crypto.subtle.digest('SHA-256', buffer);
              return Array.from(new Uint8Array(hash))
                .map((b) => b.toString(16).padStart(2, '0'))
                .join('');
            })()
          );
          digests.push(hex);

          // Write blob record inside same transaction
          await testDb.layerBlobs.add({
            projectId: 'multi-dest',
            layerId: `layer-${i}`,
            blob,
            updatedAt: Date.now(),
          });
        }

        // Commit project header
        await testDb.projects.add({
          id: 'multi-dest',
          name: 'Multi-Blob Project',
          updatedAt: Date.now(),
        });
      });

      // Verify all blobs committed
      const storedBlobs = await testDb.layerBlobs.where('projectId').equals('multi-dest').toArray();
      const storedProj = await testDb.projects.get('multi-dest');

      await testDb.delete();

      return {
        digestsCount: digests.length,
        storedBlobsCount: storedBlobs.length,
        storedProjExists: storedProj !== undefined,
      };
    });

    expect(result.digestsCount).toBe(8);
    expect(result.storedBlobsCount).toBe(8);
    expect(result.storedProjExists).toBe(true);
  });

  test('production path: prepareRecoveryPlan and commitRecoveredProject execute atomically in real Chromium', async ({ page }) => {
    // Wait for the production recovery orchestrator to be mounted on window
    await page.waitForFunction(() => {
      const win = window as unknown as WindowWithRecovery;
      return typeof win.__PIXIBUN_RECOVERY_ORCHESTRATOR__?.prepareRecoveryPlan === 'function';
    });

    const result = await page.evaluate(async () => {
      const win = window as unknown as WindowWithRecovery;
      const orchestrator = win.__PIXIBUN_RECOVERY_ORCHESTRATOR__;
      if (!orchestrator) throw new Error('Recovery orchestrator not mounted on window');

      const { prepareRecoveryPlan, commitRecoveredProject, db } = orchestrator;
      const testProjectId = 'prod-damaged-' + Date.now();

      // Seed damaged project with valid envelope but invalid blob (mismatched dimensions)
      const projectData = {
        format: 'pixibun-project',
        version: 3,
        name: 'Production Artwork',
        width: 32,
        height: 32,
        fps: 12,
        loop: true,
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
            id: 'f-0',
            durationMs: 100,
            layers: [{ id: 'l-0', name: 'Background', visible: true, locked: false, opacity: 1, blendMode: 'source-over' }],
          },
          {
            id: 'f-1',
            durationMs: 100,
            layers: [{ id: 'l-1', name: 'Foreground', visible: true, locked: false, opacity: 1, blendMode: 'source-over' }],
          },
        ],
        createdAt: 1000,
        updatedAt: 1000,
      };

      await db.projects.put({
        id: testProjectId,
        name: 'Production Artwork',
        width: 32,
        height: 32,
        fps: 12,
        dataJson: JSON.stringify(projectData),
        createdAt: 1000,
        updatedAt: 1000,
      });

      // Valid PNG header with 64x64 dimensions (mismatched with project 32x32)
      const badBlobBytes = new Uint8Array(28);
      badBlobBytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
      badBlobBytes.set([0x00, 0x00, 0x00, 0x0d], 8);
      badBlobBytes.set([0x49, 0x48, 0x44, 0x52], 12);
      const badView = new DataView(badBlobBytes.buffer);
      badView.setUint32(16, 64, false); // 64 width
      badView.setUint32(20, 64, false); // 64 height

      // Valid PNG header with 32x32 dimensions
      const goodBlobBytes = new Uint8Array(28);
      goodBlobBytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
      goodBlobBytes.set([0x00, 0x00, 0x00, 0x0d], 8);
      goodBlobBytes.set([0x49, 0x48, 0x44, 0x52], 12);
      const goodView = new DataView(goodBlobBytes.buffer);
      goodView.setUint32(16, 32, false); // 32 width
      goodView.setUint32(20, 32, false); // 32 height

      await db.layerBlobs.put({
        id: 999901,
        projectId: testProjectId,
        layerId: 'l-0',
        frameIndex: 0,
        blob: new Blob([badBlobBytes], { type: 'image/png' }),
        updatedAt: 1000,
      });

      await db.layerBlobs.put({
        id: 999902,
        projectId: testProjectId,
        layerId: 'l-1',
        frameIndex: 1,
        blob: new Blob([goodBlobBytes], { type: 'image/png' }),
        updatedAt: 1000,
      });

      await db.recoveryRecords.put({
        projectId: testProjectId,
        classificationState: 'recoverable-blob-invalid',
        firstDetectedAt: 1000,
        lastConfirmedAt: 1000,
        reasonCodes: ['BLOB_DIMENSION_MISMATCH'],
      });

      // 1. Execute production prepareRecoveryPlan in real Chromium
      const prep = await prepareRecoveryPlan(testProjectId, {
        deleteFrameIndices: [0], // Consent to prune invalid frame
      });

      if (prep.status !== 'ready' || !prep.planToken) {
        return { status: prep.status, message: 'Prepare failed: ' + JSON.stringify(prep) };
      }

      // 2. Execute production commitRecoveredProject in real Chromium
      const commit = await commitRecoveredProject(prep.planToken);

      if (commit.status !== 'persisted-success') {
        return { status: commit.status, message: 'Commit failed: ' + JSON.stringify(commit) };
      }

      // 3. Verify real Chromium storage results out-of-transaction
      const recoveredProject = commit.recoveredProjectId
        ? await db.projects.get(commit.recoveredProjectId)
        : undefined;
      const originalProject = await db.projects.get(testProjectId);
      const ledgerEntry = await db.recoveryRecords.get(testProjectId);

      return {
        status: commit.status,
        recoveredProjectId: commit.recoveredProjectId,
        recoveredTitle: commit.recoveredTitle,
        recoveredProjectName: recoveredProject?.name,
        originalProjectName: originalProject?.name,
        ledgerResolved: !!ledgerEntry?.resolvedAt,
        ledgerRecoveredId: ledgerEntry?.recoveredProjectId,
      };
    });

    expect(result.message).toBeUndefined();
    expect(result.status).toBe('persisted-success');
    expect(result.recoveredTitle).toBe('[Recovered] Production Artwork');
    expect(result.recoveredProjectName).toBe('[Recovered] Production Artwork');
    expect(result.originalProjectName).toBe('Production Artwork');
    expect(result.ledgerResolved).toBe(true);
    expect(result.ledgerRecoveredId).toBe(result.recoveredProjectId);
  });
});
