# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: eraseColor.spec.ts >> Erase Sampled Color with All Frames scope clears matching color across animation frames
- Location: tests\e2e\eraseColor.spec.ts:146:5

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 3
+ Received  + 3

  Array [
-   255,
-   136,
    0,
-   255,
+   0,
+   0,
+   0,
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
            - option "Drawing" [selected]
            - option "Animation"
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
            - 'button "Primary color #ff8800. Click for quick swatches, double click for picker, right click to swap" [ref=e293] [cursor=pointer]'
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
    - contentinfo [ref=e352]:
      - generic [ref=e353]:
        - generic [ref=e354]:
          - generic [ref=e355]:
            - button "Play" [ref=e356]
            - button "Previous Frame (,)" [ref=e359]
            - button "Next Frame (.)" [ref=e361]
            - button "Repeat" [ref=e363]
          - generic [ref=e367]:
            - button "Preview speed" [ref=e369]:
              - generic [ref=e370]: Preview
              - generic [ref=e371]: 1×
              - generic [ref=e372]: ▾
            - generic [ref=e373]:
              - generic [ref=e374]: Frame time
              - spinbutton "Active frame duration in milliseconds" [ref=e375]: "100"
              - generic [ref=e376]: ms
            - button "Onion Skin" [ref=e377]
            - button "Onion skin settings" [ref=e380]: ⚙
        - generic [ref=e381]:
          - button "+ Frame" [ref=e382]:
            - generic [ref=e383]: Frame
          - group [ref=e385]:
            - generic "Frame actions" [ref=e386] [cursor=pointer]:
              - text: Frame actions
              - generic [ref=e387]: ▾
          - button "Collapse Timeline" [ref=e389]:
            - generic [ref=e390]:
              - generic [ref=e391]: ▼
              - generic [ref=e392]: Collapse
      - generic [ref=e393]:
        - 'button "Select frame 1. Duration: 100ms. Drag to reorder." [ref=e395]':
          - generic:
            - generic: "#1"
            - generic: 100ms
        - button "Clips" [ref=e396]
    - generic [ref=e398]:
      - generic [ref=e399]: "X: — Y: —"
      - generic [ref=e402]: 32×32
      - generic [ref=e405]: 1600%
      - generic [ref=e407]: Frame 1/1
      - generic [ref=e409]: Base Layer
      - generic [ref=e410]: pen
      - status "All changes saved to local storage" [ref=e415]:
        - generic [ref=e417]: Saved
  - button "Open Next.js Dev Tools" [ref=e423] [cursor=pointer]
  - alert [ref=e427]
```

# Test source

```ts
  63  | }
  64  | 
  65  | async function thumbnailPixel(page: Page, frameIndex: number, x: number, y: number) {
  66  |   return page.getByTestId(`frame-thumbnail-${frameIndex}`).evaluate((canvas: HTMLCanvasElement, point: [number, number]) =>
  67  |     Array.from(canvas.getContext('2d')!.getImageData(point[0], point[1], 1, 1).data), [x, y] as [number, number]);
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
  99  |   await expect.poll(() => thumbnailPixel(page, 0, 2, 2)).toEqual([20, 210, 40, 255]);
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
> 163 |   await expect.poll(() => thumbnailPixel(page, 0, 16, 16)).toEqual([255, 136, 0, 255]);
      |                                                            ^ Error: expect(received).toEqual(expected) // deep equality
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
  200 | 
  201 |   // Verify the orange mark on frame 1 was also removed across the animation timeline
  202 |   await expect.poll(() => pixel(page, 16, 16)).toEqual([0, 0, 0, 0]);
  203 | });
  204 | 
```