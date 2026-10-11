# L09 remote verdict and custody — 9 October 2026

Maintenance update — 11 October 2026: see the [11 October validation handoff](2026-10-11-validation-handoff.md) for the current engineering milestone. Earlier measurements, failures and decisions below retain their original revision and scope.

This supplement follows the immutable [local checkpoint](2026-10-09-validation-repeatability.md). Historical receipts remain unchanged. The independent review subsequently found a controlled cache-storage navigation regression and accessibility defects; their repair requires a new candidate and new verification.

[Complete CI run 37947363853](https://github.com/lxcario/PixiBun/actions/runs/37947363853) **failed**. Its merge revision `371044074cdb0ba2fb016d2a142dcfad650c4f4f` has tree `649e49b5c5c3f8e0a1666213bb95d7a1e7c045b3`, equal to candidate `65894be8172996923ff5fc7894b7a3111d4bd952`.

| Check | Remote result | Limits |
| --- | --- | --- |
| Six-stage full gate on Node 22.14.0 | Passed, 2,122 tests /201 suites; warmed RotSprite p90 1.319 ms against 10 ms | Correctness and coverage remain enforced; applies to this revision |
| Configured Turbopack development | 195 passed /one failed | Chromium context setup crashed with signal 11 before the layer-reordering test body |
| Complete frozen production suite, three engines, one worker, zero retries | 338 passed /four skipped /three failed, 345 cases | Linux WebKit guest-isolation and both invalid-message cases never connected; their preservation/rejection assertions did not execute |
| Worker transitions and import safety within that complete run | Six transitions and 21 imports passed | The earlier broader Firefox trace cannot prove retirement event ordering |
| Lighthouse configured threshold | Passed | Raw reports contain two Home and four Studio label/name mismatches and eight undersized Studio controls; score success is not conformance |

Local production recorded 338 passed /seven skipped /zero failed. Windows WebKit skipped the same three co-draw cases because its native API is absent; Linux exposes the API but failed to connect. Equal pass totals therefore conceal different coverage. A skip cannot close those failed connections.

## One-time custody completed

Three immutable ZIP assets in [draft evidence archive 408041540](https://github.com/lxcario/PixiBun/releases/tag/untagged-53b61f49c28225150b4b) were independently downloaded and hash-checked. The archive stores evidence and does not publish an application release. It has no configured automatic expiry; availability depends on the repository and account.

| Asset ID | Archive | SHA-256 |
| --- | --- | --- |
| 625343576 | `pixibun-l09-local-65894be.zip` | `92bdae38df2fb571df862616ca598a25e5ca11b46ba4387b594ecf0b180209ec` |
| 625359413 | `pixibun-l09-builds-65894be.zip` | `d4167ace189b46450eff50c1e466bc47a17e65be9df541a93e9116509a0bad49` |
| 625503425 | `pixibun-l09-remote-65894be.zip` | `3cb6584554de16533b0cfa78a6038c3e542cfd22119b371236822da7d68a297e` |

The original browser artifact indexed 307 files but uploaded 305; two hidden `.last-run.json` files were omitted. The original mismatch is retained. [Custody witness run 37957507649](https://github.com/lxcario/PixiBun/actions/runs/37957507649), on configuration revision `8b3c5d11c2c27e03ba9daa1d1b0c6a8d321787a6`, includes hidden files. Independently retrieved artifact `11628413111` matches both indexed files, including the hidden witness; ZIP SHA-256 is `7a77e3652be4f843af716dda21af985ceb9c3f9ac3ec371717b4c0f7e91d9222`.

That workflow only uploaded; retrieval was a separate manual operation. It does not establish automatic future custody. The recovery follow-up adds isolated downloads compared with the original upload indexes and rejects missing, changed or extra files. Its execution requires a separate verdict.

## Release qualification remains open

Resolve navigation recovery, obtain a new complete remote browser verdict with retained native transport diagnostics, and verify accessibility repairs and automated custody. Physical pen/touch devices, actual Safari legacy rollback, manual assistive technology, real two-machine/network behavior, production asset retention and long-session qualification remain separate. TestSprite remains inconclusive within its recorded assertion scope. Main publication, deployment and release approval are not implied by the draft review branch.
