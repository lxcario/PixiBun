import { expect, type Page } from '@playwright/test';
import { importGameDeliveryFixture } from './gameDeliveryFixture';
import { chooseTool } from './tools';

export const artwork = (page: Page) => page.getByTestId('main-composite-canvas').evaluate((canvas: HTMLCanvasElement) => Array.from(canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data));
export const viewPixels = (page: Page, label: string) => page.getByRole('img', { name: label, exact: true }).evaluate((canvas: HTMLCanvasElement) => Array.from(canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data));
export async function openResearch(page: Page) {
  await page.getByTestId('tab-ai').click();
  const choose = page.getByRole('button', { name: 'Choose another task' });
  await expect(choose.or(page.getByTestId('pixitools-task-research'))).toBeVisible();
  if (await choose.isVisible()) await choose.click();
  await page.getByTestId('pixitools-task-research').click();
}
export async function selectResearchWorkflow(page: Page, kind: string) {
  const names: Record<string, string> = { pixelize: 'Simplify', light: 'Light', scene: 'Tiles' };
  await page.getByRole('tab', { name: names[kind], exact: true }).click();
}
export async function openResearchOptions(page: Page) {
  // The initial worker result inserts the comparison above these controls. Wait
  // for that layout change before clicking, then verify the requested UI state.
  await expect(page.getByRole('tabpanel')).toHaveAttribute('aria-busy', 'false');
  const summary = page.locator('summary').filter({ hasText: /^More options$/ });
  const details = summary.locator('..');
  if (!await details.evaluate(element => (element as HTMLDetailsElement).open)) await summary.click();
  await expect(details).toHaveAttribute('open', '');
}
export async function preview(page: Page) {
  const action = page.getByRole('button', { name: 'Create research preview', exact: true });
  await expect(action).toBeEnabled();
  const worker = page.waitForEvent('worker'); await action.click();
  expect((await worker).url()).toContain('/_next/'); await expect(page.getByRole('img', { name: 'Research result', exact: true })).toBeVisible();
  await expect(page.getByRole('tabpanel')).toHaveAttribute('aria-busy', 'false');
}
export async function verifyResearchKeyboardWorkflow(page: Page) {
  await importGameDeliveryFixture(page); await openResearch(page);
  const simplify = page.getByRole('tab', { name: 'Simplify', exact: true });
  await simplify.focus(); await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Light', exact: true })).toBeFocused();
  await expect(page.getByRole('tabpanel', { name: 'Light', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create research preview', exact: true })).toBeEnabled();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Tiles', exact: true })).toBeFocused();
  await preview(page);
  const view = page.getByRole('combobox', { name: 'Scene preview cell' });
  await view.focus(); await page.keyboard.press('End');
  const count = await view.locator('option').count();
  await openResearchOptions(page);
  await expect(page.getByRole('combobox', { name: 'Pinned scene cell' })).toHaveValue(String(count - 1));
  await expect(page.getByText(`Scene cell ${count} selected.`, { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Tiles', exact: true }).focus(); await page.keyboard.press('Home');
  await expect(simplify).toBeFocused(); await preview(page);
  await openResearchOptions(page);
  await page.getByRole('combobox', { name: 'Simplification block size' }).selectOption('3');
  await expect(page.getByRole('button', { name: 'Apply research preview' })).toHaveCount(0);
  const actions = page.getByTestId('research-actions');
  await expect(actions.getByRole('button')).toHaveCount(1);
  const actionBox = (await actions.getByRole('button').boundingBox())!, barBox = (await actions.boundingBox())!;
  expect(Math.abs(actionBox.width - barBox.width)).toBeLessThan(1);
  await preview(page); await expect(page.getByRole('button', { name: 'Apply research preview' })).toBeDisabled();
  const outlines = page.getByRole('checkbox', { name: 'Keep outlines', exact: true });
  await outlines.focus(); await page.keyboard.press('Space'); await expect(outlines).not.toBeChecked();
  await preview(page); await expect(page.getByRole('button', { name: 'Apply research preview' })).toBeEnabled();
}
async function saveReload(page: Page) {
  await page.getByTestId('save-button').click();
  await expect(page.locator('[role="status"]').filter({ hasText: /Changes saved/ })).toBeVisible();
  await page.reload(); await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  await openResearch(page); await expect(page.getByText('Source pixels are current.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Load saved recipe' }).click();
  await openResearchOptions(page);
}
export async function verifyDetailWorkflow(page: Page) {
  await importGameDeliveryFixture(page); const before = await artwork(page); await openResearch(page);
  await openResearchOptions(page);
  await page.getByRole('combobox', { name: 'Simplification block size' }).selectOption('3');
  // This dense palette fixture has strong boundaries at every row. Explicitly opt out
  // before testing manual protected rectangles and applying a coarse result.
  await page.getByRole('checkbox', { name: 'Keep outlines', exact: true }).uncheck();
  await chooseTool(page, 'select-box'); const box = (await page.getByTestId('main-composite-canvas').boundingBox())!;
  await page.mouse.move(box.x + box.width * 17.5 / 32, box.y + box.height * 2.5 / 16); await page.mouse.down();
  await page.mouse.move(box.x + box.width * 20.5 / 32, box.y + box.height * 5.5 / 16, { steps: 3 }); await page.mouse.up();
  await page.getByRole('textbox', { name: 'Research detail name' }).fill('Tiny fabric detail');
  await page.getByRole('button', { name: 'Protect selected rectangle' }).click();
  await expect(page.getByText(/Tiny fabric detail \(/)).toBeVisible();
  await preview(page); expect(await artwork(page)).toEqual(before);
  const source = await viewPixels(page, 'Research source'), result = await viewPixels(page, 'Research result');
  for (let y = 2; y <= 5; y++) for (let x = 17; x <= 20; x++) { const p = (y * 32 + x) * 4; expect(result.slice(p, p + 4)).toEqual(source.slice(p, p + 4)); }
  await page.getByRole('combobox', { name: 'Research preview scale' }).selectOption('1');
  await expect(page.getByRole('img', { name: 'Research result', exact: true })).toHaveCSS('width', '32px');
  await page.getByRole('button', { name: 'Apply research preview' }).click(); await expect(page.getByText('Source pixels are current.', { exact: true })).toBeVisible();
  const applied = await artwork(page); expect(applied).not.toEqual(before);
  await page.getByTestId('undo-button').click(); await expect.poll(() => artwork(page)).toEqual(before);
  await page.getByTestId('redo-button').click(); await expect.poll(() => artwork(page)).toEqual(applied);
  await saveReload(page); await expect(page.getByRole('combobox', { name: 'Simplification block size' })).toHaveValue('3');
  await preview(page); expect(await viewPixels(page, 'Research result')).toEqual(result);
  // Reveal the retained original and verify a real edit before checking its fingerprint.
  await page.getByTestId('tab-layers').click(); await page.getByRole('button', { name: 'Select layer Color. Double click to rename', exact: true }).click();
  await page.getByRole('button', { name: 'Show layer Color', exact: true }).click();
  await page.getByRole('button', { name: 'Hide layer Detail study', exact: true }).click();
  await expect.poll(() => artwork(page)).toEqual(before);
  await page.keyboard.press('b'); const canvas = (await page.getByTestId('main-composite-canvas').boundingBox())!;
  await expect(page.getByTestId('pen-tool')).toHaveClass(/pixel-primary-btn/);
  await page.mouse.click(canvas.x + canvas.width * 0.1, canvas.y + canvas.height * 0.25);
  await expect.poll(() => artwork(page)).not.toEqual(before);
  await page.getByRole('button', { name: 'Hide layer Color', exact: true }).click();
  await page.getByRole('button', { name: 'Show layer Detail study', exact: true }).click();
  await page.getByRole('button', { name: 'Select layer Detail study. Double click to rename', exact: true }).click();
  await openResearch(page); await expect(page.getByText('Source changed: recompute this recipe.', { exact: true })).toBeVisible();
}
export async function verifyLightWorkflow(page: Page) {
  await importGameDeliveryFixture(page); const before = await artwork(page); await openResearch(page);
  await selectResearchWorkflow(page, 'light'); await openResearchOptions(page);
  await page.getByRole('spinbutton', { name: 'Shared light azimuth' }).fill('90');
  await page.getByRole('spinbutton', { name: 'Shared light height' }).fill('0');
  await page.getByRole('combobox', { name: 'Shared light material' }).selectOption('metal');
  await page.getByRole('checkbox', { name: /Use this rig across/ }).check();
  await preview(page); expect(await artwork(page)).toEqual(before);
  const first = await viewPixels(page, 'Research result');
  await page.getByRole('combobox', { name: 'Research preview pose' }).selectOption('1'); expect(await viewPixels(page, 'Research result')).not.toEqual(first);
  await page.getByRole('combobox', { name: 'Shared light preview output' }).selectOption('specular');
  expect((await viewPixels(page, 'Research result')).some((v, i) => i % 4 === 3 && v > 0)).toBe(true);
  await page.getByRole('combobox', { name: 'Shared light preview output' }).selectOption('shadow'); expect((await viewPixels(page, 'Research result')).every(v => v === 0)).toBe(true);
  await page.getByRole('button', { name: 'Apply research preview' }).click();
  await page.getByTestId('undo-button').click(); await expect.poll(() => artwork(page)).toEqual(before);
  await page.getByRole('button', { name: /Select frame 3/ }).click(); await page.getByTestId('tab-layers').click(); await expect(page.getByTestId('layers-stack-count')).toContainText('2');
  await page.getByTestId('redo-button').click(); await expect(page.getByTestId('layers-stack-count')).toContainText('3');
  await page.getByRole('button', { name: /Select frame 1/ }).click(); await openResearch(page);
  await saveReload(page); await preview(page); expect(await viewPixels(page, 'Research result')).toEqual(first);
}
export async function verifyOutlinedArtworkWorkflow(page: Page, screenshot?: (name: string) => Promise<void>) {
  await importGameDeliveryFixture(page, false, { outlined: true });
  // Hold only the first real worker dispatch to reproduce a click arriving while
  // an automatic refresh is pending, without replacing the worker or its results.
  await page.evaluate(() => {
    const send = Worker.prototype.postMessage;
    Worker.prototype.postMessage = function (...args: unknown[]) {
      Worker.prototype.postMessage = send;
      setTimeout(() => Reflect.apply(send, this, args), 1000);
    };
  });
  const before = await artwork(page); await openResearch(page);
  await expect(page.getByRole('button', { name: 'Cancel preview', exact: true })).toBeVisible();
  const refreshSlot = (await page.getByTestId('research-actions').getByRole('button').first().boundingBox())!;
  await page.mouse.click(refreshSlot.x + refreshSlot.width / 4, refreshSlot.y + refreshSlot.height / 2);
  const largeBlocks = page.getByRole('button', { name: '8px', exact: true });
  expect(await largeBlocks.evaluate(button => button.matches(':disabled'))).toBe(false);
  await largeBlocks.click(); await expect(largeBlocks).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('img', { name: 'Research result', exact: true })).toBeVisible();
  await expect(page.getByRole('tabpanel')).toHaveAttribute('aria-busy', 'false');
  expect(await viewPixels(page, 'Research result')).toEqual(before);
  await page.getByRole('button', { name: '8px', exact: true }).click();
  await preview(page);
  await expect(page.getByRole('checkbox', { name: 'Keep outlines', exact: true })).toBeChecked();
  expect(await viewPixels(page, 'Research result')).toEqual(before);
  await expect(page.getByRole('button', { name: 'Apply research preview' })).toBeDisabled();
  if (screenshot) await screenshot('outlined-simplification.png');
  await page.getByRole('checkbox', { name: 'Keep outlines', exact: true }).uncheck(); await preview(page);
  expect(await viewPixels(page, 'Research result')).not.toEqual(before);
  expect(await artwork(page)).toEqual(before);
  await selectResearchWorkflow(page, 'light'); await preview(page);
  await expect(page.getByText('Rounded shape estimated from your outline.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Light from right', exact: true }).click(); await preview(page);
  const right = await viewPixels(page, 'Research result'), at = (x: number, y: number) => (y * 32 + x) * 4;
  expect(right[at(23, 16)]).toBeGreaterThan(right[at(8, 16)]);
  await page.getByRole('button', { name: 'Light from left', exact: true }).click(); await preview(page);
  const left = await viewPixels(page, 'Research result');
  expect(left[at(23, 16)]).toBeLessThan(left[at(8, 16)]);
  for (let p = 3; p < before.length; p += 4) expect(left[p]).toBe(before[p]);
  expect(await artwork(page)).toEqual(before);
  if (screenshot) await screenshot('outlined-directional-light.png');
  await page.getByRole('button', { name: 'Apply research preview' }).click();
  await expect.poll(() => artwork(page)).toEqual(left);
  await page.getByTestId('undo-button').click(); await expect.poll(() => artwork(page)).toEqual(before);
  await page.getByTestId('redo-button').click(); await expect.poll(() => artwork(page)).toEqual(left);
  await saveReload(page); await expect(page.getByRole('combobox', { name: 'Light fallback shape' })).toHaveValue('rounded');
  await preview(page); expect(await viewPixels(page, 'Research result')).toEqual(left);
}
export async function verifySceneWorkflow(page: Page) {
  await importGameDeliveryFixture(page); const before = await artwork(page); await openResearch(page);
  await selectResearchWorkflow(page, 'scene'); await openResearchOptions(page);
  await page.getByRole('combobox', { name: 'Scene tile size' }).selectOption('16');
  await page.getByRole('combobox', { name: 'Scene walkable path' }).selectOption('horizontal');
  for (let tile = 0; tile < 2; tile++) { await page.getByRole('combobox', { name: 'Scene atlas tile' }).selectOption(String(tile)); await page.getByRole('textbox', { name: 'Tile east edge' }).fill('water'); }
  await page.getByRole('button', { name: 'Create research preview' }).click(); await expect(page.getByText(/Scene rules conflict near cell/)).toBeVisible(); expect(await artwork(page)).toEqual(before);
  for (let tile = 0; tile < 2; tile++) { await page.getByRole('combobox', { name: 'Scene atlas tile' }).selectOption(String(tile)); await page.getByRole('textbox', { name: 'Tile east edge' }).fill('ground'); }
  await page.getByRole('combobox', { name: 'Scene atlas tile' }).selectOption('1');
  await page.getByRole('button', { name: 'Pin chosen tile to cell' }).click(); await preview(page); expect(await artwork(page)).toEqual(before);
  await page.getByRole('button', { name: 'Move scene cursor East' }).click(); await expect(page.getByText('Scene cursor: column 2, row 1.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Move scene cursor South' }).click(); await expect(page.getByText('That scene cell is blocked.', { exact: true })).toBeVisible();
  await page.getByRole('checkbox', { name: 'Show border differences and scene cursor' }).uncheck(); const result = await viewPixels(page, 'Research result');
  await page.getByRole('button', { name: 'Apply research preview' }).click();
  await page.getByTestId('undo-button').click(); await expect.poll(() => artwork(page)).toEqual(before); await page.getByTestId('redo-button').click();
  await saveReload(page); await preview(page); await page.getByRole('checkbox', { name: 'Show border differences and scene cursor' }).uncheck(); expect(await viewPixels(page, 'Research result')).toEqual(result);
}
