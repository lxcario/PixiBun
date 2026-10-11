# PixiMotion foundation Phase 4: source identity and stale-artwork refusal

Maintenance update — 11 October 2026: see the [11 October validation handoff](2026-10-11-validation-handoff.md) for the current engineering milestone. Earlier measurements, failures and decisions below retain their original revision and scope.

Date: 7 October 2026. Scope: the local, uncommitted working tree, including an existing PixiMotion Slice 1 and RotSprite v2 implementation discovered at the start of this phase. This phase extends that workflow; the earlier [Phases 2–3 evidence](2026-10-06-piximotion-foundation-phases2-3.md) retains its original renderer, source and results.

## Behavior and ownership

Parts now have independent IDs and explicit captured project/frame/layer IDs, canvas dimensions and registry generation/content revision. Frame/layer names and array positions do not define identity. Rename/reorder survive; duplication never implicitly retargets a part, and recapturing copied pixels creates a fresh ID. Settings updates cannot overwrite source identity. The part remains an in-memory session; persistent rig storage and source-rebinding workflows are Phase 5.

The source resolver refuses changed, replaced, missing, deleted, resized or cross-project artwork without creating an empty buffer or choosing the active frame as a fallback. Locked sources refuse bake. The inspector displays the reason and disables baking; the viewport hides stale derived pixels. A valid preview replaces the displayed original composite, including transparent vacated pixels.

Bake now stages all replacement canvases before publishing. The prior bake wrote Pose 0 directly to a live source canvas before cloning remaining frames. The prior injected clone-failure test used an identity first pose, so its unchanged-byte assertion did not exercise a changed source raster. The revised test injects failure after replacement registry publication with a translated first pose; separate coverage injects a third staging-canvas failure. Both require the original source, metadata, registry and history to survive.

Final source and workspace validation precedes publication. One structural history entry records the actual pre-bake active frame/layer. Success consumes the temporary part, chooses an existing destination layer, shifts later clip ranges while preserving their members, and extends source-containing clips. Copied research references within the duplicated frame receive its new frame/layer IDs. This phase does not invent transformed palette-region bindings.

Transformed target rasters detach their old effect/research provenance, which no longer describes the edited pixels. Unchanged copied layers retain independently cloned provenance. Source versioning depends on registered pixel edits touching the buffer revision; arbitrary unregistered canvas writes are outside the contract.

The compiled keyboard diagnostic on the pre-keyboard build demonstrated that Enter on the focused Cancel button baked extra frames. The repaired gizmo uses the established workspace input guards and leaves Tab to native focus navigation. Older selection handlers yield for the whole motion session, so canvas arrows cannot simultaneously lift/edit the source selection. Focused checks cover buttons, dialogs, composition, modifiers, pose nudging and selection Delete/Cut refusal.

## Academic basis and limits

H. T. Kung and John T. Robinson, *On Optimistic Methods for Concurrency Control*, ACM Transactions on Database Systems 6(2), 213–226 (1981), DOI [10.1145/319566.319567](https://dl.acm.org/doi/10.1145/319566.319567); [author-hosted paper](https://www.eecs.harvard.edu/~htk/publication/1981-tods-kung-robinson.pdf), especially Section 1's read/validation/write phases and Section 2's private copies. The paper motivates preparing isolated copies and validating before making them globally visible. Applying that pattern to PixiBun's synchronous editor is an engineering adaptation, not a claim that this implementation proves database serializability or implements the paper's complete protocol. Stable cel IDs and generation/revision checks are project design decisions tested here.

The [earlier primary pixel-art and perception sources](2026-10-06-piximotion-foundation-phases2-3.md#academic-basis) remain background. This phase does not establish arbitrary-angle feature preservation, artist preference, normal-vector correctness or a final automatic-motion quality score. The existing RotSprite implementation is preserved apart from an explicit `PixelBuffer` annotation needed by the current TypeScript checker. Old measured detail-loss rates must not be attributed to the changed renderer without a new run.

Memory checks reserve estimated bake staging and preflight transform scratch; they exclude JS object overhead, browser/GPU surfaces and unregistered caches. Rendering remains synchronous. Persistent rig serialization/migrations, broader async evaluation and quality qualification remain separate phases.

## Execution

Supported runtime: Node 22.23.3. Initial focused verification passed 48 tests across the existing Slice 1 and new binding suite; the subsequent keyboard follow-up passed 63 tests across three suites before its final Delete/Cut regression was added. Initial sandbox execution failed before test collection with a Windows temporary-cache rename `EPERM`; the supported elevated local rerun executed the tests. The initial typecheck found two test union-narrowing mistakes and one existing RotSprite typed-array inference error; the scoped corrections preserve renderer behavior.

The initial full gate stopped at two unused imports in the existing unified rotation test. Its host-specific PNG dependency has been replaced with the same extracted 44-pixel outline in a repository JSON fixture; the original test is retained as a local diagnostic and its rotation/parity assertions are preserved.

The first passing five-stage gate/build executed 1,983 tests across 193 suites; it included a single diagnostic console warning, subsequently removed. Its compiled build ID was `ZuCT4Ntj7fhv8uzukghKx`. A later final-regression run overlapped compilation and failed two unchanged timing assertions: palette LUT average 4.996 ms against 2 ms, and micro-sprite rotation average 12.439 ms against 10 ms. The subsequent run after compilation passed all 1,985 tests with default workers and unchanged thresholds. This sequence does not establish causal attribution or loaded-machine performance guarantees.

Initial compiled-browser diagnostics are retained: one run omitted the Tools tab; its follow-up dragged inside a retained selection during recapture and unintentionally moved floating pixels; a third expected Redo to select the last pose after the test had navigated elsewhere before Undo. The fixtures now open Tools, clear prior selection, preserve exact pixel assertions and assert the editor's actual navigation policy. The additional pre-keyboard-build Cancel/Enter failure is a product diagnostic, separate from those fixture errors.

The final four-stage gate passed documentation integrity, typecheck, lint with zero warnings, and **1,988 tests across 193 suites**, using default unit workers and unchanged timing thresholds. A separate fresh production build passed on the same final source, with build ID `ZtBDXPcbNbc2sRkwaYkUF`.

The complete new compiled motion suite passed **6/6** across Chromium, Firefox and WebKit, one worker and zero retries. It verifies exact original/intermediate/final pixel arrays, stale-source refusal, native keyboard Cancel, one-owner pose nudging, copied-cel identity, one bake Undo/Redo and saved-cel reload. The related existing dialog/input/floating-selection suite passed **9/9** on that same final build, also one worker and zero retries; these checks do not certify the entire compiled-browser suite, physical Safari or artist acceptance.

The final source checkpoint contains 677 source/test/script/config inputs at Git HEAD `dcf9f5c303cdbaa6a533e3315de947c261c1e3ac`, with an uncommitted working tree. All 677 hashes matched after the final motion run. The first checkpoint also included the derived `tsconfig.tsbuildinfo` cache; the final manifest excludes it. Five intentional source/test changes between checkpoints implement keyboard ownership and its regressions. Publication/deployment remain separate.

## External TestSprite verification

The user explicitly approved one new motion case after reviewing its drafted plan. Case `e7c723bb-ff61-4c64-b8bb-e12d78251686`, [PixiMotion refuses a stale source and a fresh capture bakes as one reversible edit](https://www.testsprite.com/dashboard-v3/o/8da317b3-5f3e-506d-b110-a2ae9c2af7b8/projects/ad7cf58e-3c0f-41d6-96a8-a3a076faf639/test-cases/e7c723bb-ff61-4c64-b8bb-e12d78251686), ran through a temporary loopback tunnel.

Initial run `86bb05d8-2d45-48fd-adfe-91825a5ad73d` reported **failed** on the pre-keyboard build. Its 16 recorded steps include unrelated rotation clicks and three failed assertions, with no confirmed part capture or bake action. This is **inconclusive for motion behavior**: the runner did not establish the prerequisites it later judged. The failure bundle was withheld with `NOT_FOUND` / `environment_changed`; no alternate attempt to retrieve withheld script/environment contents was made.

The same case was refined with explicit painted-mark, marquee, Tools-tab and successful motion-capture prerequisites. Follow-up `994f1f79-a1c2-4cc1-a170-6bdef58fd1a5` ran against the final compiled build, timed out after 600 seconds and was automatically **cancelled** when its tunnel closed. The service subsequently confirmed cancellation. Its 41 recorded steps are actions, including capture, Bake, Undo and Redo; no completed assertion establishes the planned stale-source and exact-pixel outcomes. This follow-up is **inconclusive**, not a passing external qualification. No failure bundle was produced (`NOT_FOUND` / `cancelled_no_artifacts`). The runner warns that cancellation may still be billed; no refund receipt was returned, so a refund is not claimed.

The two-attempt refinement limit in the verification skill is exhausted. No third run was started. Both owned local servers were stopped; a final listener check found no listening ports from 3194 through 3201. Local browser evidence and service verdicts remain distinct. No Git publication, deployment or production release is part of this phase.

## Preserved evidence and next phase

The [Phase 4 evidence manifest](evidence/2026-10-07-piximotion-phase4/manifest.json) records source/build hashes, passing checks, initial failures, browser diagnostic traces and sanitized external receipts. Raw signed service-media URLs and the original host-specific fixture path remain outside this documentation archive. Copy hashes are checked against the retained local artifacts; hashes establish file identity, not product correctness.

Phase 4 is implemented and locally verified; full external verification remains inconclusive. Phase 5 is persistent parts and rigs: versioned project storage, validation/migration and safe restoration or explicit refusal of source bindings after reopen. The temporary part contract does not yet promise persistence or automatic source rebinding.
