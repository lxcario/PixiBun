# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: artistWorkspace.spec.ts >> compiled radial gradient uses the active palette and one undoable layer fill
- Location: tests\production\artistWorkspace.spec.ts:68:5

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: locator.uncheck: Test timeout of 60000ms exceeded.
Call log:
  - waiting for getByLabel('Draw on new layer', { exact: true })

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
      - group "Drawing controls"
      - generic [ref=e189]:
        - group "Canvas controls" [ref=e190]:
          - group "Mirror drawing" [ref=e191]:
            - generic [ref=e192]: Mirror
            - button "Horizontal symmetry" [ref=e194] [cursor=pointer]
            - button "Vertical symmetry" [ref=e196] [cursor=pointer]
          - generic [ref=e198]:
            - generic [ref=e199]:
              - button "Zoom Out" [ref=e200] [cursor=pointer]: −
              - button "Zoom 1600 percent. Choose zoom level" [ref=e202]: 1600%
              - button "Zoom In" [ref=e203] [cursor=pointer]: +
            - button "Fit Canvas to Viewport (Ctrl+0)" [ref=e205] [cursor=pointer]: Fit
          - button "View options menu" [ref=e209] [cursor=pointer]:
            - generic [ref=e210]:
              - generic [ref=e211]: View
              - generic "1 active view options" [ref=e212]
            - generic [ref=e213]: ▼
        - group "Workspace presets" [ref=e214]:
          - combobox "Workspace layout" [ref=e215] [cursor=pointer]:
            - option "Drawing" [selected]
            - option "Animation"
            - option "Lighting"
        - group "Studio settings and help" [ref=e216]:
          - button "Studio options" [ref=e217] [cursor=pointer]:
            - generic [ref=e218]: Studio
            - generic [ref=e219]: ▼
        - button "Export drawing" [ref=e221]:
          - generic [ref=e222]: Export
    - status [ref=e224]: Changes saved
    - generic [ref=e225]:
      - complementary [ref=e227]:
        - generic [ref=e229]:
          - group "Drawing" [ref=e230]:
            - button "Pen" [ref=e232] [cursor=pointer]
            - button "Bézier Curve" [ref=e234] [cursor=pointer]
            - button "Eraser" [ref=e236] [cursor=pointer]
            - button "Flood Fill" [ref=e238] [cursor=pointer]
            - button "Pixel Gradient" [pressed] [ref=e240] [cursor=pointer]
            - button "Dither Brush" [ref=e242] [cursor=pointer]
            - button "Color Replace" [ref=e244] [cursor=pointer]
            - button "Erase Sampled Color" [ref=e246] [cursor=pointer]
          - group "Selection" [ref=e247]:
            - button "Marquee Box" [ref=e250] [cursor=pointer]
            - button "Lasso Select" [ref=e252] [cursor=pointer]
            - button "Magic Wand" [ref=e254] [cursor=pointer]
          - group "Geometry" [ref=e255]:
            - button "Line" [ref=e258] [cursor=pointer]
            - button "2:1 Iso Line" [ref=e260] [cursor=pointer]
            - button "Rectangle" [ref=e262] [cursor=pointer]
            - button "Ellipse" [ref=e264] [cursor=pointer]
          - group "2.5D Sculpt" [ref=e265]:
            - button "Normal Chisel" [ref=e268] [cursor=pointer]
          - group "Utility" [ref=e269]:
            - button "Eyedropper" [ref=e272] [cursor=pointer]
        - generic [ref=e273]:
          - generic [ref=e274]:
            - button "Swap colors (X)" [ref=e275] [cursor=pointer]: ⇄
            - button "Reset default black and white colors (Shift+D)" [ref=e276] [cursor=pointer]
            - 'button "Secondary color #C792DF. Click for quick swatches, double click for picker, right click to swap" [ref=e277] [cursor=pointer]'
            - 'button "Primary color #3A2E4C. Click for quick swatches, double click for picker, right click to swap" [ref=e278] [cursor=pointer]'
          - generic [ref=e279]:
            - generic [ref=e280]:
              - 'button "#222323 (Click: Primary | Right-click: Secondary)" [ref=e281] [cursor=pointer]'
              - 'button "#f0f6f0 (Click: Primary | Right-click: Secondary)" [ref=e282] [cursor=pointer]'
            - button "Quick Swatches Flyout" [ref=e283] [cursor=pointer]
      - main "Pixel art canvas workspace" [ref=e287]:
        - application "Pixel art drawing canvas. Use mouse or stylus to paint, arrow keys to pan viewport or nudge selection, and Alt+drag to pan." [ref=e288]
      - complementary [ref=e291]:
        - generic [ref=e292]:
          - button "Tools" [pressed] [ref=e293]
          - button "Layers" [ref=e295]
          - button "Palette" [ref=e297]
          - button "PixiTools" [ref=e299]:
            - generic [ref=e300]: FX
        - region "Detailed tool settings" [ref=e302]:
          - generic [ref=e305]:
            - generic [ref=e306]:
              - heading "Pixel Gradient" [level=2] [ref=e307]
              - generic [ref=e308]: Shift + G
            - paragraph [ref=e309]: Drawing Tool Controls
          - generic [ref=e310]:
            - generic [ref=e311]:
              - text: Gradient Shape
              - combobox "Gradient shape" [ref=e312] [cursor=pointer]:
                - option "Linear Gradient"
                - option "Radial Gradient" [selected]
            - generic [ref=e313]:
              - text: Color Ramp Source
              - combobox "Gradient colors" [ref=e314] [cursor=pointer]:
                - option "Foreground → Background"
                - option "Active palette, in order" [selected]
            - generic [ref=e315] [cursor=pointer]:
              - checkbox "Bayer 4×4 dithering Interleaves pixels using Bayer pattern for retro shaded transitions." [active] [ref=e316]
              - generic [ref=e317]:
                - text: Bayer 4×4 dithering
                - generic [ref=e318]: Interleaves pixels using Bayer pattern for retro shaded transitions.
            - generic [ref=e319] [cursor=pointer]:
              - checkbox "Draw on new layer Automatically creates a new layer for the dither pass so existing artwork is preserved." [checked] [ref=e320]
              - generic [ref=e321]:
                - text: Draw on new layer
                - generic [ref=e322]: Automatically creates a new layer for the dither pass so existing artwork is preserved.
            - paragraph [ref=e323]: Drag across the canvas to define direction. If a selection is active, only the selected area is filled.
          - generic [ref=e324]:
            - heading "Symmetry & Composition" [level=3] [ref=e325]
            - generic [ref=e326] [cursor=pointer]:
              - checkbox "Horizontal mirror (Shift+H)" [ref=e327]
              - generic [ref=e328]: Horizontal mirror (Shift+H)
            - generic [ref=e329] [cursor=pointer]:
              - checkbox "Vertical mirror (Shift+V)" [ref=e330]
              - generic [ref=e331]: Vertical mirror (Shift+V)
            - generic [ref=e332]:
              - text: Composition Guide
              - combobox "Composition guide" [ref=e333] [cursor=pointer]:
                - option "Off" [selected]
                - option "Rule of thirds"
                - option "Golden ratio"
                - option "Center crosshair"
                - option "Diagonals"
                - option "Safe area (10%)"
    - contentinfo [ref=e335]:
      - generic [ref=e336]:
        - generic [ref=e337]:
          - generic [ref=e338]:
            - button "Play" [ref=e339]
            - button "Previous Frame (,)" [ref=e342]
            - button "Next Frame (.)" [ref=e344]
            - button "Repeat" [ref=e346]
          - generic [ref=e350]:
            - button "Preview speed" [ref=e352]:
              - generic [ref=e353]: Preview
              - generic [ref=e354]: 1×
              - generic [ref=e355]: ▾
            - generic [ref=e356]:
              - generic [ref=e357]: Frame time
              - spinbutton "Active frame duration in milliseconds" [ref=e358]: "100"
              - generic [ref=e359]: ms
            - button "Onion Skin" [ref=e360]
            - button "Onion skin settings" [ref=e363]: ⚙
        - generic [ref=e364]:
          - button "+ Frame" [ref=e365]:
            - generic [ref=e366]: Frame
          - group [ref=e368]:
            - generic "Frame actions" [ref=e369] [cursor=pointer]:
              - text: Frame actions
              - generic [ref=e370]: ▾
          - button "Collapse Timeline" [ref=e372]:
            - generic [ref=e373]:
              - generic [ref=e374]: ▼
              - generic [ref=e375]: Collapse
      - generic [ref=e376]:
        - 'button "Select frame 1. Duration: 100ms. Drag to reorder." [ref=e378]':
          - generic:
            - generic: "#1"
            - generic: 100ms
        - button "Clips" [ref=e379]
    - generic [ref=e381]:
      - generic [ref=e382]: "X: — Y: —"
      - generic [ref=e385]: 32×32
      - generic [ref=e388]: 1600%
      - generic [ref=e390]: Frame 1/1
      - generic [ref=e392]: Base Layer
      - generic [ref=e393]: gradient
      - status "All changes saved to local storage" [ref=e398]:
        - generic [ref=e400]: Saved
  - alert [ref=e401]
```

# Test source

```ts
  1   | import { expect, test, type Page } from '@playwright/test';
  2   | 
  3   | async function ready(page: Page) {
  4   |   await page.setViewportSize({ width: 1440, height: 900 });
  5   |   await page.goto('/studio');
  6   |   await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  7   |   await expect(page.getByTestId('main-composite-canvas')).toBeVisible();
  8   | }
  9   | const pixels = (page: Page) => page.getByTestId('main-composite-canvas').evaluate((c: HTMLCanvasElement) =>
  10  |   Array.from(c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data));
  11  | async function draw(page: Page, from: [number, number], to: [number, number]) {
  12  |   const box = (await page.locator('#center-canvas-area').boundingBox())!;
  13  |   await page.mouse.move(box.x + (from[0] + 0.5) * box.width / 32, box.y + (from[1] + 0.5) * box.height / 32);
  14  |   await page.mouse.down();
  15  |   await page.mouse.move(box.x + (to[0] + 0.5) * box.width / 32, box.y + (to[1] + 0.5) * box.height / 32, { steps: 6 });
  16  |   await page.mouse.up();
  17  | }
  18  | test('compiled layout, palette preview and focus restore the same artwork after reload', async ({ page }) => {
  19  |   await ready(page); await draw(page, [8, 8], [14, 12]); const artwork = await pixels(page);
  20  |   expect(artwork.some((v, i) => i % 4 === 3 && v !== 0)).toBe(true);
  21  |   await page.getByLabel('Workspace layout').selectOption('lighting');
  22  |   await expect(page.getByTestId('bottom-timeline')).toBeHidden();
  23  |   await page.getByTestId('tab-palette').click();
  24  |   await expect(page.getByRole('region', { name: 'Pinned color panel' })).toBeVisible();
  25  |   await expect(page.getByRole('region', { name: 'Canvas navigator' })).toBeVisible();
  26  |   await page.getByRole('button', { name: 'View options menu', exact: true }).click();
  27  |   await page.getByRole('button', { name: 'Arrange...', exact: true }).click();
  28  |   await page.getByLabel('Inspector position').selectOption('left');
  29  |   await page.getByLabel('New workspace name').pressSequentially('Color desk');
  30  |   await expect(page.getByLabel('New workspace name')).toHaveValue('Color desk');
  31  |   // Shift+Tab in a text field retains keyboard navigation and cannot hide panels.
  32  |   await page.getByLabel('New workspace name').press('Shift+Tab');
  33  |   await expect(page.getByRole('dialog', { name: 'Arrange workspace' })).toBeVisible();
  34  |   await expect(page.getByTestId('right-inspector')).toBeVisible();
  35  |   await page.getByRole('button', { name: 'Save layout', exact: true }).click();
  36  |   await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  37  |   await page.getByTestId('tab-palette').click();
  38  |   await page.getByRole('button', { name: /Browse palettes/ }).click();
  39  |   await page.getByLabel('Search palettes').fill('DawnBringer');
  40  |   await page.getByRole('button', { name: 'Preview DawnBringer 16', exact: true }).click();
  41  |   await expect(page.getByRole('region', { name: 'Selected palette preview' })).toContainText('DawnBringer');
  42  |   expect(await pixels(page)).toEqual(artwork);
  43  |   await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  44  |   await page.locator('#center-canvas-area').focus(); await page.keyboard.press('Shift+Tab');
  45  |   await expect(page.getByTestId('right-inspector')).toBeHidden(); expect(await pixels(page)).toEqual(artwork);
  46  |   await page.keyboard.press('Shift+Tab'); await expect(page.getByTestId('right-inspector')).toBeVisible();
  47  |   await page.getByRole('button', { name: 'View options menu', exact: true }).click();
  48  |   await page.getByRole('button', { name: 'Canvas Only ⇧ Tab', exact: true }).click();
  49  |   await expect(page.getByTestId('right-inspector')).toBeHidden();
  50  |   await expect(page.locator('#center-canvas-area')).toBeFocused();
  51  |   await page.keyboard.press('Shift+Tab'); await expect(page.getByTestId('right-inspector')).toBeVisible();
  52  |   await page.getByRole('button', { name: 'Save now', exact: true }).click();
  53  |   await expect.poll(() => page.getByRole('status').first().textContent()).toContain('Changes saved');
  54  |   await page.reload(); await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  55  |   await expect(page.getByLabel('Workspace layout').locator('option:checked')).toHaveText('Color desk');
  56  |   expect(await pixels(page)).toEqual(artwork);
  57  |   // Establish a keyboard opener; pointer clicks need not focus buttons in WebKit.
  58  |   await page.getByRole('button', { name: 'View options menu', exact: true }).focus();
  59  |   await page.getByRole('button', { name: 'View options menu', exact: true }).press('Enter');
  60  |   await page.getByRole('button', { name: 'Arrange...', exact: true }).press('Enter');
  61  |   await page.getByLabel('New workspace name').pressSequentially('Temporary name');
  62  |   await expect(page.getByLabel('New workspace name')).toBeFocused();
  63  |   await page.getByLabel('New workspace name').press('Escape');
  64  |   await expect(page.getByRole('dialog', { name: 'Arrange workspace' })).toBeHidden();
  65  |   await expect(page.getByRole('button', { name: 'View options menu', exact: true })).toBeFocused();
  66  |   expect(await pixels(page)).toEqual(artwork);
  67  | });
  68  | test('compiled radial gradient uses the active palette and one undoable layer fill', async ({ page }) => {
  69  |   await ready(page); const blank = await pixels(page);
  70  |   await page.getByTestId('tab-palette').click();
  71  |   await page.getByRole('button', { name: /Browse palettes/ }).click();
  72  |   await page.getByLabel('Search palettes').fill('Monitor Glow');
  73  |   await page.getByRole('button', { name: 'Preview 1bit Monitor Glow', exact: true }).click();
  74  |   await page.getByRole('button', { name: 'Use palette', exact: true }).click();
  75  |   await page.locator('#center-canvas-area').focus(); await page.keyboard.press('Shift+G');
  76  |   await page.getByTestId('tab-tools').click();
  77  |   await page.getByLabel('Gradient shape').selectOption('radial');
  78  |   await page.getByLabel('Gradient colors').selectOption('palette');
  79  |   await page.getByLabel('Bayer 4×4 dithering').uncheck();
> 80  |   await page.getByLabel('Draw on new layer', { exact: true }).uncheck();
      |                                                               ^ Error: locator.uncheck: Test timeout of 60000ms exceeded.
  81  |   await draw(page, [16, 16], [24, 16]); const filled = await pixels(page);
  82  |   const at = (x: number, y: number) => filled.slice((y * 32 + x) * 4, (y * 32 + x) * 4 + 4);
  83  |   expect(at(16, 16)).toEqual([34, 35, 35, 255]); expect(at(24, 16)).toEqual([240, 246, 240, 255]);
  84  |   expect(at(20, 16)).toEqual(at(16, 20));
  85  |   for (let i = 0; i < filled.length; i += 4) expect([[34, 35, 35, 255], [240, 246, 240, 255]]).toContainEqual(filled.slice(i, i + 4));
  86  |   await page.getByTestId('undo-button').click(); await expect.poll(() => pixels(page)).toEqual(blank);
  87  |   await page.getByTestId('redo-button').click(); await expect.poll(() => pixels(page)).toEqual(filled);
  88  |   // Repeating the identical fill creates no extra history step.
  89  |   await draw(page, [16, 16], [24, 16]); await page.getByTestId('undo-button').click(); await expect.poll(() => pixels(page)).toEqual(blank);
  90  | });
  91  | test('compiled onion controls compare distinct poses and persist without painting ghosts', async ({ page }, testInfo) => {
  92  |   await ready(page); await draw(page, [8, 8], [8, 8]);
  93  |   await page.getByTestId('add-frame-button').click(); await draw(page, [12, 12], [12, 12]);
  94  |   const artwork = await pixels(page);
  95  |   await page.getByLabel('Onion skin settings', { exact: true }).click();
  96  |   await page.getByRole('button', { name: 'Previous pose', exact: true }).click();
  97  |   await page.getByLabel('Previous onion tint', { exact: true }).fill('#ff0000');
  98  |   await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  99  |   const ghost = () => page.getByTestId('onion-skin-canvas').evaluate((c: HTMLCanvasElement) => Array.from(c.getContext('2d')!.getImageData(8, 8, 1, 1).data));
  100 |   await expect.poll(ghost).toEqual([255, 0, 0, 89]); expect(await pixels(page)).toEqual(artwork);
  101 |   await page.getByRole('button', { name: 'Save now', exact: true }).click();
  102 |   await expect.poll(() => page.getByRole('status').first().textContent()).toContain('Changes saved');
  103 |   await page.reload(); await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  104 |   // Projects reopen on their first frame; return to the pose being compared.
  105 |   await page.getByRole('button', { name: /^Select frame 2\./ }).click();
  106 |   await expect.poll(ghost).toEqual([255, 0, 0, 89]); expect(await pixels(page)).toEqual(artwork);
  107 |   await page.getByLabel('Onion skin settings', { exact: true }).click();
  108 |   await expect(page.getByLabel('Previous onion frames', { exact: true })).toHaveValue('1');
  109 |   await expect(page.getByLabel('Next onion frames', { exact: true })).toHaveValue('0');
  110 |   await expect(page.getByLabel('Previous onion tint', { exact: true })).toHaveValue('#ff0000');
  111 |   if (testInfo.project.name === 'chromium') await page.screenshot({ path: testInfo.outputPath('onion-settings.png') });
  112 |   await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  113 |   await page.locator('#center-canvas-area').focus(); await page.keyboard.press('F3');
  114 |   await expect.poll(ghost).toEqual([0, 0, 0, 0]); expect(await pixels(page)).toEqual(artwork);
  115 | });
  116 | 
  117 | test('compiled palette application and reload retain two distinct strokes and a favorite', async ({ page }) => {
  118 |   await ready(page);
  119 |   await page.getByTestId('tab-palette').click();
  120 |   await page.getByLabel('Picker hex color').fill('#5d275d');
  121 |   await draw(page, [5, 5], [9, 5]);
  122 |   await page.getByLabel('Picker hex color').fill('#00e600');
  123 |   await draw(page, [20, 20], [24, 20]);
  124 |   const artwork = await pixels(page);
  125 |   const at = (x: number, y: number) => artwork.slice((y * 32 + x) * 4, (y * 32 + x) * 4 + 4);
  126 |   expect(at(5, 5)).toEqual([93, 39, 93, 255]);
  127 |   expect(at(20, 20)).toEqual([0, 230, 0, 255]);
  128 |   await page.getByTestId('tab-palette').click();
  129 |   await page.getByRole('button', { name: /Browse palettes/ }).click();
  130 |   await page.getByLabel('Search palettes').fill('Sweetie');
  131 |   await page.getByRole('button', { name: 'Preview Sweetie 16', exact: true }).click();
  132 |   expect(await pixels(page)).toEqual(artwork);
  133 |   await page.getByRole('button', { name: 'Favorite Sweetie 16', exact: true }).click();
  134 |   await page.getByRole('button', { name: 'Use palette', exact: true }).click();
  135 |   expect(await pixels(page)).toEqual(artwork);
  136 |   await page.getByRole('button', { name: 'Save now', exact: true }).click();
  137 |   await expect.poll(() => page.getByRole('status').first().textContent()).toContain('Changes saved');
  138 |   await page.reload();
  139 |   await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  140 |   await expect.poll(() => pixels(page)).toEqual(artwork);
  141 |   await page.getByTestId('tab-palette').click();
  142 |   await page.getByRole('button', { name: /Browse palettes/ }).click();
  143 |   await page.getByLabel('Palette collection').selectOption('favorites');
  144 |   await expect(page.getByRole('button', { name: 'Preview Sweetie 16', exact: true })).toBeVisible();
  145 |   await expect(page.getByRole('region', { name: 'Selected palette preview' })).toContainText('GrafxKid');
  146 |   expect(await pixels(page)).toEqual(artwork);
  147 | });
  148 | 
```