# PixiBun × TestSprite: the evidence

*For Season 4 judges, and anyone who wants to check our claims. Everything below links to a commit, a test, or a recorded run. Last updated 23 October 2026.*

PixiBun is a cozy pixel-art studio. Our [121 TestSprite test cases](https://www.testsprite.com/dashboard-v3/o/8da317b3-5f3e-506d-b110-a2ae9c2af7b8/projects/ae8453ac-f859-4324-9ca2-5016e683bc6c/test-cases) follow the small promises an artist relies on: a locked layer stays locked, Undo brings a pose back, an exported file holds the pixels you drew. Most of the bugs below turned up in a test that was looking for something else.

## In one minute

| | |
| --- | --- |
| Test cases | 121, run by the TestSprite GitHub App on every push to [PR #6](https://github.com/lxcario/PixiBun/pull/6) |
| Latest automatic App run | **119 passed · 2 failed · 0 blocked** on `f97621a4` ([per-case results](app-run-2026-10-23-f97621a4.json)) |
| Where we started | 33 passed · 7 failed · 81 blocked on `b78fffb1`, 21 October |
| Product bugs TestSprite led us to | **13**, 12 of them guarded by a regression test ([table below](#bugs-testsprite-led-us-to)) |
| Stored Python replays | Run by our own GitHub workflow on every push; passing |

## The tests run themselves

Nobody presses Run. GitHub's commit statuses for `53ac2afe` show the whole loop:

1. **22:05:10 UTC:** Vercel finishes the preview deployment for the push.
2. **22:05:19 UTC:** the TestSprite GitHub App posts the `TestSprite V3` status "121 tests queued" and runs all 121 plans against that preview.
3. **22:42:28 UTC:** the same status reads "116/121 passed · 3 failed · 2 blocked".

Alongside it, our [Stored Python Replay workflow](../../.github/workflows/testsprite-replay.yml) asks the TestSprite CLI to replay two deep scripts that decode real pixels and the downloaded PNG, so both TestSprite paths check every push. `TestSprite V3` is a required status on `main`, with no admin bypass. On the Free plan the App did not run PR checks until 19 October; results from before then are portal runs, labelled as such in the dated records.

## Bugs TestSprite led us to

| What an artist would have hit | How TestSprite surfaced it | Fix | Guard test |
| --- | --- | --- | --- |
| Normal Chisel, picked from the toolbar, painted surface-map colours straight into ordinary paint | A Chisel case created the wrong kind of layer; following it led to the defect | [`2c9cf43f`](https://github.com/lxcario/PixiBun/commit/2c9cf43f) ([PR #5](https://github.com/lxcario/PixiBun/pull/5)) | `tests/normalChiselLayerSafety.test.tsx` |
| On a locked layer, deleting a selection still changed 768 colour channels | A strict cloud run: unlocked Delete worked, then the locked Delete changed pixels | [`37b37191`](https://github.com/lxcario/PixiBun/commit/37b37191) | `tests/selectionLayerLock.test.tsx`, `tests/e2e/selectionLayerLock.spec.ts` |
| Closing the colour picker sent keyboard focus to the wrong button | A keyboard case; the same question went red → green across two builds | [`e056a756`](https://github.com/lxcario/PixiBun/commit/e056a756) | `tests/e2e/colorFocusReturn.spec.ts` |
| A palette loop rejected its own default speed (6 Hz) and 5.5 Hz | Automatic App run on `2d27b262`, S4-PAL-04 | [`f2f13f3c`](https://github.com/lxcario/PixiBun/commit/f2f13f3c) | `tests/production/testspriteBatchFollowup.spec.ts` |
| An error shown over an open dialog was inert, so screen readers never heard it | Automatic App run on `b78fffb1`, S4-ANIM-03; **passed in the next automatic run** | [`e43248c0`](https://github.com/lxcario/PixiBun/commit/e43248c0) | `tests/components/SurfacePrimitives.test.tsx` |
| The transform toolbar's buttons were named only with arrow glyphs | Automatic App run on `48f9b999`, S4-RELATION-01: the agent couldn't find them | [`ff320663`](https://github.com/lxcario/PixiBun/commit/ff320663) | covered by the e2e below |
| Flip a selection with H or V, press Escape: the pixels were gone, with no Undo | Reproducing S4-RELATION-01 by hand | [`c534cc99`](https://github.com/lxcario/PixiBun/commit/c534cc99) | `tests/e2e/selectionTransformUndo.spec.ts` (5 ways home) |
| Typing 24 into the canvas-size field gave 44 | Automatic App run on `9c2197d2`, S4-HIST-03; **passed on the fixed build** | [`4d838ca9`](https://github.com/lxcario/PixiBun/commit/4d838ca9) | `tests/components/CanvasResizeModal.test.tsx` |
| Practice said "finish saving your drawing" right after a save | A Playground plan walking a newcomer's path | [`53eb033b`](https://github.com/lxcario/PixiBun/commit/53eb033b) | `tests/e2e/practiceAfterStarter.spec.ts` |
| A 4 px Dither Brush stamp painted solid, ignoring its pattern | Rewriting a blocked plan to check dithering with one click | [`88ba8cde`](https://github.com/lxcario/PixiBun/commit/88ba8cde) | `tests/e2e/ditherBrushSize.spec.ts` |
| The Teaching Board announced a load even when it failed | Found while redesigning a Teaching Board plan | [`1e68955a`](https://github.com/lxcario/PixiBun/commit/1e68955a) | — |
| A replay link with an invisible character glued on opened a blank canvas | Automatic App run on `2f33975e`, S4-NEW-06; **passed on the fixed build** | [`04acc9bb`](https://github.com/lxcario/PixiBun/commit/04acc9bb) | `tests/replayLink.test.ts` |
| Clicking Create palette again right after saving one could leave the button dead until the panel was reopened | Our emulator running the S4-PAL-01 App plan before a push (1 run in 6) | [`c6e42784`](https://github.com/lxcario/PixiBun/commit/c6e42784) | `tests/production/paletteDialogReopen.spec.ts` |

Smaller accessibility fixes came from the same runs: the Apply Cleanup and Live preview names now contain their visible labels (WCAG 2.5.3, [`1c494612`](https://github.com/lxcario/PixiBun/commit/1c494612)), and the canvas readout's summary names its layer count ([`1071bcb6`](https://github.com/lxcario/PixiBun/commit/1071bcb6)). The full PR ledger, with each first failure and fixing commit, is in [loop-ledger.md](loop-ledger.md).

## From 33 to 119 passing

Automatic App runs on PR #6. Counts are each run's own per-case verdicts (`test result --history`, source `github_action`).

| Push | Passed | Failed | Blocked | What changed |
| --- | ---: | ---: | ---: | --- |
| `b78fffb1` | 33 | 7 | 81 | Starting point, 21 Oct |
| [`48f9b999`](app-run-2026-10-22-48f9b999.json) | 55 | 7 | 59 | First run after 28 plans were redesigned around what the agent can see; S4-ANIM-03 passes on the toast fix |
| [`0259f782`](app-run-2026-10-22-0259f782.json) | 58 | 8 | 55 | S4-RELATION-01 passes on the lifted-selection fix |
| [`89d7041b`](app-run-2026-10-22-89d7041b.json) | 63 | 2 | 56 | |
| [`c5e0ebf9`](app-run-2026-10-22-c5e0ebf9.json) | 59 | 8 | 54 | Docs-only push: the same app, so this measures run-to-run variation |
| [`9c2197d2`](app-run-2026-10-22-9c2197d2.json) | 68 | 7 | 46 | S4-HIST-03 finds the resize-typing bug |
| [`3c61db42`](app-run-2026-10-22-3c61db42.json) | 68 | 9 | 44 | |
| [`2d76837b`](app-run-2026-10-22-2d76837b.json) | 99 | 8 | 14 | First run with every plan redesigned, and the Dither fix |
| `cc64dfd5` | 106 | 7 | 8 | |
| `587da149` | 116 | 3 | 2 | Plans that needed a drag, upload, phone or offline rewritten to what the agent can see |
| `2f33975e` | 115 | 4 | 2 | S4-NEW-06 finds the invisible-character link bug |
| [`53ac2afe`](app-run-2026-10-22-53ac2afe.json) | 116 | 3 | 2 | The link fix passes |
| [`efed6fae`](app-run-2026-10-23-efed6fae.json) | 118 | 2 | 1 | Every plan starts on the classic desk |
| [`f97621a4`](app-run-2026-10-23-f97621a4.json) | **119** | **2** | **0** | Latest: no blocked case |

Every non-pass in every run was traced from the run's step snapshots and video, and sorted into three honest piles: a PixiBun bug, a mistake in our plan, or a limit of the cloud runner. The [22 October record](../releases/2026-10-22-app-plan-reliability.md) has the per-run detail. The two failures in the latest run were plan issues: S4-READOUT-01 expected an outdated readout sentence, and the agent glued three letters onto S4-DRAW-11's link. Both plans are fixed, and all 105 plans pass our local emulator with Studio Labs on and off.

## What the cloud agent can't do, and how we cover it

The App agent clicks, types, reads the page and navigates. It cannot drag, upload a file, change the window size or go offline, and it sometimes reports a step it did not perform (the step snapshot shows Redo still disabled after an "Undo"). For cases whose essence needs those things, the App plan checks what the agent can genuinely see, and the deeper check lives elsewhere:

- **Stored Python replays** (TestSprite CLI) decode real canvas pixels and the downloaded PNG.
- **Playwright browser tests** in GitHub CI drag, upload, decode GIF/APNG/MP4 files and compare exact pixels in Chromium, Firefox and WebKit.

Native App runs and CLI replays are different kinds of evidence, and we report them separately.

## Where to look

- [Loop ledger](loop-ledger.md): every App failure on PR #6 and the commit that answered it.
- [22 October reliability record](../releases/2026-10-22-app-plan-reliability.md): run-by-run triage.
- [Per-run results](.): `app-run-2026-10-22-*.json`.
- [Plan specs](../../scripts/testsprite/app-plans/specs/) and the [emulator](../../scripts/testsprite/app-plans/emulate.py) we use to check a plan before it costs a credit.
- [Replay workflow](../../.github/workflows/testsprite-replay.yml) and [replays](replays.md).
- Earlier, dated findings: [evidence guide](evidence-guide.md) and [findings](findings.md).
