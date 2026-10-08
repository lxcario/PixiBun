# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: viewportOverlayBounds.spec.ts >> large supported artwork never scales overlay backing stores with zoom
- Location: tests\e2e\viewportOverlayBounds.spec.ts:67:5

# Error details

```
Error: expect(locator).toHaveAttribute(expected) failed

Locator:  getByTestId('grid-selection-overlay')
Expected: "2048"
Received: ""
Timeout:  5000ms

Call log:
  - Expect "toHaveAttribute" with timeout 5000ms
  - waiting for getByTestId('grid-selection-overlay')
    13 × locator resolved to <div data-testid="grid-selection-overlay" class="absolute inset-0 w-full h-full pointer-events-none"></div>
       - unexpected value "null"

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
        - generic "Canvas size · change it in File" [ref=e181]: 2048×2048
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
    - status [ref=e238]: Changes saved
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
      - generic [ref=e401]: 2048×2048
      - generic [ref=e404]: 1600%
      - generic [ref=e406]: Frame 1/1
      - generic [ref=e408]: Base Layer
      - generic [ref=e409]: pen
      - status "All changes saved to local storage" [ref=e414]:
        - generic [ref=e416]: Saved
  - button "Open Next.js Dev Tools" [ref=e422] [cursor=pointer]
  - alert [ref=e426]
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | test('the artwork and grid share exact screen bounds at high zoom', async ({ page }) => {
  4   |   await page.goto('/studio');
  5   |   await expect(page.locator('[data-restoration-phase]')).toHaveAttribute('data-restoration-phase', 'active');
  6   |   await page.evaluate(() => {
  7   |     const state = (window as Window & { __studioStore?: { getState: () => {
  8   |       setCanvasSize: (w: number, h: number) => void; setZoom: (zoom: number) => void;
  9   |     } } }).__studioStore!.getState();
  10  |     state.setCanvasSize(32, 32);
  11  |     state.setZoom(1600);
  12  |   });
  13  |   const sizes = await page.evaluate(() => {
  14  |     const stage = document.querySelector('#center-canvas-area')!.getBoundingClientRect();
  15  |     const artwork = document.querySelector('[data-testid="main-composite-canvas"]')!.getBoundingClientRect();
  16  |     const grid = document.querySelector('[data-testid="grid-selection-overlay"]')!.getBoundingClientRect();
  17  |     return {
  18  |       stage: [stage.x, stage.y, stage.width, stage.height],
  19  |       artwork: [artwork.x, artwork.y, artwork.width, artwork.height],
  20  |       grid: [grid.x, grid.y, grid.width, grid.height],
  21  |       pitch: getComputedStyle(document.querySelector('[data-testid="grid-selection-overlay"]')!).backgroundSize,
  22  |     };
  23  |   });
  24  |   expect(sizes.stage.slice(2)).toEqual([512, 512]);
  25  |   expect(sizes.artwork).toEqual(sizes.stage);
  26  |   expect(sizes.grid).toEqual(sizes.stage);
  27  |   expect(sizes.pitch).toBe('16px 16px, 16px 16px');
  28  | });
  29  | 
  30  | test('bucket recolors nearby shades through the visible grid without crossing a contrasting color', async ({ page }) => {
  31  |   await page.goto('/studio');
  32  |   await expect(page.locator('[data-restoration-phase]')).toHaveAttribute('data-restoration-phase', 'active');
  33  |   const artwork = page.getByTestId('main-composite-canvas');
  34  |   await page.evaluate(() => {
  35  |     const state = (window as Window & { __studioStore?: { getState: () => {
  36  |       setCanvasSize: (w: number, h: number) => void; setZoom: (zoom: number) => void;
  37  |     } } }).__studioStore!.getState();
  38  |     state.setCanvasSize(32, 32);
  39  |     state.setZoom(1600);
  40  |   });
  41  |   await expect(artwork).toHaveAttribute('width', '32');
  42  |   const stage = await page.locator('#center-canvas-area').boundingBox();
  43  |   expect(stage).not.toBeNull();
  44  |   const at = (x: number, y: number) => ({ x: stage!.x + (x + 0.5) * 16, y: stage!.y + (y + 0.5) * 16 });
  45  |   const pixel = (x: number, y: number) => artwork.evaluate((canvas: HTMLCanvasElement, point: [number, number]) =>
  46  |     Array.from(canvas.getContext('2d')!.getImageData(point[0], point[1], 1, 1).data), [x, y] as [number, number]);
  47  |   for (const [x, color] of [[8, '#f0c080'], [9, '#eabc7d'], [10, '#ffa000']] as const) {
  48  |     await page.evaluate((next) => (window as Window & { __studioStore?: { getState: () => { setPrimaryColor: (color: string) => void } } }).__studioStore!.getState().setPrimaryColor(next), color);
  49  |     await page.mouse.click(at(x, 8).x, at(x, 8).y);
  50  |   }
  51  |   await page.evaluate(() => {
  52  |     const state = (window as Window & { __studioStore?: { getState: () => {
  53  |       setPrimaryColor: (color: string) => void; setActiveTool: (tool: 'bucket') => void;
  54  |     } } }).__studioStore!.getState();
  55  |     state.setPrimaryColor('#90aaff');
  56  |     state.setActiveTool('bucket');
  57  |   });
  58  |   await page.getByTestId('tool-options-button').click();
  59  |   await expect(page.getByRole('slider', { name: 'Bucket fill tolerance' })).toHaveValue('24');
  60  |   await page.keyboard.press('Escape');
  61  |   await page.mouse.click(at(8, 8).x, at(8, 8).y);
  62  |   await expect.poll(() => pixel(8, 8)).toEqual([144, 170, 255, 255]);
  63  |   await expect.poll(() => pixel(9, 8)).toEqual([144, 170, 255, 255]);
  64  |   expect(await pixel(10, 8)).toEqual([255, 160, 0, 255]);
  65  | });
  66  | 
  67  | test('large supported artwork never scales overlay backing stores with zoom', async ({ page }) => {
  68  |   await page.goto('/studio');
  69  |   const grid = page.getByTestId('grid-selection-overlay');
  70  |   const brushGhost = page.getByTestId('brush-ghost-overlay');
  71  |   await expect(grid).toBeVisible();
  72  |   await expect.poll(() => page.evaluate(() => Boolean((window as Window & { __studioStore?: unknown }).__studioStore))).toBe(true);
  73  |   await page.evaluate(() => {
  74  |     const store = (window as Window & { __studioStore?: { getState: () => { setCanvasSize: (w: number, h: number) => void } } }).__studioStore!.getState();
  75  |     store.setCanvasSize(2048, 2048);
  76  |   });
> 77  |   await expect(grid).toHaveAttribute('width', '2048');
      |                      ^ Error: expect(locator).toHaveAttribute(expected) failed
  78  |   await expect(grid).toHaveAttribute('height', '2048');
  79  |   await expect.poll(() => grid.evaluate((element) => getComputedStyle(element).backgroundSize)).toContain('16px 16px');
  80  |   await expect(brushGhost).toHaveJSProperty('tagName', 'DIV');
  81  | 
  82  |   const viewport = await page.locator('#main-content').boundingBox();
  83  |   expect(viewport).not.toBeNull();
  84  |   await page.mouse.move(viewport!.x + viewport!.width / 2, viewport!.y + viewport!.height / 2);
  85  |   await expect(brushGhost).toBeVisible();
  86  |   await expect.poll(() => brushGhost.evaluate((element) => getComputedStyle(element).width)).toBe('16px');
  87  | 
  88  |   await page.evaluate(() => (window as Window & { __studioStore?: { getState: () => { setZoom: (zoom: number) => void } } }).__studioStore!.getState().setZoom(6400));
  89  |   await expect(grid).toHaveAttribute('width', '2048');
  90  |   await expect(grid).toHaveAttribute('height', '2048');
  91  |   await expect.poll(() => grid.evaluate((element) => getComputedStyle(element).backgroundSize)).toContain('64px 64px');
  92  |   await expect(brushGhost).toHaveJSProperty('tagName', 'DIV');
  93  |   await page.evaluate(() => (window as Window & { __studioStore?: { getState: () => { toggleIsoGuides: () => void } } }).__studioStore!.getState().toggleIsoGuides());
  94  |   const iso = page.getByTestId('isometric-guide-overlay');
  95  |   await expect(iso).toBeVisible();
  96  |   await expect.poll(() => iso.evaluate((element) => getComputedStyle(element).backgroundImage)).toContain('repeating-linear-gradient');
  97  |   expect(await grid.evaluate((element: HTMLCanvasElement) => element.getContext('2d')!.getImageData(0, 0, 1, 1).data[3])).toBe(0);
  98  | });
  99  | 
  100 | test('a three-pixel pen uses the same square footprint as its CSS brush outline', async ({ page }) => {
  101 |   await page.goto('/studio');
  102 |   await expect(page.locator('[data-restoration-phase]')).toHaveAttribute('data-restoration-phase', 'active');
  103 |   const artwork = page.getByTestId('main-composite-canvas');
  104 |   const ghost = page.getByTestId('brush-ghost-overlay');
  105 |   await expect(artwork).toBeVisible();
  106 |   await expect.poll(() => page.evaluate(() => Boolean((window as Window & { __studioStore?: unknown }).__studioStore))).toBe(true);
  107 |   await page.evaluate(() => {
  108 |     const state = (window as Window & { __studioStore?: { getState: () => {
  109 |       setBrushSize: (size: number) => void; setActiveTool: (tool: 'pen') => void;
  110 |     } } }).__studioStore!.getState();
  111 |     state.setActiveTool('pen');
  112 |     state.setBrushSize(3);
  113 |   });
  114 |   await expect(page.getByRole('button', { name: 'Brush size 3 pixels', exact: true })).toBeVisible();
  115 |   const zoom = 16;
  116 |   // Hover may scroll the canvas; measure its position after that action.
  117 |   await artwork.hover({ position: { x: 10.5 * zoom, y: 10.5 * zoom } });
  118 |   const stage = await artwork.boundingBox();
  119 |   expect(stage).not.toBeNull();
  120 |   const x = stage!.x + 10.5 * zoom;
  121 |   const y = stage!.y + 10.5 * zoom;
  122 |   await page.mouse.move(x + 1, y + 1);
  123 |   await expect(ghost).toBeVisible();
  124 |   await expect.poll(() => ghost.evaluate((element) => getComputedStyle(element).width)).toBe('48px');
  125 |   await expect.poll(() => ghost.evaluate((element) => getComputedStyle(element).height)).toBe('48px');
  126 |   await page.mouse.down();
  127 |   await page.mouse.up();
  128 |   await expect.poll(() => artwork.evaluate((element: HTMLCanvasElement) => {
  129 |     const pixels = element.getContext('2d')!.getImageData(0, 0, element.width, element.height).data;
  130 |     let count = 0;
  131 |     for (let i = 3; i < pixels.length; i += 4) if (pixels[i] > 0) count++;
  132 |     return count;
  133 |   })).toBe(9);
  134 | });
  135 | 
```