import { test, expect } from '@playwright/test';

test.describe('Offline Capability & Status', () => {
  test('hydrates studio and displays offline status when disconnected', async ({ page }) => {
    await page.goto('/studio');
    await page.waitForLoadState('domcontentloaded');

    // Verify studio application is visible
    const stage = page.locator('div[role="application"]');
    await expect(stage).toBeVisible();
    await page.waitForTimeout(400);

    // Trigger offline status
    await page.evaluate(() => {
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
      window.dispatchEvent(new Event('offline'));
    });

    // Verify offline indicator appears
    const offlineIndicator = page.getByText(/Offline Mode \(IndexedDB Active\)/i);
    await expect(offlineIndicator).toBeVisible();

    // Restore online status
    await page.evaluate(() => {
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
      window.dispatchEvent(new Event('online'));
    });

    // Verify indicator disappears
    await expect(offlineIndicator).not.toBeVisible();
  });
});

