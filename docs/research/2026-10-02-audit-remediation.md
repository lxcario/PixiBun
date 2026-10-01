# Audit remediation — 2 October 2026

The user requested all corrections after the [code/documentation audit](2026-10-02-documentation-codebase-audit.md). The [40-finding registry](issue-registry.md) records current fixes and remaining qualification. Recorded validation applies to the working tree based on `277dc0b`. Subsequent Git publication is separate from deployment and release sign-off.

## Changes

Current references were reconciled to source, with canonical safety/storage/export/rendering/shortcut/deployment/testing/learning contracts, one status source and generated inventories. Duplicate session blocks were removed while preserving original dated execution and release records. Historical plans/audit/UX snapshots are labeled at their point of use. Incorrect future SIMD/JFA/citation material and unsupported measurements were corrected or removed from promises.

Code changes enforce strict saved diagnostics booleans, bound/account idle scratch buffers globally, correct CVD's CPU/SVG linear-color domain, remove the incorrect Export E hint and clarify compositor ownership. Alt selection subtraction now bypasses pan/translation interception; box/lasso/wand browser regressions also preserve middle-button and non-selection Alt panning. The hook installer respects Git's worktree/configured path and preserves unrelated hooks. Seven editor locators now follow current controls; routine screenshots write per-test output rather than historical evidence. Evidence publication creates a new directory with hashes.

## Final executed validation

Environment: Windows x64, runner **Node 22.23.3**, Playwright **1.62.1**; Chromium **151.0.7922.34**, Firefox **153.0**, WebKit **26.5**. Editor checks reused the development server on 3000. Production checks started a separate compiled server on 3302. [Commands, environment and scope](evidence/2026-10-02-remediation/run.json).

| Run | Actual result | Evidence |
| --- | --- | --- |
| Final full gate | Passed docs, types, lint, **1,524 tests / 153 suites**, production build; **57.47 seconds** | [Gate log](evidence/2026-10-02-remediation/gate-full-final.log) |
| Full editor workflows | **158/158 passed**, 38 files, Chromium, one worker; **8.6 minutes** reported | [Editor log](evidence/2026-10-02-remediation/editor-full.log) |
| Full compiled-production workflows | **42/42 passed**, 14 scenarios in each of Chromium/Firefox/WebKit, one worker, zero retries; **6.6 minutes** reported | [Production log](evidence/2026-10-02-remediation/production-full.log) |
| New selection regressions | Box/lasso/wand subtraction, source preservation and retained middle/non-selection Alt panning passed; included in the full editor run | [Targeted log](evidence/2026-10-02-remediation/selection-regression.log) |
| Native lens filters | Linear CVD, encoded Squint ink and source preservation passed in all three production browser engines | Production log above |
| Evidence integrity | **71 tracked PNGs** byte-identical to HEAD; **32 original audit artifacts** still match their original manifest hashes | [Integrity record](evidence/2026-10-02-remediation/evidence-integrity.json) |

Initial targeted boundary tests passed **40 cases across four suites** (pool, diagnostics, CVD and isolated hook installation). An earlier pool-test attempt timed out while asserting large-array identity; a boolean identity assertion passed without enlarging the timeout. No application runtime failure was established by that timeout. The complete unit run also covers the new link/anchor and evidence-publication regressions.

The first full gate passed before the additional Alt-selection correction. A later check caught an incorrect test-only Window declaration; that failed log is [preserved](evidence/2026-10-02-remediation/gate-after-selection-type-failure.log). The corrected final gate and full browser runs passed. Later edits were documentation-only; the [final documentation/link check](evidence/2026-10-02-remediation/docs-final.log) passed. No browser rerun is implied after prose-only changes.

## Evidence and limits

The pre-fix audit evidence remains immutable history; its report has an explicit remediation/erratum pointer. Routine screenshots now use per-test outputs, and historical image hashes were verified above. Prior local-only verification preference is preserved, so no new TestSprite upload, tunnel or verdict is claimed. Participant/device/real-network/long-session/coverage/Lighthouse/live-deployment qualification remains separate. These corrections align current documented contracts and qualification limits; they do not certify every possible behavior, input or future revision.

Audit correction: `.env.example` existed **and was tracked** at the base revision. Its broad ignore pattern hid eligibility for new matching files, but did not untrack the existing file. The safe template was refreshed and a publication exception added. The prior audit's absent-publishability inference was too broad. The TestSprite audit correctly counted 58 individual plan files; the expanded registry also records 51 overlapping entries in four aggregate files without counting them as independent executed coverage.

## Later README review — 2 October 2026

The user's brand/tone review exposed remaining README overstatements: an unavoidable pre-push hook, unmeasured sub-16ms/no-render strokes, lossless downsampling and unqualified accessibility labels. These were corrected against the existing contracts without changing code. The earlier blanket assurance was too broad. The sealed source snapshot above remains the earlier checkpoint; it predates this prose follow-up. Documentation checks are rerun for the updated README.

The subsequent README refresh introduces the studio through a shorter, warmer artist-facing guide and three [new local screenshots](../assets/readme/2026-10-02/run.json): Cozy Classic dark/light and an unapplied Bun lighting preview. Playwright exercised the real project importer, theme and lighting controls without page errors. The older README embeds were removed; their original files remain available to the architecture document. This is documentation/image work after the sealed checkpoint, with a documentation check rather than a new full application-suite verdict.
