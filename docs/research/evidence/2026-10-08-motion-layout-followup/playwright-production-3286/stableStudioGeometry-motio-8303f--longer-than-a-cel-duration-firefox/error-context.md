# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: stableStudioGeometry.spec.ts >> motion preview advances when worker results take longer than a cel duration
- Location: tests\production\stableStudioGeometry.spec.ts:76:5

# Error details

```
Error: expect(received).not.toBe(expected) // Object.is equality

Expected: not "0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,58,46,76,255,58,46,76,255,58,46,76,255,58,46,76,255,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,58,46,76,255,58,46,76,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,58,46,76,255,58,46,76,255,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,58,46,76,255,255,255,255,255,255,255,255,255,237,232,244,255,237,232,244,255,237,232,244,255,237,232,244,255,255,255,255,255,255,255,255,255,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,58,46,76,255,255,255,255,255,237,232,244,255,237,232,244,255,237,232,244,255,237,232,244,255,237,232,244,255,237,232,244,255,237,232,244,255,237,232,244,255,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,58,46,76,255,237,232,244,255,237,232,244,255,237,232,244,255,237,232,244,255,237,232,244,255,237,232,244,255,237,232,244,255,237,232,244,255,237,232,244,255,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,58,46,76,255,237,232,244,255,237,232,244,255,58,46,76,255,58,46,76,255,237,232,244,255,237,232,244,255,58,46,76,255,58,46,76,255,237,232,244,255,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,58,46,76,255,237,232,244,255,237,232,244,255,237,232,244,255,237,232,244,255,237,232,244,255,237,232,244,255,237,232,244,255,237,232,244,255,237,232,244,255,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,58,46,76,255,237,232,244,255,224,140,166,255,237,232,244,255,237,232,244,255,237,232,244,255,237,232,244,255,237,232,244,255,237,232,244,255,224,140,166,255,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,58,46,76,255,255,255,255,255,237,232,244,255,237,232,244,255,237,232,244,255,216,154,85,255,240,190,124,255,240,190,124,255,216,154,85,255,237,232,244,255,237,232,244,255,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,58,46,76,255,255,255,255,255,237,232,244,255,237,232,244,255,216,154,85,255,240,190,124,255,251,233,198,255,251,233,198,255,240,190,124,255,240,190,124,255,216,154,85,255,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,58,46,76,255,237,232,244,255,237,232,244,255,237,232,244,255,216,154,85,255,240,190,124,255,240,190,124,255,216,154,85,255,237,232,244,255,237,232,244,255,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,58,46,76,255,237,232,244,255,237,232,244,255,237,232,244,255,237,232,244,255,237,232,244,255,237,232,244,255,237,232,244,255,237,232,244,255,237,232,244,255,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,58,46,76,255,205,191,223,255,205,191,223,255,205,191,223,255,205,191,223,255,205,191,223,255,205,191,223,255,205,191,223,255,205,191,223,255,205,191,223,255,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,58,46,76,255,237,232,244,255,205,191,223,255,58,46,76,255,237,232,244,255,237,232,244,255,205,191,223,255,58,46,76,255,237,232,244,255,205,191,223,255,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,58,46,76,255,58,46,76,255,0,0,0,0,58,46,76,255,58,46,76,255,0,0,0,0,0,0,0,0,58,46,76,255,58,46,76,255,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0"

Call Log:
- Timeout 4000ms exceeded while waiting on the predicate
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
        - button "Rename project Hearth Ghost" [ref=e180] [cursor=pointer]: Hearth Ghost
        - generic "Canvas size · change it in File" [ref=e181]: 16×16
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
              - 'button "Quick color #3a2e4c" [ref=e296] [cursor=pointer]'
              - 'button "Quick color #c792df" [ref=e297] [cursor=pointer]'
              - 'button "Quick color #dcabdf" [ref=e298] [cursor=pointer]'
              - 'button "Quick color #664b68" [ref=e299] [cursor=pointer]'
            - button "Quick Swatches Flyout" [ref=e300] [cursor=pointer]
      - main "Pixel art canvas workspace" [ref=e304]:
        - application "Pixel art drawing canvas. Use mouse or stylus to paint, arrow keys to pan viewport or nudge selection, and Alt+drag to pan." [ref=e305]:
          - generic:
            - generic [ref=e307]:
              - generic "Drag to translate (Arrow keys to nudge)" [ref=e308]
              - generic:
                - generic: 0.0°
                - generic: "|"
                - generic: +4,+0
            - generic "Draggable Motion Pivot (Place at joint/shoulder/elbow)" [ref=e310]
            - generic [ref=e316]:
              - button "END POSE" [ref=e317]
              - button "BAKE" [ref=e319]
              - button "✕" [ref=e320]
      - complementary [ref=e322]:
        - generic [ref=e323]:
          - button "Tools" [pressed] [ref=e324]
          - button "Layers" [ref=e326]
          - button "Palette" [ref=e328]
          - button "PixiTools" [ref=e330]:
            - generic [ref=e331]: FX
        - generic [ref=e333]:
          - generic [ref=e336]:
            - 'heading "PixiMotion: Rigid Part" [level=2] [ref=e337]'
            - paragraph [ref=e338]: Arc Pose Transform → Cel Bake
          - region "Saved motion rigs" [ref=e339]:
            - heading "Saved motion rigs" [level=3] [ref=e340]
            - generic [ref=e341]:
              - generic [ref=e342]:
                - text: Rig name
                - textbox "Rig name" [ref=e343]: Motion 1
              - button "Save motion rig" [ref=e344]
            - paragraph [ref=e345]: Each rig keeps one part, its selection, pivot and poses. Opening checks the saved artwork.
            - status [ref=e346]
          - status [ref=e347]: 2 painted pixels leave the canvas. Adjust the pose or enlarge the canvas before baking.
          - generic [ref=e348]:
            - button "Undo motion edit" [ref=e349]:
              - generic [ref=e350]: Undo pose
            - button "Redo motion edit" [disabled] [ref=e351]:
              - generic [ref=e352]: Redo pose
            - button "Reset Pose" [ref=e353]
          - paragraph [ref=e355]: Undo/Redo edits this motion session. Cancel returns to drawing; Bake creates editable cels.
          - generic [ref=e356]:
            - generic [ref=e357]: Target Pose
            - generic [ref=e358]:
              - button "● START" [ref=e359]
              - button "● END" [pressed] [ref=e361]
          - generic [ref=e363]:
            - generic [ref=e364]:
              - generic [ref=e365]: End Pose Transform
              - generic [ref=e366]: END
            - generic [ref=e367]:
              - generic [ref=e368]:
                - generic [ref=e369]: Rotation
                - generic [ref=e370]: 0°
              - slider "Pose rotation" [ref=e371] [cursor=pointer]: "0"
              - generic [ref=e372]:
                - button "-90°" [ref=e373]
                - button "-45°" [ref=e374]
                - button "0°" [ref=e375]
                - button "45°" [ref=e376]
                - button "90°" [ref=e377]
            - generic [ref=e378]:
              - generic [ref=e379]:
                - generic [ref=e380]: Translation X
                - generic [ref=e381]: 4px
              - slider "Pose translation X" [ref=e382] [cursor=pointer]: "4"
            - generic [ref=e383]:
              - generic [ref=e384]:
                - generic [ref=e385]: Translation Y
                - generic [ref=e386]: 0px
              - slider "Pose translation Y" [ref=e387] [cursor=pointer]: "0"
            - generic [ref=e388]:
              - generic [ref=e389]: Rotation degrees
              - generic [ref=e390]:
                - button "Decrease value" [ref=e391] [cursor=pointer]: "-"
                - spinbutton "Rotation degrees" [ref=e393]: "0"
                - button "Increase value" [ref=e394] [cursor=pointer]: +
            - generic [ref=e395]:
              - generic [ref=e396]: Position X pixels
              - generic [ref=e397]:
                - button "Decrease value" [ref=e398] [cursor=pointer]: "-"
                - spinbutton "Position X pixels" [ref=e400]: "4"
                - button "Increase value" [ref=e401] [cursor=pointer]: +
            - generic [ref=e402]:
              - generic [ref=e403]: Position Y pixels
              - generic [ref=e404]:
                - button "Decrease value" [ref=e405] [cursor=pointer]: "-"
                - spinbutton "Position Y pixels" [ref=e407]: "0"
                - button "Increase value" [ref=e408] [cursor=pointer]: +
            - generic [ref=e409]:
              - generic [ref=e410]: Pivot X pixels
              - generic [ref=e411]:
                - button "Decrease value" [ref=e412] [cursor=pointer]: "-"
                - spinbutton "Pivot X pixels" [ref=e414]: "8"
                - button "Increase value" [ref=e415] [cursor=pointer]: +
            - generic [ref=e416]:
              - generic [ref=e417]: Pivot Y pixels
              - generic [ref=e418]:
                - button "Decrease value" [ref=e419] [cursor=pointer]: "-"
                - spinbutton "Pivot Y pixels" [ref=e421]: "8"
                - button "Increase value" [ref=e422] [cursor=pointer]: +
            - generic [ref=e423]:
              - generic [ref=e424]:
                - text: "Pivot:"
                - generic [ref=e425]: 8, 8
              - button "Center Pivot" [ref=e426] [cursor=pointer]
          - generic [ref=e427]:
            - heading "Arc Interpolation" [level=3] [ref=e428]
            - paragraph [ref=e429]: "Each baked cel keeps the source duration: 125 ms. Preview follows the same timing."
            - generic [ref=e430]:
              - generic [ref=e431]:
                - generic [ref=e432]: Generated Frames
                - generic [ref=e433]: "5"
              - slider "Motion frame count" [ref=e434] [cursor=pointer]: "5"
            - generic [ref=e435]:
              - generic [ref=e436]: Motion frames
              - generic [ref=e437]:
                - button "Decrease value" [ref=e438] [cursor=pointer]: "-"
                - spinbutton "Motion frames" [ref=e440]: "5"
                - button "Increase value" [ref=e441] [cursor=pointer]: +
            - generic [ref=e442]:
              - text: Easing Curve
              - combobox "Motion easing" [ref=e443] [cursor=pointer]:
                - option "Linear (Constant speed)"
                - option "Ease In (Accelerate)"
                - option "Ease Out (Decelerate)"
                - option "Ease In-Out (Natural arc)" [selected]
          - generic [ref=e444]:
            - generic [ref=e445]:
              - generic [ref=e446]: Arc Preview
              - generic [ref=e447]: Pose 2 / 5
            - generic [ref=e448]:
              - generic [ref=e449]:
                - generic [ref=e450]: "[START]"
                - generic [ref=e451]: "[END]"
              - slider "Arc preview scrub" [ref=e452] [cursor=pointer]: "1"
            - generic [ref=e453]:
              - button "Pause" [active] [ref=e454]
              - button "Resume Pose" [ref=e456]
          - generic [ref=e457]:
            - button "BAKE TO TIMELINE" [ref=e458]
            - button "Cancel (Escape)" [ref=e461]
    - contentinfo [ref=e465]:
      - generic [ref=e466]:
        - generic [ref=e467]:
          - generic [ref=e468]:
            - button "Play" [ref=e469]
            - button "Previous Frame (,)" [ref=e472]
            - button "Next Frame (.)" [ref=e474]
            - button "Repeat" [ref=e476]
          - generic [ref=e480]:
            - button "Preview speed" [ref=e482]:
              - generic [ref=e483]: Preview
              - generic [ref=e484]: 1×
              - generic [ref=e485]: ▾
            - generic [ref=e486]:
              - generic [ref=e487]: Frame time
              - spinbutton "Active frame duration in milliseconds" [ref=e488]: "125"
              - generic [ref=e489]: ms
            - button "Onion Skin" [ref=e490]
            - button "Onion skin settings" [ref=e493]: ⚙
        - generic [ref=e495]:
          - button "+ Frame" [ref=e496]:
            - generic [ref=e497]: Frame
          - group [ref=e499]:
            - generic "Frame actions" [ref=e500] [cursor=pointer]:
              - text: Frame actions
              - generic [ref=e501]: ▾
          - button "Collapse Timeline" [ref=e503]:
            - generic [ref=e504]:
              - generic [ref=e505]: ▼
              - generic [ref=e506]: Collapse
      - generic [ref=e507]:
        - 'button "Select frame 1. Duration: 125ms. Drag to reorder." [ref=e509]':
          - generic:
            - generic: "#1"
            - generic: 125ms
        - button "Clips" [ref=e510]
    - generic [ref=e512]:
      - generic [ref=e513]: "X: — Y: —"
      - generic [ref=e516]: 16×16
      - generic [ref=e519]: 1600%
      - generic [ref=e521]: Frame 1/1
      - generic [ref=e523]: Base Layer
      - generic [ref=e524]: pen
      - status "All changes saved to local storage" [ref=e529]:
        - generic [ref=e531]: Saved
  - alert [ref=e532]
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
  34  |     })).toBe(true);
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
> 95  |   await expect.poll(signature, { timeout: 4000 }).not.toBe(first);
      |                                                       ^ Error: expect(received).not.toBe(expected) // Object.is equality
  96  |   await page.getByTestId('piximotion-panel').getByRole('button', { name: 'Pause', exact: true }).click(); await expect(preview).toHaveAttribute('aria-busy', 'false');
  97  |   const paused = await signature(); await page.getByRole('button', { name: 'Play Loop', exact: true }).click(); await expect.poll(signature, { timeout: 4000 }).not.toBe(paused);
  98  |   await page.getByRole('button', { name: 'Cancel (Escape)', exact: true }).click(); await expect(preview).toHaveCount(0);
  99  | });
  100 | 
```