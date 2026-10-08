# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: inputOwnership.spec.ts >> a rotated floating preview updates after a flip and its committed pixels match the preview
- Location: tests\production\inputOwnership.spec.ts:86:5

# Error details

```
Error: expect(received).not.toEqual(expected) // deep equality

Expected: not [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, …]


Call Log:
- Timeout 10000ms exceeded while waiting on the predicate
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
        - application "Pixel art drawing canvas. Use mouse or stylus to paint, arrow keys to pan viewport or nudge selection, and Alt+drag to pan." [ref=e290]:
          - generic [ref=e292]:
            - generic "Drag to move selection (Shift to lock axis)" [ref=e293]
            - generic "Drag to rotate selection (Shift to snap 15°)" [ref=e294]: ↻
            - generic "Drag to rotate selection (Shift to snap 15°)" [ref=e295]: ↻
            - generic "Drag to rotate selection (Shift to snap 15°)" [ref=e296]: ↻
            - generic "Drag to rotate selection (Shift to snap 15°)" [ref=e297]: ↻
            - generic "Center Pivot Anchor (drag to shift rotation center)" [ref=e314]
            - generic: 90.0°
            - generic [ref=e320]:
              - button "↔" [active] [ref=e321] [cursor=pointer]
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
      - generic [ref=e421]: "X: 4 Y: 11"
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
  1   | import { expect, test, type Page } from '@playwright/test';
  2   | 
  3   | const pixels = (page: Page) => page.getByTestId('main-composite-canvas').evaluate((canvas: HTMLCanvasElement) =>
  4   |   Array.from(canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data));
  5   | async function ready(page: Page) {
  6   |   await page.goto('/studio');
  7   |   await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  8   |   await expect(page.getByTestId('main-composite-canvas')).toBeVisible();
  9   | }
  10  | async function paint(page: Page) {
  11  |   const box = (await page.getByTestId('main-composite-canvas').boundingBox())!;
  12  |   await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.4);
  13  |   await page.mouse.down();
  14  |   await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.4, { steps: 4 });
  15  |   await page.mouse.up();
  16  |   await expect.poll(async () => (await pixels(page)).some((value, index) => index % 4 === 3 && value > 0)).toBe(true);
  17  |   return box;
  18  | }
  19  | async function select(page: Page, box: { x: number; y: number; width: number; height: number }) {
  20  |   await page.getByTestId('select-box-tool').click();
  21  |   await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.2);
  22  |   await page.mouse.down();
  23  |   await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.8, { steps: 4 });
  24  |   await page.mouse.up();
  25  |   await expect(page.getByTestId('selection-transform-gizmo')).toBeVisible();
  26  | }
  27  | 
  28  | test.beforeEach(async ({ page }) => { await page.setViewportSize({ width: 1600, height: 1000 }); });
  29  | 
  30  | test('Help owns keyboard input and closing it preserves artwork, selection and Undo', async ({ page }) => {
  31  |   await ready(page); const box = await paint(page); await select(page, box);
  32  |   const artwork = await pixels(page);
  33  |   const gizmo = page.getByTestId('selection-transform-gizmo'); const bounds = await gizmo.boundingBox();
  34  |   await page.locator('#main-content').focus(); await page.keyboard.press('Shift+/');
  35  |   const dialog = page.getByRole('dialog', { name: 'Atelier Guide & Shortcuts' });
  36  |   await expect(dialog).toBeVisible();
  37  |   await expect(dialog.getByText(/Letter shortcuts use QWERTY key positions/)).toBeVisible();
  38  |   await dialog.getByRole('button', { name: 'Close dialog', exact: true }).focus();
  39  |   for (const key of ['Control+z', 'Control+Shift+z', 'Control+s', 'e', 'Delete', 'ArrowRight', 'Shift+h']) await page.keyboard.press(key);
  40  |   await expect(dialog).toBeVisible();
  41  |   expect(await pixels(page)).toEqual(artwork); expect(await gizmo.boundingBox()).toEqual(bounds);
  42  |   await expect(page.getByTestId('select-box-tool')).toHaveClass(/pixel-primary-btn/);
  43  |   await page.keyboard.press('Escape'); await expect(dialog).not.toBeVisible();
  44  |   await expect(gizmo).toBeVisible(); expect(await pixels(page)).toEqual(artwork);
  45  |   await page.locator('#main-content').focus(); await page.keyboard.press('Control+z');
  46  |   await expect.poll(() => pixels(page)).not.toEqual(artwork);
  47  |   await page.keyboard.press('Control+Shift+z'); await expect.poll(() => pixels(page)).toEqual(artwork);
  48  | });
  49  | 
  50  | test('physical letter events work across layouts while editable input keeps its native commands', async ({ page }) => {
  51  |   await ready(page); await paint(page); const artwork = await pixels(page);
  52  |   await page.locator('#main-content').focus();
  53  |   for (const [key, code, tool] of [['ı', 'KeyI', 'eyedropper'], ['у', 'KeyE', 'eraser'], ['β', 'KeyB', 'pen']]) {
  54  |     // Produced characters/code pairs exercise the compiled handler; OS layout is not changed.
  55  |     await page.evaluate(({ key, code }) => document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key, code, bubbles: true, cancelable: true })), { key, code });
  56  |     await expect(page.getByTestId(`${tool}-tool`)).toHaveClass(/pixel-primary-btn/);
  57  |   }
  58  |   await page.evaluate(() => {
  59  |     const editor = document.createElement('div'); editor.id = 'test-editable'; editor.contentEditable = 'true'; editor.tabIndex = 0;
  60  |     editor.setAttribute('aria-label', 'Test editable input'); document.body.append(editor); editor.focus();
  61  |   });
  62  |   await page.keyboard.type('e'); await expect(page.locator('#test-editable')).toHaveText('e');
  63  |   await page.keyboard.press('Control+z');
  64  |   await expect(page.getByTestId('pen-tool')).toHaveClass(/pixel-primary-btn/); expect(await pixels(page)).toEqual(artwork);
  65  |   await page.evaluate(() => document.getElementById('test-editable')!.remove());
  66  |   await page.locator('#main-content').focus(); await page.keyboard.press('e');
  67  |   await expect(page.getByTestId('eraser-tool')).toHaveClass(/pixel-primary-btn/);
  68  | });
  69  | 
  70  | test('a floating selection and its gizmo nudge together once and commit remains undoable', async ({ page }) => {
  71  |   await ready(page); const blank = await pixels(page); const box = await paint(page); const original = await pixels(page);
  72  |   await select(page, box);
  73  |   const body = (await page.getByTestId('gizmo-translate-body').boundingBox())!;
  74  |   await page.mouse.move(body.x + body.width * 0.25, body.y + body.height * 0.3); await page.mouse.down();
  75  |   await page.mouse.move(body.x + body.width * 0.25 + box.width / 32, body.y + body.height * 0.3, { steps: 3 }); await page.mouse.up();
  76  |   const moved = await pixels(page); expect(moved).not.toEqual(original); expect(moved).not.toEqual(blank);
  77  |   const gizmo = page.getByTestId('selection-transform-gizmo'); const before = (await gizmo.boundingBox())!;
  78  |   await page.locator('#main-content').focus(); await page.keyboard.press('ArrowRight');
  79  |   await expect.poll(async () => (await gizmo.boundingBox())!.x).toBeCloseTo(before.x + box.width / 32, 1);
  80  |   const nudged = await pixels(page); expect(nudged).not.toEqual(moved);
  81  |   await page.keyboard.press('Enter'); await expect(gizmo).not.toBeVisible();
  82  |   await expect.poll(() => pixels(page)).toEqual(nudged);
  83  |   await page.keyboard.press('Control+z'); await expect.poll(() => pixels(page)).toEqual(original);
  84  | });
  85  | 
  86  | test('a rotated floating preview updates after a flip and its committed pixels match the preview', async ({ page }) => {
  87  |   await ready(page); const box = await paint(page);
  88  |   await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.6);
  89  |   const original = await pixels(page); await select(page, box);
  90  |   await page.getByTitle('Rotate 90° CW', { exact: true }).click();
  91  |   await expect.poll(() => pixels(page)).not.toEqual(original);
  92  |   const rotated = await pixels(page);
  93  |   await page.getByTitle('Flip Horizontal (H)', { exact: true }).click();
> 94  |   await expect.poll(() => pixels(page)).not.toEqual(rotated);
      |                                             ^ Error: expect(received).not.toEqual(expected) // deep equality
  95  |   const flipped = await pixels(page);
  96  |   await page.getByTestId('gizmo-commit-btn').click();
  97  |   await expect(page.getByTestId('selection-transform-gizmo')).toBeHidden();
  98  |   await expect.poll(() => pixels(page)).toEqual(flipped);
  99  |   await page.getByTestId('undo-button').click(); await expect.poll(() => pixels(page)).toEqual(original);
  100 | });
  101 | 
  102 | test('the practice Teaching Board owns its dialog keys and retains separate artwork on return', async ({ page }) => {
  103 |   await ready(page); await paint(page); const original = await pixels(page);
  104 |   await page.getByTestId('save-button').click();
  105 |   await expect(page.getByRole('status').filter({ hasText: /^Changes saved$/ })).toHaveText('Changes saved');
  106 |   await page.getByTitle('Return to PixiBun Home', { exact: true }).click();
  107 |   await expect(page).toHaveURL(/\/$/, { timeout: 15000 });
  108 |   await page.getByRole('navigation').getByRole('link', { name: 'Playground', exact: true }).click();
  109 |   await expect(page.getByRole('button', { name: 'Return to drawing', exact: true })).toBeVisible();
  110 |   await page.getByRole('button', { name: 'Trace Stencil', exact: true }).click();
  111 |   await expect.poll(async () => (await pixels(page)).some((value, index) => index % 4 === 3 && value > 0)).toBe(true);
  112 |   const traced = await pixels(page);
  113 |   await page.locator('#main-content').focus();
  114 |   await page.evaluate(() => document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key: 'у', code: 'KeyE', bubbles: true, cancelable: true })));
  115 |   await expect(page.getByTestId('eraser-tool')).toHaveClass(/pixel-primary-btn/);
  116 |   await page.getByRole('button', { name: /Teaching Board$/ }).click();
  117 |   const board = page.getByRole('dialog', { name: 'PixiBun Teaching Animation Board' }); await expect(board).toBeVisible();
  118 |   await page.keyboard.press('Control+z'); await page.keyboard.press('b');
  119 |   expect(await pixels(page)).toEqual(traced); await expect(page.getByTestId('eraser-tool')).toHaveClass(/pixel-primary-btn/);
  120 |   await page.keyboard.press('Escape'); await expect(board).not.toBeVisible();
  121 |   await page.locator('#main-content').focus(); await page.keyboard.press('Control+z');
  122 |   await expect.poll(() => pixels(page)).not.toEqual(traced);
  123 |   await page.keyboard.press('Control+Shift+z'); await expect.poll(() => pixels(page)).toEqual(traced);
  124 |   await page.getByRole('button', { name: 'Return to drawing', exact: true }).click();
  125 |   await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible(); await expect.poll(() => pixels(page)).toEqual(original);
  126 | });
  127 | 
  128 | test('tablet touch drawing uses the artwork policy and survives save/reload', async ({ browser, browserName }, testInfo) => {
  129 |   test.skip(browserName === 'firefox', 'Playwright Firefox does not support mobile/touch context emulation. Desktop input coverage runs separately.');
  130 |   const context = await browser.newContext({ baseURL: testInfo.project.use.baseURL, hasTouch: true, isMobile: true, viewport: { width: 1280, height: 900 } });
  131 |   const page = await context.newPage();
  132 |   try {
  133 |     await ready(page); const blank = await pixels(page); const canvas = page.getByTestId('main-composite-canvas');
  134 |     const box = (await canvas.boundingBox())!;
  135 |     expect(await page.locator('#main-content').evaluate(element => getComputedStyle(element).touchAction)).toBe('none');
  136 |     expect(await page.locator('header').first().evaluate(element => getComputedStyle(element).touchAction)).toBe('auto');
  137 |     await page.locator('#main-content').evaluate(element => {
  138 |       element.setAttribute('data-test-touch-cancels', '0');
  139 |       element.addEventListener('pointercancel', event => {
  140 |         if ((event as PointerEvent).pointerType === 'touch') element.setAttribute('data-test-touch-cancels', String(Number(element.getAttribute('data-test-touch-cancels')) + 1));
  141 |       });
  142 |     });
  143 |     if (browserName === 'chromium') {
  144 |       const session = await context.newCDPSession(page);
  145 |       const first = { id: 1, x: box.x + box.width * 0.3, y: box.y + box.height * 0.4 };
  146 |       await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [first] });
  147 |       first.x += box.width * 0.05;
  148 |       await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [first] });
  149 |       const primaryOnly = await pixels(page);
  150 |       const second = { id: 2, x: box.x + box.width * 0.75, y: box.y + box.height * 0.7 };
  151 |       await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [first, second] });
  152 |       second.x += box.width * 0.05;
  153 |       await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [first, second] });
  154 |       await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [first] });
  155 |       expect(await pixels(page)).toEqual(primaryOnly);
  156 |       first.x += box.width * 0.2;
  157 |       await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [first] });
  158 |       await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  159 |       await session.detach();
  160 |     } else {
  161 |       // WebKit exposes native taps here; drag/multi-touch are Chromium-only checks.
  162 |       await page.touchscreen.tap(box.x + box.width * 0.4, box.y + box.height * 0.4);
  163 |     }
  164 |     const artwork = await pixels(page); expect(artwork).not.toEqual(blank);
  165 |     await expect(page.locator('#main-content')).toHaveAttribute('data-test-touch-cancels', '0');
  166 |     await page.getByTestId('undo-button').tap(); await expect.poll(() => pixels(page)).toEqual(blank);
  167 |     await page.getByTestId('redo-button').tap(); await expect.poll(() => pixels(page)).toEqual(artwork);
  168 |     await page.getByTestId('save-button').tap();
  169 |     await expect(page.getByRole('status').filter({ hasText: /^Changes saved$/ })).toHaveText('Changes saved');
  170 |     await page.reload(); await expect.poll(() => pixels(page)).toEqual(artwork);
  171 |     await page.screenshot({ path: testInfo.outputPath('tablet-artwork-reloaded.png') });
  172 |   } finally { await context.close(); }
  173 | });
  174 | 
```