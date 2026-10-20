# Keeping the drawing safe, and the evidence honest — 20 October 2026

This follows the [earlier resumed record](2026-10-20-resumed-verification.md). Published source is `5be4b61cc861e812138b08f47c9415d2866cc5a1`; the candidate adds the independently reviewed committed work from `d462cb45b7e9ebfa0dc71642e3eb961d4c703622` and one geometry-test timing repair. Other agents' unfinished MP4/WebM/recorder edits were not copied. The [lightweight receipt](../testsprite/integrated-followup-2026-10-20.json) preserves source labels, run IDs, script hashes and raw evidence hashes.

## What the real Linux run established

[CI 39397455693](https://github.com/lxcario/PixiBun/actions/runs/39397455693) passed validation, **365 development tests** and **556 production tests**, with **one production failure and four explicit capability skips**. Native codecs, compatible rollback and Lighthouse passed separately. The PR merge source was `3774e9b3897ee62ba9fca4f0ab5f877bfc2244a6` for head `5be4b61c`. The new evidence snapshot survived real upload, download and independent verification: **314 files, zero mismatches**. This closes transport qualification for that run; custody never turns a failed test green.

The sole production failure read Pause at **115.896728515625 px** while expecting **116 px**, about 73 ms after clicking Play. Its shared button was still completing the finite press-release spring. [The test](../../tests/production/stableStudioGeometry.spec.ts) now waits for finite animations using the existing helper before making the same exact width assertion. No tolerance, fixed delay, disabled motion or product-layout change was introduced. Both themes pass in Chromium, Firefox and WebKit: **6/6**, zero retries/skips. The original Linux failure remains a failure.

## Carefully incorporating another agent's committed work

The isolated candidate incorporates gallery duplication serialization and failure handling, GIF dimensions/payload validation before worker transfer, consistent frame sizes, the zero-capacity encoder growth guard, palette-cycle phase/rate precision, and benign closed-database handling. These are engineering hardening changes from the other agent, not discoveries credited to TestSprite. Their focused tests pass **136/136 in ten files**. Unfinished export changes in the other checkout remain separate.

The combined candidate passed all six Node **22.23.3** gate stages, including TypeScript, lint, configured coverage/performance budgets, **3,038 unit tests in 279 files**, and the production build (**599.40 s**). Actual downloaded GIFs were independently decoded in all three browsers: **3/3**, covering moving poses, transparent clearing and frame holds after saved reload. All **432 compiled files** remained unchanged throughout geometry/GIF qualification. The build banner names the base source; this is local working-tree qualification, not final Linux or production certification.

## Fixing the execution path ourselves

The owner asked us to stop sending support messages and investigate directly. An explicitly labelled harness diagnostic deliberately asserted a unique marker after real browser navigation. The first attempt failed during browser startup. With TestSprite's compatible serverless Chromium launch profile, run `e2f4279f-27ce-41d9-8fd7-0e2d1476c79c` returned the exact expected marker. This confirms that the supported fresh CLI run path executes saved Python. **It is not a product bug, a competition red-to-green story, or an automatic PR check.** Zero recorded UI-agent actions alone does not mean the script was ignored. The API still omits executed-code version and per-assertion output; those limits remain explicit.

After independently qualifying both complete scenarios on the pinned public preview in all three browsers (**6/6**), we submitted exactly two real fresh runs, with auto-heal disabled:

| Scenario | Fresh TestSprite result | Scope |
| --- | --- | --- |
| [Named palette](https://www.testsprite.com/dashboard-v3/o/8da317b3-5f3e-506d-b110-a2ae9c2af7b8/projects/ae8453ac-f859-4324-9ca2-5016e683bc6c/execution/2fdaad0e-dc04-4664-a4d8-a1085cdfc487/test/dd10b2af-bd42-4546-9d2f-446a74da35a6) | **Passed** · `dd10b2af-bd42-4546-9d2f-446a74da35a6` | Real reorder in both directions, remove, commit/cancel; actual downloaded project contents and exact native pixels. |
| [Four cozy rooms, Day and Night](https://www.testsprite.com/dashboard-v3/o/8da317b3-5f3e-506d-b110-a2ae9c2af7b8/projects/ae8453ac-f859-4324-9ca2-5016e683bc6c/execution/a89f24de-3dc6-441c-8f01-83e1aafa0556/test/4e6d64a6-2835-4c8f-85b0-41d55e2262fa) | **Passed** · `4e6d64a6-2835-4c8f-85b0-41d55e2262fa` | Eight theme/scheme choices, downloaded full project after each choice, exact pixels and saved reload. |

Both envelopes now identify the intended branch preview. Submitted scripts assert the actual browser origin and full `5be4b61c` manifest SHA before and after the scenario. The same qualified reusable logic was restored after both terminal results, using code-version/hash guards; no extra run was started. Older mismatched-target results remain historical, with their narrower scope. These are **manual CLI companion passes**; the required automatic GitHub App result is not replaced.

## What remains genuinely open

The separate portal cycle run `38d8952f-7b13-4e45-b95d-b98c36eac25e` recorded 17 real actions on the right preview, then remained **Blocked** because exact pixel/history observations were not performed. It entered 2 Hz, so it does not independently recheck the repaired native 6/5.5/5.6 validity defect. The original environment URL was restored. This observation does not establish a service defect or an application failure.

The full automatic trigger remains Disabled. GitHub actually requires `validate` and `TestSprite V3`, including for admins. No protection was weakened, success status manufactured, assertion removed or blocked import called a pass. The remaining release gates are fresh Linux results for the committed combined source, a real automatic fixing-commit App loop, supported import fixtures, production verification and the Discord submission. The existing genuine TestSprite discoveries retain their original failure/fix/independent proof; harness diagnostics and CI findings are attributed separately.
