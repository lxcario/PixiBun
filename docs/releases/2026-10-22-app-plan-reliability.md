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

All 37 specs pass the emulator on the fixed local build ([receipt](../testsprite/app-plan-emulation-2026-10-22.json)). With the owner's approval the ten plans that differed from the server (the nine new ones and S4-VIEW-03's clearer "there is no … button" wording) were published; a full re-fetch afterwards found all 37 redesigned plans matching the render and the other 84 unchanged. Previous definitions are archived under `artifacts/testsprite-plan-publish-2026-10-22/republish-10/`.

## The automatic App run on `0259f782` — 22 October, 09:34–10:18 UTC

Pushed with the owner's approval after all five pre-push gates passed (3,041 unit tests); the App started all 121 cases within seconds of the preview serving `0259f782`. [Per-case results](../testsprite/app-run-2026-10-22-0259f782.json); raw results archived locally under `artifacts/testsprite-app-run-2026-10-22-0259f782/`.

| Cohort | Passed | Failed | Blocked |
| --- | ---: | ---: | ---: |
| `48f9b999` | 55 | 7 | 59 |
| `0259f782` | **58** | 8 | 55 |

- **Redesigned plans: 34 of 37 passed**, including S4-RELATION-01 on the transform fix, S4-EXPORT-12 on the labelled size fields, and S4-FX-01, S4-DRAW-13 and EXP-003 after this morning's tightening. The three failures were agent sequencing, with correct product observations: S4-NEW-02 confirmed digest `6af29269` and the 100/200/300 ms holds but could not find the readout's "Frames" number; S4-HIST-02 painted and undid before checking the "fresh desk" assertion; S4-NEW-10's browser reverted the invalid hex on Enter, so the specified two-Escape sequence did not apply. All three were rewritten to avoid those dependencies.
- **Untouched plans:** six that passed on `48f9b999` were Blocked (S4-LEARN-01/02/03, S4-NEW-04/05/14). Investigating S4-LEARN-02 found the next defect.

### Practice refused right after saving (fixed, `53eb033b`)

Open a starter, press Save, go Home, choose Playground: practice refused with "Return to Studio and finish saving your drawing before starting practice." It worked only after a detour back through Return to drawing. Production `main` behaves the same, so this predates S4. Opening a starter, blank, replay or postcard drawing replaces the project without a new Studio lifecycle, so the practice handoff stayed registered for the previous project. It now follows the store's current project. [practiceAfterStarter.spec.ts](../../tests/e2e/practiceAfterStarter.spec.ts) fails on the `0259f782` preview and passes with the fix; the existing practice, project, recovery and replay e2e specs (28) and 68 related unit tests pass.

Also fixed: the inline project-name field was an unnamed text box (`c105ac05`, now "Project name"). Left as is and noted: Live preview's toggle is named "Toggle Live PiP Preview Window" while its text reads "Live preview · Floating window" (WCAG 2.5.3); a stored script and two internal tests use the current name.

Seven more specs (41 in all): S4-NEW-02, S4-HIST-02 and S4-NEW-10 tightened; S4-NEW-04, S4-NEW-14, S4-LEARN-02 and S4-LEARN-03 new.

All 41 specs pass the emulator on the fixed local build. With the owner's approval the seven changed plans were published; a full re-fetch found all 41 redesigned plans matching the render and the other 80 unchanged. Previous definitions are archived under `artifacts/testsprite-plan-publish-2026-10-22/republish-7/`.

## The automatic App run on `89d7041b` — 22 October, 11:13–11:57 UTC

[Per-case results](../testsprite/app-run-2026-10-22-89d7041b.json); raw results archived locally under `artifacts/testsprite-app-run-2026-10-22-89d7041b/`.

| Cohort | Passed | Failed | Blocked |
| --- | ---: | ---: | ---: |
| `b78fffb1` (21 Oct, old plans) | 33 | 7 | 81 |
| `48f9b999` | 55 | 7 | 59 |
| `0259f782` | 58 | 8 | 55 |
| `89d7041b` | **63** | **2** | 56 |

- **Redesigned plans: 40 of 41 passed**, including all four new practice/preview/frame-order plans and the three tightened ones. S4-NEW-01 failed because the agent skipped the click that finished a hold edit, so two edits merged into one Undo step (by design); the plan now finishes the edit by selecting another frame.
- **Failed:** S4-NEW-01 (above) and S4-EXPORT-10, which reported "No backup was created. Your project is still open here." That is the app's honest message when the browser's native save dialog is not completed, as in the agent's browser.
- **Three untouched plans drifted from Passed to Blocked:** S4-HIST-04 (the agent opened the default blank Studio instead of the Bun starter the plan names), "Reject invalid canvas size…" (the agent improvised an image import) and S4-SAVE-03 (reproduced on `89d7041b`: "S4 Before New" stays in Projects). No regression.

Five plans were then pinned or rewritten and published with the owner's standing approval (all 45 specs emulate green against the deployed `89d7041b`; a full re-fetch found the 45 matching and the other 76 unchanged; previous definitions under `artifacts/testsprite-plan-publish-2026-10-22/republish-5/`): S4-NEW-01, S4-HIST-04, S4-SAVE-03, "Reject invalid canvas size before starting a new drawing" (now: the dialog offers only preset sizes, and Keep Drawing keeps the original exactly), and S4-EXPORT-10. **Trade-off for S4-EXPORT-10:** its App plan now checks that requesting a backup never pretends (either the dialog closes after saving, or the exact no-backup message) and never changes the project; the real download, fresh-context reopen and layer/frame/pixel comparison stay in its hand-written stored Python, because the agent's browser cannot complete a native save dialog.

## The automatic App run on `c5e0ebf9` — run-to-run variation

`c5e0ebf9` changed only documentation after `89d7041b`, so its run (12:14–12:58 UTC) measures the agent rather than the app: **59 Passed / 8 Failed / 54 Blocked** against 63/2/56. [Per-case results](../testsprite/app-run-2026-10-22-c5e0ebf9.json). Every new failure we traced came from how the agent carried out a step:

- S4-LEARN-03 and S4-SAVE-03: after typing a project name the agent clicked the canvas to commit it, which painted Bun's centre pixel (digest `668adea8` instead of `6af29269`).
- S4-HIST-02: the agent skipped the required reload, so Undo was naturally still available.
- "Undo a layer deletion": the agent never painted on the new layer before deleting it.
- S4-SAVE-03 also claimed the readout kept 192 pixels after Start New Drawing; on the deployed build the readout reports 0 within 0.1 s.

The renderer now designs those habits out for every plan: a plan that never draws says "do not click the drawing canvas; a click paints", a rename is committed by Save now rather than Enter, and a second navigation is a required full reload. Ten plans changed wording as a result.

## Credit-conscious stretch — 22 October, afternoon

At the owner's request no further cloud executions were started after the `c5e0ebf9` run; everything below was verified locally or by reading results.

- **Fixed** (`0a39d617`): every palette cycle track's on/off switch was an unnamed checkbox; it is now "Enable *track name*". Full unit suite passes (3,041).
- **Six more App plans rewritten** from the `c5e0ebf9` failures, each of which had verified the visible behavior but blocked on oracles it could not obtain: S4-PAL-03 (ramp joins the palette, seed kept, explicit apply, Undo), S4-NEW-12 (arrow/End/Enter/Escape with focus checks, starting from a swatch that differs from the primary), S4-PAL-04 (inclusive range, whole and fractional rates accepted, play/pause/delete leave artwork exact), S4-NEW-05 (focused-frame keys and text-field isolation by digest), S4-DRAW-12 (refusal on paint layers; surface stroke undoable; hiding the surface layer shows the exact original colors) and S4-ANIM-04 (finding marked intentional; protected region from a Magic Wand click). Plan wording now also tells the agent not to click the canvas in tests that never draw, commits renames with Save now, and makes second navigations required reloads. 38 plans were published (no credits); a re-fetch found all 51 redesigned plans matching and the other 70 unchanged. All 51 pass the emulator against the deployed preview.
- **Hand-written Python replays, run locally** (free): 18 against the local branch build and 13 against the deployed `c5e0ebf9` production preview, 31/31 passing, covering decoded PNG/GIF/APNG/SVG files, backups reopened in a fresh browser, exact RGBA through Undo/Redo, lighting, surfaces, Pocket, corrupted-import refusal and the nine UI-report scenarios. Running against production needed Windows-safe launch flags in scratch copies (the cloud scripts add Linux-only `--single-process`); repository scripts are unchanged. Raw logs are archived under `artifacts/python-replays-2026-10-22/`. The homepage bench replay failed only against the local dev server and passes on the production build.
- **Open product question, not changed:** Normal Chisel strokes on a surface layer show as normal-map colors in the color view and composite. The guide implies color view by default with surface directions shown on request, and plain PNG export may include the layer. Left for the owner to decide.

## The automatic App run on `9c2197d2` — 68 / 7 / 46

Pushed as a fast-forward with the owner's approval (`c5e0ebf9..9c2197d2`, all five pre-push gates passed). The App ran 13:43–14:30 UTC on the first build carrying all 51 redesigned plans: **68 Passed / 7 Failed / 46 Blocked**, against 59/8/54 on `c5e0ebf9`. **49 of the 51 redesigned plans passed.** [Per-case results](../testsprite/app-run-2026-10-22-9c2197d2.json); raw results, steps and analyses are archived locally under `artifacts/testsprite-app-run-2026-10-22-9c2197d2/`.

Every non-pass was traced through its steps:

- **S4-HIST-03 — product defect, fixed in `4d838ca9`.** The agent typed 24 into the Canvas size Width field and saw 44. The field clamped to 4–512 on every keystroke, so the 2 became 4 before the 4 arrived, and Apply resized the canvas to 44×44; no size beginning with 1, 2 or 3 could be typed. Reproduced with real key events in Chromium and WebKit on the deployed preview (typed 24 → 44×44 canvas), and fixed: the fields keep what is typed, follow it while it is in bounds, and clamp on leaving the field, Enter or Apply (typed 24 → 24×24; 0 → 4 on Tab; 513 → 512 on Enter, both browsers). `tests/components/CanvasResizeModal.test.tsx` types key by key and fails on the old component with the same 44. The emulator and Playwright `fill()` set whole values at once, which is why earlier checks missed it. S4-HIST-04 now commits each typed size before checking the clamp; its stored Python only fills and checks Cancel, so the CLI path is unaffected.
- **S4-FX-03 — test-plan error, fixed.** Its last check compared Layers in this frame with record A, but the record step only asked for the digest, pixels and colors, so the agent had nothing to compare and reported the layer count blank. The emulator records every field, so it passed. Two more plans had the same gap (S4-NEW-07 Layers; S4-NEW-18 Frames and Layers). The record step now lists every field a later step compares with it; only those three plans' wording changed.
- **S4-NEW-19 — vague plan, redesigned.** The old plan asked for "classic controls" and "actual artwork/file oracles" without saying what either meant; it passed on `c5e0ebf9` and failed here on the same app. It now chooses all twelve styles by name and checks each is selected, checks the "Graphite and Plum always keep the classic studio" notice, and compares the exact artwork digest afterwards. (The Lab switches stay visible but dimmed on Graphite and Plum; the app README says Labs never apply there, so that is by design.)
- **Erase and undo — agent variation.** The agent reported that pressing e left Pen selected, then picked the Eraser itself; its key presses are not logged. Lowercase e selects the Eraser immediately after Skip setup in the browser, and the same plan passed on `c5e0ebf9`. Plan unchanged.
- **S4-EXPORT-06, S4-STORY-01, S4-CART-02 — runner limitations on plans not yet redesigned:** a timelapse GIF to decode, a GIF download and a backup reopened, and an invalid postcard payload fixture. All three previously ended Blocked; they now fail on the same missing observations.
- **S4-NEW-22 (Passed → Blocked)** is agent variation on an unredesigned plan.

The five changed plans (S4-FX-03, S4-HIST-04, S4-NEW-07, S4-NEW-18, S4-NEW-19) were published with no credits used and read back exactly; the emulator passes S4-HIST-04 and S4-NEW-19 on the fixed build. The previous versions are archived under `artifacts/testsprite-plan-publish-2026-10-22/republish-5-after-9c2197d2/`.

### PR checks around the run

- **TestSprite Replay had never produced a verdict on a push.** Every run since the job was added ended "cancelled" at its 20-minute limit. Each push also starts the App's full batch, which fills TestSprite's in-flight run slots for about 45 minutes, so `test run` was refused with exit 11 and the 15-minute retry budget ran out. `run-replay-suite.mjs` now waits for a slot within a 60-minute budget (the job allows 90 minutes) and reports a replay that never starts as "not started, no verdict" rather than as a test failure (`aa052331`; checked locally with a stand-in CLI for both the refused-then-accepted and never-accepted paths).
- **CI e2e on `48f9b999` failed on one of 561 checks:** the WebKit cozy-classic geometry check read a timeline button at 27.66 px instead of 28 while the Onion Skin press spring was still running (Firefox read 27.98 px in a probe; settled, every browser reads 28). The check now measures once the row's animations finish; the 28 px rule is unchanged (`5ae6a289`; 54/54 runs across Chromium, Firefox and WebKit against the preview). CI runs on `0259f782`, `89d7041b` and `c5e0ebf9` were cancelled by later pushes, not failed.
- Native codec regressions pass on every push; Preview Deploy is skipped by design while the Vercel integration posts previews.
