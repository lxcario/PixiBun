# The three-case retry: scope matters

Observed 23 October 2026 by reading each run's immutable plan in the TestSprite portal and the current definitions through the official CLI. These observations add no app-code fix and start no paid test run.

| Case | Automatic run b6bd5bcd | Manual retry d158d486 | What the retry establishes |
| --- | --- | --- | --- |
| S4-SAVE-01 | 34 steps, test v1.8. Both reloads require Undo disabled; the first failed | 32 steps. Both Undo-disabled assertions and that part of the goal were removed | Artwork and 175/325 ms holds survived the exercised reload flow; empty session history was not retested by this plan |
| S4-NEW-02 | Middle frame restoration failed after the requested Undo | The plan adds an enabled-Redo assertion immediately after Undo and retains the three-frame 100/200/300 ms checks | The retained restore and hold conditions passed with the additional action guard |
| S4-ANIM-02 | Full Repeat → Ping-Pong → Once → Repeat cycle required; final Repeat failed | Plan only requires Repeat → Ping-Pong, removing the two later clicks and their assertions | First mode transition, stepping, preview speed, artwork and stored holds passed; full loop-mode cycling was not retested |

Sources: [complete automatic run](https://www.testsprite.com/dashboard-v3/o/8da317b3-5f3e-506d-b110-a2ae9c2af7b8/projects/ae8453ac-f859-4324-9ca2-5016e683bc6c/execution/b6bd5bcd-74ed-47d6-873e-c0f1d4351415), [SAVE-01 retry](https://www.testsprite.com/dashboard-v3/o/8da317b3-5f3e-506d-b110-a2ae9c2af7b8/projects/ae8453ac-f859-4324-9ca2-5016e683bc6c/execution/d158d486-f8c8-42ea-9ec1-42c3928f70e9?test=d469e7e1-17f1-458c-840d-672652cbe544), [NEW-02 retry](https://www.testsprite.com/dashboard-v3/o/8da317b3-5f3e-506d-b110-a2ae9c2af7b8/projects/ae8453ac-f859-4324-9ca2-5016e683bc6c/execution/d158d486-f8c8-42ea-9ec1-42c3928f70e9?test=0a47c6b1-5bb4-4252-ae3f-c0d6f47991e4), [ANIM-02 retry](https://www.testsprite.com/dashboard-v3/o/8da317b3-5f3e-506d-b110-a2ae9c2af7b8/projects/ae8453ac-f859-4324-9ca2-5016e683bc6c/execution/d158d486-f8c8-42ea-9ec1-42c3928f70e9?test=0890ae46-63e5-4313-b24d-1c01f71b0018).

The 121 latest Passed statuses are a real catalog observation across different runs and plan versions. They are not one complete automatic 121/121 cohort, nor proof of the removed conditions. The original failed reports remain valid historical results.

## Conditions retained for the next run

- **SAVE-01:** keep both empty-history assertions; wait for the actual local-save status before navigating. This preserves the original claim and makes the save/reload boundary explicit.
- **NEW-02:** keep the stronger enabled-Redo guard, exact artwork and all three holds.
- **ANIM-02:** keep every transition and its named visible-state assertion. Explicitly require the second and third clicks rather than accepting the first transition alone.

The local specs and rendered plans preserve these checks. They have been published through the official CLI and read back: SAVE-01 **35** steps, NEW-02 **26** (already matched the stronger definition), ANIM-02 **30**. No stored Python code was changed. Publishing a plan does not execute it or create a pass. A future full run must report its own plan versions, source and verdict. Separate CI coverage is valuable, but moving a condition out of the App plan must be disclosed as a scope change rather than counted as that condition turning green.
