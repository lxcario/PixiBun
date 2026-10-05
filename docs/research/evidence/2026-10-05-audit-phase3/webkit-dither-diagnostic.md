# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: workspaceConsistency.spec.ts >> compiled header keeps mouse history accessible at compact widths and tool activation clears its preview
- Location: tests\production\workspaceConsistency.spec.ts:143:5

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 255
Received: 0
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - link "Skip to content" [ref=e2]:
    - /url: "#main-workspace"
  - generic [ref=e4]:
    - banner [ref=e6]:
      - group "Project controls" [ref=e7]:
        - link "PixiBun Home" [ref=e8]:
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
          - button "Redo last action" [ref=e188] [cursor=pointer]
      - group "Drawing controls" [ref=e189]:
        - button "Dither tool options" [ref=e190]:
          - text: Dither
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
            - button "Dither Brush" [pressed] [ref=e245] [cursor=pointer]
            - button "Color Replace" [ref=e247] [cursor=pointer]
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
            - 'button "Primary color #3A2E4C. Click for quick swatches, double click for picker, right click to swap" [ref=e281] [cursor=pointer]'
          - generic [ref=e282]:
            - generic [ref=e283]:
              - 'button "#DDDFDF (Click: Primary | Right-click: Secondary)" [ref=e284] [cursor=pointer]'
              - 'button "#DDDDDF (Click: Primary | Right-click: Secondary)" [ref=e285] [cursor=pointer]'
              - 'button "#D0C4DF (Click: Primary | Right-click: Secondary)" [ref=e286] [cursor=pointer]'
              - 'button "#DCABDF (Click: Primary | Right-click: Secondary)" [ref=e287] [cursor=pointer]'
            - button "Quick Swatches Flyout" [ref=e288] [cursor=pointer]
      - main "Pixel art canvas workspace" [ref=e292]:
        - application "Pixel art drawing canvas. Use mouse or stylus to paint, arrow keys to pan viewport or nudge selection, and Alt+drag to pan." [ref=e293]
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
      - generic [ref=e387]: "X: 20 Y: 8"
      - generic [ref=e390]: 32×32
      - generic [ref=e393]: 1600%
      - generic [ref=e395]: Frame 1/1
      - generic [ref=e397]: Base Layer
      - generic [ref=e398]: dither
      - status "All changes saved to local storage" [ref=e403]:
        - generic [ref=e405]: Saved
  - alert [ref=e406]
```

# Test source

```ts
  58  |   await gallery.getByRole('button', { name: 'Close dialog', exact: true }).click();
  59  |   await expect(opener).toBeFocused(); expect(await pixels(page)).toEqual(blank);
  60  | });
  61  | 
  62  | test('compiled onion and grid commands match their advertised gestures and leave artwork intact', async ({ page }) => {
  63  |   await ready(page); await paint(page, [5, 5]); const artwork = await pixels(page);
  64  |   await (await palette(page, 'Ellipse')).press('Enter'); await expect(page.getByTestId('ellipse-tool')).toHaveAttribute('aria-pressed', 'true');
  65  |   let input = await palette(page, 'Onion'); await expect(page.getByRole('listbox', { name: 'Studio commands' }).getByRole('option')).toContainText('F3');
  66  |   await input.press('Enter'); const toggle = page.getByRole('button', { name: 'Onion Skin', exact: true });
  67  |   const after = await toggle.getAttribute('aria-pressed');
  68  |   await page.locator('#center-canvas-area').focus(); await page.keyboard.press('F3'); await expect(toggle).toHaveAttribute('aria-pressed', after === 'true' ? 'false' : 'true');
  69  |   const grid = page.getByTestId('grid-selection-overlay');
  70  |   const gridImage = () => grid.evaluate(el => el.style.backgroundImage);
  71  |   const before = await gridImage();
  72  |   await page.keyboard.press("Control+'"); await expect.poll(gridImage).not.toBe(before);
  73  |   input = await palette(page, 'Toggle Pixel Grid'); await expect(page.getByRole('listbox', { name: 'Studio commands' }).getByRole('option')).toContainText("Ctrl+'"); await input.press('Enter');
  74  |   await expect.poll(gridImage).toBe(before); expect(await pixels(page)).toEqual(artwork);
  75  | });
  76  | 
  77  | test('compiled Fit is identical through header, keyboard, navigator and palette, including large artwork', async ({ page }) => {
  78  |   await ready(page); await page.getByLabel('Workspace layout').selectOption('animation');
  79  |   const headerZoom = page.getByRole('button', { name: /Choose zoom level/ });
  80  |   for (const large of [false, true]) {
  81  |     if (large) {
  82  |       const fixture = await page.evaluate(() => {
  83  |         const c = document.createElement('canvas'); c.width = c.height = 1024;
  84  |         const ctx = c.getContext('2d')!; ctx.fillStyle = '#ff0000'; ctx.fillRect(0, 0, 1, 1);
  85  |         return { format: 'pixibun-project', version: 3, name: 'Large fit fixture', width: 1024, height: 1024, fps: 8, loopMode: 'repeat', palettes: [{ id: 'colors', name: 'Colors', colors: ['#ff0000'] }], currentPaletteId: 'colors', customRamps: [], clips: [], frames: [{ id: 'frame', durationMs: 100, layers: [{ id: 'body', name: 'Body', visible: true, locked: false, opacity: 1, blendMode: 'source-over', pngBase64: c.toDataURL('image/png').split(',')[1] }] }], createdAt: 1, updatedAt: 1 };
  86  |       });
  87  |       await page.locator('input[type=file]').first().setInputFiles({ name: 'large.pixibun', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(fixture)) });
  88  |       const dialog = page.getByRole('dialog', { name: 'Import Project (.pixibun)' }); await dialog.getByRole('button', { name: 'Confirm Import' }).click(); await expect(dialog).toBeHidden();
  89  |     }
  90  |     const png = () => page.getByTestId('main-composite-canvas').evaluate((c: HTMLCanvasElement) => c.toDataURL());
  91  |     const artwork = await png(); await page.getByTestId('fit-canvas-button').click(); const fitted = await headerZoom.textContent();
  92  |     if (large) expect(parseInt(fitted!, 10)).toBeLessThan(100);
  93  |     for (const action of ['keyboard', 'navigator', 'palette']) {
  94  |       await (await palette(page, '100% Actual')).press('Enter');
  95  |       if (action === 'keyboard') { await page.locator('#center-canvas-area').focus(); await page.keyboard.press('Control+0'); }
  96  |       if (action === 'navigator') await page.getByRole('region', { name: 'Canvas navigator' }).getByRole('button', { name: 'Fit canvas', exact: true }).click();
  97  |       if (action === 'palette') await (await palette(page, 'Fit Canvas')).press('Enter');
  98  |       await expect(headerZoom).toHaveText(fitted!);
  99  |     }
  100 |     expect(await png()).toEqual(artwork);
  101 |   }
  102 | });
  103 | 
  104 | test('compiled navigator keeps square pixels and aligns clicks, drag, keyboard and full zoom range', async ({ page }, testInfo) => {
  105 |   await ready(page); await paint(page, [5, 5]); const artwork = await pixels(page);
  106 |   await page.getByLabel('Workspace layout').selectOption('animation');
  107 |   const slider = page.getByLabel('Navigator zoom slider'); await slider.fill('6400'); await expect(slider).toHaveValue('6400');
  108 |   const overview = page.getByTestId('navigator-canvas'), bounds = page.getByTestId('navigator-view-bounds');
  109 |   const box = (await overview.boundingBox())!; expect(box.width / box.height).toBeCloseTo(2, 5);
  110 |   // CSS serializes fractional dimensions with limited precision; allow 0.01px.
  111 |   const center = () => bounds.evaluate(el => ({ x: Math.round((parseFloat(el.style.left) + parseFloat(el.style.width) / 2) * 100) / 100, y: Math.round((parseFloat(el.style.top) + parseFloat(el.style.height) / 2) * 100) / 100 }));
  112 |   await page.mouse.click(box.x + 140, box.y + 56); await expect.poll(center).toEqual({ x: 140, y: 56 });
  113 |   await page.mouse.move(box.x + 140, box.y + 56); await page.mouse.down(); await page.mouse.move(box.x + 84, box.y + 42); await page.mouse.up();
  114 |   await expect.poll(center).toEqual({ x: 84, y: 42 });
  115 |   const navButton = page.getByRole('button', { name: /^Canvas overview/ }); await expect(navButton).toBeFocused();
  116 |   await navButton.press('ArrowRight'); await expect.poll(center).toEqual({ x: 87.5, y: 42 });
  117 |   await navButton.press('Shift+ArrowDown'); await expect.poll(center).toEqual({ x: 87.5, y: 70 });
  118 |   await navButton.press('Enter'); await expect.poll(center).toEqual({ x: 112, y: 56 });
  119 |   if (testInfo.project.name === 'chromium') await page.getByRole('region', { name: 'Canvas navigator' }).screenshot({ path: 'docs/research/evidence/2026-10-05-audit-phase3/navigator.png' });
  120 |   for (const width of [1024, 1600]) { await page.setViewportSize({ width, height: 900 }); expect((await overview.boundingBox())!.width / (await overview.boundingBox())!.height).toBeCloseTo(2, 5); }
  121 |   expect(await pixels(page)).toEqual(artwork);
  122 | });
  123 | 
  124 | test('compiled Lighting and custom task layouts restore across sessions without modifying artwork', async ({ page }, testInfo) => {
  125 |   await ready(page); await paint(page, [5, 5]); const artwork = await pixels(page); await save(page);
  126 |   await page.getByLabel('Workspace layout').selectOption('lighting');
  127 |   await expect(page.getByTestId('tab-ai')).toHaveAttribute('aria-pressed', 'true');
  128 |   await expect(page.getByRole('heading', { name: 'Add light and depth', exact: true })).toBeVisible();
  129 |   if (testInfo.project.name === 'chromium') await page.screenshot({ path: 'docs/research/evidence/2026-10-05-audit-phase3/lighting-workspace.png' });
  130 |   await page.evaluate(() => sessionStorage.clear()); await page.reload(); await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  131 |   await expect(page.getByTestId('tab-ai')).toHaveAttribute('aria-pressed', 'true');
  132 |   await expect(page.getByRole('heading', { name: 'Add light and depth', exact: true })).toBeVisible();
  133 |   await page.getByTestId('tab-palette').click(); await page.getByRole('button', { name: 'View options menu', exact: true }).click();
  134 |   await page.getByRole('button', { name: 'Arrange...', exact: true }).click();
  135 |   await page.getByLabel('New workspace name').fill('Color desk'); await page.getByRole('button', { name: 'Save layout', exact: true }).click();
  136 |   await page.getByRole('button', { name: 'Close dialog', exact: true }).click(); await page.getByLabel('Workspace layout').selectOption('animation');
  137 |   await expect(page.getByTestId('tab-layers')).toHaveAttribute('aria-pressed', 'true');
  138 |   await page.getByLabel('Workspace layout').selectOption({ label: 'Color desk' }); await expect(page.getByTestId('tab-palette')).toHaveAttribute('aria-pressed', 'true');
  139 |   await page.reload(); await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  140 |   await expect(page.getByTestId('tab-palette')).toHaveAttribute('aria-pressed', 'true'); expect(await pixels(page)).toEqual(artwork);
  141 | });
  142 | 
  143 | test('compiled header keeps mouse history accessible at compact widths and tool activation clears its preview', async ({ page }, testInfo) => {
  144 |   await ready(page);
  145 |   for (const width of [1024, 1280, 1600]) {
  146 |     await page.setViewportSize({ width, height: 900 }); const original = await pixels(page); await paint(page, [6, 6], [9, 6]);
  147 |     const drawn = await pixels(page); expect(drawn).not.toEqual(original);
  148 |     await page.getByTestId('undo-button').click({ timeout: 5000 }); await expect.poll(() => pixels(page)).toEqual(original);
  149 |     await page.getByTestId('redo-button').click({ timeout: 5000 }); await expect.poll(() => pixels(page)).toEqual(drawn);
  150 |     if (testInfo.project.name === 'chromium' && width === 1280) await page.locator('header').first().screenshot({ path: 'docs/research/evidence/2026-10-05-audit-phase3/header-1280.png' });
  151 |     await page.getByTestId('undo-button').click();
  152 |   }
  153 |   await page.setViewportSize({ width: 1280, height: 900 });
  154 |   const dither = page.getByTestId('dither-tool'); await dither.hover();
  155 |   await expect(page.getByRole('group', { name: /Dither.*preview/ })).toBeVisible(); await dither.click();
  156 |   await expect(page.getByRole('group', { name: /Dither.*preview/ })).toBeHidden();
  157 |   await paint(page, [0, 8], [20, 8]);
> 158 |   const drawn = await pixels(page); for (let x = 0; x <= 20; x++) expect(drawn[(8 * 32 + x) * 4 + 3]).toBe(x % 2 === 0 ? 255 : 0);
      |                                                                                                       ^ Error: expect(received).toBe(expected) // Object.is equality
  159 |   await page.getByTestId('undo-button').click(); await expect.poll(() => pixels(page)).not.toEqual(drawn);
  160 | });
  161 | 
```