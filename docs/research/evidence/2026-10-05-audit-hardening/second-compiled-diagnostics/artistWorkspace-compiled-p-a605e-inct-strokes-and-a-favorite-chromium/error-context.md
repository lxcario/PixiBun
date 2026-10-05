# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: artistWorkspace.spec.ts >> compiled palette application and reload retain two distinct strokes and a favorite
- Location: tests\production\artistWorkspace.spec.ts:115:5

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: locator.click: Test timeout of 60000ms exceeded.
Call log:
  - waiting for getByRole('navigation', { name: 'Artist workspace' }).getByRole('button', { name: 'Color', exact: true })

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
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
          - generic [ref=e186]:
            - button "Undo last action" [disabled]
          - generic [ref=e187]:
            - button "Redo last action" [disabled]
      - group "Drawing controls" [ref=e188]:
        - generic "Tool options rail" [ref=e189]:
          - generic [ref=e190]: "Pen:"
          - generic [ref=e191]:
            - button "Brush size 1 pixels" [ref=e192]:
              - generic [ref=e193]: Size
              - generic [ref=e194]: 1 px
              - generic [ref=e195]: ▾
            - generic "Quick brush size presets" [ref=e196]:
              - button "1px brush preset" [pressed] [ref=e197]: "1"
              - button "2px brush preset" [ref=e198]: "2"
              - button "3px brush preset" [ref=e199]: "3"
              - button "4px brush preset" [ref=e200]: "4"
            - button "Disable clean corners" [pressed] [ref=e201]:
              - generic [ref=e202]: Pixel-Perfect
      - generic [ref=e203]:
        - group "Canvas controls" [ref=e204]:
          - group "Mirror drawing" [ref=e205]:
            - generic [ref=e206]: Mirror
            - button "Horizontal symmetry" [ref=e208] [cursor=pointer]
            - button "Vertical symmetry" [ref=e210] [cursor=pointer]
          - generic [ref=e212]:
            - generic [ref=e213]:
              - button "Zoom Out" [ref=e214] [cursor=pointer]: −
              - button "Zoom 1600 percent. Choose zoom level" [ref=e216]: 1600%
              - button "Zoom In" [ref=e217] [cursor=pointer]: +
            - button "Fit Canvas to Viewport (Ctrl+0)" [ref=e219] [cursor=pointer]: Fit
          - button "View options menu" [ref=e223] [cursor=pointer]:
            - generic [ref=e224]:
              - generic [ref=e225]: View
              - generic "1 active view options" [ref=e226]
            - generic [ref=e227]: ▼
        - group "Workspace presets" [ref=e228]:
          - combobox "Workspace layout" [ref=e229] [cursor=pointer]:
            - option "Drawing" [selected]
            - option "Animation"
            - option "Lighting"
        - group "Studio settings and help" [ref=e230]:
          - button "Studio options" [ref=e231] [cursor=pointer]:
            - generic [ref=e232]: Studio
            - generic [ref=e233]: ▼
        - button "Export drawing" [ref=e235]:
          - generic [ref=e236]: Export
    - status [ref=e238]: Not saved yet
    - generic [ref=e239]:
      - complementary [ref=e241]:
        - generic [ref=e243]:
          - group "Drawing" [ref=e244]:
            - button "Pen" [pressed] [ref=e246] [cursor=pointer]
            - button "Bézier Curve" [ref=e248] [cursor=pointer]
            - button "Eraser" [ref=e250] [cursor=pointer]
            - button "Flood Fill" [ref=e252] [cursor=pointer]
            - button "Pixel Gradient" [ref=e254] [cursor=pointer]
            - button "Dither Brush" [ref=e256] [cursor=pointer]
            - button "Color Replace" [ref=e258] [cursor=pointer]
            - button "Erase Sampled Color" [ref=e260] [cursor=pointer]
          - group "Selection" [ref=e261]:
            - button "Marquee Box" [ref=e264] [cursor=pointer]
            - button "Lasso Select" [ref=e266] [cursor=pointer]
            - button "Magic Wand" [ref=e268] [cursor=pointer]
          - group "Geometry" [ref=e269]:
            - button "Line" [ref=e272] [cursor=pointer]
            - button "2:1 Iso Line" [ref=e274] [cursor=pointer]
            - button "Rectangle" [ref=e276] [cursor=pointer]
            - button "Ellipse" [ref=e278] [cursor=pointer]
          - group "2.5D Sculpt" [ref=e279]:
            - button "Normal Chisel" [ref=e282] [cursor=pointer]
          - group "Utility" [ref=e283]:
            - button "Eyedropper" [ref=e286] [cursor=pointer]
        - generic [ref=e287]:
          - generic [ref=e288]:
            - button "Swap colors (X)" [ref=e289] [cursor=pointer]: ⇄
            - button "Reset default black and white colors (Shift+D)" [ref=e290] [cursor=pointer]
            - 'button "Secondary color #C792DF. Click for quick swatches, double click for picker, right click to swap" [ref=e291] [cursor=pointer]'
            - 'button "Primary color #3A2E4C. Click for quick swatches, double click for picker, right click to swap" [ref=e292] [cursor=pointer]'
          - generic [ref=e293]:
            - generic [ref=e294]:
              - 'button "#DDDFDF (Click: Primary | Right-click: Secondary)" [ref=e295] [cursor=pointer]'
              - 'button "#DDDDDF (Click: Primary | Right-click: Secondary)" [ref=e296] [cursor=pointer]'
              - 'button "#D0C4DF (Click: Primary | Right-click: Secondary)" [ref=e297] [cursor=pointer]'
              - 'button "#DCABDF (Click: Primary | Right-click: Secondary)" [ref=e298] [cursor=pointer]'
            - button "Quick Swatches Flyout" [ref=e299] [cursor=pointer]
      - main "Pixel art canvas workspace" [ref=e303]:
        - application "Pixel art drawing canvas. Use mouse or stylus to paint, arrow keys to pan viewport or nudge selection, and Alt+drag to pan." [ref=e304]
      - complementary [ref=e307]:
        - generic [ref=e308]:
          - button "Tools" [ref=e309]
          - button "Layers" [pressed] [ref=e311]
          - button "Palette" [ref=e313]
          - button "PixiTools" [ref=e315]:
            - generic [ref=e316]: FX
        - generic [ref=e318]:
          - generic [ref=e319]:
            - generic "Each frame has its own layer pixels. A new blank frame keeps the layer names and settings." [ref=e320]:
              - text: Frame 1 · Layers
              - generic [ref=e321]: (1)
            - generic [ref=e322]:
              - button "Add New Layer" [ref=e323]
              - button "Duplicate Layer" [ref=e325]
              - button "Merge Down" [disabled] [ref=e327]
              - button "Delete Layer" [disabled] [ref=e329]
          - generic [ref=e331]:
            - generic [ref=e332]:
              - generic [ref=e333]: Opacity
              - slider "Layer opacity" [ref=e334] [cursor=pointer]: "100"
              - generic [ref=e335]: 100%
            - generic [ref=e336]:
              - generic [ref=e337]: Blend
              - combobox "Layer blend mode" [ref=e338] [cursor=pointer]:
                - option "Normal" [selected]
                - option "Multiply"
                - option "Screen"
                - option "Overlay"
                - option "Color Dodge"
                - option "On artwork only"
          - generic [ref=e340]:
            - generic [ref=e341]:
              - button "Reorder layer Base Layer" [disabled] [ref=e342]:
                - generic [ref=e343]: ⠿
              - generic [ref=e344]:
                - button "Select layer Base Layer. Double click to rename" [ref=e345] [cursor=pointer]: Base Layer
                - button "Rename layer Base Layer" [ref=e346] [cursor=pointer]
            - generic [ref=e347]:
              - button "Lock layer Base Layer" [ref=e348]
              - button "Hide layer Base Layer" [ref=e349]
    - contentinfo [ref=e351]:
      - generic [ref=e352]:
        - generic [ref=e353]:
          - generic [ref=e354]:
            - button "Play" [ref=e355]
            - button "Previous Frame (,)" [ref=e358]
            - button "Next Frame (.)" [ref=e360]
            - button "Repeat" [ref=e362]
          - generic [ref=e366]:
            - button "Preview speed" [ref=e368]:
              - generic [ref=e369]: Preview
              - generic [ref=e370]: 1×
              - generic [ref=e371]: ▾
            - generic [ref=e372]:
              - generic [ref=e373]: Frame time
              - spinbutton "Active frame duration in milliseconds" [ref=e374]: "100"
              - generic [ref=e375]: ms
            - button "Onion Skin" [ref=e376]
            - button "Onion skin settings" [ref=e379]: ⚙
        - generic [ref=e380]:
          - button "+ Frame" [ref=e381]:
            - generic [ref=e382]: Frame
          - group [ref=e384]:
            - generic "Frame actions" [ref=e385] [cursor=pointer]:
              - text: Frame actions
              - generic [ref=e386]: ▾
          - button "Collapse Timeline" [ref=e388]:
            - generic [ref=e389]:
              - generic [ref=e390]: ▼
              - generic [ref=e391]: Collapse
      - generic [ref=e392]:
        - 'button "Select frame 1. Duration: 100ms. Drag to reorder." [ref=e394]':
          - generic:
            - generic: "#1"
            - generic: 100ms
        - button "Clips" [ref=e395]
    - generic [ref=e397]:
      - generic [ref=e398]: "X: — Y: —"
      - generic [ref=e401]: 32×32
      - generic [ref=e404]: 1600%
      - generic [ref=e406]: Frame 1/1
      - generic [ref=e408]: Base Layer
      - generic [ref=e409]: pen
      - status "All changes saved to local storage" [ref=e414]:
        - generic [ref=e416]: Saved
  - alert [ref=e417]
```

# Test source

```ts
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
  75  |   await page.getByRole('button', { name: 'Tool settings', exact: true }).click();
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
> 117 |   await page.getByRole('navigation', { name: 'Artist workspace' }).getByRole('button', { name: 'Color', exact: true }).click();
      |                                                                                                                        ^ Error: locator.click: Test timeout of 60000ms exceeded.
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