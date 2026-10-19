# TestSprite loop ledger

<!-- Generated from loop-ledger.json by `npm run ledger:md`. Edit the JSON, then regenerate. -->

Every pull request TestSprite checked, what failed on its first run and the commit that turned it green. Source: [loop-ledger.json](loop-ledger.json), validated by `src/lib/verified/loopLedger.mjs`. The application renders this data at `/verified`; production availability is tracked in [current status](../current-status.md). Last updated 2026-10-19.

- TestSprite project: <https://www.testsprite.com/dashboard-v3/o/resques-workspace-8da317b3/projects/ae8453ac-f859-4324-9ca2-5016e683bc6c/test-cases>
- Cases in the suite: 121
- PRs checked: 1
- Bugs caught (product bugs only): 0
- Red → fix → green PRs: 0

| PR | Checked | TestSprite run | What failed | Fixing commit | Verdict |
| --- | --- | --- | --- | --- | --- |
| [#6](https://github.com/lxcario/PixiBun/pull/6) Matched deployment retried manually: 32 passed, 13 failed, 76 blocked | 2026-10-19 | [run](https://www.testsprite.com/dashboard-v3/o/8da317b3-5f3e-506d-b110-a2ae9c2af7b8/projects/ae8453ac-f859-4324-9ca2-5016e683bc6c/execution/1023cedd-f23b-4b96-897e-43ff22a428e0) | Outline Undo and frame recovery (test-fix): The action logs omitted actual Undo clicks. Corrected plans retain exact artwork requirements; the complete 121-case disposition is in pr6-triage-2026-10-19.md. These are representative confirmed causes, not a claim that every non-pass is diagnosed.<br>File fixtures and independent pixel observations (environment): Several App cases cannot establish required files, real gestures or native pixels. Free-plan fixture access was requested. Supporting manual/local passes do not replace this failed check or prove an unattended fixing-commit loop. | — | failed |
