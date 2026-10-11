# CI export dialog follow-up

Maintenance update — 11 October 2026: see the [11 October validation handoff](2026-10-11-validation-handoff.md) for the current engineering milestone. Earlier measurements, failures and decisions below retain their original revision and scope.

3 October 2026, Europe/Istanbul. Repair base: main `bf75d1e6a103bc10a6b23932f60df69c4256452a`, package 1.14.1, Next.js 16.3.6. This record describes the published build's failed Linux checks and the subsequent local repair. The earlier phase 7 Windows results retain their original scope. The obsolete session branch was deleted locally and remotely after publishing the preceding work to main.

## What actually failed

[GitHub CI run 37070715797](https://github.com/lxcario/PixiBun/actions/runs/37070715797) passed validation/build and Lighthouse. The editor step reported 182 passes and one flaky case: MP4 decoded-pixel inspection failed on its first attempt and passed on retry. Compiled operation checks reported 78 passes and six failures, all in WebKit:

- Manual-normal atlases, SVG wording/XML and ambiguous-normal refusal.
- Animated reverse/bounce downloads, Godot raw-register/alpha/role preservation and GIF native decoding.

These six cases stalled after clicking Export while waiting for a format tab, before their encoder/download assertions. The browser fetched the export chunks successfully; failed contexts stopped providing usable DOM/screenshot progress. An earlier main run also had WebKit export-opening failures. Unconditional native WebM/MP4 capability queries on dialog mount were a plausible shared cause, but the traces do not conclusively identify a particular upstream native call or crash.

The correction keeps non-video panels independent of native media capability APIs. WebM is checked for WebM and the MP4 fallback suggestion. MP4 is checked only for MP4 or Timelapse MP4, using scaled dimensions and the appropriate timeline/replay FPS. Eight regression cases fail against the earlier unconditional behavior and pass with this change. Production cases, retries and timeouts are unchanged. [Current export contract](../contracts/exports.md).

## MP4 and backup fixture synchronization

The failed CI attempt's actual 760-byte MP4 decoded in a fresh native Chromium page at 128 × 128 with a 0.3-second duration and a red center pixel after seeking. The initial canvas read before frame presentation was transparent. This diagnostic establishes that this retained file can decode; it does not prove every MP4 file or the precise timing of the failed CI attempt. The bundled Playwright FFmpeg lacks the required MP4/H.264 decoding support, so its rejection was not evidence of a corrupt file.

The editor video test now waits for both seeking and a presented video frame before reading canvas pixels. Dimensions and color thresholds remain unchanged. The first backup screenshot waits for Studio's active restoration phase, avoiding screenshot caret-style mutation during hydration. The fixtures still check actual downloads and picker cancellation; no product warnings are suppressed.

## Dependency correction

The full pre-fix audit reported one high-severity brace-expansion advisory across five development-only lock entries; the production-only audit was zero. A scoped update, with install scripts skipped, changed four 1.1.18 entries to 1.1.21 and one 5.0.9 entry to 5.0.12. No direct dependency range or major version changed. The fresh full audit reports zero vulnerabilities. Earlier production-only results remain accurate for their stated scope; an audit is not security certification. Primary advisory details: [rewrite complexity](https://github.com/advisories/GHSA-q2hr-2g5m-vwhr), [nested recursion](https://github.com/advisories/GHSA-qhr7-859c-m2p7), [comma recursion](https://github.com/advisories/GHSA-6j4f-fj2g-mc7p).

## Verification and retained diagnostics

The four-stage local documentation/type/lint/unit gate passed 1,583 tests /159 suites with default unit workers and unchanged timeouts. The isolated production build passed. All six previously failing compiled workflows passed in Chromium, Firefox and WebKit: 18 cases, one worker, zero retries. These Windows results are targeted coverage, not a full-suite rerun or a Linux CI verdict.

The first isolated editor setup generated invalid stylesheet tokens while scanning copied/generated material; two subsequent attempts reached the original server-start deadline before running tests. A direct request exposed the same invalid-CSS scan behind those deadlines. These are retained setup failures, not passing test verdicts. The disposable editor copy constrains Tailwind's source base to its copied src directory, includes the repository's original ignore file and uses its own working directory. Application source and production configuration are unchanged by this harness adjustment. [Tailwind source detection](https://tailwindcss.com/docs/detecting-classes-in-source-files) explains the default working-directory scan and ignore rules. The user's existing port 3000 server was preserved.

The six related Chromium editor checks passed, followed by eight repetitions of the MP4 download/native-pixel check, each with one worker and zero retries. No hydration warning appeared in the related backup run. [Evidence record](evidence/2026-10-03-ci-export-dialog-repair/run.json) retains raw outputs, source hashes, commands and diagnostic scope separately from operating instructions. Persistent-storage permission warnings reflect a fresh browser profile; data still uses IndexedDB. The GIF post-transfer failure is deliberately injected and must refuse a corrupted download. Reduced-motion warnings are expected in those accessibility scenarios.

Publication targets main. The [Actions page](https://github.com/lxcario/PixiBun/actions) supplies the repair commit's remote result. A local pass does not attest deployment, physical Safari/devices, every codec, two-build rollout/rollback or a new TestSprite run. The recorded local-only/no-upload preference remains in effect.
