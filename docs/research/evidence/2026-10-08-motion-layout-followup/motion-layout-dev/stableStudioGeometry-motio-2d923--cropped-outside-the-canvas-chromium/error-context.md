# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: stableStudioGeometry.spec.ts >> motion preview suppresses neighboring ghosts and reports painted pixels cropped outside the canvas
- Location: tests\production\stableStudioGeometry.spec.ts:47:5

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: locator.click: Test timeout of 60000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Frame actions', exact: true })

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
            - 'button "Primary color #3A2E4C. Click for quick swatches, double click for picker, right click to swap" [ref=e293] [cursor=pointer]'
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
        - generic [ref=e382]:
          - button "+ Frame" [ref=e383]:
            - generic [ref=e384]: Frame
          - group [ref=e386]:
            - generic "Frame actions" [ref=e387] [cursor=pointer]:
              - text: Frame actions
              - generic [ref=e388]: ▾
          - button "Collapse Timeline" [ref=e390]:
            - generic [ref=e391]:
              - generic [ref=e392]: ▼
              - generic [ref=e393]: Collapse
      - generic [ref=e394]:
        - 'button "Select frame 1. Duration: 100ms. Drag to reorder." [ref=e396]':
          - generic:
            - generic: "#1"
            - generic: 100ms
        - button "Clips" [ref=e397]
    - generic [ref=e399]:
      - generic [ref=e400]: "X: — Y: —"
      - generic [ref=e403]: 32×32
      - generic [ref=e406]: 1600%
      - generic [ref=e408]: Frame 1/1
      - generic [ref=e410]: Base Layer
      - generic [ref=e411]: pen
      - status "All changes saved to local storage" [ref=e416]:
        - generic [ref=e418]: Saved
  - button "Open Next.js Dev Tools" [ref=e424] [cursor=pointer]
  - alert [ref=e428]
```

# Test source

```ts
  1  | import { expect, test, type Page } from '@playwright/test';
  2  | 
  3  | const pixels = (page: Page, id = 'main-composite-canvas') => page.getByTestId(id).evaluate((canvas: HTMLCanvasElement) => Array.from(canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data));
  4  | async function numeric(page: Page, label: string, value: string) { const input = page.getByRole('spinbutton', { name: label, exact: true }); await input.fill(value); await input.press('Enter'); }
  5  | async function draw(page: Page, x: number, y: number) { const canvas = page.getByTestId('main-composite-canvas'), box = (await canvas.boundingBox())!, size = await canvas.evaluate((c: HTMLCanvasElement) => [c.width, c.height]); await page.mouse.click(box.x + (x + .5) * box.width / size[0], box.y + (y + .5) * box.height / size[1]); }
  6  | 
  7  | for (const theme of ['atelier', 'cozy-classic']) test(`${theme} controls and canvas keep their geometry when onion help and motion states change`, async ({ page }, info) => {
  8  |   await page.setViewportSize({ width: 1920, height: 1000 }); await page.goto('/studio'); await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  9  |   await page.getByRole('button', { name: 'Studio options', exact: true }).click(); await page.getByTestId(`theme-option-${theme}`).click(); await page.keyboard.press('Escape');
  10 |   for (const width of [1920, 1280, 1024]) {
  11 |     await page.setViewportSize({ width, height: 1000 });
  12 |     const geometry = () => page.evaluate(() => ['main-composite-canvas', 'bottom-timeline'].map(id => { const r = document.querySelector(`[data-testid="${id}"]`)!.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; }));
  13 |     const before = await geometry(), onion = page.getByRole('button', { name: 'Onion Skin', exact: true });
  14 |     await onion.click(); await expect.poll(geometry).toEqual(before); await onion.click(); await expect.poll(geometry).toEqual(before);
  15 |     const row = page.getByTestId('bottom-timeline'); expect(await row.evaluate(element => {
  16 |       const bounds = element.getBoundingClientRect(); return Array.from(element.querySelectorAll('button')).filter(button => button.getClientRects().length && button.getBoundingClientRect().top < bounds.top + 40).every(button => { const box = button.getBoundingClientRect(); return box.left >= bounds.left && box.right <= bounds.right && box.height === 28; });
  17 |     })).toBe(true);
  18 |   }
  19 |   await draw(page, 8, 8); await page.getByTestId('tab-tools').click(); await page.getByTestId('create-motion-part-btn').click();
  20 |   const actions = [page.getByRole('button', { name: 'Undo motion edit', exact: true }), page.getByRole('button', { name: 'Redo motion edit', exact: true }), page.getByRole('button', { name: 'Reset Pose', exact: true })];
  21 |   const boxes = await Promise.all(actions.map(action => action.boundingBox())); expect(boxes.every(box => box && box.height === 28 && Math.abs(box.width - boxes[0]!.width) < 1 && box.y === boxes[0]!.y)).toBe(true);
  22 |   for (const action of actions) expect(await action.evaluate(button => { const label = button.firstElementChild!.getBoundingClientRect(), outer = button.getBoundingClientRect(); return Math.abs((label.top + label.bottom - outer.top - outer.bottom) / 2) < 1 && getComputedStyle(button).fontSize === '12px' && label.height <= outer.height - 2; })).toBe(true);
  23 |   const start = page.getByTestId('pose-btn-start'), end = page.getByTestId('pose-btn-end'); const poseBoxes = await Promise.all([start.boundingBox(), end.boundingBox()]); expect(poseBoxes[0]!.height).toBe(poseBoxes[1]!.height);
  24 |   await start.click(); expect((await start.boundingBox())!.height).toBe(poseBoxes[0]!.height); await end.click();
  25 |   const play = page.getByRole('button', { name: 'Play Loop', exact: true }), playBox = await play.boundingBox(); await play.click(); await expect(page.getByRole('button', { name: 'Pause', exact: true }).first()).toBeVisible();
  26 |   const pause = page.getByTestId('piximotion-panel').getByRole('button', { name: 'Pause', exact: true }); expect((await pause.boundingBox())!.width).toBe(playBox!.width); await pause.click();
  27 |   await page.getByTestId('piximotion-panel').screenshot({ path: info.outputPath(`motion-${theme}-1024.png`) });
  28 | });
  29 | 
  30 | test('merging layered artwork moves every painted layer without leaving an original drawing, and Undo restores the separate layers', async ({ page }) => {
  31 |   await page.setViewportSize({ width: 1600, height: 1000 }); await page.goto('/studio'); await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  32 |   await draw(page, 8, 8); await page.getByTestId('tab-layers').click(); await page.getByRole('button', { name: 'Add New Layer', exact: true }).click(); await draw(page, 12, 8);
  33 |   await page.getByRole('slider', { name: 'Layer opacity', exact: true }).fill('50'); const original = await pixels(page); expect(original.filter((v, i) => i % 4 === 3 && v)).toHaveLength(2);
  34 |   await page.getByTestId('tab-tools').click(); await page.getByTestId('create-visible-motion-btn').click();
  35 |   await numeric(page, 'Position X pixels', '2'); await numeric(page, 'Motion frames', '3');
  36 |   const expected = new Array<number>(original.length).fill(0); for (let y = 0; y < 32; y++) for (let x = 0; x + 2 < 32; x++) for (let c = 0; c < 4; c++) expected[(y * 32 + x + 2) * 4 + c] = original[(y * 32 + x) * 4 + c];
  37 |   await expect.poll(() => pixels(page, 'piximotion-preview-canvas')).toEqual(expected);
  38 |   await page.getByTestId('pose-btn-start').click(); await numeric(page, 'Position X pixels', '1'); await page.getByRole('button', { name: 'BAKE TO TIMELINE', exact: true }).click(); await expect(page.getByTestId('piximotion-panel')).toBeHidden();
  39 |   await expect.poll(() => pixels(page)).toEqual(expected); await page.getByRole('button', { name: /Select frame 1\./ }).click();
  40 |   const first = new Array<number>(original.length).fill(0); for (let y = 0; y < 32; y++) for (let x = 0; x + 1 < 32; x++) for (let c = 0; c < 4; c++) first[(y * 32 + x + 1) * 4 + c] = original[(y * 32 + x) * 4 + c];
  41 |   await expect.poll(() => pixels(page)).toEqual(first); expect(first).not.toEqual(original);
  42 |   await page.getByTestId('undo-button').click(); await expect(page.getByRole('button', { name: /^Select frame \d+\./ })).toHaveCount(1); await expect.poll(() => pixels(page)).toEqual(original);
  43 |   await page.getByTestId('undo-button').click(); await page.getByTestId('tab-layers').click(); await expect(page.getByTestId('layers-stack-count')).toHaveText('(2)'); await expect.poll(() => pixels(page)).toEqual(original);
  44 |   await page.getByTestId('redo-button').click(); await expect(page.getByTestId('layers-stack-count')).toHaveText('(1)'); await page.getByTestId('redo-button').click(); await page.getByRole('button', { name: /Select frame 3\./ }).click(); await expect.poll(() => pixels(page)).toEqual(expected);
  45 | });
  46 | 
  47 | test('motion preview suppresses neighboring ghosts and reports painted pixels cropped outside the canvas', async ({ page }) => {
  48 |   await page.setViewportSize({ width: 1600, height: 1000 }); await page.goto('/studio'); await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible(); await draw(page, 8, 8);
> 49 |   await page.getByRole('button', { name: 'Frame actions', exact: true }).click(); await page.getByRole('button', { name: 'Duplicate frame', exact: true }).click();
     |                                                                          ^ Error: locator.click: Test timeout of 60000ms exceeded.
  50 |   await page.getByRole('button', { name: 'Onion Skin', exact: true }).click(); await expect.poll(async () => (await pixels(page, 'onion-skin-canvas')).some((v, i) => i % 4 === 3 && v > 0)).toBe(true);
  51 |   await page.getByTestId('tab-tools').click(); await page.getByTestId('create-motion-part-btn').click(); await numeric(page, 'Position X pixels', '50');
  52 |   await expect(page.getByTestId('motion-clipping-notice')).toContainText('1 painted pixels leave the canvas'); await expect.poll(() => pixels(page, 'onion-skin-canvas')).toEqual(new Array(32 * 32 * 4).fill(0));
  53 |   await numeric(page, 'Position X pixels', '2'); await expect(page.getByTestId('piximotion-preview-canvas')).toHaveAttribute('data-clipped-pixels', '0');
  54 |   const preview = await pixels(page, 'piximotion-preview-canvas'); expect(preview[(8 * 32 + 8) * 4 + 3]).toBe(0); expect(preview[(8 * 32 + 10) * 4 + 3]).toBe(255);
  55 |   await page.getByRole('button', { name: 'Cancel (Escape)', exact: true }).click(); await expect.poll(async () => (await pixels(page, 'onion-skin-canvas')).some((v, i) => i % 4 === 3 && v > 0)).toBe(true);
  56 | });
  57 | test('motion preview advances when worker results take longer than a cel duration', async ({ page }) => {
  58 |   await page.addInitScript(() => {
  59 |     const NativeWorker = window.Worker;
  60 |     window.Worker = new Proxy(NativeWorker, { construct(Target, args) {
  61 |       const worker = Reflect.construct(Target, args) as Worker;
  62 |       return new Proxy(worker, { get(target, key) { const value = Reflect.get(target, key, target); return typeof value === 'function' ? value.bind(target) : value; },
  63 |         set(target, key, value) { return Reflect.set(target, key, key === 'onmessage' && typeof value === 'function' ? (event: MessageEvent) => {
  64 |           if (typeof event.data?.result?.destX === 'number') setTimeout(() => value.call(target, event), 400); else value.call(target, event);
  65 |         } : value, target); } });
  66 |     } });
  67 |   });
  68 |   await page.setViewportSize({ width: 1600, height: 1000 });
  69 |   await page.goto('/studio?template=hearth-ghost');
  70 |   await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  71 |   await page.getByTestId('tab-tools').click(); await page.getByTestId('create-motion-part-btn').click();
  72 |   const end = page.getByRole('spinbutton', { name: 'Position X pixels', exact: true }); await end.fill('4'); await end.press('Enter');
  73 |   const preview = page.getByTestId('piximotion-preview-canvas'); await expect(preview).toHaveAttribute('aria-busy', 'false');
  74 |   const signature = () => preview.evaluate((c: HTMLCanvasElement) => Array.from(c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data).join(','));
  75 |   const first = await signature(); await page.getByRole('button', { name: 'Play Loop', exact: true }).click();
  76 |   await expect.poll(signature, { timeout: 4000 }).not.toBe(first);
  77 |   await page.getByRole('button', { name: 'Cancel (Escape)', exact: true }).click(); await expect(preview).toHaveCount(0);
  78 | });
  79 | 
```