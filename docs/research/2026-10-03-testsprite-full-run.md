# TestSprite full execution follow-up — 3 October 2026

Maintenance update — 11 October 2026: see the [11 October validation handoff](2026-10-11-validation-handoff.md) for the current engineering milestone. Earlier measurements, failures and decisions below retain their original revision and scope.

The user requested execution of the remaining challenge cases and resolution of the blocked checks. All nine previously planned cases were dispatched, and the two blocked smoke cases were retried against the same compiled local build. There are now **zero unrun cases** in this 12-case project. Eleven new runs consumed **5.5 credits**, reducing the balance from 80.4 to 74.9. The earlier invite run was retained rather than repeated without a changed execution method.

## Cloud results and accepted scope

| Case | Latest service verdict | Accepted interpretation |
| --- | --- | --- |
| 01 rejected invite | Passed, earlier run | Final assertions check editor readiness and project title only; artwork/history remain unverified remotely. |
| 02 Help keyboard | Blocked | Center-only element clicks land on a selection gizmo; the agent cannot perform the required pointer/pixel operations. |
| 03 practice identities | Passed on retry | The final assertions check rendered workspace and project name only. Return/Redo, kept identity, reload and exact pixels remain unverified remotely. |
| 04 save/reload/history | Blocked | Required precise artwork/pixel prerequisites were not completed. |
| 05 locked tools/history | Blocked | Required drawing/history prerequisites were not completed. |
| 06 frame isolation | Blocked | Required drawing/frame comparison prerequisites were not completed. |
| 07 resize cancellation | Blocked | Required artwork/history prerequisites were not completed. |
| 08 stale-tab copy | Blocked | Required separate-tab/artwork prerequisites were not completed. |
| 09 APNG cancellation | Failed | The agent could not apply its resize setup. Its claim that inputs revert to 456×456 was not reproduced by the executable local test. |
| 10 native backup | Failed | Chromium's native OS Save picker is cancelled/unavailable in headless automation. Firefox's actual browser-download and import flow passes locally. This does not qualify Chromium native-picker handling. |
| 11 floating selection | Blocked | Required selection pointer operations were not completed. |
| 12 keyboard skip | Failed | The claimed missing `#main-workspace` target conflicts with the source. The complete keyboard-only route/focus test passes locally without a product change. |

The dashboard therefore reports **2 passed, 7 blocked and 3 failed**. These service statuses are retained. They do not establish two complete passing artwork workflows or three reproduced application defects. Run IDs, step traces, diagnoses, unavailable-artifact errors and local diagnostics are preserved in the [execution evidence](evidence/2026-10-03-testsprite-full-run/run.json). [Project dashboard](https://www.testsprite.com/dashboard-v3/o/8da317b3-5f3e-506d-b110-a2ae9c2af7b8/projects/ad7cf58e-3c0f-41d6-96a8-a3a076faf639).

## Executable local coverage

All **12 cases passed** in the final local suite. The subsequently strengthened locked-tool coordinates also passed in a dedicated rerun; its trace is retained alongside the complete suite.

The [local runner](../../testsprite_tests/challenge-2026-10-03/run-local.ps1) now runs all 12 workflows. The existing three self-contained Python regressions remain intact; [safety_cases.py](../../testsprite_tests/challenge-2026-10-03/safety_cases.py) adds the nine remaining cases. Each case uses a fresh browser context, real pointer/keyboard input, UI controls and rendered pixels. There are no application-store writes or development test handles.

The completed suite compares exact artwork across save/reload, rejected edits, frame changes, conflict-copy restoration and selection Undo/Redo. The selection check verifies a one-native-pixel arrow displacement and exact committed RGBA positions. The export check fits the resized canvas into view, creates 24 frames, observes active APNG encoding, cancels it, checks that no download appears, then downloads and decodes a PNG into the exact original pixels. A missed encoding window fails explicitly. The backup check imports the exact downloaded bytes under their original filename and restores both distinct frames, project name and 240/700 ms holds.

Backup uses Firefox because its browser-download flow can be observed without accepting an OS file picker. The other 11 cases use Chromium. These results qualify those browser paths only. They do not constitute full cross-browser, physical-device or native-dialog qualification.

Initial diagnostics remain preserved: restricted browser-path visibility prevented the first launches; an incorrect Fill tool ID was corrected to Bucket; explicit lock/unlock actions require their legitimate structural Undo steps; a stale-tab fixture must reopen the named original rather than assume a global last-opened-project pointer still names it; resize requires fitting the larger canvas before pointer drawing; and Playwright's temporary download path must retain the suggested filename on import. No assertion was removed to turn an application failure into a pass.

## Direct TestSprite replay remains pending approval

The CLI documents strict replay using `--no-auto-heal`; the service previously refused that mode through its own local tunnel. A verified official Cloudflare helper, version 2026.9.3, temporarily connected only the compiled loopback test server. The unchanged Help regression passed through that connection locally. The helper's SHA-256 was `f096265ec2fcbe9bb6e2d64268db167ced3fcbb83d894bdb9e2fcdb26f2ea7e2`. [Official TestSprite execution reference](https://github.com/TestSprite/testsprite-cli/blob/main/DOCUMENTATION.md), [Cloudflare temporary testing tunnels](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/).

Automatic approval review rejected uploading a regression script and temporary public URL to TestSprite, citing export of potentially private repository test code without sufficiently explicit authorization. No upload or strict public replay followed that rejection. The user was asked to approve this concrete data-sharing step. The temporary connection and test server are stopped after local verification; a future approved run needs a fresh temporary URL. Existing remotely stored code remains unchanged.

The application source and compiled build remain identical to the preceding audit: 585 source/test/config inputs and four build files, build ID `ThnCKdyVuq5dbkvFM8cQE`. Only test infrastructure and current testing documentation change. No application repair, deployment, new full application gate or release approval is claimed. Earlier dated evidence retains its original bytes and outcomes.
