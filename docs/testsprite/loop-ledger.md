# TestSprite loop ledger

<!-- Generated from loop-ledger.json by `npm run ledger:md`. Edit the JSON, then regenerate. -->

Every pull request TestSprite checked, what failed on its first run and the commit that turned it green. Source: [loop-ledger.json](loop-ledger.json), validated by `src/lib/verified/loopLedger.mjs`. The application renders this data at `/verified`; production availability is tracked in [current status](../current-status.md). Last updated 2026-10-22.

- TestSprite project: <https://www.testsprite.com/dashboard-v3/o/resques-workspace-8da317b3/projects/ae8453ac-f859-4324-9ca2-5016e683bc6c/test-cases>
- Cases in the suite: 121
- PRs checked: 1
- Bugs caught (product bugs only): 3
- Red → fix → green PRs: 0

| PR | Checked | TestSprite run | What failed | Fixing commit | Verdict |
| --- | --- | --- | --- | --- | --- |
| [#6](https://github.com/lxcario/PixiBun/pull/6) Automatic App runs: 33/7/81 on b78fffb1, 55/7/59 on 48f9b999, 58/8/55 on 0259f782 | 2026-10-19 | [run](https://www.testsprite.com/dashboard-v3/o/8da317b3-5f3e-506d-b110-a2ae9c2af7b8/projects/ae8453ac-f859-4324-9ca2-5016e683bc6c/execution/89634b92-4729-4ee2-8948-e463dbd50a9a) | S4-ANIM-03 — Clips use inclusive endpoints. (product-bug): Automatic App run on b78fffb1 failed: the inverted-range error toast rendered outside the open Clips dialog, so it was inert and absent from the accessibility tree. Fixed in e43248c0; the automatic App run on 48f9b999 passed the same case. The PR check as a whole is still red.<br>S4-PAL-04 — Cycle tracks keep their range. (product-bug): Automatic App run on 2d27b262 found 6 Hz and 5.5 Hz marked invalid by the rate input. Fixed in f2f13f3c; the follow-up pass was a manual controlled run, not an automatic App green.<br>S4-RELATION-01 — Turn it around, and bring it back. (product-bug): Automatic App run on 48f9b999 failed because the agent could not find the transform controls: their accessible names were only glyphs (fixed in ff320663). Reproducing it exposed data loss: after a selection was lifted with H or V, Escape deleted it with no Undo, and Undo after Commit or Ctrl+D returned to the cut-out hole (fixed in c534cc99, with tests/e2e/selectionTransformUndo.spec.ts). The automatic App run on 0259f782 passed the redesigned case on the fixed build.<br>Incomplete or mismatched execution prerequisites (test-fix): The complete automatic cohort and ten retained failures are in automatic-followup-2026-10-19.json. Double Undo, wrong-frame layer checks and a safe export fixture are diagnosed; not every non-pass has a confirmed cause. Separate local/manual passes do not replace App verdicts.<br>Unavailable file/pixel/gesture observations (environment): Support AI confirmed shared fixture uploads are excluded on Free. Saved-Python/App execution remains unknown. The prior manually retried 32/13/76 cohort is retained in pr6-triage-2026-10-19.json. This automatic check failed; no completed red-to-green loop is claimed. | — | failed |
