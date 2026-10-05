# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: strokeAndGallery.spec.ts >> compiled dither fills a coarse path identically to fine samples and survives save and reload
- Location: tests\production\strokeAndGallery.spec.ts:60:5

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 255
Received: 0
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
        - button "Dither tool options" [ref=e189]:
          - text: Dither
          - generic [ref=e190]: ▼
      - generic [ref=e191]:
        - group "Canvas controls" [ref=e192]:
          - group "Mirror drawing" [ref=e193]:
            - generic [ref=e194]: Mirror
            - button "Horizontal symmetry" [ref=e196] [cursor=pointer]
            - button "Vertical symmetry" [ref=e198] [cursor=pointer]
          - generic [ref=e200]:
            - generic [ref=e201]:
              - button "Zoom Out" [ref=e202] [cursor=pointer]: −
              - button "Zoom 1600 percent. Choose zoom level" [ref=e204]: 1600%
              - button "Zoom In" [ref=e205] [cursor=pointer]: +
            - button "Fit Canvas to Viewport (Ctrl+0)" [ref=e207] [cursor=pointer]: Fit
          - button "View options menu" [ref=e211] [cursor=pointer]:
            - generic [ref=e212]:
              - generic [ref=e213]: View
              - generic "1 active view options" [ref=e214]
            - generic [ref=e215]: ▼
        - group "Workspace presets" [ref=e216]:
          - combobox "Workspace layout" [ref=e217] [cursor=pointer]:
            - option "Drawing" [selected]
            - option "Animation"
            - option "Lighting"
        - group "Studio settings and help" [ref=e218]:
          - button "Studio options" [ref=e219] [cursor=pointer]:
            - generic [ref=e220]: Studio
            - generic [ref=e221]: ▼
        - button "Export drawing" [ref=e223]:
          - generic [ref=e224]: Export
    - status [ref=e226]: Not saved yet
    - generic [ref=e227]:
      - complementary [ref=e229]:
        - generic [ref=e231]:
          - group "Drawing" [ref=e232]:
            - button "Pen" [ref=e234] [cursor=pointer]
            - button "Bézier Curve" [ref=e236] [cursor=pointer]
            - button "Eraser" [ref=e238] [cursor=pointer]
            - button "Flood Fill" [ref=e240] [cursor=pointer]
            - button "Pixel Gradient" [ref=e242] [cursor=pointer]
            - button "Dither Brush" [pressed] [ref=e244] [cursor=pointer]
            - button "Color Replace" [ref=e246] [cursor=pointer]
            - button "Erase Sampled Color" [ref=e248] [cursor=pointer]
          - group "Selection" [ref=e249]:
            - button "Marquee Box" [ref=e252] [cursor=pointer]
            - button "Lasso Select" [ref=e254] [cursor=pointer]
            - button "Magic Wand" [ref=e256] [cursor=pointer]
          - group "Geometry" [ref=e257]:
            - button "Line" [ref=e260] [cursor=pointer]
            - button "2:1 Iso Line" [ref=e262] [cursor=pointer]
            - button "Rectangle" [ref=e264] [cursor=pointer]
            - button "Ellipse" [ref=e266] [cursor=pointer]
          - group "2.5D Sculpt" [ref=e267]:
            - button "Normal Chisel" [ref=e270] [cursor=pointer]
          - group "Utility" [ref=e271]:
            - button "Eyedropper" [ref=e274] [cursor=pointer]
        - generic [ref=e275]:
          - generic [ref=e276]:
            - button "Swap colors (X)" [ref=e277] [cursor=pointer]: ⇄
            - button "Reset default black and white colors (Shift+D)" [ref=e278] [cursor=pointer]
            - 'button "Secondary color #C792DF. Click for quick swatches, double click for picker, right click to swap" [ref=e279] [cursor=pointer]'
            - 'button "Primary color #3A2E4C. Click for quick swatches, double click for picker, right click to swap" [ref=e280] [cursor=pointer]'
          - generic [ref=e281]:
            - generic [ref=e282]:
              - 'button "#DDDFDF (Click: Primary | Right-click: Secondary)" [ref=e283] [cursor=pointer]'
              - 'button "#DDDDDF (Click: Primary | Right-click: Secondary)" [ref=e284] [cursor=pointer]'
              - 'button "#D0C4DF (Click: Primary | Right-click: Secondary)" [ref=e285] [cursor=pointer]'
              - 'button "#DCABDF (Click: Primary | Right-click: Secondary)" [ref=e286] [cursor=pointer]'
            - button "Quick Swatches Flyout" [ref=e287] [cursor=pointer]
      - main "Pixel art canvas workspace" [ref=e291]:
        - application "Pixel art drawing canvas. Use mouse or stylus to paint, arrow keys to pan viewport or nudge selection, and Alt+drag to pan." [ref=e292]
      - complementary [ref=e295]:
        - generic [ref=e296]:
          - button "Tools" [ref=e297]
          - button "Layers" [pressed] [ref=e299]
          - button "Palette" [ref=e301]
          - button "PixiTools" [ref=e303]:
            - generic [ref=e304]: FX
        - generic [ref=e306]:
          - generic [ref=e307]:
            - generic "Each frame has its own layer pixels. A new blank frame keeps the layer names and settings." [ref=e308]:
              - text: Frame 1 · Layers
              - generic [ref=e309]: (1)
            - generic [ref=e310]:
              - button "Add New Layer" [ref=e311]
              - button "Duplicate Layer" [ref=e313]
              - button "Merge Down" [disabled] [ref=e315]
              - button "Delete Layer" [disabled] [ref=e317]
          - generic [ref=e319]:
            - generic [ref=e320]:
              - generic [ref=e321]: Opacity
              - slider "Layer opacity" [ref=e322] [cursor=pointer]: "100"
              - generic [ref=e323]: 100%
            - generic [ref=e324]:
              - generic [ref=e325]: Blend
              - combobox "Layer blend mode" [ref=e326] [cursor=pointer]:
                - option "Normal" [selected]
                - option "Multiply"
                - option "Screen"
                - option "Overlay"
                - option "Color Dodge"
                - option "On artwork only"
          - generic [ref=e328]:
            - generic [ref=e329]:
              - button "Reorder layer Base Layer" [disabled] [ref=e330]:
                - generic [ref=e331]: ⠿
              - generic [ref=e332]:
                - button "Select layer Base Layer. Double click to rename" [ref=e333] [cursor=pointer]: Base Layer
                - button "Rename layer Base Layer" [ref=e334] [cursor=pointer]
            - generic [ref=e335]:
              - button "Lock layer Base Layer" [ref=e336]
              - button "Hide layer Base Layer" [ref=e337]
    - contentinfo [ref=e339]:
      - generic [ref=e340]:
        - generic [ref=e341]:
          - generic [ref=e342]:
            - button "Play" [ref=e343]
            - button "Previous Frame (,)" [ref=e346]
            - button "Next Frame (.)" [ref=e348]
            - button "Repeat" [ref=e350]
          - generic [ref=e354]:
            - button "Preview speed" [ref=e356]:
              - generic [ref=e357]: Preview
              - generic [ref=e358]: 1×
              - generic [ref=e359]: ▾
            - generic [ref=e360]:
              - generic [ref=e361]: Frame time
              - spinbutton "Active frame duration in milliseconds" [ref=e362]: "100"
              - generic [ref=e363]: ms
            - button "Onion Skin" [ref=e364]
            - button "Onion skin settings" [ref=e367]: ⚙
        - generic [ref=e368]:
          - button "+ Frame" [ref=e369]:
            - generic [ref=e370]: Frame
          - group [ref=e372]:
            - generic "Frame actions" [ref=e373] [cursor=pointer]:
              - text: Frame actions
              - generic [ref=e374]: ▾
          - button "Collapse Timeline" [ref=e376]:
            - generic [ref=e377]:
              - generic [ref=e378]: ▼
              - generic [ref=e379]: Collapse
      - generic [ref=e380]:
        - 'button "Select frame 1. Duration: 100ms. Drag to reorder." [ref=e382]':
          - generic:
            - generic: "#1"
            - generic: 100ms
        - button "Clips" [ref=e383]
    - generic [ref=e385]:
      - generic [ref=e386]: "X: 20 Y: 8"
      - generic [ref=e389]: 32×32
      - generic [ref=e392]: 1600%
      - generic [ref=e394]: Frame 1/1
      - generic [ref=e396]: Base Layer
      - generic [ref=e397]: dither
      - status "All changes saved to local storage" [ref=e402]:
        - generic [ref=e404]: Saved
  - alert [ref=e405]
  - generic [ref=e406]:
    - group "Dither Brush preview":
      - generic:
        - generic:
          - generic: Dither Brush
          - generic:
            - generic: D
            - button "Close tool preview":
              - generic: ✕
        - generic:
          - generic:
            - img "dither animated tool demonstration"
            - text: BRUSH BETWEEN
        - generic:
          - paragraph: Blend shades smoothly with retro checkerboard stippling.
          - generic:
            - button "Don't show again"
```

# Test source

```ts
  1   | import { expect, test, type Page } from '@playwright/test';
  2   | 
  3   | const pixels = (page: Page) => page.getByTestId('main-composite-canvas').evaluate((canvas: HTMLCanvasElement) =>
  4   |   Array.from(canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data));
  5   | const rgba = async (page: Page, x: number, y: number) => (await pixels(page)).slice((y * 32 + x) * 4, (y * 32 + x) * 4 + 4);
  6   | async function ready(page: Page) {
  7   |   await page.goto('/studio'); await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  8   |   await expect(page.getByTestId('main-composite-canvas')).toBeVisible();
  9   | }
  10  | async function paint(page: Page, points: [number, number][]) {
  11  |   const box = (await page.getByTestId('main-composite-canvas').boundingBox())!;
  12  |   const move = (point: [number, number]) => page.mouse.move(box.x + box.width * (point[0] + 0.5) / 32, box.y + box.height * (point[1] + 0.5) / 32);
  13  |   await move(points[0]); await page.mouse.down();
  14  |   for (const point of points.slice(1)) await move(point);
  15  |   await page.mouse.up();
  16  | }
  17  | async function history(page: Page, key: 'z' | 'y') {
  18  |   await page.locator('#center-canvas-area').focus(); await page.keyboard.press(`Control+${key}`);
  19  | }
  20  | async function save(page: Page) {
  21  |   await page.getByTestId('save-button').click();
  22  |   await expect(page.locator('[role="status"]').filter({ hasText: /Changes saved/ })).toBeVisible();
  23  | }
  24  | async function gallery(page: Page) {
  25  |   await page.getByTestId('file-menu-button').click(); await page.getByRole('menuitem', { name: 'Projects', exact: true }).click();
  26  |   const dialog = page.getByRole('dialog', { name: 'Atelier Projects & Gallery' }); await expect(dialog).toBeVisible(); return dialog;
  27  | }
  28  | async function rename(page: Page, oldName: string, newName: string, keyboard = false) {
  29  |   const dialog = await gallery(page), card = dialog.getByRole('button', { name: `Open project ${oldName}`, exact: true });
  30  |   await card.getByRole('button', { name: 'Rename artwork' }).click();
  31  |   const input = card.getByRole('textbox', { name: 'Artwork title' }); await input.fill(newName);
  32  |   if (keyboard) await input.press('Enter'); else await card.getByRole('button', { name: 'Save title' }).click();
  33  |   await expect(dialog.getByRole('button', { name: `Open project ${newName}`, exact: true })).toBeVisible();
  34  |   await expect(dialog.getByRole('textbox', { name: 'Artwork title' })).toBeHidden(); return dialog;
  35  | }
  36  | 
  37  | test('compiled clean corners restore underlying artwork through undo, redo and saved reload', async ({ page }) => {
  38  |   await ready(page);
  39  |   const fixture = await page.evaluate(() => {
  40  |     const c = document.createElement('canvas'); c.width = c.height = 32;
  41  |     const ctx = c.getContext('2d')!; ctx.fillStyle = '#00ff0080'; ctx.fillRect(3, 2, 1, 1);
  42  |     return { format: 'pixibun-project', version: 3, name: 'Corner fixture', width: 32, height: 32, fps: 8, loopMode: 'repeat',
  43  |       onionSkin: { enabled: false, prevFrames: 1, nextFrames: 1, prevColor: '#c792df', nextColor: '#dcabdf', opacity: 0.45 },
  44  |       palettes: [{ id: 'colors', name: 'Colors', colors: ['#ff0000', '#00ff00'] }], currentPaletteId: 'colors', customRamps: [], clips: [],
  45  |       frames: [{ id: 'frame', durationMs: 100, layers: [{ id: 'body', name: 'Body', visible: true, locked: false, opacity: 1, blendMode: 'source-over', pngBase64: c.toDataURL('image/png').split(',')[1] }] }], createdAt: 1, updatedAt: 1 };
  46  |   });
  47  |   await page.locator('input[type=file]').first().setInputFiles({ name: 'corner.pixibun', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(fixture)) });
  48  |   const importDialog = page.getByRole('dialog', { name: 'Import Project (.pixibun)' });
  49  |   await importDialog.getByRole('button', { name: 'Confirm Import' }).click(); await expect(importDialog).toBeHidden();
  50  |   await expect.poll(() => rgba(page, 3, 2)).toEqual([0, 255, 0, 128]);
  51  |   const original = await pixels(page); await paint(page, [[2, 2], [3, 2], [3, 3]]);
  52  |   await expect.poll(() => rgba(page, 3, 2)).toEqual([0, 255, 0, 128]);
  53  |   expect((await rgba(page, 3, 3))[3]).toBe(255); const drawn = await pixels(page);
  54  |   await history(page, 'z'); await expect.poll(() => pixels(page)).toEqual(original);
  55  |   await history(page, 'y'); await expect.poll(() => pixels(page)).toEqual(drawn);
  56  |   await save(page); await page.reload(); await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  57  |   await expect.poll(() => pixels(page)).toEqual(drawn);
  58  | });
  59  | 
  60  | test('compiled dither fills a coarse path identically to fine samples and survives save and reload', async ({ page }) => {
  61  |   await ready(page); const blank = await pixels(page); await page.getByTestId('dither-tool').click();
  62  |   await paint(page, [[0, 8], [20, 8]]);
> 63  |   for (let x = 0; x <= 20; x++) expect((await rgba(page, x, 8))[3]).toBe(x % 2 === 0 ? 255 : 0);
      |                                                                     ^ Error: expect(received).toBe(expected) // Object.is equality
  64  |   const coarse = await pixels(page); await history(page, 'z'); await expect.poll(() => pixels(page)).toEqual(blank);
  65  |   await paint(page, Array.from({ length: 21 }, (_, x) => [x, 8] as [number, number]));
  66  |   await expect.poll(() => pixels(page)).toEqual(coarse);
  67  |   await history(page, 'z'); await expect.poll(() => pixels(page)).toEqual(blank);
  68  |   await history(page, 'y'); await expect.poll(() => pixels(page)).toEqual(coarse);
  69  |   await save(page); await page.reload(); await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  70  |   await expect.poll(() => pixels(page)).toEqual(coarse);
  71  | });
  72  | 
  73  | test('compiled gallery contains input keys, saves mouse and keyboard renames, and preserves active and inactive drawings', async ({ page }) => {
  74  |   await ready(page); await paint(page, [[5, 5]]); await save(page); const original = await pixels(page);
  75  |   let dialog = await gallery(page); await dialog.getByRole('button', { name: 'Rename artwork' }).click();
  76  |   const input = dialog.getByRole('textbox', { name: 'Artwork title' }); await input.fill('My'); await input.press('Space'); await input.pressSequentially('sprite');
  77  |   await expect(input).toHaveValue('My sprite'); await expect(dialog).toBeVisible();
  78  |   await input.press('Escape'); await expect(input).toBeHidden(); await expect(dialog).toBeVisible();
  79  |   await dialog.getByRole('button', { name: 'Close dialog', exact: true }).click();
  80  |   dialog = await rename(page, 'Untitled Sprite', 'My sprite'); await dialog.getByRole('button', { name: 'Close dialog', exact: true }).click();
  81  |   await paint(page, [[7, 7]]); await save(page); const edited = await pixels(page);
  82  |   await page.reload(); await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible(); await expect.poll(() => pixels(page)).toEqual(edited);
  83  |   await expect(page.getByRole('button', { name: 'Rename project My sprite' })).toBeVisible();
  84  |   dialog = await rename(page, 'My sprite', 'Keyboard title', true);
  85  |   await dialog.getByRole('button', { name: 'New Drawing', exact: true }).click();
  86  |   await expect(dialog).toBeHidden(); await save(page); const blank = await pixels(page);
  87  |   dialog = await rename(page, 'Keyboard title', 'Inactive title', true);
  88  |   expect(await pixels(page)).toEqual(blank);
  89  |   await dialog.getByRole('button', { name: 'Open project Inactive title', exact: true }).click();
  90  |   await expect.poll(() => pixels(page)).toEqual(edited); expect(edited).not.toEqual(original);
  91  | });
  92  | 
  93  | test('compiled rename refuses a real second-tab conflict while retaining both drawings', async ({ page, context }) => {
  94  |   await ready(page); await paint(page, [[4, 4]]); await save(page); const firstPixels = await pixels(page);
  95  |   const second = await context.newPage();
  96  |   try {
  97  |     await ready(second); await expect.poll(() => pixels(second)).toEqual(firstPixels);
  98  |     const firstDialog = await rename(page, 'Untitled Sprite', 'First tab'); await firstDialog.getByRole('button', { name: 'Close dialog', exact: true }).click();
  99  |     await paint(second, [[8, 8]]); const secondPixels = await pixels(second);
  100 |     const secondDialog = await gallery(second); await secondDialog.getByRole('button', { name: 'Rename artwork' }).click();
  101 |     await secondDialog.getByRole('textbox', { name: 'Artwork title' }).fill('Second tab'); await secondDialog.getByRole('button', { name: 'Save title' }).click();
  102 |     await expect(secondDialog.getByRole('alert')).toContainText('title could not be saved');
  103 |     expect(await pixels(second)).toEqual(secondPixels); await secondDialog.getByRole('button', { name: 'Close dialog', exact: true }).click();
  104 |     await expect(second.getByRole('button', { name: 'Save a copy', exact: true })).toBeVisible();
  105 |     await page.reload(); await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible(); await expect.poll(() => pixels(page)).toEqual(firstPixels);
  106 |     await expect(page.getByRole('button', { name: 'Rename project First tab' })).toBeVisible();
  107 |   } finally { await second.close(); }
  108 | });
  109 | 
```