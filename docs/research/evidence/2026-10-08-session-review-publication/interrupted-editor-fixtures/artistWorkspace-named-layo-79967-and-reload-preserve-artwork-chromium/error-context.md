# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: artistWorkspace.spec.ts >> named layouts, left inspector, focus and reload preserve artwork
- Location: tests\e2e\artistWorkspace.spec.ts:21:5

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Arrange workspace' })

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - link "Skip to content" [ref=e2] [cursor=pointer]:
    - /url: "#main-workspace"
  - generic [ref=e4]:
    - banner [ref=e6]:
      - group "Project controls" [ref=e7]:
        - link "PixiBun Home" [ref=e8] [cursor=pointer]:
          - /url: /
          - generic [ref=e9]:
            - img "Bun, the PixiBun bunny" [ref=e11]
            - generic [ref=e175]:
              - generic [ref=e176]: PIXIBUN
              - generic [ref=e177]: ATELIER
        - button "File" [ref=e178]:
          - text: File
          - generic [ref=e179]: ▼
        - button "Rename project Untitled Sprite" [ref=e180] [cursor=pointer]: Untitled Sprite
        - generic "Canvas size · change it in File" [ref=e181]: 32×32
        - button "Save now" [ref=e182]:
          - generic [ref=e183]: Save
        - generic [ref=e185]:
          - button "Undo last action" [ref=e187] [cursor=pointer]
          - generic [ref=e188]:
            - button "Redo last action" [disabled]
      - group "Drawing controls" [ref=e189]:
        - generic "Tool options rail" [ref=e190]:
          - generic [ref=e191]: "Pen:"
          - generic [ref=e192]:
            - button "Brush size 1 pixels" [ref=e193]:
              - generic [ref=e194]: Size
              - generic [ref=e195]: 1 px
              - generic [ref=e196]: ▾
            - generic "Quick brush size presets" [ref=e197]:
              - button "1px brush preset" [pressed] [ref=e198]: "1"
              - button "2px brush preset" [ref=e199]: "2"
              - button "3px brush preset" [ref=e200]: "3"
              - button "4px brush preset" [ref=e201]: "4"
            - button "Disable clean corners" [pressed] [ref=e202]:
              - generic [ref=e203]: Pixel-Perfect
      - generic [ref=e204]:
        - group "Canvas controls" [ref=e205]:
          - group "Mirror drawing" [ref=e206]:
            - generic [ref=e207]: Mirror
            - button "Horizontal symmetry" [ref=e209] [cursor=pointer]
            - button "Vertical symmetry" [ref=e211] [cursor=pointer]
          - generic [ref=e213]:
            - generic [ref=e214]:
              - button "Zoom Out" [ref=e215] [cursor=pointer]: −
              - button "Zoom 1600 percent. Choose zoom level" [ref=e217]: 1600%
              - button "Zoom In" [ref=e218] [cursor=pointer]: +
            - button "Fit Canvas to Viewport (Ctrl+0)" [ref=e220] [cursor=pointer]: Fit
          - button "View options menu" [ref=e224] [cursor=pointer]:
            - generic [ref=e225]:
              - generic [ref=e226]: View
              - generic "1 active view options" [ref=e227]
            - generic [ref=e228]: ▼
        - group "Workspace presets" [ref=e229]:
          - combobox "Workspace layout" [ref=e230] [cursor=pointer]:
            - option "Drawing"
            - option "Animation" [selected]
            - option "Lighting"
        - group "Studio settings and help" [ref=e231]:
          - button "Studio options" [ref=e232] [cursor=pointer]:
            - generic [ref=e233]: Studio
            - generic [ref=e234]: ▼
        - button "Export drawing" [ref=e236]:
          - generic [ref=e237]: Export
    - status [ref=e239]: Changes saved
    - generic [ref=e240]:
      - complementary [ref=e242]:
        - generic [ref=e244]:
          - group "Drawing" [ref=e245]:
            - button "Pen" [pressed] [ref=e247] [cursor=pointer]
            - button "Bézier Curve" [ref=e249] [cursor=pointer]
            - button "Eraser" [ref=e251] [cursor=pointer]
            - button "Flood Fill" [ref=e253] [cursor=pointer]
            - button "Pixel Gradient" [ref=e255] [cursor=pointer]
            - button "Dither Brush" [ref=e257] [cursor=pointer]
            - button "Color Replace" [ref=e259] [cursor=pointer]
            - button "Erase Sampled Color" [ref=e261] [cursor=pointer]
          - group "Selection" [ref=e262]:
            - button "Marquee Box" [ref=e265] [cursor=pointer]
            - button "Lasso Select" [ref=e267] [cursor=pointer]
            - button "Magic Wand" [ref=e269] [cursor=pointer]
          - group "Geometry" [ref=e270]:
            - button "Line" [ref=e273] [cursor=pointer]
            - button "2:1 Iso Line" [ref=e275] [cursor=pointer]
            - button "Rectangle" [ref=e277] [cursor=pointer]
            - button "Ellipse" [ref=e279] [cursor=pointer]
          - group "2.5D Sculpt" [ref=e280]:
            - button "Normal Chisel" [ref=e283] [cursor=pointer]
          - group "Utility" [ref=e284]:
            - button "Eyedropper" [ref=e287] [cursor=pointer]
        - generic [ref=e288]:
          - generic [ref=e289]:
            - button "Swap colors (X)" [ref=e290] [cursor=pointer]: ⇄
            - button "Reset default black and white colors (Shift+D)" [ref=e291] [cursor=pointer]
            - 'button "Secondary color #C792DF. Click for quick swatches, double click for picker, right click to swap" [ref=e292] [cursor=pointer]'
            - 'button "Primary color #3A2E4C. Click for quick swatches, double click for picker, right click to swap" [ref=e293] [cursor=pointer]'
          - generic [ref=e294]:
            - generic [ref=e295]:
              - 'button "#DDDFDF (Click: Primary | Right-click: Secondary)" [ref=e296] [cursor=pointer]'
              - 'button "#DDDDDF (Click: Primary | Right-click: Secondary)" [ref=e297] [cursor=pointer]'
              - 'button "#D0C4DF (Click: Primary | Right-click: Secondary)" [ref=e298] [cursor=pointer]'
              - 'button "#DCABDF (Click: Primary | Right-click: Secondary)" [ref=e299] [cursor=pointer]'
            - button "Quick Swatches Flyout" [ref=e300] [cursor=pointer]
      - main "Pixel art canvas workspace" [ref=e304]:
        - application "Pixel art drawing canvas. Use mouse or stylus to paint, arrow keys to pan viewport or nudge selection, and Alt+drag to pan." [active] [ref=e305]
      - complementary [ref=e308]:
        - generic [ref=e309]:
          - button "Tools" [ref=e310]
          - button "Layers" [pressed] [ref=e312]
          - button "Palette" [ref=e314]
          - button "PixiTools" [ref=e316]:
            - generic [ref=e317]: FX
        - generic [ref=e319]:
          - generic [ref=e320]:
            - generic "Each frame has its own layer pixels. A new blank frame keeps the layer names and settings." [ref=e321]:
              - text: Frame 1 · Layers
              - generic [ref=e322]: (1)
            - generic [ref=e323]:
              - button "Add New Layer" [ref=e324]
              - button "Duplicate Layer" [ref=e326]
              - button "Merge Down" [disabled] [ref=e328]
              - button "Delete Layer" [disabled] [ref=e330]
          - generic [ref=e332]:
            - generic [ref=e333]:
              - generic [ref=e334]: Opacity
              - slider "Layer opacity" [ref=e335] [cursor=pointer]: "100"
              - generic [ref=e336]: 100%
            - generic [ref=e337]:
              - generic [ref=e338]: Blend
              - combobox "Layer blend mode" [ref=e339] [cursor=pointer]:
                - option "Normal" [selected]
                - option "Multiply"
                - option "Screen"
                - option "Overlay"
                - option "Color Dodge"
                - option "On artwork only"
          - generic [ref=e341]:
            - generic [ref=e342]:
              - button "Reorder layer Base Layer" [disabled] [ref=e343]:
                - generic [ref=e344]: ⠿
              - generic [ref=e345]:
                - button "Select layer Base Layer. Double click to rename" [ref=e346] [cursor=pointer]: Base Layer
                - button "Rename layer Base Layer" [ref=e347] [cursor=pointer]
            - generic [ref=e348]:
              - button "Lock layer Base Layer" [ref=e349]
              - button "Hide layer Base Layer" [ref=e350]
        - region "Canvas navigator" [ref=e351]:
          - generic [ref=e352]:
            - generic [ref=e353]: Navigator
            - generic [ref=e355]:
              - generic "Canvas dimensions" [ref=e356]: 32 × 32
              - generic "Current zoom" [ref=e357]: 1600%
          - button "Canvas overview. Click or drag to pan; arrow keys pan, Shift moves eight pixels, Enter centers." [ref=e359]
          - generic [ref=e361]:
            - button "Zoom out" [ref=e362] [cursor=pointer]: "-"
            - slider "Navigator zoom slider" [ref=e363] [cursor=pointer]: "1600"
            - button "Zoom in" [ref=e364] [cursor=pointer]: +
          - generic [ref=e365]:
            - button "1:1" [ref=e366] [cursor=pointer]
            - button "Fit canvas" [ref=e367] [cursor=pointer]
            - button "Center" [ref=e368] [cursor=pointer]
            - generic [ref=e369] [cursor=pointer]:
              - checkbox "Grid" [ref=e370]
              - generic [ref=e371]: Grid
    - contentinfo [ref=e373]:
      - generic [ref=e374]:
        - generic [ref=e375]:
          - generic [ref=e376]:
            - button "Play" [ref=e377]
            - button "Previous Frame (,)" [ref=e380]
            - button "Next Frame (.)" [ref=e382]
            - button "Repeat" [ref=e384]
          - generic [ref=e388]:
            - button "Preview speed" [ref=e390]:
              - generic [ref=e391]: Preview
              - generic [ref=e392]: 1×
              - generic [ref=e393]: ▾
            - generic [ref=e394]:
              - generic [ref=e395]: Frame time
              - spinbutton "Active frame duration in milliseconds" [ref=e396]: "100"
              - generic [ref=e397]: ms
            - button "Onion Skin" [ref=e398]
            - button "Onion skin settings" [ref=e401]: ⚙
        - generic [ref=e402]:
          - button "+ Frame" [ref=e403]:
            - generic [ref=e404]: Frame
          - group [ref=e406]:
            - generic "Frame actions" [ref=e407] [cursor=pointer]:
              - text: Frame actions
              - generic [ref=e408]: ▾
          - button "Collapse Timeline" [ref=e410]:
            - generic [ref=e411]:
              - generic [ref=e412]: ▼
              - generic [ref=e413]: Collapse
      - generic [ref=e414]:
        - 'button "Select frame 1. Duration: 100ms. Drag to reorder." [ref=e416]':
          - generic:
            - generic: "#1"
            - generic: 100ms
        - button "Clips" [ref=e417]
    - generic [ref=e419]:
      - generic [ref=e420]: "X: — Y: —"
      - generic [ref=e423]: 32×32
      - generic [ref=e426]: 1600%
      - generic [ref=e428]: Frame 1/1
      - generic [ref=e430]: Base Layer
      - generic [ref=e431]: pen
      - status "All changes saved to local storage" [ref=e436]:
        - generic [ref=e438]: Saved
  - button "Open Next.js Dev Tools" [ref=e444] [cursor=pointer]
  - alert [ref=e448]
```

# Test source

```ts
  1   | import { expect, test, type Page } from '@playwright/test';
  2   | import AxeBuilder from '@axe-core/playwright';
  3   | import type { StudioState } from '../../src/stores/slices/types';
  4   | 
  5   | interface ArtistTestWindow extends Window { __studioStore: { getState: () => StudioState } }
  6   | async function openStudio(page: Page) {
  7   |   await page.setViewportSize({ width: 1440, height: 900 });
  8   |   await page.goto('/studio');
  9   |   await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  10  |   await expect(page.locator('#center-canvas-area')).toBeVisible();
  11  | }
  12  | async function pixels(page: Page) {
  13  |   return page.getByTestId('main-composite-canvas').evaluate((c: HTMLCanvasElement) => Array.from(c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data));
  14  | }
  15  | async function drag(page: Page, x1: number, y1: number, x2: number, y2: number) {
  16  |   const box = (await page.locator('#center-canvas-area').boundingBox())!;
  17  |   const at = (x: number, y: number) => ({ x: box.x + (x + 0.5) * box.width / 32, y: box.y + (y + 0.5) * box.height / 32 });
  18  |   const from = at(x1, y1), to = at(x2, y2);
  19  |   await page.mouse.move(from.x, from.y); await page.mouse.down(); await page.mouse.move(to.x, to.y, { steps: 8 }); await page.mouse.up();
  20  | }
  21  | test('named layouts, left inspector, focus and reload preserve artwork', async ({ page }) => {
  22  |   await openStudio(page); await drag(page, 8, 8, 12, 12); const before = await pixels(page);
  23  |   expect(before.some(value => value !== 0)).toBe(true);
  24  |   await page.getByLabel('Workspace layout').selectOption('animation');
  25  |   await expect(page.getByRole('region', { name: 'Canvas navigator' })).toBeVisible();
> 26  |   await page.getByRole('button', { name: 'Arrange workspace' }).click();
      |                                                                 ^ Error: locator.click: Test timeout of 30000ms exceeded.
  27  |   await page.getByLabel('Inspector position').selectOption('left');
  28  |   await page.getByLabel('Inspector width').press('Home');
  29  |   for (let i = 0; i < 10; i++) await page.getByLabel('Inspector width').press('ArrowRight');
  30  |   await page.getByLabel('New workspace name').fill('Animation desk');
  31  |   await page.getByRole('button', { name: 'Save layout', exact: true }).click();
  32  |   await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  33  |   await expect(page.getByTestId('right-inspector')).toHaveCSS('width', '360px');
  34  |   const inspector = (await page.getByTestId('right-inspector').boundingBox())!, stage = (await page.locator('#main-content').boundingBox())!;
  35  |   expect(inspector.x).toBeLessThan(stage.x);
  36  |   await page.locator('#center-canvas-area').focus(); await page.keyboard.press('Shift+Tab');
  37  |   await expect(page.getByTestId('right-inspector')).toBeHidden(); await expect(page.getByTestId('bottom-timeline')).toBeHidden();
  38  |   expect(await pixels(page)).toEqual(before);
  39  |   await page.keyboard.press('Shift+Tab'); await expect(page.getByTestId('right-inspector')).toBeVisible();
  40  |   expect(await pixels(page)).toEqual(before);
  41  |   await page.getByRole('button', { name: 'Save now', exact: true }).click(); await page.reload();
  42  |   await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  43  |   await expect(page.getByLabel('Workspace layout').locator('option:checked')).toHaveText('Animation desk');
  44  |   await expect(page.getByTestId('right-inspector')).toHaveCSS('width', '360px'); expect(await pixels(page)).toEqual(before);
  45  | });
  46  | test('palette previews are nondestructive, favorites persist, and applying adds one exact palette', async ({ page }) => {
  47  |   await openStudio(page); await drag(page, 7, 7, 10, 7); const before = await pixels(page);
  48  |   await page.getByTestId('tab-palette').click();
  49  |   const initial = await page.evaluate(() => (window as unknown as ArtistTestWindow).__studioStore.getState().currentPaletteId);
  50  |   await page.getByRole('button', { name: /Browse palettes/ }).click();
  51  |   await expect(page.getByRole('dialog', { name: 'Palette library' })).toBeVisible();
  52  |   await page.screenshot({ path: 'docs/assets/screenshots/2026-10-04-artist-workspace/palette-library.png' });
  53  |   await page.getByLabel('Search palettes').fill('Sweetie'); await page.getByRole('button', { name: 'Preview Sweetie 16', exact: true }).click();
  54  |   await expect(page.getByRole('region', { name: 'Selected palette preview' })).toContainText('GrafxKid');
  55  |   expect(await page.evaluate(() => (window as unknown as ArtistTestWindow).__studioStore.getState().currentPaletteId)).toBe(initial);
  56  |   expect(await pixels(page)).toEqual(before);
  57  |   await page.getByRole('button', { name: 'Favorite Sweetie 16', exact: true }).click();
  58  |   await page.getByRole('button', { name: 'Use palette', exact: true }).click();
  59  |   expect(await page.evaluate(() => { const s = (window as unknown as ArtistTestWindow).__studioStore.getState(); return s.palettes.find(p => p.id === s.currentPaletteId)?.colors; })).toEqual(['#1a1c2c', '#5d275d', '#b13e53', '#ef7d57', '#ffcd75', '#a7f070', '#38b764', '#257179', '#29366f', '#3b5dc9', '#41a6f6', '#73eff7', '#f4f4f4', '#94b0c2', '#566c86', '#333c57']);
  60  |   expect(await pixels(page)).toEqual(before);
  61  |   await page.getByRole('button', { name: /Browse palettes/ }).click();
  62  |   await page.getByLabel('Palette collection').selectOption('favorites'); await expect(page.getByRole('button', { name: 'Preview Sweetie 16' })).toBeVisible();
  63  | });
  64  | test('pinned triangle, tool controls and navigator are usable at desktop widths', async ({ page }) => {
  65  |   await openStudio(page); await drag(page, 8, 8, 14, 12); await page.getByRole('navigation', { name: 'Artist workspace' }).getByRole('button', { name: 'Color', exact: true }).click();
  66  |   await page.getByLabel('Picker hex color').fill('#ff0000'); await page.getByLabel('Picker hue').press('Home');
  67  |   for (let i = 0; i < 120; i++) await page.getByLabel('Picker hue').press('ArrowRight');
  68  |   expect(await page.evaluate(() => (window as unknown as ArtistTestWindow).__studioStore.getState().primaryColor)).toBe('#00ff00');
  69  |   await page.getByLabel('Color picker shape').selectOption('square'); await page.getByLabel('Color picker shape').selectOption('triangle');
  70  |   await page.getByRole('button', { name: 'Tool settings', exact: true }).click();
  71  |   await page.getByLabel('Tool panel brush size').press('Home'); await page.getByLabel('Tool panel brush size').press('ArrowRight');
  72  |   expect(await page.evaluate(() => (window as unknown as ArtistTestWindow).__studioStore.getState().tools.brushSize)).toBe(2);
  73  |   await page.getByLabel('Composition guide').selectOption('diagonals'); await expect(page.getByTestId('diagonal-composition-guide')).toBeVisible();
  74  |   await page.getByRole('navigation', { name: 'Artist workspace' }).getByRole('button', { name: 'Navigator', exact: true }).click();
  75  |   const panBefore = await page.evaluate(() => (window as unknown as ArtistTestWindow).__studioStore.getState().panX);
  76  |   await page.getByTestId('navigator-canvas').click({ position: { x: 180, y: 56 } });
  77  |   expect(await page.evaluate(() => (window as unknown as ArtistTestWindow).__studioStore.getState().panX)).not.toBe(panBefore);
  78  |   await page.getByRole('button', { name: 'Fit canvas', exact: true }).click();
  79  |   for (const width of [1024, 1440]) {
  80  |     await page.setViewportSize({ width, height: 900 });
  81  |     await expect(page.getByTestId('navigator-canvas')).toBeInViewport();
  82  |     expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
  83  |   }
  84  |   await page.screenshot({ path: 'docs/assets/screenshots/2026-10-04-artist-workspace/color-tools-navigator.png' });
  85  |   const scan = await new AxeBuilder({ page }).include('[aria-label="Artist workspace"]').include('[data-testid="right-inspector"]').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  86  |   expect(scan.violations).toEqual([]);
  87  | });
  88  | test('onion settings render selected ghost ranges, keep artwork intact and survive reload', async ({ page }) => {
  89  |   await openStudio(page); await drag(page, 8, 8, 8, 8);
  90  |   await page.getByTestId('add-frame-button').click(); await drag(page, 12, 12, 12, 12);
  91  |   const before = await pixels(page);
  92  |   await page.getByLabel('Onion skin settings', { exact: true }).click();
  93  |   await page.getByRole('button', { name: 'Previous pose', exact: true }).click();
  94  |   await page.getByLabel('Previous onion frames', { exact: true }).fill('2');
  95  |   await page.getByLabel('Onion skin opacity', { exact: true }).press('Home'); for (let i = 0; i < 40; i++) await page.getByLabel('Onion skin opacity', { exact: true }).press('ArrowRight');
  96  |   await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  97  |   const settings = await page.evaluate(() => (window as unknown as ArtistTestWindow).__studioStore.getState().onionSkin);
  98  |   expect(settings).toMatchObject({ enabled: true, prevFrames: 2, nextFrames: 0, opacity: 0.4 }); expect(await pixels(page)).toEqual(before);
  99  |   expect(await page.getByTestId('onion-skin-canvas').evaluate((c: HTMLCanvasElement) => c.getContext('2d')!.getImageData(8, 8, 1, 1).data[3])).toBeGreaterThan(0);
  100 |   await page.getByRole('button', { name: 'Save now', exact: true }).click(); await page.reload(); await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  101 |   expect(await page.evaluate(() => (window as unknown as ArtistTestWindow).__studioStore.getState().onionSkin)).toEqual(settings);
  102 |   await page.locator('#center-canvas-area').focus(); await page.keyboard.press('F3'); expect(await page.evaluate(() => (window as unknown as ArtistTestWindow).__studioStore.getState().onionSkin.enabled)).toBe(false);
  103 | });
  104 | test('gradient respects lasso-shaped masks, Undo/Redo, cancel, zero-length and locked layers', async ({ page }) => {
  105 |   await openStudio(page);
  106 |   await page.evaluate(() => {
  107 |     const s = (window as unknown as ArtistTestWindow).__studioStore.getState(); const mask = new Uint8Array(32 * 32); for (let y = 8; y < 16; y++) for (let x = 8; x <= y; x++) mask[y * 32 + x] = 1;
  108 |     s.setSelection({ x: 8, y: 8, w: 8, h: 8 }, mask); s.setPrimaryColor('#ff0000'); s.setSecondaryColor('#0000ff');
  109 |   });
  110 |   await page.locator('#center-canvas-area').focus(); await page.keyboard.press('Shift+G');
  111 |   await page.getByRole('button', { name: 'Tool settings', exact: true }).click(); await expect(page.getByLabel('Gradient shape')).toBeVisible();
  112 |   await drag(page, 8, 8, 15, 8); const drawn = await pixels(page);
  113 |   let changed = 0; for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) { const rgba = drawn.slice((y * 32 + x) * 4, (y * 32 + x) * 4 + 4); if (y >= 8 && y < 16 && x >= 8 && x <= y) { expect([[255, 0, 0, 255], [0, 0, 255, 255]]).toContainEqual(rgba); changed++; } else expect(rgba).toEqual([0, 0, 0, 0]); }
  114 |   expect(changed).toBe(36);
  115 |   await page.getByTestId('undo-button').click(); expect((await pixels(page)).every(v => v === 0)).toBe(true);
  116 |   await page.getByTestId('redo-button').click(); expect(await pixels(page)).toEqual(drawn);
  117 |   await page.screenshot({ path: 'docs/assets/screenshots/2026-10-04-artist-workspace/selection-gradient.png' });
  118 |   await page.evaluate(() => (window as unknown as ArtistTestWindow).__studioStore.getState().setPrimaryColor('#00ff00'));
  119 |   const box = (await page.locator('#center-canvas-area').boundingBox())!;
  120 |   await page.mouse.move(box.x + 8.5 * box.width / 32, box.y + 8.5 * box.height / 32); await page.mouse.down(); await page.mouse.move(box.x + 15.5 * box.width / 32, box.y + 8.5 * box.height / 32);
  121 |   await page.locator('#center-canvas-area').dispatchEvent('pointercancel', { pointerType: 'mouse', isPrimary: true }); await page.mouse.up(); expect(await pixels(page)).toEqual(drawn);
  122 |   await drag(page, 10, 10, 10, 10); expect(await pixels(page)).toEqual(drawn);
  123 |   await page.evaluate(() => { const s = (window as unknown as ArtistTestWindow).__studioStore.getState(); s.toggleLayerLock(s.activeLayerId); });
  124 |   await drag(page, 8, 8, 15, 8); expect(await pixels(page)).toEqual(drawn);
  125 | });
  126 | 
```