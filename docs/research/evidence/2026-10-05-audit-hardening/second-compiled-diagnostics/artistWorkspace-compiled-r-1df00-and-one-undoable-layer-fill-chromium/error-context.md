# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: artistWorkspace.spec.ts >> compiled radial gradient uses the active palette and one undoable layer fill
- Location: tests\production\artistWorkspace.spec.ts:67:5

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: locator.click: Test timeout of 60000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Tool settings', exact: true })

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
        - application "Pixel art drawing canvas. Use mouse or stylus to paint, arrow keys to pan viewport or nudge selection, and Alt+drag to pan." [active] [ref=e288]
      - complementary [ref=e291]:
        - generic [ref=e292]:
          - button "Tools" [ref=e293]
          - button "Layers" [ref=e295]
          - button "Palette" [pressed] [ref=e297]
          - button "PixiTools" [ref=e299]:
            - generic [ref=e300]: FX
        - generic [ref=e302]:
          - region "Pinned color panel" [ref=e303]:
            - generic [ref=e304]:
              - generic [ref=e305]:
                - generic [ref=e306]: Color Wheel
                - generic [ref=e307]:
                  - button "Foreground ·" [pressed] [ref=e308]:
                    - generic [ref=e310]: Foreground
                    - text: ·
                  - button "Background" [ref=e311]
              - generic [ref=e314]:
                - button "Collapse pinned color panel" [ref=e315]: ▲
                - button "Unpin color panel" [ref=e316]: ✕
            - generic [ref=e318]:
              - generic [ref=e319]:
                - generic [ref=e320]: Color picker
                - combobox "Color picker shape" [ref=e321]:
                  - option "Triangle" [selected]
                  - option "Square"
              - img "Saturation and value triangle. Use the sliders below for keyboard control." [ref=e325]
              - generic [ref=e326]:
                - generic [ref=e327]: Hue
                - slider "Picker hue" [ref=e328]: "264"
              - generic [ref=e329]:
                - generic [ref=e330]: Saturation
                - slider "Picker saturation" [ref=e331]: "39"
              - generic [ref=e332]:
                - generic [ref=e333]: Value
                - slider "Picker value" [ref=e334]: "30"
              - textbox "Picker hex color" [ref=e337]: "#3A2E4C"
          - generic [ref=e338]:
            - generic [ref=e339]:
              - generic [ref=e340]: Palette
              - combobox "Color palette preset" [ref=e341] [cursor=pointer]:
                - option "Alabaster & Wisteria (Active Theme) (8)"
                - option "Cozy Hearth 16 (16)"
                - option "Pico-8 (16)"
                - option "Endesga 32 (EDG32) (32)"
                - option "1bit Monitor Glow (2)" [selected]
            - generic [ref=e342]:
              - 'generic "Primary Color: #3A2E4C" [ref=e343]': "1"
              - generic [ref=e346]: "|"
              - 'generic "Secondary Color: #C792DF" [ref=e347]': "2"
          - button "Browse palettes Previews & favorites →" [ref=e350]:
            - text: Browse palettes
            - generic [ref=e351]: Previews & favorites →
          - generic [ref=e352]:
            - generic [ref=e353]:
              - 'button "Select color #222323" [ref=e354] [cursor=pointer]'
              - 'button "Select color #f0f6f0" [ref=e355] [cursor=pointer]'
            - generic [ref=e356]:
              - generic [ref=e357]: Choose a color
              - button "Remove color" [disabled] [ref=e358]
          - generic [ref=e360]:
            - button "Create palette" [ref=e361]
            - button "Scan Canvas" [ref=e363]
            - button "+ OKLCH Ramp" [ref=e365]:
              - generic [ref=e366]: + OKLCH
            - button "+ Lospec" [ref=e367]
          - group [ref=e369]:
            - generic "Roles and index bindings" [ref=e370] [cursor=pointer]
            - 'option "#0: #222323" [selected]'
            - 'option "#1: #f0f6f0"'
          - generic [ref=e372]:
            - heading [level=3] [ref=e373]:
              - button "Cycle Engine" [ref=e374] [cursor=pointer]:
                - generic [ref=e377]: ▸
            - button "Play Cycle" [ref=e379]
    - contentinfo [ref=e381]:
      - generic [ref=e382]:
        - generic [ref=e383]:
          - generic [ref=e384]:
            - button "Play" [ref=e385]
            - button "Previous Frame (,)" [ref=e388]
            - button "Next Frame (.)" [ref=e390]
            - button "Repeat" [ref=e392]
          - generic [ref=e396]:
            - button "Preview speed" [ref=e398]:
              - generic [ref=e399]: Preview
              - generic [ref=e400]: 1×
              - generic [ref=e401]: ▾
            - generic [ref=e402]:
              - generic [ref=e403]: Frame time
              - spinbutton "Active frame duration in milliseconds" [ref=e404]: "100"
              - generic [ref=e405]: ms
            - button "Onion Skin" [ref=e406]
            - button "Onion skin settings" [ref=e409]: ⚙
        - generic [ref=e410]:
          - button "+ Frame" [ref=e411]:
            - generic [ref=e412]: Frame
          - group [ref=e414]:
            - generic "Frame actions" [ref=e415] [cursor=pointer]:
              - text: Frame actions
              - generic [ref=e416]: ▾
          - button "Collapse Timeline" [ref=e418]:
            - generic [ref=e419]:
              - generic [ref=e420]: ▼
              - generic [ref=e421]: Collapse
      - generic [ref=e422]:
        - 'button "Select frame 1. Duration: 100ms. Drag to reorder." [ref=e424]':
          - generic:
            - generic: "#1"
            - generic: 100ms
        - button "Clips" [ref=e425]
    - generic [ref=e427]:
      - generic [ref=e428]: "X: — Y: —"
      - generic [ref=e431]: 32×32
      - generic [ref=e434]: 1600%
      - generic [ref=e436]: Frame 1/1
      - generic [ref=e438]: Base Layer
      - generic [ref=e439]: gradient
      - status "All changes saved to local storage" [ref=e444]:
        - generic [ref=e446]: Saved
  - alert [ref=e447]
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
  47  |   await page.getByRole('button', { name: 'Canvas only ⇧ Tab', exact: true }).click();
  48  |   await expect(page.getByTestId('right-inspector')).toBeHidden();
  49  |   await expect(page.locator('#center-canvas-area')).toBeFocused();
  50  |   await page.keyboard.press('Shift+Tab'); await expect(page.getByTestId('right-inspector')).toBeVisible();
  51  |   await page.getByRole('button', { name: 'Save now', exact: true }).click();
  52  |   await expect.poll(() => page.getByRole('status').first().textContent()).toContain('Changes saved');
  53  |   await page.reload(); await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  54  |   await expect(page.getByLabel('Workspace layout').locator('option:checked')).toHaveText('Color desk');
  55  |   expect(await pixels(page)).toEqual(artwork);
  56  |   // Establish a keyboard opener; pointer clicks need not focus buttons in WebKit.
  57  |   await page.getByRole('button', { name: 'View options menu', exact: true }).focus();
  58  |   await page.getByRole('button', { name: 'View options menu', exact: true }).press('Enter');
  59  |   await page.getByRole('button', { name: 'Arrange...', exact: true }).press('Enter');
  60  |   await page.getByLabel('New workspace name').pressSequentially('Temporary name');
  61  |   await expect(page.getByLabel('New workspace name')).toBeFocused();
  62  |   await page.getByLabel('New workspace name').press('Escape');
  63  |   await expect(page.getByRole('dialog', { name: 'Arrange workspace' })).toBeHidden();
  64  |   await expect(page.getByRole('button', { name: 'View options menu', exact: true })).toBeFocused();
  65  |   expect(await pixels(page)).toEqual(artwork);
  66  | });
  67  | test('compiled radial gradient uses the active palette and one undoable layer fill', async ({ page }) => {
  68  |   await ready(page); const blank = await pixels(page);
  69  |   await page.getByTestId('tab-palette').click();
  70  |   await page.getByRole('button', { name: /Browse palettes/ }).click();
  71  |   await page.getByLabel('Search palettes').fill('Monitor Glow');
  72  |   await page.getByRole('button', { name: 'Preview 1bit Monitor Glow', exact: true }).click();
  73  |   await page.getByRole('button', { name: 'Use palette', exact: true }).click();
  74  |   await page.locator('#center-canvas-area').focus(); await page.keyboard.press('Shift+G');
> 75  |   await page.getByRole('button', { name: 'Tool settings', exact: true }).click();
      |                                                                          ^ Error: locator.click: Test timeout of 60000ms exceeded.
  76  |   await page.getByLabel('Gradient shape').selectOption('radial');
  77  |   await page.getByLabel('Gradient colors').selectOption('palette');
  78  |   await page.getByLabel('Bayer 4×4 dithering').uncheck();
  79  |   await draw(page, [16, 16], [24, 16]); const filled = await pixels(page);
  80  |   const at = (x: number, y: number) => filled.slice((y * 32 + x) * 4, (y * 32 + x) * 4 + 4);
  81  |   expect(at(16, 16)).toEqual([34, 35, 35, 255]); expect(at(24, 16)).toEqual([240, 246, 240, 255]);
  82  |   expect(at(20, 16)).toEqual(at(16, 20));
  83  |   for (let i = 0; i < filled.length; i += 4) expect([[34, 35, 35, 255], [240, 246, 240, 255]]).toContainEqual(filled.slice(i, i + 4));
  84  |   await page.getByTestId('undo-button').click(); await expect.poll(() => pixels(page)).toEqual(blank);
  85  |   await page.getByTestId('redo-button').click(); await expect.poll(() => pixels(page)).toEqual(filled);
  86  |   // Repeating the identical fill creates no extra history step.
  87  |   await draw(page, [16, 16], [24, 16]); await page.getByTestId('undo-button').click(); await expect.poll(() => pixels(page)).toEqual(blank);
  88  | });
  89  | test('compiled onion controls compare distinct poses and persist without painting ghosts', async ({ page }, testInfo) => {
  90  |   await ready(page); await draw(page, [8, 8], [8, 8]);
  91  |   await page.getByTestId('add-frame-button').click(); await draw(page, [12, 12], [12, 12]);
  92  |   const artwork = await pixels(page);
  93  |   await page.getByLabel('Onion skin settings', { exact: true }).click();
  94  |   await page.getByRole('button', { name: 'Previous pose', exact: true }).click();
  95  |   await page.getByLabel('Previous onion tint', { exact: true }).fill('#ff0000');
  96  |   await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  97  |   const ghost = () => page.getByTestId('onion-skin-canvas').evaluate((c: HTMLCanvasElement) => Array.from(c.getContext('2d')!.getImageData(8, 8, 1, 1).data));
  98  |   await expect.poll(ghost).toEqual([255, 0, 0, 89]); expect(await pixels(page)).toEqual(artwork);
  99  |   await page.getByRole('button', { name: 'Save now', exact: true }).click();
  100 |   await expect.poll(() => page.getByRole('status').first().textContent()).toContain('Changes saved');
  101 |   await page.reload(); await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  102 |   // Projects reopen on their first frame; return to the pose being compared.
  103 |   await page.getByRole('button', { name: /^Select frame 2\./ }).click();
  104 |   await expect.poll(ghost).toEqual([255, 0, 0, 89]); expect(await pixels(page)).toEqual(artwork);
  105 |   await page.getByLabel('Onion skin settings', { exact: true }).click();
  106 |   await expect(page.getByLabel('Previous onion frames', { exact: true })).toHaveValue('1');
  107 |   await expect(page.getByLabel('Next onion frames', { exact: true })).toHaveValue('0');
  108 |   await expect(page.getByLabel('Previous onion tint', { exact: true })).toHaveValue('#ff0000');
  109 |   if (testInfo.project.name === 'chromium') await page.screenshot({ path: testInfo.outputPath('onion-settings.png') });
  110 |   await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  111 |   await page.locator('#center-canvas-area').focus(); await page.keyboard.press('F3');
  112 |   await expect.poll(ghost).toEqual([0, 0, 0, 0]); expect(await pixels(page)).toEqual(artwork);
  113 | });
  114 | 
  115 | test('compiled palette application and reload retain two distinct strokes and a favorite', async ({ page }) => {
  116 |   await ready(page);
  117 |   await page.getByRole('navigation', { name: 'Artist workspace' }).getByRole('button', { name: 'Color', exact: true }).click();
  118 |   await page.getByLabel('Picker hex color').fill('#5d275d');
  119 |   await draw(page, [5, 5], [9, 5]);
  120 |   await page.getByLabel('Picker hex color').fill('#00e600');
  121 |   await draw(page, [20, 20], [24, 20]);
  122 |   const artwork = await pixels(page);
  123 |   const at = (x: number, y: number) => artwork.slice((y * 32 + x) * 4, (y * 32 + x) * 4 + 4);
  124 |   expect(at(5, 5)).toEqual([93, 39, 93, 255]);
  125 |   expect(at(20, 20)).toEqual([0, 230, 0, 255]);
  126 |   await page.getByTestId('tab-palette').click();
  127 |   await page.getByRole('button', { name: /Browse palettes/ }).click();
  128 |   await page.getByLabel('Search palettes').fill('Sweetie');
  129 |   await page.getByRole('button', { name: 'Preview Sweetie 16', exact: true }).click();
  130 |   expect(await pixels(page)).toEqual(artwork);
  131 |   await page.getByRole('button', { name: 'Favorite Sweetie 16', exact: true }).click();
  132 |   await page.getByRole('button', { name: 'Use palette', exact: true }).click();
  133 |   expect(await pixels(page)).toEqual(artwork);
  134 |   await page.getByRole('button', { name: 'Save now', exact: true }).click();
  135 |   await expect.poll(() => page.getByRole('status').first().textContent()).toContain('Changes saved');
  136 |   await page.reload();
  137 |   await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  138 |   await expect.poll(() => pixels(page)).toEqual(artwork);
  139 |   await page.getByTestId('tab-palette').click();
  140 |   await page.getByRole('button', { name: /Browse palettes/ }).click();
  141 |   await page.getByLabel('Palette collection').selectOption('favorites');
  142 |   await expect(page.getByRole('button', { name: 'Preview Sweetie 16', exact: true })).toBeVisible();
  143 |   await expect(page.getByRole('region', { name: 'Selected palette preview' })).toContainText('GrafxKid');
  144 |   expect(await pixels(page)).toEqual(artwork);
  145 | });
  146 | 
```