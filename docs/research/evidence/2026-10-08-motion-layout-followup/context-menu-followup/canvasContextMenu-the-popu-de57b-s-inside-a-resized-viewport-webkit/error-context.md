# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: canvasContextMenu.spec.ts >> the popup owns keys, swaps colors once, dismisses safely and stays inside a resized viewport
- Location: tests\production\canvasContextMenu.spec.ts:35:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('dialog', { name: 'Canvas tools', exact: true })
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for getByRole('dialog', { name: 'Canvas tools', exact: true })

```

```yaml
- link "Skip to content":
  - /url: "#main-workspace"
- banner:
  - group "Project controls":
    - link "PixiBun Home":
      - /url: /
      - img "Bun, the PixiBun bunny"
    - button "File"
    - button "Rename project Hearth Ghost": Hearth Ghost
    - text: 16×16
    - button "Save now":
      - img
      - text: Save
    - button "Undo last action" [disabled]:
      - img
    - button "Redo last action" [disabled]:
      - img
  - group "Drawing controls":
    - text: "Eraser:"
    - button "Brush size 1 pixels": Size 1 px
  - group "Canvas controls":
    - group "Mirror drawing":
      - text: Mirror
      - button "Horizontal symmetry":
        - img
      - button "Vertical symmetry":
        - img
    - button "Zoom Out": −
    - button "Zoom 1600 percent. Choose zoom level": 1600%
    - button "Zoom In": +
    - button "Fit Canvas to Viewport (Ctrl+0)": Fit
    - button "View options menu":
      - img
      - text: View ▼
  - group "Workspace presets":
    - combobox "Workspace layout":
      - option "Drawing" [selected]
      - option "Animation"
      - option "Lighting"
  - group "Studio settings and help":
    - button "Studio options": Studio
  - button "Export drawing":
    - img
    - text: Export
- status: Changes saved
- complementary:
  - group "Drawing":
    - button "Pen":
      - img
    - button "Bézier Curve":
      - img
    - button "Eraser" [pressed]:
      - img
    - button "Flood Fill":
      - img
    - button "Pixel Gradient":
      - img
    - button "Dither Brush":
      - img
    - button "Color Replace":
      - img
    - button "Erase Sampled Color":
      - img
  - group "Selection":
    - button "Marquee Box":
      - img
    - button "Lasso Select":
      - img
    - button "Magic Wand":
      - img
  - group "Geometry":
    - button "Line":
      - img
    - button "2:1 Iso Line":
      - img
    - button "Rectangle":
      - img
    - button "Ellipse":
      - img
  - group "2.5D Sculpt":
    - button "Normal Chisel":
      - img
  - group "Utility":
    - button "Eyedropper":
      - img
  - button "Swap colors (X)": ⇄
  - button "Reset default black and white colors (Shift+D)"
  - 'button "Secondary color #C792DF. Click for quick swatches, double click for picker, right click to swap"'
  - 'button "Primary color #3A2E4C. Click for quick swatches, double click for picker, right click to swap"'
  - 'button "Quick color #3a2e4c"'
  - 'button "Quick color #c792df"'
  - 'button "Quick color #dcabdf"'
  - 'button "Quick color #664b68"'
  - button "Quick Swatches Flyout"
- main "Pixel art canvas workspace":
  - application "Pixel art drawing canvas. Use mouse or stylus to paint, arrow keys to pan viewport or nudge selection, and Alt+drag to pan."
- complementary:
  - button "Tools":
    - img
    - text: Tools
  - button "Layers" [pressed]:
    - img
    - text: Layers
  - button "Palette":
    - img
    - text: Palette
  - button "PixiTools":
    - img
    - text: FX
  - text: Frame 1 · Layers (1)
  - button "Add New Layer":
    - img
  - button "Duplicate Layer":
    - img
  - button "Merge Down" [disabled]:
    - img
  - button "Delete Layer" [disabled]:
    - img
  - text: Opacity
  - slider "Layer opacity": "100"
  - text: 100% Blend
  - combobox "Layer blend mode":
    - option "Normal" [selected]
    - option "Multiply"
    - option "Screen"
    - option "Overlay"
    - option "Color Dodge"
    - option "On artwork only"
  - button "Reorder layer Base Layer" [disabled]
  - button "Select layer Base Layer. Double click to rename": Base Layer
  - button "Rename layer Base Layer":
    - img
  - button "Lock layer Base Layer":
    - img
  - button "Hide layer Base Layer":
    - img
- contentinfo:
  - button "Play":
    - img
    - text: Play
  - button "Previous Frame (,)":
    - img
  - button "Next Frame (.)":
    - img
  - button "Repeat":
    - img
    - text: Repeat
  - button "Preview speed": Preview 1×
  - text: Frame time
  - spinbutton "Active frame duration in milliseconds": "125"
  - text: ms
  - button "Onion Skin":
    - img
    - text: Onion Skin
  - button "Onion skin settings": ⚙
  - button "+ Frame":
    - img
    - text: Frame
  - group: Frame actions
  - button "Collapse Timeline": ▼ Collapse
  - 'button "Select frame 1. Duration: 125ms. Drag to reorder."': "#1 125ms"
  - button "Clips":
    - img
    - text: Clips
- text: "X: — Y: — 16×16 1600% Frame 1/1 Base Layer eraser"
- status "All changes saved to local storage": Saved
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
> 48 |   await page.mouse.click(1260, 760, { button: 'right' }); await expect(dialog).toBeVisible();
     |                                                                                ^ Error: expect(locator).toBeVisible() failed
  49 |   for (const size of [{ width: 1280, height: 900 }, { width: 768, height: 600 }, { width: 360, height: 420 }]) {
  50 |     await page.setViewportSize(size); await expect.poll(async () => { const bounds = (await dialog.boundingBox())!; return bounds.x >= 11 && bounds.y >= 11 && bounds.x + bounds.width <= size.width - 11 && bounds.y + bounds.height <= size.height - 11; }).toBe(true);
  51 |   }
  52 |   await page.keyboard.press('Home'); await page.keyboard.press('Shift+Tab'); await expect(dialog.getByRole('button', { name: 'Swap primary and secondary colors', exact: true })).toBeFocused();
  53 |   await page.keyboard.press('Tab'); await expect(dialog.getByRole('button', { name: 'Pen', exact: true })).toBeFocused();
  54 |   await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0); await expect(canvasFocus).toBeFocused(); expect(await pixels(page)).toEqual(original);
  55 |   await page.setViewportSize({ width: 1280, height: 900 }); await open(page);
  56 |   await page.getByRole('button', { name: 'Close canvas tools', exact: true }).click({ position: { x: 10, y: 300 } });
  57 |   await expect(dialog).toHaveCount(0); expect(await pixels(page)).toEqual(original);
  58 | });
  59 | 
```