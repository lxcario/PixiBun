import { expect, test, type Page } from '@playwright/test';
import type { StudioState } from '../../src/stores/studioStore';
type StudioWindow = Window & {
  __studioStore: { getState(): StudioState };
  __pixibunDb: {
    transaction: (...args: unknown[]) => Promise<unknown>;
    projects: { delete(id: string): Promise<void>; toArray(): Promise<Array<{ id: string; name: string; dataJson: string; storageVersion: string }>> };
  };
};
test.describe.configure({ timeout: 60000 });
function homeUrl() {
  const baseURL = test.info().project.use.baseURL;
  if (!baseURL) throw new Error('Practice navigation checks require a configured baseURL.');
  return new URL('/', baseURL).href;
}
const pixels = (page: Page) => page.getByTestId('main-composite-canvas').evaluate((canvas: HTMLCanvasElement) =>
  Array.from(canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data));
const metadata = (page: Page) => page.evaluate(() => {
  const state = (window as unknown as StudioWindow).__studioStore.getState();
  return {
    id: state.currentProjectId, name: state.projectName, width: state.canvasWidth, height: state.canvasHeight,
    fps: state.fps, frames: state.frames, clips: state.clips, palettes: state.palettes,
    currentPaletteId: state.currentPaletteId, onionSkin: state.onionSkin,
    activeLayerId: state.activeLayerId, activeFrameIndex: state.activeFrameIndex,
  };
});
async function originalDrawing(page: Page) {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto('/studio');
  await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  const canvas = page.getByTestId('main-composite-canvas');
  const box = (await canvas.boundingBox())!;
  await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.3);
  await page.mouse.click(box.x + box.width * 0.6, box.y + box.height * 0.6);
  await page.getByTestId('undo-button').click();
  await page.evaluate(() => {
    const state = (window as unknown as StudioWindow).__studioStore.getState();
    state.setProjectName('Original cozy drawing');
    state.setFps(17);
    state.setFrameDuration(0, 213, true);
    state.setOnionSkin({ enabled: false, opacity: 0.3 });
  });
  await expect(page.getByTestId('undo-button')).toBeEnabled();
  await expect(page.getByTestId('redo-button')).toBeEnabled();
  return { artwork: await pixels(page), metadata: await metadata(page) };
}
async function enterPractice(page: Page) {
  await page.getByTitle('Return to PixiBun Home', { exact: true }).click();
  await expect(page).toHaveURL(homeUrl());
  await page.getByRole('link', { name: 'Playground', exact: true }).click();
  await expect(page).toHaveURL(/\/playground$/, { timeout: 15000 });
  await expect(page.getByRole('button', { name: 'Return to drawing', exact: true })).toBeVisible();
}
async function trace(page: Page) {
  // Each lesson opens on its intro card.
  const start = page.getByRole('button', { name: "Let's start", exact: true });
  if (await start.isVisible()) await start.click();
  await page.getByRole('button', { name: 'Trace it for me', exact: true }).click();
  await expect.poll(async () => (await pixels(page)).some((value, index) => index % 4 === 3 && value > 0)).toBe(true);
}

test('lesson changes and Teaching Board edits preserve the original pixels, timing and undo/redo', async ({ page }, testInfo) => {
  const original = await originalDrawing(page);
  await enterPractice(page);
  expect((await metadata(page)).id).not.toBe(original.metadata.id);
  await trace(page);
  await page.getByRole('button', { name: /^Lesson /, exact: false }).click();
  await page.getByRole('dialog', { name: /Choose a lesson/ }).getByRole('button', { name: /^Potion Bubbles/ }).click();
  await trace(page);
  await page.getByTitle('Open 10-Frame Jump Anatomy Teaching Board', { exact: true }).first().click();
  await page.getByRole('button', { name: 'Load into Playground Timeline', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await metadata(page)).frames.length).toBe(10);
  await page.screenshot({ path: testInfo.outputPath('isolated-practice.png'), fullPage: true });
  await page.getByRole('button', { name: 'Return to drawing', exact: true }).click();
  await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  await expect.poll(() => pixels(page)).toEqual(original.artwork);
  expect(await metadata(page)).toEqual(original.metadata);
  await expect(page.getByTestId('undo-button')).toBeEnabled();
  await expect(page.getByTestId('redo-button')).toBeEnabled();
  await page.getByTestId('redo-button').click();
  await expect.poll(() => pixels(page)).not.toEqual(original.artwork);
  await page.getByTestId('undo-button').click();
  await expect.poll(() => pixels(page)).toEqual(original.artwork);
  await expect(page.getByTestId('redo-button')).toBeEnabled();
});

test('Home exit restores the original when Studio is opened again', async ({ page }) => {
  const original = await originalDrawing(page);
  await enterPractice(page); await trace(page);
  await page.getByTitle('Return to PixiBun Home', { exact: true }).click();
  await page.getByRole('navigation').getByRole('link', { name: 'Studio', exact: true }).click();
  await expect(page).toHaveURL(/\/studio$/, { timeout: 15000 });
  await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  await expect.poll(() => pixels(page)).toEqual(original.artwork);
  expect(await metadata(page)).toEqual(original.metadata);
  await expect(page.getByTestId('redo-button')).toBeEnabled();
});

test('refresh discards temporary practice and restores the saved original on return', async ({ page }) => {
  const original = await originalDrawing(page);
  await enterPractice(page); await trace(page);
  page.on('dialog', dialog => { void dialog.accept(); });
  await page.reload();
  await expect(page.getByRole('button', { name: 'Return to drawing', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Return to drawing', exact: true }).click();
  await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  await expect.poll(() => pixels(page)).toEqual(original.artwork);
  expect(await metadata(page)).toEqual(original.metadata);
});

test('Keep saves a new project and leaves the stored original unchanged', async ({ page }, testInfo) => {
  const original = await originalDrawing(page);
  await enterPractice(page); await trace(page);
  const practice = { artwork: await pixels(page), metadata: await metadata(page) };
  const before = await page.evaluate(async originalId => {
    const rows = await (window as unknown as StudioWindow).__pixibunDb.projects.toArray();
    return rows.find(row => row.id === originalId);
  }, original.metadata.id);
  await page.getByRole('button', { name: 'Keep practice in Studio', exact: true }).click();
  await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  await expect.poll(() => pixels(page)).toEqual(practice.artwork);
  expect((await metadata(page)).id).toBe(practice.metadata.id);
  const originalStored = await page.evaluate(async originalId => {
    const rows = await (window as unknown as StudioWindow).__pixibunDb.projects.toArray();
    return rows.find(row => row.id === originalId);
  }, original.metadata.id);
  expect(originalStored).toEqual(before);
  await expect(page.getByTestId('undo-button')).toBeEnabled();
  await page.screenshot({ path: testInfo.outputPath('kept-practice-new-project.png'), fullPage: true });
  await page.reload();
  await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  await expect.poll(() => pixels(page)).toEqual(practice.artwork);
  expect((await metadata(page)).id).toBe(practice.metadata.id);
});

test('checkpoint failure refuses practice and keeps unsaved original pixels on return', async ({ page }, testInfo) => {
  const original = await originalDrawing(page);
  await page.evaluate(() => {
    (window as unknown as StudioWindow).__pixibunDb.transaction = async () => { throw new Error('Simulated checkpoint failure'); };
    (window as unknown as StudioWindow).__studioStore.getState().setDirty(true);
  });
  await page.getByTitle('Return to PixiBun Home', { exact: true }).click();
  await page.getByRole('link', { name: 'Playground', exact: true }).click();
  await expect(page).toHaveURL(/\/playground$/, { timeout: 15000 });
  await expect(page.getByRole('status')).toContainText(/checkpoint failure|could not be saved/i);
  await expect(page.getByTestId('main-composite-canvas')).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('checkpoint-refused.png'), fullPage: true });
  await page.getByRole('link', { name: 'Return to drawing', exact: true }).click();
  await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  await expect.poll(() => pixels(page)).toEqual(original.artwork);
  expect(await metadata(page)).toEqual(original.metadata);
  await expect(page.getByTestId('redo-button')).toBeEnabled();
});

test('failed Keep stays in practice and Return restores the original', async ({ page }) => {
  const original = await originalDrawing(page);
  await enterPractice(page); await trace(page);
  await page.evaluate(() => {
    (window as unknown as StudioWindow).__pixibunDb.transaction = async () => { throw new Error('Simulated practice save failure'); };
  });
  await page.getByRole('button', { name: 'Keep practice in Studio', exact: true }).click();
  await expect(page.getByRole('status')).toContainText(/practice save failure|could not be saved/i);
  await expect(page).toHaveURL(/\/playground$/);
  await page.getByRole('button', { name: 'Return to drawing', exact: true }).click();
  await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  await expect.poll(() => pixels(page)).toEqual(original.artwork);
  expect(await metadata(page)).toEqual(original.metadata);
  await expect(page.getByTestId('redo-button')).toBeEnabled();
});

test('the old fromPlayground parameter cannot bypass saved-project restoration', async ({ page }) => {
  const original = await originalDrawing(page);
  await enterPractice(page); await trace(page);
  await page.getByRole('button', { name: 'Return to drawing', exact: true }).click();
  await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  await page.goto('/studio?fromPlayground=true');
  await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  await expect.poll(() => pixels(page)).toEqual(original.artwork);
  expect(await metadata(page)).toEqual(original.metadata);
});

test('returning during a delayed original save preserves RAM and waits for its confirmed version', async ({ page }) => {
  const original = await originalDrawing(page);
  await page.getByTitle('Return to PixiBun Home', { exact: true }).click();
  await expect(page).toHaveURL(homeUrl());
  await page.evaluate(() => {
    const runtime = window as unknown as StudioWindow & { __releaseCheckpoint?: () => void };
    const db = runtime.__pixibunDb;
    const transaction = db.transaction.bind(db);
    db.transaction = (...args) => new Promise(resolve => {
      runtime.__releaseCheckpoint = () => { db.transaction = transaction; resolve(transaction(...args)); };
    });
    runtime.__studioStore.getState().setDirty(true);
  });
  await page.getByRole('link', { name: 'Playground', exact: true }).click();
  await expect(page).toHaveURL(/\/playground$/, { timeout: 15000 });
  await expect(page.getByRole('status')).toContainText('Saving your drawing');
  await expect.poll(() => page.evaluate(() => typeof (window as unknown as { __releaseCheckpoint?: () => void }).__releaseCheckpoint)).toBe('function');
  await page.getByRole('link', { name: 'Return to drawing', exact: true }).click();
  await expect(page).toHaveURL(/\/studio$/);
  await expect(page.locator('[data-restoration-phase="loading"]')).toBeVisible();
  await page.evaluate(() => (window as unknown as { __releaseCheckpoint: () => void }).__releaseCheckpoint());
  await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  await expect.poll(() => pixels(page)).toEqual(original.artwork);
  expect(await metadata(page)).toEqual(original.metadata);
  await expect(page.getByTestId('redo-button')).toBeEnabled();
  await page.getByTestId('save-button').click();
  await expect(page.getByText('Saved', { exact: true }).first()).toBeVisible();
});

test('browser Back restores original drawing without adopting practice', async ({ page }) => {
  const original = await originalDrawing(page);
  await enterPractice(page); await trace(page);
  await page.goBack();
  await expect(page).toHaveURL(homeUrl());
  await page.getByRole('navigation').getByRole('link', { name: 'Studio', exact: true }).click();
  await expect(page).toHaveURL(/\/studio$/, { timeout: 15000 });
  await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  await expect.poll(() => pixels(page)).toEqual(original.artwork);
  expect(await metadata(page)).toEqual(original.metadata);
  await expect(page.getByTestId('redo-button')).toBeEnabled();
});

test('switching practice to Pocket restores original metadata and history', async ({ page }) => {
  const original = await originalDrawing(page);
  await enterPractice(page); await trace(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button', { name: 'Save PNG', exact: true })).toBeVisible();
  expect(await metadata(page)).toEqual(original.metadata);
  await page.getByRole('link', { name: 'Home', exact: true }).click();
  await expect(page).toHaveURL(homeUrl());
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.getByRole('navigation').getByRole('link', { name: 'Studio', exact: true }).click();
  await expect(page).toHaveURL(/\/studio$/, { timeout: 15000 });
  await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  await expect.poll(() => pixels(page)).toEqual(original.artwork);
});

test('a deleted original releases its return pointer so a new drawing can save and restore', async ({ page }) => {
  const original = await originalDrawing(page);
  await enterPractice(page); await trace(page);
  await page.evaluate(async originalId => {
    await (window as unknown as StudioWindow).__pixibunDb.projects.delete(originalId);
  }, original.metadata.id);
  page.on('dialog', dialog => { void dialog.accept(); });
  await page.reload();
  await expect(page.getByRole('button', { name: 'Return to drawing', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Return to drawing', exact: true }).click();
  await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  await expect(page.getByRole('alert').filter({ hasText: 'returning to is no longer available' })).toBeVisible();
  expect(await page.evaluate(() => sessionStorage.getItem('pixibun:practice-return-project'))).toBeNull();
  expect((await metadata(page)).id).not.toBe(original.metadata.id);
  const box = (await page.getByTestId('main-composite-canvas').boundingBox())!;
  await page.mouse.click(box.x + box.width * 0.4, box.y + box.height * 0.4);
  await page.getByTestId('save-button').click();
  await expect(page.getByText('Saved', { exact: true }).first()).toBeVisible();
  const replacement = { artwork: await pixels(page), metadata: await metadata(page) };
  await page.reload();
  await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  await expect.poll(() => pixels(page)).toEqual(replacement.artwork);
  expect(await metadata(page)).toEqual(replacement.metadata);
});
