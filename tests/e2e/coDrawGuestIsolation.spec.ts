import { expect, test, type Page } from '@playwright/test';
import type { StudioState } from '../../src/stores/studioStore';
import type { PixiBunDatabase } from '../../src/lib/storage/db';

type StudioWindow = Window & {
  __studioStore: { getState(): StudioState };
  __pixibunDb: PixiBunDatabase;
};
const pixels = (page: Page) => page.getByTestId('main-composite-canvas').evaluate((canvas: HTMLCanvasElement) =>
  Array.from(canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data));
const projectId = (page: Page) => page.evaluate(() => (window as unknown as StudioWindow).__studioStore.getState().currentProjectId);
async function stored(page: Page, id: string) {
  return page.evaluate(async id => {
    const db = (window as unknown as StudioWindow).__pixibunDb;
    const project = await db.projects.get(id);
    const blobs = await db.layerBlobs.where('projectId').equals(id).toArray();
    return { project, blobs: await Promise.all(blobs.map(async row => ({
      layerId: row.layerId, frameIndex: row.frameIndex, bytes: Array.from(new Uint8Array(await row.blob.arrayBuffer())),
    }))) };
  }, id);
}
async function drawing(page: Page, name: string, position: number) {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto('/studio');
  await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  await page.evaluate(name => (window as unknown as StudioWindow).__studioStore.getState().setProjectName(name), name);
  const box = (await page.getByTestId('main-composite-canvas').boundingBox())!;
  await page.mouse.click(box.x + box.width * position, box.y + box.height * position);
  await expect.poll(async () => (await pixels(page)).some((value, index) => index % 4 === 3 && value > 0)).toBe(true);
  return { id: await projectId(page), pixels: await pixels(page) };
}
async function openCoDraw(page: Page) {
  await page.getByRole('button', { name: 'Studio options', exact: true }).click();
  await page.getByRole('button', { name: 'Co-Draw session', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Peer-to-Peer Co-Draw' })).toBeVisible();
}
async function join(page: Page, invite: string) {
  await openCoDraw(page);
  await page.getByRole('button', { name: 'Join Session', exact: true }).click();
  await page.getByRole('textbox', { name: 'Host invite code input' }).fill(invite);
  await page.getByRole('button', { name: 'Save My Drawing & Join Separately' }).click();
}

test('real LAN peers save shared artwork separately, preserve original bytes and reload the shared copy', async ({ browser, page }, testInfo) => {
  const hostContext = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
  const host = await hostContext.newPage();
  try {
    const hostArt = await drawing(host, 'Host drawing', 0.7);
    const original = await drawing(page, 'Guest original', 0.3);
    await openCoDraw(host);
    await host.getByRole('button', { name: 'Generate Invite Code' }).click();
    await expect(host.getByRole('textbox', { name: 'Generated invite code' })).not.toHaveValue('');
    await join(page, await host.getByRole('textbox', { name: 'Generated invite code' }).inputValue());
    const answer = page.getByRole('textbox', { name: 'Generated answer token' });
    await expect(answer).not.toHaveValue('');
    const sharedId = await projectId(page);
    expect(sharedId).not.toBe(original.id);
    const originalSaved = await stored(page, original.id);
    expect(originalSaved.project?.name).toBe('Guest original');
    expect(originalSaved.blobs.length).toBe(1);
    await host.getByRole('textbox', { name: 'Peer answer token input' }).fill(await answer.inputValue());
    await host.getByRole('button', { name: 'Connect', exact: true }).click();
    await expect(page.getByText('Status: Connected', { exact: true })).toBeVisible();
    await expect(host.getByText('Status: Connected', { exact: true })).toBeVisible();
    await expect.poll(() => pixels(page)).toEqual(hostArt.pixels);
    await expect.poll(async () => (await stored(page, sharedId)).blobs.length).toBe(1);
    expect(await stored(page, original.id)).toEqual(originalSaved);
    await page.screenshot({ path: testInfo.outputPath('separate-shared-drawing.png'), fullPage: true });
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    const box = (await page.getByTestId('main-composite-canvas').boundingBox())!;
    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5);
    const guestEdit = await pixels(page);
    await expect.poll(() => pixels(host)).toEqual(guestEdit);
    await expect.poll(() => page.evaluate(() => (window as unknown as StudioWindow).__studioStore.getState().isDirty)).toBe(false);
    await openCoDraw(page);
    await page.getByRole('button', { name: 'Disconnect Session' }).click();
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    expect(await projectId(page)).toBe(sharedId);
    expect(await stored(page, original.id)).toEqual(originalSaved);
    await page.reload();
    await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
    expect(await projectId(page)).toBe(sharedId);
    await expect.poll(() => pixels(page)).toEqual(guestEdit);
    expect(await stored(page, original.id)).toEqual(originalSaved);
    // The saved original's raster is still the actual original artwork.
    const originalRaster = await page.evaluate(async id => {
      const db = (window as unknown as StudioWindow).__pixibunDb;
      const row = await db.layerBlobs.where('projectId').equals(id).first();
      const bitmap = await createImageBitmap(row!.blob);
      const canvas = document.createElement('canvas'); canvas.width = bitmap.width; canvas.height = bitmap.height;
      const ctx = canvas.getContext('2d')!; ctx.drawImage(bitmap, 0, 0); bitmap.close();
      return Array.from(ctx.getImageData(0, 0, canvas.width, canvas.height).data);
    }, original.id);
    expect(originalRaster).toEqual(original.pixels);
  } finally { await hostContext.close(); }
});

test('invalid invite leaves original pixels and Undo intact', async ({ page }) => {
  const original = await drawing(page, 'Original after failed join', 0.3);
  await join(page, 'invalid-invite');
  await expect(page.getByText(/invalid.*(token|format)|not valid/i)).toBeVisible();
  expect(await projectId(page)).toBe(original.id);
  expect(await pixels(page)).toEqual(original.pixels);
  expect((await stored(page, original.id)).project?.name).toBe('Original after failed join');
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.getByTestId('undo-button')).toBeEnabled();
  await page.getByTestId('undo-button').click();
  await expect.poll(() => pixels(page)).not.toEqual(original.pixels);
});

test('storage failure refuses the join and preserves unsaved artwork', async ({ page }) => {
  const original = await drawing(page, 'Unsaved original', 0.4);
  await page.evaluate(() => {
    const db = (window as unknown as StudioWindow).__pixibunDb;
    db.transaction = (() => { throw new Error('Simulated co-draw checkpoint failure'); }) as typeof db.transaction;
    (window as unknown as StudioWindow).__studioStore.getState().setDirty(true);
  });
  await join(page, 'invalid-invite');
  await expect(page.getByText(/Simulated co-draw checkpoint failure/).first()).toBeVisible();
  expect(await projectId(page)).toBe(original.id);
  expect(await pixels(page)).toEqual(original.pixels);
  await expect(page.getByRole('textbox', { name: 'Generated answer token' })).toHaveCount(0);
});
