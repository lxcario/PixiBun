# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: studio.spec.ts >> Studio Automated Accessibility Audits (axe-core, WCAG 2.2) >> RightInspector panels expanded pass automated WCAG 2.2 axe scan
- Location: tests\e2e\studio.spec.ts:370:7

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
          - button "Studio options" [ref=e221] [cursor=pointer]:
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
          - button "Layers" [active] [pressed] [ref=e301]
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
  280 |     // Draw stroke on frame 0
  281 |     const targetX = box.x + (box.width / 32) * 16.5;
  282 |     const targetY = box.y + (box.height / 32) * 16.5;
  283 |     await page.mouse.move(targetX, targetY);
  284 |     await page.mouse.down();
  285 |     await page.mouse.move(targetX + 6, targetY + 6);
  286 |     await page.mouse.up();
  287 |     await page.waitForTimeout(150);
  288 | 
  289 |     // Verify frame 0 thumbnail contains painted pixel data
  290 |     const thumb0PaintedCount = await page.evaluate(() => {
  291 |       const cvs = document.querySelector('canvas[data-testid="frame-thumbnail-0"]') as HTMLCanvasElement;
  292 |       if (!cvs) return 0;
  293 |       const ctx = cvs.getContext('2d', { willReadFrequently: true });
  294 |       if (!ctx) return 0;
  295 |       const img = ctx.getImageData(0, 0, cvs.width, cvs.height);
  296 |       let painted = 0;
  297 |       for (let i = 3; i < img.data.length; i += 4) {
  298 |         if (img.data[i] > 0) painted++;
  299 |       }
  300 |       return painted;
  301 |     });
  302 |     expect(thumb0PaintedCount).toBeGreaterThan(0);
  303 | 
  304 |     // Add a second frame
  305 |     const addFrameBtn = page.getByTitle(/Add Blank Frame/i);
  306 |     await addFrameBtn.click();
  307 |     await page.waitForTimeout(200);
  308 | 
  309 |     const thumb1 = page.locator('canvas[data-testid="frame-thumbnail-1"]');
  310 |     await expect(thumb1).toBeVisible();
  311 | 
  312 |     // Draw stroke on frame 1
  313 |     const targetX1 = box.x + (box.width / 32) * 8.5;
  314 |     const targetY1 = box.y + (box.height / 32) * 8.5;
  315 |     await page.mouse.move(targetX1, targetY1);
  316 |     await page.mouse.down();
  317 |     await page.mouse.move(targetX1 + 4, targetY1 + 4);
  318 |     await page.mouse.up();
  319 |     await page.waitForTimeout(150);
  320 | 
  321 |     // Verify frame 1 thumbnail contains painted pixel data
  322 |     const thumb1PaintedCount = await page.evaluate(() => {
  323 |       const cvs = document.querySelector('canvas[data-testid="frame-thumbnail-1"]') as HTMLCanvasElement;
  324 |       if (!cvs) return 0;
  325 |       const ctx = cvs.getContext('2d', { willReadFrequently: true });
  326 |       if (!ctx) return 0;
  327 |       const img = ctx.getImageData(0, 0, cvs.width, cvs.height);
  328 |       let painted = 0;
  329 |       for (let i = 3; i < img.data.length; i += 4) {
  330 |         if (img.data[i] > 0) painted++;
  331 |       }
  332 |       return painted;
  333 |     });
  334 |     expect(thumb1PaintedCount).toBeGreaterThan(0);
  335 |   });
  336 | 
  337 | });
  338 | 
  339 | test.describe('Studio Automated Accessibility Audits (axe-core, WCAG 2.2)', () => {
  340 |   test('blank canvas workspace passes automated WCAG 2.2 axe scan', async ({ page }) => {
  341 |     await page.goto('/studio');
  342 |     await page.waitForLoadState('domcontentloaded');
  343 |     await expect(page.locator('div[role="application"]')).toBeVisible();
  344 |     // Allow hydration, Dexie restore, and entrance animations to settle
  345 |     await page.waitForTimeout(1100);
  346 | 
  347 |     const results = await scanStudioAccessibility(page);
  348 |     expect(results.violations).toEqual([]);
  349 |   });
  350 | 
  351 |   test('open Export modal passes automated WCAG 2.2 axe scan', async ({ page }) => {
  352 |     await page.goto('/studio');
  353 |     await page.waitForLoadState('domcontentloaded');
  354 |     await expect(page.locator('div[role="application"]')).toBeVisible();
  355 |     await page.waitForTimeout(1100);
  356 | 
  357 |     const exportBtn = page.getByTitle(/Export PNG, GIF, or Spritesheet/i);
  358 |     await expect(exportBtn).toBeVisible();
  359 |     await exportBtn.click();
  360 | 
  361 |     // Export modal (lazy-loaded in Phase 33) — wait for dialog to mount
  362 |     const dialog = page.getByRole('dialog');
  363 |     await expect(dialog).toBeVisible();
  364 |     await page.waitForTimeout(400);
  365 | 
  366 |     const results = await scanStudioAccessibility(page);
  367 |     expect(results.violations).toEqual([]);
  368 |   });
  369 | 
  370 |   test('RightInspector panels expanded pass automated WCAG 2.2 axe scan', async ({ page }) => {
  371 |     await page.goto('/studio');
  372 |     await page.waitForLoadState('domcontentloaded');
  373 |     await expect(page.locator('div[role="application"]')).toBeVisible();
  374 |     await page.waitForTimeout(1100);
  375 | 
  376 |     // Tab 1: Layers
  377 |     await page.getByRole('button', { name: /^Layers$/i }).click();
  378 |     await page.waitForTimeout(300);
  379 |     const layersResults = await scanStudioAccessibility(page);
> 380 |     expect(layersResults.violations).toEqual([]);
      |                                      ^ Error: expect(received).toEqual(expected) // deep equality
  381 | 
  382 |     // Tab 2: Palette
  383 |     await page.getByRole('button', { name: /^Palette$/i }).click();
  384 |     await page.waitForTimeout(300);
  385 |     const paletteResults = await scanStudioAccessibility(page);
  386 |     expect(paletteResults.violations).toEqual([]);
  387 | 
  388 |     // Tab 3: PixiTools with the available lighting and patterns panels expanded
  389 |     await page.getByRole('button', { name: /PixiTools/i }).click();
  390 |     await page.getByTestId('pixitools-browse-all').click();
  391 |     await page.waitForTimeout(300);
  392 |     for (const name of [/Light your sprite/i, /^Patterns & Tilesets$/i]) {
  393 |       const panel = page.getByRole('button', { name });
  394 |       if (await panel.getAttribute('aria-expanded') === 'false') await panel.click();
  395 |     }
  396 |     await page.waitForTimeout(300);
  397 |     const aiResults = await scanStudioAccessibility(page);
  398 |     expect(aiResults.violations).toEqual([]);
  399 |   });
  400 | });
  401 | 
  402 | 
```