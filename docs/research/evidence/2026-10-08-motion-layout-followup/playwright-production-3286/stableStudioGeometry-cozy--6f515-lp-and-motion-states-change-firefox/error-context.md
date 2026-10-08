# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: stableStudioGeometry.spec.ts >> cozy-classic controls and canvas keep their geometry when onion help and motion states change
- Location: tests\production\stableStudioGeometry.spec.ts:24:54

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
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
        - button "Save unsaved changes" [ref=e182]:
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
    - status [ref=e238]: Unsaved changes
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
              - 'button "Quick color #DDDFDF" [ref=e295] [cursor=pointer]'
              - 'button "Quick color #DDDDDF" [ref=e296] [cursor=pointer]'
              - 'button "Quick color #D0C4DF" [ref=e297] [cursor=pointer]'
              - 'button "Quick color #DCABDF" [ref=e298] [cursor=pointer]'
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
            - button "Onion Skin" [active] [ref=e376]
            - button "Onion skin settings" [ref=e379]: ⚙
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
      - status "You have unsaved changes" [ref=e415]:
        - generic [ref=e417]: Unsaved
  - alert [ref=e418]
```

# Test source

```ts
  1   | import { expect, test, type Page } from '@playwright/test';
  2   | 
  3   | const pixels = (page: Page, id = 'main-composite-canvas') => page.getByTestId(id).evaluate((canvas: HTMLCanvasElement) => Array.from(canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data));
  4   | async function numeric(page: Page, label: string, value: string) { const input = page.getByRole('spinbutton', { name: label, exact: true }); await input.fill(value); await input.press('Enter'); }
  5   | async function draw(page: Page, x: number, y: number) { const canvas = page.getByTestId('main-composite-canvas'), box = (await canvas.boundingBox())!, size = await canvas.evaluate((c: HTMLCanvasElement) => [c.width, c.height]); await page.mouse.click(box.x + (x + .5) * box.width / size[0], box.y + (y + .5) * box.height / size[1]); }
  6   | 
  7   | test('the original compact color dock stays bottom left and its wells, swatches, swap and reset work', async ({ page }, info) => {
  8   |   await page.setViewportSize({ width: 1280, height: 900 }); await page.goto('/studio'); await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  9   |   const dock = page.getByTestId('toolbar-color-dock'), primary = dock.getByRole('button', { name: /^Primary color / }), secondary = dock.getByRole('button', { name: /^Secondary color / });
  10  |   const boxes = await Promise.all([primary.boundingBox(), secondary.boundingBox(), dock.boundingBox(), page.getByTestId('bottom-timeline').boundingBox()]);
  11  |   expect(boxes[0]!.width).toBe(24); expect(boxes[1]!.width).toBe(22); expect(boxes[2]!.height).toBeLessThanOrEqual(124);
  12  |   expect(boxes[0]!.x + boxes[0]!.width).toBeGreaterThan(boxes[1]!.x);
  13  |   expect(boxes[2]!.x).toBeLessThan(10); expect(boxes[2]!.y + boxes[2]!.height).toBeCloseTo(boxes[3]!.y, 0);
  14  |   const color = (well: typeof primary) => well.evaluate(button => (button as HTMLButtonElement).style.backgroundColor);
  15  |   const before = await Promise.all([color(primary), color(secondary)]); await dock.getByRole('button', { name: 'Swap colors (X)', exact: true }).click();
  16  |   expect(await Promise.all([color(primary), color(secondary)])).toEqual([before[1], before[0]]);
  17  |   const swatch = dock.getByRole('button', { name: /^Quick color / }).first(), swatchColor = await color(swatch); await swatch.click(); expect(await color(primary)).toBe(swatchColor);
  18  |   await swatch.click({ button: 'right' }); expect(await color(secondary)).toBe(swatchColor);
  19  |   await dock.getByRole('button', { name: /^Reset default/ }).click(); expect(await Promise.all([color(primary), color(secondary)])).toEqual(['rgb(0, 0, 0)', 'rgb(255, 255, 255)']);
  20  |   await dock.getByRole('button', { name: 'Quick Swatches Flyout', exact: true }).click(); await expect(page.getByRole('region', { name: 'Color quick access flyout', exact: true })).toBeVisible(); await page.keyboard.press('Escape');
  21  |   await dock.screenshot({ path: info.outputPath('compact-color-dock.png') });
  22  | });
  23  | 
  24  | for (const theme of ['atelier', 'cozy-classic']) test(`${theme} controls and canvas keep their geometry when onion help and motion states change`, async ({ page }, info) => {
  25  |   await page.setViewportSize({ width: 1920, height: 1000 }); await page.goto('/studio'); await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  26  |   await page.getByRole('button', { name: 'Studio options', exact: true }).click(); await page.getByTestId(`theme-option-${theme}`).click(); await page.keyboard.press('Escape');
  27  |   for (const width of [1920, 1280, 1024]) {
  28  |     await page.setViewportSize({ width, height: 1000 });
  29  |     const geometry = () => page.evaluate(() => ['main-composite-canvas', 'bottom-timeline'].map(id => { const r = document.querySelector(`[data-testid="${id}"]`)!.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; }));
  30  |     const before = await geometry(), onion = page.getByRole('button', { name: 'Onion Skin', exact: true });
  31  |     await onion.click(); await expect.poll(geometry).toEqual(before); await onion.click(); await expect.poll(geometry).toEqual(before);
  32  |     const row = page.getByTestId('bottom-timeline'); expect(await row.evaluate(element => {
  33  |       const bounds = element.getBoundingClientRect(); return Array.from(element.querySelectorAll('button')).filter(button => button.getClientRects().length && button.getBoundingClientRect().top < bounds.top + 40).every(button => { const box = button.getBoundingClientRect(); return box.left >= bounds.left && box.right <= bounds.right && box.height === 28; });
> 34  |     })).toBe(true);
      |         ^ Error: expect(received).toBe(expected) // Object.is equality
  35  |   }
  36  |   await draw(page, 8, 8); await page.getByTestId('tab-tools').click(); await page.getByTestId('create-motion-part-btn').click();
  37  |   const actions = [page.getByRole('button', { name: 'Undo motion edit', exact: true }), page.getByRole('button', { name: 'Redo motion edit', exact: true }), page.getByRole('button', { name: 'Reset Pose', exact: true })];
  38  |   const boxes = await Promise.all(actions.map(action => action.boundingBox())); expect(boxes.every(box => box && box.height === 28 && Math.abs(box.width - boxes[0]!.width) < 1 && box.y === boxes[0]!.y)).toBe(true);
  39  |   for (const action of actions) expect(await action.evaluate(button => { const label = button.firstElementChild!.getBoundingClientRect(), outer = button.getBoundingClientRect(); return Math.abs((label.top + label.bottom - outer.top - outer.bottom) / 2) < 1 && getComputedStyle(button).fontSize === '12px' && label.height <= outer.height - 2; })).toBe(true);
  40  |   const start = page.getByTestId('pose-btn-start'), end = page.getByTestId('pose-btn-end'); const poseBoxes = await Promise.all([start.boundingBox(), end.boundingBox()]); expect(poseBoxes[0]!.height).toBe(poseBoxes[1]!.height);
  41  |   await start.click(); expect((await start.boundingBox())!.height).toBe(poseBoxes[0]!.height); await end.click();
  42  |   const play = page.getByRole('button', { name: 'Play Loop', exact: true }), playBox = await play.boundingBox(); await play.click(); await expect(page.getByRole('button', { name: 'Pause', exact: true }).first()).toBeVisible();
  43  |   const pause = page.getByTestId('piximotion-panel').getByRole('button', { name: 'Pause', exact: true }); expect((await pause.boundingBox())!.width).toBe(playBox!.width); await pause.click();
  44  |   await page.getByTestId('piximotion-panel').screenshot({ path: info.outputPath(`motion-${theme}-1024.png`) });
  45  | });
  46  | 
  47  | test('merging layered artwork moves every painted layer without leaving an original drawing, and Undo restores the separate layers', async ({ page }) => {
  48  |   await page.setViewportSize({ width: 1600, height: 1000 }); await page.goto('/studio'); await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  49  |   await draw(page, 8, 8); await page.getByTestId('tab-layers').click(); await page.getByRole('button', { name: 'Add New Layer', exact: true }).click(); await draw(page, 12, 8);
  50  |   await page.getByRole('slider', { name: 'Layer opacity', exact: true }).fill('50'); const original = await pixels(page); expect(original.filter((v, i) => i % 4 === 3 && v)).toHaveLength(2);
  51  |   await page.getByTestId('select-box-tool').click(); const box = (await page.getByTestId('main-composite-canvas').boundingBox())!;
  52  |   await page.mouse.move(box.x + box.width * 7 / 32, box.y + box.height * 7 / 32); await page.mouse.down(); await page.mouse.move(box.x + box.width * 10 / 32, box.y + box.height * 10 / 32); await page.mouse.up();
  53  |   await page.getByTestId('tab-tools').click(); await page.getByTestId('create-visible-motion-btn').click();
  54  |   await numeric(page, 'Position X pixels', '2'); await numeric(page, 'Motion frames', '3');
  55  |   const expected = new Array<number>(original.length).fill(0); for (let y = 0; y < 32; y++) for (let x = 0; x + 2 < 32; x++) for (let c = 0; c < 4; c++) expected[(y * 32 + x + 2) * 4 + c] = original[(y * 32 + x) * 4 + c];
  56  |   await expect.poll(() => pixels(page, 'piximotion-preview-canvas')).toEqual(expected);
  57  |   await page.getByTestId('pose-btn-start').click(); await numeric(page, 'Position X pixels', '1'); await page.getByRole('button', { name: 'BAKE TO TIMELINE', exact: true }).click(); await expect(page.getByTestId('piximotion-panel')).toBeHidden();
  58  |   await expect.poll(() => pixels(page)).toEqual(expected); await page.getByRole('button', { name: /Select frame 1\./ }).click();
  59  |   const first = new Array<number>(original.length).fill(0); for (let y = 0; y < 32; y++) for (let x = 0; x + 1 < 32; x++) for (let c = 0; c < 4; c++) first[(y * 32 + x + 1) * 4 + c] = original[(y * 32 + x) * 4 + c];
  60  |   await expect.poll(() => pixels(page)).toEqual(first); expect(first).not.toEqual(original);
  61  |   await page.getByTestId('undo-button').click(); await expect(page.getByRole('button', { name: /^Select frame \d+\./ })).toHaveCount(1); await expect.poll(() => pixels(page)).toEqual(original);
  62  |   await page.getByTestId('undo-button').click(); await page.getByTestId('tab-layers').click(); await expect(page.getByTestId('layers-stack-count')).toHaveText('(2)'); await expect.poll(() => pixels(page)).toEqual(original);
  63  |   await page.getByTestId('redo-button').click(); await expect(page.getByTestId('layers-stack-count')).toHaveText('(1)'); await page.getByTestId('redo-button').click(); await page.getByRole('button', { name: /Select frame 3\./ }).click(); await expect.poll(() => pixels(page)).toEqual(expected);
  64  | });
  65  | 
  66  | test('motion preview suppresses neighboring ghosts and reports painted pixels cropped outside the canvas', async ({ page }) => {
  67  |   await page.setViewportSize({ width: 1600, height: 1000 }); await page.goto('/studio'); await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible(); await draw(page, 8, 8);
  68  |   await page.locator('summary').filter({ hasText: 'Frame actions' }).click(); await page.getByRole('button', { name: 'Duplicate frame', exact: true }).click();
  69  |   await page.getByRole('button', { name: 'Onion Skin', exact: true }).click(); await expect.poll(async () => (await pixels(page, 'onion-skin-canvas')).some((v, i) => i % 4 === 3 && v > 0)).toBe(true);
  70  |   await page.getByTestId('tab-tools').click(); await page.getByTestId('create-motion-part-btn').click(); await numeric(page, 'Position X pixels', '50');
  71  |   await expect(page.getByTestId('motion-clipping-notice')).toContainText('1 painted pixel leaves the canvas'); await expect.poll(() => pixels(page, 'onion-skin-canvas')).toEqual(new Array(32 * 32 * 4).fill(0));
  72  |   await numeric(page, 'Position X pixels', '2'); await expect(page.getByTestId('piximotion-preview-canvas')).toHaveAttribute('data-clipped-pixels', '0');
  73  |   const preview = await pixels(page, 'piximotion-preview-canvas'); expect(preview[(8 * 32 + 8) * 4 + 3]).toBe(0); expect(preview[(8 * 32 + 10) * 4 + 3]).toBe(255);
  74  |   await page.getByRole('button', { name: 'Cancel (Escape)', exact: true }).click(); await expect.poll(async () => (await pixels(page, 'onion-skin-canvas')).some((v, i) => i % 4 === 3 && v > 0)).toBe(true);
  75  | });
  76  | test('motion preview advances when worker results take longer than a cel duration', async ({ page }) => {
  77  |   await page.addInitScript(() => {
  78  |     const NativeWorker = window.Worker;
  79  |     window.Worker = new Proxy(NativeWorker, { construct(Target, args) {
  80  |       const worker = Reflect.construct(Target, args) as Worker;
  81  |       return new Proxy(worker, { get(target, key) { const value = Reflect.get(target, key, target); return typeof value === 'function' ? value.bind(target) : value; },
  82  |         set(target, key, value) { return Reflect.set(target, key, key === 'onmessage' && typeof value === 'function' ? (event: MessageEvent) => {
  83  |           if (typeof event.data?.result?.destX === 'number') setTimeout(() => value.call(target, event), 400); else value.call(target, event);
  84  |         } : value, target); } });
  85  |     } });
  86  |   });
  87  |   await page.setViewportSize({ width: 1600, height: 1000 });
  88  |   await page.goto('/studio?template=hearth-ghost');
  89  |   await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  90  |   await page.getByTestId('tab-tools').click(); await page.getByTestId('create-motion-part-btn').click();
  91  |   const end = page.getByRole('spinbutton', { name: 'Position X pixels', exact: true }); await end.fill('4'); await end.press('Enter');
  92  |   const preview = page.getByTestId('piximotion-preview-canvas'); await expect(preview).toHaveAttribute('aria-busy', 'false');
  93  |   const signature = () => preview.evaluate((c: HTMLCanvasElement) => Array.from(c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data).join(','));
  94  |   const first = await signature(); await page.getByRole('button', { name: 'Play Loop', exact: true }).click();
  95  |   await expect.poll(signature, { timeout: 4000 }).not.toBe(first);
  96  |   await page.getByTestId('piximotion-panel').getByRole('button', { name: 'Pause', exact: true }).click(); await expect(preview).toHaveAttribute('aria-busy', 'false');
  97  |   const paused = await signature(); await page.getByRole('button', { name: 'Play Loop', exact: true }).click(); await expect.poll(signature, { timeout: 4000 }).not.toBe(paused);
  98  |   await page.getByRole('button', { name: 'Cancel (Escape)', exact: true }).click(); await expect(preview).toHaveCount(0);
  99  | });
  100 | 
```