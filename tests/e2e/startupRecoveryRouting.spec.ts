import { test, expect } from '@playwright/test';

interface DexieLike {
  projects: {
    put: (item: unknown) => Promise<unknown>;
    get: (id: string) => Promise<unknown>;
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

test.describe('Startup Recovery Routing & Controlled Hydration (E2E)', () => {
  test('admits and restores a valid project on startup through authoritative boundary', async ({ page }) => {
    await page.goto('/studio');
    await page.waitForLoadState('domcontentloaded');

    const canvas = page.getByTestId('main-composite-canvas');
    await expect(canvas).toBeVisible();

    // Draw a pixel on the canvas
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);

    const getPixelData = () =>
      canvas.evaluate((element: HTMLCanvasElement) =>
        Array.from(element.getContext('2d')!.getImageData(0, 0, element.width, element.height).data)
      );

    await expect.poll(async () => (await getPixelData()).some((v, i) => i % 4 === 3 && v > 0)).toBe(true);
    const drawnPixels = await getPixelData();

    // Explicitly save the project
    await page.getByTestId('save-button').click();
    await expect(page.getByText(/Saved .* to browser storage/)).toBeVisible();

    // Reload page to trigger startup restore flow
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await expect(canvas).toBeVisible();

    // Verify canvas pixels are restored after reload
    await expect.poll(getPixelData).toEqual(drawnPixels);
  });

  test('routes damaged stored project to fresh workspace on startup and protects source in IndexedDB', async ({
    page,
  }) => {
    // Navigate to studio first so origin and IndexedDB are established
    await page.goto('/studio');
    await page.waitForLoadState('domcontentloaded');

    // Corrupt the stored project in real IndexedDB via Dexie instance
    const corruptProjectId = 'e2e-corrupt-project';
    await page.evaluate(async (projectId) => {
      const db = (window as unknown as { __pixibunDb: DexieLike }).__pixibunDb;

      const projectJson = {
        format: 'pixibun-project',
        version: 3,
        name: 'Damaged E2E Project',
        width: 32,
        height: 32,
        fps: 12,
        createdAt: Date.now() + 100000,
        updatedAt: Date.now() + 100000,
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
        palettes: [{ id: 'palette-default', name: 'Default', colors: ['#000', '#fff'] }],
        currentPaletteId: 'palette-default',
        clips: [],
        frames: [
          {
            id: 'frame-1',
            durationMs: 83,
            layers: [{ id: 'layer-1', name: 'Layer 1', visible: true, locked: false, opacity: 1, blendMode: 'source-over' }],
          },
        ],
      };

      await db.projects.put({
        id: projectId,
        name: 'Damaged E2E Project',
        width: 32,
        height: 32,
        fps: 12,
        createdAt: Date.now() + 100000,
        updatedAt: Date.now() + 100000,
        dataJson: JSON.stringify(projectJson),
        thumbnailDataUrl: '',
      });

      await db.layerBlobs.put({
        projectId,
        layerId: 'layer-1',
        frameIndex: 0,
        blob: new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x00, 0x00])], { type: 'image/png' }),
        updatedAt: Date.now() + 100000,
      });
    }, corruptProjectId);

    // Reload page so startup inspects the most recently updated project (our corrupted one)
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // Studio must display the safety warning indicating fresh workspace prepared
    await expect(
      page.getByText(/Saved workspace could not be validated or restored.*preserved for recovery/i)
    ).toBeVisible({ timeout: 10000 });

    // Verify canvas is usable in the fresh workspace
    const canvas = page.getByTestId('main-composite-canvas');
    await expect(canvas).toBeVisible();

    // Verify that the corrupt project record in IndexedDB was NOT overwritten or wiped
    const isSourcePreserved = await page.evaluate(async (projectId) => {
      const db = (window as unknown as { __pixibunDb: DexieLike }).__pixibunDb;
      const proj = await db.projects.get(projectId);
      const blobs = await db.layerBlobs.where('projectId').equals(projectId).toArray();
      return !!proj && blobs.length > 0;
    }, corruptProjectId);

    expect(isSourcePreserved).toBe(true);
  });

  test('gallery open of damaged project displays error and preserves current active workspace', async ({
    page,
  }) => {
    await page.goto('/studio');
    await page.waitForLoadState('domcontentloaded');

    const canvas = page.getByTestId('main-composite-canvas');
    await expect(canvas).toBeVisible();

    // Draw something in the current valid workspace
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);

    const getPixelData = () =>
      canvas.evaluate((element: HTMLCanvasElement) =>
        Array.from(element.getContext('2d')!.getImageData(0, 0, element.width, element.height).data)
      );
    await expect.poll(async () => (await getPixelData()).some((v, i) => i % 4 === 3 && v > 0)).toBe(true);
    const originalPixels = await getPixelData();

    // Seed a separate damaged project in IndexedDB
    const galleryDamagedId = 'e2e-gallery-damaged';
    await page.evaluate(async (projectId) => {
      const db = (window as unknown as { __pixibunDb: DexieLike }).__pixibunDb;

      const projectJson = {
        format: 'pixibun-project',
        version: 3,
        name: 'Damaged Gallery Target',
        width: 32,
        height: 32,
        fps: 12,
        createdAt: 1000,
        updatedAt: 1000,
        loopMode: 'repeat',
        onionSkin: { enabled: false, prevFrames: 1, nextFrames: 1, opacity: 0.35, prevColor: '#7fae6b', nextColor: '#c792df' },
        customRamps: [],
        palettes: [{ id: 'palette-default', name: 'Default', colors: ['#000', '#fff'] }],
        currentPaletteId: 'palette-default',
        clips: [],
        frames: [{ id: 'frame-1', durationMs: 83, layers: [{ id: 'layer-1', name: 'Layer 1', visible: true, locked: false, opacity: 1, blendMode: 'source-over' }] }],
      };

      await db.projects.put({
        id: projectId,
        name: 'Damaged Gallery Target',
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
        layerId: 'layer-1',
        frameIndex: 0,
        blob: new Blob([new Uint8Array([0x00, 0x00, 0x00])], { type: 'image/png' }),
        updatedAt: 1000,
      });
    }, galleryDamagedId);

    // Open Projects Gallery
    await page.getByTestId('file-menu-button').click();
    const projectsBtn = page.getByRole('menuitem', { name: 'Projects', exact: true });
    await expect(projectsBtn).toBeVisible();
    await projectsBtn.click();

    // Verify Gallery modal appears
    const modal = page.getByRole('dialog', { name: /Projects & Gallery/i });
    await expect(modal).toBeVisible();

    // Find and click the damaged project card
    const damagedCard = modal.getByText('Damaged Gallery Target');
    await expect(damagedCard).toBeVisible();
    await damagedCard.click();

    // Gallery surfaces error banner
    await expect(modal.getByText(/requires recovery and cannot be opened directly/i)).toBeVisible();

    // Close Gallery modal
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();

    // Original active workspace must remain intact with its pixels preserved
    await expect(canvas).toBeVisible();
    expect(await getPixelData()).toEqual(originalPixels);
  });

  test('header-valid but decode-invalid PNG blob passes admission probe but safely fails hydration in Chromium', async ({
    page,
  }) => {
    // 1. Establish initial valid studio state and draw pixels
    await page.goto('/studio');
    await page.waitForLoadState('domcontentloaded');

    const canvas = page.getByTestId('main-composite-canvas');
    await expect(canvas).toBeVisible();

    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);

    const getPixelData = () =>
      canvas.evaluate((element: HTMLCanvasElement) =>
        Array.from(element.getContext('2d')!.getImageData(0, 0, element.width, element.height).data)
      );
    await expect.poll(async () => (await getPixelData()).some((v, i) => i % 4 === 3 && v > 0)).toBe(true);
    const originalPixels = await getPixelData();

    // 2. Seed a project whose PNG has a valid 24-byte IHDR header (passes ImageHeaderProbe)
    // but truncated/corrupt remaining bytes (fails real Chromium createImageBitmap)
    const decodeFailProjectId = 'e2e-header-valid-decode-invalid';
    await page.evaluate(async (projectId) => {
      const db = (window as unknown as { __pixibunDb: DexieLike }).__pixibunDb;

      const projectJson = {
        format: 'pixibun-project',
        version: 3,
        name: 'Header Valid Decode Invalid Project',
        width: 32,
        height: 32,
        fps: 12,
        createdAt: 2000,
        updatedAt: 2000,
        loopMode: 'repeat',
        onionSkin: { enabled: false, prevFrames: 1, nextFrames: 1, opacity: 0.35, prevColor: '#7fae6b', nextColor: '#c792df' },
        customRamps: [],
        palettes: [{ id: 'palette-default', name: 'Default', colors: ['#000', '#fff'] }],
        currentPaletteId: 'palette-default',
        clips: [],
        frames: [{ id: 'frame-1', durationMs: 83, layers: [{ id: 'layer-1', name: 'Layer 1', visible: true, locked: false, opacity: 1, blendMode: 'source-over' }] }],
      };

      await db.projects.put({
        id: projectId,
        name: 'Header Valid Decode Invalid Project',
        width: 32,
        height: 32,
        fps: 12,
        createdAt: 2000,
        updatedAt: 2000,
        dataJson: JSON.stringify(projectJson),
        thumbnailDataUrl: '',
      });

      // Construct 34 bytes: valid 24-byte PNG header (8-byte magic + 4-byte len 13 + 'IHDR' + 32x32) + 10 corrupt bytes
      const bytes = new Uint8Array(34);
      bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
      bytes.set([0x00, 0x00, 0x00, 0x0d], 8);
      bytes.set([0x49, 0x48, 0x44, 0x52], 12);
      const view = new DataView(bytes.buffer);
      view.setUint32(16, 32, false);
      view.setUint32(20, 32, false);
      bytes.set([0x08, 0x06, 0x00, 0x00, 0x00, 0xde, 0xad, 0xbe, 0xef, 0x00], 24);

      await db.layerBlobs.put({
        projectId,
        layerId: 'layer-1',
        frameIndex: 0,
        blob: new Blob([bytes], { type: 'image/png' }),
        updatedAt: 2000,
      });
    }, decodeFailProjectId);

    // 3. Test Gallery open boundary:
    // User attempts to open the header-valid/body-invalid project via Gallery
    await page.getByTestId('file-menu-button').click();
    const projectsBtn = page.getByRole('menuitem', { name: 'Projects', exact: true });
    await projectsBtn.click();

    const modal = page.getByRole('dialog', { name: /Projects & Gallery/i });
    await expect(modal).toBeVisible();

    const targetCard = modal.getByText('Header Valid Decode Invalid Project');
    await expect(targetCard).toBeVisible();
    await targetCard.click();

    // Gallery surfaces hydration error banner
    await expect(modal.getByText(/Project could not be loaded into the workspace/i)).toBeVisible();

    // Close Gallery modal
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();

    // Current active workspace and its canvas pixels must remain completely intact
    await expect(canvas).toBeVisible();
    expect(await getPixelData()).toEqual(originalPixels);

    // 4. Test Startup boundary:
    // Update the decode-fail project's updatedAt to be latest so reload targets it
    await page.evaluate(async (projectId) => {
      const db = (window as unknown as { __pixibunDb: DexieLike }).__pixibunDb;
      const proj = (await db.projects.get(projectId)) as { updatedAt: number };
      if (proj) {
        proj.updatedAt = Date.now() + 500000;
        await db.projects.put(proj);
      }
    }, decodeFailProjectId);

    // Reload page to trigger startup restore flow targeting this project
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // Studio must display the safety warning indicating fresh workspace prepared
    await expect(
      page.getByText(/Saved workspace could not be validated or restored.*preserved for recovery/i)
    ).toBeVisible({ timeout: 10000 });

    // Verify canvas is usable and blank in the fresh workspace
    await expect(canvas).toBeVisible();

    // Verify the corrupt project record and blob bytes in IndexedDB remain unchanged
    const sourcePreserved = await page.evaluate(async (projectId) => {
      const db = (window as unknown as { __pixibunDb: DexieLike }).__pixibunDb;
      const proj = await db.projects.get(projectId);
      const blobs = (await db.layerBlobs.where('projectId').equals(projectId).toArray()) as { blob: Blob }[];
      return {
        hasProj: !!proj,
        blobCount: blobs.length,
        blobSize: blobs[0]?.blob?.size,
      };
    }, decodeFailProjectId);

    expect(sourcePreserved.hasProj).toBe(true);
    expect(sourcePreserved.blobCount).toBe(1);
    expect(sourcePreserved.blobSize).toBe(34);
  });
});
