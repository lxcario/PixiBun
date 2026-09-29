import { expect, test } from '@playwright/test';

test('PixiTools starts with tasks and keeps expert browse available', async ({ page }, testInfo) => {
  await page.goto('/studio');
  await page.getByTestId('tab-ai').click();

  await expect(page.getByRole('heading', { name: 'What would you like to do?' })).toBeVisible();
  await expect(page.getByTestId('pixitools-task-lighting')).toBeVisible();
  await expect(page.getByTestId('pixitools-task-tileset')).toBeVisible();
  await expect(page.getByTestId('pixitools-task-polish')).toBeVisible();
  await expect(page.getByRole('button', { name: '3D Lighting & Shading (2.5D Photometric Studio)' })).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('pixitools-start.png') });

  const revision = await page.evaluate(() => (window as Window & { __studioStore?: { getState: () => { editRevision: number } } }).__studioStore!.getState().editRevision);
  await page.getByTestId('pixitools-task-tileset').click();
  await expect(page.getByRole('heading', { name: 'Build tiles and patterns' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Patterns & Tilesets' })).toBeVisible();
  await expect(page.getByRole('button', { name: '3D Lighting & Shading (2.5D Photometric Studio)' })).toHaveCount(0);
  expect(await page.evaluate(() => (window as Window & { __studioStore?: { getState: () => { editRevision: number } } }).__studioStore!.getState().editRevision)).toBe(revision);

  await page.getByRole('button', { name: 'Choose another task' }).click();
  await page.getByTestId('pixitools-task-lighting').click();
  await expect(page.getByRole('button', { name: '3D Lighting & Shading (2.5D Photometric Studio)' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Glow & Translucent Materials/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Rivet Stamp/ })).toHaveCount(0);
  await expect(page.getByText('Shading style')).toBeVisible();
  await expect(page.getByRole('button', { name: 'View Normals' })).toBeHidden();
  await page.getByText('More lighting actions').click();
  await expect(page.getByRole('button', { name: 'View Normals' })).toBeVisible();
  await page.getByText('More lighting actions').click();
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.screenshot({ path: testInfo.outputPath('pixitools-lighting-1024.png') });
  const inspectorOverflows = await page.getByTestId('right-inspector').evaluate((element) => element.scrollWidth > element.clientWidth + 1);
  expect(inspectorOverflows).toBe(false);
  await page.getByTestId('tab-layers').click();
  await page.getByTestId('tab-ai').click();
  await expect(page.getByRole('heading', { name: 'Add light and depth' })).toBeVisible();

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
