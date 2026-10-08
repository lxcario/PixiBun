# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: publication-odd-pivot-browser.spec.ts >> odd-sized centered motion preserves a square on a quarter turn and Center Pivot restores that center
- Location: artifacts\publication-odd-pivot-browser.spec.ts:4:5

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 4
+ Received  + 4

@@ -521,14 +521,10 @@
    0,
    0,
    0,
    0,
    0,
-   0,
-   0,
-   0,
-   0,
    58,
    46,
    76,
    255,
    58,
@@ -793,10 +789,14 @@
    255,
    58,
    46,
    76,
    255,
+   0,
+   0,
+   0,
+   0,
    0,
    0,
    0,
    0,
    0,

Call Log:
- Timeout 10000ms exceeded while waiting on the predicate
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
        - button "Save now" [ref=e188]:
          - generic [ref=e189]: Save
        - generic [ref=e191]:
          - button "Undo last action" [ref=e193] [cursor=pointer]
          - generic [ref=e194]:
            - button "Redo last action" [disabled]
      - group "Drawing controls"
      - generic [ref=e195]:
        - group "Canvas controls" [ref=e196]:
          - group "Mirror drawing" [ref=e197]:
            - generic [ref=e198]: Mirror
            - button "Horizontal symmetry" [ref=e200] [cursor=pointer]
            - button "Vertical symmetry" [ref=e202] [cursor=pointer]
          - generic [ref=e204]:
            - generic [ref=e205]:
              - button "Zoom Out" [ref=e206] [cursor=pointer]: −
              - button "Zoom 1600 percent. Choose zoom level" [ref=e208]: 1600%
              - button "Zoom In" [ref=e209] [cursor=pointer]: +
            - button "Fit Canvas to Viewport (Ctrl+0)" [ref=e211] [cursor=pointer]: Fit
          - button "View options menu" [ref=e215] [cursor=pointer]:
            - generic [ref=e216]:
              - generic [ref=e217]: View
              - generic "1 active view options" [ref=e218]
            - generic [ref=e219]: ▼
        - group "Workspace presets" [ref=e220]:
          - combobox "Workspace layout" [ref=e221] [cursor=pointer]:
            - option "Drawing" [selected]
            - option "Animation"
            - option "Lighting"
        - group "Studio settings and help" [ref=e222]:
          - button "Studio options" [ref=e223] [cursor=pointer]:
            - generic [ref=e224]: Studio
            - generic [ref=e225]: ▼
        - button "Export drawing" [ref=e227]:
          - generic [ref=e228]: Export
    - status [ref=e230]: Changes saved
    - generic [ref=e231]:
      - complementary [ref=e233]:
        - generic [ref=e235]:
          - group "Drawing" [ref=e236]:
            - button "Pen" [ref=e238] [cursor=pointer]
            - button "Bézier Curve" [ref=e240] [cursor=pointer]
            - button "Eraser" [ref=e242] [cursor=pointer]
            - button "Flood Fill" [ref=e244] [cursor=pointer]
            - button "Pixel Gradient" [ref=e246] [cursor=pointer]
            - button "Dither Brush" [ref=e248] [cursor=pointer]
            - button "Color Replace" [ref=e250] [cursor=pointer]
            - button "Erase Sampled Color" [ref=e252] [cursor=pointer]
          - group "Selection" [ref=e253]:
            - button "Marquee Box" [pressed] [ref=e256] [cursor=pointer]
            - button "Lasso Select" [ref=e258] [cursor=pointer]
            - button "Magic Wand" [ref=e260] [cursor=pointer]
          - group "Geometry" [ref=e261]:
            - button "Line" [ref=e264] [cursor=pointer]
            - button "2:1 Iso Line" [ref=e266] [cursor=pointer]
            - button "Rectangle" [ref=e268] [cursor=pointer]
            - button "Ellipse" [ref=e270] [cursor=pointer]
          - group "2.5D Sculpt" [ref=e271]:
            - button "Normal Chisel" [ref=e274] [cursor=pointer]
          - group "Utility" [ref=e275]:
            - button "Eyedropper" [ref=e278] [cursor=pointer]
        - generic [ref=e279]:
          - generic [ref=e280]:
            - button "Swap colors (X)" [ref=e281] [cursor=pointer]: ⇄
            - button "Reset default black and white colors (Shift+D)" [ref=e282] [cursor=pointer]
            - 'button "Secondary color #C792DF. Click for quick swatches, double click for picker, right click to swap" [ref=e283] [cursor=pointer]'
            - 'button "Primary color #3A2E4C. Click for quick swatches, double click for picker, right click to swap" [ref=e284] [cursor=pointer]'
          - generic [ref=e285]:
            - generic [ref=e286]:
              - 'button "#DDDFDF (Click: Primary | Right-click: Secondary)" [ref=e287] [cursor=pointer]'
              - 'button "#DDDDDF (Click: Primary | Right-click: Secondary)" [ref=e288] [cursor=pointer]'
              - 'button "#D0C4DF (Click: Primary | Right-click: Secondary)" [ref=e289] [cursor=pointer]'
              - 'button "#DCABDF (Click: Primary | Right-click: Secondary)" [ref=e290] [cursor=pointer]'
            - button "Quick Swatches Flyout" [ref=e291] [cursor=pointer]
      - main "Pixel art canvas workspace" [ref=e295]:
        - application "Pixel art drawing canvas. Use mouse or stylus to paint, arrow keys to pan viewport or nudge selection, and Alt+drag to pan." [ref=e296]:
          - generic:
            - generic [ref=e298]:
              - generic "Drag to translate (Arrow keys to nudge)" [ref=e299]
              - generic "Drag to rotate (Hold Shift to snap 15°)" [ref=e301]
              - generic:
                - generic: 90.0°
                - generic: "|"
                - generic: +0,+0
            - generic "Draggable Motion Pivot (Place at joint/shoulder/elbow)" [ref=e304]
            - generic [ref=e310]:
              - button "END POSE" [ref=e311]
              - button "BAKE" [ref=e313]
              - button "✕" [ref=e314]
      - complementary [ref=e316]:
        - generic [ref=e317]:
          - button "Tools" [pressed] [ref=e318]
          - button "Layers" [ref=e320]
          - button "Palette" [ref=e322]
          - button "PixiTools" [ref=e324]:
            - generic [ref=e325]: FX
        - generic [ref=e327]:
          - generic [ref=e330]:
            - 'heading "PixiMotion: Rigid Part" [level=2] [ref=e331]'
            - paragraph [ref=e332]: Arc Pose Transform → Cel Bake
          - region "Saved motion rigs" [ref=e333]:
            - heading "Saved motion rigs" [level=3] [ref=e334]
            - generic [ref=e335]:
              - generic [ref=e336]:
                - text: Rig name
                - textbox "Rig name" [ref=e337]: Motion 1
              - button "Save motion rig" [ref=e338]
            - paragraph [ref=e339]: Each rig keeps one part, its selection, pivot and poses. Opening checks the saved artwork.
          - generic [ref=e340]:
            - button "Undo motion edit" [ref=e341]:
              - generic [ref=e342]: Undo pose
            - button "Redo motion edit" [disabled] [ref=e343]:
              - generic [ref=e344]: Redo pose
            - button "Reset Pose" [ref=e345]
          - paragraph [ref=e347]: Undo/Redo edits this motion session. Cancel returns to drawing; Bake creates editable cels.
          - generic [ref=e348]:
            - generic [ref=e349]: Target Pose
            - generic [ref=e350]:
              - button "● START" [ref=e351]
              - button "● END" [pressed] [ref=e353]
          - generic [ref=e355]:
            - generic [ref=e356]:
              - generic [ref=e357]: End Pose Transform
              - generic [ref=e358]: END
            - generic [ref=e359]:
              - generic [ref=e360]:
                - generic [ref=e361]: Rotation
                - generic [ref=e362]: 90°
              - slider "Pose rotation" [ref=e363] [cursor=pointer]: "90"
              - generic [ref=e364]:
                - button "-90°" [ref=e365]
                - button "-45°" [ref=e366]
                - button "0°" [ref=e367]
                - button "45°" [ref=e368]
                - button "90°" [ref=e369]
            - generic [ref=e370]:
              - generic [ref=e371]:
                - generic [ref=e372]: Translation X
                - generic [ref=e373]: 0px
              - slider "Pose translation X" [ref=e374] [cursor=pointer]: "0"
            - generic [ref=e375]:
              - generic [ref=e376]:
                - generic [ref=e377]: Translation Y
                - generic [ref=e378]: 0px
              - slider "Pose translation Y" [ref=e379] [cursor=pointer]: "0"
            - generic [ref=e380]:
              - generic [ref=e381]: Rotation degrees
              - generic [ref=e382]:
                - button "Decrease value" [ref=e383] [cursor=pointer]: "-"
                - spinbutton "Rotation degrees" [active] [ref=e385]: "90"
                - button "Increase value" [ref=e386] [cursor=pointer]: +
            - generic [ref=e387]:
              - generic [ref=e388]: Position X pixels
              - generic [ref=e389]:
                - button "Decrease value" [ref=e390] [cursor=pointer]: "-"
                - spinbutton "Position X pixels" [ref=e392]: "0"
                - button "Increase value" [ref=e393] [cursor=pointer]: +
            - generic [ref=e394]:
              - generic [ref=e395]: Position Y pixels
              - generic [ref=e396]:
                - button "Decrease value" [ref=e397] [cursor=pointer]: "-"
                - spinbutton "Position Y pixels" [ref=e399]: "0"
                - button "Increase value" [ref=e400] [cursor=pointer]: +
            - generic [ref=e401]:
              - generic [ref=e402]: Pivot X pixels
              - generic [ref=e403]:
                - button "Decrease value" [ref=e404] [cursor=pointer]: "-"
                - spinbutton "Pivot X pixels" [ref=e406]: "5"
                - button "Increase value" [ref=e407] [cursor=pointer]: +
            - generic [ref=e408]:
              - generic [ref=e409]: Pivot Y pixels
              - generic [ref=e410]:
                - button "Decrease value" [ref=e411] [cursor=pointer]: "-"
                - spinbutton "Pivot Y pixels" [ref=e413]: "5"
                - button "Increase value" [ref=e414] [cursor=pointer]: +
            - generic [ref=e415]:
              - generic [ref=e416]:
                - text: "Pivot:"
                - generic [ref=e417]: 5, 5
              - button "Center Pivot" [ref=e418] [cursor=pointer]
          - generic [ref=e419]:
            - heading "Arc Interpolation" [level=3] [ref=e420]
            - paragraph [ref=e421]: "Each baked cel keeps the source duration: 100 ms. Preview follows the same timing."
            - generic [ref=e422]:
              - generic [ref=e423]:
                - generic [ref=e424]: Generated Frames
                - generic [ref=e425]: "5"
              - slider "Motion frame count" [ref=e426] [cursor=pointer]: "5"
            - generic [ref=e427]:
              - generic [ref=e428]: Motion frames
              - generic [ref=e429]:
                - button "Decrease value" [ref=e430] [cursor=pointer]: "-"
                - spinbutton "Motion frames" [ref=e432]: "5"
                - button "Increase value" [ref=e433] [cursor=pointer]: +
            - generic [ref=e434]:
              - text: Easing Curve
              - combobox "Motion easing" [ref=e435] [cursor=pointer]:
                - option "Linear (Constant speed)"
                - option "Ease In (Accelerate)"
                - option "Ease Out (Decelerate)"
                - option "Ease In-Out (Natural arc)" [selected]
          - generic [ref=e436]:
            - generic [ref=e437]:
              - generic [ref=e438]: Arc Preview
              - generic [ref=e439]: Editing END
            - generic [ref=e440]:
              - generic [ref=e441]:
                - generic [ref=e442]: "[START]"
                - generic [ref=e443]: "[END]"
              - slider "Arc preview scrub" [ref=e444] [cursor=pointer]: "4"
            - button "Play Loop" [ref=e446]
          - generic [ref=e448]:
            - button "BAKE TO TIMELINE" [ref=e449]
            - button "Cancel (Escape)" [ref=e452]
    - contentinfo [ref=e456]:
      - generic [ref=e457]:
        - generic [ref=e458]:
          - generic [ref=e459]:
            - button "Play" [ref=e460]
            - button "Previous Frame (,)" [ref=e463]
            - button "Next Frame (.)" [ref=e465]
            - button "Repeat" [ref=e467]
          - generic [ref=e471]:
            - button "Preview speed" [ref=e473]:
              - generic [ref=e474]: Preview
              - generic [ref=e475]: 1×
              - generic [ref=e476]: ▾
            - generic [ref=e477]:
              - generic [ref=e478]: Frame time
              - spinbutton "Active frame duration in milliseconds" [ref=e479]: "100"
              - generic [ref=e480]: ms
            - button "Onion Skin" [ref=e481]
            - button "Onion skin settings" [ref=e484]: ⚙
        - generic [ref=e485]:
          - button "+ Frame" [ref=e486]:
            - generic [ref=e487]: Frame
          - group [ref=e489]:
            - generic "Frame actions" [ref=e490] [cursor=pointer]:
              - text: Frame actions
              - generic [ref=e491]: ▾
          - button "Collapse Timeline" [ref=e493]:
            - generic [ref=e494]:
              - generic [ref=e495]: ▼
              - generic [ref=e496]: Collapse
      - generic [ref=e497]:
        - 'button "Select frame 1. Duration: 100ms. Drag to reorder." [ref=e499]':
          - generic:
            - generic: "#1"
            - generic: 100ms
        - button "Clips" [ref=e500]
    - generic [ref=e502]:
      - generic [ref=e503]: "X: — Y: —"
      - generic [ref=e506]: 32×32
      - generic [ref=e509]: 1600%
      - generic [ref=e511]: Frame 1/1
      - generic [ref=e513]: Base Layer
      - generic [ref=e514]: "Sel: 3×3"
      - generic [ref=e516]: select-box
      - status "All changes saved to local storage" [ref=e521]:
        - generic [ref=e523]: Saved
  - alert [ref=e524]
```

# Test source

```ts
  1  | import { expect, test, type Page } from '@playwright/test';
  2  | const pixels=(page:Page,id='main-composite-canvas')=>page.getByTestId(id).evaluate((c:HTMLCanvasElement)=>Array.from(c.getContext('2d')!.getImageData(0,0,c.width,c.height).data));
  3  | async function numeric(page:Page,label:string,value:string){const field=page.getByRole('spinbutton',{name:label,exact:true});await field.fill(value);await field.press('Enter');await expect(field).toHaveValue(value);}
  4  | test('odd-sized centered motion preserves a square on a quarter turn and Center Pivot restores that center',async({page})=>{
  5  |   await page.setViewportSize({width:1600,height:1100});await page.goto('/studio');await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  6  |   const canvas=page.getByTestId('main-composite-canvas');await expect.poll(()=>canvas.evaluate((c:HTMLCanvasElement)=>c.width)).toBe(32);
  7  |   const box=(await canvas.boundingBox())!,point=(x:number,y:number)=>({x:box.x+box.width*x/32,y:box.y+box.height*y/32});
  8  |   for(const row of [4,5,6]){const start=point(4.25,row+0.25),end=point(6.25,row+0.25);await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(end.x,end.y,{steps:3});await page.mouse.up();}
  9  |   await expect.poll(async()=> (await pixels(page)).filter((v,i)=>i%4===3&&v>0).length).toBe(9);const original=await pixels(page);
  10 |   await page.getByTestId('select-box-tool').click();const start=point(4.25,4.25),end=point(6.75,6.75);await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(end.x,end.y,{steps:3});await page.mouse.up();
  11 |   await page.getByTestId('tab-tools').click();await page.getByTestId('create-motion-part-btn').click();await expect(page.getByTestId('piximotion-panel')).toBeVisible();
  12 |   await numeric(page,'Rotation degrees','90');await expect(page.getByTestId('piximotion-preview-canvas')).toHaveAttribute('aria-busy','false');
> 13 |   await expect.poll(()=>pixels(page,'piximotion-preview-canvas')).toEqual(original);
     |                                                                   ^ Error: expect(received).toEqual(expected) // deep equality
  14 |   await expect(page.getByRole('spinbutton',{name:'Pivot X pixels',exact:true})).toHaveValue('5.5');await expect(page.getByRole('spinbutton',{name:'Pivot Y pixels',exact:true})).toHaveValue('5.5');
  15 |   await numeric(page,'Pivot X pixels','0');await page.getByRole('button',{name:'Center Pivot',exact:true}).click();
  16 |   await expect(page.getByRole('spinbutton',{name:'Pivot X pixels',exact:true})).toHaveValue('5.5');await expect.poll(()=>pixels(page,'piximotion-preview-canvas')).toEqual(original);
  17 |   await numeric(page,'Motion frames','3');await page.getByRole('button',{name:'BAKE TO TIMELINE',exact:true}).click();await expect(page.getByTestId('piximotion-panel')).toBeHidden();await expect.poll(()=>pixels(page)).toEqual(original);
  18 |   await page.getByTestId('undo-button').click();await expect(page.getByRole('button',{name:/^Select frame \d+\./})).toHaveCount(1);await expect.poll(()=>pixels(page)).toEqual(original);
  19 |   await page.getByTestId('redo-button').click();await page.getByRole('button',{name:/Select frame 3\./}).click();await expect.poll(()=>pixels(page)).toEqual(original);
  20 | });
  21 | 
```