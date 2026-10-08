# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: pixiMotionBindings.spec.ts >> compiled stale source refuses bake; fresh capture previews, bakes, undoes, redoes and reloads exact translated pixels
- Location: tests\production\pixiMotionBindings.spec.ts:42:5

# Error details

```
Error: expect(locator).toHaveText(expected) failed

Locator: getByTestId('piximotion-panel').getByRole('status')
Expected pattern: /source artwork changed/
Error: strict mode violation: getByTestId('piximotion-panel').getByRole('status') resolved to 3 elements:
    1) <p role="status" class="h-10 text-[11px] leading-4"></p> aka getByTestId('motion-rig-library').getByRole('status')
    2) <p role="status" data-testid="motion-clipping-notice" class="h-12 text-[11px] leading-4 text-[var(--text-muted)]">5 painted pixels leave the canvas. Adjust the pos…</p> aka getByTestId('motion-clipping-notice')
    ...

Call log:
  - Expect "toHaveText" with timeout 10000ms
  - waiting for getByTestId('piximotion-panel').getByRole('status')

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
    - status [ref=e239]: Unsaved changes
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
              - 'button "Quick color #DDDFDF" [ref=e296] [cursor=pointer]'
              - 'button "Quick color #DDDDDF" [ref=e297] [cursor=pointer]'
              - 'button "Quick color #D0C4DF" [ref=e298] [cursor=pointer]'
              - 'button "Quick color #DCABDF" [ref=e299] [cursor=pointer]'
            - button "Quick Swatches Flyout" [ref=e300] [cursor=pointer]
      - main "Pixel art canvas workspace" [ref=e304]:
        - application "Pixel art drawing canvas. Use mouse or stylus to paint, arrow keys to pan viewport or nudge selection, and Alt+drag to pan." [active] [ref=e305]:
          - generic:
            - generic [ref=e307]:
              - generic "Drag to translate (Arrow keys to nudge)" [ref=e308]
              - generic "Drag to rotate (Hold Shift to snap 15°)" [ref=e310]
              - generic:
                - generic: 0.0°
                - generic: "|"
                - generic: +24,+0
            - generic "Draggable Motion Pivot (Place at joint/shoulder/elbow)" [ref=e313]
            - generic [ref=e319]:
              - button "END POSE" [ref=e320]
              - button "BAKE" [ref=e322]
              - button "✕" [ref=e323]
      - complementary [ref=e325]:
        - generic [ref=e326]:
          - button "Tools" [pressed] [ref=e327]
          - button "Layers" [ref=e329]
          - button "Palette" [ref=e331]
          - button "PixiTools" [ref=e333]:
            - generic [ref=e334]: FX
        - generic [ref=e336]:
          - generic [ref=e339]:
            - 'heading "PixiMotion: Rigid Part" [level=2] [ref=e340]'
            - paragraph [ref=e341]: Arc Pose Transform → Cel Bake
          - region "Saved motion rigs" [ref=e342]:
            - heading "Saved motion rigs" [level=3] [ref=e343]
            - generic [ref=e344]:
              - generic [ref=e345]:
                - text: Rig name
                - textbox "Rig name" [ref=e346]: Motion 1
              - button "Save motion rig" [ref=e347]
            - paragraph [ref=e348]: Each rig keeps one part, its selection, pivot and poses. Opening checks the saved artwork.
            - status [ref=e349]
          - status [ref=e350]: 5 painted pixels leave the canvas. Adjust the pose or enlarge the canvas before baking.
          - generic [ref=e351]:
            - button "Undo motion edit" [disabled] [ref=e352]:
              - generic [ref=e353]: Undo pose
            - button "Redo motion edit" [disabled] [ref=e354]:
              - generic [ref=e355]: Redo pose
            - button "Reset Pose" [disabled] [ref=e356]
          - paragraph [ref=e358]: Undo/Redo edits this motion session. Cancel returns to drawing; Bake creates editable cels.
          - status [ref=e359]: The source artwork changed. Cancel and capture a new motion part before baking.
          - generic [ref=e360]:
            - generic [ref=e361]: Target Pose
            - generic [ref=e362]:
              - button "● START" [ref=e363]
              - button "● END" [pressed] [ref=e365]
          - generic [ref=e367]:
            - generic [ref=e368]:
              - generic [ref=e369]: End Pose Transform
              - generic [ref=e370]: END
            - generic [ref=e371]:
              - generic [ref=e372]:
                - generic [ref=e373]: Rotation
                - generic [ref=e374]: 0°
              - slider "Pose rotation" [ref=e375] [cursor=pointer]: "0"
              - generic [ref=e376]:
                - button "-90°" [ref=e377]
                - button "-45°" [ref=e378]
                - button "0°" [ref=e379]
                - button "45°" [ref=e380]
                - button "90°" [ref=e381]
            - generic [ref=e382]:
              - generic [ref=e383]:
                - generic [ref=e384]: Translation X
                - generic [ref=e385]: 24px
              - slider "Pose translation X" [ref=e386] [cursor=pointer]: "24"
            - generic [ref=e387]:
              - generic [ref=e388]:
                - generic [ref=e389]: Translation Y
                - generic [ref=e390]: 0px
              - slider "Pose translation Y" [ref=e391] [cursor=pointer]: "0"
            - generic:
              - generic: Rotation degrees
              - generic:
                - button "Decrease value" [disabled]: "-"
                - generic:
                  - spinbutton "Rotation degrees" [disabled]: "0"
                - button "Increase value" [disabled]: +
            - generic:
              - generic: Position X pixels
              - generic:
                - button "Decrease value" [disabled]: "-"
                - generic:
                  - spinbutton "Position X pixels" [disabled]: "24"
                - button "Increase value" [disabled]: +
            - generic:
              - generic: Position Y pixels
              - generic:
                - button "Decrease value" [disabled]: "-"
                - generic:
                  - spinbutton "Position Y pixels" [disabled]: "0"
                - button "Increase value" [disabled]: +
            - generic:
              - generic: Pivot X pixels
              - generic:
                - button "Decrease value" [disabled]: "-"
                - generic:
                  - spinbutton "Pivot X pixels" [disabled]: "16"
                - button "Increase value" [disabled]: +
            - generic:
              - generic: Pivot Y pixels
              - generic:
                - button "Decrease value" [disabled]: "-"
                - generic:
                  - spinbutton "Pivot Y pixels" [disabled]: "16"
                - button "Increase value" [disabled]: +
            - generic [ref=e392]:
              - generic [ref=e393]:
                - text: "Pivot:"
                - generic [ref=e394]: 16, 16
              - button "Center Pivot" [ref=e395] [cursor=pointer]
          - generic [ref=e396]:
            - heading "Arc Interpolation" [level=3] [ref=e397]
            - paragraph [ref=e398]: "Each baked cel keeps the source duration: 125 ms. Preview follows the same timing."
            - generic [ref=e399]:
              - generic [ref=e400]:
                - generic [ref=e401]: Generated Frames
                - generic [ref=e402]: "5"
              - slider "Motion frame count" [ref=e403] [cursor=pointer]: "5"
            - generic:
              - generic: Motion frames
              - generic:
                - button "Decrease value" [disabled]: "-"
                - generic:
                  - spinbutton "Motion frames" [disabled]: "5"
                - button "Increase value" [disabled]: +
            - generic [ref=e404]:
              - text: Easing Curve
              - combobox "Motion easing" [ref=e405] [cursor=pointer]:
                - option "Linear (Constant speed)"
                - option "Ease In (Accelerate)"
                - option "Ease Out (Decelerate)"
                - option "Ease In-Out (Natural arc)" [selected]
          - generic [ref=e406]:
            - generic [ref=e407]:
              - generic [ref=e408]: Arc Preview
              - generic [ref=e409]: Editing END
            - generic [ref=e410]:
              - generic [ref=e411]:
                - generic [ref=e412]: "[START]"
                - generic [ref=e413]: "[END]"
              - slider "Arc preview scrub" [ref=e414] [cursor=pointer]: "4"
            - generic [ref=e415]:
              - button "Play Loop" [disabled] [ref=e416]
              - button "Resume Pose" [disabled] [ref=e418]
          - generic [ref=e419]:
            - button "BAKE TO TIMELINE" [disabled] [ref=e420]
            - button "Cancel (Escape)" [ref=e423]
    - contentinfo [ref=e427]:
      - generic [ref=e428]:
        - generic [ref=e429]:
          - generic [ref=e430]:
            - button "Play" [ref=e431]
            - button "Previous Frame (,)" [ref=e434]
            - button "Next Frame (.)" [ref=e436]
            - button "Repeat" [ref=e438]
          - generic [ref=e442]:
            - button "Preview speed" [ref=e444]:
              - generic [ref=e445]: Preview
              - generic [ref=e446]: 1×
              - generic [ref=e447]: ▾
            - generic [ref=e448]:
              - generic [ref=e449]: Frame time
              - spinbutton "Active frame duration in milliseconds" [ref=e450]: "100"
              - generic [ref=e451]: ms
            - button "Onion Skin" [ref=e452]
            - button "Onion skin settings" [ref=e455]: ⚙
        - generic [ref=e457]:
          - button "+ Frame" [ref=e458]:
            - generic [ref=e459]: Frame
          - group [ref=e461]:
            - generic "Frame actions" [ref=e462] [cursor=pointer]:
              - text: Frame actions
              - generic [ref=e463]: ▾
          - button "Collapse Timeline" [ref=e465]:
            - generic [ref=e466]:
              - generic [ref=e467]: ▼
              - generic [ref=e468]: Collapse
      - generic [ref=e469]:
        - 'button "Select frame 1. Duration: 100ms. Drag to reorder." [ref=e471]':
          - generic:
            - generic: "#1"
            - generic: 100ms
        - button "Clips" [ref=e472]
    - generic [ref=e474]:
      - generic [ref=e475]: "X: — Y: —"
      - generic [ref=e478]: 32×32
      - generic [ref=e481]: 1600%
      - generic [ref=e483]: Frame 1/1
      - generic [ref=e485]: Base Layer
      - generic [ref=e486]: pen
      - status "You have unsaved changes" [ref=e491]:
        - generic [ref=e493]: Unsaved
    - status:
      - generic: Motion Part created! Drag pivot or pose END frame, then scrub or bake.
  - alert [ref=e494]
```

# Test source

```ts
  1   | import { expect, test, type Page } from '@playwright/test';
  2   | 
  3   | const pixels = (page: Page, testId = 'main-composite-canvas') => page.getByTestId(testId).evaluate((canvas: HTMLCanvasElement) =>
  4   |   Array.from(canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data));
  5   | 
  6   | function translated(source: number[], dx: number) {
  7   |   const result = new Array<number>(source.length).fill(0);
  8   |   for (let y = 0; y < 32; y++) for (let x = 0; x + dx < 32; x++) {
  9   |     const src = (y * 32 + x) * 4, dst = (y * 32 + x + dx) * 4;
  10  |     for (let c = 0; c < 4; c++) result[dst + c] = source[src + c];
  11  |   }
  12  |   return result;
  13  | }
  14  | 
  15  | async function readyWithMark(page: Page) {
  16  |   await page.setViewportSize({ width: 1600, height: 1000 });
  17  |   await page.goto('/studio'); await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  18  |   const canvas = page.getByTestId('main-composite-canvas'); const box = (await canvas.boundingBox())!;
  19  |   await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.4); await page.mouse.down();
  20  |   await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.4, { steps: 4 }); await page.mouse.up();
  21  |   await expect.poll(async () => (await pixels(page)).some((v, i) => i % 4 === 3 && v > 0)).toBe(true);
  22  |   return pixels(page);
  23  | }
  24  | async function capture(page: Page) {
  25  |   await page.locator('#center-canvas-area').focus(); await page.keyboard.press('Escape');
  26  |   const box = (await page.getByTestId('main-composite-canvas').boundingBox())!;
  27  |   await page.getByTestId('select-box-tool').click();
  28  |   await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.2); await page.mouse.down();
  29  |   await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.8, { steps: 4 }); await page.mouse.up();
  30  |   await page.getByTestId('tab-tools').click();
  31  |   await page.getByTestId('create-motion-part-btn').click(); await expect(page.getByTestId('piximotion-panel')).toBeVisible();
  32  | }
  33  | async function setArc(page: Page) {
  34  |   const translation = page.getByRole('slider', { name: 'Pose translation X', exact: true }); await translation.focus();
  35  |   for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowRight'); await expect(translation).toHaveValue('4');
  36  |   const count = page.getByRole('slider', { name: 'Motion frame count', exact: true }); await count.focus();
  37  |   await page.keyboard.press('Home'); await page.keyboard.press('ArrowRight'); await expect(count).toHaveValue('3');
  38  |   await page.getByRole('combobox', { name: 'Motion easing', exact: true }).selectOption('linear');
  39  | }
  40  | const frame = (page: Page, n: number) => page.getByRole('button', { name: new RegExp(`Select frame ${n}\\.`) });
  41  | 
  42  | test('compiled stale source refuses bake; fresh capture previews, bakes, undoes, redoes and reloads exact translated pixels', async ({ page }) => {
  43  |   const original = await readyWithMark(page); await capture(page);
  44  |   await page.getByTestId('piximotion-panel').getByRole('button', { name: 'Cancel (Escape)', exact: true }).focus();
  45  |   await page.keyboard.press('Enter'); await expect(page.getByTestId('piximotion-panel')).toBeHidden();
  46  |   await expect(frame(page, 2)).toHaveCount(0); await expect.poll(() => pixels(page)).toEqual(original);
  47  |   await capture(page); await page.locator('#center-canvas-area').focus();
  48  |   await page.keyboard.press('ArrowRight'); await expect.poll(() => pixels(page, 'piximotion-preview-canvas')).toEqual(translated(original, 1));
  49  |   await page.keyboard.press('ArrowLeft'); await expect.poll(() => pixels(page, 'piximotion-preview-canvas')).toEqual(original);
  50  |   await page.getByTestId('undo-button').click();
  51  |   await expect.poll(() => pixels(page, 'piximotion-preview-canvas')).toEqual(translated(original, 1));
  52  |   await page.getByTestId('redo-button').click();
  53  |   await expect.poll(() => pixels(page, 'piximotion-preview-canvas')).toEqual(original);
  54  |   // Move the overlay away, then edit the captured source through the real pen tool.
  55  |   const x = page.getByRole('spinbutton', { name: 'Position X pixels', exact: true });
  56  |   await x.fill('24'); await x.press('Enter');
  57  |   await page.locator('#center-canvas-area').focus(); await page.keyboard.press('b');
  58  |   const box = (await page.getByTestId('main-composite-canvas').boundingBox())!;
  59  |   await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.3);
> 60  |   await expect(page.getByTestId('piximotion-panel').getByRole('status').filter({ hasText: /source artwork changed/ })).toHaveText(/source artwork changed/);
      |                                                                          ^ Error: expect(locator).toHaveText(expected) failed
  61  |   await expect(page.getByRole('button', { name: 'BAKE TO TIMELINE', exact: true })).toBeDisabled();
  62  |   await expect.poll(() => pixels(page)).not.toEqual(original);
  63  |   await expect(page.getByTestId('main-composite-canvas')).toHaveCSS('opacity', '1');
  64  |   await page.getByTestId('piximotion-panel').getByRole('button', { name: 'Cancel (Escape)', exact: true }).click();
  65  |   await page.getByTestId('undo-button').click(); await expect.poll(() => pixels(page)).toEqual(original);
  66  |   await capture(page); await setArc(page);
  67  |   await expect(page.getByTestId('main-composite-canvas')).toHaveCSS('opacity', '0');
  68  |   await expect.poll(() => pixels(page, 'piximotion-preview-canvas')).toEqual(translated(original, 4));
  69  |   await page.getByRole('button', { name: 'BAKE TO TIMELINE', exact: true }).click();
  70  |   await expect(page.getByTestId('piximotion-panel')).toBeHidden(); await expect(frame(page, 3)).toBeVisible();
  71  |   await expect(frame(page, 4)).toHaveCount(0); await expect.poll(() => pixels(page)).toEqual(translated(original, 4));
  72  |   await frame(page, 2).click(); await expect.poll(() => pixels(page)).toEqual(translated(original, 2));
  73  |   await frame(page, 1).click(); await expect.poll(() => pixels(page)).toEqual(original);
  74  |   await page.getByTestId('undo-button').click(); await expect(frame(page, 2)).toHaveCount(0);
  75  |   await expect.poll(() => pixels(page)).toEqual(original);
  76  |   await page.getByTestId('redo-button').click(); await expect(frame(page, 3)).toBeVisible();
  77  |   await expect(frame(page, 1)).toHaveClass(/timeline-frame-active-bg/);
  78  |   await frame(page, 3).click();
  79  |   await expect.poll(() => pixels(page)).toEqual(translated(original, 4));
  80  |   await page.getByTestId('save-button').click();
  81  |   await expect(page.getByRole('status').filter({ hasText: /^Changes saved$/ })).toBeVisible();
  82  |   await page.reload(); await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  83  |   await expect(frame(page, 3)).toBeVisible(); await frame(page, 3).click();
  84  |   await expect.poll(() => pixels(page)).toEqual(translated(original, 4));
  85  |   await frame(page, 2).click(); await expect.poll(() => pixels(page)).toEqual(translated(original, 2));
  86  |   await expect(page.getByTestId('piximotion-panel')).toHaveCount(0);
  87  | });
  88  | 
  89  | test('compiled frame duplication never retargets a captured part and bake Undo restores the previously active copy', async ({ page }) => {
  90  |   const original = await readyWithMark(page); await capture(page); await setArc(page);
  91  |   await page.locator('summary').filter({ hasText: 'Frame actions' }).click();
  92  |   await page.getByRole('button', { name: 'Duplicate frame', exact: true }).click(); await expect(frame(page, 2)).toBeVisible();
  93  |   await page.getByRole('button', { name: 'BAKE TO TIMELINE', exact: true }).click();
  94  |   await expect(frame(page, 4)).toBeVisible(); await expect(frame(page, 5)).toHaveCount(0);
  95  |   await expect.poll(() => pixels(page)).toEqual(translated(original, 4));
  96  |   await frame(page, 4).click(); await expect.poll(() => pixels(page)).toEqual(original);
  97  |   await page.getByTestId('undo-button').click(); await expect(frame(page, 3)).toHaveCount(0);
  98  |   await expect(frame(page, 2)).toHaveClass(/timeline-frame-active-bg/); await expect.poll(() => pixels(page)).toEqual(original);
  99  |   await page.getByTestId('redo-button').click(); await expect(frame(page, 4)).toHaveClass(/timeline-frame-active-bg/);
  100 |   await frame(page, 3).click();
  101 |   await expect.poll(() => pixels(page)).toEqual(translated(original, 4));
  102 | });
  103 | 
```