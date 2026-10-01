import { expect, test, type Page } from '@playwright/test';

async function selectedRange(page: Page) {
  return page.evaluate(() => {
    const state = (window as unknown as { __studioStore: { getState: () => {
      currentPaletteId: string; palettes: { id: string; cycleTracks?: { low: number; high: number }[] }[];
    } } }).__studioStore.getState();
    const track = state.palettes.find(p => p.id === state.currentPaletteId)?.cycleTracks?.[0];
    return track && { low: track.low, high: track.high };
  });
}

test('cycles only fire swatches while wood and outlines keep their exact source pixels', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.addInitScript(() => localStorage.setItem('pixibun:tool-previews-disabled', 'true'));
  await page.goto('/studio');
  await expect(page.locator('[data-restoration-phase]')).toHaveAttribute('data-restoration-phase', 'active');
  const image = await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#080808'; ctx.fillRect(7, 4, 18, 19); ctx.fillRect(3, 22, 26, 7);
    ['#C43C18', '#D88000', '#FF8C00', '#FFB833'].forEach((color, i) => {
      ctx.fillStyle = color; ctx.fillRect(8 + i * 4, 5, 4, 17);
    });
    // Deliberate original wood shades that differ from the brown palette register.
    for (let y = 23; y < 28; y++) for (let x = 4; x < 28; x++) {
      ctx.fillStyle = `rgb(${104 + x % 3},${70 + y % 2},40)`; ctx.fillRect(x, y, 1, 1);
    }
    return canvas.toDataURL('image/png').split(',')[1];
  });
  await page.locator('input[type=file]').first().setInputFiles({ name: 'fire-and-wood.png', mimeType: 'image/png', buffer: Buffer.from(image, 'base64') });
  const importer = page.getByRole('dialog', { name: 'Import Image' });
  await importer.getByRole('button', { name: 'Single Sprite / Layer' }).click();
  await importer.getByRole('button', { name: 'Import Image', exact: true }).click();
  await expect(importer).toBeHidden();
  await page.evaluate(() => (window as unknown as { __studioStore: { getState: () => {
    addExtractedPalette: (name: string, colors: string[]) => boolean;
  } } }).__studioStore.getState().addExtractedPalette('Fire + wood', ['#080808', '#664422', '#C43C18', '#D88000', '#FF8C00', '#FFB833']));
  const canvas = page.getByTestId('main-composite-canvas');
  const pixels = () => canvas.evaluate((c: HTMLCanvasElement) => Array.from(c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data));
  const original = await pixels();
  await page.getByRole('button', { name: 'Palette', exact: true }).click();
  const engine = page.getByRole('button', { name: 'Cycle Engine', exact: true });
  if (await engine.getAttribute('aria-expanded') === 'false') await engine.click();
  await page.getByRole('button', { name: 'Add Color Range Track' }).click();
  await page.getByRole('button', { name: 'Cycle 1', exact: true }).click();
  await page.getByRole('button', { name: 'Last color 5: #FFB833' }).click();
  await page.getByRole('button', { name: 'First color 2: #C43C18' }).click();
  await expect.poll(() => selectedRange(page)).toEqual({ low: 2, high: 5 });
  await page.getByLabel('Playback Speed').selectOption('1');
  await expect(page.getByLabel('Playback Speed')).toHaveValue('1');
  const first = await page.getByRole('group', { name: 'First cycle color' }).boundingBox();
  const last = await page.getByRole('group', { name: 'Last cycle color' }).boundingBox();
  expect(Math.abs(first!.width - last!.width)).toBeLessThan(1);
  await page.getByRole('button', { name: 'Play Cycle', exact: true }).click();
  await expect.poll(async () => (await pixels()).slice((5 * 32 + 8) * 4, (5 * 32 + 8) * 4 + 3))
    .not.toEqual(original.slice((5 * 32 + 8) * 4, (5 * 32 + 8) * 4 + 3));
  for (let frame = 0; frame < 3; frame++) {
    const actual = await pixels();
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
      if (x >= 8 && x < 24 && y >= 5 && y < 22) continue;
      const offset = (y * 32 + x) * 4;
      expect(actual.slice(offset, offset + 4)).toEqual(original.slice(offset, offset + 4));
    }
  }
  await page.screenshot({ path: testInfo.outputPath('fire-only-cycle.png') });
  await page.getByRole('button', { name: 'Pause Cycle', exact: true }).click();
  await expect.poll(pixels).toEqual(original);
  await page.getByTestId('undo-button').click();
  await expect.poll(() => selectedRange(page)).toEqual({ low: 0, high: 5 });
  await page.getByRole('button', { name: 'Redo last action' }).click();
  await expect.poll(() => selectedRange(page)).toEqual({ low: 2, high: 5 });
  await page.getByTestId('save-button').click();
  await expect(page.getByTestId('save-status-badge')).toContainText('Saved');
  await page.reload();
  await expect(page.locator('[data-restoration-phase]')).toHaveAttribute('data-restoration-phase', 'active');
  await expect.poll(() => selectedRange(page)).toEqual({ low: 2, high: 5 });
  await expect.poll(pixels).toEqual(original);
});
