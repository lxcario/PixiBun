# A release should choose the tool under your pointer — 20 October 2026

This follow-up resumes bounded testing with the owner's explicit authorization before the plan upgrade. It preserves the [earlier paused preparation](../testsprite/paused-plan-repairs-2026-10-20.md), original App failures and manual-versus-automatic distinction. Reviewed published source: `efb223ae`; production remains `92de6c74`.

## A real tool-rail race, discovered through GitHub CI

The earlier [CI job](https://github.com/lxcario/PixiBun/actions/runs/39324757464) recorded two genuine test failures before it was cancelled. One gesture lifted the glass lens and moved over Eraser, yet Pen remained selected after release. An ordinary local run passed, so that alone could not dismiss the Linux failure.

A new regression pauses animation frames while sending real pointer down/move/up events. Eraser receives the actual under-pointer marker, but the unfixed application still selects Pen. That deterministic red is retained. [ToolRailLens](../../src/experimental/liquidControls/ToolRailLens.tsx) committed the nearest tool to the animated spring position, which can trail the pointer. It now commits the observed pointer target before clearing that marker. It does not wait longer for the animation or relax the selected-tool assertion.

The new regression and six neighboring browser checks passed **7/7** in local Chromium, one worker, zero retries/skips. Hold-to-open grouped tools, Lab off, slider release and ordinary lens movement remain covered. This is a **CI-led product repair**, not another bug claimed as discovered by TestSprite. The original Linux failure and early local setup attempts remain separate records.

## The evidence page should tell the truth about its own date

[verified.spec.ts](../../tests/e2e/verified.spec.ts) still demanded “blocked by billing” after the dated page had been updated to describe an executed, failed App cohort. That mismatch reproduced locally. The test now requires the full committed automation note, its recorded date and the explicit dated-record disclaimer. It retains the loop ledger, story/check counts, navigation and zero-console-error assertions. The page was not rewritten to invent a passing PR result.

## Evidence that stops changing before it is indexed

The same cancelled job's retrieval check correctly rejected **29 mismatches among 11,487 indexed files**. Its receipt includes the changing production log, active trace files and newly added trace resources. GitHub's final cleanup later killed the orphaned production runner. Indexing live output before upload made a stable custody check impossible during that cancellation.

[snapshotVerificationEvidence.mjs](../../scripts/snapshotVerificationEvidence.mjs) now copies explicit verification directories to a new isolated location before the [CI workflow](../../.github/workflows/ci.yml) indexes and uploads those copied bytes. Hidden trace files are retained; credential paths, symlinks, destination reuse and source/destination overlap are refused. The strict download verifier remains unchanged and still rejects tampering. The upload paths preserve the snapshot's directory hierarchy, consistent with the [official artifact action documentation](https://github.com/actions/upload-artifact#upload-using-multiple-paths-and-exclusions).

The copy is **not globally atomic**, and a valid custody receipt is **not a test pass or proof that interrupted traces are complete**. Its capture metadata says so. Focused tests mutate the original after capture, independently verify the unchanged copied download, then corrupt that download and require rejection. Snapshot and existing verification tests pass **17/17**; workflow checks pass **10/10**. TypeScript and changed-file lint pass. The changed workflow still needs a real Linux upload/download run; local tests cannot certify GitHub transport.

## Two TestSprite scenarios, independently checked first

The [shared replay](../../scripts/testsprite/pixibun-ui-reports-integrity.py) now implements the repaired named-palette definition and the already-authored four-theme contract through real controls, with no store/raster writes. It compares native RGBA and independently reads actual downloaded project JSON. Palette checks exercise both reorder directions, removal, commitment and cancellation while preserving existing palettes and protected project data. Theme checks exercise all eight Cocoa/Drizzle/Harvest/Harbor Night/Day choices, a real save/reload, exact artwork and saved project/frame/layer metadata.

Both scripts passed in Chromium, Firefox and WebKit on the exact public `efb223ae` preview: **6/6**, serially, no retry. Browser-download fallback is explicit; native save-picker success is not claimed. Full manifest SHA and actual origin are asserted before/after each scenario.

A later review strengthened the theme oracle: instead of checking full downloaded project metadata only at the end, it now downloads and compares the complete project after each of the eight choices as well. That stronger version passed **3/3** independently in Chromium, Firefox and WebKit (`012b42f97f6bc7587d25eda42365e786800117b36de912980f5f5eab3101c684`). The two cloud results below belong to the earlier qualified version (`f4634c052ce6f336b58ec886f7d90cf0c3082c4d024e1fa9f64c2521fbab2541`); they do not attest to the added intermediate metadata checks. No further cloud rerun was dispatched for that strengthening.

Only then were two source-pinned, auto-heal-disabled cloud runs dispatched:

| Case | TestSprite result | Evidence limit |
| --- | --- | --- |
| [S4-PAL-01 — named palette](https://www.testsprite.com/dashboard-v3/o/8da317b3-5f3e-506d-b110-a2ae9c2af7b8/projects/ae8453ac-f859-4324-9ca2-5016e683bc6c/test-cases/ffedf7d1-5b19-4552-993a-fe63e56e9f19) · `2ac768dd-1afe-44f2-adb4-13b3163eb6c4` | **Passed**, manual CLI source; submitted code `v-f25fefdaf0b3` | The API reports no executed code version, actions or stdout. The portal confirms Passed and says the eleven-step plan ran as zero actions. |
| [S4-NEW-18 — four themes](https://www.testsprite.com/dashboard-v3/o/8da317b3-5f3e-506d-b110-a2ae9c2af7b8/projects/ae8453ac-f859-4324-9ca2-5016e683bc6c/test-cases/8454253c-80b9-4da4-b9c8-548776bb4298) · `acb290ea-98c8-4b1b-b800-1390664a94fc` | **Passed**, manual CLI source; submitted code `v-5f0b89be78e8` | The same API attestation limit applies. All eight choices and file/pixel assertions were independently exercised by the local three-engine qualification. |

These are provider-reported **controlled script results**, not an automatic GitHub App green. The submitted script pins and code hashes are preserved, but missing execution metadata must not be invented. The same qualified logic was restored for future environment URLs after both runs became terminal; no extra rerun was requested. Original failed/blocked runs remain intact.

Both requests submitted the branch-preview URL, but the later run envelopes name `https://pixibun.vercel.app/`. The current v0.15.0 CLI client preserves the outgoing URL and the returned fields in an offline replay of these actual responses; it does not strip the version/actions or substitute the URL. Therefore these two provider verdicts do **not** prove that the branch preview or source-pinned scripts executed. Their actual cloud source/target binding remains unresolved, consistent with the earlier platform report. Independent local preview qualifications are the evidence for those exact assertions.

## What remains blocked

All **75 Blocked** cases in the last completed `2d27b262` cohort were reviewed through their retained reports. The [receipt](../testsprite/resumed-verification-2026-10-20.json) keeps their original IDs, run IDs, hashes and overlapping report categories. Mentions of pixels, gestures, files or fixtures do not establish a root cause. Several generated hosting-side explanations speculate about canvas corruption even when the original report says no exact pixels were observed; those hypotheses are not product-defect evidence.

Fixture imports still need a supported delivery path; the Free account's shared file pool remains plan-gated. A missing file must not become a successful import. Cloud UI traces also omit requested keys/Undo or defer transient assertions, despite already corrected definitions. More credits or a paid fixture pool alone would not establish those runner capabilities. Preserve the strict all-channel/file assertions and qualify actual executed actions before claiming coverage.

The existing [native codec Linux run](https://github.com/lxcario/PixiBun/actions/runs/39331136294) is independently confirmed **15/15**, zero retries/skips, on the `efb223ae` PR merge source. Earlier Firefox failures remain historical. The broad CI on `efb223ae` was cancelled, so the complete final Linux combination remains unverified. Full TestSprite PR testing stays Disabled pending a deliberately bounded re-enablement plan. The required passing automatic loop, final production deployment and submission remain open; no 100% suite result is claimed.

Raw failures, logs, the small original custody receipt, script bodies, browser output and restoration records remain ignored under `artifacts/s4-remediation/`. The lightweight [receipt](../testsprite/resumed-verification-2026-10-20.json) gives source labels and hashes. The local full gate then passed all six stages on Node 22.23.3 in 239.50 seconds: documentation, TypeScript, lint, **2,916 unit tests in 270 files** with the configured coverage gate, warmed performance budgets and the production build. This qualifies the uncommitted isolated working-tree candidate based on `efb223ae`; the build banner still carries that base SHA and must not be presented as a new committed or deployed revision. Final Linux/browser integration, publication and automatic App verification remain open.
