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

## Island motion and control ownership

The island keeps one live control node. On a tool change it temporarily renders the last committed controls as inert, animates them out for 110 ms (8 px blur, scale 0.97), swaps while invisible, then reveals the new controls after 60 ms (12 px blur to none, opacity to one over 420 ms). Scale enters at 0.95 using stiffness 600, damping 26, mass 0.9 and explicit scale-unit rest thresholds. `contentScale.jump()` resets the outgoing velocity before the new label blooms, preventing the first-frame collapse.

Width and height have separate physical springs (420/31 and 460/25, mass 1). Intrinsic offset measurements ignore text transforms; target deduplication and generation guards prevent stale resize completion from ending a newer morph. The first control row stays anchored while menus open. Activity bubbles reuse their mounted identity and release the liquid filter after exit. The island directly subscribes to reduced-motion changes; do not assume all other Labs use that same hook.

The inspector’s classic branch keeps the audited four-column icon/label layout; the liquid branch keeps its own lens and compact rendering. The palette and magic styles use softer easing, and the liquid lens has reduced stretch/lift. [Current publication record](../../docs/releases/2026-10-15-studio-labs-motion.md).

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

The island hover/focus satellite uses a shared separation motion value for the body squeeze, neck/droplet geometry and face blur. Its fixed button hit target overrides the scene skin press-down transform locally. Direct actions for every canonical tool live in [useIslandQuickAction](island/useIslandQuickAction.ts); Clean corners stays in the expanded brush panel.
