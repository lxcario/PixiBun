import { openMotionCapture } from '../helpers/motion';
import { expect, test, type Page } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';

import { chooseTool } from '../helpers/tools';
const pixels = (page: Page, testId = 'main-composite-canvas') => page.getByTestId(testId).evaluate((canvas: HTMLCanvasElement) =>
  Array.from(canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data));

function translated(source: number[], dx: number) {
  const result = new Array<number>(source.length).fill(0);
  for (let y = 0; y < 32; y++) for (let x = 0; x + dx < 32; x++) {
    const src = (y * 32 + x) * 4, dst = (y * 32 + x + dx) * 4;
    for (let c = 0; c < 4; c++) result[dst + c] = source[src + c];
  }
  return result;
}

async function readyWithMark(page: Page) {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto('/studio'); await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  const canvas = page.getByTestId('main-composite-canvas'); const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.4); await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.4, { steps: 4 }); await page.mouse.up();
  await expect.poll(async () => (await pixels(page)).some((v, i) => i % 4 === 3 && v > 0)).toBe(true);
  return pixels(page);
}
async function capture(page: Page) {
  await page.locator('#center-canvas-area').focus(); await page.keyboard.press('Escape');
  const box = (await page.getByTestId('main-composite-canvas').boundingBox())!;
  await chooseTool(page, 'select-box');
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.2); await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.8, { steps: 4 }); await page.mouse.up();
  await page.getByTestId('tab-tools').click();
  await openMotionCapture(page); await page.getByTestId('create-motion-part-btn').click(); await expect(page.getByTestId('piximotion-panel')).toBeVisible();
}
async function setArc(page: Page) {
  const translation = page.getByRole('slider', { name: 'Pose translation X', exact: true }); await translation.focus();
  for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowRight'); await expect(translation).toHaveValue('4');
  const count = page.getByRole('slider', { name: 'Motion frame count', exact: true }); await count.focus();
  await page.keyboard.press('Home'); await page.keyboard.press('ArrowRight'); await expect(count).toHaveValue('3');
  await page.getByRole('combobox', { name: 'Motion easing', exact: true }).selectOption('linear');
}

async function saveRig(page: Page) {
  await page.getByRole('textbox', { name: 'Rig name', exact: true }).fill('Wave');
  await page.getByRole('button', { name: 'Save motion rig', exact: true }).click();
  await expect(page.getByTestId('motion-rig-library').getByRole('status')).toContainText('Motion rig ready');
  await page.getByRole('button', { name: 'Cancel (Escape)', exact: true }).click();
  await expect(page.getByTestId('piximotion-panel')).toBeHidden();
}
async function saveReload(page: Page) {
  await page.getByTestId('save-button').click();
  await expect(page.getByRole('status').filter({ hasText: /^Changes saved$/ })).toBeVisible();
  await page.reload(); await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  await page.getByTestId('tab-tools').click();
}

test('saved rigid-part poses survive a real project reload and reopen with exact source and translated pixels', async ({ page }) => {
  const original = await readyWithMark(page); await capture(page); await setArc(page); await saveRig(page); await saveReload(page);
  await expect.poll(() => pixels(page)).toEqual(original);
  await expect(page.getByTestId('piximotion-panel')).toHaveCount(0);
  await page.getByRole('button', { name: 'Open rig Wave', exact: true }).click();
  await expect(page.getByTestId('piximotion-panel')).toBeVisible();
  await expect(page.getByRole('slider', { name: 'Pose translation X', exact: true })).toHaveValue('4');
  await expect(page.getByRole('slider', { name: 'Motion frame count', exact: true })).toHaveValue('3');
  await expect(page.getByRole('combobox', { name: 'Motion easing', exact: true })).toHaveValue('linear');
  await expect.poll(() => pixels(page, 'piximotion-preview-canvas')).toEqual(translated(original, 4));
  await page.getByRole('button', { name: 'BAKE TO TIMELINE', exact: true }).click();
  await expect(page.getByRole('button', { name: /Select frame 3\./ })).toBeVisible();
  await expect.poll(() => pixels(page)).toEqual(translated(original, 4));
  await page.getByTestId('undo-button').click(); await expect.poll(() => pixels(page)).toEqual(original);
  await expect(page.getByRole('button', { name: /Select frame 2\./ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Open rig Wave', exact: true })).toBeVisible();
});

test('saved rig deletion is reversible and edited source is refused after save and reload without changing artwork', async ({ page }) => {
  await readyWithMark(page); await capture(page); await setArc(page); await saveRig(page);
  await page.getByRole('button', { name: 'Delete rig Wave', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Open rig Wave', exact: true })).toHaveCount(0);
  await page.getByTestId('undo-button').click(); await expect(page.getByRole('button', { name: 'Open rig Wave', exact: true })).toBeVisible();
  await page.getByTestId('redo-button').click(); await expect(page.getByRole('button', { name: 'Open rig Wave', exact: true })).toHaveCount(0);
  await page.getByTestId('undo-button').click();
  await page.locator('#center-canvas-area').focus(); await page.keyboard.press('Escape'); await page.keyboard.press('KeyB');
  const before = await pixels(page), box = (await page.getByTestId('main-composite-canvas').boundingBox())!;
  await page.mouse.click(box.x + box.width * 0.65, box.y + box.height * 0.6);
  await expect.poll(() => pixels(page)).not.toEqual(before);
  const changed = await pixels(page); await saveReload(page);
  await expect.poll(() => pixels(page)).toEqual(changed);
  await page.getByRole('button', { name: 'Open rig Wave', exact: true }).click();
  await expect(page.getByTestId('motion-rig-library').getByRole('status')).toContainText('saved source artwork changed');
  await expect(page.getByTestId('piximotion-panel')).toHaveCount(0);
  await expect(page.getByTestId('main-composite-canvas')).toHaveCSS('opacity', '1');
  await expect.poll(() => pixels(page)).toEqual(changed);
  await expect(page.getByRole('button', { name: /Select frame 2\./ })).toHaveCount(0);
});

test('opening a saved rig selects its source cel after a frame copy and cancellation restores that source display', async ({ page }) => {
  const original = await readyWithMark(page); await capture(page); await setArc(page); await saveRig(page);
  await page.locator('summary').filter({ hasText: 'Frame actions' }).click();
  await page.getByRole('button', { name: 'Duplicate frame', exact: true }).click();
  const first = page.getByRole('button', { name: /Select frame 1\./ }), second = page.getByRole('button', { name: /Select frame 2\./ });
  await expect(second).toHaveClass(/timeline-frame-active-bg/);
  await page.getByRole('button', { name: 'Open rig Wave', exact: true }).click();
  await expect(first).toHaveClass(/timeline-frame-active-bg/);
  await expect(page.getByRole('slider', { name: 'Pose translation X', exact: true })).toHaveValue('4');
  await expect.poll(() => pixels(page, 'piximotion-preview-canvas')).toEqual(translated(original, 4));
  await page.getByRole('button', { name: 'Cancel (Escape)', exact: true }).click();
  await expect.poll(() => pixels(page)).toEqual(original); await expect(first).toHaveClass(/timeline-frame-active-bg/);
});

test('floating artwork blocks saved-rig opening and fresh capture until its source pixels are restored', async ({ page }) => {
  const original = await readyWithMark(page); await capture(page); await setArc(page); await saveRig(page);
  const canvas = (await page.getByTestId('main-composite-canvas').boundingBox())!;
  const body = (await page.getByTestId('gizmo-translate-body').boundingBox())!;
  await page.mouse.move(body.x + body.width * 0.25, body.y + body.height * 0.3); await page.mouse.down();
  await page.mouse.move(body.x + body.width * 0.25 + canvas.width / 32, body.y + body.height * 0.3, { steps: 3 }); await page.mouse.up();
  await expect.poll(() => pixels(page)).not.toEqual(original);
  await expect(page.getByTestId('gizmo-commit-btn')).toBeVisible();
  const open = page.getByRole('button', { name: 'Open rig Wave', exact: true });
  await expect(open).toBeDisabled();
  await openMotionCapture(page); await page.getByTestId('create-motion-part-btn').click();
  await expect(page.getByText('Commit or cancel the floating selection before creating a motion part.', { exact: true })).toBeVisible();
  await expect(page.getByTestId('piximotion-panel')).toHaveCount(0);
  await page.getByTestId('gizmo-cancel-btn').click();
  await expect(open).toBeEnabled(); await expect.poll(() => pixels(page)).toEqual(original);
  await open.click(); await expect(page.getByTestId('piximotion-panel')).toBeVisible();
  await expect.poll(() => pixels(page, 'piximotion-preview-canvas')).toEqual(translated(original, 4));
});

test('a portable backup preserves editable rig IDs and poses and imports with matching source pixels', async ({ page }, info) => {
  await page.addInitScript(() => { Object.defineProperty(window, 'showSaveFilePicker', { value: undefined, configurable: true }); });
  const original = await readyWithMark(page); await capture(page); await setArc(page); await saveRig(page);
  await page.getByTestId('export-button').click(); await page.getByTestId('export-tab-project').click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download project backup', exact: true }).click();
  const path = await (await download).path(); expect(path).toBeTruthy();
  const raw = await readFile(path!, 'utf8'), file = JSON.parse(raw);
  expect(file.version).toBe(4); expect(file.motionRigs).toHaveLength(1);
  const rig = file.motionRigs[0]; expect(rig.name).toBe('Wave'); expect(rig.part.sourceSha256).toMatch(/^[a-f0-9]{64}$/);
  expect(rig.part.endPose.translationX).toBe(4); expect(rig.part.frameCount).toBe(3);
  expect(rig.part).not.toHaveProperty('raster'); expect(rig.part).not.toHaveProperty('sourceVersion');
  await writeFile(info.outputPath('saved-rig.pixibun'), raw);
  await expect(page.getByRole('dialog', { name: /Export/ })).toBeHidden();
  await page.locator('input[type=file]').first().setInputFiles({ name: 'saved-rig.pixibun', mimeType: 'application/json', buffer: Buffer.from(raw) });
  const importer = page.getByRole('dialog', { name: 'Import Project (.pixibun)' });
  await importer.getByRole('button', { name: 'Confirm Import', exact: true }).click(); await expect(importer).toBeHidden();
  await expect.poll(() => pixels(page)).toEqual(original); await page.getByTestId('tab-tools').click();
  await page.getByRole('button', { name: 'Open rig Wave', exact: true }).click();
  await expect(page.getByTestId('piximotion-panel')).toBeVisible();
  await expect(page.getByRole('slider', { name: 'Motion frame count', exact: true })).toHaveValue('3');
  await expect.poll(() => pixels(page, 'piximotion-preview-canvas')).toEqual(translated(original, 4));
});
