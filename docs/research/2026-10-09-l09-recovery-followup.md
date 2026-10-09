# L09 navigation recovery and validation follow-up — 9 October 2026

Candidate application repair: d4daddffc99326655126b7b06e57c1d809c1ff29. Validation and runner revision: 94bd345f023837d4beacc28f4b9699f4401ef95d. The latter changes no application source. Remote merge ee593d1fdf51e816bc960138e362e37c0e5d9bc6 has the same Git tree, 3f093aea6ef85a533cb95f17f75709728917e5e0.

## Executed results

- Local six-stage gate: passed 2,200 tests /202 suites, coverage requirements, separate performance limits and build. Normal pre-push five-stage gate passed independently.
- Remote six-stage gate on Node 22.14.0: passed 2,200 tests /202 suites. Coverage: 69.17% statements, 62.39% branches, 61.49% functions, 70.46% lines. RotSprite p90 1.317 ms, unchanged 10 ms limit; largest palette workload p90 0.295 ms, unchanged 16.66 ms limit. Automatic download compared all 379 indexed files and original index bytes successfully.
- Fresh local development: 196 passed, Node 22.23.3, configured Turbopack, one worker and zero retries, 14.7 minutes.
- Previous local production on build seIfI-0LjvWuIEI-YsVEL: 344 passed /7 capability skips /zero failures, all three engines, one worker and zero retries. All 259 compiled files matched afterward.
- Complete remote production: **347 passed /4 capability skips /zero failures**, Chromium/Firefox/WebKit, one worker and zero retries, 38.3 minutes. Remote development: **196 passed /zero skips /zero failures**, configured Turbopack, 15.9 minutes. Run [37977976693](https://github.com/lxcario/PixiBun/actions/runs/37977976693) passed every required job. Latest local replay: **344 passed /7 capability skips /zero failures**, all three engines, one worker and zero retries, 39.1 minutes. All 259 compiled files and 704 recorded inputs match afterward.
- Two actual compatible builds: five native update/rollback passes /one measured Windows WebKit legacy-Blob fixture refusal. The refused native transaction preserved original records; it does not qualify Safari legacy rollback.
- Raw Lighthouse: all six reports have zero label/name mismatches. Home has zero target findings; each Studio report still has seven small-target findings. Native large-control tests pass, but manual equivalence and accessibility qualification remain open.

## Navigation and validation policy

The emitted worker now fetches navigation independently of cache opening. Rejected/stalled cache opening cannot delay a healthy response, cache writes are optional, and failed offline reads produce a controlled 503. The early cache-object lease remains; background writes never reopen a retired cache name. Four new fault checks failed before repair and pass after repair. This verifies the modeled navigation recovery path; it does not certify unavailable CacheStorage for every static/default resource path.

RotSprite speed remains outside coverage. Nearest-neighbor and palette timers now run serially without instrumentation, preserving their original workloads and 16.66 ms frame /2 ms LUT limits. Five warmup and 15 measured batches use p90 batch means; individual-call and physical-device latency are separate. Three isolated local interaction baselines passed. Byte correctness and sentinel preservation stay under coverage. The nearest and palette workloads keep their original resolution/iteration inputs and limits; their expanded correctness cases account for the current unit inventory. The original 72 motion-placement comparisons now have independent default deadlines. The actual 10,001-record recovery fixture moved to a scoped setup hook; the refusal still has its default test deadline and checks no payload reads or mutation. Older coarse downsample/clustering/morph resource guards remain instrumented and are disclosed in the testing guide.

The first remote candidate gate failed an instrumented palette timer and two combined setup/case deadlines; its original log and artifact are retained. A later local gate failed my large typed-array assertion expansion at 5.43 seconds; an exact native buffer comparison retains every-byte checking without that assertion-library cost. That failed run is also retained.

## Native Linux WebKit diagnosis

Controlled run 37978027632 kept the same browser and all 259 compiled files. With avahi-daemon and libnss-mdns absent, three pairing cases failed, one unrelated case passed and one inverse-capability case skipped. Installing the resolver packages and starting Avahi yielded four passes /one inverse-capability skip /zero failures. All three formerly blocked cases connected and executed shared-artwork/reload or invalid-message preservation/no-ack assertions. Host ICE events progressed through checking and connected. Post-cleanup transports are closed, and guest reload clears some diagnostics; the retained bodies do not assert selected-pair stats after cleanup. No application change, fabricated candidate, increased timeout or capability reclassification was used. Real two-machine/network and Safari qualification remain separate.

The old Chromium trace records a native SIGSEGV during context setup before the layer-reordering body. New complete development checks include that setup and pass; the unsymbolized trace does not establish the native crash cause. Do not claim universal CI stability from this replay.

## Custody and limits

[Draft evidence archive 408253184](https://github.com/lxcario/PixiBun/releases/tag/untagged-e6d49496f44d183d4e8e) stores this candidate separately from an application release. Build asset 625912700, SHA-256 e6de73c3f4a371a4eacbf1bbc853b90194704a7fdf4ae166d2c205141da85ba0, was independently retrieved; all 977 indexed files and original index bytes match. Its 704 selected application/validation inputs hash to dea712d078ad556a217c064d07053cf177182df83621935de584b0624d706b19. Older draft assets remain unchanged. Draft storage has no configured automatic expiry; account/repository continuity still matters. Routine CI evidence has explicit 90-day retention; Lighthouse's seven-day reports were retrieved for the durable archive.

Actual emitted worker buckets are pixibun-v1.14.1-ad957550f6656b82f5f35162c8eabc19a45a1473 and pixibun-pixibun-l09-recovery-20261009. The earlier local candidate manifest's serviceWorkerCache field records the override tag rather than the prefixed bucket; the actual HTTP identity receipt corrects this metadata without rewriting the sealed manifest.

TestSprite b32b4586-2b9c-4cf0-92d4-3fa5122f18d5, large color flyout controls: service passed, assessed inconclusive because recorded steps did not establish the planned color/size/dismissal assertions. Automatic approval review rejected the refined transfer of the local application/screenshots/interaction data to that third party. The user chose native checks only; no retry ran and signed provider envelopes are excluded from custody.

Physical pen/touch devices, manual assistive technology, real Safari legacy rollback, real two-machine/network behavior, production hosting/asset retention, long-session constraints and release approval remain open. This record does not increase the independent partial source-audit coverage or certify every feature.

## Review finding disposition

| Finding | Repair / evidence | Qualification limit |
| --- | --- | --- |
| R1 navigation recovery | Network fetch starts independently of cache opening; four rejected/stalled/read/write fault cases now pass | Static/default cache-unavailable resource paths remain outside this repair |
| R2 Linux WebKit co-draw | Same-build before/after resolver experiment reaches all three previously blocked preservation assertions | Complete CI executes and passes all three formerly blocked cases; real two-machine/network behavior remains open |
| R3 Chromium native crash | Original setup-only trace retained; new full development runs include the setup | Native SIGSEGV cause is still unknown |
| R4 accessibility | Label/name mismatches removed; large color alternatives measured and artwork preservation checked | Seven raw compact-target findings and manual equivalence/assistive-technology review remain |
| R5 custody automation | Upload, independent download and comparison against original index bytes are executable CI steps | Routine artifacts expire; draft archive depends on repository/account continuity |
| R6 canonical status | This new dated checkpoint is linked from current status and the issue registry | Historical local/remote results retain their original scope |

## Reproduction boundary

Use the repository's Node 22 runtime and locked dependencies. `npm run gate:full` retains documentation, strict types, lint, complete coverage, separate performance checks and production build. Browser commands explicitly use one worker and zero retries, retain JSON/list reports and failed traces, and seal/verify the compiled build before and after the complete suite. The development run uses the configured Turbopack server; production checks use an owned production server with reuse disabled. No application edits or rebuilds occur between the three production engines. Linux browser CI installs avahi-daemon and libnss-mdns and starts Avahi before the native pairing cases. The controlled diagnostic retains the missing-resolver failure separately.

The local build's aggregate digest is 3d4c6d28fe0213bdec41e2fb8c7c09677c7a99da8575c1e36f661dc5f8774f0d; exact final browser counts are recorded by their original manifests and JSON reports. Later documentation publication does not change the 704 selected application/validation inputs or retrospectively reclassify the qualifying revision.


## Remote browser detail

| Engine | Passed | Capability skips | Failed |
| --- | ---: | ---: | ---: |
| Chromium | 116 | 1 | 0 |
| Firefox | 115 | 2 | 0 |
| Linux WebKit | 116 | 1 | 0 |

All three engines expose WebRTC on this Linux runner, so their inverse no-WebRTC refusal case skips. Firefox lacks the emulated touch capability used by one drawing case. The three real Linux WebKit pairing cases execute once and pass their artwork/reload or invalid-message/no-ack assertions. These are distinct from the three Windows WebKit native pairing skips in local runs. Six ordinary/delayed waiting-update cases pass, and their attached state shows only pixibun-phase3-new, activated and controlled. All 21 import-safety cases pass. No test has multiple attempts or a flaky verdict.

Remote build Ctzqwt9BI9akiEWrB8Fp9 retains all 259 compiled files; SHA-256 aggregate 7ee3ac25494aa861f43342869974833a83a0e8b3487820f144de5433dfc1adf4. Browser artifact 11641514244 (12,784,507 bytes) has SHA-256 c02c72274ab8f0af56ed42e5e7be4e5ec16065cd53787346e8746fca551f0046. Independent retrieval matches the API digest and all 279 indexed files. CI's separate custody verdict 11641529259 confirms original index bytes and all 279 files match, aggregate 7b0bb1511eedfcbbb5667e425dd231ef4874f5945f3445def852dfd5b19f906d. The native pairing diagnostics, complete JSON reports and original logs are retained.


The build asset contains the exact local compiled candidate and selected source/validation inputs. The current CI compiled-file inventories and before/after receipts are retained; the complete remote compiled payload is not a separate uploaded build asset. Git tree equality establishes matching source, not byte-identical builds across Node/OS environments.

Larger equivalent controls are the remediation path for the compact dock. [W3C's target-size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum) permits an equivalent function through another control on the same page that meets the minimum size. The native checks establish the modeled control sizes and interactions; manual equivalence, entry-point reachability and assistive-technology behavior are still qualification work. No conformance claim follows from the score threshold.


## Local browser detail

| Engine | Passed | Capability skips | Failed |
| --- | ---: | ---: | ---: |
| Chromium | 116 | 1 | 0 |
| Firefox | 115 | 2 | 0 |
| Windows WebKit | 113 | 4 | 0 |

Chromium/Firefox expose WebRTC and skip the inverse refusal case. Firefox skips the emulated touch case. Windows WebKit skips the three actual pairing cases because its native WebRTC API is unavailable and executes the inverse refusal case; its clipboard permission fixture also records a capability skip. The Linux CI run executes those three pairing cases and the clipboard case. Matching Chromium/Firefox totals are not used to infer identical capability coverage across all engines. The 10,001-record Windows WebKit archive fixture uses its existing 240-second setup allowance; the export/refusal operation remains independently bounded to 15 seconds. No browser timeout was increased for this follow-up.

This file is the final validation checkpoint included in the evidence package. The package's independent draft-archive retrieval receipt is produced after upload and referenced separately by the tracked recovery report.

## Final draft-archive retrieval

Draft archive **408253184** contains two new immutable assets for qualifying revision `94bd345`:

| Asset | Bytes | Indexed files | Independently retrieved SHA-256 |
| --- | ---: | ---: | --- |
| `625912700`, `pixibun-l09-recovery-build-94bd345.zip` | 8,410,318 | 977 | `e6de73c3f4a371a4eacbf1bbc853b90194704a7fdf4ae166d2c205141da85ba0` |
| `626065502`, `pixibun-l09-qualification-94bd345.zip` | 79,971,286 | 552 | `0c4ec5e30aa6ae7d162931a6982a59de12d47ae38581183997bd7626dc4a126c` |

Both retrievals compare every indexed file and the downloaded index bytes against the original staged index, with zero missing, changed or extra files. The qualification index aggregate is `c43436c09a8255a4e7d23d691ec5221427a335bede353a3767754167ed008a55`; the build index aggregate is `4f4d75a4b4a4fd1d7e18b145ba0c48fe1a58fa9c7bdee7364a1133d53c88c042`. The archive retains failed gate logs, failed accessibility traces, prior Chromium failure traces, missing-resolver diagnostics, raw Lighthouse reports, successful complete browser reports and custody receipts. The qualifying checkpoint inside the ZIP precedes this retrieval appendix; it is not overwritten to create a circular hash claim. Provider envelopes, credentials, dependency directories and browser profiles are excluded.

Original receipts are under `artifacts/l09-recovery-followup-2026-10-09`: `qualification-evidence-retrieval.json`, `recovery-build-retrieval.json`, `complete-production-final-summary.json`, `remote-browser-production-summary.json`, `remote-browser-preservation-verdict.json`, `remote-browser-worker-verdict.json`, `build-after-final-production.json` and `complete-production-postrun-inputs.json`. Retrieved CI ZIPs retain their original run/revision indexes; the draft archive stores these separately from routine artifact expiry.

Final documentation verification passed on Node 22 with isolated workspace TEMP/TMP. The first final documentation invocation used the default Node 26 sandbox environment and failed during Vitest inventory cache renaming with EPERM; no application test ran in that invocation. Its summarized environment-failure receipt and corrected pass log are local post-package metadata, separate from the qualifying test archive. Application/validation inputs remain the 704 hashes recorded above. Subsequent documentation-only publication does not imply a newly executed full browser run on its metadata commit.
