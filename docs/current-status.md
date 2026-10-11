# Current project status

Updated 11 October 2026. PixiBun 1.14.1 has the reviewed import/artwork, navigation and resource-cache repairs published on main at `210df955fd25c840ab52d92c2e9bcc95ed050f0e`. This page records bounded engineering results. Production release approval remains open.

## Features and current contracts

The [feature index](features.md), [artist handbook](guides/README.md), [architecture](../ARCHITECTURE.md) and [source contracts](generated/source-contracts.json) describe implemented behavior. Drawing, layers, selection, animation, palettes, lighting, saved projects, backup/recovery, exports, collaboration and a single rigid-part motion workflow have scoped tests. Multi-part rigs, deformation, automatic animation and the broader [v2 vision](../V2_VISION.md) remain proposals. A passing gate does not establish every feature on every device.

## Qualifying engineering evidence

The final qualifying source is `a176d8629c64b1c73c74631454eeff54f838f3d7`. [CI run 38081448403](https://github.com/lxcario/PixiBun/actions/runs/38081448403) tested merge revision `6f57c93f5e206149f82c431df43d612f0fb47ad0`, whose tree exactly matches that source. These results predate this repository cleanup.

| Check | Local Windows | Matching-tree Linux CI |
| --- | --- | --- |
| Gate with coverage and production build | 2,227 tests /203 suites passed | 2,227 tests /203 suites passed |
| Warmed RotSprite p90; unchanged <10 ms limit | 2.146894 ms | 2.27146516 ms |
| Complete Turbopack development | 196 passed at `bfc1c5c` | 196 passed |
| Complete frozen production | 356 passed /7 capability skips at `bfc1c5c` | 359 passed /4 capability skips |
| Actual compatible-build update/rollback | 5 passed /1 WebKit legacy-Blob capability skip | 5 passed /1 WebKit legacy-Blob capability skip |

Complete browser suites used one worker and zero retries, with zero failures or flaky verdicts. Skips are missing capability coverage. Application inputs and complete-suite fixtures are unchanged between `bfc1c5c22d2d68b2a3942ae5b9f97577d3998f95` and `a176d86`; the earlier local build retains its own identity.

Final CI production build `FMlNHOH_R-_1KMDfzv_ZU` retains all 259 compiled-file hashes, aggregate SHA-256 `74c11f2aaa5b617525c8d65c9f73788924c3c1997374fbf698d3f782094ac67f`. All 279 final CI browser evidence files, original indexes and custody receipts verify. The full original browser/rollback payloads and dated reports now reside in the [local archive](archives.md#raw-evidence). Earlier failures retain their original verdicts.

Three local periodic-session cases passed their pixel checkpoints, but the compiled-build guard failed after the run. They remain excluded from frozen-build qualification and do not establish continuous history growth. The earlier coverage-instrumented timing failure and native Chromium crashes are preserved in the archive; later passes do not erase them.

The main publication at `210df955` passed its separate mandatory gate with 2,227 tests /203 suites. [Its CI run](https://github.com/lxcario/PixiBun/actions/runs/38118385947) is a distinct run; this page does not infer its outcome or a deployed build from the qualifying candidate's results. See [testing](guides/testing.md) for current commands and [generated inventory](generated/test-inventory.json) for discovery counts, which are not execution verdicts.

## Remaining work

- Seven compact Studio accessibility targets remain in the recorded scans. Manual screen-reader/touch equivalence and conformance need qualification.
- Actual Safari and physical pen/touch devices, real collaboration networks, continuous long sessions and low-memory behavior need named-device checks.
- Production hosting, deployed update/rollback, old-asset retention and long-lived tabs need actual host checks.
- WebKit's exact native legacy-Blob fixture refusal remains a capability boundary; current-format rollback passes, while Safari legacy rollback is unqualified.
- Participant studies, arbitrary-angle artwork quality, end-to-end latency and additional export consumers need their own evidence.

The [issue registry](research/issue-registry.md), [artist study](guides/artist-study.md) and [release-readiness guide](guides/release-readiness.md) track these obligations. The user selected native verification for the current milestone; prior TestSprite verdicts remain scoped and inconclusive where prerequisites/assertions were missing.

## Repository retention

Operating instructions, active plans, release records, source, tests and useful handbook images stay tracked. Completed audits, execution logs and raw browser evidence are preserved locally and ignored by Git. The [archive catalog](archives.md) records their original source revision, location and integrity receipt. This cleanup changes the current source snapshot; earlier Git history retains its original files.
