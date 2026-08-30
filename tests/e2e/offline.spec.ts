import { test, expect } from '@playwright/test';

test.describe('Offline Capability & Status', () => {
  test('displays offline status indicator when network is disconnected', async ({ context, page }) => {
    await page.goto('/studio');

    // Verify online initially
    const stage = page.locator('div[role="application"]');
    await expect(stage).toBeVisible();

    // Emulate network disconnection
    await context.setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));

    // Verify offline indicator appears
    const offlineIndicator = page.getByText(/Offline Mode \(IndexedDB Active\)/i);
    await expect(offlineIndicator).toBeVisible();

    // Reconnect network
    await context.setOffline(false);
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
    await expect(offlineIndicator).not.toBeVisible();
  });
});
