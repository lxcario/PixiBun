# Five small promises, checked through actual files — 20 October 2026

This follows the [integrated candidate record](2026-10-20-integrated-followup.md). App source stayed fixed at `98d7625e43e125a39d5151be578703d2040191bb`. The work closes verification gaps and corrects one test's viewport configuration; **no new application defect was reproduced in this batch**. The [receipt](../testsprite/remaining-hardening-2026-10-20.json) records exact run IDs, submitted/acknowledged code versions, hashes and limits.

## What was independently observed

The [remaining-case companion](../../scripts/testsprite/pixibun-remaining-integrity.py) verifies actual PNG bytes after pointer-painted red/blue cells and Undo/Redo; real save/reload with per-frame layer identities and 100/200ms holds; actual approximate SVG XML at 64×64; and Bun's inclusive cycle range with exact outside colors, transparent cells, project data and Undo/Redo behavior. The cycle journey also directly checks native validity for **6, 5.5 and 5.6 Hz**, so the earlier genuine [rate defect](2026-10-20-targeted-repairs.md) now has a strict controlled follow-up beyond the portal's 2-Hz attempt.

The [Pocket companion](../../scripts/testsprite/pixibun-pocket-integrity.py) opens the mobile Studio gate and Pocket at **390×844**, paints two literal pixels, erases one, decodes the actual PNG, compares all **4,096 channels**, clears and returns Home. This is desktop-browser layout simulation; physical touch and native devices remain unqualified. Save-file-picker fallback remains an explicit capability fixture in the desktop companions; native OS picker operation is not certified.

All five complete scenarios passed independently in **Chromium, Firefox and WebKit: 15/15**, serially, without retries. The actual public manifest's full source SHA and browser origin are checked before and after every journey. No application-store or application-raster write is used to create a pass. The cycle fixture uses actual Bun admission and public Scan Canvas, avoiding a dependency on an uploaded fixture pool. Saved backups and decoded layer data protect metadata as well as visible composites.

The two companions' PNG readers also passed **18 independent oracle checks** against Pillow-encoded RGBA, RGB and indexed/transparency files at 16/32 pixels, including CRC-corruption and truncation refusal. Standalone packaging checks require exactly one entry point and one source/target pin. These qualify the supporting harness; they are not eighteen additional product tests.

## Five controlled TestSprite passes

| Scenario | Fresh run | Verdict |
| --- | --- | --- |
| svg | [`98df8f0f-9f2c-49a7-a33c-bd4479bac5b3`](https://www.testsprite.com/dashboard-v3/o/8da317b3-5f3e-506d-b110-a2ae9c2af7b8/projects/ae8453ac-f859-4324-9ca2-5016e683bc6c/execution/1a30fd1d-025d-4407-8efd-08baa0bce3b6/test/98df8f0f-9f2c-49a7-a33c-bd4479bac5b3) | **Passed**, CLI source |
| png | [`b8b3f8c8-b5ad-4def-b5bb-670f50992b5f`](https://www.testsprite.com/dashboard-v3/o/8da317b3-5f3e-506d-b110-a2ae9c2af7b8/projects/ae8453ac-f859-4324-9ca2-5016e683bc6c/execution/a22ac1b1-1d5e-4f9d-8e85-c47ed5a7b21f/test/b8b3f8c8-b5ad-4def-b5bb-670f50992b5f) | **Passed**, CLI source |
| save | [`065d7adc-9556-4ca3-8084-6528cb8cfbd0`](https://www.testsprite.com/dashboard-v3/o/8da317b3-5f3e-506d-b110-a2ae9c2af7b8/projects/ae8453ac-f859-4324-9ca2-5016e683bc6c/execution/e147d28d-4e73-475f-baa2-3a10119b6aea/test/065d7adc-9556-4ca3-8084-6528cb8cfbd0) | **Passed**, CLI source |
| cycle | [`6e0faf6b-c91d-443b-a1b4-da6201165c18`](https://www.testsprite.com/dashboard-v3/o/8da317b3-5f3e-506d-b110-a2ae9c2af7b8/projects/ae8453ac-f859-4324-9ca2-5016e683bc6c/execution/bd26a77d-464e-4f60-9fa3-9cfe2134363f/test/6e0faf6b-c91d-443b-a1b4-da6201165c18) | **Passed**, CLI source |
| pocket | [`7e37d52b-52ab-4e3e-b466-30cef3eb79bf`](https://www.testsprite.com/dashboard-v3/o/8da317b3-5f3e-506d-b110-a2ae9c2af7b8/projects/ae8453ac-f859-4324-9ca2-5016e683bc6c/execution/3544c27f-73c3-4090-b633-74006b877606/test/7e37d52b-52ab-4e3e-b466-30cef3eb79bf) | **Passed**, CLI source |

Only those five saved-script runs and one Pocket UI run were requested. Auto-heal was disabled for each controlled script; the exact source/target pins were read back before dispatch. Runtime envelopes report the intended preview and Passed, but still expose null executed-code version and no UI-agent action list. Dispatch acknowledgements match submitted versions. These are **controlled companion passes**, not a passing automatic App cohort. Reusable scripts were restored only after terminal verdicts using code-version/hash guards; the temporary default preview URL was restored to production. Every original failure remains in history.

## A phone-sized test needs a phone-sized window

Pocket's old report searched a desktop layout for mobile controls. Its inherited project viewport was **1920×1080**. The portal exposes a supported per-test **390×844** override; that correction is now saved for future runs. The real [UI-agent run](https://www.testsprite.com/dashboard-v3/o/8da317b3-5f3e-506d-b110-a2ae9c2af7b8/projects/ae8453ac-f859-4324-9ca2-5016e683bc6c/execution/ca2eacd4-4005-42f9-a70e-7d82ab477d6a/test/cb0918e2-d0ce-4e0a-bdbb-cf91cc37db81) reached the narrow Studio gate and Pocket, but never successfully drew on its canvas. It remains **Blocked**, with ten recorded steps. The independent drawing/file proof and later saved-script pass retain their separate scope. No extra UI retries were spent on the same unavailable observation.

The [Run Behavior documentation](https://docs.testsprite.com/web-portal/setup/execution-settings) distinguishes viewport narrowing from mobile/touch emulation. The [test-editing documentation](https://docs.testsprite.com/web-portal/core/working-with-test/managing-test-cases) also distinguishes UI edited-step execution from API stored-code replay. Neither page establishes that a saved Python companion is the GitHub App execution path; that qualification stays open.

## Preparation failures were kept, too

Three cases had no saved Python body. The initial read-only preparation stopped before any code mutation or run; first attachment then used the CLI's supported initial/legacy path, with exact byte/version readback and a matching dispatch acknowledgement. A Pocket standalone prelude-assembly duplication was caught by the source-pin guard before dispatch. The earlier source/preparation remains local; the cleaned entry point was checked and all three browsers requalified it. These are preparation issues, not product findings or competition red-to-green stories.

The latest default-environment catalog is **75 Passed /0 Failed /46 Blocked**, observed 20 October at 17:43 Istanbul. It mixes dates/builds and must not be described as one complete green run. No tests were removed or assertions relaxed. The full App trigger remains Disabled and real GitHub protection remains unchanged. The broad `98d7625e` Linux run has reached production-browser testing after validation/development checks; final production verdict is pending. Lighthouse failed before checkout while GitHub timed out downloading actions; retrying just that job is refused until the containing run finishes. No app change is justified by that setup failure. Production release and the Discord submission remain open.
