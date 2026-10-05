# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: workspaceConsistency.spec.ts >> compiled navigator keeps square pixels and aligns clicks, drag, keyboard and full zoom range
- Location: tests\production\workspaceConsistency.spec.ts:88:5

# Error details

```
Error: expect(locator).toBeFocused() failed

Locator:  getByRole('button', { name: /^Canvas overview/ })
Expected: focused
Received: inactive
Timeout:  10000ms

Call log:
  - Expect "toBeFocused" with timeout 10000ms
  - waiting for getByRole('button', { name: /^Canvas overview/ })
    22 × locator resolved to <button type="button" class="relative w-[224px] h-[112px] shrink-0 p-0 outline-offset-2" aria-label="Canvas overview. Click or drag to pan; arrow keys pan, Shift moves eight pixels, Enter centers.">…</button>
       - unexpected value "inactive"

```

```yaml
- button "Canvas overview. Click or drag to pan; arrow keys pan, Shift moves eight pixels, Enter centers."
```

# Test source

```ts
  1   | import { expect, test, type Page } from '@playwright/test';
  2   | 
  3   | test('compiled Lighting opens its task even when session storage rejects writes', async ({ page }) => {
  4   |   await page.addInitScript(() => {
  5   |     const original = Storage.prototype.setItem;
  6   |     Storage.prototype.setItem = function(key, value) {
  7   |       if (this === window.sessionStorage) throw new DOMException('Storage denied', 'SecurityError');
  8   |       return original.call(this, key, value);
  9   |     };
  10  |   });
  11  |   await ready(page); const artwork = await pixels(page);
  12  |   await page.getByLabel('Workspace layout').selectOption('lighting');
  13  |   await expect(page.getByRole('heading', { name: 'Add light and depth', exact: true })).toBeVisible();
  14  |   await page.getByTestId('tab-tools').click(); await page.getByTestId('tab-ai').click();
  15  |   await expect(page.getByRole('heading', { name: 'Add light and depth', exact: true })).toBeVisible();
  16  |   expect(await pixels(page)).toEqual(artwork);
  17  | });
  18  | 
  19  | const pixels = (page: Page) => page.getByTestId('main-composite-canvas').evaluate((c: HTMLCanvasElement) => Array.from(c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data));
  20  | async function ready(page: Page, width = 1280) {
  21  |   await page.setViewportSize({ width, height: 900 }); await page.goto('/studio');
  22  |   await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  23  |   await expect(page.getByTestId('main-composite-canvas')).toBeVisible();
  24  | }
  25  | async function paint(page: Page, from: [number, number], to = from) {
  26  |   const box = (await page.getByTestId('main-composite-canvas').boundingBox())!;
  27  |   const point = (p: [number, number]) => page.mouse.move(box.x + (p[0] + 0.5) * box.width / 32, box.y + (p[1] + 0.5) * box.height / 32);
  28  |   await point(from); await page.mouse.down(); await point(to); await page.mouse.up();
  29  | }
  30  | async function palette(page: Page, query: string) {
  31  |   await page.locator('#center-canvas-area').focus(); await page.keyboard.press('Control+k');
  32  |   const input = page.getByRole('combobox', { name: 'Search studio commands' });
  33  |   await expect(input).toBeFocused(); await input.fill(query); return input;
  34  | }
  35  | async function save(page: Page) {
  36  |   await page.getByTestId('save-button').click();
  37  |   await expect(page.locator('[role="status"]').filter({ hasText: /Changes saved/ })).toBeVisible();
  38  | }
  39  | 
  40  | test('compiled command search contains focus, empty results and unavailable history, and hands focus to the next dialog', async ({ page }) => {
  41  |   await ready(page); const blank = await pixels(page), opener = page.locator('#center-canvas-area');
  42  |   const input = await palette(page, 'Undo');
  43  |   await expect(page.getByRole('listbox', { name: 'Studio commands' }).getByRole('option')).toHaveAttribute('aria-disabled', 'true');
  44  |   await input.press('Enter'); await expect(input).toBeVisible();
  45  |   await input.fill('no matching command'); await input.press('ArrowUp'); await input.press('ArrowDown'); await input.press('Enter');
  46  |   await expect(input).not.toHaveAttribute('aria-activedescendant');
  47  |   await input.fill('');
  48  |   for (let i = 0; i < 12; i++) {
  49  |     await page.keyboard.press(i % 2 ? 'Shift+Tab' : 'Tab');
  50  |     expect(await page.evaluate(() => Boolean(document.activeElement?.closest('dialog[open]')))).toBe(true);
  51  |   }
  52  |   await input.focus(); await input.press('Escape'); await expect(opener).toBeFocused();
  53  |   await (await palette(page, 'Gallery')).press('Enter');
  54  |   const gallery = page.getByRole('dialog', { name: 'Atelier Projects & Gallery' });
  55  |   await expect(gallery).toBeVisible();
  56  |   await expect.poll(() => page.evaluate(() => document.activeElement?.closest('dialog')?.getAttribute('aria-labelledby'))).toBe(await gallery.getAttribute('aria-labelledby'));
  57  |   await page.keyboard.press('Tab'); expect(await page.evaluate(() => Boolean(document.activeElement?.closest('dialog[open]')))).toBe(true);
  58  |   await gallery.getByRole('button', { name: 'Close dialog', exact: true }).click();
  59  |   await expect(opener).toBeFocused(); expect(await pixels(page)).toEqual(blank);
  60  | });
  61  | 
  62  | test('compiled onion and grid commands match their advertised gestures and leave artwork intact', async ({ page }) => {
  63  |   await ready(page); await paint(page, [5, 5]); const artwork = await pixels(page);
  64  |   await (await palette(page, 'Ellipse')).press('Enter'); await expect(page.getByTestId('ellipse-tool')).toHaveAttribute('aria-pressed', 'true');
  65  |   let input = await palette(page, 'Onion'); await expect(page.getByRole('listbox', { name: 'Studio commands' }).getByRole('option')).toContainText('F3');
  66  |   await input.press('Enter'); const toggle = page.getByRole('button', { name: 'Onion Skin', exact: true });
  67  |   const after = await toggle.getAttribute('aria-pressed');
  68  |   await page.locator('#center-canvas-area').focus(); await page.keyboard.press('F3'); await expect(toggle).toHaveAttribute('aria-pressed', after === 'true' ? 'false' : 'true');
  69  |   const grid = page.getByTestId('grid-selection-overlay');
  70  |   const gridImage = () => grid.evaluate(el => el.style.backgroundImage);
  71  |   const before = await gridImage();
  72  |   await page.keyboard.press("Control+'"); await expect.poll(gridImage).not.toBe(before);
  73  |   input = await palette(page, 'Toggle Pixel Grid'); await expect(page.getByRole('listbox', { name: 'Studio commands' }).getByRole('option')).toContainText("Ctrl+'"); await input.press('Enter');
  74  |   await expect.poll(gridImage).toBe(before); expect(await pixels(page)).toEqual(artwork);
  75  | });
  76  | 
  77  | test('compiled Fit is identical through header, keyboard, navigator and palette, including large artwork', async ({ page }) => {
  78  |   await ready(page); await page.getByLabel('Workspace layout').selectOption('animation');
  79  |   const headerZoom = page.getByRole('button', { name: /Choose zoom level/ });
  80  |   for (const large of [false, true]) {
  81  |     if (large) {
  82  |       const fixture = await page.evaluate(() => {
  83  |         const c = document.createElement('canvas'); c.width = c.height = 1024;
  84  |         const ctx = c.getContext('2d')!; ctx.fillStyle = '#ff0000'; ctx.fillRect(0, 0, 1, 1);
  85  |         return { format: 'pixibun-project', version: 3, name: 'Large fit fixture', width: 1024, height: 1024, fps: 8, loopMode: 'repeat', palettes: [{ id: 'colors', name: 'Colors', colors: ['#ff0000'] }], currentPaletteId: 'colors', customRamps: [], clips: [], frames: [{ id: 'frame', durationMs: 100, layers: [{ id: 'body', name: 'Body', visible: true, locked: false, opacity: 1, blendMode: 'source-over', pngBase64: c.toDataURL('image/png').split(',')[1] }] }], createdAt: 1, updatedAt: 1 };
  86  |       });
  87  |       await page.locator('input[type=file]').first().setInputFiles({ name: 'large.pixibun', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(fixture)) });
  88  |       const dialog = page.getByRole('dialog', { name: 'Import Project (.pixibun)' }); await dialog.getByRole('button', { name: 'Confirm Import' }).click(); await expect(dialog).toBeHidden();
  89  |     }
  90  |     const png = () => page.getByTestId('main-composite-canvas').evaluate((c: HTMLCanvasElement) => c.toDataURL());
  91  |     const artwork = await png(); await page.getByTestId('fit-canvas-button').click(); const fitted = await headerZoom.textContent();
  92  |     if (large) expect(parseInt(fitted!, 10)).toBeLessThan(100);
  93  |     for (const action of ['keyboard', 'navigator', 'palette']) {
  94  |       await (await palette(page, '100% Actual')).press('Enter');
  95  |       if (action === 'keyboard') { await page.locator('#center-canvas-area').focus(); await page.keyboard.press('Control+0'); }
  96  |       if (action === 'navigator') await page.getByRole('region', { name: 'Canvas navigator' }).getByRole('button', { name: 'Fit canvas', exact: true }).click();
  97  |       if (action === 'palette') await (await palette(page, 'Fit Canvas')).press('Enter');
  98  |       await expect(headerZoom).toHaveText(fitted!);
> 99  |     }
      |                                                                                                     ^ Error: expect(locator).toBeFocused() failed
  100 |     expect(await png()).toEqual(artwork);
  101 |   }
  102 | });
  103 | 
  104 | test('compiled navigator keeps square pixels and aligns clicks, drag, keyboard and full zoom range', async ({ page }, testInfo) => {
  105 |   await ready(page); await paint(page, [5, 5]); const artwork = await pixels(page);
  106 |   await page.getByLabel('Workspace layout').selectOption('animation');
  107 |   const slider = page.getByLabel('Navigator zoom slider'); await slider.fill('6400'); await expect(slider).toHaveValue('6400');
  108 |   const overview = page.getByTestId('navigator-canvas'), bounds = page.getByTestId('navigator-view-bounds');
  109 |   const box = (await overview.boundingBox())!; expect(box.width / box.height).toBeCloseTo(2, 5);
  110 |   // CSS serializes fractional dimensions with limited precision; allow 0.01px.
  111 |   const center = () => bounds.evaluate(el => ({ x: Math.round((parseFloat(el.style.left) + parseFloat(el.style.width) / 2) * 100) / 100, y: Math.round((parseFloat(el.style.top) + parseFloat(el.style.height) / 2) * 100) / 100 }));
  112 |   await page.mouse.click(box.x + 140, box.y + 56); await expect.poll(center).toEqual({ x: 140, y: 56 });
  113 |   await page.mouse.move(box.x + 140, box.y + 56); await page.mouse.down(); await page.mouse.move(box.x + 84, box.y + 42); await page.mouse.up();
  114 |   await expect.poll(center).toEqual({ x: 84, y: 42 });
  115 |   const navButton = page.getByRole('button', { name: /^Canvas overview/ }); await expect(navButton).toBeFocused();
  116 |   await navButton.press('ArrowRight'); await expect.poll(center).toEqual({ x: 87.5, y: 42 });
  117 |   await navButton.press('Shift+ArrowDown'); await expect.poll(center).toEqual({ x: 87.5, y: 70 });
  118 |   await navButton.press('Enter'); await expect.poll(center).toEqual({ x: 112, y: 56 });
  119 |   if (testInfo.project.name === 'chromium') await page.getByRole('region', { name: 'Canvas navigator' }).screenshot({ path: 'docs/research/evidence/2026-10-05-audit-phase3/navigator.png' });
  120 |   for (const width of [1024, 1600]) { await page.setViewportSize({ width, height: 900 }); expect((await overview.boundingBox())!.width / (await overview.boundingBox())!.height).toBeCloseTo(2, 5); }
  121 |   expect(await pixels(page)).toEqual(artwork);
  122 | });
  123 | 
  124 | test('compiled Lighting and custom task layouts restore across sessions without modifying artwork', async ({ page }, testInfo) => {
  125 |   await ready(page); await paint(page, [5, 5]); const artwork = await pixels(page); await save(page);
  126 |   await page.getByLabel('Workspace layout').selectOption('lighting');
  127 |   await expect(page.getByTestId('tab-ai')).toHaveAttribute('aria-pressed', 'true');
  128 |   await expect(page.getByRole('heading', { name: 'Add light and depth', exact: true })).toBeVisible();
  129 |   if (testInfo.project.name === 'chromium') await page.screenshot({ path: 'docs/research/evidence/2026-10-05-audit-phase3/lighting-workspace.png' });
  130 |   await page.evaluate(() => sessionStorage.clear()); await page.reload(); await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  131 |   await expect(page.getByTestId('tab-ai')).toHaveAttribute('aria-pressed', 'true');
  132 |   await expect(page.getByRole('heading', { name: 'Add light and depth', exact: true })).toBeVisible();
  133 |   await page.getByTestId('tab-palette').click(); await page.getByRole('button', { name: 'View options menu', exact: true }).click();
  134 |   await page.getByRole('button', { name: 'Arrange...', exact: true }).click();
  135 |   await page.getByLabel('New workspace name').fill('Color desk'); await page.getByRole('button', { name: 'Save layout', exact: true }).click();
  136 |   await page.getByRole('button', { name: 'Close dialog', exact: true }).click(); await page.getByLabel('Workspace layout').selectOption('animation');
  137 |   await expect(page.getByTestId('tab-layers')).toHaveAttribute('aria-pressed', 'true');
  138 |   await page.getByLabel('Workspace layout').selectOption({ label: 'Color desk' }); await expect(page.getByTestId('tab-palette')).toHaveAttribute('aria-pressed', 'true');
  139 |   await page.reload(); await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  140 |   await expect(page.getByTestId('tab-palette')).toHaveAttribute('aria-pressed', 'true'); expect(await pixels(page)).toEqual(artwork);
  141 | });
  142 | 
  143 | test('compiled header keeps mouse history accessible at compact widths and tool activation clears its preview', async ({ page }, testInfo) => {
  144 |   await ready(page);
  145 |   for (const width of [1024, 1280, 1600]) {
  146 |     await page.setViewportSize({ width, height: 900 }); const original = await pixels(page); await paint(page, [6, 6], [9, 6]);
  147 |     const drawn = await pixels(page); expect(drawn).not.toEqual(original);
  148 |     await page.getByTestId('undo-button').click({ timeout: 5000 }); await expect.poll(() => pixels(page)).toEqual(original);
  149 |     await page.getByTestId('redo-button').click({ timeout: 5000 }); await expect.poll(() => pixels(page)).toEqual(drawn);
  150 |     if (testInfo.project.name === 'chromium' && width === 1280) await page.locator('header').first().screenshot({ path: 'docs/research/evidence/2026-10-05-audit-phase3/header-1280.png' });
  151 |     await page.getByTestId('undo-button').click();
  152 |   }
  153 |   await page.setViewportSize({ width: 1280, height: 900 });
  154 |   const dither = page.getByTestId('dither-tool'); await dither.hover();
  155 |   await expect(page.getByRole('group', { name: /Dither.*preview/ })).toBeVisible(); await dither.click();
  156 |   await expect(page.getByRole('group', { name: /Dither.*preview/ })).toBeHidden();
  157 |   await paint(page, [0, 8], [20, 8]);
  158 |   const drawn = await pixels(page); for (let x = 0; x <= 20; x++) expect(drawn[(8 * 32 + x) * 4 + 3]).toBe(x % 2 === 0 ? 255 : 0);
  159 |   await page.getByTestId('undo-button').click(); await expect.poll(() => pixels(page)).not.toEqual(drawn);
  160 | });
  161 | 
```