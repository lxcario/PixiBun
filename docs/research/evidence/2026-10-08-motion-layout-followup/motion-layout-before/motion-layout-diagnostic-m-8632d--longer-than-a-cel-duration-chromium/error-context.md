# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: motion-layout-diagnostic.spec.ts >> motion preview advances when worker results take longer than a cel duration
- Location: artifacts\motion-layout-diagnostic.spec.ts:2:5

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
              - 'button "#3a2e4c (Click: Primary | Right-click: Secondary)" [ref=e296] [cursor=pointer]'
              - 'button "#c792df (Click: Primary | Right-click: Secondary)" [ref=e297] [cursor=pointer]'
              - 'button "#dcabdf (Click: Primary | Right-click: Secondary)" [ref=e298] [cursor=pointer]'
              - 'button "#664b68 (Click: Primary | Right-click: Secondary)" [ref=e299] [cursor=pointer]'
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
          - generic [ref=e346]:
            - button "Undo motion edit" [ref=e347]:
              - generic [ref=e348]: Undo pose
            - button "Redo motion edit" [disabled] [ref=e349]:
              - generic [ref=e350]: Redo pose
            - button "Reset Pose" [ref=e351]
          - paragraph [ref=e353]: Undo/Redo edits this motion session. Cancel returns to drawing; Bake creates editable cels.
          - generic [ref=e354]:
            - generic [ref=e355]: Target Pose
            - generic [ref=e356]:
              - button "● START" [ref=e357]
              - button "● END" [pressed] [ref=e359]
          - generic [ref=e361]:
            - generic [ref=e362]:
              - generic [ref=e363]: End Pose Transform
              - generic [ref=e364]: END
            - generic [ref=e365]:
              - generic [ref=e366]:
                - generic [ref=e367]: Rotation
                - generic [ref=e368]: 0°
              - slider "Pose rotation" [ref=e369] [cursor=pointer]: "0"
              - generic [ref=e370]:
                - button "-90°" [ref=e371]
                - button "-45°" [ref=e372]
                - button "0°" [ref=e373]
                - button "45°" [ref=e374]
                - button "90°" [ref=e375]
            - generic [ref=e376]:
              - generic [ref=e377]:
                - generic [ref=e378]: Translation X
                - generic [ref=e379]: 4px
              - slider "Pose translation X" [ref=e380] [cursor=pointer]: "4"
            - generic [ref=e381]:
              - generic [ref=e382]:
                - generic [ref=e383]: Translation Y
                - generic [ref=e384]: 0px
              - slider "Pose translation Y" [ref=e385] [cursor=pointer]: "0"
            - generic [ref=e386]:
              - generic [ref=e387]: Rotation degrees
              - generic [ref=e388]:
                - button "Decrease value" [ref=e389] [cursor=pointer]: "-"
                - spinbutton "Rotation degrees" [ref=e391]: "0"
                - button "Increase value" [ref=e392] [cursor=pointer]: +
            - generic [ref=e393]:
              - generic [ref=e394]: Position X pixels
              - generic [ref=e395]:
                - button "Decrease value" [ref=e396] [cursor=pointer]: "-"
                - spinbutton "Position X pixels" [ref=e398]: "4"
                - button "Increase value" [ref=e399] [cursor=pointer]: +
            - generic [ref=e400]:
              - generic [ref=e401]: Position Y pixels
              - generic [ref=e402]:
                - button "Decrease value" [ref=e403] [cursor=pointer]: "-"
                - spinbutton "Position Y pixels" [ref=e405]: "0"
                - button "Increase value" [ref=e406] [cursor=pointer]: +
            - generic [ref=e407]:
              - generic [ref=e408]: Pivot X pixels
              - generic [ref=e409]:
                - button "Decrease value" [ref=e410] [cursor=pointer]: "-"
                - spinbutton "Pivot X pixels" [ref=e412]: "8"
                - button "Increase value" [ref=e413] [cursor=pointer]: +
            - generic [ref=e414]:
              - generic [ref=e415]: Pivot Y pixels
              - generic [ref=e416]:
                - button "Decrease value" [ref=e417] [cursor=pointer]: "-"
                - spinbutton "Pivot Y pixels" [ref=e419]: "8"
                - button "Increase value" [ref=e420] [cursor=pointer]: +
            - generic [ref=e421]:
              - generic [ref=e422]:
                - text: "Pivot:"
                - generic [ref=e423]: 8, 8
              - button "Center Pivot" [ref=e424] [cursor=pointer]
          - generic [ref=e425]:
            - heading "Arc Interpolation" [level=3] [ref=e426]
            - paragraph [ref=e427]: "Each baked cel keeps the source duration: 125 ms. Preview follows the same timing."
            - generic [ref=e428]:
              - generic [ref=e429]:
                - generic [ref=e430]: Generated Frames
                - generic [ref=e431]: "5"
              - slider "Motion frame count" [ref=e432] [cursor=pointer]: "5"
            - generic [ref=e433]:
              - generic [ref=e434]: Motion frames
              - generic [ref=e435]:
                - button "Decrease value" [ref=e436] [cursor=pointer]: "-"
                - spinbutton "Motion frames" [ref=e438]: "5"
                - button "Increase value" [ref=e439] [cursor=pointer]: +
            - generic [ref=e440]:
              - text: Easing Curve
              - combobox "Motion easing" [ref=e441] [cursor=pointer]:
                - option "Linear (Constant speed)"
                - option "Ease In (Accelerate)"
                - option "Ease Out (Decelerate)"
                - option "Ease In-Out (Natural arc)" [selected]
          - generic [ref=e442]:
            - generic [ref=e443]:
              - generic [ref=e444]: Arc Preview
              - generic [ref=e445]: Pose 1 / 5
            - generic [ref=e446]:
              - generic [ref=e447]:
                - generic [ref=e448]: "[START]"
                - generic [ref=e449]: "[END]"
              - slider "Arc preview scrub" [ref=e450] [cursor=pointer]: "0"
            - generic [ref=e451]:
              - button "Pause" [active] [ref=e452]
              - button "Resume Pose" [ref=e454]
          - generic [ref=e455]:
            - button "BAKE TO TIMELINE" [ref=e456]
            - button "Cancel (Escape)" [ref=e459]
    - contentinfo [ref=e463]:
      - generic [ref=e464]:
        - generic [ref=e465]:
          - generic [ref=e466]:
            - button "Play" [ref=e467]
            - button "Previous Frame (,)" [ref=e470]
            - button "Next Frame (.)" [ref=e472]
            - button "Repeat" [ref=e474]
          - generic [ref=e478]:
            - button "Preview speed" [ref=e480]:
              - generic [ref=e481]: Preview
              - generic [ref=e482]: 1×
              - generic [ref=e483]: ▾
            - generic [ref=e484]:
              - generic [ref=e485]: Frame time
              - spinbutton "Active frame duration in milliseconds" [ref=e486]: "125"
              - generic [ref=e487]: ms
            - button "Onion Skin" [ref=e488]
            - button "Onion skin settings" [ref=e491]: ⚙
        - generic [ref=e492]:
          - button "+ Frame" [ref=e493]:
            - generic [ref=e494]: Frame
          - group [ref=e496]:
            - generic "Frame actions" [ref=e497] [cursor=pointer]:
              - text: Frame actions
              - generic [ref=e498]: ▾
          - button "Collapse Timeline" [ref=e500]:
            - generic [ref=e501]:
              - generic [ref=e502]: ▼
              - generic [ref=e503]: Collapse
      - generic [ref=e504]:
        - 'button "Select frame 1. Duration: 125ms. Drag to reorder." [ref=e506]':
          - generic:
            - generic: "#1"
            - generic: 125ms
        - button "Clips" [ref=e507]
    - generic [ref=e509]:
      - generic [ref=e510]: "X: — Y: —"
      - generic [ref=e513]: 16×16
      - generic [ref=e516]: 1600%
      - generic [ref=e518]: Frame 1/1
      - generic [ref=e520]: Base Layer
      - generic [ref=e521]: pen
      - status "All changes saved to local storage" [ref=e526]:
        - generic [ref=e528]: Saved
  - alert [ref=e529]
```

# Test source

```ts
  1  | import { expect, test } from '@playwright/test';
  2  | test('motion preview advances when worker results take longer than a cel duration', async ({ page }) => {
  3  |   await page.addInitScript(() => {
  4  |     const NativeWorker = window.Worker;
  5  |     window.Worker = new Proxy(NativeWorker, { construct(Target, args) {
  6  |       const worker = Reflect.construct(Target, args) as Worker;
  7  |       return new Proxy(worker, { get(target, key) { const value = Reflect.get(target, key, target); return typeof value === 'function' ? value.bind(target) : value; },
  8  |         set(target, key, value) { return Reflect.set(target, key, key === 'onmessage' && typeof value === 'function' ? (event: MessageEvent) => {
  9  |           if (typeof event.data?.result?.destX === 'number') setTimeout(() => value.call(target, event), 400); else value.call(target, event);
  10 |         } : value, target); } });
  11 |     } });
  12 |   });
  13 |   await page.setViewportSize({ width: 1600, height: 1000 });
  14 |   await page.goto('/studio?template=hearth-ghost');
  15 |   await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  16 |   await page.getByTestId('tab-tools').click(); await page.getByTestId('create-motion-part-btn').click();
  17 |   const end = page.getByRole('spinbutton', { name: 'Position X pixels', exact: true }); await end.fill('4'); await end.press('Enter');
  18 |   const preview = page.getByTestId('piximotion-preview-canvas'); await expect(preview).toHaveAttribute('aria-busy', 'false');
  19 |   const signature = () => preview.evaluate((c: HTMLCanvasElement) => Array.from(c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data).join(','));
  20 |   const first = await signature(); await page.getByRole('button', { name: 'Play Loop', exact: true }).click();
> 21 |   await expect.poll(signature, { timeout: 4000 }).not.toBe(first);
     |                                                       ^ Error: expect(received).not.toBe(expected) // Object.is equality
  22 |   await page.getByRole('button', { name: 'Cancel (Escape)', exact: true }).click(); await expect(preview).toHaveCount(0);
  23 | });
  24 | 
```