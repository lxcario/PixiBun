import { test, expect, type Page } from '@playwright/test';

async function pixels(page: Page) {
  return page.getByTestId('main-composite-canvas').evaluate((canvas: HTMLCanvasElement) =>
    Array.from(canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data));
}
async function selectArtwork(page: Page) {
  await page.locator('#main-content').focus(); await page.keyboard.press('Control+d');
  await page.getByTestId('select-box-tool').click();
  const box = (await page.getByTestId('main-composite-canvas').boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.5 / 16, box.y + box.height * 0.5 / 16);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 15.5 / 16, box.y + box.height * 15.5 / 16, { steps: 8 });
  await page.mouse.up();
}

for (const action of ['Delete', 'Backspace', 'Control+x']) {
  test(`a locked selection refuses ${action} without changing pixels or adding an edit`, async ({ page }) => {
    await page.goto('/studio?template=bun');
    await expect(page.getByTestId('main-composite-canvas')).toHaveAttribute('width', '16');
    const skip = page.getByTestId('welcome-skip');
    if (await skip.isVisible()) await skip.click();
    await expect(page.getByTestId('select-box-tool')).toBeVisible();
    // A late onboarding mount must settle before any drawing gesture.
    try { await page.getByTestId('select-box-tool').click({ timeout: 3000 }); }
    catch (error) { if (!await skip.isVisible()) throw error; await skip.click(); }
    const before = await pixels(page);
    expect(before).toHaveLength(1024); expect(before.some((v, i) => i % 4 === 3 && v > 0)).toBe(true);
    await selectArtwork(page);
    await page.locator('#main-content').focus(); await page.keyboard.press(action);
    await expect.poll(() => pixels(page)).not.toEqual(before);
    await page.getByTestId('undo-button').click();
    await expect.poll(() => pixels(page)).toEqual(before);
    await selectArtwork(page);
    const lock = page.getByRole('button', { name: 'Lock layer Base Layer', exact: true });
    if (!await lock.isVisible()) await page.getByRole('button', { name: 'Layers', exact: true }).click();
    await lock.click();
    await expect(page.getByRole('button', { name: 'Unlock layer Base Layer', exact: true })).toBeVisible();
    await page.locator('#main-content').focus(); await page.keyboard.press(action);
    await expect(page.getByTestId('studio-toast')).toContainText('The active layer is locked');
    expect(await pixels(page)).toEqual(before);
    await expect(page.locator('[data-frame-card]')).toHaveCount(1);
    // The refusal adds no edit: Undo returns directly to the unlocked state.
    await page.getByTestId('undo-button').click();
    await expect(lock).toBeVisible();
    expect(await pixels(page)).toEqual(before);
    await page.locator('#main-content').focus(); await page.keyboard.press(action);
    await expect.poll(() => pixels(page)).not.toEqual(before);
  });
}
