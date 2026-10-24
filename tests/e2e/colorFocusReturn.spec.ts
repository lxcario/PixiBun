import { expect, test } from '@playwright/test';

for (const opener of ['primary', 'secondary', 'swatches'] as const) {
  test(`Colors returns Escape focus to its actual ${opener} opener without editing artwork`, async ({ page }) => {
    await page.goto('/studio?template=bun');
    const canvas = page.getByTestId('main-composite-canvas');
    await expect(canvas).toHaveAttribute('width', '16');
    await expect(canvas).toHaveAttribute('height', '16');
    const skip = page.getByTestId('welcome-skip');
    try { await page.getByTestId('pen-tool').click({ timeout: 3000 }); }
    catch (error) {
      if (!await skip.isVisible()) throw error;
      await skip.click();
      await page.getByTestId('pen-tool').click();
    }
    const pixels = () => canvas.evaluate((c: HTMLCanvasElement) => Array.from(c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data));
    const before = await pixels();
    expect(before).toHaveLength(1024);
    expect(before.some((value, index) => index % 4 === 3 && value !== 0)).toBe(true);
    const dock = page.getByTestId('toolbar-color-dock');
    const trigger = dock.getByRole('button', {
      name: opener === 'swatches' ? 'Quick Swatches Flyout' : new RegExp(`^${opener === 'primary' ? 'Primary' : 'Secondary'} color `),
      exact: opener === 'swatches',
    });
    await trigger.click();
    const flyout = page.getByRole('dialog', { name: 'Color quick access flyout', exact: true });
    const swatch = flyout.getByRole('button', { name: /^Palette color / }).first();
    await swatch.focus();
    await expect(swatch).toBeFocused();
    await swatch.press('Escape');
    await expect(flyout).toBeHidden();
    await expect(trigger).toBeFocused();
    expect(await pixels()).toEqual(before);
    await expect(page.locator('[data-frame-card]')).toHaveCount(1);
    await expect(page.getByTestId('canvas-readout-layers')).toHaveText('1');
  });
}
