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

test('project and drawing controls stay grouped, visible and usable at desktop widths', async ({ page }) => {
  await page.goto('/studio');
  const header = page.getByRole('banner');
  const project = header.getByRole('group', { name: 'Project controls', exact: true });
  const drawing = header.getByRole('group', { name: 'Drawing controls', exact: true });
  await expect(project.getByTestId('import-button')).toBeVisible();
  await expect(drawing.getByTestId('toggle-symmetry-h')).toHaveAttribute('aria-pressed', 'false');
  await drawing.getByTestId('toggle-symmetry-h').hover();
  await drawing.getByTestId('toggle-symmetry-h').click();
  await expect(drawing.getByTestId('toggle-symmetry-h')).toHaveAttribute('aria-pressed', 'true');
  await drawing.getByTestId('toggle-symmetry-h').click();
  await page.getByTestId('save-button').focus();
  await page.mouse.move(0, 200);
  // Let both hover/focus delays elapse: neither may reopen a departed tooltip.
  await page.waitForTimeout(500);
  await expect(header.getByRole('tooltip')).toHaveCount(0);
  await expect(header.getByTestId('appearance-button')).toHaveText('Theme');
  await expect(header.getByTestId('shortcuts-guide-button')).toHaveText('Help');

  // Rename through the real control; a long title must not push actions out of reach.
  await project.getByRole('button', { name: /^Rename project/ }).click();
  await project.getByRole('textbox').fill('A long sprite project name for header placement checks');
  await project.getByRole('textbox').press('Enter');
  for (const width of [1920, 1536, 1280, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    for (const tool of ['pen', 'bucket', 'erase-color']) {
      await page.evaluate((activeTool) => {
        const store = (window as Window & { __studioStore?: { getState: () => { setActiveTool: (tool: string) => void } } }).__studioStore!;
        store.getState().setActiveTool(activeTool);
      }, tool);
      await expect(drawing.getByTestId('tool-options-rail')).toContainText(tool === 'erase-color' ? 'Erase-color:' : `${tool.charAt(0).toUpperCase()}${tool.slice(1)}:`);
      await page.mouse.move(0, 200);
      await expect.poll(() => header.evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        const controls = Array.from(element.querySelectorAll<HTMLElement>('button, input:not([type="file"]), select, a'))
          .filter((control) => control.getClientRects().length > 0)
          .map((control) => control.getBoundingClientRect());
        return controls.every((box) => box.left >= bounds.left && box.right <= bounds.right && box.top >= bounds.top && box.bottom <= bounds.bottom && box.width >= 24 && box.height >= 24)
          && controls.every((box, index) => controls.slice(index + 1).every((other) => Math.min(box.right, other.right) - Math.max(box.left, other.left) <= 1 || Math.min(box.bottom, other.bottom) - Math.max(box.top, other.top) <= 1));
      }), `header control bounds and overlap at ${width}px with ${tool}`).toBe(true);
    }
  }

  // Menus must remain clickable below wrapped rows, rather than being clipped.
  await page.evaluate(() => (window as Window & { __studioStore?: { getState: () => { setActiveTool: (tool: string) => void } } }).__studioStore!.getState().setActiveTool('pen'));
  await header.getByRole('button', { name: /Brush size .* pixels/ }).click();
  const brushControls = page.getByRole('group', { name: 'Brush size controls' });
  await expect(brushControls).toBeInViewport();
  await brushControls.getByRole('button', { name: '4 pixel brush preset', exact: true }).click();
  await expect(header.getByRole('button', { name: 'Brush size 4 pixels' })).toBeVisible();
  await page.keyboard.press('Escape');
  await header.getByRole('button', { name: /Choose zoom level/ }).click();
  await page.getByRole('group', { name: 'Zoom levels' }).getByRole('button', { name: '200%', exact: true }).click();
  await expect(header.getByRole('button', { name: 'Zoom 200 percent. Choose zoom level' })).toBeVisible();
  await header.getByTestId('appearance-button').click();
  await expect(page.getByRole('dialog', { name: 'Appearance settings' })).toBeInViewport();
  await page.keyboard.press('Escape');
  await expect(header.getByTestId('appearance-button')).toBeFocused();
  await header.getByRole('button', { name: 'View options menu', exact: true }).click();
  await expect(page.getByRole('region', { name: 'View options menu' })).toBeInViewport();
  await page.keyboard.press('Escape');
  await page.getByTestId('save-button').click();
  await expect(page.getByText('Saved on this device', { exact: true })).toHaveCount(0);
  await page.setViewportSize({ width: 1920, height: 900 });
  await page.mouse.move(0, 200);
  await header.screenshot({ path: 'docs/research/evidence/2026-10-01/header-placement-1920.png' });
  await page.setViewportSize({ width: 1024, height: 900 });
  await header.screenshot({ path: 'docs/research/evidence/2026-10-01/header-placement-1024.png' });
  await page.evaluate(() => (window as Window & { __studioStore?: { getState: () => { setActiveTool: (tool: string) => void } } }).__studioStore!.getState().setActiveTool('erase-color'));
  await expect(drawing.getByTestId('tool-options-rail')).toContainText('Erase-color:');
  await header.screenshot({ path: 'docs/research/evidence/2026-10-01/header-placement-erase-color-1024.png' });
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
