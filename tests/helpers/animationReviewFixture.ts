import { expect, type Page } from '@playwright/test';

/** Original two-pose artwork, imported through the visible sprite-sheet workflow. */
export async function importAnimationReviewFixture(page: Page) {
  await page.goto('/studio');
  await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  const base64 = await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    for (let i = 0; i < 2; i++) {
      ctx.fillStyle = '#ffffff'; ctx.fillRect(i * 32 + 8 + i, 8, 8, 8);
      ctx.fillStyle = 'rgba(120,120,120,0.2)'; ctx.fillRect(i * 32 + 2, 2, 1, 1); ctx.fillRect(i * 32 + 6, 6, 1, 1);
    }
    ctx.fillStyle = '#ef497e'; ctx.fillRect(32 + 12, 11, 1, 1);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  await page.locator('input[type=file]').first().setInputFiles({ name: 'original-review-fixture.png', mimeType: 'image/png', buffer: Buffer.from(base64, 'base64') });
  const dialog = page.getByRole('dialog', { name: 'Import Image' });
  await dialog.getByRole('button', { name: 'Sprite Sheet Slicer' }).click();
  for (const [label, value] of [['Frame cell width in pixels', '32'], ['Frame cell height in pixels', '32'],
    ['Start X in pixels', '0'], ['Start Y in pixels', '0'], ['Gap X in pixels', '0'], ['Gap Y in pixels', '0']]) {
    await dialog.getByRole('spinbutton', { name: label }).fill(value);
  }
  await dialog.getByRole('button', { name: 'Replace Frames' }).click();
  await dialog.getByRole('button', { name: 'Slice & Import Frames' }).click(); await expect(dialog).toBeHidden();
  await expect.poll(() => page.getByTestId('main-composite-canvas').evaluate((canvas: HTMLCanvasElement) =>
    Array.from(canvas.getContext('2d')!.getImageData(2, 2, 1, 1).data))).toEqual([120, 120, 120, 51]);
  await page.getByTestId('tab-ai').click(); await page.getByTestId('pixitools-task-animation').click();
  await page.getByRole('button', { name: 'Create clip from all frames' }).click();
}
