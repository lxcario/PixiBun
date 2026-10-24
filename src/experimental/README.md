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
| Liquid controls | `liquidControls/` | `StudioLayout.tsx`: `{scene && <LiquidSliders />}`; `LeftToolbar.tsx`: `<ToolRailLens …/>` (both render nothing when off) |
| Paint pot palette | `palette/` | `RightInspector.tsx`: `paintPot ? <PaintPotPalette /> : <PalettePanel />` |
| Quick magic | `magic/` | `PixiToolsPanel.tsx`: `{quickMagic && <QuickMagic />}` and the two `quickMagic ?` labels |

Each lab imports its own stylesheet, so deleting its folder removes its CSS too.

## Island motion and control ownership

The island keeps one live control node. On a tool change it temporarily renders the last committed controls as inert, animates them out for 110 ms (8 px blur, scale 0.97), swaps while invisible, then reveals the new controls after 60 ms (12 px blur to none, opacity to one over 420 ms). Scale enters at 0.95 using stiffness 600, damping 26, mass 0.9 and explicit scale-unit rest thresholds. `contentScale.jump()` resets the outgoing velocity before the new label blooms, preventing the first-frame collapse.

Width and height have separate physical springs (420/31 and 460/25, mass 1). Intrinsic offset measurements ignore text transforms; target deduplication and generation guards prevent stale resize completion from ending a newer morph. The first control row stays anchored while menus open. Activity bubbles reuse their mounted identity and release the liquid filter after exit. The island directly subscribes to reduced-motion changes; do not assume all other Labs use that same hook.

The inspector’s classic branch keeps the audited four-column icon/label layout; the liquid branch keeps its own lens and compact rendering. The palette and magic styles use softer easing, and the liquid lens has reduced stretch/lift. [Current publication record](../../docs/releases/2026-10-15-studio-labs-motion.md).

## Liquid controls

Slider handles: `LiquidSliders` runs one spring loop (420/26, ζ≈0.63) for whichever range inputs are moving and writes `--lq-x` (lag behind the native thumb), `--lq-s` (hover 0.35 / press 1 lift) and `--lq-sx`/`--lq-sy` (speed stretch) onto the input. The thumb CSS draws them, so a track click or arrow key glides instead of jumping. `data-lq-glass` turns the handle to glass while it is held or more than 3 px behind. The loop sleeps when settled, and nothing is written for reduced motion.

Tool rail: `ToolRailLens` is the [LiquidTabs](liquid/LiquidTabs.tsx) logic turned vertical, with the same SNAP/FOLLOW springs, 170 ms hold, 5 px slop, grab offset, rubber band and 1.1 glass lift. It measures buttons through their offset chain, which ignores press transforms, inside the positioned tool column. The column gets `lq-rail-on`, which hands the active button’s paint to the lens (z 5: over other tools while sliding, under the active icon). `lq-rail-moving` keeps the new tool’s icon readable until the lens arrives. While held, the lens rises above every tool as glass, and `data-lq-under` magnifies the nearest tool; release clicks it. On grouped slots (`aria-haspopup="menu"`) only a slide lifts it, so a still hold keeps opening the flyout. The resize observer subscribes once, because a re-subscription’s initial notification would snap the lens mid-sweep.

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

The island hover/keyboard-focus satellite uses one separation spring for the droplet's bud, neck, pinch-off and face blur; the pill reacts only in pixels at its right edge (reach, recoil, gulp) and rests at full size while hovered. A `jelly` impulse rings at pinch-off and on clicks, and the circle has its own hover/press springs. The spring starts after the goo filter's first paint. Mouse focus does not hold the circle out. Pen, Eraser and Line step 1 → 2 → 3 → 4 → 1 px. With the island on, every tool shows its name and a ▾ (Pen and Eraser included); tools without settings show the name alone. Its fixed button hit target overrides the scene skin press-down transform locally. Direct actions for every canonical tool live in [useIslandQuickAction](island/useIslandQuickAction.ts); Clean corners stays in the expanded brush panel.
