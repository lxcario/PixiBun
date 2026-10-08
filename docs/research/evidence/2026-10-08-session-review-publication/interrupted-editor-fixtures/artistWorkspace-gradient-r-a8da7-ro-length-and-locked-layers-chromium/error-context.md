# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: artistWorkspace.spec.ts >> gradient respects lasso-shaped masks, Undo/Redo, cancel, zero-length and locked layers
- Location: tests\e2e\artistWorkspace.spec.ts:104:5

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
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
          - generic [ref=e186]:
            - button "Undo last action" [disabled]
          - generic [ref=e187]:
            - button "Redo last action" [disabled]
      - group "Drawing controls"
      - generic [ref=e188]:
        - group "Canvas controls" [ref=e189]:
          - group "Mirror drawing" [ref=e190]:
            - generic [ref=e191]: Mirror
            - button "Horizontal symmetry" [ref=e193] [cursor=pointer]
            - button "Vertical symmetry" [ref=e195] [cursor=pointer]
          - generic [ref=e197]:
            - generic [ref=e198]:
              - button "Zoom Out" [ref=e199] [cursor=pointer]: −
              - button "Zoom 1600 percent. Choose zoom level" [ref=e201]: 1600%
              - button "Zoom In" [ref=e202] [cursor=pointer]: +
            - button "Fit Canvas to Viewport (Ctrl+0)" [ref=e204] [cursor=pointer]: Fit
          - button "View options menu" [ref=e208] [cursor=pointer]:
            - generic [ref=e209]:
              - generic [ref=e210]: View
              - generic "1 active view options" [ref=e211]
            - generic [ref=e212]: ▼
        - group "Workspace presets" [ref=e213]:
          - combobox "Workspace layout" [ref=e214] [cursor=pointer]:
            - option "Drawing" [selected]
            - option "Animation"
            - option "Lighting"
        - group "Studio settings and help" [ref=e215]:
          - button "Studio options" [ref=e216] [cursor=pointer]:
            - generic [ref=e217]: Studio
            - generic [ref=e218]: ▼
        - button "Export drawing" [ref=e220]:
          - generic [ref=e221]: Export
    - status [ref=e223]: Not saved yet
    - generic [ref=e224]:
      - complementary [ref=e226]:
        - generic [ref=e228]:
          - group "Drawing" [ref=e229]:
            - button "Pen" [ref=e231] [cursor=pointer]
            - button "Bézier Curve" [ref=e233] [cursor=pointer]
            - button "Eraser" [ref=e235] [cursor=pointer]
            - button "Flood Fill" [ref=e237] [cursor=pointer]
            - button "Pixel Gradient" [pressed] [ref=e239] [cursor=pointer]
            - button "Dither Brush" [ref=e241] [cursor=pointer]
            - button "Color Replace" [ref=e243] [cursor=pointer]
            - button "Erase Sampled Color" [ref=e245] [cursor=pointer]
          - group "Selection" [ref=e246]:
            - button "Marquee Box" [ref=e249] [cursor=pointer]
            - button "Lasso Select" [ref=e251] [cursor=pointer]
            - button "Magic Wand" [ref=e253] [cursor=pointer]
          - group "Geometry" [ref=e254]:
            - button "Line" [ref=e257] [cursor=pointer]
            - button "2:1 Iso Line" [ref=e259] [cursor=pointer]
            - button "Rectangle" [ref=e261] [cursor=pointer]
            - button "Ellipse" [ref=e263] [cursor=pointer]
          - group "2.5D Sculpt" [ref=e264]:
            - button "Normal Chisel" [ref=e267] [cursor=pointer]
          - group "Utility" [ref=e268]:
            - button "Eyedropper" [ref=e271] [cursor=pointer]
        - generic [ref=e272]:
          - generic [ref=e273]:
            - button "Swap colors (X)" [ref=e274] [cursor=pointer]: ⇄
            - button "Reset default black and white colors (Shift+D)" [ref=e275] [cursor=pointer]
            - 'button "Secondary color #0000ff. Click for quick swatches, double click for picker, right click to swap" [ref=e276] [cursor=pointer]'
            - 'button "Primary color #ff0000. Click for quick swatches, double click for picker, right click to swap" [ref=e277] [cursor=pointer]'
          - generic [ref=e278]:
            - generic [ref=e279]:
              - 'button "#DDDFDF (Click: Primary | Right-click: Secondary)" [ref=e280] [cursor=pointer]'
              - 'button "#DDDDDF (Click: Primary | Right-click: Secondary)" [ref=e281] [cursor=pointer]'
              - 'button "#D0C4DF (Click: Primary | Right-click: Secondary)" [ref=e282] [cursor=pointer]'
              - 'button "#DCABDF (Click: Primary | Right-click: Secondary)" [ref=e283] [cursor=pointer]'
            - button "Quick Swatches Flyout" [ref=e284] [cursor=pointer]
      - main "Pixel art canvas workspace" [ref=e288]:
        - application "Pixel art drawing canvas. Use mouse or stylus to paint, arrow keys to pan viewport or nudge selection, and Alt+drag to pan." [active] [ref=e289]
      - complementary [ref=e292]:
        - generic [ref=e293]:
          - button "Tools" [ref=e294]
          - button "Layers" [pressed] [ref=e296]
          - button "Palette" [ref=e298]
          - button "PixiTools" [ref=e300]:
            - generic [ref=e301]: FX
        - generic [ref=e303]:
          - generic [ref=e304]:
            - generic "Each frame has its own layer pixels. A new blank frame keeps the layer names and settings." [ref=e305]:
              - text: Frame 1 · Layers
              - generic [ref=e306]: (1)
            - generic [ref=e307]:
              - button "Add New Layer" [ref=e308]
              - button "Duplicate Layer" [ref=e310]
              - button "Merge Down" [disabled] [ref=e312]
              - button "Delete Layer" [disabled] [ref=e314]
          - generic [ref=e316]:
            - generic [ref=e317]:
              - generic [ref=e318]: Opacity
              - slider "Layer opacity" [ref=e319] [cursor=pointer]: "100"
              - generic [ref=e320]: 100%
            - generic [ref=e321]:
              - generic [ref=e322]: Blend
              - combobox "Layer blend mode" [ref=e323] [cursor=pointer]:
                - option "Normal" [selected]
                - option "Multiply"
                - option "Screen"
                - option "Overlay"
                - option "Color Dodge"
                - option "On artwork only"
          - generic [ref=e325]:
            - generic [ref=e326]:
              - button "Reorder layer Base Layer" [disabled] [ref=e327]:
                - generic [ref=e328]: ⠿
              - generic [ref=e329]:
                - button "Select layer Base Layer. Double click to rename" [ref=e330] [cursor=pointer]: Base Layer
                - button "Rename layer Base Layer" [ref=e331] [cursor=pointer]
            - generic [ref=e332]:
              - button "Lock layer Base Layer" [ref=e333]
              - button "Hide layer Base Layer" [ref=e334]
    - contentinfo [ref=e336]:
      - generic [ref=e337]:
        - generic [ref=e338]:
          - generic [ref=e339]:
            - button "Play" [ref=e340]
            - button "Previous Frame (,)" [ref=e343]
            - button "Next Frame (.)" [ref=e345]
            - button "Repeat" [ref=e347]
          - generic [ref=e351]:
            - button "Preview speed" [ref=e353]:
              - generic [ref=e354]: Preview
              - generic [ref=e355]: 1×
              - generic [ref=e356]: ▾
            - generic [ref=e357]:
              - generic [ref=e358]: Frame time
              - spinbutton "Active frame duration in milliseconds" [ref=e359]: "100"
              - generic [ref=e360]: ms
            - button "Onion Skin" [ref=e361]
            - button "Onion skin settings" [ref=e364]: ⚙
        - generic [ref=e365]:
          - button "+ Frame" [ref=e366]:
            - generic [ref=e367]: Frame
          - group [ref=e369]:
            - generic "Frame actions" [ref=e370] [cursor=pointer]:
              - text: Frame actions
              - generic [ref=e371]: ▾
          - button "Collapse Timeline" [ref=e373]:
            - generic [ref=e374]:
              - generic [ref=e375]: ▼
              - generic [ref=e376]: Collapse
      - generic [ref=e377]:
        - 'button "Select frame 1. Duration: 100ms. Drag to reorder." [ref=e379]':
          - generic:
            - generic: "#1"
            - generic: 100ms
        - button "Clips" [ref=e380]
    - generic [ref=e382]:
      - generic [ref=e383]: "X: — Y: —"
      - generic [ref=e386]: 32×32
      - generic [ref=e389]: 1600%
      - generic [ref=e391]: Frame 1/1
      - generic [ref=e393]: Base Layer
      - generic [ref=e394]: "Sel: 8×8"
      - generic [ref=e396]: gradient
      - status "All changes saved to local storage" [ref=e401]:
        - generic [ref=e403]: Saved
  - button "Open Next.js Dev Tools" [ref=e409] [cursor=pointer]
  - alert [ref=e413]
```

# Test source

```ts
  11  | }
  12  | async function pixels(page: Page) {
  13  |   return page.getByTestId('main-composite-canvas').evaluate((c: HTMLCanvasElement) => Array.from(c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data));
  14  | }
  15  | async function drag(page: Page, x1: number, y1: number, x2: number, y2: number) {
  16  |   const box = (await page.locator('#center-canvas-area').boundingBox())!;
  17  |   const at = (x: number, y: number) => ({ x: box.x + (x + 0.5) * box.width / 32, y: box.y + (y + 0.5) * box.height / 32 });
  18  |   const from = at(x1, y1), to = at(x2, y2);
  19  |   await page.mouse.move(from.x, from.y); await page.mouse.down(); await page.mouse.move(to.x, to.y, { steps: 8 }); await page.mouse.up();
  20  | }
  21  | test('named layouts, left inspector, focus and reload preserve artwork', async ({ page }) => {
  22  |   await openStudio(page); await drag(page, 8, 8, 12, 12); const before = await pixels(page);
  23  |   expect(before.some(value => value !== 0)).toBe(true);
  24  |   await page.getByLabel('Workspace layout').selectOption('animation');
  25  |   await expect(page.getByRole('region', { name: 'Canvas navigator' })).toBeVisible();
  26  |   await page.getByRole('button', { name: 'Arrange workspace' }).click();
  27  |   await page.getByLabel('Inspector position').selectOption('left');
  28  |   await page.getByLabel('Inspector width').press('Home');
  29  |   for (let i = 0; i < 10; i++) await page.getByLabel('Inspector width').press('ArrowRight');
  30  |   await page.getByLabel('New workspace name').fill('Animation desk');
  31  |   await page.getByRole('button', { name: 'Save layout', exact: true }).click();
  32  |   await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  33  |   await expect(page.getByTestId('right-inspector')).toHaveCSS('width', '360px');
  34  |   const inspector = (await page.getByTestId('right-inspector').boundingBox())!, stage = (await page.locator('#main-content').boundingBox())!;
  35  |   expect(inspector.x).toBeLessThan(stage.x);
  36  |   await page.locator('#center-canvas-area').focus(); await page.keyboard.press('Shift+Tab');
  37  |   await expect(page.getByTestId('right-inspector')).toBeHidden(); await expect(page.getByTestId('bottom-timeline')).toBeHidden();
  38  |   expect(await pixels(page)).toEqual(before);
  39  |   await page.keyboard.press('Shift+Tab'); await expect(page.getByTestId('right-inspector')).toBeVisible();
  40  |   expect(await pixels(page)).toEqual(before);
  41  |   await page.getByRole('button', { name: 'Save now', exact: true }).click(); await page.reload();
  42  |   await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  43  |   await expect(page.getByLabel('Workspace layout').locator('option:checked')).toHaveText('Animation desk');
  44  |   await expect(page.getByTestId('right-inspector')).toHaveCSS('width', '360px'); expect(await pixels(page)).toEqual(before);
  45  | });
  46  | test('palette previews are nondestructive, favorites persist, and applying adds one exact palette', async ({ page }) => {
  47  |   await openStudio(page); await drag(page, 7, 7, 10, 7); const before = await pixels(page);
  48  |   await page.getByTestId('tab-palette').click();
  49  |   const initial = await page.evaluate(() => (window as unknown as ArtistTestWindow).__studioStore.getState().currentPaletteId);
  50  |   await page.getByRole('button', { name: /Browse palettes/ }).click();
  51  |   await expect(page.getByRole('dialog', { name: 'Palette library' })).toBeVisible();
  52  |   await page.screenshot({ path: 'docs/assets/screenshots/2026-10-04-artist-workspace/palette-library.png' });
  53  |   await page.getByLabel('Search palettes').fill('Sweetie'); await page.getByRole('button', { name: 'Preview Sweetie 16', exact: true }).click();
  54  |   await expect(page.getByRole('region', { name: 'Selected palette preview' })).toContainText('GrafxKid');
  55  |   expect(await page.evaluate(() => (window as unknown as ArtistTestWindow).__studioStore.getState().currentPaletteId)).toBe(initial);
  56  |   expect(await pixels(page)).toEqual(before);
  57  |   await page.getByRole('button', { name: 'Favorite Sweetie 16', exact: true }).click();
  58  |   await page.getByRole('button', { name: 'Use palette', exact: true }).click();
  59  |   expect(await page.evaluate(() => { const s = (window as unknown as ArtistTestWindow).__studioStore.getState(); return s.palettes.find(p => p.id === s.currentPaletteId)?.colors; })).toEqual(['#1a1c2c', '#5d275d', '#b13e53', '#ef7d57', '#ffcd75', '#a7f070', '#38b764', '#257179', '#29366f', '#3b5dc9', '#41a6f6', '#73eff7', '#f4f4f4', '#94b0c2', '#566c86', '#333c57']);
  60  |   expect(await pixels(page)).toEqual(before);
  61  |   await page.getByRole('button', { name: /Browse palettes/ }).click();
  62  |   await page.getByLabel('Palette collection').selectOption('favorites'); await expect(page.getByRole('button', { name: 'Preview Sweetie 16' })).toBeVisible();
  63  | });
  64  | test('pinned triangle, tool controls and navigator are usable at desktop widths', async ({ page }) => {
  65  |   await openStudio(page); await drag(page, 8, 8, 14, 12); await page.getByRole('navigation', { name: 'Artist workspace' }).getByRole('button', { name: 'Color', exact: true }).click();
  66  |   await page.getByLabel('Picker hex color').fill('#ff0000'); await page.getByLabel('Picker hue').press('Home');
  67  |   for (let i = 0; i < 120; i++) await page.getByLabel('Picker hue').press('ArrowRight');
  68  |   expect(await page.evaluate(() => (window as unknown as ArtistTestWindow).__studioStore.getState().primaryColor)).toBe('#00ff00');
  69  |   await page.getByLabel('Color picker shape').selectOption('square'); await page.getByLabel('Color picker shape').selectOption('triangle');
  70  |   await page.getByRole('button', { name: 'Tool settings', exact: true }).click();
  71  |   await page.getByLabel('Tool panel brush size').press('Home'); await page.getByLabel('Tool panel brush size').press('ArrowRight');
  72  |   expect(await page.evaluate(() => (window as unknown as ArtistTestWindow).__studioStore.getState().tools.brushSize)).toBe(2);
  73  |   await page.getByLabel('Composition guide').selectOption('diagonals'); await expect(page.getByTestId('diagonal-composition-guide')).toBeVisible();
  74  |   await page.getByRole('navigation', { name: 'Artist workspace' }).getByRole('button', { name: 'Navigator', exact: true }).click();
  75  |   const panBefore = await page.evaluate(() => (window as unknown as ArtistTestWindow).__studioStore.getState().panX);
  76  |   await page.getByTestId('navigator-canvas').click({ position: { x: 180, y: 56 } });
  77  |   expect(await page.evaluate(() => (window as unknown as ArtistTestWindow).__studioStore.getState().panX)).not.toBe(panBefore);
  78  |   await page.getByRole('button', { name: 'Fit canvas', exact: true }).click();
  79  |   for (const width of [1024, 1440]) {
  80  |     await page.setViewportSize({ width, height: 900 });
  81  |     await expect(page.getByTestId('navigator-canvas')).toBeInViewport();
  82  |     expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
  83  |   }
  84  |   await page.screenshot({ path: 'docs/assets/screenshots/2026-10-04-artist-workspace/color-tools-navigator.png' });
  85  |   const scan = await new AxeBuilder({ page }).include('[aria-label="Artist workspace"]').include('[data-testid="right-inspector"]').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  86  |   expect(scan.violations).toEqual([]);
  87  | });
  88  | test('onion settings render selected ghost ranges, keep artwork intact and survive reload', async ({ page }) => {
  89  |   await openStudio(page); await drag(page, 8, 8, 8, 8);
  90  |   await page.getByTestId('add-frame-button').click(); await drag(page, 12, 12, 12, 12);
  91  |   const before = await pixels(page);
  92  |   await page.getByLabel('Onion skin settings', { exact: true }).click();
  93  |   await page.getByRole('button', { name: 'Previous pose', exact: true }).click();
  94  |   await page.getByLabel('Previous onion frames', { exact: true }).fill('2');
  95  |   await page.getByLabel('Onion skin opacity', { exact: true }).press('Home'); for (let i = 0; i < 40; i++) await page.getByLabel('Onion skin opacity', { exact: true }).press('ArrowRight');
  96  |   await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  97  |   const settings = await page.evaluate(() => (window as unknown as ArtistTestWindow).__studioStore.getState().onionSkin);
  98  |   expect(settings).toMatchObject({ enabled: true, prevFrames: 2, nextFrames: 0, opacity: 0.4 }); expect(await pixels(page)).toEqual(before);
  99  |   expect(await page.getByTestId('onion-skin-canvas').evaluate((c: HTMLCanvasElement) => c.getContext('2d')!.getImageData(8, 8, 1, 1).data[3])).toBeGreaterThan(0);
  100 |   await page.getByRole('button', { name: 'Save now', exact: true }).click(); await page.reload(); await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  101 |   expect(await page.evaluate(() => (window as unknown as ArtistTestWindow).__studioStore.getState().onionSkin)).toEqual(settings);
  102 |   await page.locator('#center-canvas-area').focus(); await page.keyboard.press('F3'); expect(await page.evaluate(() => (window as unknown as ArtistTestWindow).__studioStore.getState().onionSkin.enabled)).toBe(false);
  103 | });
  104 | test('gradient respects lasso-shaped masks, Undo/Redo, cancel, zero-length and locked layers', async ({ page }) => {
  105 |   await openStudio(page);
  106 |   await page.evaluate(() => {
  107 |     const s = (window as unknown as ArtistTestWindow).__studioStore.getState(); const mask = new Uint8Array(32 * 32); for (let y = 8; y < 16; y++) for (let x = 8; x <= y; x++) mask[y * 32 + x] = 1;
  108 |     s.setSelection({ x: 8, y: 8, w: 8, h: 8 }, mask); s.setPrimaryColor('#ff0000'); s.setSecondaryColor('#0000ff');
  109 |   });
  110 |   await page.locator('#center-canvas-area').focus(); await page.keyboard.press('Shift+G');
> 111 |   await page.getByRole('button', { name: 'Tool settings', exact: true }).click(); await expect(page.getByLabel('Gradient shape')).toBeVisible();
      |                                                                          ^ Error: locator.click: Test timeout of 30000ms exceeded.
  112 |   await drag(page, 8, 8, 15, 8); const drawn = await pixels(page);
  113 |   let changed = 0; for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) { const rgba = drawn.slice((y * 32 + x) * 4, (y * 32 + x) * 4 + 4); if (y >= 8 && y < 16 && x >= 8 && x <= y) { expect([[255, 0, 0, 255], [0, 0, 255, 255]]).toContainEqual(rgba); changed++; } else expect(rgba).toEqual([0, 0, 0, 0]); }
  114 |   expect(changed).toBe(36);
  115 |   await page.getByTestId('undo-button').click(); expect((await pixels(page)).every(v => v === 0)).toBe(true);
  116 |   await page.getByTestId('redo-button').click(); expect(await pixels(page)).toEqual(drawn);
  117 |   await page.screenshot({ path: 'docs/assets/screenshots/2026-10-04-artist-workspace/selection-gradient.png' });
  118 |   await page.evaluate(() => (window as unknown as ArtistTestWindow).__studioStore.getState().setPrimaryColor('#00ff00'));
  119 |   const box = (await page.locator('#center-canvas-area').boundingBox())!;
  120 |   await page.mouse.move(box.x + 8.5 * box.width / 32, box.y + 8.5 * box.height / 32); await page.mouse.down(); await page.mouse.move(box.x + 15.5 * box.width / 32, box.y + 8.5 * box.height / 32);
  121 |   await page.locator('#center-canvas-area').dispatchEvent('pointercancel', { pointerType: 'mouse', isPrimary: true }); await page.mouse.up(); expect(await pixels(page)).toEqual(drawn);
  122 |   await drag(page, 10, 10, 10, 10); expect(await pixels(page)).toEqual(drawn);
  123 |   await page.evaluate(() => { const s = (window as unknown as ArtistTestWindow).__studioStore.getState(); s.toggleLayerLock(s.activeLayerId); });
  124 |   await drag(page, 8, 8, 15, 8); expect(await pixels(page)).toEqual(drawn);
  125 | });
  126 | 
```