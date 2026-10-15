import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

// Strategy Phase 2: the Light Sweep video.

test('Light Sweep saves a tall video of the lamp drifting over the drawing', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto('/studio?template=hearth-ghost');
  await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  await page.getByTestId('export-button').click();
  await page.getByTestId('export-tab-light-sweep').click();
  await expect(page.getByTestId('light-sweep-poster').locator('canvas')).toBeVisible({ timeout: 30_000 });
  const poster = await page.getByTestId('light-sweep-poster').locator('canvas').evaluate((canvas: HTMLCanvasElement) => [canvas.width, canvas.height]);
  expect(poster).toEqual([270, 480]);

  const download = page.waitForEvent('download', { timeout: 100_000 }).then(file => ({ file }), () => null);
  await page.getByRole('button', { name: 'Save video', exact: true }).click();
  const outcome = await Promise.race([download, page.getByTestId('light-sweep-export').getByRole('alert').waitFor({ timeout: 100_000 }).then(() => 'refused' as const)]);
  if (outcome === 'refused') {
    // A browser that can make neither MP4 nor WebM says so instead of saving a broken file.
    await expect(page.getByTestId('light-sweep-export').getByRole('alert')).toContainText('can’t make video files');
    return;
  }
  expect(outcome).not.toBeNull();
  const { file } = outcome!;
  const name = file.suggestedFilename();
  expect(name).toMatch(/^hearth-ghost-light-sweep\.(mp4|webm)$/);
  const bytes = readFileSync((await file.path())!);
  expect(bytes.length).toBeGreaterThan(10_000);
  if (name.endsWith('.mp4')) expect(bytes.subarray(4, 8).toString('latin1')).toBe('ftyp');
  else expect(bytes.subarray(0, 4).toString('hex')).toBe('1a45dfa3');
});
