# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: themeAccessibility.spec.ts >> Four-Theme Rendered Browser Accessibility Audits >> Cozy Classic Light Theme Accessibility Suite >> shell and blank canvas meet WCAG standards under Cozy Classic Light
- Location: tests\e2e\themeAccessibility.spec.ts:54:11

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  -   1
+ Received  + 418

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
+               "height": 14,
+               "minSize": 24,
+               "width": 14,
+             },
+             "id": "target-size",
+             "impact": "serious",
+             "message": "Target has insufficient size (14px by 14px, should be at least 24px by 24px)",
+             "relatedNodes": Array [],
+           },
+           Object {
+             "data": Object {
+               "closestOffset": 14,
+               "minOffset": 24,
+             },
+             "id": "target-offset",
+             "impact": "serious",
+             "message": "Target has insufficient space to its closest neighbors. Safe clickable space has a diameter of 14px instead of at least 24px.",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<button type=\"button\" style=\"background-color:#C7...\" class=\"absolute bottom-0.5 ...\" aria-label=\"Secondary color #C79...\" title=\"Secondary Color (#C7...\">",
+                 "target": Array [
+                   ".bottom-0\\.5",
+                 ],
+               },
+               Object {
+                 "html": "<button type=\"button\" style=\"background-color:#3A...\" class=\"absolute top-0.5 lef...\" aria-label=\"Primary color #3A2E4...\" title=\"Primary Color (#3A2E...\">",
+                 "target": Array [
+                   ".top-0\\.5",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Target has insufficient size (14px by 14px, should be at least 24px by 24px)
+   Target has insufficient space to its closest neighbors. Safe clickable space has a diameter of 14px instead of at least 24px.",
+         "html": "<button type=\"button\" title=\"Swap Foreground & Ba...\" aria-label=\"Swap colors (X)\" class=\"absolute top-0 right...\">",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "button[aria-label=\"Swap colors (X)\"]",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "height": 14,
+               "minSize": 24,
+               "width": 14,
+             },
+             "id": "target-size",
+             "impact": "serious",
+             "message": "Target has insufficient size (14px by 14px, should be at least 24px by 24px)",
+             "relatedNodes": Array [],
+           },
+           Object {
+             "data": Object {
+               "closestOffset": 14,
+               "minOffset": 24,
+             },
+             "id": "target-offset",
+             "impact": "serious",
+             "message": "Target has insufficient space to its closest neighbors. Safe clickable space has a diameter of 14px instead of at least 24px.",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<button type=\"button\" style=\"background-color:#C7...\" class=\"absolute bottom-0.5 ...\" aria-label=\"Secondary color #C79...\" title=\"Secondary Color (#C7...\">",
+                 "target": Array [
+                   ".bottom-0\\.5",
+                 ],
+               },
+               Object {
+                 "html": "<button type=\"button\" style=\"background-color:#3A...\" class=\"absolute top-0.5 lef...\" aria-label=\"Primary color #3A2E4...\" title=\"Primary Color (#3A2E...\">",
+                 "target": Array [
+                   ".top-0\\.5",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Target has insufficient size (14px by 14px, should be at least 24px by 24px)
+   Target has insufficient space to its closest neighbors. Safe clickable space has a diameter of 14px instead of at least 24px.",
+         "html": "<button type=\"button\" title=\"Default Colors: Blac...\" aria-label=\"Reset default black ...\" class=\"absolute bottom-0 le...\">",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".bottom-0.left-0.z-20",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "height": 22,
+               "minSize": 24,
+               "width": 22,
+             },
+             "id": "target-size",
+             "impact": "serious",
+             "message": "Target has insufficient size (22px by 22px, should be at least 24px by 24px)",
+             "relatedNodes": Array [],
+           },
+           Object {
+             "data": Object {
+               "closestOffset": 12.2,
+               "minOffset": 24,
+             },
+             "id": "target-offset",
+             "impact": "serious",
+             "message": "Target has insufficient space to its closest neighbors. Safe clickable space has a diameter of 12.2px instead of at least 24px.",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<button type=\"button\" title=\"Swap Foreground & Ba...\" aria-label=\"Swap colors (X)\" class=\"absolute top-0 right...\">",
+                 "target": Array [
+                   "button[aria-label=\"Swap colors (X)\"]",
+                 ],
+               },
+               Object {
+                 "html": "<button type=\"button\" title=\"Default Colors: Blac...\" aria-label=\"Reset default black ...\" class=\"absolute bottom-0 le...\">",
+                 "target": Array [
+                   ".bottom-0.left-0.z-20",
+                 ],
+               },
+               Object {
+                 "html": "<button type=\"button\" style=\"background-color:#3A...\" class=\"absolute top-0.5 lef...\" aria-label=\"Primary color #3A2E4...\" title=\"Primary Color (#3A2E...\">",
+                 "target": Array [
+                   ".top-0\\.5",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Target has insufficient size (22px by 22px, should be at least 24px by 24px)
+   Target has insufficient space to its closest neighbors. Safe clickable space has a diameter of 12.2px instead of at least 24px.",
+         "html": "<button type=\"button\" style=\"background-color:#C7...\" class=\"absolute bottom-0.5 ...\" aria-label=\"Secondary color #C79...\" title=\"Secondary Color (#C7...\">",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".bottom-0\\.5",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "height": 14,
+               "minSize": 24,
+               "width": 14,
+             },
+             "id": "target-size",
+             "impact": "serious",
+             "message": "Target has insufficient size (14px by 14px, should be at least 24px by 24px)",
+             "relatedNodes": Array [],
+           },
+           Object {
+             "data": Object {
+               "closestOffset": 12,
+               "minOffset": 24,
+             },
+             "id": "target-offset",
+             "impact": "serious",
+             "message": "Target has insufficient space to its closest neighbors. Safe clickable space has a diameter of 12px instead of at least 24px.",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<button style=\"background-color:#DDDDDF\" class=\"w-3.5 h-3.5 rounded-[1px] border border-black/40 hover:border-[var(--accent-gold)] transition-colors cursor-pointer\" aria-label=\"Quick color #DDDDDF\" title=\"#DDDDDF (Click: Primary | Right-click: Secondary)\"></button>",
+                 "target": Array [
+                   "button[aria-label=\"Quick color #DDDDDF\"]",
+                 ],
+               },
+               Object {
+                 "html": "<button style=\"background-color:#D0C4DF\" class=\"w-3.5 h-3.5 rounded-[1px] border border-black/40 hover:border-[var(--accent-gold)] transition-colors cursor-pointer\" aria-label=\"Quick color #D0C4DF\" title=\"#D0C4DF (Click: Primary | Right-click: Secondary)\"></button>",
+                 "target": Array [
+                   "button[aria-label=\"Quick color #D0C4DF\"]",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Target has insufficient size (14px by 14px, should be at least 24px by 24px)
+   Target has insufficient space to its closest neighbors. Safe clickable space has a diameter of 12px instead of at least 24px.",
+         "html": "<button style=\"background-color:#DDDFDF\" class=\"w-3.5 h-3.5 rounded-[1px] border border-black/40 hover:border-[var(--accent-gold)] transition-colors cursor-pointer\" aria-label=\"Quick color #DDDFDF\" title=\"#DDDFDF (Click: Primary | Right-click: Secondary)\"></button>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "button[aria-label=\"Quick color #DDDFDF\"]",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "height": 14,
+               "minSize": 24,
+               "width": 14,
+             },
+             "id": "target-size",
+             "impact": "serious",
+             "message": "Target has insufficient size (14px by 14px, should be at least 24px by 24px)",
+             "relatedNodes": Array [],
+           },
+           Object {
+             "data": Object {
+               "closestOffset": 12,
+               "minOffset": 24,
+             },
+             "id": "target-offset",
+             "impact": "serious",
+             "message": "Target has insufficient space to its closest neighbors. Safe clickable space has a diameter of 12px instead of at least 24px.",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<button style=\"background-color:#DDDFDF\" class=\"w-3.5 h-3.5 rounded-[1px] border border-black/40 hover:border-[var(--accent-gold)] transition-colors cursor-pointer\" aria-label=\"Quick color #DDDFDF\" title=\"#DDDFDF (Click: Primary | Right-click: Secondary)\"></button>",
+                 "target": Array [
+                   "button[aria-label=\"Quick color #DDDFDF\"]",
+                 ],
+               },
+               Object {
+                 "html": "<button style=\"background-color:#DCABDF\" class=\"w-3.5 h-3.5 rounded-[1px] border border-black/40 hover:border-[var(--accent-gold)] transition-colors cursor-pointer\" aria-label=\"Quick color #DCABDF\" title=\"#DCABDF (Click: Primary | Right-click: Secondary)\"></button>",
+                 "target": Array [
+                   "button[aria-label=\"Quick color #DCABDF\"]",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Target has insufficient size (14px by 14px, should be at least 24px by 24px)
+   Target has insufficient space to its closest neighbors. Safe clickable space has a diameter of 12px instead of at least 24px.",
+         "html": "<button style=\"background-color:#DDDDDF\" class=\"w-3.5 h-3.5 rounded-[1px] border border-black/40 hover:border-[var(--accent-gold)] transition-colors cursor-pointer\" aria-label=\"Quick color #DDDDDF\" title=\"#DDDDDF (Click: Primary | Right-click: Secondary)\"></button>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "button[aria-label=\"Quick color #DDDDDF\"]",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "height": 14,
+               "minSize": 24,
+               "width": 14,
+             },
+             "id": "target-size",
+             "impact": "serious",
+             "message": "Target has insufficient size (14px by 14px, should be at least 24px by 24px)",
+             "relatedNodes": Array [],
+           },
+           Object {
+             "data": Object {
+               "closestOffset": 12,
+               "minOffset": 24,
+             },
+             "id": "target-offset",
+             "impact": "serious",
+             "message": "Target has insufficient space to its closest neighbors. Safe clickable space has a diameter of 12px instead of at least 24px.",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<button style=\"background-color:#DDDFDF\" class=\"w-3.5 h-3.5 rounded-[1px] border border-black/40 hover:border-[var(--accent-gold)] transition-colors cursor-pointer\" aria-label=\"Quick color #DDDFDF\" title=\"#DDDFDF (Click: Primary | Right-click: Secondary)\"></button>",
+                 "target": Array [
+                   "button[aria-label=\"Quick color #DDDFDF\"]",
+                 ],
+               },
+               Object {
+                 "html": "<button style=\"background-color:#DCABDF\" class=\"w-3.5 h-3.5 rounded-[1px] border border-black/40 hover:border-[var(--accent-gold)] transition-colors cursor-pointer\" aria-label=\"Quick color #DCABDF\" title=\"#DCABDF (Click: Primary | Right-click: Secondary)\"></button>",
+                 "target": Array [
+                   "button[aria-label=\"Quick color #DCABDF\"]",
+                 ],
+               },
+               Object {
+                 "html": "<button title=\"Quick Swatches & Col...\" aria-label=\"Quick Swatches Flyou...\" class=\"w-9 h-3.5 rounded-[2...\">",
+                 "target": Array [
+                   "button[aria-label=\"Quick Swatches Flyout\"]",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Target has insufficient size (14px by 14px, should be at least 24px by 24px)
+   Target has insufficient space to its closest neighbors. Safe clickable space has a diameter of 12px instead of at least 24px.",
+         "html": "<button style=\"background-color:#D0C4DF\" class=\"w-3.5 h-3.5 rounded-[1px] border border-black/40 hover:border-[var(--accent-gold)] transition-colors cursor-pointer\" aria-label=\"Quick color #D0C4DF\" title=\"#D0C4DF (Click: Primary | Right-click: Secondary)\"></button>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "button[aria-label=\"Quick color #D0C4DF\"]",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "height": 14,
+               "minSize": 24,
+               "width": 14,
+             },
+             "id": "target-size",
+             "impact": "serious",
+             "message": "Target has insufficient size (14px by 14px, should be at least 24px by 24px)",
+             "relatedNodes": Array [],
+           },
+           Object {
+             "data": Object {
+               "closestOffset": 12,
+               "minOffset": 24,
+             },
+             "id": "target-offset",
+             "impact": "serious",
+             "message": "Target has insufficient space to its closest neighbors. Safe clickable space has a diameter of 12px instead of at least 24px.",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<button style=\"background-color:#DDDDDF\" class=\"w-3.5 h-3.5 rounded-[1px] border border-black/40 hover:border-[var(--accent-gold)] transition-colors cursor-pointer\" aria-label=\"Quick color #DDDDDF\" title=\"#DDDDDF (Click: Primary | Right-click: Secondary)\"></button>",
+                 "target": Array [
+                   "button[aria-label=\"Quick color #DDDDDF\"]",
+                 ],
+               },
+               Object {
+                 "html": "<button style=\"background-color:#D0C4DF\" class=\"w-3.5 h-3.5 rounded-[1px] border border-black/40 hover:border-[var(--accent-gold)] transition-colors cursor-pointer\" aria-label=\"Quick color #D0C4DF\" title=\"#D0C4DF (Click: Primary | Right-click: Secondary)\"></button>",
+                 "target": Array [
+                   "button[aria-label=\"Quick color #D0C4DF\"]",
+                 ],
+               },
+               Object {
+                 "html": "<button title=\"Quick Swatches & Col...\" aria-label=\"Quick Swatches Flyou...\" class=\"w-9 h-3.5 rounded-[2...\">",
+                 "target": Array [
+                   "button[aria-label=\"Quick Swatches Flyout\"]",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Target has insufficient size (14px by 14px, should be at least 24px by 24px)
+   Target has insufficient space to its closest neighbors. Safe clickable space has a diameter of 12px instead of at least 24px.",
+         "html": "<button style=\"background-color:#DCABDF\" class=\"w-3.5 h-3.5 rounded-[1px] border border-black/40 hover:border-[var(--accent-gold)] transition-colors cursor-pointer\" aria-label=\"Quick color #DCABDF\" title=\"#DCABDF (Click: Primary | Right-click: Secondary)\"></button>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "button[aria-label=\"Quick color #DCABDF\"]",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "height": 14,
+               "minSize": 24,
+               "width": 36,
+             },
+             "id": "target-size",
+             "impact": "serious",
+             "message": "Target has insufficient size (36px by 14px, should be at least 24px by 24px)",
+             "relatedNodes": Array [],
+           },
+           Object {
+             "data": Object {
+               "closestOffset": 21.6,
+               "minOffset": 24,
+             },
+             "id": "target-offset",
+             "impact": "serious",
+             "message": "Target has insufficient space to its closest neighbors. Safe clickable space has a diameter of 21.6px instead of at least 24px.",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<button style=\"background-color:#D0C4DF\" class=\"w-3.5 h-3.5 rounded-[1px] border border-black/40 hover:border-[var(--accent-gold)] transition-colors cursor-pointer\" aria-label=\"Quick color #D0C4DF\" title=\"#D0C4DF (Click: Primary | Right-click: Secondary)\"></button>",
+                 "target": Array [
+                   "button[aria-label=\"Quick color #D0C4DF\"]",
+                 ],
+               },
+               Object {
+                 "html": "<button style=\"background-color:#DCABDF\" class=\"w-3.5 h-3.5 rounded-[1px] border border-black/40 hover:border-[var(--accent-gold)] transition-colors cursor-pointer\" aria-label=\"Quick color #DCABDF\" title=\"#DCABDF (Click: Primary | Right-click: Secondary)\"></button>",
+                 "target": Array [
+                   "button[aria-label=\"Quick color #DCABDF\"]",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Target has insufficient size (36px by 14px, should be at least 24px by 24px)
+   Target has insufficient space to its closest neighbors. Safe clickable space has a diameter of 21.6px instead of at least 24px.",
+         "html": "<button title=\"Quick Swatches & Col...\" aria-label=\"Quick Swatches Flyou...\" class=\"w-9 h-3.5 rounded-[2...\">",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "button[aria-label=\"Quick Swatches Flyout\"]",
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
          - img "Bun, the PixiBun bunny" [ref=e11]
        - button "File" [ref=e175]:
          - text: File
          - generic [ref=e176]: ▼
        - button "Rename project Untitled Sprite" [ref=e177] [cursor=pointer]: Untitled Sprite
        - generic "Canvas size · change it in File" [ref=e178]: 32×32
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
          - button "Studio options" [active] [ref=e221] [cursor=pointer]:
            - generic [ref=e222]: Studio
            - generic [ref=e223]: ▼
        - button "Export drawing" [ref=e225]:
          - generic [ref=e226]: Export
    - status [ref=e228]: Not saved yet
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
              - 'button "Quick color #DDDFDF" [ref=e285] [cursor=pointer]'
              - 'button "Quick color #DDDDDF" [ref=e286] [cursor=pointer]'
              - 'button "Quick color #D0C4DF" [ref=e287] [cursor=pointer]'
              - 'button "Quick color #DCABDF" [ref=e288] [cursor=pointer]'
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
              - spinbutton "Active frame duration in milliseconds" [ref=e364]: "100"
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
        - 'button "Select frame 1. Duration: 100ms. Drag to reorder." [ref=e385]':
          - generic:
            - generic: "#1"
            - generic: 100ms
        - button "Clips" [ref=e386]
    - generic [ref=e388]:
      - generic [ref=e389]: "X: — Y: —"
      - generic [ref=e392]: 32×32
      - generic [ref=e395]: 1600%
      - generic [ref=e397]: Frame 1/1
      - generic [ref=e399]: Base Layer
      - generic [ref=e400]: pen
      - status "All changes saved to local storage" [ref=e405]:
        - generic [ref=e407]: Saved
  - button "Open Next.js Dev Tools" [ref=e413] [cursor=pointer]
  - alert [ref=e417]
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | import AxeBuilder from '@axe-core/playwright';
  3   | import { unexpectedStudioAccessibilityFindings } from '../helpers/studioAccessibilityFindings';
  4   | 
  5   | const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
  6   | 
  7   | interface ThemeCombo {
  8   |   name: string;
  9   |   studioTheme: 'atelier' | 'cozy-classic';
  10  |   colorScheme: 'dark' | 'light';
  11  | }
  12  | 
  13  | const THEMES: ThemeCombo[] = [
  14  |   { name: 'Atelier Dark', studioTheme: 'atelier', colorScheme: 'dark' },
  15  |   { name: 'Atelier Light', studioTheme: 'atelier', colorScheme: 'light' },
  16  |   { name: 'Cozy Classic Dark', studioTheme: 'cozy-classic', colorScheme: 'dark' },
  17  |   { name: 'Cozy Classic Light', studioTheme: 'cozy-classic', colorScheme: 'light' },
  18  | ];
  19  | 
  20  | test.describe('Four-Theme Rendered Browser Accessibility Audits', () => {
  21  |   for (const theme of THEMES) {
  22  |     test.describe(`${theme.name} Theme Accessibility Suite`, () => {
  23  |       test.beforeEach(async ({ page }) => {
  24  |         await page.goto('/studio');
  25  |         await page.waitForLoadState('domcontentloaded');
  26  |         await expect(page.locator('div[role="application"]')).toBeVisible();
  27  | 
  28  |         // Allow React hydration to complete
  29  |         await page.waitForTimeout(1100);
  30  | 
  31  |         // Apply theme attributes synchronously to DOM
  32  |         await page.evaluate(
  33  |           ({ studioTheme, colorScheme }) => {
  34  |             const root = document.documentElement;
  35  |             root.setAttribute('data-studio-theme', studioTheme);
  36  |             root.setAttribute('data-color-scheme', colorScheme);
  37  |             root.setAttribute('data-theme', colorScheme);
  38  |             if (colorScheme === 'light') {
  39  |               root.classList.add('light');
  40  |               root.classList.remove('dark');
  41  |               root.style.colorScheme = 'light';
  42  |             } else {
  43  |               root.classList.add('dark');
  44  |               root.classList.remove('light');
  45  |               root.style.colorScheme = 'dark';
  46  |             }
  47  |           },
  48  |           { studioTheme: theme.studioTheme, colorScheme: theme.colorScheme }
  49  |         );
  50  | 
  51  |         // Allow theme CSS variables to propagate and animations to settle
  52  |         await page.waitForTimeout(300);
  53  |       });
  54  | 
  55  |       test(`shell and blank canvas record accessibility findings and the requested compact dock tradeoff under ${theme.name}`, async ({ page }, info) => {
  56  |         const canvas = page.getByTestId('main-composite-canvas');
  57  |         await expect(canvas).toBeVisible();
  58  | 
  59  |         await page.getByRole('button', { name: 'Studio options' }).click();
  60  |         await expect(page.getByRole('dialog', { name: 'Studio options' })).toBeInViewport();
  61  |         const studioResults = await new AxeBuilder({ page }).include('[role="dialog"]').withTags(WCAG_TAGS).analyze();
  62  |         expect(studioResults.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')).toEqual([]);
  63  |         await page.keyboard.press('Escape');
  64  | 
  65  |         const results = await new AxeBuilder({ page })
  66  |           .withTags(WCAG_TAGS)
  67  |           .analyze();
  68  | 
  69  |         expect(await unexpectedStudioAccessibilityFindings(page, results.violations, info)).toEqual([]);
  70  |       });
> 71  | 
      |                                    ^ Error: expect(received).toEqual(expected) // deep equality
  72  |       test(`right inspector tabs meet WCAG standards under ${theme.name}`, async ({ page }) => {
  73  |         const inspector = page.getByTestId('right-inspector');
  74  |         await expect(inspector).toBeVisible();
  75  | 
  76  |         // Check Layers tab
  77  |         const layersTab = page.getByTestId('tab-layers');
  78  |         await layersTab.click();
  79  |         await page.waitForTimeout(150);
  80  | 
  81  |         let results = await new AxeBuilder({ page })
  82  |           .include('[data-testid="right-inspector"]')
  83  |           .withTags(WCAG_TAGS)
  84  |           .analyze();
  85  |         let blocking = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
  86  |         expect(blocking).toEqual([]);
  87  | 
  88  |         // Check Palette tab
  89  |         const paletteTab = page.getByTestId('tab-palette');
  90  |         await paletteTab.click();
  91  |         await page.waitForTimeout(150);
  92  | 
  93  |         results = await new AxeBuilder({ page })
  94  |           .include('[data-testid="right-inspector"]')
  95  |           .withTags(WCAG_TAGS)
  96  |           .analyze();
  97  |         blocking = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
  98  |         expect(blocking).toEqual([]);
  99  | 
  100 |         // Check AI / PixiTools tab
  101 |         const aiTab = page.getByTestId('tab-ai');
  102 |         await aiTab.click();
  103 |         await page.waitForTimeout(150);
  104 | 
  105 |         results = await new AxeBuilder({ page })
  106 |           .include('[data-testid="right-inspector"]')
  107 |           .withTags(WCAG_TAGS)
  108 |           .analyze();
  109 |         blocking = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
  110 |         expect(blocking).toEqual([]);
  111 | 
  112 |         // Include the open lighting controls, not only the task chooser.
  113 |         await page.getByTestId('pixitools-task-lighting').click();
  114 |         await expect(page.getByRole('button', { name: 'Preview lighting', exact: true })).toBeVisible();
  115 |         results = await new AxeBuilder({ page })
  116 |           .include('[data-testid="right-inspector"]')
  117 |           .withTags(WCAG_TAGS)
  118 |           .analyze();
  119 |         blocking = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
  120 |         expect(blocking).toEqual([]);
  121 |       });
  122 | 
  123 |       test(`export modal dialog meets WCAG standards under ${theme.name}`, async ({ page }) => {
  124 |         const exportBtn = page.getByRole('button', { name: /Export drawing|Export/i }).or(page.getByTestId('export-button'));
  125 |         await expect(exportBtn.first()).toBeVisible();
  126 |         await exportBtn.first().click();
  127 | 
  128 |         const dialog = page.getByRole('dialog');
  129 |         await expect(dialog).toBeVisible({ timeout: 10000 });
  130 |         await page.waitForTimeout(300);
  131 | 
  132 |         const results = await new AxeBuilder({ page })
  133 |           .include('dialog[open], [role="dialog"]')
  134 |           .withTags(WCAG_TAGS)
  135 |           .analyze();
  136 | 
  137 |         const blocking = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
  138 |         expect(blocking).toEqual([]);
  139 | 
  140 |         await page.keyboard.press('Escape');
  141 |         await expect(dialog).not.toBeVisible();
  142 |       });
  143 | 
  144 |       test(`projects gallery modal meets WCAG standards under ${theme.name}`, async ({ page }) => {
  145 |         await page.getByTestId('file-menu-button').click();
  146 |         const fileResults = await new AxeBuilder({ page }).include('[role="menu"]').withTags(WCAG_TAGS).analyze();
  147 |         expect(fileResults.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')).toEqual([]);
  148 |         const galleryBtn = page.getByRole('menuitem', { name: 'Projects', exact: true });
  149 |         await expect(galleryBtn.first()).toBeVisible();
  150 |         await galleryBtn.first().click();
  151 | 
  152 |         const dialog = page.getByRole('dialog');
  153 |         await expect(dialog).toBeVisible({ timeout: 10000 });
  154 |         await page.waitForTimeout(300);
  155 | 
  156 |         const results = await new AxeBuilder({ page })
  157 |           .include('dialog[open], [role="dialog"]')
  158 |           .withTags(WCAG_TAGS)
  159 |           .analyze();
  160 | 
  161 |         const blocking = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
  162 |         expect(blocking).toEqual([]);
  163 | 
  164 |         await page.keyboard.press('Escape');
  165 |         await expect(dialog).not.toBeVisible();
  166 |       });
  167 | 
  168 |       test(`toast alert notification meets WCAG standards under ${theme.name}`, async ({ page }) => {
  169 |         const saveBtn = page.getByRole('button', { name: /Save now|Save/i });
  170 |         await expect(saveBtn.first()).toBeVisible();
  171 |         await saveBtn.first().click();
```