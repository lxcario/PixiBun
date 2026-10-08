# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: compactControlAccessibility.spec.ts >> compiled atelier light keeps compact controls reachable and passes scoped accessibility checks
- Location: tests\production\compactControlAccessibility.spec.ts:6:9

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
- generic [active] [ref=e1]:
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
        - button "Rename project A long project title for compact controls" [ref=e177] [cursor=pointer]: A long project title for compact controls
        - button "Save now" [ref=e178]:
          - generic [ref=e179]: Save
        - generic [ref=e181]:
          - generic [ref=e182]:
            - button "Undo last action" [disabled]
            - tooltip "Undo Ctrl+Z":
              - generic: Undo
              - generic: Ctrl+Z
          - generic [ref=e183]:
            - button "Redo last action" [disabled]
      - group "Drawing controls" [ref=e184]:
        - generic "Tool options rail" [ref=e185]:
          - button "Brush size 1 pixels" [ref=e187]:
            - generic [ref=e188]: 1 px
            - generic [ref=e189]: ▾
      - generic [ref=e190]:
        - group "Canvas controls" [ref=e191]:
          - group "Mirror drawing" [ref=e192]:
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
            - option "Drawing"
            - option "Animation"
            - option "Lighting" [selected]
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
            - button "Pen" [pressed] [ref=e232] [cursor=pointer]
            - button "Bézier Curve" [ref=e234] [cursor=pointer]
            - button "Eraser" [ref=e236] [cursor=pointer]
            - button "Flood Fill" [ref=e238] [cursor=pointer]
            - button "Pixel Gradient" [ref=e240] [cursor=pointer]
            - button "Dither Brush" [ref=e242] [cursor=pointer]
            - button "Color Replace" [ref=e244] [cursor=pointer]
            - button "Erase Sampled Color" [ref=e246] [cursor=pointer]
          - group "Selection" [ref=e247]:
            - button "Marquee Box" [ref=e250] [cursor=pointer]
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
              - 'button "Quick color #DDDFDF" [ref=e281] [cursor=pointer]'
              - 'button "Quick color #DDDDDF" [ref=e282] [cursor=pointer]'
              - 'button "Quick color #D0C4DF" [ref=e283] [cursor=pointer]'
              - 'button "Quick color #DCABDF" [ref=e284] [cursor=pointer]'
            - button "Quick Swatches Flyout" [ref=e285] [cursor=pointer]
      - main "Pixel art canvas workspace" [ref=e289]:
        - application "Pixel art drawing canvas. Use mouse or stylus to paint, arrow keys to pan viewport or nudge selection, and Alt+drag to pan." [ref=e290]
      - complementary [ref=e293]:
        - generic [ref=e294]:
          - button "Tools" [ref=e295]
          - button "Layers" [ref=e297]
          - button "Palette" [ref=e299]
          - button "PixiTools" [pressed] [ref=e301]:
            - generic [ref=e302]: FX
        - generic [ref=e303]:
          - region "Pinned color panel" [ref=e304]:
            - generic [ref=e305]:
              - generic [ref=e306]:
                - generic [ref=e307]: Color Wheel
                - generic [ref=e308]:
                  - button "Foreground ·" [pressed] [ref=e309]:
                    - generic [ref=e311]: Foreground
                    - text: ·
                  - button "Background" [ref=e312]
              - generic [ref=e315]:
                - button "Collapse pinned color panel" [ref=e316]: ▲
                - button "Unpin color panel" [ref=e317]: ✕
            - generic [ref=e319]:
              - generic [ref=e320]:
                - generic [ref=e321]: Color picker
                - combobox "Color picker shape" [ref=e322]:
                  - option "Triangle" [selected]
                  - option "Square"
              - img "Saturation and value triangle. Use the sliders below for keyboard control." [ref=e326]
              - generic [ref=e327]:
                - generic [ref=e328]: Hue
                - slider "Picker hue" [ref=e329]: "264"
              - generic [ref=e330]:
                - generic [ref=e331]: Saturation
                - slider "Picker saturation" [ref=e332]: "39"
              - generic [ref=e333]:
                - generic [ref=e334]: Value
                - slider "Picker value" [ref=e335]: "30"
              - textbox "Picker hex color" [ref=e338]: "#3A2E4C"
          - generic [ref=e339]:
            - generic [ref=e340]:
              - button "← Choose another task" [ref=e341] [cursor=pointer]
              - heading "Add light and depth" [level=2] [ref=e342]
              - paragraph [ref=e343]: Light your sprite, shape its surface, or add a shadow.
            - generic [ref=e346]:
              - generic [ref=e347]:
                - heading [level=3] [ref=e349]:
                  - button "Light your sprite" [expanded] [ref=e350] [cursor=pointer]:
                    - generic [ref=e352]:
                      - generic [ref=e353]: Light your sprite
                      - generic [ref=e354]: Move a light to preview highlights and shading.
                    - generic [ref=e355]: ▾
                - generic [ref=e357]:
                  - group "Lighting setup" [ref=e358]:
                    - button "Auto setup" [pressed] [ref=e359] [cursor=pointer]
                    - button "Manual setup" [ref=e361] [cursor=pointer]
                  - paragraph [ref=e363]: Auto chooses settings from your sprite.
                  - group [ref=e364]:
                    - generic "Shading style 2 shadow tones" [ref=e365] [cursor=pointer]:
                      - generic [ref=e366]:
                        - generic [ref=e367]: ▸
                        - text: Shading style
                      - generic [ref=e368]: 2 shadow tones
                  - generic [ref=e369]:
                    - button "Preview lighting" [ref=e370]
                    - generic [ref=e373]: Drag the light on your artwork. Enter applies · Esc cancels.
                  - group [ref=e375]:
                    - generic "More lighting actions" [ref=e376] [cursor=pointer]:
                      - generic [ref=e377]: ▸
                      - text: More lighting actions
              - heading [level=3] [ref=e380]:
                - button "Shape the surface" [ref=e381] [cursor=pointer]:
                  - generic [ref=e383]:
                    - generic [ref=e384]: Shape the surface
                    - generic [ref=e385]: Paint raised edges that respond to lighting.
                  - generic [ref=e386]: ▸
              - heading [level=3] [ref=e389]:
                - button "Add a shadow" [ref=e390] [cursor=pointer]:
                  - generic [ref=e392]:
                    - generic [ref=e393]: Add a shadow
                    - generic [ref=e394]: Place a shadow beneath or behind your sprite.
                  - generic [ref=e395]: ▸
        - region "Canvas navigator" [ref=e396]:
          - generic [ref=e397]:
            - generic [ref=e398]: Navigator
            - generic [ref=e400]:
              - generic "Canvas dimensions" [ref=e401]: 32 × 32
              - generic "Current zoom" [ref=e402]: 1600%
          - button "Canvas overview. Click or drag to pan; arrow keys pan, Shift moves eight pixels, Enter centers." [ref=e404]
          - generic [ref=e406]:
            - button "Zoom out" [ref=e407] [cursor=pointer]: "-"
            - slider "Navigator zoom slider" [ref=e408] [cursor=pointer]: "1600"
            - button "Zoom in" [ref=e409] [cursor=pointer]: +
          - generic [ref=e410]:
            - button "1:1" [ref=e411] [cursor=pointer]
            - button "Fit canvas" [ref=e412] [cursor=pointer]
            - button "Center" [ref=e413] [cursor=pointer]
            - generic [ref=e414] [cursor=pointer]:
              - checkbox "Grid" [ref=e415]
              - generic [ref=e416]: Grid
    - generic [ref=e418]:
      - generic [ref=e419]: "X: — Y: —"
      - generic [ref=e422]: 32×32
      - generic [ref=e425]: 1600%
      - generic [ref=e427]: Frame 1/1
      - generic [ref=e429]: Base Layer
      - generic [ref=e430]: pen
      - status "All changes saved to local storage" [ref=e435]:
        - generic [ref=e437]: Saved
  - alert [ref=e438]
```

# Test source

```ts
  1  | import { expect, test } from '@playwright/test';
  2  | import AxeBuilder from '@axe-core/playwright';
  3  | 
  4  | for (const studio of ['atelier', 'cozy-classic'] as const) {
  5  |   for (const scheme of ['dark', 'light'] as const) {
  6  |     test(`compiled ${studio} ${scheme} keeps compact controls reachable and passes scoped accessibility checks`, async ({ page }) => {
  7  |       await page.setViewportSize({ width: 1920, height: 900 });
  8  |       await page.goto('/studio');
  9  |       await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  10 |       await page.getByRole('button', { name: 'Studio options', exact: true }).click();
  11 |       await page.getByTestId(`theme-option-${studio}`).click();
  12 |       await page.getByTestId(`scheme-option-${scheme}`).click();
  13 |       await page.keyboard.press('Escape');
  14 |       await expect(page.locator('html')).toHaveAttribute('data-studio-theme', studio);
  15 |       await expect(page.locator('html')).toHaveAttribute('data-color-scheme', scheme);
  16 |       const header = page.getByRole('banner');
  17 |       await header.getByRole('button', { name: /^Rename project/ }).click();
  18 |       await header.getByRole('textbox').fill('A long project title for compact controls');
  19 |       await header.getByRole('textbox').press('Enter');
  20 | 
  21 |       for (const width of [1920, 1280, 1024]) {
  22 |         await page.setViewportSize({ width, height: 900 });
  23 |         await expect.poll(() => header.evaluate(element => {
  24 |           const bounds = element.getBoundingClientRect();
  25 |           const boxes = Array.from(element.querySelectorAll<HTMLElement>('button, input:not([type="file"]), select, a'))
  26 |             .filter(control => control.getClientRects().length > 0).map(control => control.getBoundingClientRect());
  27 |           return bounds.height === 48 && boxes.every(box => box.width >= 24 && box.height >= 24 && box.left >= bounds.left && box.right <= bounds.right && box.top >= bounds.top && box.bottom <= bounds.bottom)
  28 |             && boxes.every((box, index) => boxes.slice(index + 1).every(other => Math.min(box.right, other.right) - Math.max(box.left, other.left) <= 1 || Math.min(box.bottom, other.bottom) - Math.max(box.top, other.top) <= 1));
  29 |         }), `${studio}/${scheme} controls fit without overlap at ${width}px`).toBe(true);
  30 |       }
  31 | 
  32 |       await page.getByLabel('Workspace layout', { exact: true }).selectOption('lighting');
  33 |       await expect(page.getByRole('region', { name: 'Pinned color panel', exact: true })).toBeVisible();
  34 |       const result = await new AxeBuilder({ page }).include('header').include('aside').include('[aria-label="Pinned color panel"]')
  35 |         .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
> 36 |       expect(result.violations.filter(issue => issue.impact === 'serious' || issue.impact === 'critical')).toEqual([]);
     |                                                                                                            ^ Error: expect(received).toEqual(expected) // deep equality
  37 |       await page.getByTestId('tab-palette').click();
  38 |       await expect(page.getByRole('region', { name: 'Pinned color panel', exact: true })).toHaveCount(1);
  39 |       await page.getByRole('button', { name: 'Unpin color panel', exact: true }).click();
  40 |       await expect(page.getByRole('region', { name: 'Pinned color panel', exact: true })).toHaveCount(0);
  41 |       await expect(page.getByRole('region', { name: 'Palette color picker', exact: true })).toBeVisible();
  42 |       await page.getByRole('button', { name: 'Pin color panel', exact: true }).click();
  43 |       await page.getByTestId('tab-layers').click();
  44 |       await expect(page.getByRole('region', { name: 'Pinned color panel', exact: true })).toBeVisible();
  45 |       await page.reload();
  46 |       await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  47 |       await expect(page.getByRole('region', { name: 'Pinned color panel', exact: true })).toBeVisible();
  48 |       await page.getByRole('button', { name: 'Unpin color panel', exact: true }).click();
  49 |       await expect(page.getByRole('region', { name: 'Pinned color panel', exact: true })).toHaveCount(0);
  50 |     });
  51 |   }
  52 | }
  53 | 
```