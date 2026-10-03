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
  await expect(page.locator('[data-restoration-phase]')).toHaveAttribute('data-restoration-phase', 'active');
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
  const canvasControls = header.getByRole('group', { name: 'Canvas controls', exact: true });
  await expect(page.getByTestId('import-button')).toHaveCount(0);
  const fileButton = project.getByTestId('file-menu-button');
  await fileButton.focus();
  await fileButton.press('ArrowDown');
  const file = page.getByRole('menu', { name: 'File', exact: true });
  await expect(file.getByRole('menuitem')).toHaveText(['Projects', 'New drawing', 'Import…', 'Canvas size…']);
  await expect(file.getByRole('menuitem', { name: 'Projects', exact: true })).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(file.getByTestId('new-drawing-button')).toBeFocused();
  await page.keyboard.press('End');
  await expect(file.getByTestId('resize-canvas-button')).toBeFocused();
  await page.keyboard.press('Home');
  await expect(file.getByTestId('gallery-button')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(fileButton).toBeFocused();
  await expect(file).toHaveCount(0);
  await fileButton.press('ArrowUp');
  await expect(file.getByTestId('resize-canvas-button')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(project.getByRole('button', { name: /^Rename project/ })).toBeFocused();
  await expect(file).toHaveCount(0);
  await expect(drawing.getByTestId('toggle-symmetry-h')).toHaveCount(0);
  await expect(canvasControls.getByTestId('toggle-symmetry-h')).toHaveAttribute('aria-pressed', 'false');
  await canvasControls.getByTestId('toggle-symmetry-h').hover();
  await canvasControls.getByTestId('toggle-symmetry-h').click();
  await expect(canvasControls.getByTestId('toggle-symmetry-h')).toHaveAttribute('aria-pressed', 'true');
  await canvasControls.getByTestId('toggle-symmetry-h').click();
  await page.getByTestId('save-button').focus();
  await page.mouse.move(0, 200);
  // Let both hover/focus delays elapse: neither may reopen a departed tooltip.
  await page.waitForTimeout(500);
  await expect(header.getByRole('tooltip')).toHaveCount(0);
  await expect(header.getByTestId('appearance-button')).toContainText('Studio');
  await expect(page.getByTestId('shortcuts-guide-button')).toHaveCount(0);
  expect(await header.locator('button').count()).toBe(15);

  // Rename through the real control; a long title must not push actions out of reach.
  await project.getByRole('button', { name: /^Rename project/ }).click();
  await project.getByRole('textbox').fill('A long sprite project name for header placement checks');
  await project.getByRole('textbox').press('Enter');
  for (const width of [1920, 1536, 1280, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    for (const tool of ['pen', 'eraser', 'bucket', 'erase-color', 'color-replace', 'curve', 'dither', 'line', 'isometric-line', 'rectangle', 'ellipse']) {
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
        return bounds.height === 48 && controls.every((box) => box.left >= bounds.left && box.right <= bounds.right && box.top >= bounds.top && box.bottom <= bounds.bottom && box.width >= 24 && box.height >= 24 && Math.abs((box.top + box.bottom) / 2 - (bounds.top + bounds.bottom) / 2) <= 1)
          && controls.every((box, index) => controls.slice(index + 1).every((other) => Math.min(box.right, other.right) - Math.max(box.left, other.left) <= 1 || Math.min(box.bottom, other.bottom) - Math.max(box.top, other.top) <= 1));
      }), `header control bounds and overlap at ${width}px with ${tool}`).toBe(true);
      expect(await canvasControls.evaluate((element) => {
        const mirror = element.querySelector('[aria-label="Mirror drawing"]')!.getBoundingClientRect();
        const zoom = element.querySelector('[aria-label="Zoom Out"]')!.getBoundingClientRect();
        const fit = element.querySelector('[data-testid="fit-canvas-button"]')!.getBoundingClientRect();
        const view = element.querySelector('[aria-label="View options menu"]')!.getBoundingClientRect();
        return [zoom, fit, view].every((box) => Math.abs(box.top - mirror.top) <= 1 && box.height === mirror.height)
          && zoom.left >= mirror.right && zoom.left - mirror.right <= 5
          && view.left >= fit.right && view.left - fit.right <= 5;
      }), `Mirror, Fit and View remain adjacent at ${width}px with ${tool}`).toBe(true);
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
  const studio = page.getByRole('dialog', { name: 'Studio options' });
  await expect(studio).toBeInViewport();
  await expect(studio.getByRole('button', { name: 'Co-Draw session' })).toBeFocused();
  await expect(studio.getByTestId('shortcuts-guide-button')).toHaveText('Help');
  const actions = await studio.getByRole('button', { name: 'Co-Draw session' }).boundingBox();
  const help = await studio.getByTestId('shortcuts-guide-button').boundingBox();
  expect(actions!.width).toBe(help!.width);
  expect(actions!.height).toBe(help!.height);
  await studio.getByRole('radio', { name: /Cozy Classic/ }).click();
  await expect(studio.getByRole('radio', { name: /Cozy Classic/ })).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(studio.getByRole('radio', { name: /Atelier/ })).toHaveAttribute('aria-checked', 'true');
  await expect(studio.getByRole('radio', { name: /Atelier/ })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(header.getByTestId('appearance-button')).toBeFocused();
  await header.getByRole('button', { name: 'View options menu', exact: true }).click();
  await expect(page.getByRole('region', { name: 'View options menu' })).toBeInViewport();
  await page.keyboard.press('Escape');
  await page.getByTestId('save-button').click();
  await expect(page.getByText('Saved on this device', { exact: true })).toHaveCount(0);
  await page.setViewportSize({ width: 1920, height: 900 });
  await page.mouse.move(0, 200);
  await header.screenshot({ path: test.info().outputPath('captures', 'header-one-row-1920.png') });
  await page.setViewportSize({ width: 1024, height: 900 });
  await header.screenshot({ path: test.info().outputPath('captures', 'header-one-row-1024.png') });
  await fileButton.click();
  await file.screenshot({ path: test.info().outputPath('captures', 'header-file-menu.png') });
  await file.getByTestId('resize-canvas-button').click();
  const resizeDialog = page.getByRole('dialog', { name: /Resize/ });
  await expect(resizeDialog).toBeVisible();
  await expect.poll(() => resizeDialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(resizeDialog).toBeHidden();
  await header.getByTestId('appearance-button').click();
  await studio.screenshot({ path: test.info().outputPath('captures', 'header-studio-options.png') });
  await studio.getByRole('button', { name: 'Co-Draw session' }).click();
  await expect(page.getByRole('dialog', { name: 'Peer-to-Peer Co-Draw' })).toBeVisible();
  await expect(studio).toHaveCount(0);
  await page.keyboard.press('Escape');
  await header.getByTestId('appearance-button').click();
  await studio.getByTestId('shortcuts-guide-button').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(studio).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.evaluate(() => (window as Window & { __studioStore?: { getState: () => { setActiveTool: (tool: string) => void } } }).__studioStore!.getState().setActiveTool('erase-color'));
  await expect(drawing.getByTestId('tool-options-rail')).toContainText('Erase-color:');
  await header.screenshot({ path: test.info().outputPath('captures', 'header-one-row-erase-color-1024.png') });
  await page.getByTestId('tool-options-button').click();
  await expect(page.getByRole('slider', { name: 'Erase Color tolerance' })).toBeInViewport();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('tool-options-button')).toBeFocused();
  await page.context().setOffline(true);
  await expect(header.getByRole('status')).toHaveText('Offline');
  expect(await header.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return Array.from(element.querySelectorAll('button')).filter((button) => button.getClientRects().length > 0).every((button) => {
      const box = button.getBoundingClientRect();
      return box.left >= bounds.left && box.right <= bounds.right && Math.abs((box.top + box.bottom) / 2 - (bounds.top + bounds.bottom) / 2) <= 1;
    });
  })).toBe(true);
  await page.context().setOffline(false);
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
