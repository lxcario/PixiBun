# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: studio.spec.ts >> Studio Automated Accessibility Audits (axe-core, WCAG 2.2) >> blank canvas workspace passes automated WCAG 2.2 axe scan
- Location: tests\e2e\studio.spec.ts:340:7

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  -   1
+ Received  + 598

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
- generic [active] [ref=e1]:
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
  248 |     // 6. Click at (16, 16) where the ghost sits on the underlay canvas, but Frame 2 is empty
  249 |     await page.mouse.click(targetX, targetY);
  250 |     await page.waitForTimeout(100);
  251 | 
  252 |     // Assert primary color remains unchanged (no-op on empty pixel, NOT polluted by ghost)
  253 |     await expect(colorWell).toHaveAttribute('title', initialTitle || '');
  254 | 
  255 |     // 7. Click on an unpainted empty pixel at (4, 4)
  256 |     const emptyX = box.x + (box.width / 32) * 4.5;
  257 |     const emptyY = box.y + (box.height / 32) * 4.5;
  258 |     await page.mouse.click(emptyX, emptyY);
  259 |     await page.waitForTimeout(100);
  260 | 
  261 |     // Assert primary color still unchanged
  262 |     await expect(colorWell).toHaveAttribute('title', initialTitle || '');
  263 |   });
  264 | 
  265 |   test('timeline renders real thumbnails for frames', async ({ page }) => {
  266 |     await page.goto('/studio');
  267 |     await page.waitForLoadState('domcontentloaded');
  268 |     await expect(page.locator('div[role="application"]')).toBeVisible();
  269 |     await page.waitForTimeout(500);
  270 | 
  271 |     const canvas = page.locator('canvas[data-testid="main-composite-canvas"]');
  272 |     const box = await canvas.boundingBox();
  273 |     expect(box).not.toBeNull();
  274 |     if (!box) return;
  275 | 
  276 |     // Verify thumbnail canvas for frame 0 is present
  277 |     const thumb0 = page.locator('canvas[data-testid="frame-thumbnail-0"]');
  278 |     await expect(thumb0).toBeVisible();
  279 | 
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
> 348 |     expect(results.violations).toEqual([]);
      |                                ^ Error: expect(received).toEqual(expected) // deep equality
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
  380 |     expect(layersResults.violations).toEqual([]);
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