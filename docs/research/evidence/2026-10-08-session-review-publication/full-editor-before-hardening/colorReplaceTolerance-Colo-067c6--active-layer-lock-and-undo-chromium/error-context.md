# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: colorReplaceTolerance.spec.ts >> Color Replace respects tolerance, active layer lock, and undo
- Location: tests\e2e\colorReplaceTolerance.spec.ts:12:5

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 3
+ Received  + 3

  Array [
-   255,
-   0,
-   170,
+   128,
+   96,
+   160,
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
          - button "Undo last action" [ref=e187] [cursor=pointer]
          - generic [ref=e188]:
            - button "Redo last action" [disabled]
      - group "Drawing controls" [ref=e189]:
        - button "Replace color tool options" [ref=e190]:
          - text: Replace color
          - generic [ref=e191]: ▼
      - generic [ref=e192]:
        - group "Canvas controls" [ref=e193]:
          - group "Mirror drawing" [ref=e194]:
            - generic [ref=e195]: Mirror
            - button "Horizontal symmetry" [ref=e197] [cursor=pointer]
            - button "Vertical symmetry" [ref=e199] [cursor=pointer]
          - generic [ref=e201]:
            - generic [ref=e202]:
              - button "Zoom Out" [ref=e203] [cursor=pointer]: −
              - button "Zoom 1600 percent. Choose zoom level" [ref=e205]: 1600%
              - button "Zoom In" [ref=e206] [cursor=pointer]: +
            - button "Fit Canvas to Viewport (Ctrl+0)" [ref=e208] [cursor=pointer]: Fit
          - button "View options menu" [ref=e212] [cursor=pointer]:
            - generic [ref=e213]:
              - generic [ref=e214]: View
              - generic "1 active view options" [ref=e215]
            - generic [ref=e216]: ▼
        - group "Workspace presets" [ref=e217]:
          - combobox "Workspace layout" [ref=e218] [cursor=pointer]:
            - option "Drawing" [selected]
            - option "Animation"
            - option "Lighting"
        - group "Studio settings and help" [ref=e219]:
          - button "Studio options" [ref=e220] [cursor=pointer]:
            - generic [ref=e221]: Studio
            - generic [ref=e222]: ▼
        - button "Export drawing" [ref=e224]:
          - generic [ref=e225]: Export
    - status [ref=e227]: Changes saved
    - generic [ref=e228]:
      - complementary [ref=e230]:
        - generic [ref=e232]:
          - group "Drawing" [ref=e233]:
            - button "Pen" [ref=e235] [cursor=pointer]
            - button "Bézier Curve" [ref=e237] [cursor=pointer]
            - button "Eraser" [ref=e239] [cursor=pointer]
            - button "Flood Fill" [ref=e241] [cursor=pointer]
            - button "Pixel Gradient" [ref=e243] [cursor=pointer]
            - button "Dither Brush" [ref=e245] [cursor=pointer]
            - button "Color Replace" [pressed] [ref=e247] [cursor=pointer]
            - button "Erase Sampled Color" [ref=e249] [cursor=pointer]
          - group "Selection" [ref=e250]:
            - button "Marquee Box" [ref=e253] [cursor=pointer]
            - button "Lasso Select" [ref=e255] [cursor=pointer]
            - button "Magic Wand" [ref=e257] [cursor=pointer]
          - group "Geometry" [ref=e258]:
            - button "Line" [ref=e261] [cursor=pointer]
            - button "2:1 Iso Line" [ref=e263] [cursor=pointer]
            - button "Rectangle" [ref=e265] [cursor=pointer]
            - button "Ellipse" [ref=e267] [cursor=pointer]
          - group "2.5D Sculpt" [ref=e268]:
            - button "Normal Chisel" [ref=e271] [cursor=pointer]
          - group "Utility" [ref=e272]:
            - button "Eyedropper" [ref=e275] [cursor=pointer]
        - generic [ref=e276]:
          - generic [ref=e277]:
            - button "Swap colors (X)" [ref=e278] [cursor=pointer]: ⇄
            - button "Reset default black and white colors (Shift+D)" [ref=e279] [cursor=pointer]
            - 'button "Secondary color #C792DF. Click for quick swatches, double click for picker, right click to swap" [ref=e280] [cursor=pointer]'
            - 'button "Primary color #ff00aa. Click for quick swatches, double click for picker, right click to swap" [ref=e281] [cursor=pointer]'
          - generic [ref=e282]:
            - generic [ref=e283]:
              - 'button "#FF00AA (Click: Primary | Right-click: Secondary)" [ref=e284] [cursor=pointer]'
              - 'button "#28203C (Click: Primary | Right-click: Secondary)" [ref=e285] [cursor=pointer]'
              - 'button "#8866A5 (Click: Primary | Right-click: Secondary)" [ref=e286] [cursor=pointer]'
              - 'button "#8060A0 (Click: Primary | Right-click: Secondary)" [ref=e287] [cursor=pointer]'
            - button "Quick Swatches Flyout" [ref=e288] [cursor=pointer]
      - main "Pixel art canvas workspace" [ref=e292]:
        - application "Pixel art drawing canvas. Use mouse or stylus to paint, arrow keys to pan viewport or nudge selection, and Alt+drag to pan." [active] [ref=e293]
      - complementary [ref=e296]:
        - generic [ref=e297]:
          - button "Tools" [ref=e298]
          - button "Layers" [pressed] [ref=e300]
          - button "Palette" [ref=e302]
          - button "PixiTools" [ref=e304]:
            - generic [ref=e305]: FX
        - generic [ref=e307]:
          - generic [ref=e308]:
            - generic "Each frame has its own layer pixels. A new blank frame keeps the layer names and settings." [ref=e309]:
              - text: Frame 1 · Layers
              - generic [ref=e310]: (1)
            - generic [ref=e311]:
              - button "Add New Layer" [ref=e312]
              - button "Duplicate Layer" [ref=e314]
              - button "Merge Down" [disabled] [ref=e316]
              - button "Delete Layer" [disabled] [ref=e318]
          - generic [ref=e320]:
            - generic [ref=e321]:
              - generic [ref=e322]: Opacity
              - slider "Layer opacity" [ref=e323] [cursor=pointer]: "100"
              - generic [ref=e324]: 100%
            - generic [ref=e325]:
              - generic [ref=e326]: Blend
              - combobox "Layer blend mode" [ref=e327] [cursor=pointer]:
                - option "Normal" [selected]
                - option "Multiply"
                - option "Screen"
                - option "Overlay"
                - option "Color Dodge"
                - option "On artwork only"
          - generic [ref=e329]:
            - generic [ref=e330]:
              - button "Reorder layer Base Layer" [disabled] [ref=e331]:
                - generic [ref=e332]: ⠿
              - generic [ref=e333]:
                - button "Select layer Base Layer. Double click to rename" [ref=e334] [cursor=pointer]: Base Layer
                - button "Rename layer Base Layer" [ref=e335] [cursor=pointer]
            - generic [ref=e336]:
              - button "Lock layer Base Layer" [ref=e337]
              - button "Hide layer Base Layer" [ref=e338]
    - contentinfo [ref=e340]:
      - generic [ref=e341]:
        - generic [ref=e342]:
          - generic [ref=e343]:
            - button "Play" [ref=e344]
            - button "Previous Frame (,)" [ref=e347]
            - button "Next Frame (.)" [ref=e349]
            - button "Repeat" [ref=e351]
          - generic [ref=e355]:
            - button "Preview speed" [ref=e357]:
              - generic [ref=e358]: Preview
              - generic [ref=e359]: 1×
              - generic [ref=e360]: ▾
            - generic [ref=e361]:
              - generic [ref=e362]: Frame time
              - spinbutton "Active frame duration in milliseconds" [ref=e363]: "100"
              - generic [ref=e364]: ms
            - button "Onion Skin" [ref=e365]
            - button "Onion skin settings" [ref=e368]: ⚙
        - generic [ref=e369]:
          - button "+ Frame" [ref=e370]:
            - generic [ref=e371]: Frame
          - group [ref=e373]:
            - generic "Frame actions" [ref=e374] [cursor=pointer]:
              - text: Frame actions
              - generic [ref=e375]: ▾
          - button "Collapse Timeline" [ref=e377]:
            - generic [ref=e378]:
              - generic [ref=e379]: ▼
              - generic [ref=e380]: Collapse
      - generic [ref=e381]:
        - 'button "Select frame 1. Duration: 100ms. Drag to reorder." [ref=e383]':
          - generic:
            - generic: "#1"
            - generic: 100ms
        - button "Clips" [ref=e384]
    - generic [ref=e386]:
      - generic [ref=e387]: "X: 3 Y: 5"
      - generic [ref=e390]: 32×32
      - generic [ref=e393]: 1600%
      - generic [ref=e395]: Frame 1/1
      - generic [ref=e397]: Base Layer
      - generic [ref=e398]: color-replace
      - status "All changes saved to local storage" [ref=e403]:
        - generic [ref=e405]: Saved
  - button "Open Next.js Dev Tools" [ref=e411] [cursor=pointer]
  - alert [ref=e415]
```

# Test source

```ts
  1  | import { expect, test } from '@playwright/test';
  2  | 
  3  | type StudioState = {
  4  |   setCanvasSize: (width: number, height: number) => void;
  5  |   setActiveTool: (tool: 'pen' | 'color-replace') => void;
  6  |   setPrimaryColor: (color: string) => void;
  7  |   setBucketTolerance: (tolerance: number) => void;
  8  |   toggleLayerLock: (layerId: string) => void;
  9  |   activeLayerId: string;
  10 | };
  11 | 
  12 | test('Color Replace respects tolerance, active layer lock, and undo', async ({ page }) => {
  13 |   await page.goto('/studio');
  14 |   await expect(page.locator('[data-restoration-phase]')).toHaveAttribute('data-restoration-phase', 'active');
  15 |   const artwork = page.getByTestId('main-composite-canvas');
  16 |   await expect(artwork).toBeVisible();
  17 |   await page.evaluate(() => (window as Window & { __studioStore?: { getState: () => StudioState } }).__studioStore!.getState().setCanvasSize(32, 32));
  18 |   const stage = await page.locator('#center-canvas-area').boundingBox();
  19 |   expect(stage).not.toBeNull();
  20 |   const at = (x: number, y: number) => ({ x: stage!.x + (x + 0.5) * 16, y: stage!.y + (y + 0.5) * 16 });
  21 |   const pixel = (x: number, y: number) => artwork.evaluate((canvas: HTMLCanvasElement, point: [number, number]) => {
  22 |     return Array.from(canvas.getContext('2d')!.getImageData(point[0], point[1], 1, 1).data);
  23 |   }, [x, y] as [number, number]);
  24 | 
  25 |   for (const [x, color] of [[3, '#8060a0'], [6, '#8866a5'], [9, '#28203c']] as const) {
  26 |     await page.evaluate((next) => (window as Window & { __studioStore?: { getState: () => StudioState } }).__studioStore!.getState().setPrimaryColor(next), color);
  27 |     await page.mouse.click(at(x, 4).x, at(x, 4).y);
  28 |   }
  29 |   await page.evaluate(() => {
  30 |     const state = (window as Window & { __studioStore?: { getState: () => StudioState } }).__studioStore!.getState();
  31 |     state.setPrimaryColor('#ff00aa');
  32 |     state.setActiveTool('color-replace');
  33 |   });
  34 |   await page.getByTestId('tool-options-button').click();
  35 |   await expect(page.getByRole('slider', { name: 'Color Replace tolerance' })).toHaveValue('0');
  36 |   await page.keyboard.press('Escape');
  37 |   await page.mouse.click(at(3, 4).x, at(3, 4).y);
> 38 |   await expect.poll(() => pixel(3, 4)).toEqual([255, 0, 170, 255]);
     |                                        ^ Error: expect(received).toEqual(expected) // deep equality
  39 |   expect(await pixel(6, 4)).toEqual([136, 102, 165, 255]);
  40 | 
  41 |   await page.getByTestId('undo-button').click();
  42 |   await expect.poll(() => pixel(3, 4)).toEqual([128, 96, 160, 255]);
  43 |   await page.evaluate(() => (window as Window & { __studioStore?: { getState: () => StudioState } }).__studioStore!.getState().setBucketTolerance(12));
  44 |   await page.getByTestId('tool-options-button').click();
  45 |   await expect(page.getByRole('slider', { name: 'Color Replace tolerance' })).toHaveValue('12');
  46 |   await page.keyboard.press('Escape');
  47 |   await page.mouse.click(at(3, 4).x, at(3, 4).y);
  48 |   await expect.poll(() => pixel(6, 4)).toEqual([255, 0, 170, 255]);
  49 |   expect(await pixel(9, 4)).toEqual([40, 32, 60, 255]);
  50 | 
  51 |   await page.evaluate(() => {
  52 |     const state = (window as Window & { __studioStore?: { getState: () => StudioState } }).__studioStore!.getState();
  53 |     state.toggleLayerLock(state.activeLayerId);
  54 |     state.setPrimaryColor('#00ff00');
  55 |   });
  56 |   await page.mouse.click(at(9, 4).x, at(9, 4).y);
  57 |   expect(await pixel(9, 4)).toEqual([40, 32, 60, 255]);
  58 | });
  59 | 
```