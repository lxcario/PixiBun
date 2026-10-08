# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: canvasContextMenu.spec.ts >> the popup owns keys, swaps colors once, dismisses safely and stays inside a resized viewport
- Location: tests\production\canvasContextMenu.spec.ts:35:5

# Error details

```
Error: expect(locator).toBeFocused() failed

Locator:  locator('#center-canvas-area')
Expected: focused
Received: inactive
Timeout:  10000ms

Call log:
  - Expect "toBeFocused" with timeout 10000ms
  - waiting for locator('#center-canvas-area')
    23 × locator resolved to <div tabindex="0" role="application" data-tutorial="canvas" id="center-canvas-area" class="relative shrink-0 outline outline-1 outline-[var(--desk-border)] focus:ring-2 focus:ring-[var(--accent-gold)]" aria-label="Pixel art drawing canvas. Use mouse or stylus to paint, arrow keys to pan viewport or nudge selection, and Alt+drag to pan.">…</div>
       - unexpected value "inactive"

```

```yaml
- link "Skip to content":
  - /url: "#main-workspace"
- img "Bun, the PixiBun bunny"
- text: PIXIBUN ATELIER
- heading "Desk Too Small" [level=1]
- paragraph: PixiBun Atelier is a desktop workstation featuring multi-layer timelines, color ramps, and pixel math tools. Please open this studio on a laptop, desktop screen, or rotate your tablet to landscape mode (1024px+).
- link "Return Home":
  - /url: /
- link "Try Pocket Doodle Pad":
  - /url: /playground
- alert
```

# Test source

```ts
  1  | import { expect, test, type Page } from '@playwright/test';
  2  | 
  3  | const pixels = (page: Page) => page.getByTestId('main-composite-canvas').evaluate((canvas: HTMLCanvasElement) => Array.from(canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data));
  4  | async function open(page: Page) {
  5  |   const box = (await page.getByTestId('main-composite-canvas').boundingBox())!;
  6  |   await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { button: 'right' });
  7  |   await expect(page.getByRole('dialog', { name: 'Canvas tools', exact: true })).toBeVisible();
  8  | }
  9  | test.beforeEach(async ({ page }) => {
  10 |   await page.setViewportSize({ width: 1280, height: 900 });
  11 |   await page.goto('/studio?template=hearth-ghost');
  12 |   await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  13 | });
  14 | 
  15 | test('either mouse button selects every quick tool without painting or stealing the pointer', async ({ page }, info) => {
  16 |   const original = await pixels(page);
  17 |   for (const [id, name] of [['eraser', 'Eraser'], ['bucket', 'Flood Fill'], ['eyedropper', 'Eyedropper'], ['select-box', 'Marquee Box'], ['select-lasso', 'Lasso Select'], ['select-wand', 'Magic Wand'], ['line', 'Line'], ['rectangle', 'Rectangle'], ['ellipse', 'Ellipse'], ['pen', 'Pen']]) {
  18 |     for (const button of ['left', 'right'] as const) {
  19 |       await open(page);
  20 |       await page.getByRole('dialog', { name: 'Canvas tools', exact: true }).getByRole('button', { name, exact: true }).click({ button });
  21 |       await expect(page.getByRole('dialog', { name: 'Canvas tools', exact: true })).toHaveCount(0);
  22 |       await expect(page.getByTestId(`${id}-tool`)).toHaveAttribute('aria-pressed', 'true');
  23 |       expect(await pixels(page)).toEqual(original);
  24 |     }
  25 |   }
  26 |   await open(page);
  27 |   await page.getByRole('dialog', { name: 'Canvas tools', exact: true }).screenshot({ path: info.outputPath('canvas-tools.png') });
  28 |   await page.keyboard.press('Escape');
  29 |   const canvas = page.getByTestId('main-composite-canvas'), box = (await canvas.boundingBox())!;
  30 |   await page.mouse.click(box.x + box.width * .1, box.y + box.height * .1);
  31 |   await expect.poll(() => pixels(page)).not.toEqual(original);
  32 |   await page.getByTestId('undo-button').click(); await expect.poll(() => pixels(page)).toEqual(original);
  33 | });
  34 | 
  35 | test('the popup owns keys, swaps colors once, dismisses safely and stays inside a resized viewport', async ({ page }) => {
  36 |   const canvasFocus = page.locator('#center-canvas-area'); await canvasFocus.focus();
  37 |   const original = await pixels(page), originalBox = await page.getByTestId('main-composite-canvas').boundingBox();
  38 |   await open(page); const dialog = page.getByRole('dialog', { name: 'Canvas tools', exact: true });
  39 |   await expect(dialog.getByRole('button', { name: 'Pen', exact: true })).toBeFocused();
  40 |   await page.keyboard.press('ArrowRight'); await expect(dialog.getByRole('button', { name: 'Eraser', exact: true })).toBeFocused();
  41 |   for (const key of ['Control+z', 'Delete', 'e', 'ArrowDown', 'ArrowUp']) await page.keyboard.press(key);
  42 |   expect(await pixels(page)).toEqual(original); expect(await page.getByTestId('main-composite-canvas').boundingBox()).toEqual(originalBox);
  43 |   await page.keyboard.press('Enter'); await expect(dialog).toHaveCount(0); await expect(page.getByTestId('eraser-tool')).toHaveAttribute('aria-pressed', 'true'); await expect(canvasFocus).toBeFocused();
  44 |   const dock = page.getByTestId('toolbar-color-dock'), primary = dock.getByRole('button', { name: /^Primary color / }), secondary = dock.getByRole('button', { name: /^Secondary color / });
  45 |   const colors = () => Promise.all([primary, secondary].map(well => well.evaluate(button => (button as HTMLButtonElement).style.backgroundColor)));
  46 |   const before = await colors(); await open(page); await dialog.getByRole('button', { name: 'Swap primary and secondary colors', exact: true }).click(); expect(await colors()).toEqual([before[1], before[0]]);
  47 |   await open(page); await dialog.getByRole('button', { name: 'Swap primary and secondary colors', exact: true }).click({ button: 'right' }); expect(await colors()).toEqual(before);
  48 |   await canvasFocus.focus(); await canvasFocus.press('Shift+F10'); await expect(dialog).toBeVisible();
  49 |   await page.keyboard.press('Escape');
  50 |   const workspace = (await page.locator('#main-content').boundingBox())!;
  51 |   await page.mouse.click(workspace.x + workspace.width - 3, workspace.y + workspace.height - 3, { button: 'right' }); await expect(dialog).toBeVisible();
  52 |   for (const size of [{ width: 1280, height: 900 }, { width: 768, height: 600 }, { width: 360, height: 420 }]) {
  53 |     await page.setViewportSize(size); await expect.poll(async () => { const bounds = (await dialog.boundingBox())!; return bounds.x >= 11 && bounds.y >= 11 && bounds.x + bounds.width <= size.width - 11 && bounds.y + bounds.height <= size.height - 11; }).toBe(true);
  54 |   }
  55 |   await page.keyboard.press('Home'); await page.keyboard.press('Shift+Tab'); await expect(dialog.getByRole('button', { name: 'Swap primary and secondary colors', exact: true })).toBeFocused();
  56 |   await page.keyboard.press('Tab'); await expect(dialog.getByRole('button', { name: 'Pen', exact: true })).toBeFocused();
> 57 |   await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0); await expect(canvasFocus).toBeFocused(); expect(await pixels(page)).toEqual(original);
     |                                                                                                       ^ Error: expect(locator).toBeFocused() failed
  58 |   await page.setViewportSize({ width: 1280, height: 900 }); await open(page);
  59 |   await page.getByRole('button', { name: 'Close canvas tools', exact: true }).click({ position: { x: 10, y: 300 } });
  60 |   await expect(dialog).toHaveCount(0); expect(await pixels(page)).toEqual(original);
  61 | });
  62 | 
```