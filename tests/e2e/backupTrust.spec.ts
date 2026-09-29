import { expect, test } from '@playwright/test';

test('project backup explains local storage and stays open after picker cancellation', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'showOpenFilePicker', { configurable: true, value: async () => [] });
    Object.defineProperty(window, 'showSaveFilePicker', {
      configurable: true,
      value: async () => { throw new DOMException('Cancelled', 'AbortError'); },
    });
  });
  await page.goto('/studio');
  await expect(page.getByTestId('export-button')).toBeInViewport();
  await expect(page.getByText('Saved on this device', { exact: true })).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('studio-before-backup.png') });
  await page.setViewportSize({ width: 1024, height: 768 });
  await expect(page.getByTestId('export-button')).toBeInViewport();
  const headerOverflows = await page.locator('header[role="banner"]').evaluate((header) => {
    const bounds = header.getBoundingClientRect();
    return Array.from(header.children).some((child) => child.getBoundingClientRect().bottom > bounds.bottom + 1);
  });
  expect(headerOverflows).toBe(false);
  await page.screenshot({ path: testInfo.outputPath('studio-1024-before-backup.png') });

  await page.getByTestId('export-button').click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByTestId('export-tab-project').click();
  await expect(dialog.getByTestId('export-tab-project')).toHaveText('Project Backup');
  await expect(dialog.getByText('Keep a portable .pixibun copy outside this browser.')).toBeVisible();
  await dialog.screenshot({ path: testInfo.outputPath('project-backup.png') });

  await dialog.getByRole('button', { name: 'Download project backup' }).click();
  await expect(dialog.getByRole('alert')).toContainText('No backup was created');
  await expect(dialog).toBeVisible();

  await page.evaluate(() => {
    Object.defineProperty(window, 'showSaveFilePicker', {
      configurable: true,
      value: async () => ({ name: 'denied.pixibun', queryPermission: async () => 'denied' }),
    });
  });
  await dialog.getByRole('button', { name: 'Download project backup' }).click();
  await expect(dialog.getByRole('alert')).toContainText('Couldn’t create the project backup');
  await expect(dialog).toBeVisible();
});

test('project backup writes a complete file without changing local-save status', async ({ page }) => {
  await page.addInitScript(() => {
    const testWindow = window as typeof window & { __backupWrites: string[] };
    testWindow.__backupWrites = [];
    Object.defineProperty(window, 'showOpenFilePicker', { configurable: true, value: async () => [] });
    Object.defineProperty(window, 'showSaveFilePicker', {
      configurable: true,
      value: async () => ({
        name: 'untitled-sprite.pixibun',
        queryPermission: async () => 'granted',
        createWritable: async () => ({
          write: async (data: string) => { testWindow.__backupWrites.push(data); },
          close: async () => {},
        }),
      }),
    });
  });
  await page.goto('/studio');
  await page.getByTestId('export-button').click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByTestId('export-tab-project').click();
  await dialog.getByRole('button', { name: 'Download project backup' }).click();
  await expect(dialog).toHaveCount(0);
  const writes = await page.evaluate(() => (window as typeof window & { __backupWrites: string[] }).__backupWrites);
  expect(writes).toHaveLength(1);
  expect(JSON.parse(writes[0]).name).toBe('Untitled Sprite');
  await expect(page.getByText('Saved on this device', { exact: true })).toHaveCount(0);
});

test('Save now sits with project controls without a persistent local-save label', async ({ page }) => {
  await page.goto('/studio');
  await page.getByRole('button', { name: 'Save now' }).click();
  await expect(page.getByText('Saved on this device', { exact: true })).toHaveCount(0);
});

test('onion skin explains why no ghost is visible', async ({ page }) => {
  await page.goto('/studio');
  const onion = page.getByRole('button', { name: 'Onion Skin' });
  await expect(onion).toHaveAttribute('aria-pressed', 'false');
  await onion.click();
  await expect(onion).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('Add another frame to see neighboring drawings.')).toBeVisible();
  await page.getByTestId('add-frame-button').click();
  await expect(page.getByText('Add another frame to see neighboring drawings.')).toHaveCount(0);
  await page.getByRole('button', { name: 'Play', exact: true }).last().click();
  await expect(page.getByText('Pause to see onion skin while editing.')).toBeVisible();
});
