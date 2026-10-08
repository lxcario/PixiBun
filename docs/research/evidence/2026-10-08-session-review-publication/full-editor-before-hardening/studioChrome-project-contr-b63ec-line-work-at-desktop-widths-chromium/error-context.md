# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: studioChrome.spec.ts >> project controls, pen size, zoom, and timeline work at desktop widths
- Location: tests\e2e\studioChrome.spec.ts:3:5

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.boundingBox: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByTestId('bottom-timeline-collapsed').getByTitle('Previous Frame (,)')

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
          - img "Bun, the PixiBun bunny" [ref=e11]
        - button "File" [ref=e175]:
          - text: File
          - generic [ref=e176]: ▼
        - button "Rename project Untitled Sprite" [ref=e177] [cursor=pointer]: Untitled Sprite
        - button "Save now" [ref=e178]:
          - generic [ref=e179]: Save
        - generic [ref=e181]:
          - generic [ref=e182]:
            - button "Undo last action" [disabled]
          - generic [ref=e183]:
            - button "Redo last action" [disabled]
      - group "Drawing controls" [ref=e184]:
        - generic "Tool options rail" [ref=e185]:
          - generic [ref=e186]:
            - button "Brush size 8 pixels" [ref=e187]:
              - generic [ref=e188]: Size
              - generic [ref=e189]: 8 px
              - generic [ref=e190]: ▾
            - generic "Quick brush size presets" [ref=e191]:
              - button "1px brush preset" [ref=e192]: "1"
              - button "2px brush preset" [ref=e193]: "2"
              - button "3px brush preset" [ref=e194]: "3"
              - button "4px brush preset" [ref=e195]: "4"
            - button "Disable clean corners" [pressed] [ref=e196]:
              - generic [ref=e197]: Pixel-Perfect
      - generic [ref=e198]:
        - group "Canvas controls" [ref=e199]:
          - group "Mirror drawing" [ref=e200]:
            - generic [ref=e201]: Mirror
            - button "Horizontal symmetry" [ref=e203] [cursor=pointer]
            - button "Vertical symmetry" [ref=e205] [cursor=pointer]
          - generic [ref=e207]:
            - generic [ref=e208]:
              - button "Zoom Out" [ref=e209] [cursor=pointer]: −
              - button "Zoom 24 percent. Choose zoom level" [ref=e211]: 24%
              - button "Zoom In" [ref=e212] [cursor=pointer]: +
            - button "Fit Canvas to Viewport (Ctrl+0)" [ref=e214] [cursor=pointer]: Fit
          - button "View options menu" [ref=e218] [cursor=pointer]:
            - generic [ref=e219]:
              - generic [ref=e220]: View
              - generic "1 active view options" [ref=e221]
            - generic [ref=e222]: ▼
        - group "Workspace presets" [ref=e223]:
          - combobox "Workspace layout" [ref=e224] [cursor=pointer]:
            - option "Drawing" [selected]
            - option "Animation"
            - option "Lighting"
        - group "Studio settings and help" [ref=e225]:
          - button "Studio options" [ref=e226] [cursor=pointer]:
            - generic [ref=e227]: Studio
            - generic [ref=e228]: ▼
        - button "Export drawing" [ref=e230]:
          - generic [ref=e231]: Export
    - status [ref=e233]: Changes saved
    - generic [ref=e234]:
      - complementary [ref=e236]:
        - generic [ref=e238]:
          - group "Drawing" [ref=e239]:
            - button "Pen" [pressed] [ref=e241] [cursor=pointer]
            - button "Bézier Curve" [ref=e243] [cursor=pointer]
            - button "Eraser" [ref=e245] [cursor=pointer]
            - button "Flood Fill" [ref=e247] [cursor=pointer]
            - button "Pixel Gradient" [ref=e249] [cursor=pointer]
            - button "Dither Brush" [ref=e251] [cursor=pointer]
            - button "Color Replace" [ref=e253] [cursor=pointer]
            - button "Erase Sampled Color" [ref=e255] [cursor=pointer]
          - group "Selection" [ref=e256]:
            - button "Marquee Box" [ref=e259] [cursor=pointer]
            - button "Lasso Select" [ref=e261] [cursor=pointer]
            - button "Magic Wand" [ref=e263] [cursor=pointer]
          - group "Geometry" [ref=e264]:
            - button "Line" [ref=e267] [cursor=pointer]
            - button "2:1 Iso Line" [ref=e269] [cursor=pointer]
            - button "Rectangle" [ref=e271] [cursor=pointer]
            - button "Ellipse" [ref=e273] [cursor=pointer]
          - group "2.5D Sculpt" [ref=e274]:
            - button "Normal Chisel" [ref=e277] [cursor=pointer]
          - group "Utility" [ref=e278]:
            - button "Eyedropper" [ref=e281] [cursor=pointer]
        - generic [ref=e282]:
          - generic [ref=e283]:
            - button "Swap colors (X)" [ref=e284] [cursor=pointer]: ⇄
            - button "Reset default black and white colors (Shift+D)" [ref=e285] [cursor=pointer]
            - 'button "Secondary color #C792DF. Click for quick swatches, double click for picker, right click to swap" [ref=e286] [cursor=pointer]'
            - 'button "Primary color #3A2E4C. Click for quick swatches, double click for picker, right click to swap" [ref=e287] [cursor=pointer]'
          - generic [ref=e288]:
            - generic [ref=e289]:
              - 'button "#DDDFDF (Click: Primary | Right-click: Secondary)" [ref=e290] [cursor=pointer]'
              - 'button "#DDDDDF (Click: Primary | Right-click: Secondary)" [ref=e291] [cursor=pointer]'
              - 'button "#D0C4DF (Click: Primary | Right-click: Secondary)" [ref=e292] [cursor=pointer]'
              - 'button "#DCABDF (Click: Primary | Right-click: Secondary)" [ref=e293] [cursor=pointer]'
            - button "Quick Swatches Flyout" [ref=e294] [cursor=pointer]
      - main "Pixel art canvas workspace" [ref=e298]:
        - application "Pixel art drawing canvas. Use mouse or stylus to paint, arrow keys to pan viewport or nudge selection, and Alt+drag to pan." [ref=e299]
      - complementary [ref=e302]:
        - generic [ref=e303]:
          - button "Tools" [ref=e304]
          - button "Layers" [pressed] [ref=e306]
          - button "Palette" [ref=e308]
          - button "PixiTools" [ref=e310]:
            - generic [ref=e311]: FX
        - generic [ref=e313]:
          - generic [ref=e314]:
            - generic "Each frame has its own layer pixels. A new blank frame keeps the layer names and settings." [ref=e315]:
              - text: Frame 1 · Layers
              - generic [ref=e316]: (1)
            - generic [ref=e317]:
              - button "Add New Layer" [ref=e318]
              - button "Duplicate Layer" [ref=e320]
              - button "Merge Down" [disabled] [ref=e322]
              - button "Delete Layer" [disabled] [ref=e324]
          - generic [ref=e326]:
            - generic [ref=e327]:
              - generic [ref=e328]: Opacity
              - slider "Layer opacity" [ref=e329] [cursor=pointer]: "100"
              - generic [ref=e330]: 100%
            - generic [ref=e331]:
              - generic [ref=e332]: Blend
              - combobox "Layer blend mode" [ref=e333] [cursor=pointer]:
                - option "Normal" [selected]
                - option "Multiply"
                - option "Screen"
                - option "Overlay"
                - option "Color Dodge"
                - option "On artwork only"
          - generic [ref=e335]:
            - generic [ref=e336]:
              - button "Reorder layer Base Layer" [disabled] [ref=e337]:
                - generic [ref=e338]: ⠿
              - generic [ref=e339]:
                - button "Select layer Base Layer. Double click to rename" [ref=e340] [cursor=pointer]: Base Layer
                - button "Rename layer Base Layer" [ref=e341] [cursor=pointer]
            - generic [ref=e342]:
              - button "Lock layer Base Layer" [ref=e343]
              - button "Hide layer Base Layer" [ref=e344]
    - contentinfo [ref=e346]:
      - generic [ref=e347]:
        - button "Expand Timeline" [ref=e348] [cursor=pointer]:
          - generic [ref=e349]: Timeline (1)
          - generic [ref=e350]: ▲
        - generic [ref=e351]: Frame 1 / 1 · Static Sprite
      - generic [ref=e352]: "Tip: Click \"＋ Add Frame\" to turn into an animation"
      - generic [ref=e354]:
        - button "Add Frame to Animate" [ref=e355] [cursor=pointer]
        - button "▲ Expand" [ref=e357] [cursor=pointer]
    - generic [ref=e360]:
      - generic [ref=e361]: "X: — Y: —"
      - generic [ref=e364]: 2048×2048
      - generic [ref=e367]: 24%
      - generic [ref=e369]: Frame 1/1
      - generic [ref=e371]: Base Layer
      - generic [ref=e372]: pen
      - status "All changes saved to local storage" [ref=e377]:
        - generic [ref=e379]: Saved
  - button "Open Next.js Dev Tools" [ref=e385] [cursor=pointer]
  - alert [ref=e389]
```

# Test source

```ts
  1  | import { expect, test } from '@playwright/test';
  2  | 
  3  | test('project controls, pen size, zoom, and timeline work at desktop widths', async ({ page }, testInfo) => {
  4  |   await page.setViewportSize({ width: 1024, height: 768 });
  5  |   await page.goto('/studio');
  6  |   await expect(page.getByTestId('file-menu-button')).toBeInViewport();
  7  |   await expect(page.getByTestId('new-drawing-button')).toHaveCount(0);
  8  |   await expect(page.getByRole('button', { name: 'Save now' })).toBeInViewport();
  9  |   await expect(page.getByTestId('export-button')).toBeInViewport();
  10 |   await expect(page.getByTestId('project-backup-button')).toHaveCount(0);
  11 |   const firstFrame = page.getByRole('button', { name: /Select frame 1/ });
  12 |   await firstFrame.hover();
  13 |   const preview = page.getByRole('tooltip');
  14 |   await expect(preview).toBeVisible();
  15 |   expect((await preview.boundingBox())!.y).toBeLessThan((await firstFrame.boundingBox())!.y);
  16 | 
  17 |   await page.getByRole('button', { name: /Brush size 1 pixels/ }).click();
  18 |   await page.getByRole('button', { name: '8 pixel brush preset' }).click();
  19 |   await expect(page.getByRole('button', { name: /Brush size 8 pixels/ })).toBeVisible();
  20 | 
  21 |   await expect.poll(() => page.evaluate(() => Boolean((window as Window & { __studioStore?: unknown }).__studioStore))).toBe(true);
  22 |   await page.evaluate(() => {
  23 |     const state = (window as Window & { __studioStore?: { getState: () => { setCanvasSize: (width: number, height: number) => void } } }).__studioStore!.getState();
  24 |     state.setCanvasSize(2048, 2048);
  25 |   });
  26 |   await page.getByTestId('fit-canvas-button').click();
  27 |   const fittedZoom = await page.evaluate(() => (window as Window & { __studioStore?: { getState: () => { zoom: number } } }).__studioStore!.getState().zoom);
  28 |   expect(fittedZoom).toBeLessThan(100);
  29 | 
  30 |   await page.getByRole('button', { name: 'Preview speed' }).click();
  31 |   await expect(page.getByRole('group', { name: 'Preview speeds' })).toBeVisible();
  32 |   await page.screenshot({ path: testInfo.outputPath('preview-speed-menu.png') });
  33 |   await page.getByRole('button', { name: '2× preview speed' }).click();
  34 |   await expect(page.getByRole('button', { name: 'Preview speed' })).toContainText('2×');
  35 | 
  36 |   await page.getByRole('button', { name: 'Collapse Timeline' }).click();
  37 |   const compact = page.getByTestId('bottom-timeline-collapsed');
  38 |   await expect(compact).toBeVisible();
  39 |   for (const title of ['Previous Frame (,)', 'Play / Pause Animation (Space)', 'Next Frame (.)']) {
> 40 |     expect((await compact.getByTitle(title).boundingBox())!.height).toBe(28);
     |                                             ^ Error: locator.boundingBox: Test timeout of 30000ms exceeded.
  41 |   }
  42 |   await page.getByRole('button', { name: 'Expand Timeline' }).click();
  43 | 
  44 |   await page.setViewportSize({ width: 1920, height: 1080 });
  45 |   const header = page.locator('header[role="banner"]');
  46 |   const headerBounds = await header.boundingBox();
  47 |   const exportBounds = await page.getByTestId('export-button').boundingBox();
  48 |   expect(headerBounds).not.toBeNull();
  49 |   expect(exportBounds).not.toBeNull();
  50 |   expect(exportBounds!.x + exportBounds!.width).toBeLessThanOrEqual(headerBounds!.x + headerBounds!.width);
  51 |   expect(exportBounds!.y + exportBounds!.height).toBeLessThanOrEqual(headerBounds!.y + headerBounds!.height);
  52 |   await page.screenshot({ path: testInfo.outputPath('studio-wide.png') });
  53 | });
  54 | 
  55 | test('Ctrl+S saves locally without opening a project file picker', async ({ page }) => {
  56 |   await page.addInitScript(() => {
  57 |     const testWindow = window as typeof window & { __savePickerCalls: number };
  58 |     testWindow.__savePickerCalls = 0;
  59 |     Object.defineProperty(window, 'showSaveFilePicker', {
  60 |       configurable: true,
  61 |       value: async () => { testWindow.__savePickerCalls += 1; throw new DOMException('Cancelled', 'AbortError'); },
  62 |     });
  63 |   });
  64 |   await page.goto('/studio');
  65 |   await expect(page.locator('[data-restoration-phase]')).toHaveAttribute('data-restoration-phase', 'active');
  66 |   await page.keyboard.press('Control+s');
  67 |   await expect.poll(() => page.evaluate(() => document.querySelector('[role="status"]')?.textContent)).toContain('Changes saved');
  68 |   expect(await page.evaluate(() => (window as typeof window & { __savePickerCalls: number }).__savePickerCalls)).toBe(0);
  69 | });
  70 | 
```