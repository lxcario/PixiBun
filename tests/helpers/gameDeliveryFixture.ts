import { expect, type Page } from '@playwright/test';

/** Original color/normal artwork enters through the production project importer. */
export async function importGameDeliveryFixture(page: Page, duplicate = false, options: { solid?: boolean; once?: boolean; previewOffset?: boolean; unrelatedPalette?: boolean; outlined?: boolean } = {}) {
  await page.goto('/studio'); await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  const project = await page.evaluate(({ duplicate, options }) => {
    // Multiples of five round-trip exactly through a native 20%-alpha canvas.
    const colors = Array.from({ length: 256 }, (_, i) => `#${((i % 52) * 5).toString(16).padStart(2, '0')}${(Math.floor(i / 52) * 5).toString(16).padStart(2, '0')}00`);
    if (duplicate) colors[255] = colors[0];
    const width = options.previewOffset ? 128 : 32, height = options.previewOffset ? 128 : options.outlined ? 32 : 16;
    const png = (normal: boolean, frame: number) => {
      const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d')!, data = ctx.createImageData(width, height);
      if (options.outlined && !normal) {
        for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
          const radius = Math.hypot(x - 15.5, y - 15.5);
          if (radius <= 11) data.data.set(radius > 10 ? [57, 45, 76, 255] : [199, 146, 219, 255], (y * width + x) * 4);
        }
        ctx.putImageData(data, 0, 0); return canvas.toDataURL('image/png').split(',')[1];
      }
      for (let y = 0; y < 16; y++) for (let x = 0; x < 32; x++) {
        const p = ((y + height - 16) * width + x + width - 32) * 4, register = (y * 16 + (x % 16) + frame) % 256;
        if (normal) data.data.set(frame === 1 ? (x < 16 ? [128, 240, 190, 255] : [128, 15, 190, 255]) : (x < 16 ? [240, 128, 190, 255] : [15, 128, 190, 255]), p);
        else if (options.solid) data.data.set([[255, 0, 0, 255], [0, 0, 255, 255], [0, 255, 0, 255]][frame], p);
        else {
          const rgb = colors[register].slice(1).match(/../g)!.map(c => parseInt(c, 16));
          // Right half deliberately exercises partial alpha independently of registers.
          data.data.set([...rgb, x < 16 ? 255 : (y === 0 ? 0 : 51)], p);
        }
      }
      ctx.putImageData(data, 0, 0); return canvas.toDataURL('image/png').split(',')[1];
    };
    return { format: 'pixibun-project', version: 3, name: 'Phase 5 original kit', width, height, fps: 12, loopMode: options.once ? 'once' : 'repeat',
      onionSkin: { enabled: false, prevFrames: 1, nextFrames: 1, prevColor: '#C792DF', nextColor: '#DCABDF', opacity: 0.45 },
      palettes: [{ id: 'kit-palette', name: 'Original 256', colors: options.unrelatedPalette ? Array.from({ length: 256 }, () => '#aa00cc') : colors, cycleTracks: [
        { id: 'forward', name: 'Discrete', low: 0, high: 63, rate: 2, direction: 'forward', blendShift: false, enabled: true },
        { id: 'reverse', name: 'Blend', low: 48, high: 127, rate: 1.5, direction: 'reverse', blendShift: true, enabled: true },
        { id: 'bounce', name: 'Bounce', low: 128, high: 255, rate: 3, direction: 'ping-pong', blendShift: true, enabled: true },
      ] }], currentPaletteId: 'kit-palette', customRamps: [],
      clips: [{ id: 'back', name: 'Back "left" 歩く', startFrame: 0, endFrame: 2, loopMode: 'reverse' },
        { id: 'bounce', name: 'Bounce', startFrame: 0, endFrame: 2, loopMode: 'ping-pong' }],
      frames: [70, 230, 110].map((durationMs, i) => ({ id: `fixture-frame-${i}`, durationMs, layers: [
        { id: `fixture-color-${i}`, name: 'Color', visible: true, locked: false, opacity: 1, blendMode: 'source-over', pngBase64: png(false, i) },
        ...(options.outlined ? [] : [{ id: `fixture-normal-${i}`, name: 'Normal', tag: 'normal-map', visible: false, locked: false, opacity: 1, blendMode: 'source-over', pngBase64: png(true, i) }]),
      ] })), createdAt: 1, updatedAt: 1 };
  }, { duplicate, options });
  await page.locator('input[type=file]').first().setInputFiles({ name: 'phase5-original.pixibun', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(project)) });
  const dialog = page.getByRole('dialog', { name: 'Import Project (.pixibun)' });
  await dialog.getByRole('button', { name: 'Confirm Import' }).click(); await expect(dialog).toBeHidden();
  await expect(page.getByRole('button', { name: /Select frame 3/ })).toBeVisible();
  return project;
}
