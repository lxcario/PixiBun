import { expect, test } from '@playwright/test';

type StudioState = {
  setCanvasSize: (width: number, height: number) => void;
  setActiveTool: (tool: 'pen' | 'select-lasso') => void;
  setPrimaryColor: (color: string) => void;
  selectionMask: Uint8Array | null;
};

test('lasso hover leaves artwork and preview untouched', async ({ page }) => {
  await page.goto('/studio');
  await expect(page.locator('[data-restoration-phase]')).toHaveAttribute('data-restoration-phase', 'active');
  const artwork = page.getByTestId('main-composite-canvas');
  const preview = page.getByTestId('stroke-preview-canvas');
  await expect(artwork).toBeVisible();
  await page.evaluate(() => (window as Window & { __studioStore?: { getState: () => StudioState } }).__studioStore!.getState().setActiveTool('select-lasso'));
  const stage = await page.locator('#center-canvas-area').boundingBox();
  expect(stage).not.toBeNull();
  await page.mouse.move(stage!.x + 8.5 * 16, stage!.y + 8.5 * 16);
  await page.mouse.move(stage!.x + 20.5 * 16, stage!.y + 20.5 * 16, { steps: 8 });
  expect(await preview.evaluate((canvas: HTMLCanvasElement) => {
    const data = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
    return data.some((value, index) => index % 4 === 3 && value !== 0);
  })).toBe(false);
  expect(await artwork.evaluate((canvas: HTMLCanvasElement) => {
    const data = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
    return data.some((value, index) => index % 4 === 3 && value !== 0);
  })).toBe(false);
});

test('scaling and rotating a lasso does not pick up excluded pixels or leave a tint ghost', async ({ page }) => {
  await page.goto('/studio');
  await expect(page.locator('[data-restoration-phase]')).toHaveAttribute('data-restoration-phase', 'active');
  const artwork = page.getByTestId('main-composite-canvas');
  const tint = page.getByTestId('selection-overlay-canvas');
  await expect(artwork).toBeVisible();
  await page.evaluate(() => {
    const state = (window as Window & { __studioStore?: { getState: () => StudioState } }).__studioStore!.getState();
    state.setCanvasSize(32, 32);
    state.setActiveTool('pen');
  });
  // Aim from the artwork's own box: its place in the stage depends on the desk layout.
  await expect.poll(() => artwork.evaluate((c: HTMLCanvasElement) => c.width)).toBe(32);
  const box = (await artwork.boundingBox())!;
  const at = (x: number, y: number) => ({ x: box.x + (x + 0.5) * box.width / 32, y: box.y + (y + 0.5) * box.height / 32 });
  await page.evaluate(() => (window as Window & { __studioStore?: { getState: () => StudioState } }).__studioStore!.getState().setPrimaryColor('#ff0000'));
  await page.mouse.click(at(10, 10).x, at(10, 10).y);
  await page.evaluate(() => (window as Window & { __studioStore?: { getState: () => StudioState } }).__studioStore!.getState().setPrimaryColor('#0000ff'));
  await page.mouse.click(at(20, 20).x, at(20, 20).y);
  await page.evaluate(() => (window as Window & { __studioStore?: { getState: () => StudioState } }).__studioStore!.getState().setActiveTool('select-lasso'));

  await page.mouse.move(at(6, 6).x, at(6, 6).y);
  await page.mouse.down();
  await page.mouse.move(at(25, 6).x, at(25, 6).y, { steps: 5 });
  await page.mouse.move(at(6, 25).x, at(6, 25).y, { steps: 5 });
  await page.mouse.move(at(6, 6).x, at(6, 6).y, { steps: 5 });
  await page.mouse.up();
  await expect.poll(() => page.evaluate(() => {
    const mask = (window as Window & { __studioStore?: { getState: () => StudioState } }).__studioStore!.getState().selectionMask;
    return mask ? [mask[10 * 32 + 10], mask[20 * 32 + 20]].join(',') : '';
  })).toBe('1,0');

  const handle = page.getByTestId('gizmo-handle-br');
  const handleBox = await handle.boundingBox();
  expect(handleBox).not.toBeNull();
  await page.mouse.move(handleBox!.x + handleBox!.width / 2, handleBox!.y + handleBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(handleBox!.x + handleBox!.width / 2 + 32, handleBox!.y + handleBox!.height / 2 + 32, { steps: 5 });
  await page.mouse.up();
  await expect.poll(() => tint.evaluate((canvas: HTMLCanvasElement) => {
    const data = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
    return data.some((value, index) => index % 4 === 3 && value !== 0);
  })).toBe(false);

  await page.getByTitle(/Rotate 90° CW/i).click();
  const rotationZone = page.getByTestId('gizmo-rotate-tr');
  const rotationBox = await rotationZone.boundingBox();
  expect(rotationBox).not.toBeNull();
  const rotationX = rotationBox!.x + rotationBox!.width / 2;
  const rotationY = rotationBox!.y + rotationBox!.height / 2;
  await page.mouse.move(rotationX, rotationY);
  await page.mouse.down();
  await page.mouse.move(rotationX + 70, rotationY + 30, { steps: 6 });
  await page.mouse.up();
  await expect(page.getByTestId('gizmo-degree-badge')).not.toHaveText('90.0°');
  await page.getByTestId('gizmo-commit-btn').click({ force: true });
  await expect.poll(() => page.getByTestId('selection-transform-gizmo').count()).toBe(0);
  const colors = await artwork.evaluate((canvas: HTMLCanvasElement) => {
    const data = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
    let red = 0;
    let blue = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] === 255 && data[i + 1] === 0 && data[i + 2] === 0 && data[i + 3] === 255) red++;
      if (data[i] === 0 && data[i + 1] === 0 && data[i + 2] === 255 && data[i + 3] === 255) blue++;
    }
    return { red, blue, excludedPixel: Array.from(data.slice((20 * canvas.width + 20) * 4, (20 * canvas.width + 20) * 4 + 4)) };
  });
  expect(colors.red).toBeGreaterThan(0);
  expect(colors.blue).toBe(1);
  expect(colors.excludedPixel).toEqual([0, 0, 255, 255]);
});

test('Delete removes only lasso pixels and clears any stale preview', async ({ page }) => {
  await page.goto('/studio');
  await expect(page.locator('[data-restoration-phase]')).toHaveAttribute('data-restoration-phase', 'active');
  const artwork = page.getByTestId('main-composite-canvas');
  const preview = page.getByTestId('stroke-preview-canvas');
  await expect(artwork).toBeVisible();
  await page.evaluate(() => {
    const state = (window as Window & { __studioStore?: { getState: () => StudioState } }).__studioStore!.getState();
    state.setCanvasSize(32, 32);
    state.setActiveTool('pen');
    state.setPrimaryColor('#ff0000');
  });
  // Aim from the artwork's own box: its place in the stage depends on the desk layout.
  await expect.poll(() => artwork.evaluate((c: HTMLCanvasElement) => c.width)).toBe(32);
  const box = (await artwork.boundingBox())!;
  const at = (x: number, y: number) => ({ x: box.x + (x + 0.5) * box.width / 32, y: box.y + (y + 0.5) * box.height / 32 });
  await page.mouse.click(at(10, 10).x, at(10, 10).y);
  await page.evaluate(() => (window as Window & { __studioStore?: { getState: () => StudioState } }).__studioStore!.getState().setPrimaryColor('#0000ff'));
  await page.mouse.click(at(20, 20).x, at(20, 20).y);
  await page.evaluate(() => (window as Window & { __studioStore?: { getState: () => StudioState } }).__studioStore!.getState().setActiveTool('select-lasso'));
  await page.mouse.move(at(6, 6).x, at(6, 6).y);
  await page.mouse.down();
  await page.mouse.move(at(25, 6).x, at(25, 6).y, { steps: 5 });
  await page.mouse.move(at(6, 25).x, at(6, 25).y, { steps: 5 });
  await page.mouse.move(at(6, 6).x, at(6, 6).y, { steps: 5 });
  await page.mouse.up();
  await expect.poll(() => page.evaluate(() => {
    const mask = (window as Window & { __studioStore?: { getState: () => StudioState } }).__studioStore!.getState().selectionMask;
    return mask ? [mask[10 * 32 + 10], mask[20 * 32 + 20]].join(',') : '';
  })).toBe('1,0');

  await preview.evaluate((canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#c792df';
    ctx.fillRect(10, 10, 1, 1);
  });
  await page.keyboard.press('Delete');
  await expect.poll(() => artwork.evaluate((canvas: HTMLCanvasElement) => {
    const data = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
    const alpha = (x: number, y: number) => data[(y * canvas.width + x) * 4 + 3];
    return [alpha(10, 10), alpha(20, 20)].join(',');
  })).toBe('0,255');
  expect(await preview.evaluate((canvas: HTMLCanvasElement) =>
    canvas.getContext('2d')!.getImageData(10, 10, 1, 1).data[3]
  )).toBe(0);
  expect(await page.evaluate(() => (window as Window & { __studioStore?: { getState: () => StudioState & { selection: unknown } } }).__studioStore!.getState().selection)).toBeNull();
});
