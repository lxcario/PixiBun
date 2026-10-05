# Deep audit repair — Phase 5

5 October 2026. Local, uncommitted work on top of Phases 1–4. Base Git revision `f18f4e47d299685d7fdf23de158ae082a883483d`, package `1.14.1`, Node `22.23.3`. Scope: original findings A12–A14. This record describes local verification; it does not attest published source, remote CI or a deployed release.

## A12: creation dates belong to the document

The studio now carries `projectCreatedAt` from document creation through hydration, metadata edits, autosave and synchronous/asynchronous portable backup. `updatedAt` continues to record snapshot preparation time. Imports retain their admitted date, including zero. New Drawing, gallery duplication, conflict copies and existing recovery-copy creation start fresh dates. Desktop Save As changes the filename of the same document and preserves its date. Failed hydration restores the prior date with the prior buffers.

The original audit understated the legacy repair boundary: database rows retained their creation date even when the old serializers replaced the embedded JSON date. Admission restores a valid surviving row date, and the next save makes the row and JSON agree. Invalid row dates fall back to the admitted document date. Files whose original creation date was already overwritten and have no surviving database row cannot recover an unknown original. These dates are descriptive metadata, not trusted provenance or monotonic sequence numbers. Format v3 and database schema v5 remain unchanged.

Owners: [viewport state](../../src/stores/slices/createViewportSlice.ts), [document lifecycle](../../src/stores/slices/createHistorySlice.ts), [serialization/rollback](../../src/lib/project/serialize.ts), [stored admission](../../src/lib/recovery/projectAdmission.ts), [database writes](../../src/lib/storage/db.ts), [conflict copies](../../src/hooks/studio/useStudioAutosave.ts). The [storage contract](../contracts/storage.md) records the operating policy.

## A13: clipboard feedback reflects completion

Both invite and guest-answer copies await the clipboard write promise. Pending writes disable Copy and show Copying; success appears only after resolution. Rejection or an unavailable API focuses and selects the complete read-only code, with a manual-copy message. Retry clears the failure. Code, tab and connection changes, closing and unmounting invalidate late responses; feedback timers are cleaned up. Success expires after two seconds.

[CoDrawModal](../../src/components/modals/CoDrawModal.tsx) owns this behavior. Component tests cover pending/success, denied/unavailable access, retry, both token types, stale responses across tabs/reopen and timer cleanup. Compiled checks use a real LAN invite but controlled Clipboard API outcomes: they verify application behavior, without claiming native OS permission/paste interoperability or a peer network study.

The promise resolves after the write completes, and permission refusal can reject with `NotAllowedError`. That primary-source behavior determines when success is appropriate. [MDN Clipboard writeText](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText).

## A14: stale CI candidates cannot proceed through this workflow

The [production workflow](../../.github/workflows/deploy.yml) retains successful trusted-main-push admission, exact triggering-SHA checkout and read-only repository permissions. Production jobs share a concurrency group with queued waiting jobs and no cancellation of an active deployment. Before Vercel preparation, the [candidate checker](../../scripts/checkDeploymentCandidate.mjs) reads main's current Git reference and requires an exact SHA match. It repeats the check after building, immediately before deploying. Stale or missing outputs suppress Vercel steps; network/HTTP/malformed reference failures fail closed. The API request has a ten-second timeout and refuses redirects.

GitHub queue ordering follows when work begins waiting, which can differ from commit/dispatch order. Its current `queue: max` option admits up to 100 waiting jobs; this avoids an older completion replacing a newer pending job under the single-pending default. Arrivals beyond that platform limit can be cancelled. Neither queue position nor CI completion time determines eligibility. [GitHub concurrency](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency).

Reading a Git reference requires only repository Contents read permission; the helper uses the documented singular-reference endpoint and API version `2026-03-10`. [GitHub Get a reference](https://docs.github.com/en/rest/git/refs#get-a-reference).

If main moves while a build runs, the recheck suppresses its deployment. A new main commit with pending/failed CI leaves the existing production release in place. The final GitHub read and Vercel command are separate operations, so this is not an atomic cross-platform promotion lock. Runner timeout can also leave remote side effects outside the concurrency lifetime. Independent Git integration/manual deployments require operator verification; Vercel's Git integration can initiate its own deployments. No host configuration was changed or remotely qualified. [Vercel Git deployments](https://vercel.com/docs/git), [operator contract](../guides/deployment.md).

## Verification and evidence

The focused lifecycle/clipboard/deployment/save suites passed **74 tests /five suites**. The full five-stage documentation/type/lint/unit/build gate passed **1,845 tests /180 suites** in **65.33 seconds**, build `G1jf-DxmxdUyp5kMz1qoh`. The subsequent queue policy change affects only the workflow and its regression expectation; the final deployment suite passed **31/31** after that change. Application build inputs did not change.

The final compiled run passed **29 cases with one capability skip** in **3.0 minutes**, one worker and zero retries, across Chromium/Firefox/WebKit on that build. Six date round trips passed, including zero and an older timestamp in all three browsers. Their first/reopened/original backups retained the exact date; duplicates received a fresh date and retained the encoded layer artwork. Clipboard denial/success/reopen checks passed in Chromium/Firefox. Windows WebKit lacks WebRTC, so it could not generate a real invite and that scenario was explicitly skipped; component tests cover its application-state logic. All 21 previous Phase 1/2 artwork/save regressions passed again.

Closing evidence and six timestamp measurements are recorded in the [Phase 5 evidence folder](evidence/2026-10-05-audit-phase5/). Runner inventory enumerates **1,845 unit tests /180 suites**, **193 editor cases /45 files**, **207 compiled cases /19 files**; enumeration is not execution of all browser cases. This phase did not rerun the complete editor/compiled inventory or qualify a physical system clipboard.

Initial diagnostics remain distinct: one focused fixture incorrectly treated the duplicate API's returned record as an ID (47 passes /one failure); its corrected scoped run passed. Typechecking caught unsupported `exact` options copied into Testing Library queries; anchored names replaced them. The initial compiled run passed three existing Chromium artwork cases, then its first new backup scenario timed out awaiting a download because the native file picker had not been disabled. The run was interrupted; its log, screenshot, context and trace are retained. The download fixture was corrected without changing application behavior or extending its timeout.

## External verification boundary

The repository's TestSprite verification skill was applied. Its existing 17-case inventory was read, including the existing native-backup case `fb41a04b-2a0c-4340-9cd6-dea694f0c348`. A [backup-plan extension](evidence/2026-10-05-audit-phase5/testsprite-backup-extension.plan.json) retains its existing frame/hold checks and adds saved-reload and duplicate creation-date checks. One new [clipboard plan](evidence/2026-10-05-audit-phase5/testsprite-clipboard.plan.json) covers the missing asynchronous/failure behavior. These are review drafts; no external update, case creation, local tunnel or test run has occurred. Offline plan lint is not external execution. The existing backup case's fetched historical status was failed; this phase does not relabel it.

The skill requires “Show the user the drafted plan / code before creating it” and “One short confirmation”; external verification remains awaiting that review. All five planned repair phases have implementations, while external qualification and production operator checks remain separate.
