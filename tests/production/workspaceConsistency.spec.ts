import { expect, test, type Page } from '@playwright/test';

test('compiled Lighting opens its task even when session storage rejects writes', async ({ page }) => {
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      if (this === window.sessionStorage) throw new DOMException('Storage denied', 'SecurityError');
      return original.call(this, key, value);
    };
  });
  await ready(page); const artwork = await pixels(page);
  await page.getByLabel('Workspace layout').selectOption('lighting');
  await expect(page.getByRole('heading', { name: 'Add light and depth', exact: true })).toBeVisible();
  await page.getByTestId('tab-tools').click(); await page.getByTestId('tab-ai').click();
  await expect(page.getByRole('heading', { name: 'Add light and depth', exact: true })).toBeVisible();
  expect(await pixels(page)).toEqual(artwork);
});

const pixels = (page: Page) => page.getByTestId('main-composite-canvas').evaluate((c: HTMLCanvasElement) => Array.from(c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data));
async function ready(page: Page, width = 1280) {
  await page.setViewportSize({ width, height: 900 }); await page.goto('/studio');
  await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  await expect(page.getByTestId('main-composite-canvas')).toBeVisible();
}
async function paint(page: Page, from: [number, number], to = from) {
  const box = (await page.getByTestId('main-composite-canvas').boundingBox())!;
  const point = (p: [number, number]) => page.mouse.move(box.x + (p[0] + 0.5) * box.width / 32, box.y + (p[1] + 0.5) * box.height / 32);
  await point(from);
  // A surface that just closed may take a moment to leave; report what still covers the start if it never does.
  await expect.poll(() => page.evaluate(({ x, y }) => {
    const hit = document.elementFromPoint(x, y);
    return hit?.closest('#center-canvas-area')?.id ?? `${hit?.tagName.toLowerCase()}.${hit?.className}`;
  }, { x: box.x + (from[0] + 0.5) * box.width / 32, y: box.y + (from[1] + 0.5) * box.height / 32 }),
  { message: 'The real mouse start must reach the drawing surface' }).toBe('center-canvas-area');
  await page.mouse.down(); await point(to); await page.mouse.up();
}
async function palette(page: Page, query: string) {
  await page.locator('#center-canvas-area').focus(); await page.keyboard.press('Control+k');
  const input = page.getByRole('combobox', { name: 'Search studio commands' });
  await expect(input).toBeFocused(); await input.fill(query); return input;
}
async function save(page: Page) {
  await page.getByTestId('save-button').click();
  await expect(page.locator('[role="status"]').filter({ hasText: /Changes saved/ })).toBeVisible();
}

test('compiled command search contains focus, empty results and unavailable history, and hands focus to the next dialog', async ({ page }) => {
  await ready(page); const blank = await pixels(page), opener = page.locator('#center-canvas-area');
  const input = await palette(page, 'Undo');
  await expect(page.getByRole('listbox', { name: 'Studio commands' }).getByRole('option')).toHaveAttribute('aria-disabled', 'true');
  await input.press('Enter'); await expect(input).toBeVisible();
  await input.fill('no matching command'); await input.press('ArrowUp'); await input.press('ArrowDown'); await input.press('Enter');
  await expect(input).not.toHaveAttribute('aria-activedescendant');
  await input.fill('');
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press(i % 2 ? 'Shift+Tab' : 'Tab');
    expect(await page.evaluate(() => Boolean(document.activeElement?.closest('dialog[open]')))).toBe(true);
  }
  await input.focus(); await input.press('Escape'); await expect(opener).toBeFocused();
  await (await palette(page, 'Gallery')).press('Enter');
  const gallery = page.getByRole('dialog', { name: 'Projects & Gallery' });
  await expect(gallery).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.activeElement?.closest('dialog')?.getAttribute('aria-labelledby'))).toBe(await gallery.getAttribute('aria-labelledby'));
  await page.keyboard.press('Tab'); expect(await page.evaluate(() => Boolean(document.activeElement?.closest('dialog[open]')))).toBe(true);
  await gallery.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await expect(opener).toBeFocused(); expect(await pixels(page)).toEqual(blank);
});

test('compiled onion and grid commands match their advertised gestures and leave artwork intact', async ({ page }) => {
  await ready(page); await paint(page, [5, 5]); const artwork = await pixels(page);
  await (await palette(page, 'Ellipse')).press('Enter'); await expect(page.getByTestId('ellipse-tool')).toHaveAttribute('aria-pressed', 'true');
  let input = await palette(page, 'Onion'); await expect(page.getByRole('listbox', { name: 'Studio commands' }).getByRole('option')).toContainText('F3');
  await input.press('Enter'); const toggle = page.getByRole('button', { name: 'Onion Skin', exact: true });
  const after = await toggle.getAttribute('aria-pressed');
  await page.locator('#center-canvas-area').focus(); await page.keyboard.press('F3'); await expect(toggle).toHaveAttribute('aria-pressed', after === 'true' ? 'false' : 'true');
  const grid = page.getByTestId('grid-selection-overlay');
  const gridImage = () => grid.evaluate(el => el.style.backgroundImage);
  const before = await gridImage();
  await page.keyboard.press("Control+'"); await expect.poll(gridImage).not.toBe(before);
  input = await palette(page, 'Toggle Pixel Grid'); await expect(page.getByRole('listbox', { name: 'Studio commands' }).getByRole('option')).toContainText("Ctrl+'"); await input.press('Enter');
  await expect.poll(gridImage).toBe(before); expect(await pixels(page)).toEqual(artwork);
});

test('compiled Fit is identical through header, keyboard, navigator and palette, including large artwork', async ({ page }) => {
  await ready(page); await page.getByLabel('Workspace layout').selectOption('animation');
  const headerZoom = page.getByRole('button', { name: /Choose zoom level/ });
  for (const large of [false, true]) {
    if (large) {
      const fixture = await page.evaluate(() => {
        const c = document.createElement('canvas'); c.width = c.height = 1024;
        const ctx = c.getContext('2d')!; ctx.fillStyle = '#ff0000'; ctx.fillRect(0, 0, 1, 1);
        return { format: 'pixibun-project', version: 3, name: 'Large fit fixture', width: 1024, height: 1024, fps: 8, loopMode: 'repeat', palettes: [{ id: 'colors', name: 'Colors', colors: ['#ff0000'] }], currentPaletteId: 'colors', customRamps: [], clips: [], frames: [{ id: 'frame', durationMs: 100, layers: [{ id: 'body', name: 'Body', visible: true, locked: false, opacity: 1, blendMode: 'source-over', pngBase64: c.toDataURL('image/png').split(',')[1] }] }], createdAt: 1, updatedAt: 1 };
      });
      await page.locator('input[type=file]').first().setInputFiles({ name: 'large.pixibun', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(fixture)) });
      const dialog = page.getByRole('dialog', { name: 'Import Project (.pixibun)' }); await dialog.getByRole('button', { name: 'Confirm Import' }).click(); await expect(dialog).toBeHidden();
    }
    const png = () => page.getByTestId('main-composite-canvas').evaluate((c: HTMLCanvasElement) => c.toDataURL());
    const artwork = await png(); await page.getByTestId('fit-canvas-button').click(); const fitted = await headerZoom.textContent();
    if (large) expect(parseInt(fitted!, 10)).toBeLessThan(100);
    for (const action of ['keyboard', 'navigator', 'palette']) {
      await (await palette(page, '100% Actual')).press('Enter');
      if (action === 'keyboard') { await page.locator('#center-canvas-area').focus(); await page.keyboard.press('Control+0'); }
      if (action === 'navigator') await page.getByRole('region', { name: 'Canvas navigator' }).getByRole('button', { name: 'Fit canvas', exact: true }).click();
      if (action === 'palette') await (await palette(page, 'Fit Canvas')).press('Enter');
      await expect(headerZoom).toHaveText(fitted!);
    }
    expect(await png()).toEqual(artwork);
  }
});

test('compiled navigator keeps square pixels and aligns clicks, drag, keyboard and full zoom range', async ({ page }, testInfo) => {
  await ready(page); await paint(page, [5, 5]); const artwork = await pixels(page);
  await page.getByLabel('Workspace layout').selectOption('animation');
  const slider = page.getByLabel('Navigator zoom slider'); await slider.fill('6400'); await expect(slider).toHaveValue('6400');
  const overview = page.getByTestId('navigator-canvas'), bounds = page.getByTestId('navigator-view-bounds');
  // Layout size, not the bounding box: an inspector spring can still be scaling it.
  const aspect = () => overview.evaluate((c: HTMLCanvasElement) => c.offsetWidth / c.offsetHeight);
  expect(await aspect()).toBeCloseTo(2, 5);
  const box = (await overview.boundingBox())!;
  // CSS serializes fractional dimensions with limited precision; allow 0.01px.
  const center = () => bounds.evaluate(el => ({ x: Math.round((parseFloat(el.style.left) + parseFloat(el.style.width) / 2) * 100) / 100, y: Math.round((parseFloat(el.style.top) + parseFloat(el.style.height) / 2) * 100) / 100 }));
  // Where the browser actually delivered the pointer, in overview pixels. Engines
  // round requested coordinates differently (Firefox to whole CSS pixels).
  await overview.evaluate((c: HTMLCanvasElement) => {
    const record = (e: PointerEvent) => { const r = c.getBoundingClientRect(); c.dataset.pointer = JSON.stringify({ x: (e.clientX - r.left) * 224 / r.width, y: (e.clientY - r.top) * 112 / r.height }); };
    c.addEventListener('pointerdown', record); c.addEventListener('pointermove', record);
  });
  const delivered = async () => JSON.parse((await overview.getAttribute('data-pointer'))!) as { x: number; y: number };
  // Pan is stored in whole screen pixels, so at 6400% the view stops on a grid of
  // 1/64 art pixel: allow half of that step in overview pixels, plus CSS rounding.
  const [artW, artH] = await page.getByTestId('main-composite-canvas').evaluate((c: HTMLCanvasElement) => [c.width, c.height]);
  const step = 0.5 * Math.min(224 / artW, 112 / artH) / 64 + 0.01;
  const near = (target: { x: number; y: number }) => expect.poll(async () => {
    const at = await center(); return Math.max(Math.abs(at.x - target.x), Math.abs(at.y - target.y));
  }, { message: `view centre within ${step.toFixed(3)} of ${target.x},${target.y}` }).toBeLessThanOrEqual(step);
  await page.mouse.click(box.x + 140, box.y + 56);
  const clicked = await delivered(); expect(Math.abs(clicked.x - 140)).toBeLessThanOrEqual(1); expect(Math.abs(clicked.y - 56)).toBeLessThanOrEqual(1);
  await near(clicked);
  await page.mouse.move(box.x + 140, box.y + 56); await page.mouse.down(); await page.mouse.move(box.x + 84, box.y + 42); await page.mouse.up();
  const dragged = await delivered(); expect(Math.abs(dragged.x - 84)).toBeLessThanOrEqual(1); expect(Math.abs(dragged.y - 42)).toBeLessThanOrEqual(1);
  await near(dragged);
  const navButton = page.getByRole('button', { name: /^Canvas overview/ }); await expect(navButton).toBeFocused();
  // Keyboard steps move the stored pan by whole pixels, so they are exact.
  const settled = await center();
  await navButton.press('ArrowRight'); await expect.poll(center).toEqual({ x: Math.round((settled.x + 3.5) * 100) / 100, y: settled.y });
  await navButton.press('Shift+ArrowDown'); await expect.poll(center).toEqual({ x: Math.round((settled.x + 3.5) * 100) / 100, y: Math.round((settled.y + 28) * 100) / 100 });
  await navButton.press('Enter'); await expect.poll(center).toEqual({ x: 112, y: 56 });
  if (testInfo.project.name === 'chromium') await page.getByRole('region', { name: 'Canvas navigator' }).screenshot({ path: testInfo.outputPath('navigator.png') });
  for (const width of [1024, 1600]) { await page.setViewportSize({ width, height: 900 }); expect(await aspect()).toBeCloseTo(2, 5); }
  expect(await pixels(page)).toEqual(artwork);
});

test('compiled Lighting and custom task layouts restore across sessions without modifying artwork', async ({ page }, testInfo) => {
  await ready(page); await paint(page, [5, 5]); const artwork = await pixels(page); await save(page);
  await page.getByLabel('Workspace layout').selectOption('lighting');
  await expect(page.getByTestId('tab-ai')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('heading', { name: 'Add light and depth', exact: true })).toBeVisible();
  if (testInfo.project.name === 'chromium') await page.screenshot({ path: testInfo.outputPath('lighting-workspace.png') });
  await page.evaluate(() => sessionStorage.clear()); await page.reload(); await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  await expect(page.getByTestId('tab-ai')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('heading', { name: 'Add light and depth', exact: true })).toBeVisible();
  await page.getByTestId('tab-palette').click(); await page.getByRole('button', { name: 'View options menu', exact: true }).click();
  await page.getByRole('button', { name: 'Arrange...', exact: true }).click();
  await page.getByLabel('New workspace name').fill('Color desk'); await page.getByRole('button', { name: 'Save layout', exact: true }).click();
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click(); await page.getByLabel('Workspace layout').selectOption('animation');
  await expect(page.getByTestId('tab-layers')).toHaveAttribute('aria-pressed', 'true');
  await page.getByLabel('Workspace layout').selectOption({ label: 'Color desk' }); await expect(page.getByTestId('tab-palette')).toHaveAttribute('aria-pressed', 'true');
  await page.reload(); await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  await expect(page.getByTestId('tab-palette')).toHaveAttribute('aria-pressed', 'true'); expect(await pixels(page)).toEqual(artwork);
});

test('compiled header keeps mouse history accessible at compact widths and tool activation clears its preview', async ({ page }, testInfo) => {
  await ready(page);
  for (const width of [1024, 1280, 1600]) {
    await page.setViewportSize({ width, height: 900 }); const original = await pixels(page); await paint(page, [6, 6], [9, 6]);
    const drawn = await pixels(page); expect(drawn).not.toEqual(original);
    await page.getByTestId('undo-button').click({ timeout: 5000 }); await expect.poll(() => pixels(page)).toEqual(original);
    await page.getByTestId('redo-button').click({ timeout: 5000 }); await expect.poll(() => pixels(page)).toEqual(drawn);
    if (testInfo.project.name === 'chromium' && width === 1280) await page.locator('header').first().screenshot({ path: testInfo.outputPath('header-1280.png') });
    await page.getByTestId('undo-button').click();
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  const dither = page.getByTestId('dither-tool'); await dither.hover();
  await expect(page.getByRole('group', { name: /Dither.*preview/ })).toBeVisible(); await dither.click();
  await expect(page.getByRole('group', { name: /Dither.*preview/ })).toBeHidden();
  await paint(page, [0, 8], [20, 8]);
  const drawn = await pixels(page); for (let x = 0; x <= 20; x++) expect(drawn[(8 * 32 + x) * 4 + 3]).toBe(x % 2 === 0 ? 255 : 0);
  await page.getByTestId('undo-button').click(); await expect.poll(() => pixels(page)).not.toEqual(drawn);
});
