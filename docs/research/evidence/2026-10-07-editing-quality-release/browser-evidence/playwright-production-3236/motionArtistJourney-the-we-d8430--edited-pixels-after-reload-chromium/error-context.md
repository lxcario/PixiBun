# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: motionArtistJourney.spec.ts >> the welcome 24-pixel blank drawing keeps its size and edited pixels after reload
- Location: tests\production\motionArtistJourney.spec.ts:14:42

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 2
+ Received  + 2

  Array [
-   24,
-   24,
+   32,
+   32,
  ]

Call Log:
- Timeout 10000ms exceeded while waiting on the predicate
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
  1  | import { expect, test, type Page } from '@playwright/test';
  2  | import { readFile } from 'node:fs/promises';
  3  | 
  4  | const pixels = (page: Page) => page.getByTestId('main-composite-canvas').evaluate((canvas: HTMLCanvasElement) =>
  5  |   Array.from(canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data));
  6  | async function numeric(page: Page, label: string, value: string) {
  7  |   const field = page.getByRole('spinbutton', { name: label, exact: true }); await field.fill(value); await field.press('Enter');
  8  | }
  9  | async function saveReload(page: Page) {
  10 |   await page.getByTestId('save-button').click(); await expect(page.getByRole('status').filter({ hasText: /^Changes saved$/ })).toBeVisible();
  11 |   await page.reload(); await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible(); await page.getByTestId('tab-tools').click();
  12 | }
  13 | 
  14 | for (const size of [16, 24, 32, 48]) test(`the welcome ${size}-pixel blank drawing keeps its size and edited pixels after reload`, async ({ page }) => {
  15 |   await page.setViewportSize({ width: 1600, height: 1100 }); await page.goto(`/studio?width=${size}&height=${size}`);
> 16 |   await expect.poll(() => page.getByTestId('main-composite-canvas').evaluate((canvas: HTMLCanvasElement) => [canvas.width, canvas.height])).toEqual([size, size]);
     |                                                                                                                                             ^ Error: expect(received).toEqual(expected) // deep equality
  17 |   await expect.poll(() => new URL(page.url()).searchParams.has('width')).toBe(false);
  18 |   expect((await pixels(page)).every(v => v === 0)).toBe(true);
  19 |   const box = (await page.getByTestId('main-composite-canvas').boundingBox())!;
  20 |   await page.mouse.click(box.x + box.width * .4, box.y + box.height * .4);
  21 |   await expect.poll(async () => (await pixels(page)).some((v, i) => i % 4 === 3 && v > 0)).toBe(true);
  22 |   const original = await pixels(page); await saveReload(page); await expect.poll(() => pixels(page)).toEqual(original);
  23 | });
  24 | 
  25 | test('the landing starter creates a separate saved drawing and Gallery retains the original pixels', async ({ page }) => {
  26 |   await page.setViewportSize({ width: 1600, height: 1100 }); await page.goto('/studio');
  27 |   await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  28 |   await page.getByRole('button', { name: /^Rename project / }).click();
  29 |   await page.locator('input:focus').fill('Starter original'); await page.locator('input:focus').press('Enter');
  30 |   const box = (await page.getByTestId('main-composite-canvas').boundingBox())!;
  31 |   await page.mouse.click(box.x + box.width * .4, box.y + box.height * .4);
  32 |   await expect.poll(async () => (await pixels(page)).some((v, i) => i % 4 === 3 && v > 0)).toBe(true);
  33 |   const original = await pixels(page); await saveReload(page);
  34 |   await page.goto('/'); await page.getByTitle('Open Hearth Ghost in studio', { exact: true }).click();
  35 |   await expect.poll(() => page.getByTestId('main-composite-canvas').evaluate((canvas: HTMLCanvasElement) => canvas.width)).toBe(16);
  36 |   await expect.poll(async () => (await pixels(page)).some((v, i) => i % 4 === 3 && v > 0)).toBe(true);
  37 |   await saveReload(page); const starter = await pixels(page); expect(starter).not.toEqual(original);
  38 |   await page.getByTestId('file-menu-button').click(); await page.getByRole('menuitem', { name: 'Projects', exact: true }).click();
  39 |   const gallery = page.getByRole('dialog', { name: 'Atelier Projects & Gallery' });
  40 |   await expect(gallery.getByRole('button', { name: 'Open project Hearth Ghost', exact: true })).toBeVisible();
  41 |   await gallery.getByRole('button', { name: 'Open project Starter original', exact: true }).click();
  42 |   await expect(gallery).toBeHidden(); await expect.poll(() => pixels(page)).toEqual(original);
  43 | });
  44 | 
  45 | test('an artist can draw, save a whole-layer rig, reopen, bake, reload and export exact PNG pixels', async ({ page }, info) => {
  46 |   await page.setViewportSize({ width: 1600, height: 1100 }); await page.goto('/studio?template=hearth-ghost');
  47 |   await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  48 |   await expect.poll(() => page.getByTestId('main-composite-canvas').evaluate((canvas: HTMLCanvasElement) => canvas.width)).toBe(16);
  49 |   await expect.poll(async () => (await pixels(page)).some((v, i) => i % 4 === 3 && v > 0)).toBe(true);
  50 |   await expect.poll(() => new URL(page.url()).searchParams.has('template')).toBe(false);
  51 |   const before = await pixels(page), box = (await page.getByTestId('main-composite-canvas').boundingBox())!;
  52 |   await page.mouse.click(box.x + box.width * .05, box.y + box.height * .9);
  53 |   await expect.poll(() => pixels(page)).not.toEqual(before); const original = await pixels(page);
  54 |   const width = await page.getByTestId('main-composite-canvas').evaluate((canvas: HTMLCanvasElement) => canvas.width);
  55 |   await page.getByTestId('tab-tools').click(); await page.getByTestId('create-motion-part-btn').click();
  56 |   await expect(page.getByTestId('piximotion-panel')).toBeVisible();
  57 |   await numeric(page, 'Position X pixels', '2'); await numeric(page, 'Motion frames', '3');
  58 |   await page.getByRole('combobox', { name: 'Motion easing' }).selectOption('linear');
  59 |   await page.getByRole('textbox', { name: 'Rig name', exact: true }).fill('Artist journey');
  60 |   await page.getByRole('button', { name: 'Save motion rig', exact: true }).click();
  61 |   await expect(page.getByTestId('motion-rig-library').getByRole('status')).toContainText('Motion rig ready');
  62 |   await page.getByRole('button', { name: 'Cancel (Escape)', exact: true }).click(); await saveReload(page);
  63 |   await expect.poll(() => pixels(page)).toEqual(original);
  64 |   await page.getByRole('button', { name: 'Open rig Artist journey', exact: true }).click();
  65 |   await expect(page.getByRole('spinbutton', { name: 'Position X pixels', exact: true })).toHaveValue('2');
  66 |   // HUD and inspector share the same async bake owner, including while preview is playing.
  67 |   await page.getByRole('button', { name: 'Play Loop', exact: true }).click();
  68 |   await page.getByTestId('piximotion-hud-bake-btn').click(); await expect(page.getByTestId('piximotion-panel')).toBeHidden();
  69 |   await expect(page.getByRole('button', { name: /^Select frame \d+\./ })).toHaveCount(3); await saveReload(page);
  70 |   await page.getByRole('button', { name: /Select frame 3\./ }).click();
  71 |   const expected = new Array<number>(original.length).fill(0), height = original.length / 4 / width;
  72 |   for (let y = 0; y < height; y++) for (let x = 0; x + 2 < width; x++) for (let c = 0; c < 4; c++)
  73 |     expected[(y * width + x + 2) * 4 + c] = original[(y * width + x) * 4 + c];
  74 |   await expect.poll(() => pixels(page)).toEqual(expected);
  75 |   await page.getByTestId('export-button').click(); await page.getByTestId('export-tab-png').click();
  76 |   await page.getByRole('button', { name: '1x', exact: true }).click();
  77 |   const pending = page.waitForEvent('download'); await page.getByRole('button', { name: 'Download PNG', exact: true }).click();
  78 |   const download = await pending, bytes = await readFile((await download.path())!);
  79 |   await info.attach('artist-journey.png', { body: bytes, contentType: 'image/png' });
  80 |   const decoded = await page.evaluate(async base64 => {
  81 |     const image = new Image(); image.src = 'data:image/png;base64,' + base64; await image.decode();
  82 |     const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
  83 |     const ctx = canvas.getContext('2d')!; ctx.drawImage(image, 0, 0);
  84 |     return { width: image.width, pixels: Array.from(ctx.getImageData(0, 0, image.width, image.height).data) };
  85 |   }, bytes.toString('base64'));
  86 |   expect(decoded.width).toBe(width); expect(decoded.pixels).toEqual(expected);
  87 | });
  88 | 
```