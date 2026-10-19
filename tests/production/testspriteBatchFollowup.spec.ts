import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import type { ProjectFile } from '@/types/project';
import { readNativePng } from '../helpers/readNativePng';
import { chooseTool } from '../helpers/tools';

const pixels = (page: Page) => page.getByTestId('main-composite-canvas').evaluate((canvas: HTMLCanvasElement) =>
  [...canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data]);
const frame = (page: Page, index: number) => page.getByRole('button', { name: new RegExp(`^Select frame ${index + 1}\\.`) });
const hold = (page: Page) => page.getByRole('spinbutton', { name: 'Active frame duration in milliseconds', exact: true });
async function openBun(page: Page) {
  await page.goto('/studio?template=bun');
  const skip = page.getByTestId('welcome-skip'); if (await skip.isVisible()) await skip.click();
  await expect(page).not.toHaveURL(/template=/);
  await expect(page.locator('[data-restoration-phase]')).toHaveAttribute('data-restoration-phase', 'active');
  await expect.poll(async () => (await pixels(page)).filter((v, i) => i % 4 === 3 && v > 0).length).toBe(192);
  return pixels(page);
}
async function setHold(page: Page, value: number) {
  await hold(page).fill(String(value)); await hold(page).press('Tab'); await expect(hold(page)).toHaveValue(String(value));
}

test('one Undo and one Redo restore the last committed hold without changing another pose', async ({ page }) => {
  const before = await openBun(page); await setHold(page, 100);
  await page.getByRole('button', { name: 'Duplicate frame', exact: true }).click(); await setHold(page, 200);
  await frame(page, 0).click(); await setHold(page, 150);
  await page.getByRole('button', { name: 'Undo last action', exact: true }).click(); await expect(hold(page)).toHaveValue('100');
  await page.getByRole('button', { name: 'Redo last action', exact: true }).click(); await expect(hold(page)).toHaveValue('150');
  await expect.poll(() => pixels(page)).toEqual(before);
  await frame(page, 1).click(); await expect(hold(page)).toHaveValue('200');
  await expect(frame(page, 1)).toHaveAttribute('aria-current', 'true'); await expect.poll(() => pixels(page)).toEqual(before);
});

test('an actual held Shift and right-click set the other color without painting or changing the primary', async ({ page }) => {
  const before = await openBun(page);
  await page.getByTestId('toolbar-color-dock').getByRole('button', { name: /^Primary color / }).click();
  const colors = page.getByTestId('color-access-flyout');
  await colors.getByRole('button', { name: 'Palette color #ede8f4', exact: true }).click();
  await expect(colors.getByRole('textbox', { name: 'Primary hex value', exact: true })).toHaveValue(/^#ede8f4$/i);
  await colors.getByRole('button', { name: 'Palette color #ffffff', exact: true }).click({ modifiers: ['Shift'] });
  await expect(colors.getByRole('textbox', { name: 'Primary hex value', exact: true })).toHaveValue(/^#ede8f4$/i);
  await expect(colors.locator('[data-which="secondary"]')).toContainText('#FFFFFF');
  await colors.getByRole('button', { name: 'Palette color #c792df', exact: true }).click({ button: 'right' });
  await expect(colors.getByRole('textbox', { name: 'Primary hex value', exact: true })).toHaveValue(/^#ede8f4$/i);
  await expect(colors.locator('[data-which="secondary"]')).toContainText('#C792DF');
  await colors.getByRole('button', { name: 'Close color access', exact: true }).click();
  await expect.poll(() => pixels(page)).toEqual(before);
});

test('save and reload preserve each frame’s own layers rather than copying frame 2 assertions onto frame 1', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, 'showSaveFilePicker', { value: undefined, configurable: true }));
  const first = await openBun(page); await setHold(page, 100);
  await page.getByTestId('add-frame-button').click(); await setHold(page, 200);
  const empty = await pixels(page); expect(empty.every(value => value === 0)).toBe(true);
  await page.getByTestId('tab-layers').click(); await page.getByRole('button', { name: 'Add New Layer', exact: true }).click();
  await page.getByRole('button', { name: 'Select layer Layer 2. Double click to rename', exact: true }).dblclick();
  const name = page.getByRole('textbox', { name: 'Layer name', exact: true }); await name.fill('Blue Mark'); await name.press('Enter');
  await page.getByTestId('toolbar-color-dock').getByRole('button', { name: /^Primary color / }).click();
  const colors = page.getByTestId('color-access-flyout'), hex = colors.getByRole('textbox', { name: 'Primary hex value', exact: true });
  await hex.fill('#1D4ED8'); await hex.press('Enter'); await colors.getByRole('button', { name: 'Close color access', exact: true }).click();
  await chooseTool(page, 'pen'); const box = (await page.getByTestId('main-composite-canvas').boundingBox())!;
  await page.mouse.click(box.x + box.width * .5 / 16, box.y + box.height * .5 / 16);
  const second = [...empty]; second.splice(0, 4, 29, 78, 216, 255); await expect.poll(() => pixels(page)).toEqual(second);
  await page.getByTestId('save-button').click(); await expect(page.getByRole('status').filter({ hasText: /^Changes saved$/ })).toBeVisible();
  await page.reload(); await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible(); await page.getByTestId('tab-layers').click();
  await frame(page, 0).click(); await expect(hold(page)).toHaveValue('100'); await expect.poll(() => pixels(page)).toEqual(first);
  await expect(page.getByRole('button', { name: /^Select layer / })).toHaveCount(1);
  await frame(page, 1).click(); await expect(hold(page)).toHaveValue('200'); await expect.poll(() => pixels(page)).toEqual(second);
  await expect(page.getByRole('button', { name: /^Select layer / })).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'Select layer Blue Mark. Double click to rename', exact: true })).toBeVisible();
  await page.getByTestId('export-button').click(); await page.getByTestId('export-tab-project').click();
  const pending = page.waitForEvent('download'); await page.getByRole('button', { name: 'Download project backup', exact: true }).click();
  const file = await pending, actual = await file.path(); if (!actual) throw Error('Backup was not downloaded');
  const project: ProjectFile = JSON.parse((await readFile(actual)).toString());
  expect(project.frames.map(f => f.durationMs)).toEqual([100, 200]);
  expect(project.frames.map(f => f.layers.length)).toEqual([1, 2]);
  const blue = project.frames[1].layers.find(layer => layer.name === 'Blue Mark'); expect(blue).toBeDefined();
  expect(readNativePng(Buffer.from(blue!.pngBase64!, 'base64')).data).toEqual(second);
  expect(readNativePng(Buffer.from(project.frames[0].layers[0].pngBase64!, 'base64')).data).toEqual(first);
});

test('PNG scale admission distinguishes a safe 512px output from a refused 16384px output without changing artwork', async ({ page }) => {
  const original = await openBun(page);
  let downloads = 0; page.on('download', () => downloads++);
  await page.getByTestId('export-button').click();
  const panel = page.getByRole('dialog');
  await panel.getByRole('button', { name: '32x', exact: true }).click();
  await expect(panel).toContainText('512 × 512 px');
  await expect(panel.getByText('Canvas Safety Limit:', { exact: true })).toHaveCount(0);
  await panel.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect.poll(() => pixels(page)).toEqual(original);

  await page.getByTestId('file-menu-button').click(); await page.getByTestId('resize-canvas-button').click();
  const resize = page.getByRole('dialog', { name: 'Resize Canvas & Frame Bounds' });
  await resize.getByRole('spinbutton').first().fill('512');
  await expect(resize.getByRole('spinbutton').nth(1)).toHaveValue('512');
  await resize.getByRole('button', { name: 'Apply Resize', exact: true }).click();
  const canvas = page.getByTestId('main-composite-canvas');
  await expect(canvas).toHaveAttribute('width', '512'); await expect(canvas).toHaveAttribute('height', '512');
  const digest = () => canvas.evaluate(async (c: HTMLCanvasElement) => {
    const rgba = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
    return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', rgba)), b => b.toString(16).padStart(2, '0')).join('');
  });
  const before = await digest();
  await page.getByTestId('export-button').click();
  await expect(panel.getByRole('button', { name: '32x', exact: true })).toBeDisabled();
  await expect(panel.getByRole('button', { name: '32x', exact: true })).toHaveAttribute('title', /16384×16384px/);
  await expect(panel.getByRole('button', { name: '16x', exact: true })).toBeDisabled();
  await expect(panel.getByRole('button', { name: '8x', exact: true })).toBeEnabled();
  await expect(panel.getByText('Canvas Safety Limit:', { exact: true })).toBeVisible();
  await panel.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect.poll(digest).toBe(before); await expect(canvas).toHaveAttribute('width', '512');
  await expect(frame(page, 0)).toHaveAttribute('aria-current', 'true');
  expect(downloads).toBe(0);
});

test('cycle rate accepts its default and fractional Hz without a native step mismatch', async ({ page }, info) => {
  const before = await openBun(page);
  await page.getByRole('button', { name: 'Palette', exact: true }).click();
  const engine = page.getByRole('button', { name: 'Cycle Engine', exact: true });
  if (await engine.getAttribute('aria-expanded') === 'false') await engine.click();
  await page.getByRole('button', { name: 'Add Color Range Track', exact: true }).click();
  const track = page.getByRole('button', { name: 'Cycle 1', exact: true });
  if (await track.getAttribute('aria-expanded') === 'false') await track.click();
  const rate = page.getByRole('spinbutton', { name: 'Rate (Hz)', exact: true });
  await expect(rate).toHaveValue('6');
  const observed = [];
  for (const value of ['6', '5.5', '5.6']) {
    await rate.fill(value); await rate.press('Tab'); await expect(rate).toHaveValue(value);
    observed.push(await rate.evaluate((input: HTMLInputElement) => ({ value: input.value, valid: input.validity.valid, stepMismatch: input.validity.stepMismatch })));
  }
  await info.attach('actual-rate-validity.json', { body: Buffer.from(JSON.stringify({ browser: info.project.name, observations: observed })), contentType: 'application/json' });
  // Keep custom +/- at half a Hz while allowing typed fractional rates.
  await rate.fill('6'); await rate.press('Tab');
  await rate.locator('..').locator('..').getByRole('button', { name: 'Increase value', exact: true }).click();
  await expect(rate).toHaveValue('6.5');
  await rate.fill('100'); await rate.press('Tab'); await expect(rate).toHaveValue('60');
  await rate.fill('0'); await rate.press('Tab'); await expect(rate).toHaveValue('0.1');
  await page.getByRole('button', { name: 'Delete track', exact: true }).click();
  await expect.poll(() => pixels(page)).toEqual(before);
  expect(observed).toEqual(['6', '5.5', '5.6'].map(value => ({ value, valid: true, stepMismatch: false })));
});
