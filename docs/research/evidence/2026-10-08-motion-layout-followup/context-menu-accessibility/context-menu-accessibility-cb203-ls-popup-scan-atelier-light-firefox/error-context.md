# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: context-menu-accessibility.spec.ts >> canvas tools popup scan atelier light
- Location: artifacts\context-menu-accessibility.spec.ts:4:90

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  -  1
+ Received  + 58

- Array []
+ Array [
+   Object {
+     "description": "Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds",
+     "help": "Elements must meet minimum color contrast ratio thresholds",
+     "helpUrl": "https://dequeuniversity.com/rules/axe/4.13/color-contrast?application=playwright",
+     "id": "color-contrast",
+     "impact": "serious",
+     "nodes": Array [
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#8a4500",
+               "contrastRatio": 2.64,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#140d1f",
+               "fontSize": "9.0pt (12px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 2.64 (foreground color: #140d1f, background color: #8a4500, font size: 9.0pt (12px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<button type=\"button\" aria-label=\"Pen\" aria-pressed=\"true\" title=\"Pen (B)\" class=\"flex h-9 min-w-0 ite...\">",
+                 "target": Array [
+                   ".text-\\[\\#140d1f\\]",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 2.64 (foreground color: #140d1f, background color: #8a4500, font size: 9.0pt (12px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<span class=\"truncate\">Pen</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".text-\\[\\#140d1f\\] > .truncate",
+         ],
+       },
+     ],
+     "tags": Array [
+       "cat.color",
+       "wcag2aa",
+       "wcag143",
+       "TTv5",
+       "TT13.c",
+       "EN-301-549",
+       "EN-9.1.4.3",
+       "ACT",
+       "RGAAv4",
+       "RGAA-3.2.1",
+     ],
+   },
+ ]
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
          - img "Bun, the PixiBun bunny" [ref=e11]
        - button "File" [ref=e175]:
          - text: File
          - generic [ref=e176]: ▼
        - button "Rename project Hearth Ghost" [ref=e177] [cursor=pointer]: Hearth Ghost
        - generic "Canvas size · change it in File" [ref=e178]: 16×16
        - button "Save now" [ref=e179]:
          - generic [ref=e180]: Save
        - generic [ref=e182]:
          - generic [ref=e183]:
            - button "Undo last action" [disabled]
          - generic [ref=e184]:
            - button "Redo last action" [disabled]
      - group "Drawing controls" [ref=e185]:
        - generic "Tool options rail" [ref=e186]:
          - generic [ref=e187]: "Pen:"
          - button "Brush size 1 pixels" [ref=e189]:
            - generic [ref=e190]: Size
            - generic [ref=e191]: 1 px
            - generic [ref=e192]: ▾
      - generic [ref=e193]:
        - group "Canvas controls" [ref=e194]:
          - group "Mirror drawing" [ref=e195]:
            - generic [ref=e196]: Mirror
            - button "Horizontal symmetry" [ref=e198] [cursor=pointer]
            - button "Vertical symmetry" [ref=e200] [cursor=pointer]
          - generic [ref=e202]:
            - generic [ref=e203]:
              - button "Zoom Out" [ref=e204] [cursor=pointer]: −
              - button "Zoom 1600 percent. Choose zoom level" [ref=e206]: 1600%
              - button "Zoom In" [ref=e207] [cursor=pointer]: +
            - button "Fit Canvas to Viewport (Ctrl+0)" [ref=e209] [cursor=pointer]: Fit
          - button "View options menu" [ref=e213] [cursor=pointer]:
            - generic [ref=e214]:
              - generic [ref=e215]: View
              - generic "1 active view options" [ref=e216]
            - generic [ref=e217]: ▼
        - group "Workspace presets" [ref=e218]:
          - combobox "Workspace layout" [ref=e219] [cursor=pointer]:
            - option "Drawing" [selected]
            - option "Animation"
            - option "Lighting"
        - group "Studio settings and help" [ref=e220]:
          - button "Studio options" [ref=e221] [cursor=pointer]:
            - generic [ref=e222]: Studio
            - generic [ref=e223]: ▼
        - button "Export drawing" [ref=e225]:
          - generic [ref=e226]: Export
    - status [ref=e228]: Changes saved
    - generic [ref=e229]:
      - complementary [ref=e231]:
        - generic [ref=e233]:
          - group "Drawing" [ref=e234]:
            - button "Pen" [pressed] [ref=e236] [cursor=pointer]
            - button "Bézier Curve" [ref=e238] [cursor=pointer]
            - button "Eraser" [ref=e240] [cursor=pointer]
            - button "Flood Fill" [ref=e242] [cursor=pointer]
            - button "Pixel Gradient" [ref=e244] [cursor=pointer]
            - button "Dither Brush" [ref=e246] [cursor=pointer]
            - button "Color Replace" [ref=e248] [cursor=pointer]
            - button "Erase Sampled Color" [ref=e250] [cursor=pointer]
          - group "Selection" [ref=e251]:
            - button "Marquee Box" [ref=e254] [cursor=pointer]
            - button "Lasso Select" [ref=e256] [cursor=pointer]
            - button "Magic Wand" [ref=e258] [cursor=pointer]
          - group "Geometry" [ref=e259]:
            - button "Line" [ref=e262] [cursor=pointer]
            - button "2:1 Iso Line" [ref=e264] [cursor=pointer]
            - button "Rectangle" [ref=e266] [cursor=pointer]
            - button "Ellipse" [ref=e268] [cursor=pointer]
          - group "2.5D Sculpt" [ref=e269]:
            - button "Normal Chisel" [ref=e272] [cursor=pointer]
          - group "Utility" [ref=e273]:
            - button "Eyedropper" [ref=e276] [cursor=pointer]
        - generic [ref=e277]:
          - generic [ref=e278]:
            - button "Swap colors (X)" [ref=e279] [cursor=pointer]: ⇄
            - button "Reset default black and white colors (Shift+D)" [ref=e280] [cursor=pointer]
            - 'button "Secondary color #C792DF. Click for quick swatches, double click for picker, right click to swap" [ref=e281] [cursor=pointer]'
            - 'button "Primary color #3A2E4C. Click for quick swatches, double click for picker, right click to swap" [ref=e282] [cursor=pointer]'
          - generic [ref=e283]:
            - generic [ref=e284]:
              - 'button "Quick color #3a2e4c" [ref=e285] [cursor=pointer]'
              - 'button "Quick color #c792df" [ref=e286] [cursor=pointer]'
              - 'button "Quick color #dcabdf" [ref=e287] [cursor=pointer]'
              - 'button "Quick color #664b68" [ref=e288] [cursor=pointer]'
            - button "Quick Swatches Flyout" [ref=e289] [cursor=pointer]
      - main "Pixel art canvas workspace" [ref=e293]:
        - application "Pixel art drawing canvas. Use mouse or stylus to paint, arrow keys to pan viewport or nudge selection, and Alt+drag to pan." [ref=e294]
      - complementary [ref=e297]:
        - generic [ref=e298]:
          - button "Tools" [ref=e299]
          - button "Layers" [pressed] [ref=e301]
          - button "Palette" [ref=e303]
          - button "PixiTools" [ref=e305]:
            - generic [ref=e306]: FX
        - generic [ref=e308]:
          - generic [ref=e309]:
            - generic "Each frame has its own layer pixels. A new blank frame keeps the layer names and settings." [ref=e310]:
              - text: Frame 1 · Layers
              - generic [ref=e311]: (1)
            - generic [ref=e312]:
              - button "Add New Layer" [ref=e313]
              - button "Duplicate Layer" [ref=e315]
              - button "Merge Down" [disabled] [ref=e317]
              - button "Delete Layer" [disabled] [ref=e319]
          - generic [ref=e321]:
            - generic [ref=e322]:
              - generic [ref=e323]: Opacity
              - slider "Layer opacity" [ref=e324] [cursor=pointer]: "100"
              - generic [ref=e325]: 100%
            - generic [ref=e326]:
              - generic [ref=e327]: Blend
              - combobox "Layer blend mode" [ref=e328] [cursor=pointer]:
                - option "Normal" [selected]
                - option "Multiply"
                - option "Screen"
                - option "Overlay"
                - option "Color Dodge"
                - option "On artwork only"
          - generic [ref=e330]:
            - generic [ref=e331]:
              - button "Reorder layer Base Layer" [disabled] [ref=e332]:
                - generic [ref=e333]: ⠿
              - generic [ref=e334]:
                - button "Select layer Base Layer. Double click to rename" [ref=e335] [cursor=pointer]: Base Layer
                - button "Rename layer Base Layer" [ref=e336] [cursor=pointer]
            - generic [ref=e337]:
              - button "Lock layer Base Layer" [ref=e338]
              - button "Hide layer Base Layer" [ref=e339]
    - contentinfo [ref=e341]:
      - generic [ref=e342]:
        - generic [ref=e343]:
          - generic [ref=e344]:
            - button "Play" [ref=e345]
            - button "Previous Frame (,)" [ref=e348]
            - button "Next Frame (.)" [ref=e350]
            - button "Repeat" [ref=e352]
          - generic [ref=e356]:
            - button "Preview speed" [ref=e358]:
              - generic [ref=e359]: Preview
              - generic [ref=e360]: 1×
              - generic [ref=e361]: ▾
            - generic [ref=e362]:
              - generic [ref=e363]: Frame time
              - spinbutton "Active frame duration in milliseconds" [ref=e364]: "125"
              - generic [ref=e365]: ms
            - button "Onion Skin" [ref=e366]
            - button "Onion skin settings" [ref=e369]: ⚙
        - generic [ref=e371]:
          - button "+ Frame" [ref=e372]:
            - generic [ref=e373]: Frame
          - group [ref=e375]:
            - generic "Frame actions" [ref=e376] [cursor=pointer]:
              - text: Frame actions
              - generic [ref=e377]: ▾
          - button "Collapse Timeline" [ref=e379]:
            - generic [ref=e380]:
              - generic [ref=e381]: ▼
              - generic [ref=e382]: Collapse
      - generic [ref=e383]:
        - 'button "Select frame 1. Duration: 125ms. Drag to reorder." [ref=e385]':
          - generic:
            - generic: "#1"
            - generic: 125ms
        - button "Clips" [ref=e386]
    - generic [ref=e388]:
      - generic [ref=e389]: "X: — Y: —"
      - generic [ref=e392]: 16×16
      - generic [ref=e395]: 1600%
      - generic [ref=e397]: Frame 1/1
      - generic [ref=e399]: Base Layer
      - generic [ref=e400]: pen
      - status "All changes saved to local storage" [ref=e405]:
        - generic [ref=e407]: Saved
  - alert [ref=e408]
  - generic [ref=e409]:
    - button "Close canvas tools" [ref=e410]
    - dialog "Canvas tools" [ref=e411]:
      - generic [ref=e412]:
        - generic [ref=e413]: Canvas tools
        - generic [ref=e414]: Esc to close
      - generic [ref=e415]:
        - button "Pen" [active] [pressed] [ref=e416] [cursor=pointer]:
          - generic [ref=e418]: B
        - button "Eraser" [ref=e419] [cursor=pointer]:
          - generic [ref=e421]: E
        - button "Flood Fill" [ref=e422] [cursor=pointer]:
          - generic [ref=e424]: G
        - button "Eyedropper" [ref=e425] [cursor=pointer]:
          - generic [ref=e427]: I
        - button "Marquee Box" [ref=e428] [cursor=pointer]:
          - generic [ref=e430]: M
        - button "Lasso Select" [ref=e431] [cursor=pointer]:
          - generic [ref=e433]: Q
        - button "Magic Wand" [ref=e434] [cursor=pointer]:
          - generic [ref=e436]: W
        - button "Line" [ref=e437] [cursor=pointer]:
          - generic [ref=e439]: L
        - button "Rectangle" [ref=e440] [cursor=pointer]:
          - generic [ref=e442]: U
        - button "Ellipse" [ref=e443] [cursor=pointer]:
          - generic [ref=e445]: O
      - button "Swap primary and secondary colors" [ref=e446] [cursor=pointer]:
        - generic [ref=e450]: Swap colors
        - generic [ref=e451]: X
      - paragraph [ref=e452]: Choose with either mouse button. Arrow keys move; Enter selects.
```

# Test source

```ts
  1  | import { expect, test } from '@playwright/test';
  2  | import AxeBuilder from '@axe-core/playwright';
  3  | import { writeFile } from 'node:fs/promises';
  4  | for (const theme of ['atelier','cozy-classic']) for (const mode of ['dark','light']) test(`canvas tools popup scan ${theme} ${mode}`, async ({page},info)=>{
  5  |  await page.setViewportSize({width:1280,height:900}); await page.goto('/studio?template=hearth-ghost'); await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  6  |  await page.getByRole('button',{name:'Studio options',exact:true}).click(); await page.getByTestId(`theme-option-${theme}`).click(); await page.keyboard.press('Escape');
  7  |  await page.getByRole('button',{name:'Studio options',exact:true}).click(); await page.getByTestId(`scheme-option-${mode}`).click(); await page.keyboard.press('Escape');
  8  |  await page.locator('#center-canvas-area').focus(); await page.keyboard.press('Shift+F10'); await expect(page.getByRole('dialog',{name:'Canvas tools',exact:true})).toBeVisible();
  9  |  const result=await new AxeBuilder({page}).include('[role="dialog"][aria-label="Canvas tools"]').withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']).analyze();
> 10 |  await writeFile(info.outputPath('axe-findings.json'),JSON.stringify(result.violations,null,2)); expect(result.violations).toEqual([]);
     |                                                                                                                            ^ Error: expect(received).toEqual(expected) // deep equality
  11 | });
  12 | 
  13 | 
```