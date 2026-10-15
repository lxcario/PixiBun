import { openMotionCapture } from '../helpers/motion';
import { expect, test, type Page } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';

const digest = (page: Page, testId: string) => page.getByTestId(testId).evaluate(async (canvas: HTMLCanvasElement) => {
  const pixels = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', pixels)))
    .map(value => value.toString(16).padStart(2, '0')).join('');
});
async function number(page: Page, label: string, value: string) {
  const field = page.getByRole('spinbutton', { name: label, exact: true });
  await field.fill(value); await field.press('Enter'); await expect(field).toHaveValue(value);
}

for (const translation of ['4.3', '-1.5']) {
  test(`saved fractional translation ${translation} previews the same sampled pixels as bake and Undo/Redo`, async ({ page }, info) => {
    await page.addInitScript(() => { Object.defineProperty(window, 'showSaveFilePicker', { value: undefined, configurable: true }); });
    await page.setViewportSize({ width: 1600, height: 1100 });
    await page.goto('/studio?template=hearth-ghost');
    await expect.poll(() => page.getByTestId('main-composite-canvas').evaluate((c: HTMLCanvasElement) => c.width)).toBe(16);
    await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
    const original = await digest(page, 'main-composite-canvas');
    await page.getByTestId('tab-tools').click(); await openMotionCapture(page); await page.getByTestId('create-motion-part-btn').click();
    await number(page, 'Rotation degrees', '33.3'); await number(page, 'Pivot X pixels', '8.3');
    await number(page, 'Motion frames', '3');
    await page.getByRole('textbox', { name: 'Rig name', exact: true }).fill('Fractional');
    await page.getByRole('button', { name: 'Save motion rig', exact: true }).click();
    await expect(page.getByTestId('motion-rig-library').getByRole('status')).toContainText('Motion rig ready');
    await page.getByRole('button', { name: 'Cancel (Escape)', exact: true }).click();
    await page.getByTestId('export-button').click(); await page.getByTestId('export-tab-project').click();
    const downloading = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download project backup', exact: true }).click();
    const downloadPath = await (await downloading).path(); expect(downloadPath).toBeTruthy();
    const file = JSON.parse(await readFile(downloadPath!, 'utf8'));
    expect(file.version).toBe(4); expect(file.motionRigs).toHaveLength(1);
    // Saved v4 settings admit finite fractional translations. Position controls
    // intentionally enter whole pixels, so exercise fractions through import.
    file.motionRigs[0].part.endPose.translationX = Number(translation);
    const raw = JSON.stringify(file); await writeFile(info.outputPath('fractional-rig.pixibun'), raw);
    await expect(page.getByRole('dialog', { name: /Export/ })).toBeHidden();
    await page.locator('input[type=file]').first().setInputFiles({ name: 'fractional-rig.pixibun', mimeType: 'application/json', buffer: Buffer.from(raw) });
    const importer = page.getByRole('dialog', { name: 'Import Project (.pixibun)' });
    await importer.getByRole('button', { name: 'Confirm Import', exact: true }).click(); await expect(importer).toBeHidden();
    await expect.poll(() => digest(page, 'main-composite-canvas')).toBe(original);
    await page.getByTestId('tab-tools').click(); await page.getByRole('button', { name: 'Open rig Fractional', exact: true }).click();
    await expect(page.getByRole('spinbutton', { name: 'Position X pixels', exact: true })).toHaveValue(translation);
    await expect(page.getByTestId('piximotion-preview-canvas')).toHaveAttribute('aria-busy', 'false');
    const preview = await digest(page, 'piximotion-preview-canvas');
    expect(preview).not.toBe(original);
    await page.getByRole('button', { name: 'BAKE TO TIMELINE', exact: true }).click();
    await expect(page.getByTestId('piximotion-panel')).toBeHidden();
    await expect.poll(() => digest(page, 'main-composite-canvas')).toBe(preview);
    await page.getByTestId('undo-button').click(); await expect.poll(() => digest(page, 'main-composite-canvas')).toBe(original);
    await page.getByTestId('redo-button').click(); await page.getByRole('button', { name: /Select frame 3\./ }).click();
    await expect.poll(() => digest(page, 'main-composite-canvas')).toBe(preview);
  });
}
