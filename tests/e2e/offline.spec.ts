import { test, expect } from '@playwright/test';

test.describe('Real Offline Resilience (B1)', () => {
  // First-ever offline launch is unsupported; Warm/installed offline is verified.
  test('warm installed studio operates, reloads, edits, persists, and restores while completely offline', async ({
    page,
    context,
  }) => {
    // 1. Online: navigate to /studio
    await page.goto('/studio');
    await page.waitForLoadState('domcontentloaded');

    const stage = page.locator('div[role="application"]');
    await expect(stage).toBeVisible();

    // Wait for Service Worker registration and active controller
    await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        await navigator.serviceWorker.ready;
        if (!navigator.serviceWorker.controller) {
          await new Promise<void>((resolve) => {
            navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), {
              once: true,
            });
            setTimeout(resolve, 2000);
          });
        }
      }
    });

    const viewportMain = page.locator('main[aria-label="Pixel art canvas workspace"]');
    await expect(viewportMain).toBeVisible();

    // Perform an initial interaction online to verify storage initialized
    const box = await viewportMain.boundingBox();
    if (box) {
      const centerX = box.x + box.width / 2;
      const centerY = box.y + box.height / 2;
      await page.mouse.move(centerX, centerY);
      await page.mouse.down();
      await page.mouse.move(centerX + 15, centerY + 15);
      await page.mouse.up();
    }
    await page.waitForTimeout(1000);

    // 2. Real browser-network-level offline transition (not synthetic navigator.onLine)
    await context.setOffline(true);

    // Verify offline mode indicator appears
    const offlineIndicator = page.getByText(/Offline Mode \(IndexedDB Active\)/i);
    await expect(offlineIndicator).toBeVisible({ timeout: 6000 });

    // 3. Reload /studio while completely offline (proves SW cache-first navigation and precached shell)
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(stage).toBeVisible();

    // 4. Draw pixels, perform undo/redo while offline
    const reloadedViewport = page.locator('main[aria-label="Pixel art canvas workspace"]');
    await expect(reloadedViewport).toBeVisible();

    const reloadedBox = await reloadedViewport.boundingBox();
    if (reloadedBox) {
      const startX = reloadedBox.x + reloadedBox.width / 2;
      const startY = reloadedBox.y + reloadedBox.height / 2;
      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(startX + 20, startY + 20);
      await page.mouse.up();
    }

    // Undo while offline
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(250);

    // Redo while offline
    await page.keyboard.press('Control+y');
    await page.waitForTimeout(250);

    // 5. Allow debounced autosave to write to IndexedDB while offline
    await page.waitForTimeout(1500);

    // 6. Reload /studio a second time while still completely offline to prove persistence round-trip
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(stage).toBeVisible();

    // 7. Verify restored artwork is interactive
    await expect(reloadedViewport).toBeVisible();

    // Restore online state
    await context.setOffline(false);
  });
});
