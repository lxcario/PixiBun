# App plans the agent can finish — 22 October

Observed 22 October 2026, Istanbul morning, on local branch `claude/s4-reliability` cut from PR [#6](https://github.com/lxcario/PixiBun/pull/6) head `b78fffb199756933554729e21fafad1210432281`. Nothing here was pushed or run in the cloud; the 28 plans were published to the TestSprite project with the owner's approval (see the end). Earlier records and their verdicts stand as written.

## The cohort we started from

The newest automatic App run on PR #6 (`github-pr-6`, source `b78fffb1`, started 2026-10-21T21:32Z) finished **33 Passed / 7 Failed / 81 Blocked** of 121. The deployed preview manifest named the same commit. The full server state at that point — 121 definitions, 100 stored scripts, latest results and step traces — is archived locally under `artifacts/testsprite-app-run-2026-10-21-b78fffb1/` with a SHA-256 manifest (`1feb6270…`), per the [archive policy](../archives.md).

The 1,576 recorded agent actions were all navigate, named click, fill, select, upload, scroll or visible-text checks. No drag, coordinate right-click, held modifier, viewport change, save-picker completion or file read appears; key presses happen but are not logged. Every non-passing case is classified in [app-cohort-triage-2026-10-22.json](../testsprite/app-cohort-triage-2026-10-22.json):

| Class | Cases |
| --- | ---: |
| PixiBun defect | 1 |
| Test-plan error | 7 |
| Plan demanded an oracle the agent cannot read, where the Canvas readout suffices | 19 |
| Needs a downloaded file or the native save picker | 25 |
| Needs a drag, held modifier or pointer stroke | 14 |
| Needs an uploaded fixture used as specified | 11 |
| Needs viewport, network, reduced-motion or focus-dependent keys | 6 |
| Too open-ended for a deterministic verdict | 5 |

The agent's own "root cause" summaries ("hosting-side issue", "stale deployment") were wrong in every case we reproduced.

## The defect: errors raised inside a dialog were inert

In Clips, typing an end frame before the start frame is refused and a toast says *Clip frames must form a valid range within the animation.* The toast rendered outside the open modal `<dialog>`, which the browser makes inert. Chrome's full accessibility tree on the PR preview contains **no node** with that text, so screen readers never announced it and S4-ANIM-03 could not find it. Visually it still appeared.

Commit `e43248c0` adds a small registry of open modal dialogs (`src/components/ui/surfaces/modalHost.ts`); `ModalWrapper` registers on entering the top layer and unregisters on leaving, and `SurfaceToast` portals into the topmost one. Position and look are unchanged. A unit test covers moving in and out; on a local build the message is present in the accessibility tree and visible while Clips is open, and back on the page after it closes.

## Plan errors, now explained

- **S4-VIEW-03**: with the Standard keymap a right-click *on the artwork* paints with the secondary color by design (`rightClickOpensToolsPopup`); only the space around it opens Canvas tools. The plan asked for a right-click at the canvas centre. Not a defect.
- **S4-DRAW-10 / S4-DRAW-11**: a grouped tool slot opens its flyout on hold, right-click or an arrow key, not a click; J, U and O select Iso Line, Rectangle and Ellipse correctly. The "J kept Line selected" report did not reproduce.
- **S4-NEW-01**: a frame-hold edit is one Undo step from focus to blur, so typed digits don't flood history. The plan's Tab between two edits was skipped, merging them.
- **S4-FX-01 / S4-FX-05**: the agent imported an unrelated five-pixel fixture although the plans named Bun. On the specified drawings, lighting changes Bun and the cleanup scan finds the stray.
- **S4-NEW-12**: the first palette swatch is the default primary (#3A2E4C), so Enter on it cannot show a change.
- **S4-SAVE-01**'s "blank Studio after reopen" did not happen: the final page snapshot shows the project with its 175/325 ms holds.

Also confirmed correct, not defects: Flood Fill tolerance is Euclidean RGBA distance; locking or hiding a layer is itself an Undo step and a refused stroke adds none; 50% layer opacity lands one 8-bit step from the exact midpoint in Chromium (#80807f for #808080).

## 28 redesigned App plans

Specs in [`scripts/testsprite/app-plans/`](../../scripts/testsprite/app-plans/README.md) render to plan steps and run through an emulator restricted to the agent's gestures, reading the same Canvas readout. Fixtures come from replay links or the Bun starter; no file upload is needed. Expected digests were cross-checked against replays that paint the expected result directly (for example `f99d82e7` is a white field with blue exactly at (8,8)).

Redesigned: six of the seven Failed cases (S4-ANIM-03, S4-DRAW-10, S4-DRAW-11, S4-FX-01, S4-FX-05, S4-VIEW-03; S4-JOURNEY-01 is below) and 22 Blocked cases: the pixel/undo/redo, erase and lock/unlock cases, EXP-003, S4-DRAW-01/03/06/13, S4-FX-02/03, S4-HIST-02, S4-LAYER-01/02/03, S4-NEW-01/02/07/18, S4-PAL-02, S4-READOUT-01, S4-SAFE-06 and S4-WELCOME-01.

[Emulation receipt](../testsprite/app-plan-emulation-2026-10-22.json):

| Build | Result |
| --- | --- |
| PR #6 preview, `b78fffb1` | 27/28 — only S4-ANIM-03 fails: "the alert is outside the open modal dialog" |
| Local build with `e43248c0` | 28/28 |

All 28 rendered step files pass `testsprite test lint`. Unit suite on the branch: 279 files, 3,041 tests passed; typecheck clean apart from a `.next/dev` type generated by the local dev server.

### Trade-offs

The App plans now prove behavior through the readout instead of raw channels or decoded files. A 32-bit digest of the composite is an exact equality check for "Undo returned the original"; it is the app's own computation, so independent byte-level proof remains with each case's stored Python, named per case in the plan description (`cliOnly`). Specific moves:

- Dragged strokes, marquees and shapes became centre clicks, one- or two-pixel stamps and replay fixtures. Geometry of long drags stays in Python.
- EXP-003's thirteen Pen drags became the documented Heart replay; drawing the heart by pointer stays in Python.
- S4-SAFE-06 selects with a Magic Wand click instead of a dragged marquee (there is no select-all shortcut).
- S4-FX-05's protected-region step (needs a marquee) and S4-FX-03's other quick effects moved to the CLI path.
- S4-NEW-07 activates the reel-end action by click; keyboard activation stays in Python.
- S4-LAYER-03 now has real expected composites (Multiply, Screen, 50% opacity) where the old plan had none.

No original assertion was deleted from the suite: the stored scripts are unchanged and each previous plan is saved by `apply.mjs` before it is replaced.

## Still open

- **60 non-passing cases are not redesigned.** 25 need a downloaded file or the native save picker (Chromium backups always show "No backup was created" to the agent); 14 need drags or modifiers; 11 need uploaded fixtures; 6 need viewport, network or focus control; 5 are open-ended. Their stored Python remains the qualifying path. S4-JOURNEY-01 is in the download group.
- A minor accessibility note: *Apply Cleanup*'s accessible name ("Apply analyzed artwork cleanup") doesn't contain its visible text (WCAG 2.5.3). Eleven stored scripts use that exact name, so it was left alone.

## Published — 22 October, 06:23 UTC

With the owner's approval, `apply.mjs --apply` replaced the plan steps and descriptions of the 28 cases above in project `ae8453ac-f859-4324-9ca2-5016e683bc6c`. Each case's previous definition was saved first; all 28 saved copies equal the archived pre-change definitions. A separate full re-fetch of all 121 cases afterwards found:

- 28/28 published cases match the rendered steps, step types and descriptions exactly; names unchanged.
- 93/93 other cases unchanged (plan steps, description, name).
- 121/121 stored Python scripts byte-identical to the archive: the CLI replay path is untouched.

The previous plans and the published files are kept locally under `artifacts/testsprite-plan-publish-2026-10-22/` (manifest SHA-256 `1ca13f95…`). Restoring any case is `testsprite test plan put <id> --steps <saved file>`. No test was run and no status was changed by publishing.

## The automatic App run on the fix — 22 October, 06:59–07:43 UTC

With the owner's approval the branch was fast-forwarded onto `testsprite-s4` (`b78fffb1..48f9b999`, no force) after all five pre-push quality gates passed under the pinned Node 22.23.3 (3,041 unit tests). Two earlier push attempts were stopped by that gate and are part of this record: a stale generated test inventory (fixed in `48f9b999`) and a typecheck error from `.next/dev` types left by a local dev server (generated, untracked; removed).

The preview manifest served `48f9b999` at 06:59:47 UTC and the TestSprite App started all 121 cases in `github-pr-6` within seconds. [Per-case results](../testsprite/app-run-2026-10-22-48f9b999.json); raw results archived locally under `artifacts/testsprite-app-run-2026-10-22-48f9b999/`.

| Cohort | Passed | Failed | Blocked |
| --- | ---: | ---: | ---: |
| `b78fffb1`, old plans | 33 | 7 | 81 |
| `48f9b999`, 28 redesigned plans and the toast fix | **55** | 7 | 59 |

- **Redesigned plans: 25 of 28 passed**, including S4-ANIM-03 on the fixed build (20 were Blocked, 5 were Failed). The three that failed did so on plan wording; the agent's own observations show correct behavior. S4-FX-01 reached the exact lit digest `170f6bf5` after Redo but had not recorded color counts after Apply. S4-DRAW-13 reported that pressing I did not select the Eyedropper (it does, in a real browser; Shift+I does not), then sampled #2a9d8f correctly. EXP-003 checked the heart's starting readout only after opening the lighting preview, so it read previewed colors.
- **Untouched plans: 30 of 93 passed.** Four that passed on `b78fffb1` did not this time: S4-HIST-01, S4-DRAW-14 (the press-and-hold flyout again), S4-NEW-21 and S4-NEW-10. Their plans did not change. S4-NEW-21 and S4-NEW-10 were reproduced on `48f9b999` and behave correctly: Classic studio keeps the workspace and Pen with Labs off and artwork intact; an invalid hex is refused and the first Escape reverts the draft. This is run-to-run variation in the agent's judgement, not a product regression. S4-RELATION-01, S4-SAFE-01 and S4-EXPORT-10 moved from Blocked to Failed on the known drag, download and save-picker limits.

The three redesigned plans were then tightened locally: FX-01 asserts the lit digest `170f6bf5` instead of unrecorded counts, DRAW-13 clicks the Eyedropper button, and EXP-003 requires the starting check before Effects is opened. All three pass the emulator against the deployed `48f9b999` preview.

## Three plans republished — 22 October, 07:53 UTC

With the owner's approval only S4-FX-01, S4-DRAW-13 and EXP-003 were republished; their previous (first-redesign) definitions were saved first. A full re-fetch of all 121 cases afterwards: the three match the rendered steps and descriptions, the other 25 redesigned plans and the 93 untouched plans are unchanged, and every case's latest result is still the 06:59 run. No run was started and nothing was pushed.

The same re-fetch showed that the 06:59 App run itself had stored TestSprite-generated Python for three cases it passed: S4-LAYER-02 and S4-LAYER-03 (no script before) and S4-DRAW-11 (its earlier generated v1.0 replaced by v2.0). All 63 hand-written replay scripts are unchanged. It also exposed an inaccurate claim: S4-DRAW-11, S4-LAYER-01 and S4-LAYER-03 had said their byte-level checks were "kept in this test's stored Python", but their scripts are generated from plans, not independent replays. Their specs now list those checks as **not covered by any independent script yet** (dragged shape bounds and selection clipping; merge down and drag reordering; Overlay, Color Dodge, On artwork only and cross-frame cache checks). The renderer's wording for name patterns was also fixed ("the button whose name starts with …"). With the owner's approval those 21 plans were republished at 08:01 UTC (wording, plus the three corrected descriptions); their prior definitions are archived under `artifacts/testsprite-plan-publish-2026-10-22/republish-21/`. A full re-fetch afterwards: all 28 redesigned plans match the current render, the 93 untouched plans equal their 21 October definitions, all 121 stored scripts equal their post-run state, and every latest result is still the 06:59 run. No run was started and nothing was pushed.

## Second round — 22 October, afternoon

Local branch work after the `48f9b999` run; not yet pushed or run by the App at the time of writing.

### Data loss in selection transforms (fixed, `c534cc99`)

Redesigning S4-RELATION-01 around a Magic Wand selection exposed three ways to lose pixels, reproduced on the PR preview and the Bun starter:

| Sequence | Before |
| --- | --- |
| Select, press H or V, then Escape or the HUD Cancel | Selected pixels deleted; no Undo |
| Select, press H, then Commit, then Undo | Undo returns the cut-out hole; the original is unreachable |
| Select, flip with the HUD button, Ctrl+D, then Undo | Same hole |
| Select, press H | Lifts but does not flip |

Cause: the H/V keys used an older lift that kept no source backup, and committing a lifted selection captured a second Undo snapshot after the lift. A lifted floating selection now carries its original pixels and marks its pre-lift snapshot as pending; commits do not re-capture, cancel restores, H/V go through the transform owner and flip at once, and Escape also cancels from a HUD button. [selectionTransformUndo.spec.ts](../../tests/e2e/selectionTransformUndo.spec.ts) checks five paths against composites drawn independently by replay links: 5/5 fail on the `48f9b999` preview and 5/5 pass with the fix. The existing selection, lasso, layer-lock and artwork-protection e2e specs (17) and 156 related unit tests pass.

### Accessibility fixes found while redesigning

- **Transform HUD buttons** (`ff320663`): their accessible names were their glyphs (✓, ↔, ↻…). They now carry their titles as labels. This is what the App agent hit in S4-RELATION-01 ("transform controls not exposed").
- **Canvas size fields** (`9add4e04`): Width and Height had no accessible name. They are now "Width (px)" and "Height (px)".

### Nine more App plans

S4-RELATION-01, S4-SAFE-01 and S4-EXPORT-12 (Blocked or Failed on runner limits), S4-PAL-01 and S4-VIEW-02 (Blocked on unreadable oracles), and the four untouched plans whose App verdict drifted between runs (S4-HIST-01, S4-DRAW-14, S4-NEW-21, S4-NEW-10) now have specs: 37 in all. The flaky four had only TestSprite-generated scripts and open-ended plans; their specs name each control and check the readout. S4-DRAW-14 now selects all seventeen tools by shortcut instead of the press-and-hold flyout. S4-RELATION-01 depends on the transform fix and S4-EXPORT-12 on the labelled size fields.

The loop ledger now records S4-RELATION-01 as a third product bug on PR #6, alongside S4-ANIM-03 and the palette rate.
