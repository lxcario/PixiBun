import { expect, test } from '@playwright/test';

test('project controls, pen size, zoom, and timeline work at desktop widths', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('/studio');
  await expect(page.getByTestId('file-menu-button')).toBeInViewport();
  await expect(page.getByTestId('new-drawing-button')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Save now' })).toBeInViewport();
  await expect(page.getByTestId('export-button')).toBeInViewport();
  await expect(page.getByTestId('project-backup-button')).toHaveCount(0);
  const firstFrame = page.getByRole('button', { name: /Select frame 1/ });
  await firstFrame.hover();
  const preview = page.getByRole('tooltip');
  await expect(preview).toBeVisible();
  expect((await preview.boundingBox())!.y).toBeLessThan((await firstFrame.boundingBox())!.y);

  await page.getByRole('button', { name: /Brush size 1 pixels/ }).click();
  await page.getByRole('button', { name: '8 pixel brush preset' }).click();
  await expect(page.getByRole('button', { name: /Brush size 8 pixels/ })).toBeVisible();

  await expect.poll(() => page.evaluate(() => Boolean((window as Window & { __studioStore?: unknown }).__studioStore))).toBe(true);
  await page.evaluate(() => {
    const state = (window as Window & { __studioStore?: { getState: () => { setCanvasSize: (width: number, height: number) => void } } }).__studioStore!.getState();
    state.setCanvasSize(2048, 2048);
  });
  await page.getByTestId('fit-canvas-button').click();
  const fittedZoom = await page.evaluate(() => (window as Window & { __studioStore?: { getState: () => { zoom: number } } }).__studioStore!.getState().zoom);
  expect(fittedZoom).toBeLessThan(100);

  await page.getByRole('button', { name: 'Preview speed' }).click();
  await expect(page.getByRole('group', { name: 'Preview speeds' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('preview-speed-menu.png') });
  await page.getByRole('button', { name: '2× preview speed' }).click();
  await expect(page.getByRole('button', { name: 'Preview speed' })).toContainText('2×');

  await page.getByRole('button', { name: 'Collapse Timeline' }).click();
  const compact = page.getByTestId('bottom-timeline-collapsed');
  await expect(compact).toBeVisible();
  for (const title of ['Previous Frame (,)', 'Play / Pause Animation (Space)', 'Next Frame (.)']) {
    expect((await compact.getByTitle(title).boundingBox())!.height).toBe(28);
  }
  await page.getByRole('button', { name: 'Expand Timeline' }).click();

  await page.setViewportSize({ width: 1920, height: 1080 });
  const header = page.locator('header[role="banner"]');
  const headerBounds = await header.boundingBox();
  const exportBounds = await page.getByTestId('export-button').boundingBox();
  expect(headerBounds).not.toBeNull();
  expect(exportBounds).not.toBeNull();
  expect(exportBounds!.x + exportBounds!.width).toBeLessThanOrEqual(headerBounds!.x + headerBounds!.width);
  expect(exportBounds!.y + exportBounds!.height).toBeLessThanOrEqual(headerBounds!.y + headerBounds!.height);
  await page.screenshot({ path: testInfo.outputPath('studio-wide.png') });
});

test('Ctrl+S saves locally without opening a project file picker', async ({ page }) => {
  await page.addInitScript(() => {
    const testWindow = window as typeof window & { __savePickerCalls: number };
    testWindow.__savePickerCalls = 0;
    Object.defineProperty(window, 'showSaveFilePicker', {
      configurable: true,
      value: async () => { testWindow.__savePickerCalls += 1; throw new DOMException('Cancelled', 'AbortError'); },
    });
  });
  await page.goto('/studio');
  await expect(page.locator('[data-restoration-phase]')).toHaveAttribute('data-restoration-phase', 'active');
  await page.keyboard.press('Control+s');
  await expect.poll(() => page.evaluate(() => document.querySelector('[role="status"]')?.textContent)).toContain('Changes saved');
  expect(await page.evaluate(() => (window as typeof window & { __savePickerCalls: number }).__savePickerCalls)).toBe(0);
});
