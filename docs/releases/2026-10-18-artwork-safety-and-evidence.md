# Artwork safety and the small promises page — 18 October 2026

Candidate branch `codex/s4-artwork-proof`, based on committed integration `d9065d511e81923f6365f30e04c5d766b792cccc`. Changes are assembled in a separate checkout; the other agents' shared working source, untracked audit files and running tasks are not modified.

## Protect selected pixels too

The strict TestSprite production case S4-SAFE-06 reproduced selection Delete erasing a locked layer: 768 changed RGBA channels after a valid unlocked sensitivity check and exact Undo. The [original failure](https://www.testsprite.com/dashboard-v3/o/resques-workspace-8da317b3/projects/ae8453ac-f859-4324-9ca2-5016e683bc6c/execution/deb3794c-8831-4e5d-8720-8af739122e15) is retained.

The candidate checks the live active layer before destructive selection operations and propagates refused lifts/commits through pointer and transform callers. Copy stays available. A floating paste refused by a locked target is retained for recovery rather than discarded. The new unit regressions cover the mutation boundaries; the real-browser cases cover Delete, Backspace and Cut with an unlocked sensitivity check, exact raster restoration, actual lock control, refusal feedback and subsequent unlocked editing.

Earlier isolated source `66157568` with this repair passed 114 focused tests and nine browser cases; the archived original failed 11 of the 12 new lock cases. Those are prior-source development checks, not a combined production or cloud verdict.

## Show what the evidence actually says

The expanded `/verified` page displays two genuine defect stories and eight scoped supporting cloud passes, with source/code/run links and the actual PNG painted by the heart test. Its automatic PR ledger remains empty. The [findings register](../testsprite/findings.md) distinguishes product fixes, test improvements, source attribution and service blockers; the [diary](../testsprite/build-diary.md) tells the corresponding artist story. No repository-test discovery is misattributed to TestSprite.

Four standalone Python journeys under [scripts/testsprite](../../scripts/testsprite/README.md) check independent literal pixels, real export bytes and editable reopening. Original drawing uses real brush controls; imported fixtures and replay recipes retain their separate scopes. The accessible-readout journey requires a verified candidate SHA before cloud dispatch. The earlier artist-page and decoder results are in [the 17 October record](2026-10-17-testsprite-artist-journeys.md); they do not automatically qualify this combined candidate.

## Verification disposition

Integrated Node 22 gate/build, production-browser regressions and controlled cloud candidate qualification are pending at assembly. Record actual results with source identity rather than replacing earlier failed verdicts.

Automatic GitHub App execution is separately blocked: PR #6's fresh matching-head public Preview deployment was received, then refused for Free-plan billing. Local verification, preparing this review candidate and controlled portal runs do not depend on that entitlement. Do not bypass required checks, label a manually dispatched pass automatic, or imply a production release from this candidate record.

## Qualified candidate follow-up — source `37b37191`

The assembly-time pending statements above are retained as the earlier disposition. [PR #7](https://github.com/lxcario/PixiBun/pull/7) now contains the candidate at full source `37b37191550cd9e9dc1e724d5b912516b6e4a3d9` on a public matching-manifest preview. Its six-stage Node 22.23.3 gate passed: docs, types, lint, **2,876 tests / 266 files**, configured coverage thresholds, warmed performance budgets and production build. The normal pre-push hook also passed.

On that frozen production build, **66 affected browser cases passed** across Chromium, Firefox and WebKit with one worker and zero retries/skips/failures. They cover locked Delete/Backspace/Cut, replay goldens, selection boundaries, evidence-page navigation and phone width; Chromium additionally ran WCAG scans in twelve themes in Night and Day. Four complete independent pixel/file journeys and twelve decoder fixtures passed. These are scoped local production results, not the entire repository browser suite.

Four strict, saved-script **TestSprite cloud replays passed** on the actual public PR #7 preview with full source and origin pins, auto-heal disabled: the original locked-selection regression, Heart/readout/PNG, Animate keyboard/history, and four themes in both schemes with exact artwork/reload. Their versioned receipts are in [the evidence data](../testsprite/verification-stories.json). The original eight supporting passes retain their earlier source `92de6c74`; they are not silently reattributed to this candidate. The page now links eleven supporting checks and both defect follow-ups.

The readout’s first dispatch was refused as stale after its plan changed. After resaving, its string-evaluated wait hit the app’s CSP. The corrected script polls the same DOM attributes from the driver; all assertions and CSP remain intact. Both attempts are retained as test/integration observations, not product pixel bugs. Generated Animate/theme attempts honestly blocked at unavailable pixel observations before the stricter scripts supplied those observations.

The 18 October 08:06 UTC catalog observation is **121 cases: 58 Passed / 8 Failed / 55 Blocked**. These are latest per-case statuses, not a complete batch pass. Four other refined plans remain unexecuted; remaining failed/blocked scenarios are not certified.

PR #7 existed before its fresh preview finished. The GitHub App received that exact `37b3719` head as `github-pr-7`, then stopped at **Blocked by billing**. No automatic tests executed. The automatic ledger remains empty and required checks have not been bypassed. Supplementary CLI-dispatched replays do not complete the mandatory App loop.

A 49.8-second unedited preview recording shows real Pen-painted artwork, decoded PNG/GIF, actual editable backup reimport and the evidence page. The recording’s manifest/source and native-browser playback checks are retained locally; it has not been posted or submitted. It shows the candidate, not a production release.

At 12:26 UTC, saved-layout, focused frame-key and homepage-bench strict cloud replays also passed on `37b37191`; Colors exposed the focus-return defect described in [its separate repair record](2026-10-18-color-focus-return.md). The catalog was **121: 61 Passed / 5 Failed / 55 Blocked**. The four earlier unexecuted plans have now been exercised. The newer page carries fourteen supporting checks and a third defect story, with the Colors fixing-preview replay still pending. These newer observations do not replace the earlier source-qualified results above.
