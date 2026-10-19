import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import type { ProjectFile } from '@/types/project';
import { chooseTool } from '../helpers/tools';
import { readNativePng } from '../helpers/readNativePng';

// Reproduce the actions reported by the 19 October TestSprite PR batch.
// These independent checks complement the portal; they do not change its verdicts.
const raster = (page: Page) => page.getByTestId('main-composite-canvas').evaluate((canvas: HTMLCanvasElement) =>
  Array.from(canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data));
const card = (page: Page, index: number) => page.getByRole('button', { name: new RegExp(`^Select frame ${index + 1}\\.`) });
const hold = (page: Page) => page.getByRole('spinbutton', { name: 'Active frame duration in milliseconds', exact: true });

async function openBun(page: Page) {
  await page.goto('/studio?template=bun');
  await expect(page.getByTestId('main-composite-canvas')).toBeVisible();
  const skip = page.getByTestId('welcome-skip');
  if (await skip.isVisible()) await skip.click();
  // Visibility precedes asynchronous starter admission. Do not edit the previous workspace.
  await expect(page).not.toHaveURL(/template=/);
  await expect(page.locator('[data-restoration-phase]')).toHaveAttribute('data-restoration-phase', 'active');
  await expect.poll(async () => (await raster(page)).filter((value, index) => index % 4 === 3 && value > 0).length).toBe(192);
  return raster(page);
}

async function threeFrames(page: Page) {
  for (const duration of [100, 200, 300]) {
    if (duration !== 100) await page.getByRole('button', { name: 'Duplicate frame', exact: true }).click();
    await hold(page).fill(String(duration)); await hold(page).press('Tab');
    await expect(hold(page)).toHaveValue(String(duration));
  }
  await expect(page.locator('[data-frame-card]')).toHaveCount(3);
}

test('reported Outline failure requires an actual Undo and restores every native pixel', async ({ page }) => {
  const before = await openBun(page);
  await page.getByTestId('appearance-button').click();
  const lab = page.getByRole('checkbox', { name: 'Lab: Quick magic', exact: true });
  if (!await lab.isChecked()) await lab.locator('..').click();
  await expect(lab).toBeChecked();
  await page.getByRole('button', { name: 'Close studio options', exact: true }).click();
  await page.getByTestId('tab-ai').click();
  const gotIt = page.getByRole('button', { name: 'Got it', exact: true });
  if (await gotIt.isVisible()) await gotIt.click();
  await page.getByTestId('quick-magic-outline').click();
  await expect.poll(() => raster(page)).not.toEqual(before);
  const changed = await raster(page);
  await page.getByRole('button', { name: 'Undo last action', exact: true }).click();
  await expect.poll(() => raster(page)).toEqual(before);
  await page.getByRole('button', { name: 'Redo last action', exact: true }).click();
  await expect.poll(() => raster(page)).toEqual(changed);
});

test('reported frame recovery restores holds, selected pose and exact artwork after a real notice click', async ({ page }) => {
  const before = await openBun(page); await threeFrames(page);
  await card(page, 1).click();
  await page.getByRole('button', { name: 'Delete frame', exact: true }).click();
  await expect(page.locator('[data-frame-card]')).toHaveCount(2);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.locator('[data-frame-card]')).toHaveCount(3);
  await expect(card(page, 1)).toHaveAttribute('aria-current', 'true');
  for (let index = 0; index < 3; index++) {
    await card(page, index).click(); await expect(hold(page)).toHaveValue(String([100, 200, 300][index]));
    await expect.poll(() => raster(page)).toEqual(before);
  }
});

test('reported clip refusal shows feedback before later valid edits replace that checkpoint', async ({ page }) => {
  const before = await openBun(page); await threeFrames(page);
  await page.getByRole('button', { name: 'Clips', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Animation Tags & Clips', exact: true });
  await dialog.getByRole('textbox', { name: 'New tag name', exact: true }).fill('S4 Quiet Loop');
  await dialog.getByRole('spinbutton', { name: 'New tag end frame', exact: true }).fill('2');
  await dialog.getByRole('button', { name: 'Add Tag', exact: true }).click();
  const start = dialog.getByRole('spinbutton', { name: 'Start frame for tag S4 Quiet Loop', exact: true });
  const end = dialog.getByRole('spinbutton', { name: 'End frame for tag S4 Quiet Loop', exact: true });
  await start.fill('2'); await start.press('Tab'); await expect(end).toHaveValue('2');
  await end.fill('1'); await end.press('Tab');
  await expect(page.getByText('Clip frames must form a valid range within the animation.', { exact: true })).toBeVisible();
  await expect(start).toHaveValue('2'); await expect(end).toHaveValue('2');
  await start.fill('1'); await end.fill('3'); await end.press('Tab');
  await expect(start).toHaveValue('1'); await expect(end).toHaveValue('3');
  await dialog.getByRole('button', { name: 'Done', exact: true }).click();
  await expect.poll(() => raster(page)).toEqual(before);
});

test('reported missing cycle editor is reachable through its actual disclosure', async ({ page }) => {
  const before = await openBun(page);
  await page.getByRole('button', { name: 'Palette', exact: true }).click();
  const engine = page.getByRole('button', { name: 'Cycle Engine', exact: true });
  if (await engine.getAttribute('aria-expanded') === 'false') await engine.click();
  await page.getByRole('button', { name: 'Add Color Range Track', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Delete track', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Delete track', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Delete track', exact: true })).toHaveCount(0);
  await expect.poll(() => raster(page)).toEqual(before);
});

test('Dither stamps the active color and preserves skipped cells rather than inventing a second color', async ({ page }) => {
  const before = await openBun(page);
  await page.getByTestId('toolbar-color-dock').getByRole('button', { name: /^Primary color / }).click();
  const colors = page.getByTestId('color-access-flyout');
  await colors.getByRole('textbox', { name: 'Primary hex value', exact: true }).fill('#1D4ED8');
  await colors.getByRole('textbox', { name: 'Primary hex value', exact: true }).press('Enter');
  await colors.getByRole('button', { name: 'Close color access', exact: true }).click();
  await chooseTool(page, 'dither'); await page.getByTestId('tab-tools').click();
  await page.getByRole('combobox', { name: 'Tool panel dither pattern', exact: true }).selectOption('2x2');
  await expect(page.getByRole('slider', { name: 'Tool panel dither density', exact: true })).toHaveValue('0.5');
  const box = (await page.getByTestId('main-composite-canvas').boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.5 / 16, box.y + box.height * 0.5 / 16);
  await page.mouse.down(); await page.mouse.move(box.x + box.width * 15.5 / 16, box.y + box.height * 0.5 / 16, { steps: 30 }); await page.mouse.up();
  const expected = [...before];
  for (let column = 0; column < 16; column += 2) expected.splice(column * 4, 4, 29, 78, 216, 255);
  await expect.poll(() => raster(page)).toEqual(expected);
  await page.getByRole('button', { name: 'Undo last action', exact: true }).click();
  await expect.poll(() => raster(page)).toEqual(before);
});

test('actual browser-download backup decodes and reimports without claiming native-picker coverage', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, 'showSaveFilePicker', { value: undefined, configurable: true }));
  const before = await openBun(page);
  await page.getByTestId('export-button').click(); await page.getByTestId('export-tab-project').click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download project backup', exact: true }).click();
  const file = await pending, path = await file.path(); if (!path) throw new Error('No downloaded backup');
  const bytes = await readFile(path), project: ProjectFile = JSON.parse(bytes.toString());
  expect(project.frames).toHaveLength(1); expect(project.frames[0].layers).toHaveLength(1);
  expect(readNativePng(Buffer.from(project.frames[0].layers[0].pngBase64!, 'base64')).data).toEqual(before);
  await page.locator('input[type=file]').first().setInputFiles({ name: 'returned-bun.pixibun', mimeType: 'application/json', buffer: bytes });
  const importer = page.getByRole('dialog', { name: 'Import Project (.pixibun)', exact: true });
  await importer.getByRole('button', { name: 'Confirm Import', exact: true }).click(); await expect(importer).toBeHidden();
  await expect.poll(() => raster(page)).toEqual(before);
});

test('Shift+F10 opens quick tools only after the actual drawing workspace receives the key', async ({ page }) => {
  const before = await openBun(page);
  const workspace = page.locator('#center-canvas-area');
  await workspace.focus(); await workspace.press('Shift+F10');
  const menu = page.getByRole('dialog', { name: 'Canvas tools', exact: true });
  await expect(menu).toBeVisible();
  await expect(menu.getByRole('button', { name: 'Swap primary and secondary colors', exact: true })).toBeVisible();
  await menu.getByRole('button', { name: 'Eraser', exact: true }).click();
  await expect(menu).toHaveCount(0);
  await expect(page.getByTestId('eraser-tool')).toHaveAttribute('aria-pressed', 'true');
  await expect(workspace).toBeFocused();
  await workspace.press('Shift+F10'); await expect(menu).toBeVisible();
  await page.keyboard.press('Escape'); await expect(menu).toHaveCount(0);
  await expect(workspace).toBeFocused();
  expect(await raster(page)).toEqual(before);
});

test('selective high-contrast erase checks neighboring pixels before Undo and exact restoration afterward', async ({ page }) => {
  const before = await openBun(page);
  await page.getByTestId('toolbar-color-dock').getByRole('button', { name: /^Primary color / }).click();
  const colors = page.getByTestId('color-access-flyout');
  const hex = colors.getByRole('textbox', { name: 'Primary hex value', exact: true });
  await hex.fill('#1D4ED8'); await hex.press('Enter');
  await colors.getByRole('button', { name: 'Close color access', exact: true }).click();
  await chooseTool(page, 'pen');
  const box = (await page.getByTestId('main-composite-canvas').boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.5 / 16, box.y + box.height * 0.5 / 16);
  await page.mouse.down(); await page.mouse.move(box.x + box.width * 3.5 / 16, box.y + box.height * 0.5 / 16, { steps: 6 }); await page.mouse.up();
  const painted = [...before]; for (let x = 0; x < 4; x++) painted.splice(x * 4, 4, 29, 78, 216, 255);
  await expect.poll(() => raster(page)).toEqual(painted);
  await chooseTool(page, 'eraser');
  await page.mouse.click(box.x + box.width * 1.5 / 16, box.y + box.height * 0.5 / 16);
  const erased = [...painted]; erased.splice(4, 4, 0, 0, 0, 0);
  await expect.poll(() => raster(page)).toEqual(erased);
  await page.getByRole('button', { name: 'Undo last action', exact: true }).click();
  await expect.poll(() => raster(page)).toEqual(painted);
  await page.getByRole('button', { name: 'Redo last action', exact: true }).click();
  await expect.poll(() => raster(page)).toEqual(erased);
});

test('lesson gaps belong to an incomplete pose and the ghost does not paint the artwork', async ({ page }) => {
  await page.goto('/playground');
  await expect(page.getByTestId('main-composite-canvas')).toBeVisible();
  await page.getByRole('button', { name: "Let's start", exact: true }).click();
  const empty = await raster(page);
  await page.getByRole('button', { name: 'Trace it for me', exact: true }).click();
  await expect.poll(() => raster(page)).not.toEqual(empty);
  const target = await raster(page);
  await expect(page.getByText('Matched!', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: "What's missing?", exact: true })).toHaveCount(0);
  await page.locator('#center-canvas-area').focus(); await page.keyboard.press('Control+z');
  await expect.poll(() => raster(page)).toEqual(empty);
  // Derive a bounded partial tracing from the actual lesson raster, not a store write.
  const cells = target.map((value, index) => index % 4 === 3 && value > 0 ? (index - 3) / 4 : -1).filter(index => index >= 0);
  expect(cells.length).toBeGreaterThan(8);
  const canvas = page.getByTestId('main-composite-canvas');
  const width = await canvas.evaluate((element: HTMLCanvasElement) => element.width);
  const box = (await canvas.boundingBox())!;
  await page.keyboard.press('b');
  for (const cell of cells.slice(0, 4)) await page.mouse.click(box.x + box.width * (cell % width + 0.5) / width, box.y + box.height * (Math.floor(cell / width) + 0.5) / width);
  const gaps = page.getByRole('button', { name: "What's missing?", exact: true });
  await expect(gaps).toBeVisible(); const partial = await raster(page);
  await gaps.click();
  await expect.poll(() => page.getByTestId('playground-ghost-overlay').evaluate((element: HTMLCanvasElement) =>
    element.getContext('2d')!.getImageData(0, 0, element.width, element.height).data.some((value, index) => index % 4 === 3 && value > 0))).toBe(true);
  expect(await raster(page)).toEqual(partial);
  await page.getByRole('button', { name: 'Trace it for me', exact: true }).click();
  await expect(page.getByText('Matched!', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: "What's missing?", exact: true })).toHaveCount(0);
  await expect(page.getByRole('list', { name: 'Lesson steps' }).getByRole('button', { name: /^Frame 2:/ })).not.toHaveAccessibleName(/done/);
});
