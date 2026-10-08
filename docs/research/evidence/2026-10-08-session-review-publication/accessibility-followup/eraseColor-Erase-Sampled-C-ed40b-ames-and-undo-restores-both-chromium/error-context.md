# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: eraseColor.spec.ts >> Erase Sampled Color removes green across animation frames and undo restores both
- Location: tests\e2e\eraseColor.spec.ts:70:5

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 3
+ Received  + 3

  Array [
-   20,
-   210,
-   40,
+   2,
+   67,
+   19,
    255,
  ]

Call Log:
- Timeout 5000ms exceeded while waiting on the predicate
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
          - generic [ref=e186]:
            - button "Undo last action" [active] [ref=e187] [cursor=pointer]
            - tooltip "Undo Ctrl+Z":
              - generic: Undo
              - generic: Ctrl+Z
          - button "Redo last action" [ref=e189] [cursor=pointer]
      - group "Drawing controls" [ref=e190]:
        - button "Erase color tool options" [ref=e191]:
          - text: Erase color
          - generic [ref=e192]: ▼
      - generic [ref=e193]:
        - group "Canvas controls" [ref=e194]:
          - group "Mirror drawing" [ref=e195]:
            - generic [ref=e196]: Mirror
            - button "Horizontal symmetry" [ref=e198] [cursor=pointer]
            - button "Vertical symmetry" [ref=e200] [cursor=pointer]
          - generic [ref=e202]:
            - generic [ref=e203]:
              - button "Zoom Out" [ref=e204] [cursor=pointer]: −
              - button "Zoom 1600 percent. Choose zoom level" [ref=e206]: 1600%
              - button "Zoom In" [ref=e207] [cursor=pointer]: +
            - button "Fit Canvas to Viewport (Ctrl+0)" [ref=e209] [cursor=pointer]: Fit
          - button "View options menu" [ref=e213] [cursor=pointer]:
            - generic [ref=e214]:
              - generic [ref=e215]: View
              - generic "1 active view options" [ref=e216]
            - generic [ref=e217]: ▼
        - group "Workspace presets" [ref=e218]:
          - combobox "Workspace layout" [ref=e219] [cursor=pointer]:
            - option "Drawing" [selected]
            - option "Animation"
            - option "Lighting"
        - group "Studio settings and help" [ref=e220]:
          - button "Studio options" [ref=e221] [cursor=pointer]:
            - generic [ref=e222]: Studio
            - generic [ref=e223]: ▼
        - button "Export drawing" [ref=e225]:
          - generic [ref=e226]: Export
    - status [ref=e228]: Changes saved
    - generic [ref=e229]:
      - complementary [ref=e231]:
        - generic [ref=e233]:
          - group "Drawing" [ref=e234]:
            - button "Pen" [ref=e236] [cursor=pointer]
            - button "Bézier Curve" [ref=e238] [cursor=pointer]
            - button "Eraser" [ref=e240] [cursor=pointer]
            - button "Flood Fill" [ref=e242] [cursor=pointer]
            - button "Pixel Gradient" [ref=e244] [cursor=pointer]
            - button "Dither Brush" [ref=e246] [cursor=pointer]
            - button "Color Replace" [ref=e248] [cursor=pointer]
            - button "Erase Sampled Color" [pressed] [ref=e250] [cursor=pointer]
          - group "Selection" [ref=e251]:
            - button "Marquee Box" [ref=e254] [cursor=pointer]
            - button "Lasso Select" [ref=e256] [cursor=pointer]
            - button "Magic Wand" [ref=e258] [cursor=pointer]
          - group "Geometry" [ref=e259]:
            - button "Line" [ref=e262] [cursor=pointer]
            - button "2:1 Iso Line" [ref=e264] [cursor=pointer]
            - button "Rectangle" [ref=e266] [cursor=pointer]
            - button "Ellipse" [ref=e268] [cursor=pointer]
          - group "2.5D Sculpt" [ref=e269]:
            - button "Normal Chisel" [ref=e272] [cursor=pointer]
          - group "Utility" [ref=e273]:
            - button "Eyedropper" [ref=e276] [cursor=pointer]
        - generic [ref=e277]:
          - generic [ref=e278]:
            - button "Swap colors (X)" [ref=e279] [cursor=pointer]: ⇄
            - button "Reset default black and white colors (Shift+D)" [ref=e280] [cursor=pointer]
            - 'button "Secondary color #C792DF. Click for quick swatches, double click for picker, right click to swap" [ref=e281] [cursor=pointer]'
            - 'button "Primary color #3A2E4C. Click for quick swatches, double click for picker, right click to swap" [ref=e282] [cursor=pointer]'
          - generic [ref=e283]:
            - generic [ref=e284]:
              - 'button "#DDDFDF (Click: Primary | Right-click: Secondary)" [ref=e285] [cursor=pointer]'
              - 'button "#DDDDDF (Click: Primary | Right-click: Secondary)" [ref=e286] [cursor=pointer]'
              - 'button "#D0C4DF (Click: Primary | Right-click: Secondary)" [ref=e287] [cursor=pointer]'
              - 'button "#DCABDF (Click: Primary | Right-click: Secondary)" [ref=e288] [cursor=pointer]'
            - button "Quick Swatches Flyout" [ref=e289] [cursor=pointer]
      - main "Pixel art canvas workspace" [ref=e293]:
        - application "Pixel art drawing canvas. Use mouse or stylus to paint, arrow keys to pan viewport or nudge selection, and Alt+drag to pan." [ref=e294]
      - complementary [ref=e297]:
        - generic [ref=e298]:
          - button "Tools" [ref=e299]
          - button "Layers" [pressed] [ref=e301]
          - button "Palette" [ref=e303]
          - button "PixiTools" [ref=e305]:
            - generic [ref=e306]: FX
        - generic [ref=e308]:
          - generic [ref=e309]:
            - generic "Each frame has its own layer pixels. A new blank frame keeps the layer names and settings." [ref=e310]:
              - text: Frame 2 · Layers
              - generic [ref=e311]: (1)
            - generic [ref=e312]:
              - button "Add New Layer" [ref=e313]
              - button "Duplicate Layer" [ref=e315]
              - button "Merge Down" [disabled] [ref=e317]
              - button "Delete Layer" [disabled] [ref=e319]
          - generic [ref=e321]:
            - generic [ref=e322]:
              - generic [ref=e323]: Opacity
              - slider "Layer opacity" [ref=e324] [cursor=pointer]: "100"
              - generic [ref=e325]: 100%
            - generic [ref=e326]:
              - generic [ref=e327]: Blend
              - combobox "Layer blend mode" [ref=e328] [cursor=pointer]:
                - option "Normal" [selected]
                - option "Multiply"
                - option "Screen"
                - option "Overlay"
                - option "Color Dodge"
                - option "On artwork only"
          - generic [ref=e330]:
            - generic [ref=e331]:
              - 'button "Reorder layer Sprite Sheet: characters_sheet" [disabled] [ref=e332]':
                - generic [ref=e333]: ⠿
              - generic [ref=e334]:
                - 'button "Select layer Sprite Sheet: characters_sheet. Double click to rename" [ref=e335] [cursor=pointer]': "Sprite Sheet: characters_sheet"
                - 'button "Rename layer Sprite Sheet: characters_sheet" [ref=e336] [cursor=pointer]'
            - generic [ref=e337]:
              - 'button "Lock layer Sprite Sheet: characters_sheet" [ref=e338]'
              - 'button "Hide layer Sprite Sheet: characters_sheet" [ref=e339]'
    - contentinfo [ref=e341]:
      - generic [ref=e342]:
        - generic [ref=e343]:
          - generic [ref=e344]:
            - button "Play" [ref=e345]
            - button "Previous Frame (,)" [ref=e348]
            - button "Next Frame (.)" [ref=e350]
            - button "Repeat" [ref=e352]
          - generic [ref=e356]:
            - button "Preview speed" [ref=e358]:
              - generic [ref=e359]: Preview
              - generic [ref=e360]: 1×
              - generic [ref=e361]: ▾
            - generic [ref=e362]:
              - generic [ref=e363]: Frame time
              - spinbutton "Active frame duration in milliseconds" [ref=e364]: "100"
              - generic [ref=e365]: ms
            - button "Onion Skin" [ref=e366]
            - button "Onion skin settings" [ref=e369]: ⚙
        - generic [ref=e370]:
          - button "+ Frame" [ref=e371]:
            - generic [ref=e372]: Frame
          - group [ref=e374]:
            - generic "Frame actions" [ref=e375] [cursor=pointer]:
              - text: Frame actions
              - generic [ref=e376]: ▾
          - button "Collapse Timeline" [ref=e378]:
            - generic [ref=e379]:
              - generic [ref=e380]: ▼
              - generic [ref=e381]: Collapse
      - generic [ref=e382]:
        - generic [ref=e383]:
          - 'button "Select frame 1. Duration: 100ms. Drag to reorder." [ref=e384]':
            - generic:
              - generic: "#1"
              - generic: 100ms
          - 'button "Select frame 2. Duration: 100ms. Drag to reorder." [ref=e385]':
            - generic:
              - generic: "#2"
              - generic: 100ms
        - button "Clips" [ref=e386]
    - generic [ref=e388]:
      - generic [ref=e389]: "X: — Y: —"
      - generic [ref=e392]: 32×32
      - generic [ref=e395]: 1600%
      - generic [ref=e397]: Frame 2/2
      - generic [ref=e399]: "Sprite Sheet: characters_sheet"
      - generic [ref=e400]: erase-color
      - status "All changes saved to local storage" [ref=e405]:
        - generic [ref=e407]: Saved
  - button "Open Next.js Dev Tools" [ref=e413] [cursor=pointer]
  - alert [ref=e417]
```

# Test source

```ts
  1   | import { expect, test, type Page } from '@playwright/test';
  2   | 
  3   | async function importGreenSheet(page: Page) {
  4   |   await page.goto('/studio');
  5   |   const canvas = page.getByTestId('main-composite-canvas');
  6   |   await expect(canvas).toBeVisible();
  7   |   await expect.poll(() => page.evaluate(() => Boolean((window as Window & { __studioStore?: unknown }).__studioStore))).toBe(true);
  8   |   const base64 = await page.evaluate(() => {
  9   |     const sheet = document.createElement('canvas');
  10  |     sheet.width = 64;
  11  |     sheet.height = 32;
  12  |     const ctx = sheet.getContext('2d')!;
  13  |     ctx.fillStyle = '#14d228';
  14  |     ctx.fillRect(0, 0, 32, 32);
  15  |     ctx.fillStyle = '#19cd2c';
  16  |     ctx.fillRect(32, 0, 32, 32);
  17  |     ctx.fillStyle = '#ff3030';
  18  |     ctx.fillRect(12, 12, 8, 8);
  19  |     ctx.fillStyle = '#3030ff';
  20  |     ctx.fillRect(44, 12, 8, 8);
  21  |     ctx.fillStyle = '#024313';
  22  |     ctx.fillRect(1, 1, 1, 1);
  23  |     ctx.fillStyle = '#121d1a';
  24  |     ctx.fillRect(3, 1, 1, 1);
  25  |     ctx.fillStyle = '#d3f1d8';
  26  |     ctx.fillRect(4, 4, 1, 1);
  27  |     ctx.fillStyle = '#121d1a';
  28  |     ctx.fillRect(4, 1, 1, 1);
  29  |     ctx.fillStyle = '#1b4534';
  30  |     ctx.fillRect(5, 1, 1, 1);
  31  |     ctx.fillStyle = '#14202c';
  32  |     ctx.fillRect(6, 1, 1, 1);
  33  |     return sheet.toDataURL('image/png').split(',')[1];
  34  |   });
  35  |   await page.locator('input[type=file]').first().setInputFiles({
  36  |     name: 'characters_sheet.png', mimeType: 'image/png', buffer: Buffer.from(base64, 'base64'),
  37  |   });
  38  |   const dialog = page.getByRole('dialog', { name: 'Import Image' });
  39  |   await dialog.getByRole('spinbutton', { name: 'Frame cell width in pixels' }).fill('32');
  40  |   await dialog.getByRole('spinbutton', { name: 'Frame cell height in pixels' }).fill('32');
  41  |   await dialog.getByRole('spinbutton', { name: 'Start X in pixels' }).fill('0');
  42  |   await dialog.getByRole('spinbutton', { name: 'Start Y in pixels' }).fill('0');
  43  |   await dialog.getByRole('spinbutton', { name: 'Gap X in pixels' }).fill('0');
  44  |   await dialog.getByRole('spinbutton', { name: 'Gap Y in pixels' }).fill('0');
  45  |   await expect(dialog.getByText('2 cols × 1 rows = 2 total frames')).toBeVisible();
  46  |   await dialog.getByRole('button', { name: 'Replace Frames' }).click();
  47  |   await dialog.getByRole('button', { name: 'Slice & Import Frames' }).click();
  48  |   await expect(dialog).toBeHidden();
  49  |   await expect.poll(() => page.evaluate(() => (window as Window & { __studioStore?: { getState: () => { frames: unknown[] } } }).__studioStore!.getState().frames.length)).toBe(2);
  50  |   return canvas;
  51  | }
  52  | 
  53  | async function pixel(page: Page, x: number, y: number) {
  54  |   return page.getByTestId('main-composite-canvas').evaluate((canvas: HTMLCanvasElement, point: [number, number]) =>
  55  |     Array.from(canvas.getContext('2d')!.getImageData(point[0], point[1], 1, 1).data), [x, y] as [number, number]);
  56  | }
  57  | 
  58  | async function clickPixel(page: Page, x: number, y: number) {
  59  |   await page.keyboard.press('Escape');
  60  |   const stage = await page.locator('#center-canvas-area').boundingBox();
  61  |   expect(stage).not.toBeNull();
  62  |   await page.mouse.click(stage!.x + (x + 0.5) * stage!.width / 32, stage!.y + (y + 0.5) * stage!.height / 32);
  63  | }
  64  | 
  65  | async function thumbnailPixel(page: Page, frameIndex: number, x: number, y: number) {
  66  |   return page.getByTestId(`frame-thumbnail-${frameIndex}`).evaluate((canvas: HTMLCanvasElement, point: [number, number]) =>
  67  |     Array.from(canvas.getContext('2d')!.getImageData(Math.floor((point[0] + 0.5) * canvas.width / 32), Math.floor((point[1] + 0.5) * canvas.height / 32), 1, 1).data), [x, y] as [number, number]);
  68  | }
  69  | 
  70  | test('Erase Sampled Color removes green across animation frames and undo restores both', async ({ page }) => {
  71  |   await importGreenSheet(page);
  72  |   await page.getByTestId('erase-color-tool').click();
  73  |   await page.getByTestId('tool-options-button').click();
  74  |   await expect(page.getByRole('slider', { name: 'Erase Color tolerance' })).toHaveValue('24');
  75  |   const scopeBtn = page.getByRole('button', { name: 'Erase Color frame scope' });
  76  |   await expect(scopeBtn).toHaveAttribute('aria-pressed', 'false');
  77  |   await scopeBtn.click();
  78  |   await expect(scopeBtn).toContainText('All frames');
  79  |   await expect(scopeBtn).toHaveAttribute('aria-pressed', 'true');
  80  |   await clickPixel(page, 2, 2);
  81  |   await expect.poll(() => pixel(page, 2, 2)).toEqual([0, 0, 0, 0]);
  82  |   expect(await pixel(page, 15, 15)).toEqual([255, 48, 48, 255]);
  83  | 
  84  |   // Both timeline thumbnails must update immediately without switching frames
  85  |   await expect.poll(() => thumbnailPixel(page, 0, 2, 2)).toEqual([0, 0, 0, 0]);
  86  |   await expect.poll(() => thumbnailPixel(page, 1, 2, 2)).toEqual([0, 0, 0, 0]);
  87  | 
  88  |   await page.evaluate(() => (window as Window & { __studioStore?: { getState: () => { setActiveFrame: (index: number) => void } } }).__studioStore!.getState().setActiveFrame(1));
  89  |   await expect.poll(() => pixel(page, 2, 2)).toEqual([0, 0, 0, 0]);
  90  |   expect(await pixel(page, 15, 15)).toEqual([48, 48, 255, 255]);
  91  | 
  92  |   await page.getByTestId('undo-button').click();
  93  |   await page.evaluate(() => (window as Window & { __studioStore?: { getState: () => { setActiveFrame: (index: number) => void } } }).__studioStore!.getState().setActiveFrame(0));
  94  |   await expect.poll(() => pixel(page, 2, 2)).toEqual([20, 210, 40, 255]);
  95  |   await page.evaluate(() => (window as Window & { __studioStore?: { getState: () => { setActiveFrame: (index: number) => void } } }).__studioStore!.getState().setActiveFrame(1));
  96  |   await expect.poll(() => pixel(page, 2, 2)).toEqual([25, 205, 44, 255]);
  97  | 
  98  |   // Both thumbnails must be restored after undo
> 99  |   await expect.poll(() => thumbnailPixel(page, 0, 2, 2)).toEqual([20, 210, 40, 255]);
      |                                                          ^ Error: expect(received).toEqual(expected) // deep equality
  100 |   await expect.poll(() => thumbnailPixel(page, 1, 2, 2)).toEqual([25, 205, 44, 255]);
  101 | 
  102 |   await page.getByTestId('redo-button').click();
  103 |   await expect.poll(() => pixel(page, 2, 2)).toEqual([0, 0, 0, 0]);
  104 |   await expect.poll(() => thumbnailPixel(page, 0, 2, 2)).toEqual([0, 0, 0, 0]);
  105 |   await expect.poll(() => thumbnailPixel(page, 1, 2, 2)).toEqual([0, 0, 0, 0]);
  106 | });
  107 | 
  108 | test('Erase Sampled Color skips a locked frame layer', async ({ page }) => {
  109 |   await importGreenSheet(page);
  110 |   await page.evaluate(() => {
  111 |     const state = (window as Window & { __studioStore?: { getState: () => { frames: Array<{ layers: Array<{ id: string }> }>; toggleLayerLock: (id: string) => void; setActiveFrame: (index: number) => void } } }).__studioStore!.getState();
  112 |     state.setActiveFrame(1);
  113 |     state.toggleLayerLock(state.frames[1].layers[0].id);
  114 |     state.setActiveFrame(0);
  115 |   });
  116 |   await page.getByTestId('erase-color-tool').click();
  117 |   await page.getByTestId('tool-options-button').click();
  118 |   await page.getByRole('button', { name: 'Erase Color frame scope' }).click();
  119 |   await clickPixel(page, 2, 2);
  120 |   await expect.poll(() => pixel(page, 2, 2)).toEqual([0, 0, 0, 0]);
  121 |   await page.evaluate(() => (window as Window & { __studioStore?: { getState: () => { setActiveFrame: (index: number) => void } } }).__studioStore!.getState().setActiveFrame(1));
  122 |   await expect.poll(() => pixel(page, 2, 2)).toEqual([25, 205, 44, 255]);
  123 | });
  124 | 
  125 | test('Default color family clears pale spill, repairs dark green outline pixels, and has a distinct icon', async ({ page }) => {
  126 |   await importGreenSheet(page);
  127 |   await page.getByTestId('erase-color-tool').click();
  128 |   await page.getByTestId('tool-options-button').click();
  129 |   await expect(page.getByRole('button', { name: 'Erase Color family mode' })).toHaveAttribute('aria-pressed', 'true');
  130 |   await expect(page.getByRole('button', { name: 'Erase Color matching mode' })).toContainText('All matches');
  131 |   const icons = await page.evaluate(() => [
  132 |     document.querySelector('[data-testid="eraser-tool"] svg')?.innerHTML,
  133 |     document.querySelector('[data-testid="erase-color-tool"] svg')?.innerHTML,
  134 |   ]);
  135 |   expect(icons[0]).toBeTruthy();
  136 |   expect(icons[1]).toBeTruthy();
  137 |   expect(icons[1]).not.toBe(icons[0]);
  138 |   await clickPixel(page, 2, 2);
  139 |   await expect.poll(() => pixel(page, 1, 1)).toEqual([0, 0, 0, 0]);
  140 |   expect(await pixel(page, 4, 4)).toEqual([0, 0, 0, 0]);
  141 |   expect(await pixel(page, 5, 1)).toEqual([20, 32, 44, 255]);
  142 |   expect(await pixel(page, 3, 1)).toEqual([18, 29, 26, 255]);
  143 |   expect(await pixel(page, 15, 15)).toEqual([255, 48, 48, 255]);
  144 | });
  145 | 
  146 | test('Erase Sampled Color with All Frames scope clears matching color across animation frames', async ({ page }) => {
  147 |   await page.goto('/studio');
  148 |   const canvas = page.getByTestId('main-composite-canvas');
  149 |   await expect(canvas).toBeVisible();
  150 |   await expect.poll(() => page.evaluate(() => Boolean((window as Window & { __studioStore?: unknown }).__studioStore))).toBe(true);
  151 | 
  152 |   // Select pen tool
  153 |   await page.getByTestId('pen-tool').click();
  154 | 
  155 |   // Set orange drawing color
  156 |   await page.evaluate(() => {
  157 |     (window as Window & { __studioStore?: { getState: () => { setPrimaryColor: (c: string) => void } } }).__studioStore!.getState().setPrimaryColor('#ff8800');
  158 |   });
  159 | 
  160 |   // Draw orange mark on center of frame 1 (16, 16)
  161 |   await clickPixel(page, 16, 16);
  162 |   await expect.poll(() => pixel(page, 16, 16)).toEqual([255, 136, 0, 255]);
  163 |   await expect.poll(() => thumbnailPixel(page, 0, 16, 16)).toEqual([255, 136, 0, 255]);
  164 | 
  165 |   // Click Add blank frame button in timeline to create frame 2
  166 |   await page.getByTestId('add-frame-button').click();
  167 |   await expect.poll(() => page.evaluate(() => (window as Window & { __studioStore?: { getState: () => { activeFrameIndex: number } } }).__studioStore!.getState().activeFrameIndex)).toBe(1);
  168 | 
  169 |   // Draw orange mark on frame 2 at the same location
  170 |   await clickPixel(page, 16, 16);
  171 |   await expect.poll(() => pixel(page, 16, 16)).toEqual([255, 136, 0, 255]);
  172 |   await expect.poll(() => thumbnailPixel(page, 1, 16, 16)).toEqual([255, 136, 0, 255]);
  173 | 
  174 |   // Select Erase Color tool in left toolbar
  175 |   await page.getByTestId('erase-color-tool').click();
  176 | 
  177 |   // Click the frame scope button in the tool options rail to switch from This frame to All frames
  178 |   await page.getByTestId('tool-options-button').click();
  179 |   const scopeButton = page.getByRole('button', { name: 'Erase Color frame scope' });
  180 |   await expect(scopeButton).toContainText('This frame');
  181 |   await scopeButton.click();
  182 |   await expect(scopeButton).toContainText('All frames');
  183 |   await expect(scopeButton).toHaveAttribute('aria-pressed', 'true');
  184 | 
  185 |   // Click on the orange mark in the center of the canvas
  186 |   await clickPixel(page, 16, 16);
  187 | 
  188 |   // Verify orange mark on frame 2 is erased to transparent canvas
  189 |   await expect.poll(() => pixel(page, 16, 16)).toEqual([0, 0, 0, 0]);
  190 | 
  191 |   // Timeline thumbnail for frame 2 must be transparent
  192 |   await expect.poll(() => thumbnailPixel(page, 1, 16, 16)).toEqual([0, 0, 0, 0]);
  193 | 
  194 |   // Timeline thumbnail for frame 1 must ALSO be transparent immediately
  195 |   await expect.poll(() => thumbnailPixel(page, 0, 16, 16)).toEqual([0, 0, 0, 0]);
  196 | 
  197 |   // Select frame 1 in the bottom timeline
  198 |   await page.getByRole('button', { name: /Frame 1/i }).click();
  199 |   await expect.poll(() => page.evaluate(() => (window as Window & { __studioStore?: { getState: () => { activeFrameIndex: number } } }).__studioStore!.getState().activeFrameIndex)).toBe(0);
```