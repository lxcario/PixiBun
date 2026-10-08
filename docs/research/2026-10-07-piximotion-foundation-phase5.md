# PixiMotion foundation Phase 5: persistent rigid-part definitions

Date: 7 October 2026. Scope: the local uncommitted working tree following [Phase 4](2026-10-07-piximotion-foundation-phase4.md). Source publication, deployment and whole-engine qualification are separate.

## Implemented boundary

Portable project format v4 introduces a bounded `motionRigs` library. Rig format v1 preserves exactly one rigid part: independent rig/part IDs, captured source frame/layer IDs and dimensions, SHA-256 of decoded full-source RGBA, selection bounds/local mask runs, pivot, two poses, frame count and easing. It does not duplicate rasters or save process-local registry generations. Skeletons, parent constraints, multi-part animation and inferred correspondence are future formats.

Supported old project versions migrate with an empty library when absent. Unknown rig versions/fields, duplicate identities, nonfinite/out-of-range poses, invalid bounds/runs and oversized libraries are refused before hydration. Definitions with missing sources remain dormant. A former reader enforcing a v3 maximum refuses v4 rather than silently stripping motion data; this code policy does not qualify a remote rollback reader.

Autosave and synchronous/asynchronous portable export preserve independently cloned definitions. Load/reset restore or clear them, including failed-load rollback. Gallery rename/copy retain definitions. Recovery preserves recipes even if it removes their source cels. Practice suspends the whole original store; Keep uses the same serializer. Source IDs are document-local and a project copy can restore its unchanged artwork after a fresh hash check.

Saved rigs appear in Tools. Save stores the current selected part/settings and marks the document dirty; saving a reopened part updates the same rig ID. Cancel closes the session. Opening explicitly checks source ownership/dimensions/lock/buffer availability and its pixel fingerprint, then reconstructs selected pixels with fresh session revisions. It never creates a blank source or searches names/positions for replacements. A changed source refuses activation while preserving artwork. Save/Delete are reversible structural document edits, with library metadata included in history snapshots and accounting. Baking retains the definition, whose subsequent opening must again validate source pixels. Saved-rig Save/Open/Delete refuse co-draw sessions, including a role change during fingerprinting; the peer protocol does not synchronize rig definitions.

Fingerprint operations validate workspace/source ownership after their asynchronous digest before publication. Pixel buffers/masks are bounded by workspace dimensions and explicit estimated reservations; these estimates are not measurements of process/GPU memory. The library allows 16 rigs, 512 mask runs per part and 32,768 JSON characters. Exact decoded-pixel comparison can safely refuse a color-converted or otherwise changed decode; it is not authentication of imported files. Arbitrary canvas writes that bypass registered revisions remain outside the editing contract.

## Academic basis

Carlo A. Curino, Hyun J. Moon and Carlo Zaniolo, *Graceful Database Schema Evolution: the PRISM Workbench*, PVLDB 1(1), 761–772 (2008), [primary publisher paper](https://www.vldb.org/pvldb/vol1/1453939.pdf). Sections 1 and 3 distinguish effects on stored data and applications and motivate explicit migration/evolution documentation. Here that informs an explicit project-format boundary, supported legacy defaults and refusal of unknown motion semantics. PixiBun does not implement PRISM's schema operators or query rewriting, and the paper does not prove this file format correct.

The [Kung–Robinson primary source and engineering adaptation in Phase 4](2026-10-07-piximotion-foundation-phase4.md#academic-basis-and-limits) also motivates validating source ownership before publication. Actual safety claims depend on the executed project-specific checks below.

## Local verification

The initial focused run passed 49 cases and failed three new fixture checks: mock canvas copying did not transfer pixels, keyboard events were dispatched without the owning hook, and IndexedDB was not initialized. The corrected fixtures use exact ImageData transfer, the existing Undo/Redo hook and fake IndexedDB without relaxing source/mask assertions. The follow-up passed 105 checks across five suites. The expanded source-race/history/recovery/practice/save-boundary run passed 112 checks across four suites. Initial diagnostics remain retained.

The initial full gate stopped on one unnecessary typed-array assertion in the new fingerprint helper. Removing it preserved behavior. Its follow-up reached all 2,019 unit cases and failed two old historical-fixture expectations that still required a v3 output. Those expectations now use the declared current format and additionally check empty migrated motion libraries; the original v2/v3 fixture files and artwork/recipe assertions are unchanged.

The final five-stage gate passed documentation, typecheck, zero-warning lint, **2,020 tests /194 suites** and a fresh production build, ID `CqSMTjBKHAW6bQMpvpqW6`. The first compiled persistence run passed **6/6** across Chromium, Firefox and WebKit, one worker and zero retries. It checks exact pixels after real autosave/reload, restored poses, stale-source refusal, reversible library deletion and bake Undo. A subsequent test-only expansion adds portable backup/import; the unchanged compiled application is used, with final gate/browser outcomes recorded below. No external pass is claimed in advance.

The test-only expansion passed documentation, typecheck and zero-warning lint; its full unit stage recorded 2,019 passes and one unchanged rotation timing failure, 10.495 ms against 10 ms. A fresh run then passed **2,020/194** with default workers and the same threshold. Both results remain retained; this sequence does not prove the cause of timing variation or consistent device latency. The renderer was not changed in this phase.

The expanded persistence suite passed **9/9**, including real portable export/import of saved definitions and exact reconstituted source/preview pixels. The related suite passed **12/12**: six existing motion/source/Undo checks and six legacy project import/edit/reload/backup/date/copy checks. Each used one worker, zero retries and Chromium/Firefox/WebKit on the same compiled application. These 21 scoped journeys do not constitute the entire browser suite, physical Safari or arbitrary sprite/angle/alpha qualification.

The source checkpoint contains 682 source/test/script/config inputs at HEAD `dcf9f5c303cdbaa6a533e3315de947c261c1e3ac` in a dirty working tree. Only the production persistence test was expanded after compilation; application inputs and four recorded build metadata hashes remain unchanged. Final integrity and archive checks are recorded below.

## External TestSprite verification

The user explicitly approved the drafted new case and its temporary local connection. Case `5c9fd256-a475-4391-84ab-b2f4353963c1`, [Saved motion rig restores its poses after reload and refuses changed source artwork](https://www.testsprite.com/dashboard-v3/o/8da317b3-5f3e-506d-b110-a2ae9c2af7b8/projects/ad7cf58e-3c0f-41d6-96a8-a3a076faf639/test-cases/5c9fd256-a475-4391-84ab-b2f4353963c1), ran on loopback port 3203 with CLI 0.13.0 and a 1,800-second limit.

Initial run `7424f831-8d3f-48f8-9eaf-fa2b665ace47` reported **passed**. Its 26 recorded steps support a saved-rig/reopen/control path, but the final assertion treated a disabled Open control as stale-source refusal. Open is also disabled during an active motion session. The source-edit action targeted the pose-toolbar region, and neither the planned source-change warning nor an absent editor was asserted. The full planned stale-source verification is therefore **inconclusive**. The artifact request returned `NOT_FOUND` / `no_failing_run` because no failure bundle exists for this reported pass; no alternative retrieval was attempted.

The same case was refined once with explicit cancellation/painting prerequisites, no active editor before Open, and a final warning-plus-inactive-editor assertion. Follow-up `986ee56b-0747-49f8-98f6-76f61c4eaf59` reported **passed** against the same compiled build. Its final pinned response contains 49 steps (indices through 50), including repeated brush/canvas/save actions, but only one assertion: the timeline has one frame. It does not assert the planned source-change warning, an absent editor or the restored pose/settings. This is again **inconclusive for the complete plan**, not an external qualification of stale-source safety. Its artifact request also returned `NOT_FOUND` / `no_failing_run`.

The verification skill's one-refinement/two-run limit is exhausted; no third run was started. The owned server was stopped after the runner closed its tunnel. A listener check found no listening ports from 3202 through 3205. Both reported service passes are preserved alongside their narrower assessed scope.

## Evidence and remaining scope

The [Phase 5 evidence manifest](evidence/2026-10-07-piximotion-phase5/manifest.json) preserves passing checks, initial lint/fixture/migration/timing failures, source/build fingerprints, three actual portable backups and sanitized external receipts/trails. Raw signed service-media URLs remain outside the documentation archive. Final source, build and archive hash checks found no mismatches; final documentation integrity and diff checks are recorded in the manifest.

Phase 5 is implemented and locally verified for this single-part subset. External full-plan verification remains inconclusive. Measured preview responsiveness, renderer/angle/alpha quality across artist sprites, source-rebinding tools, skeletons and multi-part evaluation remain open. This record does not approve a release or deploy the checkout.
