# PixiBun × TestSprite Hackathon S4

> Ready to paste into the official template in `#hackathon-s4-submissions`. Lines marked **[FILL]** wait for the final automatic run and merge; everything else is verified against GitHub, the TestSprite portal and this repository.

## One line

**PixiBun** is a cozy pixel-art and animation studio. Its **121 TestSprite cases** run by themselves on every push to a ready-for-review pull request and check the promises an artist relies on: a locked layer stays locked, Undo brings the pose back, a saved drawing comes home.

## Links

- **Live app:** https://pixibun.vercel.app **[FILL: confirm it serves the merged commit]**
- **Repository:** https://github.com/lxcario/PixiBun
- **The PR with the TestSprite check:** https://github.com/lxcario/PixiBun/pull/6 (opened 18 October, inside the build window)
- **Demo video:** https://youtu.be/ic4LoLqSFvA
- **Run log, one row per automatic run:** https://github.com/lxcario/PixiBun/blob/testsprite-s4/docs/testsprite/run-log.md
- **Evidence page (bugs, fixes, guard tests):** https://github.com/lxcario/PixiBun/blob/testsprite-s4/docs/testsprite/README.md
- **Mutation proof (planted bugs vs. our plans):** https://github.com/lxcario/PixiBun/blob/testsprite-s4/docs/testsprite/mutation-proof.md
- **TestSprite project:** https://www.testsprite.com/dashboard-v3/o/8da317b3-5f3e-506d-b110-a2ae9c2af7b8/projects/ae8453ac-f859-4324-9ca2-5016e683bc6c/test-cases
- **Write-up:** **[FILL: Medium link]**

## Team

- **Résque**: Discord `resquwue` · GitHub [`lxcario`](https://github.com/lxcario)
- Previous seasons: 1st place, TestSprite Hackathon S3 ([Nora](https://github.com/lxcario/Nora)); 2nd place, S2 (CinePurr)

## TestSprite account

The same account generated all 121 cases, installed the GitHub App on `lxcario/PixiBun` and owns the PR trigger. **[FILL: the account email, in the Discord post only]**

## How verification is wired into shipping

1. Every push to a ready-for-review PR deploys a Vercel preview. Draft PRs are skipped.
2. The **TestSprite GitHub App** sees the deployment and runs all 121 cases against that preview, with nobody pressing Run. For example, on `53ac2afe` Vercel finished at 22:05:10 UTC and TestSprite queued 121 tests at 22:05:19.
3. In parallel, our **Stored Python Replay** workflow uses the TestSprite CLI to replay two deep scripts that decode real canvas pixels and the downloaded PNG.
4. `main` requires `TestSprite V3` and `validate`, with **no bypass, not even for admins**. PR #6 stayed unmergeable through every red run.
5. Alongside: 3,053 unit tests, and 560 production browser checks in Chromium, Firefox and WebKit.

## By the numbers

| | |
| --- | --- |
| TestSprite cases | **121**, every one run on every push |
| Automatic runs on PR #6 | 18 since 21 October, from **33** passing to **120** (runs 17 and 18) **[FILL: final run]** |
| Product bugs TestSprite led us to | **13**, 12 with a regression test |
| Artwork checks | 103 of 106 plan specs compare the Canvas readout (painted pixels, color counts and a 32-bit digest of the real canvas). Exact pixel and file checks run alongside in stored Python replays and Playwright |
| Mutation proof | We planted 10 artist-harming bugs. **9** were caught by the same plans TestSprite runs, and the 10th by its regression test. Every catch was confirmed against the clean build |
| Merge gate | Required, with no bypass |

## Three stories

**Type 24, get 44.** An automatic run typed 24 into the canvas-size field and got a 44×44 canvas. The field clamped on every keystroke, so the 2 became 4 before the 4 arrived, and no size starting with 1, 2 or 3 could be typed at all. Fixed in [`4d838ca9`](https://github.com/lxcario/PixiBun/commit/4d838ca9) with a component test; the next automatic run passed the same case.

**The buttons nobody could name.** The agent couldn't find the selection-transform buttons, because their names were arrow glyphs. Reproducing that by hand found something worse: flip a selection, press Escape, and the pixels were gone with no Undo. Both were fixed ([`ff320663`](https://github.com/lxcario/PixiBun/commit/ff320663), [`c534cc99`](https://github.com/lxcario/PixiBun/commit/c534cc99)) with an end-to-end test covering five ways home.

**Making a canvas testable.** A `<canvas>` is opaque to a browser agent. PixiBun publishes a screen-reader **Canvas readout**: size, frame, layer, painted pixels, colors and a digest of the real composite. That serves people using screen readers, and it lets TestSprite check the artwork itself, not just the buttons around it. Replay links (`/studio?replay=…`) draw exact fixtures from a URL, so the agent never needs a file upload.

## Honest edges

- The cloud agent can't drag, upload, change the viewport or go offline. Those checks live in stored Python replays and Playwright CI, and [the evidence page](https://github.com/lxcario/PixiBun/blob/testsprite-s4/docs/testsprite/README.md#what-the-cloud-agent-cant-do-and-how-we-cover-it) lists each one.
- The agent sometimes reports a step it skipped. We keep those runs red, show the snapshot, and never weaken the check. A manual retry on narrowed plans was [labelled as such](https://github.com/lxcario/PixiBun/blob/testsprite-s4/docs/testsprite/retry-plan-scope-2026-10-23.md), not counted as green.
