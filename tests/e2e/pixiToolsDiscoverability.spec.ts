import { expect, test } from '@playwright/test';

test('PixiTools starts with tasks and keeps expert browse available', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    localStorage.setItem('pixibun:panel:lighting', 'closed');
    localStorage.setItem('pixibun:panel:normals', 'open');
    localStorage.setItem('pixibun:panel:shadows', 'open');
  });
  await page.goto('/studio');
  const canvas = page.getByTestId('main-composite-canvas');
  await expect(canvas).toBeVisible();
  const canvasBox = (await canvas.boundingBox())!;
  await page.mouse.click(canvasBox.x + canvasBox.width / 2, canvasBox.y + canvasBox.height / 2);
  await page.getByTestId('tab-ai').click();

  await expect(page.getByRole('heading', { name: 'What would you like to do?' })).toBeVisible();
  await expect(page.getByTestId('pixitools-task-lighting')).toBeVisible();
  await expect(page.getByTestId('pixitools-task-tileset')).toBeVisible();
  await expect(page.getByTestId('pixitools-task-polish')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Light your sprite' })).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('pixitools-start.png') });

  const revision = await page.evaluate(() => (window as Window & { __studioStore?: { getState: () => { editRevision: number } } }).__studioStore!.getState().editRevision);
  await page.getByTestId('pixitools-task-tileset').click();
  await expect(page.getByRole('heading', { name: 'Build tiles and patterns' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Patterns & Tilesets' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Light your sprite' })).toHaveCount(0);
  expect(await page.evaluate(() => (window as Window & { __studioStore?: { getState: () => { editRevision: number } } }).__studioStore!.getState().editRevision)).toBe(revision);

  await page.getByRole('button', { name: 'Choose another task' }).click();
  await page.getByTestId('pixitools-task-lighting').click();
  await expect(page.getByRole('button', { name: 'Light your sprite' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Light your sprite' })).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('button', { name: 'Shape the surface' })).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('button', { name: 'Add a shadow', exact: true })).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('button', { name: 'Preview lighting', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Glow & Translucent Materials/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Rivet Stamp/ })).toHaveCount(0);
  await expect(page.getByText('Shading style')).toBeVisible();
  await expect(page.getByRole('button', { name: 'View Normals' })).toBeHidden();
  await page.getByText('More lighting actions').click();
  await expect(page.getByRole('button', { name: 'View Normals' })).toBeVisible();
  await page.getByText('More lighting actions').click();
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.screenshot({ path: testInfo.outputPath('pixitools-lighting-1024.png') });
  await page.getByTestId('right-inspector').screenshot({ path: 'docs/research/evidence/2026-10-01/lighting-menu-ready.png' });
  const inspectorOverflows = await page.getByTestId('right-inspector').evaluate((element) => element.scrollWidth > element.clientWidth + 1);
  expect(inspectorOverflows).toBe(false);
  expect(await page.evaluate(() => (window as Window & { __studioStore?: { getState: () => { editRevision: number } } }).__studioStore!.getState().editRevision)).toBe(revision);
  const lightMenu = page.getByRole('button', { name: 'Light your sprite' });
  await lightMenu.focus();
  await page.keyboard.press('Enter');
  await expect(lightMenu).toHaveAttribute('aria-expanded', 'false');
  const menus = [lightMenu, page.getByRole('button', { name: 'Shape the surface' }), page.getByRole('button', { name: 'Add a shadow', exact: true })];
  const menuBoxes = await Promise.all(menus.map((menu) => menu.boundingBox()));
  expect(new Set(menuBoxes.map((box) => `${box!.x}:${box!.width}:${box!.height}`)).size).toBe(1);
  await page.getByTestId('save-button').focus();
  await page.mouse.move(0, 200);
  await page.getByTestId('right-inspector').screenshot({ path: 'docs/research/evidence/2026-10-01/lighting-menu-choices.png' });
  const beforeSurface = await canvas.evaluate((element: HTMLCanvasElement) => Array.from(element.getContext('2d')!.getImageData(0, 0, element.width, element.height).data));
  await menus[1].focus();
  await page.keyboard.press('Space');
  expect(await page.evaluate(() => (window as Window & { __studioStore?: { getState: () => { isPlaying: boolean } } }).__studioStore!.getState().isPlaying)).toBe(false);
  const paintSurface = page.getByRole('button', { name: 'Paint raised edges', exact: true });
  await expect(paintSurface).toBeDisabled();
  await page.getByTestId('create-surface-layer').click();
  await expect(paintSurface).toBeEnabled();
  await page.getByTestId('save-button').focus();
  await page.mouse.move(0, 200);
  await page.keyboard.press('Escape');
  await page.getByTestId('right-inspector').screenshot({ path: 'docs/research/evidence/2026-10-01/lighting-menu-surface.png' });
  expect(await canvas.evaluate((element: HTMLCanvasElement) => Array.from(element.getContext('2d')!.getImageData(0, 0, element.width, element.height).data))).toEqual(beforeSurface);
  await paintSurface.click();
  await expect(paintSurface).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Show surface directions' }).click();
  await expect(page.getByRole('button', { name: 'Hide surface directions' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Hide surface directions' }).click();
  await menus[1].click();
  await menus[2].click();
  const shadowStyles = page.getByRole('group', { name: 'Shadow projection style' });
  await shadowStyles.getByRole('button', { name: 'Under sprite' }).click();
  await expect(shadowStyles.getByRole('button', { name: 'Under sprite' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('A soft oval anchors your sprite to the ground.')).toBeVisible();
  await page.getByRole('button', { name: 'Analyze & Cast Shadow' }).scrollIntoViewIfNeeded();
  await page.mouse.move(0, 200);
  await page.keyboard.press('Escape');
  await page.getByTestId('right-inspector').screenshot({ path: 'docs/research/evidence/2026-10-01/lighting-menu-shadow.png' });
  await page.getByTestId('tab-layers').click();
  await page.getByTestId('tab-ai').click();
  await expect(page.getByRole('heading', { name: 'Add light and depth' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Light your sprite' })).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('button', { name: 'Add a shadow', exact: true })).toHaveAttribute('aria-expanded', 'true');

  await page.getByRole('button', { name: 'Choose another task' }).click();
  await page.getByTestId('pixitools-browse-all').click();
  await expect(page.getByRole('heading', { name: 'All PixiTools' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Pixel Cleanup & RotSprite (Atelier Assistants & Ramps)' })).toBeVisible();
});

test('47-blob contours preview before creating a generated layer', async ({ page }) => {
  await page.goto('/studio');
  const canvas = page.getByTestId('main-composite-canvas');
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);
  const layerCount = () => page.evaluate(() => {
    const state = (window as Window & { __studioStore?: { getState: () => { frames: Array<{ layers: unknown[] }>; activeFrameIndex: number } } }).__studioStore!.getState();
    return state.frames[state.activeFrameIndex].layers.length;
  });
  const beforeCount = await layerCount();

  await page.getByTestId('tab-ai').click();
  await page.getByTestId('pixitools-task-tileset').click();
  await page.getByRole('button', { name: 'Patterns & Tilesets' }).click();
  await page.getByRole('button', { name: 'Preview 47-blob contours' }).click();
  await expect(page.getByRole('img', { name: 'After contour thumbnail' })).toBeVisible();
  expect(await layerCount()).toBe(beforeCount);

  await page.getByRole('button', { name: 'Apply previewed 47-blob contours' }).click();
  await expect.poll(layerCount).toBe(beforeCount + 1);
});
