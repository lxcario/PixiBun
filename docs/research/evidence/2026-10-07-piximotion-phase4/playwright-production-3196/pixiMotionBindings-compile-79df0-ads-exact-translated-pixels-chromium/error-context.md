# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: pixiMotionBindings.spec.ts >> compiled stale source refuses bake; fresh capture previews, bakes, undoes, redoes and reloads exact translated pixels
- Location: tests\production\pixiMotionBindings.spec.ts:41:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByTestId('piximotion-panel')
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for getByTestId('piximotion-panel')

```

```yaml
- link "Skip to content":
  - /url: "#main-workspace"
- banner:
  - group "Project controls":
    - link "PixiBun Home":
      - /url: /
      - img "Bun, the PixiBun bunny"
      - text: PIXIBUN ATELIER
    - button "File"
    - button "Rename project Untitled Sprite": Untitled Sprite
    - text: 32×32
    - button "Save now":
      - img
      - text: Save
    - button "Undo last action":
      - img
    - button "Redo last action" [disabled]:
      - img
  - group "Drawing controls"
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
    - button "Eraser":
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
    - button "Marquee Box" [pressed]:
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
  - 'button "#DDDFDF (Click: Primary | Right-click: Secondary)"'
  - 'button "#DDDDDF (Click: Primary | Right-click: Secondary)"'
  - 'button "#D0C4DF (Click: Primary | Right-click: Secondary)"'
  - 'button "#DCABDF (Click: Primary | Right-click: Secondary)"'
  - button "Quick Swatches Flyout"
- main "Pixel art canvas workspace":
  - application "Pixel art drawing canvas. Use mouse or stylus to paint, arrow keys to pan viewport or nudge selection, and Alt+drag to pan.":
    - img
    - img
    - text: ↻ ↻ ↻ ↻
    - button "↔"
    - button "↕"
    - button "↺"
    - button "↻"
    - button "✓"
    - button "✕"
- complementary:
  - button "Tools" [pressed]:
    - img
    - text: Tools
  - button "Layers":
    - img
    - text: Layers
  - button "Palette":
    - img
    - text: Palette
  - button "PixiTools":
    - img
    - text: FX
  - region "Detailed tool settings":
    - img
    - heading "Marquee Box" [level=2]
    - text: M
    - paragraph: Selection Tool Controls
    - text: Rotation Engine
    - combobox "Rotation algorithm":
      - option "RotSprite v2 (Contours & Outlines)" [selected]
      - option "Paeth 3-Shear (Dither & Textures)"
    - paragraph: 8× subpixel majority voting & contour refinement. Best for clean character outlines and cel shapes.
    - text: PixiMotion Slice 1
    - paragraph: Turn selection into a temporary rigid part, animate start/end poses, and bake to animation cels.
    - button "Create Motion Part":
      - img
      - text: Create Motion Part
    - paragraph: Selection Shortcuts
    - list:
      - listitem: "Shift + drag: Add to selection"
      - listitem: "Alt + drag: Subtract from selection"
      - listitem: Drag handles to resize, rotate, or move
      - listitem: "Enter: Commit transform"
      - listitem: "Esc: Cancel / deselect"
    - heading "Symmetry & Composition" [level=3]
    - checkbox "Horizontal mirror (Shift+H)"
    - text: Horizontal mirror (Shift+H)
    - checkbox "Vertical mirror (Shift+V)"
    - text: Vertical mirror (Shift+V) Composition Guide
    - combobox "Composition guide":
      - option "Off" [selected]
      - option "Rule of thirds"
      - option "Golden ratio"
      - option "Center crosshair"
      - option "Diagonals"
      - option "Safe area (10%)"
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
  - spinbutton "Active frame duration in milliseconds": "100"
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
  - 'button "Select frame 1. Duration: 100ms. Drag to reorder."': "#1 100ms"
  - button "Clips":
    - img
    - text: Clips
- text: "X: — Y: — 32×32 1600% Frame 1/1 Base Layer Sel: 20×20 select-box"
- status "All changes saved to local storage": Saved
- alert
```

# Test source

```ts
  1  | import { expect, test, type Page } from '@playwright/test';
  2  | 
  3  | const pixels = (page: Page, testId = 'main-composite-canvas') => page.getByTestId(testId).evaluate((canvas: HTMLCanvasElement) =>
  4  |   Array.from(canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data));
  5  | 
  6  | function translated(source: number[], dx: number) {
  7  |   const result = new Array<number>(source.length).fill(0);
  8  |   for (let y = 0; y < 32; y++) for (let x = 0; x + dx < 32; x++) {
  9  |     const src = (y * 32 + x) * 4, dst = (y * 32 + x + dx) * 4;
  10 |     for (let c = 0; c < 4; c++) result[dst + c] = source[src + c];
  11 |   }
  12 |   return result;
  13 | }
  14 | 
  15 | async function readyWithMark(page: Page) {
  16 |   await page.setViewportSize({ width: 1600, height: 1000 });
  17 |   await page.goto('/studio'); await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  18 |   const canvas = page.getByTestId('main-composite-canvas'); const box = (await canvas.boundingBox())!;
  19 |   await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.4); await page.mouse.down();
  20 |   await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.4, { steps: 4 }); await page.mouse.up();
  21 |   await expect.poll(async () => (await pixels(page)).some((v, i) => i % 4 === 3 && v > 0)).toBe(true);
  22 |   return pixels(page);
  23 | }
  24 | async function capture(page: Page) {
  25 |   const box = (await page.getByTestId('main-composite-canvas').boundingBox())!;
  26 |   await page.getByTestId('select-box-tool').click();
  27 |   await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.2); await page.mouse.down();
  28 |   await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.8, { steps: 4 }); await page.mouse.up();
  29 |   await page.getByTestId('tab-tools').click();
> 30 |   await page.getByTestId('create-motion-part-btn').click(); await expect(page.getByTestId('piximotion-panel')).toBeVisible();
     |                                                                                                                ^ Error: expect(locator).toBeVisible() failed
  31 | }
  32 | async function setArc(page: Page) {
  33 |   const translation = page.getByRole('slider', { name: 'Pose translation X', exact: true }); await translation.focus();
  34 |   for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowRight'); await expect(translation).toHaveValue('4');
  35 |   const count = page.getByRole('slider', { name: 'Motion frame count', exact: true }); await count.focus();
  36 |   await page.keyboard.press('Home'); await page.keyboard.press('ArrowRight'); await expect(count).toHaveValue('3');
  37 |   await page.getByRole('combobox', { name: 'Motion easing', exact: true }).selectOption('linear');
  38 | }
  39 | const frame = (page: Page, n: number) => page.getByRole('button', { name: new RegExp(`Select frame ${n}\\.`) });
  40 | 
  41 | test('compiled stale source refuses bake; fresh capture previews, bakes, undoes, redoes and reloads exact translated pixels', async ({ page }) => {
  42 |   const original = await readyWithMark(page); await capture(page);
  43 |   await page.getByTestId('undo-button').click();
  44 |   await expect(page.getByTestId('piximotion-panel').getByRole('status')).toHaveText(/source artwork changed/);
  45 |   await expect(page.getByRole('button', { name: 'BAKE TO TIMELINE', exact: true })).toBeDisabled();
  46 |   await expect.poll(async () => (await pixels(page)).every(v => v === 0)).toBe(true);
  47 |   await expect(page.getByTestId('main-composite-canvas')).toHaveCSS('opacity', '1');
  48 |   await page.getByTestId('piximotion-panel').getByRole('button', { name: 'Cancel (Escape)', exact: true }).click();
  49 |   await page.getByTestId('redo-button').click(); await expect.poll(() => pixels(page)).toEqual(original);
  50 |   await capture(page); await setArc(page);
  51 |   await expect(page.getByTestId('main-composite-canvas')).toHaveCSS('opacity', '0');
  52 |   await expect.poll(() => pixels(page, 'piximotion-preview-canvas')).toEqual(translated(original, 4));
  53 |   await page.getByRole('button', { name: 'BAKE TO TIMELINE', exact: true }).click();
  54 |   await expect(page.getByTestId('piximotion-panel')).toBeHidden(); await expect(frame(page, 3)).toBeVisible();
  55 |   await expect(frame(page, 4)).toHaveCount(0); await expect.poll(() => pixels(page)).toEqual(translated(original, 4));
  56 |   await frame(page, 2).click(); await expect.poll(() => pixels(page)).toEqual(translated(original, 2));
  57 |   await frame(page, 1).click(); await expect.poll(() => pixels(page)).toEqual(original);
  58 |   await page.getByTestId('undo-button').click(); await expect(frame(page, 2)).toHaveCount(0);
  59 |   await expect.poll(() => pixels(page)).toEqual(original);
  60 |   await page.getByTestId('redo-button').click(); await expect(frame(page, 3)).toBeVisible();
  61 |   await expect.poll(() => pixels(page)).toEqual(translated(original, 4));
  62 |   await page.getByTestId('save-button').click();
  63 |   await expect(page.getByRole('status').filter({ hasText: /^Changes saved$/ })).toBeVisible();
  64 |   await page.reload(); await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  65 |   await expect(frame(page, 3)).toBeVisible(); await frame(page, 3).click();
  66 |   await expect.poll(() => pixels(page)).toEqual(translated(original, 4));
  67 |   await frame(page, 2).click(); await expect.poll(() => pixels(page)).toEqual(translated(original, 2));
  68 |   await expect(page.getByTestId('piximotion-panel')).toHaveCount(0);
  69 | });
  70 | 
  71 | test('compiled frame duplication never retargets a captured part and bake Undo restores the previously active copy', async ({ page }) => {
  72 |   const original = await readyWithMark(page); await capture(page); await setArc(page);
  73 |   await page.locator('summary').filter({ hasText: 'Frame actions' }).click();
  74 |   await page.getByRole('button', { name: 'Duplicate frame', exact: true }).click(); await expect(frame(page, 2)).toBeVisible();
  75 |   await page.getByRole('button', { name: 'BAKE TO TIMELINE', exact: true }).click();
  76 |   await expect(frame(page, 4)).toBeVisible(); await expect(frame(page, 5)).toHaveCount(0);
  77 |   await expect.poll(() => pixels(page)).toEqual(translated(original, 4));
  78 |   await frame(page, 4).click(); await expect.poll(() => pixels(page)).toEqual(original);
  79 |   await page.getByTestId('undo-button').click(); await expect(frame(page, 3)).toHaveCount(0);
  80 |   await expect(frame(page, 2)).toHaveClass(/timeline-frame-active-bg/); await expect.poll(() => pixels(page)).toEqual(original);
  81 |   await page.getByTestId('redo-button').click(); await expect(frame(page, 3)).toHaveClass(/timeline-frame-active-bg/);
  82 |   await expect.poll(() => pixels(page)).toEqual(translated(original, 4));
  83 | });
  84 | 
```