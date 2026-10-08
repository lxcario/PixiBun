# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: context-menu-accessibility.spec.ts >> canvas tools popup scan cozy-classic light
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
+                   ".text-\\[\\#140d1f\\][aria-label=\"Pen\"][title=\"Pen (B)\"]",
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
+           ".text-\\[\\#140d1f\\][aria-label=\"Pen\"][title=\"Pen (B)\"] > .truncate",
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
          - img "Bun, the PixiBun bunny" [ref=e17]
        - button "File" [ref=e181]:
          - text: File
          - generic [ref=e182]: ▼
        - button "Rename project Hearth Ghost" [ref=e183] [cursor=pointer]: Hearth Ghost
        - generic "Canvas size · change it in File" [ref=e184]: 16×16
        - button "Save now" [ref=e185]:
          - generic [ref=e186]: Save
        - generic [ref=e188]:
          - generic [ref=e189]:
            - button "Undo last action" [disabled]
          - generic [ref=e190]:
            - button "Redo last action" [disabled]
      - group "Drawing controls" [ref=e191]:
        - generic "Tool options rail" [ref=e192]:
          - generic [ref=e193]: "Pen:"
          - button "Brush size 1 pixels" [ref=e195]:
            - generic [ref=e196]: Size
            - generic [ref=e197]: 1 px
            - generic [ref=e198]: ▾
      - generic [ref=e199]:
        - group "Canvas controls" [ref=e200]:
          - group "Mirror drawing" [ref=e201]:
            - generic [ref=e202]: Mirror
            - button "Horizontal symmetry" [ref=e204] [cursor=pointer]
            - button "Vertical symmetry" [ref=e206] [cursor=pointer]
          - generic [ref=e208]:
            - generic [ref=e209]:
              - button "Zoom Out" [ref=e210] [cursor=pointer]: −
              - button "Zoom 1600 percent. Choose zoom level" [ref=e212]: 1600%
              - button "Zoom In" [ref=e213] [cursor=pointer]: +
            - button "Fit Canvas to Viewport (Ctrl+0)" [ref=e215] [cursor=pointer]: Fit
          - button "View options menu" [ref=e219] [cursor=pointer]:
            - generic [ref=e220]:
              - generic [ref=e221]: View
              - generic "1 active view options" [ref=e222]
            - generic [ref=e223]: ▼
        - group "Workspace presets" [ref=e224]:
          - combobox "Workspace layout" [ref=e225] [cursor=pointer]:
            - option "Drawing" [selected]
            - option "Animation"
            - option "Lighting"
        - group "Studio settings and help" [ref=e226]:
          - button "Studio options" [ref=e227] [cursor=pointer]:
            - generic [ref=e228]: Studio
            - generic [ref=e229]: ▼
        - button "Export drawing" [ref=e231]:
          - generic [ref=e232]: Export
    - status [ref=e234]: Changes saved
    - generic [ref=e235]:
      - complementary [ref=e237]:
        - generic [ref=e239]:
          - group "Drawing" [ref=e240]:
            - button "Pen" [pressed] [ref=e242] [cursor=pointer]
            - button "Bézier Curve" [ref=e244] [cursor=pointer]
            - button "Eraser" [ref=e246] [cursor=pointer]
            - button "Flood Fill" [ref=e248] [cursor=pointer]
            - button "Pixel Gradient" [ref=e250] [cursor=pointer]
            - button "Dither Brush" [ref=e252] [cursor=pointer]
            - button "Color Replace" [ref=e254] [cursor=pointer]
            - button "Erase Sampled Color" [ref=e256] [cursor=pointer]
          - group "Selection" [ref=e257]:
            - button "Marquee Box" [ref=e260] [cursor=pointer]
            - button "Lasso Select" [ref=e262] [cursor=pointer]
            - button "Magic Wand" [ref=e264] [cursor=pointer]
          - group "Geometry" [ref=e265]:
            - button "Line" [ref=e268] [cursor=pointer]
            - button "2:1 Iso Line" [ref=e270] [cursor=pointer]
            - button "Rectangle" [ref=e272] [cursor=pointer]
            - button "Ellipse" [ref=e274] [cursor=pointer]
          - group "2.5D Sculpt" [ref=e275]:
            - button "Normal Chisel" [ref=e278] [cursor=pointer]
          - group "Utility" [ref=e279]:
            - button "Eyedropper" [ref=e282] [cursor=pointer]
        - generic [ref=e283]:
          - generic [ref=e284]:
            - button "Swap colors (X)" [ref=e285] [cursor=pointer]: ⇄
            - button "Reset default black and white colors (Shift+D)" [ref=e286] [cursor=pointer]
            - 'button "Secondary color #C792DF. Click for quick swatches, double click for picker, right click to swap" [ref=e287] [cursor=pointer]'
            - 'button "Primary color #3A2E4C. Click for quick swatches, double click for picker, right click to swap" [ref=e288] [cursor=pointer]'
          - generic [ref=e289]:
            - generic [ref=e290]:
              - 'button "Quick color #3a2e4c" [ref=e291] [cursor=pointer]'
              - 'button "Quick color #c792df" [ref=e292] [cursor=pointer]'
              - 'button "Quick color #dcabdf" [ref=e293] [cursor=pointer]'
              - 'button "Quick color #664b68" [ref=e294] [cursor=pointer]'
            - button "Quick Swatches Flyout" [ref=e295] [cursor=pointer]
      - main "Pixel art canvas workspace" [ref=e299]:
        - application "Pixel art drawing canvas. Use mouse or stylus to paint, arrow keys to pan viewport or nudge selection, and Alt+drag to pan." [ref=e300]
      - complementary [ref=e303]:
        - generic [ref=e304]:
          - button "Tools" [ref=e305]
          - button "Layers" [pressed] [ref=e307]
          - button "Palette" [ref=e309]
          - button "PixiTools" [ref=e311]:
            - generic [ref=e312]: FX
        - generic [ref=e314]:
          - generic [ref=e315]:
            - generic "Each frame has its own layer pixels. A new blank frame keeps the layer names and settings." [ref=e316]:
              - text: Frame 1 · Layers
              - generic [ref=e317]: (1)
            - generic [ref=e318]:
              - button "Add New Layer" [ref=e319]
              - button "Duplicate Layer" [ref=e321]
              - button "Merge Down" [disabled] [ref=e323]
              - button "Delete Layer" [disabled] [ref=e325]
          - generic [ref=e327]:
            - generic [ref=e328]:
              - generic [ref=e329]: Opacity
              - slider "Layer opacity" [ref=e330] [cursor=pointer]: "100"
              - generic [ref=e331]: 100%
            - generic [ref=e332]:
              - generic [ref=e333]: Blend
              - combobox "Layer blend mode" [ref=e334] [cursor=pointer]:
                - option "Normal" [selected]
                - option "Multiply"
                - option "Screen"
                - option "Overlay"
                - option "Color Dodge"
                - option "On artwork only"
          - generic [ref=e336]:
            - generic [ref=e337]:
              - button "Reorder layer Base Layer" [disabled] [ref=e338]:
                - generic [ref=e339]: ⠿
              - generic [ref=e340]:
                - button "Select layer Base Layer. Double click to rename" [ref=e341] [cursor=pointer]: Base Layer
                - button "Rename layer Base Layer" [ref=e342] [cursor=pointer]
            - generic [ref=e343]:
              - button "Lock layer Base Layer" [ref=e344]
              - button "Hide layer Base Layer" [ref=e345]
    - contentinfo [ref=e347]:
      - generic [ref=e348]:
        - generic [ref=e349]:
          - generic [ref=e350]:
            - button "Play" [ref=e351]
            - button "Previous Frame (,)" [ref=e354]
            - button "Next Frame (.)" [ref=e356]
            - button "Repeat" [ref=e358]
          - generic [ref=e362]:
            - button "Preview speed" [ref=e364]:
              - generic [ref=e365]: Preview
              - generic [ref=e366]: 1×
              - generic [ref=e367]: ▾
            - generic [ref=e368]:
              - generic [ref=e369]: Frame time
              - spinbutton "Active frame duration in milliseconds" [ref=e370]: "125"
              - generic [ref=e371]: ms
            - button "Onion Skin" [ref=e372]
            - button "Onion skin settings" [ref=e375]: ⚙
        - generic [ref=e377]:
          - button "+ Frame" [ref=e378]:
            - generic [ref=e379]: Frame
          - group [ref=e381]:
            - generic "Frame actions" [ref=e382] [cursor=pointer]:
              - text: Frame actions
              - generic [ref=e383]: ▾
          - button "Collapse Timeline" [ref=e385]:
            - generic [ref=e386]:
              - generic [ref=e387]: ▼
              - generic [ref=e388]: Collapse
      - generic [ref=e389]:
        - 'button "Select frame 1. Duration: 125ms. Drag to reorder." [ref=e391]':
          - generic:
            - generic: "#1"
            - generic: 125ms
        - button "Clips" [ref=e392]
    - generic [ref=e394]:
      - generic [ref=e395]: "X: — Y: —"
      - generic [ref=e398]: 16×16
      - generic [ref=e401]: 1600%
      - generic [ref=e403]: Frame 1/1
      - generic [ref=e405]: Base Layer
      - generic [ref=e406]: pen
      - status "All changes saved to local storage" [ref=e411]:
        - generic [ref=e413]: Saved
  - alert [ref=e414]
  - generic [ref=e415]:
    - button "Close canvas tools" [ref=e416]
    - dialog "Canvas tools" [ref=e417]:
      - generic [ref=e418]:
        - generic [ref=e419]: Canvas tools
        - generic [ref=e420]: Esc to close
      - generic [ref=e421]:
        - button "Pen" [active] [pressed] [ref=e422] [cursor=pointer]:
          - generic [ref=e424]: B
        - button "Eraser" [ref=e425] [cursor=pointer]:
          - generic [ref=e427]: E
        - button "Flood Fill" [ref=e428] [cursor=pointer]:
          - generic [ref=e430]: G
        - button "Eyedropper" [ref=e431] [cursor=pointer]:
          - generic [ref=e433]: I
        - button "Marquee Box" [ref=e434] [cursor=pointer]:
          - generic [ref=e436]: M
        - button "Lasso Select" [ref=e437] [cursor=pointer]:
          - generic [ref=e439]: Q
        - button "Magic Wand" [ref=e440] [cursor=pointer]:
          - generic [ref=e442]: W
        - button "Line" [ref=e443] [cursor=pointer]:
          - generic [ref=e445]: L
        - button "Rectangle" [ref=e446] [cursor=pointer]:
          - generic [ref=e448]: U
        - button "Ellipse" [ref=e449] [cursor=pointer]:
          - generic [ref=e451]: O
      - button "Swap primary and secondary colors" [ref=e452] [cursor=pointer]:
        - generic [ref=e456]: Swap colors
        - generic [ref=e457]: X
      - paragraph [ref=e458]: Choose with either mouse button. Arrow keys move; Enter selects.
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