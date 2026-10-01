# Audit evidence — 30 September 2026

**Documentation reconciliation — 1 October 2026:** This directory retains dated execution evidence. The session's completed bounded work and remaining evaluation requirements are summarized in the [completion record](../../session-completion-2026-10-01.md). Later shared interface changes and three automated dry-runs are described in the [Phase 6 UX report](../../PHASE6_UX_HARDENING.md), with images under `../ux-qa/`. The subsequent [UI/UX corrections](../../session-ui-ux-2026-10-01.md) have separate evidence under `../2026-10-01/`. The live editor inventory is 146 tests in 32 files; the 134-test full run and compiled checks below retain their original scope and predate those later changes.

Reviewed application commit: `23eaa10e662db349b20ae9c7f6a2e93a2f328cbb`, PixiBun 1.14.1.

[Read the complete audit](../../2026-09-30-codebase-and-pixel-art-audit.md).

The probes below describe the original audit commit. They are expected to stop reproducing a defect after it is fixed; use the normal regression suite for current implementation checks. See [phase implementation status](../../phase-implementation-status.md) for current results and Phase 1/2/3/4 logs. The A6 probe's index-map access was adapted to the Phase 2 API so the archived file still typechecks; its original bad-alpha assertion remains historical.

## Reproduction

From the repository root:

```powershell
npx vitest run --config docs/research/evidence/2026-09-30/audit.config.mjs
```

Result during the audit: **11 tests passed in one file**. These tests assert observed defects. Passing means the defects were reproduced, not fixed. They are intentionally excluded from the normal `tests/**/*.test.*` suite. When implementing fixes, write desired-behavior regression tests in the normal suite instead of preserving these assertions as contracts.

The probes use production stores, serializers, history restoration, exporters, and event handlers, with happy-dom and the existing canvas mock. They establish revision/state transitions and specific byte/transfer behavior. They do not establish real-browser blend fidelity. A7 directly exercises the receiving adoption handler with the host role; it is not an end-to-end hostile WebRTC test. A9 exercises the complete in-between event handler at the actual 500-frame limit. A11 performs an actual structured-clone buffer transfer and simulates a subsequent worker crash.

## Files

| File | Contents |
| --- | --- |
| `source-inventory.csv` | 260 TS/TSX/CSS source paths, physical line counts, and SHA-256 hashes; 73,587 physical lines |
| `integrity.probes.ts` | Eleven diagnostic reproductions, labeled A1–A11 |
| `audit.config.mjs` | Dedicated probe configuration extending the existing Vitest configuration |
| `audit-gate.log` | Passing documentation, type, lint, 1,315-test, and production-build gate |
| `audit-e2e-rerun.log` | 98 passing Chromium tests against the configured development server |
| `audit-e2e.log` | Initial environmental launch failure: sandbox `spawn EPERM`; superseded by the passing rerun |
| `audit-coverage.log` | Passing coverage run: 70.17% statements, 60.83% branches, 63.86% functions, 71.22% lines |
| `audit-dependencies.json` | Successful current npm audit response: zero reported production dependency vulnerabilities |
| `phase2-gate-final.log` | Phase 2 passing five-stage gate, 1,359 unit/integration tests, and production build |
| `phase2-browser.log` | Initial full Phase 2 browser run: 109 passed, one export fixture-initialization failure |
| `phase2-browser-exports-final.log` | Five passing export checks after fixture correction, including native GIF/WebM/MP4 decode |
| `phase2-browser-final.log` | Final full Phase 2 browser run: 110 Chromium tests passed in 26 spec files |
| `phase3-gate-verified.log` | Final Phase 3 Node 22.23.3 five-stage gate: documentation, types, lint, 1,374 tests in 136 files, and production compilation |
| `phase3-production-final.log` | All 15 compiled-production checks passed across Chromium, Firefox, and WebKit under Node 22.23.3 |
| `phase3-browser-final.log` | All 110 development editor regression checks passed under Node 22.23.3 |
| `phase3-testsprite-preflight.log` | TestSprite command absent; no run or verdict available |
| `phase3-gate-initial.log` | Initial gate with an export error-precedence regression, subsequently corrected |
| `phase3-gate-final.log` | Passing intermediate gate before the last cache-query and storage-error refinements; superseded by `phase3-gate-verified.log` |
| `phase3-production-other-initial.log`, `phase3-webkit-diagnostic.log` | Reproduced WebKit Blob-persistence failure before binary-record storage was introduced |
| `phase3-webkit-storage-rerun.log`, `phase3-webkit-offline-export-rerun.log` | Intermediate results, including failed offline emulation, an export selector correction, and missing offline shell dependencies |
| `phase3-webkit-shell-rerun.log` | Passing actual-origin-outage scenario after shell-dependency caching; final all-engine run supersedes it |
| `phase4-gate-final.log` | Phase 4 Node 22.23.3 five-stage gate: documentation, types, lint, 1,393 tests in 138 files, and production compilation passed |
| `phase4-production-final.log` | All 18 compiled-production checks passed across Chromium, Firefox, and WebKit, including real animation-worker reload and protected cleanup |
| `phase4-browser-final.log` | All 113 final development editor checks passed in 27 Chromium spec files after the brush-hover fixture correction |
| `phase4-type-final.log`, `phase4-lint-final.log`, `phase4-docs-final.log` | Passing type, lint and documentation checks after the final fixture/report updates |
| `phase4-browser-reload.log` | Three focused native Chromium animation review, protection, persistence, accessibility, and layout scenarios passed |
| `phase4-browser-initial.log`, `phase4-browser-focused.log` | Initial/intermediate failures before annotation hydration, keyboard scrolling, and cached-worker startup fixes |
| `phase4-worker-diagnostic.log` | Actual native `Missing worker bootstrap config` error after a cached reload, subsequently fixed and verified in all three production engines |
| `phase4-gate-before-context.log`, `phase4-production-before-context.log`, `phase4-browser-before-context.log` | Passing 1,392-test gate, 18 production checks, and 113 editor checks before the final following-pose annotation hardening; superseded by final reruns |
| `phase4-gate-count-sync.log` | Documentation-count mismatch after adding one regression; inventory corrected before the passing final gate |
| `phase4-browser-overlay-failure.log` | Final-source rerun passed 112/113 checks; existing brush-hover setup failed before waiting for restoration and measuring after hover |
| `phase4-overlay-rerun.log` | All four overlay checks passed in isolation before correcting the fixture setup |
| `phase4-testsprite-preflight.log`, `phase4-testsprite-review-plan.json` | Authenticated native CLI found, original review plan prepared, upload rejected by automatic review, then TestSprite skipped by the user's explicit choice |
| `phase5-gate-final.log` | Final Node 22 local gate: docs, types, lint, 1,430 tests in 141 files and production compilation |
| `phase5-browser-final.log`, `phase5-production-final.log` | Final complete editor and compiled-production browser runs; results detailed in the phase report |
| `phase5-browser-focused-final.log` | Five focused game-delivery workflows, explicit duplicate bindings, save/reload and accessibility passed |
| `phase5-animated-unit.log`, `phase5-animated-browser.log` | Focused video pose/hold dispatch and GIF worker/fallback checks; native GIF/APNG reverse, bounce, play-once and decoded first-frame checks |
| `phase5-production-decoder-difference.log`, `phase5-webkit-animation-diagnostic.log`, `phase5-webkit-animation-raw-decode.log`, `phase5-webkit-animation-source-check.log` | Initial 23/24 production result, reproduced one-byte green-fixture difference, unconverted decode, and passing WebKit comparisons against each actual imported source pose |
| `phase5-animated-production-files.log`, `phase5-animation-independent.json` | Three-engine native download rerun retained 12 files; independent Pillow verification of all 42 decoded frames, order, colors, holds, play-once metadata and SHA-256 hashes |
| `phase5-type-final.log`, `phase5-lint-final.log`, `phase5-docs-final.log` | Final passing type, lint and documentation checks after browser-fixture and report refinements |
| `phase5-gate-before-animated.log`, `phase5-browser-before-animated.log`, `phase5-production-before-animated.log` | Passing 1,424-test gate, 118 editor checks and 21 production checks before animated downloads were aligned with the shared clip ordering |
| `phase5-browser-intermediate-failures.log`, `phase5-browser-affected-rerun.log` | Initial editor run passed 116/118; all nine affected import/rotation/pocket-pad checks passed in isolation, then readiness and bounded waits were added |
| `phase5-browser-transition-contrast.log` | Intermediate 117/118 result exposed low contrast during interpolated export-tab colors; the transition was removed |
| `phase5-unit-intermediate.log`, `phase5-build-intermediate.log`, `phase5-production-intermediate.log` | Earlier passing results before the final PNG callback, contrast and identifier-boundary hardening; superseded by final logs |
| `phase5-godot-final.log`, `phase5-engine-indexed-normal.json`, `phase5-engine-color-only.json`, `phase5-engine-duplicate-bound.json` | Independent ZIP CRC/hash validation and 850 real Godot 4.7.2 Compatibility assertions; 37,632 CPU/GPU palette comparisons, explicit tolerance and actual hold measurements |
| `phase5-engine-*-errors.log` | Empty final Godot stderr logs; earlier engine failures are explained in the phase report |
| `phase5-godot-comparison.png` | Actual engine-rendered original/runtime comparison of the original color/alpha fixture |
| `phase5-runtime-checksum.log` | Local Godot archive SHA-256, checked against the official release digest |
| `phase5-zip-paths.log` | Windows drive-relative, traversal and nested paths rejected before creating an extraction directory |
| `phase5-gate-load-timeouts.log` | Intermediate concurrent gate run passed 1,422/1,424 tests; two existing 5-second checks timed out under simultaneous browser load, then the gate was rerun alone |

## Phase 6

| Evidence | Result / scope |
| --- | --- |
| `phase6-unit-focused-final.log` | 36 passing algorithm/integration checks: exact protection, deterministic candidates, light coordinates, search bounds, no-path diagnostics, recipe/history/merge provenance, source expiration, worker failure/cancellation and memory/capacity admission |
| `phase6-gate-final.log` | Final documentation, TypeScript, ESLint, 1,466-test / 143-file repository suite and production compilation in 45.50 seconds |
| `phase6-browser-final.log` | 134 passing editor checks across 31 Chromium spec files in 2.1 minutes, including concurrent interface and export scenarios |
| `phase6-browser-focused-final.log` | Four passing workbench checks in 18.3 seconds after the final full editor run, native 1×/4× views, corrected no-path message and scoped Axe/layout checks |
| `phase6-accessibility-rerun.log` | All 24 affected accessibility checks passed across four themes |
| `phase6-browser-accessibility-failures.log` | Earlier 121/128 editor result: invalid save-indicator labeling and interpolated export-tab contrast, subsequently corrected |
| `phase6-production-initial-failures.log` | Initial 17/33 compiled result: worker filename assumptions, changing save/update labels and an update banner covering frame buttons |
| `phase6-production-proxy-failures.log` | Intermediate 26/33 result after moving to a separate local address; six proxy fixtures still used the old address and one unverified drawing click did not expire a fingerprint |
| `phase6-production-stroke-readiness.log` | Intermediate 31/33 result: the source-edit check now verifies actual pixels, exposing two tool-help popup interceptions |
| `phase6-production-source-rerun.log` | Source-edit and fingerprint checks passed in Chromium, Firefox and WebKit using the normal Pen shortcut and verified raster changes |
| `phase6-production-final.log` | Final compiled three-engine run: 32/33 passed in 15.5 minutes; all nine research scenarios passed. One Firefox animation-review timeout coincided with a prolonged approval-review delay; root cause is not established |
| `phase6-production-firefox-rerun.log` | The remaining Firefox animation-review scenario passed unchanged on a targeted rerun in 12.0 seconds; together the final logs cover all 33 scenarios |
| `phase6-workbench-1024.png` | Final local screenshot visually inspected; shows native scene previews, border/cursor overlay and the corrected no-path diagnostic |
| `phase6-gate-before-merge.log`, `phase6-browser-focused.log`, `phase6-browser-focused-rerun.log`, `phase6-unit-focused.log` | Earlier implementation/fixture results retained for traceability; superseded by final logs |

Phase 6 uses original generated fixtures and local browser verification. Production tests can select another local port with `PIXIBUN_PRODUCTION_PORT`; proxies follow that configured address and alternate runs store artifacts outside the editor suite's output directory. The [artist-evaluation guide](../../phase6-artist-evaluation.md) has no recorded participants or results.

The original audit and Phases 1/2 used available Node v26.5.1. Phases 3–6 use a checksum-verified workspace-local Node 22.23.3 runtime, matching the repository's supported major version. Their separate production suite covers three browser engines on Windows. This is not Apple Safari/iOS, hardware input, or long-duration memory certification. Original audit coverage includes instrumented files and two test-support files, rather than explicit all-production-source inclusion.

The original analysis did not change application code, dependency versions, production settings, or artwork. The subsequent authorized implementation phases change local source and tests as described in the phase status; no commit, deployment, or remote CI run is claimed. Phase 4 native-access preflight corrected the earlier TestSprite-absence conclusion: CLI 0.13.0 and authentication are available. Its proposed workflow upload was rejected by automatic review, and the user explicitly chose local verification only; Phases 5 and 6 honor that choice, and no TestSprite run or verdict is claimed.

<!-- session-publication-2026-10-01 -->
## Session checkpoint — 2026-10-01

The studio retains its single-row header and live pixel glints. Palette tools now support named creation, scans of at most six main artwork colors, and direct swatch removal. First/Last cycle swatches can animate fire while preserving wood and outlines. Cycle Loop exports APNG or GIF at 3/5/8/10/12/15/24/30 FPS, initially 8 FPS. The shared GIF encoder now restarts its compression dictionary correctly, fixing corrupted larger exports. Existing damaged GIFs need re-export. [Interface record](../../session-ui-ux-2026-10-01.md), [palette tools](../../palette-creator-2026-10-01.md), [cycle scope](../../palette-cycle-scope-2026-10-01.md), [export timing](../../palette-cycle-export-2026-10-01.md) and [GIF correction](../../gif-8x-corruption-2026-10-01.md).

The latest full project gate passed documentation, types, lint, **1,502 unit/integration tests across 149 suites**, and the production build in 65.39s. A real 512×512 8x GIF passed native Chromium decoding of all 16 frames with zero pixel mismatches. The current discovered editor inventory is **155 tests in 37 files**, plus 39 separate compiled-production scenarios; the new work has scoped browser verification, not a full inventory rerun. Earlier results retain their dates and scope. The user requested documentation reconciliation and Git publication of this checkpoint; Git history records publication. [Delivered work, evidence and open validation](../../session-completion-2026-10-01.md).
<!-- /session-publication-2026-10-01 -->
