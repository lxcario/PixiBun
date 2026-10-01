import { test, expect } from '@playwright/test';

interface DexieLike {
  projects: {
    put: (item: unknown) => Promise<unknown>;
    get: (id: string) => Promise<unknown>;
    toArray: () => Promise<Array<{ id: string; name: string }>>;
  };
  layerBlobs: {
    put: (item: unknown) => Promise<unknown>;
    where: (key: string) => {
      equals: (val: string) => {
        toArray: () => Promise<unknown[]>;
      };
    };
  };
}

test.describe('Recovery UI, Safe Modes & Repair Wizard (E2E)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/studio');
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate(async () => {
      try {
        sessionStorage.clear();
        const db = (window as unknown as {
          __pixibunDb?: {
            projects: { clear: () => Promise<void> };
            layerBlobs: { clear: () => Promise<void> };
            recoveryRecords: { clear: () => Promise<void> };
          };
        }).__pixibunDb;
        if (db) {
          await db.projects.clear();
          await db.layerBlobs.clear();
          await db.recoveryRecords.clear();
        }
      } catch {
        // ignore
      }
    });
  });

  test('damaged stored project on startup routes to safe mode, displays recovery modal with deterministic plan, and commits recovered copy', async ({
    page,
  }) => {
    // 1. Establish session and IndexedDB
    await page.goto('/studio');
    await page.waitForLoadState('domcontentloaded');

    const corruptProjectId = 'e2e-startup-recovery-project';
    await page.evaluate(async (projectId) => {
      const db = (window as unknown as { __pixibunDb: DexieLike }).__pixibunDb;

      const projectJson = {
        format: 'pixibun-project',
        version: 3,
        name: 'Damaged Startup Sprite',
        width: 32,
        height: 32,
        fps: 12,
        createdAt: Date.now() + 50000,
        updatedAt: Date.now() + 50000,
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
        palettes: [{ id: 'palette-default', name: 'Default', colors: ['#000000', '#ffffff'] }],
        currentPaletteId: 'palette-default',
        clips: [],
        frames: [
          {
            id: 'frame-1',
            durationMs: 83,
            layers: [
              { id: 'layer-valid', name: 'Valid Layer', visible: true, locked: false, opacity: 1, blendMode: 'source-over' },
              { id: 'layer-corrupt', name: 'Corrupt Layer', visible: true, locked: false, opacity: 1, blendMode: 'source-over' },
            ],
          },
        ],
      };

      await db.projects.put({
        id: projectId,
        name: 'Damaged Startup Sprite',
        width: 32,
        height: 32,
        fps: 12,
        createdAt: Date.now() + 50000,
        updatedAt: Date.now() + 50000,
        dataJson: JSON.stringify(projectJson),
        thumbnailDataUrl: '',
      });

      // Valid 32x32 transparent PNG blob for layer-valid
      const canvas = document.createElement('canvas');
      canvas.width = 32;
      canvas.height = 32;
      const validBlob = await new Promise<Blob>((resolve) =>
        canvas.toBlob((b) => resolve(b!), 'image/png')
      );

      await db.layerBlobs.put({
        projectId,
        layerId: 'layer-valid',
        frameIndex: 0,
        blob: validBlob,
        updatedAt: Date.now() + 50000,
      });

      // Corrupt PNG blob (invalid magic header) for layer-corrupt
      await db.layerBlobs.put({
        projectId,
        layerId: 'layer-corrupt',
        frameIndex: 0,
        blob: new Blob([new Uint8Array([0x00, 0x00, 0x00, 0x00])], { type: 'image/png' }),
        updatedAt: Date.now() + 50000,
      });
    }, corruptProjectId);

    // 2. Reload to trigger startup inspection
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // 3. Recovery Modal should auto-open on startup
    await expect(page.getByText(/Project Recovery & Safe Mode/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Original Project Preserved Untouched')).toBeVisible();

    // 4. Inspect plan presentation:
    // Notice either it asks for additional deletion of the corrupt layer or shows ready plan omitting corrupt layer
    const deletionConsentBtn = page.getByRole('button', { name: /Accept Deletions & Continue/i });
    await expect(deletionConsentBtn).toBeVisible({ timeout: 10000 });
    await deletionConsentBtn.click();

    // Wait for diagnosing phase to finish and ready phase to appear
    const commitBtn = page.getByTestId('create-recovered-copy-button');
    await expect(commitBtn).toBeVisible({ timeout: 10000 });
    await expect(commitBtn).toBeDisabled();

    await expect(page.getByText(/\[Recovered\] Damaged Startup Sprite/i)).toBeVisible();

    const consentCheckbox = page.getByTestId('recovery-consent-checkbox');
    await consentCheckbox.check();
    await expect(commitBtn).toBeEnabled();

    // 5. Commit recovery copy
    await commitBtn.click();

    // Modal closes and success toast appears
    await expect(page.getByText(/Created recovered project copy/i)).toBeVisible({ timeout: 10000 });

    // 6. Source project custody verification: original damaged project in IndexedDB is 100% untouched
    const isSourceUntouched = await page.evaluate(async (projectId) => {
      const db = (window as unknown as { __pixibunDb: DexieLike }).__pixibunDb;
      const proj = await db.projects.get(projectId);
      const blobs = await db.layerBlobs.where('projectId').equals(projectId).toArray();
      return !!proj && blobs.length === 2;
    }, corruptProjectId);

    expect(isSourceUntouched).toBe(true);

    // 7. Verify new recovered project exists in IndexedDB and is active
    const recoveredProjects = await page.evaluate(async () => {
      const db = (window as unknown as { __pixibunDb: DexieLike }).__pixibunDb;
      const all = await db.projects.toArray();
      return all.filter((p) => p.name.includes('[Recovered]'));
    });
    expect(recoveredProjects.length).toBeGreaterThan(0);

    // Document title should include recovered name
    await expect(page).toHaveTitle(/\[Recovered\] Damaged Startup Sprite/);

    // Canvas is visible and usable
    const canvas = page.getByTestId('main-composite-canvas');
    await expect(canvas).toBeVisible();
  });

  test('cancelling recovery modal preserves current safe workspace and presents recovery banner', async ({
    page,
  }) => {
    await page.goto('/studio');
    await page.waitForLoadState('domcontentloaded');

    const corruptProjectId = 'e2e-dismiss-recovery-project';
    await page.evaluate(async (projectId) => {
      const db = (window as unknown as { __pixibunDb: DexieLike }).__pixibunDb;

      const projectJson = {
        format: 'pixibun-project',
        version: 3,
        name: 'Cancel Test Sprite',
        width: 32,
        height: 32,
        fps: 12,
        createdAt: Date.now() + 60000,
        updatedAt: Date.now() + 60000,
        loopMode: 'repeat',
        onionSkin: { enabled: false, prevFrames: 1, nextFrames: 1, opacity: 0.35, prevColor: '#7fae6b', nextColor: '#c792df' },
        customRamps: [],
        palettes: [{ id: 'palette-default', name: 'Default', colors: ['#000000', '#ffffff'] }],
        currentPaletteId: 'palette-default',
        clips: [],
        frames: [{ id: 'frame-1', durationMs: 83, layers: [{ id: 'l1', name: 'L1', visible: true, locked: false, opacity: 1, blendMode: 'source-over' }] }],
      };

      await db.projects.put({
        id: projectId,
        name: 'Cancel Test Sprite',
        width: 32,
        height: 32,
        fps: 12,
        createdAt: Date.now() + 60000,
        updatedAt: Date.now() + 60000,
        dataJson: JSON.stringify(projectJson),
        thumbnailDataUrl: '',
      });

      // Corrupt blob
      await db.layerBlobs.put({
        projectId,
        layerId: 'l1',
        frameIndex: 0,
        blob: new Blob([new Uint8Array([0x00, 0x00, 0x00, 0x00])], { type: 'image/png' }),
        updatedAt: Date.now() + 60000,
      });
    }, corruptProjectId);

    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // Recovery modal appears
    await expect(page.getByText(/Project Recovery & Safe Mode/i)).toBeVisible({ timeout: 10000 });

    // Click Cancel / Keep Editing
    const cancelBtn = page.getByRole('button', { name: /Cancel/i }).first();
    await cancelBtn.click();

    // Modal is dismissed, but safe recovery banner is visible
    await expect(page.getByTestId('pending-recovery-banner')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/A previous project requires safe recovery/i)).toBeVisible();

    // User can continue drawing in their clean workspace
    const canvas = page.getByTestId('main-composite-canvas');
    await expect(canvas).toBeVisible();

    // Clicking "Review Recovery Plan" re-opens the recovery modal
    await page.getByTestId('review-recovery-button').click();
    await expect(page.getByText(/Project Recovery & Safe Mode/i)).toBeVisible();

    // Close again
    await page.getByRole('button', { name: /Cancel/i }).first().click();
    await expect(page.getByTestId('pending-recovery-banner')).toBeVisible();

    // Dismissing banner removes it and clears sessionStorage
    await page.getByTestId('dismiss-recovery-button').click();
    await expect(page.getByTestId('pending-recovery-banner')).not.toBeVisible();

    const pendingSessionKey = await page.evaluate(() => {
      return sessionStorage.getItem('pixibun:pending-recovery-source');
    });
    expect(pendingSessionKey).toBeNull();
  });

  test('opening damaged project from gallery opens recovery modal while leaving active workspace intact', async ({
    page,
  }) => {
    await page.goto('/studio');
    await page.waitForLoadState('domcontentloaded');

    // 1. Draw something in the active workspace and explicitly save it so it's the latest project
    const canvas = page.getByTestId('main-composite-canvas');
    await expect(canvas).toBeVisible();
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);

    await page.getByTestId('save-button').click();
    await expect(page.getByText(/Saved .* to browser storage/)).toBeVisible();

    // 2. Seed a damaged project in IndexedDB that is NOT the latest (older timestamp 1000)
    const galleryDamagedId = 'e2e-gallery-damaged-project';
    await page.evaluate(async (projectId) => {
      const db = (window as unknown as { __pixibunDb: DexieLike }).__pixibunDb;

      const projectJson = {
        format: 'pixibun-project',
        version: 3,
        name: 'Gallery Damaged Project',
        width: 32,
        height: 32,
        fps: 12,
        createdAt: 1000,
        updatedAt: 1000,
        loopMode: 'repeat',
        onionSkin: { enabled: false, prevFrames: 1, nextFrames: 1, opacity: 0.35, prevColor: '#7fae6b', nextColor: '#c792df' },
        customRamps: [],
        palettes: [{ id: 'palette-default', name: 'Default', colors: ['#000000', '#ffffff'] }],
        currentPaletteId: 'palette-default',
        clips: [],
        frames: [{ id: 'frame-1', durationMs: 83, layers: [{ id: 'l1', name: 'L1', visible: true, locked: false, opacity: 1, blendMode: 'source-over' }] }],
      };

      await db.projects.put({
        id: projectId,
        name: 'Gallery Damaged Project',
        width: 32,
        height: 32,
        fps: 12,
        createdAt: 1000,
        updatedAt: 1000,
        dataJson: JSON.stringify(projectJson),
        thumbnailDataUrl: '',
      });

      await db.layerBlobs.put({
        projectId,
        layerId: 'l1',
        frameIndex: 0,
        blob: new Blob([new Uint8Array([0x00, 0x00, 0x00, 0x00])], { type: 'image/png' }),
        updatedAt: 1000,
      });
    }, galleryDamagedId);

    // 3. Open Gallery Modal
    await page.getByRole('button', { name: /Gallery/i }).click();
    const modal = page.getByRole('dialog', { name: /Atelier Projects & Gallery/i });
    await expect(modal).toBeVisible();

    // Click on Gallery Damaged Project card
    const projectCard = modal.getByRole('button', { name: /Open project Gallery Damaged Project/i });
    await expect(projectCard).toBeVisible();
    await projectCard.click();

    // Gallery surfaces error banner indicating recovery is required
    await expect(modal.getByText(/requires recovery and cannot be opened directly/i)).toBeVisible();

    // Close Gallery modal via Escape
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();

    // Recovery Modal opened directly with custody assurances
    await expect(page.getByText(/Project Recovery & Safe Mode/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Original Project Preserved Untouched')).toBeVisible();

    // Cancel recovery modal
    await page.getByRole('button', { name: /Cancel/i }).first().click();
    await expect(page.getByText(/Project Recovery & Safe Mode/i)).not.toBeVisible();

    // After cancelling, pending recovery banner appears at the top of the studio
    const banner = page.getByTestId('pending-recovery-banner');
    await expect(banner).toBeVisible();

    // Active project canvas should still be intact and visible
    await expect(canvas).toBeVisible();
  });
});
