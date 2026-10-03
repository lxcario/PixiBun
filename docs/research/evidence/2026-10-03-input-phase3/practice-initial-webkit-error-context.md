# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: inputOwnership.spec.ts >> the practice Teaching Board owns its dialog keys and retains separate artwork on return
- Location: tests\production\inputOwnership.spec.ts:86:5

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: locator.click: Test timeout of 60000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Teaching Board', exact: true })

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - link "Skip to workspace" [ref=e2]:
    - /url: /studio#main-workspace
  - complementary "Application update notification" [ref=e3]:
    - generic [ref=e4]: Update ready · A fresh atelier build is ready. Close all PixiBun tabs when done to apply.
    - generic [ref=e6]:
      - button "Update instructions" [ref=e7] [cursor=pointer]
      - button "Dismiss update banner" [ref=e8] [cursor=pointer]: ✕
  - alert [ref=e9]: PixiBun Playground — Beginner Pixel Art Onboarding
  - generic [ref=e11]:
    - banner [ref=e12]:
      - generic [ref=e13]:
        - link "Bun, the PixiBun bunny PIXIBUN PLAYGROUND" [ref=e14]:
          - /url: /
          - generic [ref=e15]:
            - img "Bun, the PixiBun bunny" [ref=e17]
            - generic [ref=e181]: PIXIBUN
          - generic [ref=e183]: PLAYGROUND
        - generic [ref=e185]:
          - generic [ref=e186]: "Step 1:"
          - generic [ref=e187]: "Frame 1: Apex Float"
      - generic [ref=e188]:
        - generic [ref=e189]:
          - generic [ref=e190]: "Pen:"
          - button "1px" [ref=e191] [cursor=pointer]
          - button "2px" [ref=e192] [cursor=pointer]
          - button "3px" [ref=e193] [cursor=pointer]
        - generic [ref=e194]:
          - button "Undo (Ctrl+Z)" [ref=e195]
          - button "Redo (Ctrl+Y)" [disabled] [ref=e197]
      - generic [ref=e199]:
        - button "✦ Teaching Board" [ref=e200] [cursor=pointer]:
          - generic [ref=e201]: ✦
          - generic [ref=e202]: Teaching Board
        - button "Keep practice in Studio" [ref=e203]
        - button "Toggle Theme" [ref=e204] [cursor=pointer]
        - button "Return to drawing" [ref=e215] [cursor=pointer]:
          - generic [ref=e217]: ➔
    - paragraph [ref=e218]: A fresh sheet to try things. Keep saves a new project; Return brings your drawing back. Practice is temporary until you keep it.
    - generic [ref=e219]:
      - complementary [ref=e220]:
        - generic [ref=e222]:
          - button "Pen" [ref=e224] [cursor=pointer]
          - button "Eraser" [ref=e226] [cursor=pointer]
        - generic [ref=e227]:
          - generic [ref=e228]:
            - button "Swap colors (X)" [ref=e229] [cursor=pointer]: ⇄
            - button "Reset default black and white colors (Shift+D)" [ref=e230] [cursor=pointer]
            - 'button "Secondary color #C792DF. Click for quick swatches, double click for picker, right click to swap" [ref=e231] [cursor=pointer]'
            - 'button "Primary color #3A2E4C. Click for quick swatches, double click for picker, right click to swap" [ref=e232] [cursor=pointer]'
          - generic [ref=e233]:
            - generic [ref=e234]:
              - 'button "#DDDFDF (Click: Primary | Right-click: Secondary)" [ref=e235] [cursor=pointer]'
              - 'button "#DDDDDF (Click: Primary | Right-click: Secondary)" [ref=e236] [cursor=pointer]'
              - 'button "#D0C4DF (Click: Primary | Right-click: Secondary)" [ref=e237] [cursor=pointer]'
              - 'button "#DCABDF (Click: Primary | Right-click: Secondary)" [ref=e238] [cursor=pointer]'
            - button "Quick Swatches Flyout" [ref=e239] [cursor=pointer]
      - main "Pixel art canvas workspace" [active] [ref=e243]:
        - application "Pixel art drawing canvas. Use mouse or stylus to paint, arrow keys to pan viewport or nudge selection, and Alt+drag to pan." [ref=e244]
      - complementary [ref=e246]:
        - generic [ref=e247]:
          - generic [ref=e248]:
            - generic [ref=e249]:
              - img "Bun, the PixiBun bunny" [ref=e251]
              - generic [ref=e415]:
                - generic [ref=e416]: Physics 201
                - heading "The Master Bouncing Ball" [level=2] [ref=e417]
            - button "Keep practice" [ref=e418] [cursor=pointer]
          - generic [ref=e419]:
            - generic [ref=e420]:
              - generic [ref=e421]: "Lesson Curriculum:"
              - generic [ref=e422]: 1 / 12
            - generic [ref=e423]:
              - combobox "Choose animation lesson" [ref=e424] [cursor=pointer]:
                - option "[Physics 201] The Master Bouncing Ball (12f @ 12fps)" [selected]
                - option "[Optical 201] Sub-Pixel Character Idle (3f @ 8fps)"
                - option "[Combat 201] Sword Slash & Combat Hitstop (4f @ 12fps)"
                - option "[Character 201] Character Hop & Shock Absorption (5f @ 10fps)"
                - option "[Physics 101] The Bouncing Mochi (4f @ 10fps)"
                - option "[Fluid FX] The Hearth Flame (3f @ 8fps)"
                - option "[Character 101] The Character Hop (3f @ 9fps)"
                - option "[Alchemy FX] Magic Potion Bubbles (4f @ 9fps)"
                - option "[Creature 101] The Slime Glide (4f @ 8fps)"
                - option "[Lighting FX] The Twinkling Star (4f @ 10fps)"
                - option "[Water FX] The Water Ripple (4f @ 8fps)"
                - option "[Combat 101] The Sword Slash (3f @ 12fps)"
              - generic: ▼
            - button "✦ 10-Frame Jump Anatomy Teaching Board ➔" [ref=e425] [cursor=pointer]:
              - generic [ref=e426]:
                - generic [ref=e427]: ✦
                - generic [ref=e428]: 10-Frame Jump Anatomy
              - generic [ref=e429]: Teaching Board ➔
        - generic [ref=e430]:
          - 'button "Step 1: Frame 1: Apex Float" [ref=e431] [cursor=pointer]'
          - 'button "Step 2: Frame 2: Apex Cushioning" [ref=e432] [cursor=pointer]'
          - 'button "Step 3: Frame 3: Fall Acceleration" [ref=e433] [cursor=pointer]'
          - 'button "Step 4: Frame 4: Terminal Velocity Stretch" [ref=e434] [cursor=pointer]'
          - 'button "Step 5: Frame 5: Ground Contact" [ref=e435] [cursor=pointer]'
          - 'button "Step 6: Frame 6: Impact Squash (Hitstop)" [ref=e436] [cursor=pointer]'
          - 'button "Step 7: Frame 7: Elastic Rebound" [ref=e437] [cursor=pointer]'
          - 'button "Step 8: Frame 8: Ascent Transfer" [ref=e438] [cursor=pointer]'
          - 'button "Step 9: Frame 9: Deceleration Cushion" [ref=e439] [cursor=pointer]'
          - 'button "Step 10: Frame 10: Apex Slow-In" [ref=e440] [cursor=pointer]'
          - 'button "Step 11: Frame 11: Overshoot Oscillation" [ref=e441] [cursor=pointer]'
          - 'button "Step 12: Frame 12: Cycle Reset" [ref=e442] [cursor=pointer]'
          - 'button "Step 13: Playback & Timing Validation" [ref=e443] [cursor=pointer]'
          - 'button "Step 14: Lesson Mastered" [ref=e444] [cursor=pointer]'
        - generic [ref=e445]:
          - generic [ref=e446]:
            - generic [ref=e447]: Step 1 of 14
            - 'heading "Frame 1: Apex Float" [level=3] [ref=e448]'
            - paragraph [ref=e449]: Apex Float (112 px area, ~120 ms)
          - generic [ref=e450]:
            - generic [ref=e451]:
              - generic [ref=e452]: Outline Ready!
              - generic [ref=e453]: 100%
            - generic [ref=e456]: Outline complete! Click Next Frame to proceed.
          - generic [ref=e457]:
            - generic [ref=e458]:
              - generic [ref=e459]: Physics & Timing
              - generic [ref=e461]: Apex Float
            - generic [ref=e462]:
              - generic [ref=e463]:
                - generic [ref=e464]: "Pacing Hold:"
                - generic [ref=e465]: ~120 ms
              - generic [ref=e466]:
                - generic [ref=e467]: "Target Volume:"
                - generic [ref=e468]: 112 px
            - generic [ref=e469]: "Optical Note:Apex Hang Time: Gravitational balance at crest (0px velocity)"
          - generic [ref=e470]:
            - generic [ref=e471]: Apex Float
            - paragraph [ref=e473]: "Keyframe 1 of 12. Volume: 112 px. Symmetrical pixel-art form with fully enclosed, unbroken outline."
          - paragraph [ref=e474]: Use your Pen tool (B) to trace the perimeter outline onto the canvas. Notice the silhouette deformation for this keyframe.
          - generic [ref=e475]: "Mass Conservation: 112 px effective area preserved with zero outline leaks."
          - generic [ref=e476]:
            - generic [ref=e477]:
              - generic [ref=e478]: Tracing Lightbox
              - button "Show Lightbox" [ref=e479] [cursor=pointer]
            - generic [ref=e480]:
              - button "Trace Stencil" [ref=e481]
              - button "Clear Frame" [ref=e483]
        - 'button "Next: Frame 2" [ref=e486]'
    - contentinfo [ref=e488]:
      - generic [ref=e489]:
        - generic [ref=e491]:
          - button "Play" [ref=e492]
          - button "Previous Frame (,)" [ref=e495]
          - button "Next Frame (.)" [ref=e497]
        - generic [ref=e499]:
          - button "+ Frame" [ref=e500]:
            - generic [ref=e501]: Frame
          - button "Collapse Timeline" [ref=e504]:
            - generic [ref=e505]:
              - generic [ref=e506]: ▼
              - generic [ref=e507]: Collapse
      - generic [ref=e509]:
        - 'button "Select frame 1. Duration: 120ms. Drag to reorder." [ref=e510]':
          - generic:
            - generic: "#1"
            - generic: 120ms
        - 'button "Select frame 2. Duration: 80ms. Drag to reorder." [ref=e511]':
          - generic:
            - generic: "#2"
            - generic: 80ms
        - 'button "Select frame 3. Duration: 60ms. Drag to reorder." [ref=e512]':
          - generic:
            - generic: "#3"
            - generic: 60ms
        - 'button "Select frame 4. Duration: 50ms. Drag to reorder." [ref=e513]':
          - generic:
            - generic: "#4"
            - generic: 50ms
        - 'button "Select frame 5. Duration: 40ms. Drag to reorder." [ref=e514]':
          - generic:
            - generic: "#5"
            - generic: 40ms
        - 'button "Select frame 6. Duration: 200ms. Drag to reorder." [ref=e515]':
          - generic:
            - generic: "#6"
            - generic: 200ms
        - 'button "Select frame 7. Duration: 40ms. Drag to reorder." [ref=e516]':
          - generic:
            - generic: "#7"
            - generic: 40ms
        - 'button "Select frame 8. Duration: 50ms. Drag to reorder." [ref=e517]':
          - generic:
            - generic: "#8"
            - generic: 50ms
        - 'button "Select frame 9. Duration: 70ms. Drag to reorder." [ref=e518]':
          - generic:
            - generic: "#9"
            - generic: 70ms
        - 'button "Select frame 10. Duration: 90ms. Drag to reorder." [ref=e519]':
          - generic:
            - generic: "#10"
            - generic: 90ms
        - 'button "Select frame 11. Duration: 100ms. Drag to reorder." [ref=e520]':
          - generic:
            - generic: "#11"
            - generic: 100ms
        - 'button "Select frame 12. Duration: 100ms. Drag to reorder." [ref=e521]':
          - generic:
            - generic: "#12"
            - generic: 100ms
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
  86  | test('the practice Teaching Board owns its dialog keys and retains separate artwork on return', async ({ page }) => {
  87  |   await ready(page); await paint(page); const original = await pixels(page);
  88  |   await page.getByTestId('save-button').click();
  89  |   await expect(page.getByRole('status').filter({ hasText: /^Changes saved$/ })).toHaveText('Changes saved');
  90  |   await page.getByTitle('Return to PixiBun Home', { exact: true }).click();
  91  |   await expect(page).toHaveURL(/\/$/, { timeout: 15000 });
  92  |   await page.getByRole('navigation').getByRole('link', { name: 'Playground', exact: true }).click();
  93  |   await expect(page.getByRole('button', { name: 'Return to drawing', exact: true })).toBeVisible();
  94  |   await page.getByRole('button', { name: 'Trace Stencil', exact: true }).click();
  95  |   await expect.poll(async () => (await pixels(page)).some((value, index) => index % 4 === 3 && value > 0)).toBe(true);
  96  |   const traced = await pixels(page);
  97  |   await page.locator('#main-content').focus();
  98  |   await page.evaluate(() => document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key: 'у', code: 'KeyE', bubbles: true, cancelable: true })));
  99  |   await expect(page.getByTestId('eraser-tool')).toHaveClass(/pixel-primary-btn/);
> 100 |   await page.getByRole('button', { name: 'Teaching Board', exact: true }).click();
      |                                                                           ^ Error: locator.click: Test timeout of 60000ms exceeded.
  101 |   const board = page.getByRole('dialog', { name: 'PixiBun Teaching Animation Board' }); await expect(board).toBeVisible();
  102 |   await page.keyboard.press('Control+z'); await page.keyboard.press('b');
  103 |   expect(await pixels(page)).toEqual(traced); await expect(page.getByTestId('eraser-tool')).toHaveClass(/pixel-primary-btn/);
  104 |   await page.keyboard.press('Escape'); await expect(board).not.toBeVisible();
  105 |   await page.locator('#main-content').focus(); await page.keyboard.press('Control+z');
  106 |   await expect.poll(() => pixels(page)).not.toEqual(traced);
  107 |   await page.keyboard.press('Control+Shift+z'); await expect.poll(() => pixels(page)).toEqual(traced);
  108 |   await page.getByRole('button', { name: 'Return to drawing', exact: true }).click();
  109 |   await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible(); await expect.poll(() => pixels(page)).toEqual(original);
  110 | });
  111 | 
  112 | test('tablet touch drawing uses the artwork policy and survives save/reload', async ({ browser, browserName }, testInfo) => {
  113 |   test.skip(browserName === 'firefox', 'Playwright Firefox does not support mobile/touch context emulation. Desktop input coverage runs separately.');
  114 |   const context = await browser.newContext({ baseURL: testInfo.project.use.baseURL, hasTouch: true, isMobile: true, viewport: { width: 1280, height: 900 } });
  115 |   const page = await context.newPage();
  116 |   try {
  117 |     await ready(page); const blank = await pixels(page); const canvas = page.getByTestId('main-composite-canvas');
  118 |     const box = (await canvas.boundingBox())!;
  119 |     expect(await page.locator('#main-content').evaluate(element => getComputedStyle(element).touchAction)).toBe('none');
  120 |     expect(await page.locator('header').first().evaluate(element => getComputedStyle(element).touchAction)).toBe('auto');
  121 |     await page.locator('#main-content').evaluate(element => {
  122 |       element.setAttribute('data-test-touch-cancels', '0');
  123 |       element.addEventListener('pointercancel', event => {
  124 |         if ((event as PointerEvent).pointerType === 'touch') element.setAttribute('data-test-touch-cancels', String(Number(element.getAttribute('data-test-touch-cancels')) + 1));
  125 |       });
  126 |     });
  127 |     if (browserName === 'chromium') {
  128 |       const session = await context.newCDPSession(page);
  129 |       const first = { id: 1, x: box.x + box.width * 0.3, y: box.y + box.height * 0.4 };
  130 |       await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [first] });
  131 |       first.x += box.width * 0.05;
  132 |       await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [first] });
  133 |       const primaryOnly = await pixels(page);
  134 |       const second = { id: 2, x: box.x + box.width * 0.75, y: box.y + box.height * 0.7 };
  135 |       await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [first, second] });
  136 |       second.x += box.width * 0.05;
  137 |       await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [first, second] });
  138 |       await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [first] });
  139 |       expect(await pixels(page)).toEqual(primaryOnly);
  140 |       first.x += box.width * 0.2;
  141 |       await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [first] });
  142 |       await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  143 |       await session.detach();
  144 |     } else {
  145 |       // WebKit exposes native taps here; drag/multi-touch are Chromium-only checks.
  146 |       await page.touchscreen.tap(box.x + box.width * 0.4, box.y + box.height * 0.4);
  147 |     }
  148 |     const artwork = await pixels(page); expect(artwork).not.toEqual(blank);
  149 |     await expect(page.locator('#main-content')).toHaveAttribute('data-test-touch-cancels', '0');
  150 |     await page.getByTestId('undo-button').tap(); await expect.poll(() => pixels(page)).toEqual(blank);
  151 |     await page.getByTestId('redo-button').tap(); await expect.poll(() => pixels(page)).toEqual(artwork);
  152 |     await page.getByTestId('save-button').tap();
  153 |     await expect(page.getByRole('status').filter({ hasText: /^Changes saved$/ })).toHaveText('Changes saved');
  154 |     await page.reload(); await expect.poll(() => pixels(page)).toEqual(artwork);
  155 |     await page.screenshot({ path: testInfo.outputPath('tablet-artwork-reloaded.png') });
  156 |   } finally { await context.close(); }
  157 | });
  158 | 
```