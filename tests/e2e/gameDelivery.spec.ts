import { expect, test, type Page } from '@playwright/test';
import { mkdir, readFile } from 'node:fs/promises';
import { importGameDeliveryFixture } from '../helpers/gameDeliveryFixture';
import AxeBuilder from '@axe-core/playwright';
import { verifyAnimatedDownloadOrder } from '../helpers/gameAnimationDownload';
import { chooseTool } from '../helpers/tools';
const pixels = (page: Page) => page.getByTestId('main-composite-canvas').evaluate((c: HTMLCanvasElement) => Array.from(c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data));
test('animated downloads preserve reverse and bounce pose holds and play-once settings', async ({ page }) => {
  test.setTimeout(60_000);
  await verifyAnimatedDownloadOrder(page);
});
async function openKit(page: Page) {
  await page.getByTestId('export-button').click(); const dialog = page.getByRole('dialog');
  await dialog.getByTestId('export-tab-godot-kit').click(); return dialog;
}
test('game-kit live checks update when project layers change without toggling export options', async ({ page }) => {
  await importGameDeliveryFixture(page); const dialog = await openKit(page);
  await dialog.getByRole('checkbox', { name: 'Include normal-map atlas' }).check();
  await expect(dialog.getByText(/Normal maps: Verified/)).toBeVisible();
  await page.evaluate(() => {
    const store = (window as unknown as { __studioStore: { getState(): import('../../src/stores/studioStore').StudioState } }).__studioStore.getState();
    store.setLayerOpacity('fixture-normal-0', 0.5);
  });
  await expect(dialog.getByText(/Missing or invalid on frame\(s\): 1/)).toBeVisible();
  await expect(dialog.getByText(/Normal maps: Verified/)).toHaveCount(0);
  await page.evaluate(() => (window as unknown as { __studioStore: { getState(): import('../../src/stores/studioStore').StudioState } }).__studioStore.getState().setLayerOpacity('fixture-normal-0', 1));
  await expect(dialog.getByText(/Normal maps: Verified/)).toBeVisible();
});
test('native indexed normal kit downloads one ZIP, preserves source artwork and uses exact holds', async ({ page }) => {
  await importGameDeliveryFixture(page); const before = await pixels(page);
  const dialog = await openKit(page);
  await dialog.getByRole('checkbox', { name: 'Include indexed palette and runtime cycling' }).check();
  await dialog.getByRole('checkbox', { name: 'Include normal-map atlas' }).check();
  await dialog.getByRole('combobox', { name: 'Godot sprite anchor' }).selectOption('feet');
  const downloaded = page.waitForEvent('download'); await dialog.getByRole('button', { name: 'Download Godot kit' }).click();
  const download = await downloaded; expect(download.suggestedFilename()).toBe('phase_5_original_kit-godot-kit.zip');
  await mkdir('artifacts/phase5', { recursive: true }); await download.saveAs('artifacts/phase5/indexed-normal-kit.zip');
  const bytes = await readFile('artifacts/phase5/indexed-normal-kit.zip'); expect(bytes.readUInt32LE(0)).toBe(0x04034b50);
  await expect(dialog).toBeHidden(); expect(await pixels(page)).toEqual(before);
});
test('duplicate registers refuse indexed export and a color-only kit remains available', async ({ page }) => {
  await importGameDeliveryFixture(page, true); const before = await pixels(page), downloads: string[] = [];
  page.on('download', download => downloads.push(download.suggestedFilename()));
  const dialog = await openKit(page); await dialog.getByRole('checkbox', { name: 'Include indexed palette and runtime cycling' }).check();
  await dialog.getByRole('button', { name: 'Download Godot kit' }).click();
  await expect(dialog.getByRole('alert')).toContainText('duplicate palette registers'); expect(downloads).toEqual([]);
  await dialog.getByRole('checkbox', { name: 'Include indexed palette and runtime cycling' }).uncheck();
  const downloaded = page.waitForEvent('download'); await dialog.getByRole('button', { name: 'Download Godot kit' }).click();
  const download = await downloaded; await mkdir('artifacts/phase5', { recursive: true }); await download.saveAs('artifacts/phase5/color-only-kit.zip');
  expect(await pixels(page)).toEqual(before);
});
test('palette role saves undo, redo and reload without changing artwork', async ({ page }) => {
  await importGameDeliveryFixture(page); const before = await pixels(page);
  await page.getByTestId('tab-palette').click(); await page.getByText('Roles and index bindings', { exact: true }).click();
  await page.getByRole('combobox', { name: 'Semantic palette register' }).selectOption('255');
  await page.getByRole('textbox', { name: 'Palette role name' }).fill('water-light'); await page.getByRole('button', { name: 'Save palette role' }).click();
  await expect(page.getByText('Saved role: water-light')).toBeVisible();
  await page.getByTestId('undo-button').click(); await expect(page.getByText('Saved role: unnamed')).toBeVisible();
  await page.getByTestId('redo-button').click(); await expect(page.getByText('Saved role: water-light')).toBeVisible();
  expect(await pixels(page)).toEqual(before); await page.getByTestId('save-button').click();
  await expect(page.locator('[role="status"]').filter({ hasText: /Changes saved/ })).toBeVisible(); await page.reload();
  await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible(); await page.getByTestId('tab-palette').click();
  await page.getByText('Roles and index bindings', { exact: true }).click(); await page.getByRole('combobox', { name: 'Semantic palette register' }).selectOption('255');
  await expect(page.getByText('Saved role: water-light')).toBeVisible(); expect(await pixels(page)).toEqual(before);
});

test('visible selection bindings resolve duplicate register identity on every exported frame', async ({ page }) => {
  await importGameDeliveryFixture(page, true);
  const before: number[][] = [];
  for (let i = 1; i <= 3; i++) {
    await page.getByRole('button', { name: new RegExp(`^Select frame ${i}\\.`) }).click();
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    before.push(await pixels(page));
  }
  await page.getByTestId('tab-palette').click(); await page.getByText('Roles and index bindings', { exact: true }).click();
  await page.getByRole('combobox', { name: 'Semantic palette register' }).selectOption('255');
  await chooseTool(page, 'select-box');
  for (let i = 1; i <= 3; i++) {
    await page.getByRole('button', { name: new RegExp(`^Select frame ${i}\\.`) }).click();
    // A drag inside the previous marquee moves artwork. Start a new selection. Ctrl+D on the
    // focused frame card duplicates the frame, so deselect from the canvas area.
    await page.locator('#main-content').focus();
    await page.keyboard.press('Control+d');
    await expect.poll(() => page.evaluate(() => (window as unknown as { __studioStore: { getState(): import('../../src/stores/studioStore').StudioState } }).__studioStore.getState().selection)).toBeNull();
    const box = (await page.getByTestId('main-composite-canvas').boundingBox())!;
    await page.mouse.move(box.x + 1, box.y + 1); await page.mouse.down();
    await page.mouse.move(box.x + box.width - 1, box.y + box.height - 1, { steps: 3 }); await page.mouse.up();
    await page.getByRole('button', { name: 'Bind selection to register' }).click();
    await expect.poll(() => pixels(page)).toEqual(before[i - 1]);
  }
  await expect(page.getByText('3 saved index bindings')).toBeVisible();
  for (let i = 1; i <= 3; i++) {
    await page.getByRole('button', { name: new RegExp(`^Select frame ${i}\\.`) }).click();
    await expect.poll(() => pixels(page)).toEqual(before[i - 1]);
  }
  await page.getByRole('button', { name: /^Select frame 1\./ }).click();
  const dialog = await openKit(page); await dialog.getByRole('checkbox', { name: 'Include indexed palette and runtime cycling' }).check();
  const downloaded = page.waitForEvent('download'); await dialog.getByRole('button', { name: 'Download Godot kit' }).click();
  await (await downloaded).saveAs('artifacts/phase5/duplicate-bound-kit.zip');
});

test('new palette roles and game-kit controls remain accessible without inspector overflow', async ({ page }) => {
  await importGameDeliveryFixture(page); await page.setViewportSize({ width: 1024, height: 768 });
  await page.getByTestId('tab-palette').click(); await page.getByText('Roles and index bindings', { exact: true }).click();
  await page.getByRole('textbox', { name: 'Palette role name' }).fill('a'.repeat(64)); await page.getByRole('button', { name: 'Save palette role' }).click();
  expect(await page.getByTestId('right-inspector').evaluate(e => e.scrollWidth > e.clientWidth + 1)).toBe(false);
  expect((await new AxeBuilder({ page }).include('[data-testid="right-inspector"]').analyze()).violations).toEqual([]);
  const kit = await openKit(page);
  // Scan at rest: the dialog blooms and the Godot tab's controls fade in, and a
  // contrast check mid-fade reads their text as nearly the background colour.
  await expect(kit.getByRole('combobox', { name: 'Godot sprite anchor' })).toBeVisible();
  await kit.evaluate(element => Promise.all(element.getAnimations({ subtree: true })
    .filter(animation => animation.effect?.getComputedTiming().endTime !== Infinity)
    .map(animation => animation.finished.catch(() => undefined))));
  expect((await new AxeBuilder({ page }).include('dialog').analyze()).violations).toEqual([]);
});
