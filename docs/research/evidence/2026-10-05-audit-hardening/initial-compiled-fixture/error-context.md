# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: artistWorkspace.spec.ts >> compiled layout, palette preview and focus restore the same artwork after reload
- Location: tests\production\artistWorkspace.spec.ts:18:5

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: locator.click: Test timeout of 60000ms exceeded.
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
            - option "Animation"
            - option "Lighting" [selected]
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
        - application "Pixel art drawing canvas. Use mouse or stylus to paint, arrow keys to pan viewport or nudge selection, and Alt+drag to pan." [ref=e305]
      - complementary [ref=e308]:
        - generic [ref=e309]:
          - button "Tools" [ref=e310]
          - button "Layers" [ref=e312]
          - button "Palette" [active] [pressed] [ref=e314]
          - button "PixiTools" [ref=e316]:
            - generic [ref=e317]: FX
        - generic [ref=e319]:
          - region "Pinned color panel" [ref=e320]:
            - generic [ref=e321]:
              - generic [ref=e322]:
                - generic [ref=e323]: Color Wheel
                - generic [ref=e324]:
                  - button "Foreground ·" [pressed] [ref=e325]:
                    - generic [ref=e327]: Foreground
                    - text: ·
                  - button "Background" [ref=e328]
              - generic [ref=e331]:
                - button "Collapse pinned color panel" [ref=e332]: ▲
                - button "Unpin color panel" [ref=e333]: ✕
            - generic [ref=e335]:
              - generic [ref=e336]:
                - generic [ref=e337]: Color picker
                - combobox "Color picker shape" [ref=e338]:
                  - option "Triangle" [selected]
                  - option "Square"
              - img "Saturation and value triangle. Use the sliders below for keyboard control." [ref=e342]
              - generic [ref=e343]:
                - generic [ref=e344]: Hue
                - slider "Picker hue" [ref=e345]: "264"
              - generic [ref=e346]:
                - generic [ref=e347]: Saturation
                - slider "Picker saturation" [ref=e348]: "39"
              - generic [ref=e349]:
                - generic [ref=e350]: Value
                - slider "Picker value" [ref=e351]: "30"
              - textbox "Picker hex color" [ref=e354]: "#3A2E4C"
          - generic [ref=e355]:
            - generic [ref=e356]:
              - generic [ref=e357]: Palette
              - combobox "Color palette preset" [ref=e358] [cursor=pointer]:
                - option "Alabaster & Wisteria (Active Theme) (8)" [selected]
                - option "Cozy Hearth 16 (16)"
                - option "Pico-8 (16)"
                - option "Endesga 32 (EDG32) (32)"
            - generic [ref=e359]:
              - 'generic "Primary Color: #3A2E4C" [ref=e360]': "1"
              - generic [ref=e363]: "|"
              - 'generic "Secondary Color: #C792DF" [ref=e364]': "2"
          - button "Browse palettes Previews & favorites →" [ref=e367]:
            - text: Browse palettes
            - generic [ref=e368]: Previews & favorites →
          - generic [ref=e369]:
            - generic [ref=e370]:
              - 'button "Select color #DDDFDF" [ref=e371] [cursor=pointer]'
              - 'button "Select color #DDDDDF" [ref=e372] [cursor=pointer]'
              - 'button "Select color #D0C4DF" [ref=e373] [cursor=pointer]'
              - 'button "Select color #DCABDF" [ref=e374] [cursor=pointer]'
              - 'button "Select color #C792DF" [ref=e375] [cursor=pointer]':
                - generic [ref=e376]: "2"
              - 'button "Select color #A86EC6" [ref=e377] [cursor=pointer]'
              - 'button "Select color #6A5880" [ref=e378] [cursor=pointer]'
              - 'button "Select color #3A2E4C" [ref=e379] [cursor=pointer]':
                - generic [ref=e380]: "1"
            - generic [ref=e381]:
              - generic [ref=e382]: "#3A2E4C"
              - button "Remove color" [ref=e383]
          - generic [ref=e385]:
            - button "Create palette" [ref=e386]
            - button "Scan Canvas" [ref=e388]
            - button "+ OKLCH Ramp" [ref=e390]:
              - generic [ref=e391]: + OKLCH
            - button "+ Lospec" [ref=e392]
          - group [ref=e394]:
            - generic "Roles and index bindings" [ref=e395] [cursor=pointer]
            - 'option "#0: #DDDFDF" [selected]'
            - 'option "#1: #DDDDDF"'
            - 'option "#2: #D0C4DF"'
            - 'option "#3: #DCABDF"'
            - 'option "#4: #C792DF"'
            - 'option "#5: #A86EC6"'
            - 'option "#6: #6A5880"'
            - 'option "#7: #3A2E4C"'
          - generic [ref=e397]:
            - heading [level=3] [ref=e398]:
              - button "Cycle Engine" [ref=e399] [cursor=pointer]:
                - generic [ref=e402]: ▸
            - button "Play Cycle" [ref=e404]
        - region "Canvas navigator" [ref=e405]:
          - generic [ref=e406]:
            - generic [ref=e407]: Navigator
            - generic [ref=e409]:
              - generic "Canvas dimensions" [ref=e410]: 32 × 32
              - generic "Current zoom" [ref=e411]: 1600%
          - button "Canvas overview. Click or drag to pan; arrow keys pan, Shift moves eight pixels, Enter centers." [ref=e413]
          - generic [ref=e415]:
            - button "Zoom out" [ref=e416] [cursor=pointer]: "-"
            - slider "Navigator zoom slider" [ref=e417] [cursor=pointer]: "1600"
            - button "Zoom in" [ref=e418] [cursor=pointer]: +
          - generic [ref=e419]:
            - button "1:1" [ref=e420] [cursor=pointer]
            - button "Fit canvas" [ref=e421] [cursor=pointer]
            - button "Center" [ref=e422] [cursor=pointer]
            - generic [ref=e423] [cursor=pointer]:
              - checkbox "Grid" [ref=e424]
              - generic [ref=e425]: Grid
    - generic [ref=e427]:
      - generic [ref=e428]: "X: — Y: —"
      - generic [ref=e431]: 32×32
      - generic [ref=e434]: 1600%
      - generic [ref=e436]: Frame 1/1
      - generic [ref=e438]: Base Layer
      - generic [ref=e439]: pen
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
> 26  |   await page.getByRole('button', { name: 'Arrange workspace' }).click();
      |                                                                 ^ Error: locator.click: Test timeout of 60000ms exceeded.
  27  |   await page.getByLabel('Inspector position').selectOption('left');
  28  |   await page.getByLabel('New workspace name').pressSequentially('Color desk');
  29  |   await expect(page.getByLabel('New workspace name')).toHaveValue('Color desk');
  30  |   // Shift+Tab in a text field retains keyboard navigation and cannot hide panels.
  31  |   await page.getByLabel('New workspace name').press('Shift+Tab');
  32  |   await expect(page.getByRole('dialog', { name: 'Arrange workspace' })).toBeVisible();
  33  |   await expect(page.getByTestId('right-inspector')).toBeVisible();
  34  |   await page.getByRole('button', { name: 'Save layout', exact: true }).click();
  35  |   await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  36  |   await page.getByTestId('tab-palette').click();
  37  |   await page.getByRole('button', { name: /Browse palettes/ }).click();
  38  |   await page.getByLabel('Search palettes').fill('DawnBringer');
  39  |   await page.getByRole('button', { name: 'Preview DawnBringer 16', exact: true }).click();
  40  |   await expect(page.getByRole('region', { name: 'Selected palette preview' })).toContainText('DawnBringer');
  41  |   expect(await pixels(page)).toEqual(artwork);
  42  |   await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  43  |   await page.locator('#center-canvas-area').focus(); await page.keyboard.press('Shift+Tab');
  44  |   await expect(page.getByTestId('right-inspector')).toBeHidden(); expect(await pixels(page)).toEqual(artwork);
  45  |   await page.keyboard.press('Shift+Tab'); await expect(page.getByTestId('right-inspector')).toBeVisible();
  46  |   await page.getByRole('button', { name: 'Canvas only ⇧ Tab', exact: true }).click();
  47  |   await expect(page.getByTestId('right-inspector')).toBeHidden();
  48  |   await expect(page.locator('#center-canvas-area')).toBeFocused();
  49  |   await page.keyboard.press('Shift+Tab'); await expect(page.getByTestId('right-inspector')).toBeVisible();
  50  |   await page.getByRole('button', { name: 'Save now', exact: true }).click();
  51  |   await expect.poll(() => page.getByRole('status').first().textContent()).toContain('Changes saved');
  52  |   await page.reload(); await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  53  |   await expect(page.getByLabel('Workspace layout').locator('option:checked')).toHaveText('Color desk');
  54  |   expect(await pixels(page)).toEqual(artwork);
  55  |   // Establish a keyboard opener; pointer clicks need not focus buttons in WebKit.
  56  |   await page.getByRole('button', { name: 'Arrange workspace', exact: true }).focus();
  57  |   await page.getByRole('button', { name: 'Arrange workspace', exact: true }).press('Enter');
  58  |   await page.getByLabel('New workspace name').pressSequentially('Temporary name');
  59  |   await expect(page.getByLabel('New workspace name')).toBeFocused();
  60  |   await page.getByLabel('New workspace name').press('Escape');
  61  |   await expect(page.getByRole('dialog', { name: 'Arrange workspace' })).toBeHidden();
  62  |   await expect(page.getByRole('button', { name: 'Arrange workspace', exact: true })).toBeFocused();
  63  |   expect(await pixels(page)).toEqual(artwork);
  64  | });
  65  | test('compiled radial gradient uses the active palette and one undoable layer fill', async ({ page }) => {
  66  |   await ready(page); const blank = await pixels(page);
  67  |   await page.getByTestId('tab-palette').click();
  68  |   await page.getByRole('button', { name: /Browse palettes/ }).click();
  69  |   await page.getByLabel('Search palettes').fill('Monitor Glow');
  70  |   await page.getByRole('button', { name: 'Preview 1bit Monitor Glow', exact: true }).click();
  71  |   await page.getByRole('button', { name: 'Use palette', exact: true }).click();
  72  |   await page.locator('#center-canvas-area').focus(); await page.keyboard.press('Shift+G');
  73  |   await page.getByRole('button', { name: 'Tool settings', exact: true }).click();
  74  |   await page.getByLabel('Gradient shape').selectOption('radial');
  75  |   await page.getByLabel('Gradient colors').selectOption('palette');
  76  |   await page.getByLabel('Bayer 4×4 dithering').uncheck();
  77  |   await draw(page, [16, 16], [24, 16]); const filled = await pixels(page);
  78  |   const at = (x: number, y: number) => filled.slice((y * 32 + x) * 4, (y * 32 + x) * 4 + 4);
  79  |   expect(at(16, 16)).toEqual([34, 35, 35, 255]); expect(at(24, 16)).toEqual([240, 246, 240, 255]);
  80  |   expect(at(20, 16)).toEqual(at(16, 20));
  81  |   for (let i = 0; i < filled.length; i += 4) expect([[34, 35, 35, 255], [240, 246, 240, 255]]).toContainEqual(filled.slice(i, i + 4));
  82  |   await page.getByTestId('undo-button').click(); await expect.poll(() => pixels(page)).toEqual(blank);
  83  |   await page.getByTestId('redo-button').click(); await expect.poll(() => pixels(page)).toEqual(filled);
  84  |   // Repeating the identical fill creates no extra history step.
  85  |   await draw(page, [16, 16], [24, 16]); await page.getByTestId('undo-button').click(); await expect.poll(() => pixels(page)).toEqual(blank);
  86  | });
  87  | test('compiled onion controls compare distinct poses and persist without painting ghosts', async ({ page }, testInfo) => {
  88  |   await ready(page); await draw(page, [8, 8], [8, 8]);
  89  |   await page.getByTestId('add-frame-button').click(); await draw(page, [12, 12], [12, 12]);
  90  |   const artwork = await pixels(page);
  91  |   await page.getByLabel('Onion skin settings', { exact: true }).click();
  92  |   await page.getByRole('button', { name: 'Previous pose', exact: true }).click();
  93  |   await page.getByLabel('Previous onion tint', { exact: true }).fill('#ff0000');
  94  |   await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  95  |   const ghost = () => page.getByTestId('onion-skin-canvas').evaluate((c: HTMLCanvasElement) => Array.from(c.getContext('2d')!.getImageData(8, 8, 1, 1).data));
  96  |   await expect.poll(ghost).toEqual([255, 0, 0, 89]); expect(await pixels(page)).toEqual(artwork);
  97  |   await page.getByRole('button', { name: 'Save now', exact: true }).click();
  98  |   await expect.poll(() => page.getByRole('status').first().textContent()).toContain('Changes saved');
  99  |   await page.reload(); await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  100 |   // Projects reopen on their first frame; return to the pose being compared.
  101 |   await page.getByRole('button', { name: /^Select frame 2\./ }).click();
  102 |   await expect.poll(ghost).toEqual([255, 0, 0, 89]); expect(await pixels(page)).toEqual(artwork);
  103 |   await page.getByLabel('Onion skin settings', { exact: true }).click();
  104 |   await expect(page.getByLabel('Previous onion frames', { exact: true })).toHaveValue('1');
  105 |   await expect(page.getByLabel('Next onion frames', { exact: true })).toHaveValue('0');
  106 |   await expect(page.getByLabel('Previous onion tint', { exact: true })).toHaveValue('#ff0000');
  107 |   if (testInfo.project.name === 'chromium') await page.screenshot({ path: 'docs/assets/screenshots/2026-10-04-artist-workspace/onion-settings.png' });
  108 |   await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  109 |   await page.locator('#center-canvas-area').focus(); await page.keyboard.press('F3');
  110 |   await expect.poll(ghost).toEqual([0, 0, 0, 0]); expect(await pixels(page)).toEqual(artwork);
  111 | });
  112 | 
  113 | test('compiled palette application and reload retain two distinct strokes and a favorite', async ({ page }) => {
  114 |   await ready(page);
  115 |   await page.getByRole('navigation', { name: 'Artist workspace' }).getByRole('button', { name: 'Color', exact: true }).click();
  116 |   await page.getByLabel('Picker hex color').fill('#5d275d');
  117 |   await draw(page, [5, 5], [9, 5]);
  118 |   await page.getByLabel('Picker hex color').fill('#00e600');
  119 |   await draw(page, [20, 20], [24, 20]);
  120 |   const artwork = await pixels(page);
  121 |   const at = (x: number, y: number) => artwork.slice((y * 32 + x) * 4, (y * 32 + x) * 4 + 4);
  122 |   expect(at(5, 5)).toEqual([93, 39, 93, 255]);
  123 |   expect(at(20, 20)).toEqual([0, 230, 0, 255]);
  124 |   await page.getByTestId('tab-palette').click();
  125 |   await page.getByRole('button', { name: /Browse palettes/ }).click();
  126 |   await page.getByLabel('Search palettes').fill('Sweetie');
```