# Phase 6: recovery archive admission

Completed locally on 2 October 2026 after the five original repair phases. Based on `1b13922cdd264d43d97b8b4fae16fca2b3ac0770` plus the uncommitted phase 5 checkout. This extension addresses recovery payload loading, physical/logical record conversion and visible backup failure feedback; it is separate from the older phase 6 artist study and does not close participant, physical-device or release qualification.

## Change and reasoning

Untouched archive preparation previously loaded up to 10,001 matching records before rejecting a source over the 10,000-record inspection ceiling. It now counts the same compound index range within the existing read-only transaction, skips payload materialization on overflow and preserves the admitted query limit, error precedence and original records. Other diagnosis/plan paths and all format/resource ceilings remain unchanged. Admitted sources incur an extra index request; this is not a universal speedup.

[Dexie's count documentation](https://dexie.org/docs/Collection/Collection.count()) describes native index counting for simple key ranges. The installed Dexie implementation caps the returned number after its native count; it does not limit the native count's scan to 10,001 entries. The [IndexedDB transaction contract](https://www.w3.org/TR/IndexedDB-2/#transaction-scheduling) keeps reads consistent within the read-only transaction. These support the design; they do not establish this application's latency or total memory on every device.

Visual review of the first passing archive workflow exposed a separate defect: the ArrayBuffer read hook reconstructed a Blob but retained physical `blobType` on the logical record. Recovery's closed schema then refused an otherwise ordinary damaged source for an unexpected field. The hook now removes that one physical MIME field during ArrayBuffer conversion; it preserves unknown fields for validation and does not rewrite stored records. Legacy Blob reads remain supported. Regressions exercise both representations through plan preparation and separate-copy persistence, compare surviving bytes and retain refusal of unrelated unknown fields.

The failure toast was also behind the recovery dialog's blurred backdrop. Failed backup attempts now show a source-specific alert inside the dialog, reset on a new attempt/open and preserve the existing repair state and original records. The browser check requires the alert to be in the viewport with nonzero ancestor opacity. This local warning fix is not a screen-reader or manual accessibility qualification.

Nine source/test/helper files differ from the phase 5 snapshot: three application files, three existing unit suites, a shared browser workflow and two browser suite entries. The diagnostic timing probe is preserved outside the discoverable test inventory. [Evidence index](evidence/2026-10-02-feature-repairs-phase6/README.md).

## Measurement and retained diagnostics

A temporary diagnostic used the original real 10,001-record Blob fixture with fake IndexedDB. Before the change it measured approximately 34 ms construction, 706 ms insertion, 45 ms count, 170 ms payload enumeration and 158 ms archive preparation. A separate post-change observation measured approximately 34/728/50/173/44 ms respectively. These are single local diagnostic observations, not a hardware benchmark, distribution, browser peak-memory result or proof of the cause of phase 5's default-worker timeouts. Most fixture time was insertion; no fixture count, timeout or assertion was reduced to secure a pass.

The first browser invocation failed collection because the new shared function was passed directly instead of destructuring Playwright fixtures. The next sandbox invocation could not launch Chromium. After local native launch, both initial fixtures failed to open recovery: malformed/unsafe startup admission follows the blocked-workspace path. The corrected tests start with valid project metadata and three damaged raster records, reach the real recovery dialog, then grow the overflow source after diagnosis. The initial failures, traces and contexts remain separate from follow-ups. A first gate stopped at new test TypeScript errors; the next source snapshot includes those test-only type corrections. A Python ZIP oracle initially expected `manifest.json`; the actual recovery format uses `recovery-manifest.json`. The corrected oracle passed against the same original downloaded bytes. The intermediate full gate passed before this test-oracle filename correction; final checks use the subsequently frozen source.

Two intermediate full gates passed with 1,572 tests before the physical-field defect was found. The first broader Chromium run passed 14 cases, but did not assert the intended deletion-consent state: its screenshot revealed `Unexpected own property "blobType"`. A new autosave/read regression failed before the conversion fix. The strengthened browser fixture now requires the deletion-consent state and absence of that schema refusal. An added commit assertion first used the wrong success label; the real result was `persisted-success`, corrected with surviving-byte checks. These diagnostic failures and the earlier passing run remain distinct from final source/results.

## Verification

The application gate/build passed all five stages with **1,575 tests / 159 suites** under default Vitest worker settings and unchanged unit-test timeouts, in **147.21 seconds**. The related Chromium recovery suite passed **14 cases in 59.4 seconds**, with one worker and zero retries. It covers startup, source custody, recovery-copy UI and existing transaction-liveness cases; the latter use a test-only bundle of genuine recovery source. The earlier two-case Chromium run passed before ZIP byte assertions were added and is not relabeled as this final application validation.

Compiled verification initially recorded **five passes / one WebKit setup timeout** on port 3114. The same verdict recurred with 250-record write batches on port 3115. A named WebKit diagnostic on port 3116 reached 3,503 records at the 60-second deadline: writes were progressing, and the backup action had not been reached. It does not establish a failed archive refusal or an application deadlock. Batching alone did not close it.

The final fixture retains all **10,001 native ArrayBuffer records**. Only the new compiled WebKit overflow case receives a **240-second overall budget**, while a separate **15-second test step** bounds the actual backup action, visible refusal, request counts, no-download and source-preservation checks. Existing unit-test timeouts and other browser cases retain their limits. Fixture batching, optional diagnostic logs and this new case's explicit budget were added after the passing application gate/build; application code has not changed since that build. Final fixture static checks and compiled results are recorded separately below. This is a documented setup allowance, not an unchanged-default-timeout verdict or an end-to-end latency benchmark.

| Final check | Actual result and scope |
| --- | --- |
| Compiled archive cases | **6 passed (3.1m)** across Chromium/Firefox/WebKit on owned port 3117, one worker, zero retries; WebKit setup allowance and separate action cap as described above |
| Final fixture Chromium follow-up | **2 passed (13.3s)** after the fixture/budget changes; not added to the earlier 14 as distinct workflows |
| Independent ZIP validation | **4 actual downloads passed** Python `zipfile` CRC, original metadata and all three raw raster-byte comparisons |
| Final fixture type/lint | Both passed; the initial diagnostic console levels produced five lint warnings, corrected to the approved warning method and rechecked clean |
| Integrity | **542 frozen source/test/config files**, **97 tracked PNGs**, **193 files in six prior sealed evidence sets** and **nine prior capture checkpoints** verified; current capture hashes recorded separately |

The five test-only diagnostic console levels changed from info/log to the approved warn method after browser execution; assertions, counts, payload bytes, budgets and application code were unchanged. Both snapshots and lint outputs remain. [Exact commands and sequence](evidence/2026-10-02-feature-repairs-phase6/run.json), [logs and diagnostics](evidence/2026-10-02-feature-repairs-phase6/README.md). Full editor/production inventories were not rerun as full suites in this phase; these are scoped browser results. Final Markdown verification covers local destinations and selected contracts, not every narrative sentence.

## Current guide illustrations

Two [reviewed compiled Chromium captures](../assets/screenshots/2026-10-02-feature-repairs-phase6/run.json) show the actual deletion-consent state and readable refusal. They use isolated damaged fixtures and do not show a completed recovered copy. Older current assessment embeds are replaced; prior capture/evidence bytes remain unchanged.

![Recovery dialog showing the readable oversized-backup warning above the unchanged deletion-consent controls.](../assets/screenshots/2026-10-02-feature-repairs-phase6/archive-overflow-refused.png)

![Recovery dialog showing the three damaged source records and the untouched-backup button.](../assets/screenshots/2026-10-02-feature-repairs-phase6/archive-source-preserved.png)

The current checks retain the full 10,001-record overflow fixture, assert zero reading-hook payload calls, preserve stored record count, exercise both storage representations at a small explicitly lowered boundary and preserve missing-project/invalid-JSON-type error precedence. The small-boundary cases restore the inspection ceiling in `finally`; they do not replace the real-ceiling overflow case.

Browser workflows use actual UI controls and native IndexedDB with physical ArrayBuffer fixtures. The overflow case changes the source after diagnosis, checks one compound-index count and zero intercepted `getAll`/`openCursor` payload requests during the export, no download and unchanged metadata/count/sample bytes. This is selected native-request instrumentation, alongside the unit reading-hook assertion and source review; it is not a complete browser-memory trace. The admitted case downloads the actual ZIP, independently reads its central directory and compares original metadata and all three raw raster payloads. Temporary browser contexts and malformed sample raster bytes do not represent real artist damage.

## Remaining limits

The archive still refuses oversized sources; this is a safer refusal, not an increase in capacity or a way to reconstruct corrupt images. Browser storage is not an off-device backup. Native index work, admitted peak allocations, low-memory/long-session hardware and physical-device behavior remain unqualified. No coverage, Lighthouse, participant study, external TestSprite upload/tunnel, engine consumer, deployment, commit or push is implied. Earlier phase 5 intermittent navigation/history/timeout diagnostics retain their own unresolved causal scope.
