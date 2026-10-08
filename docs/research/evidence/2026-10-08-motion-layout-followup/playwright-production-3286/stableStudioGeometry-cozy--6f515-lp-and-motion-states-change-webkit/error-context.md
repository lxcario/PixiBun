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
  - link "Skip to content" [ref=e2]:
    - /url: "#main-workspace"
  - complementary "Application update notification" [ref=e3]:
    - generic [ref=e4]: Update ready · A fresh atelier build is ready. Close all PixiBun tabs when done to apply.
    - generic [ref=e6]:
      - button "Update instructions" [ref=e7] [cursor=pointer]
      - button "Dismiss update banner" [ref=e8] [cursor=pointer]: ✕
  - generic [ref=e10]:
    - banner [ref=e12]:
      - group "Project controls" [ref=e13]:
        - link "PixiBun Home" [ref=e14]:
          - /url: /
          - generic [ref=e15]:
            - img "Bun, the PixiBun bunny" [ref=e17]
            - generic [ref=e181]:
              - generic [ref=e182]: PIXIBUN
              - generic [ref=e183]: ATELIER
        - button "File" [ref=e184]:
          - text: File
          - generic [ref=e185]: ▼
        - button "Rename project Untitled Sprite" [ref=e186] [cursor=pointer]: Untitled Sprite
        - generic "Canvas size · change it in File" [ref=e187]: 32×32
        - button "Saving locally" [ref=e188]:
          - generic [ref=e189]: Save
        - generic [ref=e191]:
          - generic [ref=e192]:
            - button "Undo last action" [disabled]
          - generic [ref=e193]:
            - button "Redo last action" [disabled]
      - group "Drawing controls" [ref=e194]:
        - generic "Tool options rail" [ref=e195]:
          - generic [ref=e196]: "Pen:"
          - generic [ref=e197]:
            - button "Brush size 1 pixels" [ref=e198]:
              - generic [ref=e199]: Size
              - generic [ref=e200]: 1 px
              - generic [ref=e201]: ▾
            - generic "Quick brush size presets" [ref=e202]:
              - button "1px brush preset" [pressed] [ref=e203]: "1"
              - button "2px brush preset" [ref=e204]: "2"
              - button "3px brush preset" [ref=e205]: "3"
              - button "4px brush preset" [ref=e206]: "4"
            - button "Disable clean corners" [pressed] [ref=e207]:
              - generic [ref=e208]: Pixel-Perfect
      - generic [ref=e209]:
        - group "Canvas controls" [ref=e210]:
          - group "Mirror drawing" [ref=e211]:
            - generic [ref=e212]: Mirror
            - button "Horizontal symmetry" [ref=e214] [cursor=pointer]
            - button "Vertical symmetry" [ref=e216] [cursor=pointer]
          - generic [ref=e218]:
            - generic [ref=e219]:
              - button "Zoom Out" [ref=e220] [cursor=pointer]: −
              - button "Zoom 1600 percent. Choose zoom level" [ref=e222]: 1600%
              - button "Zoom In" [ref=e223] [cursor=pointer]: +
            - button "Fit Canvas to Viewport (Ctrl+0)" [ref=e225] [cursor=pointer]: Fit
          - button "View options menu" [ref=e229] [cursor=pointer]:
            - generic [ref=e230]:
              - generic [ref=e231]: View
              - generic "1 active view options" [ref=e232]
            - generic [ref=e233]: ▼
        - group "Workspace presets" [ref=e234]:
          - combobox "Workspace layout" [ref=e235] [cursor=pointer]:
            - option "Drawing" [selected]
            - option "Animation"
            - option "Lighting"
        - group "Studio settings and help" [ref=e236]:
          - button "Studio options" [ref=e237] [cursor=pointer]:
            - generic [ref=e238]: Studio
            - generic [ref=e239]: ▼
        - button "Export drawing" [ref=e241]:
          - generic [ref=e242]: Export
    - status [ref=e244]: Saving locally…
    - generic [ref=e245]:
      - complementary [ref=e247]:
        - generic [ref=e249]:
          - group "Drawing" [ref=e250]:
            - button "Pen" [pressed] [ref=e252] [cursor=pointer]
            - button "Bézier Curve" [ref=e254] [cursor=pointer]
            - button "Eraser" [ref=e256] [cursor=pointer]
            - button "Flood Fill" [ref=e258] [cursor=pointer]
            - button "Pixel Gradient" [ref=e260] [cursor=pointer]
            - button "Dither Brush" [ref=e262] [cursor=pointer]
            - button "Color Replace" [ref=e264] [cursor=pointer]
            - button "Erase Sampled Color" [ref=e266] [cursor=pointer]
          - group "Selection" [ref=e267]:
            - button "Marquee Box" [ref=e270] [cursor=pointer]
            - button "Lasso Select" [ref=e272] [cursor=pointer]
            - button "Magic Wand" [ref=e274] [cursor=pointer]
          - group "Geometry" [ref=e275]:
            - button "Line" [ref=e278] [cursor=pointer]
            - button "2:1 Iso Line" [ref=e280] [cursor=pointer]
            - button "Rectangle" [ref=e282] [cursor=pointer]
            - button "Ellipse" [ref=e284] [cursor=pointer]
          - group "2.5D Sculpt" [ref=e285]:
            - button "Normal Chisel" [ref=e288] [cursor=pointer]
          - group "Utility" [ref=e289]:
            - button "Eyedropper" [ref=e292] [cursor=pointer]
        - generic [ref=e293]:
          - generic [ref=e294]:
            - button "Swap colors (X)" [ref=e295] [cursor=pointer]: ⇄
            - button "Reset default black and white colors (Shift+D)" [ref=e296] [cursor=pointer]
            - 'button "Secondary color #C792DF. Click for quick swatches, double click for picker, right click to swap" [ref=e297] [cursor=pointer]'
            - 'button "Primary color #3A2E4C. Click for quick swatches, double click for picker, right click to swap" [ref=e298] [cursor=pointer]'
          - generic [ref=e299]:
            - generic [ref=e300]:
              - 'button "Quick color #DDDFDF" [ref=e301] [cursor=pointer]'
              - 'button "Quick color #DDDDDF" [ref=e302] [cursor=pointer]'
              - 'button "Quick color #D0C4DF" [ref=e303] [cursor=pointer]'
              - 'button "Quick color #DCABDF" [ref=e304] [cursor=pointer]'
            - button "Quick Swatches Flyout" [ref=e305] [cursor=pointer]
      - main "Pixel art canvas workspace" [ref=e309]:
        - application "Pixel art drawing canvas. Use mouse or stylus to paint, arrow keys to pan viewport or nudge selection, and Alt+drag to pan." [ref=e310]
      - complementary [ref=e313]:
        - generic [ref=e314]:
          - button "Tools" [ref=e315]
          - button "Layers" [pressed] [ref=e317]
          - button "Palette" [ref=e319]
          - button "PixiTools" [ref=e321]:
            - generic [ref=e322]: FX
        - generic [ref=e324]:
          - generic [ref=e325]:
            - generic "Each frame has its own layer pixels. A new blank frame keeps the layer names and settings." [ref=e326]:
              - text: Frame 1 · Layers
              - generic [ref=e327]: (1)
            - generic [ref=e328]:
              - button "Add New Layer" [ref=e329]
              - button "Duplicate Layer" [ref=e331]
              - button "Merge Down" [disabled] [ref=e333]
              - button "Delete Layer" [disabled] [ref=e335]
          - generic [ref=e337]:
            - generic [ref=e338]:
              - generic [ref=e339]: Opacity
              - slider "Layer opacity" [ref=e340] [cursor=pointer]: "100"
              - generic [ref=e341]: 100%
            - generic [ref=e342]:
              - generic [ref=e343]: Blend
              - combobox "Layer blend mode" [ref=e344] [cursor=pointer]:
                - option "Normal" [selected]
                - option "Multiply"
                - option "Screen"
                - option "Overlay"
                - option "Color Dodge"
                - option "On artwork only"
          - generic [ref=e346]:
            - generic [ref=e347]:
              - button "Reorder layer Base Layer" [disabled] [ref=e348]:
                - generic [ref=e349]: ⠿
              - generic [ref=e350]:
                - button "Select layer Base Layer. Double click to rename" [ref=e351] [cursor=pointer]: Base Layer
                - button "Rename layer Base Layer" [ref=e352] [cursor=pointer]
            - generic [ref=e353]:
              - button "Lock layer Base Layer" [ref=e354]
              - button "Hide layer Base Layer" [ref=e355]
    - contentinfo [ref=e357]:
      - generic [ref=e358]:
        - generic [ref=e359]:
          - generic [ref=e360]:
            - button "Play" [ref=e361]
            - button "Previous Frame (,)" [ref=e364]
            - button "Next Frame (.)" [ref=e366]
            - button "Repeat" [ref=e368]
          - generic [ref=e372]:
            - button "Preview speed" [ref=e374]:
              - generic [ref=e375]: Preview
              - generic [ref=e376]: 1×
              - generic [ref=e377]: ▾
            - generic [ref=e378]:
              - generic [ref=e379]: Frame time
              - spinbutton "Active frame duration in milliseconds" [ref=e380]: "100"
              - generic [ref=e381]: ms
            - button "Onion Skin" [active] [ref=e382]
            - button "Onion skin settings" [ref=e385]: ⚙
        - generic [ref=e387]:
          - button "+ Frame" [ref=e388]:
            - generic [ref=e389]: Frame
          - group [ref=e391]:
            - generic "Frame actions" [ref=e392] [cursor=pointer]:
              - text: Frame actions
              - generic [ref=e393]: ▾
          - button "Collapse Timeline" [ref=e395]:
            - generic [ref=e396]:
              - generic [ref=e397]: ▼
              - generic [ref=e398]: Collapse
      - generic [ref=e399]:
        - 'button "Select frame 1. Duration: 100ms. Drag to reorder." [ref=e401]':
          - generic:
            - generic: "#1"
            - generic: 100ms
        - button "Clips" [ref=e402]
    - generic [ref=e404]:
      - generic [ref=e405]: "X: — Y: —"
      - generic [ref=e408]: 32×32
      - generic [ref=e411]: 1600%
      - generic [ref=e413]: Frame 1/1
      - generic [ref=e415]: Base Layer
      - generic [ref=e416]: pen
      - status "Saving changes to local storage…" [ref=e421]:
        - generic [ref=e423]: Saving…
  - alert [ref=e424]
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
  44  |   await page.screenshot({ path: info.outputPath(`motion-${theme}-1024-bottom.png`) });
  45  |   await page.getByTestId('right-inspector').locator('.overflow-y-auto').evaluate(element => { element.scrollTop = 0; });
  46  |   await page.screenshot({ path: info.outputPath(`motion-${theme}-1024-top.png`) });
  47  | });
  48  | 
  49  | test('merging layered artwork moves every painted layer without leaving an original drawing, and Undo restores the separate layers', async ({ page }) => {
  50  |   await page.setViewportSize({ width: 1600, height: 1000 }); await page.goto('/studio'); await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  51  |   await draw(page, 8, 8); await page.getByTestId('tab-layers').click(); await page.getByRole('button', { name: 'Add New Layer', exact: true }).click(); await draw(page, 12, 8);
  52  |   await page.getByRole('slider', { name: 'Layer opacity', exact: true }).fill('50'); const original = await pixels(page); expect(original.filter((v, i) => i % 4 === 3 && v)).toHaveLength(2);
  53  |   await page.getByTestId('select-box-tool').click(); const box = (await page.getByTestId('main-composite-canvas').boundingBox())!;
  54  |   await page.mouse.move(box.x + box.width * 7 / 32, box.y + box.height * 7 / 32); await page.mouse.down(); await page.mouse.move(box.x + box.width * 10 / 32, box.y + box.height * 10 / 32); await page.mouse.up();
  55  |   await page.getByTestId('tab-tools').click(); await page.getByTestId('create-visible-motion-btn').click();
  56  |   await numeric(page, 'Position X pixels', '2'); await numeric(page, 'Motion frames', '3');
  57  |   const expected = new Array<number>(original.length).fill(0); for (let y = 0; y < 32; y++) for (let x = 0; x + 2 < 32; x++) for (let c = 0; c < 4; c++) expected[(y * 32 + x + 2) * 4 + c] = original[(y * 32 + x) * 4 + c];
  58  |   await expect.poll(() => pixels(page, 'piximotion-preview-canvas')).toEqual(expected);
  59  |   await page.getByTestId('pose-btn-start').click(); await numeric(page, 'Position X pixels', '1'); await page.getByRole('button', { name: 'BAKE TO TIMELINE', exact: true }).click(); await expect(page.getByTestId('piximotion-panel')).toBeHidden();
  60  |   await expect.poll(() => pixels(page)).toEqual(expected); await page.getByRole('button', { name: /Select frame 1\./ }).click();
  61  |   const first = new Array<number>(original.length).fill(0); for (let y = 0; y < 32; y++) for (let x = 0; x + 1 < 32; x++) for (let c = 0; c < 4; c++) first[(y * 32 + x + 1) * 4 + c] = original[(y * 32 + x) * 4 + c];
  62  |   await expect.poll(() => pixels(page)).toEqual(first); expect(first).not.toEqual(original);
  63  |   await page.getByTestId('undo-button').click(); await expect(page.getByRole('button', { name: /^Select frame \d+\./ })).toHaveCount(1); await expect.poll(() => pixels(page)).toEqual(original);
  64  |   await page.getByTestId('undo-button').click(); await page.getByTestId('tab-layers').click(); await expect(page.getByTestId('layers-stack-count')).toHaveText('(2)'); await expect.poll(() => pixels(page)).toEqual(original);
  65  |   await page.getByTestId('redo-button').click(); await expect(page.getByTestId('layers-stack-count')).toHaveText('(1)'); await page.getByTestId('redo-button').click(); await page.getByRole('button', { name: /Select frame 3\./ }).click(); await expect.poll(() => pixels(page)).toEqual(expected);
  66  | });
  67  | 
  68  | test('motion preview suppresses neighboring ghosts and reports painted pixels cropped outside the canvas', async ({ page }) => {
  69  |   await page.setViewportSize({ width: 1600, height: 1000 }); await page.goto('/studio'); await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible(); await draw(page, 8, 8);
  70  |   await page.locator('summary').filter({ hasText: 'Frame actions' }).click(); await page.getByRole('button', { name: 'Duplicate frame', exact: true }).click();
  71  |   await page.getByRole('button', { name: 'Onion Skin', exact: true }).click(); await expect.poll(async () => (await pixels(page, 'onion-skin-canvas')).some((v, i) => i % 4 === 3 && v > 0)).toBe(true);
  72  |   await page.getByTestId('tab-tools').click(); await page.getByTestId('create-motion-part-btn').click(); await numeric(page, 'Position X pixels', '50');
  73  |   await expect(page.getByTestId('motion-clipping-notice')).toContainText('1 painted pixel leaves the canvas'); await expect.poll(() => pixels(page, 'onion-skin-canvas')).toEqual(new Array(32 * 32 * 4).fill(0));
  74  |   await numeric(page, 'Position X pixels', '2'); await expect(page.getByTestId('piximotion-preview-canvas')).toHaveAttribute('data-clipped-pixels', '0');
  75  |   const preview = await pixels(page, 'piximotion-preview-canvas'); expect(preview[(8 * 32 + 8) * 4 + 3]).toBe(0); expect(preview[(8 * 32 + 10) * 4 + 3]).toBe(255);
  76  |   await page.getByRole('button', { name: 'Cancel (Escape)', exact: true }).click(); await expect.poll(async () => (await pixels(page, 'onion-skin-canvas')).some((v, i) => i % 4 === 3 && v > 0)).toBe(true);
  77  | });
  78  | test('motion preview advances when worker results take longer than a cel duration', async ({ page }) => {
  79  |   await page.addInitScript(() => {
  80  |     const NativeWorker = window.Worker;
  81  |     window.Worker = new Proxy(NativeWorker, { construct(Target, args) {
  82  |       const worker = Reflect.construct(Target, args) as Worker;
  83  |       return new Proxy(worker, { get(target, key) { const value = Reflect.get(target, key, target); return typeof value === 'function' ? value.bind(target) : value; },
  84  |         set(target, key, value) { return Reflect.set(target, key, key === 'onmessage' && typeof value === 'function' ? (event: MessageEvent) => {
  85  |           if (typeof event.data?.result?.destX === 'number') setTimeout(() => value.call(target, event), 400); else value.call(target, event);
  86  |         } : value, target); } });
  87  |     } });
  88  |   });
  89  |   await page.setViewportSize({ width: 1600, height: 1000 });
  90  |   await page.goto('/studio?template=hearth-ghost');
  91  |   await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  92  |   await page.getByTestId('tab-tools').click(); await page.getByTestId('create-motion-part-btn').click();
  93  |   const end = page.getByRole('spinbutton', { name: 'Position X pixels', exact: true }); await end.fill('4'); await end.press('Enter');
  94  |   const preview = page.getByTestId('piximotion-preview-canvas'); await expect(preview).toHaveAttribute('aria-busy', 'false');
  95  |   const signature = () => preview.evaluate((c: HTMLCanvasElement) => Array.from(c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data).join(','));
  96  |   const first = await signature(); await page.getByRole('button', { name: 'Play Loop', exact: true }).click();
  97  |   await expect.poll(signature, { timeout: 4000 }).not.toBe(first);
  98  |   await page.getByTestId('piximotion-panel').getByRole('button', { name: 'Pause', exact: true }).click(); await expect(preview).toHaveAttribute('aria-busy', 'false');
  99  |   const paused = await signature(); await page.getByRole('button', { name: 'Play Loop', exact: true }).click(); await expect.poll(signature, { timeout: 4000 }).not.toBe(paused);
  100 |   await page.getByRole('button', { name: 'Cancel (Escape)', exact: true }).click(); await expect(preview).toHaveCount(0);
  101 | });
  102 | 
```