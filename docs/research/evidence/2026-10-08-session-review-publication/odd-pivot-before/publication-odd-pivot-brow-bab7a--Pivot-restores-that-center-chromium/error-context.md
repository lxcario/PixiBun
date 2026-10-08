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
          - generic:
            - generic [ref=e292]:
              - generic "Drag to translate (Arrow keys to nudge)" [ref=e293]
              - generic "Drag to rotate (Hold Shift to snap 15°)" [ref=e295]
              - generic:
                - generic: 90.0°
                - generic: "|"
                - generic: +0,+0
            - generic "Draggable Motion Pivot (Place at joint/shoulder/elbow)" [ref=e298]
            - generic [ref=e304]:
              - button "END POSE" [ref=e305]
              - button "BAKE" [ref=e307]
              - button "✕" [ref=e308]
      - complementary [ref=e310]:
        - generic [ref=e311]:
          - button "Tools" [pressed] [ref=e312]
          - button "Layers" [ref=e314]
          - button "Palette" [ref=e316]
          - button "PixiTools" [ref=e318]:
            - generic [ref=e319]: FX
        - generic [ref=e321]:
          - generic [ref=e324]:
            - 'heading "PixiMotion: Rigid Part" [level=2] [ref=e325]'
            - paragraph [ref=e326]: Arc Pose Transform → Cel Bake
          - region "Saved motion rigs" [ref=e327]:
            - heading "Saved motion rigs" [level=3] [ref=e328]
            - generic [ref=e329]:
              - generic [ref=e330]:
                - text: Rig name
                - textbox "Rig name" [ref=e331]: Motion 1
              - button "Save motion rig" [ref=e332]
            - paragraph [ref=e333]: Each rig keeps one part, its selection, pivot and poses. Opening checks the saved artwork.
          - generic [ref=e334]:
            - button "Undo motion edit" [ref=e335]:
              - generic [ref=e336]: Undo pose
            - button "Redo motion edit" [disabled] [ref=e337]:
              - generic [ref=e338]: Redo pose
            - button "Reset Pose" [ref=e339]
          - paragraph [ref=e341]: Undo/Redo edits this motion session. Cancel returns to drawing; Bake creates editable cels.
          - generic [ref=e342]:
            - generic [ref=e343]: Target Pose
            - generic [ref=e344]:
              - button "● START" [ref=e345]
              - button "● END" [pressed] [ref=e347]
          - generic [ref=e349]:
            - generic [ref=e350]:
              - generic [ref=e351]: End Pose Transform
              - generic [ref=e352]: END
            - generic [ref=e353]:
              - generic [ref=e354]:
                - generic [ref=e355]: Rotation
                - generic [ref=e356]: 90°
              - slider "Pose rotation" [ref=e357] [cursor=pointer]: "90"
              - generic [ref=e358]:
                - button "-90°" [ref=e359]
                - button "-45°" [ref=e360]
                - button "0°" [ref=e361]
                - button "45°" [ref=e362]
                - button "90°" [ref=e363]
            - generic [ref=e364]:
              - generic [ref=e365]:
                - generic [ref=e366]: Translation X
                - generic [ref=e367]: 0px
              - slider "Pose translation X" [ref=e368] [cursor=pointer]: "0"
            - generic [ref=e369]:
              - generic [ref=e370]:
                - generic [ref=e371]: Translation Y
                - generic [ref=e372]: 0px
              - slider "Pose translation Y" [ref=e373] [cursor=pointer]: "0"
            - generic [ref=e374]:
              - generic [ref=e375]: Rotation degrees
              - generic [ref=e376]:
                - button "Decrease value" [ref=e377] [cursor=pointer]: "-"
                - spinbutton "Rotation degrees" [active] [ref=e379]: "90"
                - button "Increase value" [ref=e380] [cursor=pointer]: +
            - generic [ref=e381]:
              - generic [ref=e382]: Position X pixels
              - generic [ref=e383]:
                - button "Decrease value" [ref=e384] [cursor=pointer]: "-"
                - spinbutton "Position X pixels" [ref=e386]: "0"
                - button "Increase value" [ref=e387] [cursor=pointer]: +
            - generic [ref=e388]:
              - generic [ref=e389]: Position Y pixels
              - generic [ref=e390]:
                - button "Decrease value" [ref=e391] [cursor=pointer]: "-"
                - spinbutton "Position Y pixels" [ref=e393]: "0"
                - button "Increase value" [ref=e394] [cursor=pointer]: +
            - generic [ref=e395]:
              - generic [ref=e396]: Pivot X pixels
              - generic [ref=e397]:
                - button "Decrease value" [ref=e398] [cursor=pointer]: "-"
                - spinbutton "Pivot X pixels" [ref=e400]: "5"
                - button "Increase value" [ref=e401] [cursor=pointer]: +
            - generic [ref=e402]:
              - generic [ref=e403]: Pivot Y pixels
              - generic [ref=e404]:
                - button "Decrease value" [ref=e405] [cursor=pointer]: "-"
                - spinbutton "Pivot Y pixels" [ref=e407]: "5"
                - button "Increase value" [ref=e408] [cursor=pointer]: +
            - generic [ref=e409]:
              - generic [ref=e410]:
                - text: "Pivot:"
                - generic [ref=e411]: 5, 5
              - button "Center Pivot" [ref=e412] [cursor=pointer]
          - generic [ref=e413]:
            - heading "Arc Interpolation" [level=3] [ref=e414]
            - paragraph [ref=e415]: "Each baked cel keeps the source duration: 100 ms. Preview follows the same timing."
            - generic [ref=e416]:
              - generic [ref=e417]:
                - generic [ref=e418]: Generated Frames
                - generic [ref=e419]: "5"
              - slider "Motion frame count" [ref=e420] [cursor=pointer]: "5"
            - generic [ref=e421]:
              - generic [ref=e422]: Motion frames
              - generic [ref=e423]:
                - button "Decrease value" [ref=e424] [cursor=pointer]: "-"
                - spinbutton "Motion frames" [ref=e426]: "5"
                - button "Increase value" [ref=e427] [cursor=pointer]: +
            - generic [ref=e428]:
              - text: Easing Curve
              - combobox "Motion easing" [ref=e429] [cursor=pointer]:
                - option "Linear (Constant speed)"
                - option "Ease In (Accelerate)"
                - option "Ease Out (Decelerate)"
                - option "Ease In-Out (Natural arc)" [selected]
          - generic [ref=e430]:
            - generic [ref=e431]:
              - generic [ref=e432]: Arc Preview
              - generic [ref=e433]: Editing END
            - generic [ref=e434]:
              - generic [ref=e435]:
                - generic [ref=e436]: "[START]"
                - generic [ref=e437]: "[END]"
              - slider "Arc preview scrub" [ref=e438] [cursor=pointer]: "4"
            - button "Play Loop" [ref=e440]
          - generic [ref=e442]:
            - button "BAKE TO TIMELINE" [ref=e443]
            - button "Cancel (Escape)" [ref=e446]
    - contentinfo [ref=e450]:
      - generic [ref=e451]:
        - generic [ref=e452]:
          - generic [ref=e453]:
            - button "Play" [ref=e454]
            - button "Previous Frame (,)" [ref=e457]
            - button "Next Frame (.)" [ref=e459]
            - button "Repeat" [ref=e461]
          - generic [ref=e465]:
            - button "Preview speed" [ref=e467]:
              - generic [ref=e468]: Preview
              - generic [ref=e469]: 1×
              - generic [ref=e470]: ▾
            - generic [ref=e471]:
              - generic [ref=e472]: Frame time
              - spinbutton "Active frame duration in milliseconds" [ref=e473]: "100"
              - generic [ref=e474]: ms
            - button "Onion Skin" [ref=e475]
            - button "Onion skin settings" [ref=e478]: ⚙
        - generic [ref=e479]:
          - button "+ Frame" [ref=e480]:
            - generic [ref=e481]: Frame
          - group [ref=e483]:
            - generic "Frame actions" [ref=e484] [cursor=pointer]:
              - text: Frame actions
              - generic [ref=e485]: ▾
          - button "Collapse Timeline" [ref=e487]:
            - generic [ref=e488]:
              - generic [ref=e489]: ▼
              - generic [ref=e490]: Collapse
      - generic [ref=e491]:
        - 'button "Select frame 1. Duration: 100ms. Drag to reorder." [ref=e493]':
          - generic:
            - generic: "#1"
            - generic: 100ms
        - button "Clips" [ref=e494]
    - generic [ref=e496]:
      - generic [ref=e497]: "X: — Y: —"
      - generic [ref=e500]: 32×32
      - generic [ref=e503]: 1600%
      - generic [ref=e505]: Frame 1/1
      - generic [ref=e507]: Base Layer
      - generic [ref=e508]: "Sel: 3×3"
      - generic [ref=e510]: select-box
      - status "All changes saved to local storage" [ref=e515]:
        - generic [ref=e517]: Saved
  - alert [ref=e518]
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