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
| [#6](https://github.com/lxcario/PixiBun/pull/6) Automatic fixing-commit dispatch: 33 passed, 10 failed, 78 blocked | 2026-10-19 | [run](https://www.testsprite.com/dashboard-v3/o/8da317b3-5f3e-506d-b110-a2ae9c2af7b8/projects/ae8453ac-f859-4324-9ca2-5016e683bc6c/execution/145919a4-44b9-4e5c-b34e-975c9fe39c86) | Incomplete or mismatched execution prerequisites (test-fix): The complete automatic cohort and ten retained failures are in automatic-followup-2026-10-19.json. Double Undo, wrong-frame layer checks and a safe export fixture are diagnosed; not every non-pass has a confirmed cause. Separate local/manual passes do not replace App verdicts.<br>Unavailable file/pixel/gesture observations (environment): Support AI confirmed shared fixture uploads are excluded on Free. Saved-Python/App execution remains unknown. The prior manually retried 32/13/76 cohort is retained in pr6-triage-2026-10-19.json. This automatic check failed; no completed red-to-green loop is claimed. | — | failed |
