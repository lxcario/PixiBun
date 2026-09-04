import { test, expect } from '@playwright/test';

test.describe('Offline Capability & Status', () => {
  test('hydrates studio and displays offline status when disconnected', async ({ page }) => {
    await page.goto('/studio');
    await page.waitForLoadState('domcontentloaded');

    // Studio uygulamasının görünür olduğunu doğrula
    const stage = page.locator('div[role="application"]');
    await expect(stage).toBeVisible();
    await page.waitForTimeout(400);

    // Çevrimdışı durumunu tetikle
    await page.evaluate(() => {
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
      window.dispatchEvent(new Event('offline'));
    });

    // Offline göstergesinin belirdiğini doğrula
    const offlineIndicator = page.getByText(/Offline Mode \(IndexedDB Active\)/i);
    await expect(offlineIndicator).toBeVisible();

    // Tekrar çevrimiçi yap
    await page.evaluate(() => {
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
      window.dispatchEvent(new Event('online'));
    });

    // Göstergenin kaybolduğunu doğrula
    await expect(offlineIndicator).not.toBeVisible();
  });
});

