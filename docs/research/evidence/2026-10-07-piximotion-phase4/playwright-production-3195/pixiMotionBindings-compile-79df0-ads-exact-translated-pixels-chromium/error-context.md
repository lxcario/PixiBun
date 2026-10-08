# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: pixiMotionBindings.spec.ts >> compiled stale source refuses bake; fresh capture previews, bakes, undoes, redoes and reloads exact translated pixels
- Location: tests\production\pixiMotionBindings.spec.ts:40:5

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: locator.click: Test timeout of 60000ms exceeded.
Call log:
  - waiting for getByTestId('create-motion-part-btn')

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
      - group "Drawing controls"
      - generic [ref=e189]:
        - group "Canvas controls" [ref=e190]:
          - group "Mirror drawing" [ref=e191]:
            - generic [ref=e192]: Mirror
            - button "Horizontal symmetry" [ref=e194] [cursor=pointer]
            - button "Vertical symmetry" [ref=e196] [cursor=pointer]
          - generic [ref=e198]:
            - generic [ref=e199]:
              - button "Zoom Out" [ref=e200] [cursor=pointer]: −
              - button "Zoom 1600 percent. Choose zoom level" [ref=e202]: 1600%
              - button "Zoom In" [ref=e203] [cursor=pointer]: +
            - button "Fit Canvas to Viewport (Ctrl+0)" [ref=e205] [cursor=pointer]: Fit
          - button "View options menu" [ref=e209] [cursor=pointer]:
            - generic [ref=e210]:
              - generic [ref=e211]: View
              - generic "1 active view options" [ref=e212]
            - generic [ref=e213]: ▼
        - group "Workspace presets" [ref=e214]:
          - combobox "Workspace layout" [ref=e215] [cursor=pointer]:
            - option "Drawing" [selected]
            - option "Animation"
            - option "Lighting"
        - group "Studio settings and help" [ref=e216]:
          - button "Studio options" [ref=e217] [cursor=pointer]:
            - generic [ref=e218]: Studio
            - generic [ref=e219]: ▼
        - button "Export drawing" [ref=e221]:
          - generic [ref=e222]: Export
    - status [ref=e224]: Changes saved
    - generic [ref=e225]:
      - complementary [ref=e227]:
        - generic [ref=e229]:
          - group "Drawing" [ref=e230]:
            - button "Pen" [ref=e232] [cursor=pointer]
            - button "Bézier Curve" [ref=e234] [cursor=pointer]
            - button "Eraser" [ref=e236] [cursor=pointer]
            - button "Flood Fill" [ref=e238] [cursor=pointer]
            - button "Pixel Gradient" [ref=e240] [cursor=pointer]
            - button "Dither Brush" [ref=e242] [cursor=pointer]
            - button "Color Replace" [ref=e244] [cursor=pointer]
            - button "Erase Sampled Color" [ref=e246] [cursor=pointer]
          - group "Selection" [ref=e247]:
            - button "Marquee Box" [pressed] [ref=e250] [cursor=pointer]
            - button "Lasso Select" [ref=e252] [cursor=pointer]
            - button "Magic Wand" [ref=e254] [cursor=pointer]
          - group "Geometry" [ref=e255]:
            - button "Line" [ref=e258] [cursor=pointer]
            - button "2:1 Iso Line" [ref=e260] [cursor=pointer]
            - button "Rectangle" [ref=e262] [cursor=pointer]
            - button "Ellipse" [ref=e264] [cursor=pointer]
          - group "2.5D Sculpt" [ref=e265]:
            - button "Normal Chisel" [ref=e268] [cursor=pointer]
          - group "Utility" [ref=e269]:
            - button "Eyedropper" [ref=e272] [cursor=pointer]
        - generic [ref=e273]:
          - generic [ref=e274]:
            - button "Swap colors (X)" [ref=e275] [cursor=pointer]: ⇄
            - button "Reset default black and white colors (Shift+D)" [ref=e276] [cursor=pointer]
            - 'button "Secondary color #C792DF. Click for quick swatches, double click for picker, right click to swap" [ref=e277] [cursor=pointer]'
            - 'button "Primary color #3A2E4C. Click for quick swatches, double click for picker, right click to swap" [ref=e278] [cursor=pointer]'
          - generic [ref=e279]:
            - generic [ref=e280]:
              - 'button "#DDDFDF (Click: Primary | Right-click: Secondary)" [ref=e281] [cursor=pointer]'
              - 'button "#DDDDDF (Click: Primary | Right-click: Secondary)" [ref=e282] [cursor=pointer]'
              - 'button "#D0C4DF (Click: Primary | Right-click: Secondary)" [ref=e283] [cursor=pointer]'
              - 'button "#DCABDF (Click: Primary | Right-click: Secondary)" [ref=e284] [cursor=pointer]'
            - button "Quick Swatches Flyout" [ref=e285] [cursor=pointer]
      - main "Pixel art canvas workspace" [ref=e289]:
        - application "Pixel art drawing canvas. Use mouse or stylus to paint, arrow keys to pan viewport or nudge selection, and Alt+drag to pan." [active] [ref=e290]:
          - generic [ref=e292]:
            - generic "Drag to move selection (Shift to lock axis)" [ref=e293]
            - generic "Drag to rotate selection (Shift to snap 15°)" [ref=e294]: ↻
            - generic "Drag to rotate selection (Shift to snap 15°)" [ref=e295]: ↻
            - generic "Drag to rotate selection (Shift to snap 15°)" [ref=e296]: ↻
            - generic "Drag to rotate selection (Shift to snap 15°)" [ref=e297]: ↻
            - generic "Center Pivot Anchor (drag to shift rotation center)" [ref=e314]
            - generic [ref=e320]:
              - button "↔" [ref=e321] [cursor=pointer]
              - button "↕" [ref=e322] [cursor=pointer]
              - button "↺" [ref=e324] [cursor=pointer]
              - button "↻" [ref=e325] [cursor=pointer]
              - button "✓" [ref=e327] [cursor=pointer]
              - button "✕" [ref=e328] [cursor=pointer]
      - complementary [ref=e330]:
        - generic [ref=e331]:
          - button "Tools" [ref=e332]
          - button "Layers" [pressed] [ref=e334]
          - button "Palette" [ref=e336]
          - button "PixiTools" [ref=e338]:
            - generic [ref=e339]: FX
        - generic [ref=e341]:
          - generic [ref=e342]:
            - generic "Each frame has its own layer pixels. A new blank frame keeps the layer names and settings." [ref=e343]:
              - text: Frame 1 · Layers
              - generic [ref=e344]: (1)
            - generic [ref=e345]:
              - button "Add New Layer" [ref=e346]
              - button "Duplicate Layer" [ref=e348]
              - button "Merge Down" [disabled] [ref=e350]
              - button "Delete Layer" [disabled] [ref=e352]
          - generic [ref=e354]:
            - generic [ref=e355]:
              - generic [ref=e356]: Opacity
              - slider "Layer opacity" [ref=e357] [cursor=pointer]: "100"
              - generic [ref=e358]: 100%
            - generic [ref=e359]:
              - generic [ref=e360]: Blend
              - combobox "Layer blend mode" [ref=e361] [cursor=pointer]:
                - option "Normal" [selected]
                - option "Multiply"
                - option "Screen"
                - option "Overlay"
                - option "Color Dodge"
                - option "On artwork only"
          - generic [ref=e363]:
            - generic [ref=e364]:
              - button "Reorder layer Base Layer" [disabled] [ref=e365]:
                - generic [ref=e366]: ⠿
              - generic [ref=e367]:
                - button "Select layer Base Layer. Double click to rename" [ref=e368] [cursor=pointer]: Base Layer
                - button "Rename layer Base Layer" [ref=e369] [cursor=pointer]
            - generic [ref=e370]:
              - button "Lock layer Base Layer" [ref=e371]
              - button "Hide layer Base Layer" [ref=e372]
    - contentinfo [ref=e374]:
      - generic [ref=e375]:
        - generic [ref=e376]:
          - generic [ref=e377]:
            - button "Play" [ref=e378]
            - button "Previous Frame (,)" [ref=e381]
            - button "Next Frame (.)" [ref=e383]
            - button "Repeat" [ref=e385]
          - generic [ref=e389]:
            - button "Preview speed" [ref=e391]:
              - generic [ref=e392]: Preview
              - generic [ref=e393]: 1×
              - generic [ref=e394]: ▾
            - generic [ref=e395]:
              - generic [ref=e396]: Frame time
              - spinbutton "Active frame duration in milliseconds" [ref=e397]: "100"
              - generic [ref=e398]: ms
            - button "Onion Skin" [ref=e399]
            - button "Onion skin settings" [ref=e402]: ⚙
        - generic [ref=e403]:
          - button "+ Frame" [ref=e404]:
            - generic [ref=e405]: Frame
          - group [ref=e407]:
            - generic "Frame actions" [ref=e408] [cursor=pointer]:
              - text: Frame actions
              - generic [ref=e409]: ▾
          - button "Collapse Timeline" [ref=e411]:
            - generic [ref=e412]:
              - generic [ref=e413]: ▼
              - generic [ref=e414]: Collapse
      - generic [ref=e415]:
        - 'button "Select frame 1. Duration: 100ms. Drag to reorder." [ref=e417]':
          - generic:
            - generic: "#1"
            - generic: 100ms
        - button "Clips" [ref=e418]
    - generic [ref=e420]:
      - generic [ref=e421]: "X: 25 Y: 25"
      - generic [ref=e424]: 32×32
      - generic [ref=e427]: 1600%
      - generic [ref=e429]: Frame 1/1
      - generic [ref=e431]: Base Layer
      - generic [ref=e432]: "Sel: 20×20"
      - generic [ref=e434]: select-box
      - status "All changes saved to local storage" [ref=e439]:
        - generic [ref=e441]: Saved
  - alert [ref=e442]
```

# Test source

```ts
  1  | import { expect, test, type Page } from '@playwright/test';
  2  | 
  3  | const pixels = (page: Page, testId = 'main-composite-canvas') => page.getByTestId(testId).evaluate((canvas: HTMLCanvasElement) =>
  4  |   Array.from(canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data));
  5  | 
  6  | function translated(source: number[], dx: number) {
  7  |   const result = new Array<number>(source.length).fill(0);
  8  |   for (let y = 0; y < 32; y++) for (let x = 0; x + dx < 32; x++) {
  9  |     const src = (y * 32 + x) * 4, dst = (y * 32 + x + dx) * 4;
  10 |     for (let c = 0; c < 4; c++) result[dst + c] = source[src + c];
  11 |   }
  12 |   return result;
  13 | }
  14 | 
  15 | async function readyWithMark(page: Page) {
  16 |   await page.setViewportSize({ width: 1600, height: 1000 });
  17 |   await page.goto('/studio'); await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  18 |   const canvas = page.getByTestId('main-composite-canvas'); const box = (await canvas.boundingBox())!;
  19 |   await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.4); await page.mouse.down();
  20 |   await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.4, { steps: 4 }); await page.mouse.up();
  21 |   await expect.poll(async () => (await pixels(page)).some((v, i) => i % 4 === 3 && v > 0)).toBe(true);
  22 |   return pixels(page);
  23 | }
  24 | async function capture(page: Page) {
  25 |   const box = (await page.getByTestId('main-composite-canvas').boundingBox())!;
  26 |   await page.getByTestId('select-box-tool').click();
  27 |   await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.2); await page.mouse.down();
  28 |   await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.8, { steps: 4 }); await page.mouse.up();
> 29 |   await page.getByTestId('create-motion-part-btn').click(); await expect(page.getByTestId('piximotion-panel')).toBeVisible();
     |                                                    ^ Error: locator.click: Test timeout of 60000ms exceeded.
  30 | }
  31 | async function setArc(page: Page) {
  32 |   const translation = page.getByRole('slider', { name: 'Pose translation X', exact: true }); await translation.focus();
  33 |   for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowRight'); await expect(translation).toHaveValue('4');
  34 |   const count = page.getByRole('slider', { name: 'Motion frame count', exact: true }); await count.focus();
  35 |   await page.keyboard.press('Home'); await page.keyboard.press('ArrowRight'); await expect(count).toHaveValue('3');
  36 |   await page.getByRole('combobox', { name: 'Motion easing', exact: true }).selectOption('linear');
  37 | }
  38 | const frame = (page: Page, n: number) => page.getByRole('button', { name: new RegExp(`Select frame ${n}\\.`) });
  39 | 
  40 | test('compiled stale source refuses bake; fresh capture previews, bakes, undoes, redoes and reloads exact translated pixels', async ({ page }) => {
  41 |   const original = await readyWithMark(page); await capture(page);
  42 |   await page.getByTestId('undo-button').click();
  43 |   await expect(page.getByTestId('piximotion-panel').getByRole('status')).toHaveText(/source artwork changed/);
  44 |   await expect(page.getByRole('button', { name: 'BAKE TO TIMELINE', exact: true })).toBeDisabled();
  45 |   await expect.poll(async () => (await pixels(page)).every(v => v === 0)).toBe(true);
  46 |   await expect(page.getByTestId('main-composite-canvas')).toHaveCSS('opacity', '1');
  47 |   await page.getByTestId('piximotion-panel').getByRole('button', { name: 'Cancel (Escape)', exact: true }).click();
  48 |   await page.getByTestId('redo-button').click(); await expect.poll(() => pixels(page)).toEqual(original);
  49 |   await capture(page); await setArc(page);
  50 |   await expect(page.getByTestId('main-composite-canvas')).toHaveCSS('opacity', '0');
  51 |   await expect.poll(() => pixels(page, 'piximotion-preview-canvas')).toEqual(translated(original, 4));
  52 |   await page.getByRole('button', { name: 'BAKE TO TIMELINE', exact: true }).click();
  53 |   await expect(page.getByTestId('piximotion-panel')).toBeHidden(); await expect(frame(page, 3)).toBeVisible();
  54 |   await expect(frame(page, 4)).toHaveCount(0); await expect.poll(() => pixels(page)).toEqual(translated(original, 4));
  55 |   await frame(page, 2).click(); await expect.poll(() => pixels(page)).toEqual(translated(original, 2));
  56 |   await frame(page, 1).click(); await expect.poll(() => pixels(page)).toEqual(original);
  57 |   await page.getByTestId('undo-button').click(); await expect(frame(page, 2)).toHaveCount(0);
  58 |   await expect.poll(() => pixels(page)).toEqual(original);
  59 |   await page.getByTestId('redo-button').click(); await expect(frame(page, 3)).toBeVisible();
  60 |   await expect.poll(() => pixels(page)).toEqual(translated(original, 4));
  61 |   await page.getByTestId('save-button').click();
  62 |   await expect(page.getByRole('status').filter({ hasText: /^Changes saved$/ })).toBeVisible();
  63 |   await page.reload(); await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  64 |   await expect(frame(page, 3)).toBeVisible(); await frame(page, 3).click();
  65 |   await expect.poll(() => pixels(page)).toEqual(translated(original, 4));
  66 |   await frame(page, 2).click(); await expect.poll(() => pixels(page)).toEqual(translated(original, 2));
  67 |   await expect(page.getByTestId('piximotion-panel')).toHaveCount(0);
  68 | });
  69 | 
  70 | test('compiled frame duplication never retargets a captured part and bake Undo restores the previously active copy', async ({ page }) => {
  71 |   const original = await readyWithMark(page); await capture(page); await setArc(page);
  72 |   await page.locator('summary').filter({ hasText: 'Frame actions' }).click();
  73 |   await page.getByRole('button', { name: 'Duplicate frame', exact: true }).click(); await expect(frame(page, 2)).toBeVisible();
  74 |   await page.getByRole('button', { name: 'BAKE TO TIMELINE', exact: true }).click();
  75 |   await expect(frame(page, 4)).toBeVisible(); await expect(frame(page, 5)).toHaveCount(0);
  76 |   await expect.poll(() => pixels(page)).toEqual(translated(original, 4));
  77 |   await frame(page, 4).click(); await expect.poll(() => pixels(page)).toEqual(original);
  78 |   await page.getByTestId('undo-button').click(); await expect(frame(page, 3)).toHaveCount(0);
  79 |   await expect(frame(page, 2)).toHaveClass(/timeline-frame-active-bg/); await expect.poll(() => pixels(page)).toEqual(original);
  80 |   await page.getByTestId('redo-button').click(); await expect(frame(page, 3)).toHaveClass(/timeline-frame-active-bg/);
  81 |   await expect.poll(() => pixels(page)).toEqual(translated(original, 4));
  82 | });
  83 | 
```