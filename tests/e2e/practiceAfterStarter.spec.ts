import { expect, test } from '@playwright/test';

// Opening a starter replaces the project without a new Studio lifecycle. Practice
// must still find that drawing's save session instead of asking the artist to
// "finish saving" a drawing they have just saved.
test.use({ viewport: { width: 1920, height: 1080 } });

test('a saved starter can go Home, into practice and back unchanged', async ({ page }) => {
  await page.goto('/studio?template=bun');
  const skip = page.getByRole('button', { name: 'Skip setup' });
  if (await skip.isVisible().catch(() => false)) await skip.click();
  const readout = page.getByTestId('canvas-readout');
  await expect(readout).toHaveAttribute('data-state', 'ready');
  await expect(page.getByTestId('canvas-readout-digest')).toHaveText('6af29269');

  await page.getByRole('button', { name: 'Save now' }).click();
  await page.getByRole('link', { name: /PIXIBUN STUDIO/ }).first().click();
  await page.getByRole('link', { name: /^Playground/ }).first().click();

  await expect(page.getByText('finish saving your drawing before starting practice')).toHaveCount(0);
  await page.getByRole('button', { name: /^Let.s start/ }).first().click({ timeout: 15_000 });
  await page.getByRole('button', { name: /^Trace it for me/ }).first().click();
  await page.getByRole('button', { name: /^Return to drawing/ }).first().click();

  await expect(readout).toHaveAttribute('data-state', 'ready', { timeout: 15_000 });
  await expect(page.getByTestId('canvas-readout-digest')).toHaveText('6af29269');
});
