# Strategy roadmap — 14 October 2026

This plan merges two documents dated 13 October 2026: *PixiBun: Where to Win* (strategy) and *PixiBun v1.14.1 Audit & Roadmap* (engineering audit). Their position: make PixiBun the studio for hand-made pixel art that comes alive (draw it, light it, loop it, pass it on), and fix the editing core before adding breadth. Status below is reconciled with main through `fc737c59` and the [15 October audit follow-up](2026-10-15-audit-follow-up.md); earlier branch/commit labels retain their evidence scope. It is not release qualification.

## Phases

| Phase | Scope | Status |
| --- | --- | --- |
| 0. Stop losing work | Precache every Studio file; contain lazy-panel failures; the crash screen saves before it claims "saved" (audit defect 1). | Done in `5c168380`. Offline panels verified in Chromium, Firefox and WebKit. |
| 0.5. Brand | Product name PixiBun; no user-facing "AI"; landing headline "Pixels with a pulse."; dated no-generative-AI pledge at `/pledge`. | Done in `6737a78f`. The internal `src/lib/ai` folder was renamed `src/lib/graphics` on 18 October, with `pixelAiEngine`, `AiToolsPanel` and `PixiBudAssistanceSection` renamed for what they do. |
| Requested | Eight Night/Day studio styles with animated scenes, theme hydration fix, token-driven dialogs, first-run welcome and level-based tips. | Done in `58067ebb`. |
| 1. Editing basics | Selection masks for every raster tool (defect 2); transparency checkerboard (defect 4); co-draw selective undo (defect 3); quick fixes (defects 6–8, 10–12, 14, 15); standard keymap with a classic option; tool flyouts and fit-to-view; byte-budgeted undo (defect 9). Stroke loop out of React may run in parallel. | Listed selection, checkerboard, selective Undo, quick fixes, keymap, byte-budgeted Undo and tool-shelf work is integrated on `main`, from `e33481a5` to `e9b5e682`. Moving the stroke loop out of React remains open, so the complete phase is not closed. |
| 2. Carts and launch | PNG carts carrying project, light rig and receipt; phone cart player; Light Sweep video; Handmade Receipt replay; Living Postcards; per-platform cart survival table. | Built on `main` from `6fd1a7d7` to `422b47d4`: carts, links, the `/open` player, receipts, Light Sweep and Living Postcards. Open: real platform checks for the [survival table](../guides/cart-survival.md) and five artist sessions; launch waits on both. |
| 3. Data model | Typed-array pixel store and straight-alpha compositor (defect 5); format v5 with timeline layers, linked cels and groups; store split. | Planned, after launch. |
| 4. Interop | `.aseprite` import and export, indexed color, smaller GIFs, Pass-the-Frame, Godot Live Desk. | Planned. |

## Deliberately deferred

The strategy recommends freezing the research workbench, animation review, the Minecraft skin engine, Nibbli expansion and seven of twelve export tabs, and replacing one verification round a week with one artist session. These proposed freezes remain open. The later playground redesign removes its obsolete OnboardingOverlay and ArtisanHandbookPanel, while the listed research workbench, animation review, Minecraft skin engine, Nibbli and export formats remain in source.

## Known failures carried forward

Two production browser cases fail on `6737a78f` without the theme work and remain open: navigator square-pixel alignment (`workspaceConsistency.spec.ts`) and the color dock's under-10px left-edge expectation under the floating layout (`stableStudioGeometry.spec.ts`). See [current status](../current-status.md#strategy-phase-0-and-05-14-october-2026).

Update, 16 October: both cases were rechecked on `testsprite-s4`. The color dock case already passed after the 15 October Graphite fixture fix. The navigator case required exact sub-pixel placement that whole-pixel pan storage cannot reach; it now checks against the pointer position each engine delivered. See the [P0 hardening record](../releases/2026-10-16-p0-hardening.md). The original verdicts above stand for their revisions.
