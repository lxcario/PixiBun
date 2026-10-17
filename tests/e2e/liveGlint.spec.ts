import { expect, test, type Page } from '@playwright/test';
import { purpleCharacterPixels } from '../fixtures/purpleCharacter';

async function importBlueObject(page: Page) {
  const base64 = await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = 32; canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
      const distance = Math.hypot(x - 15.5, y - 15.5);
      if (distance > 11) continue;
      ctx.fillStyle = distance >= 10 ? '#3a2e4c' : x === 11 && y === 11 ? '#2e5cd280' : '#2e5cd2'; ctx.fillRect(x, y, 1, 1);
    }
    return canvas.toDataURL('image/png').split(',')[1];
  });
  await page.locator('input[type=file]').first().setInputFiles({ name: 'blue-metal.png', mimeType: 'image/png', buffer: Buffer.from(base64, 'base64') });
  const dialog = page.getByRole('dialog', { name: 'Import Image' });
  await dialog.getByRole('button', { name: 'Single Sprite / Layer' }).click();
  await dialog.getByRole('button', { name: 'Import Image', exact: true }).click();
  await expect(dialog).toBeHidden();
}


test('glints follow the live bulb, cancel safely, apply once, and undo without repainting the source', async ({ page }, testInfo) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('/studio');
  await expect(page.locator('[data-restoration-phase]')).toHaveAttribute('data-restoration-phase', 'active');
  await importBlueObject(page);
  await page.evaluate(() => {
    const win = window as unknown as Window & { __studioStore: { getState: () => {
      setMaterialPreset: (value: 'metal') => void; setFormType: (value: 'orb') => void;
      setLightAzimuth: (value: number) => void; setLightElevation: (value: number) => void;
    } } };
    const state = win.__studioStore.getState(); state.setMaterialPreset('metal'); state.setFormType('orb');
    state.setLightAzimuth(315); state.setLightElevation(45);
  });
  const artwork = page.getByTestId('main-composite-canvas');
  const pixels = () => artwork.evaluate((canvas: HTMLCanvasElement) => Array.from(canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data));
  const original = await pixels();
  const layerCount = () => page.evaluate(() => (window as unknown as Window & { __studioStore: { getState: () => { frames: { layers: unknown[] }[]; activeFrameIndex: number } } }).__studioStore.getState().frames[0].layers.length);
  const initialLayers = await layerCount();
  await page.getByRole('button', { name: /PixiTools/ }).click();
  await page.getByTestId('pixitools-task-lighting').click();
  await page.getByText('More lighting actions').click();
  await page.getByRole('button', { name: 'Specular Glint', exact: true }).click();
  const toolbar = page.getByRole('toolbar', { name: 'Live Light Bulb Controls' });
  await expect(toolbar).toBeVisible();
  await expect(toolbar).toContainText('Live Glint');
  await expect(toolbar.getByRole('group', { name: 'Shading tones' })).toHaveCount(0);
  await expect(page.getByTestId('pixel-light-glint-crisp')).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(pixels).not.toEqual(original);
  const crisp = await pixels();
  // The overlay is masked to existing coverage, including all transparent pixels.
  expect(crisp.filter((_, i) => i % 4 === 3)).toEqual(original.filter((_, i) => i % 4 === 3));
  await page.getByTestId('pixel-light-glint-off').click();
  await expect.poll(pixels).toEqual(original);
  await page.getByTestId('pixel-light-glint-soft').click();
  await expect.poll(pixels).not.toEqual(original);
  const soft = await pixels(); expect(soft).not.toEqual(crisp);
  await page.screenshot({ path: testInfo.outputPath('live-glint-soft-1920.png') });

  const bulb = await page.getByTestId('pixel-light-bulb-handle').boundingBox();
  const stage = await artwork.boundingBox();
  await page.mouse.move(bulb!.x + bulb!.width / 2, bulb!.y + bulb!.height / 2);
  await page.mouse.down();
  await page.mouse.move(stage!.x + stage!.width * 0.8, stage!.y + stage!.height * 0.2, { steps: 6 });
  await expect.poll(pixels).not.toEqual(soft); // Check while the button is still held.
  await page.mouse.up();
  await page.getByTestId('pixel-light-cancel').click();
  await expect(toolbar).toBeHidden();
  expect(await pixels()).toEqual(original);
  expect(await layerCount()).toBe(initialLayers);

  await page.getByRole('button', { name: 'Specular Glint', exact: true }).click();
  await page.getByTestId('pixel-light-glint-crisp').click();
  for (const width of [1280, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    for (const control of ['pixel-light-glint-off', 'pixel-light-glint-soft', 'pixel-light-glint-crisp', 'pixel-light-apply', 'pixel-light-cancel']) {
      await expect(page.getByTestId(control)).toBeInViewport();
      const bounds = await page.getByTestId(control).boundingBox();
      const workspace = await page.getByRole('main', { name: 'Pixel art canvas workspace' }).boundingBox();
      expect(bounds!.x).toBeGreaterThanOrEqual(workspace!.x);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(workspace!.x + workspace!.width);
    }
    await page.screenshot({ path: testInfo.outputPath(`live-glint-crisp-${width}.png`) });
  }
  await page.getByTestId('pixel-light-apply').click();
  await expect(toolbar).toBeHidden();
  expect(await layerCount()).toBe(initialLayers + 1);
  const committed = await pixels(); expect(committed).not.toEqual(original);
  await page.getByTestId('undo-button').click();
  await expect.poll(pixels).toEqual(original);
  expect(await layerCount()).toBe(initialLayers);
  await page.getByRole('button', { name: 'Redo last action' }).click();
  await expect.poll(pixels).toEqual(committed);
  await page.getByRole('button', { name: /Layers/, exact: true }).click();
  await page.getByRole('button', { name: 'Edit glint effect on Glint' }).click();
  await page.getByTestId('pixel-light-glint-off').click();
  await expect.poll(pixels).toEqual(original);
  await page.getByTestId('pixel-light-cancel').click();
  await expect.poll(pixels).toEqual(committed);
  expect(await layerCount()).toBe(initialLayers + 1);
});

test('Soft glints are legible pixel clusters on a matte character in the full lighting preview', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.addInitScript(() => localStorage.setItem('pixibun:tool-previews-disabled', 'true'));
  await page.goto('/studio');
  await expect(page.locator('[data-restoration-phase]')).toHaveAttribute('data-restoration-phase', 'active');
  const base64 = await page.evaluate((pixels) => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    ctx.putImageData(new ImageData(new Uint8ClampedArray(pixels), 32, 32), 0, 0);
    return canvas.toDataURL('image/png').split(',')[1];
  }, Array.from(purpleCharacterPixels()));
  await page.locator('input[type=file]').first().setInputFiles({ name: 'purple-character.png', mimeType: 'image/png', buffer: Buffer.from(base64, 'base64') });
  const dialog = page.getByRole('dialog', { name: 'Import Image' });
  await dialog.getByRole('button', { name: 'Single Sprite / Layer' }).click();
  await dialog.getByRole('button', { name: 'Import Image', exact: true }).click();
  await expect(dialog).toBeHidden();
  await page.evaluate(() => {
    const state = (window as unknown as { __studioStore: { getState: () => {
      setMaterialPreset: (v: 'matte') => void; setFormType: (v: 'character') => void;
      setLightAzimuth: (v: number) => void; setLightElevation: (v: number) => void;
      setLightBrightness: (v: number) => void;
    } } }).__studioStore.getState();
    state.setMaterialPreset('matte'); state.setFormType('character');
    state.setLightAzimuth(315); state.setLightElevation(45); state.setLightBrightness(1.15);
  });
  const artwork = page.getByTestId('main-composite-canvas');
  const pixels = () => artwork.evaluate((canvas: HTMLCanvasElement) => Array.from(canvas.getContext('2d')!.getImageData(0, 0, 32, 32).data));
  const original = await pixels();
  await page.getByRole('button', { name: /PixiTools/ }).click();
  await page.getByTestId('pixitools-task-lighting').click();
  await page.getByRole('button', { name: 'Manual setup', exact: true }).click();
  await page.getByRole('button', { name: 'Preview lighting', exact: true }).click();
  await page.getByTestId('pixel-light-glint-off').click();
  await expect.poll(pixels).not.toEqual(original);
  const off = await pixels();
  await page.getByTestId('pixel-light-glint-soft').click();
  await expect.poll(pixels).not.toEqual(off);
  const soft = await pixels();
  const clearlyBrighter = soft.filter((_, i) => i % 4 === 0 &&
    (soft[i] - off[i]) * 0.2126 + (soft[i + 1] - off[i + 1]) * 0.7152 + (soft[i + 2] - off[i + 2]) * 0.0722 >= 35).length;
  expect(clearlyBrighter).toBeGreaterThanOrEqual(4);
  expect(soft.filter((_, i) => i % 4 === 3)).toEqual(original.filter((_, i) => i % 4 === 3));
  await page.mouse.move(10, 10);
  await page.screenshot({ path: testInfo.outputPath('pixel-glint-character-live.png') });
  await page.getByTestId('pixel-light-glint-crisp').click();
  await expect.poll(pixels).not.toEqual(soft);
  await page.screenshot({ path: testInfo.outputPath('pixel-glint-character-crisp.png') });
  await page.getByTestId('pixel-light-glint-soft').click();
  await expect.poll(pixels).toEqual(soft);
  await page.getByTestId('pixel-light-apply').click();
  await expect(page.getByTestId('pixel-light-bulb-handle')).toBeHidden();
  await expect.poll(pixels).toEqual(soft);
  await artwork.screenshot({ path: testInfo.outputPath('pixel-glint-character-applied.png') });
  await page.getByTestId('undo-button').click();
  await expect.poll(pixels).toEqual(original);
});

test('the lighting bulb exposes glint choices beside Shade and previews them immediately', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('/studio');
  await expect(page.locator('[data-restoration-phase]')).toHaveAttribute('data-restoration-phase', 'active');
  await importBlueObject(page);
  const canvas = page.getByTestId('main-composite-canvas');
  const alpha = () => canvas.evaluate((canvas: HTMLCanvasElement) =>
    Array.from(canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data).filter((_, index) => index % 4 === 3));
  const originalAlpha = await alpha();
  await page.getByRole('button', { name: /PixiTools/ }).click();
  await page.getByTestId('pixitools-task-lighting').click();
  await page.getByTestId('analyze-light-bulb').click();
  const toolbar = page.getByRole('toolbar', { name: 'Live Light Bulb Controls' });
  await expect(toolbar.getByRole('group', { name: 'Shading tones' })).toBeVisible();
  await expect(toolbar.getByRole('group', { name: 'Glint style' })).toBeVisible();
  await page.getByTestId('pixel-light-glint-crisp').click();
  await expect(page.getByTestId('pixel-light-glint-crisp')).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(alpha).toEqual(originalAlpha);
  await page.screenshot({ path: testInfo.outputPath('light-bulb-glint-option.png') });
  await page.setViewportSize({ width: 1024, height: 900 });
  const workspace = await page.getByRole('main', { name: 'Pixel art canvas workspace' }).boundingBox();
  for (const name of ['pixel-light-glint-crisp', 'pixel-light-shade-3', 'pixel-light-apply', 'pixel-light-cancel']) {
    const bounds = await page.getByTestId(name).boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(workspace!.x);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(workspace!.x + workspace!.width);
  }
  await page.screenshot({ path: testInfo.outputPath('light-bulb-glint-option-1024.png') });
  await page.keyboard.press('Escape');
  await expect(toolbar).toBeHidden();
});

test('light bar choices: press, hold and slide the glass lens, release to choose', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  // Automated browsers start with Labs off; this gesture belongs to the Liquid controls lab.
  await page.addInitScript(() => localStorage.setItem('pixibun:labs:v1', JSON.stringify({ liquidControls: true })));
  await page.goto('/studio');
  await expect(page.locator('[data-restoration-phase]')).toHaveAttribute('data-restoration-phase', 'active');
  await importBlueObject(page);
  await page.getByRole('button', { name: /PixiTools/ }).click();
  await page.getByTestId('pixitools-task-lighting').click();
  await page.getByTestId('analyze-light-bulb').click();
  const shade = page.getByRole('group', { name: 'Shading tones' }), lens = shade.locator('.lb-seg-thumb');
  await expect(shade).toBeVisible();
  const one = (await page.getByTestId('pixel-light-shade-1').boundingBox())!, three = (await page.getByTestId('pixel-light-shade-3').boundingBox())!;
  await page.mouse.move(one.x + one.width / 2, one.y + one.height / 2); await page.mouse.down();
  await expect(lens).toHaveClass(/is-glass/);
  await page.mouse.move(three.x + three.width / 2, three.y + three.height / 2, { steps: 12 });
  await expect(shade.locator('[data-lq-under]')).toHaveText('3');
  await page.mouse.up();
  await expect(page.getByTestId('pixel-light-shade-3')).toHaveAttribute('aria-pressed', 'true');
  await expect(lens).not.toHaveClass(/is-glass/);
  await expect.poll(async () => {
    const at = (await lens.boundingBox())!, chosen = (await page.getByTestId('pixel-light-shade-3').boundingBox())!;
    return Math.abs(at.x - chosen.x) < 0.5 && Math.abs(at.width - chosen.width) < 0.5;
  }).toBe(true);
  // A plain tap still chooses directly.
  await page.getByTestId('pixel-light-shade-1').click();
  await expect(page.getByTestId('pixel-light-shade-1')).toHaveAttribute('aria-pressed', 'true');
});
