import { expect, test } from '@playwright/test';
import { verifyAnimatedDownloadOrder } from '../helpers/gameAnimationDownload';
import { readFile } from 'node:fs/promises';
import { importGameDeliveryFixture } from '../helpers/gameDeliveryFixture';

test('compiled animated downloads preserve reverse and bounce pose holds and play-once settings', async ({ page }) => {
  await verifyAnimatedDownloadOrder(page);
});

test('production Godot kit preserves holds, raw register 255, alpha and roles through undo and reload', async ({ page }, info) => {
  await importGameDeliveryFixture(page);
  expect(await page.evaluate(() => Object.keys(window).filter(key => /__studioStore|__pixibunDb/.test(key)))).toEqual([]);
  await page.getByTestId('tab-palette').click(); await page.getByText('Roles and index bindings', { exact: true }).click();
  await page.getByRole('combobox', { name: 'Semantic palette register' }).selectOption('255');
  await page.getByRole('textbox', { name: 'Palette role name' }).fill('sprite-light'); await page.getByRole('button', { name: 'Save palette role' }).click();
  await page.getByTestId('undo-button').click(); await expect(page.getByText('Saved role: unnamed')).toBeVisible();
  await page.getByTestId('redo-button').click(); await expect(page.getByText('Saved role: sprite-light')).toBeVisible();
  await page.getByTestId('save-button').click();
  await expect(page.locator('[role="status"]').filter({ hasText: /Changes saved/ })).toBeVisible(); await page.reload();
  await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  await page.getByTestId('export-button').click(); const dialog = page.getByRole('dialog');
  await dialog.getByTestId('export-tab-godot-kit').click();
  await dialog.getByRole('checkbox', { name: 'Include indexed palette and runtime cycling' }).check();
  await dialog.getByRole('checkbox', { name: 'Include normal-map atlas' }).check();
  const downloaded = page.waitForEvent('download'); await dialog.getByRole('button', { name: 'Download Godot kit' }).click();
  const download = await downloaded, path = info.outputPath('production-godot-kit.zip'); await download.saveAs(path);
  const bytes = await readFile(path), files = new Map<string, Buffer>(); let offset = 0;
  while (bytes.readUInt32LE(offset) === 0x04034b50) {
    expect(bytes.readUInt16LE(offset + 8)).toBe(0); // Standard ZIP STORE, independently checked by Python zipfile.
    const size = bytes.readUInt32LE(offset + 18), nameLength = bytes.readUInt16LE(offset + 26), extra = bytes.readUInt16LE(offset + 28);
    const name = bytes.subarray(offset + 30, offset + 30 + nameLength).toString(); const start = offset + 30 + nameLength + extra;
    files.set(name, bytes.subarray(start, start + size)); offset = start + size;
  }
  const manifest = JSON.parse(files.get('manifest.json')!.toString());
  expect(manifest.animation.frames.map((f: { durationMs: number }) => f.durationMs)).toEqual([70, 230, 110]);
  expect(manifest.animation.clips[1].frames).toEqual([2, 1, 0]); expect(manifest.palette.entries[255].role).toBe('sprite-light');
  expect(files.get('sprite_frames.tres')!.toString()).toContain('res://atlas.png');
  const data = await page.evaluate(async pngs => {
    const sample = async (base64: string, points: number[][]) => {
      const image = new Image(); image.src = 'data:image/png;base64,' + base64; await image.decode();
      const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
      const ctx = canvas.getContext('2d')!; ctx.drawImage(image, 0, 0);
      return points.map(([x, y]) => Array.from(ctx.getImageData(x, y, 1, 1).data));
    };
    return { index: await sample(pngs.index, [[16, 16]]), alpha: await sample(pngs.alpha, [[17, 1], [17, 2]]) };
  }, { index: files.get('indices.png')!.toString('base64'), alpha: files.get('alpha.png')!.toString('base64') });
  expect(data.index).toEqual([[255, 0, 0, 255]]); expect(data.alpha).toEqual([[0, 0, 0, 255], [51, 0, 0, 255]]);
});
