import { readFile, writeFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';

async function ready(page: Page) {
  await page.addInitScript(() => { Object.defineProperty(window, 'showSaveFilePicker', { value: undefined, configurable: true }); });
  await page.goto('/studio'); await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
}
async function backup(page: Page) {
  await page.getByTestId('export-button').click(); await page.getByTestId('export-tab-project').click();
  const download = page.waitForEvent('download'); await page.getByRole('button', { name: 'Download project backup', exact: true }).click();
  const path = await (await download).path(); expect(path).toBeTruthy();
  const project = JSON.parse(await readFile(path!, 'utf8'));
  await expect(page.getByRole('dialog', { name: /Export/ })).toBeHidden();
  return project;
}
async function gallery(page: Page) {
  await page.getByTestId('file-menu-button').click(); await page.getByRole('menuitem', { name: 'Projects', exact: true }).click();
  return page.getByRole('dialog', { name: 'Atelier Projects & Gallery' });
}
for (const createdAt of [0, 946684800000]) test(`compiled creation date ${createdAt} survives import, edits, reload and backup while duplicates get a new date`, async ({ page }, info) => {
  await ready(page);
  const fixture = await page.evaluate(createdAt => {
    const c = document.createElement('canvas'); c.width = c.height = 32;
    const ctx = c.getContext('2d')!; ctx.fillStyle = '#ff0000'; ctx.fillRect(4, 4, 1, 1);
    return { format: 'pixibun-project', version: 3, name: 'Dated artwork', width: 32, height: 32, fps: 8, loopMode: 'repeat',
      onionSkin: { enabled: false, prevFrames: 1, nextFrames: 1, prevColor: '#c792df', nextColor: '#dcabdf', opacity: 0.45 },
      palettes: [{ id: 'colors', name: 'Colors', colors: ['#ff0000'] }], currentPaletteId: 'colors', customRamps: [], clips: [],
      frames: [{ id: 'dated-frame', durationMs: 100, layers: [{ id: 'dated-layer', name: 'Body', visible: true, locked: false, opacity: 1, blendMode: 'source-over', pngBase64: c.toDataURL().split(',')[1] }] }], createdAt, updatedAt: createdAt };
  }, createdAt);
  await page.locator('input[type=file]').first().setInputFiles({ name: 'dated.pixibun', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(fixture)) });
  const importer = page.getByRole('dialog', { name: 'Import Project (.pixibun)' });
  await importer.getByRole('button', { name: 'Confirm Import' }).click(); await expect(importer).toBeHidden();
  await expect(page.getByRole('button', { name: 'Rename project Dated artwork', exact: true })).toBeVisible();
  const canvas = page.getByTestId('main-composite-canvas'), box = (await canvas.boundingBox())!;
  await page.mouse.click(box.x + box.width * 0.6, box.y + box.height * 0.6);
  await page.getByTestId('save-button').click(); await expect(page.getByRole('status').filter({ hasText: /^Changes saved$/ })).toBeVisible();
  const first = await backup(page); expect(first.createdAt).toBe(createdAt); expect(first.updatedAt).toBeGreaterThan(createdAt);
  await page.reload(); await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  const reopened = await backup(page); expect(reopened.createdAt).toBe(createdAt);
  expect(reopened.frames[0].layers[0].pngBase64).toBe(first.frames[0].layers[0].pngBase64);
  let projects = await gallery(page); const beforeDuplicate = Date.now();
  await projects.getByRole('button', { name: 'Open project Dated artwork', exact: true }).getByTitle('Duplicate drawing', { exact: true }).click();
  await projects.getByRole('button', { name: 'Open project Copy of Dated artwork', exact: true }).click(); await expect(projects).toBeHidden();
  const copy = await backup(page); expect(copy.createdAt).toBeGreaterThanOrEqual(beforeDuplicate);
  expect(copy.frames[0].layers[0].pngBase64).toBe(first.frames[0].layers[0].pngBase64);
  projects = await gallery(page); await projects.getByRole('button', { name: 'Open project Dated artwork', exact: true }).click();
  const original = await backup(page); expect(original.createdAt).toBe(createdAt);
  const measurement = { createdAt, first: first.createdAt, reopened: reopened.createdAt, copy: copy.createdAt, original: original.createdAt, pixelsPreserved: true };
  await info.attach('creation-date-roundtrip', { body: JSON.stringify(measurement), contentType: 'application/json' });
  await writeFile(info.outputPath(`dates-${createdAt}-${info.project.name}.json`), JSON.stringify(measurement, null, 2));
});

test('compiled co-draw denied clipboard selects the full code and a successful retry reports copied', async ({ page }) => {
  await ready(page);
  test.skip(!await page.evaluate(() => typeof RTCPeerConnection === 'function'), 'This runtime cannot generate a real WebRTC invite; clipboard state coverage also runs in component tests.');
  await page.evaluate(() => { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new DOMException('Fixture permission denial', 'NotAllowedError'); } } }); });
  await page.getByRole('button', { name: 'Studio options', exact: true }).click(); await page.getByRole('button', { name: 'Co-Draw session', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Peer-to-Peer Co-Draw' });
  await dialog.getByRole('button', { name: 'Generate Invite Code' }).click();
  const code = dialog.getByRole('textbox', { name: 'Generated invite code' }); await expect(code).not.toHaveValue('');
  await dialog.getByRole('button', { name: 'Copy', exact: true }).click();
  await expect(dialog.getByRole('alert')).toHaveText('Couldn’t copy the code. Select the code above and copy it manually.');
  await expect(code).toBeFocused(); expect(await code.evaluate((field: HTMLTextAreaElement) => [field.selectionStart, field.selectionEnd])).toEqual([0, (await code.inputValue()).length]);
  await expect(dialog.getByRole('button', { name: 'Copied!', exact: true })).toBeHidden();
  await page.evaluate(() => { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (text: string) => { (window as unknown as { copiedFixture: string }).copiedFixture = text; } } }); });
  await dialog.getByRole('button', { name: 'Copy', exact: true }).click(); await expect(dialog.getByRole('status')).toHaveText('Invite code copied.');
  expect(await page.evaluate(() => (window as unknown as { copiedFixture: string }).copiedFixture)).toBe(await code.inputValue());
  await dialog.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await page.getByRole('button', { name: 'Studio options', exact: true }).click(); await page.getByRole('button', { name: 'Co-Draw session', exact: true }).click();
  await expect(dialog.getByRole('status')).toBeHidden();
});
