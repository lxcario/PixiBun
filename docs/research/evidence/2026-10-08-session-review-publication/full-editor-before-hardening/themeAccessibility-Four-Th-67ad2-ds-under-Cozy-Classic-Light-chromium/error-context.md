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
+ Received  + 660

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
+               "bgColor": "#ddcab3",
+               "contrastRatio": 4.49,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#8a4500",
+               "fontSize": "7.5pt (10px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 4.49 (foreground color: #8a4500, background color: #ddcab3, font size: 7.5pt (10px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<button type=\"button\" aria-label=\"Disable clean corner...\" aria-pressed=\"true\" title=\"Pixel-Perfect: Remov...\" class=\"hidden md:flex items...\">",
+                 "target": Array [
+                   ".md\\:flex",
+                 ],
+               },
+               Object {
+                 "html": "<div id=\"_R_6inebnalb_\" data-testid=\"tool-options-rail\" aria-label=\"Tool options rail\" class=\"flex h-7 px-2 xl:px-2.5 bg-[var(--surface-0)] border border-[var(--desk-border)] rounded-[2px] flex-wrap items-center gap-2\">",
+                 "target": Array [
+                   "#_R_6inebnalb_",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 4.49 (foreground color: #8a4500, background color: #ddcab3, font size: 7.5pt (10px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<span>Pixel-Perfect</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".md\\:flex > span",
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
+                 "html": "<button type=\"button\" aria-label=\"2px brush preset\" aria-pressed=\"false\" class=\"w-5 h-5 flex items-center justify-center rounded-[2px] text-[10px] font-mono transition-colors bg-[var(--surface-1)] text-[var(--text-muted)] hover:text-[var(--text-heading)] hover:bg-[var(--surface-2)]\">2</button>",
+                 "target": Array [
+                   "button[aria-label=\"2px brush preset\"]",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Target has insufficient size (20px by 20px, should be at least 24px by 24px)
+   Target has insufficient space to its closest neighbors. Safe clickable space has a diameter of 20px instead of at least 24px.",
+         "html": "<button type=\"button\" aria-label=\"1px brush preset\" aria-pressed=\"true\" class=\"w-5 h-5 flex items-center justify-center rounded-[2px] text-[10px] font-mono transition-colors bg-[var(--accent-gold)] text-[var(--surface-0)] font-bold\">1</button>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".text-\\[var\\(--surface-0\\)\\]",
+         ],
+       },
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
+                 "html": "<button type=\"button\" aria-label=\"1px brush preset\" aria-pressed=\"true\" class=\"w-5 h-5 flex items-center justify-center rounded-[2px] text-[10px] font-mono transition-colors bg-[var(--accent-gold)] text-[var(--surface-0)] font-bold\">1</button>",
+                 "target": Array [
+                   ".text-\\[var\\(--surface-0\\)\\]",
+                 ],
+               },
+               Object {
+                 "html": "<button type=\"button\" aria-label=\"3px brush preset\" aria-pressed=\"false\" class=\"w-5 h-5 flex items-center justify-center rounded-[2px] text-[10px] font-mono transition-colors bg-[var(--surface-1)] text-[var(--text-muted)] hover:text-[var(--text-heading)] hover:bg-[var(--surface-2)]\">3</button>",
+                 "target": Array [
+                   "button[aria-label=\"3px brush preset\"]",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Target has insufficient size (20px by 20px, should be at least 24px by 24px)
+   Target has insufficient space to its closest neighbors. Safe clickable space has a diameter of 20px instead of at least 24px.",
+         "html": "<button type=\"button\" aria-label=\"2px brush preset\" aria-pressed=\"false\" class=\"w-5 h-5 flex items-center justify-center rounded-[2px] text-[10px] font-mono transition-colors bg-[var(--surface-1)] text-[var(--text-muted)] hover:text-[var(--text-heading)] hover:bg-[var(--surface-2)]\">2</button>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "button[aria-label=\"2px brush preset\"]",
+         ],
+       },
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
+                 "html": "<button type=\"button\" aria-label=\"2px brush preset\" aria-pressed=\"false\" class=\"w-5 h-5 flex items-center justify-center rounded-[2px] text-[10px] font-mono transition-colors bg-[var(--surface-1)] text-[var(--text-muted)] hover:text-[var(--text-heading)] hover:bg-[var(--surface-2)]\">2</button>",
+                 "target": Array [
+                   "button[aria-label=\"2px brush preset\"]",
+                 ],
+               },
+               Object {
+                 "html": "<button type=\"button\" aria-label=\"4px brush preset\" aria-pressed=\"false\" class=\"w-5 h-5 flex items-center justify-center rounded-[2px] text-[10px] font-mono transition-colors bg-[var(--surface-1)] text-[var(--text-muted)] hover:text-[var(--text-heading)] hover:bg-[var(--surface-2)]\">4</button>",
+                 "target": Array [
+                   "button[aria-label=\"4px brush preset\"]",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Target has insufficient size (20px by 20px, should be at least 24px by 24px)
+   Target has insufficient space to its closest neighbors. Safe clickable space has a diameter of 20px instead of at least 24px.",
+         "html": "<button type=\"button\" aria-label=\"3px brush preset\" aria-pressed=\"false\" class=\"w-5 h-5 flex items-center justify-center rounded-[2px] text-[10px] font-mono transition-colors bg-[var(--surface-1)] text-[var(--text-muted)] hover:text-[var(--text-heading)] hover:bg-[var(--surface-2)]\">3</button>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "button[aria-label=\"3px brush preset\"]",
+         ],
+       },
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
+                 "html": "<button type=\"button\" aria-label=\"3px brush preset\" aria-pressed=\"false\" class=\"w-5 h-5 flex items-center justify-center rounded-[2px] text-[10px] font-mono transition-colors bg-[var(--surface-1)] text-[var(--text-muted)] hover:text-[var(--text-heading)] hover:bg-[var(--surface-2)]\">3</button>",
+                 "target": Array [
+                   "button[aria-label=\"3px brush preset\"]",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Target has insufficient size (20px by 20px, should be at least 24px by 24px)
+   Target has insufficient space to its closest neighbors. Safe clickable space has a diameter of 20px instead of at least 24px.",
+         "html": "<button type=\"button\" aria-label=\"4px brush preset\" aria-pressed=\"false\" class=\"w-5 h-5 flex items-center justify-center rounded-[2px] text-[10px] font-mono transition-colors bg-[var(--surface-1)] text-[var(--text-muted)] hover:text-[var(--text-heading)] hover:bg-[var(--surface-2)]\">4</button>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "button[aria-label=\"4px brush preset\"]",
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
+           ".bottom-0.left-0.active\\:scale-90",
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
+                   ".bottom-0.left-0.active\\:scale-90",
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
+                 "html": "<button style=\"background-color:#DDDDDF\" class=\"w-3.5 h-3.5 rounded-[1px] border border-black/40 hover:border-[var(--accent-gold)] hover:scale-110 transition-transform cursor-pointer\" title=\"#DDDDDF (Click: Primary | Right-click: Secondary)\"></button>",
+                 "target": Array [
+                   ".border-black\\/40.hover\\:scale-110.w-3\\.5:nth-child(2)",
+                 ],
+               },
+               Object {
+                 "html": "<button style=\"background-color:#D0C4DF\" class=\"w-3.5 h-3.5 rounded-[1px] border border-black/40 hover:border-[var(--accent-gold)] hover:scale-110 transition-transform cursor-pointer\" title=\"#D0C4DF (Click: Primary | Right-click: Secondary)\"></button>",
+                 "target": Array [
+                   ".border-black\\/40.hover\\:scale-110.w-3\\.5:nth-child(3)",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Target has insufficient size (14px by 14px, should be at least 24px by 24px)
+   Target has insufficient space to its closest neighbors. Safe clickable space has a diameter of 12px instead of at least 24px.",
+         "html": "<button style=\"background-color:#DDDFDF\" class=\"w-3.5 h-3.5 rounded-[1px] border border-black/40 hover:border-[var(--accent-gold)] hover:scale-110 transition-transform cursor-pointer\" title=\"#DDDFDF (Click: Primary | Right-click: Secondary)\"></button>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".border-black\\/40.hover\\:scale-110.w-3\\.5:nth-child(1)",
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
+                 "html": "<button style=\"background-color:#DDDFDF\" class=\"w-3.5 h-3.5 rounded-[1px] border border-black/40 hover:border-[var(--accent-gold)] hover:scale-110 transition-transform cursor-pointer\" title=\"#DDDFDF (Click: Primary | Right-click: Secondary)\"></button>",
+                 "target": Array [
+                   ".border-black\\/40.hover\\:scale-110.w-3\\.5:nth-child(1)",
+                 ],
+               },
+               Object {
+                 "html": "<button style=\"background-color:#DCABDF\" class=\"w-3.5 h-3.5 rounded-[1px] border border-black/40 hover:border-[var(--accent-gold)] hover:scale-110 transition-transform cursor-pointer\" title=\"#DCABDF (Click: Primary | Right-click: Secondary)\"></button>",
+                 "target": Array [
+                   ".border-black\\/40.hover\\:scale-110.w-3\\.5:nth-child(4)",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Target has insufficient size (14px by 14px, should be at least 24px by 24px)
+   Target has insufficient space to its closest neighbors. Safe clickable space has a diameter of 12px instead of at least 24px.",
+         "html": "<button style=\"background-color:#DDDDDF\" class=\"w-3.5 h-3.5 rounded-[1px] border border-black/40 hover:border-[var(--accent-gold)] hover:scale-110 transition-transform cursor-pointer\" title=\"#DDDDDF (Click: Primary | Right-click: Secondary)\"></button>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".border-black\\/40.hover\\:scale-110.w-3\\.5:nth-child(2)",
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
+                 "html": "<button style=\"background-color:#DDDFDF\" class=\"w-3.5 h-3.5 rounded-[1px] border border-black/40 hover:border-[var(--accent-gold)] hover:scale-110 transition-transform cursor-pointer\" title=\"#DDDFDF (Click: Primary | Right-click: Secondary)\"></button>",
+                 "target": Array [
+                   ".border-black\\/40.hover\\:scale-110.w-3\\.5:nth-child(1)",
+                 ],
+               },
+               Object {
+                 "html": "<button style=\"background-color:#DCABDF\" class=\"w-3.5 h-3.5 rounded-[1px] border border-black/40 hover:border-[var(--accent-gold)] hover:scale-110 transition-transform cursor-pointer\" title=\"#DCABDF (Click: Primary | Right-click: Secondary)\"></button>",
+                 "target": Array [
+                   ".border-black\\/40.hover\\:scale-110.w-3\\.5:nth-child(4)",
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
+         "html": "<button style=\"background-color:#D0C4DF\" class=\"w-3.5 h-3.5 rounded-[1px] border border-black/40 hover:border-[var(--accent-gold)] hover:scale-110 transition-transform cursor-pointer\" title=\"#D0C4DF (Click: Primary | Right-click: Secondary)\"></button>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".border-black\\/40.hover\\:scale-110.w-3\\.5:nth-child(3)",
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
+                 "html": "<button style=\"background-color:#DDDDDF\" class=\"w-3.5 h-3.5 rounded-[1px] border border-black/40 hover:border-[var(--accent-gold)] hover:scale-110 transition-transform cursor-pointer\" title=\"#DDDDDF (Click: Primary | Right-click: Secondary)\"></button>",
+                 "target": Array [
+                   ".border-black\\/40.hover\\:scale-110.w-3\\.5:nth-child(2)",
+                 ],
+               },
+               Object {
+                 "html": "<button style=\"background-color:#D0C4DF\" class=\"w-3.5 h-3.5 rounded-[1px] border border-black/40 hover:border-[var(--accent-gold)] hover:scale-110 transition-transform cursor-pointer\" title=\"#D0C4DF (Click: Primary | Right-click: Secondary)\"></button>",
+                 "target": Array [
+                   ".border-black\\/40.hover\\:scale-110.w-3\\.5:nth-child(3)",
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
+         "html": "<button style=\"background-color:#DCABDF\" class=\"w-3.5 h-3.5 rounded-[1px] border border-black/40 hover:border-[var(--accent-gold)] hover:scale-110 transition-transform cursor-pointer\" title=\"#DCABDF (Click: Primary | Right-click: Secondary)\"></button>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".border-black\\/40.hover\\:scale-110.w-3\\.5:nth-child(4)",
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
+                 "html": "<button style=\"background-color:#D0C4DF\" class=\"w-3.5 h-3.5 rounded-[1px] border border-black/40 hover:border-[var(--accent-gold)] hover:scale-110 transition-transform cursor-pointer\" title=\"#D0C4DF (Click: Primary | Right-click: Secondary)\"></button>",
+                 "target": Array [
+                   ".border-black\\/40.hover\\:scale-110.w-3\\.5:nth-child(3)",
+                 ],
+               },
+               Object {
+                 "html": "<button style=\"background-color:#DCABDF\" class=\"w-3.5 h-3.5 rounded-[1px] border border-black/40 hover:border-[var(--accent-gold)] hover:scale-110 transition-transform cursor-pointer\" title=\"#DCABDF (Click: Primary | Right-click: Secondary)\"></button>",
+                 "target": Array [
+                   ".border-black\\/40.hover\\:scale-110.w-3\\.5:nth-child(4)",
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
          - button "Studio options" [active] [ref=e231] [cursor=pointer]:
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
          - button "Layers" [pressed] [ref=e311]
          - button "Palette" [ref=e313]
          - button "PixiTools" [ref=e315]:
            - generic [ref=e316]: FX
        - generic [ref=e318]:
          - generic [ref=e319]:
            - generic "Each frame has its own layer pixels. A new blank frame keeps the layer names and settings." [ref=e320]:
              - text: Frame 1 · Layers
              - generic [ref=e321]: (1)
            - generic [ref=e322]:
              - button "Add New Layer" [ref=e323]
              - button "Duplicate Layer" [ref=e325]
              - button "Merge Down" [disabled] [ref=e327]
              - button "Delete Layer" [disabled] [ref=e329]
          - generic [ref=e331]:
            - generic [ref=e332]:
              - generic [ref=e333]: Opacity
              - slider "Layer opacity" [ref=e334] [cursor=pointer]: "100"
              - generic [ref=e335]: 100%
            - generic [ref=e336]:
              - generic [ref=e337]: Blend
              - combobox "Layer blend mode" [ref=e338] [cursor=pointer]:
                - option "Normal" [selected]
                - option "Multiply"
                - option "Screen"
                - option "Overlay"
                - option "Color Dodge"
                - option "On artwork only"
          - generic [ref=e340]:
            - generic [ref=e341]:
              - button "Reorder layer Base Layer" [disabled] [ref=e342]:
                - generic [ref=e343]: ⠿
              - generic [ref=e344]:
                - button "Select layer Base Layer. Double click to rename" [ref=e345] [cursor=pointer]: Base Layer
                - button "Rename layer Base Layer" [ref=e346] [cursor=pointer]
            - generic [ref=e347]:
              - button "Lock layer Base Layer" [ref=e348]
              - button "Hide layer Base Layer" [ref=e349]
    - contentinfo [ref=e351]:
      - generic [ref=e352]:
        - generic [ref=e353]:
          - generic [ref=e354]:
            - button "Play" [ref=e355]
            - button "Previous Frame (,)" [ref=e358]
            - button "Next Frame (.)" [ref=e360]
            - button "Repeat" [ref=e362]
          - generic [ref=e366]:
            - button "Preview speed" [ref=e368]:
              - generic [ref=e369]: Preview
              - generic [ref=e370]: 1×
              - generic [ref=e371]: ▾
            - generic [ref=e372]:
              - generic [ref=e373]: Frame time
              - spinbutton "Active frame duration in milliseconds" [ref=e374]: "100"
              - generic [ref=e375]: ms
            - button "Onion Skin" [ref=e376]
            - button "Onion skin settings" [ref=e379]: ⚙
        - generic [ref=e380]:
          - button "+ Frame" [ref=e381]:
            - generic [ref=e382]: Frame
          - group [ref=e384]:
            - generic "Frame actions" [ref=e385] [cursor=pointer]:
              - text: Frame actions
              - generic [ref=e386]: ▾
          - button "Collapse Timeline" [ref=e388]:
            - generic [ref=e389]:
              - generic [ref=e390]: ▼
              - generic [ref=e391]: Collapse
      - generic [ref=e392]:
        - 'button "Select frame 1. Duration: 100ms. Drag to reorder." [ref=e394]':
          - generic:
            - generic: "#1"
            - generic: 100ms
        - button "Clips" [ref=e395]
    - generic [ref=e397]:
      - generic [ref=e398]: "X: — Y: —"
      - generic [ref=e401]: 32×32
      - generic [ref=e404]: 1600%
      - generic [ref=e406]: Frame 1/1
      - generic [ref=e408]: Base Layer
      - generic [ref=e409]: pen
      - status "All changes saved to local storage" [ref=e414]:
        - generic [ref=e416]: Saved
  - button "Open Next.js Dev Tools" [ref=e422] [cursor=pointer]
  - alert [ref=e426]
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
> 71  |         expect(blockingViolations).toEqual([]);
      |                                    ^ Error: expect(received).toEqual(expected) // deep equality
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
  100 |         expect(blocking).toEqual([]);
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
```