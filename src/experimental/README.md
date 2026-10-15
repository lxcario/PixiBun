# Studio Labs

Experimental studio UI. Every lab can be switched off at runtime from
**Studio ▸ Labs** (or all at once with **Classic studio**), and each one can be
deleted without touching the others.

Labs only appear on the cozy scene themes. The professional flat themes,
Graphite (`atelier`) and Plum (`cozy-classic`), always keep the classic studio
whatever the switches say (`useLabsAvailable` in `labsStore.ts`).

Flags live in `localStorage["pixibun:labs:v1"]`. Labs default on for people and
off for automated runs (Vitest, and Playwright through `navigator.webdriver`), so
the existing suites keep covering the classic studio. A test can opt in by
writing that storage key before the page loads.

| Lab | Folder | Gate outside this folder |
| --- | --- | --- |
| Dynamic island | `island/` | `AtelierRail.tsx`: the `IslandSlot` wrapper around the drawing controls |
| Liquid tabs | `liquid/` | `RightInspector.tsx`: `liquidTabs ? <LiquidTabs …/> : (classic tab bar)` |
| Paint pot palette | `palette/` | `RightInspector.tsx`: `paintPot ? <PaintPotPalette /> : <PalettePanel />` |
| Quick magic | `magic/` | `AiToolsPanel.tsx`: `{quickMagic && <QuickMagic />}` and the two `quickMagic ?` labels |

Each lab imports its own stylesheet, so deleting its folder removes its CSS too.

## Removing one lab

1. Delete its folder.
2. Remove its gate (the table above) and its import, keeping the classic branch.
3. Remove its entry from `LABS`, `LabId`, `DEFAULTS` and `ALL_OFF` in `labsStore.ts`.

Each lab also landed as its own commit ("Labs: …"), so `git revert <commit>`
is usually the quickest way out.

## Removing Labs entirely

Remove every lab as above, then delete this folder and the
`<LabsSwitchboard />` line (and its import) in `src/components/ui/AppearancePopover.tsx`.
Two small helpers stay harmless if left: `PalettePanel`'s `basics` prop and
`RightInspector`'s `tabInner`.
