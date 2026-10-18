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
