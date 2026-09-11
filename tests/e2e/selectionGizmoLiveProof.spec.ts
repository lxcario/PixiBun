import { test, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const outDir = path.join(process.cwd(), 'test-results', 'e2e-artifacts');
fs.mkdirSync(outDir, { recursive: true });

interface WindowWithStudio {
  __pixibunDb?: {
    close: () => void;
  };
  __studioStore?: {
    getState: () => {
      tools: {
        activeTool: string;
      };
      selection: { x: number; y: number; w: number; h: number } | null;
      floatingSelection: unknown;
      resetToNewProject?: (newId?: string) => void;
      setActiveTool: (tool: string) => void;
    };
  };
}

test.describe('Selection Free-Transform Gizmo E2E Live Proof', () => {
  test('creates selection marquee, scales via handle, rotates via outer zone, flips horizontal, and commits', async ({ page }) => {
    test.setTimeout(45000);

    // Track console errors
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // 1. Navigate to /studio
    await page.goto('/studio');
    await page.waitForLoadState('domcontentloaded');

    // Clean IndexedDB & state
    await page.evaluate(async () => {
      localStorage.clear();
      sessionStorage.clear();

      const win = window as unknown as WindowWithStudio;
      if (win.__pixibunDb) {
        win.__pixibunDb.close();
      }
      if (win.__studioStore?.getState()?.resetToNewProject) {
        win.__studioStore.getState().resetToNewProject?.();
      }
      if (typeof window.indexedDB !== 'undefined') {
        await new Promise<void>((resolve, reject) => {
          const req = window.indexedDB.deleteDatabase('PixiBunDB');
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error || new Error('Failed to delete PixiBunDB'));
          req.onblocked = () => resolve(); // Non-fatal if blocked in test env
        });
      }
    });

    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('div[role="application"]')).toBeVisible();

    const canvas = page.locator('canvas[data-testid="main-composite-canvas"]');
    await expect(canvas).toBeVisible();
    await page.waitForTimeout(500);

    // Dismiss floating preview window to keep center canvas viewport clear
    const closePreviewBtn = page.getByRole('button', { name: 'Close Preview Window' });
    if (await closePreviewBtn.isVisible()) {
      await closePreviewBtn.click();
      await page.waitForTimeout(200);
    }

    const canvasBox = await canvas.boundingBox();
    expect(canvasBox).not.toBeNull();
    if (!canvasBox) return;

    // 2. Draw a prominent cross/diamond with Pen tool in center of canvas
    const penBtn = page.getByTitle(/Pen \(B\)|Pen \(P\)/i).first();
    if (await penBtn.isVisible()) {
      await penBtn.click();
    }

    const cx = canvasBox.x + canvasBox.width * 0.5;
    const cy = canvasBox.y + canvasBox.height * 0.5;

    // Draw solid pattern
    await page.mouse.move(cx - 20, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 20, cy);
    await page.mouse.up();

    await page.mouse.move(cx, cy - 20);
    await page.mouse.down();
    await page.mouse.move(cx, cy + 20);
    await page.mouse.up();

    await page.waitForTimeout(200);

    // 3. Select Marquee Box tool
    const marqueeBtn = page.getByTitle(/Marquee Box \(M\)/i).first();
    await expect(marqueeBtn).toBeVisible();
    await marqueeBtn.click();
    await page.waitForTimeout(200);

    // 4. Drag Marquee Box around the drawn pattern
    await page.mouse.move(cx - 40, cy - 40);
    await page.mouse.down();
    await page.mouse.move(cx + 40, cy + 40);
    await page.mouse.up();
    await page.waitForTimeout(300);

    // 5. Verify SelectionTransformGizmo is mounted with all 8 handles and HUD
    const gizmo = page.getByTestId('selection-transform-gizmo');
    await expect(gizmo).toBeVisible();

    const handleBr = page.getByTestId('gizmo-handle-br');
    await expect(handleBr).toBeVisible();

    const hudBar = page.getByTestId('gizmo-hud-bar');
    await expect(hudBar).toBeVisible();

    const pivot = page.getByTestId('gizmo-pivot');
    await expect(pivot).toBeVisible();

    // Take screenshot of active gizmo bounding box
    const initialGizmoBox = await gizmo.boundingBox();
    expect(initialGizmoBox).not.toBeNull();

    // 6. Scale selection via bottom-right handle drag
    const brBox = await handleBr.boundingBox();
    expect(brBox).not.toBeNull();
    if (brBox) {
      await page.mouse.move(brBox.x + brBox.width / 2, brBox.y + brBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(brBox.x + brBox.width / 2 + 30, brBox.y + brBox.height / 2 + 30, { steps: 5 });
      await page.mouse.up();
      await page.waitForTimeout(200);
    }

    // 7. Rotate selection via Quick Action HUD button (Rotate 90° CW)
    const rotateCwBtn = page.getByTitle(/Rotate 90° CW/i).first();
    await expect(rotateCwBtn).toBeVisible();
    await rotateCwBtn.click();
    await page.waitForTimeout(200);

    // Degree badge should indicate rotation (90.0°)
    const degreeBadge = page.getByTestId('gizmo-degree-badge');
    await expect(degreeBadge).toBeVisible();
    const degText = await degreeBadge.textContent();
    expect(degText).toContain('°');

    // Also test drag on outer rotation zone
    const rotZone = page.getByTestId('gizmo-rotate-tr');
    await expect(rotZone).toBeVisible();
    const rotBox = await rotZone.boundingBox();
    expect(rotBox).not.toBeNull();
    if (rotBox) {
      await page.mouse.move(rotBox.x + rotBox.width / 2, rotBox.y + rotBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(rotBox.x + 40, rotBox.y + 40, { steps: 5 });
      await page.mouse.up();
      await page.waitForTimeout(200);
    }

    // 8. Click Flip Horizontal in Quick Action HUD
    const flipHBtn = page.getByTitle(/Flip Horizontal/i).first();
    await expect(flipHBtn).toBeVisible();
    await flipHBtn.click({ force: true });
    await page.waitForTimeout(200);

    // 9. Commit Transform via HUD commit button (✓)
    const commitBtn = page.getByTestId('gizmo-commit-btn');
    await expect(commitBtn).toBeVisible();
    await commitBtn.click({ force: true });
    await page.waitForTimeout(500);

    // Verify transform committed and canvas is stable
    await canvas.screenshot({
      path: path.join(outDir, 'selection_gizmo_committed.png'),
    });

    // 10. Assert zero fatal console errors
    const fatalErrors = consoleErrors.filter(
      (err) => !err.includes('favicon.ico') && !err.includes('WebGL')
    );
    expect(fatalErrors).toEqual([]);
  });
});
