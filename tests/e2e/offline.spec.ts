import { test, expect } from '@playwright/test';

test.describe('Offline Capability & Status', () => {
  test('hydrates studio and displays offline status when disconnected', async ({ context, page }) => {
    await page.goto('/studio');
    await page.waitForLoadState('domcontentloaded');

    // Verify online initially and studio stage is visible
    const stage = page.locator('div[role="application"]');
    await expect(stage).toBeVisible();

    // Ensure service worker is fully activated and controlling the client
    await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        await navigator.serviceWorker.ready;
        if (!navigator.serviceWorker.controller) {
          await new Promise<void>((resolve) => {
            navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true });
            setTimeout(resolve, 500);
          });
        }
      }
    });

    // Allow precache & SWR caches to settle
    await page.waitForTimeout(300);

    // Emulate network disconnection
    await context.setOffline(true);

    // Reload the page while completely disconnected to test true SW cache hydration
    await page.reload({ waitUntil: 'domcontentloaded' });

    // Verify studio workbench hydrates from Service Worker cache
    await expect(page.locator('div[role="application"]')).toBeVisible();

    // Wait for React hydration and event listener attachment to settle
    await page.waitForTimeout(300);

    // Note: Playwright CDP context.setOffline(true) blocks network traffic to test SW cache hydration,
    // but does not dispatch window offline events. We dispatch the event to verify the UI indicator reacts.
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));
    const offlineIndicator = page.getByText(/Offline Mode \(IndexedDB Active\)/i);
    await expect(offlineIndicator).toBeVisible();

    // Reconnect network
    await context.setOffline(false);
    await page.evaluate(() => window.dispatchEvent(new Event('online')));

    // Verify offline indicator disappears upon reconnection
    await expect(offlineIndicator).not.toBeVisible();
  });
});

