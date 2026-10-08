# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: compactControlAccessibility.spec.ts >> compiled cozy-classic light keeps compact controls reachable and passes scoped accessibility checks
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
        - button "Rename project A long project title for compact controls" [ref=e183] [cursor=pointer]: A long project title for compact controls
        - button "Save now" [ref=e184]:
          - generic [ref=e185]: Save
        - generic [ref=e187]:
          - generic [ref=e188]:
            - button "Undo last action" [disabled]
            - tooltip "Undo Ctrl+Z":
              - generic: Undo
              - generic: Ctrl+Z
          - generic [ref=e189]:
            - button "Redo last action" [disabled]
      - group "Drawing controls" [ref=e190]:
        - generic "Tool options rail" [ref=e191]:
          - button "Brush size 1 pixels" [ref=e193]:
            - generic [ref=e194]: 1 px
            - generic [ref=e195]: ▾
      - generic [ref=e196]:
        - group "Canvas controls" [ref=e197]:
          - group "Mirror drawing" [ref=e198]:
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
            - option "Drawing"
            - option "Animation"
            - option "Lighting" [selected]
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
            - button "Pen" [pressed] [ref=e238] [cursor=pointer]
            - button "Bézier Curve" [ref=e240] [cursor=pointer]
            - button "Eraser" [ref=e242] [cursor=pointer]
            - button "Flood Fill" [ref=e244] [cursor=pointer]
            - button "Pixel Gradient" [ref=e246] [cursor=pointer]
            - button "Dither Brush" [ref=e248] [cursor=pointer]
            - button "Color Replace" [ref=e250] [cursor=pointer]
            - button "Erase Sampled Color" [ref=e252] [cursor=pointer]
          - group "Selection" [ref=e253]:
            - button "Marquee Box" [ref=e256] [cursor=pointer]
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
              - 'button "Quick color #DDDFDF" [ref=e287] [cursor=pointer]'
              - 'button "Quick color #DDDDDF" [ref=e288] [cursor=pointer]'
              - 'button "Quick color #D0C4DF" [ref=e289] [cursor=pointer]'
              - 'button "Quick color #DCABDF" [ref=e290] [cursor=pointer]'
            - button "Quick Swatches Flyout" [ref=e291] [cursor=pointer]
      - main "Pixel art canvas workspace" [ref=e295]:
        - application "Pixel art drawing canvas. Use mouse or stylus to paint, arrow keys to pan viewport or nudge selection, and Alt+drag to pan." [ref=e296]
      - complementary [ref=e299]:
        - generic [ref=e300]:
          - button "Tools" [ref=e301]
          - button "Layers" [ref=e303]
          - button "Palette" [ref=e305]
          - button "PixiTools" [pressed] [ref=e307]:
            - generic [ref=e308]: FX
        - generic [ref=e309]:
          - region "Pinned color panel" [ref=e310]:
            - generic [ref=e311]:
              - generic [ref=e312]:
                - generic [ref=e313]: Color Wheel
                - generic [ref=e314]:
                  - button "Foreground ·" [pressed] [ref=e315]:
                    - generic [ref=e317]: Foreground
                    - text: ·
                  - button "Background" [ref=e318]
              - generic [ref=e321]:
                - button "Collapse pinned color panel" [ref=e322]: ▲
                - button "Unpin color panel" [ref=e323]: ✕
            - generic [ref=e325]:
              - generic [ref=e326]:
                - generic [ref=e327]: Color picker
                - combobox "Color picker shape" [ref=e328]:
                  - option "Triangle" [selected]
                  - option "Square"
              - img "Saturation and value triangle. Use the sliders below for keyboard control." [ref=e332]
              - generic [ref=e333]:
                - generic [ref=e334]: Hue
                - slider "Picker hue" [ref=e335]: "264"
              - generic [ref=e336]:
                - generic [ref=e337]: Saturation
                - slider "Picker saturation" [ref=e338]: "39"
              - generic [ref=e339]:
                - generic [ref=e340]: Value
                - slider "Picker value" [ref=e341]: "30"
              - textbox "Picker hex color" [ref=e344]: "#3A2E4C"
          - generic [ref=e345]:
            - generic [ref=e346]:
              - button "← Choose another task" [ref=e347] [cursor=pointer]
              - heading "Add light and depth" [level=2] [ref=e348]
              - paragraph [ref=e349]: Light your sprite, shape its surface, or add a shadow.
            - generic [ref=e352]:
              - generic [ref=e353]:
                - heading [level=3] [ref=e355]:
                  - button "Light your sprite" [expanded] [ref=e356] [cursor=pointer]:
                    - generic [ref=e358]:
                      - generic [ref=e359]: Light your sprite
                      - generic [ref=e360]: Move a light to preview highlights and shading.
                    - generic [ref=e361]: ▾
                - generic [ref=e363]:
                  - group "Lighting setup" [ref=e364]:
                    - button "Auto setup" [pressed] [ref=e365] [cursor=pointer]
                    - button "Manual setup" [ref=e367] [cursor=pointer]
                  - paragraph [ref=e369]: Auto chooses settings from your sprite.
                  - group [ref=e370]:
                    - generic "Shading style 2 shadow tones" [ref=e371] [cursor=pointer]:
                      - generic [ref=e372]:
                        - generic [ref=e373]: ▸
                        - text: Shading style
                      - generic [ref=e374]: 2 shadow tones
                  - generic [ref=e375]:
                    - button "Preview lighting" [ref=e376]
                    - generic [ref=e379]: Drag the light on your artwork. Enter applies · Esc cancels.
                  - group [ref=e381]:
                    - generic "More lighting actions" [ref=e382] [cursor=pointer]:
                      - generic [ref=e383]: ▸
                      - text: More lighting actions
              - heading [level=3] [ref=e386]:
                - button "Shape the surface" [ref=e387] [cursor=pointer]:
                  - generic [ref=e389]:
                    - generic [ref=e390]: Shape the surface
                    - generic [ref=e391]: Paint raised edges that respond to lighting.
                  - generic [ref=e392]: ▸
              - heading [level=3] [ref=e395]:
                - button "Add a shadow" [ref=e396] [cursor=pointer]:
                  - generic [ref=e398]:
                    - generic [ref=e399]: Add a shadow
                    - generic [ref=e400]: Place a shadow beneath or behind your sprite.
                  - generic [ref=e401]: ▸
        - region "Canvas navigator" [ref=e402]:
          - generic [ref=e403]:
            - generic [ref=e404]: Navigator
            - generic [ref=e406]:
              - generic "Canvas dimensions" [ref=e407]: 32 × 32
              - generic "Current zoom" [ref=e408]: 1600%
          - button "Canvas overview. Click or drag to pan; arrow keys pan, Shift moves eight pixels, Enter centers." [ref=e410]
          - generic [ref=e412]:
            - button "Zoom out" [ref=e413] [cursor=pointer]: "-"
            - slider "Navigator zoom slider" [ref=e414] [cursor=pointer]: "1600"
            - button "Zoom in" [ref=e415] [cursor=pointer]: +
          - generic [ref=e416]:
            - button "1:1" [ref=e417] [cursor=pointer]
            - button "Fit canvas" [ref=e418] [cursor=pointer]
            - button "Center" [ref=e419] [cursor=pointer]
            - generic [ref=e420] [cursor=pointer]:
              - checkbox "Grid" [ref=e421]
              - generic [ref=e422]: Grid
    - generic [ref=e424]:
      - generic [ref=e425]: "X: — Y: —"
      - generic [ref=e428]: 32×32
      - generic [ref=e431]: 1600%
      - generic [ref=e433]: Frame 1/1
      - generic [ref=e435]: Base Layer
      - generic [ref=e436]: pen
      - status "All changes saved to local storage" [ref=e441]:
        - generic [ref=e443]: Saved
  - alert [ref=e444]
```

# Test source

```ts
  1  | import { expect, test } from '@playwright/test';
  2  | import AxeBuilder from '@axe-core/playwright';
  3  | import { writeFile } from 'node:fs/promises';
  4  | 
  5  | for (const studio of ['atelier', 'cozy-classic'] as const) {
  6  |   for (const scheme of ['dark', 'light'] as const) {
  7  |     test(`compiled ${studio} ${scheme} keeps controls reachable and records the requested compact dock accessibility tradeoff`, async ({ page }, info) => {
  8  |       await page.setViewportSize({ width: 1920, height: 900 });
  9  |       await page.goto('/studio');
  10 |       await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  11 |       await page.getByRole('button', { name: 'Studio options', exact: true }).click();
  12 |       await page.getByTestId(`theme-option-${studio}`).click();
  13 |       await page.getByTestId(`scheme-option-${scheme}`).click();
  14 |       await page.keyboard.press('Escape');
  15 |       await expect(page.locator('html')).toHaveAttribute('data-studio-theme', studio);
  16 |       await expect(page.locator('html')).toHaveAttribute('data-color-scheme', scheme);
  17 |       const header = page.getByRole('banner');
  18 |       await header.getByRole('button', { name: /^Rename project/ }).click();
  19 |       await header.getByRole('textbox').fill('A long project title for compact controls');
  20 |       await header.getByRole('textbox').press('Enter');
  21 | 
  22 |       for (const width of [1920, 1280, 1024]) {
  23 |         await page.setViewportSize({ width, height: 900 });
  24 |         await expect.poll(() => header.evaluate(element => {
  25 |           const bounds = element.getBoundingClientRect();
  26 |           const boxes = Array.from(element.querySelectorAll<HTMLElement>('button, input:not([type="file"]), select, a'))
  27 |             .filter(control => control.getClientRects().length > 0).map(control => control.getBoundingClientRect());
  28 |           return bounds.height === 48 && boxes.every(box => box.width >= 24 && box.height >= 24 && box.left >= bounds.left && box.right <= bounds.right && box.top >= bounds.top && box.bottom <= bounds.bottom)
  29 |             && boxes.every((box, index) => boxes.slice(index + 1).every(other => Math.min(box.right, other.right) - Math.max(box.left, other.left) <= 1 || Math.min(box.bottom, other.bottom) - Math.max(box.top, other.top) <= 1));
  30 |         }), `${studio}/${scheme} controls fit without overlap at ${width}px`).toBe(true);
  31 |       }
  32 | 
  33 |       await page.getByLabel('Workspace layout', { exact: true }).selectOption('lighting');
  34 |       await expect(page.getByRole('region', { name: 'Pinned color panel', exact: true })).toBeVisible();
  35 |       const result = await new AxeBuilder({ page }).include('header').include('aside').include('[aria-label="Pinned color panel"]')
> 36 |         .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
     |                                                                                                            ^ Error: expect(received).toEqual(expected) // deep equality
  37 |       // The user explicitly restored the original small dock. Keep its target-size
  38 |       // finding visible in evidence; this is an accepted limitation, not WCAG compliance.
  39 |       const serious = result.violations.filter(issue => issue.impact === 'serious' || issue.impact === 'critical');
  40 |       await writeFile(info.outputPath('accessibility-findings.json'), JSON.stringify(serious, null, 2));
  41 |       const acceptedDockNodes = new Set<string>();
  42 |       for (const issue of serious.filter(issue => issue.id === 'target-size')) for (const node of issue.nodes) {
  43 |         const selector = node.target.length === 1 && typeof node.target[0] === 'string' ? node.target[0] : null;
  44 |         if (selector && await page.locator(selector).evaluate(element => Boolean(element.closest('[data-testid="toolbar-color-dock"]')))) acceptedDockNodes.add(selector);
  45 |       }
  46 |       expect(serious.filter(issue => issue.id !== 'target-size' || issue.nodes.some(node => node.target.length !== 1 || !acceptedDockNodes.has(String(node.target[0]))))).toEqual([]);
  47 |       await page.getByTestId('tab-palette').click();
  48 |       await expect(page.getByRole('region', { name: 'Pinned color panel', exact: true })).toHaveCount(1);
  49 |       await page.getByRole('button', { name: 'Unpin color panel', exact: true }).click();
  50 |       await expect(page.getByRole('region', { name: 'Pinned color panel', exact: true })).toHaveCount(0);
  51 |       await expect(page.getByRole('region', { name: 'Palette color picker', exact: true })).toBeVisible();
  52 |       await page.getByRole('button', { name: 'Pin color panel', exact: true }).click();
  53 |       await page.getByTestId('tab-layers').click();
  54 |       await expect(page.getByRole('region', { name: 'Pinned color panel', exact: true })).toBeVisible();
  55 |       await page.reload();
  56 |       await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  57 |       await expect(page.getByRole('region', { name: 'Pinned color panel', exact: true })).toBeVisible();
  58 |       await page.getByRole('button', { name: 'Unpin color panel', exact: true }).click();
  59 |       await expect(page.getByRole('region', { name: 'Pinned color panel', exact: true })).toHaveCount(0);
  60 |     });
  61 |   }
  62 | }
  63 | 
```