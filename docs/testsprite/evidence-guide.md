# A little drawing, and the promises around it

20 October follow-up: a fourth TestSprite-led product defect, cycle-rate native validity, now has independent local red → green qualification. It has **no fixing-preview cloud green yet**. The [targeted repair record](../releases/2026-10-20-targeted-repairs.md) preserves that boundary, the original App failure and actual three-engine observations. The three cloud-qualified stories below remain distinct. The [latest complete automatic cohort](automatic-followup-2026-10-20.json) is 37 Passed /9 Failed /75 Blocked, rather than a complete green suite.

PixiBun is a small pixel-art and animation desk. An artist should be able to trust a lock, return to a palette with the keyboard, and find their drawing inside the file they take home.

For Season 4, TestSprite helped us turn those promises into questions we could actually check. This guide starts with the genuine defects, then shows how we made the questions more precise. Results are dated and source-labelled. The [PR ledger](loop-ledger.md) now records the first executed App check, retried manually on 19 October: **32 Passed /13 Failed /76 Blocked**. The [19 October register](pr6-triage-2026-10-19.md) separates that cohort from older catalogs, plan/script repairs and supporting replays. The unattended fixing-commit loop remains unproven.

## Three real findings, with a trail back to the pixels

| The promise | What TestSprite revealed | What changed and what proved it |
| --- | --- | --- |
| Bun keeps its colors | Choosing Normal Chisel from the toolbar could put surface-map colors onto ordinary diffuse paint | The canvas rejects the unsupported stroke before touching pixels/history and explains how to choose a surface. Production red and fixing-preview green are linked in the [Chisel record](../releases/2026-10-17-chisel-layer-safety.md). |
| A lock keeps selected artwork safe | The strict cloud browser proved unlocked Delete worked and Undo restored it, then locked the selected layer; Delete still changed its pixels | Selection operations now validate the live target before mutation, propagate refused commits and retain floating content that cannot be placed. The original red and controlled preview green are in the [artwork record](../releases/2026-10-18-artwork-safety-and-evidence.md). |
| Colors remembers where the artist came from | Escape closed the palette but sent focus to another button after opening from either color well | The flyout remembers its actual opener. The same cloud question changed from red on `37b37191` to green on `77a40070`; all three opener paths passed browser regressions. See the [Colors record](../releases/2026-10-18-color-focus-return.md). |

These are three product findings. Other agents' timeline, playback, geometry, tool-preview and contrast work keeps its own attribution in the dated integration records. We do not claim TestSprite discovered changes it did not discover, or assign unmeasured hours or money saved.

## The browser should bring a real drawing

One early lighting report compared decorative SVG rectangles while the canvas was empty. That could not tell us whether Undo restored an artist's pixels. The stronger browser paints a heart from a blank canvas: thirteen red brush drags, three white clicks, one hundred literal painted pixels. It downloads the actual PNG, decodes it independently, applies lighting and compares exact Undo/Redo/Undo results. That journey passed. The [journey guide](../../scripts/testsprite/README.md) distinguishes pointer painting from imported animation fixtures and recipe links.

Our animation comparison follows another small drawing out of the desk and home again: PNG, GIF, APNG and an editable project, with independently decoded poses, transparency and frame holds. The backup opens in a fresh browser and remains editable. These are bounded functional fixtures, not a claim that an agent invented a beautiful artwork or that every encoder setting is covered.

## Better questions also tell us when a repair is unnecessary

A stale-rig report did not establish that its saved source had really changed. The stronger test fingerprints the actual downloaded source, opens the unchanged rig successfully, makes a real brush edit, saves/reloads and tries the same rig again. PixiBun refuses it clearly and leaves today's drawing intact. A normal-map export test similarly proves one source works before checking that two sources refuse. Neither required another app repair.

The next three questions were about coming back safely. A last brush mark and different pauses survive explicit Save, reload and a closed/reopened tab. Two small malformed imports are refused while the original stays editable and Undo still works. An onion-skin ghost is visibly present, but every artwork layer and the actual PNG stays free of that guide. All five bounded checks passed in controlled TestSprite cloud runs on source `36ccc620`, with auto-heal disabled, and in fifteen local Chromium/Firefox/WebKit journeys. Exact run/code/script hashes and limits are in the [18 October trust record](../releases/2026-10-18-testsprite-trust-and-triage.md) and [cloud receipts](cloud-receipts-2026-10-18.json).

## An honest finish line

We read all 55 original Blocked plans/results. Most stopped at a missing pixel/file observation or an unestablished edit; others lacked a fixture, a current control path or a real browser/network prerequisite. Their generated hosting explanations are leads, not diagnoses. The [complete triage register](blocked-triage-2026-10-18.md) preserves every original case and its next boundary.

At the 18 October snapshot there were 121 cases: **69 Passed /0 Failed /52 Blocked**, across different latest case runs. The 19 October App batch is separate. Neither is an all-green automatic loop. The original publication preview retains three no-console-error failures caused by Vercel's injected feedback toolbar conflicting with CSP. Production release, the unattended fixing-commit loop and remaining coverage still need completion. This guide is a dated record, not a live status monitor.

What TestSprite gave us was a useful way to question our own assumptions: follow the actual gesture, read the file, keep the first failure, and show what changed. The little drawing gets a clearer trail home.
