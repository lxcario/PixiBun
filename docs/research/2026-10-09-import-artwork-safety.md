# Import artwork safety — 9 October 2026

Maintenance update — 11 October 2026: see the [11 October validation handoff](2026-10-11-validation-handoff.md) for the current engineering milestone. Earlier measurements, failures and decisions below retain their original revision and scope.

This local repair follows the independent partial audit at `ad957550f6656b82f5f35162c8eabc19a45a1473`. The original audit and its failed reproductions remain unchanged under the local `audit/` directory. This record does not certify every feature, a deployed release or the full compiled suite.

## Repair scope

| Finding | Change and acceptance boundary |
| --- | --- |
| C01 | Imports publish fresh raster ownership, immutable frames, dirty/edit revision and buffer revision in one workspace transaction. Native canaries check immediate pixels and autosaved reload without a manual Save or repaint helper. |
| H02 | Import constructs its prospective destinations directly rather than falling back to the active layer after a refused add action. Metadata, capacity, palette, memory and history failures preserve the prior workspace. |
| H03 | One structural snapshot covers original pixels, frame/layer metadata, optional palettes and original dimensions. Redo admission uses destination dimensions. Previously lazy affected layers receive explicit transparent original snapshots. |
| H04 | Six links to ignored files are now explicitly labeled local-only references. The documentation checker rejects existing local targets absent from the publishable file set, including ignored files; directories must contain publishable descendants. Local audit copies are outside current documentation/compiler inputs. |
| M05 | Each replaced layer receives a new transparent surface, so transparent input cannot retain old pixels. Native tests cover full-size and smaller inputs. |
| M06 | Replace refuses a locked active layer; sheet replacement refuses any locked existing layer, including frames it would delete. |
| M07 | Failed hydration restores the immutable original session, native-file association, raster registry and history transaction. Dirty state, selection/mask, revisions and Undo/Redo survive publication failure and even a second observer exception. |
| M08 | Mitigation: the byte-copy canvas fixture explicitly documents its limits. Native canaries cover transparency, refusal, locks, grouped history and persistence; arbitrary blending, transforms and scaling are not established by this mock. |
| L10 | Coverage includes application TypeScript/TSX sources outside `src/types/**`. Both gates and their CI callers enforce the existing coverage thresholds; default unit concurrency is two workers. The excluded directory also contains two runtime project-format constants. |

Native follow-up exposed two additional integration gaps. Undo on a previously lazy layer originally retained the imported buffer; explicit blank snapshots repair it. A synchronous post-resize render originally used stale callback dimensions and could crop the restored raster. The viewport now reads committed dimensions for imperative composites and layer lookup. A native resize/Undo/Redo/reload canary retains an original corner pixel.

## Original repair verification

| Final check | Executed result and scope |
| --- | --- |
| Full gate | All five stages passed in 142.89 seconds: clean-checkout documentation targets, strict types, warning-free lint, coverage/unit assertions and production build. The standard gate's four shared stages passed within this full invocation. |
| Units | **2,120 passes /201 suites**, two workers, with coverage. |
| Configured-source unit coverage | **69.18% statements, 62.41% branches, 61.49% functions, 70.47% lines**; original thresholds unchanged. Unexecuted workers/UI remain visible in the denominator; `src/types/**` is excluded. |
| Compiled browsers | **51 passes /zero skips /zero failures**, Chromium/Firefox/WebKit, one worker and zero retries. This comprises 21 new import canaries and 30 existing operation/import/backup safety checks; it is not the complete 342-case compiled inventory or the development editor suite. |
| External TestSprite | **Blocked service verdict; audited inconclusive** for the complete saved-artwork plan. Run-pinned steps show repeated canvas clicks without establishing the required stroke; failure-bundle retrieval was withheld by the service. |

Earlier diagnostics remain separate: the first sandboxed build stalled and was interrupted; an unrestricted build passed. Initial focused units required fixture corrections and passed on follow-up. A gate attempt caught a missing required description in a new history fixture; the next invocation was interrupted during follow-up source review before the final passing gate. The first 48-case compiled diagnostic recorded **42 passes /6 failures**, including the lazy-layer Undo defect, resize restoration and a WebKit green-channel rounding difference. It is retained as failed evidence; corrected expectations use a stable red primary, with exact RGBA assertions retained. Application and test changes followed that diagnostic, so it is not the final build's verdict.

The next browser attempt was interrupted after Firefox navigation/offline deadlines. Its trace recorded **52,644.849 ms** waiting for the initial load event; subsequent import, transparency and Undo/Redo assertions passed before the overall deadline. The three final browser fixtures wait for document parsing and explicit restored-canvas readiness rather than the global load event. Strict types and scoped lint were rerun for this test-only refinement. The application sources and compiled build remained unchanged. A fresh complete 51-case scoped run then passed; the interrupted/failed run remains failed evidence, including its unusually long offline timeout.

Local outputs are retained under ignored `artifacts/import-safety-2026-10-09/`; initial browser bundles are copied there before subsequent runs replace normal Playwright output. New bulky binary evidence is not added to Git. The final receipt indexes hashes and source/build identities without rewriting earlier evidence. The build ID is `kbrD0Z2xKkmvlgI2y3Dd7`. The 259-file compiled static/server/BUILD_ID manifest hashes to `5ce717ef19a90897b4c14459f6d48100de11f803b95689454fce92afc0b41a30`. The gate's 675-input manifest hashes to `9ced9437076d189be7ef10f00f713ec4c83c297026370969f59c9927fb86bb82`; the final fixture-refined input manifest hashes to `0cc27a66b00d4fabbfe6645acae27d57265708ad1d3fa94c2e73c9c205449f0b`. Only the three browser fixtures differ between these manifests; zero application inputs changed.

## Independent revalidation — 9 October 2026

The independent review at local-only `audit/repair-review-2026-10-09/REVIEW.md` supports the nine repairs within its reviewed scope and establishes no new blocking import defect. It independently reran the repair-authored native canaries, rather than authoring a new acceptance matrix. Its raw logs, result files, integrity records and manual ledger remain under that ignored review directory. The original repair receipt and all earlier results remain unchanged.

| Independent check | Result and boundary |
| --- | --- |
| Native import canaries | **21/21 passed**, zero failures/skips, Chromium/Firefox/WebKit, one worker and zero retries. Import publication, transparent replacement, lock/name refusal, grouped Undo/Redo and saved reload are supported in these cases. |
| Types and documentation | Strict typecheck passed without incremental writes; documentation/contracts passed **2,354 destinations /289 Markdown files** with current runner inventory. |
| Full coverage/unit replay | **2,119 passes /1 failure**, 200 passed suites /1 failed suite, 201 suites total. The sole failure was the unchanged RotSprite wall-clock assertion: **11.546456 ms against a 10 ms limit**. Import, persistence and documentation regressions passed within this run. |
| Isolated RotSprite comparison | Coverage enabled: three functional cases passed, timing failed at **10.626794 ms**. Without coverage: all four passed. This supports instrumentation/environment sensitivity, not an established root cause or a measured production-browser slowdown. |
| Identity and preservation | All **675 recorded inputs**, **259 compiled files** and **10 receipt-listed evidence hashes** matched. All **8,456 publishable candidate files** remained unchanged during the review. Identity checks do not establish behavior by themselves. |

The recorded original five-stage gate pass remains valid evidence of that invocation. **This independent coverage replay was not completely green**, and the uninstrumented isolated pass does not replace it. L09 remains open for controlled timing measurement as well as broad service-worker stability. The review did not repeat the full gate, all 51 earlier scoped cases, the complete compiled suite or the development editor suite. Its local browser server used a review-specific service-worker cache identity, so these import passes do not diagnose the original broad update failure. TestSprite remains blocked and inconclusive; no external rerun or full failure-bundle inspection occurred.

The review disclosed that shared dependencies briefly caused Vitest to create and remove temporary configuration modules in the existing dependency cache. Publishable files remained unchanged; later replay setup has tighter isolation. This limits a claim that every review filesystem write stayed under `audit/`. Complete browser-suite, configured Turbopack, device/network, remote CI and release qualification remain open. The independent report proposes separating warmed, controlled wall-clock measurement from coverage while retaining functional contour assertions; that measurement-policy repair has not been implemented by this documentation update.

## External saved-artwork check

TestSprite CLI 0.13.0 ran existing test `b99a9888-2ca0-4353-a3f7-05dbfec14f6d`, “Challenge: Reloaded artwork survives new edits, Undo, Redo and a second saved reload”, against the frozen compiled build on local port 3101. Run `be419d94-3c99-45d6-9658-1628c321ba1c` finished **blocked** (exit 1) at 11:31:24 UTC. Its 74 run-pinned steps contain 70 passed actions and four failed assertions. Repeated canvas-click/save/reload cycles and later Zoom Out/Fit attempts never established the planned upper-left stroke; the agent reported two persisted center-right pixels. The trace contains no completed Undo/Redo actions. The final assertion statuses also conflict with the agent's report that the canvas, saved status and project name were visible, so they do not establish four independent product failures.

Assessment: **inconclusive for the full plan**, with a canvas-placement/automation hypothesis rather than a demonstrated import or persistence regression. The follow-up target is precise canvas gesture placement and assertion recording; the available trace cannot distinguish automation coordinates from an application hit-testing defect. The independent native drawing, export-pixel, Undo/Redo and reload controls passed across all three browsers. No application fix was inferred solely from the external summary.

Failure-bundle retrieval was attempted once. The service returned “Resource not found” and withheld its stored script because the environment was edited or deleted after the run started and environment values could no longer be scrubbed. The run-pinned steps were retrieved successfully, but the full bundle/video was not inspected. The [TestSprite execution](https://www.testsprite.com/dashboard-v3/o/8da317b3-5f3e-506d-b110-a2ae9c2af7b8/projects/ad7cf58e-3c0f-41d6-96a8-a3a076faf639/execution/ce4a3e17-10d2-4634-8641-00bea49cb830) retains the service record. The temporary server was stopped and the tunnel list was empty after completion.

The [verification receipt](evidence/2026-10-09-import-artwork-safety/verification.json) records the source/build identities, final check results and hashes of local evidence. It excludes signed recording links and credentials. Bulky logs and browser bundles remain local-only; the receipt does not close the durable-storage finding.

## Remaining limits

L09 remains open: bounded unit concurrency did not prevent the independently reproduced coverage-instrumented RotSprite timing failure. The earlier full compiled Firefox service-worker failure is not diagnosed or reclassified by isolated/scoped passes; broad lifecycle stability and controlled device performance remain open. The configured development Turbopack startup issue is separate from production compilation. I11's durable artifact-storage/retention migration remains open; existing tracked evidence has not been removed. TestSprite's service verdict and actual assertions are assessed separately from native pixel tests. Full-source review, physical devices, accessibility/artist qualification, remote CI, publication and deployment remain separate.
