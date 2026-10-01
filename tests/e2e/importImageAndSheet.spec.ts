import { test, expect } from '@playwright/test';
import { OUTLINED_CIRCLE_ROWS } from '../fixtures/outlinedCircle';

async function pngFromCanvas(page: import('@playwright/test').Page, width: number, height: number, cells?: number[]) {
  const base64 = await page.evaluate(({ width, height, cells }) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    if (cells) {
      cells.forEach((color, index) => {
        if (!color) return;
        ctx.fillStyle = color === 1 ? '#ff0000' : '#0000ff';
        ctx.fillRect(index * 64, 0, 64, 64);
      });
    } else {
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(0, 0, width, height);
    }
    return canvas.toDataURL('image/png').split(',')[1];
  }, { width, height, cells });
  return Buffer.from(base64, 'base64');
}

async function centeredMotifPng(page: import('@playwright/test').Page) {
  const base64 = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(28, 28, 1, 7);
    ctx.fillStyle = '#0000ff';
    ctx.fillRect(28, 34, 7, 1);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  return Buffer.from(base64, 'base64');
}

test('visible import actions let the user choose a real file', async ({ page }) => {
  await page.goto('/studio');
  await expect(page.getByTestId('main-composite-canvas')).toBeVisible();
  const buffer = await pngFromCanvas(page, 16, 16);

  const headerChooser = page.waitForEvent('filechooser');
  await page.getByTestId('file-menu-button').click();
  await page.getByTestId('import-button').click();
  await (await headerChooser).setFiles({ name: 'header-art.png', mimeType: 'image/png', buffer });
  await expect(page.getByRole('dialog', { name: 'Import Image' }).getByText('header-art.png').first()).toBeVisible();
  await page.getByRole('dialog', { name: 'Import Image' }).getByRole('button', { name: 'Close dialog' }).click();

  await page.getByTestId('file-menu-button').click();
  await page.getByRole('menuitem', { name: 'Projects', exact: true }).click();
  await page.getByRole('dialog', { name: 'Atelier Projects & Gallery' }).getByRole('button', { name: 'Import File' }).click();
  const importDialog = page.getByRole('dialog', { name: 'Import File' });
  await expect(importDialog.getByText('Choose a .pixibun project, image, or sprite sheet to import.')).toBeVisible();
  await importDialog.getByTestId('import-modal-file-input').setInputFiles({ name: 'gallery-art.png', mimeType: 'image/png', buffer });
  await expect(page.getByRole('dialog', { name: 'Import Image' }).getByText('gallery-art.png').first()).toBeVisible();
});

test('image import keeps the chosen fit and original-size modes through preview and confirmation', async ({ page }) => {
  await page.goto('/studio');
  await expect(page.getByTestId('main-composite-canvas')).toBeVisible();
  await expect.poll(() => page.evaluate(() => Boolean((window as Window & { __studioStore?: unknown }).__studioStore))).toBe(true);
  await page.evaluate(() => (window as Window & { __studioStore?: { getState: () => { setCanvasSize: (w: number, h: number) => void } } }).__studioStore!.getState().setCanvasSize(64, 64));
  await expect(page.getByRole('button', { name: '64×64' })).toBeVisible();
  const buffer = await pngFromCanvas(page, 128, 64);
  const picker = page.locator('input[type=file]').first();
  await picker.setInputFiles({ name: 'wide.png', mimeType: 'image/png', buffer });
  let dialog = page.getByRole('dialog', { name: 'Import Image' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Single Sprite / Layer' }).click();
  await dialog.getByLabel('Fit into Current Canvas (64×64 px)').check();
  await expect(dialog.getByLabel('Fit into Current Canvas (64×64 px)')).toBeChecked();
  await expect(dialog.getByText('64 × 64 px', { exact: true }).last()).toBeVisible();
  await dialog.getByRole('button', { name: 'Import Image', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect.poll(() => page.evaluate(() => (window as Window & { __studioStore?: { getState: () => { canvasWidth: number; canvasHeight: number } } }).__studioStore!.getState().canvasWidth)).toBe(64);

  await picker.setInputFiles({ name: 'wide.png', mimeType: 'image/png', buffer });
  dialog = page.getByRole('dialog', { name: 'Import Image' });
  await dialog.getByRole('button', { name: 'Single Sprite / Layer' }).click();
  await dialog.getByLabel('Match Image Size (128×64 px)').check();
  await expect(dialog.getByLabel('Match Image Size (128×64 px)')).toBeChecked();
  await expect(dialog.getByText('128 × 64 px', { exact: true }).last()).toBeVisible();
  await dialog.getByRole('button', { name: 'Import Image', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect.poll(() => page.evaluate(() => {
    const state = (window as Window & { __studioStore?: { getState: () => { canvasWidth: number; canvasHeight: number } } }).__studioStore!.getState();
    return `${state.canvasWidth}x${state.canvasHeight}`;
  })).toBe('128x64');
});

test('suggested sprite sheet keeps blank timing cells and creates distinct timeline artwork', async ({ page }) => {
  await page.goto('/studio');
  const canvas = page.getByTestId('main-composite-canvas');
  await expect(canvas).toBeVisible();
  await expect.poll(() => page.evaluate(() => Boolean((window as Window & { __studioStore?: unknown }).__studioStore))).toBe(true);
  await page.evaluate(() => (window as Window & { __studioStore?: { getState: () => { setCanvasSize: (w: number, h: number) => void } } }).__studioStore!.getState().setCanvasSize(64, 64));
  await expect(page.getByRole('button', { name: '64×64' })).toBeVisible();
  const buffer = await pngFromCanvas(page, 192, 64, [1, 0, 2]);
  await page.locator('input[type=file]').first().setInputFiles({ name: 'walk.png', mimeType: 'image/png', buffer });
  const dialog = page.getByRole('dialog', { name: 'Import Image' });
  await expect(dialog.getByText('Possible sprite sheet detected.')).toBeVisible();
  await expect(dialog.getByText('3 cols × 1 rows = 3 total frames')).toBeVisible();
  await expect(dialog.getByLabel('Skip Empty (Transparent) Cells — shortens animation')).not.toBeChecked();
  await dialog.getByRole('button', { name: 'Slice & Import Frames' }).click();
  await expect(dialog).toBeHidden();
  await expect.poll(() => page.evaluate(() => {
    const state = (window as Window & { __studioStore?: { getState: () => { frames: unknown[] } } }).__studioStore!.getState();
    return state.frames.length;
  })).toBe(4);
  const names = await page.evaluate(() => {
    const state = (window as Window & { __studioStore?: { getState: () => { frames: Array<{ layers: Array<{ name: string }> }> } } }).__studioStore!.getState();
    return state.frames.slice(1).map((frame) => frame.layers[0].name);
  });
  expect(names).toEqual(['Sprite Sheet: walk', 'Sprite Sheet: walk', 'Sprite Sheet: walk']);

  for (const [frameIndex, expected] of [[1, '255,0,0,255'], [2, '0,0,0,0'], [3, '0,0,255,255']] as const) {
    await page.evaluate((index) => (window as Window & { __studioStore?: { getState: () => { setActiveFrame: (index: number) => void } } }).__studioStore!.getState().setActiveFrame(index), frameIndex);
    await expect.poll(() => canvas.evaluate((element: HTMLCanvasElement) => {
      const pixel = element.getContext('2d')!.getImageData(10, 10, 1, 1).data;
      return Array.from(pixel).join(',');
    })).toBe(expected);
  }
});

test('pixel analysis finds opaque gutters and imports clean, separate frames', async ({ page }) => {
  await page.goto('/studio');
  const canvas = page.getByTestId('main-composite-canvas');
  await expect(canvas).toBeVisible();
  await expect.poll(() => page.evaluate(() => Boolean((window as Window & { __studioStore?: unknown }).__studioStore))).toBe(true);
  await page.evaluate(() => (window as Window & { __studioStore?: { getState: () => { setCanvasSize: (w: number, h: number) => void } } }).__studioStore!.getState().setCanvasSize(32, 32));
  const base64 = await page.evaluate(() => {
    const sheet = document.createElement('canvas');
    sheet.width = 39;
    sheet.height = 20;
    const ctx = sheet.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 39, 20);
    ctx.fillStyle = '#462064';
    ctx.fillRect(3, 2, 16, 16);
    ctx.fillStyle = '#1482e6';
    ctx.fillRect(21, 2, 16, 16);
    return sheet.toDataURL('image/png').split(',')[1];
  });
  await page.locator('input[type=file]').first().setInputFiles({
    name: 'walk.png', mimeType: 'image/png', buffer: Buffer.from(base64, 'base64'),
  });
  const dialog = page.getByRole('dialog', { name: 'Import Image' });
  await expect(dialog.getByText(/Detected repeating artwork and measured the cut lines/)).toBeVisible();
  await expect(dialog.getByText('2 cols × 1 rows = 2 total frames')).toBeVisible();
  await expect(dialog.getByLabel('Frame cell width in pixels')).toHaveValue('16');
  await expect(dialog.getByLabel('Frame cell height in pixels')).toHaveValue('16');
  await expect(dialog.getByLabel('Start X in pixels')).toHaveValue('3');
  await expect(dialog.getByLabel('Gap X in pixels')).toHaveValue('2');
  await dialog.getByRole('button', { name: 'Slice & Import Frames' }).click();
  await expect(dialog).toBeHidden();
  await expect.poll(() => page.evaluate(() => (window as Window & { __studioStore?: { getState: () => { frames: unknown[] } } }).__studioStore!.getState().frames.length)).toBe(3);
  for (const [index, expected] of [[1, '70,32,100,255'], [2, '20,130,230,255']] as const) {
    await page.evaluate((frame) => (window as Window & { __studioStore?: { getState: () => { setActiveFrame: (index: number) => void } } }).__studioStore!.getState().setActiveFrame(frame), index);
    await expect.poll(() => canvas.evaluate((element: HTMLCanvasElement) => {
      const pixels = element.getContext('2d')!.getImageData(0, 0, element.width, element.height).data;
      const colors = new Set<string>();
      for (let i = 0; i < pixels.length; i += 4) if (pixels[i + 3]) colors.add(Array.from(pixels.slice(i, i + 4)).join(','));
      return Array.from(colors).join(';');
    })).toBe(expected);
  }
});

test('large cat-style sheet uses eight full cells and cannot clip them into a small canvas', async ({ page }) => {
  await page.goto('/studio');
  const canvas = page.getByTestId('main-composite-canvas');
  await expect(canvas).toBeVisible();
  await expect.poll(() => page.evaluate(() => Boolean((window as Window & { __studioStore?: unknown }).__studioStore))).toBe(true);
  await page.evaluate(() => (window as Window & { __studioStore?: { getState: () => { setCanvasSize: (w: number, h: number) => void } } }).__studioStore!.getState().setCanvasSize(64, 64));
  const base64 = await page.evaluate(() => {
    const sheet = document.createElement('canvas');
    sheet.width = 512;
    sheet.height = 384;
    const ctx = sheet.getContext('2d')!;
    ctx.fillStyle = '#14d228';
    ctx.fillRect(0, 0, 512, 384);
    for (let row = 0; row < 2; row++) for (let column = 0; column < 4; column++) {
      ctx.fillStyle = `rgb(${100 + column * 25}, ${100 + row * 80}, 200)`;
      ctx.fillRect(column * 128 + 25, row * 192 + 35, 78, 130);
    }
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 512, 1);
    ctx.fillRect(0, 0, 1, 384);
    return sheet.toDataURL('image/png').split(',')[1];
  });
  await page.locator('input[type=file]').first().setInputFiles({
    name: 'cats.png', mimeType: 'image/png', buffer: Buffer.from(base64, 'base64'),
  });
  const dialog = page.getByRole('dialog', { name: 'Import Image' });
  await expect(dialog.getByText(/Detected repeating artwork and measured the cut lines/)).toBeVisible();
  await expect(dialog.getByText('4 cols × 2 rows = 8 total frames')).toBeVisible();
  await expect(dialog.getByLabel('Frame cell width in pixels')).toHaveValue('128');
  await expect(dialog.getByLabel('Frame cell height in pixels')).toHaveValue('192');
  const importButton = dialog.getByRole('button', { name: 'Slice & Import Frames' });
  await expect(dialog.getByRole('alert')).toContainText('Enable resize above to import without cropping artwork');
  await expect(importButton).toBeDisabled();
  await dialog.getByLabel('Resize entire project to cell size (128×192 px)').check();
  await expect(importButton).toBeEnabled();
  await importButton.click();
  await expect(dialog).toBeHidden();
  await expect.poll(() => page.evaluate(() => {
    const state = (window as Window & { __studioStore?: { getState: () => { frames: unknown[]; canvasWidth: number; canvasHeight: number } } }).__studioStore!.getState();
    return [state.frames.length, state.canvasWidth, state.canvasHeight];
  })).toEqual([9, 128, 192]);
  for (const [frame, rgb] of [[1, '100,100,200,255'], [4, '175,100,200,255'], [5, '100,180,200,255'], [8, '175,180,200,255']] as const) {
    await page.evaluate((index) => (window as Window & { __studioStore?: { getState: () => { setActiveFrame: (index: number) => void } } }).__studioStore!.getState().setActiveFrame(index), frame);
    await expect.poll(() => canvas.evaluate((element: HTMLCanvasElement) =>
      Array.from(element.getContext('2d')!.getImageData(60, 100, 1, 1).data).join(','))).toBe(rgb);
  }
});

test('replacing frames clears artwork and effects from old layers', async ({ page }) => {
  await page.goto('/studio');
  const canvas = page.getByTestId('main-composite-canvas');
  await expect(canvas).toBeVisible();
  await expect.poll(() => page.evaluate(() => Boolean((window as Window & { __studioStore?: unknown }).__studioStore))).toBe(true);
  await page.evaluate(() => (window as Window & { __studioStore?: { getState: () => { setCanvasSize: (w: number, h: number) => void } } }).__studioStore!.getState().setCanvasSize(64, 64));
  const picker = page.locator('input[type=file]').first();
  await picker.setInputFiles({ name: 'old.png', mimeType: 'image/png', buffer: await pngFromCanvas(page, 64, 64) });
  let dialog = page.getByRole('dialog', { name: 'Import Image' });
  await dialog.getByRole('button', { name: 'Import Image', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect.poll(() => canvas.evaluate((element: HTMLCanvasElement) =>
    Array.from(element.getContext('2d')!.getImageData(10, 10, 1, 1).data).join(','))).toBe('255,0,0,255');
  await page.evaluate(() => {
    const store = (window as Window & { __studioStore?: { setState: (callback: (state: { frames: Array<{ layers: Array<{ effect?: unknown }> }> }) => void) => void } }).__studioStore!;
    store.setState((state) => { state.frames[0].layers[1].effect = { id: 'stale', kind: 'outline' }; });
  });

  await picker.setInputFiles({ name: 'new_sheet.png', mimeType: 'image/png', buffer: await pngFromCanvas(page, 128, 64, [0, 2]) });
  dialog = page.getByRole('dialog', { name: 'Import Image' });
  await dialog.getByRole('button', { name: 'Replace Frames' }).click();
  await dialog.getByRole('button', { name: 'Slice & Import Frames' }).click();
  await expect(dialog).toBeHidden();
  const state = await page.evaluate(() => {
    const store = (window as Window & { __studioStore?: { getState: () => { frames: Array<{ layers: Array<{ effect?: unknown; visible: boolean }> }> } } }).__studioStore!.getState();
    return store.frames.map((frame) => frame.layers.map((layer) => ({ hasEffect: Boolean(layer.effect), visible: layer.visible })));
  });
  expect(state).toHaveLength(2);
  expect(state[0]).toHaveLength(2);
  expect(state[0].every((layer) => !layer.hasEffect)).toBe(true);
  expect(state[0][0].visible).toBe(true);
  await expect.poll(() => canvas.evaluate((element: HTMLCanvasElement) =>
    Array.from(element.getContext('2d')!.getImageData(10, 10, 1, 1).data).join(','))).toBe('0,0,0,0');
  await page.evaluate(() => (window as Window & { __studioStore?: { getState: () => { setActiveFrame: (index: number) => void } } }).__studioStore!.getState().setActiveFrame(1));
  await expect.poll(() => canvas.evaluate((element: HTMLCanvasElement) =>
    Array.from(element.getContext('2d')!.getImageData(10, 10, 1, 1).data).join(','))).toBe('0,0,255,255');
});

test('the studio 45-degree RotSprite command preserves its palette and visibly turns a centered motif', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/studio');
  const canvas = page.getByTestId('main-composite-canvas');
  await expect(canvas).toBeVisible();
  await expect.poll(() => page.evaluate(() => Boolean((window as Window & { __studioStore?: unknown }).__studioStore))).toBe(true);
  await page.evaluate(() => (window as Window & { __studioStore?: { getState: () => { setCanvasSize: (w: number, h: number) => void } } }).__studioStore!.getState().setCanvasSize(64, 64));
  await page.locator('input[type=file]').first().setInputFiles({ name: 'motif.png', mimeType: 'image/png', buffer: await centeredMotifPng(page) });
  const dialog = page.getByRole('dialog', { name: 'Import Image' });
  await dialog.getByRole('button', { name: 'Import Image', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect.poll(() => canvas.evaluate((element: HTMLCanvasElement) => Array.from(element.getContext('2d')!.getImageData(28, 28, 1, 1).data))).toEqual([255, 0, 0, 255]);
  const before = await canvas.evaluate((element: HTMLCanvasElement) => Array.from(element.getContext('2d')!.getImageData(0, 0, 64, 64).data));
  const editRevision = await page.evaluate(() => (window as Window & { __studioStore?: { getState: () => { editRevision: number } } }).__studioStore!.getState().editRevision);
  await page.getByRole('button', { name: 'PixiTools' }).click();
  await page.getByTestId('pixitools-task-polish').click();
  const cleanupPanel = page.getByRole('button', { name: 'Pixel Cleanup & RotSprite (Atelier Assistants & Ramps)' });
  if (await cleanupPanel.getAttribute('aria-expanded') === 'false') await cleanupPanel.click();
  await page.getByRole('button', { name: '+45°' }).click();
  await expect.poll(() => page.evaluate(() => (window as Window & { __studioStore?: { getState: () => { editRevision: number } } }).__studioStore!.getState().editRevision), { timeout: 30_000 }).toBeGreaterThan(editRevision);
  const after = await canvas.evaluate((element: HTMLCanvasElement) => Array.from(element.getContext('2d')!.getImageData(0, 0, 64, 64).data));
  expect(after).not.toEqual(before);
  const colors = new Set<string>();
  for (let i = 0; i < after.length; i += 4) {
    if (after[i + 3] > 0) colors.add(after.slice(i, i + 4).join(','));
  }
  expect(colors).toEqual(new Set(['255,0,0,255', '0,0,255,255']));
});

test('Rotate Cleanly keeps an outlined circle closed at 45 degrees', async ({ page }) => {
  await page.goto('/studio');
  const canvas = page.getByTestId('main-composite-canvas');
  await expect(canvas).toBeVisible();
  const base64 = await page.evaluate((rows) => {
    const image = document.createElement('canvas');
    image.width = image.height = 32;
    const ctx = image.getContext('2d')!;
    rows.forEach((row, rowIndex) => [...row].forEach((glyph, x) => {
      if (glyph === '.') return;
      ctx.fillStyle = glyph === '#' ? '#2e203d' : '#b278ca';
      ctx.fillRect(x, rowIndex + 8, 1, 1);
    }));
    return image.toDataURL('image/png').split(',')[1];
  }, OUTLINED_CIRCLE_ROWS);
  await page.locator('input[type=file]').first().setInputFiles({ name: 'outlined-circle.png', mimeType: 'image/png', buffer: Buffer.from(base64, 'base64') });
  const dialog = page.getByRole('dialog', { name: 'Import Image' });
  await dialog.getByRole('button', { name: 'Import Image', exact: true }).click();
  await expect(dialog).toBeHidden();
  const revision = await page.evaluate(() => (window as Window & { __studioStore?: { getState: () => { editRevision: number } } }).__studioStore!.getState().editRevision);
  await page.getByRole('button', { name: 'PixiTools' }).click();
  await page.getByTestId('pixitools-task-polish').click();
  const cleanupPanel = page.getByRole('button', { name: 'Pixel Cleanup & RotSprite (Atelier Assistants & Ramps)' });
  if (await cleanupPanel.getAttribute('aria-expanded') === 'false') await cleanupPanel.click();
  await page.getByRole('button', { name: '+45°' }).click();
  await expect.poll(() => page.evaluate(() => (window as Window & { __studioStore?: { getState: () => { editRevision: number } } }).__studioStore!.getState().editRevision)).toBeGreaterThan(revision);
  const result = await canvas.evaluate((element: HTMLCanvasElement) => {
    const { width, height } = element;
    const data = element.getContext('2d')!.getImageData(0, 0, width, height).data;
    const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < width && y < height && data[(y * width + x) * 4 + 3] !== 0;
    let leaks = 0, filled = 0;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (data[i + 3] === 0) continue;
      const interior = solid(x - 1, y) && solid(x + 1, y) && solid(x, y - 1) && solid(x, y + 1);
      const expected = interior ? [178, 120, 202, 255] : [46, 32, 61, 255];
      if (expected.some((value, channel) => data[i + channel] !== value)) leaks++;
      filled++;
    }
    return { leaks, filled };
  });
  expect(result.leaks).toBe(0);
  expect(result.filled).toBeGreaterThan(150);
});
