# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: themeAccessibility.spec.ts >> Four-Theme Rendered Browser Accessibility Audits >> Cozy Classic Dark Theme Accessibility Suite >> right inspector tabs meet WCAG standards under Cozy Classic Dark
- Location: tests\e2e\themeAccessibility.spec.ts:74:11

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  -   1
+ Received  + 190

- Array []
+ Array [
+   Object {
+     "description": "Ensure touch targets have sufficient size and space",
+     "help": "All touch targets must be 24px large, or leave sufficient space",
+     "helpUrl": "https://dequeuniversity.com/rules/axe/4.13/target-size?application=playwright",
+     "id": "target-size",
+     "impact": "serious",
+     "nodes": Array [
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "height": 20,
+               "minSize": 24,
+               "width": 20,
+             },
+             "id": "target-size",
+             "impact": "serious",
+             "message": "Target has insufficient size (20px by 20px, should be at least 24px by 24px)",
+             "relatedNodes": Array [],
+           },
+           Object {
+             "data": Object {
+               "closestOffset": 20,
+               "minOffset": 24,
+             },
+             "id": "target-offset",
+             "impact": "serious",
+             "message": "Target has insufficient space to its closest neighbors. Safe clickable space has a diameter of 20px instead of at least 24px.",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<button type=\"button\" aria-pressed=\"false\" class=\"flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-[2px] border transition-colors border-transparent text-[var(--text-muted)] hover:text-[var(--text-heading)]\">",
+                 "target": Array [
+                   ".border-transparent.px-1\\.5.text-\\[11px\\]",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Target has insufficient size (20px by 20px, should be at least 24px by 24px)
+   Target has insufficient space to its closest neighbors. Safe clickable space has a diameter of 20px instead of at least 24px.",
+         "html": "<button type=\"button\" aria-label=\"Collapse pinned color panel\" title=\"Collapse color picker\" class=\"w-5 h-5 flex items-center justify-center rounded-[2px] text-[var(--text-muted)] hover:text-[var(--text-heading)] hover:bg-[var(--surface-0)]\">▲</button>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "button[aria-label=\"Collapse pinned color panel\"]",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "height": 16,
+               "minSize": 24,
+               "width": 208,
+             },
+             "id": "target-size",
+             "impact": "serious",
+             "message": "Target has insufficient size (208px by 16px, should be at least 24px by 24px)",
+             "relatedNodes": Array [],
+           },
+           Object {
+             "data": Object {
+               "closestOffset": 17,
+               "minOffset": 24,
+             },
+             "id": "target-offset",
+             "impact": "serious",
+             "message": "Target has insufficient space to its closest neighbors. Safe clickable space has a diameter of 17px instead of at least 24px.",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<input class=\"w-full accent-[var(--accent-gold)]\" min=\"0\" max=\"100\" aria-label=\"Picker saturation\" type=\"range\" value=\"39\">",
+                 "target": Array [
+                   "input[aria-label=\"Picker saturation\"]",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Target has insufficient size (208px by 16px, should be at least 24px by 24px)
+   Target has insufficient space to its closest neighbors. Safe clickable space has a diameter of 17px instead of at least 24px.",
+         "html": "<input class=\"w-full accent-[var(--accent-gold)]\" min=\"0\" max=\"359\" aria-label=\"Picker hue\" type=\"range\" value=\"264\">",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "input[max=\"359\"]",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "height": 16,
+               "minSize": 24,
+               "width": 199.3,
+             },
+             "id": "target-size",
+             "impact": "serious",
+             "message": "Target has insufficient size (199.3px by 16px, should be at least 24px by 24px)",
+             "relatedNodes": Array [],
+           },
+           Object {
+             "data": Object {
+               "closestOffset": 17,
+               "minOffset": 24,
+             },
+             "id": "target-offset",
+             "impact": "serious",
+             "message": "Target has insufficient space to its closest neighbors. Safe clickable space has a diameter of 17px instead of at least 24px.",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<input class=\"w-full accent-[var(--accent-gold)]\" min=\"0\" max=\"359\" aria-label=\"Picker hue\" type=\"range\" value=\"264\">",
+                 "target": Array [
+                   "input[max=\"359\"]",
+                 ],
+               },
+               Object {
+                 "html": "<input class=\"w-full accent-[var(--accent-gold)]\" min=\"0\" max=\"100\" aria-label=\"Picker value\" type=\"range\" value=\"30\">",
+                 "target": Array [
+                   "input[aria-label=\"Picker value\"]",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Target has insufficient size (199.3px by 16px, should be at least 24px by 24px)
+   Target has insufficient space to its closest neighbors. Safe clickable space has a diameter of 17px instead of at least 24px.",
+         "html": "<input class=\"w-full accent-[var(--accent-gold)]\" min=\"0\" max=\"100\" aria-label=\"Picker saturation\" type=\"range\" value=\"39\">",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "input[aria-label=\"Picker saturation\"]",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "height": 16,
+               "minSize": 24,
+               "width": 208,
+             },
+             "id": "target-size",
+             "impact": "serious",
+             "message": "Target has insufficient size (208px by 16px, should be at least 24px by 24px)",
+             "relatedNodes": Array [],
+           },
+           Object {
+             "data": Object {
+               "closestOffset": 17,
+               "minOffset": 24,
+             },
+             "id": "target-offset",
+             "impact": "serious",
+             "message": "Target has insufficient space to its closest neighbors. Safe clickable space has a diameter of 17px instead of at least 24px.",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<input class=\"w-full accent-[var(--accent-gold)]\" min=\"0\" max=\"100\" aria-label=\"Picker saturation\" type=\"range\" value=\"39\">",
+                 "target": Array [
+                   "input[aria-label=\"Picker saturation\"]",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Target has insufficient size (208px by 16px, should be at least 24px by 24px)
+   Target has insufficient space to its closest neighbors. Safe clickable space has a diameter of 17px instead of at least 24px.",
+         "html": "<input class=\"w-full accent-[var(--accent-gold)]\" min=\"0\" max=\"100\" aria-label=\"Picker value\" type=\"range\" value=\"30\">",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "input[aria-label=\"Picker value\"]",
+         ],
+       },
+     ],
+     "tags": Array [
+       "cat.sensory-and-visual-cues",
+       "wcag22aa",
+       "wcag258",
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
          - generic [ref=e186]:
            - button "Undo last action" [disabled]
          - generic [ref=e187]:
            - button "Redo last action" [disabled]
      - group "Drawing controls" [ref=e188]:
        - generic "Tool options rail" [ref=e189]:
          - generic [ref=e190]: "Pen:"
          - generic [ref=e191]:
            - button "Brush size 1 pixels" [ref=e192]:
              - generic [ref=e193]: Size
              - generic [ref=e194]: 1 px
              - generic [ref=e195]: ▾
            - generic "Quick brush size presets" [ref=e196]:
              - button "1px brush preset" [pressed] [ref=e197]: "1"
              - button "2px brush preset" [ref=e198]: "2"
              - button "3px brush preset" [ref=e199]: "3"
              - button "4px brush preset" [ref=e200]: "4"
            - button "Disable clean corners" [pressed] [ref=e201]:
              - generic [ref=e202]: Pixel-Perfect
      - generic [ref=e203]:
        - group "Canvas controls" [ref=e204]:
          - group "Mirror drawing" [ref=e205]:
            - generic [ref=e206]: Mirror
            - button "Horizontal symmetry" [ref=e208] [cursor=pointer]
            - button "Vertical symmetry" [ref=e210] [cursor=pointer]
          - generic [ref=e212]:
            - generic [ref=e213]:
              - button "Zoom Out" [ref=e214] [cursor=pointer]: −
              - button "Zoom 1600 percent. Choose zoom level" [ref=e216]: 1600%
              - button "Zoom In" [ref=e217] [cursor=pointer]: +
            - button "Fit Canvas to Viewport (Ctrl+0)" [ref=e219] [cursor=pointer]: Fit
          - button "View options menu" [ref=e223] [cursor=pointer]:
            - generic [ref=e224]:
              - generic [ref=e225]: View
              - generic "1 active view options" [ref=e226]
            - generic [ref=e227]: ▼
        - group "Workspace presets" [ref=e228]:
          - combobox "Workspace layout" [ref=e229] [cursor=pointer]:
            - option "Drawing" [selected]
            - option "Animation"
            - option "Lighting"
        - group "Studio settings and help" [ref=e230]:
          - button "Studio options" [ref=e231] [cursor=pointer]:
            - generic [ref=e232]: Studio
            - generic [ref=e233]: ▼
        - button "Export drawing" [ref=e235]:
          - generic [ref=e236]: Export
    - status [ref=e238]: Not saved yet
    - generic [ref=e239]:
      - complementary [ref=e241]:
        - generic [ref=e243]:
          - group "Drawing" [ref=e244]:
            - button "Pen" [pressed] [ref=e246] [cursor=pointer]
            - button "Bézier Curve" [ref=e248] [cursor=pointer]
            - button "Eraser" [ref=e250] [cursor=pointer]
            - button "Flood Fill" [ref=e252] [cursor=pointer]
            - button "Pixel Gradient" [ref=e254] [cursor=pointer]
            - button "Dither Brush" [ref=e256] [cursor=pointer]
            - button "Color Replace" [ref=e258] [cursor=pointer]
            - button "Erase Sampled Color" [ref=e260] [cursor=pointer]
          - group "Selection" [ref=e261]:
            - button "Marquee Box" [ref=e264] [cursor=pointer]
            - button "Lasso Select" [ref=e266] [cursor=pointer]
            - button "Magic Wand" [ref=e268] [cursor=pointer]
          - group "Geometry" [ref=e269]:
            - button "Line" [ref=e272] [cursor=pointer]
            - button "2:1 Iso Line" [ref=e274] [cursor=pointer]
            - button "Rectangle" [ref=e276] [cursor=pointer]
            - button "Ellipse" [ref=e278] [cursor=pointer]
          - group "2.5D Sculpt" [ref=e279]:
            - button "Normal Chisel" [ref=e282] [cursor=pointer]
          - group "Utility" [ref=e283]:
            - button "Eyedropper" [ref=e286] [cursor=pointer]
        - generic [ref=e287]:
          - generic [ref=e288]:
            - button "Swap colors (X)" [ref=e289] [cursor=pointer]: ⇄
            - button "Reset default black and white colors (Shift+D)" [ref=e290] [cursor=pointer]
            - 'button "Secondary color #C792DF. Click for quick swatches, double click for picker, right click to swap" [ref=e291] [cursor=pointer]'
            - 'button "Primary color #3A2E4C. Click for quick swatches, double click for picker, right click to swap" [ref=e292] [cursor=pointer]'
          - generic [ref=e293]:
            - generic [ref=e294]:
              - 'button "#DDDFDF (Click: Primary | Right-click: Secondary)" [ref=e295] [cursor=pointer]'
              - 'button "#DDDDDF (Click: Primary | Right-click: Secondary)" [ref=e296] [cursor=pointer]'
              - 'button "#D0C4DF (Click: Primary | Right-click: Secondary)" [ref=e297] [cursor=pointer]'
              - 'button "#DCABDF (Click: Primary | Right-click: Secondary)" [ref=e298] [cursor=pointer]'
            - button "Quick Swatches Flyout" [ref=e299] [cursor=pointer]
      - main "Pixel art canvas workspace" [ref=e303]:
        - application "Pixel art drawing canvas. Use mouse or stylus to paint, arrow keys to pan viewport or nudge selection, and Alt+drag to pan." [ref=e304]
      - complementary [ref=e307]:
        - generic [ref=e308]:
          - button "Tools" [ref=e309]
          - button "Layers" [ref=e311]
          - button "Palette" [active] [pressed] [ref=e313]
          - button "PixiTools" [ref=e315]:
            - generic [ref=e316]: FX
        - generic [ref=e318]:
          - region "Pinned color panel" [ref=e319]:
            - generic [ref=e320]:
              - generic [ref=e321]:
                - generic [ref=e322]: Color Wheel
                - generic [ref=e323]:
                  - button "Foreground ·" [pressed] [ref=e324]:
                    - generic [ref=e326]: Foreground
                    - text: ·
                  - button "Background" [ref=e327]
              - generic [ref=e330]:
                - button "Collapse pinned color panel" [ref=e331]: ▲
                - button "Unpin color panel" [ref=e332]: ✕
            - generic [ref=e334]:
              - generic [ref=e335]:
                - generic [ref=e336]: Color picker
                - combobox "Color picker shape" [ref=e337]:
                  - option "Triangle" [selected]
                  - option "Square"
              - img "Saturation and value triangle. Use the sliders below for keyboard control." [ref=e341]
              - generic [ref=e342]:
                - generic [ref=e343]: Hue
                - slider "Picker hue" [ref=e344]: "264"
              - generic [ref=e345]:
                - generic [ref=e346]: Saturation
                - slider "Picker saturation" [ref=e347]: "39"
              - generic [ref=e348]:
                - generic [ref=e349]: Value
                - slider "Picker value" [ref=e350]: "30"
              - textbox "Picker hex color" [ref=e353]: "#3A2E4C"
          - generic [ref=e354]:
            - generic [ref=e355]:
              - generic [ref=e356]: Palette
              - combobox "Color palette preset" [ref=e357] [cursor=pointer]:
                - option "Alabaster & Wisteria (Active Theme) (8)" [selected]
                - option "Cozy Hearth 16 (16)"
                - option "Pico-8 (16)"
                - option "Endesga 32 (EDG32) (32)"
            - generic [ref=e358]:
              - 'generic "Primary Color: #3A2E4C" [ref=e359]': "1"
              - generic [ref=e362]: "|"
              - 'generic "Secondary Color: #C792DF" [ref=e363]': "2"
          - button "Browse palettes Previews & favorites →" [ref=e366]:
            - text: Browse palettes
            - generic [ref=e367]: Previews & favorites →
          - generic [ref=e368]:
            - generic [ref=e369]:
              - 'button "Select color #DDDFDF" [ref=e370] [cursor=pointer]'
              - 'button "Select color #DDDDDF" [ref=e371] [cursor=pointer]'
              - 'button "Select color #D0C4DF" [ref=e372] [cursor=pointer]'
              - 'button "Select color #DCABDF" [ref=e373] [cursor=pointer]'
              - 'button "Select color #C792DF" [ref=e374] [cursor=pointer]':
                - generic [ref=e375]: "2"
              - 'button "Select color #A86EC6" [ref=e376] [cursor=pointer]'
              - 'button "Select color #6A5880" [ref=e377] [cursor=pointer]'
              - 'button "Select color #3A2E4C" [ref=e378] [cursor=pointer]':
                - generic [ref=e379]: "1"
            - generic [ref=e380]:
              - generic [ref=e381]: "#3A2E4C"
              - button "Remove color" [ref=e382]
          - generic [ref=e384]:
            - button "Create palette" [ref=e385]
            - button "Scan Canvas" [ref=e387]
            - button "+ OKLCH Ramp" [ref=e389]:
              - generic [ref=e390]: + OKLCH
            - button "+ Lospec" [ref=e391]
          - group [ref=e393]:
            - generic "Roles and index bindings" [ref=e394] [cursor=pointer]
            - 'option "#0: #DDDFDF" [selected]'
            - 'option "#1: #DDDDDF"'
            - 'option "#2: #D0C4DF"'
            - 'option "#3: #DCABDF"'
            - 'option "#4: #C792DF"'
            - 'option "#5: #A86EC6"'
            - 'option "#6: #6A5880"'
            - 'option "#7: #3A2E4C"'
          - generic [ref=e396]:
            - heading [level=3] [ref=e397]:
              - button "Cycle Engine" [ref=e398] [cursor=pointer]:
                - generic [ref=e401]: ▸
            - button "Play Cycle" [ref=e403]
    - contentinfo [ref=e405]:
      - generic [ref=e406]:
        - generic [ref=e407]:
          - generic [ref=e408]:
            - button "Play" [ref=e409]
            - button "Previous Frame (,)" [ref=e412]
            - button "Next Frame (.)" [ref=e414]
            - button "Repeat" [ref=e416]
          - generic [ref=e420]:
            - button "Preview speed" [ref=e422]:
              - generic [ref=e423]: Preview
              - generic [ref=e424]: 1×
              - generic [ref=e425]: ▾
            - generic [ref=e426]:
              - generic [ref=e427]: Frame time
              - spinbutton "Active frame duration in milliseconds" [ref=e428]: "100"
              - generic [ref=e429]: ms
            - button "Onion Skin" [ref=e430]
            - button "Onion skin settings" [ref=e433]: ⚙
        - generic [ref=e434]:
          - button "+ Frame" [ref=e435]:
            - generic [ref=e436]: Frame
          - group [ref=e438]:
            - generic "Frame actions" [ref=e439] [cursor=pointer]:
              - text: Frame actions
              - generic [ref=e440]: ▾
          - button "Collapse Timeline" [ref=e442]:
            - generic [ref=e443]:
              - generic [ref=e444]: ▼
              - generic [ref=e445]: Collapse
      - generic [ref=e446]:
        - 'button "Select frame 1. Duration: 100ms. Drag to reorder." [ref=e448]':
          - generic:
            - generic: "#1"
            - generic: 100ms
        - button "Clips" [ref=e449]
    - generic [ref=e451]:
      - generic [ref=e452]: "X: — Y: —"
      - generic [ref=e455]: 32×32
      - generic [ref=e458]: 1600%
      - generic [ref=e460]: Frame 1/1
      - generic [ref=e462]: Base Layer
      - generic [ref=e463]: pen
      - status "All changes saved to local storage" [ref=e468]:
        - generic [ref=e470]: Saved
  - button "Open Next.js Dev Tools" [ref=e476] [cursor=pointer]
  - alert [ref=e480]
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | import AxeBuilder from '@axe-core/playwright';
  3   | 
  4   | const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
  5   | 
  6   | interface ThemeCombo {
  7   |   name: string;
  8   |   studioTheme: 'atelier' | 'cozy-classic';
  9   |   colorScheme: 'dark' | 'light';
  10  | }
  11  | 
  12  | const THEMES: ThemeCombo[] = [
  13  |   { name: 'Atelier Dark', studioTheme: 'atelier', colorScheme: 'dark' },
  14  |   { name: 'Atelier Light', studioTheme: 'atelier', colorScheme: 'light' },
  15  |   { name: 'Cozy Classic Dark', studioTheme: 'cozy-classic', colorScheme: 'dark' },
  16  |   { name: 'Cozy Classic Light', studioTheme: 'cozy-classic', colorScheme: 'light' },
  17  | ];
  18  | 
  19  | test.describe('Four-Theme Rendered Browser Accessibility Audits', () => {
  20  |   for (const theme of THEMES) {
  21  |     test.describe(`${theme.name} Theme Accessibility Suite`, () => {
  22  |       test.beforeEach(async ({ page }) => {
  23  |         await page.goto('/studio');
  24  |         await page.waitForLoadState('domcontentloaded');
  25  |         await expect(page.locator('div[role="application"]')).toBeVisible();
  26  | 
  27  |         // Allow React hydration to complete
  28  |         await page.waitForTimeout(1100);
  29  | 
  30  |         // Apply theme attributes synchronously to DOM
  31  |         await page.evaluate(
  32  |           ({ studioTheme, colorScheme }) => {
  33  |             const root = document.documentElement;
  34  |             root.setAttribute('data-studio-theme', studioTheme);
  35  |             root.setAttribute('data-color-scheme', colorScheme);
  36  |             root.setAttribute('data-theme', colorScheme);
  37  |             if (colorScheme === 'light') {
  38  |               root.classList.add('light');
  39  |               root.classList.remove('dark');
  40  |               root.style.colorScheme = 'light';
  41  |             } else {
  42  |               root.classList.add('dark');
  43  |               root.classList.remove('light');
  44  |               root.style.colorScheme = 'dark';
  45  |             }
  46  |           },
  47  |           { studioTheme: theme.studioTheme, colorScheme: theme.colorScheme }
  48  |         );
  49  | 
  50  |         // Allow theme CSS variables to propagate and animations to settle
  51  |         await page.waitForTimeout(300);
  52  |       });
  53  | 
  54  |       test(`shell and blank canvas meet WCAG standards under ${theme.name}`, async ({ page }) => {
  55  |         const canvas = page.getByTestId('main-composite-canvas');
  56  |         await expect(canvas).toBeVisible();
  57  | 
  58  |         await page.getByRole('button', { name: 'Studio options' }).click();
  59  |         await expect(page.getByRole('dialog', { name: 'Studio options' })).toBeInViewport();
  60  |         const studioResults = await new AxeBuilder({ page }).include('[role="dialog"]').withTags(WCAG_TAGS).analyze();
  61  |         expect(studioResults.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')).toEqual([]);
  62  |         await page.keyboard.press('Escape');
  63  | 
  64  |         const results = await new AxeBuilder({ page })
  65  |           .withTags(WCAG_TAGS)
  66  |           .analyze();
  67  | 
  68  |         const blockingViolations = results.violations.filter(
  69  |           (v) => v.impact === 'critical' || v.impact === 'serious'
  70  |         );
  71  |         expect(blockingViolations).toEqual([]);
  72  |       });
  73  | 
  74  |       test(`right inspector tabs meet WCAG standards under ${theme.name}`, async ({ page }) => {
  75  |         const inspector = page.getByTestId('right-inspector');
  76  |         await expect(inspector).toBeVisible();
  77  | 
  78  |         // Check Layers tab
  79  |         const layersTab = page.getByTestId('tab-layers');
  80  |         await layersTab.click();
  81  |         await page.waitForTimeout(150);
  82  | 
  83  |         let results = await new AxeBuilder({ page })
  84  |           .include('[data-testid="right-inspector"]')
  85  |           .withTags(WCAG_TAGS)
  86  |           .analyze();
  87  |         let blocking = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
  88  |         expect(blocking).toEqual([]);
  89  | 
  90  |         // Check Palette tab
  91  |         const paletteTab = page.getByTestId('tab-palette');
  92  |         await paletteTab.click();
  93  |         await page.waitForTimeout(150);
  94  | 
  95  |         results = await new AxeBuilder({ page })
  96  |           .include('[data-testid="right-inspector"]')
  97  |           .withTags(WCAG_TAGS)
  98  |           .analyze();
  99  |         blocking = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
> 100 |         expect(blocking).toEqual([]);
      |                          ^ Error: expect(received).toEqual(expected) // deep equality
  101 | 
  102 |         // Check AI / PixiTools tab
  103 |         const aiTab = page.getByTestId('tab-ai');
  104 |         await aiTab.click();
  105 |         await page.waitForTimeout(150);
  106 | 
  107 |         results = await new AxeBuilder({ page })
  108 |           .include('[data-testid="right-inspector"]')
  109 |           .withTags(WCAG_TAGS)
  110 |           .analyze();
  111 |         blocking = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
  112 |         expect(blocking).toEqual([]);
  113 | 
  114 |         // Include the open lighting controls, not only the task chooser.
  115 |         await page.getByTestId('pixitools-task-lighting').click();
  116 |         await expect(page.getByRole('button', { name: 'Preview lighting', exact: true })).toBeVisible();
  117 |         results = await new AxeBuilder({ page })
  118 |           .include('[data-testid="right-inspector"]')
  119 |           .withTags(WCAG_TAGS)
  120 |           .analyze();
  121 |         blocking = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
  122 |         expect(blocking).toEqual([]);
  123 |       });
  124 | 
  125 |       test(`export modal dialog meets WCAG standards under ${theme.name}`, async ({ page }) => {
  126 |         const exportBtn = page.getByRole('button', { name: /Export drawing|Export/i }).or(page.getByTestId('export-button'));
  127 |         await expect(exportBtn.first()).toBeVisible();
  128 |         await exportBtn.first().click();
  129 | 
  130 |         const dialog = page.getByRole('dialog');
  131 |         await expect(dialog).toBeVisible({ timeout: 10000 });
  132 |         await page.waitForTimeout(300);
  133 | 
  134 |         const results = await new AxeBuilder({ page })
  135 |           .include('dialog[open], [role="dialog"]')
  136 |           .withTags(WCAG_TAGS)
  137 |           .analyze();
  138 | 
  139 |         const blocking = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
  140 |         expect(blocking).toEqual([]);
  141 | 
  142 |         await page.keyboard.press('Escape');
  143 |         await expect(dialog).not.toBeVisible();
  144 |       });
  145 | 
  146 |       test(`projects gallery modal meets WCAG standards under ${theme.name}`, async ({ page }) => {
  147 |         await page.getByTestId('file-menu-button').click();
  148 |         const fileResults = await new AxeBuilder({ page }).include('[role="menu"]').withTags(WCAG_TAGS).analyze();
  149 |         expect(fileResults.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')).toEqual([]);
  150 |         const galleryBtn = page.getByRole('menuitem', { name: 'Projects', exact: true });
  151 |         await expect(galleryBtn.first()).toBeVisible();
  152 |         await galleryBtn.first().click();
  153 | 
  154 |         const dialog = page.getByRole('dialog');
  155 |         await expect(dialog).toBeVisible({ timeout: 10000 });
  156 |         await page.waitForTimeout(300);
  157 | 
  158 |         const results = await new AxeBuilder({ page })
  159 |           .include('dialog[open], [role="dialog"]')
  160 |           .withTags(WCAG_TAGS)
  161 |           .analyze();
  162 | 
  163 |         const blocking = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
  164 |         expect(blocking).toEqual([]);
  165 | 
  166 |         await page.keyboard.press('Escape');
  167 |         await expect(dialog).not.toBeVisible();
  168 |       });
  169 | 
  170 |       test(`toast alert notification meets WCAG standards under ${theme.name}`, async ({ page }) => {
  171 |         const saveBtn = page.getByRole('button', { name: /Save now|Save/i });
  172 |         await expect(saveBtn.first()).toBeVisible();
  173 |         await saveBtn.first().click();
  174 | 
  175 |         const toast = page.locator('[data-testid="save-affirmation-toast"], [data-testid="studio-toast"]');
  176 |         await expect(toast).toBeVisible({ timeout: 5000 });
  177 |         await page.waitForTimeout(150);
  178 | 
  179 |         const results = await new AxeBuilder({ page })
  180 |           .include('[data-testid="save-affirmation-toast"], [data-testid="studio-toast"]')
  181 |           .withTags(WCAG_TAGS)
  182 |           .analyze();
  183 | 
  184 |         const blocking = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
  185 |         expect(blocking).toEqual([]);
  186 |       });
  187 |     });
  188 |   }
  189 | });
  190 | 
```