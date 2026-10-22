# App plans the agent can finish — 22 October

Observed 22 October 2026, Istanbul morning, on local branch `claude/s4-reliability` cut from PR [#6](https://github.com/lxcario/PixiBun/pull/6) head `b78fffb199756933554729e21fafad1210432281`. Nothing here was pushed, published to the TestSprite project or run in the cloud. Earlier records and their verdicts stand as written.

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

- **Publishing**: the 28 plans are local. `apply.mjs --apply` would replace their plan steps and descriptions in the shared TestSprite project; that needs the owner's approval, as does a cloud run to confirm the agent follows them.
- **The app fix is not deployed**: S4-ANIM-03 stays red on any build without `e43248c0`.
- **60 non-passing cases are not redesigned.** 25 need a downloaded file or the native save picker (Chromium backups always show "No backup was created" to the agent); 14 need drags or modifiers; 11 need uploaded fixtures; 6 need viewport, network or focus control; 5 are open-ended. Their stored Python remains the qualifying path. S4-JOURNEY-01 is in the download group.
- A minor accessibility note: *Apply Cleanup*'s accessible name ("Apply analyzed artwork cleanup") doesn't contain its visible text (WCAG 2.5.3). Eleven stored scripts use that exact name, so it was left alone.
