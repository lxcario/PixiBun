# Small promises, followed carefully

TestSprite findings register, 18 October 2026. Read this alongside the [build diary](build-diary.md), [source-labelled cloud evidence](verification-stories.json) and [automatic PR ledger](loop-ledger.md). The portal may require the owning account to open execution links. A linked controlled replay is not an automatic GitHub App check.

## Two artwork-protection defects

**Bun gets to keep its colors.** A Normal Chisel scenario had created the wrong kind of layer. Following it led to a real application defect: choosing the tool from the toolbar could write normal-map colors into ordinary paint. The canvas now rejects the stroke before changing pixels or history and explains how to choose a surface. Production failed the exact pixel comparison; a controlled fixing-preview replay passed. [Fix PR #5](https://github.com/lxcario/PixiBun/pull/5) and [the dated Chisel record](../releases/2026-10-17-chisel-layer-safety.md) retain the scope. Automatic verification and the production release remain separate.

**A lock should keep its promise.** The cloud browser proved unlocked Delete changed the drawing and Undo restored it. Then it selected again and visibly locked the layer. Delete still changed 768 RGBA channels. Selection editing lacked the drawing path's lock check. The candidate guard checks the active layer before destructive edits, propagates refused lifts/commits, leaves Copy available and retains floating content that cannot yet be committed. The [original cloud failure](https://www.testsprite.com/dashboard-v3/o/resques-workspace-8da317b3/projects/ae8453ac-f859-4324-9ca2-5016e683bc6c/execution/deb3794c-8831-4e5d-8720-8af739122e15) stays unchanged. Earlier isolated verification passed 114 focused tests and nine real-browser cases; that is not a deployed or automatic green for a later candidate.

## Better questions for a real drawing

| Investigation | What the improved check establishes | What it does not establish |
| --- | --- | --- |
| The Lamp's old report counted decorative SVG rectangles on a blank canvas | A corrected browser paints a red heart through actual Pen gestures, checks its literal 100 painted pixels and decoded PNG, then exact lighting Undo/Redo/Undo | No product Undo defect was proved by the old report; the drawing plan was supplied, not autonomously invented |
| PNG export stopped at the dialog | Actual downloaded bytes decode independently to all 1,024 expected RGBA channels | All sizes, encoder options or export formats |
| Backup saving did not prove editable survival | An actual two-frame/two-layer backup reopens in a fresh browser; decoded layers, holds, palette and clip survive, then editing/Undo works | Native OS save-picker coverage or every advanced project field |
| Timeline goal named Undo/Redo without performing them | Exact hold transitions and preserved artwork through real Undo and Redo | A product timeline repair |
| Palette browsing was confused with foreground selection | Twelve ordered swatches, explicit color choice and unchanged artwork | A product palette repair |
| Clip test assumed no Default Clip existed | Inclusive saved ranges, valid edits and backward-range refusal preserve decoded project data | Playback or export-range fidelity |
| Separate exports left a gap between picture and project | Actual PNG/GIF/APNG poses, transparent clearing and 100/200 ms holds survive; the downloaded editable project opens in a new browser | Original pointer drawing for the imported animation fixture |
| Transform clicks alone did not prove geometry | Each intermediate mirror/quarter-turn matches an independent coordinate permutation; the final raster and protected saved data are exact | Arbitrary lossy transforms |

Those eight scoped supporting cloud cases have passes in the [evidence data](verification-stories.json). Their scripts and independent pixel/file oracles are in the [journey guide](../../scripts/testsprite/README.md). Original failed or blocked attempts remain in portal history and local retained records. A test correction is a useful verification improvement; it must not be counted as another product bug fixed.

The accessible Canvas readout and bounded replay links give a DOM-oriented browser more precise observations. The readout journey compares literal expected artwork, the canvas, announced fields and an independently decoded PNG; it does not trust the app's digest alone. Local qualification and actual cloud execution are separately reported. Recipe application is distinct from pointer handling and manual screen-reader usability.

## Delivery and attribution still matter

A controlled run reported preview metadata while its actual browser opened production. We retained that failure and reported the destination mismatch to TestSprite. Explicit origin and public-manifest source checks are now part of controlled qualification. Metadata alone does not prove which build was tested.

The GitHub App receives Vercel deployment-ready events. When a deployment finishes before any PR exists, it can be skipped. Opening the PR before a fresh Preview redeployment fixes that ordering. On 18 October [PR #6](https://github.com/lxcario/PixiBun/pull/6) produced a new matched event at `d9065d5`, but dispatch still stopped at **Blocked by billing — GitHub CI runs not on the Free plan. No tests were run.** The automatic ledger stays empty until tests actually execute. Neither a supporting CLI pass nor a blocked status completes that loop.

The original 97-case expanded batch remains **34 Passed / 13 Failed / 50 Blocked**. The later recorded 120-case catalog has **54 Passed / 11 Failed / 55 Blocked**, reflecting different latest per-case runs rather than one complete passing batch. Important blocked assertions and unreviewed later cases remain work to do.

Curve Re-edit, shelf overflow, receipt counting, contrast and accessibility repairs found by repository tests and other agents are credited in [their integration record](../releases/2026-10-17-final-integration.md). They are not presented as TestSprite discoveries. No first-place result, all-feature certification or completed automatic PR loop is claimed.

## 18 October follow-up: the selected pixels stay put

The selection repair is now deployed to [PR #7’s preview](https://github.com/lxcario/PixiBun/pull/7), source `37b37191`. The original strict cloud comparison passed there, with its unlocked sensitivity check, actual lock and every RGBA assertion retained. The [controlled follow-up](https://www.testsprite.com/dashboard-v3/o/8da317b3-5f3e-506d-b110-a2ae9c2af7b8/projects/ae8453ac-f859-4324-9ca2-5016e683bc6c/execution/0a1d9522-9cea-410d-9988-7fa49c610016) closes this preview comparison; it does not imply a production release or automatic App pass.

Heart/readout/PNG, the actual Animate end slot’s keyboard action, and Cocoa/Drizzle/Harvest/Harbor in both schemes also passed controlled source-pinned cloud qualification. The [dated candidate record](../releases/2026-10-18-artwork-safety-and-evidence.md#qualified-candidate-follow-up--source-37b37191) records the 2,876-test gate, 66 affected production-browser cases and complete journeys. The newer catalog is 121 cases, 58 Passed / 8 Failed / 55 Blocked, not a complete green batch. Earlier counts and failed attempts above remain historical.

PR #7’s new matching-head event also stopped at billing. That is the remaining automatic-dispatch blocker; it did not prevent these repairs, stronger tests, public evidence or a recorded demo.

## A keyboard way back

The next strict Colors check found an application defect, not a provider blockage. Escape closed the palette, but both color-well openings returned keyboard focus to another button. The same failure ran in TestSprite on source `37b37191`; local production regressions distinguished the two broken well paths from the working dedicated opener. The [Colors repair record](../releases/2026-10-18-color-focus-return.md) preserves the red, the cause and the fixing-source qualification boundary.

The saved-layout, focused frame-key and homepage bench checks all passed controlled cloud qualification on `37b37191`. Their [receipts](cloud-receipts-2026-10-18.json) include code versions and script hashes. They improve verification, and are not additional product bugs. The cloud color failure, three companion passes and earlier 97-case batch remain distinct observations.

## The third controlled comparison is green

Colors now returns to its actual opener on the fixing preview: the original source `37b37191` cloud red is paired with source `77a40070` cloud green. All three opener paths separately passed production-browser regressions in Chromium, Firefox and WebKit. See the [qualified fixing record](../releases/2026-10-18-color-focus-return.md#qualified-fixing-preview--source-77a40070).

The supported Normal Chisel path now observes the actual downloaded normal-layer pixels, preserving diffuse paint through exact Undo/Redo. Erase Family now uses a known two-frame fixture, explicit modes/scope, fresh actual canvas bounds and decoded backups. Both passed controlled cloud qualification without needing another application repair. The real painted-heart/lighting test also passed on the candidate with CSP-safe waits and unchanged assertions.

Latest recorded catalog: 121 cases, 64 Passed / 2 Failed / 55 Blocked (13:07 UTC). The stale-rig and surface/shadow-source plans still need qualified fixtures. The normal App trigger remains externally blocked and the automatic ledger stays empty; supporting passes never increment it.
