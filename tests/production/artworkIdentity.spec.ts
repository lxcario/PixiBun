import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import type { ProjectFile } from '@/types/project';
import { chooseTool } from '../helpers/tools';

async function importFixture(page: Page) {
  await page.addInitScript(() => { Object.defineProperty(window, 'showSaveFilePicker', { value: undefined, configurable: true }); });
  await page.goto('/studio'); await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  const project = await page.evaluate(() => {
    const png = (alpha = 1) => {
      const canvas = document.createElement('canvas'); canvas.width = 32; canvas.height = 32;
      const ctx = canvas.getContext('2d')!; ctx.fillStyle = `rgba(255,0,0,${alpha})`; ctx.fillRect(2, 2, 3, 3);
      return canvas.toDataURL('image/png').split(',')[1];
    };
    const body = (i: number) => ({ id: `body-${i}`, name: 'Body', visible: true, locked: false, opacity: 1, blendMode: 'source-over', pngBase64: png() });
    const light = { id: 'light-1', name: 'Lighting', visible: false, locked: false, opacity: 1, blendMode: 'source-over', pngBase64: png(0.2) };
    return { format: 'pixibun-project', version: 3, name: 'Identity fixture', width: 32, height: 32, fps: 8, loopMode: 'repeat',
      onionSkin: { enabled: false, prevFrames: 1, nextFrames: 1, prevColor: '#c792df', nextColor: '#dcabdf', opacity: 0.45 },
      palettes: [{ id: 'roles', name: 'Roles', colors: ['#ff0000', '#ff0000'], semantics: {
        entries: [{ id: 'cloth', role: 'cloth' }, { id: 'fire', role: 'fire' }],
        bindings: [{ id: 'fire-region', frameId: 'frame-0', entryId: 'fire', x: 0, y: 0, w: 32, h: 32 }],
      } }], currentPaletteId: 'roles', customRamps: [], clips: [{ id: 'attack', name: 'Attack', startFrame: 1, endFrame: 2, loopMode: 'forward' }],
      frames: [0, 1, 2, 3].map(i => ({ id: `frame-${i}`, durationMs: 100, layers: i === 1 ? [light, body(i)] : [body(i)] })), createdAt: 1, updatedAt: 1 };
  });
  await page.locator('input[type=file]').first().setInputFiles({ name: 'identity.pixibun', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(project)) });
  const dialog = page.getByRole('dialog', { name: 'Import Project (.pixibun)' });
  await dialog.getByRole('button', { name: 'Confirm Import' }).click(); await expect(dialog).toBeHidden();
  await expect(page.getByRole('button', { name: /Select frame 4\./ })).toBeVisible();
  return project;
}
async function frameAction(page: Page, name: string) {
  await page.getByRole('button', { name, exact: true }).click();
}
async function backup(page: Page): Promise<ProjectFile> {
  await page.getByTestId('export-button').click();
  await page.getByTestId('export-tab-project').click();
  const pending = page.waitForEvent('download'); await page.getByRole('button', { name: 'Download project backup', exact: true }).click();
  const downloaded = await pending, path = await downloaded.path();
  if (!path) throw new Error('Project backup has no local artifact.');
  return JSON.parse(await readFile(path, 'utf8'));
}
const clipMembers = (project: ProjectFile) => {
  const clip = project.clips.find(c => c.id === 'attack')!;
  return project.frames.slice(clip.startFrame, clip.endFrame + 1).map(frame => frame.id);
};
async function alpha(page: Page, base64: string) {
  return page.evaluate(async png => {
    const image = new Image(); image.src = 'data:image/png;base64,' + png; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
    const ctx = canvas.getContext('2d')!; ctx.drawImage(image, 0, 0); return ctx.getImageData(2, 2, 1, 1).data[3];
  }, base64);
}

test('compiled duplication preserves later clips and palette roles through undo, redo, save and reload', async ({ page }) => {
  await importFixture(page);
  await page.getByRole('button', { name: /Select frame 1\./ }).click(); await frameAction(page, 'Duplicate frame');
  const duplicated = await backup(page); expect(clipMembers(duplicated)).toEqual(['frame-1', 'frame-2']);
  const duplicateId = duplicated.frames[1].id;
  expect(duplicated.palettes[0].semantics!.bindings.find(b => b.frameId === duplicateId)?.entryId).toBe('fire');
  expect(await alpha(page, duplicated.frames[1].layers[0].pngBase64!)).toBe(255);
  await page.locator('#center-canvas-area').focus(); await page.keyboard.press('Control+z');
  const undone = await backup(page); expect(undone.frames).toHaveLength(4); expect(undone.palettes[0].semantics!.bindings).toHaveLength(1);
  await page.locator('#center-canvas-area').focus(); await page.keyboard.press('Control+y'); await page.getByTestId('save-button').click();
  await expect(page.locator('[role="status"]').filter({ hasText: /Changes saved/ })).toBeVisible();
  await page.reload(); await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  const reopened = await backup(page); expect(clipMembers(reopened)).toEqual(['frame-1', 'frame-2']);
  expect(reopened.palettes[0].semantics!.bindings.find(b => b.frameId === duplicateId)?.entryId).toBe('fire');
  expect(await alpha(page, reopened.frames[1].layers[0].pngBase64!)).toBe(255);
});

test('compiled frame move refuses to split a clip without changing the exported artwork order', async ({ page }) => {
  await importFixture(page); await page.getByRole('button', { name: /Select frame 1\./ }).click();
  await frameAction(page, 'Move frame later');
  await expect(page.getByText('Moving this frame would split the "Attack" clip. Adjust its range before moving the frame.', { exact: true })).toBeVisible();
  const project = await backup(page); expect(project.frames.map(frame => frame.id)).toEqual(['frame-0', 'frame-1', 'frame-2', 'frame-3']);
  expect(clipMembers(project)).toEqual(['frame-1', 'frame-2']);
});

test('compiled all-frame color erase follows Body across reordered stacks and undo preserves hidden Lighting', async ({ page }) => {
  await importFixture(page); await page.getByRole('button', { name: /Select frame 1\./ }).click();
  await chooseTool(page, 'erase-color'); await page.getByTestId('tool-options-button').click();
  await page.getByRole('button', { name: 'Erase Color frame scope' }).click();
  const box = (await page.getByTestId('main-composite-canvas').boundingBox())!;
  await page.mouse.click(box.x + box.width * 3.5 / 32, box.y + box.height * 3.5 / 32);
  const erased = await backup(page);
  for (const frame of erased.frames) expect(await alpha(page, frame.layers.find(layer => layer.name === 'Body')!.pngBase64!)).toBe(0);
  expect(await alpha(page, erased.frames[1].layers.find(layer => layer.name === 'Lighting')!.pngBase64!)).toBe(51);
  await page.getByTestId('undo-button').click(); const restored = await backup(page);
  for (const frame of restored.frames) expect(await alpha(page, frame.layers.find(layer => layer.name === 'Body')!.pngBase64!)).toBe(255);
  expect(await alpha(page, restored.frames[1].layers.find(layer => layer.name === 'Lighting')!.pngBase64!)).toBe(51);
});
