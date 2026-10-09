# L09 validation repeatability — 9 October 2026

The local milestone is supported by two passing full gates and a complete production-browser verdict: **338 passed /7 capability skips /zero failures**, Chromium, Firefox and WebKit, one worker and zero retries. The [earlier import repair and independent replay](2026-10-09-import-artwork-safety.md) retain their original passing and failing outcomes. This record does not certify every source file or approve a release.

## Timing policy and baseline

RotSprite speed now runs in `scripts/benchmarkRotSprite.mjs`, outside Vitest and V8 coverage. Its original 23×12 hollow outline and 50 angles remain unchanged. Each independent Node 22 process warms all angles for five batches, then records 15 serial batches. The metric is milliseconds per rotation averaged within each 50-call batch; the limit remains **p90 <10 ms**. Baselines never recalibrate that limit. The algorithm is unchanged. Contour, ring-connectivity and fractional-pivot correctness remains in coverage, with existing coverage requirements unchanged.

| Invocation | Median ms | P90 ms | Limit ms |
| --- | ---: | ---: | ---: |
| Baseline 1 | 2.932902 | 3.166656 | 10 |
| Baseline 2 | 2.560634 | 3.124944 | 10 |
| Baseline 3 | 2.303532 | 3.227008 | 10 |
| Full gate 2 | 2.964974 | 3.319112 | 10 |
| Full gate 3 | 2.857062 | 3.171918 | 10 |

These are controlled Windows x64 host measurements on an Intel Core i5-12500H (16 logical CPUs), Node 22.23.3 and TypeScript 5.9.3, not device latency or arbitrary sprite-size guarantees. Other coarse unit timeouts remain execution bounds; this change separates the failing RotSprite speed assertion specifically. The independent instrumented failures at 11.55 ms and 10.63 ms remain failed evidence.

## Gates and frozen production build

Both six-stage gates pass documentation, strict types, lint, **2,122 correctness tests /201 suites with coverage**, the separate benchmark and production compilation. Gate 2 took 296.50 seconds; gate 3 took 235.75 seconds. Gate 3 coverage is 69.18% statements, 62.39% branches, 61.49% functions and 70.46% lines. Coverage still excludes `src/types/**`, including its runtime format constants.

The first gate failed with 2,120 passing tests and two failing existing service-worker fixtures that still passed a cache name to the changed helper. Updating those fixtures to pass their owned Cache object restored their LRU/shell checks; 24 focused tests passed before the two full gates. The failed invocation remains preserved.

Production build **`vRByH4JDPWpOHZ6RE4Czj`**, cache `pixibun-l09-candidate-20261009`, ran all **345 cases /31 files** in 40.8 minutes. Its 694 runtime/validation inputs hash to `84b387ab1f6da21016d77aea952a4ff4a7ae7f86008d3611d6d52610535a53cd`; its 259 compiled server/static/BUILD_ID files hash to `f16646639214a1b16cd1938aa429d98876dc51eaffab06353579a6509b8be36f`. Every frozen file matched after the run. No production expectation or application source changed during it. The seven skips are browser capability cases, not passes. All 21 import-safety cases and six worker-transition cases pass in this complete run.

## Retained Firefox failure and worker ownership

The original full-run trace shows the old and new cache names persisting throughout the ten-second cleanup assertion. It does not record enough ordering to prove which write recreated the old bucket. The source nevertheless allowed a delayed response to reopen its old cache by name after the new worker deleted it. Three emitted-worker VM cases reproduced this mechanism for navigation, static and default requests before the fix.

Responses now retain their original Cache object for writes and trimming; queued warming captures ownership before waiting. A deleted Cache handle can receive a late write without recreating its named bucket. Static background work also registers its lifetime while the response remains pending. The three deterministic regressions and the existing route/lifecycle tests pass. The complete native suite passes both ordinary waiting activation and deliberately delayed old writes in all three engines. This supports the repaired mechanism and this broad run; it does not establish universal lifecycle stability from one trace.

## Actual application update and rollback

The separate release fixture uses the preserved compatible build **`kbrD0Z2xKkmvlgI2y3Dd7`** and the frozen candidate on one local origin. The older 259 compiled files still match their original manifest `5ce717ef19a90897b4c14459f6d48100de11f803b95689454fce92afc0b41a30`.

Final result: **five passes /one measured capability skip**, one worker, zero retries. Chromium and Firefox pass both native ArrayBuffer and legacy Blob fixtures. WebKit passes the current ArrayBuffer path. The journey checks a refused shell installation, saved and dirty tabs, waiting instructions without forced refresh, activation after all tabs close, artwork identity, editable rig/ramp metadata, native pixel bytes, candidate save-back, rollback editing and an offline reopen. The local host retains both builds' static assets; production hosting skew protection remains separate.

The first run recorded two passes and four failures. Three final assertions expected `updatedAt` to remain byte-identical even though the existing visibility/pagehide handler saves again on close. The refined fixture requires a nondecreasing timestamp and still compares every other document field and every native PNG byte. Its second run passed five cases and failed legacy-Blob preparation in Windows WebKit. The diagnostic captured `UnknownError: Error preparing Blob/File data to be stored in object store`, matching the [previously recorded Windows WebKit storage limitation](phase-implementation-status.md). The final guard skips only that measured error on Windows WebKit, after verifying atomic refusal leaves the prior document, stored bytes and visible artwork intact. Legacy-Blob rollback on Safari remains unqualified. The initial failures, second-run failure and diagnostic trace remain preserved.

Only the new release fixture was refined after the production run. Strict types and scoped lint passed after the refinements; the application and complete production-suite inputs remain unchanged. The final 694-input fingerprint is `daa72a965265f7b418f04ed9e4c77494c3235ca624ae46118e57bbe25445a49a`; the original frozen manifest remains preserved separately.

## Development, external verification and remote custody

The configured Node 22 Turbopack process started successfully with its existing development cache; its first measured Studio response was HTTP 200 in 1.06 seconds. The complete development suite passes **196/196**, zero skips/failures, one worker and zero retries, in 12.5 minutes. A second fresh process with the old `.next/dev` preserved aside reported ready in 458 ms; its first observed Studio request compiled and returned in 4.4 seconds. The later explicit HTTP probe took 180 ms after that request had already warmed the route. A fresh-browser drawing/save/native-reload smoke passed on this process too. This separates cache-assisted suite execution from empty-cache startup rather than labeling both cold. The earlier startup probe that exceeded 30 seconds remains preserved. Application CSS discovery is now explicitly scoped to `src`, and ignored local audit/copy/evidence files cannot supply CSS classes; [Tailwind's source-base guidance](https://tailwindcss.com/docs/detecting-classes-in-source-files) documents the syntax. No Webpack fallback was used in these runs.

Future GitHub CI logs, coverage and browser evidence use revision/run/attempt artifact names, file hash indexes and explicit 90-day retention, including failed runs. The browser workflow uses one worker and zero retries and runs production checks even if development checks fail, once its production build succeeds. [GitHub's retention policy](https://docs.github.com/en/organizations/managing-organization-settings/configuring-the-retention-period-for-github-actions-artifacts-and-logs-in-your-organization) caps public-repository artifact retention at 90 days. Selected candidate results and failed traces will also be preserved in a separate draft verification archive in the existing repository, with upload/retrieval hashes; it stores evidence rather than approving an application release. Index generation is tested locally; candidate CI upload, archive upload, retrieval and digest verification are pending at this source checkpoint. Historical tracked evidence has not been removed.

The existing base-revision remote CI failed documentation at the six ignored-file links, leaving browser and Lighthouse jobs skipped. That failed remote run is preserved independently of local repair checks. Candidate remote CI and the new TestSprite layout run remain pending here; the original blocked/inconclusive TestSprite artwork run is unchanged.

## Evidence and remaining release limits

Raw logs, structured results, frozen manifests and retained native failure bundles are under local-only `artifacts/l09-repeatability-2026-10-09/`. Failed runs are separate from successful reruns. The [local verification receipt](evidence/2026-10-09-validation-repeatability/verification.json) records 38 evidence hashes and the exact local scope without embedding signed recording links or credentials. Remote CI, external and archive-custody receipts are subsequent evidence, not implied by this local checkpoint. The final documentation-only check first failed on a sandbox temporary-cache rename restriction; its native workspace-cache retry is recorded separately.

Physical pen/touch devices, manual screen-reader observations, low-memory/long-session and real two-machine/network modes, actual production-host update/rollback and final release approval remain separate. Automated browser/Axe/keyboard checks qualify their executed states and retain the documented compact color-dock target-size tradeoff. No physical-device or WCAG-conformance result is inferred from them.
