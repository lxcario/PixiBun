# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: motionRigPersistence.spec.ts >> saved rig deletion is reversible and edited source is refused after save and reload without changing artwork
- Location: tests\production\motionRigPersistence.spec.ts:74:5

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: locator.click: Test timeout of 60000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Cancel (Escape)', exact: true })

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
        - application "Pixel art drawing canvas. Use mouse or stylus to paint, arrow keys to pan viewport or nudge selection, and Alt+drag to pan." [ref=e290]:
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
          - button "Tools" [pressed] [ref=e332]
          - button "Layers" [ref=e334]
          - button "Palette" [ref=e336]
          - button "PixiTools" [ref=e338]:
            - generic [ref=e339]: FX
        - region "Detailed tool settings" [ref=e341]:
          - generic [ref=e344]:
            - generic [ref=e345]:
              - heading "Marquee Box" [level=2] [ref=e346]
              - generic [ref=e347]: M
            - paragraph [ref=e348]: Selection Tool Controls
          - generic [ref=e349]:
            - text: Rotation Engine
            - combobox "Rotation algorithm" [ref=e350] [cursor=pointer]:
              - option "RotSprite v2 (Contours & Outlines)" [selected]
              - option "Paeth 3-Shear (Dither & Textures)"
            - paragraph [ref=e351]: 8× subpixel majority voting & contour refinement. Best for clean character outlines and cel shapes.
          - generic [ref=e352]:
            - generic [ref=e353]:
              - generic [ref=e354]: PixiMotion
              - generic [ref=e355]: Slice 1
            - paragraph [ref=e356]: Turn selection into a temporary rigid part, animate start/end poses, and bake to animation cels.
            - button "Create Motion Part" [ref=e357]
          - generic [ref=e360]:
            - paragraph [ref=e361]: Selection Shortcuts
            - list [ref=e362]:
              - listitem [ref=e363]: "Shift + drag: Add to selection"
              - listitem [ref=e364]: "Alt + drag: Subtract from selection"
              - listitem [ref=e365]: Drag handles to resize, rotate, or move
              - listitem [ref=e366]: "Enter: Commit transform"
              - listitem [ref=e367]: "Esc: Cancel / deselect"
          - generic [ref=e368]:
            - heading "Symmetry & Composition" [level=3] [ref=e369]
            - generic [ref=e370] [cursor=pointer]:
              - checkbox "Horizontal mirror (Shift+H)" [ref=e371]
              - generic [ref=e372]: Horizontal mirror (Shift+H)
            - generic [ref=e373] [cursor=pointer]:
              - checkbox "Vertical mirror (Shift+V)" [ref=e374]
              - generic [ref=e375]: Vertical mirror (Shift+V)
            - generic [ref=e376]:
              - text: Composition Guide
              - combobox "Composition guide" [ref=e377] [cursor=pointer]:
                - option "Off" [selected]
                - option "Rule of thirds"
                - option "Golden ratio"
                - option "Center crosshair"
                - option "Diagonals"
                - option "Safe area (10%)"
    - contentinfo [ref=e379]:
      - generic [ref=e380]:
        - generic [ref=e381]:
          - generic [ref=e382]:
            - button "Play" [ref=e383]
            - button "Previous Frame (,)" [ref=e386]
            - button "Next Frame (.)" [ref=e388]
            - button "Repeat" [ref=e390]
          - generic [ref=e394]:
            - button "Preview speed" [ref=e396]:
              - generic [ref=e397]: Preview
              - generic [ref=e398]: 1×
              - generic [ref=e399]: ▾
            - generic [ref=e400]:
              - generic [ref=e401]: Frame time
              - spinbutton "Active frame duration in milliseconds" [ref=e402]: "100"
              - generic [ref=e403]: ms
            - button "Onion Skin" [ref=e404]
            - button "Onion skin settings" [ref=e407]: ⚙
        - generic [ref=e408]:
          - button "+ Frame" [ref=e409]:
            - generic [ref=e410]: Frame
          - group [ref=e412]:
            - generic "Frame actions" [ref=e413] [cursor=pointer]:
              - text: Frame actions
              - generic [ref=e414]: ▾
          - button "Collapse Timeline" [ref=e416]:
            - generic [ref=e417]:
              - generic [ref=e418]: ▼
              - generic [ref=e419]: Collapse
      - generic [ref=e420]:
        - 'button "Select frame 1. Duration: 100ms. Drag to reorder." [ref=e422]':
          - generic:
            - generic: "#1"
            - generic: 100ms
        - button "Clips" [ref=e423]
    - generic [ref=e425]:
      - generic [ref=e426]: "X: — Y: —"
      - generic [ref=e429]: 32×32
      - generic [ref=e432]: 1600%
      - generic [ref=e434]: Frame 1/1
      - generic [ref=e436]: Base Layer
      - generic [ref=e437]: "Sel: 20×20"
      - generic [ref=e439]: select-box
      - status "All changes saved to local storage" [ref=e444]:
        - generic [ref=e446]: Saved
  - alert [ref=e447]
```

# Test source

```ts
  1   | import { expect, test, type Page } from '@playwright/test';
  2   | import { readFile, writeFile } from 'node:fs/promises';
  3   | 
  4   | const pixels = (page: Page, testId = 'main-composite-canvas') => page.getByTestId(testId).evaluate((canvas: HTMLCanvasElement) =>
  5   |   Array.from(canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data));
  6   | 
  7   | function translated(source: number[], dx: number) {
  8   |   const result = new Array<number>(source.length).fill(0);
  9   |   for (let y = 0; y < 32; y++) for (let x = 0; x + dx < 32; x++) {
  10  |     const src = (y * 32 + x) * 4, dst = (y * 32 + x + dx) * 4;
  11  |     for (let c = 0; c < 4; c++) result[dst + c] = source[src + c];
  12  |   }
  13  |   return result;
  14  | }
  15  | 
  16  | async function readyWithMark(page: Page) {
  17  |   await page.setViewportSize({ width: 1600, height: 1000 });
  18  |   await page.goto('/studio'); await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  19  |   const canvas = page.getByTestId('main-composite-canvas'); const box = (await canvas.boundingBox())!;
  20  |   await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.4); await page.mouse.down();
  21  |   await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.4, { steps: 4 }); await page.mouse.up();
  22  |   await expect.poll(async () => (await pixels(page)).some((v, i) => i % 4 === 3 && v > 0)).toBe(true);
  23  |   return pixels(page);
  24  | }
  25  | async function capture(page: Page) {
  26  |   await page.locator('#center-canvas-area').focus(); await page.keyboard.press('Escape');
  27  |   const box = (await page.getByTestId('main-composite-canvas').boundingBox())!;
  28  |   await page.getByTestId('select-box-tool').click();
  29  |   await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.2); await page.mouse.down();
  30  |   await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.8, { steps: 4 }); await page.mouse.up();
  31  |   await page.getByTestId('tab-tools').click();
  32  |   await page.getByTestId('create-motion-part-btn').click(); await expect(page.getByTestId('piximotion-panel')).toBeVisible();
  33  | }
  34  | async function setArc(page: Page) {
  35  |   const translation = page.getByRole('slider', { name: 'Pose translation X', exact: true }); await translation.focus();
  36  |   for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowRight'); await expect(translation).toHaveValue('4');
  37  |   const count = page.getByRole('slider', { name: 'Motion frame count', exact: true }); await count.focus();
  38  |   await page.keyboard.press('Home'); await page.keyboard.press('ArrowRight'); await expect(count).toHaveValue('3');
  39  |   await page.getByRole('combobox', { name: 'Motion easing', exact: true }).selectOption('linear');
  40  | }
  41  | 
  42  | async function saveRig(page: Page) {
  43  |   await page.getByRole('textbox', { name: 'Rig name', exact: true }).fill('Wave');
  44  |   await page.getByRole('button', { name: 'Save motion rig', exact: true }).click();
  45  |   await expect(page.getByTestId('motion-rig-library').getByRole('status')).toContainText('Motion rig ready');
  46  |   await page.getByRole('button', { name: 'Cancel (Escape)', exact: true }).click();
  47  |   await expect(page.getByTestId('piximotion-panel')).toBeHidden();
  48  | }
  49  | async function saveReload(page: Page) {
  50  |   await page.getByTestId('save-button').click();
  51  |   await expect(page.getByRole('status').filter({ hasText: /^Changes saved$/ })).toBeVisible();
  52  |   await page.reload(); await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  53  |   await page.getByTestId('tab-tools').click();
  54  | }
  55  | 
  56  | test('saved rigid-part poses survive a real project reload and reopen with exact source and translated pixels', async ({ page }) => {
  57  |   const original = await readyWithMark(page); await capture(page); await setArc(page); await saveRig(page); await saveReload(page);
  58  |   await expect.poll(() => pixels(page)).toEqual(original);
  59  |   await expect(page.getByTestId('piximotion-panel')).toHaveCount(0);
  60  |   await page.getByRole('button', { name: 'Open rig Wave', exact: true }).click();
  61  |   await expect(page.getByTestId('piximotion-panel')).toBeVisible();
  62  |   await expect(page.getByRole('slider', { name: 'Pose translation X', exact: true })).toHaveValue('4');
  63  |   await expect(page.getByRole('slider', { name: 'Motion frame count', exact: true })).toHaveValue('3');
  64  |   await expect(page.getByRole('combobox', { name: 'Motion easing', exact: true })).toHaveValue('linear');
  65  |   await expect.poll(() => pixels(page, 'piximotion-preview-canvas')).toEqual(translated(original, 4));
  66  |   await page.getByRole('button', { name: 'BAKE TO TIMELINE', exact: true }).click();
  67  |   await expect(page.getByRole('button', { name: /Select frame 3\./ })).toBeVisible();
  68  |   await expect.poll(() => pixels(page)).toEqual(translated(original, 4));
  69  |   await page.getByTestId('undo-button').click(); await expect.poll(() => pixels(page)).toEqual(original);
  70  |   await expect(page.getByRole('button', { name: /Select frame 2\./ })).toHaveCount(0);
  71  |   await expect(page.getByRole('button', { name: 'Open rig Wave', exact: true })).toBeVisible();
  72  | });
  73  | 
  74  | test('saved rig deletion is reversible and edited source is refused after save and reload without changing artwork', async ({ page }) => {
  75  |   await readyWithMark(page); await capture(page); await setArc(page); await saveRig(page);
  76  |   await page.getByRole('button', { name: 'Delete rig Wave', exact: true }).click();
  77  |   await expect(page.getByRole('button', { name: 'Open rig Wave', exact: true })).toHaveCount(0);
> 78  |   await page.getByRole('button', { name: 'Cancel (Escape)', exact: true }).click();
      |                                                                            ^ Error: locator.click: Test timeout of 60000ms exceeded.
  79  |   await page.getByTestId('undo-button').click(); await expect(page.getByRole('button', { name: 'Open rig Wave', exact: true })).toBeVisible();
  80  |   await page.getByTestId('redo-button').click(); await expect(page.getByRole('button', { name: 'Open rig Wave', exact: true })).toHaveCount(0);
  81  |   await page.getByTestId('undo-button').click();
  82  |   await page.locator('#center-canvas-area').focus(); await page.keyboard.press('Escape'); await page.keyboard.press('KeyB');
  83  |   const before = await pixels(page), box = (await page.getByTestId('main-composite-canvas').boundingBox())!;
  84  |   await page.mouse.click(box.x + box.width * 0.65, box.y + box.height * 0.6);
  85  |   await expect.poll(() => pixels(page)).not.toEqual(before);
  86  |   const changed = await pixels(page); await saveReload(page);
  87  |   await expect.poll(() => pixels(page)).toEqual(changed);
  88  |   await page.getByRole('button', { name: 'Open rig Wave', exact: true }).click();
  89  |   await expect(page.getByTestId('motion-rig-library').getByRole('status')).toContainText('saved source artwork changed');
  90  |   await expect(page.getByTestId('piximotion-panel')).toHaveCount(0);
  91  |   await expect(page.getByTestId('main-composite-canvas')).toHaveCSS('opacity', '1');
  92  |   await expect.poll(() => pixels(page)).toEqual(changed);
  93  |   await expect(page.getByRole('button', { name: /Select frame 2\./ })).toHaveCount(0);
  94  | });
  95  | 
  96  | test('opening a saved rig selects its source cel after a frame copy and cancellation restores that source display', async ({ page }) => {
  97  |   const original = await readyWithMark(page); await capture(page); await setArc(page); await saveRig(page);
  98  |   await page.locator('summary').filter({ hasText: 'Frame actions' }).click();
  99  |   await page.getByRole('button', { name: 'Duplicate frame', exact: true }).click();
  100 |   const first = page.getByRole('button', { name: /Select frame 1\./ }), second = page.getByRole('button', { name: /Select frame 2\./ });
  101 |   await expect(second).toHaveClass(/timeline-frame-active-bg/);
  102 |   await page.getByRole('button', { name: 'Open rig Wave', exact: true }).click();
  103 |   await expect(first).toHaveClass(/timeline-frame-active-bg/);
  104 |   await expect(page.getByRole('slider', { name: 'Pose translation X', exact: true })).toHaveValue('4');
  105 |   await expect.poll(() => pixels(page, 'piximotion-preview-canvas')).toEqual(translated(original, 4));
  106 |   await page.getByRole('button', { name: 'Cancel (Escape)', exact: true }).click();
  107 |   await expect.poll(() => pixels(page)).toEqual(original); await expect(first).toHaveClass(/timeline-frame-active-bg/);
  108 | });
  109 | 
  110 | test('floating artwork blocks saved-rig opening and fresh capture until its source pixels are restored', async ({ page }) => {
  111 |   const original = await readyWithMark(page); await capture(page); await setArc(page); await saveRig(page);
  112 |   const canvas = (await page.getByTestId('main-composite-canvas').boundingBox())!;
  113 |   const body = (await page.getByTestId('gizmo-translate-body').boundingBox())!;
  114 |   await page.mouse.move(body.x + body.width * 0.25, body.y + body.height * 0.3); await page.mouse.down();
  115 |   await page.mouse.move(body.x + body.width * 0.25 + canvas.width / 32, body.y + body.height * 0.3, { steps: 3 }); await page.mouse.up();
  116 |   await expect.poll(() => pixels(page)).not.toEqual(original);
  117 |   await expect(page.getByTestId('gizmo-commit-btn')).toBeVisible();
  118 |   const open = page.getByRole('button', { name: 'Open rig Wave', exact: true });
  119 |   await expect(open).toBeDisabled();
  120 |   await page.getByTestId('create-motion-part-btn').click();
  121 |   await expect(page.getByText('Commit or cancel the floating selection before creating a motion part.', { exact: true })).toBeVisible();
  122 |   await expect(page.getByTestId('piximotion-panel')).toHaveCount(0);
  123 |   await page.getByTestId('gizmo-cancel-btn').click();
  124 |   await expect(open).toBeEnabled(); await expect.poll(() => pixels(page)).toEqual(original);
  125 |   await open.click(); await expect(page.getByTestId('piximotion-panel')).toBeVisible();
  126 |   await expect.poll(() => pixels(page, 'piximotion-preview-canvas')).toEqual(translated(original, 4));
  127 | });
  128 | 
  129 | test('a portable backup preserves editable rig IDs and poses and imports with matching source pixels', async ({ page }, info) => {
  130 |   await page.addInitScript(() => { Object.defineProperty(window, 'showSaveFilePicker', { value: undefined, configurable: true }); });
  131 |   const original = await readyWithMark(page); await capture(page); await setArc(page); await saveRig(page);
  132 |   await page.getByTestId('export-button').click(); await page.getByTestId('export-tab-project').click();
  133 |   const download = page.waitForEvent('download');
  134 |   await page.getByRole('button', { name: 'Download project backup', exact: true }).click();
  135 |   const path = await (await download).path(); expect(path).toBeTruthy();
  136 |   const raw = await readFile(path!, 'utf8'), file = JSON.parse(raw);
  137 |   expect(file.version).toBe(4); expect(file.motionRigs).toHaveLength(1);
  138 |   const rig = file.motionRigs[0]; expect(rig.name).toBe('Wave'); expect(rig.part.sourceSha256).toMatch(/^[a-f0-9]{64}$/);
  139 |   expect(rig.part.endPose.translationX).toBe(4); expect(rig.part.frameCount).toBe(3);
  140 |   expect(rig.part).not.toHaveProperty('raster'); expect(rig.part).not.toHaveProperty('sourceVersion');
  141 |   await writeFile(info.outputPath('saved-rig.pixibun'), raw);
  142 |   await expect(page.getByRole('dialog', { name: /Export/ })).toBeHidden();
  143 |   await page.locator('input[type=file]').first().setInputFiles({ name: 'saved-rig.pixibun', mimeType: 'application/json', buffer: Buffer.from(raw) });
  144 |   const importer = page.getByRole('dialog', { name: 'Import Project (.pixibun)' });
  145 |   await importer.getByRole('button', { name: 'Confirm Import', exact: true }).click(); await expect(importer).toBeHidden();
  146 |   await expect.poll(() => pixels(page)).toEqual(original); await page.getByTestId('tab-tools').click();
  147 |   await page.getByRole('button', { name: 'Open rig Wave', exact: true }).click();
  148 |   await expect(page.getByTestId('piximotion-panel')).toBeVisible();
  149 |   await expect(page.getByRole('slider', { name: 'Motion frame count', exact: true })).toHaveValue('3');
  150 |   await expect.poll(() => pixels(page, 'piximotion-preview-canvas')).toEqual(translated(original, 4));
  151 | });
  152 | 
```