# PixiMotion foundation repairs — Phase 1

Date: 6 October 2026. Local checkout based on `dcf9f5c303cdbaa6a533e3315de947c261c1e3ac`; changes are uncommitted. This record follows the [readiness audit](2026-10-06-pixibun-piximotion-readiness.md). Its original failure-injection probes/logs are preserved; this is a separate repair record.

## Implemented scope

Structural restoration, structural Undo/Redo and generated research output now use a synchronous workspace commit boundary. Replacement rasters are staged before publication. Preparation/updater failure restores document state, raster ownership and history stacks, redo branch, accounting and replay baseline. Store observers are delayed until commit. A post-commit observer failure is explicitly contained and reported; it does not roll back the committed document or stop later observers. This scoped policy preserves existing ordinary-store and project-hydration exception behavior.

History rollback copies bounded stack arrays and baseline metadata, sharing immutable snapshot pixels. Its retained prior history/baseline has a conservative temporary memory reservation. Existing memory limits are unchanged. Research Apply always disposes its consumed preview, including stale/refused/staging-failure paths; the inspector clears retained references on either result.

The boundary requires synchronous work and staged replacement canvases. It does not provide rollback for arbitrary in-place drawing, asynchronous callbacks, persistence side effects or every structural command. Those remain explicit caller responsibilities. Motion data, source bindings and motion baking are not implemented by this phase.

## Verification

Eleven new regression cases cover committed-state coherence and later-observer delivery under observer faults, one generated notification including Undo, real updater failure with redo/accounting rollback, raster staging failure, generated publication failure, stale-preview disposal, eviction/baseline rollback, failed structural Undo/Redo followed by successful retries, unchanged ordinary-store exception semantics, reentrant publication coalescing and removal of queued subscriptions.

The initial targeted six-suite run passed **98 tests**, on Node 22.23.3. Earlier new-test fixture failures are retained: the first captured its comparison state before setting up existing history; the second used `undo()` without an inverse snapshot and incorrectly expected a redo entry. The corrected fixture creates a real redo branch and does not relax application assertions. The initial five-stage gate/build passed **1,871 tests /182 suites**, followed by **18 compiled checks across Chromium/Firefox/WebKit** against build `-NVbPS7cuTiKfKTyBSXtt`. Reentrant-notification follow-up added two passing cases; the final combined foundation gate/build passed **1,894 tests /184 suites** against build `DvYUYwAyUodxjOOcHkdoP`. Final compiled and service follow-up results are recorded with Phases 2–3.

Initial approved TestSprite execution: the saved-artwork case was **blocked**, with an explicit inability to perform coordinate-specific drawing. Its failure bundle was withheld by the service with `environment_changed`; no script was retrieved. The frame-timing case was **reported passed**, but its final trail contains only restoration/editability and 240/700 ms timing assertions, without the planned exact-artwork/independent Undo checks. Treat that reported pass as **inconclusive for the full plan**. These are service limitations, not a locally reproduced application regression. Both runs reached terminal status and the temporary connection closed. They exercised the initial build, not the later reentrant follow-up or Phase 2 code.

The initial full gate stopped at a stale generated test inventory after adding tests. Inventory was regenerated. TestSprite catalog inspection was initially rejected by automatic approval review; the user subsequently explicitly authorized existing-case access and a temporary local connection. Catalog and relevant case inspection then succeeded. No new service case, publication or deployment has been authorized here.

## Following phases

1. Atomic publication and failure ownership — this repair.
2. Background work bound to the initiating project/source, with cancellation and lifecycle cleanup.
3. Reproducible pixel-quality fixtures and measured workload budgets for an isolated renderer.
4. Stable part IDs with explicit authored-source bindings.
5. Versioned persistent motion data and compact pose-edit history across storage/recovery paths.
6. A preflighted reversible multi-frame bake preserving source artwork and authored repairs.

Phases 4–6 establish the first integrated PixiMotion workflow; passing Phase 1 alone is not a readiness or output-quality claim for that engine.
