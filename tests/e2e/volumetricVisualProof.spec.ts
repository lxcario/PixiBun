import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Volumetric Optics Visual Proof', () => {
  test('renders green crystal with 3D volumetric facets and zero gray/purple corruption', async ({ page }) => {
    test.setTimeout(45000);
    await page.goto('/studio');
    await page.waitForLoadState('domcontentloaded');

    // Wait for canvas to be visible
    const canvas = page.locator('canvas[data-testid="main-composite-canvas"]');
    await expect(canvas).toBeVisible();
    await page.waitForTimeout(1000);

    // 1. Switch to Palette tab and pick green from Cozy Hearth 16
    const paletteTabBtn = page.getByRole('button', { name: /Palette/i });
    await expect(paletteTabBtn).toBeVisible();
    await paletteTabBtn.click();
    await page.waitForTimeout(300);

    const paletteSelect = page.locator('select[aria-label="Color palette preset"]');
    await paletteSelect.selectOption('cozy-hearth-16');
    await page.waitForTimeout(300);

    // Pick green swatch (#6eb257)
    const greenSwatch = page.locator('button[style*="rgb(110, 178, 87)"]').first();
    await expect(greenSwatch).toBeVisible();
    await greenSwatch.click();
    await page.waitForTimeout(200);

    // 2. Draw green crystal shape with mouse on canvas
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      const cx = box.x + box.width / 2;
      const cy = box.y + box.height / 2;

      // Draw thick X shape
      for (let offset = -8; offset <= 8; offset += 4) {
        await page.mouse.move(cx - 30 + offset, cy - 30);
        await page.mouse.down();
        await page.mouse.move(cx + 30 + offset, cy + 30);
        await page.mouse.up();

        await page.mouse.move(cx + 30 + offset, cy - 30);
        await page.mouse.down();
        await page.mouse.move(cx - 30 + offset, cy + 30);
        await page.mouse.up();
      }
    }

    await page.waitForTimeout(500);

    const artifactDir = 'C:\\Users\\Resque\\.gemini\\antigravity\\brain\\2d539d32-5f07-413a-8cbe-17b41101f3e4';
    const beforeShot = path.join(artifactDir, 'emerald_crystal_before.png');
    await canvas.screenshot({ path: beforeShot });

    // 3. Switch to PixiBud AI inspector tab
    const aiTabBtn = page.getByRole('button', { name: /PixiBud AI/i });
    await expect(aiTabBtn).toBeVisible();
    await aiTabBtn.click();
    await page.waitForTimeout(400);

    // Ensure "Snap to active palette" checkbox is unchecked by default
    const snapCheckbox = page.locator('input[type="checkbox"]').first();
    await expect(snapCheckbox).not.toBeChecked();

    // 4. Click "Render Volumetric Optics" button
    const renderBtn = page.getByRole('button', { name: /Render Volumetric Optics/i });
    await expect(renderBtn).toBeVisible();
    await renderBtn.click();

    // Wait for the optical layer rendering and composite
    await page.waitForTimeout(2000);

    const afterShot = path.join(artifactDir, 'emerald_crystal_after_optics.png');
    await canvas.screenshot({ path: afterShot });

    // 5. Inspect pixel colors to ensure NO gray (#DDDFDF) or purple (#C792DF) was introduced
    const colorAudit = await page.evaluate(() => {
      const cvs = document.querySelector('canvas[data-testid="main-composite-canvas"]') as HTMLCanvasElement;
      const ctx = cvs?.getContext('2d');
      if (!ctx) return { totalOpaque: 0, greenCount: 0, grayCount: 0, purpleCount: 0 };
      const img = ctx.getImageData(0, 0, cvs.width, cvs.height);
      const data = img.data;

      let totalOpaque = 0;
      let greenCount = 0;
      let grayCount = 0;
      let purpleCount = 0;

      for (let i = 0; i < data.length; i += 4) {
        const a = data[i + 3];
        if (a > 30) {
          totalOpaque++;
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // Emerald / green: green channel strictly dominates or matches primary green
          if (g > r && g > b) {
            greenCount++;
          }
          // Alabaster Gray: R ~ G ~ B ~ 220
          if (Math.abs(r - 221) < 8 && Math.abs(g - 223) < 8 && Math.abs(b - 223) < 8) {
            grayCount++;
          }
          // Wisteria Purple: R > 160, B > 180, G < 160
          if (r > 150 && b > 170 && g < 160) {
            purpleCount++;
          }
        }
      }
      return { totalOpaque, greenCount, grayCount, purpleCount };
    });

    expect(colorAudit.totalOpaque).toBeGreaterThanOrEqual(16);
    expect(colorAudit.greenCount).toBeGreaterThanOrEqual(12);
    expect(colorAudit.grayCount).toBe(0);
    expect(colorAudit.purpleCount).toBe(0);
  });
});
