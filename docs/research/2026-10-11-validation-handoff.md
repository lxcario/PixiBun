# Validation handoff and requested main publication — 11 October 2026

The navigation and artwork-safety engineering milestone is supported. The user requested a repository-wide Markdown update and publication to main after independent review. This handoff changes documentation and retains final evidence; it makes no application or test changes. Physical-device, accessibility, Safari and production-host qualification remain open.

## Final qualifying inputs and verdicts

The final qualifying source is `a176d8629c64b1c73c74631454eeff54f838f3d7`. [CI run 38081448403](https://github.com/lxcario/PixiBun/actions/runs/38081448403) tests merge revision `6f57c93f5e206149f82c431df43d612f0fb47ad0`, whose tree exactly matches that source. Its validation, browser, compatible-rollback and Lighthouse jobs succeed. Dispatch-only diagnostics/custody jobs are skipped; the normal validation/browser/rollback jobs each execute their own automatic retrieval verification.

| Check | Local Windows | Linux CI |
| --- | --- | --- |
| Final six-stage gate at `a176d86` | 2,227 tests /203 suites passed | 2,227 tests /203 suites passed |
| Warmed, uninstrumented RotSprite p90; unchanged 10 ms limit | 2.146894 ms passed | 2.27146516 ms passed |
| Complete Node 22 Turbopack development | 196 passed at `bfc1c5c` | 196 passed at final candidate's matching merge tree |
| Complete frozen production | 356 passed /7 capability skips at `bfc1c5c` | 359 passed /4 capability skips at final candidate's matching merge tree |
| Actual compatible-build update/rollback at final inputs | 5 passed /1 WebKit legacy-Blob capability skip | 5 passed /1 WebKit legacy-Blob capability skip |

The complete browser suites use one worker and zero retries, with zero failures, flaky verdicts or multiple attempts. The final CI development report takes 24.8 minutes; production takes 57.1 minutes. Production records Chromium 120 passes /1 skip, Firefox 119 /2, and WebKit 120 /1. All three Linux WebKit pairing, artwork-preservation and invalid-message cases execute and pass. The four CI skips are three tests for refusal in browsers *without* WebRTC, where that capability exists, and Firefox's unsupported native tablet-touch case. They are not passing assertions. Local Windows WebKit's missing WebRTC capability accounts for different local coverage.

The local complete suites retain their original `bfc1c5c22d2d68b2a3942ae5b9f97577d3998f95` source/build labels. Comparison of all 707 selected inputs between that revision and `a176d86` finds only `.github/workflows/ci.yml` and `tests/release/updateRollback.spec.ts` changed. Application code, complete browser fixtures/configurations and benchmark workloads are unchanged. That continuity does not turn the earlier local run into a test of the newer compiled build.

Final CI production build `FMlNHOH_R-_1KMDfzv_ZU` retains all 259 compiled-file hashes after its complete run; aggregate SHA-256 is `74c11f2aaa5b617525c8d65c9f73788924c3c1997374fbf698d3f782094ac67f`. The local final rollback build is `JeEQEfXtZRzwOFMheBoxV`. Both actual builds and all 707 final selected local inputs match their recorded guards after the local rollback replay. The previous compatible source is pinned to `ad957550f6656b82f5f35162c8eabc19a45a1473`; CI's old-build manifest context is not a substitute for that source pin.

Coverage remains 69.23% statements, 62.41% branches, 61.65% functions and 70.52% lines, against unchanged required thresholds. Correctness and coverage remain inside the gate; timing uses the controlled warmed benchmark separately. No unchanged complete browser suite is rerun for this documentation handoff. The mandatory publication hook still runs its normal gate.

## Evidence retained for the handoff

The [evidence directory](evidence/2026-10-11-validation-handoff/README.md) preserves the complete downloaded final CI browser and rollback payloads, their original indexes and automatic custody receipts, selected gate/qualification records and excluded periodic-session results. Its [manifest](evidence/2026-10-11-validation-handoff/manifest.json) records 326 payload-file hashes and byte lengths. This repository evidence is separate from the larger, not-yet-published source/build draft archive.

Independent browser retrieval verifies the API digest, original CI custody, original index bytes and all **279 indexed files**, with no missing, changed or extra files. Browser artifact **11682224724** has SHA-256 `940fab060026e5249ceab6b71e53dd932fa9afc79a3129cc95e7a6156268d84d`; custody artifact **11682469340** has SHA-256 `f4c6fd800112c8a0a90f1131acd37c465007591aadba3dc19863acb3b5bb6da8`. The original browser index hashes to `13cd0df29ace0dd49d6909892ba1654fd3066249dcc5bfe345497e436c16aa2e`; its file aggregate is `0e67c582f58969e437d90450131168c4f84b942c8fbf41130d3b010e027dd392`.

The final gate archive verifies all **379 indexed files**; final rollback verifies all **8 indexed files** and its original automatic retrieval receipt. Rollback's uploaded common ancestor removes `artifacts/`; the workflow and independent checker explicitly use that one prefix mapping and `release-index.json`. The original failed prefix verification in the earlier `6bdc0e0` run remains a failure. The public handoff retains the full final browser/rollback payloads, but only selected gate records rather than the complete coverage archive. Full candidate compiled bytes are not contained in the CI browser archive.

Routine CI browser/gate/rollback artifacts expire on 8 January 2027; their recorded retention is not permanent storage. The full final browser/rollback payloads in this requested Git publication have repository-history custody. Source/build capsules and earlier local traces remain in the separately identified local or historical draft stores. No new draft release/archive is created by this handoff, and the previously rejected larger archive upload is not represented as completed.

## Excluded longer-session result

The three local periodic-session cases pass, with twenty exact edit, Undo/Redo, save and reload checkpoints per engine over 15.5–16.6 minutes each. All 707 source inputs remain unchanged, but the post-run compiled-build guard fails: the build ID changes from `JeEQEfXtZRzwOFMheBoxV` to `wbugKzi3gjAhg-58wkG21`, with fourteen changed/added/removed manifest paths. The cause of that build change is not established here. These results remain excluded from frozen-build qualification. Reloads also reset history, so they do not establish continuous history growth or long-duration physical-device behavior.

## Remaining release work

- Seven compact Studio accessibility targets remain in raw Lighthouse reports. Larger alternatives pass bounded native keyboard checks; manual screen-reader/touch equivalence and conformance are unqualified.
- Actual Safari, physical pen/touch devices, real collaboration networks and continuous long-session/low-memory behavior remain unqualified.
- Production hosting, deployed update/rollback, old-asset retention and long-lived tabs require actual host checks. The local proxy retaining both builds is not host qualification.
- The exact native WebKit legacy-Blob fixture refusal remains a capability boundary; current-format rollback passes, while Safari legacy rollback is not certified.
- The retained Chromium crashes and older-build cold controller failures have no established native cause. Later passing runs do not erase them.

The user chose native checks only; no TestSprite transfer or new execution occurs. Engineering validation does not certify every source path, feature, device or network. The [current status](../current-status.md), [registry](issue-registry.md) and [release-readiness guide](../guides/release-readiness.md) keep those obligations separate.

## Markdown maintenance and publication scope

The pre-edit tracked census contains **293 Markdown files**: **131 maintained project pages**, **160 captured evidence files**, and **two upstream skill files**. Every maintained page receives the current handoff or a dated revision-scoped link. Current status, the documentation map, issue registry, changelog, performance, storage and release guidance receive substantive updates. Captured error contexts/evidence and upstream instructions retain their original bytes. Ignored audit reviews, private transcripts, generated dependency docs and separate worktrees are not rewritten or newly published. The [per-file census](evidence/2026-10-11-validation-handoff/markdown-census.json) records these dispositions and before/after hashes; link checking is not universal prose or application certification.

The requested publication targets `origin/main` using normal, non-force Git publication and its mandatory checks. Main is fifteen commits behind the qualifying review branch at intake, with no divergence. This publishes the accumulated reviewed repairs as well as the documentation handoff. Main's existing CI and deployment integration can run after publication; their new results must keep the publication revision separate from the passing qualifying revision above. This record does not claim that a new main build, production deployment or release sign-off has already succeeded.
