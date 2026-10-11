# TestSprite installation and safety challenge — 3 October 2026

Maintenance update — 11 October 2026: see the [11 October validation handoff](2026-10-11-validation-handoff.md) for the current engineering milestone. Earlier measurements, failures and decisions below retain their original revision and scope.

The user explicitly requested the latest TestSprite CLI and challenging tests, authorizing this external testing pass. The official npm `latest` tag resolved to **0.13.0**, which was installed and verified. Existing authentication has frontend V3 and local-tunnel access. GitHub's `releases/latest` pointed to an older 0.10.0 tag during research; the live npm distribution determined the installed version. [Official CLI installation and execution reference](https://github.com/TestSprite/testsprite-cli/blob/main/DOCUMENTATION.md).

## Delivered suite

Created **12 independent frontend tests with 235 explicit plan steps** in `PixiBun Local Safety Challenge`, project `ad7cf58e-3c0f-41d6-96a8-a3a076faf639`. Its origin mode is local, target `http://127.0.0.1:3150`, with `data-testid` enabled. Existing public and legacy local projects were inspected and retained. No application dependency, source, deployment or Git commit was changed by this pass.

The [plans and running instructions](../../testsprite-plans/challenge-2026-10-03/README.md) and [registered manifest](../../testsprite_tests/challenge-2026-10-03/manifest.json) cover rejected pairing, modal keyboard isolation, practice identities, save/reload/history, locked-layer rejection, isolated frames and timing, cancelled bounded resize, stale-tab conflict copies, APNG cancellation, native backup roundtrips, selection nudging and keyboard skip focus. All 12 plans pass the CLI's schema lint. Schema validity establishes neither execution support nor a behavioral pass.

Three self-contained frontend Python tests were also authored and saved to the same TestSprite cases. They use real Playwright mouse input and compare every byte of the rendered RGBA canvas through public DOM access; they do not modify application stores or add product testing endpoints. They invoke their test functions explicitly and assert exact pixel restoration, project names and history behavior. The Python format follows the CLI's documented `playwright.async_api` execution format.

## Actual results

| Check | Observed result | Accepted scope |
| --- | --- | --- |
| TestSprite rejected-invite plan | Reported passed, run `850ac824-8517-4dc0-8458-9b20ef85884e` | **Artwork/history unverified**: the trace has only two final assertions, for editor readiness and project title. It does not establish the planned stroke, Undo/Redo, reload or gallery outcomes. |
| TestSprite Help plan | Blocked, run `3e61839a-8e38-4fd2-9727-6413d170726e` | The agent reports it cannot synthesize drawing/marquee drags or inspect canvas pixels. This is an execution limitation, not a reproduced product defect. |
| TestSprite practice plan | Blocked, run `a9473bdc-517e-4393-adbe-a3ee89a0c265` | Precise drawing prerequisites were not met. Failed assertions in this blocked run do not establish a practice regression. |
| Strict TestSprite Python replay | Blocked before execution, run `7679ad43-6525-4f44-a40f-0dfd62d7ba1a` | Server response: “Deterministic replay cannot run through a tunnel.” No Python assertions ran remotely. |
| Local `invalid_invite.py` | Passed | Both actual strokes, original saved identity, exact Undo/Redo, reload and absence of a spurious Shared Drawing gallery entry. |
| Local `help_keyboard.py` | Passed | Seven destructive shortcuts leave all 4,096 RGBA bytes and selection bounds unchanged; closing Help, cancelling selection, Undo and Redo preserve their intended behavior. |
| Local `practice_identity.py` | Passed | Return restores exact original pixels and Redo; Keep saves separate reloadable practice artwork; reopening the original restores both original strokes. |
| Remaining nine TestSprite cases | Not run | No cloud or local verdict implied. Multi-tab, file reuse, encoding interruption and pixel/drag cases require appropriate execution capabilities. |

[Execution receipts, sanitized traces and hashes](evidence/2026-10-03-testsprite-challenge/run.json) preserve the distinction between service verdict and accepted coverage. The [TestSprite project dashboard](https://www.testsprite.com/dashboard-v3/o/8da317b3-5f3e-506d-b110-a2ae9c2af7b8/projects/ad7cf58e-3c0f-41d6-96a8-a3a076faf639) contains the registered tests. The initial three service runs reduced the balance from 81.9 to 80.4 credits; the refused replay incurred no additional observed charge. Running the nine remaining tests would nominally cost 4.5 credits, but the observed local agent limitations must be resolved before treating such runs as reliable artwork evidence.

## Diagnostics and evidence quality

The first local Help Python attempt failed because its exact dialog-name locator omitted the decorative leading star. A scoped name match corrected the locator; all pixel, selection, keyboard and history expectations remained intact. The original traceback is retained. An APNG plan update initially supplied the wrong defensive step count and received `PRECONDITION_FAILED`; after reading the actual 14-step count, the corrected update succeeded. A restricted offline-lint invocation also failed while the CLI opened its credential profile; the authenticated native invocation validated all 12 files. These are test/tool diagnostics, not application repairs.

The requested failure-bundle download for the original blocked Help run returned `NOT_FOUND` with `reason: no_code`; run-scoped step/result records were retained instead. Presigned artifact URLs and account identity fields are removed from published snapshots. Raw CLI responses remain in ignored local artifacts.

Inspection of an older public-project generated locked-layer test found its final assertion was only `current_url is not None`. That assertion cannot establish pixel or history protection. It was not changed. This finding and the new invite trace demonstrate why a generated “passed” label needs examination of the actual assertions.

## Target and remaining scope

Local execution used the existing compiled Next.js 16.3.8 / PixiBun 1.14.1 build `ThnCKdyVuq5dbkvFM8cQE`, Node 22.23.3 for the app/CLI, and Python 3.12.14 with isolated Playwright 1.63.0 against the existing Chromium executable. All **585 source/test/config inputs and four build files** match the sealed preceding audit record. The prior 1,746-test gate and three-engine browser results retain their original date/scope; they were not rerun for these plan/Python/document changes. Fresh CLI plan lint and documentation checks are recorded separately.

The owned servers and tunnels were closed after execution. The suite remains local and uncommitted. Full TestSprite pixel qualification, the other nine cases, physical devices/networks, assistive technology and artist studies remain separate work.
